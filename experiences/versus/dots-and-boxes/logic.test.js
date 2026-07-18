import test from "node:test";
import assert from "node:assert/strict";

await import("./config.js");
await import("./logic.js");

const configGlobal = globalThis.DOTS_AND_BOXES_CONFIG;
const logic = globalThis.DOTS_AND_BOXES_LOGIC;

function playing(config) {
  return logic.start(logic.createInitialState(config));
}

function claimAll(edgeIds, config) {
  return claimAllFromState(playing(config), edgeIds);
}

function claimAllFromState(state, edgeIds) {
  let current = state;
  for (const edgeId of edgeIds) current = logic.claimEdge(current, edgeId);
  return current;
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function horizontalThenVertical() {
  const all = logic.getAllEdgeIds();
  return [...all.filter((id) => id.startsWith("H:")), ...all.filter((id) => id.startsWith("V:"))];
}

test("常量、经典配置全局、规范 ID 与模块递归冻结", () => {
  assert.equal(logic.BOARD_SIZE, 4);
  assert.equal(logic.DOT_COUNT, 5);
  assert.equal(logic.TOTAL_BOXES, 16);
  assert.equal(logic.TOTAL_EDGES, 40);
  assert.deepEqual(logic.PHASES, { INTRO: "intro", PLAYING: "playing", FINISHED: "finished" });
  assertDeepFrozen(logic);
  assertDeepFrozen(configGlobal);
  assert.deepEqual(configGlobal.playerNames, ["朱方", "蓝方"]);

  const edges = logic.getAllEdgeIds();
  const boxes = logic.getAllBoxIds();
  assert.equal(new Set(edges).size, 40);
  assert.equal(new Set(boxes).size, 16);
  assert.deepEqual(edges.slice(0, 10), [
    "H:0:0", "H:0:1", "H:0:2", "H:0:3",
    "V:0:0", "V:0:1", "V:0:2", "V:0:3", "V:0:4", "H:1:0",
  ]);
  assert.deepEqual(edges.slice(-4), ["H:4:0", "H:4:1", "H:4:2", "H:4:3"]);
  assert.deepEqual(boxes.slice(0, 5), ["B:0:0", "B:0:1", "B:0:2", "B:0:3", "B:1:0"]);
  assert.notEqual(logic.getAllEdgeIds(), edges);
});

test("边与格 ID 构造、解析严格拒绝越界和非规范格式", () => {
  assert.equal(logic.makeEdgeId("H", 4, 3), "H:4:3");
  assert.equal(logic.makeEdgeId("V", 3, 4), "V:3:4");
  assert.equal(logic.makeEdgeId("H", 5, 0), null);
  assert.equal(logic.makeEdgeId("V", 0, 5), null);
  assert.deepEqual(logic.parseEdgeId("H:2:3"), { orientation: "H", row: 2, column: 3 });
  assert.equal(logic.parseEdgeId("H:02:3"), null);
  assert.equal(logic.parseEdgeId("D:1:1"), null);
  assert.equal(logic.makeBoxId(3, 3), "B:3:3");
  assert.equal(logic.makeBoxId(4, 0), null);
  assert.deepEqual(logic.parseBoxId("B:2:1"), { row: 2, column: 1 });
  assert.equal(logic.parseBoxId("B:2:01"), null);
});

test("配置白名单、Unicode 名字清洗、整份回退与调用方所有权隔离", () => {
  const formatter = () => null;
  const source = { playerNames: ["  小朱  ", "蓝蓝"], composeResult: formatter };
  const config = logic.sanitizeConfig(source);
  assert.deepEqual(config.playerNames, ["小朱", "蓝蓝"]);
  assert.notEqual(config.playerNames, source.playerNames);
  assert.notEqual(config.composeResult, formatter);
  source.playerNames[0] = "篡改";
  assert.equal(config.playerNames[0], "小朱");
  assert.equal(Object.isFrozen(formatter), false);
  assert.equal(logic.sanitizeConfig({ ...source, extra: true }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["同名", "同名"], composeResult: formatter }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["一", "123456789"], composeResult: formatter }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["一", "二"], composeResult: null }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ get playerNames() { throw new Error("hostile"); } }), logic.DEFAULT_CONFIG);
  assertDeepFrozen(config);
});

test("每格四边与每边邻格按固定方位返回", () => {
  assert.deepEqual(logic.getBoxEdgeIds("B:0:0"), ["H:0:0", "H:1:0", "V:0:0", "V:0:1"]);
  assert.deepEqual(logic.getBoxEdgeIds("B:3:3"), ["H:3:3", "H:4:3", "V:3:3", "V:3:4"]);
  assert.deepEqual(logic.getAdjacentBoxIds("H:2:2"), ["B:1:2", "B:2:2"]);
  assert.deepEqual(logic.getAdjacentBoxIds("V:1:3"), ["B:1:2", "B:1:3"]);
  assert.deepEqual(logic.getAdjacentBoxIds("V:9:9"), []);
  assert.equal(logic.isBoxClosed("B:0:0", ["H:0:0", "H:1:0", "V:0:0", "V:0:1"]), true);
  assert.equal(logic.isBoxClosed("B:0:0", ["H:0:0", "H:1:0", "V:0:0"]), false);
});

test("初态使用时间顺序 moves、moveNumber，并只允许 start 进入 playing", () => {
  const initial = logic.createInitialState({ playerNames: ["阿朱", "阿蓝"], composeResult() { return null; } });
  assert.deepEqual(initial.moves, []);
  assert.equal(initial.moveNumber, 0);
  assert.equal(Object.hasOwn(initial, "edges"), false);
  assert.equal(initial.phase, "intro");
  assert.equal(initial.currentPlayer, 0);
  assert.equal(logic.isDotsAndBoxesState(initial), true);
  assertDeepFrozen(initial);
  const started = logic.start(initial);
  assert.equal(started.phase, "playing");
  assert.equal(logic.start(started), started);
  assert.equal(logic.restart(started), started);
});

test("普通落边追加时间事件、增加 moveNumber 并严格换手", () => {
  const next = logic.claimEdge(playing(), "H:0:0");
  assert.deepEqual(next.moves, [{ edgeId: "H:0:0", player: 0 }]);
  assert.equal(next.moveNumber, 1);
  assert.equal(next.currentPlayer, 1);
  assert.deepEqual(next.scores, [0, 0]);
  assert.deepEqual(next.lastMove, {
    edgeId: "H:0:0", player: 0, capturedBoxIds: [], kind: "switch",
  });
  assert.equal(logic.isDotsAndBoxesState(next), true);
  assertDeepFrozen(next);
});

test("单格闭合加一分且得分方继续", () => {
  const before = claimAll(["H:0:0", "V:0:0", "V:0:1"]);
  const captured = logic.claimEdge(before, "H:1:0");
  assert.equal(captured.currentPlayer, 1);
  assert.deepEqual(captured.scores, [0, 1]);
  assert.equal(captured.boxes[0].owner, 1);
  assert.deepEqual(captured.lastMove, {
    edgeId: "H:1:0", player: 1, capturedBoxIds: ["B:0:0"], kind: "capture-one",
  });
});

test("V:0:1 一笔闭合双格、加二分且只追加一个事件", () => {
  const before = claimAll(["H:0:0", "H:1:0", "V:0:0", "H:0:1", "H:1:1", "V:0:2"]);
  const captured = logic.claimEdge(before, "V:0:1");
  assert.equal(captured.moveNumber, before.moveNumber + 1);
  assert.deepEqual(captured.moves.at(-1), { edgeId: "V:0:1", player: 0 });
  assert.equal(captured.currentPlayer, 0);
  assert.deepEqual(captured.scores, [2, 0]);
  assert.deepEqual(captured.boxes.slice(0, 2).map((box) => box.owner), [0, 0]);
  assert.deepEqual(captured.lastMove, {
    edgeId: "V:0:1", player: 0, capturedBoxIds: ["B:0:0", "B:0:1"], kind: "capture-two",
  });
});

test("重复、越界、错误阶段与非法动作保持同一引用", () => {
  const moved = logic.claimEdge(playing(), "H:0:0");
  for (const edgeId of ["H:0:0", "H:5:0", "V:0:5", "D:0:0", "B:0:0", "H:0:0:1", null]) {
    assert.equal(logic.claimEdge(moved, edgeId), moved);
  }
  const intro = logic.createInitialState();
  assert.equal(logic.claimEdge(intro, "H:0:0"), intro);
});

test("replayMoves 完整重放并拒绝错误 player、重复边和终局后追加", () => {
  const moves = [
    { edgeId: "H:0:0", player: 0 },
    { edgeId: "V:0:0", player: 1 },
    { edgeId: "V:0:1", player: 0 },
    { edgeId: "H:1:0", player: 1 },
  ];
  const replayed = logic.replayMoves(0, moves);
  assert.equal(replayed.moveNumber, 4);
  assert.deepEqual(replayed.scores, [0, 1]);
  assert.equal(replayed.currentPlayer, 1);
  assertDeepFrozen(replayed);
  moves[0].edgeId = "H:4:3";
  assert.equal(replayed.moves[0].edgeId, "H:0:0");
  assert.equal(logic.replayMoves(0, [{ edgeId: "H:0:0", player: 1 }]), null);
  assert.equal(logic.replayMoves(0, [
    { edgeId: "H:0:0", player: 0 }, { edgeId: "H:0:0", player: 1 },
  ]), null);
});

test("全部水平边后全部垂直边的确定轨迹终局为 8–8", () => {
  const order = horizontalThenVertical();
  const beforeFinal = claimAll(order.slice(0, -1));
  assert.equal(beforeFinal.phase, "playing");
  assert.equal(beforeFinal.moveNumber, 39);
  const finished = logic.claimEdge(beforeFinal, order.at(-1));
  assert.equal(finished.phase, "finished");
  assert.equal(finished.moveNumber, 40);
  assert.deepEqual(finished.scores, [8, 8]);
  assert.equal(finished.currentPlayer, finished.lastMove.player);
  assert.equal(finished.lastMove.kind, "finished");
  assert.equal(logic.isDotsAndBoxesState(finished), true);
});

test("确定性完整轨迹由重放派生唯一胜者和默认文案", () => {
  const order = [
    "H:0:1", "H:3:2", "V:1:4", "V:1:1", "V:0:1", "H:4:1", "H:1:2", "H:4:2",
    "V:0:3", "V:3:0", "H:0:3", "H:2:1", "V:2:1", "V:0:2", "V:1:0", "V:3:4",
    "H:2:3", "H:1:1", "V:2:3", "V:1:3", "V:1:2", "H:0:0", "H:4:0", "H:3:3",
    "V:2:4", "V:2:2", "H:3:0", "V:0:0", "H:2:0", "H:0:2", "H:1:3", "H:2:2",
    "V:3:1", "V:3:3", "V:2:0", "H:4:3", "H:1:0", "V:0:4", "V:3:2", "H:3:1",
  ];
  const finished = claimAll(order, {
    playerNames: ["阿朱", "阿蓝"], composeResult() { return null; },
  });
  assert.deepEqual(finished.scores, [6, 10]);
  assert.deepEqual(logic.getViewModel(finished).result, { winnerIndex: 1, isTie: false });
  assert.deepEqual(logic.resolveResultCopy(finished), {
    title: "阿蓝赢下这一页", body: "最后一格也有归属了。",
  });
});

test("完整重放拒绝伪造 box、score、currentPlayer、lastMove、phase 和 moveNumber", () => {
  const single = logic.claimEdge(playing(), "H:0:0");
  const captured = logic.claimEdge(claimAll(["H:0:0", "V:0:0", "V:0:1"]), "H:1:0");
  const malformed = [
    { ...single, moves: [{ edgeId: "H:0:0", player: 1 }] },
    { ...captured, boxes: captured.boxes.map((box, index) => index === 0 ? { ...box, owner: 0 } : box) },
    { ...captured, scores: [1, 0] },
    { ...single, currentPlayer: 0 },
    { ...captured, lastMove: { ...captured.lastMove, capturedBoxIds: [] } },
    { ...single, phase: "finished" },
    { ...single, moveNumber: 2 },
    { ...single, extra: true },
  ];
  for (const state of malformed) {
    assert.equal(logic.isDotsAndBoxesState(state), false);
    assert.deepEqual(logic.claimEdge(state, "H:0:1"), logic.createInitialState());
  }
});

test("view model 按规范顺序派生 edges，不共享 state 引用", () => {
  const state = claimAll(["H:1:0", "V:0:4", "H:0:1"]);
  assert.deepEqual(state.moves.map((move) => move.edgeId), ["H:1:0", "V:0:4", "H:0:1"]);
  const view = logic.getViewModel(state);
  assert.deepEqual(view.edges.map((edge) => edge.id), ["H:0:1", "V:0:4", "H:1:0"]);
  assert.equal(view.moveNumber, 3);
  assert.equal(view.remainingEdges, 37);
  assert.notEqual(view.playerNames, state.playerNames);
  assert.notEqual(view.scores, state.scores);
  assert.notEqual(view.boxes, state.boxes);
  assert.notEqual(view.lastMove, state.lastMove);
  assertDeepFrozen(view);
});

test("restart 清盘、轮换首发、保留名字并递增 revision", () => {
  const finished = claimAll(horizontalThenVertical(), {
    playerNames: ["小朱", "小蓝"], composeResult() { return null; },
  });
  const restarted = logic.restart(finished);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.starter, 1);
  assert.equal(restarted.currentPlayer, 1);
  assert.deepEqual(restarted.playerNames, ["小朱", "小蓝"]);
  assert.deepEqual(restarted.moves, []);
  assert.equal(restarted.moveNumber, 0);
  assert.ok(restarted.boxes.every((box) => box.owner === null));
  assert.deepEqual(restarted.scores, [0, 0]);
  assert.equal(restarted.lastMove, null);
  assert.equal(restarted.revision, finished.revision + 1);
  const secondFinished = claimAllFromState(logic.start(restarted), horizontalThenVertical());
  assert.equal(logic.restart(secondFinished).starter, 0);
});

test("终局文案接受冻结 formatter 上下文，非法与异常安全回退", () => {
  const tied = claimAll(horizontalThenVertical());
  assert.deepEqual(logic.resolveResultCopy(tied), {
    title: "这一页平分秋色", body: "最后一格落下，谁也没有少一分。",
  });
  let received;
  const custom = logic.resolveResultCopy(tied, {
    playerNames: ["朱方", "蓝方"],
    composeResult(context) {
      received = context;
      return { title: "今天也很默契", body: "八格对八格，下一页继续。" };
    },
  });
  assert.deepEqual(custom, { title: "今天也很默契", body: "八格对八格，下一页继续。" });
  assert.deepEqual(received, { winnerIndex: null, playerNames: ["朱方", "蓝方"], scores: [8, 8] });
  assertDeepFrozen(received);
  for (const composeResult of [
    () => null,
    () => { throw new Error("private copy failed"); },
    () => ({ title: "多字段", body: "回退", extra: true }),
    () => ({ title: "", body: "回退" }),
  ]) {
    assert.deepEqual(logic.resolveResultCopy(tied, { playerNames: ["朱方", "蓝方"], composeResult }), {
      title: "这一页平分秋色", body: "最后一格落下，谁也没有少一分。",
    });
  }
  assert.equal(logic.resolveResultCopy(playing()), null);
});

test("额外字段、敌意对象与非法嵌套安全回默认初态", () => {
  const getter = {};
  Object.defineProperty(getter, "phase", { get() { throw new Error("hostile getter"); } });
  assert.equal(logic.isDotsAndBoxesState(getter), false);
  assert.deepEqual(logic.start(getter), logic.createInitialState());
  assert.deepEqual(logic.restart(null), logic.createInitialState());
  const state = logic.claimEdge(playing(), "H:0:0");
  assert.equal(logic.isDotsAndBoxesState({ ...state, boxes: [{ id: "B:0:0", owner: null }] }), false);
  assert.equal(logic.replayMoves(0, [{ edgeId: "H:0:0", player: 0, extra: true }]), null);
});
