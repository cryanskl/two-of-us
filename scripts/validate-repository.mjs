import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolveVendorAsset } from "../shared/runtime/vendor.js";
import { listCapabilityIds, loadCapabilityManifest } from "./capabilities-lib.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalogPath = path.join(rootDir, "experiences/catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const errors = [];

for (const experience of catalog.experiences) {
  const entryPath = path.join(rootDir, experience.entry);
  const readmePath = path.join(rootDir, experience.readme);
  await requireFile(entryPath, `${experience.id} 的入口不存在`);
  await requireFile(readmePath, `${experience.id} 的 README 不存在`);

  const readme = await readFile(readmePath, "utf8").catch(() => "");
  if (!readme.includes("## 借鉴与来源声明")) {
    errors.push(`${experience.id} 的 README 缺少“借鉴与来源声明”`);
  }

  const html = await readFile(entryPath, "utf8").catch(() => "");
  const references = [
    ...html.matchAll(/<(?:script|img|audio|source)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi),
    ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi),
  ].map((match) => match[1]);

  for (const reference of references) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    if (reference === "/socket.io/socket.io.js" && experience.level !== "A") continue;
    const localReference = reference.split(/[?#]/, 1)[0];
    if (!localReference) continue;
    if (localReference.startsWith("/vendor/")) {
      const vendorPath = resolveVendorAsset(rootDir, localReference);
      if (!vendorPath) {
        errors.push(`${experience.id} 引用了未登记的浏览器依赖：${reference}`);
      } else {
        await requireFile(vendorPath, `${experience.id} 引用的浏览器依赖不存在：${reference}`);
      }
      continue;
    }
    await requireFile(
      path.resolve(path.dirname(entryPath), localReference),
      `${experience.id} 引用了不存在的本地资源：${reference}`,
    );
  }
}

const capabilityIds = await listCapabilityIds(rootDir);
for (const capabilityId of capabilityIds) {
  try {
    await loadCapabilityManifest(rootDir, capabilityId);
  } catch (error) {
    errors.push(`${capabilityId} 的 manifest 无效：${error.message}`);
    continue;
  }

  const capabilityDir = path.join(rootDir, "capabilities", capabilityId);
  const readmePath = path.join(capabilityDir, "README.md");
  await requireFile(readmePath, `${capabilityId} 的 README 不存在`);
  const readme = await readFile(readmePath, "utf8").catch(() => "");
  if (!readme.includes("## 借鉴与来源声明")) {
    errors.push(`${capabilityId} 的 README 缺少“借鉴与来源声明”`);
  }

  const licenseDir = path.join(capabilityDir, "licenses");
  const licenses = await readdir(licenseDir, { withFileTypes: true }).catch(() => []);
  if (!licenses.some((entry) => entry.isFile())) {
    errors.push(`${capabilityId} 没有保留第三方许可证文件`);
  }
}

if (errors.length > 0) {
  console.error("仓库验收失败：\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`仓库验收通过：${catalog.experiences.length} 个作品入口、${capabilityIds.length} 个能力声明、资源与借鉴声明完整。`);

async function requireFile(filePath, message) {
  try {
    await access(filePath);
  } catch {
    errors.push(message);
  }
}
