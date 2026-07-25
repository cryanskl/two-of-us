import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizePack, parsePackText } from "./pack.js";
import { SAMPLE_ACTIVE_CARDS, SAMPLE_PACK } from "./sample-pack.js";

test("虚构示例恰好四张并按文件顺序覆盖多个世界区域", () => {
  const normalized = normalizePack(SAMPLE_PACK);
  assert.equal(normalized.cards.length, 4);
  assert.deepEqual(SAMPLE_ACTIVE_CARDS.map((card) => card.id), [
    "borrowed-blue-umbrella",
    "first-morning-ferry",
    "crescent-bay-wind",
    "scarf-like-a-flag",
  ]);
  assert.ok(new Set(normalized.cards.map((card) => Math.sign(card.target.longitude))).size >= 2);
  assert.ok(new Set(normalized.cards.map((card) => Math.sign(card.target.latitude))).size >= 2);
});

test("虚构示例不含 URL、HTML、真实关系称呼或地址字段", () => {
  const serialized = JSON.stringify(SAMPLE_PACK);
  assert.doesNotMatch(serialized, /https?:|www\\.|<[^>]+>|address|住址|对象|老婆|老公/i);
  assert.equal(Object.isFrozen(SAMPLE_PACK), true);
  assert.equal(Object.isFrozen(SAMPLE_PACK.cards), true);
});

test("公开模板与示例走同一解析合同且模板恰好四张", async () => {
  const text = await readFile(new URL("./private-pack.example.json", import.meta.url), "utf8");
  const parsed = parsePackText(text, {
    byteLength: new TextEncoder().encode(text).byteLength,
  });
  assert.equal(parsed.pack.schemaVersion, 1);
  assert.equal(parsed.pack.cards.length, 4);
  assert.deepEqual(parsed.warnings, []);
});
