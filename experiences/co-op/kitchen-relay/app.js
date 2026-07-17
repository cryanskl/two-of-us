(function () {
  "use strict";

  const logic = globalThis.KITCHEN_RELAY_LOGIC;
  const copy = globalThis.KITCHEN_RELAY_COPY;
  if (!logic || !copy) {
    document.body.textContent = "双人小馆加载失败，请确认 logic.js、copy.js 与页面放在同一目录。";
    return;
  }

  const app = document.querySelector(".app");
  const orderTicket = document.querySelector("#order-ticket");
  const roundStatus = document.querySelector("#round-status");
  const playfield = document.querySelector("#playfield");
  const flightCard = document.querySelector("#flight-card");
  const flightSprite = document.querySelector("#flight-sprite");
  const plate = document.querySelector("#plate");
  const ingredientOptions = document.querySelector("#ingredient-options");
  const eventMessage = document.querySelector("#event-message");
  const spillCount = document.querySelector("#spill-count");
  const orderCount = document.querySelector("#order-count");
  const spillMarks = document.querySelector("#spill-marks");
  const orderMarks = document.querySelector("#order-marks");
  const platePosition = document.querySelector("#plate-position");
  const liveRegion = document.querySelector("#live-region");
  const sendButton = document.querySelector("#send-button");
  const ingredientMap = new Map(logic.INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]));
  const reducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");

  let state = logic.createInitialState();
  let randomError = false;
  let arrivalTimer = null;
  let focusRevision = 0;

  app.addEventListener("click", (event) => {
    const laneButton = event.target.closest("[data-select-lane]");
    if (laneButton && !laneButton.disabled) {
      selectDispatcherLane(Number(laneButton.dataset.selectLane));
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const delta = Number(button.dataset.delta);
    if (button.dataset.action === "start" || button.dataset.action === "retry") startGame();
    if (button.dataset.action === "dispatcher-move") updateState(logic.moveDispatcher(state, delta));
    if (button.dataset.action === "plate-move") updateState(logic.movePlate(state, delta));
    if (button.dataset.action === "dispatch") dispatch();
    if (button.dataset.action === "next-order") updateState(logic.nextOrder(state));
    if (button.dataset.action === "restart") restart();
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || !["service", "flight"].includes(state.phase)) return;
    const key = event.key.toLowerCase();
    if (state.phase === "service" && (key === "a" || key === "d" || key === "w")) {
      event.preventDefault();
      if (key === "w") dispatch();
      else updateState(logic.moveDispatcher(state, key === "a" ? -1 : 1));
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      updateState(logic.movePlate(state, event.key === "ArrowLeft" ? -1 : 1));
    }
  });

  flightCard.addEventListener("animationend", () => {
    if (state.phase === "flight") settleFlight(state.flight.token);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === "flight") settleFlight(state.flight.token);
  });

  reducedMotion.addEventListener?.("change", () => {
    app.style.setProperty("--flight-duration", `${flightDuration()}ms`);
  });

  render(true);

  function startGame() {
    clearArrival();
    randomError = false;
    try {
      const plan = logic.createServicePlan(secureRandomIndex);
      if (!plan) throw new Error("SERVICE_PLAN_FAILED");
      state = logic.startService(logic.createInitialState(), plan);
    } catch {
      randomError = true;
      state = logic.createInitialState();
    }
    render(randomError);
  }

  function restart() {
    clearArrival();
    state = logic.restartService(state);
    randomError = false;
    render(true);
  }

  function selectDispatcherLane(targetLane) {
    if (state.phase !== "service" || !Number.isInteger(targetLane) || targetLane < 0 || targetLane > 2) return;
    let next = state;
    while (next.dispatcherLane !== targetLane) next = logic.moveDispatcher(next, 1);
    updateState(next);
  }

  function dispatch() {
    const next = logic.dispatchIngredient(state);
    if (next === state) return;
    state = next;
    render(false);
    const token = state.flight.token;
    clearArrival();
    arrivalTimer = globalThis.setTimeout(() => settleFlight(token), flightDuration() + 80);
  }

  function settleFlight(token) {
    const next = logic.resolveDelivery(state, token);
    if (next === state) return;
    clearArrival();
    state = next;
    const primary = ["order-clear", "success", "failed"].includes(state.phase);
    render(primary);
  }

  function updateState(next, primary = false) {
    if (next === state) return;
    state = next;
    render(primary);
  }

  function secureRandomIndex(maxExclusive) {
    if (!globalThis.crypto?.getRandomValues) throw new Error("SECURE_RANDOM_UNAVAILABLE");
    const values = new Uint32Array(1);
    for (let attempt = 0; attempt < 1024; attempt += 1) {
      globalThis.crypto.getRandomValues(values);
      const mapped = logic.mapUint32ToIndex(values[0], maxExclusive);
      if (mapped !== null) return mapped;
    }
    throw new Error("SECURE_RANDOM_RETRY_LIMIT");
  }

  function render(primary = false) {
    app.dataset.phase = randomError ? "error" : state.phase;
    app.style.setProperty("--flight-duration", `${flightDuration()}ms`);
    roundStatus.textContent = state.phase === "intro" ? "准备营业" : `第 ${state.orderIndex + 1} / ${logic.TOTAL_ORDERS} 单`;
    renderTicket();
    renderPlayfield();
    renderOptions();
    renderProgress();
    renderControls();
    renderMessage();
    scheduleFocus(primary);
  }

  function renderTicket() {
    orderTicket.replaceChildren();
    if (randomError) {
      orderTicket.append(
        heading("本机随机数不可用"),
        paragraph("没有安全订单计划，小馆不会用可预测选项勉强开门。"),
        action("重新检查", "retry"),
      );
      return;
    }
    if (state.phase === "intro") {
      orderTicket.append(
        heading("四张订单，洒落三次前一起出完。"),
        paragraph("传菜员选下一样，装盘员把盘子移到同一条滑槽。"),
        action("开门营业", "start"),
      );
      return;
    }
    const order = logic.getCurrentOrder(state);
    if (state.phase === "order-clear") {
      orderTicket.append(
        heading("这一单出好了"),
        paragraph(`${order.name} 已完成，一起出餐 ${state.completedOrders} / ${logic.TOTAL_ORDERS}。`),
        action("下一单", "next-order"),
      );
      return;
    }
    if (state.phase === "success") {
      orderTicket.append(
        heading("四单一起出完了"),
        paragraph(`今天只洒落 ${state.spills} 次，两边一直在同一条线上。`),
        action("重新开门", "restart"),
      );
      return;
    }
    if (state.phase === "failed") {
      orderTicket.append(
        heading("今天先收一收台"),
        paragraph(`已经一起出好 ${state.completedOrders} 单，换个节奏再来。`),
        action("重新开门", "restart"),
      );
      return;
    }
    const title = document.createElement("h2");
    title.textContent = "今日订单";
    const name = document.createElement("p");
    name.className = "order-name";
    name.textContent = order.name;
    const recipe = document.createElement("div");
    recipe.className = "recipe-slots";
    recipe.setAttribute("aria-label", `${order.name}：${order.recipe.map(ingredientName).join("、")}`);
    order.recipe.forEach((ingredientId, index) => {
      const slot = document.createElement("span");
      slot.className = "recipe-slot";
      slot.classList.toggle("is-filled", index < state.stepIndex);
      slot.classList.toggle("is-current", index === state.stepIndex);
      const sprite = document.createElement("i");
      sprite.className = "ingredient-sprite";
      setIngredient(sprite, ingredientId);
      slot.append(sprite);
      recipe.append(slot);
    });
    const next = document.createElement("p");
    next.className = "next-ingredient";
    next.textContent = `下一样：${ingredientName(order.recipe[state.stepIndex])}`;
    orderTicket.append(title, name, recipe, next);
  }

  function renderPlayfield() {
    playfield.dataset.dispatcherLane = String(state.dispatcherLane);
    playfield.dataset.plateLane = String(state.plateLane);
    plate.className = `plate lane-${state.plateLane}`;
    plate.setAttribute("aria-label", `盘子在第 ${state.plateLane + 1} 条滑槽`);
    platePosition.style.setProperty("--plate-left", `${state.plateLane * 50}%`);
    if (state.phase === "flight" && state.flight) {
      flightCard.hidden = false;
      flightCard.className = `flight-card lane-${state.flight.lane} is-flying`;
      flightCard.dataset.token = String(state.flight.token);
      setIngredient(flightSprite, state.flight.ingredientId);
    } else {
      flightCard.hidden = true;
      flightCard.className = "flight-card";
      delete flightCard.dataset.token;
    }
  }

  function renderOptions() {
    ingredientOptions.replaceChildren();
    const options = logic.getStageOptions(state) || ["tomato", "cheese", "bread"];
    options.forEach((ingredientId, lane) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ingredient-option";
      button.dataset.selectLane = String(lane);
      button.disabled = state.phase !== "service";
      button.setAttribute("aria-pressed", String(state.phase === "service" && state.dispatcherLane === lane));
      button.setAttribute("aria-label", `第 ${lane + 1} 条滑槽：${ingredientName(ingredientId)}`);
      const laneNumber = document.createElement("span");
      laneNumber.className = "option-lane";
      laneNumber.textContent = String(lane + 1);
      const sprite = document.createElement("span");
      sprite.className = "ingredient-sprite";
      setIngredient(sprite, ingredientId);
      const label = document.createElement("span");
      label.className = "option-name";
      label.textContent = ingredientName(ingredientId);
      button.append(laneNumber, sprite, label);
      ingredientOptions.append(button);
    });
  }

  function renderProgress() {
    spillCount.textContent = `${state.spills} / ${logic.MAX_SPILLS}`;
    orderCount.textContent = `${state.completedOrders} / ${logic.TOTAL_ORDERS}`;
    renderMarks(spillMarks, logic.MAX_SPILLS, state.spills, "×");
    renderMarks(orderMarks, logic.TOTAL_ORDERS, state.completedOrders, "✓");
  }

  function renderMarks(container, total, filled, symbol) {
    container.replaceChildren();
    for (let index = 0; index < total; index += 1) {
      const mark = document.createElement("span");
      mark.textContent = symbol;
      mark.classList.toggle("is-filled", index < filled);
      container.append(mark);
    }
  }

  function renderControls() {
    document.querySelectorAll('[data-action="dispatcher-move"], [data-action="dispatch"]').forEach((button) => {
      button.disabled = state.phase !== "service";
    });
    document.querySelectorAll('[data-action="plate-move"]').forEach((button) => {
      const delta = Number(button.dataset.delta);
      const atEdge = delta < 0 ? state.plateLane === 0 : state.plateLane === logic.LANE_COUNT - 1;
      button.disabled = !["service", "flight"].includes(state.phase) || atEdge;
    });
  }

  function renderMessage() {
    let message = "左边选食材，右边把盘子移到同一条滑槽。";
    if (state.phase === "success") {
      message = "四张订单全部出餐，小馆今天配合得刚刚好。";
    } else if (state.phase === "failed") {
      message = "三次洒落到了，已经完成的订单不会被抹掉。";
    } else if (state.phase === "order-clear") {
      message = "这张订单齐了，准备接下一张。";
    } else if (state.lastEvent?.ingredientId) {
      message = copy.describeServiceEvent(state.lastEvent, ingredientName(state.lastEvent.ingredientId));
    }
    eventMessage.textContent = message;
    liveRegion.textContent = state.lastEvent || ["success", "failed"].includes(state.phase) ? message : "";
  }

  function scheduleFocus(primary) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      if (primary || randomError || ["intro", "order-clear", "success", "failed"].includes(state.phase)) {
        orderTicket.querySelector("button")?.focus({ preventScroll: true });
        return;
      }
      if (state.phase === "service") {
        sendButton.focus({ preventScroll: true });
        return;
      }
      document.querySelector('[data-action="plate-move"]:not(:disabled)')?.focus({ preventScroll: true });
    });
  }

  function setIngredient(node, ingredientId) {
    node.dataset.ingredient = ingredientId;
    node.setAttribute("aria-label", ingredientName(ingredientId));
  }

  function ingredientName(ingredientId) {
    return ingredientMap.get(ingredientId)?.name || "未知食材";
  }

  function flightDuration() {
    return reducedMotion.matches ? 120 : 760;
  }

  function clearArrival() {
    if (arrivalTimer !== null) globalThis.clearTimeout(arrivalTimer);
    arrivalTimer = null;
  }

  function heading(value) {
    const element = document.createElement("h2");
    element.textContent = value;
    return element;
  }

  function paragraph(value) {
    const element = document.createElement("p");
    element.textContent = value;
    return element;
  }

  function action(label, name) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-action";
    button.dataset.action = name;
    button.textContent = label;
    return button;
  }
})();
