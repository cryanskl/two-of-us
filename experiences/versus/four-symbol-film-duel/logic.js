"use strict";

(function exposeLogic(root, factory) {
  var source =
    typeof module === "object" && module.exports
      ? require("./config.js")
      : root && root.FOUR_SYMBOL_FILM_CONFIG;
  var api = factory(source);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FourSymbolFilmLogic = api;
  }
})(typeof window === "object" ? window : null, function createLogic(sourceConfig) {
  var INTERNAL_STATES = new WeakSet();
  var CONFIG_KEYS = ["publicTitle", "publicInstructions", "genres", "tokens", "cards", "packs"];
  var TOKEN_KEYS = ["id", "glyph", "labelZh", "concepts"];
  var CARD_KEYS = [
    "id", "packId", "pairId", "side", "difficulty", "genre", "tokens",
    "answerOptionId", "options", "spotlightRemoves", "rationale", "authorship", "reviewed"
  ];
  var OPTION_KEYS = ["id", "title"];
  var PACK_KEYS = ["id", "title", "subtitle", "pairIds"];
  var PHASES = ["setup", "handoff", "question", "confirm", "result", "summary"];
  var FORBIDDEN_TEXT =
    /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
  var FORBIDDEN_GLYPH =
    /\u200d|[\u{1f3fb}-\u{1f3ff}]|[\u{1f1e6}-\u{1f1ff}]|[\u{e0020}-\u{e007f}]|[\ue000-\uf8ff]|[\u{f0000}-\u{ffffd}]|[\u{100000}-\u{10fffd}]/u;
  var PICTOGRAPHIC_GLYPH =
    /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\ufe0f)$/u;

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return value;
    }
    if (typeof value === "function") {
      return Object.freeze(value);
    }
    var visited = seen || new WeakSet();
    if (visited.has(value)) {
      return value;
    }
    visited.add(value);
    Reflect.ownKeys(value).forEach(function freezeChild(key) {
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
    ROUND_COUNT: 8,
    ROUNDS_PER_PLAYER: 4,
    STARTING_SPOTLIGHTS: 2,
    TOKEN_COUNT: 48,
    CARD_COUNT: 32,
    PACK_COUNT: 4,
    PAIRS_PER_PACK: 4,
    CARDS_PER_PACK: 8,
    TOKENS_PER_CARD: 4,
    OPTIONS_PER_CARD: 4,
    SCORE_DIRECT: 2,
    SCORE_SPOTLIGHT: 1,
    MAX_SCORE: 8,
    MAX_NAME_LENGTH: 12,
    MAX_REVISION: 1000000
  });

  var ACTIONS = deepFreeze({
    START_MATCH: "START_MATCH",
    ACK_HANDOFF: "ACK_HANDOFF",
    SELECT_OPTION: "SELECT_OPTION",
    USE_SPOTLIGHT: "USE_SPOTLIGHT",
    OPEN_CONFIRMATION: "OPEN_CONFIRMATION",
    RETURN_TO_QUESTION: "RETURN_TO_QUESTION",
    SUBMIT_ANSWER: "SUBMIT_ANSWER",
    ADVANCE_ROUND: "ADVANCE_ROUND",
    RESTART: "RESTART"
  });

  function snapshotRecord(value, keys) {
    try {
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype
      ) {
        return null;
      }
      var own = Reflect.ownKeys(value);
      if (
        own.length !== keys.length ||
        own.some(function unknownKey(key) {
          return typeof key !== "string" || keys.indexOf(key) < 0;
        })
      ) {
        return null;
      }
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var snapshot = {};
      for (var index = 0; index < keys.length; index += 1) {
        var descriptor = descriptors[keys[index]];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot[keys[index]] = descriptor.value;
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function snapshotArray(value, length) {
    try {
      if (
        !Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Array.prototype
      ) {
        return null;
      }
      var own = Reflect.ownKeys(value);
      if (own.length !== length + 1 || own.indexOf("length") < 0) {
        return null;
      }
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var lengthDescriptor = descriptors.length;
      if (
        !lengthDescriptor ||
        !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
        lengthDescriptor.value !== length
      ) {
        return null;
      }
      var snapshot = [];
      for (var index = 0; index < length; index += 1) {
        var descriptor = descriptors[String(index)];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot.push(descriptor.value);
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function snapshotArrayInRange(value, minimum, maximum) {
    try {
      if (
        !Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Array.prototype
      ) {
        return null;
      }
      var descriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        !descriptor ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        !Number.isSafeInteger(descriptor.value) ||
        descriptor.value < minimum ||
        descriptor.value > maximum
      ) {
        return null;
      }
      return snapshotArray(value, descriptor.value);
    } catch (_error) {
      return null;
    }
  }

  function isWellFormedUnicode(value) {
    for (var index = 0; index < value.length; index += 1) {
      var unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= value.length) {
          return false;
        }
        var next = value.charCodeAt(index + 1);
        if (next < 0xdc00 || next > 0xdfff) {
          return false;
        }
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return false;
      }
    }
    return true;
  }

  function isSinglePictographicGlyph(value) {
    return PICTOGRAPHIC_GLYPH.test(value);
  }

  function cleanText(value, minimum, maximum, noWhitespace) {
    if (
      typeof value !== "string" ||
      !isWellFormedUnicode(value) ||
      FORBIDDEN_TEXT.test(value)
    ) {
      return null;
    }
    var clean;
    try {
      clean = value.normalize("NFC");
    } catch (_error) {
      return null;
    }
    if (noWhitespace) {
      if (/\s/u.test(clean)) {
        return null;
      }
    } else {
      clean = clean.replace(/\s+/gu, " ").trim();
    }
    var length = Array.from(clean).length;
    return length >= minimum && length <= maximum ? clean : null;
  }

  function cleanId(value) {
    return typeof value === "string" && /^[a-z][a-z0-9-]{2,47}$/.test(value)
      ? value
      : null;
  }

  function parseTokens(candidate, errors) {
    var values = snapshotArray(candidate, CONSTANTS.TOKEN_COUNT);
    if (!values) {
      errors.push("tokens:shape");
      return null;
    }
    var ids = new Set();
    var glyphs = new Set();
    var labels = new Set();
    var parsed = [];
    for (var index = 0; index < values.length; index += 1) {
      var item = snapshotRecord(values[index], TOKEN_KEYS);
      if (!item) {
        errors.push("token:" + index + ":shape");
        continue;
      }
      var id = cleanId(item.id);
      var glyph = cleanText(item.glyph, 1, 4, true);
      var label = cleanText(item.labelZh, 1, 8, true);
      var concepts = snapshotArrayInRange(item.concepts, 1, 5);
      if (!id || ids.has(id)) {
        errors.push("token:" + index + ":id");
      }
      if (
        !glyph ||
        !isSinglePictographicGlyph(glyph) ||
        FORBIDDEN_GLYPH.test(glyph) ||
        glyphs.has(glyph)
      ) {
        errors.push("token:" + index + ":glyph");
      }
      if (!label || labels.has(label)) {
        errors.push("token:" + index + ":label");
      }
      if (!concepts || concepts.length < 1 || concepts.length > 5) {
        errors.push("token:" + index + ":concepts");
      }
      var cleanConcepts = concepts
        ? concepts.map(function parseConcept(value) {
            return cleanText(value, 1, 8, true);
          })
        : [];
      if (
        cleanConcepts.some(function invalid(value) { return !value; }) ||
        new Set(cleanConcepts).size !== cleanConcepts.length
      ) {
        errors.push("token:" + index + ":concept-values");
      }
      if (id && glyph && label && cleanConcepts.length > 0) {
        ids.add(id);
        glyphs.add(glyph);
        labels.add(label);
        parsed.push({ id: id, glyph: glyph, labelZh: label, concepts: cleanConcepts });
      }
    }
    return errors.length === 0 ? parsed : null;
  }

  function parseGenres(candidate, errors) {
    var values = snapshotArray(candidate, 4);
    if (!values) {
      errors.push("genres:shape");
      return null;
    }
    var parsed = values.map(function parseGenre(value) {
      return cleanText(value, 1, 8, true);
    });
    if (
      parsed.some(function invalid(value) { return !value; }) ||
      new Set(parsed).size !== 4
    ) {
      errors.push("genres:values");
      return null;
    }
    return parsed;
  }

  function parseCards(candidate, tokens, genres, errors) {
    var values = snapshotArray(candidate, CONSTANTS.CARD_COUNT);
    if (!values) {
      errors.push("cards:shape");
      return null;
    }
    var tokenIds = new Set(tokens.map(function tokenId(token) { return token.id; }));
    var ids = new Set();
    var allTitles = new Set();
    var parsed = [];
    for (var index = 0; index < values.length; index += 1) {
      var item = snapshotRecord(values[index], CARD_KEYS);
      if (!item) {
        errors.push("card:" + index + ":shape");
        continue;
      }
      var id = cleanId(item.id);
      var packId = cleanId(item.packId);
      var pairId = cleanId(item.pairId);
      var tokenList = snapshotArray(item.tokens, CONSTANTS.TOKENS_PER_CARD);
      var optionList = snapshotArray(item.options, CONSTANTS.OPTIONS_PER_CARD);
      var rationale = cleanText(item.rationale, 1, 120, false);
      if (!id || ids.has(id)) errors.push("card:" + index + ":id");
      if (!packId) errors.push("card:" + index + ":pack");
      if (!pairId) errors.push("card:" + index + ":pair");
      if (item.side !== "A" && item.side !== "B") errors.push("card:" + index + ":side");
      if (![1, 2, 3].includes(item.difficulty)) errors.push("card:" + index + ":difficulty");
      if (genres.indexOf(item.genre) < 0) errors.push("card:" + index + ":genre");
      if (
        !tokenList ||
        new Set(tokenList).size !== CONSTANTS.TOKENS_PER_CARD ||
        tokenList.some(function unknown(tokenId) {
          return typeof tokenId !== "string" || !tokenIds.has(tokenId);
        })
      ) {
        errors.push("card:" + index + ":tokens");
      }
      var options = [];
      if (!optionList) {
        errors.push("card:" + index + ":options");
      } else {
        var localIds = new Set();
        optionList.forEach(function parseOption(optionValue, optionIndex) {
          var option = snapshotRecord(optionValue, OPTION_KEYS);
          var optionId = option && cleanId(option.id);
          var title = option && cleanText(option.title, 2, 18, false);
          if (
            !option ||
            !optionId ||
            localIds.has(optionId) ||
            !title ||
            allTitles.has(title)
          ) {
            errors.push("card:" + index + ":option:" + optionIndex);
            return;
          }
          localIds.add(optionId);
          allTitles.add(title);
          options.push({ id: optionId, title: title });
        });
      }
      var optionIds = new Set(options.map(function optionId(option) { return option.id; }));
      if (!optionIds.has(item.answerOptionId)) errors.push("card:" + index + ":answer");
      if (
        !optionIds.has(item.spotlightRemoves) ||
        item.spotlightRemoves === item.answerOptionId
      ) {
        errors.push("card:" + index + ":spotlight");
      }
      if (!rationale) errors.push("card:" + index + ":rationale");
      if (item.authorship !== "original-project-copy") errors.push("card:" + index + ":author");
      if (item.reviewed !== true) errors.push("card:" + index + ":reviewed");
      if (
        id &&
        packId &&
        pairId &&
        tokenList &&
        options.length === CONSTANTS.OPTIONS_PER_CARD &&
        rationale
      ) {
        ids.add(id);
        parsed.push({
          id: id,
          packId: packId,
          pairId: pairId,
          side: item.side,
          difficulty: item.difficulty,
          genre: item.genre,
          tokens: tokenList.slice(),
          answerOptionId: item.answerOptionId,
          options: options,
          spotlightRemoves: item.spotlightRemoves,
          rationale: rationale,
          authorship: item.authorship,
          reviewed: item.reviewed
        });
      }
    }
    return errors.length === 0 ? parsed : null;
  }

  function parsePacks(candidate, cards, genres, errors) {
    var values = snapshotArray(candidate, CONSTANTS.PACK_COUNT);
    if (!values) {
      errors.push("packs:shape");
      return null;
    }
    var ids = new Set();
    var usedPairs = new Set();
    var parsed = [];
    for (var index = 0; index < values.length; index += 1) {
      var item = snapshotRecord(values[index], PACK_KEYS);
      if (!item) {
        errors.push("pack:" + index + ":shape");
        continue;
      }
      var id = cleanId(item.id);
      var title = cleanText(item.title, 2, 18, false);
      var subtitle = cleanText(item.subtitle, 4, 40, false);
      var pairIds = snapshotArray(item.pairIds, CONSTANTS.PAIRS_PER_PACK);
      if (!id || ids.has(id)) errors.push("pack:" + index + ":id");
      if (!title) errors.push("pack:" + index + ":title");
      if (!subtitle) errors.push("pack:" + index + ":subtitle");
      if (
        !pairIds ||
        pairIds.some(function invalidPair(pairId) { return !cleanId(pairId); }) ||
        new Set(pairIds).size !== CONSTANTS.PAIRS_PER_PACK
      ) {
        errors.push("pack:" + index + ":pairs");
      } else {
        var packCards = cards.filter(function samePack(card) { return card.packId === id; });
        if (packCards.length !== CONSTANTS.CARDS_PER_PACK) {
          errors.push("pack:" + index + ":card-count");
        }
        var sideProfiles = { A: [], B: [] };
        pairIds.forEach(function validatePair(pairId) {
          if (usedPairs.has(pairId)) errors.push("pack:" + index + ":reused-pair");
          usedPairs.add(pairId);
          var pair = packCards.filter(function samePair(card) { return card.pairId === pairId; });
          var a = pair.find(function sideA(card) { return card.side === "A"; });
          var b = pair.find(function sideB(card) { return card.side === "B"; });
          if (pair.length !== 2 || !a || !b) {
            errors.push("pack:" + index + ":pair-members");
          } else if (a.difficulty !== b.difficulty || a.genre !== b.genre) {
            errors.push("pack:" + index + ":pair-balance");
          } else {
            sideProfiles.A.push(a.difficulty + ":" + a.genre);
            sideProfiles.B.push(b.difficulty + ":" + b.genre);
          }
        });
        if (
          sideProfiles.A.length !== CONSTANTS.PAIRS_PER_PACK ||
          sideProfiles.A.join("|") !== sideProfiles.B.join("|") ||
          sideProfiles.A.map(function profile(value) { return value.split(":")[1]; }).join("|") !== genres.join("|")
        ) {
          errors.push("pack:" + index + ":profile");
        }
      }
      if (id && title && subtitle && pairIds) {
        ids.add(id);
        parsed.push({ id: id, title: title, subtitle: subtitle, pairIds: pairIds.slice() });
      }
    }
    return errors.length === 0 ? parsed : null;
  }

  function parseConfig(candidate) {
    var config = snapshotRecord(candidate, CONFIG_KEYS);
    if (!config) return null;
    var errors = [];
    var title = cleanText(config.publicTitle, 2, 30, false);
    var instructions = cleanText(config.publicInstructions, 4, 120, false);
    if (!title) errors.push("config:title");
    if (!instructions) errors.push("config:instructions");
    var genres = parseGenres(config.genres, errors);
    var tokens = genres ? parseTokens(config.tokens, errors) : null;
    var cards = tokens && genres ? parseCards(config.cards, tokens, genres, errors) : null;
    var packs = cards && genres ? parsePacks(config.packs, cards, genres, errors) : null;
    if (errors.length > 0 || !title || !instructions || !genres || !tokens || !cards || !packs) {
      return null;
    }
    return deepFreeze({
      publicTitle: title,
      publicInstructions: instructions,
      genres: genres,
      tokens: tokens,
      cards: cards,
      packs: packs
    });
  }

  var DEFAULT_CONFIG = parseConfig(sourceConfig);
  if (!DEFAULT_CONFIG) {
    throw new Error("Invalid built-in four symbol film config");
  }

  function sanitizeConfig(candidate) {
    return parseConfig(candidate) || DEFAULT_CONFIG;
  }

  function snapshotGameData(candidate) {
    try {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate) ||
        Object.getPrototypeOf(candidate) !== Object.prototype
      ) {
        return null;
      }
      var descriptors = Object.getOwnPropertyDescriptors(candidate);
      var snapshot = {};
      var required = ["tokens", "cards", "packs"];
      for (var index = 0; index < required.length; index += 1) {
        var descriptor = descriptors[required[index]];
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
          return null;
        }
        snapshot[required[index]] = descriptor.value;
      }
      var genres = descriptors.genres;
      if (genres && !Object.prototype.hasOwnProperty.call(genres, "value")) {
        return null;
      }
      snapshot.genres = genres ? genres.value : DEFAULT_CONFIG.genres;
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function validateGameData(candidate) {
    try {
      var data = snapshotGameData(candidate);
      if (!data) {
        return deepFreeze(["data:shape"]);
      }
      var errors = [];
      var genres = parseGenres(data.genres, errors);
      var tokens = genres ? parseTokens(data.tokens, errors) : null;
      var cards = tokens && genres ? parseCards(data.cards, tokens, genres, errors) : null;
      if (cards && genres) parsePacks(data.packs, cards, genres, errors);
      return deepFreeze(errors.slice());
    } catch (_error) {
      return deepFreeze(["data:hostile"]);
    }
  }

  function normalizePlayerName(value, fallback) {
    var normalized = cleanText(value, 1, CONSTANTS.MAX_NAME_LENGTH, false);
    return normalized || fallback;
  }

  function scoreAnswer(candidate) {
    var value = snapshotRecord(candidate, ["isCorrect", "spotlightUsed"]);
    if (!value || typeof value.isCorrect !== "boolean" || typeof value.spotlightUsed !== "boolean") {
      return null;
    }
    if (!value.isCorrect) return 0;
    return value.spotlightUsed ? CONSTANTS.SCORE_SPOTLIGHT : CONSTANTS.SCORE_DIRECT;
  }

  function buildScheduleFromConfig(packId, config) {
    var pack = config.packs.find(function findPack(item) { return item.id === packId; });
    if (!pack) return null;
    var schedule = [];
    pack.pairIds.forEach(function addPair(pairId) {
      ["A", "B"].forEach(function addSide(side) {
        var card = config.cards.find(function findCard(item) {
          return item.packId === packId && item.pairId === pairId && item.side === side;
        });
        schedule.push(card.id);
      });
    });
    return deepFreeze(schedule);
  }

  function buildSchedule(packId, candidateConfig) {
    var config = arguments.length > 1 ? sanitizeConfig(candidateConfig) : DEFAULT_CONFIG;
    return buildScheduleFromConfig(packId, config);
  }

  function snapshotPlayerScore(candidate) {
    try {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        Array.isArray(candidate) ||
        Object.getPrototypeOf(candidate) !== Object.prototype
      ) {
        return null;
      }
      var descriptor = Object.getOwnPropertyDescriptor(candidate, "score");
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")
        ? { score: descriptor.value }
        : null;
    } catch (_error) {
      return null;
    }
  }

  function getWinner(players) {
    var values = snapshotArray(players, CONSTANTS.PLAYER_COUNT);
    if (!values) return null;
    var playerA = snapshotPlayerScore(values[0]);
    var playerB = snapshotPlayerScore(values[1]);
    if (!playerA || !playerB) return null;
    var a = playerA.score;
    var b = playerB.score;
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0) return null;
    if (a === b) return "tie";
    return a > b ? "A" : "B";
  }

  function makeState(value) {
    var state = deepFreeze(value);
    INTERNAL_STATES.add(state);
    return state;
  }

  function createInitialState(candidateConfig) {
    var content = arguments.length > 0 ? sanitizeConfig(candidateConfig) : DEFAULT_CONFIG;
    return makeState({
      version: CONSTANTS.VERSION,
      phase: "setup",
      content: content,
      players: [
        { id: "A", name: "玩家 A", score: 0, spotlights: CONSTANTS.STARTING_SPOTLIGHTS },
        { id: "B", name: "玩家 B", score: 0, spotlights: CONSTANTS.STARTING_SPOTLIGHTS }
      ],
      packId: null,
      schedule: [],
      roundIndex: 0,
      selectedOptionId: null,
      spotlightUsedThisRound: false,
      eliminatedOptionId: null,
      results: [],
      revision: 0
    });
  }

  function currentCard(state) {
    var cardId = state.schedule[state.roundIndex];
    return state.content.cards.find(function findCard(card) { return card.id === cardId; }) || null;
  }

  function currentPlayerIndex(state) {
    return state.roundIndex % CONSTANTS.PLAYER_COUNT;
  }

  function copyState(state, changes) {
    var next = {
      version: state.version,
      phase: state.phase,
      content: state.content,
      players: state.players,
      packId: state.packId,
      schedule: state.schedule,
      roundIndex: state.roundIndex,
      selectedOptionId: state.selectedOptionId,
      spotlightUsedThisRound: state.spotlightUsedThisRound,
      eliminatedOptionId: state.eliminatedOptionId,
      results: state.results,
      revision: state.revision + 1
    };
    Object.keys(changes).forEach(function applyChange(key) {
      next[key] = changes[key];
    });
    return makeState(next);
  }

  function parseAction(candidate, state) {
    var header = snapshotRecord(candidate, ["type", "revision"]);
    if (
      header &&
      Object.prototype.hasOwnProperty.call(ACTIONS, Object.keys(ACTIONS).find(function findAction(key) {
        return ACTIONS[key] === header.type;
      }) || "") &&
      Number.isSafeInteger(header.revision) &&
      header.revision === state.revision
    ) {
      return header;
    }
    if (!candidate || typeof candidate !== "object") return null;
    var typeDescriptor;
    try {
      typeDescriptor = Object.getOwnPropertyDescriptor(candidate, "type");
    } catch (_error) {
      return null;
    }
    if (!typeDescriptor || !Object.prototype.hasOwnProperty.call(typeDescriptor, "value")) return null;
    var type = typeDescriptor.value;
    var keys =
      type === ACTIONS.START_MATCH
        ? ["type", "revision", "packId", "playerNames"]
        : type === ACTIONS.SELECT_OPTION
          ? ["type", "revision", "optionId"]
          : ["type", "revision"];
    var value = snapshotRecord(candidate, keys);
    if (
      !value ||
      !Number.isSafeInteger(value.revision) ||
      value.revision !== state.revision ||
      Object.values(ACTIONS).indexOf(value.type) < 0
    ) {
      return null;
    }
    return value;
  }

  function reduce(state, action) {
    if (!INTERNAL_STATES.has(state)) {
      return createInitialState();
    }
    if (state.revision >= CONSTANTS.MAX_REVISION) {
      return state;
    }
    var event = parseAction(action, state);
    if (!event) return state;

    if (event.type === ACTIONS.START_MATCH) {
      if (state.phase !== "setup" || !cleanId(event.packId)) return state;
      var names = snapshotArray(event.playerNames, CONSTANTS.PLAYER_COUNT);
      var schedule = buildScheduleFromConfig(event.packId, state.content);
      if (!names || !schedule) return state;
      var players = [
        {
          id: "A",
          name: normalizePlayerName(names[0], "玩家 A"),
          score: 0,
          spotlights: CONSTANTS.STARTING_SPOTLIGHTS
        },
        {
          id: "B",
          name: normalizePlayerName(names[1], "玩家 B"),
          score: 0,
          spotlights: CONSTANTS.STARTING_SPOTLIGHTS
        }
      ];
      return copyState(state, {
        phase: "handoff",
        players: players,
        packId: event.packId,
        schedule: schedule.slice(),
        roundIndex: 0,
        selectedOptionId: null,
        spotlightUsedThisRound: false,
        eliminatedOptionId: null,
        results: []
      });
    }

    if (event.type === ACTIONS.ACK_HANDOFF) {
      return state.phase === "handoff" ? copyState(state, { phase: "question" }) : state;
    }

    if (event.type === ACTIONS.SELECT_OPTION) {
      if (state.phase !== "question" || typeof event.optionId !== "string") return state;
      var selectCard = currentCard(state);
      var selectable = selectCard.options.some(function hasOption(option) {
        return option.id === event.optionId;
      });
      if (!selectable || event.optionId === state.eliminatedOptionId) return state;
      if (event.optionId === state.selectedOptionId) return state;
      return copyState(state, { selectedOptionId: event.optionId });
    }

    if (event.type === ACTIONS.USE_SPOTLIGHT) {
      if (state.phase !== "question" || state.spotlightUsedThisRound) return state;
      var playerIndex = currentPlayerIndex(state);
      if (state.players[playerIndex].spotlights < 1) return state;
      var spotlightCard = currentCard(state);
      var playersAfterSpotlight = state.players.map(function copyPlayer(player, index) {
        return {
          id: player.id,
          name: player.name,
          score: player.score,
          spotlights: player.spotlights - (index === playerIndex ? 1 : 0)
        };
      });
      return copyState(state, {
        players: playersAfterSpotlight,
        selectedOptionId:
          state.selectedOptionId === spotlightCard.spotlightRemoves
            ? null
            : state.selectedOptionId,
        spotlightUsedThisRound: true,
        eliminatedOptionId: spotlightCard.spotlightRemoves
      });
    }

    if (event.type === ACTIONS.OPEN_CONFIRMATION) {
      return state.phase === "question" && state.selectedOptionId
        ? copyState(state, { phase: "confirm" })
        : state;
    }

    if (event.type === ACTIONS.RETURN_TO_QUESTION) {
      return state.phase === "confirm" ? copyState(state, { phase: "question" }) : state;
    }

    if (event.type === ACTIONS.SUBMIT_ANSWER) {
      if (
        state.phase !== "confirm" ||
        !state.selectedOptionId ||
        state.results.some(function alreadySettled(result) {
          return result.roundIndex === state.roundIndex;
        })
      ) {
        return state;
      }
      var submitCard = currentCard(state);
      var validSelection = submitCard.options.some(function matches(option) {
        return option.id === state.selectedOptionId;
      });
      if (!validSelection || state.selectedOptionId === state.eliminatedOptionId) return state;
      var isCorrect = state.selectedOptionId === submitCard.answerOptionId;
      var score = scoreAnswer({
        isCorrect: isCorrect,
        spotlightUsed: state.spotlightUsedThisRound
      });
      var submitPlayerIndex = currentPlayerIndex(state);
      var scoredPlayers = state.players.map(function scorePlayer(player, index) {
        return {
          id: player.id,
          name: player.name,
          score: player.score + (index === submitPlayerIndex ? score : 0),
          spotlights: player.spotlights
        };
      });
      var result = {
        roundIndex: state.roundIndex,
        playerId: state.players[submitPlayerIndex].id,
        cardId: submitCard.id,
        selectedOptionId: state.selectedOptionId,
        correctOptionId: submitCard.answerOptionId,
        spotlightUsed: state.spotlightUsedThisRound,
        eliminatedOptionId: state.eliminatedOptionId,
        scoreAwarded: score
      };
      return copyState(state, {
        phase: "result",
        players: scoredPlayers,
        results: state.results.concat([result])
      });
    }

    if (event.type === ACTIONS.ADVANCE_ROUND) {
      if (state.phase !== "result") return state;
      if (state.roundIndex === CONSTANTS.ROUND_COUNT - 1) {
        return copyState(state, { phase: "summary" });
      }
      return copyState(state, {
        phase: "handoff",
        roundIndex: state.roundIndex + 1,
        selectedOptionId: null,
        spotlightUsedThisRound: false,
        eliminatedOptionId: null
      });
    }

    if (event.type === ACTIONS.RESTART) {
      return state.phase === "summary"
        ? copyState(state, {
            phase: "setup",
            players: [
              { id: "A", name: "玩家 A", score: 0, spotlights: CONSTANTS.STARTING_SPOTLIGHTS },
              { id: "B", name: "玩家 B", score: 0, spotlights: CONSTANTS.STARTING_SPOTLIGHTS }
            ],
            packId: null,
            schedule: [],
            roundIndex: 0,
            selectedOptionId: null,
            spotlightUsedThisRound: false,
            eliminatedOptionId: null,
            results: []
          })
        : state;
    }

    return state;
  }

  function copyToken(token) {
    return { id: token.id, glyph: token.glyph, labelZh: token.labelZh };
  }

  function cardView(state, reveal) {
    if (state.phase === "setup" || state.phase === "handoff" || state.phase === "summary") {
      return null;
    }
    var card = currentCard(state);
    var byToken = new Map(state.content.tokens.map(function mapToken(token) {
      return [token.id, token];
    }));
    var view = {
      id: card.id,
      difficulty: card.difficulty,
      genre: card.genre,
      tokens: card.tokens.map(function tokenView(id) { return copyToken(byToken.get(id)); }),
      options: card.options.map(function optionView(option) {
        return {
          id: option.id,
          title: option.title,
          selected: option.id === state.selectedOptionId,
          eliminated: option.id === state.eliminatedOptionId
        };
      })
    };
    if (reveal) {
      view.correctOptionId = card.answerOptionId;
      view.rationale = card.rationale;
    }
    return view;
  }

  function resultView(state, result) {
    var card = state.content.cards.find(function findCard(item) { return item.id === result.cardId; });
    var byToken = new Map(state.content.tokens.map(function mapToken(token) {
      return [token.id, token];
    }));
    var selected = card.options.find(function selectedOption(option) {
      return option.id === result.selectedOptionId;
    });
    var correct = card.options.find(function correctOption(option) {
      return option.id === result.correctOptionId;
    });
    return {
      roundIndex: result.roundIndex,
      playerId: result.playerId,
      cardId: result.cardId,
      tokens: card.tokens.map(function tokenView(id) { return copyToken(byToken.get(id)); }),
      selectedTitle: selected.title,
      correctTitle: correct.title,
      isCorrect: result.selectedOptionId === result.correctOptionId,
      spotlightUsed: result.spotlightUsed,
      scoreAwarded: result.scoreAwarded,
      rationale: card.rationale
    };
  }

  function getPublicView(state) {
    if (!INTERNAL_STATES.has(state)) {
      state = createInitialState();
    }
    var pack = state.content.packs.find(function findPack(item) { return item.id === state.packId; });
    var playerIndex = currentPlayerIndex(state);
    var lastResult =
      state.phase === "result" && state.results.length > 0
        ? resultView(state, state.results[state.results.length - 1])
        : null;
    var summary =
      state.phase === "summary"
        ? {
            winner: getWinner(state.players),
            results: state.results.map(function makeResultView(result) {
              return resultView(state, result);
            })
          }
        : null;
    return deepFreeze({
      version: state.version,
      title: state.content.publicTitle,
      instructions: state.content.publicInstructions,
      phase: PHASES.indexOf(state.phase) >= 0 ? state.phase : "setup",
      roundNumber: state.phase === "setup" ? 0 : state.roundIndex + 1,
      totalRounds: CONSTANTS.ROUND_COUNT,
      availablePacks: state.content.packs.map(function packOption(item) {
        return { id: item.id, title: item.title, subtitle: item.subtitle };
      }),
      pack: pack ? { id: pack.id, title: pack.title, subtitle: pack.subtitle } : null,
      currentPlayer:
        state.phase === "setup" || state.phase === "summary"
          ? null
          : {
              id: state.players[playerIndex].id,
              name: state.players[playerIndex].name
            },
      players: state.players.map(function playerView(player) {
        return {
          id: player.id,
          name: player.name,
          score: player.score,
          spotlights: player.spotlights
        };
      }),
      currentCard: cardView(state, state.phase === "result"),
      selectedOptionId: state.selectedOptionId,
      spotlightUsedThisRound: state.spotlightUsedThisRound,
      eliminatedOptionId: state.eliminatedOptionId,
      lastResult: lastResult,
      summary: summary,
      revision: state.revision
    });
  }

  return deepFreeze({
    CONSTANTS: CONSTANTS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    ACTIONS: ACTIONS,
    sanitizeConfig: sanitizeConfig,
    validateGameData: validateGameData,
    normalizePlayerName: normalizePlayerName,
    scoreAnswer: scoreAnswer,
    buildSchedule: buildSchedule,
    getWinner: getWinner,
    createInitialState: createInitialState,
    reduce: reduce,
    getPublicView: getPublicView
  });
});
