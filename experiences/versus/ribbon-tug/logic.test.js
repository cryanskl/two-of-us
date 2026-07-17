import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const {
  DEFAULT_ROUND_COUNTDOWN_MS,
  RESUME_COUNTDOWN_MS,
  PULL_DISTANCE,
  RETURN_RATE_PER_SECOND,
  MAX_PULLS_PER_STEP,
  createMatchState,
  startRound,
  advanceMatch,
  pauseMatch,
  resumeMatch,
  resetMatch,
  classifyPullKey,
} = globalThis.RIBBON_TUG_LOGIC;

const STEP_MS = 1000 / 60;

function playingState(countdownMs = 0) {
  let state = startRound(createMatchState(), countdownMs);
  return advanceMatch(state, { elapsedMs: countdownMs });
}

function pullUntilRoundEnds(state, side) {
  let current = state;
  while (current.phase === "playing") {
    current = advanceMatch(current, {
      elapsedMs: STEP_MS,
      leftPulls: side === "left" ? MAX_PULLS_PER_STEP : 0,
      rightPulls: side === "right" ? MAX_PULLS_PER_STEP : 0,
    });
  }
  return current;
}

test("初始状态完整、冻结且重置得到新的 idle 状态", () => {
  const initial = createMatchState();
  assert.deepEqual(initial, {
    phase: "idle",
    position: 0,
    leftScore: 0,
    rightScore: 0,
    roundNumber: 0,
    countdownMs: 0,
    lastWinner: null,
    pauseReason: null,
  });
  assert.equal(Object.isFrozen(initial), true);
  assert.deepEqual(resetMatch(), initial);
  assert.notStrictEqual(resetMatch(), initial);
});

test("开局进入默认倒计时，倒计时走完才进入 playing", () => {
  const initial = createMatchState();
  const countdown = startRound(initial);
  assert.equal(countdown.phase, "countdown");
  assert.equal(countdown.roundNumber, 1);
  assert.equal(countdown.countdownMs, DEFAULT_ROUND_COUNTDOWN_MS);

  const nearlyReady = advanceMatch(countdown, { elapsedMs: DEFAULT_ROUND_COUNTDOWN_MS - 1 });
  assert.equal(nearlyReady.phase, "countdown");
  assert.equal(nearlyReady.countdownMs, 1);
  const ready = advanceMatch(nearlyReady, { elapsedMs: 1 });
  assert.equal(ready.phase, "playing");
  assert.equal(ready.countdownMs, 0);
});

test("非法阶段不能开局或推进，畸形状态安全回到 idle", () => {
  const playing = playingState();
  assert.strictEqual(startRound(playing), playing);
  const idle = createMatchState();
  assert.strictEqual(advanceMatch(idle, { elapsedMs: STEP_MS, rightPulls: 6 }), idle);
  assert.deepEqual(advanceMatch({ ...playing, position: Number.NaN }, { elapsedMs: STEP_MS }), idle);
});

test("倒计时期间的输入被丢弃，不泄漏到 playing", () => {
  const countdown = startRound(createMatchState(), 100);
  const ready = advanceMatch(countdown, { elapsedMs: 100, leftPulls: 6, rightPulls: 0 });
  assert.equal(ready.phase, "playing");
  assert.equal(ready.position, 0);
  const next = advanceMatch(ready, { elapsedMs: STEP_MS });
  assert.equal(next.position, 0);
});

test("左右脉冲方向正确，等量同帧输入原子抵消", () => {
  const playing = playingState();
  const left = advanceMatch(playing, { elapsedMs: 0, leftPulls: 1 });
  const right = advanceMatch(playing, { elapsedMs: 0, rightPulls: 1 });
  const tied = advanceMatch(playing, { elapsedMs: 0, leftPulls: 6, rightPulls: 6 });
  assert.equal(left.position, -PULL_DISTANCE);
  assert.equal(right.position, PULL_DISTANCE);
  assert.equal(tied.position, 0);
});

test("同帧按键按净值结算，不受左右字段顺序影响", () => {
  const playing = playingState();
  const first = advanceMatch(playing, { elapsedMs: 0, leftPulls: 5, rightPulls: 3 });
  const reordered = advanceMatch(playing, { rightPulls: 3, leftPulls: 5, elapsedMs: 0 });
  assert.equal(first.position, -2 * PULL_DISTANCE);
  assert.deepEqual(reordered, first);
});

test("回中距离只由 elapsed 决定，并且不会穿过中心", () => {
  let state = advanceMatch(playingState(), { elapsedMs: 0, rightPulls: 4 });
  const before = state.position;
  state = advanceMatch(state, { elapsedMs: 250 });
  assert.ok(Math.abs(state.position - (before - RETURN_RATE_PER_SECOND * 0.25)) < 1e-12);

  state = advanceMatch(state, { elapsedMs: 100000 });
  assert.equal(state.position, 0);
});

test("60Hz、120Hz 与不同 elapsed 分组产生等价回中位置", () => {
  const seed = advanceMatch(playingState(), { elapsedMs: 0, rightPulls: 4 });
  let at60 = seed;
  let at120 = seed;
  for (let index = 0; index < 60; index += 1) at60 = advanceMatch(at60, { elapsedMs: 1000 / 60 });
  for (let index = 0; index < 120; index += 1) at120 = advanceMatch(at120, { elapsedMs: 1000 / 120 });
  const grouped = advanceMatch(seed, { elapsedMs: 1000 });
  assert.ok(Math.abs(at60.position - at120.position) < 1e-12);
  assert.ok(Math.abs(at60.position - grouped.position) < 1e-12);
});

test("脉冲仅由一次 advance 消费，追赶步不会隐式重复施力", () => {
  let state = playingState();
  state = advanceMatch(state, { elapsedMs: STEP_MS, rightPulls: 1 });
  const afterPull = state.position;
  for (let index = 0; index < 4; index += 1) state = advanceMatch(state, { elapsedMs: STEP_MS });
  assert.ok(state.position < afterPull);
  assert.ok(state.position > 0);
});

test("左右越线分别赢局，比分只结算一次", () => {
  const leftWon = pullUntilRoundEnds(playingState(), "left");
  assert.equal(leftWon.phase, "round-end");
  assert.equal(leftWon.position, -1);
  assert.deepEqual([leftWon.leftScore, leftWon.rightScore, leftWon.lastWinner], [1, 0, "left"]);
  assert.strictEqual(advanceMatch(leftWon, { elapsedMs: STEP_MS, leftPulls: 6 }), leftWon);

  const rightWon = pullUntilRoundEnds(playingState(), "right");
  assert.equal(rightWon.position, 1);
  assert.deepEqual([rightWon.leftScore, rightWon.rightScore, rightWon.lastWinner], [0, 1, "right"]);
});

test("下一局归中并递增局号，任一侧两胜进入 match-end", () => {
  let state = pullUntilRoundEnds(playingState(), "left");
  state = startRound(state, 0);
  assert.equal(state.phase, "countdown");
  assert.equal(state.position, 0);
  assert.equal(state.roundNumber, 2);
  state = advanceMatch(state, { elapsedMs: 0 });
  state = pullUntilRoundEnds(state, "left");
  assert.equal(state.phase, "match-end");
  assert.equal(state.leftScore, 2);
  assert.strictEqual(startRound(state), state);

  const reset = resetMatch();
  assert.equal(reset.phase, "idle");
  assert.deepEqual([reset.leftScore, reset.rightScore, reset.roundNumber], [0, 0, 0]);
});

test("三局两胜允许一比一后决胜局", () => {
  let state = pullUntilRoundEnds(playingState(), "left");
  state = advanceMatch(startRound(state, 0), { elapsedMs: 0 });
  state = pullUntilRoundEnds(state, "right");
  assert.equal(state.phase, "round-end");
  assert.deepEqual([state.leftScore, state.rightScore], [1, 1]);
  state = advanceMatch(startRound(state, 0), { elapsedMs: 0 });
  state = pullUntilRoundEnds(state, "right");
  assert.equal(state.phase, "match-end");
  assert.deepEqual([state.leftScore, state.rightScore, state.roundNumber], [1, 2, 3]);
});

test("暂停保留位置与比分，恢复统一经过 1.2 秒保护倒计时", () => {
  let state = advanceMatch(playingState(), { elapsedMs: 0, leftPulls: 3 });
  const position = state.position;
  state = pauseMatch(state, " hidden ");
  assert.equal(state.phase, "paused");
  assert.equal(state.position, position);
  assert.equal(state.pauseReason, "hidden");
  assert.strictEqual(advanceMatch(state, { elapsedMs: 1000, rightPulls: 6 }), state);

  state = resumeMatch(state);
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownMs, RESUME_COUNTDOWN_MS);
  assert.equal(state.position, position);
  state = advanceMatch(state, { elapsedMs: RESUME_COUNTDOWN_MS, rightPulls: 6 });
  assert.equal(state.phase, "playing");
  assert.equal(state.position, position);
});

test("倒计时也可暂停，非法暂停和恢复不改变状态", () => {
  const countdown = startRound(createMatchState(), 800);
  const paused = pauseMatch(countdown);
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pauseReason, "manual");
  assert.strictEqual(pauseMatch(paused, "again"), paused);
  assert.strictEqual(resumeMatch(countdown), countdown);
  const idle = createMatchState();
  assert.strictEqual(pauseMatch(idle), idle);
});

test("畸形 pulls 归零、过量脉冲截断，畸形 elapsed 不推进", () => {
  const playing = playingState();
  for (const leftPulls of [-1, 1.5, Number.NaN, Infinity, "6", null]) {
    const result = advanceMatch(playing, { elapsedMs: 0, leftPulls });
    assert.equal(result.position, 0);
    assert.ok(Number.isFinite(result.position));
  }

  const capped = advanceMatch(playing, { elapsedMs: 0, rightPulls: 99 });
  assert.equal(capped.position, MAX_PULLS_PER_STEP * PULL_DISTANCE);
  for (const elapsedMs of [-1, Number.NaN, Infinity, "16"]) {
    assert.strictEqual(advanceMatch(playing, { elapsedMs, rightPulls: 6 }), playing);
  }
});

test("畸形倒计时与暂停原因使用安全默认值且不修改输入对象", () => {
  const initial = createMatchState();
  const snapshot = { ...initial };
  const countdown = startRound(initial, Number.NaN);
  assert.equal(countdown.countdownMs, DEFAULT_ROUND_COUNTDOWN_MS);
  assert.deepEqual(initial, snapshot);

  const paused = pauseMatch(playingState(), { bad: true });
  assert.equal(paused.pauseReason, "manual");
  assert.equal(Object.isFrozen(paused), true);
});

test("classifyPullKey 仅分类新的 A/L 按下且大小写等价", () => {
  assert.equal(classifyPullKey({ key: "a", repeat: false, isHeld: false }), "left");
  assert.equal(classifyPullKey({ key: "A", repeat: false, isHeld: false }), "left");
  assert.equal(classifyPullKey({ key: "l", repeat: false, isHeld: false }), "right");
  assert.equal(classifyPullKey({ key: "L", repeat: false, isHeld: false }), "right");
  assert.equal(classifyPullKey({ key: "a", repeat: true, isHeld: false }), null);
  assert.equal(classifyPullKey({ key: "l", repeat: false, isHeld: true }), null);
  assert.equal(classifyPullKey({ key: " ", repeat: false, isHeld: false }), null);
  assert.equal(classifyPullKey({ key: "Enter", repeat: false, isHeld: false }), null);
  assert.equal(classifyPullKey({ key: "a", repeat: 0, isHeld: false }), null);
  assert.equal(classifyPullKey({ key: "a", repeat: false, isHeld: "no" }), null);
  assert.equal(classifyPullKey({ key: "a" }), null);
  assert.equal(classifyPullKey(null), null);
});
