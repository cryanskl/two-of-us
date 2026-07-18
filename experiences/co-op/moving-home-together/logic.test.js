import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("./config.js");
await import("./logic.js");

const config = globalThis.MOVING_HOME_TOGETHER_CONFIG;
const logic = globalThis.MOVING_HOME_TOGETHER_LOGIC;

function reduceAll(actions, initial = logic.createMovingHomeState()) {
  return actions.reduce((state, action) => logic.reduceMovingHome(state, action), initial);
}

function startedState() {
  return logic.reduceMovingHome(logic.createMovingHomeState(), { type: "START" });
}

function setPair(state, left, right) {
  return reduceAll([
    { type: "SET_INPUT", id: "left", side: "left", ...left },
    { type: "SET_INPUT", id: "right", side: "right", ...right },
  ], state);
}

function tickMany(state, count) {
  let current = state;
  let remaining = count;
  while (remaining > 0) {
    const chunk = Math.min(logic.MAX_CATCH_UP_TICKS, remaining);
    current = logic.reduceMovingHome(current, { type: "TICK", count: chunk });
    remaining -= chunk;
  }
  return current;
}

function validPlayingState(overrides = {}) {
  return { ...startedState(), ...overrides };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function buildGoldenReplay() {
  const actions = [{ type: "START" }];
  const input = (id, side, x, y) => actions.push({ type: "SET_INPUT", id, side, x, y });
  const ticks = (count) => {
    let remaining = count;
    while (remaining > 0) {
      const chunk = Math.min(5, remaining);
      actions.push({ type: "TICK", count: chunk });
      remaining -= chunk;
    }
  };
  const release = () => actions.push({ type: "RELEASE_ALL_INPUTS" });

  input("left", "left", 1, 0); input("right", "right", 1, 0); ticks(155); release();
  input("left", "left", 0, -1); input("right", "right", 0, 1); ticks(32);
  input("left", "left", 1, 0); input("right", "right", -1, 0); ticks(32); release();
  input("left", "left", 0, -1); input("right", "right", 0, -1); ticks(179); release();
  input("left", "left", -1, 0); input("right", "right", 1, 0); ticks(32);
  input("left", "left", 0, 1); input("right", "right", 0, -1); ticks(32); release();
  input("left", "left", 1, 0); input("right", "right", 1, 0); ticks(160); release();
  ticks(12);
  return actions;
}

const GOLDEN_REPLAY = buildGoldenReplay();
const GOLDEN_BEFORE_HOLD = GOLDEN_REPLAY.slice(0, -3);

test("冻结常量与地图尺寸符合规格", () => {
  assert.deepEqual({
    width: logic.WORLD_WIDTH,
    height: logic.WORLD_HEIGHT,
    tick: logic.TICK_MS,
    gap: logic.MAX_FRAME_GAP_MS,
    catchUp: logic.MAX_CATCH_UP_TICKS,
    angles: logic.ANGLE_COUNT,
    scale: logic.ANGLE_SCALE,
    halfLength: logic.SOFA_HALF_LENGTH,
    halfDepth: logic.SOFA_HALF_DEPTH,
    collisionGap: logic.COLLISION_GAP,
    move: logic.MOVE_UNITS_PER_INTENT,
    turn: logic.TURN_THRESHOLD,
    hold: logic.GOAL_HOLD_TICKS,
  }, {
    width: 1000, height: 680, tick: 20, gap: 250, catchUp: 5, angles: 256, scale: 16384,
    halfLength: 110, halfDepth: 38, collisionGap: 2, move: 1, turn: 16384 ** 2, hold: 12,
  });
  assert.equal(logic.OBSTACLES.length, 6);
  assert.deepEqual(logic.GOAL, { left: 690, top: 90, right: 950, bottom: 230 });
});

test("256 项角度表逐项等于离线公式", () => {
  assert.equal(logic.ANGLE_TABLE.length, 256);
  for (let index = 0; index < 256; index += 1) {
    const cos = Math.round(Math.cos(index * Math.PI * 2 / 256) * 16384);
    const sin = Math.round(Math.sin(index * Math.PI * 2 / 256) * 16384);
    assert.deepEqual(logic.ANGLE_TABLE[index], {
      cos: Object.is(cos, -0) ? 0 : cos,
      sin: Object.is(sin, -0) ? 0 : sin,
    });
  }
  assert.equal(logic.validateAngleTable(structuredClone(logic.ANGLE_TABLE)), true);
});

test("生产逻辑不在运行时调用正弦或余弦", async () => {
  const source = await readFile(new URL("./logic.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Math\.(?:sin|cos)\s*\(/);
});

test("逻辑 API、地图与配置递归冻结", () => {
  assertDeepFrozen(logic);
  assertDeepFrozen(config);
});

test("地图校验接受深拷贝并拒绝任一参数漂移", () => {
  const obstacles = structuredClone(logic.OBSTACLES);
  const goal = structuredClone(logic.GOAL);
  assert.equal(logic.validateMovingHomeMap(obstacles, goal), true);
  obstacles[4].right += 1;
  assert.equal(logic.validateMovingHomeMap(obstacles, goal), false);
  assert.equal(logic.validateMovingHomeMap(structuredClone(logic.OBSTACLES), { ...goal, top: 91 }), false);
  assert.equal(logic.validateMovingHomeMap(structuredClone(logic.OBSTACLES), { ...goal, extra: true }), false);
});

test("配置默认值无需修改即可完整运行", () => {
  assert.deepEqual(logic.sanitizeMovingHomeConfig(), logic.DEFAULT_CONFIG);
  assert.equal(typeof config.composeMovingHomeMessage, "function");
  assert.equal(config.finalTitle, "家放稳了");
});

test("配置清洗去空白、按 Unicode 截断并为坏值回退", () => {
  const clean = logic.sanitizeMovingHomeConfig({
    leftName: "  一二三四五六七八九十甲乙丙  ",
    rightName: " ",
    intro: 42,
    finalTitle: "  我们到家啦  ",
    finalMessage: " 自定义结尾 ",
    signature: " 两个人 ",
  });
  assert.equal(clean.leftName, "一二三四五六七八九十甲乙");
  assert.equal(clean.rightName, logic.DEFAULT_CONFIG.rightName);
  assert.equal(clean.intro, logic.DEFAULT_CONFIG.intro);
  assert.equal(clean.finalTitle, "我们到家啦");
  assert.equal(clean.finalMessage, "自定义结尾");
  assert.equal(clean.signature, "两个人");
});

test("学习 TODO 的落款函数在路线前后都有完整默认结果", () => {
  assert.equal(config.composeMovingHomeMessage({ route: { stage: 0 }, names: { left: "甲", right: "乙" } }),
    "甲 和 乙 已经把家搬到第 1 段。");
  assert.equal(config.composeMovingHomeMessage({ route: { stage: 2 }, finalMessage: "到家了" }), "到家了");
  assert.equal(typeof config.composeMovingHomeMessage(null), "string");
});

test("初始状态精确、可序列化且递归冻结", () => {
  const state = logic.createMovingHomeState();
  assert.deepEqual(state, {
    tick: 0, phase: "intro", pauseReason: null, centerX: 190, centerY: 518, angleIndex: 0,
    heldInputs: [], routeStage: 0, collisionSerial: 0, lastCollisionObstacleId: null,
    insideGoalTicks: 0, completionTick: null, announcementSerial: 0,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  assertDeepFrozen(state);
});

const invalidActions = [
  ["null action", null],
  ["缺 type", {}],
  ["未知 type", { type: "TELEPORT" }],
  ["START 多字段", { type: "START", extra: true }],
  ["SET_INPUT 缺字段", { type: "SET_INPUT", id: "x", side: "left", x: 1 }],
  ["SET_INPUT 空 id", { type: "SET_INPUT", id: "", side: "left", x: 1, y: 0 }],
  ["SET_INPUT 错 side", { type: "SET_INPUT", id: "x", side: "middle", x: 1, y: 0 }],
  ["SET_INPUT x 越界", { type: "SET_INPUT", id: "x", side: "left", x: 2, y: 0 }],
  ["SET_INPUT y 非整数", { type: "SET_INPUT", id: "x", side: "left", x: 0, y: 0.5 }],
  ["SET_INPUT 零向量", { type: "SET_INPUT", id: "x", side: "left", x: 0, y: 0 }],
  ["SET_INPUT 多字段", { type: "SET_INPUT", id: "x", side: "left", x: 1, y: 0, extra: true }],
  ["RELEASE_INPUT 缺 id", { type: "RELEASE_INPUT" }],
  ["RELEASE_INPUT 多字段", { type: "RELEASE_INPUT", id: "x", extra: true }],
  ["TICK 为零", { type: "TICK", count: 0 }],
  ["TICK 超上限", { type: "TICK", count: 6 }],
  ["TICK 非整数", { type: "TICK", count: 1.5 }],
  ["TICK 多字段", { type: "TICK", count: 1, extra: true }],
  ["PAUSE 错原因", { type: "PAUSE", reason: "network" }],
  ["PAUSE 多字段", { type: "PAUSE", reason: "manual", extra: true }],
  ["RESUME 多字段", { type: "RESUME", extra: true }],
];

for (const [name, action] of invalidActions) {
  test(`非法 action 抛 TypeError：${name}`, () => {
    assert.throws(() => logic.reduceMovingHome(logic.createMovingHomeState(), action), TypeError);
  });
}

const keyCases = [
  ["KeyW", "left", 0, -1], ["KeyA", "left", -1, 0],
  ["KeyS", "left", 0, 1], ["KeyD", "left", 1, 0],
  ["ArrowUp", "right", 0, -1], ["ArrowLeft", "right", -1, 0],
  ["ArrowDown", "right", 0, 1], ["ArrowRight", "right", 1, 0],
];

for (const [code, side, x, y] of keyCases) {
  test(`键盘映射冻结：${code}`, () => {
    assert.deepEqual(logic.classifyMovingHomeKey(code, "down", false), {
      type: "SET_INPUT", id: `keyboard:${code}`, side, x, y,
    });
    assert.deepEqual(logic.classifyMovingHomeKey(code, "up", false), {
      type: "RELEASE_INPUT", id: `keyboard:${code}`,
    });
  });
}

test("键盘 repeat、未知键和非法边沿不产生 action", () => {
  assert.equal(logic.classifyMovingHomeKey("KeyW", "down", true), null);
  assert.equal(logic.classifyMovingHomeKey("Space", "down", false), null);
  assert.equal(logic.classifyMovingHomeKey("KeyW", "press", false), null);
  assert.equal(logic.classifyMovingHomeKey(null, "down", false), null);
});

test("START 只从 intro 开始并清空输入", () => {
  const initial = logic.createMovingHomeState();
  const playing = logic.reduceMovingHome(initial, { type: "START" });
  assert.equal(playing.phase, "playing");
  assert.equal(playing.announcementSerial, 1);
  assert.strictEqual(logic.reduceMovingHome(playing, { type: "START" }), playing);
});

test("SET_INPUT 同 id 精确替换并按 id 字典序排序", () => {
  let state = startedState();
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "z", side: "left", x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "a", side: "right", x: 0, y: -1 });
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "z", side: "left", x: -1, y: 1 });
  assert.deepEqual(state.heldInputs, [
    { id: "a", side: "right", x: 0, y: -1 },
    { id: "z", side: "left", x: -1, y: 1 },
  ]);
});

test("完全相同 SET_INPUT 与迟到 RELEASE_INPUT 是引用幂等", () => {
  const set = logic.reduceMovingHome(startedState(), { type: "SET_INPUT", id: "a", side: "left", x: 1, y: 0 });
  assert.strictEqual(logic.reduceMovingHome(set, { type: "SET_INPUT", id: "a", side: "left", x: 1, y: 0 }), set);
  assert.strictEqual(logic.reduceMovingHome(set, { type: "RELEASE_INPUT", id: "missing" }), set);
});

test("精确 RELEASE 与 RELEASE_ALL 只清理目标输入", () => {
  let state = setPair(startedState(), { x: 1, y: 0 }, { x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "RELEASE_INPUT", id: "left" });
  assert.deepEqual(state.heldInputs.map((entry) => entry.id), ["right"]);
  state = logic.reduceMovingHome(state, { type: "RELEASE_ALL_INPUTS" });
  assert.deepEqual(state.heldInputs, []);
  assert.strictEqual(logic.reduceMovingHome(state, { type: "RELEASE_ALL_INPUTS" }), state);
});

const intentCases = [
  ["空输入", [], { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }],
  ["单键", [{ id: "a", side: "left", x: 1, y: 0 }], { left: { x: 1, y: 0 }, right: { x: 0, y: 0 } }],
  ["同轴夹到 1", [{ id: "a", side: "left", x: 1, y: 0 }, { id: "b", side: "left", x: 1, y: 0 }], { left: { x: 1, y: 0 }, right: { x: 0, y: 0 } }],
  ["相反抵消", [{ id: "a", side: "left", x: -1, y: 0 }, { id: "b", side: "left", x: 1, y: 0 }], { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }],
  ["八向对角", [{ id: "a", side: "right", x: 1, y: 0 }, { id: "b", side: "right", x: 0, y: -1 }], { left: { x: 0, y: 0 }, right: { x: 1, y: -1 } }],
];

for (const [name, held, expected] of intentCases) {
  test(`输入合成：${name}`, () => assert.deepEqual(logic.deriveIntents(held), expected));
}

test("只有左侧发力时姿态完全不动", () => {
  let state = startedState();
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "left", side: "left", x: 1, y: 0 });
  const next = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.deepEqual([next.centerX, next.centerY, next.angleIndex], [190, 518, 0]);
  assert.equal(next.tick, 1);
});

test("只有右侧发力时姿态完全不动", () => {
  let state = startedState();
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "right", side: "right", x: 0, y: -1 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.deepEqual([state.centerX, state.centerY, state.angleIndex], [190, 518, 0]);
});

test("一侧多键抵消为零时双方 Gate 仍不放行", () => {
  let state = startedState();
  state = reduceAll([
    { type: "SET_INPUT", id: "la", side: "left", x: -1, y: 0 },
    { type: "SET_INPUT", id: "ld", side: "left", x: 1, y: 0 },
    { type: "SET_INPUT", id: "right", side: "right", x: 1, y: 0 },
    { type: "TICK", count: 1 },
  ], state);
  assert.deepEqual([state.centerX, state.centerY, state.angleIndex], [190, 518, 0]);
});

test("双方同向每 tick 平移 2 且不旋转", () => {
  let state = setPair(startedState(), { x: 1, y: 0 }, { x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.deepEqual([state.centerX, state.centerY, state.angleIndex], [192, 518, 0]);
});

test("混合输入同 tick 先平移再旋转", () => {
  let state = setPair(startedState(), { x: 0, y: -1 }, { x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.deepEqual([state.centerX, state.centerY, state.angleIndex], [191, 517, 1]);
});

test("沿沙发长轴反向发力会抵消且不转弯", () => {
  let state = setPair(startedState(), { x: -1, y: 0 }, { x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.deepEqual([state.centerX, state.centerY, state.angleIndex], [190, 518, 0]);
});

const turnCases = [
  ["0° 顺时针", 0, { x: 0, y: -1 }, { x: 0, y: 1 }, 1],
  ["0° 逆时针", 0, { x: 0, y: 1 }, { x: 0, y: -1 }, -1],
  ["0° 同向", 0, { x: 1, y: 0 }, { x: 1, y: 0 }, 0],
  ["90° 顺时针", 64, { x: 1, y: 0 }, { x: -1, y: 0 }, 1],
  ["90° 逆时针", 64, { x: -1, y: 0 }, { x: 1, y: 0 }, -1],
  ["对角单位量化", 32, { x: 1, y: -1 }, { x: -1, y: 1 }, 1],
];

for (const [name, angle, left, right, expected] of turnCases) {
  test(`旋转差分：${name}`, () => assert.equal(logic.deriveAngleDelta(angle, left, right), expected));
}

test("逆时针从索引 0 环绕到 255", () => {
  let state = setPair(startedState(), { x: 0, y: 1 }, { x: 0, y: -1 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.angleIndex, 255);
});

test("顺时针从索引 255 环绕到 0", () => {
  let state = setPair(startedState(), { x: 0, y: 1 }, { x: 0, y: -1 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "left", side: "left", x: 0, y: -1 });
  state = logic.reduceMovingHome(state, { type: "SET_INPUT", id: "right", side: "right", x: 0, y: 1 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.angleIndex, 0);
});

const boundaryCases = [
  ["左墙恰好 2", [136, 518, 0], true], ["左墙不足 2", [135, 518, 0], false],
  ["右墙恰好 2", [864, 160, 0], true], ["右墙不足 2", [865, 160, 0], false],
  ["上墙恰好 2", [500, 64, 0], true], ["上墙不足 2", [500, 63, 0], false],
  ["下墙恰好 2", [500, 616, 0], true], ["下墙不足 2", [500, 617, 0], false],
  ["左上块下方恰好 2", [190, 420, 0], true], ["左上块下方不足 2", [190, 419, 0], false],
  ["左上块右方恰好 2", [472, 200, 0], true], ["左上块右方不足 2", [471, 200, 0], false],
  ["右下块左方恰好 2", [528, 518, 0], true], ["右下块左方不足 2", [529, 518, 0], false],
  ["右下块上方恰好 2", [800, 260, 0], true], ["右下块上方不足 2", [800, 261, 0], false],
];

for (const [name, pose, safe] of boundaryCases) {
  test(`SAT 闭边界：${name}`, () => assert.equal(logic.isPoseSafe(...pose), safe));
}

for (const obstacle of logic.OBSTACLES) {
  test(`SAT 能命中障碍：${obstacle.id}`, () => {
    const x = (obstacle.left + obstacle.right) / 2;
    const y = (obstacle.top + obstacle.bottom) / 2;
    assert.equal(logic.poseIntersectsAabb(x, y, 37, obstacle), true);
  });
}

test("斜角四轴 Gate 能区分角相切与侵入", () => {
  const obstacle = { left: 640, top: 300, right: 976, bottom: 656 };
  let firstSafe = null;
  let firstHit = null;
  for (let x = 480; x <= 640; x += 1) {
    const hit = logic.poseIntersectsAabb(x, 270, 32, obstacle);
    if (!hit) firstSafe = x;
    if (hit && firstHit === null) firstHit = x;
  }
  assert.notEqual(firstSafe, null);
  assert.notEqual(firstHit, null);
  assert.equal(firstHit, firstSafe + 1);
});

test("平移微步碰撞保留最后安全姿态", () => {
  let state = validPlayingState({ centerX: 527, centerY: 518, routeStage: 1 });
  state = setPair(state, { x: 1, y: 0 }, { x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.deepEqual([state.centerX, state.centerY], [528, 518]);
  assert.equal(state.lastCollisionObstacleId, "block-south-east");
  assert.equal(state.collisionSerial, 1);
});

test("一次 tick 同时遇到多个障碍也只增加一次碰撞序号", () => {
  let state = validPlayingState({ centerX: 136, centerY: 616, routeStage: 1 });
  state = setPair(state, { x: -1, y: 1 }, { x: -1, y: 1 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.collisionSerial, 1);
  assert.equal(state.lastCollisionObstacleId, "wall-bottom");
});

test("碰撞后成功移动会清除 active 碰撞标记", () => {
  let state = validPlayingState({ centerX: 136, centerY: 518 });
  state = setPair(state, { x: -1, y: 0 }, { x: -1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.lastCollisionObstacleId, "wall-left");
  state = setPair(state, { x: 1, y: 0 }, { x: 1, y: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.lastCollisionObstacleId, null);
  assert.equal(state.collisionSerial, 1);
});

test("路线 0→1 只在门厅阈值同时满足时发生", () => {
  let before = validPlayingState({ centerX: 419, centerY: 518 });
  before = logic.reduceMovingHome(before, { type: "TICK", count: 1 });
  assert.equal(before.routeStage, 0);
  let at = validPlayingState({ centerX: 420, centerY: 518 });
  at = logic.reduceMovingHome(at, { type: "TICK", count: 1 });
  assert.equal(at.routeStage, 1);
});

test("路线 1→2 只在中央通道阈值同时满足时发生", () => {
  let before = validPlayingState({ centerX: 500, centerY: 271, angleIndex: 64, routeStage: 1 });
  before = logic.reduceMovingHome(before, { type: "TICK", count: 1 });
  assert.equal(before.routeStage, 1);
  let at = validPlayingState({ centerX: 500, centerY: 270, angleIndex: 64, routeStage: 1 });
  at = logic.reduceMovingHome(at, { type: "TICK", count: 1 });
  assert.equal(at.routeStage, 2);
});

test("路线阶段单调不倒退", () => {
  let state = validPlayingState({ centerX: 500, centerY: 518, routeStage: 2 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.routeStage, 2);
});

const goalGeometryCases = [
  ["中心和四角完整进入", [820, 160, 0], true],
  ["左角在闭边界", [800, 160, 0], true],
  ["右角在闭边界", [840, 160, 0], true],
  ["上角在闭边界", [820, 128, 0], true],
  ["下角在闭边界", [820, 192, 0], true],
  ["中心进入但左角越界", [799, 160, 0], false],
  ["中心进入但上角越界", [820, 127, 0], false],
  ["角度 +2 可接受", [820, 160, 2], true],
  ["角度 +3 被拒绝", [820, 160, 3], false],
  ["反向水平 128 可接受", [820, 160, 128], true],
];

for (const [name, pose, expected] of goalGeometryCases) {
  test(`目标完整 Gate：${name}`, () => assert.equal(logic.isPoseInsideGoal(...pose), expected));
}

test("路线未到 2 即使姿态在目标内也不累计", () => {
  let state = validPlayingState({ centerX: 820, centerY: 160, routeStage: 0 });
  state = logic.reduceMovingHome(state, { type: "TICK", count: 1 });
  assert.equal(state.insideGoalTicks, 0);
});

test("目标内仍有真实 heldInputs 时不累计，即使各侧合力抵消", () => {
  let state = validPlayingState({ centerX: 820, centerY: 160, routeStage: 2 });
  state = reduceAll([
    { type: "SET_INPUT", id: "la", side: "left", x: -1, y: 0 },
    { type: "SET_INPUT", id: "ld", side: "left", x: 1, y: 0 },
    { type: "SET_INPUT", id: "rl", side: "right", x: -1, y: 0 },
    { type: "SET_INPUT", id: "rr", side: "right", x: 1, y: 0 },
    { type: "TICK", count: 1 },
  ], state);
  assert.equal(state.insideGoalTicks, 0);
  assert.equal(state.phase, "playing");
});

test("目标内松手保持 11 tick 尚未完成", () => {
  const state = tickMany(logic.replayMovingHome(GOLDEN_BEFORE_HOLD), 11);
  assert.equal(state.phase, "playing");
  assert.equal(state.insideGoalTicks, 11);
  assert.equal(state.completionTick, null);
});

test("目标内松手第 12 tick 精确完成", () => {
  const state = tickMany(logic.replayMovingHome(GOLDEN_BEFORE_HOLD), 12);
  assert.equal(state.phase, "complete");
  assert.equal(state.insideGoalTicks, 12);
  assert.equal(state.completionTick, state.tick);
});

for (const reason of ["manual", "hidden", "blur", "long-frame"]) {
  test(`PAUSE(${reason}) 保留姿态、清输入并要求显式恢复`, () => {
    let state = setPair(startedState(), { x: 1, y: 0 }, { x: 1, y: 0 });
    state = logic.reduceMovingHome(state, { type: "TICK", count: 2 });
    const pose = [state.centerX, state.centerY, state.angleIndex];
    const paused = logic.reduceMovingHome(state, { type: "PAUSE", reason });
    assert.deepEqual([paused.centerX, paused.centerY, paused.angleIndex], pose);
    assert.equal(paused.phase, "paused");
    assert.equal(paused.pauseReason, reason);
    assert.deepEqual(paused.heldInputs, []);
    assert.strictEqual(logic.reduceMovingHome(paused, { type: "TICK", count: 5 }), paused);
    const resumed = logic.reduceMovingHome(paused, { type: "RESUME" });
    assert.equal(resumed.phase, "playing");
    assert.equal(resumed.pauseReason, null);
  });
}

test("非 playing 的输入 action 与不合时机生命周期 action 是 no-op", () => {
  const intro = logic.createMovingHomeState();
  assert.strictEqual(logic.reduceMovingHome(intro, { type: "SET_INPUT", id: "x", side: "left", x: 1, y: 0 }), intro);
  assert.strictEqual(logic.reduceMovingHome(intro, { type: "RESUME" }), intro);
  assert.strictEqual(logic.reduceMovingHome(intro, { type: "PAUSE", reason: "manual" }), intro);
});

test("RESTART 从 playing、paused、complete 都回到深相等初态", () => {
  const initial = logic.createMovingHomeState();
  const playing = startedState();
  const paused = logic.reduceMovingHome(playing, { type: "PAUSE", reason: "manual" });
  const complete = logic.replayMovingHome(GOLDEN_REPLAY);
  for (const state of [playing, paused, complete]) {
    assert.deepEqual(logic.reduceMovingHome(state, { type: "RESTART" }), initial);
  }
});

test("complete 后所有合法非 RESTART action 都不再推进", () => {
  const complete = logic.replayMovingHome(GOLDEN_REPLAY);
  assert.strictEqual(logic.reduceMovingHome(complete, { type: "TICK", count: 1 }), complete);
  assert.strictEqual(logic.reduceMovingHome(complete, { type: "PAUSE", reason: "manual" }), complete);
  assert.strictEqual(logic.reduceMovingHome(complete, { type: "RELEASE_ALL_INPUTS" }), complete);
});

test("公开 view 投影包含姿态、意图、路线、目标和配置文案", () => {
  let state = setPair(startedState(), { x: 1, y: 0 }, { x: 0, y: -1 });
  const view = logic.getMovingHomeView(state, { leftName: "小左", rightName: "小右", finalMessage: "一起到家" });
  assert.equal(view.phase, "playing");
  assert.deepEqual(view.names, { left: "小左", right: "小右" });
  assert.equal(view.pose.angleDegrees, 0);
  assert.equal(view.intents.left.label, "右");
  assert.equal(view.intents.right.label, "上");
  assert.equal(view.route.stage, 0);
  assert.equal(view.goal.holdTotal, 12);
  assert.equal(view.finalMessage, "一起到家");
});

test("单侧等待、碰撞、暂停和完成状态文案可由文本理解", () => {
  let state = logic.reduceMovingHome(startedState(), { type: "SET_INPUT", id: "right", side: "right", x: 1, y: 0 });
  assert.match(logic.getMovingHomeView(state).statusText, /左边/);
  state = logic.reduceMovingHome(state, { type: "PAUSE", reason: "manual" });
  assert.match(logic.getMovingHomeView(state).statusText, /暂停/);
  assert.equal(logic.getMovingHomeView(logic.replayMovingHome(GOLDEN_REPLAY)).statusText, "家放稳了。");
});

test("TICK 5 与五次 TICK 1 的状态深相等", () => {
  const state = setPair(startedState(), { x: 1, y: 0 }, { x: 1, y: 0 });
  const chunked = logic.reduceMovingHome(state, { type: "TICK", count: 5 });
  const split = tickMany(state, 5);
  assert.deepEqual(chunked, split);
});

test("30/60/144Hz 等价分片最终导出相同整数状态", () => {
  const base = setPair(startedState(), { x: 1, y: 0 }, { x: 1, y: 0 });
  const thirty = tickMany(base, 30);
  const sixty = reduceAll(Array.from({ length: 6 }, () => ({ type: "TICK", count: 5 })), base);
  const oneFortyFour = reduceAll(Array.from({ length: 15 }, () => ({ type: "TICK", count: 2 })), base);
  assert.deepEqual(thirty, sixty);
  assert.deepEqual(sixty, oneFortyFour);
});

test("同一 action 日志重放深相等且所有派生状态冻结", () => {
  const first = logic.replayMovingHome(GOLDEN_REPLAY);
  const second = logic.replayMovingHome(structuredClone(GOLDEN_REPLAY));
  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
  assertDeepFrozen(first);
});

test("replay 拒绝非数组并透传非法 action 的 TypeError", () => {
  assert.throws(() => logic.replayMovingHome(null), TypeError);
  assert.throws(() => logic.replayMovingHome([{ type: "TICK", count: 99 }]), TypeError);
});

test("JSON 往返后的公开状态仍可继续确定性推进", () => {
  const state = setPair(startedState(), { x: 1, y: 0 }, { x: 1, y: 0 });
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(
    logic.reduceMovingHome(restored, { type: "TICK", count: 3 }),
    logic.reduceMovingHome(state, { type: "TICK", count: 3 }),
  );
});

test("畸形外部状态、多余字段和不安全姿态被拒绝", () => {
  assert.throws(() => logic.reduceMovingHome({ ...startedState(), extra: true }, { type: "TICK", count: 1 }), TypeError);
  assert.throws(() => logic.reduceMovingHome({ ...startedState(), pauseReason: "manual" }, { type: "TICK", count: 1 }), TypeError);
  assert.throws(() => logic.reduceMovingHome({ ...startedState(), centerX: 20 }, { type: "TICK", count: 1 }), TypeError);
});

const invalidCenterCases = [
  ["负 x", -1, 518],
  ["负 y", 190, -1],
  ["x 超出世界", logic.WORLD_WIDTH + 1, 518],
  ["y 超出世界", 190, logic.WORLD_HEIGHT + 1],
  ["x 非安全整数", Number.MAX_SAFE_INTEGER + 1, 518],
  ["y 非安全整数", 190, Number.MIN_SAFE_INTEGER - 1],
];

for (const [name, centerX, centerY] of invalidCenterCases) {
  test(`中心坐标边界：${name}`, () => {
    assert.equal(logic.isPoseSafe(centerX, centerY, 0), false);
    const forged = { ...startedState(), centerX, centerY };
    assert.throws(() => logic.reduceMovingHome(forged, { type: "TICK", count: 1 }), TypeError);
  });
}

test("golden replay 只含生产公开 action 且固定为 150 条", () => {
  assert.equal(GOLDEN_REPLAY.length, 150);
  const allowed = new Set(["START", "SET_INPUT", "RELEASE_ALL_INPUTS", "TICK"]);
  assert.equal(GOLDEN_REPLAY.every((action) => allowed.has(action.type)), true);
});

test("golden replay 每个已接受姿态均通过六障碍 Gate", () => {
  let state = logic.createMovingHomeState();
  for (const action of GOLDEN_REPLAY) {
    state = logic.reduceMovingHome(state, action);
    assert.equal(logic.isPoseSafe(state.centerX, state.centerY, state.angleIndex), true);
    for (const obstacle of logic.OBSTACLES) {
      assert.equal(logic.poseIntersectsAabb(state.centerX, state.centerY, state.angleIndex, obstacle), false);
    }
  }
});

test("golden replay 单调穿过门厅、转角和客厅", () => {
  let state = logic.createMovingHomeState();
  const seen = new Set([state.routeStage]);
  let previous = 0;
  for (const action of GOLDEN_REPLAY) {
    state = logic.reduceMovingHome(state, action);
    assert.ok(state.routeStage >= previous);
    previous = state.routeStage;
    seen.add(state.routeStage);
  }
  assert.deepEqual([...seen], [0, 1, 2]);
});

test("golden replay 从冻结初态完成固定地图与 12 tick 松手结算", () => {
  const state = logic.replayMovingHome(GOLDEN_REPLAY);
  assert.deepEqual({
    phase: state.phase,
    tick: state.tick,
    pose: [state.centerX, state.centerY, state.angleIndex],
    routeStage: state.routeStage,
    collisionSerial: state.collisionSerial,
    hold: state.insideGoalTicks,
    completionTick: state.completionTick,
  }, {
    phase: "complete", tick: 634, pose: [820, 160, 0], routeStage: 2,
    collisionSerial: 0, hold: 12, completionTick: 634,
  });
});
