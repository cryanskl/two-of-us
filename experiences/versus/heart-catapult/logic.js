(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.HeartCatapultLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const numberIsSafeInteger = Number.isSafeInteger;
  const objectFreeze = Object.freeze;
  const stringNormalize = String.prototype.normalize;
  const stringTrim = String.prototype.trim;
  const stringCharCodeAt = String.prototype.charCodeAt;
  const regexpReplace = RegExp.prototype[Symbol.replace];
  const stringConstructor = String;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;
  const whitespacePattern = /\s+/gu;

  const Q = 4096;
  const CONSTANTS = deepFreeze({
    WORLD_WIDTH_Q: 3932160,
    WORLD_HEIGHT_Q: 2211840,
    PROJECTILE_RADIUS_Q: 32768,
    LEFT_CENTER_BOUND_Q: 32768,
    RIGHT_CENTER_BOUND_Q: 3899392,
    TOP_CENTER_BOUND_Q: 32768,
    GROUND_SOLID_Y_Q: 1966080,
    GROUND_CENTER_Y_Q: 1933312,
    LOCAL_LAUNCH_X_Q: 475136,
    LOCAL_LAUNCH_Y_Q: 1671168,
    TARGET_ENTITY_LEFT_Q: 3375104,
    TARGET_ENTITY_RIGHT_Q: 3686400,
    TARGET_ENTITY_TOP_Q: 1540096,
    TARGET_ENTITY_BOTTOM_Q: 1966080,
    TARGET_COLLISION_LEFT_Q: 3342336,
    TARGET_COLLISION_RIGHT_Q: 3719168,
    TARGET_COLLISION_TOP_Q: 1507328,
    TARGET_COLLISION_BOTTOM_Q: 1933312,
    GRAVITY_Q12: 640,
    BOUNCE_X_NUMERATOR: 3,
    BOUNCE_X_DENOMINATOR: 4,
    BOUNCE_Y_NUMERATOR: 1,
    BOUNCE_Y_DENOMINATOR: 2,
    MAX_BOUNCES: 1,
    MAX_TICKS: 224,
    TARGET_SCORE: 3,
    MAX_ROUNDS: 12,
    DEFAULT_ANGLE_INDEX: 4,
    DEFAULT_POWER_INDEX: 4,
    MAX_EVENT_COORD_Q: 8000000,
  });
  const ANGLE_DEGREES = deepFreeze([15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
  const COS_Q12 = deepFreeze([3956, 3849, 3712, 3547, 3355, 3138, 2896, 2633, 2349, 2048, 1731]);
  const SIN_Q12 = deepFreeze([1060, 1401, 1731, 2048, 2349, 2633, 2896, 3138, 3355, 3547, 3712]);
  const POWER2_VALUES = deepFreeze([16, 17, 18, 19, 20, 21, 22, 23, 24]);
  const RECORD_KEYS = deepFreeze(["xQ", "yQ", "nextXQ", "nextYQ", "bounceCount"]);
  const CONFIG_KEYS = deepFreeze(["playerNames"]);
  const ARRAY_KEYS = deepFreeze(["0", "1", "length"]);

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return value;
    }
    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return objectFreeze(value);
  }

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function sameKeys(actual, expected) {
    if (actual.length !== expected.length) return false;
    for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
      let found = false;
      for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
        if (actual[actualIndex] === expected[expectedIndex]) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function snapshotRecord(value, expectedKeys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let keys;
    let nativeArray;
    try {
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
      nativeArray = arrayIsArray(value);
    } catch (_error) {
      return null;
    }
    if (nativeArray || prototype !== objectPrototype || !sameKeys(keys, expectedKeys)) return null;

    const snapshot = {};
    for (let index = 0; index < expectedKeys.length; index += 1) {
      const key = expectedKeys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  }

  function snapshotPair(value) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let keys;
    let nativeArray;
    try {
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
      nativeArray = arrayIsArray(value);
    } catch (_error) {
      return null;
    }
    if (!nativeArray || prototype !== arrayPrototype || !sameKeys(keys, ARRAY_KEYS)) return null;

    const result = [];
    for (let index = 0; index < 2; index += 1) {
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, stringConstructor(index));
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }
    let lengthDescriptor;
    try {
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
      || lengthDescriptor.value !== 2) return null;
    return result;
  }

  function containsForbiddenNameCodePoint(value) {
    for (let index = 0; index < value.length; index += 1) {
      const first = call(stringCharCodeAt, value, [index]);
      if ((first >= 0xd800 && first <= 0xdbff)) {
        if (index + 1 >= value.length) return true;
        const second = call(stringCharCodeAt, value, [index + 1]);
        if (second < 0xdc00 || second > 0xdfff) return true;
        index += 1;
        continue;
      }
      if (first >= 0xdc00 && first <= 0xdfff) return true;
      if (first <= 0x1f || (first >= 0x7f && first <= 0x9f)
        || first === 0x061c || first === 0x200e || first === 0x200f
        || (first >= 0x202a && first <= 0x202e)
        || (first >= 0x2066 && first <= 0x2069)) return true;
    }
    return false;
  }

  function codePointLength(value) {
    let count = 0;
    for (let index = 0; index < value.length; index += 1) {
      const first = call(stringCharCodeAt, value, [index]);
      if (first >= 0xd800 && first <= 0xdbff) index += 1;
      count += 1;
    }
    return count;
  }

  function normalizeName(value) {
    if (typeof value !== "string" || containsForbiddenNameCodePoint(value)) return null;
    let normalized;
    try {
      normalized = call(stringNormalize, value, ["NFC"]);
      normalized = call(regexpReplace, whitespacePattern, [normalized, " "]);
      normalized = call(stringTrim, normalized, []);
    } catch (_error) {
      return null;
    }
    if (containsForbiddenNameCodePoint(normalized)) return null;
    const length = codePointLength(normalized);
    return length >= 1 && length <= 12 ? normalized : null;
  }

  function makeConfig(first, second) {
    return deepFreeze({ playerNames: [first, second] });
  }

  const DEFAULT_CONFIG = makeConfig("你", "TA");

  function sanitizeConfig(raw) {
    const record = snapshotRecord(raw, CONFIG_KEYS);
    const pair = record === null ? null : snapshotPair(record.playerNames);
    if (pair !== null) {
      const first = normalizeName(pair[0]);
      const second = normalizeName(pair[1]);
      if (first !== null && second !== null && first !== second) return makeConfig(first, second);
    }
    return makeConfig(DEFAULT_CONFIG.playerNames[0], DEFAULT_CONFIG.playerNames[1]);
  }

  function isSafe(value) {
    return typeof value === "number" && numberIsSafeInteger(value);
  }

  function safeAdd(left, right) {
    if (!isSafe(left) || !isSafe(right)) return null;
    const result = left + right;
    return isSafe(result) ? result : null;
  }

  function safeSubtract(left, right) {
    if (!isSafe(left) || !isSafe(right)) return null;
    const result = left - right;
    return isSafe(result) ? result : null;
  }

  function safeMultiply(left, right) {
    if (!isSafe(left) || !isSafe(right)) return null;
    const result = left * right;
    return isSafe(result) ? result : null;
  }

  function roundEven(numerator, denominator) {
    if (!isSafe(numerator) || !isSafe(denominator) || denominator <= 0) return null;
    if (numerator === 0) return 0;
    const negative = numerator < 0;
    const absolute = negative ? -numerator : numerator;
    const remainder = absolute % denominator;
    const quotient = (absolute - remainder) / denominator;
    const complement = denominator - remainder;
    let rounded = quotient;
    if (remainder > complement || (remainder === complement && quotient % 2 !== 0)) {
      rounded += 1;
    }
    if (!isSafe(rounded)) return null;
    if (rounded === 0) return 0;
    return negative ? -rounded : rounded;
  }

  function mirrorXQ(xQ, seat) {
    if (!isSafe(xQ) || xQ < 0 || xQ > CONSTANTS.WORLD_WIDTH_Q
      || !isSafe(seat) || (seat !== 0 && seat !== 1)) return null;
    return seat === 0 ? xQ : CONSTANTS.WORLD_WIDTH_Q - xQ;
  }

  function greatestCommonDivisor(left, right) {
    let a = left < 0 ? -left : left;
    let b = right < 0 ? -right : right;
    while (b !== 0) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }
    return a;
  }

  function makeRational(numerator, denominator) {
    if (!isSafe(numerator) || !isSafe(denominator) || denominator === 0) return null;
    let top = numerator;
    let bottom = denominator;
    if (bottom < 0) {
      top = -top;
      bottom = -bottom;
    }
    if (!isSafe(top) || !isSafe(bottom) || bottom <= 0) return null;
    if (top === 0) return { numerator: 0, denominator: 1 };
    const divisor = greatestCommonDivisor(top, bottom);
    return {
      numerator: top / divisor,
      denominator: bottom / divisor,
    };
  }

  function compareRationals(left, right) {
    const leftProduct = safeMultiply(left.numerator, right.denominator);
    const rightProduct = safeMultiply(right.numerator, left.denominator);
    if (leftProduct === null || rightProduct === null) return null;
    if (leftProduct < rightProduct) return -1;
    if (leftProduct > rightProduct) return 1;
    return 0;
  }

  function axisInterval(start, delta, minimum, maximum) {
    if (delta === 0) {
      return start >= minimum && start <= maximum
        ? { entry: null, exit: null }
        : false;
    }
    const minimumDelta = safeSubtract(minimum, start);
    const maximumDelta = safeSubtract(maximum, start);
    if (minimumDelta === null || maximumDelta === null) return null;
    const first = makeRational(minimumDelta, delta);
    const second = makeRational(maximumDelta, delta);
    if (first === null || second === null) return null;
    const comparison = compareRationals(first, second);
    if (comparison === null) return null;
    return comparison <= 0
      ? { entry: first, exit: second }
      : { entry: second, exit: first };
  }

  function castleIntersection(xQ, yQ, deltaXQ, deltaYQ) {
    const xInterval = axisInterval(
      xQ,
      deltaXQ,
      CONSTANTS.TARGET_COLLISION_LEFT_Q,
      CONSTANTS.TARGET_COLLISION_RIGHT_Q,
    );
    const yInterval = axisInterval(
      yQ,
      deltaYQ,
      CONSTANTS.TARGET_COLLISION_TOP_Q,
      CONSTANTS.TARGET_COLLISION_BOTTOM_Q,
    );
    if (xInterval === null || yInterval === null) return null;
    if (xInterval === false || yInterval === false) return false;

    let entry = makeRational(0, 1);
    let exit = makeRational(1, 1);
    const intervals = [xInterval, yInterval];
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (interval.entry !== null) {
        const entryComparison = compareRationals(interval.entry, entry);
        if (entryComparison === null) return null;
        if (entryComparison > 0) entry = interval.entry;
      }
      if (interval.exit !== null) {
        const exitComparison = compareRationals(interval.exit, exit);
        if (exitComparison === null) return null;
        if (exitComparison < 0) exit = interval.exit;
      }
    }
    const overlapComparison = compareRationals(entry, exit);
    if (overlapComparison === null) return null;
    return overlapComparison <= 0 ? entry : false;
  }

  function eventPriority(type) {
    if (type === "castle") return 0;
    if (type === "ground") return 1;
    if (type === "horizontal-exit") return 2;
    return 3;
  }

  function pickEarlier(current, candidate) {
    if (current === null) return candidate;
    const comparison = compareRationals(candidate.t, current.t);
    if (comparison === null) return false;
    if (comparison < 0
      || (comparison === 0 && eventPriority(candidate.type) < eventPriority(current.type))) {
      return candidate;
    }
    return current;
  }

  function interpolatedCoordinate(start, delta, time) {
    const base = safeMultiply(start, time.denominator);
    const movement = safeMultiply(delta, time.numerator);
    const numerator = base === null || movement === null ? null : safeAdd(base, movement);
    return numerator === null ? null : roundEven(numerator, time.denominator);
  }

  function makeContact(type, time, xQ, yQ, deltaXQ, deltaYQ, horizontalBoundary) {
    let contactX = interpolatedCoordinate(xQ, deltaXQ, time);
    let contactY = interpolatedCoordinate(yQ, deltaYQ, time);
    if (contactX === null || contactY === null) return null;
    if (type === "ground") contactY = CONSTANTS.GROUND_CENTER_Y_Q;
    if (type === "horizontal-exit") contactX = horizontalBoundary;
    if (type === "top-exit") contactY = CONSTANTS.TOP_CENTER_BOUND_Q;
    return { xQ: contactX, yQ: contactY };
  }

  function resolveSegmentEvent(input) {
    const record = snapshotRecord(input, RECORD_KEYS);
    if (record === null) return null;
    const coordinateKeys = ["xQ", "yQ", "nextXQ", "nextYQ"];
    for (let index = 0; index < coordinateKeys.length; index += 1) {
      const coordinate = record[coordinateKeys[index]];
      if (!isSafe(coordinate)
        || coordinate < -CONSTANTS.MAX_EVENT_COORD_Q
        || coordinate > CONSTANTS.MAX_EVENT_COORD_Q) return null;
    }
    if (!isSafe(record.bounceCount)
      || (record.bounceCount !== 0 && record.bounceCount !== 1)) return null;

    const deltaXQ = safeSubtract(record.nextXQ, record.xQ);
    const deltaYQ = safeSubtract(record.nextYQ, record.yQ);
    if (deltaXQ === null || deltaYQ === null) return null;

    let winner = null;
    const castleTime = castleIntersection(record.xQ, record.yQ, deltaXQ, deltaYQ);
    if (castleTime === null) return null;
    if (castleTime !== false) winner = { type: "castle", t: castleTime };

    if (record.yQ < CONSTANTS.GROUND_CENTER_Y_Q
      && record.nextYQ >= CONSTANTS.GROUND_CENTER_Y_Q && deltaYQ > 0) {
      const groundDistance = safeSubtract(CONSTANTS.GROUND_CENTER_Y_Q, record.yQ);
      const groundTime = groundDistance === null ? null : makeRational(groundDistance, deltaYQ);
      if (groundTime === null) return null;
      winner = pickEarlier(winner, { type: "ground", t: groundTime });
      if (winner === false) return null;
    }

    let horizontalBoundary = null;
    let horizontalTime = null;
    if (record.xQ >= CONSTANTS.LEFT_CENTER_BOUND_Q
      && record.xQ <= CONSTANTS.RIGHT_CENTER_BOUND_Q
      && record.nextXQ > CONSTANTS.RIGHT_CENTER_BOUND_Q && deltaXQ > 0) {
      const distance = safeSubtract(CONSTANTS.RIGHT_CENTER_BOUND_Q, record.xQ);
      horizontalTime = distance === null ? null : makeRational(distance, deltaXQ);
      horizontalBoundary = CONSTANTS.RIGHT_CENTER_BOUND_Q;
    } else if (record.xQ >= CONSTANTS.LEFT_CENTER_BOUND_Q
      && record.xQ <= CONSTANTS.RIGHT_CENTER_BOUND_Q
      && record.nextXQ < CONSTANTS.LEFT_CENTER_BOUND_Q && deltaXQ < 0) {
      const distance = safeSubtract(CONSTANTS.LEFT_CENTER_BOUND_Q, record.xQ);
      horizontalTime = distance === null ? null : makeRational(distance, deltaXQ);
      horizontalBoundary = CONSTANTS.LEFT_CENTER_BOUND_Q;
    }
    if ((horizontalBoundary !== null && horizontalTime === null)) return null;
    if (horizontalTime !== null) {
      winner = pickEarlier(winner, {
        type: "horizontal-exit",
        t: horizontalTime,
        horizontalBoundary,
      });
      if (winner === false) return null;
    }

    if (record.yQ >= CONSTANTS.TOP_CENTER_BOUND_Q
      && record.nextYQ < CONSTANTS.TOP_CENTER_BOUND_Q && deltaYQ < 0) {
      const distance = safeSubtract(CONSTANTS.TOP_CENTER_BOUND_Q, record.yQ);
      const topTime = distance === null ? null : makeRational(distance, deltaYQ);
      if (topTime === null) return null;
      winner = pickEarlier(winner, { type: "top-exit", t: topTime });
      if (winner === false) return null;
    }

    if (winner === null) {
      return deepFreeze({ type: "none", t: null, contact: null });
    }
    const contact = makeContact(
      winner.type,
      winner.t,
      record.xQ,
      record.yQ,
      deltaXQ,
      deltaYQ,
      winner.horizontalBoundary,
    );
    if (contact === null) return null;
    return deepFreeze({
      type: winner.type,
      t: {
        numerator: winner.t.numerator,
        denominator: winner.t.denominator,
      },
      contact,
    });
  }

  function finishShot(outcome, terminalReason, bounceCount, terminalTick, frames) {
    return deepFreeze({
      outcome,
      terminalReason,
      bounceCount,
      terminalTick,
      frames,
    });
  }

  function simulateShot(angleIndex, powerIndex) {
    if (!isSafe(angleIndex) || angleIndex < 0 || angleIndex >= ANGLE_DEGREES.length
      || !isSafe(powerIndex) || powerIndex < 0 || powerIndex >= POWER2_VALUES.length) {
      return null;
    }

    const speedQ12 = safeMultiply(POWER2_VALUES[powerIndex], Q / 2);
    const horizontalProduct = speedQ12 === null
      ? null : safeMultiply(speedQ12, COS_Q12[angleIndex]);
    const verticalProduct = speedQ12 === null
      ? null : safeMultiply(speedQ12, SIN_Q12[angleIndex]);
    let velocityXQ = horizontalProduct === null ? null : roundEven(horizontalProduct, Q);
    const initialVertical = verticalProduct === null ? null : roundEven(verticalProduct, Q);
    let velocityYQ = initialVertical === null ? null : -initialVertical;
    if (velocityXQ === null || velocityYQ === null) return null;

    let xQ = CONSTANTS.LOCAL_LAUNCH_X_Q;
    let yQ = CONSTANTS.LOCAL_LAUNCH_Y_Q;
    let bounceCount = 0;
    const frames = [{
      tick: 0,
      xQ,
      yQ,
      event: "launch",
    }];

    for (let tick = 1; tick <= CONSTANTS.MAX_TICKS; tick += 1) {
      const candidateVelocityYQ = safeAdd(velocityYQ, CONSTANTS.GRAVITY_Q12);
      const nextXQ = safeAdd(xQ, velocityXQ);
      const nextYQ = candidateVelocityYQ === null ? null : safeAdd(yQ, candidateVelocityYQ);
      if (candidateVelocityYQ === null || nextXQ === null || nextYQ === null) return null;
      const event = resolveSegmentEvent({
        xQ,
        yQ,
        nextXQ,
        nextYQ,
        bounceCount,
      });
      if (event === null) return null;

      if (event.type === "castle") {
        frames.push({ tick, xQ: event.contact.xQ, yQ: event.contact.yQ, event: "hit" });
        return finishShot(
          bounceCount === 0 ? "direct-hit" : "bounce-hit",
          "castle",
          bounceCount,
          tick,
          frames,
        );
      }
      if (event.type === "ground") {
        frames.push({
          tick,
          xQ: event.contact.xQ,
          yQ: event.contact.yQ,
          event: bounceCount === 0 ? "bounce" : "miss",
        });
        if (bounceCount === CONSTANTS.MAX_BOUNCES) {
          return finishShot("miss", "second-ground", bounceCount, tick, frames);
        }
        const horizontalBounceProduct = safeMultiply(
          velocityXQ,
          CONSTANTS.BOUNCE_X_NUMERATOR,
        );
        const postBounceX = horizontalBounceProduct === null
          ? null : roundEven(horizontalBounceProduct, CONSTANTS.BOUNCE_X_DENOMINATOR);
        const postBounceYMagnitude = roundEven(
          candidateVelocityYQ,
          CONSTANTS.BOUNCE_Y_DENOMINATOR,
        );
        if (postBounceX === null || postBounceYMagnitude === null) return null;
        xQ = event.contact.xQ;
        yQ = event.contact.yQ;
        velocityXQ = postBounceX;
        velocityYQ = -postBounceYMagnitude;
        bounceCount += 1;
        continue;
      }
      if (event.type === "horizontal-exit" || event.type === "top-exit") {
        frames.push({ tick, xQ: event.contact.xQ, yQ: event.contact.yQ, event: "miss" });
        return finishShot(
          "miss",
          event.type === "horizontal-exit" ? "horizontal-exit" : "top-exit",
          bounceCount,
          tick,
          frames,
        );
      }

      xQ = nextXQ;
      yQ = nextYQ;
      velocityYQ = candidateVelocityYQ;
      frames.push({
        tick,
        xQ,
        yQ,
        event: tick === CONSTANTS.MAX_TICKS ? "miss" : "flight",
      });
      if (tick === CONSTANTS.MAX_TICKS) {
        return finishShot("miss", "timeout", bounceCount, tick, frames);
      }
    }
    return null;
  }

  const STATE_KEYS = deepFreeze([
    "phase", "revision", "openingSeat", "round", "firstSeat", "activeSeat",
    "sealedAims", "shotResults", "flightSeat", "flightToken", "scores",
    "history", "winner", "drawReason", "config",
  ]);
  const AIM_KEYS = deepFreeze(["angleIndex", "powerIndex"]);
  const SHOT_KEYS = deepFreeze([
    "outcome", "terminalReason", "bounceCount", "terminalTick", "frames",
  ]);
  const FRAME_KEYS = deepFreeze(["tick", "xQ", "yQ", "event"]);
  const HISTORY_KEYS = deepFreeze([
    "round", "firstSeat", "aims", "outcomes", "roundHits", "scoresAfter",
  ]);
  const SUMMARY_KEYS = deepFreeze([
    "outcome", "terminalReason", "bounceCount", "terminalTick",
  ]);
  const PHASES = deepFreeze([
    "intro", "handoff", "aiming", "reveal-ready", "flying",
    "round-result", "complete",
  ]);

  function isSeat(value) {
    return value === 0 || value === 1;
  }

  function isOneOf(value, choices) {
    for (let index = 0; index < choices.length; index += 1) {
      if (value === choices[index]) return true;
    }
    return false;
  }

  function snapshotDenseArray(value, minimumLength, maximumLength) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let keys;
    let nativeArray;
    let lengthDescriptor;
    try {
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
      nativeArray = arrayIsArray(value);
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (!nativeArray || prototype !== arrayPrototype || lengthDescriptor === undefined
      || !("value" in lengthDescriptor) || !isSafe(lengthDescriptor.value)
      || lengthDescriptor.value < minimumLength || lengthDescriptor.value > maximumLength
      || keys.length !== lengthDescriptor.value + 1) return null;
    const length = lengthDescriptor.value;
    const result = [];
    for (let index = 0; index < length; index += 1) {
      const key = stringConstructor(index);
      let found = false;
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (keys[keyIndex] === key) {
          found = true;
          break;
        }
      }
      if (!found) return null;
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }
    let lengthCount = 0;
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      if (keys[keyIndex] === "length") lengthCount += 1;
      else if (typeof keys[keyIndex] !== "string") return null;
    }
    return lengthCount === 1 ? result : null;
  }

  function snapshotAnyRecord(value) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let keys;
    let nativeArray;
    try {
      prototype = reflectGetPrototypeOf(value);
      keys = reflectOwnKeys(value);
      nativeArray = arrayIsArray(value);
    } catch (_error) {
      return null;
    }
    if (nativeArray || prototype !== objectPrototype) return null;
    const snapshot = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (typeof key !== "string") return null;
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return { keys, values: snapshot };
  }

  function normalizeAim(value) {
    const record = snapshotRecord(value, AIM_KEYS);
    if (record === null || !isSafe(record.angleIndex)
      || record.angleIndex < 0 || record.angleIndex >= ANGLE_DEGREES.length
      || !isSafe(record.powerIndex)
      || record.powerIndex < 0 || record.powerIndex >= POWER2_VALUES.length) return null;
    return { angleIndex: record.angleIndex, powerIndex: record.powerIndex };
  }

  function normalizeAimPair(value, allowNull) {
    const pair = snapshotPair(value);
    if (pair === null) return null;
    const result = [];
    for (let seat = 0; seat < 2; seat += 1) {
      if (allowNull && pair[seat] === null) result[seat] = null;
      else {
        result[seat] = normalizeAim(pair[seat]);
        if (result[seat] === null) return null;
      }
    }
    return result;
  }

  function shotSummary(result) {
    return {
      outcome: result.outcome,
      terminalReason: result.terminalReason,
      bounceCount: result.bounceCount,
      terminalTick: result.terminalTick,
    };
  }

  function sameSummary(left, right) {
    return left.outcome === right.outcome
      && left.terminalReason === right.terminalReason
      && left.bounceCount === right.bounceCount
      && left.terminalTick === right.terminalTick;
  }

  function normalizeSummary(value) {
    const record = snapshotRecord(value, SUMMARY_KEYS);
    if (record === null
      || !isOneOf(record.outcome, ["direct-hit", "bounce-hit", "miss"])
      || !isOneOf(record.terminalReason, [
        "castle", "second-ground", "horizontal-exit", "top-exit", "timeout",
      ])
      || !isSafe(record.bounceCount)
      || (record.bounceCount !== 0 && record.bounceCount !== 1)
      || !isSafe(record.terminalTick)
      || record.terminalTick < 1 || record.terminalTick > CONSTANTS.MAX_TICKS) return null;
    if ((record.outcome === "direct-hit"
      && (record.terminalReason !== "castle" || record.bounceCount !== 0))
      || (record.outcome === "bounce-hit"
        && (record.terminalReason !== "castle" || record.bounceCount !== 1))
      || (record.outcome === "miss" && record.terminalReason === "castle")) return null;
    return {
      outcome: record.outcome,
      terminalReason: record.terminalReason,
      bounceCount: record.bounceCount,
      terminalTick: record.terminalTick,
    };
  }

  function normalizeShotResult(value) {
    const record = snapshotRecord(value, SHOT_KEYS);
    if (record === null) return null;
    const summary = normalizeSummary({
      outcome: record.outcome,
      terminalReason: record.terminalReason,
      bounceCount: record.bounceCount,
      terminalTick: record.terminalTick,
    });
    if (summary === null) return null;
    const rawFrames = snapshotDenseArray(record.frames, 2, CONSTANTS.MAX_TICKS + 1);
    if (rawFrames === null) return null;
    const frames = [];
    for (let index = 0; index < rawFrames.length; index += 1) {
      const frame = snapshotRecord(rawFrames[index], FRAME_KEYS);
      if (frame === null || !isSafe(frame.tick) || frame.tick !== index
        || !isSafe(frame.xQ) || !isSafe(frame.yQ)
        || !isOneOf(frame.event, ["launch", "flight", "bounce", "hit", "miss"])) return null;
      frames[index] = {
        tick: frame.tick,
        xQ: frame.xQ,
        yQ: frame.yQ,
        event: frame.event,
      };
    }
    if (frames[0].event !== "launch"
      || frames[frames.length - 1].tick !== summary.terminalTick
      || (summary.outcome === "direct-hit" || summary.outcome === "bounce-hit"
        ? frames[frames.length - 1].event !== "hit"
        : frames[frames.length - 1].event !== "miss")) return null;
    return {
      outcome: summary.outcome,
      terminalReason: summary.terminalReason,
      bounceCount: summary.bounceCount,
      terminalTick: summary.terminalTick,
      frames,
    };
  }

  function sameShotResult(left, right) {
    if (!sameSummary(left, right) || left.frames.length !== right.frames.length) return false;
    for (let index = 0; index < left.frames.length; index += 1) {
      const a = left.frames[index];
      const b = right.frames[index];
      if (a.tick !== b.tick || a.xQ !== b.xQ || a.yQ !== b.yQ || a.event !== b.event) {
        return false;
      }
    }
    return true;
  }

  function strictConfig(value) {
    const record = snapshotRecord(value, CONFIG_KEYS);
    const pair = record === null ? null : snapshotPair(record.playerNames);
    if (pair === null) return null;
    const first = normalizeName(pair[0]);
    const second = normalizeName(pair[1]);
    if (first === null || second === null || first === second
      || first !== pair[0] || second !== pair[1]) return null;
    return makeConfig(first, second);
  }

  function normalizeNumberPair(value, maximum) {
    const pair = snapshotPair(value);
    if (pair === null) return null;
    for (let index = 0; index < 2; index += 1) {
      if (!isSafe(pair[index]) || pair[index] < 0
        || (maximum !== null && pair[index] > maximum)) return null;
    }
    return [pair[0], pair[1]];
  }

  function normalizeHistory(value, openingSeat) {
    const rawHistory = snapshotDenseArray(value, 0, CONSTANTS.MAX_ROUNDS);
    if (rawHistory === null) return null;
    const history = [];
    let priorScores = [0, 0];
    let decisiveWinner = null;
    for (let index = 0; index < rawHistory.length; index += 1) {
      const record = snapshotRecord(rawHistory[index], HISTORY_KEYS);
      if (record === null || record.round !== index + 1
        || record.firstSeat !== (openingSeat + index) % 2) return null;
      const aims = normalizeAimPair(record.aims, false);
      const suppliedOutcomes = snapshotPair(record.outcomes);
      const suppliedHits = normalizeNumberPair(record.roundHits, 1);
      const suppliedScores = normalizeNumberPair(record.scoresAfter, CONSTANTS.MAX_ROUNDS);
      if (aims === null || suppliedOutcomes === null
        || suppliedHits === null || suppliedScores === null) return null;
      const outcomes = [];
      const hits = [];
      const scoresAfter = [];
      for (let seat = 0; seat < 2; seat += 1) {
        const expected = simulateShot(aims[seat].angleIndex, aims[seat].powerIndex);
        const supplied = normalizeSummary(suppliedOutcomes[seat]);
        if (expected === null || supplied === null
          || !sameSummary(supplied, expected)) return null;
        outcomes[seat] = shotSummary(expected);
        hits[seat] = expected.outcome === "miss" ? 0 : 1;
        scoresAfter[seat] = priorScores[seat] + hits[seat];
        if (suppliedHits[seat] !== hits[seat]
          || suppliedScores[seat] !== scoresAfter[seat]) return null;
      }
      history[index] = {
        round: index + 1,
        firstSeat: record.firstSeat,
        aims,
        outcomes,
        roundHits: hits,
        scoresAfter,
      };
      priorScores = scoresAfter;
      if (scoresAfter[0] >= CONSTANTS.TARGET_SCORE
        && scoresAfter[0] > scoresAfter[1]) decisiveWinner = 0;
      if (scoresAfter[1] >= CONSTANTS.TARGET_SCORE
        && scoresAfter[1] > scoresAfter[0]) decisiveWinner = 1;
      if (decisiveWinner !== null && index !== rawHistory.length - 1) return null;
    }
    return { history, scores: priorScores, decisiveWinner };
  }

  function maxRemainingActions(state) {
    if (state.phase === "intro") return 96;
    if (state.phase === "complete") return 0;
    let current = 0;
    if (state.phase === "handoff") {
      current = state.sealedAims[state.firstSeat] === null ? 7 : 5;
    } else if (state.phase === "aiming") {
      current = state.sealedAims[state.firstSeat] === null ? 6 : 4;
    } else if (state.phase === "reveal-ready") current = 3;
    else if (state.phase === "flying") current = state.flightSeat === state.firstSeat ? 2 : 1;
    return current + (CONSTANTS.MAX_ROUNDS - state.round) * 8;
  }

  function normalizeState(value) {
    const record = snapshotRecord(value, STATE_KEYS);
    if (record === null || !isOneOf(record.phase, PHASES)
      || !isSafe(record.revision) || record.revision < 0
      || !isSeat(record.openingSeat)
      || !isSafe(record.round) || record.round < 1 || record.round > CONSTANTS.MAX_ROUNDS
      || !isSeat(record.firstSeat)
      || record.firstSeat !== (record.openingSeat + record.round - 1) % 2
      || !(record.activeSeat === null || isSeat(record.activeSeat))
      || !(record.flightSeat === null || isSeat(record.flightSeat))
      || !(record.flightToken === null
        || (isSafe(record.flightToken) && record.flightToken >= 0))
      || !(record.winner === null || isSeat(record.winner))
      || !(record.drawReason === null || record.drawReason === "round-cap")) return null;
    const config = strictConfig(record.config);
    const aims = normalizeAimPair(record.sealedAims, true);
    const scores = normalizeNumberPair(record.scores, CONSTANTS.MAX_ROUNDS);
    const replay = normalizeHistory(record.history, record.openingSeat);
    if (config === null || aims === null || scores === null || replay === null
      || scores[0] !== replay.scores[0] || scores[1] !== replay.scores[1]) return null;
    if (record.phase !== "complete" && replay.decisiveWinner !== null) return null;

    let results = null;
    if (record.shotResults !== null) {
      const pair = snapshotPair(record.shotResults);
      if (pair === null) return null;
      results = [];
      for (let seat = 0; seat < 2; seat += 1) {
        const supplied = normalizeShotResult(pair[seat]);
        if (aims[seat] === null || supplied === null) return null;
        const expected = simulateShot(aims[seat].angleIndex, aims[seat].powerIndex);
        if (expected === null || !sameShotResult(supplied, expected)) return null;
        results[seat] = expected;
      }
    }

    const firstAim = aims[record.firstSeat];
    const secondAim = aims[1 - record.firstSeat];
    const ongoingHistoryLength = record.round - 1;
    const settledHistoryLength = record.round;
    const clearFlight = record.flightSeat === null && record.flightToken === null;
    let valid = false;
    if (record.phase === "intro") {
      valid = record.revision >= 0 && record.round === 1
        && record.openingSeat === record.firstSeat && record.activeSeat === null
        && firstAim === null && secondAim === null && results === null && clearFlight
        && replay.history.length === 0 && scores[0] === 0 && scores[1] === 0
        && record.winner === null && record.drawReason === null;
    } else if (record.phase === "handoff" || record.phase === "aiming") {
      const firstTurn = firstAim === null && secondAim === null;
      const secondTurn = firstAim !== null && secondAim === null;
      valid = (firstTurn || secondTurn)
        && record.activeSeat === (firstTurn ? record.firstSeat : 1 - record.firstSeat)
        && results === null && clearFlight
        && replay.history.length === ongoingHistoryLength
        && record.winner === null && record.drawReason === null;
    } else if (record.phase === "reveal-ready") {
      valid = firstAim !== null && secondAim !== null && results !== null
        && record.activeSeat === null && clearFlight
        && replay.history.length === ongoingHistoryLength
        && record.winner === null && record.drawReason === null;
    } else if (record.phase === "flying") {
      valid = firstAim !== null && secondAim !== null && results !== null
        && record.activeSeat === null
        && (record.flightSeat === record.firstSeat
          || record.flightSeat === 1 - record.firstSeat)
        && record.flightToken === record.revision
        && replay.history.length === ongoingHistoryLength
        && record.winner === null && record.drawReason === null;
    } else if (record.phase === "round-result") {
      valid = record.round < CONSTANTS.MAX_ROUNDS && firstAim === null && secondAim === null
        && results === null && record.activeSeat === null && clearFlight
        && replay.history.length === settledHistoryLength
        && replay.decisiveWinner === null
        && record.winner === null && record.drawReason === null;
    } else if (record.phase === "complete") {
      const winnerComplete = isSeat(record.winner) && record.drawReason === null
        && scores[record.winner] >= CONSTANTS.TARGET_SCORE
        && scores[record.winner] > scores[1 - record.winner];
      const drawComplete = record.winner === null && record.drawReason === "round-cap"
        && record.round === CONSTANTS.MAX_ROUNDS
        && !((scores[0] >= CONSTANTS.TARGET_SCORE && scores[0] > scores[1])
          || (scores[1] >= CONSTANTS.TARGET_SCORE && scores[1] > scores[0]));
      valid = firstAim === null && secondAim === null && results === null
        && record.activeSeat === null && clearFlight
        && replay.history.length === settledHistoryLength
        && (winnerComplete
          ? replay.decisiveWinner === record.winner
          : replay.decisiveWinner === null)
        && (winnerComplete || drawComplete);
    }
    if (!valid) return null;
    const normalized = {
      phase: record.phase,
      revision: record.revision,
      openingSeat: record.openingSeat,
      round: record.round,
      firstSeat: record.firstSeat,
      activeSeat: record.activeSeat,
      sealedAims: aims,
      shotResults: results,
      flightSeat: record.flightSeat,
      flightToken: record.flightToken,
      scores,
      history: replay.history,
      winner: record.winner,
      drawReason: record.drawReason,
      config,
    };
    const remaining = maxRemainingActions(normalized);
    return remaining <= Number.MAX_SAFE_INTEGER - normalized.revision ? normalized : null;
  }

  function makeState(values) {
    return deepFreeze({
      phase: values.phase,
      revision: values.revision,
      openingSeat: values.openingSeat,
      round: values.round,
      firstSeat: values.firstSeat,
      activeSeat: values.activeSeat,
      sealedAims: values.sealedAims,
      shotResults: values.shotResults,
      flightSeat: values.flightSeat,
      flightToken: values.flightToken,
      scores: values.scores,
      history: values.history,
      winner: values.winner,
      drawReason: values.drawReason,
      config: values.config,
    });
  }

  function createInitialState(rawConfig) {
    return makeState({
      phase: "intro",
      revision: 0,
      openingSeat: 0,
      round: 1,
      firstSeat: 0,
      activeSeat: null,
      sealedAims: [null, null],
      shotResults: null,
      flightSeat: null,
      flightToken: null,
      scores: [0, 0],
      history: [],
      winner: null,
      drawReason: null,
      config: sanitizeConfig(rawConfig),
    });
  }

  function snapshotAction(value) {
    const raw = snapshotAnyRecord(value);
    if (raw === null || typeof raw.values.type !== "string") return null;
    let expectedKeys = null;
    if (raw.values.type === "START" || raw.values.type === "BEGIN_REVEAL"
      || raw.values.type === "NEXT_ROUND" || raw.values.type === "RESTART") {
      expectedKeys = ["type", "expectedRevision"];
    } else if (raw.values.type === "TAKE_OVER") {
      expectedKeys = ["type", "seat", "expectedRevision"];
    } else if (raw.values.type === "LOCK_AIM") {
      expectedKeys = ["type", "seat", "angleIndex", "powerIndex", "expectedRevision"];
    } else if (raw.values.type === "COMPLETE_FLIGHT") {
      expectedKeys = ["type", "shotToken", "expectedRevision"];
    }
    if (expectedKeys === null || !sameKeys(raw.keys, expectedKeys)
      || !isSafe(raw.values.expectedRevision) || raw.values.expectedRevision < 0) return null;
    return raw.values;
  }

  function transitionState(state, changes) {
    return makeState({
      phase: changes.phase === undefined ? state.phase : changes.phase,
      revision: changes.revision === undefined ? state.revision : changes.revision,
      openingSeat: changes.openingSeat === undefined
        ? state.openingSeat : changes.openingSeat,
      round: changes.round === undefined ? state.round : changes.round,
      firstSeat: changes.firstSeat === undefined ? state.firstSeat : changes.firstSeat,
      activeSeat: changes.activeSeat === undefined ? state.activeSeat : changes.activeSeat,
      sealedAims: changes.sealedAims === undefined ? state.sealedAims : changes.sealedAims,
      shotResults: changes.shotResults === undefined
        ? state.shotResults : changes.shotResults,
      flightSeat: changes.flightSeat === undefined ? state.flightSeat : changes.flightSeat,
      flightToken: changes.flightToken === undefined
        ? state.flightToken : changes.flightToken,
      scores: changes.scores === undefined ? state.scores : changes.scores,
      history: changes.history === undefined ? state.history : changes.history,
      winner: changes.winner === undefined ? state.winner : changes.winner,
      drawReason: changes.drawReason === undefined ? state.drawReason : changes.drawReason,
      config: changes.config === undefined ? state.config : changes.config,
    });
  }

  function reduce(state, action) {
    const current = normalizeState(state);
    if (current === null) return createInitialState();
    const command = snapshotAction(action);
    if (command === null || command.expectedRevision !== current.revision) return state;
    const nextRevision = current.revision + 1;
    if (!isSafe(nextRevision)) return state;

    if (command.type === "START") {
      if (current.phase !== "intro") return state;
      return transitionState(current, {
        phase: "handoff",
        revision: nextRevision,
        activeSeat: current.firstSeat,
      });
    }

    if (command.type === "TAKE_OVER") {
      if (current.phase !== "handoff" || !isSeat(command.seat)
        || command.seat !== current.activeSeat) return state;
      return transitionState(current, {
        phase: "aiming",
        revision: nextRevision,
      });
    }

    if (command.type === "LOCK_AIM") {
      if (current.phase !== "aiming" || !isSeat(command.seat)
        || command.seat !== current.activeSeat
        || !isSafe(command.angleIndex) || command.angleIndex < 0
        || command.angleIndex >= ANGLE_DEGREES.length
        || !isSafe(command.powerIndex) || command.powerIndex < 0
        || command.powerIndex >= POWER2_VALUES.length) return state;
      const aim = { angleIndex: command.angleIndex, powerIndex: command.powerIndex };
      const aims = [current.sealedAims[0], current.sealedAims[1]];
      aims[command.seat] = aim;
      if (current.sealedAims[current.firstSeat] === null) {
        return transitionState(current, {
          phase: "handoff",
          revision: nextRevision,
          activeSeat: 1 - current.firstSeat,
          sealedAims: aims,
        });
      }
      const shotResults = [
        simulateShot(aims[0].angleIndex, aims[0].powerIndex),
        simulateShot(aims[1].angleIndex, aims[1].powerIndex),
      ];
      if (shotResults[0] === null || shotResults[1] === null) return state;
      return transitionState(current, {
        phase: "reveal-ready",
        revision: nextRevision,
        activeSeat: null,
        sealedAims: aims,
        shotResults,
      });
    }

    if (command.type === "BEGIN_REVEAL") {
      if (current.phase !== "reveal-ready") return state;
      return transitionState(current, {
        phase: "flying",
        revision: nextRevision,
        flightSeat: current.firstSeat,
        flightToken: nextRevision,
      });
    }

    if (command.type === "COMPLETE_FLIGHT") {
      if (current.phase !== "flying" || !isSafe(command.shotToken)
        || command.shotToken !== current.flightToken) return state;
      if (current.flightSeat === current.firstSeat) {
        return transitionState(current, {
          revision: nextRevision,
          flightSeat: 1 - current.firstSeat,
          flightToken: nextRevision,
        });
      }
      const hits = [
        current.shotResults[0].outcome === "miss" ? 0 : 1,
        current.shotResults[1].outcome === "miss" ? 0 : 1,
      ];
      const scores = [
        current.scores[0] + hits[0],
        current.scores[1] + hits[1],
      ];
      const historyEntry = {
        round: current.round,
        firstSeat: current.firstSeat,
        aims: [
          {
            angleIndex: current.sealedAims[0].angleIndex,
            powerIndex: current.sealedAims[0].powerIndex,
          },
          {
            angleIndex: current.sealedAims[1].angleIndex,
            powerIndex: current.sealedAims[1].powerIndex,
          },
        ],
        outcomes: [
          shotSummary(current.shotResults[0]),
          shotSummary(current.shotResults[1]),
        ],
        roundHits: hits,
        scoresAfter: scores,
      };
      const history = current.history.slice();
      history.push(historyEntry);
      let winner = null;
      if (scores[0] >= CONSTANTS.TARGET_SCORE && scores[0] > scores[1]) winner = 0;
      if (scores[1] >= CONSTANTS.TARGET_SCORE && scores[1] > scores[0]) winner = 1;
      const reachedRoundCap = current.round === CONSTANTS.MAX_ROUNDS;
      return transitionState(current, {
        phase: winner !== null || reachedRoundCap ? "complete" : "round-result",
        revision: nextRevision,
        activeSeat: null,
        sealedAims: [null, null],
        shotResults: null,
        flightSeat: null,
        flightToken: null,
        scores,
        history,
        winner,
        drawReason: winner === null && reachedRoundCap ? "round-cap" : null,
      });
    }

    if (command.type === "NEXT_ROUND") {
      if (current.phase !== "round-result") return state;
      const round = current.round + 1;
      const firstSeat = (current.openingSeat + round - 1) % 2;
      return transitionState(current, {
        phase: "handoff",
        revision: nextRevision,
        round,
        firstSeat,
        activeSeat: firstSeat,
      });
    }

    if (command.type === "RESTART") {
      if (current.phase !== "complete"
        || current.revision > Number.MAX_SAFE_INTEGER - 97) return state;
      const openingSeat = 1 - current.openingSeat;
      return makeState({
        phase: "intro",
        revision: nextRevision,
        openingSeat,
        round: 1,
        firstSeat: openingSeat,
        activeSeat: null,
        sealedAims: [null, null],
        shotResults: null,
        flightSeat: null,
        flightToken: null,
        scores: [0, 0],
        history: [],
        winner: null,
        drawReason: null,
        config: current.config,
      });
    }

    return state;
  }

  function publicAim(aim) {
    return {
      angleIndex: aim.angleIndex,
      angleDegrees: ANGLE_DEGREES[aim.angleIndex],
      powerIndex: aim.powerIndex,
      power2: POWER2_VALUES[aim.powerIndex],
    };
  }

  function publicShot(seat, aim, result) {
    return {
      seat,
      aim: publicAim(aim),
      outcome: result.outcome,
      terminalReason: result.terminalReason,
      bounceCount: result.bounceCount,
      terminalTick: result.terminalTick,
    };
  }

  function publicRound(entry) {
    return {
      round: entry.round,
      firstSeat: entry.firstSeat,
      shots: [
        publicShot(0, entry.aims[0], entry.outcomes[0]),
        publicShot(1, entry.aims[1], entry.outcomes[1]),
      ],
      roundHits: [entry.roundHits[0], entry.roundHits[1]],
      scoresAfter: [entry.scoresAfter[0], entry.scoresAfter[1]],
    };
  }

  function publicFlight(state) {
    if (state.phase !== "flying") return null;
    const seat = state.flightSeat;
    const result = state.shotResults[seat];
    const frames = [];
    for (let index = 0; index < result.frames.length; index += 1) {
      const frame = result.frames[index];
      const xQ = mirrorXQ(frame.xQ, seat);
      if (xQ === null) return null;
      frames[index] = {
        tick: frame.tick,
        xQ,
        yQ: frame.yQ,
        event: frame.event,
      };
    }
    return {
      seat,
      token: state.flightToken,
      aim: publicAim(state.sealedAims[seat]),
      result: {
        outcome: result.outcome,
        terminalReason: result.terminalReason,
        bounceCount: result.bounceCount,
        terminalTick: result.terminalTick,
      },
      frames,
    };
  }

  function phaseCopy(state) {
    const name = state.activeSeat === null
      ? "" : state.config.playerNames[state.activeSeat];
    if (state.phase === "intro") {
      return {
        eyebrow: "双人热座对抗",
        title: "把心投进对方的城堡",
        status: "比分从零开始，先达到三分并领先者获胜。",
        instruction: "两个人轮流秘密选择角度和力度。",
        live: "准备开始一场心动投射。",
      };
    }
    if (state.phase === "handoff") {
      return {
        eyebrow: `第 ${state.round} 轮`,
        title: `请把设备交给${name}`,
        status: "上一位的秘密选择不会显示。",
        instruction: "确认身边没有人偷看后再接管。",
        live: `轮到${name}接管。`,
      };
    }
    if (state.phase === "aiming") {
      return {
        eyebrow: `第 ${state.round} 轮`,
        title: `${name}，调好这一颗心`,
        status: "角度和力度会在放飞时才公开。",
        instruction: "选择两个档位，然后锁定。",
        live: `${name}正在秘密瞄准。`,
      };
    }
    if (state.phase === "reveal-ready") {
      return {
        eyebrow: `第 ${state.round} 轮`,
        title: "两颗心都已锁定",
        status: "现在可以按本轮顺序依次放飞。",
        instruction: "让两颗心飞起来。",
        live: "本轮两份选择已经锁定。",
      };
    }
    if (state.phase === "flying") {
      const flyingName = state.config.playerNames[state.flightSeat];
      return {
        eyebrow: `第 ${state.round} 轮`,
        title: `${flyingName}的心正在飞`,
        status: "当前轨迹已经公开，结果由固定规则计算。",
        instruction: "观看轨迹，或直接继续到下一发。",
        live: `${flyingName}的投射结果已经生成。`,
      };
    }
    if (state.phase === "round-result") {
      return {
        eyebrow: `第 ${state.round} 轮完成`,
        title: "两颗心都已落定",
        status: `当前比分 ${state.scores[0]} 比 ${state.scores[1]}。`,
        instruction: "交换先手，进入下一轮。",
        live: `第 ${state.round} 轮已经联合结算。`,
      };
    }
    const resultText = state.winner === null
      ? "十二轮结束，本局平分。"
      : `${state.config.playerNames[state.winner]}获胜。`;
    return {
      eyebrow: "本局结束",
      title: resultText,
      status: `最终比分 ${state.scores[0]} 比 ${state.scores[1]}。`,
      instruction: "可以交换开局先手，再来一局。",
      live: resultText,
    };
  }

  function getPublicView(state) {
    const current = normalizeState(state);
    if (current === null) return null;
    const history = [];
    for (let index = 0; index < current.history.length; index += 1) {
      history[index] = publicRound(current.history[index]);
    }
    let lockedCount = 0;
    if (current.sealedAims[0] !== null) lockedCount += 1;
    if (current.sealedAims[1] !== null) lockedCount += 1;
    const revealedShots = [];
    if (current.phase === "flying" && current.flightSeat !== current.firstSeat) {
      const seat = current.firstSeat;
      revealedShots.push(publicShot(
        seat,
        current.sealedAims[seat],
        current.shotResults[seat],
      ));
    }
    let currentFlight = null;
    if (current.phase === "flying") {
      currentFlight = publicFlight(current);
      if (currentFlight === null) return null;
    }
    const roundResult = current.phase === "round-result"
      ? publicRound(current.history[current.history.length - 1]) : null;
    const finalResult = current.phase === "complete"
      ? {
        winner: current.winner,
        drawReason: current.drawReason,
        scores: [current.scores[0], current.scores[1]],
      }
      : null;
    return deepFreeze({
      phase: current.phase,
      revision: current.revision,
      round: current.round,
      maxRounds: CONSTANTS.MAX_ROUNDS,
      firstSeat: current.firstSeat,
      activeSeat: current.activeSeat,
      lockedCount,
      players: [
        { seat: 0, name: current.config.playerNames[0], score: current.scores[0] },
        { seat: 1, name: current.config.playerNames[1], score: current.scores[1] },
      ],
      targetScore: CONSTANTS.TARGET_SCORE,
      history,
      revealedShots,
      currentFlight,
      roundResult,
      finalResult,
      controls: {
        canStart: current.phase === "intro",
        canTakeOver: current.phase === "handoff",
        canLockAim: current.phase === "aiming",
        canBeginReveal: current.phase === "reveal-ready",
        canCompleteFlight: current.phase === "flying",
        canNextRound: current.phase === "round-result",
        canRestart: current.phase === "complete"
          && current.revision <= Number.MAX_SAFE_INTEGER - 97,
      },
      copy: phaseCopy(current),
    });
  }

  // API key order is part of docs/249-heart-catapult-spec.md.
  return deepFreeze({
    Q,
    CONSTANTS,
    ANGLE_DEGREES,
    COS_Q12,
    SIN_Q12,
    POWER2_VALUES,
    DEFAULT_CONFIG,
    sanitizeConfig,
    roundEven,
    mirrorXQ,
    resolveSegmentEvent,
    simulateShot,
    createInitialState,
    reduce,
    getPublicView,
  });
});
