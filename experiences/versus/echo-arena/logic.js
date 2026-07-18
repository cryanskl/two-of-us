(function (root, factory) {
  "use strict";
  root.ECHO_ARENA_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_SEQUENCE_LENGTH = 16;
  const MATCH_TARGET = 2;
  const PLAYER_IDS = Object.freeze(["a", "b"]);
  const DEFAULT_CONFIG = deepFreeze({ aName: "A 席", bName: "B 席", firstPlayer: "a" });
  const NOTES = deepFreeze([
    { id: "do", label: "DO", key: "1", frequency: 261.63, type: "sine" },
    { id: "mi", label: "MI", key: "2", frequency: 329.63, type: "triangle" },
    { id: "sol", label: "SOL", key: "3", frequency: 392, type: "sine" },
    { id: "la", label: "LA", key: "4", frequency: 440, type: "triangle" },
  ]);
  const NOTE_IDS = Object.freeze(NOTES.map((note) => note.id));
  const PHASES = Object.freeze([
    "intro", "handoff", "playback", "repeat", "append", "round-over", "match-over",
  ]);

  function createInitialState(config = DEFAULT_CONFIG) {
    const normalized = normalizeConfig(config);
    return freezeState({
      phase: "intro",
      players: { a: normalized.aName, b: normalized.bName },
      firstPlayer: normalized.firstPlayer,
      currentPlayer: normalized.firstPlayer,
      starter: normalized.firstPlayer,
      sequence: [],
      inputIndex: 0,
      gameNumber: 1,
      turnNumber: 1,
      scores: { a: 0, b: 0 },
      winner: null,
      loser: null,
      endReason: null,
      lastInput: null,
      playbackToken: 0,
      revision: 0,
    });
  }

  function startMatch(state, openingNote) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "intro" || !NOTE_IDS.includes(openingNote)) return state;
    return freezeState({
      ...state,
      phase: "handoff",
      currentPlayer: state.starter,
      sequence: [openingNote],
      inputIndex: 0,
      lastInput: null,
      revision: state.revision + 1,
    });
  }

  function beginPlayback(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "handoff") return state;
    return freezeState({
      ...state,
      phase: "playback",
      inputIndex: 0,
      lastInput: null,
      playbackToken: state.playbackToken + 1,
      revision: state.revision + 1,
    });
  }

  function finishPlayback(state, token) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "playback" || token !== state.playbackToken) return state;
    return freezeState({
      ...state,
      phase: "repeat",
      inputIndex: 0,
      revision: state.revision + 1,
    });
  }

  function pressNote(state, noteId) {
    if (!isGameState(state)) return createInitialState();
    if (!NOTE_IDS.includes(noteId)) return state;
    if (state.phase === "repeat") return repeatNote(state, noteId);
    if (state.phase === "append") return appendNote(state, noteId);
    return state;
  }

  function repeatNote(state, noteId) {
    const expected = state.sequence[state.inputIndex];
    const lastInput = {
      player: state.currentPlayer,
      noteId,
      expected,
      correct: noteId === expected,
    };
    if (noteId !== expected) {
      const winner = otherPlayer(state.currentPlayer);
      const scores = { ...state.scores, [winner]: state.scores[winner] + 1 };
      return freezeState({
        ...state,
        phase: scores[winner] >= MATCH_TARGET ? "match-over" : "round-over",
        scores,
        winner,
        loser: state.currentPlayer,
        endReason: "mistake",
        lastInput,
        revision: state.revision + 1,
      });
    }
    const inputIndex = state.inputIndex + 1;
    return freezeState({
      ...state,
      phase: inputIndex === state.sequence.length ? "append" : "repeat",
      inputIndex,
      lastInput,
      revision: state.revision + 1,
    });
  }

  function appendNote(state, noteId) {
    const sequence = [...state.sequence, noteId];
    const lastInput = {
      player: state.currentPlayer,
      noteId,
      expected: null,
      correct: true,
    };
    if (sequence.length >= MAX_SEQUENCE_LENGTH) {
      return freezeState({
        ...state,
        phase: "round-over",
        sequence,
        inputIndex: sequence.length,
        winner: null,
        loser: null,
        endReason: "cap",
        lastInput,
        revision: state.revision + 1,
      });
    }
    return freezeState({
      ...state,
      phase: "handoff",
      currentPlayer: otherPlayer(state.currentPlayer),
      sequence,
      inputIndex: 0,
      turnNumber: state.turnNumber + 1,
      winner: null,
      loser: null,
      endReason: null,
      lastInput,
      revision: state.revision + 1,
    });
  }

  function startNextGame(state, openingNote) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "round-over" || !NOTE_IDS.includes(openingNote)) return state;
    const starter = otherPlayer(state.starter);
    return freezeState({
      ...state,
      phase: "handoff",
      currentPlayer: starter,
      starter,
      sequence: [openingNote],
      inputIndex: 0,
      gameNumber: state.gameNumber + 1,
      turnNumber: 1,
      winner: null,
      loser: null,
      endReason: null,
      lastInput: null,
      revision: state.revision + 1,
    });
  }

  function restartMatch(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "round-over" && state.phase !== "match-over") return state;
    return createInitialState({
      aName: state.players.a,
      bName: state.players.b,
      firstPlayer: state.firstPlayer,
    });
  }

  function isGameState(value) {
    if (!value || typeof value !== "object" || !PHASES.includes(value.phase)) return false;
    if (!value.players || !isValidName(value.players.a) || !isValidName(value.players.b)) return false;
    if (!PLAYER_IDS.includes(value.firstPlayer) || !PLAYER_IDS.includes(value.currentPlayer) || !PLAYER_IDS.includes(value.starter)) return false;
    if (!Array.isArray(value.sequence) || value.sequence.some((noteId) => !NOTE_IDS.includes(noteId))) return false;
    if (value.phase === "intro" ? value.sequence.length !== 0 : value.sequence.length < 1 || value.sequence.length > MAX_SEQUENCE_LENGTH) return false;
    if (!Number.isInteger(value.inputIndex) || value.inputIndex < 0 || value.inputIndex > value.sequence.length) return false;
    if (!Number.isInteger(value.gameNumber) || value.gameNumber < 1) return false;
    if (!Number.isInteger(value.turnNumber) || value.turnNumber < 1) return false;
    if (!isScores(value.scores)) return false;
    if (value.winner !== null && !PLAYER_IDS.includes(value.winner)) return false;
    if (value.loser !== null && !PLAYER_IDS.includes(value.loser)) return false;
    if (![null, "mistake", "cap"].includes(value.endReason)) return false;
    if (!isLastInput(value.lastInput)) return false;
    if (!Number.isInteger(value.playbackToken) || value.playbackToken < 0) return false;
    if (!Number.isInteger(value.revision) || value.revision < 0) return false;
    if (value.phase === "match-over" && (!value.winner || value.scores[value.winner] < MATCH_TARGET)) return false;
    if (value.phase === "round-over" && value.endReason === null) return false;
    return true;
  }

  function normalizeConfig(config) {
    if (!config || typeof config !== "object") return DEFAULT_CONFIG;
    const aName = normalizeName(config.aName);
    const bName = normalizeName(config.bName);
    if (!aName || !bName || !PLAYER_IDS.includes(config.firstPlayer)) return DEFAULT_CONFIG;
    return deepFreeze({ aName, bName, firstPlayer: config.firstPlayer });
  }

  function normalizeName(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length >= 1 && normalized.length <= 24 ? normalized : null;
  }

  function isValidName(value) {
    return typeof value === "string" && value === normalizeName(value);
  }

  function isScores(scores) {
    return scores && typeof scores === "object"
      && PLAYER_IDS.every((player) => Number.isInteger(scores[player]) && scores[player] >= 0 && scores[player] <= MATCH_TARGET);
  }

  function isLastInput(value) {
    return value === null || Boolean(value && typeof value === "object"
      && PLAYER_IDS.includes(value.player)
      && NOTE_IDS.includes(value.noteId)
      && (value.expected === null || NOTE_IDS.includes(value.expected))
      && typeof value.correct === "boolean");
  }

  function otherPlayer(player) {
    return player === "a" ? "b" : player === "b" ? "a" : null;
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const nested of Object.values(value)) deepFreeze(nested);
    return Object.freeze(value);
  }

  return Object.freeze({
    MAX_SEQUENCE_LENGTH,
    MATCH_TARGET,
    PLAYER_IDS,
    NOTES,
    NOTE_IDS,
    createInitialState,
    startMatch,
    beginPlayback,
    finishPlayback,
    pressNote,
    startNextGame,
    restartMatch,
    isGameState,
    otherPlayer,
  });
});
