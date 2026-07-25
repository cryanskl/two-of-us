"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

const modulePath = require.resolve("./geometry.js");
const geometry = require(modulePath);

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)
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

function triangle(...coordinates) {
  return coordinates.map(([x, y]) => ({ x, y }));
}

function atomicAt(x, y) {
  return triangle([x, y], [x + 1, y], [x, y + 1]);
}

function pose(overrides = {}) {
  return {
    tx: 0,
    ty: 0,
    quarterTurns: 0,
    flipped: false,
    ...overrides
  };
}

function throwingProxy() {
  return new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype");
    }
  });
}

function normalizeTranslation(shape) {
  const vertices = shape.flatMap((key) => (
    key.split("|").map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    })
  ));
  const minX = Math.min(...vertices.map(({ x }) => x));
  const minY = Math.min(...vertices.map(({ y }) => y));
  return geometry.transformShape(
    shape,
    pose({ tx: -minX, ty: -minY })
  ).join(";");
}

test("exports the exact recursively frozen geometry contract", () => {
  assert.deepEqual(Object.keys(geometry), [
    "CONSTANTS",
    "PIECE_IDS",
    "PIECE_GROUPS",
    "canonicalVertex",
    "triangleArea2",
    "canonicalTriangle",
    "canonicalShape",
    "transformVertex",
    "transformShape",
    "coverageShape",
    "intersectShape",
    "isSubsetShape",
    "unionShapes",
    "fingerprintShape",
    "getPieceTemplate",
    "validatePieceTemplates",
    "validateTarget"
  ]);
  assert.deepEqual(geometry.CONSTANTS, {
    VERSION: 1,
    ATOMIC_AREA2: 1,
    COVERAGE_CELLS_PER_ATOM: 2,
    QUARTER_TURNS: 4,
    TOTAL_CELLS: 16,
    TOTAL_COVERAGE_CELLS: 32,
    MAX_COORDINATE: 1000000
  });
  assert.deepEqual(geometry.PIECE_IDS, [
    "large-a",
    "large-b",
    "medium",
    "small-a",
    "small-b",
    "square",
    "parallelogram"
  ]);
  assert.deepEqual(geometry.PIECE_GROUPS, {
    fine: ["large-a", "medium", "small-a", "small-b"],
    bold: ["large-b", "square", "parallelogram"]
  });
  assertDeepFrozen(geometry);
});

test("classic browser wrapper matches CommonJS without polluting Node global", () => {
  assert.equal(Object.hasOwn(globalThis, "SevenPieceDuetGeometry"), false);
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(modulePath, "utf8"), sandbox, {
    filename: "geometry.js"
  });
  assert.deepEqual(
    Object.keys(sandbox.window.SevenPieceDuetGeometry),
    Object.keys(geometry)
  );
  assert.equal(
    sandbox.window.SevenPieceDuetGeometry.CONSTANTS.TOTAL_CELLS,
    16
  );
  assertDeepFrozen(sandbox.window.SevenPieceDuetGeometry);
});

test("canonicalVertex accepts only exact safe integer data records", () => {
  const input = { x: -10, y: 12 };
  const result = geometry.canonicalVertex(input);
  assert.deepEqual(result, input);
  assert.notEqual(result, input);
  assertDeepFrozen(result);

  for (const invalid of [
    null,
    [],
    { x: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0.5, y: 0 },
    { x: NaN, y: 0 },
    { x: Infinity, y: 0 },
    { x: "0", y: 0 },
    { x: geometry.CONSTANTS.MAX_COORDINATE + 1, y: 0 },
    Object.assign(Object.create(null), { x: 0, y: 0 }),
    Object.assign(Object.create({ inherited: true }), { x: 0, y: 0 }),
    throwingProxy()
  ]) {
    assert.throws(() => geometry.canonicalVertex(invalid), TypeError);
  }
});

test("descriptor snapshots reject accessors and never invoke getters", () => {
  let reads = 0;
  const accessor = {};
  Object.defineProperties(accessor, {
    x: {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error("must not run");
      }
    },
    y: {
      enumerable: true,
      value: 0
    }
  });
  assert.throws(() => geometry.canonicalVertex(accessor), TypeError);
  assert.equal(reads, 0);

  let proxyGets = 0;
  const proxy = new Proxy({ x: 0, y: 0 }, {
    get(target, property, receiver) {
      proxyGets += 1;
      return Reflect.get(target, property, receiver);
    }
  });
  assert.deepEqual(geometry.canonicalVertex(proxy), { x: 0, y: 0 });
  assert.equal(proxyGets, 0);
});

test("atomic triangle canonicalization is permutation-invariant and numerically sorted", () => {
  const vertices = atomicAt(0, 0);
  const expected = "0,0|0,1|1,0";
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0]
  ];
  for (const order of permutations) {
    assert.equal(
      geometry.canonicalTriangle(order.map((index) => vertices[index])),
      expected
    );
  }
  assert.equal(
    geometry.canonicalTriangle(atomicAt(0, 9)),
    "0,9|0,10|1,9"
  );
  assert.equal(geometry.triangleArea2(vertices), 1);
  assert.equal(
    geometry.triangleArea2([vertices[0], vertices[2], vertices[1]]),
    -1
  );
});

test("triangle functions reject malformed arrays, non-atomic area and overflow", () => {
  const sparse = new Array(3);
  sparse[0] = { x: 0, y: 0 };
  sparse[2] = { x: 0, y: 1 };
  const extra = atomicAt(0, 0);
  extra.extra = true;
  const symbol = atomicAt(0, 0);
  symbol[Symbol("extra")] = true;
  class VertexArray extends Array {}

  for (const invalid of [
    null,
    {},
    [],
    atomicAt(0, 0).slice(0, 2),
    [...atomicAt(0, 0), { x: 1, y: 1 }],
    sparse,
    extra,
    symbol,
    new VertexArray(...atomicAt(0, 0)),
    triangle([0, 0], [0, 0], [1, 0]),
    triangle([0, 0], [1, 0], [2, 0]),
    triangle([0, 0], [2, 0], [0, 1]),
    triangle([0, 0], [2, 1], [1, 1])
  ]) {
    assert.throws(() => geometry.canonicalTriangle(invalid));
  }

  const max = geometry.CONSTANTS.MAX_COORDINATE;
  assert.throws(
    () => geometry.triangleArea2(triangle([max, 0], [-max, 0], [max, 1])),
    RangeError
  );
});

test("canonicalShape deduplicates, owns and numerically orders atomic triangles", () => {
  const first = atomicAt(0, 9);
  const second = atomicAt(-1, -1);
  const input = [first, second, first];
  const result = geometry.canonicalShape(input);
  assert.deepEqual(result, [
    "-1,-1|-1,0|0,-1",
    "0,9|0,10|1,9"
  ]);
  assertDeepFrozen(result);

  first[0].x = 999;
  input.push(atomicAt(4, 4));
  assert.deepEqual(result, [
    "-1,-1|-1,0|0,-1",
    "0,9|0,10|1,9"
  ]);

  const sparse = new Array(1);
  assert.throws(() => geometry.canonicalShape(sparse), TypeError);
  assert.throws(
    () => geometry.canonicalShape(Object.assign([atomicAt(0, 0)], { extra: 1 })),
    TypeError
  );
});

test("exact transforms follow mirror then quarter-turn then translation", () => {
  const vertex = { x: 2, y: 1 };
  assert.deepEqual(
    geometry.transformVertex(vertex, pose({
      tx: 5,
      ty: -2,
      quarterTurns: 1,
      flipped: true
    })),
    { x: 4, y: -4 }
  );
  assert.deepEqual(vertex, { x: 2, y: 1 });

  const base = geometry.canonicalShape([atomicAt(0, 0)]);
  let transformed = base;
  for (let index = 0; index < 4; index += 1) {
    transformed = geometry.transformShape(transformed, pose({
      quarterTurns: 1
    }));
  }
  assert.deepEqual(transformed, base);

  for (const invalid of [
    pose({ quarterTurns: -1 }),
    pose({ quarterTurns: 4 }),
    pose({ quarterTurns: 1.5 }),
    pose({ tx: 1.5 }),
    pose({ flipped: 1 }),
    { ...pose(), extra: true },
    throwingProxy()
  ]) {
    assert.throws(() => geometry.transformVertex(vertex, invalid));
  }

  const max = geometry.CONSTANTS.MAX_COORDINATE;
  assert.throws(
    () => geometry.transformVertex({ x: max, y: 0 }, pose({ tx: 1 })),
    RangeError
  );
});

test("coverage cells expose exact quarter-square occupancy without aliasing", () => {
  const source = geometry.canonicalShape([atomicAt(0, 0)]);
  const coverage = geometry.coverageShape(source);
  assert.equal(coverage.length, 2);
  assert.equal(new Set(coverage).size, 2);
  assertDeepFrozen(coverage);
  assert.notEqual(coverage, source);
});

test("shape set operations use geometric coverage, not triangle key equality", () => {
  const a = geometry.canonicalShape([atomicAt(0, 0), atomicAt(1, 0)]);
  const b = geometry.canonicalShape([atomicAt(1, 0), atomicAt(2, 0)]);
  const intersection = geometry.intersectShape(a, b);
  assert.deepEqual(intersection, geometry.coverageShape([atomicAt(1, 0)]));
  assert.equal(geometry.isSubsetShape(intersection, a), true);
  assert.equal(geometry.isSubsetShape(a, intersection), false);

  const union = geometry.unionShapes([a, b]);
  assert.equal(union.length, 6);
  assertDeepFrozen(intersection);
  assertDeepFrozen(union);
  assert.notEqual(union, a);
  assert.notEqual(union, b);

  const lowerLeft = geometry.canonicalShape([
    triangle([0, 0], [1, 0], [0, 1])
  ]);
  const lowerRight = geometry.canonicalShape([
    triangle([0, 0], [1, 0], [1, 1])
  ]);
  assert.notDeepEqual(lowerLeft, lowerRight);
  assert.equal(geometry.intersectShape(lowerLeft, lowerRight).length, 1);
  assert.equal(geometry.isSubsetShape(lowerLeft, lowerRight), false);
});

test("D4 fingerprint is invariant under translation, quarter-turn and mirror", () => {
  const shape = geometry.canonicalShape([
    atomicAt(0, 0),
    atomicAt(1, 0),
    triangle([1, 0], [2, 1], [1, 1])
  ]);
  const fingerprint = geometry.fingerprintShape(shape);
  for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
    for (const flipped of [false, true]) {
      const transformed = geometry.transformShape(
        shape,
        pose({ tx: 19, ty: -23, quarterTurns, flipped })
      );
      assert.equal(geometry.fingerprintShape(transformed), fingerprint);
    }
  }
});

test("D4 fingerprint describes the outline rather than internal triangulation", () => {
  const descendingDiagonal = geometry.canonicalShape([
    triangle([0, 0], [1, 0], [0, 1]),
    triangle([1, 0], [1, 1], [0, 1])
  ]);
  const ascendingDiagonal = geometry.canonicalShape([
    triangle([0, 0], [1, 0], [1, 1]),
    triangle([0, 0], [1, 1], [0, 1])
  ]);
  assert.notDeepEqual(descendingDiagonal, ascendingDiagonal);
  assert.deepEqual(
    geometry.coverageShape(descendingDiagonal),
    geometry.coverageShape(ascendingDiagonal)
  );
  assert.equal(
    geometry.fingerprintShape(descendingDiagonal),
    geometry.fingerprintShape(ascendingDiagonal)
  );
});

test("seven independently derived templates have exact cells and equal groups", () => {
  const expectedCells = {
    "large-a": 4,
    "large-b": 4,
    medium: 2,
    "small-a": 1,
    "small-b": 1,
    square: 2,
    parallelogram: 2
  };
  for (const pieceId of geometry.PIECE_IDS) {
    const template = geometry.getPieceTemplate(pieceId);
    assert.equal(template.length, expectedCells[pieceId]);
    assert.equal(new Set(template).size, template.length);
    assertDeepFrozen(template);
  }
  assert.deepEqual(geometry.validatePieceTemplates(), {
    valid: true,
    errors: [],
    pieceCells: expectedCells,
    groupCells: { fine: 8, bold: 8 },
    totalCells: 16
  });
});

test("template reads never expose internal ownership", () => {
  const first = geometry.getPieceTemplate("large-a");
  const second = geometry.getPieceTemplate("large-a");
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.throws(() => geometry.getPieceTemplate("missing"), RangeError);
});

test("parallelogram flip is not reachable by quarter-turn plus translation", () => {
  const template = geometry.getPieceTemplate("parallelogram");
  const flipped = geometry.transformShape(template, pose({ flipped: true }));
  const normalizedFlipped = normalizeTranslation(flipped);

  for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
    assert.notEqual(
      normalizeTranslation(
        geometry.transformShape(template, pose({ quarterTurns }))
      ),
      normalizedFlipped
    );
  }
});

test("one thousand fixed integer poses preserve every template cell count", () => {
  for (let index = 0; index < 1000; index += 1) {
    const pieceId = geometry.PIECE_IDS[index % geometry.PIECE_IDS.length];
    const template = geometry.getPieceTemplate(pieceId);
    const transformed = geometry.transformShape(template, pose({
      tx: (index % 31) - 15,
      ty: (Math.floor(index / 31) % 31) - 15,
      quarterTurns: index % 4,
      flipped: pieceId === "parallelogram" && index % 2 === 1
    }));
    assert.equal(transformed.length, template.length);
  }
});

test("production geometry stays free of DOM, network, storage, random and trig", () => {
  const source = readFileSync(modulePath, "utf8");
  const forbidden = [
    /\bdocument\b/u,
    /\bwindow\.(?:fetch|localStorage|sessionStorage)\b/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\bindexedDB\b/u,
    /\bMath\.random\b/u,
    /\bMath\.(?:sin|cos|tan)\b/u
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});
