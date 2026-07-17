import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const logic = globalThis.TELEGRAPH_CODEBOOK_LOGIC;

function toSending(rounds = logic.DEFAULT_ROUNDS) {
  return logic.readySender(logic.startGame(logic.createInitialState(rounds)));
}

function send(state, pulses) {
  return pulses.reduce((current, pulse) => logic.tapPulse(current, pulse), state);
}

function toGuessing(pulses, rounds = logic.DEFAULT_ROUNDS) {
  let state = send(toSending(rounds), pulses);
  state = logic.readyReceiver(logic.sealTelegram(state));
  return logic.finishPlayback(state, state.playbackToken);
}

test("码本、默认四轮与初始冻结稳定", () => {
  const state = logic.createInitialState();
  assert.equal(logic.CODEBOOK.length, 6);
  assert.equal(new Set(logic.CODEBOOK.map((item) => item.pulses.join(""))).size, 6);
  assert.equal(logic.validateRounds(logic.DEFAULT_ROUNDS), true);
  assert.equal(state.phase, "intro");
  assert.equal(state.score, 0);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.rounds), true);
  assert.equal(Object.isFrozen(state.rounds[0].candidateIds), true);
  assert.equal(Object.isFrozen(state.sentPulses), true);
});

test("只有明确交接 Gate 才显示发送与播放阶段", () => {
  const intro = logic.createInitialState();
  assert.strictEqual(logic.readySender(intro), intro);
  const handoff = logic.startGame(intro);
  assert.equal(handoff.phase, "senderHandoff");
  assert.strictEqual(logic.tapPulse(handoff, "short"), handoff);
  const sending = logic.readySender(handoff);
  assert.equal(sending.phase, "sending");
  assert.strictEqual(logic.readyReceiver(sending), sending);
});

test("三拍上限、撤回与封存条件稳定", () => {
  let state = toSending();
  assert.strictEqual(logic.sealTelegram(state), state);
  state = send(state, ["short", "long", "short", "long"]);
  assert.deepEqual(state.sentPulses, ["short", "long", "short"]);
  state = logic.undoPulse(state);
  assert.deepEqual(state.sentPulses, ["short", "long"]);
  state = logic.tapPulse(state, "long");
  assert.equal(logic.sealTelegram(state).phase, "receiverHandoff");
  assert.strictEqual(logic.tapPulse(state, "bad"), state);
});

test("播放 token 拒绝旧计时器且只允许重听一次", () => {
  let state = toGuessing(["short", "short", "long"]);
  assert.equal(state.phase, "guessing");
  state = logic.replay(state);
  assert.equal(state.phase, "playback");
  assert.equal(state.replaysUsed, 1);
  assert.strictEqual(logic.finishPlayback(state, state.playbackToken - 1), state);
  state = logic.finishPlayback(state, state.playbackToken);
  assert.equal(state.phase, "guessing");
  assert.strictEqual(logic.replay(state), state);
});

test("四类结果只在编码和译码都正确时共同加分", () => {
  const targetId = logic.DEFAULT_ROUNDS[0].targetId;
  const target = logic.getCode(targetId);
  const wrong = target.pulses.map((pulse, index) => index === 0 ? (pulse === "short" ? "long" : "short") : pulse);
  const decoy = logic.DEFAULT_ROUNDS[0].candidateIds.find((id) => id !== targetId);

  const delivered = logic.guess(toGuessing(target.pulses), targetId);
  assert.equal(delivered.resultKind, "delivered");
  assert.equal(delivered.score, 1);

  const encodingError = logic.guess(toGuessing(wrong), targetId);
  assert.equal(encodingError.resultKind, "encodingError");
  assert.equal(encodingError.score, 0);

  const decodingError = logic.guess(toGuessing(target.pulses), decoy);
  assert.equal(decodingError.resultKind, "decodingError");
  assert.equal(decodingError.score, 0);

  const bothError = logic.guess(toGuessing(wrong), decoy);
  assert.equal(bothError.resultKind, "bothError");
  assert.equal(bothError.score, 0);
});

test("四轮交替推进并只从最后结果进入完成", () => {
  let state = logic.createInitialState();
  state = logic.readySender(logic.startGame(state));
  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    const round = state.rounds[state.roundIndex];
    const target = logic.getCode(round.targetId);
    state = send(state, target.pulses);
    state = logic.readyReceiver(logic.sealTelegram(state));
    state = logic.finishPlayback(state, state.playbackToken);
    state = logic.guess(state, round.targetId);
    state = logic.nextRound(state);
    assert.equal(state.phase, roundIndex === 3 ? "complete" : "senderHandoff");
    if (roundIndex < 3) state = logic.readySender(state);
  }
  assert.equal(state.score, 4);
  assert.equal(state.roundIndex, 3);
});

test("回合计划验证目标不重复、候选唯一且包含目标", () => {
  const duplicateTarget = logic.DEFAULT_ROUNDS.map((round) => ({
    targetId: logic.DEFAULT_ROUNDS[0].targetId,
    candidateIds: [...round.candidateIds],
  }));
  const missingTarget = logic.DEFAULT_ROUNDS.map((round) => ({ ...round, candidateIds: [...round.candidateIds] }));
  missingTarget[0].candidateIds = ["stars", "cloud", "tea", "movie"];
  assert.equal(logic.validateRounds(duplicateTarget), false);
  assert.equal(logic.validateRounds(missingTarget), false);
  assert.deepEqual(logic.createInitialState(missingTarget).rounds, logic.DEFAULT_ROUNDS);
});

test("可注入随机索引生成合法计划，异常时回退默认计划", () => {
  const plan = logic.createRoundPlan((limit) => limit - 1);
  assert.equal(logic.validateRounds(plan), true);
  assert.equal(new Set(plan.map((round) => round.targetId)).size, 4);
  assert.ok(plan.every((round) => new Set(round.candidateIds).size === 4 && round.candidateIds.includes(round.targetId)));
  assert.strictEqual(logic.createRoundPlan(() => -1), logic.DEFAULT_ROUNDS);
  assert.strictEqual(logic.createRoundPlan(), logic.DEFAULT_ROUNDS);
});

test("非法阶段、候选与畸形状态保持安全", () => {
  const state = toSending();
  assert.strictEqual(logic.guess(state, "moon"), state);
  assert.strictEqual(logic.nextRound(state), state);
  assert.deepEqual(logic.tapPulse({ ...state, score: Number.NaN }, "short"), logic.createInitialState());
  const guessing = toGuessing(["short", "short", "long"]);
  assert.strictEqual(logic.guess(guessing, "unknown"), guessing);
});
