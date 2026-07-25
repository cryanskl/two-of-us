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

  return deepFreeze({
    CONSTANTS,
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
  });
});
