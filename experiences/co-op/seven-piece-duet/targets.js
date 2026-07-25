(function attachSevenPieceDuetTargets(root, factory) {
  "use strict";

  const geometry = typeof module === "object" && module && module.exports
    ? require("./geometry.js")
    : root && root.SevenPieceDuetGeometry;
  const api = factory(geometry);
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  } else if (root) {
    root.SevenPieceDuetTargets = api;
  }
}(typeof window === "object" ? window : null, function createTargets(geometry) {
  "use strict";

  if (!geometry) throw new Error("SevenPieceDuetGeometry is required");

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

  const BLUEPRINTS = [
    {
      id: "embrace",
      title: "相拥",
      solution: {
        "large-a": { tx: 0, ty: 0, quarterTurns: 0, flipped: false },
        "large-b": { tx: 0, ty: -1, quarterTurns: 1, flipped: false },
        medium: { tx: -2, ty: -2, quarterTurns: 0, flipped: false },
        "small-a": { tx: -3, ty: -2, quarterTurns: 0, flipped: false },
        "small-b": { tx: 1, ty: 0, quarterTurns: 3, flipped: false },
        square: { tx: 0, ty: -1, quarterTurns: 0, flipped: false },
        parallelogram: { tx: -2, ty: -2, quarterTurns: 0, flipped: false }
      }
    },
    {
      id: "side-by-side",
      title: "并肩",
      solution: {
        "large-a": { tx: 0, ty: 0, quarterTurns: 0, flipped: false },
        "large-b": { tx: 0, ty: -1, quarterTurns: 1, flipped: false },
        medium: { tx: -2, ty: -2, quarterTurns: 0, flipped: false },
        "small-a": { tx: -3, ty: -2, quarterTurns: 0, flipped: false },
        "small-b": { tx: -3, ty: -2, quarterTurns: 1, flipped: false },
        square: { tx: 0, ty: -1, quarterTurns: 0, flipped: false },
        parallelogram: { tx: 3, ty: -1, quarterTurns: 0, flipped: true }
      }
    },
    {
      id: "echo",
      title: "回响",
      solution: {
        "large-a": { tx: 0, ty: 0, quarterTurns: 0, flipped: false },
        "large-b": { tx: 0, ty: -1, quarterTurns: 1, flipped: false },
        medium: { tx: -2, ty: -2, quarterTurns: 0, flipped: false },
        "small-a": { tx: -3, ty: -2, quarterTurns: 0, flipped: false },
        "small-b": { tx: 1, ty: 0, quarterTurns: 3, flipped: false },
        square: { tx: 0, ty: -1, quarterTurns: 0, flipped: false },
        parallelogram: { tx: 0, ty: 2, quarterTurns: 1, flipped: true }
      }
    },
    {
      id: "interlock",
      title: "相扣",
      solution: {
        "large-a": { tx: 0, ty: 0, quarterTurns: 0, flipped: false },
        "large-b": { tx: 0, ty: -1, quarterTurns: 1, flipped: false },
        medium: { tx: -2, ty: -2, quarterTurns: 0, flipped: false },
        "small-a": { tx: -3, ty: -2, quarterTurns: 0, flipped: false },
        "small-b": { tx: 2, ty: 0, quarterTurns: 2, flipped: false },
        square: { tx: -1, ty: -2, quarterTurns: 0, flipped: false },
        parallelogram: { tx: 2, ty: -2, quarterTurns: 1, flipped: false }
      }
    }
  ];

  function parseVertices(key) {
    return key.split("|").map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
  }

  function buildTarget(blueprint) {
    const cells = geometry.canonicalShape(
      geometry.PIECE_IDS.flatMap((pieceId) => (
        geometry.transformShape(
          geometry.getPieceTemplate(pieceId),
          blueprint.solution[pieceId]
        )
      ))
    );
    const vertices = cells.flatMap(parseVertices);
    const board = {
      minX: Math.min(...vertices.map(({ x }) => x)) - 1,
      minY: Math.min(...vertices.map(({ y }) => y)) - 1,
      maxX: Math.max(...vertices.map(({ x }) => x)) + 1,
      maxY: Math.max(...vertices.map(({ y }) => y)) + 1
    };
    return deepFreeze({
      id: blueprint.id,
      title: blueprint.title,
      board,
      cells,
      solution: blueprint.solution,
      fingerprint: geometry.fingerprintShape(cells)
    });
  }

  const TARGETS = deepFreeze(BLUEPRINTS.map(buildTarget));
  const ROUND_SCHEDULE = deepFreeze([
    { roundIndex: 0, targetId: "embrace", fineSeat: "A", boldSeat: "B" },
    { roundIndex: 1, targetId: "side-by-side", fineSeat: "B", boldSeat: "A" },
    { roundIndex: 2, targetId: "echo", fineSeat: "A", boldSeat: "B" },
    { roundIndex: 3, targetId: "interlock", fineSeat: "B", boldSeat: "A" }
  ]);

  function clonePose(pose) {
    return {
      tx: pose.tx,
      ty: pose.ty,
      quarterTurns: pose.quarterTurns,
      flipped: pose.flipped
    };
  }

  function cloneTarget(target) {
    const solution = {};
    for (const pieceId of geometry.PIECE_IDS) {
      solution[pieceId] = clonePose(target.solution[pieceId]);
    }
    return deepFreeze({
      id: target.id,
      title: target.title,
      board: { ...target.board },
      cells: [...target.cells],
      solution,
      fingerprint: target.fingerprint
    });
  }

  function getTargets() {
    return deepFreeze(TARGETS.map(cloneTarget));
  }

  function getTargetById(id) {
    if (typeof id !== "string") return null;
    const target = TARGETS.find((candidate) => candidate.id === id);
    return target ? cloneTarget(target) : null;
  }

  function getRoundSchedule() {
    return deepFreeze(ROUND_SCHEDULE.map((round) => ({ ...round })));
  }

  function validateAllTargets() {
    const reports = TARGETS.map((target) => ({
      id: target.id,
      ...geometry.validateTarget(target)
    }));
    const fingerprints = new Set(TARGETS.map(({ fingerprint }) => fingerprint));
    const errors = reports.flatMap((report) => (
      report.errors.map((message) => `${report.id}: ${message}`)
    ));
    if (fingerprints.size !== TARGETS.length) {
      errors.push("target outline fingerprints must be unique");
    }
    return deepFreeze({
      valid: errors.length === 0,
      errors,
      reports
    });
  }

  const validation = validateAllTargets();
  if (!validation.valid) {
    throw new Error(`Invalid generated targets: ${validation.errors.join("; ")}`);
  }

  return deepFreeze({
    getTargets,
    getTargetById,
    getRoundSchedule,
    validateAllTargets
  });
}));
