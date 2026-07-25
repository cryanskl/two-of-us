(function (root, factory) {
  "use strict";

  const fixed = typeof module === "object" && module.exports
    ? require("./fixed.js")
    : root.RicochetTankDuelFixed;
  const api = factory(fixed);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelGeometry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (fixed) {
  "use strict";

  if (!fixed) throw new Error("RicochetTankDuelFixed must load before geometry.js");

  const {
    ZERO,
    ONE,
    assertSafeInteger,
    safeProduct,
    makeRational,
    compareRational,
    equalRational,
    addRational,
    multiplyRational,
    oneMinusRational,
    scaleByRational,
  } = fixed;

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const key of Reflect.ownKeys(value)) freeze(value[key]);
    return Object.freeze(value);
  }

  function validatePoint(value, label) {
    if (!value || typeof value !== "object") throw new TypeError(`${label} must be an object`);
    return {
      xFp: assertSafeInteger(value.xFp, `${label}.xFp`),
      yFp: assertSafeInteger(value.yFp, `${label}.yFp`),
    };
  }

  function validateAabb(value, label = "aabb") {
    if (!value || typeof value !== "object" || typeof value.id !== "string" || value.id.length === 0) {
      throw new TypeError(`${label} must have a non-empty id`);
    }
    const result = {
      id: value.id,
      type: typeof value.type === "string" ? value.type : "wall",
      minX: assertSafeInteger(value.minX, `${label}.minX`),
      maxX: assertSafeInteger(value.maxX, `${label}.maxX`),
      minY: assertSafeInteger(value.minY, `${label}.minY`),
      maxY: assertSafeInteger(value.maxY, `${label}.maxY`),
    };
    if (result.minX >= result.maxX || result.minY >= result.maxY) {
      throw new RangeError(`${label} must have positive area`);
    }
    return result;
  }

  function positionComparedToBoundary(start, movement, time, boundary) {
    const left = assertSafeInteger(
      safeProduct(start, time.den, "contact position")
        + safeProduct(movement, time.num, "contact position"),
      "contact position overflow",
    );
    const right = safeProduct(boundary, time.den, "contact boundary");
    return Math.sign(left - right);
  }

  function slab(start, movement, minimum, maximum, axis, surfacePrefix) {
    if (movement === 0) {
      if (start < minimum || start > maximum) return null;
      return { parallel: true };
    }
    const positive = movement > 0;
    const nearBoundary = positive ? minimum : maximum;
    const farBoundary = positive ? maximum : minimum;
    return {
      parallel: false,
      near: makeRational(nearBoundary - start, movement),
      far: makeRational(farBoundary - start, movement),
      contact: {
        type: "wall",
        surfaceId: `${surfacePrefix}:${axis === "x" ? (positive ? "left" : "right") : (positive ? "top" : "bottom")}`,
        normalX: axis === "x" ? (positive ? -1 : 1) : 0,
        normalY: axis === "y" ? (positive ? -1 : 1) : 0,
        entering: true,
      },
    };
  }

  function axisEntersInterior(start, movement, time, minimum, maximum) {
    const comparedToMinimum = positionComparedToBoundary(start, movement, time, minimum);
    const comparedToMaximum = positionComparedToBoundary(start, movement, time, maximum);
    if (comparedToMinimum > 0 && comparedToMaximum < 0) return true;
    if (comparedToMinimum === 0) return movement > 0;
    if (comparedToMaximum === 0) return movement < 0;
    return false;
  }

  function sweepPointAabb(rawStart, rawDelta, rawAabb) {
    const start = validatePoint(rawStart, "start");
    const movement = validatePoint(rawDelta, "delta");
    const aabb = validateAabb(rawAabb);
    if (
      start.xFp > aabb.minX && start.xFp < aabb.maxX
      && start.yFp > aabb.minY && start.yFp < aabb.maxY
    ) throw new Error(`initial overlap with ${aabb.id}`);

    const xSlab = slab(start.xFp, movement.xFp, aabb.minX, aabb.maxX, "x", aabb.id);
    const ySlab = slab(start.yFp, movement.yFp, aabb.minY, aabb.maxY, "y", aabb.id);
    if (!xSlab || !ySlab) return null;

    let entry = null;
    let exit = null;
    for (const candidate of [xSlab, ySlab]) {
      if (candidate.parallel) continue;
      if (entry === null || compareRational(candidate.near, entry) > 0) entry = candidate.near;
      if (exit === null || compareRational(candidate.far, exit) < 0) exit = candidate.far;
    }
    if (entry === null) return null;
    if (exit !== null && compareRational(entry, exit) > 0) return null;
    if (compareRational(entry, ZERO) < 0 || compareRational(entry, ONE) > 0) return null;
    if (
      !axisEntersInterior(start.xFp, movement.xFp, entry, aabb.minX, aabb.maxX)
      || !axisEntersInterior(start.yFp, movement.yFp, entry, aabb.minY, aabb.maxY)
    ) return null;

    const contacts = [];
    if (!xSlab.parallel && equalRational(xSlab.near, entry)) {
      contacts.push({ ...xSlab.contact, type: aabb.type });
    }
    if (!ySlab.parallel && equalRational(ySlab.near, entry)) {
      contacts.push({ ...ySlab.contact, type: aabb.type });
    }
    contacts.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
    return freeze({ toi: entry, contacts });
  }

  function boundaryCandidate(start, movement, boundary, surfaceId, normalX, normalY) {
    if (movement === 0) return null;
    const time = makeRational(boundary - start, movement);
    if (compareRational(time, ZERO) < 0 || compareRational(time, ONE) > 0) return null;
    return {
      toi: time,
      contacts: [{
        type: "boundary",
        surfaceId,
        normalX,
        normalY,
        entering: true,
      }],
    };
  }

  function sweepInsideBounds(rawStart, rawDelta, rawBounds) {
    const start = validatePoint(rawStart, "start");
    const movement = validatePoint(rawDelta, "delta");
    const bounds = validateAabb(rawBounds, "bounds");
    if (
      start.xFp < bounds.minX || start.xFp > bounds.maxX
      || start.yFp < bounds.minY || start.yFp > bounds.maxY
    ) throw new Error(`initial point outside ${bounds.id}`);

    const candidates = [];
    if (movement.xFp < 0 && start.xFp + movement.xFp <= bounds.minX) {
      candidates.push(boundaryCandidate(
        start.xFp, movement.xFp, bounds.minX, "boundary-left", 1, 0,
      ));
    }
    if (movement.xFp > 0 && start.xFp + movement.xFp >= bounds.maxX) {
      candidates.push(boundaryCandidate(
        start.xFp, movement.xFp, bounds.maxX, "boundary-right", -1, 0,
      ));
    }
    if (movement.yFp < 0 && start.yFp + movement.yFp <= bounds.minY) {
      candidates.push(boundaryCandidate(
        start.yFp, movement.yFp, bounds.minY, "boundary-top", 0, 1,
      ));
    }
    if (movement.yFp > 0 && start.yFp + movement.yFp >= bounds.maxY) {
      candidates.push(boundaryCandidate(
        start.yFp, movement.yFp, bounds.maxY, "boundary-bottom", 0, -1,
      ));
    }
    return collectEarliestContacts(candidates.filter(Boolean));
  }

  function dot(leftX, leftY, rightX, rightY, label) {
    return assertSafeInteger(
      safeProduct(leftX, rightX, label) + safeProduct(leftY, rightY, label),
      `${label} overflow`,
    );
  }

  function isPerfectSquare(value) {
    if (value < 0n) return null;
    if (value < 2n) return value;
    let current = 1n << (BigInt(value.toString(2).length) + 1n) / 2n;
    while (true) {
      const next = (current + value / current) >> 1n;
      if (next >= current) return current * current === value ? current : null;
      current = next;
    }
  }

  function compareCircleContactToRational(candidate, rawTime) {
    if (!candidate || candidate.kind !== "circle-contact") {
      throw new TypeError("candidate must be a circle-contact");
    }
    const time = makeRational(rawTime.num, rawTime.den);
    if (candidate.toi) return compareRational(candidate.toi, time);
    const a = BigInt(candidate.a);
    const b = BigInt(candidate.b);
    const c = BigInt(candidate.c);
    const numerator = BigInt(time.num);
    const denominator = BigInt(time.den);
    const discriminant = b * b - 4n * a * c;
    const side = 2n * a * numerator + b * denominator;
    if (side >= 0n) return -1;
    const left = discriminant * denominator * denominator;
    const right = side * side;
    if (left === right) return 0;
    return left > right ? -1 : 1;
  }

  function sweepMovingCircle(rawRelativeStart, rawRelativeDelta, combinedRadius) {
    const start = validatePoint(rawRelativeStart, "relativeStart");
    const movement = validatePoint(rawRelativeDelta, "relativeDelta");
    assertSafeInteger(combinedRadius, "combinedRadius");
    if (combinedRadius <= 0) throw new RangeError("combinedRadius must be positive");
    const a = dot(movement.xFp, movement.yFp, movement.xFp, movement.yFp, "circle a");
    const halfB = dot(start.xFp, start.yFp, movement.xFp, movement.yFp, "circle half-b");
    const radiusSquared = safeProduct(combinedRadius, combinedRadius, "circle radius");
    const c = assertSafeInteger(
      dot(start.xFp, start.yFp, start.xFp, start.yFp, "circle start") - radiusSquared,
      "circle c",
    );
    if (c < 0) throw new Error("initial overlap with moving circle");
    if (c === 0) {
      if (halfB >= 0) return null;
      return freeze({ kind: "circle-contact", a, b: halfB * 2, c, toi: ZERO });
    }
    if (a === 0 || halfB >= 0) return null;
    const b = assertSafeInteger(halfB * 2, "circle b");
    const discriminant = BigInt(b) * BigInt(b) - 4n * BigInt(a) * BigInt(c);
    if (discriminant <= 0n) return null;
    const candidate = { kind: "circle-contact", a, b, c, toi: null };
    if (compareCircleContactToRational(candidate, ONE) > 0) return null;
    const squareRoot = isPerfectSquare(discriminant);
    if (squareRoot !== null) {
      const numerator = -BigInt(b) - squareRoot;
      const denominator = 2n * BigInt(a);
      const normalizedNumerator = Number(numerator);
      const normalizedDenominator = Number(denominator);
      assertSafeInteger(normalizedNumerator, "circle TOI numerator");
      assertSafeInteger(normalizedDenominator, "circle TOI denominator");
      candidate.toi = makeRational(normalizedNumerator, normalizedDenominator);
    }
    return freeze(candidate);
  }

  function collectEarliestContacts(rawCandidates) {
    if (!Array.isArray(rawCandidates)) throw new TypeError("candidates must be an array");
    let earliest = null;
    for (const candidate of rawCandidates) {
      if (!candidate) continue;
      const toi = makeRational(candidate.toi.num, candidate.toi.den);
      if (earliest === null || compareRational(toi, earliest.toi) < 0) {
        earliest = { toi, contacts: [...candidate.contacts] };
      } else if (equalRational(toi, earliest.toi)) {
        earliest.contacts.push(...candidate.contacts);
      }
    }
    if (earliest === null) return null;
    earliest.contacts.sort((left, right) => left.surfaceId.localeCompare(right.surfaceId));
    return freeze(earliest);
  }

  function mergeContactNormals(events) {
    if (!Array.isArray(events)) throw new TypeError("events must be an array");
    const surfaceIds = [...new Set(events.map((event) => event.surfaceId))].sort();
    return freeze({
      flipX: events.some((event) => event.normalX !== 0),
      flipY: events.some((event) => event.normalY !== 0),
      surfaceIds,
    });
  }

  function contactPoint(start, movement, time, contacts, colliders) {
    const next = {
      xFp: assertSafeInteger(start.xFp + scaleByRational(movement.xFp, time), "contact x"),
      yFp: assertSafeInteger(start.yFp + scaleByRational(movement.yFp, time), "contact y"),
    };
    for (const contact of contacts) {
      const collider = colliders.find((candidate) => contact.surfaceId.startsWith(`${candidate.id}:`));
      if (!collider) continue;
      if (contact.normalX < 0) next.xFp = collider.minX;
      else if (contact.normalX > 0) next.xFp = collider.maxX;
      if (contact.normalY < 0) next.yFp = collider.minY;
      else if (contact.normalY > 0) next.yFp = collider.maxY;
    }
    return next;
  }

  function segment(start, end, t0, t1) {
    return freeze({
      t0,
      t1,
      start: { ...start },
      end: { ...end },
    });
  }

  function moveCircleWithSlides(rawStart, rawDelta, rawColliders, maxContacts) {
    let current = validatePoint(rawStart, "start");
    let movement = validatePoint(rawDelta, "delta");
    if (!Array.isArray(rawColliders)) throw new TypeError("colliders must be an array");
    const colliders = rawColliders.map((value, index) => validateAabb(value, `colliders[${index}]`));
    assertSafeInteger(maxContacts, "maxContacts");
    if (maxContacts < 0) throw new RangeError("maxContacts must not be negative");

    let globalTime = ZERO;
    let remainingGlobalTime = ONE;
    const contacts = [];
    const segments = [];
    for (let contactIndex = 0; contactIndex < maxContacts; contactIndex += 1) {
      const hit = collectEarliestContacts(
        colliders.map((collider) => sweepPointAabb(current, movement, collider)).filter(Boolean),
      );
      if (!hit) break;
      const next = contactPoint(current, movement, hit.toi, hit.contacts, colliders);
      const nextGlobalTime = addRational(
        globalTime,
        multiplyRational(remainingGlobalTime, hit.toi),
      );
      segments.push(segment(current, next, globalTime, nextGlobalTime));
      contacts.push(...hit.contacts);
      const normal = mergeContactNormals(hit.contacts);
      const remainingLocalTime = oneMinusRational(hit.toi);
      movement = {
        xFp: normal.flipX ? 0 : scaleByRational(movement.xFp, remainingLocalTime),
        yFp: normal.flipY ? 0 : scaleByRational(movement.yFp, remainingLocalTime),
      };
      current = next;
      globalTime = nextGlobalTime;
      remainingGlobalTime = multiplyRational(remainingGlobalTime, remainingLocalTime);
      if (movement.xFp === 0 && movement.yFp === 0) break;
    }

    if (compareRational(globalTime, ONE) < 0) {
      let end = current;
      if (movement.xFp !== 0 || movement.yFp !== 0) {
        const blocked = collectEarliestContacts(
          colliders.map((collider) => sweepPointAabb(current, movement, collider)).filter(Boolean),
        );
        if (!blocked) {
          end = {
            xFp: assertSafeInteger(current.xFp + movement.xFp, "slide end x"),
            yFp: assertSafeInteger(current.yFp + movement.yFp, "slide end y"),
          };
        }
      }
      segments.push(segment(current, end, globalTime, ONE));
      current = end;
    }
    if (segments.length === 0) segments.push(segment(current, current, ZERO, ONE));
    return freeze({ end: current, segments, contacts });
  }

  return freeze({
    sweepPointAabb,
    sweepInsideBounds,
    sweepMovingCircle,
    compareCircleContactToRational,
    collectEarliestContacts,
    mergeContactNormals,
    moveCircleWithSlides,
  });
});
