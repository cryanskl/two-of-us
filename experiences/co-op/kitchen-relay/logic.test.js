import test from "node:test";
import assert from "node:assert/strict";

delete globalThis.KITCHEN_RELAY_LOGIC;
await import("./logic.js");
const logic = globalThis.KITCHEN_RELAY_LOGIC;

const ingredientIds = logic.INGREDIENTS.map((ingredient) => ingredient.id);

function makePlan() {
  return {
    orders: logic.RECIPE_CATALOG.slice(0, logic.TOTAL_ORDERS).map((source) => ({
      id: source.id,
      name: source.name,
      recipe: [...source.recipe],
      stages: source.recipe.map((correct) => [correct, ...ingredientIds.filter((id) => id !== correct).slice(0, 2)]),
    })),
  };
}

function moveDispatcherTo(state, lane) {
  let next = state;
  while (next.dispatcherLane !== lane) next = logic.moveDispatcher(next, 1);
  return next;
}

function movePlateTo(state, lane) {
  let next = state;
  while (next.plateLane < lane) next = logic.movePlate(next, 1);
  while (next.plateLane > lane) next = logic.movePlate(next, -1);
  return next;
}

function deliverCorrect(state) {
  const order = logic.getCurrentOrder(state);
  const correct = order.recipe[state.stepIndex];
  const lane = logic.getStageOptions(state).indexOf(correct);
  let next = moveDispatcherTo(state, lane);
  next = movePlateTo(next, lane);
  next = logic.dispatchIngredient(next);
  return logic.resolveDelivery(next, next.flight.token);
}

test("初始状态、常量与无偏 32 位索引边界稳定", () => {
  const state = logic.createInitialState();
  assert.equal(state.phase, "intro");
  assert.equal(logic.TOTAL_ORDERS, 4);
  assert.equal(logic.MAX_SPILLS, 3);
  assert.equal(logic.INGREDIENTS.length, 6);
  assert.ok(Object.isFrozen(state));
  assert.equal(logic.mapUint32ToIndex(0, 3), 0);
  assert.equal(logic.mapUint32ToIndex(0xfffffffe, 3), 2);
  assert.equal(logic.mapUint32ToIndex(0xffffffff, 3), null);
  assert.equal(logic.mapUint32ToIndex(-1, 3), null);
  assert.equal(logic.mapUint32ToIndex(1, 0), null);
});

test("生成四张唯一订单，且每阶段三条滑槽恰含一个正确食材", () => {
  const plan = logic.createServicePlan(() => 0);
  assert.ok(logic.isValidServicePlan(plan));
  assert.equal(new Set(plan.orders.map((order) => order.id)).size, 4);
  for (const order of plan.orders) {
    assert.equal(order.recipe.length, 3);
    order.stages.forEach((options, index) => {
      assert.equal(options.length, 3);
      assert.equal(new Set(options).size, 3);
      assert.equal(options.filter((id) => id === order.recipe[index]).length, 1);
    });
  }
  assert.ok(Object.isFrozen(plan.orders[0].stages[0]));
});

test("非法随机索引与畸形计划被拒绝，调用方计划不会被状态共享", () => {
  assert.equal(logic.createServicePlan(() => 99), null);
  const malformed = makePlan();
  malformed.orders[0].stages[0] = ["tomato", "tomato", "bread"];
  assert.equal(logic.isValidServicePlan(malformed), false);

  const plan = makePlan();
  const state = logic.startService(logic.createInitialState(), plan);
  plan.orders[0].recipe[0] = "tomato";
  assert.notEqual(state.plan.orders[0].recipe[0], plan.orders[0].recipe[0]);
  assert.ok(Object.isFrozen(state.plan.orders[0].recipe));
});

test("传菜员循环选择，装盘员边界钳制，错误阶段保持原引用", () => {
  let state = logic.startService(logic.createInitialState(), makePlan());
  state = logic.moveDispatcher(state, -1);
  assert.equal(state.dispatcherLane, 0);
  state = logic.moveDispatcher(state, -1);
  assert.equal(state.dispatcherLane, 2);
  state = logic.movePlate(state, 1);
  assert.equal(state.plateLane, 2);
  assert.equal(logic.movePlate(state, 1), state);
  assert.equal(logic.moveDispatcher(state, 0), state);
  const flight = logic.dispatchIngredient(state);
  assert.equal(logic.moveDispatcher(flight, 1), flight);
});

test("flight 锁定、单调 token、在途移盘与过期回调稳定", () => {
  let state = logic.startService(logic.createInitialState(), makePlan());
  state = logic.dispatchIngredient(state);
  assert.equal(state.phase, "flight");
  assert.equal(state.flight.token, 1);
  assert.equal(logic.dispatchIngredient(state), state);
  const moved = logic.movePlate(state, -1);
  assert.equal(moved.plateLane, 0);
  assert.equal(logic.resolveDelivery(moved, 2), moved);
  const resolved = logic.resolveDelivery(moved, 1);
  assert.equal(logic.resolveDelivery(resolved, 1), resolved);
});

test("正确接取推进订单，错误食材与漏接只累计洒落并保留进度", () => {
  let state = logic.startService(logic.createInitialState(), makePlan());
  state = deliverCorrect(state);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.spills, 0);

  const options = logic.getStageOptions(state);
  const correct = logic.getCurrentOrder(state).recipe[state.stepIndex];
  const wrongLane = options.findIndex((id) => id !== correct);
  state = moveDispatcherTo(state, wrongLane);
  state = movePlateTo(state, wrongLane);
  state = logic.dispatchIngredient(state);
  state = logic.resolveDelivery(state, state.flight.token);
  assert.equal(state.lastEvent.type, "wrong");
  assert.equal(state.spills, 1);
  assert.equal(state.stepIndex, 1);

  const correctLane = logic.getStageOptions(state).indexOf(correct);
  state = moveDispatcherTo(state, correctLane);
  state = movePlateTo(state, (correctLane + 1) % 3);
  state = logic.dispatchIngredient(state);
  state = logic.resolveDelivery(state, state.flight.token);
  assert.equal(state.lastEvent.type, "missed");
  assert.equal(state.spills, 2);
  assert.equal(state.stepIndex, 1);
});

test("第三次洒落唯一进入失败且已完成步骤不被清空", () => {
  let state = logic.startService(logic.createInitialState(), makePlan());
  state = deliverCorrect(state);
  for (let count = 0; count < 3; count += 1) {
    const correct = logic.getCurrentOrder(state).recipe[state.stepIndex];
    const wrongLane = logic.getStageOptions(state).findIndex((id) => id !== correct);
    state = moveDispatcherTo(state, wrongLane);
    state = movePlateTo(state, wrongLane);
    state = logic.dispatchIngredient(state);
    state = logic.resolveDelivery(state, state.flight.token);
  }
  assert.equal(state.phase, "failed");
  assert.equal(state.spills, 3);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.lastEvent.reason, "wrong");
});

test("每单第三样进入明确交接，四单完成后共同成功", () => {
  let state = logic.startService(logic.createInitialState(), makePlan());
  for (let orderIndex = 0; orderIndex < logic.TOTAL_ORDERS; orderIndex += 1) {
    for (let step = 0; step < 3; step += 1) state = deliverCorrect(state);
    if (orderIndex < logic.TOTAL_ORDERS - 1) {
      assert.equal(state.phase, "order-clear");
      assert.equal(state.completedOrders, orderIndex + 1);
      const previous = state;
      state = logic.nextOrder(state);
      assert.equal(state.orderIndex, orderIndex + 1);
      assert.equal(logic.nextOrder(state), state);
      assert.notEqual(state, previous);
    }
  }
  assert.equal(state.phase, "success");
  assert.equal(state.completedOrders, 4);
  assert.equal(logic.nextOrder(state), state);
});

test("重开只从终局生效，畸形状态安全回到初始状态", () => {
  let state = logic.startService(logic.createInitialState(), makePlan());
  assert.equal(logic.restartService(state), state);
  for (let count = 0; count < 3; count += 1) {
    state = logic.dispatchIngredient(state);
    state = logic.movePlate(state, state.plateLane === 0 ? 1 : -1);
    state = logic.resolveDelivery(state, state.flight.token);
  }
  assert.equal(state.phase, "failed");
  assert.deepEqual(logic.restartService(state), logic.createInitialState());
  assert.deepEqual(logic.movePlate({ phase: "service" }, 1), logic.createInitialState());
});
