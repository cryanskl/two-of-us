"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const logic = require("./logic.js");

const API_KEYS = [
  "Q",
  "CONSTANTS",
  "ANGLE_DEGREES",
  "COS_Q12",
  "SIN_Q12",
  "POWER2_VALUES",
  "DEFAULT_CONFIG",
  "sanitizeConfig",
  "roundEven",
  "mirrorXQ",
  "resolveSegmentEvent",
  "simulateShot",
  "createInitialState",
  "reduce",
  "getPublicView",
];

const EXPECTED_CONSTANTS = {
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
};

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function eventOf(xQ, yQ, nextXQ, nextYQ, bounceCount = 0) {
  return logic.resolveSegmentEvent({
    xQ,
    yQ,
    nextXQ,
    nextYQ,
    bounceCount,
  });
}

test("导出 exact 15-key API、30-key CONSTANTS 与冻结查表", () => {
  assert.deepEqual(Object.keys(logic), API_KEYS);
  assert.equal(logic.Q, 4096);
  assert.deepEqual(Object.keys(logic.CONSTANTS), Object.keys(EXPECTED_CONSTANTS));
  assert.equal(Object.keys(logic.CONSTANTS).length, 30);
  assert.deepEqual(logic.CONSTANTS, EXPECTED_CONSTANTS);
  assert.deepEqual(logic.ANGLE_DEGREES, [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
  assert.deepEqual(logic.COS_Q12, [3956, 3849, 3712, 3547, 3355, 3138, 2896, 2633, 2349, 2048, 1731]);
  assert.deepEqual(logic.SIN_Q12, [1060, 1401, 1731, 2048, 2349, 2633, 2896, 3138, 3355, 3547, 3712]);
  assert.deepEqual(logic.POWER2_VALUES, [16, 17, 18, 19, 20, 21, 22, 23, 24]);
  assert.deepEqual(logic.DEFAULT_CONFIG, { playerNames: ["你", "TA"] });
  assertDeepFrozen(logic);
});

test("真实 CommonJS 与浏览器经典脚本得到同构 API", () => {
  assert.equal(globalThis.HeartCatapultLogic, logic);

  const context = vm.createContext({});
  vm.runInContext(
    readFileSync(path.join(__dirname, "logic.js"), "utf8"),
    context,
    { filename: "logic.js" },
  );
  assert.deepEqual(Object.keys(context.HeartCatapultLogic), API_KEYS);
  assert.equal(context.HeartCatapultLogic.Q, 4096);
  assert.deepEqual(
    Array.from(context.HeartCatapultLogic.ANGLE_DEGREES),
    logic.ANGLE_DEGREES,
  );
  assert.equal(Object.isFrozen(context.HeartCatapultLogic), true);
});

test("roundEven 覆盖正负半值、奇偶商、安全边界与非法输入", () => {
  for (const [numerator, denominator, expected] of [
    [5, 2, 2],
    [7, 2, 4],
    [-5, 2, -2],
    [-7, 2, -4],
    [1, 2, 0],
    [-1, 2, 0],
    [3, 2, 2],
    [-3, 2, -2],
    [10, 4, 2],
    [14, 4, 4],
    [Number.MAX_SAFE_INTEGER, 1, Number.MAX_SAFE_INTEGER],
    [-Number.MAX_SAFE_INTEGER, 1, -Number.MAX_SAFE_INTEGER],
  ]) {
    assert.equal(logic.roundEven(numerator, denominator), expected);
    assert.equal(logic.roundEven(-numerator, denominator), expected === 0 ? 0 : -expected);
  }

  for (const args of [
    [],
    [1],
    [1, 0],
    [1, -1],
    [1.5, 1],
    [1, 1.5],
    ["1", 1],
    [1, "1"],
    [Number.MAX_VALUE, 1],
    [1, Number.MAX_VALUE],
    [1n, 1],
  ]) {
    assert.equal(logic.roundEven(...args), null);
  }
});

test("mirrorXQ exact 镜像、二次镜像恒等且拒绝 coercion", () => {
  const { WORLD_WIDTH_Q } = logic.CONSTANTS;
  for (const xQ of [0, 1, 32768, 475136, 1966080, 3899392, WORLD_WIDTH_Q]) {
    assert.equal(logic.mirrorXQ(xQ, 0), xQ);
    const mirrored = logic.mirrorXQ(xQ, 1);
    assert.equal(mirrored, WORLD_WIDTH_Q - xQ);
    assert.equal(logic.mirrorXQ(mirrored, 1), xQ);
  }

  for (const args of [
    [-1, 0],
    [WORLD_WIDTH_Q + 1, 0],
    [0, -1],
    [0, 2],
    ["0", 0],
    [0, "0"],
    [0.5, 0],
  ]) {
    assert.equal(logic.mirrorXQ(...args), null);
  }
});

test("resolveSegmentEvent 覆盖 none、四类事件、闭 AABB 与平行轴", () => {
  const C = logic.CONSTANTS;
  const midpointY = (C.TARGET_COLLISION_TOP_Q + C.TARGET_COLLISION_BOTTOM_Q) / 2;

  assert.deepEqual(eventOf(100000, 100000, 200000, 100000), {
    type: "none",
    t: null,
    contact: null,
  });

  assert.deepEqual(
    eventOf(
      C.TARGET_COLLISION_LEFT_Q - 100,
      midpointY,
      C.TARGET_COLLISION_LEFT_Q + 100,
      midpointY,
    ),
    {
      type: "castle",
      t: { numerator: 1, denominator: 2 },
      contact: { xQ: C.TARGET_COLLISION_LEFT_Q, yQ: midpointY },
    },
  );

  const ground = eventOf(
    100000,
    C.GROUND_CENTER_Y_Q - 100,
    100000,
    C.GROUND_CENTER_Y_Q + 100,
  );
  assert.deepEqual(ground, {
    type: "ground",
    t: { numerator: 1, denominator: 2 },
    contact: { xQ: 100000, yQ: C.GROUND_CENTER_Y_Q },
  });

  const horizontalExit = eventOf(
    C.RIGHT_CENTER_BOUND_Q - 100,
    100000,
    C.RIGHT_CENTER_BOUND_Q + 400,
    100000,
  );
  assert.deepEqual(horizontalExit, {
    type: "horizontal-exit",
    t: { numerator: 1, denominator: 5 },
    contact: { xQ: C.RIGHT_CENTER_BOUND_Q, yQ: 100000 },
  });

  const topExit = eventOf(
    100000,
    C.TOP_CENTER_BOUND_Q + 100,
    100000,
    C.TOP_CENTER_BOUND_Q - 100,
  );
  assert.deepEqual(topExit, {
    type: "top-exit",
    t: { numerator: 1, denominator: 2 },
    contact: { xQ: 100000, yQ: C.TOP_CENTER_BOUND_Q },
  });

  const inside = eventOf(
    C.TARGET_COLLISION_LEFT_Q + 1,
    midpointY,
    C.TARGET_COLLISION_LEFT_Q - 100,
    midpointY,
  );
  assert.deepEqual(inside.t, { numerator: 0, denominator: 1 });
  assert.equal(inside.type, "castle");

  const boundaryOut = eventOf(
    C.TARGET_COLLISION_LEFT_Q,
    midpointY,
    C.TARGET_COLLISION_LEFT_Q - 100,
    midpointY,
  );
  assert.equal(boundaryOut.type, "castle");
  assert.deepEqual(boundaryOut.t, { numerator: 0, denominator: 1 });

  assert.equal(
    eventOf(
      C.TARGET_COLLISION_LEFT_Q - 1,
      C.TARGET_COLLISION_TOP_Q - 1,
      C.TARGET_COLLISION_RIGHT_Q + 1,
      C.TARGET_COLLISION_TOP_Q - 1,
    ).type,
    "none",
  );
});

test("resolveSegmentEvent 选择严格最早事件并执行同刻优先级", () => {
  const C = logic.CONSTANTS;

  const groundBeforeExit = eventOf(
    C.RIGHT_CENTER_BOUND_Q - 300,
    C.GROUND_CENTER_Y_Q - 100,
    C.RIGHT_CENTER_BOUND_Q + 200,
    C.GROUND_CENTER_Y_Q + 100,
  );
  assert.equal(groundBeforeExit.type, "ground");
  assert.deepEqual(groundBeforeExit.t, { numerator: 1, denominator: 2 });

  const exitBeforeGround = eventOf(
    C.RIGHT_CENTER_BOUND_Q - 100,
    C.GROUND_CENTER_Y_Q - 100,
    C.RIGHT_CENTER_BOUND_Q + 400,
    C.GROUND_CENTER_Y_Q + 200,
  );
  assert.equal(exitBeforeGround.type, "horizontal-exit");
  assert.deepEqual(exitBeforeGround.t, { numerator: 1, denominator: 5 });

  const castleTiesGround = eventOf(
    C.TARGET_COLLISION_LEFT_Q - 100,
    C.GROUND_CENTER_Y_Q - 100,
    C.TARGET_COLLISION_LEFT_Q + 100,
    C.GROUND_CENTER_Y_Q + 100,
  );
  assert.equal(castleTiesGround.type, "castle");
  assert.deepEqual(castleTiesGround.t, { numerator: 1, denominator: 2 });

  const castleBeforeGround = eventOf(
    C.TARGET_COLLISION_LEFT_Q - 100,
    C.GROUND_CENTER_Y_Q - 150,
    C.TARGET_COLLISION_LEFT_Q + 100,
    C.GROUND_CENTER_Y_Q + 50,
  );
  assert.equal(castleBeforeGround.type, "castle");
  assert.deepEqual(castleBeforeGround.t, { numerator: 1, denominator: 2 });
});

test("resolveSegmentEvent 强制安全域、canonical record 与递归冻结输出", () => {
  const C = logic.CONSTANTS;
  const valid = eventOf(-C.MAX_EVENT_COORD_Q, 0, C.MAX_EVENT_COORD_Q, 0, 1);
  assert.ok(valid);
  assertDeepFrozen(valid);

  for (const input of [
    null,
    [],
    {},
    { xQ: 0, yQ: 0, nextXQ: 1, nextYQ: 1 },
    { xQ: 0, yQ: 0, nextXQ: 1, nextYQ: 1, bounceCount: 0, extra: true },
    { xQ: C.MAX_EVENT_COORD_Q + 1, yQ: 0, nextXQ: 1, nextYQ: 1, bounceCount: 0 },
    { xQ: 0, yQ: -C.MAX_EVENT_COORD_Q - 1, nextXQ: 1, nextYQ: 1, bounceCount: 0 },
    { xQ: 0, yQ: 0, nextXQ: 1.5, nextYQ: 1, bounceCount: 0 },
    { xQ: 0, yQ: 0, nextXQ: 1, nextYQ: 1, bounceCount: 2 },
    Object.assign(Object.create(null), {
      xQ: 0,
      yQ: 0,
      nextXQ: 1,
      nextYQ: 1,
      bounceCount: 0,
    }),
  ]) {
    assert.equal(logic.resolveSegmentEvent(input), null);
  }

  let getterRuns = 0;
  const accessor = {
    yQ: 0,
    nextXQ: 1,
    nextYQ: 1,
    bounceCount: 0,
  };
  Object.defineProperty(accessor, "xQ", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return 0;
    },
  });
  assert.equal(logic.resolveSegmentEvent(accessor), null);
  assert.equal(getterRuns, 0);
});

const ORACLE_Q = 4096n;
const ORACLE = {
  WORLD_WIDTH_Q: 3932160n,
  LEFT_CENTER_BOUND_Q: 32768n,
  RIGHT_CENTER_BOUND_Q: 3899392n,
  TOP_CENTER_BOUND_Q: 32768n,
  GROUND_CENTER_Y_Q: 1933312n,
  LOCAL_LAUNCH_X_Q: 475136n,
  LOCAL_LAUNCH_Y_Q: 1671168n,
  TARGET_COLLISION_LEFT_Q: 3342336n,
  TARGET_COLLISION_RIGHT_Q: 3719168n,
  TARGET_COLLISION_TOP_Q: 1507328n,
  TARGET_COLLISION_BOTTOM_Q: 1933312n,
  GRAVITY_Q12: 640n,
  MAX_TICKS: 224,
};

const ORACLE_COS_Q12 = [
  3956n, 3849n, 3712n, 3547n, 3355n, 3138n, 2896n, 2633n, 2349n, 2048n, 1731n,
];
const ORACLE_SIN_Q12 = [
  1060n, 1401n, 1731n, 2048n, 2349n, 2633n, 2896n, 3138n, 3355n, 3547n, 3712n,
];
const ORACLE_POWER2 = [16n, 17n, 18n, 19n, 20n, 21n, 22n, 23n, 24n];

function oracleAbs(value) {
  return value < 0n ? -value : value;
}

function oracleGcd(left, right) {
  let a = oracleAbs(left);
  let b = oracleAbs(right);
  while (b !== 0n) [a, b] = [b, a % b];
  return a || 1n;
}

function oracleRat(numerator, denominator = 1n) {
  let n = numerator;
  let d = denominator;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = oracleGcd(n, d);
  return { numerator: n / divisor, denominator: d / divisor };
}

function oracleTrack(metrics, value) {
  const magnitude = oracleAbs(value);
  if (magnitude > metrics.maxIntermediate) metrics.maxIntermediate = magnitude;
  return value;
}

function oracleCompare(left, right, metrics) {
  const lhs = oracleTrack(metrics, left.numerator * right.denominator);
  const rhs = oracleTrack(metrics, right.numerator * left.denominator);
  return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
}

function oracleRoundEven(numerator, denominator = 1n) {
  let n = numerator;
  let d = denominator;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const sign = n < 0n ? -1n : 1n;
  const magnitude = oracleAbs(n);
  const quotient = magnitude / d;
  const remainder = magnitude % d;
  const complement = d - remainder;
  let rounded = quotient;
  if (remainder > complement
    || (remainder === complement && quotient % 2n !== 0n)) rounded += 1n;
  return sign * rounded;
}

function oracleAxisInterval(position, delta, lower, upper) {
  if (delta === 0n) {
    return position >= lower && position <= upper
      ? [oracleRat(0n), oracleRat(1n)]
      : null;
  }
  let entry = oracleRat(lower - position, delta);
  let exit = oracleRat(upper - position, delta);
  const metrics = { maxIntermediate: 0n };
  if (oracleCompare(entry, exit, metrics) > 0) [entry, exit] = [exit, entry];
  return [entry, exit];
}

function oracleSegmentAabb(xQ, yQ, deltaXQ, deltaYQ, metrics) {
  let entry = oracleRat(0n);
  let exit = oracleRat(1n);
  const intervals = [
    oracleAxisInterval(
      xQ,
      deltaXQ,
      ORACLE.TARGET_COLLISION_LEFT_Q,
      ORACLE.TARGET_COLLISION_RIGHT_Q,
    ),
    oracleAxisInterval(
      yQ,
      deltaYQ,
      ORACLE.TARGET_COLLISION_TOP_Q,
      ORACLE.TARGET_COLLISION_BOTTOM_Q,
    ),
  ];
  if (intervals.some((interval) => interval === null)) return null;
  for (const interval of intervals) {
    if (oracleCompare(interval[0], entry, metrics) > 0) entry = interval[0];
    if (oracleCompare(interval[1], exit, metrics) < 0) exit = interval[1];
    if (oracleCompare(entry, exit, metrics) > 0) return null;
  }
  return entry;
}

function oraclePointAt(position, delta, time, metrics) {
  const numerator = oracleTrack(
    metrics,
    position * time.denominator + delta * time.numerator,
  );
  return oracleRat(numerator, time.denominator);
}

function oracleEarliest(events, metrics) {
  const priority = {
    castle: 0,
    ground: 1,
    "horizontal-exit": 2,
    "top-exit": 3,
  };
  return events.sort((left, right) => {
    const order = oracleCompare(left.t, right.t, metrics);
    return order || priority[left.type] - priority[right.type];
  })[0];
}

function oracleResolve(xQ, yQ, nextXQ, nextYQ, metrics) {
  const deltaXQ = nextXQ - xQ;
  const deltaYQ = nextYQ - yQ;
  const events = [];
  const castle = oracleSegmentAabb(xQ, yQ, deltaXQ, deltaYQ, metrics);
  if (castle) events.push({ type: "castle", t: castle });

  if (yQ < ORACLE.GROUND_CENTER_Y_Q
    && nextYQ >= ORACLE.GROUND_CENTER_Y_Q
    && deltaYQ > 0n) {
    events.push({
      type: "ground",
      t: oracleRat(ORACLE.GROUND_CENTER_Y_Q - yQ, deltaYQ),
    });
  }
  if (xQ >= ORACLE.LEFT_CENTER_BOUND_Q
    && deltaXQ < 0n
    && nextXQ < ORACLE.LEFT_CENTER_BOUND_Q) {
    events.push({
      type: "horizontal-exit",
      t: oracleRat(ORACLE.LEFT_CENTER_BOUND_Q - xQ, deltaXQ),
    });
  }
  if (xQ <= ORACLE.RIGHT_CENTER_BOUND_Q
    && deltaXQ > 0n
    && nextXQ > ORACLE.RIGHT_CENTER_BOUND_Q) {
    events.push({
      type: "horizontal-exit",
      t: oracleRat(ORACLE.RIGHT_CENTER_BOUND_Q - xQ, deltaXQ),
    });
  }
  if (yQ >= ORACLE.TOP_CENTER_BOUND_Q
    && deltaYQ < 0n
    && nextYQ < ORACLE.TOP_CENTER_BOUND_Q) {
    events.push({
      type: "top-exit",
      t: oracleRat(ORACLE.TOP_CENTER_BOUND_Q - yQ, deltaYQ),
    });
  }
  if (events.length === 0) return null;

  const event = oracleEarliest(events, metrics);
  const exactXQ = oraclePointAt(xQ, deltaXQ, event.t, metrics);
  const exactYQ = oraclePointAt(yQ, deltaYQ, event.t, metrics);
  let contactXQ = oracleRoundEven(exactXQ.numerator, exactXQ.denominator);
  let contactYQ = oracleRoundEven(exactYQ.numerator, exactYQ.denominator);
  if (event.type === "ground") contactYQ = ORACLE.GROUND_CENTER_Y_Q;
  if (event.type === "horizontal-exit") {
    contactXQ = deltaXQ < 0n
      ? ORACLE.LEFT_CENTER_BOUND_Q
      : ORACLE.RIGHT_CENTER_BOUND_Q;
  }
  if (event.type === "top-exit") contactYQ = ORACLE.TOP_CENTER_BOUND_Q;
  return {
    type: event.type,
    t: event.t,
    contactXQ,
    contactYQ,
  };
}

function createOracleMetrics() {
  return {
    maxPreEventXQ: 0n,
    maxTerminalXQ: 0n,
    maxYQ: 0n,
    maxVxQ: 0n,
    maxVyQ: 0n,
    maxInitialProduct: 0n,
    maxIntermediate: 0n,
  };
}

function oracleObserveState(metrics, xQ, yQ, vxQ, vyQ) {
  metrics.maxPreEventXQ = metrics.maxPreEventXQ > oracleAbs(xQ)
    ? metrics.maxPreEventXQ : oracleAbs(xQ);
  metrics.maxYQ = metrics.maxYQ > oracleAbs(yQ) ? metrics.maxYQ : oracleAbs(yQ);
  metrics.maxVxQ = metrics.maxVxQ > oracleAbs(vxQ) ? metrics.maxVxQ : oracleAbs(vxQ);
  metrics.maxVyQ = metrics.maxVyQ > oracleAbs(vyQ) ? metrics.maxVyQ : oracleAbs(vyQ);
}

function oracleShot(angleIndex, powerIndex, metrics = createOracleMetrics()) {
  const speedQ12 = ORACLE_POWER2[powerIndex] * 2048n;
  const vxProduct = speedQ12 * ORACLE_COS_Q12[angleIndex];
  const vyProduct = speedQ12 * ORACLE_SIN_Q12[angleIndex];
  metrics.maxInitialProduct = [
    metrics.maxInitialProduct,
    oracleAbs(vxProduct),
    oracleAbs(vyProduct),
  ].reduce((maximum, value) => (maximum > value ? maximum : value));
  oracleTrack(metrics, vxProduct);
  oracleTrack(metrics, vyProduct);

  let xQ = ORACLE.LOCAL_LAUNCH_X_Q;
  let yQ = ORACLE.LOCAL_LAUNCH_Y_Q;
  let vxQ = oracleRoundEven(vxProduct, ORACLE_Q);
  let vyQ = -oracleRoundEven(vyProduct, ORACLE_Q);
  let bounceCount = 0;
  const frames = [{
    tick: 0,
    xQ: Number(xQ),
    yQ: Number(yQ),
    event: "launch",
  }];
  const exactEvents = [];

  for (let tick = 1; tick <= ORACLE.MAX_TICKS; tick += 1) {
    oracleObserveState(metrics, xQ, yQ, vxQ, vyQ);
    const candidateVyQ = vyQ + ORACLE.GRAVITY_Q12;
    metrics.maxVyQ = metrics.maxVyQ > oracleAbs(candidateVyQ)
      ? metrics.maxVyQ : oracleAbs(candidateVyQ);
    const nextXQ = xQ + vxQ;
    const nextYQ = yQ + candidateVyQ;
    const event = oracleResolve(xQ, yQ, nextXQ, nextYQ, metrics);

    if (!event) {
      xQ = nextXQ;
      yQ = nextYQ;
      vyQ = candidateVyQ;
      frames.push({
        tick,
        xQ: Number(xQ),
        yQ: Number(yQ),
        event: "flight",
      });
      continue;
    }

    exactEvents.push({
      tick,
      type: event.type,
      t: {
        numerator: Number(event.t.numerator),
        denominator: Number(event.t.denominator),
      },
    });
    metrics.maxTerminalXQ = metrics.maxTerminalXQ > oracleAbs(event.contactXQ)
      ? metrics.maxTerminalXQ : oracleAbs(event.contactXQ);

    if (event.type === "castle") {
      frames.push({
        tick,
        xQ: Number(event.contactXQ),
        yQ: Number(event.contactYQ),
        event: "hit",
      });
      return {
        result: {
          outcome: bounceCount === 0 ? "direct-hit" : "bounce-hit",
          terminalReason: "castle",
          bounceCount,
          terminalTick: tick,
          frames,
        },
        exactEvents,
        initialVelocity: [Number(oracleRoundEven(vxProduct, ORACLE_Q)), Number(
          -oracleRoundEven(vyProduct, ORACLE_Q),
        )],
      };
    }

    if (event.type === "ground" && bounceCount === 0) {
      xQ = event.contactXQ;
      yQ = event.contactYQ;
      vxQ = oracleRoundEven(vxQ * 3n, 4n);
      vyQ = -oracleRoundEven(candidateVyQ, 2n);
      bounceCount = 1;
      frames.push({
        tick,
        xQ: Number(xQ),
        yQ: Number(yQ),
        event: "bounce",
      });
      continue;
    }

    frames.push({
      tick,
      xQ: Number(event.contactXQ),
      yQ: Number(event.contactYQ),
      event: "miss",
    });
    return {
      result: {
        outcome: "miss",
        terminalReason: event.type === "ground"
          ? "second-ground"
          : event.type,
        bounceCount,
        terminalTick: tick,
        frames,
      },
      exactEvents,
      initialVelocity: [
        Number(oracleRoundEven(vxProduct, ORACLE_Q)),
        Number(-oracleRoundEven(vyProduct, ORACLE_Q)),
      ],
    };
  }

  frames[frames.length - 1] = {
    ...frames[frames.length - 1],
    event: "miss",
  };
  return {
    result: {
      outcome: "miss",
      terminalReason: "timeout",
      bounceCount,
      terminalTick: ORACLE.MAX_TICKS,
      frames,
    },
    exactEvents,
    initialVelocity: [
      Number(oracleRoundEven(vxProduct, ORACLE_Q)),
      Number(-oracleRoundEven(vyProduct, ORACLE_Q)),
    ],
  };
}

test("simulateShot 拒绝非法索引并返回冻结、逐 tick 的规则 frames", () => {
  for (const args of [
    [],
    [0],
    [-1, 0],
    [11, 0],
    [0, -1],
    [0, 9],
    ["0", 0],
    [0, "0"],
    [0.5, 0],
    [0, 0.5],
  ]) {
    assert.equal(logic.simulateShot(...args), null);
  }

  const shot = logic.simulateShot(4, 6);
  assertDeepFrozen(shot);
  assert.equal(shot.frames[0].tick, 0);
  assert.equal(shot.frames[0].event, "launch");
  assert.equal(shot.frames.length, shot.terminalTick + 1);
  assert.equal(shot.frames.at(-1).event, "hit");
  assert.equal(
    shot.frames.every((frame, index) => frame.tick === index),
    true,
  );
});

test("独立 BigInt oracle 冻结 99 组合矩阵、计数、198 镜像与 headroom", (t) => {
  const expectedRows = [
    "SSSSSBBBB",
    "SSSBBBBBD",
    "SSBBBBBDD",
    "SSBBBBDDD",
    "SBBBBDDDX",
    "SBBBBDDDX",
    "SBBBBDDXX",
    "SBBBBDDDX",
    "SSBBBBDDX",
    "SSSBBBDDD",
    "SSSSBBBBD",
  ];
  const counts = {
    "direct-hit": 0,
    "bounce-hit": 0,
    "second-ground": 0,
    "horizontal-exit": 0,
    "top-exit": 0,
    timeout: 0,
  };
  const rows = [];
  const metrics = createOracleMetrics();
  let mirrorFixtureCount = 0;
  let slowest = null;

  for (let angleIndex = 0; angleIndex < 11; angleIndex += 1) {
    let row = "";
    for (let powerIndex = 0; powerIndex < 9; powerIndex += 1) {
      const expected = oracleShot(angleIndex, powerIndex, metrics).result;
      const actual = logic.simulateShot(angleIndex, powerIndex);
      assert.deepEqual(actual, expected, `shot ${angleIndex}/${powerIndex}`);
      counts[expected.terminalReason === "castle"
        ? expected.outcome
        : expected.terminalReason] += 1;
      row += expected.outcome === "direct-hit"
        ? "D"
        : expected.outcome === "bounce-hit"
          ? "B"
          : expected.terminalReason === "second-ground" ? "S" : "X";

      if (!slowest || expected.terminalTick > slowest.terminalTick) {
        slowest = { angleIndex, powerIndex, terminalTick: expected.terminalTick };
      }

      for (const seat of [0, 1]) {
        for (const frame of expected.frames) {
          const displayedXQ = logic.mirrorXQ(frame.xQ, seat);
          assert.notEqual(displayedXQ, null);
          if (seat === 0) {
            assert.equal(displayedXQ, frame.xQ);
          } else {
            assert.equal(displayedXQ + frame.xQ, 3932160);
          }
        }
        mirrorFixtureCount += 1;
      }
    }
    rows.push(row);
  }

  assert.deepEqual(rows, expectedRows);
  assert.deepEqual(counts, {
    "direct-hit": 23,
    "bounce-hit": 45,
    "second-ground": 25,
    "horizontal-exit": 6,
    "top-exit": 0,
    timeout: 0,
  });
  assert.equal(mirrorFixtureCount, 198);
  assert.deepEqual(slowest, {
    angleIndex: 10,
    powerIndex: 4,
    terminalTick: 181,
  });
  assert.equal(metrics.maxPreEventXQ, 3897236n);
  assert.equal(metrics.maxTerminalXQ, 3899392n);
  assert.equal(metrics.maxYQ, 1933312n);
  assert.equal(metrics.maxVxQ, 47472n);
  assert.equal(metrics.maxVyQ, 46272n);
  assert.equal(metrics.maxInitialProduct, 194445312n);
  assert.equal(metrics.maxIntermediate, 130407923712n);
  assert.ok(metrics.maxIntermediate < BigInt(Number.MAX_SAFE_INTEGER));
  t.diagnostic(
    `canonical=99, mirrored=${mirrorFixtureCount}, `
      + `D/B/S/X=${counts["direct-hit"]}/${counts["bounce-hit"]}/`
      + `${counts["second-ground"]}/${counts["horizontal-exit"]}`,
  );
});

test("五条 golden 轨迹冻结 candidateVy 反弹时点与精确事件分数", () => {
  const fixtures = [
    {
      angleIndex: 4,
      powerIndex: 0,
      initialVelocity: [26840, -18792],
      outcome: "miss",
      reason: "second-ground",
      terminalTick: 110,
      events: [
        [70, "ground", 1649, 3251],
        [110, "ground", 1989, 3149],
      ],
    },
    {
      angleIndex: 4,
      powerIndex: 4,
      initialVelocity: [33550, -23490],
      outcome: "bounce-hit",
      reason: "castle",
      terminalTick: 88,
      events: [
        [83, "ground", 5202, 14815],
        [88, "castle", 1836, 12581],
      ],
    },
    {
      angleIndex: 4,
      powerIndex: 6,
      initialVelocity: [36905, -25839],
      outcome: "direct-hit",
      reason: "castle",
      terminalTick: 78,
      events: [[78, "castle", 5103, 7381]],
    },
    {
      angleIndex: 4,
      powerIndex: 8,
      initialVelocity: [40260, -28188],
      outcome: "miss",
      reason: "horizontal-exit",
      terminalTick: 86,
      events: [[86, "horizontal-exit", 49, 915]],
    },
    {
      angleIndex: 10,
      powerIndex: 4,
      initialVelocity: [17310, -37120],
      outcome: "bounce-hit",
      reason: "castle",
      terminalTick: 181,
      events: [
        [122, "ground", 233, 320],
        [181, "castle", 3565, 6491],
      ],
    },
  ];

  for (const fixture of fixtures) {
    const oracle = oracleShot(fixture.angleIndex, fixture.powerIndex);
    const actual = logic.simulateShot(fixture.angleIndex, fixture.powerIndex);
    assert.deepEqual(oracle.initialVelocity, fixture.initialVelocity);
    assert.equal(actual.outcome, fixture.outcome);
    assert.equal(actual.terminalReason, fixture.reason);
    assert.equal(actual.terminalTick, fixture.terminalTick);
    assert.deepEqual(
      oracle.exactEvents.map((event) => [
        event.tick,
        event.type,
        event.t.numerator,
        event.t.denominator,
      ]),
      fixture.events,
    );
  }

  const bounce = logic.simulateShot(4, 4);
  assert.deepEqual(bounce.frames[83], {
    tick: 83,
    xQ: 3238016,
    yQ: 1933312,
    event: "bounce",
  });
  assert.deepEqual(bounce.frames[84], {
    tick: 84,
    xQ: 3263178,
    yQ: 1919137,
    event: "flight",
  });
});

const STATE_KEYS = [
  "phase",
  "revision",
  "openingSeat",
  "round",
  "firstSeat",
  "activeSeat",
  "sealedAims",
  "shotResults",
  "flightSeat",
  "flightToken",
  "scores",
  "history",
  "winner",
  "drawReason",
  "config",
];

const PUBLIC_KEYS = [
  "phase",
  "revision",
  "round",
  "maxRounds",
  "firstSeat",
  "activeSeat",
  "lockedCount",
  "players",
  "targetScore",
  "history",
  "revealedShots",
  "currentFlight",
  "roundResult",
  "finalResult",
  "controls",
  "copy",
];

const CONTROL_KEYS = [
  "canStart",
  "canTakeOver",
  "canLockAim",
  "canBeginReveal",
  "canCompleteFlight",
  "canNextRound",
  "canRestart",
];

const COPY_KEYS = ["eyebrow", "title", "status", "instruction", "live"];
const HIT_AIM = Object.freeze({ angleIndex: 4, powerIndex: 6 });
const BOUNCE_AIM = Object.freeze({ angleIndex: 4, powerIndex: 4 });
const MISS_AIM = Object.freeze({ angleIndex: 4, powerIndex: 0 });

function assertExactKeys(value, keys) {
  assert.deepEqual(Object.keys(value), keys);
  assert.deepEqual(Reflect.ownKeys(value), keys);
}

function assertExactPair(value) {
  assert.equal(Array.isArray(value), true);
  assert.deepEqual(Object.keys(value), ["0", "1"]);
  assert.deepEqual(Reflect.ownKeys(value), ["0", "1", "length"]);
  assert.equal(value.length, 2);
}

function accept(state, type, fields = {}) {
  const next = logic.reduce(state, {
    type,
    ...fields,
    expectedRevision: state.revision,
  });
  assert.notStrictEqual(next, state, `${type} should be accepted from ${state.phase}`);
  assert.equal(next.revision, state.revision + 1);
  assertExactKeys(next, STATE_KEYS);
  assertDeepFrozen(next);
  return next;
}

function startIfNeeded(state) {
  return state.phase === "intro" ? accept(state, "START") : state;
}

function lockCurrent(state, aim) {
  const aiming = accept(state, "TAKE_OVER", { seat: state.activeSeat });
  return accept(aiming, "LOCK_AIM", {
    seat: aiming.activeSeat,
    angleIndex: aim.angleIndex,
    powerIndex: aim.powerIndex,
  });
}

function prepareReveal(state, aimsBySeat) {
  let next = startIfNeeded(state);
  next = lockCurrent(next, aimsBySeat[next.activeSeat]);
  next = lockCurrent(next, aimsBySeat[next.activeSeat]);
  assert.equal(next.phase, "reveal-ready");
  return next;
}

function beginReveal(state) {
  const flying = accept(state, "BEGIN_REVEAL");
  assert.equal(flying.flightToken, flying.revision);
  return flying;
}

function completeFlight(state) {
  return accept(state, "COMPLETE_FLIGHT", { shotToken: state.flightToken });
}

function settleRound(state, aimsBySeat) {
  let next = beginReveal(prepareReveal(state, aimsBySeat));
  next = completeFlight(next);
  return completeFlight(next);
}

function nextRound(state) {
  return accept(state, "NEXT_ROUND");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasDeepKey(value, searched, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Object.hasOwn(value, searched)) return true;
  return Reflect.ownKeys(value).some((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, "value")
      && hasDeepKey(descriptor.value, searched, seen);
  });
}

function assertPublicEnvelope(view, phase, enabledControl) {
  assertExactKeys(view, PUBLIC_KEYS);
  assert.equal(view.phase, phase);
  assert.equal(view.maxRounds, 12);
  assert.equal(view.targetScore, 3);
  assertExactPair(view.players);
  assert.deepEqual(Object.keys(view.players[0]), ["seat", "name", "score"]);
  assert.deepEqual(Object.keys(view.players[1]), ["seat", "name", "score"]);
  assertExactKeys(view.controls, CONTROL_KEYS);
  assertExactKeys(view.copy, COPY_KEYS);
  for (const key of CONTROL_KEYS) {
    assert.equal(view.controls[key], key === enabledControl);
  }
  for (const key of COPY_KEYS) {
    assert.equal(typeof view.copy[key], "string");
    assert.ok(view.copy[key].trim().length > 0);
    assert.match(view.copy[key], /[\u3400-\u9fff]/u);
  }
  for (const authorityKey of [
    "openingSeat",
    "sealedAims",
    "shotResults",
    "flightSeat",
    "flightToken",
    "config",
  ]) {
    assert.equal(hasDeepKey(view, authorityKey), false);
  }
  assertDeepFrozen(view);
}

function assertPublicAim(aim, expected) {
  assertExactKeys(aim, ["angleIndex", "angleDegrees", "powerIndex", "power2"]);
  assert.equal(aim.angleIndex, expected.angleIndex);
  assert.equal(aim.angleDegrees, logic.ANGLE_DEGREES[expected.angleIndex]);
  assert.equal(aim.powerIndex, expected.powerIndex);
  assert.equal(aim.power2, logic.POWER2_VALUES[expected.powerIndex]);
}

function assertPublicShot(shot, seat, aim) {
  assertExactKeys(shot, [
    "seat",
    "aim",
    "outcome",
    "terminalReason",
    "bounceCount",
    "terminalTick",
  ]);
  assert.equal(shot.seat, seat);
  assertPublicAim(shot.aim, aim);
  const expected = logic.simulateShot(aim.angleIndex, aim.powerIndex);
  assert.equal(shot.outcome, expected.outcome);
  assert.equal(shot.terminalReason, expected.terminalReason);
  assert.equal(shot.bounceCount, expected.bounceCount);
  assert.equal(shot.terminalTick, expected.terminalTick);
}

function assertPublicRound(summary, expectedRound, aimsBySeat, scoresAfter) {
  assertExactKeys(summary, [
    "round",
    "firstSeat",
    "shots",
    "roundHits",
    "scoresAfter",
  ]);
  assert.equal(summary.round, expectedRound);
  assertExactPair(summary.shots);
  assertPublicShot(summary.shots[0], 0, aimsBySeat[0]);
  assertPublicShot(summary.shots[1], 1, aimsBySeat[1]);
  assertExactPair(summary.roundHits);
  assertExactPair(summary.scoresAfter);
  assert.deepEqual(summary.scoresAfter, scoresAfter);
}

test("config.js 与 sanitizeConfig 执行 exact、规范化、断引用和 hostile 回退", () => {
  const editable = require("./config.js");
  assert.deepEqual(editable, { playerNames: ["你", "TA"] });
  assertExactKeys(editable, ["playerNames"]);
  assertExactPair(editable.playerNames);
  assert.equal(Object.isFrozen(editable), false);

  const browserContext = vm.createContext({});
  vm.runInContext(
    readFileSync(path.join(__dirname, "config.js"), "utf8"),
    browserContext,
    { filename: "config.js" },
  );
  assert.deepEqual(
    Array.from(browserContext.HEART_CATAPULT_CONFIG.playerNames),
    ["你", "TA"],
  );

  const raw = { playerNames: ["  A\u0301   B  ", " 小  熊 "] };
  const sanitized = logic.sanitizeConfig(raw);
  assert.deepEqual(sanitized, { playerNames: ["Á B", "小 熊"] });
  assert.notStrictEqual(sanitized, raw);
  assert.notStrictEqual(sanitized.playerNames, raw.playerNames);
  assertDeepFrozen(sanitized);
  raw.playerNames[0] = "changed";
  assert.equal(sanitized.playerNames[0], "Á B");

  const second = logic.sanitizeConfig({ playerNames: ["Á B", "小 熊"] });
  assert.deepEqual(second, sanitized);
  assert.notStrictEqual(second, sanitized);
  assert.notStrictEqual(second.playerNames, sanitized.playerNames);

  const hole = [];
  hole.length = 2;
  hole[1] = "TA";
  const extraArray = ["你", "TA"];
  extraArray.extra = true;
  const symbolRecord = { playerNames: ["你", "TA"] };
  symbolRecord[Symbol("extra")] = true;
  const customRecord = Object.create({ inherited: true });
  customRecord.playerNames = ["你", "TA"];
  const customArray = ["你", "TA"];
  Object.setPrototypeOf(customArray, {});

  for (const hostile of [
    null,
    [],
    {},
    { playerNames: ["only"] },
    { playerNames: ["你", "TA"], extra: true },
    { playerNames: hole },
    { playerNames: extraArray },
    { playerNames: customArray },
    customRecord,
    symbolRecord,
    { playerNames: ["", "TA"] },
    { playerNames: ["1234567890123", "TA"] },
    { playerNames: ["😀😀😀😀😀😀😀😀😀😀😀😀😀", "TA"] },
    { playerNames: ["你", "你"] },
    { playerNames: [" A ", "A"] },
    { playerNames: ["你\u0000", "TA"] },
    { playerNames: ["你\u202e", "TA"] },
    { playerNames: ["\ud800", "TA"] },
    { playerNames: [1, "TA"] },
  ]) {
    const fallback = logic.sanitizeConfig(hostile);
    assert.deepEqual(fallback, { playerNames: ["你", "TA"] });
    assert.notStrictEqual(fallback, logic.DEFAULT_CONFIG);
    assert.notStrictEqual(fallback.playerNames, logic.DEFAULT_CONFIG.playerNames);
    assertDeepFrozen(fallback);
  }

  let getterRuns = 0;
  const accessor = {};
  Object.defineProperty(accessor, "playerNames", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return ["你", "TA"];
    },
  });
  assert.deepEqual(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);
  assert.equal(getterRuns, 0);

  const throwing = new Proxy({ playerNames: ["你", "TA"] }, {
    ownKeys() {
      throw new Error("must be contained");
    },
  });
  assert.doesNotThrow(() => logic.sanitizeConfig(throwing));
  assert.deepEqual(logic.sanitizeConfig(throwing), logic.DEFAULT_CONFIG);
});

test("createInitialState 生成 exact 初态并贯穿所有 phase 私有不变量", () => {
  const initial = logic.createInitialState({
    playerNames: [" 红 方 ", "蓝   方"],
  });
  assertExactKeys(initial, STATE_KEYS);
  assert.deepEqual(initial, {
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
    config: { playerNames: ["红 方", "蓝 方"] },
  });
  assertDeepFrozen(initial);

  const phases = [initial];
  let state = accept(initial, "START");
  phases.push(state);
  assert.equal(state.activeSeat, state.firstSeat);
  state = accept(state, "TAKE_OVER", { seat: state.activeSeat });
  phases.push(state);
  state = accept(state, "LOCK_AIM", {
    seat: state.activeSeat,
    angleIndex: HIT_AIM.angleIndex,
    powerIndex: HIT_AIM.powerIndex,
  });
  phases.push(state);
  assert.deepEqual(state.sealedAims, [HIT_AIM, null]);
  state = accept(state, "TAKE_OVER", { seat: state.activeSeat });
  phases.push(state);
  state = accept(state, "LOCK_AIM", {
    seat: state.activeSeat,
    angleIndex: MISS_AIM.angleIndex,
    powerIndex: MISS_AIM.powerIndex,
  });
  phases.push(state);
  assert.equal(state.phase, "reveal-ready");
  assert.deepEqual(state.sealedAims, [HIT_AIM, MISS_AIM]);
  assert.deepEqual(state.shotResults, [
    logic.simulateShot(HIT_AIM.angleIndex, HIT_AIM.powerIndex),
    logic.simulateShot(MISS_AIM.angleIndex, MISS_AIM.powerIndex),
  ]);

  state = beginReveal(state);
  phases.push(state);
  assert.equal(state.flightSeat, 0);
  const beforeFirstScores = state.scores;
  const beforeFirstHistory = state.history;
  state = completeFlight(state);
  phases.push(state);
  assert.equal(state.phase, "flying");
  assert.equal(state.flightSeat, 1);
  assert.deepEqual(state.scores, beforeFirstScores);
  assert.deepEqual(state.history, beforeFirstHistory);
  assert.deepEqual(state.scores, [0, 0]);
  assert.deepEqual(state.history, []);

  state = completeFlight(state);
  phases.push(state);
  assert.equal(state.phase, "round-result");
  assert.deepEqual(state.scores, [1, 0]);
  assert.equal(state.history.length, 1);
  assert.deepEqual(state.sealedAims, [null, null]);
  assert.equal(state.shotResults, null);
  assert.equal(state.flightSeat, null);
  assert.equal(state.flightToken, null);
  assert.equal(state.history[0].round, 1);
  assert.equal(state.history[0].firstSeat, 0);
  assert.deepEqual(state.history[0].aims, [HIT_AIM, MISS_AIM]);
  assert.equal(hasDeepKey(state.history[0], "frames"), false);
  assert.deepEqual(state.history[0].roundHits, [1, 0]);
  assert.deepEqual(state.history[0].scoresAfter, [1, 0]);

  state = nextRound(state);
  phases.push(state);
  assert.equal(state.phase, "handoff");
  assert.equal(state.round, 2);
  assert.equal(state.firstSeat, 1);
  assert.equal(state.activeSeat, 1);
  assert.equal(state.history.length, 1);

  for (const phaseState of phases) {
    assertExactKeys(phaseState, STATE_KEYS);
    assertDeepFrozen(phaseState);
    assert.equal(
      phaseState.firstSeat,
      (phaseState.openingSeat + phaseState.round - 1) % 2,
    );
  }
});

test("reducer 对 exact action、错席、stale revision、旧 token 与 hostile 输入同引用 no-op", () => {
  const intro = logic.createInitialState();
  const handoff = accept(intro, "START");

  const invalidActions = [
    null,
    [],
    {},
    { type: "UNKNOWN", expectedRevision: handoff.revision },
    { type: "TAKE_OVER", seat: 0 },
    {
      type: "TAKE_OVER",
      seat: handoff.activeSeat,
      expectedRevision: handoff.revision,
      extra: true,
    },
    {
      type: "TAKE_OVER",
      seat: 1 - handoff.activeSeat,
      expectedRevision: handoff.revision,
    },
    {
      type: "TAKE_OVER",
      seat: handoff.activeSeat,
      expectedRevision: handoff.revision - 1,
    },
    {
      type: "TAKE_OVER",
      seat: String(handoff.activeSeat),
      expectedRevision: handoff.revision,
    },
    Object.assign(Object.create({}), {
      type: "TAKE_OVER",
      seat: handoff.activeSeat,
      expectedRevision: handoff.revision,
    }),
    new String("TAKE_OVER"),
  ];
  const symbolAction = {
    type: "TAKE_OVER",
    seat: handoff.activeSeat,
    expectedRevision: handoff.revision,
  };
  symbolAction[Symbol("extra")] = true;
  invalidActions.push(symbolAction);
  for (const action of invalidActions) {
    assert.strictEqual(logic.reduce(handoff, action), handoff);
  }
  assert.strictEqual(
    logic.reduce(handoff, {
      type: "LOCK_AIM",
      seat: handoff.activeSeat,
      angleIndex: 4,
      powerIndex: 4,
      expectedRevision: handoff.revision,
    }),
    handoff,
  );
  const aiming = accept(handoff, "TAKE_OVER", { seat: handoff.activeSeat });
  assert.strictEqual(
    logic.reduce(aiming, {
      type: "LOCK_AIM",
      seat: 1 - aiming.activeSeat,
      angleIndex: 4,
      powerIndex: 4,
      expectedRevision: aiming.revision,
    }),
    aiming,
  );

  let getterRuns = 0;
  const accessorAction = {
    seat: handoff.activeSeat,
    expectedRevision: handoff.revision,
  };
  Object.defineProperty(accessorAction, "type", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return "TAKE_OVER";
    },
  });
  assert.strictEqual(logic.reduce(handoff, accessorAction), handoff);
  assert.equal(getterRuns, 0);
  const throwingAction = new Proxy({}, {
    ownKeys() {
      throw new Error("must be contained");
    },
  });
  assert.doesNotThrow(() => logic.reduce(handoff, throwingAction));
  assert.strictEqual(logic.reduce(handoff, throwingAction), handoff);

  let flying = beginReveal(prepareReveal(handoff, [HIT_AIM, MISS_AIM]));
  const firstToken = flying.flightToken;
  assert.strictEqual(
    logic.reduce(flying, {
      type: "COMPLETE_FLIGHT",
      shotToken: firstToken - 1,
      expectedRevision: flying.revision,
    }),
    flying,
  );
  flying = completeFlight(flying);
  assert.notEqual(flying.flightToken, firstToken);
  assert.strictEqual(
    logic.reduce(flying, {
      type: "COMPLETE_FLIGHT",
      shotToken: firstToken,
      expectedRevision: flying.revision,
    }),
    flying,
  );
});

test("第二发才联合计分，达到目标但平分则延长，领先者胜出", () => {
  let state = logic.createInitialState();
  const bothHit = [HIT_AIM, HIT_AIM];

  for (let round = 1; round <= 3; round += 1) {
    let flying = beginReveal(prepareReveal(state, bothHit));
    const scoresBefore = flying.scores;
    const historyBefore = flying.history;
    flying = completeFlight(flying);
    assert.deepEqual(flying.scores, scoresBefore);
    assert.deepEqual(flying.history, historyBefore);
    state = completeFlight(flying);
    assert.deepEqual(state.scores, [round, round]);
    assert.equal(state.phase, "round-result");
    assert.equal(state.winner, null);
    assert.equal(state.drawReason, null);
    if (round < 3) state = nextRound(state);
  }

  state = nextRound(state);
  state = settleRound(state, [HIT_AIM, MISS_AIM]);
  assert.equal(state.phase, "complete");
  assert.equal(state.winner, 0);
  assert.equal(state.drawReason, null);
  assert.deepEqual(state.scores, [4, 3]);
  assert.equal(state.history.length, 4);
  assert.deepEqual(state.history.map((entry) => entry.firstSeat), [0, 1, 0, 1]);
  assertDeepFrozen(state);
});

test("第 12 个完整轮仍无领先达标者时 round-cap 平局", () => {
  let state = logic.createInitialState({ playerNames: ["甲", "乙"] });
  for (let round = 1; round <= 12; round += 1) {
    state = settleRound(state, [MISS_AIM, MISS_AIM]);
    if (round < 12) {
      assert.equal(state.phase, "round-result");
      state = nextRound(state);
    }
  }
  assert.equal(state.phase, "complete");
  assert.equal(state.round, 12);
  assert.equal(state.winner, null);
  assert.equal(state.drawReason, "round-cap");
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(state.history.length, 12);
  assert.deepEqual(
    state.history.map((entry) => entry.firstSeat),
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  );
});

test("history 可从 JSON clone 重放，任何派生字段篡改或 hostile state 都重置", () => {
  const settled = settleRound(logic.createInitialState(), [BOUNCE_AIM, MISS_AIM]);
  const cloned = cloneJson(settled);
  const continued = logic.reduce(cloned, {
    type: "NEXT_ROUND",
    expectedRevision: cloned.revision,
  });
  assert.equal(continued.phase, "handoff");
  assert.equal(continued.round, 2);
  assertDeepFrozen(continued);

  function assertMalformed(mutator) {
    const malformed = cloneJson(settled);
    mutator(malformed);
    assert.equal(logic.getPublicView(malformed), null);
    const reset = logic.reduce(malformed, {
      type: "NEXT_ROUND",
      expectedRevision: malformed.revision,
    });
    assert.notStrictEqual(reset, malformed);
    assert.deepEqual(reset, logic.createInitialState());
    assertDeepFrozen(reset);
  }

  assertMalformed((state) => {
    state.history[0].outcomes[0].terminalTick += 1;
  });
  assertMalformed((state) => {
    state.history[0].outcomes[1].outcome = "direct-hit";
  });
  assertMalformed((state) => {
    state.history[0].scoresAfter[0] += 1;
  });
  assertMalformed((state) => {
    state.history[0].aims[0].powerIndex += 1;
  });
  assertMalformed((state) => {
    state.history[0].firstSeat = 1;
  });
  assertMalformed((state) => {
    state.scores[0] += 1;
  });
  assertMalformed((state) => {
    state.history[0].extra = true;
  });

  const secondRound = settleRound(nextRound(settled), [MISS_AIM, BOUNCE_AIM]);
  const reordered = cloneJson(secondRound);
  [reordered.history[0], reordered.history[1]] = [
    reordered.history[1],
    reordered.history[0],
  ];
  assert.equal(logic.getPublicView(reordered), null);
  assert.deepEqual(
    logic.reduce(reordered, {
      type: "NEXT_ROUND",
      expectedRevision: reordered.revision,
    }),
    logic.createInitialState(),
  );

  let actionReads = 0;
  const malformed = cloneJson(settled);
  malformed.phase = "aiming";
  const unreadableAction = {};
  Object.defineProperty(unreadableAction, "type", {
    enumerable: true,
    get() {
      actionReads += 1;
      return "NEXT_ROUND";
    },
  });
  const reset = logic.reduce(malformed, unreadableAction);
  assert.equal(actionReads, 0);
  assert.deepEqual(reset, logic.createInitialState());

  let stateReads = 0;
  const hostileState = new Proxy({}, {
    ownKeys() {
      stateReads += 1;
      throw new Error("must be contained");
    },
  });
  assert.doesNotThrow(() => logic.reduce(hostileState, unreadableAction));
  assert.equal(actionReads, 0);
  assert.ok(stateReads > 0);
  assert.deepEqual(logic.reduce(hostileState, unreadableAction), logic.createInitialState());
  assert.equal(logic.getPublicView(hostileState), null);
});

test("revision 96-action headroom 与 RESTART 边界保持 safe integer", () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  const boundaryIntro = cloneJson(logic.createInitialState());
  boundaryIntro.revision = maximum - 96;
  const handoff = logic.reduce(boundaryIntro, {
    type: "START",
    expectedRevision: boundaryIntro.revision,
  });
  assert.equal(handoff.phase, "handoff");
  assert.equal(handoff.revision, maximum - 95);

  const invalidIntro = cloneJson(logic.createInitialState());
  invalidIntro.revision = maximum - 95;
  const reset = logic.reduce(invalidIntro, {
    type: "START",
    expectedRevision: invalidIntro.revision,
  });
  assert.deepEqual(reset, logic.createInitialState());

  let complete = logic.createInitialState({ playerNames: ["甲", "乙"] });
  for (let round = 1; round <= 4; round += 1) {
    const aims = round < 4 ? [HIT_AIM, HIT_AIM] : [HIT_AIM, MISS_AIM];
    complete = settleRound(complete, aims);
    if (round < 4) complete = nextRound(complete);
  }
  assert.equal(complete.phase, "complete");

  const restartable = cloneJson(complete);
  restartable.revision = maximum - 97;
  const restarted = logic.reduce(restartable, {
    type: "RESTART",
    expectedRevision: restartable.revision,
  });
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.revision, maximum - 96);
  assert.equal(restarted.openingSeat, 1 - restartable.openingSeat);
  assert.equal(restarted.firstSeat, restarted.openingSeat);
  assert.deepEqual(restarted.config, restartable.config);

  const blocked = cloneJson(complete);
  blocked.revision = maximum - 96;
  assert.strictEqual(
    logic.reduce(blocked, {
      type: "RESTART",
      expectedRevision: blocked.revision,
    }),
    blocked,
  );
});

test("getPublicView 对每个 phase 输出 exact DTO，并按飞行顺序逐步解密", () => {
  const states = {};
  states.intro = logic.createInitialState({ playerNames: ["红方", "蓝方"] });
  states.handoffFirst = accept(states.intro, "START");
  states.aimingFirst = accept(states.handoffFirst, "TAKE_OVER", { seat: 0 });
  states.handoffSecond = accept(states.aimingFirst, "LOCK_AIM", {
    seat: 0,
    angleIndex: 10,
    powerIndex: 8,
  });
  states.aimingSecond = accept(states.handoffSecond, "TAKE_OVER", { seat: 1 });
  states.revealReady = accept(states.aimingSecond, "LOCK_AIM", {
    seat: 1,
    angleIndex: 9,
    powerIndex: 7,
  });
  states.flyingFirst = beginReveal(states.revealReady);
  states.flyingSecond = completeFlight(states.flyingFirst);
  states.roundResult = completeFlight(states.flyingSecond);

  const phaseCases = [
    [states.intro, "canStart", 0],
    [states.handoffFirst, "canTakeOver", 0],
    [states.aimingFirst, "canLockAim", 0],
    [states.handoffSecond, "canTakeOver", 1],
    [states.aimingSecond, "canLockAim", 1],
    [states.revealReady, "canBeginReveal", 2],
    [states.flyingFirst, "canCompleteFlight", 2],
    [states.flyingSecond, "canCompleteFlight", 2],
    [states.roundResult, "canNextRound", 0],
  ];
  for (const [state, enabledControl, lockedCount] of phaseCases) {
    const first = logic.getPublicView(state);
    const second = logic.getPublicView(state);
    assertPublicEnvelope(first, state.phase, enabledControl);
    assert.equal(first.lockedCount, lockedCount);
    assert.deepEqual(first, second);
    assert.notStrictEqual(first, second);
    assert.notStrictEqual(first.players, second.players);
  }

  for (const key of [
    "intro",
    "handoffFirst",
    "aimingFirst",
    "handoffSecond",
    "aimingSecond",
    "revealReady",
  ]) {
    const view = logic.getPublicView(states[key]);
    assert.deepEqual(view.revealedShots, []);
    assert.equal(view.currentFlight, null);
    assert.equal(view.roundResult, null);
    assert.equal(view.finalResult, null);
    assert.equal(hasDeepKey(view, "aim"), false);
    assert.equal(hasDeepKey(view, "result"), false);
    assert.equal(hasDeepKey(view, "frames"), false);
  }
  assert.doesNotMatch(
    JSON.stringify(logic.getPublicView(states.revealReady)),
    /"angleIndex":(?:9|10)|"powerIndex":(?:7|8)/u,
  );

  const firstFlight = logic.getPublicView(states.flyingFirst);
  assert.deepEqual(firstFlight.revealedShots, []);
  assertExactKeys(firstFlight.currentFlight, ["seat", "token", "aim", "result", "frames"]);
  assert.equal(firstFlight.currentFlight.seat, 0);
  assert.equal(firstFlight.currentFlight.token, states.flyingFirst.flightToken);
  assertPublicAim(firstFlight.currentFlight.aim, { angleIndex: 10, powerIndex: 8 });
  assertExactKeys(firstFlight.currentFlight.result, [
    "outcome",
    "terminalReason",
    "bounceCount",
    "terminalTick",
  ]);
  assert.ok(firstFlight.currentFlight.frames.length > 1);
  for (const frame of firstFlight.currentFlight.frames) {
    assertExactKeys(frame, ["tick", "xQ", "yQ", "event"]);
  }
  assert.doesNotMatch(
    JSON.stringify(firstFlight),
    /"angleIndex":9|"powerIndex":7/u,
  );

  const secondFlight = logic.getPublicView(states.flyingSecond);
  assert.equal(secondFlight.revealedShots.length, 1);
  assertPublicShot(secondFlight.revealedShots[0], 0, { angleIndex: 10, powerIndex: 8 });
  assert.equal(hasDeepKey(secondFlight.revealedShots[0], "frames"), false);
  assert.equal(secondFlight.currentFlight.seat, 1);
  assertPublicAim(secondFlight.currentFlight.aim, { angleIndex: 9, powerIndex: 7 });
  const localSecond = logic.simulateShot(9, 7);
  assert.equal(
    secondFlight.currentFlight.frames.every(
      (frame, index) => frame.xQ === logic.mirrorXQ(localSecond.frames[index].xQ, 1),
    ),
    true,
  );

  const resultView = logic.getPublicView(states.roundResult);
  assert.deepEqual(resultView.revealedShots, []);
  assert.equal(resultView.currentFlight, null);
  assert.equal(resultView.finalResult, null);
  assertPublicRound(
    resultView.roundResult,
    1,
    [{ angleIndex: 10, powerIndex: 8 }, { angleIndex: 9, powerIndex: 7 }],
    states.roundResult.scores,
  );
  assert.equal(hasDeepKey(resultView.roundResult, "frames"), false);
});

test("complete public DTO 只公开历史和 finalResult，hostile state 返回 null", () => {
  let complete = logic.createInitialState({ playerNames: ["甲", "乙"] });
  for (let round = 1; round <= 4; round += 1) {
    complete = settleRound(
      complete,
      round < 4 ? [HIT_AIM, HIT_AIM] : [HIT_AIM, MISS_AIM],
    );
    if (round < 4) complete = nextRound(complete);
  }
  const view = logic.getPublicView(complete);
  assertPublicEnvelope(view, "complete", "canRestart");
  assert.equal(view.lockedCount, 0);
  assert.deepEqual(view.revealedShots, []);
  assert.equal(view.currentFlight, null);
  assert.equal(view.roundResult, null);
  assertExactKeys(view.finalResult, ["winner", "drawReason", "scores"]);
  assert.equal(view.finalResult.winner, 0);
  assert.equal(view.finalResult.drawReason, null);
  assert.deepEqual(view.finalResult.scores, [4, 3]);
  assertExactPair(view.finalResult.scores);
  assert.equal(view.history.length, 4);
  assert.equal(hasDeepKey(view.history, "frames"), false);

  for (const summary of view.history) {
    assertExactKeys(summary, [
      "round",
      "firstSeat",
      "shots",
      "roundHits",
      "scoresAfter",
    ]);
  }

  const malformed = cloneJson(complete);
  malformed.finalSecret = true;
  assert.equal(logic.getPublicView(malformed), null);

  let getterRuns = 0;
  const accessor = {};
  Object.defineProperty(accessor, "phase", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return "complete";
    },
  });
  assert.equal(logic.getPublicView(accessor), null);
  assert.equal(getterRuns, 0);
  assert.equal(logic.getPublicView(null), null);
  assert.equal(logic.getPublicView([]), null);
});
