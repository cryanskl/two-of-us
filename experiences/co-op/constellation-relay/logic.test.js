"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import "./logic.js";
import "./config.js";

const logic = globalThis.ConstellationRelayLogic;
const fileConfig = globalThis.CONSTELLATION_RELAY_CONFIG;

const ORACLE_POINTS = [
  ["spool", 350, 900],
  ["west-hub", 350, 520],
  ["west-top", 220, 330],
  ["west-tip", 70, 520],
  ["west-bottom", 220, 710],
  ["east-hub", 650, 520],
  ["east-top", 780, 330],
  ["east-tip", 930, 520],
  ["east-bottom", 780, 710],
];

const ORACLE_EDGES = [
  ["tail", 0, 1],
  ["west-upper", 1, 2],
  ["west-tip-up", 2, 3],
  ["west-tip-low", 3, 4],
  ["west-lower", 4, 1],
  ["bridge", 1, 5],
  ["east-upper", 5, 6],
  ["east-tip-up", 6, 7],
  ["east-tip-low", 7, 8],
  ["east-lower", 8, 5],
];

const ROUTES = [
  [0, 1, 2, 3, 4, 1, 5, 6, 7, 8, 5],
  [0, 1, 2, 3, 4, 1, 5, 8, 7, 6, 5],
  [0, 1, 4, 3, 2, 1, 5, 6, 7, 8, 5],
  [0, 1, 4, 3, 2, 1, 5, 8, 7, 6, 5],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new Set()) {
  if ((!value || typeof value !== "object") && typeof value !== "function") return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) assertDeepFrozen(descriptor.value, seen);
  }
}

function coordinate(index) {
  return { x: ORACLE_POINTS[index][1], y: ORACLE_POINTS[index][2] };
}

function oracleIntersection(a, b, c, d) {
  const same = (left, right) => left.x === right.x && left.y === right.y;
  if (same(a, b) || same(c, d)) return "invalid";
  const cross = (first, second, third) => (
    BigInt(second.x - first.x) * BigInt(third.y - first.y)
      - BigInt(second.y - first.y) * BigInt(third.x - first.x)
  );
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (abC === 0n && abD === 0n && cdA === 0n && cdB === 0n) {
    const axis = a.x !== b.x || c.x !== d.x ? "x" : "y";
    const start = Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
    const end = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]));
    if (start > end) return "none";
    return start < end ? "collinear-overlap" : "shared-endpoint";
  }
  const opposite = (left, right) => (left < 0n && right > 0n) || (left > 0n && right < 0n);
  if (opposite(abC, abD) && opposite(cdA, cdB)) return "proper-cross";
  const inside = (start, end, point, value) => value === 0n
    && point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x)
    && point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y);
  const touches = inside(a, b, c, abC) || inside(a, b, d, abD)
    || inside(c, d, a, cdA) || inside(c, d, b, cdB);
  const shares = same(a, c) || same(a, d) || same(b, c) || same(b, d);
  if (shares && touches) return "shared-endpoint";
  return touches ? "t-junction" : "none";
}

const oracleMemo = new Map();

function oracleCount(cursor, mask) {
  const key = `${cursor}|${mask}`;
  if (oracleMemo.has(key)) return oracleMemo.get(key);
  if (mask === 1023) return cursor === 5 ? 1 : 0;
  let total = 0;
  for (let index = 0; index < ORACLE_EDGES.length; index += 1) {
    if ((mask & (1 << index)) !== 0) continue;
    const [, a, b] = ORACLE_EDGES[index];
    const next = a === cursor ? b : b === cursor ? a : null;
    if (next !== null) total += oracleCount(next, mask | (1 << index));
  }
  oracleMemo.set(key, total);
  return total;
}

function pointId(index) {
  return ORACLE_POINTS[index][0];
}

function dispatch(state, action, log) {
  if (log) log.push(clone(action));
  return logic.reduce(state, action);
}

function beginChoosing(log) {
  let state = dispatch(logic.createInitialState(), { type: "START" }, log);
  return dispatch(state, { type: "TAKE_OVER", seat: "a" }, log);
}

function connect(state, toId, log) {
  const view = logic.getPublicView(state);
  return dispatch(state, {
    type: "CONNECT",
    seat: view.currentSeat,
    fromId: view.cursorId,
    toId,
  }, log);
}

function continueTurn(state, log) {
  state = dispatch(state, { type: "NEXT_TURN" }, log);
  return dispatch(state, { type: "TAKE_OVER", seat: logic.getPublicView(state).currentSeat }, log);
}

function choosingAtRoutePrefix(route, moveCount, log) {
  let state = beginChoosing(log);
  for (let index = 1; index <= moveCount; index += 1) {
    state = connect(state, pointId(route[index]), log);
    if (index < moveCount) state = continueTurn(state, log);
  }
  return moveCount === 0 ? state : continueTurn(state, log);
}

function playRoute(route, log) {
  let state = beginChoosing(log);
  for (let index = 1; index < route.length; index += 1) {
    state = connect(state, pointId(route[index]), log);
    if (index < route.length - 1) state = continueTurn(state, log);
  }
  return state;
}

test("冻结常量与默认配置精确匹配规格", () => {
  assert.deepEqual(logic.POINTS.map(({ id, x, y, role }) => ({ id, x, y, role })), [
    { id: "spool", x: 350, y: 900, role: "start" },
    { id: "west-hub", x: 350, y: 520, role: "node" },
    { id: "west-top", x: 220, y: 330, role: "node" },
    { id: "west-tip", x: 70, y: 520, role: "node" },
    { id: "west-bottom", x: 220, y: 710, role: "node" },
    { id: "east-hub", x: 650, y: 520, role: "end" },
    { id: "east-top", x: 780, y: 330, role: "node" },
    { id: "east-tip", x: 930, y: 520, role: "node" },
    { id: "east-bottom", x: 780, y: 710, role: "node" },
  ]);
  assert.deepEqual(logic.TARGET_EDGES.map(({ id, a, b }) => ({ id, a, b })), ORACLE_EDGES.map(([id, a, b]) => ({
    id, a: pointId(a), b: pointId(b),
  })));
  assert.deepEqual([...logic.SEATS], ["a", "b"]);
  assert.deepEqual([...logic.RESULT_CODES], [
    "invalid", "edge-used", "wire-crossed", "off-outline", "future-stranded", "accepted",
  ]);
  assertDeepFrozen(logic);
  assertDeepFrozen(logic.DEFAULT_CONFIG);
});

test("浏览器全局与模拟 CommonJS 暴露同构冻结 API", () => {
  const logicSource = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const module = { exports: {} };
  const context = createContext({ module });
  runInContext(logicSource, context);
  assert.deepEqual(Object.keys(module.exports), Object.keys(logic));
  assert.equal(module.exports.countCompletions("spool", runInContext("[]", context)), 4);
  assert.equal(Object.isFrozen(module.exports), true);
  const configSource = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const configModule = { exports: {} };
  runInContext(configSource, createContext({ module: configModule }));
  assert.deepEqual(clone(configModule.exports), clone(fileConfig));
  assertDeepFrozen(fileConfig);
});

test("线段分类覆盖六种稳定返回", () => {
  const classify = logic.classifySegmentIntersection;
  assert.equal(classify({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }), "none");
  assert.equal(classify({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 2 }), "shared-endpoint");
  assert.equal(classify({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 4, y: 0 }), "proper-cross");
  assert.equal(classify({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 3 }), "t-junction");
  assert.equal(classify({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 0 }, { x: 6, y: 0 }), "collinear-overlap");
  assert.equal(classify({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }), "invalid");
});

test("公开几何 API 严拒绝额外点字段和不安全中间整数", () => {
  assert.equal(logic.classifySegmentIntersection(
    logic.POINTS[0], logic.POINTS[1], { x: 0, y: 0 }, { x: 1, y: 1 },
  ), "invalid");
  assert.equal(logic.classifySegmentIntersection(
    { x: Number.MAX_SAFE_INTEGER, y: 0 }, { x: -Number.MAX_SAFE_INTEGER, y: 1 },
    { x: 0, y: 0 }, { x: 1, y: 1 },
  ), "invalid");
});

test("公开几何 API 只读 descriptor 快照而不触发 Proxy get", () => {
  const point = (value) => new Proxy(value, { get() { throw new Error("unexpected get"); } });
  assert.equal(logic.classifySegmentIntersection(
    point({ x: 0, y: 0 }), point({ x: 4, y: 4 }), point({ x: 0, y: 4 }), point({ x: 4, y: 0 }),
  ), "proper-cross");
});

test("36 条固定点线段的 630 个无序线对与独立 BigInt oracle 一致", () => {
  const segments = [];
  for (let a = 0; a < ORACLE_POINTS.length; a += 1) {
    for (let b = a + 1; b < ORACLE_POINTS.length; b += 1) segments.push([a, b]);
  }
  assert.equal(segments.length, 36);
  let checked = 0;
  for (let left = 0; left < segments.length; left += 1) {
    for (let right = left + 1; right < segments.length; right += 1) {
      const [a, b] = segments[left];
      const [c, d] = segments[right];
      assert.equal(
        logic.classifySegmentIntersection(coordinate(a), coordinate(b), coordinate(c), coordinate(d)),
        oracleIntersection(coordinate(a), coordinate(b), coordinate(c), coordinate(d)),
      );
      checked += 1;
    }
  }
  assert.equal(checked, 630);
});

test("模块自检通过且十根目标边只发生许可端点接触", () => {
  for (let left = 0; left < ORACLE_EDGES.length; left += 1) {
    for (let right = left + 1; right < ORACLE_EDGES.length; right += 1) {
      const [, a, b] = ORACLE_EDGES[left];
      const [, c, d] = ORACLE_EDGES[right];
      const shares = a === c || a === d || b === c || b === d;
      assert.equal(
        logic.classifySegmentIntersection(coordinate(a), coordinate(b), coordinate(c), coordinate(d)),
        shares ? "shared-endpoint" : "none",
      );
    }
  }
  assert.equal(logic.countCompletions("spool", []), 4);
});

test("countCompletions 拒绝未知点、重复边、稀疏和额外字段数组", () => {
  const sparse = ["tail", "bridge"];
  delete sparse[1];
  const extra = ["tail"];
  extra.extra = true;
  assert.equal(logic.countCompletions("unknown", []), null);
  assert.equal(logic.countCompletions("spool", ["tail", "tail"]), null);
  assert.equal(logic.countCompletions("spool", ["unknown"]), null);
  assert.equal(logic.countCompletions("spool", sparse), null);
  assert.equal(logic.countCompletions("spool", extra), null);
});

test("countCompletions 拒绝数组子类、null/custom prototype 与继承 iterator", () => {
  class EdgeArray extends Array {}
  const subclass = new EdgeArray();
  const nullPrototype = [];
  Object.setPrototypeOf(nullPrototype, null);
  const inheritedIterator = ["unknown"];
  const customPrototype = Object.create(Array.prototype);
  customPrototype[Symbol.iterator] = function* emptyIterator() {};
  Object.setPrototypeOf(inheritedIterator, customPrototype);
  assert.equal(logic.countCompletions("spool", subclass), null);
  assert.equal(logic.countCompletions("spool", nullPrototype), null);
  assert.equal(logic.countCompletions("spool", inheritedIterator), null);
});

test("后缀关键检查点固定为 4/0/2/1", () => {
  assert.equal(logic.countCompletions("spool", []), 4);
  assert.equal(logic.countCompletions("west-hub", ["tail"]), 4);
  assert.equal(logic.countCompletions("east-hub", ["tail", "bridge"]), 0);
  assert.equal(logic.countCompletions("west-top", ["tail", "west-upper"]), 2);
  assert.equal(logic.countCompletions("west-hub", [
    "tail", "west-upper", "west-tip-up", "west-tip-low", "west-lower",
  ]), 2);
  assert.equal(logic.countCompletions("east-hub", [
    "tail", "west-upper", "west-tip-up", "west-tip-low", "west-lower", "bridge",
  ]), 2);
  assert.equal(logic.countCompletions("east-top", [
    "tail", "west-upper", "west-tip-up", "west-tip-low", "west-lower", "bridge", "east-upper",
  ]), 1);
  assert.equal(logic.countCompletions("east-hub", ORACLE_EDGES.map(([id]) => id)), 1);
});

test("全部 9216 个 cursor/mask 状态与独立 DFS oracle 一致", () => {
  let checked = 0;
  for (let cursor = 0; cursor < ORACLE_POINTS.length; cursor += 1) {
    for (let mask = 0; mask < 1024; mask += 1) {
      const usedEdgeIds = ORACLE_EDGES.flatMap(([id], index) => (mask & (1 << index)) !== 0 ? [id] : []);
      assert.equal(logic.countCompletions(pointId(cursor), usedEdgeIds), oracleCount(cursor, mask));
      checked += 1;
    }
  }
  assert.equal(checked, 9216);
});

test("独立枚举得到且只得到四条冻结完整路线", () => {
  const found = [];
  const visit = (cursor, mask, path) => {
    if (mask === 1023) {
      if (cursor === 5) found.push([...path]);
      return;
    }
    for (let index = 0; index < ORACLE_EDGES.length; index += 1) {
      if ((mask & (1 << index)) !== 0) continue;
      const [, a, b] = ORACLE_EDGES[index];
      const next = a === cursor ? b : b === cursor ? a : null;
      if (next !== null) visit(next, mask | (1 << index), [...path, next]);
    }
  };
  visit(0, 0, [0]);
  assert.deepEqual(found, ROUTES);
});

test("evaluateConnection accepted 返回唯一边 ID 且结果冻结", () => {
  const result = logic.evaluateConnection({ cursorId: "spool", usedEdgeIds: [], fromId: "spool", toId: "west-hub" });
  assert.deepEqual(result, { status: "accepted", edgeId: "tail" });
  assertDeepFrozen(result);
});

test("evaluateConnection invalid 不泄露边", () => {
  for (const input of [
    null,
    {},
    { cursorId: "spool", usedEdgeIds: [], fromId: "west-hub", toId: "spool" },
    { cursorId: "spool", usedEdgeIds: [], fromId: "spool", toId: "spool" },
    { cursorId: "spool", usedEdgeIds: [], fromId: "spool", toId: "unknown" },
    { cursorId: "spool", usedEdgeIds: [], fromId: "spool", toId: "west-hub", extra: true },
  ]) assert.deepEqual(logic.evaluateConnection(input), { status: "invalid", edgeId: null });
});

test("edge-used 优先于几何重叠", () => {
  assert.deepEqual(logic.evaluateConnection({
    cursorId: "west-hub", usedEdgeIds: ["tail"], fromId: "west-hub", toId: "spool",
  }), { status: "edge-used", edgeId: null });
});

test("wire-crossed 优先于 off-outline", () => {
  assert.deepEqual(logic.evaluateConnection({
    cursorId: "west-tip",
    usedEdgeIds: ["tail", "west-upper", "west-tip-up"],
    fromId: "west-tip",
    toId: "east-top",
  }), { status: "wire-crossed", edgeId: null });
});

test("不相交的轮廓外连接返回 off-outline", () => {
  assert.deepEqual(logic.evaluateConnection({
    cursorId: "west-hub", usedEdgeIds: ["tail"], fromId: "west-hub", toId: "east-top",
  }), { status: "off-outline", edgeId: null });
});

test("过早过桥返回 future-stranded 且不泄露 bridge", () => {
  assert.deepEqual(logic.evaluateConnection({
    cursorId: "west-hub", usedEdgeIds: ["tail"], fromId: "west-hub", toId: "east-hub",
  }), { status: "future-stranded", edgeId: null });
});

test("初态字段精确、递归冻结且 view 可读取", () => {
  const state = logic.createInitialState();
  assert.deepEqual(clone(state), {
    phase: "intro", cursorId: "spool", completedMoves: [], attempt: 1, lastResult: null, revision: 0,
  });
  assertDeepFrozen(state);
  assert.equal(logic.getPublicView(state).currentSeat, "a");
});

test("START 与正确 TAKE_OVER 才进入 choosing", () => {
  const initial = logic.createInitialState();
  const handoff = logic.reduce(initial, { type: "START" });
  assert.equal(handoff.phase, "handoff");
  assert.equal(logic.reduce(handoff, { type: "TAKE_OVER", seat: "b" }), handoff);
  const choosing = logic.reduce(handoff, { type: "TAKE_OVER", seat: "a" });
  assert.equal(choosing.phase, "choosing");
});

test("错席、错起点、错 phase 和快速重复 CONNECT 都是同引用 no-op", () => {
  const choosing = beginChoosing();
  assert.equal(logic.reduce(choosing, { type: "CONNECT", seat: "b", fromId: "spool", toId: "west-hub" }), choosing);
  assert.equal(logic.reduce(choosing, { type: "CONNECT", seat: "a", fromId: "west-hub", toId: "spool" }), choosing);
  const accepted = connect(choosing, "west-hub");
  assert.equal(logic.reduce(accepted, { type: "CONNECT", seat: "a", fromId: "spool", toId: "west-hub" }), accepted);
});

test("成功连接原子追加记录并保留 edge-result", () => {
  const state = connect(beginChoosing(), "west-hub");
  assert.equal(state.phase, "edge-result");
  assert.equal(state.cursorId, "west-hub");
  assert.deepEqual(clone(state.completedMoves), [
    { edgeId: "tail", fromId: "spool", toId: "west-hub", seat: "a", attempts: 1 },
  ]);
  assert.deepEqual(state.lastResult, { status: "accepted", edgeId: "tail" });
});

test("四种玩法失败均不移动线头、不换席、不加 attempt 或污染前缀", () => {
  const cases = [
    [choosingAtRoutePrefix(ROUTES[0], 5), "west-top", "edge-used"],
    [choosingAtRoutePrefix(ROUTES[0], 3), "east-top", "wire-crossed"],
    [choosingAtRoutePrefix(ROUTES[0], 1), "east-top", "off-outline"],
    [choosingAtRoutePrefix(ROUTES[0], 1), "east-hub", "future-stranded"],
  ];
  for (const [before, toId, expected] of cases) {
    const after = connect(before, toId);
    assert.equal(after.phase, "jammed");
    assert.equal(after.lastResult.status, expected);
    assert.equal(after.cursorId, before.cursorId);
    assert.equal(after.completedMoves.length, before.completedMoves.length);
    assert.equal(after.attempt, before.attempt);
    assert.equal(logic.getPublicView(after).currentSeat, logic.getPublicView(before).currentSeat);
  }
});

test("RETRY_EDGE 才增加 attempt，并保持同一线头和席位", () => {
  const choosing = choosingAtRoutePrefix(ROUTES[0], 1);
  const jammed = connect(choosing, "east-hub");
  const retried = logic.reduce(jammed, { type: "RETRY_EDGE" });
  assert.equal(retried.phase, "choosing");
  assert.equal(retried.attempt, 2);
  assert.equal(retried.cursorId, jammed.cursorId);
  assert.equal(logic.getPublicView(retried).currentSeat, "b");
  assert.equal(retried.lastResult, null);
});

test("NEXT_TURN 清结果与 attempt，并把观测台交给下一席", () => {
  let state = connect(beginChoosing(), "west-hub");
  state = logic.reduce(state, { type: "NEXT_TURN" });
  assert.equal(state.phase, "handoff");
  assert.equal(state.attempt, 1);
  assert.equal(state.lastResult, null);
  assert.equal(logic.getPublicView(state).currentSeat, "b");
});

test("四条完整路线全部在第十根停于 constellation-result 且严格 5/5", () => {
  for (const route of ROUTES) {
    const state = playRoute(route);
    assert.equal(state.phase, "constellation-result");
    assert.equal(state.cursorId, "east-hub");
    assert.equal(state.completedMoves.length, 10);
    assert.deepEqual(state.completedMoves.map((move) => move.seat), ["a", "b", "a", "b", "a", "b", "a", "b", "a", "b"]);
    assert.deepEqual(logic.getPublicView(state).seatCounts, { a: 5, b: 5 });
    assert.equal(state.lastResult, null);
  }
});

test("FINISH 才进入 complete，complete 拒绝第十一根", () => {
  const result = playRoute(ROUTES[0]);
  assert.equal(logic.reduce(result, { type: "CONNECT", seat: "a", fromId: "east-hub", toId: "east-top" }), result);
  const complete = logic.reduce(result, { type: "FINISH" });
  assert.equal(complete.phase, "complete");
  assert.equal(logic.getPublicView(complete).isComplete, true);
  assert.equal(logic.reduce(complete, { type: "FINISH" }), complete);
});

test("complete RESTART 清棋局且 revision 使用旧值加一", () => {
  const complete = logic.reduce(playRoute(ROUTES[0]), { type: "FINISH" });
  const restarted = logic.reduce(complete, { type: "RESTART" });
  assert.deepEqual({ ...clone(restarted), revision: 0 }, clone(logic.createInitialState()));
  assert.equal(restarted.revision, complete.revision + 1);
  assert.equal(logic.reduce(restarted, { type: "RESTART" }), restarted);
});

test("JSON action log 可严格重放到相同完成态", () => {
  const actions = [];
  const result = playRoute(ROUTES[0], actions);
  const complete = dispatch(result, { type: "FINISH" }, actions);
  let replayed = logic.createInitialState();
  for (const action of JSON.parse(JSON.stringify(actions))) replayed = logic.reduce(replayed, action);
  assert.deepEqual(replayed, complete);
});

test("失败重试后可继续完成、FINISH、RESTART 并由 JSON action log 严格重放", () => {
  const actions = [];
  let state = beginChoosing(actions);
  state = connect(state, "west-hub", actions);
  state = continueTurn(state, actions);
  state = connect(state, "east-hub", actions);
  assert.equal(state.phase, "jammed");
  state = dispatch(state, { type: "RETRY_EDGE" }, actions);
  state = connect(state, "west-top", actions);
  for (let index = 3; index < ROUTES[0].length; index += 1) {
    state = continueTurn(state, actions);
    state = connect(state, pointId(ROUTES[0][index]), actions);
  }
  state = dispatch(state, { type: "FINISH" }, actions);
  state = dispatch(state, { type: "RESTART" }, actions);
  assert.equal(state.phase, "intro");
  assert.equal(actions.some((action) => action.type === "RETRY_EDGE"), true);
  let replayed = logic.createInitialState();
  for (const action of JSON.parse(JSON.stringify(actions))) replayed = logic.reduce(replayed, action);
  assert.deepEqual(replayed, state);
});

test("action 精确 schema、getter、symbol、污染原型和未知动作 fail closed", () => {
  const state = beginChoosing();
  const getter = {};
  Object.defineProperty(getter, "type", { get() { throw new Error("no"); }, enumerable: true });
  const symbol = { type: "START" };
  symbol[Symbol("bad")] = true;
  const polluted = Object.create({ bad: true });
  polluted.type = "START";
  for (const action of [
    null, [], {}, getter, symbol, polluted, { type: "UNKNOWN" },
    { type: "CONNECT", seat: "a", fromId: "spool", toId: "west-hub", extra: true },
  ]) assert.equal(logic.reduce(state, action), state);
});

test("data descriptor Proxy action 不触发 type/seat/toId get trap", () => {
  const trap = (target) => new Proxy(target, { get() { throw new Error("unexpected get"); } });
  let state = logic.reduce(logic.createInitialState(), trap({ type: "START" }));
  state = logic.reduce(state, trap({ type: "TAKE_OVER", seat: "a" }));
  state = logic.reduce(state, trap({ type: "CONNECT", seat: "a", fromId: "spool", toId: "west-hub" }));
  assert.equal(state.phase, "edge-result");
});

test("畸形与 hostile state 安全回全新初态", () => {
  const hostile = new Proxy({}, { ownKeys() { throw new Error("no"); } });
  for (const state of [null, {}, { ...clone(logic.createInitialState()), extra: true }, hostile]) {
    const recovered = logic.reduce(state, { type: "START" });
    assert.deepEqual(recovered, logic.createInitialState());
    assert.notEqual(recovered, state);
  }
});

test("state Proxy 仅凭 descriptor 快照可读写，非法 late-throw state fail closed", () => {
  const initial = logic.createInitialState();
  const descriptorOnly = new Proxy(initial, { get() { throw new Error("unexpected get"); } });
  assert.equal(logic.getPublicView(descriptorOnly).phase, "intro");
  assert.equal(logic.reduce(descriptorOnly, { type: "START" }).phase, "handoff");

  const hostile = new Proxy(initial, {
    getOwnPropertyDescriptor() { throw new Error("late descriptor failure"); },
  });
  assert.equal(logic.getPublicView(hostile), null);
  const recovered = logic.reduce(hostile, { type: "START" });
  assert.deepEqual(recovered, initial);
  assert.notEqual(recovered, hostile);
});

test("completedMoves 的自定义继承 map 不会被调用且整态安全拒绝", () => {
  const malformed = clone(connect(beginChoosing(), "west-hub"));
  const customPrototype = Object.create(Array.prototype);
  customPrototype.map = () => { throw new Error("unexpected map"); };
  Object.setPrototypeOf(malformed.completedMoves, customPrototype);
  assert.equal(logic.getPublicView(malformed), null);
  assert.deepEqual(logic.reduce(malformed, { type: "START" }), logic.createInitialState());
});

test("MAX_SAFE revision 与 attempt 不发生部分转换", () => {
  const choosing = beginChoosing();
  const maxRevision = Object.freeze({ ...clone(choosing), revision: Number.MAX_SAFE_INTEGER });
  assert.equal(logic.reduce(maxRevision, { type: "CONNECT", seat: "a", fromId: "spool", toId: "west-hub" }), maxRevision);
  const jammed = connect(choosingAtRoutePrefix(ROUTES[0], 1), "east-hub");
  const maxAttempt = Object.freeze({ ...clone(jammed), attempt: Number.MAX_SAFE_INTEGER });
  assert.equal(logic.reduce(maxAttempt, { type: "RETRY_EDGE" }), maxAttempt);
});

test("normalizeConfig 清洗字素并返回断开引用的冻结副本", () => {
  const raw = { seats: { a: "  小熊  ", b: "👩‍🚀" }, completionNote: "  星光接好了  " };
  const clean = logic.normalizeConfig(raw);
  assert.deepEqual(clean, { seats: { a: "小熊", b: "👩‍🚀" }, completionNote: "星光接好了" });
  assert.notEqual(clean, raw);
  assert.notEqual(clean.seats, raw.seats);
  assertDeepFrozen(clean);
  raw.seats.a = "改";
  assert.equal(clean.seats.a, "小熊");
});

test("normalizeConfig 任一非法字段、原型、getter 或超长均整份原子回退", () => {
  const fallback = clone(logic.DEFAULT_CONFIG);
  const getter = { completionNote: "好" };
  Object.defineProperty(getter, "seats", { get() { throw new Error("no"); }, enumerable: true });
  const polluted = Object.create({ bad: true });
  polluted.seats = { a: "甲", b: "乙" };
  polluted.completionNote = "好";
  for (const raw of [
    null,
    { seats: { a: "同名", b: "同名" }, completionNote: "好" },
    { seats: { a: "甲".repeat(13), b: "乙" }, completionNote: "好" },
    { seats: { a: "甲", b: "乙" }, completionNote: "字".repeat(81) },
    { seats: { a: "甲", b: "乙" }, completionNote: " " },
    { seats: { a: "甲", b: "乙", c: "丙" }, completionNote: "好" },
    getter,
    polluted,
  ]) assert.deepEqual(logic.normalizeConfig(raw), fallback);
});

test("公开 view 精确冻结、断开引用并不泄露路线或解数", () => {
  const state = connect(beginChoosing(), "west-hub");
  const view = logic.getPublicView(state);
  assertDeepFrozen(view);
  assert.notEqual(view.points, logic.POINTS);
  assert.notEqual(view.targetEdges, logic.TARGET_EDGES);
  assert.notEqual(view.completedMoves, state.completedMoves);
  assert.equal(view.completedCount, 1);
  assert.equal(view.remainingCount, 9);
  assert.deepEqual(view.seatCounts, { a: 1, b: 0 });
  const serialized = JSON.stringify(view);
  for (const forbidden of ["suffix", "solution", "route", "memo", "legalNext"]) assert.equal(serialized.includes(forbidden), false);
});

test("所有公开查询 DTO 与 reducer 合法返回递归冻结", () => {
  const evaluation = logic.evaluateConnection({ cursorId: "spool", usedEdgeIds: [], fromId: "spool", toId: "west-hub" });
  const state = connect(beginChoosing(), "west-hub");
  assertDeepFrozen(evaluation);
  assertDeepFrozen(state);
  assertDeepFrozen(logic.getPublicView(state));
  assertDeepFrozen(logic.normalizeConfig(fileConfig));
});

test("生产逻辑无网络、存储、随机、时钟、DOM、音频或 runtime hook", () => {
  const source = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  for (const forbidden of [
    "fetch(", "XMLHttpRequest", "WebSocket(", "localStorage", "sessionStorage", "indexedDB",
    "Date.now", "new Date", "Math.random", "crypto.getRandomValues", "document.", "window.",
    "requestAnimationFrame", "Audio(", "Worker(",
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});
