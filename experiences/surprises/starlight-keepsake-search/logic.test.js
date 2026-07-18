import test from "node:test";
import assert from "node:assert/strict";

await import("./config.js");
await import("./logic.js");

const configGlobal = globalThis.STARLIGHT_KEEPSAKE_SEARCH_CONFIG;
const logic = globalThis.STARLIGHT_KEEPSAKE_SEARCH_LOGIC;

function startedState() {
  return logic.reduceStarlight(logic.createStarlightState(), { type: "START" });
}

function target(id) {
  return logic.TARGETS.find((item) => item.id === id);
}

function beginAt(id = "k1", options = {}) {
  const item = target(id);
  const state = options.state || startedState();
  const pointerId = options.pointerId ?? 7;
  const generation = options.generation ?? state.lastGeneration + 1;
  const pointerType = options.pointerType || "mouse";
  return logic.reduceStarlight(state, {
    type: "BEGIN_POINTER", pointerId, generation, pointerType, x: item.x, y: item.y,
  });
}

function moveTo(state, id, pointerId = 7, generation = state.lastGeneration) {
  const item = target(id);
  return logic.reduceStarlight(state, {
    type: "MOVE_POINTER", pointerId, generation, x: item.x, y: item.y,
  });
}

function dwell(state) {
  for (const ticks of [5, 5, 4]) state = logic.reduceStarlight(state, { type: "TICK", ticks });
  return state;
}

function discoverOrder(ids) {
  let state = beginAt(ids[0]);
  for (let index = 0; index < ids.length; index += 1) {
    if (index > 0) state = moveTo(state, ids[index]);
    state = dwell(state);
  }
  return state;
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

function goldenActions() {
  const first = target("k1");
  const actions = [{ type: "START" }, {
    type: "BEGIN_POINTER", pointerId: 7, generation: 1, pointerType: "mouse", x: first.x, y: first.y,
  }];
  for (const id of ["k1", "k2", "k3", "k4", "k5"]) {
    if (id !== "k1") {
      const item = target(id);
      actions.push({ type: "MOVE_POINTER", pointerId: 7, generation: 1, x: item.x, y: item.y });
    }
    actions.push({ type: "TICK", ticks: 5 }, { type: "TICK", ticks: 5 }, { type: "TICK", ticks: 4 });
  }
  return actions;
}

const GOLDEN_ACTIONS = goldenActions();

test("冻结常量与五目标地图精确匹配规格", () => {
  assert.deepEqual({
    width: logic.WORLD_WIDTH,
    height: logic.WORLD_HEIGHT,
    startX: logic.LIGHT_START_X,
    startY: logic.LIGHT_START_Y,
    count: logic.TARGET_COUNT,
    capture: logic.CAPTURE_RADIUS,
    tickMs: logic.TICK_MS,
    focus: logic.FOCUS_TICKS,
    keyboard: logic.KEYBOARD_STEP,
    maxTicks: logic.MAX_TICKS_PER_ACTION,
    maxGap: logic.MAX_FRAME_GAP_MS,
  }, {
    width: 1000, height: 620, startX: 500, startY: 310, count: 5, capture: 58,
    tickMs: 50, focus: 14, keyboard: 18, maxTicks: 5, maxGap: 250,
  });
  assert.deepEqual(logic.TARGETS, [
    { id: "k1", x: 180, y: 100, radius: 64 },
    { id: "k2", x: 800, y: 105, radius: 82 },
    { id: "k3", x: 295, y: 455, radius: 70 },
    { id: "k4", x: 685, y: 455, radius: 70 },
    { id: "k5", x: 948, y: 360, radius: 52 },
  ]);
});

test("逻辑 API、地图、默认配置和 classic config 递归冻结", () => {
  assertDeepFrozen(logic);
  assertDeepFrozen(logic.TARGETS);
  assertDeepFrozen(logic.DEFAULT_CONFIG);
  assertDeepFrozen(configGlobal);
});

test("配置全局名与默认 TODO 无需修改即可给出完整正文", () => {
  const complete = logic.reduceStarlight(logic.createStarlightState(), { type: "DIRECT_REVEAL" });
  const view = logic.getStarlightView(complete, configGlobal);
  assert.equal(view.text.completionMessage, configGlobal.defaultMessage);
});

const configFields = [
  ["title", 40], ["subtitle", 100], ["intro", 180], ["startButton", 32],
  ["directButton", 32], ["searchInstruction", 180], ["pauseButton", 32],
  ["resumeButton", 32], ["foundTitle", 40], ["completionTitle", 40],
  ["defaultMessage", 280], ["signature", 80], ["restartButton", 32],
];

for (const [field, limit] of configFields) {
  test(`配置字段 trim 与 Unicode 截断：${field}`, () => {
    const safe = logic.sanitizeStarlightConfig({ [field]: `  ${"光".repeat(limit + 3)}  ` });
    assert.equal(safe[field], "光".repeat(limit));
    assert.equal([...safe[field]].length, limit);
  });
}

test("配置非字符串、空白和 getter 抛错逐字段回退", () => {
  const raw = { title: 42, subtitle: "   " };
  Object.defineProperty(raw, "signature", { get() { throw new Error("nope"); } });
  const safe = logic.sanitizeStarlightConfig(raw);
  assert.equal(safe.title, logic.DEFAULT_CONFIG.title);
  assert.equal(safe.subtitle, logic.DEFAULT_CONFIG.subtitle);
  assert.equal(safe.signature, logic.DEFAULT_CONFIG.signature);
});

test("五件配置可乱序输入但按冻结 ID 顺序输出并隔离所有权", () => {
  const keepsakes = [...configGlobal.keepsakes].reverse().map((item) => ({
    id: item.id, label: ` ${item.id}私名 `, note: ` ${item.id}私话 `,
  }));
  const safe = logic.sanitizeStarlightConfig({ keepsakes });
  keepsakes[0].label = "外部修改";
  assert.deepEqual(safe.keepsakes.map((item) => item.id), ["k1", "k2", "k3", "k4", "k5"]);
  assert.deepEqual(safe.keepsakes.map((item) => item.label), ["k1私名", "k2私名", "k3私名", "k4私名", "k5私名"]);
});

const badKeepsakeLists = [
  ["缺项", configGlobal.keepsakes.slice(0, 4)],
  ["重复 ID", configGlobal.keepsakes.map((item, index) => ({ ...item, id: index === 4 ? "k1" : item.id }))],
  ["额外 ID", configGlobal.keepsakes.map((item, index) => ({ ...item, id: index === 4 ? "k6" : item.id }))],
  ["条目多字段", configGlobal.keepsakes.map((item, index) => (index ? item : { ...item, extra: true }))],
];

for (const [name, keepsakes] of badKeepsakeLists) {
  test(`非法纪念物配置整组回退：${name}`, () => {
    assert.deepEqual(logic.sanitizeStarlightConfig({ keepsakes }).keepsakes, logic.DEFAULT_CONFIG.keepsakes);
  });
}

test("纪念物 label/note 空白、非字符串和超长分别回退", () => {
  const keepsakes = configGlobal.keepsakes.map((item) => ({ ...item }));
  keepsakes[0].label = " ";
  keepsakes[1].note = 42;
  keepsakes[2].label = "名".repeat(25);
  keepsakes[3].note = "话".repeat(101);
  const safe = logic.sanitizeStarlightConfig({ keepsakes });
  for (const index of [0, 1, 2, 3]) assert.deepEqual(safe.keepsakes[index], logic.DEFAULT_CONFIG.keepsakes[index]);
});

test("嵌套纪念物 getter 抛错时对应字段回退", () => {
  const keepsakes = configGlobal.keepsakes.map((item) => ({ ...item }));
  Object.defineProperty(keepsakes[0], "label", { enumerable: true, get() { throw new Error("nope"); } });
  const safe = logic.sanitizeStarlightConfig({ keepsakes });
  assert.equal(safe.keepsakes[0].label, logic.DEFAULT_CONFIG.keepsakes[0].label);
  assert.equal(safe.keepsakes[0].note, configGlobal.keepsakes[0].note);
});

const badComposeCases = [
  ["抛错", () => { throw new Error("bad"); }],
  ["空白", () => "   "],
  ["非字符串", () => 42],
  ["超过 280 code points", () => "长".repeat(281)],
  ["修改冻结摘要", (summary) => { summary.foundCount = 99; return "不应采用"; }],
];

for (const [name, composeStarlightLetter] of badComposeCases) {
  test(`composeStarlightLetter 非法结果安全回退：${name}`, () => {
    const complete = logic.reduceStarlight(logic.createStarlightState(), { type: "DIRECT_REVEAL" });
    const view = logic.getStarlightView(complete, { composeStarlightLetter });
    assert.equal(view.text.completionMessage, logic.DEFAULT_CONFIG.defaultMessage);
  });
}

test("compose 只收到精确冻结摘要且合法结果会 trim", () => {
  let received;
  const partial = discoverOrder(["k3", "k1"]);
  const complete = logic.reduceStarlight(partial, { type: "DIRECT_REVEAL" });
  const view = logic.getStarlightView(complete, {
    composeStarlightLetter(summary) {
      received = summary;
      return "  我们的夜晚  ";
    },
  });
  assert.equal(view.text.completionMessage, "我们的夜晚");
  assert.deepEqual(Object.keys(received), [
    "foundCount", "foundLabels", "lastFoundLabel", "completionReason", "defaultMessage",
  ]);
  assertDeepFrozen(received);
  assert.equal(received.foundCount, 2);
  assert.equal(received.lastFoundLabel, logic.DEFAULT_CONFIG.keepsakes[0].label);
  for (const forbidden of ["targets", "note", "pointerId", "generation", "heldKeys", "focusTicks", "state"]) {
    assert.equal(forbidden in received, false);
  }
});

test("生产地图合法且五个闭圆不含起点", () => {
  assert.equal(logic.validateStarlightTargets(logic.TARGETS), true);
  for (const item of logic.TARGETS) {
    const dx = logic.LIGHT_START_X - item.x;
    const dy = logic.LIGHT_START_Y - item.y;
    assert.ok(dx * dx + dy * dy > item.radius * item.radius);
  }
});

const invalidMapCases = [
  ["数量不足", logic.TARGETS.slice(0, 4)],
  ["重复 ID", logic.TARGETS.map((item, index) => ({ ...item, id: index === 4 ? "k1" : item.id }))],
  ["非法 ID", logic.TARGETS.map((item, index) => ({ ...item, id: index === 4 ? "ticket" : item.id }))],
  ["额外字段", logic.TARGETS.map((item, index) => (index ? { ...item } : { ...item, label: "secret" }))],
  ["非整数", logic.TARGETS.map((item, index) => ({ ...item, x: index ? item.x : 180.5 }))],
  ["半径零", logic.TARGETS.map((item, index) => ({ ...item, radius: index ? item.radius : 0 }))],
  ["左边越界", logic.TARGETS.map((item, index) => ({ ...item, x: index ? item.x : 63 }))],
  ["右边越界", logic.TARGETS.map((item, index) => ({ ...item, x: index === 4 ? 949 : item.x }))],
  ["包含起点", logic.TARGETS.map((item, index) => (index ? { ...item } : { ...item, x: 500, y: 310 }))],
];

for (const [name, map] of invalidMapCases) {
  test(`地图校验拒绝：${name}`, () => assert.equal(logic.validateStarlightTargets(map), false));
}

test("闭圆相离 1 单位合法、相切与重叠拒绝", () => {
  const map = [
    { id: "k1", x: 100, y: 100, radius: 10 },
    { id: "k2", x: 121, y: 100, radius: 10 },
    { id: "k3", x: 300, y: 100, radius: 10 },
    { id: "k4", x: 700, y: 100, radius: 10 },
    { id: "k5", x: 900, y: 500, radius: 10 },
  ];
  assert.equal(logic.validateStarlightTargets(map), true);
  map[1].x = 120;
  assert.equal(logic.validateStarlightTargets(map), false);
  map[1].x = 119;
  assert.equal(logic.validateStarlightTargets(map), false);
});

test("地图 getter 抛错时稳定拒绝", () => {
  const map = logic.TARGETS.map((item) => ({ ...item }));
  Object.defineProperty(map[0], "x", { enumerable: true, get() { throw new Error("bad map"); } });
  assert.equal(logic.validateStarlightTargets(map), false);
});

test("初态精确、递归冻结且 JSON 可往返", () => {
  const state = logic.createStarlightState();
  assert.deepEqual(state, {
    version: 1,
    phase: "intro",
    resumePhase: null,
    light: { x: 500, y: 310 },
    controlMode: null,
    activePointer: null,
    lastGeneration: 0,
    heldKeys: [],
    focusTargetId: null,
    focusTicks: 0,
    foundIds: [],
    completionReason: null,
    announcementSerial: 0,
    lastNotice: null,
  });
  assertDeepFrozen(state);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  assert.doesNotThrow(() => logic.assertState(JSON.parse(JSON.stringify(state))));
});

const invalidActions = [
  ["null", null], ["缺 type", {}], ["未知 type", { type: "TELEPORT" }],
  ["START 多字段", { type: "START", extra: true }],
  ["BEGIN 缺字段", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "mouse", x: 0 }],
  ["BEGIN 多字段", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "mouse", x: 0, y: 0, extra: true }],
  ["pointerId 负数", { type: "BEGIN_POINTER", pointerId: -1, generation: 1, pointerType: "mouse", x: 0, y: 0 }],
  ["pointerId 不安全", { type: "BEGIN_POINTER", pointerId: Number.MAX_SAFE_INTEGER + 1, generation: 1, pointerType: "mouse", x: 0, y: 0 }],
  ["generation 零", { type: "BEGIN_POINTER", pointerId: 1, generation: 0, pointerType: "mouse", x: 0, y: 0 }],
  ["generation 不安全", { type: "BEGIN_POINTER", pointerId: 1, generation: Number.MAX_SAFE_INTEGER + 1, pointerType: "mouse", x: 0, y: 0 }],
  ["pointerType 错", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "trackpad", x: 0, y: 0 }],
  ["x 小数", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "mouse", x: 0.5, y: 0 }],
  ["x 负数", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "mouse", x: -1, y: 0 }],
  ["x 越界", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "mouse", x: 1001, y: 0 }],
  ["y 负数", { type: "BEGIN_POINTER", pointerId: 1, generation: 1, pointerType: "mouse", x: 0, y: -1 }],
  ["y 越界", { type: "MOVE_POINTER", pointerId: 1, generation: 1, x: 0, y: 621 }],
  ["MOVE 多字段", { type: "MOVE_POINTER", pointerId: 1, generation: 1, x: 0, y: 0, extra: true }],
  ["END 错 reason", { type: "END_POINTER", pointerId: 1, generation: 1, reason: "blur" }],
  ["END 多字段", { type: "END_POINTER", pointerId: 1, generation: 1, reason: "up", extra: true }],
  ["SET_KEY 错 code", { type: "SET_KEY", code: "KeyW", pressed: true }],
  ["SET_KEY pressed 非布尔", { type: "SET_KEY", code: "ArrowUp", pressed: 1 }],
  ["SET_KEY 多字段", { type: "SET_KEY", code: "ArrowUp", pressed: true, repeat: false }],
  ["TICK 零", { type: "TICK", ticks: 0 }],
  ["TICK 六", { type: "TICK", ticks: 6 }],
  ["TICK 小数", { type: "TICK", ticks: 1.5 }],
  ["TICK 多字段", { type: "TICK", ticks: 1, ms: 50 }],
  ["PAUSE 错 reason", { type: "PAUSE", reason: "network" }],
  ["PAUSE 多字段", { type: "PAUSE", reason: "manual", extra: true }],
  ["ACTIVATE 多字段", { type: "ACTIVATE_KEYBOARD", extra: true }],
  ["CENTER 多字段", { type: "CENTER_LIGHT", extra: true }],
  ["DIRECT 多字段", { type: "DIRECT_REVEAL", extra: true }],
  ["RESUME 多字段", { type: "RESUME", extra: true }],
  ["RESTART 多字段", { type: "RESTART", extra: true }],
];

for (const [name, action] of invalidActions) {
  test(`非法 action 抛 TypeError：${name}`, () => {
    assert.throws(() => logic.reduceStarlight(logic.createStarlightState(), action), TypeError);
  });
}

test("START 只从 intro 生效且其他 phase 同引用", () => {
  const intro = logic.createStarlightState();
  const searching = logic.reduceStarlight(intro, { type: "START" });
  assert.equal(searching.phase, "searching");
  assert.equal(searching.lastNotice, "started");
  assert.equal(logic.reduceStarlight(searching, { type: "START" }), searching);
});

for (const pointerType of ["mouse", "touch", "pen"]) {
  test(`BEGIN_POINTER 支持 ${pointerType} 并消费精确下一 generation`, () => {
    const state = beginAt("k1", { pointerType, pointerId: 12 });
    assert.deepEqual(state.activePointer, { pointerId: 12, generation: 1, pointerType });
    assert.equal(state.lastGeneration, 1);
    assert.equal(state.controlMode, "pointer");
    assert.equal(state.focusTargetId, "k1");
    assert.equal(state.focusTicks, 0);
  });
}

test("旧、未来 generation 和第二 pointer 都是引用幂等且不消费代次", () => {
  const searching = startedState();
  const item = target("k1");
  for (const generation of [0, 2]) {
    if (generation === 0) continue;
    const result = logic.reduceStarlight(searching, {
      type: "BEGIN_POINTER", pointerId: 1, generation, pointerType: "mouse", x: item.x, y: item.y,
    });
    assert.equal(result, searching);
    assert.equal(result.lastGeneration, 0);
  }
  const active = beginAt("k1");
  const second = logic.reduceStarlight(active, {
    type: "BEGIN_POINTER", pointerId: 8, generation: 2, pointerType: "touch", x: item.x, y: item.y,
  });
  assert.equal(second, active);
  assert.equal(second.lastGeneration, 1);
});

test("MOVE 只接受精确 pointerId + generation，迟到事件不移动", () => {
  const state = beginAt("k1");
  const item = target("k2");
  for (const [pointerId, generation] of [[8, 1], [7, 2]]) {
    const action = { type: "MOVE_POINTER", pointerId, generation, x: item.x, y: item.y };
    assert.equal(logic.reduceStarlight(state, action), state);
  }
  const moved = moveTo(state, "k2");
  assert.deepEqual(moved.light, { x: item.x, y: item.y });
  assert.equal(moved.focusTargetId, "k2");
});

for (const reason of ["up", "cancel", "lost-capture", "leave"]) {
  test(`END_POINTER ${reason} 清会话与 focus、保留 generation`, () => {
    const focused = logic.reduceStarlight(beginAt("k1"), { type: "TICK", ticks: 5 });
    const ended = logic.reduceStarlight(focused, {
      type: "END_POINTER", pointerId: 7, generation: 1, reason,
    });
    assert.equal(ended.controlMode, null);
    assert.equal(ended.activePointer, null);
    assert.equal(ended.focusTargetId, null);
    assert.equal(ended.focusTicks, 0);
    assert.equal(ended.lastGeneration, 1);
    assert.equal(ended.lastNotice, "focus-reset");
  });
}

test("迟到 END 不能结束下一 generation 的新会话", () => {
  let state = beginAt("k1");
  state = logic.reduceStarlight(state, { type: "END_POINTER", pointerId: 7, generation: 1, reason: "up" });
  state = beginAt("k2", { state, generation: 2 });
  const late = logic.reduceStarlight(state, {
    type: "END_POINTER", pointerId: 7, generation: 1, reason: "lost-capture",
  });
  assert.equal(late, state);
  assert.equal(late.activePointer.generation, 2);
});

test("捕获圆中心、闭边界命中，外一单位不命中", () => {
  for (const item of logic.TARGETS) {
    assert.equal(logic.findStarlightTarget(item.x, item.y, []), item.id);
    assert.equal(logic.findStarlightTarget(item.x + item.radius, item.y, []), item.id);
    const outsideX = item.x + item.radius + 1 <= logic.WORLD_WIDTH
      ? item.x + item.radius + 1 : item.x - item.radius - 1;
    assert.equal(logic.findStarlightTarget(outsideX, item.y, []), null);
  }
});

test("findStarlightTarget 严格验证坐标与 foundIds", () => {
  assert.throws(() => logic.findStarlightTarget(-1, 0, []), TypeError);
  assert.throws(() => logic.findStarlightTarget(0, 0, ["bad"]), TypeError);
  assert.throws(() => logic.findStarlightTarget(0, 0, ["k1", "k1"]), TypeError);
});

test("Pointer 首次进入只定位为 0 tick，不自行累计", () => {
  const state = beginAt("k1");
  assert.equal(state.focusTargetId, "k1");
  assert.equal(state.focusTicks, 0);
  assert.deepEqual(state.foundIds, []);
});

test("同目标圈内 MOVE 保留 ticks，换目标和移出归零", () => {
  let state = logic.reduceStarlight(beginAt("k1"), { type: "TICK", ticks: 5 });
  const k1 = target("k1");
  state = logic.reduceStarlight(state, {
    type: "MOVE_POINTER", pointerId: 7, generation: 1, x: k1.x + 10, y: k1.y,
  });
  assert.equal(state.focusTicks, 5);
  state = moveTo(state, "k2");
  assert.equal(state.focusTargetId, "k2");
  assert.equal(state.focusTicks, 0);
  state = logic.reduceStarlight(state, {
    type: "MOVE_POINTER", pointerId: 7, generation: 1, x: 500, y: 310,
  });
  assert.equal(state.focusTargetId, null);
  assert.equal(state.focusTicks, 0);
});

test("精确 13 tick 不发现，第 14 tick 单调追加并清 focus", () => {
  let state = beginAt("k1");
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 3 });
  assert.equal(state.focusTicks, 13);
  assert.deepEqual(state.foundIds, []);
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 1 });
  assert.deepEqual(state.foundIds, ["k1"]);
  assert.equal(state.focusTargetId, null);
  assert.equal(state.focusTicks, 0);
});

test("TICK 5+5+4、14 个 TICK1 与其他合法分片深相等", () => {
  const initial = beginAt("k1");
  const splitA = [5, 5, 4].reduce((state, ticks) => logic.reduceStarlight(state, { type: "TICK", ticks }), initial);
  const splitB = Array.from({ length: 14 }, () => 1)
    .reduce((state, ticks) => logic.reduceStarlight(state, { type: "TICK", ticks }), initial);
  const splitC = [3, 4, 2, 5].reduce((state, ticks) => logic.reduceStarlight(state, { type: "TICK", ticks }), initial);
  assert.deepEqual(splitA, splitB);
  assert.deepEqual(splitA, splitC);
});

test("已发现目标不会再次吸住 focus 或重复计数", () => {
  let state = dwell(beginAt("k1"));
  const before = state.foundIds;
  state = moveTo(state, "k2");
  state = moveTo(state, "k1");
  assert.equal(state.focusTargetId, null);
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  assert.deepEqual(state.foundIds, before);
});

test("任意发现顺序保持真实顺序", () => {
  const state = discoverOrder(["k4", "k2", "k5"]);
  assert.deepEqual(state.foundIds, ["k4", "k2", "k5"]);
  assert.equal(state.phase, "searching");
});

test("第五件在达到第 14 tick 的同一 action 立即 complete/search", () => {
  let state = discoverOrder(["k5", "k4", "k3", "k2"]);
  state = moveTo(state, "k1");
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 3 });
  assert.equal(state.phase, "searching");
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 1 });
  assert.equal(state.phase, "complete");
  assert.equal(state.completionReason, "search");
  assert.deepEqual(state.foundIds, ["k5", "k4", "k3", "k2", "k1"]);
  assert.equal(state.controlMode, null);
  assert.equal(state.activePointer, null);
});

test("ACTIVATE_KEYBOARD 清 Pointer、按键和 focus，重复空激活同引用", () => {
  const pointer = logic.reduceStarlight(beginAt("k1"), { type: "TICK", ticks: 5 });
  const keyboard = logic.reduceStarlight(pointer, { type: "ACTIVATE_KEYBOARD" });
  assert.equal(keyboard.controlMode, "keyboard");
  assert.equal(keyboard.activePointer, null);
  assert.deepEqual(keyboard.heldKeys, []);
  assert.equal(keyboard.focusTargetId, null);
  assert.equal(keyboard.focusTicks, 0);
  assert.equal(keyboard.lastGeneration, 1);
  assert.equal(logic.reduceStarlight(keyboard, { type: "ACTIVATE_KEYBOARD" }), keyboard);
});

test("SET_KEY 自动键盘接管并按 Up/Down/Left/Right 固定唯一顺序", () => {
  let state = beginAt("k1");
  for (const code of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
    state = logic.reduceStarlight(state, { type: "SET_KEY", code, pressed: true });
  }
  assert.equal(state.controlMode, "keyboard");
  assert.equal(state.activePointer, null);
  assert.deepEqual(state.heldKeys, ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  const duplicate = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowRight", pressed: true });
  assert.equal(duplicate, state);
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowDown", pressed: false });
  assert.deepEqual(state.heldKeys, ["ArrowUp", "ArrowLeft", "ArrowRight"]);
  assert.equal(logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowDown", pressed: false }), state);
});

test("按键 action 本身不移动，TICK 才按每轴 18 移动", () => {
  let state = startedState();
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowRight", pressed: true });
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowDown", pressed: true });
  assert.deepEqual(state.light, { x: 500, y: 310 });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 1 });
  assert.deepEqual(state.light, { x: 518, y: 328 });
});

test("相反方向逐轴抵消且 TICK 不制造空 revision", () => {
  let state = startedState();
  for (const code of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    state = logic.reduceStarlight(state, { type: "SET_KEY", code, pressed: true });
  }
  const ticked = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  assert.equal(ticked, state);
  assert.deepEqual(ticked.light, { x: 500, y: 310 });
});

test("键盘逐轴 clamp 到世界边界", () => {
  let state = startedState();
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowRight", pressed: true });
  for (let index = 0; index < 7; index += 1) state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  assert.equal(state.light.x, 1000);
  const atRight = state;
  assert.equal(logic.reduceStarlight(atRight, { type: "TICK", ticks: 5 }), atRight);
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowRight", pressed: false });
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowUp", pressed: true });
  for (let index = 0; index < 7; index += 1) state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  assert.equal(state.light.y, 0);
});

test("键盘移动进入目标的定位 tick 为 0，后续 tick 才累计", () => {
  let state = startedState();
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowRight", pressed: true });
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowDown", pressed: true });
  while (state.focusTargetId === null) state = logic.reduceStarlight(state, { type: "TICK", ticks: 1 });
  assert.equal(state.focusTargetId, "k4");
  assert.equal(state.focusTicks, 0);
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowRight", pressed: false });
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowDown", pressed: false });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 1 });
  assert.equal(state.focusTicks, 1);
});

test("CENTER_LIGHT 由键盘接管并清 active/keys/focus，重复 Home 同引用", () => {
  let state = logic.reduceStarlight(beginAt("k1"), { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "CENTER_LIGHT" });
  assert.deepEqual(state.light, { x: 500, y: 310 });
  assert.equal(state.controlMode, "keyboard");
  assert.equal(state.activePointer, null);
  assert.deepEqual(state.heldKeys, []);
  assert.equal(state.focusTargetId, null);
  assert.equal(logic.reduceStarlight(state, { type: "CENTER_LIGHT" }), state);
});

test("键盘接管后旧 Pointer MOVE/END 均引用幂等", () => {
  let state = beginAt("k1");
  state = logic.reduceStarlight(state, { type: "SET_KEY", code: "ArrowLeft", pressed: true });
  const k2 = target("k2");
  assert.equal(logic.reduceStarlight(state, {
    type: "MOVE_POINTER", pointerId: 7, generation: 1, x: k2.x, y: k2.y,
  }), state);
  assert.equal(logic.reduceStarlight(state, {
    type: "END_POINTER", pointerId: 7, generation: 1, reason: "lost-capture",
  }), state);
});

for (const reason of ["manual", "escape", "blur", "hidden", "long-frame"]) {
  test(`PAUSE ${reason} 清输入和停留但保留位置、found 与 generation`, () => {
    let state = discoverOrder(["k1"]);
    state = moveTo(state, "k2");
    state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
    const light = state.light;
    const paused = logic.reduceStarlight(state, { type: "PAUSE", reason });
    assert.equal(paused.phase, "paused");
    assert.equal(paused.resumePhase, "searching");
    assert.deepEqual(paused.light, light);
    assert.deepEqual(paused.foundIds, ["k1"]);
    assert.equal(paused.lastGeneration, 1);
    assert.equal(paused.controlMode, null);
    assert.equal(paused.activePointer, null);
    assert.deepEqual(paused.heldKeys, []);
    assert.equal(paused.focusTargetId, null);
    assert.equal(paused.focusTicks, 0);
  });
}

test("RESUME 不自动恢复输入或旧停留，mode null 的 TICK 同引用", () => {
  let state = logic.reduceStarlight(beginAt("k1"), { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "PAUSE", reason: "manual" });
  state = logic.reduceStarlight(state, { type: "RESUME" });
  assert.equal(state.phase, "searching");
  assert.equal(state.resumePhase, null);
  assert.equal(state.controlMode, null);
  assert.equal(state.focusTicks, 0);
  assert.equal(logic.reduceStarlight(state, { type: "TICK", ticks: 5 }), state);
});

test("DIRECT 从 intro/searching/paused 完成且保留真实 found 0..4 顺序", () => {
  const intro = logic.createStarlightState();
  const introDirect = logic.reduceStarlight(intro, { type: "DIRECT_REVEAL" });
  assert.equal(introDirect.phase, "complete");
  assert.equal(introDirect.completionReason, "direct");
  assert.deepEqual(introDirect.foundIds, []);

  const partial = discoverOrder(["k4", "k1"]);
  const searchingDirect = logic.reduceStarlight(partial, { type: "DIRECT_REVEAL" });
  assert.deepEqual(searchingDirect.foundIds, ["k4", "k1"]);
  assert.equal(searchingDirect.lastGeneration, 1);

  const paused = logic.reduceStarlight(partial, { type: "PAUSE", reason: "hidden" });
  const pausedDirect = logic.reduceStarlight(paused, { type: "DIRECT_REVEAL" });
  assert.deepEqual(pausedDirect.foundIds, ["k4", "k1"]);
  assert.equal(pausedDirect.resumePhase, null);
});

test("complete 除 RESTART 外全部合法 action 同引用，RESTART 精确初态", () => {
  const complete = logic.reduceStarlight(logic.createStarlightState(), { type: "DIRECT_REVEAL" });
  const validActions = [
    { type: "START" }, { type: "ACTIVATE_KEYBOARD" }, { type: "CENTER_LIGHT" },
    { type: "TICK", ticks: 1 }, { type: "PAUSE", reason: "manual" }, { type: "RESUME" },
    { type: "DIRECT_REVEAL" },
  ];
  for (const action of validActions) assert.equal(logic.reduceStarlight(complete, action), complete);
  assert.deepEqual(logic.reduceStarlight(complete, { type: "RESTART" }), logic.createStarlightState());
});

test("RESTART 在非 complete 阶段引用幂等", () => {
  const searching = startedState();
  assert.equal(logic.reduceStarlight(searching, { type: "RESTART" }), searching);
});

test("view 顶层与嵌套字段精确、递归冻结且隔离 state/config 引用", () => {
  const state = beginAt("k1");
  const view = logic.getStarlightView(state, configGlobal);
  assert.deepEqual(Object.keys(view), [
    "phase", "canStart", "canSearch", "canDirectReveal", "canPause", "canResume",
    "canRestart", "nextGeneration", "light", "focus", "discovery", "activePointer", "notice", "text",
  ]);
  assert.deepEqual(Object.keys(view.light), ["x", "y", "engaged", "controlMode"]);
  assert.deepEqual(Object.keys(view.focus), ["targetId", "ticks", "requiredTicks", "permille"]);
  assert.deepEqual(Object.keys(view.discovery), [
    "count", "total", "foundIds", "foundItems", "revealedItems", "targets",
  ]);
  assert.deepEqual(Object.keys(view.activePointer), ["pointerId", "generation", "pointerType"]);
  assertDeepFrozen(view);
  assert.notEqual(view.light, state.light);
  assert.notEqual(view.activePointer, state.activePointer);
});

test("intro/searching view 不泄露未发现 label、note 或完成秘密", () => {
  const forbidden = configGlobal.keepsakes.flatMap((item) => [item.label, item.note])
    .concat([configGlobal.completionTitle, configGlobal.defaultMessage, configGlobal.signature]);
  for (const state of [logic.createStarlightState(), beginAt("k1")]) {
    const view = logic.getStarlightView(state, configGlobal);
    const serialized = JSON.stringify(view);
    for (const secret of forbidden) assert.equal(serialized.includes(secret), false, secret);
    assert.deepEqual(view.discovery.foundItems, []);
    assert.deepEqual(view.discovery.revealedItems, []);
    assert.equal(view.text.completionTitle, null);
    assert.equal(view.text.completionMessage, null);
    assert.equal(view.text.signature, null);
  }
});

test("每次发现只揭示真实 foundItems，targets 始终只有 opaque ID 与几何", () => {
  const state = discoverOrder(["k3", "k1"]);
  const view = logic.getStarlightView(state, configGlobal);
  assert.deepEqual(view.discovery.foundIds, ["k3", "k1"]);
  assert.deepEqual(view.discovery.foundItems.map((item) => item.id), ["k3", "k1"]);
  assert.deepEqual(view.discovery.revealedItems, []);
  for (const item of view.discovery.targets) {
    assert.deepEqual(Object.keys(item), ["id", "x", "y", "radius", "found"]);
    assert.match(item.id, /^k[1-5]$/);
  }
  const serialized = JSON.stringify(view);
  for (const id of ["k2", "k4", "k5"]) {
    const hidden = configGlobal.keepsakes.find((item) => item.id === id);
    assert.equal(serialized.includes(hidden.label), false);
    assert.equal(serialized.includes(hidden.note), false);
  }
});

test("complete/search 的 foundItems 与 revealedItems 都含五项", () => {
  const complete = discoverOrder(["k2", "k5", "k1", "k4", "k3"]);
  const view = logic.getStarlightView(complete, configGlobal);
  assert.deepEqual(view.discovery.foundItems.map((item) => item.id), ["k2", "k5", "k1", "k4", "k3"]);
  assert.deepEqual(view.discovery.revealedItems.map((item) => item.id), ["k1", "k2", "k3", "k4", "k5"]);
  assert.equal(view.text.completionTitle, configGlobal.completionTitle);
  assert.equal(view.text.signature, configGlobal.signature);
});

test("complete/direct 保留 foundItems 真实部分，只在 revealedItems 固定揭示全部", () => {
  const partial = discoverOrder(["k4", "k2"]);
  const direct = logic.reduceStarlight(partial, { type: "DIRECT_REVEAL" });
  const view = logic.getStarlightView(direct, configGlobal);
  assert.deepEqual(view.discovery.foundIds, ["k4", "k2"]);
  assert.deepEqual(view.discovery.foundItems.map((item) => item.id), ["k4", "k2"]);
  assert.deepEqual(view.discovery.revealedItems.map((item) => item.id), ["k1", "k2", "k3", "k4", "k5"]);
  assert.equal(view.discovery.count, 2);
  assert.equal(view.text.status, "已经亮起 5 / 5");
});

test("view phase 能力标志准确", () => {
  const states = {
    intro: logic.createStarlightState(),
    searching: startedState(),
    paused: logic.reduceStarlight(startedState(), { type: "PAUSE", reason: "manual" }),
    complete: logic.reduceStarlight(logic.createStarlightState(), { type: "DIRECT_REVEAL" }),
  };
  assert.deepEqual(logic.getStarlightView(states.intro).canStart, true);
  assert.deepEqual(logic.getStarlightView(states.searching).canSearch, true);
  assert.deepEqual(logic.getStarlightView(states.searching).canPause, true);
  assert.deepEqual(logic.getStarlightView(states.paused).canResume, true);
  assert.deepEqual(logic.getStarlightView(states.complete).canRestart, true);
  assert.equal(logic.getStarlightView(states.complete).canDirectReveal, false);
});

test("notice 不随普通 focus tick 刷屏，发现时只递增一次", () => {
  let state = beginAt("k1");
  const enteredSerial = state.announcementSerial;
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  assert.equal(state.announcementSerial, enteredSerial);
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 5 });
  state = logic.reduceStarlight(state, { type: "TICK", ticks: 4 });
  assert.equal(state.announcementSerial, enteredSerial + 1);
  assert.equal(state.lastNotice, "found");
});

const forgedBase = beginAt("k1");
const directBase = logic.reduceStarlight(logic.createStarlightState(), { type: "DIRECT_REVEAL" });
const searchCompleteBase = discoverOrder(["k1", "k2", "k3", "k4", "k5"]);
const forgedCases = [
  ["顶层多字段", cloneState(forgedBase, { extra: true })],
  ["light 多字段", cloneState(forgedBase, { light: { ...forgedBase.light, extra: true } })],
  ["light 小数", cloneState(forgedBase, { light: { x: 180.5, y: 100 } })],
  ["非法 phase", cloneState(forgedBase, { phase: "focusing" })],
  ["pointer mode 无 active", cloneState(forgedBase, { activePointer: null })],
  ["keyboard mode 留 active", cloneState(forgedBase, { controlMode: "keyboard" })],
  ["active generation 非 current", cloneState(forgedBase, {
    activePointer: { ...forgedBase.activePointer, generation: 2 },
  })],
  ["key 顺序错误", cloneState(startedState(), { controlMode: "keyboard", heldKeys: ["ArrowRight", "ArrowUp"] })],
  ["key 重复", cloneState(startedState(), { controlMode: "keyboard", heldKeys: ["ArrowUp", "ArrowUp"] })],
  ["unknown found", cloneState(forgedBase, { foundIds: ["ticket"] })],
  ["duplicate found", cloneState(forgedBase, { foundIds: ["k2", "k2"] })],
  ["focus unknown", cloneState(forgedBase, { focusTargetId: "ticket" })],
  ["focus 几何不匹配", cloneState(forgedBase, { focusTargetId: "k2" })],
  ["pointer 位于目标却缺 focus", cloneState(forgedBase, { focusTargetId: null })],
  ["focus 已发现", cloneState(forgedBase, { foundIds: ["k1"] })],
  ["null focus 有 ticks", cloneState(forgedBase, { focusTargetId: null, focusTicks: 1 })],
  ["searching 已找齐", cloneState(searchCompleteBase, { phase: "searching", completionReason: null })],
  ["paused 留 mode", cloneState(forgedBase, { phase: "paused", resumePhase: "searching", lastNotice: "paused" })],
  ["paused 错 resume", cloneState(logic.reduceStarlight(startedState(), { type: "PAUSE", reason: "manual" }), { resumePhase: null })],
  ["paused 错 notice", cloneState(logic.reduceStarlight(startedState(), { type: "PAUSE", reason: "manual" }), { lastNotice: "started" })],
  ["complete/search 少一件", cloneState(searchCompleteBase, { foundIds: ["k1", "k2", "k3", "k4"] })],
  ["complete/direct 伪造五件", cloneState(directBase, { foundIds: ["k1", "k2", "k3", "k4", "k5"] })],
  ["complete 缺 reason", cloneState(directBase, { completionReason: null })],
  ["complete 留 focus", cloneState(directBase, { controlMode: "keyboard", focusTargetId: "k1" })],
  ["announcement 负数", cloneState(forgedBase, { announcementSerial: -1 })],
  ["announcement 不安全", cloneState(forgedBase, { announcementSerial: Number.MAX_SAFE_INTEGER + 1 })],
  ["notice 非法", cloneState(forgedBase, { lastNotice: "tick" })],
];

for (const [name, state] of forgedCases) {
  test(`assertState 拒绝外部伪造状态：${name}`, () => {
    assert.throws(() => logic.assertState(state), TypeError);
    assert.throws(() => logic.reduceStarlight(state, { type: "START" }), TypeError);
  });
}

test("结构自洽的另一种自由发现顺序可以通过一致性校验", () => {
  const alternate = cloneState(searchCompleteBase, { foundIds: ["k5", "k4", "k3", "k2", "k1"] });
  assert.doesNotThrow(() => logic.assertState(alternate));
});

test("键盘刚接管时允许光心仍在目标内但 focus 尚未由下一 tick 建立", () => {
  const keyboard = logic.reduceStarlight(beginAt("k1"), {
    type: "SET_KEY", code: "ArrowUp", pressed: false,
  });
  assert.equal(keyboard.controlMode, "keyboard");
  assert.equal(keyboard.focusTargetId, null);
  assert.doesNotThrow(() => logic.assertState(keyboard));
});

test("JSON 往返后可继续下一 generation 且输出重新冻结", () => {
  let state = beginAt("k1");
  state = logic.reduceStarlight(state, { type: "END_POINTER", pointerId: 7, generation: 1, reason: "up" });
  state = JSON.parse(JSON.stringify(state));
  const k2 = target("k2");
  state = logic.reduceStarlight(state, {
    type: "BEGIN_POINTER", pointerId: 8, generation: 2, pointerType: "touch", x: k2.x, y: k2.y,
  });
  assert.equal(state.lastGeneration, 2);
  assertDeepFrozen(state);
});

test("21-action golden replay 精确且只使用公开 action", () => {
  assert.equal(GOLDEN_ACTIONS.length, 21);
  let state = logic.createStarlightState();
  for (const action of GOLDEN_ACTIONS) {
    state = logic.reduceStarlight(state, action);
    logic.assertState(state);
    assertDeepFrozen(state);
    assert.doesNotThrow(() => logic.assertState(JSON.parse(JSON.stringify(state))));
  }
  assert.equal(state.phase, "complete");
  assert.equal(state.completionReason, "search");
  assert.deepEqual(state.foundIds, ["k1", "k2", "k3", "k4", "k5"]);
  assert.equal(state.lastGeneration, 1);
  assert.equal(state.focusTargetId, null);
  assert.equal(state.focusTicks, 0);
  assert.equal(state.controlMode, null);
  assert.equal(state.activePointer, null);
  assert.deepEqual(state.heldKeys, []);
});

test("golden replay 深克隆重放深相等且不修改 actions", () => {
  const actions = JSON.parse(JSON.stringify(GOLDEN_ACTIONS));
  const snapshot = JSON.parse(JSON.stringify(actions));
  const first = logic.replayStarlight(actions);
  const second = logic.replayStarlight(JSON.parse(JSON.stringify(actions)));
  assert.deepEqual(first, second);
  assert.deepEqual(actions, snapshot);
});

test("replayStarlight 拒绝非数组和数组内畸形 action", () => {
  assert.throws(() => logic.replayStarlight(null), TypeError);
  assert.throws(() => logic.replayStarlight([{ type: "START" }, { type: "TICK", ticks: 6 }]), TypeError);
});
