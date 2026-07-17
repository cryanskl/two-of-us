import test from "node:test";
import assert from "node:assert/strict";

await import("./levels.js");
await import("./logic.js");

const {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ANCHOR_RADIUS,
  PAYLOAD_RADIUS,
  LEVELS,
  validateLevel,
} = globalThis.TETHERED_HEART_LEVELS;

const {
  FIXED_DT,
  MAX_ANCHOR_SPEED,
  RIBBON_NATURAL_LENGTH,
  RIBBON_MAX_LENGTH,
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
  deriveRibbonState,
  goalConditionsMet,
  circleIntersectsAabb,
  circleIntersectsTriangle,
} = globalThis.TETHERED_HEART_LOGIC;

const ROUTES = Object.freeze([
  Object.freeze([
    { x: 248, y: 330 },
    { x: 476, y: 330 },
    { x: 490, y: 226 },
    { x: 700, y: 226 },
    { x: 850, y: 270 },
  ]),
  Object.freeze([
    { x: 300, y: 70 },
    { x: 800, y: 70 },
    { x: 800, y: 210 },
    { x: 850, y: 270 },
  ]),
  Object.freeze([
    { x: 280, y: 300, spread: 20 },
    { x: 720, y: 300, spread: 10 },
    { x: 800, y: 250, spread: 18 },
    { x: 900, y: 270, spread: 50 },
  ]),
]);

function clone(value) {
  return structuredClone(value);
}

function speed(body) {
  return Math.hypot(body.velocity.x, body.velocity.y);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function controlToward(body, target) {
  const x = (target.x - body.position.x) * 0.075 - body.velocity.x * 0.035;
  const y = (target.y - body.position.y) * 0.075 - body.velocity.y * 0.035;
  return normalizeInput({ x, y });
}

function runRoute(levelIndex, route = ROUTES[levelIndex], maxSteps = 36000) {
  let state = startGame(createGameState(levelIndex));
  let waypointIndex = 0;
  let differentDirectionsTogether = false;
  const trace = [];

  for (let index = 0; index < maxSteps && state.phase === "playing"; index += 1) {
    const waypoint = route[Math.min(waypointIndex, route.length - 1)];
    const spread = waypoint.spread ?? 50;
    const targets = [
      { x: waypoint.x, y: waypoint.y - spread },
      { x: waypoint.x, y: waypoint.y + spread },
    ];

    let inputs;
    if (index === 0) {
      inputs = [{ x: 0, y: -1 }, { x: 0, y: 1 }];
    } else {
      inputs = state.anchors.map((anchor, seat) => controlToward(anchor, targets[seat]));
    }
    if ((inputs[0].x !== inputs[1].x || inputs[0].y !== inputs[1].y)
      && Math.hypot(inputs[0].x, inputs[0].y) > 0.1
      && Math.hypot(inputs[1].x, inputs[1].y) > 0.1) {
      differentDirectionsTogether = true;
    }

    const before = state;
    state = stepGame(state, inputs);
    trace.push({ before, inputs, after: state });

    const anchorsClose = state.anchors.every((anchor, seat) => distance(anchor.position, targets[seat]) < 25);
    const payloadClose = distance(state.payload.position, waypoint) < RIBBON_NATURAL_LENGTH;
    if (anchorsClose && payloadClose && waypointIndex < route.length - 1) waypointIndex += 1;
  }

  return { state, trace, differentDirectionsTogether, waypointIndex };
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeepFrozen);
}

test("三幕几何合法、尺寸固定且所有嵌套定义深冻结", () => {
  assert.equal(WORLD_WIDTH, 960);
  assert.equal(WORLD_HEIGHT, 540);
  assert.equal(LEVELS.length, 3);
  assert.deepEqual(LEVELS.map((level) => level.id), [
    "through-the-stitches",
    "around-the-pin",
    "finish-the-stitch",
  ]);
  for (const level of LEVELS) {
    assert.equal(validateLevel(level), true);
    assertDeepFrozen(level);
  }
});

test("schema 拒绝缺失双线轴、越界或退化几何及出生点落在软垫", () => {
  const valid = clone(LEVELS[0]);
  assert.throws(() => validateLevel(null), TypeError);
  assert.throws(() => validateLevel({ ...valid, anchors: [valid.anchors[0]] }), RangeError);
  assert.throws(() => validateLevel({ ...valid, payload: { x: -1, y: 20 } }), RangeError);
  assert.throws(() => validateLevel({ ...valid, obstacles: [{ x: 0, y: 0, width: -2, height: 3 }] }), RangeError);
  assert.throws(() => validateLevel({ ...valid, hazards: [[{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]] }), RangeError);
  assert.throws(() => validateLevel({ ...valid, anchors: [{ x: 320, y: 100 }, valid.anchors[1]] }), RangeError);
});

test("初始规则状态包含检查点、完全深冻结且不共享关卡坐标引用", () => {
  const state = createGameState();
  assert.equal(state.phase, "ready");
  assert.equal(state.levelIndex, 0);
  assert.equal(state.elapsed, 0);
  assert.equal(state.stepCount, 0);
  assert.equal(state.resetCount, 0);
  assert.equal(state.goalHold, 0);
  assert.equal(state.pauseReason, null);
  assert.deepEqual(state.anchors.map((body) => body.position), LEVELS[0].anchors);
  assert.notStrictEqual(state.anchors[0].position, LEVELS[0].anchors[0]);
  assertDeepFrozen(state);
});

test("输入向量截断并归一化，对角输入不会比单轴更快", () => {
  assert.deepEqual(normalizeInput(null), { x: 0, y: 0 });
  assert.deepEqual(normalizeInput({ x: Number.NaN, y: 1 }), { x: 0, y: 0 });
  assert.deepEqual(normalizeInput({ x: 0.25, y: -0.5 }), { x: 0.25, y: -0.5 });
  const diagonal = normalizeInput({ x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);

  let horizontal = startGame(createGameState());
  let diagonalState = startGame(createGameState());
  for (let index = 0; index < 180; index += 1) {
    horizontal = stepGame(horizontal, [{ x: 1, y: 0 }, { x: 0, y: 0 }]);
    diagonalState = stepGame(diagonalState, [{ x: 1, y: 1 }, { x: 0, y: 0 }]);
  }
  assert.ok(speed(horizontal.anchors[0]) <= MAX_ANCHOR_SPEED + 1e-9);
  assert.ok(speed(diagonalState.anchors[0]) <= MAX_ANCHOR_SPEED + 1e-9);
});

test("固定 1/120 步在不同渲染帧分组下得到完全相同结果", () => {
  const inputs = Array.from({ length: 480 }, (_, index) => (
    index < 180
      ? [{ x: 1, y: 0.4 }, { x: 1, y: -0.25 }]
      : index < 300
        ? [{ x: 0, y: 1 }, { x: 0.25, y: 1 }]
        : [{ x: -0.3, y: 0 }, { x: 0, y: 0 }]
  ));
  let oneStepFrames = startGame(createGameState());
  for (const input of inputs) oneStepFrames = stepGame(oneStepFrames, input);

  let mixedFrames = startGame(createGameState());
  const slices = [5, 2, 12, 1, 7, 3, 9];
  let cursor = 0;
  let frame = 0;
  while (cursor < inputs.length) {
    const count = Math.min(slices[frame % slices.length], inputs.length - cursor);
    for (let offset = 0; offset < count; offset += 1) {
      mixedFrames = stepGame(mixedFrames, inputs[cursor + offset]);
    }
    cursor += count;
    frame += 1;
  }
  assert.deepEqual(mixedFrames, oneStepFrames);
  assert.ok(Math.abs(oneStepFrames.elapsed - 480 * FIXED_DT) < 1e-12);
  assert.equal(oneStepFrames.stepCount, 480);
});

test("双丝带经弹簧和有限投影始终守住最大长度，张力限制在 0 到 1", () => {
  let state = startGame(createGameState());
  for (let index = 0; index < 2400; index += 1) {
    state = stepGame(state, [{ x: -1, y: -1 }, { x: -1, y: 1 }]);
    for (const ribbon of deriveRibbonState(state)) {
      assert.ok(ribbon.length <= RIBBON_MAX_LENGTH + 0.05);
      assert.ok(ribbon.tension >= 0 && ribbon.tension <= 1);
    }
  }
});

test("圆-AABB 投影阻止线轴和吊坠穿透，世界边界也保持圆半径", () => {
  const { trace } = runRoute(0);
  assert.ok(trace.length > 0);
  trace.forEach(({ after }, stepIndex) => {
    const bodies = after.anchors.concat([after.payload]);
    bodies.forEach((body, index) => {
      const radius = index < 2 ? ANCHOR_RADIUS : PAYLOAD_RADIUS;
      assert.ok(body.position.x >= radius - 0.1 && body.position.x <= WORLD_WIDTH - radius + 0.1);
      assert.ok(body.position.y >= radius - 0.1 && body.position.y <= WORLD_HEIGHT - radius + 0.1);
      LEVELS[0].obstacles.forEach((box, boxIndex) => assert.equal(
        circleIntersectsAabb(body.position, radius, box),
        false,
        `step=${stepIndex}, body=${index}, box=${boxIndex}, position=${JSON.stringify(body.position)}`,
      ));
    });
  });
});

test("吊坠圆触碰三角危险区会回检查点并累计重置", () => {
  const triangle = LEVELS[1].hazards[0];
  assert.equal(circleIntersectsTriangle({ x: 595, y: 130 }, PAYLOAD_RADIUS, triangle), true);
  assert.equal(circleIntersectsTriangle({ x: 700, y: 270 }, PAYLOAD_RADIUS, triangle), false);

  const state = clone(startGame(createGameState(1)));
  state.anchors[0].position = { x: 475, y: 105 };
  state.anchors[1].position = { x: 475, y: 160 };
  state.payload.position = { x: 595, y: 130 };
  const reset = stepGame(state);
  assert.equal(reset.phase, "playing");
  assert.equal(reset.resetCount, 1);
  assert.equal(reset.stepCount, 1);
  assert.deepEqual(reset.anchors.map((body) => body.position), LEVELS[1].checkpoint.anchors);
  assert.deepEqual(reset.payload.position, LEVELS[1].checkpoint.payload);
  assert.equal(reset.goalHold, 0);
});

test("终点同时要求吊坠、双线轴、安全张力和低速，并清除中断的保持时间", () => {
  const state = clone(startGame(createGameState()));
  const goal = LEVELS[0].goal;
  state.payload.position = { x: goal.x, y: goal.y };
  state.payload.velocity = { x: 0, y: 0 };
  state.anchors[0].position = { x: goal.anchorMinX + 20, y: goal.y - 45 };
  state.anchors[1].position = { x: goal.anchorMinX + 20, y: goal.y + 45 };
  assert.equal(goalConditionsMet(state), true);

  const onlyPayload = clone(state);
  onlyPayload.anchors[0].position.x = goal.anchorMinX - 1;
  assert.equal(goalConditionsMet(onlyPayload), false);
  const tooFast = clone(state);
  tooFast.payload.velocity.x = 80;
  assert.equal(goalConditionsMet(tooFast), false);
  const highTension = clone(state);
  highTension.anchors[0].position = { x: goal.x - RIBBON_MAX_LENGTH + 1, y: goal.y };
  assert.equal(goalConditionsMet(highTension), false);

  let holding = state;
  for (let index = 0; index < 10; index += 1) holding = stepGame(holding);
  assert.ok(holding.goalHold > 0);
  const interrupted = clone(holding);
  interrupted.payload.velocity.x = 100;
  assert.equal(stepGame(interrupted).goalHold, 0);
});

test("三幕都存在生产 reducer 可完成的确定性双人轨迹", () => {
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    const result = runRoute(levelIndex);
    assert.equal(result.state.phase, levelIndex === LEVELS.length - 1 ? "game-complete" : "level-complete",
      `第 ${levelIndex + 1} 幕未完成：waypoint=${result.waypointIndex}, resets=${result.state.resetCount}, positions=${JSON.stringify({ anchors: result.state.anchors.map((body) => body.position), payload: result.state.payload.position })}`);
    assert.equal(result.state.goalHold, GOAL_HOLD_SECONDS);
    assert.equal(result.state.resetCount, 0, "可解轨迹不应借助危险重置");
    assert.equal(result.differentDirectionsTogether, true);
    for (const { after } of result.trace) {
      deriveRibbonState(after).forEach((ribbon) => assert.ok(ribbon.length <= RIBBON_MAX_LENGTH + 0.05));
      after.anchors.concat([after.payload]).forEach((body, bodyIndex) => {
        const radius = bodyIndex < 2 ? ANCHOR_RADIUS : PAYLOAD_RADIUS;
        LEVELS[levelIndex].obstacles.forEach((box) => {
          assert.equal(circleIntersectsAabb(body.position, radius, box), false);
        });
      });
    }
    assert.ok(result.trace.some(({ inputs }) => (
      inputs[0].y < -0.9 && inputs[1].y > 0.9
    )), "轨迹应包含双方同一时间步向不同方向移动");
  }
});

test("暂停、恢复、重开、下一幕和最终重玩遵守状态机", () => {
  let state = stepGame(startGame(createGameState()), [{ x: 1, y: 0 }, { x: 1, y: 0 }]);
  const paused = pauseGame(state, "hidden");
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pauseReason, "hidden");
  assert.strictEqual(stepGame(paused, [{ x: 1, y: 0 }, { x: 1, y: 0 }]), paused);
  state = resumeGame(paused);
  assert.equal(state.phase, "playing");
  assert.equal(state.pauseReason, null);
  assert.equal(pauseGame(state, "bad-reason").pauseReason, "manual");

  const restarted = restartLevel(state);
  assert.equal(restarted.phase, "playing");
  assert.equal(restarted.stepCount, 0);
  assert.equal(restarted.resetCount, 0);
  assert.deepEqual(restarted.payload.position, LEVELS[0].payload);
  assert.equal(restartLevel(createGameState(1)).phase, "ready");

  const firstComplete = runRoute(0).state;
  const second = nextLevel(firstComplete);
  assert.equal(second.phase, "playing");
  assert.equal(second.levelIndex, 1);
  assert.strictEqual(nextLevel(second), second);

  const finalComplete = runRoute(2).state;
  const replayed = replayGame(finalComplete);
  assert.equal(replayed.phase, "playing");
  assert.equal(replayed.levelIndex, 0);
  assert.equal(replayed.stepCount, 0);
});

test("畸形状态安全回到首幕 ready，合法状态的无效操作保持引用", () => {
  const playing = startGame(createGameState());
  assert.deepEqual(stepGame({ ...clone(playing), stepCount: -1 }), createGameState());
  assert.deepEqual(pauseGame({ ...clone(playing), anchors: [] }), createGameState());
  assert.deepEqual(replayGame({ ...clone(playing), phase: "game-complete", goalHold: GOAL_HOLD_SECONDS }), createGameState());
  assert.deepEqual(resumeGame(null), createGameState());
  assert.strictEqual(startGame(playing), playing);
  assert.strictEqual(resumeGame(playing), playing);
  assert.strictEqual(replayGame(playing), playing);
  assert.strictEqual(nextLevel(playing), playing);
});
