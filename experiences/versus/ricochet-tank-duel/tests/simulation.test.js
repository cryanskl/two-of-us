"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const simulation = require("../js/simulation.js");
const constants = require("../js/constants.js");
const fixed = require("../js/fixed.js");

const clone = (value) => JSON.parse(JSON.stringify(value));
const bit = constants.INPUT_BITS;
const fp = fixed.toFp;

function playing(fields = {}) {
  const raw = clone(simulation.createInitialState());
  Object.assign(raw, {
    phase: "playing",
    phaseTicksRemaining: 0,
    pauseReason: null,
    semanticEvents: [],
    ...fields,
  });
  return simulation.validateState(raw);
}

function withBullet(state, bullet, fields = {}) {
  const raw = clone(state);
  raw.bullets = [bullet];
  raw.nextBulletId = Math.max(
    raw.nextBulletId,
    bullet.id + (bullet.id % 2 === 1 ? 2 : 1),
  );
  Object.assign(raw, fields);
  return simulation.validateState(raw);
}

function bullet(fields = {}) {
  const ownerId = fields.ownerId === undefined ? 0 : fields.ownerId;
  return {
    id: fields.id === undefined ? ownerId + 1 : fields.id,
    ownerId,
    xFp: fp(500),
    yFp: fp(300),
    vxFp: fp(9),
    vyFp: 0,
    ageTicks: 0,
    reflectionCount: 0,
    ...fields,
  };
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

test("公开 API、初态与五项实时增量契约递归冻结", () => {
  for (const name of [
    "createInitialState",
    "validateState",
    "step",
    "applyCommand",
    "resolveTankMotion",
    "tryCreateBullet",
    "simulateBulletTick",
    "simulatePlayingTick",
    "normalizeState",
    "hashState",
    "replay",
    "mirrorState",
    "mirrorAction",
  ]) assert.equal(typeof simulation[name], "function", `missing simulation.${name}`);
  const state = simulation.createInitialState();
  assert.equal(state.version, 1);
  assert.equal(state.phase, "instructions");
  assert.deepEqual(state.scores, [0, 0]);
  assert.deepEqual(state.tanks.map(({ xFp, yFp, heading }) => ({ xFp, yFp, heading })), [
    { xFp: fp(150), yFp: fp(300), heading: 0 },
    { xFp: fp(810), yFp: fp(300), heading: 16 },
  ]);
  assert.deepEqual(state.bullets, []);
  assertDeepFrozen(state);
  assertDeepFrozen(simulation);
});

test("START 与 180 tick 倒计时没有首个 playing tick 的 off-by-one", () => {
  let state = simulation.applyCommand(simulation.createInitialState(), { type: "START" });
  assert.equal(state.phase, "countdown");
  assert.equal(state.phaseTicksRemaining, 180);
  for (let tick = 0; tick < 179; tick += 1) {
    state = simulation.step(state, { leftMask: bit.FORWARD, rightMask: bit.FORWARD });
  }
  assert.equal(state.phase, "countdown");
  assert.equal(state.phaseTicksRemaining, 1);
  const before = state.tanks;
  state = simulation.step(state, { leftMask: bit.FORWARD, rightMask: bit.FORWARD });
  assert.equal(state.phase, "playing");
  assert.equal(state.activeMatchTicks, 0);
  assert.deepEqual(state.tanks, before);
});

test("车辆先转向再移动，相反输入抵消且双方意图同刻提交", () => {
  const state = playing();
  const turned = simulation.resolveTankMotion(
    state.tanks[0],
    bit.TURN_RIGHT | bit.FORWARD,
    0,
  );
  assert.equal(turned.tank.heading, 1);
  assert.ok(turned.tank.xFp > state.tanks[0].xFp);
  assert.ok(turned.tank.yFp > state.tanks[0].yFp);

  const cancelled = simulation.resolveTankMotion(
    state.tanks[0],
    bit.FORWARD | bit.REVERSE | bit.TURN_LEFT | bit.TURN_RIGHT,
    0,
  );
  assert.deepEqual(cancelled.tank, state.tanks[0]);

  const next = simulation.simulatePlayingTick(state, {
    leftMask: bit.FORWARD,
    rightMask: bit.FORWARD,
  });
  assert.equal(next.tanks[0].xFp, state.tanks[0].xFp + fp(3));
  assert.equal(next.tanks[1].xFp, state.tanks[1].xFp - fp(3));
});

test("车体不能越活动区或穿墙，滑墙路径覆盖完整 tick", () => {
  const raw = clone(playing());
  raw.tanks[0].xFp = fp(282);
  raw.tanks[0].yFp = fp(200);
  raw.tanks[0].heading = 4;
  const state = simulation.validateState(raw);
  const moved = simulation.resolveTankMotion(state.tanks[0], bit.FORWARD, 0);
  assert.ok(moved.tank.xFp <= fp(282));
  assert.ok(moved.tank.yFp > state.tanks[0].yFp);
  assert.deepEqual(moved.path[0].t0, { num: 0, den: 1 });
  assert.deepEqual(moved.path.at(-1).t1, { num: 1, den: 1 });

  raw.tanks[0].xFp = fp(48);
  raw.tanks[0].yFp = fp(300);
  raw.tanks[0].heading = 16;
  const edge = simulation.resolveTankMotion(
    simulation.validateState(raw).tanks[0],
    bit.FORWARD,
    0,
  );
  assert.equal(edge.tank.xFp, fp(48));
});

test("双方同 tick 发射，创建弹参与当前 tick、年龄为 1、冷却为 23", () => {
  const state = simulation.simulatePlayingTick(playing(), {
    leftMask: bit.FIRE_HELD | bit.FIRE_EDGE,
    rightMask: bit.FIRE_HELD | bit.FIRE_EDGE,
  });
  assert.deepEqual(state.bullets.map((item) => item.ownerId), [0, 1]);
  assert.deepEqual(state.bullets.map((item) => item.id), [1, 2]);
  assert.deepEqual(state.bullets.map((item) => item.ageTicks), [1, 1]);
  assert.deepEqual(state.tanks.map((tank) => tank.cooldownTicks), [23, 23]);
  assert.equal(state.bullets[0].xFp, fp(186));
  assert.equal(state.bullets[1].xFp, fp(774));
});

test("单方发射仍按席位占用成对 ID，下一批始终从奇数基址开始", () => {
  const left = simulation.simulatePlayingTick(playing(), {
    leftMask: bit.FIRE_EDGE,
    rightMask: 0,
  });
  assert.deepEqual(left.bullets.map(({ id, ownerId }) => ({ id, ownerId })), [
    { id: 1, ownerId: 0 },
  ]);
  assert.equal(left.nextBulletId, 3);

  const right = simulation.simulatePlayingTick(playing(), {
    leftMask: 0,
    rightMask: bit.FIRE_EDGE,
  });
  assert.deepEqual(right.bullets.map(({ id, ownerId }) => ({ id, ownerId })), [
    { id: 2, ownerId: 1 },
  ]);
  assert.equal(right.nextBulletId, 3);
});

test("发射只吃 FIRE_EDGE，冷却与每方两枚上限不受 held 或顺序影响", () => {
  let state = simulation.simulatePlayingTick(playing(), {
    leftMask: bit.FIRE_HELD,
    rightMask: 0,
  });
  assert.equal(state.bullets.length, 0);
  state = simulation.simulatePlayingTick(state, {
    leftMask: bit.FIRE_HELD | bit.FIRE_EDGE,
    rightMask: 0,
  });
  assert.equal(state.bullets.length, 1);
  const afterFirst = state;
  state = simulation.simulatePlayingTick(state, {
    leftMask: bit.FIRE_HELD | bit.FIRE_EDGE,
    rightMask: 0,
  });
  assert.equal(state.bullets.length, 1);
  assert.equal(state.tanks[0].cooldownTicks, afterFirst.tanks[0].cooldownTicks - 1);

  const raw = clone(playing());
  raw.bullets = [
    bullet({ id: 7, xFp: fp(400) }),
    bullet({ id: 9, xFp: fp(420) }),
  ];
  raw.nextBulletId = 11;
  state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: bit.FIRE_EDGE,
    rightMask: 0,
  });
  assert.equal(state.bullets.filter((item) => item.ownerId === 0).length, 2);
});

test("贴墙的无效生成不产生弹体也不消耗冷却", () => {
  const raw = clone(playing());
  raw.tanks[0].xFp = fp(282);
  raw.tanks[0].yFp = fp(300);
  raw.tanks[0].heading = 0;
  const state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: bit.FIRE_EDGE,
    rightMask: 0,
  });
  assert.equal(state.bullets.length, 0);
  assert.equal(state.tanks[0].cooldownTicks, 0);
  assert.ok(state.semanticEvents.some((event) => event.type === "fire-blocked" && event.ownerId === 0));
});

test("移动目标使用相对 sweep，不能退化为只检查目标终点或静态圆", () => {
  const movingFixture = withBullet(
    playing(),
    bullet({ xFp: fp(776), yFp: fp(300) }),
  );
  const staticResult = simulation.simulatePlayingTick(movingFixture, {
    leftMask: 0,
    rightMask: 0,
  });
  assert.deepEqual(staticResult.scores, [0, 0]);
  const movingResult = simulation.simulatePlayingTick(movingFixture, {
    leftMask: 0,
    rightMask: bit.FORWARD,
  });
  assert.deepEqual(movingResult.scores, [1, 0]);
});

test("弹体不自伤、互相穿过，多枚在途弹各自推进", () => {
  const raw = clone(playing());
  raw.bullets = [
    bullet({ id: 1, ownerId: 0, xFp: fp(120), vxFp: fp(9) }),
    bullet({ id: 2, ownerId: 1, xFp: fp(500), vxFp: fp(-9) }),
    bullet({ id: 3, ownerId: 0, xFp: fp(500), vxFp: fp(9) }),
  ];
  raw.nextBulletId = 5;
  const state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.deepEqual(state.scores, [0, 0]);
  assert.equal(state.bullets.length, 3);
  assert.equal(state.bullets.find((item) => item.id === 1).xFp, fp(129));
  assert.equal(state.bullets.find((item) => item.id === 2).xFp, fp(491));
  assert.equal(state.bullets.find((item) => item.id === 3).xFp, fp(509));
});

test("外边界可连续折射，第三次继续而第四次接触前销毁", () => {
  let state = withBullet(
    playing(),
    bullet({ xFp: fp(935), vxFp: fp(9), reflectionCount: 2 }),
  );
  state = simulation.simulatePlayingTick(state, { leftMask: 0, rightMask: 0 });
  assert.equal(state.bullets.length, 1);
  assert.equal(state.bullets[0].reflectionCount, 3);
  assert.equal(state.bullets[0].vxFp, fp(-9));

  const raw = clone(state);
  raw.bullets[0].xFp = fp(25);
  raw.bullets[0].vxFp = fp(-9);
  state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.equal(state.bullets.length, 0);
  assert.ok(state.semanticEvents.some(
    (event) => event.type === "bullet-destroyed" && event.reason === "reflection-cap",
  ));
});

test("命中与墙精确同刻时命中优先，不再反射", () => {
  const result = simulation.simulateBulletTick(
    bullet({ xFp: fp(600), yFp: fp(300), vxFp: fp(30) }),
    {
      id: 1,
      xFp: fp(638),
      yFp: fp(300),
    },
    [{
      t0: { num: 0, den: 1 },
      t1: { num: 1, den: 1 },
      start: { xFp: fp(638), yFp: fp(300) },
      end: { xFp: fp(638), yFp: fp(300) },
    }],
  );
  assert.equal(result.hitTargetId, 1);
  assert.equal(result.destroyReason, "hit");
  assert.equal(result.bullet, null);
});

test("合成高速夹具允许前四接触，第五候选处理前 contact-cap", () => {
  const result = simulation.simulateBulletTick(
    bullet({ xFp: fp(500), yFp: fp(50), vxFp: fp(5000) }),
    null,
    [],
    { maxReflections: 99 },
  );
  assert.equal(result.bullet, null);
  assert.equal(result.destroyReason, "contact-cap");
  assert.equal(result.contactsProcessed, 4);
});

test("第 360 个活跃 tick 才寿命销毁，暂停与倒计时不增加年龄", () => {
  let state = withBullet(playing(), bullet({ ageTicks: 358 }));
  state = simulation.simulatePlayingTick(state, { leftMask: 0, rightMask: 0 });
  assert.equal(state.bullets[0].ageTicks, 359);
  state = simulation.simulatePlayingTick(state, { leftMask: 0, rightMask: 0 });
  assert.equal(state.bullets.length, 0);
  assert.ok(state.semanticEvents.some((event) => event.reason === "lifetime"));

  const countdown = clone(state);
  countdown.phase = "countdown";
  countdown.phaseTicksRemaining = 10;
  countdown.bullets = [bullet({ ageTicks: 20 })];
  countdown.nextBulletId = 3;
  const frozen = simulation.step(simulation.validateState(countdown), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.equal(frozen.bullets[0].ageTicks, 20);
});

test("双方命中先全部收集再原子计分，同目标多弹只计一分", () => {
  const raw = clone(playing());
  raw.bullets = [
    bullet({ id: 1, ownerId: 0, xFp: fp(780), vxFp: fp(9) }),
    bullet({ id: 3, ownerId: 0, xFp: fp(779), vxFp: fp(9) }),
    bullet({ id: 2, ownerId: 1, xFp: fp(180), vxFp: fp(-9) }),
  ];
  raw.nextBulletId = 5;
  const state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.deepEqual(state.scores, [1, 1]);
  assert.equal(state.phase, "round-result");
  assert.equal(state.phaseTicksRemaining, 90);
  assert.equal(state.lastRoundResult, "both-hit");
  assert.equal(state.bullets.length, 0);
  assert.equal(state.activeMatchTicks, 1);
});

test("双方同 tick 到三分是平局，90 tick 后才进入 match-result", () => {
  const raw = clone(playing({ scores: [2, 2] }));
  raw.bullets = [
    bullet({ id: 1, ownerId: 0, xFp: fp(780), vxFp: fp(9) }),
    bullet({ id: 2, ownerId: 1, xFp: fp(180), vxFp: fp(-9) }),
  ];
  raw.nextBulletId = 3;
  let state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.deepEqual(state.scores, [3, 3]);
  assert.equal(state.pendingMatchResult, "draw");
  for (let tick = 0; tick < 89; tick += 1) {
    state = simulation.step(state, { leftMask: 0, rightMask: 0 });
  }
  assert.equal(state.phase, "round-result");
  state = simulation.step(state, { leftMask: 0, rightMask: 0 });
  assert.equal(state.phase, "match-result");
  assert.equal(state.matchResult, "draw");
});

test("第 5400 个 playing tick 无条件计时，先结算命中再判时间结果", () => {
  const raw = clone(playing({ activeMatchTicks: 5399, scores: [1, 2] }));
  raw.bullets = [bullet({ ownerId: 0, xFp: fp(780), vxFp: fp(9) })];
  raw.nextBulletId = 3;
  const state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.equal(state.activeMatchTicks, 5400);
  assert.deepEqual(state.scores, [2, 2]);
  assert.equal(state.pendingMatchResult, "draw");
  assert.equal(state.phase, "round-result");
});

test("单方到三分按赢家结算，90 秒无命中覆盖领先和平局", () => {
  let raw = clone(playing({ scores: [2, 1] }));
  raw.bullets = [bullet({ ownerId: 0, xFp: fp(780), vxFp: fp(9) })];
  raw.nextBulletId = 3;
  let state = simulation.simulatePlayingTick(simulation.validateState(raw), {
    leftMask: 0,
    rightMask: 0,
  });
  assert.deepEqual(state.scores, [3, 1]);
  assert.equal(state.pendingMatchResult, "left");

  state = simulation.simulatePlayingTick(
    playing({ activeMatchTicks: 5399, scores: [2, 1] }),
    { leftMask: 0, rightMask: 0 },
  );
  assert.equal(state.phase, "match-result");
  assert.equal(state.matchResult, "left");

  state = simulation.simulatePlayingTick(
    playing({ activeMatchTicks: 5399, scores: [1, 1] }),
    { leftMask: 0, rightMask: 0 },
  );
  assert.equal(state.phase, "match-result");
  assert.equal(state.matchResult, "draw");
});

test("暂停只接受 countdown/playing，恢复完整倒计时且冻结全部玩法计数", () => {
  const live = withBullet(playing({ activeMatchTicks: 12 }), bullet({ ageTicks: 20 }));
  const paused = simulation.applyCommand(live, { type: "PAUSE", reason: "manual" });
  assert.equal(paused.phase, "paused");
  assert.equal(paused.pauseReason, "manual");
  const same = simulation.step(paused, { leftMask: bit.FORWARD, rightMask: bit.FIRE_EDGE });
  assert.equal(same, paused);
  const resumed = simulation.applyCommand(paused, { type: "RESUME" });
  assert.equal(resumed.phase, "countdown");
  assert.equal(resumed.phaseTicksRemaining, 180);
  assert.equal(resumed.activeMatchTicks, 12);
  assert.equal(resumed.bullets[0].ageTicks, 20);
  assert.equal(simulation.applyCommand(simulation.createInitialState(), {
    type: "PAUSE",
    reason: "manual",
  }).phase, "instructions");
});

test("state 严拒绝额外键、非法 heading、重复 ID 和每席超过两弹", () => {
  const extra = clone(simulation.createInitialState());
  extra.extra = true;
  assert.throws(() => simulation.validateState(extra), /state|schema|key/i);
  assert.deepEqual(
    simulation.applyCommand(extra, { type: "START" }),
    simulation.createInitialState(),
  );

  const heading = clone(playing());
  heading.tanks[0].heading = 32;
  assert.throws(() => simulation.validateState(heading), /heading/i);

  const duplicate = clone(playing());
  duplicate.bullets = [
    bullet({ id: 1, xFp: fp(400) }),
    bullet({ id: 1, xFp: fp(420) }),
  ];
  duplicate.nextBulletId = 3;
  assert.throws(() => simulation.validateState(duplicate), /duplicate|bullet/i);

  const excess = clone(playing());
  excess.bullets = [
    bullet({ id: 1, xFp: fp(400) }),
    bullet({ id: 3, xFp: fp(420) }),
    bullet({ id: 5, xFp: fp(440) }),
  ];
  excess.nextBulletId = 7;
  assert.throws(() => simulation.validateState(excess), /bullet|owner|limit/i);

  const wrongSeatId = clone(playing());
  wrongSeatId.bullets = [bullet({ id: 2, ownerId: 0 })];
  wrongSeatId.nextBulletId = 3;
  assert.throws(() => simulation.validateState(wrongSeatId), /id.*owner|owner.*id/i);

  const evenPairBase = clone(playing());
  evenPairBase.nextBulletId = 2;
  assert.throws(() => simulation.validateState(evenPairBase), /nextBulletId.*odd|pair base/i);

  const exhaustedIds = clone(playing());
  exhaustedIds.nextBulletId = Number.MAX_SAFE_INTEGER - 2;
  const exhaustedState = simulation.validateState(exhaustedIds);
  assert.doesNotThrow(() => simulation.simulatePlayingTick(exhaustedState, {
    leftMask: bit.FIRE_EDGE,
    rightMask: bit.FIRE_EDGE,
  }));
});

test("step 即使收到畸形 input frame 也先关闭非法 state", () => {
  const hostileState = { attackerControlled: true };
  const malformedFrame = { leftMask: 0 };
  assert.deepEqual(
    simulation.step(hostileState, malformedFrame),
    simulation.createInitialState(),
  );

  const valid = playing();
  assert.equal(simulation.step(valid, malformedFrame), valid);
});

test("输入数组顺序变化会按稳定 ID 规范化，不改变原子计分与哈希", () => {
  const raw = clone(playing());
  raw.bullets = [
    bullet({ id: 8, ownerId: 1, xFp: fp(180), vxFp: fp(-9) }),
    bullet({ id: 3, ownerId: 0, xFp: fp(780), vxFp: fp(9) }),
  ];
  raw.nextBulletId = 9;
  const canonical = simulation.validateState(raw);
  const reversedRaw = clone(raw);
  reversedRaw.bullets.reverse();
  reversedRaw.tanks.reverse();
  const reversed = simulation.validateState(reversedRaw);
  assert.equal(simulation.hashState(canonical), simulation.hashState(reversed));
  const input = { leftMask: 0, rightMask: 0 };
  assert.deepEqual(
    simulation.simulatePlayingTick(canonical, input),
    simulation.simulatePlayingTick(reversed, input),
  );
});

test("规范 state 只接受 32 档冻结弹速，校验通过后必能安全推进", () => {
  const velocityKeys = new Set(constants.DIRECTION_VECTORS.map((direction) => {
    const vxFp = fixed.mulQ10(constants.RULES.BULLET_SPEED_FP, direction.x);
    const vyFp = fixed.mulQ10(constants.RULES.BULLET_SPEED_FP, direction.y);
    return `${vxFp},${vyFp}`;
  }));
  for (const direction of constants.DIRECTION_VECTORS) {
    const vxFp = fixed.mulQ10(constants.RULES.BULLET_SPEED_FP, direction.x);
    const vyFp = fixed.mulQ10(constants.RULES.BULLET_SPEED_FP, direction.y);
    assert.equal(velocityKeys.has(`${-vxFp},${vyFp}`), true);
    assert.equal(velocityKeys.has(`${vxFp},${-vyFp}`), true);
    const raw = clone(playing());
    raw.bullets = [bullet({
      vxFp,
      vyFp,
    })];
    raw.nextBulletId = 3;
    const accepted = simulation.validateState(raw);
    assert.doesNotThrow(() => simulation.simulatePlayingTick(
      accepted,
      { leftMask: 0, rightMask: 0 },
    ));
  }

  const hostile = clone(playing());
  hostile.bullets = [bullet({
    vxFp: Number.MAX_SAFE_INTEGER,
    vyFp: 1,
  })];
  hostile.nextBulletId = 3;
  assert.throws(() => simulation.validateState(hostile), /bullet.*velocity/i);
});

test("结果字段、弹体集合与 phase 必须满足交叉不变量", () => {
  const pendingOutsideRound = clone(playing());
  pendingOutsideRound.pendingMatchResult = "left";
  assert.throws(
    () => simulation.validateState(pendingOutsideRound),
    /pending.*round-result/i,
  );

  const matchOutsideTerminal = clone(playing());
  matchOutsideTerminal.matchResult = "left";
  assert.throws(
    () => simulation.validateState(matchOutsideTerminal),
    /match result.*match-result/i,
  );

  const round = clone(playing());
  Object.assign(round, {
    phase: "round-result",
    phaseTicksRemaining: 90,
    lastRoundResult: "left-hit",
  });
  assert.doesNotThrow(() => simulation.validateState(round));
  round.lastRoundResult = null;
  assert.throws(() => simulation.validateState(round), /round-result.*last/i);
  round.lastRoundResult = "left-hit";
  round.bullets = [bullet()];
  round.nextBulletId = 3;
  assert.throws(() => simulation.validateState(round), /round-result.*bullets/i);

  const terminal = clone(playing());
  Object.assign(terminal, {
    phase: "match-result",
    scores: [3, 0],
    matchResult: "left",
  });
  assert.doesNotThrow(() => simulation.validateState(terminal));
  terminal.bullets = [bullet()];
  terminal.nextBulletId = 3;
  assert.throws(() => simulation.validateState(terminal), /match-result.*bullets/i);
});

test("phase、比分、时间与终局结果必须来自可达状态", () => {
  const playingAtTimeCap = clone(playing());
  playingAtTimeCap.activeMatchTicks = constants.RULES.MATCH_ACTIVE_TICKS;
  assert.throws(
    () => simulation.validateState(playingAtTimeCap),
    /playing.*time|nonterminal.*time/i,
  );

  const playingAtTarget = clone(playing());
  playingAtTarget.scores = [constants.RULES.TARGET_SCORE, 0];
  assert.throws(
    () => simulation.validateState(playingAtTarget),
    /playing.*score|nonterminal.*score/i,
  );

  const legalPlayingBoundary = clone(playing());
  legalPlayingBoundary.activeMatchTicks = constants.RULES.MATCH_ACTIVE_TICKS - 1;
  legalPlayingBoundary.scores = [constants.RULES.TARGET_SCORE - 1, constants.RULES.TARGET_SCORE - 1];
  assert.doesNotThrow(() => simulation.validateState(legalPlayingBoundary));

  const countdownAtTarget = clone(playingAtTarget);
  countdownAtTarget.phase = "countdown";
  countdownAtTarget.phaseTicksRemaining = constants.RULES.COUNTDOWN_TICKS;
  assert.throws(
    () => simulation.validateState(countdownAtTarget),
    /countdown.*score|nonterminal.*score/i,
  );

  const pausedAtTimeCap = clone(playingAtTimeCap);
  pausedAtTimeCap.phase = "paused";
  pausedAtTimeCap.pauseReason = "manual";
  assert.throws(
    () => simulation.validateState(pausedAtTimeCap),
    /paused.*time|nonterminal.*time/i,
  );
  const legalPausedBoundary = clone(legalPlayingBoundary);
  legalPausedBoundary.phase = "paused";
  legalPausedBoundary.pauseReason = "manual";
  assert.doesNotThrow(() => simulation.validateState(legalPausedBoundary));

  const legalInterRoundCountdown = clone(playing());
  Object.assign(legalInterRoundCountdown, {
    phase: "countdown",
    phaseTicksRemaining: constants.RULES.COUNTDOWN_TICKS,
    activeMatchTicks: 123,
    scores: [1, 0],
    roundIndex: 2,
    lastRoundResult: "left-hit",
  });
  assert.doesNotThrow(() => simulation.validateState(legalInterRoundCountdown));

  const nonterminalRound = clone(playing());
  Object.assign(nonterminalRound, {
    phase: "round-result",
    phaseTicksRemaining: constants.RULES.ROUND_RESULT_TICKS,
    activeMatchTicks: 10,
    scores: [1, 0],
    lastRoundResult: "left-hit",
  });
  assert.doesNotThrow(() => simulation.validateState(nonterminalRound));
  nonterminalRound.pendingMatchResult = "left";
  assert.throws(
    () => simulation.validateState(nonterminalRound),
    /pending.*terminal|round-result.*pending/i,
  );

  const targetRound = clone(nonterminalRound);
  targetRound.scores = [constants.RULES.TARGET_SCORE, 0];
  targetRound.pendingMatchResult = null;
  assert.throws(
    () => simulation.validateState(targetRound),
    /round-result.*pending/i,
  );
  targetRound.pendingMatchResult = "right";
  assert.throws(
    () => simulation.validateState(targetRound),
    /pending.*scores|pending.*result/i,
  );
  targetRound.pendingMatchResult = "left";
  assert.doesNotThrow(() => simulation.validateState(targetRound));

  const timedRound = clone(nonterminalRound);
  timedRound.activeMatchTicks = constants.RULES.MATCH_ACTIVE_TICKS;
  timedRound.scores = [1, 2];
  timedRound.pendingMatchResult = "right";
  assert.doesNotThrow(() => simulation.validateState(timedRound));

  const terminal = clone(playing());
  Object.assign(terminal, {
    phase: "match-result",
    scores: [constants.RULES.TARGET_SCORE, 0],
    matchResult: "right",
  });
  assert.throws(
    () => simulation.validateState(terminal),
    /match result.*scores|match-result.*result/i,
  );
  terminal.matchResult = "left";
  assert.doesNotThrow(() => simulation.validateState(terminal));

  const timedDraw = clone(playing());
  Object.assign(timedDraw, {
    phase: "match-result",
    activeMatchTicks: constants.RULES.MATCH_ACTIVE_TICKS,
    scores: [2, 2],
    matchResult: "draw",
  });
  assert.doesNotThrow(() => simulation.validateState(timedDraw));

  const noTerminalReason = clone(playing());
  Object.assign(noTerminalReason, {
    phase: "match-result",
    scores: [1, 0],
    matchResult: "left",
  });
  assert.throws(
    () => simulation.validateState(noTerminalReason),
    /match-result.*terminal/i,
  );

  const forgedInstructions = clone(simulation.createInitialState());
  forgedInstructions.roundIndex = 2;
  assert.throws(
    () => simulation.validateState(forgedInstructions),
    /instructions.*initial/i,
  );
  assert.doesNotThrow(() => simulation.validateState(simulation.createInitialState()));
});
