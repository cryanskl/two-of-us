(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OrigamiHeartLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const numberIsFinite = Number.isFinite;
  const numberIsSafeInteger = Number.isSafeInteger;
  const objectFreeze = Object.freeze;
  const stringNormalize = String.prototype.normalize;
  const stringTrim = String.prototype.trim;
  const stringCharCodeAt = String.prototype.charCodeAt;
  const stringConstructor = String;
  const regexpReplace = RegExp.prototype[Symbol.replace];
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;
  const whitespacePattern = /\s+/gu;

  const VERSION = 1;
  const FOLD_COUNT = 5;
  const COMMIT_THRESHOLD = 0.72;
  const MAX_TRAVEL_PX = 4096;

  const CONFIG_KEYS = deepFreeze([
    "recipientName",
    "finalTitle",
    "finalMessage",
    "signature",
  ]);
  const STATE_KEYS = deepFreeze([
    "version",
    "phase",
    "completedFoldIds",
    "revision",
    "lastNotice",
  ]);
  const PHASES = deepFreeze(["intro", "folding", "turning", "complete"]);
  const NOTICES = deepFreeze([
    "ready",
    "started",
    "fold-committed",
    "folding-complete",
    "revealed",
  ]);

  const FOLD_STEPS = deepFreeze([
    {
      id: "bottom-up",
      index: 0,
      label: "第一折 · 收起下边",
      instruction: "把下边沿亮起的折痕向上收好",
      axisX: 0,
      axisY: -1,
      travelFactor: 0.36,
    },
    {
      id: "left-in",
      index: 1,
      label: "第二折 · 收进左角",
      instruction: "把左边的角收向纸心",
      axisX: 1,
      axisY: 0,
      travelFactor: 0.28,
    },
    {
      id: "right-in",
      index: 2,
      label: "第三折 · 收进右角",
      instruction: "把右边的角收向纸心",
      axisX: -1,
      axisY: 0,
      travelFactor: 0.28,
    },
    {
      id: "top-left-soften",
      index: 3,
      label: "第四折 · 收圆左尖",
      instruction: "把左上尖角轻轻向内收",
      axisX: 1,
      axisY: 1,
      travelFactor: 0.24,
    },
    {
      id: "top-right-soften",
      index: 4,
      label: "第五折 · 收圆右尖",
      instruction: "把右上尖角轻轻向内收",
      axisX: -1,
      axisY: 1,
      travelFactor: 0.24,
    },
  ]);
  const FOLD_IDS = deepFreeze([
    "bottom-up",
    "left-in",
    "right-in",
    "top-left-soften",
    "top-right-soften",
  ]);

  const DEFAULT_CONFIG_SOURCE = {
    recipientName: "给正在读这张纸的你",
    finalTitle: "这颗心，折给你",
    finalMessage: "有些话想慢一点说，所以先把它折好，再交到你手里。",
    signature: "一直站在你这边的人",
  };
  const TEXT_LIMITS = deepFreeze({
    recipientName: 24,
    finalTitle: 40,
    finalMessage: 180,
    signature: 32,
  });

  const PUBLIC_HEADING = "沿着折痕，慢慢折";
  const PUBLIC_INSTRUCTION =
    "沿着亮起的折痕，把这一张纸慢慢收好；最后翻过来，会有一句话等你。";

  const DEFAULT_CONFIG = parseConfig(DEFAULT_CONFIG_SOURCE);
  if (DEFAULT_CONFIG === null) {
    throw new Error("internal contract: invalid origami-heart default config");
  }

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return value;
    }
    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);
    if (typeof value === "function") return objectFreeze(value);
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return objectFreeze(value);
  }

  function hasExactKeys(actual, expected) {
    if (actual.length !== expected.length) return false;
    for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
      let found = false;
      for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
        if (actual[actualIndex] === expected[expectedIndex]) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function readRecordSnapshot(value) {
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
    if (nativeArray || (prototype !== objectPrototype && prototype !== null)) return null;

    const values = [];
    for (let index = 0; index < keys.length; index += 1) {
      if (typeof keys[index] !== "string") return null;
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      values[index] = descriptor.value;
    }
    return { keys, values };
  }

  function snapshotValue(snapshot, key) {
    for (let index = 0; index < snapshot.keys.length; index += 1) {
      if (snapshot.keys[index] === key) return snapshot.values[index];
    }
    return undefined;
  }

  function readExactRecord(value, expectedKeys) {
    const snapshot = readRecordSnapshot(value);
    return snapshot && hasExactKeys(snapshot.keys, expectedKeys) ? snapshot : null;
  }

  function readDenseArray(value, maximumLength) {
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
    try {
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
      || !numberIsSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
      || lengthDescriptor.value > maximumLength || keys.length !== lengthDescriptor.value + 1) {
      return null;
    }

    const result = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const key = stringConstructor(index);
      let keyFound = false;
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (keys[keyIndex] === key) {
          keyFound = true;
          break;
        }
      }
      if (!keyFound) return null;

      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }

    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      if (key === "length") continue;
      if (typeof key !== "string") return null;
      let expected = false;
      for (let index = 0; index < lengthDescriptor.value; index += 1) {
        if (key === stringConstructor(index)) {
          expected = true;
          break;
        }
      }
      if (!expected) return null;
    }
    return result;
  }

  function normalizeText(value, maximumLength) {
    if (typeof value !== "string") return null;
    let normalized;
    try {
      normalized = call(stringNormalize, value, ["NFC"]);
      normalized = call(regexpReplace, whitespacePattern, [normalized, " "]);
      normalized = call(stringTrim, normalized, []);
    } catch (_error) {
      return null;
    }
    const length = countCodePoints(normalized);
    return length >= 1 && length <= maximumLength ? normalized : null;
  }

  function countCodePoints(value) {
    let count = 0;
    for (let index = 0; index < value.length; index += 1) {
      const unit = call(stringCharCodeAt, value, [index]);
      if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < value.length) {
        const next = call(stringCharCodeAt, value, [index + 1]);
        if (next >= 0xdc00 && next <= 0xdfff) index += 1;
      }
      count += 1;
    }
    return count;
  }

  function parseConfig(candidate) {
    const source = readExactRecord(candidate, CONFIG_KEYS);
    if (source === null) return null;

    const result = {};
    for (let index = 0; index < CONFIG_KEYS.length; index += 1) {
      const key = CONFIG_KEYS[index];
      const normalized = normalizeText(snapshotValue(source, key), TEXT_LIMITS[key]);
      if (normalized === null) return null;
      result[key] = normalized;
    }
    return deepFreeze(result);
  }

  function sanitizeConfig(candidate) {
    const parsed = parseConfig(candidate);
    return parsed === null ? DEFAULT_CONFIG : parsed;
  }

  function findFoldIndex(foldId) {
    if (typeof foldId !== "string") return -1;
    for (let index = 0; index < FOLD_STEPS.length; index += 1) {
      if (FOLD_STEPS[index].id === foldId) return index;
    }
    return -1;
  }

  function foldPrefix(count) {
    const result = [];
    for (let index = 0; index < count; index += 1) result[index] = FOLD_IDS[index];
    return result;
  }

  function canonicalStateFields(phase, completedCount) {
    if (phase === "intro" && completedCount === 0) {
      return { revision: 0, lastNotice: "ready" };
    }
    if (phase === "folding" && completedCount === 0) {
      return { revision: 1, lastNotice: "started" };
    }
    if (phase === "folding" && completedCount >= 1 && completedCount <= 4) {
      return { revision: completedCount + 1, lastNotice: "fold-committed" };
    }
    if (phase === "turning" && completedCount === 5) {
      return { revision: 6, lastNotice: "folding-complete" };
    }
    if (phase === "complete" && completedCount === 5) {
      return { revision: 7, lastNotice: "revealed" };
    }
    return null;
  }

  function makeState(phase, completedCount) {
    const canonical = canonicalStateFields(phase, completedCount);
    if (canonical === null) throw new TypeError("invalid canonical origami-heart state");
    return deepFreeze({
      version: VERSION,
      phase,
      completedFoldIds: foldPrefix(completedCount),
      revision: canonical.revision,
      lastNotice: canonical.lastNotice,
    });
  }

  function createInitialState() {
    return makeState("intro", 0);
  }

  function parseState(candidate) {
    const source = readExactRecord(candidate, STATE_KEYS);
    if (source === null) throw new TypeError("invalid origami-heart state schema");

    const version = snapshotValue(source, "version");
    const phase = snapshotValue(source, "phase");
    const revision = snapshotValue(source, "revision");
    const lastNotice = snapshotValue(source, "lastNotice");
    const completedFoldIds = readDenseArray(
      snapshotValue(source, "completedFoldIds"),
      FOLD_COUNT,
    );
    if (version !== VERSION || typeof phase !== "string" || !contains(PHASES, phase)
      || completedFoldIds === null || !numberIsSafeInteger(revision) || revision < 0
      || typeof lastNotice !== "string" || !contains(NOTICES, lastNotice)) {
      throw new TypeError("invalid origami-heart state value");
    }

    for (let index = 0; index < completedFoldIds.length; index += 1) {
      if (completedFoldIds[index] !== FOLD_IDS[index]) {
        throw new TypeError("completed folds must be the canonical prefix");
      }
    }

    const canonical = canonicalStateFields(phase, completedFoldIds.length);
    if (canonical === null || canonical.revision !== revision
      || canonical.lastNotice !== lastNotice) {
      throw new TypeError("non-canonical origami-heart state");
    }

    return {
      source: candidate,
      phase,
      completedCount: completedFoldIds.length,
      revision,
      lastNotice,
    };
  }

  function assertState(candidate) {
    parseState(candidate);
    return candidate;
  }

  function contains(values, candidate) {
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === candidate) return true;
    }
    return false;
  }

  function parseAction(action) {
    const source = readRecordSnapshot(action);
    if (source === null) throw new TypeError("invalid origami-heart action schema");
    const type = snapshotValue(source, "type");
    if (type === "START" || type === "TURN_OVER" || type === "RESTART") {
      if (!hasExactKeys(source.keys, ["type"])) {
        throw new TypeError("invalid origami-heart action keys");
      }
      return { type };
    }
    if (type === "COMMIT_FOLD") {
      if (!hasExactKeys(source.keys, ["type", "foldId"])) {
        throw new TypeError("invalid COMMIT_FOLD keys");
      }
      const foldId = snapshotValue(source, "foldId");
      if (findFoldIndex(foldId) < 0) throw new TypeError("invalid foldId");
      return { type, foldId };
    }
    throw new TypeError("unknown origami-heart action");
  }

  function reduceOrigamiHeart(state, action) {
    let current;
    try {
      current = parseState(state);
    } catch (_error) {
      return createInitialState();
    }

    const parsedAction = parseAction(action);
    if (parsedAction.type === "START") {
      return current.phase === "intro" ? makeState("folding", 0) : state;
    }
    if (parsedAction.type === "COMMIT_FOLD") {
      if (current.phase !== "folding"
        || parsedAction.foldId !== FOLD_IDS[current.completedCount]) {
        return state;
      }
      const nextCount = current.completedCount + 1;
      return nextCount === FOLD_COUNT
        ? makeState("turning", nextCount)
        : makeState("folding", nextCount);
    }
    if (parsedAction.type === "TURN_OVER") {
      return current.phase === "turning" ? makeState("complete", FOLD_COUNT) : state;
    }
    if (parsedAction.type === "RESTART") {
      return current.phase === "intro" ? state : createInitialState();
    }
    return state;
  }

  function projectFoldProgress(foldId, deltaX, deltaY, travelPx) {
    const stepIndex = findFoldIndex(foldId);
    if (stepIndex < 0 || typeof deltaX !== "number" || !numberIsFinite(deltaX)
      || typeof deltaY !== "number" || !numberIsFinite(deltaY)
      || typeof travelPx !== "number" || !numberIsFinite(travelPx)
      || travelPx < 1 || travelPx > MAX_TRAVEL_PX) {
      return 0;
    }

    const step = FOLD_STEPS[stepIndex];
    const projection = deltaX * step.axisX + deltaY * step.axisY;
    const divisor = step.axisX !== 0 && step.axisY !== 0 ? 2 * travelPx : travelPx;
    const progress = projection / divisor;
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    return progress;
  }

  function shouldCommitFold(progress) {
    return typeof progress === "number"
      && numberIsFinite(progress)
      && progress >= COMMIT_THRESHOLD;
  }

  function stepPublicCopy(step) {
    return {
      id: step.id,
      index: step.index,
      label: step.label,
      instruction: step.instruction,
    };
  }

  function progressText(phase, completedCount) {
    if (phase === "intro") return "五道折痕还没有开始。";
    if (phase === "folding") {
      return completedCount === 0
        ? "准备完成第 1 / 5 折。"
        : `已完成 ${completedCount} / 5 折；准备第 ${completedCount + 1} / 5 折。`;
    }
    if (phase === "turning") return "五道折痕已经完成；现在把纸翻到背面。";
    return "五道折痕和翻面都已完成。";
  }

  function instructionText(phase, completedCount) {
    if (phase === "intro") return PUBLIC_INSTRUCTION;
    if (phase === "folding") return FOLD_STEPS[completedCount].instruction;
    if (phase === "turning") return "五道折痕已经收好，请主动把纸翻到背面。";
    return "这张纸已经折好，背面的心意也已经展开。";
  }

  function getOrigamiHeartView(state, config) {
    let current;
    try {
      current = parseState(state);
    } catch (_error) {
      current = {
        phase: "intro",
        completedCount: 0,
        revision: 0,
        lastNotice: "ready",
      };
    }

    const foldList = [];
    for (let index = 0; index < FOLD_STEPS.length; index += 1) {
      let status = "upcoming";
      if (index < current.completedCount) status = "done";
      else if (current.phase === "folding" && index === current.completedCount) {
        status = "current";
      }
      foldList[index] = {
        id: FOLD_STEPS[index].id,
        index,
        label: FOLD_STEPS[index].label,
        status,
      };
    }

    const currentFold = current.phase === "folding"
      ? stepPublicCopy(FOLD_STEPS[current.completedCount])
      : null;
    const privateContent = current.phase === "complete"
      ? copyConfig(sanitizeConfig(config))
      : null;

    return deepFreeze({
      version: VERSION,
      phase: current.phase,
      revision: current.revision,
      lastNotice: current.lastNotice,
      progress: {
        completed: current.completedCount,
        total: FOLD_COUNT,
        currentStepNumber: current.phase === "folding"
          ? current.completedCount + 1
          : current.completedCount,
      },
      currentFold,
      foldList,
      controls: {
        canStart: current.phase === "intro",
        canCommitFold: current.phase === "folding",
        canTurnOver: current.phase === "turning",
        canRestart: current.phase === "complete",
      },
      text: {
        heading: PUBLIC_HEADING,
        instruction: instructionText(current.phase, current.completedCount),
        progress: progressText(current.phase, current.completedCount),
      },
      privateContent,
    });
  }

  function copyConfig(config) {
    return {
      recipientName: config.recipientName,
      finalTitle: config.finalTitle,
      finalMessage: config.finalMessage,
      signature: config.signature,
    };
  }

  return deepFreeze({
    VERSION,
    FOLD_COUNT,
    COMMIT_THRESHOLD,
    MAX_TRAVEL_PX,
    PHASES,
    FOLD_IDS,
    FOLD_STEPS,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    assertState,
    reduceOrigamiHeart,
    projectFoldProgress,
    shouldCommitFold,
    getOrigamiHeartView,
  });
});
