import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

await import("./config.js");
await import("./logic.js");

const config = globalThis.MOON_PHASE_SECRET_CONFIG;
const logic = globalThis.MOON_PHASE_SECRET_LOGIC;

function validConfig(overrides = {}) {
  return {
    targetDate: "2024-02-29",
    recipientName: "  给你  ",
    finalTitle: "那一天",
    finalMessage: "这是一段只在完成后出现的话。",
    clues: ["冬天还没走远。", "这个月多出来一天。", "月亮记得它自己的位置。"],
    composeClues() { return null; },
    ...overrides,
  };
}

function calibrating(customConfig = validConfig()) {
  return logic.start(logic.createInitialState(customConfig));
}

function selectTarget(state) {
  let current = logic.adjustMonth(state, state.target.month - state.selectedMonth);
  current = logic.adjustDay(current, state.target.day - current.selectedDay);
  return logic.adjustMoonPhase(current, state.target.phaseIndex - current.selectedPhaseIndex);
}

test("config.js 与逻辑 API 采用经典全局并递归冻结", () => {
  assert.ok(config);
  assert.ok(logic);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.clues));
  assert.ok(Object.isFrozen(config.composeClues));
  assert.ok(Object.isFrozen(logic));
  assert.ok(Object.isFrozen(logic.PHASE_NAMES));
  assert.deepEqual(logic.PHASE_NAMES, ["新月", "蛾眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"]);
});

test("严格解析公历日期、闰年和当月天数", () => {
  assert.deepEqual(logic.parseDate("2000-02-29"), { year: 2000, month: 2, day: 29 });
  assert.equal(logic.parseDate("1900-02-29"), null);
  assert.equal(logic.parseDate("2024-02-30"), null);
  assert.equal(logic.parseDate("2024-2-09"), null);
  assert.equal(logic.parseDate("1899-12-31"), null);
  assert.equal(logic.parseDate("2100-01-01"), null);
  assert.equal(logic.isLeapYear(2000), true);
  assert.equal(logic.isLeapYear(1900), false);
  assert.equal(logic.isLeapYear(2024), true);
  assert.equal(logic.daysInMonth(2024, 2), 29);
  assert.equal(logic.daysInMonth(2023, 2), 28);
  assert.equal(logic.daysInMonth(2024, 4), 30);
});

test("NASA 参考月四个抽样稳定落入新月、上弦、满月和下弦", () => {
  assert.equal(logic.getMoonPhaseIndex("2000-01-06"), 0);
  assert.equal(logic.getMoonPhaseIndex("2000-01-14"), 2);
  assert.equal(logic.getMoonPhaseIndex("2000-01-21"), 4);
  assert.equal(logic.getMoonPhaseIndex("2000-01-28"), 6);
});

test("UTC 正午月相在独立的不同时区 Node 进程结果一致", () => {
  const logicUrl = new URL("./logic.js", import.meta.url).href;
  const script = `await import(${JSON.stringify(logicUrl)}); process.stdout.write(String(globalThis.MOON_PHASE_SECRET_LOGIC.getMoonPhaseIndex("2024-05-20")));`;
  const results = ["UTC", "Asia/Shanghai", "Pacific/Honolulu"].map((timeZone) => execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { env: { ...process.env, TZ: timeZone }, encoding: "utf8" },
  ));
  assert.deepEqual(new Set(results).size, 1);
});

test("完整配置白名单、基础字段整份回退与调用方所有权隔离", () => {
  const source = validConfig();
  const result = logic.sanitizeConfig(source);
  source.clues[0] = "被调用方修改";
  assert.equal(result.recipientName, "给你");
  assert.equal(result.clues[0], "冬天还没走远。");
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.clues));
  assert.ok(Object.isFrozen(result.composeClues));
  assert.equal(logic.sanitizeConfig({ ...validConfig(), extra: true }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig(validConfig({ targetDate: "2023-02-29" })), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig(validConfig({ recipientName: "" })), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig(validConfig({ clues: ["重复", "重复", "不同"] })), logic.DEFAULT_CONFIG);
});

test("composeClues 接收冻结 context，合法替换与非法局部回退互不串扰", () => {
  let captured;
  const base = validConfig({
    composeClues(context) {
      captured = context;
      return ["第一条私人线索", "第二条私人线索", context.targetPhaseName];
    },
  });
  const customized = logic.sanitizeConfig(base);
  assert.ok(Object.isFrozen(captured));
  assert.ok(Object.isFrozen(captured.baseClues));
  assert.equal(captured.targetDate, "2024-02-29");
  assert.equal(captured.targetPhaseIndex, logic.getMoonPhaseIndex("2024-02-29"));
  assert.deepEqual(customized.clues, ["第一条私人线索", "第二条私人线索", captured.targetPhaseName]);

  for (const composeClues of [
    () => null,
    () => { throw new Error("策略失败"); },
    () => ["只有一条"],
    () => ["重复", "重复", "第三条"],
    ({ baseClues }) => { baseClues.push("第四条"); return baseClues; },
  ]) {
    const fallback = logic.sanitizeConfig(validConfig({ composeClues }));
    assert.deepEqual(fallback.clues, validConfig().clues);
    assert.notEqual(fallback, logic.DEFAULT_CONFIG);
  }
});

test("初态固定 1 月 1 日新月，状态和嵌套配置递归冻结", () => {
  const state = logic.createInitialState(validConfig());
  assert.equal(state.phase, "intro");
  assert.equal(state.year, 2024);
  assert.equal(state.selectedMonth, 1);
  assert.equal(state.selectedDay, 1);
  assert.equal(state.selectedPhaseIndex, 0);
  assert.equal(state.feedback, null);
  assert.equal(state.attempts, 0);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.target));
  assert.ok(Object.isFrozen(state.clues));
  assert.equal(logic.isMoonPhaseState(state), true);
});

test("月份、日期和月相支持正负环绕，月份变化钳制闰年日期", () => {
  let state = calibrating();
  state = logic.adjustMonth(state, -1);
  assert.equal(state.selectedMonth, 12);
  state = logic.adjustMonth(state, 2);
  assert.equal(state.selectedMonth, 2);
  state = logic.adjustDay(state, -1);
  assert.equal(state.selectedDay, 29);
  state = logic.adjustMonth(state, 1);
  assert.equal(state.selectedMonth, 3);
  assert.equal(state.selectedDay, 29);
  state = logic.adjustDay(state, 5);
  assert.equal(state.selectedDay, 3);
  state = logic.adjustMoonPhase(state, -1);
  assert.equal(state.selectedPhaseIndex, 7);
  state = logic.adjustMoonPhase(state, 2);
  assert.equal(state.selectedPhaseIndex, 1);
});

test("月份从 31 日切入二月会钳制到 29 日，零步与非法步同引用", () => {
  let state = calibrating();
  state = logic.adjustDay(state, 30);
  assert.equal(state.selectedDay, 31);
  state = logic.adjustMonth(state, 1);
  assert.equal(state.selectedMonth, 2);
  assert.equal(state.selectedDay, 29);
  for (const delta of [0, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(logic.adjustMonth(state, delta), state);
    assert.equal(logic.adjustDay(state, delta), state);
    assert.equal(logic.adjustMoonPhase(state, delta), state);
  }
});

test("角度跨 ±π、精确半圈符号和非法样本稳定", () => {
  const degrees = (value) => value * Math.PI / 180;
  assert.ok(Math.abs(logic.normalizeAngularDelta(degrees(179), degrees(-179)) - degrees(2)) < 1e-12);
  assert.ok(Math.abs(logic.normalizeAngularDelta(degrees(-179), degrees(179)) + degrees(2)) < 1e-12);
  assert.equal(logic.normalizeAngularDelta(0, Math.PI), Math.PI);
  assert.equal(logic.normalizeAngularDelta(0, -Math.PI), -Math.PI);
  assert.equal(Number.isNaN(logic.normalizeAngularDelta(Number.NaN, 0)), true);
});

test("角度余量累计、反向抵消、反向步进与瞬移拒绝", () => {
  const step = logic.MONTH_STEP_ANGLE;
  let result = logic.stepsFromAngularTravel(0, step * 0.6, step);
  assert.equal(result.steps, 0);
  result = logic.stepsFromAngularTravel(result.newCarry, step * 0.6, step);
  assert.equal(result.steps, 1);
  assert.ok(Math.abs(result.newCarry - step * 0.2) < 1e-12);
  result = logic.stepsFromAngularTravel(result.newCarry, -step * 0.5, step);
  assert.equal(result.steps, 0);
  assert.ok(result.newCarry < 0);
  result = logic.stepsFromAngularTravel(result.newCarry, -step, step);
  assert.equal(result.steps, -1);
  const discarded = logic.stepsFromAngularTravel(result.newCarry, Math.PI / 2 + 1e-9, step);
  assert.deepEqual(discarded, { steps: 0, newCarry: result.newCarry });
  assert.ok(Object.isFrozen(discarded));
});

test("intro → calibrating → 错误反馈只暴露布尔值且调整会清空", () => {
  const intro = logic.createInitialState(validConfig());
  const started = logic.start(intro);
  assert.equal(started.phase, "calibrating");
  assert.equal(logic.start(started), started);
  const checked = logic.checkAlignment(started);
  assert.equal(checked.phase, "calibrating");
  assert.equal(checked.attempts, 1);
  assert.deepEqual(checked.feedback, {
    monthAligned: false,
    dayAligned: false,
    phaseAligned: logic.getMoonPhaseIndex("2024-02-29") === 0,
  });
  assert.ok(Object.isFrozen(checked.feedback));
  assert.equal(Object.hasOwn(checked.feedback, "targetMonth"), false);
  assert.equal(logic.adjustMonth(checked, 1).feedback, null);
});

test("三项首次同时对齐唯一解锁，终局输入幂等且重开保留配置", () => {
  const intro = logic.createInitialState(validConfig());
  let state = selectTarget(logic.start(intro));
  state = logic.checkAlignment(state);
  assert.equal(state.phase, "unlocked");
  assert.equal(state.attempts, 1);
  assert.ok(Object.values(state.feedback).every(Boolean));
  assert.equal(logic.checkAlignment(state), state);
  assert.equal(logic.adjustDay(state, 1), state);

  const restarted = logic.restart(state);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.selectedMonth, 1);
  assert.equal(restarted.selectedDay, 1);
  assert.equal(restarted.selectedPhaseIndex, 0);
  assert.equal(restarted.attempts, 0);
  assert.equal(restarted.feedback, null);
  assert.equal(restarted.revision, state.revision + 1);
  assert.deepEqual(restarted.target, state.target);
  assert.notEqual(restarted.target, state.target);
  assert.deepEqual(restarted.clues, state.clues);
  assert.notEqual(restarted.clues, state.clues);
});

test("公开 view model 在解锁前隐藏目标与最终文案，且每次返回冻结副本", () => {
  const intro = logic.createInitialState(validConfig());
  const introView = logic.getViewModel(intro);
  assert.deepEqual(introView.clues, []);
  assert.equal(introView.finalMessage, null);
  assert.equal(Object.hasOwn(introView, "target"), false);
  assert.equal(Object.hasOwn(introView, "recipientName"), false);

  const calibratingView = logic.getViewModel(logic.start(intro));
  assert.equal(calibratingView.clues.length, 3);
  assert.equal(calibratingView.finalMessage, null);
  assert.ok(Object.isFrozen(calibratingView));
  assert.ok(Object.isFrozen(calibratingView.clues));

  const unlocked = logic.checkAlignment(selectTarget(logic.start(intro)));
  const unlockedView = logic.getViewModel(unlocked);
  assert.deepEqual(unlockedView.finalMessage, {
    recipientName: "给你",
    finalTitle: "那一天",
    finalMessage: "这是一段只在完成后出现的话。",
  });
  assert.ok(Object.isFrozen(unlockedView.finalMessage));
  assert.notEqual(unlockedView, logic.getViewModel(unlocked));
});

test("额外字段、矛盾反馈与敌意对象均视为畸形，公开动作回默认初态", () => {
  const valid = calibrating();
  const hostile = new Proxy({}, { ownKeys() { throw new Error("拒绝枚举"); } });
  const malformedStates = [
    hostile,
    { ...valid, extra: true },
    { ...valid, selectedDay: 32 },
    { ...valid, feedback: { monthAligned: true, dayAligned: true, phaseAligned: true } },
    { ...valid, target: { ...valid.target, phaseIndex: (valid.target.phaseIndex + 1) % 8 } },
  ];
  for (const malformed of malformedStates) {
    assert.equal(logic.isMoonPhaseState(malformed), false);
    assert.deepEqual(logic.start(malformed), logic.createInitialState());
    assert.deepEqual(logic.adjustMonth(malformed, 1), logic.createInitialState());
    assert.deepEqual(logic.adjustDay(malformed, 1), logic.createInitialState());
    assert.deepEqual(logic.adjustMoonPhase(malformed, 1), logic.createInitialState());
    assert.deepEqual(logic.checkAlignment(malformed), logic.createInitialState());
    assert.deepEqual(logic.restart(malformed), logic.createInitialState());
  }
});
