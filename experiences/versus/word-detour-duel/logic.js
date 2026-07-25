"use strict";

(function exposeLogic(root, factory) {
  var source =
    typeof module === "object" && module.exports
      ? require("./config.js")
      : root && root.WORD_DETOUR_CONFIG;
  var api = factory(source);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.WordDetourLogic = api;
  }
})(typeof window === "object" ? window : null, function createLogic(sourceConfig) {
  var INTERNAL_STATES = new WeakSet();
  var CONFIG_KEYS = ["publicTitle", "publicInstructions", "trustNotice", "playerLabels", "deckLabels", "cards", "schedules"];
  var CARD_KEYS = ["id", "theme", "difficulty", "target", "forbidden"];
  var TURN_KEYS = ["turnIndex", "describerSeat", "results", "finishReason"];
  var RESULT_KEYS = ["cardId", "outcome"];
  var FORBIDDEN_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    if (typeof value === "function") return Object.freeze(value);
    var visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);
    Reflect.ownKeys(value).forEach(function (key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    });
    return Object.freeze(value);
  }

  var CONSTANTS = deepFreeze({
    VERSION: 1,
    PLAYER_COUNT: 2,
    TURN_COUNT: 4,
    TURNS_PER_PLAYER: 2,
    CARDS_PER_TURN: 6,
    VARIANT_COUNT: 3,
    CARD_COUNT: 72,
    FORBIDDEN_PER_CARD: 4,
    TIMER_OPTIONS: [30, 60, 90, null],
    DEFAULT_TIMER_SECONDS: 60,
    THEMES: ["daily", "food", "nature", "action", "place", "feeling"],
    DIFFICULTIES: [1, 2, 3],
    OUTCOMES: ["correct", "foul", "skip"],
    INTERRUPTION_REASONS: ["manual", "blur", "hidden", "pagehide"],
    MAX_TIME_MS: 90000,
    MAX_REVISION: 1000000,
    MAX_CLOCK_TOKEN: 1000000
  });

  var ACTIONS = deepFreeze({
    ENTER_SETUP: "ENTER_SETUP",
    SET_VARIANT: "SET_VARIANT",
    SET_TIMER: "SET_TIMER",
    START_MATCH: "START_MATCH",
    REVEAL_CARD: "REVEAL_CARD",
    START_CLOCK: "START_CLOCK",
    RECORD_OUTCOME: "RECORD_OUTCOME",
    TICK: "TICK",
    INTERRUPT: "INTERRUPT",
    PREPARE_RESUME: "PREPARE_RESUME",
    SHOW_REVIEW: "SHOW_REVIEW",
    RECLASSIFY_CARD: "RECLASSIFY_CARD",
    CONFIRM_TURN: "CONFIRM_TURN",
    RESTART: "RESTART"
  });

  function snapshotRecord(value, keys) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
      var own = Reflect.ownKeys(value);
      if (own.length !== keys.length || own.some(function (key) { return typeof key !== "string" || keys.indexOf(key) < 0; })) return null;
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var result = {};
      for (var index = 0; index < keys.length; index += 1) {
        var descriptor = descriptors[keys[index]];
        if (!descriptor || descriptor.enumerable !== true || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        result[keys[index]] = descriptor.value;
      }
      return result;
    } catch (_error) {
      return null;
    }
  }

  function snapshotArray(value, length) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length !== length) return null;
      var own = Reflect.ownKeys(value);
      if (own.length !== length + 1 || own.indexOf("length") < 0) return null;
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var result = [];
      for (var index = 0; index < length; index += 1) {
        var descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.enumerable !== true || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        result.push(descriptor.value);
      }
      return result;
    } catch (_error) {
      return null;
    }
  }

  function wellFormed(value) {
    for (var i = 0; i < value.length; i += 1) {
      var unit = value.charCodeAt(i);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (i + 1 >= value.length) return false;
        var next = value.charCodeAt(i + 1);
        if (next < 0xdc00 || next > 0xdfff) return false;
        i += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return false;
      }
    }
    return true;
  }

  function cleanText(value, min, max, noWhitespace) {
    if (typeof value !== "string" || !wellFormed(value) || FORBIDDEN_TEXT.test(value)) return null;
    var clean;
    try { clean = value.normalize("NFC"); } catch (_error) { return null; }
    if (noWhitespace) {
      if (/\s/u.test(clean)) return null;
    } else {
      clean = clean.replace(/\s+/gu, " ").trim();
    }
    var length = Array.from(clean).length;
    return length >= min && length <= max ? clean : null;
  }

  function normalizeLexeme(value) {
    var clean = cleanText(value, 1, 8, true);
    return clean === null ? null : clean.toLowerCase();
  }

  function parseCorpus(candidate) {
    var cards = snapshotArray(candidate, CONSTANTS.CARD_COUNT);
    if (!cards) return null;
    var parsed = [];
    var ids = new Set();
    var targets = new Set();
    var allForbidden = new Set();
    var matrix = {};
    for (var index = 0; index < cards.length; index += 1) {
      var card = snapshotRecord(cards[index], CARD_KEYS);
      if (!card || typeof card.id !== "string" || !/^[a-z][a-z0-9-]{2,31}$/.test(card.id) || ids.has(card.id)) return null;
      if (CONSTANTS.THEMES.indexOf(card.theme) < 0 || !Number.isSafeInteger(card.difficulty) || CONSTANTS.DIFFICULTIES.indexOf(card.difficulty) < 0) return null;
      var target = cleanText(card.target, 2, 8, true);
      var targetKey = normalizeLexeme(target);
      var forbidden = snapshotArray(card.forbidden, CONSTANTS.FORBIDDEN_PER_CARD);
      if (!target || !targetKey || !forbidden) return null;
      var cleanForbidden = [];
      var local = new Set([targetKey]);
      for (var f = 0; f < forbidden.length; f += 1) {
        var word = cleanText(forbidden[f], 1, 8, true);
        var key = normalizeLexeme(word);
        if (!word || !key || local.has(key)) return null;
        local.add(key);
        allForbidden.add(key);
        cleanForbidden.push(word);
      }
      if (targets.has(targetKey)) return null;
      ids.add(card.id);
      targets.add(targetKey);
      var bucket = card.theme + ":" + card.difficulty;
      matrix[bucket] = (matrix[bucket] || 0) + 1;
      parsed.push({ id: card.id, theme: card.theme, difficulty: card.difficulty, target: target, forbidden: cleanForbidden });
    }
    for (var theme = 0; theme < CONSTANTS.THEMES.length; theme += 1) {
      for (var difficulty = 0; difficulty < CONSTANTS.DIFFICULTIES.length; difficulty += 1) {
        if (matrix[CONSTANTS.THEMES[theme] + ":" + CONSTANTS.DIFFICULTIES[difficulty]] !== 4) return null;
      }
    }
    for (var targetValue of targets) if (allForbidden.has(targetValue)) return null;
    return deepFreeze(parsed);
  }

  function parseSchedules(candidate, cards) {
    var variants = snapshotArray(candidate, CONSTANTS.VARIANT_COUNT);
    if (!variants) return null;
    var byId = new Map(cards.map(function (card) { return [card.id, card]; }));
    var used = new Set();
    var parsed = [];
    for (var v = 0; v < variants.length; v += 1) {
      var hands = snapshotArray(variants[v], CONSTANTS.TURN_COUNT);
      if (!hands) return null;
      var parsedHands = [];
      for (var t = 0; t < hands.length; t += 1) {
        var hand = snapshotArray(hands[t], CONSTANTS.CARDS_PER_TURN);
        if (!hand) return null;
        var themeCounts = {};
        var difficultyCounts = { 1: 0, 2: 0, 3: 0 };
        for (var h = 0; h < hand.length; h += 1) {
          if (typeof hand[h] !== "string" || !byId.has(hand[h]) || used.has(hand[h])) return null;
          used.add(hand[h]);
          var card = byId.get(hand[h]);
          themeCounts[card.theme] = (themeCounts[card.theme] || 0) + 1;
          difficultyCounts[card.difficulty] += 1;
        }
        if (CONSTANTS.THEMES.some(function (theme) { return themeCounts[theme] !== 1; })) return null;
        if (difficultyCounts[1] !== 2 || difficultyCounts[2] !== 2 || difficultyCounts[3] !== 2) return null;
        parsedHands.push(hand.slice());
      }
      for (var seat = 0; seat < 2; seat += 1) {
        var seatCards = parsedHands[seat].concat(parsedHands[seat + 2]).map(function (id) { return byId.get(id); });
        if (CONSTANTS.THEMES.some(function (theme) { return seatCards.filter(function (card) { return card.theme === theme; }).length !== 2; })) return null;
        if (CONSTANTS.DIFFICULTIES.some(function (difficulty) { return seatCards.filter(function (card) { return card.difficulty === difficulty; }).length !== 4; })) return null;
      }
      parsed.push(parsedHands);
    }
    return used.size === CONSTANTS.CARD_COUNT ? deepFreeze(parsed) : null;
  }

  function validateCorpus(candidate) {
    return parseCorpus(candidate) !== null;
  }

  function validateSchedules(candidate, cards) {
    var parsedCards = parseCorpus(cards);
    return parsedCards !== null && parseSchedules(candidate, parsedCards) !== null;
  }

  function parseConfig(candidate) {
    var value = snapshotRecord(candidate, CONFIG_KEYS);
    if (!value) return null;
    var title = cleanText(value.publicTitle, 1, 30, false);
    var instructions = cleanText(value.publicInstructions, 1, 140, false);
    var trust = cleanText(value.trustNotice, 1, 180, false);
    var players = snapshotArray(value.playerLabels, 2);
    var decks = snapshotArray(value.deckLabels, 3);
    if (!title || /taboo/i.test(title) || !instructions || /taboo/i.test(instructions) || !trust || !/不(?:会)?录音/u.test(trust) || !players || !decks) return null;
    players = players.map(function (item) { return cleanText(item, 1, 12, false); });
    decks = decks.map(function (item) { return cleanText(item, 1, 12, false); });
    if (players.some(function (item) { return !item; }) || decks.some(function (item) { return !item; }) || new Set(players).size !== 2 || new Set(decks).size !== 3) return null;
    var cards = parseCorpus(value.cards);
    if (!cards) return null;
    var schedules = parseSchedules(value.schedules, cards);
    if (!schedules) return null;
    return deepFreeze({ publicTitle: title, publicInstructions: instructions, trustNotice: trust, playerLabels: players, deckLabels: decks, cards: cards, schedules: schedules });
  }

  var DEFAULT_CONFIG = parseConfig(sourceConfig);
  if (!DEFAULT_CONFIG) throw new Error("Invalid built-in word detour config");

  function sanitizeConfig(candidate) {
    return parseConfig(candidate) || DEFAULT_CONFIG;
  }

  function parseResults(candidate, maxLength) {
    if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype || candidate.length > maxLength) return null;
    var results = snapshotArray(candidate, candidate.length);
    if (!results) return null;
    var seen = new Set();
    var parsed = [];
    for (var index = 0; index < results.length; index += 1) {
      var result = snapshotRecord(results[index], RESULT_KEYS);
      if (!result || typeof result.cardId !== "string" || seen.has(result.cardId) || CONSTANTS.OUTCOMES.indexOf(result.outcome) < 0) return null;
      seen.add(result.cardId);
      parsed.push({ cardId: result.cardId, outcome: result.outcome });
    }
    return parsed;
  }

  function scoreTurn(candidate) {
    var results = parseResults(candidate, CONSTANTS.CARDS_PER_TURN);
    if (!results) return null;
    var correct = results.filter(function (item) { return item.outcome === "correct"; }).length;
    var foul = results.filter(function (item) { return item.outcome === "foul"; }).length;
    var skip = results.length - correct - foul;
    return deepFreeze({ correctCount: correct, foulCount: foul, skipCount: skip, score: correct - foul });
  }

  function parseConfirmedTurns(candidate) {
    var turns = snapshotArray(candidate, CONSTANTS.TURN_COUNT);
    if (!turns) return null;
    var parsed = [];
    for (var index = 0; index < turns.length; index += 1) {
      var turn = snapshotRecord(turns[index], TURN_KEYS);
      var results = turn && parseResults(turn.results, CONSTANTS.CARDS_PER_TURN);
      if (!turn || turn.turnIndex !== index || turn.describerSeat !== index % 2 || !results || (turn.finishReason !== "cards-complete" && turn.finishReason !== "time-expired")) return null;
      parsed.push({ turnIndex: index, describerSeat: index % 2, results: results, finishReason: turn.finishReason });
    }
    return parsed;
  }

  function deriveMatchResult(candidate) {
    var turns = parseConfirmedTurns(candidate);
    if (!turns) return null;
    var scores = [0, 0];
    turns.forEach(function (turn) { scores[turn.describerSeat] += scoreTurn(turn.results).score; });
    return deepFreeze({
      kind: scores[0] === scores[1] ? "tie" : "seat-win",
      winnerSeat: scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1,
      playerScores: scores
    });
  }

  function makeDraft(config, variantIndex, turnIndex) {
    return { turnIndex: turnIndex, describerSeat: turnIndex % 2, guesserSeat: 1 - (turnIndex % 2), cardIds: config.schedules[variantIndex][turnIndex].slice(), results: [], finishReason: null };
  }

  function registerState(data) {
    var state = deepFreeze(data);
    INTERNAL_STATES.add(state);
    return state;
  }

  function initialClock() {
    return { token: 0, running: false, remainingMs: null, deadlineMs: null };
  }

  function createInitialState(candidateConfig) {
    var config = sanitizeConfig(candidateConfig);
    return registerState({
      version: 1, phase: "intro", config: config,
      settings: { variantIndex: 0, timerSeconds: 60 },
      turnIndex: 0, activeCardIndex: 0, draftTurn: null, confirmedTurns: [],
      clock: initialClock(), interruptionReason: null, result: null, revision: 0
    });
  }

  function nextState(state, changes) {
    return registerState(Object.assign({}, state, changes, { revision: state.revision + 1 }));
  }

  function actionData(candidate, keys) {
    return snapshotRecord(candidate, keys);
  }

  function revisionOkay(state, action) {
    return action && Number.isSafeInteger(action.revision) && action.revision === state.revision && state.revision < CONSTANTS.MAX_REVISION;
  }

  function finiteNow(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  function tokenHeadroom(state) {
    return state.clock.token < CONSTANTS.MAX_CLOCK_TOKEN;
  }

  function stoppedClock(state, remaining, increment) {
    return { token: state.clock.token + (increment ? 1 : 0), running: false, remainingMs: remaining, deadlineMs: null };
  }

  function finishTurn(state, reason, remaining) {
    var draft = Object.assign({}, state.draftTurn, { finishReason: reason });
    return nextState(state, { phase: "turn-ended", draftTurn: draft, clock: stoppedClock(state, remaining, false), interruptionReason: null });
  }

  function syncTimed(state, nowMs, token) {
    if (state.settings.timerSeconds === null) return { expired: false, remainingMs: null };
    if (!finiteNow(nowMs) || token !== state.clock.token || !state.clock.running || !finiteNow(state.clock.deadlineMs)) return null;
    var segmentStart = state.clock.deadlineMs - state.clock.remainingMs;
    if (nowMs < segmentStart) return null;
    var remaining = Math.max(0, Math.ceil(state.clock.deadlineMs - nowMs));
    return { expired: nowMs >= state.clock.deadlineMs, remainingMs: remaining };
  }

  function reduce(state, candidateAction) {
    if (!state || typeof state !== "object" || !INTERNAL_STATES.has(state)) return state;
    var typeProbe = snapshotRecord(candidateAction, ["type", "revision"]);
    var action;

    if (typeProbe && [ACTIONS.ENTER_SETUP, ACTIONS.START_MATCH, ACTIONS.REVEAL_CARD, ACTIONS.PREPARE_RESUME, ACTIONS.SHOW_REVIEW, ACTIONS.CONFIRM_TURN, ACTIONS.RESTART].indexOf(typeProbe.type) >= 0) action = typeProbe;
    if (!action) {
      var valueProbe = snapshotRecord(candidateAction, ["type", "value", "revision"]);
      if (valueProbe && [ACTIONS.SET_VARIANT, ACTIONS.SET_TIMER].indexOf(valueProbe.type) >= 0) action = valueProbe;
    }
    if (!action) {
      var clockProbe = snapshotRecord(candidateAction, ["type", "nowMs", "token", "revision"]);
      if (clockProbe && clockProbe.type === ACTIONS.TICK) action = clockProbe;
    }
    if (!action) {
      var startProbe = snapshotRecord(candidateAction, ["type", "nowMs", "revision"]);
      if (startProbe && startProbe.type === ACTIONS.START_CLOCK) action = startProbe;
    }
    if (!action) {
      var outcomeProbe = snapshotRecord(candidateAction, ["type", "outcome", "nowMs", "token", "revision"]);
      if (outcomeProbe && outcomeProbe.type === ACTIONS.RECORD_OUTCOME) action = outcomeProbe;
    }
    if (!action) {
      var interruptProbe = snapshotRecord(candidateAction, ["type", "reason", "nowMs", "token", "revision"]);
      if (interruptProbe && interruptProbe.type === ACTIONS.INTERRUPT) action = interruptProbe;
    }
    if (!action) {
      var reviewProbe = snapshotRecord(candidateAction, ["type", "cardId", "outcome", "revision"]);
      if (reviewProbe && reviewProbe.type === ACTIONS.RECLASSIFY_CARD) action = reviewProbe;
    }
    if (!revisionOkay(state, action)) return state;

    if (action.type === ACTIONS.ENTER_SETUP) return state.phase === "intro" ? nextState(state, { phase: "setup" }) : state;
    if (action.type === ACTIONS.SET_VARIANT) {
      return state.phase === "setup" && Number.isSafeInteger(action.value) && action.value >= 0 && action.value < 3 && action.value !== state.settings.variantIndex
        ? nextState(state, { settings: { variantIndex: action.value, timerSeconds: state.settings.timerSeconds } }) : state;
    }
    if (action.type === ACTIONS.SET_TIMER) {
      return state.phase === "setup" && CONSTANTS.TIMER_OPTIONS.indexOf(action.value) >= 0 && action.value !== state.settings.timerSeconds
        ? nextState(state, { settings: { variantIndex: state.settings.variantIndex, timerSeconds: action.value } }) : state;
    }
    if (action.type === ACTIONS.START_MATCH) {
      if (state.phase !== "setup" || !tokenHeadroom(state)) return state;
      var remaining = state.settings.timerSeconds === null ? null : state.settings.timerSeconds * 1000;
      return nextState(state, { phase: "handoff", turnIndex: 0, activeCardIndex: 0, draftTurn: makeDraft(state.config, state.settings.variantIndex, 0), confirmedTurns: [], clock: stoppedClock(state, remaining, true) });
    }
    if (action.type === ACTIONS.REVEAL_CARD) return state.phase === "handoff" ? nextState(state, { phase: "card-ready" }) : state;
    if (action.type === ACTIONS.START_CLOCK) {
      if (state.phase !== "card-ready" || !tokenHeadroom(state)) return state;
      if (state.settings.timerSeconds !== null && (!finiteNow(action.nowMs) || !Number.isFinite(action.nowMs + state.clock.remainingMs))) return state;
      return nextState(state, { phase: "describing", clock: { token: state.clock.token + 1, running: state.settings.timerSeconds !== null, remainingMs: state.clock.remainingMs, deadlineMs: state.settings.timerSeconds === null ? null : action.nowMs + state.clock.remainingMs } });
    }
    if (action.type === ACTIONS.TICK) {
      if (state.phase !== "describing") return state;
      var tick = syncTimed(state, action.nowMs, action.token);
      if (!tick || state.settings.timerSeconds === null || tick.remainingMs === state.clock.remainingMs) return state;
      if (tick.expired) return finishTurn(state, "time-expired", 0);
      return nextState(state, { clock: { token: state.clock.token, running: true, remainingMs: tick.remainingMs, deadlineMs: state.clock.deadlineMs } });
    }
    if (action.type === ACTIONS.RECORD_OUTCOME) {
      if (state.phase !== "describing" || CONSTANTS.OUTCOMES.indexOf(action.outcome) < 0) return state;
      var synced = state.settings.timerSeconds === null ? { expired: false, remainingMs: null } : syncTimed(state, action.nowMs, action.token);
      if (!synced) return state;
      if (synced.expired) return finishTurn(state, "time-expired", 0);
      var results = state.draftTurn.results.concat([{ cardId: state.draftTurn.cardIds[state.activeCardIndex], outcome: action.outcome }]);
      var draft = Object.assign({}, state.draftTurn, { results: results });
      if (results.length === CONSTANTS.CARDS_PER_TURN) {
        draft.finishReason = "cards-complete";
        return nextState(state, { phase: "turn-ended", activeCardIndex: results.length, draftTurn: draft, clock: stoppedClock(state, synced.remainingMs, false) });
      }
      return nextState(state, { activeCardIndex: state.activeCardIndex + 1, draftTurn: draft, clock: state.settings.timerSeconds === null ? state.clock : { token: state.clock.token, running: true, remainingMs: synced.remainingMs, deadlineMs: state.clock.deadlineMs } });
    }
    if (action.type === ACTIONS.INTERRUPT) {
      if ((state.phase !== "card-ready" && state.phase !== "describing") || CONSTANTS.INTERRUPTION_REASONS.indexOf(action.reason) < 0 || !tokenHeadroom(state)) return state;
      var interruptRemaining = state.clock.remainingMs;
      if (state.phase === "describing" && state.settings.timerSeconds !== null) {
        var interruptSync = syncTimed(state, action.nowMs, action.token);
        if (!interruptSync) return state;
        if (interruptSync.expired) return finishTurn(state, "time-expired", 0);
        interruptRemaining = interruptSync.remainingMs;
      }
      return nextState(state, { phase: "interrupted", clock: stoppedClock(state, interruptRemaining, true), interruptionReason: action.reason });
    }
    if (action.type === ACTIONS.PREPARE_RESUME) return state.phase === "interrupted" ? nextState(state, { phase: "card-ready", interruptionReason: null }) : state;
    if (action.type === ACTIONS.SHOW_REVIEW) return state.phase === "turn-ended" ? nextState(state, { phase: "turn-review" }) : state;
    if (action.type === ACTIONS.RECLASSIFY_CARD) {
      if (state.phase !== "turn-review" || typeof action.cardId !== "string" || CONSTANTS.OUTCOMES.indexOf(action.outcome) < 0) return state;
      var found = state.draftTurn.results.findIndex(function (item) { return item.cardId === action.cardId; });
      if (found < 0 || state.draftTurn.results[found].outcome === action.outcome) return state;
      var changed = state.draftTurn.results.map(function (item, index) { return index === found ? { cardId: item.cardId, outcome: action.outcome } : item; });
      return nextState(state, { draftTurn: Object.assign({}, state.draftTurn, { results: changed }) });
    }
    if (action.type === ACTIONS.CONFIRM_TURN) {
      if (state.phase !== "turn-review") return state;
      var confirmed = state.confirmedTurns.concat([{ turnIndex: state.turnIndex, describerSeat: state.draftTurn.describerSeat, results: state.draftTurn.results.map(function (item) { return { cardId: item.cardId, outcome: item.outcome }; }), finishReason: state.draftTurn.finishReason }]);
      if (state.turnIndex === CONSTANTS.TURN_COUNT - 1) {
        return nextState(state, { phase: "match-result", draftTurn: null, confirmedTurns: confirmed, result: deriveMatchResult(confirmed) });
      }
      if (!tokenHeadroom(state)) return state;
      var nextTurnIndex = state.turnIndex + 1;
      var nextRemaining = state.settings.timerSeconds === null ? null : state.settings.timerSeconds * 1000;
      return nextState(state, { phase: "handoff", turnIndex: nextTurnIndex, activeCardIndex: 0, draftTurn: makeDraft(state.config, state.settings.variantIndex, nextTurnIndex), confirmedTurns: confirmed, clock: stoppedClock(state, nextRemaining, true) });
    }
    if (action.type === ACTIONS.RESTART) return state.phase === "match-result" ? createInitialState(state.config) : state;
    return state;
  }

  function scoreBoard(state) {
    var scores = [0, 0];
    state.confirmedTurns.forEach(function (turn) { scores[turn.describerSeat] += scoreTurn(turn.results).score; });
    return { playerScores: scores };
  }

  function getView(state) {
    if (!state || typeof state !== "object" || !INTERNAL_STATES.has(state)) return null;
    var describer = state.draftTurn ? state.draftTurn.describerSeat : null;
    var guesser = state.draftTurn ? state.draftTurn.guesserSeat : null;
    var primary = null;
    var status = "";
    var data = null;
    if (state.phase === "intro") { primary = { id: "enter-setup", label: "设置新对局" }; status = "准备开始一场信任型友谊赛。"; }
    if (state.phase === "setup") { primary = { id: "start-match", label: "开始对局" }; status = "选择牌组和计时方式。"; data = { deckLabels: state.config.deckLabels.slice(), timerOptions: CONSTANTS.TIMER_OPTIONS.slice(), selectedVariant: state.settings.variantIndex, selectedTimer: state.settings.timerSeconds }; }
    if (state.phase === "handoff") { primary = { id: "reveal-card", label: "只有我在看，打开题卡" }; status = "猜词者请背对屏幕。"; data = { describerLabel: state.config.playerLabels[describer], guesserLabel: state.config.playerLabels[guesser] }; }
    if (state.phase === "card-ready" || state.phase === "describing") {
      var cardId = state.draftTurn.cardIds[state.activeCardIndex];
      var card = state.config.cards.find(function (item) { return item.id === cardId; });
      primary = state.phase === "card-ready" ? { id: "start-clock", label: "开始本回合" } : null;
      status = state.phase === "card-ready" ? "题卡已打开，计时尚未开始。" : "请记录本张结果。";
      data = { target: card.target, forbidden: card.forbidden.slice(), cardNumber: state.activeCardIndex + 1, cardTotal: 6, outcomes: state.phase === "describing" ? CONSTANTS.OUTCOMES.slice() : [], remainingSeconds: state.phase === "describing" && state.clock.remainingMs !== null ? Math.ceil(state.clock.remainingMs / 1000) : null };
    }
    if (state.phase === "interrupted") { primary = { id: "prepare-resume", label: "描述者准备恢复" }; status = "题卡已遮住，恢复不会自动继续计时。"; data = { reason: state.interruptionReason }; }
    if (state.phase === "turn-ended") { primary = { id: "show-review", label: "两人都能看，开始复核" }; status = "本回合已结束，请把设备放回中间。"; }
    if (state.phase === "turn-review") {
      primary = { id: "confirm-turn", label: "确认本回合结果" };
      status = "只在两人一致时更正。";
      data = {
        items: state.draftTurn.results.map(function (result) {
          var item = state.config.cards.find(function (card) { return card.id === result.cardId; });
          return { cardId: result.cardId, target: item.target, forbidden: item.forbidden.slice(), outcome: result.outcome, points: result.outcome === "correct" ? 1 : result.outcome === "foul" ? -1 : 0 };
        }),
        score: scoreTurn(state.draftTurn.results)
      };
    }
    if (state.phase === "match-result") {
      primary = { id: "restart", label: "再来一局" };
      status = state.result.kind === "tie" ? "本局平分。" : state.config.playerLabels[state.result.winnerSeat] + "获胜。";
      data = { result: { kind: state.result.kind, winnerSeat: state.result.winnerSeat, playerScores: state.result.playerScores.slice() }, turns: state.confirmedTurns.map(function (turn) { return { turnIndex: turn.turnIndex, describerSeat: turn.describerSeat, summary: scoreTurn(turn.results), finishReason: turn.finishReason }; }) };
    }
    return deepFreeze({
      phase: state.phase,
      publicTitle: state.config.publicTitle,
      publicInstructions: state.config.publicInstructions,
      trustNotice: state.config.trustNotice,
      playerLabels: state.config.playerLabels.slice(),
      turnIndex: state.phase === "intro" || state.phase === "setup" ? null : state.turnIndex,
      describerSeat: describer,
      guesserSeat: guesser,
      progress: state.draftTurn ? { turn: state.turnIndex + 1, turns: 4, card: state.activeCardIndex + 1, cards: 6 } : null,
      scoreboard: state.phase === "intro" || state.phase === "setup" ? null : scoreBoard(state),
      primaryAction: primary,
      statusText: status,
      phaseData: data
    });
  }

  return deepFreeze({
    CONSTANTS: CONSTANTS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    ACTIONS: ACTIONS,
    normalizeLexeme: normalizeLexeme,
    validateCorpus: validateCorpus,
    validateSchedules: validateSchedules,
    sanitizeConfig: sanitizeConfig,
    scoreTurn: scoreTurn,
    deriveMatchResult: deriveMatchResult,
    createInitialState: createInitialState,
    reduce: reduce,
    getView: getView
  });
});
