(function (root, factory) {
  "use strict";
  root.DOTS_AND_BOXES_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BOARD_SIZE = 4;
  const DOT_COUNT = BOARD_SIZE + 1;
  const TOTAL_BOXES = BOARD_SIZE * BOARD_SIZE;
  const TOTAL_EDGES = DOT_COUNT * BOARD_SIZE * 2;
  const PHASES = deepFreeze({ INTRO: "intro", PLAYING: "playing", FINISHED: "finished" });
  const STATE_KEYS = deepFreeze([
    "phase", "starter", "currentPlayer", "playerNames", "edges", "boxes",
    "scores", "moves", "lastMove", "revision",
  ]);
  const EDGE_KEYS = deepFreeze(["id", "owner"]);
  const BOX_KEYS = deepFreeze(["id", "owner"]);
  const LAST_MOVE_KEYS = deepFreeze(["edgeId", "player", "capturedBoxIds", "kind"]);
  const CONFIG_KEYS = deepFreeze(["composeResult", "playerNames"]);
  const RESULT_KEYS = deepFreeze(["body", "title"]);

  const ALL_EDGE_IDS = deepFreeze(buildAllEdgeIds());
  const ALL_BOX_IDS = deepFreeze(buildAllBoxIds());
  const EDGE_ORDER = new Map(ALL_EDGE_IDS.map((id, index) => [id, index]));

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: ["朱方", "蓝方"],
    composeResult() {
      return null;
    },
  });

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function") || Object.isFrozen(value)) {
      return value;
    }
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], visited);
    return value;
  }

  function sanitizeConfig(value) {
    try {
      if (!isPlainRecord(value) || !hasExactKeys(value, CONFIG_KEYS)) return DEFAULT_CONFIG;
      if (!Array.isArray(value.playerNames) || value.playerNames.length !== 2) return DEFAULT_CONFIG;
      const playerNames = value.playerNames.map(cleanName);
      if (playerNames.some((name) => name === null) || playerNames[0] === playerNames[1]) return DEFAULT_CONFIG;
      if (typeof value.composeResult !== "function") return DEFAULT_CONFIG;
      const formatter = value.composeResult;
      return deepFreeze({
        playerNames: [...playerNames],
        composeResult(context) {
          return formatter(context);
        },
      });
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  function makeEdgeId(orientation, row, column) {
    if (orientation !== "H" && orientation !== "V") return null;
    if (!Number.isInteger(row) || !Number.isInteger(column)) return null;
    const rowMax = orientation === "H" ? DOT_COUNT - 1 : BOARD_SIZE - 1;
    const columnMax = orientation === "H" ? BOARD_SIZE - 1 : DOT_COUNT - 1;
    return row >= 0 && row <= rowMax && column >= 0 && column <= columnMax
      ? `${orientation}:${row}:${column}`
      : null;
  }

  function parseEdgeId(edgeId) {
    if (typeof edgeId !== "string") return null;
    const match = /^(H|V):(0|[1-9]\d*):(0|[1-9]\d*)$/.exec(edgeId);
    if (!match) return null;
    const orientation = match[1];
    const row = Number(match[2]);
    const column = Number(match[3]);
    return makeEdgeId(orientation, row, column) === edgeId
      ? deepFreeze({ orientation, row, column })
      : null;
  }

  function getAllEdgeIds() {
    return deepFreeze([...ALL_EDGE_IDS]);
  }

  function makeBoxId(row, column) {
    return Number.isInteger(row) && Number.isInteger(column)
      && row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE
      ? `B:${row}:${column}`
      : null;
  }

  function parseBoxId(boxId) {
    if (typeof boxId !== "string") return null;
    const match = /^B:(0|[1-9]\d*):(0|[1-9]\d*)$/.exec(boxId);
    if (!match) return null;
    const row = Number(match[1]);
    const column = Number(match[2]);
    return makeBoxId(row, column) === boxId ? deepFreeze({ row, column }) : null;
  }

  function getAllBoxIds() {
    return deepFreeze([...ALL_BOX_IDS]);
  }

  function getBoxEdgeIds(boxId) {
    const box = parseBoxId(boxId);
    if (!box) return deepFreeze([]);
    return deepFreeze([
      makeEdgeId("H", box.row, box.column),
      makeEdgeId("H", box.row + 1, box.column),
      makeEdgeId("V", box.row, box.column),
      makeEdgeId("V", box.row, box.column + 1),
    ]);
  }

  function getAdjacentBoxIds(edgeId) {
    const edge = parseEdgeId(edgeId);
    if (!edge) return deepFreeze([]);
    const ids = [];
    if (edge.orientation === "H") {
      if (edge.row > 0) ids.push(makeBoxId(edge.row - 1, edge.column));
      if (edge.row < BOARD_SIZE) ids.push(makeBoxId(edge.row, edge.column));
    } else {
      if (edge.column > 0) ids.push(makeBoxId(edge.row, edge.column - 1));
      if (edge.column < BOARD_SIZE) ids.push(makeBoxId(edge.row, edge.column));
    }
    return deepFreeze(ids);
  }

  function isBoxClosed(boxId, edges) {
    const required = getBoxEdgeIds(boxId);
    if (required.length !== 4) return false;
    const used = edgeIdSet(edges);
    return used !== null && required.every((id) => used.has(id));
  }

  function createInitialState(configValue) {
    const config = sanitizeConfig(configValue === undefined ? DEFAULT_CONFIG : configValue);
    return freezeState({
      phase: PHASES.INTRO,
      starter: 0,
      currentPlayer: 0,
      playerNames: config.playerNames,
      edges: [],
      boxes: ALL_BOX_IDS.map((id) => ({ id, owner: null })),
      scores: [0, 0],
      moves: 0,
      lastMove: null,
      revision: 0,
    });
  }

  function isDotsAndBoxesState(value) {
    try {
      if (!isPlainRecord(value) || !hasExactKeys(value, STATE_KEYS)) return false;
      if (!Object.values(PHASES).includes(value.phase)) return false;
      if (!isPlayer(value.starter) || !isPlayer(value.currentPlayer)) return false;
      if (!isValidNames(value.playerNames)) return false;
      if (!Array.isArray(value.edges) || value.edges.length > TOTAL_EDGES) return false;
      if (!Array.isArray(value.boxes) || value.boxes.length !== TOTAL_BOXES) return false;
      if (!Array.isArray(value.scores) || value.scores.length !== 2
        || !value.scores.every((score) => Number.isInteger(score) && score >= 0)) return false;
      if (!Number.isInteger(value.moves) || value.moves < 0 || value.moves !== value.edges.length) return false;
      if (!Number.isInteger(value.revision) || value.revision < 0) return false;

      const edgeOwners = new Map();
      let previousOrder = -1;
      for (const edge of value.edges) {
        if (!isPlainRecord(edge) || !hasExactKeys(edge, EDGE_KEYS) || !isPlayer(edge.owner)) return false;
        const order = EDGE_ORDER.get(edge.id);
        if (order === undefined || order <= previousOrder || edgeOwners.has(edge.id)) return false;
        previousOrder = order;
        edgeOwners.set(edge.id, edge.owner);
      }

      const usedEdges = new Set(edgeOwners.keys());
      const countedScores = [0, 0];
      for (let index = 0; index < value.boxes.length; index += 1) {
        const box = value.boxes[index];
        if (!isPlainRecord(box) || !hasExactKeys(box, BOX_KEYS) || box.id !== ALL_BOX_IDS[index]) return false;
        if (box.owner !== null && !isPlayer(box.owner)) return false;
        const closed = getBoxEdgeIds(box.id).every((edgeId) => usedEdges.has(edgeId));
        if (closed !== (box.owner !== null)) return false;
        if (box.owner !== null) countedScores[box.owner] += 1;
      }
      if (value.scores[0] !== countedScores[0] || value.scores[1] !== countedScores[1]) return false;
      const occupiedBoxes = countedScores[0] + countedScores[1];

      if (value.moves === 0) {
        if (value.lastMove !== null || value.currentPlayer !== value.starter) return false;
      } else if (!isValidLastMove(value, edgeOwners)) {
        return false;
      }

      if (value.phase === PHASES.INTRO) {
        return value.moves === 0 && occupiedBoxes === 0;
      }
      if (value.phase === PHASES.PLAYING) {
        return occupiedBoxes < TOTAL_BOXES && value.edges.length < TOTAL_EDGES
          && (value.lastMove === null || value.lastMove.kind !== "finished");
      }
      return occupiedBoxes === TOTAL_BOXES && value.edges.length === TOTAL_EDGES
        && value.lastMove !== null && value.lastMove.kind === "finished";
    } catch {
      return false;
    }
  }

  function start(state) {
    const safe = validStateOrInitial(state);
    if (safe.recovered || safe.state.phase !== PHASES.INTRO) return safe.state;
    return freezeState({ ...safe.state, phase: PHASES.PLAYING, revision: safe.state.revision + 1 });
  }

  function claimEdge(state, edgeId) {
    const safe = validStateOrInitial(state);
    if (safe.recovered || safe.state.phase !== PHASES.PLAYING || typeof edgeId !== "string") return safe.state;
    if (!parseEdgeId(edgeId) || safe.state.edges.some((edge) => edge.id === edgeId)) return safe.state;

    const player = safe.state.currentPlayer;
    const edges = [...safe.state.edges, { id: edgeId, owner: player }]
      .sort((left, right) => EDGE_ORDER.get(left.id) - EDGE_ORDER.get(right.id));
    const usedEdges = new Set(edges.map((edge) => edge.id));
    const capturedBoxIds = getAdjacentBoxIds(edgeId).filter((boxId) => {
      const box = safe.state.boxes.find((candidate) => candidate.id === boxId);
      return box.owner === null && getBoxEdgeIds(boxId).every((id) => usedEdges.has(id));
    });
    const captured = new Set(capturedBoxIds);
    const boxes = safe.state.boxes.map((box) => captured.has(box.id) ? { id: box.id, owner: player } : box);
    const scores = [...safe.state.scores];
    scores[player] += capturedBoxIds.length;
    const finished = scores[0] + scores[1] === TOTAL_BOXES;
    const kind = finished
      ? "finished"
      : capturedBoxIds.length === 2 ? "capture-two" : capturedBoxIds.length === 1 ? "capture-one" : "switch";

    return freezeState({
      ...safe.state,
      phase: finished ? PHASES.FINISHED : PHASES.PLAYING,
      currentPlayer: capturedBoxIds.length > 0 ? player : 1 - player,
      edges,
      boxes,
      scores,
      moves: safe.state.moves + 1,
      lastMove: { edgeId, player, capturedBoxIds, kind },
      revision: safe.state.revision + 1,
    });
  }

  function restart(state) {
    const safe = validStateOrInitial(state);
    if (safe.recovered || safe.state.phase !== PHASES.FINISHED) return safe.state;
    const starter = 1 - safe.state.starter;
    return freezeState({
      phase: PHASES.INTRO,
      starter,
      currentPlayer: starter,
      playerNames: safe.state.playerNames,
      edges: [],
      boxes: ALL_BOX_IDS.map((id) => ({ id, owner: null })),
      scores: [0, 0],
      moves: 0,
      lastMove: null,
      revision: safe.state.revision + 1,
    });
  }

  function getViewModel(state) {
    const safe = validStateOrInitial(state).state;
    const isFinished = safe.phase === PHASES.FINISHED;
    const winnerIndex = isFinished
      ? safe.scores[0] === safe.scores[1] ? null : safe.scores[0] > safe.scores[1] ? 0 : 1
      : null;
    return deepFreeze({
      phase: safe.phase,
      starter: safe.starter,
      currentPlayer: safe.currentPlayer,
      currentPlayerName: safe.playerNames[safe.currentPlayer],
      playerNames: [...safe.playerNames],
      scores: [...safe.scores],
      moves: safe.moves,
      remainingBoxes: TOTAL_BOXES - safe.scores[0] - safe.scores[1],
      remainingEdges: TOTAL_EDGES - safe.edges.length,
      edges: safe.edges.map((edge) => ({ ...edge })),
      boxes: safe.boxes.map((box) => ({ ...box })),
      lastMove: safe.lastMove ? {
        ...safe.lastMove,
        capturedBoxIds: [...safe.lastMove.capturedBoxIds],
      } : null,
      result: isFinished ? { winnerIndex, isTie: winnerIndex === null } : null,
      controlsDisabled: safe.phase !== PHASES.PLAYING,
    });
  }

  function resolveResultCopy(state, configValue) {
    const safe = validStateOrInitial(state);
    if (safe.recovered || safe.state.phase !== PHASES.FINISHED) return null;
    const config = sanitizeConfig(configValue === undefined ? DEFAULT_CONFIG : configValue);
    const scores = [...safe.state.scores];
    const winnerIndex = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    const playerNames = [...safe.state.playerNames];
    const context = deepFreeze({ winnerIndex, playerNames: [...playerNames], scores: [...scores] });
    try {
      const custom = config.composeResult(context);
      const copy = sanitizeResultCopy(custom);
      if (copy) return copy;
    } catch {
      // 用户语气函数永远不能阻断终局。
    }
    return defaultResultCopy(winnerIndex, playerNames);
  }

  function isValidLastMove(state, edgeOwners) {
    const move = state.lastMove;
    if (!isPlainRecord(move) || !hasExactKeys(move, LAST_MOVE_KEYS)) return false;
    if (!parseEdgeId(move.edgeId) || !isPlayer(move.player) || edgeOwners.get(move.edgeId) !== move.player) return false;
    if (!Array.isArray(move.capturedBoxIds) || move.capturedBoxIds.length > 2) return false;
    const adjacent = getAdjacentBoxIds(move.edgeId);
    const closedAdjacent = adjacent.filter((boxId) => {
      const box = state.boxes.find((candidate) => candidate.id === boxId);
      return box.owner !== null && getBoxEdgeIds(boxId).every((id) => edgeOwners.has(id));
    });
    if (closedAdjacent.some((boxId) => state.boxes.find((box) => box.id === boxId).owner !== move.player)) return false;
    if (!sameStringArray(move.capturedBoxIds, closedAdjacent)) return false;
    if (move.capturedBoxIds.some((boxId) => !parseBoxId(boxId))) return false;

    if (move.kind === "switch") {
      return move.capturedBoxIds.length === 0 && state.currentPlayer === 1 - move.player;
    }
    if (move.kind === "capture-one") {
      return move.capturedBoxIds.length === 1 && state.currentPlayer === move.player;
    }
    if (move.kind === "capture-two") {
      return move.capturedBoxIds.length === 2 && state.currentPlayer === move.player;
    }
    return move.kind === "finished" && move.capturedBoxIds.length >= 1 && state.currentPlayer === move.player;
  }

  function freezeState(value) {
    return deepFreeze({
      phase: value.phase,
      starter: value.starter,
      currentPlayer: value.currentPlayer,
      playerNames: [...value.playerNames],
      edges: value.edges.map((edge) => ({ id: edge.id, owner: edge.owner })),
      boxes: value.boxes.map((box) => ({ id: box.id, owner: box.owner })),
      scores: [...value.scores],
      moves: value.moves,
      lastMove: value.lastMove ? {
        edgeId: value.lastMove.edgeId,
        player: value.lastMove.player,
        capturedBoxIds: [...value.lastMove.capturedBoxIds],
        kind: value.lastMove.kind,
      } : null,
      revision: value.revision,
    });
  }

  function validStateOrInitial(value) {
    return isDotsAndBoxesState(value)
      ? { state: value, recovered: false }
      : { state: createInitialState(), recovered: true };
  }

  function sanitizeResultCopy(value) {
    if (!isPlainRecord(value) || !hasExactKeys(value, RESULT_KEYS)) return null;
    const title = cleanText(value.title, 24);
    const body = cleanText(value.body, 60);
    return title && body ? deepFreeze({ title, body }) : null;
  }

  function defaultResultCopy(winnerIndex, playerNames) {
    return winnerIndex === null
      ? deepFreeze({ title: "这一页平分秋色", body: "最后一格落下，谁也没有少一分。" })
      : deepFreeze({ title: `${playerNames[winnerIndex]}赢下这一页`, body: "最后一格也有归属了。" });
  }

  function edgeIdSet(edges) {
    try {
      if (edges instanceof Set) {
        const ids = [...edges];
        return ids.every((id) => parseEdgeId(id)) ? new Set(ids) : null;
      }
      if (!Array.isArray(edges)) return null;
      const ids = edges.map((edge) => typeof edge === "string" ? edge : edge && edge.id);
      return ids.every((id) => parseEdgeId(id)) ? new Set(ids) : null;
    } catch {
      return null;
    }
  }

  function buildAllEdgeIds() {
    const ids = [];
    for (let visualRow = 0; visualRow < DOT_COUNT * 2 - 1; visualRow += 1) {
      const orientation = visualRow % 2 === 0 ? "H" : "V";
      const row = Math.floor(visualRow / 2);
      const count = orientation === "H" ? BOARD_SIZE : DOT_COUNT;
      for (let column = 0; column < count; column += 1) ids.push(`${orientation}:${row}:${column}`);
    }
    return ids;
  }

  function buildAllBoxIds() {
    const ids = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) ids.push(`B:${row}:${column}`);
    }
    return ids;
  }

  function hasExactKeys(value, expected) {
    const keys = Reflect.ownKeys(value);
    return keys.length === expected.length && keys.every((key) => typeof key === "string" && expected.includes(key));
  }

  function isPlainRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function isPlayer(value) {
    return value === 0 || value === 1;
  }

  function isValidNames(value) {
    return Array.isArray(value) && value.length === 2
      && cleanName(value[0]) === value[0] && cleanName(value[1]) === value[1]
      && value[0] !== value[1];
  }

  function cleanName(value) {
    return cleanText(value, 8);
  }

  function cleanText(value, maxLength) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    const length = [...text].length;
    return length >= 1 && length <= maxLength ? text : null;
  }

  function sameStringArray(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  return deepFreeze({
    BOARD_SIZE,
    DOT_COUNT,
    TOTAL_BOXES,
    TOTAL_EDGES,
    PHASES,
    DEFAULT_CONFIG,
    deepFreeze,
    sanitizeConfig,
    makeEdgeId,
    parseEdgeId,
    getAllEdgeIds,
    makeBoxId,
    parseBoxId,
    getAllBoxIds,
    getBoxEdgeIds,
    getAdjacentBoxIds,
    isBoxClosed,
    createInitialState,
    isDotsAndBoxesState,
    start,
    claimEdge,
    restart,
    getViewModel,
    resolveResultCopy,
  });
});
