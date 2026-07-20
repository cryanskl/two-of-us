"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import "./config.js";
import "./levels.js";
import "./logic.js";

const logic = globalThis.MoonBasePowerLogic;
const levels = globalThis.MoonBasePowerLevels;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeepFrozen);
}

function operatingState(shiftIndex = 0, completedShifts = []) {
  let state = logic.ready(logic.start(logic.createInitialState()));
  if (shiftIndex === 0) return state;
  const solutions = levels.map((level) => logic.enumerateSolutions(level)[0]);
  for (let index = 0; index < shiftIndex; index += 1) {
    state = applyControls(state, solutions[index]);
    for (let tick = 0; tick < 90; tick += 1) state = logic.tick(state);
    state = logic.ready(logic.nextShift(state));
  }
  assert.deepEqual(state.completedShifts, completedShifts.length ? completedShifts : state.completedShifts);
  return state;
}

function applyControls(state, controls) {
  if (state.controls.solarOn !== controls.solarOn) state = logic.toggleFeed(state, "solar");
  if (state.controls.batteryOn !== controls.batteryOn) state = logic.toggleFeed(state, "battery");
  state = logic.setTie(state, controls.tie);
  for (const load of logic.LOADS) state = logic.setLoad(state, load, controls[load]);
  return state;
}

function completeGame() {
  let state = logic.ready(logic.start(logic.createInitialState()));
  for (let index = 0; index < levels.length; index += 1) {
    state = applyControls(state, logic.enumerateSolutions(levels[index])[0]);
    for (let tick = 0; tick < 90; tick += 1) state = logic.tick(state);
    if (index < levels.length - 1) state = logic.ready(logic.nextShift(state));
  }
  return state;
}

test("exports the frozen fixed rule contract", () => {
  assert.equal(logic.TICK_RATE, 30);
  assert.equal(logic.STABLE_TICKS_REQUIRED, 90);
  assert.equal(logic.TRANSFER_CAPACITY, 2);
  assert.equal(logic.MAX_CATCH_UP_TICKS, 5);
  assert.deepEqual(logic.PAUSE_REASONS, ["manual", "hidden", "blur", "long-frame"]);
  assertDeepFrozen(logic);
});

test("classic UMD wrappers expose CommonJS and logic resolves both dependencies through require", () => {
  const context = createContext({});
  const execute = (name) => runInContext(
    readFileSync(new URL(name, import.meta.url), "utf8"),
    context,
    { filename: name },
  );

  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = () => { throw new Error("config must not require dependencies"); };
  execute("config.js");
  const commonConfig = context.module.exports;
  assert.equal(typeof commonConfig.composeCompletionNote, "function");

  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = () => { throw new Error("levels must not require dependencies"); };
  execute("levels.js");
  const commonLevels = context.module.exports;
  assert.equal(commonLevels.length, 3);

  context.MoonBasePowerConfig = undefined;
  context.MoonBasePowerLevels = undefined;
  const required = [];
  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = (specifier) => {
    required.push(specifier);
    if (specifier === "./levels.js") return commonLevels;
    if (specifier === "./config.js") return commonConfig;
    throw new Error(`unexpected require: ${specifier}`);
  };
  execute("logic.js");
  const commonLogic = context.module.exports;

  assert.deepEqual(required, ["./levels.js", "./config.js"]);
  assert.strictEqual(commonLogic.LEVELS, commonLevels);
  assert.equal(commonLogic.enumerateControlVectors().length, 324);
  assert.deepEqual(Array.from(commonLevels, (level) => commonLogic.enumerateSolutions(level).length), [1, 1, 1]);
  assert.equal(commonLogic.sanitizeConfig(commonConfig).completionTitle, "三次交接，月面没有熄灯");
});

test("freezes the exact three levels without sharing mutable caller data", () => {
  assert.deepEqual(levels.map((level) => ({
    id: level.id,
    number: level.number,
    supply: level.supply,
    demand: level.demand,
    allowedBuses: level.allowedBuses,
    tieRequirement: level.tieRequirement,
    transferCapacity: level.transferCapacity,
  })), [
    { id: "daylight", number: 1, supply: { L: 3, R: 5 }, demand: { oxygen: 4, lights: 1, comms: 3 }, allowedBuses: { oxygen: ["L", "R"], lights: ["L", "R"], comms: ["L", "R"] }, tieRequirement: "off", transferCapacity: 2 },
    { id: "shadow", number: 2, supply: { L: 5, R: 3 }, demand: { oxygen: 4, lights: 1, comms: 3 }, allowedBuses: { oxygen: ["L", "R"], lights: ["L", "R"], comms: ["L", "R"] }, tieRequirement: "off", transferCapacity: 2 },
    { id: "earth-window", number: 3, supply: { L: 4, R: 4 }, demand: { oxygen: 5, lights: 1, comms: 2 }, allowedBuses: { oxygen: ["R"], lights: ["L"], comms: ["L", "R"] }, tieRequirement: "transfer", transferCapacity: 2 },
  ]);
  assertDeepFrozen(levels);
  assert.notStrictEqual(levels[0].allowedBuses.oxygen, levels[1].allowedBuses.oxygen);
  assert.equal(logic.validLevel(clone(levels[2])), true);
  assert.equal(logic.validLevel({ ...clone(levels[0]), extra: true }), false);
});

test("rejects every malformed level boundary", () => {
  const cases = [];
  const negative = clone(levels[0]); negative.supply.L = -1; cases.push(negative);
  const duplicateBus = clone(levels[0]); duplicateBus.allowedBuses.oxygen = ["L", "L"]; cases.push(duplicateBus);
  const invalidBus = clone(levels[0]); invalidBus.allowedBuses.lights = ["moon"]; cases.push(invalidBus);
  const emptyAllowed = clone(levels[0]); emptyAllowed.allowedBuses.comms = []; cases.push(emptyAllowed);
  const wrongNumber = clone(levels[0]); wrongNumber.number = 0; cases.push(wrongNumber);
  const wrongCapacity = clone(levels[0]); wrongCapacity.transferCapacity = 3; cases.push(wrongCapacity);
  cases.push({ ...clone(levels[0]), extra: true });
  cases.forEach((level) => {
    assert.equal(logic.validLevel(level), false);
    assert.strictEqual(logic.evaluateGrid(level, logic.DEFAULT_CONTROLS), logic.INVALID_EVALUATION);
  });
});

test("enumerates 324 unique raw vectors in frozen order", () => {
  const vectors = logic.enumerateControlVectors();
  assert.equal(vectors.length, 324);
  assert.equal(new Set(vectors.map(JSON.stringify)).size, 324);
  assert.deepEqual(vectors[0], logic.DEFAULT_CONTROLS);
  assert.deepEqual(vectors.at(-1), { solarOn: true, batteryOn: true, tie: "R-to-L", oxygen: "R", lights: "R", comms: "R" });
  assertDeepFrozen(vectors);
});

test("all three levels have exactly one frozen production-evaluator solution", () => {
  const expected = [
    { solarOn: true, batteryOn: true, tie: "off", oxygen: "R", lights: "R", comms: "L" },
    { solarOn: true, batteryOn: true, tie: "off", oxygen: "L", lights: "L", comms: "R" },
    { solarOn: true, batteryOn: true, tie: "L-to-R", oxygen: "R", lights: "L", comms: "L" },
  ];
  levels.forEach((level, index) => {
    const solutions = logic.enumerateSolutions(level);
    assert.deepEqual(solutions, [expected[index]]);
    assert.equal(logic.evaluateGrid(level, solutions[0]).isSafe, true);
    assertDeepFrozen(solutions);
  });
  assert.equal(logic.evaluateGrid(levels[2], expected[2]).transfer.amount, 1);
});

test("the first unique solution mirrors into the second unique solution", () => {
  const first = logic.enumerateSolutions(levels[0])[0];
  const swapBus = (value) => value === "L" ? "R" : value === "R" ? "L" : value;
  const swapTie = (value) => value === "L-to-R" ? "R-to-L" : value === "R-to-L" ? "L-to-R" : value;
  const mirrored = {
    solarOn: first.batteryOn,
    batteryOn: first.solarOn,
    tie: swapTie(first.tie),
    oxygen: swapBus(first.oxygen),
    lights: swapBus(first.lights),
    comms: swapBus(first.comms),
  };
  assert.deepEqual(mirrored, logic.enumerateSolutions(levels[1])[0]);
});

test("evaluates local surplus, one-way transfer and strict conservation", () => {
  const evaluation = logic.evaluateGrid(levels[2], logic.enumerateSolutions(levels[2])[0]);
  assert.deepEqual(evaluation.local, {
    L: { supply: 4, demand: 3, surplus: 1, deficit: 0 },
    R: { supply: 4, demand: 5, surplus: 0, deficit: 1 },
  });
  assert.deepEqual(evaluation.transfer, { direction: "L-to-R", from: "L", to: "R", amount: 1, capacity: 2 });
  assert.deepEqual(evaluation.final, {
    L: { supplied: 3, demand: 3, surplus: 0, deficit: 0 },
    R: { supplied: 5, demand: 5, surplus: 0, deficit: 0 },
  });
  assert.equal(evaluation.final.L.supplied + evaluation.final.R.supplied, evaluation.supply.total);
  assertDeepFrozen(evaluation);
});

test("maintenance, required and idle tie branches emit only their tie fault", () => {
  const levelOff = clone(levels[0]);
  const safeOff = logic.enumerateSolutions(levels[0])[0];
  const maintenance = logic.evaluateGrid(levelOff, { ...safeOff, tie: "L-to-R" });
  assert.deepEqual(maintenance.faults, ["tie-maintenance"]);
  assert.deepEqual(maintenance.transfer, { direction: "L-to-R", from: null, to: null, amount: 0, capacity: 2 });

  const transferLevel = { ...levelOff, tieRequirement: "transfer" };
  const required = logic.evaluateGrid(transferLevel, safeOff);
  assert.deepEqual(required.faults, ["tie-required"]);
  const idle = logic.evaluateGrid(transferLevel, { ...safeOff, tie: "L-to-R" });
  assert.deepEqual(idle.faults, ["tie-idle"]);
  assert.equal(idle.transfer.amount, 0);
});

test("wrong direction, unavailable port, missing feeds and deficits retain frozen fault order", () => {
  const result = logic.evaluateGrid(levels[2], {
    solarOn: false,
    batteryOn: false,
    tie: "R-to-L",
    oxygen: "L",
    lights: "R",
    comms: "off",
  });
  assert.deepEqual(result.faults, [
    "solar-off", "battery-off", "comms-off", "oxygen-port-unavailable", "lights-port-unavailable",
    "tie-idle", "deficit-L", "deficit-R",
  ]);
  assert.deepEqual([...result.faults].sort((a, b) => logic.FAULT_ORDER.indexOf(a) - logic.FAULT_ORDER.indexOf(b)), result.faults);
});

test("caps transfer at two and never transfers twice", () => {
  const level = clone(levels[2]);
  level.supply.L = 10;
  level.supply.R = 0;
  level.demand.oxygen = 5;
  level.demand.lights = 1;
  level.demand.comms = 1;
  const evaluation = logic.evaluateGrid(level, {
    solarOn: true, batteryOn: true, tie: "L-to-R", oxygen: "R", lights: "L", comms: "R",
  });
  assert.equal(evaluation.transfer.amount, 2);
  assert.equal(evaluation.final.R.deficit, 4);
  assert.equal(evaluation.final.L.supplied + evaluation.final.R.supplied, 10);
});

test("malformed level, controls, accessors and Proxy all return the same canonical failure", () => {
  const extra = { ...clone(logic.DEFAULT_CONTROLS), extra: true };
  const getter = clone(logic.DEFAULT_CONTROLS);
  Object.defineProperty(getter, "tie", { enumerable: true, get() { throw new Error("no"); } });
  const hostile = new Proxy({}, { ownKeys() { throw new Error("no"); } });
  for (const [level, controls] of [[null, logic.DEFAULT_CONTROLS], [levels[0], extra], [levels[0], getter], [levels[0], hostile]]) {
    assert.strictEqual(logic.evaluateGrid(level, controls), logic.INVALID_EVALUATION);
  }
  assert.deepEqual(logic.INVALID_EVALUATION, {
    isSafe: false,
    faults: ["invalid-input"],
    supply: { L: 0, R: 0, total: 0 },
    demand: { L: 0, R: 0, total: 0 },
    local: { L: { supply: 0, demand: 0, surplus: 0, deficit: 0 }, R: { supply: 0, demand: 0, surplus: 0, deficit: 0 } },
    transfer: { direction: "off", from: null, to: null, amount: 0, capacity: 2 },
    final: { L: { supplied: 0, demand: 0, surplus: 0, deficit: 0 }, R: { supplied: 0, demand: 0, surplus: 0, deficit: 0 } },
    loads: {
      oxygen: { bus: "off", demand: 0, connected: false, allowed: false, safe: false },
      lights: { bus: "off", demand: 0, connected: false, allowed: false, safe: false },
      comms: { bus: "off", demand: 0, connected: false, allowed: false, safe: false },
    },
  });
});

test("plain-data schemas accept reordered fields but reject missing and extra fields", () => {
  const reordered = {
    comms: "L",
    lights: "R",
    oxygen: "R",
    tie: "off",
    batteryOn: true,
    solarOn: true,
  };
  assert.equal(logic.validControls(reordered), true);
  assert.equal(logic.evaluateGrid(levels[0], reordered).isSafe, true);
  const { comms: _omitted, ...missing } = reordered;
  assert.equal(logic.validControls(missing), false);
  assert.equal(logic.validControls({ ...reordered, diagnostic: true }), false);
});

test("walks intro, handoff and operating with invalid actions preserving identity", () => {
  const initial = logic.createInitialState();
  assert.equal(initial.phase, "intro");
  assert.equal(logic.ready(initial), initial);
  const handoff = logic.start(initial);
  assert.equal(handoff.phase, "handoff");
  assert.equal(logic.start(handoff), handoff);
  const operating = logic.ready(handoff);
  assert.equal(operating.phase, "operating");
  assert.equal(operating.revision, 1);
  assert.equal(logic.setTie(operating, "off"), operating);
  assert.equal(logic.setLoad(operating, "oxygen", "off"), operating);
  assert.equal(logic.toggleFeed(operating, "reactor"), operating);
  assert.equal(logic.reducePower(operating, { feed: "solar", type: "TOGGLE_FEED" }).controls.solarOn, true);
  assertDeepFrozen(operating);
});

test("reducePower enforces exact action fields independent of insertion order", () => {
  const solution = logic.enumerateSolutions(levels[0])[0];
  let safe = applyControls(operatingState(), solution);
  assert.equal(safe.stableTicks, 0);
  assert.equal(logic.reducePower(safe, { type: "TICK", extra: true }), safe);
  assert.equal(logic.reducePower(safe, { type: "TICK" }).stableTicks, 1);

  const base = operatingState();
  const reordered = { feed: "solar", type: "TOGGLE_FEED" };
  assert.equal(logic.reducePower(base, reordered).controls.solarOn, true);
  assert.equal(logic.reducePower(base, { type: "TOGGLE_FEED" }), base);

  const getter = { type: "SET_TIE" };
  Object.defineProperty(getter, "direction", { enumerable: true, get() { return "L-to-R"; } });
  assert.equal(logic.reducePower(base, getter), base);

  let shiftResult = safe;
  for (let count = 0; count < 90; count += 1) shiftResult = logic.tick(shiftResult);

  const exactActions = [
    [logic.createInitialState(), { type: "START" }],
    [logic.start(logic.createInitialState()), { type: "READY" }],
    [base, { type: "TOGGLE_FEED", feed: "solar" }],
    [base, { type: "SET_TIE", direction: "L-to-R" }],
    [base, { type: "SET_LOAD", load: "oxygen", bus: "L" }],
    [safe, { type: "TICK" }],
    [shiftResult, { type: "NEXT_SHIFT" }],
    [logic.pause(base, "manual"), { type: "RESUME" }],
    [base, { type: "PAUSE", reason: "manual" }],
    [base, { type: "RESTART" }],
  ];
  exactActions.forEach(([state, action]) => {
    assert.notStrictEqual(logic.reducePower(state, action), state);
    assert.strictEqual(logic.reducePower(state, { ...action, extra: true }), state);
    const missing = { ...action };
    const key = Object.keys(missing).find((name) => name !== "type") || "type";
    delete missing[key];
    assert.strictEqual(logic.reducePower(state, missing), state);
  });
});

test("89 safe ticks remain operating; the 90th atomically records a shift", () => {
  let state = applyControls(operatingState(), logic.enumerateSolutions(levels[0])[0]);
  for (let count = 0; count < 89; count += 1) state = logic.tick(state);
  assert.equal(state.phase, "operating");
  assert.equal(state.stableTicks, 89);
  assert.equal(state.completedShifts.length, 0);
  state = logic.tick(state);
  assert.equal(state.phase, "shift-result");
  assert.equal(state.stableTicks, 90);
  assert.deepEqual(state.completedShifts[0], {
    levelId: "daylight",
    stableTicks: 90,
    controls: logic.enumerateSolutions(levels[0])[0],
    transferAmount: 0,
  });
  assert.equal(state.revision, 2);
  assert.equal(logic.isPowerState(state), true);
});

test("unsafe controls immediately reset a partial stable window", () => {
  let state = applyControls(operatingState(), logic.enumerateSolutions(levels[0])[0]);
  for (let count = 0; count < 45; count += 1) state = logic.tick(state);
  state = logic.setLoad(state, "lights", "off");
  assert.equal(state.stableTicks, 0);
  assert.equal(logic.tick(state), state);
});

test("resets controls at every handoff and completes exactly three ordered summaries", () => {
  const state = completeGame();
  assert.equal(state.phase, "complete");
  assert.equal(state.shiftIndex, 2);
  assert.equal(state.stableTicks, 90);
  assert.deepEqual(state.completedShifts.map((entry) => entry.levelId), ["daylight", "shadow", "earth-window"]);
  assert.deepEqual(state.completedShifts.map((entry) => entry.transferAmount), [0, 0, 1]);
  assert.equal(logic.isPowerState(state), true);
});

test("pause freezes progress; resume and restart advance revision exactly once", () => {
  let state = applyControls(operatingState(), logic.enumerateSolutions(levels[0])[0]);
  for (let count = 0; count < 12; count += 1) state = logic.tick(state);
  const before = state;
  state = logic.pause(state, "manual");
  assert.equal(state.phase, "paused");
  assert.equal(state.stableTicks, 12);
  assert.equal(state.revision, before.revision + 1);
  assert.equal(logic.tick(state), state);
  const resumed = logic.resume(state);
  assert.equal(resumed.stableTicks, 12);
  assert.equal(resumed.revision, state.revision + 1);
  const restarted = logic.restart(resumed);
  const initial = logic.createInitialState();
  assert.deepEqual({ ...restarted, revision: 0 }, initial);
  assert.equal(restarted.revision, resumed.revision + 1);
  assert.equal(logic.pause(resumed, "stalled"), resumed);
});

test("strict validator rejects inconsistent evaluation, summaries, stages and extra fields", () => {
  const state = operatingState();
  assert.equal(logic.isPowerState(clone(state)), true);
  assert.equal(logic.isPowerState({ ...clone(state), stableTicks: 90 }), false);
  assert.equal(logic.isPowerState({ ...clone(state), extra: true }), false);
  assert.equal(logic.isPowerState({ ...clone(state), lastEvaluation: logic.INVALID_EVALUATION }), false);
  assert.equal(logic.isPowerState({ ...clone(state), completedShifts: [{ levelId: "daylight" }] }), false);
  const recovered = logic.tick({ ...clone(state), extra: true });
  assert.deepEqual(recovered, logic.createInitialState());
});

test("state validation compares equivalent plain objects by field set, not insertion order", () => {
  const state = clone(operatingState());
  const evaluation = state.lastEvaluation;
  state.lastEvaluation = {
    loads: evaluation.loads,
    final: evaluation.final,
    transfer: evaluation.transfer,
    local: evaluation.local,
    demand: evaluation.demand,
    supply: evaluation.supply,
    faults: evaluation.faults,
    isSafe: evaluation.isSafe,
  };
  const reorderedState = {
    revision: state.revision,
    resumePhase: state.resumePhase,
    pauseReason: state.pauseReason,
    completedShifts: state.completedShifts,
    lastEvaluation: state.lastEvaluation,
    stableTicks: state.stableTicks,
    controls: state.controls,
    shiftIndex: state.shiftIndex,
    phase: state.phase,
  };
  assert.equal(logic.isPowerState(reorderedState), true);
});

test("keyboard classification separates seats, modifiers and legal load cycles", () => {
  let state = operatingState();
  const event = (code, fields = {}) => ({ code, repeat: false, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, ...fields });
  assert.deepEqual(logic.classifyPowerKey(state, event("KeyA")), { type: "TOGGLE_FEED", feed: "solar" });
  assert.deepEqual(logic.classifyPowerKey(state, event("KeyS")), { type: "TOGGLE_FEED", feed: "battery" });
  assert.deepEqual(logic.classifyPowerKey(state, event("KeyD")), { type: "SET_TIE", direction: "L-to-R" });
  assert.deepEqual(logic.classifyPowerKey(state, event("KeyJ")), { type: "SET_LOAD", load: "oxygen", bus: "L" });
  assert.equal(logic.classifyPowerKey(state, event("KeyA", { repeat: true })), null);
  assert.equal(logic.classifyPowerKey(state, event("KeyA", { ctrlKey: true })), null);
  assert.equal(logic.classifyPowerKey(state, event("Escape")), null);

  state = operatingState(2);
  state = logic.setLoad(state, "oxygen", "L");
  assert.deepEqual(logic.classifyPowerKey(state, event("KeyJ")), { type: "SET_LOAD", load: "oxygen", bus: "off" });
});

test("keyboard classification reads native-style inherited event accessors", () => {
  const state = operatingState();
  const nativeLikeEvent = Object.create({
    get code() { return "KeyA"; },
    get repeat() { return false; },
    get ctrlKey() { return false; },
    get altKey() { return false; },
    get metaKey() { return false; },
    get shiftKey() { return false; },
  });
  assert.deepEqual(logic.classifyPowerKey(state, nativeLikeEvent), { type: "TOGGLE_FEED", feed: "solar" });

  const hostileEvent = Object.create({ get code() { throw new Error("no"); } });
  assert.equal(logic.classifyPowerKey(state, hostileEvent), null);
});

test("frame contract consumes at most five ticks and long frames consume zero", () => {
  assert.deepEqual(logic.consumeFrame(0, 0), { pauseReason: null, ticks: 0, accumulatorMs: 0 });
  const normal = logic.consumeFrame(0, logic.TICK_MS * 5);
  assert.equal(normal.ticks, 5);
  assert.ok(Math.abs(normal.accumulatorMs) < 1e-9);
  assert.deepEqual(logic.consumeFrame(1, logic.MAX_FRAME_BUDGET_MS), { pauseReason: "long-frame", ticks: 0, accumulatorMs: 0 });
  assert.deepEqual(logic.consumeFrame(0, Infinity), { pauseReason: "long-frame", ticks: 0, accumulatorMs: 0 });
});

test("sanitizes all config strings as one unit", () => {
  assert.deepEqual(logic.sanitizeConfig({
    powerOperatorName: "  阿岚  ",
    loadOperatorName: "  小月  ",
    completionTitle: "  我们把灯留住了  ",
  }), { powerOperatorName: "阿岚", loadOperatorName: "小月", completionTitle: "我们把灯留住了" });
  assert.deepEqual(logic.sanitizeConfig({
    powerOperatorName: "阿岚",
    loadOperatorName: " ",
    completionTitle: "完成",
  }), logic.DEFAULT_CONFIG);
  const hostile = {};
  Object.defineProperty(hostile, "powerOperatorName", { enumerable: true, get() { throw new Error("no"); } });
  assert.deepEqual(logic.sanitizeConfig(hostile), logic.DEFAULT_CONFIG);
});

test("completion policy receives an isolated frozen summary and falls back safely", () => {
  const state = completeGame();
  const summary = logic.completionSummary(state);
  assert.deepEqual(summary.completedShiftIds, ["daylight", "shadow", "earth-window"]);
  assert.equal(summary.totalStableTicks, 270);
  assert.deepEqual(summary.transferAmounts, [0, 0, 1]);
  assertDeepFrozen(summary);
  let received;
  assert.equal(logic.resolveCompletionNote((value) => { received = value; return "  一起守住了月面的光。  "; }, summary), "一起守住了月面的光。");
  assert.notStrictEqual(received, summary);
  assert.equal(logic.resolveCompletionNote(() => " ", summary), logic.DEFAULT_NOTE);
  assert.equal(logic.resolveCompletionNote(() => "月".repeat(161), summary), logic.DEFAULT_NOTE);
  assert.equal(logic.resolveCompletionNote(() => { throw new Error("no"); }, summary), logic.DEFAULT_NOTE);
  assert.equal(logic.resolveCompletionNote((value) => { value.transferAmounts.push(9); return "篡改"; }, summary), logic.DEFAULT_NOTE);
  assert.equal(logic.resolveCompletionNote(() => " ", { ...summary, defaultNote: "调用方伪造的回退" }), logic.DEFAULT_NOTE);
  assert.equal(logic.resolveCompletionNote(null, { defaultNote: "调用方伪造的回退" }), logic.DEFAULT_NOTE);
});

test("public view is frozen plain data with no config function or action log", () => {
  const state = completeGame();
  const view = logic.getPublicView(state, {
    powerOperatorName: "一号",
    loadOperatorName: "二号",
    completionTitle: "灯还亮着",
    composeCompletionNote() { return "一起交班。"; },
  });
  assert.equal(view.primaryTitle, "灯还亮着");
  assert.equal(view.completion.note, "一起交班。");
  assert.equal(view.actions.canRestart, true);
  assert.equal(JSON.stringify(view).includes("composeCompletionNote"), false);
  assert.equal(JSON.stringify(view).includes("actionLog"), false);
  assertDeepFrozen(view);
});

test("replay is deterministic, input-preserving and JSON-restorable", () => {
  const solution = logic.enumerateSolutions(levels[0])[0];
  const actions = [
    { type: "START" }, { type: "READY" },
    { type: "TOGGLE_FEED", feed: "solar" }, { type: "TOGGLE_FEED", feed: "battery" },
    { type: "SET_LOAD", load: "oxygen", bus: solution.oxygen },
    { type: "SET_LOAD", load: "lights", bus: solution.lights },
    { type: "SET_LOAD", load: "comms", bus: solution.comms },
    ...Array.from({ length: 12 }, () => ({ type: "TICK" })),
  ];
  const original = clone(actions);
  const first = logic.replayPower(actions);
  const second = logic.replayPower(clone(actions));
  assert.deepEqual(first, second);
  assert.deepEqual(actions, original);
  assert.deepEqual(logic.replayPower([], clone(first)), first);
  assert.notStrictEqual(logic.replayPower([], first), first);
  assertDeepFrozen(first);
});
