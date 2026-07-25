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

function action(state, type, fields) {
  return { type, revision: state.revision, ...(fields || {}) };
}

function startRacing(seed) {
  let state = logic.createInitialState();
  state = logic.reduce(state, action(state, logic.ACTIONS.START_MATCH, { seed }));
  state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now: 10 }));
  state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now: 20 }));
  state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now: 30 }));
  return state;
}

function inverseTraceFor(state) {
  const opposites = { up: "down", left: "right", down: "up", right: "left" };
  return logic.shuffleFromSolved(state.seed).trace.slice().reverse().map(
    (direction) => opposites[direction],
  );
}

function playDirections(state, player, directions, startAt, stepMs) {
  let current = state;
  directions.forEach((direction, index) => {
    current = logic.reduce(current, action(current, logic.ACTIONS.MOVE, {
      player,
      direction,
      repeat: false,
      now: startAt + (index * stepMs),
    }));
  });
  return current;
}

test("来源元数据只接受精确白名单并按 generation 两阶段提交", () => {
  const initial = logic.createInitialState();
  assert.deepEqual(logic.sanitizeSourceMetadata({
    kind: "local",
    status: "loading",
    generation: 1,
    errorCode: null,
  }), {
    kind: "local",
    status: "loading",
    generation: 1,
    errorCode: null,
  });
  assert.equal(logic.sanitizeSourceMetadata({
    kind: "local",
    status: "ready",
    generation: 1,
    errorCode: null,
    filename: "secret.jpg",
  }), null);

  const loading = logic.reduce(initial, action(initial, logic.ACTIONS.SET_SOURCE, {
    metadata: {
      kind: "local",
      status: "loading",
      generation: 1,
      errorCode: null,
    },
  }));
  assert.equal(loading.revision, 1);
  assert.equal(logic.getPublicView(loading).controls.canStart, false);

  const ready = logic.reduce(loading, action(loading, logic.ACTIONS.SET_SOURCE, {
    metadata: {
      kind: "local",
      status: "ready",
      generation: 1,
      errorCode: null,
    },
  }));
  assert.equal(ready.revision, 2);
  assert.equal(logic.getPublicView(ready).controls.canStart, true);

  const stale = logic.reduce(ready, action(ready, logic.ACTIONS.SET_SOURCE, {
    metadata: {
      kind: "local",
      status: "loading",
      generation: 1,
      errorCode: null,
    },
  }));
  assert.equal(stale, ready);
});

test("键盘抽象映射左右席位并忽略 repeat、组合键和多余字段", () => {
  const key = (value) => ({
    key: value,
    repeat: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  });
  assert.deepEqual(logic.classifyKeyInput(key("w")), { player: "left", direction: "up" });
  assert.deepEqual(logic.classifyKeyInput(key("A")), { player: "left", direction: "left" });
  assert.deepEqual(logic.classifyKeyInput(key("s")), { player: "left", direction: "down" });
  assert.deepEqual(logic.classifyKeyInput(key("d")), { player: "left", direction: "right" });
  assert.deepEqual(logic.classifyKeyInput(key("ArrowUp")), { player: "right", direction: "up" });
  assert.deepEqual(logic.classifyKeyInput(key("ArrowLeft")), { player: "right", direction: "left" });
  assert.deepEqual(logic.classifyKeyInput(key("ArrowDown")), { player: "right", direction: "down" });
  assert.deepEqual(logic.classifyKeyInput(key("ArrowRight")), { player: "right", direction: "right" });
  assert.equal(logic.classifyKeyInput({ ...key("w"), repeat: true }), null);
  assert.equal(logic.classifyKeyInput({ ...key("w"), ctrlKey: true }), null);
  assert.equal(logic.classifyKeyInput({ ...key("w"), extra: true }), null);
  assert.equal(logic.classifyKeyInput(key("Enter")), null);
});

test("applyMove 严格验证棋盘、时间、锁定和完成状态", () => {
  const board = logic.createBoard([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  const completed = logic.applyMove(board, "right", 12.5);
  assert.equal(completed.changed, true);
  assert.deepEqual(completed.value.tiles, logic.createSolvedTiles());
  assert.equal(completed.value.solvedAt, 12.5);
  assert.equal(completed.value.locked, true);
  assert.equal(completed.value.moves, 1);
  assert.equal(logic.applyMove(completed.value, "left", 13).reason, "locked");
  assert.equal(logic.applyMove(board, "right", -1).reason, "invalid-time");
  assert.equal(logic.applyMove({ ...board, extra: true }, "right", 1).reason, "invalid-board");
});

test("有效用时扣除暂停，100ms 边界含等号", () => {
  assert.equal(logic.calculateElapsed(10, 210, 50), 150);
  assert.equal(logic.calculateElapsed(10, 9, 0), null);
  assert.equal(logic.calculateElapsed(10, 20, 11), null);
  assert.deepEqual(
    logic.resolveFinish(
      { player: "left", solvedAt: 100 },
      { player: "right", solvedAt: 200 },
    ),
    { outcome: "draw", differenceMs: 100 },
  );
  assert.deepEqual(
    logic.resolveFinish(
      { player: "right", solvedAt: 100 },
      { player: "left", solvedAt: 200.001 },
    ),
    { outcome: "right", differenceMs: 100.001 },
  );
  assert.deepEqual(
    logic.resolveFinish({ player: "left", solvedAt: 100 }, null),
    { outcome: "left", differenceMs: null },
  );
});

test("初态、三拍倒数和比赛开始严格递增 revision", () => {
  let state = logic.createInitialState();
  const initialView = logic.getPublicView(state);
  assert.equal(initialView.phase, "setup");
  assert.equal(initialView.revision, 0);
  assert.equal(initialView.controls.canStart, true);

  state = logic.reduce(state, action(state, logic.ACTIONS.START_MATCH, { seed: 123 }));
  assert.equal(logic.getPublicView(state).phase, "countdown");
  assert.equal(logic.getPublicView(state).countdown.race, 3);
  assert.equal(state.revision, 1);

  for (const now of [10, 20]) {
    state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now }));
  }
  assert.equal(logic.getPublicView(state).countdown.race, 1);
  state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now: 30 }));
  const view = logic.getPublicView(state);
  assert.equal(view.phase, "racing");
  assert.equal(view.timing.raceStartedAt, 30);
  assert.equal(state.revision, 4);
});

test("倒数、暂停和终局阶段拒绝移动，repeat 永远不推进", () => {
  let countdown = logic.createInitialState();
  countdown = logic.reduce(countdown, action(countdown, logic.ACTIONS.START_MATCH, { seed: 10 }));
  const noCountdownMove = logic.reduce(countdown, action(countdown, logic.ACTIONS.MOVE, {
    player: "left", direction: "up", repeat: false, now: 1,
  }));
  assert.equal(noCountdownMove, countdown);

  const racing = startRacing(10);
  const repeated = logic.reduce(racing, action(racing, logic.ACTIONS.MOVE, {
    player: "left", direction: "up", repeat: true, now: 31,
  }));
  assert.equal(repeated, racing);
});

test("MOVE 只修改目标席位，无效移动保持 state 引用和 revision", () => {
  const state = startRacing(44);
  const view = logic.getPublicView(state);
  const leftBlank = view.boards.left.blankIndex;
  const direction = logic.getLegalBlankMoves(leftBlank)[0];
  const moved = logic.reduce(state, action(state, logic.ACTIONS.MOVE, {
    player: "left",
    direction,
    repeat: false,
    now: 31,
  }));
  const movedView = logic.getPublicView(moved);
  assert.notDeepEqual(movedView.boards.left.tiles, view.boards.left.tiles);
  assert.deepEqual(movedView.boards.right.tiles, view.boards.right.tiles);
  assert.equal(movedView.boards.left.moves, 1);
  assert.equal(movedView.boards.right.moves, 0);
  assert.equal(moved.revision, state.revision + 1);

  const illegalDirection = logic.getLegalBlankMoves(movedView.boards.left.blankIndex)
    .includes("up") ? "down" : "up";
  const maybeInvalid = logic.reduce(moved, action(moved, logic.ACTIONS.MOVE, {
    player: "left",
    direction: illegalDirection,
    repeat: false,
    now: 32,
  }));
  if (maybeInvalid === moved) assert.equal(maybeInvalid.revision, moved.revision);
});

test("严格 action 拒绝 stale revision、多字段、访问器、Proxy 和最大 revision", () => {
  const state = startRacing(55);
  assert.equal(logic.reduce(state, {
    type: logic.ACTIONS.PAUSE,
    revision: state.revision - 1,
    now: 40,
  }), state);
  assert.equal(logic.reduce(state, {
    type: logic.ACTIONS.PAUSE,
    revision: state.revision,
    now: 40,
    extra: true,
  }), state);

  const getter = {};
  Object.defineProperties(getter, {
    type: { enumerable: true, value: logic.ACTIONS.PAUSE },
    revision: { enumerable: true, get() { throw new Error("read"); } },
    now: { enumerable: true, value: 40 },
  });
  assert.equal(logic.reduce(state, getter), state);
  assert.equal(
    logic.reduce(state, new Proxy({}, { ownKeys() { throw new Error("trap"); } })),
    state,
  );

  const saturated = Object.freeze({ ...state, revision: Number.MAX_SAFE_INTEGER });
  const reset = logic.reduce(saturated, {
    type: logic.ACTIONS.PAUSE,
    revision: Number.MAX_SAFE_INTEGER,
    now: 40,
  });
  assert.equal(logic.getPublicView(reset).phase, "setup");
});

test("比赛暂停冻结有效用时，显式恢复三拍后才继续", () => {
  let state = startRacing(66);
  state = logic.reduce(state, action(state, logic.ACTIONS.PAUSE, { now: 50 }));
  let view = logic.getPublicView(state);
  assert.equal(view.phase, "paused");
  assert.equal(view.pausedFrom, "racing");
  assert.equal(view.controls.canResume, true);

  state = logic.reduce(state, action(state, logic.ACTIONS.RESUME));
  assert.equal(logic.getPublicView(state).phase, "resume-countdown");
  for (const now of [80, 90]) {
    state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now }));
  }
  assert.equal(logic.getPublicView(state).phase, "resume-countdown");
  state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now: 100 }));
  view = logic.getPublicView(state);
  assert.equal(view.phase, "racing");
  assert.equal(view.timing.accumulatedPausedMs, 50);
});

test("第一方完成后只锁该方，窗口内第二方完成判并列", () => {
  let state = startRacing(77);
  const inverse = inverseTraceFor(state);
  state = playDirections(state, "left", inverse, 31, 1);
  let view = logic.getPublicView(state);
  assert.equal(view.phase, "settling");
  assert.equal(view.firstFinisher, "left");
  assert.equal(view.boards.left.locked, true);
  assert.equal(view.boards.right.locked, false);
  assert.equal(view.controls.canMoveLeft, false);
  assert.equal(view.controls.canMoveRight, true);
  const leftSolvedAt = view.boards.left.solvedAt;

  const revisionBeforeSecondFinish = state.revision;
  state = playDirections(state, "right", inverse, leftSolvedAt + 0.001, 0.5);
  view = logic.getPublicView(state);
  assert.equal(view.phase, "finished");
  assert.equal(view.result.outcome, "draw");
  assert.ok(view.result.right.elapsedMs - view.result.left.elapsedMs <= 100);
  assert.equal(state.revision, revisionBeforeSecondFinish + inverse.length);
});

test("结算窗口超时固定第一方获胜，延迟 MOVE 不能偷走结果", () => {
  let state = startRacing(88);
  const inverse = inverseTraceFor(state);
  state = playDirections(state, "right", inverse, 31, 1);
  const settling = logic.getPublicView(state);
  assert.equal(settling.firstFinisher, "right");
  const afterDeadline = settling.timing.settlementDeadline + 0.001;
  state = logic.reduce(state, action(state, logic.ACTIONS.MOVE, {
    player: "left",
    direction: logic.getLegalBlankMoves(logic.getPublicView(state).boards.left.blankIndex)[0],
    repeat: false,
    now: afterDeadline,
  }));
  const view = logic.getPublicView(state);
  assert.equal(view.phase, "finished");
  assert.equal(view.result.outcome, "right");
  assert.equal(view.result.left.elapsedMs, null);
  assert.equal(view.result.settledAt, settling.timing.settlementDeadline);
});

test("暂停 settling 冻结剩余窗口，恢复后按剩余毫秒重建 deadline", () => {
  let state = startRacing(99);
  const inverse = inverseTraceFor(state);
  state = playDirections(state, "left", inverse, 31, 1);
  const first = logic.getPublicView(state);
  const pauseAt = first.boards.left.solvedAt + 40;
  state = logic.reduce(state, action(state, logic.ACTIONS.PAUSE, { now: pauseAt }));
  let view = logic.getPublicView(state);
  assert.equal(view.phase, "paused");
  assert.equal(view.pausedFrom, "settling");
  assert.equal(view.timing.settlementRemainingMs, 60);
  assert.equal(view.timing.settlementDeadline, null);

  state = logic.reduce(state, action(state, logic.ACTIONS.RESUME));
  for (const now of [500, 510, 520]) {
    state = logic.reduce(state, action(state, logic.ACTIONS.COUNTDOWN_TICK, { now }));
  }
  view = logic.getPublicView(state);
  assert.equal(view.phase, "settling");
  assert.equal(view.timing.settlementDeadline, 580);
  assert.equal(view.timing.accumulatedPausedMs, 520 - pauseAt);
  const early = logic.reduce(state, action(state, logic.ACTIONS.SETTLE, { now: 579.999 }));
  assert.equal(early, state);
  state = logic.reduce(state, action(state, logic.ACTIONS.SETTLE, { now: 580 }));
  assert.equal(logic.getPublicView(state).result.outcome, "left");
});

test("rematch 保留来源但生成新共同局面，返回 setup 清空比赛", () => {
  let state = startRacing(111);
  const inverse = inverseTraceFor(state);
  state = playDirections(state, "left", inverse, 31, 1);
  const deadline = logic.getPublicView(state).timing.settlementDeadline;
  state = logic.reduce(state, action(state, logic.ACTIONS.SETTLE, { now: deadline }));
  assert.equal(logic.getPublicView(state).phase, "finished");

  const rematch = logic.reduce(state, action(state, logic.ACTIONS.REMATCH, { seed: 112 }));
  const rematchView = logic.getPublicView(rematch);
  assert.equal(rematchView.phase, "countdown");
  assert.deepEqual(rematchView.boards.left.tiles, rematchView.boards.right.tiles);
  assert.notDeepEqual(rematchView.initialTiles, logic.getPublicView(state).initialTiles);
  assert.deepEqual(rematchView.sourceMetadata, logic.getPublicView(state).sourceMetadata);

  state = logic.reduce(state, action(state, logic.ACTIONS.RETURN_TO_SETUP));
  const setup = logic.getPublicView(state);
  assert.equal(setup.phase, "setup");
  assert.equal(setup.boards.left, null);
  assert.equal(setup.result, null);
});

test("公开 view 精确冻结、断开全部可变引用且只含安全来源元数据", () => {
  const state = startRacing(222);
  const view = logic.getPublicView(state);
  assert.deepEqual(Reflect.ownKeys(view), [
    "version",
    "phase",
    "sourceMetadata",
    "seed",
    "initialTiles",
    "boards",
    "countdown",
    "timing",
    "pausedFrom",
    "firstFinisher",
    "result",
    "controls",
    "revision",
  ]);
  assert.equal(Object.isFrozen(view), true);
  assert.equal(Object.isFrozen(view.boards.left.tiles), true);
  assert.notEqual(view.initialTiles, state.initialTiles);
  assert.notEqual(view.boards.left.tiles, state.left.tiles);
  assert.deepEqual(Reflect.ownKeys(view.sourceMetadata), [
    "kind", "status", "generation", "errorCode",
  ]);
  assert.equal(logic.getPublicView(JSON.parse(JSON.stringify(state))), null);
  const serialized = JSON.stringify(view).toLowerCase();
  for (const forbidden of ["filename", "blob:", "exif", "gps", "activeurl"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("生产内核不读取 DOM、浏览器图片、网络、存储、随机、时钟或计时器", () => {
  const sources = [
    readFileSync(require.resolve("./config.js"), "utf8"),
    readFileSync(require.resolve("./logic.js"), "utf8"),
  ].join("\n");
  for (const forbidden of [
    /\bdocument\b/u,
    /\bwindow\./u,
    /\bCanvas/u,
    /\bBlob\b/u,
    /\bFile\b/u,
    /\bImageBitmap\b/u,
    /\bcreateImageBitmap\b/u,
    /\bfetch\s*\(/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\bMath\.random\b/u,
    /\bDate\.now\b/u,
    /\bperformance\./u,
    /\bsetTimeout\b/u,
    /\bsetInterval\b/u,
  ]) {
    assert.equal(forbidden.test(sources), false, String(forbidden));
  }
});
