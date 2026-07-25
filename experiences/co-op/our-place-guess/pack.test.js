import assert from "node:assert/strict";
import test from "node:test";

import {
  activeCardsFor,
  MAX_FILE_BYTES,
  normalizePack,
  packWarnings,
  parsePackText,
} from "./pack.js";

function card(index, overrides = {}) {
  return {
    id: `memory-${index}`,
    title: `第 ${index} 段回忆`,
    clue: `一段完全虚构的线索 ${index}`,
    era: index % 2 ? "初秋" : "",
    target: {
      longitude: ((index * 10.123456789 + 180) % 360) - 180,
      latitude: index * 2.123456789,
    },
    revealNote: `第 ${index} 段虚构结语`,
    ...overrides,
  };
}

function pack(count = 4, overrides = {}) {
  return {
    schemaVersion: 1,
    title: "虚构地点集",
    finalNote: "这只是一组用于测试的虚构内容。",
    cards: Array.from({ length: count }, (_, index) => card(index + 1)),
    ...overrides,
  };
}

function deepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(deepFrozen);
}

test("合法题包保持文件顺序、规范坐标并递归冻结", () => {
  const source = pack();
  const normalized = normalizePack(source);
  assert.deepEqual(normalized.cards.map((item) => item.id), [
    "memory-1", "memory-2", "memory-3", "memory-4",
  ]);
  assert.deepEqual(normalized.cards[0].target, {
    longitude: 10.123457,
    latitude: 2.123457,
  });
  assert.notStrictEqual(normalized, source);
  assert.notStrictEqual(normalized.cards, source.cards);
  deepFrozen(normalized);
});

test("始终使用前四张的隔离副本，多余卡形成确定提示", () => {
  const normalized = normalizePack(pack(6));
  const active = activeCardsFor(normalized);
  assert.deepEqual(active.map((item) => item.id), [
    "memory-1", "memory-2", "memory-3", "memory-4",
  ]);
  assert.notStrictEqual(active[0], normalized.cards[0]);
  assert.deepEqual(packWarnings(normalized), ["本局按顺序使用前四张，其余 2 张忽略。"]);
  deepFrozen(active);
  deepFrozen(packWarnings(normalized));
});

test("四张没有忽略提示，二十四张仍可读取", () => {
  assert.deepEqual(packWarnings(normalizePack(pack(4))), []);
  const maximum = normalizePack(pack(24));
  assert.equal(maximum.cards.length, 24);
  assert.equal(packWarnings(maximum)[0], "本局按顺序使用前四张，其余 20 张忽略。");
});

test("文本解析严格核对 UTF-8 字节数与 64 KiB 上限", () => {
  const text = JSON.stringify(pack());
  const bytes = new TextEncoder().encode(text).byteLength;
  const result = parsePackText(text, { byteLength: bytes });
  assert.equal(result.pack.title, "虚构地点集");
  assert.equal(result.activeCards.length, 4);
  assert.deepEqual(result.warnings, []);
  deepFrozen(result);

  assert.throws(() => parsePackText(text, { byteLength: bytes - 1 }), /字节数不一致/);
  assert.throws(() => parsePackText("", { byteLength: 0 }), /不能为空/);
  assert.throws(
    () => parsePackText(text, { byteLength: MAX_FILE_BYTES + 1 }),
    /不能超过 65536 bytes/,
  );
  assert.throws(() => parsePackText("{", { byteLength: 1 }), /不是合法 JSON/);
});

test("原子拒绝根、卡片与坐标 schema 错误", () => {
  const cases = [
    [pack(3), /至少需要 4 张/],
    [pack(25), /最多只能有 24 张/],
    [{ ...pack(), extra: true }, /不支持字段 extra/],
    [pack(4, { schemaVersion: 2 }), /schemaVersion/],
    [pack(4, { cards: [card(1), card(1), card(3), card(4)] }), /卡片 ID 不能重复/],
    [pack(4, { cards: [card(1, { extra: true }), card(2), card(3), card(4)] }), /不支持字段 extra/],
    [pack(4, { cards: [card(1, { id: "Bad ID" }), card(2), card(3), card(4)] }), /id 格式/],
    [pack(4, { cards: [card(1, { target: { longitude: "1", latitude: 2 } }), card(2), card(3), card(4)] }), /longitude/],
    [pack(4, { cards: [card(1, { target: { longitude: 1, latitude: 81 } }), card(2), card(3), card(4)] }), /latitude/],
    [pack(4, { cards: [card(1, { target: { longitude: 1, latitude: 2, address: "x" } }), card(2), card(3), card(4)] }), /不支持字段 address/],
  ];
  cases.forEach(([value, pattern]) => assert.throws(() => normalizePack(value), pattern));
});

test("字段按 Unicode code point 计数并拒绝 HTML 与 URL", () => {
  assert.equal(normalizePack(pack(4, { title: "😀".repeat(40) })).title, "😀".repeat(40));
  assert.throws(() => normalizePack(pack(4, { title: "😀".repeat(41) })), /最多 40 个字符/);
  assert.throws(
    () => normalizePack(pack(4, { cards: [card(1, { clue: "<b>秘密</b>" }), card(2), card(3), card(4)] })),
    /不能包含 HTML/,
  );
  assert.throws(
    () => normalizePack(pack(4, { cards: [card(1, { revealNote: "https://example.com" }), card(2), card(3), card(4)] })),
    /不能包含 URL/,
  );
});

test("拒绝 accessor、异常原型、稀疏数组与非有限坐标且不触发 getter", () => {
  const getterPack = pack();
  Object.defineProperty(getterPack, "title", {
    enumerable: true,
    get() {
      throw new Error("不应触发");
    },
  });
  assert.throws(() => normalizePack(getterPack), /数据属性/);

  const custom = Object.create({ polluted: true });
  Object.assign(custom, pack());
  assert.throws(() => normalizePack(custom), /普通对象/);

  const sparse = pack();
  sparse.cards = new Array(4);
  sparse.cards[0] = card(1);
  assert.throws(() => normalizePack(sparse), /连续数组/);

  const nonFinite = pack();
  nonFinite.cards[0].target.longitude = Number.POSITIVE_INFINITY;
  assert.throws(() => normalizePack(nonFinite), /longitude/);
});
