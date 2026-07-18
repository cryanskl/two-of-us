(function (root, factory) {
  "use strict";

  let configApi = root && root.SecretRecipeCodeConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch {
      configApi = null;
    }
  }
  const api = factory(configApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.SecretRecipeCodeLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const SLOT_COUNT = 4;
  const MAX_GUESSES = 7;
  const ROUND_COUNT = 2;
  const FAILED_SCORE = 8;
  const MAX_PER_SECRET_INGREDIENT = 2;
  const MIN_UNIQUE_SECRET_INGREDIENTS = 3;
  const MAX_NAME_POINTS = 16;
  const MAX_LABEL_POINTS = 12;
  const MAX_DESCRIPTION_POINTS = 48;
  const MAX_NOTE_POINTS = 240;

  const INGREDIENT_IDS = deepFreeze(["berry", "citrus", "mint", "cocoa", "honey", "salt"]);
  const INGREDIENT_COLORS = deepFreeze({
    berry: "#c9656b",
    citrus: "#dfa547",
    mint: "#67a483",
    cocoa: "#8b604f",
    honey: "#d2ae59",
    salt: "#88a6b5",
  });
  const ICON_KEYS = deepFreeze({
    berry: "triple-fruit",
    citrus: "six-slice",
    mint: "double-leaf",
    cocoa: "split-bean",
    honey: "single-drop",
    salt: "diamond-crystal",
  });
  const PHASES = deepFreeze(["intro", "setting", "handoff", "guessing", "round-result", "match-result"]);
  const STATE_KEYS = deepFreeze([
    "version", "phase", "roundIndex", "setterIndex", "breakerIndex", "covered", "draft", "secret",
    "guessDraft", "guesses", "roundResults", "announcementSerial", "lastNotice",
  ]);
  const GUESS_KEYS = deepFreeze(["values", "exact", "misplaced"]);
  const RESULT_KEYS = deepFreeze(["roundIndex", "setterIndex", "breakerIndex", "secret", "attempts", "failed"]);
  const NOTICE_IDS = deepFreeze([
    null, "match-started", "secret-updated", "secret-duplicate-limit", "secret-cleared", "secret-incomplete",
    "secret-not-varied", "secret-submitted", "secret-covered", "secret-resumed", "handoff-confirmed",
    "guess-updated", "guess-cleared", "guess-incomplete", "guess-feedback", "round-solved", "round-failed",
    "round-advanced", "match-complete",
  ]);
  const ACTION_FIELDS = deepFreeze({
    START_MATCH: [],
    ADD_SECRET: ["ingredientId"],
    REMOVE_SECRET_SLOT: ["index"],
    CLEAR_SECRET: [],
    SUBMIT_SECRET: [],
    COVER_SECRET: ["reason"],
    RESUME_SECRET: [],
    CONFIRM_HANDOFF: [],
    ADD_GUESS: ["ingredientId"],
    REMOVE_GUESS_SLOT: ["index"],
    CLEAR_GUESS: [],
    SUBMIT_GUESS: [],
    ADVANCE_ROUND: [],
    RESTART_MATCH: [],
  });
  const COVER_REASONS = deepFreeze(["manual", "escape", "blur", "hidden"]);

  const FALLBACK_DEFAULT_CONFIG = deepFreeze({
    title: "藏好这一味",
    subtitle: "你藏四味，我用七次慢慢猜到。",
    intro: "每人各藏一次四格配方。猜中得越快，越先尝到胜利；同位是配料和位置都对，有料是配料对了但位置不对。",
    playerNames: ["你", "TA"],
    ingredientText: {
      berry: { label: "红莓", description: "微酸，醒得快" },
      citrus: { label: "柑橘", description: "明亮，先闻见" },
      mint: { label: "薄荷", description: "清凉，留得久" },
      cocoa: { label: "可可", description: "温厚，慢慢化" },
      honey: { label: "蜂蜜", description: "柔甜，黏住余味" },
      salt: { label: "海盐", description: "清醒，托住其他味道" },
    },
    defaultMatchNote: "两份配方都揭开了，今晚的胜负留在这一杯里。",
  });
  const DEFAULT_CONFIG = isUsableDefaultConfig(configApi && configApi.DEFAULT_CONFIG)
    ? configApi.DEFAULT_CONFIG
    : FALLBACK_DEFAULT_CONFIG;
  const strategyByConfig = new WeakMap();

  function createInitialState() {
    return freezeState({
      version: VERSION,
      phase: "intro",
      roundIndex: 0,
      setterIndex: 0,
      breakerIndex: 1,
      covered: false,
      draft: [],
      secret: null,
      guessDraft: [],
      guesses: [],
      roundResults: [],
      announcementSerial: 0,
      lastNotice: null,
    });
  }

  function sanitizeConfig(candidate, composeStrategy) {
    const source = isPlainObject(candidate) ? candidate : null;
    const title = cleanConfigText(source, "title", DEFAULT_CONFIG.title, MAX_NOTE_POINTS);
    const subtitle = cleanConfigText(source, "subtitle", DEFAULT_CONFIG.subtitle, MAX_NOTE_POINTS);
    const intro = cleanConfigText(source, "intro", DEFAULT_CONFIG.intro, MAX_NOTE_POINTS);
    const defaultMatchNote = cleanConfigText(
      source,
      "defaultMatchNote",
      DEFAULT_CONFIG.defaultMatchNote,
      MAX_NOTE_POINTS,
    );
    const playerNames = sanitizePlayerNames(safeOwnData(source, "playerNames"));
    const ingredientText = sanitizeIngredientText(safeOwnData(source, "ingredientText"));
    const safe = deepFreeze({ title, subtitle, intro, playerNames, ingredientText, defaultMatchNote });
    const strategy = typeof composeStrategy === "function"
      ? composeStrategy
      : typeof configApi?.composeMatchNote === "function"
        ? configApi.composeMatchNote
        : null;
    if (strategy) strategyByConfig.set(safe, strategy);
    return safe;
  }

  function scoreGuess(secret, guess) {
    if (!isSecret(secret) || !isGuessValues(guess)) throw new TypeError("secret and guess must be valid recipes");
    const remainingSecret = Object.create(null);
    const remainingGuess = Object.create(null);
    let exact = 0;
    for (let index = 0; index < SLOT_COUNT; index += 1) {
      if (secret[index] === guess[index]) {
        exact += 1;
      } else {
        remainingSecret[secret[index]] = (remainingSecret[secret[index]] || 0) + 1;
        remainingGuess[guess[index]] = (remainingGuess[guess[index]] || 0) + 1;
      }
    }
    let misplaced = 0;
    for (const id of INGREDIENT_IDS) {
      misplaced += Math.min(remainingSecret[id] || 0, remainingGuess[id] || 0);
    }
    return deepFreeze({ exact, misplaced });
  }

  function reduceRecipe(state, action) {
    assertState(state);
    const safeAction = parseAction(action);
    if (safeAction.type === "RESTART_MATCH") return state.phase === "intro" ? state : createInitialState();
    if (state.phase === "match-result") return state;

    switch (safeAction.type) {
      case "START_MATCH":
        return state.phase === "intro" ? transition(state, {
          phase: "setting",
          lastNotice: "match-started",
        }) : state;
      case "ADD_SECRET":
        if (state.phase !== "setting" || state.covered || state.draft.length >= SLOT_COUNT) return state;
        if (countId(state.draft, safeAction.ingredientId) >= MAX_PER_SECRET_INGREDIENT) {
          return noticeOnly(state, "secret-duplicate-limit");
        }
        return transition(state, {
          draft: [...state.draft, safeAction.ingredientId],
          lastNotice: "secret-updated",
        });
      case "REMOVE_SECRET_SLOT":
        if (state.phase !== "setting" || state.covered || safeAction.index >= state.draft.length) return state;
        return transition(state, {
          draft: removeAt(state.draft, safeAction.index),
          lastNotice: "secret-updated",
        });
      case "CLEAR_SECRET":
        if (state.phase !== "setting" || state.covered || state.draft.length === 0) return state;
        return transition(state, { draft: [], lastNotice: "secret-cleared" });
      case "SUBMIT_SECRET":
        if (state.phase !== "setting" || state.covered) return state;
        if (state.draft.length !== SLOT_COUNT) return noticeOnly(state, "secret-incomplete");
        if (!isSecret(state.draft)) return noticeOnly(state, "secret-not-varied");
        return transition(state, {
          phase: "handoff",
          draft: [],
          secret: state.draft.slice(),
          lastNotice: "secret-submitted",
        });
      case "COVER_SECRET":
        if (state.phase !== "setting" || state.covered) return state;
        return transition(state, { covered: true, lastNotice: "secret-covered" });
      case "RESUME_SECRET":
        if (state.phase !== "setting" || !state.covered) return state;
        return transition(state, { covered: false, lastNotice: "secret-resumed" });
      case "CONFIRM_HANDOFF":
        if (state.phase !== "handoff") return state;
        return transition(state, { phase: "guessing", lastNotice: "handoff-confirmed" });
      case "ADD_GUESS":
        if (state.phase !== "guessing" || state.guessDraft.length >= SLOT_COUNT) return state;
        return transition(state, {
          guessDraft: [...state.guessDraft, safeAction.ingredientId],
          lastNotice: "guess-updated",
        });
      case "REMOVE_GUESS_SLOT":
        if (state.phase !== "guessing" || safeAction.index >= state.guessDraft.length) return state;
        return transition(state, {
          guessDraft: removeAt(state.guessDraft, safeAction.index),
          lastNotice: "guess-updated",
        });
      case "CLEAR_GUESS":
        if (state.phase !== "guessing" || state.guessDraft.length === 0) return state;
        return transition(state, { guessDraft: [], lastNotice: "guess-cleared" });
      case "SUBMIT_GUESS":
        return submitGuess(state);
      case "ADVANCE_ROUND":
        return advanceRound(state);
      default:
        return state;
    }
  }

  function assertState(state) {
    const seen = new WeakSet();
    assertExactRecord(state, STATE_KEYS, "state", seen);
    if (state.version !== VERSION) failState();
    if (!PHASES.includes(state.phase)) failState();
    if (!Number.isInteger(state.roundIndex) || state.roundIndex < 0 || state.roundIndex >= ROUND_COUNT) failState();
    const expectedSetter = state.roundIndex;
    const expectedBreaker = 1 - state.roundIndex;
    if (state.setterIndex !== expectedSetter || state.breakerIndex !== expectedBreaker) failState();
    if (typeof state.covered !== "boolean") failState();
    assertUniqueArray(state.draft, "draft", seen);
    assertUniqueArray(state.guessDraft, "guessDraft", seen);
    assertUniqueArray(state.guesses, "guesses", seen);
    assertUniqueArray(state.roundResults, "roundResults", seen);
    if (state.secret !== null) assertUniqueArray(state.secret, "secret", seen);
    if (!isIngredientList(state.draft, 0, SLOT_COUNT) || !isIngredientList(state.guessDraft, 0, SLOT_COUNT)) failState();
    if (!isDraftSecretPossible(state.draft)) failState();
    if (state.secret !== null && !isSecret(state.secret)) failState();
    if (!Number.isSafeInteger(state.announcementSerial) || state.announcementSerial < 0) failState();
    if (!NOTICE_IDS.includes(state.lastNotice)) failState();

    for (const row of state.guesses) assertGuessRow(row, state.secret, seen);
    for (const result of state.roundResults) assertRoundResult(result, seen);
    for (let index = 0; index < state.roundResults.length; index += 1) {
      const result = state.roundResults[index];
      if (result.roundIndex !== index || result.setterIndex !== index || result.breakerIndex !== 1 - index) failState();
    }
    assertPhaseMatrix(state);
    return state;
  }

  function getRecipeView(state, safeConfig) {
    assertState(state);
    const knownStrategy = safeConfig && typeof safeConfig === "object" ? strategyByConfig.get(safeConfig) : null;
    const config = sanitizeConfig(safeConfig, knownStrategy);
    const isSettingVisible = state.phase === "setting" && !state.covered;
    const isGuessing = state.phase === "guessing";
    const isRoundResult = state.phase === "round-result";
    const isMatchResult = state.phase === "match-result";
    const results = state.phase === "round-result" || isMatchResult
      ? state.roundResults.map((result) => projectResult(result, config))
      : [];
    const score = deriveScore(state.roundResults);
    const matchNote = isMatchResult ? resolveMatchNote(config, score) : "";
    const text = phaseText(state, config, matchNote);

    return deepFreeze({
      phase: state.phase,
      round: { index: state.roundIndex, number: state.roundIndex + 1, total: ROUND_COUNT },
      roles: {
        setterIndex: state.setterIndex,
        breakerIndex: state.breakerIndex,
        setterName: config.playerNames[state.setterIndex],
        breakerName: config.playerNames[state.breakerIndex],
      },
      privacy: {
        covered: state.phase === "setting" && state.covered,
        secretVisible: isRoundResult,
        secretStoredInMemory: ["handoff", "guessing", "round-result"].includes(state.phase),
      },
      ingredients: INGREDIENT_IDS.map((id, index) => ({
        id,
        number: index + 1,
        label: config.ingredientText[id].label,
        description: config.ingredientText[id].description,
        color: INGREDIENT_COLORS[id],
        iconKey: ICON_KEYS[id],
      })),
      draft: isSettingVisible ? state.draft.slice() : [],
      guessDraft: isGuessing ? state.guessDraft.slice() : [],
      history: isGuessing || isRoundResult
        ? state.guesses.map((row, index) => ({
          number: index + 1,
          values: row.values.slice(),
          exact: row.exact,
          misplaced: row.misplaced,
        }))
        : [],
      revealedSecret: isRoundResult ? state.secret.slice() : [],
      score,
      results,
      controls: {
        canStart: state.phase === "intro",
        canEditSecret: isSettingVisible,
        canSubmitSecret: isSettingVisible && isSecret(state.draft),
        canCover: isSettingVisible,
        canResume: state.phase === "setting" && state.covered,
        canConfirmHandoff: state.phase === "handoff",
        canEditGuess: isGuessing,
        canSubmitGuess: isGuessing && state.guessDraft.length === SLOT_COUNT,
        canAdvanceRound: isRoundResult,
        canRestart: isMatchResult,
      },
      notice: state.lastNotice,
      text,
    });
  }

  function submitGuess(state) {
    if (state.phase !== "guessing") return state;
    if (state.guessDraft.length !== SLOT_COUNT) return noticeOnly(state, "guess-incomplete");
    const feedback = scoreGuess(state.secret, state.guessDraft);
    const row = { values: state.guessDraft.slice(), exact: feedback.exact, misplaced: feedback.misplaced };
    const guesses = [...state.guesses, row];
    const solved = feedback.exact === SLOT_COUNT;
    const failed = !solved && guesses.length === MAX_GUESSES;
    if (!solved && !failed) {
      return transition(state, { guessDraft: [], guesses, lastNotice: "guess-feedback" });
    }
    const result = {
      roundIndex: state.roundIndex,
      setterIndex: state.setterIndex,
      breakerIndex: state.breakerIndex,
      secret: state.secret.slice(),
      attempts: solved ? guesses.length : null,
      failed,
    };
    return transition(state, {
      phase: "round-result",
      guessDraft: [],
      guesses,
      roundResults: [...state.roundResults, result],
      lastNotice: solved ? "round-solved" : "round-failed",
    });
  }

  function advanceRound(state) {
    if (state.phase !== "round-result") return state;
    if (state.roundIndex === 0) {
      return transition(state, {
        phase: "setting",
        roundIndex: 1,
        setterIndex: 1,
        breakerIndex: 0,
        secret: null,
        guesses: [],
        lastNotice: "round-advanced",
      });
    }
    return transition(state, {
      phase: "match-result",
      covered: false,
      draft: [],
      secret: null,
      guessDraft: [],
      guesses: [],
      lastNotice: "match-complete",
    });
  }

  function assertPhaseMatrix(state) {
    const resultCount = state.roundResults.length;
    if (state.phase === "intro") {
      if (state.roundIndex !== 0 || state.covered || state.draft.length || state.secret !== null
        || state.guessDraft.length || state.guesses.length || resultCount) failState();
      return;
    }
    if (state.phase === "setting") {
      if (state.secret !== null || state.guessDraft.length || state.guesses.length || resultCount !== state.roundIndex) failState();
      return;
    }
    if (state.phase === "handoff") {
      if (state.covered || state.draft.length || !isSecret(state.secret) || state.guessDraft.length
        || state.guesses.length || resultCount !== state.roundIndex) failState();
      return;
    }
    if (state.phase === "guessing") {
      if (state.covered || state.draft.length || !isSecret(state.secret) || state.guesses.length > MAX_GUESSES - 1
        || resultCount !== state.roundIndex || state.guesses.some((row) => row.exact === SLOT_COUNT)) failState();
      return;
    }
    if (state.phase === "round-result") {
      if (state.covered || state.draft.length || !isSecret(state.secret) || state.guessDraft.length
        || resultCount !== state.roundIndex + 1 || state.guesses.length < 1 || state.guesses.length > MAX_GUESSES) failState();
      const current = state.roundResults[state.roundIndex];
      const last = state.guesses[state.guesses.length - 1];
      if (!sameArray(current.secret, state.secret)) failState();
      if (current.failed) {
        if (state.guesses.length !== MAX_GUESSES || state.guesses.some((row) => row.exact === SLOT_COUNT)) failState();
      } else if (current.attempts !== state.guesses.length || last.exact !== SLOT_COUNT
        || state.guesses.slice(0, -1).some((row) => row.exact === SLOT_COUNT)) failState();
      return;
    }
    if (state.roundIndex !== 1 || state.covered || state.draft.length || state.secret !== null
      || state.guessDraft.length || state.guesses.length || resultCount !== ROUND_COUNT) failState();
  }

  function assertGuessRow(row, secret, seen) {
    assertExactRecord(row, GUESS_KEYS, "guess row", seen);
    assertUniqueArray(row.values, "guess values", seen);
    if (!isGuessValues(row.values) || !Number.isInteger(row.exact) || !Number.isInteger(row.misplaced)) failState();
    if (!secret) failState();
    const expected = scoreGuess(secret, row.values);
    if (row.exact !== expected.exact || row.misplaced !== expected.misplaced) failState();
  }

  function assertRoundResult(result, seen) {
    assertExactRecord(result, RESULT_KEYS, "round result", seen);
    assertUniqueArray(result.secret, "result secret", seen);
    if (![0, 1].includes(result.roundIndex) || result.setterIndex !== result.roundIndex
      || result.breakerIndex !== 1 - result.roundIndex || !isSecret(result.secret) || typeof result.failed !== "boolean") failState();
    if (result.failed) {
      if (result.attempts !== null) failState();
    } else if (!Number.isInteger(result.attempts) || result.attempts < 1 || result.attempts > MAX_GUESSES) failState();
  }

  function deriveScore(results) {
    const values = [null, null];
    const solved = [null, null];
    for (const result of results) {
      values[result.breakerIndex] = result.failed ? FAILED_SCORE : result.attempts;
      solved[result.breakerIndex] = !result.failed;
    }
    const complete = results.length === ROUND_COUNT;
    let winnerIndex = null;
    let tied = false;
    if (complete) {
      tied = values[0] === values[1];
      winnerIndex = tied ? null : values[0] < values[1] ? 0 : 1;
    }
    return deepFreeze({ values, solved, winnerIndex, tied });
  }

  function resolveMatchNote(config, score) {
    const summary = deepFreeze({
      playerNames: config.playerNames.slice(),
      scores: score.values.slice(),
      solved: score.solved.slice(),
      winnerIndex: score.winnerIndex,
      tied: score.tied,
      defaultNote: config.defaultMatchNote,
    });
    const strategy = strategyByConfig.get(config);
    if (typeof strategy !== "function") return config.defaultMatchNote;
    try {
      return cleanText(strategy(summary), MAX_NOTE_POINTS) || config.defaultMatchNote;
    } catch {
      return config.defaultMatchNote;
    }
  }

  function phaseText(state, config, matchNote) {
    const breakerName = config.playerNames[state.breakerIndex];
    const setterName = config.playerNames[state.setterIndex];
    let current;
    switch (state.phase) {
      case "intro":
        current = {
        instruction: config.intro,
        primaryLabel: "开始第一轮",
        };
        break;
      case "setting":
        current = state.covered ? {
          instruction: "配方已盖住。只有配方师确认四周没人偷看后才能继续。",
          primaryLabel: "只有我在看，继续设置",
        } : {
          instruction: `${setterName} 放入四格配料；同一种最多两格，整份至少三种。`,
          primaryLabel: "藏好配方",
        };
        break;
      case "handoff":
        current = {
          instruction: `把设备交给 ${breakerName}。秘密已经从页面移除。`,
          primaryLabel: "我接好了",
        };
        break;
      case "guessing":
        current = {
          instruction: `${breakerName} 有七次试配机会；同位是位置也对，有料是配料对但位置不对。`,
          primaryLabel: "试这一杯",
        };
        break;
      case "round-result": {
        const result = state.roundResults[state.roundIndex];
        current = {
          instruction: result.failed
            ? `${breakerName} 七次内没有破译这份配方。`
            : `${breakerName} 用 ${result.attempts} 次破译了配方。`,
          primaryLabel: state.roundIndex === 0 ? "交换角色" : "看看谁先尝到",
        };
        break;
      }
      default:
        current = {
          instruction: matchInstruction(state.roundResults, config.playerNames),
          primaryLabel: "再藏一回",
        };
        break;
    }
    return deepFreeze({
      title: config.title,
      subtitle: config.subtitle,
      instruction: current.instruction,
      primaryLabel: current.primaryLabel,
      matchNote,
    });
  }

  function matchInstruction(results, names) {
    const score = deriveScore(results);
    if (score.tied) return `打成 ${score.values[0]} 比 ${score.values[1]}，今晚两个人一样快。`;
    return `${names[score.winnerIndex]} 以 ${score.values[score.winnerIndex]} 比 ${score.values[1 - score.winnerIndex]} 先尝到了。`;
  }

  function projectResult(result, config) {
    return {
      roundIndex: result.roundIndex,
      roundNumber: result.roundIndex + 1,
      setterIndex: result.setterIndex,
      breakerIndex: result.breakerIndex,
      setterName: config.playerNames[result.setterIndex],
      breakerName: config.playerNames[result.breakerIndex],
      secret: result.secret.slice(),
      attempts: result.attempts,
      failed: result.failed,
      score: result.failed ? FAILED_SCORE : result.attempts,
    };
  }

  function transition(state, patch) {
    return freezeState({
      ...state,
      ...patch,
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function noticeOnly(state, notice) {
    if (state.lastNotice === notice) return state;
    return transition(state, { lastNotice: notice });
  }

  function freezeState(state) {
    return deepFreeze({
      version: state.version,
      phase: state.phase,
      roundIndex: state.roundIndex,
      setterIndex: state.setterIndex,
      breakerIndex: state.breakerIndex,
      covered: state.covered,
      draft: cloneList(state.draft),
      secret: state.secret === null ? null : cloneList(state.secret),
      guessDraft: cloneList(state.guessDraft),
      guesses: state.guesses.map((row) => ({ values: cloneList(row.values), exact: row.exact, misplaced: row.misplaced })),
      roundResults: state.roundResults.map((result) => ({
        roundIndex: result.roundIndex,
        setterIndex: result.setterIndex,
        breakerIndex: result.breakerIndex,
        secret: cloneList(result.secret),
        attempts: result.attempts,
        failed: result.failed,
      })),
      announcementSerial: state.announcementSerial,
      lastNotice: state.lastNotice,
    });
  }

  function parseAction(action) {
    try {
      if (!isPlainObject(action)) throw new TypeError("action must be a plain object");
      const keys = Reflect.ownKeys(action);
      if (keys.some((key) => typeof key !== "string")) throw new TypeError("action symbols are not allowed");
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(action, key);
        if (!descriptor || !("value" in descriptor)) throw new TypeError("action accessors are not allowed");
      }
      const type = safeOwnData(action, "type");
      if (typeof type !== "string" || !Object.hasOwn(ACTION_FIELDS, type)) throw new TypeError("unknown action type");
      const expected = ["type", ...ACTION_FIELDS[type]];
      if (keys.length !== expected.length || expected.some((key) => !keys.includes(key))) throw new TypeError("invalid action fields");
      const parsed = { type };
      if (ACTION_FIELDS[type].includes("ingredientId")) {
        const id = safeOwnData(action, "ingredientId");
        if (!INGREDIENT_IDS.includes(id)) throw new TypeError("invalid ingredientId");
        parsed.ingredientId = id;
      }
      if (ACTION_FIELDS[type].includes("index")) {
        const index = safeOwnData(action, "index");
        if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) throw new TypeError("invalid index");
        parsed.index = index;
      }
      if (ACTION_FIELDS[type].includes("reason")) {
        const reason = safeOwnData(action, "reason");
        if (!COVER_REASONS.includes(reason)) throw new TypeError("invalid cover reason");
        parsed.reason = reason;
      }
      return parsed;
    } catch (error) {
      throw error instanceof TypeError ? error : new TypeError("invalid action");
    }
  }

  function assertExactRecord(value, keys, label, seen) {
    try {
      if (!isPlainObject(value) || seen.has(value)) failState();
      seen.add(value);
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string")) failState();
      if (!keys.every((key, index) => ownKeys[index] === key)) failState();
      for (const key of ownKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor)) failState();
      }
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new TypeError(`invalid ${label}`);
    }
  }

  function assertUniqueArray(value, label, seen) {
    if (!Array.isArray(value) || seen.has(value)) throw new TypeError(`invalid ${label}`);
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    const expected = Array.from({ length: value.length }, (_, index) => String(index)).concat("length");
    if (keys.length !== expected.length || !expected.every((key, index) => keys[index] === key)) throw new TypeError(`invalid ${label}`);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) throw new TypeError(`invalid ${label}`);
    }
  }

  function isSecret(value) {
    if (!isIngredientList(value, SLOT_COUNT, SLOT_COUNT)) return false;
    const counts = new Map();
    for (const id of value) counts.set(id, (counts.get(id) || 0) + 1);
    return counts.size >= MIN_UNIQUE_SECRET_INGREDIENTS
      && Math.max(...counts.values()) <= MAX_PER_SECRET_INGREDIENT;
  }

  function isDraftSecretPossible(value) {
    if (!Array.isArray(value)) return false;
    return INGREDIENT_IDS.every((id) => countId(value, id) <= MAX_PER_SECRET_INGREDIENT);
  }

  function isGuessValues(value) {
    return isIngredientList(value, SLOT_COUNT, SLOT_COUNT);
  }

  function isIngredientList(value, min, max) {
    if (!Array.isArray(value) || value.length < min || value.length > max) return false;
    const keys = Reflect.ownKeys(value);
    const expected = Array.from({ length: value.length }, (_, index) => String(index)).concat("length");
    if (keys.length !== expected.length || !expected.every((key, index) => keys[index] === key)) return false;
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !INGREDIENT_IDS.includes(descriptor.value)) return false;
    }
    return true;
  }

  function sanitizePlayerNames(value) {
    if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3) {
      return DEFAULT_CONFIG.playerNames.slice();
    }
    const first = cleanText(safeArrayData(value, 0), MAX_NAME_POINTS);
    const second = cleanText(safeArrayData(value, 1), MAX_NAME_POINTS);
    return [first || DEFAULT_CONFIG.playerNames[0], second || DEFAULT_CONFIG.playerNames[1]];
  }

  function sanitizeIngredientText(value) {
    let exactShape = isPlainObject(value);
    if (exactShape) {
      try {
        const keys = Reflect.ownKeys(value);
        exactShape = keys.length === INGREDIENT_IDS.length && keys.every((key, index) => key === INGREDIENT_IDS[index]);
      } catch {
        exactShape = false;
      }
    }
    const source = exactShape ? value : null;
    const output = {};
    for (const id of INGREDIENT_IDS) {
      const item = safeOwnData(source, id);
      const label = cleanConfigText(item, "label", DEFAULT_CONFIG.ingredientText[id].label, MAX_LABEL_POINTS);
      const description = cleanConfigText(
        item,
        "description",
        DEFAULT_CONFIG.ingredientText[id].description,
        MAX_DESCRIPTION_POINTS,
      );
      output[id] = { label, description };
    }
    return output;
  }

  function cleanConfigText(source, key, fallback, maxPoints) {
    const value = safeOwnData(source, key);
    return cleanText(value, maxPoints) || fallback;
  }

  function cleanText(value, maxPoints) {
    if (typeof value !== "string") return "";
    const cleaned = value.trim();
    const points = Array.from(cleaned);
    return points.length >= 1 && points.length <= maxPoints ? cleaned : "";
  }

  function safeOwnData(object, key) {
    try {
      if (!object || (typeof object !== "object" && typeof object !== "function")) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      return descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  }

  function safeArrayData(array, index) {
    return safeOwnData(array, String(index));
  }

  function isPlainObject(value) {
    try {
      return value !== null && typeof value === "object" && !Array.isArray(value)
        && Object.getPrototypeOf(value) === Object.prototype;
    } catch {
      return false;
    }
  }

  function isUsableDefaultConfig(value) {
    return value && typeof value === "object" && Array.isArray(value.playerNames)
      && value.playerNames.length === 2 && value.ingredientText && typeof value.ingredientText === "object";
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || Object.isFrozen(value)) return value;
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  function cloneList(value) {
    return value.slice();
  }

  function removeAt(values, index) {
    return values.slice(0, index).concat(values.slice(index + 1));
  }

  function countId(values, id) {
    let count = 0;
    for (const value of values) if (value === id) count += 1;
    return count;
  }

  function sameArray(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function failState() {
    throw new TypeError("invalid recipe state");
  }

  return deepFreeze({
    VERSION,
    SLOT_COUNT,
    MAX_GUESSES,
    ROUND_COUNT,
    FAILED_SCORE,
    MAX_PER_SECRET_INGREDIENT,
    MIN_UNIQUE_SECRET_INGREDIENTS,
    INGREDIENT_IDS,
    INGREDIENT_COLORS,
    createInitialState,
    sanitizeConfig,
    scoreGuess,
    reduceRecipe,
    assertState,
    getRecipeView,
  });
});
