(function () {
  "use strict";

  const rawConfig = globalThis.SAME_PACE_STAR_CONFIG || {};
  const logic = globalThis.SAME_PACE_STAR_LOGIC;
  const root = document.querySelector("#same-pace-app");
  const phaseHost = document.querySelector("#phase-host");
  const liveStatus = document.querySelector("#live-status");

  if (!logic || !root || !phaseHost || !liveStatus) return;

  const safeConfig = logic.sanitizeSamePaceConfig(rawConfig);
  const pressedKeys = new Set();
  const activePointers = new Map();

  let state = logic.createSamePaceState(rawConfig);
  let view = logic.getSamePaceView(state);
  let structure = "";
  let announcedKey = "";
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

  render(true);

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") dispatch({ type: "START" }, { focus: true, resetClock: true });
    if (action === "next") dispatch({ type: "NEXT" }, { focus: true, resetClock: true });
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
      if (event.repeat || !view.canPause) return;
      event.preventDefault();
      interrupt("manual", true);
      return;
    }
    if (hasModifier(event) || isEditable(event.target) || view.phase !== "playing") return;
    const action = logic.classifySamePaceKey(event.code, "down", event.repeat);
    if (!action) return;
    event.preventDefault();
    pressedKeys.add(action.inputId);
    dispatch(action);
  }

  function handleKeyUp(event) {
    const action = logic.classifySamePaceKey(event.code, "up", false);
    if (!action) return;
    const wasTracked = pressedKeys.has(action.inputId);
    if (!wasTracked && (hasModifier(event) || isEditable(event.target))) return;
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
    activePointers.set(event.pointerId, { inputId, pad });
    pad.classList.add("is-pointer-down");
    try {
      pad.setPointerCapture(event.pointerId);
    } catch {
      // Document-level pointerup still provides an exact-id release path.
    }
    dispatch({ type: "PRESS", side: pad.dataset.side, inputId });
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

  function interrupt(reason, shouldFocus) {
    if (!view.canPause) return;
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
        // The input is cleared locally even if the browser already dropped capture.
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
    const previousPhase = view.phase;
    state = logic.reduceSamePace(state, action);
    if (state === previousState) return;
    view = logic.getSamePaceView(state);
    if (options.resetClock || view.phase !== "playing") stopClock();
    render(Boolean(options.focus));
    if (view.phase === "playing" && previousPhase !== "playing") startClock();
  }

  function render(forceFocus) {
    const nextStructure = structureFor(view.phase);
    const structureChanged = nextStructure !== structure;
    if (structureChanged) {
      structure = nextStructure;
      phaseHost.replaceChildren(buildStructure(nextStructure));
    }
    phaseHost.dataset.phase = view.phase;
    if (view.phase === "intro") renderIntro();
    if (view.phase === "playing") renderPlaying();
    if (view.phase === "release-gate") renderReleaseGate();
    if (view.phase === "ready") renderReady();
    if (view.phase === "measure-complete") renderMeasureComplete();
    if (view.phase === "paused") renderPaused();
    if (view.phase === "complete") renderComplete();
    announce();
    if (forceFocus || (structureChanged && nextStructure !== "release-gate")) scheduleFocus(nextStructure);
  }

  function structureFor(phase) {
    if (phase === "playing" || phase === "release-gate") return "interaction";
    return ["intro", "ready", "measure-complete", "paused", "complete"].includes(phase) ? phase : "intro";
  }

  function buildStructure(kind) {
    if (kind === "intro") return buildIntro();
    if (kind === "interaction") return buildPlaying();
    if (kind === "ready") return buildStateView("ready");
    if (kind === "measure-complete") return buildStateView("measure-complete");
    if (kind === "paused") return buildStateView("paused");
    return buildComplete();
  }

  function buildIntro() {
    const wrapper = element("div", "intro-view");
    wrapper.append(buildStarTrack());
    const panel = element("section", "intro-panel");
    const title = element("h2");
    title.dataset.intro = "title";
    const guide = element("p", "intro-guide", "左边按 A，右边按 L。每颗星按住两次，再依次松开。");
    const safety = element("p", "safety-note", "不用憋气或刻意调整呼吸；如果感到不适，请停下来。");
    const start = actionButton("开始接光", "start");
    start.dataset.focus = "true";
    panel.append(title, guide, safety, start);
    wrapper.append(panel);
    return wrapper;
  }

  function buildPlaying() {
    const wrapper = element("section", "play-view");
    wrapper.append(buildStarTrack());
    const headingWrap = element("div", "measure-copy");
    headingWrap.append(element("h2", "measure-heading"), element("p", "measure-leader"));
    const core = element("div", "play-core");
    core.append(buildHaloStage(), buildBeatTrack());
    const pads = buildPads(false);
    const pauseRow = element("div", "pause-row");
    const pause = actionButton("暂停", "pause", "pause-button");
    pause.prepend(pauseIcon());
    pauseRow.append(pause);
    wrapper.append(headingWrap, core, pads, pauseRow);
    return wrapper;
  }

  function buildStateView(kind) {
    const wrapper = element("div", `state-view state-${kind}`);
    wrapper.append(buildStarTrack());
    const panel = element("section", "state-panel");
    const heading = element("h2");
    heading.dataset.state = "heading";
    const copy = element("p");
    copy.dataset.state = "copy";
    const button = actionButton("", "");
    button.dataset.state = "action";
    button.dataset.focus = "true";
    panel.append(heading, copy, button);
    wrapper.append(panel);
    return wrapper;
  }

  function buildComplete() {
    const wrapper = element("div", "complete-view");
    wrapper.append(buildStarTrack());
    const letter = element("section", "complete-letter");
    const title = element("h2");
    title.tabIndex = -1;
    title.dataset.focus = "true";
    title.dataset.complete = "title";
    const message = element("p", "final-message");
    message.dataset.complete = "message";
    const coda = element("p", "complete-coda", "六次交接，刚好成了一片属于我们的光。");
    const signature = element("p", "signature");
    signature.dataset.complete = "signature";
    const actions = element("div", "complete-actions");
    const restart = actionButton("再来一次", "restart");
    const back = element("a", "secondary-link", "返回作品库");
    back.href = "../../../index.html";
    actions.append(restart, back);
    letter.append(title, message, coda, signature, actions);
    wrapper.append(letter);
    return wrapper;
  }

  function buildStarTrack() {
    const list = element("ol", "star-track");
    list.setAttribute("aria-label", "六颗星进度");
    for (let index = 0; index < 6; index += 1) {
      const item = element("li", "star-step");
      item.dataset.starIndex = String(index);
      item.append(
        starIcon(),
        checkIcon("star-check"),
        element("span", "star-number", `第 ${index + 1} 颗`),
        element("span", "star-state-text"),
      );
      list.append(item);
    }
    return list;
  }

  function buildHaloStage() {
    const stage = element("section", "halo-stage");
    stage.setAttribute("aria-labelledby", "halo-instruction");
    stage.append(element("div", "halo halo-left"), element("div", "halo halo-right"));
    const copy = element("div", "halo-copy");
    const measure = element("span", "halo-measure");
    const instruction = element("strong", "halo-instruction");
    instruction.id = "halo-instruction";
    copy.append(measure, instruction);
    stage.append(copy);
    return stage;
  }

  function buildBeatTrack() {
    const list = element("ol", "beat-track");
    list.setAttribute("aria-label", "四格节拍");
    for (let index = 0; index < 4; index += 1) {
      const item = element("li", "beat-step");
      item.dataset.stepIndex = String(index);
      item.append(
        element("span", "beat-index", String(index + 1)),
        element("span", "edge-mark"),
        checkIcon("step-check"),
        element("span", "beat-action"),
      );
      list.append(item);
    }
    return list;
  }

  function buildPads(readOnly) {
    const pads = element("div", "pads");
    pads.setAttribute("aria-label", readOnly ? "松手状态" : "左右操作区");
    pads.append(buildPad("left", readOnly), buildPad("right", readOnly));
    return pads;
  }

  function buildPad(side, readOnly) {
    const pad = element("button", "seat-pad");
    pad.type = "button";
    pad.dataset.side = side;
    if (readOnly) pad.tabIndex = -1;
    pad.append(
      element("span", "seat-name"),
      element("span", "seat-side", side === "left" ? "左边" : "右边"),
      element("kbd", "seat-key", side === "left" ? "A" : "L"),
      element("span", "seat-state"),
    );
    return pad;
  }

  function renderIntro() {
    renderStars();
    setText("[data-intro='title']", safeConfig.intro);
  }

  function renderPlaying() {
    renderStars();
    setText(".measure-heading", `第 ${view.measureNumber} / ${view.measureCount} 颗 · ${view.measureTitle}`);
    setText(".measure-leader", `${view.leader.name}领拍`);
    const stage = phaseHost.querySelector(".halo-stage");
    stage.dataset.zone = view.timing.zone;
    setText(".halo-measure", `第 ${view.measureNumber} / ${view.measureCount} 颗`);
    setText(".halo-instruction", view.instruction);
    renderSteps();
    renderPads();
  }

  function renderReleaseGate() {
    renderStars();
    setText(".measure-heading", "先都松开");
    setText(".measure-leader", "光没接上，松开再来");
    const stage = phaseHost.querySelector(".halo-stage");
    stage.dataset.zone = "received";
    setText(".halo-measure", `第 ${view.measureNumber} / ${view.measureCount} 颗`);
    setText(".halo-instruction", "先都松开");
    renderSteps();
    renderPads();
  }

  function renderReady() {
    renderStars();
    setText("[data-state='heading']", "光没接上，松开再来");
    setText("[data-state='copy']", view.instruction || "光没接上，松开再来");
    renderStateAction("再试这颗", "retry");
  }

  function renderMeasureComplete() {
    renderStars();
    setText("[data-state='heading']", "这一颗接好了");
    setText("[data-state='copy']", "不用赶，准备好再点下一颗。");
    renderStateAction("下一颗", "next");
  }

  function renderPaused() {
    renderStars();
    setText("[data-state='heading']", "星光停在这里");
    setText("[data-state='copy']", "按键和触点已经清空，继续后从这颗星重新开始。");
    renderStateAction("继续", "resume");
  }

  function renderComplete() {
    renderStars();
    setText("[data-complete='title']", view.finalTitle);
    setText("[data-complete='message']", composeFinalMessage());
    setText("[data-complete='signature']", view.signature);
  }

  function renderStars() {
    const completedCount = Array.isArray(view.completed) ? view.completed.length : 0;
    const items = phaseHost.querySelectorAll("[data-star-index]");
    items.forEach((item, index) => {
      const isComplete = index < completedCount;
      const isCurrent = !isComplete && view.phase !== "intro" && view.phase !== "complete" && index === view.measureNumber - 1;
      const stateName = isComplete ? "complete" : isCurrent ? "current" : "waiting";
      item.dataset.state = stateName;
      if (isCurrent) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      const stateText = item.querySelector(".star-state-text");
      stateText.textContent = isComplete ? "完成" : isCurrent ? "当前" : String(index + 1);
    });
  }

  function renderSteps() {
    const items = phaseHost.querySelectorAll("[data-step-index]");
    items.forEach((item, index) => {
      const step = view.steps[index];
      if (!step) return;
      item.dataset.status = step.status;
      if (step.status === "current") item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      const mark = item.querySelector(".edge-mark");
      mark.dataset.edge = step.edge;
      mark.setAttribute("aria-hidden", "true");
      item.querySelector(".beat-action").textContent = step.status === "received" ? "接住" : step.label;
    });
  }

  function renderPads() {
    const expectedSide = view.expected?.side;
    for (const side of ["left", "right"]) {
      const pad = phaseHost.querySelector(`.seat-pad[data-side='${side}']`);
      if (!pad) continue;
      const seat = view.seats[side];
      pad.dataset.active = String(Boolean(seat.active));
      pad.dataset.expected = String(view.phase === "playing" && expectedSide === side);
      pad.setAttribute("aria-pressed", String(Boolean(seat.active)));
      pad.setAttribute("aria-label", `${seat.name}，${side === "left" ? "左边" : "右边"}，${seat.key}，${seat.stateLabel}`);
      pad.querySelector(".seat-name").textContent = seat.name;
      pad.querySelector(".seat-state").textContent = seat.active ? "按住" : "松开";
    }
  }

  function renderStateAction(label, action) {
    const button = phaseHost.querySelector("[data-state='action']");
    button.textContent = label;
    button.dataset.action = action;
  }

  function composeFinalMessage() {
    const composer = rawConfig.composeSamePaceMessage;
    if (typeof composer !== "function") return view.finalMessage;
    try {
      const result = composer(view);
      return typeof result === "string" && result.trim() ? result.trim() : view.finalMessage;
    } catch {
      return view.finalMessage;
    }
  }

  function announce() {
    let key = `${view.phase}:${view.measureNumber}:${view.stepNumber}`;
    let message = "";
    if (view.phase === "playing") {
      key += `:${view.timing.zone}`;
      message = view.instruction;
    }
    if (view.phase === "release-gate") message = "先都松开。光没接上，松开再来。";
    if (view.phase === "ready") message = "光没接上，松开再来。";
    if (view.phase === "measure-complete") message = "这一颗接好了。";
    if (view.phase === "paused") message = "星光停在这里。按键和触点已经清空。";
    if (view.phase === "complete") message = "六次交接完成。";
    if (!message || key === announcedKey) return;
    announcedKey = key;
    liveStatus.textContent = "";
    globalThis.setTimeout(() => { liveStatus.textContent = message; }, 20);
  }

  function scheduleFocus(kind) {
    globalThis.requestAnimationFrame(() => {
      if (document.hidden || !document.hasFocus()) return;
      let target = phaseHost.querySelector("[data-focus='true']");
      if (kind === "playing") target = phaseHost.querySelector(`.seat-pad[data-side='${view.leader.side}']`);
      target?.focus({ preventScroll: true });
    });
  }

  function setText(selector, value) {
    const target = phaseHost.querySelector(selector);
    if (target) target.textContent = value ?? "";
  }

  function actionButton(label, action, className = "action-button") {
    const button = element("button", className, label);
    button.type = "button";
    button.dataset.action = action;
    return button;
  }

  function pauseIcon() {
    const svg = svgElement("svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    const left = svgElement("path");
    left.setAttribute("d", "M8 5v14M16 5v14");
    left.setAttribute("fill", "none");
    left.setAttribute("stroke", "currentColor");
    left.setAttribute("stroke-width", "2.4");
    left.setAttribute("stroke-linecap", "round");
    svg.append(left);
    return svg;
  }

  function checkIcon(className) {
    const svg = svgElement("svg");
    svg.classList.add(className);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = svgElement("path");
    path.setAttribute("d", "m5 12.5 4.2 4.2L19 7");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
    return svg;
  }

  function starIcon() {
    const svg = svgElement("svg");
    svg.classList.add("star-icon");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = svgElement("path");
    path.setAttribute("d", "m12 2.7 2.7 5.55 6.12.9-4.43 4.31 1.05 6.09L12 16.68l-5.44 2.87 1.05-6.09-4.43-4.31 6.12-.9L12 2.7Z");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.2");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
    return svg;
  }

  function element(tagName, className = "", text = "") {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function svgElement(tagName) {
    return document.createElementNS("http://www.w3.org/2000/svg", tagName);
  }
})();
