(function (root, factory) {
  "use strict";
  root.FUTURE_TICKET_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GROUP_IDS = Object.freeze(["when", "where", "bonus"]);
  const PHASES = new Set(["intro", "choosing", "punching", "complete"]);
  const DEFAULT_CONFIG = freezeConfig({
    passenger: "给最想同行的你",
    issuer: "由我全程负责",
    finalNote: "出发那天，记得把我也带上。",
    serial: "A 02 240624",
    groups: [
      {
        id: "when",
        label: "什么时候出发",
        prompt: "第一孔 · 什么时候出发？",
        options: ["周五下班后", "周六午后", "一个不设闹钟的早晨"],
      },
      {
        id: "where",
        label: "去哪里",
        prompt: "第二孔 · 想把方向交给哪一格？",
        options: ["去看晚霞", "去吃一顿热汤", "去没有走过的街区"],
      },
      {
        id: "bonus",
        label: "随行彩蛋",
        prompt: "第三孔 · 再带上一点什么？",
        options: ["我负责路线", "你负责选歌", "留一小时给未知"],
      },
    ],
  });

  function sanitizeConfig(input) {
    if (!input || typeof input !== "object" || !Array.isArray(input.groups) || input.groups.length !== 3) {
      return DEFAULT_CONFIG;
    }

    const passenger = cleanText(input.passenger, 36);
    const issuer = cleanText(input.issuer, 36);
    const finalNote = cleanText(input.finalNote, 36);
    const serial = cleanText(input.serial, 18);
    if (!passenger || !issuer || !finalNote || !serial) return DEFAULT_CONFIG;

    const groups = input.groups.map((group, index) => sanitizeGroup(group, index));
    if (groups.some((group) => group === null)) return DEFAULT_CONFIG;
    return freezeConfig({ passenger, issuer, finalNote, serial, groups });
  }

  function createInitialState() {
    return freezeState({
      phase: "intro",
      step: 0,
      selection: null,
      reveals: [null, null, null],
      revision: 0,
    });
  }

  function start(state) {
    if (!isTicketState(state)) return createInitialState();
    return state.phase === "intro" ? update(state, { phase: "choosing" }) : state;
  }

  function selectHole(state, index) {
    if (!isTicketState(state)) return createInitialState();
    if (state.phase !== "choosing" || !Number.isInteger(index) || index < 0 || index > 2) return state;
    if (state.selection === index) return state;
    return update(state, { selection: index });
  }

  function punch(state, option) {
    if (!isTicketState(state)) return createInitialState();
    const revealed = cleanText(option, 28);
    if (state.phase !== "choosing" || state.selection === null || !revealed) return state;
    const reveals = [...state.reveals];
    reveals[state.step] = revealed;
    return update(state, { phase: "punching", reveals });
  }

  function finishPunch(state) {
    if (!isTicketState(state)) return createInitialState();
    if (state.phase !== "punching") return state;
    if (state.step === 2) return update(state, { phase: "complete", selection: null });
    return update(state, {
      phase: "choosing",
      step: state.step + 1,
      selection: null,
    });
  }

  function restart(state) {
    if (!isTicketState(state)) return createInitialState();
    return freezeState({ ...createInitialState(), revision: state.revision + 1 });
  }

  function sanitizeGroup(group, index) {
    if (!group || typeof group !== "object" || group.id !== GROUP_IDS[index]) return null;
    const label = cleanText(group.label, 12);
    const prompt = cleanText(group.prompt, 30);
    if (!label || !prompt || !Array.isArray(group.options) || group.options.length !== 3) return null;
    const options = group.options.map((option) => cleanText(option, 28));
    return options.every(Boolean) ? { id: group.id, label, prompt, options } : null;
  }

  function cleanText(value, maxLength) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    const length = Array.from(text).length;
    return length >= 1 && length <= maxLength ? text : null;
  }

  function isTicketState(value) {
    if (!value || typeof value !== "object" || !PHASES.has(value.phase)) return false;
    if (!Number.isInteger(value.step) || value.step < 0 || value.step > 2) return false;
    if (value.selection !== null && (!Number.isInteger(value.selection) || value.selection < 0 || value.selection > 2)) return false;
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) return false;
    if (!Array.isArray(value.reveals) || value.reveals.length !== 3) return false;
    if (!value.reveals.every((item) => item === null || cleanText(item, 28) === item)) return false;

    const revealedCount = value.reveals.filter((item) => item !== null).length;
    if (value.phase === "intro") {
      return value.step === 0 && value.selection === null && revealedCount === 0;
    }
    if (value.phase === "choosing") {
      return revealedCount === value.step
        && value.reveals.slice(0, value.step).every(Boolean)
        && value.reveals.slice(value.step).every((item) => item === null);
    }
    if (value.phase === "punching") {
      return value.selection !== null
        && revealedCount === value.step + 1
        && value.reveals.slice(0, value.step + 1).every(Boolean)
        && value.reveals.slice(value.step + 1).every((item) => item === null);
    }
    return value.step === 2 && value.selection === null && revealedCount === 3;
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch, revision: state.revision + 1 });
  }

  function freezeState(value) {
    return Object.freeze({ ...value, reveals: Object.freeze([...value.reveals]) });
  }

  function freezeConfig(value) {
    return Object.freeze({
      ...value,
      groups: Object.freeze(value.groups.map((group) => Object.freeze({
        ...group,
        options: Object.freeze([...group.options]),
      }))),
    });
  }

  return Object.freeze({
    GROUP_IDS,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    start,
    selectHole,
    punch,
    finishPunch,
    restart,
  });
});
