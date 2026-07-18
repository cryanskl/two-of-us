import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.PAPER_PLANE_MAIL_LOGIC;

function aiming() {
  return logic.start(logic.createInitialState());
}

function launchAt(angle, power) {
  const prepared = logic.setAim(aiming(), { angle, power });
  return logic.launch(prepared);
}

test("世界、瞄准常量与力度映射稳定", () => {
  assert.deepEqual(logic.WORLD.start, { x: 90, y: 430 });
  assert.deepEqual(logic.WORLD.mailbox, { left: 835, right: 925, top: 330, bottom: 420 });
  assert.deepEqual(logic.AIM_LIMITS, {
    angle: { min: 12, max: 38 },
    power: { min: 0, max: 100 },
  });
  assert.equal(logic.FIXED_STEP, 1 / 120);
  assert.equal(logic.speedForPower(0), 245);
  assert.equal(logic.speedForPower(100), 400);
  assert.equal(logic.speedForPower(Number.NaN), logic.speedForPower(70));
});

test("配置整份回退、去空白且不共享调用方数组", () => {
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG));
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG.letterLines));
  const source = {
    recipientName: "  小满  ",
    senderName: " 阿岚 ",
    letterTitle: " 飞到了 ",
    letterLines: [" 第一段 ", " 第二段 "],
    signOff: " 继续出发 ",
    hintForMiss() { return "不参与数据配置"; },
  };
  const config = logic.sanitizeConfig(source);
  source.letterLines[0] = "被修改";
  assert.deepEqual(config, {
    recipientName: "小满",
    senderName: "阿岚",
    letterTitle: "飞到了",
    letterLines: ["第一段", "第二段"],
    signOff: "继续出发",
  });
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.letterLines));
  assert.equal(logic.sanitizeConfig({ ...source, letterLines: [] }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ ...source, recipientName: "" }), logic.DEFAULT_CONFIG);
});

test("intro 只能开始一次，瞄准取整钳制且状态递归冻结", () => {
  const initial = logic.createInitialState();
  const started = logic.start(initial);
  const clamped = logic.setAim(started, { angle: 99.6, power: -5.2 });
  assert.equal(initial.phase, "intro");
  assert.equal(started.phase, "aiming");
  assert.equal(logic.start(started), started);
  assert.equal(clamped.angle, 38);
  assert.equal(clamped.power, 0);
  assert.ok(Object.isFrozen(clamped));
  assert.ok(Object.isFrozen(clamped.plane));
  assert.equal(logic.setAim(clamped, { angle: 38, power: 0 }), clamped);
});

test("预览只覆盖前 0.85 秒且不改变权威状态", () => {
  const state = aiming();
  const points = logic.previewTrajectory(state);
  assert.equal(points.length, 8);
  assert.ok(points.every((point) => point.x > logic.WORLD.start.x && point.x < logic.WORLD.mailbox.left));
  assert.ok(points.every(Object.isFrozen));
  assert.ok(Object.isFrozen(points));
  assert.equal(state.elapsed, 0);
  assert.deepEqual(state.plane, { x: 90, y: 430, vx: 0, vy: 0, rotation: -20 });
  assert.deepEqual(logic.previewTrajectory(logic.launch(state)), []);
});

test("默认 20° / 70 确定命中且逐步与一次演算完全一致", () => {
  const launched = launchAt(20, 70);
  let stepped = launched;
  while (stepped.phase === "flying") stepped = logic.step(stepped);
  const finished = logic.finishFlight(launched);
  assert.deepEqual(finished, stepped);
  assert.equal(finished.phase, "arrived");
  assert.equal(finished.lastOutcome.reason, "arrived");
  assert.equal(finished.plane.x, logic.WORLD.mailbox.left);
  assert.ok(finished.plane.y >= logic.WORLD.mailbox.top);
  assert.ok(finished.plane.y <= logic.WORLD.mailbox.bottom);
  assert.ok(Math.abs(finished.elapsed - 2.24275089248814) < 1e-12);
});

test("连续线段碰撞能命中窄目标并拒绝完全绕开的线", () => {
  const rect = { left: 10, right: 20, top: 30, bottom: 40 };
  assert.equal(logic.segmentRectEntry({ x: 0, y: 35 }, { x: 30, y: 35 }, rect), 1 / 3);
  assert.equal(logic.segmentRectEntry({ x: 15, y: 0 }, { x: 15, y: 60 }, rect), 0.5);
  assert.equal(logic.segmentRectEntry({ x: 0, y: 20 }, { x: 30, y: 20 }, rect), null);
  assert.equal(logic.segmentRectEntry(null, { x: 1, y: 1 }, rect), null);
});

test("低力度、低角高力度和高角分别得到 short、low、high", () => {
  const short = logic.finishFlight(launchAt(20, 0));
  const low = logic.finishFlight(launchAt(12, 100));
  const high = logic.finishFlight(launchAt(38, 70));
  assert.deepEqual([short.phase, short.missReason], ["missed", "short"]);
  assert.deepEqual([low.phase, low.missReason], ["missed", "low"]);
  assert.deepEqual([high.phase, high.missReason], ["missed", "high"]);
  assert.equal(short.lastOutcome.attemptNumber, 1);
  assert.equal(low.lastOutcome.angle, 12);
  assert.equal(high.lastOutcome.power, 70);
});

test("失败重试保留瞄准并递增尝试，飞行中与终局不能改瞄准", () => {
  const missed = logic.finishFlight(launchAt(20, 0));
  const flying = logic.launch(aiming());
  assert.equal(logic.setAim(flying, { angle: 30 }), flying);
  const retried = logic.retry(missed);
  assert.equal(retried.phase, "aiming");
  assert.equal(retried.attemptNumber, 2);
  assert.equal(retried.angle, 20);
  assert.equal(retried.power, 0);
  assert.equal(retried.missReason, null);
  assert.equal(logic.retry(retried), retried);
  assert.equal(logic.step(missed), missed);
});

test("送达后只能主动揭信，重开移除旧结果并回到第一次", () => {
  const arrived = logic.finishFlight(launchAt(20, 70));
  const revealed = logic.reveal(arrived);
  const restarted = logic.restart(revealed);
  assert.equal(revealed.phase, "revealed");
  assert.equal(logic.reveal(revealed), revealed);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.attemptNumber, 1);
  assert.equal(restarted.lastOutcome, null);
  assert.ok(restarted.revision > revealed.revision);
  assert.equal(logic.restart(arrived), arrived);
});

test("自定义提示获得冻结上下文，异常和非法结果安全回退", () => {
  let received;
  const custom = logic.resolveHint((context) => {
    received = context;
    return "  再给它一点勇气。  ";
  }, { attemptNumber: 2, missReason: "short", angle: 20, power: 0 });
  assert.equal(custom, "再给它一点勇气。");
  assert.ok(Object.isFrozen(received));
  assert.equal(logic.resolveHint(() => { throw new Error("坏策略"); }, {
    attemptNumber: 3, missReason: "high", angle: 38, power: 70,
  }), "邮差密语：20°、70 格是一条稳妥航线。");
  assert.match(logic.resolveHint(() => "x".repeat(101), {
    attemptNumber: 1, missReason: "low", angle: 12, power: 100,
  }), /下沿/);
});

test("畸形状态安全回初始，合法状态的非法操作保持原引用", () => {
  const initial = logic.createInitialState();
  assert.equal(logic.start({ broken: true }).phase, "intro");
  assert.equal(logic.step({ broken: true }).phase, "intro");
  assert.equal(logic.retry(initial), initial);
  assert.equal(logic.reveal(initial), initial);
  assert.equal(logic.restart(initial), initial);
  assert.equal(logic.setAim(initial, { angle: 30 }), initial);
  assert.equal(logic.isFlightState(initial), true);
  assert.equal(logic.isFlightState({ ...initial, plane: { x: Number.NaN } }), false);
});
