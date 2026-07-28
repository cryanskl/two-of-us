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
const exactReadmePattern = /^experiences\/(surprises|co-op|versus)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/README\.md$/;
const exactPreviewPattern = /^experiences\/(surprises|co-op|versus)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/preview\.webp$/;
const categoryDirectories = Object.freeze({
  surprise: "surprises",
  "co-op": "co-op",
  versus: "versus",
});

export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object"
    || catalog.schemaVersion !== 1 || !Array.isArray(catalog.experiences)) {
    throw new Error("experiences/catalog.json 格式无效：需要 schemaVersion 1 和 experiences 数组。");
  }

  const ids = new Set();
  const entries = new Set();
  for (const experience of catalog.experiences) {
    validateExperience(experience);
    if (ids.has(experience.id) || entries.has(experience.entry)) {
      throw new Error(`作品目录项 id 或入口重复：${experience.id}。`);
    }
    ids.add(experience.id);
    entries.add(experience.entry);
  }
  return catalog;
}

function validateExperience(experience) {
  if (!experience || typeof experience !== "object" || Array.isArray(experience)) {
    throw new Error("作品目录项必须是对象。");
  }
  const requiredStrings = [
    "id", "title", "category", "level", "players", "devices", "entry", "readme", "description",
  ];
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

  for (const field of ["installed", "networkRequired"]) {
    if (typeof experience[field] !== "boolean") {
      throw new Error(`作品 ${experience.id} 的 ${field} 必须是 boolean。`);
    }
  }

  const expectedDirectory = categoryDirectories[experience.category];
  if (!expectedDirectory) {
    throw new Error(`作品 ${experience.id} 的分类无效：${experience.category}。`);
  }

  const entryMatch = exactEntryPattern.exec(experience.entry);
  if (!entryMatch || entryMatch[1] !== expectedDirectory || entryMatch[2] !== experience.id) {
    throw new Error(`作品 ${experience.id} 的入口必须是对应目录下的 index.html。`);
  }

  const readmeMatch = exactReadmePattern.exec(experience.readme);
  if (!readmeMatch || readmeMatch[1] !== expectedDirectory || readmeMatch[2] !== experience.id) {
    throw new Error(`作品 ${experience.id} 的 README 必须与入口位于同一目录。`);
  }

  if (experience.preview !== undefined) {
    const previewMatch = typeof experience.preview === "string"
      ? exactPreviewPattern.exec(experience.preview)
      : null;
    if (!previewMatch || previewMatch[1] !== expectedDirectory || previewMatch[2] !== experience.id) {
      throw new Error(`作品 ${experience.id} 的预览图必须是同目录下的 preview.webp。`);
    }
  }

  if (experience.featured !== undefined && typeof experience.featured !== "boolean") {
    throw new Error(`作品 ${experience.id} 的 featured 必须是 boolean。`);
  }
}

export function previewPathFor(experience) {
  return experience.entry.replace(/index\.html$/, "preview.webp");
}

function toPath(value) {
  return value instanceof URL ? fileURLToPath(value) : path.resolve(value);
}
