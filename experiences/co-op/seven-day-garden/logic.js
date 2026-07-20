(function (root, factory) {
  "use strict";

  let fileConfig = root && root.SEVEN_DAY_GARDEN_CONFIG;
  if (typeof module === "object" && module.exports) {
    fileConfig = fileConfig || require("./config.js");
  }
  const api = factory(fileConfig);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SevenDayGardenLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (FILE_CONFIG) {
  "use strict";

  const DAY_COUNT = 7;
  const SEAT_A = 0;
  const SEAT_B = 1;
  const RESOURCE_WATER = "water";
  const RESOURCE_SUN = "sun";
  const RESOURCE_PRUNE = "prune";
  const RESOURCES = Object.freeze([RESOURCE_WATER, RESOURCE_SUN, RESOURCE_PRUNE]);
  const PHASES = Object.freeze([
    "intro", "day-intro", "first-pick", "handoff", "second-pick", "day-result", "jammed", "complete",
  ]);
  const STATE_KEYS = Object.freeze([
    "phase", "dayIndex", "inventories", "commitments", "attempt", "lastResult", "completedDays", "revision",
  ]);
  const INVENTORY_KEYS = Object.freeze([RESOURCE_WATER, RESOURCE_SUN, RESOURCE_PRUNE]);
  const RESULT_KEYS = Object.freeze([
    "status", "dayId", "commitments", "requiredPair", "nextInventories", "suffixSolutions",
  ]);
  const COMPLETED_DAY_KEYS = Object.freeze(["dayId", "leftResource", "rightResource", "attempts"]);
  const DEFAULT_SEATS = Object.freeze(["你", "我"]);
  const DEFAULT_COMPLETION_NOTE = "你和我，把七天的水、光和修剪，慢慢养成了同一朵花。";

  function deepFreeze(value, seen) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    }
    return Object.freeze(value);
  }

  const DAYS = deepFreeze([
    { id: "wake-soil", title: "醒土", resources: [RESOURCE_WATER, RESOURCE_SUN], note: "一边润土，一边迎光" },
    { id: "support-sprout", title: "扶芽", resources: [RESOURCE_WATER, RESOURCE_PRUNE], note: "给新芽水，也给它留出形状" },
    { id: "open-leaves", title: "展叶", resources: [RESOURCE_SUN, RESOURCE_SUN], note: "两份光让叶面舒展" },
    { id: "shape-branch", title: "定枝", resources: [RESOURCE_SUN, RESOURCE_PRUNE], note: "光照与修剪共同定下方向" },
    { id: "hold-rain", title: "蓄水", resources: [RESOURCE_WATER, RESOURCE_WATER], note: "两边一起为花期储水" },
    { id: "shape-crown", title: "整冠", resources: [RESOURCE_PRUNE, RESOURCE_PRUNE], note: "两次修剪完成花冠轮廓" },
    { id: "bloom-together", title: "开花", resources: [RESOURCE_WATER, RESOURCE_SUN], note: "最后一份水与光让花开放" },
  ]);

  const INITIAL_INVENTORIES = deepFreeze([
    { water: 3, sun: 1, prune: 3 },
    { water: 2, sun: 4, prune: 1 },
  ]);

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
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return false;
      return keys.every((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
      });
    } catch (_error) {
      return false;
    }
  }

  function exactDataArray(value, length) {
    try {
      if (!Array.isArray(value) || value.length !== length) return false;
      const expectedKeys = Array.from({ length }, (_item, index) => String(index));
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== length + 1 || !ownKeys.includes("length")) return false;
      return expectedKeys.every((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
      }) && ownKeys.every((key) => key === "length" || expectedKeys.includes(key));
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

  function cloneFrozen(value) {
    if (Array.isArray(value)) return deepFreeze(value.map(cloneFrozen));
    if (isPlainObject(value)) {
      const result = {};
      for (const key of Object.keys(value)) result[key] = cloneFrozen(value[key]);
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
      const leftKeys = Reflect.ownKeys(left);
      const rightKeys = Reflect.ownKeys(right);
      return leftKeys.length === rightKeys.length && leftKeys.every((key) => (
        typeof key === "string" && Object.prototype.hasOwnProperty.call(right, key) && sameData(left[key], right[key])
      ));
    } catch (_error) {
      return false;
    }
  }

  function isResource(value) {
    return RESOURCES.includes(value);
  }

  function validInventory(value) {
    return exactDataObject(value, INVENTORY_KEYS) && INVENTORY_KEYS.every((resource) => (
      Number.isSafeInteger(value[resource]) && value[resource] >= 0 && value[resource] <= DAY_COUNT
    ));
  }

  function validInventories(value) {
    return exactDataArray(value, 2) && value[0] !== value[1]
      && validInventory(value[0]) && validInventory(value[1]);
  }

  function copyInventories(inventories) {
    return [
      { water: inventories[0].water, sun: inventories[0].sun, prune: inventories[0].prune },
      { water: inventories[1].water, sun: inventories[1].sun, prune: inventories[1].prune },
    ];
  }

  function pairKey(pair) {
    return [...pair].sort().join("|");
  }

  function countSuffix(dayIndex, inventories) {
    try {
      if (!Number.isSafeInteger(dayIndex) || dayIndex < 0 || dayIndex > DAY_COUNT || !validInventories(inventories)) return null;
      const start = copyInventories(inventories);
      const memo = new Map();
      const visit = (index, remaining) => {
        const key = `${index}|${remaining[0].water},${remaining[0].sun},${remaining[0].prune}|${remaining[1].water},${remaining[1].sun},${remaining[1].prune}`;
        if (memo.has(key)) return memo.get(key);
        if (index === DAY_COUNT) {
          const result = remaining.every((inventory) => INVENTORY_KEYS.every((resource) => inventory[resource] === 0)) ? 1 : 0;
          memo.set(key, result);
          return result;
        }
        let total = 0;
        const required = pairKey(DAYS[index].resources);
        for (const leftResource of RESOURCES) {
          if (remaining[SEAT_A][leftResource] < 1) continue;
          for (const rightResource of RESOURCES) {
            if (remaining[SEAT_B][rightResource] < 1 || pairKey([leftResource, rightResource]) !== required) continue;
            const next = copyInventories(remaining);
            next[SEAT_A][leftResource] -= 1;
            next[SEAT_B][rightResource] -= 1;
            total += visit(index + 1, next);
          }
        }
        memo.set(key, total);
        return total;
      };
      return visit(dayIndex, start);
    } catch (_error) {
      return null;
    }
  }

  function invalidEvaluation() {
    return deepFreeze({
      status: "invalid",
      dayId: null,
      commitments: [null, null],
      requiredPair: null,
      nextInventories: null,
      suffixSolutions: null,
    });
  }

  function validCommitmentPair(value) {
    return exactDataArray(value, 2) && isResource(value[0]) && isResource(value[1]);
  }

  function evaluateDay(dayIndex, inventories, commitments) {
    try {
      if (!Number.isSafeInteger(dayIndex) || dayIndex < 0 || dayIndex >= DAY_COUNT
        || !validInventories(inventories) || !validCommitmentPair(commitments)) return invalidEvaluation();
      if (inventories[SEAT_A][commitments[SEAT_A]] < 1 || inventories[SEAT_B][commitments[SEAT_B]] < 1) {
        return invalidEvaluation();
      }
      const base = {
        dayId: DAYS[dayIndex].id,
        commitments: [...commitments],
        requiredPair: [...DAYS[dayIndex].resources],
      };
      if (pairKey(commitments) !== pairKey(DAYS[dayIndex].resources)) {
        return deepFreeze({ status: "pair-mismatch", ...base, nextInventories: null, suffixSolutions: null });
      }
      const nextInventories = copyInventories(inventories);
      nextInventories[SEAT_A][commitments[SEAT_A]] -= 1;
      nextInventories[SEAT_B][commitments[SEAT_B]] -= 1;
      const suffixSolutions = countSuffix(dayIndex + 1, nextInventories);
      if (suffixSolutions === 0) {
        return deepFreeze({ status: "future-stranded", ...base, nextInventories: null, suffixSolutions });
      }
      if (!Number.isSafeInteger(suffixSolutions) || suffixSolutions < 1) return invalidEvaluation();
      return deepFreeze({
        status: "accepted",
        ...base,
        nextInventories: copyInventories(nextInventories),
        suffixSolutions,
      });
    } catch (_error) {
      return invalidEvaluation();
    }
  }

  function trimCodePoints(value, limit) {
    return [...value.trim()].slice(0, limit).join("");
  }

  function normalizeSeats(value) {
    try {
      if (!exactDataArray(value, 2)) return [...DEFAULT_SEATS];
      const names = value.map((name) => typeof name === "string" ? trimCodePoints(name, 12) : "");
      if (names.some((name) => !name) || names[0] === names[1]) return [...DEFAULT_SEATS];
      return names;
    } catch (_error) {
      return [...DEFAULT_SEATS];
    }
  }

  function defaultComposer(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，把七天的水、光和修剪，慢慢养成了同一朵花。`;
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

  function firstSeat(dayIndex) {
    return Number.isSafeInteger(dayIndex) && dayIndex >= 0 && dayIndex < DAY_COUNT ? dayIndex % 2 : null;
  }

  function makeState(fields) {
    return deepFreeze({
      phase: fields.phase,
      dayIndex: fields.dayIndex,
      inventories: copyInventories(fields.inventories),
      commitments: [...fields.commitments],
      attempt: fields.attempt,
      lastResult: fields.lastResult ? cloneFrozen(fields.lastResult) : null,
      completedDays: fields.completedDays.map(cloneFrozen),
      revision: fields.revision,
    });
  }

  function createInitialState() {
    return makeState({
      phase: "intro",
      dayIndex: 0,
      inventories: INITIAL_INVENTORIES,
      commitments: [null, null],
      attempt: 1,
      lastResult: null,
      completedDays: [],
      revision: 0,
    });
  }

  function validStateCommitments(value) {
    return exactDataArray(value, 2) && value.every((resource) => resource === null || isResource(resource));
  }

  function validCompletedDay(value, index) {
    return exactDataObject(value, COMPLETED_DAY_KEYS)
      && value.dayId === DAYS[index].id
      && isResource(value.leftResource)
      && isResource(value.rightResource)
      && Number.isSafeInteger(value.attempts)
      && value.attempts >= 1;
  }

  function rebuildPrefix(items) {
    try {
      if (!Array.isArray(items) || items.length > DAY_COUNT) return null;
      let inventories = copyInventories(INITIAL_INVENTORIES);
      let attempts = 0;
      for (let index = 0; index < items.length; index += 1) {
        if (!validCompletedDay(items[index], index)) return null;
        attempts += items[index].attempts;
        if (!Number.isSafeInteger(attempts)) return null;
        const result = evaluateDay(index, inventories, [items[index].leftResource, items[index].rightResource]);
        if (result.status !== "accepted") return null;
        inventories = copyInventories(result.nextInventories);
      }
      return { inventories, attempts };
    } catch (_error) {
      return null;
    }
  }

  function validResultShape(value) {
    if (!exactDataObject(value, RESULT_KEYS)) return false;
    if (!["accepted", "pair-mismatch", "future-stranded"].includes(value.status)) return false;
    if (typeof value.dayId !== "string" || !validCommitmentPair(value.commitments)
      || !exactDataArray(value.requiredPair, 2) || !value.requiredPair.every(isResource)) return false;
    if (value.status === "accepted") {
      return validInventories(value.nextInventories)
        && Number.isSafeInteger(value.suffixSolutions) && value.suffixSolutions >= 1;
    }
    if (value.nextInventories !== null) return false;
    return value.status === "pair-mismatch"
      ? value.suffixSolutions === null
      : value.suffixSolutions === 0;
  }

  function isSevenDayGardenState(value) {
    try {
      if (!exactDataObject(value, STATE_KEYS) || !PHASES.includes(value.phase)
        || !Number.isSafeInteger(value.dayIndex) || value.dayIndex < 0 || value.dayIndex >= DAY_COUNT
        || !validInventories(value.inventories) || !validStateCommitments(value.commitments)
        || !Number.isSafeInteger(value.attempt) || value.attempt < 1
        || !Number.isSafeInteger(value.revision) || value.revision < 0
        || !Array.isArray(value.completedDays) || value.completedDays.length > DAY_COUNT
        || !exactDataArray(value.completedDays, value.completedDays.length)) return false;
      const prefix = rebuildPrefix(value.completedDays);
      if (!prefix || !sameData(prefix.inventories, value.inventories)) return false;
      const first = firstSeat(value.dayIndex);
      const second = first === SEAT_A ? SEAT_B : SEAT_A;
      const empty = value.commitments[0] === null && value.commitments[1] === null;
      const firstOnly = isResource(value.commitments[first]) && value.commitments[second] === null;
      const both = isResource(value.commitments[0]) && isResource(value.commitments[1]);
      if (value.phase === "intro") {
        return value.dayIndex === 0 && sameData(value.inventories, INITIAL_INVENTORIES) && empty
          && value.attempt === 1 && value.lastResult === null && value.completedDays.length === 0 && value.revision === 0;
      }
      if (value.phase === "complete") {
        if (value.dayIndex !== DAY_COUNT - 1 || value.completedDays.length !== DAY_COUNT || !both
          || !validResultShape(value.lastResult) || value.lastResult.status !== "accepted"
          || value.completedDays[DAY_COUNT - 1].attempts !== value.attempt
          || !INVENTORY_KEYS.every((resource) => value.inventories.every((inventory) => inventory[resource] === 0))) return false;
        const before = rebuildPrefix(value.completedDays.slice(0, -1));
        return before !== null && sameData(value.lastResult, evaluateDay(value.dayIndex, before.inventories, value.commitments));
      }
      if (value.phase === "day-result") {
        if (value.completedDays.length !== value.dayIndex + 1 || !both || !validResultShape(value.lastResult)
          || value.lastResult.status !== "accepted" || value.completedDays[value.dayIndex].attempts !== value.attempt) return false;
        const before = rebuildPrefix(value.completedDays.slice(0, -1));
        return before !== null && sameData(value.lastResult, evaluateDay(value.dayIndex, before.inventories, value.commitments));
      }
      if (value.completedDays.length !== value.dayIndex) return false;
      if (value.phase === "jammed") {
        if (!both || !validResultShape(value.lastResult)
          || !["pair-mismatch", "future-stranded"].includes(value.lastResult.status)) return false;
        return sameData(value.lastResult, evaluateDay(value.dayIndex, value.inventories, value.commitments));
      }
      if (value.lastResult !== null) return false;
      if (value.phase === "handoff" || value.phase === "second-pick") return firstOnly;
      if (value.phase === "day-intro") return empty && value.attempt === 1;
      if (value.phase === "first-pick") return empty;
      return false;
    } catch (_error) {
      return false;
    }
  }

  const ACTION_KEYS = deepFreeze({
    START: ["type"],
    BEGIN_DAY: ["type"],
    PICK: ["type", "seat", "resource"],
    HANDOFF_READY: ["type"],
    RETRY_DAY: ["type"],
    NEXT_DAY: ["type"],
    RESTART: ["type"],
  });

  function normalizeAction(action) {
    if (!isPlainObject(action)) return null;
    const type = safeRead(action, "type");
    const keys = ACTION_KEYS[type];
    if (!keys || !exactDataObject(action, keys)) return null;
    const normalized = {};
    for (const key of keys) normalized[key] = safeRead(action, key);
    if (type === "PICK" && !((normalized.seat === SEAT_A || normalized.seat === SEAT_B)
      && isResource(normalized.resource))) return null;
    return normalized;
  }

  function validAction(action) {
    return normalizeAction(action) !== null;
  }

  function changed(state, patch) {
    if (!Number.isSafeInteger(state.revision + 1)) return state;
    const next = makeState({ ...state, ...patch, revision: state.revision + 1 });
    return isSevenDayGardenState(next) ? next : state;
  }

  function reduceSevenDayGarden(state, action) {
    const validState = isSevenDayGardenState(state);
    const current = validState ? state : createInitialState();
    if (!validState) return current;
    const cleanAction = normalizeAction(action);
    if (!cleanAction) return current;
    if (cleanAction.type === "RESTART") {
      if (current.phase === "intro" || !Number.isSafeInteger(current.revision + 1)) return current;
      return createInitialState();
    }
    if (cleanAction.type === "START") {
      return current.phase === "intro" ? changed(current, { phase: "day-intro" }) : current;
    }
    if (cleanAction.type === "BEGIN_DAY") {
      return current.phase === "day-intro"
        ? changed(current, { phase: "first-pick", commitments: [null, null], lastResult: null })
        : current;
    }
    if (cleanAction.type === "PICK") return pickResource(current, cleanAction.seat, cleanAction.resource);
    if (cleanAction.type === "HANDOFF_READY") {
      return current.phase === "handoff" ? changed(current, { phase: "second-pick" }) : current;
    }
    if (cleanAction.type === "RETRY_DAY") {
      if (current.phase !== "jammed" || !Number.isSafeInteger(current.attempt + 1)) return current;
      return changed(current, {
        phase: "first-pick", commitments: [null, null], attempt: current.attempt + 1, lastResult: null,
      });
    }
    if (cleanAction.type === "NEXT_DAY") {
      if (current.phase !== "day-result") return current;
      if (current.dayIndex === DAY_COUNT - 1) return changed(current, { phase: "complete" });
      return changed(current, {
        phase: "day-intro", dayIndex: current.dayIndex + 1, commitments: [null, null], attempt: 1, lastResult: null,
      });
    }
    return current;
  }

  function pickResource(state, seat, resource) {
    if (state.phase !== "first-pick" && state.phase !== "second-pick") return state;
    const first = firstSeat(state.dayIndex);
    const expectedSeat = state.phase === "first-pick" ? first : (first === SEAT_A ? SEAT_B : SEAT_A);
    if (seat !== expectedSeat || state.commitments[seat] !== null || state.inventories[seat][resource] < 1) return state;
    const commitments = [...state.commitments];
    commitments[seat] = resource;
    if (state.phase === "first-pick") return changed(state, { phase: "handoff", commitments });
    const result = evaluateDay(state.dayIndex, state.inventories, commitments);
    if (result.status === "invalid") return state;
    if (result.status !== "accepted") return changed(state, { phase: "jammed", commitments, lastResult: result });
    const completedDays = [...state.completedDays, {
      dayId: DAYS[state.dayIndex].id,
      leftResource: commitments[SEAT_A],
      rightResource: commitments[SEAT_B],
      attempts: state.attempt,
    }];
    return changed(state, {
      phase: "day-result",
      inventories: result.nextInventories,
      commitments,
      lastResult: result,
      completedDays,
    });
  }

  function replaySevenDayGarden(actions, initialState) {
    let state = isSevenDayGardenState(initialState) ? makeState(initialState) : createInitialState();
    if (!Array.isArray(actions)) return state;
    try {
      for (const action of actions) state = reduceSevenDayGarden(state, action);
    } catch (_error) {
      return state;
    }
    return state;
  }

  function readEventProperty(eventLike, key) {
    try {
      return { ok: true, value: eventLike[key] };
    } catch (_error) {
      return { ok: false, value: undefined };
    }
  }

  function classifyResourceKey(state, eventLike) {
    if (!isSevenDayGardenState(state) || (state.phase !== "first-pick" && state.phase !== "second-pick")
      || !eventLike || (typeof eventLike !== "object" && typeof eventLike !== "function")) return null;
    const code = readEventProperty(eventLike, "code");
    const repeat = readEventProperty(eventLike, "repeat");
    const composing = readEventProperty(eventLike, "isComposing");
    if (!code.ok || !repeat.ok || !composing.ok || repeat.value === true || composing.value === true) return null;
    let resource = null;
    if (code.value === "KeyW") resource = RESOURCE_WATER;
    if (code.value === "KeyS") resource = RESOURCE_SUN;
    if (code.value === "KeyP") resource = RESOURCE_PRUNE;
    if (!resource) return null;
    const first = firstSeat(state.dayIndex);
    const seat = state.phase === "first-pick" ? first : (first === SEAT_A ? SEAT_B : SEAT_A);
    return deepFreeze({ type: "PICK", seat, resource });
  }

  function completionSummary(state, config) {
    if (!isSevenDayGardenState(state) || state.phase !== "complete") return null;
    const clean = normalizeConfig(config);
    const totalAttempts = state.completedDays.reduce((total, item) => total + item.attempts, 0);
    return deepFreeze({
      seats: [...clean.seats],
      totalDays: DAY_COUNT,
      totalCards: DAY_COUNT * 2,
      totalAttempts,
      replans: totalAttempts - DAY_COUNT,
      resourceTotals: { water: 5, sun: 5, prune: 4 },
      days: state.completedDays.map((item, index) => ({
        number: index + 1,
        dayId: item.dayId,
        title: DAYS[index].title,
        leftResource: item.leftResource,
        rightResource: item.rightResource,
        attempts: item.attempts,
      })),
    });
  }

  function isCompletionSummary(summary) {
    if (!exactDataObject(summary, [
      "seats", "totalDays", "totalCards", "totalAttempts", "replans", "resourceTotals", "days",
    ]) || !exactDataArray(summary.seats, 2)
      || summary.seats.some((name) => typeof name !== "string" || !name.trim() || [...name].length > 12)
      || summary.seats[0] === summary.seats[1]
      || summary.totalDays !== DAY_COUNT || summary.totalCards !== DAY_COUNT * 2
      || !Number.isSafeInteger(summary.totalAttempts) || summary.totalAttempts < DAY_COUNT
      || summary.replans !== summary.totalAttempts - DAY_COUNT
      || !exactDataObject(summary.resourceTotals, INVENTORY_KEYS)
      || !sameData(summary.resourceTotals, { water: 5, sun: 5, prune: 4 })
      || !exactDataArray(summary.days, DAY_COUNT)) return false;
    return summary.days.every((item, index) => exactDataObject(item, [
      "number", "dayId", "title", "leftResource", "rightResource", "attempts",
    ]) && item.number === index + 1 && item.dayId === DAYS[index].id && item.title === DAYS[index].title
      && isResource(item.leftResource) && isResource(item.rightResource)
      && Number.isSafeInteger(item.attempts) && item.attempts >= 1);
  }

  function mutationTrackingClone(summary) {
    let mutated = false;
    const wrap = (value) => {
      if (!value || typeof value !== "object") return value;
      const target = Array.isArray(value)
        ? value.map((item) => wrap(item))
        : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wrap(item)]));
      Object.freeze(target);
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

  function control(action, seat, resource, enabled) {
    return { action, seat: seat === undefined ? null : seat, resource: resource === undefined ? null : resource, enabled };
  }

  function publicControls(state) {
    if (state.phase === "intro") return [control("START", null, null, true)];
    if (state.phase === "day-intro") return [control("BEGIN_DAY", null, null, true), control("RESTART", null, null, true)];
    if (state.phase === "handoff") return [control("HANDOFF_READY", null, null, true), control("RESTART", null, null, true)];
    if (state.phase === "jammed") return [control("RETRY_DAY", null, null, true), control("RESTART", null, null, true)];
    if (state.phase === "day-result") return [control("NEXT_DAY", null, null, true), control("RESTART", null, null, true)];
    if (state.phase === "complete") return [control("RESTART", null, null, true)];
    const first = firstSeat(state.dayIndex);
    const seat = state.phase === "first-pick" ? first : (first === SEAT_A ? SEAT_B : SEAT_A);
    return [
      ...RESOURCES.map((resource) => control("PICK", seat, resource, state.inventories[seat][resource] > 0)),
      control("RESTART", null, null, true),
    ];
  }

  function announcementCode(state) {
    if (state.phase === "jammed") return state.lastResult.status;
    if (state.phase === "day-result") return state.dayIndex === DAY_COUNT - 1 ? "seventh-day-success" : "day-success";
    if (state.phase === "complete") return "complete";
    if (state.phase === "handoff") return "handoff";
    if (state.phase === "first-pick" || state.phase === "second-pick") return `${state.phase}-${firstSeat(state.dayIndex)}`;
    return state.phase;
  }

  function getPublicView(state, config) {
    if (!isSevenDayGardenState(state)) return null;
    const clean = normalizeConfig(config);
    const first = firstSeat(state.dayIndex);
    const activeSeat = state.phase === "first-pick" ? first
      : (state.phase === "handoff" || state.phase === "second-pick") ? (first === SEAT_A ? SEAT_B : SEAT_A)
        : null;
    const day = DAYS[state.dayIndex];
    return deepFreeze({
      phase: state.phase,
      day: {
        index: state.dayIndex,
        number: state.dayIndex + 1,
        id: day.id,
        title: day.title,
        note: day.note,
        resources: [...day.resources],
      },
      weekPlan: DAYS.map((item, index) => ({
        number: index + 1,
        id: item.id,
        title: item.title,
        note: item.note,
        resources: [...item.resources],
        status: index < state.completedDays.length ? "complete" : index === state.dayIndex ? "current" : "upcoming",
      })),
      seats: [SEAT_A, SEAT_B].map((seat) => ({
        id: seat,
        name: clean.seats[seat],
        inventory: { ...state.inventories[seat] },
        isFirst: seat === first,
        isActive: seat === activeSeat,
        hasPicked: state.commitments[seat] !== null,
      })),
      commitments: state.commitments.flatMap((resource, seat) => resource === null ? [] : [{ seat, resource }]),
      attempt: state.attempt,
      plantStage: state.completedDays.length,
      result: state.lastResult ? {
        status: state.lastResult.status,
        dayId: state.lastResult.dayId,
        commitments: [...state.lastResult.commitments],
        requiredPair: [...state.lastResult.requiredPair],
      } : null,
      controls: publicControls(state),
      announcementCode: announcementCode(state),
      summary: state.phase === "complete" ? completionSummary(state, clean) : null,
    });
  }

  return deepFreeze({
    DAY_COUNT,
    SEAT_A,
    SEAT_B,
    RESOURCE_WATER,
    RESOURCE_SUN,
    RESOURCE_PRUNE,
    RESOURCES,
    PHASES,
    DAYS,
    INITIAL_INVENTORIES,
    DEFAULT_SEATS,
    DEFAULT_COMPLETION_NOTE,
    deepFreeze,
    normalizeConfig,
    firstSeat,
    countSuffix,
    evaluateDay,
    createInitialState,
    isSevenDayGardenState,
    reduce: reduceSevenDayGarden,
    reduceSevenDayGarden,
    replaySevenDayGarden,
    classifyResourceKey,
    completionSummary,
    resolveCompletionNote,
    getPublicView,
  });
});
