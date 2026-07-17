import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CAPABILITY_SCHEMA_VERSION = 1;
export const CAPABILITY_PROTOCOL_VERSION = 1;
export const RECEIPT_SCHEMA_VERSION = 1;

const capabilityIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

export class CapabilityError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "CapabilityError";
    this.code = code;
  }
}

export function resolveDataDir({
  env = process.env,
  platform = process.platform,
  homeDir = os.homedir(),
} = {}) {
  if (typeof env.TWO_OF_US_DATA_DIR === "string" && env.TWO_OF_US_DATA_DIR.trim()) {
    return path.resolve(env.TWO_OF_US_DATA_DIR.trim());
  }
  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "TwoOfUs");
  }
  if (platform === "win32") {
    const localAppData = typeof env.LOCALAPPDATA === "string" && env.LOCALAPPDATA.trim()
      ? env.LOCALAPPDATA.trim()
      : path.join(homeDir, "AppData", "Local");
    return path.resolve(localAppData, "TwoOfUs");
  }
  const xdgDataHome = typeof env.XDG_DATA_HOME === "string" && env.XDG_DATA_HOME.trim()
    ? env.XDG_DATA_HOME.trim()
    : path.join(homeDir, ".local", "share");
  return path.resolve(xdgDataHome, "two-of-us");
}

export function capabilitiesDataRoot(dataDir = resolveDataDir()) {
  return path.join(toPath(dataDir), "capabilities");
}

export async function listCapabilityIds(rootDir) {
  const manifestsRoot = path.join(toPath(rootDir), "capabilities");
  let entries;
  try {
    entries = await readdir(manifestsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const ids = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !capabilityIdPattern.test(entry.name)) continue;
    if (await pathExists(path.join(manifestsRoot, entry.name, "manifest.json"))) ids.push(entry.name);
  }
  return ids.sort();
}

export async function loadCapabilityManifest(rootDir, id) {
  validateCapabilityId(id);
  const manifestPath = path.join(toPath(rootDir), "capabilities", id, "manifest.json");
  let source;
  try {
    source = await readFile(manifestPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new CapabilityError("MANIFEST_NOT_FOUND", `找不到能力 ${id} 的 manifest。`, { cause: error });
    }
    throw error;
  }

  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new CapabilityError("MANIFEST_INVALID", `能力 ${id} 的 manifest 不是有效 JSON。`, { cause: error });
  }
  validateManifest(value, id);
  return deepFreeze({
    value,
    source,
    path: manifestPath,
    sha256: sha256Buffer(Buffer.from(source, "utf8")),
  });
}

export function validateManifest(manifest, expectedId = manifest && manifest.id) {
  if (!isPlainObject(manifest)) throw invalidManifest("manifest 必须是普通对象");
  if (manifest.schemaVersion !== CAPABILITY_SCHEMA_VERSION) {
    throw new CapabilityError(
      "MANIFEST_INCOMPATIBLE",
      `不支持 manifest schemaVersion ${String(manifest.schemaVersion)}。`,
    );
  }
  if (manifest.protocolVersion !== CAPABILITY_PROTOCOL_VERSION) {
    throw new CapabilityError(
      "MANIFEST_INCOMPATIBLE",
      `不支持能力 protocolVersion ${String(manifest.protocolVersion)}。`,
    );
  }
  validateCapabilityId(manifest.id);
  if (manifest.id !== expectedId) throw invalidManifest(`manifest id 必须是 ${expectedId}`);
  validateEngine(manifest.engine);
  validateModel(manifest.model);
  validateRequirements(manifest.requirements);
  validateBrowserAssets(manifest.browserAssets);
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    throw invalidManifest("manifest 必须至少声明一个 artifact");
  }

  const artifactIds = new Set();
  const artifactPaths = new Set();
  for (const artifact of manifest.artifacts) {
    if (!isPlainObject(artifact)) throw invalidManifest("artifact 必须是普通对象");
    if (typeof artifact.id !== "string" || !capabilityIdPattern.test(artifact.id)) {
      throw invalidManifest("artifact id 必须是小写短横线标识符");
    }
    if (artifactIds.has(artifact.id)) throw invalidManifest(`重复的 artifact id：${artifact.id}`);
    artifactIds.add(artifact.id);
    validateRelativePath(artifact.path);
    if (artifactPaths.has(artifact.path)) throw invalidManifest(`重复的 artifact path：${artifact.path}`);
    artifactPaths.add(artifact.path);
    validateDownloadUrl(artifact.url);
    if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0) {
      throw invalidManifest(`artifact ${artifact.id} 的 bytes 必须是正整数`);
    }
    if (typeof artifact.sha256 !== "string" || !sha256Pattern.test(artifact.sha256)) {
      throw invalidManifest(`artifact ${artifact.id} 必须提供 64 位小写 SHA-256`);
    }
  }
  if (typeof manifest.model.artifactId === "string" && !artifactIds.has(manifest.model.artifactId)) {
    throw invalidManifest(`model.artifactId 未指向已声明 artifact：${manifest.model.artifactId}`);
  }
  if (typeof manifest.model.artifactId === "string") {
    const modelArtifact = manifest.artifacts.find(({ id }) => id === manifest.model.artifactId);
    if (modelArtifact.bytes !== manifest.model.bytes
      || modelArtifact.sha256 !== manifest.model.sha256) {
      throw invalidManifest("model 的 bytes/sha256 必须与其 artifact 一致");
    }
  }
  return true;
}

export async function getCapabilityStatus({ rootDir, dataDir = resolveDataDir(), id }) {
  let manifestRecord;
  try {
    manifestRecord = await loadCapabilityManifest(rootDir, id);
  } catch (error) {
    if (error instanceof CapabilityError && error.code === "MANIFEST_INCOMPATIBLE") {
      return freezeStatus(id, "incompatible", error.code, error.message, dataDir);
    }
    throw error;
  }

  const capabilitySourceDir = path.join(toPath(rootDir), "capabilities", id);
  for (const asset of manifestRecord.value.browserAssets ?? []) {
    const assetPath = resolveArtifactPath(capabilitySourceDir, asset.path);
    let metadata;
    try {
      metadata = await stat(assetPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return freezeStatus(
          id,
          "corrupt",
          "BROWSER_ASSET_MISSING",
          `缺少浏览器运行资产：${asset.path}`,
          dataDir,
          manifestRecord,
        );
      }
      throw error;
    }
    if (!metadata.isFile() || metadata.size !== asset.bytes) {
      return freezeStatus(
        id,
        "corrupt",
        "BROWSER_ASSET_LENGTH_MISMATCH",
        `浏览器运行资产长度错误：${asset.path}`,
        dataDir,
        manifestRecord,
      );
    }
    if (await sha256File(assetPath) !== asset.sha256) {
      return freezeStatus(
        id,
        "corrupt",
        "BROWSER_ASSET_HASH_MISMATCH",
        `浏览器运行资产哈希错误：${asset.path}`,
        dataDir,
        manifestRecord,
      );
    }
  }

  const installDir = capabilityInstallDir(dataDir, id);
  const receiptPath = path.join(installDir, "receipt.json");
  if (!await pathExists(installDir)) {
    return freezeStatus(id, "missing", "NOT_INSTALLED", "能力包尚未安装。", dataDir, manifestRecord);
  }
  if (!(await stat(installDir)).isDirectory()) {
    return freezeStatus(id, "corrupt", "INSTALL_PATH_NOT_DIRECTORY", "能力安装路径不是目录。", dataDir, manifestRecord);
  }
  if (!await pathExists(receiptPath)) {
    return freezeStatus(id, "corrupt", "RECEIPT_MISSING", "安装目录缺少 receipt.json。", dataDir, manifestRecord);
  }

  let receipt;
  try {
    receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  } catch (error) {
    return freezeStatus(id, "corrupt", "RECEIPT_INVALID", "receipt.json 无法解析。", dataDir, manifestRecord);
  }
  const receiptIssue = validateReceipt(receipt, manifestRecord);
  if (receiptIssue) {
    return freezeStatus(id, receiptIssue.state, receiptIssue.code, receiptIssue.message, dataDir, manifestRecord);
  }

  for (const artifact of manifestRecord.value.artifacts) {
    const artifactPath = resolveArtifactPath(installDir, artifact.path);
    let metadata;
    try {
      metadata = await stat(artifactPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return freezeStatus(
          id,
          "corrupt",
          "ARTIFACT_MISSING",
          `缺少 artifact：${artifact.path}`,
          dataDir,
          manifestRecord,
        );
      }
      throw error;
    }
    if (!metadata.isFile() || metadata.size !== artifact.bytes) {
      return freezeStatus(
        id,
        "corrupt",
        "ARTIFACT_LENGTH_MISMATCH",
        `artifact 长度错误：${artifact.path}`,
        dataDir,
        manifestRecord,
      );
    }
    const digest = await sha256File(artifactPath);
    if (digest !== artifact.sha256) {
      return freezeStatus(
        id,
        "corrupt",
        "ARTIFACT_HASH_MISMATCH",
        `artifact 哈希错误：${artifact.path}`,
        dataDir,
        manifestRecord,
      );
    }
  }

  return freezeStatus(id, "available", "OK", "能力包可用。", dataDir, manifestRecord, receipt);
}

export async function doctorCapability(options) {
  return getCapabilityStatus(options);
}

export async function installCapability({
  rootDir,
  dataDir = resolveDataDir(),
  id,
  fetchImpl = globalThis.fetch,
  onProgress = () => {},
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new CapabilityError("FETCH_UNAVAILABLE", "当前 Node.js 没有可用的 fetch 实现。");
  }
  const manifestRecord = await loadCapabilityManifest(rootDir, id);
  const dataRoot = capabilitiesDataRoot(dataDir);
  const installDir = capabilityInstallDir(dataDir, id);
  await mkdir(dataRoot, { recursive: true });

  const current = await getCapabilityStatus({ rootDir, dataDir, id });
  if (current.state === "available") {
    return deepFreeze({ installed: false, alreadyAvailable: true, status: current });
  }

  const stagingDir = path.join(dataRoot, `.${id}.part-${process.pid}-${randomUUID()}`);
  let committed = false;
  try {
    await mkdir(stagingDir, { recursive: false });
    for (const artifact of manifestRecord.value.artifacts) {
      await downloadArtifact({ artifact, stagingDir, fetchImpl, onProgress });
    }

    const receipt = createReceipt(manifestRecord);
    const receiptPart = path.join(stagingDir, "receipt.json.part");
    const receiptPath = path.join(stagingDir, "receipt.json");
    await writeFile(receiptPart, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(receiptPart, receiptPath);
    await commitInstallDirectory({ stagingDir, installDir });
    committed = true;

    const status = await getCapabilityStatus({ rootDir, dataDir, id });
    if (status.state !== "available") {
      throw new CapabilityError("POST_INSTALL_DOCTOR_FAILED", `安装后校验失败：${status.message}`);
    }
    return deepFreeze({ installed: true, alreadyAvailable: false, status });
  } catch (error) {
    if (error instanceof CapabilityError) throw error;
    throw new CapabilityError("INSTALL_FAILED", `安装能力 ${id} 失败：${error.message}`, { cause: error });
  } finally {
    if (!committed) await rm(stagingDir, { recursive: true, force: true });
  }
}

export async function removeCapability({ dataDir = resolveDataDir(), id } = {}) {
  validateCapabilityId(id);
  const installDir = capabilityInstallDir(dataDir, id);
  const existed = await pathExists(installDir);
  await rm(installDir, { recursive: true, force: true });
  return deepFreeze({ id, removed: existed, installDir });
}

async function downloadArtifact({ artifact, stagingDir, fetchImpl, onProgress }) {
  const finalPath = resolveArtifactPath(stagingDir, artifact.path);
  const partPath = `${finalPath}.part`;
  await mkdir(path.dirname(finalPath), { recursive: true });

  let response;
  try {
    response = await fetchImpl(artifact.url);
  } catch (error) {
    throw new CapabilityError("DOWNLOAD_FAILED", `无法下载 ${artifact.id}：${error.message}`, { cause: error });
  }
  if (!response || !response.ok) {
    throw new CapabilityError(
      "DOWNLOAD_HTTP_ERROR",
      `下载 ${artifact.id} 返回 HTTP ${response ? response.status : "unknown"}。`,
    );
  }
  const advertisedLength = response.headers && response.headers.get("content-length");
  if (advertisedLength !== null) {
    const parsedLength = Number(advertisedLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength !== artifact.bytes) {
      throw new CapabilityError(
        "DOWNLOAD_LENGTH_MISMATCH",
        `下载 ${artifact.id} 的 Content-Length 与 manifest 不一致。`,
      );
    }
  }
  if (!response.body) throw new CapabilityError("DOWNLOAD_EMPTY", `下载 ${artifact.id} 没有响应体。`);

  const digest = createHash("sha256");
  let received = 0;
  let fileHandle;
  try {
    fileHandle = await open(partPath, "wx");
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      received += buffer.length;
      if (received > artifact.bytes) {
        throw new CapabilityError("DOWNLOAD_LENGTH_MISMATCH", `下载 ${artifact.id} 超过 manifest 长度。`);
      }
      digest.update(buffer);
      await writeAll(fileHandle, buffer);
      onProgress(deepFreeze({
        artifactId: artifact.id,
        received,
        total: artifact.bytes,
      }));
    }
    await fileHandle.sync();
  } catch (error) {
    if (error instanceof CapabilityError) throw error;
    throw new CapabilityError("DOWNLOAD_INTERRUPTED", `下载 ${artifact.id} 被中断。`, { cause: error });
  } finally {
    if (fileHandle) await fileHandle.close();
  }

  if (received !== artifact.bytes) {
    throw new CapabilityError(
      "DOWNLOAD_LENGTH_MISMATCH",
      `下载 ${artifact.id} 长度为 ${received}，预期 ${artifact.bytes}。`,
    );
  }
  const actualSha256 = digest.digest("hex");
  if (actualSha256 !== artifact.sha256) {
    throw new CapabilityError("DOWNLOAD_HASH_MISMATCH", `下载 ${artifact.id} 的 SHA-256 不匹配。`);
  }
  await rename(partPath, finalPath);
}

async function commitInstallDirectory({ stagingDir, installDir }) {
  const parent = path.dirname(installDir);
  const backupDir = path.join(parent, `.${path.basename(installDir)}.backup-${randomUUID()}`);
  const hadExisting = await pathExists(installDir);
  let movedExisting = false;
  try {
    if (hadExisting) {
      await rename(installDir, backupDir);
      movedExisting = true;
    }
    await rename(stagingDir, installDir);
    // The new directory is already committed. A stale backup is preferable to
    // reporting installation failure after a successful atomic switch.
    if (movedExisting) await rm(backupDir, { recursive: true, force: true }).catch(() => {});
  } catch (error) {
    if (!await pathExists(installDir) && movedExisting && await pathExists(backupDir)) {
      await rename(backupDir, installDir);
    }
    throw error;
  }
}

function createReceipt(manifestRecord) {
  const manifest = manifestRecord.value;
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    id: manifest.id,
    protocolVersion: manifest.protocolVersion,
    manifestSha256: manifestRecord.sha256,
    installedAt: new Date().toISOString(),
    artifacts: manifest.artifacts.map((artifact) => ({
      id: artifact.id,
      path: artifact.path,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
    })),
  };
}

function validateReceipt(receipt, manifestRecord) {
  const manifest = manifestRecord.value;
  if (!isPlainObject(receipt) || receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION
    || receipt.id !== manifest.id || !Array.isArray(receipt.artifacts)) {
    return { state: "corrupt", code: "RECEIPT_INVALID", message: "receipt 格式无效。" };
  }
  if (receipt.protocolVersion !== CAPABILITY_PROTOCOL_VERSION
    || receipt.protocolVersion !== manifest.protocolVersion) {
    return { state: "incompatible", code: "RECEIPT_INCOMPATIBLE", message: "receipt 协议版本不兼容。" };
  }
  if (receipt.manifestSha256 !== manifestRecord.sha256) {
    return { state: "incompatible", code: "MANIFEST_CHANGED", message: "已安装能力与当前 manifest 不一致。" };
  }
  if (receipt.artifacts.length !== manifest.artifacts.length) {
    return { state: "corrupt", code: "RECEIPT_ARTIFACTS_MISMATCH", message: "receipt 的 artifact 清单不完整。" };
  }
  for (const artifact of manifest.artifacts) {
    const installed = receipt.artifacts.find((candidate) => candidate.id === artifact.id);
    if (!installed || installed.path !== artifact.path || installed.bytes !== artifact.bytes
      || installed.sha256 !== artifact.sha256) {
      return { state: "corrupt", code: "RECEIPT_ARTIFACTS_MISMATCH", message: `receipt 与 ${artifact.id} 不一致。` };
    }
  }
  return null;
}

function freezeStatus(id, state, code, message, dataDir, manifestRecord, receipt) {
  return deepFreeze({
    id,
    state,
    code,
    message,
    installDir: capabilityInstallDir(dataDir, id),
    manifest: manifestRecord ? manifestRecord.value : null,
    receipt: receipt ?? null,
  });
}

function capabilityInstallDir(dataDir, id) {
  validateCapabilityId(id);
  return path.join(capabilitiesDataRoot(dataDir), id);
}

function resolveArtifactPath(baseDir, relativePath) {
  validateRelativePath(relativePath);
  const target = path.resolve(baseDir, ...relativePath.split("/"));
  const base = path.resolve(baseDir);
  if (!target.startsWith(`${base}${path.sep}`)) throw invalidManifest("artifact path 越出能力目录");
  return target;
}

function validateCapabilityId(id) {
  if (typeof id !== "string" || !capabilityIdPattern.test(id)) {
    throw new CapabilityError("INVALID_CAPABILITY_ID", "能力 id 必须是小写短横线标识符。");
  }
}

function validateRelativePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || path.posix.isAbsolute(value)) {
    throw invalidManifest("artifact path 必须是使用 / 的相对路径");
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === "." || normalized.startsWith("../")
    || value.split("/").includes("..")) {
    throw invalidManifest("artifact path 不能越出能力目录");
  }
}

function validateDownloadUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw invalidManifest("artifact url 必须是有效 URL");
  }
  const loopbackHttp = url.protocol === "http:"
    && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopbackHttp) {
    throw invalidManifest("artifact url 只允许 https；测试可使用本机 loopback http");
  }
}

function validateEngine(engine) {
  if (!isPlainObject(engine)) throw invalidManifest("engine 必须是对象");
  for (const field of ["name", "version", "revision", "license"]) {
    if (typeof engine[field] !== "string" || !engine[field].trim()) {
      throw invalidManifest(`engine.${field} 必须是非空字符串`);
    }
  }
}

function validateModel(model) {
  if (!isPlainObject(model)) throw invalidManifest("model 必须是对象");
  for (const field of ["name", "revision", "license"]) {
    if (typeof model[field] !== "string" || !model[field].trim()) {
      throw invalidManifest(`model.${field} 必须是非空字符串`);
    }
  }
  if (!Number.isSafeInteger(model.bytes) || model.bytes <= 0) {
    throw invalidManifest("model.bytes 必须是正整数");
  }
  if (typeof model.sha256 !== "string" || !sha256Pattern.test(model.sha256)) {
    throw invalidManifest("model.sha256 必须是 64 位小写 SHA-256，不能保留占位值");
  }
  if (model.artifactId !== undefined
    && (typeof model.artifactId !== "string" || !capabilityIdPattern.test(model.artifactId))) {
    throw invalidManifest("model.artifactId 必须是合法 artifact id");
  }
}

function validateRequirements(requirements) {
  if (!isPlainObject(requirements)) throw invalidManifest("requirements 必须是对象");
  for (const field of ["microphone", "worker", "wasmSimd", "crossOriginIsolated"]) {
    if (typeof requirements[field] !== "boolean") {
      throw invalidManifest(`requirements.${field} 必须是布尔值`);
    }
  }
  if (!Number.isSafeInteger(requirements.recommendedMemoryMiB)
    || requirements.recommendedMemoryMiB <= 0) {
    throw invalidManifest("requirements.recommendedMemoryMiB 必须是正整数");
  }
}

function validateBrowserAssets(assets) {
  if (assets === undefined) return;
  if (!Array.isArray(assets) || assets.length === 0) {
    throw invalidManifest("browserAssets 必须是非空数组");
  }
  const ids = new Set();
  const paths = new Set();
  const allowedContentTypes = new Set([
    "application/wasm",
    "text/javascript; charset=utf-8",
  ]);
  for (const asset of assets) {
    if (!isPlainObject(asset)) throw invalidManifest("browser asset 必须是普通对象");
    if (typeof asset.id !== "string" || !capabilityIdPattern.test(asset.id)) {
      throw invalidManifest("browser asset id 必须是小写短横线标识符");
    }
    if (ids.has(asset.id)) throw invalidManifest(`重复的 browser asset id：${asset.id}`);
    ids.add(asset.id);
    validateRelativePath(asset.path);
    if (paths.has(asset.path)) throw invalidManifest(`重复的 browser asset path：${asset.path}`);
    paths.add(asset.path);
    if (!allowedContentTypes.has(asset.contentType)) {
      throw invalidManifest(`browser asset ${asset.id} 的 contentType 不受支持`);
    }
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) {
      throw invalidManifest(`browser asset ${asset.id} 的 bytes 必须是正整数`);
    }
    if (typeof asset.sha256 !== "string" || !sha256Pattern.test(asset.sha256)) {
      throw invalidManifest(`browser asset ${asset.id} 必须提供 64 位小写 SHA-256`);
    }
  }
}

function invalidManifest(message) {
  return new CapabilityError("MANIFEST_INVALID", message);
}

async function sha256File(filePath) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) digest.update(chunk);
  return digest.digest("hex");
}

async function writeAll(fileHandle, buffer) {
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesWritten } = await fileHandle.write(buffer, offset, buffer.length - offset);
    if (bytesWritten <= 0) throw new Error("写入下载文件时没有取得进展");
    offset += bytesWritten;
  }
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function toPath(value) {
  return value instanceof URL ? fileURLToPath(value) : path.resolve(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
  return Object.freeze(value);
}
