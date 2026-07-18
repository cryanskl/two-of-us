(function (root, factory) {
  "use strict";

  const api = factory();
  root.STAR_CODE_UNLOCK_LOGIC = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PHASES = Object.freeze(["intro", "solving", "missed", "linked", "ready", "revealed"]);
  const RESULT_TYPES = Object.freeze(["wrong", "correct", "rescued"]);
  const STAR_POSITIONS = deepFreeze([
    { id: "s01", x: 500, y: 120 },
    { id: "s02", x: 330, y: 185 },
    { id: "s03", x: 675, y: 175 },
    { id: "s04", x: 245, y: 300 },
    { id: "s05", x: 770, y: 300 },
    { id: "s06", x: 180, y: 450 },
    { id: "s07", x: 825, y: 450 },
    { id: "s08", x: 260, y: 610 },
    { id: "s09", x: 750, y: 610 },
    { id: "s10", x: 355, y: 735 },
    { id: "s11", x: 655, y: 735 },
    { id: "s12", x: 500, y: 810 },
  ]);
  const STAR_IDS = Object.freeze(STAR_POSITIONS.map((star) => star.id));
  const STAR_ID_SET = new Set(STAR_IDS);
  const STATE_KEYS = Object.freeze([
    "phase",
    "clueIndex",
    "solvedStarIds",
    "wrongCounts",
    "lastResult",
    "revision",
  ]);
  const RESULT_KEYS = Object.freeze(["clueId", "type", "wrongCount"]);

  const DEFAULT_CONFIG = deepFreeze({
    recipientName: "亲爱的你",
    introCopy: "三条只有你知道的答案，会让星图说出一句话。",
    clues: [
      {
        id: "c1",
        prompt: "那次聊到很晚，我们坐在哪里？",
        acceptedAnswers: ["窗边", "靠窗的位置"],
        starId: "s03",
        successCopy: "窗边那颗星记住了那晚的声音。",
        rescueCopy: "记忆偶尔会走远，让星盘替你找回这一颗。",
      },
      {
        id: "c2",
        prompt: "第一次一起去看海，天空是什么时候的颜色？",
        acceptedAnswers: ["日落", "傍晚", "黄昏"],
        starId: "s09",
        successCopy: "海边那颗星收下了黄昏的颜色。",
        rescueCopy: "天色会慢慢变化，让星盘替你定住这一刻。",
      },
      {
        id: "c3",
        prompt: "每次分别前，我们最常说的两个字是什么？",
        acceptedAnswers: ["回家", "到家"],
        starId: "s12",
        successCopy: "分别前的两个字，也成了回来的方向。",
        rescueCopy: "有些叮嘱不用答对，让星盘替你接住这一颗。",
      },
    ],
    secretWords: ["答案", "一直", "是你"],
    revealTitle: "星图最后指向你",
    revealLines: [
      "有些答案藏在记忆里，有些答案一直写在每一次回头里。",
      "三颗星连起来的时候，我才发现它们始终指向你。",
    ],
    signOff: "往后的每一程，也想继续一起校准。",
    senderName: "一直和你看同一片天的人",
  });

  function deepFreeze(value) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function isRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function hasExactKeys(value, keys) {
    if (!isRecord(value)) return false;
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
  }

  function textLength(value) {
    return Array.from(value).length;
  }

  function cleanText(value, maximum) {
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    const length = textLength(cleaned);
    return length >= 1 && length <= maximum ? cleaned : null;
  }

  function normalizeAnswer(raw) {
    if (typeof raw !== "string" || textLength(raw) > 80) return null;
    const normalized = raw
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase()
      .replace(/[\p{White_Space}\p{Punctuation}]/gu, "");
    return normalized.length > 0 ? normalized : null;
  }

  function sanitizeClue(raw) {
    if (!isRecord(raw)) return null;
    const id = cleanText(raw.id, 24);
    const prompt = cleanText(raw.prompt, 100);
    const successCopy = cleanText(raw.successCopy, 120);
    const rescueCopy = cleanText(raw.rescueCopy, 120);
    if (!id || !prompt || !successCopy || !rescueCopy || !STAR_ID_SET.has(raw.starId)) return null;
    if (!Array.isArray(raw.acceptedAnswers)
      || raw.acceptedAnswers.length < 1
      || raw.acceptedAnswers.length > 5) return null;

    const acceptedAnswers = raw.acceptedAnswers.map((answer) => cleanText(answer, 80));
    if (acceptedAnswers.some((answer) => !answer)) return null;
    const normalizedAnswers = acceptedAnswers.map(normalizeAnswer);
    if (normalizedAnswers.some((answer) => !answer)
      || new Set(normalizedAnswers).size !== normalizedAnswers.length) return null;

    return {
      id,
      prompt,
      acceptedAnswers: [...acceptedAnswers],
      starId: raw.starId,
      successCopy,
      rescueCopy,
    };
  }

  function sanitizeConfig(raw) {
    if (!isRecord(raw) || !Array.isArray(raw.clues) || raw.clues.length !== 3) return DEFAULT_CONFIG;
    const recipientName = cleanText(raw.recipientName, 24);
    const introCopy = cleanText(raw.introCopy, 120);
    const revealTitle = cleanText(raw.revealTitle, 60);
    const signOff = cleanText(raw.signOff, 120);
    const senderName = cleanText(raw.senderName, 40);
    const clues = raw.clues.map(sanitizeClue);
    if (!recipientName || !introCopy || !revealTitle || !signOff || !senderName || clues.some((clue) => !clue)) {
      return DEFAULT_CONFIG;
    }
    if (new Set(clues.map((clue) => clue.id)).size !== 3
      || new Set(clues.map((clue) => clue.starId)).size !== 3) return DEFAULT_CONFIG;

    if (!Array.isArray(raw.secretWords) || raw.secretWords.length !== 3) return DEFAULT_CONFIG;
    const secretWords = raw.secretWords.map((word) => cleanText(word, 12));
    if (secretWords.some((word) => !word)) return DEFAULT_CONFIG;

    if (!Array.isArray(raw.revealLines)
      || raw.revealLines.length < 1
      || raw.revealLines.length > 4) return DEFAULT_CONFIG;
    const revealLines = raw.revealLines.map((line) => cleanText(line, 180));
    if (revealLines.some((line) => !line)) return DEFAULT_CONFIG;

    return deepFreeze({
      recipientName,
      introCopy,
      clues,
      secretWords: [...secretWords],
      revealTitle,
      revealLines: [...revealLines],
      signOff,
      senderName,
    });
  }

  function createInitialState(rawConfig) {
    sanitizeConfig(rawConfig);
    return deepFreeze({
      phase: "intro",
      clueIndex: 0,
      solvedStarIds: [null, null, null],
      wrongCounts: [0, 0, 0],
      lastResult: null,
      revision: 0,
    });
  }

  function isSafeCounter(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function isLastResult(value) {
    return hasExactKeys(value, RESULT_KEYS)
      && Boolean(cleanText(value.clueId, 24))
      && RESULT_TYPES.includes(value.type)
      && isSafeCounter(value.wrongCount);
  }

  function hasSolvedPrefix(state, solvedCount) {
    const solved = state.solvedStarIds.slice(0, solvedCount);
    const pending = state.solvedStarIds.slice(solvedCount);
    return solved.every((id) => STAR_ID_SET.has(id))
      && new Set(solved).size === solved.length
      && pending.every((id) => id === null);
  }

  function isStarCodeState(value) {
    if (!hasExactKeys(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
    if (!Number.isInteger(value.clueIndex) || value.clueIndex < 0 || value.clueIndex > 2) return false;
    if (!Array.isArray(value.solvedStarIds) || value.solvedStarIds.length !== 3) return false;
    if (!Array.isArray(value.wrongCounts)
      || value.wrongCounts.length !== 3
      || !value.wrongCounts.every(isSafeCounter)) return false;
    if (!(value.lastResult === null || isLastResult(value.lastResult))) return false;
    if (!isSafeCounter(value.revision)) return false;

    if (value.phase === "intro") {
      return value.clueIndex === 0
        && hasSolvedPrefix(value, 0)
        && value.wrongCounts.every((count) => count === 0)
        && value.lastResult === null;
    }
    if (value.phase === "solving") {
      return hasSolvedPrefix(value, value.clueIndex) && value.lastResult === null;
    }
    if (value.phase === "missed") {
      return hasSolvedPrefix(value, value.clueIndex)
        && value.lastResult?.type === "wrong"
        && value.lastResult.wrongCount === value.wrongCounts[value.clueIndex]
        && value.lastResult.wrongCount >= 1;
    }
    if (value.phase === "linked") {
      return hasSolvedPrefix(value, value.clueIndex + 1)
        && ["correct", "rescued"].includes(value.lastResult?.type)
        && value.lastResult.wrongCount === value.wrongCounts[value.clueIndex]
        && (value.lastResult.type !== "rescued" || value.lastResult.wrongCount >= 3);
    }
    return value.clueIndex === 2 && hasSolvedPrefix(value, 3) && value.lastResult === null;
  }

  function safeState(state) {
    return isStarCodeState(state) ? state : null;
  }

  function update(state, patch) {
    return deepFreeze({ ...state, ...patch, revision: state.revision + 1 });
  }

  function start(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "intro") return current;
    return update(current, { phase: "solving" });
  }

  function submitAnswer(state, rawAnswer, rawConfig) {
    const current = safeState(state);
    if (!current) return createInitialState(rawConfig);
    if (current.phase !== "solving") return current;

    const config = sanitizeConfig(rawConfig);
    const clue = config.clues[current.clueIndex];
    const candidate = normalizeAnswer(rawAnswer);
    const isCorrect = candidate !== null
      && clue.acceptedAnswers.some((answer) => normalizeAnswer(answer) === candidate);

    if (isCorrect) {
      const solvedStarIds = [...current.solvedStarIds];
      solvedStarIds[current.clueIndex] = clue.starId;
      return update(current, {
        phase: "linked",
        solvedStarIds,
        lastResult: {
          clueId: clue.id,
          type: "correct",
          wrongCount: current.wrongCounts[current.clueIndex],
        },
      });
    }

    const wrongCounts = [...current.wrongCounts];
    wrongCounts[current.clueIndex] += 1;
    return update(current, {
      phase: "missed",
      wrongCounts,
      lastResult: {
        clueId: clue.id,
        type: "wrong",
        wrongCount: wrongCounts[current.clueIndex],
      },
    });
  }

  function retry(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "missed") return current;
    return update(current, { phase: "solving", lastResult: null });
  }

  function rescue(state, rawConfig) {
    const current = safeState(state);
    if (!current) return createInitialState(rawConfig);
    if (current.phase !== "missed" || current.wrongCounts[current.clueIndex] < 3) return current;

    const config = sanitizeConfig(rawConfig);
    const clue = config.clues[current.clueIndex];
    const solvedStarIds = [...current.solvedStarIds];
    solvedStarIds[current.clueIndex] = clue.starId;
    return update(current, {
      phase: "linked",
      solvedStarIds,
      lastResult: {
        clueId: clue.id,
        type: "rescued",
        wrongCount: current.wrongCounts[current.clueIndex],
      },
    });
  }

  function continueAfterLink(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "linked") return current;
    if (current.clueIndex === 2) return update(current, { phase: "ready", lastResult: null });
    return update(current, {
      phase: "solving",
      clueIndex: current.clueIndex + 1,
      lastResult: null,
    });
  }

  function reveal(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "ready") return current;
    return update(current, { phase: "revealed" });
  }

  function restart(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "revealed") return current;
    return deepFreeze({ ...createInitialState(), revision: current.revision + 1 });
  }

  function defaultMissHint(context) {
    if (context.wrongCount === 1) return "答案没有落在这颗星上，再想想那一刻。";
    if (context.wrongCount === 2) return "还是差一点，换个你们常用的说法试试。";
    return "星盘已经可以帮你校准这一颗。";
  }

  function resolveMissHint(policy, context) {
    const safeContext = deepFreeze({
      clueIndex: Number.isInteger(context?.clueIndex) && context.clueIndex >= 0 && context.clueIndex <= 2
        ? context.clueIndex
        : 0,
      wrongCount: Number.isInteger(context?.wrongCount) && context.wrongCount >= 1
        ? context.wrongCount
        : 1,
    });
    if (safeContext.wrongCount <= 2 && typeof policy === "function") {
      try {
        const custom = cleanText(policy(safeContext), 100);
        if (custom) return custom;
      } catch (_) {
        // User-authored local hint policy safely falls through to the deterministic copy.
      }
    }
    return defaultMissHint(safeContext);
  }

  return Object.freeze({
    PHASES,
    STAR_POSITIONS,
    DEFAULT_CONFIG,
    sanitizeConfig,
    normalizeAnswer,
    createInitialState,
    isStarCodeState,
    start,
    submitAnswer,
    retry,
    rescue,
    continueAfterLink,
    reveal,
    restart,
    resolveMissHint,
  });
});
