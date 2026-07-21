(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ShadowDuetLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const objectFreeze = Object.freeze;
  const numberIsSafeInteger = Number.isSafeInteger;
  const stringTrim = String.prototype.trim;
  const stringCodePointAt = String.prototype.codePointAt;
  const stringFromCodePoint = String.fromCodePoint;
  const regexpTest = RegExp.prototype.test;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
  const unicodeMarkPattern = /\p{M}/u;
  const extendedPictographicPattern = /\p{Extended_Pictographic}/u;
  const graphemeSegmenter = typeof Intl === "object" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("zh", { granularity: "grapheme" }) : null;

  const TICK_RATE = 30;
  const WINDOW_START_TICK = 48;
  const WINDOW_END_TICK = 61;
  const REQUIRED_STABLE_TICKS = 6;
  const MAX_STEP_TICKS = 5;

  function deepFreeze(value, seen) {
    if ((value === null || typeof value !== "object") && typeof value !== "function") return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return objectFreeze(value);
  }

  const SEATS = deepFreeze(["left", "right"]);
  const POSES = deepFreeze([
    { id: "high", label: "举高", leftCode: "KeyW", rightCode: "ArrowUp" },
    { id: "wide", label: "展开", leftCode: "KeyA", rightCode: "ArrowRight" },
    { id: "low", label: "低身", leftCode: "KeyS", rightCode: "ArrowDown" },
    { id: "near", label: "向内", leftCode: "KeyD", rightCode: "ArrowLeft" },
  ]);
  const SCENES = deepFreeze([
    { id: "open-wings", title: "开幕·展翼", leftPose: "wide", rightPose: "wide" },
    { id: "little-roof", title: "屋檐·相接", leftPose: "near", rightPose: "near" },
    { id: "moon-left", title: "月钩·左起", leftPose: "high", rightPose: "low" },
    { id: "moon-right", title: "月钩·右起", leftPose: "low", rightPose: "high" },
    { id: "offer-hand", title: "窗边·递手", leftPose: "wide", rightPose: "near" },
    { id: "swap-hand", title: "谢幕·换手", leftPose: "near", rightPose: "wide" },
  ]);

  const STATE_KEYS = deepFreeze([
    "phase", "sceneIndex", "tick", "heldPoses", "stableTicks", "attempt",
    "completedScenes", "lastResult", "revision",
  ]);
  const HELD_KEYS = deepFreeze(["left", "right"]);
  const COMPLETED_KEYS = deepFreeze(["sceneId", "leftPose", "rightPose", "attempts"]);
  const PHASES = deepFreeze([
    "intro", "scene-intro", "dancing", "missed", "pose-result", "act-result", "complete",
  ]);
  const DEFAULT_SEATS = deepFreeze(["你", "TA"]);

  function defaultComposer(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，六次定格以后，影子也记住了我们。`;
  }

  const DEFAULT_CONFIG = deepFreeze({ seats: copyArray(DEFAULT_SEATS), composeCompletionNote: defaultComposer });

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function copyArray(values) {
    const result = [];
    for (let index = 0; index < values.length; index += 1) result[index] = values[index];
    return result;
  }

  function hasExactKeys(actual, expected) {
    if (actual.length !== expected.length) return false;
    for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
      let found = false;
      for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
        if (actual[actualIndex] === expected[expectedIndex]) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }

  function snapshotObject(value, expectedKeys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let keys;
    try {
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || !hasExactKeys(keys, expectedKeys)) return null;
    const result = {};
    for (let index = 0; index < expectedKeys.length; index += 1) {
      const key = expectedKeys[index];
      let descriptor;
      try { descriptor = reflectGetOwnPropertyDescriptor(value, key); } catch (_error) { return null; }
      if (!descriptor || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  }

  function snapshotRecord(value) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let keys;
    try {
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype) return null;
    const values = {};
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string") return null;
      let descriptor;
      try { descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]); } catch (_error) { return null; }
      if (!descriptor || !("value" in descriptor)) return null;
      values[keys[index]] = descriptor.value;
    }
    return { keys, values };
  }

  function snapshotArray(value, minimum, maximum) {
    if (value === null || typeof value !== "object") return null;
    let nativeArray;
    let prototype;
    let keys;
    try {
      nativeArray = arrayIsArray(value);
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (!nativeArray || prototype !== arrayPrototype) return null;
    let lengthDescriptor;
    try { lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length"); } catch (_error) { return null; }
    if (!lengthDescriptor || !("value" in lengthDescriptor)
      || !numberIsSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < minimum || lengthDescriptor.value > maximum) return null;
    const length = lengthDescriptor.value;
    if (keys.length !== length + 1) return null;
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      if (typeof key !== "string") return null;
      if (key === "length") continue;
      let valid = false;
      for (let index = 0; index < length; index += 1) {
        if (key === String(index)) { valid = true; break; }
      }
      if (!valid) return null;
    }
    const result = [];
    for (let index = 0; index < length; index += 1) {
      let descriptor;
      try { descriptor = reflectGetOwnPropertyDescriptor(value, String(index)); } catch (_error) { return null; }
      if (!descriptor || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }
    return result;
  }

  function indexOfString(values, candidate) {
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === candidate) return index;
    }
    return -1;
  }

  function poseIndex(id) {
    if (typeof id !== "string") return -1;
    for (let index = 0; index < POSES.length; index += 1) if (POSES[index].id === id) return index;
    return -1;
  }

  function graphemeCount(value) {
    if (graphemeSegmenter === null) {
      let count = 0;
      let index = 0;
      while (index < value.length) {
        const first = call(stringCodePointAt, value, [index]);
        index += first > 0xffff ? 2 : 1;
        count += 1;
        if (first === 0x0d && index < value.length
          && call(stringCodePointAt, value, [index]) === 0x0a) {
          index += 1;
          continue;
        }
        if (isRegionalIndicator(first) && index < value.length) {
          const regional = call(stringCodePointAt, value, [index]);
          if (isRegionalIndicator(regional)) index += regional > 0xffff ? 2 : 1;
        }
        let hangulClass = getHangulClass(first);
        while (hangulClass !== 0 && index < value.length) {
          const next = call(stringCodePointAt, value, [index]);
          const nextClass = getHangulClass(next);
          if (!hangulJoins(hangulClass, nextClass)) break;
          index += next > 0xffff ? 2 : 1;
          hangulClass = nextClass;
        }
        index = consumeGraphemeExtenders(value, index);
        const pictographicSequence = isExtendedPictographic(first);
        while (index < value.length && call(stringCodePointAt, value, [index]) === 0x200d) {
          index += 1;
          if (!pictographicSequence || index >= value.length) break;
          const joined = call(stringCodePointAt, value, [index]);
          if (!isExtendedPictographic(joined)) break;
          index += joined > 0xffff ? 2 : 1;
          index = consumeGraphemeExtenders(value, index);
        }
      }
      return count;
    }
    let count = 0;
    const segments = graphemeSegmenter.segment(value);
    for (const _segment of segments) count += 1;
    return count;
  }

  function isRegionalIndicator(codePoint) {
    return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
  }

  function isExtendedPictographic(codePoint) {
    return call(regexpTest, extendedPictographicPattern, [stringFromCodePoint(codePoint)]);
  }

  function getHangulClass(codePoint) {
    if ((codePoint >= 0x1100 && codePoint <= 0x115f)
      || (codePoint >= 0xa960 && codePoint <= 0xa97c)) return 1;
    if ((codePoint >= 0x1160 && codePoint <= 0x11a7)
      || (codePoint >= 0xd7b0 && codePoint <= 0xd7c6)) return 2;
    if ((codePoint >= 0x11a8 && codePoint <= 0x11ff)
      || (codePoint >= 0xd7cb && codePoint <= 0xd7fb)) return 3;
    if (codePoint >= 0xac00 && codePoint <= 0xd7a3) return (codePoint - 0xac00) % 28 === 0 ? 4 : 5;
    return 0;
  }

  function hangulJoins(leftClass, rightClass) {
    return (leftClass === 1 && (rightClass === 1 || rightClass === 2 || rightClass === 4 || rightClass === 5))
      || ((leftClass === 2 || leftClass === 4) && (rightClass === 2 || rightClass === 3))
      || ((leftClass === 3 || leftClass === 5) && rightClass === 3);
  }

  function isGraphemeExtender(codePoint) {
    return call(regexpTest, unicodeMarkPattern, [stringFromCodePoint(codePoint)])
      || (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff);
  }

  function consumeGraphemeExtenders(value, index) {
    let cursor = index;
    while (cursor < value.length) {
      const codePoint = call(stringCodePointAt, value, [cursor]);
      if (!isGraphemeExtender(codePoint)) break;
      cursor += codePoint > 0xffff ? 2 : 1;
    }
    return cursor;
  }

  function cleanSeatName(value) {
    if (typeof value !== "string") return null;
    const clean = call(stringTrim, value, []);
    const count = graphemeCount(clean);
    return count >= 1 && count <= 12 ? clean : null;
  }

  function snapshotSeats(value) {
    const raw = snapshotArray(value, 2, 2);
    if (raw === null) return null;
    const left = cleanSeatName(raw[0]);
    const right = cleanSeatName(raw[1]);
    if (left === null || right === null || left === right) return null;
    return [left, right];
  }

  function normalizedConfigOrNull(raw) {
    const source = snapshotObject(raw, ["seats", "composeCompletionNote"]);
    if (source === null || typeof source.composeCompletionNote !== "function") return null;
    const seats = snapshotSeats(source.seats);
    if (seats === null) return null;
    const composer = source.composeCompletionNote;
    function isolatedComposer(summary) {
      return call(composer, undefined, [summary]);
    }
    return deepFreeze({ seats, composeCompletionNote: isolatedComposer });
  }

  function normalizeConfig(raw) {
    const normalized = normalizedConfigOrNull(raw);
    if (normalized !== null) return normalized;
    return deepFreeze({ seats: copyArray(DEFAULT_SEATS), composeCompletionNote: defaultComposer });
  }

  function snapshotPoseStack(value) {
    const stack = snapshotArray(value, 0, 4);
    if (stack === null) return null;
    const seen = [];
    for (let index = 0; index < stack.length; index += 1) {
      if (poseIndex(stack[index]) < 0 || indexOfString(seen, stack[index]) >= 0) return null;
      seen[index] = stack[index];
    }
    return seen;
  }

  function snapshotHeld(value) {
    const held = snapshotObject(value, HELD_KEYS);
    if (held === null) return null;
    const left = snapshotPoseStack(held.left);
    const right = snapshotPoseStack(held.right);
    return left === null || right === null ? null : { left, right };
  }

  function currentPose(stack) {
    return stack.length === 0 ? null : stack[stack.length - 1];
  }

  function snapshotCompleted(value) {
    const entries = snapshotArray(value, 0, SCENES.length);
    if (entries === null) return null;
    const result = [];
    let attemptsTotal = 0;
    for (let index = 0; index < entries.length; index += 1) {
      const item = snapshotObject(entries[index], COMPLETED_KEYS);
      const scene = SCENES[index];
      if (item === null || item.sceneId !== scene.id || item.leftPose !== scene.leftPose
        || item.rightPose !== scene.rightPose || !numberIsSafeInteger(item.attempts) || item.attempts < 1
        || attemptsTotal > MAX_SAFE_INTEGER - item.attempts) return null;
      attemptsTotal += item.attempts;
      result[index] = {
        sceneId: item.sceneId, leftPose: item.leftPose, rightPose: item.rightPose, attempts: item.attempts,
      };
    }
    return { entries: result, attemptsTotal };
  }

  function hasIncompleteHeadroom(attemptsTotal, attempt, completedCount) {
    const futureScenes = SCENES.length - completedCount - 1;
    if (futureScenes < 0 || attemptsTotal > MAX_SAFE_INTEGER - attempt) return false;
    return attemptsTotal + attempt <= MAX_SAFE_INTEGER - futureScenes;
  }

  function hasPoseResultHeadroom(attemptsTotal, completedCount) {
    const futureScenes = SCENES.length - completedCount;
    return futureScenes >= 0 && attemptsTotal <= MAX_SAFE_INTEGER - futureScenes;
  }

  function sumCompletedAttempts(entries) {
    let total = 0;
    for (let index = 0; index < entries.length; index += 1) total += entries[index].attempts;
    return total;
  }

  function snapshotLastResult(value) {
    if (value === null) return null;
    const record = snapshotRecord(value);
    if (record === null || typeof record.values.status !== "string") return undefined;
    if (record.values.status === "captured") {
      if (!hasExactKeys(record.keys, ["status", "sceneId", "tick"])
        || typeof record.values.sceneId !== "string" || !numberIsSafeInteger(record.values.tick)) return undefined;
      return { status: "captured", sceneId: record.values.sceneId, tick: record.values.tick };
    }
    if (record.values.status === "missed") {
      if (!hasExactKeys(record.keys, ["status", "sceneId", "leftPose", "rightPose"])
        || typeof record.values.sceneId !== "string"
        || (record.values.leftPose !== null && poseIndex(record.values.leftPose) < 0)
        || (record.values.rightPose !== null && poseIndex(record.values.rightPose) < 0)) return undefined;
      return {
        status: "missed", sceneId: record.values.sceneId,
        leftPose: record.values.leftPose, rightPose: record.values.rightPose,
      };
    }
    return undefined;
  }

  function phaseExists(phase) {
    return typeof phase === "string" && indexOfString(PHASES, phase) >= 0;
  }

  function stacksEmpty(held) {
    return held.left.length === 0 && held.right.length === 0;
  }

  function snapshotState(candidate) {
    const raw = snapshotObject(candidate, STATE_KEYS);
    if (raw === null || !phaseExists(raw.phase)
      || !numberIsSafeInteger(raw.sceneIndex) || raw.sceneIndex < 0 || raw.sceneIndex >= SCENES.length
      || !numberIsSafeInteger(raw.tick) || raw.tick < 0
      || !numberIsSafeInteger(raw.stableTicks) || raw.stableTicks < 0
      || !numberIsSafeInteger(raw.attempt) || raw.attempt < 1
      || !numberIsSafeInteger(raw.revision) || raw.revision < 0) return null;
    const held = snapshotHeld(raw.heldPoses);
    const completed = snapshotCompleted(raw.completedScenes);
    const lastResult = snapshotLastResult(raw.lastResult);
    if (held === null || completed === null || lastResult === undefined) return null;
    const length = completed.entries.length;
    const scene = SCENES[raw.sceneIndex];

    if ((raw.phase === "scene-intro" || raw.phase === "dancing" || raw.phase === "missed")
      && !hasIncompleteHeadroom(completed.attemptsTotal, raw.attempt, length)) return null;
    if (raw.phase === "pose-result"
      && !hasPoseResultHeadroom(completed.attemptsTotal, length)) return null;

    if (raw.phase === "intro") {
      if (raw.sceneIndex !== 0 || length !== 0 || raw.tick !== 0 || !stacksEmpty(held)
        || raw.stableTicks !== 0 || raw.attempt !== 1 || lastResult !== null) return null;
    } else if (raw.phase === "scene-intro") {
      if (raw.sceneIndex !== length || length > 5 || raw.tick !== 0 || !stacksEmpty(held)
        || raw.stableTicks !== 0 || lastResult !== null) return null;
    } else if (raw.phase === "dancing") {
      if (raw.sceneIndex !== length || length > 5 || raw.tick > 61 || raw.stableTicks > 5 || lastResult !== null) return null;
      if (raw.tick < WINDOW_START_TICK && raw.stableTicks !== 0) return null;
      if (raw.stableTicks > 0) {
        if (raw.tick < WINDOW_START_TICK || raw.tick > WINDOW_END_TICK
          || currentPose(held.left) !== scene.leftPose || currentPose(held.right) !== scene.rightPose
          || raw.stableTicks > Math.min(5, raw.tick - 47)) return null;
      }
    } else if (raw.phase === "missed") {
      if (raw.sceneIndex !== length || length > 5 || raw.tick !== 62 || !stacksEmpty(held)
        || raw.stableTicks !== 0 || lastResult === null || lastResult.status !== "missed"
        || lastResult.sceneId !== scene.id) return null;
    } else if (raw.phase === "pose-result") {
      if (length < 1 || length > 6 || raw.sceneIndex !== length - 1 || raw.tick < 53 || raw.tick > 61
        || !stacksEmpty(held) || raw.stableTicks !== 6 || raw.attempt !== completed.entries[length - 1].attempts
        || lastResult === null || lastResult.status !== "captured" || lastResult.sceneId !== scene.id
        || lastResult.tick !== raw.tick) return null;
    } else if (raw.phase === "act-result" || raw.phase === "complete") {
      if (raw.sceneIndex !== 5 || length !== 6 || raw.tick !== 0 || !stacksEmpty(held)
        || raw.stableTicks !== 0 || raw.attempt !== 1 || lastResult !== null) return null;
    }

    return deepFreeze({
      phase: raw.phase, sceneIndex: raw.sceneIndex, tick: raw.tick, heldPoses: held,
      stableTicks: raw.stableTicks, attempt: raw.attempt, completedScenes: completed.entries,
      lastResult, revision: raw.revision,
    });
  }

  function createInitialStateWithRevision(revision) {
    return deepFreeze({
      phase: "intro", sceneIndex: 0, tick: 0, heldPoses: { left: [], right: [] },
      stableTicks: 0, attempt: 1, completedScenes: [], lastResult: null, revision,
    });
  }

  function createInitialState() {
    return createInitialStateWithRevision(0);
  }

  function snapshotAction(candidate) {
    const record = snapshotRecord(candidate);
    if (record === null || typeof record.values.type !== "string") return null;
    const type = record.values.type;
    if (type === "PRESS" || type === "RELEASE") {
      if (!hasExactKeys(record.keys, ["type", "seat", "pose"])
        || indexOfString(SEATS, record.values.seat) < 0 || poseIndex(record.values.pose) < 0) return null;
      return { type, seat: record.values.seat, pose: record.values.pose };
    }
    if (type === "STEP") {
      if (!hasExactKeys(record.keys, ["type", "ticks"]) || !numberIsSafeInteger(record.values.ticks)
        || record.values.ticks < 1 || record.values.ticks > MAX_STEP_TICKS) return null;
      return { type, ticks: record.values.ticks };
    }
    if (type === "START" || type === "BEGIN_SCENE" || type === "SUSPEND"
      || type === "RETRY_SCENE" || type === "NEXT_SCENE" || type === "FINISH" || type === "RESTART") {
      return hasExactKeys(record.keys, ["type"]) ? { type } : null;
    }
    return null;
  }

  function cloneCompleted(entries) {
    const result = [];
    for (let index = 0; index < entries.length; index += 1) {
      result[index] = {
        sceneId: entries[index].sceneId, leftPose: entries[index].leftPose,
        rightPose: entries[index].rightPose, attempts: entries[index].attempts,
      };
    }
    return result;
  }

  function cloneLastResult(result) {
    if (result === null) return null;
    if (result.status === "captured") return { status: result.status, sceneId: result.sceneId, tick: result.tick };
    return { status: result.status, sceneId: result.sceneId, leftPose: result.leftPose, rightPose: result.rightPose };
  }

  function makeState(fields) {
    return deepFreeze({
      phase: fields.phase, sceneIndex: fields.sceneIndex, tick: fields.tick,
      heldPoses: { left: copyArray(fields.heldPoses.left), right: copyArray(fields.heldPoses.right) },
      stableTicks: fields.stableTicks, attempt: fields.attempt,
      completedScenes: cloneCompleted(fields.completedScenes), lastResult: cloneLastResult(fields.lastResult),
      revision: fields.revision,
    });
  }

  function transition(state, changes) {
    return makeState({
      phase: "phase" in changes ? changes.phase : state.phase,
      sceneIndex: "sceneIndex" in changes ? changes.sceneIndex : state.sceneIndex,
      tick: "tick" in changes ? changes.tick : state.tick,
      heldPoses: "heldPoses" in changes ? changes.heldPoses : state.heldPoses,
      stableTicks: "stableTicks" in changes ? changes.stableTicks : state.stableTicks,
      attempt: "attempt" in changes ? changes.attempt : state.attempt,
      completedScenes: "completedScenes" in changes ? changes.completedScenes : state.completedScenes,
      lastResult: "lastResult" in changes ? changes.lastResult : state.lastResult,
      revision: state.revision + 1,
    });
  }

  function reduceStep(original, state, ticks) {
    let tick = state.tick;
    let stableTicks = state.stableTicks;
    const leftPose = currentPose(state.heldPoses.left);
    const rightPose = currentPose(state.heldPoses.right);
    const scene = SCENES[state.sceneIndex];
    for (let count = 0; count < ticks; count += 1) {
      tick += 1;
      if (tick >= WINDOW_START_TICK && tick <= WINDOW_END_TICK) {
        stableTicks = leftPose === scene.leftPose && rightPose === scene.rightPose ? stableTicks + 1 : 0;
        if (stableTicks === REQUIRED_STABLE_TICKS) {
          let total = 0;
          for (let index = 0; index < state.completedScenes.length; index += 1) total += state.completedScenes[index].attempts;
          if (total > MAX_SAFE_INTEGER - state.attempt) return original;
          const completedScenes = cloneCompleted(state.completedScenes);
          completedScenes[completedScenes.length] = {
            sceneId: scene.id, leftPose: scene.leftPose, rightPose: scene.rightPose, attempts: state.attempt,
          };
          return transition(state, {
            phase: "pose-result", tick, heldPoses: { left: [], right: [] }, stableTicks,
            completedScenes, lastResult: { status: "captured", sceneId: scene.id, tick },
          });
        }
      }
      if (tick === WINDOW_END_TICK + 1) {
        return transition(state, {
          phase: "missed", tick, heldPoses: { left: [], right: [] }, stableTicks: 0,
          lastResult: { status: "missed", sceneId: scene.id, leftPose, rightPose },
        });
      }
    }
    return transition(state, { tick, stableTicks });
  }

  function reduce(stateCandidate, actionCandidate) {
    const state = snapshotState(stateCandidate);
    if (state === null) return createInitialState();
    const action = snapshotAction(actionCandidate);
    if (action === null || state.revision === MAX_SAFE_INTEGER) return stateCandidate;

    if (action.type === "START") {
      return state.phase === "intro" ? transition(state, { phase: "scene-intro" }) : stateCandidate;
    }
    if (action.type === "BEGIN_SCENE") {
      return state.phase === "scene-intro" ? transition(state, { phase: "dancing", tick: 0 }) : stateCandidate;
    }
    if (action.type === "PRESS" || action.type === "RELEASE") {
      if (state.phase !== "dancing" || state.tick > 60) return stateCandidate;
      const stack = state.heldPoses[action.seat];
      const index = indexOfString(stack, action.pose);
      if ((action.type === "PRESS" && index >= 0) || (action.type === "RELEASE" && index < 0)) return stateCandidate;
      const changed = [];
      if (action.type === "PRESS") {
        for (let item = 0; item < stack.length; item += 1) changed[item] = stack[item];
        changed[changed.length] = action.pose;
      } else {
        for (let item = 0; item < stack.length; item += 1) if (item !== index) changed[changed.length] = stack[item];
      }
      const heldPoses = {
        left: action.seat === "left" ? changed : state.heldPoses.left,
        right: action.seat === "right" ? changed : state.heldPoses.right,
      };
      const scene = SCENES[state.sceneIndex];
      const stillCorrect = currentPose(heldPoses.left) === scene.leftPose
        && currentPose(heldPoses.right) === scene.rightPose;
      return transition(state, { heldPoses, stableTicks: stillCorrect ? state.stableTicks : 0 });
    }
    if (action.type === "STEP") {
      return state.phase === "dancing" ? reduceStep(stateCandidate, state, action.ticks) : stateCandidate;
    }
    if (action.type === "SUSPEND") {
      return state.phase === "dancing" ? transition(state, {
        phase: "scene-intro", tick: 0, heldPoses: { left: [], right: [] }, stableTicks: 0, lastResult: null,
      }) : stateCandidate;
    }
    if (action.type === "RETRY_SCENE") {
      if (state.phase !== "missed" || state.attempt === MAX_SAFE_INTEGER
        || !hasIncompleteHeadroom(
          sumCompletedAttempts(state.completedScenes),
          state.attempt + 1,
          state.completedScenes.length,
        )) return stateCandidate;
      return transition(state, { phase: "scene-intro", tick: 0, attempt: state.attempt + 1, lastResult: null });
    }
    if (action.type === "NEXT_SCENE") {
      if (state.phase !== "pose-result") return stateCandidate;
      if (state.completedScenes.length === SCENES.length) {
        return transition(state, { phase: "act-result", tick: 0, stableTicks: 0, attempt: 1, lastResult: null });
      }
      return transition(state, {
        phase: "scene-intro", sceneIndex: state.sceneIndex + 1, tick: 0,
        stableTicks: 0, attempt: 1, lastResult: null,
      });
    }
    if (action.type === "FINISH") {
      return state.phase === "act-result" ? transition(state, { phase: "complete" }) : stateCandidate;
    }
    if (action.type === "RESTART") {
      return state.phase === "complete" ? createInitialStateWithRevision(state.revision + 1) : stateCandidate;
    }
    return stateCandidate;
  }

  function copyPose(pose) {
    return { id: pose.id, label: pose.label, leftCode: pose.leftCode, rightCode: pose.rightCode };
  }

  function copyScene(scene) {
    return { id: scene.id, title: scene.title, leftPose: scene.leftPose, rightPose: scene.rightPose };
  }

  function buildSummary(state, seats) {
    if (state.phase !== "act-result" && state.phase !== "complete") return null;
    let totalAttempts = 0;
    for (let index = 0; index < state.completedScenes.length; index += 1) totalAttempts += state.completedScenes[index].attempts;
    const captures = [];
    for (let index = 0; index < SCENES.length; index += 1) captures[index] = SCENES[index].title;
    return {
      seats: copyArray(seats), sceneCount: SCENES.length, totalAttempts,
      retries: totalAttempts - SCENES.length, captures,
    };
  }

  function getPublicView(stateCandidate, configCandidate) {
    const state = snapshotState(stateCandidate) || createInitialState();
    const config = normalizeConfig(configCandidate);
    const poses = [];
    for (let index = 0; index < POSES.length; index += 1) poses[index] = copyPose(POSES[index]);
    const seats = [];
    for (let index = 0; index < SEATS.length; index += 1) seats[index] = SEATS[index];
    return deepFreeze({
      phase: state.phase,
      sceneIndex: state.sceneIndex,
      sceneCount: SCENES.length,
      currentScene: copyScene(SCENES[state.sceneIndex]),
      tick: state.tick,
      windowStartTick: WINDOW_START_TICK,
      windowEndTick: WINDOW_END_TICK,
      requiredStableTicks: REQUIRED_STABLE_TICKS,
      heldPoses: { left: copyArray(state.heldPoses.left), right: copyArray(state.heldPoses.right) },
      activePoses: { left: currentPose(state.heldPoses.left), right: currentPose(state.heldPoses.right) },
      stableTicks: state.stableTicks,
      attempt: state.attempt,
      completedScenes: cloneCompleted(state.completedScenes),
      completedCount: state.completedScenes.length,
      lastResult: cloneLastResult(state.lastResult),
      seats: copyArray(config.seats),
      poses,
      isComplete: state.phase === "complete",
      summary: buildSummary(state, config.seats),
      revision: state.revision,
    });
  }

  function snapshotSummary(candidate) {
    const raw = snapshotObject(candidate, ["seats", "sceneCount", "totalAttempts", "retries", "captures"]);
    if (raw === null) return null;
    const seats = snapshotSeats(raw.seats);
    const captures = snapshotArray(raw.captures, SCENES.length, SCENES.length);
    if (seats === null || captures === null || raw.sceneCount !== SCENES.length
      || !numberIsSafeInteger(raw.totalAttempts) || raw.totalAttempts < SCENES.length
      || raw.retries !== raw.totalAttempts - SCENES.length) return null;
    for (let index = 0; index < captures.length; index += 1) if (captures[index] !== SCENES[index].title) return null;
    return deepFreeze({
      seats, sceneCount: SCENES.length, totalAttempts: raw.totalAttempts,
      retries: raw.retries, captures,
    });
  }

  function mutationTracked(value, tracker) {
    let target;
    if (arrayIsArray(value)) {
      target = [];
      for (let index = 0; index < value.length; index += 1) target[index] = mutationTracked(value[index], tracker);
    } else if (value !== null && typeof value === "object") {
      target = {};
      const keys = reflectOwnKeys(value);
      for (let index = 0; index < keys.length; index += 1) {
        const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
        if (descriptor && "value" in descriptor) target[keys[index]] = mutationTracked(descriptor.value, tracker);
      }
    } else {
      return value;
    }
    objectFreeze(target);
    return new Proxy(target, {
      set() { tracker.mutated = true; return false; },
      deleteProperty() { tracker.mutated = true; return false; },
      defineProperty() { tracker.mutated = true; return false; },
      setPrototypeOf() { tracker.mutated = true; return false; },
    });
  }

  function fallbackSummary() {
    const captures = [];
    for (let index = 0; index < SCENES.length; index += 1) captures[index] = SCENES[index].title;
    return deepFreeze({ seats: copyArray(DEFAULT_SEATS), sceneCount: 6, totalAttempts: 6, retries: 0, captures });
  }

  function resolveCompletionNote(composer, summaryCandidate) {
    const summary = snapshotSummary(summaryCandidate);
    if (summary === null) return defaultComposer(fallbackSummary());
    const fallback = defaultComposer(summary);
    if (typeof composer !== "function") return fallback;
    const tracker = { mutated: false };
    const isolated = mutationTracked(summary, tracker);
    let result;
    try { result = composer(isolated); } catch (_error) { return fallback; }
    if (tracker.mutated || typeof result !== "string") return fallback;
    const clean = call(stringTrim, result, []);
    return clean && graphemeCount(clean) <= 120 ? clean : fallback;
  }

  function selfCheck() {
    if (SEATS.length !== 2 || POSES.length !== 4 || SCENES.length !== 6
      || TICK_RATE !== 30 || WINDOW_START_TICK !== 48 || WINDOW_END_TICK !== 61
      || REQUIRED_STABLE_TICKS !== 6 || MAX_STEP_TICKS !== 5
      || !numberIsSafeInteger(TICK_RATE) || !numberIsSafeInteger(WINDOW_START_TICK)
      || !numberIsSafeInteger(WINDOW_END_TICK) || !numberIsSafeInteger(REQUIRED_STABLE_TICKS)
      || !numberIsSafeInteger(MAX_STEP_TICKS) || TICK_RATE <= 0 || WINDOW_START_TICK <= 0
      || WINDOW_END_TICK <= 0 || REQUIRED_STABLE_TICKS <= 0 || MAX_STEP_TICKS <= 0
      || WINDOW_END_TICK - WINDOW_START_TICK + 1 < REQUIRED_STABLE_TICKS
      || WINDOW_START_TICK + REQUIRED_STABLE_TICKS - 1 !== 53
      || WINDOW_END_TICK - REQUIRED_STABLE_TICKS + 1 !== 56) return false;
    const ids = [];
    const codes = [];
    for (let index = 0; index < POSES.length; index += 1) {
      const pose = snapshotObject(POSES[index], ["id", "label", "leftCode", "rightCode"]);
      if (pose === null || typeof pose.id !== "string" || !pose.id || typeof pose.label !== "string" || !pose.label
        || typeof pose.leftCode !== "string" || !pose.leftCode
        || typeof pose.rightCode !== "string" || !pose.rightCode
        || indexOfString(ids, pose.id) >= 0 || indexOfString(codes, pose.leftCode) >= 0
        || indexOfString(codes, pose.rightCode) >= 0 || pose.leftCode === pose.rightCode) return false;
      ids[ids.length] = pose.id;
      codes[codes.length] = pose.leftCode;
      codes[codes.length] = pose.rightCode;
    }
    const pairs = [];
    const sceneIds = [];
    const leftCounts = { high: 0, wide: 0, low: 0, near: 0 };
    const rightCounts = { high: 0, wide: 0, low: 0, near: 0 };
    for (let index = 0; index < SCENES.length; index += 1) {
      const scene = snapshotObject(SCENES[index], ["id", "title", "leftPose", "rightPose"]);
      const pair = scene && `${scene.leftPose}/${scene.rightPose}`;
      if (scene === null || typeof scene.id !== "string" || !scene.id || typeof scene.title !== "string" || !scene.title
        || indexOfString(sceneIds, scene.id) >= 0 || poseIndex(scene.leftPose) < 0
        || poseIndex(scene.rightPose) < 0 || indexOfString(pairs, pair) >= 0) return false;
      sceneIds[sceneIds.length] = scene.id;
      pairs[pairs.length] = pair;
      leftCounts[scene.leftPose] += 1;
      rightCounts[scene.rightPose] += 1;
    }
    const expected = { high: 1, wide: 2, low: 1, near: 2 };
    for (let index = 0; index < POSES.length; index += 1) {
      const id = POSES[index].id;
      if (leftCounts[id] !== expected[id] || rightCounts[id] !== expected[id]) return false;
    }
    return true;
  }

  if (!selfCheck()) throw new Error("internal contract: invalid shadow duet constants");

  return deepFreeze({
    SEATS, POSES, SCENES, TICK_RATE, WINDOW_START_TICK, WINDOW_END_TICK,
    REQUIRED_STABLE_TICKS, MAX_STEP_TICKS, DEFAULT_CONFIG, normalizeConfig,
    resolveCompletionNote, createInitialState, reduce, getPublicView,
  });
});
