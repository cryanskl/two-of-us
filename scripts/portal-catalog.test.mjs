import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadCatalog, previewPathFor } from "../shared/runtime/catalog.js";

const rootDir = new URL("../", import.meta.url);
const rootPath = fileURLToPath(rootDir);
const catalog = await loadCatalog(rootDir);
const html = await readPortal();
const fallback = readFallbackCatalog(html);

// 门户在 file:// 下没有 /api/catalog，只能读内联副本；两份数据必须描述同一批作品。
const mirroredFields = [
  "id", "title", "category", "level", "players", "devices", "entry", "preview", "description",
  "installed", "featured", "capabilities",
];

test("portal fallback catalog mirrors experiences/catalog.json", () => {
  assert.deepEqual(
    fallback.experiences.map(({ id }) => id),
    catalog.experiences.map(({ id }) => id),
  );

  for (const [index, experience] of catalog.experiences.entries()) {
    const mirrored = fallback.experiences[index];
    for (const field of mirroredFields) {
      if (!(field in mirrored)) continue;
      assert.deepEqual(mirrored[field], experience[field], `${experience.id} 的 ${field} 不一致`);
    }
    assert.ok("preview" in mirrored, `${experience.id} 的内联副本缺少 preview`);
  }
});

test("every installed experience ships a preview beside its entry", async () => {
  for (const experience of catalog.experiences) {
    if (experience.installed !== true) continue;
    assert.equal(experience.preview, previewPathFor(experience), `${experience.id} 的预览图路径不规范`);
    await assert.doesNotReject(
      access(path.join(rootPath, experience.preview)),
      `${experience.id} 的预览图文件不存在`,
    );
  }
});

test("featured experiences stay a small opt-in set across all three categories", () => {
  const featured = catalog.experiences.filter((experience) => experience.featured === true);
  assert.ok(featured.length > 0 && featured.length <= 12, "精选数量应该保持在 12 个以内");
  assert.ok(featured.every((experience) => experience.installed === true), "精选必须已安装");
  assert.deepEqual(
    [...new Set(featured.map((experience) => experience.category))].sort(),
    ["co-op", "surprise", "versus"],
  );
});

test("portal renders previews and the featured filter", () => {
  assert.match(html, /<input id="featured-only" type="radio" name="featured" value="featured">/);
  assert.match(html, /if \(event\.target\.name === "featured"\) filterState\.featured = event\.target\.value;/);
  assert.match(html, /preview\.loading = "lazy";/);
  // 缺图时卡片必须退回纯文字，不能留下破图。
  assert.match(html, /preview\.addEventListener\("error", \(\) => preview\.remove\(\), \{ once: true \}\);/);
  assert.match(html, /preview\.alt = "";/);
});

async function readPortal() {
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("index.html", rootDir), "utf8");
}

function readFallbackCatalog(source) {
  const opening = '<script id="fallback-catalog" type="application/json">';
  const start = source.indexOf(opening);
  assert.notEqual(start, -1, "门户缺少内联 fallback catalog");
  const end = source.indexOf("</script>", start);
  assert.notEqual(end, -1, "内联 fallback catalog 没有闭合");
  return JSON.parse(source.slice(start + opening.length, end));
}
