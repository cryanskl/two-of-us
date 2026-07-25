(function exposePhotoSliderRaceLogic(root, factory) {
  "use strict";

  const config = typeof module === "object" && module && module.exports
    ? require("./config.js")
    : root && root.PhotoSliderRaceConfig;
  const api = factory(config);
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.PhotoSliderRaceLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPhotoSliderRaceLogic(config) {
  "use strict";

  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
      || Object.isFrozen(value)
    ) return value;

    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    }
    return Object.freeze(value);
  }

  const CONSTANTS = deepFreeze({
    VERSION: 1,
    GRID_SIZE: 3,
    TILE_COUNT: 9,
    BLANK_TILE: 0,
    SHUFFLE_STEPS: 96,
    MIN_MANHATTAN_DISTANCE: 12,
    MAX_SHUFFLE_ATTEMPTS: 32,
    SETTLEMENT_WINDOW_MS: 100,
    UINT32_MAX: 0xffffffff,
    MAX_REVISION: Number.MAX_SAFE_INTEGER,
  });

  const OPPOSITE_DIRECTION = deepFreeze({
    up: "down",
    left: "right",
    down: "up",
    right: "left",
  });

  const PHASES = deepFreeze([
    "setup",
    "countdown",
    "racing",
    "settling",
    "paused",
    "resume-countdown",
    "finished",
  ]);

  const ACTIONS = deepFreeze({
    SET_SOURCE: "SET_SOURCE",
    START_MATCH: "START_MATCH",
    COUNTDOWN_TICK: "COUNTDOWN_TICK",
    MOVE: "MOVE",
    PAUSE: "PAUSE",
    RESUME: "RESUME",
    SETTLE: "SETTLE",
    REMATCH: "REMATCH",
    RETURN_TO_SETUP: "RETURN_TO_SETUP",
  });

  const INTERNAL_STATES = new WeakSet();

  function snapshotArray(value, expectedLength) {
    try {
      if (
        !Array.isArray(value)
        || Object.getPrototypeOf(value) !== Array.prototype
        || value.length !== expectedLength
      ) return null;

      const keys = Reflect.ownKeys(value);
      if (keys.length !== expectedLength + 1 || !keys.includes("length")) return null;
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const copy = [];
      for (let index = 0; index < expectedLength; index += 1) {
        const descriptor = descriptors[String(index)];
        if (
          !descriptor
          || descriptor.enumerable !== true
          || !Object.hasOwn(descriptor, "value")
        ) return null;
        copy.push(descriptor.value);
      }
      return copy;
    } catch (_error) {
      return null;
    }
  }

  function snapshotRecord(value, expectedKeys) {
    try {
      if (
        !value
        || typeof value !== "object"
        || Array.isArray(value)
        || Object.getPrototypeOf(value) !== Object.prototype
      ) return null;
      const keys = Reflect.ownKeys(value);
      if (
        keys.length !== expectedKeys.length
        || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
      ) return null;
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const copy = {};
      for (const key of expectedKeys) {
        const descriptor = descriptors[key];
        if (
          !descriptor
          || descriptor.enumerable !== true
          || !Object.hasOwn(descriptor, "value")
        ) return null;
        copy[key] = descriptor.value;
      }
      return copy;
    } catch (_error) {
      return null;
    }
  }

  function parseTiles(value) {
    const tiles = snapshotArray(value, CONSTANTS.TILE_COUNT);
    if (!tiles) return null;
    const seen = new Set();
    for (const tile of tiles) {
      if (
        !Number.isSafeInteger(tile)
        || tile < 0
        || tile >= CONSTANTS.TILE_COUNT
        || seen.has(tile)
      ) return null;
      seen.add(tile);
    }
    return tiles;
  }

  function validGridSize(size) {
    return size === undefined || size === CONSTANTS.GRID_SIZE;
  }

  function createSolvedTiles(size) {
    if (!validGridSize(size)) return null;
    return deepFreeze([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  }

  function isValidPermutation(value) {
    return parseTiles(value) !== null;
  }

  function isSolved(value) {
    const tiles = parseTiles(value);
    if (!tiles) return false;
    for (let index = 0; index < CONSTANTS.TILE_COUNT - 1; index += 1) {
      if (tiles[index] !== index + 1) return false;
    }
    return tiles[CONSTANTS.TILE_COUNT - 1] === CONSTANTS.BLANK_TILE;
  }

  function getLegalBlankMoves(blankIndex, size) {
    if (
      !validGridSize(size)
      || !Number.isSafeInteger(blankIndex)
      || blankIndex < 0
      || blankIndex >= CONSTANTS.TILE_COUNT
    ) return deepFreeze([]);

    const row = Math.floor(blankIndex / CONSTANTS.GRID_SIZE);
    const column = blankIndex % CONSTANTS.GRID_SIZE;
    const moves = [];
    if (row > 0) moves.push("up");
    if (column > 0) moves.push("left");
    if (row < CONSTANTS.GRID_SIZE - 1) moves.push("down");
    if (column < CONSTANTS.GRID_SIZE - 1) moves.push("right");
    return deepFreeze(moves);
  }

  function targetIndexForDirection(blankIndex, direction) {
    if (direction === "up") return blankIndex - CONSTANTS.GRID_SIZE;
    if (direction === "left") return blankIndex - 1;
    if (direction === "down") return blankIndex + CONSTANTS.GRID_SIZE;
    if (direction === "right") return blankIndex + 1;
    return null;
  }

  function moveResult(changed, tiles, reason, direction) {
    return deepFreeze({
      changed,
      value: deepFreeze(tiles.slice()),
      reason,
      direction,
    });
  }

  function moveBlank(value, direction, size) {
    const tiles = parseTiles(value);
    if (!tiles) return moveResult(false, [], "invalid-permutation", null);
    if (!validGridSize(size) || config.DIRECTIONS.indexOf(direction) < 0) {
      return moveResult(false, tiles, "invalid-direction", null);
    }

    const blankIndex = tiles.indexOf(CONSTANTS.BLANK_TILE);
    if (getLegalBlankMoves(blankIndex).indexOf(direction) < 0) {
      return moveResult(false, tiles, "out-of-bounds", direction);
    }
    const targetIndex = targetIndexForDirection(blankIndex, direction);
    const next = tiles.slice();
    next[blankIndex] = next[targetIndex];
    next[targetIndex] = CONSTANTS.BLANK_TILE;
    return moveResult(true, next, null, direction);
  }

  function moveTileAt(value, tileIndex, size) {
    const tiles = parseTiles(value);
    if (!tiles) return moveResult(false, [], "invalid-permutation", null);
    if (
      !validGridSize(size)
      || !Number.isSafeInteger(tileIndex)
      || tileIndex < 0
      || tileIndex >= CONSTANTS.TILE_COUNT
    ) return moveResult(false, tiles, "invalid-index", null);

    const blankIndex = tiles.indexOf(CONSTANTS.BLANK_TILE);
    if (tileIndex === blankIndex) return moveResult(false, tiles, "blank", null);
    const blankRow = Math.floor(blankIndex / CONSTANTS.GRID_SIZE);
    const blankColumn = blankIndex % CONSTANTS.GRID_SIZE;
    const tileRow = Math.floor(tileIndex / CONSTANTS.GRID_SIZE);
    const tileColumn = tileIndex % CONSTANTS.GRID_SIZE;
    if (Math.abs(blankRow - tileRow) + Math.abs(blankColumn - tileColumn) !== 1) {
      return moveResult(false, tiles, "not-adjacent", null);
    }

    let direction;
    if (tileRow < blankRow) direction = "up";
    else if (tileRow > blankRow) direction = "down";
    else if (tileColumn < blankColumn) direction = "left";
    else direction = "right";
    return moveBlank(tiles, direction);
  }

  function manhattanDistance(value, size) {
    const tiles = parseTiles(value);
    if (!tiles || !validGridSize(size)) return null;
    let distance = 0;
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index];
      if (tile === CONSTANTS.BLANK_TILE) continue;
      const target = tile - 1;
      distance += Math.abs(
        Math.floor(index / CONSTANTS.GRID_SIZE)
        - Math.floor(target / CONSTANTS.GRID_SIZE),
      );
      distance += Math.abs(
        (index % CONSTANTS.GRID_SIZE)
        - (target % CONSTANTS.GRID_SIZE),
      );
    }
    return distance;
  }

  function isSolvable(value) {
    const tiles = parseTiles(value);
    if (!tiles) return false;
    const withoutBlank = tiles.filter((tile) => tile !== CONSTANTS.BLANK_TILE);
    let inversions = 0;
    for (let left = 0; left < withoutBlank.length; left += 1) {
      for (let right = left + 1; right < withoutBlank.length; right += 1) {
        if (withoutBlank[left] > withoutBlank[right]) inversions += 1;
      }
    }
    return inversions % 2 === 0;
  }

  function parseSeed(seed) {
    return Number.isSafeInteger(seed) && seed >= 0 && seed <= CONSTANTS.UINT32_MAX
      ? seed
      : null;
  }

  function createSeededRandom(seed) {
    const parsed = parseSeed(seed);
    if (parsed === null) return null;
    let state = parsed >>> 0;
    return Object.freeze(function nextRandom() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    });
  }

  function deriveAttemptSeed(seed, attempt) {
    return (seed + Math.imul(attempt, 0x9e3779b9)) >>> 0;
  }

  function parseShuffleOptions(options) {
    if (options === undefined) {
      return {
        steps: CONSTANTS.SHUFFLE_STEPS,
        minDistance: CONSTANTS.MIN_MANHATTAN_DISTANCE,
        maxAttempts: CONSTANTS.MAX_SHUFFLE_ATTEMPTS,
      };
    }
    try {
      if (
        !options
        || typeof options !== "object"
        || Array.isArray(options)
        || Object.getPrototypeOf(options) !== Object.prototype
      ) return null;
      const keys = Reflect.ownKeys(options);
      const expected = ["steps", "minDistance", "maxAttempts"];
      if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
        return null;
      }
      const descriptors = Object.getOwnPropertyDescriptors(options);
      const parsed = {};
      for (const key of expected) {
        const descriptor = descriptors[key];
        if (
          !descriptor
          || descriptor.enumerable !== true
          || !Object.hasOwn(descriptor, "value")
          || !Number.isSafeInteger(descriptor.value)
        ) return null;
        parsed[key] = descriptor.value;
      }
      if (
        parsed.steps < 1
        || parsed.steps > 4096
        || parsed.minDistance < 0
        || parsed.minDistance > 32
        || parsed.maxAttempts < 1
        || parsed.maxAttempts > 256
      ) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function shuffleFromSolved(seed, options) {
    const parsedSeed = parseSeed(seed);
    const parsedOptions = parseShuffleOptions(options);
    if (parsedSeed === null || !parsedOptions) return null;

    for (let attempt = 0; attempt < parsedOptions.maxAttempts; attempt += 1) {
      const resolvedSeed = deriveAttemptSeed(parsedSeed, attempt);
      const random = createSeededRandom(resolvedSeed);
      let tiles = createSolvedTiles().slice();
      let previousDirection = null;
      const trace = [];

      for (let step = 0; step < parsedOptions.steps; step += 1) {
        const blankIndex = tiles.indexOf(CONSTANTS.BLANK_TILE);
        let legal = getLegalBlankMoves(blankIndex).filter(
          (direction) => direction !== OPPOSITE_DIRECTION[previousDirection],
        );
        if (legal.length === 0) legal = getLegalBlankMoves(blankIndex).slice();
        const direction = legal[Math.floor(random() * legal.length)];
        const moved = moveBlank(tiles, direction);
        if (!moved.changed) return null;
        tiles = moved.value.slice();
        trace.push(direction);
        previousDirection = direction;
      }

      const distance = manhattanDistance(tiles);
      if (!isSolved(tiles) && distance >= parsedOptions.minDistance) {
        return deepFreeze({
          requestedSeed: parsedSeed,
          resolvedSeed,
          attempt,
          steps: parsedOptions.steps,
          distance,
          tiles: tiles.slice(),
          trace: trace.slice(),
        });
      }
    }
    return null;
  }

  function createBoard(value) {
    const tiles = value === undefined ? createSolvedTiles().slice() : parseTiles(value);
    if (!tiles) return null;
    return deepFreeze({
      tiles: tiles.slice(),
      blankIndex: tiles.indexOf(CONSTANTS.BLANK_TILE),
      moves: 0,
      solvedAt: null,
      locked: false,
    });
  }

  function createFairBoards(seed) {
    const shuffled = shuffleFromSolved(seed);
    if (!shuffled) return null;
    return deepFreeze({
      seed: shuffled.requestedSeed,
      resolvedSeed: shuffled.resolvedSeed,
      initialTiles: shuffled.tiles.slice(),
      left: createBoard(shuffled.tiles),
      right: createBoard(shuffled.tiles),
    });
  }

  function parseTimestamp(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : null;
  }

  function parseBoard(value) {
    const record = snapshotRecord(value, [
      "tiles",
      "blankIndex",
      "moves",
      "solvedAt",
      "locked",
    ]);
    if (!record) return null;
    const tiles = parseTiles(record.tiles);
    if (
      !tiles
      || !Number.isSafeInteger(record.blankIndex)
      || record.blankIndex !== tiles.indexOf(CONSTANTS.BLANK_TILE)
      || !Number.isSafeInteger(record.moves)
      || record.moves < 0
      || record.moves > CONSTANTS.MAX_REVISION
      || (record.solvedAt !== null && parseTimestamp(record.solvedAt) === null)
      || typeof record.locked !== "boolean"
      || (record.solvedAt !== null && (!record.locked || !isSolved(tiles)))
    ) return null;
    return {
      tiles,
      blankIndex: record.blankIndex,
      moves: record.moves,
      solvedAt: record.solvedAt,
      locked: record.locked,
    };
  }

  function boardMoveResult(changed, value, reason) {
    return deepFreeze({ changed, value, reason });
  }

  function applyMove(value, direction, timestamp) {
    const board = parseBoard(value);
    const now = parseTimestamp(timestamp);
    if (!board) return boardMoveResult(false, null, "invalid-board");
    if (config.DIRECTIONS.indexOf(direction) < 0) {
      return boardMoveResult(false, deepFreeze(board), "invalid-direction");
    }
    if (now === null) return boardMoveResult(false, deepFreeze(board), "invalid-time");
    if (board.locked) return boardMoveResult(false, deepFreeze(board), "locked");
    if (isSolved(board.tiles)) return boardMoveResult(false, deepFreeze(board), "solved");
    if (board.moves >= CONSTANTS.MAX_REVISION) {
      return boardMoveResult(false, deepFreeze(board), "move-limit");
    }

    const moved = moveBlank(board.tiles, direction);
    if (!moved.changed) return boardMoveResult(false, deepFreeze(board), moved.reason);
    const solved = isSolved(moved.value);
    return boardMoveResult(true, deepFreeze({
      tiles: moved.value.slice(),
      blankIndex: moved.value.indexOf(CONSTANTS.BLANK_TILE),
      moves: board.moves + 1,
      solvedAt: solved ? now : null,
      locked: solved,
    }), null);
  }

  function calculateElapsed(startedAt, solvedAt, pausedMs) {
    const start = parseTimestamp(startedAt);
    const solved = parseTimestamp(solvedAt);
    const paused = parseTimestamp(pausedMs);
    if (start === null || solved === null || paused === null || solved < start) return null;
    const elapsed = solved - start - paused;
    return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null;
  }

  function resolveFinish(first, second, windowMs) {
    const firstRecord = snapshotRecord(first, ["player", "solvedAt"]);
    const secondRecord = second === null ? null : snapshotRecord(second, ["player", "solvedAt"]);
    const window = windowMs === undefined ? CONSTANTS.SETTLEMENT_WINDOW_MS : windowMs;
    if (
      !firstRecord
      || config.PLAYER_IDS.indexOf(firstRecord.player) < 0
      || parseTimestamp(firstRecord.solvedAt) === null
      || typeof window !== "number"
      || !Number.isFinite(window)
      || window < 0
    ) return null;
    if (second === null) {
      return deepFreeze({ outcome: firstRecord.player, differenceMs: null });
    }
    if (
      !secondRecord
      || config.PLAYER_IDS.indexOf(secondRecord.player) < 0
      || secondRecord.player === firstRecord.player
      || parseTimestamp(secondRecord.solvedAt) === null
      || secondRecord.solvedAt < firstRecord.solvedAt
    ) return null;
    const differenceMs = secondRecord.solvedAt - firstRecord.solvedAt;
    return deepFreeze({
      outcome: differenceMs <= window ? "draw" : firstRecord.player,
      differenceMs,
    });
  }

  function sanitizeSourceMetadata(value) {
    const record = snapshotRecord(value, ["kind", "status", "generation", "errorCode"]);
    if (
      !record
      || config.SOURCE_KINDS.indexOf(record.kind) < 0
      || config.SOURCE_STATUSES.indexOf(record.status) < 0
      || !Number.isSafeInteger(record.generation)
      || record.generation < 0
      || record.generation > CONSTANTS.MAX_REVISION
    ) return null;
    if (record.status === "error") {
      if (config.SOURCE_ERROR_CODES.indexOf(record.errorCode) < 0) return null;
    } else if (record.errorCode !== null) {
      return null;
    }
    return deepFreeze({
      kind: record.kind,
      status: record.status,
      generation: record.generation,
      errorCode: record.errorCode,
    });
  }

  function sourceTransitionAllowed(current, next) {
    if (next.status === "loading") {
      return next.generation === current.generation + 1
        && next.kind === current.kind;
    }
    return current.status === "loading"
      && next.generation === current.generation
      && (next.status === "ready" || next.kind === current.kind);
  }

  function classifyKeyInput(value) {
    const record = snapshotRecord(value, ["key", "repeat", "altKey", "ctrlKey", "metaKey"]);
    if (
      !record
      || typeof record.key !== "string"
      || typeof record.repeat !== "boolean"
      || typeof record.altKey !== "boolean"
      || typeof record.ctrlKey !== "boolean"
      || typeof record.metaKey !== "boolean"
      || record.repeat
      || record.altKey
      || record.ctrlKey
      || record.metaKey
    ) return null;

    const key = record.key.length === 1 ? record.key.toLowerCase() : record.key;
    const mapping = {
      w: ["left", "up"],
      a: ["left", "left"],
      s: ["left", "down"],
      d: ["left", "right"],
      ArrowUp: ["right", "up"],
      ArrowLeft: ["right", "left"],
      ArrowDown: ["right", "down"],
      ArrowRight: ["right", "right"],
    };
    const match = mapping[key];
    return match ? deepFreeze({ player: match[0], direction: match[1] }) : null;
  }

  function makeState(record) {
    const frozen = deepFreeze(record);
    INTERNAL_STATES.add(frozen);
    return frozen;
  }

  function freshSourceMetadata() {
    return {
      kind: config.DEFAULT_SOURCE_METADATA.kind,
      status: config.DEFAULT_SOURCE_METADATA.status,
      generation: config.DEFAULT_SOURCE_METADATA.generation,
      errorCode: config.DEFAULT_SOURCE_METADATA.errorCode,
    };
  }

  function createInitialState() {
    return makeState({
      version: CONSTANTS.VERSION,
      phase: "setup",
      sourceMetadata: freshSourceMetadata(),
      seed: null,
      initialTiles: null,
      left: null,
      right: null,
      countdownRemaining: 0,
      resumeCountdownRemaining: 0,
      raceStartedAt: null,
      accumulatedPausedMs: 0,
      pauseStartedAt: null,
      pausedFrom: null,
      firstFinisher: null,
      settlementDeadline: null,
      settlementRemainingMs: null,
      result: null,
      revision: 0,
    });
  }

  function copyState(state, changes) {
    const next = {
      version: state.version,
      phase: state.phase,
      sourceMetadata: state.sourceMetadata,
      seed: state.seed,
      initialTiles: state.initialTiles,
      left: state.left,
      right: state.right,
      countdownRemaining: state.countdownRemaining,
      resumeCountdownRemaining: state.resumeCountdownRemaining,
      raceStartedAt: state.raceStartedAt,
      accumulatedPausedMs: state.accumulatedPausedMs,
      pauseStartedAt: state.pauseStartedAt,
      pausedFrom: state.pausedFrom,
      firstFinisher: state.firstFinisher,
      settlementDeadline: state.settlementDeadline,
      settlementRemainingMs: state.settlementRemainingMs,
      result: state.result,
      revision: state.revision + 1,
    };
    for (const key of Object.keys(changes)) next[key] = changes[key];
    return makeState(next);
  }

  function parseAction(value, state) {
    if (!value || typeof value !== "object") return null;
    let typeDescriptor;
    try {
      typeDescriptor = Object.getOwnPropertyDescriptor(value, "type");
    } catch (_error) {
      return null;
    }
    if (!typeDescriptor || !Object.hasOwn(typeDescriptor, "value")) return null;
    const type = typeDescriptor.value;
    if (typeof type !== "string") return null;
    const keysByType = {
      [ACTIONS.SET_SOURCE]: ["type", "revision", "metadata"],
      [ACTIONS.START_MATCH]: ["type", "revision", "seed"],
      [ACTIONS.COUNTDOWN_TICK]: ["type", "revision", "now"],
      [ACTIONS.MOVE]: ["type", "revision", "player", "direction", "repeat", "now"],
      [ACTIONS.PAUSE]: ["type", "revision", "now"],
      [ACTIONS.RESUME]: ["type", "revision"],
      [ACTIONS.SETTLE]: ["type", "revision", "now"],
      [ACTIONS.REMATCH]: ["type", "revision", "seed"],
      [ACTIONS.RETURN_TO_SETUP]: ["type", "revision"],
    };
    const keys = keysByType[type];
    if (!keys) return null;
    const record = snapshotRecord(value, keys);
    if (
      !record
      || !Number.isSafeInteger(record.revision)
      || record.revision !== state.revision
    ) return null;
    return record;
  }

  function startMatch(state, seed) {
    const fair = createFairBoards(seed);
    if (!fair || state.sourceMetadata.status === "loading") return state;
    return copyState(state, {
      phase: "countdown",
      seed: fair.seed,
      initialTiles: fair.initialTiles.slice(),
      left: fair.left,
      right: fair.right,
      countdownRemaining: 3,
      resumeCountdownRemaining: 0,
      raceStartedAt: null,
      accumulatedPausedMs: 0,
      pauseStartedAt: null,
      pausedFrom: null,
      firstFinisher: null,
      settlementDeadline: null,
      settlementRemainingMs: null,
      result: null,
    });
  }

  function resultPlayer(board, state) {
    return {
      elapsedMs: board.solvedAt === null
        ? null
        : calculateElapsed(state.raceStartedAt, board.solvedAt, state.accumulatedPausedMs),
      moves: board.moves,
    };
  }

  function finishWinner(state, settledAt) {
    return copyState(state, {
      phase: "finished",
      settlementDeadline: null,
      settlementRemainingMs: null,
      result: {
        outcome: state.firstFinisher,
        left: resultPlayer(state.left, state),
        right: resultPlayer(state.right, state),
        settledAt,
      },
    });
  }

  function finishDraw(state, changes, settledAt) {
    const left = changes.left || state.left;
    const right = changes.right || state.right;
    return copyState(state, {
      ...changes,
      phase: "finished",
      settlementDeadline: null,
      settlementRemainingMs: null,
      result: {
        outcome: "draw",
        left: resultPlayer(left, state),
        right: resultPlayer(right, state),
        settledAt,
      },
    });
  }

  function reduceMove(state, event) {
    if (
      (state.phase !== "racing" && state.phase !== "settling")
      || config.PLAYER_IDS.indexOf(event.player) < 0
      || config.DIRECTIONS.indexOf(event.direction) < 0
      || typeof event.repeat !== "boolean"
      || event.repeat
    ) return state;
    const now = parseTimestamp(event.now);
    if (now === null || now < state.raceStartedAt) return state;

    if (
      state.phase === "settling"
      && now > state.settlementDeadline
    ) return finishWinner(state, state.settlementDeadline);

    const currentBoard = event.player === "left" ? state.left : state.right;
    const moved = applyMove(currentBoard, event.direction, now);
    if (!moved.changed) return state;
    const changes = event.player === "left"
      ? { left: moved.value }
      : { right: moved.value };

    if (moved.value.solvedAt === null) return copyState(state, changes);
    if (state.phase === "racing") {
      return copyState(state, {
        ...changes,
        phase: "settling",
        firstFinisher: event.player,
        settlementDeadline: now + CONSTANTS.SETTLEMENT_WINDOW_MS,
      });
    }

    return finishDraw(state, changes, now);
  }

  function resumeActivePhase(state, now) {
    const pausedDuration = now - state.pauseStartedAt;
    if (!Number.isFinite(pausedDuration) || pausedDuration < 0) return state;
    const common = {
      resumeCountdownRemaining: 0,
      pauseStartedAt: null,
      pausedFrom: null,
      settlementRemainingMs: null,
    };
    if (state.pausedFrom === "countdown") {
      return copyState(state, { ...common, phase: "countdown" });
    }
    if (state.pausedFrom === "racing") {
      return copyState(state, {
        ...common,
        phase: "racing",
        accumulatedPausedMs: state.accumulatedPausedMs + pausedDuration,
      });
    }
    if (state.pausedFrom === "settling") {
      return copyState(state, {
        ...common,
        phase: "settling",
        accumulatedPausedMs: state.accumulatedPausedMs + pausedDuration,
        settlementDeadline: now + state.settlementRemainingMs,
      });
    }
    return state;
  }

  function reduce(state, action) {
    if (!INTERNAL_STATES.has(state)) return createInitialState();
    if (state.revision >= CONSTANTS.MAX_REVISION) return state;
    const event = parseAction(action, state);
    if (!event) return state;

    if (event.type === ACTIONS.SET_SOURCE) {
      if (state.phase !== "setup") return state;
      const metadata = sanitizeSourceMetadata(event.metadata);
      if (!metadata || !sourceTransitionAllowed(state.sourceMetadata, metadata)) return state;
      return copyState(state, { sourceMetadata: metadata });
    }

    if (event.type === ACTIONS.START_MATCH) {
      return state.phase === "setup" ? startMatch(state, event.seed) : state;
    }

    if (event.type === ACTIONS.COUNTDOWN_TICK) {
      const now = parseTimestamp(event.now);
      if (now === null) return state;
      if (state.phase === "countdown") {
        if (state.countdownRemaining > 1) {
          return copyState(state, { countdownRemaining: state.countdownRemaining - 1 });
        }
        if (state.countdownRemaining === 1) {
          return copyState(state, {
            phase: "racing",
            countdownRemaining: 0,
            raceStartedAt: now,
          });
        }
        return state;
      }
      if (state.phase === "resume-countdown") {
        if (now < state.pauseStartedAt) return state;
        if (state.resumeCountdownRemaining > 1) {
          return copyState(state, {
            resumeCountdownRemaining: state.resumeCountdownRemaining - 1,
          });
        }
        return state.resumeCountdownRemaining === 1
          ? resumeActivePhase(state, now)
          : state;
      }
      return state;
    }

    if (event.type === ACTIONS.MOVE) return reduceMove(state, event);

    if (event.type === ACTIONS.PAUSE) {
      const now = parseTimestamp(event.now);
      if (
        now === null
        || (state.phase !== "countdown"
          && state.phase !== "racing"
          && state.phase !== "settling")
        || (state.raceStartedAt !== null && now < state.raceStartedAt)
      ) return state;
      if (state.phase === "settling" && now >= state.settlementDeadline) {
        return finishWinner(state, state.settlementDeadline);
      }
      return copyState(state, {
        phase: "paused",
        pauseStartedAt: now,
        pausedFrom: state.phase,
        settlementRemainingMs: state.phase === "settling"
          ? state.settlementDeadline - now
          : null,
        settlementDeadline: state.phase === "settling" ? null : state.settlementDeadline,
      });
    }

    if (event.type === ACTIONS.RESUME) {
      return state.phase === "paused"
        ? copyState(state, {
            phase: "resume-countdown",
            resumeCountdownRemaining: 3,
          })
        : state;
    }

    if (event.type === ACTIONS.SETTLE) {
      const now = parseTimestamp(event.now);
      return state.phase === "settling"
        && now !== null
        && now >= state.settlementDeadline
        ? finishWinner(state, state.settlementDeadline)
        : state;
    }

    if (event.type === ACTIONS.REMATCH) {
      return state.phase === "finished" ? startMatch(state, event.seed) : state;
    }

    if (event.type === ACTIONS.RETURN_TO_SETUP) {
      return state.phase === "finished"
        ? copyState(state, {
            phase: "setup",
            seed: null,
            initialTiles: null,
            left: null,
            right: null,
            countdownRemaining: 0,
            resumeCountdownRemaining: 0,
            raceStartedAt: null,
            accumulatedPausedMs: 0,
            pauseStartedAt: null,
            pausedFrom: null,
            firstFinisher: null,
            settlementDeadline: null,
            settlementRemainingMs: null,
            result: null,
          })
        : state;
    }

    return state;
  }

  function boardView(board) {
    return board === null ? null : {
      tiles: board.tiles.slice(),
      blankIndex: board.blankIndex,
      moves: board.moves,
      solvedAt: board.solvedAt,
      locked: board.locked,
    };
  }

  function getPublicView(state) {
    if (!INTERNAL_STATES.has(state)) return null;
    const leftCanMove = (state.phase === "racing" || state.phase === "settling")
      && state.left !== null
      && !state.left.locked;
    const rightCanMove = (state.phase === "racing" || state.phase === "settling")
      && state.right !== null
      && !state.right.locked;
    return deepFreeze({
      version: state.version,
      phase: state.phase,
      sourceMetadata: {
        kind: state.sourceMetadata.kind,
        status: state.sourceMetadata.status,
        generation: state.sourceMetadata.generation,
        errorCode: state.sourceMetadata.errorCode,
      },
      seed: state.seed,
      initialTiles: state.initialTiles === null ? null : state.initialTiles.slice(),
      boards: {
        left: boardView(state.left),
        right: boardView(state.right),
      },
      countdown: {
        race: state.countdownRemaining,
        resume: state.resumeCountdownRemaining,
      },
      timing: {
        raceStartedAt: state.raceStartedAt,
        accumulatedPausedMs: state.accumulatedPausedMs,
        settlementDeadline: state.settlementDeadline,
        settlementRemainingMs: state.settlementRemainingMs,
      },
      pausedFrom: state.pausedFrom,
      firstFinisher: state.firstFinisher,
      result: state.result === null ? null : {
        outcome: state.result.outcome,
        left: {
          elapsedMs: state.result.left.elapsedMs,
          moves: state.result.left.moves,
        },
        right: {
          elapsedMs: state.result.right.elapsedMs,
          moves: state.result.right.moves,
        },
        settledAt: state.result.settledAt,
      },
      controls: {
        canChangeSource: state.phase === "setup",
        canStart: state.phase === "setup" && state.sourceMetadata.status !== "loading",
        canMoveLeft: leftCanMove,
        canMoveRight: rightCanMove,
        canPause: state.phase === "countdown"
          || state.phase === "racing"
          || state.phase === "settling",
        canResume: state.phase === "paused",
        canRematch: state.phase === "finished",
        canReturnToSetup: state.phase === "finished",
      },
      revision: state.revision,
    });
  }

  return deepFreeze({
    CONSTANTS,
    PHASES,
    ACTIONS,
    createSeededRandom,
    createSolvedTiles,
    getLegalBlankMoves,
    moveBlank,
    moveTileAt,
    isSolved,
    isValidPermutation,
    isSolvable,
    manhattanDistance,
    shuffleFromSolved,
    createBoard,
    createFairBoards,
    applyMove,
    calculateElapsed,
    resolveFinish,
    sanitizeSourceMetadata,
    classifyKeyInput,
    createInitialState,
    reduce,
    getPublicView,
  });
});
