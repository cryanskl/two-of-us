(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CapsuleDockingLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_SAFE = Number.MAX_SAFE_INTEGER;
  const SEATS = ["attitude", "thrust"];
  const CONTROLS = [
    { id: "rotate-left", seat: "attitude", code: "KeyA", axis: -1 },
    { id: "rotate-right", seat: "attitude", code: "KeyD", axis: 1 },
    { id: "thrust-forward", seat: "thrust", code: "KeyJ", axis: 1 },
    { id: "thrust-reverse", seat: "thrust", code: "KeyL", axis: -1 },
  ];
  const TICK_RATE = 60;
  const MAX_TICK_BATCH = 5;
  const WORLD_WIDTH = 100000;
  const WORLD_HEIGHT = 62000;
  const POSITION_SCALE = 100;
  const CAPSULE_RADIUS = 2200;
  const ANGLE_STEPS = 256;
  const TRIG_SCALE = 16384;
  const LINEAR_ACCELERATION = 3;
  const LINEAR_DAMPING = 1;
  const MAX_AXIS_VELOCITY = 240;
  const ANGULAR_ACCELERATION = 1;
  const ANGULAR_DAMPING = 1;
  const MAX_ANGULAR_VELOCITY = 4;
  const REQUIRED_STABLE_TICKS = 30;
  const COMMEMORATIVE_POSE = {
    x: 82000,
    y: 31000,
    vx: 0,
    vy: 0,
    angleIndex: 0,
    angularVelocity: 0,
  };
  const STATION_RECTS = [
    { id: "upper-hull", xMin: 84000, xMax: 100000, yMin: 0, yMax: 27000 },
    { id: "lower-hull", xMin: 84000, xMax: 100000, yMin: 35000, yMax: 62000 },
    { id: "dock-back", xMin: 86000, xMax: 100000, yMin: 27000, yMax: 35000 },
  ];
  const SAFE_CENTER = {
    xMin: 2200,
    xMax: 97800,
    yMin: 2200,
    yMax: 59800,
  };
  const DOCK_GATE = {
    xMin: 80500,
    xMax: 83500,
    yMin: 29600,
    yMax: 32400,
    maxAbsVelocityX: 50,
    maxAbsVelocityY: 25,
    targetAngleIndex: 0,
    maxAbsAngleError: 5,
    maxAbsAngularVelocity: 1,
    requiredStableTicks: 30,
  };
  const LEGS = [
    {
      id: "turn-home",
      title: "靠近·把船头转回来",
      initial: { x: 18000, y: 31000, vx: 0, vy: 0, angleIndex: 32, angularVelocity: 0 },
    },
    {
      id: "drop-axis",
      title: "修正·从上方落回轴线",
      initial: { x: 18000, y: 18000, vx: 0, vy: 30, angleIndex: 16, angularVelocity: 0 },
    },
    {
      id: "bleed-drift",
      title: "回家·带着余速停稳",
      initial: { x: 22000, y: 42000, vx: 90, vy: -35, angleIndex: 240, angularVelocity: 0 },
    },
  ];
  const QUARTER_SINE = [
    0, 402, 804, 1205, 1606, 2006, 2404, 2801, 3196, 3590, 3981, 4370, 4756,
    5139, 5520, 5897, 6270, 6639, 7005, 7366, 7723, 8076, 8423, 8765, 9102,
    9434, 9760, 10080, 10394, 10702, 11003, 11297, 11585, 11866, 12140, 12406,
    12665, 12916, 13160, 13395, 13623, 13842, 14053, 14256, 14449, 14635,
    14811, 14978, 15137, 15286, 15426, 15557, 15679, 15791, 15893, 15986,
    16069, 16143, 16207, 16261, 16305, 16340, 16364, 16379, 16384,
  ];
  const CONTROL_BY_ID = Object.fromEntries(CONTROLS.map((control) => [control.id, control]));
  const CONTROL_IDS_BY_SEAT = {
    attitude: ["rotate-left", "rotate-right"],
    thrust: ["thrust-forward", "thrust-reverse"],
  };
  const PHASES = [
    "intro",
    "leg-intro",
    "approaching",
    "failed",
    "docked",
    "mission-result",
    "complete",
  ];

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  function buildTrigTables() {
    const cos = [];
    const sin = [];
    const canonical = (value) => (value === 0 ? 0 : value);
    for (let index = 0; index < ANGLE_STEPS; index += 1) {
      const quadrant = Math.floor(index / 64);
      const offset = index % 64;
      if (quadrant === 0) {
        cos.push(canonical(QUARTER_SINE[64 - offset]));
        sin.push(canonical(QUARTER_SINE[offset]));
      } else if (quadrant === 1) {
        cos.push(canonical(-QUARTER_SINE[offset]));
        sin.push(canonical(QUARTER_SINE[64 - offset]));
      } else if (quadrant === 2) {
        cos.push(canonical(-QUARTER_SINE[64 - offset]));
        sin.push(canonical(-QUARTER_SINE[offset]));
      } else {
        cos.push(canonical(QUARTER_SINE[offset]));
        sin.push(canonical(-QUARTER_SINE[64 - offset]));
      }
    }
    return { cos: deepFreeze(cos), sin: deepFreeze(sin) };
  }

  const tables = buildTrigTables();
  const COS_TABLE = tables.cos;
  const SIN_TABLE = tables.sin;

  function isSafeInteger(value) {
    return Number.isSafeInteger(value);
  }

  function ownDataSnapshot(value, keys) {
    try {
      if (value === null || typeof value !== "object") return null;
      if (Object.getPrototypeOf(value) !== Object.prototype) return null;
      const ownKeys = Reflect.ownKeys(value);
      if (
        ownKeys.length !== keys.length
        || ownKeys.some((key) => typeof key !== "string")
        || keys.some((key) => !ownKeys.includes(key))
      ) return null;
      const snapshot = {};
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        snapshot[key] = descriptor.value;
      }
      return snapshot;
    } catch {
      return null;
    }
  }

  function nativeArraySnapshot(value) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")) return null;
      const length = lengthDescriptor.value;
      if (!isSafeInteger(length) || length < 0) return null;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== length + 1 || ownKeys[ownKeys.length - 1] !== "length") return null;
      const snapshot = [];
      for (let index = 0; index < length; index += 1) {
        if (ownKeys[index] !== String(index)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        snapshot.push(descriptor.value);
      }
      return snapshot;
    } catch {
      return null;
    }
  }

  function roundDiv(numerator, denominator) {
    if (
      !isSafeInteger(numerator)
      || !isSafeInteger(denominator)
      || denominator <= 0
      || Math.abs(numerator) > MAX_SAFE - Math.floor(denominator / 2)
    ) return null;
    const half = Math.floor(denominator / 2);
    if (numerator >= 0) return Math.floor((numerator + half) / denominator);
    return -Math.floor((-numerator + half) / denominator);
  }

  function normalizeAngle(value) {
    if (!isSafeInteger(value)) return null;
    return ((value % ANGLE_STEPS) + ANGLE_STEPS) % ANGLE_STEPS;
  }

  function shortestAngleDiff(from, target) {
    if (!isSafeInteger(from) || !isSafeInteger(target)) return null;
    const normalized = normalizeAngle(from - target);
    return normalized > 127 ? normalized - ANGLE_STEPS : normalized;
  }

  function approachZero(value, amount) {
    if (!isSafeInteger(value) || !isSafeInteger(amount) || amount < 0) return null;
    if (value > 0) return Math.max(0, value - amount);
    if (value < 0) return Math.min(0, value + amount);
    return 0;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function circleIntersectsAabb(circle, bounds) {
    const circleData = ownDataSnapshot(circle, ["x", "y", "radius"]);
    const boundsData = ownDataSnapshot(bounds, ["xMin", "xMax", "yMin", "yMax"]);
    if (
      !circleData
      || !boundsData
      || !Object.values(circleData).every(isSafeInteger)
      || !Object.values(boundsData).every(isSafeInteger)
      || circleData.radius < 0
      || boundsData.xMin > boundsData.xMax
      || boundsData.yMin > boundsData.yMax
    ) return null;
    const nearestX = clamp(circleData.x, boundsData.xMin, boundsData.xMax);
    const nearestY = clamp(circleData.y, boundsData.yMin, boundsData.yMax);
    const dx = circleData.x - nearestX;
    const dy = circleData.y - nearestY;
    if (
      !isSafeInteger(dx)
      || !isSafeInteger(dy)
      || Math.abs(dx) > Math.floor(Math.sqrt(MAX_SAFE / 2))
      || Math.abs(dy) > Math.floor(Math.sqrt(MAX_SAFE / 2))
    ) return null;
    const squaredDistance = dx * dx + dy * dy;
    const squaredRadius = circleData.radius * circleData.radius;
    if (!isSafeInteger(squaredDistance) || !isSafeInteger(squaredRadius)) return null;
    return squaredDistance <= squaredRadius;
  }

  function heldSnapshot(value) {
    const held = ownDataSnapshot(value, ["attitude", "thrust"]);
    if (!held) return null;
    const snapshot = {};
    for (const seat of SEATS) {
      const controls = nativeArraySnapshot(held[seat]);
      if (
        !controls
        || controls.length > 2
        || new Set(controls).size !== controls.length
        || controls.some((control) => !CONTROL_IDS_BY_SEAT[seat].includes(control))
      ) return null;
      snapshot[seat] = controls;
    }
    return snapshot;
  }

  function pointFailure(x, y) {
    if (x < SAFE_CENTER.xMin || x > SAFE_CENTER.xMax || y < SAFE_CENTER.yMin || y > SAFE_CENTER.yMax) {
      return { status: "drifted", obstacleId: null };
    }
    for (const rectangle of STATION_RECTS) {
      const collides = circleIntersectsAabb(
        { x, y, radius: CAPSULE_RADIUS },
        {
          xMin: rectangle.xMin,
          xMax: rectangle.xMax,
          yMin: rectangle.yMin,
          yMax: rectangle.yMax,
        },
      );
      if (collides) return { status: "hull-contact", obstacleId: rectangle.id };
    }
    return null;
  }

  const FALSE_GATE = deepFreeze({
    positionOk: false,
    velocityOk: false,
    angleOk: false,
    angularVelocityOk: false,
    controlsReleased: false,
    collisionFree: false,
    allOk: false,
  });

  function evaluateDockGate(physics, heldControls) {
    const data = ownDataSnapshot(
      physics,
      ["x", "y", "vx", "vy", "angleIndex", "angularVelocity"],
    );
    const held = heldSnapshot(heldControls);
    if (
      !data
      || !held
      || !Object.values(data).every(isSafeInteger)
      || normalizeAngle(data.angleIndex) !== data.angleIndex
    ) return FALSE_GATE;
    const angleError = shortestAngleDiff(data.angleIndex, DOCK_GATE.targetAngleIndex);
    const result = {
      positionOk: (
        data.x >= DOCK_GATE.xMin
        && data.x <= DOCK_GATE.xMax
        && data.y >= DOCK_GATE.yMin
        && data.y <= DOCK_GATE.yMax
      ),
      velocityOk: (
        Math.abs(data.vx) <= DOCK_GATE.maxAbsVelocityX
        && Math.abs(data.vy) <= DOCK_GATE.maxAbsVelocityY
      ),
      angleOk: Math.abs(angleError) <= DOCK_GATE.maxAbsAngleError,
      angularVelocityOk: Math.abs(data.angularVelocity) <= DOCK_GATE.maxAbsAngularVelocity,
      controlsReleased: held.attitude.length === 0 && held.thrust.length === 0,
      collisionFree: pointFailure(data.x, data.y) === null,
      allOk: false,
    };
    result.allOk = (
      result.positionOk
      && result.velocityOk
      && result.angleOk
      && result.angularVelocityOk
      && result.controlsReleased
      && result.collisionFree
    );
    return deepFreeze(result);
  }

  const DEFAULT_CONFIG = deepFreeze({
    seats: ["你", "TA"],
    composeCompletionNote(summary) {
      return `${summary.seats[0]}和${summary.seats[1]}，转一点，推一点，终于把这一程稳稳接回家。`;
    },
  });

  function trimUnicode(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function graphemes(value) {
    try {
      if (typeof Intl === "object" && typeof Intl.Segmenter === "function") {
        return Array.from(new Intl.Segmenter("zh", { granularity: "grapheme" }).segment(value), (item) => item.segment);
      }
    } catch {
      // Fall through to code points.
    }
    return Array.from(value);
  }

  function normalizeConfig(candidate) {
    const data = ownDataSnapshot(candidate, ["seats", "composeCompletionNote"]);
    if (!data || typeof data.composeCompletionNote !== "function") return DEFAULT_CONFIG;
    const composer = data.composeCompletionNote;
    const seats = nativeArraySnapshot(data.seats);
    if (!seats || seats.length !== 2) return DEFAULT_CONFIG;
    const normalizedSeats = seats.map(trimUnicode);
    if (
      normalizedSeats.some((name) => {
        const length = graphemes(name).length;
        return length < 1 || length > 12;
      })
      || normalizedSeats[0] === normalizedSeats[1]
    ) return DEFAULT_CONFIG;
    return deepFreeze({
      seats: normalizedSeats,
      composeCompletionNote(summary) {
        return composer(summary);
      },
    });
  }

  function summarySnapshot(summary) {
    const data = ownDataSnapshot(summary, ["seats", "legCount", "totalAttempts", "retries", "legs"]);
    if (!data) return null;
    const seats = nativeArraySnapshot(data.seats);
    const legs = nativeArraySnapshot(data.legs);
    if (
      !seats
      || seats.length !== 2
      || seats.some((value) => typeof value !== "string")
      || !legs
      || legs.length !== 3
      || legs.some((value) => typeof value !== "string")
      || !isSafeInteger(data.legCount)
      || data.legCount !== 3
      || !isSafeInteger(data.totalAttempts)
      || data.totalAttempts < 3
      || !isSafeInteger(data.retries)
      || data.retries !== data.totalAttempts - 3
    ) return null;
    return {
      seats,
      legCount: data.legCount,
      totalAttempts: data.totalAttempts,
      retries: data.retries,
      legs,
    };
  }

  function defaultCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，转一点，推一点，终于把这一程稳稳接回家。`;
  }

  function resolveCompletionNote(summary, candidateConfig) {
    const safeSummary = summarySnapshot(summary);
    if (!safeSummary) {
      return defaultCompletionNote({
        seats: DEFAULT_CONFIG.seats,
      });
    }
    const config = normalizeConfig(candidateConfig);
    const detachedSummary = deepFreeze(structuredCopy(safeSummary));
    try {
      const result = config.composeCompletionNote(detachedSummary);
      if (result && typeof result.then === "function") return defaultCompletionNote(detachedSummary);
      if (typeof result !== "string") return defaultCompletionNote(detachedSummary);
      const trimmed = result.trim();
      if (graphemes(trimmed).length < 1 || graphemes(trimmed).length > 120) {
        return defaultCompletionNote(detachedSummary);
      }
      return trimmed;
    } catch {
      return defaultCompletionNote(detachedSummary);
    }
  }

  function structuredCopy(value) {
    if (Array.isArray(value)) return value.map(structuredCopy);
    if (value && typeof value === "object") {
      const copy = {};
      for (const [key, item] of Object.entries(value)) copy[key] = structuredCopy(item);
      return copy;
    }
    return value;
  }

  function emptyHeld() {
    return { attitude: [], thrust: [] };
  }

  function emptyControlTicks() {
    return { attitude: 0, thrust: 0 };
  }

  function stateFromLeg(phase, legIndex, completedLegs, attempt, revision) {
    const initial = LEGS[legIndex].initial;
    return {
      phase,
      legIndex,
      x: initial.x,
      y: initial.y,
      vx: initial.vx,
      vy: initial.vy,
      angleIndex: initial.angleIndex,
      angularVelocity: initial.angularVelocity,
      heldControls: emptyHeld(),
      stableTicks: 0,
      legTick: 0,
      controlTicks: emptyControlTicks(),
      attempt,
      completedLegs: structuredCopy(completedLegs),
      lastResult: null,
      revision,
    };
  }

  function createInitialState() {
    return deepFreeze(stateFromLeg("intro", 0, [], 1, 0));
  }

  function completedLegsSnapshot(value) {
    const records = nativeArraySnapshot(value);
    if (!records || records.length > LEGS.length) return null;
    const snapshot = [];
    let attemptsTotal = 0;
    let attitudeTotal = 0;
    let thrustTotal = 0;
    for (let index = 0; index < records.length; index += 1) {
      const record = ownDataSnapshot(records[index], ["legId", "attempts", "attitudeTicks", "thrustTicks"]);
      if (
        !record
        || record.legId !== LEGS[index].id
        || !isSafeInteger(record.attempts)
        || record.attempts < 1
        || !isSafeInteger(record.attitudeTicks)
        || record.attitudeTicks < 1
        || !isSafeInteger(record.thrustTicks)
        || record.thrustTicks < 1
      ) return null;
      attemptsTotal += record.attempts;
      attitudeTotal += record.attitudeTicks;
      thrustTotal += record.thrustTicks;
      if (
        !isSafeInteger(attemptsTotal)
        || !isSafeInteger(attitudeTotal)
        || !isSafeInteger(thrustTotal)
      ) return null;
      snapshot.push(record);
    }
    return snapshot;
  }

  function lastResultSnapshot(value, legIndex) {
    if (value === null) return null;
    const data = ownDataSnapshot(value, ["status", "legId", "obstacleId"]);
    if (
      !data
      || !["hull-contact", "drifted", "docked"].includes(data.status)
      || data.legId !== LEGS[legIndex].id
    ) return false;
    if (data.status === "hull-contact" && !STATION_RECTS.some((rect) => rect.id === data.obstacleId)) return false;
    if (data.status !== "hull-contact" && data.obstacleId !== null) return false;
    return data;
  }

  function stateSnapshot(value) {
    const keys = [
      "phase", "legIndex", "x", "y", "vx", "vy", "angleIndex", "angularVelocity",
      "heldControls", "stableTicks", "legTick", "controlTicks", "attempt", "completedLegs",
      "lastResult", "revision",
    ];
    const state = ownDataSnapshot(value, keys);
    if (!state || !PHASES.includes(state.phase)) return null;
    const integerKeys = [
      "legIndex", "x", "y", "vx", "vy", "angleIndex", "angularVelocity", "stableTicks",
      "legTick", "attempt", "revision",
    ];
    if (integerKeys.some((key) => !isSafeInteger(state[key]))) return null;
    if (
      state.legIndex < 0
      || state.legIndex >= LEGS.length
      || state.angleIndex < 0
      || state.angleIndex >= ANGLE_STEPS
      || Math.abs(state.vx) > MAX_AXIS_VELOCITY
      || Math.abs(state.vy) > MAX_AXIS_VELOCITY
      || Math.abs(state.angularVelocity) > MAX_ANGULAR_VELOCITY
      || state.stableTicks < 0
      || state.stableTicks > REQUIRED_STABLE_TICKS
      || state.legTick < 0
      || state.attempt < 1
      || state.revision < 0
    ) return null;
    const held = heldSnapshot(state.heldControls);
    const controls = ownDataSnapshot(state.controlTicks, ["attitude", "thrust"]);
    const completed = completedLegsSnapshot(state.completedLegs);
    const lastResult = lastResultSnapshot(state.lastResult, state.legIndex);
    const completedLimit = (
      state.phase === "docked"
      || state.phase === "mission-result"
      || state.phase === "complete"
    ) ? state.legIndex + 1 : state.legIndex;
    if (
      !held
      || !controls
      || !completed
      || lastResult === false
      || !isSafeInteger(controls.attitude)
      || !isSafeInteger(controls.thrust)
      || controls.attitude < 0
      || controls.thrust < 0
      || controls.attitude > state.legTick
      || controls.thrust > state.legTick
      || completed.length > completedLimit
      || pointFailure(state.x, state.y) !== null
    ) return null;
    state.heldControls = held;
    state.controlTicks = controls;
    state.completedLegs = completed;
    state.lastResult = lastResult;
    const heldReleased = held.attitude.length === 0 && held.thrust.length === 0;
    const controlsZero = controls.attitude === 0 && controls.thrust === 0;
    const initial = LEGS[state.legIndex].initial;
    const atInitial = (
      state.x === initial.x
      && state.y === initial.y
      && state.vx === initial.vx
      && state.vy === initial.vy
      && state.angleIndex === initial.angleIndex
      && state.angularVelocity === initial.angularVelocity
    );
    const gate = evaluateDockGate(physicsObject(state), held);
    if (state.phase === "intro") {
      if (
        state.legIndex !== 0
        || completed.length !== 0
        || !atInitial
        || !heldReleased
        || state.stableTicks !== 0
        || state.legTick !== 0
        || !controlsZero
        || state.attempt !== 1
        || lastResult !== null
      ) return null;
    } else if (state.phase === "leg-intro") {
      if (
        completed.length !== state.legIndex
        || !atInitial
        || !heldReleased
        || state.stableTicks !== 0
        || state.legTick !== 0
        || !controlsZero
        || lastResult !== null
      ) return null;
    } else if (state.phase === "approaching") {
      if (
        completed.length !== state.legIndex
        || state.stableTicks >= REQUIRED_STABLE_TICKS
        || lastResult !== null
        || (state.stableTicks > 0 && (!heldReleased || !gate.allOk))
      ) return null;
    } else if (state.phase === "failed") {
      if (
        completed.length !== state.legIndex
        || !heldReleased
        || state.stableTicks !== 0
        || state.vx !== 0
        || state.vy !== 0
        || state.angularVelocity !== 0
        || !lastResult
        || !["hull-contact", "drifted"].includes(lastResult.status)
      ) return null;
    } else if (state.phase === "docked") {
      const latest = completed[completed.length - 1];
      if (
        completed.length !== state.legIndex + 1
        || !heldReleased
        || state.stableTicks !== REQUIRED_STABLE_TICKS
        || !gate.allOk
        || !lastResult
        || lastResult.status !== "docked"
        || latest.attempts !== state.attempt
        || latest.attitudeTicks !== controls.attitude
        || latest.thrustTicks !== controls.thrust
      ) return null;
    } else {
      const atCommemorativePose = (
        state.x === COMMEMORATIVE_POSE.x
        && state.y === COMMEMORATIVE_POSE.y
        && state.vx === COMMEMORATIVE_POSE.vx
        && state.vy === COMMEMORATIVE_POSE.vy
        && state.angleIndex === COMMEMORATIVE_POSE.angleIndex
        && state.angularVelocity === COMMEMORATIVE_POSE.angularVelocity
      );
      if (
        state.legIndex !== LEGS.length - 1
        || completed.length !== LEGS.length
        || !atCommemorativePose
        || !heldReleased
        || state.stableTicks !== 0
        || state.legTick !== 0
        || !controlsZero
        || state.attempt !== 1
        || lastResult !== null
      ) return null;
    }
    return state;
  }

  function actionSnapshot(value) {
    const typeData = ownDataSnapshot(value, ["type"]);
    if (typeData && ["START", "BEGIN_LEG", "TICK", "SUSPEND", "RETRY_LEG", "NEXT_LEG", "FINISH", "RESTART"].includes(typeData.type)) {
      return typeData;
    }
    const pressData = ownDataSnapshot(value, ["type", "seat", "control"]);
    if (pressData && ["PRESS", "RELEASE"].includes(pressData.type)) return pressData;
    const tickData = ownDataSnapshot(value, ["type", "count"]);
    if (tickData && tickData.type === "TICK") return tickData;
    return null;
  }

  function validControlAction(action) {
    if (typeof action.seat !== "string" || typeof action.control !== "string") return false;
    const control = CONTROL_BY_ID[action.control];
    return control && control.seat === action.seat;
  }

  function cloneState(state) {
    return structuredCopy(state);
  }

  function axisForSeat(held, seat) {
    return held[seat].reduce((sum, controlId) => sum + CONTROL_BY_ID[controlId].axis, 0);
  }

  function incrementSafe(value) {
    return isSafeInteger(value) && value < MAX_SAFE ? value + 1 : null;
  }

  function moveWithCollision(x, y, vx, vy) {
    const steps = Math.max(Math.abs(vx), Math.abs(vy));
    let lastX = x;
    let lastY = y;
    if (steps === 0) {
      const failure = pointFailure(x, y);
      return failure ? { failure, x, y } : { failure: null, x, y };
    }
    let previousCandidateX = null;
    let previousCandidateY = null;
    for (let index = 1; index <= steps; index += 1) {
      const xOffset = roundDiv(vx * index, steps);
      const yOffset = roundDiv(vy * index, steps);
      if (xOffset === null || yOffset === null) return null;
      const candidateX = x + xOffset;
      const candidateY = y + yOffset;
      if (candidateX === previousCandidateX && candidateY === previousCandidateY && index !== steps) continue;
      previousCandidateX = candidateX;
      previousCandidateY = candidateY;
      const failure = pointFailure(candidateX, candidateY);
      if (failure) return { failure, x: lastX, y: lastY };
      lastX = candidateX;
      lastY = candidateY;
    }
    return { failure: null, x: lastX, y: lastY };
  }

  function physicsObject(state) {
    return {
      x: state.x,
      y: state.y,
      vx: state.vx,
      vy: state.vy,
      angleIndex: state.angleIndex,
      angularVelocity: state.angularVelocity,
    };
  }

  function applyTick(state) {
    const torque = axisForSeat(state.heldControls, "attitude") * ANGULAR_ACCELERATION;
    const thrust = axisForSeat(state.heldControls, "thrust");
    const nextLegTick = incrementSafe(state.legTick);
    const nextAttitudeTicks = torque === 0
      ? state.controlTicks.attitude
      : incrementSafe(state.controlTicks.attitude);
    const nextThrustTicks = thrust === 0
      ? state.controlTicks.thrust
      : incrementSafe(state.controlTicks.thrust);
    if (nextLegTick === null || nextAttitudeTicks === null || nextThrustTicks === null) return null;

    state.angularVelocity = torque === 0
      ? approachZero(state.angularVelocity, ANGULAR_DAMPING)
      : state.angularVelocity + torque;
    state.angularVelocity = clamp(
      state.angularVelocity,
      -MAX_ANGULAR_VELOCITY,
      MAX_ANGULAR_VELOCITY,
    );
    state.angleIndex = normalizeAngle(state.angleIndex + state.angularVelocity);

    if (thrust === 0) {
      state.vx = approachZero(state.vx, LINEAR_DAMPING);
      state.vy = approachZero(state.vy, LINEAR_DAMPING);
    } else {
      const xProduct = COS_TABLE[state.angleIndex] * LINEAR_ACCELERATION * thrust;
      const yProduct = SIN_TABLE[state.angleIndex] * LINEAR_ACCELERATION * thrust;
      const accelerationX = roundDiv(xProduct, TRIG_SCALE);
      const accelerationY = roundDiv(yProduct, TRIG_SCALE);
      if (accelerationX === null || accelerationY === null) return null;
      state.vx = clamp(state.vx + accelerationX, -MAX_AXIS_VELOCITY, MAX_AXIS_VELOCITY);
      state.vy = clamp(state.vy + accelerationY, -MAX_AXIS_VELOCITY, MAX_AXIS_VELOCITY);
    }
    state.legTick = nextLegTick;
    state.controlTicks.attitude = nextAttitudeTicks;
    state.controlTicks.thrust = nextThrustTicks;

    const movement = moveWithCollision(state.x, state.y, state.vx, state.vy);
    if (!movement) return null;
    state.x = movement.x;
    state.y = movement.y;
    if (movement.failure) {
      state.vx = 0;
      state.vy = 0;
      state.angularVelocity = 0;
      state.heldControls = emptyHeld();
      state.stableTicks = 0;
      state.phase = "failed";
      state.lastResult = {
        status: movement.failure.status,
        legId: LEGS[state.legIndex].id,
        obstacleId: movement.failure.obstacleId,
      };
      return state;
    }

    const gate = evaluateDockGate(physicsObject(state), state.heldControls);
    state.stableTicks = gate.allOk ? state.stableTicks + 1 : 0;
    if (state.stableTicks >= REQUIRED_STABLE_TICKS) {
      const completed = {
        legId: LEGS[state.legIndex].id,
        attempts: state.attempt,
        attitudeTicks: state.controlTicks.attitude,
        thrustTicks: state.controlTicks.thrust,
      };
      if (completed.attitudeTicks < 1 || completed.thrustTicks < 1) return null;
      state.completedLegs.push(completed);
      state.heldControls = emptyHeld();
      state.stableTicks = REQUIRED_STABLE_TICKS;
      state.phase = "docked";
      state.lastResult = {
        status: "docked",
        legId: LEGS[state.legIndex].id,
        obstacleId: null,
      };
    }
    return state;
  }

  function reduce(stateInput, actionInput) {
    const state = stateSnapshot(stateInput);
    if (!state) return createInitialState();
    const action = actionSnapshot(actionInput);
    if (!action || state.revision >= MAX_SAFE) return stateInput;
    let next = cloneState(state);

    if (action.type === "START") {
      if (state.phase !== "intro") return stateInput;
      next.phase = "leg-intro";
    } else if (action.type === "BEGIN_LEG") {
      if (state.phase !== "leg-intro") return stateInput;
      next.phase = "approaching";
    } else if (action.type === "PRESS" || action.type === "RELEASE") {
      if (state.phase !== "approaching" || !validControlAction(action)) return stateInput;
      const held = next.heldControls[action.seat];
      const index = held.indexOf(action.control);
      if (action.type === "PRESS") {
        if (index !== -1) return stateInput;
        held.push(action.control);
        next.stableTicks = 0;
      } else {
        if (index === -1) return stateInput;
        held.splice(index, 1);
      }
    } else if (action.type === "TICK") {
      if (
        state.phase !== "approaching"
        || !isSafeInteger(action.count)
        || action.count < 1
        || action.count > MAX_TICK_BATCH
      ) return stateInput;
      for (let index = 0; index < action.count && next.phase === "approaching"; index += 1) {
        const result = applyTick(next);
        if (!result) return stateInput;
        next = result;
      }
    } else if (action.type === "SUSPEND") {
      if (state.phase !== "approaching") return stateInput;
      next = stateFromLeg("leg-intro", state.legIndex, state.completedLegs, state.attempt, state.revision);
    } else if (action.type === "RETRY_LEG") {
      if (state.phase !== "failed" || state.attempt >= MAX_SAFE) return stateInput;
      next = stateFromLeg("leg-intro", state.legIndex, state.completedLegs, state.attempt + 1, state.revision);
    } else if (action.type === "NEXT_LEG") {
      if (state.phase !== "docked") return stateInput;
      if (state.completedLegs.length < LEGS.length) {
        next = stateFromLeg("leg-intro", state.legIndex + 1, state.completedLegs, 1, state.revision);
      } else {
        next = {
          phase: "mission-result",
          legIndex: LEGS.length - 1,
          ...COMMEMORATIVE_POSE,
          heldControls: emptyHeld(),
          stableTicks: 0,
          legTick: 0,
          controlTicks: emptyControlTicks(),
          attempt: 1,
          completedLegs: structuredCopy(state.completedLegs),
          lastResult: null,
          revision: state.revision,
        };
      }
    } else if (action.type === "FINISH") {
      if (state.phase !== "mission-result") return stateInput;
      next.phase = "complete";
    } else if (action.type === "RESTART") {
      if (state.phase !== "complete") return stateInput;
      next = cloneState(createInitialState());
      next.revision = state.revision;
    } else {
      return stateInput;
    }

    next.revision += 1;
    return deepFreeze(next);
  }

  function statusTextFor(state) {
    if (state.phase === "intro") {
      return "一边只管转，一边只管推。把位置、速度、角度和旋转一起放进安全窗。";
    }
    if (state.phase === "leg-intro") {
      return `第 ${state.legIndex + 1} 段：${LEGS[state.legIndex].title}。先看船头和余速，再一起接近。`;
    }
    if (state.phase === "approaching") return "接口就在右边；轻推、回正、收住余速。";
    if (state.phase === "failed") {
      return state.lastResult.status === "hull-contact"
        ? "舱体碰到接口外壳了，这一段重新靠近。"
        : "舱体飘出近距安全区了，这一段重新靠近。";
    }
    if (state.phase === "docked") return "位置、速度和船头一起稳住了。";
    if (state.phase === "mission-result") return "三次靠近，都被我们稳稳接住。";
    return "对接完成，这一程一起回家。";
  }

  function makeSummary(state, config) {
    if (!["mission-result", "complete"].includes(state.phase)) return null;
    const totalAttempts = state.completedLegs.reduce((sum, record) => sum + record.attempts, 0);
    return {
      seats: [...config.seats],
      legCount: LEGS.length,
      totalAttempts,
      retries: totalAttempts - LEGS.length,
      legs: LEGS.map((leg) => leg.title),
    };
  }

  function getPublicView(stateInput, candidateConfig) {
    const state = stateSnapshot(stateInput) || stateSnapshot(createInitialState());
    const config = normalizeConfig(candidateConfig);
    let gate = evaluateDockGate(physicsObject(state), state.heldControls);
    let gateVisible = true;
    let gateStatusText;
    if (state.phase === "failed") {
      gate = deepFreeze({
        ...gate,
        collisionFree: false,
        allOk: false,
      });
      gateStatusText = "本次接近已经结束，路径未安全。";
    } else if (state.phase === "docked") {
      gate = deepFreeze({
        positionOk: true,
        velocityOk: true,
        angleOk: true,
        angularVelocityOk: true,
        controlsReleased: true,
        collisionFree: true,
        allOk: true,
      });
      gateStatusText = "已经稳定 30 / 30。";
    } else if (state.phase === "mission-result" || state.phase === "complete") {
      gateVisible = false;
      gateStatusText = "";
    } else if (gate.allOk) {
      gateStatusText = `六条条件都安全，继续保持 ${state.stableTicks} / 30。`;
    } else {
      gateStatusText = "六条条件还没有同时安全。";
    }
    const completedLegs = state.completedLegs.map((record, index) => ({
      legId: record.legId,
      title: LEGS[index].title,
      attempts: record.attempts,
    }));
    const summary = makeSummary(state, config);
    return deepFreeze({
      phase: state.phase,
      legIndex: state.legIndex,
      legCount: LEGS.length,
      currentLeg: {
        id: LEGS[state.legIndex].id,
        title: LEGS[state.legIndex].title,
      },
      statusText: statusTextFor(state),
      physics: {
        x: state.x,
        y: state.y,
        vx: state.vx,
        vy: state.vy,
        angleIndex: state.angleIndex,
        angleError: shortestAngleDiff(state.angleIndex, DOCK_GATE.targetAngleIndex),
        angularVelocity: state.angularVelocity,
      },
      heldControls: structuredCopy(state.heldControls),
      stableTicks: state.stableTicks,
      requiredStableTicks: REQUIRED_STABLE_TICKS,
      gate,
      gateVisible,
      gateStatusText,
      attempt: state.attempt,
      completedLegs,
      completedCount: completedLegs.length,
      seats: [...config.seats],
      controls: CONTROLS.map(structuredCopy),
      lastResult: state.lastResult ? structuredCopy(state.lastResult) : null,
      isComplete: state.phase === "complete",
      summary,
      revision: state.revision,
    });
  }

  return deepFreeze({
    SEATS,
    CONTROLS,
    LEGS,
    STATION_RECTS,
    DOCK_GATE,
    TICK_RATE,
    MAX_TICK_BATCH,
    POSITION_SCALE,
    CAPSULE_RADIUS,
    ANGLE_STEPS,
    TRIG_SCALE,
    COS_TABLE,
    SIN_TABLE,
    DEFAULT_CONFIG,
    normalizeConfig,
    resolveCompletionNote,
    roundDiv,
    normalizeAngle,
    shortestAngleDiff,
    approachZero,
    circleIntersectsAabb,
    evaluateDockGate,
    createInitialState,
    reduce,
    getPublicView,
  });
});
