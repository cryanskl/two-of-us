import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const logic = globalThis.PHOTO_SWAP_PUZZLE_LOGIC;

test("合法图片类型通过，空文件、超大文件和非法大小拒绝", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(logic.validateFileMetadata({ type, size: 1024 }).ok, true);
  }
  assert.equal(logic.validateFileMetadata({ type: "image/jpeg", size: 0 }).code, "empty-file");
  assert.equal(logic.validateFileMetadata({ type: "image/png", size: logic.MAX_FILE_SIZE + 1 }).code, "file-too-large");
  assert.equal(logic.validateFileMetadata({ type: "image/jpeg", size: Number.NaN }).code, "invalid-file-size");
  assert.equal(logic.validateFileMetadata({ type: "image/gif", size: 100 }).code, "unsupported-type");
});

test("短边 600 与最大边 6000 是有效边界", () => {
  assert.equal(logic.assessImageDimensions({ width: 600, height: 1200 }).ok, true);
  assert.equal(logic.assessImageDimensions({ width: 6000, height: 600 }).ok, true);
  assert.equal(logic.assessImageDimensions({ width: 599, height: 1200 }).code, "image-too-small");
  assert.equal(logic.assessImageDimensions({ width: 6001, height: 1200 }).code, "image-too-large");
  assert.equal(logic.assessImageDimensions({ width: 0, height: 600 }).code, "invalid-dimensions");
});

test("Fisher–Yates 接受注入随机值并产生完整可预测排列", () => {
  const order = logic.createShuffledOrder(4, [0, 0.5, 0]);
  assert.deepEqual(order, [2, 3, 1, 0]);
  assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3]);
});

test("极端随机值若生成完成态，会循环移动为非完成态", () => {
  const order = logic.createShuffledOrder(4, [0.99, 0.99, 0.99]);
  assert.deepEqual(order, [1, 2, 3, 0]);
  assert.equal(logic.isSolved(order), false);
  assert.throws(() => logic.createShuffledOrder(3, [1, 0]), /\[0, 1\)/);
  assert.throws(() => logic.createShuffledOrder(3, [0]), /not enough/);
});

test("首次选择、同块取消和第二块交换分别更新状态", () => {
  const initial = logic.createPuzzleState([1, 0, 2, 3]);
  const selected = logic.selectPosition(initial, 0);
  assert.equal(selected.selectedPosition, 0);
  assert.equal(selected.moves, 0);
  const cancelled = logic.selectPosition(selected, 0);
  assert.equal(cancelled.selectedPosition, null);
  const swapped = logic.selectPosition(logic.selectPosition(initial, 0), 1);
  assert.deepEqual(swapped.order, [0, 1, 2, 3]);
  assert.equal(swapped.moves, 1);
  assert.equal(swapped.solved, true);
});

test("非法位置不改变状态，完成后锁定", () => {
  const state = logic.createPuzzleState([1, 0, 2, 3]);
  assert.strictEqual(logic.selectPosition(state, -1), state);
  assert.strictEqual(logic.selectPosition(state, 4), state);
  const solved = logic.createPuzzleState([0, 1, 2, 3]);
  assert.strictEqual(logic.selectPosition(solved, 0), solved);
});

test("重新创建状态会清空选择、次数和完成态", () => {
  const played = logic.selectPosition(logic.selectPosition(logic.createPuzzleState([1, 0, 2, 3]), 2), 3);
  assert.equal(played.moves, 1);
  const reset = logic.createPuzzleState([2, 1, 0, 3]);
  assert.equal(reset.moves, 0);
  assert.equal(reset.selectedPosition, null);
  assert.equal(reset.solved, false);
});

test("九宫格坐标覆盖左上、中心和右下", () => {
  assert.deepEqual(logic.getTileCoordinates(0, 3), { row: 0, column: 0 });
  assert.deepEqual(logic.getTileCoordinates(4, 3), { row: 1, column: 1 });
  assert.deepEqual(logic.getTileCoordinates(8, 3), { row: 2, column: 2 });
  assert.equal(logic.getTileCoordinates(9, 3), null);
});
