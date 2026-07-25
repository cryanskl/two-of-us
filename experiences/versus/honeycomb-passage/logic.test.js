import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("./config.js");
await import("./logic.js");

const configApi = globalThis.HoneycombPassageConfig;
const editableConfig = globalThis.HONEYCOMB_PASSAGE_CONFIG;
const logic = globalThis.HoneycombPassageLogic;

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) assertDeepFrozen(descriptor.value, seen);
  }
}

function mirror(cell) {
  return { q: -cell.q, r: -cell.r };
}

function throwingProxy() {
  return new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype");
    },
    ownKeys() {
      throw new Error("hostile keys");
    },
  });
}

function appendAction(history, type, targetKey) {
  const replay = logic.replayHistory(history);
  assert.ok(replay);
  assert.notEqual(replay.activePlayer, null);
  const next = logic.applyAction(
    history,
    replay.activePlayer,
    type,
    logic.parseCellKey(targetKey),
  );
  assert.ok(next, `action ${history.length + 1} ${type} ${targetKey} should be legal`);
  return next;
}

function playAlternating(yellowActions, purpleActions) {
  let history = [];
  for (let index = 0; index < yellowActions.length; index += 1) {
    history = appendAction(history, yellowActions[index].type, yellowActions[index].targetKey);
    if (index < purpleActions.length) {
      history = appendAction(history, purpleActions[index].type, purpleActions[index].targetKey);
    }
  }
  return history;
}

function stateFromHistory(history, config) {
  let state = logic.reduce(logic.createInitialState(config), { type: "START" });
  for (const event of history) {
    state = logic.reduce(state, {
      type: "ACT",
      player: event.player,
      move: event.type,
      target: logic.parseCellKey(event.targetKey),
    });
  }
  return state;
}

function moveActions(keys) {
  return keys.map((targetKey) => ({ type: "move", targetKey }));
}

test("导出冻结常量、默认配置和稳定 UMD 全局", () => {
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.PLAYER_COUNT, 2);
  assert.equal(logic.BOARD_RADIUS, 3);
  assert.equal(logic.BOARD_CELL_COUNT, 37);
  assert.equal(logic.STARTING_SEALS, 4);
  assert.equal(logic.MAX_ROUNDS, 16);
  assert.equal(logic.MAX_PLIES, 32);
  assert.equal(logic.YELLOW, 0);
  assert.equal(logic.PURPLE, 1);
  assert.deepEqual(logic.STARTS, [{ q: -3, r: 0 }, { q: 3, r: 0 }]);
  assert.deepEqual(logic.ACTIONS, ["move", "seal"]);
  assert.deepEqual(logic.PHASES, ["intro", "playing", "result"]);
  assert.deepEqual(logic.DIRECTIONS, [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]);
  assert.deepEqual(editableConfig, {
    playerNames: ["蜜黄", "暮紫"],
    finalNote: "绕一点路，也还是会在对面相逢。",
  });
  assert.equal(editableConfig, configApi.DEFAULT_CONFIG);
  assertDeepFrozen(configApi);
  assertDeepFrozen(logic);
});

test("配置严格白名单、清理纯文本并隔离调用方引用", () => {
  const source = {
    playerNames: ["  小蜜  ", "暮暮"],
    finalNote: "  总会相逢。  ",
  };
  const sanitized = configApi.sanitizeConfig(source);
  assert.deepEqual(sanitized, {
    playerNames: ["小蜜", "暮暮"],
    finalNote: "总会相逢。",
  });
  assert.notEqual(sanitized.playerNames, source.playerNames);
  source.playerNames[0] = "篡改";
  source.finalNote = "篡改";
  assert.deepEqual(sanitized, {
    playerNames: ["小蜜", "暮暮"],
    finalNote: "总会相逢。",
  });
  assertDeepFrozen(sanitized);

  assert.deepEqual(configApi.sanitizeConfig({
    playerNames: ["同名", "同名"],
    finalNote: "合法结语",
  }), {
    playerNames: ["蜜黄", "暮紫"],
    finalNote: "合法结语",
  });
  assert.deepEqual(configApi.sanitizeConfig({
    playerNames: ["甲", "乙"],
    finalNote: "",
  }), {
    playerNames: ["甲", "乙"],
    finalNote: "绕一点路，也还是会在对面相逢。",
  });
  assert.equal(configApi.sanitizeConfig({
    playerNames: ["甲", "乙"],
    finalNote: "合法",
    extra: true,
  }), configApi.DEFAULT_CONFIG);
});

test("配置拒绝控制字符、孤立代理项、畸形数组、访问器、自定义原型和 Proxy", () => {
  const invalidNames = [
    ["甲\n", "乙"],
    ["\uD800", "乙"],
    ["", "乙"],
    ["1234567890123", "乙"],
  ];
  for (const playerNames of invalidNames) {
    assert.deepEqual(configApi.sanitizeConfig({ playerNames, finalNote: "仍合法" }), {
      playerNames: ["蜜黄", "暮紫"],
      finalNote: "仍合法",
    });
  }

  const sparse = [];
  sparse.length = 2;
  sparse[1] = "乙";
  const subclass = new (class extends Array {})("甲", "乙");
  const accessor = { finalNote: "合法" };
  Object.defineProperty(accessor, "playerNames", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  const inherited = Object.assign(Object.create({}), {
    playerNames: ["甲", "乙"],
    finalNote: "合法",
  });

  for (const value of [
    { playerNames: sparse, finalNote: "合法" },
    { playerNames: subclass, finalNote: "合法" },
  ]) {
    assert.doesNotThrow(() => configApi.sanitizeConfig(value));
    assert.deepEqual(configApi.sanitizeConfig(value), {
      playerNames: ["蜜黄", "暮紫"],
      finalNote: "合法",
    });
  }
  for (const value of [accessor, inherited, throwingProxy()]) {
    assert.doesNotThrow(() => configApi.sanitizeConfig(value));
    assert.equal(configApi.sanitizeConfig(value), configApi.DEFAULT_CONFIG);
  }
});

test("cell key 只接受精确普通安全整数坐标并严格解析 canonical key", () => {
  assert.equal(logic.cellKey({ q: 0, r: 0 }), "0,0");
  assert.equal(logic.cellKey({ q: -0, r: 0 }), "0,0");
  assert.equal(logic.cellKey({ q: -3, r: 3 }), "-3,3");
  assert.deepEqual(logic.parseCellKey("-3,3"), { q: -3, r: 3 });
  assert.equal(logic.isCellOnBoard({ q: 3, r: -3 }), true);

  for (const cell of [
    null,
    [],
    { q: 0 },
    { q: 0, r: 0, s: 0 },
    { q: 4, r: 0 },
    { q: 3, r: 1 },
    { q: 0.5, r: 0 },
    { q: "0", r: 0 },
    { q: Number.NaN, r: 0 },
    { q: Number.POSITIVE_INFINITY, r: 0 },
    { q: Number.MAX_SAFE_INTEGER, r: Number.MAX_SAFE_INTEGER },
    Object.assign(Object.create({}), { q: 0, r: 0 }),
    { q: 0, r: 0, [Symbol("extra")]: true },
    throwingProxy(),
  ]) {
    assert.doesNotThrow(() => logic.cellKey(cell));
    assert.equal(logic.cellKey(cell), null);
    assert.equal(logic.isCellOnBoard(cell), false);
  }

  const getter = { r: 0 };
  Object.defineProperty(getter, "q", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.equal(logic.cellKey(getter), null);

  for (const key of [
    "+0,0", "-0,0", "00,0", "0,-0", "0, 0", "0,0 ", "3,1", "4,0",
    "9007199254740992,0", "", null, throwingProxy(),
  ]) {
    assert.doesNotThrow(() => logic.parseCellKey(key));
    assert.equal(logic.parseCellKey(key), null);
  }
  assertDeepFrozen(logic.parseCellKey("1,-2"));
});

test("默认棋盘有 37 个唯一格并按 q、r 稳定排序", () => {
  const first = logic.createBoard();
  const second = logic.createBoard();
  const keys = first.map(logic.cellKey);
  assert.equal(first.length, 37);
  assert.equal(new Set(keys).size, 37);
  assert.deepEqual(first.slice(0, 4), [
    { q: -3, r: 0 },
    { q: -3, r: 1 },
    { q: -3, r: 2 },
    { q: -3, r: 3 },
  ]);
  assert.deepEqual(first.slice(-4), [
    { q: 3, r: -3 },
    { q: 3, r: -2 },
    { q: 3, r: -1 },
    { q: 3, r: 0 },
  ]);
  for (let index = 1; index < first.length; index += 1) {
    const previous = first[index - 1];
    const current = first[index];
    assert.equal(previous.q < current.q || (previous.q === current.q && previous.r < current.r), true);
  }
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
  assertDeepFrozen(first);
  assert.deepEqual(logic.createBoard(2).length, 19);
  assert.deepEqual(logic.createBoard(0), [{ q: 0, r: 0 }]);
  for (const radius of [-1, 4, 1.5, "3", Number.NaN]) assert.deepEqual(logic.createBoard(radius), []);
});

test("邻居遵循固定方向，内部六邻、六角三邻且邻接双向", () => {
  assert.deepEqual(logic.getNeighbors({ q: 0, r: 0 }), logic.DIRECTIONS);
  const corners = [
    { q: 3, r: 0 },
    { q: 3, r: -3 },
    { q: 0, r: -3 },
    { q: -3, r: 0 },
    { q: -3, r: 3 },
    { q: 0, r: 3 },
  ];
  for (const corner of corners) assert.equal(logic.getNeighbors(corner).length, 3);

  for (const cell of logic.createBoard()) {
    const key = logic.cellKey(cell);
    const neighborKeys = logic.getNeighbors(cell).map(logic.cellKey);
    assert.equal(new Set(neighborKeys).size, neighborKeys.length);
    for (const neighbor of logic.getNeighbors(cell)) {
      assert.equal(logic.getNeighbors(neighbor).map(logic.cellKey).includes(key), true);
    }
  }
  assert.deepEqual(logic.getNeighbors({ q: 4, r: 0 }), []);
  assertDeepFrozen(logic.getNeighbors({ q: 0, r: 0 }));
});

test("起点、目标边和坐标镜像严格对称", () => {
  assert.equal(logic.isGoalCell(logic.YELLOW, { q: 3, r: -2 }), true);
  assert.equal(logic.isGoalCell(logic.YELLOW, { q: 2, r: 0 }), false);
  assert.equal(logic.isGoalCell(logic.PURPLE, { q: -3, r: 2 }), true);
  assert.equal(logic.isGoalCell(logic.PURPLE, { q: -2, r: 0 }), false);
  assert.equal(logic.isGoalCell(2, { q: 3, r: 0 }), false);
  assert.equal(logic.isGoalCell(0, throwingProxy()), false);

  for (const cell of logic.createBoard()) {
    assert.equal(logic.isCellOnBoard(mirror(cell)), true);
    assert.equal(logic.isGoalCell(logic.YELLOW, cell), logic.isGoalCell(logic.PURPLE, mirror(cell)));
  }
});

test("BFS 给出初始距离、目标距离、唯一走廊、截断和绕行结果", () => {
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, []), 6);
  assert.equal(logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, []), 6);
  assert.equal(logic.findShortestDistance({ q: 3, r: -1 }, logic.YELLOW, []), 0);
  assert.equal(logic.findShortestDistance({ q: -3, r: 1 }, logic.PURPLE, []), 0);

  const allMiddle = logic.createBoard()
    .filter((cell) => cell.q === 0)
    .map(logic.cellKey);
  const oneOpening = allMiddle.filter((key) => key !== "0,0");
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, oneOpening), 6);
  assert.equal(logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, oneOpening), 6);
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, allMiddle), null);
  assert.equal(logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, allMiddle), null);
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, ["0,0"]), 6);

  const descriptorOnlyStart = new Proxy({ q: -3, r: 0 }, {
    get(target, property, receiver) {
      if (property === "q" || property === "r") throw new Error("must not read through proxy get");
      return Reflect.get(target, property, receiver);
    },
  });
  assert.doesNotThrow(
    () => logic.findShortestDistance(descriptorOnlyStart, logic.YELLOW, []),
  );
  assert.equal(logic.findShortestDistance(descriptorOnlyStart, logic.YELLOW, []), 6);
});

test("镜像封蜡夹具保持 BFS 距离镜像", () => {
  const fixtures = [
    [],
    ["0,0"],
    ["-1,0", "0,-1", "1,-1"],
    ["-2,1", "-1,1", "0,1", "1,0"],
  ];
  for (const blocked of fixtures) {
    const mirrored = blocked.map((key) => logic.cellKey(mirror(logic.parseCellKey(key))));
    assert.equal(
      logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, blocked),
      logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, mirrored),
    );
  }
});

test("BFS 拒绝重复、起点、越界、非 canonical、稀疏、访问器、子类和 Proxy blocked", () => {
  const start = logic.STARTS[0];
  const sparse = [];
  sparse.length = 1;
  const accessor = [];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    configurable: true,
    get() {
      throw new Error("must not run");
    },
  });
  accessor.length = 1;
  const subclass = new (class extends Array {})("0,0");
  const proxy = new Proxy([], {
    ownKeys() {
      throw new Error("hostile keys");
    },
  });

  for (const blocked of [
    ["0,0", "0,0"],
    ["-3,0"],
    ["4,0"],
    ["00,0"],
    sparse,
    accessor,
    subclass,
    proxy,
    null,
  ]) {
    assert.doesNotThrow(() => logic.findShortestDistance(start, logic.YELLOW, blocked));
    assert.equal(logic.findShortestDistance(start, logic.YELLOW, blocked), null);
  }
  assert.equal(logic.findShortestDistance({ q: 4, r: 0 }, logic.YELLOW, []), null);
  assert.equal(logic.findShortestDistance(start, 2, []), null);
});

test("空历史重放派生唯一初局、合法行动、距离和回合", () => {
  const replay = logic.replayHistory([]);
  assert.deepEqual(replay.positions, logic.STARTS);
  assert.deepEqual(replay.sealsRemaining, [4, 4]);
  assert.deepEqual(replay.blockedKeys, []);
  assert.equal(replay.activePlayer, logic.YELLOW);
  assert.equal(replay.ply, 0);
  assert.equal(replay.round, 1);
  assert.equal(replay.completedRounds, 0);
  assert.deepEqual(replay.distances, [6, 6]);
  assert.deepEqual(replay.legalMoves.map(logic.cellKey), ["-2,0", "-2,-1", "-3,1"]);
  assert.equal(replay.legalSeals.length, 35);
  assert.equal(replay.result, null);
  assert.deepEqual(logic.getLegalMoves(replay), replay.legalMoves);
  assert.deepEqual(logic.getLegalSeals(replay), replay.legalSeals);
  assert.equal(logic.hasRouteForBoth(replay, { q: 0, r: 0 }), true);
  assertDeepFrozen(replay);
});

test("移动与封蜡只追加规范事件并严格换手、扣当前库存", () => {
  const moved = logic.applyAction([], logic.YELLOW, "move", { q: -2, r: 0 });
  assert.deepEqual(moved, [
    { ply: 1, player: 0, type: "move", targetKey: "-2,0" },
  ]);
  const afterMove = logic.replayHistory(moved);
  assert.deepEqual(afterMove.positions, [{ q: -2, r: 0 }, { q: 3, r: 0 }]);
  assert.equal(afterMove.activePlayer, logic.PURPLE);
  assert.deepEqual(afterMove.sealsRemaining, [4, 4]);

  const sealed = logic.applyAction(moved, logic.PURPLE, "seal", { q: 0, r: 0 });
  assert.deepEqual(sealed.at(-1), {
    ply: 2, player: 1, type: "seal", targetKey: "0,0",
  });
  const afterSeal = logic.replayHistory(sealed);
  assert.deepEqual(afterSeal.blockedKeys, ["0,0"]);
  assert.deepEqual(afterSeal.sealsRemaining, [4, 3]);
  assert.equal(afterSeal.activePlayer, logic.YELLOW);
  assert.equal(afterSeal.round, 2);
  assert.equal(afterSeal.completedRounds, 1);
  assertDeepFrozen(sealed);
});

test("非法移动、错玩家、未知行动、棋子占位和非法封蜡均返回 null", () => {
  assert.equal(logic.applyAction([], 1, "move", { q: -2, r: 0 }), null);
  assert.equal(logic.applyAction([], 0, "move", { q: -1, r: 0 }), null);
  assert.equal(logic.applyAction([], 0, "move", { q: 3, r: 0 }), null);
  assert.equal(logic.applyAction([], 0, "seal", { q: -3, r: 0 }), null);
  assert.equal(logic.applyAction([], 0, "seal", { q: 3, r: 0 }), null);
  assert.equal(logic.applyAction([], 0, "jump", { q: -2, r: 0 }), null);
  assert.equal(logic.applyAction([], 0, "move", { q: 4, r: 0 }), null);

  let approaching = [];
  for (const action of [
    ["move", "-2,0"], ["move", "2,0"],
    ["move", "-1,0"], ["move", "1,0"],
    ["move", "0,0"],
  ]) approaching = appendAction(approaching, action[0], action[1]);
  const replay = logic.replayHistory(approaching);
  assert.equal(replay.activePlayer, logic.PURPLE);
  assert.equal(replay.legalMoves.map(logic.cellKey).includes("0,0"), false);
  assert.equal(logic.applyAction(approaching, logic.PURPLE, "move", { q: 0, r: 0 }), null);
  assert.equal(logic.findShortestDistance(replay.positions[1], logic.PURPLE, replay.blockedKeys), 4);
});

test("最后通道封蜡同时从候选和直接提交中拒绝", () => {
  let history = [];
  for (const key of ["0,-3", "0,-2", "0,-1", "0,1", "0,2", "0,3"]) {
    history = appendAction(history, "seal", key);
  }
  const replay = logic.replayHistory(history);
  assert.deepEqual(replay.sealsRemaining, [1, 1]);
  assert.equal(replay.activePlayer, logic.YELLOW);
  assert.equal(replay.legalSeals.map(logic.cellKey).includes("0,0"), false);
  assert.equal(logic.getLegalSeals(replay).map(logic.cellKey).includes("0,0"), false);
  assert.equal(logic.hasRouteForBoth(replay, { q: 0, r: 0 }), false);
  assert.equal(logic.applyAction(history, logic.YELLOW, "seal", { q: 0, r: 0 }), null);
});

test("双方到达目标边立即获胜，终局后拒绝任何追加", () => {
  const yellowHistory = playAlternating(
    moveActions(["-2,0", "-1,0", "0,0", "1,0", "2,0", "3,0"]),
    moveActions(["3,-1", "2,-1", "3,-1", "2,-1", "3,-1"]),
  );
  const yellowReplay = logic.replayHistory(yellowHistory);
  assert.equal(yellowReplay.ply, 11);
  assert.deepEqual(yellowReplay.result, {
    reason: "reached-goal",
    winner: logic.YELLOW,
    distances: [0, 6],
    sealsRemaining: [4, 4],
  });
  assert.equal(yellowReplay.activePlayer, null);
  assert.deepEqual(yellowReplay.legalMoves, []);
  assert.deepEqual(yellowReplay.legalSeals, []);
  assert.equal(logic.applyAction(yellowHistory, logic.PURPLE, "move", { q: 1, r: -1 }), null);
  assert.equal(logic.replayHistory([
    ...yellowHistory,
    { ply: 12, player: 1, type: "move", targetKey: "1,-1" },
  ]), null);

  const purpleHistory = playAlternating(
    moveActions(["-3,1", "-2,1", "-3,1", "-2,1", "-3,1", "-2,1"]),
    moveActions(["2,0", "1,0", "0,0", "-1,0", "-2,0", "-3,0"]),
  );
  assert.deepEqual(logic.replayHistory(purpleHistory).result, {
    reason: "reached-goal",
    winner: logic.PURPLE,
    distances: [5, 0],
    sealsRemaining: [4, 4],
  });
});

test("实际可达的零库存夹具触发 immobilized，永久 BFS 仍忽略对手", () => {
  const yellowActions = [
    { type: "seal", targetKey: "0,3" },
    { type: "seal", targetKey: "1,2" },
    { type: "seal", targetKey: "2,-3" },
    { type: "seal", targetKey: "0,-3" },
    ...moveActions(["-2,0", "-1,0", "0,0", "1,0", "2,0"]),
  ];
  const purpleActions = [
    ...moveActions(["3,-1", "3,0", "3,-1", "3,0"]),
    { type: "seal", targetKey: "3,-1" },
    { type: "seal", targetKey: "2,1" },
    { type: "seal", targetKey: "-3,3" },
    { type: "seal", targetKey: "3,-3" },
  ];
  const history = playAlternating(yellowActions, purpleActions);
  const beforeTrap = logic.replayHistory(history.slice(0, -1));
  assert.deepEqual(beforeTrap.sealsRemaining, [0, 0]);
  assert.deepEqual(beforeTrap.legalSeals, []);
  assert.equal(beforeTrap.result, null);
  const replay = logic.replayHistory(history);
  assert.equal(replay.ply, 17);
  assert.deepEqual(replay.sealsRemaining, [0, 0]);
  assert.deepEqual(replay.result, {
    reason: "immobilized",
    winner: logic.YELLOW,
    immobilizedPlayer: logic.PURPLE,
    distances: [1, 6],
    sealsRemaining: [0, 0],
  });
  assert.equal(
    logic.findShortestDistance(
      replay.positions[logic.PURPLE],
      logic.PURPLE,
      replay.blockedKeys,
    ),
    6,
  );
});

test("31 ply 不提前终局，32 ply 精确产生距离、库存和平局三种结算", () => {
  const purpleCycle = moveActions(Array.from(
    { length: 16 },
    (_, index) => index % 2 === 0 ? "2,0" : "3,0",
  ));
  const drawYellow = moveActions(Array.from(
    { length: 16 },
    (_, index) => index % 2 === 0 ? "-2,0" : "-3,0",
  ));
  const drawHistory = playAlternating(drawYellow, purpleCycle);
  const at31 = logic.replayHistory(drawHistory.slice(0, 31));
  assert.equal(at31.ply, 31);
  assert.equal(at31.result, null);
  assert.equal(at31.activePlayer, logic.PURPLE);
  const draw = logic.replayHistory(drawHistory);
  assert.equal(draw.round, 16);
  assert.equal(draw.completedRounds, 16);
  assert.deepEqual(draw.result, {
    reason: "round-limit",
    winner: null,
    tiebreak: "draw",
    distances: [6, 6],
    sealsRemaining: [4, 4],
  });

  const closerYellow = moveActions([
    "-2,0", "-1,0", "-2,0", "-1,0", "-2,0", "-1,0", "-2,0", "-1,0",
    "-2,0", "-1,0", "-2,0", "-1,0", "-2,0", "-1,0", "-2,0", "-1,0",
  ]);
  const distanceResult = logic.replayHistory(playAlternating(closerYellow, purpleCycle)).result;
  assert.equal(distanceResult.winner, logic.YELLOW);
  assert.equal(distanceResult.tiebreak, "distance");
  assert.deepEqual(distanceResult.distances, [4, 6]);

  const sealThenTriangles = [
    { type: "seal", targetKey: "0,3" },
    ...moveActions([
      "-2,0", "-3,1", "-3,0", "-2,0", "-3,1", "-3,0", "-2,0", "-3,1",
      "-3,0", "-2,0", "-3,1", "-3,0", "-2,0", "-3,1", "-3,0",
    ]),
  ];
  const sealResult = logic.replayHistory(playAlternating(sealThenTriangles, purpleCycle)).result;
  assert.equal(sealResult.winner, logic.PURPLE);
  assert.equal(sealResult.tiebreak, "seals");
  assert.deepEqual(sealResult.distances, [6, 6]);
  assert.deepEqual(sealResult.sealsRemaining, [3, 4]);
});

test("reducer 只接受精确 action，revision 与 ply 分离，restart 保留配置", () => {
  const initial = logic.createInitialState({
    playerNames: ["朝朝", "暮暮"],
    finalNote: "再绕一圈。",
  });
  assert.deepEqual(initial, {
    version: 1,
    phase: "intro",
    content: {
      playerNames: ["朝朝", "暮暮"],
      finalNote: "再绕一圈。",
    },
    history: [],
    revision: 0,
  });
  const started = logic.reduce(initial, { type: "START" });
  assert.equal(started.phase, "playing");
  assert.equal(started.revision, 1);
  const moved = logic.reduce(started, {
    type: "ACT", player: 0, move: "move", target: { q: -2, r: 0 },
  });
  assert.equal(moved.history.length, 1);
  assert.equal(moved.revision, 2);
  for (const action of [
    { type: "START" },
    { type: "ACT", player: 0, move: "move", target: { q: -3, r: 0 } },
    { type: "ACT", player: 1, move: "move", target: { q: 2, r: 0 }, extra: true },
    { type: "UNKNOWN" },
    throwingProxy(),
  ]) {
    assert.doesNotThrow(() => logic.reduce(moved, action));
    assert.equal(logic.reduce(moved, action), moved);
  }

  const finishedHistory = playAlternating(
    moveActions(["-2,0", "-1,0", "0,0", "1,0", "2,0", "3,0"]),
    moveActions(["3,-1", "2,-1", "3,-1", "2,-1", "3,-1"]),
  );
  const finished = stateFromHistory(finishedHistory, initial.content);
  assert.equal(finished.phase, "result");
  assert.deepEqual(logic.getScreenView(finished).controls, {
    canStart: false,
    canAct: false,
    canRestart: true,
  });
  const restarted = logic.reduce(finished, { type: "RESTART" });
  assert.equal(restarted.phase, "intro");
  assert.deepEqual(restarted.history, []);
  assert.deepEqual(restarted.content, initial.content);
  assert.equal(restarted.revision, finished.revision + 1);
  assertDeepFrozen(restarted);

  const descriptorState = new Proxy(started, {
    get() {
      throw new Error("must not read state through ordinary get");
    },
  });
  const fromDescriptorState = logic.reduce(descriptorState, {
    type: "ACT", player: 0, move: "move", target: { q: -2, r: 0 },
  });
  assert.equal(fromDescriptorState.history.length, 1);
  assert.equal(fromDescriptorState.revision, 2);
  assert.equal(logic.getScreenView(descriptorState).phase, "playing");

  const saturated = Object.freeze({ ...initial, revision: Number.MAX_SAFE_INTEGER });
  assert.equal(logic.reduce(saturated, { type: "START" }), saturated);
});

test("可变或仅浅层冻结的 state 不得沿 no-op 路径逃逸", () => {
  const started = logic.reduce(logic.createInitialState(), { type: "START" });
  const mutable = structuredClone(started);
  const shallowFrozen = Object.freeze(structuredClone(started));

  for (const candidate of [mutable, shallowFrozen]) {
    const recovered = logic.reduce(candidate, { type: "UNKNOWN" });
    assert.deepEqual(recovered, logic.createInitialState());
    assert.notEqual(recovered, candidate);
    assertDeepFrozen(recovered);
    assert.deepEqual(
      logic.getScreenView(candidate),
      logic.getScreenView(logic.createInitialState()),
    );
  }
});

test("公开 view 只暴露渲染副本、精确 controls 和规范 history", () => {
  const state = logic.reduce(
    logic.reduce(logic.createInitialState(), { type: "START" }),
    { type: "ACT", player: 0, move: "seal", target: { q: 0, r: 0 } },
  );
  const view = logic.getScreenView(state);
  assert.equal(view.phase, "playing");
  assert.equal(view.title, "蜜径相逢");
  assert.equal(view.activePlayer, logic.PURPLE);
  assert.equal(view.ply, 1);
  assert.equal(view.round, 1);
  assert.deepEqual(view.blockedKeys, ["0,0"]);
  assert.deepEqual(view.history, [
    { ply: 1, player: 0, type: "seal", targetKey: "0,0" },
  ]);
  assert.deepEqual(view.controls, {
    canStart: false,
    canAct: true,
    canRestart: false,
  });
  assert.notEqual(view.history, state.history);
  assert.notEqual(view.playerNames, state.content.playerNames);
  assertDeepFrozen(view);

  const recovered = logic.getScreenView({ malformed: true });
  assert.equal(recovered.phase, "intro");
  assert.deepEqual(recovered.controls, {
    canStart: true,
    canAct: false,
    canRestart: false,
  });
});

test("history、event、state、action 和 replay 的恶意输入安全拒绝", () => {
  const eventGetter = {};
  Object.defineProperty(eventGetter, "ply", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  const badHistories = [
    [eventGetter],
    [throwingProxy()],
    [{ ply: 1, player: 1, type: "move", targetKey: "-2,0" }],
    [{ ply: 2, player: 0, type: "move", targetKey: "-2,0" }],
    [{ ply: 1, player: 0, type: "move", targetKey: "-2,0", extra: true }],
    new (class extends Array {})(),
    throwingProxy(),
  ];
  for (const history of badHistories) {
    assert.doesNotThrow(() => logic.replayHistory(history));
    assert.equal(logic.replayHistory(history), null);
    assert.doesNotThrow(() => logic.applyAction(history, 0, "move", { q: -2, r: 0 }));
    assert.equal(logic.applyAction(history, 0, "move", { q: -2, r: 0 }), null);
  }

  const started = logic.reduce(logic.createInitialState(), { type: "START" });
  const malformedState = { ...started, history: badHistories[0] };
  const recovered = logic.reduce(malformedState, { type: "START" });
  assert.deepEqual(recovered, logic.createInitialState());
  assertDeepFrozen(recovered);
  assert.deepEqual(logic.getLegalMoves(throwingProxy()), []);
  assert.deepEqual(logic.getLegalSeals(throwingProxy()), []);
  assert.equal(logic.hasRouteForBoth(throwingProxy(), { q: 0, r: 0 }), false);
});

test("玩家与坐标镜像后初始移动、封蜡和距离保持镜像", () => {
  const yellow = logic.replayHistory([]);
  const afterSymmetricSeal = logic.replayHistory(logic.applyAction(
    [], logic.YELLOW, "seal", { q: 0, r: 0 },
  ));
  assert.equal(afterSymmetricSeal.activePlayer, logic.PURPLE);
  assert.deepEqual(
    yellow.legalMoves.map(mirror).map(logic.cellKey).sort(),
    afterSymmetricSeal.legalMoves.map(logic.cellKey).sort(),
  );
  assert.deepEqual(
    yellow.legalSeals
      .filter((cell) => logic.cellKey(cell) !== "0,0")
      .map(mirror)
      .map(logic.cellKey)
      .sort(),
    afterSymmetricSeal.legalSeals.map(logic.cellKey).sort(),
  );
  assert.equal(yellow.distances[0], afterSymmetricSeal.distances[1]);
});

test("固定种子至少 1000 步合法随机游走持续满足不变量", () => {
  let seed = 0x5EED1234;
  let accepted = 0;
  let games = 0;
  while (accepted < 1000) {
    let history = [];
    games += 1;
    while (accepted < 1000) {
      const replay = logic.replayHistory(history);
      assert.ok(replay);
      if (replay.result) break;
      const actions = [
        ...replay.legalMoves.map((target) => ({ type: "move", target })),
        ...replay.legalSeals.map((target) => ({ type: "seal", target })),
      ];
      assert.ok(actions.length > 0);
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const chosen = actions[seed % actions.length];
      const next = logic.applyAction(history, replay.activePlayer, chosen.type, chosen.target);
      assert.ok(next);
      history = next;
      const current = logic.replayHistory(history);
      accepted += 1;
      assert.equal(current.ply, history.length);
      assert.notEqual(logic.cellKey(current.positions[0]), logic.cellKey(current.positions[1]));
      assert.equal(current.blockedKeys.includes(logic.cellKey(current.positions[0])), false);
      assert.equal(current.blockedKeys.includes(logic.cellKey(current.positions[1])), false);
      assert.equal(current.sealsRemaining.every((count) => count >= 0 && count <= 4), true);
      assert.equal(current.distances.every((distance) => Number.isSafeInteger(distance)), true);
      assert.equal(history.every((event, index) => event.ply === index + 1), true);
      if (current.result) {
        assert.equal(logic.applyAction(history, 0, "move", { q: 0, r: 0 }), null);
        break;
      }
    }
  }
  assert.ok(games > 1);
  assert.equal(accepted, 1000);
});

test("生产脚本没有 DOM、网络、存储、随机或计时依赖", async () => {
  const sources = await Promise.all([
    readFile(new URL("./config.js", import.meta.url), "utf8"),
    readFile(new URL("./logic.js", import.meta.url), "utf8"),
  ]);
  const forbidden = [
    /\bdocument\b/u,
    /\bwindow\b/u,
    /\bfetch\b/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\bDate\b/u,
    /\bperformance\b/u,
    /\bMath\.random\b/u,
    /\bsetTimeout\b/u,
    /\bsetInterval\b/u,
  ];
  for (const source of sources) {
    for (const pattern of forbidden) assert.equal(pattern.test(source), false, String(pattern));
  }
});
