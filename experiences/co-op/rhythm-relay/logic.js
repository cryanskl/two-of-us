(function (root, factory) {
  "use strict";
  root.RHYTHM_RELAY_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BEATS = Object.freeze(["coral", "sage"]);
  const INITIAL_LENGTH = 3;
  const TARGET_LENGTH = 10;
  const STARTING_ECHOES = 3;
  const PHASES = new Set(["intro", "handoff", "playback", "repeat", "append", "miss", "failed", "complete"]);

  function createRelayState() {
    return freezeState({
      phase: "intro",
      sequence: [],
      playerIndex: 0,
      echoes: STARTING_ECHOES,
      inputIndex: 0,
      lastExpected: null,
      lastActual: null,
    });
  }

  function startRelay(state, initialSequence) {
    if (!isRelayState(state)) return createRelayState();
    if (state.phase !== "intro" || !validateInitialSequence(initialSequence)) return state;
    return freezeState({
      ...state,
      phase: "handoff",
      sequence: initialSequence,
    });
  }

  function markReady(state) {
    if (!isRelayState(state)) return createRelayState();
    return state.phase === "handoff"
      ? update(state, { phase: "playback", inputIndex: 0, lastExpected: null, lastActual: null })
      : state;
  }

  function finishPlayback(state) {
    if (!isRelayState(state)) return createRelayState();
    return state.phase === "playback" ? update(state, { phase: "repeat", inputIndex: 0 }) : state;
  }

  function tapBeat(state, beat) {
    if (!isRelayState(state)) return createRelayState();
    if (state.phase !== "repeat" || !isBeat(beat)) return state;
    const expected = state.sequence[state.inputIndex];
    if (beat !== expected) {
      const echoes = state.echoes - 1;
      return update(state, {
        phase: echoes > 0 ? "miss" : "failed",
        echoes,
        inputIndex: 0,
        lastExpected: expected,
        lastActual: beat,
      });
    }
    const inputIndex = state.inputIndex + 1;
    return inputIndex === state.sequence.length
      ? update(state, { phase: "append", inputIndex, lastExpected: null, lastActual: null })
      : update(state, { inputIndex });
  }

  function retrySequence(state) {
    if (!isRelayState(state)) return createRelayState();
    return state.phase === "miss"
      ? update(state, { phase: "playback", inputIndex: 0, lastExpected: null, lastActual: null })
      : state;
  }

  function appendBeat(state, beat) {
    if (!isRelayState(state)) return createRelayState();
    if (state.phase !== "append" || !isBeat(beat) || state.sequence.length >= TARGET_LENGTH) return state;
    const sequence = [...state.sequence, beat];
    return sequence.length === TARGET_LENGTH
      ? update(state, { phase: "complete", sequence, inputIndex: 0 })
      : update(state, {
        phase: "handoff",
        sequence,
        playerIndex: state.playerIndex === 0 ? 1 : 0,
        inputIndex: 0,
      });
  }

  function restartRelay() {
    return createRelayState();
  }

  function validateInitialSequence(sequence) {
    return Array.isArray(sequence)
      && sequence.length === INITIAL_LENGTH
      && sequence.every(isBeat);
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch });
  }

  function isBeat(value) {
    return BEATS.includes(value);
  }

  function isRelayState(value) {
    if (!value || typeof value !== "object" || !PHASES.has(value.phase)) return false;
    if (!Array.isArray(value.sequence) || value.sequence.length > TARGET_LENGTH || !value.sequence.every(isBeat)) return false;
    if (value.phase === "intro" ? value.sequence.length !== 0 : value.sequence.length < INITIAL_LENGTH) return false;
    if ((value.playerIndex !== 0 && value.playerIndex !== 1)
      || !Number.isInteger(value.echoes) || value.echoes < 0 || value.echoes > STARTING_ECHOES
      || !Number.isInteger(value.inputIndex) || value.inputIndex < 0 || value.inputIndex > value.sequence.length) return false;
    return (value.lastExpected === null || isBeat(value.lastExpected))
      && (value.lastActual === null || isBeat(value.lastActual));
  }

  function freezeState(value) {
    return Object.freeze({ ...value, sequence: Object.freeze([...value.sequence]) });
  }

  return Object.freeze({
    BEATS,
    INITIAL_LENGTH,
    TARGET_LENGTH,
    STARTING_ECHOES,
    createRelayState,
    startRelay,
    markReady,
    finishPlayback,
    tapBeat,
    retrySequence,
    appendBeat,
    restartRelay,
    validateInitialSequence,
  });
});
