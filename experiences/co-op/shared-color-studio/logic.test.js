"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "./config.js";
import "./logic.js";

const config = globalThis.SHARED_COLOR_STUDIO_CONFIG;
const logic = globalThis.SHARED_COLOR_STUDIO_LOGIC;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function rawConfig(overrides = {}) {
  return { ...config, ...overrides };
}

function begin(overrides = {}) {
  return logic.startStudio(logic.createStudioState(rawConfig({ countdownTicks: 0, ...overrides })));
}

function moveToTarget(state) {
  const target = state.rules.rounds[state.roundIndex].target;
  while (state.current.hueIndex !== target.hueIndex) {
    state = logic.applyAxisMove(state, { axis: "hue", direction: 1 });
  }
  while (state.phase === "playing" && state.current.lightnessIndex !== target.lightnessIndex) {
    const direction = state.current.lightnessIndex < target.lightnessIndex ? 1 : -1;
    state = logic.applyAxisMove(state, { axis: "lightness", direction });
  }
  return state;
}

function completeAlbum(state = begin()) {
  for (let round = 0; round < 5; round += 1) {
    state = moveToTarget(state);
    assert.equal(state.outcome, "success");
    state = logic.advanceRound(state);
  }
  return state;
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

test("default configuration is deterministic, cloned, and deeply frozen", () => {
  const first = logic.createStudioState();
  const second = logic.createStudioState();
  assert.deepEqual(first, second);
  assert.notEqual(first.rules, second.rules);
  assert.notEqual(first.rules.rounds, second.rules.rounds);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.rules.rounds[0].target), true);
  assert.equal(first.rules.rounds.length, 5);
});

test("source mutations after creation cannot pollute sanitized rules", () => {
  const source = rawConfig();
  source.rounds = config.rounds.map((round) => ({
    ...round,
    target: { ...round.target },
    start: { ...round.start },
  }));
  const state = logic.createStudioState(source);
  source.rounds[0].title = "被后改";
  source.rounds[0].target.hueIndex = 9;
  assert.equal(state.rules.rounds[0].title, "晚霞信笺");
  assert.equal(state.rules.rounds[0].target.hueIndex, 1);
});

test("invalid scalar configuration uses bounded defaults", () => {
  const state = logic.createStudioState({
    tickMs: 49,
    countdownTicks: 101,
    roundTicks: 49,
    maxFrameGapMs: 2001,
    chroma: 0.5,
  });
  assert.equal(state.rules.tickMs, 100);
  assert.equal(state.rules.countdownTicks, 30);
  assert.equal(state.rules.roundTicks, 240);
  assert.equal(state.rules.maxFrameGapMs, 500);
  assert.equal(state.rules.chroma, 0.12);
});

test("invalid axis arrays and any invalid round fall back as whole groups", () => {
  const rounds = config.rounds.map((round) => ({ ...round, target: { ...round.target }, start: { ...round.start } }));
  rounds[2].id = rounds[0].id;
  const state = logic.createStudioState(rawConfig({ hueDegrees: [0, 10], lightness: [0.5], rounds }));
  assert.deepEqual(state.rules.hueDegrees, [...config.hueDegrees]);
  assert.deepEqual(state.rules.lightness, [...config.lightness]);
  assert.deepEqual(state.rules.rounds.map((round) => round.id), config.rounds.map((round) => round.id));
});

test("round titles and notes use code-point limits and empty fallbacks", () => {
  const rounds = config.rounds.map((round) => ({ ...round, target: { ...round.target }, start: { ...round.start } }));
  rounds[0].title = "😀".repeat(20);
  rounds[0].note = " ";
  const state = logic.createStudioState(rawConfig({ rounds }));
  assert.equal(Array.from(state.rules.rounds[0].title).length, 16);
  assert.equal(state.rules.rounds[0].note, "像那天回头时，天边刚好慢下来。");
});

test("CommonJS and browser globals expose matching APIs", () => {
  const loadClassic = (path) => {
    const sandbox = { module: { exports: {} }, globalThis: {} };
    runInNewContext(readFileSync(new URL(path, import.meta.url), "utf8"), sandbox);
    return sandbox;
  };
  const configSandbox = loadClassic("./config.js");
  const logicSandbox = loadClassic("./logic.js");
  assert.equal(configSandbox.module.exports, configSandbox.globalThis.SHARED_COLOR_STUDIO_CONFIG);
  assert.equal(logicSandbox.module.exports, logicSandbox.globalThis.SHARED_COLOR_STUDIO_LOGIC);
  assert.deepEqual(Object.keys(logicSandbox.module.exports), Object.keys(logic));
});

test("composeStudioResult has a complete working default", () => {
  assert.match(config.composeStudioResult({ completed: new Array(5), moves: { hue: 3, lightness: 4 } }), /五张/);
  assert.match(config.composeStudioResult({ completed: new Array(2), moves: { hue: 0, lightness: 0 } }), /2 张/);
});

test("start enters countdown at the first fixed starting point", () => {
  const ready = logic.createStudioState(config);
  const state = logic.startStudio(ready);
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 30);
  assert.equal(state.remainingTicks, 240);
  assert.deepEqual(state.current, config.rounds[0].start);
  assert.equal(state.revision, ready.revision + 1);
});

test("zero countdown starts directly in playing", () => {
  const state = begin();
  assert.equal(state.phase, "playing");
  assert.equal(state.countdownTicks, 0);
});

test("countdown consumes integer ticks without touching the round timer", () => {
  let state = logic.startStudio(logic.createStudioState(rawConfig({ countdownTicks: 3 })));
  state = logic.advanceCountdown(state, 2);
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 1);
  assert.equal(state.remainingTicks, 240);
  state = logic.advanceCountdown(state, 9);
  assert.equal(state.phase, "playing");
  assert.equal(state.countdownTicks, 0);
  assert.equal(state.remainingTicks, 240);
});

test("countdown rejects moves and timer updates by reference", () => {
  const state = logic.startStudio(logic.createStudioState(config));
  assert.equal(logic.applyAxisMove(state, { axis: "hue", direction: 1 }), state);
  assert.equal(logic.advanceTimer(state, 10), state);
  assert.equal(logic.advanceCountdown(state, -1), state);
});

test("hue wraps from 11 to 0 and from 0 to 11", () => {
  const base = begin();
  const atEleven = { ...base, current: { ...base.current, hueIndex: 11 } };
  const atZero = { ...base, current: { ...base.current, hueIndex: 0 } };
  assert.equal(logic.applyAxisMove(atEleven, { axis: "hue", direction: 1 }).current.hueIndex, 0);
  assert.equal(logic.applyAxisMove(atZero, { axis: "hue", direction: -1 }).current.hueIndex, 11);
});

test("lightness clamps at both bounds without adding moves", () => {
  const base = begin();
  const dark = { ...base, current: { ...base.current, lightnessIndex: 0 } };
  const light = { ...base, current: { ...base.current, lightnessIndex: 8 } };
  assert.equal(logic.applyAxisMove(dark, { axis: "lightness", direction: -1 }), dark);
  assert.equal(logic.applyAxisMove(light, { axis: "lightness", direction: 1 }), light);
});

test("each axis changes only its own coordinate and move count", () => {
  const state = begin();
  const hue = logic.applyAxisMove(state, { axis: "hue", direction: 1 });
  assert.equal(hue.current.lightnessIndex, state.current.lightnessIndex);
  assert.deepEqual(hue.moves, { hue: 1, lightness: 0 });
  const lightness = logic.applyAxisMove(state, { axis: "lightness", direction: 1 });
  assert.equal(lightness.current.hueIndex, state.current.hueIndex);
  assert.deepEqual(lightness.moves, { hue: 0, lightness: 1 });
});

test("orthogonal axis moves commute from the same old state", () => {
  const state = begin();
  const hueThenLight = logic.applyAxisMove(
    logic.applyAxisMove(state, { axis: "hue", direction: 1 }),
    { axis: "lightness", direction: 1 },
  );
  const lightThenHue = logic.applyAxisMove(
    logic.applyAxisMove(state, { axis: "lightness", direction: 1 }),
    { axis: "hue", direction: 1 },
  );
  assert.deepEqual(hueThenLight, lightThenHue);
});

test("unknown axes and directions return the original reference", () => {
  const state = begin();
  assert.equal(logic.applyAxisMove(state, { axis: "chroma", direction: 1 }), state);
  assert.equal(logic.applyAxisMove(state, { axis: "hue", direction: 0 }), state);
  assert.equal(logic.applyAxisMove(state, null), state);
});

test("matching only hue leaves the round playing with textual lightness feedback", () => {
  let state = begin();
  while (state.current.hueIndex !== state.rules.rounds[0].target.hueIndex) {
    state = logic.applyAxisMove(state, { axis: "hue", direction: 1 });
  }
  const view = logic.getView(state);
  assert.equal(state.phase, "playing");
  assert.equal(view.hueAxis.direction, "matched");
  assert.equal(view.lightnessAxis.distance, 5);
  assert.match(view.statusLabel, /明度还差/);
});

test("the final matching action appends exactly one success record", () => {
  const success = moveToTarget(begin());
  assert.equal(success.phase, "round-result");
  assert.equal(success.outcome, "success");
  assert.equal(success.completed.length, 1);
  assert.deepEqual(success.completed[0].moves, success.moves);
  assert.equal(success.completed[0].attempts, 1);
  assert.equal(logic.applyAxisMove(success, { axis: "hue", direction: 1 }), success);
  assert.equal(logic.advanceTimer(success, 10), success);
  assert.equal(success.completed.length, 1);
});

test("timer floors positive ticks, clamps at zero, and times out", () => {
  let state = begin({ roundTicks: 50 });
  state = logic.advanceTimer(state, 1.9);
  assert.equal(state.remainingTicks, 49);
  state = logic.advanceTimer(state, 999);
  assert.equal(state.remainingTicks, 0);
  assert.equal(state.phase, "round-result");
  assert.equal(state.outcome, "timeout");
});

test("timeout never writes a completed color slip", () => {
  const state = logic.advanceTimer(begin({ roundTicks: 50 }), 50);
  assert.deepEqual(state.completed, []);
  assert.equal(logic.getView(state).canRetry, true);
  assert.match(logic.getView(state).statusLabel, /时间到了/);
});

test("retry resets the same round and increments its attempt number", () => {
  let state = logic.advanceTimer(begin({ roundTicks: 50 }), 50);
  state = logic.retryRound(state);
  assert.equal(state.phase, "playing");
  assert.equal(state.roundIndex, 0);
  assert.equal(state.attemptNumber, 2);
  assert.equal(state.remainingTicks, 50);
  assert.deepEqual(state.moves, { hue: 0, lightness: 0 });
  assert.deepEqual(state.current, state.rules.rounds[0].start);
});

test("timeout cannot advance and success cannot retry", () => {
  const timeout = logic.advanceTimer(begin({ roundTicks: 50 }), 50);
  const success = moveToTarget(begin());
  assert.equal(logic.advanceRound(timeout), timeout);
  assert.equal(logic.retryRound(success), success);
});

test("success next loads the next fixed round and preserves history", () => {
  const success = moveToTarget(begin());
  const next = logic.advanceRound(success);
  assert.equal(next.roundIndex, 1);
  assert.equal(next.attemptNumber, 1);
  assert.deepEqual(next.current, next.rules.rounds[1].start);
  assert.equal(next.completed.length, 1);
  assert.equal(next.outcome, null);
});

test("the fifth success waits for next and then enters complete", () => {
  let state = begin();
  for (let index = 0; index < 4; index += 1) {
    state = logic.advanceRound(moveToTarget(state));
  }
  state = moveToTarget(state);
  assert.equal(state.phase, "round-result");
  assert.equal(state.completed.length, 5);
  state = logic.advanceRound(state);
  assert.equal(state.phase, "complete");
  assert.equal(state.roundIndex, 4);
  assert.equal(logic.getView(state).canRestart, true);
});

test("restart from progress clears history and returns to ready", () => {
  const success = moveToTarget(begin());
  const restarted = logic.restartStudio(success);
  assert.equal(restarted.phase, "ready");
  assert.equal(restarted.roundIndex, 0);
  assert.equal(restarted.attemptNumber, 1);
  assert.deepEqual(restarted.completed, []);
  assert.deepEqual(restarted.moves, { hue: 0, lightness: 0 });
});

test("start from complete opens a fresh album run", () => {
  const complete = completeAlbum();
  const started = logic.startStudio(complete);
  assert.equal(started.phase, "playing");
  assert.equal(started.roundIndex, 0);
  assert.deepEqual(started.completed, []);
});

test("pause and resume preserve countdown without advancing it", () => {
  const countdown = logic.startStudio(logic.createStudioState(rawConfig({ countdownTicks: 3 })));
  const paused = logic.pauseStudio(countdown, "hidden");
  assert.equal(paused.phase, "paused");
  assert.equal(paused.resumePhase, "countdown");
  assert.equal(paused.pauseReason, "hidden");
  assert.equal(logic.advanceCountdown(paused, 3), paused);
  assert.equal(logic.advanceTimer(paused, 3), paused);
  const resumed = logic.resumeStudio(paused);
  assert.equal(resumed.phase, "countdown");
  assert.equal(resumed.countdownTicks, 3);
  assert.equal(resumed.pauseReason, null);
});

test("pause and resume preserve playing while invalid reasons become manual", () => {
  const playing = begin();
  const paused = logic.pauseStudio(playing, "unknown");
  assert.equal(paused.pauseReason, "manual");
  assert.equal(paused.resumePhase, "playing");
  assert.equal(logic.applyAxisMove(paused, { axis: "hue", direction: 1 }), paused);
  assert.equal(logic.pauseStudio(paused, "blur"), paused);
  assert.equal(logic.resumeStudio(paused).phase, "playing");
});

test("getView reports shortest hue direction with deterministic tie handling", () => {
  const base = begin();
  const clockwise = { ...base, current: { hueIndex: 10, lightnessIndex: 2 } };
  const counter = { ...base, current: { hueIndex: 4, lightnessIndex: 2 } };
  const tie = { ...base, current: { hueIndex: 7, lightnessIndex: 2 } };
  assert.deepEqual(logic.getView(clockwise).hueAxis, {
    currentIndex: 10, targetIndex: 1, distance: 3, direction: "clockwise", label: "色相还差 3 格，顺时针转",
  });
  assert.equal(logic.getView(counter).hueAxis.direction, "counterclockwise");
  assert.equal(logic.getView(tie).hueAxis.direction, "clockwise");
});

test("getView reports lightness direction and matched text without relying on color", () => {
  const state = begin();
  const view = logic.getView(state);
  assert.equal(view.lightnessAxis.direction, "lighter");
  assert.equal(view.lightnessAxis.distance, 5);
  const matched = { ...state, current: { ...state.current, lightnessIndex: 7 } };
  assert.equal(logic.getView(matched).lightnessAxis.label, "明度已经合拍");
});

test("getView exposes phase capabilities and integer time labels", () => {
  const ready = logic.createStudioState(rawConfig({ tickMs: 100, countdownTicks: 21 }));
  assert.equal(logic.getView(ready).canStart, true);
  const countdown = logic.startStudio(ready);
  const view = logic.getView(countdown);
  assert.equal(view.countdownLabel, "3");
  assert.equal(view.remainingMs, 24000);
  assert.equal(view.canPause, true);
  assert.equal(view.canMove, false);
});

test("four control codes classify and unknown codes do not", () => {
  assert.deepEqual(logic.classifyControlCode("KeyA"), { axis: "hue", direction: -1 });
  assert.deepEqual(logic.classifyControlCode("KeyD"), { axis: "hue", direction: 1 });
  assert.deepEqual(logic.classifyControlCode("KeyJ"), { axis: "lightness", direction: -1 });
  assert.deepEqual(logic.classifyControlCode("KeyL"), { axis: "lightness", direction: 1 });
  assert.equal(logic.classifyControlCode("ArrowLeft"), null);
});

test("OKLCH and HSL fallback tokens are stable and match the frozen mapping", () => {
  const color = logic.getView(begin()).targetColor;
  const oklch = logic.getColorTokens(color, true);
  const hsl = logic.getColorTokens(color, false);
  assert.deepEqual(oklch, { mode: "oklch", css: "oklch(76% 0.12 30)", hueDegrees: 30, lightnessPercent: 76 });
  assert.deepEqual(hsl, { mode: "hsl", css: "hsl(30 76% 76%)", hueDegrees: 30, lightnessPercent: 76 });
  assert.deepEqual(logic.getColorTokens(color, false), hsl);
});

test("color mode and chroma do not participate in success rules", () => {
  const defaultSuccess = moveToTarget(begin({ chroma: 0.12 }));
  const otherSuccess = moveToTarget(begin({ chroma: 0.02 }));
  assert.equal(defaultSuccess.outcome, "success");
  assert.equal(otherSuccess.outcome, "success");
  assert.deepEqual(defaultSuccess.current, otherSuccess.current);
});

test("replay is deterministic and ignores unknown events", () => {
  const events = [
    { type: "start" },
    { type: "unknown", nested: { value: 1 } },
    { type: "move", axis: "hue", direction: 1 },
    { type: "move", axis: "lightness", direction: 1 },
    { type: "timer", ticks: 3 },
    { type: "pause", reason: "blur" },
    { type: "resume" },
  ];
  assert.deepEqual(logic.replayStudio(rawConfig({ countdownTicks: 0 }), events), logic.replayStudio(rawConfig({ countdownTicks: 0 }), events));
});

test("replay never modifies the event array or nested event objects", () => {
  const events = [{ type: "start" }, { type: "move", axis: "hue", direction: 1, meta: { source: "key" } }];
  const before = snapshot(events);
  logic.replayStudio(rawConfig({ countdownTicks: 0 }), events);
  assert.deepEqual(events, before);
});

test("replay covers timeout, retry, pause, resume, and restart events", () => {
  const state = logic.replayStudio(rawConfig({ countdownTicks: 0, roundTicks: 50 }), [
    { type: "start" },
    { type: "timer", ticks: 50 },
    { type: "retry" },
    { type: "pause", reason: "stalled" },
    { type: "resume" },
    { type: "restart" },
  ]);
  assert.equal(state.phase, "ready");
  assert.deepEqual(state.completed, []);
});

test("mutating a returned view cannot pollute state or later views", () => {
  const state = begin();
  const view = logic.getView(state);
  view.currentColor.hueIndex = 0;
  view.moves.hue = 99;
  view.completed.push({ id: "fake" });
  const next = logic.getView(state);
  assert.equal(next.currentColor.hueIndex, 8);
  assert.equal(next.moves.hue, 0);
  assert.deepEqual(next.completed, []);
});

test("malicious-looking copy remains inert ordinary text", () => {
  const title = "<img src=x onerror=alert(1)>";
  const state = logic.createStudioState(rawConfig({ copy: { ...config.copy, title } }));
  assert.equal(state.rules.copy.title, Array.from(title).slice(0, 24).join(""));
  assert.equal(typeof state.rules.copy.title, "string");
});

test("all reducers leave their input states structurally untouched", () => {
  const ready = logic.createStudioState(rawConfig({ countdownTicks: 2, roundTicks: 50 }));
  const countdown = logic.startStudio(ready);
  const playing = logic.advanceCountdown(countdown, 2);
  const moved = logic.applyAxisMove(playing, { axis: "hue", direction: 1 });
  const timed = logic.advanceTimer(moved, 50);
  const retried = logic.retryRound(timed);
  const paused = logic.pauseStudio(retried, "manual");
  const resumed = logic.resumeStudio(paused);
  const success = moveToTarget(logic.advanceCountdown(resumed, resumed.countdownTicks));
  const cases = [
    [ready, () => logic.startStudio(ready)],
    [countdown, () => logic.advanceCountdown(countdown, 1)],
    [playing, () => logic.applyAxisMove(playing, { axis: "lightness", direction: 1 })],
    [moved, () => logic.advanceTimer(moved, 1)],
    [timed, () => logic.retryRound(timed)],
    [retried, () => logic.pauseStudio(retried, "hidden")],
    [paused, () => logic.resumeStudio(paused)],
    [success, () => logic.advanceRound(success)],
    [success, () => logic.restartStudio(success)],
  ];
  for (const [input, reducer] of cases) {
    const before = snapshot(input);
    reducer();
    assert.deepEqual(snapshot(input), before);
  }
});

test("empty rounds and out-of-range round indexes never throw", () => {
  const valid = logic.createStudioState(config);
  const malformed = [
    { phase: "ready", rules: { rounds: [] } },
    { ...valid, rules: { ...valid.rules, rounds: [] } },
    { ...valid, roundIndex: -1 },
    { ...valid, roundIndex: 5 },
  ];
  for (const state of malformed) {
    assert.doesNotThrow(() => logic.startStudio(state));
    assert.equal(logic.startStudio(state), state);
    assert.equal(logic.getView(state), null);
  }
});

test("missing nested state fields and invalid paused structures are rejected", () => {
  const playing = begin();
  const paused = logic.pauseStudio(playing, "hidden");
  const malformed = [
    { ...playing, current: null },
    { ...playing, moves: null },
    { ...playing, completed: null },
    { ...playing, remainingTicks: -1 },
    { ...playing, revision: Number.NaN },
    { ...paused, resumePhase: "ready" },
    { ...paused, pauseReason: "unknown" },
    { ...playing, pauseReason: "hidden" },
  ];
  for (const state of malformed) {
    assert.equal(logic.getView(state), null);
    assert.equal(logic.applyAxisMove(state, { axis: "hue", direction: 1 }), state);
  }
});

test("every public state reducer safely returns malformed input by reference", () => {
  const malformed = {
    phase: "ready",
    roundIndex: 0,
    rules: { rounds: [] },
  };
  const reducers = [
    () => logic.startStudio(malformed),
    () => logic.advanceCountdown(malformed, 1),
    () => logic.applyAxisMove(malformed, { axis: "hue", direction: 1 }),
    () => logic.advanceTimer(malformed, 1),
    () => logic.retryRound(malformed),
    () => logic.advanceRound(malformed),
    () => logic.pauseStudio(malformed, "hidden"),
    () => logic.resumeStudio(malformed),
    () => logic.restartStudio(malformed),
  ];
  for (const reduce of reducers) {
    assert.doesNotThrow(reduce);
    assert.equal(reduce(), malformed);
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
