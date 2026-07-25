"use strict";

(function exposeDualMazeRaceLogic(root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DualMazeRaceLogic = api;
  }
})(typeof window === "object" ? window : null, function createDualMazeRaceLogic() {
  var DIRECTION_NAMES = ["up", "right", "down", "left"];
  var MAZE_KEYS = ["rows", "cols", "start", "goal", "seed", "passages", "fingerprint"];
  var POINT_KEYS = ["row", "col"];
  var CREATE_KEYS = ["rows", "cols", "start", "goal", "seed"];

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return value;
    }
    if (Object.isFrozen(value)) {
      return value;
    }
    var visited = seen || new WeakSet();
    if (visited.has(value)) {
      return value;
    }
    visited.add(value);
    Reflect.ownKeys(value).forEach(function freezeChild(key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    });
    return Object.freeze(value);
  }

  var DIRECTIONS = deepFreeze({
    up: { name: "up", bit: 1, dr: -1, dc: 0, opposite: "down" },
    right: { name: "right", bit: 2, dr: 0, dc: 1, opposite: "left" },
    down: { name: "down", bit: 4, dr: 1, dc: 0, opposite: "up" },
    left: { name: "left", bit: 8, dr: 0, dc: -1, opposite: "right" }
  });

  var CONSTANTS = deepFreeze({
    VERSION: 1,
    ROWS: 9,
    COLS: 9,
    START: { row: 4, col: 0 },
    GOAL: { row: 4, col: 8 },
    TICK_HZ: 30,
    TICK_MS: 1000 / 30,
    COUNTDOWN_TICKS: 90,
    RESUME_COUNTDOWN_TICKS: 45,
    MAX_QUEUE: 2,
    STALL_THRESHOLD_MS: 500,
    MAX_NAME_LENGTH: 20,
    MAX_MATCH_NOTE_LENGTH: 160,
    MAX_REVISION: 1000000
  });

  var MAPS = deepFreeze([
    { label: "COUP", seed: 0x434f5550 },
    { label: "PAIR", seed: 0x50414952 }
  ]);

  function snapshotRecord(value, keys) {
    try {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype
      ) {
        return null;
      }
      var ownKeys = Reflect.ownKeys(value);
      if (
        ownKeys.length !== keys.length ||
        ownKeys.some(function unknownKey(key) {
          return typeof key !== "string" || keys.indexOf(key) < 0;
        })
      ) {
        return null;
      }
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var snapshot = {};
      for (var index = 0; index < keys.length; index += 1) {
        var descriptor = descriptors[keys[index]];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot[keys[index]] = descriptor.value;
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function snapshotArray(value, maximumLength) {
    try {
      if (
        !Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Array.prototype ||
        !Number.isSafeInteger(value.length) ||
        value.length < 0 ||
        value.length > maximumLength
      ) {
        return null;
      }
      var ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== value.length + 1 || ownKeys.indexOf("length") < 0) {
        return null;
      }
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var snapshot = [];
      for (var index = 0; index < value.length; index += 1) {
        var descriptor = descriptors[String(index)];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot.push(descriptor.value);
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function readPoint(value, rows, cols) {
    var record = snapshotRecord(value, POINT_KEYS);
    if (
      !record ||
      !Number.isSafeInteger(record.row) ||
      !Number.isSafeInteger(record.col) ||
      record.row < 0 ||
      record.row >= rows ||
      record.col < 0 ||
      record.col >= cols
    ) {
      return null;
    }
    return { row: record.row, col: record.col };
  }

  function pointToIndex(point, cols) {
    return point.row * cols + point.col;
  }

  function indexToPoint(index, cols) {
    return { row: Math.floor(index / cols), col: index % cols };
  }

  function normalizeSeed(value) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 0xffffffff
    ) {
      throw new TypeError("seed must be a uint32 integer number");
    }
    var seed = Number(value) >>> 0;
    if (seed === 0) {
      throw new RangeError("seed must be a non-zero uint32");
    }
    return seed;
  }

  function createXorshift32(seed) {
    var state = normalizeSeed(seed);
    return function nextUint32() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state;
    };
  }

  function buildFingerprint(rows, cols, startIndex, goalIndex, seed, passages) {
    var seedHex = seed.toString(16).padStart(8, "0");
    var passageHex = passages.map(function toHex(value) {
      return value.toString(16).padStart(2, "0");
    }).join("");
    return "v1|" + rows + "x" + cols + "|" + startIndex + "|" + goalIndex
      + "|" + seedHex + "|" + passageHex;
  }

  function createMaze(options) {
    var record = snapshotRecord(options, CREATE_KEYS);
    if (!record || !Number.isSafeInteger(record.rows) || !Number.isSafeInteger(record.cols)
      || record.rows <= 0 || record.cols <= 0 || record.rows * record.cols > 1000000) {
      throw new TypeError("maze dimensions must be positive safe integers");
    }
    var start = readPoint(record.start, record.rows, record.cols);
    var goal = readPoint(record.goal, record.rows, record.cols);
    if (!start || !goal || (start.row === goal.row && start.col === goal.col)) {
      throw new RangeError("maze start and goal must be distinct in-bounds points");
    }
    var seed = normalizeSeed(record.seed);
    var nextUint32 = createXorshift32(seed);
    var nodeCount = record.rows * record.cols;
    var passages = new Uint8Array(nodeCount);
    var visited = new Uint8Array(nodeCount);
    var startIndex = pointToIndex(start, record.cols);
    var goalIndex = pointToIndex(goal, record.cols);
    var stack = [startIndex];
    visited[startIndex] = 1;
    var visitedCount = 1;

    while (stack.length > 0) {
      var currentIndex = stack[stack.length - 1];
      var current = indexToPoint(currentIndex, record.cols);
      var candidates = [];
      for (var directionIndex = 0; directionIndex < DIRECTION_NAMES.length; directionIndex += 1) {
        var directionName = DIRECTION_NAMES[directionIndex];
        var direction = DIRECTIONS[directionName];
        var nextRow = current.row + direction.dr;
        var nextCol = current.col + direction.dc;
        if (
          nextRow >= 0 &&
          nextRow < record.rows &&
          nextCol >= 0 &&
          nextCol < record.cols
        ) {
          var candidateIndex = nextRow * record.cols + nextCol;
          if (visited[candidateIndex] === 0) {
            candidates.push({ index: candidateIndex, direction: directionName });
          }
        }
      }
      if (candidates.length === 0) {
        stack.pop();
        continue;
      }
      var chosen = candidates[nextUint32() % candidates.length];
      var chosenDirection = DIRECTIONS[chosen.direction];
      passages[currentIndex] |= chosenDirection.bit;
      passages[chosen.index] |= DIRECTIONS[chosenDirection.opposite].bit;
      visited[chosen.index] = 1;
      visitedCount += 1;
      stack.push(chosen.index);
    }

    if (visitedCount !== nodeCount) {
      throw new Error("maze generation failed to visit every cell");
    }

    var passageList = Array.from(passages);
    return deepFreeze({
      rows: record.rows,
      cols: record.cols,
      start: start,
      goal: goal,
      seed: seed,
      passages: passageList,
      fingerprint: buildFingerprint(
        record.rows,
        record.cols,
        startIndex,
        goalIndex,
        seed,
        passageList
      )
    });
  }

  function readMaze(value) {
    var record = snapshotRecord(value, MAZE_KEYS);
    if (
      !record ||
      !Number.isSafeInteger(record.rows) ||
      !Number.isSafeInteger(record.cols) ||
      record.rows <= 0 ||
      record.cols <= 0 ||
      record.rows * record.cols > 1000000
    ) {
      return null;
    }
    var start = readPoint(record.start, record.rows, record.cols);
    var goal = readPoint(record.goal, record.rows, record.cols);
    var passages = snapshotArray(record.passages, record.rows * record.cols);
    if (
      !start ||
      !goal ||
      (start.row === goal.row && start.col === goal.col) ||
      !passages ||
      passages.length !== record.rows * record.cols ||
      typeof record.fingerprint !== "string"
    ) {
      return null;
    }
    var seed;
    try {
      seed = normalizeSeed(record.seed);
    } catch (_error) {
      return null;
    }
    return {
      rows: record.rows,
      cols: record.cols,
      start: start,
      goal: goal,
      seed: seed,
      passages: passages,
      fingerprint: record.fingerprint
    };
  }

  function isCellIndex(maze, index) {
    return Number.isSafeInteger(index) && index >= 0 && index < maze.rows * maze.cols;
  }

  function canMove(mazeValue, index, directionName) {
    var maze = readMaze(mazeValue);
    if (!maze || !isCellIndex(maze, index) || DIRECTION_NAMES.indexOf(directionName) < 0) {
      return false;
    }
    var direction = DIRECTIONS[directionName];
    if ((maze.passages[index] & direction.bit) === 0) {
      return false;
    }
    var point = indexToPoint(index, maze.cols);
    var nextRow = point.row + direction.dr;
    var nextCol = point.col + direction.dc;
    return nextRow >= 0 && nextRow < maze.rows && nextCol >= 0 && nextCol < maze.cols;
  }

  function moveIndex(mazeValue, index, directionName) {
    var maze = readMaze(mazeValue);
    if (!maze || !isCellIndex(maze, index) || !canMove(mazeValue, index, directionName)) {
      return index;
    }
    var direction = DIRECTIONS[directionName];
    return index + direction.dr * maze.cols + direction.dc;
  }

  function validationResult(errors, nodeCount, edgeCount) {
    return deepFreeze({
      valid: errors.length === 0,
      errors: errors.slice(),
      nodeCount: nodeCount,
      edgeCount: edgeCount
    });
  }

  function validateMaze(mazeValue) {
    var maze = readMaze(mazeValue);
    if (!maze) {
      return validationResult(["shape"], 0, 0);
    }
    var errors = [];
    var nodeCount = maze.rows * maze.cols;
    var edgeCount = 0;
    for (var index = 0; index < nodeCount; index += 1) {
      var mask = maze.passages[index];
      if (!Number.isSafeInteger(mask) || mask < 0 || mask > 15) {
        errors.push("passage:" + index + ":mask");
        continue;
      }
      var point = indexToPoint(index, maze.cols);
      for (var directionIndex = 0; directionIndex < DIRECTION_NAMES.length; directionIndex += 1) {
        var directionName = DIRECTION_NAMES[directionIndex];
        var direction = DIRECTIONS[directionName];
        if ((mask & direction.bit) === 0) {
          continue;
        }
        var nextRow = point.row + direction.dr;
        var nextCol = point.col + direction.dc;
        if (nextRow < 0 || nextRow >= maze.rows || nextCol < 0 || nextCol >= maze.cols) {
          errors.push("passage:" + index + ":" + directionName + ":bounds");
          continue;
        }
        var neighborIndex = nextRow * maze.cols + nextCol;
        if ((maze.passages[neighborIndex] & DIRECTIONS[direction.opposite].bit) === 0) {
          errors.push("passage:" + index + ":" + directionName + ":asymmetric");
        }
        if (directionName === "right" || directionName === "down") {
          edgeCount += 1;
        }
      }
    }

    var expectedFingerprint = buildFingerprint(
      maze.rows,
      maze.cols,
      pointToIndex(maze.start, maze.cols),
      pointToIndex(maze.goal, maze.cols),
      maze.seed,
      maze.passages
    );
    if (maze.fingerprint !== expectedFingerprint) {
      errors.push("fingerprint");
    }

    var path = findShortestPath(mazeValue, pointToIndex(maze.start, maze.cols), null);
    if (!path) {
      errors.push("unreachable");
    }
    if (edgeCount !== nodeCount - 1) {
      errors.push("edge-count");
    }
    return validationResult(Array.from(new Set(errors)), nodeCount, edgeCount);
  }

  function findShortestPath(mazeValue, from, to) {
    var maze = readMaze(mazeValue);
    if (!maze) {
      return null;
    }
    var startIndex = from === undefined ? pointToIndex(maze.start, maze.cols) : from;
    var goalIndex = to === undefined || to === null ? pointToIndex(maze.goal, maze.cols) : to;
    if (!isCellIndex(maze, startIndex) || !isCellIndex(maze, goalIndex)) {
      return null;
    }
    var queue = [startIndex];
    var cursor = 0;
    var previous = new Array(maze.rows * maze.cols).fill(-1);
    previous[startIndex] = startIndex;

    while (cursor < queue.length && previous[goalIndex] === -1) {
      var current = queue[cursor];
      cursor += 1;
      for (var directionIndex = 0; directionIndex < DIRECTION_NAMES.length; directionIndex += 1) {
        var directionName = DIRECTION_NAMES[directionIndex];
        if (!canMove(mazeValue, current, directionName)) {
          continue;
        }
        var next = moveIndex(mazeValue, current, directionName);
        if (previous[next] !== -1) {
          continue;
        }
        previous[next] = current;
        queue.push(next);
      }
    }
    if (previous[goalIndex] === -1) {
      return null;
    }
    var path = [];
    var at = goalIndex;
    while (at !== startIndex) {
      path.push(at);
      at = previous[at];
    }
    path.push(startIndex);
    path.reverse();
    return deepFreeze(path);
  }

  function directionBetween(maze, left, right) {
    var difference = right - left;
    if (difference === -maze.cols) return "up";
    if (difference === 1) return "right";
    if (difference === maze.cols) return "down";
    if (difference === -1) return "left";
    return null;
  }

  function analyzeMaze(mazeValue) {
    var maze = readMaze(mazeValue);
    if (!maze) {
      return null;
    }
    var path = findShortestPath(mazeValue);
    if (!path) {
      return null;
    }
    var turnCount = 0;
    var previousDirection = null;
    for (var index = 1; index < path.length; index += 1) {
      var direction = directionBetween(maze, path[index - 1], path[index]);
      if (previousDirection !== null && direction !== previousDirection) {
        turnCount += 1;
      }
      previousDirection = direction;
    }
    var deadEndCount = maze.passages.reduce(function countDeadEnds(total, mask) {
      var degree = 0;
      for (var bit = 0; bit < DIRECTION_NAMES.length; bit += 1) {
        if ((mask & DIRECTIONS[DIRECTION_NAMES[bit]].bit) !== 0) {
          degree += 1;
        }
      }
      return total + (degree === 1 ? 1 : 0);
    }, 0);
    return deepFreeze({
      pathLength: path.length - 1,
      turnCount: turnCount,
      deadEndCount: deadEndCount
    });
  }

  var DEFAULT_MAZES = deepFreeze(MAPS.map(function buildDefaultMaze(map) {
    return createMaze({
      rows: CONSTANTS.ROWS,
      cols: CONSTANTS.COLS,
      start: { row: CONSTANTS.START.row, col: CONSTANTS.START.col },
      goal: { row: CONSTANTS.GOAL.row, col: CONSTANTS.GOAL.col },
      seed: map.seed
    });
  }));

  return deepFreeze({
    CONSTANTS: CONSTANTS,
    DIRECTIONS: DIRECTIONS,
    DIRECTION_NAMES: DIRECTION_NAMES.slice(),
    MAPS: MAPS,
    DEFAULT_MAZES: DEFAULT_MAZES,
    createXorshift32: createXorshift32,
    createMaze: createMaze,
    validateMaze: validateMaze,
    findShortestPath: findShortestPath,
    analyzeMaze: analyzeMaze,
    canMove: canMove,
    moveIndex: moveIndex
  });
});
