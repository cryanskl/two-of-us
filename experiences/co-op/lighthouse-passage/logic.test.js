import test from "node:test";
import assert from "node:assert/strict";

await import("./levels.js");
await import("./logic.js");

const {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  BOAT_RADIUS,
  LEVELS,
  validateLevel,
} = globalThis.LIGHTHOUSE_PASSAGE_LEVELS;

const {
  FIXED_DT,
  MAX_LIGHT_ANGULAR_SPEED,
  MAX_BOAT_SPEED,
  REVEAL_SECONDS,
  GOAL_HOLD_SECONDS,
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
} = globalThis.LIGHTHOUSE_PASSAGE_LOGIC;

const ROUTES = Object.freeze([
  Object.freeze([
    { x: 300, y: 430 },
    { x: 470, y: 440 },
    { x: 620, y: 350 },
    { x: 760, y: 300 },
    { x: 856, y: 270 },
  ]),
  Object.freeze([
    { x: 300, y: 105 },
    { x: 420, y: 105 },
    { x: 435, y: 190 },
    { x: 480, y: 190 },
    { x: 500, y: 275 },
    { x: 610, y: 410 },
    { x: 760, y: 430 },
    { x: 856, y: 420 },
  ]),
  Object.freeze([
    { x: 290, y: 270 },
    { x: 410, y: 270 },
    { x: 430, y: 190 },
    { x: 590, y: 190 },
    { x: 600, y: 370 },
    { x: 650, y: 380 },
    { x: 810, y: 380 },
    { x: 870, y: 365 },
  ]),
]);

const NEUTRAL_LIGHT = Object.freeze({ turn: 0 });
const NEUTRAL_BOAT = Object.freeze({ throttle: 0, steer: 0 });

function clone(value) {
  return structuredClone(value);
}

function clamp(value, minimum = -1, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function speed(state) {
  return Math.hypot(state.boat.velocity.x, state.boat.velocity.y);
}

function angleFromLighthouse(level, target) {
  return Math.atan2(
    target.y - level.lighthouse.position.y,
    target.x - level.lighthouse.position.x,
  );
}

function lightControl(state, target) {
  const desired = angleFromLighthouse(LEVELS[state.levelIndex], target);
  const error = shortestAngleDifference(desired, state.lighthouse.angle);
  return {
    turn: clamp(error * 3.8 - state.lighthouse.angularVelocity * 1.35),
  };
}

function boatControl(state, target, final = false) {
  const level = LEVELS[state.levelIndex];
  const remaining = distance(state.boat.position, target);
  const desiredHeading = final && remaining < 30
    ? level.harbor.heading
    : Math.atan2(target.y - state.boat.position.y, target.x - state.boat.position.x);
  const headingError = shortestAngleDifference(desiredHeading, state.boat.heading);
  const currentSpeed = speed(state);
  let desiredSpeed = final
    ? Math.min(72, Math.max(0, remaining * 1.15))
    : Math.min(75, Math.max(0, remaining));
  if (Math.abs(headingError) > 0.45) desiredSpeed = 0;
  if (remaining < 26 || (final && remaining < 30)) desiredSpeed = 0;
  const throttle = currentSpeed < desiredSpeed - 3
    ? 1
    : currentSpeed > Math.max(5, desiredSpeed + 4) ? -1 : 0;
  return {
    throttle,
    steer: clamp(headingError * 2.8),
  };
}

function scanBeacons(state, maxSteps = 12000) {
  const level = LEVELS[state.levelIndex];
  let targetIndex = 0;
  const trace = [];
  for (let index = 0; index < maxSteps && targetIndex < level.beacons.length; index += 1) {
    while (targetIndex < level.beacons.length && state.beaconsFound[targetIndex]) targetIndex += 1;
    if (targetIndex >= level.beacons.length) break;
    const input = {
      lighthouse: lightControl(state, level.beacons[targetIndex]),
      boat: NEUTRAL_BOAT,
    };
    const before = state;
    state = stepGame(state, input);
    trace.push({ before, input, after: state });
  }
  return { state, trace, targetIndex };
}

function driveRoute(state, route, options = {}) {
  const level = LEVELS[state.levelIndex];
  const lightMode = options.lightMode || "harbor";
  const maxSteps = options.maxSteps || 30000;
  let waypointIndex = 0;
  const trace = [];
  let oppositeRoleStep = false;

  for (let index = 0; index < maxSteps && state.phase === "playing"; index += 1) {
    const target = route[Math.min(waypointIndex, route.length - 1)];
    const final = waypointIndex === route.length - 1;
    let lighthouse = lightMode === "neutral"
      ? NEUTRAL_LIGHT
      : lightControl(state, level.harbor.lightTarget);
    let boat = boatControl(state, target, final);

    if (state.levelIndex === 1 && index === 0 && lightMode !== "neutral") {
      lighthouse = { turn: -1 };
      boat = { throttle: 1, steer: 1 };
    }
    if (Math.abs(lighthouse.turn) > 0.25 && Math.abs(boat.steer) > 0.25
      && Math.sign(lighthouse.turn) !== Math.sign(boat.steer)) {
      oppositeRoleStep = true;
    }

    const input = { lighthouse, boat };
    const before = state;
    state = stepGame(state, input);
    trace.push({ before, input, after: state });

    if (!final && distance(state.boat.position, target) < 26 && speed(state) < 7) waypointIndex += 1;
  }
  return { state, trace, waypointIndex, oppositeRoleStep };
}

function solveLevel(levelIndex) {
  const scanned = scanBeacons(startGame(createGameState(levelIndex)));
  const driven = driveRoute(scanned.state, ROUTES[levelIndex]);
  return {
    ...driven,
    trace: scanned.trace.concat(driven.trace),
  };
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeepFrozen);
}

test("三幕 schema、唯一 ID、几何和嵌套对象全部冻结", () => {
  assert.equal(WORLD_WIDTH, 960);
  assert.equal(WORLD_HEIGHT, 540);
  assert.equal(LEVELS.length, 3);
  assert.deepEqual(LEVELS.map((level) => level.id), ["first-light", "turning-in-fog", "harbor-together"]);
  LEVELS.forEach((level) => {
    assert.equal(validateLevel(level), true);
    assertDeepFrozen(level);
    const ids = level.reefs.concat(level.beacons).map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

test("校验拒绝重复 ID、非法半径、越界、出生落礁、检查点缺失和光束不可达", () => {
  const valid = clone(LEVELS[0]);
  assert.throws(() => validateLevel(null), TypeError);
  assert.throws(() => validateLevel({ ...valid, reefs: [{ ...valid.reefs[0], radius: -1 }] }), RangeError);
  assert.throws(() => validateLevel({ ...valid, beacons: [{ ...valid.beacons[0], id: valid.reefs[0].id }] }), RangeError);
  assert.throws(() => validateLevel({ ...valid, boatStart: { position: { x: -2, y: 2 }, heading: 0 } }), RangeError);
  assert.throws(() => validateLevel({ ...valid, boatStart: { position: { x: valid.reefs[0].x, y: valid.reefs[0].y }, heading: 0 } }), RangeError);
  assert.throws(() => validateLevel({ ...valid, checkpoints: valid.checkpoints.slice(0, 1) }), RangeError);
  assert.throws(() => validateLevel({
    ...valid,
    lighthouse: { ...valid.lighthouse, beamRange: 100 },
  }), RangeError);
});

test("初始状态字段完整、递归冻结且不共享关卡引用", () => {
  const state = createGameState();
  assert.equal(state.phase, "ready");
  assert.equal(state.elapsed, 0);
  assert.equal(state.stepCount, 0);
  assert.equal(state.resetCount, 0);
  assert.equal(state.checkpointIndex, 0);
  assert.equal(state.goalHold, 0);
  assert.deepEqual(state.boat.position, LEVELS[0].boatStart.position);
  assert.notStrictEqual(state.boat.position, LEVELS[0].boatStart.position);
  assert.deepEqual(state.revealedUntil, LEVELS[0].reefs.map(() => 0));
  assert.deepEqual(state.beaconsFound, LEVELS[0].beacons.map(() => false));
  assertDeepFrozen(state);
});

test("输入截断并保持灯塔与小船通道互不串扰", () => {
  assert.deepEqual(normalizeInput(null), {
    lighthouse: { turn: 0 },
    boat: { throttle: 0, steer: 0 },
  });
  assert.deepEqual(normalizeInput({
    lighthouse: { turn: 8 },
    boat: { throttle: -7, steer: Number.NaN },
  }), {
    lighthouse: { turn: 1 },
    boat: { throttle: -1, steer: 0 },
  });

  const playing = startGame(createGameState());
  const lightOnly = stepGame(playing, { lighthouse: { turn: 1 }, boat: NEUTRAL_BOAT });
  assert.deepEqual(lightOnly.boat, playing.boat);
  const boatOnly = stepGame(playing, { lighthouse: NEUTRAL_LIGHT, boat: { throttle: 1, steer: 1 } });
  assert.deepEqual(boatOnly.lighthouse, playing.lighthouse);
});

test("固定步输入在不同渲染帧分组下得到同一最终状态", () => {
  const inputs = Array.from({ length: 600 }, (_, index) => ({
    lighthouse: { turn: index < 240 ? 0.7 : index < 400 ? -0.4 : 0 },
    boat: { throttle: index < 420 ? 0.65 : -0.2, steer: index < 300 ? 0.35 : -0.15 },
  }));
  let single = startGame(createGameState());
  inputs.forEach((input) => { single = stepGame(single, input); });

  let grouped = startGame(createGameState());
  const groups = [12, 3, 1, 7, 5, 2, 9];
  let cursor = 0;
  let frame = 0;
  while (cursor < inputs.length) {
    const count = Math.min(groups[frame % groups.length], inputs.length - cursor);
    for (let offset = 0; offset < count; offset += 1) grouped = stepGame(grouped, inputs[cursor + offset]);
    cursor += count;
    frame += 1;
  }
  assert.deepEqual(grouped, single);
  assert.ok(Math.abs(single.elapsed - 600 * FIXED_DT) < 1e-12);
});

test("灯塔角速度、阻尼和跨 π 角度规范化正确", () => {
  assert.equal(normalizeAngle(Math.PI), -Math.PI);
  assert.ok(Math.abs(shortestAngleDifference(-Math.PI + 0.1, Math.PI - 0.1) - 0.2) < 1e-12);
  let state = startGame(createGameState());
  for (let index = 0; index < 600; index += 1) {
    state = stepGame(state, { lighthouse: { turn: 1 }, boat: NEUTRAL_BOAT });
    assert.ok(Math.abs(state.lighthouse.angularVelocity) <= MAX_LIGHT_ANGULAR_SPEED + 1e-9);
    assert.ok(state.lighthouse.angle >= -Math.PI && state.lighthouse.angle < Math.PI);
  }
  const beforeRelease = Math.abs(state.lighthouse.angularVelocity);
  for (let index = 0; index < 120; index += 1) state = stepGame(state);
  assert.ok(Math.abs(state.lighthouse.angularVelocity) < beforeRelease * 0.01);
});

test("小船推进、倒车、水阻、速度上限、rudder 回中和低速转向正确", () => {
  let state = startGame(createGameState());
  const initialHeading = state.boat.heading;
  for (let index = 0; index < 120; index += 1) {
    state = stepGame(state, { lighthouse: NEUTRAL_LIGHT, boat: { throttle: 1, steer: 0.5 } });
    assert.ok(speed(state) <= MAX_BOAT_SPEED + 1e-9);
  }
  assert.notEqual(state.boat.heading, initialHeading);
  const rudderBefore = Math.abs(state.boat.rudder);
  for (let index = 0; index < 90; index += 1) state = stepGame(state);
  assert.ok(Math.abs(state.boat.rudder) < rudderBefore * 0.01);

  let forward = startGame(createGameState());
  for (let index = 0; index < 60; index += 1) {
    forward = stepGame(forward, { lighthouse: NEUTRAL_LIGHT, boat: { throttle: 1, steer: 0 } });
  }
  const forwardSpeed = speed(forward);
  for (let index = 0; index < 30; index += 1) {
    forward = stepGame(forward, { lighthouse: NEUTRAL_LIGHT, boat: { throttle: -1, steer: 0 } });
  }
  assert.ok(speed(forward) < forwardSpeed);
});

test("光束命中覆盖中心、圆边擦过、范围边界与跨 π 情况", () => {
  const lighthouse = {
    position: { x: 100, y: 100 },
    beamRange: 200,
    beamHalfAngle: 0.1,
  };
  assert.equal(circleInBeam({ x: 200, y: 100, radius: 5 }, lighthouse, 0), true);
  assert.equal(circleInBeam({ x: 300, y: 100, radius: 1 }, lighthouse, 0), true);
  assert.equal(circleInBeam({ x: 302, y: 100, radius: 1 }, lighthouse, 0), false);
  assert.equal(circleInBeam({ x: 200, y: 125, radius: 15 }, lighthouse, 0), true);
  assert.equal(circleInBeam({ x: 200, y: 160, radius: 5 }, lighthouse, 0), false);
  const leftTarget = { x: 1, y: 99, radius: 3 };
  assert.equal(circleInBeam(leftTarget, lighthouse, Math.PI - 0.01), true);
});

test("暗礁显露持续 2.2 秒，重复照射延长且派生层不自行改状态", () => {
  const level = LEVELS[0];
  const reef = level.reefs[0];
  let state = clone(startGame(createGameState()));
  state.lighthouse.angle = angleFromLighthouse(level, reef);
  state = stepGame(state);
  const firstUntil = state.revealedUntil[0];
  assert.ok(Math.abs(firstUntil - (state.elapsed + REVEAL_SECONDS)) < 1e-12);
  assert.equal(deriveVisibility(state).reefs[0], true);

  state = clone(state);
  state.lighthouse.angle = -Math.PI;
  state.lighthouse.angularVelocity = 0;
  for (let index = 0; index < 120; index += 1) state = stepGame(state);
  state = clone(state);
  state.lighthouse.angle = angleFromLighthouse(level, reef);
  state = stepGame(state);
  assert.ok(state.revealedUntil[0] > firstUntil);

  state = clone(state);
  state.lighthouse.angle = -Math.PI;
  state.lighthouse.angularVelocity = 0;
  for (let index = 0; index < Math.ceil(REVEAL_SECONDS / FIXED_DT) + 2; index += 1) state = stepGame(state);
  assert.equal(deriveVisibility(state).reefs[0], false);
});

test("航标必须被光照发现，检查点还要求小船进入", () => {
  const level = LEVELS[0];
  const beaconIndex = level.beacons.findIndex((beacon) => beacon.checkpoint);
  const beacon = level.beacons[beaconIndex];
  let dark = clone(startGame(createGameState()));
  dark.boat.position = { x: beacon.x, y: beacon.y };
  dark = stepGame(dark);
  assert.equal(dark.beaconsFound[beaconIndex], false);
  assert.equal(dark.checkpointIndex, 0);

  let litAway = clone(startGame(createGameState()));
  litAway.lighthouse.angle = angleFromLighthouse(level, beacon);
  litAway = stepGame(litAway);
  assert.equal(litAway.beaconsFound[beaconIndex], true);
  assert.equal(litAway.checkpointIndex, 0);

  let litInside = clone(startGame(createGameState()));
  litInside.lighthouse.angle = angleFromLighthouse(level, beacon);
  litInside.boat.position = { x: beacon.x, y: beacon.y };
  litInside = stepGame(litInside);
  assert.equal(litInside.beaconsFound[beaconIndex], true);
  assert.equal(litInside.checkpointIndex, 1);
});

test("碰礁和越界回最近检查点并清船运动，保留灯塔与发现进度", () => {
  const level = LEVELS[0];
  let state = clone(startGame(createGameState()));
  state.checkpointIndex = 1;
  state.beaconsFound = level.beacons.map(() => true);
  state.lighthouse.angle = 0.2;
  const reef = level.reefs[0];
  state.boat.position = { x: reef.x - reef.radius - BOAT_RADIUS - 0.2, y: reef.y };
  state.boat.velocity = { x: 100, y: 0 };
  const reset = stepGame(state);
  assert.equal(reset.resetCount, 1);
  assert.equal(reset.checkpointIndex, 1);
  assert.deepEqual(reset.boat.position, level.checkpoints[1].position);
  assert.deepEqual(reset.boat.velocity, { x: 0, y: 0 });
  assert.equal(reset.boat.rudder, 0);
  assert.deepEqual(reset.beaconsFound, state.beaconsFound);
  assert.notEqual(reset.lighthouse.angle, level.lighthouse.initialAngle);

  const boundary = clone(reset);
  boundary.boat.position = { x: BOAT_RADIUS + 0.1, y: 250 };
  boundary.boat.velocity = { x: -100, y: 0 };
  const boundaryReset = stepGame(boundary);
  assert.equal(boundaryReset.resetCount, 2);
  assert.deepEqual(boundaryReset.boat.position, level.checkpoints[1].position);
});

test("靠港五项 Gate 缺任一项都不完成，中断立即清零保持", () => {
  const level = LEVELS[0];
  const valid = clone(startGame(createGameState()));
  valid.lighthouse.angle = angleFromLighthouse(level, level.harbor.lightTarget);
  valid.boat.position = { x: level.harbor.x, y: level.harbor.y };
  valid.boat.velocity = { x: 0, y: 0 };
  valid.boat.heading = level.harbor.heading;
  valid.beaconsFound = level.beacons.map((beacon) => beacon.required);
  assert.equal(goalConditionsMet(valid), true);

  const cases = [
    Object.assign(clone(valid), { beaconsFound: level.beacons.map(() => false) }),
    Object.assign(clone(valid), { lighthouse: { angle: -Math.PI, angularVelocity: 0 } }),
    Object.assign(clone(valid), { boat: { ...clone(valid.boat), position: { x: 500, y: 400 } } }),
    Object.assign(clone(valid), { boat: { ...clone(valid.boat), velocity: { x: 30, y: 0 } } }),
    Object.assign(clone(valid), { boat: { ...clone(valid.boat), heading: Math.PI / 2 } }),
  ];
  cases.forEach((state) => assert.equal(goalConditionsMet(state), false));

  let holding = valid;
  for (let index = 0; index < 20; index += 1) holding = stepGame(holding);
  assert.ok(holding.goalHold > 0);
  holding = clone(holding);
  holding.lighthouse.angle = -Math.PI;
  holding.lighthouse.angularVelocity = 0;
  assert.equal(stepGame(holding).goalHold, 0);
});

test("三幕均由生产 reducer 的确定性双人轨迹完成", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const result = solveLevel(levelIndex);
    const expected = levelIndex === LEVELS.length - 1 ? "game-complete" : "level-complete";
    const firstReset = result.trace.find(({ before, after }) => after.resetCount > before.resetCount);
    assert.equal(
      result.state.phase,
      expected,
      `第 ${levelIndex + 1} 幕未完成：waypoint=${result.waypointIndex}, resets=${result.state.resetCount}, firstReset=${JSON.stringify(firstReset && firstReset.before.boat)}, boat=${JSON.stringify(result.state.boat)}`,
    );
    assert.equal(result.state.goalHold, GOAL_HOLD_SECONDS);
    assert.ok(result.state.beaconsFound.every((found) => found));
    assert.ok(result.trace.some(({ input }) => (
      Math.abs(input.lighthouse.turn) > 0.1 && Math.abs(input.boat.throttle) + Math.abs(input.boat.steer) > 0.1
    )));
    if (levelIndex === 1) assert.equal(result.oppositeRoleStep, true);
  }
});

test("中性灯塔或中性小船任一角色都不能完成任何一幕", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const boatOnly = driveRoute(startGame(createGameState(levelIndex)), ROUTES[levelIndex], {
      lightMode: "neutral",
      maxSteps: 18000,
    }).state;
    assert.equal(boatOnly.phase, "playing");
    assert.equal(boatOnly.beaconsFound.some(Boolean), false);

    let lightOnly = startGame(createGameState(levelIndex));
    lightOnly = scanBeacons(lightOnly).state;
    for (let index = 0; index < 1200; index += 1) {
      lightOnly = stepGame(lightOnly, {
        lighthouse: lightControl(lightOnly, LEVELS[levelIndex].harbor.lightTarget),
        boat: NEUTRAL_BOAT,
      });
    }
    assert.equal(lightOnly.phase, "playing");
    assert.deepEqual(lightOnly.boat.position, LEVELS[levelIndex].boatStart.position);
  }
});

test("暂停、恢复、重开、下一幕、重玩和畸形状态保持不变量", () => {
  const playing = stepGame(startGame(createGameState()), {
    lighthouse: { turn: 1 },
    boat: { throttle: 1, steer: 0 },
  });
  const paused = pauseGame(playing, "hidden");
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pauseReason, "hidden");
  assert.strictEqual(stepGame(paused, { lighthouse: { turn: 1 }, boat: { throttle: 1, steer: 1 } }), paused);
  const resumed = resumeGame(paused);
  assert.equal(resumed.phase, "playing");
  assert.equal(resumed.pauseReason, null);
  assert.equal(pauseGame(resumed, "bad").pauseReason, "manual");

  const restarted = restartLevel(resumed);
  assert.equal(restarted.phase, "playing");
  assert.equal(restarted.stepCount, 0);
  assert.deepEqual(restarted.boat.position, LEVELS[0].boatStart.position);
  assert.equal(restartLevel(createGameState(1)).phase, "ready");

  const firstComplete = solveLevel(0).state;
  const second = nextLevel(firstComplete);
  assert.equal(second.levelIndex, 1);
  assert.equal(second.phase, "playing");
  assert.strictEqual(nextLevel(second), second);
  const finalComplete = solveLevel(2).state;
  const replayed = replayGame(finalComplete);
  assert.equal(replayed.levelIndex, 0);
  assert.equal(replayed.phase, "playing");

  assert.deepEqual(stepGame({ ...clone(playing), stepCount: -1 }), createGameState());
  assert.deepEqual(replayGame({ ...clone(playing), phase: "game-complete", goalHold: GOAL_HOLD_SECONDS }), createGameState());
  assert.deepEqual(resumeGame(null), createGameState());
  assert.strictEqual(startGame(playing), playing);
});
