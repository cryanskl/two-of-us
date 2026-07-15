import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const isPublicPath = relativePath === "index.html"
    || relativePath.startsWith("experiences/")
    || relativePath.startsWith("shared/");
  if (!isPublicPath) return null;
  const filePath = path.resolve(rootPath, relativePath);
  if (filePath !== rootPath && !filePath.startsWith(`${rootPath}${path.sep}`)) return null;
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
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}
