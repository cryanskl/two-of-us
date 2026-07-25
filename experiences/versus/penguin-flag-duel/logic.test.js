"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const configApi = require("./config.js");
const logic = require("./logic.js");

const clone = (value) => JSON.parse(JSON.stringify(value));
const neutral = [0, 0];

function dispatch(state, type, fields = {}) {
  return logic.reducePenguinFlagDuel(state, {
    type,
    expectedRevision: state.revision,
    ...fields,
  });
}

function startPlaying(state = logic.createInitialState()) {
  state = dispatch(state, "START");
  for (let tick = 0; tick < logic.RULES.INITIAL_COUNTDOWN_TICKS; tick += 1) {
    state = dispatch(state, "STEP", { intents: neutral });
  }
  assert.equal(state.phase, "playing");
  return state;
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function player(seat, fields = {}) {
  return { ...logic.deriveSpawn()[seat], ...fields, seat };
}

test("公共 API、规则表和配置递归冻结", () => {
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.TICK_RATE, 60);
  assert.deepEqual(logic.PHASES, ["intro", "countdown", "playing", "paused", "capture-reset", "match-result"]);
  assert.equal(logic.RULES.FIXED_SCALE, 256);
  assert.equal(logic.RULES.MAX_SPEED, 1024);
  assert.equal(logic.INTENT_ACCELERATIONS.length, 9);
  assert.equal(logic.NORMAL_VECTORS.length, 16);
  assert.equal(logic.OBSTACLES.length, 2);
  assertDeepFrozen(logic);
  assertDeepFrozen(configApi);
});

test("UMD 同时暴露 CommonJS 和浏览器全局", () => {
  const configCode = readFileSync(require.resolve("./config.js"), "utf8");
  const logicCode = readFileSync(require.resolve("./logic.js"), "utf8");
  const sandbox = { module: { exports: {} }, globalThis: {} };
  runInNewContext(configCode, sandbox);
  const sandboxConfig = sandbox.module.exports;
  assert.equal(sandboxConfig, sandbox.globalThis.PenguinFlagDuelConfig);
  sandbox.module = { exports: {} };
  sandbox.require = () => sandboxConfig;
  runInNewContext(logicCode, sandbox);
  assert.equal(sandbox.module.exports, sandbox.globalThis.PenguinFlagDuelLogic);
  assert.deepEqual(Object.keys(sandbox.module.exports), Object.keys(logic));
});

test("配置逐字段清洗、断引用并对 getter/thenable 安全回退", () => {
  const source = {
    playerNames: ["  🌙 月 ", "海  盐"],
    copy: { title: "  冰原  小赛 ", start: "开滑" },
  };
  const safe = logic.sanitizeConfig(source);
  assert.deepEqual(safe.playerNames, ["🌙 月", "海 盐"]);
  assert.equal(safe.copy.title, "冰原 小赛");
  assert.equal(safe.copy.start, "开滑");
  assert.equal(safe.copy.restart, logic.DEFAULT_CONFIG.copy.restart);
  source.playerNames[0] = "改名";
  source.copy.title = "改标题";
  assert.equal(safe.playerNames[0], "🌙 月");
  assert.equal(safe.copy.title, "冰原 小赛");

  const hostile = {};
  Object.defineProperty(hostile, "playerNames", { enumerable: true, get() { throw new Error("getter"); } });
  assert.deepEqual(logic.sanitizeConfig(hostile).playerNames, logic.DEFAULT_CONFIG.playerNames);
  assert.deepEqual(logic.sanitizeConfig({ then() {}, playerNames: ["甲", "乙"] }), {
    playerNames: logic.DEFAULT_CONFIG.playerNames,
    copy: logic.DEFAULT_CONFIG.copy,
  });
  assert.deepEqual(logic.sanitizeConfig({ playerNames: ["一".repeat(13), "乙"] }).playerNames, ["左左", "右右"]);
  assert.deepEqual(logic.sanitizeConfig({ playerNames: ["同名", "同名"] }).playerNames, ["左左", "右右"]);
  assertDeepFrozen(safe);
});

test("初态严格、深冻结、可 JSON 往返且镜像出生", () => {
  const state = logic.createInitialState({ playerNames: ["甲", "乙"] });
  assert.equal(state.phase, "intro");
  assert.deepEqual(state.playerNames, ["甲", "乙"]);
  assert.equal(state.players[0].x + state.players[1].x, logic.RULES.WORLD_WIDTH);
  assert.equal(state.players[0].y, state.players[1].y);
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(logic.assertState(state), state);
  const restored = logic.assertState(clone(state));
  assert.deepEqual(restored, state);
  assert.notEqual(restored, state);
  assertDeepFrozen(restored);
});

test("严格 action keys、revision 和阶段转换 fail closed", () => {
  let state = logic.createInitialState();
  const stale = logic.reducePenguinFlagDuel(state, { type: "START", expectedRevision: 9 });
  assert.equal(stale, state);
  const extra = logic.reducePenguinFlagDuel(state, { type: "START", expectedRevision: 0, extra: true });
  assert.equal(extra, state);
  state = dispatch(state, "START");
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 150);
  const before = state;
  state = dispatch(state, "STEP", { intents: [8, 4] });
  assert.equal(state.countdownTicks, 149);
  assert.deepEqual(state.players, before.players, "countdown ignores movement");

  state = dispatch(state, "PAUSE", { reason: "hidden" });
  assert.equal(state.phase, "paused");
  assert.equal(state.pauseReason, "hidden");
  const ticks = state.liveTicksRemaining;
  state = dispatch(state, "RESUME");
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 90);
  for (let tick = 0; tick < 90; tick += 1) state = dispatch(state, "STEP", { intents: [3, 7] });
  assert.equal(state.phase, "playing");
  assert.equal(state.liveTicksRemaining, ticks);
  assert.deepEqual(state.players, logic.deriveSpawn(), "resume countdown clears abstract input");
});

test("九种输入使用定点加速度，斜向与直向模长接近", () => {
  const spawn = logic.deriveSpawn()[0];
  const right = logic.resolvePlayerMotion(spawn, 3, false);
  const diagonal = logic.resolvePlayerMotion(spawn, 2, false);
  assert.equal(right.vx, 39);
  assert.equal(right.vy, 0);
  assert.equal(diagonal.vx, 27);
  assert.equal(diagonal.vy, -27);
  assert.ok(Math.abs(logic.integerSqrt(right.vx ** 2 + right.vy ** 2)
    - logic.integerSqrt(diagonal.vx ** 2 + diagonal.vy ** 2)) <= 1);
});

test("低摩擦阻尼单调降速，普通与持旗速度上限确定", () => {
  let body = player(0, { vx: logic.RULES.MAX_SPEED, vy: 0 });
  const speeds = [];
  for (let tick = 0; tick < 20; tick += 1) {
    body = logic.resolvePlayerMotion(body, 0, false);
    speeds.push(Math.abs(body.vx));
  }
  assert.ok(speeds.every((speed, index) => index === 0 || speed <= speeds[index - 1]));
  body = player(0);
  for (let tick = 0; tick < 200; tick += 1) body = logic.resolvePlayerMotion(body, 3, false);
  assert.ok(body.vx ** 2 + body.vy ** 2 <= logic.RULES.MAX_SPEED ** 2);
  let carrier = player(0);
  for (let tick = 0; tick < 200; tick += 1) carrier = logic.resolvePlayerMotion(carrier, 3, true);
  assert.ok(carrier.vx ** 2 + carrier.vy ** 2 <= logic.RULES.CARRIER_MAX_SPEED ** 2);
  assert.ok(carrier.vx < body.vx);
});

test("四面世界边界钳制并仅回弹法向速度", () => {
  const r = logic.RULES.PLAYER_RADIUS;
  const maxX = logic.RULES.WORLD_WIDTH - r;
  const maxY = logic.RULES.WORLD_HEIGHT - r;
  const cases = [
    player(0, { x: r, y: 30000, vx: -800, vy: 123 }),
    player(0, { x: maxX, y: 30000, vx: 800, vy: 123 }),
    player(0, { x: 30000, y: r, vx: 123, vy: -800 }),
    player(0, { x: 30000, y: maxY, vx: 123, vy: 800 }),
  ];
  const results = cases.map((body) => logic.resolvePlayerMotion(body, 0, false));
  assert.ok(results[0].x >= r && results[0].vx >= 0);
  assert.ok(results[1].x <= maxX && results[1].vx <= 0);
  assert.ok(results[2].y >= r && results[2].vy >= 0);
  assert.ok(results[3].y <= maxY && results[3].vy <= 0);
  assert.equal(results[0].vy, 122);
});

test("冰岛四侧与极限速度不会被离散步穿透", () => {
  const box = logic.OBSTACLES[0];
  const radius = logic.RULES.PLAYER_RADIUS;
  const approaches = [
    player(0, { x: box.minX - radius - 2, y: (box.minY + box.maxY) / 2, vx: 1024 }),
    player(0, { x: box.maxX + radius + 2, y: (box.minY + box.maxY) / 2, vx: -1024 }),
    player(0, { x: (box.minX + box.maxX) / 2, y: box.minY - radius - 2, vy: 1024 }),
    player(0, { x: (box.minX + box.maxX) / 2, y: box.maxY + radius + 2, vy: -1024 }),
  ];
  const results = approaches.map((body) => logic.resolvePlayerMotion(body, 0, false));
  assert.ok(results[0].x <= box.minX - radius);
  assert.ok(results[1].x >= box.maxX + radius);
  assert.ok(results[2].y <= box.minY - radius);
  assert.ok(results[3].y >= box.maxY + radius);
});

test("玩家碰撞对称、同心 fallback 固定且速度不增能", () => {
  const radius = logic.RULES.PLAYER_RADIUS;
  const centerY = 320 * 256;
  const players = [
    player(0, { x: 500 * 256, y: centerY, vx: 600 }),
    player(1, { x: 500 * 256 + radius * 2 - 100, y: centerY, vx: -600 }),
  ];
  const beforeEnergy = players.reduce((sum, body) => sum + body.vx ** 2 + body.vy ** 2, 0);
  const resolved = logic.resolvePlayerCollision(players);
  assert.equal(resolved.contacted, true);
  assert.ok(resolved.players[1].x - resolved.players[0].x >= radius * 2 - 4);
  const afterEnergy = resolved.players.reduce((sum, body) => sum + body.vx ** 2 + body.vy ** 2, 0);
  assert.ok(afterEnergy <= beforeEnergy);
  assert.equal(resolved.players[0].lastNormalIndex, resolved.players[1].lastNormalIndex);

  const same = logic.resolvePlayerCollision([
    player(0, { x: 512 * 256, y: centerY, lastNormalIndex: 3 }),
    player(1, { x: 512 * 256, y: centerY, lastNormalIndex: 8 }),
  ]);
  assert.equal(same.players[0].lastNormalIndex, 0);
  assert.equal(same.players[1].lastNormalIndex, 0);
});

test("横向镜像点、出生点、基地和障碍保持对称", () => {
  const point = { x: 177 * 256, y: 299 * 256 };
  const mirror = logic.mirrorPointHorizontally(point);
  assert.equal(mirror.x + point.x, logic.RULES.WORLD_WIDTH);
  assert.equal(mirror.y, point.y);
  const players = logic.deriveSpawn();
  assert.equal(players[0].x + players[1].x, logic.RULES.WORLD_WIDTH);
  for (const box of logic.OBSTACLES) {
    assert.equal(box.minX + box.maxX, logic.RULES.WORLD_WIDTH);
  }
});

test("hostile state 额外字段、getter、NaN、Infinity 和 symbol 均 fail closed", () => {
  const initial = logic.createInitialState();
  const extra = { ...clone(initial), extra: true };
  assert.throws(() => logic.assertState(extra), TypeError);
  const nan = clone(initial);
  nan.players[0].x = NaN;
  assert.throws(() => logic.assertState(nan));
  const infinite = clone(initial);
  infinite.players[0].vx = Infinity;
  assert.throws(() => logic.assertState(infinite));
  const symbol = clone(initial);
  symbol[Symbol("extra")] = true;
  assert.throws(() => logic.assertState(symbol), TypeError);
  const getter = clone(initial);
  Object.defineProperty(getter, "phase", { get() { throw new Error("getter"); }, enumerable: true });
  assert.throws(() => logic.assertState(getter), TypeError);

  const recovered = logic.reducePenguinFlagDuel(extra, { type: "START", expectedRevision: 0 });
  assert.deepEqual(recovered, initial);
  assert.notEqual(recovered, initial);
});

test("逻辑源码不读取 DOM、时钟、随机或网络", () => {
  const source = readFileSync(require.resolve("./logic.js"), "utf8");
  for (const forbidden of ["document.", "window.", "Date.now", "performance.", "Math.random", "fetch(", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `logic.js must not contain ${forbidden}`);
  }
});
