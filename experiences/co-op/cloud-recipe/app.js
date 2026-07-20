(function () {
  "use strict";

  const logic = globalThis.CloudRecipeLogic;
  const rawConfig = globalThis.CLOUD_RECIPE_CONFIG;
  const stage = document.querySelector("#stage");
  const controlsHost = document.querySelector("#controls");
  const progressStatus = document.querySelector("#progress-status");
  const utilityLinks = document.querySelector("#utility-links");
  const liveStatus = document.querySelector("#live-status");

  if (!logic || !stage || !controlsHost || !progressStatus || !utilityLinks || !liveStatus) {
    if (stage) {
      const message = document.createElement("p");
      message.className = "phase-panel";
      message.textContent = "本地规则文件未能载入。";
      stage.replaceChildren(message);
    }
    return;
  }

  const config = logic.normalizeConfig(rawConfig);
  const ingredientClass = Object.freeze({ blue: "blue", gold: "gold", rose: "rose" });
  const tickMs = 1000 / logic.TICKS_PER_SECOND;
  let state = logic.createInitialState();
  let view = logic.getPublicView(state);
  let frameId = null;
  let lastTimestamp = null;
  let accumulatorMs = 0;
  let renderedPhase = null;

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function append(parent, children) {
    children.forEach((child) => { if (child) parent.append(child); });
    return parent;
  }

  function heading(text) {
    const node = element("h2", "phase-title", text);
    node.id = "phase-heading";
    node.tabIndex = -1;
    return node;
  }

  function actionButton(label, action, focusKey, className) {
    const button = element("button", className || "primary-action", label);
    button.type = "button";
    button.dataset.focusKey = focusKey;
    button.addEventListener("click", () => dispatch(action));
    return button;
  }

  function activeFocusKey() {
    const active = document.activeElement;
    return active instanceof HTMLElement ? active.dataset.focusKey || null : null;
  }

  function announce(message) {
    liveStatus.replaceChildren();
    if (message) liveStatus.append(document.createTextNode(message));
  }

  function updateHeader() {
    progressStatus.replaceChildren();
    if (view.phase === "intro") {
      progressStatus.append(element("span", "rule-line", "接齐两颗彩滴，不要让灰滴落进配方。"));
      return;
    }
    if (view.phase === "complete") {
      progressStatus.append(element("strong", "complete-status", "三场雨，都调成了我们的颜色。"));
      return;
    }
    append(progressStatus, [
      element("span", "status-item", `第 ${view.recipe.index + 1} / 3 瓶`),
      element("span", "status-item", `第 ${view.wave.index + 1} / 3 味`),
      element("span", "status-item", `第 ${view.attempt} 次`),
    ]);
  }

  function ingredientSample(ingredientId, label, compact) {
    const item = element("span", `ingredient-sample ${ingredientClass[ingredientId]}${compact ? " compact" : ""}`);
    append(item, [element("span", "sample-pattern", ""), element("span", "sample-label", label)]);
    return item;
  }

  function seatCard(index) {
    const side = index === 0 ? "left" : "right";
    const card = element("article", `seat-card ${side}`);
    append(card, [
      element("span", "seat-side", `${index === 0 ? "左" : "右"}席 ${config.seats[index]}`),
      element("strong", "seat-keys", index === 0 ? "A / D" : "← / →"),
      element("span", "seat-permission", index === 0 ? "只移动云朵左边" : "只移动云朵右边"),
    ]);
    return card;
  }

  function buildIntro() {
    const layout = element("section", "intro-layout");
    const copy = element("div", "intro-copy");
    append(copy, [
      heading("你守一边，我守一边，把云朵调到刚刚好。"),
      element("p", "phase-copy", "接齐两颗彩滴，不要让灰滴落进配方。"),
    ]);
    const seats = append(element("div", "seat-pair"), [seatCard(0), seatCard(1)]);
    copy.append(seats, actionButton("开始接雨", { type: "START" }, "phase-primary"));

    const illustration = element("div", "intro-illustration");
    illustration.setAttribute("aria-hidden", "true");
    append(illustration, [
      element("span", "intro-drop blue"),
      element("span", "intro-drop gold"),
      element("span", "intro-cloud"),
      element("span", "intro-handle left", "L"),
      element("span", "intro-handle right", "R"),
    ]);
    append(layout, [copy, illustration]);
    return layout;
  }

  function buildRecipeIntro() {
    const panel = element("section", "phase-panel recipe-paper");
    const recipe = logic.RECIPES[view.recipe.index];
    const chips = element("div", "ingredient-sequence");
    recipe.waves.forEach((wave) => {
      const ingredient = logic.INGREDIENTS[wave.ingredientId];
      chips.append(ingredientSample(ingredient.id, ingredient.label));
    });
    const buttonLabel = view.recipe.index === 0 ? "接住第一味" : "继续调下一瓶";
    append(panel, [
      element("p", "paper-index", `第 ${view.recipe.index + 1} / 3 瓶`),
      heading(view.recipe.title),
      element("p", "phase-copy", view.recipe.note),
      chips,
      actionButton(buttonLabel, { type: "BEGIN_RECIPE" }, "phase-primary"),
      buildCompletedStamps(),
    ]);
    return panel;
  }

  function buildCompletedStamps() {
    const stamps = element("div", "completed-stamps");
    view.completedRecipes.forEach((recipe) => stamps.append(element("span", "recipe-stamp", recipe.title)));
    return stamps;
  }

  function dropLabel(drop) {
    if (drop.kind === "grey") return "灰滴";
    const ingredient = logic.INGREDIENTS[drop.ingredientId];
    return `${ingredient.label}，${drop.side === "left" ? "左边" : "右边"}目标`;
  }

  function buildDrop(drop, resultMode) {
    let stateClass = "";
    if (resultMode && view.lastResult) {
      if (view.lastResult.caughtGreyIds.includes(drop.id)) stateClass = " caught-grey";
      else if (view.lastResult.missedTargetIds.includes(drop.id)) stateClass = " missed-target";
      else if (view.lastResult.caughtTargetIds.includes(drop.id)) stateClass = " caught-target";
    }
    const node = element("span", `rain-drop ${drop.kind} ${drop.ingredientId || "grey"} ${drop.side}${stateClass}`);
    node.dataset.dropId = drop.id;
    node.setAttribute("role", "img");
    node.setAttribute("aria-label", dropLabel(drop));
    append(node, [element("span", "drop-pattern", ""), element("span", "sr-only", drop.kind === "grey" ? "灰滴" : "目标")]);
    return node;
  }

  function buildCloud() {
    const cloud = element("div", "cloud-catcher");
    setCloudPosition(cloud);
    const leftHandle = element("span", "cloud-handle left", "L");
    leftHandle.setAttribute("aria-label", "左边把手");
    const rightHandle = element("span", "cloud-handle right", "R");
    rightHandle.setAttribute("aria-label", "右边把手");
    append(cloud, [leftHandle, rightHandle]);
    return cloud;
  }

  function buildRainScene(resultMode) {
    const scene = element("div", `rain-scene${resultMode ? " result-scene" : ""}`);
    scene.style.setProperty("--drop-top", resultMode ? "67%" : dropTop());
    const lanes = element("ol", "rain-lanes");
    const laneNodes = [];
    for (let lane = 0; lane < logic.LANE_COUNT; lane += 1) {
      const item = element("li", "rain-lane");
      item.dataset.lane = String(lane);
      item.append(element("span", "lane-number", String(lane + 1)));
      laneNodes.push(item);
      lanes.append(item);
    }
    view.drops.forEach((drop) => laneNodes[drop.lane].append(buildDrop(drop, resultMode)));
    scene.append(lanes, buildCloud());
    const range = element("p", "range-fact", `当前接雨范围：第 ${view.cloud.leftLane + 1} 到第 ${view.cloud.rightLane + 1} 道`);
    scene.append(range);
    return scene;
  }

  function buildFalling() {
    const panel = element("section", "falling-stage");
    const ingredient = ingredientSample(view.wave.ingredientId, view.wave.ingredientLabel, true);
    const hud = element("div", "falling-hud");
    const time = element("span", "time-remaining", remainingTimeText());
    const rail = element("span", "time-rail");
    rail.setAttribute("role", "progressbar");
    rail.setAttribute("aria-label", "当前原料落雨进度");
    rail.setAttribute("aria-valuemin", "0");
    rail.setAttribute("aria-valuemax", "120");
    rail.setAttribute("aria-valuenow", String(view.timing.tick));
    rail.append(element("span", "time-fill"));
    append(hud, [ingredient, rail, time]);
    append(panel, [hud, buildRainScene(false)]);
    return panel;
  }

  function remainingTimeText() {
    const seconds = Math.max(0, Math.ceil((logic.WAVE_TICKS - view.timing.tick) / logic.TICKS_PER_SECOND));
    return `还有约 ${seconds} 秒`;
  }

  function dropTop() {
    return `${8 + view.timing.progressPermille * 0.059}%`;
  }

  function setCloudPosition(cloud) {
    const lanePercent = 100 / logic.LANE_COUNT;
    cloud.style.setProperty("--cloud-left-percent", `${view.cloud.leftLane * lanePercent}%`);
    cloud.style.setProperty("--cloud-width-percent", `${view.cloud.widthLanes * lanePercent}%`);
    cloud.style.setProperty("--handle-inset", `${50 / view.cloud.widthLanes}%`);
  }

  function resultDetail() {
    if (view.lastResult.status === "missed") {
      if (view.lastResult.missedSides.length === 2) return "两边都漏接";
      return view.lastResult.missedSides[0] === "left" ? "左边漏接" : "右边漏接";
    }
    const lanes = view.drops
      .filter((drop) => view.lastResult.caughtGreyIds.includes(drop.id))
      .map((drop) => `第 ${drop.lane + 1} 道接到灰滴`);
    return lanes.join(" · ");
  }

  function buildRetry() {
    const panel = element("section", "result-layout retry-layout");
    const headingText = view.lastResult.status === "contamination"
      ? "云朵盛得太满，灰滴也落进来了。"
      : "还差一边没有接住。";
    const copy = element("div", "result-copy");
    append(copy, [
      heading(headingText),
      element("p", "result-detail", resultDetail()),
      actionButton("再接一次", { type: "RETRY" }, "phase-primary"),
      element("p", "attempt-next", `第 ${view.attempt + 1} 次`),
    ]);
    append(panel, [buildRainScene(true), copy]);
    return panel;
  }

  function buildWaveResult() {
    const panel = element("section", "phase-panel success-paper");
    const seal = element("div", `ingredient-seal ${view.wave.ingredientId}`);
    append(seal, [element("span", "drop-pattern"), element("span", "", view.wave.ingredientLabel)]);
    append(panel, [
      seal,
      heading("这一味，刚刚好。"),
      element("p", "phase-copy", `第 ${view.wave.index + 1} / 3 味`),
      actionButton("接下一味", { type: "NEXT_WAVE" }, "phase-primary"),
    ]);
    return panel;
  }

  function buildBottle(recipeIndex, className) {
    const recipe = logic.RECIPES[recipeIndex];
    const bottle = element("figure", `bottle ${className || ""}`);
    const liquid = element("span", "bottle-liquid");
    recipe.waves.forEach((wave) => liquid.append(element("i", `liquid-layer ${wave.ingredientId}`)));
    append(bottle, [element("span", "bottle-stopper"), liquid, element("figcaption", "bottle-name", recipe.title)]);
    return bottle;
  }

  function buildRecipeResult() {
    const panel = element("section", "result-layout recipe-result-layout");
    const bottle = buildBottle(view.recipe.index, "single-bottle");
    const copy = element("div", "result-copy");
    const completed = view.completedRecipes.find((recipe) => recipe.id === view.recipe.id);
    const isLast = view.recipe.index === logic.RECIPE_COUNT - 1;
    append(copy, [
      heading("这瓶天气，被我们接住了。"),
      element("p", "phase-copy", view.recipe.title),
      element("p", "attempt-total", `第 ${completed ? completed.totalAttempts : 3} 次`),
      actionButton(isLast ? "看看我们的三场雨" : "调下一瓶", { type: "NEXT_RECIPE" }, "phase-primary"),
    ]);
    append(panel, [bottle, copy]);
    return panel;
  }

  function buildComplete() {
    const panel = element("section", "complete-layout");
    const art = element("div", "completion-art");
    const fallback = element("div", "bottle-fallback");
    logic.RECIPES.forEach((_recipe, index) => fallback.append(buildBottle(index, "fallback-bottle")));
    const image = document.createElement("img");
    image.src = "assets/weather-ingredients.png";
    image.alt = "";
    image.width = 2168;
    image.height = 725;
    art.append(fallback, image);

    const note = element("div", "completion-note");
    const rows = element("dl", "recipe-summary");
    view.completedRecipes.forEach((recipe) => {
      rows.append(element("dt", "", recipe.title), element("dd", "", `第 ${recipe.totalAttempts} 次`));
    });
    const totalAttempts = view.completedRecipes.reduce((total, recipe) => total + recipe.totalAttempts, 0);
    const summary = logic.completionSummary(state, rawConfig);
    const completionNote = logic.resolveCompletionNote(config.composeCompletionNote, summary);
    append(note, [
      heading("三场雨，都调成了我们的颜色。"),
      rows,
      element("p", "complete-total", `九味都接住 · 一共尝试 ${totalAttempts} 次`),
      element("p", "completion-message", completionNote),
      actionButton("再调一次", { type: "RESTART" }, "phase-primary"),
    ]);
    append(panel, [art, note]);
    return panel;
  }

  function controlButton(label, seat, direction, focusKey) {
    const side = seat === 0 ? "left" : "right";
    const button = actionButton(label, { type: "MOVE_BOUNDARY", seat, direction }, focusKey, `boundary-button ${side}`);
    button.dataset.seat = String(seat);
    button.dataset.direction = String(direction);
    return button;
  }

  function buildControls() {
    const group = element("div", "seat-controls");
    const left = element("section", "control-panel left");
    const right = element("section", "control-panel right");
    append(left, [
      element("h3", "control-title", `左席 ${config.seats[0]}`),
      element("p", "control-permission", "只移动云朵左边"),
      append(element("div", "button-pair"), [
        controlButton("A 向左", 0, -1, "left-out"),
        controlButton("D 向右", 0, 1, "left-in"),
      ]),
    ]);
    append(right, [
      element("h3", "control-title", `右席 ${config.seats[1]}`),
      element("p", "control-permission", "只移动云朵右边"),
      append(element("div", "button-pair"), [
        controlButton("← 向左", 1, -1, "right-in"),
        controlButton("→ 向右", 1, 1, "right-out"),
      ]),
    ]);
    append(group, [left, right]);
    updateBoundaryButtons(group);
    return group;
  }

  function updateBoundaryButtons(root) {
    const scope = root || controlsHost;
    scope.querySelectorAll(".boundary-button").forEach((button) => {
      const seat = Number(button.dataset.seat);
      const direction = Number(button.dataset.direction);
      const disabled = seat === 0
        ? (direction < 0 ? view.cloud.leftLane === logic.FIRST_LANE : view.cloud.leftLane === view.cloud.rightLane)
        : (direction < 0 ? view.cloud.rightLane === view.cloud.leftLane : view.cloud.rightLane === logic.LAST_LANE);
      button.disabled = disabled;
    });
  }

  function buildStage() {
    if (view.phase === "intro") return buildIntro();
    if (view.phase === "recipe-intro") return buildRecipeIntro();
    if (view.phase === "falling") return buildFalling();
    if (view.phase === "retry") return buildRetry();
    if (view.phase === "wave-result") return buildWaveResult();
    if (view.phase === "recipe-result") return buildRecipeResult();
    return buildComplete();
  }

  function updateUtilityLinks() {
    utilityLinks.replaceChildren();
    if (!["intro", "retry", "wave-result", "recipe-result", "complete"].includes(view.phase)) return;
    const link = element("a", "directory-link", "返回体验目录");
    link.href = "../../../index.html";
    utilityLinks.append(link);
  }

  function render(initial) {
    const focusKey = activeFocusKey();
    const previousPhase = renderedPhase;
    updateHeader();
    stage.replaceChildren(buildStage());
    controlsHost.replaceChildren();
    if (view.phase === "falling") controlsHost.append(buildControls());
    updateUtilityLinks();
    renderedPhase = view.phase;
    syncClock();

    if (focusKey) {
      const replacement = document.querySelector(`[data-focus-key="${focusKey}"]`);
      if (replacement instanceof HTMLElement && !replacement.hasAttribute("disabled")) replacement.focus();
    } else if (!initial && previousPhase !== view.phase) {
      const phaseHeading = stage.querySelector("#phase-heading");
      if (phaseHeading instanceof HTMLElement) phaseHeading.focus();
    }
  }

  function updateFallingFrame() {
    const panel = stage.querySelector(".falling-stage");
    if (!panel) return render(false);
    const scene = panel.querySelector(".rain-scene");
    const cloud = panel.querySelector(".cloud-catcher");
    const range = panel.querySelector(".range-fact");
    const time = panel.querySelector(".time-remaining");
    const rail = panel.querySelector(".time-rail");
    const fill = panel.querySelector(".time-fill");
    if (scene) scene.style.setProperty("--drop-top", dropTop());
    if (cloud) setCloudPosition(cloud);
    if (range) range.textContent = `当前接雨范围：第 ${view.cloud.leftLane + 1} 到第 ${view.cloud.rightLane + 1} 道`;
    if (time) time.textContent = remainingTimeText();
    if (rail) rail.setAttribute("aria-valuenow", String(view.timing.tick));
    if (fill) fill.style.width = `${view.timing.progressPermille / 10}%`;
    updateBoundaryButtons();
  }

  function dispatch(action) {
    const previous = state;
    const previousPhase = view.phase;
    const next = logic.reduceCloudRecipe(state, action);
    if (next === state) return;
    state = next;
    view = logic.getPublicView(state);
    if (previousPhase === "falling" && view.phase === "falling"
      && (action.type === "STEP" || action.type === "MOVE_BOUNDARY")) {
      updateFallingFrame();
    } else {
      render(false);
    }
    if (previous.phase !== state.phase) announce(announcementText());
  }

  function announcementText() {
    if (view.phase === "retry") return view.lastResult.status === "contamination"
      ? "云朵盛得太满，灰滴也落进来了。"
      : "还差一边没有接住。";
    if (view.phase === "wave-result") return "这一味，刚刚好。";
    if (view.phase === "recipe-result") return "这瓶天气，被我们接住了。";
    if (view.phase === "complete") return "三场雨，都调成了我们的颜色。";
    if (view.phase === "recipe-intro") return `第 ${view.recipe.index + 1} / 3 瓶，${view.recipe.title}`;
    return "";
  }

  function stopClock() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    lastTimestamp = null;
    accumulatorMs = 0;
  }

  function syncClock() {
    if (view.phase !== "falling" || document.hidden || !document.hasFocus()) {
      stopClock();
      return;
    }
    if (frameId === null) frameId = requestAnimationFrame(onFrame);
  }

  function onFrame(timestamp) {
    frameId = null;
    if (view.phase !== "falling" || document.hidden || !document.hasFocus()) {
      stopClock();
      return;
    }
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      frameId = requestAnimationFrame(onFrame);
      return;
    }
    accumulatorMs += Math.max(0, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    const availableTicks = Math.floor((accumulatorMs + Number.EPSILON) / tickMs);
    if (availableTicks > 0) {
      const ticks = Math.min(logic.MAX_CATCH_UP_TICKS, availableTicks);
      accumulatorMs = availableTicks > logic.MAX_CATCH_UP_TICKS ? 0 : accumulatorMs - ticks * tickMs;
      dispatch({ type: "STEP", ticks });
    }
    if (view.phase === "falling" && frameId === null) frameId = requestAnimationFrame(onFrame);
  }

  document.addEventListener("keydown", (event) => {
    if (view.phase !== "falling") return;
    const action = logic.classifyBoundaryKey(event);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock();
    else syncClock();
  });
  window.addEventListener("blur", stopClock);
  window.addEventListener("focus", syncClock);
  window.addEventListener("pagehide", stopClock);

  render(true);
})();
