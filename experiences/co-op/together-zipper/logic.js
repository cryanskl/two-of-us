(function (root, factory) {
  "use strict";

  let fileConfig = root && root.TOGETHER_ZIPPER_CONFIG;
  if (typeof module === "object" && module.exports) {
    fileConfig = fileConfig || require("./config.js");
  }
  const api = factory(fileConfig);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TogetherZipperLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (FILE_CONFIG) {
  "use strict";

  const TICKS_PER_SECOND = 30;
  const MAX_STEP_TICKS = 5;
  const FEEDBACK_TICKS = 12;
  const SECTION_COUNT = 3;
  const TOTAL_TEETH = 15;
  const SEAT_LEFT = 0;
  const SEAT_RIGHT = 1;
  const PHASES = Object.freeze([
    "intro", "section-intro", "playing", "tooth-result", "jammed", "section-result", "complete",
  ]);
  const JAM_REASONS = Object.freeze([
    "early-left", "early-right", "apart", "missed-left", "missed-right", "missed-both",
  ]);
  const SECTION_KEYS = Object.freeze([
    "id", "title", "note", "toothCount", "targetTick", "timingRadius", "syncThreshold",
  ]);
  const STATE_KEYS = Object.freeze([
    "phase", "sectionIndex", "toothIndex", "beatTick", "pullTicks", "resultTick", "attempt",
    "lastResult", "completedTeeth", "revision",
  ]);
  const RESULT_KEYS = Object.freeze(["status", "reason", "leftPullTick", "rightPullTick", "gap"]);
  const COMPLETED_KEYS = Object.freeze([
    "sectionId", "toothId", "attempts", "leftPullTick", "rightPullTick", "gap",
  ]);
  const DEFAULT_SEATS = Object.freeze(["你", "我"]);
  const DEFAULT_COMPLETION_NOTE = "你和我，往后的日子，也把两边慢慢拉成我们。";

  function deepFreeze(value, seen) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    if (Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  const SECTIONS = deepFreeze([
    {
      id: "first-stitch",
      title: "起针·并肩",
      note: "先不用着急，让两边找到彼此。",
      toothCount: 4,
      targetTick: 42,
      timingRadius: 9,
      syncThreshold: 5,
    },
    {
      id: "through-rain",
      title: "穿雨·同拍",
      note: "雨声近一点，我们也近一点。",
      toothCount: 5,
      targetTick: 36,
      timingRadius: 8,
      syncThreshold: 4,
    },
    {
      id: "coming-home",
      title: "收尾·归心",
      note: "最后几齿，把两边稳稳带回家。",
      toothCount: 6,
      targetTick: 30,
      timingRadius: 7,
      syncThreshold: 3,
    },
  ]);

  const TOOTH_ROUTE = deepFreeze(SECTIONS.flatMap((section, sectionIndex) => (
    Array.from({ length: section.toothCount }, (_unused, toothIndex) => ({
      sectionIndex,
      toothIndex,
      sectionId: section.id,
      toothId: `${section.id}-tooth-${toothIndex + 1}`,
    }))
  )));

  function isPlainObject(value) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      return (prototype === Object.prototype || prototype === null)
        && Object.getOwnPropertySymbols(value).length === 0;
    } catch (_error) {
      return false;
    }
  }

  function exactDataObject(value, keys) {
    try {
      if (!isPlainObject(value)) return false;
      const ownKeys = Object.keys(value);
      if (ownKeys.length !== keys.length || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;
      return keys.every((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
      });
    } catch (_error) {
      return false;
    }
  }

  function safeRead(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function readEventProperty(eventLike, key) {
    try {
      return { ok: true, value: eventLike[key] };
    } catch (_error) {
      return { ok: false, value: undefined };
    }
  }

  function cloneFrozen(value) {
    if (Array.isArray(value)) return deepFreeze(value.map(cloneFrozen));
    if (isPlainObject(value)) {
      const result = {};
      Object.keys(value).forEach((key) => { result[key] = cloneFrozen(safeRead(value, key)); });
      return deepFreeze(result);
    }
    return value;
  }

  function sameData(left, right) {
    try {
      if (Object.is(left, right)) return true;
      if (typeof left !== typeof right || left === null || right === null || typeof left !== "object") return false;
      if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left) && Array.isArray(right) && left.length === right.length
          && left.every((item, index) => sameData(item, right[index]));
      }
      if (!isPlainObject(left) || !isPlainObject(right)) return false;
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      return leftKeys.length === rightKeys.length && leftKeys.every((key) => (
        Object.prototype.hasOwnProperty.call(right, key) && sameData(safeRead(left, key), safeRead(right, key))
      ));
    } catch (_error) {
      return false;
    }
  }

  function windowStart(section) {
    return section.targetTick - section.timingRadius;
  }

  function windowEnd(section) {
    return section.targetTick + section.timingRadius;
  }

  function validSection(section) {
    try {
      if (!exactDataObject(section, SECTION_KEYS)) return false;
      if (typeof section.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.id)) return false;
      if (typeof section.title !== "string" || !section.title || typeof section.note !== "string" || !section.note) return false;
      if (![section.toothCount, section.targetTick, section.timingRadius, section.syncThreshold].every(Number.isSafeInteger)) return false;
      return section.toothCount > 0 && section.targetTick > 0 && section.timingRadius > 0
        && section.syncThreshold >= 0 && section.syncThreshold <= section.timingRadius
        && windowStart(section) >= 0 && windowEnd(section) >= section.targetTick;
    } catch (_error) {
      return false;
    }
  }

  function validateSections(value) {
    try {
      if (!Array.isArray(value) || value.length !== SECTION_COUNT) return false;
      const ids = new Set();
      let toothTotal = 0;
      for (let index = 0; index < value.length; index += 1) {
        const section = value[index];
        if (!validSection(section) || ids.has(section.id) || !sameData(section, SECTIONS[index])) return false;
        ids.add(section.id);
        toothTotal += section.toothCount;
        if (!Number.isSafeInteger(toothTotal)) return false;
      }
      return toothTotal === TOTAL_TEETH;
    } catch (_error) {
      return false;
    }
  }

  function normalizeSections(value) {
    return validateSections(value) ? cloneFrozen(value) : cloneFrozen(SECTIONS);
  }

  function isKnownSection(section) {
    return validSection(section) && SECTIONS.some((expected) => sameData(section, expected));
  }

  function validPullTick(section, beatTick, value) {
    return value === null || (Number.isSafeInteger(value)
      && value >= windowStart(section) && value <= windowEnd(section) && value <= beatTick);
  }

  function pullResolution(status, leftPullTick, rightPullTick, gap) {
    return deepFreeze({ status, leftPullTick, rightPullTick, gap });
  }

  function resolvePulls(section, beatTick, leftPullTick, rightPullTick) {
    if (!isKnownSection(section) || !Number.isSafeInteger(beatTick) || beatTick < 0 || beatTick > windowEnd(section)
      || !validPullTick(section, beatTick, leftPullTick) || !validPullTick(section, beatTick, rightPullTick)) {
      return pullResolution("invalid", null, null, null);
    }
    if (leftPullTick === null || rightPullTick === null) {
      return pullResolution("waiting", leftPullTick, rightPullTick, null);
    }
    const gap = Math.abs(leftPullTick - rightPullTick);
    return pullResolution(gap <= section.syncThreshold ? "success" : "apart", leftPullTick, rightPullTick, gap);
  }

  function trimCodePoints(value, limit) {
    return [...value.trim()].slice(0, limit).join("");
  }

  function normalizeSeats(value) {
    try {
      if (!Array.isArray(value) || value.length !== 2) return [...DEFAULT_SEATS];
      const names = [];
      for (let index = 0; index < 2; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        const name = descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
        names.push(typeof name === "string" ? trimCodePoints(name, 12) : "");
      }
      if (names.some((name) => !name) || names[0] === names[1]) return [...DEFAULT_SEATS];
      return names;
    } catch (_error) {
      return [...DEFAULT_SEATS];
    }
  }

  function defaultComposer(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，往后的日子，也把两边慢慢拉成我们。`;
  }

  function normalizeConfig(raw) {
    const source = raw === undefined ? FILE_CONFIG : raw;
    const seats = isPlainObject(source) ? normalizeSeats(safeRead(source, "seats")) : [...DEFAULT_SEATS];
    const candidate = isPlainObject(source) ? safeRead(source, "composeCompletionNote") : undefined;
    const composeCompletionNote = typeof candidate === "function"
      ? function isolatedCompletionComposer(summary) { return candidate(summary); }
      : defaultComposer;
    return deepFreeze({ seats, composeCompletionNote });
  }

  const ACTIVE_CONFIG = normalizeConfig(FILE_CONFIG);
  const DEFAULT_CONFIG = normalizeConfig(null);

  function currentSection(state) {
    return SECTIONS[state.sectionIndex];
  }

  function routeIndex(sectionIndex, toothIndex) {
    let total = 0;
    for (let index = 0; index < sectionIndex; index += 1) total += SECTIONS[index].toothCount;
    return total + toothIndex;
  }

  function makeState(fields) {
    return deepFreeze({
      phase: fields.phase,
      sectionIndex: fields.sectionIndex,
      toothIndex: fields.toothIndex,
      beatTick: fields.beatTick,
      pullTicks: [fields.pullTicks[0], fields.pullTicks[1]],
      resultTick: fields.resultTick,
      attempt: fields.attempt,
      lastResult: fields.lastResult ? cloneFrozen(fields.lastResult) : null,
      completedTeeth: fields.completedTeeth.map(cloneFrozen),
      revision: fields.revision,
    });
  }

  function createInitialState() {
    return makeState({
      phase: "intro",
      sectionIndex: 0,
      toothIndex: 0,
      beatTick: 0,
      pullTicks: [null, null],
      resultTick: 0,
      attempt: 1,
      lastResult: null,
      completedTeeth: [],
      revision: 0,
    });
  }

  function validSuccessResult(section, result) {
    if (!exactDataObject(result, RESULT_KEYS) || result.status !== "success" || result.reason !== null) return false;
    const beatTick = Math.max(result.leftPullTick, result.rightPullTick);
    const resolved = resolvePulls(section, beatTick, result.leftPullTick, result.rightPullTick);
    return resolved.status === "success" && sameData(result, {
      status: "success",
      reason: null,
      leftPullTick: resolved.leftPullTick,
      rightPullTick: resolved.rightPullTick,
      gap: resolved.gap,
    });
  }

  function validJamResult(section, result) {
    if (!exactDataObject(result, RESULT_KEYS) || result.status !== "jammed" || !JAM_REASONS.includes(result.reason)) return false;
    if (result.reason === "early-left" || result.reason === "early-right" || result.reason === "missed-both") {
      return result.leftPullTick === null && result.rightPullTick === null && result.gap === null;
    }
    if (result.reason === "missed-left") {
      return result.leftPullTick === null && validPullTick(section, windowEnd(section), result.rightPullTick) && result.rightPullTick !== null && result.gap === null;
    }
    if (result.reason === "missed-right") {
      return result.rightPullTick === null && validPullTick(section, windowEnd(section), result.leftPullTick) && result.leftPullTick !== null && result.gap === null;
    }
    if (result.reason === "apart") {
      if (!Number.isSafeInteger(result.leftPullTick) || !Number.isSafeInteger(result.rightPullTick)) return false;
      const gap = Math.abs(result.leftPullTick - result.rightPullTick);
      return result.gap === gap && gap > section.syncThreshold
        && validPullTick(section, windowEnd(section), result.leftPullTick)
        && validPullTick(section, windowEnd(section), result.rightPullTick);
    }
    return false;
  }

  function validCompletedTeeth(items) {
    if (!Array.isArray(items) || items.length > TOTAL_TEETH) return false;
    let attemptTotal = 0;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const expected = TOOTH_ROUTE[index];
      const section = SECTIONS[expected.sectionIndex];
      if (!exactDataObject(item, COMPLETED_KEYS)
        || item.sectionId !== expected.sectionId || item.toothId !== expected.toothId
        || !Number.isSafeInteger(item.attempts) || item.attempts < 1) return false;
      const result = {
        status: "success", reason: null,
        leftPullTick: item.leftPullTick, rightPullTick: item.rightPullTick, gap: item.gap,
      };
      if (!validSuccessResult(section, result)) return false;
      attemptTotal += item.attempts;
      if (!Number.isSafeInteger(attemptTotal)) return false;
    }
    return true;
  }

  function validPullTicksForState(state, section) {
    if (!Array.isArray(state.pullTicks) || state.pullTicks.length !== 2) return false;
    const left = safeRead(state.pullTicks, "0");
    const right = safeRead(state.pullTicks, "1");
    if (state.phase !== "playing") return left === null && right === null;
    if (!validPullTick(section, state.beatTick, left) || !validPullTick(section, state.beatTick, right)) return false;
    return left === null || right === null;
  }

  function lastSuccessMatchesRecord(result, record, section) {
    return record && validSuccessResult(section, result)
      && result.leftPullTick === record.leftPullTick
      && result.rightPullTick === record.rightPullTick
      && result.gap === record.gap;
  }

  function isTogetherZipperState(value) {
    try {
      if (!exactDataObject(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
      if (!Number.isSafeInteger(value.sectionIndex) || value.sectionIndex < 0 || value.sectionIndex >= SECTION_COUNT
        || !Number.isSafeInteger(value.toothIndex) || value.toothIndex < 0 || value.toothIndex >= SECTIONS[value.sectionIndex].toothCount
        || !Number.isSafeInteger(value.beatTick) || value.beatTick < 0
        || !Number.isSafeInteger(value.resultTick) || value.resultTick < 0
        || !Number.isSafeInteger(value.attempt) || value.attempt < 1
        || !Number.isSafeInteger(value.revision) || value.revision < 0
        || !validCompletedTeeth(value.completedTeeth)) return false;
      const section = SECTIONS[value.sectionIndex];
      const ordinal = routeIndex(value.sectionIndex, value.toothIndex);
      if (!validPullTicksForState(value, section)) return false;

      if (value.phase === "intro") return value.sectionIndex === 0 && value.toothIndex === 0
        && value.beatTick === 0 && value.resultTick === 0 && value.attempt === 1
        && value.lastResult === null && value.completedTeeth.length === 0 && value.revision === 0;
      if (value.phase === "section-intro") return value.toothIndex === 0 && value.beatTick === 0
        && value.resultTick === 0 && value.attempt === 1 && value.lastResult === null
        && value.completedTeeth.length === ordinal;
      if (value.phase === "playing") return value.beatTick <= windowEnd(section) && value.resultTick === 0
        && value.lastResult === null && value.completedTeeth.length === ordinal;
      if (value.phase === "jammed") return value.beatTick === 0 && value.resultTick < FEEDBACK_TICKS
        && validJamResult(section, value.lastResult) && value.completedTeeth.length === ordinal;
      if (value.phase === "tooth-result") {
        const record = value.completedTeeth[ordinal];
        return value.beatTick === 0 && value.resultTick < FEEDBACK_TICKS
          && value.completedTeeth.length === ordinal + 1 && record.attempts === value.attempt
          && lastSuccessMatchesRecord(value.lastResult, record, section);
      }
      const sectionEnd = ordinal + 1;
      const finalRecord = value.completedTeeth[sectionEnd - 1];
      if (value.phase === "section-result") return value.toothIndex === section.toothCount - 1
        && value.beatTick === 0 && value.resultTick === 0 && value.completedTeeth.length === sectionEnd
        && finalRecord.attempts === value.attempt && lastSuccessMatchesRecord(value.lastResult, finalRecord, section);
      const lastRecord = value.completedTeeth[TOTAL_TEETH - 1];
      return value.phase === "complete" && value.sectionIndex === SECTION_COUNT - 1
        && value.toothIndex === section.toothCount - 1 && value.beatTick === 0 && value.resultTick === 0
        && value.completedTeeth.length === TOTAL_TEETH && lastRecord.attempts === value.attempt
        && lastSuccessMatchesRecord(value.lastResult, lastRecord, section);
    } catch (_error) {
      return false;
    }
  }

  const ACTION_KEYS = deepFreeze({
    START: ["type"],
    BEGIN_SECTION: ["type"],
    PULL: ["type", "seat"],
    STEP: ["type", "ticks"],
    NEXT_SECTION: ["type"],
    RESTART: ["type"],
  });

  function validAction(action) {
    try {
      if (!isPlainObject(action) || Object.getPrototypeOf(action) !== Object.prototype) return false;
      const type = safeRead(action, "type");
      const keys = ACTION_KEYS[type];
      if (!keys || !exactDataObject(action, keys)) return false;
      if (type === "PULL") return action.seat === SEAT_LEFT || action.seat === SEAT_RIGHT;
      if (type === "STEP") return Number.isSafeInteger(action.ticks) && action.ticks >= 1 && action.ticks <= MAX_STEP_TICKS;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function changed(state, patch) {
    if (!Number.isSafeInteger(state.revision + 1)) return state;
    const next = makeState({ ...state, ...patch, revision: state.revision + 1 });
    return isTogetherZipperState(next) ? next : state;
  }

  function successResult(leftPullTick, rightPullTick) {
    return deepFreeze({
      status: "success",
      reason: null,
      leftPullTick,
      rightPullTick,
      gap: Math.abs(leftPullTick - rightPullTick),
    });
  }

  function jamResult(reason, leftPullTick, rightPullTick, gap) {
    return deepFreeze({ status: "jammed", reason, leftPullTick, rightPullTick, gap });
  }

  function enterJam(state, result) {
    return changed(state, {
      phase: "jammed",
      beatTick: 0,
      pullTicks: [null, null],
      resultTick: 0,
      lastResult: result,
    });
  }

  function pull(state, seat) {
    if (state.phase !== "playing") return state;
    const section = currentSection(state);
    if (state.beatTick < windowStart(section)) {
      return enterJam(state, jamResult(seat === SEAT_LEFT ? "early-left" : "early-right", null, null, null));
    }
    if (state.pullTicks[seat] !== null) return state;
    const pullTicks = [state.pullTicks[0], state.pullTicks[1]];
    pullTicks[seat] = state.beatTick;
    if (pullTicks[SEAT_LEFT] === null || pullTicks[SEAT_RIGHT] === null) return changed(state, { pullTicks });
    const resolution = resolvePulls(section, state.beatTick, pullTicks[SEAT_LEFT], pullTicks[SEAT_RIGHT]);
    if (resolution.status === "apart") {
      return enterJam(state, jamResult("apart", resolution.leftPullTick, resolution.rightPullTick, resolution.gap));
    }
    if (resolution.status !== "success") return state;
    const result = successResult(resolution.leftPullTick, resolution.rightPullTick);
    const route = TOOTH_ROUTE[routeIndex(state.sectionIndex, state.toothIndex)];
    const completedTeeth = [...state.completedTeeth, {
      sectionId: route.sectionId,
      toothId: route.toothId,
      attempts: state.attempt,
      leftPullTick: result.leftPullTick,
      rightPullTick: result.rightPullTick,
      gap: result.gap,
    }];
    return changed(state, {
      phase: "tooth-result",
      beatTick: 0,
      pullTicks: [null, null],
      resultTick: 0,
      lastResult: result,
      completedTeeth,
    });
  }

  function missedResult(state) {
    const left = state.pullTicks[SEAT_LEFT];
    const right = state.pullTicks[SEAT_RIGHT];
    const reason = left === null && right === null
      ? "missed-both"
      : left === null ? "missed-left" : "missed-right";
    return jamResult(reason, left, right, null);
  }

  function finishFeedback(state) {
    if (state.phase === "jammed") {
      if (!Number.isSafeInteger(state.attempt + 1)) return state;
      return changed(state, {
        phase: "playing",
        beatTick: 0,
        pullTicks: [null, null],
        resultTick: 0,
        attempt: state.attempt + 1,
        lastResult: null,
      });
    }
    const section = currentSection(state);
    if (state.toothIndex === section.toothCount - 1) {
      return changed(state, { phase: "section-result", resultTick: 0 });
    }
    return changed(state, {
      phase: "playing",
      toothIndex: state.toothIndex + 1,
      beatTick: 0,
      pullTicks: [null, null],
      resultTick: 0,
      attempt: 1,
      lastResult: null,
    });
  }

  function stepState(state, ticks) {
    if (state.phase === "playing") {
      const end = windowEnd(currentSection(state));
      let beatTick = state.beatTick;
      for (let count = 0; count < ticks; count += 1) {
        if (beatTick === end) return enterJam(state, missedResult(state));
        beatTick += 1;
      }
      return changed(state, { beatTick });
    }
    if (state.phase === "tooth-result" || state.phase === "jammed") {
      let resultTick = state.resultTick;
      for (let count = 0; count < ticks; count += 1) {
        if (resultTick === FEEDBACK_TICKS - 1) return finishFeedback(state);
        resultTick += 1;
      }
      return changed(state, { resultTick });
    }
    return state;
  }

  function reduceTogetherZipper(state, action) {
    const current = isTogetherZipperState(state) ? state : createInitialState();
    if (!isTogetherZipperState(state)) return current;
    if (!validAction(action)) return current;
    if (action.type === "RESTART") {
      if (current.phase === "intro" || !Number.isSafeInteger(current.revision + 1)) return current;
      return createInitialState();
    }
    if (action.type === "START") {
      return current.phase === "intro" ? changed(current, { phase: "section-intro" }) : current;
    }
    if (action.type === "BEGIN_SECTION") {
      return current.phase === "section-intro" ? changed(current, {
        phase: "playing", beatTick: 0, pullTicks: [null, null], resultTick: 0, attempt: 1, lastResult: null,
      }) : current;
    }
    if (action.type === "PULL") return pull(current, action.seat);
    if (action.type === "STEP") return stepState(current, action.ticks);
    if (action.type === "NEXT_SECTION") {
      if (current.phase !== "section-result") return current;
      if (current.sectionIndex === SECTION_COUNT - 1) return changed(current, { phase: "complete" });
      return changed(current, {
        phase: "section-intro",
        sectionIndex: current.sectionIndex + 1,
        toothIndex: 0,
        beatTick: 0,
        pullTicks: [null, null],
        resultTick: 0,
        attempt: 1,
        lastResult: null,
      });
    }
    return current;
  }

  function replayTogetherZipper(actions, initialState) {
    let state = isTogetherZipperState(initialState) ? makeState(initialState) : createInitialState();
    if (!Array.isArray(actions)) return state;
    for (const action of actions) state = reduceTogetherZipper(state, action);
    return state;
  }

  function classifyPullKey(eventLike) {
    if (!eventLike || (typeof eventLike !== "object" && typeof eventLike !== "function")) return null;
    const repeat = readEventProperty(eventLike, "repeat");
    const code = readEventProperty(eventLike, "code");
    if (!repeat.ok || !code.ok || repeat.value === true) return null;
    if (code.value === "KeyF") return deepFreeze({ type: "PULL", seat: SEAT_LEFT });
    if (code.value === "KeyJ") return deepFreeze({ type: "PULL", seat: SEAT_RIGHT });
    return null;
  }

  function completedSectionSummaries(completedTeeth) {
    const summaries = [];
    let offset = 0;
    for (const section of SECTIONS) {
      const teeth = completedTeeth.slice(offset, offset + section.toothCount);
      if (teeth.length !== section.toothCount) break;
      const attempts = teeth.reduce((total, tooth) => total + tooth.attempts, 0);
      summaries.push({
        id: section.id,
        title: section.title,
        teeth: section.toothCount,
        attempts,
        jams: attempts - section.toothCount,
      });
      offset += section.toothCount;
    }
    return deepFreeze(summaries);
  }

  function completionSummary(state, config) {
    if (!isTogetherZipperState(state) || state.phase !== "complete") return null;
    const clean = normalizeConfig(config);
    const sections = completedSectionSummaries(state.completedTeeth);
    const totalAttempts = sections.reduce((total, section) => total + section.attempts, 0);
    return deepFreeze({
      seats: [...clean.seats],
      totalTeeth: TOTAL_TEETH,
      totalAttempts,
      jams: totalAttempts - TOTAL_TEETH,
      sections: sections.map(cloneFrozen),
    });
  }

  function isCompletionSummary(summary) {
    try {
      if (!exactDataObject(summary, ["seats", "totalTeeth", "totalAttempts", "jams", "sections"])) return false;
      const seats = normalizeSeats(summary.seats);
      if (!sameData(seats, summary.seats) || summary.totalTeeth !== TOTAL_TEETH
        || !Number.isSafeInteger(summary.totalAttempts) || summary.totalAttempts < TOTAL_TEETH
        || summary.jams !== summary.totalAttempts - TOTAL_TEETH
        || !Array.isArray(summary.sections) || summary.sections.length !== SECTION_COUNT) return false;
      return summary.sections.every((section, index) => {
        const expected = SECTIONS[index];
        return exactDataObject(section, ["id", "title", "teeth", "attempts", "jams"])
          && section.id === expected.id && section.title === expected.title && section.teeth === expected.toothCount
          && Number.isSafeInteger(section.attempts) && section.attempts >= section.teeth
          && section.jams === section.attempts - section.teeth;
      }) && summary.sections.reduce((total, section) => total + section.attempts, 0) === summary.totalAttempts;
    } catch (_error) {
      return false;
    }
  }

  function mutationTrackingClone(summary) {
    let mutated = false;
    const wrap = (value) => {
      if (!value || typeof value !== "object") return value;
      const target = Array.isArray(value)
        ? value.map(wrap)
        : Object.fromEntries(Object.keys(value).map((key) => [key, wrap(safeRead(value, key))]));
      deepFreeze(target);
      return new Proxy(target, {
        set() { mutated = true; return false; },
        deleteProperty() { mutated = true; return false; },
        defineProperty() { mutated = true; return false; },
        setPrototypeOf() { mutated = true; return false; },
      });
    };
    return { value: wrap(cloneFrozen(summary)), wasMutated: () => mutated };
  }

  function resolveCompletionNote(composer, summary) {
    if (!isCompletionSummary(summary)) return DEFAULT_COMPLETION_NOTE;
    const fallback = defaultComposer(summary);
    if (typeof composer !== "function") return fallback;
    const tracked = mutationTrackingClone(summary);
    try {
      const result = composer(tracked.value);
      if (tracked.wasMutated() || typeof result !== "string") return fallback;
      const clean = result.trim();
      return clean && [...clean].length <= 120 ? clean : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function announcementCode(state) {
    if (state.phase === "playing") {
      if (state.pullTicks[SEAT_LEFT] !== null) return "left-ready";
      if (state.pullTicks[SEAT_RIGHT] !== null) return "right-ready";
      return state.beatTick >= windowStart(currentSection(state)) ? "window-open" : "playing";
    }
    if (state.phase === "tooth-result") return "tooth-success";
    if (state.phase === "jammed") return `jam-${state.lastResult.reason}`;
    if (state.phase === "section-result") return "section-complete";
    if (state.phase === "complete") return "complete";
    return state.phase;
  }

  function getPublicView(state) {
    if (!isTogetherZipperState(state)) return null;
    const section = currentSection(state);
    const playing = state.phase === "playing";
    const feedback = state.phase === "tooth-result" || state.phase === "jammed";
    const start = windowStart(section);
    const end = windowEnd(section);
    const completedSections = completedSectionSummaries(state.completedTeeth);
    const totalAttempts = state.completedTeeth.reduce((total, tooth) => total + tooth.attempts, 0);
    return deepFreeze({
      phase: state.phase,
      section: {
        index: state.sectionIndex,
        total: SECTION_COUNT,
        id: section.id,
        title: section.title,
        note: section.note,
        toothCount: section.toothCount,
      },
      tooth: {
        index: state.toothIndex,
        number: state.toothIndex + 1,
        totalInSection: section.toothCount,
        completedTotal: state.completedTeeth.length,
        total: TOTAL_TEETH,
      },
      timing: {
        beatTick: playing ? state.beatTick : 0,
        targetTick: section.targetTick,
        windowStart: start,
        windowEnd: end,
        syncThreshold: section.syncThreshold,
        trackEndTick: end,
        progressPermille: playing ? Math.max(0, Math.min(1000, Math.floor(state.beatTick * 1000 / end))) : 0,
        isWindowOpen: playing && state.beatTick >= start && state.beatTick <= end,
      },
      pulls: {
        left: playing && state.pullTicks[SEAT_LEFT] !== null ? "ready" : "waiting",
        right: playing && state.pullTicks[SEAT_RIGHT] !== null ? "ready" : "waiting",
        leftTick: playing ? state.pullTicks[SEAT_LEFT] : null,
        rightTick: playing ? state.pullTicks[SEAT_RIGHT] : null,
      },
      attempt: state.attempt,
      resultTick: feedback ? state.resultTick : 0,
      feedbackProgressPermille: feedback ? Math.floor(state.resultTick * 1000 / FEEDBACK_TICKS) : 0,
      lastResult: state.lastResult ? cloneFrozen(state.lastResult) : null,
      completedSections: completedSections.map(cloneFrozen),
      totalAttempts,
      jams: totalAttempts - state.completedTeeth.length,
      controls: {
        canStart: state.phase === "intro",
        canBeginSection: state.phase === "section-intro",
        canPull: state.phase === "playing",
        canNextSection: state.phase === "section-result",
        canRestart: state.phase !== "intro",
      },
      announcementCode: announcementCode(state),
    });
  }

  return deepFreeze({
    TICKS_PER_SECOND,
    MAX_STEP_TICKS,
    FEEDBACK_TICKS,
    SECTION_COUNT,
    TOTAL_TEETH,
    SEAT_LEFT,
    SEAT_RIGHT,
    PHASES,
    JAM_REASONS,
    SECTIONS,
    TOOTH_ROUTE,
    DEFAULT_SEATS,
    DEFAULT_COMPLETION_NOTE,
    DEFAULT_CONFIG,
    ACTIVE_CONFIG,
    deepFreeze,
    validateSections,
    normalizeSections,
    resolvePulls,
    normalizeConfig,
    createInitialState,
    isTogetherZipperState,
    validAction,
    reduceTogetherZipper,
    reduce: reduceTogetherZipper,
    replayTogetherZipper,
    replay: replayTogetherZipper,
    classifyPullKey,
    completionSummary,
    resolveCompletionNote,
    getPublicView,
  });
});
