"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const config = require("./config.js");
const logic = require("./logic.js");

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function") ||
    seen.has(value)
  ) {
    return;
  }
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  if (typeof value === "function") return;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function editableMaze(maze) {
  return {
    rows: maze.rows,
    cols: maze.cols,
    start: { ...maze.start },
    goal: { ...maze.goal },
    seed: maze.seed,
    passages: [...maze.passages],
    fingerprint: maze.fingerprint
  };
}

function throwingProxy() {
  return new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype");
    }
  });
}

function action(state, type, fields = {}) {
  return { type, revision: state.revision, ...fields };
}

function createCheckedState({ joint = true, names = ["阿左", "阿右"] } = {}) {
  let state = logic.createInitialState({
    playerNames: names,
    mazes: logic.DEFAULT_MAZES
  });
  state = logic.reduce(state, action(state, logic.ACTIONS.ENTER_INPUT_CHECK));
  for (const playerId of [0, 1]) {
    for (const direction of logic.DIRECTION_NAMES) {
      state = logic.reduce(state, action(state, logic.ACTIONS.RECORD_DIRECTION_CHECK, {
        playerId,
        direction
      }));
    }
  }
  state = logic.reduce(
    state,
    action(
      state,
      joint ? logic.ACTIONS.RECORD_JOINT_CHECK : logic.ACTIONS.ACCEPT_INPUT_WARNING
    )
  );
  return state;
}

function startRacing(options) {
  let state = createCheckedState(options);
  state = logic.reduce(state, action(state, logic.ACTIONS.START_MATCH));
  for (let tick = 0; tick < logic.CONSTANTS.COUNTDOWN_TICKS; tick += 1) {
    state = logic.reduce(state, action(state, logic.ACTIONS.TICK));
  }
  assert.equal(state.phase, "racing");
  return state;
}

function pathDirections(maze) {
  const path = logic.findShortestPath(maze);
  return path.slice(1).map((target, index) => {
    const from = path[index];
    const direction = logic.DIRECTION_NAMES.find(
      (candidate) => logic.canMove(maze, from, candidate)
        && logic.moveIndex(maze, from, candidate) === target
    );
    assert.ok(direction);
    return direction;
  });
}

function raceAlong(state, players) {
  const heat = logic.HEATS[state.heatIndex];
  const directions = pathDirections(state.mazes[heat.mapIndex]);
  let next = state;
  for (const direction of directions) {
    for (const playerId of players) {
      next = logic.reduce(next, action(next, logic.ACTIONS.QUEUE_MOVE, {
        playerId,
        direction
      }));
    }
    next = logic.reduce(next, action(next, logic.ACTIONS.TICK));
  }
  return next;
}

test("classic script and CommonJS expose the same recursively frozen maze API", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(require.resolve("./config.js"), "utf8"), sandbox);
  vm.runInNewContext(readFileSync(require.resolve("./logic.js"), "utf8"), sandbox);
  const browserApi = sandbox.window.DualMazeRaceLogic;

  assert.deepEqual(Object.keys(browserApi), Object.keys(logic));
  assert.equal(sandbox.window.DUAL_MAZE_CONFIG.composeMatchNote(), config.composeMatchNote());
  assert.equal(browserApi.CONSTANTS.ROWS, 9);
  assert.equal(browserApi.CONSTANTS.COLS, 9);
  assert.deepEqual(logic.CONSTANTS.START, { row: 4, col: 0 });
  assert.deepEqual(logic.CONSTANTS.GOAL, { row: 4, col: 8 });
  assert.deepEqual(Array.from(browserApi.DIRECTION_NAMES), ["up", "right", "down", "left"]);
  assertDeepFrozen(logic);
  assertDeepFrozen(browserApi);
});

test("xorshift32 follows the frozen uint32 recurrence and rejects malformed seeds", () => {
  const next = logic.createXorshift32(1);
  assert.deepEqual(
    [next(), next(), next(), next(), next()],
    [270369, 67634689, 2647435461, 307599695, 2398689233]
  );

  for (const value of [0, 0x100000000, -1, 1.5, "1", NaN, Infinity]) {
    assert.throws(() => logic.createXorshift32(value));
  }
});

test("two frozen seeds reproduce exact fingerprints and independent maze metrics", () => {
  const [coup, pair] = logic.DEFAULT_MAZES;
  assert.equal(
    coup.fingerprint,
    "v1|9x9|36|44|434f5550|0608060a0a0a0a0a0c070a09060a0c060a0d05020a0b0c01030c05030a0c060d060a090504020b090105060805030c060a0a09070a090609030c040609060c030a0c050709060905020a0b09030a090209"
  );
  assert.equal(
    pair.fingerprint,
    "v1|9x9|36|44|50414952|0608060e08060e0a0c070a09030a0905020d05020e0a0a0c030c05030a09040609040505020c020b0b0e0905050609060c0209060905030a09030a0c030c05060a0a0a0c030a0905030a0a08030a0a0a09"
  );
  assert.deepEqual(logic.analyzeMaze(coup), {
    pathLength: 28,
    turnCount: 18,
    deadEndCount: 10
  });
  assert.deepEqual(logic.analyzeMaze(pair), {
    pathLength: 30,
    turnCount: 19,
    deadEndCount: 10
  });
  assertDeepFrozen(coup);
  assertDeepFrozen(pair);
});

test("generated mazes are deterministic connected 81-node 80-edge trees", () => {
  for (const maze of logic.DEFAULT_MAZES) {
    const duplicate = logic.createMaze({
      rows: 9,
      cols: 9,
      start: { row: 4, col: 0 },
      goal: { row: 4, col: 8 },
      seed: maze.seed
    });
    assert.notEqual(duplicate, maze);
    assert.deepEqual(duplicate, maze);
    assert.equal(logic.validateMaze(maze).valid, true);
    assert.deepEqual(logic.validateMaze(maze), {
      valid: true,
      errors: [],
      nodeCount: 81,
      edgeCount: 80
    });

    const path = logic.findShortestPath(maze);
    assert.equal(path[0], 36);
    assert.equal(path.at(-1), 44);
    assert.equal(new Set(path).size, path.length);
    for (let index = 1; index < path.length; index += 1) {
      const from = path[index - 1];
      const to = path[index];
      const legal = logic.DIRECTION_NAMES.some(
        (direction) => logic.canMove(maze, from, direction)
          && logic.moveIndex(maze, from, direction) === to
      );
      assert.equal(legal, true);
    }
    assertDeepFrozen(path);
  }
});

test("the transposed top-to-bottom coordinates are a locked regression counterexample", () => {
  const transposed = logic.MAPS.map((map) => logic.createMaze({
    rows: 9,
    cols: 9,
    start: { row: 0, col: 4 },
    goal: { row: 8, col: 4 },
    seed: map.seed
  }));
  assert.deepEqual(transposed.map(logic.analyzeMaze), [
    { pathLength: 48, turnCount: 30, deadEndCount: 11 },
    { pathLength: 34, turnCount: 25, deadEndCount: 14 }
  ]);
  assert.notEqual(transposed[0].fingerprint, logic.DEFAULT_MAZES[0].fingerprint);
  assert.notEqual(transposed[1].fingerprint, logic.DEFAULT_MAZES[1].fingerprint);
});

test("passages are in bounds and reciprocally encoded", () => {
  for (const maze of logic.DEFAULT_MAZES) {
    for (let index = 0; index < maze.passages.length; index += 1) {
      for (const directionName of logic.DIRECTION_NAMES) {
        const direction = logic.DIRECTIONS[directionName];
        if ((maze.passages[index] & direction.bit) === 0) continue;
        const target = logic.moveIndex(maze, index, directionName);
        assert.notEqual(target, index);
        assert.equal(
          maze.passages[target] & logic.DIRECTIONS[direction.opposite].bit,
          logic.DIRECTIONS[direction.opposite].bit
        );
      }
    }
  }
});

test("validation detects fingerprint drift, edge drift, asymmetry and out-of-bounds walls", () => {
  const source = logic.DEFAULT_MAZES[0];

  const fingerprint = editableMaze(source);
  fingerprint.fingerprint = "v1|wrong";
  assert.ok(logic.validateMaze(fingerprint).errors.includes("fingerprint"));

  const edge = editableMaze(source);
  edge.passages[0] = 0;
  assert.equal(logic.validateMaze(edge).valid, false);

  const asymmetry = editableMaze(source);
  const from = logic.findShortestPath(source)[0];
  const to = logic.findShortestPath(source)[1];
  const directionName = logic.DIRECTION_NAMES.find(
    (direction) => logic.moveIndex(source, from, direction) === to
  );
  asymmetry.passages[to] &= ~logic.DIRECTIONS[logic.DIRECTIONS[directionName].opposite].bit;
  assert.ok(logic.validateMaze(asymmetry).errors.some((error) => error.includes("asymmetric")));

  const bounds = editableMaze(source);
  bounds.passages[0] |= logic.DIRECTIONS.up.bit;
  assert.ok(logic.validateMaze(bounds).errors.some((error) => error.includes("bounds")));
});

test("validation rejects a reachable goal beside a disconnected cyclic island", () => {
  const disconnected = {
    rows: 3,
    cols: 3,
    start: { row: 0, col: 0 },
    goal: { row: 0, col: 1 },
    seed: 1,
    passages: [2, 8, 4, 6, 10, 13, 3, 10, 9],
    fingerprint: "v1|3x3|0|1|00000001|020804060a0d030a09"
  };
  const diagnostics = logic.validateMaze(disconnected);
  assert.equal(diagnostics.nodeCount, 9);
  assert.equal(diagnostics.edgeCount, 8);
  assert.equal(logic.findShortestPath(disconnected).at(-1), 1);
  assert.equal(diagnostics.valid, false);
  assert.ok(diagnostics.errors.includes("unreachable"));
});

test("maze DTOs sever caller ownership and reject malformed or accessor-driven input", () => {
  const options = {
    rows: 2,
    cols: 2,
    start: { row: 0, col: 0 },
    goal: { row: 1, col: 1 },
    seed: 7
  };
  const maze = logic.createMaze(options);
  options.start.row = 1;
  assert.deepEqual(maze.start, { row: 0, col: 0 });
  assertDeepFrozen(maze);

  for (const value of [
    null,
    [],
    { ...options, extra: true },
    { ...options, rows: 0 },
    { ...options, start: { row: 0, col: 0 }, goal: { row: 0, col: 0 } },
    { ...options, start: throwingProxy() }
  ]) {
    assert.throws(() => logic.createMaze(value));
  }

  const getter = { cols: 2, start: options.start, goal: options.goal, seed: 7 };
  Object.defineProperty(getter, "rows", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    }
  });
  assert.throws(() => logic.createMaze(getter));

  assert.equal(logic.validateMaze(throwingProxy()).valid, false);
  assert.equal(logic.findShortestPath(throwingProxy()), null);
  assert.equal(logic.canMove(throwingProxy(), 0, "up"), false);
});

test("maze APIs fail closed on a passage value that cannot be numerically coerced", () => {
  const hostilePassage = editableMaze(logic.DEFAULT_MAZES[0]);
  hostilePassage.passages[0] = Object.create(null);

  let diagnostics;
  assert.doesNotThrow(() => {
    diagnostics = logic.validateMaze(hostilePassage);
  });
  assert.equal(diagnostics.valid, false);
  assert.ok(diagnostics.errors.includes("passage:0:mask"));
  assert.doesNotThrow(() => {
    assert.equal(logic.canMove(hostilePassage, 0, "right"), false);
    assert.equal(logic.moveIndex(hostilePassage, 0, "right"), 0);
    assert.equal(logic.findShortestPath(hostilePassage), null);
    assert.equal(logic.analyzeMaze(hostilePassage), null);
  });
});

test("navigation rejects invalid positions and directions without leaking mutable data", () => {
  const maze = logic.DEFAULT_MAZES[0];
  for (const index of [-1, 81, 1.5, "1", NaN]) {
    assert.equal(logic.canMove(maze, index, "up"), false);
    assert.equal(logic.findShortestPath(maze, index, 4), null);
  }
  for (const direction of ["north", "", null, throwingProxy()]) {
    assert.equal(logic.canMove(maze, 4, direction), false);
    assert.equal(logic.moveIndex(maze, 4, direction), 4);
  }
});

test("config is frozen, strictly sanitized and cannot change rules or winner", () => {
  assert.deepEqual(config.defaultPlayerNames, ["玩家一", "玩家二"]);
  assertDeepFrozen(config);
  assertDeepFrozen(logic.DEFAULT_CONFIG);

  const source = {
    defaultPlayerNames: ["  星   河 ", "月".repeat(25)],
    composeMatchNote(summary) {
      assertDeepFrozen(summary);
      return "  今晚   再来一局。  ";
    }
  };
  const safe = logic.sanitizeConfig(source);
  assert.deepEqual(safe.defaultPlayerNames, ["星 河", "月".repeat(20)]);
  source.defaultPlayerNames[0] = "篡改";
  assert.equal(safe.defaultPlayerNames[0], "星 河");
  assert.equal(
    logic.sanitizeConfig({ ...source, extra: true }),
    logic.DEFAULT_CONFIG
  );
  assert.equal(
    logic.sanitizeConfig({ defaultPlayerNames: ["甲", "乙"], composeMatchNote: "no" }),
    logic.DEFAULT_CONFIG
  );
});

test("initial state normalizes names, freezes ownership and rejects non-fixture mazes", () => {
  const names = ["  星   河 ", "\ud800"];
  const state = logic.createInitialState({
    playerNames: names,
    mazes: logic.DEFAULT_MAZES
  });
  names[0] = "外部改名";
  assert.equal(logic.isState(state), true);
  assert.equal(state.phase, "intro");
  assert.deepEqual(state.playerNames, ["星 河", "玩家二"]);
  assert.equal(state.mazes, logic.DEFAULT_MAZES);
  assert.equal(state.positions[0], 36);
  assertDeepFrozen(state);

  const wrongMaze = editableMaze(logic.DEFAULT_MAZES[0]);
  wrongMaze.seed = logic.MAPS[1].seed;
  const fallback = logic.createInitialState({
    playerNames: ["甲", "乙"],
    mazes: [wrongMaze, logic.DEFAULT_MAZES[1]]
  });
  assert.deepEqual(fallback.playerNames, ["玩家一", "玩家二"]);
  assert.equal(fallback.mazes, logic.DEFAULT_MAZES);

  const lateThrowingMaze = new Proxy(logic.DEFAULT_MAZES[0], {
    get(target, key, receiver) {
      if (key === "seed") throw new Error("late hostile get");
      return Reflect.get(target, key, receiver);
    }
  });
  let proxyFallback;
  assert.doesNotThrow(() => {
    proxyFallback = logic.createInitialState({
      playerNames: ["甲", "乙"],
      mazes: [lateThrowingMaze, logic.DEFAULT_MAZES[1]]
    });
  });
  assert.deepEqual(proxyFallback.playerNames, ["甲", "乙"]);
  assert.equal(proxyFallback.mazes, logic.DEFAULT_MAZES);
});

test("input check requires both direction sets and joint success or explicit warning acceptance", () => {
  let state = logic.createInitialState();
  assert.equal(logic.startMatch(state), state);
  state = logic.enterInputCheck(state);
  assert.equal(state.phase, "input-check");
  assert.equal(logic.startMatch(state), state);

  for (const playerId of [0, 1]) {
    for (const direction of logic.DIRECTION_NAMES) {
      const previous = state;
      state = logic.recordDirectionCheck(state, playerId, direction);
      assert.equal(state.revision, previous.revision + 1);
      assert.equal(logic.recordDirectionCheck(state, playerId, direction), state);
    }
  }
  assert.equal(logic.startMatch(state), state);
  const accepted = logic.acceptInputWarning(state);
  assert.equal(accepted.inputCheck.warningAccepted, true);
  const countdown = logic.startMatch(accepted);
  assert.equal(countdown.phase, "countdown");
  assert.equal(countdown.countdownTicks, 90);

  const joint = createCheckedState({ joint: true });
  assert.equal(joint.inputCheck.jointDetected, true);
  assert.equal(logic.startMatch(joint).phase, "countdown");
});

test("actions require exact own data fields and current revision", () => {
  const state = logic.enterInputCheck(logic.createInitialState());
  const legal = action(state, logic.ACTIONS.RECORD_DIRECTION_CHECK, {
    playerId: 0,
    direction: "up"
  });
  assert.equal(logic.reduce(state, { ...legal, extra: true }), state);
  assert.equal(logic.reduce(state, { ...legal, revision: state.revision - 1 }), state);
  assert.equal(logic.reduce(state, { ...legal, playerId: 2 }), state);
  assert.equal(logic.reduce(state, { ...legal, direction: "north" }), state);
  assert.equal(logic.reduce(state, throwingProxy()), state);

  const accessor = { type: logic.ACTIONS.RECORD_JOINT_CHECK, revision: state.revision };
  Object.defineProperty(accessor, "revision", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    }
  });
  assert.equal(logic.reduce(state, accessor), state);

  const recovered = logic.reduce({ phase: "racing" }, legal);
  assert.equal(logic.isState(recovered), true);
  assert.equal(recovered.phase, "intro");
  assert.equal(logic.enterInputCheck(null).phase, "intro");
  assert.equal(logic.queueMove(throwingProxy(), 0, "right").phase, "intro");
});

test("countdown consumes exactly 90 abstract ticks and rejects movement until racing", () => {
  let state = createCheckedState();
  state = logic.startMatch(state);
  assert.equal(logic.queueMove(state, 0, "right"), state);
  for (let tick = 0; tick < 89; tick += 1) {
    state = logic.advanceCountdown(state);
    assert.equal(state.phase, "countdown");
    assert.equal(state.elapsedTicks, 0);
  }
  state = logic.advanceCountdown(state);
  assert.equal(state.phase, "racing");
  assert.equal(state.countdownTicks, 0);
  assert.deepEqual(state.queues, [[], []]);
});

test("each racing tick consumes at most one FIFO item per player", () => {
  let state = startRacing();
  const directions = pathDirections(state.mazes[0]);
  state = logic.queueMove(state, 0, directions[0]);
  state = logic.queueMove(state, 0, directions[1]);
  assert.equal(logic.queueMove(state, 0, directions[2]), state);
  state = logic.stepRace(state);
  assert.equal(state.elapsedTicks, 1);
  assert.deepEqual(state.queues[0], [directions[1]]);
  const firstPosition = state.positions[0];
  state = logic.stepRace(state);
  assert.equal(state.elapsedTicks, 2);
  assert.deepEqual(state.queues[0], []);
  assert.notEqual(state.positions[0], firstPosition);
});

test("wall attempts stay in place, increment bump and are consumed atomically", () => {
  let state = startRacing();
  const maze = state.mazes[0];
  const wall = logic.DIRECTION_NAMES.find(
    (direction) => !logic.canMove(maze, state.positions[0], direction)
  );
  assert.ok(wall);
  state = logic.queueMove(state, 0, wall);
  const before = state.positions[0];
  state = logic.stepRace(state);
  assert.equal(state.positions[0], before);
  assert.equal(state.bumps[0], 1);
  assert.equal(state.bumps[1], 0);
  assert.deepEqual(state.queues[0], []);
});

test("player enqueue order does not affect same-tick movement or a simultaneous finish", () => {
  let leftFirst = startRacing();
  let rightFirst = startRacing();
  const directions = pathDirections(leftFirst.mazes[0]);

  for (const direction of directions) {
    leftFirst = logic.queueMove(leftFirst, 0, direction);
    leftFirst = logic.queueMove(leftFirst, 1, direction);
    rightFirst = logic.queueMove(rightFirst, 1, direction);
    rightFirst = logic.queueMove(rightFirst, 0, direction);
    leftFirst = logic.stepRace(leftFirst);
    rightFirst = logic.stepRace(rightFirst);
  }

  assert.equal(leftFirst.phase, "heat-result");
  assert.equal(rightFirst.phase, "heat-result");
  assert.deepEqual(leftFirst.positions, rightFirst.positions);
  assert.deepEqual(leftFirst.bumps, rightFirst.bumps);
  assert.deepEqual(leftFirst.heatResults, rightFirst.heatResults);
  assert.equal(leftFirst.heatResults[0].winner, null);
  assert.deepEqual(leftFirst.heatResults[0].points, [0.5, 0.5]);
  assert.equal(leftFirst.heatResults[0].elapsedTicks, 28);
});

test("single-player finishes mirror by player id without hidden tiebreaks", () => {
  const playerZero = raceAlong(startRacing(), [0]);
  const playerOne = raceAlong(startRacing(), [1]);
  assert.equal(playerZero.phase, "heat-result");
  assert.equal(playerOne.phase, "heat-result");
  assert.equal(playerZero.heatResults[0].winner, 0);
  assert.equal(playerOne.heatResults[0].winner, 1);
  assert.deepEqual(playerZero.heatResults[0].points, [1, 0]);
  assert.deepEqual(playerOne.heatResults[0].points, [0, 1]);
  assert.equal(playerZero.heatResults[0].elapsedTicks, playerOne.heatResults[0].elapsedTicks);
  assert.deepEqual(playerZero.heatResults[0].bumps, playerOne.heatResults[0].bumps);
  assert.equal(playerZero.positions[1], 36);
  assert.equal(playerOne.positions[0], 36);
  assert.equal(logic.stepRace(playerZero), playerZero);
  assert.equal(logic.stepRace(playerOne), playerOne);
});

test("the same integer action trace replays identically across dispatcher groupings", () => {
  const trace = [
    { type: logic.ACTIONS.ENTER_INPUT_CHECK }
  ];
  for (const playerId of [0, 1]) {
    for (const direction of logic.DIRECTION_NAMES) {
      trace.push({
        type: logic.ACTIONS.RECORD_DIRECTION_CHECK,
        playerId,
        direction
      });
    }
  }
  trace.push({ type: logic.ACTIONS.RECORD_JOINT_CHECK });
  trace.push({ type: logic.ACTIONS.START_MATCH });
  for (let tick = 0; tick < logic.CONSTANTS.COUNTDOWN_TICKS; tick += 1) {
    trace.push({ type: logic.ACTIONS.TICK });
  }
  for (const direction of pathDirections(logic.DEFAULT_MAZES[0])) {
    trace.push({ type: logic.ACTIONS.QUEUE_MOVE, playerId: 0, direction });
    trace.push({ type: logic.ACTIONS.QUEUE_MOVE, playerId: 1, direction });
    trace.push({ type: logic.ACTIONS.TICK });
  }

  function replay(groupSize) {
    let state = logic.createInitialState();
    for (let start = 0; start < trace.length; start += groupSize) {
      for (const event of trace.slice(start, start + groupSize)) {
        state = logic.reduce(state, {
          ...event,
          revision: state.revision
        });
      }
    }
    return state;
  }

  const perEvent = replay(1);
  const batched = replay(7);
  assert.equal(perEvent.phase, "heat-result");
  assert.deepEqual(batched, perEvent);
  assert.deepEqual(logic.getPublicView(batched), logic.getPublicView(perEvent));
});

test("four heats pair both seeds, swap seats and accept a tied match", () => {
  let state = startRacing({ names: ["晨", "暮"] });
  for (let heatIndex = 0; heatIndex < logic.HEATS.length; heatIndex += 1) {
    state = raceAlong(state, [0, 1]);
    if (heatIndex < logic.HEATS.length - 1) {
      assert.equal(state.phase, "heat-result");
      state = logic.advanceHeat(state);
      assert.equal(state.heatIndex, heatIndex + 1);
      for (let tick = 0; tick < logic.CONSTANTS.COUNTDOWN_TICKS; tick += 1) {
        state = logic.advanceCountdown(state);
      }
    }
  }

  assert.equal(state.phase, "match-result");
  assert.deepEqual(
    state.heatResults.map((result) => [
      result.mapLabel,
      result.leftPlayer,
      result.rightPlayer,
      result.elapsedTicks
    ]),
    [
      ["COUP", 0, 1, 28],
      ["COUP", 1, 0, 28],
      ["PAIR", 0, 1, 30],
      ["PAIR", 1, 0, 30]
    ]
  );
  const view = logic.getPublicView(state);
  assert.deepEqual(view.scores, [2, 2]);
  assert.equal(view.matchWinner, null);

  const restarted = logic.restartMatch(state);
  assert.equal(restarted.phase, "countdown");
  assert.deepEqual(restarted.playerNames, ["晨", "暮"]);
  assert.equal(restarted.mazes, state.mazes);
  assert.deepEqual(restarted.heatResults, []);
});

test("pause clears queues, freezes abstract time and resume uses a 45-tick countdown", () => {
  let state = startRacing();
  const firstDirection = pathDirections(state.mazes[0])[0];
  state = logic.queueMove(state, 0, firstDirection);
  const elapsed = state.elapsedTicks;
  const paused = logic.pauseMatch(state, "hidden");
  assert.equal(paused.phase, "paused");
  assert.deepEqual(paused.queues, [[], []]);
  assert.equal(paused.elapsedTicks, elapsed);
  assert.equal(logic.stepRace(paused), paused);
  assert.equal(logic.pauseMatch(paused, "manual"), paused);

  state = logic.resumeMatch(paused);
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 45);
  for (let tick = 0; tick < 45; tick += 1) state = logic.advanceCountdown(state);
  assert.equal(state.phase, "racing");
  assert.equal(state.elapsedTicks, elapsed);
  assert.deepEqual(state.queues, [[], []]);
});

test("public view shares one maze DTO between boards without queues, paths or PRNG state", () => {
  let state = startRacing();
  state = logic.queueMove(state, 0, pathDirections(state.mazes[0])[0]);
  const view = logic.getPublicView(state);
  assert.equal(view.boards[0].maze, view.boards[1].maze);
  assert.notEqual(view.boards[0].maze, state.mazes[0]);
  assert.equal("queues" in view, false);
  assert.equal("fingerprint" in view.boards[0].maze, false);
  assert.equal("path" in view.boards[0].maze, false);
  assert.equal("prng" in view, false);
  assertDeepFrozen(view);

  assert.equal(logic.getPublicView({ phase: "racing" }), null);
  assert.notEqual(logic.getPublicView(state), view);
});

test("match note receives frozen public summary, is bounded and cannot alter the result", () => {
  let state = startRacing();
  for (let heatIndex = 0; heatIndex < 4; heatIndex += 1) {
    state = raceAlong(state, [0, 1]);
    if (heatIndex < 3) {
      state = logic.advanceHeat(state);
      for (let tick = 0; tick < 90; tick += 1) state = logic.advanceCountdown(state);
    }
  }
  const winnerBefore = logic.getPublicView(state).matchWinner;
  const note = logic.resolveMatchNote(state, {
    defaultPlayerNames: ["甲", "乙"],
    composeMatchNote(summary) {
      assertDeepFrozen(summary);
      return "爱".repeat(200);
    }
  });
  assert.equal(Array.from(note).length, 160);
  assert.equal(logic.getPublicView(state).matchWinner, winnerBefore);

  const fallback = logic.resolveMatchNote(state, {
    defaultPlayerNames: ["甲", "乙"],
    composeMatchNote() {
      throw new Error("formatter");
    }
  });
  assert.equal(fallback, "同一条路，换个位置，再比一次。");
  assert.equal(logic.resolveMatchNote(startRacing()), null);
});

test("attribution covers every research URL and preserves the zero-copy boundary", () => {
  function markdownUrls(source) {
    return [...new Set(
      [...source.matchAll(/https?:\/\/[^\s)>]+/gu)].map((match) => match[0])
    )].sort();
  }

  const research = readFileSync(
    require.resolve("../../../docs/283-dual-maze-race-research.md"),
    "utf8"
  );
  const attribution = readFileSync(
    require.resolve("./ATTRIBUTION.md"),
    "utf8"
  );
  assert.equal(markdownUrls(research).length, 15);
  assert.deepEqual(markdownUrls(attribution), markdownUrls(research));
  assert.match(attribution, /没有第三方开源实现、代码或素材/u);
  assert.match(attribution, /没有可合理固定的外部 commit\/tag/u);
  assert.match(attribution, /没有需要随本作再分发的第三方软件许可证正文/u);
});

test("production core has no DOM, network, storage, random or browser clock dependency", () => {
  const source = [
    readFileSync(require.resolve("./config.js"), "utf8"),
    readFileSync(require.resolve("./logic.js"), "utf8")
  ].join("\n");
  for (const forbidden of [
    /\bdocument\b/u,
    /\bfetch\s*\(/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\bDate\.now\b/u,
    /\bperformance\.now\b/u,
    /\brequestAnimationFrame\b/u,
    /\bMath\.random\b/u
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});
