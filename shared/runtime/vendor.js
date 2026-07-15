import path from "node:path";
import { fileURLToPath } from "node:url";

export const browserVendorAssets = Object.freeze({
  "/vendor/pannellum/2.5.7/pannellum.css": "node_modules/pannellum/build/pannellum.css",
  "/vendor/pannellum/2.5.7/pannellum.js": "node_modules/pannellum/build/pannellum.js",
});

export function resolveVendorAsset(rootDir, pathname) {
  const relativePath = browserVendorAssets[pathname];
  if (!relativePath) return null;

  const rootPath = path.resolve(rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir);
  return path.join(rootPath, relativePath);
}
