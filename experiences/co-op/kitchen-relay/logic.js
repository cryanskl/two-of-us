(function (root, factory) {
  "use strict";
  root.KITCHEN_RELAY_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TOTAL_ORDERS = 4;
  const MAX_SPILLS = 3;
  const LANE_COUNT = 3;
  const UINT32_RANGE = 2 ** 32;
  const INGREDIENTS = deepFreeze([
    { id: "tomato", name: "番茄", column: 0, row: 0 },
    { id: "cheese", name: "芝士", column: 1, row: 0 },
    { id: "bread", name: "面包", column: 2, row: 0 },
    { id: "lettuce", name: "生菜", column: 0, row: 1 },
    { id: "mushroom", name: "蘑菇", column: 1, row: 1 },
    { id: "egg", name: "煎蛋", column: 2, row: 1 },
  ]);
  const RECIPE_CATALOG = deepFreeze([
    { id: "sunrise-toast", name: "朝阳吐司", recipe: ["bread", "egg", "tomato"] },
    { id: "green-sandwich", name: "青青三明治", recipe: ["bread", "lettuce", "cheese"] },
    { id: "mushroom-melt", name: "蘑菇芝士盘", recipe: ["mushroom", "cheese", "egg"] },
    { id: "garden-plate", name: "花园拼盘", recipe: ["tomato", "lettuce", "mushroom"] },
    { id: "cheese-toast", name: "芝士烤吐司", recipe: ["bread", "cheese", "tomato"] },
    { id: "brunch-stack", name: "早午餐叠盘", recipe: ["lettuce", "egg", "bread"] },
  ]);

  function createInitialState() {
    return freezeState({
      phase: "intro",
      plan: null,
      orderIndex: 0,
      stepIndex: 0,
      completedOrders: 0,
      spills: 0,
      dispatcherLane: 1,
      plateLane: 1,
      flight: null,
      lastEvent: null,
      nextToken: 1,
    });
  }

  function mapUint32ToIndex(value, maxExclusive) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) return null;
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) return null;
    const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    return value < limit ? value % maxExclusive : null;
  }

  function createServicePlan(randomIndex) {
    if (typeof randomIndex !== "function") return null;
    const recipes = RECIPE_CATALOG.map((recipe) => ({ ...recipe, recipe: [...recipe.recipe] }));
    if (!shuffle(recipes, randomIndex)) return null;
    const orders = [];
    for (const recipe of recipes.slice(0, TOTAL_ORDERS)) {
      const stages = [];
      for (const correct of recipe.recipe) {
        const decoys = ingredientIds().filter((id) => id !== correct);
        if (!shuffle(decoys, randomIndex)) return null;
        const options = [correct, ...decoys.slice(0, 2)];
        if (!shuffle(options, randomIndex)) return null;
        stages.push(options);
      }
      orders.push({ id: recipe.id, name: recipe.name, recipe: [...recipe.recipe], stages });
    }
    const plan = { orders };
    return isValidServicePlan(plan) ? deepFreeze(plan) : null;
  }

  function isValidServicePlan(plan) {
    if (!plan || typeof plan !== "object" || !Array.isArray(plan.orders)) return false;
    if (plan.orders.length !== TOTAL_ORDERS || new Set(plan.orders.map((order) => order?.id)).size !== TOTAL_ORDERS) return false;
    return plan.orders.every((order) => {
      const source = RECIPE_CATALOG.find((recipe) => recipe.id === order?.id);
      if (!source || order.name !== source.name || !arraysEqual(order.recipe, source.recipe)) return false;
      if (!Array.isArray(order.stages) || order.stages.length !== source.recipe.length) return false;
      return order.stages.every((options, index) => Array.isArray(options)
        && options.length === LANE_COUNT
        && new Set(options).size === LANE_COUNT
        && options.every((id) => ingredientIds().includes(id))
        && options.filter((id) => id === source.recipe[index]).length === 1);
    });
  }

  function startService(state, plan) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "intro" || !isValidServicePlan(plan)) return state;
    return freezeState({
      ...createInitialState(),
      phase: "service",
      plan: clonePlan(plan),
      lastEvent: { type: "opened" },
    });
  }

  function moveDispatcher(state, delta) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "service" || (delta !== -1 && delta !== 1)) return state;
    return freezeState({
      ...state,
      dispatcherLane: (state.dispatcherLane + delta + LANE_COUNT) % LANE_COUNT,
      lastEvent: null,
    });
  }

  function movePlate(state, delta) {
    if (!isGameState(state)) return createInitialState();
    if (!["service", "flight"].includes(state.phase) || (delta !== -1 && delta !== 1)) return state;
    const plateLane = clamp(state.plateLane + delta, 0, LANE_COUNT - 1);
    if (plateLane === state.plateLane) return state;
    return freezeState({ ...state, plateLane });
  }

  function dispatchIngredient(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "service") return state;
    const options = getStageOptions(state);
    if (!options) return state;
    const flight = {
      token: state.nextToken,
      ingredientId: options[state.dispatcherLane],
      lane: state.dispatcherLane,
      orderIndex: state.orderIndex,
      stepIndex: state.stepIndex,
    };
    return freezeState({
      ...state,
      phase: "flight",
      flight,
      lastEvent: { type: "dispatched", ingredientId: flight.ingredientId, lane: flight.lane },
      nextToken: state.nextToken + 1,
    });
  }

  function resolveDelivery(state, token) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "flight" || !state.flight || token !== state.flight.token) return state;
    const order = getCurrentOrder(state);
    const correct = order.recipe[state.stepIndex];
    if (state.plateLane !== state.flight.lane) {
      return resolveSpill(state, {
        type: "missed",
        ingredientId: state.flight.ingredientId,
        expectedId: correct,
        lane: state.flight.lane,
      });
    }
    if (state.flight.ingredientId !== correct) {
      return resolveSpill(state, {
        type: "wrong",
        ingredientId: state.flight.ingredientId,
        expectedId: correct,
        lane: state.flight.lane,
      });
    }
    const stepIndex = state.stepIndex + 1;
    if (stepIndex < order.recipe.length) {
      return freezeState({
        ...state,
        phase: "service",
        stepIndex,
        dispatcherLane: 1,
        flight: null,
        lastEvent: { type: "correct", ingredientId: correct, orderId: order.id },
      });
    }
    const completedOrders = state.completedOrders + 1;
    if (completedOrders === TOTAL_ORDERS) {
      return freezeState({
        ...state,
        phase: "success",
        stepIndex,
        completedOrders,
        flight: null,
        lastEvent: { type: "success", orderId: order.id },
      });
    }
    return freezeState({
      ...state,
      phase: "order-clear",
      stepIndex,
      completedOrders,
      flight: null,
      lastEvent: { type: "order-clear", orderId: order.id },
    });
  }

  function nextOrder(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "order-clear" || state.orderIndex >= TOTAL_ORDERS - 1) return state;
    return freezeState({
      ...state,
      phase: "service",
      orderIndex: state.orderIndex + 1,
      stepIndex: 0,
      dispatcherLane: 1,
      plateLane: 1,
      flight: null,
      lastEvent: { type: "next-order" },
    });
  }

  function restartService(state) {
    if (!isGameState(state)) return createInitialState();
    return ["success", "failed"].includes(state.phase) ? createInitialState() : state;
  }

  function getCurrentOrder(state) {
    return isGameState(state) && state.plan && state.orderIndex < state.plan.orders.length
      ? state.plan.orders[state.orderIndex]
      : null;
  }

  function getStageOptions(state) {
    const order = getCurrentOrder(state);
    return order && state.stepIndex < order.stages.length ? order.stages[state.stepIndex] : null;
  }

  function resolveSpill(state, event) {
    const spills = state.spills + 1;
    return freezeState({
      ...state,
      phase: spills >= MAX_SPILLS ? "failed" : "service",
      spills,
      dispatcherLane: 1,
      flight: null,
      lastEvent: spills >= MAX_SPILLS ? { ...event, type: "failed", reason: event.type } : event,
    });
  }

  function isGameState(value) {
    if (!value || typeof value !== "object") return false;
    if (!Number.isInteger(value.orderIndex) || value.orderIndex < 0 || value.orderIndex >= TOTAL_ORDERS) return false;
    if (!Number.isInteger(value.stepIndex) || value.stepIndex < 0 || value.stepIndex > 3) return false;
    if (!Number.isInteger(value.completedOrders) || value.completedOrders < 0 || value.completedOrders > TOTAL_ORDERS) return false;
    if (!Number.isInteger(value.spills) || value.spills < 0 || value.spills > MAX_SPILLS) return false;
    if (!isLane(value.dispatcherLane) || !isLane(value.plateLane)) return false;
    if (!Number.isInteger(value.nextToken) || value.nextToken < 1) return false;
    if (!isLastEvent(value.lastEvent)) return false;
    if (value.phase === "intro") {
      return value.plan === null && value.orderIndex === 0 && value.stepIndex === 0
        && value.completedOrders === 0 && value.spills === 0 && value.dispatcherLane === 1
        && value.plateLane === 1 && value.flight === null && value.lastEvent === null && value.nextToken === 1;
    }
    if (!["service", "flight", "order-clear", "success", "failed"].includes(value.phase)) return false;
    if (!isValidServicePlan(value.plan)) return false;
    if (value.phase === "service") {
      return value.completedOrders === value.orderIndex && value.stepIndex < 3 && value.spills < MAX_SPILLS && value.flight === null;
    }
    if (value.phase === "flight") {
      const options = value.plan.orders[value.orderIndex].stages[value.stepIndex];
      return value.completedOrders === value.orderIndex && value.stepIndex < 3 && value.spills < MAX_SPILLS
        && isFlight(value.flight, value, options);
    }
    if (value.flight !== null) return false;
    if (value.phase === "order-clear") {
      return value.orderIndex < TOTAL_ORDERS - 1 && value.completedOrders === value.orderIndex + 1
        && value.stepIndex === 3 && value.spills < MAX_SPILLS;
    }
    if (value.phase === "success") {
      return value.orderIndex === TOTAL_ORDERS - 1 && value.completedOrders === TOTAL_ORDERS
        && value.stepIndex === 3 && value.spills < MAX_SPILLS;
    }
    return value.completedOrders === value.orderIndex && value.stepIndex < 3 && value.spills === MAX_SPILLS;
  }

  function isFlight(flight, state, options) {
    return flight && typeof flight === "object" && Number.isInteger(flight.token)
      && flight.token === state.nextToken - 1 && ingredientIds().includes(flight.ingredientId)
      && isLane(flight.lane) && options[flight.lane] === flight.ingredientId
      && flight.orderIndex === state.orderIndex && flight.stepIndex === state.stepIndex;
  }

  function isLastEvent(event) {
    if (event === null) return true;
    if (!event || typeof event !== "object") return false;
    return ["opened", "dispatched", "correct", "missed", "wrong", "failed", "order-clear", "success", "next-order"].includes(event.type);
  }

  function clonePlan(plan) {
    return {
      orders: plan.orders.map((order) => ({
        id: order.id,
        name: order.name,
        recipe: [...order.recipe],
        stages: order.stages.map((options) => [...options]),
      })),
    };
  }

  function shuffle(values, randomIndex) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1);
      if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) return false;
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    return true;
  }

  function ingredientIds() {
    return INGREDIENTS.map((ingredient) => ingredient.id);
  }

  function isLane(value) {
    return Number.isInteger(value) && value >= 0 && value < LANE_COUNT;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function arraysEqual(left, right) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function freezeState(value) {
    return deepFreeze(value);
  }

  return Object.freeze({
    TOTAL_ORDERS,
    MAX_SPILLS,
    LANE_COUNT,
    INGREDIENTS,
    RECIPE_CATALOG,
    createInitialState,
    mapUint32ToIndex,
    createServicePlan,
    isValidServicePlan,
    startService,
    moveDispatcher,
    movePlate,
    dispatchIngredient,
    resolveDelivery,
    nextOrder,
    restartService,
    getCurrentOrder,
    getStageOptions,
  });
});
