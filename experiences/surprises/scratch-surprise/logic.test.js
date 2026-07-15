import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const {
  REVEAL_THRESHOLD,
  normalizePoint,
  normalizeSegment,
  sampleTransparentRatio,
  updateRevealState,
} = globalThis.SCRATCH_SURPRISE_LOGIC;

test("坐标会归一化并裁剪到画布边界", () => {
  assert.deepEqual(normalizePoint(50, 25, 100, 50), { x: 0.5, y: 0.5 });
  assert.deepEqual(normalizePoint(-20, 80, 100, 50), { x: 0, y: 1 });
  assert.equal(normalizePoint(1, 1, 0, 50), null);
  assert.deepEqual(normalizeSegment({ x1: -1, y1: 0.2, x2: 2, y2: 0.8, html: "<b>x</b>" }), {
    x1: 0,
    y1: 0.2,
    x2: 1,
    y2: 0.8,
  });
  assert.equal(normalizeSegment({ x1: 0, y1: 0, x2: "nope", y2: 1 }), null);
});

test("透明 alpha 抽样得到稳定比例", () => {
  const pixels = new Uint8ClampedArray([
    0, 0, 0, 0,
    0, 0, 0, 255,
    0, 0, 0, 0,
    0, 0, 0, 255,
  ]);
  assert.equal(sampleTransparentRatio(pixels), 0.5);
  assert.equal(sampleTransparentRatio({ data: pixels }, 2), 1);
});

test("空样本不会误判为已擦除", () => {
  assert.equal(sampleTransparentRatio(null), 0);
  assert.equal(sampleTransparentRatio(new Uint8ClampedArray()), 0);
});

test("低于阈值不揭晓，达到 55% 才揭晓", () => {
  const initial = { revealed: false, progress: 0 };
  const below = updateRevealState(initial, REVEAL_THRESHOLD - 0.01);
  const reached = updateRevealState(below, REVEAL_THRESHOLD);
  assert.equal(below.revealed, false);
  assert.equal(reached.revealed, true);
  assert.equal(reached.progress, REVEAL_THRESHOLD);
});

test("揭晓状态只进入一次，后续更新保持同一对象", () => {
  const revealed = updateRevealState({ revealed: false, progress: 0.2 }, 0.8);
  assert.equal(revealed.revealed, true);
  assert.strictEqual(updateRevealState(revealed, 0), revealed);
});
