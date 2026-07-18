"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "./config.js";
import "./logic.js";

const config = globalThis.SIGNAL_REPAIR_CONFIG;
const logic = globalThis.SignalRepairLogic;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultPlan() {
  return logic.DEFAULT_PUZZLES.slice(0, 4).map((puzzle) => puzzle.id);
}

function startPlaying(plan = defaultPlan(), rawConfig = config) {
  let state = logic.createInitialState(rawConfig);
  state = logic.reduce(state, { type: "START", plan });
  state = logic.reduce(state, { type: "READY", seat: "north" });
  return logic.reduce(state, { type: "READY", seat: "south" });
}

function finishRound(state) {
  const puzzle = logic.DEFAULT_PUZZLES.find((entry) => entry.id === state.plan[state.roundIndex]);
  const answer = logic.solvePuzzle(puzzle);
  return logic.reduce(state, { type: "SELECT", branchId: answer.branchId });
}

function completeSession(plan = defaultPlan()) {
  let state = startPlaying(plan);
  for (let index = 0; index < plan.length; index += 1) {
    state = finishRound(state);
    state = logic.reduce(state, { type: "NEXT" });
    if (index < plan.length - 1) {
      state = logic.reduce(state, { type: "READY", seat: "north" });
      state = logic.reduce(state, { type: "READY", seat: "south" });
    }
  }
  return state;
}

test("public constants and the twelve-card bank are deeply frozen", () => {
  assert.equal(logic.TICKS_PER_SECOND, 10);
  assert.equal(logic.DEFAULT_PUZZLES.length, 12);
  assert.equal(Object.isFrozen(logic.DEFAULT_PUZZLES), true);
  assert.equal(Object.isFrozen(logic.DEFAULT_PUZZLES[0].branches[0]), true);
  assert.equal(Object.isFrozen(logic.DEFAULT_CONFIG.transmissionFragments), true);
});

test("the puzzle bank validates unique IDs, branch IDs, tokens, and titles", () => {
  assert.equal(logic.validatePuzzleBank(logic.DEFAULT_PUZZLES), true);
  assert.deepEqual(logic.DEFAULT_PUZZLES.map((entry) => entry.id), Array.from({ length: 12 }, (_, i) => `echo-${String(i + 1).padStart(2, "0")}`));
  for (const puzzle of logic.DEFAULT_PUZZLES) {
    assert.deepEqual(puzzle.branches.map((branch) => branch.id), ["A", "B", "C"]);
    assert.equal(puzzle.rules.length, 3);
    assert.ok(Array.from(puzzle.title).length <= 12);
  }
});

test("all frozen puzzles solve to the specified first unique rule", () => {
  const expected = [
    ["A", 0], ["A", 1], ["A", 1], ["C", 2],
    ["C", 1], ["B", 2], ["A", 2], ["A", 2],
    ["A", 2], ["C", 2], ["C", 2], ["B", 2],
  ];
  assert.deepEqual(logic.DEFAULT_PUZZLES.map((puzzle) => {
    const answer = logic.solvePuzzle(puzzle);
    return [answer.branchId, answer.ruleIndex];
  }), expected);
});

test("rule explanations come from tokens and reject unknown tokens", () => {
  assert.equal(logic.explainRule({ kind: "parity", value: "even" }), "若恰有一条星路的节点数为偶数，接回它。");
  assert.equal(logic.explainRule({ kind: "symbol", value: "moon" }), "若恰有一条星路带月弧，接回它。");
  assert.equal(logic.explainRule({ kind: "texture", value: "grain" }), "若恰有一条星路呈星砂，接回它。");
  assert.equal(logic.explainRule({ kind: "signal", value: "high" }), "若恰有一条星路的信号明亮，接回它。");
  assert.equal(logic.explainRule({ kind: "node-extreme", value: "min" }), "若只有一条星路的节点最少，接回它。");
  assert.equal(logic.explainRule({ kind: "signal-extreme", value: "max" }), "若只有一条星路的信号最高，接回它。");
  assert.equal(logic.explainRule({ kind: "symbol", value: "star" }), null);
});

test("solver skips zero and multiple matches before the first unique rule", () => {
  const answer = logic.solvePuzzle(logic.DEFAULT_PUZZLES[3]);
  assert.deepEqual(answer, {
    branchId: "C",
    ruleIndex: 2,
    ruleText: "若只有一条星路的信号最高，接回它。",
  });
});

test("invalid or unsolved puzzle objects return null", () => {
  const puzzle = snapshot(logic.DEFAULT_PUZZLES[0]);
  puzzle.rules = [{ kind: "symbol", value: "moon" }, { kind: "symbol", value: "comet" }, { kind: "symbol", value: "ring" }];
  puzzle.branches[1].symbol = "moon";
  puzzle.branches[2].symbol = "moon";
  assert.equal(logic.solvePuzzle(puzzle), null);
  assert.equal(logic.solvePuzzle(null), null);
});

test("bank validation rejects wrong size, duplicate IDs, shared branches, and illegal tokens", () => {
  const bank = snapshot(logic.DEFAULT_PUZZLES);
  assert.equal(logic.validatePuzzleBank(bank.slice(0, 11)), false);
  bank[1].id = bank[0].id;
  assert.equal(logic.validatePuzzleBank(bank), false);
  const shared = snapshot(logic.DEFAULT_PUZZLES);
  shared[0].branches[1] = shared[0].branches[0];
  assert.equal(logic.validatePuzzleBank(shared), false);
  const illegal = snapshot(logic.DEFAULT_PUZZLES);
  illegal[0].rules[0] = { kind: "signal", value: "loud" };
  assert.equal(logic.validatePuzzleBank(illegal), false);
});

test("the DSL rejects precomputed answers and parallel free-text rules", () => {
  const withAnswer = snapshot(logic.DEFAULT_PUZZLES);
  withAnswer[0].answer = "A";
  assert.equal(logic.validatePuzzleBank(withAnswer), false);
  const withRuleText = snapshot(logic.DEFAULT_PUZZLES);
  withRuleText[0].rules[0].text = "直接选 A";
  assert.equal(logic.validatePuzzleBank(withRuleText), false);
  const withBranchCopy = snapshot(logic.DEFAULT_PUZZLES);
  withBranchCopy[0].branches[0].label = "答案";
  assert.equal(logic.validatePuzzleBank(withBranchCopy), false);
});

test("configuration trims, truncates by code point, and clones caller data", () => {
  const raw = {
    northName: `  ${"😀".repeat(15)}  `,
    southName: "  南边  ",
    transmissionFragments: ["  一  ", "二", "三", "四"],
  };
  const safe = logic.sanitizeConfig(raw);
  raw.transmissionFragments[0] = "污染";
  assert.equal(Array.from(safe.northName).length, 12);
  assert.equal(safe.southName, "南边");
  assert.deepEqual(safe.transmissionFragments, ["一", "二", "三", "四"]);
  assert.equal(Object.isFrozen(safe), true);
});

test("configuration falls back per name and as a whole for fragments", () => {
  const safe = logic.sanitizeConfig({ northName: 3, southName: " ", transmissionFragments: ["一", "二", "三"] });
  assert.equal(safe.northName, "北席");
  assert.equal(safe.southName, "南席");
  assert.deepEqual(safe.transmissionFragments, [...logic.DEFAULT_CONFIG.transmissionFragments]);
});

test("malicious-looking copy remains inert plain strings", () => {
  const source = "<img src=x onerror=alert(1)>";
  const safe = logic.sanitizeConfig({ northName: source, transmissionFragments: [source, "二", "三", "四"] });
  assert.equal(typeof safe.northName, "string");
  assert.equal(safe.northName, Array.from(source).slice(0, 12).join(""));
  assert.equal(safe.transmissionFragments[0], source);
});

test("config exposes a working customizable transmission composer", () => {
  const view = { transmissionFragments: ["一", "二", "三", "四"] };
  assert.equal(config.composeTransmission(view), "一二三四");
  assert.match(config.composeTransmission({ transmissionFragments: [] }), /还没有完整/);
});

test("classic scripts expose browser globals and CommonJS exports", () => {
  const loadClassic = (path) => {
    const sandbox = { module: { exports: {} }, globalThis: {} };
    runInNewContext(readFileSync(new URL(path, import.meta.url), "utf8"), sandbox);
    return sandbox;
  };
  const configSandbox = loadClassic("./config.js");
  const logicSandbox = loadClassic("./logic.js");
  assert.equal(configSandbox.module.exports, configSandbox.globalThis.SIGNAL_REPAIR_CONFIG);
  assert.equal(logicSandbox.module.exports, logicSandbox.globalThis.SignalRepairLogic);
  assert.deepEqual(Object.keys(logicSandbox.module.exports), Object.keys(logic));
});

test("fixed random indexes create four unique IDs without mutating the source", () => {
  const source = [...logic.DEFAULT_PUZZLES];
  const before = [...source];
  const plan = logic.createSession(source, (length) => length - 1);
  assert.deepEqual(plan, ["echo-12", "echo-11", "echo-10", "echo-09"]);
  assert.equal(new Set(plan).size, 4);
  assert.deepEqual(source, before);
  assert.equal(Object.isFrozen(plan), true);
});

test("missing and invalid random indexes safely select the current first card", () => {
  assert.deepEqual(logic.createSession(logic.DEFAULT_PUZZLES), ["echo-01", "echo-02", "echo-03", "echo-04"]);
  for (const randomIndex of [() => -1, () => 1.2, () => Number.NaN, () => { throw new Error("no"); }]) {
    assert.deepEqual(logic.createSession(logic.DEFAULT_PUZZLES, randomIndex), ["echo-01", "echo-02", "echo-03", "echo-04"]);
  }
});

test("an invalid external bank falls back to the frozen default bank", () => {
  assert.deepEqual(logic.createSession([], () => 0), ["echo-01", "echo-02", "echo-03", "echo-04"]);
});

test("rejection sampling accepts the last safe value and rejects the threshold", () => {
  const values = [4294967295, 4294967294];
  const randomIndex = logic.createUnbiasedRandomIndex({
    getRandomValues(array) { array[0] = values.shift(); return array; },
  });
  assert.equal(randomIndex(3), 2);
  assert.deepEqual(values, []);
});

test("unbiased indexes handle n=1 and missing or throwing crypto", () => {
  let calls = 0;
  const one = logic.createUnbiasedRandomIndex({ getRandomValues() { calls += 1; } });
  assert.equal(one(1), 0);
  assert.equal(calls, 0);
  assert.equal(logic.createUnbiasedRandomIndex(null)(7), 0);
  assert.equal(logic.createUnbiasedRandomIndex({ getRandomValues() { throw new Error("blocked"); } })(7), 0);
});

test("unbiased indexes reject invalid bounds", () => {
  const randomIndex = logic.createUnbiasedRandomIndex(null);
  for (const value of [0, -1, 1.5, 4294967297]) assert.throws(() => randomIndex(value), RangeError);
});

test("initial state is deterministic, frozen, isolated, and at intro", () => {
  const first = logic.createInitialState(config);
  const second = logic.createInitialState(config);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.notEqual(first.config, second.config);
  assert.equal(first.phase, "intro");
  assert.deepEqual(first.plan, []);
  assert.equal(Object.isFrozen(first), true);
});

test("START accepts exactly four unique known puzzle IDs", () => {
  const initial = logic.createInitialState(config);
  const started = logic.reduce(initial, { type: "START", plan: defaultPlan() });
  assert.equal(started.phase, "handoff");
  assert.equal(started.northRole, "navigator");
  assert.deepEqual(started.ready, { north: false, south: false });
  assert.equal(started.revision, 1);
  for (const plan of [[], ["echo-01"], ["echo-01", "echo-01", "echo-02", "echo-03"], ["bad", "echo-02", "echo-03", "echo-04"]]) {
    assert.equal(logic.reduce(initial, { type: "START", plan }), initial);
  }
});

test("one READY never reveals the puzzle and duplicate READY is inert", () => {
  let state = logic.reduce(logic.createInitialState(), { type: "START", plan: defaultPlan() });
  state = logic.reduce(state, { type: "READY", seat: "south" });
  const view = logic.getView(state);
  assert.equal(state.phase, "handoff");
  assert.equal(view.currentPuzzle, null);
  assert.equal(view.rules, null);
  assert.equal(logic.reduce(state, { type: "READY", seat: "south" }), state);
});

test("both seats ready enter playing with the full timer", () => {
  const state = startPlaying();
  assert.equal(state.phase, "playing");
  assert.equal(state.remainingTicks, 450);
  assert.deepEqual(state.ready, { north: true, south: true });
  assert.equal(logic.getView(state).remainingSeconds, 45);
});

test("non-playing SELECT and unknown branch IDs return the original reference", () => {
  const intro = logic.createInitialState();
  const playing = startPlaying();
  assert.equal(logic.reduce(intro, { type: "SELECT", branchId: "A" }), intro);
  assert.equal(logic.reduce(playing, { type: "SELECT", branchId: "D" }), playing);
});

test("a wrong selection increments attempts, starts a nine-tick lock, and leaks no answer", () => {
  const playing = startPlaying();
  const answer = logic.solvePuzzle(logic.DEFAULT_PUZZLES[0]);
  const wrongId = ["A", "B", "C"].find((id) => id !== answer.branchId);
  const locked = logic.reduce(playing, { type: "SELECT", branchId: wrongId });
  assert.equal(locked.phase, "playing");
  assert.equal(locked.attempts, 1);
  assert.equal(locked.lockTicks, 9);
  assert.equal(locked.outcome, null);
  assert.equal(logic.getView(locked).outcome, null);
  assert.match(logic.getView(locked).statusLabel, /还没有接通/);
});

test("lock blocks selections until shared TICK releases it", () => {
  let state = startPlaying();
  state = logic.reduce(state, { type: "SELECT", branchId: "B" });
  assert.equal(logic.reduce(state, { type: "SELECT", branchId: "A" }), state);
  state = logic.reduce(state, { type: "TICK", ticks: 8 });
  assert.equal(state.lockTicks, 1);
  state = logic.reduce(state, { type: "TICK", ticks: 1 });
  assert.equal(state.lockTicks, 0);
});

test("a correct selection records exactly one solved round", () => {
  const playing = startPlaying();
  const result = finishRound(playing);
  const answer = logic.solvePuzzle(logic.DEFAULT_PUZZLES[0]);
  assert.equal(result.phase, "round-result");
  assert.deepEqual(result.outcome, answer);
  assert.deepEqual(result.completed, [{
    puzzleId: "echo-01",
    operatorSeat: "south",
    attempts: 1,
    remainingTicks: 450,
    branchId: answer.branchId,
    ruleIndex: answer.ruleIndex,
  }]);
  assert.equal(logic.reduce(result, { type: "SELECT", branchId: answer.branchId }), result);
  assert.equal(logic.reduce(result, { type: "TICK", ticks: 1 }), result);
});

test("integer TICK decrements both clocks and rejects invalid tick values", () => {
  let state = startPlaying();
  state = logic.reduce(state, { type: "SELECT", branchId: "B" });
  const ticked = logic.reduce(state, { type: "TICK", ticks: 4 });
  assert.equal(ticked.remainingTicks, 446);
  assert.equal(ticked.lockTicks, 5);
  for (const ticks of [0, -1, 1.5, Number.NaN]) assert.equal(logic.reduce(ticked, { type: "TICK", ticks }), ticked);
});

test("timeout wins when remaining and lock ticks reach zero together", () => {
  let state = startPlaying();
  state = logic.reduce(state, { type: "SELECT", branchId: "B" });
  state = { ...state, remainingTicks: 9 };
  const timeout = logic.reduce(state, { type: "TICK", ticks: 9 });
  assert.equal(timeout.phase, "timeout");
  assert.equal(timeout.remainingTicks, 0);
  assert.equal(timeout.lockTicks, 0);
  assert.equal(timeout.outcome, null);
});

test("timeout view never contains branches, rules, answer, or rule index", () => {
  const timeout = logic.reduce(startPlaying(), { type: "TICK", ticks: 450 });
  const view = logic.getView(timeout);
  assert.equal(view.phase, "timeout");
  assert.equal(view.currentPuzzle, null);
  assert.equal(view.rules, null);
  assert.equal(view.outcome, null);
  assert.doesNotMatch(JSON.stringify(view), /ruleIndex|branchId/);
});

test("RETRY preserves the same puzzle, attempts, and completed history", () => {
  let state = startPlaying();
  state = logic.reduce(state, { type: "SELECT", branchId: "B" });
  state = logic.reduce(state, { type: "TICK", ticks: 450 });
  const retried = logic.reduce(state, { type: "RETRY" });
  assert.equal(retried.phase, "handoff");
  assert.equal(retried.roundIndex, 0);
  assert.equal(retried.attempts, 1);
  assert.equal(retried.remainingTicks, 450);
  assert.equal(retried.lockTicks, 0);
  assert.deepEqual(retried.ready, { north: false, south: false });
});

test("NEXT alternates the operator and clears round-local readiness", () => {
  const firstResult = finishRound(startPlaying());
  const next = logic.reduce(firstResult, { type: "NEXT" });
  assert.equal(next.phase, "handoff");
  assert.equal(next.roundIndex, 1);
  assert.equal(next.northRole, "operator");
  assert.equal(next.attempts, 0);
  assert.deepEqual(next.ready, { north: false, south: false });
  assert.equal(next.completed.length, 1);
});

test("four rounds alternate south/north and complete only after the final NEXT", () => {
  const complete = completeSession();
  assert.equal(complete.phase, "complete");
  assert.deepEqual(complete.completed.map((entry) => entry.operatorSeat), ["south", "north", "south", "north"]);
  assert.equal(complete.completed.length, 4);
  assert.equal(logic.getView(complete).transmissionFragments.length, 4);
});

test("PAUSE and RESUME preserve all timer and puzzle state", () => {
  const playing = logic.reduce(startPlaying(), { type: "TICK", ticks: 17 });
  const paused = logic.reduce(playing, { type: "PAUSE", reason: "hidden" });
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pausedFrom, "playing");
  assert.equal(logic.reduce(paused, { type: "TICK", ticks: 99 }), paused);
  const resumed = logic.reduce(paused, { type: "RESUME" });
  assert.equal(resumed.phase, "playing");
  assert.equal(resumed.remainingTicks, playing.remainingTicks);
});

test("RESTART is complete-only and clears all session data", () => {
  const playing = startPlaying();
  assert.equal(logic.reduce(playing, { type: "RESTART" }), playing);
  const complete = completeSession();
  const restarted = logic.reduce(complete, { type: "RESTART" });
  assert.equal(restarted.phase, "intro");
  assert.deepEqual(restarted.plan, []);
  assert.deepEqual(restarted.completed, []);
  assert.equal(restarted.attempts, 0);
  assert.equal(restarted.revision, complete.revision + 1);
});

test("getView derives roles, orientation, labels, permissions, and safe clones", () => {
  const state = startPlaying();
  const view = logic.getView(state);
  assert.deepEqual(view.north, { name: "北席", role: "navigator", orientation: "north" });
  assert.deepEqual(view.south, { name: "南席", role: "operator", orientation: "south" });
  assert.equal(view.operatorSeat, "south");
  assert.equal(view.canSelect, true);
  assert.equal(view.canPause, true);
  assert.equal(view.currentPuzzle.branches.length, 3);
  assert.equal(view.rules.length, 3);
  view.currentPuzzle.branches[0].id = "Z";
  assert.equal(logic.getView(state).currentPuzzle.branches[0].id, "A");
});

test("complete view exposes fragments and records without exposing mutable state", () => {
  const complete = completeSession();
  const view = logic.getView(complete);
  assert.deepEqual(view.transmissionFragments, [...config.transmissionFragments]);
  assert.equal(view.canRestart, true);
  view.transmissionFragments[0] = "污染";
  view.completed[0].branchId = "Z";
  const again = logic.getView(complete);
  assert.equal(again.transmissionFragments[0], config.transmissionFragments[0]);
  assert.notEqual(again.completed[0].branchId, "Z");
});

test("classifyKey maps A/B/C and Escape while rejecting repeats and unknown keys", () => {
  assert.deepEqual(logic.classifyKey("KeyA"), { type: "SELECT", branchId: "A" });
  assert.deepEqual(logic.classifyKey("KeyB"), { type: "SELECT", branchId: "B" });
  assert.deepEqual(logic.classifyKey("KeyC"), { type: "SELECT", branchId: "C" });
  assert.deepEqual(logic.classifyKey("Escape"), { type: "PAUSE", reason: "manual" });
  assert.equal(logic.classifyKey("KeyA", true), null);
  assert.equal(logic.classifyKey("Enter"), null);
});

test("replay is deterministic and never mutates action logs", () => {
  const actions = [
    { type: "START", plan: defaultPlan() },
    { type: "READY", seat: "north" },
    { type: "READY", seat: "south" },
    { type: "SELECT", branchId: "B", meta: { source: "key" } },
    { type: "TICK", ticks: 9 },
    { type: "SELECT", branchId: "A" },
    { type: "NEXT" },
  ];
  const before = snapshot(actions);
  const first = logic.replay(config, actions);
  const second = logic.replay(config, actions);
  assert.deepEqual(first, second);
  assert.deepEqual(actions, before);
});

test("unknown actions and actions in illegal phases preserve the same reference", () => {
  const intro = logic.createInitialState();
  for (const action of [null, {}, { type: "UNKNOWN" }, { type: "READY", seat: "north" }, { type: "TICK", ticks: 1 }, { type: "PAUSE" }]) {
    assert.equal(logic.reduce(intro, action), intro);
  }
});

test("malformed states are rejected safely by reducer and view", () => {
  const valid = startPlaying();
  const malformed = [
    null,
    { ...valid, plan: [] },
    { ...valid, roundIndex: 9 },
    { ...valid, remainingTicks: -1 },
    { ...valid, ready: null },
    { ...valid, completed: [{ fake: true }] },
    { ...valid, northRole: "operator" },
    { ...valid, pausedFrom: "playing" },
  ];
  for (const state of malformed) {
    assert.equal(logic.getView(state), null);
    assert.equal(logic.reduce(state, { type: "TICK", ticks: 1 }), state);
  }
});

test("all reducer paths leave their input objects structurally untouched", () => {
  const initial = logic.createInitialState();
  const handoff = logic.reduce(initial, { type: "START", plan: defaultPlan() });
  const oneReady = logic.reduce(handoff, { type: "READY", seat: "north" });
  const playing = logic.reduce(oneReady, { type: "READY", seat: "south" });
  const wrong = logic.reduce(playing, { type: "SELECT", branchId: "B" });
  const ticked = logic.reduce(wrong, { type: "TICK", ticks: 9 });
  const result = finishRound(ticked);
  const paused = logic.reduce(ticked, { type: "PAUSE", reason: "blur" });
  const timeout = logic.reduce(playing, { type: "TICK", ticks: 450 });
  const complete = completeSession();
  const cases = [
    [initial, { type: "START", plan: defaultPlan() }],
    [handoff, { type: "READY", seat: "north" }],
    [oneReady, { type: "READY", seat: "south" }],
    [playing, { type: "SELECT", branchId: "B" }],
    [wrong, { type: "TICK", ticks: 9 }],
    [ticked, { type: "PAUSE", reason: "manual" }],
    [paused, { type: "RESUME" }],
    [timeout, { type: "RETRY" }],
    [result, { type: "NEXT" }],
    [complete, { type: "RESTART" }],
  ];
  for (const [state, action] of cases) {
    const before = snapshot(state);
    logic.reduce(state, action);
    assert.deepEqual(snapshot(state), before);
  }
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

if (failures > 0) {
  console.error(`\n${failures}/${tests.length} tests failed`);
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length}/${tests.length} tests passed`);
}
