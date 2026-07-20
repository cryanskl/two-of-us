"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import "./config.js";
import "./logic.js";

const logic = globalThis.TogetherZipperLogic;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new Set()) {
  if ((!value || typeof value !== "object") && typeof value !== "function") return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) assertDeepFrozen(descriptor.value, seen);
  }
}

function dispatch(state, action, log) {
  if (log) log.push(clone(action));
  return logic.reduce(state, action);
}

function stepTicks(state, ticks, log) {
  let current = state;
  let remaining = ticks;
  while (remaining > 0) {
    const amount = Math.min(logic.MAX_STEP_TICKS, remaining);
    current = dispatch(current, { type: "STEP", ticks: amount }, log);
    remaining -= amount;
  }
  return current;
}

function firstPlaying(log) {
  let state = logic.createInitialState();
  state = dispatch(state, { type: "START" }, log);
  return dispatch(state, { type: "BEGIN_SECTION" }, log);
}

function playingAtSection(targetSectionIndex) {
  let state = firstPlaying();
  for (let sectionIndex = 0; sectionIndex < targetSectionIndex; sectionIndex += 1) {
    const section = logic.SECTIONS[sectionIndex];
    for (let toothIndex = 0; toothIndex < section.toothCount; toothIndex += 1) {
      state = finishFeedback(succeedCurrentTooth(state, section.targetTick));
    }
    state = logic.reduce(state, { type: "NEXT_SECTION" });
    state = logic.reduce(state, { type: "BEGIN_SECTION" });
  }
  return state;
}

function stepTo(state, tick, log) {
  assert.equal(state.phase, "playing");
  assert.ok(tick >= state.beatTick);
  return stepTicks(state, tick - state.beatTick, log);
}

function succeedCurrentTooth(state, tick, log) {
  let current = stepTo(state, tick, log);
  current = dispatch(current, { type: "PULL", seat: 0 }, log);
  return dispatch(current, { type: "PULL", seat: 1 }, log);
}

function finishFeedback(state, log) {
  return stepTicks(state, logic.FEEDBACK_TICKS, log);
}

function playAll({ jamFirstOfEachSection = false, log } = {}) {
  let state = firstPlaying(log);
  for (let sectionIndex = 0; sectionIndex < logic.SECTIONS.length; sectionIndex += 1) {
    const section = logic.SECTIONS[sectionIndex];
    for (let toothIndex = 0; toothIndex < section.toothCount; toothIndex += 1) {
      if (jamFirstOfEachSection && toothIndex === 0) {
        state = dispatch(state, { type: "PULL", seat: sectionIndex % 2 }, log);
        assert.equal(state.phase, "jammed");
        state = finishFeedback(state, log);
        assert.equal(state.attempt, 2);
      }
      state = succeedCurrentTooth(state, section.targetTick, log);
      assert.equal(state.phase, "tooth-result");
      state = finishFeedback(state, log);
    }
    assert.equal(state.phase, "section-result");
    state = dispatch(state, { type: "NEXT_SECTION" }, log);
    if (sectionIndex < logic.SECTIONS.length - 1) {
      assert.equal(state.phase, "section-intro");
      state = dispatch(state, { type: "BEGIN_SECTION" }, log);
    }
  }
  return state;
}

test("exports the frozen zipper constants, seven phases and six jam reasons", () => {
  assert.equal(logic.TICKS_PER_SECOND, 30);
  assert.equal(logic.MAX_STEP_TICKS, 5);
  assert.equal(logic.FEEDBACK_TICKS, 12);
  assert.equal(logic.SECTION_COUNT, 3);
  assert.equal(logic.TOTAL_TEETH, 15);
  assert.equal(logic.SEAT_LEFT, 0);
  assert.equal(logic.SEAT_RIGHT, 1);
  assert.deepEqual(logic.PHASES, ["intro", "section-intro", "playing", "tooth-result", "jammed", "section-result", "complete"]);
  assert.deepEqual(logic.JAM_REASONS, ["early-left", "early-right", "apart", "missed-left", "missed-right", "missed-both"]);
  assertDeepFrozen(logic);
});

test("classic wrappers expose the exact browser global and CommonJS config dependency", () => {
  const context = createContext({});
  const execute = (name) => runInContext(readFileSync(new URL(name, import.meta.url), "utf8"), context, { filename: name });
  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = () => { throw new Error("config must be standalone"); };
  execute("config.js");
  const commonConfig = context.module.exports;

  context.TOGETHER_ZIPPER_CONFIG = undefined;
  const required = [];
  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = (specifier) => { required.push(specifier); return commonConfig; };
  execute("logic.js");
  assert.deepEqual(required, ["./config.js"]);
  assert.strictEqual(context.TogetherZipperLogic, context.module.exports);
  assert.equal(context.module.exports.TOTAL_TEETH, 15);
  assert.deepEqual(Array.from(context.module.exports.ACTIVE_CONFIG.seats), ["你", "我"]);
});

test("freezes the exact 4/5/6 sections and the ordered 15-tooth route", () => {
  assert.deepEqual(logic.SECTIONS, [
    { id: "first-stitch", title: "起针·并肩", note: "先不用着急，让两边找到彼此。", toothCount: 4, targetTick: 42, timingRadius: 9, syncThreshold: 5 },
    { id: "through-rain", title: "穿雨·同拍", note: "雨声近一点，我们也近一点。", toothCount: 5, targetTick: 36, timingRadius: 8, syncThreshold: 4 },
    { id: "coming-home", title: "收尾·归心", note: "最后几齿，把两边稳稳带回家。", toothCount: 6, targetTick: 30, timingRadius: 7, syncThreshold: 3 },
  ]);
  assert.equal(logic.TOOTH_ROUTE.length, 15);
  assert.deepEqual(logic.TOOTH_ROUTE.map((item) => item.toothId), [
    "first-stitch-tooth-1", "first-stitch-tooth-2", "first-stitch-tooth-3", "first-stitch-tooth-4",
    "through-rain-tooth-1", "through-rain-tooth-2", "through-rain-tooth-3", "through-rain-tooth-4", "through-rain-tooth-5",
    "coming-home-tooth-1", "coming-home-tooth-2", "coming-home-tooth-3", "coming-home-tooth-4", "coming-home-tooth-5", "coming-home-tooth-6",
  ]);
  assertDeepFrozen(logic.SECTIONS);
  assertDeepFrozen(logic.TOOTH_ROUTE);
});

test("validates only the complete frozen section table and falls back atomically", () => {
  assert.equal(logic.validateSections(clone(logic.SECTIONS)), true);
  const cases = [];
  cases.push(null, {}, clone(logic.SECTIONS).slice(0, 2));
  const extra = clone(logic.SECTIONS); extra[0].extra = true; cases.push(extra);
  const duplicate = clone(logic.SECTIONS); duplicate[1].id = duplicate[0].id; cases.push(duplicate);
  const total = clone(logic.SECTIONS); total[2].toothCount = 5; cases.push(total);
  const nonInteger = clone(logic.SECTIONS); nonInteger[0].targetTick = 42.5; cases.push(nonInteger);
  const negativeWindow = clone(logic.SECTIONS); negativeWindow[0].timingRadius = 43; cases.push(negativeWindow);
  const threshold = clone(logic.SECTIONS); threshold[0].syncThreshold = 10; cases.push(threshold);
  const reordered = clone(logic.SECTIONS); reordered.reverse(); cases.push(reordered);
  const getter = clone(logic.SECTIONS);
  Object.defineProperty(getter[0], "title", { enumerable: true, get() { throw new Error("no"); } });
  cases.push(getter);
  cases.forEach((sections) => {
    assert.equal(logic.validateSections(sections), false);
    const normalized = logic.normalizeSections(sections);
    assert.deepEqual(normalized, logic.SECTIONS);
    assert.notStrictEqual(normalized, logic.SECTIONS);
    assertDeepFrozen(normalized);
  });
});

test("resolvePulls handles waiting, closed threshold boundaries, apart and invalid input", () => {
  const section = logic.SECTIONS[0];
  assert.deepEqual(logic.resolvePulls(section, 33, null, null), { status: "waiting", leftPullTick: null, rightPullTick: null, gap: null });
  assert.deepEqual(logic.resolvePulls(section, 38, 33, null), { status: "waiting", leftPullTick: 33, rightPullTick: null, gap: null });
  assert.deepEqual(logic.resolvePulls(section, 38, 33, 38), { status: "success", leftPullTick: 33, rightPullTick: 38, gap: 5 });
  assert.deepEqual(logic.resolvePulls(section, 39, 33, 39), { status: "apart", leftPullTick: 33, rightPullTick: 39, gap: 6 });
  for (const args of [
    [section, -1, null, null], [section, 52, null, null], [section, 40, 32, null],
    [section, 40, 41, null], [{ ...section, targetTick: 41 }, 40, null, null], [null, 40, null, null],
  ]) assert.deepEqual(logic.resolvePulls(...args), { status: "invalid", leftPullTick: null, rightPullTick: null, gap: null });
  assertDeepFrozen(logic.resolvePulls(section, 38, 33, 38));
});

test("normalizes Unicode seat names and rejects duplicate, accessor and extra elements", () => {
  const config = logic.normalizeConfig({
    seats: [`  ${"😀".repeat(15)}  `, "  阿针  "],
    composeCompletionNote: () => "好",
  });
  assert.deepEqual(config.seats, ["😀".repeat(12), "阿针"]);
  assert.equal(config.composeCompletionNote({}), "好");
  assertDeepFrozen(config);
  assert.deepEqual(logic.normalizeConfig({ seats: ["同名", "同名"] }).seats, ["你", "我"]);
  assert.deepEqual(logic.normalizeConfig({ seats: ["你", "我", "它"] }).seats, ["你", "我"]);
  const getter = {};
  Object.defineProperty(getter, "seats", { enumerable: true, get() { throw new Error("no"); } });
  assert.deepEqual(logic.normalizeConfig(getter).seats, ["你", "我"]);
});

test("creates the exact frozen intro and traverses all seven phases", () => {
  const intro = logic.createInitialState();
  assert.deepEqual(intro, {
    phase: "intro", sectionIndex: 0, toothIndex: 0, beatTick: 0, pullTicks: [null, null],
    resultTick: 0, attempt: 1, lastResult: null, completedTeeth: [], revision: 0,
  });
  let state = logic.reduce(intro, { type: "START" });
  assert.equal(state.phase, "section-intro");
  state = logic.reduce(state, { type: "BEGIN_SECTION" });
  assert.equal(state.phase, "playing");
  const jammed = logic.reduce(state, { type: "PULL", seat: 0 });
  assert.equal(jammed.phase, "jammed");
  state = succeedCurrentTooth(state, 42);
  assert.equal(state.phase, "tooth-result");
  for (let tooth = 0; tooth < 4; tooth += 1) {
    if (tooth > 0) state = succeedCurrentTooth(state, 42);
    state = finishFeedback(state);
  }
  assert.equal(state.phase, "section-result");
  assert.equal(playAll().phase, "complete");
  assertDeepFrozen(intro);
});

test("window start and final window tick are both valid pull moments", () => {
  let startState = firstPlaying();
  startState = succeedCurrentTooth(startState, 33);
  assert.equal(startState.phase, "tooth-result");
  assert.deepEqual(startState.lastResult, { status: "success", reason: null, leftPullTick: 33, rightPullTick: 33, gap: 0 });

  let endState = firstPlaying();
  endState = succeedCurrentTooth(endState, 51);
  assert.equal(endState.phase, "tooth-result");
  assert.deepEqual(endState.lastResult, { status: "success", reason: null, leftPullTick: 51, rightPullTick: 51, gap: 0 });
});

test("early pulls produce symmetric left and right reasons without recording the tick", () => {
  for (const [seat, reason] of [[0, "early-left"], [1, "early-right"]]) {
    const state = logic.reduce(firstPlaying(), { type: "PULL", seat });
    assert.equal(state.phase, "jammed");
    assert.deepEqual(state.lastResult, { status: "jammed", reason, leftPullTick: null, rightPullTick: null, gap: null });
    assert.equal(state.completedTeeth.length, 0);
  }
});

test("apart fires immediately when the second valid pull exceeds the sync threshold", () => {
  let state = stepTo(firstPlaying(), 33);
  state = logic.reduce(state, { type: "PULL", seat: 0 });
  state = stepTo(state, 39);
  state = logic.reduce(state, { type: "PULL", seat: 1 });
  assert.equal(state.phase, "jammed");
  assert.deepEqual(state.lastResult, { status: "jammed", reason: "apart", leftPullTick: 33, rightPullTick: 39, gap: 6 });
});

test("crossing the closed window emits missed-left, missed-right and missed-both", () => {
  const cases = [
    { seat: 1, reason: "missed-left", left: null, right: 51 },
    { seat: 0, reason: "missed-right", left: 51, right: null },
    { seat: null, reason: "missed-both", left: null, right: null },
  ];
  for (const item of cases) {
    let state = stepTo(firstPlaying(), 51);
    if (item.seat !== null) state = logic.reduce(state, { type: "PULL", seat: item.seat });
    state = logic.reduce(state, { type: "STEP", ticks: 1 });
    assert.equal(state.phase, "jammed");
    assert.deepEqual(state.lastResult, {
      status: "jammed", reason: item.reason, leftPullTick: item.left, rightPullTick: item.right, gap: null,
    });
  }
});

test("same-seat repeat is a no-op and cannot substitute for the other seat", () => {
  let state = stepTo(firstPlaying(), 42);
  state = logic.reduce(state, { type: "PULL", seat: 0 });
  const repeated = logic.reduce(state, { type: "PULL", seat: 0 });
  assert.strictEqual(repeated, state);
  assert.equal(state.phase, "playing");
  assert.deepEqual(state.pullTicks, [42, null]);
  state = stepTo(state, 51);
  state = logic.reduce(state, { type: "STEP", ticks: 1 });
  assert.equal(state.lastResult.reason, "missed-right");
});

test("STEP accepts only 1..5 safe ticks and advances one revision per action", () => {
  const state = firstPlaying();
  const advanced = logic.reduce(state, { type: "STEP", ticks: 5 });
  assert.equal(advanced.beatTick, 5);
  assert.equal(advanced.revision, state.revision + 1);
  for (const ticks of [0, 6, 1.5, "1", Number.MAX_SAFE_INTEGER]) {
    assert.strictEqual(logic.reduce(state, { type: "STEP", ticks }), state);
  }
});

test("STEP drops remaining ticks immediately after a window phase transition", () => {
  let state = stepTo(firstPlaying(), 49);
  state = logic.reduce(state, { type: "STEP", ticks: 5 });
  assert.equal(state.phase, "jammed");
  assert.equal(state.resultTick, 0);
  assert.equal(state.lastResult.reason, "missed-both");
});

test("success feedback closes on tick 12 without leaking STEP remainder into the next tooth", () => {
  let state = succeedCurrentTooth(firstPlaying(), 42);
  state = stepTicks(state, 11);
  assert.equal(state.phase, "tooth-result");
  assert.equal(state.resultTick, 11);
  state = logic.reduce(state, { type: "STEP", ticks: 5 });
  assert.equal(state.phase, "playing");
  assert.equal(state.toothIndex, 1);
  assert.equal(state.beatTick, 0);
  assert.equal(state.resultTick, 0);
});

test("jam feedback closes on tick 12, retries the same tooth and clears both pulls", () => {
  let state = logic.reduce(firstPlaying(), { type: "PULL", seat: 0 });
  state = stepTicks(state, 11);
  assert.equal(state.phase, "jammed");
  assert.equal(state.resultTick, 11);
  state = logic.reduce(state, { type: "STEP", ticks: 5 });
  assert.equal(state.phase, "playing");
  assert.equal(state.toothIndex, 0);
  assert.equal(state.attempt, 2);
  assert.equal(state.beatTick, 0);
  assert.deepEqual(state.pullTicks, [null, null]);
  assert.equal(state.completedTeeth.length, 0);
});

test("a failed next tooth preserves the already completed prefix", () => {
  let state = finishFeedback(succeedCurrentTooth(firstPlaying(), 42));
  assert.equal(state.toothIndex, 1);
  assert.equal(state.completedTeeth.length, 1);
  const first = state.completedTeeth[0];
  state = logic.reduce(state, { type: "PULL", seat: 1 });
  assert.equal(state.phase, "jammed");
  assert.equal(state.completedTeeth.length, 1);
  assert.deepEqual(state.completedTeeth[0], first);
  assert.notStrictEqual(state.completedTeeth[0], first);
});

test("section boundaries are exactly 4, 5 and 6 successful teeth", () => {
  let state = firstPlaying();
  let completed = 0;
  for (let sectionIndex = 0; sectionIndex < 3; sectionIndex += 1) {
    const count = logic.SECTIONS[sectionIndex].toothCount;
    for (let tooth = 0; tooth < count; tooth += 1) {
      state = finishFeedback(succeedCurrentTooth(state, logic.SECTIONS[sectionIndex].targetTick));
      completed += 1;
    }
    assert.equal(state.phase, "section-result");
    assert.equal(state.completedTeeth.length, completed);
    state = logic.reduce(state, { type: "NEXT_SECTION" });
    if (sectionIndex < 2) state = logic.reduce(state, { type: "BEGIN_SECTION" });
  }
  assert.equal(state.phase, "complete");
  assert.equal(state.completedTeeth.length, 15);
});

test("the minimum all-success route summarizes 15 attempts and zero jams", () => {
  const state = playAll();
  const summary = logic.completionSummary(state, { seats: ["岚", "月"] });
  assert.deepEqual(summary, {
    seats: ["岚", "月"],
    totalTeeth: 15,
    totalAttempts: 15,
    jams: 0,
    sections: [
      { id: "first-stitch", title: "起针·并肩", teeth: 4, attempts: 4, jams: 0 },
      { id: "through-rain", title: "穿雨·同拍", teeth: 5, attempts: 5, jams: 0 },
      { id: "coming-home", title: "收尾·归心", teeth: 6, attempts: 6, jams: 0 },
    ],
  });
  assertDeepFrozen(summary);
});

test("one jam in each section yields per-section and total cooperative attempts", () => {
  const state = playAll({ jamFirstOfEachSection: true });
  const summary = logic.completionSummary(state, { seats: ["岚", "月"] });
  assert.equal(summary.totalAttempts, 18);
  assert.equal(summary.jams, 3);
  assert.deepEqual(summary.sections.map(({ attempts, jams }) => [attempts, jams]), [[5, 1], [6, 1], [7, 1]]);
  assert.equal(state.completedTeeth.filter((tooth) => tooth.attempts === 2).length, 3);
});

test("a fixed single seat cannot complete a tooth in any section", () => {
  for (let sectionIndex = 0; sectionIndex < logic.SECTIONS.length; sectionIndex += 1) {
    const section = logic.SECTIONS[sectionIndex];
    for (const [seat, reason] of [[0, "missed-right"], [1, "missed-left"]]) {
      let state = playingAtSection(sectionIndex);
      const prefixLength = state.completedTeeth.length;
      state = stepTo(state, section.targetTick);
      state = logic.reduce(state, { type: "PULL", seat });
      state = stepTo(state, section.targetTick + section.timingRadius);
      state = logic.reduce(state, { type: "STEP", ticks: 1 });
      assert.equal(state.phase, "jammed");
      assert.equal(state.lastResult.reason, reason);
      assert.equal(state.completedTeeth.length, prefixLength);
    }
  }
});

test("public view derives timing, readiness, controls, summaries and frozen copies", () => {
  let state = stepTo(firstPlaying(), 42);
  state = logic.reduce(state, { type: "PULL", seat: 0 });
  const view = logic.getPublicView(state);
  assert.equal(view.phase, "playing");
  assert.deepEqual(view.section, { index: 0, total: 3, id: "first-stitch", title: "起针·并肩", note: "先不用着急，让两边找到彼此。", toothCount: 4 });
  assert.deepEqual(view.tooth, { index: 0, number: 1, totalInSection: 4, completedTotal: 0, total: 15 });
  assert.deepEqual(view.timing, {
    beatTick: 42, targetTick: 42, windowStart: 33, windowEnd: 51, syncThreshold: 5,
    trackEndTick: 51, progressPermille: 823, isWindowOpen: true,
  });
  assert.deepEqual(view.pulls, { left: "ready", right: "waiting", leftTick: 42, rightTick: null });
  assert.equal(view.controls.canPull, true);
  assert.equal(view.announcementCode, "left-ready");
  assertDeepFrozen(view);
  const success = logic.reduce(state, { type: "PULL", seat: 1 });
  const successView = logic.getPublicView(success);
  assert.notStrictEqual(successView.lastResult, success.lastResult);
  assert.deepEqual(successView.lastResult, success.lastResult);
  assert.equal(logic.getPublicView({ phase: "playing" }), null);
});

test("public feedback and completed section progress are pure state projections", () => {
  let jammed = logic.reduce(firstPlaying(), { type: "PULL", seat: 1 });
  jammed = logic.reduce(jammed, { type: "STEP", ticks: 5 });
  const jamView = logic.getPublicView(jammed);
  assert.equal(jamView.feedbackProgressPermille, 416);
  assert.equal(jamView.announcementCode, "jam-early-right");
  assert.equal(jamView.controls.canPull, false);

  const complete = playAll();
  const completeView = logic.getPublicView(complete);
  assert.equal(completeView.completedSections.length, 3);
  assert.equal(completeView.totalAttempts, 15);
  assert.equal(completeView.jams, 0);
  assert.equal(completeView.controls.canRestart, true);
});

test("completion composer receives a frozen isolated summary and fails closed", () => {
  const state = playAll();
  const summary = logic.completionSummary(state, { seats: ["岚", "月"] });
  const fallback = "岚和月，往后的日子，也把两边慢慢拉成我们。";
  let received;
  assert.equal(logic.resolveCompletionNote((value) => {
    received = value;
    return `${value.seats[0]}和${value.seats[1]}把十五齿都合好了。`;
  }, summary), "岚和月把十五齿都合好了。");
  assertDeepFrozen(received);
  assert.notStrictEqual(received, summary);
  assert.notStrictEqual(received.sections, summary.sections);
  assert.equal(logic.resolveCompletionNote(() => " ", summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => "长".repeat(121), summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => Promise.resolve("异步"), summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => { throw new Error("no"); }, summary), fallback);
  assert.equal(logic.resolveCompletionNote((value) => { value.sections[0].attempts = 0; return "不采用"; }, summary), fallback);
  assert.equal(summary.sections[0].attempts, 4);
  const hostile = clone(summary);
  Object.defineProperty(hostile, "seats", { enumerable: true, get() { throw new Error("no"); } });
  assert.equal(logic.resolveCompletionNote(() => "不采用", hostile), logic.DEFAULT_COMPLETION_NOTE);
});

test("actions require an exact clean data schema", () => {
  const valid = [
    { type: "START" }, { type: "BEGIN_SECTION" }, { type: "PULL", seat: 0 },
    { type: "PULL", seat: 1 }, { type: "STEP", ticks: 5 }, { type: "NEXT_SECTION" }, { type: "RESTART" },
  ];
  valid.forEach((action) => assert.equal(logic.validAction(action), true));
  const symbol = { type: "START" }; symbol[Symbol("extra")] = true;
  const getter = {}; Object.defineProperty(getter, "type", { enumerable: true, get() { throw new Error("no"); } });
  const polluted = Object.create({ inherited: true }); polluted.type = "START";
  for (const action of [
    null, [], Object.assign(Object.create(null), { type: "START" }), symbol, getter, polluted,
    { type: "START", extra: true }, { type: "PULL", seat: "0" }, { type: "STEP", ticks: 0 }, { type: "UNKNOWN" },
  ]) assert.equal(logic.validAction(action), false);
});

test("malformed state returns a new intro while malformed actions preserve a legal reference", () => {
  const legal = firstPlaying();
  for (const action of [null, { type: "PULL", seat: 2 }, { type: "STEP", ticks: 6 }, { type: "START", extra: true }]) {
    assert.strictEqual(logic.reduce(legal, action), legal);
  }
  const malformed = clone(legal);
  malformed.completedTeeth.push({ fake: true });
  const recovered = logic.reduce(malformed, { type: "PULL", seat: 0 });
  assert.deepEqual(recovered, logic.createInitialState());
  assert.notStrictEqual(recovered, logic.createInitialState());
  const hostile = clone(legal);
  Object.defineProperty(hostile, "phase", { enumerable: true, get() { throw new Error("no"); } });
  assert.deepEqual(logic.reduce(hostile, { type: "START" }), logic.createInitialState());
});

test("revision changes only on real actions and MAX_SAFE_INTEGER blocks every mutation", () => {
  const state = stepTo(firstPlaying(), 42);
  const left = logic.reduce(state, { type: "PULL", seat: 0 });
  assert.equal(left.revision, state.revision + 1);
  assert.strictEqual(logic.reduce(left, { type: "PULL", seat: 0 }), left);
  const maxed = clone(left);
  maxed.revision = Number.MAX_SAFE_INTEGER;
  assert.equal(logic.isTogetherZipperState(maxed), true);
  assert.strictEqual(logic.reduce(maxed, { type: "PULL", seat: 1 }), maxed);
  assert.strictEqual(logic.reduce(maxed, { type: "STEP", ticks: 1 }), maxed);
  assert.strictEqual(logic.reduce(maxed, { type: "RESTART" }), maxed);
});

test("RESTART resets every active phase but is a no-op on intro", () => {
  const intro = logic.createInitialState();
  assert.strictEqual(logic.reduce(intro, { type: "RESTART" }), intro);
  const states = [];
  const sectionIntro = logic.reduce(intro, { type: "START" }); states.push(sectionIntro);
  const playing = logic.reduce(sectionIntro, { type: "BEGIN_SECTION" }); states.push(playing);
  states.push(logic.reduce(playing, { type: "PULL", seat: 0 }));
  states.push(succeedCurrentTooth(playing, 42));
  states.push(playAll({ jamFirstOfEachSection: false }));
  states.forEach((state) => assert.deepEqual(logic.reduce(state, { type: "RESTART" }), intro));
});

test("classifyPullKey reads inherited native-style accessors and rejects repeat or hostile getters", () => {
  const event = (code, repeat = false) => Object.create({
    get code() { return code; },
    get repeat() { return repeat; },
  });
  assert.deepEqual(logic.classifyPullKey(event("KeyF")), { type: "PULL", seat: 0 });
  assert.deepEqual(logic.classifyPullKey(event("KeyJ")), { type: "PULL", seat: 1 });
  assert.equal(logic.classifyPullKey(event("KeyF", true)), null);
  assert.equal(logic.classifyPullKey(event("KeyA")), null);
  assert.equal(logic.classifyPullKey(null), null);
  const hostile = Object.create({ get code() { throw new Error("no"); }, get repeat() { return false; } });
  assert.equal(logic.classifyPullKey(hostile), null);
});

test("the same complete action log replays to a deeply equal state", () => {
  const actions = [];
  const completed = playAll({ jamFirstOfEachSection: true, log: actions });
  const replayed = logic.replay(actions);
  assert.deepEqual(replayed, completed);
  assert.notStrictEqual(replayed, completed);
  assertDeepFrozen(replayed);
  actions[0].type = "RESTART";
  assert.equal(replayed.phase, "complete");
});

test("production logic has no clock, RAF, DOM, network, storage, random or test hook", () => {
  const source = readFileSync(new URL("logic.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bDate\b|Math\.random|requestAnimationFrame|document\.|window\.|fetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|serviceWorker|__test|testOnly|import\s*\(/);
});
