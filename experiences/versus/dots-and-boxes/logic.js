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
  const CONFIG_KEYS = deepFreeze(["composeResult", "playerNames"]);
  const STATE_KEYS = deepFreeze([
    "phase", "starter", "currentPlayer", "playerNames", "moves", "boxes",
    "scores", "moveNumber", "lastMove", "revision",
  ]);
  const MOVE_KEYS = deepFreeze(["edgeId", "player"]);
  const BOX_KEYS = deepFreeze(["id", "owner"]);
  const LAST_MOVE_KEYS = deepFreeze(["edgeId", "player", "capturedBoxIds", "kind"]);
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
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], visited);
    return Object.freeze(value);
  }

  function sanitizeConfig(value) {
    if (value === undefined) return DEFAULT_CONFIG;
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
          return Reflect.apply(formatter, undefined, [context]);
        },
      });
    } catch (_error) {
      return DEFAULT_CONFIG;
    }
  }

  function makeEdgeId(orientation, row, column) {
    if (orientation !== "H" && orientation !== "V") return null;
    if (!Number.isInteger(row) || !Number.isInteger(column)) return null;
    const rowMaximum = orientation === "H" ? DOT_COUNT - 1 : BOARD_SIZE - 1;
    const columnMaximum = orientation === "H" ? BOARD_SIZE - 1 : DOT_COUNT - 1;
    return row >= 0 && row <= rowMaximum && column >= 0 && column <= columnMaximum
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
    return used !== null && required.every((edgeId) => used.has(edgeId));
  }

  function replayMoves(starter, moves) {
    try {
      if (!isPlayer(starter) || !Array.isArray(moves) || moves.length > TOTAL_EDGES) return null;
      const usedEdges = new Set();
      const replayedMoves = [];
      const boxes = ALL_BOX_IDS.map((id) => ({ id, owner: null }));
      const scores = [0, 0];
      let currentPlayer = starter;
      let lastMove = null;
      let phase = PHASES.PLAYING;

      for (const rawMove of moves) {
        if (phase === PHASES.FINISHED || !isPlainRecord(rawMove) || !hasExactKeys(rawMove, MOVE_KEYS)) return null;
        if (!parseEdgeId(rawMove.edgeId) || !isPlayer(rawMove.player)
          || rawMove.player !== currentPlayer || usedEdges.has(rawMove.edgeId)) return null;

        const player = currentPlayer;
        usedEdges.add(rawMove.edgeId);
        replayedMoves.push({ edgeId: rawMove.edgeId, player });
        const capturedBoxIds = getAdjacentBoxIds(rawMove.edgeId).filter((boxId) => {
          const box = boxes[ALL_BOX_IDS.indexOf(boxId)];
          return box.owner === null && getBoxEdgeIds(boxId).every((edgeId) => usedEdges.has(edgeId));
        });
        for (const boxId of capturedBoxIds) boxes[ALL_BOX_IDS.indexOf(boxId)] = { id: boxId, owner: player };
        scores[player] += capturedBoxIds.length;

        const finished = scores[0] + scores[1] === TOTAL_BOXES;
        const kind = finished
          ? "finished"
          : capturedBoxIds.length === 2 ? "capture-two" : capturedBoxIds.length === 1 ? "capture-one" : "switch";
        currentPlayer = finished || capturedBoxIds.length > 0 ? player : 1 - player;
        phase = finished ? PHASES.FINISHED : PHASES.PLAYING;
        lastMove = { edgeId: rawMove.edgeId, player, capturedBoxIds, kind };
      }

      return deepFreeze({
        phase,
        starter,
        currentPlayer,
        moves: replayedMoves,
        boxes,
        scores,
        moveNumber: replayedMoves.length,
        lastMove,
      });
    } catch (_error) {
      return null;
    }
  }

  function createInitialState(configValue) {
    const config = sanitizeConfig(configValue);
    return freezeState({
      phase: PHASES.INTRO,
      starter: 0,
      currentPlayer: 0,
      playerNames: config.playerNames,
      moves: [],
      boxes: emptyBoxes(),
      scores: [0, 0],
      moveNumber: 0,
      lastMove: null,
      revision: 0,
    });
  }

  function isDotsAndBoxesState(value) {
    try {
      if (!isPlainRecord(value) || !hasExactKeys(value, STATE_KEYS)) return false;
      if (!Object.values(PHASES).includes(value.phase)) return false;
      if (!isPlayer(value.starter) || !isPlayer(value.currentPlayer) || !isValidNames(value.playerNames)) return false;
      if (!Array.isArray(value.moves) || !Array.isArray(value.boxes) || !Array.isArray(value.scores)) return false;
      if (!Number.isInteger(value.moveNumber) || value.moveNumber < 0 || value.moveNumber > TOTAL_EDGES) return false;
      if (!Number.isSafeInteger(value.revision) || value.revision < 0) return false;
      const replayed = replayMoves(value.starter, value.moves);
      if (!replayed || value.moveNumber !== replayed.moveNumber) return false;
      if (!sameBoxes(value.boxes, replayed.boxes) || !sameNumberArray(value.scores, replayed.scores)) return false;
      if (value.currentPlayer !== replayed.currentPlayer || !sameLastMove(value.lastMove, replayed.lastMove)) return false;
      if (value.phase === PHASES.INTRO) return value.moveNumber === 0;
      return value.phase === replayed.phase;
    } catch (_error) {
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
    if (!parseEdgeId(edgeId) || safe.state.moves.some((move) => move.edgeId === edgeId)) return safe.state;
    const replayed = replayMoves(safe.state.starter, [
      ...safe.state.moves,
      { edgeId, player: safe.state.currentPlayer },
    ]);
    if (!replayed) return safe.state;
    return freezeState({
      phase: replayed.phase,
      starter: safe.state.starter,
      currentPlayer: replayed.currentPlayer,
      playerNames: safe.state.playerNames,
      moves: replayed.moves,
      boxes: replayed.boxes,
      scores: replayed.scores,
      moveNumber: replayed.moveNumber,
      lastMove: replayed.lastMove,
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
      moves: [],
      boxes: emptyBoxes(),
      scores: [0, 0],
      moveNumber: 0,
      lastMove: null,
      revision: safe.state.revision + 1,
    });
  }

  function getViewModel(state) {
    const safe = validStateOrInitial(state).state;
    const finished = safe.phase === PHASES.FINISHED;
    const winnerIndex = finished
      ? safe.scores[0] === safe.scores[1] ? null : safe.scores[0] > safe.scores[1] ? 0 : 1
      : null;
    const ownerByEdge = new Map(safe.moves.map((move) => [move.edgeId, move.player]));
    const edges = ALL_EDGE_IDS
      .filter((edgeId) => ownerByEdge.has(edgeId))
      .map((edgeId) => ({ id: edgeId, owner: ownerByEdge.get(edgeId) }));
    return deepFreeze({
      phase: safe.phase,
      starter: safe.starter,
      currentPlayer: safe.currentPlayer,
      currentPlayerName: safe.playerNames[safe.currentPlayer],
      playerNames: [...safe.playerNames],
      scores: [...safe.scores],
      moveNumber: safe.moveNumber,
      remainingBoxes: TOTAL_BOXES - safe.scores[0] - safe.scores[1],
      remainingEdges: TOTAL_EDGES - safe.moveNumber,
      edges,
      boxes: safe.boxes.map((box) => ({ ...box })),
      lastMove: safe.lastMove ? cloneLastMove(safe.lastMove) : null,
      result: finished ? { winnerIndex, isTie: winnerIndex === null } : null,
      controlsDisabled: safe.phase !== PHASES.PLAYING,
    });
  }

  function resolveResultCopy(state, configValue) {
    const safe = validStateOrInitial(state);
    if (safe.recovered || safe.state.phase !== PHASES.FINISHED) return null;
    const config = sanitizeConfig(configValue);
    const scores = [...safe.state.scores];
    const winnerIndex = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    const playerNames = [...safe.state.playerNames];
    const context = deepFreeze({ winnerIndex, playerNames: [...playerNames], scores: [...scores] });
    try {
      const custom = config.composeResult(context);
      const copy = sanitizeResultCopy(custom);
      if (copy) return copy;
    } catch (_error) {
      // 私人语气函数不能阻断终局。
    }
    return defaultResultCopy(winnerIndex, playerNames);
  }

  function freezeState(value) {
    return deepFreeze({
      phase: value.phase,
      starter: value.starter,
      currentPlayer: value.currentPlayer,
      playerNames: [...value.playerNames],
      moves: value.moves.map((move) => ({ edgeId: move.edgeId, player: move.player })),
      boxes: value.boxes.map((box) => ({ id: box.id, owner: box.owner })),
      scores: [...value.scores],
      moveNumber: value.moveNumber,
      lastMove: value.lastMove ? cloneLastMove(value.lastMove) : null,
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

  function sameBoxes(left, right) {
    return Array.isArray(left) && left.length === right.length
      && left.every((box, index) => isPlainRecord(box) && hasExactKeys(box, BOX_KEYS)
        && box.id === right[index].id && box.owner === right[index].owner);
  }

  function sameNumberArray(left, right) {
    return Array.isArray(left) && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  function sameLastMove(left, right) {
    if (left === null || right === null) return left === right;
    return isPlainRecord(left) && hasExactKeys(left, LAST_MOVE_KEYS)
      && left.edgeId === right.edgeId && left.player === right.player && left.kind === right.kind
      && Array.isArray(left.capturedBoxIds)
      && left.capturedBoxIds.length === right.capturedBoxIds.length
      && left.capturedBoxIds.every((boxId, index) => boxId === right.capturedBoxIds[index]);
  }

  function cloneLastMove(move) {
    return {
      edgeId: move.edgeId,
      player: move.player,
      capturedBoxIds: [...move.capturedBoxIds],
      kind: move.kind,
    };
  }

  function emptyBoxes() {
    return ALL_BOX_IDS.map((id) => ({ id, owner: null }));
  }

  function edgeIdSet(edges) {
    try {
      if (edges instanceof Set) {
        const ids = [...edges];
        return ids.every((id) => parseEdgeId(id)) ? new Set(ids) : null;
      }
      if (!Array.isArray(edges)) return null;
      const ids = edges.map((edge) => typeof edge === "string" ? edge : edge?.edgeId ?? edge?.id);
      return ids.every((id) => parseEdgeId(id)) ? new Set(ids) : null;
    } catch (_error) {
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
    return keys.length === expected.length
      && keys.every((key) => typeof key === "string" && expected.includes(key));
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

  function cleanText(value, maximum) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    const length = [...text].length;
    return length >= 1 && length <= maximum ? text : null;
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
    replayMoves,
    createInitialState,
    isDotsAndBoxesState,
    start,
    claimEdge,
    restart,
    getViewModel,
    resolveResultCopy,
  });
});
