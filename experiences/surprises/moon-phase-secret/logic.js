(function (root, factory) {
  "use strict";
  root.MOON_PHASE_SECRET_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SYNODIC_MONTH_DAYS = 29.53059;
  const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 15);
  const PHASE_COUNT = 8;
  const MS_PER_DAY = 86400000;
  const MONTH_STEP_ANGLE = 2 * Math.PI / 12;
  const MOON_PHASE_STEP_ANGLE = 2 * Math.PI / PHASE_COUNT;
  const MAX_POINTER_DELTA = Math.PI / 2;
  const PHASE_NAMES = Object.freeze(["新月", "蛾眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"]);
  const PHASES = Object.freeze(["intro", "calibrating", "unlocked"]);
  const CONFIG_KEYS = Object.freeze([
    "targetDate",
    "recipientName",
    "finalTitle",
    "finalMessage",
    "clues",
    "composeClues",
  ]);
  const STATE_KEYS = Object.freeze([
    "phase",
    "year",
    "selectedMonth",
    "selectedDay",
    "selectedPhaseIndex",
    "target",
    "clues",
    "feedback",
    "attempts",
    "revision",
    "recipientName",
    "finalTitle",
    "finalMessage",
  ]);
  const TARGET_KEYS = Object.freeze(["year", "month", "day", "phaseIndex"]);
  const FEEDBACK_KEYS = Object.freeze(["monthAligned", "dayAligned", "phaseAligned"]);

  function defaultComposeClues() {
    return null;
  }

  const DEFAULT_CONFIG = deepFreeze({
    targetDate: "2024-05-20",
    recipientName: "给你",
    finalTitle: "原来月亮也记得",
    finalMessage: "那一天之后，普通的日子也开始有了坐标。",
    clues: [
      "春天快走到尾声的时候。",
      "把两双手的手指都数一遍。",
      "月光已经越过半圆，正走向圆满。",
    ],
    composeClues: defaultComposeClues,
  });

  function parseDate(value) {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1900 || year > 2099 || month < 1 || month > 12
      || day < 1 || day > daysInMonth(year, month)) return null;
    return deepFreeze({ year, month, day });
  }

  function isLeapYear(year) {
    return Number.isInteger(year) && year >= 1
      && (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  }

  function daysInMonth(year, month) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }

  function positiveModulo(value, modulus) {
    if (!Number.isFinite(value) || !Number.isFinite(modulus) || modulus <= 0) return Number.NaN;
    return ((value % modulus) + modulus) % modulus;
  }

  function getMoonPhaseIndex(dateValue) {
    const candidate = dateValue && typeof dateValue === "object"
      ? { year: dateValue.year, month: dateValue.month, day: dateValue.day }
      : null;
    const parsed = typeof dateValue === "string" ? parseDate(dateValue) : candidate;
    if (!isParsedDate(parsed)) return null;
    const utcNoon = Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12);
    const deltaDays = (utcNoon - REFERENCE_NEW_MOON_MS) / MS_PER_DAY;
    const cycle = positiveModulo(deltaDays, SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
    return Math.round(cycle * PHASE_COUNT) % PHASE_COUNT;
  }

  function sanitizeConfig(input) {
    if (input === undefined) return DEFAULT_CONFIG;
    try {
      if (!hasExactKeys(input, CONFIG_KEYS)) return DEFAULT_CONFIG;
      const target = parseDate(input.targetDate);
      const recipientName = cleanText(input.recipientName, 20);
      const finalTitle = cleanText(input.finalTitle, 32);
      const finalMessage = cleanText(input.finalMessage, 180);
      const baseClues = sanitizeClues(input.clues);
      const strategy = input.composeClues;
      if (!target || !recipientName || !finalTitle || !finalMessage || !baseClues || typeof strategy !== "function") {
        return DEFAULT_CONFIG;
      }

      const targetPhaseIndex = getMoonPhaseIndex(target);
      const context = deepFreeze({
        targetDate: input.targetDate,
        targetPhaseIndex,
        targetPhaseName: PHASE_NAMES[targetPhaseIndex],
        baseClues: [...baseClues],
      });
      const clues = resolveClues(strategy, context, baseClues);
      return deepFreeze({
        targetDate: input.targetDate,
        recipientName,
        finalTitle,
        finalMessage,
        clues: [...clues],
        composeClues(composeContext) {
          return Reflect.apply(strategy, undefined, [composeContext]);
        },
      });
    } catch (_error) {
      return DEFAULT_CONFIG;
    }
  }

  function createInitialState(config) {
    const sanitized = sanitizeConfig(config);
    const parsed = parseDate(sanitized.targetDate);
    const target = {
      ...parsed,
      phaseIndex: getMoonPhaseIndex(parsed),
    };
    return makeInitialState({
      target,
      clues: sanitized.clues,
      recipientName: sanitized.recipientName,
      finalTitle: sanitized.finalTitle,
      finalMessage: sanitized.finalMessage,
      revision: 0,
    });
  }

  function start(state) {
    if (!isMoonPhaseState(state)) return createInitialState();
    if (state.phase !== "intro") return state;
    return update(state, { phase: "calibrating" });
  }

  function adjustMonth(state, delta) {
    if (!isMoonPhaseState(state)) return createInitialState();
    if (state.phase !== "calibrating" || !Number.isSafeInteger(delta) || delta === 0) return state;
    const selectedMonth = wrapInteger(state.selectedMonth + delta, 1, 12);
    const selectedDay = Math.min(state.selectedDay, daysInMonth(state.year, selectedMonth));
    if (selectedMonth === state.selectedMonth && selectedDay === state.selectedDay) return state;
    return update(state, { selectedMonth, selectedDay, feedback: null });
  }

  function adjustDay(state, delta) {
    if (!isMoonPhaseState(state)) return createInitialState();
    if (state.phase !== "calibrating" || !Number.isSafeInteger(delta) || delta === 0) return state;
    const maximum = daysInMonth(state.year, state.selectedMonth);
    const selectedDay = wrapInteger(state.selectedDay + delta, 1, maximum);
    if (selectedDay === state.selectedDay) return state;
    return update(state, { selectedDay, feedback: null });
  }

  function adjustMoonPhase(state, delta) {
    if (!isMoonPhaseState(state)) return createInitialState();
    if (state.phase !== "calibrating" || !Number.isSafeInteger(delta) || delta === 0) return state;
    const selectedPhaseIndex = wrapInteger(state.selectedPhaseIndex + delta, 0, PHASE_COUNT - 1);
    if (selectedPhaseIndex === state.selectedPhaseIndex) return state;
    return update(state, { selectedPhaseIndex, feedback: null });
  }

  function checkAlignment(state) {
    if (!isMoonPhaseState(state)) return createInitialState();
    if (state.phase !== "calibrating") return state;
    const feedback = {
      monthAligned: state.selectedMonth === state.target.month,
      dayAligned: state.selectedDay === state.target.day,
      phaseAligned: state.selectedPhaseIndex === state.target.phaseIndex,
    };
    const unlocked = Object.values(feedback).every(Boolean);
    return update(state, {
      phase: unlocked ? "unlocked" : "calibrating",
      feedback,
      attempts: state.attempts + 1,
    });
  }

  function restart(state) {
    if (!isMoonPhaseState(state)) return createInitialState();
    if (state.phase !== "unlocked") return state;
    return makeInitialState({
      target: state.target,
      clues: state.clues,
      recipientName: state.recipientName,
      finalTitle: state.finalTitle,
      finalMessage: state.finalMessage,
      revision: state.revision + 1,
    });
  }

  function getViewModel(state) {
    const current = isMoonPhaseState(state) ? state : createInitialState();
    const showClues = current.phase !== "intro";
    const finalMessage = current.phase === "unlocked"
      ? {
        recipientName: current.recipientName,
        finalTitle: current.finalTitle,
        finalMessage: current.finalMessage,
      }
      : null;
    return deepFreeze({
      phase: current.phase,
      year: current.year,
      selectedMonth: current.selectedMonth,
      selectedDay: current.selectedDay,
      selectedPhaseIndex: current.selectedPhaseIndex,
      selectedPhaseName: PHASE_NAMES[current.selectedPhaseIndex],
      clues: showClues ? [...current.clues] : [],
      feedback: current.feedback ? { ...current.feedback } : null,
      attempts: current.attempts,
      finalMessage,
    });
  }

  function normalizeAngularDelta(previous, next) {
    if (!Number.isFinite(previous) || !Number.isFinite(next)) return Number.NaN;
    const raw = next - previous;
    if (raw === Math.PI || raw === -Math.PI) return raw;
    return Math.atan2(Math.sin(raw), Math.cos(raw));
  }

  function stepsFromAngularTravel(carry, delta, stepAngle) {
    const safeCarry = Number.isFinite(carry) ? carry : 0;
    if (!Number.isFinite(carry) || !Number.isFinite(delta) || !Number.isFinite(stepAngle) || stepAngle <= 0) {
      return deepFreeze({ steps: 0, newCarry: safeCarry });
    }
    if (Math.abs(delta) > MAX_POINTER_DELTA) return deepFreeze({ steps: 0, newCarry: carry });

    const total = carry + delta;
    const rawSteps = total / stepAngle;
    const nearest = Math.round(rawSteps);
    const tolerance = Number.EPSILON * 64;
    const stableSteps = Math.abs(rawSteps - nearest) <= tolerance ? nearest : rawSteps;
    const quantifiedSteps = stableSteps < 0 ? Math.ceil(stableSteps) : Math.floor(stableSteps);
    const steps = Object.is(quantifiedSteps, -0) ? 0 : quantifiedSteps;
    let newCarry = total - steps * stepAngle;
    if (Math.abs(newCarry) <= stepAngle * tolerance) newCarry = 0;
    return deepFreeze({ steps, newCarry });
  }

  function isMoonPhaseState(value) {
    try {
      return inspectMoonPhaseState(value);
    } catch (_error) {
      return false;
    }
  }

  function inspectMoonPhaseState(value) {
    if (!hasExactKeys(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
    if (!Number.isInteger(value.year) || value.year < 1900 || value.year > 2099) return false;
    if (!Number.isInteger(value.selectedMonth) || value.selectedMonth < 1 || value.selectedMonth > 12) return false;
    if (!Number.isInteger(value.selectedDay)
      || value.selectedDay < 1 || value.selectedDay > daysInMonth(value.year, value.selectedMonth)) return false;
    if (!Number.isInteger(value.selectedPhaseIndex)
      || value.selectedPhaseIndex < 0 || value.selectedPhaseIndex >= PHASE_COUNT) return false;
    if (!isTarget(value.target) || value.target.year !== value.year) return false;
    if (getMoonPhaseIndex(value.target) !== value.target.phaseIndex) return false;
    if (!sanitizeClues(value.clues)) return false;
    if (!(value.feedback === null || isFeedback(value.feedback))) return false;
    if (!isSafeCounter(value.attempts) || !isSafeCounter(value.revision)) return false;
    if (!cleanText(value.recipientName, 20) || !cleanText(value.finalTitle, 32) || !cleanText(value.finalMessage, 180)) {
      return false;
    }

    if (value.feedback) {
      if (value.feedback.monthAligned !== (value.selectedMonth === value.target.month)
        || value.feedback.dayAligned !== (value.selectedDay === value.target.day)
        || value.feedback.phaseAligned !== (value.selectedPhaseIndex === value.target.phaseIndex)) return false;
    }

    if (value.phase === "intro") {
      return value.selectedMonth === 1 && value.selectedDay === 1 && value.selectedPhaseIndex === 0
        && value.feedback === null && value.attempts === 0;
    }
    if (value.phase === "calibrating") {
      return !value.feedback || !Object.values(value.feedback).every(Boolean);
    }
    return value.selectedMonth === value.target.month
      && value.selectedDay === value.target.day
      && value.selectedPhaseIndex === value.target.phaseIndex
      && Boolean(value.feedback && Object.values(value.feedback).every(Boolean))
      && value.attempts >= 1;
  }

  function resolveClues(strategy, context, baseClues) {
    try {
      const candidate = Reflect.apply(strategy, undefined, [context]);
      return sanitizeClues(candidate) || baseClues;
    } catch (_error) {
      return baseClues;
    }
  }

  function sanitizeClues(value) {
    if (!Array.isArray(value) || value.length !== 3) return null;
    const clues = value.map((clue) => cleanText(clue, 36));
    if (clues.some((clue) => !clue) || new Set(clues).size !== clues.length) return null;
    return Object.freeze([...clues]);
  }

  function isParsedDate(value) {
    return hasExactKeys(value, Object.freeze(["year", "month", "day"]))
      && Number.isInteger(value.year) && value.year >= 1900 && value.year <= 2099
      && Number.isInteger(value.month) && value.month >= 1 && value.month <= 12
      && Number.isInteger(value.day) && value.day >= 1 && value.day <= daysInMonth(value.year, value.month);
  }

  function isTarget(value) {
    return hasExactKeys(value, TARGET_KEYS)
      && isParsedDate({ year: value.year, month: value.month, day: value.day })
      && Number.isInteger(value.phaseIndex) && value.phaseIndex >= 0 && value.phaseIndex < PHASE_COUNT;
  }

  function isFeedback(value) {
    return hasExactKeys(value, FEEDBACK_KEYS)
      && FEEDBACK_KEYS.every((key) => typeof value[key] === "boolean");
  }

  function isSafeCounter(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function cleanText(value, maximum) {
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    const length = Array.from(cleaned).length;
    return length >= 1 && length <= maximum ? cleaned : null;
  }

  function hasExactKeys(value, expectedKeys) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Reflect.ownKeys(value);
    return keys.length === expectedKeys.length
      && keys.every((key) => typeof key === "string" && expectedKeys.includes(key));
  }

  function wrapInteger(value, minimum, maximum) {
    const size = maximum - minimum + 1;
    return positiveModulo(value - minimum, size) + minimum;
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch, revision: state.revision + 1 });
  }

  function makeInitialState({ target, clues, recipientName, finalTitle, finalMessage, revision }) {
    return freezeState({
      phase: "intro",
      year: target.year,
      selectedMonth: 1,
      selectedDay: 1,
      selectedPhaseIndex: 0,
      target: { ...target },
      clues: [...clues],
      feedback: null,
      attempts: 0,
      revision,
      recipientName,
      finalTitle,
      finalMessage,
    });
  }

  function freezeState(value) {
    return deepFreeze({
      ...value,
      target: { ...value.target },
      clues: [...value.clues],
      feedback: value.feedback ? { ...value.feedback } : null,
    });
  }

  function deepFreeze(value) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  return deepFreeze({
    SYNODIC_MONTH_DAYS,
    REFERENCE_NEW_MOON_MS,
    PHASE_COUNT,
    MONTH_STEP_ANGLE,
    MOON_PHASE_STEP_ANGLE,
    MAX_POINTER_DELTA,
    PHASE_NAMES,
    DEFAULT_CONFIG,
    parseDate,
    isLeapYear,
    daysInMonth,
    positiveModulo,
    getMoonPhaseIndex,
    sanitizeConfig,
    createInitialState,
    start,
    adjustMonth,
    adjustDay,
    adjustMoonPhase,
    checkAlignment,
    restart,
    getViewModel,
    normalizeAngularDelta,
    stepsFromAngularTravel,
    isMoonPhaseState,
  });
});
