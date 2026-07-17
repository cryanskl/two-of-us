import assert from "node:assert/strict";
import test from "node:test";

await import("./logic.js");
const logic = globalThis.NUMBER_TARGET_LOGIC;

function fixedPlan(target = 42, numbers = [2, 3, 4, 6, 7, 8, 9, 11]) {
  return { target, numbers };
}

function finishRound(state) {
  let current = state;
  while (current.phase === "drafting") {
    const kind = logic.kindForStep(current.stepIndex);
    current = kind === "operator"
      ? logic.pickOperator(current, current.availableOperators[0])
      : logic.pickNumber(current, current.availableNumbers[0]);
  }
  return current;
}

test("初始状态、常量与无偏 32 位索引边界稳定", () => {
  const state = logic.createInitialState();
  assert.equal(state.phase, "intro");
  assert.deepEqual([...state.scores], [0, 0]);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.hands[0]), true);
  assert.deepEqual(logic.PLAYERS.map((player) => player.name), ["珊瑚方", "蓝方"]);
  assert.equal(logic.mapUint32ToIndex(0, 3), 0);
  assert.equal(logic.mapUint32ToIndex(4294967294, 3), 2);
  assert.equal(logic.mapUint32ToIndex(4294967295, 3), null);
  assert.equal(logic.mapUint32ToIndex(4294967295, 4), 3);
  assert.equal(logic.mapUint32ToIndex(-1, 3), null);
});

test("生成八张唯一数字且目标必在范围内并可由市场精确到达", () => {
  let call = 0;
  const plan = logic.createRoundPlan((max) => (call++ * 5 + 2) % max);
  assert.equal(logic.isValidRoundPlan(plan), true);
  assert.equal(plan.numbers.length, 8);
  assert.equal(new Set(plan.numbers).size, 8);
  assert.ok(plan.numbers.every((number) => number >= 1 && number <= 12));
  assert.ok(plan.target >= 10 && plan.target <= 81);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.numbers), true);

  const reachable = plan.numbers.some((left, leftIndex) => plan.numbers.some((right, rightIndex) => {
    if (leftIndex === rightIndex) return false;
    return [left + right, left - right, left * right].includes(plan.target);
  }));
  assert.equal(reachable, true);
});

test("非法随机索引与不可达题面被拒绝", () => {
  assert.equal(logic.createRoundPlan(() => -1), null);
  assert.equal(logic.createRoundPlan(() => 999), null);
  assert.equal(logic.isValidRoundPlan(fixedPlan(80, [1, 2, 3, 4, 5, 6, 7, 8])), false);
  assert.equal(logic.isValidRoundPlan({ target: 10, numbers: [1, 1, 2, 3, 4, 5, 6, 7] }), false);
});

test("两种开局方都遵守数字、运算符、数字的六步蛇形顺序", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((step) => logic.kindForStep(step)), [
    "first-number", "first-number", "operator", "operator", "second-number", "second-number",
  ]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((step) => logic.turnForStep(0, step)), [0, 1, 1, 0, 0, 1]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((step) => logic.turnForStep(1, step)), [1, 0, 0, 1, 1, 0]);
  assert.equal(logic.turnForStep(2, 0), null);
  assert.equal(logic.kindForStep(6), null);
});

test("牌种 Gate、共享牌唯一消费和表达式左右顺序稳定", () => {
  let state = logic.startMatch(logic.createInitialState(), fixedPlan(), 0);
  assert.equal(state.phase, "drafting");
  assert.equal(logic.pickOperator(state, "+"), state);
  state = logic.pickNumber(state, 8);
  assert.equal(state.hands[0].left, 8);
  assert.equal(state.availableNumbers.includes(8), false);
  assert.equal(logic.pickNumber(state, 8), state);
  state = logic.pickNumber(state, 6);
  assert.equal(logic.pickNumber(state, 4), state);
  state = logic.pickOperator(state, "*");
  assert.equal(state.hands[1].operator, "*");
  assert.equal(logic.pickOperator(state, "*"), state);
  state = logic.pickOperator(state, "+");
  state = logic.pickNumber(state, 4);
  state = logic.pickNumber(state, 7);
  assert.equal(state.phase, "round-result");
  assert.deepEqual([...state.roundResult.values], [12, 42]);
  assert.deepEqual([...state.scores], [0, 1]);
});

test("加减乘、负结果、精确命中、普通胜与等距平局正确", () => {
  assert.equal(logic.evaluateHand({ left: 8, operator: "+", right: 4 }), 12);
  assert.equal(logic.evaluateHand({ left: 3, operator: "-", right: 9 }), -6);
  assert.equal(logic.evaluateHand({ left: 6, operator: "*", right: 7 }), 42);

  const exact = logic.scoreRound(42, [
    { left: 6, operator: "*", right: 7 },
    { left: 9, operator: "+", right: 11 },
  ]);
  assert.equal(exact.winner, 0);
  assert.deepEqual([...exact.distances], [0, 22]);
  assert.deepEqual([...exact.exact], [true, false]);

  const tie = logic.scoreRound(10, [
    { left: 8, operator: "+", right: 4 },
    { left: 3, operator: "*", right: 4 },
  ]);
  assert.equal(tie.winner, null);
  assert.deepEqual([...tie.distances], [2, 2]);
});

test("第六次合法选择只结算一次，结果阶段重复输入保持引用", () => {
  const result = finishRound(logic.startMatch(logic.createInitialState(), fixedPlan(), 1));
  assert.equal(result.phase, "round-result");
  const scores = [...result.scores];
  assert.equal(logic.pickNumber(result, result.availableNumbers[0]), result);
  assert.equal(logic.pickOperator(result, result.availableOperators[0]), result);
  assert.deepEqual([...result.scores], scores);
  assert.equal(Object.isFrozen(result.roundResult), true);
});

test("三局开局方交替、比分保留且第三局后才显示整场结果", () => {
  let state = finishRound(logic.startMatch(logic.createInitialState(), fixedPlan(), 1));
  const firstScores = [...state.scores];
  state = logic.nextRound(state, fixedPlan(20, [1, 2, 3, 4, 5, 6, 9, 11]));
  assert.equal(state.roundIndex, 1);
  assert.equal(state.starter, 0);
  assert.deepEqual([...state.scores], firstScores);
  state = finishRound(state);
  state = logic.nextRound(state, fixedPlan(24, [1, 2, 3, 4, 6, 8, 9, 12]));
  assert.equal(state.roundIndex, 2);
  assert.equal(state.starter, 1);
  state = finishRound(state);
  assert.equal(logic.nextRound(state, fixedPlan()), state);
  state = logic.showMatchResult(state);
  assert.equal(state.phase, "match-result");
  assert.equal(logic.showMatchResult(state), state);
});

test("重赛清空全部状态，畸形状态安全且不修改调用方题面", () => {
  const plan = fixedPlan();
  let state = logic.startMatch(logic.createInitialState(), plan, 0);
  assert.deepEqual(plan, fixedPlan());
  state = finishRound(state);
  state = logic.nextRound(state, fixedPlan(20, [1, 2, 3, 4, 5, 6, 9, 11]));
  state = finishRound(state);
  state = logic.nextRound(state, fixedPlan(24, [1, 2, 3, 4, 6, 8, 9, 12]));
  state = logic.showMatchResult(finishRound(state));
  const restarted = logic.restartMatch(state);
  assert.equal(restarted.phase, "intro");
  assert.deepEqual([...restarted.scores], [0, 0]);
  assert.equal(logic.pickNumber({ phase: "drafting" }, 2).phase, "intro");
  assert.equal(logic.pickNumber({
    ...logic.createInitialState(),
    availableNumbers: undefined,
  }, 2).phase, "intro");
  assert.equal(logic.nextRound({ phase: "round-result" }, plan).phase, "intro");
});
