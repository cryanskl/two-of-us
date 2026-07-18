(function (root, factory) {
  "use strict";
  root.HAND_CRANK_MUSIC_BOX_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STEPS_PER_TURN = 4;
  const TOTAL_TURNS = 8;
  const TOTAL_STEPS = STEPS_PER_TURN * TOTAL_TURNS;
  const ANGLE_PER_STEP = Math.PI / 2;
  const TOTAL_ANGLE = TOTAL_STEPS * ANGLE_PER_STEP;
  const PHASES = Object.freeze(["intro", "playing", "complete"]);
  const STATE_KEYS = Object.freeze([
    "phase",
    "currentAngle",
    "peakAngle",
    "stepIndex",
    "completedTurns",
    "motif",
    "lastNoteId",
    "revision",
  ]);
  const CONFIG_KEYS = Object.freeze([
    "recipientName",
    "finalTitle",
    "finalMessage",
    "composeMotif",
  ]);
  const AVAILABLE_NOTE_IDS = Object.freeze(["c5", "d5", "e5", "f5", "g5", "a5", "c6", "d6"]);
  const DEFAULT_MOTIF = Object.freeze(["c5", "e5", "g5", "e5", "d5", "f5", "a5", "g5"]);

  function defaultComposeMotif() {
    return null;
  }

  const DEFAULT_CONFIG = deepFreeze({
    recipientName: "给你",
    finalTitle: "这段路，想和你慢慢走",
    finalMessage: "谢谢你把这首小小的旋律转到最后。",
    composeMotif: defaultComposeMotif,
  });

  function createInitialState(config) {
    const normalizedConfig = sanitizeConfig(config);
    const motif = resolveMotif(normalizedConfig.composeMotif);
    return makeInitialState(motif, 0);
  }

  function start(state) {
    if (!isMusicBoxState(state)) return createInitialState();
    if (state.phase !== "intro") return state;
    return freezeState({ ...state, phase: "playing", revision: state.revision + 1 });
  }

  function normalizeAngularDelta(previous, next) {
    if (!Number.isFinite(previous) || !Number.isFinite(next)) return Number.NaN;
    return Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
  }

  function applyAngularDelta(state, deltaRadians) {
    if (!isMusicBoxState(state)) return createInitialState();
    if (state.phase !== "playing" || !Number.isFinite(deltaRadians)
      || Math.abs(deltaRadians) > ANGLE_PER_STEP || deltaRadians === 0) return state;

    const candidateAngle = state.currentAngle + deltaRadians;
    if (!Number.isFinite(candidateAngle)) return state;

    let currentAngle = candidateAngle;
    let peakAngle = Math.max(state.peakAngle, currentAngle);
    let stepIndex = stepForPeak(peakAngle);
    let phase = "playing";

    if (stepIndex >= TOTAL_STEPS) {
      currentAngle = TOTAL_ANGLE;
      peakAngle = TOTAL_ANGLE;
      stepIndex = TOTAL_STEPS;
      phase = "complete";
    }

    const advanced = stepIndex > state.stepIndex;
    return freezeState({
      ...state,
      phase,
      currentAngle,
      peakAngle,
      stepIndex,
      completedTurns: Math.floor(stepIndex / STEPS_PER_TURN),
      lastNoteId: advanced ? state.motif[(stepIndex - 1) % state.motif.length] : state.lastNoteId,
      revision: state.revision + 1,
    });
  }

  function advanceOneStep(state) {
    if (!isMusicBoxState(state)) return createInitialState();
    if (state.phase !== "playing") return state;
    const alignedState = state.currentAngle === state.peakAngle
      ? state
      : freezeState({ ...state, currentAngle: state.peakAngle });
    return applyAngularDelta(alignedState, ANGLE_PER_STEP);
  }

  function getDerivedProgress(state) {
    const safeState = isMusicBoxState(state) ? state : createInitialState();
    return deepFreeze({
      ratio: safeState.stepIndex / TOTAL_STEPS,
      revealedLayers: safeState.stepIndex === 0 ? 0 : Math.ceil(safeState.stepIndex / STEPS_PER_TURN),
      activeTooth: safeState.stepIndex === 0 ? null : (safeState.stepIndex - 1) % safeState.motif.length,
    });
  }

  function restart(state) {
    if (!isMusicBoxState(state)) return createInitialState();
    if (state.phase !== "complete") return state;
    return makeInitialState(state.motif, state.revision + 1);
  }

  function isMusicBoxState(value) {
    try {
      return inspectMusicBoxState(value);
    } catch (_error) {
      return false;
    }
  }

  function inspectMusicBoxState(value) {
    if (!hasExactKeys(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
    if (!Number.isFinite(value.currentAngle) || !Number.isFinite(value.peakAngle)
      || value.peakAngle < 0 || value.peakAngle > TOTAL_ANGLE || value.currentAngle > value.peakAngle) return false;
    if (!Number.isInteger(value.stepIndex) || value.stepIndex < 0 || value.stepIndex > TOTAL_STEPS) return false;
    if (!Number.isInteger(value.completedTurns) || value.completedTurns < 0 || value.completedTurns > TOTAL_TURNS) return false;
    if (!isValidMotif(value.motif)) return false;
    if (value.lastNoteId !== null && !AVAILABLE_NOTE_IDS.includes(value.lastNoteId)) return false;
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) return false;
    if (value.stepIndex !== stepForPeak(value.peakAngle)) return false;
    if (value.completedTurns !== Math.floor(value.stepIndex / STEPS_PER_TURN)) return false;

    const expectedLastNote = value.stepIndex === 0
      ? null
      : value.motif[(value.stepIndex - 1) % value.motif.length];
    if (value.lastNoteId !== expectedLastNote) return false;

    if (value.phase === "intro") {
      return value.currentAngle === 0 && value.peakAngle === 0 && value.stepIndex === 0
        && value.completedTurns === 0 && value.lastNoteId === null;
    }
    if (value.phase === "playing") return value.stepIndex < TOTAL_STEPS;
    return value.stepIndex === TOTAL_STEPS && value.completedTurns === TOTAL_TURNS
      && value.currentAngle === TOTAL_ANGLE && value.peakAngle === TOTAL_ANGLE;
  }

  function sanitizeConfig(input) {
    if (input === undefined) return DEFAULT_CONFIG;
    try {
      if (!hasExactKeys(input, CONFIG_KEYS)) return DEFAULT_CONFIG;
      const recipientName = cleanText(input.recipientName, 24);
      const finalTitle = cleanText(input.finalTitle, 36);
      const finalMessage = cleanText(input.finalMessage, 160);
      const strategy = input.composeMotif;
      if (!recipientName || !finalTitle || !finalMessage || typeof strategy !== "function") return DEFAULT_CONFIG;
      return deepFreeze({
        recipientName,
        finalTitle,
        finalMessage,
        composeMotif(context) {
          return Reflect.apply(strategy, undefined, [context]);
        },
      });
    } catch (_error) {
      return DEFAULT_CONFIG;
    }
  }

  function resolveMotif(strategy) {
    const context = deepFreeze({
      availableNoteIds: [...AVAILABLE_NOTE_IDS],
      defaultMotif: [...DEFAULT_MOTIF],
    });
    try {
      const candidate = strategy(context);
      return isValidMotif(candidate) ? Object.freeze([...candidate]) : Object.freeze([...DEFAULT_MOTIF]);
    } catch (_error) {
      return Object.freeze([...DEFAULT_MOTIF]);
    }
  }

  function isValidMotif(value) {
    return Array.isArray(value) && value.length >= 8 && value.length <= 16
      && value.every((noteId) => typeof noteId === "string" && AVAILABLE_NOTE_IDS.includes(noteId));
  }

  function stepForPeak(peakAngle) {
    const rawStep = peakAngle / ANGLE_PER_STEP;
    const nearestStep = Math.round(rawStep);
    const roundingTolerance = Number.EPSILON * TOTAL_STEPS * 4;
    const stableStep = Math.abs(rawStep - nearestStep) <= roundingTolerance
      ? nearestStep
      : Math.floor(rawStep);
    return Math.min(TOTAL_STEPS, stableStep);
  }

  function makeInitialState(motif, revision) {
    return freezeState({
      phase: "intro",
      currentAngle: 0,
      peakAngle: 0,
      stepIndex: 0,
      completedTurns: 0,
      motif: [...motif],
      lastNoteId: null,
      revision,
    });
  }

  function cleanText(value, maxLength) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\s+/g, " ");
    const length = Array.from(normalized).length;
    return length >= 1 && length <= maxLength ? normalized : null;
  }

  function hasExactKeys(value, expectedKeys) {
    if (!value || typeof value !== "object") return false;
    const keys = Reflect.ownKeys(value);
    return keys.length === expectedKeys.length
      && keys.every((key) => typeof key === "string" && expectedKeys.includes(key));
  }

  function freezeState(value) {
    return deepFreeze({ ...value, motif: [...value.motif] });
  }

  function deepFreeze(value) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null || Object.isFrozen(value)) {
      return value;
    }
    for (const nested of Object.values(value)) deepFreeze(nested);
    return Object.freeze(value);
  }

  return deepFreeze({
    STEPS_PER_TURN,
    TOTAL_TURNS,
    TOTAL_STEPS,
    ANGLE_PER_STEP,
    TOTAL_ANGLE,
    AVAILABLE_NOTE_IDS,
    DEFAULT_MOTIF,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    start,
    normalizeAngularDelta,
    applyAngularDelta,
    advanceOneStep,
    getDerivedProgress,
    restart,
    isMusicBoxState,
  });
});
