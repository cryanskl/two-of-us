(function (root, factory) {
  "use strict";
  root.PAPER_SOCCER_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FIELD_WIDTH = 8;
  const FIELD_HEIGHT = 10;
  const CENTER = deepFreeze({ x: 4, y: 5 });
  const TOP_GOAL = deepFreeze({ x: 4, y: -1 });
  const BOTTOM_GOAL = deepFreeze({ x: 4, y: 11 });
  const PLAYERS = deepFreeze([
    { id: "red", fallbackName: "红方", attacks: "top" },
    { id: "blue", fallbackName: "蓝方", attacks: "bottom" },
  ]);
  const DIRECTIONS = deepFreeze([
    { id: "nw", key: "q", dx: -1, dy: -1, label: "左上" },
    { id: "n", key: "w", dx: 0, dy: -1, label: "上" },
    { id: "ne", key: "e", dx: 1, dy: -1, label: "右上" },
    { id: "w", key: "a", dx: -1, dy: 0, label: "左" },
    { id: "e", key: "d", dx: 1, dy: 0, label: "右" },
    { id: "sw", key: "z", dx: -1, dy: 1, label: "左下" },
    { id: "s", key: "x", dx: 0, dy: 1, label: "下" },
    { id: "se", key: "c", dx: 1, dy: 1, label: "右下" },
  ]);
  const DEFAULT_CONFIG = deepFreeze({
    redName: "红方",
    blueName: "蓝方",
    firstPlayer: "red",
  });

  function sanitizeConfig(value) {
    if (!value || typeof value !== "object") return DEFAULT_CONFIG;
    const redName = cleanName(value.redName);
    const blueName = cleanName(value.blueName);
    if (!redName || !blueName || redName === blueName || !isPlayer(value.firstPlayer)) return DEFAULT_CONFIG;
    if (value.chooseNextStarter !== undefined && typeof value.chooseNextStarter !== "function") return DEFAULT_CONFIG;
    return deepFreeze({ redName, blueName, firstPlayer: value.firstPlayer });
  }

  function createInitialState(configValue) {
    const config = sanitizeConfig(configValue);
    return emptyMatch({
      phase: "intro",
      starter: config.firstPlayer,
      scores: { red: 0, blue: 0 },
      matchNumber: 1,
      revision: 0,
    });
  }

  function start(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "intro") return state;
    return freezeState({ ...state, phase: "playing" });
  }

  function getLegalMoves(state) {
    if (!isGameState(state) || state.phase !== "playing") return Object.freeze([]);
    return deepFreeze(legalMovesFrom(state.ball, state.edges));
  }

  function move(state, target) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "playing" || !isPoint(target)) return state;
    const legal = legalMovesFrom(state.ball, state.edges).find((candidate) => samePoint(candidate.target, target));
    if (!legal) return state;

    const owner = state.currentPlayer;
    const from = clonePoint(state.ball);
    const to = clonePoint(legal.target);
    const edge = {
      key: edgeKey(from, to),
      from,
      to,
      owner,
    };
    const edges = [...state.edges, edge];
    const lastMove = {
      owner,
      from,
      to,
      bounced: legal.bounces,
    };
    const moveNumber = state.moveNumber + 1;

    if (isGoalPoint(to)) {
      const winner = samePoint(to, TOP_GOAL) ? "red" : "blue";
      return finish(state, {
        ball: to,
        edges,
        lastMove,
        moveNumber,
        winner,
        winReason: "goal",
        currentPlayer: owner,
        bounceChain: 0,
      });
    }

    const currentPlayer = legal.bounces ? owner : otherPlayer(owner);
    const turnNumber = legal.bounces ? state.turnNumber : state.turnNumber + 1;
    const bounceChain = legal.bounces ? state.bounceChain + 1 : 0;
    if (legal.bounces && legalMovesFrom(to, edges).length === 0) {
      return finish(state, {
        ball: to,
        edges,
        lastMove,
        moveNumber,
        winner: otherPlayer(owner),
        winReason: "trap",
        currentPlayer: owner,
        turnNumber,
        bounceChain,
      });
    }

    return freezeState({
      ...state,
      ball: to,
      edges,
      lastMove,
      moveNumber,
      currentPlayer,
      turnNumber,
      bounceChain,
    });
  }

  function resolveNextStarter(policy, context) {
    const previousStarter = isPlayer(context?.previousStarter) ? context.previousStarter : "red";
    const fallback = otherPlayer(previousStarter);
    if (!isPolicyContext(context) || typeof policy !== "function") return fallback;
    const safeContext = deepFreeze({
      previousStarter,
      winner: context.winner,
      winReason: context.winReason,
      matchNumber: context.matchNumber,
    });
    try {
      const result = policy(safeContext);
      return isPlayer(result) ? result : fallback;
    } catch {
      return fallback;
    }
  }

  function rematch(state, nextStarter) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "complete" || !isPlayer(nextStarter)) return state;
    return emptyMatch({
      phase: "playing",
      starter: nextStarter,
      scores: state.scores,
      matchNumber: state.matchNumber + 1,
      revision: state.revision + 1,
    });
  }

  function resetSeries(state, firstPlayer) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "complete") return state;
    const starter = isPlayer(firstPlayer) ? firstPlayer : state.starter;
    return emptyMatch({
      phase: "intro",
      starter,
      scores: { red: 0, blue: 0 },
      matchNumber: 1,
      revision: state.revision + 1,
    });
  }

  function edgeKey(a, b) {
    if (!isPoint(a) || !isPoint(b)) return null;
    const [first, second] = comparePoints(a, b) <= 0 ? [a, b] : [b, a];
    return `${first.x},${first.y}|${second.x},${second.y}`;
  }

  function directionForKey(key) {
    if (typeof key !== "string") return null;
    const normalized = key.toLowerCase();
    return DIRECTIONS.find((direction) => direction.key === normalized)?.id ?? null;
  }

  function isGameState(value) {
    if (!value || typeof value !== "object" || !["intro", "playing", "complete"].includes(value.phase)) return false;
    if (!isPlayer(value.currentPlayer) || !isPlayer(value.starter)) return false;
    if (!isPoint(value.ball) || (!isFieldPoint(value.ball) && !isGoalPoint(value.ball))) return false;
    if (!Array.isArray(value.edges) || !isScore(value.scores)) return false;
    if (!Number.isInteger(value.turnNumber) || value.turnNumber < 1 || value.turnNumber > value.moveNumber + 1) return false;
    if (!Number.isInteger(value.moveNumber) || value.moveNumber < 0 || value.edges.length !== value.moveNumber) return false;
    if (!Number.isInteger(value.bounceChain) || value.bounceChain < 0 || value.bounceChain > value.moveNumber) return false;
    if (!Number.isInteger(value.matchNumber) || value.matchNumber < 1 || !Number.isInteger(value.revision) || value.revision < 0) return false;
    if (!isValidEdges(value.edges)) return false;
    const scoreTotal = value.scores.red + value.scores.blue;
    if (value.phase === "complete" ? scoreTotal !== value.matchNumber : scoreTotal !== value.matchNumber - 1) return false;
    if (value.moveNumber === 0 ? value.lastMove !== null : !isLastMove(value.lastMove, value.edges.at(-1), value.ball)) return false;

    if (value.phase === "intro") {
      return value.moveNumber === 0 && samePoint(value.ball, CENTER) && value.currentPlayer === value.starter
        && value.turnNumber === 1 && value.bounceChain === 0 && value.winner === null && value.winReason === null;
    }
    if (value.phase === "playing") {
      return isFieldPoint(value.ball) && value.winner === null && value.winReason === null
        && legalMovesFrom(value.ball, value.edges).length > 0;
    }
    if (!isPlayer(value.winner) || !["goal", "trap"].includes(value.winReason)) return false;
    if (value.scores[value.winner] < 1) return false;
    if (value.winReason === "goal") {
      const expected = samePoint(value.ball, TOP_GOAL) ? "red" : samePoint(value.ball, BOTTOM_GOAL) ? "blue" : null;
      return expected === value.winner;
    }
    return isFieldPoint(value.ball) && value.currentPlayer !== value.winner
      && legalMovesFrom(value.ball, value.edges).length === 0;
  }

  function legalMovesFrom(ball, edges) {
    if (!isFieldPoint(ball) || !Array.isArray(edges)) return [];
    const used = new Set(edges.map((edge) => edge.key));
    const moves = [];
    for (const direction of DIRECTIONS) {
      const target = { x: ball.x + direction.dx, y: ball.y + direction.dy };
      if (!isPotentialStep(ball, target)) continue;
      const key = edgeKey(ball, target);
      if (used.has(key)) continue;
      moves.push({
        id: direction.id,
        key: direction.key,
        label: direction.label,
        target,
        bounces: !isGoalPoint(target) && wasVisitedBeforeMove(target, edges),
      });
    }
    return moves;
  }

  function wasVisitedBeforeMove(point, edges) {
    return isBoundaryPoint(point) || edges.some((edge) => samePoint(edge.from, point) || samePoint(edge.to, point));
  }

  function isPotentialStep(from, to) {
    if (!isFieldPoint(from) || !isPoint(to)) return false;
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    if (dx > 1 || dy > 1 || dx + dy === 0) return false;
    if (isFieldPoint(to)) return !isBoundaryEdge(from, to);
    if (samePoint(to, TOP_GOAL)) return from.y === 0 && from.x >= 3 && from.x <= 5;
    if (samePoint(to, BOTTOM_GOAL)) return from.y === FIELD_HEIGHT && from.x >= 3 && from.x <= 5;
    return false;
  }

  function isBoundaryEdge(a, b) {
    return (a.x === 0 && b.x === 0) || (a.x === FIELD_WIDTH && b.x === FIELD_WIDTH)
      || (a.y === 0 && b.y === 0) || (a.y === FIELD_HEIGHT && b.y === FIELD_HEIGHT);
  }

  function isBoundaryPoint(point) {
    return isFieldPoint(point) && (point.x === 0 || point.x === FIELD_WIDTH || point.y === 0 || point.y === FIELD_HEIGHT);
  }

  function finish(state, patch) {
    const scores = { ...state.scores };
    scores[patch.winner] += 1;
    return freezeState({
      ...state,
      ...patch,
      phase: "complete",
      scores,
    });
  }

  function emptyMatch({ phase, starter, scores, matchNumber, revision }) {
    return freezeState({
      phase,
      currentPlayer: starter,
      starter,
      ball: CENTER,
      edges: [],
      turnNumber: 1,
      moveNumber: 0,
      bounceChain: 0,
      scores,
      winner: null,
      winReason: null,
      lastMove: null,
      matchNumber,
      revision,
    });
  }

  function isValidEdges(edges) {
    const keys = new Set();
    for (const edge of edges) {
      if (!edge || typeof edge !== "object" || !isPlayer(edge.owner)) return false;
      if (!isPoint(edge.from) || !isPoint(edge.to) || !isPotentialStep(edge.from, edge.to)) return false;
      if (edge.key !== edgeKey(edge.from, edge.to) || keys.has(edge.key)) return false;
      keys.add(edge.key);
    }
    return true;
  }

  function isLastMove(moveValue, edge, ball) {
    return moveValue && edge && isPlayer(moveValue.owner) && typeof moveValue.bounced === "boolean"
      && moveValue.owner === edge.owner && samePoint(moveValue.from, edge.from)
      && samePoint(moveValue.to, edge.to) && samePoint(moveValue.to, ball);
  }

  function isPolicyContext(value) {
    return value && isPlayer(value.previousStarter) && isPlayer(value.winner)
      && ["goal", "trap"].includes(value.winReason)
      && Number.isInteger(value.matchNumber) && value.matchNumber >= 1;
  }

  function isScore(value) {
    return value && Number.isInteger(value.red) && value.red >= 0
      && Number.isInteger(value.blue) && value.blue >= 0;
  }

  function isFieldPoint(point) {
    return isPoint(point) && point.x >= 0 && point.x <= FIELD_WIDTH && point.y >= 0 && point.y <= FIELD_HEIGHT;
  }

  function isGoalPoint(point) {
    return samePoint(point, TOP_GOAL) || samePoint(point, BOTTOM_GOAL);
  }

  function isPoint(value) {
    return value && Number.isInteger(value.x) && Number.isInteger(value.y);
  }

  function isPlayer(value) {
    return value === "red" || value === "blue";
  }

  function otherPlayer(player) {
    return player === "red" ? "blue" : "red";
  }

  function cleanName(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text.length >= 1 && text.length <= 16 ? text : null;
  }

  function comparePoints(a, b) {
    return a.y === b.y ? a.x - b.x : a.y - b.y;
  }

  function samePoint(a, b) {
    return Boolean(a && b && a.x === b.x && a.y === b.y);
  }

  function clonePoint(point) {
    return { x: point.x, y: point.y };
  }

  function freezeState(value) {
    return deepFreeze({
      ...value,
      ball: clonePoint(value.ball),
      edges: value.edges.map((edge) => ({
        ...edge,
        from: clonePoint(edge.from),
        to: clonePoint(edge.to),
      })),
      scores: { ...value.scores },
      lastMove: value.lastMove ? {
        ...value.lastMove,
        from: clonePoint(value.lastMove.from),
        to: clonePoint(value.lastMove.to),
      } : null,
    });
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  return Object.freeze({
    FIELD_WIDTH,
    FIELD_HEIGHT,
    CENTER,
    TOP_GOAL,
    BOTTOM_GOAL,
    PLAYERS,
    DIRECTIONS,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    start,
    getLegalMoves,
    move,
    resolveNextStarter,
    rematch,
    resetSeries,
    edgeKey,
    directionForKey,
    isGameState,
  });
});
