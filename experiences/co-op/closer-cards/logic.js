(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CLOSER_CARDS_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PHASES = Object.freeze([
    "intro",
    "card-back",
    "first-speaking",
    "second-speaking",
    "settle",
    "complete",
  ]);
  const PUBLIC_CARD_PHASES = Object.freeze(["first-speaking", "second-speaking", "settle"]);
  const STATE_KEYS = Object.freeze([
    "phase",
    "players",
    "sessionSize",
    "plan",
    "cursor",
    "completedIds",
    "skippedIds",
    "firstSpeaker",
    "currentSpeaker",
    "endReason",
    "revision",
  ]);
  const PLAYER_KEYS = Object.freeze(["a", "b"]);
  const THEMES = deepFreeze([
    { id: "today", label: "今天" },
    { id: "us", label: "我们" },
    { id: "tomorrow", label: "以后" },
  ]);
  const CARDS = deepFreeze([
    { id: "today-small-good", theme: "today", question: "最近哪一件很小的事，悄悄让你的心情变好了一点？" },
    { id: "today-quiet-company", theme: "today", question: "这几天什么时候，你最希望有人安静地陪在旁边？" },
    { id: "today-new-habit", theme: "today", question: "最近你发现自己多了一个什么小习惯或新变化？" },
    { id: "today-share-chore", theme: "today", question: "今天如果能替你接走一件琐事，你最想交出哪一件？" },
    { id: "today-calm-sense", theme: "today", question: "最近哪一种声音、气味或天气，会让你立刻放松下来？" },
    { id: "today-lovely-moment", theme: "today", question: "这周有没有一个普通瞬间，让你觉得生活还挺可爱？" },
    { id: "today-care-language", theme: "today", question: "最近你最想被怎样关心，是问一句还是陪你做点什么？" },
    { id: "today-mood-color", theme: "today", question: "此刻用一种颜色形容心情，你会选什么，为什么？" },
    { id: "us-laugh", theme: "us", question: "我们最近一次笑到停不下来，是因为哪件小事？" },
    { id: "us-seen", theme: "us", question: "和我相处时，哪个瞬间会让你觉得自己被认真看见？" },
    { id: "us-repeat-ordinary", theme: "us", question: "我们一起做过的普通小事里，你最想再重来哪一次？" },
    { id: "us-comfort-habit", theme: "us", question: "你觉得我们哪一种相处习惯，正在让日子变得更舒服？" },
    { id: "us-small-warmth", theme: "us", question: "最近我做过哪件不起眼的事，让你心里有一点暖？" },
    { id: "us-name-rhythm", theme: "us", question: "如果给我们的默契起个名字，你会叫它什么呢？" },
    { id: "us-disagree-kindly", theme: "us", question: "我们意见不同时，什么做法最能让你感觉仍被尊重？" },
    { id: "us-wordless", theme: "us", question: "你最喜欢我们之间哪一种不用解释也能懂的时刻？" },
    { id: "tomorrow-slow-half-day", theme: "tomorrow", question: "下一个空闲的半天，你最想和我一起怎样慢慢度过？" },
    { id: "tomorrow-learn", theme: "tomorrow", question: "如果一起学一件没试过的小事，你想从什么开始？" },
    { id: "tomorrow-weekend", theme: "tomorrow", question: "未来某个普通周末，你希望醒来后第一件事是什么？" },
    { id: "tomorrow-nearby", theme: "tomorrow", question: "有哪个地方不必很远，却很想和我一起走走看看？" },
    { id: "tomorrow-extra-hour", theme: "tomorrow", question: "如果明天多出一个小时，你想和我一起拿它做什么？" },
    { id: "tomorrow-ritual", theme: "tomorrow", question: "未来一年里，你希望我们保留哪一种简单的小仪式？" },
    { id: "tomorrow-home-sound", theme: "tomorrow", question: "如果把以后的家想成一种声音，你希望它听起来怎样？" },
    { id: "tomorrow-teamwork", theme: "tomorrow", question: "下一次遇到忙乱的日子，你希望我们怎样互相搭把手？" },
  ]);
  const CARD_ID_SET = new Set(CARDS.map((card) => card.id));

  const DEFAULT_CONFIG = deepFreeze({
    aName: "A 席",
    bName: "B 席",
    firstSpeaker: "a",
    sessionSize: 6,
    chooseOpeningCard() {
      return null;
    },
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function isRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function hasExactKeys(value, keys) {
    return isRecord(value)
      && Object.keys(value).length === keys.length
      && keys.every((key) => Object.hasOwn(value, key));
  }

  function cleanName(value) {
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    return cleaned && cleaned.length <= 20 ? cleaned : null;
  }

  function sanitizeConfig(raw) {
    if (!isRecord(raw)) return DEFAULT_CONFIG;
    const aName = cleanName(raw.aName);
    const bName = cleanName(raw.bName);
    if (!aName || !bName
      || !["a", "b"].includes(raw.firstSpeaker)
      || raw.sessionSize !== DEFAULT_CONFIG.sessionSize
      || typeof raw.chooseOpeningCard !== "function") {
      return DEFAULT_CONFIG;
    }
    return deepFreeze({
      aName,
      bName,
      firstSpeaker: raw.firstSpeaker,
      sessionSize: raw.sessionSize,
      chooseOpeningCard: raw.chooseOpeningCard,
    });
  }

  function createInitialState(rawConfig) {
    const config = sanitizeConfig(rawConfig);
    return freezeState({
      phase: "intro",
      players: { a: config.aName, b: config.bName },
      sessionSize: config.sessionSize,
      plan: [],
      cursor: 0,
      completedIds: [],
      skippedIds: [],
      firstSpeaker: config.firstSpeaker,
      currentSpeaker: null,
      endReason: null,
      revision: 0,
    });
  }

  function createBalancedPlan(deck, randomIndex, chooseOpeningCard) {
    if (!isValidDeck(deck) || typeof randomIndex !== "function") return null;
    const themeIds = THEMES.map((theme) => theme.id);
    const pools = Object.fromEntries(themeIds.map((themeId) => [
      themeId,
      deck.filter((card) => card.theme === themeId).map((card) => card.id),
    ]));
    for (const themeId of themeIds) {
      if (!shuffle(pools[themeId], randomIndex)) return null;
    }

    const openingId = resolveOpeningCard(chooseOpeningCard, deck, themeIds);
    const openingCard = openingId ? deck.find((card) => card.id === openingId) : null;
    const themePlan = [];
    if (openingCard) {
      themePlan.push(openingCard.theme);
      pools[openingCard.theme].splice(pools[openingCard.theme].indexOf(openingId), 1);
    }

    const remaining = Object.fromEntries(themeIds.map((themeId) => [themeId, pools[themeId].length]));
    if (!buildThemePlan(themePlan, remaining, themeIds, deck.length, randomIndex)) return null;

    const cardPlan = openingCard ? [openingId] : [];
    const themeOffset = openingCard ? 1 : 0;
    for (let index = themeOffset; index < themePlan.length; index += 1) {
      const cardId = pools[themePlan[index]].shift();
      if (!cardId) return null;
      cardPlan.push(cardId);
    }
    return deepFreeze(cardPlan);
  }

  function buildThemePlan(plan, remaining, themeIds, targetLength, randomIndex) {
    if (plan.length === targetLength) return true;
    const candidates = themeIds.filter((themeId) => remaining[themeId] > 0 && !wouldMakeThree(plan, themeId));
    if (!shuffle(candidates, randomIndex)) return false;
    for (const themeId of candidates) {
      plan.push(themeId);
      remaining[themeId] -= 1;
      const missing = plan.length <= 6
        ? themeIds.filter((id) => !plan.slice(0, 6).includes(id)).length
        : 0;
      const firstSixCanCover = plan.length > 6 || missing <= 6 - plan.length;
      if (firstSixCanCover && buildThemePlan(plan, remaining, themeIds, targetLength, randomIndex)) return true;
      remaining[themeId] += 1;
      plan.pop();
    }
    return false;
  }

  function resolveOpeningCard(strategy, deck, themeIds) {
    if (typeof strategy !== "function") return null;
    const context = deepFreeze({
      cardIds: deck.map((card) => card.id),
      themeIds: [...themeIds],
    });
    try {
      const candidate = strategy(context);
      return typeof candidate === "string" && context.cardIds.includes(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }

  function startSession(state, deck, randomIndex, chooseOpeningCard) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "intro") return current;
    const plan = createBalancedPlan(deck, randomIndex, chooseOpeningCard);
    if (!plan) return current;
    return freezeState({
      ...current,
      phase: "card-back",
      plan: [...plan],
      revision: current.revision + 1,
    });
  }

  function revealCard(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "card-back") return current;
    return freezeState({
      ...current,
      phase: "first-speaking",
      currentSpeaker: current.firstSpeaker,
      revision: current.revision + 1,
    });
  }

  function finishSpeaking(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase === "first-speaking") {
      return freezeState({
        ...current,
        phase: "second-speaking",
        currentSpeaker: otherSpeaker(current.firstSpeaker),
        revision: current.revision + 1,
      });
    }
    if (current.phase === "second-speaking") {
      return freezeState({
        ...current,
        phase: "settle",
        currentSpeaker: null,
        revision: current.revision + 1,
      });
    }
    return current;
  }

  function settleCard(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "settle") return current;
    return advanceCard(current, "completed");
  }

  function skipCard(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (!PUBLIC_CARD_PHASES.includes(current.phase)) return current;
    return advanceCard(current, "skipped");
  }

  function advanceCard(state, outcome) {
    const cardId = state.plan[state.cursor];
    const completedIds = outcome === "completed" ? [...state.completedIds, cardId] : [...state.completedIds];
    const skippedIds = outcome === "skipped" ? [...state.skippedIds, cardId] : [...state.skippedIds];
    const cursor = state.cursor + 1;
    const firstSpeaker = otherSpeaker(state.firstSpeaker);
    let phase = "card-back";
    let endReason = null;
    if (completedIds.length >= state.sessionSize) {
      phase = "complete";
      endReason = "six-complete";
    } else if (cursor >= state.plan.length) {
      phase = "complete";
      endReason = "deck-exhausted";
    }
    return freezeState({
      ...state,
      phase,
      cursor,
      completedIds,
      skippedIds,
      firstSpeaker,
      currentSpeaker: null,
      endReason,
      revision: state.revision + 1,
    });
  }

  function restartSession(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "complete") return current;
    const openingSpeaker = current.cursor % 2 === 0
      ? current.firstSpeaker
      : otherSpeaker(current.firstSpeaker);
    return freezeState({
      phase: "intro",
      players: { ...current.players },
      sessionSize: current.sessionSize,
      plan: [],
      cursor: 0,
      completedIds: [],
      skippedIds: [],
      firstSpeaker: openingSpeaker,
      currentSpeaker: null,
      endReason: null,
      revision: current.revision + 1,
    });
  }

  function getCurrentCard(state, deck) {
    if (!isGameState(state) || !isValidDeck(deck) || state.phase === "intro" || state.phase === "complete") return null;
    const card = deck.find((candidate) => candidate.id === state.plan[state.cursor]);
    return card ? deepFreeze({ id: card.id, theme: card.theme, question: card.question }) : null;
  }

  function isGameState(value) {
    if (!hasExactKeys(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
    if (!hasExactKeys(value.players, PLAYER_KEYS) || !cleanName(value.players.a) || !cleanName(value.players.b)) return false;
    if (value.sessionSize !== DEFAULT_CONFIG.sessionSize) return false;
    if (!Array.isArray(value.plan) || !value.plan.every((id) => CARD_ID_SET.has(id))
      || new Set(value.plan).size !== value.plan.length) return false;
    if (!Number.isInteger(value.cursor) || value.cursor < 0 || value.cursor > value.plan.length) return false;
    if (!Array.isArray(value.completedIds) || !Array.isArray(value.skippedIds)) return false;
    if (![...value.completedIds, ...value.skippedIds].every((id) => CARD_ID_SET.has(id))) return false;
    const processed = [...value.completedIds, ...value.skippedIds];
    if (new Set(processed).size !== processed.length || processed.length !== value.cursor) return false;
    const processedPrefix = value.plan.slice(0, value.cursor);
    if (!processedPrefix.every((id) => processed.includes(id))) return false;
    if (!["a", "b"].includes(value.firstSpeaker)) return false;
    if (!(value.currentSpeaker === null || ["a", "b"].includes(value.currentSpeaker))) return false;
    if (!(value.endReason === null || ["six-complete", "deck-exhausted"].includes(value.endReason))) return false;
    if (!Number.isInteger(value.revision) || value.revision < 0) return false;

    if (value.phase === "intro") {
      return value.plan.length === 0 && value.cursor === 0 && processed.length === 0
        && value.currentSpeaker === null && value.endReason === null;
    }
    if (value.plan.length !== CARDS.length) return false;
    if (value.phase === "complete") {
      if (value.currentSpeaker !== null || value.cursor < 1) return false;
      if (value.endReason === "six-complete") return value.completedIds.length === value.sessionSize;
      return value.endReason === "deck-exhausted" && value.cursor === value.plan.length
        && value.completedIds.length < value.sessionSize;
    }
    if (value.cursor >= value.plan.length || value.endReason !== null || value.completedIds.length >= value.sessionSize) return false;
    if (value.phase === "first-speaking") return value.currentSpeaker === value.firstSpeaker;
    if (value.phase === "second-speaking") return value.currentSpeaker === otherSpeaker(value.firstSpeaker);
    return value.currentSpeaker === null;
  }

  function isValidDeck(deck) {
    if (!Array.isArray(deck) || deck.length !== CARDS.length) return false;
    const ids = new Set();
    const themeCounts = Object.fromEntries(THEMES.map((theme) => [theme.id, 0]));
    for (const card of deck) {
      if (!isRecord(card) || !isNonEmptyString(card.id) || ids.has(card.id)
        || !Object.hasOwn(themeCounts, card.theme)
        || typeof card.question !== "string"
        || card.question.length < 18
        || card.question.length > 42) return false;
      ids.add(card.id);
      themeCounts[card.theme] += 1;
    }
    return Object.values(themeCounts).every((count) => count === 8);
  }

  function safeState(state) {
    return isGameState(state) ? state : null;
  }

  function wouldMakeThree(plan, themeId) {
    return plan.length >= 2 && plan.at(-1) === themeId && plan.at(-2) === themeId;
  }

  function otherSpeaker(speaker) {
    return speaker === "a" ? "b" : "a";
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.length > 0;
  }

  function shuffle(values, randomIndex) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1);
      if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) return false;
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    return true;
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  return Object.freeze({
    PHASES,
    PUBLIC_CARD_PHASES,
    THEMES,
    CARDS,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createBalancedPlan,
    createInitialState,
    startSession,
    revealCard,
    finishSpeaking,
    settleCard,
    skipCard,
    restartSession,
    getCurrentCard,
    isGameState,
  });
});
