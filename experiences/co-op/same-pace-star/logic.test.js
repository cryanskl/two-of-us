"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "./config.js";
import "./logic.js";

const logic = globalThis.SAME_PACE_STAR_LOGIC;
const configFile = globalThis.SAME_PACE_STAR_CONFIG;

const {
  TICK_MS,
  STEP_TICKS,
  ACTION_WINDOW_START,
  ACTION_WINDOW_END,
  MISS_TICK,
  MAX_FRAME_GAP_MS,
  MEASURES,
  DEFAULT_CONFIG,
  sanitizeSamePaceConfig,
  validateMeasures,
  createSamePaceState,
  getExpectedAction,
  reduceSamePace,
  getSamePaceView,
  classifySamePaceKey,
  replaySamePace,
} = logic;

function dispatch(state, type, fields = {}) {
  return reduceSamePace(state, { type, ...fields });
}

function started(rawConfig) {
  return dispatch(createSamePaceState(rawConfig), "START");
}

function tick(state, ticks) {
  return dispatch(state, "TICK", { ticks });
}

function press(state, side, inputId = `${side}:${state.measureIndex}`) {
  return dispatch(state, "PRESS", { side, inputId });
}

function release(state, inputId) {
  return dispatch(state, "RELEASE", { inputId });
}

function satisfyCurrentStep(state, ids = {}) {
  const expected = getExpectedAction(state);
  const id = ids[expected.side] || `${expected.side}:${state.measureIndex}`;
  state = tick(state, ACTION_WINDOW_START - state.stepTick);
  state = expected.edge === "press" ? press(state, expected.side, id) : release(state, state.active[expected.side].inputId);
  if (state.phase === "playing" && state.stepIndex < 3) {
    state = tick(state, STEP_TICKS - state.stepTick);
  }
  return state;
}

function completeCurrent(state) {
  const ids = {
    left: `left:${state.measureIndex}`,
    right: `right:${state.measureIndex}`,
  };
  for (let step = 0; step < 4; step += 1) state = satisfyCurrentStep(state, ids);
  return state;
}

function finishAll(rawConfig) {
  let state = started(rawConfig);
  while (state.phase !== "complete") {
    state = completeCurrent(state);
    if (state.phase === "measure-complete") state = dispatch(state, "NEXT");
  }
  return state;
}

test("exports the exact frozen timing contract", () => {
  assert.deepEqual(
    { TICK_MS, STEP_TICKS, ACTION_WINDOW_START, ACTION_WINDOW_END, MISS_TICK, MAX_FRAME_GAP_MS },
    { TICK_MS: 50, STEP_TICKS: 24, ACTION_WINDOW_START: 8, ACTION_WINDOW_END: 19, MISS_TICK: 20, MAX_FRAME_GAP_MS: 500 },
  );
  assert.ok(Object.isFrozen(logic));
});

test("freezes the six-measure alternating leader plan", () => {
  assert.deepEqual(MEASURES.map(({ id, leader }) => ({ id, leader })), [
    { id: "first-light", leader: "left" },
    { id: "answer-light", leader: "right" },
    { id: "warm-light", leader: "left" },
    { id: "near-light", leader: "right" },
    { id: "home-light", leader: "left" },
    { id: "our-light", leader: "right" },
  ]);
  assert.ok(Object.isFrozen(MEASURES));
  assert.ok(MEASURES.every(Object.isFrozen));
});

test("validates the exact measure plan", () => {
  assert.equal(validateMeasures(MEASURES), true);
});

test("rejects a measure plan with the wrong length", () => {
  assert.equal(validateMeasures(MEASURES.slice(0, 5)), false);
});

test("rejects changed or reordered measures", () => {
  const changed = MEASURES.map((item) => ({ ...item }));
  changed[0].leader = "right";
  assert.equal(validateMeasures(changed), false);
  assert.equal(validateMeasures([...MEASURES].reverse()), false);
});

test("rejects extra measure fields", () => {
  const changed = MEASURES.map((item) => ({ ...item }));
  changed[0].score = 1;
  assert.equal(validateMeasures(changed), false);
});

test("sanitizes missing config to a distinct frozen default copy", () => {
  const result = sanitizeSamePaceConfig();
  assert.deepEqual(result, DEFAULT_CONFIG);
  assert.notStrictEqual(result, DEFAULT_CONFIG);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(DEFAULT_CONFIG));
});

test("accepts only string config values", () => {
  const result = sanitizeSamePaceConfig({
    leftName: 1,
    rightName: [],
    intro: null,
    finalTitle: {},
    finalMessage: false,
    signature: Symbol("x"),
  });
  assert.deepEqual(result, DEFAULT_CONFIG);
});

test("trims config without interpreting HTML", () => {
  const result = sanitizeSamePaceConfig({
    leftName: "  <b>小左</b>  ",
    finalMessage: "  <img src=x onerror=alert(1)>  ",
  });
  assert.equal(result.leftName, "<b>小左</b>");
  assert.equal(result.finalMessage, "<img src=x onerror=alert(1)>");
});

test("truncates names by Unicode code point", () => {
  const result = sanitizeSamePaceConfig({ leftName: "😀".repeat(13), rightName: "月".repeat(13) });
  assert.equal(result.leftName, "😀".repeat(12));
  assert.equal(result.rightName, "月".repeat(12));
});

test("applies every configured text limit", () => {
  const result = sanitizeSamePaceConfig({
    leftName: "左".repeat(20),
    rightName: "右".repeat(20),
    intro: "序".repeat(80),
    finalTitle: "题".repeat(30),
    finalMessage: "话".repeat(100),
    signature: "签".repeat(30),
  });
  assert.deepEqual(Object.values(result).map((value) => [...value].length), [12, 12, 72, 24, 96, 24]);
});

test("falls back for blank text and hostile getters", () => {
  const raw = { leftName: "   " };
  Object.defineProperty(raw, "rightName", { get() { throw new Error("nope"); } });
  const result = sanitizeSamePaceConfig(raw);
  assert.equal(result.leftName, DEFAULT_CONFIG.leftName);
  assert.equal(result.rightName, DEFAULT_CONFIG.rightName);
});

test("does not retain the mutable raw config object", () => {
  const raw = { leftName: "小左" };
  const result = sanitizeSamePaceConfig(raw);
  raw.leftName = "改掉";
  assert.equal(result.leftName, "小左");
});

test("config module is frozen and returns a complete default ending", () => {
  assert.ok(Object.isFrozen(configFile));
  assert.equal(configFile.composeSamePaceMessage({
    completed: Array(6).fill({}),
    seats: { left: { name: "甲" }, right: { name: "乙" } },
    finalMessage: DEFAULT_CONFIG.finalMessage,
  }), DEFAULT_CONFIG.finalMessage);
});

test("config TODO also returns a safe partial-progress message", () => {
  assert.equal(configFile.composeSamePaceMessage({
    completed: [{}, {}],
    seats: { left: { name: "甲" }, right: { name: "乙" } },
  }), "甲 和 乙 已经接好 2 颗星。");
});

test("exposes the same API through CommonJS and a classic-script global", () => {
  const source = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const sandbox = { module: { exports: {} } };
  sandbox.globalThis = sandbox;
  runInNewContext(source, sandbox);
  assert.equal(sandbox.module.exports.TICK_MS, 50);
  assert.strictEqual(sandbox.SAME_PACE_STAR_LOGIC, sandbox.module.exports);
});

test("creates the frozen authoritative intro state", () => {
  const state = createSamePaceState({ leftName: "小左" });
  assert.equal(state.phase, "intro");
  assert.equal(state.measureIndex, 0);
  assert.equal(state.attemptCount, 1);
  assert.deepEqual(state.active, { left: null, right: null });
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.active));
  assert.equal(state.config.leftName, "小左");
});

test("START enters the first measure at step zero", () => {
  const state = started();
  assert.equal(state.phase, "playing");
  assert.equal(state.stepIndex, 0);
  assert.equal(state.stepTick, 0);
  assert.equal(state.revision, 1);
});

test("START is accepted only once", () => {
  const state = started();
  assert.strictEqual(dispatch(state, "START"), state);
});

test("derives all four left-led actions", () => {
  let state = started();
  const seen = [];
  for (let step = 0; step < 4; step += 1) {
    seen.push(getExpectedAction(state));
    state = satisfyCurrentStep(state);
  }
  assert.deepEqual(seen, [
    { side: "left", edge: "press" },
    { side: "right", edge: "press" },
    { side: "left", edge: "release" },
    { side: "right", edge: "release" },
  ]);
  assert.ok(seen.every(Object.isFrozen));
});

test("derives the mirrored right-led actions", () => {
  let state = completeCurrent(started());
  state = dispatch(state, "NEXT");
  const seen = [];
  for (let step = 0; step < 4; step += 1) {
    seen.push(getExpectedAction(state));
    state = satisfyCurrentStep(state);
  }
  assert.deepEqual(seen, [
    { side: "right", edge: "press" },
    { side: "left", edge: "press" },
    { side: "right", edge: "release" },
    { side: "left", edge: "release" },
  ]);
});

test("rejects the expected press at tick 7 as early", () => {
  let state = tick(started(), 7);
  state = press(state, "left", "key:KeyA");
  assert.equal(state.phase, "release-gate");
  assert.equal(state.failureReason, "early-edge");
});

test("accepts the expected press at tick 8", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  assert.equal(state.phase, "playing");
  assert.equal(state.stepSatisfied, true);
});

test("accepts the expected press at inclusive tick 19", () => {
  let state = tick(started(), 19);
  state = press(state, "left", "key:KeyA");
  assert.equal(state.stepSatisfied, true);
  assert.equal(state.stepTick, 19);
});

test("fails at tick 20 without leaving an invalid playing state", () => {
  const state = tick(started(), 20);
  assert.equal(state.phase, "ready");
  assert.equal(state.failureReason, "missed-edge");
  assert.equal(state.stepTick, 0);
  assert.equal(state.clockTick, 20);
});

test("holds a received action at tick 23", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  state = tick(state, 15);
  assert.equal(state.stepIndex, 0);
  assert.equal(state.stepTick, 23);
  assert.equal(state.stepSatisfied, true);
});

test("advances a received action exactly at tick 24", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  state = tick(state, 16);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.stepTick, 0);
  assert.equal(state.stepSatisfied, false);
  assert.equal(state.active.left.inputId, "key:KeyA");
});

test("a big tick crosses a received boundary then stops at the next miss", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  state = tick(state, 36);
  assert.equal(state.phase, "release-gate");
  assert.equal(state.failureReason, "missed-edge");
  assert.equal(state.clockTick, 44);
});

test("completes a left-led measure on the fourth release immediately", () => {
  const state = completeCurrent(started());
  assert.equal(state.phase, "measure-complete");
  assert.equal(state.measureIndex, 1);
  assert.equal(state.completed.length, 1);
  assert.deepEqual(state.completed[0], {
    measureId: "first-light",
    leader: "left",
    attemptCount: 1,
    completedAtTick: 80,
  });
});

test("completes a right-led measure with the mirrored edges", () => {
  let state = completeCurrent(started());
  state = dispatch(state, "NEXT");
  state = completeCurrent(state);
  assert.equal(state.completed[1].leader, "right");
  assert.equal(state.completed[1].measureId, "answer-light");
});

test("completes all six measures with an exact prefix ledger", () => {
  const state = finishAll();
  assert.equal(state.phase, "complete");
  assert.equal(state.measureIndex, 6);
  assert.deepEqual(state.completed.map((item) => item.measureId), MEASURES.map((item) => item.id));
  assert.deepEqual(state.completed.map((item) => item.leader), ["left", "right", "left", "right", "left", "right"]);
});

test("NEXT is allowed only from measure-complete and resets attempts", () => {
  const playing = started();
  assert.strictEqual(dispatch(playing, "NEXT"), playing);
  const complete = completeCurrent(playing);
  const next = dispatch(complete, "NEXT");
  assert.equal(next.phase, "playing");
  assert.equal(next.measureIndex, 1);
  assert.equal(next.attemptCount, 1);
  assert.strictEqual(dispatch(next, "NEXT"), next);
});

test("RETRY is allowed only from ready and increments the attempt", () => {
  const playing = started();
  assert.strictEqual(dispatch(playing, "RETRY"), playing);
  const ready = tick(playing, 20);
  const retry = dispatch(ready, "RETRY");
  assert.equal(retry.phase, "playing");
  assert.equal(retry.attemptCount, 2);
  assert.equal(retry.failureReason, null);
});

test("an expected release before its window is released-early", () => {
  let state = started();
  state = satisfyCurrentStep(state);
  state = satisfyCurrentStep(state);
  state = release(state, state.active.left.inputId);
  assert.equal(state.phase, "release-gate");
  assert.equal(state.failureReason, "released-early");
});

test("a press from the wrong seat enters the release gate", () => {
  let state = tick(started(), 8);
  state = press(state, "right", "key:KeyL");
  assert.equal(state.phase, "release-gate");
  assert.equal(state.failureReason, "wrong-seat");
});

test("an extra press after a received edge fails without losing physical inputs", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  state = press(state, "right", "key:KeyL");
  assert.equal(state.phase, "release-gate");
  assert.equal(state.failureReason, "wrong-seat");
  assert.ok(state.active.left && state.active.right);
});

test("an extra release after a received edge is released-early", () => {
  let state = started();
  state = satisfyCurrentStep(state);
  state = satisfyCurrentStep(state);
  state = tick(state, 8);
  state = release(state, state.active.left.inputId);
  assert.equal(state.stepSatisfied, true);
  state = release(state, state.active.right.inputId);
  assert.equal(state.phase, "ready");
  assert.equal(state.failureReason, "released-early");
});

test("holding both keys from the first window cannot complete a star", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  state = press(state, "right", "key:KeyL");
  state = tick(state, 200);
  assert.equal(state.completed.length, 0);
  assert.equal(state.phase, "release-gate");
});

test("missing a required release cannot complete a star", () => {
  let state = started();
  state = satisfyCurrentStep(state);
  state = satisfyCurrentStep(state);
  state = tick(state, 20);
  assert.equal(state.completed.length, 0);
  assert.equal(state.failureReason, "missed-edge");
});

test("a duplicate physical inputId is idempotent", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  assert.strictEqual(press(state, "left", "key:KeyA"), state);
});

test("one inputId cannot occupy both seats", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "pointer:7");
  assert.strictEqual(press(state, "right", "pointer:7"), state);
});

test("an occupied seat rejects a second physical input", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "pointer:7");
  assert.strictEqual(press(state, "left", "pointer:8"), state);
});

test("an old or unknown release cannot clear a newer input", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "pointer:8");
  assert.strictEqual(release(state, "pointer:7"), state);
  assert.equal(state.active.left.inputId, "pointer:8");
});

test("release-gate waits for each active physical input", () => {
  let state = tick(started(), 8);
  state = press(state, "left", "key:KeyA");
  state = press(state, "right", "key:KeyL");
  state = release(state, "key:KeyA");
  assert.equal(state.phase, "release-gate");
  state = release(state, "key:KeyL");
  assert.equal(state.phase, "ready");
  assert.equal(state.readyKind, "retry");
});

test("retrying a later star never removes completed records", () => {
  let state = completeCurrent(started());
  state = dispatch(state, "NEXT");
  state = tick(state, 20);
  state = dispatch(state, "RETRY");
  assert.equal(state.measureIndex, 1);
  assert.equal(state.completed.length, 1);
  assert.equal(state.attemptCount, 2);
});

test("TICK fragmentation produces a deeply equal state including revision", () => {
  let base = tick(started(), 8);
  base = press(base, "left", "key:KeyA");
  const whole = tick(base, 16);
  let fragmented = base;
  for (let index = 0; index < 16; index += 1) fragmented = tick(fragmented, 1);
  assert.deepEqual(fragmented, whole);
});

test("an oversized miss tick stops consuming at the first failure", () => {
  const state = tick(started(), 1000);
  assert.equal(state.phase, "ready");
  assert.equal(state.clockTick, 20);
  assert.equal(state.revision, 21);
});

for (const reason of ["manual", "blur", "hidden", "stalled"]) {
  test(`${reason} interruption clears inputs and the partial step`, () => {
    let state = tick(started(), 8);
    state = press(state, "left", "key:KeyA");
    state = dispatch(state, "INTERRUPT", { reason });
    assert.equal(state.phase, "paused");
    assert.equal(state.pauseReason, reason);
    assert.equal(state.pausedFrom, "playing");
    assert.deepEqual(state.active, { left: null, right: null });
    assert.equal(state.stepTick, 0);
    assert.equal(state.stepSatisfied, false);
  });
}

test("an unknown interruption reason normalizes to manual", () => {
  const state = dispatch(started(), "INTERRUPT", { reason: "network" });
  assert.equal(state.pauseReason, "manual");
});

test("a repeated interruption does not overwrite the first reason", () => {
  const paused = dispatch(started(), "INTERRUPT", { reason: "hidden" });
  assert.strictEqual(dispatch(paused, "INTERRUPT", { reason: "blur" }), paused);
  assert.equal(paused.pauseReason, "hidden");
});

test("resuming a playing interruption requires a full retry", () => {
  let state = dispatch(started(), "INTERRUPT", { reason: "manual" });
  state = dispatch(state, "RESUME");
  assert.equal(state.phase, "ready");
  assert.equal(state.readyKind, "retry");
});

test("resuming a release-gate interruption returns to ready", () => {
  let state = tick(started(), 7);
  state = press(state, "left", "key:KeyA");
  state = dispatch(state, "INTERRUPT", { reason: "blur" });
  assert.equal(state.pausedFrom, "release-gate");
  state = dispatch(state, "RESUME");
  assert.equal(state.phase, "ready");
  assert.equal(state.failureReason, "early-edge");
});

test("resuming an interrupted ready state stays ready", () => {
  let state = tick(started(), 20);
  state = dispatch(state, "INTERRUPT", { reason: "hidden" });
  assert.equal(state.pausedFrom, "ready");
  state = dispatch(state, "RESUME");
  assert.equal(state.phase, "ready");
});

test("resuming measure-complete preserves its completed star", () => {
  let state = completeCurrent(started());
  state = dispatch(state, "INTERRUPT", { reason: "stalled" });
  assert.equal(state.pausedFrom, "measure-complete");
  state = dispatch(state, "RESUME");
  assert.equal(state.phase, "measure-complete");
  assert.equal(state.completed.length, 1);
});

test("complete rejects input, tick, next and resume by reference", () => {
  const state = finishAll();
  assert.strictEqual(press(state, "left", "key:KeyA"), state);
  assert.strictEqual(release(state, "key:KeyA"), state);
  assert.strictEqual(tick(state, 1), state);
  assert.strictEqual(dispatch(state, "NEXT"), state);
  assert.strictEqual(dispatch(state, "RESUME"), state);
});

test("RESTART clears the entire session while preserving sanitized config", () => {
  const complete = finishAll({ leftName: "小左" });
  const state = dispatch(complete, "RESTART");
  assert.equal(state.phase, "intro");
  assert.equal(state.measureIndex, 0);
  assert.equal(state.clockTick, 0);
  assert.deepEqual(state.completed, []);
  assert.equal(state.config.leftName, "小左");
  assert.equal(state.revision, complete.revision + 1);
});

test("view exposes four redundant text steps and alternating roles", () => {
  const view = getSamePaceView(started({ leftName: "甲", rightName: "乙" }));
  assert.equal(view.steps.length, 4);
  assert.deepEqual(view.steps.map(({ side, edge }) => ({ side, edge })), [
    { side: "left", edge: "press" },
    { side: "right", edge: "press" },
    { side: "left", edge: "release" },
    { side: "right", edge: "release" },
  ]);
  assert.match(view.steps[0].label, /甲.*按住/);
  assert.deepEqual(view.leader, { side: "left", name: "甲" });
  assert.deepEqual(view.follower, { side: "right", name: "乙" });
});

test("view timing zones are exact at prepare, act and received", () => {
  let state = started();
  assert.equal(getSamePaceView(state).timing.zone, "prepare");
  state = tick(state, 8);
  assert.equal(getSamePaceView(state).timing.zone, "act");
  state = press(state, "left", "key:KeyA");
  assert.equal(getSamePaceView(state).timing.zone, "received");
});

test("view seats expose names, keys and physical active state", () => {
  let state = tick(started({ leftName: "甲", rightName: "乙" }), 8);
  state = press(state, "left", "key:KeyA");
  const view = getSamePaceView(state);
  assert.deepEqual(view.seats.left, { name: "甲", key: "A", active: true, stateLabel: "按住" });
  assert.deepEqual(view.seats.right, { name: "乙", key: "L", active: false, stateLabel: "松开" });
  assert.match(view.instruction, /接住了/);
});

test("view maps failures to a neutral shared instruction", () => {
  const state = tick(started(), 20);
  const view = getSamePaceView(state);
  assert.equal(view.instruction, "光没接上，松开再来");
  assert.doesNotMatch(view.instruction, /左|右|谁错/);
});

test("view contains the non-medical safety note", () => {
  const view = getSamePaceView(started());
  assert.match(view.safetyNote, /不用憋气/);
  assert.match(view.safetyNote, /不适.*停下来/);
});

test("view arrays and nested objects cannot mutate authority", () => {
  const state = completeCurrent(started({ leftName: "甲" }));
  const view = getSamePaceView(state);
  view.completed[0].measureId = "changed";
  view.steps[0].status = "changed";
  view.seats.left.name = "changed";
  assert.equal(state.completed[0].measureId, "first-light");
  assert.equal(state.config.leftName, "甲");
  assert.equal(getSamePaceView(state).steps[0].status, "received");
});

test("view capability flags follow phase gates", () => {
  const intro = getSamePaceView(createSamePaceState());
  const playing = getSamePaceView(started());
  const ready = getSamePaceView(tick(started(), 20));
  assert.equal(intro.canStart, true);
  assert.equal(playing.canPause, true);
  assert.equal(ready.canRetry, true);
  assert.equal(ready.canStart, false);
});

test("classifies KeyA down as a left physical press", () => {
  assert.deepEqual(classifySamePaceKey("KeyA", "down", false), {
    type: "PRESS",
    side: "left",
    inputId: "key:KeyA",
  });
});

test("classifies KeyL down as a right physical press", () => {
  assert.deepEqual(classifySamePaceKey("KeyL", "down", false), {
    type: "PRESS",
    side: "right",
    inputId: "key:KeyL",
  });
});

test("classifies keyup as an exact release", () => {
  assert.deepEqual(classifySamePaceKey("KeyA", "up", false), {
    type: "RELEASE",
    inputId: "key:KeyA",
  });
});

test("ignores repeated keydown but keeps repeated keyup releasable", () => {
  assert.equal(classifySamePaceKey("KeyL", "down", true), null);
  assert.deepEqual(classifySamePaceKey("KeyL", "up", true), {
    type: "RELEASE",
    inputId: "key:KeyL",
  });
});

test("rejects unknown codes and malformed edges", () => {
  assert.equal(classifySamePaceKey("KeyS", "down", false), null);
  assert.equal(classifySamePaceKey("KeyA", "press", false), null);
  assert.equal(classifySamePaceKey(null, "down", false), null);
});

test("replay is deterministic and does not mutate the action log", () => {
  const actions = [
    { type: "START" },
    { type: "TICK", ticks: 8 },
    { type: "PRESS", side: "left", inputId: "key:KeyA" },
    { type: "TICK", ticks: 16 },
  ];
  const snapshot = structuredClone(actions);
  const first = replaySamePace({ leftName: "甲" }, actions);
  const second = replaySamePace({ leftName: "甲" }, actions);
  assert.deepEqual(first, second);
  assert.deepEqual(actions, snapshot);
});

test("replay with a non-array returns a fresh intro", () => {
  assert.deepEqual(replaySamePace(undefined, null), createSamePaceState());
});

test("unknown and malformed actions return the original state", () => {
  const state = started();
  assert.strictEqual(reduceSamePace(state, null), state);
  assert.strictEqual(reduceSamePace(state, []), state);
  assert.strictEqual(reduceSamePace(state, { type: "UNKNOWN" }), state);
  assert.strictEqual(reduceSamePace(state, { type: "PRESS", side: "middle", inputId: "x" }), state);
  assert.strictEqual(reduceSamePace(state, { type: "PRESS", side: "left", inputId: "" }), state);
});

test("malformed tick counts are safely rejected", () => {
  const state = started();
  for (const ticks of [0, -1, 1.5, NaN, Infinity, "1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.strictEqual(tick(state, ticks), state);
  }
});

test("a malformed authoritative state is safely rejected", () => {
  const state = started();
  const malformed = { ...state, measureIndex: 6 };
  assert.strictEqual(reduceSamePace(malformed, { type: "TICK", ticks: 1 }), malformed);
  assert.equal(getSamePaceView(malformed), null);
  assert.equal(getExpectedAction(malformed), null);
});

test("environmental presentation fields never enter reducer state", () => {
  const state = replaySamePace(undefined, [
    { type: "START", reducedMotion: true, viewport: "390x844", assetLoaded: false },
    { type: "TICK", ticks: 8, focused: false },
  ]);
  assert.equal("reducedMotion" in state, false);
  assert.equal("viewport" in state, false);
  assert.equal("assetLoaded" in state, false);
  assert.equal("focused" in state, false);
});
