import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { resolveVendorAsset } from "./vendor.js";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".wav", "audio/wav"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".wasm", "application/wasm"],
]);

export function resolveStaticPath(rootDir, pathname) {
  const rootPath = path.resolve(rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const vendorPath = resolveVendorAsset(rootPath, decoded);
  if (vendorPath) return vendorPath;

  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  // 白名单必须建立在解析后的路径上：`..%2f` 这类编码分段不会被 URL 规范化，
  // 在原始字符串上做前缀判断会被 `experiences/..%2f.git/HEAD` 绕过。
  const filePath = path.resolve(rootPath, relativePath);
  if (filePath === rootPath || !filePath.startsWith(`${rootPath}${path.sep}`)) return null;
  const normalized = path.relative(rootPath, filePath).split(path.sep).join("/");
  const isPublicPath = normalized === "index.html"
    || normalized === "favicon.svg"
    || normalized === "experiences" || normalized.startsWith("experiences/")
    || normalized === "shared" || normalized.startsWith("shared/");
  if (!isPublicPath) return null;
  return filePath;
}

export async function serveStatic(request, response, rootDir, pathname) {
  let filePath = resolveStaticPath(rootDir, pathname);
  if (!filePath) return false;

  try {
    let metadata = await stat(filePath);
    if (metadata.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      metadata = await stat(filePath);
    }
    if (!metadata.isFile()) return false;

    response.writeHead(200, {
      "content-type": mimeTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
      "content-length": metadata.size,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      ...crossOriginIsolationHeaders(pathname),
    });
    if (request.method === "HEAD") {
      response.end();
    } else {
      // pipe 不转发读取错误：响应头发出后磁盘读失败会变成 uncaughtException
      // 把整个运行时打下线；pipeline 会销毁两端并把错误交还这里。
      try {
        await pipeline(createReadStream(filePath), response);
      } catch {
        response.destroy();
      }
    }
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

export function crossOriginIsolationHeaders(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return {};
  }
  const root = "/experiences/co-op/i-heard-you";
  if (decoded !== root && !decoded.startsWith(`${root}/`)) return {};
  return {
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
    "origin-agent-cluster": "?1",
  };
}
