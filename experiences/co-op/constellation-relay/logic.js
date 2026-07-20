(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ConstellationRelayLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const START_POINT_ID = "spool";
  const END_POINT_ID = "east-hub";
  const SEATS = Object.freeze(["a", "b"]);
  const RESULT_CODES = Object.freeze([
    "invalid", "edge-used", "wire-crossed", "off-outline", "future-stranded", "accepted",
  ]);
  const PHASES = Object.freeze([
    "intro", "handoff", "choosing", "edge-result", "jammed", "constellation-result", "complete",
  ]);
  const STATE_KEYS = Object.freeze([
    "phase", "cursorId", "completedMoves", "attempt", "lastResult", "revision",
  ]);
  const MOVE_KEYS = Object.freeze(["edgeId", "fromId", "toId", "seat", "attempts"]);
  const RESULT_KEYS = Object.freeze(["status", "edgeId"]);

  function deepFreeze(value, seen) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    }
    return Object.freeze(value);
  }

  const POINTS = deepFreeze([
    { id: "spool", x: 350, y: 900, role: "start" },
    { id: "west-hub", x: 350, y: 520, role: "node" },
    { id: "west-top", x: 220, y: 330, role: "node" },
    { id: "west-tip", x: 70, y: 520, role: "node" },
    { id: "west-bottom", x: 220, y: 710, role: "node" },
    { id: "east-hub", x: 650, y: 520, role: "end" },
    { id: "east-top", x: 780, y: 330, role: "node" },
    { id: "east-tip", x: 930, y: 520, role: "node" },
    { id: "east-bottom", x: 780, y: 710, role: "node" },
  ]);

  const TARGET_EDGES = deepFreeze([
    { id: "tail", a: "spool", b: "west-hub" },
    { id: "west-upper", a: "west-hub", b: "west-top" },
    { id: "west-tip-up", a: "west-top", b: "west-tip" },
    { id: "west-tip-low", a: "west-tip", b: "west-bottom" },
    { id: "west-lower", a: "west-bottom", b: "west-hub" },
    { id: "bridge", a: "west-hub", b: "east-hub" },
    { id: "east-upper", a: "east-hub", b: "east-top" },
    { id: "east-tip-up", a: "east-top", b: "east-tip" },
    { id: "east-tip-low", a: "east-tip", b: "east-bottom" },
    { id: "east-lower", a: "east-bottom", b: "east-hub" },
  ]);

  const DEFAULT_CONFIG = deepFreeze({
    seats: { a: "你", b: "TA" },
    completionNote: "这十次交接，刚好把同一束星光送到了彼此手里。",
  });

  const POINT_BY_ID = new Map(POINTS.map((point) => [point.id, point]));
  const POINT_INDEX = new Map(POINTS.map((point, index) => [point.id, index]));
  const EDGE_BY_ID = new Map(TARGET_EDGES.map((edge) => [edge.id, edge]));
  const EDGE_INDEX = new Map(TARGET_EDGES.map((edge, index) => [edge.id, index]));

  function isPlainObject(value) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      return (prototype === Object.prototype || prototype === null)
        && Object.getOwnPropertySymbols(value).length === 0;
    } catch (_error) {
      return false;
    }
  }

  function exactDataObject(value, keys) {
    return snapshotExactObject(value, keys) !== null;
  }

  function snapshotExactObject(value, keys) {
    try {
      if (!isPlainObject(value)) return null;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
      const snapshot = {};
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        snapshot[key] = descriptor.value;
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function exactDataArray(value, length) {
    return snapshotExactArray(value, length) !== null;
  }

  function snapshotExactArray(value, expectedLength) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const keys = Reflect.ownKeys(value);
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
        || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
        || (expectedLength !== undefined && lengthDescriptor.value !== expectedLength)) return null;
      const length = lengthDescriptor.value;
      if (keys.length !== length + 1) return null;
      const snapshot = [];
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        if (!keys.includes(key)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        snapshot.push(descriptor.value);
      }
      if (keys.some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) return null;
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function safeRead(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function cloneFrozen(value) {
    if (Array.isArray(value)) {
      const result = [];
      for (let index = 0; index < value.length; index += 1) result.push(cloneFrozen(value[index]));
      return deepFreeze(result);
    }
    if (isPlainObject(value)) {
      const result = {};
      for (const key of Object.keys(value)) result[key] = cloneFrozen(value[key]);
      return deepFreeze(result);
    }
    return value;
  }

  function sameData(left, right) {
    try {
      if (Object.is(left, right)) return true;
      if (typeof left !== typeof right || left === null || right === null || typeof left !== "object") return false;
      if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        for (let index = 0; index < left.length; index += 1) {
          if (!sameData(left[index], right[index])) return false;
        }
        return true;
      }
      if (!isPlainObject(left) || !isPlainObject(right)) return false;
      const leftKeys = Reflect.ownKeys(left);
      const rightKeys = Reflect.ownKeys(right);
      return leftKeys.length === rightKeys.length && leftKeys.every((key) => (
        typeof key === "string" && Object.prototype.hasOwnProperty.call(right, key) && sameData(left[key], right[key])
      ));
    } catch (_error) {
      return false;
    }
  }

  function snapshotCoordinatePoint(value) {
    const point = snapshotExactObject(value, ["x", "y"]);
    return point && Number.isSafeInteger(point.x) && Number.isSafeInteger(point.y) ? point : null;
  }

  function sameCoordinate(left, right) {
    return left.x === right.x && left.y === right.y;
  }

  function coordinateDto(point) {
    return { x: point.x, y: point.y };
  }

  function safeSubtract(left, right) {
    const result = left - right;
    return Number.isSafeInteger(result) ? result : null;
  }

  function safeMultiply(left, right) {
    const result = left * right;
    return Number.isSafeInteger(result) ? result : null;
  }

  function orientation(first, second, third) {
    const abx = safeSubtract(second.x, first.x);
    const aby = safeSubtract(second.y, first.y);
    const acx = safeSubtract(third.x, first.x);
    const acy = safeSubtract(third.y, first.y);
    if ([abx, aby, acx, acy].includes(null)) return null;
    const forward = safeMultiply(abx, acy);
    const backward = safeMultiply(aby, acx);
    if (forward === null || backward === null) return null;
    return safeSubtract(forward, backward);
  }

  function pointOnSegment(start, end, point, cross) {
    const value = cross === undefined ? orientation(start, end, point) : cross;
    return value === 0
      && point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x)
      && point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y);
  }

  function oppositeSigns(left, right) {
    return (left < 0 && right > 0) || (left > 0 && right < 0);
  }

  function classifySegmentIntersection(a, b, c, d) {
    try {
      const first = snapshotCoordinatePoint(a);
      const second = snapshotCoordinatePoint(b);
      const third = snapshotCoordinatePoint(c);
      const fourth = snapshotCoordinatePoint(d);
      if (!first || !second || !third || !fourth
        || sameCoordinate(first, second) || sameCoordinate(third, fourth)) return "invalid";
      a = first;
      b = second;
      c = third;
      d = fourth;
      const abC = orientation(a, b, c);
      const abD = orientation(a, b, d);
      const cdA = orientation(c, d, a);
      const cdB = orientation(c, d, b);
      if ([abC, abD, cdA, cdB].includes(null)) return "invalid";

      if (abC === 0 && abD === 0 && cdA === 0 && cdB === 0) {
        const axis = a.x !== b.x || c.x !== d.x ? "x" : "y";
        const overlapStart = Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
        const overlapEnd = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]));
        if (overlapStart > overlapEnd) return "none";
        if (overlapStart < overlapEnd) return "collinear-overlap";
        return "shared-endpoint";
      }

      if (oppositeSigns(abC, abD) && oppositeSigns(cdA, cdB)) return "proper-cross";

      const endpointShared = sameCoordinate(a, c) || sameCoordinate(a, d)
        || sameCoordinate(b, c) || sameCoordinate(b, d);
      const touches = pointOnSegment(a, b, c, abC) || pointOnSegment(a, b, d, abD)
        || pointOnSegment(c, d, a, cdA) || pointOnSegment(c, d, b, cdB);
      if (endpointShared && touches) return "shared-endpoint";
      if (touches) return "t-junction";
      return "none";
    } catch (_error) {
      return "invalid";
    }
  }

  function canonicalPair(first, second) {
    return first < second ? `${first}|${second}` : `${second}|${first}`;
  }

  const EDGE_ID_BY_PAIR = new Map(TARGET_EDGES.map((edge) => [canonicalPair(edge.a, edge.b), edge.id]));

  function snapshotUsedEdgeIds(value) {
    const snapshot = snapshotExactArray(value);
    if (!snapshot || snapshot.length > TARGET_EDGES.length) return null;
    const seen = new Set();
    for (let index = 0; index < snapshot.length; index += 1) {
      const edgeId = snapshot[index];
      if (typeof edgeId !== "string" || !EDGE_BY_ID.has(edgeId) || seen.has(edgeId)) return null;
      seen.add(edgeId);
    }
    return snapshot;
  }

  function maskFromEdgeIds(edgeIds) {
    let mask = 0;
    for (let index = 0; index < edgeIds.length; index += 1) mask |= 1 << EDGE_INDEX.get(edgeIds[index]);
    return mask;
  }

  function countCompletions(cursorId, usedEdgeIds) {
    try {
      const cleanUsedEdgeIds = snapshotUsedEdgeIds(usedEdgeIds);
      if (typeof cursorId !== "string" || !POINT_BY_ID.has(cursorId) || !cleanUsedEdgeIds) return null;
      const memo = new Map();
      const fullMask = (1 << TARGET_EDGES.length) - 1;
      const visit = (cursorIndex, mask) => {
        const key = `${cursorIndex}|${mask}`;
        if (memo.has(key)) return memo.get(key);
        if (mask === fullMask) return cursorIndex === POINT_INDEX.get(END_POINT_ID) ? 1 : 0;
        const cursor = POINTS[cursorIndex].id;
        let total = 0;
        for (let edgeIndex = 0; edgeIndex < TARGET_EDGES.length; edgeIndex += 1) {
          if ((mask & (1 << edgeIndex)) !== 0) continue;
          const edge = TARGET_EDGES[edgeIndex];
          let nextId = null;
          if (edge.a === cursor) nextId = edge.b;
          if (edge.b === cursor) nextId = edge.a;
          if (nextId !== null) total += visit(POINT_INDEX.get(nextId), mask | (1 << edgeIndex));
        }
        memo.set(key, total);
        return total;
      };
      return visit(POINT_INDEX.get(cursorId), maskFromEdgeIds(cleanUsedEdgeIds));
    } catch (_error) {
      return null;
    }
  }

  function normalizeEvaluationInput(input) {
    const normalized = snapshotExactObject(input, ["cursorId", "usedEdgeIds", "fromId", "toId"]);
    if (!normalized) return null;
    const usedEdgeIds = snapshotUsedEdgeIds(normalized.usedEdgeIds);
    if (typeof normalized.cursorId !== "string" || !POINT_BY_ID.has(normalized.cursorId)
      || typeof normalized.fromId !== "string" || !POINT_BY_ID.has(normalized.fromId)
      || typeof normalized.toId !== "string" || !POINT_BY_ID.has(normalized.toId)
      || normalized.fromId !== normalized.cursorId || normalized.fromId === normalized.toId
      || !usedEdgeIds) return null;
    normalized.usedEdgeIds = usedEdgeIds;
    return normalized;
  }

  function result(status, edgeId) {
    return deepFreeze({ status, edgeId: edgeId || null });
  }

  function evaluateConnection(input) {
    try {
      const normalized = normalizeEvaluationInput(input);
      if (!normalized) return result("invalid", null);
      const pair = canonicalPair(normalized.fromId, normalized.toId);
      const targetEdgeId = EDGE_ID_BY_PAIR.get(pair) || null;
      if (targetEdgeId && normalized.usedEdgeIds.includes(targetEdgeId)) return result("edge-used", null);

      const from = POINT_BY_ID.get(normalized.fromId);
      const to = POINT_BY_ID.get(normalized.toId);
      for (let index = 0; index < normalized.usedEdgeIds.length; index += 1) {
        const usedEdgeId = normalized.usedEdgeIds[index];
        const usedEdge = EDGE_BY_ID.get(usedEdgeId);
        const relation = classifySegmentIntersection(
          coordinateDto(from), coordinateDto(to),
          coordinateDto(POINT_BY_ID.get(usedEdge.a)), coordinateDto(POINT_BY_ID.get(usedEdge.b)),
        );
        if (["proper-cross", "t-junction", "collinear-overlap"].includes(relation)) return result("wire-crossed", null);
      }

      if (!targetEdgeId) return result("off-outline", null);
      const nextUsed = [...normalized.usedEdgeIds, targetEdgeId];
      if (countCompletions(normalized.toId, nextUsed) === 0) return result("future-stranded", null);
      return result("accepted", targetEdgeId);
    } catch (_error) {
      return result("invalid", null);
    }
  }

  function splitGraphemes(value) {
    try {
      if (typeof Intl === "object" && typeof Intl.Segmenter === "function") {
        return [...new Intl.Segmenter("und", { granularity: "grapheme" }).segment(value)].map((part) => part.segment);
      }
    } catch (_error) {
      // Fall through to a deterministic code-point fallback for older browsers.
    }
    return [...value];
  }

  function validDisplayText(value, maximum) {
    if (typeof value !== "string") return null;
    const clean = value.trim();
    const graphemes = splitGraphemes(clean);
    return graphemes.length >= 1 && graphemes.length <= maximum ? clean : null;
  }

  function normalizeConfig(raw) {
    try {
      const config = snapshotExactObject(raw, ["seats", "completionNote"]);
      if (!config) return cloneFrozen(DEFAULT_CONFIG);
      const seats = snapshotExactObject(config.seats, ["a", "b"]);
      const completionNote = validDisplayText(config.completionNote, 80);
      if (!seats || completionNote === null) return cloneFrozen(DEFAULT_CONFIG);
      const a = validDisplayText(seats.a, 12);
      const b = validDisplayText(seats.b, 12);
      if (a === null || b === null || a === b) return cloneFrozen(DEFAULT_CONFIG);
      return deepFreeze({ seats: { a, b }, completionNote });
    } catch (_error) {
      return cloneFrozen(DEFAULT_CONFIG);
    }
  }

  function makeState(fields) {
    const completedMoves = [];
    for (let index = 0; index < fields.completedMoves.length; index += 1) {
      completedMoves.push(cloneFrozen(fields.completedMoves[index]));
    }
    return deepFreeze({
      phase: fields.phase,
      cursorId: fields.cursorId,
      completedMoves,
      attempt: fields.attempt,
      lastResult: fields.lastResult ? cloneFrozen(fields.lastResult) : null,
      revision: fields.revision,
    });
  }

  function createInitialState() {
    return makeState({
      phase: "intro",
      cursorId: START_POINT_ID,
      completedMoves: [],
      attempt: 1,
      lastResult: null,
      revision: 0,
    });
  }

  function validMove(move, index) {
    return exactDataObject(move, MOVE_KEYS)
      && typeof move.edgeId === "string" && EDGE_BY_ID.has(move.edgeId)
      && typeof move.fromId === "string" && POINT_BY_ID.has(move.fromId)
      && typeof move.toId === "string" && POINT_BY_ID.has(move.toId)
      && move.seat === SEATS[index % SEATS.length]
      && Number.isSafeInteger(move.attempts) && move.attempts >= 1;
  }

  function validResult(value, statuses) {
    if (!exactDataObject(value, RESULT_KEYS) || !statuses.includes(value.status)) return false;
    return value.status === "accepted"
      ? typeof value.edgeId === "string" && EDGE_BY_ID.has(value.edgeId)
      : value.edgeId === null;
  }

  function rebuildMoves(moves) {
    try {
      if (!Array.isArray(moves) || moves.length > TARGET_EDGES.length) return null;
      let cursorId = START_POINT_ID;
      const usedEdgeIds = [];
      for (let index = 0; index < moves.length; index += 1) {
        const move = moves[index];
        if (!validMove(move, index) || move.fromId !== cursorId) return null;
        const resolution = evaluateConnection({ cursorId, usedEdgeIds, fromId: move.fromId, toId: move.toId });
        if (resolution.status !== "accepted" || resolution.edgeId !== move.edgeId) return null;
        usedEdgeIds.push(move.edgeId);
        cursorId = move.toId;
      }
      if (moves.length === TARGET_EDGES.length && cursorId !== END_POINT_ID) return null;
      return { cursorId, usedEdgeIds };
    } catch (_error) {
      return null;
    }
  }

  function snapshotState(value) {
    try {
      const snapshot = snapshotExactObject(value, STATE_KEYS);
      if (!snapshot) return null;
      const rawMoves = snapshotExactArray(snapshot.completedMoves);
      if (!rawMoves || rawMoves.length > TARGET_EDGES.length) return null;
      const completedMoves = [];
      for (let index = 0; index < rawMoves.length; index += 1) {
        const move = snapshotExactObject(rawMoves[index], MOVE_KEYS);
        if (!move) return null;
        completedMoves.push(move);
      }
      snapshot.completedMoves = completedMoves;
      if (snapshot.lastResult !== null) {
        snapshot.lastResult = snapshotExactObject(snapshot.lastResult, RESULT_KEYS);
        if (!snapshot.lastResult) return null;
      }
      if (!PHASES.includes(snapshot.phase)
        || typeof snapshot.cursorId !== "string" || !POINT_BY_ID.has(snapshot.cursorId)
        || !Number.isSafeInteger(snapshot.attempt) || snapshot.attempt < 1
        || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) return null;
      const rebuilt = rebuildMoves(snapshot.completedMoves);
      if (!rebuilt || rebuilt.cursorId !== snapshot.cursorId) return null;
      const count = snapshot.completedMoves.length;
      if (snapshot.phase === "intro") {
        if (count !== 0 || snapshot.cursorId !== START_POINT_ID || snapshot.attempt !== 1 || snapshot.lastResult !== null) return null;
      } else if (snapshot.phase === "handoff") {
        if (count >= TARGET_EDGES.length || snapshot.attempt !== 1 || snapshot.lastResult !== null) return null;
      } else if (snapshot.phase === "choosing") {
        if (count >= TARGET_EDGES.length || snapshot.lastResult !== null) return null;
      } else if (snapshot.phase === "jammed") {
        if (count >= TARGET_EDGES.length || !validResult(snapshot.lastResult, [
          "edge-used", "wire-crossed", "off-outline", "future-stranded",
        ])) return null;
      } else if (snapshot.phase === "edge-result") {
        if (count < 1 || count >= TARGET_EDGES.length
          || snapshot.attempt !== snapshot.completedMoves[count - 1].attempts
          || !validResult(snapshot.lastResult, ["accepted"])
          || snapshot.lastResult.edgeId !== snapshot.completedMoves[count - 1].edgeId) return null;
      } else if (snapshot.phase === "constellation-result" || snapshot.phase === "complete") {
        if (count !== TARGET_EDGES.length || snapshot.cursorId !== END_POINT_ID
          || snapshot.attempt !== snapshot.completedMoves[count - 1].attempts || snapshot.lastResult !== null) return null;
      } else return null;
      return makeState(snapshot);
    } catch (_error) {
      return null;
    }
  }

  const ACTION_KEYS = deepFreeze({
    START: ["type"],
    TAKE_OVER: ["type", "seat"],
    CONNECT: ["type", "seat", "fromId", "toId"],
    RETRY_EDGE: ["type"],
    NEXT_TURN: ["type"],
    FINISH: ["type"],
    RESTART: ["type"],
  });

  function normalizeAction(action) {
    if (!isPlainObject(action)) return null;
    const type = safeRead(action, "type");
    const keys = ACTION_KEYS[type];
    if (!keys) return null;
    const normalized = snapshotExactObject(action, keys);
    if (!normalized || normalized.type !== type) return null;
    if (type === "TAKE_OVER" && !SEATS.includes(normalized.seat)) return null;
    if (type === "CONNECT" && (!SEATS.includes(normalized.seat)
      || typeof normalized.fromId !== "string" || typeof normalized.toId !== "string")) return null;
    return normalized;
  }

  function changed(state, patch, fallback) {
    if (!Number.isSafeInteger(state.revision + 1)) return fallback;
    const next = makeState({ ...state, ...patch, revision: state.revision + 1 });
    return snapshotState(next) || fallback;
  }

  function reduce(state, action) {
    const current = snapshotState(state);
    if (!current) return createInitialState();
    const original = state;
    const cleanAction = normalizeAction(action);
    if (!cleanAction) return original;
    const currentSeat = current.completedMoves.length < TARGET_EDGES.length
      ? SEATS[current.completedMoves.length % SEATS.length]
      : null;

    if (cleanAction.type === "START") {
      return current.phase === "intro" ? changed(current, { phase: "handoff" }, original) : original;
    }
    if (cleanAction.type === "TAKE_OVER") {
      return current.phase === "handoff" && cleanAction.seat === currentSeat
        ? changed(current, { phase: "choosing" }, original)
        : original;
    }
    if (cleanAction.type === "CONNECT") {
      if (current.phase !== "choosing" || cleanAction.seat !== currentSeat || cleanAction.fromId !== current.cursorId) return original;
      const usedEdgeIds = [];
      for (let index = 0; index < current.completedMoves.length; index += 1) {
        usedEdgeIds.push(current.completedMoves[index].edgeId);
      }
      const resolution = evaluateConnection({
        cursorId: current.cursorId,
        usedEdgeIds,
        fromId: cleanAction.fromId,
        toId: cleanAction.toId,
      });
      if (resolution.status === "invalid") return original;
      if (resolution.status !== "accepted") return changed(current, { phase: "jammed", lastResult: resolution }, original);
      const completedMoves = [...current.completedMoves, {
        edgeId: resolution.edgeId,
        fromId: cleanAction.fromId,
        toId: cleanAction.toId,
        seat: currentSeat,
        attempts: current.attempt,
      }];
      if (completedMoves.length === TARGET_EDGES.length) {
        return changed(current, {
          phase: "constellation-result",
          cursorId: cleanAction.toId,
          completedMoves,
          lastResult: null,
        }, original);
      }
      return changed(current, {
        phase: "edge-result",
        cursorId: cleanAction.toId,
        completedMoves,
        lastResult: resolution,
      }, original);
    }
    if (cleanAction.type === "RETRY_EDGE") {
      if (current.phase !== "jammed" || !Number.isSafeInteger(current.attempt + 1)) return original;
      return changed(current, { phase: "choosing", attempt: current.attempt + 1, lastResult: null }, original);
    }
    if (cleanAction.type === "NEXT_TURN") {
      return current.phase === "edge-result"
        ? changed(current, { phase: "handoff", attempt: 1, lastResult: null }, original)
        : original;
    }
    if (cleanAction.type === "FINISH") {
      return current.phase === "constellation-result" ? changed(current, { phase: "complete" }, original) : original;
    }
    if (cleanAction.type === "RESTART") {
      if (current.phase !== "complete" || !Number.isSafeInteger(current.revision + 1)) return original;
      return makeState({
        phase: "intro",
        cursorId: START_POINT_ID,
        completedMoves: [],
        attempt: 1,
        lastResult: null,
        revision: current.revision + 1,
      });
    }
    return original;
  }

  function getPublicView(state) {
    const current = snapshotState(state);
    if (!current) return null;
    const seatCounts = { a: 0, b: 0 };
    for (let index = 0; index < current.completedMoves.length; index += 1) {
      seatCounts[current.completedMoves[index].seat] += 1;
    }
    return deepFreeze({
      phase: current.phase,
      points: POINTS.map((point) => ({ ...point })),
      targetEdges: TARGET_EDGES.map((edge) => ({ ...edge })),
      cursorId: current.cursorId,
      completedMoves: current.completedMoves.map((move) => ({ ...move })),
      completedCount: current.completedMoves.length,
      remainingCount: TARGET_EDGES.length - current.completedMoves.length,
      currentSeat: current.completedMoves.length < TARGET_EDGES.length
        ? SEATS[current.completedMoves.length % SEATS.length]
        : null,
      attempt: current.attempt,
      lastResult: current.lastResult ? { ...current.lastResult } : null,
      isComplete: current.phase === "complete",
      seatCounts,
      revision: current.revision,
    });
  }

  function validChallengePoint(point, index) {
    return exactDataObject(point, ["id", "x", "y", "role"])
      && typeof point.id === "string" && point.id.length > 0
      && Number.isSafeInteger(point.x) && point.x >= 0 && point.x <= 1000
      && Number.isSafeInteger(point.y) && point.y >= 0 && point.y <= 1000
      && point.role === (index === 0 ? "start" : index === 5 ? "end" : "node");
  }

  function challengeIsValid() {
    try {
      if (POINTS.length !== 9 || TARGET_EDGES.length !== 10
        || POINTS.some((point, index) => !validChallengePoint(point, index))
        || new Set(POINTS.map((point) => point.id)).size !== POINTS.length
        || POINTS[0].id !== START_POINT_ID || POINTS[5].id !== END_POINT_ID) return false;
      const pairIds = new Set();
      const edgeIds = new Set();
      const degrees = Object.fromEntries(POINTS.map((point) => [point.id, 0]));
      for (const edge of TARGET_EDGES) {
        if (!exactDataObject(edge, ["id", "a", "b"]) || typeof edge.id !== "string" || !edge.id
          || edgeIds.has(edge.id) || !POINT_BY_ID.has(edge.a) || !POINT_BY_ID.has(edge.b) || edge.a === edge.b) return false;
        const pair = canonicalPair(edge.a, edge.b);
        if (pairIds.has(pair)) return false;
        edgeIds.add(edge.id);
        pairIds.add(pair);
        degrees[edge.a] += 1;
        degrees[edge.b] += 1;
      }
      if (!sameData(POINTS.map((point) => degrees[point.id]), [1, 4, 2, 2, 2, 3, 2, 2, 2])) return false;
      const odd = POINTS.filter((point) => degrees[point.id] % 2 === 1).map((point) => point.id);
      if (!sameData(odd, [START_POINT_ID, END_POINT_ID])) return false;
      const visited = new Set([START_POINT_ID]);
      const queue = [START_POINT_ID];
      while (queue.length > 0) {
        const current = queue.shift();
        for (const edge of TARGET_EDGES) {
          const next = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
          if (next !== null && !visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      if (visited.size !== POINTS.length) return false;
      for (let left = 0; left < TARGET_EDGES.length; left += 1) {
        for (let right = left + 1; right < TARGET_EDGES.length; right += 1) {
          const first = TARGET_EDGES[left];
          const second = TARGET_EDGES[right];
          const relation = classifySegmentIntersection(
            coordinateDto(POINT_BY_ID.get(first.a)), coordinateDto(POINT_BY_ID.get(first.b)),
            coordinateDto(POINT_BY_ID.get(second.a)), coordinateDto(POINT_BY_ID.get(second.b)),
          );
          const sharesEndpoint = first.a === second.a || first.a === second.b || first.b === second.a || first.b === second.b;
          if ((!sharesEndpoint && relation !== "none") || (sharesEndpoint && relation !== "shared-endpoint")) return false;
        }
      }
      return countCompletions(START_POINT_ID, []) === 4;
    } catch (_error) {
      return false;
    }
  }

  if (!challengeIsValid()) throw new Error("CONSTELLATION_RELAY_SELF_CHECK_FAILED");

  return deepFreeze({
    POINTS,
    TARGET_EDGES,
    START_POINT_ID,
    END_POINT_ID,
    SEATS,
    RESULT_CODES,
    DEFAULT_CONFIG,
    normalizeConfig,
    classifySegmentIntersection,
    countCompletions,
    evaluateConnection,
    createInitialState,
    reduce,
    getPublicView,
  });
});
