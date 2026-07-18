import test from "node:test";
import assert from "node:assert/strict";

await import("./config.js");
await import("./logic.js");

const logic = globalThis.ORBIT_STAR_RACE_LOGIC;

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function claimSeries(winners) {
  return winners.map((entry, index) => ({
    starIndex: index,
    stepCount: index + 1,
    winners: entry,
  }));
}

function liveState({ seed = 12345, claims = [], players, stepCount = 200, revision = 1 } = {}) {
  const intro = logic.createGameState();
  return freeze({
    phase: "live",
    seed,
    stepCount: Math.max(stepCount, claims.length),
    previewSteps: 0,
    revision,
    playerNames: [...intro.playerNames],
    players: players ?? intro.players.map((player) => ({ ...player })),
    claims: claims.map((claim) => ({ ...claim, winners: [...claim.winners] })),
  });
}

function playerBeforeCapture(playerIndex, star, offset = 0, lane = star.lane) {
  const movement = logic.PLAYER_DIRECTIONS[playerIndex]
    * logic.angularSpeedForLane(lane) * logic.FIXED_DT;
  return {
    angle: logic.normalizeAngle(star.angle + offset - movement),
    lane,
    cooldownSteps: 0,
  };
}

function missPlayer(playerIndex, star) {
  const lane = (star.lane + 1) % 3;
  return playerBeforeCapture(playerIndex, star, 0, lane);
}

test("常量冻结，三轨速度单调，角度与最短角差跨零点稳定", () => {
  assert.equal(logic.FIXED_DT, 1 / 120);
  assert.deepEqual(logic.RING_RADII, [0.82, 1, 1.22]);
  assert.deepEqual(logic.PLAYER_DIRECTIONS, [1, -1]);
  assert.ok(Object.isFrozen(logic.RING_RADII));
  assert.ok(Object.isFrozen(logic.START_ANGLES));
  assert.ok(logic.angularSpeedForLane(0) > logic.angularSpeedForLane(1));
  assert.ok(logic.angularSpeedForLane(1) > logic.angularSpeedForLane(2));
  assert.equal(logic.angularSpeedForLane(9), null);
  assert.equal(Object.is(logic.normalizeAngle(-0), -0), false);
  assert.ok(Math.abs(logic.normalizeAngle(-0.25) - (logic.TAU - 0.25)) < 1e-12);
  assert.ok(Math.abs(logic.shortestAngleDifference(0.05, logic.TAU - 0.05) - 0.1) < 1e-12);
});

test("配置严格白名单、Unicode code point 清洗、整份回退且不共享名字引用", () => {
  const originalFormatter = function originalFormatter() { return null; };
  const source = {
    playerNames: ["  星   野 ", "🌙月"],
    composeResult: originalFormatter,
  };
  const config = logic.sanitizeConfig(source);
  assert.deepEqual(config.playerNames, ["星 野", "🌙月"]);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.playerNames));
  assert.equal(Object.isFrozen(originalFormatter), false);
  assert.notEqual(config.composeResult, originalFormatter);
  source.playerNames[0] = "改名";
  assert.equal(config.playerNames[0], "星 野");

  assert.equal(logic.sanitizeConfig({ ...source, extra: true }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["同名", "同名"] }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["一".repeat(13), "蓝"] }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ playerNames: ["朱", "蓝"], composeResult: "no" }), logic.DEFAULT_CONFIG);
});

test("终局 formatter 获得递归冻结上下文，非法返回、Promise 和异常都回落", () => {
  const claims = claimSeries([[0], [0], [0], [0]]);
  const seed = 77;
  const star = logic.deriveStar(seed, claims.length);
  const finished = logic.stepGame(liveState({
    seed,
    claims,
    players: [playerBeforeCapture(0, star), missPlayer(1, star)],
  }));
  assert.equal(finished.phase, "finished");

  const custom = logic.resolveResultCopy(finished, {
    playerNames: ["不会", "覆盖"],
    composeResult(context) {
      assert.ok(Object.isFrozen(context));
      assert.ok(Object.isFrozen(context.playerNames));
      assert.ok(Object.isFrozen(context.scores));
      assert.deepEqual(context.playerNames, ["朱方", "蓝方"]);
      return { title: "  今晚   是朱方 ", body: "  五颗星   已经收好。 " };
    },
  });
  assert.deepEqual(custom, { title: "今晚 是朱方", body: "五颗星 已经收好。" });
  assert.ok(Object.isFrozen(custom));

  const fallback = logic.resolveResultCopy(finished);
  const finishedView = logic.getViewModel(finished);
  assert.equal(finishedView.phase, "finished");
  assert.equal(finishedView.star.index, finished.claims.at(-1).starIndex);
  assert.ok(finishedView.players.every((player) => !player.canRise && !player.canDrop));
  assert.deepEqual(logic.resolveResultCopy(finished, {
    playerNames: ["甲", "乙"],
    composeResult() { return { title: "x", body: "y", extra: true }; },
  }), fallback);
  assert.deepEqual(logic.resolveResultCopy(finished, {
    playerNames: ["甲", "乙"], composeResult() { return Promise.resolve({ title: "x", body: "y" }); },
  }), fallback);
  assert.deepEqual(logic.resolveResultCopy(finished, {
    playerNames: ["甲", "乙"], composeResult() { throw new Error("copy"); },
  }), fallback);
});

test("同 seed 星流稳定，每组三颗恰好覆盖三轨且扇区合法", () => {
  const first = Array.from({ length: 30 }, (_, index) => logic.deriveStar(0xffffffff, index));
  const second = Array.from({ length: 30 }, (_, index) => logic.deriveStar(0xffffffff, index));
  assert.deepEqual(first, second);
  for (let index = 0; index < first.length; index += 3) {
    assert.deepEqual(first.slice(index, index + 3).map((star) => star.lane).sort(), [0, 1, 2]);
  }
  for (const star of first) {
    assert.match(star.id, /^star-\d{3}$/);
    assert.ok(star.sector >= 0 && star.sector < 12);
    assert.equal(star.angle, ((star.sector + 0.5) / 12) * logic.TAU);
    assert.ok(Object.isFrozen(star));
  }
  assert.throws(() => logic.deriveStar(0, 0), RangeError);
  assert.throws(() => logic.deriveStar(1, -1), RangeError);
});

test("intro、start、seed Gate、递归冻结和调用方配置隔离", () => {
  const raw = { playerNames: ["  朱朱 ", " 蓝蓝 "], composeResult() { return null; } };
  const intro = logic.createGameState(raw);
  assert.equal(logic.isGameState(intro), true);
  assert.deepEqual(intro.playerNames, ["朱朱", "蓝蓝"]);
  assert.equal(intro.seed, 0);
  assert.equal(intro.phase, "intro");
  assert.ok(Object.isFrozen(intro.players[0]));
  raw.playerNames[0] = "外部改名";
  assert.equal(intro.playerNames[0], "朱朱");
  assert.equal(logic.startGame(intro, 0), intro);
  assert.equal(logic.startGame(intro, 0x100000000), intro);
  const preview = logic.startGame(intro, 1);
  assert.equal(preview.phase, "preview");
  assert.equal(preview.previewSteps, 96);
  assert.equal(preview.revision, 1);
  assert.equal(logic.startGame(preview, 2), preview);
});

test("升降轨遵守边界、cooldown、玩家与方向 Gate", () => {
  let state = logic.startGame(logic.createGameState(), 5);
  const shifted = logic.shiftOrbit(state, 0, -1);
  assert.equal(shifted.players[0].lane, 0);
  assert.equal(shifted.players[0].cooldownSteps, 30);
  assert.deepEqual(shifted.players[1], state.players[1]);
  assert.equal(logic.shiftOrbit(shifted, 0, 1), shifted);
  assert.equal(logic.shiftOrbit(shifted, 0, -1), shifted);
  assert.equal(logic.shiftOrbit(state, 2, 1), state);
  assert.equal(logic.shiftOrbit(state, 0, 0), state);
  for (let index = 0; index < 30; index += 1) state = logic.stepGame(index === 0 ? shifted : state);
  assert.equal(state.players[0].cooldownSteps, 0);
  assert.equal(logic.shiftOrbit(state, 0, -1), state);
  const intro = logic.createGameState();
  assert.equal(logic.shiftOrbit(intro, 0, 1), intro);
});

test("固定步角运动方向相反，120 步位移与轨道速度严格一致", () => {
  let seed = 1;
  while (logic.deriveStar(seed, 0).lane === 1) seed += 1;
  const start = liveState({ seed, stepCount: 0 });
  let state = start;
  for (let index = 0; index < 120; index += 1) state = logic.stepGame(state);
  const expectedRed = logic.normalizeAngle(logic.START_ANGLES[0] + logic.BASE_ANGULAR_SPEED);
  const expectedBlue = logic.normalizeAngle(logic.START_ANGLES[1] - logic.BASE_ANGULAR_SPEED);
  assert.ok(Math.abs(state.players[0].angle - expectedRed) < 1e-12);
  assert.ok(Math.abs(state.players[1].angle - expectedBlue) < 1e-12);
  assert.equal(state.stepCount, 120);
});

test("preview 恰好 96 步不捕获，第 97 个固定步才允许 live 捕获", () => {
  let state = logic.startGame(logic.createGameState(), 19);
  for (let index = 0; index < 95; index += 1) state = logic.stepGame(state);
  assert.equal(state.phase, "preview");
  assert.equal(state.previewSteps, 1);
  assert.equal(state.claims.length, 0);
  state = logic.stepGame(state);
  assert.equal(state.phase, "live");
  assert.equal(state.previewSteps, 0);
  assert.equal(state.claims.length, 0);

  const star = logic.deriveStar(state.seed, 0);
  const ready = liveState({
    seed: state.seed,
    stepCount: state.stepCount,
    players: [playerBeforeCapture(0, star), missPlayer(1, star)],
  });
  const captured = logic.stepGame(ready);
  assert.equal(captured.stepCount, 97);
  assert.deepEqual(captured.claims[0].winners, [0]);
});

test("单人、双人不同距离与 epsilon 内共享捕获都按更新后几何裁决", () => {
  const seed = 99;
  const star = logic.deriveStar(seed, 0);
  const red = logic.stepGame(liveState({
    seed,
    players: [playerBeforeCapture(0, star), missPlayer(1, star)],
  }));
  assert.deepEqual(red.claims[0].winners, [0]);

  const blue = logic.stepGame(liveState({
    seed,
    players: [missPlayer(0, star), playerBeforeCapture(1, star)],
  }));
  assert.deepEqual(blue.claims[0].winners, [1]);

  const closer = logic.stepGame(liveState({
    seed,
    players: [playerBeforeCapture(0, star, 0.02), playerBeforeCapture(1, star, -0.05)],
  }));
  assert.deepEqual(closer.claims[0].winners, [0]);

  const shared = logic.stepGame(liveState({
    seed,
    players: [playerBeforeCapture(0, star, 0.04), playerBeforeCapture(1, star, -(0.04 + logic.SHARED_EPSILON / 2))],
  }));
  assert.deepEqual(shared.claims[0].winners, [0, 1]);
  assert.deepEqual(logic.deriveScores(shared), [1, 1]);
});

test("claim 索引与 step 递增，非终局进入下一颗 96-step preview", () => {
  const claims = claimSeries([[0], [1]]);
  const seed = 101;
  const star = logic.deriveStar(seed, claims.length);
  const next = logic.stepGame(liveState({
    seed,
    claims,
    stepCount: 50,
    players: [playerBeforeCapture(0, star), missPlayer(1, star)],
  }));
  assert.equal(next.phase, "preview");
  assert.equal(next.previewSteps, 96);
  assert.deepEqual(next.claims.at(-1), { starIndex: 2, stepCount: 51, winners: [0] });
  assert.deepEqual(logic.deriveScores(next), [2, 1]);
});

test("普通 5 分终局、5–5 共享加赛与 6–5 加赛终局", () => {
  const seed = 303;
  let claims = claimSeries([[0], [0], [0], [0]]);
  let star = logic.deriveStar(seed, claims.length);
  let state = logic.stepGame(liveState({
    seed,
    claims,
    players: [playerBeforeCapture(0, star), missPlayer(1, star)],
  }));
  assert.equal(state.phase, "finished");
  assert.deepEqual(logic.deriveScores(state), [5, 0]);
  assert.equal(logic.stepGame(state), state);

  claims = claimSeries([[0, 1], [0, 1], [0, 1], [0, 1]]);
  star = logic.deriveStar(seed, claims.length);
  state = logic.stepGame(liveState({
    seed,
    claims,
    players: [playerBeforeCapture(0, star, 0.03), playerBeforeCapture(1, star, -0.03)],
  }));
  assert.equal(state.phase, "preview");
  assert.deepEqual(logic.deriveScores(state), [5, 5]);

  const overtimeStar = logic.deriveStar(seed, state.claims.length);
  state = logic.stepGame(liveState({
    seed,
    claims: state.claims,
    stepCount: state.stepCount + 96,
    players: [playerBeforeCapture(0, overtimeStar), missPlayer(1, overtimeStar)],
  }));
  assert.equal(state.phase, "finished");
  assert.deepEqual(logic.deriveScores(state), [6, 5]);
});

test("restart 只接受 finished 和新 seed，保留名字、清盘、回起点并增加 revision", () => {
  const claims = claimSeries([[1], [1], [1], [1]]);
  const seed = 808;
  const star = logic.deriveStar(seed, claims.length);
  const finished = logic.stepGame(liveState({
    seed,
    claims,
    revision: 7,
    players: [missPlayer(0, star), playerBeforeCapture(1, star)],
  }));
  assert.equal(logic.restartGame(finished, 0), finished);
  const restarted = logic.restartGame(finished, 909);
  assert.equal(restarted.phase, "preview");
  assert.equal(restarted.seed, 909);
  assert.equal(restarted.stepCount, 0);
  assert.equal(restarted.previewSteps, 96);
  assert.equal(restarted.revision, 8);
  assert.deepEqual(restarted.claims, []);
  assert.deepEqual(restarted.players.map(({ angle, lane }) => ({ angle, lane })), [
    { angle: logic.START_ANGLES[0], lane: 1 },
    { angle: logic.START_ANGLES[1], lane: 1 },
  ]);
});

test("畸形 phase/seed/player/claim/preview/finished 都安全回新的 intro", () => {
  const state = logic.startGame(logic.createGameState(), 42);
  const malformed = [
    { ...state, phase: "playing" },
    { ...state, seed: -1 },
    { ...state, players: [{ ...state.players[0], lane: 9 }, state.players[1]] },
    { ...state, claims: [{ starIndex: 2, stepCount: 1, winners: [0] }] },
    { ...state, previewSteps: 0 },
    { ...state, phase: "finished", previewSteps: 0 },
  ];
  for (const broken of malformed) {
    const recovered = logic.stepGame(freeze(broken));
    assert.equal(recovered.phase, "intro");
    assert.notEqual(recovered, broken);
    assert.equal(logic.isGameState(recovered), true);
  }
  assert.equal(logic.shiftOrbit(state, 0, 0), state);
});

test("replaySession 严格验证日志并与逐步 reducer 路径完全一致", () => {
  const log = {
    seed: 404,
    totalSteps: 180,
    shifts: [
      { step: 0, playerIndex: 0, direction: -1 },
      { step: 0, playerIndex: 0, direction: 1 },
      { step: 30, playerIndex: 0, direction: 1 },
      { step: 60, playerIndex: 1, direction: 1 },
      { step: 90, playerIndex: 1, direction: -1 },
    ],
    config: { playerNames: ["朱", "蓝"], composeResult() { return null; } },
  };
  const replayed = logic.replaySession(log);
  let direct = logic.startGame(logic.createGameState(log.config), log.seed);
  let shiftIndex = 0;
  for (let step = 0; step < log.totalSteps; step += 1) {
    while (shiftIndex < log.shifts.length && log.shifts[shiftIndex].step === step) {
      const action = log.shifts[shiftIndex];
      direct = logic.shiftOrbit(direct, action.playerIndex, action.direction);
      shiftIndex += 1;
    }
    direct = logic.stepGame(direct);
  }
  assert.deepEqual(replayed, direct);
  assert.ok(Object.isFrozen(replayed));

  assert.throws(() => logic.replaySession({ ...log, extra: true }), TypeError);
  assert.throws(() => logic.replaySession({ ...log, seed: 0 }), RangeError);
  assert.throws(() => logic.replaySession({ ...log, totalSteps: 2.5 }), TypeError);
  assert.throws(() => logic.replaySession({ ...log, shifts: [{ step: 180, playerIndex: 0, direction: 1 }] }), RangeError);
  assert.throws(() => logic.replaySession({ ...log, shifts: [
    { step: 2, playerIndex: 0, direction: 1 },
    { step: 1, playerIndex: 1, direction: -1 },
  ] }), RangeError);
  assert.throws(() => logic.replaySession({ ...log, shifts: [{ step: 1, playerIndex: 0, direction: 1, extra: true }] }), TypeError);
});

test("view model 全量派生、引用隔离、状态文案与按钮能力一致", () => {
  const intro = logic.createGameState({ playerNames: ["朱", "蓝"], composeResult() { return null; } });
  const introView = logic.getViewModel(intro);
  assert.equal(introView.star, null);
  assert.equal(introView.status.title, "两颗卫星已经就位");
  assert.ok(introView.players.every((player) => !player.canRise && !player.canDrop));
  assert.notEqual(introView.playerNames, intro.playerNames);
  assert.notEqual(introView.players, intro.players);
  assert.ok(Object.isFrozen(introView));

  let preview = logic.startGame(intro, 55);
  let view = logic.getViewModel(preview);
  assert.equal(view.star.status, "preview");
  assert.equal(view.status.remainingPreviewSteps, 96);
  assert.ok(view.players.every((player) => player.canRise && player.canDrop));
  preview = logic.shiftOrbit(preview, 0, -1);
  view = logic.getViewModel(preview);
  assert.equal(view.players[0].cooldownRatio, 1);
  assert.equal(view.players[0].canDrop, false);
  assert.equal(view.players[0].canRise, false);
  assert.equal(view.targetScore, 5);
  assert.equal(view.winnerIndex, null);
});
