import test from "node:test";
import assert from "node:assert/strict";

await import("./config.js");
await import("./logic.js");

const configGlobal = globalThis.FOG_WINDOW_LETTER_CONFIG;
const logic = globalThis.FOG_WINDOW_LETTER_LOGIC;

const VALID_POINTS = [
  { x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 260 }, { x: 100, y: 260 },
  { x: 100, y: 420 }, { x: 300, y: 420 }, { x: 300, y: 580 }, { x: 500, y: 580 },
  { x: 500, y: 420 }, { x: 700, y: 420 }, { x: 700, y: 260 }, { x: 500, y: 260 },
];

function startedState() {
  return logic.reduceFogWindow(logic.createFogWindowState(), { type: "START" });
}

function reduceAll(actions, initial = logic.createFogWindowState()) {
  return actions.reduce((state, action) => logic.reduceFogWindow(state, action), initial);
}

function drawStroke(state, points, { pointerId = 1, reason = "up" } = {}) {
  const generation = state.lastGeneration + 1;
  let current = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId, generation, ...points[0],
  });
  for (const point of points.slice(1)) {
    current = logic.reduceFogWindow(current, {
      type: "ADD_STROKE_POINT", pointerId, generation, ...point,
    });
  }
  if (current.active) {
    current = logic.reduceFogWindow(current, { type: "END_STROKE", pointerId, generation, reason });
  }
  return current;
}

function readyState() {
  const state = drawStroke(startedState(), VALID_POINTS);
  assert.equal(state.phase, "ready");
  return state;
}

function tracingState() {
  return logic.reduceFogWindow(readyState(), { type: "CONFIRM_DRAWING" });
}

function cloneState(state, overrides = {}) {
  return { ...JSON.parse(JSON.stringify(state)), ...overrides };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function snakePoints(count, yOffset = 0) {
  const points = [];
  const columns = 40;
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const columnInRow = index % columns;
    const column = row % 2 === 0 ? columnInRow : columns - 1 - columnInRow;
    points.push({ x: column * 20, y: yOffset + row * 20 });
  }
  return points;
}

function drawingActions(points = VALID_POINTS) {
  const actions = [{ type: "START" }, {
    type: "BEGIN_STROKE", pointerId: 1, generation: 1, ...points[0],
  }];
  for (const point of points.slice(1)) {
    actions.push({ type: "ADD_STROKE_POINT", pointerId: 1, generation: 1, ...point });
  }
  actions.push({ type: "END_STROKE", pointerId: 1, generation: 1, reason: "up" });
  return actions;
}

function buildGoldenReplay() {
  const actions = drawingActions();
  actions.push({ type: "CONFIRM_DRAWING" });
  const tracing = reduceAll(actions);
  const anchors = tracing.anchors;
  actions.push({ type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: anchors[0].x, y: anchors[0].y });
  for (const anchor of anchors.slice(1)) {
    actions.push({ type: "ADD_TRACE_POINT", pointerId: 2, generation: 2, x: anchor.x, y: anchor.y });
  }
  return actions;
}

const GOLDEN_REPLAY = buildGoldenReplay();

test("冻结规则常量与规格完全一致", () => {
  assert.deepEqual({
    width: logic.WINDOW_WIDTH, height: logic.WINDOW_HEIGHT, gap: logic.MIN_POINT_GAP,
    points: logic.MIN_POINT_COUNT, length: logic.MIN_DRAW_LENGTH,
    boundsWidth: logic.MIN_BOUNDS_WIDTH, boundsHeight: logic.MIN_BOUNDS_HEIGHT,
    strokes: logic.MAX_STROKES, perStroke: logic.MAX_POINTS_PER_STROKE,
    total: logic.MAX_TOTAL_POINTS, spacing: logic.ANCHOR_SPACING, anchors: logic.MAX_ANCHORS,
    radius: logic.TRACE_RADIUS, numerator: logic.TRACE_REQUIRED_NUMERATOR,
    denominator: logic.TRACE_REQUIRED_DENOMINATOR, frameGap: logic.MAX_FRAME_GAP_MS,
  }, {
    width: 1000, height: 620, gap: 12, points: 12, length: 720, boundsWidth: 220,
    boundsHeight: 140, strokes: 8, perStroke: 160, total: 480, spacing: 32,
    anchors: 160, radius: 46, numerator: 4, denominator: 5, frameGap: 250,
  });
});

test("逻辑、默认配置与经典脚本配置递归冻结", () => {
  assertDeepFrozen(logic);
  assertDeepFrozen(logic.DEFAULT_CONFIG);
  assertDeepFrozen(configGlobal);
});

const configLimits = [
  ["title", 40], ["subtitle", 100], ["intro", 180], ["startButton", 32],
  ["confirmButton", 32], ["clearButton", 32], ["directButton", 32],
  ["tracingInstruction", 180], ["pauseButton", 32], ["resumeButton", 32],
  ["completionTitle", 40], ["defaultMessage", 240], ["signature", 80], ["restartButton", 32],
];

for (const [field, limit] of configLimits) {
  test(`配置清洗 trim 与 Unicode 截断：${field}`, () => {
    const clean = logic.sanitizeFogWindowConfig({ [field]: `  ${"雾".repeat(limit + 3)}  ` });
    assert.equal([...clean[field]].length, limit);
    assert.equal(clean[field], "雾".repeat(limit));
  });
}

test("配置字段非字符串或空白时逐字段回退", () => {
  const safe = logic.sanitizeFogWindowConfig({ title: 42, subtitle: "   ", signature: null });
  assert.equal(safe.title, logic.DEFAULT_CONFIG.title);
  assert.equal(safe.subtitle, logic.DEFAULT_CONFIG.subtitle);
  assert.equal(safe.signature, logic.DEFAULT_CONFIG.signature);
});

test("配置 getter 抛错时安全回退", () => {
  const raw = Object.defineProperty({}, "title", { get() { throw new Error("nope"); } });
  assert.equal(logic.sanitizeFogWindowConfig(raw).title, logic.DEFAULT_CONFIG.title);
});

test("默认 compose 在无需用户输入时返回完整正文", () => {
  const complete = logic.reduceFogWindow(logic.createFogWindowState(), { type: "DIRECT_REVEAL" });
  const view = logic.getFogWindowView(complete, configGlobal);
  assert.equal(view.text.completionMessage, configGlobal.defaultMessage);
});

const badComposeCases = [
  ["抛错", () => { throw new Error("bad"); }],
  ["空白", () => "   "],
  ["非字符串", () => 42],
  ["超过 240 code points", () => "长".repeat(241)],
  ["尝试修改冻结摘要", (view) => { view.strokeCount = 99; return "不应采用"; }],
];

for (const [name, composeFogWindowLetter] of badComposeCases) {
  test(`compose 非法结果安全回退：${name}`, () => {
    const complete = logic.reduceFogWindow(logic.createFogWindowState(), { type: "DIRECT_REVEAL" });
    const view = logic.getFogWindowView(complete, { composeFogWindowLetter });
    assert.equal(view.text.completionMessage, logic.DEFAULT_CONFIG.defaultMessage);
  });
}

test("compose 只收到精确冻结摘要且合法结果 trim", () => {
  let received = null;
  const complete = logic.reduceFogWindow(logic.createFogWindowState(), { type: "DIRECT_REVEAL" });
  const view = logic.getFogWindowView(complete, {
    composeFogWindowLetter(summary) {
      received = summary;
      return "  只属于我们  ";
    },
  });
  assert.equal(view.text.completionMessage, "只属于我们");
  assert.deepEqual(Object.keys(received), [
    "strokeCount", "drawingShape", "completionReason", "hitCount", "anchorCount", "defaultMessage",
  ]);
  assert.equal(Object.isFrozen(received), true);
  assert.equal("points" in received, false);
  assert.equal("pointerId" in received, false);
  assert.equal("generation" in received, false);
});

test("初始状态精确、递归冻结并可 JSON 往返", () => {
  const state = logic.createFogWindowState();
  assert.deepEqual(state, {
    version: 1, phase: "intro", resumePhase: null, strokes: [], active: null,
    nextStrokeId: 0, lastGeneration: 0, drawLength: 0, bounds: null, anchors: [],
    hitAnchorIds: [], traceStrokeCount: 0, completionReason: null,
    announcementSerial: 0, lastNotice: null,
  });
  assertDeepFrozen(state);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

const invalidActions = [
  ["null", null], ["缺 type", {}], ["未知 type", { type: "TELEPORT" }],
  ["START 多字段", { type: "START", extra: true }],
  ["BEGIN 缺点", { type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0 }],
  ["pointerId 负数", { type: "BEGIN_STROKE", pointerId: -1, generation: 1, x: 0, y: 0 }],
  ["pointerId 非安全整数", { type: "BEGIN_STROKE", pointerId: Number.MAX_SAFE_INTEGER + 1, generation: 1, x: 0, y: 0 }],
  ["generation 为零", { type: "BEGIN_STROKE", pointerId: 1, generation: 0, x: 0, y: 0 }],
  ["generation 非安全整数", { type: "BEGIN_STROKE", pointerId: 1, generation: Number.MAX_SAFE_INTEGER + 1, x: 0, y: 0 }],
  ["x 非整数", { type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0.5, y: 0 }],
  ["x 负数", { type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: -1, y: 0 }],
  ["x 越界", { type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 1001, y: 0 }],
  ["y 负数", { type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: -1 }],
  ["y 越界", { type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 621 }],
  ["点 action 多字段", { type: "ADD_TRACE_POINT", pointerId: 1, generation: 1, x: 0, y: 0, extra: true }],
  ["END 缺 reason", { type: "END_STROKE", pointerId: 1, generation: 1 }],
  ["END 使用内部 limit", { type: "END_STROKE", pointerId: 1, generation: 1, reason: "limit" }],
  ["END 使用内部 pause", { type: "END_STROKE", pointerId: 1, generation: 1, reason: "pause" }],
  ["END 使用内部 direct", { type: "END_TRACE", pointerId: 1, generation: 1, reason: "direct" }],
  ["END 多字段", { type: "END_TRACE", pointerId: 1, generation: 1, reason: "up", extra: true }],
  ["PAUSE 错 reason", { type: "PAUSE", reason: "network" }],
  ["PAUSE 多字段", { type: "PAUSE", reason: "manual", extra: true }],
  ["CLEAR 多字段", { type: "CLEAR_DRAWING", extra: true }],
  ["RESTART 多字段", { type: "RESTART", extra: true }],
];

for (const [name, action] of invalidActions) {
  test(`非法 action 抛 TypeError：${name}`, () => {
    assert.throws(() => logic.reduceFogWindow(logic.createFogWindowState(), action), TypeError);
  });
}

const distanceCases = [
  ["同点", { x: 0, y: 0 }, { x: 0, y: 0 }, 0],
  ["水平正向", { x: 0, y: 0 }, { x: 12, y: 0 }, 12],
  ["水平反向", { x: 12, y: 0 }, { x: 0, y: 0 }, 12],
  ["竖直", { x: 0, y: 0 }, { x: 0, y: 20 }, 20],
  ["45 度", { x: 0, y: 0 }, { x: 12, y: 12 }, 18],
  ["斜向取 floor", { x: 0, y: 0 }, { x: 12, y: 5 }, 14],
  ["任意反向", { x: 30, y: 20 }, { x: 10, y: 14 }, 23],
  ["窗格最大斜线", { x: 0, y: 0 }, { x: 1000, y: 620 }, 1310],
];

for (const [name, first, second, expected] of distanceCases) {
  test(`整数近似距离：${name}`, () => assert.equal(logic.approximateDistance(first, second), expected));
}

test("距离辅助拒绝点的多余字段与越界值", () => {
  assert.throws(() => logic.approximateDistance({ x: 0, y: 0, z: 1 }, { x: 1, y: 1 }), TypeError);
  assert.throws(() => logic.approximateDistance({ x: 0, y: 0 }, { x: 1001, y: 1 }), TypeError);
});

test("首点立即进入 strokes、bounds 与 active write", () => {
  const state = logic.reduceFogWindow(startedState(), {
    type: "BEGIN_STROKE", pointerId: 7, generation: 1, x: 40, y: 50,
  });
  assert.deepEqual(state.strokes, [{ id: 0, points: [{ x: 40, y: 50 }], endReason: null }]);
  assert.deepEqual(state.bounds, { minX: 40, minY: 50, maxX: 40, maxY: 50, width: 0, height: 0 });
  assert.deepEqual(state.active, {
    mode: "write", pointerId: 7, generation: 1, strokeId: 0, lastPoint: { x: 40, y: 50 },
  });
});

test("gap 11 引用幂等，gap 12 精确接纳", () => {
  let state = logic.reduceFogWindow(startedState(), {
    type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 0,
  });
  const ignored = logic.reduceFogWindow(state, {
    type: "ADD_STROKE_POINT", pointerId: 1, generation: 1, x: 11, y: 0,
  });
  assert.strictEqual(ignored, state);
  state = logic.reduceFogWindow(state, {
    type: "ADD_STROKE_POINT", pointerId: 1, generation: 1, x: 12, y: 0,
  });
  assert.equal(state.strokes[0].points.length, 2);
  assert.equal(state.drawLength, 12);
});

const gateCases = [
  ["点数 11", Array.from({ length: 11 }, (_, i) => ({ x: i * 12, y: 0 })), "points", false],
  ["点数 12", Array.from({ length: 12 }, (_, i) => ({ x: i * 12, y: 0 })), "points", true],
  ["长度 719", [{ x: 0, y: 0 }, { x: 719, y: 0 }], "length", false],
  ["长度 720", [{ x: 0, y: 0 }, { x: 720, y: 0 }], "length", true],
  ["宽 219", [{ x: 0, y: 0 }, { x: 219, y: 0 }], "width", false],
  ["宽 220", [{ x: 0, y: 0 }, { x: 220, y: 0 }], "width", true],
  ["高 139", [{ x: 0, y: 0 }, { x: 0, y: 139 }], "height", false],
  ["高 140", [{ x: 0, y: 0 }, { x: 0, y: 140 }], "height", true],
];

for (const [name, points, key, expected] of gateCases) {
  test(`Gate 精确边界：${name}`, () => {
    const state = drawStroke(startedState(), points);
    assert.equal(logic.getFogWindowView(state).drawing.gate[key], expected);
  });
}

test("合法笔迹四项 Gate 全过并进入 ready", () => {
  const state = readyState();
  assert.equal(logic.getFogWindowView(state).drawing.gate.ready, true);
  assert.equal(state.drawLength, 2000);
  assert.deepEqual(state.bounds, { minX: 100, minY: 100, maxX: 700, maxY: 580, width: 600, height: 480 });
});

const shapeCases = [
  ["wide", [{ x: 0, y: 0 }, { x: 300, y: 100 }], "wide"],
  ["tall", [{ x: 0, y: 0 }, { x: 100, y: 300 }], "tall"],
  ["balanced", [{ x: 0, y: 0 }, { x: 200, y: 200 }], "balanced"],
];

for (const [name, points, expected] of shapeCases) {
  test(`形状摘要：${name}`, () => {
    const state = drawStroke(startedState(), points);
    assert.equal(logic.getFogWindowView(state).drawing.shape, expected);
  });
}

test("direct 前未过完整 Gate 时 shape 固定 none", () => {
  const short = drawStroke(startedState(), [{ x: 0, y: 0 }, { x: 500, y: 0 }]);
  const complete = logic.reduceFogWindow(short, { type: "DIRECT_REVEAL" });
  assert.equal(logic.getFogWindowView(complete).drawing.shape, "none");
});

test("ready 追加新笔暂回 writing，结束后单调恢复 ready", () => {
  let state = readyState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId: 2, generation: 2, x: 800, y: 300,
  });
  assert.equal(state.phase, "writing");
  state = logic.reduceFogWindow(state, {
    type: "END_STROKE", pointerId: 2, generation: 2, reason: "up",
  });
  assert.equal(state.phase, "ready");
});

test("第 8 笔允许、第 9 笔引用幂等", () => {
  let state = startedState();
  for (let index = 0; index < 8; index += 1) {
    state = drawStroke(state, [{ x: index * 20, y: 0 }], { pointerId: index + 1 });
  }
  assert.equal(state.strokes.length, 8);
  const blocked = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId: 9, generation: 9, x: 200, y: 0,
  });
  assert.strictEqual(blocked, state);
});

test("单笔第 160 点自动 limit 闭合并允许下一笔", () => {
  let state = drawStroke(startedState(), snakePoints(160));
  assert.equal(state.strokes[0].points.length, 160);
  assert.equal(state.strokes[0].endReason, "limit");
  assert.equal(state.active, null);
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId: 2, generation: 2, x: 900, y: 100,
  });
  assert.equal(state.strokes.length, 2);
  assert.equal(state.active.strokeId, 1);
});

test("单笔 limit 后迟到 ADD/END 不改变状态", () => {
  const state = drawStroke(startedState(), snakePoints(160));
  const add = logic.reduceFogWindow(state, {
    type: "ADD_STROKE_POINT", pointerId: 1, generation: 1, x: 900, y: 200,
  });
  const end = logic.reduceFogWindow(state, {
    type: "END_STROKE", pointerId: 1, generation: 1, reason: "up",
  });
  assert.strictEqual(add, state);
  assert.strictEqual(end, state);
});

test("总计第 480 点自动闭合并阻止继续增长", () => {
  let state = startedState();
  state = drawStroke(state, snakePoints(160, 0), { pointerId: 1 });
  state = drawStroke(state, snakePoints(160, 100), { pointerId: 2 });
  state = drawStroke(state, snakePoints(160, 200), { pointerId: 3 });
  assert.equal(logic.getFogWindowView(state).drawing.pointCount, 480);
  const blocked = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId: 4, generation: 4, x: 900, y: 400,
  });
  assert.strictEqual(blocked, state);
});

test("CLEAR 重置内容与 ID 但保留 generation", () => {
  const ready = readyState();
  const cleared = logic.reduceFogWindow(ready, { type: "CLEAR_DRAWING" });
  assert.equal(cleared.phase, "writing");
  assert.deepEqual(cleared.strokes, []);
  assert.equal(cleared.nextStrokeId, 0);
  assert.equal(cleared.lastGeneration, 1);
  assert.equal(cleared.lastNotice, "cleared");
  assert.equal(cleared.announcementSerial, ready.announcementSerial + 1);
});

test("CLEAR 后旧 generation 被拒绝，新 generation 从 state 派生", () => {
  const cleared = logic.reduceFogWindow(readyState(), { type: "CLEAR_DRAWING" });
  const old = logic.reduceFogWindow(cleared, {
    type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 0,
  });
  assert.strictEqual(old, cleared);
  const next = logic.reduceFogWindow(cleared, {
    type: "BEGIN_STROKE", pointerId: 1, generation: 2, x: 0, y: 0,
  });
  assert.equal(next.lastGeneration, 2);
  assert.equal(next.strokes[0].id, 0);
});

test("Anchor 直线每 32 距离保留首尾", () => {
  const anchors = logic.generateFogWindowAnchors([{
    id: 0, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], endReason: "up",
  }]);
  assert.deepEqual(anchors, [0, 32, 64, 96, 100].map((x, sequenceIndex) => ({
    id: `0:${sequenceIndex}`, strokeIndex: 0, sequenceIndex, x, y: 0,
  })));
});

test("Anchor 正半值按远离零方向舍入", () => {
  const anchors = logic.generateFogWindowAnchors([{
    id: 0, points: [{ x: 0, y: 0 }, { x: 26, y: 0 }, { x: 27, y: 12 }], endReason: "up",
  }]);
  assert.ok(anchors.some((anchor) => anchor.x === 27 && anchor.y === 6));
});

test("Anchor 负半值按远离零方向舍入", () => {
  const anchors = logic.generateFogWindowAnchors([{
    id: 0, points: [{ x: 0, y: 0 }, { x: 26, y: 0 }, { x: 25, y: 12 }], endReason: "up",
  }]);
  assert.ok(anchors.some((anchor) => anchor.x === 25 && anchor.y === 6));
});

test("Anchor 相邻同坐标候选去重", () => {
  const anchors = logic.generateFogWindowAnchors([{
    id: 0, points: [{ x: 0, y: 0 }, { x: 32, y: 0 }, { x: 64, y: 0 }], endReason: "up",
  }]);
  assert.deepEqual(anchors.map((anchor) => anchor.x), [0, 32, 64]);
});

test("Anchor 多笔重置累计距离并保持 ID 顺序", () => {
  const anchors = logic.generateFogWindowAnchors([
    { id: 0, points: [{ x: 0, y: 0 }, { x: 40, y: 0 }], endReason: "up" },
    { id: 1, points: [{ x: 100, y: 100 }, { x: 140, y: 100 }], endReason: "up" },
  ]);
  assert.deepEqual(anchors.map((anchor) => anchor.id), ["0:0", "0:1", "0:2", "1:0", "1:1", "1:2"]);
  assert.deepEqual(anchors.map((anchor) => [anchor.x, anchor.y]), [
    [0, 0], [32, 0], [40, 0], [100, 100], [132, 100], [140, 100],
  ]);
});

test("稳定抽样 slots=0/1/>1 与偶数左中位", () => {
  assert.deepEqual(logic.selectEvenlySpacedIndices(0, 0), []);
  assert.deepEqual(logic.selectEvenlySpacedIndices(6, 1), [2]);
  assert.deepEqual(logic.selectEvenlySpacedIndices(7, 1), [3]);
  assert.deepEqual(logic.selectEvenlySpacedIndices(10, 4), [0, 3, 6, 9]);
});

const invalidSampleCases = [[-1, 0], [1, -1], [2, 3], [1.5, 1], [2, 1.5]];
for (const [count, slots] of invalidSampleCases) {
  test(`稳定抽样拒绝非法尺寸：${count}/${slots}`, () => {
    assert.throws(() => logic.selectEvenlySpacedIndices(count, slots), TypeError);
  });
}

function lineStroke(id, start, end) {
  return { id, points: [start, end], endReason: "up" };
}

test("候选恰好 160 时不抽样", () => {
  const strokes = Array.from({ length: 4 }, (_, index) => lineStroke(index,
    { x: 0, y: 0 }, { x: 1000, y: 500 }));
  const anchors = logic.generateFogWindowAnchors(strokes);
  assert.equal(anchors.length, 160);
  assert.deepEqual(anchors.filter((anchor) => anchor.sequenceIndex === 0).map((anchor) => anchor.id),
    ["0:0", "1:0", "2:0", "3:0"]);
});

test("候选超过 160 后 mandatory 首尾全部保留", () => {
  const points = [
    { x: 0, y: 0 }, { x: 1000, y: 620 }, { x: 0, y: 620 }, { x: 1000, y: 0 },
    { x: 0, y: 0 }, { x: 1000, y: 620 }, { x: 0, y: 620 }, { x: 1000, y: 0 },
    { x: 0, y: 0 }, { x: 1000, y: 620 }, { x: 0, y: 620 }, { x: 1000, y: 0 },
  ];
  const anchors = logic.generateFogWindowAnchors([{ id: 0, points, endReason: "up" }]);
  assert.equal(anchors.length, 160);
  assert.deepEqual(anchors[0], { id: "0:0", strokeIndex: 0, sequenceIndex: 0, x: 0, y: 0 });
  assert.deepEqual(anchors.at(-1), { id: "0:159", strokeIndex: 0, sequenceIndex: 159, x: 1000, y: 0 });
});

test("超过 160 候选的 anchor golden 坐标固定", () => {
  const points = [
    { x: 0, y: 0 }, { x: 1000, y: 620 }, { x: 0, y: 620 }, { x: 1000, y: 0 },
    { x: 0, y: 0 }, { x: 1000, y: 620 }, { x: 0, y: 620 }, { x: 1000, y: 0 },
    { x: 0, y: 0 }, { x: 1000, y: 620 }, { x: 0, y: 620 }, { x: 1000, y: 0 },
  ];
  const anchors = logic.generateFogWindowAnchors([{ id: 0, points, endReason: "up" }]);
  assert.deepEqual(anchors.slice(0, 8).map(({ x, y }) => [x, y]), [
    [0, 0], [24, 15], [73, 45], [147, 91], [195, 121], [269, 167], [318, 197], [391, 242],
  ]);
  assert.deepEqual(anchors.slice(-4).map(({ x, y }) => [x, y]), [[832, 104], [905, 59], [979, 13], [1000, 0]]);
});

test("相同 strokes 深相等 anchors 且不修改输入", () => {
  const strokes = [{ id: 0, points: VALID_POINTS.map((point) => ({ ...point })), endReason: "up" }];
  const before = structuredClone(strokes);
  const first = logic.generateFogWindowAnchors(strokes);
  const second = logic.generateFogWindowAnchors(structuredClone(strokes));
  assert.deepEqual(first, second);
  assert.deepEqual(strokes, before);
  assertDeepFrozen(first);
});

test("有效 Gate 生成至少 18 anchors，当前 golden 为 64", () => {
  const tracing = tracingState();
  assert.equal(tracing.anchors.length, 64);
  assert.ok(tracing.anchors.length >= 18);
});

const segmentCases = [
  ["vv=0 圆内", { x: 10, y: 10 }, { x: 0, y: 0 }, { x: 0, y: 0 }, true],
  ["vv=0 圆外", { x: 47, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, false],
  ["t=0 闭端点", { x: 0, y: 46 }, { x: 0, y: 0 }, { x: 100, y: 0 }, true],
  ["投影在线段前圆内", { x: 0, y: 44 }, { x: 10, y: 0 }, { x: 100, y: 0 }, true],
  ["投影在线段前圆外", { x: 0, y: 46 }, { x: 10, y: 0 }, { x: 100, y: 0 }, false],
  ["t=vv 闭端点", { x: 100, y: 46 }, { x: 0, y: 0 }, { x: 100, y: 0 }, true],
  ["投影在线段后圆内", { x: 110, y: 44 }, { x: 0, y: 0 }, { x: 100, y: 0 }, true],
  ["投影在线段后圆外", { x: 110, y: 46 }, { x: 0, y: 0 }, { x: 100, y: 0 }, false],
  ["内部正 cross 距离46", { x: 50, y: 46 }, { x: 0, y: 0 }, { x: 100, y: 0 }, true],
  ["内部负 cross 距离46", { x: 50, y: 54 }, { x: 0, y: 100 }, { x: 100, y: 100 }, true],
  ["内部正 cross 距离47", { x: 50, y: 47 }, { x: 0, y: 0 }, { x: 100, y: 0 }, false],
  ["内部负 cross 距离47", { x: 50, y: 53 }, { x: 0, y: 100 }, { x: 100, y: 100 }, false],
  ["竖线内部", { x: 46, y: 50 }, { x: 0, y: 0 }, { x: 0, y: 100 }, true],
  ["窗格最大对角安全整数", { x: 500, y: 310 }, { x: 0, y: 0 }, { x: 1000, y: 620 }, true],
];

for (const [name, point, start, end, expected] of segmentCases) {
  test(`点到线段整数命中：${name}`, () => {
    assert.equal(logic.pointHitsTraceSegment(point, start, end), expected);
  });
}

test("线段命中辅助拒绝非法点", () => {
  assert.throws(() => logic.pointHitsTraceSegment({ x: 0, y: 0, extra: true }, { x: 0, y: 0 }, { x: 1, y: 1 }), TypeError);
  assert.throws(() => logic.pointHitsTraceSegment({ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 1 }), TypeError);
});

test("CONFIRM 从 ready 生成确定 anchors 并进入 tracing", () => {
  const ready = readyState();
  const tracing = logic.reduceFogWindow(ready, { type: "CONFIRM_DRAWING" });
  assert.equal(tracing.phase, "tracing");
  assert.equal(tracing.anchors.length, 64);
  assert.deepEqual(tracing.hitAnchorIds, []);
  assert.equal(tracing.traceStrokeCount, 0);
});

test("CONFIRM 在非 ready phase 引用幂等", () => {
  const writing = startedState();
  assert.strictEqual(logic.reduceFogWindow(writing, { type: "CONFIRM_DRAWING" }), writing);
});

test("BEGIN_TRACE 半径 46 闭圆命中", () => {
  const tracing = tracingState();
  const state = logic.reduceFogWindow(tracing, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 100, y: 54,
  });
  assert.ok(state.hitAnchorIds.includes("0:0"));
  assert.equal(state.traceStrokeCount, 1);
});

test("BEGIN_TRACE 距所有 anchor 47 以上不命中", () => {
  const tracing = tracingState();
  const state = logic.reduceFogWindow(tracing, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 100, y: 53,
  });
  assert.deepEqual(state.hitAnchorIds, []);
});

test("ADD_TRACE_POINT 可跨过无事件落点的多个 anchors", () => {
  let state = tracingState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 100, y: 100,
  });
  state = logic.reduceFogWindow(state, {
    type: "ADD_TRACE_POINT", pointerId: 2, generation: 2, x: 300, y: 100,
  });
  assert.ok(state.hitAnchorIds.length >= 7);
  assert.deepEqual(state.hitAnchorIds, state.anchors.filter((anchor) => state.hitAnchorIds.includes(anchor.id)).map((anchor) => anchor.id));
});

test("重复经过同一 anchor 只计一次", () => {
  let state = tracingState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 100, y: 100,
  });
  const count = state.hitAnchorIds.length;
  state = logic.reduceFogWindow(state, {
    type: "ADD_TRACE_POINT", pointerId: 2, generation: 2, x: 100, y: 100,
  });
  assert.equal(state.hitAnchorIds.length, count);
  assert.equal(new Set(state.hitAnchorIds).size, count);
});

test("原笔迹外横扫不推进", () => {
  let state = tracingState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 0, y: 0,
  });
  state = logic.reduceFogWindow(state, {
    type: "ADD_TRACE_POINT", pointerId: 2, generation: 2, x: 1000, y: 0,
  });
  assert.deepEqual(state.hitAnchorIds, []);
});

test("阈值前一 anchor 保持 tracing", () => {
  const tracing = tracingState();
  const required = Math.ceil(tracing.anchors.length * 4 / 5);
  const forged = cloneState(tracing, {
    hitAnchorIds: tracing.anchors.slice(0, required - 1).map((anchor) => anchor.id),
    traceStrokeCount: 1,
    lastGeneration: 2,
  });
  assert.doesNotThrow(() => logic.assertState(forged));
  assert.equal(forged.phase, "tracing");
});

test("达到 80% 的同一个 BEGIN action 立即 complete", () => {
  const tracing = tracingState();
  const required = Math.ceil(tracing.anchors.length * 4 / 5);
  const before = cloneState(tracing, {
    hitAnchorIds: tracing.anchors.slice(0, required - 1).map((anchor) => anchor.id),
    traceStrokeCount: 1,
    lastGeneration: 2,
  });
  const target = tracing.anchors.at(-1);
  const complete = logic.reduceFogWindow(before, {
    type: "BEGIN_TRACE", pointerId: 9, generation: 3, x: target.x, y: target.y,
  });
  assert.equal(complete.phase, "complete");
  assert.equal(complete.completionReason, "traced");
  assert.equal(complete.active, null);
});

test("active trace END 不保存第二遍轨迹", () => {
  let state = tracingState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 0, y: 0,
  });
  const strokes = state.strokes;
  state = logic.reduceFogWindow(state, {
    type: "END_TRACE", pointerId: 2, generation: 2, reason: "up",
  });
  assert.strictEqual(state.strokes, strokes);
  assert.equal(state.active, null);
});

test("generation 必须严格下一代且只在成功 BEGIN 更新", () => {
  const writing = startedState();
  const skipped = logic.reduceFogWindow(writing, {
    type: "BEGIN_STROKE", pointerId: 1, generation: 2, x: 0, y: 0,
  });
  assert.strictEqual(skipped, writing);
  const accepted = logic.reduceFogWindow(writing, {
    type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 0,
  });
  assert.equal(accepted.lastGeneration, 1);
});

test("第二 pointer 不能抢占 active 会话或消费 generation", () => {
  let state = logic.reduceFogWindow(startedState(), {
    type: "BEGIN_STROKE", pointerId: 11, generation: 1, x: 0, y: 0,
  });
  const blocked = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId: 12, generation: 2, x: 100, y: 100,
  });
  assert.strictEqual(blocked, state);
  assert.equal(blocked.lastGeneration, 1);
});

test("旧 pointerId/generation ADD 与 END 引用幂等", () => {
  let state = logic.reduceFogWindow(startedState(), {
    type: "BEGIN_STROKE", pointerId: 11, generation: 1, x: 0, y: 0,
  });
  for (const action of [
    { type: "ADD_STROKE_POINT", pointerId: 12, generation: 1, x: 20, y: 0 },
    { type: "ADD_STROKE_POINT", pointerId: 11, generation: 2, x: 20, y: 0 },
    { type: "END_STROKE", pointerId: 12, generation: 1, reason: "up" },
    { type: "END_STROKE", pointerId: 11, generation: 2, reason: "up" },
  ]) assert.strictEqual(logic.reduceFogWindow(state, action), state);
});

for (const reason of ["up", "cancel", "lost-capture"]) {
  test(`END_STROKE 合法结束原因：${reason}`, () => {
    let state = logic.reduceFogWindow(startedState(), {
      type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 0,
    });
    state = logic.reduceFogWindow(state, {
      type: "END_STROKE", pointerId: 1, generation: 1, reason,
    });
    assert.equal(state.strokes[0].endReason, reason);
    assert.equal(state.active, null);
    assert.equal(state.lastNotice, reason === "up" ? null : "cancel");
  });
}

for (const reason of ["manual", "escape", "blur", "hidden", "long-frame"]) {
  test(`PAUSE(${reason}) active write 以 pause 闭合`, () => {
    let state = logic.reduceFogWindow(startedState(), {
      type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 0,
    });
    state = logic.reduceFogWindow(state, { type: "PAUSE", reason });
    assert.equal(state.phase, "paused");
    assert.equal(state.resumePhase, "writing");
    assert.equal(state.strokes[0].endReason, "pause");
    assert.equal(state.active, null);
  });
}

test("PAUSE active write 若 Gate 已达成则 resumePhase=ready", () => {
  let state = readyState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_STROKE", pointerId: 2, generation: 2, x: 800, y: 300,
  });
  state = logic.reduceFogWindow(state, { type: "PAUSE", reason: "escape" });
  assert.equal(state.resumePhase, "ready");
});

test("PAUSE active trace 丢 lastPoint 但不增加 hits", () => {
  let state = tracingState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 0, y: 0,
  });
  const hits = state.hitAnchorIds;
  state = logic.reduceFogWindow(state, { type: "PAUSE", reason: "hidden" });
  assert.equal(state.phase, "paused");
  assert.equal(state.resumePhase, "tracing");
  assert.equal(state.active, null);
  assert.deepEqual(state.hitAnchorIds, hits);
});

test("RESUME 只从 paused 恢复冻结 phase", () => {
  const writing = startedState();
  assert.strictEqual(logic.reduceFogWindow(writing, { type: "RESUME" }), writing);
  const paused = logic.reduceFogWindow(writing, { type: "PAUSE", reason: "manual" });
  const resumed = logic.reduceFogWindow(paused, { type: "RESUME" });
  assert.equal(resumed.phase, "writing");
  assert.equal(resumed.resumePhase, null);
  assert.equal(resumed.lastNotice, "resumed");
});

test("START 与 PAUSE 在错误 phase 引用幂等", () => {
  const writing = startedState();
  assert.strictEqual(logic.reduceFogWindow(writing, { type: "START" }), writing);
  const intro = logic.createFogWindowState();
  assert.strictEqual(logic.reduceFogWindow(intro, { type: "PAUSE", reason: "manual" }), intro);
});

const directFactories = [
  ["intro", () => logic.createFogWindowState()],
  ["writing", () => startedState()],
  ["ready", () => readyState()],
  ["tracing", () => tracingState()],
  ["paused", () => logic.reduceFogWindow(startedState(), { type: "PAUSE", reason: "manual" })],
];

for (const [phase, factory] of directFactories) {
  test(`DIRECT_REVEAL 从 ${phase} 完整直开`, () => {
    const complete = logic.reduceFogWindow(factory(), { type: "DIRECT_REVEAL" });
    assert.equal(complete.phase, "complete");
    assert.equal(complete.completionReason, "direct");
    assert.equal(complete.active, null);
    assert.equal(complete.resumePhase, null);
    assert.equal(typeof logic.getFogWindowView(complete).text.completionMessage, "string");
  });
}

test("DIRECT_REVEAL active write 以内建 direct 闭合", () => {
  let state = logic.reduceFogWindow(startedState(), {
    type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 20, y: 20,
  });
  state = logic.reduceFogWindow(state, { type: "DIRECT_REVEAL" });
  assert.equal(state.strokes[0].endReason, "direct");
  assert.equal(state.active, null);
  assert.doesNotThrow(() => logic.assertState(state));
});

test("DIRECT_REVEAL active trace 只丢弃 lastPoint 并保留 anchors/hits", () => {
  let state = tracingState();
  state = logic.reduceFogWindow(state, {
    type: "BEGIN_TRACE", pointerId: 2, generation: 2, x: 100, y: 100,
  });
  const anchors = state.anchors;
  const hits = state.hitAnchorIds;
  state = logic.reduceFogWindow(state, { type: "DIRECT_REVEAL" });
  assert.deepEqual(state.anchors, anchors);
  assert.deepEqual(state.hitAnchorIds, hits);
  assert.equal(state.active, null);
});

test("complete 除 RESTART 外所有合法 action 引用幂等", () => {
  const complete = logic.reduceFogWindow(logic.createFogWindowState(), { type: "DIRECT_REVEAL" });
  for (const action of [
    { type: "START" }, { type: "DIRECT_REVEAL" }, { type: "PAUSE", reason: "manual" },
    { type: "RESUME" }, { type: "CLEAR_DRAWING" }, { type: "CONFIRM_DRAWING" },
  ]) assert.strictEqual(logic.reduceFogWindow(complete, action), complete);
});

test("RESTART 从任意 phase 返回首次 intro 深相等状态", () => {
  const initial = logic.createFogWindowState();
  const phases = [startedState(), readyState(), tracingState(),
    logic.reduceFogWindow(startedState(), { type: "PAUSE", reason: "manual" }),
    logic.reduceFogWindow(initial, { type: "DIRECT_REVEAL" })];
  for (const state of phases) assert.deepEqual(logic.reduceFogWindow(state, { type: "RESTART" }), initial);
});

test("view 顶层、drawing、tracing、active 与 text 字段精确", () => {
  const view = logic.getFogWindowView(tracingState(), configGlobal);
  assert.deepEqual(Object.keys(view), [
    "phase", "resumePhase", "canStart", "canDraw", "canConfirm", "canTrace", "canClear",
    "canDirectReveal", "canResume", "canRestart", "nextGeneration", "drawing", "tracing",
    "active", "notice", "text",
  ]);
  assert.deepEqual(Object.keys(view.drawing), ["strokeCount", "pointCount", "length", "bounds", "shape", "gate", "strokes"]);
  assert.deepEqual(Object.keys(view.tracing), [
    "anchorCount", "hitCount", "requiredCount", "ratioPermille", "traceStrokeCount", "anchors", "hitAnchorIds",
  ]);
  assert.deepEqual(Object.keys(view.text), [
    "title", "subtitle", "instruction", "status", "completionTitle", "completionMessage", "signature",
  ]);
  assertDeepFrozen(view);
});

test("view nextGeneration、能力开关与 tracing 进度正确", () => {
  const tracing = tracingState();
  const view = logic.getFogWindowView(tracing);
  assert.equal(view.nextGeneration, 2);
  assert.equal(view.canTrace, true);
  assert.equal(view.canConfirm, false);
  assert.equal(view.canDirectReveal, true);
  assert.equal(view.tracing.requiredCount, Math.ceil(64 * 4 / 5));
  assert.equal(view.tracing.ratioPermille, 0);
});

test("JSON 往返状态可继续相同 generation 日志", () => {
  const state = tracingState();
  const restored = JSON.parse(JSON.stringify(state));
  const action = { type: "BEGIN_TRACE", pointerId: 4, generation: 2, x: 0, y: 0 };
  assert.deepEqual(logic.reduceFogWindow(restored, action), logic.reduceFogWindow(state, action));
});

const forgedStateCases = [
  ["多余字段", () => ({ ...startedState(), extra: true })],
  ["错误 version", () => ({ ...startedState(), version: 2 })],
  ["错误 drawLength", () => ({ ...readyState(), drawLength: 1 })],
  ["错误 bounds", () => ({ ...readyState(), bounds: { ...readyState().bounds, width: 1 } })],
  ["重复 stroke ID", () => {
    const state = drawStroke(readyState(), [{ x: 800, y: 300 }], { pointerId: 2 });
    const clone = cloneState(state); clone.strokes[1].id = 0; return clone;
  }],
  ["相邻接纳点过近", () => {
    const state = cloneState(drawStroke(startedState(), [{ x: 0, y: 0 }, { x: 12, y: 0 }]));
    state.strokes[0].points[1].x = 1; state.drawLength = 1; state.bounds.maxX = 1; state.bounds.width = 1; return state;
  }],
  ["无 active 的开放 stroke", () => {
    const state = cloneState(drawStroke(startedState(), [{ x: 0, y: 0 }])); state.strokes[0].endReason = null; return state;
  }],
  ["错误 active.lastPoint", () => {
    const state = cloneState(logic.reduceFogWindow(startedState(), {
      type: "BEGIN_STROKE", pointerId: 1, generation: 1, x: 0, y: 0,
    })); state.active.lastPoint.x = 20; return state;
  }],
  ["伪造 anchor 坐标", () => {
    const state = cloneState(tracingState()); state.anchors[0].x += 1; return state;
  }],
  ["重复 hit", () => {
    const state = cloneState(tracingState()); state.hitAnchorIds = [state.anchors[0].id, state.anchors[0].id]; return state;
  }],
  ["逆序 hit", () => {
    const state = cloneState(tracingState()); state.hitAnchorIds = [state.anchors[2].id, state.anchors[1].id]; return state;
  }],
  ["悬空 hit", () => {
    const state = cloneState(tracingState()); state.hitAnchorIds = ["9:9"]; return state;
  }],
  ["writing 无 active 却 Gate 已通过", () => ({ ...readyState(), phase: "writing" })],
  ["tracing 已达阈值却未 complete", () => {
    const state = cloneState(tracingState());
    state.hitAnchorIds = state.anchors.slice(0, Math.ceil(state.anchors.length * 4 / 5)).map((anchor) => anchor.id);
    return state;
  }],
  ["complete 缺 reason", () => ({ ...logic.reduceFogWindow(logic.createFogWindowState(), { type: "DIRECT_REVEAL" }), completionReason: null })],
  ["lastGeneration 非安全整数", () => ({ ...startedState(), lastGeneration: Number.MAX_SAFE_INTEGER + 1 })],
  ["lastGeneration 小于当前会话数", () => ({ ...readyState(), lastGeneration: 0 })],
  ["伪造 internal limit", () => {
    const state = cloneState(drawStroke(startedState(), [{ x: 0, y: 0 }])); state.strokes[0].endReason = "limit"; return state;
  }],
  ["伪造 internal direct", () => {
    const state = cloneState(drawStroke(startedState(), [{ x: 0, y: 0 }])); state.strokes[0].endReason = "direct"; return state;
  }],
  ["announcement 非安全整数", () => ({ ...startedState(), announcementSerial: Number.MAX_SAFE_INTEGER + 1 })],
];

for (const [name, factory] of forgedStateCases) {
  test(`assertState 拒绝外部伪造：${name}`, () => {
    assert.throws(() => logic.assertState(factory()), TypeError);
  });
}

test("同一 production action 日志 replay 深相等", () => {
  const first = logic.replayFogWindow(GOLDEN_REPLAY);
  const second = logic.replayFogWindow(structuredClone(GOLDEN_REPLAY));
  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
});

test("golden replay 每一步都是可接受冻结状态", () => {
  let state = logic.createFogWindowState();
  for (const action of GOLDEN_REPLAY) {
    state = logic.reduceFogWindow(state, action);
    assert.doesNotThrow(() => logic.assertState(state));
    assertDeepFrozen(state);
  }
});

test("golden replay 只用公开 action 完成 traced 路径", () => {
  const final = logic.replayFogWindow(GOLDEN_REPLAY);
  assert.equal(final.phase, "complete");
  assert.equal(final.completionReason, "traced");
  assert.equal(final.anchors.length, 64);
  assert.ok(final.hitAnchorIds.length >= Math.ceil(64 * 4 / 5));
  assert.equal(final.active, null);
  assert.equal(final.strokes.length, 1);
});

test("replay 拒绝非数组并透传非法 action", () => {
  assert.throws(() => logic.replayFogWindow(null), TypeError);
  assert.throws(() => logic.replayFogWindow([{ type: "PAUSE", reason: "bad" }]), TypeError);
});
