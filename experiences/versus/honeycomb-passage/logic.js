(function (root, factory) {
  "use strict";

  const api = factory(root.HoneycombPassageConfig);
  if (typeof module === "object" && module && module.exports) module.exports = api;
  root.HoneycombPassageLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
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

  function isDeepFrozenData(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return true;
    try {
      if (!Object.isFrozen(value)) return false;
      const visited = seen || new WeakSet();
      if (visited.has(value)) return true;
      visited.add(value);
      for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")
          || !isDeepFrozenData(descriptor.value, visited)) return false;
      }
      return true;
    } catch (_error) {
      return false;
    }
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
  const CONTENT_KEYS = ["playerNames", "finalNote"];
  const EVENT_KEYS = ["ply", "player", "type", "targetKey"];
  const STATE_KEYS = ["version", "phase", "content", "history", "revision"];
  const REPLAY_KEYS = [
    "positions", "sealsRemaining", "blockedKeys", "activePlayer", "ply", "round",
    "completedRounds", "distances", "legalMoves", "legalSeals", "result",
  ];
  const EMPTY_CELLS = deepFreeze([]);
  const EMPTY_KEYS = deepFreeze([]);
  const DEFAULT_CONTENT = deepFreeze({
    playerNames: ["蜜黄", "暮紫"],
    finalNote: "绕一点路，也还是会在对面相逢。",
  });

  function readExactRecord(value, expectedKeys) {
    try {
      if (value === null || typeof value !== "object"
        || Object.getPrototypeOf(value) !== Object.prototype) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== expectedKeys.length
        || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) return null;
      const result = {};
      for (const key of expectedKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        result[key] = descriptor.value;
      }
      return result;
    } catch (_error) {
      return null;
    }
  }

  function readPlainArray(value, maximumLength) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
        || !Number.isSafeInteger(value.length) || value.length > maximumLength) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== value.length + 1 || !keys.includes("length")) return null;
      const result = [];
      for (let index = 0; index < value.length; index += 1) {
        const key = String(index);
        if (!keys.includes(key)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        result.push(descriptor.value);
      }
      return result;
    } catch (_error) {
      return null;
    }
  }

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

  function isPlayer(value) {
    return value === YELLOW || value === PURPLE;
  }

  function sameCell(left, right) {
    return left.q === right.q && left.r === right.r;
  }

  function copyCell(value) {
    const cell = readCell(value);
    return cell && isWithinRadius(cell, BOARD_RADIUS) ? { q: cell.q, r: cell.r } : null;
  }

  function canonicalBlockedKeys(blocked) {
    return createBoard().filter((cell) => blocked.has(cellKey(cell))).map(cellKey);
  }

  function rawDistances(raw, blockedKeys) {
    const keys = blockedKeys || canonicalBlockedKeys(raw.blocked);
    return [
      findShortestDistance(raw.positions[YELLOW], YELLOW, keys),
      findShortestDistance(raw.positions[PURPLE], PURPLE, keys),
    ];
  }

  function getLegalMovesRaw(raw, player) {
    if (!isPlayer(player) || raw.result !== null) return [];
    const opponentKey = cellKey(raw.positions[1 - player]);
    return getNeighbors(raw.positions[player]).filter((cell) => {
      const key = cellKey(cell);
      return !raw.blocked.has(key) && key !== opponentKey;
    });
  }

  function hasRouteForBothRaw(raw, candidate) {
    const targetKey = cellKey(candidate);
    if (targetKey === null || raw.blocked.has(targetKey)
      || raw.positions.some((position) => cellKey(position) === targetKey)) return false;
    const candidateKeys = [...canonicalBlockedKeys(raw.blocked), targetKey];
    return findShortestDistance(raw.positions[YELLOW], YELLOW, candidateKeys) !== null
      && findShortestDistance(raw.positions[PURPLE], PURPLE, candidateKeys) !== null;
  }

  function getLegalSealsRaw(raw, player) {
    if (!isPlayer(player) || raw.result !== null || raw.sealsRemaining[player] <= 0) return [];
    return createBoard().filter((cell) => hasRouteForBothRaw(raw, cell));
  }

  function makeReachedResult(raw, winner) {
    return {
      reason: "reached-goal",
      winner,
      distances: rawDistances(raw),
      sealsRemaining: [...raw.sealsRemaining],
    };
  }

  function makeRoundLimitResult(raw) {
    const distances = rawDistances(raw);
    let winner = null;
    let tiebreak = "draw";
    if (distances[YELLOW] !== distances[PURPLE]) {
      winner = distances[YELLOW] < distances[PURPLE] ? YELLOW : PURPLE;
      tiebreak = "distance";
    } else if (raw.sealsRemaining[YELLOW] !== raw.sealsRemaining[PURPLE]) {
      winner = raw.sealsRemaining[YELLOW] > raw.sealsRemaining[PURPLE] ? YELLOW : PURPLE;
      tiebreak = "seals";
    }
    return {
      reason: "round-limit",
      winner,
      tiebreak,
      distances,
      sealsRemaining: [...raw.sealsRemaining],
    };
  }

  function makeImmobilizedResult(raw, immobilizedPlayer) {
    return {
      reason: "immobilized",
      winner: 1 - immobilizedPlayer,
      immobilizedPlayer,
      distances: rawDistances(raw),
      sealsRemaining: [...raw.sealsRemaining],
    };
  }

  function finishAfterEventRaw(raw, event) {
    const target = parseCellKey(event.targetKey);
    if (event.type === "move" && isGoalCell(event.player, target)) {
      raw.result = makeReachedResult(raw, event.player);
      return;
    }
    if (raw.ply === MAX_PLIES) {
      raw.result = makeRoundLimitResult(raw);
      return;
    }
    const nextPlayer = raw.ply % PLAYER_COUNT;
    if (getLegalMovesRaw(raw, nextPlayer).length === 0
      && getLegalSealsRaw(raw, nextPlayer).length === 0) {
      raw.result = makeImmobilizedResult(raw, nextPlayer);
    }
  }

  function readEvent(value, expectedPly) {
    const record = readExactRecord(value, EVENT_KEYS);
    if (!record || record.ply !== expectedPly || record.player !== (expectedPly - 1) % PLAYER_COUNT
      || !ACTIONS.includes(record.type) || !parseCellKey(record.targetKey)) return null;
    return {
      ply: record.ply,
      player: record.player,
      type: record.type,
      targetKey: record.targetKey,
    };
  }

  function applyEventRaw(raw, event) {
    if (raw.result !== null || raw.ply + 1 !== event.ply || raw.ply % PLAYER_COUNT !== event.player) {
      return false;
    }
    const target = parseCellKey(event.targetKey);
    const targetKey = event.targetKey;
    if (event.type === "move") {
      if (!getLegalMovesRaw(raw, event.player).some((cell) => cellKey(cell) === targetKey)) return false;
      raw.positions[event.player] = { q: target.q, r: target.r };
    } else {
      if (raw.sealsRemaining[event.player] <= 0 || !hasRouteForBothRaw(raw, target)) return false;
      raw.blocked.add(targetKey);
      raw.sealsRemaining[event.player] -= 1;
    }
    raw.ply = event.ply;
    finishAfterEventRaw(raw, event);
    return true;
  }

  function replayHistoryRaw(history) {
    const values = readPlainArray(history, MAX_PLIES);
    if (!values) return null;
    const raw = {
      positions: STARTS.map((cell) => ({ q: cell.q, r: cell.r })),
      sealsRemaining: [STARTING_SEALS, STARTING_SEALS],
      blocked: new Set(),
      ply: 0,
      result: null,
      events: [],
    };
    for (let index = 0; index < values.length; index += 1) {
      const event = readEvent(values[index], index + 1);
      if (!event || !applyEventRaw(raw, event)) return null;
      raw.events.push(event);
    }
    return raw;
  }

  function toPublicReplay(raw) {
    const activePlayer = raw.result === null ? raw.ply % PLAYER_COUNT : null;
    const legalMoves = activePlayer === null ? [] : getLegalMovesRaw(raw, activePlayer);
    const legalSeals = activePlayer === null ? [] : getLegalSealsRaw(raw, activePlayer);
    const completedRounds = Math.floor(raw.ply / PLAYER_COUNT);
    return deepFreeze({
      positions: raw.positions.map((cell) => ({ q: cell.q, r: cell.r })),
      sealsRemaining: [...raw.sealsRemaining],
      blockedKeys: canonicalBlockedKeys(raw.blocked),
      activePlayer,
      ply: raw.ply,
      round: Math.min(MAX_ROUNDS, completedRounds + 1),
      completedRounds,
      distances: rawDistances(raw),
      legalMoves,
      legalSeals,
      result: raw.result,
    });
  }

  function replayHistory(history) {
    try {
      const raw = replayHistoryRaw(history);
      return raw ? toPublicReplay(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function readCellArray(value, maximumLength, expectedLength) {
    const values = readPlainArray(value, maximumLength);
    if (!values || (expectedLength !== undefined && values.length !== expectedLength)) return null;
    const cells = values.map(copyCell);
    return cells.every(Boolean) ? cells : null;
  }

  function readIntegerArray(value, expectedLength, minimum, maximum) {
    const values = readPlainArray(value, expectedLength);
    if (!values || values.length !== expectedLength
      || values.some((item) => !Number.isSafeInteger(item) || item < minimum || item > maximum)) {
      return null;
    }
    return values;
  }

  function readCanonicalKeyArray(value, maximumLength) {
    const values = readPlainArray(value, maximumLength);
    if (!values) return null;
    const seen = new Set();
    for (const key of values) {
      if (!parseCellKey(key) || seen.has(key)) return null;
      seen.add(key);
    }
    return values;
  }

  function sameCellArray(left, right) {
    return left.length === right.length && left.every((cell, index) => sameCell(cell, right[index]));
  }

  function sameScalarArray(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function readResult(value, raw, distances) {
    if (value === null) return null;
    const reasonRecord = readExactRecord(value, ["reason", "winner", "distances", "sealsRemaining"])
      || readExactRecord(value, [
        "reason", "winner", "immobilizedPlayer", "distances", "sealsRemaining",
      ])
      || readExactRecord(value, [
        "reason", "winner", "tiebreak", "distances", "sealsRemaining",
      ]);
    if (!reasonRecord) return false;
    const resultDistances = readIntegerArray(reasonRecord.distances, PLAYER_COUNT, 0, BOARD_CELL_COUNT);
    const resultSeals = readIntegerArray(
      reasonRecord.sealsRemaining, PLAYER_COUNT, 0, STARTING_SEALS,
    );
    if (!resultDistances || !resultSeals || !sameScalarArray(resultDistances, distances)
      || !sameScalarArray(resultSeals, raw.sealsRemaining)) return false;

    if (reasonRecord.reason === "reached-goal") {
      if (!isPlayer(reasonRecord.winner) || raw.ply < 1
        || reasonRecord.winner !== (raw.ply - 1) % PLAYER_COUNT
        || !isGoalCell(reasonRecord.winner, raw.positions[reasonRecord.winner])
        || resultDistances[reasonRecord.winner] !== 0) return false;
      return {
        reason: "reached-goal",
        winner: reasonRecord.winner,
        distances: resultDistances,
        sealsRemaining: resultSeals,
      };
    }
    if (reasonRecord.reason === "immobilized") {
      if (!isPlayer(reasonRecord.winner) || !isPlayer(reasonRecord.immobilizedPlayer)
        || reasonRecord.winner !== 1 - reasonRecord.immobilizedPlayer
        || reasonRecord.immobilizedPlayer !== raw.ply % PLAYER_COUNT
        || raw.ply >= MAX_PLIES
        || getLegalMovesRaw(raw, reasonRecord.immobilizedPlayer).length !== 0
        || getLegalSealsRaw(raw, reasonRecord.immobilizedPlayer).length !== 0) return false;
      return {
        reason: "immobilized",
        winner: reasonRecord.winner,
        immobilizedPlayer: reasonRecord.immobilizedPlayer,
        distances: resultDistances,
        sealsRemaining: resultSeals,
      };
    }
    if (reasonRecord.reason === "round-limit") {
      const expected = makeRoundLimitResult(raw);
      if (raw.ply !== MAX_PLIES || reasonRecord.winner !== expected.winner
        || reasonRecord.tiebreak !== expected.tiebreak) return false;
      return {
        reason: "round-limit",
        winner: reasonRecord.winner,
        tiebreak: reasonRecord.tiebreak,
        distances: resultDistances,
        sealsRemaining: resultSeals,
      };
    }
    return false;
  }

  function readReplaySnapshot(value) {
    try {
      const record = readExactRecord(value, REPLAY_KEYS);
      if (!record) return null;
      const positions = readCellArray(record.positions, PLAYER_COUNT, PLAYER_COUNT);
      const sealsRemaining = readIntegerArray(
        record.sealsRemaining, PLAYER_COUNT, 0, STARTING_SEALS,
      );
      const blockedKeys = readCanonicalKeyArray(record.blockedKeys, BOARD_CELL_COUNT);
      const distances = readIntegerArray(record.distances, PLAYER_COUNT, 0, BOARD_CELL_COUNT);
      const legalMoves = readCellArray(record.legalMoves, DIRECTIONS.length);
      const legalSeals = readCellArray(record.legalSeals, BOARD_CELL_COUNT);
      if (!positions || !sealsRemaining || !blockedKeys || !distances
        || !legalMoves || !legalSeals || sameCell(positions[0], positions[1])
        || !Number.isSafeInteger(record.ply) || record.ply < 0 || record.ply > MAX_PLIES
        || record.completedRounds !== Math.floor(record.ply / PLAYER_COUNT)
        || record.round !== Math.min(MAX_ROUNDS, record.completedRounds + 1)) return null;
      const positionKeys = positions.map(cellKey);
      if (blockedKeys.some((key) => positionKeys.includes(key))
        || blockedKeys.length !== STARTING_SEALS * PLAYER_COUNT
          - sealsRemaining[YELLOW] - sealsRemaining[PURPLE]) return null;

      const raw = {
        positions,
        sealsRemaining,
        blocked: new Set(blockedKeys),
        ply: record.ply,
        result: null,
        events: [],
      };
      const actualDistances = rawDistances(raw);
      if (actualDistances.some((distance) => distance === null)
        || !sameScalarArray(actualDistances, distances)) return null;
      const result = readResult(record.result, raw, actualDistances);
      if (result === false) return null;
      raw.result = result;
      const goalPlayers = [YELLOW, PURPLE].filter(
        (player) => isGoalCell(player, raw.positions[player]),
      );
      if (result === null) {
        const activePlayer = raw.ply % PLAYER_COUNT;
        if (raw.ply === MAX_PLIES || goalPlayers.length > 0
          || (getLegalMovesRaw(raw, activePlayer).length === 0
            && getLegalSealsRaw(raw, activePlayer).length === 0)) return null;
      } else if (
        (result.reason === "reached-goal"
          && (goalPlayers.length !== 1 || goalPlayers[0] !== result.winner))
        || (result.reason !== "reached-goal" && goalPlayers.length > 0)
      ) {
        return null;
      }
      const expectedActive = result === null ? record.ply % PLAYER_COUNT : null;
      if (record.activePlayer !== expectedActive) return null;
      const expectedMoves = expectedActive === null ? [] : getLegalMovesRaw(raw, expectedActive);
      const expectedSeals = expectedActive === null ? [] : getLegalSealsRaw(raw, expectedActive);
      if (!sameCellArray(legalMoves, expectedMoves) || !sameCellArray(legalSeals, expectedSeals)) return null;
      return raw;
    } catch (_error) {
      return null;
    }
  }

  function getLegalMoves(replay) {
    const raw = readReplaySnapshot(replay);
    if (!raw || raw.result !== null) return EMPTY_CELLS;
    return deepFreeze(getLegalMovesRaw(raw, raw.ply % PLAYER_COUNT));
  }

  function getLegalSeals(replay) {
    const raw = readReplaySnapshot(replay);
    if (!raw || raw.result !== null) return EMPTY_CELLS;
    return deepFreeze(getLegalSealsRaw(raw, raw.ply % PLAYER_COUNT));
  }

  function hasRouteForBoth(replay, candidateCell) {
    const raw = readReplaySnapshot(replay);
    const candidate = copyCell(candidateCell);
    return Boolean(raw && raw.result === null && candidate && hasRouteForBothRaw(raw, candidate));
  }

  function applyAction(history, player, type, target) {
    try {
      const raw = replayHistoryRaw(history);
      const cell = copyCell(target);
      if (!raw || raw.result !== null || !isPlayer(player) || player !== raw.ply % PLAYER_COUNT
        || !ACTIONS.includes(type) || !cell) return null;
      const event = {
        ply: raw.ply + 1,
        player,
        type,
        targetKey: cellKey(cell),
      };
      const nextHistory = [...raw.events, event];
      return replayHistoryRaw(nextHistory) ? deepFreeze(nextHistory) : null;
    } catch (_error) {
      return null;
    }
  }

  function sanitizedContent(value) {
    try {
      if (!configApi || typeof configApi.sanitizeConfig !== "function") return DEFAULT_CONTENT;
      const sanitized = configApi.sanitizeConfig(value);
      const record = readExactRecord(sanitized, CONTENT_KEYS);
      const names = record && readPlainArray(record.playerNames, PLAYER_COUNT);
      if (!record || !names || names.length !== PLAYER_COUNT
        || names.some((name) => typeof name !== "string")
        || typeof record.finalNote !== "string") return DEFAULT_CONTENT;
      return deepFreeze({
        playerNames: [...names],
        finalNote: record.finalNote,
      });
    } catch (_error) {
      return DEFAULT_CONTENT;
    }
  }

  function readContent(value) {
    const record = readExactRecord(value, CONTENT_KEYS);
    const names = record && readPlainArray(record.playerNames, PLAYER_COUNT);
    if (!record || !names || names.length !== PLAYER_COUNT) return null;
    const sanitized = sanitizedContent(value);
    if (!sameScalarArray(names, sanitized.playerNames) || record.finalNote !== sanitized.finalNote) return null;
    return sanitized;
  }

  function freezeState(value) {
    return deepFreeze({
      version: VERSION,
      phase: value.phase,
      content: value.content,
      history: value.history,
      revision: value.revision,
    });
  }

  function createInitialState(configValue) {
    return freezeState({
      phase: "intro",
      content: sanitizedContent(configValue),
      history: [],
      revision: 0,
    });
  }

  function readState(value) {
    try {
      if (!isDeepFrozenData(value)) return null;
      const record = readExactRecord(value, STATE_KEYS);
      if (!record || record.version !== VERSION || !PHASES.includes(record.phase)
        || !Number.isSafeInteger(record.revision) || record.revision < 0) return null;
      const content = readContent(record.content);
      const replayed = replayHistoryRaw(record.history);
      if (!content || !replayed) return null;
      if (record.phase === "intro" && replayed.ply !== 0) return null;
      if (record.phase === "playing" && replayed.result !== null) return null;
      if (record.phase === "result" && replayed.result === null) return null;
      return {
        source: value,
        phase: record.phase,
        revision: record.revision,
        content,
        replayed,
      };
    } catch (_error) {
      return null;
    }
  }

  function reduce(state, action) {
    const safe = readState(state);
    if (!safe) return createInitialState();
    try {
      const startAction = readExactRecord(action, ["type"]);
      if (startAction && startAction.type === "START") {
        if (safe.phase !== "intro" || safe.revision === Number.MAX_SAFE_INTEGER) return safe.source;
        return freezeState({
          phase: "playing",
          content: safe.content,
          history: [],
          revision: safe.revision + 1,
        });
      }
      const restartAction = readExactRecord(action, ["type"]);
      if (restartAction && restartAction.type === "RESTART") {
        if (safe.phase !== "result" || safe.revision === Number.MAX_SAFE_INTEGER) return safe.source;
        return freezeState({
          phase: "intro",
          content: safe.content,
          history: [],
          revision: safe.revision + 1,
        });
      }
      const actAction = readExactRecord(action, ["type", "player", "move", "target"]);
      if (!actAction || actAction.type !== "ACT" || safe.phase !== "playing"
        || safe.revision === Number.MAX_SAFE_INTEGER) return safe.source;
      const nextHistory = applyAction(
        safe.replayed.events, actAction.player, actAction.move, actAction.target,
      );
      if (!nextHistory) return safe.source;
      const replayed = replayHistoryRaw(nextHistory);
      return freezeState({
        phase: replayed.result === null ? "playing" : "result",
        content: safe.content,
        history: nextHistory,
        revision: safe.revision + 1,
      });
    } catch (_error) {
      return safe.source;
    }
  }

  function getScreenView(state) {
    const safe = readState(state);
    const current = safe || readState(createInitialState());
    const replay = toPublicReplay(current.replayed);
    return deepFreeze({
      version: VERSION,
      phase: current.phase,
      title: "蜜径相逢",
      playerNames: [...current.content.playerNames],
      finalNote: current.content.finalNote,
      boardCells: createBoard(),
      positions: replay.positions,
      blockedKeys: replay.blockedKeys,
      sealsRemaining: replay.sealsRemaining,
      activePlayer: replay.activePlayer,
      ply: replay.ply,
      round: replay.round,
      completedRounds: replay.completedRounds,
      distances: replay.distances,
      legalMoveKeys: replay.legalMoves.map(cellKey),
      legalSealKeys: replay.legalSeals.map(cellKey),
      history: current.replayed.events.map((event) => ({ ...event })),
      result: replay.result,
      controls: {
        canStart: current.phase === "intro",
        canAct: current.phase === "playing",
        canRestart: current.phase === "result",
      },
      revision: current.revision,
    });
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
    replayHistory,
    getLegalMoves,
    getLegalSeals,
    hasRouteForBoth,
    applyAction,
    createInitialState,
    reduce,
    getScreenView,
  });
});
