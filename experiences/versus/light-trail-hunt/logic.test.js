"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import "./config.js";
import "./logic.js";

const config = globalThis.LIGHT_TRAIL_HUNT_CONFIG;
const logic = globalThis.LIGHT_TRAIL_HUNT_LOGIC;

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function fixtureRules(first, second, grid = { columns: 7, rows: 7 }) {
  return {
    grid,
    spawnVariants: [
      [first, second],
      [
        { ...second, direction: opposite(second.direction) },
        { ...first, direction: opposite(first.direction) },
      ],
    ],
  };
}

function opposite(direction) {
  return ({ N: "S", E: "W", S: "N", W: "E" })[direction];
}

function replay(first, second, ticks, grid) {
  return logic.replayRound(
    { spawnVariant: 0, ticks: ticks.map((turns) => ({ turns })) },
    fixtureRules(first, second, grid),
  );
}

function begin(rawConfig = { countdownMs: 0, grid: { columns: 12, rows: 8 } }) {
  return logic.startMatch(logic.createMatchState(rawConfig));
}

function finishRound(state, winner) {
  const loser = winner === 0 ? 1 : 0;
  const fatalAfter = loser === 0 ? 3 : 6;
  for (let index = 0; index < fatalAfter; index += 1) {
    const turns = [0, 0];
    if (index === 0) turns[loser] = loser === 0 ? -1 : 1;
    state = logic.stepRound(state, { turns });
  }
  assert.equal(logic.getView(state).outcome.winner, winner);
  return state;
}

function finishDraw(state) {
  for (let index = 0; index < 3; index += 1) {
    state = logic.stepRound(state, { turns: index === 0 ? [-1, -1] : [0, 0] });
  }
  assert.equal(logic.getView(state).outcome.type, "draw");
  return state;
}

function assertNoMutableCollections(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(ArrayBuffer.isView(value), false);
  assert.equal(value instanceof Map, false);
  assert.equal(value instanceof Set, false);
  for (const child of Object.values(value)) assertNoMutableCollections(child, seen);
}

test("default and invalid configuration use safe fallbacks", () => {
  const fallback = logic.createMatchState({
    playerNames: ["   ", "ABCDEFGHIJKLMNO"],
    grid: { columns: 4, rows: 3 },
    tickMs: 20,
    countdownMs: 9000,
    maxRounds: 99,
    targetScore: 99,
    copy: { title: "" },
  });
  assert.deepEqual(fallback.playerNames, ["玩家 1", "ABCDEFGHIJKL"]);
  assert.deepEqual(fallback.rules.grid, { columns: 48, rows: 32 });
  assert.equal(fallback.rules.tickMs, 100);
  assert.equal(fallback.rules.countdownMs, 2400);
  assert.equal(fallback.rules.maxRounds, 3);
  assert.equal(fallback.rules.targetScore, 2);
  assert.equal(fallback.rules.copy.title, "光轨围猎");
  assert.match(config.composeMatchResult({ playerNames: ["甲", "乙"], scores: [2, 1] }), /甲/);
});

test("CommonJS and browser global entries expose the same logic API", () => {
  const loadCommonJs = (path) => {
    const sandbox = { module: { exports: {} }, globalThis: {} };
    runInNewContext(readFileSync(new URL(path, import.meta.url), "utf8"), sandbox);
    return { exported: sandbox.module.exports, global: sandbox.globalThis };
  };
  const commonConfig = loadCommonJs("./config.js");
  const commonLogic = loadCommonJs("./logic.js");
  assert.equal(commonConfig.exported, commonConfig.global.LIGHT_TRAIL_HUNT_CONFIG);
  assert.equal(commonLogic.exported, commonLogic.global.LIGHT_TRAIL_HUNT_LOGIC);
  assert.deepEqual(Object.keys(commonLogic.exported), Object.keys(logic));
});

test("six turn keys classify and unknown keys do not", () => {
  assert.deepEqual(logic.classifyTurnCode("KeyA"), { player: 0, turn: -1 });
  assert.deepEqual(logic.classifyTurnCode("KeyD"), { player: 0, turn: 1 });
  assert.deepEqual(logic.classifyTurnCode("ArrowLeft"), { player: 1, turn: -1 });
  assert.deepEqual(logic.classifyTurnCode("ArrowRight"), { player: 1, turn: 1 });
  assert.deepEqual(logic.classifyTurnCode("KeyJ"), { player: 1, turn: -1 });
  assert.deepEqual(logic.classifyTurnCode("KeyL"), { player: 1, turn: 1 });
  assert.equal(logic.classifyTurnCode("Escape"), null);
});

test("safe movement commits both players atomically", () => {
  const result = replay(
    { x: 1, y: 3, direction: "E" },
    { x: 5, y: 3, direction: "W" },
    [[0, 0]],
  );
  assert.deepEqual(result.players.map(({ x, y }) => ({ x, y })), [{ x: 2, y: 3 }, { x: 4, y: 3 }]);
  assert.equal(result.occupiedCells.length, 4);
  assert.equal(result.outcome, null);
});

test("one wall collision gives the survivor the round", () => {
  const result = replay(
    { x: 0, y: 2, direction: "W" },
    { x: 5, y: 4, direction: "W" },
    [[0, 0]],
  );
  assert.equal(result.outcome.type, "winner");
  assert.equal(result.outcome.winner, 1);
  assert.deepEqual(result.outcome.reasons, [["wall"], []]);
});

test("two wall collisions in one tick are a draw", () => {
  const result = replay(
    { x: 0, y: 2, direction: "W" },
    { x: 6, y: 4, direction: "E" },
    [[0, 0]],
  );
  assert.equal(result.outcome.type, "draw");
  assert.deepEqual(result.outcome.reasons, [["wall"], ["wall"]]);
});

test("a player can collide with their own prior trail", () => {
  const result = replay(
    { x: 2, y: 2, direction: "E" },
    { x: 6, y: 6, direction: "W" },
    [[1, 0], [1, 0], [1, 0], [1, 0]],
  );
  assert.deepEqual(result.outcome.reasons[0], ["own-trail"]);
  assert.equal(result.outcome.winner, 1);
});

test("a player can collide with the rival's prior trail", () => {
  const result = replay(
    { x: 2, y: 2, direction: "E" },
    { x: 3, y: 2, direction: "S" },
    [[0, 0]],
  );
  assert.deepEqual(result.outcome.reasons[0], ["rival-trail"]);
  assert.equal(result.outcome.winner, 1);
});

test("same destination and head swap are simultaneous draws", () => {
  const same = replay(
    { x: 2, y: 3, direction: "E" },
    { x: 4, y: 3, direction: "W" },
    [[0, 0]],
  );
  assert.deepEqual(same.outcome.reasons, [["same-destination"], ["same-destination"]]);
  const swap = replay(
    { x: 2, y: 3, direction: "E" },
    { x: 3, y: 3, direction: "W" },
    [[0, 0]],
  );
  assert.deepEqual(swap.outcome.reasons, [
    ["rival-trail", "head-swap"],
    ["rival-trail", "head-swap"],
  ]);
});

test("different fatal reasons in the same tick still draw", () => {
  const result = replay(
    { x: 3, y: 0, direction: "E" },
    { x: 2, y: 4, direction: "E" },
    [[0, 1], [0, 1], [0, 1], [0, 1]],
  );
  assert.equal(result.outcome.type, "draw");
  assert.deepEqual(result.outcome.reasons, [["wall"], ["own-trail"]]);
});

test("fatal ticks preserve reason order and never half-commit", () => {
  const result = replay(
    { x: 2, y: 3, direction: "E" },
    { x: 3, y: 3, direction: "W" },
    [[0, 0]],
  );
  assert.deepEqual(result.outcome.reasons[0], ["rival-trail", "head-swap"]);
  assert.equal(result.occupiedCells.length, 2);
  assert.deepEqual(result.players.map(({ x, y }) => ({ x, y })), [{ x: 2, y: 3 }, { x: 3, y: 3 }]);
  assert.deepEqual(result.outcome.attempts, [{ x: 3, y: 3 }, { x: 2, y: 3 }]);
});

test("last intent wins and player event order cannot change a tick", () => {
  const state = begin();
  const firstOrder = [0, 0];
  firstOrder[0] = -1;
  firstOrder[0] = 1;
  firstOrder[1] = -1;
  const secondOrder = [0, 0];
  secondOrder[1] = -1;
  secondOrder[0] = -1;
  secondOrder[0] = 1;
  const first = logic.stepRound(state, { turns: firstOrder });
  const second = logic.stepRound(state, { turns: secondOrder });
  assert.deepEqual(first, second);
  assert.equal(logic.getView(first).board.players[0].direction, "S");
});

test("spawn variants are center-swapped and preserve mirror fairness", () => {
  const state = logic.createMatchState({ countdownMs: 0, grid: { columns: 12, rows: 8 } });
  const rules = state.rules;
  const first = logic.replayRound({ spawnVariant: 0, ticks: [{ turns: [-1, -1] }] }, rules);
  const second = logic.replayRound({ spawnVariant: 1, ticks: [{ turns: [-1, -1] }] }, rules);
  assert.deepEqual(first.players[0], { ...second.players[1], marker: "ring" });
  assert.deepEqual(first.players[1], { ...second.players[0], marker: "diamond" });
});

test("pause, resume, invalid phases, and terminal input are idempotent", () => {
  const ready = logic.createMatchState({ countdownMs: 0, grid: { columns: 12, rows: 8 } });
  assert.equal(logic.pauseMatch(ready, "manual"), ready);
  const playing = logic.startMatch(ready);
  const paused = logic.pauseMatch(playing, "hidden");
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pauseReason, "hidden");
  assert.equal(logic.pauseMatch(paused, "manual"), paused);
  assert.equal(logic.stepRound(paused, { turns: [1, 1] }), paused);
  const resumed = logic.resumeMatch(paused);
  assert.equal(resumed.phase, "playing");
  assert.equal(resumed.pauseReason, null);
  assert.equal(logic.resumeMatch(resumed), resumed);
  const ended = finishRound(resumed, 1);
  assert.equal(logic.stepRound(ended, { turns: [0, 0] }), ended);
});

test("countdown is integer, bounded, and never advances a game tick", () => {
  let state = logic.startMatch(logic.createMatchState({ countdownMs: 2400 }));
  assert.equal(state.phase, "countdown");
  state = logic.advanceCountdown(state, 999.9);
  assert.equal(state.countdownMs, 1401);
  assert.equal(logic.getView(state).board.tick, 0);
  state = logic.advanceCountdown(state, 9999);
  assert.equal(state.phase, "playing");
  assert.equal(state.countdownMs, 0);
  assert.equal(logic.getView(state).board.tick, 0);
});

test("next round preserves score and alternates spawn variant", () => {
  let state = finishRound(begin(), 1);
  assert.equal(state.phase, "round-end");
  assert.deepEqual(logic.getView(state).scores, [0, 1]);
  state = logic.nextRound(state);
  assert.equal(state.phase, "playing");
  assert.equal(state.rounds[1].spawnVariant, 1);
  assert.deepEqual(logic.getView(state).scores, [0, 1]);
});

test("target score ends early and startMatch begins a clean new match", () => {
  let state = finishRound(begin(), 1);
  state = logic.nextRound(state);
  state = finishRound(state, 1);
  assert.equal(state.phase, "match-end");
  assert.deepEqual(logic.getView(state).scores, [0, 2]);
  const fresh = logic.startMatch(state);
  assert.equal(fresh.phase, "playing");
  assert.equal(fresh.rounds.length, 1);
  assert.deepEqual(logic.getView(fresh).scores, [0, 0]);
});

test("three drawn rounds end the match with tied scores", () => {
  let state = finishDraw(begin());
  state = logic.nextRound(state);
  state = finishDraw(state);
  state = logic.nextRound(state);
  state = finishDraw(state);
  assert.equal(state.phase, "match-end");
  assert.deepEqual(logic.getView(state).scores, [0, 0]);
});

test("restart clears history while preserving sanitized configuration", () => {
  const active = logic.stepRound(begin({ countdownMs: 0, playerNames: [" 甲 ", "乙"] }), { turns: [0, 0] });
  const restarted = logic.restartMatch(active);
  assert.equal(restarted.phase, "ready");
  assert.deepEqual(restarted.playerNames, ["甲", "乙"]);
  assert.deepEqual(restarted.rounds, []);
  assert.equal(restarted.revision, active.revision + 1);
});

test("same log always replays identically and returned views are isolated", () => {
  const state = logic.stepRound(begin(), { turns: [1, -1] });
  const firstReplay = logic.replayRound(state.rounds[0], state.rules);
  const secondReplay = logic.replayRound(state.rounds[0], state.rules);
  assert.deepEqual(firstReplay, secondReplay);
  const view = logic.getView(state);
  view.playerNames[0] = "篡改";
  view.scores[0] = 99;
  view.board.players[0].x = 99;
  const clean = logic.getView(state);
  assert.notEqual(clean.playerNames[0], "篡改");
  assert.notEqual(clean.scores[0], 99);
  assert.notEqual(clean.board.players[0].x, 99);
});

test("public state is recursively frozen and contains no mutable collections", () => {
  const state = logic.stepRound(begin(), { turns: [0, 0] });
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.rounds), true);
  assert.equal(Object.isFrozen(state.rounds[0].ticks), true);
  assertNoMutableCollections(state);
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}`);
    console.error(error.stack || error);
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${tests.length} tests passed.`);
}
