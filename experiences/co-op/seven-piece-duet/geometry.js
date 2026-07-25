(function attachSevenPieceDuetGeometry(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  } else if (root) {
    root.SevenPieceDuetGeometry = api;
  }
}(typeof window === "object" ? window : null, function createGeometry() {
  "use strict";

  const CONSTANTS = {
    VERSION: 1,
    ATOMIC_AREA2: 1,
    COVERAGE_CELLS_PER_ATOM: 2,
    QUARTER_TURNS: 4,
    TOTAL_CELLS: 16,
    TOTAL_COVERAGE_CELLS: 32,
    MAX_COORDINATE: 1000000
  };
  const PIECE_IDS = [
    "large-a",
    "large-b",
    "medium",
    "small-a",
    "small-b",
    "square",
    "parallelogram"
  ];
  const PIECE_GROUPS = {
    fine: ["large-a", "medium", "small-a", "small-b"],
    bold: ["large-b", "square", "parallelogram"]
  };

  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
    ) {
      return value;
    }
    const visited = seen || new Set();
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

  function failType(message) {
    throw new TypeError(message);
  }

  function snapshotRecord(value, expectedKeys, label) {
    let prototype;
    let keys;
    try {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        failType(`${label} must be a plain data record`);
      }
      prototype = Object.getPrototypeOf(value);
      keys = Reflect.ownKeys(value);
    } catch (error) {
      if (error instanceof TypeError) throw error;
      failType(`${label} must be inspectable`);
    }
    if (prototype !== Object.prototype) {
      failType(`${label} must have Object.prototype`);
    }
    if (
      keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
    ) {
      failType(`${label} has unexpected fields`);
    }
    const result = {};
    for (const key of expectedKeys) {
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(value, key);
      } catch {
        failType(`${label}.${key} must be inspectable`);
      }
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        failType(`${label}.${key} must be a data property`);
      }
      result[key] = descriptor.value;
    }
    return result;
  }

  function snapshotArray(value, label) {
    let prototype;
    let keys;
    try {
      if (!Array.isArray(value)) failType(`${label} must be an array`);
      prototype = Object.getPrototypeOf(value);
      keys = Reflect.ownKeys(value);
    } catch (error) {
      if (error instanceof TypeError) throw error;
      failType(`${label} must be inspectable`);
    }
    if (prototype !== Array.prototype) {
      failType(`${label} must be an ordinary array`);
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")) {
      failType(`${label}.length must be a data property`);
    }
    const length = lengthDescriptor.value;
    const expectedKeys = Array.from({ length }, (_, index) => String(index));
    expectedKeys.push("length");
    if (
      keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
    ) {
      failType(`${label} must be dense and have no extra fields`);
    }
    const result = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        failType(`${label}[${index}] must be a data property`);
      }
      result.push(descriptor.value);
    }
    return result;
  }

  function checkedInteger(value, label) {
    if (!Number.isSafeInteger(value)) failType(`${label} must be a safe integer`);
    if (Math.abs(value) > CONSTANTS.MAX_COORDINATE) {
      throw new RangeError(`${label} is outside the coordinate limit`);
    }
    return value;
  }

  function checkedDelta(left, right, label) {
    return checkedInteger(left - right, label);
  }

  function checkedAdd(left, right, label) {
    return checkedInteger(left + right, label);
  }

  function canonicalVertex(vertex) {
    const snapshot = snapshotRecord(vertex, ["x", "y"], "vertex");
    return deepFreeze({
      x: checkedInteger(snapshot.x, "vertex.x"),
      y: checkedInteger(snapshot.y, "vertex.y")
    });
  }

  function snapshotVertices(vertices) {
    const snapshot = snapshotArray(vertices, "triangle");
    if (snapshot.length !== 3) failType("triangle must contain three vertices");
    return snapshot.map(canonicalVertex);
  }

  function triangleArea2(vertices) {
    const [a, b, c] = snapshotVertices(vertices);
    const abX = checkedDelta(b.x, a.x, "triangle delta x");
    const abY = checkedDelta(b.y, a.y, "triangle delta y");
    const acX = checkedDelta(c.x, a.x, "triangle delta x");
    const acY = checkedDelta(c.y, a.y, "triangle delta y");
    const left = abX * acY;
    const right = abY * acX;
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
      throw new RangeError("triangle area intermediate is unsafe");
    }
    const area = left - right;
    if (!Number.isSafeInteger(area)) {
      throw new RangeError("triangle area is unsafe");
    }
    return area;
  }

  function comparePoints(left, right) {
    if (left.x !== right.x) return left.x < right.x ? -1 : 1;
    if (left.y !== right.y) return left.y < right.y ? -1 : 1;
    return 0;
  }

  function canonicalTriangle(vertices) {
    const points = snapshotVertices(vertices);
    if (Math.abs(triangleArea2(points)) !== CONSTANTS.ATOMIC_AREA2) {
      failType("triangle must have doubled area one");
    }
    const xs = points.map(({ x }) => x);
    const ys = points.map(({ y }) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX - minX !== 1 || maxY - minY !== 1) {
      failType("triangle must be one half of an integer unit square");
    }
    const cornerKeys = new Set(points.map(({ x, y }) => `${x},${y}`));
    if (cornerKeys.size !== 3) failType("triangle vertices must be distinct");
    return [...points]
      .sort(comparePoints)
      .map(({ x, y }) => `${x},${y}`)
      .join("|");
  }

  function parsePointKey(key, label) {
    if (typeof key !== "string" || !/^-?\d+,-?\d+$/u.test(key)) {
      failType(`${label} has an invalid point`);
    }
    const [xText, yText] = key.split(",");
    const point = { x: Number(xText), y: Number(yText) };
    checkedInteger(point.x, `${label}.x`);
    checkedInteger(point.y, `${label}.y`);
    if (`${point.x},${point.y}` !== key) {
      failType(`${label} point is not canonical`);
    }
    return point;
  }

  function parseTriangleKey(key) {
    if (typeof key !== "string" || key.startsWith("q:")) {
      failType("triangle key must be a canonical string");
    }
    const points = key.split("|").map((part) => (
      parsePointKey(part, "triangle key")
    ));
    if (points.length !== 3 || canonicalTriangle(points) !== key) {
      failType("triangle key is not canonical");
    }
    return points;
  }

  function compareTriangleKeys(left, right) {
    const leftPoints = left.split("|").map((point) => point.split(",").map(Number));
    const rightPoints = right.split("|").map((point) => point.split(",").map(Number));
    for (let index = 0; index < 3; index += 1) {
      if (leftPoints[index][0] !== rightPoints[index][0]) {
        return leftPoints[index][0] < rightPoints[index][0] ? -1 : 1;
      }
      if (leftPoints[index][1] !== rightPoints[index][1]) {
        return leftPoints[index][1] < rightPoints[index][1] ? -1 : 1;
      }
    }
    return 0;
  }

  function canonicalShape(triangles) {
    const snapshot = snapshotArray(triangles, "shape");
    const keys = snapshot.map((entry) => (
      typeof entry === "string"
        ? (parseTriangleKey(entry), entry)
        : canonicalTriangle(entry)
    ));
    return deepFreeze([...new Set(keys)].sort(compareTriangleKeys));
  }

  function snapshotPose(pose) {
    const snapshot = snapshotRecord(
      pose,
      ["tx", "ty", "quarterTurns", "flipped"],
      "pose"
    );
    checkedInteger(snapshot.tx, "pose.tx");
    checkedInteger(snapshot.ty, "pose.ty");
    if (
      !Number.isInteger(snapshot.quarterTurns)
      || snapshot.quarterTurns < 0
      || snapshot.quarterTurns >= CONSTANTS.QUARTER_TURNS
    ) {
      failType("pose.quarterTurns must be an integer from zero through three");
    }
    if (typeof snapshot.flipped !== "boolean") {
      failType("pose.flipped must be boolean");
    }
    return snapshot;
  }

  function transformVertex(vertex, pose) {
    const point = canonicalVertex(vertex);
    const transform = snapshotPose(pose);
    let x = transform.flipped ? -point.x : point.x;
    let y = point.y;
    for (let turn = 0; turn < transform.quarterTurns; turn += 1) {
      const nextX = -y;
      y = x;
      x = nextX;
    }
    return deepFreeze({
      x: checkedAdd(x, transform.tx, "transformed x"),
      y: checkedAdd(y, transform.ty, "transformed y")
    });
  }

  function transformShape(shape, pose) {
    const canonical = canonicalShape(shape);
    const transform = snapshotPose(pose);
    return canonicalShape(canonical.map((key) => (
      parseTriangleKey(key).map((vertex) => transformVertex(vertex, transform))
    )));
  }

  function canonicalMicroTriangle(points) {
    return points
      .map(({ x, y }) => ({ x, y }))
      .sort(comparePoints)
      .map(({ x, y }) => `${x},${y}`)
      .join("|");
  }

  function coverageForTriangle(key) {
    const points = parseTriangleKey(key);
    const minX = Math.min(...points.map(({ x }) => x));
    const minY = Math.min(...points.map(({ y }) => y));
    const doubledCorners = [
      { x: 2 * minX, y: 2 * minY },
      { x: 2 * (minX + 1), y: 2 * minY },
      { x: 2 * (minX + 1), y: 2 * (minY + 1) },
      { x: 2 * minX, y: 2 * (minY + 1) }
    ];
    const original = new Set(points.map(({ x, y }) => `${x},${y}`));
    const center = { x: 2 * minX + 1, y: 2 * minY + 1 };
    const wedges = [];
    for (let side = 0; side < 4; side += 1) {
      const first = doubledCorners[side];
      const second = doubledCorners[(side + 1) % 4];
      const firstOriginal = `${first.x / 2},${first.y / 2}`;
      const secondOriginal = `${second.x / 2},${second.y / 2}`;
      if (original.has(firstOriginal) && original.has(secondOriginal)) {
        wedges.push(`q:${canonicalMicroTriangle([first, second, center])}`);
      }
    }
    if (wedges.length !== CONSTANTS.COVERAGE_CELLS_PER_ATOM) {
      throw new RangeError("atomic triangle must cover exactly two micro cells");
    }
    return wedges;
  }

  function compareMicroKeys(left, right) {
    return compareTriangleKeys(left.slice(2), right.slice(2));
  }

  function parseCoverageKey(key) {
    if (typeof key !== "string" || !key.startsWith("q:")) {
      failType("coverage key must be canonical");
    }
    const body = key.slice(2);
    const points = body.split("|").map((part) => parsePointKey(part, "coverage key"));
    if (points.length !== 3 || canonicalMicroTriangle(points) !== body) {
      failType("coverage key is not canonical");
    }
    return points;
  }

  function coverageShape(shape) {
    const canonical = canonicalShape(shape);
    const coverage = canonical.flatMap(coverageForTriangle);
    return deepFreeze([...new Set(coverage)].sort(compareMicroKeys));
  }

  function toCoverage(shape, label) {
    const snapshot = snapshotArray(shape, label);
    if (snapshot.every((entry) => (
      typeof entry === "string" && entry.startsWith("q:")
    ))) {
      const keys = snapshot.map((entry) => {
        parseCoverageKey(entry);
        return entry;
      });
      return deepFreeze([...new Set(keys)].sort(compareMicroKeys));
    }
    return coverageShape(snapshot);
  }

  function intersectShape(left, right) {
    const leftCoverage = toCoverage(left, "left shape");
    const rightSet = new Set(toCoverage(right, "right shape"));
    return deepFreeze(leftCoverage.filter((key) => rightSet.has(key)));
  }

  function isSubsetShape(candidate, target) {
    const targetSet = new Set(toCoverage(target, "target shape"));
    return toCoverage(candidate, "candidate shape").every((key) => (
      targetSet.has(key)
    ));
  }

  function unionShapes(shapes) {
    const snapshot = snapshotArray(shapes, "shapes");
    const keys = snapshot.flatMap((shape, index) => (
      toCoverage(shape, `shapes[${index}]`)
    ));
    return deepFreeze([...new Set(keys)].sort(compareMicroKeys));
  }

  function canonicalEdge(first, second) {
    const [a, b] = [first, second].sort(comparePoints);
    return `${a.x},${a.y}>${b.x},${b.y}`;
  }

  function parseEdge(key) {
    return key.split(">").map((part) => parsePointKey(part, "edge"));
  }

  function compareEdges(left, right) {
    const leftPoints = parseEdge(left);
    const rightPoints = parseEdge(right);
    for (let index = 0; index < 2; index += 1) {
      const order = comparePoints(leftPoints[index], rightPoints[index]);
      if (order !== 0) return order;
    }
    return 0;
  }

  function outlineEdges(shape) {
    const counts = new Map();
    for (const key of coverageShape(shape)) {
      const points = parseCoverageKey(key);
      for (let index = 0; index < 3; index += 1) {
        const edge = canonicalEdge(points[index], points[(index + 1) % 3]);
        counts.set(edge, (counts.get(edge) || 0) + 1);
      }
    }
    const boundary = [];
    for (const [edge, count] of counts) {
      if (count === 1) boundary.push(edge);
      else if (count !== 2) throw new RangeError("outline has invalid edge overlap");
    }
    return boundary.sort(compareEdges);
  }

  function transformRawPoint(point, quarterTurns, flipped) {
    let x = flipped ? -point.x : point.x;
    let y = point.y;
    for (let turn = 0; turn < quarterTurns; turn += 1) {
      const nextX = -y;
      y = x;
      x = nextX;
    }
    return { x, y };
  }

  function fingerprintShape(shape) {
    const boundary = outlineEdges(shape);
    const variants = [];
    for (const flipped of [false, true]) {
      for (let quarterTurns = 0; quarterTurns < 4; quarterTurns += 1) {
        const transformed = boundary.map((edge) => (
          parseEdge(edge).map((point) => (
            transformRawPoint(point, quarterTurns, flipped)
          ))
        ));
        const allPoints = transformed.flat();
        const minX = allPoints.length
          ? Math.min(...allPoints.map(({ x }) => x))
          : 0;
        const minY = allPoints.length
          ? Math.min(...allPoints.map(({ y }) => y))
          : 0;
        variants.push(
          transformed
            .map(([first, second]) => canonicalEdge(
              { x: first.x - minX, y: first.y - minY },
              { x: second.x - minX, y: second.y - minY }
            ))
            .sort(compareEdges)
            .join(";")
        );
      }
    }
    return variants.sort()[0];
  }

  function triangle(a, b, c) {
    return [
      { x: a[0], y: a[1] },
      { x: b[0], y: b[1] },
      { x: c[0], y: c[1] }
    ];
  }

  const large = canonicalShape([
    triangle([0, 0], [1, 0], [0, 1]),
    triangle([1, 0], [1, 1], [0, 1]),
    triangle([1, 0], [2, 0], [1, 1]),
    triangle([0, 1], [1, 1], [0, 2])
  ]);
  const templates = {
    "large-a": large,
    "large-b": large,
    medium: canonicalShape([
      triangle([0, 0], [1, 1], [0, 1]),
      triangle([0, 0], [0, 1], [-1, 1])
    ]),
    "small-a": canonicalShape([
      triangle([0, 0], [1, 0], [0, 1])
    ]),
    "small-b": canonicalShape([
      triangle([0, 0], [1, 0], [0, 1])
    ]),
    square: canonicalShape([
      triangle([0, 0], [1, 0], [0, 1]),
      triangle([1, 0], [1, 1], [0, 1])
    ]),
    parallelogram: canonicalShape([
      triangle([0, 0], [1, 0], [1, 1]),
      triangle([1, 0], [2, 1], [1, 1])
    ])
  };
  deepFreeze(templates);

  function getPieceTemplate(pieceId) {
    if (typeof pieceId !== "string" || !Object.hasOwn(templates, pieceId)) {
      throw new RangeError("unknown piece id");
    }
    return deepFreeze([...templates[pieceId]]);
  }

  function validatePieceTemplates() {
    const pieceCells = {};
    for (const pieceId of PIECE_IDS) {
      pieceCells[pieceId] = templates[pieceId].length;
    }
    const groupCells = {};
    for (const [group, ids] of Object.entries(PIECE_GROUPS)) {
      groupCells[group] = ids.reduce((sum, pieceId) => (
        sum + pieceCells[pieceId]
      ), 0);
    }
    const totalCells = Object.values(pieceCells).reduce(
      (sum, count) => sum + count,
      0
    );
    const errors = [];
    if (totalCells !== CONSTANTS.TOTAL_CELLS) {
      errors.push("piece templates do not contain sixteen cells");
    }
    if (groupCells.fine !== 8 || groupCells.bold !== 8) {
      errors.push("piece groups do not have equal area");
    }
    return deepFreeze({
      valid: errors.length === 0,
      errors,
      pieceCells,
      groupCells,
      totalCells
    });
  }

  function validateTarget(target) {
    const errors = [];
    try {
      const snapshot = snapshotRecord(
        target,
        ["id", "title", "board", "cells", "solution", "fingerprint"],
        "target"
      );
      if (typeof snapshot.id !== "string" || snapshot.id.length === 0) {
        errors.push("target id must be non-empty");
      }
      if (typeof snapshot.title !== "string" || snapshot.title.length === 0) {
        errors.push("target title must be non-empty");
      }
      const board = snapshotRecord(
        snapshot.board,
        ["minX", "minY", "maxX", "maxY"],
        "target.board"
      );
      for (const key of ["minX", "minY", "maxX", "maxY"]) {
        checkedInteger(board[key], `target.board.${key}`);
      }
      if (board.minX >= board.maxX || board.minY >= board.maxY) {
        errors.push("target board bounds must be increasing");
      }
      const rawCells = snapshotArray(snapshot.cells, "target.cells");
      const cells = canonicalShape(rawCells);
      if (
        rawCells.length !== CONSTANTS.TOTAL_CELLS
        || cells.length !== CONSTANTS.TOTAL_CELLS
      ) {
        errors.push("target must contain sixteen unique atomic cells");
      }
      const targetCoverage = coverageShape(cells);
      if (targetCoverage.length !== CONSTANTS.TOTAL_COVERAGE_CELLS) {
        errors.push("target cells have positive-area overlap");
      }
      for (const cell of cells) {
        for (const { x, y } of parseTriangleKey(cell)) {
          if (
            x < board.minX || x > board.maxX
            || y < board.minY || y > board.maxY
          ) {
            errors.push("target cell is outside board bounds");
          }
        }
      }
      const solution = snapshotRecord(
        snapshot.solution,
        PIECE_IDS,
        "target.solution"
      );
      const placed = PIECE_IDS.map((pieceId) => {
        const placedShape = transformShape(
          templates[pieceId],
          snapshotPose(solution[pieceId])
        );
        if (!isSubsetShape(placedShape, cells)) {
          errors.push(`solution piece ${pieceId} is outside target`);
        }
        return placedShape;
      });
      const placedCoverage = unionShapes(placed);
      if (
        placedCoverage.length !== CONSTANTS.TOTAL_COVERAGE_CELLS
        || placedCoverage.some((key, index) => key !== targetCoverage[index])
      ) {
        errors.push("solution does not exactly cover target");
      }
      if (
        typeof snapshot.fingerprint !== "string"
        || snapshot.fingerprint !== fingerprintShape(cells)
      ) {
        errors.push("target fingerprint does not match outline");
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "target is invalid");
    }
    return deepFreeze({ valid: errors.length === 0, errors });
  }

  return deepFreeze({
    CONSTANTS,
    PIECE_IDS,
    PIECE_GROUPS,
    canonicalVertex,
    triangleArea2,
    canonicalTriangle,
    canonicalShape,
    transformVertex,
    transformShape,
    coverageShape,
    intersectShape,
    isSubsetShape,
    unionShapes,
    fingerprintShape,
    getPieceTemplate,
    validatePieceTemplates,
    validateTarget
  });
}));
