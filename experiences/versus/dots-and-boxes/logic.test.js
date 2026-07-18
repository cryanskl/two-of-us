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

function horizontalThenVertical() {
  const all = logic.getAllEdgeIds();
  return [...all.filter((id) => id.startsWith("H:")), ...all.filter((id) => id.startsWith("V:"))];
}

test("常量、规范 ID、视觉行优先顺序与模块递归冻结", () => {
  assert.equal(logic.BOARD_SIZE, 4);
  assert.equal(logic.DOT_COUNT, 5);
  assert.equal(logic.TOTAL_BOXES, 16);
  assert.equal(logic.TOTAL_EDGES, 40);
  assert.deepEqual(logic.PHASES, { INTRO: "intro", PLAYING: "playing", FINISHED: "finished" });
  assert.deepEqual(logic.getAllEdgeIds().slice(0, 10), [
    "H:0:0", "H:0:1", "H:0:2", "H:0:3",
    "V:0:0", "V:0:1", "V:0:2", "V:0:3", "V:0:4", "H:1:0",
  ]);
  assert.equal(new Set(logic.getAllEdgeIds()).size, 40);
  assert.equal(new Set(logic.getAllBoxIds()).size, 16);
  assertDeepFrozen(logic);
  assertDeepFrozen(configGlobal);
});

test("边与格 ID 严格拒绝越界、斜边和非规范格式", () => {
  assert.equal(logic.makeEdgeId("H", 4, 3), "H:4:3");
  assert.equal(logic.makeEdgeId("V", 3, 4), "V:3:4");
  assert.equal(logic.makeEdgeId("H", 5, 0), null);
  assert.equal(logic.makeEdgeId("V", 0, 5), null);
  assert.deepEqual(logic.parseEdgeId("H:2:3"), { orientation: "H", row: 2, column: 3 });
  assert.equal(logic.parseEdgeId("H:02:3"), null);
  assert.equal(logic.parseEdgeId("D:1:1"), null);
  assert.deepEqual(logic.parseBoxId("B:2:1"), { row: 2, column: 1 });
  assert.equal(logic.parseBoxId("B:2:01"), null);
});

test("配置执行精确白名单、Unicode 名字清洗、整份回退与所有权隔离", () => {
  const source = { playerNames: ["  小朱  ", "蓝蓝"], composeResult() { return null; } };
  const config = logic.sanitizeConfig(source);
  assert.deepEqual(config.playerNames, ["小朱", "蓝蓝"]);
  assert.notEqual(config.playerNames, source.playerNames);
  source.playerNames[0] = "篡改";
  assert.equal(config.playerNames[0], "小朱");
  assert.equal(logic.sanitizeConfig({ ...source, extra: true }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["同名", "同名"], composeResult() {} }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["一", "123456789"], composeResult() {} }), logic.DEFAULT_CONFIG);
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
});

test("初态精确使用 edges 与整数 moves，并只允许 start 进入 playing", () => {
  const initial = logic.createInitialState({ playerNames: ["阿朱", "阿蓝"], composeResult() { return null; } });
  assert.deepEqual(Object.keys(initial), [
    "phase", "starter", "currentPlayer", "playerNames", "edges", "boxes",
    "scores", "moves", "lastMove", "revision",
  ]);
  assert.deepEqual(initial.edges, []);
  assert.equal(initial.moves, 0);
  assert.equal(initial.phase, "intro");
  assert.equal(logic.isDotsAndBoxesState(initial), true);
  const started = logic.start(initial);
  assert.equal(started.phase, "playing");
  assert.equal(logic.start(started), started);
  assert.equal(logic.restart(started), started);
  assertDeepFrozen(started);
});

test("普通落边增加整数步数、保存规范 owner 并严格换手", () => {
  const next = logic.claimEdge(playing(), "H:0:0");
  assert.deepEqual(next.edges, [{ id: "H:0:0", owner: 0 }]);
  assert.equal(next.moves, 1);
  assert.equal(next.currentPlayer, 1);
  assert.deepEqual(next.scores, [0, 0]);
  assert.deepEqual(next.lastMove, {
    edgeId: "H:0:0", player: 0, capturedBoxIds: [], kind: "switch",
  });
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

test("内部共享边一笔闭合两格、加二分且只记一步", () => {
  const before = claimAll(["H:0:0", "H:1:0", "V:0:0", "H:0:1", "H:1:1", "V:0:2"]);
  const captured = logic.claimEdge(before, "V:0:1");
  assert.equal(captured.moves, before.moves + 1);
  assert.equal(captured.edges.filter((edge) => edge.id === "V:0:1").length, 1);
  assert.equal(captured.currentPlayer, 0);
  assert.deepEqual(captured.scores, [2, 0]);
  assert.deepEqual(captured.boxes.slice(0, 2).map((box) => box.owner), [0, 0]);
  assert.deepEqual(captured.lastMove.capturedBoxIds, ["B:0:0", "B:0:1"]);
  assert.equal(captured.lastMove.kind, "capture-two");
});

test("重复边、越界、斜边、未知 ID 与错误阶段返回原引用", () => {
  const moved = logic.claimEdge(playing(), "H:0:0");
  for (const edgeId of ["H:0:0", "H:5:0", "V:0:5", "D:0:0", "B:0:0", "H:0:0:1", null]) {
    assert.equal(logic.claimEdge(moved, edgeId), moved);
  }
  const intro = logic.createInitialState();
  assert.equal(logic.claimEdge(intro, "H:0:0"), intro);
});

test("完整合法轨迹在第 40 边终局并形成 8–8 平局", () => {
  const order = horizontalThenVertical();
  const beforeFinal = claimAll(order.slice(0, -1));
  assert.equal(beforeFinal.phase, "playing");
  assert.equal(beforeFinal.moves, 39);
  const finished = logic.claimEdge(beforeFinal, order.at(-1));
  assert.equal(finished.phase, "finished");
  assert.equal(finished.moves, 40);
  assert.equal(finished.edges.length, 40);
  assert.deepEqual(finished.scores, [8, 8]);
  assert.equal(logic.isDotsAndBoxesState(finished), true);
});

test("确定性乱序完整轨迹派生唯一胜者", () => {
  const order = [
    "H:0:1", "H:3:2", "V:1:4", "V:1:1", "V:0:1", "H:4:1", "H:1:2", "H:4:2",
    "V:0:3", "V:3:0", "H:0:3", "H:2:1", "V:2:1", "V:0:2", "V:1:0", "V:3:4",
    "H:2:3", "H:1:1", "V:2:3", "V:1:3", "V:1:2", "H:0:0", "H:4:0", "H:3:3",
    "V:2:4", "V:2:2", "H:3:0", "V:0:0", "H:2:0", "H:0:2", "H:1:3", "H:2:2",
    "V:3:1", "V:3:3", "V:2:0", "H:4:3", "H:1:0", "V:0:4", "V:3:2", "H:3:1",
  ];
  const finished = claimAll(order, { playerNames: ["阿朱", "阿蓝"], composeResult() { return null; } });
  assert.deepEqual(finished.scores, [6, 10]);
  assert.deepEqual(logic.getViewModel(finished).result, { winnerIndex: 1, isTie: false });
});

test("restart 清盘、轮换首发、保留名字并递增 revision", () => {
  const finished = claimAll(horizontalThenVertical(), { playerNames: ["甲", "乙"], composeResult() { return null; } });
  const restarted = logic.restart(finished);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.starter, 1);
  assert.equal(restarted.currentPlayer, 1);
  assert.deepEqual(restarted.playerNames, ["甲", "乙"]);
  assert.deepEqual(restarted.edges, []);
  assert.deepEqual(restarted.scores, [0, 0]);
  assert.equal(restarted.moves, 0);
  assert.ok(restarted.revision > finished.revision);
});

test("畸形、额外字段、伪分数、重复边和矛盾 owner 安全回默认初态", () => {
  const moved = logic.claimEdge(playing(), "H:0:0");
  const malformed = [
    { ...moved, extra: true },
    { ...moved, scores: [1, 0] },
    { ...moved, edges: [...moved.edges, moved.edges[0]], moves: 2 },
    { ...moved, edges: [{ id: "H:0:0", owner: 1 }] },
    Object.create(null, { phase: { get() { throw new Error("hostile"); } } }),
  ];
  for (const value of malformed) {
    const recovered = logic.claimEdge(value, "H:0:1");
    assert.equal(recovered.phase, "intro");
    assert.deepEqual(recovered.edges, []);
    assert.equal(recovered.moves, 0);
  }
});

test("view model 冻结、使用整数 moves 且不共享状态引用", () => {
  const state = logic.claimEdge(playing(), "H:0:0");
  const view = logic.getViewModel(state);
  assert.equal(view.moves, 1);
  assert.deepEqual(view.edges, [{ id: "H:0:0", owner: 0 }]);
  assert.notEqual(view.edges, state.edges);
  assert.notEqual(view.boxes, state.boxes);
  assert.equal(view.remainingEdges, 39);
  assert.equal(view.result, null);
  assertDeepFrozen(view);
});

test("终局文案支持安全定制并对 null、异常、额外字段和非法文本回退", () => {
  const finished = claimAll(horizontalThenVertical());
  const contextChecks = [];
  const custom = logic.resolveResultCopy(finished, {
    playerNames: ["朱方", "蓝方"],
    composeResult(context) {
      contextChecks.push(Object.isFrozen(context), Object.isFrozen(context.scores));
      return { title: "这一页刚刚好", body: "八格给你，八格给我。" };
    },
  });
  assert.deepEqual(custom, { title: "这一页刚刚好", body: "八格给你，八格给我。" });
  assert.deepEqual(contextChecks, [true, true]);
  for (const composeResult of [
    () => null,
    () => ({ title: "多字段", body: "不接受", extra: true }),
    () => ({ title: "", body: "空标题" }),
    () => { throw new Error("custom failure"); },
  ]) {
    assert.deepEqual(logic.resolveResultCopy(finished, { playerNames: ["朱方", "蓝方"], composeResult }), {
      title: "这一页平分秋色", body: "最后一格落下，谁也没有少一分。",
    });
  }
});

test("胜局默认文案使用权威状态中的获胜方名字", () => {
  const order = [
    "H:0:1", "H:3:2", "V:1:4", "V:1:1", "V:0:1", "H:4:1", "H:1:2", "H:4:2",
    "V:0:3", "V:3:0", "H:0:3", "H:2:1", "V:2:1", "V:0:2", "V:1:0", "V:3:4",
    "H:2:3", "H:1:1", "V:2:3", "V:1:3", "V:1:2", "H:0:0", "H:4:0", "H:3:3",
    "V:2:4", "V:2:2", "H:3:0", "V:0:0", "H:2:0", "H:0:2", "H:1:3", "H:2:2",
    "V:3:1", "V:3:3", "V:2:0", "H:4:3", "H:1:0", "V:0:4", "V:3:2", "H:3:1",
  ];
  const finished = claimAll(order, { playerNames: ["阿朱", "阿蓝"], composeResult() { return null; } });
  assert.deepEqual(logic.resolveResultCopy(finished), {
    title: "阿蓝赢下这一页", body: "最后一格也有归属了。",
  });
});
