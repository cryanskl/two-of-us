import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.HAND_CRANK_MUSIC_BOX_LOGIC;
const QUARTER_TURN = Math.PI / 2;

function startDefault(config) {
  return logic.start(logic.createInitialState(config));
}

function fullConfig(composeMotif = () => null) {
  return {
    recipientName: "  给 你  ",
    finalTitle: "慢慢转给你",
    finalMessage: "等旋律转完，我们再一起出发。",
    composeMotif,
  };
}

test("经典 IIFE 只暴露递归冻结的常量和 API", () => {
  assert.ok(logic);
  assert.ok(Object.isFrozen(logic));
  assert.ok(Object.isFrozen(logic.AVAILABLE_NOTE_IDS));
  assert.ok(Object.isFrozen(logic.DEFAULT_MOTIF));
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG));
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG.composeMotif));
  assert.equal(logic.TOTAL_STEPS, 32);
  assert.equal(logic.TOTAL_TURNS, 8);
});

test("默认初态使用精确白名单、递归冻结且调用方无法改写旋律", () => {
  const state = logic.createInitialState();
  assert.deepEqual(state, {
    phase: "intro",
    currentAngle: 0,
    peakAngle: 0,
    stepIndex: 0,
    completedTurns: 0,
    motif: ["c5", "e5", "g5", "e5", "d5", "f5", "a5", "g5"],
    lastNoteId: null,
    revision: 0,
  });
  assert.deepEqual(Object.keys(state), [
    "phase", "currentAngle", "peakAngle", "stepIndex", "completedTurns", "motif", "lastNoteId", "revision",
  ]);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.motif));

  const sourceMotif = ["c5", "d5", "e5", "f5", "g5", "a5", "c6", "d6"];
  const custom = logic.createInitialState(fullConfig(() => sourceMotif));
  sourceMotif[0] = "d6";
  assert.equal(custom.motif[0], "c5");
  assert.notEqual(custom.motif, sourceMotif);
});

test("composeMotif 只接收冻结副本，合法 8–16 音可用", () => {
  let captured;
  const custom = logic.createInitialState(fullConfig((context) => {
    captured = context;
    return [...context.availableNoteIds, "c5", "d5"];
  }));
  assert.ok(Object.isFrozen(captured));
  assert.ok(Object.isFrozen(captured.availableNoteIds));
  assert.ok(Object.isFrozen(captured.defaultMotif));
  assert.notEqual(captured.availableNoteIds, logic.AVAILABLE_NOTE_IDS);
  assert.notEqual(captured.defaultMotif, logic.DEFAULT_MOTIF);
  assert.equal(custom.motif.length, 10);
  assert.deepEqual(custom.motif.slice(0, 8), logic.AVAILABLE_NOTE_IDS);
});

test("composeMotif 的 null、异常、非法长度、非法音高与修改上下文都回退", () => {
  const cases = [
    () => null,
    () => { throw new Error("私人谱写失败"); },
    () => ["c5"],
    () => Array.from({ length: 17 }, () => "c5"),
    () => ["c5", "d5", "e5", "f5", "g5", "a5", "c6", "h6"],
    ({ availableNoteIds }) => { availableNoteIds.push("h6"); return availableNoteIds; },
  ];
  for (const composeMotif of cases) {
    assert.deepEqual(logic.createInitialState(fullConfig(composeMotif)).motif, logic.DEFAULT_MOTIF);
  }
});

test("配置必须整份合法且无额外字段，否则策略不会绕过整份回退", () => {
  const customMotif = ["d6", "c6", "a5", "g5", "f5", "e5", "d5", "c5"];
  const normalized = logic.sanitizeConfig(fullConfig(() => customMotif));
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.composeMotif));
  assert.equal(normalized.recipientName, "给 你");
  assert.deepEqual(logic.createInitialState(fullConfig(() => customMotif)).motif, customMotif);
  assert.equal(logic.sanitizeConfig({ ...fullConfig(), extra: true }), logic.DEFAULT_CONFIG);
  assert.deepEqual(logic.createInitialState({ ...fullConfig(() => customMotif), extra: true }).motif, logic.DEFAULT_MOTIF);
  assert.deepEqual(logic.createInitialState({ ...fullConfig(() => customMotif), recipientName: "" }).motif, logic.DEFAULT_MOTIF);
  assert.deepEqual(logic.createInitialState({ composeMotif: () => customMotif }).motif, logic.DEFAULT_MOTIF);
});

test("start 只从 intro 进入 playing，非法阶段动作保持同一引用", () => {
  const intro = logic.createInitialState();
  const playing = logic.start(intro);
  assert.equal(playing.phase, "playing");
  assert.equal(playing.revision, 1);
  assert.equal(logic.start(playing), playing);
  assert.equal(logic.restart(intro), intro);
  assert.equal(logic.applyAngularDelta(intro, QUARTER_TURN), intro);
});

test("normalizeAngularDelta 正确跨越 ±π 并拒绝非有限样本", () => {
  const degrees = (value) => value * Math.PI / 180;
  assert.ok(Math.abs(logic.normalizeAngularDelta(degrees(179), degrees(-179)) - degrees(2)) < 1e-12);
  assert.ok(Math.abs(logic.normalizeAngularDelta(degrees(-179), degrees(179)) - degrees(-2)) < 1e-12);
  assert.ok(Math.abs(logic.normalizeAngularDelta(degrees(10), degrees(40)) - degrees(30)) < 1e-12);
  assert.equal(Number.isNaN(logic.normalizeAngularDelta(Number.NaN, 0)), true);
  assert.equal(Number.isNaN(logic.normalizeAngularDelta(0, Number.POSITIVE_INFINITY)), true);
});

test("非有限、零增量与单样本超过 π/2 的瞬移保持原引用", () => {
  const state = startDefault();
  for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, 0, QUARTER_TURN + 1e-12, -QUARTER_TURN - 1e-12]) {
    assert.equal(logic.applyAngularDelta(state, delta), state);
  }
});

test("反向会降低当前位置但保留峰值，追平旧峰值不会重复步进", () => {
  let state = startDefault();
  state = logic.advanceOneStep(state);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.lastNoteId, "c5");
  const oldPeak = state.peakAngle;

  const reversed = logic.applyAngularDelta(state, -QUARTER_TURN / 2);
  assert.equal(reversed.currentAngle, QUARTER_TURN / 2);
  assert.equal(reversed.peakAngle, oldPeak);
  assert.equal(reversed.stepIndex, 1);
  assert.equal(reversed.lastNoteId, "c5");

  const caughtUp = logic.applyAngularDelta(reversed, QUARTER_TURN / 2);
  assert.equal(caughtUp.currentAngle, oldPeak);
  assert.equal(caughtUp.stepIndex, 1);
  assert.equal(caughtUp.lastNoteId, "c5");

  const newGround = logic.applyAngularDelta(caughtUp, QUARTER_TURN);
  assert.equal(newGround.stepIndex, 2);
  assert.equal(newGround.lastNoteId, "e5");
});

test("离散转格会先对齐旧峰值并且每次恰好推进一个齿位", () => {
  let state = startDefault();
  state = logic.advanceOneStep(state);
  state = logic.applyAngularDelta(state, -QUARTER_TURN);
  assert.equal(state.currentAngle, 0);
  assert.equal(state.peakAngle, QUARTER_TURN);
  assert.equal(state.stepIndex, 1);

  const advanced = logic.advanceOneStep(state);
  assert.equal(advanced.currentAngle, QUARTER_TURN * 2);
  assert.equal(advanced.peakAngle, QUARTER_TURN * 2);
  assert.equal(advanced.stepIndex, 2);
  assert.equal(advanced.lastNoteId, "e5");
  assert.equal(advanced.revision, state.revision + 1);
});

test("拖动与辅助推进共享角度出口，每四步一圈且第 32 步唯一完成", () => {
  let state = startDefault();
  state = logic.applyAngularDelta(state, QUARTER_TURN / 2);
  assert.equal(state.stepIndex, 0);
  state = logic.applyAngularDelta(state, QUARTER_TURN / 2);
  assert.equal(state.stepIndex, 1);

  for (let expected = 2; expected <= 31; expected += 1) {
    state = logic.advanceOneStep(state);
    assert.equal(state.stepIndex, expected);
    assert.equal(state.completedTurns, Math.floor(expected / 4));
    assert.equal(state.phase, "playing");
  }
  const beforeComplete = state;
  state = logic.advanceOneStep(state);
  assert.equal(state.stepIndex, 32);
  assert.equal(state.completedTurns, 8);
  assert.equal(state.phase, "complete");
  assert.equal(state.lastNoteId, "g5");
  assert.equal(logic.advanceOneStep(state), state);
  assert.equal(logic.applyAngularDelta(state, QUARTER_TURN), state);
  assert.notEqual(state, beforeComplete);
});

test("派生进度冻结、无共享引用且新齿位立即展开当前纸景层", () => {
  let state = startDefault();
  for (let index = 0; index < 5; index += 1) state = logic.advanceOneStep(state);
  const progress = logic.getDerivedProgress(state);
  assert.deepEqual(progress, { ratio: 5 / 32, revealedLayers: 2, activeTooth: 4 });
  assert.ok(Object.isFrozen(progress));
  assert.notEqual(progress, logic.getDerivedProgress(state));
  assert.deepEqual(logic.getDerivedProgress(null), { ratio: 0, revealedLayers: 0, activeTooth: null });

  const tenNoteMotif = [...logic.AVAILABLE_NOTE_IDS, "c5", "d5"];
  let custom = startDefault(fullConfig(() => tenNoteMotif));
  for (let index = 0; index < 10; index += 1) custom = logic.advanceOneStep(custom);
  assert.equal(logic.getDerivedProgress(custom).activeTooth, 9);
});

test("重开保留私人动机、清空规则进度并继续保持所有权隔离", () => {
  const customMotif = ["d6", "c6", "a5", "g5", "f5", "e5", "d5", "c5"];
  let state = startDefault(fullConfig(() => customMotif));
  while (state.phase !== "complete") state = logic.advanceOneStep(state);
  const restarted = logic.restart(state);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.currentAngle, 0);
  assert.equal(restarted.stepIndex, 0);
  assert.equal(restarted.lastNoteId, null);
  assert.equal(restarted.revision, state.revision + 1);
  assert.deepEqual(restarted.motif, customMotif);
  assert.notEqual(restarted.motif, state.motif);
});

test("畸形状态和额外状态字段被拒绝，公开动作安全回到默认初态", () => {
  const valid = startDefault();
  const hostile = new Proxy({}, { ownKeys() { throw new Error("拒绝枚举"); } });
  const malformedStates = [
    null,
    hostile,
    { ...valid, extra: true },
    { ...valid, peakAngle: Number.NaN },
    { ...valid, stepIndex: 1 },
    { ...valid, completedTurns: 8 },
    { ...valid, motif: ["c5"] },
    { ...valid, lastNoteId: "h6" },
  ];
  for (const malformed of malformedStates) {
    assert.equal(logic.isMusicBoxState(malformed), false);
    assert.deepEqual(logic.start(malformed), logic.createInitialState());
    assert.deepEqual(logic.applyAngularDelta(malformed, QUARTER_TURN), logic.createInitialState());
    assert.deepEqual(logic.advanceOneStep(malformed), logic.createInitialState());
    assert.deepEqual(logic.restart(malformed), logic.createInitialState());
  }
  assert.equal(logic.sanitizeConfig(hostile), logic.DEFAULT_CONFIG);
});
