"use strict";

(function exposeDualMazeRaceLogic(root, factory) {
  var sourceConfig =
    typeof module === "object" && module && module.exports
      ? require("./config.js")
      : root && root.DUAL_MAZE_CONFIG;
  var api = factory(sourceConfig);
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DualMazeRaceLogic = api;
  }
})(typeof window === "object" ? window : null, function createDualMazeRaceLogic(sourceConfig) {
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

  function isPassageMask(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 15;
  }

  function hasValidPassageMasks(maze) {
    for (var index = 0; index < maze.passages.length; index += 1) {
      if (!isPassageMask(maze.passages[index])) return false;
    }
    return true;
  }

  function canMove(mazeValue, index, directionName) {
    var maze = readMaze(mazeValue);
    if (!maze || !isCellIndex(maze, index) || DIRECTION_NAMES.indexOf(directionName) < 0) {
      return false;
    }
    var direction = DIRECTIONS[directionName];
    if (!isPassageMask(maze.passages[index])
      || (maze.passages[index] & direction.bit) === 0) {
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
    var passageMasksValid = true;
    for (var index = 0; index < nodeCount; index += 1) {
      var mask = maze.passages[index];
      if (!isPassageMask(mask)) {
        errors.push("passage:" + index + ":mask");
        passageMasksValid = false;
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
        var neighborMask = maze.passages[neighborIndex];
        if (
          isPassageMask(neighborMask)
          && (neighborMask & DIRECTIONS[direction.opposite].bit) === 0
        ) {
          errors.push("passage:" + index + ":" + directionName + ":asymmetric");
        }
        if (directionName === "right" || directionName === "down") {
          edgeCount += 1;
        }
      }
    }

    if (passageMasksValid) {
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
    }

    var reachable = new Uint8Array(nodeCount);
    var queue = [pointToIndex(maze.start, maze.cols)];
    var cursor = 0;
    var reachableCount = 1;
    reachable[queue[0]] = 1;
    while (cursor < queue.length) {
      var current = queue[cursor];
      cursor += 1;
      var currentPoint = indexToPoint(current, maze.cols);
      for (var reachableDirectionIndex = 0;
        reachableDirectionIndex < DIRECTION_NAMES.length;
        reachableDirectionIndex += 1) {
        var reachableDirection = DIRECTIONS[DIRECTION_NAMES[reachableDirectionIndex]];
        if (
          !isPassageMask(maze.passages[current])
          || (maze.passages[current] & reachableDirection.bit) === 0
        ) {
          continue;
        }
        var reachableRow = currentPoint.row + reachableDirection.dr;
        var reachableCol = currentPoint.col + reachableDirection.dc;
        if (
          reachableRow < 0 ||
          reachableRow >= maze.rows ||
          reachableCol < 0 ||
          reachableCol >= maze.cols
        ) {
          continue;
        }
        var reachableIndex = reachableRow * maze.cols + reachableCol;
        if (reachable[reachableIndex] !== 0) continue;
        reachable[reachableIndex] = 1;
        reachableCount += 1;
        queue.push(reachableIndex);
      }
    }
    if (reachableCount !== nodeCount) {
      errors.push("unreachable");
    }
    if (edgeCount !== nodeCount - 1) {
      errors.push("edge-count");
    }
    return validationResult(Array.from(new Set(errors)), nodeCount, edgeCount);
  }

  function findShortestPath(mazeValue, from, to) {
    var maze = readMaze(mazeValue);
    if (!maze || !hasValidPassageMasks(maze)) {
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

  var INTERNAL_STATES = new WeakSet();
  var PAUSE_REASONS = deepFreeze(["manual", "hidden", "blur", "pagehide", "stalled"]);
  var PHASES = deepFreeze([
    "intro",
    "input-check",
    "countdown",
    "racing",
    "paused",
    "heat-result",
    "match-result"
  ]);
  var HEATS = deepFreeze([
    { mapIndex: 0, leftPlayer: 0, rightPlayer: 1 },
    { mapIndex: 0, leftPlayer: 1, rightPlayer: 0 },
    { mapIndex: 1, leftPlayer: 0, rightPlayer: 1 },
    { mapIndex: 1, leftPlayer: 1, rightPlayer: 0 }
  ]);
  var ACTIONS = deepFreeze({
    ENTER_INPUT_CHECK: "ENTER_INPUT_CHECK",
    RECORD_DIRECTION_CHECK: "RECORD_DIRECTION_CHECK",
    RECORD_JOINT_CHECK: "RECORD_JOINT_CHECK",
    ACCEPT_INPUT_WARNING: "ACCEPT_INPUT_WARNING",
    START_MATCH: "START_MATCH",
    QUEUE_MOVE: "QUEUE_MOVE",
    TICK: "TICK",
    PAUSE: "PAUSE",
    RESUME: "RESUME",
    ADVANCE_HEAT: "ADVANCE_HEAT",
    RESTART: "RESTART"
  });
  var ACTION_KEYS = deepFreeze({
    ENTER_INPUT_CHECK: ["type", "revision"],
    RECORD_DIRECTION_CHECK: ["type", "revision", "playerId", "direction"],
    RECORD_JOINT_CHECK: ["type", "revision"],
    ACCEPT_INPUT_WARNING: ["type", "revision"],
    START_MATCH: ["type", "revision"],
    QUEUE_MOVE: ["type", "revision", "playerId", "direction"],
    TICK: ["type", "revision"],
    PAUSE: ["type", "revision", "reason"],
    RESUME: ["type", "revision"],
    ADVANCE_HEAT: ["type", "revision"],
    RESTART: ["type", "revision"]
  });
  var CONFIG_KEYS = ["defaultPlayerNames", "composeMatchNote"];
  var CREATE_STATE_KEYS = ["playerNames", "mazes"];
  var FORBIDDEN_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

  function isWellFormedUnicode(value) {
    for (var index = 0; index < value.length; index += 1) {
      var unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= value.length) return false;
        var next = value.charCodeAt(index + 1);
        if (next < 0xdc00 || next > 0xdfff) return false;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return false;
      }
    }
    return true;
  }

  function normalizeName(value, fallback) {
    if (
      typeof value !== "string" ||
      !isWellFormedUnicode(value) ||
      FORBIDDEN_TEXT.test(value)
    ) {
      return fallback;
    }
    var normalized;
    try {
      normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim();
    } catch (_error) {
      return fallback;
    }
    var points = Array.from(normalized);
    if (points.length === 0) return fallback;
    return points.slice(0, CONSTANTS.MAX_NAME_LENGTH).join("");
  }

  function readTwoNames(value) {
    var values = snapshotArray(value, 2);
    if (!values || values.length !== 2) return null;
    return values;
  }

  function defaultComposeMatchNote() {
    return "同一条路，换个位置，再比一次。";
  }

  var BUILT_IN_CONFIG = deepFreeze({
    defaultPlayerNames: ["玩家一", "玩家二"],
    composeMatchNote: defaultComposeMatchNote
  });
  var DEFAULT_CONFIG;

  function configFallback() {
    return DEFAULT_CONFIG || BUILT_IN_CONFIG;
  }

  function sanitizeConfig(value) {
    try {
      var record = snapshotRecord(value, CONFIG_KEYS);
      if (!record || typeof record.composeMatchNote !== "function") {
        return configFallback();
      }
      var names = readTwoNames(record.defaultPlayerNames);
      if (!names) return configFallback();
      var cleanedNames = [
        normalizeName(names[0], BUILT_IN_CONFIG.defaultPlayerNames[0]),
        normalizeName(names[1], BUILT_IN_CONFIG.defaultPlayerNames[1])
      ];
      var formatter = record.composeMatchNote;
      return deepFreeze({
        defaultPlayerNames: cleanedNames,
        composeMatchNote: function safeFormatter(summary) {
          return formatter(summary);
        }
      });
    } catch (_error) {
      return configFallback();
    }
  }

  DEFAULT_CONFIG = sanitizeConfig(sourceConfig);

  function allDirections(value) {
    return deepFreeze({
      up: Boolean(value && value.up),
      right: Boolean(value && value.right),
      down: Boolean(value && value.down),
      left: Boolean(value && value.left)
    });
  }

  function emptyInputCheck() {
    return {
      directions: [allDirections(), allDirections()],
      jointDetected: false,
      warningAccepted: false
    };
  }

  function inputDirectionsComplete(inputCheck) {
    return inputCheck.directions.every(function playerComplete(directions) {
      return DIRECTION_NAMES.every(function directionComplete(direction) {
        return directions[direction] === true;
      });
    });
  }

  function freezeState(raw) {
    var state = deepFreeze(raw);
    INTERNAL_STATES.add(state);
    return state;
  }

  function isState(value) {
    return value !== null && typeof value === "object" && INTERNAL_STATES.has(value);
  }

  function readMazes(value) {
    if (value === undefined) return DEFAULT_MAZES;
    var mazes = snapshotArray(value, MAPS.length);
    if (!mazes || mazes.length !== MAPS.length) return null;
    for (var index = 0; index < MAPS.length; index += 1) {
      var maze = readMaze(mazes[index]);
      if (!maze) return null;
      var diagnostics = validateMaze(maze);
      if (
        !diagnostics.valid ||
        maze.seed !== MAPS[index].seed ||
        maze.fingerprint !== DEFAULT_MAZES[index].fingerprint
      ) {
        return null;
      }
    }
    return DEFAULT_MAZES;
  }

  function readCreateStateOptions(options) {
    if (options === undefined) {
      return {
        playerNames: DEFAULT_CONFIG.defaultPlayerNames,
        mazes: DEFAULT_MAZES
      };
    }
    var record = snapshotRecord(options, CREATE_STATE_KEYS);
    if (!record) return null;
    var names = readTwoNames(record.playerNames);
    var mazes = readMazes(record.mazes);
    if (!names || !mazes) return null;
    return {
      playerNames: [
        normalizeName(names[0], DEFAULT_CONFIG.defaultPlayerNames[0]),
        normalizeName(names[1], DEFAULT_CONFIG.defaultPlayerNames[1])
      ],
      mazes: mazes
    };
  }

  function createInitialState(options) {
    var parsed = readCreateStateOptions(options);
    if (!parsed) {
      parsed = {
        playerNames: DEFAULT_CONFIG.defaultPlayerNames,
        mazes: DEFAULT_MAZES
      };
    }
    var startIndex = pointToIndex(CONSTANTS.START, CONSTANTS.COLS);
    return freezeState({
      phase: "intro",
      playerNames: parsed.playerNames.slice(),
      inputCheck: emptyInputCheck(),
      mazes: parsed.mazes,
      heatIndex: 0,
      positions: [startIndex, startIndex],
      queues: [[], []],
      countdownTicks: CONSTANTS.COUNTDOWN_TICKS,
      elapsedTicks: 0,
      bumps: [0, 0],
      heatResults: [],
      pauseReason: null,
      revision: 0
    });
  }

  function nextState(state, changes) {
    return freezeState(Object.assign({}, state, changes, {
      revision: state.revision + 1
    }));
  }

  function readAction(value) {
    try {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype
      ) {
        return null;
      }
      var typeDescriptor = Object.getOwnPropertyDescriptor(value, "type");
      if (
        !typeDescriptor ||
        typeDescriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(typeDescriptor, "value") ||
        typeof typeDescriptor.value !== "string"
      ) {
        return null;
      }
      var keys = ACTION_KEYS[typeDescriptor.value];
      if (!keys) return null;
      return snapshotRecord(value, keys);
    } catch (_error) {
      return null;
    }
  }

  function reduce(state, actionValue) {
    if (!isState(state)) return createInitialState();
    var action = readAction(actionValue);
    if (
      !action ||
      !Number.isSafeInteger(action.revision) ||
      action.revision !== state.revision ||
      state.revision >= CONSTANTS.MAX_REVISION
    ) {
      return state;
    }

    if (action.type === ACTIONS.ENTER_INPUT_CHECK) {
      if (state.phase !== "intro") return state;
      return nextState(state, { phase: "input-check" });
    }

    if (action.type === ACTIONS.RECORD_DIRECTION_CHECK) {
      if (
        state.phase !== "input-check" ||
        (action.playerId !== 0 && action.playerId !== 1) ||
        DIRECTION_NAMES.indexOf(action.direction) < 0 ||
        state.inputCheck.directions[action.playerId][action.direction]
      ) {
        return state;
      }
      var checkedDirections = state.inputCheck.directions.map(function copyDirections(item) {
        return {
          up: item.up,
          right: item.right,
          down: item.down,
          left: item.left
        };
      });
      checkedDirections[action.playerId][action.direction] = true;
      return nextState(state, {
        inputCheck: {
          directions: checkedDirections,
          jointDetected: state.inputCheck.jointDetected,
          warningAccepted: state.inputCheck.warningAccepted
        }
      });
    }

    if (action.type === ACTIONS.RECORD_JOINT_CHECK) {
      if (state.phase !== "input-check" || state.inputCheck.jointDetected) return state;
      return nextState(state, {
        inputCheck: {
          directions: state.inputCheck.directions,
          jointDetected: true,
          warningAccepted: state.inputCheck.warningAccepted
        }
      });
    }

    if (action.type === ACTIONS.ACCEPT_INPUT_WARNING) {
      if (
        state.phase !== "input-check" ||
        !inputDirectionsComplete(state.inputCheck) ||
        state.inputCheck.jointDetected ||
        state.inputCheck.warningAccepted
      ) {
        return state;
      }
      return nextState(state, {
        inputCheck: {
          directions: state.inputCheck.directions,
          jointDetected: false,
          warningAccepted: true
        }
      });
    }

    if (action.type === ACTIONS.START_MATCH) {
      if (
        state.phase !== "input-check" ||
        !inputDirectionsComplete(state.inputCheck) ||
        (!state.inputCheck.jointDetected && !state.inputCheck.warningAccepted)
      ) {
        return state;
      }
      var matchStart = pointToIndex(CONSTANTS.START, CONSTANTS.COLS);
      return nextState(state, {
        phase: "countdown",
        heatIndex: 0,
        positions: [matchStart, matchStart],
        queues: [[], []],
        countdownTicks: CONSTANTS.COUNTDOWN_TICKS,
        elapsedTicks: 0,
        bumps: [0, 0],
        heatResults: [],
        pauseReason: null
      });
    }

    if (action.type === ACTIONS.QUEUE_MOVE) {
      if (
        state.phase !== "racing" ||
        (action.playerId !== 0 && action.playerId !== 1) ||
        DIRECTION_NAMES.indexOf(action.direction) < 0 ||
        state.queues[action.playerId].length >= CONSTANTS.MAX_QUEUE
      ) {
        return state;
      }
      var queues = state.queues.map(function copyQueue(queue) {
        return queue.slice();
      });
      queues[action.playerId].push(action.direction);
      return nextState(state, { queues: queues });
    }

    if (action.type === ACTIONS.TICK) {
      if (state.phase === "countdown") {
        var countdownTicks = state.countdownTicks - 1;
        return nextState(state, {
          phase: countdownTicks === 0 ? "racing" : "countdown",
          countdownTicks: countdownTicks,
          queues: countdownTicks === 0 ? [[], []] : state.queues
        });
      }
      if (state.phase !== "racing") return state;
      return stepRacingState(state);
    }

    if (action.type === ACTIONS.PAUSE) {
      if (
        (state.phase !== "countdown" && state.phase !== "racing") ||
        PAUSE_REASONS.indexOf(action.reason) < 0
      ) {
        return state;
      }
      return nextState(state, {
        phase: "paused",
        queues: [[], []],
        pauseReason: action.reason
      });
    }

    if (action.type === ACTIONS.RESUME) {
      if (state.phase !== "paused") return state;
      return nextState(state, {
        phase: "countdown",
        countdownTicks: CONSTANTS.RESUME_COUNTDOWN_TICKS,
        queues: [[], []],
        pauseReason: null
      });
    }

    if (action.type === ACTIONS.ADVANCE_HEAT) {
      if (state.phase !== "heat-result" || state.heatIndex >= HEATS.length - 1) return state;
      var nextHeatStart = pointToIndex(CONSTANTS.START, CONSTANTS.COLS);
      return nextState(state, {
        phase: "countdown",
        heatIndex: state.heatIndex + 1,
        positions: [nextHeatStart, nextHeatStart],
        queues: [[], []],
        countdownTicks: CONSTANTS.COUNTDOWN_TICKS,
        elapsedTicks: 0,
        bumps: [0, 0],
        pauseReason: null
      });
    }

    if (action.type === ACTIONS.RESTART) {
      if (state.phase !== "match-result") return state;
      var restartIndex = pointToIndex(CONSTANTS.START, CONSTANTS.COLS);
      return nextState(state, {
        phase: "countdown",
        heatIndex: 0,
        positions: [restartIndex, restartIndex],
        queues: [[], []],
        countdownTicks: CONSTANTS.COUNTDOWN_TICKS,
        elapsedTicks: 0,
        bumps: [0, 0],
        heatResults: [],
        pauseReason: null
      });
    }

    return state;
  }

  function stepRacingState(state) {
    var heat = HEATS[state.heatIndex];
    var maze = state.mazes[heat.mapIndex];
    var positions = state.positions.slice();
    var queues = state.queues.map(function remainingQueue(queue) {
      return queue.slice(1);
    });
    var bumps = state.bumps.slice();

    for (var playerId = 0; playerId < 2; playerId += 1) {
      var direction = state.queues[playerId][0];
      if (direction === undefined) continue;
      if (canMove(maze, state.positions[playerId], direction)) {
        positions[playerId] = moveIndex(maze, state.positions[playerId], direction);
      } else {
        bumps[playerId] += 1;
      }
    }

    var elapsedTicks = state.elapsedTicks + 1;
    var goalIndex = pointToIndex(CONSTANTS.GOAL, CONSTANTS.COLS);
    var reached = positions.map(function reachedGoal(position) {
      return position === goalIndex;
    });
    if (!reached[0] && !reached[1]) {
      return nextState(state, {
        positions: positions,
        queues: queues,
        bumps: bumps,
        elapsedTicks: elapsedTicks
      });
    }

    var winner = reached[0] === reached[1] ? null : (reached[0] ? 0 : 1);
    var points = winner === null ? [0.5, 0.5] : (winner === 0 ? [1, 0] : [0, 1]);
    var result = deepFreeze({
      heatIndex: state.heatIndex,
      mapLabel: MAPS[heat.mapIndex].label,
      seed: maze.seed,
      leftPlayer: heat.leftPlayer,
      rightPlayer: heat.rightPlayer,
      winner: winner,
      points: points,
      elapsedTicks: elapsedTicks,
      bumps: bumps.slice()
    });
    var heatResults = state.heatResults.concat([result]);
    return nextState(state, {
      phase: state.heatIndex === HEATS.length - 1 ? "match-result" : "heat-result",
      positions: positions,
      queues: [[], []],
      bumps: bumps,
      elapsedTicks: elapsedTicks,
      heatResults: heatResults
    });
  }

  function actionFor(state, type, fields) {
    return Object.assign({
      type: type,
      revision: isState(state) ? state.revision : -1
    }, fields || {});
  }

  function enterInputCheck(state) {
    return reduce(state, actionFor(state, ACTIONS.ENTER_INPUT_CHECK));
  }

  function recordDirectionCheck(state, playerId, direction) {
    return reduce(state, actionFor(state, ACTIONS.RECORD_DIRECTION_CHECK, {
      playerId: playerId,
      direction: direction
    }));
  }

  function recordJointCheck(state) {
    return reduce(state, actionFor(state, ACTIONS.RECORD_JOINT_CHECK));
  }

  function acceptInputWarning(state) {
    return reduce(state, actionFor(state, ACTIONS.ACCEPT_INPUT_WARNING));
  }

  function startMatch(state) {
    return reduce(state, actionFor(state, ACTIONS.START_MATCH));
  }

  function queueMove(state, playerId, direction) {
    return reduce(state, actionFor(state, ACTIONS.QUEUE_MOVE, {
      playerId: playerId,
      direction: direction
    }));
  }

  function advanceCountdown(state) {
    return reduce(state, actionFor(state, ACTIONS.TICK));
  }

  function stepRace(state) {
    return reduce(state, actionFor(state, ACTIONS.TICK));
  }

  function pauseMatch(state, reason) {
    return reduce(state, actionFor(state, ACTIONS.PAUSE, { reason: reason }));
  }

  function resumeMatch(state) {
    return reduce(state, actionFor(state, ACTIONS.RESUME));
  }

  function advanceHeat(state) {
    return reduce(state, actionFor(state, ACTIONS.ADVANCE_HEAT));
  }

  function restartMatch(state) {
    return reduce(state, actionFor(state, ACTIONS.RESTART));
  }

  function scoresFromResults(results) {
    return results.reduce(function addPoints(scores, result) {
      return [scores[0] + result.points[0], scores[1] + result.points[1]];
    }, [0, 0]);
  }

  function winnerFromScores(scores, complete) {
    if (!complete || scores[0] === scores[1]) return null;
    return scores[0] > scores[1] ? 0 : 1;
  }

  function publicMaze(maze) {
    return deepFreeze({
      rows: maze.rows,
      cols: maze.cols,
      start: { row: maze.start.row, col: maze.start.col },
      goal: { row: maze.goal.row, col: maze.goal.col },
      passages: maze.passages.slice()
    });
  }

  function getPublicView(state) {
    if (!isState(state)) return null;
    var heat = HEATS[state.heatIndex];
    var maze = publicMaze(state.mazes[heat.mapIndex]);
    var scores = scoresFromResults(state.heatResults);
    var complete = state.phase === "match-result";
    var boards = [
      deepFreeze({
        seat: "left",
        playerId: heat.leftPlayer,
        position: state.positions[heat.leftPlayer],
        maze: maze
      }),
      deepFreeze({
        seat: "right",
        playerId: heat.rightPlayer,
        position: state.positions[heat.rightPlayer],
        maze: maze
      })
    ];
    return deepFreeze({
      phase: state.phase,
      revision: state.revision,
      playerNames: state.playerNames.slice(),
      heatNumber: state.heatIndex + 1,
      heatCount: HEATS.length,
      mapLabel: MAPS[heat.mapIndex].label,
      seed: state.mazes[heat.mapIndex].seed,
      leftPlayer: heat.leftPlayer,
      rightPlayer: heat.rightPlayer,
      boards: boards,
      positions: state.positions.slice(),
      countdownTicks: state.countdownTicks,
      elapsedTicks: state.elapsedTicks,
      bumps: state.bumps.slice(),
      heatResults: state.heatResults.map(function copyResult(result) {
        return {
          heatIndex: result.heatIndex,
          mapLabel: result.mapLabel,
          seed: result.seed,
          leftPlayer: result.leftPlayer,
          rightPlayer: result.rightPlayer,
          winner: result.winner,
          points: result.points.slice(),
          elapsedTicks: result.elapsedTicks,
          bumps: result.bumps.slice()
        };
      }),
      scores: scores,
      matchWinner: winnerFromScores(scores, complete),
      pauseReason: state.pauseReason,
      inputCheck: {
        directions: state.inputCheck.directions.map(function copyCheck(item) {
          return {
            up: item.up,
            right: item.right,
            down: item.down,
            left: item.left
          };
        }),
        jointDetected: state.inputCheck.jointDetected,
        warningAccepted: state.inputCheck.warningAccepted
      },
      actions: {
        canEnterInputCheck: state.phase === "intro",
        canStartMatch: state.phase === "input-check"
          && inputDirectionsComplete(state.inputCheck)
          && (state.inputCheck.jointDetected || state.inputCheck.warningAccepted),
        canMove: state.phase === "racing",
        canPause: state.phase === "countdown" || state.phase === "racing",
        canResume: state.phase === "paused",
        canAdvanceHeat: state.phase === "heat-result",
        canRestart: state.phase === "match-result"
      }
    });
  }

  function resolveMatchNote(state, configValue) {
    if (!isState(state) || state.phase !== "match-result") return null;
    var config = configValue === undefined ? DEFAULT_CONFIG : sanitizeConfig(configValue);
    var view = getPublicView(state);
    var summary = deepFreeze({
      playerNames: view.playerNames.slice(),
      scores: view.scores.slice(),
      winner: view.matchWinner,
      heatResults: view.heatResults.map(function copyResult(result) {
        return {
          heatIndex: result.heatIndex,
          mapLabel: result.mapLabel,
          winner: result.winner,
          points: result.points.slice(),
          elapsedTicks: result.elapsedTicks,
          bumps: result.bumps.slice()
        };
      })
    });
    var raw;
    try {
      raw = config.composeMatchNote(summary);
    } catch (_error) {
      raw = BUILT_IN_CONFIG.composeMatchNote(summary);
    }
    if (raw === null || raw === undefined || (typeof raw === "object" && raw !== null)) {
      raw = BUILT_IN_CONFIG.composeMatchNote(summary);
    }
    var text;
    try {
      text = String(raw);
    } catch (_error) {
      text = BUILT_IN_CONFIG.composeMatchNote(summary);
    }
    if (!isWellFormedUnicode(text) || FORBIDDEN_TEXT.test(text)) {
      text = BUILT_IN_CONFIG.composeMatchNote(summary);
    }
    return Array.from(text.trim()).slice(0, CONSTANTS.MAX_MATCH_NOTE_LENGTH).join("");
  }

  return deepFreeze({
    CONSTANTS: CONSTANTS,
    DIRECTIONS: DIRECTIONS,
    DIRECTION_NAMES: DIRECTION_NAMES.slice(),
    MAPS: MAPS,
    DEFAULT_MAZES: DEFAULT_MAZES,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    PHASES: PHASES,
    PAUSE_REASONS: PAUSE_REASONS,
    HEATS: HEATS,
    ACTIONS: ACTIONS,
    createXorshift32: createXorshift32,
    createMaze: createMaze,
    validateMaze: validateMaze,
    findShortestPath: findShortestPath,
    analyzeMaze: analyzeMaze,
    canMove: canMove,
    moveIndex: moveIndex,
    sanitizeConfig: sanitizeConfig,
    normalizeName: normalizeName,
    createInitialState: createInitialState,
    isState: isState,
    reduce: reduce,
    enterInputCheck: enterInputCheck,
    recordDirectionCheck: recordDirectionCheck,
    recordJointCheck: recordJointCheck,
    acceptInputWarning: acceptInputWarning,
    startMatch: startMatch,
    queueMove: queueMove,
    advanceCountdown: advanceCountdown,
    stepRace: stepRace,
    pauseMatch: pauseMatch,
    resumeMatch: resumeMatch,
    advanceHeat: advanceHeat,
    restartMatch: restartMatch,
    getPublicView: getPublicView,
    resolveMatchNote: resolveMatchNote
  });
});
