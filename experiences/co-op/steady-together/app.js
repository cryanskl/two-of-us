(function () {
  "use strict";

  const rawConfig = globalThis.STEADY_TOGETHER_CONFIG || {};
  const logic = globalThis.STEADY_TOGETHER_LOGIC;
  const root = document.querySelector("#steady-app");
  const phaseHost = document.querySelector("#phase-host");
  const politeStatus = document.querySelector("#polite-status");
  const urgentStatus = document.querySelector("#urgent-status");

  if (!logic || !root || !phaseHost || !politeStatus || !urgentStatus) return;

  const safeConfig = logic.sanitizeSteadyConfig(rawConfig);
  const pressedKeys = new Set();
  const activePointers = new Map();

  let state = logic.createSteadyState(rawConfig);
  let view = logic.getSteadyView(state);
  let structure = "";
  let animationFrameId = null;
  let lastTimestamp = null;
  let accumulatorMs = 0;

  phaseHost.addEventListener("click", handleActionClick);
  phaseHost.addEventListener("pointerdown", handlePointerDown);
  phaseHost.addEventListener("pointerup", handlePointerRelease);
  phaseHost.addEventListener("pointercancel", handlePointerRelease);
  phaseHost.addEventListener("lostpointercapture", handlePointerRelease, true);
  document.addEventListener("pointerup", handlePointerRelease);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  globalThis.addEventListener("blur", () => interrupt("blur", false));
  globalThis.addEventListener("focus", handleWindowFocus);

  render(true, null);

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") dispatch({ type: "START" }, { focus: true, resetClock: true });
    if (action === "retry") dispatch({ type: "RETRY" }, { focus: true, resetClock: true });
    if (action === "pause") interrupt("manual", true);
    if (action === "resume") {
      clearLocalInputs();
      dispatch({ type: "RESUME" }, { focus: true, resetClock: true });
    }
    if (action === "restart") {
      clearLocalInputs();
      dispatch({ type: "RESTART" }, { focus: true, resetClock: true });
    }
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      if (event.repeat || !isInterruptible(view.phase)) return;
      event.preventDefault();
      interrupt("manual", true);
      return;
    }
    if (hasModifier(event) || event.isComposing || isEditable(event.target) || view.phase !== "playing") return;
    const action = logic.classifySteadyKey(event.code, "down", event.repeat);
    if (!action) return;
    event.preventDefault();
    if (dispatch(action)) pressedKeys.add(action.inputId);
  }

  function handleKeyUp(event) {
    const action = logic.classifySteadyKey(event.code, "up", false);
    if (!action) return;
    const wasTracked = pressedKeys.has(action.inputId);
    if (!wasTracked && (hasModifier(event) || event.isComposing || isEditable(event.target))) return;
    pressedKeys.delete(action.inputId);
    if (wasTracked || view.phase === "playing" || view.phase === "release-gate") {
      event.preventDefault();
      dispatch(action);
    }
  }

  function handlePointerDown(event) {
    const pad = event.target.closest("button[data-side]");
    if (!pad || view.phase !== "playing" || activePointers.has(event.pointerId)) return;
    event.preventDefault();
    const inputId = `pointer:${event.pointerId}`;
    const accepted = dispatch({ type: "PRESS", side: pad.dataset.side, inputId });
    if (!accepted) return;
    activePointers.set(event.pointerId, { inputId, pad });
    pad.classList.add("is-pointer-down");
    try {
      pad.setPointerCapture(event.pointerId);
    } catch {
      // Document pointerup is the exact-id fallback when capture is unavailable.
    }
  }

  function handlePointerRelease(event) {
    const active = activePointers.get(event.pointerId);
    if (!active) return;
    activePointers.delete(event.pointerId);
    active.pad.classList.remove("is-pointer-down");
    dispatch({ type: "RELEASE", inputId: active.inputId });
  }

  function handleVisibilityChange() {
    if (document.hidden) interrupt("hidden", false);
  }

  function handleWindowFocus() {
    if (view.phase === "paused") scheduleFocus("paused");
  }

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function isInterruptible(phase) {
    return phase === "playing" || phase === "release-gate" || phase === "ready";
  }

  function interrupt(reason, shouldFocus) {
    if (!isInterruptible(view.phase)) return;
    clearLocalInputs();
    dispatch({ type: "INTERRUPT", reason }, { focus: shouldFocus, resetClock: true });
  }

  function clearLocalInputs() {
    pressedKeys.clear();
    const pointers = [...activePointers.entries()];
    activePointers.clear();
    for (const [pointerId, active] of pointers) {
      active.pad.classList.remove("is-pointer-down");
      try {
        if (active.pad.hasPointerCapture(pointerId)) active.pad.releasePointerCapture(pointerId);
      } catch {
        // The local map is already clear even if capture was previously lost.
      }
    }
  }

  function startClock() {
    if (animationFrameId !== null || view.phase !== "playing") return;
    lastTimestamp = null;
    animationFrameId = globalThis.requestAnimationFrame(frame);
  }

  function stopClock() {
    if (animationFrameId !== null) globalThis.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    lastTimestamp = null;
    accumulatorMs = 0;
  }

  function frame(timestamp) {
    animationFrameId = null;
    if (view.phase !== "playing") return;
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      animationFrameId = globalThis.requestAnimationFrame(frame);
      return;
    }
    const gap = Math.max(0, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    if (gap > logic.MAX_FRAME_GAP_MS) {
      interrupt("stalled", false);
      return;
    }
    accumulatorMs += gap;
    const ticks = Math.floor(accumulatorMs / logic.TICK_MS);
    if (ticks > 0) {
      accumulatorMs -= ticks * logic.TICK_MS;
      dispatch({ type: "TICK", ticks });
    }
    if (view.phase === "playing") animationFrameId = globalThis.requestAnimationFrame(frame);
  }

  function dispatch(action, options = {}) {
    const previousState = state;
    const previousView = view;
    state = logic.reduceSteady(state, action);
    if (state === previousState) return false;
    view = logic.getSteadyView(state);
    if (options.resetClock || view.phase !== "playing") stopClock();
    render(Boolean(options.focus), previousView);
    if (view.phase === "playing" && previousView.phase !== "playing") startClock();
    return true;
  }

  function render(forceFocus, previousView) {
    const nextStructure = structureFor(view.phase);
    const structureChanged = nextStructure !== structure;
    if (structureChanged) {
      structure = nextStructure;
      phaseHost.replaceChildren(buildStructure(nextStructure));
    }
    root.dataset.phase = view.phase;
    phaseHost.dataset.phase = view.phase;
    if (view.phase === "intro") renderIntro();
    if (view.phase === "playing" || view.phase === "release-gate") renderInteraction();
    if (view.phase === "ready") renderReady();
    if (view.phase === "paused") renderPaused();
    if (view.phase === "complete") renderComplete();
    announceChanges(previousView);
    if (forceFocus || (structureChanged && nextStructure !== "interaction")) scheduleFocus(nextStructure);
  }

  function structureFor(phase) {
    if (phase === "playing" || phase === "release-gate") return "interaction";
    return ["intro", "ready", "paused", "complete"].includes(phase) ? phase : "intro";
  }

  function buildStructure(kind) {
    if (kind === "intro") return buildIntro();
    if (kind === "interaction") return buildInteraction();
    if (kind === "ready") return buildStateView("ready");
    if (kind === "paused") return buildStateView("paused");
    return buildComplete();
  }

  function buildIntro() {
    const wrapper = element("div", "intro-view");
    wrapper.append(buildRouteHud());
    const panel = element("section", "intro-panel");
    panel.append(
      balanceMark(),
      element("h2", "intro-copy"),
      element("p", "", "左边用 A，右边用 L，也可以按住下面两个按钮。"),
      element("p", "kind-note", "不用分谁做错了，掉下来就一起从最近的灯再走。"),
    );
    const button = actionButton("开始前进", "start", "primary-action");
    button.dataset.focus = "true";
    panel.append(button);
    wrapper.append(panel);
    return wrapper;
  }

  function buildInteraction() {
    const wrapper = element("section", "interaction-view");
    const top = element("div", "interaction-topline");
    const pause = actionButton("暂停", "pause", "pause-button");
    pause.prepend(pauseIcon());
    top.append(pause);
    const journey = element("div", "journey-and-stage");
    journey.append(buildRouteHud(), buildBalanceStage());
    wrapper.append(top, journey, buildStatusZone(), buildPads());
    return wrapper;
  }

  function buildStateView(kind) {
    const wrapper = element("div", `state-view state-${kind}`);
    wrapper.append(buildRouteHud());
    const panel = element("section", "state-panel");
    const heading = element("h2");
    heading.dataset.state = "heading";
    heading.tabIndex = -1;
    const copy = element("p");
    copy.dataset.state = "copy";
    const actions = element("div", "state-actions");
    const primary = actionButton("", "", "primary-action");
    primary.dataset.state = "primary";
    primary.dataset.focus = "true";
    const restart = actionButton("重新开始", "restart", "secondary-action");
    restart.prepend(restartIcon());
    actions.append(primary, restart);
    panel.append(heading, copy, actions);
    wrapper.append(panel);
    return wrapper;
  }

  function buildComplete() {
    const wrapper = element("div", "complete-view");
    wrapper.append(buildRouteHud());
    const stage = buildBalanceStage();
    stage.classList.add("complete-stage");
    wrapper.append(stage);
    const copy = element("section", "complete-copy");
    const title = element("h2");
    title.tabIndex = -1;
    title.dataset.complete = "title";
    title.dataset.focus = "true";
    const message = element("p", "final-message");
    message.dataset.complete = "message";
    const signature = element("p", "signature");
    signature.dataset.complete = "signature";
    const actions = element("div", "complete-actions");
    const restart = actionButton("再走一次", "restart", "primary-action");
    const back = element("a", "secondary-action", "回到作品集");
    back.href = "../../../index.html";
    back.append(arrowIcon());
    actions.append(restart, back);
    copy.append(title, message, signature, actions);
    wrapper.append(copy);
    return wrapper;
  }

  function buildRouteHud() {
    const section = element("section", "route-hud");
    section.setAttribute("aria-label", "三段路线和检查灯");
    section.append(routeSvg());
    const labels = element("div", "route-labels");
    labels.append(
      routeLabel("lean-left", "向右接住"),
      routeLabel("lean-right", "换边接回"),
      routeLabel("come-home", "一起回正"),
    );
    const meta = element("p", "route-meta");
    meta.dataset.route = "meta";
    section.append(labels, meta);
    return section;
  }

  function routeLabel(segmentId, text) {
    const label = element("span", "", text);
    label.dataset.segmentLabel = segmentId;
    return label;
  }

  function routeSvg() {
    const svg = svgElement("svg", "route-svg");
    svg.setAttribute("viewBox", "0 0 800 86");
    svg.setAttribute("aria-hidden", "true");
    svg.append(svgNode("line", { class: "route-base", x1: 42, y1: 40, x2: 758, y2: 40 }));
    svg.append(
      svgNode("line", { class: "route-segment segment-left", "data-segment": "lean-left", x1: 42, y1: 40, x2: 280, y2: 40 }),
      svgNode("line", { class: "route-segment segment-middle", "data-segment": "lean-right", x1: 280, y1: 40, x2: 519, y2: 40 }),
      svgNode("line", { class: "route-segment segment-right", "data-segment": "come-home", x1: 519, y1: 40, x2: 758, y2: 40 }),
    );
    svg.append(
      svgNode("circle", { class: "route-end", cx: 42, cy: 40, r: 12 }),
      svgNode("circle", { class: "route-end-inner", cx: 42, cy: 40, r: 6 }),
      checkpointLamp(800, 280, "第一处灯"),
      checkpointLamp(1600, 519, "第二处灯"),
      svgNode("circle", { class: "route-end", cx: 758, cy: 40, r: 14 }),
      svgNode("circle", { class: "route-end-inner", cx: 758, cy: 40, r: 7 }),
    );
    const marker = svgNode("g", { class: "route-marker", "data-route-marker": "true" });
    marker.append(
      svgNode("rect", { x: -10, y: -7, width: 20, height: 12, rx: 4 }),
      svgNode("circle", { cx: -6, cy: 7, r: 3 }),
      svgNode("circle", { cx: 6, cy: 7, r: 3 }),
    );
    svg.append(marker);
    return svg;
  }

  function checkpointLamp(checkpoint, x, label) {
    const group = svgNode("g", { class: "route-lamp", "data-checkpoint": checkpoint });
    group.append(svgNode("title", {}, label));
    group.append(
      svgNode("path", { class: "lamp-frame", d: `M${x - 12} 55h24l-3-29H${x - 9}l-3 29Z` }),
      svgNode("rect", { class: "lamp-light", x: x - 6, y: 31, width: 12, height: 18, rx: 3 }),
      svgNode("path", { class: "lamp-frame", d: `M${x - 16} 57h32v6h-32zM${x - 10} 24l10-9 10 9z` }),
      svgNode("path", { class: "lamp-check", d: `m${x - 5} 40 4 4 7-9` }),
    );
    return group;
  }

  function buildBalanceStage() {
    const section = element("section", "balance-stage");
    section.setAttribute("aria-label", "天平、滚珠和中央目标区");
    section.append(balanceSvg());
    const copy = element("p", "stage-copy");
    copy.dataset.stage = "copy";
    section.append(copy);
    return section;
  }

  function balanceSvg() {
    const svg = svgElement("svg", "balance-svg");
    svg.setAttribute("viewBox", "0 0 800 430");
    svg.setAttribute("aria-hidden", "true");
    const defs = svgElement("defs");
    defs.append(
      gradient("porcelain-gradient", [["0%", "#fffaf0"], ["58%", "#f0e7d5"], ["100%", "#d6c6aa"]]),
      gradient("brass-gradient", [["0%", "#6e421a"], ["35%", "#d3ad68"], ["62%", "#9a6a2e"], ["100%", "#5d3514"]]),
      gradient("rose-gradient", [["0%", "#7d4142"], ["50%", "#c47673"], ["100%", "#7d4142"]]),
      gradient("teal-gradient", [["0%", "#0d373d"], ["50%", "#236b73"], ["100%", "#0d373d"]]),
      radialGradient(),
      ballShadow(),
    );
    svg.append(defs);
    svg.append(svgNode("ellipse", { class: "cart-shadow", cx: 400, cy: 365, rx: 285, ry: 26 }));
    const base = svgNode("g", { class: "base-group" });
    base.append(
      svgNode("path", { class: "cart-base", d: "M345 352h110l27 29H318l27-29Z" }),
      svgNode("ellipse", { class: "cart-base", cx: 400, cy: 379, rx: 92, ry: 23 }),
      svgNode("path", { class: "cart-base", d: "M373 350c0-44 8-73 27-73s27 29 27 73Z" }),
      svgNode("circle", { class: "cart-base", cx: 400, cy: 300, r: 20 }),
      svgNode("circle", { class: "cart-base-detail", cx: 400, cy: 300, r: 8 }),
    );
    svg.append(base);
    const beam = svgNode("g", { class: "beam-group", "data-beam": "true" });
    beam.append(
      svgNode("line", { class: "beam-arm", x1: 75, y1: 260, x2: 725, y2: 260 }),
      svgNode("rect", { class: "handle-left", x: 37, y: 224, width: 122, height: 72, rx: 20 }),
      svgNode("rect", { class: "handle-right", x: 641, y: 224, width: 122, height: 72, rx: 20 }),
      svgNode("rect", { class: "handle-ring", x: 51, y: 232, width: 14, height: 56, rx: 5 }),
      svgNode("rect", { class: "handle-ring", x: 735, y: 232, width: 14, height: 56, rx: 5 }),
      svgNode("rect", { class: "tray-rim", x: 178, y: 174, width: 444, height: 152, rx: 32 }),
      svgNode("rect", { class: "tray-inner", x: 192, y: 188, width: 416, height: 124, rx: 25 }),
      ornament("left"),
      ornament("right"),
    );
    const target = svgNode("g", { class: "target-zone", "data-target-zone": "true" });
    target.append(
      svgNode("ellipse", { class: "target-zone-outer", cx: 400, cy: 248, rx: 112, ry: 45 }),
      svgNode("ellipse", { class: "target-zone-inner", cx: 400, cy: 248, rx: 47, ry: 23 }),
      svgNode("path", { class: "target-tick", d: "M400 193v17m0 76v17M279 248h22m198 0h22" }),
    );
    beam.append(target);
    const ball = svgNode("g", { class: "ball-group", "data-ball": "true" });
    ball.append(svgNode("circle", { class: "ball", cx: 400, cy: 224, r: 28 }));
    beam.append(ball);
    beam.append(
      svgNode("path", { class: "lift-marker", "data-lift-marker": "left", d: "M91 278h14l-7 10Z" }),
      svgNode("path", { class: "lift-marker", "data-lift-marker": "right", d: "M695 278h14l-7 10Z" }),
    );
    svg.append(beam);
    return svg;
  }

  function ornament(side) {
    const x = side === "left" ? 213 : 587;
    const sign = side === "left" ? 1 : -1;
    return svgNode("path", {
      class: "corner-ornament",
      d: `M${x} 207c${18 * sign} 0 ${26 * sign} 9 ${29 * sign} 24m${-29 * sign} 58c${18 * sign} 0 ${26 * sign}-9 ${29 * sign}-24`,
    });
  }

  function buildStatusZone() {
    const section = element("section", "status-zone");
    section.setAttribute("aria-label", "当前稳定条件");
    const status = element("p", "status-main");
    status.dataset.status = "main";
    const list = element("ul", "condition-rail");
    list.append(
      condition("supported", "共同托住"),
      condition("centered", "滚珠居中"),
      condition("settled", "速度放缓"),
      condition("level", "横梁放平"),
    );
    const hold = element("div", "final-hold-track");
    hold.setAttribute("role", "progressbar");
    hold.setAttribute("aria-label", "终点稳定保持");
    hold.setAttribute("aria-valuemin", "0");
    hold.append(element("span", "final-hold-fill"));
    section.append(status, list, hold);
    return section;
  }

  function condition(key, label) {
    const item = element("li", "condition-item");
    item.dataset.condition = key;
    item.append(element("span", "condition-mark"), element("span", "", label));
    return item;
  }

  function buildPads() {
    const wrapper = element("div", "pads");
    wrapper.setAttribute("aria-label", "左右托举操作区");
    wrapper.append(buildPad("left"), buildPad("right"));
    return wrapper;
  }

  function buildPad(side) {
    const pad = element("button", "seat-pad");
    pad.type = "button";
    pad.dataset.side = side;
    pad.append(
      element("span", "pad-label", side === "left" ? "左边托住" : "右边托住"),
      element("kbd", "pad-key", side === "left" ? "A" : "L"),
      element("span", "pad-state"),
    );
    return pad;
  }

  function renderIntro() {
    renderRoute();
    setText(".intro-copy", safeConfig.intro);
  }

  function renderInteraction() {
    renderRoute();
    renderBalance();
    renderConditions();
    renderPads();
    setText("[data-status='main']", view.phase === "release-gate" ? "先把两边都松开" : view.statusText);
  }

  function renderReady() {
    renderRoute();
    setText("[data-state='heading']", "从最近的灯继续");
    setText("[data-state='copy']", view.statusText);
    renderStateAction("继续前进", "retry");
  }

  function renderPaused() {
    renderRoute();
    setText("[data-state='heading']", "暂停在这里");
    setText("[data-state='copy']", view.statusText);
    renderStateAction("继续前进", "resume");
  }

  function renderComplete() {
    renderRoute();
    renderBalance();
    setText("[data-complete='title']", view.finalTitle || safeConfig.finalTitle);
    setText("[data-complete='message']", composeFinalMessage());
    setText("[data-complete='signature']", view.signature || safeConfig.signature);
  }

  function renderRoute() {
    const progress = finitePercent(view.journey.progressPercent);
    const marker = phaseHost.querySelector("[data-route-marker]");
    if (marker) marker.setAttribute("transform", `translate(${42 + 7.16 * progress} 40)`);
    phaseHost.querySelectorAll("[data-segment]").forEach((segment) => {
      segment.dataset.current = String(segment.dataset.segment === view.journey.segmentId);
    });
    phaseHost.querySelectorAll("[data-segment-label]").forEach((label) => {
      if (label.dataset.segmentLabel === view.journey.segmentId) label.setAttribute("aria-current", "step");
      else label.removeAttribute("aria-current");
    });
    const reached = Array.isArray(view.journey.reachedCheckpoints) ? view.journey.reachedCheckpoints : [];
    phaseHost.querySelectorAll("[data-checkpoint]").forEach((lamp) => {
      const value = Number(lamp.dataset.checkpoint);
      const lampState = reached.includes(value) ? "reached" : view.journey.checkpoint === value ? "current" : "waiting";
      lamp.dataset.state = lampState;
    });
    const route = phaseHost.querySelector(".route-hud");
    if (route) route.setAttribute("aria-label", `三段路线，${view.journey.slopeLabel}，已通过 ${reached.length} / 2 处灯`);
    setText("[data-route='meta']", `${view.journey.slopeLabel} · 已通过 ${reached.length} / 2 处灯`);
  }

  function renderBalance() {
    const normalizedTilt = finiteNormalized(view.beam.normalizedTilt);
    const normalizedPosition = finiteNormalized(view.ball.normalizedPosition);
    const angle = normalizedTilt * 10;
    const ballX = normalizedPosition * 192;
    const beam = phaseHost.querySelector("[data-beam]");
    const ball = phaseHost.querySelector("[data-ball]");
    const zone = phaseHost.querySelector("[data-target-zone]");
    if (beam) beam.setAttribute("transform", `rotate(${angle} 400 260)`);
    if (ball) ball.setAttribute("transform", `translate(${ballX} 0)`);
    if (zone) zone.dataset.centered = String(Boolean(view.stability.centered));
    setText("[data-stage='copy']", `${view.beam.directionLabel} · ${view.ball.zoneLabel}`);
  }

  function renderConditions() {
    for (const key of ["supported", "centered", "settled", "level"]) {
      const item = phaseHost.querySelector(`[data-condition='${key}']`);
      if (item) item.dataset.met = String(Boolean(view.stability[key]));
    }
    const total = Number(view.stability.finalHoldTotal) || 30;
    const current = Math.max(0, Math.min(total, Number(view.stability.finalHoldTicks) || 0));
    const track = phaseHost.querySelector(".final-hold-track");
    const fill = phaseHost.querySelector(".final-hold-fill");
    if (track) {
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(current));
    }
    if (fill) fill.style.width = `${(current / total) * 100}%`;
  }

  function renderPads() {
    for (const side of ["left", "right"]) {
      const pad = phaseHost.querySelector(`.seat-pad[data-side='${side}']`);
      if (!pad) continue;
      const seat = view.seats[side];
      const name = view.names[side];
      const lift = finitePercent(seat.liftPercent);
      pad.dataset.active = String(Boolean(seat.active));
      pad.style.setProperty("--lift", `${lift}%`);
      pad.setAttribute("aria-pressed", String(Boolean(seat.active)));
      pad.setAttribute("aria-label", `${name}，${side === "left" ? "左边托住" : "右边托住"}，${seat.key}，${seat.stateLabel}`);
      pad.querySelector(".pad-state").textContent = seat.stateLabel;
    }
  }

  function renderStateAction(label, action) {
    const button = phaseHost.querySelector("[data-state='primary']");
    if (!button) return;
    button.textContent = label;
    button.dataset.action = action;
  }

  function composeFinalMessage() {
    const composer = rawConfig.composeSteadyMessage;
    if (typeof composer !== "function") return view.finalMessage || safeConfig.finalMessage;
    try {
      const result = composer(view);
      return typeof result === "string" && result.trim() ? result.trim() : view.finalMessage || safeConfig.finalMessage;
    } catch {
      return view.finalMessage || safeConfig.finalMessage;
    }
  }

  function announceChanges(previousView) {
    if (!previousView) return;
    const previousReached = Array.isArray(previousView.journey.reachedCheckpoints)
      ? previousView.journey.reachedCheckpoints.length : 0;
    const reached = Array.isArray(view.journey.reachedCheckpoints) ? view.journey.reachedCheckpoints.length : 0;
    if (reached > previousReached) announce(politeStatus, reached === 1 ? "到达第一处灯。" : "到达第二处灯。");
    if (previousView.phase !== "release-gate" && view.phase === "release-gate") {
      announce(urgentStatus, "滚珠掉下来了。先把两边都松开。" );
    }
    if (previousView.phase !== "paused" && view.phase === "paused") announce(urgentStatus, "旅程已暂停。" );
    if (previousView.phase !== "complete" && view.phase === "complete") announce(urgentStatus, "我们稳稳地到达终点了。" );
  }

  function announce(target, message) {
    target.textContent = "";
    globalThis.setTimeout(() => { target.textContent = message; }, 20);
  }

  function scheduleFocus(kind) {
    globalThis.requestAnimationFrame(() => {
      if (document.hidden || !document.hasFocus()) return;
      let target = phaseHost.querySelector("[data-focus='true']");
      if (kind === "interaction" && view.phase === "playing") target = phaseHost.querySelector(".seat-pad[data-side='left']");
      target?.focus({ preventScroll: true });
    });
  }

  function finitePercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
  }

  function finiteNormalized(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(-1, Math.min(1, number)) : 0;
  }

  function setText(selector, value) {
    const target = phaseHost.querySelector(selector);
    if (target) target.textContent = value ?? "";
  }

  function actionButton(label, action, className) {
    const button = element("button", className, label);
    button.type = "button";
    button.dataset.action = action;
    return button;
  }

  function element(tagName, className = "", text = "") {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function svgElement(tagName, className = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    if (className) node.setAttribute("class", className);
    return node;
  }

  function svgNode(tagName, attributes, text = "") {
    const node = svgElement(tagName);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    if (text) node.textContent = text;
    return node;
  }

  function gradient(id, stops) {
    const node = svgNode("linearGradient", { id, x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
    for (const [offset, color] of stops) node.append(svgNode("stop", { offset, "stop-color": color }));
    return node;
  }

  function radialGradient() {
    const node = svgNode("radialGradient", { id: "pearl-gradient", cx: "32%", cy: "25%", r: "72%" });
    node.append(
      svgNode("stop", { offset: "0%", "stop-color": "#ffffff" }),
      svgNode("stop", { offset: "45%", "stop-color": "#eadfce" }),
      svgNode("stop", { offset: "80%", "stop-color": "#bda890" }),
      svgNode("stop", { offset: "100%", "stop-color": "#806d5c" }),
    );
    return node;
  }

  function ballShadow() {
    const filter = svgNode("filter", { id: "ball-shadow", x: "-60%", y: "-60%", width: "220%", height: "220%" });
    filter.append(svgNode("feDropShadow", { dx: 4, dy: 6, stdDeviation: 5, "flood-color": "#3e2d18", "flood-opacity": 0.28 }));
    return filter;
  }

  function balanceMark() {
    const svg = svgElement("svg", "intro-mark");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 108 70");
    svg.append(
      svgNode("path", { d: "M10 23h88", fill: "none", stroke: "currentColor", "stroke-width": 4, "stroke-linecap": "round" }),
      svgNode("circle", { cx: 54, cy: 23, r: 7, fill: "var(--paper-light)", stroke: "currentColor", "stroke-width": 3 }),
      svgNode("circle", { cx: 54, cy: 15, r: 8, fill: "var(--porcelain)", stroke: "var(--ink)", "stroke-width": 2 }),
      svgNode("path", { d: "m54 30-17 27h34L54 30Z", fill: "none", stroke: "currentColor", "stroke-width": 4, "stroke-linejoin": "round" }),
    );
    return svg;
  }

  function pauseIcon() {
    const svg = svgElement("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.append(svgNode("path", { d: "M8 5v14M16 5v14", fill: "none", stroke: "currentColor", "stroke-width": 2.2, "stroke-linecap": "round" }));
    return svg;
  }

  function restartIcon() {
    const svg = svgElement("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.append(svgNode("path", { d: "M5 8V3m0 0h5M5 3l3.6 3.6A8 8 0 1 1 4 13", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    return svg;
  }

  function arrowIcon() {
    const svg = svgElement("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.append(svgNode("path", { d: "M5 12h13m-5-5 5 5-5 5", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    return svg;
  }
})();
