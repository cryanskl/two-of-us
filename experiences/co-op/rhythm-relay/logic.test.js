import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const {
  INITIAL_LENGTH,
  TARGET_LENGTH,
  STARTING_ECHOES,
  createRelayState,
  startRelay,
  markReady,
  finishPlayback,
  tapBeat,
  retrySequence,
  appendBeat,
  restartRelay,
  validateInitialSequence,
} = globalThis.RHYTHM_RELAY_LOGIC;

const initialSequence = Object.freeze(["coral", "sage", "coral"]);

function repeatingState(sequence = initialSequence) {
  let state = startRelay(createRelayState(), sequence);
  state = markReady(state);
  return finishPlayback(state);
}

function repeatAll(state) {
  return state.sequence.reduce((current, beat) => tapBeat(current, beat), state);
}

function buildRepeatingState(length) {
  let state = repeatingState();
  while (state.sequence.length < length) {
    state = appendBeat(repeatAll(state), state.sequence.length % 2 === 0 ? "coral" : "sage");
    state = finishPlayback(markReady(state));
  }
  return state;
}

test("初始状态、常量与三拍序列校验稳定", () => {
  const state = createRelayState();
  assert.deepEqual(state, {
    phase: "intro",
    sequence: [],
    playerIndex: 0,
    echoes: STARTING_ECHOES,
    inputIndex: 0,
    lastExpected: null,
    lastActual: null,
  });
  assert.equal(INITIAL_LENGTH, 3);
  assert.equal(TARGET_LENGTH, 10);
  assert.equal(validateInitialSequence(initialSequence), true);
  assert.equal(validateInitialSequence(["coral", "sage"]), false);
  assert.equal(validateInitialSequence(["coral", "unknown", "sage"]), false);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.sequence), true);
});

test("只有 handoff → playback → repeat 可以开始复现", () => {
  const intro = createRelayState();
  assert.strictEqual(markReady(intro), intro);
  assert.strictEqual(finishPlayback(intro), intro);

  const handoff = startRelay(intro, initialSequence);
  assert.equal(handoff.phase, "handoff");
  assert.notStrictEqual(handoff.sequence, initialSequence);
  assert.strictEqual(tapBeat(handoff, "coral"), handoff);
  const playback = markReady(handoff);
  assert.equal(playback.phase, "playback");
  assert.equal(finishPlayback(playback).phase, "repeat");
});

test("正确复现逐拍推进，完整后才允许追加", () => {
  let state = repeatingState();
  assert.strictEqual(appendBeat(state, "sage"), state);
  state = tapBeat(state, "coral");
  assert.equal(state.inputIndex, 1);
  state = tapBeat(state, "sage");
  assert.equal(state.inputIndex, 2);
  state = tapBeat(state, "coral");
  assert.equal(state.phase, "append");
  assert.equal(state.inputIndex, 3);
});

test("错误拍只扣一次回声并锁定到明确重听", () => {
  const repeating = repeatingState();
  const missed = tapBeat(repeating, "sage");
  assert.equal(missed.phase, "miss");
  assert.equal(missed.echoes, 2);
  assert.equal(missed.inputIndex, 0);
  assert.equal(missed.lastExpected, "coral");
  assert.equal(missed.lastActual, "sage");
  assert.strictEqual(tapBeat(missed, "sage"), missed);

  const retry = retrySequence(missed);
  assert.equal(retry.phase, "playback");
  assert.equal(retry.echoes, 2);
  assert.deepEqual(retry.sequence, initialSequence);
  assert.equal(retry.playerIndex, 0);
});

test("三次失误耗尽共享回声并进入 failed", () => {
  let state = repeatingState();
  for (let index = 0; index < STARTING_ECHOES; index += 1) {
    state = tapBeat(state, "sage");
    if (index < STARTING_ECHOES - 1) {
      state = finishPlayback(retrySequence(state));
    }
  }
  assert.equal(state.phase, "failed");
  assert.equal(state.echoes, 0);
  assert.strictEqual(retrySequence(state), state);
});

test("追加一拍后换棒、遮挡并保留共享序列", () => {
  const appended = appendBeat(repeatAll(repeatingState()), "sage");
  assert.equal(appended.phase, "handoff");
  assert.equal(appended.playerIndex, 1);
  assert.equal(appended.sequence.length, 4);
  assert.equal(appended.sequence.at(-1), "sage");
  assert.equal(appended.inputIndex, 0);
});

test("第十拍由 append Gate 唯一进入共同完成", () => {
  const repeating = buildRepeatingState(TARGET_LENGTH - 1);
  const readyToAppend = repeatAll(repeating);
  const complete = appendBeat(readyToAppend, "sage");
  assert.equal(complete.phase, "complete");
  assert.equal(complete.sequence.length, TARGET_LENGTH);
  assert.equal(complete.playerIndex, 0);
  assert.strictEqual(appendBeat(complete, "coral"), complete);
});

test("非法阶段、未知拍与畸形状态保持安全", () => {
  const state = repeatingState();
  assert.strictEqual(tapBeat(state, "blue"), state);
  assert.strictEqual(retrySequence(state), state);
  assert.deepEqual(tapBeat({ ...state, echoes: Number.NaN }, "coral"), createRelayState());
  assert.deepEqual(appendBeat({ ...state, sequence: ["bad"] }, "coral"), createRelayState());
  assert.deepEqual(restartRelay(), createRelayState());
  assert.notStrictEqual(restartRelay(), restartRelay());
});
