import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
    await requireFile(
      path.resolve(path.dirname(entryPath), localReference),
      `${experience.id} 引用了不存在的本地资源：${reference}`,
    );
  }
}

if (errors.length > 0) {
  console.error("仓库验收失败：\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`仓库验收通过：${catalog.experiences.length} 个作品入口、资源与借鉴声明完整。`);

async function requireFile(filePath, message) {
  try {
    await access(filePath);
  } catch {
    errors.push(message);
  }
}
