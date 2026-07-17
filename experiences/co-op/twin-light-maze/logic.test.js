import test from "node:test";
import assert from "node:assert/strict";

await import("./levels.js");
await import("./logic.js");

const {
  GRID_WIDTH,
  GRID_HEIGHT,
  LEVELS,
  validateLevel,
  cellAt,
} = globalThis.TWIN_LIGHT_LEVELS;
const {
  createGameState,
  startGame,
  movePlayer,
  pauseGame,
  resumeGame,
  restartLevel,
  nextLevel,
  replayGame,
  deriveBoardState,
} = globalThis.TWIN_LIGHT_MAZE_LOGIC;

const ACTIONS = Object.freeze([
  Object.freeze({ seat: 0, direction: "up" }),
  Object.freeze({ seat: 0, direction: "down" }),
  Object.freeze({ seat: 0, direction: "left" }),
  Object.freeze({ seat: 0, direction: "right" }),
  Object.freeze({ seat: 1, direction: "up" }),
  Object.freeze({ seat: 1, direction: "down" }),
  Object.freeze({ seat: 1, direction: "left" }),
  Object.freeze({ seat: 1, direction: "right" }),
]);

function stateKey(state) {
  return `${state.players[0]},${state.players[1]}`;
}

function solveLevel(levelIndex, predicate = (state) => state.phase.endsWith("complete")) {
  const initial = startGame(createGameState(levelIndex));
  const queue = [{ state: initial, path: [] }];
  const visited = new Set([stateKey(initial)]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const item = queue[cursor];
    if (predicate(item.state, item.path)) return item;
    if (item.state.phase !== "playing") continue;

    for (const action of ACTIONS) {
      const next = movePlayer(item.state, action.seat, action.direction);
      if (next === item.state) continue;
      const key = stateKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({
        state: next,
        path: item.path.concat(Object.freeze({
          ...action,
          before: item.state,
          after: next,
        })),
      });
    }
  }
  throw new Error(`第 ${levelIndex + 1} 关不存在可达解`);
}

function position(level, x, y) {
  return y * level.width + x;
}

test("四张原创关卡统一为 12×8，schema 与嵌套数据全部冻结", () => {
  assert.equal(LEVELS.length, 4);
  for (const level of LEVELS) {
    assert.equal(validateLevel(level), true);
    assert.equal(level.width, GRID_WIDTH);
    assert.equal(level.height, GRID_HEIGHT);
    assert.equal(Object.isFrozen(level), true);
    assert.equal(Object.isFrozen(level.rows), true);
    assert.equal(Object.isFrozen(level.starts), true);
    assert.equal(Object.isFrozen(level.exits), true);
    assert.equal(Object.isFrozen(level.plates), true);
    assert.equal(Object.isFrozen(level.plates.a), true);
    assert.equal(Object.isFrozen(level.plates.b), true);
    assert.equal(Object.isFrozen(level.doors), true);
    assert.equal(Object.isFrozen(level.doors.A), true);
    assert.equal(Object.isFrozen(level.doors.B), true);
  }
});

test("关卡校验拒绝非矩形、越界、未知字符、出生/出口异常和孤立机关", () => {
  const valid = { rows: ["#####", "#12x#", "# y #", "#####"] };
  assert.equal(validateLevel(valid), true);
  assert.throws(() => validateLevel(null), TypeError);
  assert.throws(() => validateLevel({ rows: ["###", "##"] }), RangeError);
  assert.throws(() => validateLevel({ rows: ["####", "#?x#", "#2y#", "####"] }), TypeError);
  assert.throws(() => validateLevel({ rows: ["#####", "#11x#", "#2y #", "#####"] }), RangeError);
  assert.throws(() => validateLevel({ rows: ["#####", "#12x#", "#ay #", "#####"] }), RangeError);
  assert.throws(() => validateLevel({ rows: ["#####", "#12x#", "#Ay #", "#####"] }), RangeError);
  assert.throws(() => validateLevel({ rows: ["#".repeat(25), "#".repeat(25), "#".repeat(25), "#".repeat(25)] }), RangeError);
});

test("初始状态遵循规格、完全冻结且不会修改关卡出生数组", () => {
  const starts = LEVELS[0].starts.slice();
  const state = createGameState();
  assert.deepEqual(state, {
    phase: "ready",
    levelIndex: 0,
    players: starts,
    moveCount: 0,
    pauseReason: null,
  });
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.players), true);
  assert.notStrictEqual(state.players, LEVELS[0].starts);
  assert.deepEqual(LEVELS[0].starts, starts);
  assert.equal(cellAt(LEVELS[0], -1), null);
  assert.equal(cellAt(LEVELS[0], LEVELS[0].starts[0]), "1");
});

test("非 playing、非法席位/方向、越界、墙、另一玩家和关闭门保持同一对象", () => {
  const ready = createGameState();
  assert.strictEqual(movePlayer(ready, 0, "right"), ready);
  const playing = startGame(ready);
  assert.strictEqual(movePlayer(playing, -1, "right"), playing);
  assert.strictEqual(movePlayer(playing, 2, "right"), playing);
  assert.strictEqual(movePlayer(playing, 0, "diagonal"), playing);
  assert.strictEqual(movePlayer(playing, 0, "up"), playing);

  const level = LEVELS[0];
  const besideClosedDoor = solveLevel(0, (state) => (
    state.players[0] === position(level, 5, 3)
    && !deriveBoardState(state).plates.a
  )).state;
  assert.strictEqual(movePlayer(besideClosedDoor, 0, "right"), besideClosedDoor);

  const adjacent = solveLevel(0, (state) => {
    const [first, second] = state.players;
    return Math.abs((first % level.width) - (second % level.width))
      + Math.abs(Math.floor(first / level.width) - Math.floor(second / level.width)) === 1;
  }).state;
  const [first, second] = adjacent.players;
  const dx = (second % level.width) - (first % level.width);
  const dy = Math.floor(second / level.width) - Math.floor(first / level.width);
  const towardSecond = dx === 1 ? "right" : dx === -1 ? "left" : dy === 1 ? "down" : "up";
  assert.strictEqual(movePlayer(adjacent, 0, towardSecond), adjacent);
});

test("合法移动只复制运行状态并累计步数，不修改输入", () => {
  const initial = startGame(createGameState());
  const snapshot = { ...initial, players: initial.players.slice() };
  const next = movePlayer(initial, 0, "right");
  assert.notStrictEqual(next, initial);
  assert.equal(next.moveCount, 1);
  assert.equal(next.players[0], initial.players[0] + 1);
  assert.equal(Object.isFrozen(next), true);
  assert.equal(Object.isFrozen(next.players), true);
  assert.deepEqual(initial, snapshot);
});

test("压板开门、离板后门格防夹、离开门格后立即关门", () => {
  const level = LEVELS[0];
  const solution = solveLevel(0);
  const crossing = solution.path.find(({ before, after, seat }) => {
    const target = after.players[seat];
    const other = before.players[1 - seat];
    return cellAt(level, target) === "A" && level.plates.a.includes(other);
  });
  assert.ok(crossing, "最短解应包含一人踩板、另一人穿 A 门");
  assert.equal(deriveBoardState(crossing.before).doors.A, true);
  assert.equal(deriveBoardState(crossing.after).doors.A, true);

  const holderSeat = 1 - crossing.seat;
  let holderMoved = null;
  for (const direction of ["up", "down", "left", "right"]) {
    const candidate = movePlayer(crossing.after, holderSeat, direction);
    if (candidate !== crossing.after && !level.plates.a.includes(candidate.players[holderSeat])) {
      holderMoved = candidate;
      break;
    }
  }
  assert.ok(holderMoved, "踩板玩家应能离开压力板");
  assert.equal(deriveBoardState(holderMoved).plates.a, false);
  assert.equal(deriveBoardState(holderMoved).doors.A, true, "门格上的玩家不会被夹住");

  const doorPlayer = crossing.seat;
  const doorCell = holderMoved.players[doorPlayer];
  let leftDoor = null;
  for (const direction of ["right", "left", "up", "down"]) {
    const candidate = movePlayer(holderMoved, doorPlayer, direction);
    if (candidate !== holderMoved && candidate.players[doorPlayer] !== doorCell) {
      leftDoor = candidate;
      break;
    }
  }
  assert.ok(leftDoor);
  assert.equal(deriveBoardState(leftDoor).doors.A, false);
});

test("四关均由生产 reducer 的 BFS 找到共同归巢最短解", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const { state, path } = solveLevel(levelIndex);
    assert.ok(path.length > 0);
    assert.equal(state.players[0], LEVELS[levelIndex].exits[0]);
    assert.equal(state.players[1], LEVELS[levelIndex].exits[1]);
    assert.equal(state.phase, levelIndex === LEVELS.length - 1 ? "game-complete" : "level-complete");
    assert.equal(state.moveCount, path.length);
  }
});

test("第一关最短解必有另一位玩家保持压板的协作穿门", () => {
  const level = LEVELS[0];
  const { path } = solveLevel(0);
  const cooperativeCrossing = path.find(({ before, after, seat }) => {
    const targetCell = cellAt(level, after.players[seat]);
    const plate = targetCell === "A" ? "a" : targetCell === "B" ? "b" : null;
    return plate !== null && level.plates[plate].includes(before.players[1 - seat]);
  });
  assert.ok(cooperativeCrossing);
  assert.notEqual(cooperativeCrossing.before.players[0], cooperativeCrossing.before.players[1]);
});

test("单人先归巢不会锁定，仍可离开等待共同胜利", () => {
  const level = LEVELS[0];
  const found = solveLevel(0, (state) => {
    const derived = deriveBoardState(state);
    return derived.home[0] && !derived.home[1];
  }).state;
  assert.equal(found.phase, "playing");
  const away = ACTIONS
    .filter(({ seat }) => seat === 0)
    .map(({ direction }) => movePlayer(found, 0, direction))
    .find((state) => state !== found);
  assert.ok(away);
  assert.notEqual(away.players[0], level.exits[0]);
  assert.equal(away.phase, "playing");
});

test("暂停、恢复与重开清理原因和步数并恢复出生点", () => {
  let state = movePlayer(startGame(createGameState(2)), 0, "down");
  const beforePause = state;
  state = pauseGame(state, "hidden");
  assert.equal(state.phase, "paused");
  assert.equal(state.pauseReason, "hidden");
  assert.deepEqual(state.players, beforePause.players);
  assert.strictEqual(movePlayer(state, 0, "right"), state);
  state = resumeGame(state);
  assert.equal(state.phase, "playing");
  assert.equal(state.pauseReason, null);

  const restarted = restartLevel(state);
  assert.equal(restarted.phase, "playing");
  assert.deepEqual(restarted.players, LEVELS[2].starts);
  assert.equal(restarted.moveCount, 0);
  const readyRestart = restartLevel(createGameState(2));
  assert.equal(readyRestart.phase, "ready");
  assert.equal(pauseGame(beforePause, "unknown").pauseReason, "manual");
});

test("完成后逐关前进，第四关完成后可从第一关重新游玩", () => {
  const firstComplete = solveLevel(0).state;
  const second = nextLevel(firstComplete);
  assert.equal(second.phase, "playing");
  assert.equal(second.levelIndex, 1);
  assert.deepEqual(second.players, LEVELS[1].starts);
  assert.equal(second.moveCount, 0);
  assert.strictEqual(nextLevel(second), second);

  const finalComplete = solveLevel(LEVELS.length - 1).state;
  assert.equal(finalComplete.phase, "game-complete");
  assert.strictEqual(nextLevel(finalComplete), finalComplete);
  const replayed = replayGame(finalComplete);
  assert.equal(replayed.phase, "playing");
  assert.equal(replayed.levelIndex, 0);
  assert.deepEqual(replayed.players, LEVELS[0].starts);
  assert.equal(replayed.moveCount, 0);
});

test("畸形状态安全回到首关 ready，合法状态的无效操作保持引用", () => {
  const playing = startGame(createGameState());
  const malformed = { ...playing, players: [playing.players[0], playing.players[0]] };
  assert.deepEqual(movePlayer(malformed, 0, "right"), createGameState());
  assert.deepEqual(pauseGame({ ...playing, moveCount: -1 }), createGameState());
  assert.deepEqual(startGame({ ...createGameState(), moveCount: 1 }), createGameState());
  assert.deepEqual(resumeGame(null), createGameState());
  assert.strictEqual(startGame(playing), playing);
  assert.strictEqual(resumeGame(playing), playing);
  assert.strictEqual(replayGame(playing), playing);
});
