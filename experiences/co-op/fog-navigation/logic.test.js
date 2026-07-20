"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import "./config.js";
import "./levels.js";
import "./logic.js";

const logic = globalThis.FogNavigationLogic;
const levels = globalThis.FOG_NAVIGATION_LEVELS;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeepFrozen);
}

function directionBetween(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (dx === 1 && dy === 0) return "right";
  if (dx === -1 && dy === 0) return "left";
  if (dx === 0 && dy === 1) return "down";
  if (dx === 0 && dy === -1) return "up";
  throw new Error(`non-adjacent step: ${from} -> ${to}`);
}

function followPath(state, path) {
  let next = state;
  for (let index = 1; index < path.length; index += 1) {
    next = logic.move(next, directionBetween(path[index - 1], path[index]));
  }
  return next;
}

function drivingState(roundIndex = 0) {
  let state = logic.driverReady(logic.cover(logic.start(logic.createInitialState()), "manual"));
  for (let index = 0; index < roundIndex; index += 1) {
    state = followPath(state, logic.findSafePath(levels[index]));
    state = logic.driverReady(logic.cover(logic.nextRound(state), "manual"));
  }
  return state;
}

function completeGame() {
  let state = drivingState();
  for (let index = 0; index < levels.length; index += 1) {
    state = followPath(state, logic.findSafePath(levels[index]));
    if (index < levels.length - 1) state = logic.driverReady(logic.cover(logic.nextRound(state), "manual"));
  }
  return state;
}

test("exports the frozen A-level rule contract", () => {
  assert.equal(logic.WIDTH, 13);
  assert.equal(logic.HEIGHT, 9);
  assert.equal(logic.LOCAL_RADIUS, 2);
  assert.equal(logic.LOCAL_WINDOW_SIZE, 5);
  assert.equal(logic.TICKS_PER_SECOND, 30);
  assert.equal(logic.BRIEFING_TICKS, 210);
  assert.deepEqual(logic.DIRECTIONS, ["up", "right", "down", "left"]);
  assert.deepEqual(logic.PHASES, ["intro", "briefing", "cover", "driving", "retry", "round-result", "complete"]);
  assertDeepFrozen(logic);
});

test("classic wrappers expose browser globals and CommonJS dependencies", () => {
  const context = createContext({});
  const execute = (name) => runInContext(readFileSync(new URL(name, import.meta.url), "utf8"), context, { filename: name });

  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = () => { throw new Error("config has no dependencies"); };
  execute("config.js");
  const commonConfig = context.module.exports;

  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = () => { throw new Error("levels has no dependencies"); };
  execute("levels.js");
  const commonLevels = context.module.exports;

  context.FOG_NAVIGATION_CONFIG = undefined;
  context.FOG_NAVIGATION_LEVELS = undefined;
  const required = [];
  context.module = { exports: {} };
  context.exports = context.module.exports;
  context.require = (specifier) => {
    required.push(specifier);
    if (specifier === "./levels.js") return commonLevels;
    if (specifier === "./config.js") return commonConfig;
    throw new Error(`unexpected dependency: ${specifier}`);
  };
  execute("logic.js");
  assert.deepEqual(required, ["./levels.js", "./config.js"]);
  assert.equal(context.module.exports.validateLevels(commonLevels), true);
  assert.equal(context.module.exports.ACTIVE_CONFIG.seats[0], "你");
});

test("freezes the exact four specified maps and role order", () => {
  assert.deepEqual(levels.map((level) => ({
    id: level.id,
    title: level.title,
    navigatorSeat: level.navigatorSeat,
    critical: level.critical,
    safeDistance: level.safeDistance,
    rows: level.rows,
  })), [
    {
      id: "mist-pine-slope", title: "雾松坡", navigatorSeat: 0,
      critical: { cell: [5, 4], safe: "right", decoy: "left", arrival: "up" }, safeDistance: 22,
      rows: ["#############", "#####S#######", "#####.#######", "#####.#######", "#H.........A#", "###########.#", "###########.#", "#G....B.....#", "#############"],
    },
    {
      id: "wind-chime-lane", title: "风铃巷", navigatorSeat: 1,
      critical: { cell: [5, 4], safe: "down", decoy: "up", arrival: "left" }, safeDistance: 13,
      rows: ["#############", "#####H......#", "#####.#######", "#####.#######", "#S....#######", "#####.#######", "#####.#######", "#####...A.BG#", "#############"],
    },
    {
      id: "moss-light-shore", title: "苔光岸", navigatorSeat: 0,
      critical: { cell: [7, 4], safe: "left", decoy: "right", arrival: "down" }, safeDistance: 22,
      rows: ["#############", "#.....B....G#", "#.###########", "#.###########", "#A.........H#", "#######.#####", "#######.#####", "#######S#####", "#############"],
    },
    {
      id: "home-lantern-terrace", title: "归灯台", navigatorSeat: 1,
      critical: { cell: [6, 4], safe: "up", decoy: "down", arrival: "right" }, safeDistance: 13,
      rows: ["#############", "#GBA...######", "######.######", "######.######", "######.....S#", "######.######", "######.######", "#.....H######", "#############"],
    },
  ]);
  assert.deepEqual(levels.map((level) => level.navigatorSeat), [0, 1, 0, 1]);
  assertDeepFrozen(levels);
});

test("validates the complete set and atomically falls back on duplicate IDs", () => {
  assert.equal(logic.validateLevels(levels), true);
  const copy = clone(levels);
  const normalized = logic.normalizeLevels(copy);
  assert.notStrictEqual(normalized, copy);
  assertDeepFrozen(normalized);
  copy[1].id = copy[0].id;
  assert.equal(logic.validateLevels(copy), false);
  assert.strictEqual(logic.normalizeLevels(copy), logic.LEVELS);
});

test("rejects malformed schemas, characters, edges, metadata and critical branches", () => {
  const cases = [];
  const extra = clone(levels[0]); extra.extra = true; cases.push(extra);
  const id = clone(levels[0]); id.id = "Bad ID"; cases.push(id);
  const width = clone(levels[0]); width.rows[1] += "."; cases.push(width);
  const height = clone(levels[0]); height.rows.pop(); cases.push(height);
  const edge = clone(levels[0]); edge.rows[0] = ".############"; cases.push(edge);
  const unknown = clone(levels[0]); unknown.rows[2] = "#####X#######"; cases.push(unknown);
  const duplicateStart = clone(levels[0]); duplicateStart.rows[2] = "#####S#######"; cases.push(duplicateStart);
  const missingHazard = clone(levels[0]); missingHazard.rows[4] = "#..........A#"; cases.push(missingHazard);
  const landmarks = clone(levels[0]); landmarks.landmarks.C = "多余"; cases.push(landmarks);
  const seat = clone(levels[0]); seat.navigatorSeat = 2; cases.push(seat);
  const directions = clone(levels[0]); directions.critical.decoy = "right"; cases.push(directions);
  const arrival = clone(levels[0]); arrival.critical.arrival = "down"; cases.push(arrival);
  const distance = clone(levels[0]); distance.safeDistance = 21; cases.push(distance);
  cases.forEach((level) => assert.equal(logic.validateLevel(level), false));
  const accessor = clone(levels[0]);
  Object.defineProperty(accessor, "rows", { enumerable: true, get() { throw new Error("no"); } });
  assert.equal(logic.validateLevel(accessor), false);
});

test("BFS proves fixed distances, adjacency, endpoints and hazard avoidance", () => {
  assert.deepEqual(levels.map((level) => logic.findSafePath(level).length - 1), [22, 13, 22, 13]);
  levels.forEach((level) => {
    const path = logic.findSafePath(level);
    assert.equal(level.rows[path[0][1]][path[0][0]], "S");
    assert.equal(level.rows[path.at(-1)[1]][path.at(-1)[0]], "G");
    assert.equal(path.some(([x, y]) => level.rows[y][x] === "H"), false);
    path.slice(1).forEach((point, index) => {
      assert.equal(Math.abs(point[0] - path[index][0]) + Math.abs(point[1] - path[index][1]), 1);
    });
    assertDeepFrozen(path);
  });
});

test("BFS returns isolated paths and separately proves every hazard reachable", () => {
  const first = logic.findSafePath(levels[0]);
  assert.throws(() => { first[0][0] = 99; }, TypeError);
  assert.deepEqual(logic.findSafePath(levels[0])[0], [5, 1]);
  levels.forEach((level) => {
    assert.equal(logic.findReachablePath(level, { target: "H" }).length, 0);
    const path = logic.findReachablePath(level, { hazardsWalkable: true, target: "H" });
    assert.ok(path.length > 0);
    assert.equal(level.rows[path.at(-1)[1]][path.at(-1)[0]], "H");
  });
});

test("canonical cooperation proof passes equal two-step local projections on all maps", () => {
  levels.forEach((level) => {
    const gate = logic.analyzeCooperationGate(level);
    assert.equal(gate.valid, true);
    assert.equal(gate.equivalentFirstTwo, true);
    assert.equal(gate.decoyEndsAtHazard, true);
    assert.equal(gate.safeReachesGoal, true);
    assert.deepEqual(gate.safeSignatures, gate.decoySignatures);
    assert.equal(gate.safeSignatures.length, 2);
    assert.equal(gate.safeSignatures.some((value) => /hazard|mist|H/.test(value)), false);
    assertDeepFrozen(gate);
  });
});

test("canonical signatures erase heading, mirror and specific landmark identity", () => {
  const level = levels[0];
  const safeFirst = [level.critical.cell[0] + 1, level.critical.cell[1]];
  const decoyFirst = [level.critical.cell[0] - 1, level.critical.cell[1]];
  assert.equal(
    logic.canonicalLocalSignature(level, safeFirst, "right"),
    logic.canonicalLocalSignature(level, decoyFirst, "left"),
  );
  assert.equal(logic.canonicalLocalSignature(level, safeFirst, "sideways"), null);
});

test("normalizes two Unicode names as one safe configuration unit", () => {
  const result = logic.normalizeConfig({
    seats: [`  ${"😀".repeat(15)}  `, "  阿雾  "],
    composeCompletionNote: () => " 好的 ",
  });
  assert.deepEqual(result.seats, ["😀".repeat(12), "阿雾"]);
  assert.equal(result.composeCompletionNote({ seats: result.seats }), "好的");
  assertDeepFrozen(result);

  assert.deepEqual(logic.normalizeConfig({ seats: ["同名", "同名"] }).seats, ["你", "我"]);
  assert.deepEqual(logic.normalizeConfig({ seats: ["", "我"] }).seats, ["你", "我"]);
  const getter = {};
  Object.defineProperty(getter, "seats", { enumerable: true, get() { throw new Error("no"); } });
  assert.deepEqual(logic.normalizeConfig(getter).seats, ["你", "我"]);
});

test("completion composer receives a disconnected frozen guard and fails closed", () => {
  const summary = { seats: ["岚", "月"], rounds: [{ steps: 13 }] };
  let received;
  assert.equal(logic.resolveCompletionNote(summary, {
    seats: ["岚", "月"],
    composeCompletionNote(value) {
      received = value;
      return `${value.seats[0]}和${value.seats[1]}一起到灯下。`;
    },
  }), "岚和月一起到灯下。");
  assertDeepFrozen(received);
  assert.notStrictEqual(received, summary);
  assert.notStrictEqual(received.rounds, summary.rounds);

  const fallback = "岚和月，雾再浓一点，也会有人记得方向。";
  assert.equal(logic.resolveCompletionNote(summary, { seats: ["岚", "月"], composeCompletionNote: () => " " }), fallback);
  assert.equal(logic.resolveCompletionNote(summary, { seats: ["岚", "月"], composeCompletionNote: () => "雾".repeat(121) }), fallback);
  assert.equal(logic.resolveCompletionNote(summary, { seats: ["岚", "月"], composeCompletionNote: () => { throw new Error("no"); } }), fallback);
  assert.equal(logic.resolveCompletionNote(summary, {
    seats: ["岚", "月"],
    composeCompletionNote(value) { value.rounds[0].steps = 0; return "不应采用"; },
  }), fallback);
  assert.equal(summary.rounds[0].steps, 13);

  const hostileSummary = {};
  Object.defineProperty(hostileSummary, "seats", {
    enumerable: true,
    get() { throw new Error("summary seats unavailable"); },
  });
  assert.equal(logic.resolveCompletionNote(hostileSummary, {
    seats: ["岚", "月"],
    composeCompletionNote(value) { return value.seats.join("和"); },
  }), fallback);
});

test("creates an exact frozen intro and starts the first 210-tick briefing", () => {
  const intro = logic.createInitialState();
  assert.deepEqual(intro, {
    phase: "intro", roundIndex: 0, briefingTicks: 0, position: [5, 1], path: [[5, 1]],
    attempt: 1, bumpCount: 0, completedRounds: [], coverReason: null, feedbackCode: null, revision: 0,
  });
  const briefing = logic.start(intro);
  assert.equal(briefing.phase, "briefing");
  assert.equal(briefing.briefingTicks, 210);
  assert.equal(briefing.revision, 1);
  assert.strictEqual(logic.start(briefing), briefing);
  assertDeepFrozen(briefing);
});

test("briefing stays open through tick 209 and atomically covers on tick 210", () => {
  const briefing = logic.start(logic.createInitialState());
  const almost = logic.tickBriefing(briefing, 209);
  assert.equal(almost.phase, "briefing");
  assert.equal(almost.briefingTicks, 1);
  const covered = logic.tickBriefing(almost);
  assert.equal(covered.phase, "cover");
  assert.equal(covered.briefingTicks, 0);
  assert.equal(covered.coverReason, "timer");
  assert.strictEqual(logic.tickBriefing(covered, 1000), covered);
  assert.equal(logic.tickBriefing(briefing, 1000).phase, "cover");
  assert.strictEqual(logic.tickBriefing(briefing, 0), briefing);
  assert.strictEqual(logic.tickBriefing(briefing, 1.5), briefing);
});

test("manual, hidden and blur cover only a live briefing and preserve first reason", () => {
  for (const reason of ["manual", "hidden", "blur"]) {
    const briefing = logic.start(logic.createInitialState());
    const covered = logic.cover(briefing, reason);
    assert.equal(covered.phase, "cover");
    assert.equal(covered.coverReason, reason);
    assert.strictEqual(logic.cover(covered, "blur"), covered);
  }
  const intro = logic.createInitialState();
  assert.strictEqual(logic.cover(intro, "hidden"), intro);
  const briefing = logic.start(intro);
  assert.strictEqual(logic.cover(briefing, "timer"), briefing);
});

test("driver readiness clears the cover reason without changing the round", () => {
  const covered = logic.cover(logic.start(logic.createInitialState()), "hidden");
  const driving = logic.driverReady(covered);
  assert.equal(driving.phase, "driving");
  assert.equal(driving.roundIndex, 0);
  assert.equal(driving.coverReason, null);
  assert.deepEqual(driving.position, [5, 1]);
  assert.strictEqual(logic.driverReady(driving), driving);
});

test("walls and boundaries bump without moving or extending the path", () => {
  const state = drivingState();
  const bumped = logic.move(state, "up");
  assert.equal(bumped.phase, "driving");
  assert.deepEqual(bumped.position, state.position);
  assert.deepEqual(bumped.path, state.path);
  assert.equal(bumped.bumpCount, 1);
  assert.equal(bumped.feedbackCode, "wall");
  assert.strictEqual(logic.move(state, "north"), state);
});

test("safe movement appends one cell and landmarks publish only a neutral code", () => {
  const level = levels[0];
  const safePath = logic.findSafePath(level);
  const landmarkIndex = safePath.findIndex(([x, y]) => ["A", "B"].includes(level.rows[y][x]));
  assert.ok(landmarkIndex > 0);
  const state = followPath(drivingState(), safePath.slice(0, landmarkIndex + 1));
  const character = level.rows[state.position[1]][state.position[0]];
  assert.equal(state.feedbackCode, `landmark-${character}`);
  assert.equal(state.path.length, landmarkIndex + 1);
  assert.equal(state.bumpCount, 0);
});

test("entering H resets the public path, increments attempt and reviews the same roles", () => {
  const level = levels[0];
  const hazardPath = logic.findReachablePath(level, { hazardsWalkable: true, target: "H" });
  const retry = followPath(drivingState(), hazardPath);
  assert.equal(retry.phase, "retry");
  assert.equal(retry.attempt, 2);
  assert.deepEqual(retry.position, hazardPath[0]);
  assert.deepEqual(retry.path, [hazardPath[0]]);
  assert.equal(retry.feedbackCode, "mist-trap");
  const briefing = logic.review(retry);
  assert.equal(briefing.phase, "briefing");
  assert.equal(briefing.briefingTicks, 210);
  assert.equal(briefing.roundIndex, 0);
  assert.equal(briefing.attempt, 2);
});

test("goal entry creates one atomic immutable round summary", () => {
  const result = followPath(drivingState(), logic.findSafePath(levels[0]));
  assert.equal(result.phase, "round-result");
  assert.equal(result.completedRounds.length, 1);
  assert.deepEqual(result.completedRounds[0], {
    levelId: "mist-pine-slope", navigatorSeat: 0, driverSeat: 1, steps: 22, attempts: 1, bumps: 0,
  });
  assert.equal(result.feedbackCode, "goal");
  assertDeepFrozen(result.completedRounds[0]);
});

test("four safe paths complete with symmetric 0/1/0/1 roles", () => {
  const complete = completeGame();
  assert.equal(complete.phase, "complete");
  assert.deepEqual(complete.completedRounds.map((round) => round.navigatorSeat), [0, 1, 0, 1]);
  assert.deepEqual(complete.completedRounds.map((round) => round.driverSeat), [1, 0, 1, 0]);
  assert.deepEqual(complete.completedRounds.map((round) => round.steps), [22, 13, 22, 13]);
  const view = logic.getPublicView(complete);
  assert.deepEqual(view.roleCounts.map(({ navigator, driver }) => [navigator, driver]), [[2, 2], [2, 2]]);
  assert.equal(view.summaries.length, 4);
});

test("next round resets attempt, bumps, position and path without altering summaries", () => {
  let result = drivingState();
  result = logic.move(result, "up");
  result = followPath(result, logic.findSafePath(levels[0]));
  const next = logic.nextRound(result);
  assert.equal(next.phase, "briefing");
  assert.equal(next.roundIndex, 1);
  assert.equal(next.attempt, 1);
  assert.equal(next.bumpCount, 0);
  assert.deepEqual(next.position, [1, 4]);
  assert.deepEqual(next.path, [[1, 4]]);
  assert.equal(next.completedRounds.length, 1);
});

test("illegal phase actions retain reference while malformed state recovers safely", () => {
  const intro = logic.createInitialState();
  for (const action of [
    () => logic.driverReady(intro),
    () => logic.move(intro, "down"),
    () => logic.review(intro),
    () => logic.nextRound(intro),
    () => logic.reduce(intro, { type: "UNKNOWN" }),
    () => logic.reduce(intro, null),
  ]) assert.strictEqual(action(), intro);
  const recovered = logic.move({ phase: "driving" }, "down");
  assert.deepEqual(recovered, intro);
  assert.notStrictEqual(recovered, intro);
});

test("restart from every legal phase clears history and revision", () => {
  const samples = [
    logic.createInitialState(),
    logic.start(logic.createInitialState()),
    logic.cover(logic.start(logic.createInitialState()), "manual"),
    drivingState(),
    followPath(drivingState(), logic.findReachablePath(levels[0], { hazardsWalkable: true, target: "H" })),
    followPath(drivingState(), logic.findSafePath(levels[0])),
    completeGame(),
  ];
  samples.forEach((state) => assert.deepEqual(logic.restart(state), logic.createInitialState()));
});

test("navigator view exists only in briefing and owns the full map", () => {
  const intro = logic.createInitialState();
  assert.equal(logic.getNavigatorView(intro), null);
  const briefing = logic.start(intro);
  const view = logic.getNavigatorView(briefing);
  assert.equal(view.grid.length, 117);
  assert.equal(view.safePath.length, 23);
  assert.equal(view.secondsRemaining, 7);
  assert.equal(view.grid.filter((cell) => cell.kind === "hazard").length, 1);
  assert.equal(view.navigatorName, "你");
  assert.equal(view.driverName, "我");
  assertDeepFrozen(view);
  assert.equal(logic.getNavigatorView(logic.cover(briefing, "manual")), null);
});

test("driver view is exactly 25 local cells and disguises a visible H as floor", () => {
  const level = levels[0];
  const path = logic.findReachablePath(level, { hazardsWalkable: true, target: "H" });
  const beforeHazard = followPath(drivingState(), path.slice(0, -1));
  const hazard = path.at(-1);
  const dx = hazard[0] - beforeHazard.position[0];
  const dy = hazard[1] - beforeHazard.position[1];
  const view = logic.getDriverView(beforeHazard);
  assert.equal(view.cells.length, 25);
  assert.deepEqual(view.position, [2, 2]);
  assert.equal(view.cells.find((cell) => cell.dx === dx && cell.dy === dy).kind, "floor");
  assert.equal(view.cells.some((cell) => Object.hasOwn(cell, "x") || Object.hasOwn(cell, "y")), false);
  assert.equal(JSON.stringify(view).includes("hazard"), false);
  assert.equal(JSON.stringify(view).includes("critical"), false);
  assert.equal(JSON.stringify(view).includes("safePath"), false);
  assertDeepFrozen(view);
});

test("public cover, retry and result projections exclude prior private map facts", () => {
  const briefing = logic.start(logic.createInitialState());
  const cover = logic.getPublicView(logic.cover(briefing, "blur"));
  const hazardPath = logic.findReachablePath(levels[0], { hazardsWalkable: true, target: "H" });
  const retry = logic.getPublicView(followPath(drivingState(), hazardPath));
  const result = logic.getPublicView(followPath(drivingState(), logic.findSafePath(levels[0])));
  for (const view of [cover, retry, result]) {
    const serialized = JSON.stringify(view);
    assert.equal(serialized.includes("#############"), false);
    assert.equal(serialized.includes("safePath"), false);
    assert.equal(serialized.includes("critical"), false);
    assert.equal(serialized.includes("mist-trap"), view.phase === "retry");
  }
  assert.equal(logic.getPublicView(null), null);
});

test("native-style KeyboardEvent accessors classify arrows and reject unsafe input", () => {
  const state = drivingState();
  const event = (code, fields = {}) => Object.create({
    get code() { return code; },
    get key() { return fields.key; },
    get repeat() { return fields.repeat === true; },
    get ctrlKey() { return fields.ctrlKey === true; },
    get altKey() { return false; },
    get metaKey() { return false; },
    get shiftKey() { return false; },
    get target() { return fields.target || null; },
  });
  assert.deepEqual(logic.classifyDirectionKey(state, event("ArrowUp")), { type: "MOVE", direction: "up" });
  assert.equal(logic.directionFromKeyboardEvent(event("", { key: "ArrowLeft" })), "left");
  assert.equal(logic.classifyDirectionKey(state, event("ArrowDown", { repeat: true })), null);
  assert.equal(logic.classifyDirectionKey(state, event("ArrowDown", { ctrlKey: true })), null);
  assert.equal(logic.classifyDirectionKey(state, event("ArrowDown", { target: { tagName: "textarea" } })), null);
  assert.equal(logic.classifyDirectionKey(logic.createInitialState(), event("ArrowDown")), null);
  const hostile = Object.create({ get code() { throw new Error("no"); } });
  assert.equal(logic.directionFromKeyboardEvent(hostile), null);
});

test("reducer trace replay is deterministic across scheduling and presentation metadata", () => {
  const path = logic.findSafePath(levels[0]);
  const moves = path.slice(1).map((point, index) => ({ type: "MOVE", direction: directionBetween(path[index], point) }));
  const trace = [{ type: "START" }, { type: "TICK", ticks: 100 }, { type: "TICK", ticks: 110 }, { type: "DRIVER_READY" }, ...moves];
  const first = logic.replay(trace);
  const second = logic.replay(trace);
  assert.deepEqual(second, first);
  assert.equal(first.phase, "round-result");
  assert.equal(first.completedRounds[0].steps, 22);
  assertDeepFrozen(first);
});

test("state and views never retain mutable caller arrays or malformed accessors", () => {
  const actions = [{ type: "START" }];
  const replayed = logic.replay(actions);
  actions[0].type = "RESTART";
  assert.equal(replayed.phase, "briefing");
  assertDeepFrozen(replayed);

  const hostileAction = {};
  Object.defineProperty(hostileAction, "type", { enumerable: true, get() { throw new Error("no"); } });
  assert.strictEqual(logic.reduce(replayed, hostileAction), replayed);
  const malformed = clone(replayed);
  malformed.path.push([99, 99]);
  assert.equal(logic.isFogNavigationState(malformed), false);
  assert.equal(logic.getPublicView(malformed), null);
});

test("production logic has no network, storage, randomness or third-party runtime hook", () => {
  const source = readFileSync(new URL("logic.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.random|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|import\s*\(/);
  assert.doesNotMatch(source, /shared\//);
});
