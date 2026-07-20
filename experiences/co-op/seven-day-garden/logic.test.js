"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import "./config.js";
import "./logic.js";

const logic = globalThis.SevenDayGardenLogic;
const fileConfig = globalThis.SEVEN_DAY_GARDEN_CONFIG;
const route = [
  ["water", "sun"],
  ["prune", "water"],
  ["sun", "sun"],
  ["prune", "sun"],
  ["water", "water"],
  ["prune", "prune"],
  ["water", "sun"],
];
const ORACLE_RESOURCES = ["water", "sun", "prune"];
const ORACLE_DAY_PAIRS = [
  ["water", "sun"],
  ["water", "prune"],
  ["sun", "sun"],
  ["sun", "prune"],
  ["water", "water"],
  ["prune", "prune"],
  ["water", "sun"],
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

function dispatch(state, action, log) {
  if (log) log.push(clone(action));
  return logic.reduce(state, action);
}

function startGame(log) {
  return dispatch(logic.createInitialState(), { type: "START" }, log);
}

function playDay(state, commitments, log) {
  state = dispatch(state, { type: "BEGIN_DAY" }, log);
  const first = logic.firstSeat(state.dayIndex);
  const second = first === 0 ? 1 : 0;
  state = dispatch(state, { type: "PICK", seat: first, resource: commitments[first] }, log);
  state = dispatch(state, { type: "HANDOFF_READY" }, log);
  return dispatch(state, { type: "PICK", seat: second, resource: commitments[second] }, log);
}

function completeGame(log) {
  let state = startGame(log);
  for (let index = 0; index < route.length; index += 1) {
    state = playDay(state, route[index], log);
    assert.equal(state.phase, "day-result");
    state = dispatch(state, { type: "NEXT_DAY" }, log);
  }
  return state;
}

function oracleCount(dayIndex, inventories) {
  if (dayIndex === ORACLE_DAY_PAIRS.length) {
    return inventories.every((inventory) => ORACLE_RESOURCES.every((resource) => inventory[resource] === 0)) ? 1 : 0;
  }
  const required = [...ORACLE_DAY_PAIRS[dayIndex]].sort().join("|");
  let total = 0;
  for (const left of ORACLE_RESOURCES) {
    for (const right of ORACLE_RESOURCES) {
      if (inventories[0][left] < 1 || inventories[1][right] < 1
        || [left, right].sort().join("|") !== required) continue;
      const next = clone(inventories);
      next[0][left] -= 1;
      next[1][right] -= 1;
      total += oracleCount(dayIndex + 1, next);
    }
  }
  return total;
}

function inventoryCompositions(total) {
  const inventories = [];
  for (let water = 0; water <= total; water += 1) {
    for (let sun = 0; sun <= total - water; sun += 1) {
      inventories.push({ water, sun, prune: total - water - sun });
    }
  }
  return inventories;
}

function inventoriesAtDay(dayIndex) {
  let inventories = clone(logic.INITIAL_INVENTORIES);
  for (let index = 0; index < dayIndex; index += 1) {
    inventories[0][route[index][0]] -= 1;
    inventories[1][route[index][1]] -= 1;
  }
  return inventories;
}

test("初态和冻结规则常量递归冻结", () => {
  const state = logic.createInitialState();
  assertDeepFrozen(state);
  assertDeepFrozen(logic.DAYS);
  assertDeepFrozen(logic.INITIAL_INVENTORIES);
  assert.equal(logic.isSevenDayGardenState(state), true);
  assert.deepEqual(clone(state), {
    phase: "intro",
    dayIndex: 0,
    inventories: [{ water: 3, sun: 1, prune: 3 }, { water: 2, sun: 4, prune: 1 }],
    commitments: [null, null],
    attempt: 1,
    lastResult: null,
    completedDays: [],
    revision: 0,
  });
});

test("初始后缀恰好一条完整路线", () => {
  assert.equal(logic.countSuffix(0, logic.INITIAL_INVENTORIES), 1);
});

test("终态全零库存解数为一", () => {
  assert.equal(logic.countSuffix(7, [{ water: 0, sun: 0, prune: 0 }, { water: 0, sun: 0, prune: 0 }]), 1);
});

test("终态非零库存解数为零", () => {
  assert.equal(logic.countSuffix(7, [{ water: 1, sun: 0, prune: 0 }, { water: 0, sun: 0, prune: 0 }]), 0);
});

test("countSuffix 拒绝越界、稀疏、额外字段、getter 和共享库存", () => {
  const good = clone(logic.INITIAL_INVENTORIES);
  const sparse = [good[0], good[1]];
  delete sparse[1];
  const extra = clone(good);
  extra[0].extra = 1;
  const getter = clone(good);
  Object.defineProperty(getter[0], "water", { get() { throw new Error("no"); }, enumerable: true });
  const shared = { water: 0, sun: 0, prune: 0 };
  assert.equal(logic.countSuffix(-1, good), null);
  assert.equal(logic.countSuffix(8, good), null);
  assert.equal(logic.countSuffix(0, sparse), null);
  assert.equal(logic.countSuffix(0, extra), null);
  assert.equal(logic.countSuffix(0, getter), null);
  assert.equal(logic.countSuffix(7, [shared, shared]), null);
});

test("每天九种有序组合都与独立 oracle 一致", () => {
  for (let dayIndex = 0; dayIndex < ORACLE_DAY_PAIRS.length; dayIndex += 1) {
    const inventories = inventoriesAtDay(dayIndex);
    for (const left of ORACLE_RESOURCES) {
      for (const right of ORACLE_RESOURCES) {
        const result = logic.evaluateDay(dayIndex, inventories, [left, right]);
        if (inventories[0][left] < 1 || inventories[1][right] < 1) {
          assert.equal(result.status, "invalid");
          continue;
        }
        const matches = [left, right].sort().join("|") === [...ORACLE_DAY_PAIRS[dayIndex]].sort().join("|");
        if (!matches) {
          assert.equal(result.status, "pair-mismatch");
          continue;
        }
        const next = clone(inventories);
        next[0][left] -= 1;
        next[1][right] -= 1;
        const count = oracleCount(dayIndex + 1, next);
        assert.equal(result.status, count > 0 ? "accepted" : "future-stranded");
        assert.equal(result.suffixSolutions, count);
      }
    }
  }
});

test("全部 2892 个席位库存总数合法状态都与独立字面量 oracle 一致", () => {
  let checked = 0;
  for (let remainingDays = 0; remainingDays <= ORACLE_DAY_PAIRS.length; remainingDays += 1) {
    const dayIndex = ORACLE_DAY_PAIRS.length - remainingDays;
    const inventories = inventoryCompositions(remainingDays);
    for (const left of inventories) {
      for (const right of inventories) {
        const stateInventories = [{ ...left }, { ...right }];
        assert.equal(logic.countSuffix(dayIndex, stateInventories), oracleCount(dayIndex, stateInventories));
        checked += 1;
      }
    }
  }
  assert.equal(checked, 2892);
});

test("独立穷举证明完整路线只有一条", () => {
  assert.equal(oracleCount(0, clone(logic.INITIAL_INVENTORIES)), 1);
});

test("冻结的唯一路线逐日 accepted", () => {
  let inventories = clone(logic.INITIAL_INVENTORIES);
  for (let dayIndex = 0; dayIndex < route.length; dayIndex += 1) {
    const result = logic.evaluateDay(dayIndex, inventories, route[dayIndex]);
    assert.equal(result.status, "accepted");
    inventories = clone(result.nextInventories);
  }
  assert.deepEqual(inventories, [{ water: 0, sun: 0, prune: 0 }, { water: 0, sun: 0, prune: 0 }]);
});

test("pair-mismatch 不修改入参也不返回待提交库存", () => {
  const inventories = clone(logic.INITIAL_INVENTORIES);
  const before = clone(inventories);
  const result = logic.evaluateDay(0, inventories, ["water", "water"]);
  assert.equal(result.status, "pair-mismatch");
  assert.equal(result.nextInventories, null);
  assert.deepEqual(inventories, before);
});

test("第一日 AW/BW 明确为 pair-mismatch", () => {
  assert.equal(logic.evaluateDay(0, clone(logic.INITIAL_INVENTORIES), ["water", "water"]).status, "pair-mismatch");
});

test("第一日 AS/BW 明确为 future-stranded", () => {
  const result = logic.evaluateDay(0, clone(logic.INITIAL_INVENTORIES), ["sun", "water"]);
  assert.equal(result.status, "future-stranded");
  assert.equal(result.suffixSolutions, 0);
});

test("future-stranded 不修改入参且不暴露待提交库存", () => {
  const inventories = clone(logic.INITIAL_INVENTORIES);
  const before = clone(inventories);
  const result = logic.evaluateDay(0, inventories, ["sun", "water"]);
  assert.equal(result.nextInventories, null);
  assert.deepEqual(inventories, before);
});

test("accepted 返回递归冻结且断开引用的新库存", () => {
  const inventories = clone(logic.INITIAL_INVENTORIES);
  const result = logic.evaluateDay(0, inventories, route[0]);
  assert.notEqual(result.nextInventories, inventories);
  assert.notEqual(result.nextInventories[0], inventories[0]);
  assertDeepFrozen(result);
  inventories[0].water = 0;
  assert.equal(result.nextInventories[0].water, 2);
});

test("evaluateDay 非法输入返回不泄露部分信息的 invalid DTO", () => {
  const result = logic.evaluateDay(0, logic.INITIAL_INVENTORIES, ["water", "bad"]);
  assert.deepEqual(clone(result), {
    status: "invalid", dayId: null, commitments: [null, null], requiredPair: null,
    nextInventories: null, suffixSolutions: null,
  });
});

test("八个 phase 常量与规格一致", () => {
  assert.deepEqual([...logic.PHASES], [
    "intro", "day-intro", "first-pick", "handoff", "second-pick", "day-result", "jammed", "complete",
  ]);
});

test("首行动席逐日 A/B 交替", () => {
  assert.deepEqual(Array.from({ length: 7 }, (_item, index) => logic.firstSeat(index)), [0, 1, 0, 1, 0, 1, 0]);
});

test("第一张 commitment 在 handoff 和 second-pick 的公开 view 中可见", () => {
  let state = dispatch(logic.createInitialState(), { type: "START" });
  state = dispatch(state, { type: "BEGIN_DAY" });
  state = dispatch(state, { type: "PICK", seat: 0, resource: "water" });
  assert.equal(state.phase, "handoff");
  assert.deepEqual(clone(logic.getPublicView(state).commitments), [{ seat: 0, resource: "water" }]);
  state = dispatch(state, { type: "HANDOFF_READY" });
  assert.equal(state.phase, "second-pick");
  assert.deepEqual(clone(logic.getPublicView(state).commitments), [{ seat: 0, resource: "water" }]);
});

test("错 seat PICK 返回同一引用", () => {
  let state = dispatch(startGame(), { type: "BEGIN_DAY" });
  assert.equal(logic.reduce(state, { type: "PICK", seat: 1, resource: "sun" }), state);
});

test("重复 seat 和错阶段 PICK 都返回同一引用", () => {
  let state = dispatch(startGame(), { type: "BEGIN_DAY" });
  state = dispatch(state, { type: "PICK", seat: 0, resource: "water" });
  assert.equal(logic.reduce(state, { type: "PICK", seat: 0, resource: "sun" }), state);
  const dayIntro = startGame();
  assert.equal(logic.reduce(dayIntro, { type: "PICK", seat: 0, resource: "water" }), dayIntro);
});

test("耗尽资源 PICK 为同引用 no-op", () => {
  let state = startGame();
  for (let index = 0; index < 5; index += 1) {
    state = playDay(state, route[index]);
    state = dispatch(state, { type: "NEXT_DAY" });
  }
  state = dispatch(state, { type: "BEGIN_DAY" });
  assert.equal(state.dayIndex, 5);
  assert.equal(state.inventories[1].water, 0);
  assert.equal(logic.reduce(state, { type: "PICK", seat: 1, resource: "water" }), state);
});

test("快速重复 PICK 只记录第一张并只增长一次 revision", () => {
  let state = dispatch(startGame(), { type: "BEGIN_DAY" });
  const before = state.revision;
  const once = dispatch(state, { type: "PICK", seat: 0, resource: "water" });
  const twice = dispatch(once, { type: "PICK", seat: 0, resource: "water" });
  assert.equal(twice, once);
  assert.equal(twice.revision, before + 1);
});

test("pair-mismatch 失败当下不增 attempt、不扣卡、不长前缀", () => {
  let state = playDay(startGame(), ["water", "water"]);
  assert.equal(state.phase, "jammed");
  assert.equal(state.attempt, 1);
  assert.deepEqual(clone(state.inventories), clone(logic.INITIAL_INVENTORIES));
  assert.equal(state.completedDays.length, 0);
});

test("future-stranded 失败当下不增 attempt、不扣卡、不长前缀", () => {
  let state = playDay(startGame(), ["sun", "water"]);
  assert.equal(state.phase, "jammed");
  assert.equal(state.lastResult.status, "future-stranded");
  assert.equal(state.attempt, 1);
  assert.deepEqual(clone(state.inventories), clone(logic.INITIAL_INVENTORIES));
  assert.equal(state.completedDays.length, 0);
});

test("attempt 只在 RETRY_DAY 增长且清空 commitments", () => {
  let state = playDay(startGame(), ["water", "water"]);
  const jammed = state;
  assert.equal(logic.reduce(state, { type: "START" }), state);
  state = dispatch(state, { type: "RETRY_DAY" });
  assert.equal(state.attempt, 2);
  assert.equal(state.dayIndex, 0);
  assert.deepEqual([...state.commitments], [null, null]);
  assert.equal(state.lastResult, null);
  assert.equal(state.phase, "first-pick");
  assert.notEqual(state, jammed);
});

test("成功原子扣卡并只在 NEXT_DAY 后推进日期", () => {
  let state = playDay(startGame(), route[0]);
  assert.equal(state.phase, "day-result");
  assert.equal(state.dayIndex, 0);
  assert.equal(state.completedDays.length, 1);
  assert.deepEqual(clone(state.inventories), [{ water: 2, sun: 1, prune: 3 }, { water: 2, sun: 3, prune: 1 }]);
  state = dispatch(state, { type: "NEXT_DAY" });
  assert.equal(state.phase, "day-intro");
  assert.equal(state.dayIndex, 1);
  assert.equal(state.attempt, 1);
});

test("完整路线的 accepted days 始终是冻结七日表严格前缀", () => {
  let state = startGame();
  for (let index = 0; index < route.length; index += 1) {
    state = playDay(state, route[index]);
    assert.deepEqual(state.completedDays.map((item) => item.dayId), logic.DAYS.slice(0, index + 1).map((day) => day.id));
    if (index < route.length - 1) state = dispatch(state, { type: "NEXT_DAY" });
  }
});

test("双方最终各提交七次且库存全零", () => {
  const state = completeGame();
  assert.equal(state.phase, "complete");
  assert.equal(state.completedDays.filter((day) => day.leftResource).length, 7);
  assert.equal(state.completedDays.filter((day) => day.rightResource).length, 7);
  assert.deepEqual(clone(state.inventories), [{ water: 0, sun: 0, prune: 0 }, { water: 0, sun: 0, prune: 0 }]);
});

test("第七日先停在 day-result，再由 NEXT_DAY 进入 complete", () => {
  let state = startGame();
  for (let index = 0; index < route.length; index += 1) {
    state = playDay(state, route[index]);
    if (index < route.length - 1) state = dispatch(state, { type: "NEXT_DAY" });
  }
  assert.equal(state.phase, "day-result");
  assert.equal(state.dayIndex, 6);
  state = dispatch(state, { type: "NEXT_DAY" });
  assert.equal(state.phase, "complete");
  assert.equal(state.dayIndex, 6);
});

test("complete 拒绝 PICK、NEXT_DAY 和其他第八日动作", () => {
  const state = completeGame();
  for (const action of [
    { type: "PICK", seat: 0, resource: "water" }, { type: "NEXT_DAY" }, { type: "BEGIN_DAY" }, { type: "START" },
  ]) assert.equal(logic.reduce(state, action), state);
});

test("RESTART 恢复与全新初态深度一致", () => {
  const restarted = logic.reduce(playDay(startGame(), route[0]), { type: "RESTART" });
  assert.deepEqual(restarted, logic.createInitialState());
  assert.equal(restarted.revision, 0);
  assert.equal(logic.reduce(restarted, { type: "RESTART" }), restarted);
});

test("JSON action log 可重放到深度相等状态", () => {
  const actions = [];
  const state = completeGame(actions);
  const replayed = logic.replaySevenDayGarden(JSON.parse(JSON.stringify(actions)));
  assert.deepEqual(replayed, state);
  assertDeepFrozen(replayed);
});

test("malformed 与 hostile action 对合法状态 fail closed", () => {
  const state = dispatch(startGame(), { type: "BEGIN_DAY" });
  const polluted = Object.create({ bad: true });
  polluted.type = "START";
  const getter = {};
  Object.defineProperty(getter, "type", { get() { throw new Error("no"); }, enumerable: true });
  const symbol = { type: "START" };
  symbol[Symbol("bad")] = true;
  for (const action of [null, {}, { type: "PICK", seat: "0", resource: "water" }, { type: "START", extra: 1 }, polluted, getter, symbol]) {
    assert.equal(logic.reduce(state, action), state);
  }
});

test("reducer 从 data descriptor 规范化 action，不触发 type、seat 或 resource get trap", () => {
  const throwOn = (target, trappedKey) => new Proxy(target, {
    get(inner, key, receiver) {
      if (key === trappedKey) throw new Error(`unexpected get ${String(key)}`);
      return Reflect.get(inner, key, receiver);
    },
  });
  const started = logic.reduce(logic.createInitialState(), throwOn({ type: "START" }, "type"));
  assert.equal(started.phase, "day-intro");
  const choosing = logic.reduce(started, { type: "BEGIN_DAY" });
  const seatTrapped = logic.reduce(choosing, throwOn({ type: "PICK", seat: 0, resource: "water" }, "seat"));
  assert.equal(seatTrapped.phase, "handoff");
  const freshChoosing = logic.reduce(startGame(), { type: "BEGIN_DAY" });
  const resourceTrapped = logic.reduce(freshChoosing, throwOn({ type: "PICK", seat: 0, resource: "water" }, "resource"));
  assert.equal(resourceTrapped.phase, "handoff");
});

test("malformed 与 hostile state 安全回到全新初态", () => {
  const hostile = new Proxy({}, { ownKeys() { throw new Error("no"); } });
  for (const state of [null, {}, { ...clone(logic.createInitialState()), extra: true }, hostile]) {
    const recovered = logic.reduce(state, { type: "START" });
    assert.deepEqual(recovered, logic.createInitialState());
    assert.notEqual(recovered, state);
  }
});

test("MAX_SAFE revision 拒绝任何本应发生的部分转换", () => {
  const dayIntro = startGame();
  const maxState = Object.freeze({ ...clone(dayIntro), revision: Number.MAX_SAFE_INTEGER });
  assert.equal(logic.isSevenDayGardenState(maxState), true);
  assert.equal(logic.reduce(maxState, { type: "BEGIN_DAY" }), maxState);
  assert.equal(logic.reduce(maxState, { type: "RESTART" }), maxState);
});

test("complete validator 拒绝与第七日记录 attempts 不一致的伪造状态", () => {
  const complete = completeGame();
  const forged = { ...clone(complete), attempt: complete.attempt + 1 };
  assert.equal(logic.isSevenDayGardenState(forged), false);
  assert.deepEqual(logic.reduce(forged, { type: "RESTART" }), logic.createInitialState());
});

test("配置名称 trim、Unicode 截断并整项回退", () => {
  const normalized = logic.normalizeConfig({ seats: ["  小熊  ", "abcdefghijklmnop"], composeCompletionNote: null });
  assert.deepEqual([...normalized.seats], ["小熊", "abcdefghijkl"]);
  for (const seats of [[" ", "好"], ["同名", "同名"], ["你", ,], ["你", "我", "它"]]) {
    assert.deepEqual([...logic.normalizeConfig({ seats }).seats], ["你", "我"]);
  }
  const getter = {};
  Object.defineProperty(getter, "seats", { get() { throw new Error("no"); }, enumerable: true });
  assert.deepEqual([...logic.normalizeConfig(getter).seats], ["你", "我"]);
});

test("完成摘要准确计算 attempts、replans 和资源总量", () => {
  let state = playDay(startGame(), ["water", "water"]);
  state = dispatch(state, { type: "RETRY_DAY" });
  state = dispatch(state, { type: "PICK", seat: 0, resource: "water" });
  state = dispatch(state, { type: "HANDOFF_READY" });
  state = dispatch(state, { type: "PICK", seat: 1, resource: "sun" });
  state = dispatch(state, { type: "NEXT_DAY" });
  for (let index = 1; index < route.length; index += 1) {
    state = playDay(state, route[index]);
    state = dispatch(state, { type: "NEXT_DAY" });
  }
  const summary = logic.completionSummary(state, { seats: ["甲", "乙"] });
  assert.equal(summary.totalAttempts, 8);
  assert.equal(summary.replans, 1);
  assert.deepEqual(clone(summary.resourceTotals), { water: 5, sun: 5, prune: 4 });
  assert.deepEqual([...summary.seats], ["甲", "乙"]);
  assertDeepFrozen(summary);
});

test("composer 获得冻结断开副本，修改、异常、Promise、空白和超长均回退", () => {
  const state = completeGame();
  const summary = logic.completionSummary(state, { seats: ["甲", "乙"] });
  const fallback = "甲和乙，把七天的水、光和修剪，慢慢养成了同一朵花。";
  let received;
  assert.equal(logic.resolveCompletionNote((input) => { received = input; return "  一起开花  "; }, summary), "一起开花");
  assert.notEqual(received, summary);
  assertDeepFrozen(received);
  assert.equal(logic.resolveCompletionNote((input) => { input.days[0].title = "改"; return "坏"; }, summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => { throw new Error("no"); }, summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => Promise.resolve("no"), summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => " ", summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => "花".repeat(121), summary), fallback);
});

test("公开 view 递归冻结、断开引用且不暴露 suffixSolutions 或路线", () => {
  const state = playDay(startGame(), route[0]);
  const view = logic.getPublicView(state, { seats: ["甲", "乙"] });
  assertDeepFrozen(view);
  assert.notEqual(view.seats[0].inventory, state.inventories[0]);
  assert.equal(JSON.stringify(view).includes("suffixSolutions"), false);
  assert.equal(JSON.stringify(view).includes("uniqueRoute"), false);
  assert.deepEqual(view.result.commitments, route[0]);
  assert.deepEqual(view.seats.map((seat) => seat.name), ["甲", "乙"]);
});

test("公开 view 的 controls、active seat、plantStage 和 week status 来自逻辑", () => {
  let state = dispatch(startGame(), { type: "BEGIN_DAY" });
  let view = logic.getPublicView(state);
  assert.equal(view.seats[0].isActive, true);
  assert.equal(view.controls.filter((item) => item.action === "PICK").length, 3);
  state = dispatch(state, { type: "PICK", seat: 0, resource: "water" });
  view = logic.getPublicView(state);
  assert.equal(view.seats[1].isActive, true);
  assert.equal(view.commitments.length, 1);
  state = dispatch(state, { type: "HANDOFF_READY" });
  state = dispatch(state, { type: "PICK", seat: 1, resource: "sun" });
  view = logic.getPublicView(state);
  assert.equal(view.plantStage, 1);
  assert.equal(view.weekPlan[0].status, "complete");
});

test("KeyW/KeyS/KeyP 只在选择阶段生成当前席 PICK action", () => {
  let state = dispatch(startGame(), { type: "BEGIN_DAY" });
  assert.deepEqual(clone(logic.classifyResourceKey(state, { code: "KeyW", repeat: false, isComposing: false })), {
    type: "PICK", seat: 0, resource: "water",
  });
  assert.deepEqual(clone(logic.classifyResourceKey(state, { code: "KeyS", repeat: false, isComposing: false })), {
    type: "PICK", seat: 0, resource: "sun",
  });
  assert.deepEqual(clone(logic.classifyResourceKey(state, { code: "KeyP", repeat: false, isComposing: false })), {
    type: "PICK", seat: 0, resource: "prune",
  });
  assert.equal(logic.classifyResourceKey(state, { code: "KeyW", repeat: true, isComposing: false }), null);
  assert.equal(logic.classifyResourceKey(state, { code: "KeyW", repeat: false, isComposing: true }), null);
  assert.equal(logic.classifyResourceKey(state, { code: "__proto__", repeat: false, isComposing: false }), null);
  assert.equal(logic.classifyResourceKey(startGame(), { code: "KeyW", repeat: false, isComposing: false }), null);
});

test("浏览器全局与模拟 CommonJS 出口都提供同一冻结 API", () => {
  assert.equal(logic.reduce, logic.reduceSevenDayGarden);
  assertDeepFrozen(logic);
  const configSource = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const logicSource = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const configModule = { exports: {} };
  runInContext(configSource, createContext({ module: configModule }));
  const logicModule = { exports: {} };
  runInContext(logicSource, createContext({
    module: logicModule,
    require(specifier) {
      assert.equal(specifier, "./config.js");
      return configModule.exports;
    },
  }));
  assert.equal(logicModule.exports.countSuffix(0, logicModule.exports.INITIAL_INVENTORIES), 1);
  assert.equal(Object.isFrozen(logicModule.exports), true);
});

test("生产逻辑不读取真实时间、随机、DOM、网络、存储或动画帧", () => {
  const source = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  for (const forbidden of [
    "Date.now", "Math.random", "crypto.getRandomValues", "fetch(", "localStorage", "sessionStorage",
    "document.", "requestAnimationFrame", "Audio(", "WebSocket(",
  ]) assert.equal(source.includes(forbidden), false, forbidden);
  assert.deepEqual(fileConfig.seats, ["你", "我"]);
});
