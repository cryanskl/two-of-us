"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const config = require("./config.js");
const logic = require("./logic.js");

const { CONSTANTS, DEFAULT_CONFIG, ACTIONS, normalizeLexeme, validateCorpus, validateSchedules, sanitizeConfig, scoreTurn, deriveMatchResult, createInitialState, reduce, getView } = logic;

function act(state, type, extra = {}) {
  return { type, ...extra, revision: state.revision };
}

function advanceUntimedTurn(state, outcomes = ["correct", "foul", "skip", "correct", "correct", "skip"]) {
  state = reduce(state, act(state, ACTIONS.REVEAL_CARD));
  state = reduce(state, act(state, ACTIONS.START_CLOCK, { nowMs: null }));
  for (const outcome of outcomes) {
    state = reduce(state, act(state, ACTIONS.RECORD_OUTCOME, { outcome, nowMs: null, token: null }));
  }
  state = reduce(state, act(state, ACTIONS.SHOW_REVIEW));
  return state;
}

function startUntimed(variant = 0) {
  let state = createInitialState();
  state = reduce(state, act(state, ACTIONS.ENTER_SETUP));
  state = reduce(state, act(state, ACTIONS.SET_TIMER, { value: null }));
  if (variant !== 0) state = reduce(state, act(state, ACTIONS.SET_VARIANT, { value: variant }));
  return reduce(state, act(state, ACTIONS.START_MATCH));
}

test("exports exact frozen API, constants, and actions", () => {
  assert.deepEqual(Object.keys(logic), ["CONSTANTS", "DEFAULT_CONFIG", "ACTIONS", "normalizeLexeme", "validateCorpus", "validateSchedules", "sanitizeConfig", "scoreTurn", "deriveMatchResult", "createInitialState", "reduce", "getView"]);
  assert.deepEqual(Object.keys(ACTIONS), ["ENTER_SETUP", "SET_VARIANT", "SET_TIMER", "START_MATCH", "REVEAL_CARD", "START_CLOCK", "RECORD_OUTCOME", "TICK", "INTERRUPT", "PREPARE_RESUME", "SHOW_REVIEW", "RECLASSIFY_CARD", "CONFIRM_TURN", "RESTART"]);
  assert.equal(Object.isFrozen(logic), true);
  assert.equal(Object.isFrozen(CONSTANTS.THEMES), true);
  assert.equal(CONSTANTS.PLAYER_COUNT * CONSTANTS.TURNS_PER_PLAYER, CONSTANTS.TURN_COUNT);
  assert.equal(CONSTANTS.VARIANT_COUNT * CONSTANTS.TURN_COUNT * CONSTANTS.CARDS_PER_TURN, CONSTANTS.CARD_COUNT);
});

test("classic scripts expose editable config and frozen browser API", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(require.resolve("./config.js"), "utf8"), sandbox);
  vm.runInNewContext(readFileSync(require.resolve("./logic.js"), "utf8"), sandbox);
  assert.equal(sandbox.window.WORD_DETOUR_CONFIG.cards.length, 72);
  assert.equal(Object.isFrozen(sandbox.window.WORD_DETOUR_CONFIG), false);
  assert.deepEqual(Object.keys(sandbox.window.WordDetourLogic), Object.keys(logic));
  assert.equal(Object.isFrozen(sandbox.window.WordDetourLogic), true);
});

test("validates the 72-card corpus and all symmetric schedules", () => {
  assert.equal(validateCorpus(config.cards), true);
  assert.equal(validateSchedules(config.schedules, config.cards), true);
  assert.equal(DEFAULT_CONFIG.cards.length, 72);
  assert.equal(DEFAULT_CONFIG.schedules.flat(2).length, 72);
  assert.equal(new Set(DEFAULT_CONFIG.schedules.flat(2)).size, 72);
  assert.equal(Object.isFrozen(DEFAULT_CONFIG.cards[0].forbidden), true);
});

test("normalizeLexeme and atomic config fallback reject hostile input", () => {
  assert.equal(normalizeLexeme("ＡB"), "ａb");
  assert.equal(normalizeLexeme("有 空格"), null);
  assert.equal(normalizeLexeme("\ud800"), null);
  const valid = { ...config, playerLabels: [" 甲 ", "乙"], cards: config.cards.map(card => ({ ...card, forbidden: [...card.forbidden] })), schedules: config.schedules.map(variant => variant.map(hand => [...hand])) };
  const sanitized = sanitizeConfig(valid);
  assert.deepEqual(sanitized.playerLabels, ["甲", "乙"]);
  assert.notEqual(sanitized, valid);
  assert.equal(Object.isFrozen(sanitized), true);
  assert.equal(sanitizeConfig({ ...valid, extra: true }), DEFAULT_CONFIG);
  assert.notEqual(
    sanitizeConfig({ ...valid, trustNotice: "本页不录音，结果只由两人共同记录。" }),
    DEFAULT_CONFIG
  );
  const getter = { ...valid };
  Object.defineProperty(getter, "cards", { enumerable: true, get() { throw new Error("no"); } });
  assert.doesNotThrow(() => sanitizeConfig(getter));
  assert.equal(sanitizeConfig(getter), DEFAULT_CONFIG);
});

test("corpus rejects duplicates, bad matrices, and target-forbidden collisions", () => {
  const copy = config.cards.map(card => ({ ...card, forbidden: [...card.forbidden] }));
  copy[1].target = copy[0].target;
  assert.equal(validateCorpus(copy), false);
  const collision = config.cards.map(card => ({ ...card, forbidden: [...card.forbidden] }));
  collision[1].forbidden[0] = collision[0].target;
  assert.equal(validateCorpus(collision), false);
  const wrongDifficulty = config.cards.map(card => ({ ...card, forbidden: [...card.forbidden] }));
  wrongDifficulty[0].difficulty = 2;
  assert.equal(validateCorpus(wrongDifficulty), false);
});

test("scoreTurn and deriveMatchResult support positive, negative, and ties", () => {
  assert.deepEqual(scoreTurn([{ cardId: "a", outcome: "correct" }, { cardId: "b", outcome: "foul" }, { cardId: "c", outcome: "skip" }]), { correctCount: 1, foulCount: 1, skipCount: 1, score: 0 });
  assert.equal(scoreTurn([{ cardId: "a", outcome: "foul" }]).score, -1);
  assert.equal(scoreTurn([{ cardId: "a", outcome: "bad" }]), null);
  const turns = [0, 1, 2, 3].map(turnIndex => ({ turnIndex, describerSeat: turnIndex % 2, results: [{ cardId: "x" + turnIndex, outcome: "correct" }], finishReason: "cards-complete" }));
  assert.deepEqual(deriveMatchResult(turns), { kind: "tie", winnerSeat: null, playerScores: [2, 2] });
  turns[0].results.push({ cardId: "bonus", outcome: "correct" });
  assert.deepEqual(deriveMatchResult(turns), { kind: "seat-win", winnerSeat: 0, playerScores: [3, 2] });
});

test("setup freezes variant and timer into the first handoff", () => {
  let state = createInitialState();
  assert.equal(state.phase, "intro");
  state = reduce(state, act(state, ACTIONS.ENTER_SETUP));
  state = reduce(state, act(state, ACTIONS.SET_VARIANT, { value: 2 }));
  state = reduce(state, act(state, ACTIONS.SET_TIMER, { value: 30 }));
  state = reduce(state, act(state, ACTIONS.START_MATCH));
  assert.equal(state.phase, "handoff");
  assert.deepEqual(state.settings, { variantIndex: 2, timerSeconds: 30 });
  assert.deepEqual(state.draftTurn.cardIds, DEFAULT_CONFIG.schedules[2][0]);
  assert.equal(state.clock.remainingMs, 30000);
});

test("30, 60, 90, and untimed modes create exact clock contracts", () => {
  for (const timerSeconds of [30, 60, 90, null]) {
    let state = createInitialState();
    state = reduce(state, act(state, ACTIONS.ENTER_SETUP));
    if (timerSeconds !== 60) {
      state = reduce(state, act(state, ACTIONS.SET_TIMER, { value: timerSeconds }));
    }
    state = reduce(state, act(state, ACTIONS.START_MATCH));
    assert.equal(
      state.clock.remainingMs,
      timerSeconds === null ? null : timerSeconds * 1000
    );
    state = reduce(state, act(state, ACTIONS.REVEAL_CARD));
    state = reduce(
      state,
      act(state, ACTIONS.START_CLOCK, {
        nowMs: timerSeconds === null ? null : 500
      })
    );
    assert.equal(state.clock.running, timerSeconds !== null);
    assert.equal(
      state.clock.deadlineMs,
      timerSeconds === null ? null : 500 + timerSeconds * 1000
    );
  }
});

test("four untimed turns alternate describers and finish in a tie", () => {
  let state = startUntimed();
  for (let turn = 0; turn < 4; turn += 1) {
    assert.equal(state.turnIndex, turn);
    assert.equal(state.draftTurn.describerSeat, turn % 2);
    state = advanceUntimedTurn(state);
    assert.equal(state.phase, "turn-review");
    state = reduce(state, act(state, ACTIONS.CONFIRM_TURN));
  }
  assert.equal(state.phase, "match-result");
  assert.deepEqual(state.result, { kind: "tie", winnerSeat: null, playerScores: [4, 4] });
  const resultView = getView(state);
  assert.notEqual(resultView.phaseData.result, state.result);
  assert.notEqual(resultView.phaseData.result.playerScores, state.result.playerScores);
  for (const marker of DEFAULT_CONFIG.cards.flatMap(card => [card.target, ...card.forbidden])) {
    assert.equal(JSON.stringify(resultView).includes(marker), false);
  }
  const restarted = reduce(state, act(state, ACTIONS.RESTART));
  assert.deepEqual(restarted, createInitialState(DEFAULT_CONFIG));
  assert.notEqual(restarted, state);
});

test("review can only reclassify the current used card", () => {
  let state = advanceUntimedTurn(startUntimed());
  const cardId = state.draftTurn.results[1].cardId;
  const oldScore = getView(state).phaseData.score.score;
  state = reduce(state, act(state, ACTIONS.RECLASSIFY_CARD, { cardId, outcome: "correct" }));
  assert.equal(getView(state).phaseData.score.score, oldScore + 2);
  const same = state;
  assert.equal(reduce(state, act(state, ACTIONS.RECLASSIFY_CARD, { cardId: "future", outcome: "foul" })), same);
  state = reduce(state, act(state, ACTIONS.CONFIRM_TURN));
  assert.equal(state.confirmedTurns[0].results[1].outcome, "correct");
});

test("timed outcome is accepted before deadline and expiration wins at deadline", () => {
  let state = createInitialState();
  state = reduce(state, act(state, ACTIONS.ENTER_SETUP));
  state = reduce(state, act(state, ACTIONS.SET_TIMER, { value: 30 }));
  state = reduce(state, act(state, ACTIONS.START_MATCH));
  state = reduce(state, act(state, ACTIONS.REVEAL_CARD));
  state = reduce(state, act(state, ACTIONS.START_CLOCK, { nowMs: 1000 }));
  const token = state.clock.token;
  state = reduce(state, act(state, ACTIONS.RECORD_OUTCOME, { outcome: "correct", nowMs: 30999, token }));
  assert.equal(state.draftTurn.results.length, 1);
  state = reduce(state, act(state, ACTIONS.RECORD_OUTCOME, { outcome: "correct", nowMs: 31000, token }));
  assert.equal(state.phase, "turn-ended");
  assert.equal(state.draftTurn.results.length, 1);
  assert.equal(state.draftTurn.finishReason, "time-expired");
});

test("TICK rejects stale token and backward time, then expires once", () => {
  let state = createInitialState();
  state = reduce(state, act(state, ACTIONS.ENTER_SETUP));
  state = reduce(state, act(state, ACTIONS.SET_TIMER, { value: 30 }));
  state = reduce(state, act(state, ACTIONS.START_MATCH));
  state = reduce(state, act(state, ACTIONS.REVEAL_CARD));
  state = reduce(state, act(state, ACTIONS.START_CLOCK, { nowMs: 100 }));
  assert.equal(reduce(state, act(state, ACTIONS.TICK, { nowMs: 200, token: state.clock.token - 1 })), state);
  assert.equal(reduce(state, act(state, ACTIONS.TICK, { nowMs: 99, token: state.clock.token })), state);
  state = reduce(state, act(state, ACTIONS.TICK, { nowMs: 101, token: state.clock.token }));
  assert.equal(state.clock.remainingMs, 29999);
  state = reduce(state, act(state, ACTIONS.TICK, { nowMs: 30100, token: state.clock.token }));
  assert.equal(state.phase, "turn-ended");
  assert.equal(reduce(state, act(state, ACTIONS.TICK, { nowMs: 40000, token: state.clock.token })), state);
});

test("interrupt removes secrets and resume requires a new clock", () => {
  let state = createInitialState();
  state = reduce(state, act(state, ACTIONS.ENTER_SETUP));
  state = reduce(state, act(state, ACTIONS.START_MATCH));
  state = reduce(state, act(state, ACTIONS.REVEAL_CARD));
  state = reduce(state, act(state, ACTIONS.START_CLOCK, { nowMs: 1000 }));
  const oldToken = state.clock.token;
  state = reduce(state, act(state, ACTIONS.INTERRUPT, { reason: "hidden", nowMs: 2000, token: oldToken }));
  assert.equal(state.phase, "interrupted");
  assert.equal(JSON.stringify(getView(state)).includes(DEFAULT_CONFIG.cards[0].target), false);
  state = reduce(state, act(state, ACTIONS.PREPARE_RESUME));
  assert.equal(state.phase, "card-ready");
  assert.equal(state.clock.running, false);
  state = reduce(state, act(state, ACTIONS.START_CLOCK, { nowMs: 5000 }));
  assert.equal(state.phase, "describing");
  assert.notEqual(state.clock.token, oldToken);
});

test("phase views enforce current-card, neutral, review, and result privacy", () => {
  let state = startUntimed();
  const allMarkers = DEFAULT_CONFIG.cards.flatMap(card => [card.target, ...card.forbidden]);
  for (const marker of allMarkers) assert.equal(JSON.stringify(getView(state)).includes(marker), false);
  state = reduce(state, act(state, ACTIONS.REVEAL_CARD));
  const card = DEFAULT_CONFIG.cards.find(item => item.id === state.draftTurn.cardIds[0]);
  const ready = JSON.stringify(getView(state));
  assert.equal(ready.includes(card.target), true);
  const other = DEFAULT_CONFIG.cards.find(item => item.id === state.draftTurn.cardIds[1]);
  assert.equal(ready.includes(other.target), false);
  state = reduce(state, act(state, ACTIONS.START_CLOCK, { nowMs: null }));
  state = reduce(state, act(state, ACTIONS.RECORD_OUTCOME, { outcome: "correct", nowMs: null, token: null }));
  state = reduce(state, act(state, ACTIONS.INTERRUPT, { reason: "manual", nowMs: null, token: null }));
  const hidden = JSON.stringify(getView(state));
  for (const marker of allMarkers) assert.equal(hidden.includes(marker), false);
});

test("invalid actions, extra fields, stale revisions, and forged states are no-ops", () => {
  const state = createInitialState();
  assert.equal(reduce(state, { type: ACTIONS.ENTER_SETUP, revision: 99 }), state);
  assert.equal(reduce(state, { type: ACTIONS.ENTER_SETUP, revision: 0, extra: true }), state);
  assert.equal(reduce(state, null), state);
  const clone = JSON.parse(JSON.stringify(state));
  assert.equal(reduce(clone, { type: ACTIONS.ENTER_SETUP, revision: 0 }), clone);
  assert.equal(getView(clone), null);
  const hostile = new Proxy({ type: ACTIONS.ENTER_SETUP, revision: 0 }, { ownKeys() { throw new Error("hostile"); } });
  assert.doesNotThrow(() => reduce(state, hostile));
  assert.equal(reduce(state, hostile), state);
});

test("logic source contains no runtime network, storage, permission, random, or DOM API", () => {
  const source = readFileSync(require.resolve("./logic.js"), "utf8");
  for (const token of ["fetch(", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "mediaDevices", "SpeechRecognition", "Math.random", "document."]) {
    assert.equal(source.includes(token), false, token);
  }
});
