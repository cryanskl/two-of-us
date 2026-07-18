import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.PAPER_SOCCER_LOGIC;

function playing(config) {
  return logic.start(logic.createInitialState(config));
}

function playPath(points, config) {
  let state = playing(config);
  for (const point of points) state = logic.move(state, point);
  return state;
}

test("经典球场、方向、球门与无向边 key 稳定", () => {
  assert.equal(logic.FIELD_WIDTH, 8);
  assert.equal(logic.FIELD_HEIGHT, 10);
  assert.deepEqual(logic.CENTER, { x: 4, y: 5 });
  assert.deepEqual(logic.TOP_GOAL, { x: 4, y: -1 });
  assert.deepEqual(logic.BOTTOM_GOAL, { x: 4, y: 11 });
  assert.deepEqual(logic.DIRECTIONS.map(({ id, key }) => [id, key]), [
    ["nw", "q"], ["n", "w"], ["ne", "e"], ["w", "a"],
    ["e", "d"], ["sw", "z"], ["s", "x"], ["se", "c"],
  ]);
  assert.equal(logic.edgeKey({ x: 2, y: 3 }, { x: 1, y: 2 }), "1,2|2,3");
  assert.equal(logic.edgeKey({ x: 1, y: 2 }, { x: 2, y: 3 }), "1,2|2,3");
  assert.equal(logic.directionForKey("Q"), "nw");
  assert.equal(logic.directionForKey("?"), null);
});

test("配置整份回退、去空白且状态和调用方所有权隔离", () => {
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG));
  const source = {
    redName: "  小红  ",
    blueName: " 小蓝 ",
    firstPlayer: "blue",
    chooseNextStarter() { return "red"; },
  };
  const config = logic.sanitizeConfig(source);
  assert.deepEqual(config, { redName: "小红", blueName: "小蓝", firstPlayer: "blue" });
  source.redName = "被修改";
  assert.equal(config.redName, "小红");
  assert.equal(logic.sanitizeConfig({ ...source, blueName: "被修改" }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ ...source, chooseNextStarter: "alternate" }), logic.DEFAULT_CONFIG);

  const initial = logic.createInitialState(config);
  assert.equal(initial.currentPlayer, "blue");
  assert.ok(Object.isFrozen(initial));
  assert.ok(Object.isFrozen(initial.ball));
  assert.ok(Object.isFrozen(initial.edges));
  assert.ok(Object.isFrozen(initial.scores));
});

test("中心有八个合法方向，普通新点换手且状态递归冻结", () => {
  const initial = playing();
  assert.deepEqual(logic.getLegalMoves(initial).map((move) => move.id), logic.DIRECTIONS.map((direction) => direction.id));
  assert.ok(logic.getLegalMoves(initial).every((move) => move.bounces === false));

  const target = { x: 4, y: 4 };
  const moved = logic.move(initial, target);
  target.x = 99;
  assert.equal(moved.currentPlayer, "blue");
  assert.equal(moved.turnNumber, 2);
  assert.equal(moved.moveNumber, 1);
  assert.equal(moved.bounceChain, 0);
  assert.deepEqual(moved.ball, { x: 4, y: 4 });
  assert.ok(Object.isFrozen(moved.edges[0]));
  assert.ok(Object.isFrozen(moved.edges[0].from));
  assert.ok(Object.isFrozen(moved.lastMove));
});

test("重复边、反向重复、外边线、越界和非法阶段都被拒绝", () => {
  let state = playing();
  const moved = logic.move(state, { x: 4, y: 4 });
  const returned = logic.move(moved, { x: 4, y: 5 });
  assert.equal(returned, moved);
  assert.equal(logic.move(moved, { x: 10, y: 4 }), moved);
  const intro = logic.createInitialState();
  assert.equal(logic.move(intro, { x: 4, y: 4 }), intro);

  state = playPath([{ x: 3, y: 4 }, { x: 2, y: 3 }, { x: 1, y: 2 }, { x: 0, y: 1 }]);
  assert.equal(state.ball.x, 0);
  const ids = logic.getLegalMoves(state).map((move) => move.id);
  assert.ok(!ids.includes("n"));
  assert.ok(!ids.includes("s"));
});

test("回到旧点由落笔前状态判定借力并保持同一玩家", () => {
  const state = playPath([
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 4, y: 5 },
  ]);
  assert.equal(state.currentPlayer, "red");
  assert.equal(state.turnNumber, 3);
  assert.equal(state.moveNumber, 3);
  assert.equal(state.bounceChain, 1);
  assert.equal(state.lastMove.bounced, true);
  assert.deepEqual(state.ball, logic.CENTER);
});

test("边界触发借力，球门口只开放三条正确入网线", () => {
  let state = playPath([
    { x: 4, y: 4 },
    { x: 4, y: 3 },
    { x: 4, y: 2 },
    { x: 4, y: 1 },
    { x: 4, y: 0 },
  ]);
  assert.equal(state.currentPlayer, "red");
  assert.equal(state.lastMove.bounced, true);
  const goalMove = logic.getLegalMoves(state).find((move) => move.id === "n");
  assert.deepEqual(goalMove.target, logic.TOP_GOAL);
  assert.equal(goalMove.bounces, false);

  state = playPath([
    { x: 3, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 0 },
  ]);
  assert.deepEqual(logic.getLegalMoves(state).find((move) => move.id === "ne")?.target, logic.TOP_GOAL);
});

test("进上方球门红方获胜，红方踢进下方球门按乌龙计蓝方", () => {
  let top = playPath([
    { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 0 }, logic.TOP_GOAL,
  ]);
  assert.equal(top.phase, "complete");
  assert.equal(top.winner, "red");
  assert.equal(top.winReason, "goal");
  assert.deepEqual(top.scores, { red: 1, blue: 0 });

  const bottom = playPath([
    { x: 4, y: 6 }, { x: 4, y: 7 }, { x: 4, y: 8 }, { x: 4, y: 9 }, { x: 4, y: 10 }, logic.BOTTOM_GOAL,
  ]);
  assert.equal(bottom.phase, "complete");
  assert.equal(bottom.currentPlayer, "red");
  assert.equal(bottom.winner, "blue");
  assert.deepEqual(bottom.scores, { red: 0, blue: 1 });
});

test("进入只有来路的角点会借力后自困，胜局计给对方", () => {
  const trapped = playPath([
    { x: 3, y: 4 },
    { x: 2, y: 3 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
    { x: 0, y: 0 },
  ]);
  assert.equal(trapped.phase, "complete");
  assert.equal(trapped.currentPlayer, "red");
  assert.equal(trapped.winner, "blue");
  assert.equal(trapped.winReason, "trap");
  assert.equal(trapped.lastMove.bounced, true);
  assert.deepEqual(logic.getLegalMoves(trapped), []);
});

test("开球策略获得冻结上下文，异常和非法返回统一交替", () => {
  const context = { previousStarter: "red", winner: "blue", winReason: "trap", matchNumber: 2 };
  assert.equal(logic.resolveNextStarter(null, context), "blue");
  assert.equal(logic.resolveNextStarter(() => "red", context), "red");
  assert.equal(logic.resolveNextStarter(() => "nobody", context), "blue");
  assert.equal(logic.resolveNextStarter(() => { throw new Error("policy"); }, context), "blue");
  assert.equal(logic.resolveNextStarter((safe) => {
    assert.ok(Object.isFrozen(safe));
    safe.matchNumber = 99;
    return "red";
  }, context), "blue");
  assert.equal(context.matchNumber, 2);
});

test("再赛保留胜局并清空轨迹，重置系列回到配置开球者", () => {
  const complete = playPath([
    { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 0 }, logic.TOP_GOAL,
  ]);
  const rematch = logic.rematch(complete, "blue");
  assert.equal(rematch.phase, "playing");
  assert.equal(rematch.currentPlayer, "blue");
  assert.equal(rematch.matchNumber, 2);
  assert.equal(rematch.revision, complete.revision + 1);
  assert.deepEqual(rematch.scores, { red: 1, blue: 0 });
  assert.deepEqual(rematch.edges, []);
  assert.equal(logic.rematch(rematch, "red"), rematch);

  const reset = logic.resetSeries(complete, "blue");
  assert.equal(reset.phase, "intro");
  assert.equal(reset.starter, "blue");
  assert.deepEqual(reset.scores, { red: 0, blue: 0 });
  assert.equal(reset.revision, complete.revision + 1);
});

test("畸形状态安全回初始状态，合法状态的非法操作保持原引用", () => {
  const state = playing();
  assert.equal(logic.move(state, { x: 4, y: 8 }), state);
  assert.equal(logic.start(state), state);
  assert.equal(logic.resetSeries(state), state);
  assert.equal(logic.isGameState({ ...state, moveNumber: 8 }), false);
  assert.deepEqual(logic.move({ ...state, moveNumber: 8 }, { x: 4, y: 4 }), logic.createInitialState());
  assert.deepEqual(logic.start(null), logic.createInitialState());
});
