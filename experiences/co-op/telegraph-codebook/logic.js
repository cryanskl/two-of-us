(function (root, factory) {
  "use strict";
  root.TELEGRAPH_CODEBOOK_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PULSES = Object.freeze(["short", "long"]);
  const PHASES = new Set([
    "intro",
    "senderHandoff",
    "sending",
    "receiverHandoff",
    "playback",
    "guessing",
    "result",
    "complete",
  ]);
  const RESULT_KINDS = new Set([null, "delivered", "encodingError", "decodingError", "bothError"]);
  const CODEBOOK = deepFreeze([
    { id: "moon", label: "月亮", pulses: ["short", "short", "long"] },
    { id: "stars", label: "星星", pulses: ["short", "long", "short"] },
    { id: "cloud", label: "云朵", pulses: ["short", "long", "long"] },
    { id: "tea", label: "热茶", pulses: ["long", "short", "short"] },
    { id: "movie", label: "电影", pulses: ["long", "short", "long"] },
    { id: "walk", label: "散步", pulses: ["long", "long", "short"] },
  ]);
  const CODE_IDS = new Set(CODEBOOK.map((item) => item.id));
  const DEFAULT_ROUNDS = deepFreeze([
    { targetId: "moon", candidateIds: ["cloud", "moon", "movie", "tea"] },
    { targetId: "stars", candidateIds: ["walk", "tea", "stars", "cloud"] },
    { targetId: "movie", candidateIds: ["moon", "walk", "movie", "stars"] },
    { targetId: "walk", candidateIds: ["tea", "cloud", "stars", "walk"] },
  ]);

  function createInitialState(rounds = DEFAULT_ROUNDS) {
    const safeRounds = validateRounds(rounds) ? rounds : DEFAULT_ROUNDS;
    return freezeState({
      phase: "intro",
      roundIndex: 0,
      rounds: safeRounds,
      sentPulses: [],
      guess: null,
      replaysUsed: 0,
      score: 0,
      resultKind: null,
      playbackToken: 0,
    });
  }

  function startGame(state) {
    return transition(state, "intro", { phase: "senderHandoff" });
  }

  function readySender(state) {
    return transition(state, "senderHandoff", { phase: "sending" });
  }

  function tapPulse(state, pulse) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "sending" || !PULSES.includes(pulse) || state.sentPulses.length >= 3) return state;
    return update(state, { sentPulses: [...state.sentPulses, pulse] });
  }

  function undoPulse(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "sending" || state.sentPulses.length === 0) return state;
    return update(state, { sentPulses: state.sentPulses.slice(0, -1) });
  }

  function sealTelegram(state) {
    if (!isGameState(state)) return createInitialState();
    return state.phase === "sending" && state.sentPulses.length === 3
      ? update(state, { phase: "receiverHandoff" })
      : state;
  }

  function readyReceiver(state) {
    if (!isGameState(state)) return createInitialState();
    return state.phase === "receiverHandoff"
      ? update(state, { phase: "playback", playbackToken: state.playbackToken + 1 })
      : state;
  }

  function finishPlayback(state, token) {
    if (!isGameState(state)) return createInitialState();
    return state.phase === "playback" && token === state.playbackToken
      ? update(state, { phase: "guessing" })
      : state;
  }

  function replay(state) {
    if (!isGameState(state)) return createInitialState();
    return state.phase === "guessing" && state.replaysUsed === 0
      ? update(state, {
        phase: "playback",
        replaysUsed: 1,
        playbackToken: state.playbackToken + 1,
      })
      : state;
  }

  function guess(state, candidateId) {
    if (!isGameState(state)) return createInitialState();
    const round = state.rounds[state.roundIndex];
    if (state.phase !== "guessing" || !round.candidateIds.includes(candidateId)) return state;
    const target = getCode(candidateId === round.targetId ? candidateId : round.targetId);
    const encodingCorrect = samePulses(state.sentPulses, target.pulses);
    const decodingCorrect = candidateId === round.targetId;
    const resultKind = encodingCorrect && decodingCorrect
      ? "delivered"
      : !encodingCorrect && decodingCorrect
        ? "encodingError"
        : encodingCorrect
          ? "decodingError"
          : "bothError";
    return update(state, {
      phase: "result",
      guess: candidateId,
      resultKind,
      score: state.score + (resultKind === "delivered" ? 1 : 0),
    });
  }

  function nextRound(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "result") return state;
    if (state.roundIndex === state.rounds.length - 1) return update(state, { phase: "complete" });
    return update(state, {
      phase: "senderHandoff",
      roundIndex: state.roundIndex + 1,
      sentPulses: [],
      guess: null,
      replaysUsed: 0,
      resultKind: null,
    });
  }

  function restart(state, rounds = DEFAULT_ROUNDS) {
    if (!isGameState(state)) return createInitialState(rounds);
    return state.phase === "complete" ? createInitialState(rounds) : state;
  }

  function createRoundPlan(randomIndex) {
    if (typeof randomIndex !== "function") return DEFAULT_ROUNDS;
    try {
      const targets = shuffle(CODEBOOK.map((item) => item.id), randomIndex).slice(0, 4);
      const rounds = targets.map((targetId) => {
        const decoys = shuffle(CODEBOOK.map((item) => item.id).filter((id) => id !== targetId), randomIndex).slice(0, 3);
        return { targetId, candidateIds: shuffle([targetId, ...decoys], randomIndex) };
      });
      return validateRounds(rounds) ? deepFreeze(rounds) : DEFAULT_ROUNDS;
    } catch {
      return DEFAULT_ROUNDS;
    }
  }

  function shuffle(items, randomIndex) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const next = randomIndex(index + 1);
      if (!Number.isInteger(next) || next < 0 || next > index) throw new Error("invalid random index");
      [result[index], result[next]] = [result[next], result[index]];
    }
    return result;
  }

  function validateRounds(rounds) {
    if (!Array.isArray(rounds) || rounds.length !== 4) return false;
    const targets = new Set();
    for (const round of rounds) {
      if (!round || typeof round !== "object" || !CODE_IDS.has(round.targetId) || targets.has(round.targetId)) return false;
      if (!Array.isArray(round.candidateIds) || round.candidateIds.length !== 4) return false;
      const candidates = new Set(round.candidateIds);
      if (candidates.size !== 4 || !candidates.has(round.targetId)) return false;
      if ([...candidates].some((id) => !CODE_IDS.has(id))) return false;
      targets.add(round.targetId);
    }
    return true;
  }

  function getCode(id) {
    return CODEBOOK.find((item) => item.id === id) || null;
  }

  function transition(state, phase, patch) {
    if (!isGameState(state)) return createInitialState();
    return state.phase === phase ? update(state, patch) : state;
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch });
  }

  function samePulses(left, right) {
    return left.length === right.length && left.every((pulse, index) => pulse === right[index]);
  }

  function isGameState(value) {
    if (!value || typeof value !== "object" || !PHASES.has(value.phase)) return false;
    if (!validateRounds(value.rounds)) return false;
    if (!Number.isInteger(value.roundIndex) || value.roundIndex < 0 || value.roundIndex >= value.rounds.length) return false;
    if (!Array.isArray(value.sentPulses) || value.sentPulses.length > 3 || !value.sentPulses.every((pulse) => PULSES.includes(pulse))) return false;
    if (value.guess !== null && !CODE_IDS.has(value.guess)) return false;
    if ((value.replaysUsed !== 0 && value.replaysUsed !== 1)
      || !Number.isInteger(value.score) || value.score < 0 || value.score > value.roundIndex + 1
      || !RESULT_KINDS.has(value.resultKind)
      || !Number.isInteger(value.playbackToken) || value.playbackToken < 0) return false;
    if (["receiverHandoff", "playback", "guessing", "result", "complete"].includes(value.phase) && value.sentPulses.length !== 3) return false;
    if ((value.phase === "result" || value.phase === "complete") && (value.guess === null || value.resultKind === null)) return false;
    return true;
  }

  function freezeState(value) {
    return Object.freeze({
      ...value,
      rounds: deepFreeze(value.rounds.map((round) => ({
        targetId: round.targetId,
        candidateIds: [...round.candidateIds],
      }))),
      sentPulses: Object.freeze([...value.sentPulses]),
    });
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  return Object.freeze({
    PULSES,
    CODEBOOK,
    DEFAULT_ROUNDS,
    createInitialState,
    startGame,
    readySender,
    tapPulse,
    undoPulse,
    sealTelegram,
    readyReceiver,
    finishPlayback,
    replay,
    guess,
    nextRound,
    restart,
    createRoundPlan,
    validateRounds,
    getCode,
  });
});
