(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CANDLE_WISHES_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const objectFreeze = Object.freeze;
  const stringNormalize = String.prototype.normalize;
  const stringTrim = String.prototype.trim;
  const stringCharCodeAt = String.prototype.charCodeAt;
  const regexpTest = RegExp.prototype.test;
  const numberIsSafeInteger = Number.isSafeInteger;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;

  const VERSION = 1;
  const CANDLE_COUNT = 5;
  const MAX_REVISION = 9007199254740991;
  const DISPLAY_PERMUTATION = deepFreeze([2, 4, 0, 3, 1]);
  const CONFIG_KEYS = deepFreeze([
    "recipient", "finalTitle", "finalMessage", "signature", "candles",
  ]);
  const CANDLE_KEYS = deepFreeze(["id", "label", "cue", "wish"]);
  const STATE_KEYS = deepFreeze([
    "version", "phase", "content", "litIds", "cursor", "revision",
  ]);
  const PHASES = deepFreeze(["intro", "lighting", "ready-to-receive", "complete"]);
  const ID_PATTERN = /^[a-z][a-z0-9-]{0,23}$/;

  const PUBLIC_TITLE = "今晚，点亮五支蜡烛";
  const INSTRUCTIONS =
    "读一条线索，点亮对应的蜡烛。选错不会失去什么；五盏都亮起后，会有一段话留给你。";
  const PRIVACY_TEXT =
    "内容写在本地文件里；页面不会上传或另存，最后的话会在五盏都亮起后出现。";

  const DEFAULT_CONFIG_SOURCE = deepFreeze({
    recipient: "你",
    finalTitle: "愿每一个以后，都有我们",
    finalMessage:
      "这些愿望不是今天才有。只是今晚，我把它们一盏一盏点亮，想认真交给你。",
    signature: "——一直想和你走下去的我",
    candles: [
      {
        id: "rain",
        label: "那场雨",
        cue: "先从我们都没带伞的那天开始",
        wish: "愿以后的雨天，我们还愿意把伞往对方那边多偏一点。",
      },
      {
        id: "noodle",
        label: "深夜面馆",
        cue: "下一盏，留给那碗把疲惫慢慢赶走的热汤",
        wish: "愿再晚的夜，我们也有一张桌子可以坐下来好好说话。",
      },
      {
        id: "journey",
        label: "第一次远行",
        cue: "再想想那次第一次一起走到陌生地方",
        wish: "愿每一段陌生的路，因为并肩走着，都慢慢变成值得记住的地方。",
      },
      {
        id: "quiet",
        label: "安静并肩",
        cue: "这一盏属于不用说话也很安心的时刻",
        wish: "愿我们不只分享热闹，也能在安静里好好陪着彼此。",
      },
      {
        id: "home",
        label: "回家以后",
        cue: "最后，把光留给每一次一起回家的以后",
        wish: "愿以后推开门的时候，我们总能先看见彼此，再看见一天的疲惫。",
      },
    ],
  });

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function deepFreeze(value) {
    if (value === null || typeof value !== "object") return value;
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      deepFreeze(value[keys[index]]);
    }
    return objectFreeze(value);
  }

  function hasExactOwnKeys(actualKeys, expectedKeys) {
    if (actualKeys.length !== expectedKeys.length) return false;
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      let found = false;
      for (let actualIndex = 0; actualIndex < actualKeys.length; actualIndex += 1) {
        if (actualKeys[actualIndex] === expectedKeys[expectedIndex]) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function snapshotObject(value, expectedKeys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || !hasExactOwnKeys(ownKeys, expectedKeys)) return null;

    const snapshot = {};
    for (let index = 0; index < expectedKeys.length; index += 1) {
      const key = expectedKeys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  }

  function snapshotFixedArray(value, exactLength) {
    if (value === null || typeof value !== "object") return null;
    let nativeArray;
    let prototype;
    let ownKeys;
    try {
      nativeArray = arrayIsArray(value);
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (!nativeArray || prototype !== arrayPrototype || ownKeys.length !== exactLength + 1) {
      return null;
    }

    let lengthDescriptor;
    try {
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
      || lengthDescriptor.value !== exactLength) return null;

    const snapshot = [];
    for (let index = 0; index < exactLength; index += 1) {
      const key = String(index);
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[index] = descriptor.value;
    }
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (key === "length") continue;
      if (typeof key !== "string") return null;
      let expected = false;
      for (let itemIndex = 0; itemIndex < exactLength; itemIndex += 1) {
        if (key === String(itemIndex)) {
          expected = true;
          break;
        }
      }
      if (!expected) return null;
    }
    return snapshot;
  }

  function snapshotDenseArray(value) {
    if (value === null || typeof value !== "object") return null;
    let nativeArray;
    let prototype;
    let ownKeys;
    try {
      nativeArray = arrayIsArray(value);
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
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
      || ownKeys.length !== lengthDescriptor.value + 1) return null;

    const snapshot = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, String(index));
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[index] = descriptor.value;
    }
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (key === "length") continue;
      if (typeof key !== "string") return null;
      let expected = false;
      for (let itemIndex = 0; itemIndex < lengthDescriptor.value; itemIndex += 1) {
        if (key === String(itemIndex)) {
          expected = true;
          break;
        }
      }
      if (!expected) return null;
    }
    return snapshot;
  }

  function hasLoneSurrogate(raw) {
    for (let index = 0; index < raw.length; index += 1) {
      const unit = call(stringCharCodeAt, raw, [index]);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= raw.length) return true;
        const next = call(stringCharCodeAt, raw, [index + 1]);
        if (next < 0xdc00 || next > 0xdfff) return true;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  function hasForbiddenControl(raw, allowLf) {
    for (let index = 0; index < raw.length; index += 1) {
      const unit = call(stringCharCodeAt, raw, [index]);
      if ((unit <= 0x1f && !(allowLf && unit === 0x0a))
        || (unit >= 0x7f && unit <= 0x9f)
        || unit === 0x2028 || unit === 0x2029) return true;
    }
    return false;
  }

  function countCodePoints(raw) {
    let count = 0;
    for (let index = 0; index < raw.length; index += 1) {
      const unit = call(stringCharCodeAt, raw, [index]);
      if (unit >= 0xd800 && unit <= 0xdbff) index += 1;
      count += 1;
    }
    return count;
  }

  function sanitizeText(raw, minimum, maximum, allowLf, maximumLines) {
    if (typeof raw !== "string" || hasLoneSurrogate(raw)
      || hasForbiddenControl(raw, allowLf)) return null;
    let value;
    try {
      value = call(stringNormalize, raw, ["NFC"]);
      value = call(stringTrim, value, []);
    } catch (_error) {
      return null;
    }
    const length = countCodePoints(value);
    if (length < minimum || length > maximum) return null;
    if (allowLf) {
      let lines = 1;
      for (let index = 0; index < value.length; index += 1) {
        if (call(stringCharCodeAt, value, [index]) === 0x0a) lines += 1;
      }
      if (lines > maximumLines) return null;
    }
    return value;
  }

  function validId(value) {
    return typeof value === "string" && call(regexpTest, ID_PATTERN, [value]);
  }

  function contains(list, value) {
    for (let index = 0; index < list.length; index += 1) {
      if (list[index] === value) return true;
    }
    return false;
  }

  function contentContainsId(content, value) {
    for (let index = 0; index < content.candles.length; index += 1) {
      if (content.candles[index].id === value) return true;
    }
    return false;
  }

  function validateContent(candidate, requireCanonical) {
    const snapshot = snapshotObject(candidate, CONFIG_KEYS);
    if (snapshot === null) return null;
    const candlesSnapshot = snapshotFixedArray(snapshot.candles, CANDLE_COUNT);
    if (candlesSnapshot === null) return null;

    const recipient = sanitizeText(snapshot.recipient, 1, 12, false, 1);
    const finalTitle = sanitizeText(snapshot.finalTitle, 2, 32, false, 1);
    const finalMessage = sanitizeText(snapshot.finalMessage, 1, 180, true, 4);
    const signature = sanitizeText(snapshot.signature, 1, 36, false, 1);
    if (recipient === null || finalTitle === null || finalMessage === null || signature === null) {
      return null;
    }
    if (requireCanonical && (recipient !== snapshot.recipient || finalTitle !== snapshot.finalTitle
      || finalMessage !== snapshot.finalMessage || signature !== snapshot.signature)) return null;

    const candles = [];
    const ids = [];
    const labels = [];
    for (let index = 0; index < CANDLE_COUNT; index += 1) {
      const item = snapshotObject(candlesSnapshot[index], CANDLE_KEYS);
      if (item === null) return null;
      const id = sanitizeText(item.id, 1, 24, false, 1);
      const label = sanitizeText(item.label, 2, 12, false, 1);
      const cue = sanitizeText(item.cue, 4, 32, false, 1);
      const wish = sanitizeText(item.wish, 8, 56, false, 1);
      if (id === null || !validId(id) || label === null || cue === null || wish === null
        || contains(ids, id) || contains(labels, label)) return null;
      if (requireCanonical && (id !== item.id || label !== item.label
        || cue !== item.cue || wish !== item.wish)) return null;
      ids[index] = id;
      labels[index] = label;
      candles[index] = { id, label, cue, wish };
    }

    return deepFreeze({ recipient, finalTitle, finalMessage, signature, candles });
  }

  const DEFAULT_CONFIG = validateContent(DEFAULT_CONFIG_SOURCE, true);
  if (DEFAULT_CONFIG === null) throw new Error("internal contract: invalid candle config");

  function sanitizeConfig(candidate) {
    const content = validateContent(candidate, false);
    return content === null ? DEFAULT_CONFIG : content;
  }

  function snapshotState(candidate) {
    const state = snapshotObject(candidate, STATE_KEYS);
    if (state === null || state.version !== VERSION || !contains(PHASES, state.phase)
      || !numberIsSafeInteger(state.cursor) || state.cursor < 0 || state.cursor > CANDLE_COUNT
      || !numberIsSafeInteger(state.revision) || state.revision < 0
      || state.revision > MAX_REVISION) return null;
    const content = validateContent(state.content, true);
    if (content === null) return null;
    const litIds = snapshotFixedArray(state.litIds, state.cursor);
    if (litIds === null) return null;
    for (let index = 0; index < state.cursor; index += 1) {
      if (typeof litIds[index] !== "string"
        || litIds[index] !== content.candles[index].id) return null;
    }

    if (state.phase === "intro") {
      if (state.cursor !== 0 || state.revision > MAX_REVISION - 7) return null;
    } else if (state.phase === "lighting") {
      if (state.cursor > 4
        || state.revision > MAX_REVISION - (6 - state.cursor)) return null;
    } else if (state.phase === "ready-to-receive") {
      if (state.cursor !== 5 || state.revision > MAX_REVISION - 1) return null;
    } else if (state.cursor !== 5) {
      return null;
    }

    return {
      version: VERSION,
      phase: state.phase,
      content,
      litIds,
      cursor: state.cursor,
      revision: state.revision,
    };
  }

  function createInitialState(candidateConfig) {
    return buildState("intro", sanitizeConfig(candidateConfig), [], 0, 0);
  }

  function snapshotAction(candidate) {
    if (candidate === null || typeof candidate !== "object") return null;
    let prototype;
    let ownKeys;
    let typeDescriptor;
    try {
      prototype = reflectGetPrototypeOf(candidate);
      ownKeys = reflectOwnKeys(candidate);
      typeDescriptor = reflectGetOwnPropertyDescriptor(candidate, "type");
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || typeDescriptor === undefined
      || !("value" in typeDescriptor) || typeof typeDescriptor.value !== "string") return null;
    const type = typeDescriptor.value;
    const expectedKeys = type === "TRY_CANDLE" ? ["type", "id"] : ["type"];
    if (type !== "START" && type !== "TRY_CANDLE"
      && type !== "REVEAL" && type !== "RESTART") return null;
    if (!hasExactOwnKeys(ownKeys, expectedKeys)) return null;

    if (type !== "TRY_CANDLE") return { type };
    let idDescriptor;
    try {
      idDescriptor = reflectGetOwnPropertyDescriptor(candidate, "id");
    } catch (_error) {
      return null;
    }
    if (idDescriptor === undefined || !("value" in idDescriptor)
      || !validId(idDescriptor.value)) return null;
    return { type, id: idDescriptor.value };
  }

  function buildState(phase, content, litIds, cursor, revision) {
    const ids = [];
    for (let index = 0; index < litIds.length; index += 1) ids[index] = litIds[index];
    return deepFreeze({
      version: VERSION,
      phase,
      content,
      litIds: ids,
      cursor,
      revision,
    });
  }

  function reduceSnapshot(candidateState, state, action) {
    if (action.type === "START") {
      if (state.phase !== "intro" || state.revision > MAX_REVISION - 7) {
        return candidateState;
      }
      return buildState("lighting", state.content, [], 0, state.revision + 1);
    }

    if (action.type === "TRY_CANDLE") {
      if (state.phase !== "lighting") return candidateState;
      const currentId = state.content.candles[state.cursor].id;
      if (!contentContainsId(state.content, action.id)
        || contains(state.litIds, action.id) || action.id !== currentId) {
        return candidateState;
      }
      const litIds = [];
      for (let index = 0; index < state.litIds.length; index += 1) {
        litIds[index] = state.litIds[index];
      }
      litIds[litIds.length] = action.id;
      const cursor = state.cursor + 1;
      const phase = cursor === CANDLE_COUNT ? "ready-to-receive" : "lighting";
      return buildState(phase, state.content, litIds, cursor, state.revision + 1);
    }

    if (action.type === "REVEAL") {
      if (state.phase !== "ready-to-receive" || state.revision > MAX_REVISION - 1) {
        return candidateState;
      }
      return buildState("complete", state.content, state.litIds,
        CANDLE_COUNT, state.revision + 1);
    }

    if (action.type === "RESTART") {
      if (state.phase !== "complete" || state.revision > MAX_REVISION - 8) {
        return candidateState;
      }
      return buildState("intro", state.content, [], 0, state.revision + 1);
    }

    return candidateState;
  }

  function reduce(candidateState, candidateAction) {
    const state = snapshotState(candidateState);
    if (state === null) return createInitialState();
    const action = snapshotAction(candidateAction);
    if (action === null) return candidateState;
    return reduceSnapshot(candidateState, state, action);
  }

  function replaySession(initialConfig, candidateActions) {
    const actions = snapshotDenseArray(candidateActions);
    if (actions === null) return null;
    let state = createInitialState(initialConfig);
    for (let index = 0; index < actions.length; index += 1) {
      const action = snapshotAction(actions[index]);
      if (action === null) return null;
      const stateSnapshot = snapshotState(state);
      if (stateSnapshot === null) return null;
      state = reduceSnapshot(state, stateSnapshot, action);
    }
    return state;
  }

  function makePrimaryAction(visible, label, action, disabled) {
    return {
      visible,
      label,
      action,
      disabled,
    };
  }

  function baseView(state, progressText) {
    return {
      phase: state.phase,
      publicTitle: PUBLIC_TITLE,
      instructions: INSTRUCTIONS,
      privacyText: PRIVACY_TEXT,
      progressText,
    };
  }

  function projectCandles(state) {
    const candles = [];
    for (let displayIndex = 0; displayIndex < CANDLE_COUNT; displayIndex += 1) {
      const routeIndex = DISPLAY_PERMUTATION[displayIndex];
      const candle = state.content.candles[routeIndex];
      const lit = routeIndex < state.cursor;
      candles[displayIndex] = {
        id: candle.id,
        label: candle.label,
        lit,
        disabled: lit,
      };
    }
    return candles;
  }

  function projectWishes(state) {
    const wishes = [];
    for (let index = 0; index < state.cursor; index += 1) {
      wishes[index] = {
        label: state.content.candles[index].label,
        wish: state.content.candles[index].wish,
      };
    }
    return wishes;
  }

  function getPublicView(candidateState) {
    const state = snapshotState(candidateState);
    if (state === null) return null;

    if (state.phase === "intro") {
      const view = baseView(state, "还没有点亮第一盏。");
      view.primaryAction = makePrimaryAction(true, "开始点亮", "START", false);
      return deepFreeze(view);
    }

    let progressText;
    if (state.phase === "lighting") {
      progressText = `已经点亮 ${state.cursor} / 5 盏。`;
    } else if (state.phase === "ready-to-receive") {
      progressText = "五盏都亮了。愿望还在等你收下。";
    } else {
      progressText = "这些愿望都交给你了。";
    }
    const view = baseView(state, progressText);
    if (state.phase === "lighting") view.currentCue = state.content.candles[state.cursor].cue;
    view.candles = projectCandles(state);
    view.revealedWishes = projectWishes(state);

    if (state.phase === "ready-to-receive") {
      view.primaryAction = makePrimaryAction(true, "收下这些愿望", "REVEAL", false);
    } else if (state.phase === "complete") {
      view.result = {
        recipientLine: `给${state.content.recipient}`,
        title: state.content.finalTitle,
        message: state.content.finalMessage,
        signature: state.content.signature,
      };
      view.primaryAction = makePrimaryAction(
        true,
        "再看一次",
        "RESTART",
        state.revision > MAX_REVISION - 8,
      );
    } else {
      view.primaryAction = makePrimaryAction(false, "", null, true);
    }
    return deepFreeze(view);
  }

  return deepFreeze({
    VERSION,
    CANDLE_COUNT,
    DISPLAY_PERMUTATION,
    MAX_REVISION,
    PUBLIC_TITLE,
    INSTRUCTIONS,
    PRIVACY_TEXT,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    reduce,
    replaySession,
    getPublicView,
  });
});
