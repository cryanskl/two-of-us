import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function loadCatalog(rootDir) {
  const rootPath = toPath(rootDir);
  const catalogPath = path.join(rootPath, "experiences", "catalog.json");
  const source = await readFile(catalogPath, "utf8");
  const catalog = JSON.parse(source);
  return validateCatalog(catalog);
}

const lowerKebabPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const exactEntryPattern = /^experiences\/(surprises|co-op|versus)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/index\.html$/;

export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object"
    || catalog.schemaVersion !== 1 || !Array.isArray(catalog.experiences)) {
    throw new Error("experiences/catalog.json 格式无效：需要 schemaVersion 1 和 experiences 数组。");
  }

  for (const experience of catalog.experiences) validateExperience(experience);
  return catalog;
}

function validateExperience(experience) {
  if (!experience || typeof experience !== "object" || Array.isArray(experience)) {
    throw new Error("作品目录项必须是对象。");
  }
  const requiredStrings = ["id", "title", "category", "level", "entry"];
  for (const field of requiredStrings) {
    if (typeof experience[field] !== "string" || experience[field].trim() === "") {
      throw new Error(`作品目录项缺少有效字段：${field}。`);
    }
  }

  if (!new Set(["A", "B", "C", "D"]).has(experience.level)) {
    throw new Error(`作品 ${experience.id} 的启动等级无效：${experience.level}。`);
  }

  if (!lowerKebabPattern.test(experience.id)) {
    throw new Error(`作品目录项 id 必须是 lower-kebab：${experience.id}。`);
  }

  const entryMatch = exactEntryPattern.exec(experience.entry);
  if (!entryMatch || entryMatch[2] !== experience.id) {
    throw new Error(`作品 ${experience.id} 的入口必须是对应目录下的 index.html。`);
  }
}

function toPath(value) {
  return value instanceof URL ? fileURLToPath(value) : path.resolve(value);
}
