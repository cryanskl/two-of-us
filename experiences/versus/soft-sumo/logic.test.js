import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

await import("./config.js");
await import("./logic.js");

const configApi = globalThis.SoftSumoConfig;
const logic = globalThis.SoftSumoLogic;
const neutral = () => [{ turn: 0, charging: false }, { turn: 0, charging: false }];
const clone = (value) => JSON.parse(JSON.stringify(value));

function action(state, type, fields = {}) {
  return logic.reduceSoftSumo(state, { type, ...fields });
}

function startPlaying(state = logic.createInitialState()) {
  state = action(state, "START");
  for (let tick = 0; tick < logic.RULES.COUNTDOWN_TICKS; tick += 1) state = action(state, "STEP", { inputs: neutral() });
  assert.equal(state.phase, "playing");
  return state;
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function body(seat, fields = {}) {
  return {
    ...logic.deriveSpawn(0)[seat],
    ...fields,
    seat,
  };
}

function outwardInputs(losers) {
  const inputs = neutral();
  for (const loser of losers) inputs[loser] = { turn: 1, charging: false };
  return Array.from({ length: 32 }, () => clone(inputs));
}

function buildOutcomeLog(losers) {
  const log = outwardInputs(losers).map((inputs) => ({ type: "step", inputs }));
  let replay = logic.replayRound(log, 0);
  while (!replay.outcome && log.length < 1200) {
    for (let tick = 0; tick < logic.RULES.MAX_CHARGE_TICKS && !replay.outcome; tick += 1) {
      const inputs = neutral();
      for (const loser of losers) inputs[loser].charging = true;
      log.push({ type: "step", inputs });
      replay = logic.replayRound(log, 0);
    }
    if (replay.outcome) break;
    log.push({ type: "step", inputs: neutral() });
    replay = logic.replayRound(log, 0);
    for (let tick = 0; tick < logic.RULES.DASH_COOLDOWN_TICKS && !replay.outcome; tick += 1) {
      log.push({ type: "step", inputs: neutral() });
      replay = logic.replayRound(log, 0);
    }
  }
  assert.ok(replay.outcome, "fixture should finish the round");
  return log;
}

function playLog(state, log, actions) {
  for (const event of log) {
    assert.equal(event.type, "step");
    const inputs = event.inputs;
    const nextAction = { type: "STEP", inputs };
    if (actions) actions.push(clone(nextAction));
    state = logic.reduceSoftSumo(state, nextAction);
  }
  return state;
}

const outcomeLogs = {
  player0Out: buildOutcomeLog([0]),
  player1Out: buildOutcomeLog([1]),
  doubleOut: buildOutcomeLog([0, 1]),
};

test("公共 API、规则、配置和方向表递归冻结", () => {
  assert.deepEqual(Object.keys(logic), [
    "VERSION", "TICK_RATE", "PHASES", "PAUSE_REASONS", "ACTION_TYPES", "RULES", "DIRECTION_VECTORS",
    "DEFAULT_CONFIG", "sanitizeConfig", "createInitialState", "reduceSoftSumo", "assertState", "getSoftSumoView",
    "resolveMatchNote", "deriveArenaRadius", "deriveSpawn", "simulateRoundTick", "resolvePlayerCollision",
    "replayRound", "replaySession", "deepFreeze",
  ]);
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.TICK_RATE, 60);
  assert.deepEqual(logic.PHASES, ["intro", "countdown", "playing", "paused", "round-result", "match-result"]);
  assert.deepEqual(logic.RULES.SPAWN_VARIANTS, [0, 16, 8]);
  assertDeepFrozen(logic);
  assertDeepFrozen(configApi);
  assert.equal(logic.DIRECTION_VECTORS.length, 64);
});

test("UMD 在浏览器全局和 CommonJS 沙箱暴露同一个 API", () => {
  const configCode = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const logicCode = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const sandbox = { module: { exports: {} }, globalThis: {} };
  runInNewContext(configCode, sandbox);
  const commonConfig = sandbox.module.exports;
  assert.equal(commonConfig, sandbox.globalThis.SoftSumoConfig);
  sandbox.module = { exports: {} };
  sandbox.require = () => commonConfig;
  runInNewContext(logicCode, sandbox);
  assert.equal(sandbox.module.exports, sandbox.globalThis.SoftSumoLogic);
  assert.deepEqual(Object.keys(sandbox.module.exports), Object.keys(logic));
});

test("64 档方向轴向精确、对向严格取反且模长误差受控", () => {
  const scaleSquared = logic.RULES.VECTOR_SCALE ** 2;
  let maximumError = 0;
  logic.DIRECTION_VECTORS.forEach((vector, index) => {
    const opposite = logic.DIRECTION_VECTORS[(index + 32) % 64];
    assert.equal(opposite.x + vector.x, 0);
    assert.equal(opposite.y + vector.y, 0);
    maximumError = Math.max(maximumError, Math.abs(vector.x ** 2 + vector.y ** 2 - scaleSquared));
  });
  assert.deepEqual(logic.DIRECTION_VECTORS[0], { x: 4096, y: 0 });
  assert.deepEqual(logic.DIRECTION_VECTORS[16], { x: 0, y: 4096 });
  assert.deepEqual(logic.DIRECTION_VECTORS[48], { x: 0, y: -4096 });
  assert.ok(maximumError < 5000);
});

test("三个出生轴镜像、朝向圆心且非法 variant 严拒绝", () => {
  const expected = [[[-220, 0], [220, 0]], [[0, -220], [0, 220]], [[-156, -156], [156, 156]]];
  expected.forEach((positions, variant) => {
    const players = logic.deriveSpawn(variant);
    assert.deepEqual(players.map(({ x, y }) => [x, y]), positions);
    assert.equal(players[0].aimIndex, logic.RULES.SPAWN_VARIANTS[variant]);
    assert.equal(players[1].aimIndex, (logic.RULES.SPAWN_VARIANTS[variant] + 32) % 64);
    assertDeepFrozen(players);
  });
  assert.throws(() => logic.deriveSpawn("0"), TypeError);
  assert.throws(() => logic.deriveSpawn(3), RangeError);
});

test("配置逐字段清洗 Unicode、断引用并对 getter 与 Proxy 安全回退", () => {
  const source = {
    playerNames: ["  🌙月 ", " 盐  盐 "],
    copy: { title: "  我们  的擂台 ", start: "开推" },
  };
  const safe = logic.sanitizeConfig(source);
  assert.deepEqual(safe.playerNames, ["🌙月", "盐 盐"]);
  assert.equal(safe.copy.title, "我们 的擂台");
  assert.equal(safe.copy.start, "开推");
  assert.equal(safe.copy.rule, logic.DEFAULT_CONFIG.copy.rule);
  source.playerNames[0] = "外部改名";
  source.copy.title = "外部标题";
  assert.equal(safe.playerNames[0], "🌙月");
  assert.equal(safe.copy.title, "我们 的擂台");
  assertDeepFrozen(safe);

  const getter = {};
  Object.defineProperty(getter, "playerNames", { get() { throw new Error("no"); }, enumerable: true });
  assert.deepEqual(logic.sanitizeConfig(getter).playerNames, logic.DEFAULT_CONFIG.playerNames);
  const proxy = new Proxy({}, { getPrototypeOf() { throw new Error("no"); } });
  assert.deepEqual(logic.sanitizeConfig(proxy), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["一".repeat(13), "好"] }).playerNames[0], "莓果");
  const thenableNames = ["甲", "乙"];
  thenableNames.then = () => {};
  assert.deepEqual(logic.sanitizeConfig({ playerNames: thenableNames }).playerNames, logic.DEFAULT_CONFIG.playerNames);
  assert.deepEqual(logic.sanitizeConfig({ playerNames: ["甲", "乙"], then() {} }), logic.DEFAULT_CONFIG);
});

test("初态结构精确、冻结、可 JSON 往返且严格 state 校验", () => {
  const state = logic.createInitialState({ playerNames: ["甲", "乙"] });
  assert.equal(state.phase, "intro");
  assert.deepEqual(state.playerNames, ["甲", "乙"]);
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(logic.assertState(state), state);
  const restored = logic.assertState(clone(state));
  assert.deepEqual(restored, state);
  assert.notEqual(restored, state);
  assertDeepFrozen(restored);
  const forged = clone(state);
  forged.extra = true;
  assert.throws(() => logic.assertState(forged), TypeError);
  const wrongScore = clone(state);
  wrongScore.scores[0] = 1;
  assert.throws(() => logic.assertState(wrongScore), TypeError);
  const swappedPlayers = clone(state);
  swappedPlayers.players.reverse();
  assert.throws(() => logic.assertState(swappedPlayers), TypeError);
  assert.throws(() => logic.simulateRoundTick({ players: swappedPlayers.players, roundTick: 0 }, neutral()), TypeError);
});

test("默认 composeMatchNote 保持规格 defaultNote，学习位默认无语气覆写", () => {
  const summary = logic.deepFreeze({
    playerNames: ["莓果", "海盐"], scores: [2, 1], rounds: [],
    winnerIndex: 0, isDraw: false, defaultNote: "这局，莓果站得更稳。下一局也别手软。",
  });
  assert.equal(configApi.composeMatchNote(summary), summary.defaultNote);
});

test("action 精确 schema：额外字段、getter、原型伪造和非法输入均幂等", () => {
  const state = logic.createInitialState();
  for (const malformed of [
    { type: "START", extra: true },
    { type: "STEP", inputs: neutral() },
    Object.assign(Object.create(null), { type: "START" }),
    { type: "PAUSE", reason: "other" },
    { type: "START", then: () => {} },
  ]) assert.equal(logic.reduceSoftSumo(state, malformed), state);
  const getter = {};
  Object.defineProperty(getter, "type", { get() { throw new Error("no"); }, enumerable: true });
  assert.equal(logic.reduceSoftSumo(state, getter), state);
  const revoked = Proxy.revocable([], {});
  revoked.revoke();
  assert.equal(logic.reduceSoftSumo(startPlaying(), { type: "STEP", inputs: revoked.proxy }).phase, "playing");
  const playing = startPlaying();
  assert.equal(action(playing, "STEP", { inputs: [{ turn: 2, charging: false }, neutral()[1]] }), playing);
  assert.doesNotThrow(() => logic.reduceSoftSumo({ fake: true }, { type: "START" }));
});

test("START 后恰好 150 tick 进入 playing，同一 STEP 不偷跑物理", () => {
  const intro = logic.createInitialState();
  let state = action(intro, "START");
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 150);
  const spawn = state.players;
  for (let tick = 0; tick < 149; tick += 1) state = action(state, "STEP", { inputs: [{ turn: 1, charging: true }, neutral()[1]] });
  assert.equal(state.phase, "countdown");
  assert.equal(state.countdownTicks, 1);
  state = action(state, "STEP", { inputs: [{ turn: 1, charging: true }, neutral()[1]] });
  assert.equal(state.phase, "playing");
  assert.equal(state.roundTick, 0);
  assert.deepEqual(state.players, spawn);
});

test("场地半径覆盖宽限、线性段、终点并严格拒绝非法 tick", () => {
  const { SHRINK_GRACE_TICKS: grace, SHRINK_END_TICKS: end } = logic.RULES;
  assert.equal(logic.deriveArenaRadius(0), 430);
  assert.equal(logic.deriveArenaRadius(grace), 430);
  assert.equal(logic.deriveArenaRadius(grace + 1), 430);
  assert.ok(logic.deriveArenaRadius(end - 1) > 270);
  assert.equal(logic.deriveArenaRadius(end), 270);
  assert.equal(logic.deriveArenaRadius(end + 1000), 270);
  let previous = Infinity;
  for (let tick = 0; tick <= end + 50; tick += 1) {
    const radius = logic.deriveArenaRadius(tick);
    assert.ok(radius <= previous);
    previous = radius;
  }
  assert.throws(() => logic.deriveArenaRadius(1.5), TypeError);
  assert.throws(() => logic.deriveArenaRadius(-1), RangeError);
});

test("蓄力单调封顶，1 tick 与满蓄力松开各只冲刺一次", () => {
  let round = { players: logic.deriveSpawn(0), roundTick: 0 };
  round = logic.simulateRoundTick(round, [{ turn: 0, charging: true }, neutral()[1]]);
  assert.equal(round.players[0].chargeTicks, 1);
  round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, neutral());
  assert.equal(round.players[0].vx, 7);
  assert.equal(round.players[0].cooldownTicks, 39);
  const once = round.players[0].vx;
  round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, neutral());
  assert.ok(round.players[0].vx < once);

  round = { players: logic.deriveSpawn(0), roundTick: 0 };
  for (let tick = 0; tick < 60; tick += 1) {
    round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, [{ turn: 0, charging: true }, neutral()[1]]);
  }
  assert.equal(round.players[0].chargeTicks, 54);
  round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, neutral());
  assert.equal(round.players[0].vx, 20);
  assert.equal(round.players[0].chargeTicks, 0);
});

test("cooldown 期间按住不蓄力，归零 tick 才重新开始", () => {
  let round = { players: logic.deriveSpawn(0), roundTick: 0 };
  round = logic.simulateRoundTick(round, [{ turn: 0, charging: true }, neutral()[1]]);
  round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, neutral());
  for (let tick = 0; tick < 38; tick += 1) {
    round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, [{ turn: 0, charging: true }, neutral()[1]]);
  }
  assert.equal(round.players[0].cooldownTicks, 1);
  assert.equal(round.players[0].chargeTicks, 0);
  round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, [{ turn: 0, charging: true }, neutral()[1]]);
  assert.equal(round.players[0].cooldownTicks, 0);
  assert.equal(round.players[0].chargeTicks, 1);
});

test("瞄准逐 tick 同公式转动，正反 64 tick 均回到原方向", () => {
  for (const turn of [-1, 1]) {
    let round = { players: logic.deriveSpawn(0), roundTick: 0 };
    for (let tick = 0; tick < 64; tick += 1) {
      round = logic.simulateRoundTick({ players: round.players, roundTick: round.roundTick }, [{ turn, charging: false }, { turn, charging: false }]);
    }
    assert.equal(round.players[0].aimIndex, 0);
    assert.equal(round.players[1].aimIndex, 32);
  }
});

test("碰撞分离位置但不借纠正改速度，相向时冲量等大反向", () => {
  const separating = logic.resolvePlayerCollision([
    body(0, { x: -40, y: 0, vx: -5, vy: 2 }),
    body(1, { x: 40, y: 0, vx: 5, vy: -2 }),
  ]);
  assert.ok(separating[1].x - separating[0].x >= 96);
  assert.deepEqual(separating.map(({ vx, vy }) => [vx, vy]), [[-5, 2], [5, -2]]);

  const approaching = logic.resolvePlayerCollision([
    body(0, { x: -40, y: 0, vx: 10, vy: 3 }),
    body(1, { x: 40, y: 0, vx: -10, vy: -4 }),
  ]);
  assert.deepEqual(approaching.map(({ vx, vy }) => [vx, vy]), [[-3, 3], [3, -4]]);
  assert.equal(approaching[0].vx + approaching[1].vx, 0);
  assert.equal(approaching[0].vy, 3);
  assert.equal(approaching[1].vy, -4);
});

test("相切不处理、完全重叠稳定 fallback、输入顺序不改变 seat 结果", () => {
  const touching = [body(0, { x: -48, y: 0, vx: 1 }), body(1, { x: 48, y: 0, vx: -1 })];
  assert.deepEqual(logic.resolvePlayerCollision(touching), touching);
  const overlap = [body(0, { x: 0, y: 0, vx: 2 }), body(1, { x: 0, y: 0, vx: -2 })];
  const first = logic.resolvePlayerCollision(overlap);
  const reversed = logic.resolvePlayerCollision([...overlap].reverse());
  assert.deepEqual(first, reversed);
  assert.ok(first[1].x - first[0].x >= 96);
  for (const player of first) for (const key of ["x", "y", "vx", "vy"]) assert.ok(Number.isFinite(player[key]));
});

test("边缘等于擂台仍在，超 1 判出；双出界按同一 tick 原子裁决", () => {
  const equal = [body(0, { x: -382 }), body(1, { x: 0, y: 0 })];
  const inside = logic.simulateRoundTick({ players: equal, roundTick: 0 }, neutral());
  assert.equal(inside.outcome, null);
  const beyond = [body(0, { x: -383 }), body(1, { x: 0, y: 0 })];
  assert.deepEqual(logic.simulateRoundTick({ players: beyond, roundTick: 0 }, neutral()).outcome, {
    winnerIndex: 1, reason: "player-0-out",
  });
  const both = [body(0, { x: -383 }), body(1, { x: 383 })];
  assert.deepEqual(logic.simulateRoundTick({ players: both, roundTick: 0 }, neutral()).outcome, {
    winnerIndex: null, reason: "double-out",
  });
});

test("三段 golden round replay 分别得到双方胜与 double-out，结果后日志严拒绝", () => {
  const first = logic.replayRound(outcomeLogs.player1Out, 0);
  const second = logic.replayRound(outcomeLogs.player0Out, 0);
  const draw = logic.replayRound(outcomeLogs.doubleOut, 0);
  assert.deepEqual(first.outcome, { winnerIndex: 0, reason: "player-1-out" });
  assert.deepEqual(second.outcome, { winnerIndex: 1, reason: "player-0-out" });
  assert.deepEqual(draw.outcome, { winnerIndex: null, reason: "double-out" });
  assert.throws(() => logic.replayRound([...outcomeLogs.player1Out, { type: "step", inputs: neutral() }], 0), TypeError);
  assert.deepEqual(logic.replayRound(clone(outcomeLogs.player1Out), 0), first);
});

test("暂停取消 charge 但保留速度/cooldown，恢复 90 tick 不偷跑且可严格重放", () => {
  let state = startPlaying();
  for (let tick = 0; tick < 7; tick += 1) state = action(state, "STEP", { inputs: [{ turn: 0, charging: true }, neutral()[1]] });
  assert.equal(state.players[0].chargeTicks, 7);
  const position = [state.players[0].x, state.players[0].y];
  state = action(state, "PAUSE", { reason: "hidden" });
  assert.equal(state.phase, "paused");
  assert.equal(state.players[0].chargeTicks, 0);
  assert.equal(state.players[0].wasCharging, false);
  assert.deepEqual([state.players[0].x, state.players[0].y], position);
  assert.deepEqual(logic.assertState(clone(state)), state);
  state = action(state, "RESUME");
  for (let tick = 0; tick < 89; tick += 1) state = action(state, "STEP", { inputs: [{ turn: 1, charging: true }, neutral()[1]] });
  assert.equal(state.phase, "countdown");
  assert.deepEqual([state.players[0].x, state.players[0].y], position);
  state = action(state, "STEP", { inputs: [{ turn: 1, charging: true }, neutral()[1]] });
  assert.equal(state.phase, "playing");
  assert.equal(state.players[0].chargeTicks, 0);
  assert.deepEqual(logic.assertState(clone(state)), state);
  state = playLog(state, outcomeLogs.player0Out);
  assert.equal(state.phase, "round-result");
  assert.ok(state.completedRounds[0].inputLog.some((event) => event.type === "cancel-charge"));
  assert.deepEqual(logic.replayRound(state.completedRounds[0].inputLog, 0).outcome, {
    winnerIndex: 1, reason: "player-0-out",
  });
  assert.deepEqual(logic.assertState(clone(state)), state);
});

test("cancel-charge 用此前 step 数锚定，内部去重、外部错位或重复严拒绝", () => {
  assert.throws(() => logic.replayRound([{ type: "cancel-charge", atTick: 1 }], 0), TypeError);
  assert.throws(() => logic.replayRound([
    { type: "cancel-charge", atTick: 0 },
    { type: "cancel-charge", atTick: 0 },
  ], 0), TypeError);
  let state = action(logic.createInitialState(), "START");
  state = action(state, "PAUSE", { reason: "manual" });
  assert.equal(state.roundTick, 0);
  assert.deepEqual(state.currentInputLog, [{ type: "cancel-charge", atTick: 0 }]);
  state = action(state, "RESUME");
  state = action(state, "PAUSE", { reason: "hidden" });
  assert.equal(state.roundTick, 0);
  assert.deepEqual(state.currentInputLog, [{ type: "cancel-charge", atTick: 0 }]);
  assert.deepEqual(logic.assertState(clone(state)), state);
});

test("含 pause/resume 的 session 在恢复、继续和 outcome 后仍可 JSON 重放", () => {
  const actions = [{ type: "START" }];
  let state = logic.reduceSoftSumo(logic.createInitialState(), actions[0]);
  const push = (next) => {
    actions.push(clone(next));
    state = logic.reduceSoftSumo(state, next);
  };
  for (let tick = 0; tick < 150; tick += 1) push({ type: "STEP", inputs: neutral() });
  for (let tick = 0; tick < 5; tick += 1) push({ type: "STEP", inputs: [{ turn: 0, charging: true }, neutral()[1]] });
  push({ type: "PAUSE", reason: "blur" });
  push({ type: "RESUME" });
  for (let tick = 0; tick < 90; tick += 1) push({ type: "STEP", inputs: neutral() });
  for (const event of outcomeLogs.player1Out) push({ type: "STEP", inputs: event.inputs });
  assert.equal(state.phase, "round-result");
  const log = { config: {}, actions };
  assert.deepEqual(logic.replaySession(clone(log)), state);
  assert.deepEqual(logic.replayRound(state.completedRounds[0].inputLog, 0).players, state.players);
});

test("固定三轮派生比分，double-out 不得分，第三轮直接 match-result", () => {
  let state = startPlaying();
  state = playLog(state, outcomeLogs.player1Out);
  assert.equal(state.phase, "round-result");
  assert.deepEqual(state.scores, [1, 0]);
  state = startPlaying(action(state, "NEXT_ROUND"));
  state = playLog(state, outcomeLogs.doubleOut);
  assert.equal(state.phase, "round-result");
  assert.deepEqual(state.scores, [1, 0]);
  state = startPlaying(action(state, "NEXT_ROUND"));
  state = playLog(state, outcomeLogs.player0Out);
  assert.equal(state.phase, "match-result");
  assert.deepEqual(state.scores, [1, 1]);
  assert.equal(state.completedRounds.length, 3);
  assert.deepEqual(logic.assertState(clone(state)), state);
  const restarted = action(state, "RESTART");
  assert.deepEqual(restarted, logic.createInitialState());
});

test("完整 session replay、深克隆与 JSON 往返得到深相等 state", () => {
  const actions = [{ type: "START" }];
  let state = logic.createInitialState({ playerNames: ["左", "右"] });
  state = logic.reduceSoftSumo(state, actions[0]);
  for (let tick = 0; tick < logic.RULES.COUNTDOWN_TICKS; tick += 1) {
    const next = { type: "STEP", inputs: neutral() };
    actions.push(clone(next));
    state = logic.reduceSoftSumo(state, next);
  }
  state = playLog(state, outcomeLogs.player1Out, actions);
  const log = { config: { playerNames: ["左", "右"] }, actions };
  const original = clone(log);
  assert.deepEqual(logic.replaySession(log), state);
  assert.deepEqual(logic.replaySession(clone(log)), state);
  assert.deepEqual(log, original);
  assert.throws(() => logic.replaySession({ ...log, extra: true }), TypeError);
});

test("public view 断引用且不泄露速度、日志、配置策略或碰撞法线", () => {
  let state = startPlaying();
  state = action(state, "STEP", { inputs: [{ turn: 1, charging: true }, neutral()[1]] });
  const view = logic.getSoftSumoView(state);
  assert.equal(view.phase, "playing");
  assert.equal(view.players[0].aimIndex, 1);
  assert.ok(view.players[0].chargeRatio > 0);
  const serialized = JSON.stringify(view);
  for (const forbidden of ["vx", "vy", "inputLog", "lastNormal", "composeMatch", "accumulator"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assertDeepFrozen(view);
  assert.notEqual(view.playerNames, state.playerNames);
});

test("终局 summary 精确冻结；自定义结语、修改、Promise、异常与超长均安全", () => {
  let state = startPlaying(logic.createInitialState({ playerNames: ["松", "盐"] }));
  state = playLog(state, outcomeLogs.doubleOut);
  state = startPlaying(action(state, "NEXT_ROUND"));
  state = playLog(state, outcomeLogs.doubleOut);
  state = startPlaying(action(state, "NEXT_ROUND"));
  state = playLog(state, outcomeLogs.doubleOut);
  const fallback = "一起出圈，也算默契。下一局再站稳一点。";
  const custom = logic.resolveMatchNote(state, {
    composeMatchNote(summary) {
      assert.deepEqual(Object.keys(summary), ["playerNames", "scores", "rounds", "winnerIndex", "isDraw", "defaultNote"]);
      assertDeepFrozen(summary);
      assert.deepEqual(summary.scores, [0, 0]);
      return "  今晚   平分软垫。 ";
    },
  });
  assert.equal(custom, "今晚 平分软垫。");
  assert.equal(logic.resolveMatchNote(state, { composeMatchNote() { return Promise.resolve("no"); } }), fallback);
  assert.equal(logic.resolveMatchNote(state, { composeMatchNote() { throw new Error("no"); } }), fallback);
  assert.equal(logic.resolveMatchNote(state, { composeMatchNote() { return "长".repeat(121); } }), fallback);
  assert.equal(logic.resolveMatchNote(logic.createInitialState()), null);
});

test("sanitizeConfig 的 composer 经 createInitialState WeakMap 传递且不进入 state", () => {
  const safeConfig = logic.sanitizeConfig({ playerNames: ["绒", "盐"] }, () => "只在 WeakMap 里的结语");
  let state = startPlaying(logic.createInitialState(safeConfig));
  state = playLog(state, outcomeLogs.doubleOut);
  state = startPlaying(action(state, "NEXT_ROUND"));
  state = playLog(state, outcomeLogs.doubleOut);
  state = startPlaying(action(state, "NEXT_ROUND"));
  state = playLog(state, outcomeLogs.doubleOut);
  assert.equal(logic.resolveMatchNote(state, safeConfig), "只在 WeakMap 里的结语");
  assert.equal(JSON.stringify(state).includes("WeakMap"), false);
  assert.equal(JSON.stringify(state).includes("composer"), false);
});

test("交换输入玩家顺序只按 seat 归一，不产生数组顺序偏置", () => {
  const players = [body(0, { x: -30, y: -5, vx: 8, vy: 1 }), body(1, { x: 30, y: 5, vx: -6, vy: -1 })];
  const normal = logic.resolvePlayerCollision(players);
  const reversed = logic.resolvePlayerCollision([...players].reverse());
  assert.deepEqual(reversed, normal);
  assert.deepEqual(normal.map((player) => player.seat), [0, 1]);
});

test("相同 tick 日志按 30/60/120/144Hz 任意分组仍只得到同一 replay", () => {
  const log = outcomeLogs.doubleOut;
  const expected = logic.replayRound(log, 0);
  for (const frameRate of [30, 60, 120, 144]) {
    const chunkSize = Math.max(1, Math.round(logic.TICK_RATE / frameRate));
    const regrouped = [];
    for (let index = 0; index < log.length; index += chunkSize) regrouped.push(...log.slice(index, index + chunkSize));
    assert.deepEqual(logic.replayRound(regrouped, 0), expected);
  }
});
