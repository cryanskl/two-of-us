"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "./config.js";
import "./logic.js";

const logic = globalThis.FOUR_HANDS_HARMONY_LOGIC;
const configFile = globalThis.FOUR_HANDS_HARMONY_CONFIG;

const {
  TICK_MS,
  JOIN_WINDOW_TICKS,
  HOLD_TICKS,
  MAX_FRAME_GAP_MS,
  LOW_NOTES,
  HIGH_NOTES,
  PHRASE,
  DEFAULT_CONFIG,
  sanitizeHarmonyConfig,
  validateHarmonyPhrase,
  createHarmonyState,
  reduceHarmony,
  getHarmonyView,
  classifyHarmonyKey,
  replayHarmony,
} = logic;

function started(rawConfig) {
  return reduceHarmony(createHarmonyState(rawConfig), { type: "START" });
}

function press(state, voice, noteId, inputId = `${voice}:${noteId}`) {
  return reduceHarmony(state, { type: "PRESS", voice, noteId, inputId });
}

function joinCurrent(state, gap = 0, order = "low-first", suffix = state.measureIndex) {
  const measure = PHRASE[state.measureIndex];
  const lowId = `low:${suffix}`;
  const highId = `high:${suffix}`;
  if (order === "high-first") {
    state = press(state, "high", measure.high, highId);
    if (gap) state = reduceHarmony(state, { type: "TICK", ticks: gap });
    state = press(state, "low", measure.low, lowId);
  } else {
    state = press(state, "low", measure.low, lowId);
    if (gap) state = reduceHarmony(state, { type: "TICK", ticks: gap });
    state = press(state, "high", measure.high, highId);
  }
  return { state, lowId, highId };
}

function completeCurrent(state, gap = 0, order = "low-first", suffix = state.measureIndex) {
  const joined = joinCurrent(state, gap, order, suffix);
  return {
    ...joined,
    state: reduceHarmony(joined.state, { type: "TICK", ticks: HOLD_TICKS }),
  };
}

function finishPhrase(rawConfig) {
  let state = started(rawConfig);
  for (let index = 0; index < PHRASE.length; index += 1) {
    const result = completeCurrent(state, index % 5, index % 2 ? "high-first" : "low-first", index);
    state = reduceHarmony(result.state, { type: "RELEASE", inputId: result.lowId });
    state = reduceHarmony(state, { type: "RELEASE", inputId: result.highId });
  }
  return state;
}

test("exports the frozen timing contract", () => {
  assert.equal(TICK_MS, 50);
  assert.equal(JOIN_WINDOW_TICKS, 4);
  assert.equal(HOLD_TICKS, 6);
  assert.equal(MAX_FRAME_GAP_MS, 500);
  assert.ok(Object.isFrozen(logic));
});

test("freezes the exact low-note plan", () => {
  assert.deepEqual(LOW_NOTES, [
    { id: "c3", label: "C3", key: "A", code: "KeyA", frequency: 130.81 },
    { id: "f3", label: "F3", key: "S", code: "KeyS", frequency: 174.61 },
    { id: "g3", label: "G3", key: "D", code: "KeyD", frequency: 196 },
    { id: "a3", label: "A3", key: "F", code: "KeyF", frequency: 220 },
  ]);
  assert.ok(Object.isFrozen(LOW_NOTES));
  assert.ok(LOW_NOTES.every(Object.isFrozen));
});

test("freezes the exact high-note plan including Semicolon", () => {
  assert.deepEqual(HIGH_NOTES.map(({ id, key, code }) => ({ id, key, code })), [
    { id: "c5", key: "J", code: "KeyJ" },
    { id: "d5", key: "K", code: "KeyK" },
    { id: "e5", key: "L", code: "KeyL" },
    { id: "g5", key: ";", code: "Semicolon" },
  ]);
  assert.ok(Object.isFrozen(HIGH_NOTES));
  assert.ok(HIGH_NOTES.every(Object.isFrozen));
});

test("uses the exact five-measure original phrase", () => {
  assert.deepEqual(PHRASE, [
    { id: "arrival", low: "c3", high: "e5", title: "靠近" },
    { id: "answer", low: "g3", high: "d5", title: "回应" },
    { id: "turn", low: "a3", high: "c5", title: "转身" },
    { id: "stay", low: "f3", high: "d5", title: "停在这里" },
    { id: "home", low: "c3", high: "g5", title: "回到我们" },
  ]);
  assert.equal(validateHarmonyPhrase(PHRASE), true);
  assert.ok(Object.isFrozen(PHRASE));
  assert.ok(PHRASE.every(Object.isFrozen));
});

test("rejects a phrase with the wrong length", () => {
  assert.equal(validateHarmonyPhrase(PHRASE.slice(0, 4)), false);
});

test("rejects reordered or changed phrase entries", () => {
  const reordered = PHRASE.map((measure) => ({ ...measure }));
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  assert.equal(validateHarmonyPhrase(reordered), false);
  const changed = PHRASE.map((measure) => ({ ...measure }));
  changed[0].low = "f3";
  assert.equal(validateHarmonyPhrase(changed), false);
});

test("rejects phrase entries with unapproved fields", () => {
  const phrase = PHRASE.map((measure) => ({ ...measure }));
  phrase[0].score = 1;
  assert.equal(validateHarmonyPhrase(phrase), false);
});

test("sanitizes a missing configuration to frozen defaults", () => {
  const result = sanitizeHarmonyConfig();
  assert.deepEqual(result, DEFAULT_CONFIG);
  assert.notStrictEqual(result, DEFAULT_CONFIG);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(DEFAULT_CONFIG));
});

test("accepts only strings and falls back per field", () => {
  const result = sanitizeHarmonyConfig({
    lowSeatName: 12,
    highSeatName: [],
    intro: null,
    finalTitle: {},
    finalMessage: false,
    signature: Symbol("x"),
  });
  assert.deepEqual(result, DEFAULT_CONFIG);
});

test("trims configuration without interpreting HTML", () => {
  const result = sanitizeHarmonyConfig({
    lowSeatName: "  <b>小左</b>  ",
    finalMessage: "  <img src=x onerror=alert(1)>  ",
  });
  assert.equal(result.lowSeatName, "<b>小左</b>");
  assert.equal(result.finalMessage, "<img src=x onerror=alert(1)>");
});

test("truncates seat names by Unicode code point", () => {
  const result = sanitizeHarmonyConfig({ lowSeatName: "😀".repeat(13) });
  assert.equal([...result.lowSeatName].length, 12);
  assert.equal(result.lowSeatName, "😀".repeat(12));
});

test("applies every configured text limit", () => {
  const result = sanitizeHarmonyConfig({
    lowSeatName: "左".repeat(20),
    highSeatName: "右".repeat(20),
    intro: "序".repeat(80),
    finalTitle: "题".repeat(30),
    finalMessage: "话".repeat(100),
    signature: "签".repeat(30),
  });
  assert.deepEqual(Object.values(result).map((value) => [...value].length), [12, 12, 72, 24, 96, 24]);
});

test("falls back for blank strings", () => {
  assert.deepEqual(sanitizeHarmonyConfig({
    lowSeatName: "  ", highSeatName: "\n", intro: "", finalTitle: " ", finalMessage: "\t", signature: " ",
  }), DEFAULT_CONFIG);
});

test("deep-copies configuration and ignores later source changes", () => {
  const raw = { lowSeatName: "小左" };
  const result = sanitizeHarmonyConfig(raw);
  raw.lowSeatName = "已改变";
  assert.equal(result.lowSeatName, "小左");
  assert.ok(Object.isFrozen(result));
});

test("safely falls back when a configuration getter throws", () => {
  const raw = {};
  Object.defineProperty(raw, "intro", { get() { throw new Error("nope"); } });
  assert.equal(sanitizeHarmonyConfig(raw).intro, DEFAULT_CONFIG.intro);
});

test("config.js exposes a frozen runnable default and composer", () => {
  assert.ok(Object.isFrozen(configFile));
  assert.equal(typeof configFile.composeHarmonyMessage, "function");
  assert.match(configFile.composeHarmonyMessage({ completed: [] }), /0/);
  assert.equal(configFile.composeHarmonyMessage({ completed: new Array(5) }), DEFAULT_CONFIG.finalMessage);
});

test("classic scripts expose the browser globals", () => {
  assert.strictEqual(globalThis.FOUR_HANDS_HARMONY_CONFIG, configFile);
  assert.strictEqual(globalThis.FOUR_HANDS_HARMONY_LOGIC, logic);
});

test("the wrappers also expose CommonJS exports", () => {
  const configSource = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const logicSource = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const configSandbox = { module: { exports: {} } };
  const logicSandbox = { module: { exports: {} } };
  runInNewContext(configSource, configSandbox);
  runInNewContext(logicSource, logicSandbox);
  assert.equal(configSandbox.module.exports.finalTitle, DEFAULT_CONFIG.finalTitle);
  assert.equal(logicSandbox.module.exports.TICK_MS, TICK_MS);
  assert.equal(typeof logicSandbox.module.exports.reduceHarmony, "function");
});

test("creates the exact frozen intro state", () => {
  const state = createHarmonyState({ lowSeatName: "小左" });
  assert.equal(state.phase, "intro");
  assert.equal(state.measureIndex, 0);
  assert.equal(state.clockTick, 0);
  assert.deepEqual(state.held, { low: null, high: null });
  assert.deepEqual(state.completed, []);
  assert.equal(state.revision, 0);
  assert.equal(state.config.lowSeatName, "小左");
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.held));
  assert.ok(Object.isFrozen(state.config));
});

test("START only changes intro once", () => {
  const intro = createHarmonyState();
  const playing = reduceHarmony(intro, { type: "START" });
  assert.equal(playing.phase, "playing");
  assert.equal(playing.revision, 1);
  assert.strictEqual(reduceHarmony(playing, { type: "START" }), playing);
});

test("accepts the current low target as the first held note", () => {
  const state = press(started(), "low", "c3", "key:KeyA");
  assert.deepEqual(state.held.low, { noteId: "c3", inputId: "key:KeyA", pressedAtTick: 0 });
  assert.equal(state.held.high, null);
});

test("accepts the current high target as the first held note", () => {
  const state = press(started(), "high", "e5", "key:KeyL");
  assert.deepEqual(state.held.high, { noteId: "e5", inputId: "key:KeyL", pressedAtTick: 0 });
});

test("wrong own-voice notes only set neutral feedback", () => {
  const low = press(started(), "low", "f3", "wrong-low");
  assert.equal(low.feedback, "wrong-low");
  assert.equal(low.held.low, null);
  const high = press(low, "high", "c5", "wrong-high");
  assert.equal(high.feedback, "wrong-high");
  assert.equal(high.held.high, null);
});

test("rejects cross-voice, unknown, and malformed PRESS actions", () => {
  const state = started();
  assert.strictEqual(press(state, "low", "e5", "cross"), state);
  assert.strictEqual(press(state, "high", "c3", "cross"), state);
  assert.strictEqual(press(state, "low", "z9", "unknown"), state);
  assert.strictEqual(reduceHarmony(state, { type: "PRESS", voice: "middle", noteId: "c3", inputId: "x" }), state);
  assert.strictEqual(reduceHarmony(state, { type: "PRESS", voice: "low", noteId: "c3", inputId: "" }), state);
});

test("rejects duplicate input ids across voices", () => {
  let state = press(started(), "low", "c3", "same-physical-input");
  assert.strictEqual(press(state, "high", "e5", "same-physical-input"), state);
});

test("rejects a second physical input while a voice is occupied", () => {
  let state = press(started(), "low", "c3", "low:one");
  assert.strictEqual(press(state, "low", "c3", "low:two"), state);
  assert.strictEqual(press(state, "low", "f3", "low:wrong"), state);
});

test("classifies all eight physical keys", () => {
  const expected = [
    ["KeyA", "low", "c3"], ["KeyS", "low", "f3"], ["KeyD", "low", "g3"], ["KeyF", "low", "a3"],
    ["KeyJ", "high", "c5"], ["KeyK", "high", "d5"], ["KeyL", "high", "e5"], ["Semicolon", "high", "g5"],
  ];
  for (const [code, voice, noteId] of expected) {
    assert.deepEqual(classifyHarmonyKey(code, "down", false), {
      type: "PRESS", voice, noteId, inputId: `key:${code}`,
    });
  }
});

test("ignores repeated keydown but still classifies keyup", () => {
  assert.equal(classifyHarmonyKey("KeyA", "down", true), null);
  assert.deepEqual(classifyHarmonyKey("KeyA", "up", true), { type: "RELEASE", inputId: "key:KeyA" });
});

test("rejects unknown codes and edges", () => {
  assert.equal(classifyHarmonyKey("KeyQ", "down", false), null);
  assert.equal(classifyHarmonyKey("KeyA", "press", false), null);
  assert.equal(classifyHarmonyKey(null, "down", false), null);
});

test("joins two correct notes pressed in the same tick", () => {
  const { state } = joinCurrent(started());
  assert.equal(state.feedback, "joined");
  assert.equal(state.joinGapTicks, 0);
  assert.equal(state.joinedAtTick, 0);
  assert.equal(state.holdTicks, 0);
});

test("joins low then high with an equivalent recorded gap", () => {
  const { state } = joinCurrent(started(), 3, "low-first");
  assert.equal(state.joinGapTicks, 3);
  assert.equal(state.joinedAtTick, 3);
});

test("joins high then low symmetrically", () => {
  const lowFirst = joinCurrent(started(), 3, "low-first").state;
  const highFirst = joinCurrent(started(), 3, "high-first").state;
  assert.equal(highFirst.joinGapTicks, lowFirst.joinGapTicks);
  assert.equal(highFirst.holdTicks, lowFirst.holdTicks);
  assert.equal(highFirst.feedback, lowFirst.feedback);
});

test("accepts exactly four ticks and rejects five ticks", () => {
  assert.equal(joinCurrent(started(), 4).state.feedback, "joined");
  const late = joinCurrent(started(), 5).state;
  assert.equal(late.feedback, "outside-window");
  assert.equal(late.joinedAtTick, null);
  assert.equal(late.joinGapTicks, null);
});

test("TICK with no active input returns the original reference", () => {
  const state = started();
  assert.strictEqual(reduceHarmony(state, { type: "TICK", ticks: 1 }), state);
});

test("TICK advances the integer clock while one input waits", () => {
  const held = press(started(), "low", "c3", "low");
  const ticked = reduceHarmony(held, { type: "TICK", ticks: 4 });
  assert.equal(ticked.clockTick, 4);
  assert.equal(ticked.holdTicks, 0);
});

test("rejects malformed, fractional, zero, negative and unsafe ticks", () => {
  const state = press(started(), "low", "c3", "low");
  for (const ticks of [undefined, "1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.strictEqual(reduceHarmony(state, { type: "TICK", ticks }), state);
  }
});

test("holds for five ticks without completing", () => {
  const joined = joinCurrent(started()).state;
  const state = reduceHarmony(joined, { type: "TICK", ticks: 5 });
  assert.equal(state.phase, "playing");
  assert.equal(state.holdTicks, 5);
  assert.equal(state.completed.length, 0);
});

test("the sixth hold tick completes exactly one measure", () => {
  const joined = joinCurrent(started()).state;
  const five = reduceHarmony(joined, { type: "TICK", ticks: 5 });
  const six = reduceHarmony(five, { type: "TICK", ticks: 1 });
  assert.equal(six.phase, "measure-complete");
  assert.equal(six.holdTicks, 6);
  assert.deepEqual(six.completed, [{ measureId: "arrival", joinGapTicks: 0, completedAtTick: 6 }]);
});

test("a huge TICK completes only the current measure once", () => {
  const joined = joinCurrent(started()).state;
  const complete = reduceHarmony(joined, { type: "TICK", ticks: 1_000 });
  assert.equal(complete.completed.length, 1);
  assert.equal(complete.holdTicks, HOLD_TICKS);
  assert.strictEqual(reduceHarmony(complete, { type: "TICK", ticks: 100 }), complete);
});

test("release before join clears only the matching held note", () => {
  const held = press(started(), "low", "c3", "low");
  const released = reduceHarmony(held, { type: "RELEASE", inputId: "low" });
  assert.equal(released.held.low, null);
  assert.equal(released.feedback, null);
});

test("early release after join clears the join and hold", () => {
  const joined = reduceHarmony(joinCurrent(started()).state, { type: "TICK", ticks: 3 });
  const released = reduceHarmony(joined, { type: "RELEASE", inputId: "low:0" });
  assert.equal(released.feedback, "released-early");
  assert.equal(released.joinedAtTick, null);
  assert.equal(released.joinGapTicks, null);
  assert.equal(released.holdTicks, 0);
  assert.equal(released.held.high.inputId, "high:0");
});

test("a stale RELEASE cannot clear a newer physical input", () => {
  const state = press(started(), "low", "c3", "pointer:2");
  assert.strictEqual(reduceHarmony(state, { type: "RELEASE", inputId: "pointer:1" }), state);
});

test("outside-window attempts require both releases before retry", () => {
  const late = joinCurrent(started(), 5).state;
  const blocked = press(late, "low", "c3", "new-low");
  assert.strictEqual(blocked, late);
  const oneReleased = reduceHarmony(late, { type: "RELEASE", inputId: "low:0" });
  assert.equal(oneReleased.feedback, "outside-window");
  assert.strictEqual(press(oneReleased, "low", "c3", "new-low"), oneReleased);
  const clear = reduceHarmony(oneReleased, { type: "RELEASE", inputId: "high:0" });
  assert.equal(clear.feedback, null);
  assert.deepEqual(clear.held, { low: null, high: null });
  assert.equal(press(clear, "low", "c3", "new-low").held.low.inputId, "new-low");
});

test("measure-complete keeps the gate closed after one release", () => {
  const result = completeCurrent(started());
  const oneReleased = reduceHarmony(result.state, { type: "RELEASE", inputId: result.lowId });
  assert.equal(oneReleased.phase, "measure-complete");
  assert.equal(oneReleased.measureIndex, 0);
  assert.equal(oneReleased.held.low, null);
  assert.equal(oneReleased.held.high.inputId, result.highId);
  assert.equal(getHarmonyView(oneReleased).instruction, "和弦收好了，双方松开");
});

test("both releases advance to a clean next measure", () => {
  const result = completeCurrent(started());
  let state = reduceHarmony(result.state, { type: "RELEASE", inputId: result.lowId });
  state = reduceHarmony(state, { type: "RELEASE", inputId: result.highId });
  assert.equal(state.phase, "playing");
  assert.equal(state.measureIndex, 1);
  assert.deepEqual(state.held, { low: null, high: null });
  assert.equal(state.joinedAtTick, null);
  assert.equal(state.holdTicks, 0);
});

test("long-held notes cannot complete the next measure", () => {
  const result = completeCurrent(started());
  assert.strictEqual(reduceHarmony(result.state, { type: "TICK", ticks: 100 }), result.state);
  const oneReleased = reduceHarmony(result.state, { type: "RELEASE", inputId: result.lowId });
  assert.strictEqual(reduceHarmony(oneReleased, { type: "TICK", ticks: 100 }), oneReleased);
});

test("five gated measures end in complete only after the final double release", () => {
  const state = finishPhrase();
  assert.equal(state.phase, "complete");
  assert.equal(state.measureIndex, 4);
  assert.deepEqual(state.completed.map((record) => record.measureId), PHRASE.map((measure) => measure.id));
  assert.deepEqual(state.completed.map((record) => record.joinGapTicks), [0, 1, 2, 3, 4]);
});

test("manual and unknown interrupts normalize the pause reason", () => {
  const manual = reduceHarmony(started(), { type: "INTERRUPT", reason: "manual" });
  const unknown = reduceHarmony(started(), { type: "INTERRUPT", reason: "network" });
  assert.equal(manual.pauseReason, "manual");
  assert.equal(unknown.pauseReason, "manual");
});

test("blur, hidden and stalled interrupts are preserved", () => {
  for (const reason of ["blur", "hidden", "stalled"]) {
    assert.equal(reduceHarmony(started(), { type: "INTERRUPT", reason }).pauseReason, reason);
  }
});

test("interrupt clears an unfinished attempt and repeated interrupt is inert", () => {
  const joined = reduceHarmony(joinCurrent(started()).state, { type: "TICK", ticks: 2 });
  const paused = reduceHarmony(joined, { type: "INTERRUPT", reason: "blur" });
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pausedFrom, "playing");
  assert.deepEqual(paused.held, { low: null, high: null });
  assert.equal(paused.joinedAtTick, null);
  assert.equal(paused.holdTicks, 0);
  assert.strictEqual(reduceHarmony(paused, { type: "INTERRUPT", reason: "hidden" }), paused);
});

test("resuming playing returns to the same clean measure", () => {
  const paused = reduceHarmony(joinCurrent(started()).state, { type: "INTERRUPT", reason: "hidden" });
  const resumed = reduceHarmony(paused, { type: "RESUME" });
  assert.equal(resumed.phase, "playing");
  assert.equal(resumed.measureIndex, 0);
  assert.equal(resumed.pauseReason, null);
  assert.equal(resumed.pausedFrom, null);
});

test("interrupting measure-complete preserves its record", () => {
  const result = completeCurrent(started());
  const paused = reduceHarmony(result.state, { type: "INTERRUPT", reason: "stalled" });
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pausedFrom, "measure-complete");
  assert.equal(paused.completed.length, 1);
  assert.deepEqual(paused.held, { low: null, high: null });
});

test("resuming interrupted measure-complete safely advances", () => {
  const result = completeCurrent(started());
  const paused = reduceHarmony(result.state, { type: "INTERRUPT", reason: "blur" });
  const resumed = reduceHarmony(paused, { type: "RESUME" });
  assert.equal(resumed.phase, "playing");
  assert.equal(resumed.measureIndex, 1);
  assert.equal(resumed.completed.length, 1);
});

test("resuming an interrupted final measure goes directly complete", () => {
  let state = started();
  for (let index = 0; index < PHRASE.length - 1; index += 1) {
    const result = completeCurrent(state, 0, "low-first", index);
    state = reduceHarmony(result.state, { type: "RELEASE", inputId: result.lowId });
    state = reduceHarmony(state, { type: "RELEASE", inputId: result.highId });
  }
  const final = completeCurrent(state, 0, "low-first", 4).state;
  const paused = reduceHarmony(final, { type: "INTERRUPT", reason: "hidden" });
  const resumed = reduceHarmony(paused, { type: "RESUME" });
  assert.equal(resumed.phase, "complete");
  assert.equal(resumed.completed.length, 5);
});

test("complete refuses PRESS and TICK", () => {
  const state = finishPhrase();
  assert.strictEqual(press(state, "low", "c3", "late"), state);
  assert.strictEqual(reduceHarmony(state, { type: "TICK", ticks: 1 }), state);
});

test("RESTART from any phase returns a fresh intro with the same clean config", () => {
  const phases = [
    createHarmonyState({ lowSeatName: "小左" }),
    started({ lowSeatName: "小左" }),
    reduceHarmony(started({ lowSeatName: "小左" }), { type: "INTERRUPT", reason: "manual" }),
    completeCurrent(started({ lowSeatName: "小左" })).state,
    finishPhrase({ lowSeatName: "小左" }),
  ];
  for (const state of phases) {
    const restarted = reduceHarmony(state, { type: "RESTART" });
    assert.equal(restarted.phase, "intro");
    assert.equal(restarted.config.lowSeatName, "小左");
    assert.deepEqual(restarted.completed, []);
    assert.equal(restarted.clockTick, 0);
    assert.equal(restarted.revision, state.revision + 1);
  }
});

test("getHarmonyView exposes target keys and code-native note buttons", () => {
  const view = getHarmonyView(started({ lowSeatName: "甲", highSeatName: "乙" }));
  assert.equal(view.measureNumber, 1);
  assert.equal(view.measureCount, 5);
  assert.equal(view.measureTitle, "靠近");
  assert.equal(view.lowSeat.name, "甲");
  assert.equal(view.highSeat.name, "乙");
  assert.deepEqual(view.lowSeat.notes.find((note) => note.isTarget), {
    id: "c3", label: "C3", key: "A", isTarget: true, isHeld: false,
  });
  assert.equal(view.highSeat.target.key, "L");
  assert.equal(view.highSeat.target.frequency, 659.25);
});

test("getHarmonyView supplies redundant instructions and capability flags", () => {
  const intro = getHarmonyView(createHarmonyState());
  assert.equal(intro.instruction, DEFAULT_CONFIG.intro);
  assert.equal(intro.canStart, true);
  const playing = getHarmonyView(started());
  assert.equal(playing.instruction, "一起按住，让这一小节合上");
  assert.equal(playing.canPress, true);
  assert.equal(playing.canPause, true);
  const paused = getHarmonyView(reduceHarmony(started(), { type: "INTERRUPT", reason: "manual" }));
  assert.equal(paused.instruction, "回来后从这一小节继续。");
  assert.equal(paused.canResume, true);
});

test("getHarmonyView reports hold progress and the release gate", () => {
  const joined = joinCurrent(started(), 2).state;
  const halfway = reduceHarmony(joined, { type: "TICK", ticks: 3 });
  assert.equal(getHarmonyView(halfway).holdProgress, 0.5);
  assert.equal(getHarmonyView(halfway).joinGapMs, 100);
  assert.equal(getHarmonyView(halfway).instruction, "保持中");
  const complete = reduceHarmony(halfway, { type: "TICK", ticks: 3 });
  assert.equal(getHarmonyView(complete).instruction, "和弦收好了，双方松开");
  assert.equal(getHarmonyView(complete).holdProgress, 1);
});

test("getHarmonyView isolates all nested arrays and objects", () => {
  const state = completeCurrent(started()).state;
  const view = getHarmonyView(state);
  view.completed[0].measureId = "changed";
  view.lowSeat.notes[0].isTarget = false;
  view.lowSeat.target.id = "changed";
  view.lowSeat.held.noteId = "changed";
  view.config.intro = "changed";
  const fresh = getHarmonyView(state);
  assert.equal(fresh.completed[0].measureId, "arrival");
  assert.equal(fresh.lowSeat.notes[0].isTarget, true);
  assert.equal(fresh.lowSeat.target.id, "c3");
  assert.equal(fresh.lowSeat.held.noteId, "c3");
  assert.equal(fresh.config.intro, DEFAULT_CONFIG.intro);
});

test("complete view returns final copy without composing it in the reducer", () => {
  const view = getHarmonyView(finishPhrase({ finalMessage: "我们自己的留言" }));
  assert.equal(view.phase, "complete");
  assert.equal(view.finalMessage, "我们自己的留言");
  assert.equal(view.progressLabel, "五次相遇，成了我们的小曲");
  assert.equal(view.completed.length, 5);
});

test("replay is deterministic", () => {
  const actions = [
    { type: "START" },
    { type: "PRESS", voice: "low", noteId: "c3", inputId: "a" },
    { type: "TICK", ticks: 2 },
    { type: "PRESS", voice: "high", noteId: "e5", inputId: "l" },
    { type: "TICK", ticks: 6 },
  ];
  assert.deepEqual(replayHarmony({ lowSeatName: "甲" }, actions), replayHarmony({ lowSeatName: "甲" }, actions));
});

test("replay does not modify the action array or nested actions", () => {
  const actions = [{ type: "START", meta: { audio: false } }, { type: "TICK", ticks: 1 }];
  const snapshot = structuredClone(actions);
  replayHarmony(null, actions);
  assert.deepEqual(actions, snapshot);
});

test("replay ignores audio-like metadata and yields the same state", () => {
  const base = [{ type: "START" }, { type: "PRESS", voice: "low", noteId: "c3", inputId: "a" }];
  const noisy = base.map((action) => ({ ...action, audioReady: false, playTone: "threw" }));
  assert.deepEqual(replayHarmony(null, base), replayHarmony(null, noisy));
});

test("unknown and malformed actions return the original reference", () => {
  const state = started();
  for (const action of [null, [], {}, { type: "NOPE" }, { type: 2 }]) {
    assert.strictEqual(reduceHarmony(state, action), state);
  }
});

test("malformed states are safely rejected without throwing", () => {
  const malformed = [
    null,
    {},
    { ...started(), phase: "won" },
    { ...started(), held: null },
    { ...started(), feedback: "measure-complete" },
    { ...started(), config: { ...DEFAULT_CONFIG, intro: "长".repeat(73) } },
    { ...started(), completed: [{ measureId: "home", joinGapTicks: 0, completedAtTick: 0 }] },
  ];
  for (const state of malformed) {
    assert.doesNotThrow(() => reduceHarmony(state, { type: "START" }));
    assert.strictEqual(reduceHarmony(state, { type: "START" }), state);
    assert.equal(getHarmonyView(state), null);
  }
});
