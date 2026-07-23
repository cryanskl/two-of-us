(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SNOW_GLOBE_MESSAGE_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const objectFreeze = Object.freeze;
  const stringTrim = String.prototype.trim;
  const stringCharCodeAt = String.prototype.charCodeAt;
  const stringPadStart = String.prototype.padStart;
  const arrayJoin = Array.prototype.join;
  const stringConstructor = String;
  const numberIsSafeInteger = Number.isSafeInteger;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;

  const VERSION = 1;
  const GRID_ROWS = 9;
  const GRID_COLUMNS = 11;
  const MIN_ACTIVE_CELLS = 16;
  const MAX_ACTIVE_CELLS = 72;
  const COORD_SCALE = 1000;
  const INNER_THRESHOLD = 100;
  const OUTER_THRESHOLD = 260;
  const TARGET_X_ORIGIN = 140;
  const TARGET_X_STEP = 72;
  const TARGET_Y_ORIGIN = 130;
  const TARGET_Y_STEP = 78;
  const DISPLAY_FLAKES = 72;
  const SETTLE_DURATION_MS = 900;
  const SETTLE_TIMEOUT_MS = 1400;
  const MAX_REVISION = 9007199254740991;

  const DIRECTIONS = deepFreeze(["up", "right", "down", "left"]);
  const DIRECTION_LABELS = deepFreeze({
    up: "上",
    right: "右",
    down: "下",
    left: "左",
  });
  const CONFIG_KEYS = deepFreeze([
    "recipient", "sender", "patternRows", "patternLabel", "finalTitle", "finalNote",
  ]);
  const WINDS_KEYS = deepFreeze(["up", "right", "down", "left"]);
  const STATE_KEYS = deepFreeze([
    "version", "phase", "content", "winds", "settleToken", "revision",
  ]);
  const PHASES = deepFreeze(["intro", "gathering", "armed", "settling", "complete"]);

  const DEFAULT_CONFIG_SOURCE = deepFreeze({
    recipient: "你",
    sender: "我",
    patternRows: [
      ".###...###.",
      "#####.#####",
      "###########",
      "###########",
      ".#########.",
      "..#######..",
      "...#####...",
      "....###....",
      ".....#.....",
    ],
    patternLabel: "一颗由雪花拼成的心",
    finalTitle: "雪停以后，是你",
    finalNote: "风停下来的时候，我还是最想把这句话留给你。",
  });

  const DEFAULT_CONFIG = validateContent(DEFAULT_CONFIG_SOURCE);
  if (DEFAULT_CONFIG === null) throw new Error("internal contract: invalid snow globe config");

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

  function snapshotObject(value, keys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || !hasExactOwnKeys(ownKeys, keys)) return null;

    const result = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  }

  function snapshotArray(value, exactLength) {
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
      || lengthDescriptor.value !== exactLength || ownKeys.length !== exactLength + 1) return null;

    const result = [];
    for (let index = 0; index < exactLength; index += 1) {
      const key = String(index);
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (key === "length") continue;
      if (typeof key !== "string") return null;
      let validIndex = false;
      for (let itemIndex = 0; itemIndex < exactLength; itemIndex += 1) {
        if (key === String(itemIndex)) {
          validIndex = true;
          break;
        }
      }
      if (!validIndex) return null;
    }
    return result;
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
        || (unit >= 0x7f && unit <= 0x9f) || unit === 0x2028 || unit === 0x2029) return true;
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
      value = call(stringTrim, raw, []);
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

  function snapshotPatternRows(value) {
    const rows = snapshotArray(value, GRID_ROWS);
    if (rows === null) return null;
    const copy = [];
    let activeCount = 0;
    for (let rowIndex = 0; rowIndex < GRID_ROWS; rowIndex += 1) {
      const row = rows[rowIndex];
      if (typeof row !== "string" || row.length !== GRID_COLUMNS) return null;
      for (let columnIndex = 0; columnIndex < GRID_COLUMNS; columnIndex += 1) {
        const character = call(stringCharCodeAt, row, [columnIndex]);
        if (character === 0x23) activeCount += 1;
        else if (character !== 0x2e) return null;
      }
      copy[rowIndex] = row;
    }
    if (activeCount < MIN_ACTIVE_CELLS || activeCount > MAX_ACTIVE_CELLS) return null;
    return { rows: copy, activeCount };
  }

  function validateContent(candidate) {
    const snapshot = snapshotObject(candidate, CONFIG_KEYS);
    if (snapshot === null) return null;
    const recipient = sanitizeText(snapshot.recipient, 1, 12, false, 1);
    const sender = sanitizeText(snapshot.sender, 1, 12, false, 1);
    const pattern = snapshotPatternRows(snapshot.patternRows);
    const patternLabel = sanitizeText(snapshot.patternLabel, 2, 32, false, 1);
    const finalTitle = sanitizeText(snapshot.finalTitle, 2, 24, false, 1);
    const finalNote = sanitizeText(snapshot.finalNote, 1, 180, true, 4);
    if (recipient === null || sender === null || recipient === sender || pattern === null
      || patternLabel === null || finalTitle === null || finalNote === null) return null;
    return deepFreeze({
      recipient,
      sender,
      patternRows: pattern.rows,
      patternLabel,
      finalTitle,
      finalNote,
    });
  }

  function sanitizeConfig(candidate) {
    const content = validateContent(candidate);
    return content === null ? DEFAULT_CONFIG : content;
  }

  function buildTargets(patternRows) {
    const pattern = snapshotPatternRows(patternRows);
    if (pattern === null) return null;
    const targets = [];
    let ordinal = 0;
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        if (call(stringCharCodeAt, pattern.rows[row], [column]) !== 0x23) continue;
        const ordinalText = stringConstructor(ordinal);
        targets[ordinal] = {
          id: `p${call(stringPadStart, ordinalText, [2, "0"])}`,
          x: TARGET_X_ORIGIN + TARGET_X_STEP * column,
          y: TARGET_Y_ORIGIN + TARGET_Y_STEP * row,
        };
        ordinal += 1;
      }
    }
    return deepFreeze(targets);
  }

  function classifyWindSample(latched, dx, dy) {
    if (typeof latched !== "boolean" || !numberIsSafeInteger(dx) || !numberIsSafeInteger(dy)
      || dx < -COORD_SCALE || dx > COORD_SCALE
      || dy < -COORD_SCALE || dy > COORD_SCALE) return null;
    const absoluteX = dx < 0 ? -dx : dx;
    const absoluteY = dy < 0 ? -dy : dy;
    const reach = absoluteX > absoluteY ? absoluteX : absoluteY;
    if (latched) {
      if (reach <= INNER_THRESHOLD) return deepFreeze({ latched: false, direction: null });
      return deepFreeze({ latched: true, direction: null });
    }
    if (reach < OUTER_THRESHOLD) return deepFreeze({ latched: false, direction: null });
    let direction;
    if (absoluteX > absoluteY) direction = dx > 0 ? "right" : "left";
    else direction = dy > 0 ? "down" : "up";
    return deepFreeze({ latched: true, direction });
  }

  function makeEmptyWinds() {
    return { up: false, right: false, down: false, left: false };
  }

  function snapshotWinds(value) {
    const snapshot = snapshotObject(value, WINDS_KEYS);
    if (snapshot === null) return null;
    for (let index = 0; index < WINDS_KEYS.length; index += 1) {
      if (typeof snapshot[WINDS_KEYS[index]] !== "boolean") return null;
    }
    return snapshot;
  }

  function countWinds(winds) {
    let count = 0;
    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      if (winds[DIRECTIONS[index]]) count += 1;
    }
    return count;
  }

  function includes(list, value) {
    for (let index = 0; index < list.length; index += 1) {
      if (list[index] === value) return true;
    }
    return false;
  }

  function snapshotState(candidate) {
    const state = snapshotObject(candidate, STATE_KEYS);
    if (state === null || state.version !== VERSION || !includes(PHASES, state.phase)
      || !numberIsSafeInteger(state.revision) || state.revision < 0
      || state.revision > MAX_REVISION) return null;
    const winds = snapshotWinds(state.winds);
    if (winds === null) return null;
    const windCount = countWinds(winds);
    let content = null;

    if (state.phase === "intro") {
      if (state.content !== null || windCount !== 0 || state.settleToken !== null) return null;
    } else {
      content = validateContent(state.content);
      if (content === null) return null;
    }

    if (state.phase === "gathering") {
      if (windCount > 3 || state.settleToken !== null
        || state.revision > MAX_REVISION - (6 - windCount)) return null;
    } else if (state.phase === "armed") {
      if (windCount !== 4 || state.settleToken !== null
        || state.revision > MAX_REVISION - 2) return null;
    } else if (state.phase === "settling") {
      if (windCount !== 4 || !numberIsSafeInteger(state.settleToken)
        || state.settleToken !== state.revision
        || state.revision > MAX_REVISION - 1) return null;
    } else if (state.phase === "complete") {
      if (windCount !== 4 || state.settleToken !== null) return null;
    }

    return {
      version: VERSION,
      phase: state.phase,
      content,
      winds,
      settleToken: state.settleToken,
      revision: state.revision,
    };
  }

  function createInitialState() {
    return deepFreeze({
      version: VERSION,
      phase: "intro",
      content: null,
      winds: makeEmptyWinds(),
      settleToken: null,
      revision: 0,
    });
  }

  function createStartAction(rawConfig) {
    const content = sanitizeConfig(rawConfig);
    if (content === null) return null;
    return deepFreeze({ type: "START", content });
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
    if (prototype !== objectPrototype || typeDescriptor === undefined || !("value" in typeDescriptor)
      || typeof typeDescriptor.value !== "string") return null;
    const type = typeDescriptor.value;
    let keys;
    if (type === "START") keys = ["type", "content"];
    else if (type === "ADD_WIND") keys = ["type", "direction"];
    else if (type === "COMPLETE_SETTLE") keys = ["type", "settleToken"];
    else if (type === "BEGIN_SETTLE" || type === "RESTART") keys = ["type"];
    else return null;
    if (!hasExactOwnKeys(ownKeys, keys)) return null;

    const snapshot = { type };
    for (let index = 1; index < keys.length; index += 1) {
      const key = keys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(candidate, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  }

  function buildState(phase, content, winds, settleToken, revision) {
    return deepFreeze({
      version: VERSION,
      phase,
      content,
      winds,
      settleToken,
      revision,
    });
  }

  function reduce(candidateState, candidateAction) {
    const state = snapshotState(candidateState);
    if (state === null) return createInitialState();
    const action = snapshotAction(candidateAction);
    if (action === null) return candidateState;

    if (action.type === "START") {
      if (state.phase !== "intro" || state.revision > MAX_REVISION - 7) return candidateState;
      const content = validateContent(action.content);
      if (content === null) return candidateState;
      return buildState("gathering", content, makeEmptyWinds(), null, state.revision + 1);
    }

    if (action.type === "ADD_WIND") {
      if (state.phase !== "gathering" || !includes(DIRECTIONS, action.direction)
        || state.winds[action.direction]) return candidateState;
      const winds = {
        up: state.winds.up,
        right: state.winds.right,
        down: state.winds.down,
        left: state.winds.left,
      };
      winds[action.direction] = true;
      const phase = countWinds(winds) === 4 ? "armed" : "gathering";
      return buildState(phase, state.content, winds, null, state.revision + 1);
    }

    if (action.type === "BEGIN_SETTLE") {
      if (state.phase !== "armed" || state.revision > MAX_REVISION - 2) return candidateState;
      const token = state.revision + 1;
      return buildState("settling", state.content, state.winds, token, token);
    }

    if (action.type === "COMPLETE_SETTLE") {
      if (state.phase !== "settling" || !numberIsSafeInteger(action.settleToken)
        || action.settleToken !== state.settleToken) return candidateState;
      return buildState("complete", state.content, state.winds, null, state.revision + 1);
    }

    if (action.type === "RESTART") {
      if (state.phase !== "complete" || state.revision > MAX_REVISION - 8) return candidateState;
      return buildState("intro", null, makeEmptyWinds(), null, state.revision + 1);
    }

    return candidateState;
  }

  function makeIntroView(revision) {
    return deepFreeze({
      phase: "intro",
      windControls: [
        { id: "up", label: "上", collected: false },
        { id: "right", label: "右", collected: false },
        { id: "down", label: "下", collected: false },
        { id: "left", label: "左", collected: false },
      ],
      collectedCount: 0,
      progressText: "正在把这只雪球准备好。",
      missingLabels: ["上", "右", "下", "左"],
      canStart: revision <= MAX_REVISION - 7,
      canAddWind: false,
      canBeginSettle: false,
      canRestart: false,
      isSettling: false,
      settleToken: null,
      visibleTargets: [],
      patternLabel: null,
      recipient: null,
      sender: null,
      finalTitle: null,
      finalNote: null,
      revision,
    });
  }

  function getPublicView(candidateState) {
    const state = snapshotState(candidateState);
    if (state === null) return makeIntroView(0);
    if (state.phase === "intro") return makeIntroView(state.revision);

    const windControls = [];
    const missingLabels = [];
    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      const id = DIRECTIONS[index];
      const collected = state.winds[id];
      windControls[index] = { id, label: DIRECTION_LABELS[id], collected };
      if (!collected) missingLabels[missingLabels.length] = DIRECTION_LABELS[id];
    }
    const collectedCount = countWinds(state.winds);
    let progressText;
    if (state.phase === "gathering") {
      progressText = `已收好 ${collectedCount} / 4 阵风；还差：${call(arrayJoin, missingLabels, ["、"])}`;
    } else if (state.phase === "armed") {
      progressText = "四阵风都在了。准备好，就让雪落下。";
    } else if (state.phase === "settling") {
      progressText = "雪正在慢慢找到位置。";
    } else {
      progressText = "雪已经停下，留言在这里。";
    }

    const complete = state.phase === "complete";
    const settling = state.phase === "settling";
    return deepFreeze({
      phase: state.phase,
      windControls,
      collectedCount,
      progressText,
      missingLabels,
      canStart: false,
      canAddWind: state.phase === "gathering",
      canBeginSettle: state.phase === "armed" && state.revision <= MAX_REVISION - 2,
      canRestart: complete && state.revision <= MAX_REVISION - 8,
      isSettling: settling,
      settleToken: settling ? state.settleToken : null,
      visibleTargets: settling || complete ? buildTargets(state.content.patternRows) : [],
      patternLabel: complete ? state.content.patternLabel : null,
      recipient: complete ? state.content.recipient : null,
      sender: complete ? state.content.sender : null,
      finalTitle: complete ? state.content.finalTitle : null,
      finalNote: complete ? state.content.finalNote : null,
      revision: state.revision,
    });
  }

  return deepFreeze({
    VERSION,
    DIRECTIONS,
    DIRECTION_LABELS,
    GRID_ROWS,
    GRID_COLUMNS,
    MIN_ACTIVE_CELLS,
    MAX_ACTIVE_CELLS,
    COORD_SCALE,
    INNER_THRESHOLD,
    OUTER_THRESHOLD,
    TARGET_X_ORIGIN,
    TARGET_X_STEP,
    TARGET_Y_ORIGIN,
    TARGET_Y_STEP,
    DISPLAY_FLAKES,
    SETTLE_DURATION_MS,
    SETTLE_TIMEOUT_MS,
    MAX_REVISION,
    DEFAULT_CONFIG,
    sanitizeConfig,
    buildTargets,
    classifyWindSample,
    createInitialState,
    createStartAction,
    reduce,
    getPublicView,
  });
});
