(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.VINYL_SECRET_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const arrayFrom = Array.from;
  const objectFreeze = Object.freeze;
  const objectIsFrozen = Object.isFrozen;
  const numberIsSafeInteger = Number.isSafeInteger;
  const stringTrim = String.prototype.trim;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;

  const VERSION = 1;
  const GROOVE_COUNT = 12;
  const TRACK_COUNT = 3;
  const TRACK_SETTLE_MS = 420;
  const MAX_COUNTER = Number.MAX_SAFE_INTEGER;

  const SIGNAL_CODES = deepFreeze(["quiet", "warm", "near", "clear"]);
  const SIGNAL_LABELS = deepFreeze({
    quiet: "寂静",
    warm: "微响",
    near: "靠近",
    clear: "清晰",
  });
  const DEFAULT_TARGETS = deepFreeze([3, 7, 11]);
  const PHASES = deepFreeze(["intro", "seeking", "playing", "track-result", "complete"]);
  const SETTLE_REASONS = deepFreeze([
    "timer",
    "reduced-motion",
    "hidden",
    "pagehide",
  ]);
  const ACTION_TYPES = deepFreeze([
    "START",
    "MOVE",
    "DROP_NEEDLE",
    "SETTLE_TRACK",
    "NEXT",
    "RESTART",
  ]);

  const CONFIG_KEYS = deepFreeze([
    "recipientName",
    "finalEyebrow",
    "finalTitle",
    "finalMessage",
    "signature",
    "tracks",
  ]);
  const TRACK_KEYS = deepFreeze([
    "id",
    "targetGroove",
    "clue",
    "note",
    "audioSrc",
  ]);
  const STATE_KEYS = deepFreeze([
    "version",
    "phase",
    "trackIndex",
    "cursorGroove",
    "foundTrackIds",
    "pendingTrackId",
    "pendingToken",
    "lastToken",
    "noticeSerial",
    "lastNotice",
    "revision",
  ]);
  const NOTICE_CODES = deepFreeze([
    "started",
    "miss",
    "hit",
    "settled",
    "advanced",
    "completed",
    "restarted",
  ]);
  const AUDIO_PATH =
    /^\.\/assets\/private-audio\/[A-Za-z0-9][A-Za-z0-9._-]*\.(mp3|wav|ogg)$/;

  const DEFAULT_CONFIG = deepFreeze({
    recipientName: "给你",
    finalEyebrow: "SIDE US · PRIVATE PRESSING",
    finalTitle: "这一张，想一直和你听下去",
    finalMessage:
      "谢谢你把三段声音都找到。没有播放出来的部分，也已经被我们一起走过的日子填满。",
    signature: "留给愿意把针落在这里的你",
    tracks: [
      {
        id: "first-chat",
        targetGroove: 3,
        clue: "先从外圈找起，那里像我们第一次把话说慢。",
        note: "我最想重播的，不是哪一首歌，是第一次和你聊到忘记时间。",
        audioSrc: null,
      },
      {
        id: "ordinary-day",
        targetGroove: 7,
        clue: "下一段在唱片中间，像普通日子忽然发亮。",
        note: "后来我才发现，最安静的日子也会因为你有了旋律。",
        audioSrc: null,
      },
      {
        id: "many-tomorrows",
        targetGroove: 11,
        clue: "最后一段靠近标签，留给还没发生的以后。",
        note: "唱片会转到尽头，但我还想和你一起听很多个以后。",
        audioSrc: null,
      },
    ],
  });

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function deepFreeze(value) {
    if (value === null || typeof value !== "object") return value;
    let frozen = false;
    try {
      frozen = objectIsFrozen(value);
    } catch (_error) {
      return value;
    }
    if (frozen) return value;
    let keys;
    try {
      keys = reflectOwnKeys(value);
    } catch (_error) {
      return value;
    }
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value);
    }
    return objectFreeze(value);
  }

  function hasExactOwnKeys(actualKeys, expectedKeys) {
    if (actualKeys.length !== expectedKeys.length) return false;
    for (let index = 0; index < actualKeys.length; index += 1) {
      if (typeof actualKeys[index] !== "string") return false;
    }
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

    const result = {};
    for (let index = 0; index < expectedKeys.length; index += 1) {
      const key = expectedKeys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (!descriptor || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  }

  function snapshotDenseArray(value, maximumLength) {
    let isArray;
    let prototype;
    let ownKeys;
    let lengthDescriptor;
    try {
      isArray = arrayIsArray(value);
      if (!isArray) return null;
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (prototype !== arrayPrototype || !lengthDescriptor || !("value" in lengthDescriptor)) {
      return null;
    }
    const length = lengthDescriptor.value;
    if (!numberIsSafeInteger(length) || length < 0 || length > maximumLength) return null;

    const expectedKeys = [];
    for (let index = 0; index < length; index += 1) expectedKeys[index] = String(index);
    expectedKeys[length] = "length";
    if (!hasExactOwnKeys(ownKeys, expectedKeys)) return null;

    const result = [];
    for (let index = 0; index < length; index += 1) {
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, String(index));
      } catch (_error) {
        return null;
      }
      if (!descriptor || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }
    return result;
  }

  function cleanText(value, minimum, maximum) {
    if (typeof value !== "string") return null;
    let cleaned;
    try {
      cleaned = call(stringTrim, value, []);
    } catch (_error) {
      return null;
    }
    const length = arrayFrom(cleaned).length;
    if (length < minimum || length > maximum) return null;
    return cleaned;
  }

  function includes(list, value) {
    for (let index = 0; index < list.length; index += 1) {
      if (list[index] === value) return true;
    }
    return false;
  }

  function parseTrack(candidate) {
    const track = snapshotObject(candidate, TRACK_KEYS);
    if (!track) return null;
    const id = cleanText(track.id, 1, 32);
    const clue = cleanText(track.clue, 1, 72);
    const note = cleanText(track.note, 1, 160);
    if (!id || !/^[a-z][a-z0-9-]{0,31}$/.test(id) || !clue || !note
      || !numberIsSafeInteger(track.targetGroove)
      || track.targetGroove < 1 || track.targetGroove > GROOVE_COUNT) {
      return null;
    }

    let audioSrc = null;
    if (track.audioSrc !== null) {
      audioSrc = cleanText(track.audioSrc, 1, 120);
      if (!audioSrc || audioSrc.includes("..") || !AUDIO_PATH.test(audioSrc)) return null;
    }
    return {
      id,
      targetGroove: track.targetGroove,
      clue,
      note,
      audioSrc,
    };
  }

  function parseConfig(candidate) {
    const config = snapshotObject(candidate, CONFIG_KEYS);
    if (!config) return null;
    const recipientName = cleanText(config.recipientName, 1, 20);
    const finalEyebrow = cleanText(config.finalEyebrow, 1, 36);
    const finalTitle = cleanText(config.finalTitle, 1, 40);
    const finalMessage = cleanText(config.finalMessage, 1, 220);
    const signature = cleanText(config.signature, 1, 48);
    const rawTracks = snapshotDenseArray(config.tracks, TRACK_COUNT);
    if (!recipientName || !finalEyebrow || !finalTitle || !finalMessage || !signature
      || !rawTracks || rawTracks.length !== TRACK_COUNT) {
      return null;
    }

    const tracks = [];
    const ids = [];
    const targets = [];
    const clues = [];
    const notes = [];
    for (let index = 0; index < TRACK_COUNT; index += 1) {
      const track = parseTrack(rawTracks[index]);
      if (!track || includes(ids, track.id) || includes(targets, track.targetGroove)
        || includes(clues, track.clue) || includes(notes, track.note)) {
        return null;
      }
      ids[index] = track.id;
      targets[index] = track.targetGroove;
      clues[index] = track.clue;
      notes[index] = track.note;
      tracks[index] = track;
    }
    return deepFreeze({
      recipientName,
      finalEyebrow,
      finalTitle,
      finalMessage,
      signature,
      tracks,
    });
  }

  function sanitizeConfig(candidate) {
    return parseConfig(candidate) || DEFAULT_CONFIG;
  }

  function assertGroove(value, label) {
    if (!numberIsSafeInteger(value) || value < 1 || value > GROOVE_COUNT) {
      throw new TypeError(`${label} must be an integer from 1 through ${GROOVE_COUNT}`);
    }
  }

  function getSignal(cursorGroove, targetGroove) {
    assertGroove(cursorGroove, "cursorGroove");
    assertGroove(targetGroove, "targetGroove");
    const distance = Math.abs(cursorGroove - targetGroove);
    if (distance === 0) return "clear";
    if (distance === 1) return "near";
    if (distance <= 3) return "warm";
    return "quiet";
  }

  function copyFoundIds(value) {
    const items = snapshotDenseArray(value, TRACK_COUNT);
    if (!items) return null;
    const result = [];
    for (let index = 0; index < items.length; index += 1) {
      if (typeof items[index] !== "string") return null;
      result[index] = items[index];
    }
    return result;
  }

  function isNonNegativeCounter(value) {
    return numberIsSafeInteger(value) && value >= 0 && value <= MAX_COUNTER;
  }

  function parseState(candidate, config) {
    const state = snapshotObject(candidate, STATE_KEYS);
    if (!state || state.version !== VERSION || !includes(PHASES, state.phase)
      || !numberIsSafeInteger(state.trackIndex) || state.trackIndex < 0
      || state.trackIndex >= TRACK_COUNT) {
      return null;
    }
    try {
      assertGroove(state.cursorGroove, "cursorGroove");
    } catch (_error) {
      return null;
    }
    const foundTrackIds = copyFoundIds(state.foundTrackIds);
    if (!foundTrackIds || !isNonNegativeCounter(state.lastToken)
      || !isNonNegativeCounter(state.noticeSerial)
      || !isNonNegativeCounter(state.revision)
      || state.noticeSerial > state.revision
      || state.lastToken > state.noticeSerial) {
      return null;
    }
    if (state.lastNotice !== null && !includes(NOTICE_CODES, state.lastNotice)) return null;
    if ((state.pendingTrackId === null) !== (state.pendingToken === null)) return null;
    if (state.pendingTrackId !== null) {
      if (typeof state.pendingTrackId !== "string"
        || !numberIsSafeInteger(state.pendingToken)
        || state.pendingToken <= 0
        || state.pendingToken !== state.lastToken) {
        return null;
      }
    }

    for (let index = 0; index < foundTrackIds.length; index += 1) {
      if (foundTrackIds[index] !== config.tracks[index].id) return null;
    }

    if (state.phase === "intro") {
      if (state.trackIndex !== 0 || state.cursorGroove !== 1 || foundTrackIds.length !== 0
        || state.pendingTrackId !== null
        || (state.lastNotice !== null && state.lastNotice !== "restarted")
        || (state.lastNotice === null
          && (state.lastToken !== 0 || state.noticeSerial !== 0 || state.revision !== 0))
        || (state.lastNotice === "restarted" && state.noticeSerial === 0)) {
        return null;
      }
    } else if (state.phase === "seeking") {
      if (foundTrackIds.length !== state.trackIndex || state.pendingTrackId !== null
        || !includes(["started", "advanced", "miss"], state.lastNotice)
        || (state.lastNotice === "started" && state.trackIndex !== 0)
        || (state.lastNotice === "advanced" && state.trackIndex === 0)) {
        return null;
      }
    } else if (state.phase === "playing") {
      if (foundTrackIds.length !== state.trackIndex
        || state.pendingTrackId !== config.tracks[state.trackIndex].id
        || state.lastNotice !== "hit") {
        return null;
      }
    } else if (state.phase === "track-result") {
      if (state.trackIndex >= TRACK_COUNT - 1
        || foundTrackIds.length !== state.trackIndex + 1
        || state.pendingTrackId !== null
        || state.lastNotice !== "settled") {
        return null;
      }
    } else if (state.phase === "complete") {
      if (state.trackIndex !== TRACK_COUNT - 1
        || foundTrackIds.length !== TRACK_COUNT
        || state.pendingTrackId !== null
        || state.lastNotice !== "completed") {
        return null;
      }
    }

    return {
      version: VERSION,
      phase: state.phase,
      trackIndex: state.trackIndex,
      cursorGroove: state.cursorGroove,
      foundTrackIds,
      pendingTrackId: state.pendingTrackId,
      pendingToken: state.pendingToken,
      lastToken: state.lastToken,
      noticeSerial: state.noticeSerial,
      lastNotice: state.lastNotice,
      revision: state.revision,
    };
  }

  function assertState(candidate, rawConfig) {
    const config = sanitizeConfig(rawConfig);
    if (!parseState(candidate, config)) throw new TypeError("invalid vinyl-secret state");
    return true;
  }

  function makeState(values) {
    const foundTrackIds = [];
    for (let index = 0; index < values.foundTrackIds.length; index += 1) {
      foundTrackIds[index] = values.foundTrackIds[index];
    }
    return deepFreeze({
      version: VERSION,
      phase: values.phase,
      trackIndex: values.trackIndex,
      cursorGroove: values.cursorGroove,
      foundTrackIds,
      pendingTrackId: values.pendingTrackId,
      pendingToken: values.pendingToken,
      lastToken: values.lastToken,
      noticeSerial: values.noticeSerial,
      lastNotice: values.lastNotice,
      revision: values.revision,
    });
  }

  function createInitialState() {
    return makeState({
      phase: "intro",
      trackIndex: 0,
      cursorGroove: 1,
      foundTrackIds: [],
      pendingTrackId: null,
      pendingToken: null,
      lastToken: 0,
      noticeSerial: 0,
      lastNotice: null,
      revision: 0,
    });
  }

  function isCanonicalState(candidate) {
    try {
      return objectIsFrozen(candidate) && objectIsFrozen(candidate.foundTrackIds);
    } catch (_error) {
      return false;
    }
  }

  function snapshotAction(candidate) {
    if (candidate === null || typeof candidate !== "object") {
      throw new TypeError("action must be a plain object");
    }
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(candidate);
      ownKeys = reflectOwnKeys(candidate);
    } catch (_error) {
      throw new TypeError("action must be inspectable");
    }
    if (prototype !== objectPrototype) throw new TypeError("action must be a plain object");

    const snapshot = {};
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (typeof key !== "string") throw new TypeError("action may not contain symbol keys");
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(candidate, key);
      } catch (_error) {
        throw new TypeError("action must be inspectable");
      }
      if (!descriptor || !("value" in descriptor)) {
        throw new TypeError("action may only contain data properties");
      }
      snapshot[key] = descriptor.value;
    }

    const type = snapshot.type;
    if (!includes(ACTION_TYPES, type)) throw new TypeError("unknown action type");
    let expectedKeys = ["type"];
    if (type === "MOVE") expectedKeys = ["type", "groove"];
    if (type === "SETTLE_TRACK") expectedKeys = ["type", "token", "reason"];
    if (!hasExactOwnKeys(ownKeys, expectedKeys)) {
      throw new TypeError("action has an invalid field set");
    }
    if (type === "MOVE") assertGroove(snapshot.groove, "groove");
    if (type === "SETTLE_TRACK") {
      if (!numberIsSafeInteger(snapshot.token) || snapshot.token <= 0
        || !includes(SETTLE_REASONS, snapshot.reason)) {
        throw new TypeError("invalid SETTLE_TRACK action");
      }
    }
    return snapshot;
  }

  function canIncrement(value) {
    return value < MAX_COUNTER;
  }

  function currentOrCanonical(original, parsed) {
    return isCanonicalState(original) ? original : makeState(parsed);
  }

  function transition(state, action, rawConfig) {
    const config = sanitizeConfig(rawConfig);
    const parsed = parseState(state, config);
    if (!parsed) throw new TypeError("invalid vinyl-secret state");
    const parsedAction = snapshotAction(action);
    const current = currentOrCanonical(state, parsed);

    if (parsedAction.type === "START") {
      if (parsed.phase !== "intro"
        || !canIncrement(parsed.noticeSerial) || !canIncrement(parsed.revision)) {
        return current;
      }
      return makeState({
        ...parsed,
        phase: "seeking",
        lastNotice: "started",
        noticeSerial: parsed.noticeSerial + 1,
        revision: parsed.revision + 1,
      });
    }

    if (parsedAction.type === "MOVE") {
      if (parsed.phase !== "seeking" || parsed.cursorGroove === parsedAction.groove
        || !canIncrement(parsed.revision)) {
        return current;
      }
      return makeState({
        ...parsed,
        cursorGroove: parsedAction.groove,
        revision: parsed.revision + 1,
      });
    }

    if (parsedAction.type === "DROP_NEEDLE") {
      if (parsed.phase !== "seeking") return current;
      const currentTrack = config.tracks[parsed.trackIndex];
      const hit = getSignal(parsed.cursorGroove, currentTrack.targetGroove) === "clear";
      if (!canIncrement(parsed.noticeSerial) || !canIncrement(parsed.revision)
        || (hit && !canIncrement(parsed.lastToken))) {
        return current;
      }
      if (!hit) {
        return makeState({
          ...parsed,
          lastNotice: "miss",
          noticeSerial: parsed.noticeSerial + 1,
          revision: parsed.revision + 1,
        });
      }
      const token = parsed.lastToken + 1;
      return makeState({
        ...parsed,
        phase: "playing",
        pendingTrackId: currentTrack.id,
        pendingToken: token,
        lastToken: token,
        lastNotice: "hit",
        noticeSerial: parsed.noticeSerial + 1,
        revision: parsed.revision + 1,
      });
    }

    if (parsedAction.type === "SETTLE_TRACK") {
      if (parsed.phase !== "playing" || parsedAction.token !== parsed.pendingToken
        || !canIncrement(parsed.noticeSerial) || !canIncrement(parsed.revision)) {
        return current;
      }
      const foundTrackIds = parsed.foundTrackIds.slice();
      foundTrackIds[foundTrackIds.length] = parsed.pendingTrackId;
      const complete = parsed.trackIndex === TRACK_COUNT - 1;
      return makeState({
        ...parsed,
        phase: complete ? "complete" : "track-result",
        foundTrackIds,
        pendingTrackId: null,
        pendingToken: null,
        lastNotice: complete ? "completed" : "settled",
        noticeSerial: parsed.noticeSerial + 1,
        revision: parsed.revision + 1,
      });
    }

    if (parsedAction.type === "NEXT") {
      if (parsed.phase !== "track-result"
        || !canIncrement(parsed.noticeSerial) || !canIncrement(parsed.revision)) {
        return current;
      }
      return makeState({
        ...parsed,
        phase: "seeking",
        trackIndex: parsed.trackIndex + 1,
        cursorGroove: 1,
        lastNotice: "advanced",
        noticeSerial: parsed.noticeSerial + 1,
        revision: parsed.revision + 1,
      });
    }

    if (parsedAction.type === "RESTART") {
      if (parsed.phase !== "complete"
        || !canIncrement(parsed.noticeSerial) || !canIncrement(parsed.revision)) {
        return current;
      }
      return makeState({
        phase: "intro",
        trackIndex: 0,
        cursorGroove: 1,
        foundTrackIds: [],
        pendingTrackId: null,
        pendingToken: null,
        lastToken: parsed.lastToken,
        noticeSerial: parsed.noticeSerial + 1,
        lastNotice: "restarted",
        revision: parsed.revision + 1,
      });
    }

    return current;
  }

  function commonNotice(state) {
    return {
      noticeSerial: state.noticeSerial,
      lastNotice: state.lastNotice,
    };
  }

  function getViewModel(state, rawConfig) {
    const config = sanitizeConfig(rawConfig);
    const parsed = parseState(state, config);
    if (!parsed) throw new TypeError("invalid vinyl-secret state");
    const notice = commonNotice(parsed);

    if (parsed.phase === "intro") {
      return deepFreeze({
        phase: "intro",
        title: "把秘密藏进这一圈",
        intro:
          "读一条线索，在十二圈沟槽间移动唱针；信号清晰时，再亲手把唱针落下。",
        primaryAction: "开始寻声",
        ...notice,
      });
    }

    const track = config.tracks[parsed.trackIndex];
    if (parsed.phase === "seeking") {
      const signalCode = getSignal(parsed.cursorGroove, track.targetGroove);
      return deepFreeze({
        phase: "seeking",
        trackNumber: parsed.trackIndex + 1,
        trackCount: TRACK_COUNT,
        clue: track.clue,
        cursorGroove: parsed.cursorGroove,
        grooveCount: GROOVE_COUNT,
        signalCode,
        signalLabel: SIGNAL_LABELS[signalCode],
        ...notice,
      });
    }

    if (parsed.phase === "playing") {
      const signalCode = getSignal(parsed.cursorGroove, track.targetGroove);
      return deepFreeze({
        phase: "playing",
        trackNumber: parsed.trackIndex + 1,
        trackCount: TRACK_COUNT,
        clue: track.clue,
        cursorGroove: parsed.cursorGroove,
        grooveCount: GROOVE_COUNT,
        signalCode,
        signalLabel: SIGNAL_LABELS[signalCode],
        note: track.note,
        audioSrc: track.audioSrc,
        pendingToken: parsed.pendingToken,
        ...notice,
      });
    }

    if (parsed.phase === "track-result") {
      return deepFreeze({
        phase: "track-result",
        trackNumber: parsed.trackIndex + 1,
        trackCount: TRACK_COUNT,
        clue: track.clue,
        note: track.note,
        audioSrc: null,
        foundCount: parsed.foundTrackIds.length,
        ...notice,
      });
    }

    const notes = [];
    for (let index = 0; index < TRACK_COUNT; index += 1) {
      notes[index] = config.tracks[index].note;
    }
    return deepFreeze({
      phase: "complete",
      recipientName: config.recipientName,
      finalEyebrow: config.finalEyebrow,
      finalTitle: config.finalTitle,
      finalMessage: config.finalMessage,
      signature: config.signature,
      notes,
      audioSrc: null,
      foundCount: TRACK_COUNT,
      trackCount: TRACK_COUNT,
      ...notice,
    });
  }

  return deepFreeze({
    VERSION,
    GROOVE_COUNT,
    TRACK_COUNT,
    TRACK_SETTLE_MS,
    MAX_COUNTER,
    SIGNAL_CODES,
    SIGNAL_LABELS,
    DEFAULT_TARGETS,
    DEFAULT_CONFIG,
    PHASES,
    SETTLE_REASONS,
    ACTION_TYPES,
    sanitizeConfig,
    getSignal,
    createInitialState,
    assertState,
    transition,
    getViewModel,
  });
});
