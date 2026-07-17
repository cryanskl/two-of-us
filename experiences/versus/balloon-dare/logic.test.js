import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const {
  MIN_BURST_POINT,
  MAX_BURST_POINT,
  TOTAL_ROUNDS,
  TOTAL_TURNS,
  UINT32_ACCEPT_LIMIT,
  TURN_ORDER,
  createDareState,
  startMatch,
  beginTurn,
  pumpBalloon,
  bankTurn,
  advanceTurn,
  restartMatch,
  playerForTurn,
  roundForTurn,
  scoreForPumps,
  mapRandomToBurstPoint,
  winnerForScores,
} = globalThis.BALLOON_DARE_LOGIC;

function pumpingState(burstPoint = 8) {
  return beginTurn(startMatch(createDareState()), burstPoint);
}

function pumpTimes(state, count) {
  let current = state;
  for (let index = 0; index < count; index += 1) current = pumpBalloon(current);
  return current;
}

function bankAndAdvance(state, pumpCount, burstPoint = 8) {
  return advanceTurn(bankTurn(pumpTimes(beginTurn(state, burstPoint), pumpCount)));
}

test("初始状态与四轮先后手序列固定", () => {
  const state = createDareState();
  assert.deepEqual(state, {
    phase: "intro",
    turnIndex: 0,
    scores: [0, 0],
    pumps: 0,
    pending: 0,
    burstPoint: null,
    outcome: null,
  });
  assert.equal(TOTAL_ROUNDS, 4);
  assert.equal(TOTAL_TURNS, 8);
  assert.deepEqual(TURN_ORDER, [0, 1, 1, 0, 0, 1, 1, 0]);
  assert.deepEqual(Array.from({ length: TOTAL_TURNS }, (_, index) => playerForTurn(index)), TURN_ORDER);
  assert.deepEqual(Array.from({ length: TOTAL_TURNS }, (_, index) => roundForTurn(index)), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(playerForTurn(-1), null);
  assert.equal(roundForTurn(8), null);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.scores), true);
});

test("32 位随机值拒绝尾部余数并均匀映射到 4 至 8", () => {
  assert.equal(MIN_BURST_POINT, 4);
  assert.equal(MAX_BURST_POINT, 8);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(mapRandomToBurstPoint), [4, 5, 6, 7, 8, 4]);
  assert.equal(mapRandomToBurstPoint(UINT32_ACCEPT_LIMIT - 1), 8);
  assert.equal(mapRandomToBurstPoint(UINT32_ACCEPT_LIMIT), null);
  assert.equal(mapRandomToBurstPoint(-1), null);
  assert.equal(mapRandomToBurstPoint(1.5), null);
});

test("只有 handoff 接受合法爆点并进入 pumping", () => {
  const intro = createDareState();
  assert.strictEqual(beginTurn(intro, 6), intro);
  const handoff = startMatch(intro);
  assert.equal(handoff.phase, "handoff");
  assert.strictEqual(beginTurn(handoff, 3), handoff);
  assert.strictEqual(beginTurn(handoff, 9), handoff);
  const pumping = beginTurn(handoff, 6);
  assert.equal(pumping.phase, "pumping");
  assert.equal(pumping.burstPoint, 6);
  assert.strictEqual(startMatch(handoff), handoff);
});

test("前三泵安全且待收分按三角数增长", () => {
  let state = pumpingState(4);
  for (const [pumps, pending] of [[1, 1], [2, 3], [3, 6]]) {
    state = pumpBalloon(state);
    assert.equal(state.phase, "pumping");
    assert.equal(state.pumps, pumps);
    assert.equal(state.pending, pending);
    assert.equal(scoreForPumps(pumps), pending);
  }
  assert.equal(scoreForPumps(7), 28);
  assert.equal(scoreForPumps(8), 0);
});

test("达到爆点只清待收分，不倒扣总分且重复输入无效", () => {
  let state = pumpingState(4);
  state = pumpTimes(state, 4);
  assert.equal(state.phase, "burst");
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(state.pending, 0);
  assert.deepEqual(state.outcome, { type: "burst", playerIndex: 0, pumps: 4, lost: 6 });
  assert.strictEqual(pumpBalloon(state), state);
  assert.strictEqual(bankTurn(state), state);
});

test("零泵不能收手，收手只把待收分结算一次", () => {
  const empty = pumpingState();
  assert.strictEqual(bankTurn(empty), empty);
  const banked = bankTurn(pumpTimes(empty, 3));
  assert.equal(banked.phase, "banked");
  assert.deepEqual(banked.scores, [6, 0]);
  assert.deepEqual(banked.outcome, { type: "banked", playerIndex: 0, pumps: 3, points: 6 });
  assert.strictEqual(bankTurn(banked), banked);
  assert.strictEqual(pumpBalloon(banked), banked);
});

test("结果推进清除私有爆点并遵循对称换棒", () => {
  let state = startMatch(createDareState());
  state = bankAndAdvance(state, 1);
  assert.equal(state.phase, "handoff");
  assert.equal(state.turnIndex, 1);
  assert.equal(playerForTurn(state.turnIndex), 1);
  assert.equal(state.burstPoint, null);
  assert.equal(state.outcome, null);
  state = advanceTurn(pumpTimes(beginTurn(state, 4), 4));
  assert.equal(state.turnIndex, 2);
  assert.equal(playerForTurn(state.turnIndex), 1);
  assert.deepEqual(state.scores, [1, 0]);
});

test("八个回合全部完成后才比较胜负并支持平局", () => {
  let coralWins = startMatch(createDareState());
  for (let turnIndex = 0; turnIndex < TOTAL_TURNS; turnIndex += 1) {
    const player = playerForTurn(turnIndex);
    coralWins = bankAndAdvance(coralWins, player === 0 ? 2 : 1);
  }
  assert.equal(coralWins.phase, "complete");
  assert.deepEqual(coralWins.scores, [12, 4]);
  assert.equal(winnerForScores(coralWins.scores), 0);
  assert.strictEqual(advanceTurn(coralWins), coralWins);

  let tie = startMatch(createDareState());
  for (let turnIndex = 0; turnIndex < TOTAL_TURNS; turnIndex += 1) tie = bankAndAdvance(tie, 1);
  assert.equal(tie.phase, "complete");
  assert.deepEqual(tie.scores, [4, 4]);
  assert.equal(winnerForScores(tie.scores), "tie");
  assert.equal(winnerForScores([3, 5]), 1);
});

test("畸形状态、非法阶段与调用方数组保持安全", () => {
  const state = pumpingState();
  assert.deepEqual(pumpBalloon({ ...state, scores: [Number.NaN, 0] }), createDareState());
  assert.deepEqual(bankTurn({ ...state, burstPoint: 99 }), createDareState());
  assert.deepEqual(advanceTurn({ ...state, outcome: { type: "bad" } }), createDareState());
  assert.deepEqual(restartMatch(), createDareState());
  assert.notStrictEqual(restartMatch(), restartMatch());
  assert.equal(Object.isFrozen(pumpBalloon(state).scores), true);
});
