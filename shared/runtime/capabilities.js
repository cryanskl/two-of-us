import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import {
  capabilitiesDataRoot,
  CapabilityError,
  getCapabilityStatus,
  listCapabilityIds,
  loadCapabilityManifest,
  resolveDataDir,
} from "../../scripts/capabilities-lib.mjs";

const capabilityIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const capabilitiesPath = "/api/capabilities";
const artifactPrefix = `${capabilitiesPath}/`;

export function createCapabilitiesRuntime({
  rootDir = new URL("../../", import.meta.url),
  dataDir = resolveDataDir(),
  statusProvider = getCapabilityStatus,
} = {}) {
  const inFlightStatuses = new Map();
  let inFlightPublicStatuses = null;

  async function provideStatus(id) {
    if (inFlightStatuses.has(id)) return inFlightStatuses.get(id);
    const pending = Promise.resolve()
      .then(() => statusProvider({ rootDir, dataDir, id }))
      .catch((error) => normalizeStatusError(id, error))
      .finally(() => inFlightStatuses.delete(id));
    inFlightStatuses.set(id, pending);
    return pending;
  }

  function getPublicStatuses() {
    if (inFlightPublicStatuses) return inFlightPublicStatuses;
    inFlightPublicStatuses = Promise.resolve()
      .then(async () => {
        const ids = await listCapabilityIds(rootDir);
        const statuses = await Promise.all(ids.map((id) => provideStatus(id)));
        return {
          schemaVersion: 1,
          capabilities: statuses.map(toPublicStatus),
        };
      })
      .finally(() => { inFlightPublicStatuses = null; });
    return inFlightPublicStatuses;
  }

  async function handleRequest(request, response, urlOrPathname) {
    const pathname = getPathname(urlOrPathname, request.url);
    const artifactRoute = parseArtifactRoute(pathname);
    const browserAssetRoute = parseBrowserAssetRoute(pathname);
    if (pathname !== capabilitiesPath && !artifactRoute && !browserAssetRoute
      && !pathname.startsWith(artifactPrefix)) {
      return false;
    }

    if (!isLoopbackAddress(request.socket?.remoteAddress)) {
      sendJson(request, response, 403, { error: "CAPABILITY_LOCAL_ONLY" });
      return true;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(request, response, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET, HEAD" });
      return true;
    }

    if (pathname === capabilitiesPath) {
      try {
        sendJson(request, response, 200, await getPublicStatuses());
      } catch (error) {
        console.error(error);
        sendJson(request, response, 500, { error: "CAPABILITY_REGISTRY_ERROR" });
      }
      return true;
    }

    if (!artifactRoute && !browserAssetRoute) {
      sendJson(request, response, 404, { error: "NOT_FOUND" });
      return true;
    }

    if (browserAssetRoute) {
      await serveBrowserAsset(request, response, browserAssetRoute, provideStatus, { rootDir });
    } else {
      await serveArtifact(request, response, artifactRoute, provideStatus, { rootDir, dataDir });
    }
    return true;
  }

  return Object.freeze({ getPublicStatuses, handleRequest });
}

async function serveBrowserAsset(request, response, route, provideStatus, { rootDir }) {
  let fileHandle;
  try {
    const manifestRecord = await loadCapabilityManifest(rootDir, route.capabilityId);
    const asset = manifestRecord.value.browserAssets?.find(({ id }) => id === route.assetId);
    if (!asset) {
      sendJson(request, response, 404, { error: "BROWSER_ASSET_NOT_FOUND" });
      return;
    }

    const status = await provideStatus(route.capabilityId);
    if (status.state !== "available") {
      sendJson(request, response, 409, {
        error: "CAPABILITY_UNAVAILABLE",
        state: status.state,
        code: status.code,
      });
      return;
    }

    const capabilityRoot = path.resolve(getRootPath(rootDir), "capabilities", route.capabilityId);
    const candidate = path.resolve(capabilityRoot, ...asset.path.split("/"));
    const [realCapabilityRoot, realCandidate] = await Promise.all([
      realpath(capabilityRoot),
      realpath(candidate),
    ]);
    if (!isInside(realCapabilityRoot, realCandidate)) {
      sendJson(request, response, 409, { error: "BROWSER_ASSET_UNSAFE" });
      return;
    }

    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    fileHandle = await open(realCandidate, fsConstants.O_RDONLY | noFollow);
    const metadata = await fileHandle.stat();
    if (!metadata.isFile() || metadata.size !== asset.bytes
      || await sha256FileHandle(fileHandle) !== asset.sha256) {
      sendJson(request, response, 409, { error: "BROWSER_ASSET_CHANGED" });
      return;
    }

    response.writeHead(200, browserAssetHeaders(asset, metadata.size));
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    await pipeline(fileHandle.createReadStream({ start: 0, autoClose: false }), response);
  } catch (error) {
    if (!response.headersSent && isUnavailableFileError(error)) {
      sendJson(request, response, 409, { error: "CAPABILITY_UNAVAILABLE" });
    } else if (!response.headersSent && error instanceof CapabilityError
      && error.code === "MANIFEST_NOT_FOUND") {
      sendJson(request, response, 404, { error: "CAPABILITY_NOT_FOUND" });
    } else if (!response.headersSent) {
      console.error(error);
      sendJson(request, response, 500, { error: "BROWSER_ASSET_ERROR" });
    } else {
      response.destroy();
    }
  } finally {
    if (fileHandle) await fileHandle.close().catch(() => {});
  }
}

export function isLoopbackAddress(address) {
  if (typeof address !== "string") return false;
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1"
    || normalized === "0:0:0:0:0:0:0:1") return true;
  if (/^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(normalized)) return true;
  const mapped = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  const octets = mapped.split(".");
  return octets.length === 4
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
    && Number(octets[0]) === 127;
}

export function parseSingleRange(value, size) {
  if (value === undefined) return null;
  if (typeof value !== "string" || !Number.isSafeInteger(size) || size <= 0) return false;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return false;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
    const length = Math.min(suffixLength, size);
    return { start: size - length, end: size - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)
    || start >= size || requestedEnd < start) {
    return false;
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

async function serveArtifact(request, response, route, provideStatus, { rootDir, dataDir }) {
  let fileHandle;
  try {
    const manifestRecord = await loadCapabilityManifest(rootDir, route.capabilityId);
    const artifact = manifestRecord.value.artifacts.find(({ id }) => id === route.artifactId);
    if (!artifact) {
      sendJson(request, response, 404, { error: "ARTIFACT_NOT_FOUND" });
      return;
    }

    const status = await provideStatus(route.capabilityId);
    if (status.state !== "available") {
      sendJson(request, response, 409, {
        error: "CAPABILITY_UNAVAILABLE",
        state: status.state,
        code: status.code,
      });
      return;
    }

    const dataRoot = capabilitiesDataRoot(dataDir);
    const installRoot = path.join(dataRoot, route.capabilityId);
    const candidate = path.resolve(installRoot, ...artifact.path.split("/"));
    const [realDataRoot, realInstallRoot, realCandidate] = await Promise.all([
      realpath(dataRoot),
      realpath(installRoot),
      realpath(candidate),
    ]);
    if (!isInside(realDataRoot, realInstallRoot) || !isInside(realInstallRoot, realCandidate)) {
      sendJson(request, response, 409, { error: "ARTIFACT_UNSAFE" });
      return;
    }

    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    fileHandle = await open(realCandidate, fsConstants.O_RDONLY | noFollow);
    const metadata = await fileHandle.stat();
    if (!metadata.isFile() || metadata.size !== artifact.bytes
      || await sha256FileHandle(fileHandle) !== artifact.sha256) {
      sendJson(request, response, 409, { error: "ARTIFACT_CHANGED" });
      return;
    }

    const range = parseSingleRange(request.headers.range, metadata.size);
    if (range === false) {
      response.writeHead(416, artifactHeaders({
        contentLength: 0,
        contentRange: `bytes */${metadata.size}`,
      }));
      response.end();
      return;
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? metadata.size - 1;
    const statusCode = range ? 206 : 200;
    response.writeHead(statusCode, artifactHeaders({
      contentLength: end - start + 1,
      contentRange: range ? `bytes ${start}-${end}/${metadata.size}` : undefined,
    }));
    if (request.method === "HEAD") {
      response.end();
      return;
    }

    await pipeline(fileHandle.createReadStream({ start, end, autoClose: false }), response);
  } catch (error) {
    if (!response.headersSent && isUnavailableFileError(error)) {
      sendJson(request, response, 409, { error: "CAPABILITY_UNAVAILABLE" });
    } else if (!response.headersSent && error instanceof CapabilityError
      && error.code === "MANIFEST_NOT_FOUND") {
      sendJson(request, response, 404, { error: "CAPABILITY_NOT_FOUND" });
    } else if (!response.headersSent) {
      console.error(error);
      sendJson(request, response, 500, { error: "CAPABILITY_ARTIFACT_ERROR" });
    } else {
      response.destroy();
    }
  } finally {
    if (fileHandle) await fileHandle.close().catch(() => {});
  }
}

function toPublicStatus(status) {
  const manifest = status.manifest;
  const available = status.state === "available" && manifest;
  return {
    id: status.id,
    protocolVersion: manifest?.protocolVersion ?? null,
    state: status.state,
    code: status.code,
    message: status.message,
    requirements: manifest ? {
      microphone: manifest.requirements.microphone,
      worker: manifest.requirements.worker,
      wasmSimd: manifest.requirements.wasmSimd,
      crossOriginIsolated: manifest.requirements.crossOriginIsolated,
      recommendedMemoryMiB: manifest.requirements.recommendedMemoryMiB,
    } : null,
    artifacts: manifest ? manifest.artifacts.map((artifact) => ({
      id: artifact.id,
      bytes: artifact.bytes,
      href: available ? `${capabilitiesPath}/${status.id}/artifacts/${artifact.id}` : null,
    })) : [],
    browserAssets: manifest ? (manifest.browserAssets ?? []).map((asset) => ({
      id: asset.id,
      bytes: asset.bytes,
      contentType: asset.contentType,
      href: available ? `${capabilitiesPath}/${status.id}/browser/${asset.id}` : null,
    })) : [],
  };
}

function normalizeStatusError(id, error) {
  if (error instanceof CapabilityError
    && ["MANIFEST_INVALID", "MANIFEST_INCOMPATIBLE"].includes(error.code)) {
    return {
      id,
      state: "incompatible",
      code: error.code,
      message: "能力声明与当前运行时不兼容。",
      manifest: null,
    };
  }
  throw error;
}

function parseArtifactRoute(pathname) {
  if (typeof pathname !== "string") return null;
  const match = /^\/api\/capabilities\/([^/]+)\/artifacts\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  const capabilityId = decodeId(match[1]);
  const artifactId = decodeId(match[2]);
  return capabilityId && artifactId ? { capabilityId, artifactId } : null;
}

function parseBrowserAssetRoute(pathname) {
  if (typeof pathname !== "string") return null;
  const match = /^\/api\/capabilities\/([^/]+)\/browser\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  const capabilityId = decodeId(match[1]);
  const assetId = decodeId(match[2]);
  return capabilityId && assetId ? { capabilityId, assetId } : null;
}

function decodeId(value) {
  try {
    const decoded = decodeURIComponent(value);
    return capabilityIdPattern.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function getPathname(urlOrPathname, fallback = "/") {
  if (urlOrPathname instanceof URL) return urlOrPathname.pathname;
  if (typeof urlOrPathname === "string") {
    if (urlOrPathname.startsWith("/")) return new URL(urlOrPathname, "http://localhost").pathname;
    return new URL(urlOrPathname).pathname;
  }
  return new URL(fallback ?? "/", "http://localhost").pathname;
}

function isInside(base, target) {
  const relative = path.relative(base, target);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function getRootPath(rootDir) {
  return rootDir instanceof URL ? fileURLToPath(rootDir) : path.resolve(rootDir);
}

async function sha256FileHandle(fileHandle) {
  const digest = createHash("sha256");
  for await (const chunk of fileHandle.createReadStream({ start: 0, autoClose: false })) {
    digest.update(chunk);
  }
  return digest.digest("hex");
}

function artifactHeaders({ contentLength, contentRange }) {
  return {
    "content-type": "application/octet-stream",
    "content-length": contentLength,
    "accept-ranges": "bytes",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "cross-origin-resource-policy": "same-origin",
    ...(contentRange ? { "content-range": contentRange } : {}),
  };
}

function browserAssetHeaders(asset, contentLength) {
  return {
    "content-type": asset.contentType,
    "content-length": contentLength,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "cross-origin-resource-policy": "same-origin",
  };
}

function sendJson(request, response, statusCode, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  if (request.method === "HEAD") response.end();
  else response.end(body);
}

function isUnavailableFileError(error) {
  return ["ENOENT", "ENOTDIR", "ELOOP", "EACCES", "EPERM"].includes(error?.code);
}
