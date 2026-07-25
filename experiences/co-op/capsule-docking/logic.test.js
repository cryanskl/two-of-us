"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const logic = require("./logic.js");
const config = require("./config.js");
const fixtures = require("./golden-fixtures.js");

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)
  ) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) assertDeepFrozen(descriptor.value, seen);
  }
}

function beginLeg(state = logic.createInitialState()) {
  let next = state;
  if (next.phase === "intro") next = logic.reduce(next, { type: "START" });
  return logic.reduce(next, { type: "BEGIN_LEG" });
}

function replay(state, actions) {
  return actions.reduce((current, action) => logic.reduce(current, action), state);
}

function tickMany(state, count) {
  let next = state;
  let remaining = count;
  while (remaining > 0) {
    const chunk = Math.min(5, remaining);
    next = logic.reduce(next, { type: "TICK", count: chunk });
    remaining -= chunk;
  }
  return next;
}

function completeMission() {
  let state = logic.reduce(logic.createInitialState(), { type: "START" });
  for (let legIndex = 0; legIndex < fixtures.legs.length; legIndex += 1) {
    state = logic.reduce(state, { type: "BEGIN_LEG" });
    state = replay(state, fixtures.legs[legIndex]);
    if (legIndex < fixtures.legs.length - 1) {
      state = logic.reduce(state, { type: "NEXT_LEG" });
    }
  }
  return state;
}

function withoutRevision(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.revision;
  return copy;
}

test("目录是无依赖的真实 CommonJS 边界", () => {
  assert.equal(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"), "{\"type\":\"commonjs\"}\n");
  assert.equal(typeof logic.reduce, "function");
  assert.deepEqual(config.seats, ["你", "TA"]);
  assert.equal(typeof config.composeCompletionNote, "function");
});

test("浏览器经典脚本与 CommonJS 暴露同一冻结 API", () => {
  const source = fs.readFileSync(path.join(__dirname, "logic.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "logic.js" });
  assert.equal(typeof context.CapsuleDockingLogic.reduce, "function");
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.CapsuleDockingLogic.LEGS)),
    JSON.parse(JSON.stringify(logic.LEGS)),
  );
  assertDeepFrozen(logic);
});

test("公开 API、常量和三航段精确符合规格", () => {
  assert.deepEqual(Object.keys(logic), [
    "SEATS", "CONTROLS", "LEGS", "STATION_RECTS", "DOCK_GATE", "TICK_RATE",
    "MAX_TICK_BATCH", "POSITION_SCALE", "CAPSULE_RADIUS", "ANGLE_STEPS", "TRIG_SCALE",
    "COS_TABLE", "SIN_TABLE", "DEFAULT_CONFIG", "normalizeConfig", "resolveCompletionNote",
    "roundDiv", "normalizeAngle", "shortestAngleDiff", "approachZero",
    "circleIntersectsAabb", "evaluateDockGate", "createInitialState", "reduce", "getPublicView",
  ]);
  assert.deepEqual({
    seats: logic.SEATS,
    tickRate: logic.TICK_RATE,
    tickBatch: logic.MAX_TICK_BATCH,
    scale: logic.POSITION_SCALE,
    radius: logic.CAPSULE_RADIUS,
    angles: logic.ANGLE_STEPS,
    trig: logic.TRIG_SCALE,
  }, {
    seats: ["attitude", "thrust"],
    tickRate: 60,
    tickBatch: 5,
    scale: 100,
    radius: 2200,
    angles: 256,
    trig: 16384,
  });
  assert.deepEqual(logic.LEGS.map((leg) => leg.initial), [
    { x: 18000, y: 31000, vx: 0, vy: 0, angleIndex: 32, angularVelocity: 0 },
    { x: 18000, y: 18000, vx: 0, vy: 30, angleIndex: 16, angularVelocity: 0 },
    { x: 22000, y: 42000, vx: 90, vy: -35, angleIndex: 240, angularVelocity: 0 },
  ]);
});

test("整数三角表满足象限、对称和冻结 SHA-256", () => {
  assert.equal(logic.COS_TABLE.length, 256);
  assert.equal(logic.SIN_TABLE.length, 256);
  assert.deepEqual([
    logic.COS_TABLE[0], logic.SIN_TABLE[0],
    logic.COS_TABLE[64], logic.SIN_TABLE[64],
    logic.COS_TABLE[128], logic.SIN_TABLE[128],
    logic.COS_TABLE[192], logic.SIN_TABLE[192],
  ], [16384, 0, 0, 16384, -16384, 0, 0, -16384]);
  for (let index = 0; index < 128; index += 1) {
    const oppositeCos = logic.COS_TABLE[index] === 0 ? 0 : -logic.COS_TABLE[index];
    const oppositeSin = logic.SIN_TABLE[index] === 0 ? 0 : -logic.SIN_TABLE[index];
    assert.equal(logic.COS_TABLE[index + 128], oppositeCos);
    assert.equal(logic.SIN_TABLE[index + 128], oppositeSin);
  }
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify({ cos: logic.COS_TABLE, sin: logic.SIN_TABLE }))
    .digest("hex");
  assert.equal(digest, "33ba6aa1ad08759367f945d173cc89d34e5de1177c1c1bc92426568212727573");
});

test("整数辅助函数覆盖半值、负数、环形 tie 与阻尼", () => {
  assert.deepEqual([
    logic.roundDiv(5, 2),
    logic.roundDiv(-5, 2),
    logic.roundDiv(4, 3),
    logic.roundDiv(-4, 3),
  ], [3, -3, 1, -1]);
  assert.equal(logic.roundDiv(1, 0), null);
  assert.equal(logic.normalizeAngle(-1), 255);
  assert.equal(logic.normalizeAngle(256), 0);
  assert.equal(logic.shortestAngleDiff(255, 0), -1);
  assert.equal(logic.shortestAngleDiff(128, 0), -128);
  assert.deepEqual([
    logic.approachZero(3, 1),
    logic.approachZero(-3, 1),
    logic.approachZero(1, 5),
  ], [2, -2, 0]);
});

test("圆与 AABB 按闭集处理边、角、相切和一单位分离", () => {
  const bounds = { xMin: 100, xMax: 200, yMin: 100, yMax: 200 };
  assert.equal(logic.circleIntersectsAabb({ x: 70, y: 150, radius: 30 }, bounds), true);
  assert.equal(logic.circleIntersectsAabb({ x: 69, y: 150, radius: 30 }, bounds), false);
  assert.equal(logic.circleIntersectsAabb({ x: 76, y: 82, radius: 30 }, bounds), true);
  assert.equal(logic.circleIntersectsAabb({ x: 75, y: 81, radius: 30 }, bounds), false);
  assert.equal(logic.circleIntersectsAabb({ x: 150, y: 150, radius: 0 }, bounds), true);
  assert.equal(logic.circleIntersectsAabb({ x: 0, y: 0, radius: -1 }, bounds), null);
  assert.equal(logic.circleIntersectsAabb({ x: 0, y: 0, radius: 1, extra: 1 }, bounds), null);
});

test("几何查询只消费 data descriptor，不触发 late get", () => {
  let getCount = 0;
  const target = { x: 70, y: 150, radius: 30 };
  const proxy = new Proxy(target, {
    get() {
      getCount += 1;
      throw new Error("late get must not run");
    },
  });
  assert.equal(
    logic.circleIntersectsAabb(proxy, { xMin: 100, xMax: 200, yMin: 100, yMax: 200 }),
    true,
  );
  assert.equal(getCount, 0);
  const accessor = {};
  Object.defineProperties(accessor, {
    x: { enumerable: true, get() { throw new Error("getter"); } },
    y: { enumerable: true, value: 0 },
    radius: { enumerable: true, value: 1 },
  });
  assert.equal(
    logic.circleIntersectsAabb(accessor, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }),
    null,
  );
});

test("六项 Gate 使用闭区间、环形角差和四键全松", () => {
  const physics = {
    x: 80500,
    y: 32400,
    vx: -50,
    vy: 25,
    angleIndex: 255,
    angularVelocity: -1,
  };
  const released = { attitude: [], thrust: [] };
  assert.deepEqual(logic.evaluateDockGate(physics, released), {
    positionOk: true,
    velocityOk: true,
    angleOk: true,
    angularVelocityOk: true,
    controlsReleased: true,
    collisionFree: true,
    allOk: true,
  });
  const held = { attitude: ["rotate-left", "rotate-right"], thrust: [] };
  const heldGate = logic.evaluateDockGate(physics, held);
  assert.equal(heldGate.controlsReleased, false);
  assert.equal(heldGate.allOk, false);
  assert.equal(Object.isFrozen(heldGate), true);
});

test("初态、START、BEGIN_LEG 与无效 action 保持 exact 闭包", () => {
  const initial = logic.createInitialState();
  assert.equal(initial.phase, "intro");
  assert.equal(initial.revision, 0);
  const intro = logic.reduce(initial, { type: "START" });
  assert.equal(intro.phase, "leg-intro");
  const approaching = logic.reduce(intro, { type: "BEGIN_LEG" });
  assert.equal(approaching.phase, "approaching");
  assert.equal(logic.reduce(approaching, { type: "PRESS", seat: "thrust", control: "rotate-left" }), approaching);
  assert.equal(logic.reduce(approaching, { type: "TICK", count: 6 }), approaching);
  assert.equal(logic.reduce(approaching, { type: "TICK", count: 1, extra: true }), approaching);
  assert.equal(logic.reduce(approaching, { type: "UNKNOWN" }), approaching);
  assertDeepFrozen(approaching);
});

test("exact schema 接受字段重排但拒绝阶段语义矛盾", () => {
  const approaching = beginLeg();
  const reordered = logic.reduce(approaching, {
    control: "rotate-left",
    type: "PRESS",
    seat: "attitude",
  });
  assert.deepEqual(reordered.heldControls.attitude, ["rotate-left"]);

  const impossibleStable = {
    ...approaching,
    stableTicks: 1,
  };
  assert.deepEqual(
    logic.reduce(impossibleStable, { type: "TICK", count: 1 }),
    logic.createInitialState(),
  );
  const prematureRecord = {
    ...approaching,
    completedLegs: [{
      legId: "turn-home",
      attempts: 1,
      attitudeTicks: 1,
      thrustTicks: 1,
    }],
  };
  assert.deepEqual(
    logic.reduce(prematureRecord, { type: "TICK", count: 1 }),
    logic.createInitialState(),
  );
});

test("新角度先更新再施力；双按抵消并触发阻尼", () => {
  let state = beginLeg();
  state = logic.reduce(state, { type: "PRESS", seat: "attitude", control: "rotate-left" });
  state = logic.reduce(state, { type: "PRESS", seat: "thrust", control: "thrust-forward" });
  state = logic.reduce(state, { type: "TICK", count: 1 });
  assert.equal(state.angleIndex, 31);
  assert.deepEqual([state.vx, state.vy], [2, 2]);
  state = logic.reduce(state, { type: "PRESS", seat: "attitude", control: "rotate-right" });
  state = logic.reduce(state, { type: "PRESS", seat: "thrust", control: "thrust-reverse" });
  state = logic.reduce(state, { type: "TICK", count: 1 });
  assert.equal(state.angularVelocity, 0);
  assert.deepEqual([state.vx, state.vy], [1, 1]);
});

test("三条冻结 fixture 精确完成并证明两席参与", () => {
  let state = logic.reduce(logic.createInitialState(), { type: "START" });
  for (let legIndex = 0; legIndex < fixtures.legs.length; legIndex += 1) {
    state = logic.reduce(state, { type: "BEGIN_LEG" });
    state = replay(state, fixtures.legs[legIndex]);
    const expected = fixtures.expected[legIndex];
    assert.equal(state.phase, "docked");
    assert.deepEqual({
      ticks: state.legTick,
      x: state.x,
      y: state.y,
      vx: state.vx,
      vy: state.vy,
      angleIndex: state.angleIndex,
      angularVelocity: state.angularVelocity,
    }, expected);
    assert.equal(state.stableTicks, 30);
    assert.ok(state.controlTicks.attitude > 0);
    assert.ok(state.controlTicks.thrust > 0);
    assert.equal(state.completedLegs.length, legIndex + 1);
    if (legIndex < fixtures.legs.length - 1) {
      state = logic.reduce(state, { type: "NEXT_LEG" });
      assert.equal(state.phase, "leg-intro");
      assert.equal(state.attempt, 1);
    }
  }
});

test("TICK 分片只改变 revision，不改变规则终态或 public view", () => {
  const normal = replay(beginLeg(), fixtures.legs[0]);
  const singleActions = fixtures.legs[0].flatMap((action) => {
    if (action.type !== "TICK") return [action];
    return Array.from({ length: action.count }, () => ({ type: "TICK", count: 1 }));
  });
  const singles = replay(beginLeg(), singleActions);
  assert.deepEqual(withoutRevision(singles), withoutRevision(normal));
  assert.deepEqual(
    withoutRevision(logic.getPublicView(singles, config)),
    withoutRevision(logic.getPublicView(normal, config)),
  );
});

test("姿态席或推进席缺席时不能完成，持续按键不累计稳定窗", () => {
  let attitudeOnly = beginLeg();
  attitudeOnly = logic.reduce(attitudeOnly, { type: "PRESS", seat: "attitude", control: "rotate-left" });
  attitudeOnly = tickMany(attitudeOnly, 180);
  assert.notEqual(attitudeOnly.phase, "docked");
  assert.equal(attitudeOnly.x, 18000);

  let thrustOnly = beginLeg();
  thrustOnly = logic.reduce(thrustOnly, { type: "PRESS", seat: "thrust", control: "thrust-forward" });
  thrustOnly = tickMany(thrustOnly, 180);
  assert.notEqual(thrustOnly.phase, "docked");
  assert.equal(thrustOnly.angleIndex, 32);

  const gate = logic.evaluateDockGate({
    x: 81500,
    y: 31000,
    vx: 0,
    vy: 0,
    angleIndex: 0,
    angularVelocity: 0,
  }, {
    attitude: [],
    thrust: ["thrust-forward"],
  });
  assert.equal(gate.controlsReleased, false);
  assert.equal(gate.allOk, false);
});

test("高速微步在相切点失败并停在最后安全位置", () => {
  const base = beginLeg();
  const crossing = {
    ...base,
    x: 81700,
    y: 26000,
    vx: 240,
    vy: 0,
    angleIndex: 0,
    angularVelocity: 0,
  };
  const failed = logic.reduce(crossing, { type: "TICK", count: 1 });
  assert.equal(failed.phase, "failed");
  assert.deepEqual(failed.lastResult, {
    status: "hull-contact",
    legId: "turn-home",
    obstacleId: "upper-hull",
  });
  assert.equal(failed.x, 81799);
  assert.equal(failed.y, 26000);
  assert.deepEqual([failed.vx, failed.vy, failed.angularVelocity], [0, 0, 0]);
});

test("失败重试增加 attempt，SUSPEND 只重置当前段", () => {
  const base = beginLeg();
  const crossing = {
    ...base,
    x: 81700,
    y: 26000,
    vx: 240,
    angleIndex: 0,
  };
  const failed = logic.reduce(crossing, { type: "TICK", count: 1 });
  const retried = logic.reduce(failed, { type: "RETRY_LEG" });
  assert.equal(retried.phase, "leg-intro");
  assert.equal(retried.attempt, 2);
  assert.deepEqual([retried.x, retried.y], [18000, 31000]);
  const resumed = logic.reduce(retried, { type: "BEGIN_LEG" });
  const suspended = logic.reduce(resumed, { type: "SUSPEND" });
  assert.equal(suspended.attempt, 2);
  assert.equal(suspended.phase, "leg-intro");
  assert.equal(suspended.legTick, 0);
});

test("三段后进入纪念态、完成态并可全新重开", () => {
  const docked = completeMission();
  assert.equal(docked.phase, "docked");
  const result = logic.reduce(docked, { type: "NEXT_LEG" });
  assert.equal(result.phase, "mission-result");
  assert.deepEqual([result.x, result.y, result.angleIndex], [82000, 31000, 0]);
  const completed = logic.reduce(result, { type: "FINISH" });
  assert.equal(completed.phase, "complete");
  const restarted = logic.reduce(completed, { type: "RESTART" });
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.completedLegs.length, 0);
  assert.equal(restarted.revision, completed.revision + 1);
});

test("public view 隐藏个人控制量、答案并冻结阶段 Gate 呈现", () => {
  const docked = completeMission();
  const dockedView = logic.getPublicView(docked, config);
  assert.equal(dockedView.gateVisible, true);
  assert.equal(dockedView.gateStatusText, "已经稳定 30 / 30。");
  assert.equal(dockedView.completedLegs.length, 3);
  assert.ok(dockedView.completedLegs.every((record) => !Object.hasOwn(record, "attitudeTicks")));
  assert.doesNotMatch(JSON.stringify(dockedView), /golden|fixture|attitudeTicks|thrustTicks/);

  const mission = logic.reduce(docked, { type: "NEXT_LEG" });
  const missionView = logic.getPublicView(mission, config);
  assert.equal(missionView.gateVisible, false);
  assert.equal(missionView.gateStatusText, "");
  assert.deepEqual(missionView.summary, {
    seats: ["你", "TA"],
    legCount: 3,
    totalAttempts: 3,
    retries: 0,
    legs: ["靠近·把船头转回来", "修正·从上方落回轴线", "回家·带着余速停稳"],
  });
  assertDeepFrozen(missionView);
});

test("配置原子回退，完成赠言只接收冻结断引用 summary", () => {
  assert.equal(logic.normalizeConfig({ seats: ["甲", "甲"], composeCompletionNote() {} }), logic.DEFAULT_CONFIG);
  const custom = {
    seats: [" 甲 ", " 乙 "],
    composeCompletionNote(summary) {
      assert.equal(Object.isFrozen(summary), true);
      return `${summary.seats.join("和")}完成了 ${summary.legCount} 段`;
    },
  };
  const summary = {
    seats: ["甲", "乙"],
    legCount: 3,
    totalAttempts: 4,
    retries: 1,
    legs: ["一", "二", "三"],
  };
  assert.deepEqual(logic.normalizeConfig(custom).seats, ["甲", "乙"]);
  assert.equal(logic.resolveCompletionNote(summary, custom), "甲和乙完成了 3 段");
  assert.match(logic.resolveCompletionNote(summary, {
    seats: ["甲", "乙"],
    composeCompletionNote() {
      return Promise.resolve("不能异步");
    },
  }), /稳稳接回家/);
});

test("函数型 Proxy 配置与对象型 control 都按敌对输入安全处理", () => {
  const hostileComposer = new Proxy(function () {
    return "代理函数仍可通过安全包装调用";
  }, {
    ownKeys() {
      throw new Error("composer ownKeys trap");
    },
  });
  const candidate = {
    seats: ["甲", "乙"],
    composeCompletionNote: hostileComposer,
  };
  let normalized;
  assert.doesNotThrow(() => {
    normalized = logic.normalizeConfig(candidate);
  });
  assert.deepEqual(normalized.seats, ["甲", "乙"]);
  assert.notEqual(normalized.composeCompletionNote, hostileComposer);
  assert.equal(Object.isFrozen(hostileComposer), false);
  assert.doesNotThrow(() => logic.resolveCompletionNote({
    seats: ["甲", "乙"],
    legCount: 3,
    totalAttempts: 3,
    retries: 0,
    legs: ["一", "二", "三"],
  }, candidate));

  const hostileControl = new Proxy({}, {
    get() {
      throw new Error("control coercion trap");
    },
  });
  const approaching = beginLeg();
  assert.doesNotThrow(() => logic.reduce(approaching, {
    type: "PRESS",
    seat: "attitude",
    control: hostileControl,
  }));
  assert.equal(logic.reduce(approaching, {
    type: "PRESS",
    seat: "attitude",
    control: hostileControl,
  }), approaching);
});

test("畸形 state 安全回初态，accessor 与数组子类不抛异常", () => {
  const malformed = { phase: "approaching" };
  assert.deepEqual(logic.reduce(malformed, { type: "TICK", count: 1 }), logic.createInitialState());
  const state = JSON.parse(JSON.stringify(beginLeg()));
  state.heldControls.attitude = new (class CustomArray extends Array {})();
  assert.doesNotThrow(() => logic.reduce(state, { type: "TICK", count: 1 }));
  assert.deepEqual(logic.reduce(state, { type: "TICK", count: 1 }), logic.createInitialState());

  const hostile = {};
  Object.defineProperty(hostile, "phase", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.doesNotThrow(() => logic.getPublicView(hostile, config));
  assert.equal(logic.getPublicView(hostile, config).phase, "intro");
});

test("生产核心没有网络、存储、DOM、随机、时钟或运行时三角函数", () => {
  const source = fs.readFileSync(path.join(__dirname, "logic.js"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(source, /\b(?:document|window|navigator)\b/);
  assert.doesNotMatch(source, /Math\.(?:sin|cos|random)\s*\(/);
  assert.doesNotMatch(source, /\b(?:Date|performance)\b/);
  assert.doesNotMatch(source, /\brequire\s*\(/);
});
