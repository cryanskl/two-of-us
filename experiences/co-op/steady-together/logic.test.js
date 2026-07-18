"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "./config.js";
import "./logic.js";

const logic = globalThis.STEADY_TOGETHER_LOGIC;
const configFile = globalThis.STEADY_TOGETHER_CONFIG;

const {
  TICK_MS,
  MAX_FRAME_GAP_MS,
  COURSE_SEGMENTS,
  CHECKPOINTS,
  DEFAULT_CONFIG,
  sanitizeSteadyConfig,
  validateCourseSegments,
  getCourseSegment,
  createSteadyState,
  reduceSteady,
  getSteadyView,
  classifySteadyKey,
  replaySteady,
} = logic;

function dispatch(state, type, fields = {}) {
  return reduceSteady(state, { type, ...fields });
}

function started(rawConfig) {
  return dispatch(createSteadyState(rawConfig), "START");
}

function tick(state, ticks = 1) {
  return dispatch(state, "TICK", { ticks });
}

function press(state, side, inputId = `${side}:${state.tick}`) {
  return dispatch(state, "PRESS", { side, inputId });
}

function release(state, inputId) {
  return dispatch(state, "RELEASE", { inputId });
}

function createFeedbackController() {
  return {
    serial: 0,
    counts: { leftPress: 0, rightPress: 0, leftRelease: 0, rightRelease: 0 },
  };
}

function controllerStep(state, controller, actionLog) {
  const segment = getCourseSegment(state.routeProgress);
  const desiredTilt = Math.max(-48, Math.min(48, Math.round(
    -0.04 * state.ballPosition - 1.2 * state.ballVelocity,
  )));
  const desiredDifference = Math.round(((desiredTilt - segment.bias) * 10) / 3);
  const targetTotal = 1600;
  const targets = {
    left: Math.max(0, Math.min(1000, Math.round((targetTotal + desiredDifference) / 2))),
    right: Math.max(0, Math.min(1000, Math.round((targetTotal - desiredDifference) / 2))),
  };
  for (const side of ["left", "right"]) {
    const lift = side === "left" ? state.leftLift : state.rightLift;
    if (state.active[side] && lift >= targets[side] + 8) {
      const action = { type: "RELEASE", inputId: state.active[side].inputId };
      state = reduceSteady(state, action);
      controller.counts[`${side}Release`] += 1;
      if (actionLog) actionLog.push(action);
    } else if (!state.active[side] && lift <= targets[side] - 8) {
      const action = { type: "PRESS", side, inputId: `controller:${side}:${controller.serial}` };
      controller.serial += 1;
      state = reduceSteady(state, action);
      controller.counts[`${side}Press`] += 1;
      if (actionLog) actionLog.push(action);
    }
  }
  const tickAction = { type: "TICK", ticks: 1 };
  if (actionLog) actionLog.push(tickAction);
  return reduceSteady(state, tickAction);
}

let cachedReachable = null;

function reachableTrace() {
  if (cachedReachable) return cachedReachable;
  const actions = [{ type: "START" }];
  const controller = createFeedbackController();
  let state = reduceSteady(createSteadyState(), actions[0]);
  const history = [state];
  for (let index = 0; index < 2000 && state.phase === "playing"; index += 1) {
    state = controllerStep(state, controller, actions);
    history.push(state);
  }
  cachedReachable = { state, history, actions, counts: { ...controller.counts } };
  return cachedReachable;
}

function reachCheckpoint(value) {
  return reachableTrace().history.find((state) => state.checkpoint === value);
}

function holdBothUntilDrop(state) {
  if (!state.active.left) state = press(state, "left", `hold:left:${state.tick}`);
  if (!state.active.right) state = press(state, "right", `hold:right:${state.tick}`);
  return tick(state, 2000);
}

test("exports the frozen public timing contract", () => {
  assert.equal(TICK_MS, 20);
  assert.equal(MAX_FRAME_GAP_MS, 500);
  assert.ok(Object.isFrozen(logic));
});

test("freezes the exact continuous three-segment course", () => {
  assert.deepEqual(COURSE_SEGMENTS, [
    { id: "lean-left", start: 0, end: 799, bias: 84 },
    { id: "lean-right", start: 800, end: 1599, bias: -84 },
    { id: "come-home", start: 1600, end: 2400, bias: 0 },
  ]);
  assert.ok(Object.isFrozen(COURSE_SEGMENTS));
  assert.ok(COURSE_SEGMENTS.every(Object.isFrozen));
});

test("freezes the exact checkpoint plan", () => {
  assert.deepEqual(CHECKPOINTS, [0, 800, 1600]);
  assert.ok(Object.isFrozen(CHECKPOINTS));
});

test("validates the exact course", () => {
  assert.equal(validateCourseSegments(COURSE_SEGMENTS), true);
});

test("rejects a short or reordered course", () => {
  assert.equal(validateCourseSegments(COURSE_SEGMENTS.slice(0, 2)), false);
  assert.equal(validateCourseSegments([...COURSE_SEGMENTS].reverse()), false);
});

test("rejects changed and extra course fields", () => {
  const changed = COURSE_SEGMENTS.map((item) => ({ ...item }));
  changed[0].bias = 70;
  assert.equal(validateCourseSegments(changed), false);
  changed[0] = { ...COURSE_SEGMENTS[0], score: 1 };
  assert.equal(validateCourseSegments(changed), false);
});

test("selects the first segment at both exact boundaries", () => {
  assert.equal(getCourseSegment(0).id, "lean-left");
  assert.equal(getCourseSegment(799).id, "lean-left");
});

test("selects the second segment at both exact boundaries", () => {
  assert.equal(getCourseSegment(800).id, "lean-right");
  assert.equal(getCourseSegment(1599).id, "lean-right");
});

test("selects the final segment through the exact route end", () => {
  assert.equal(getCourseSegment(1600).id, "come-home");
  assert.equal(getCourseSegment(2400).id, "come-home");
});

test("rejects malformed course positions", () => {
  for (const value of [-1, 2401, 1.5, NaN, "800", null]) assert.equal(getCourseSegment(value), null);
});

test("sanitizes missing config to a distinct frozen default copy", () => {
  const result = sanitizeSteadyConfig();
  assert.deepEqual(result, DEFAULT_CONFIG);
  assert.notStrictEqual(result, DEFAULT_CONFIG);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(DEFAULT_CONFIG));
});

test("accepts only string config values", () => {
  const result = sanitizeSteadyConfig({
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
  const result = sanitizeSteadyConfig({
    leftName: "  <b>左</b>  ",
    finalMessage: "  <img src=x onerror=alert(1)>  ",
  });
  assert.equal(result.leftName, "<b>左</b>");
  assert.equal(result.finalMessage, "<img src=x onerror=alert(1)>");
});

test("truncates names by Unicode code point", () => {
  const result = sanitizeSteadyConfig({ leftName: "😀".repeat(13), rightName: "月".repeat(13) });
  assert.equal(result.leftName, "😀".repeat(12));
  assert.equal(result.rightName, "月".repeat(12));
});

test("applies every configured text limit", () => {
  const result = sanitizeSteadyConfig({
    leftName: "左".repeat(20),
    rightName: "右".repeat(20),
    intro: "序".repeat(80),
    finalTitle: "题".repeat(40),
    finalMessage: "话".repeat(120),
    signature: "签".repeat(30),
  });
  assert.deepEqual(Object.values(result).map((value) => [...value].length), [12, 12, 72, 28, 108, 24]);
});

test("falls back for blank values and hostile getters", () => {
  const raw = { leftName: "   " };
  Object.defineProperty(raw, "rightName", { get() { throw new Error("blocked"); } });
  const result = sanitizeSteadyConfig(raw);
  assert.equal(result.leftName, DEFAULT_CONFIG.leftName);
  assert.equal(result.rightName, DEFAULT_CONFIG.rightName);
});

test("does not retain the mutable raw config", () => {
  const raw = { leftName: "小左" };
  const result = sanitizeSteadyConfig(raw);
  raw.leftName = "后来改掉";
  assert.equal(result.leftName, "小左");
});

test("config TODO is frozen and returns the safe complete ending", () => {
  assert.ok(Object.isFrozen(configFile));
  assert.equal(configFile.composeSteadyMessage({
    names: { left: "甲", right: "乙" },
    journey: { reachedCheckpoints: [800, 1600] },
    finalMessage: DEFAULT_CONFIG.finalMessage,
  }), DEFAULT_CONFIG.finalMessage);
});

test("config TODO returns a safe partial journey ending", () => {
  assert.equal(configFile.composeSteadyMessage({
    names: { left: "甲", right: "乙" },
    journey: { reachedCheckpoints: [800] },
  }), "甲 和 乙 已经一起走过 1 处灯。");
});

test("exposes one frozen API through CommonJS and the classic global", () => {
  const source = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const sandbox = { module: { exports: {} } };
  sandbox.globalThis = sandbox;
  runInNewContext(source, sandbox);
  assert.equal(sandbox.module.exports.TICK_MS, 20);
  assert.strictEqual(sandbox.STEADY_TOGETHER_LOGIC, sandbox.module.exports);
});

test("creates a deeply frozen centered intro state", () => {
  const state = createSteadyState({ leftName: "小左" });
  assert.equal(state.phase, "intro");
  assert.equal(state.routeProgress, 0);
  assert.equal(state.checkpoint, 0);
  assert.equal(state.attemptCount, 1);
  assert.deepEqual(state.active, { left: null, right: null });
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.active));
  assert.ok(Object.isFrozen(state.reachedCheckpoints));
  assert.equal(state.config.leftName, "小左");
});

test("START enters playing without advancing physics", () => {
  const state = started();
  assert.equal(state.phase, "playing");
  assert.equal(state.tick, 0);
  assert.equal(state.leftLift, 0);
  assert.equal(state.ballPosition, 0);
  assert.equal(state.revision, 1);
});

test("START is accepted only once", () => {
  const state = started();
  assert.strictEqual(dispatch(state, "START"), state);
});

test("PRESS records a physical input but waits until TICK to lift", () => {
  const base = started();
  const state = press(base, "left", "key:KeyA");
  assert.deepEqual(state.active.left, { inputId: "key:KeyA", pressedAtTick: 0 });
  assert.equal(state.leftLift, 0);
  assert.equal(base.active.left, null);
});

test("the first equal-support tick follows the exact integer formula", () => {
  let state = started();
  state = press(state, "left", "key:KeyA");
  state = press(state, "right", "key:KeyL");
  state = tick(state);
  assert.deepEqual({
    leftLift: state.leftLift,
    rightLift: state.rightLift,
    tilt: state.tilt,
    ballVelocity: state.ballVelocity,
    ballPosition: state.ballPosition,
  }, { leftLift: 48, rightLift: 48, tilt: 8, ballVelocity: 1, ballPosition: 1 });
});

test("lift rises by 48 and clamps exactly at 1000", () => {
  let state = press(started(), "left", "key:KeyA");
  state = tick(state, 21);
  assert.equal(state.leftLift, 1000);
  state = tick(state, 1);
  assert.equal(state.leftLift, 1000);
});

test("released lift falls by 32 toward zero", () => {
  let state = press(started(), "right", "key:KeyL");
  state = tick(state, 8);
  const before = state.rightLift;
  state = release(state, "key:KeyL");
  state = tick(state);
  assert.equal(state.rightLift, before - 32);
});

test("negative half velocity rounding is symmetric away from zero", () => {
  let state = press(started(), "right", "right:0");
  state = tick(state, 9);
  state = release(state, "right:0");
  state = tick(state, 3);
  assert.deepEqual({
    rightLift: state.rightLift,
    tilt: state.tilt,
    ballVelocity: state.ballVelocity,
    ballPosition: state.ballPosition,
  }, { rightLift: 336, tilt: -18, ballVelocity: -2, ballPosition: 30 });
  state = tick(state, 1);
  assert.equal(state.ballVelocity, -3, "-40 / 16 = -2.5 must round to -3");
  assert.equal(state.ballPosition, 27);
});

test("a completely idle run never advances the route", () => {
  const state = tick(started(), 2000);
  assert.equal(state.routeProgress, 0);
  assert.notEqual(state.phase, "complete");
});

test("left-only input never reaches support or route progress", () => {
  let state = press(started(), "left", "key:KeyA");
  let maximumProgress = 0;
  for (let index = 0; index < 300 && state.phase === "playing"; index += 1) {
    state = tick(state);
    maximumProgress = Math.max(maximumProgress, state.routeProgress);
    assert.equal(getSteadyView(state).stability.supported, false);
  }
  assert.equal(maximumProgress, 0);
  assert.equal(state.phase, "release-gate");
});

test("right-only input is the same non-cooperative failure", () => {
  let state = press(started(), "right", "key:KeyL");
  let maximumProgress = 0;
  for (let index = 0; index < 300 && state.phase === "playing"; index += 1) {
    state = tick(state);
    maximumProgress = Math.max(maximumProgress, state.routeProgress);
    assert.equal(getSteadyView(state).stability.supported, false);
  }
  assert.equal(maximumProgress, 0);
  assert.equal(state.phase, "release-gate");
});

test("continuous equal double hold falls in the first slope without progress", () => {
  let state = press(started(), "left", "key:KeyA");
  state = press(state, "right", "key:KeyL");
  let maximumProgress = 0;
  for (let index = 0; index < 300 && state.phase === "playing"; index += 1) {
    state = tick(state);
    maximumProgress = Math.max(maximumProgress, state.routeProgress);
  }
  assert.equal(state.phase, "release-gate");
  assert.equal(state.feedback, "fell");
  assert.equal(maximumProgress, 0);
});

test("a production-action feedback controller completes all three slopes", () => {
  const trace = reachableTrace();
  assert.equal(trace.state.phase, "complete");
  assert.equal(trace.state.routeProgress, 2400);
  assert.deepEqual(trace.state.reachedCheckpoints, [800, 1600]);
  assert.ok(trace.state.tick < 2000);
});

test("both seats repeatedly press and release on the reachable path", () => {
  const counts = reachableTrace().counts;
  assert.ok(counts.leftPress > 20 && counts.leftRelease > 20);
  assert.ok(counts.rightPress > 20 && counts.rightRelease > 20);
  assert.ok(Math.abs(counts.leftPress - counts.rightPress) < 100);
});

test("the reachable path never mutates state outside the reducer", () => {
  const trace = reachableTrace();
  assert.ok(trace.history.every(Object.isFrozen));
  assert.ok(trace.history.every((state) => Object.isFrozen(state.active)));
  assert.ok(trace.actions.every((action) => !Object.isFrozen(action)));
});

test("route progress is monotonic throughout the no-fall reachable path", () => {
  const progress = reachableTrace().history.map((state) => state.routeProgress);
  for (let index = 1; index < progress.length; index += 1) assert.ok(progress[index] >= progress[index - 1]);
});

test("warmup tick 11 still does not move the route", () => {
  const state = reachableTrace().history.find((item) => item.stableTicks === 11 && item.routeProgress === 0);
  assert.ok(state);
  assert.equal(state.routeProgress, 0);
});

test("warmup tick 12 advances the route by exactly three", () => {
  const history = reachableTrace().history;
  const state = history.find((item) => item.stableTicks === 12 && item.routeProgress === 3);
  assert.ok(state);
  assert.equal(state.routeProgress, 3);
});

test("the first checkpoint is crossed once from 798 to 801", () => {
  const history = reachableTrace().history;
  const index = history.findIndex((state) => state.checkpoint === 800);
  assert.equal(history[index - 1].routeProgress, 798);
  assert.equal(history[index].routeProgress, 801);
  assert.deepEqual(history[index].reachedCheckpoints, [800]);
  assert.equal(history[index].feedback, "checkpoint");
});

test("the second checkpoint is crossed once from 1599 to 1602", () => {
  const history = reachableTrace().history;
  const index = history.findIndex((state) => state.checkpoint === 1600);
  assert.equal(history[index - 1].routeProgress, 1599);
  assert.equal(history[index].routeProgress, 1602);
  assert.deepEqual(history[index].reachedCheckpoints, [800, 1600]);
});

test("strictly mirrored slopes produce exact one-tick mirrored physics", () => {
  let first = press(started(), "left", "mirror:left");
  let second = holdBothUntilDrop(reachCheckpoint(800));
  if (second.active.left) second = release(second, second.active.left.inputId);
  if (second.active.right) second = release(second, second.active.right.inputId);
  second = dispatch(second, "RETRY");
  second = press(second, "right", "mirror:right");
  first = tick(first, 10);
  second = tick(second, 10);
  assert.deepEqual({
    leftLift: first.leftLift,
    rightLift: first.rightLift,
    tilt: first.tilt,
    ballPosition: first.ballPosition,
    ballVelocity: first.ballVelocity,
    stableTicks: first.stableTicks,
    finalHoldTicks: first.finalHoldTicks,
  }, {
    leftLift: second.rightLift,
    rightLift: second.leftLift,
    tilt: -second.tilt,
    ballPosition: -second.ballPosition,
    ballVelocity: -second.ballVelocity,
    stableTicks: second.stableTicks,
    finalHoldTicks: second.finalHoldTicks,
  });
});

test("slope reversal mirrors which seat carries more lift on the reachable path", () => {
  const first = reachableTrace().history.find((state) => state.routeProgress > 300
    && state.routeProgress < 700 && state.stableTicks > 30);
  const second = reachableTrace().history.find((state) => state.routeProgress > 1100
    && state.routeProgress < 1500 && state.stableTicks > 30);
  assert.ok(first.rightLift > first.leftLift, "positive bias is countered by more right lift");
  assert.ok(second.leftLift > second.rightLift, "negative bias is countered by more left lift");
  assert.ok(Math.abs(first.ballPosition) <= 500 && Math.abs(second.ballPosition) <= 500);
  assert.ok(Math.abs(first.tilt) <= 48 && Math.abs(second.tilt) <= 48);
});

test("the final slope returns the lift difference near zero", () => {
  const state = reachableTrace().history.find((item) => item.routeProgress > 1900
    && item.stableTicks > 30 && Math.abs(item.leftLift - item.rightLift) <= 64);
  assert.ok(state);
  assert.equal(getCourseSegment(state.routeProgress).bias, 0);
});

test("arriving at route end counts final hold tick one", () => {
  const state = reachableTrace().history.find((item) => item.routeProgress === 2400);
  assert.ok(state);
  assert.equal(state.finalHoldTicks, 1);
  assert.equal(state.phase, "playing");
});

test("final hold tick 29 is not complete", () => {
  const state = reachableTrace().history.find((item) => item.finalHoldTicks === 29);
  assert.ok(state);
  assert.equal(state.phase, "playing");
});

test("final hold tick 30 completes and preserves stable physics", () => {
  const state = reachableTrace().state;
  assert.equal(state.finalHoldTicks, 30);
  assert.equal(state.phase, "complete");
  assert.ok(Math.abs(state.ballPosition) <= 500);
  assert.ok(Math.abs(state.ballVelocity) <= 18);
  assert.ok(Math.abs(state.tilt) <= 48);
  assert.ok(state.leftLift + state.rightLift >= 1240);
});

test("terminal instability resets final hold without route rollback", () => {
  const source = reachableTrace().history.find((item) => item.finalHoldTicks === 8);
  let state = source;
  if (state.active.left) state = release(state, state.active.left.inputId);
  if (state.active.right) state = release(state, state.active.right.inputId);
  for (let index = 0; index < 100 && state.finalHoldTicks > 0; index += 1) state = tick(state);
  assert.equal(state.routeProgress, 2400);
  assert.equal(state.finalHoldTicks, 0);
  assert.equal(state.phase, "playing");
});

test("falling after the first light resets only to checkpoint 800", () => {
  const state = holdBothUntilDrop(reachCheckpoint(800));
  assert.equal(state.phase, "release-gate");
  assert.equal(state.routeProgress, 800);
  assert.equal(state.checkpoint, 800);
  assert.deepEqual(state.reachedCheckpoints, [800]);
  assert.equal(state.feedback, "fell");
});

test("falling after the second light preserves both checkpoints", () => {
  const state = holdBothUntilDrop(reachCheckpoint(1600));
  assert.equal(state.phase, "release-gate");
  assert.equal(state.routeProgress, 1600);
  assert.equal(state.checkpoint, 1600);
  assert.deepEqual(state.reachedCheckpoints, [800, 1600]);
});

test("a fall discards the remaining ticks in its action", () => {
  let source = reachCheckpoint(800);
  if (!source.active.left) source = press(source, "left", "hold:left");
  if (!source.active.right) source = press(source, "right", "hold:right");
  const beforeTick = source.tick;
  const whole = tick(source, 2000);
  assert.equal(whole.phase, "release-gate");
  assert.ok(whole.tick - beforeTick < 2000);
  assert.equal(whole.revision - source.revision, whole.tick - beforeTick + 1);
});

test("release gate waits until both physical inputs are gone", () => {
  let state = holdBothUntilDrop(reachCheckpoint(800));
  const leftId = state.active.left.inputId;
  const rightId = state.active.right.inputId;
  state = release(state, leftId);
  assert.equal(state.phase, "release-gate");
  state = release(state, rightId);
  assert.equal(state.phase, "ready");
  assert.equal(state.readyKind, "retry");
});

test("RETRY resumes at the checkpoint and increments attempts", () => {
  let state = holdBothUntilDrop(reachCheckpoint(800));
  state = release(state, state.active.left.inputId);
  state = release(state, state.active.right.inputId);
  state = dispatch(state, "RETRY");
  assert.equal(state.phase, "playing");
  assert.equal(state.routeProgress, 800);
  assert.equal(state.attemptCount, 2);
});

test("a duplicate inputId is idempotent", () => {
  let state = press(started(), "left", "pointer:7");
  assert.strictEqual(press(state, "left", "pointer:7"), state);
  assert.strictEqual(press(state, "right", "pointer:7"), state);
});

test("an occupied seat rejects a second physical input", () => {
  const state = press(started(), "left", "pointer:7");
  assert.strictEqual(press(state, "left", "pointer:8"), state);
});

test("inputId is nonempty and capped at 80 characters", () => {
  const state = started();
  assert.strictEqual(press(state, "left", ""), state);
  assert.notStrictEqual(press(state, "left", "x".repeat(80)), state);
  assert.strictEqual(press(state, "left", "x".repeat(81)), state);
});

test("an old release cannot clear a newer input", () => {
  let state = press(started(), "left", "pointer:8");
  assert.strictEqual(release(state, "pointer:7"), state);
  assert.equal(state.active.left.inputId, "pointer:8");
});

test("releasing one side never clears the other", () => {
  let state = press(started(), "left", "pointer:11");
  state = press(state, "right", "pointer:12");
  state = release(state, "pointer:11");
  assert.equal(state.active.left, null);
  assert.equal(state.active.right.inputId, "pointer:12");
});

test("TICK fragmentation is deeply equal including revision", () => {
  let base = press(started(), "left", "key:KeyA");
  base = press(base, "right", "key:KeyL");
  const whole = tick(base, 50);
  let fragmented = base;
  for (let index = 0; index < 50; index += 1) fragmented = tick(fragmented, 1);
  assert.deepEqual(fragmented, whole);
});

for (const reason of ["manual", "hidden", "blur", "stalled"]) {
  test(`${reason} interruption clears physics and returns to the checkpoint`, () => {
    let state = reachCheckpoint(800);
    state = dispatch(state, "INTERRUPT", { reason });
    assert.equal(state.phase, "paused");
    assert.equal(state.pauseReason, reason);
    assert.equal(state.routeProgress, 800);
    assert.deepEqual(state.active, { left: null, right: null });
    assert.equal(state.leftLift, 0);
    assert.equal(state.rightLift, 0);
    assert.equal(state.ballPosition, 0);
    assert.equal(state.stableTicks, 0);
  });
}

test("unknown interruption reason normalizes to manual", () => {
  const state = dispatch(started(), "INTERRUPT", { reason: "network" });
  assert.equal(state.pauseReason, "manual");
});

test("repeated interruption preserves the first pause reason", () => {
  const paused = dispatch(started(), "INTERRUPT", { reason: "hidden" });
  assert.strictEqual(dispatch(paused, "INTERRUPT", { reason: "blur" }), paused);
  assert.equal(paused.pauseReason, "hidden");
});

test("RESUME always goes to ready/resume instead of half-tick playing", () => {
  let state = dispatch(reachCheckpoint(800), "INTERRUPT", { reason: "manual" });
  state = dispatch(state, "RESUME");
  assert.equal(state.phase, "ready");
  assert.equal(state.readyKind, "resume");
  assert.equal(state.routeProgress, 800);
  assert.strictEqual(tick(state, 1), state);
});

test("complete freezes input, release, tick and retry", () => {
  const state = reachableTrace().state;
  assert.strictEqual(press(state, "left", "key:KeyA"), state);
  assert.strictEqual(release(state, "key:KeyA"), state);
  assert.strictEqual(tick(state, 100), state);
  assert.strictEqual(dispatch(state, "RETRY"), state);
});

test("RESTART clears physics, checkpoints, attempts and inputs", () => {
  const complete = reachableTrace().state;
  const state = dispatch(complete, "RESTART");
  assert.equal(state.phase, "intro");
  assert.equal(state.tick, 0);
  assert.equal(state.routeProgress, 0);
  assert.equal(state.checkpoint, 0);
  assert.deepEqual(state.reachedCheckpoints, []);
  assert.equal(state.attemptCount, 1);
  assert.equal(state.revision, complete.revision + 1);
});

test("classifies KeyA and KeyL down as mirrored physical presses", () => {
  assert.deepEqual(classifySteadyKey("KeyA", "down", false), {
    type: "PRESS", side: "left", inputId: "key:KeyA",
  });
  assert.deepEqual(classifySteadyKey("KeyL", "down", false), {
    type: "PRESS", side: "right", inputId: "key:KeyL",
  });
});

test("classifies keyup as an exact release", () => {
  assert.deepEqual(classifySteadyKey("KeyL", "up", false), {
    type: "RELEASE", inputId: "key:KeyL",
  });
});

test("ignores repeated keydown but retains keyup", () => {
  assert.equal(classifySteadyKey("KeyA", "down", true), null);
  assert.deepEqual(classifySteadyKey("KeyA", "up", true), {
    type: "RELEASE", inputId: "key:KeyA",
  });
});

test("rejects unknown keys and malformed edges", () => {
  assert.equal(classifySteadyKey("KeyS", "down", false), null);
  assert.equal(classifySteadyKey("KeyA", "press", false), null);
  assert.equal(classifySteadyKey(null, "down", false), null);
});

test("the reachable production log replays to a deeply equal completion", () => {
  const trace = reachableTrace();
  const replayed = replaySteady(undefined, trace.actions);
  assert.deepEqual(replayed, trace.state);
});

test("replay is deterministic and never mutates nested actions", () => {
  const actions = [
    { type: "START" },
    { type: "PRESS", side: "left", inputId: "key:KeyA", meta: { source: "test" } },
    { type: "TICK", ticks: 3 },
  ];
  const snapshot = structuredClone(actions);
  const first = replaySteady({ leftName: "甲" }, actions);
  const second = replaySteady({ leftName: "甲" }, actions);
  assert.deepEqual(first, second);
  assert.deepEqual(actions, snapshot);
});

test("unknown and malformed actions preserve the original reference", () => {
  const state = started();
  assert.strictEqual(reduceSteady(state, null), state);
  assert.strictEqual(reduceSteady(state, []), state);
  assert.strictEqual(reduceSteady(state, { type: "UNKNOWN" }), state);
  assert.strictEqual(reduceSteady(state, { type: "PRESS", side: "middle", inputId: "x" }), state);
});

test("malformed tick counts are rejected", () => {
  const state = started();
  for (const ticks of [0, -1, 1.5, NaN, Infinity, "1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.strictEqual(tick(state, ticks), state);
  }
});

test("malformed authoritative state is safely rejected", () => {
  const malformed = { ...started(), ballVelocity: 73 };
  assert.strictEqual(reduceSteady(malformed, { type: "TICK", ticks: 1 }), malformed);
  assert.equal(getSteadyView(malformed), null);
});

test("view exposes finite clamped geometry and progress", () => {
  const view = getSteadyView(reachableTrace().state);
  for (const value of [
    view.seats.left.liftPercent,
    view.seats.right.liftPercent,
    view.beam.normalizedTilt,
    view.ball.normalizedPosition,
    view.journey.progressPercent,
  ]) assert.ok(Number.isFinite(value));
  assert.ok(view.seats.left.liftPercent >= 0 && view.seats.left.liftPercent <= 100);
  assert.ok(view.beam.normalizedTilt >= -1 && view.beam.normalizedTilt <= 1);
  assert.ok(view.ball.normalizedPosition >= -1 && view.ball.normalizedPosition <= 1);
  assert.equal(view.journey.progressPercent, 100);
});

test("view contains non-color seat, slope, ball and checkpoint labels", () => {
  const view = getSteadyView(reachCheckpoint(800));
  assert.equal(view.seats.left.key, "A");
  assert.equal(view.seats.right.key, "L");
  assert.match(view.beam.directionLabel, /横梁/);
  assert.match(view.ball.zoneLabel, /滚珠/);
  assert.match(view.journey.slopeLabel, /坡势/);
  assert.deepEqual(view.journey.reachedCheckpoints, [800]);
});

test("status priority explains support before lower-priority conditions", () => {
  const view = getSteadyView(started());
  assert.equal(view.statusText, "两边再一起托稳一点");
  assert.equal(view.stability.supported, false);
});

test("fall and pause status outrank ordinary stability", () => {
  const fallen = getSteadyView(holdBothUntilDrop(reachCheckpoint(800)));
  const paused = getSteadyView(dispatch(reachCheckpoint(800), "INTERRUPT", { reason: "manual" }));
  assert.match(fallen.statusText, /掉下来了/);
  assert.match(paused.statusText, /暂停/);
});

test("view language never assigns failure blame to a seat", () => {
  const states = [started(), holdBothUntilDrop(reachCheckpoint(800)), reachableTrace().state];
  for (const state of states) {
    const text = JSON.stringify(getSteadyView(state));
    assert.doesNotMatch(text, /左边害|右边害|谁做错|不够好|默契分/);
  }
});

test("view arrays and nested objects cannot mutate authority", () => {
  const state = reachCheckpoint(800);
  const view = getSteadyView(state);
  view.names.left = "changed";
  view.journey.reachedCheckpoints[0] = 999;
  view.stability.supported = false;
  assert.equal(state.config.leftName, DEFAULT_CONFIG.leftName);
  assert.deepEqual(state.reachedCheckpoints, [800]);
  assert.equal(getSteadyView(state).journey.reachedCheckpoints[0], 800);
});

test("presentation-only action fields never enter reducer state", () => {
  const state = replaySteady(undefined, [
    { type: "START", viewport: "390x844", reducedMotion: true },
    { type: "TICK", ticks: 1, forcedColors: true, assetLoaded: false },
  ]);
  for (const key of ["viewport", "reducedMotion", "forcedColors", "assetLoaded"]) {
    assert.equal(key in state, false);
  }
});
