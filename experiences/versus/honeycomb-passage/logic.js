(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  root.HoneycombPassageLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = 1;
  const PLAYER_COUNT = 2;
  const BOARD_RADIUS = 3;
  const BOARD_CELL_COUNT = 37;
  const STARTING_SEALS = 4;
  const MAX_ROUNDS = 16;
  const MAX_PLIES = 32;
  const YELLOW = 0;
  const PURPLE = 1;

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")
      || Object.isFrozen(value)) return value;

    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  const STARTS = deepFreeze([{ q: -3, r: 0 }, { q: 3, r: 0 }]);
  const ACTIONS = deepFreeze(["move", "seal"]);
  const PHASES = deepFreeze(["intro", "playing", "result"]);
  const DIRECTIONS = deepFreeze([
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]);
  const CELL_KEYS = ["q", "r"];
  const EMPTY_CELLS = deepFreeze([]);

  function readCell(value) {
    try {
      if (value === null || typeof value !== "object"
        || Object.getPrototypeOf(value) !== Object.prototype) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== CELL_KEYS.length
        || keys.some((key) => typeof key !== "string" || !CELL_KEYS.includes(key))) return null;

      const qDescriptor = Object.getOwnPropertyDescriptor(value, "q");
      const rDescriptor = Object.getOwnPropertyDescriptor(value, "r");
      if (!qDescriptor || !rDescriptor
        || !Object.hasOwn(qDescriptor, "value") || !Object.hasOwn(rDescriptor, "value")) return null;

      const q = qDescriptor.value;
      const r = rDescriptor.value;
      const s = -q - r;
      if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r) || !Number.isSafeInteger(s)) return null;
      return { q, r, s };
    } catch (_error) {
      return null;
    }
  }

  function isWithinRadius(cell, radius) {
    return Math.max(Math.abs(cell.q), Math.abs(cell.r), Math.abs(cell.s)) <= radius;
  }

  function cellKey(cell) {
    const parsed = readCell(cell);
    if (!parsed || !isWithinRadius(parsed, BOARD_RADIUS)) return null;
    return `${parsed.q},${parsed.r}`;
  }

  function parseCellKey(key) {
    if (typeof key !== "string" || !/^-?(?:0|[1-9]\d*),-?(?:0|[1-9]\d*)$/u.test(key)) return null;
    const parts = key.split(",");
    const cell = { q: Number(parts[0]), r: Number(parts[1]) };
    const canonical = cellKey(cell);
    return canonical === key ? deepFreeze(cell) : null;
  }

  function isCellOnBoard(cell) {
    return cellKey(cell) !== null;
  }

  function createBoard(radius) {
    const requestedRadius = radius === undefined ? BOARD_RADIUS : radius;
    if (!Number.isSafeInteger(requestedRadius)
      || requestedRadius < 0 || requestedRadius > BOARD_RADIUS) return EMPTY_CELLS;

    const cells = [];
    for (let q = -requestedRadius; q <= requestedRadius; q += 1) {
      const minimumR = Math.max(-requestedRadius, -q - requestedRadius);
      const maximumR = Math.min(requestedRadius, -q + requestedRadius);
      for (let r = minimumR; r <= maximumR; r += 1) {
        cells.push({
          q: Object.is(q, -0) ? 0 : q,
          r: Object.is(r, -0) ? 0 : r,
        });
      }
    }
    return deepFreeze(cells);
  }

  function getNeighbors(cell) {
    const parsed = readCell(cell);
    if (!parsed || !isWithinRadius(parsed, BOARD_RADIUS)) return EMPTY_CELLS;

    const neighbors = [];
    for (const direction of DIRECTIONS) {
      const candidate = { q: parsed.q + direction.q, r: parsed.r + direction.r };
      if (isCellOnBoard(candidate)) neighbors.push(candidate);
    }
    return deepFreeze(neighbors);
  }

  function isGoalCell(player, cell) {
    const parsed = readCell(cell);
    if ((player !== YELLOW && player !== PURPLE)
      || !parsed || !isWithinRadius(parsed, BOARD_RADIUS)) return false;
    return player === YELLOW ? parsed.q === BOARD_RADIUS : parsed.q === -BOARD_RADIUS;
  }

  function readBlockedKeys(value, startKey) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== value.length + 1 || !ownKeys.includes("length")) return null;

      const blocked = new Set();
      for (let index = 0; index < value.length; index += 1) {
        const indexKey = String(index);
        if (!ownKeys.includes(indexKey)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, indexKey);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        const key = descriptor.value;
        if (!parseCellKey(key) || key === startKey || blocked.has(key)) return null;
        blocked.add(key);
      }
      return blocked;
    } catch (_error) {
      return null;
    }
  }

  function findShortestDistance(start, player, blockedKeys) {
    try {
      if (player !== YELLOW && player !== PURPLE) return null;
      const parsedStart = readCell(start);
      if (!parsedStart || !isWithinRadius(parsedStart, BOARD_RADIUS)) return null;
      const startCell = { q: parsedStart.q, r: parsedStart.r };
      const startKey = `${parsedStart.q},${parsedStart.r}`;
      const blocked = readBlockedKeys(blockedKeys, startKey);
      if (blocked === null) return null;
      if (isGoalCell(player, startCell)) return 0;

      const queue = [{ q: startCell.q, r: startCell.r, distance: 0 }];
      const visited = new Set([startKey]);
      let cursor = 0;

      while (cursor < queue.length) {
        const current = queue[cursor];
        cursor += 1;
        for (const neighbor of getNeighbors({ q: current.q, r: current.r })) {
          const key = cellKey(neighbor);
          if (visited.has(key) || blocked.has(key)) continue;
          const distance = current.distance + 1;
          if (isGoalCell(player, neighbor)) return distance;
          visited.add(key);
          queue.push({ q: neighbor.q, r: neighbor.r, distance });
        }
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  return deepFreeze({
    VERSION,
    PLAYER_COUNT,
    BOARD_RADIUS,
    BOARD_CELL_COUNT,
    STARTING_SEALS,
    MAX_ROUNDS,
    MAX_PLIES,
    YELLOW,
    PURPLE,
    STARTS,
    ACTIONS,
    PHASES,
    DIRECTIONS,
    cellKey,
    parseCellKey,
    isCellOnBoard,
    createBoard,
    getNeighbors,
    isGoalCell,
    findShortestDistance,
  });
});
