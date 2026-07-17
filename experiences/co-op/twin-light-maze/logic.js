(function (root, factory) {
  "use strict";
  root.TWIN_LIGHT_MAZE_LOGIC = factory(root.TWIN_LIGHT_LEVELS);
})(typeof globalThis !== "undefined" ? globalThis : this, function (levelModule) {
  "use strict";

  if (!levelModule || !Array.isArray(levelModule.LEVELS)) {
    throw new Error("请先加载 levels.js");
  }

  const { LEVELS, cellAt } = levelModule;
  const PHASES = Object.freeze(["ready", "playing", "paused", "level-complete", "game-complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "blur", "hidden"]);
  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });

  function createGameState(levelIndex = 0) {
    const safeLevelIndex = isLevelIndex(levelIndex) ? levelIndex : 0;
    return stateForLevel(safeLevelIndex, "ready");
  }

  function startGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "ready") return state;
    return freezeState({ ...state, phase: "playing" });
  }

  function movePlayer(state, seat, direction) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "playing" || (seat !== 0 && seat !== 1) || !DIRECTIONS[direction]) return state;

    const level = LEVELS[state.levelIndex];
    const current = state.players[seat];
    const currentX = current % level.width;
    const currentY = Math.floor(current / level.width);
    const vector = DIRECTIONS[direction];
    const targetX = currentX + vector.x;
    const targetY = currentY + vector.y;
    if (targetX < 0 || targetX >= level.width || targetY < 0 || targetY >= level.height) return state;

    const target = targetY * level.width + targetX;
    if (target === state.players[1 - seat]) return state;
    const targetCell = cellAt(level, target);
    if (targetCell === "#" || (isDoor(targetCell) && !isDoorOpen(state, targetCell))) return state;

    const players = state.players.slice();
    players[seat] = target;
    const nextPlayers = Object.freeze(players);
    const completed = nextPlayers[0] === level.exits[0] && nextPlayers[1] === level.exits[1];
    const finalLevel = state.levelIndex === LEVELS.length - 1;

    return freezeState({
      ...state,
      phase: completed ? (finalLevel ? "game-complete" : "level-complete") : "playing",
      players: nextPlayers,
      moveCount: state.moveCount + 1,
      pauseReason: null,
    });
  }

  function pauseGame(state, reason = "manual") {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "playing") return state;
    return freezeState({
      ...state,
      phase: "paused",
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
    });
  }

  function resumeGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "paused") return state;
    return freezeState({ ...state, phase: "playing", pauseReason: null });
  }

  function restartLevel(state) {
    if (!isValidState(state)) return createGameState();
    const phase = state.phase === "ready" ? "ready" : "playing";
    return stateForLevel(state.levelIndex, phase);
  }

  function nextLevel(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "level-complete" || state.levelIndex >= LEVELS.length - 1) return state;
    return stateForLevel(state.levelIndex + 1, "playing");
  }

  function replayGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "game-complete") return state;
    return stateForLevel(0, "playing");
  }

  function deriveBoardState(state) {
    if (!isValidState(state)) return deriveBoardState(createGameState());
    const level = LEVELS[state.levelIndex];
    const aPressed = state.players.some((position) => level.plates.a.includes(position));
    const bPressed = state.players.some((position) => level.plates.b.includes(position));
    const aOccupied = state.players.some((position) => level.doors.A.includes(position));
    const bOccupied = state.players.some((position) => level.doors.B.includes(position));
    return Object.freeze({
      plates: Object.freeze({ a: aPressed, b: bPressed }),
      doors: Object.freeze({ A: aPressed || aOccupied, B: bPressed || bOccupied }),
      home: Object.freeze([
        state.players[0] === level.exits[0],
        state.players[1] === level.exits[1],
      ]),
    });
  }

  function isDoorOpen(state, door) {
    return deriveBoardState(state).doors[door] === true;
  }

  function isValidState(value) {
    if (!value || typeof value !== "object" || !PHASES.includes(value.phase)) return false;
    if (!isLevelIndex(value.levelIndex) || !Array.isArray(value.players) || value.players.length !== 2) return false;
    if (!Number.isInteger(value.moveCount) || value.moveCount < 0) return false;
    if (value.pauseReason !== null && !PAUSE_REASONS.includes(value.pauseReason)) return false;
    const level = LEVELS[value.levelIndex];
    if (value.players.some((position) => !isWalkablePosition(level, position))) return false;
    if (value.players[0] === value.players[1]) return false;
    const complete = value.players[0] === level.exits[0] && value.players[1] === level.exits[1];
    if (value.phase === "paused") return value.pauseReason !== null && !complete;
    if (value.pauseReason !== null) return false;
    if (value.phase === "ready") {
      return value.moveCount === 0
        && value.players[0] === level.starts[0]
        && value.players[1] === level.starts[1];
    }
    if (value.phase === "level-complete") return complete && value.levelIndex < LEVELS.length - 1;
    if (value.phase === "game-complete") return complete && value.levelIndex === LEVELS.length - 1;
    return !complete;
  }

  function stateForLevel(levelIndex, phase) {
    return freezeState({
      phase,
      levelIndex,
      players: Object.freeze(LEVELS[levelIndex].starts.slice()),
      moveCount: 0,
      pauseReason: null,
    });
  }

  function isLevelIndex(value) {
    return Number.isInteger(value) && value >= 0 && value < LEVELS.length;
  }

  function isWalkablePosition(level, position) {
    return Number.isInteger(position)
      && position >= 0
      && position < level.width * level.height
      && cellAt(level, position) !== "#";
  }

  function isDoor(cell) {
    return cell === "A" || cell === "B";
  }

  function freezeState(state) {
    return Object.freeze(state);
  }

  return Object.freeze({
    PHASES,
    PAUSE_REASONS,
    DIRECTIONS,
    createGameState,
    startGame,
    movePlayer,
    pauseGame,
    resumeGame,
    restartLevel,
    nextLevel,
    replayGame,
    deriveBoardState,
  });
});
