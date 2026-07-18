(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FOUR_HANDS_HARMONY_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TICK_MS = 50;
  const JOIN_WINDOW_TICKS = 4;
  const HOLD_TICKS = 6;
  const MAX_FRAME_GAP_MS = 500;
  const VOICES = Object.freeze(["low", "high"]);
  const PHASES = Object.freeze(["intro", "playing", "measure-complete", "paused", "complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "stalled"]);
  const CONFIG_LIMITS = Object.freeze({
    lowSeatName: 12,
    highSeatName: 12,
    intro: 72,
    finalTitle: 24,
    finalMessage: 96,
    signature: 24,
  });
  const FEEDBACK_VALUES = Object.freeze([
    "wrong-low",
    "wrong-high",
    "outside-window",
    "released-early",
    "joined",
    "measure-complete",
  ]);

  const LOW_NOTES = deepFreeze([
    { id: "c3", label: "C3", key: "A", code: "KeyA", frequency: 130.81 },
    { id: "f3", label: "F3", key: "S", code: "KeyS", frequency: 174.61 },
    { id: "g3", label: "G3", key: "D", code: "KeyD", frequency: 196.00 },
    { id: "a3", label: "A3", key: "F", code: "KeyF", frequency: 220.00 },
  ]);
  const HIGH_NOTES = deepFreeze([
    { id: "c5", label: "C5", key: "J", code: "KeyJ", frequency: 523.25 },
    { id: "d5", label: "D5", key: "K", code: "KeyK", frequency: 587.33 },
    { id: "e5", label: "E5", key: "L", code: "KeyL", frequency: 659.25 },
    { id: "g5", label: "G5", key: ";", code: "Semicolon", frequency: 783.99 },
  ]);
  const PHRASE = deepFreeze([
    { id: "arrival", low: "c3", high: "e5", title: "靠近" },
    { id: "answer", low: "g3", high: "d5", title: "回应" },
    { id: "turn", low: "a3", high: "c5", title: "转身" },
    { id: "stay", low: "f3", high: "d5", title: "停在这里" },
    { id: "home", low: "c3", high: "g5", title: "回到我们" },
  ]);
  const DEFAULT_CONFIG = deepFreeze({
    lowSeatName: "左边的你",
    highSeatName: "右边的你",
    intro: "你接住低音，我接住高音。五次同时落下，就把这一小段合在一起。",
    finalTitle: "这一拍，刚好和你",
    finalMessage: "不是谁跟上谁，是我们愿意在同一刻停下来。",
    signature: "留给我们",
  });

  const LOW_BY_ID = new Map(LOW_NOTES.map((note) => [note.id, note]));
  const HIGH_BY_ID = new Map(HIGH_NOTES.map((note) => [note.id, note]));
  const KEY_BY_CODE = new Map(
    LOW_NOTES.map((note) => [note.code, { voice: "low", noteId: note.id }])
      .concat(HIGH_NOTES.map((note) => [note.code, { voice: "high", noteId: note.id }])),
  );

  function sanitizeHarmonyConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    return deepFreeze({
      lowSeatName: cleanText(readProperty(source, "lowSeatName"), 12, DEFAULT_CONFIG.lowSeatName),
      highSeatName: cleanText(readProperty(source, "highSeatName"), 12, DEFAULT_CONFIG.highSeatName),
      intro: cleanText(readProperty(source, "intro"), 72, DEFAULT_CONFIG.intro),
      finalTitle: cleanText(readProperty(source, "finalTitle"), 24, DEFAULT_CONFIG.finalTitle),
      finalMessage: cleanText(readProperty(source, "finalMessage"), 96, DEFAULT_CONFIG.finalMessage),
      signature: cleanText(readProperty(source, "signature"), 24, DEFAULT_CONFIG.signature),
    });
  }

  function validateHarmonyPhrase(phrase) {
    if (!Array.isArray(phrase) || phrase.length !== PHRASE.length) return false;
    return phrase.every((measure, index) => {
      if (!isPlainObject(measure) || Object.keys(measure).length !== 4) return false;
      const expected = PHRASE[index];
      return measure.id === expected.id
        && measure.low === expected.low
        && measure.high === expected.high
        && measure.title === expected.title;
    });
  }

  function createHarmonyState(rawConfig) {
    return createIntroState(sanitizeHarmonyConfig(rawConfig), 0);
  }

  function reduceHarmony(state, action) {
    if (!isHarmonyState(state) || !isPlainObject(action) || typeof action.type !== "string") return state;
    if (action.type === "START") return startHarmony(state);
    if (action.type === "PRESS") return pressHarmony(state, action);
    if (action.type === "RELEASE") return releaseHarmony(state, action.inputId);
    if (action.type === "TICK") return tickHarmony(state, action.ticks);
    if (action.type === "INTERRUPT") return interruptHarmony(state, action.reason);
    if (action.type === "RESUME") return resumeHarmony(state);
    if (action.type === "RESTART") return createIntroState(sanitizeHarmonyConfig(state.config), state.revision + 1);
    return state;
  }

  function getHarmonyView(state) {
    if (!isHarmonyState(state)) return null;
    const measure = PHRASE[state.measureIndex];
    const lowTarget = LOW_BY_ID.get(measure.low);
    const highTarget = HIGH_BY_ID.get(measure.high);
    const completed = state.completed.map((record) => ({
      measureId: record.measureId,
      title: PHRASE.find((item) => item.id === record.measureId).title,
      joinGapTicks: record.joinGapTicks,
      joinGapMs: record.joinGapTicks * TICK_MS,
      completedAtTick: record.completedAtTick,
    }));
    const instruction = instructionFor(state);
    return {
      phase: state.phase,
      measureNumber: state.measureIndex + 1,
      measureCount: PHRASE.length,
      measureTitle: measure.title,
      lowSeat: seatView("low", state.config.lowSeatName, LOW_NOTES, lowTarget, state),
      highSeat: seatView("high", state.config.highSeatName, HIGH_NOTES, highTarget, state),
      joinGapMs: state.joinGapTicks === null ? null : state.joinGapTicks * TICK_MS,
      holdProgress: Math.min(1, state.holdTicks / HOLD_TICKS),
      completed,
      progressLabel: state.phase === "complete"
        ? "五次相遇，成了我们的小曲"
        : `第 ${state.measureIndex + 1} / ${PHRASE.length} 节 · ${measure.title}`,
      instruction,
      feedback: state.feedback,
      config: { ...state.config },
      finalTitle: state.config.finalTitle,
      finalMessage: state.config.finalMessage,
      signature: state.config.signature,
      canStart: state.phase === "intro",
      canPress: state.phase === "playing",
      canPause: state.phase === "playing" || state.phase === "measure-complete",
      canResume: state.phase === "paused",
      canRestart: true,
    };
  }

  function classifyHarmonyKey(code, edge, repeat) {
    if (typeof code !== "string" || (edge !== "down" && edge !== "up")) return null;
    const match = KEY_BY_CODE.get(code);
    if (!match) return null;
    if (edge === "up") return { type: "RELEASE", inputId: `key:${code}` };
    if (repeat === true) return null;
    return { type: "PRESS", voice: match.voice, noteId: match.noteId, inputId: `key:${code}` };
  }

  function replayHarmony(rawConfig, actions) {
    let state = createHarmonyState(rawConfig);
    if (!Array.isArray(actions)) return state;
    for (const action of actions) state = reduceHarmony(state, action);
    return state;
  }

  function startHarmony(state) {
    if (state.phase !== "intro") return state;
    return freezeState({
      ...state,
      phase: "playing",
      feedback: null,
      revision: state.revision + 1,
    });
  }

  function pressHarmony(state, action) {
    if (state.phase !== "playing") return state;
    if (!VOICES.includes(action.voice) || typeof action.noteId !== "string" || !isInputId(action.inputId)) return state;
    if (state.feedback === "outside-window") return state;
    const ownNotes = action.voice === "low" ? LOW_BY_ID : HIGH_BY_ID;
    const otherNotes = action.voice === "low" ? HIGH_BY_ID : LOW_BY_ID;
    if (!ownNotes.has(action.noteId) || otherNotes.has(action.noteId)) return state;
    if (state.held.low && state.held.low.inputId === action.inputId) return state;
    if (state.held.high && state.held.high.inputId === action.inputId) return state;
    if (state.held[action.voice]) return state;

    const target = PHRASE[state.measureIndex][action.voice];
    if (action.noteId !== target) {
      const feedback = action.voice === "low" ? "wrong-low" : "wrong-high";
      if (state.feedback === feedback) return state;
      return freezeState({ ...state, feedback, revision: state.revision + 1 });
    }

    const heldEntry = {
      noteId: action.noteId,
      inputId: action.inputId,
      pressedAtTick: state.clockTick,
    };
    const held = { ...state.held, [action.voice]: heldEntry };
    const otherVoice = action.voice === "low" ? "high" : "low";
    const otherHeld = held[otherVoice];
    if (!otherHeld) {
      return freezeState({
        ...state,
        held,
        feedback: null,
        revision: state.revision + 1,
      });
    }

    const joinGapTicks = Math.abs(heldEntry.pressedAtTick - otherHeld.pressedAtTick);
    const joined = joinGapTicks <= JOIN_WINDOW_TICKS;
    return freezeState({
      ...state,
      held,
      joinedAtTick: joined ? state.clockTick : null,
      joinGapTicks: joined ? joinGapTicks : null,
      holdTicks: 0,
      feedback: joined ? "joined" : "outside-window",
      revision: state.revision + 1,
    });
  }

  function releaseHarmony(state, inputId) {
    if ((state.phase !== "playing" && state.phase !== "measure-complete") || !isInputId(inputId)) return state;
    let releasedVoice = null;
    if (state.held.low && state.held.low.inputId === inputId) releasedVoice = "low";
    if (state.held.high && state.held.high.inputId === inputId) releasedVoice = "high";
    if (!releasedVoice) return state;

    const held = { ...state.held, [releasedVoice]: null };
    if (state.phase === "measure-complete") {
      if (held.low || held.high) {
        return freezeState({ ...state, held, revision: state.revision + 1 });
      }
      if (state.measureIndex === PHRASE.length - 1) {
        return freezeState({
          ...state,
          phase: "complete",
          held,
          joinedAtTick: null,
          joinGapTicks: null,
          holdTicks: 0,
          feedback: null,
          revision: state.revision + 1,
        });
      }
      return freezeState({
        ...state,
        phase: "playing",
        measureIndex: state.measureIndex + 1,
        held,
        joinedAtTick: null,
        joinGapTicks: null,
        holdTicks: 0,
        feedback: null,
        revision: state.revision + 1,
      });
    }

    if (state.joinedAtTick !== null) {
      return freezeState({
        ...state,
        held,
        joinedAtTick: null,
        joinGapTicks: null,
        holdTicks: 0,
        feedback: "released-early",
        revision: state.revision + 1,
      });
    }
    if (state.feedback === "outside-window") {
      return freezeState({
        ...state,
        held,
        feedback: held.low || held.high ? "outside-window" : null,
        revision: state.revision + 1,
      });
    }
    return freezeState({
      ...state,
      held,
      feedback: null,
      revision: state.revision + 1,
    });
  }

  function tickHarmony(state, ticks) {
    if (state.phase !== "playing" || !isPositiveSafeInteger(ticks)) return state;
    if (!state.held.low && !state.held.high) return state;
    if (!Number.isSafeInteger(state.clockTick + ticks)) return state;
    const clockTick = state.clockTick + ticks;
    if (state.joinedAtTick === null) {
      return freezeState({ ...state, clockTick, revision: state.revision + 1 });
    }

    const holdTicks = Math.min(HOLD_TICKS, state.holdTicks + ticks);
    if (holdTicks < HOLD_TICKS) {
      return freezeState({ ...state, clockTick, holdTicks, revision: state.revision + 1 });
    }
    const measure = PHRASE[state.measureIndex];
    const record = {
      measureId: measure.id,
      joinGapTicks: state.joinGapTicks,
      completedAtTick: clockTick,
    };
    return freezeState({
      ...state,
      phase: "measure-complete",
      clockTick,
      holdTicks: HOLD_TICKS,
      completed: [...state.completed, record],
      feedback: "measure-complete",
      revision: state.revision + 1,
    });
  }

  function interruptHarmony(state, reason) {
    if (state.phase !== "playing" && state.phase !== "measure-complete") return state;
    return freezeState({
      ...state,
      phase: "paused",
      held: { low: null, high: null },
      joinedAtTick: null,
      joinGapTicks: null,
      holdTicks: 0,
      feedback: null,
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
      pausedFrom: state.phase,
      revision: state.revision + 1,
    });
  }

  function resumeHarmony(state) {
    if (state.phase !== "paused") return state;
    if (state.pausedFrom === "playing") {
      return freezeState({
        ...state,
        phase: "playing",
        pauseReason: null,
        pausedFrom: null,
        revision: state.revision + 1,
      });
    }
    const finalMeasure = state.measureIndex === PHRASE.length - 1;
    return freezeState({
      ...state,
      phase: finalMeasure ? "complete" : "playing",
      measureIndex: finalMeasure ? state.measureIndex : state.measureIndex + 1,
      pauseReason: null,
      pausedFrom: null,
      feedback: null,
      revision: state.revision + 1,
    });
  }

  function createIntroState(config, revision) {
    return freezeState({
      phase: "intro",
      measureIndex: 0,
      clockTick: 0,
      held: { low: null, high: null },
      joinedAtTick: null,
      joinGapTicks: null,
      holdTicks: 0,
      completed: [],
      feedback: null,
      pauseReason: null,
      pausedFrom: null,
      revision,
      config,
    });
  }

  function seatView(voice, name, notes, target, state) {
    const held = state.held[voice];
    return {
      name,
      notes: notes.map((note) => ({
        id: note.id,
        label: note.label,
        key: note.key,
        isTarget: note.id === target.id,
        isHeld: Boolean(held && held.noteId === note.id),
      })),
      target: cloneNote(target),
      held: held ? { ...held } : null,
      stateLabel: seatStateLabel(state, voice),
    };
  }

  function seatStateLabel(state, voice) {
    if (state.phase === "complete") return "完成";
    if (state.phase === "paused") return "琴键已经松开";
    if (state.phase === "measure-complete") return "和弦收好了";
    if (state.feedback === `wrong-${voice}`) return "这个音在旁边，看看目标键";
    if (state.held[voice] && state.joinedAtTick !== null) return "保持中";
    if (state.held[voice]) return "按住";
    return "目标键";
  }

  function instructionFor(state) {
    if (state.phase === "intro") return state.config.intro;
    if (state.phase === "paused") return "回来后从这一小节继续。";
    if (state.phase === "complete") return "五次相遇，成了我们的小曲";
    if (state.phase === "measure-complete") return "和弦收好了，双方松开";
    if (state.feedback === "outside-window") return "差一点没关系，双方松开再来";
    if (state.feedback === "wrong-low" || state.feedback === "wrong-high") return "这个音在旁边，看看目标键";
    if (state.feedback === "released-early") return "差一点没关系，双方松开再来";
    if (state.joinedAtTick !== null) return "保持中";
    if (state.held.low || state.held.high) return "等待另一边";
    return "一起按住，让这一小节合上";
  }

  function isHarmonyState(state) {
    if (!isPlainObject(state) || !PHASES.includes(state.phase)) return false;
    if (!Number.isInteger(state.measureIndex) || state.measureIndex < 0 || state.measureIndex >= PHRASE.length) return false;
    if (!Number.isSafeInteger(state.clockTick) || state.clockTick < 0) return false;
    if (!isPlainObject(state.held) || !isHeld(state.held.low, "low", state) || !isHeld(state.held.high, "high", state)) return false;
    if (state.held.low && state.held.high && state.held.low.inputId === state.held.high.inputId) return false;
    if (state.joinedAtTick !== null) {
      if (!Number.isSafeInteger(state.joinedAtTick) || state.joinedAtTick < 0) return false;
      if (state.phase !== "measure-complete" && (!state.held.low || !state.held.high)) return false;
    }
    if (state.joinGapTicks !== null && (!Number.isInteger(state.joinGapTicks) || state.joinGapTicks < 0 || state.joinGapTicks > JOIN_WINDOW_TICKS)) return false;
    if ((state.joinedAtTick === null) !== (state.joinGapTicks === null)) return false;
    if (!Number.isInteger(state.holdTicks) || state.holdTicks < 0 || state.holdTicks > HOLD_TICKS) return false;
    if (state.joinedAtTick === null && state.holdTicks !== 0 && state.phase !== "measure-complete") return false;
    if (!Array.isArray(state.completed) || !validCompleted(state.completed)) return false;
    if (state.feedback !== null && !FEEDBACK_VALUES.includes(state.feedback)) return false;
    if (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason)) return false;
    if (state.pausedFrom !== null && state.pausedFrom !== "playing" && state.pausedFrom !== "measure-complete") return false;
    if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !isSanitizedConfig(state.config)) return false;
    return validPhaseShape(state);
  }

  function validPhaseShape(state) {
    const completedCount = state.completed.length;
    if (state.phase === "intro") {
      return state.measureIndex === 0 && state.clockTick === 0 && completedCount === 0
        && emptyHeld(state) && state.joinedAtTick === null && state.holdTicks === 0
        && state.feedback === null && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "playing") {
      if (completedCount !== state.measureIndex || state.pauseReason !== null || state.pausedFrom !== null) return false;
      if (state.joinedAtTick !== null) return state.feedback === "joined";
      if (state.feedback === "joined" || state.feedback === "measure-complete") return false;
      if (state.feedback === "outside-window" && !state.held.low && !state.held.high) return false;
      if (state.feedback === "wrong-low" && state.held.low) return false;
      if (state.feedback === "wrong-high" && state.held.high) return false;
      return true;
    }
    if (state.phase === "measure-complete") {
      return completedCount === state.measureIndex + 1 && state.joinedAtTick !== null
        && state.holdTicks === HOLD_TICKS && state.feedback === "measure-complete"
        && Boolean(state.held.low || state.held.high)
        && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "paused") {
      const expected = state.pausedFrom === "measure-complete" ? state.measureIndex + 1 : state.measureIndex;
      return state.pauseReason !== null && state.pausedFrom !== null && completedCount === expected
        && emptyHeld(state) && state.joinedAtTick === null && state.holdTicks === 0 && state.feedback === null;
    }
    return state.measureIndex === PHRASE.length - 1 && completedCount === PHRASE.length
      && emptyHeld(state) && state.joinedAtTick === null && state.holdTicks === 0
      && state.feedback === null && state.pauseReason === null && state.pausedFrom === null;
  }

  function validCompleted(records) {
    if (records.length > PHRASE.length) return false;
    let previousTick = -1;
    return records.every((record, index) => {
      if (!isPlainObject(record) || record.measureId !== PHRASE[index].id) return false;
      if (!Number.isInteger(record.joinGapTicks) || record.joinGapTicks < 0 || record.joinGapTicks > JOIN_WINDOW_TICKS) return false;
      if (!Number.isSafeInteger(record.completedAtTick) || record.completedAtTick < previousTick) return false;
      previousTick = record.completedAtTick;
      return true;
    });
  }

  function isHeld(value, voice, state) {
    if (value === null) return true;
    if (!isPlainObject(value) || typeof value.noteId !== "string" || !isInputId(value.inputId)) return false;
    if (!Number.isSafeInteger(value.pressedAtTick) || value.pressedAtTick < 0 || value.pressedAtTick > state.clockTick) return false;
    const notes = voice === "low" ? LOW_BY_ID : HIGH_BY_ID;
    return notes.has(value.noteId) && value.noteId === PHRASE[state.measureIndex][voice];
  }

  function isSanitizedConfig(config) {
    if (!isPlainObject(config)) return false;
    const keys = Object.keys(DEFAULT_CONFIG);
    if (Object.keys(config).length !== keys.length) return false;
    return keys.every((key) => typeof config[key] === "string"
      && config[key].trim() === config[key]
      && [...config[key]].length > 0
      && [...config[key]].length <= CONFIG_LIMITS[key]);
  }

  function emptyHeld(state) {
    return state.held.low === null && state.held.high === null;
  }

  function cleanText(value, limit, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return [...trimmed].slice(0, limit).join("");
  }

  function readProperty(source, key) {
    try {
      return source[key];
    } catch {
      return undefined;
    }
  }

  function isInputId(value) {
    return typeof value === "string" && value.length > 0;
  }

  function isPositiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function cloneNote(note) {
    return {
      id: note.id,
      label: note.label,
      key: note.key,
      code: note.code,
      frequency: note.frequency,
    };
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return deepFreeze({
    TICK_MS,
    JOIN_WINDOW_TICKS,
    HOLD_TICKS,
    MAX_FRAME_GAP_MS,
    LOW_NOTES,
    HIGH_NOTES,
    PHRASE,
    DEFAULT_CONFIG,
    sanitizeHarmonyConfig,
    validateHarmonyPhrase,
    createHarmonyState,
    reduceHarmony,
    getHarmonyView,
    classifyHarmonyKey,
    replayHarmony,
  });
});
