(function (root, factory) {
  "use strict";
  root.LIGHTHOUSE_PASSAGE_LOGIC = factory(root.LIGHTHOUSE_PASSAGE_LEVELS);
})(typeof globalThis !== "undefined" ? globalThis : this, function (levelModule) {
  "use strict";

  if (!levelModule || !Array.isArray(levelModule.LEVELS)) {
    throw new Error("请先加载 levels.js");
  }

  const { WORLD_WIDTH, WORLD_HEIGHT, BOAT_RADIUS, LEVELS } = levelModule;
  const FIXED_DT = 1 / 120;
  const LIGHT_ANGULAR_ACCELERATION = 5.4;
  const LIGHT_ANGULAR_DRAG = 6.2;
  const MAX_LIGHT_ANGULAR_SPEED = 1.8;
  const BOAT_THRUST = 112;
  const BOAT_REVERSE_THRUST = 68;
  const BOAT_WATER_DRAG = 1.35;
  const MAX_BOAT_SPEED = 108;
  const RUDDER_RESPONSE = 7.5;
  const BASE_TURN_RATE = 0.22;
  const SPEED_TURN_RATE = 1.22;
  const REVEAL_SECONDS = 2.2;
  const HARBOR_MAX_SPEED = 16;
  const GOAL_HOLD_SECONDS = 0.6;
  const PHASES = Object.freeze(["ready", "playing", "paused", "level-complete", "game-complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "blur", "hidden"]);
  const ZERO_INPUT = deepFreeze({
    lighthouse: { turn: 0 },
    boat: { throttle: 0, steer: 0 },
  });

  function createGameState(levelIndex = 0) {
    return stateForLevel(isLevelIndex(levelIndex) ? levelIndex : 0, "ready");
  }

  function startGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "ready") return state;
    return freezeState({ ...state, phase: "playing" });
  }

  function stepGame(state, input = ZERO_INPUT) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "playing") return state;

    const level = LEVELS[state.levelIndex];
    const controls = normalizeInput(input);
    const lighthouse = { ...state.lighthouse };
    const boat = {
      position: copyPoint(state.boat.position),
      velocity: copyPoint(state.boat.velocity),
      heading: state.boat.heading,
      rudder: state.boat.rudder,
    };

    lighthouse.angularVelocity += controls.lighthouse.turn * LIGHT_ANGULAR_ACCELERATION * FIXED_DT;
    lighthouse.angularVelocity *= Math.max(0, 1 - LIGHT_ANGULAR_DRAG * FIXED_DT);
    lighthouse.angularVelocity = clamp(
      lighthouse.angularVelocity,
      -MAX_LIGHT_ANGULAR_SPEED,
      MAX_LIGHT_ANGULAR_SPEED,
    );
    lighthouse.angle = normalizeAngle(lighthouse.angle + lighthouse.angularVelocity * FIXED_DT);

    boat.rudder += (controls.boat.steer - boat.rudder) * Math.min(1, RUDDER_RESPONSE * FIXED_DT);
    const currentSpeed = vectorLength(boat.velocity);
    const turnRate = BASE_TURN_RATE + SPEED_TURN_RATE * Math.min(1, currentSpeed / MAX_BOAT_SPEED);
    boat.heading = normalizeAngle(boat.heading + boat.rudder * turnRate * FIXED_DT);

    const acceleration = controls.boat.throttle >= 0
      ? controls.boat.throttle * BOAT_THRUST
      : controls.boat.throttle * BOAT_REVERSE_THRUST;
    boat.velocity.x += Math.cos(boat.heading) * acceleration * FIXED_DT;
    boat.velocity.y += Math.sin(boat.heading) * acceleration * FIXED_DT;
    const dragFactor = Math.max(0, 1 - BOAT_WATER_DRAG * FIXED_DT);
    boat.velocity.x *= dragFactor;
    boat.velocity.y *= dragFactor;
    limitVector(boat.velocity, MAX_BOAT_SPEED);
    boat.position.x += boat.velocity.x * FIXED_DT;
    boat.position.y += boat.velocity.y * FIXED_DT;

    const elapsed = state.elapsed + FIXED_DT;
    const stepCount = state.stepCount + 1;
    const revealedUntil = state.revealedUntil.slice();
    const beaconsFound = state.beaconsFound.slice();

    level.reefs.forEach((reef, index) => {
      if (circleInBeam(reef, level.lighthouse, lighthouse.angle)) {
        revealedUntil[index] = elapsed + REVEAL_SECONDS;
      }
    });
    level.beacons.forEach((beacon, index) => {
      if (circleInBeam(beacon, level.lighthouse, lighthouse.angle)) beaconsFound[index] = true;
    });

    const base = {
      ...state,
      lighthouse,
      boat,
      elapsed,
      stepCount,
      revealedUntil,
      beaconsFound,
      pauseReason: null,
    };

    if (boatIsInDanger(boat, level)) return resetToCheckpoint(base);

    let checkpointIndex = state.checkpointIndex;
    let mappedCheckpoint = 1;
    level.beacons.forEach((beacon, index) => {
      if (!beacon.checkpoint) return;
      if (beaconsFound[index] && circleIntersectsCircle(
        boat.position,
        BOAT_RADIUS,
        beacon,
        beacon.radius,
      )) {
        checkpointIndex = Math.max(checkpointIndex, mappedCheckpoint);
      }
      mappedCheckpoint += 1;
    });

    const withCheckpoint = { ...base, checkpointIndex };
    const atGoal = goalConditionsMet(withCheckpoint);
    const goalHold = atGoal ? Math.min(GOAL_HOLD_SECONDS, state.goalHold + FIXED_DT) : 0;
    const complete = goalHold >= GOAL_HOLD_SECONDS - 1e-10;
    const finalLevel = state.levelIndex === LEVELS.length - 1;

    return freezeState({
      ...withCheckpoint,
      phase: complete ? (finalLevel ? "game-complete" : "level-complete") : "playing",
      goalHold,
    });
  }

  function pauseGame(state, reason = "manual") {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "playing") return state;
    return freezeState({
      ...state,
      phase: "paused",
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
    });
  }

  function resumeGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "paused") return state;
    return freezeState({ ...state, phase: "playing", pauseReason: null });
  }

  function restartLevel(state) {
    if (!isValidState(state)) return createGameState();
    return stateForLevel(state.levelIndex, state.phase === "ready" ? "ready" : "playing");
  }

  function nextLevel(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "level-complete" || state.levelIndex >= LEVELS.length - 1) return state;
    return stateForLevel(state.levelIndex + 1, "playing");
  }

  function replayGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "game-complete") return state;
    return stateForLevel(0, "playing");
  }

  function normalizeInput(input) {
    const lighthouseInput = input && input.lighthouse;
    const boatInput = input && input.boat;
    return deepFreeze({
      lighthouse: {
        turn: finiteOrZero(lighthouseInput && lighthouseInput.turn),
      },
      boat: {
        throttle: finiteOrZero(boatInput && boatInput.throttle),
        steer: finiteOrZero(boatInput && boatInput.steer),
      },
    });
  }

  function normalizeAngle(angle) {
    if (!Number.isFinite(angle)) return 0;
    let normalized = (angle + Math.PI) % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    return normalized - Math.PI;
  }

  function shortestAngleDifference(target, current) {
    return normalizeAngle(target - current);
  }

  function circleIntersectsCircle(first, firstRadius, second, secondRadius) {
    return distance(first, second) <= firstRadius + secondRadius;
  }

  function circleInBeam(target, lighthouse, angle) {
    if (!target || !lighthouse || !lighthouse.position || !Number.isFinite(angle)
      || !Number.isFinite(target.x) || !Number.isFinite(target.y)
      || !Number.isFinite(target.radius)) return false;
    const targetDistance = distance(lighthouse.position, target);
    if (targetDistance > lighthouse.beamRange + target.radius) return false;
    if (targetDistance < 1e-9) return true;
    const targetAngle = Math.atan2(
      target.y - lighthouse.position.y,
      target.x - lighthouse.position.x,
    );
    const padding = Math.asin(Math.min(1, target.radius / targetDistance));
    return Math.abs(shortestAngleDifference(targetAngle, angle)) <= lighthouse.beamHalfAngle + padding;
  }

  function deriveVisibility(state) {
    if (!isStateShape(state) || !isLevelIndex(state.levelIndex)) {
      return deriveVisibility(createGameState());
    }
    const level = LEVELS[state.levelIndex];
    return deepFreeze({
      reefs: state.revealedUntil.map((until) => until > state.elapsed),
      beacons: state.beaconsFound.slice(),
      harborLit: circleInBeam(level.harbor.lightTarget, level.lighthouse, state.lighthouse.angle),
    });
  }

  function goalConditionsMet(state) {
    if (!isStateShape(state) || !isLevelIndex(state.levelIndex)) return false;
    const level = LEVELS[state.levelIndex];
    const visibility = deriveVisibility(state);
    return level.beacons.every((beacon, index) => !beacon.required || state.beaconsFound[index])
      && visibility.harborLit
      && distance(state.boat.position, level.harbor) <= level.harbor.radius
      && vectorLength(state.boat.velocity) <= HARBOR_MAX_SPEED
      && Math.abs(shortestAngleDifference(level.harbor.heading, state.boat.heading))
        <= level.harbor.headingTolerance;
  }

  function stateForLevel(levelIndex, phase) {
    const level = LEVELS[levelIndex];
    return freezeState({
      phase,
      levelIndex,
      elapsed: 0,
      stepCount: 0,
      resetCount: 0,
      pauseReason: null,
      lighthouse: {
        angle: normalizeAngle(level.lighthouse.initialAngle),
        angularVelocity: 0,
      },
      boat: {
        position: copyPoint(level.boatStart.position),
        velocity: { x: 0, y: 0 },
        heading: normalizeAngle(level.boatStart.heading),
        rudder: 0,
      },
      revealedUntil: level.reefs.map(() => 0),
      beaconsFound: level.beacons.map(() => false),
      checkpointIndex: 0,
      goalHold: 0,
    });
  }

  function resetToCheckpoint(state) {
    const checkpoint = LEVELS[state.levelIndex].checkpoints[state.checkpointIndex];
    return freezeState({
      ...state,
      boat: {
        position: copyPoint(checkpoint.position),
        velocity: { x: 0, y: 0 },
        heading: normalizeAngle(checkpoint.heading),
        rudder: 0,
      },
      resetCount: state.resetCount + 1,
      goalHold: 0,
    });
  }

  function boatIsInDanger(boat, level) {
    if (boat.position.x < BOAT_RADIUS || boat.position.x > WORLD_WIDTH - BOAT_RADIUS
      || boat.position.y < BOAT_RADIUS || boat.position.y > WORLD_HEIGHT - BOAT_RADIUS) {
      return true;
    }
    return level.reefs.some((reef) => circleIntersectsCircle(
      boat.position,
      BOAT_RADIUS,
      reef,
      reef.radius,
    ));
  }

  function isValidState(state) {
    if (!isStateShape(state) || !PHASES.includes(state.phase) || !isLevelIndex(state.levelIndex)) return false;
    const level = LEVELS[state.levelIndex];
    if (!Number.isFinite(state.elapsed) || state.elapsed < 0 || !Number.isInteger(state.stepCount)
      || state.stepCount < 0 || Math.abs(state.elapsed - state.stepCount * FIXED_DT) > 1e-8
      || !Number.isInteger(state.resetCount) || state.resetCount < 0
      || !Number.isFinite(state.goalHold) || state.goalHold < 0 || state.goalHold > GOAL_HOLD_SECONDS) {
      return false;
    }
    if (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason)) return false;
    if ((state.phase === "paused") !== (state.pauseReason !== null)) return false;
    if (!validLighthouseState(state.lighthouse) || !validBoatState(state.boat)) return false;
    if (!Array.isArray(state.revealedUntil) || state.revealedUntil.length !== level.reefs.length
      || state.revealedUntil.some((until) => !Number.isFinite(until) || until < 0)
      || !Array.isArray(state.beaconsFound) || state.beaconsFound.length !== level.beacons.length
      || state.beaconsFound.some((found) => typeof found !== "boolean")) return false;
    if (!Number.isInteger(state.checkpointIndex) || state.checkpointIndex < 0
      || state.checkpointIndex >= level.checkpoints.length) return false;
    if (boatIsInDanger(state.boat, level)) return false;

    if (state.phase === "ready") {
      return state.elapsed === 0 && state.stepCount === 0 && state.resetCount === 0
        && state.goalHold === 0 && state.checkpointIndex === 0
        && state.lighthouse.angle === normalizeAngle(level.lighthouse.initialAngle)
        && state.lighthouse.angularVelocity === 0
        && samePoint(state.boat.position, level.boatStart.position)
        && vectorLength(state.boat.velocity) === 0
        && state.boat.heading === normalizeAngle(level.boatStart.heading)
        && state.boat.rudder === 0
        && state.revealedUntil.every((until) => until === 0)
        && state.beaconsFound.every((found) => !found);
    }
    if (state.phase === "level-complete" || state.phase === "game-complete") {
      const correctLevel = state.phase === "game-complete"
        ? state.levelIndex === LEVELS.length - 1
        : state.levelIndex < LEVELS.length - 1;
      return correctLevel && state.goalHold === GOAL_HOLD_SECONDS && goalConditionsMet(state);
    }
    return state.goalHold < GOAL_HOLD_SECONDS;
  }

  function isStateShape(state) {
    return Boolean(state && typeof state === "object" && Number.isInteger(state.levelIndex)
      && state.lighthouse && state.boat);
  }

  function validLighthouseState(lighthouse) {
    return Number.isFinite(lighthouse.angle) && lighthouse.angle >= -Math.PI && lighthouse.angle < Math.PI
      && Number.isFinite(lighthouse.angularVelocity)
      && Math.abs(lighthouse.angularVelocity) <= MAX_LIGHT_ANGULAR_SPEED + 1e-9;
  }

  function validBoatState(boat) {
    return boat && validPoint(boat.position) && validPoint(boat.velocity)
      && Number.isFinite(boat.heading) && boat.heading >= -Math.PI && boat.heading < Math.PI
      && Number.isFinite(boat.rudder) && Math.abs(boat.rudder) <= 1 + 1e-9
      && vectorLength(boat.velocity) <= MAX_BOAT_SPEED + 1e-9;
  }

  function validPoint(point) {
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function isLevelIndex(value) {
    return Number.isInteger(value) && value >= 0 && value < LEVELS.length;
  }

  function finiteOrZero(value) {
    return Number.isFinite(value) ? clamp(value, -1, 1) : 0;
  }

  function copyPoint(point) {
    return { x: point.x, y: point.y };
  }

  function samePoint(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function limitVector(vector, maximum) {
    const length = vectorLength(vector);
    if (length <= maximum || length < 1e-9) return;
    vector.x = vector.x / length * maximum;
    vector.y = vector.y / length * maximum;
  }

  function vectorLength(vector) {
    return Math.hypot(vector.x, vector.y);
  }

  function distance(first, second) {
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  return deepFreeze({
    FIXED_DT,
    MAX_LIGHT_ANGULAR_SPEED,
    MAX_BOAT_SPEED,
    REVEAL_SECONDS,
    HARBOR_MAX_SPEED,
    GOAL_HOLD_SECONDS,
    PHASES,
    PAUSE_REASONS,
    createGameState,
    startGame,
    stepGame,
    pauseGame,
    resumeGame,
    restartLevel,
    nextLevel,
    replayGame,
    normalizeInput,
    normalizeAngle,
    shortestAngleDifference,
    circleIntersectsCircle,
    circleInBeam,
    deriveVisibility,
    goalConditionsMet,
  });
});
