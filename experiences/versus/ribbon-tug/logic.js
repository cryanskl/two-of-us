(function (root, factory) {
  "use strict";
  root.RIBBON_TUG_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_ROUND_COUNTDOWN_MS = 2400;
  const RESUME_COUNTDOWN_MS = 1200;
  const PULL_DISTANCE = 0.085;
  const RETURN_RATE_PER_SECOND = 0.08;
  const MAX_PULLS_PER_STEP = 6;
  const TARGET_SCORE = 2;
  const PHASES = Object.freeze([
    "idle",
    "countdown",
    "playing",
    "paused",
    "round-end",
    "match-end",
  ]);

  function createMatchState() {
    return freezeState({
      phase: "idle",
      position: 0,
      leftScore: 0,
      rightScore: 0,
      roundNumber: 0,
      countdownMs: 0,
      lastWinner: null,
      pauseReason: null,
    });
  }

  function startRound(state, countdownMs = DEFAULT_ROUND_COUNTDOWN_MS) {
    if (!isValidState(state)) return createMatchState();
    if (state.phase !== "idle" && state.phase !== "round-end") return state;

    return freezeState({
      ...state,
      phase: "countdown",
      position: 0,
      roundNumber: state.phase === "idle" ? 1 : state.roundNumber + 1,
      countdownMs: normalizeCountdown(countdownMs, DEFAULT_ROUND_COUNTDOWN_MS),
      lastWinner: null,
      pauseReason: null,
    });
  }

  function advanceMatch(state, input = {}) {
    if (!isValidState(state)) return createMatchState();
    if (state.phase !== "countdown" && state.phase !== "playing") return state;

    const elapsedMs = normalizeElapsed(input?.elapsedMs);
    if (elapsedMs === null) return state;

    if (state.phase === "countdown") {
      const countdownMs = Math.max(0, state.countdownMs - elapsedMs);
      return freezeState({
        ...state,
        phase: countdownMs === 0 ? "playing" : "countdown",
        countdownMs,
      });
    }

    const leftPulls = normalizePulls(input?.leftPulls);
    const rightPulls = normalizePulls(input?.rightPulls);
    const netPull = rightPulls - leftPulls;
    const pulledPosition = clampPosition(state.position + netPull * PULL_DISTANCE);

    if (pulledPosition <= -1) return settleRound(state, "left", -1);
    if (pulledPosition >= 1) return settleRound(state, "right", 1);

    return freezeState({
      ...state,
      position: returnTowardCenter(pulledPosition, elapsedMs),
      countdownMs: 0,
    });
  }

  function pauseMatch(state, reason = "manual") {
    if (!isValidState(state)) return createMatchState();
    if (state.phase !== "countdown" && state.phase !== "playing") return state;

    return freezeState({
      ...state,
      phase: "paused",
      countdownMs: 0,
      pauseReason: normalizePauseReason(reason),
    });
  }

  function resumeMatch(state) {
    if (!isValidState(state)) return createMatchState();
    if (state.phase !== "paused") return state;

    return freezeState({
      ...state,
      phase: "countdown",
      countdownMs: RESUME_COUNTDOWN_MS,
      pauseReason: null,
    });
  }

  function resetMatch() {
    return createMatchState();
  }

  function classifyPullKey(input) {
    if (!input || typeof input !== "object" || input.repeat !== false || input.isHeld !== false) return null;
    const key = typeof input.key === "string" ? input.key.toLowerCase() : "";
    if (key === "a") return "left";
    if (key === "l") return "right";
    return null;
  }

  function settleRound(state, winner, position) {
    const leftScore = state.leftScore + (winner === "left" ? 1 : 0);
    const rightScore = state.rightScore + (winner === "right" ? 1 : 0);
    const matchFinished = leftScore >= TARGET_SCORE || rightScore >= TARGET_SCORE;

    return freezeState({
      ...state,
      phase: matchFinished ? "match-end" : "round-end",
      position,
      leftScore,
      rightScore,
      countdownMs: 0,
      lastWinner: winner,
      pauseReason: null,
    });
  }

  function normalizePulls(value) {
    if (!Number.isInteger(value) || value < 0) return 0;
    return Math.min(value, MAX_PULLS_PER_STEP);
  }

  function normalizeElapsed(value) {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function normalizeCountdown(value, fallback) {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function normalizePauseReason(value) {
    const reason = typeof value === "string" ? value.trim().slice(0, 40) : "";
    return reason || "manual";
  }

  function returnTowardCenter(position, elapsedMs) {
    const distance = RETURN_RATE_PER_SECOND * (elapsedMs / 1000);
    if (position > 0) return clampPosition(Math.max(0, position - distance));
    if (position < 0) return clampPosition(Math.min(0, position + distance));
    return 0;
  }

  function clampPosition(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-1, Math.min(1, value));
  }

  function isValidState(value) {
    if (!value || typeof value !== "object" || !PHASES.includes(value.phase)) return false;
    if (!Number.isFinite(value.position) || value.position < -1 || value.position > 1) return false;
    if (!isScore(value.leftScore) || !isScore(value.rightScore)) return false;
    if (!Number.isInteger(value.roundNumber) || value.roundNumber < 0) return false;
    if (!Number.isFinite(value.countdownMs) || value.countdownMs < 0) return false;
    if (value.lastWinner !== null && value.lastWinner !== "left" && value.lastWinner !== "right") return false;
    if (value.pauseReason !== null && typeof value.pauseReason !== "string") return false;

    if (value.phase === "idle") {
      return value.position === 0
        && value.leftScore === 0
        && value.rightScore === 0
        && value.roundNumber === 0
        && value.countdownMs === 0
        && value.lastWinner === null
        && value.pauseReason === null;
    }
    if (value.roundNumber < 1) return false;
    if (value.phase === "countdown") return value.lastWinner === null && value.pauseReason === null;
    if (value.phase === "playing") {
      return value.countdownMs === 0 && value.lastWinner === null && value.pauseReason === null;
    }
    if (value.phase === "paused") {
      return value.countdownMs === 0 && value.lastWinner === null && typeof value.pauseReason === "string";
    }

    const winnerPositionMatches = value.lastWinner === "left" ? value.position === -1 : value.position === 1;
    if (!winnerPositionMatches || value.countdownMs !== 0 || value.pauseReason !== null) return false;
    const reachedTarget = value.leftScore >= TARGET_SCORE || value.rightScore >= TARGET_SCORE;
    return value.phase === "match-end" ? reachedTarget : !reachedTarget;
  }

  function isScore(value) {
    return Number.isInteger(value) && value >= 0 && value <= TARGET_SCORE;
  }

  function freezeState(state) {
    return Object.freeze(state);
  }

  return Object.freeze({
    DEFAULT_ROUND_COUNTDOWN_MS,
    RESUME_COUNTDOWN_MS,
    PULL_DISTANCE,
    RETURN_RATE_PER_SECOND,
    MAX_PULLS_PER_STEP,
    TARGET_SCORE,
    createMatchState,
    startRound,
    advanceMatch,
    pauseMatch,
    resumeMatch,
    resetMatch,
    classifyPullKey,
  });
});
