(function (root, factory) {
  "use strict";

  let configApi = root && root.FutureCookieNotesConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch (_error) {
      configApi = null;
    }
  }
  const api = factory(configApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.FutureCookieNotesLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const NOTE_IDS = deepFreeze(["when", "where", "together"]);
  const NOTE_META = deepFreeze({
    when: { number: 1, label: "什么时候", position: 1 },
    where: { number: 2, label: "去哪里", position: 2 },
    together: { number: 3, label: "一起做什么", position: 3 },
  });
  const PHASES = deepFreeze(["collecting", "ready", "finale"]);
  const ACTION_FIELDS = deepFreeze({
    OPEN_NOTE: ["noteId"],
    ASSEMBLE: [],
    RESTART: [],
  });
  const ACTION_TYPES = deepFreeze(Object.keys(ACTION_FIELDS));
  const STATE_KEYS = deepFreeze(["version", "phase", "openedOrder"]);
  const CONFIG_KEYS = deepFreeze([
    "title", "subtitle", "intro", "readyTitle", "finalTitle", "closing", "signature", "privacy",
  ]);
  const SAFE_CONFIG_KEYS = deepFreeze([...CONFIG_KEYS, "notes", "invitation"]);
  const CONFIG_LIMITS = deepFreeze({
    title: 32,
    subtitle: 96,
    intro: 96,
    readyTitle: 96,
    finalTitle: 96,
    closing: 120,
    signature: 48,
    privacy: 100,
  });
  const NOTE_LIMIT = 80;
  const INVITATION_LIMIT = 280;
  const ACTION_LABEL = "把三个以后拼起来";
  const RESTART_LABEL = "再打开一遍";

  const FALLBACK_DEFAULT_CONFIG = deepFreeze({
    title: "三枚以后，都是我们",
    subtitle: "敲开三枚未来签，把三个小约定拼成一封邀请。",
    intro: "有三个以后，我先替我们收好了。你想先打开哪一枚？",
    readyTitle: "三个以后，都到齐了。",
    finalTitle: "这不是预言，是我想和你兑现的以后。",
    notes: {
      when: "下一个不赶时间的周末",
      where: "去一条我们都没走过的街",
      together: "慢慢吃，慢慢逛，再拍一张新的合照",
    },
    closing: "只要你愿意，我们就挑一天出发。",
    signature: "—— 一直想和你去的人",
    privacy: "这三段只在本机页面中使用，刷新即重置。",
  });
  const DEFAULT_CONFIG = isDefaultConfig(configApi && safeRead(configApi, "DEFAULT_CONFIG"))
    ? safeRead(configApi, "DEFAULT_CONFIG")
    : FALLBACK_DEFAULT_CONFIG;
  const configuredComposeCandidate = safeRead(configApi, "composeInvitation");
  const configuredCompose = typeof configuredComposeCandidate === "function"
    ? configuredComposeCandidate
    : canonicalInvitation;

  function createInitialState() {
    return freezeState({
      version: VERSION,
      phase: "collecting",
      openedOrder: [],
    });
  }

  function sanitizeConfig(candidate, composeStrategy) {
    const source = isReadableObject(candidate) ? candidate : null;
    const noteCandidate = safeRead(source, "notes");
    const noteSource = isReadableObject(noteCandidate) ? noteCandidate : null;
    const notes = {};
    for (const noteId of NOTE_IDS) {
      notes[noteId] = cleanText(safeRead(noteSource, noteId), NOTE_LIMIT, DEFAULT_CONFIG.notes[noteId]);
    }
    const base = {};
    for (const key of CONFIG_KEYS) {
      base[key] = cleanText(safeRead(source, key), CONFIG_LIMITS[key], DEFAULT_CONFIG[key]);
    }
    base.notes = notes;
    const frozenBase = deepFreeze(base);
    const strategyNotes = deepFreeze({
      when: frozenBase.notes.when,
      where: frozenBase.notes.where,
      together: frozenBase.notes.together,
    });
    const strategy = typeof composeStrategy === "function" ? composeStrategy : configuredCompose;
    let invitation = callCompose(strategy, strategyNotes);
    if (!isValidText(invitation, INVITATION_LIMIT)) invitation = callCompose(configuredCompose, strategyNotes);
    if (!isValidText(invitation, INVITATION_LIMIT)) invitation = canonicalInvitation(strategyNotes);
    return deepFreeze({ ...frozenBase, invitation: invitation.trim() });
  }

  function reduceFutureCookieNotes(state, action) {
    if (!isValidState(state)) return createInitialState();
    const parsed = parseAction(action);
    if (!parsed) return state;

    if (parsed.type === "OPEN_NOTE") {
      if (state.phase !== "collecting" || state.openedOrder.includes(parsed.noteId)) return state;
      const openedOrder = [...state.openedOrder, parsed.noteId];
      return freezeState({
        version: VERSION,
        phase: openedOrder.length === NOTE_IDS.length ? "ready" : "collecting",
        openedOrder,
      });
    }
    if (parsed.type === "ASSEMBLE") {
      if (state.phase !== "ready") return state;
      return freezeState({ version: VERSION, phase: "finale", openedOrder: state.openedOrder });
    }
    return state.phase === "finale" ? createInitialState() : state;
  }

  function assertState(state) {
    try {
      if (!isPlainDataObject(state, STATE_KEYS)) throw new TypeError("invalid future-cookie state shape");
      if (state.version !== VERSION || !PHASES.includes(state.phase)) {
        throw new TypeError("invalid future-cookie state scalar");
      }
      assertOpenedOrder(state.openedOrder);
      const opened = state.openedOrder.length;
      if ((state.phase === "collecting" && opened > 2)
        || ((state.phase === "ready" || state.phase === "finale") && opened !== NOTE_IDS.length)) {
        throw new TypeError("future-cookie phase does not match opened notes");
      }
      return state;
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new TypeError("invalid future-cookie state", { cause: error });
    }
  }

  function getFutureCookieNotesView(state, safeConfig) {
    assertState(state);
    const config = isSafeConfig(safeConfig) ? safeConfig : sanitizeConfig(safeConfig);
    const opened = new Set(state.openedOrder);
    const notes = NOTE_IDS.map((id) => {
      const meta = NOTE_META[id];
      const note = {
        id,
        number: meta.number,
        label: meta.label,
        isOpen: opened.has(id),
      };
      if (note.isOpen) note.body = config.notes[id];
      return note;
    });
    return deepFreeze({
      phase: state.phase,
      title: config.title,
      subtitle: config.subtitle,
      intro: state.phase === "collecting" ? config.intro : null,
      progress: {
        opened: state.openedOrder.length,
        total: NOTE_IDS.length,
        text: `已收好 ${state.openedOrder.length} / ${NOTE_IDS.length}`,
      },
      notes,
      announcement: announcementFor(state),
      ready: state.phase === "ready" ? {
        title: config.readyTitle,
        actionLabel: ACTION_LABEL,
      } : null,
      finale: state.phase === "finale" ? {
        title: config.finalTitle,
        invitation: config.invitation,
        closing: config.closing,
        signature: config.signature,
        restartLabel: RESTART_LABEL,
      } : null,
      privacy: config.privacy,
    });
  }

  function replayFutureCookieNotes(actions) {
    if (!Array.isArray(actions)) throw new TypeError("actions must be an array");
    let state = createInitialState();
    for (const action of actions) state = reduceFutureCookieNotes(state, action);
    return state;
  }

  function announcementFor(state) {
    if (state.phase === "finale") return "完整邀请已展开。";
    if (state.phase === "ready") return "三枚未来签已到齐，可以拼成邀请了。";
    if (state.openedOrder.length === 0) return "三枚未来签已摆好。";
    const lastId = state.openedOrder[state.openedOrder.length - 1];
    return `已收好‘${NOTE_META[lastId].label}’，共 ${state.openedOrder.length} 枚。`;
  }

  function parseAction(action) {
    try {
      if (!isPlainDataRecord(action)) return null;
      const keys = Reflect.ownKeys(action);
      if (keys.some((key) => typeof key !== "string")) return null;
      const typeDescriptor = Object.getOwnPropertyDescriptor(action, "type");
      if (!isEnumerableDataDescriptor(typeDescriptor) || !ACTION_TYPES.includes(typeDescriptor.value)) return null;
      const expected = ["type", ...ACTION_FIELDS[typeDescriptor.value]];
      if (!sameKeySet(keys, expected)) return null;
      for (const key of expected) {
        if (!isEnumerableDataDescriptor(Object.getOwnPropertyDescriptor(action, key))) return null;
      }
      if (typeDescriptor.value === "OPEN_NOTE") {
        const noteId = Object.getOwnPropertyDescriptor(action, "noteId").value;
        if (!NOTE_IDS.includes(noteId)) return null;
        return { type: typeDescriptor.value, noteId };
      }
      return { type: typeDescriptor.value };
    } catch (_error) {
      return null;
    }
  }

  function assertOpenedOrder(value) {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new TypeError("openedOrder must be a plain array");
    }
    const keys = Reflect.ownKeys(value);
    const expected = [...Array.from({ length: value.length }, (_, index) => String(index)), "length"];
    if (!sameKeySet(keys, expected)) throw new TypeError("openedOrder has unexpected fields");
    const seen = new Set();
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!isEnumerableDataDescriptor(descriptor) || !NOTE_IDS.includes(descriptor.value) || seen.has(descriptor.value)) {
        throw new TypeError("openedOrder contains an invalid note ID");
      }
      seen.add(descriptor.value);
    }
  }

  function isValidState(state) {
    try {
      assertState(state);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function isSafeConfig(value) {
    try {
      if (!isPlainDataObject(value, SAFE_CONFIG_KEYS) || !isPlainDataObject(value.notes, NOTE_IDS)) return false;
      for (const key of CONFIG_KEYS) {
        if (!isValidText(value[key], CONFIG_LIMITS[key])) return false;
      }
      for (const noteId of NOTE_IDS) {
        if (!isValidText(value.notes[noteId], NOTE_LIMIT)) return false;
      }
      return isValidText(value.invitation, INVITATION_LIMIT);
    } catch (_error) {
      return false;
    }
  }

  function isDefaultConfig(value) {
    if (!isReadableObject(value)) return false;
    const notes = safeRead(value, "notes");
    if (!isReadableObject(notes)) return false;
    for (const key of CONFIG_KEYS) {
      if (!isValidText(safeRead(value, key), CONFIG_LIMITS[key])) return false;
    }
    return NOTE_IDS.every((id) => isValidText(safeRead(notes, id), NOTE_LIMIT));
  }

  function isPlainDataObject(value, expectedKeys) {
    if (!isPlainDataRecord(value)) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string") || !sameKeySet(keys, expectedKeys)) return false;
    return expectedKeys.every((key) => isEnumerableDataDescriptor(Object.getOwnPropertyDescriptor(value, key)));
  }

  function isPlainDataRecord(value) {
    return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
  }

  function isEnumerableDataDescriptor(descriptor) {
    return Boolean(descriptor && "value" in descriptor && descriptor.enumerable === true);
  }

  function sameKeySet(actual, expected) {
    return actual.length === expected.length && expected.every((key) => actual.includes(key));
  }

  function isReadableObject(value) {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }

  function safeRead(source, key) {
    if (!isReadableObject(source)) return undefined;
    try {
      return source[key];
    } catch (_error) {
      return undefined;
    }
  }

  function cleanText(value, limit, fallback) {
    return isValidText(value, limit) ? value.trim() : fallback;
  }

  function isValidText(value, limit) {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return trimmed.length > 0 && [...trimmed].length <= limit;
  }

  function callCompose(strategy, notes) {
    if (typeof strategy !== "function") return undefined;
    try {
      return strategy(notes);
    } catch (_error) {
      return undefined;
    }
  }

  function canonicalInvitation(notes) {
    return `${notes.when}，我们${notes.where}，${notes.together}。`;
  }

  function freezeState(value) {
    return deepFreeze({
      version: VERSION,
      phase: value.phase,
      openedOrder: [...value.openedOrder],
    });
  }

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  return deepFreeze({
    VERSION,
    NOTE_IDS,
    NOTE_META,
    PHASES,
    ACTION_TYPES,
    createInitialState,
    sanitizeConfig,
    reduceFutureCookieNotes,
    assertState,
    getFutureCookieNotesView,
    replayFutureCookieNotes,
    deepFreeze,
  });
});
