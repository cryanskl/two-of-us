import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.DOTS_AND_BOXES_LOGIC;

function playing(config) {
  return logic.start(logic.createInitialState(config));
}

function claimAll(edgeIds, config) {
  let state = playing(config);
  for (const edgeId of edgeIds) state = logic.claimEdge(state, edgeId);
  return state;
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

test("常量、规范 ID、视觉行优先顺序与模块递归冻结", () => {
  assert.equal(logic.BOARD_SIZE, 4);
  assert.equal(logic.DOT_COUNT, 5);
  assert.equal(logic.TOTAL_BOXES, 16);
  assert.equal(logic.TOTAL_EDGES, 40);
  assert.deepEqual(logic.PHASES, { INTRO: "intro", PLAYING: "playing", FINISHED: "finished" });

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
  assertDeepFrozen(logic);
  assertDeepFrozen(edges);
  assertDeepFrozen(boxes);
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

test("配置执行精确白名单、Unicode 名字清洗、整份回退与所有权隔离", () => {
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
  assertDeepFrozen(logic.DEFAULT_CONFIG);
});

test("每格四边与每边邻格按固定方位返回", () => {
  assert.deepEqual(logic.getBoxEdgeIds("B:0:0"), ["H:0:0", "H:1:0", "V:0:0", "V:0:1"]);
  assert.deepEqual(logic.getBoxEdgeIds("B:3:3"), ["H:3:3", "H:4:3", "V:3:3", "V:3:4"]);
  assert.deepEqual(logic.getBoxEdgeIds("B:4:0"), []);
  assert.deepEqual(logic.getAdjacentBoxIds("H:0:2"), ["B:0:2"]);
  assert.deepEqual(logic.getAdjacentBoxIds("H:2:2"), ["B:1:2", "B:2:2"]);
  assert.deepEqual(logic.getAdjacentBoxIds("V:1:0"), ["B:1:0"]);
  assert.deepEqual(logic.getAdjacentBoxIds("V:1:3"), ["B:1:2", "B:1:3"]);
  assert.deepEqual(logic.getAdjacentBoxIds("V:9:9"), []);
  assert.equal(logic.isBoxClosed("B:0:0", ["H:0:0", "H:1:0", "V:0:0", "V:0:1"]), true);
  assert.equal(logic.isBoxClosed("B:0:0", ["H:0:0", "H:1:0", "V:0:0"]), false);
});

test("初态、开始动作与错误阶段保持合同", () => {
  const initial = logic.createInitialState({ playerNames: ["阿朱", "阿蓝"], composeResult() { return null; } });
  assert.equal(initial.phase, "intro");
  assert.equal(initial.starter, 0);
  assert.equal(initial.currentPlayer, 0);
  assert.deepEqual(initial.playerNames, ["阿朱", "阿蓝"]);
  assert.equal(initial.boxes.length, 16);
  assert.ok(initial.boxes.every((box) => box.owner === null));
  assert.equal(logic.isDotsAndBoxesState(initial), true);
  assertDeepFrozen(initial);

  const started = logic.start(initial);
  assert.equal(started.phase, "playing");
  assert.equal(started.revision, initial.revision + 1);
  assert.equal(logic.start(started), started);
  assert.equal(logic.restart(started), started);
});

test("普通落边只增加一步并严格换手", () => {
  const state = playing();
  const next = logic.claimEdge(state, "H:0:0");
  assert.equal(next.phase, "playing");
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.moves, 1);
  assert.deepEqual(next.edges, [{ id: "H:0:0", owner: 0 }]);
  assert.deepEqual(next.scores, [0, 0]);
  assert.deepEqual(next.lastMove, {
    edgeId: "H:0:0", player: 0, capturedBoxIds: [], kind: "switch",
  });
  assert.equal(logic.isDotsAndBoxesState(next), true);
  assertDeepFrozen(next);
});

test("单格闭合加一分且得分方继续", () => {
  const before = claimAll(["H:0:0", "V:0:0", "V:0:1"]);
  assert.equal(before.currentPlayer, 1);
  const captured = logic.claimEdge(before, "H:1:0");
  assert.equal(captured.currentPlayer, 1);
  assert.deepEqual(captured.scores, [0, 1]);
  assert.equal(captured.boxes[0].owner, 1);
  assert.deepEqual(captured.lastMove, {
    edgeId: "H:1:0", player: 1, capturedBoxIds: ["B:0:0"], kind: "capture-one",
  });
  assert.equal(logic.isDotsAndBoxesState(captured), true);
});

test("内部共享边一笔闭合两格、加二分且只记一步", () => {
  const before = claimAll(["H:0:0", "H:1:0", "V:0:0", "H:0:1", "H:1:1", "V:0:2"]);
  const captured = logic.claimEdge(before, "V:0:1");
  assert.equal(captured.moves, before.moves + 1);
  assert.equal(captured.edges.length, before.edges.length + 1);
  assert.equal(captured.currentPlayer, 0);
  assert.deepEqual(captured.scores, [2, 0]);
  assert.deepEqual(captured.boxes.slice(0, 2).map((box) => box.owner), [0, 0]);
  assert.deepEqual(captured.lastMove, {
    edgeId: "V:0:1", player: 0, capturedBoxIds: ["B:0:0", "B:0:1"], kind: "capture-two",
  });
});

test("重复边、越界、斜边、未知 ID 与错误阶段返回原引用", () => {
  const state = playing();
  const moved = logic.claimEdge(state, "H:0:0");
  for (const edgeId of ["H:0:0", "H:5:0", "V:0:5", "D:0:0", "B:0:0", "H:0:0:1", null]) {
    assert.equal(logic.claimEdge(moved, edgeId), moved);
  }
  const intro = logic.createInitialState();
  assert.equal(logic.claimEdge(intro, "H:0:0"), intro);
});

test("完整合法轨迹在第 40 边终局并形成 8–8 平局", () => {
  const edgeIds = logic.getAllEdgeIds();
  const beforeFinal = claimAll(edgeIds.slice(0, -1));
  assert.equal(beforeFinal.phase, "playing");
  assert.equal(beforeFinal.moves, 39);
  const finished = logic.claimEdge(beforeFinal, edgeIds.at(-1));
  assert.equal(finished.phase, "finished");
  assert.equal(finished.moves, 40);
  assert.equal(finished.edges.length, 40);
  assert.equal(finished.boxes.filter((box) => box.owner !== null).length, 16);
  assert.deepEqual(finished.scores, [8, 8]);
  assert.equal(finished.scores[0] + finished.scores[1], 16);
  assert.equal(finished.currentPlayer, finished.lastMove.player);
  assert.equal(finished.lastMove.kind, "finished");
  assert.equal(logic.isDotsAndBoxesState(finished), true);
});

test("确定性乱序完整轨迹派生唯一胜者", () => {
  const edgeIds = [
    "H:0:1", "H:3:2", "V:1:4", "V:1:1", "V:0:1", "H:4:1", "H:1:2", "H:4:2",
    "V:0:3", "V:3:0", "H:0:3", "H:2:1", "V:2:1", "V:0:2", "V:1:0", "V:3:4",
    "H:2:3", "H:1:1", "V:2:3", "V:1:3", "V:1:2", "H:0:0", "H:4:0", "H:3:3",
    "V:2:4", "V:2:2", "H:3:0", "V:0:0", "H:2:0", "H:0:2", "H:1:3", "H:2:2",
    "V:3:1", "V:3:3", "V:2:0", "H:4:3", "H:1:0", "V:0:4", "V:3:2", "H:3:1",
  ];
  const finished = claimAll(edgeIds);
  assert.deepEqual(finished.scores, [6, 10]);
  assert.deepEqual(logic.getViewModel(finished).result, { winnerIndex: 1, isTie: false });
});

test("restart 清盘、轮换首发、保留名字并递增 revision", () => {
  const finished = claimAll(logic.getAllEdgeIds(), {
    playerNames: ["小朱", "小蓝"], composeResult() { return null; },
  });
  const restarted = logic.restart(finished);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.starter, 1);
  assert.equal(restarted.currentPlayer, 1);
  assert.deepEqual(restarted.playerNames, ["小朱", "小蓝"]);
  assert.deepEqual(restarted.edges, []);
  assert.ok(restarted.boxes.every((box) => box.owner === null));
  assert.deepEqual(restarted.scores, [0, 0]);
  assert.equal(restarted.moves, 0);
  assert.equal(restarted.lastMove, null);
  assert.equal(restarted.revision, finished.revision + 1);

  const second = logic.restart(claimAllFromState(logic.start(restarted), logic.getAllEdgeIds()));
  assert.equal(second.starter, 0);
});

test("畸形、额外字段、伪分数、重复边和矛盾 owner 安全回默认初态", () => {
  const state = logic.claimEdge(playing(), "H:0:0");
  const malformed = [
    { ...state, extra: true },
    { ...state, scores: [9, 0] },
    { ...state, edges: [...state.edges, state.edges[0]], moves: 2 },
    { ...state, boxes: state.boxes.map((box, index) => index === 0 ? { ...box, owner: 0 } : box), scores: [1, 0] },
    { ...state, lastMove: { ...state.lastMove, player: 1 } },
  ];
  for (const hostile of malformed) {
    assert.equal(logic.isDotsAndBoxesState(hostile), false);
    assert.deepEqual(logic.claimEdge(hostile, "H:0:1"), logic.createInitialState());
  }
  const getter = {};
  Object.defineProperty(getter, "phase", { get() { throw new Error("hostile getter"); } });
  assert.equal(logic.isDotsAndBoxesState(getter), false);
  assert.deepEqual(logic.start(getter), logic.createInitialState());
  assert.deepEqual(logic.restart(null), logic.createInitialState());
});

test("view model 冻结且不共享状态引用", () => {
  const state = logic.claimEdge(playing(), "H:0:0");
  const view = logic.getViewModel(state);
  assert.deepEqual({
    phase: view.phase,
    currentPlayerName: view.currentPlayerName,
    remainingBoxes: view.remainingBoxes,
    remainingEdges: view.remainingEdges,
    controlsDisabled: view.controlsDisabled,
  }, {
    phase: "playing", currentPlayerName: "蓝方", remainingBoxes: 16, remainingEdges: 39, controlsDisabled: false,
  });
  assert.equal(view.result, null);
  assert.notEqual(view.playerNames, state.playerNames);
  assert.notEqual(view.scores, state.scores);
  assert.notEqual(view.edges, state.edges);
  assert.notEqual(view.edges[0], state.edges[0]);
  assert.notEqual(view.boxes, state.boxes);
  assertDeepFrozen(view);
});

test("终局文案支持安全定制并对 null、异常、额外字段和非法文本回退", () => {
  const tied = claimAll(logic.getAllEdgeIds());
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
  assertDeepFrozen(custom);

  const fallbacks = [
    () => null,
    () => { throw new Error("private copy failed"); },
    () => ({ title: "有额外字段", body: "应回退。", extra: true }),
    () => ({ title: "", body: "应回退。" }),
    () => ({ title: "标题", body: "x".repeat(61) }),
  ];
  for (const composeResult of fallbacks) {
    assert.deepEqual(logic.resolveResultCopy(tied, { playerNames: ["朱方", "蓝方"], composeResult }), {
      title: "这一页平分秋色", body: "最后一格落下，谁也没有少一分。",
    });
  }
  assert.equal(logic.resolveResultCopy(playing()), null);
});

test("胜局默认文案使用权威状态中的获胜方名字", () => {
  const edgeIds = [
    "H:0:1", "H:3:2", "V:1:4", "V:1:1", "V:0:1", "H:4:1", "H:1:2", "H:4:2",
    "V:0:3", "V:3:0", "H:0:3", "H:2:1", "V:2:1", "V:0:2", "V:1:0", "V:3:4",
    "H:2:3", "H:1:1", "V:2:3", "V:1:3", "V:1:2", "H:0:0", "H:4:0", "H:3:3",
    "V:2:4", "V:2:2", "H:3:0", "V:0:0", "H:2:0", "H:0:2", "H:1:3", "H:2:2",
    "V:3:1", "V:3:3", "V:2:0", "H:4:3", "H:1:0", "V:0:4", "V:3:2", "H:3:1",
  ];
  const finished = claimAll(edgeIds, {
    playerNames: ["阿朱", "阿蓝"], composeResult() { return null; },
  });
  assert.deepEqual(logic.resolveResultCopy(finished), {
    title: "阿蓝赢下这一页", body: "最后一格也有归属了。",
  });
});

function claimAllFromState(state, edgeIds) {
  let current = state;
  for (const edgeId of edgeIds) current = logic.claimEdge(current, edgeId);
  return current;
}
