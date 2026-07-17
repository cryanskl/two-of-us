(function (root, factory) {
  "use strict";
  root.BALLOON_DARE_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MIN_BURST_POINT = 4;
  const MAX_BURST_POINT = 8;
  const TOTAL_ROUNDS = 4;
  const TOTAL_TURNS = TOTAL_ROUNDS * 2;
  const UINT32_RANGE = 0x100000000;
  const UINT32_ACCEPT_LIMIT = UINT32_RANGE - (UINT32_RANGE % (MAX_BURST_POINT - MIN_BURST_POINT + 1));
  const TURN_ORDER = Object.freeze([0, 1, 1, 0, 0, 1, 1, 0]);
  const PHASES = new Set(["intro", "handoff", "pumping", "burst", "banked", "complete"]);

  function createDareState() {
    return freezeState({
      phase: "intro",
      turnIndex: 0,
      scores: [0, 0],
      pumps: 0,
      pending: 0,
      burstPoint: null,
      outcome: null,
    });
  }

  function startMatch(state) {
    if (!isDareState(state)) return createDareState();
    return state.phase === "intro" ? update(state, { phase: "handoff" }) : state;
  }

  function beginTurn(state, burstPoint) {
    if (!isDareState(state)) return createDareState();
    if (state.phase !== "handoff" || !isBurstPoint(burstPoint)) return state;
    return update(state, {
      phase: "pumping",
      pumps: 0,
      pending: 0,
      burstPoint,
      outcome: null,
    });
  }

  function pumpBalloon(state) {
    if (!isDareState(state)) return createDareState();
    if (state.phase !== "pumping") return state;
    const pumps = state.pumps + 1;
    if (pumps >= state.burstPoint) {
      return update(state, {
        phase: "burst",
        pumps,
        pending: 0,
        outcome: {
          type: "burst",
          playerIndex: playerForTurn(state.turnIndex),
          pumps,
          lost: state.pending,
        },
      });
    }
    return update(state, { pumps, pending: scoreForPumps(pumps) });
  }

  function bankTurn(state) {
    if (!isDareState(state)) return createDareState();
    if (state.phase !== "pumping" || state.pumps < 1 || state.pending < 1) return state;
    const playerIndex = playerForTurn(state.turnIndex);
    const scores = [...state.scores];
    scores[playerIndex] += state.pending;
    return update(state, {
      phase: "banked",
      scores,
      outcome: {
        type: "banked",
        playerIndex,
        pumps: state.pumps,
        points: state.pending,
      },
    });
  }

  function advanceTurn(state) {
    if (!isDareState(state)) return createDareState();
    if (state.phase !== "burst" && state.phase !== "banked") return state;
    if (state.turnIndex === TOTAL_TURNS - 1) {
      return update(state, {
        phase: "complete",
        pumps: 0,
        pending: 0,
        burstPoint: null,
        outcome: null,
      });
    }
    return update(state, {
      phase: "handoff",
      turnIndex: state.turnIndex + 1,
      pumps: 0,
      pending: 0,
      burstPoint: null,
      outcome: null,
    });
  }

  function restartMatch() {
    return createDareState();
  }

  function playerForTurn(turnIndex) {
    return Number.isInteger(turnIndex) && turnIndex >= 0 && turnIndex < TOTAL_TURNS
      ? TURN_ORDER[turnIndex]
      : null;
  }

  function roundForTurn(turnIndex) {
    return playerForTurn(turnIndex) === null ? null : Math.floor(turnIndex / 2) + 1;
  }

  function scoreForPumps(pumps) {
    return Number.isInteger(pumps) && pumps >= 0 && pumps < MAX_BURST_POINT
      ? (pumps * (pumps + 1)) / 2
      : 0;
  }

  function mapRandomToBurstPoint(value) {
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_ACCEPT_LIMIT) return null;
    return MIN_BURST_POINT + (value % (MAX_BURST_POINT - MIN_BURST_POINT + 1));
  }

  function winnerForScores(scores) {
    if (!isScores(scores)) return null;
    if (scores[0] === scores[1]) return "tie";
    return scores[0] > scores[1] ? 0 : 1;
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch });
  }

  function isDareState(value) {
    if (!value || typeof value !== "object" || !PHASES.has(value.phase)) return false;
    if (!Number.isInteger(value.turnIndex) || value.turnIndex < 0 || value.turnIndex >= TOTAL_TURNS) return false;
    if (!isScores(value.scores) || !Number.isInteger(value.pumps) || value.pumps < 0 || value.pumps > MAX_BURST_POINT) return false;
    if (!Number.isInteger(value.pending) || value.pending < 0 || value.pending !== scoreForPumps(value.pumps) && value.pending !== 0) return false;
    if (value.burstPoint !== null && !isBurstPoint(value.burstPoint)) return false;
    if (value.outcome !== null && !isOutcome(value.outcome)) return false;

    if (value.phase === "intro" || value.phase === "handoff" || value.phase === "complete") {
      return value.pumps === 0 && value.pending === 0 && value.burstPoint === null && value.outcome === null;
    }
    if (value.phase === "pumping") {
      return isBurstPoint(value.burstPoint)
        && value.pumps < value.burstPoint
        && value.pending === scoreForPumps(value.pumps)
        && value.outcome === null;
    }
    if (value.phase === "burst") {
      return isBurstPoint(value.burstPoint)
        && value.pumps === value.burstPoint
        && value.pending === 0
        && value.outcome?.type === "burst"
        && value.outcome.playerIndex === playerForTurn(value.turnIndex);
    }
    return isBurstPoint(value.burstPoint)
      && value.pumps > 0
      && value.pending === scoreForPumps(value.pumps)
      && value.outcome?.type === "banked"
      && value.outcome.playerIndex === playerForTurn(value.turnIndex)
      && value.outcome.points === value.pending;
  }

  function isScores(value) {
    return Array.isArray(value)
      && value.length === 2
      && value.every((score) => Number.isSafeInteger(score) && score >= 0);
  }

  function isBurstPoint(value) {
    return Number.isInteger(value) && value >= MIN_BURST_POINT && value <= MAX_BURST_POINT;
  }

  function isOutcome(value) {
    if (!value || typeof value !== "object" || (value.playerIndex !== 0 && value.playerIndex !== 1)) return false;
    if (!Number.isInteger(value.pumps) || value.pumps < 1 || value.pumps > MAX_BURST_POINT) return false;
    if (value.type === "burst") return Number.isSafeInteger(value.lost) && value.lost >= 0;
    return value.type === "banked" && Number.isSafeInteger(value.points) && value.points >= 1;
  }

  function freezeState(value) {
    return Object.freeze({
      ...value,
      scores: Object.freeze([...value.scores]),
      outcome: value.outcome ? Object.freeze({ ...value.outcome }) : null,
    });
  }

  return Object.freeze({
    MIN_BURST_POINT,
    MAX_BURST_POINT,
    TOTAL_ROUNDS,
    TOTAL_TURNS,
    UINT32_ACCEPT_LIMIT,
    TURN_ORDER,
    createDareState,
    startMatch,
    beginTurn,
    pumpBalloon,
    bankTurn,
    advanceTurn,
    restartMatch,
    playerForTurn,
    roundForTurn,
    scoreForPumps,
    mapRandomToBurstPoint,
    winnerForScores,
  });
});
