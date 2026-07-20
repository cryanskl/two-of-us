(function (root, factory) {
  "use strict";

  let levels = root && root.FOG_NAVIGATION_LEVELS;
  let config = root && root.FOG_NAVIGATION_CONFIG;
  if (typeof module === "object" && module.exports) {
    levels = levels || require("./levels.js");
    config = config || require("./config.js");
  }
  const api = factory(levels, config);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FogNavigationLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (RAW_LEVELS, FILE_CONFIG) {
  "use strict";

  const WIDTH = 13;
  const HEIGHT = 9;
  const LOCAL_RADIUS = 2;
  const LOCAL_WINDOW_SIZE = 5;
  const TICKS_PER_SECOND = 30;
  const BRIEFING_TICKS = 210;
  const DIRECTIONS = Object.freeze(["up", "right", "down", "left"]);
  const COVER_REASONS = Object.freeze(["timer", "manual", "hidden", "blur"]);
  const PHASES = Object.freeze(["intro", "briefing", "cover", "driving", "retry", "round-result", "complete"]);
  const DIRECTION_DELTAS = deepFreeze({
    up: [0, -1],
    right: [1, 0],
    down: [0, 1],
    left: [-1, 0],
  });
  const LEVEL_KEYS = Object.freeze(["id", "title", "navigatorSeat", "landmarks", "critical", "safeDistance", "rows"]);
  const STATE_KEYS = Object.freeze([
    "phase", "roundIndex", "briefingTicks", "position", "path", "attempt", "bumpCount",
    "completedRounds", "coverReason", "feedbackCode", "revision",
  ]);
  const SUMMARY_KEYS = Object.freeze(["levelId", "navigatorSeat", "driverSeat", "steps", "attempts", "bumps"]);
  const DEFAULT_SEATS = Object.freeze(["你", "我"]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function safePlain(value) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      return (prototype === Object.prototype || prototype === null) && Object.getOwnPropertySymbols(value).length === 0;
    } catch (_error) {
      return false;
    }
  }

  function exactDataObject(value, keys) {
    try {
      if (!safePlain(value)) return false;
      const ownKeys = Object.keys(value);
      if (ownKeys.length !== keys.length || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;
      return keys.every((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
      });
    } catch (_error) {
      return false;
    }
  }

  function dataValue(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function safeEventRead(event, key) {
    try {
      return event[key];
    } catch (_error) {
      return undefined;
    }
  }

  function cloneFrozen(value) {
    if (Array.isArray(value)) return deepFreeze(value.map(cloneFrozen));
    if (safePlain(value)) {
      const result = {};
      Object.keys(value).forEach((key) => { result[key] = cloneFrozen(dataValue(value, key)); });
      return deepFreeze(result);
    }
    return value;
  }

  function validCoordinate(value) {
    try {
      if (!Array.isArray(value) || value.length !== 2) return false;
      const x = dataValue(value, "0");
      const y = dataValue(value, "1");
      return Number.isSafeInteger(x) && Number.isSafeInteger(y);
    } catch (_error) {
      return false;
    }
  }

  function coordinatesEqual(left, right) {
    return validCoordinate(left) && validCoordinate(right) && left[0] === right[0] && left[1] === right[1];
  }

  function pointKey(point) {
    return `${point[0]},${point[1]}`;
  }

  function truncateCodePoints(value, limit) {
    return [...value].slice(0, limit).join("");
  }

  function defaultCompletionNote(summary, seats) {
    const candidate = safePlain(summary) ? validSeatArray(dataValue(summary, "seats")) : null;
    const names = candidate || seats;
    return `${names[0]}和${names[1]}，雾再浓一点，也会有人记得方向。`;
  }

  function guardedSummary(summary) {
    const cache = new WeakMap();
    function buildGuard(value) {
      if (!value || typeof value !== "object") return value;
      if (cache.has(value)) return cache.get(value);
      const target = Array.isArray(value) ? [] : {};
      const proxy = new Proxy(target, {
        set() { throw new TypeError("summary is read-only"); },
        deleteProperty() { throw new TypeError("summary is read-only"); },
        defineProperty() { throw new TypeError("summary is read-only"); },
        setPrototypeOf() { throw new TypeError("summary is read-only"); },
      });
      cache.set(value, proxy);
      if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) target.push(buildGuard(dataValue(value, String(index))));
      } else if (safePlain(value)) {
        Object.keys(value).forEach((key) => { target[key] = buildGuard(dataValue(value, key)); });
      }
      Object.freeze(target);
      return proxy;
    }
    return buildGuard(safePlain(summary) ? summary : {});
  }

  function validSeatArray(value) {
    try {
      if (!Array.isArray(value) || value.length !== 2) return null;
      const names = [dataValue(value, "0"), dataValue(value, "1")];
      if (!names.every((name) => typeof name === "string")) return null;
      const normalized = names.map((name) => truncateCodePoints(name.trim(), 12));
      if (normalized.some((name) => name.length === 0) || normalized[0] === normalized[1]) return null;
      return normalized;
    } catch (_error) {
      return null;
    }
  }

  function normalizeConfig(raw) {
    const source = raw === undefined ? FILE_CONFIG : raw;
    let seats = null;
    let composer = null;
    try {
      if (safePlain(source)) {
        seats = validSeatArray(dataValue(source, "seats"));
        const candidate = dataValue(source, "composeCompletionNote");
        if (typeof candidate === "function") composer = candidate;
      }
    } catch (_error) {
      seats = null;
      composer = null;
    }
    if (!seats) seats = [...DEFAULT_SEATS];
    const frozenSeats = deepFreeze(seats.slice());
    function composeCompletionNote(summary) {
      const fallback = defaultCompletionNote(summary, frozenSeats);
      if (!composer) return fallback;
      try {
        const result = composer(guardedSummary(summary));
        if (typeof result !== "string") return fallback;
        const trimmed = result.trim();
        if (!trimmed || [...trimmed].length > 120) return fallback;
        return trimmed;
      } catch (_error) {
        return fallback;
      }
    }
    return deepFreeze({ seats: frozenSeats, composeCompletionNote });
  }

  const ACTIVE_CONFIG = normalizeConfig(FILE_CONFIG);
  const DEFAULT_CONFIG = normalizeConfig(null);

  function resolveCompletionNote(summary, config) {
    return normalizeConfig(config === undefined ? FILE_CONFIG : config).composeCompletionNote(summary);
  }

  function cellAt(level, point) {
    const [x, y] = point;
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return null;
    return level.rows[y][x];
  }

  function locate(level, character) {
    for (let y = 0; y < level.rows.length; y += 1) {
      const x = level.rows[y].indexOf(character);
      if (x >= 0) return [x, y];
    }
    return null;
  }

  function step(point, direction) {
    const delta = DIRECTION_DELTAS[direction];
    return delta ? [point[0] + delta[0], point[1] + delta[1]] : null;
  }

  function countCharacter(rows, character) {
    return rows.reduce((total, row) => total + [...row].filter((value) => value === character).length, 0);
  }

  function validateLevelShape(level) {
    try {
      if (!exactDataObject(level, LEVEL_KEYS)) return false;
      if (typeof level.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(level.id)) return false;
      if (typeof level.title !== "string" || !level.title.trim()) return false;
      if (level.navigatorSeat !== 0 && level.navigatorSeat !== 1) return false;
      if (!exactDataObject(level.landmarks, ["A", "B"])) return false;
      if (![level.landmarks.A, level.landmarks.B].every((label) => typeof label === "string" && label.trim())) return false;
      if (!exactDataObject(level.critical, ["cell", "safe", "decoy", "arrival"])) return false;
      if (!validCoordinate(level.critical.cell)) return false;
      const directions = [level.critical.safe, level.critical.decoy, level.critical.arrival];
      if (!directions.every((direction) => DIRECTIONS.includes(direction)) || new Set(directions).size !== 3) return false;
      if (!Number.isSafeInteger(level.safeDistance) || level.safeDistance < 1) return false;
      if (!Array.isArray(level.rows) || level.rows.length !== HEIGHT) return false;
      for (let index = 0; index < HEIGHT; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(level.rows, String(index));
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return false;
        const row = descriptor.value;
        if (typeof row !== "string" || [...row].length !== WIDTH || !/^[#.SGABH]+$/.test(row)) return false;
      }
      if (!["S", "G", "H", "A", "B"].every((character) => countCharacter(level.rows, character) === 1)) return false;
      if (![...level.rows[0], ...level.rows[HEIGHT - 1]].every((character) => character === "#")) return false;
      if (!level.rows.every((row) => row[0] === "#" && row[WIDTH - 1] === "#")) return false;
      const criticalCell = cellAt(level, level.critical.cell);
      if (!criticalCell || criticalCell === "#" || criticalCell === "H") return false;
      for (const direction of directions) {
        const candidate = step(level.critical.cell, direction);
        const character = candidate && cellAt(level, candidate);
        if (!character || character === "#") return false;
      }
      for (const direction of [level.critical.safe, level.critical.decoy]) {
        let candidate = level.critical.cell;
        for (let distance = 0; distance < 2; distance += 1) {
          candidate = step(candidate, direction);
          const character = candidate && cellAt(level, candidate);
          if (!character || character === "#" || character === "H") return false;
        }
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function findPath(level, start, target, hazardsWalkable) {
    if (!validateLevelShape(level) || !validCoordinate(start) || !validCoordinate(target)) return deepFreeze([]);
    const queue = [start.slice()];
    let cursor = 0;
    const predecessors = new Map([[pointKey(start), null]]);
    while (cursor < queue.length) {
      const current = queue[cursor];
      cursor += 1;
      if (coordinatesEqual(current, target)) break;
      for (const direction of DIRECTIONS) {
        const next = step(current, direction);
        const character = cellAt(level, next);
        const key = pointKey(next);
        if (!character || character === "#" || (!hazardsWalkable && character === "H") || predecessors.has(key)) continue;
        predecessors.set(key, current);
        queue.push(next);
      }
    }
    if (!predecessors.has(pointKey(target))) return deepFreeze([]);
    const path = [];
    let current = target.slice();
    while (current) {
      path.push(current.slice());
      current = predecessors.get(pointKey(current));
    }
    path.reverse();
    return deepFreeze(path.map((point) => deepFreeze(point)));
  }

  function findSafePath(level) {
    if (!validateLevelShape(level)) return deepFreeze([]);
    return findPath(level, locate(level, "S"), locate(level, "G"), false);
  }

  function findReachablePath(level, options) {
    if (!validateLevelShape(level)) return deepFreeze([]);
    const settings = safePlain(options) ? options : {};
    const targetCharacter = dataValue(settings, "target") === "H" ? "H" : "G";
    const hazardsWalkable = dataValue(settings, "hazardsWalkable") === true;
    return findPath(level, locate(level, "S"), locate(level, targetCharacter), hazardsWalkable);
  }

  function signatureKind(character) {
    if (character === null) return "void";
    if (character === "#") return "wall";
    if (character === "A" || character === "B") return "landmark";
    if (character === "G") return "goal";
    return "walkable";
  }

  function canonicalLocalSignature(level, point, forward) {
    if (!validateLevelShape(level) || !validCoordinate(point) || !DIRECTIONS.includes(forward)) return null;
    const heading = DIRECTION_DELTAS[forward];
    const right = [-heading[1], heading[0]];
    const rows = [];
    for (let localY = -LOCAL_RADIUS; localY <= LOCAL_RADIUS; localY += 1) {
      const cells = [];
      for (let localX = -LOCAL_RADIUS; localX <= LOCAL_RADIUS; localX += 1) {
        const world = [
          point[0] + localX * right[0] - localY * heading[0],
          point[1] + localX * right[1] - localY * heading[1],
        ];
        cells.push(signatureKind(cellAt(level, world)));
      }
      rows.push(cells);
    }
    const direct = rows.map((row) => row.join(",")).join("/");
    const mirrored = rows.map((row) => row.slice().reverse().join(",")).join("/");
    return direct < mirrored ? direct : mirrored;
  }

  function straightOutcome(level, direction) {
    let current = level.critical.cell.slice();
    const visited = new Set([pointKey(current)]);
    for (let count = 0; count < WIDTH * HEIGHT; count += 1) {
      const next = step(current, direction);
      const character = cellAt(level, next);
      if (!character || character === "#" || visited.has(pointKey(next))) return character === "H";
      if (character === "H") return true;
      visited.add(pointKey(next));
      current = next;
    }
    return false;
  }

  function analyzeCooperationGate(level) {
    if (!validateLevelShape(level)) return deepFreeze({ valid: false });
    const safeSignatures = [];
    const decoySignatures = [];
    let safePoint = level.critical.cell.slice();
    let decoyPoint = level.critical.cell.slice();
    for (let count = 0; count < 2; count += 1) {
      safePoint = step(safePoint, level.critical.safe);
      decoyPoint = step(decoyPoint, level.critical.decoy);
      safeSignatures.push(canonicalLocalSignature(level, safePoint, level.critical.safe));
      decoySignatures.push(canonicalLocalSignature(level, decoyPoint, level.critical.decoy));
    }
    const safeStart = step(level.critical.cell, level.critical.safe);
    const goal = locate(level, "G");
    const safePath = findPath(level, safeStart, goal, false);
    const equivalentFirstTwo = safeSignatures.every((signature, index) => signature === decoySignatures[index]);
    const decoyEndsAtHazard = straightOutcome(level, level.critical.decoy);
    const safeReachesGoal = safePath.length > 0;
    return deepFreeze({
      valid: equivalentFirstTwo && decoyEndsAtHazard && safeReachesGoal,
      critical: level.critical.cell.slice(),
      safeDirection: level.critical.safe,
      decoyDirection: level.critical.decoy,
      safeSignatures,
      decoySignatures,
      equivalentFirstTwo,
      decoyEndsAtHazard,
      safeReachesGoal,
    });
  }

  function validateLevel(level) {
    if (!validateLevelShape(level)) return false;
    const safePath = findSafePath(level);
    if (safePath.length - 1 !== level.safeDistance) return false;
    if (findReachablePath(level, { hazardsWalkable: true, target: "H" }).length === 0) return false;
    return analyzeCooperationGate(level).valid;
  }

  const LEVELS = deepFreeze(Array.isArray(RAW_LEVELS) ? RAW_LEVELS.map(cloneFrozen) : []);

  function validateLevels(levels) {
    try {
      if (!Array.isArray(levels) || levels.length !== 4) return false;
      if (!levels.every(validateLevel)) return false;
      return new Set(levels.map((level) => level.id)).size === levels.length;
    } catch (_error) {
      return false;
    }
  }

  function normalizeLevels(levels) {
    return validateLevels(levels) ? deepFreeze(levels.map(cloneFrozen)) : LEVELS;
  }

  function initialRoundFields(roundIndex) {
    const startCell = locate(LEVELS[roundIndex], "S");
    return {
      position: startCell,
      path: [startCell],
      attempt: 1,
      bumpCount: 0,
    };
  }

  function makeState(fields) {
    return deepFreeze({
      phase: fields.phase,
      roundIndex: fields.roundIndex,
      briefingTicks: fields.briefingTicks,
      position: fields.position.slice(),
      path: fields.path.map((point) => point.slice()),
      attempt: fields.attempt,
      bumpCount: fields.bumpCount,
      completedRounds: fields.completedRounds.map(cloneFrozen),
      coverReason: fields.coverReason,
      feedbackCode: fields.feedbackCode,
      revision: fields.revision,
    });
  }

  function createInitialState(config) {
    normalizeConfig(config);
    return makeState({
      phase: "intro",
      roundIndex: 0,
      briefingTicks: 0,
      ...initialRoundFields(0),
      completedRounds: [],
      coverReason: null,
      feedbackCode: null,
      revision: 0,
    });
  }

  function validSummary(summary, index) {
    if (!exactDataObject(summary, SUMMARY_KEYS)) return false;
    const level = LEVELS[index];
    return summary.levelId === level.id
      && summary.navigatorSeat === level.navigatorSeat
      && summary.driverSeat === 1 - level.navigatorSeat
      && Number.isSafeInteger(summary.steps) && summary.steps >= 1
      && Number.isSafeInteger(summary.attempts) && summary.attempts >= 1
      && Number.isSafeInteger(summary.bumps) && summary.bumps >= 0;
  }

  function validPath(level, path, position, allowGoal) {
    if (!Array.isArray(path) || path.length < 1 || !coordinatesEqual(path[0], locate(level, "S"))) return false;
    for (let index = 0; index < path.length; index += 1) {
      const point = path[index];
      if (!validCoordinate(point)) return false;
      const character = cellAt(level, point);
      if (!character || character === "#" || character === "H" || (!allowGoal && character === "G")) return false;
      if (index > 0) {
        const previous = path[index - 1];
        if (Math.abs(point[0] - previous[0]) + Math.abs(point[1] - previous[1]) !== 1) return false;
      }
    }
    return coordinatesEqual(path[path.length - 1], position);
  }

  function isFogNavigationState(value) {
    try {
      if (!exactDataObject(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
      if (!Number.isSafeInteger(value.roundIndex) || value.roundIndex < 0 || value.roundIndex >= LEVELS.length) return false;
      if (!Number.isSafeInteger(value.briefingTicks) || value.briefingTicks < 0 || value.briefingTicks > BRIEFING_TICKS) return false;
      if (!validCoordinate(value.position) || !Array.isArray(value.path)) return false;
      if (!Number.isSafeInteger(value.attempt) || value.attempt < 1 || !Number.isSafeInteger(value.bumpCount) || value.bumpCount < 0) return false;
      if (!Array.isArray(value.completedRounds) || !Number.isSafeInteger(value.revision) || value.revision < 0) return false;
      if (!(value.coverReason === null || COVER_REASONS.includes(value.coverReason))) return false;
      if (!(value.feedbackCode === null || typeof value.feedbackCode === "string")) return false;
      const expectedCompleted = value.phase === "round-result" ? value.roundIndex + 1 : value.phase === "complete" ? LEVELS.length : value.roundIndex;
      if (value.completedRounds.length !== expectedCompleted || !value.completedRounds.every(validSummary)) return false;
      const level = LEVELS[value.roundIndex];
      const startCell = locate(level, "S");
      const goalCell = locate(level, "G");
      if (value.phase === "briefing" && (value.briefingTicks < 1 || value.coverReason !== null)) return false;
      if (value.phase !== "briefing" && value.briefingTicks !== 0) return false;
      if (value.phase === "cover" && !COVER_REASONS.includes(value.coverReason)) return false;
      if (value.phase !== "cover" && value.coverReason !== null) return false;
      if (["intro", "briefing", "cover", "retry"].includes(value.phase)) {
        if (!coordinatesEqual(value.position, startCell) || value.path.length !== 1 || !coordinatesEqual(value.path[0], startCell)) return false;
      }
      if (value.phase === "intro" && (value.roundIndex !== 0 || value.attempt !== 1 || value.bumpCount !== 0 || value.feedbackCode !== null)) return false;
      if (value.phase === "retry" && (value.attempt < 2 || value.feedbackCode !== "mist-trap")) return false;
      if (value.phase === "driving" && !validPath(level, value.path, value.position, false)) return false;
      if (["round-result", "complete"].includes(value.phase)) {
        if (!coordinatesEqual(value.position, goalCell) || !validPath(level, value.path, value.position, true) || value.feedbackCode !== "goal") return false;
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function safeState(state) {
    return isFogNavigationState(state) ? state : null;
  }

  function changed(state, fields) {
    return makeState({ ...state, ...fields, revision: state.revision + 1 });
  }

  function start(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "intro") return current;
    return changed(current, { phase: "briefing", briefingTicks: BRIEFING_TICKS });
  }

  function tickBriefing(state, ticks = 1) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "briefing" || !Number.isSafeInteger(ticks) || ticks <= 0) return current;
    if (ticks >= current.briefingTicks) {
      return changed(current, { phase: "cover", briefingTicks: 0, coverReason: "timer", feedbackCode: null });
    }
    return changed(current, { briefingTicks: current.briefingTicks - ticks });
  }

  function cover(state, reason) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "briefing" || !["manual", "hidden", "blur"].includes(reason)) return current;
    return changed(current, { phase: "cover", briefingTicks: 0, coverReason: reason, feedbackCode: null });
  }

  function driverReady(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "cover") return current;
    return changed(current, { phase: "driving", coverReason: null, feedbackCode: null });
  }

  function move(state, direction) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "driving" || !DIRECTIONS.includes(direction)) return current;
    const level = LEVELS[current.roundIndex];
    const next = step(current.position, direction);
    const character = cellAt(level, next);
    if (!character || character === "#") {
      return changed(current, { bumpCount: current.bumpCount + 1, feedbackCode: "wall" });
    }
    if (character === "H") {
      const startCell = locate(level, "S");
      return changed(current, {
        phase: "retry",
        position: startCell,
        path: [startCell],
        attempt: current.attempt + 1,
        coverReason: null,
        feedbackCode: "mist-trap",
      });
    }
    const nextPath = [...current.path.map((point) => point.slice()), next];
    if (character === "G") {
      const summary = deepFreeze({
        levelId: level.id,
        navigatorSeat: level.navigatorSeat,
        driverSeat: 1 - level.navigatorSeat,
        steps: nextPath.length - 1,
        attempts: current.attempt,
        bumps: current.bumpCount,
      });
      const completedRounds = [...current.completedRounds, summary];
      return changed(current, {
        phase: current.roundIndex === LEVELS.length - 1 ? "complete" : "round-result",
        position: next,
        path: nextPath,
        completedRounds,
        feedbackCode: "goal",
      });
    }
    return changed(current, {
      position: next,
      path: nextPath,
      feedbackCode: character === "A" || character === "B" ? `landmark-${character}` : "moved",
    });
  }

  function review(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "retry") return current;
    return changed(current, { phase: "briefing", briefingTicks: BRIEFING_TICKS, feedbackCode: null });
  }

  function nextRound(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "round-result" || current.roundIndex >= LEVELS.length - 1) return current;
    const nextIndex = current.roundIndex + 1;
    return changed(current, {
      phase: "briefing",
      roundIndex: nextIndex,
      briefingTicks: BRIEFING_TICKS,
      ...initialRoundFields(nextIndex),
      coverReason: null,
      feedbackCode: null,
    });
  }

  function restart() {
    return createInitialState();
  }

  function reduce(state, action) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (!safePlain(action)) return current;
    const type = dataValue(action, "type");
    if (type === "START") return start(current);
    if (type === "TICK") return tickBriefing(current, dataValue(action, "ticks") === undefined ? 1 : dataValue(action, "ticks"));
    if (type === "COVER") return cover(current, dataValue(action, "reason"));
    if (type === "HIDE") return cover(current, "hidden");
    if (type === "BLUR") return cover(current, "blur");
    if (type === "DRIVER_READY") return driverReady(current);
    if (type === "MOVE") return move(current, dataValue(action, "direction"));
    if (type === "REVIEW") return review(current);
    if (type === "NEXT") return nextRound(current);
    if (type === "RESTART") return restart(current);
    return current;
  }

  function replay(actions, initialState) {
    let state = initialState === undefined ? createInitialState() : (safeState(initialState) ? makeState(initialState) : createInitialState());
    if (!Array.isArray(actions)) return state;
    actions.forEach((action) => { state = reduce(state, action); });
    return state;
  }

  function namesForLevel(level) {
    return {
      navigatorName: ACTIVE_CONFIG.seats[level.navigatorSeat],
      driverName: ACTIVE_CONFIG.seats[1 - level.navigatorSeat],
    };
  }

  function navigatorCell(level, x, y) {
    const character = level.rows[y][x];
    const base = { x, y };
    if (character === "#") return { ...base, kind: "wall" };
    if (character === "S") return { ...base, kind: "start", label: "起点", symbol: "●" };
    if (character === "G") return { ...base, kind: "goal", label: "终点灯", symbol: "◎" };
    if (character === "H") return { ...base, kind: "hazard", label: "雾陷阱", symbol: "×" };
    if (character === "A" || character === "B") return { ...base, kind: "landmark", label: level.landmarks[character], symbol: character === "A" ? "◆" : "✦" };
    return { ...base, kind: "floor" };
  }

  function getNavigatorView(state) {
    const current = safeState(state);
    if (!current || current.phase !== "briefing") return null;
    const level = LEVELS[current.roundIndex];
    const grid = [];
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) grid.push(navigatorCell(level, x, y));
    }
    return deepFreeze({
      phase: "briefing",
      roundNumber: current.roundIndex + 1,
      title: level.title,
      ...namesForLevel(level),
      secondsRemaining: Math.ceil(current.briefingTicks / TICKS_PER_SECOND),
      grid,
      safePath: findSafePath(level).map((point) => point.slice()),
      instruction: "看图的人不碰方向，走路的人不看全图。",
    });
  }

  function driverCell(level, world, dx, dy, isPlayer) {
    const character = cellAt(level, world);
    const base = { dx, dy };
    if (isPlayer) return { ...base, kind: "player", label: "当前位置", symbol: "●" };
    if (character === null) return { ...base, kind: "void" };
    if (character === "#") return { ...base, kind: "wall", label: "墙", symbol: "▲" };
    if (character === "A" || character === "B") return { ...base, kind: "landmark", label: level.landmarks[character], symbol: character === "A" ? "◆" : "✦" };
    if (character === "G") return { ...base, kind: "goal", label: "终点", symbol: "◎" };
    return { ...base, kind: "floor" };
  }

  function getDriverView(state) {
    const current = safeState(state);
    if (!current || current.phase !== "driving") return null;
    const level = LEVELS[current.roundIndex];
    const cells = [];
    for (let dy = -LOCAL_RADIUS; dy <= LOCAL_RADIUS; dy += 1) {
      for (let dx = -LOCAL_RADIUS; dx <= LOCAL_RADIUS; dx += 1) {
        const world = [current.position[0] + dx, current.position[1] + dy];
        cells.push(driverCell(level, world, dx, dy, dx === 0 && dy === 0));
      }
    }
    return deepFreeze({
      phase: "driving",
      roundNumber: current.roundIndex + 1,
      title: level.title,
      driverName: ACTIVE_CONFIG.seats[1 - level.navigatorSeat],
      windowSize: LOCAL_WINDOW_SIZE,
      cells,
      position: [LOCAL_RADIUS, LOCAL_RADIUS],
      steps: current.path.length - 1,
      attempts: current.attempt,
      bumps: current.bumpCount,
      feedbackCode: current.feedbackCode,
    });
  }

  function publicSummary(summary, index) {
    const level = LEVELS[index];
    return deepFreeze({
      levelId: summary.levelId,
      title: level.title,
      navigatorName: ACTIVE_CONFIG.seats[summary.navigatorSeat],
      driverName: ACTIVE_CONFIG.seats[summary.driverSeat],
      steps: summary.steps,
      attempts: summary.attempts,
      bumps: summary.bumps,
    });
  }

  function getPublicView(state) {
    const current = safeState(state);
    if (!current) return null;
    if (current.phase === "briefing") return getNavigatorView(current);
    if (current.phase === "driving") return getDriverView(current);
    const level = LEVELS[current.roundIndex];
    const names = namesForLevel(level);
    if (current.phase === "intro") {
      return deepFreeze({ phase: "intro", seats: ACTIVE_CONFIG.seats.slice(), rule: "看图的人不碰方向，走路的人不看全图。", totalRounds: LEVELS.length });
    }
    if (current.phase === "cover") {
      return deepFreeze({ phase: "cover", roundNumber: current.roundIndex + 1, title: level.title, ...names, coverReason: current.coverReason });
    }
    if (current.phase === "retry") {
      return deepFreeze({ phase: "retry", roundNumber: current.roundIndex + 1, title: level.title, ...names, attempt: current.attempt, feedbackCode: "mist-trap" });
    }
    if (current.phase === "round-result") {
      return deepFreeze({
        phase: "round-result",
        roundNumber: current.roundIndex + 1,
        summary: publicSummary(current.completedRounds[current.roundIndex], current.roundIndex),
        nextNavigatorName: ACTIVE_CONFIG.seats[LEVELS[current.roundIndex + 1].navigatorSeat],
        nextDriverName: ACTIVE_CONFIG.seats[1 - LEVELS[current.roundIndex + 1].navigatorSeat],
      });
    }
    const navigatorCounts = [0, 0];
    const driverCounts = [0, 0];
    current.completedRounds.forEach((summary) => {
      navigatorCounts[summary.navigatorSeat] += 1;
      driverCounts[summary.driverSeat] += 1;
    });
    return deepFreeze({
      phase: "complete",
      summaries: current.completedRounds.map(publicSummary),
      roleCounts: ACTIVE_CONFIG.seats.map((name, seat) => ({ name, navigator: navigatorCounts[seat], driver: driverCounts[seat] })),
    });
  }

  function editableTarget(target) {
    if (!target || typeof target !== "object") return false;
    const editable = safeEventRead(target, "isContentEditable") === true;
    const tagName = safeEventRead(target, "tagName");
    return editable || (typeof tagName === "string" && ["INPUT", "TEXTAREA", "SELECT"].includes(tagName.toUpperCase()));
  }

  function directionFromKeyboardEvent(event) {
    if (!event || typeof event !== "object" || safeEventRead(event, "repeat") === true) return null;
    if (["ctrlKey", "altKey", "metaKey", "shiftKey"].some((key) => safeEventRead(event, key) === true)) return null;
    if (editableTarget(safeEventRead(event, "target"))) return null;
    const code = safeEventRead(event, "code");
    const key = safeEventRead(event, "key");
    const value = typeof code === "string" && code.startsWith("Arrow") ? code : key;
    if (value === "ArrowUp") return "up";
    if (value === "ArrowRight") return "right";
    if (value === "ArrowDown") return "down";
    if (value === "ArrowLeft") return "left";
    return null;
  }

  function classifyDirectionKey(state, event) {
    const current = safeState(state);
    if (!current || current.phase !== "driving") return null;
    const direction = directionFromKeyboardEvent(event);
    return direction ? deepFreeze({ type: "MOVE", direction }) : null;
  }

  return deepFreeze({
    WIDTH,
    HEIGHT,
    LOCAL_RADIUS,
    LOCAL_WINDOW_SIZE,
    TICKS_PER_SECOND,
    BRIEFING_TICKS,
    DIRECTIONS,
    COVER_REASONS,
    PHASES,
    LEVELS,
    DEFAULT_CONFIG,
    ACTIVE_CONFIG,
    deepFreeze,
    normalizeConfig,
    resolveCompletionNote,
    validateLevel,
    validateLevels,
    normalizeLevels,
    findSafePath,
    findReachablePath,
    canonicalLocalSignature,
    analyzeCooperationGate,
    createInitialState,
    isFogNavigationState,
    start,
    tickBriefing,
    cover,
    driverReady,
    move,
    review,
    nextRound,
    restart,
    reduce,
    replay,
    getNavigatorView,
    getDriverView,
    getPublicView,
    directionFromKeyboardEvent,
    classifyDirectionKey,
  });
});
