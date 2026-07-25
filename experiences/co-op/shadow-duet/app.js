(function () {
  "use strict";

  const logic = globalThis.ShadowDuetLogic;
  const rawConfig = globalThis.SHADOW_DUET_CONFIG;
  const root = document.querySelector("#shadow-duet");
  const phasePanel = document.querySelector("#phase-panel");
  const phaseHeading = document.querySelector("#phase-heading");
  const sceneKicker = document.querySelector("#scene-kicker");
  const phaseCopy = document.querySelector("#phase-copy");
  const targetCard = document.querySelector("#target-card");
  const targetLeft = document.querySelector("#target-left");
  const targetRight = document.querySelector("#target-right");
  const progressStatus = document.querySelector("#progress-status");
  const attemptStatus = document.querySelector("#attempt-status");
  const stableStatus = document.querySelector("#stable-status");
  const currentStatus = document.querySelector("#current-status");
  const beatRail = document.querySelector("#beat-rail");
  const phaseTail = document.querySelector("#phase-tail");
  const liveRegion = document.querySelector("#live-region");
  const stageDescription = document.querySelector("#stage-description");
  const seatGroups = Array.from(document.querySelectorAll("[data-seat-group]"));
  const poseButtons = Array.from(document.querySelectorAll("button[data-seat][data-pose]"));
  const silhouettes = {
    left: document.querySelector('[data-silhouette="left"]'),
    right: document.querySelector('[data-silhouette="right"]'),
  };

  if (!logic || !root || !phasePanel || !phaseHeading || !sceneKicker || !phaseCopy
    || !targetCard || !targetLeft || !targetRight || !progressStatus || !attemptStatus
    || !stableStatus || !currentStatus || !beatRail || !phaseTail || !liveRegion
    || !stageDescription || seatGroups.length !== 2 || poseButtons.length !== 8
    || !silhouettes.left || !silhouettes.right) return;

  const config = logic.normalizeConfig(rawConfig);
  const pressedKeys = new Map();
  const activePointers = new Map();
  let state = logic.createInitialState();
  let view = logic.getPublicView(state, config);
  let rafId = null;
  let clockGeneration = 0;
  let lastTimestamp = null;
  let accumulatorMs = 0;
  let focusToken = 0;
  let pendingFocus = null;

  root.addEventListener("click", handleActionClick);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointerup", handlePointerRelease);
  root.addEventListener("pointercancel", handlePointerRelease);
  root.addEventListener("lostpointercapture", handlePointerRelease, true);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  globalThis.addEventListener("blur", handleBlur);
  globalThis.addEventListener("focus", flushPendingFocus);
  globalThis.addEventListener("pagehide", handlePageHide);

  document.documentElement.classList.add("app-ready");
  render(null, { type: "INIT" }, true);

  function poseById(id) {
    for (const pose of view.poses) if (pose.id === id) return pose;
    return null;
  }

  function poseLabel(id) {
    const pose = poseById(id);
    return pose ? pose.label : "还没有姿势";
  }

  function keyBinding(code) {
    for (const pose of view.poses) {
      if (pose.leftCode === code) return { seat: "left", pose: pose.id };
      if (pose.rightCode === code) return { seat: "right", pose: pose.id };
    }
    return null;
  }

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function isEditable(target) {
    return target instanceof Element
      && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function handleKeyDown(event) {
    if (event.code === "Escape" && view.phase === "dancing"
      && !event.repeat && !event.isComposing && !hasModifier(event)) {
      event.preventDefault();
      suspendDance();
      return;
    }
    if (view.phase !== "dancing" || event.repeat || event.isComposing
      || hasModifier(event) || isEditable(event.target)) return;
    const binding = keyBinding(event.code);
    if (!binding || pressedKeys.has(event.code)) return;
    event.preventDefault();
    if (dispatch({ type: "PRESS", seat: binding.seat, pose: binding.pose })) {
      pressedKeys.set(event.code, binding);
    }
  }

  function handleKeyUp(event) {
    const binding = pressedKeys.get(event.code);
    if (!binding) return;
    pressedKeys.delete(event.code);
    event.preventDefault();
    dispatch({ type: "RELEASE", seat: binding.seat, pose: binding.pose });
  }

  function handlePointerDown(event) {
    const button = event.target.closest("button[data-seat][data-pose]");
    if (!button || view.phase !== "dancing" || activePointers.has(event.pointerId)) return;
    if (event.pointerType === "mouse" && (!event.isPrimary || event.button !== 0)) return;
    event.preventDefault();

    let fallback = null;
    let captured = false;
    try {
      button.setPointerCapture(event.pointerId);
      captured = true;
    } catch (_error) {
      fallback = installPointerFallback(event.pointerId);
      if (fallback === null) return;
    }

    const active = {
      pointerId: event.pointerId,
      button,
      seat: button.dataset.seat,
      pose: button.dataset.pose,
      captured,
      fallback,
    };
    activePointers.set(event.pointerId, active);
    if (!dispatch({ type: "PRESS", seat: active.seat, pose: active.pose })) {
      activePointers.delete(event.pointerId);
      teardownPointer(active);
    }
  }

  function installPointerFallback(pointerId) {
    const onUp = (event) => {
      if (event.pointerId === pointerId) handlePointerRelease(event);
    };
    const onCancel = (event) => {
      if (event.pointerId === pointerId) handlePointerRelease(event);
    };
    let upInstalled = false;
    try {
      document.addEventListener("pointerup", onUp, true);
      upInstalled = true;
      document.addEventListener("pointercancel", onCancel, true);
    } catch (_error) {
      if (upInstalled) {
        try { document.removeEventListener("pointerup", onUp, true); } catch (_ignored) {}
      }
      try { document.removeEventListener("pointercancel", onCancel, true); } catch (_ignored) {}
      return null;
    }
    return function removeFallback() {
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onCancel, true);
    };
  }

  function handlePointerRelease(event) {
    const active = activePointers.get(event.pointerId);
    if (!active) return;
    activePointers.delete(event.pointerId);
    dispatch({ type: "RELEASE", seat: active.seat, pose: active.pose });
    teardownPointer(active, event.type === "lostpointercapture");
  }

  function teardownPointer(active, captureAlreadyLost) {
    if (active.fallback) active.fallback();
    if (active.captured && !captureAlreadyLost) {
      try {
        if (active.button.hasPointerCapture(active.pointerId)) {
          active.button.releasePointerCapture(active.pointerId);
        }
      } catch (_error) {
        // The session is already absent from the map, so a late lostcapture is harmless.
      }
    }
  }

  function clearLocalInputs() {
    pressedKeys.clear();
    const pointers = Array.from(activePointers.values());
    activePointers.clear();
    for (const active of pointers) teardownPointer(active);
  }

  function handleVisibilityChange() {
    if (document.hidden) suspendDance();
    else flushPendingFocus();
  }

  function handleBlur() {
    suspendDance();
  }

  function handlePageHide() {
    suspendDance();
  }

  function suspendDance() {
    if (view.phase !== "dancing") return;
    clearLocalInputs();
    dispatch({ type: "SUSPEND" });
  }

  function handleActionClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const actions = {
      start: "START",
      begin: "BEGIN_SCENE",
      retry: "RETRY_SCENE",
      next: "NEXT_SCENE",
      finish: "FINISH",
      restart: "RESTART",
    };
    const type = actions[button.dataset.action];
    if (!type) return;
    clearLocalInputs();
    dispatch({ type }, true);
  }

  function startClock() {
    if (rafId !== null || view.phase !== "dancing" || document.hidden || !document.hasFocus()) return;
    lastTimestamp = null;
    accumulatorMs = 0;
    const generation = clockGeneration;
    rafId = globalThis.requestAnimationFrame((timestamp) => frame(timestamp, generation));
  }

  function stopClock() {
    clockGeneration += 1;
    if (rafId !== null) globalThis.cancelAnimationFrame(rafId);
    rafId = null;
    lastTimestamp = null;
    accumulatorMs = 0;
  }

  function scheduleFrame(generation) {
    if (generation !== clockGeneration || view.phase !== "dancing") return;
    rafId = globalThis.requestAnimationFrame((timestamp) => frame(timestamp, generation));
  }

  function frame(timestamp, generation) {
    if (generation !== clockGeneration || view.phase !== "dancing") return;
    rafId = null;

    if (!Number.isFinite(timestamp)) {
      lastTimestamp = null;
      accumulatorMs = 0;
      scheduleFrame(generation);
      return;
    }
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      scheduleFrame(generation);
      return;
    }
    if (timestamp <= lastTimestamp) {
      lastTimestamp = timestamp;
      accumulatorMs = 0;
      scheduleFrame(generation);
      return;
    }

    accumulatorMs += timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    const tickDuration = 1000 / logic.TICK_RATE;
    const availableTicks = Math.floor(accumulatorMs / tickDuration);
    if (availableTicks > 0) {
      const ticks = Math.min(availableTicks, logic.MAX_STEP_TICKS);
      if (availableTicks > logic.MAX_STEP_TICKS) {
        accumulatorMs = 0;
        lastTimestamp = null;
      } else {
        accumulatorMs -= ticks * tickDuration;
      }
      dispatch({ type: "STEP", ticks });
    }
    scheduleFrame(generation);
  }

  function dispatch(action, requestFocus) {
    const previousState = state;
    const previousView = view;
    state = logic.reduce(state, action);
    if (state === previousState) return false;
    view = logic.getPublicView(state, config);
    if (previousView.phase === "dancing" && view.phase !== "dancing") {
      stopClock();
      clearLocalInputs();
    }
    render(previousView, action, Boolean(requestFocus));
    if (previousView.phase !== "dancing" && view.phase === "dancing") startClock();
    return true;
  }

  function render(previousView, action, requestFocus) {
    root.dataset.phase = view.phase;
    renderPhase();
    renderStage();
    renderStatus();
    renderControls();
    renderTail();
    announce(previousView, action);
    if (requestFocus || !previousView || previousView.phase !== view.phase) {
      scheduleFocus(phaseHeading);
    }
  }

  function renderPhase() {
    const sceneNumber = view.sceneIndex + 1;
    const scene = view.currentScene;
    const targetVisible = ["scene-intro", "dancing", "missed", "pose-result"].includes(view.phase);
    targetCard.hidden = !targetVisible;
    sceneKicker.textContent = targetVisible ? `第 ${sceneNumber} 幕 / 共 ${view.sceneCount} 幕` : "";
    if (targetVisible) {
      targetLeft.textContent = `${view.seats[0]}：${poseLabel(scene.leftPose)}`;
      targetRight.textContent = `${view.seats[1]}：${poseLabel(scene.rightPose)}`;
    }

    if (view.phase === "intro") {
      phaseHeading.textContent = "纸幕还没有亮起";
      phaseCopy.textContent = "两个人各守一边。幕布拉开后，先看清这一幕的目标。";
    } else if (view.phase === "scene-intro") {
      phaseHeading.textContent = `第 ${sceneNumber} 幕 · ${scene.title}`;
      phaseCopy.textContent = `${view.seats[0]}做“${poseLabel(scene.leftPose)}”，${view.seats[1]}做“${poseLabel(scene.rightPose)}”。`;
    } else if (view.phase === "dancing") {
      phaseHeading.textContent = `第 ${sceneNumber} 幕 · ${scene.title}`;
      phaseCopy.textContent = view.tick >= view.windowStartTick
        ? "定格窗亮了——一起把姿势留住。"
        : "先试动作。拍灯亮起时，把正确姿势留住六小拍。";
    } else if (view.phase === "missed") {
      phaseHeading.textContent = `第 ${sceneNumber} 幕 · ${scene.title}`;
      phaseCopy.textContent = "影子还没在同一拍站稳，再排这一幕。";
    } else if (view.phase === "pose-result") {
      phaseHeading.textContent = `第 ${sceneNumber} 幕 · ${scene.title}`;
      phaseCopy.textContent = "这一幕接住了。";
    } else if (view.phase === "act-result") {
      sceneKicker.textContent = "共同完成";
      phaseHeading.textContent = "六道影子，刚好跳成一支舞。";
      phaseCopy.textContent = "六张合照已经按排练顺序留在纸幕下。";
    } else {
      sceneKicker.textContent = "谢幕";
      phaseHeading.textContent = "幕布落下，合照留在这里。";
      phaseCopy.textContent = "这一次没有输赢，只有两个人一起接住的六幕。";
    }
  }

  function renderStage() {
    let leftPose = view.activePoses.left;
    let rightPose = view.activePoses.right;
    if (view.phase === "missed" && view.lastResult) {
      leftPose = view.lastResult.leftPose;
      rightPose = view.lastResult.rightPose;
    }
    if (view.phase === "pose-result") {
      leftPose = view.currentScene.leftPose;
      rightPose = view.currentScene.rightPose;
    }
    silhouettes.left.dataset.pose = leftPose || "neutral";
    silhouettes.right.dataset.pose = rightPose || "neutral";
    stageDescription.textContent = `${view.seats[0]}当前${poseLabel(leftPose)}，${view.seats[1]}当前${poseLabel(rightPose)}。`;
  }

  function renderStatus() {
    progressStatus.textContent = `已定格 ${view.completedCount} / ${view.sceneCount}`;
    attemptStatus.textContent = `第 ${view.attempt} 次尝试`;
    stableStatus.textContent = `稳定 ${view.stableTicks} / ${view.requiredStableTicks}`;
    currentStatus.textContent = `当前姿势：${view.seats[0]}${poseLabel(view.activePoses.left)} · ${view.seats[1]}${poseLabel(view.activePoses.right)}`;
    const beats = Array.from(beatRail.children);
    for (let index = 0; index < beats.length; index += 1) {
      beats[index].dataset.lit = index < view.stableTicks ? "true" : "false";
    }
    beatRail.dataset.window = view.phase === "dancing" && view.tick >= view.windowStartTick ? "open" : "closed";
  }

  function renderControls() {
    const enabled = view.phase === "dancing";
    for (const group of seatGroups) group.disabled = !enabled;
    for (const button of poseButtons) {
      const held = view.heldPoses[button.dataset.seat].includes(button.dataset.pose);
      button.setAttribute("aria-pressed", held ? "true" : "false");
    }
  }

  function renderTail() {
    phaseTail.replaceChildren();
    if (view.phase === "pose-result" || view.phase === "act-result" || view.phase === "complete") {
      phaseTail.append(buildRecords());
    }
    if (view.summary) phaseTail.append(buildSummary());
    if (view.phase === "complete") phaseTail.append(buildCompletionNote());
    const action = buildPrimaryAction();
    if (action) phaseTail.append(action);
  }

  function buildRecords() {
    const section = document.createElement("section");
    section.className = "records";
    const heading = document.createElement("h3");
    heading.textContent = "纸幕合照";
    const list = document.createElement("ol");
    const firstIndex = view.phase === "pose-result" ? view.completedScenes.length - 1 : 0;
    for (let index = firstIndex; index < view.completedScenes.length; index += 1) {
      const record = view.completedScenes[index];
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = `第 ${index + 1} 幕 · ${view.summary ? view.summary.captures[index] : view.currentScene.title}`;
      const meta = document.createElement("span");
      meta.textContent = `共同完成 · 第 ${record.attempts} 次尝试`;
      item.append(title, meta);
      list.append(item);
    }
    section.append(heading, list);
    return section;
  }

  function buildSummary() {
    const summary = document.createElement("dl");
    summary.className = "shared-summary";
    appendSummary(summary, "共同完成", `${view.summary.sceneCount} 幕`);
    appendSummary(summary, "一共尝试", `${view.summary.totalAttempts} 次`);
    appendSummary(summary, "重排", `${view.summary.retries} 次`);
    return summary;
  }

  function appendSummary(list, label, value) {
    const group = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    group.append(term, description);
    list.append(group);
  }

  function buildCompletionNote() {
    const note = document.createElement("p");
    note.className = "completion-note";
    note.textContent = logic.resolveCompletionNote(config.composeCompletionNote, view.summary);
    return note;
  }

  function buildPrimaryAction() {
    const actions = {
      intro: ["拉开幕布", "start"],
      "scene-intro": ["开始这一幕", "begin"],
      missed: ["再排这一幕", "retry"],
      "pose-result": ["下一幕", "next"],
      "act-result": ["让幕布落下", "finish"],
      complete: ["再跳一次", "restart"],
    };
    const spec = actions[view.phase];
    if (!spec) return null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-action";
    button.dataset.action = spec[1];
    button.textContent = spec[0];
    return button;
  }

  function announce(previousView, action) {
    if (!previousView) return;
    let message = "";
    if (action.type === "SUSPEND") message = "这一幕已暂停，重新开始时不会补算离开的时间。";
    else if (previousView.phase === "dancing" && view.phase === "pose-result") message = "这一幕接住了。";
    else if (previousView.phase === "dancing" && view.phase === "missed") {
      message = "影子还没在同一拍站稳，再排这一幕。";
    } else if (previousView.phase === "dancing"
      && previousView.tick < view.windowStartTick && view.tick >= view.windowStartTick) {
      message = "定格窗亮了，一起把姿势留住。";
    } else if (view.phase === "scene-intro" && previousView.phase !== "scene-intro") {
      message = `第 ${view.sceneIndex + 1} 幕，${view.currentScene.title}。`;
    } else if (view.phase === "act-result" && previousView.phase !== "act-result") {
      message = "六道影子，刚好跳成一支舞。";
    } else if (view.phase === "complete" && previousView.phase !== "complete") {
      message = "幕布落下，合照留在这里。";
    }
    if (message) liveRegion.textContent = message;
  }

  function scheduleFocus(target) {
    focusToken += 1;
    const token = focusToken;
    const origin = document.activeElement;
    pendingFocus = { token, target, origin };
    queueMicrotask(() => {
      if (!pendingFocus || pendingFocus.token !== token) return;
      flushPendingFocus();
    });
  }

  function flushPendingFocus() {
    const request = pendingFocus;
    if (!request || request.token !== focusToken || !request.target.isConnected
      || document.hidden || !document.hasFocus()) return;
    const active = document.activeElement;
    if (active !== request.origin && active !== document.body && active !== root) return;
    pendingFocus = null;
    request.target.focus({ preventScroll: true });
  }
})();
