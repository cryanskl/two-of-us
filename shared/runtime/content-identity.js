import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalog } from "./catalog.js";
import { browserVendorAssets } from "./vendor.js";

const identityPattern = /^sha256:[a-f0-9]{64}$/;
const identityDomain = Buffer.from("two-of-us-content-identity-v1", "utf8");
const exactFiles = Object.freeze([
  "package.json",
  "package-lock.json",
  "index.html",
  "experiences/catalog.json",
  "scripts/capabilities-lib.mjs",
]);
const recursiveDirectories = Object.freeze(["shared", "capabilities"]);

export function isContentIdentity(value) {
  return typeof value === "string" && identityPattern.test(value);
}

export async function computeContentIdentity(rootDir = new URL("../../", import.meta.url)) {
  const rootPath = await resolveRoot(rootDir);
  const initial = await collectManifest(rootPath);
  const hash = createHash("sha256");
  updateFrame(hash, identityDomain);

  for (const relativePath of initial.paths) {
    const contents = await readStableFile(rootPath, relativePath);
    if (relativePath === "experiences/catalog.json"
      && !contents.equals(initial.catalogSource)) {
      throw identityError(relativePath, "在清单生成后发生变化");
    }
    updateFrame(hash, Buffer.from(relativePath, "utf8"));
    updateFrame(hash, contents);
  }

  const final = await collectManifest(rootPath);
  if (!sameStringArray(initial.paths, final.paths)
    || !initial.catalogSource.equals(final.catalogSource)) {
    throw identityError("内容清单", "在计算期间发生变化");
  }
  return `sha256:${hash.digest("hex")}`;
}

async function collectManifest(rootPath) {
  const catalogSource = await readStableFile(rootPath, "experiences/catalog.json");
  let catalog;
  try {
    catalog = validateCatalog(JSON.parse(catalogSource.toString("utf8")));
  } catch (error) {
    throw identityError("experiences/catalog.json", "格式无效", error);
  }

  const paths = new Set(exactFiles);
  for (const relativeDirectory of recursiveDirectories) {
    await collectDirectory(rootPath, relativeDirectory, paths);
  }
  for (const experience of catalog.experiences) {
    if (experience.installed !== true) continue;
    await collectDirectory(rootPath, path.posix.dirname(experience.entry), paths);
  }
  for (const relativePath of Object.values(browserVendorAssets)) paths.add(relativePath);

  const sortedPaths = [...paths].sort(compareUtf8);
  for (const relativePath of sortedPaths) {
    await assertSafeRelativeFile(rootPath, relativePath);
  }
  return { catalogSource, paths: sortedPaths };
}

async function collectDirectory(rootPath, relativeDirectory, paths) {
  const directoryPath = await assertSafeRelativeDirectory(rootPath, relativeDirectory);
  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    throw identityError(relativeDirectory, "目录无法读取", error);
  }
  entries.sort((left, right) => compareUtf8(left.name, right.name));

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) throw identityError(relativePath, "不能是符号链接");
    if (entry.isDirectory()) {
      await collectDirectory(rootPath, relativePath, paths);
    } else if (entry.isFile()) {
      paths.add(relativePath);
    } else {
      throw identityError(relativePath, "必须是普通文件或目录");
    }
  }
}

async function readStableFile(rootPath, relativePath) {
  const filePath = await assertSafeRelativeFile(rootPath, relativePath);
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(filePath, fsConstants.O_RDONLY | noFollow);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw identityError(relativePath, "不是普通文件");
    const contents = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!sameFileSnapshot(before, after) || BigInt(contents.byteLength) !== after.size) {
      throw identityError(relativePath, "在读取期间发生变化");
    }
    return contents;
  } catch (error) {
    if (error?.contentIdentityError === true) throw error;
    throw identityError(relativePath, "无法稳定读取", error);
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

async function assertSafeRelativeFile(rootPath, relativePath) {
  return assertSafeRelativePath(rootPath, relativePath, "file");
}

async function assertSafeRelativeDirectory(rootPath, relativePath) {
  return assertSafeRelativePath(rootPath, relativePath, "directory");
}

async function assertSafeRelativePath(rootPath, relativePath, expectedType) {
  const segments = normalizeRelativePath(relativePath);
  let currentPath = rootPath;
  for (let index = 0; index < segments.length; index += 1) {
    currentPath = path.join(currentPath, segments[index]);
    let metadata;
    try {
      metadata = await lstat(currentPath);
    } catch (error) {
      throw identityError(relativePath, "缺失或无法读取", error);
    }
    if (metadata.isSymbolicLink()) throw identityError(relativePath, "路径中不能包含符号链接");
    const final = index === segments.length - 1;
    if (!final && !metadata.isDirectory()) {
      throw identityError(relativePath, "父路径不是目录");
    }
    if (final && expectedType === "file" && !metadata.isFile()) {
      throw identityError(relativePath, "不是普通文件");
    }
    if (final && expectedType === "directory" && !metadata.isDirectory()) {
      throw identityError(relativePath, "不是目录");
    }
  }
  return currentPath;
}

function normalizeRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath === ""
    || relativePath.includes("\\") || path.posix.isAbsolute(relativePath)) {
    throw identityError("内容清单", "包含无效相对路径");
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || normalized === ".." || normalized.startsWith("../")) {
    throw identityError("内容清单", "包含越界相对路径");
  }
  return normalized.split("/");
}

async function resolveRoot(rootDir) {
  const rootPath = path.resolve(rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir);
  try {
    return await realpath(rootPath);
  } catch (error) {
    throw identityError("仓库根目录", "缺失或无法读取", error);
  }
}

function updateFrame(hash, value) {
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(value.byteLength));
  hash.update(length);
  hash.update(value);
}

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function identityError(relativePath, reason, cause) {
  const error = new Error(`无法计算内容身份：${relativePath} ${reason}。`, { cause });
  error.contentIdentityError = true;
  return error;
}
