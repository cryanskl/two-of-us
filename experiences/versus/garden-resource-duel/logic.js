(function (root, factory) {
  "use strict";

  let configApi = root && root.GardenResourceDuelConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch {
      configApi = null;
    }
  }

  const api = factory(configApi);
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.GardenResourceDuelLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const PLAYER_COUNT = 2;
  const ROUND_COUNT = 6;
  const BLOOM_TARGET = 5;
  const UINT32_RANGE = 0x100000000;
  const MAX_TEXT_POINTS = 400;
  const MAX_NAME_POINTS = 16;
  const MAX_NOTE_POINTS = 240;

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")
      || Object.isFrozen(value)) return value;

    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  const CARD_TYPES = deepFreeze(["sun", "water", "pest"]);
  const SEASON_TYPES = deepFreeze(["sun", "water"]);
  const PETAL_VALUES = deepFreeze([1, 1, 2, 2, 3, 3]);
  const INITIAL_HAND = deepFreeze({ sun: 2, water: 2, pest: 2 });
  const PHASES = deepFreeze([
    "intro",
    "season",
    "handoff",
    "choosing",
    "ready-to-reveal",
    "round-result",
    "match-result",
  ]);
  const ACTION_FIELDS = deepFreeze({
    START_MATCH: ["seed"],
    BEGIN_ROUND: [],
    TAKE_SEAT: ["playerIndex"],
    COVER: ["playerIndex"],
    SEAL_CARD: ["playerIndex", "card"],
    REVEAL_ROUND: [],
    NEXT_ROUND: [],
    RESTART_MATCH: [],
  });
  const ACTION_TYPES = deepFreeze(Object.keys(ACTION_FIELDS));
  const STATE_KEYS = deepFreeze([
    "version",
    "phase",
    "seed",
    "seasonDeck",
    "roundIndex",
    "firstSeat",
    "activeSeat",
    "hands",
    "sealedCards",
    "scores",
    "history",
    "result",
    "revision",
    "lastNotice",
  ]);
  const HAND_KEYS = deepFreeze(["sun", "water", "pest"]);
  const ROUND_INPUT_KEYS = deepFreeze([
    "roundIndex",
    "seasonNeed",
    "petalValue",
    "cards",
    "scoreBefore",
  ]);
  const HISTORY_KEYS = deepFreeze([
    "roundIndex",
    "seasonNeed",
    "petalValue",
    "firstSeat",
    "cards",
    "blocked",
    "earned",
    "scoreBefore",
    "scoreAfter",
  ]);
  const RESULT_KEYS = deepFreeze([
    "outcome",
    "winnerIndex",
    "reason",
    "scores",
    "completedRounds",
    "seed",
  ]);
  const CONFIG_KEYS = deepFreeze([
    "title",
    "subtitle",
    "intro",
    "playerNames",
    "defaultWinNote",
    "defaultDrawNote",
  ]);
  const NOTICE_IDS = deepFreeze([
    null,
    "match-started",
    "round-begun",
    "seat-taken",
    "covered",
    "card-sealed",
    "ready-to-reveal",
    "round-revealed",
    "match-complete",
    "next-round",
  ]);
  const FALLBACK_DEFAULT_CONFIG = deepFreeze({
    title: "这一朵，我先养开",
    subtitle: "六张牌，六个季节。照料、保留，或者猜猜我这一手。",
    intro: "看当前季节需求，轮流遮屏藏一张有限手牌。匹配需求就长花瓣，虫害能挡住对方这一轮。",
    playerNames: ["你", "TA"],
    defaultWinNote: "这一朵先开了。下一局，换你读懂我的手。",
    defaultDrawNote: "这一轮，两朵刚好一起开。",
  });
  const DEFAULT_CONFIG = isConfigShape(configApi && configApi.DEFAULT_CONFIG)
    ? configApi.DEFAULT_CONFIG
    : FALLBACK_DEFAULT_CONFIG;
  const strategyByConfig = new WeakMap();

  function isConfigShape(value) {
    if (!value || typeof value !== "object") return false;
    try {
      return CONFIG_KEYS.every((key) => Object.hasOwn(value, key));
    } catch {
      return false;
    }
  }

  function readDataRecordSnapshot(value, allowNullPrototype, requireFrozen) {
    try {
      if (value === null || typeof value !== "object") return null;
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && !(allowNullPrototype && prototype === null)) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== "string")) return null;
      if (requireFrozen && Object.isExtensible(value)) return null;

      const record = {};
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) return null;
        if (requireFrozen && (descriptor.configurable || descriptor.writable)) return null;
        record[key] = descriptor.value;
      }
      return { keys, record };
    } catch {
      return null;
    }
  }

  function readExactRecord(value, expectedKeys, allowNullPrototype, requireFrozen) {
    const snapshot = readDataRecordSnapshot(value, allowNullPrototype, requireFrozen);
    if (!snapshot
      || snapshot.keys.length !== expectedKeys.length
      || snapshot.keys.some((key) => !expectedKeys.includes(key))) return null;
    return snapshot.record;
  }

  function readPlainArray(value, expectedLength, maximumLength, requireFrozen) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const keys = Reflect.ownKeys(value);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")
        || !Number.isSafeInteger(lengthDescriptor.value)
        || (expectedLength !== null && lengthDescriptor.value !== expectedLength)
        || (maximumLength !== null && lengthDescriptor.value > maximumLength)
        || keys.length !== lengthDescriptor.value + 1
        || !keys.includes("length")) return null;
      if (requireFrozen
        && (Object.isExtensible(value)
          || lengthDescriptor.configurable
          || lengthDescriptor.writable)) return null;

      const result = [];
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        const key = String(index);
        if (!keys.includes(key)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) return null;
        if (requireFrozen && (descriptor.configurable || descriptor.writable)) return null;
        result.push(descriptor.value);
      }
      return result;
    } catch {
      return null;
    }
  }

  function safeOwnData(source, key) {
    if (!source) return undefined;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      return descriptor && Object.hasOwn(descriptor, "value") ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  }

  function hasIsolatedSurrogate(value) {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xD800 && code <= 0xDBFF) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
        index += 1;
      } else if (code >= 0xDC00 && code <= 0xDFFF) {
        return true;
      }
    }
    return false;
  }

  function cleanText(value, maximum) {
    if (typeof value !== "string"
      || /[\u0000-\u001F\u007F-\u009F]/u.test(value)
      || hasIsolatedSurrogate(value)) return null;
    const cleaned = value.trim();
    const length = [...cleaned].length;
    return length >= 1 && length <= maximum ? cleaned : null;
  }

  function cleanConfigText(source, key, fallback, maximum) {
    const cleaned = cleanText(safeOwnData(source, key), maximum);
    return cleaned === null ? fallback : cleaned;
  }

  function sanitizePlayerNames(value) {
    const names = readPlainArray(value, PLAYER_COUNT, PLAYER_COUNT);
    if (!names) return DEFAULT_CONFIG.playerNames.slice();
    const cleaned = names.map((name) => cleanText(name, MAX_NAME_POINTS));
    return cleaned.every((name) => name !== null)
      ? cleaned
      : DEFAULT_CONFIG.playerNames.slice();
  }

  function sanitizeConfig(candidate, composeStrategy) {
    const candidateSnapshot = readDataRecordSnapshot(candidate, false, false);
    const source = candidateSnapshot ? candidateSnapshot.record : null;
    const safe = deepFreeze({
      title: cleanConfigText(source, "title", DEFAULT_CONFIG.title, MAX_TEXT_POINTS),
      subtitle: cleanConfigText(source, "subtitle", DEFAULT_CONFIG.subtitle, MAX_TEXT_POINTS),
      intro: cleanConfigText(source, "intro", DEFAULT_CONFIG.intro, MAX_TEXT_POINTS),
      playerNames: sanitizePlayerNames(safeOwnData(source, "playerNames")),
      defaultWinNote: cleanConfigText(
        source,
        "defaultWinNote",
        DEFAULT_CONFIG.defaultWinNote,
        MAX_NOTE_POINTS,
      ),
      defaultDrawNote: cleanConfigText(
        source,
        "defaultDrawNote",
        DEFAULT_CONFIG.defaultDrawNote,
        MAX_NOTE_POINTS,
      ),
    });
    const strategy = typeof composeStrategy === "function"
      ? composeStrategy
      : typeof configApi?.composeResultNote === "function"
        ? configApi.composeResultNote
        : null;
    if (strategy) strategyByConfig.set(safe, strategy);
    return safe;
  }

  function isUint32(value) {
    return Number.isInteger(value) && value >= 1 && value <= 0xFFFFFFFF;
  }

  function isPlayer(value) {
    return value === 0 || value === 1;
  }

  function isCard(value) {
    return CARD_TYPES.includes(value);
  }

  function isSeason(value) {
    return SEASON_TYPES.includes(value);
  }

  function sameArray(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function sameHand(left, right) {
    return HAND_KEYS.every((key) => left[key] === right[key]);
  }

  function cloneHand(hand) {
    return { sun: hand.sun, water: hand.water, pest: hand.pest };
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return {
      nextUint32() {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state;
      },
      int(maxExclusive) {
        if (!Number.isSafeInteger(maxExclusive)
          || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
          throw new TypeError("maxExclusive must be a positive safe integer within uint32 range");
        }
        const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
        let value;
        do {
          value = this.nextUint32();
        } while (value >= limit);
        return value % maxExclusive;
      },
    };
  }

  function generateSeasonDeck(seed) {
    if (arguments.length !== 1 || !isUint32(seed)) {
      throw new TypeError("seed must be a non-zero uint32");
    }
    const deck = ["sun", "sun", "sun", "water", "water", "water"];
    const random = createRandom(seed);
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const target = random.int(index + 1);
      [deck[index], deck[target]] = [deck[target], deck[index]];
    }
    return deepFreeze(deck);
  }

  function createInitialState() {
    return deepFreeze({
      version: VERSION,
      phase: "intro",
      seed: null,
      seasonDeck: [],
      roundIndex: 0,
      firstSeat: 0,
      activeSeat: null,
      hands: [cloneHand(INITIAL_HAND), cloneHand(INITIAL_HAND)],
      sealedCards: [null, null],
      scores: [0, 0],
      history: [],
      result: null,
      revision: 0,
      lastNotice: null,
    });
  }

  function parseRoundInput(input) {
    const record = readExactRecord(input, ROUND_INPUT_KEYS, true);
    if (!record
      || !Number.isInteger(record.roundIndex)
      || record.roundIndex < 0
      || record.roundIndex >= ROUND_COUNT
      || !isSeason(record.seasonNeed)
      || record.petalValue !== PETAL_VALUES[record.roundIndex]) {
      throw new TypeError("invalid round input");
    }
    const cards = readPlainArray(record.cards, PLAYER_COUNT, PLAYER_COUNT);
    const scoreBefore = readPlainArray(record.scoreBefore, PLAYER_COUNT, PLAYER_COUNT);
    if (!cards || !cards.every(isCard)
      || !scoreBefore
      || !scoreBefore.every((score) => Number.isSafeInteger(score) && score >= 0)) {
      throw new TypeError("invalid round input");
    }
    return {
      roundIndex: record.roundIndex,
      seasonNeed: record.seasonNeed,
      petalValue: record.petalValue,
      cards,
      scoreBefore,
    };
  }

  function resolveRound(input) {
    if (arguments.length !== 1) throw new TypeError("resolveRound expects one input record");
    const parsed = parseRoundInput(input);
    const blocked = [
      parsed.cards[1] === "pest",
      parsed.cards[0] === "pest",
    ];
    const matching = [
      parsed.cards[0] === parsed.seasonNeed,
      parsed.cards[1] === parsed.seasonNeed,
    ];
    const earned = [
      matching[0] && !blocked[0] ? parsed.petalValue : 0,
      matching[1] && !blocked[1] ? parsed.petalValue : 0,
    ];
    const scoreAfter = [
      parsed.scoreBefore[0] + earned[0],
      parsed.scoreBefore[1] + earned[1],
    ];
    if (!scoreAfter.every(Number.isSafeInteger)) throw new TypeError("score overflow");

    return deepFreeze({
      roundIndex: parsed.roundIndex,
      seasonNeed: parsed.seasonNeed,
      petalValue: parsed.petalValue,
      firstSeat: parsed.roundIndex % PLAYER_COUNT,
      cards: parsed.cards.slice(),
      blocked,
      earned,
      scoreBefore: parsed.scoreBefore.slice(),
      scoreAfter,
    });
  }

  function determineTerminalResult(roundIndex, scores, seed) {
    if (arguments.length !== 3
      || !Number.isInteger(roundIndex)
      || roundIndex < 0
      || roundIndex >= ROUND_COUNT
      || !isUint32(seed)) {
      throw new TypeError("invalid terminal input");
    }
    const parsedScores = readPlainArray(scores, PLAYER_COUNT, PLAYER_COUNT);
    if (!parsedScores
      || !parsedScores.every((score) => Number.isSafeInteger(score) && score >= 0)) {
      throw new TypeError("invalid terminal scores");
    }

    const bloomed = parsedScores.map((score) => score >= BLOOM_TARGET);
    let outcome;
    let winnerIndex;
    let reason;
    if (bloomed[0] && bloomed[1]) {
      outcome = "draw";
      winnerIndex = null;
      reason = "simultaneous-bloom";
    } else if (bloomed[0] || bloomed[1]) {
      outcome = "win";
      winnerIndex = bloomed[0] ? 0 : 1;
      reason = "bloom";
    } else if (roundIndex === ROUND_COUNT - 1) {
      if (parsedScores[0] === parsedScores[1]) {
        outcome = "draw";
        winnerIndex = null;
        reason = "round-cap-tie";
      } else {
        outcome = "win";
        winnerIndex = parsedScores[0] > parsedScores[1] ? 0 : 1;
        reason = "round-cap";
      }
    } else {
      return null;
    }

    return deepFreeze({
      outcome,
      winnerIndex,
      reason,
      scores: parsedScores.slice(),
      completedRounds: roundIndex + 1,
      seed,
    });
  }

  function readHand(value, requireFrozen) {
    const hand = readExactRecord(value, HAND_KEYS, false, requireFrozen);
    if (!hand || !HAND_KEYS.every((key) => Number.isInteger(hand[key])
      && hand[key] >= 0 && hand[key] <= INITIAL_HAND[key])) return null;
    return hand;
  }

  function readHistoryRecord(value, requireFrozen) {
    const record = readExactRecord(value, HISTORY_KEYS, false, requireFrozen);
    if (!record
      || !Number.isInteger(record.roundIndex)
      || record.roundIndex < 0
      || record.roundIndex >= ROUND_COUNT
      || !isSeason(record.seasonNeed)
      || record.petalValue !== PETAL_VALUES[record.roundIndex]
      || record.firstSeat !== record.roundIndex % PLAYER_COUNT) return null;

    const cards = readPlainArray(record.cards, PLAYER_COUNT, PLAYER_COUNT, requireFrozen);
    const blocked = readPlainArray(record.blocked, PLAYER_COUNT, PLAYER_COUNT, requireFrozen);
    const earned = readPlainArray(record.earned, PLAYER_COUNT, PLAYER_COUNT, requireFrozen);
    const scoreBefore = readPlainArray(record.scoreBefore, PLAYER_COUNT, PLAYER_COUNT, requireFrozen);
    const scoreAfter = readPlainArray(record.scoreAfter, PLAYER_COUNT, PLAYER_COUNT, requireFrozen);
    if (!cards || !cards.every(isCard)
      || !blocked || !blocked.every((value) => typeof value === "boolean")
      || !earned || !earned.every((value) => Number.isSafeInteger(value) && value >= 0)
      || !scoreBefore || !scoreBefore.every((value) => Number.isSafeInteger(value) && value >= 0)
      || !scoreAfter || !scoreAfter.every((value) => Number.isSafeInteger(value) && value >= 0)) {
      return null;
    }
    return {
      roundIndex: record.roundIndex,
      seasonNeed: record.seasonNeed,
      petalValue: record.petalValue,
      firstSeat: record.firstSeat,
      cards,
      blocked,
      earned,
      scoreBefore,
      scoreAfter,
    };
  }

  function readHistory(value, requireFrozen) {
    const history = readPlainArray(value, null, ROUND_COUNT, requireFrozen);
    if (!history) return null;
    const parsed = history.map((record) => readHistoryRecord(record, requireFrozen));
    return parsed.every((record) => record !== null) ? parsed : null;
  }

  function readResult(value, requireFrozen) {
    const result = readExactRecord(value, RESULT_KEYS, false, requireFrozen);
    if (!result
      || !["win", "draw"].includes(result.outcome)
      || !["bloom", "simultaneous-bloom", "round-cap", "round-cap-tie"].includes(result.reason)
      || !Number.isInteger(result.completedRounds)
      || result.completedRounds < 1
      || result.completedRounds > ROUND_COUNT
      || !isUint32(result.seed)) return null;
    const scores = readPlainArray(result.scores, PLAYER_COUNT, PLAYER_COUNT, requireFrozen);
    if (!scores || !scores.every((score) => Number.isSafeInteger(score) && score >= 0)) return null;
    if (result.outcome === "win") {
      if (!isPlayer(result.winnerIndex) || !["bloom", "round-cap"].includes(result.reason)) return null;
    } else if (result.winnerIndex !== null
      || !["simultaneous-bloom", "round-cap-tie"].includes(result.reason)) return null;
    const bloomed = scores.map((score) => score >= BLOOM_TARGET);
    if (result.reason === "bloom"
      && (!bloomed[result.winnerIndex] || bloomed[1 - result.winnerIndex])) return null;
    if (result.reason === "simultaneous-bloom" && !(bloomed[0] && bloomed[1])) return null;
    if (result.reason === "round-cap"
      && (result.completedRounds !== ROUND_COUNT
        || bloomed[0] || bloomed[1]
        || scores[0] === scores[1]
        || result.winnerIndex !== (scores[0] > scores[1] ? 0 : 1))) return null;
    if (result.reason === "round-cap-tie"
      && (result.completedRounds !== ROUND_COUNT
        || bloomed[0] || bloomed[1]
        || scores[0] !== scores[1])) return null;
    return {
      outcome: result.outcome,
      winnerIndex: result.winnerIndex,
      reason: result.reason,
      scores,
      completedRounds: result.completedRounds,
      seed: result.seed,
    };
  }

  function sameHistoryRecord(left, right) {
    return left.roundIndex === right.roundIndex
      && left.seasonNeed === right.seasonNeed
      && left.petalValue === right.petalValue
      && left.firstSeat === right.firstSeat
      && sameArray(left.cards, right.cards)
      && sameArray(left.blocked, right.blocked)
      && sameArray(left.earned, right.earned)
      && sameArray(left.scoreBefore, right.scoreBefore)
      && sameArray(left.scoreAfter, right.scoreAfter);
  }

  function sameResult(left, right) {
    if (left === null || right === null) return left === right;
    return left.outcome === right.outcome
      && left.winnerIndex === right.winnerIndex
      && left.reason === right.reason
      && sameArray(left.scores, right.scores)
      && left.completedRounds === right.completedRounds
      && left.seed === right.seed;
  }

  function replayHistoryCore(seed, parsedHistory) {
    const seasonDeck = generateSeasonDeck(seed);
    const hands = [cloneHand(INITIAL_HAND), cloneHand(INITIAL_HAND)];
    let scores = [0, 0];
    let terminalResultOrNull = null;

    for (let index = 0; index < parsedHistory.length; index += 1) {
      if (terminalResultOrNull) throw new TypeError("history continues after terminal result");
      const record = parsedHistory[index];
      if (record.roundIndex !== index
        || record.seasonNeed !== seasonDeck[index]
        || record.petalValue !== PETAL_VALUES[index]
        || record.firstSeat !== index % PLAYER_COUNT
        || !record.cards.every((card, player) => hands[player][card] > 0)) {
        throw new TypeError("history does not match the seeded match");
      }
      const expected = resolveRound({
        roundIndex: index,
        seasonNeed: seasonDeck[index],
        petalValue: PETAL_VALUES[index],
        cards: record.cards,
        scoreBefore: scores,
      });
      if (!sameHistoryRecord(record, expected)) throw new TypeError("history settlement mismatch");
      for (let player = 0; player < PLAYER_COUNT; player += 1) {
        hands[player][record.cards[player]] -= 1;
      }
      scores = expected.scoreAfter.slice();
      terminalResultOrNull = determineTerminalResult(index, scores, seed);
    }

    return {
      hands,
      scores,
      completedRounds: parsedHistory.length,
      nextRoundIndex: parsedHistory.length,
      terminalResultOrNull,
    };
  }

  function replayHistory(seed, history) {
    if (arguments.length !== 2 || !isUint32(seed)) {
      throw new TypeError("replayHistory expects a non-zero uint32 seed and history");
    }
    const parsedHistory = readHistory(history);
    if (!parsedHistory) throw new TypeError("invalid history");
    return deepFreeze(replayHistoryCore(seed, parsedHistory));
  }

  function freezeStateSnapshot(record, deck, hands, sealedCards, scores, history, result) {
    return deepFreeze({
      version: record.version,
      phase: record.phase,
      seed: record.seed,
      seasonDeck: deck.slice(),
      roundIndex: record.roundIndex,
      firstSeat: record.firstSeat,
      activeSeat: record.activeSeat,
      hands: hands.map(cloneHand),
      sealedCards: sealedCards.slice(),
      scores: scores.slice(),
      history: history.map((entry) => ({
        roundIndex: entry.roundIndex,
        seasonNeed: entry.seasonNeed,
        petalValue: entry.petalValue,
        firstSeat: entry.firstSeat,
        cards: entry.cards.slice(),
        blocked: entry.blocked.slice(),
        earned: entry.earned.slice(),
        scoreBefore: entry.scoreBefore.slice(),
        scoreAfter: entry.scoreAfter.slice(),
      })),
      result: result === null ? null : {
        outcome: result.outcome,
        winnerIndex: result.winnerIndex,
        reason: result.reason,
        scores: result.scores.slice(),
        completedRounds: result.completedRounds,
        seed: result.seed,
      },
      revision: record.revision,
      lastNotice: record.lastNotice,
    });
  }

  function snapshotState(state) {
    try {
      const record = readExactRecord(state, STATE_KEYS, false, true);
      if (!record
        || record.version !== VERSION
        || !PHASES.includes(record.phase)
        || !Number.isInteger(record.roundIndex)
        || record.roundIndex < 0
        || record.roundIndex >= ROUND_COUNT
        || record.firstSeat !== record.roundIndex % PLAYER_COUNT
        || !(record.activeSeat === null || isPlayer(record.activeSeat))
        || !Number.isSafeInteger(record.revision)
        || record.revision < 0
        || !NOTICE_IDS.includes(record.lastNotice)) {
        throw new TypeError("invalid state");
      }

      const deck = readPlainArray(record.seasonDeck, null, ROUND_COUNT, true);
      const handsArray = readPlainArray(record.hands, PLAYER_COUNT, PLAYER_COUNT, true);
      const sealedCards = readPlainArray(record.sealedCards, PLAYER_COUNT, PLAYER_COUNT, true);
      const scores = readPlainArray(record.scores, PLAYER_COUNT, PLAYER_COUNT, true);
      const history = readHistory(record.history, true);
      const result = record.result === null ? null : readResult(record.result, true);
      const hands = handsArray && handsArray.map((hand) => readHand(hand, true));
      if (!deck || !hands || hands.some((hand) => hand === null)
        || !sealedCards || !sealedCards.every((card) => card === null || isCard(card))
        || !scores || !scores.every((score) => Number.isSafeInteger(score) && score >= 0)
        || !history || (record.result !== null && !result)) {
        throw new TypeError("invalid state");
      }

      if (record.phase === "intro") {
        if (record.seed !== null
          || deck.length !== 0
          || record.roundIndex !== 0
          || record.firstSeat !== 0
          || record.activeSeat !== null
          || !hands.every((hand) => sameHand(hand, INITIAL_HAND))
          || !sealedCards.every((card) => card === null)
          || !sameArray(scores, [0, 0])
          || history.length !== 0
          || result !== null
          || record.revision !== 0
          || record.lastNotice !== null) throw new TypeError("invalid intro state");
        return freezeStateSnapshot(record, deck, hands, sealedCards, scores, history, result);
      }

      if (!isUint32(record.seed)
        || deck.length !== ROUND_COUNT
        || !deck.every(isSeason)
        || !sameArray(deck, generateSeasonDeck(record.seed))) {
        throw new TypeError("invalid seeded state");
      }
      const replay = replayHistoryCore(record.seed, history);
      if (!hands.every((hand, index) => sameHand(hand, replay.hands[index]))
        || !sameArray(scores, replay.scores)) throw new TypeError("state disagrees with history");

      const settledPhase = record.phase === "round-result" || record.phase === "match-result";
      const expectedHistoryLength = settledPhase ? record.roundIndex + 1 : record.roundIndex;
      if (history.length !== expectedHistoryLength) throw new TypeError("state round/history mismatch");
      if (record.phase !== "match-result" && replay.terminalResultOrNull !== null) {
        throw new TypeError("terminal history must use match-result");
      }

      const sealedCount = sealedCards.filter((card) => card !== null).length;
      if (sealedCards.some((card, player) => card !== null && hands[player][card] < 1)) {
        throw new TypeError("sealed card unavailable");
      }
      if (record.phase === "season") {
        if (record.activeSeat !== null || sealedCount !== 0 || result !== null) {
          throw new TypeError("invalid season state");
        }
      } else if (record.phase === "handoff" || record.phase === "choosing") {
        if (!isPlayer(record.activeSeat) || result !== null || sealedCount > 1) {
          throw new TypeError("invalid private turn state");
        }
        if (sealedCount === 0 && record.activeSeat !== record.firstSeat) {
          throw new TypeError("invalid first private seat");
        }
        if (sealedCount === 1
          && (sealedCards[record.firstSeat] === null
            || record.activeSeat !== 1 - record.firstSeat)) {
          throw new TypeError("invalid second private seat");
        }
      } else if (record.phase === "ready-to-reveal") {
        if (record.activeSeat !== null || sealedCount !== PLAYER_COUNT || result !== null) {
          throw new TypeError("invalid ready state");
        }
      } else if (record.phase === "round-result") {
        if (record.activeSeat !== null || sealedCount !== 0 || result !== null
          || replay.terminalResultOrNull !== null) throw new TypeError("invalid round result");
      } else if (record.phase === "match-result") {
        if (record.activeSeat !== null || sealedCount !== 0 || !result
          || !sameResult(result, replay.terminalResultOrNull)) {
          throw new TypeError("invalid match result");
        }
      }
      return freezeStateSnapshot(record, deck, hands, sealedCards, scores, history, result);
    } catch (error) {
      if (error instanceof TypeError && error.message.startsWith("invalid")) throw error;
      throw new TypeError("invalid state");
    }
  }

  function assertState(state) {
    snapshotState(state);
    return state;
  }

  function parseAction(action) {
    try {
      const snapshot = readDataRecordSnapshot(action, true, false);
      if (!snapshot
        || typeof snapshot.record.type !== "string"
        || !ACTION_TYPES.includes(snapshot.record.type)) {
        throw new TypeError("unknown action");
      }
      const type = snapshot.record.type;
      const expectedKeys = ["type", ...ACTION_FIELDS[type]];
      if (snapshot.keys.length !== expectedKeys.length
        || snapshot.keys.some((key) => !expectedKeys.includes(key))) {
        throw new TypeError("action fields must match exactly");
      }
      const record = snapshot.record;
      if (Object.hasOwn(record, "seed") && !isUint32(record.seed)) {
        throw new TypeError("seed must be a non-zero uint32");
      }
      if (Object.hasOwn(record, "playerIndex") && !isPlayer(record.playerIndex)) {
        throw new TypeError("playerIndex must be 0 or 1");
      }
      if (Object.hasOwn(record, "card") && !isCard(record.card)) {
        throw new TypeError("unknown card");
      }
      return record;
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new TypeError("invalid action");
    }
  }

  function transition(originalState, state, changes) {
    if (state.revision === Number.MAX_SAFE_INTEGER) return originalState;
    return deepFreeze({
      version: VERSION,
      phase: Object.hasOwn(changes, "phase") ? changes.phase : state.phase,
      seed: Object.hasOwn(changes, "seed") ? changes.seed : state.seed,
      seasonDeck: Object.hasOwn(changes, "seasonDeck") ? changes.seasonDeck : state.seasonDeck,
      roundIndex: Object.hasOwn(changes, "roundIndex") ? changes.roundIndex : state.roundIndex,
      firstSeat: Object.hasOwn(changes, "firstSeat") ? changes.firstSeat : state.firstSeat,
      activeSeat: Object.hasOwn(changes, "activeSeat") ? changes.activeSeat : state.activeSeat,
      hands: Object.hasOwn(changes, "hands") ? changes.hands : state.hands,
      sealedCards: Object.hasOwn(changes, "sealedCards") ? changes.sealedCards : state.sealedCards,
      scores: Object.hasOwn(changes, "scores") ? changes.scores : state.scores,
      history: Object.hasOwn(changes, "history") ? changes.history : state.history,
      result: Object.hasOwn(changes, "result") ? changes.result : state.result,
      revision: state.revision + 1,
      lastNotice: Object.hasOwn(changes, "lastNotice") ? changes.lastNotice : state.lastNotice,
    });
  }

  function reduceGardenResourceDuel(state, action) {
    const safeState = snapshotState(state);
    const parsed = parseAction(action);

    if (parsed.type === "RESTART_MATCH") {
      return safeState.phase === "match-result" ? createInitialState() : state;
    }
    switch (parsed.type) {
      case "START_MATCH":
        if (safeState.phase !== "intro") return state;
        return transition(state, safeState, {
          phase: "season",
          seed: parsed.seed,
          seasonDeck: generateSeasonDeck(parsed.seed),
          lastNotice: "match-started",
        });
      case "BEGIN_ROUND":
        if (safeState.phase !== "season") return state;
        return transition(state, safeState, {
          phase: "handoff",
          activeSeat: safeState.firstSeat,
          lastNotice: "round-begun",
        });
      case "TAKE_SEAT":
        if (safeState.phase !== "handoff" || parsed.playerIndex !== safeState.activeSeat) return state;
        return transition(state, safeState, {
          phase: "choosing",
          lastNotice: "seat-taken",
        });
      case "COVER":
        if (safeState.phase !== "choosing" || parsed.playerIndex !== safeState.activeSeat) return state;
        return transition(state, safeState, {
          phase: "handoff",
          lastNotice: "covered",
        });
      case "SEAL_CARD":
        return sealCard(state, safeState, parsed);
      case "REVEAL_ROUND":
        return revealRound(state, safeState);
      case "NEXT_ROUND":
        if (safeState.phase !== "round-result") return state;
        return transition(state, safeState, {
          phase: "season",
          roundIndex: safeState.roundIndex + 1,
          firstSeat: (safeState.roundIndex + 1) % PLAYER_COUNT,
          activeSeat: null,
          lastNotice: "next-round",
        });
      default:
        return state;
    }
  }

  function sealCard(originalState, state, action) {
    if (state.phase !== "choosing"
      || action.playerIndex !== state.activeSeat
      || state.sealedCards[action.playerIndex] !== null
      || state.hands[action.playerIndex][action.card] < 1) return originalState;
    const sealedCards = state.sealedCards.slice();
    sealedCards[action.playerIndex] = action.card;
    const isReady = sealedCards.every((card) => card !== null);
    return transition(originalState, state, {
      phase: isReady ? "ready-to-reveal" : "handoff",
      activeSeat: isReady ? null : 1 - action.playerIndex,
      sealedCards,
      lastNotice: isReady ? "ready-to-reveal" : "card-sealed",
    });
  }

  function revealRound(originalState, state) {
    if (state.phase !== "ready-to-reveal") return originalState;
    const beforeHands = state.hands.map(cloneHand);
    const beforeScores = state.scores.slice();
    const cards = state.sealedCards.slice();
    const record = resolveRound({
      roundIndex: state.roundIndex,
      seasonNeed: state.seasonDeck[state.roundIndex],
      petalValue: PETAL_VALUES[state.roundIndex],
      cards,
      scoreBefore: beforeScores,
    });
    const hands = beforeHands.map((hand, player) => {
      hand[cards[player]] -= 1;
      return hand;
    });
    const result = determineTerminalResult(state.roundIndex, record.scoreAfter, state.seed);
    return transition(originalState, state, {
      phase: result ? "match-result" : "round-result",
      hands,
      sealedCards: [null, null],
      scores: record.scoreAfter,
      history: [...state.history, record],
      result,
      lastNotice: result ? "match-complete" : "round-revealed",
    });
  }

  function cloneHistory(history) {
    return history.map((record) => ({
      roundIndex: record.roundIndex,
      seasonNeed: record.seasonNeed,
      petalValue: record.petalValue,
      firstSeat: record.firstSeat,
      cards: record.cards.slice(),
      blocked: record.blocked.slice(),
      earned: record.earned.slice(),
      scoreBefore: record.scoreBefore.slice(),
      scoreAfter: record.scoreAfter.slice(),
    }));
  }

  function createPublicView(state) {
    const base = {
      phase: state.phase,
      revision: state.revision,
    };
    if (state.phase === "intro") return deepFreeze(base);

    const current = {
      ...base,
      roundIndex: state.roundIndex,
      seasonNeed: state.seasonDeck[state.roundIndex],
      petalValue: PETAL_VALUES[state.roundIndex],
    };
    if (state.phase === "season") {
      return deepFreeze({
        ...current,
        firstSeat: state.firstSeat,
        hands: state.hands.map(cloneHand),
        scores: state.scores.slice(),
        history: cloneHistory(state.history),
      });
    }
    if (state.phase === "handoff") {
      return deepFreeze({
        ...current,
        firstSeat: state.firstSeat,
        activeSeat: state.activeSeat,
        sealedCount: state.sealedCards.filter((card) => card !== null).length,
        hands: state.hands.map(cloneHand),
        scores: state.scores.slice(),
        history: cloneHistory(state.history),
      });
    }
    if (state.phase === "choosing") {
      return deepFreeze({
        ...current,
        activeSeat: state.activeSeat,
      });
    }
    if (state.phase === "ready-to-reveal") {
      return deepFreeze({
        ...current,
        scores: state.scores.slice(),
        sealedCount: PLAYER_COUNT,
      });
    }
    if (state.phase === "round-result") {
      const history = cloneHistory(state.history);
      return deepFreeze({
        ...base,
        roundIndex: state.roundIndex,
        roundRecord: history[history.length - 1],
        hands: state.hands.map(cloneHand),
        scores: state.scores.slice(),
        history,
      });
    }
    return deepFreeze({
      ...base,
      result: {
        outcome: state.result.outcome,
        winnerIndex: state.result.winnerIndex,
        reason: state.result.reason,
        scores: state.result.scores.slice(),
        completedRounds: state.result.completedRounds,
        seed: state.result.seed,
      },
      hands: state.hands.map(cloneHand),
      scores: state.scores.slice(),
      history: cloneHistory(state.history),
      seed: state.seed,
    });
  }

  function getPublicView(state) {
    return createPublicView(snapshotState(state));
  }

  function getPlayerView(state, viewerSeat) {
    if (arguments.length !== 2 || !isPlayer(viewerSeat)) {
      throw new TypeError("viewerSeat must be 0 or 1");
    }
    const safeState = snapshotState(state);
    const publicView = createPublicView(safeState);
    if (safeState.phase !== "choosing" || viewerSeat !== safeState.activeSeat) return publicView;
    return deepFreeze({
      ...publicView,
      availableCards: CARD_TYPES
        .filter((card) => safeState.hands[viewerSeat][card] > 0)
        .map((card) => ({
          card,
          remainingAtRoundStart: safeState.hands[viewerSeat][card],
        })),
    });
  }

  function composeConfiguredResultNote(config, result) {
    if (arguments.length !== 2) {
      throw new TypeError("config and terminal result are required");
    }
    const configRecord = readExactRecord(config, CONFIG_KEYS, false, true);
    const parsedResult = readResult(result);
    if (!configRecord || !parsedResult) {
      throw new TypeError("config and result must be sanitized public records");
    }
    const names = readPlainArray(configRecord.playerNames, PLAYER_COUNT, PLAYER_COUNT, true);
    const defaultWinNote = cleanText(configRecord.defaultWinNote, MAX_NOTE_POINTS);
    const defaultDrawNote = cleanText(configRecord.defaultDrawNote, MAX_NOTE_POINTS);
    if (!names
      || !names.every((name) => cleanText(name, MAX_NAME_POINTS) !== null)
      || defaultWinNote === null || defaultDrawNote === null) {
      throw new TypeError("config must come from sanitizeConfig");
    }
    const defaultNote = parsedResult.outcome === "win" ? defaultWinNote : defaultDrawNote;
    const summary = deepFreeze({
      outcome: parsedResult.outcome,
      winnerIndex: parsedResult.winnerIndex,
      winnerName: parsedResult.winnerIndex === null ? null : names[parsedResult.winnerIndex],
      reason: parsedResult.reason,
      scores: parsedResult.scores.slice(),
      completedRounds: parsedResult.completedRounds,
      seed: parsedResult.seed,
      playerNames: names.slice(),
      defaultNote,
    });
    const strategy = strategyByConfig.get(config);
    if (!strategy) return defaultNote;
    try {
      const composed = cleanText(strategy(summary), MAX_NOTE_POINTS);
      return composed === null ? defaultNote : composed;
    } catch {
      return defaultNote;
    }
  }

  return deepFreeze({
    VERSION,
    PLAYER_COUNT,
    ROUND_COUNT,
    BLOOM_TARGET,
    CARD_TYPES,
    SEASON_TYPES,
    PETAL_VALUES,
    INITIAL_HAND,
    PHASES,
    ACTION_TYPES,
    DEFAULT_CONFIG,
    generateSeasonDeck,
    createInitialState,
    sanitizeConfig,
    resolveRound,
    determineTerminalResult,
    reduceGardenResourceDuel,
    getPublicView,
    getPlayerView,
    replayHistory,
    composeConfiguredResultNote,
    assertState,
  });
});
