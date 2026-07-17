(function (root, factory) {
  "use strict";
  root.TETHERED_HEART_LOGIC = factory(root.TETHERED_HEART_LEVELS);
})(typeof globalThis !== "undefined" ? globalThis : this, function (levelModule) {
  "use strict";

  if (!levelModule || !Array.isArray(levelModule.LEVELS)) {
    throw new Error("请先加载 levels.js");
  }

  const {
    WORLD_WIDTH,
    WORLD_HEIGHT,
    ANCHOR_RADIUS,
    PAYLOAD_RADIUS,
    LEVELS,
  } = levelModule;

  const FIXED_DT = 1 / 120;
  const ANCHOR_ACCELERATION = 780;
  const ANCHOR_DRAG = 5.2;
  const PAYLOAD_DRAG = 2.1;
  const MAX_ANCHOR_SPEED = 205;
  const RIBBON_NATURAL_LENGTH = 112;
  const RIBBON_MAX_LENGTH = 226;
  const RIBBON_SPRING = 24;
  const RIBBON_PROJECTION_ITERATIONS = 6;
  const SAFE_TENSION = 0.64;
  const GOAL_MAX_PAYLOAD_SPEED = 34;
  const GOAL_HOLD_SECONDS = 0.45;
  const COLLISION_EPSILON = 1e-7;
  const PHASES = Object.freeze(["ready", "playing", "paused", "level-complete", "game-complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "blur", "hidden"]);
  const ZERO_INPUTS = Object.freeze([
    Object.freeze({ x: 0, y: 0 }),
    Object.freeze({ x: 0, y: 0 }),
  ]);

  function createGameState(levelIndex = 0) {
    return stateForLevel(isLevelIndex(levelIndex) ? levelIndex : 0, "ready");
  }

  function startGame(state) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "ready") return state;
    return freezeState({ ...state, phase: "playing" });
  }

  function stepGame(state, inputs = ZERO_INPUTS) {
    if (!isValidState(state)) return createGameState();
    if (state.phase !== "playing") return state;

    const level = LEVELS[state.levelIndex];
    const normalized = [normalizeInput(inputs && inputs[0]), normalizeInput(inputs && inputs[1])];
    const anchors = state.anchors.map(copyBody);
    const payload = copyBody(state.payload);

    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index];
      anchor.velocity.x += normalized[index].x * ANCHOR_ACCELERATION * FIXED_DT;
      anchor.velocity.y += normalized[index].y * ANCHOR_ACCELERATION * FIXED_DT;
      dampVelocity(anchor.velocity, ANCHOR_DRAG);
      limitVector(anchor.velocity, MAX_ANCHOR_SPEED);
    }
    dampVelocity(payload.velocity, PAYLOAD_DRAG);
    applyRibbonForces(anchors, payload);

    for (const body of anchors.concat([payload])) {
      body.position.x += body.velocity.x * FIXED_DT;
      body.position.y += body.velocity.y * FIXED_DT;
    }

    for (let iteration = 0; iteration < RIBBON_PROJECTION_ITERATIONS; iteration += 1) {
      resolveBody(anchors[0], ANCHOR_RADIUS, level.obstacles);
      resolveBody(anchors[1], ANCHOR_RADIUS, level.obstacles);
      resolveBody(payload, PAYLOAD_RADIUS, level.obstacles);
      projectRibbon(anchors[0], payload);
      projectRibbon(anchors[1], payload);
    }
    // The last ribbon projection can nudge a circle a sub-pixel back into an
    // obstacle. Finish on collision projection; the iterative ribbon passes
    // above have already reduced any resulting line-length error below tolerance.
    resolveBody(anchors[0], ANCHOR_RADIUS, level.obstacles);
    resolveBody(anchors[1], ANCHOR_RADIUS, level.obstacles);
    resolveBody(payload, PAYLOAD_RADIUS, level.obstacles);

    const base = {
      ...state,
      anchors,
      payload,
      elapsed: state.elapsed + FIXED_DT,
      stepCount: state.stepCount + 1,
      pauseReason: null,
    };

    if (level.hazards.some((triangle) => circleIntersectsTriangle(payload.position, PAYLOAD_RADIUS, triangle))) {
      return resetToCheckpoint(base);
    }

    const ribbons = deriveRibbonState(base);
    const atGoal = goalConditionsMet(base, ribbons);
    const goalHold = atGoal ? Math.min(GOAL_HOLD_SECONDS, state.goalHold + FIXED_DT) : 0;
    const complete = goalHold >= GOAL_HOLD_SECONDS - 1e-10;
    const finalLevel = state.levelIndex === LEVELS.length - 1;

    return freezeState({
      ...base,
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
    if (!input || !Number.isFinite(input.x) || !Number.isFinite(input.y)) return ZERO_INPUTS[0];
    const x = clamp(input.x, -1, 1);
    const y = clamp(input.y, -1, 1);
    const length = Math.hypot(x, y);
    if (length <= 1) return Object.freeze({ x, y });
    return Object.freeze({ x: x / length, y: y / length });
  }

  function deriveRibbonState(state) {
    if (!isStateShape(state)) return Object.freeze([]);
    return Object.freeze(state.anchors.map((anchor) => {
      const length = distance(anchor.position, state.payload.position);
      return Object.freeze({
        length,
        extension: Math.max(0, length - RIBBON_NATURAL_LENGTH),
        tension: clamp(
          (length - RIBBON_NATURAL_LENGTH) / (RIBBON_MAX_LENGTH - RIBBON_NATURAL_LENGTH),
          0,
          1,
        ),
      });
    }));
  }

  function goalConditionsMet(state, ribbons = deriveRibbonState(state)) {
    if (!isStateShape(state) || ribbons.length !== 2) return false;
    const goal = LEVELS[state.levelIndex].goal;
    return distance(state.payload.position, goal) <= goal.radius
      && state.anchors.every((anchor) => anchor.position.x >= goal.anchorMinX)
      && ribbons.every((ribbon) => ribbon.tension <= SAFE_TENSION)
      && vectorLength(state.payload.velocity) <= GOAL_MAX_PAYLOAD_SPEED;
  }

  function circleIntersectsAabb(position, radius, box) {
    const nearestX = clamp(position.x, box.x, box.x + box.width);
    const nearestY = clamp(position.y, box.y, box.y + box.height);
    const dx = position.x - nearestX;
    const dy = position.y - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function circleIntersectsTriangle(center, radius, triangle) {
    if (!center || !Array.isArray(triangle) || triangle.length !== 3) return false;
    if (pointInTriangle(center, triangle)) return true;
    return triangle.some((start, index) => (
      pointSegmentDistance(center, start, triangle[(index + 1) % triangle.length]) <= radius
    ));
  }

  function stateForLevel(levelIndex, phase) {
    const level = LEVELS[levelIndex];
    const checkpoint = {
      anchors: level.checkpoint.anchors.map(copyPoint),
      payload: copyPoint(level.checkpoint.payload),
    };
    return freezeState({
      phase,
      levelIndex,
      elapsed: 0,
      stepCount: 0,
      resetCount: 0,
      anchors: checkpoint.anchors.map(createBody),
      payload: createBody(checkpoint.payload),
      goalHold: 0,
      checkpoint,
      pauseReason: null,
    });
  }

  function resetToCheckpoint(state) {
    return freezeState({
      ...state,
      anchors: state.checkpoint.anchors.map(createBody),
      payload: createBody(state.checkpoint.payload),
      goalHold: 0,
      resetCount: state.resetCount + 1,
    });
  }

  function applyRibbonForces(anchors, payload) {
    for (const anchor of anchors) {
      const dx = payload.position.x - anchor.position.x;
      const dy = payload.position.y - anchor.position.y;
      const length = Math.hypot(dx, dy);
      if (length <= RIBBON_NATURAL_LENGTH || length < 1e-9) continue;
      const stretch = length - RIBBON_NATURAL_LENGTH;
      const nx = dx / length;
      const ny = dy / length;
      const impulse = stretch * RIBBON_SPRING * FIXED_DT;
      payload.velocity.x -= nx * impulse;
      payload.velocity.y -= ny * impulse;
      anchor.velocity.x += nx * impulse * 0.24;
      anchor.velocity.y += ny * impulse * 0.24;
    }
  }

  function projectRibbon(anchor, payload) {
    const dx = payload.position.x - anchor.position.x;
    const dy = payload.position.y - anchor.position.y;
    const length = Math.hypot(dx, dy);
    if (length <= RIBBON_MAX_LENGTH || length < 1e-9) return;
    const excess = length - RIBBON_MAX_LENGTH;
    const nx = dx / length;
    const ny = dy / length;
    anchor.position.x += nx * excess * 0.38;
    anchor.position.y += ny * excess * 0.38;
    payload.position.x -= nx * excess * 0.62;
    payload.position.y -= ny * excess * 0.62;

    const relativeVelocity = (payload.velocity.x - anchor.velocity.x) * nx
      + (payload.velocity.y - anchor.velocity.y) * ny;
    if (relativeVelocity > 0) {
      anchor.velocity.x += nx * relativeVelocity * 0.38;
      anchor.velocity.y += ny * relativeVelocity * 0.38;
      payload.velocity.x -= nx * relativeVelocity * 0.62;
      payload.velocity.y -= ny * relativeVelocity * 0.62;
    }
  }

  function resolveBody(body, radius, obstacles) {
    resolveWorldBounds(body, radius);
    for (const box of obstacles) resolveCircleAabb(body, radius, box);
    resolveWorldBounds(body, radius);
  }

  function resolveWorldBounds(body, radius) {
    if (body.position.x < radius) projectAxis(body, "x", radius, 1);
    if (body.position.x > WORLD_WIDTH - radius) projectAxis(body, "x", WORLD_WIDTH - radius, -1);
    if (body.position.y < radius) projectAxis(body, "y", radius, 1);
    if (body.position.y > WORLD_HEIGHT - radius) projectAxis(body, "y", WORLD_HEIGHT - radius, -1);
  }

  function projectAxis(body, axis, position, normal) {
    body.position[axis] = position;
    if (body.velocity[axis] * normal < 0) body.velocity[axis] = 0;
  }

  function resolveCircleAabb(body, radius, box) {
    if (!circleIntersectsAabb(body.position, radius, box)) return;
    const nearestX = clamp(body.position.x, box.x, box.x + box.width);
    const nearestY = clamp(body.position.y, box.y, box.y + box.height);
    let dx = body.position.x - nearestX;
    let dy = body.position.y - nearestY;
    let length = Math.hypot(dx, dy);

    if (length < 1e-9) {
      const candidates = [
        { distance: Math.abs(body.position.x - box.x), x: box.x - radius, y: body.position.y, nx: -1, ny: 0 },
        { distance: Math.abs(box.x + box.width - body.position.x), x: box.x + box.width + radius, y: body.position.y, nx: 1, ny: 0 },
        { distance: Math.abs(body.position.y - box.y), x: body.position.x, y: box.y - radius, nx: 0, ny: -1 },
        { distance: Math.abs(box.y + box.height - body.position.y), x: body.position.x, y: box.y + box.height + radius, nx: 0, ny: 1 },
      ].sort((a, b) => a.distance - b.distance);
      const closest = candidates[0];
      body.position.x = closest.x;
      body.position.y = closest.y;
      cancelInwardVelocity(body.velocity, closest.nx, closest.ny);
      return;
    }

    dx /= length;
    dy /= length;
    body.position.x += dx * (radius + COLLISION_EPSILON - length);
    body.position.y += dy * (radius + COLLISION_EPSILON - length);
    cancelInwardVelocity(body.velocity, dx, dy);
  }

  function cancelInwardVelocity(velocity, nx, ny) {
    const inward = velocity.x * nx + velocity.y * ny;
    if (inward < 0) {
      velocity.x -= inward * nx;
      velocity.y -= inward * ny;
    }
  }

  function pointInTriangle(point, triangle) {
    const [a, b, c] = triangle;
    const d1 = signedArea(point, a, b);
    const d2 = signedArea(point, b, c);
    const d3 = signedArea(point, c, a);
    const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNegative && hasPositive);
  }

  function signedArea(point, a, b) {
    return (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y);
  }

  function pointSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distance(point, start);
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  }

  function isValidState(state) {
    if (!isStateShape(state) || !PHASES.includes(state.phase) || !isLevelIndex(state.levelIndex)) return false;
    if (!Number.isFinite(state.elapsed) || state.elapsed < 0 || !Number.isInteger(state.stepCount)
      || state.stepCount < 0 || !Number.isInteger(state.resetCount) || state.resetCount < 0
      || !Number.isFinite(state.goalHold) || state.goalHold < 0 || state.goalHold > GOAL_HOLD_SECONDS) {
      return false;
    }
    if (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason)) return false;
    if ((state.phase === "paused") !== (state.pauseReason !== null)) return false;
    if (Math.abs(state.elapsed - state.stepCount * FIXED_DT) > 1e-8) return false;
    const bodies = state.anchors.concat([state.payload]);
    if (bodies.some((body, index) => !validBody(body, index < 2 ? ANCHOR_RADIUS : PAYLOAD_RADIUS))) return false;
    if (!state.checkpoint || !Array.isArray(state.checkpoint.anchors) || state.checkpoint.anchors.length !== 2
      || state.checkpoint.anchors.some((point) => !validPoint(point)) || !validPoint(state.checkpoint.payload)) return false;
    const levelCheckpoint = LEVELS[state.levelIndex].checkpoint;
    if (!state.checkpoint.anchors.every((point, index) => samePoint(point, levelCheckpoint.anchors[index]))
      || !samePoint(state.checkpoint.payload, levelCheckpoint.payload)) return false;
    if (!deriveRibbonState(state).every((ribbon) => ribbon.length <= RIBBON_MAX_LENGTH + 0.05)) return false;

    if (state.phase === "ready") {
      return state.stepCount === 0 && state.elapsed === 0 && state.resetCount === 0 && state.goalHold === 0
        && state.anchors.every((body, index) => samePoint(body.position, state.checkpoint.anchors[index])
          && vectorLength(body.velocity) === 0)
        && samePoint(state.payload.position, state.checkpoint.payload)
        && vectorLength(state.payload.velocity) === 0;
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
    return Boolean(state && typeof state === "object" && Array.isArray(state.anchors)
      && state.anchors.length === 2 && state.payload && Number.isInteger(state.levelIndex));
  }

  function validBody(body, radius) {
    return Boolean(body && validPoint(body.position) && validPoint(body.velocity)
      && body.position.x >= radius - 0.1 && body.position.x <= WORLD_WIDTH - radius + 0.1
      && body.position.y >= radius - 0.1 && body.position.y <= WORLD_HEIGHT - radius + 0.1);
  }

  function validPoint(point) {
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function samePoint(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function isLevelIndex(value) {
    return Number.isInteger(value) && value >= 0 && value < LEVELS.length;
  }

  function createBody(position) {
    return { position: copyPoint(position), velocity: { x: 0, y: 0 } };
  }

  function copyBody(body) {
    return { position: copyPoint(body.position), velocity: copyPoint(body.velocity) };
  }

  function copyPoint(point) {
    return { x: point.x, y: point.y };
  }

  function dampVelocity(velocity, drag) {
    const factor = Math.max(0, 1 - drag * FIXED_DT);
    velocity.x *= factor;
    velocity.y *= factor;
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

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
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
    MAX_ANCHOR_SPEED,
    RIBBON_NATURAL_LENGTH,
    RIBBON_MAX_LENGTH,
    SAFE_TENSION,
    GOAL_MAX_PAYLOAD_SPEED,
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
    deriveRibbonState,
    goalConditionsMet,
    circleIntersectsAabb,
    circleIntersectsTriangle,
  });
});
