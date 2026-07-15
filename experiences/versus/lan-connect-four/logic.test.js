import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptPublicState,
  applyMove,
  CELL_COUNT,
  COLUMNS,
  startMatch,
} from "./logic.js";

const members = ["rose", "mint"];

function play(columns) {
  let state = startMatch({ memberIds: members });
  for (const column of columns) {
    state = applyMove(state, {
      playerId: state.currentPlayerId,
      column,
      version: state.version,
    });
  }
  return state;
}

test("棋子落到所选列的最低空位", () => {
  const state = play([3, 3, 3]);
  assert.equal(state.board[5 * COLUMNS + 3], "rose");
  assert.equal(state.board[4 * COLUMNS + 3], "mint");
  assert.equal(state.board[3 * COLUMNS + 3], "rose");
});

test("非法玩家、列、版本和满列保持原状态对象", () => {
  const initial = startMatch({ memberIds: members });
  assert.strictEqual(applyMove(initial, { playerId: "mint", column: 0, version: initial.version }), initial);
  assert.strictEqual(applyMove(initial, { playerId: "rose", column: -1, version: initial.version }), initial);
  assert.strictEqual(applyMove(initial, { playerId: "rose", column: 1.5, version: initial.version }), initial);
  assert.strictEqual(applyMove(initial, { playerId: "rose", column: 0, version: 0 }), initial);
  const fullColumn = play([0, 0, 0, 0, 0, 0]);
  assert.strictEqual(applyMove(fullColumn, {
    playerId: fullColumn.currentPlayerId,
    column: 0,
    version: fullColumn.version,
  }), fullColumn);
});

test("识别横向与纵向四连", () => {
  const horizontal = play([0, 0, 1, 1, 2, 2, 3]);
  assert.equal(horizontal.winnerId, "rose");
  assert.deepEqual(horizontal.winningCells, [35, 36, 37, 38]);

  const vertical = play([0, 1, 0, 1, 0, 1, 0]);
  assert.equal(vertical.winnerId, "rose");
  assert.deepEqual(vertical.winningCells, [14, 21, 28, 35]);
});

test("识别两种斜向四连", () => {
  const rising = play([0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3]);
  assert.equal(rising.winnerId, "rose");
  assert.deepEqual(rising.winningCells, [17, 23, 29, 35]);

  const falling = play([3, 2, 2, 1, 4, 1, 1, 0, 4, 0, 5, 0, 0]);
  assert.equal(falling.winnerId, "rose");
  assert.deepEqual(falling.winningCells, [14, 22, 30, 38]);
});

test("合法的 42 步无四连棋局以平局结束", () => {
  const draw = play([
    4, 0, 1, 4, 0, 2, 3, 2, 1, 3, 3, 6, 2, 1,
    0, 0, 5, 4, 1, 3, 6, 6, 5, 5, 3, 3, 6, 6,
    5, 0, 4, 4, 4, 6, 2, 1, 0, 5, 1, 2, 2, 5,
  ]);
  assert.equal(draw.moveCount, CELL_COUNT);
  assert.equal(draw.phase, "finished");
  assert.equal(draw.winnerId, null);
  assert.deepEqual(draw.winningCells, []);
});

test("结束后拒绝继续落子，再来一局清空棋盘并交换先手", () => {
  const won = play([0, 0, 1, 1, 2, 2, 3]);
  assert.strictEqual(applyMove(won, { playerId: "mint", column: 4, version: won.version }), won);
  const restarted = startMatch({ memberIds: members, previousState: won, version: won.version });
  assert.equal(restarted.currentPlayerId, "mint");
  assert.equal(restarted.matchNumber, 2);
  assert.deepEqual(restarted.board, Array(CELL_COUNT).fill(null));

  const fresh = startMatch({
    memberIds: members,
    previousState: { ...won, board: [], matchNumber: 99 },
    version: won.version,
  });
  assert.equal(fresh.matchNumber, 1);
  assert.equal(fresh.currentPlayerId, "rose");
});

test("公开状态拒绝旧版本、畸形棋盘和成员不匹配", () => {
  const current = startMatch({ memberIds: members });
  const next = applyMove(current, { playerId: "rose", column: 0, version: current.version });
  assert.notStrictEqual(acceptPublicState(current, next, members), next);
  assert.deepEqual(acceptPublicState(current, next, members), next);
  assert.strictEqual(acceptPublicState(next, current, members), next);
  assert.strictEqual(acceptPublicState(current, { ...next, board: [] }, members), current);
  assert.strictEqual(acceptPublicState(current, next, ["rose", "other"]), current);
});
