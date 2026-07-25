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

function legalState(fields = {}) {
  const state = clone(startPlaying());
  Object.assign(state, fields);
  return logic.assertState(state);
}

function recordDispatch(session, state, type, fields = {}) {
  const action = { type, expectedRevision: state.revision, ...fields };
  const next = logic.reducePenguinFlagDuel(state, action);
  assert.notEqual(next, state, `${type} should be accepted`);
  session.actions.push(clone(action));
  return next;
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

test("浏览器入口采用合法配置默认值，且不执行配置 Proxy get trap", () => {
  const logicCode = readFileSync(require.resolve("./logic.js"), "utf8");
  const sandbox = { globalThis: {} };
  runInNewContext(`
    globalThis.configGetterReads = 0;
    globalThis.PenguinFlagDuelConfig = new Proxy({
      DEFAULT_CONFIG: {
        playerNames: ["雪宝", "冰宝"],
        copy: {
          title: "双企鹅夺旗",
          subtitle: "抢到旗只是开始，带回家才算得分。",
          start: "开始比赛",
          restart: "再抢一局",
          resume: "继续比赛",
          localOnly: "只在本机运行，刷新即重置。",
        },
      },
    }, {
      get(target, key, receiver) {
        globalThis.configGetterReads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
  `, sandbox);
  runInNewContext(logicCode, sandbox);
  const browserLogic = sandbox.globalThis.PenguinFlagDuelLogic;
  assert.deepEqual(Array.from(browserLogic.DEFAULT_CONFIG.playerNames), ["雪宝", "冰宝"]);
  assert.equal(browserLogic.DEFAULT_CONFIG.copy.title, "双企鹅夺旗");
  assert.equal(sandbox.globalThis.configGetterReads, 0);
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

  let getterReads = 0;
  const hostileIntents = [];
  Object.defineProperty(hostileIntents, "0", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 0;
    },
  });
  hostileIntents[1] = 0;
  hostileIntents.length = 2;
  const noThrow = logic.reducePenguinFlagDuel(state, {
    type: "STEP",
    expectedRevision: state.revision,
    intents: hostileIntents,
  });
  assert.equal(noThrow, state);
  assert.equal(getterReads, 0, "nested intent accessors must be rejected without execution");
});

test("revision 到达 MAX_SAFE 后拒绝转换且不产生不安全整数状态", () => {
  const candidate = clone(logic.createInitialState());
  candidate.revision = Number.MAX_SAFE_INTEGER;
  const maxed = logic.assertState(candidate);
  const unchanged = logic.reducePenguinFlagDuel(maxed, {
    type: "START",
    expectedRevision: Number.MAX_SAFE_INTEGER,
  });
  assert.equal(unchanged, maxed);
  assert.equal(Number.isSafeInteger(unchanged.revision), true);
});

test("action Proxy 在 type 的两次 descriptor 观察间变形时 fail closed", () => {
  let typeDescriptorReads = 0;
  const action = new Proxy({ type: "START", expectedRevision: 0 }, {
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      if (key !== "type") return descriptor;
      typeDescriptorReads += 1;
      return {
        ...descriptor,
        value: typeDescriptorReads <= 2 ? "START" : "RESUME",
      };
    },
  });
  const initial = logic.createInitialState();
  assert.equal(logic.reducePenguinFlagDuel(initial, action), initial);
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

test("靠墙和靠冰岛夹碰时每个 pass 都保持静态合法并继续消解重叠", () => {
  const radius = logic.RULES.PLAYER_RADIUS;
  const requiredGap = radius * 2;
  const wallPlayers = [
    player(0, { x: radius, y: 320 * 256 }),
    player(1, { x: radius + 50 * 256, y: 320 * 256 }),
  ];
  const wall = logic.resolvePlayerCollision(wallPlayers);
  assert.equal(wall.players[0].x, radius);
  assert.ok(wall.players[1].x - wall.players[0].x > 50 * 256);
  assert.ok(requiredGap - (wall.players[1].x - wall.players[0].x) <= 128);

  const box = logic.OBSTACLES[0];
  const obstaclePlayers = [
    player(0, { x: box.minX - radius, y: (box.minY + box.maxY) / 2 }),
    player(1, { x: box.minX - radius - 50 * 256, y: (box.minY + box.maxY) / 2 }),
  ];
  const obstacle = logic.resolvePlayerCollision(obstaclePlayers);
  assert.equal(obstacle.players[0].x, box.minX - radius);
  assert.ok(obstacle.players[0].x - obstacle.players[1].x > 50 * 256);
  assert.ok(requiredGap - (obstacle.players[0].x - obstacle.players[1].x) <= 128);
});

test("单人拾旗、双人近者拾旗与严格等距无人拾旗", () => {
  const center = logic.RULES.FLAG_HOME;
  let state = legalState({
    players: [
      player(0, { x: center.x - 20 * 256, y: center.y }),
      player(1, { x: center.x + 40 * 256, y: center.y }),
    ],
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.equal(state.flag.carrierSeat, 0);
  assert.equal(state.flag.x, state.players[0].x);

  state = legalState({
    players: [
      player(0, { x: center.x - 30 * 256, y: center.y }),
      player(1, { x: center.x + 30 * 256, y: center.y }),
    ],
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.equal(state.flag.carrierSeat, null);

  state = legalState({
    players: [
      player(0, { x: center.x, y: center.y }),
      player(1, { x: 800 * 256, y: center.y }),
    ],
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.equal(state.flag.carrierSeat, 0);
});

test("持旗碰撞先掉旗、当 tick 不重拾也不在基地得分", () => {
  const x = logic.RULES.BASE_DEPTH - 2 * 256;
  const players = [
    player(0, { x, y: 320 * 256 }),
    player(1, { x: x + logic.RULES.PLAYER_RADIUS * 2 - 100, y: 320 * 256 }),
  ];
  let state = legalState({
    players,
    flag: {
      x: players[0].x,
      y: players[0].y,
      carrierSeat: 0,
      pickupLockTicks: 0,
      looseTicks: 0,
    },
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.equal(state.flag.carrierSeat, null);
  assert.equal(state.flag.pickupLockTicks, 15);
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(state.phase, "playing");
});

test("掉旗锁定完整保持 15 tick，离地 480 tick 后回中央", () => {
  let state = legalState({
    flag: {
      x: 300 * 256,
      y: 320 * 256,
      carrierSeat: null,
      pickupLockTicks: 15,
      looseTicks: 0,
    },
  });
  for (let remaining = 14; remaining >= 0; remaining -= 1) {
    state = dispatch(state, "STEP", { intents: neutral });
    assert.equal(state.flag.pickupLockTicks, remaining);
  }
  assert.equal(state.flag.looseTicks, 0);

  state = legalState({
    flag: {
      x: 300 * 256,
      y: 320 * 256,
      carrierSeat: null,
      pickupLockTicks: 0,
      looseTicks: 479,
    },
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.deepEqual(
    { x: state.flag.x, y: state.flag.y, looseTicks: state.flag.looseTicks },
    { x: logic.RULES.FLAG_HOME.x, y: logic.RULES.FLAG_HOME.y, looseTicks: 0 },
  );
});

test("同 tick 拾旗进入基地可得分，普通得分进入 90 tick 对称重置", () => {
  const basePlayer = player(0, { x: logic.RULES.BASE_DEPTH - 256, y: 320 * 256 });
  let state = legalState({
    players: [basePlayer, player(1)],
    flag: {
      x: basePlayer.x,
      y: basePlayer.y,
      carrierSeat: null,
      pickupLockTicks: 0,
      looseTicks: 20,
    },
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.equal(state.phase, "capture-reset");
  assert.equal(state.countdownTicks, 90);
  assert.deepEqual(state.scores, [1, 0]);
  assert.deepEqual(state.players, logic.deriveSpawn());
  assert.equal(state.flag.carrierSeat, null);
  assert.deepEqual({ x: state.flag.x, y: state.flag.y }, logic.RULES.FLAG_HOME);
  assert.equal(state.lastCaptureSeat, 0);
});

test("目标分、时间胜负、同分和平局压哨顺序严格", () => {
  const basePlayer = player(0, { x: logic.RULES.BASE_DEPTH - 256, y: 320 * 256 });
  const carried = {
    x: basePlayer.x,
    y: basePlayer.y,
    carrierSeat: 0,
    pickupLockTicks: 0,
    looseTicks: 0,
  };
  let state = legalState({
    players: [basePlayer, player(1)],
    flag: carried,
    scores: [2, 1],
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.equal(state.phase, "match-result");
  assert.deepEqual(state.scores, [3, 1]);
  assert.deepEqual(state.result, { winnerSeat: 0, reason: "target-score" });

  state = legalState({ scores: [1, 0], liveTicksRemaining: 1 });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.deepEqual(state.result, { winnerSeat: 0, reason: "time" });

  state = legalState({ scores: [1, 1], liveTicksRemaining: 1 });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.deepEqual(state.result, { winnerSeat: null, reason: "draw" });

  state = legalState({
    players: [basePlayer, player(1)],
    flag: carried,
    scores: [0, 1],
    liveTicksRemaining: 1,
  });
  state = dispatch(state, "STEP", { intents: neutral });
  assert.deepEqual(state.scores, [1, 1]);
  assert.deepEqual(state.result, { winnerSeat: null, reason: "draw" });
});

test("暂停冻结物理和计时，恢复倒计时不补后台步", () => {
  let state = startPlaying();
  state = dispatch(state, "STEP", { intents: [3, 7] });
  const beforePause = state;
  state = dispatch(state, "PAUSE", { reason: "stalled" });
  const paused = state;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const noOp = dispatch(state, "STEP", { intents: [3, 7] });
    assert.equal(noOp, state);
  }
  assert.deepEqual(state.players, paused.players);
  assert.equal(state.liveTicksRemaining, paused.liveTicksRemaining);
  state = dispatch(state, "RESUME");
  for (let tick = 0; tick < 90; tick += 1) state = dispatch(state, "STEP", { intents: [3, 7] });
  assert.deepEqual(state.players, beforePause.players);
  assert.equal(state.liveTicksRemaining, beforePause.liveTicksRemaining);
});

test("完整三分比赛动作日志 JSON 重放严格等于权威末态", () => {
  const config = logic.sanitizeConfig({ playerNames: ["雪团", "冰糖"] });
  const session = { version: 1, config: clone(config), actions: [] };
  let state = logic.createInitialState(config);
  state = recordDispatch(session, state, "START");
  while (state.phase === "countdown") state = recordDispatch(session, state, "STEP", { intents: neutral });

  let guard = 0;
  while (state.phase !== "match-result" && guard < 12000) {
    let intents = neutral;
    if (state.phase === "playing") {
      intents = state.flag.carrierSeat === 0 ? [7, 0] : [3, 0];
    }
    state = recordDispatch(session, state, "STEP", { intents });
    guard += 1;
  }
  assert.equal(state.phase, "match-result");
  assert.deepEqual(state.scores, [3, 0]);
  assert.ok(guard < 12000);
  const replayed = logic.replaySession(JSON.parse(JSON.stringify(session)));
  assert.deepEqual(replayed, state);
  assertDeepFrozen(replayed);
});

test("重放拒绝额外字段、错误 revision、非法阶段和畸形配置", () => {
  const config = clone(logic.sanitizeConfig());
  assert.throws(() => logic.replaySession({ version: 1, config, actions: [], extra: true }), TypeError);
  assert.throws(() => logic.replaySession({
    version: 1,
    config,
    actions: [{ type: "START", expectedRevision: 9 }],
  }), TypeError);
  assert.throws(() => logic.replaySession({
    version: 1,
    config,
    actions: [{ type: "RESUME", expectedRevision: 0 }],
  }), TypeError);
  assert.throws(() => logic.replaySession({
    version: 1,
    config: { playerNames: ["同", "同"], copy: config.copy },
    actions: [],
  }), TypeError);
});

test("嵌套数组通过 descriptor 快照解析，不执行 accessor 或 Proxy get trap", () => {
  let stateReads = 0;
  const forgedState = clone(logic.createInitialState());
  const firstPlayer = forgedState.players[0];
  const secondPlayer = forgedState.players[1];
  const hostilePlayers = [];
  Object.defineProperty(hostilePlayers, "0", {
    enumerable: true,
    get() {
      stateReads += 1;
      return firstPlayer;
    },
  });
  hostilePlayers[1] = secondPlayer;
  hostilePlayers.length = 2;
  forgedState.players = hostilePlayers;
  assert.throws(() => logic.assertState(forgedState), TypeError);
  assert.equal(stateReads, 0);

  let actionReads = 0;
  const intents = new Proxy([0, 0], {
    get(target, key, receiver) {
      actionReads += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const playing = startPlaying();
  const unchanged = logic.reducePenguinFlagDuel(playing, {
    type: "STEP",
    expectedRevision: playing.revision,
    intents,
  });
  assert.notEqual(unchanged, playing);
  assert.equal(actionReads, 0);

  let replayReads = 0;
  const actions = [];
  Object.defineProperty(actions, "0", {
    enumerable: true,
    get() {
      replayReads += 1;
      return { type: "START", expectedRevision: 0 };
    },
  });
  actions.length = 1;
  assert.throws(() => logic.replaySession({
    version: 1,
    config: clone(logic.DEFAULT_CONFIG),
    actions,
  }), TypeError);
  assert.equal(replayReads, 0);
});

test("动作按不同批次切分不改变最终逻辑状态", () => {
  const actions = [];
  let source = startPlaying();
  for (let tick = 0; tick < 240; tick += 1) {
    const action = {
      type: "STEP",
      expectedRevision: source.revision,
      intents: [tick % 80 < 40 ? 3 : 7, tick % 60 < 30 ? 1 : 5],
    };
    actions.push(action);
    source = logic.reducePenguinFlagDuel(source, action);
  }
  function applyChunks(chunkSize) {
    let state = startPlaying();
    for (let offset = 0; offset < actions.length; offset += chunkSize) {
      for (const action of actions.slice(offset, offset + chunkSize)) {
        state = logic.reducePenguinFlagDuel(state, action);
      }
    }
    return state;
  }
  assert.deepEqual(applyChunks(1), source);
  assert.deepEqual(applyChunks(2), source);
  assert.deepEqual(applyChunks(5), source);
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
  const targetWhilePlaying = clone(startPlaying());
  targetWhilePlaying.scores = [3, 0];
  assert.throws(() => logic.assertState(targetWhilePlaying), TypeError);
  const elapsedPaused = clone(startPlaying());
  elapsedPaused.phase = "paused";
  elapsedPaused.pauseReason = "manual";
  elapsedPaused.liveTicksRemaining = 0;
  assert.throws(() => logic.assertState(elapsedPaused), TypeError);
  const movedIntro = clone(initial);
  movedIntro.players[0].x += 1;
  assert.throws(() => logic.assertState(movedIntro), TypeError);

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
