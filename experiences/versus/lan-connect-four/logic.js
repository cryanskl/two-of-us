export const COLUMNS = 7;
export const ROWS = 6;
export const CELL_COUNT = COLUMNS * ROWS;
export const SCHEMA_VERSION = 1;

export function startMatch({ memberIds, previousState = null, version = 0 } = {}) {
  const members = normalizeMembers(memberIds);
  if (!members) throw new TypeError("开始对局需要两个不同的成员");

  const canRestart = isValidState(previousState)
    && previousState.phase === "finished"
    && sameMembers(previousState.memberIds, members);
  const starterIndex = canRestart ? 1 - previousState.starterIndex : 0;
  const matchNumber = canRestart ? previousState.matchNumber + 1 : 1;
  const baseVersion = Math.max(
    toVersion(version),
    canRestart ? toVersion(previousState.version) : 0,
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    version: baseVersion + 1,
    phase: "playing",
    memberIds: members,
    board: Array(CELL_COUNT).fill(null),
    currentPlayerId: members[starterIndex],
    winnerId: null,
    winningCells: [],
    moveCount: 0,
    matchNumber,
    starterIndex,
  };
}

export function applyMove(state, { playerId, column, version } = {}) {
  if (!isValidState(state) || state.phase !== "playing") return state;
  if (version !== state.version || playerId !== state.currentPlayerId) return state;
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) return state;

  let row = ROWS - 1;
  while (row >= 0 && state.board[toIndex(row, column)] !== null) row -= 1;
  if (row < 0) return state;

  const board = [...state.board];
  const placedIndex = toIndex(row, column);
  board[placedIndex] = playerId;
  const moveCount = state.moveCount + 1;
  const winningCells = findWinningCells(board, placedIndex, playerId);
  const finished = winningCells.length === 4 || moveCount === CELL_COUNT;
  const nextPlayerId = state.memberIds.find((memberId) => memberId !== playerId) ?? null;

  return {
    ...state,
    version: state.version + 1,
    phase: finished ? "finished" : "playing",
    board,
    currentPlayerId: finished ? null : nextPlayerId,
    winnerId: winningCells.length === 4 ? playerId : null,
    winningCells,
    moveCount,
  };
}

export function acceptPublicState(current, incoming, expectedMemberIds) {
  const members = normalizeMembers(expectedMemberIds);
  if (!members || !isValidState(incoming) || !sameMembers(incoming.memberIds, members)) return current;
  if (incoming.version <= toVersion(current?.version)) return current;
  return cloneState(incoming);
}

export function getColumnCount(board, column) {
  if (!Array.isArray(board) || board.length !== CELL_COUNT || !Number.isInteger(column)) return 0;
  if (column < 0 || column >= COLUMNS) return 0;
  let count = 0;
  for (let row = 0; row < ROWS; row += 1) {
    if (board[toIndex(row, column)] !== null) count += 1;
  }
  return count;
}

function isValidState(value) {
  if (!value || typeof value !== "object" || value.schemaVersion !== SCHEMA_VERSION) return false;
  const members = normalizeMembers(value.memberIds);
  if (!members || !Number.isInteger(value.version) || value.version < 1) return false;
  if (!Array.isArray(value.board) || value.board.length !== CELL_COUNT) return false;
  if (value.board.some((cell) => cell !== null && !members.includes(cell))) return false;
  if (!Number.isInteger(value.moveCount) || value.moveCount < 0 || value.moveCount > CELL_COUNT) return false;
  if (value.board.filter((cell) => cell !== null).length !== value.moveCount) return false;
  if (!Number.isInteger(value.matchNumber) || value.matchNumber < 1) return false;
  if (value.starterIndex !== 0 && value.starterIndex !== 1) return false;
  if (!Array.isArray(value.winningCells)) return false;
  if (value.winningCells.some((index) => !Number.isInteger(index) || index < 0 || index >= CELL_COUNT)) return false;

  if (value.phase === "playing") {
    return members.includes(value.currentPlayerId)
      && value.winnerId === null
      && value.winningCells.length === 0
      && value.moveCount < CELL_COUNT;
  }

  if (value.phase !== "finished" || value.currentPlayerId !== null) return false;
  if (value.winnerId === null) {
    return value.moveCount === CELL_COUNT && value.winningCells.length === 0;
  }
  if (!members.includes(value.winnerId) || value.winningCells.length !== 4) return false;
  if (value.winningCells.some((index) => value.board[index] !== value.winnerId)) return false;
  return formsStraightLine(value.winningCells);
}

function findWinningCells(board, placedIndex, playerId) {
  const originRow = Math.floor(placedIndex / COLUMNS);
  const originColumn = placedIndex % COLUMNS;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [rowStep, columnStep] of directions) {
    const line = [];
    let row = originRow;
    let column = originColumn;
    while (inBounds(row - rowStep, column - columnStep)
      && board[toIndex(row - rowStep, column - columnStep)] === playerId) {
      row -= rowStep;
      column -= columnStep;
    }
    while (inBounds(row, column) && board[toIndex(row, column)] === playerId) {
      line.push(toIndex(row, column));
      row += rowStep;
      column += columnStep;
    }
    if (line.length >= 4) {
      const originPosition = line.indexOf(placedIndex);
      const start = Math.max(0, Math.min(originPosition, line.length - 4));
      return line.slice(start, start + 4);
    }
  }
  return [];
}

function formsStraightLine(indices) {
  const unique = [...new Set(indices)];
  if (unique.length !== 4) return false;
  const cells = unique.map((index) => [Math.floor(index / COLUMNS), index % COLUMNS]);
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  return directions.some(([rowStep, columnStep]) => cells.some(([row, column]) => (
    [0, 1, 2, 3].every((offset) => cells.some(([candidateRow, candidateColumn]) => (
      candidateRow === row + rowStep * offset && candidateColumn === column + columnStep * offset
    )))
  )));
}

function cloneState(state) {
  return {
    schemaVersion: state.schemaVersion,
    version: state.version,
    phase: state.phase,
    memberIds: [...state.memberIds],
    board: [...state.board],
    currentPlayerId: state.currentPlayerId,
    winnerId: state.winnerId,
    winningCells: [...state.winningCells],
    moveCount: state.moveCount,
    matchNumber: state.matchNumber,
    starterIndex: state.starterIndex,
  };
}

function normalizeMembers(memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length !== 2) return null;
  const members = memberIds.map((memberId) => String(memberId ?? "").trim());
  if (members.some((memberId) => !memberId) || members[0] === members[1]) return null;
  return members;
}

function sameMembers(left, right) {
  return Array.isArray(left) && left.length === 2
    && left[0] === right[0] && left[1] === right[1];
}

function toVersion(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function inBounds(row, column) {
  return row >= 0 && row < ROWS && column >= 0 && column < COLUMNS;
}

function toIndex(row, column) {
  return row * COLUMNS + column;
}
