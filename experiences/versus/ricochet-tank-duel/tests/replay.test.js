"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const simulation = require("../js/simulation.js");
const constants = require("../js/constants.js");

const bit = constants.INPUT_BITS;

function makeLog() {
  const actions = [{ type: "START" }];
  for (let tick = 0; tick < 180; tick += 1) {
    actions.push({ type: "STEP", leftMask: 0, rightMask: 0 });
  }
  actions.push(
    { type: "STEP", leftMask: bit.FORWARD | bit.TURN_RIGHT, rightMask: bit.FORWARD | bit.TURN_LEFT },
    { type: "STEP", leftMask: bit.FIRE_EDGE, rightMask: bit.FIRE_EDGE },
    { type: "PAUSE", reason: "manual" },
    { type: "RESUME" },
  );
  return actions;
}

test("严格动作联合可 JSON 重放，固定日志 100 次状态与哈希一致", () => {
  const log = makeLog();
  const expected = simulation.replay(JSON.parse(JSON.stringify(log)));
  const expectedHash = simulation.hashState(expected);
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const actual = simulation.replay(log);
    assert.deepEqual(simulation.normalizeState(actual), simulation.normalizeState(expected));
    assert.equal(simulation.hashState(actual), expectedHash);
  }
});

test("重放拒绝未知动作、额外键、非法 bit、reason 和日志形状", () => {
  for (const log of [
    null,
    {},
    [{ type: "UNKNOWN" }],
    [{ type: "START", extra: true }],
    [{ type: "STEP", leftMask: 64, rightMask: 0 }],
    [{ type: "PAUSE", reason: "browser-message" }],
    [{ type: "RESUME", extra: 1 }],
  ]) assert.throws(() => simulation.replay(log), /action|log|mask|reason|schema/i);
});

test("镜像动作交换玩家与左右转，二次镜像恢复原动作", () => {
  const action = {
    type: "STEP",
    leftMask: bit.FORWARD | bit.TURN_LEFT | bit.FIRE_EDGE,
    rightMask: bit.REVERSE | bit.TURN_RIGHT,
  };
  const mirrored = simulation.mirrorAction(action);
  assert.equal(mirrored.leftMask, bit.REVERSE | bit.TURN_LEFT);
  assert.equal(mirrored.rightMask, bit.FORWARD | bit.TURN_RIGHT | bit.FIRE_EDGE);
  assert.deepEqual(simulation.mirrorAction(mirrored), action);
});

test("状态镜像交换玩家、弹体所有者和 x/vx，二次镜像严格恢复", () => {
  const state = simulation.replay(makeLog());
  const mirrored = simulation.mirrorState(state);
  assert.equal(mirrored.tanks[0].xFp + state.tanks[1].xFp, 960 * 1024);
  assert.equal(mirrored.tanks[0].heading, constants.mirrorHeading(state.tanks[1].heading));
  assert.deepEqual(simulation.mirrorState(mirrored), state);
});

test("RESTART 从终局清空比分、时间、弹体、ID、结果并进入完整倒计时", () => {
  const raw = JSON.parse(JSON.stringify(simulation.createInitialState()));
  Object.assign(raw, {
    phase: "match-result",
    scores: [3, 1],
    activeMatchTicks: 812,
    matchResult: "left",
    lastRoundResult: "left-hit",
    pendingMatchResult: null,
    roundIndex: 4,
    nextBulletId: 19,
  });
  const terminal = simulation.validateState(raw);
  const restarted = simulation.applyCommand(terminal, { type: "RESTART" });
  assert.equal(restarted.phase, "countdown");
  assert.equal(restarted.phaseTicksRemaining, 180);
  assert.deepEqual(restarted.scores, [0, 0]);
  assert.equal(restarted.activeMatchTicks, 0);
  assert.equal(restarted.nextBulletId, 1);
  assert.equal(restarted.roundIndex, 1);
  assert.equal(restarted.lastRoundResult, null);
  assert.equal(restarted.matchResult, null);
  assert.deepEqual(restarted.bullets, []);
});

test("规范化与哈希排除语义文案，保留全部逻辑字段和稳定 ID 顺序", () => {
  const state = simulation.replay(makeLog());
  const raw = JSON.parse(JSON.stringify(state));
  raw.semanticEvents = [{ type: "debug", text: "渲染文案不同" }];
  const changedText = simulation.validateState(raw);
  assert.deepEqual(simulation.normalizeState(changedText), simulation.normalizeState(state));
  assert.equal(simulation.hashState(changedText), simulation.hashState(state));
});

test("纯核心无 DOM、真实时间、随机、网络或存储依赖", () => {
  const source = readFileSync(require.resolve("../js/simulation.js"), "utf8");
  for (const forbidden of [
    "document",
    "window.",
    "performance",
    "Date.",
    "Math.random",
    "fetch(",
    "localStorage",
    "sessionStorage",
    "XMLHttpRequest",
  ]) assert.equal(source.includes(forbidden), false, `forbidden runtime dependency: ${forbidden}`);
});
