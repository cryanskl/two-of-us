import { access, lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { validateCatalog } from "../shared/runtime/catalog.js";
import { resolveVendorAsset } from "../shared/runtime/vendor.js";
import { listCapabilityIds, loadCapabilityManifest } from "./capabilities-lib.mjs";
import { redactResourceReference, validateExperienceContracts } from "./experience-contracts.mjs";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalogPath = path.join(rootDir, "experiences/catalog.json");
let catalog;
try {
  catalog = validateCatalog(JSON.parse(await readFile(catalogPath, "utf8")));
} catch {
  console.error("仓库验收失败：\n- [CATALOG_INVALID] experiences/catalog.json 未通过共享 schema 校验。");
  process.exit(1);
}
const errors = [...await validateExperienceContracts({ rootDir, catalog })];
const realRoot = await realpath(rootDir);
const dependenciesInstalled = await pathExists(path.join(rootDir, "node_modules"));

for (const experience of catalog.experiences) {
  if (experience.installed !== true) continue;
  if (typeof experience.preview !== "string") {
    errors.push(`${experience.id} 没有在 catalog 中声明 preview 预览图。`);
    continue;
  }
  await requireRepositoryFile(
    path.join(rootDir, experience.preview),
    `${experience.id} 的预览图不存在：${experience.preview}，请运行 npm run previews 生成。`,
  );
}

for (const experience of catalog.experiences) {
  if (experience.installed !== true || experience.level === "A") continue;
  const entryPath = path.join(rootDir, experience.entry);
  const html = await readSafeRepositoryText(entryPath);
  if (html === null) continue;
  const references = [
    ...html.matchAll(/<(?:script|img|audio|video|source|track|object)\b[^>]*\b(?:src|href|poster|data)=["']([^"']+)["']/gi),
    ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi),
  ].map((match) => match[1]);

  for (const reference of references) {
    if (reference.startsWith("#") || /^(?:data|blob):/i.test(reference)) continue;
    if (/^(?:[a-z]+:|\/\/)/i.test(reference)) {
      errors.push(`${experience.id} 的非 A 入口引用了外部资源：<external-url>`);
      continue;
    }
    if (reference === "/socket.io/socket.io.js" && experience.level !== "A") continue;
    const localReference = reference.split(/[?#]/, 1)[0];
    const safeReference = redactResourceReference(reference);
    if (!localReference) continue;
    if (localReference.startsWith("/vendor/")) {
      const vendorPath = resolveVendorAsset(rootDir, localReference);
      if (!vendorPath) {
        errors.push(`${experience.id} 引用了未登记的浏览器依赖：${safeReference}`);
      } else if (!dependenciesInstalled) {
        errors.push("仓库还没有安装依赖：请先运行 npm run setup -- --skip-optional，再重新验收。");
      } else {
        await requireRepositoryFile(vendorPath, `${experience.id} 引用的浏览器依赖不存在：${safeReference}`);
      }
      continue;
    }
    await requireRepositoryFile(
      path.resolve(path.dirname(entryPath), localReference),
      `${experience.id} 引用了不存在或越界的本地资源：${safeReference}`,
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

const uniqueErrors = [...new Set(errors)].sort();
if (uniqueErrors.length > 0) {
  console.error("仓库验收失败：\n- " + uniqueErrors.join("\n- "));
  process.exit(1);
}

const installed = catalog.experiences.filter((experience) => experience.installed === true);
const directOpenCount = installed.filter((experience) => experience.level === "A").length;
const launcherCount = installed.length - directOpenCount;
console.log(`仓库验收通过：${catalog.experiences.length} 个作品入口（${directOpenCount} 个 A 级直开、${launcherCount} 个非 A 启动器）、${capabilityIds.length} 个能力声明、资源与借鉴声明完整。`);

async function requireFile(filePath, message) {
  try {
    await access(filePath);
  } catch {
    errors.push(message);
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readSafeRepositoryText(filePath) {
  try {
    if ((await lstat(filePath)).isSymbolicLink()) return null;
    const target = await realpath(filePath);
    if (!isContained(realRoot, target) || !(await stat(target)).isFile()) return null;
    return await readFile(target, "utf8");
  } catch {
    return null;
  }
}

async function requireRepositoryFile(filePath, message) {
  try {
    const target = await realpath(filePath);
    if (!isContained(realRoot, target) || !(await stat(target)).isFile()) throw new Error("unsafe");
  } catch {
    errors.push(message);
  }
}

function isContained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`)
    && relative !== ".." && !path.isAbsolute(relative));
}
