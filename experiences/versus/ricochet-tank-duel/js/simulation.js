(function (root, factory) {
  "use strict";

  const constants = typeof module === "object" && module.exports
    ? require("./constants.js")
    : root.RicochetTankDuelConstants;
  const fixed = typeof module === "object" && module.exports
    ? require("./fixed.js")
    : root.RicochetTankDuelFixed;
  const geometry = typeof module === "object" && module.exports
    ? require("./geometry.js")
    : root.RicochetTankDuelGeometry;
  const api = factory(constants, fixed, geometry);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelSimulation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, fixed, geometry) {
  "use strict";

  if (!constants || !fixed || !geometry) {
    throw new Error("constants.js, fixed.js and geometry.js must load before simulation.js");
  }

  const {
    VERSION,
    RULES,
    INPUT_BITS,
    ALL_INPUT_BITS,
    PAUSE_REASONS,
    DIRECTION_VECTORS,
    WORLD_BOUNDS,
    PLAYER_ZONES,
    WALLS,
    SPAWNS,
    mirrorX,
    mirrorHeading,
    deepFreeze,
  } = constants;
  const {
    ZERO,
    ONE,
    assertSafeInteger,
    safeProduct,
    mulQ10,
    makeRational,
    compareRational,
    equalRational,
    addRational,
    multiplyRational,
    oneMinusRational,
    scaleByRational,
  } = fixed;

  const STATE_KEYS = [
    "activeMatchTicks",
    "bullets",
    "lastRoundResult",
    "matchResult",
    "nextBulletId",
    "pauseReason",
    "pendingMatchResult",
    "phase",
    "phaseTicksRemaining",
    "roundIndex",
    "scores",
    "semanticEvents",
    "tanks",
    "version",
  ];
  const PHASE_SET = new Set(constants.PHASES);
  const ROUND_RESULTS = new Set(["left-hit", "right-hit", "both-hit"]);
  const MATCH_RESULTS = new Set(["left", "right", "draw"]);
  const WORLD_BOX = deepFreeze({ id: "world", ...WORLD_BOUNDS });

  function plainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function exactKeys(value, keys) {
    if (!plainObject(value)) return false;
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return actual.length === expected.length
      && actual.every((key, index) => key === expected[index]);
  }

  function cloneJson(value, label) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      throw new TypeError(`${label} must be JSON-safe`);
    }
  }

  function integerIn(value, minimum, maximum, label) {
    assertSafeInteger(value, label);
    if (value < minimum || value > maximum) throw new RangeError(`${label} out of range`);
    return value;
  }

  function validMask(mask, label) {
    assertSafeInteger(mask, label);
    if (mask < 0 || (mask & ~ALL_INPUT_BITS) !== 0) throw new RangeError(`${label} has unknown input bits`);
    return mask;
  }

  function tankFromSpawn(seat) {
    const spawn = SPAWNS[seat];
    return {
      id: seat,
      xFp: spawn.xFp,
      yFp: spawn.yFp,
      heading: spawn.heading,
      cooldownTicks: 0,
    };
  }

  function initialData(phase = "instructions") {
    return {
      version: VERSION,
      phase,
      phaseTicksRemaining: phase === "countdown" ? RULES.COUNTDOWN_TICKS : 0,
      activeMatchTicks: 0,
      scores: [0, 0],
      tanks: [tankFromSpawn(0), tankFromSpawn(1)],
      bullets: [],
      nextBulletId: 1,
      roundIndex: 1,
      lastRoundResult: null,
      pendingMatchResult: null,
      matchResult: null,
      pauseReason: null,
      semanticEvents: [],
    };
  }

  function createInitialState() {
    return deepFreeze(initialData());
  }

  function expandedWall(wall, radiusLogical, type = "wall") {
    const radiusFp = radiusLogical * RULES.FP_SCALE;
    return {
      id: wall.id,
      type,
      minX: wall.minX - radiusFp,
      maxX: wall.maxX + radiusFp,
      minY: wall.minY - radiusFp,
      maxY: wall.maxY + radiusFp,
    };
  }

  const TANK_WALLS = deepFreeze(WALLS.map((wall) => expandedWall(wall, RULES.TANK_RADIUS)));
  const BULLET_WALLS = deepFreeze(WALLS.map((wall) => expandedWall(wall, RULES.BULLET_RADIUS)));

  function pointStrictlyInside(point, box) {
    return point.xFp > box.minX && point.xFp < box.maxX
      && point.yFp > box.minY && point.yFp < box.maxY;
  }

  function validateTank(raw, index) {
    if (!exactKeys(raw, ["cooldownTicks", "heading", "id", "xFp", "yFp"])) {
      throw new TypeError(`tank ${index} schema invalid`);
    }
    const id = integerIn(raw.id, 0, 1, `tank ${index} id`);
    const zone = PLAYER_ZONES[id];
    const tank = {
      id,
      xFp: integerIn(raw.xFp, zone.minX, zone.maxX, `tank ${id} xFp`),
      yFp: integerIn(raw.yFp, zone.minY, zone.maxY, `tank ${id} yFp`),
      heading: integerIn(raw.heading, 0, 31, `tank ${id} heading`),
      cooldownTicks: integerIn(
        raw.cooldownTicks,
        0,
        RULES.FIRE_COOLDOWN_TICKS - 1,
        `tank ${id} cooldownTicks`,
      ),
    };
    if (TANK_WALLS.some((wall) => pointStrictlyInside(tank, wall))) {
      throw new Error(`tank ${id} overlaps wall`);
    }
    return tank;
  }

  function validateBullet(raw, index) {
    if (!exactKeys(raw, [
      "ageTicks",
      "id",
      "ownerId",
      "reflectionCount",
      "vxFp",
      "vyFp",
      "xFp",
      "yFp",
    ])) throw new TypeError(`bullet ${index} schema invalid`);
    const bullet = {
      id: integerIn(raw.id, 1, Number.MAX_SAFE_INTEGER, `bullet ${index} id`),
      ownerId: integerIn(raw.ownerId, 0, 1, `bullet ${index} ownerId`),
      xFp: integerIn(raw.xFp, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX, `bullet ${index} xFp`),
      yFp: integerIn(raw.yFp, WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY, `bullet ${index} yFp`),
      vxFp: assertSafeInteger(raw.vxFp, `bullet ${index} vxFp`),
      vyFp: assertSafeInteger(raw.vyFp, `bullet ${index} vyFp`),
      ageTicks: integerIn(raw.ageTicks, 0, RULES.BULLET_LIFETIME_TICKS - 1, `bullet ${index} ageTicks`),
      reflectionCount: integerIn(
        raw.reflectionCount,
        0,
        RULES.MAX_REFLECTIONS,
        `bullet ${index} reflectionCount`,
      ),
    };
    if (bullet.vxFp === 0 && bullet.vyFp === 0) throw new Error(`bullet ${index} velocity invalid`);
    if (BULLET_WALLS.some((wall) => pointStrictlyInside(bullet, wall))) {
      throw new Error(`bullet ${index} overlaps wall`);
    }
    return bullet;
  }

  function validatePhaseFields(state) {
    if (!PHASE_SET.has(state.phase)) throw new RangeError("state phase invalid");
    integerIn(state.phaseTicksRemaining, 0, RULES.COUNTDOWN_TICKS, "phaseTicksRemaining");
    if (state.phase === "countdown" && state.phaseTicksRemaining < 1) {
      throw new Error("countdown requires remaining ticks");
    }
    if (state.phase === "round-result") {
      if (state.phaseTicksRemaining < 1 || state.phaseTicksRemaining > RULES.ROUND_RESULT_TICKS) {
        throw new Error("round-result remaining ticks invalid");
      }
    } else if (state.phase !== "countdown" && state.phaseTicksRemaining !== 0) {
      throw new Error("inactive phase timer must be zero");
    }
    if (state.phase === "paused") {
      if (!PAUSE_REASONS.includes(state.pauseReason)) throw new Error("pause reason invalid");
    } else if (state.pauseReason !== null) {
      throw new Error("pause reason outside paused phase");
    }
    if (state.lastRoundResult !== null && !ROUND_RESULTS.has(state.lastRoundResult)) {
      throw new Error("last round result invalid");
    }
    if (state.pendingMatchResult !== null && !MATCH_RESULTS.has(state.pendingMatchResult)) {
      throw new Error("pending match result invalid");
    }
    if (state.matchResult !== null && !MATCH_RESULTS.has(state.matchResult)) {
      throw new Error("match result invalid");
    }
    if (state.phase === "match-result" && state.matchResult === null) {
      throw new Error("match-result requires result");
    }
  }

  function validateState(rawState) {
    if (!exactKeys(rawState, STATE_KEYS)) throw new TypeError("state schema invalid");
    const raw = cloneJson(rawState, "state");
    if (raw.version !== VERSION) throw new Error("state version invalid");
    const tanks = raw.tanks;
    if (!Array.isArray(tanks) || tanks.length !== 2) throw new Error("state tanks invalid");
    const normalizedTanks = tanks.map(validateTank).sort((left, right) => left.id - right.id);
    if (normalizedTanks[0].id !== 0 || normalizedTanks[1].id !== 1) {
      throw new Error("state tank ids invalid");
    }
    if (!Array.isArray(raw.bullets) || raw.bullets.length > 4) throw new Error("state bullets invalid");
    const bullets = raw.bullets.map(validateBullet).sort((left, right) => left.id - right.id);
    const ids = new Set();
    const ownerCounts = [0, 0];
    for (const item of bullets) {
      if (ids.has(item.id)) throw new Error("duplicate bullet id");
      ids.add(item.id);
      ownerCounts[item.ownerId] += 1;
      if (ownerCounts[item.ownerId] > RULES.MAX_BULLETS_PER_PLAYER) {
        throw new Error("bullet owner limit exceeded");
      }
    }
    const scores = raw.scores;
    if (!Array.isArray(scores) || scores.length !== 2) throw new Error("state scores invalid");
    const state = {
      version: VERSION,
      phase: raw.phase,
      phaseTicksRemaining: raw.phaseTicksRemaining,
      activeMatchTicks: integerIn(
        raw.activeMatchTicks,
        0,
        RULES.MATCH_ACTIVE_TICKS,
        "activeMatchTicks",
      ),
      scores: scores.map((score, index) => integerIn(score, 0, RULES.TARGET_SCORE, `score ${index}`)),
      tanks: normalizedTanks,
      bullets,
      nextBulletId: integerIn(raw.nextBulletId, 1, Number.MAX_SAFE_INTEGER, "nextBulletId"),
      roundIndex: integerIn(raw.roundIndex, 1, Number.MAX_SAFE_INTEGER, "roundIndex"),
      lastRoundResult: raw.lastRoundResult,
      pendingMatchResult: raw.pendingMatchResult,
      matchResult: raw.matchResult,
      pauseReason: raw.pauseReason,
      semanticEvents: Array.isArray(raw.semanticEvents)
        ? cloneJson(raw.semanticEvents, "semanticEvents")
        : (() => { throw new TypeError("semanticEvents must be an array"); })(),
    };
    if (bullets.some((item) => item.id >= state.nextBulletId)) {
      throw new Error("nextBulletId must exceed all bullet ids");
    }
    validatePhaseFields(state);
    return deepFreeze(state);
  }

  function stationaryPath(tank) {
    return deepFreeze([{
      t0: ZERO,
      t1: ONE,
      start: { xFp: tank.xFp, yFp: tank.yFp },
      end: { xFp: tank.xFp, yFp: tank.yFp },
    }]);
  }

  function zoneBarriers(zone, seat) {
    const margin = 64 * RULES.FP_SCALE;
    return [
      {
        id: `zone-${seat}-left`,
        minX: zone.minX - margin,
        maxX: zone.minX,
        minY: zone.minY - margin,
        maxY: zone.maxY + margin,
      },
      {
        id: `zone-${seat}-right`,
        minX: zone.maxX,
        maxX: zone.maxX + margin,
        minY: zone.minY - margin,
        maxY: zone.maxY + margin,
      },
      {
        id: `zone-${seat}-top`,
        minX: zone.minX - margin,
        maxX: zone.maxX + margin,
        minY: zone.minY - margin,
        maxY: zone.minY,
      },
      {
        id: `zone-${seat}-bottom`,
        minX: zone.minX - margin,
        maxX: zone.maxX + margin,
        minY: zone.maxY,
        maxY: zone.maxY + margin,
      },
    ];
  }

  function resolveTankMotion(rawTank, rawMask, seat = rawTank.id) {
    const tank = validateTank(cloneJson(rawTank, "tank"), seat);
    const mask = validMask(rawMask, "tank input mask");
    integerIn(seat, 0, 1, "seat");
    let heading = tank.heading;
    const turnLeft = (mask & INPUT_BITS.TURN_LEFT) !== 0;
    const turnRight = (mask & INPUT_BITS.TURN_RIGHT) !== 0;
    if (turnLeft !== turnRight) heading = (heading + (turnLeft ? 31 : 1)) % 32;
    const forward = (mask & INPUT_BITS.FORWARD) !== 0;
    const reverse = (mask & INPUT_BITS.REVERSE) !== 0;
    if (forward === reverse) {
      const next = { ...tank, heading };
      return deepFreeze({ tank: next, path: stationaryPath(next) });
    }
    const signedSpeed = forward ? RULES.TANK_FORWARD_SPEED_FP : -RULES.TANK_REVERSE_SPEED_FP;
    const direction = DIRECTION_VECTORS[heading];
    const movement = {
      xFp: mulQ10(signedSpeed, direction.x),
      yFp: mulQ10(signedSpeed, direction.y),
    };
    const start = { xFp: tank.xFp, yFp: tank.yFp };
    const colliders = [...TANK_WALLS, ...zoneBarriers(PLAYER_ZONES[seat], seat)];
    const moved = geometry.moveCircleWithSlides(start, movement, colliders, 2);
    return deepFreeze({
      tank: {
        ...tank,
        xFp: moved.end.xFp,
        yFp: moved.end.yFp,
        heading,
      },
      path: moved.segments,
    });
  }

  function squaredDistance(left, right) {
    const dx = left.xFp - right.xFp;
    const dy = left.yFp - right.yFp;
    return safeProduct(dx, dx, "distance") + safeProduct(dy, dy, "distance");
  }

  function spawnPoint(tank) {
    const direction = DIRECTION_VECTORS[tank.heading];
    const distanceFp = (
      RULES.TANK_RADIUS + RULES.BULLET_RADIUS + RULES.SPAWN_CLEARANCE
    ) * RULES.FP_SCALE;
    return {
      xFp: tank.xFp + mulQ10(distanceFp, direction.x),
      yFp: tank.yFp + mulQ10(distanceFp, direction.y),
    };
  }

  function validBulletSpawn(point, target) {
    if (
      point.xFp < WORLD_BOUNDS.minX || point.xFp > WORLD_BOUNDS.maxX
      || point.yFp < WORLD_BOUNDS.minY || point.yFp > WORLD_BOUNDS.maxY
    ) return false;
    if (BULLET_WALLS.some((wall) => (
      point.xFp >= wall.minX && point.xFp <= wall.maxX
      && point.yFp >= wall.minY && point.yFp <= wall.maxY
    ))) return false;
    const combinedRadiusFp = (RULES.TANK_RADIUS + RULES.BULLET_RADIUS) * RULES.FP_SCALE;
    return squaredDistance(point, target) > safeProduct(
      combinedRadiusFp,
      combinedRadiusFp,
      "spawn target radius",
    );
  }

  function tryCreateBullet(state, tank, ownerId) {
    if (tank.cooldownTicks !== 0) return null;
    if (state.bullets.filter((item) => item.ownerId === ownerId).length >= RULES.MAX_BULLETS_PER_PLAYER) {
      return null;
    }
    const point = spawnPoint(tank);
    if (!validBulletSpawn(point, state.tanks[1 - ownerId])) return null;
    const direction = DIRECTION_VECTORS[tank.heading];
    return deepFreeze({
      id: state.nextBulletId,
      ownerId,
      xFp: point.xFp,
      yFp: point.yFp,
      vxFp: mulQ10(RULES.BULLET_SPEED_FP, direction.x),
      vyFp: mulQ10(RULES.BULLET_SPEED_FP, direction.y),
      ageTicks: 0,
      reflectionCount: 0,
    });
  }

  function negateRatio(value) {
    return makeRational(-value.num, value.den);
  }

  function subtractRatio(left, right) {
    return addRational(left, negateRatio(right));
  }

  function divideRatio(left, right) {
    if (right.num === 0) throw new RangeError("cannot divide by zero ratio");
    return makeRational(
      safeProduct(left.num, right.den, "ratio division"),
      safeProduct(left.den, right.num, "ratio division"),
    );
  }

  function ratioMaximum(left, right) {
    return compareRational(left, right) >= 0 ? left : right;
  }

  function ratioMinimum(left, right) {
    return compareRational(left, right) <= 0 ? left : right;
  }

  function pointAtPath(path, time) {
    const segment = path.find((candidate, index) => (
      compareRational(time, candidate.t0) >= 0
      && (compareRational(time, candidate.t1) < 0 || index === path.length - 1)
    )) || path[path.length - 1];
    const duration = subtractRatio(segment.t1, segment.t0);
    if (duration.num === 0) return { ...segment.end };
    const local = divideRatio(subtractRatio(time, segment.t0), duration);
    return {
      xFp: segment.start.xFp + scaleByRational(segment.end.xFp - segment.start.xFp, local),
      yFp: segment.start.yFp + scaleByRational(segment.end.yFp - segment.start.yFp, local),
    };
  }

  function wallHit(position, movement) {
    const candidates = [
      geometry.sweepInsideBounds(position, movement, WORLD_BOX),
      ...BULLET_WALLS.map((wall) => geometry.sweepPointAabb(position, movement, wall)),
    ].filter(Boolean);
    return geometry.collectEarliestContacts(candidates);
  }

  function wallGlobalTime(currentTime, localTime) {
    return addRational(currentTime, multiplyRational(oneMinusRational(currentTime), localTime));
  }

  function targetBeforeOrAtWall(position, velocity, currentTime, target, path, wallTime) {
    if (!target || !Array.isArray(path) || path.length === 0) return false;
    for (const segment of path) {
      const intervalStart = ratioMaximum(currentTime, segment.t0);
      const intervalEnd = ratioMinimum(ONE, segment.t1);
      if (compareRational(intervalStart, intervalEnd) >= 0) continue;
      if (wallTime && compareRational(wallTime, intervalStart) < 0) return false;
      const fromCurrent = subtractRatio(intervalStart, currentTime);
      const duration = subtractRatio(intervalEnd, intervalStart);
      const bulletStart = {
        xFp: position.xFp + scaleByRational(velocity.xFp, fromCurrent),
        yFp: position.yFp + scaleByRational(velocity.yFp, fromCurrent),
      };
      const bulletDelta = {
        xFp: scaleByRational(velocity.xFp, duration),
        yFp: scaleByRational(velocity.yFp, duration),
      };
      const tankStart = pointAtPath(path, intervalStart);
      const tankEnd = pointAtPath(path, intervalEnd);
      let candidate;
      try {
        candidate = geometry.sweepMovingCircle(
          {
            xFp: bulletStart.xFp - tankStart.xFp,
            yFp: bulletStart.yFp - tankStart.yFp,
          },
          {
            xFp: bulletDelta.xFp - (tankEnd.xFp - tankStart.xFp),
            yFp: bulletDelta.yFp - (tankEnd.yFp - tankStart.yFp),
          },
          (RULES.BULLET_RADIUS + RULES.TANK_RADIUS) * RULES.FP_SCALE,
        );
      } catch (error) {
        if (/initial overlap/.test(error.message)) return true;
        throw error;
      }
      if (!candidate) continue;
      if (!wallTime || compareRational(wallTime, intervalEnd) > 0) return true;
      const wallLocal = divideRatio(subtractRatio(wallTime, intervalStart), duration);
      return geometry.compareCircleContactToRational(candidate, wallLocal) <= 0;
    }
    return false;
  }

  function snapBulletToSurfaces(position, contacts) {
    const next = { ...position };
    for (const contact of contacts) {
      if (contact.surfaceId === "boundary-left") next.xFp = WORLD_BOUNDS.minX;
      else if (contact.surfaceId === "boundary-right") next.xFp = WORLD_BOUNDS.maxX;
      else if (contact.surfaceId === "boundary-top") next.yFp = WORLD_BOUNDS.minY;
      else if (contact.surfaceId === "boundary-bottom") next.yFp = WORLD_BOUNDS.maxY;
      else {
        const wall = BULLET_WALLS.find((candidate) => contact.surfaceId.startsWith(`${candidate.id}:`));
        if (!wall) continue;
        if (contact.normalX < 0) next.xFp = wall.minX;
        else if (contact.normalX > 0) next.xFp = wall.maxX;
        if (contact.normalY < 0) next.yFp = wall.minY;
        else if (contact.normalY > 0) next.yFp = wall.maxY;
      }
    }
    return next;
  }

  function simulateBulletTick(rawBullet, rawTarget, rawTargetPath = [], rawOptions = {}) {
    const item = cloneJson(rawBullet, "bullet");
    const target = rawTarget === null ? null : cloneJson(rawTarget, "target");
    const targetPath = cloneJson(rawTargetPath, "target path");
    const maxReflections = rawOptions.maxReflections === undefined
      ? RULES.MAX_REFLECTIONS
      : integerIn(rawOptions.maxReflections, 0, 999, "maxReflections");
    let position = {
      xFp: assertSafeInteger(item.xFp, "bullet xFp"),
      yFp: assertSafeInteger(item.yFp, "bullet yFp"),
    };
    let velocity = {
      xFp: assertSafeInteger(item.vxFp, "bullet vxFp"),
      yFp: assertSafeInteger(item.vyFp, "bullet vyFp"),
    };
    let reflectionCount = integerIn(item.reflectionCount, 0, 999, "reflectionCount");
    let currentTime = ZERO;
    let contactsProcessed = 0;
    while (compareRational(currentTime, ONE) < 0) {
      const remaining = oneMinusRational(currentTime);
      const movement = {
        xFp: scaleByRational(velocity.xFp, remaining),
        yFp: scaleByRational(velocity.yFp, remaining),
      };
      const wall = wallHit(position, movement);
      const wallTime = wall ? wallGlobalTime(currentTime, wall.toi) : null;
      if (targetBeforeOrAtWall(position, velocity, currentTime, target, targetPath, wallTime)) {
        return deepFreeze({
          bullet: null,
          hitTargetId: target.id,
          destroyReason: "hit",
          contactsProcessed,
        });
      }
      if (!wall) {
        position = {
          xFp: position.xFp + movement.xFp,
          yFp: position.yFp + movement.yFp,
        };
        currentTime = ONE;
        break;
      }
      if (contactsProcessed >= RULES.MAX_CONTACTS_PER_TICK) {
        return deepFreeze({
          bullet: null,
          hitTargetId: null,
          destroyReason: "contact-cap",
          contactsProcessed,
        });
      }
      contactsProcessed += 1;
      if (reflectionCount + 1 > maxReflections) {
        return deepFreeze({
          bullet: null,
          hitTargetId: null,
          destroyReason: "reflection-cap",
          contactsProcessed,
        });
      }
      position = snapBulletToSurfaces({
        xFp: position.xFp + scaleByRational(movement.xFp, wall.toi),
        yFp: position.yFp + scaleByRational(movement.yFp, wall.toi),
      }, wall.contacts);
      const normal = geometry.mergeContactNormals(wall.contacts);
      velocity = {
        xFp: normal.flipX ? -velocity.xFp : velocity.xFp,
        yFp: normal.flipY ? -velocity.yFp : velocity.yFp,
      };
      reflectionCount += 1;
      currentTime = wallTime;
    }
    return deepFreeze({
      bullet: {
        ...item,
        xFp: position.xFp,
        yFp: position.yFp,
        vxFp: velocity.xFp,
        vyFp: velocity.yFp,
        reflectionCount,
      },
      hitTargetId: null,
      destroyReason: null,
      contactsProcessed,
    });
  }

  function matchResultFor(scores) {
    if (scores[0] === scores[1]) return "draw";
    return scores[0] > scores[1] ? "left" : "right";
  }

  function targetScoreResult(scores) {
    if (scores[0] < RULES.TARGET_SCORE && scores[1] < RULES.TARGET_SCORE) return null;
    return matchResultFor(scores);
  }

  function simulatePlayingTick(rawState, rawInputFrame) {
    const state = validateState(rawState);
    if (state.phase !== "playing") throw new Error("simulatePlayingTick requires playing state");
    if (!exactKeys(rawInputFrame, ["leftMask", "rightMask"])) throw new TypeError("input frame schema invalid");
    const masks = [
      validMask(rawInputFrame.leftMask, "leftMask"),
      validMask(rawInputFrame.rightMask, "rightMask"),
    ];
    const motions = state.tanks.map((tank, seat) => resolveTankMotion(tank, masks[seat], seat));
    const tanks = motions.map((motion) => ({ ...motion.tank }));
    const events = [];
    const bullets = state.bullets.map((item) => ({ ...item })).sort((a, b) => a.id - b.id);
    let nextBulletId = state.nextBulletId;
    for (let ownerId = 0; ownerId < 2; ownerId += 1) {
      if ((masks[ownerId] & INPUT_BITS.FIRE_EDGE) === 0) continue;
      const provisionalState = { ...state, tanks, bullets, nextBulletId };
      const created = tryCreateBullet(provisionalState, tanks[ownerId], ownerId);
      if (created) {
        bullets.push({ ...created, id: nextBulletId });
        nextBulletId += 1;
        tanks[ownerId].cooldownTicks = RULES.FIRE_COOLDOWN_TICKS;
        events.push({ type: "bullet-created", bulletId: created.id, ownerId });
      } else if (
        tanks[ownerId].cooldownTicks === 0
        && bullets.filter((item) => item.ownerId === ownerId).length < RULES.MAX_BULLETS_PER_PLAYER
      ) {
        events.push({ type: "fire-blocked", ownerId });
      }
    }

    const hitSet = new Set();
    const survivors = [];
    for (const item of bullets.sort((left, right) => left.id - right.id)) {
      const targetId = 1 - item.ownerId;
      const result = simulateBulletTick(item, tanks[targetId], motions[targetId].path);
      if (result.hitTargetId !== null) {
        hitSet.add(result.hitTargetId);
        events.push({ type: "tank-hit", bulletId: item.id, targetId });
        continue;
      }
      if (!result.bullet) {
        events.push({ type: "bullet-destroyed", bulletId: item.id, reason: result.destroyReason });
        continue;
      }
      const aged = { ...result.bullet, ageTicks: result.bullet.ageTicks + 1 };
      if (aged.ageTicks >= RULES.BULLET_LIFETIME_TICKS) {
        events.push({ type: "bullet-destroyed", bulletId: item.id, reason: "lifetime" });
      } else {
        survivors.push(aged);
      }
    }
    for (const tank of tanks) {
      if (tank.cooldownTicks > 0) tank.cooldownTicks -= 1;
    }

    const scores = [...state.scores];
    if (hitSet.has(1)) scores[0] += 1;
    if (hitSet.has(0)) scores[1] += 1;
    const activeMatchTicks = state.activeMatchTicks + 1;
    let phase = "playing";
    let phaseTicksRemaining = 0;
    let lastRoundResult = state.lastRoundResult;
    let pendingMatchResult = null;
    let matchResult = null;
    let finalBullets = survivors;
    if (hitSet.size > 0) {
      phase = "round-result";
      phaseTicksRemaining = RULES.ROUND_RESULT_TICKS;
      lastRoundResult = hitSet.size === 2
        ? "both-hit"
        : (hitSet.has(1) ? "left-hit" : "right-hit");
      pendingMatchResult = targetScoreResult(scores);
      if (pendingMatchResult === null && activeMatchTicks >= RULES.MATCH_ACTIVE_TICKS) {
        pendingMatchResult = matchResultFor(scores);
      }
      finalBullets = [];
    } else if (activeMatchTicks >= RULES.MATCH_ACTIVE_TICKS) {
      phase = "match-result";
      matchResult = matchResultFor(scores);
      finalBullets = [];
    }

    return validateState({
      ...state,
      phase,
      phaseTicksRemaining,
      activeMatchTicks,
      scores,
      tanks,
      bullets: finalBullets,
      nextBulletId,
      lastRoundResult,
      pendingMatchResult,
      matchResult,
      pauseReason: null,
      semanticEvents: events,
    });
  }

  function parseAction(rawAction) {
    if (!plainObject(rawAction) || typeof rawAction.type !== "string") {
      throw new TypeError("action schema invalid");
    }
    const schemas = {
      START: ["type"],
      STEP: ["leftMask", "rightMask", "type"],
      PAUSE: ["reason", "type"],
      RESUME: ["type"],
      RESTART: ["type"],
    };
    const keys = schemas[rawAction.type];
    if (!keys || !exactKeys(rawAction, keys)) throw new TypeError("action schema invalid");
    if (rawAction.type === "STEP") {
      return {
        type: "STEP",
        leftMask: validMask(rawAction.leftMask, "leftMask"),
        rightMask: validMask(rawAction.rightMask, "rightMask"),
      };
    }
    if (rawAction.type === "PAUSE") {
      if (!PAUSE_REASONS.includes(rawAction.reason)) throw new RangeError("pause reason invalid");
      return { type: "PAUSE", reason: rawAction.reason };
    }
    return { type: rawAction.type };
  }

  function resetRound(state) {
    return {
      ...state,
      phase: "countdown",
      phaseTicksRemaining: RULES.COUNTDOWN_TICKS,
      tanks: [tankFromSpawn(0), tankFromSpawn(1)],
      bullets: [],
      roundIndex: state.roundIndex + 1,
      pendingMatchResult: null,
      matchResult: null,
      pauseReason: null,
      semanticEvents: [{ type: "round-reset" }],
    };
  }

  function advancePhase(state) {
    if (state.phase === "countdown") {
      if (state.phaseTicksRemaining > 1) {
        return validateState({
          ...state,
          phaseTicksRemaining: state.phaseTicksRemaining - 1,
          semanticEvents: [],
        });
      }
      return validateState({
        ...state,
        phase: "playing",
        phaseTicksRemaining: 0,
        semanticEvents: [{ type: "playing-started" }],
      });
    }
    if (state.phase === "round-result") {
      if (state.phaseTicksRemaining > 1) {
        return validateState({
          ...state,
          phaseTicksRemaining: state.phaseTicksRemaining - 1,
          semanticEvents: [],
        });
      }
      if (state.pendingMatchResult !== null) {
        return validateState({
          ...state,
          phase: "match-result",
          phaseTicksRemaining: 0,
          matchResult: state.pendingMatchResult,
          pendingMatchResult: null,
          semanticEvents: [{ type: "match-finished" }],
        });
      }
      return validateState(resetRound(state));
    }
    return state;
  }

  function applyCommand(rawState, rawAction) {
    let state;
    try {
      const validated = validateState(rawState);
      state = Object.isFrozen(rawState) ? rawState : validated;
    } catch {
      return createInitialState();
    }
    let action;
    try {
      action = parseAction(rawAction);
    } catch {
      return state;
    }
    if (action.type === "START") {
      if (state.phase !== "instructions") return state;
      return validateState({
        ...state,
        phase: "countdown",
        phaseTicksRemaining: RULES.COUNTDOWN_TICKS,
        semanticEvents: [{ type: "match-started" }],
      });
    }
    if (action.type === "STEP") {
      if (state.phase === "playing") {
        return simulatePlayingTick(state, {
          leftMask: action.leftMask,
          rightMask: action.rightMask,
        });
      }
      if (state.phase === "countdown" || state.phase === "round-result") return advancePhase(state);
      return state;
    }
    if (action.type === "PAUSE") {
      if (state.phase !== "countdown" && state.phase !== "playing") return state;
      return validateState({
        ...state,
        phase: "paused",
        phaseTicksRemaining: 0,
        pauseReason: action.reason,
        semanticEvents: [{ type: "paused", reason: action.reason }],
      });
    }
    if (action.type === "RESUME") {
      if (state.phase !== "paused") return state;
      return validateState({
        ...state,
        phase: "countdown",
        phaseTicksRemaining: RULES.COUNTDOWN_TICKS,
        pauseReason: null,
        semanticEvents: [{ type: "resumed" }],
      });
    }
    if (action.type === "RESTART") {
      if (state.phase !== "match-result") return state;
      return validateState(initialData("countdown"));
    }
    return state;
  }

  function step(state, inputFrame) {
    if (!exactKeys(inputFrame, ["leftMask", "rightMask"])) return state;
    return applyCommand(state, { type: "STEP", ...inputFrame });
  }

  function normalizeState(rawState) {
    const state = validateState(rawState);
    const { semanticEvents: ignored, ...logic } = state;
    return deepFreeze(cloneJson(logic, "normalized state"));
  }

  function hashState(state) {
    const source = JSON.stringify(normalizeState(state));
    let hash = 0x811c9dc5;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function replay(rawLog) {
    if (!Array.isArray(rawLog)) throw new TypeError("replay log must be an array");
    let state = createInitialState();
    for (const rawAction of rawLog) {
      const action = parseAction(rawAction);
      const next = applyCommand(state, action);
      if (next === state) throw new Error(`action ${action.type} invalid for phase ${state.phase}`);
      state = next;
    }
    return state;
  }

  function mirrorMask(mask) {
    validMask(mask, "mirror mask");
    let result = mask & ~(
      INPUT_BITS.TURN_LEFT | INPUT_BITS.TURN_RIGHT
    );
    if ((mask & INPUT_BITS.TURN_LEFT) !== 0) result |= INPUT_BITS.TURN_RIGHT;
    if ((mask & INPUT_BITS.TURN_RIGHT) !== 0) result |= INPUT_BITS.TURN_LEFT;
    return result;
  }

  function mirrorAction(rawAction) {
    const action = parseAction(rawAction);
    if (action.type !== "STEP") return deepFreeze({ ...action });
    return deepFreeze({
      type: "STEP",
      leftMask: mirrorMask(action.rightMask),
      rightMask: mirrorMask(action.leftMask),
    });
  }

  function mirrorResult(result) {
    if (result === "left") return "right";
    if (result === "right") return "left";
    if (result === "left-hit") return "right-hit";
    if (result === "right-hit") return "left-hit";
    return result;
  }

  function mirrorEvent(event) {
    if (!plainObject(event)) return cloneJson(event, "semantic event");
    const mirrored = { ...event };
    for (const key of ["ownerId", "targetId", "playerId"]) {
      if (mirrored[key] === 0 || mirrored[key] === 1) mirrored[key] = 1 - mirrored[key];
    }
    return mirrored;
  }

  function mirrorState(rawState) {
    const state = validateState(rawState);
    const tanks = [state.tanks[1], state.tanks[0]].map((tank, id) => ({
      ...tank,
      id,
      xFp: mirrorX(tank.xFp),
      heading: mirrorHeading(tank.heading),
    }));
    const bullets = state.bullets.map((item) => ({
      ...item,
      ownerId: 1 - item.ownerId,
      xFp: mirrorX(item.xFp),
      vxFp: -item.vxFp,
    }));
    return validateState({
      ...state,
      scores: [state.scores[1], state.scores[0]],
      tanks,
      bullets,
      lastRoundResult: mirrorResult(state.lastRoundResult),
      pendingMatchResult: mirrorResult(state.pendingMatchResult),
      matchResult: mirrorResult(state.matchResult),
      semanticEvents: state.semanticEvents.map(mirrorEvent),
    });
  }

  return deepFreeze({
    VERSION,
    RULES,
    INPUT_BITS,
    createInitialState,
    validateState,
    step,
    applyCommand,
    resolveTankMotion,
    tryCreateBullet,
    simulateBulletTick,
    simulatePlayingTick,
    normalizeState,
    hashState,
    replay,
    mirrorState,
    mirrorAction,
  });
});
