"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
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

test("classic script and CommonJS expose the same recursively frozen maze API", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(require.resolve("./logic.js"), "utf8"), sandbox);
  const browserApi = sandbox.window.DualMazeRaceLogic;

  assert.deepEqual(Object.keys(browserApi), Object.keys(logic));
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
