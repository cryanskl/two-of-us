"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const config = require("./config.js");
const logic = require("./logic.js");

test("项目目录是无依赖 CommonJS 边界", () => {
  const manifest = JSON.parse(readFileSync(require.resolve("./package.json"), "utf8"));
  assert.deepEqual(manifest, { type: "commonjs" });
});

test("config 在 CommonJS 与经典脚本暴露同一递归冻结合同", () => {
  assert.deepEqual(Reflect.ownKeys(config), [
    "PLAYER_IDS",
    "DIRECTIONS",
    "SOURCE_KINDS",
    "SOURCE_STATUSES",
    "SOURCE_ERROR_CODES",
    "DEFAULT_CONFIG",
    "DEFAULT_SOURCE_METADATA",
  ]);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.DEFAULT_CONFIG.playerLabels), true);
  assert.equal(Object.isFrozen(config.DEFAULT_SOURCE_METADATA), true);

  const context = { globalThis: {} };
  vm.runInNewContext(readFileSync(require.resolve("./config.js"), "utf8"), context);
  const browserConfig = context.globalThis.PhotoSliderRaceConfig;
  assert.deepEqual(
    JSON.parse(JSON.stringify(browserConfig)),
    JSON.parse(JSON.stringify(config)),
  );
  assert.equal(Object.isFrozen(browserConfig), true);
});

test("固定规则枚举精确且不重复", () => {
  assert.deepEqual(config.PLAYER_IDS, ["left", "right"]);
  assert.deepEqual(config.DIRECTIONS, ["up", "left", "down", "right"]);
  assert.deepEqual(config.SOURCE_KINDS, ["builtin", "local"]);
  assert.deepEqual(config.SOURCE_STATUSES, ["ready", "loading", "error"]);
  assert.equal(new Set(config.SOURCE_ERROR_CODES).size, config.SOURCE_ERROR_CODES.length);
});

test("默认来源元数据是最小白名单且不含可识别照片信息", () => {
  assert.deepEqual(config.DEFAULT_SOURCE_METADATA, {
    kind: "builtin",
    status: "ready",
    generation: 0,
    errorCode: null,
  });
  const serialized = JSON.stringify(config.DEFAULT_SOURCE_METADATA);
  for (const forbidden of [
    "url",
    "path",
    "name",
    "filename",
    "file",
    "blob",
    "exif",
    "gps",
    "width",
    "height",
    "mime",
  ]) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false, forbidden);
  }
});

test("默认文案冻结隐私和权利边界", () => {
  assert.equal(config.DEFAULT_CONFIG.title, "同一张，谁先拼回");
  assert.match(config.DEFAULT_CONFIG.privacyNotice, /不上传，也不保存/);
  assert.match(config.DEFAULT_CONFIG.rightsNotice, /有权使用/);
  assert.deepEqual(config.DEFAULT_CONFIG.playerLabels, ["左边的你", "右边的你"]);
});

test("logic 在 CommonJS 与经典脚本暴露同构冻结 API", () => {
  assert.equal(Object.isFrozen(logic), true);
  assert.equal(Object.isFrozen(logic.CONSTANTS), true);

  const context = { globalThis: {} };
  vm.runInNewContext(readFileSync(require.resolve("./config.js"), "utf8"), context);
  vm.runInNewContext(readFileSync(require.resolve("./logic.js"), "utf8"), context);
  const browserLogic = context.globalThis.PhotoSliderRaceLogic;
  assert.deepEqual(
    JSON.parse(JSON.stringify(browserLogic.CONSTANTS)),
    JSON.parse(JSON.stringify(logic.CONSTANTS)),
  );
  assert.equal(Object.isFrozen(browserLogic), true);
});

test("完成态与排列验证严格拒绝重复、缺失、越界和 hostile 数组", () => {
  const solved = logic.createSolvedTiles();
  assert.deepEqual(solved, [1, 2, 3, 4, 5, 6, 7, 8, 0]);
  assert.equal(Object.isFrozen(solved), true);
  assert.equal(logic.isValidPermutation(solved), true);
  assert.equal(logic.isSolved(solved), true);

  for (const invalid of [
    [1, 2, 3, 4, 5, 6, 7, 8],
    [1, 2, 3, 4, 5, 6, 7, 8, 8],
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 5, 6, 7, 8, -1],
    [1, 2, 3, 4, 5, 6, 7, 8, 0.5],
  ]) {
    assert.equal(logic.isValidPermutation(invalid), false);
    assert.equal(logic.isSolved(invalid), false);
  }

  const accessor = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  Object.defineProperty(accessor, "0", { enumerable: true, get() { throw new Error("read"); } });
  assert.equal(logic.isValidPermutation(accessor), false);
  assert.equal(logic.isValidPermutation(new Proxy([], { ownKeys() { throw new Error("trap"); } })), false);
});

test("九个空格位置的合法方向按固定顺序精确输出", () => {
  assert.deepEqual(logic.getLegalBlankMoves(0), ["down", "right"]);
  assert.deepEqual(logic.getLegalBlankMoves(1), ["left", "down", "right"]);
  assert.deepEqual(logic.getLegalBlankMoves(2), ["left", "down"]);
  assert.deepEqual(logic.getLegalBlankMoves(3), ["up", "down", "right"]);
  assert.deepEqual(logic.getLegalBlankMoves(4), ["up", "left", "down", "right"]);
  assert.deepEqual(logic.getLegalBlankMoves(5), ["up", "left", "down"]);
  assert.deepEqual(logic.getLegalBlankMoves(6), ["up", "right"]);
  assert.deepEqual(logic.getLegalBlankMoves(7), ["up", "left", "right"]);
  assert.deepEqual(logic.getLegalBlankMoves(8), ["up", "left"]);
  assert.deepEqual(logic.getLegalBlankMoves(-1), []);
  assert.deepEqual(logic.getLegalBlankMoves(9), []);
  assert.deepEqual(logic.getLegalBlankMoves(4, 4), []);
});

test("空格方向移动每次只交换一个邻块且不修改输入", () => {
  const source = [1, 2, 3, 4, 0, 5, 6, 7, 8];
  const original = source.slice();
  assert.deepEqual(logic.moveBlank(source, "up"), {
    changed: true,
    value: [1, 0, 3, 4, 2, 5, 6, 7, 8],
    reason: null,
    direction: "up",
  });
  assert.deepEqual(source, original);
  assert.deepEqual(logic.moveBlank(source, "left").value, [1, 2, 3, 0, 4, 5, 6, 7, 8]);
  assert.deepEqual(logic.moveBlank(source, "down").value, [1, 2, 3, 4, 7, 5, 6, 0, 8]);
  assert.deepEqual(logic.moveBlank(source, "right").value, [1, 2, 3, 4, 5, 0, 6, 7, 8]);

  const corner = logic.createSolvedTiles();
  const invalid = logic.moveBlank(corner, "right");
  assert.equal(invalid.changed, false);
  assert.equal(invalid.reason, "out-of-bounds");
  assert.deepEqual(invalid.value, corner);
});

test("点击只有空格相邻图块可移动", () => {
  const source = [1, 2, 3, 4, 0, 5, 6, 7, 8];
  assert.deepEqual(logic.moveTileAt(source, 1).value, [1, 0, 3, 4, 2, 5, 6, 7, 8]);
  assert.deepEqual(logic.moveTileAt(source, 3).value, [1, 2, 3, 0, 4, 5, 6, 7, 8]);
  assert.deepEqual(logic.moveTileAt(source, 5).value, [1, 2, 3, 4, 5, 0, 6, 7, 8]);
  assert.deepEqual(logic.moveTileAt(source, 7).value, [1, 2, 3, 4, 7, 5, 6, 0, 8]);
  assert.equal(logic.moveTileAt(source, 0).reason, "not-adjacent");
  assert.equal(logic.moveTileAt(source, 4).reason, "blank");
});

test("曼哈顿距离忽略空格，可解性拒绝单次互换", () => {
  assert.equal(logic.manhattanDistance([1, 2, 3, 4, 5, 6, 7, 8, 0]), 0);
  assert.equal(logic.manhattanDistance([1, 2, 3, 4, 5, 6, 7, 0, 8]), 1);
  assert.equal(logic.isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 0]), true);
  assert.equal(logic.isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 0]), false);
  assert.equal(logic.manhattanDistance([1, 2, 3]), null);
});

test("确定性随机跨调用隔离并拒绝非法 seed", () => {
  const first = logic.createSeededRandom(42);
  const second = logic.createSeededRandom(42);
  const firstSequence = [first(), first(), first(), first()];
  assert.deepEqual(firstSequence, [second(), second(), second(), second()]);
  assert.equal(logic.createSeededRandom(-1), null);
  assert.equal(logic.createSeededRandom(0x100000000), null);
  assert.equal(logic.createSeededRandom(1.5), null);
});

test("打乱严格执行 96 个合法步、禁止立即回退并达到距离门槛", () => {
  const shuffled = logic.shuffleFromSolved(20260725);
  assert.equal(shuffled.steps, 96);
  assert.equal(shuffled.trace.length, 96);
  assert.equal(logic.isValidPermutation(shuffled.tiles), true);
  assert.equal(logic.isSolvable(shuffled.tiles), true);
  assert.equal(logic.isSolved(shuffled.tiles), false);
  assert.ok(shuffled.distance >= logic.CONSTANTS.MIN_MANHATTAN_DISTANCE);

  const opposites = { up: "down", left: "right", down: "up", right: "left" };
  let replay = logic.createSolvedTiles();
  for (let index = 0; index < shuffled.trace.length; index += 1) {
    if (index > 0) assert.notEqual(shuffled.trace[index], opposites[shuffled.trace[index - 1]]);
    const moved = logic.moveBlank(replay, shuffled.trace[index]);
    assert.equal(moved.changed, true);
    replay = moved.value;
  }
  assert.deepEqual(replay, shuffled.tiles);
});

test("相同 seed 得到相同局面，1000 个固定 seed 全部满足不变量", () => {
  assert.deepEqual(logic.shuffleFromSolved(12345), logic.shuffleFromSolved(12345));
  const signatures = new Set();
  for (let seed = 0; seed < 1000; seed += 1) {
    const shuffled = logic.shuffleFromSolved(seed);
    assert.ok(shuffled, `seed ${seed}`);
    assert.equal(shuffled.trace.length, 96);
    assert.equal(logic.isValidPermutation(shuffled.tiles), true);
    assert.equal(logic.isSolvable(shuffled.tiles), true);
    assert.equal(logic.isSolved(shuffled.tiles), false);
    assert.ok(shuffled.distance >= 12);
    signatures.add(shuffled.tiles.join(","));
  }
  assert.ok(signatures.size > 100);
});

test("左右获得内容相同但引用完全独立的初始棋盘", () => {
  const fair = logic.createFairBoards(77);
  assert.deepEqual(fair.left.tiles, fair.right.tiles);
  assert.deepEqual(fair.initialTiles, fair.left.tiles);
  assert.notEqual(fair.left, fair.right);
  assert.notEqual(fair.left.tiles, fair.right.tiles);
  assert.notEqual(fair.initialTiles, fair.left.tiles);
  assert.equal(Object.isFrozen(fair.left), true);
  assert.equal(Object.isFrozen(fair.right.tiles), true);
});

test("非法洗牌选项 fail closed，合法小夹具可控", () => {
  assert.equal(logic.shuffleFromSolved(-1), null);
  assert.equal(logic.shuffleFromSolved(1, { steps: 96, minDistance: 12 }), null);
  assert.equal(logic.shuffleFromSolved(1, { steps: 0, minDistance: 0, maxAttempts: 1 }), null);
  assert.equal(logic.shuffleFromSolved(1, { steps: 1, minDistance: 32, maxAttempts: 1 }), null);
  const fixture = logic.shuffleFromSolved(1, { steps: 1, minDistance: 1, maxAttempts: 1 });
  assert.ok(fixture);
  assert.equal(fixture.trace.length, 1);
});
