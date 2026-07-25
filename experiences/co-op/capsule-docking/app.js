(function () {
  "use strict";

  const logic = globalThis.CapsuleDockingLogic;
  const rawConfig = globalThis.CAPSULE_DOCKING_CONFIG || {};
  const root = document.querySelector("#capsule-docking-app");
  if (!logic || !root) return;

  const elements = {
    phaseName: document.querySelector("#phase-name"),
    phaseHeading: document.querySelector("#phase-heading"),
    statusText: document.querySelector("#status-text"),
    phaseExtra: document.querySelector("#phase-extra"),
    primaryAction: document.querySelector("#primary-action"),
    stagePanel: document.querySelector("#stage-panel"),
    stageDescription: document.querySelector("#stage-description"),
    capsule: document.querySelector("#capsule"),
    velocityVector: document.querySelector("#velocity-vector"),
    velocityLine: document.querySelector("#velocity-line"),
    velocityArrow: document.querySelector("#velocity-arrow"),
    positionValue: document.querySelector("#position-value"),
    velocityValue: document.querySelector("#velocity-value"),
    angleValue: document.querySelector("#angle-value"),
    angularVelocityValue: document.querySelector("#angular-velocity-value"),
    telemetrySentence: document.querySelector("#telemetry-sentence"),
    gatePanel: document.querySelector("#gate-panel"),
    gateStatus: document.querySelector("#gate-status"),
    stablePanel: document.querySelector("#stable-panel"),
    stableValue: document.querySelector("#stable-value"),
    stableTrack: document.querySelector("#stable-track"),
    attitudeName: document.querySelector("#attitude-name"),
    thrustName: document.querySelector("#thrust-name"),
    completedList: document.querySelector("#completed-list"),
    logEmpty: document.querySelector("#log-empty"),
    liveStatus: document.querySelector("#live-status"),
  };
  const requiredElements = Object.values(elements);
  if (requiredElements.some((element) => !element)) return;

  const controlButtons = [...root.querySelectorAll(".control-button[data-control]")];
  const gateRows = [...root.querySelectorAll("[data-gate]")];
  if (controlButtons.length !== 4 || gateRows.length !== 6) return;

  const phasePresentation = {
    intro: { name: "准备", heading: "先分好两席", action: "START", label: "开始对接" },
    "leg-intro": { name: "航段说明", heading: "一起看清初态", action: "BEGIN_LEG" },
    approaching: { name: "接近中", heading: "转一点，推一点", action: "SUSPEND", label: "暂停这一段" },
    failed: { name: "接近中断", heading: "停在最后安全位置", action: "RETRY_LEG", label: "重新靠近" },
    docked: { name: "已对接", heading: "这一段稳稳接住", action: "NEXT_LEG" },
    "mission-result": { name: "共同记录", heading: "三段都接住了", action: "FINISH", label: "收下这次对接" },
    complete: { name: "回家", heading: "这一程一起回家", action: "RESTART", label: "再对接一次" },
  };
  const controlByCode = new Map(logic.CONTROLS.map((control) => [control.code, control]));
  const controlById = new Map(logic.CONTROLS.map((control) => [control.id, control]));
  const sources = new Map();
  const sourceKeysByControl = new Map(logic.CONTROLS.map((control) => [control.id, new Set()]));
  const buttonKeySources = new Map();
  const pointerSessions = new Map();
  const stableMarks = [];

  let state = logic.createInitialState();
  let view = logic.getPublicView(state, rawConfig);
  let inputEpoch = 0;
  let rafGeneration = 0;
  let frameId = null;
  let frameBaseline = null;
  let accumulatorMs = 0;
  let allOkAnnouncementKey = "";
  let completionNote = "";
  let phaseToken = "";

  for (let index = 0; index < view.requiredStableTicks; index += 1) {
    const mark = document.createElement("span");
    elements.stableTrack.append(mark);
    stableMarks.push(mark);
  }

  root.addEventListener("click", handleClick);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointerup", handlePointerEnd, true);
  root.addEventListener("pointercancel", handlePointerEnd, true);
  root.addEventListener("lostpointercapture", handlePointerEnd, true);
  root.addEventListener("contextmenu", handleContextMenu);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  globalThis.addEventListener("blur", handleBlur);
  globalThis.addEventListener("focus", handleFocus);
  globalThis.addEventListener("pagehide", handlePageHide);
  globalThis.addEventListener("pageshow", handlePageShow);
  globalThis.addEventListener("resize", handleResize);

  render(null);
  root.hidden = false;
  root.dataset.ready = "true";
  document.documentElement.dataset.capsuleDockingReady = "true";
  scheduleFocus(elements.phaseHeading, false);

  function handleClick(event) {
    const controlButton = event.target.closest(".control-button[data-control]");
    if (controlButton) {
      event.preventDefault();
      return;
    }
    const actionButton = event.target.closest("#primary-action");
    if (!actionButton || actionButton.disabled) return;
    const actionType = actionButton.dataset.action;
    if (!actionType) return;
    transition({ type: actionType }, { source: "primary" });
  }

  function handleContextMenu(event) {
    if (event.target.closest(".control-button[data-control]")) event.preventDefault();
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      if (view.phase !== "approaching" || event.repeat) return;
      event.preventDefault();
      transition({ type: "SUSPEND" }, { source: "escape" });
      return;
    }

    const focusedControl = event.target.closest?.(".control-button[data-control]");
    if (focusedControl && (event.code === "Space" || event.code === "Enter")) {
      if (view.phase !== "approaching") return;
      event.preventDefault();
      if (event.repeat || buttonKeySources.has(event.code)) return;
      const control = controlById.get(focusedControl.dataset.control);
      if (!control) return;
      const sourceKey = `button-key:${control.id}:${event.code}`;
      if (startSource(sourceKey, control, "button-key")) buttonKeySources.set(event.code, sourceKey);
      return;
    }

    const control = controlByCode.get(event.code);
    if (!control || view.phase !== "approaching") return;
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || isEditable(event.target)) return;
    event.preventDefault();
    startSource(`keyboard:${event.code}`, control, "keyboard");
  }

  function handleKeyUp(event) {
    const buttonSource = buttonKeySources.get(event.code);
    if (buttonSource) {
      event.preventDefault();
      buttonKeySources.delete(event.code);
      endSource(buttonSource);
      return;
    }
    const sourceKey = `keyboard:${event.code}`;
    if (!sources.has(sourceKey)) return;
    event.preventDefault();
    endSource(sourceKey);
  }

  function handlePointerDown(event) {
    const button = event.target.closest(".control-button[data-control]");
    if (!button || view.phase !== "approaching") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointerSessions.has(event.pointerId)) return;
    const control = controlById.get(button.dataset.control);
    if (!control) return;
    event.preventDefault();

    let captured = false;
    try {
      button.setPointerCapture(event.pointerId);
      captured = typeof button.hasPointerCapture !== "function" || button.hasPointerCapture(event.pointerId);
    } catch {
      captured = false;
    }

    const session = {
      pointerId: event.pointerId,
      button,
      startedAt: event.timeStamp,
      sourceKey: `pointer:${event.pointerId}`,
      fallback: null,
    };
    if (!captured && !installPointerFallback(session)) return;
    pointerSessions.set(event.pointerId, session);
    if (!startSource(session.sourceKey, control, "pointer", event.pointerId)) {
      pointerSessions.delete(event.pointerId);
      removePointerFallback(session);
      releasePointerCapture(session);
    }
  }

  function installPointerFallback(session) {
    const fallback = (event) => {
      if (event.pointerId === session.pointerId) handlePointerEnd(event);
    };
    try {
      document.addEventListener("pointerup", fallback, true);
      document.addEventListener("pointercancel", fallback, true);
      session.fallback = fallback;
      return true;
    } catch {
      return false;
    }
  }

  function handlePointerEnd(event) {
    const session = pointerSessions.get(event.pointerId);
    if (!session || event.timeStamp < session.startedAt) return;
    if (event.type === "lostpointercapture" && event.target !== session.button) return;
    if (
      event.type === "lostpointercapture"
      && typeof session.button.hasPointerCapture === "function"
      && session.button.hasPointerCapture(event.pointerId)
    ) return;
    pointerSessions.delete(event.pointerId);
    removePointerFallback(session);
    endSource(session.sourceKey);
  }

  function removePointerFallback(session) {
    if (!session.fallback) return;
    document.removeEventListener("pointerup", session.fallback, true);
    document.removeEventListener("pointercancel", session.fallback, true);
    session.fallback = null;
  }

  function releasePointerCapture(session) {
    try {
      if (session.button.hasPointerCapture?.(session.pointerId)) {
        session.button.releasePointerCapture(session.pointerId);
      }
    } catch {
      // The local source is already removed; browser capture may have ended first.
    }
  }

  function startSource(sourceKey, control, kind, pointerId) {
    if (view.phase !== "approaching" || sources.has(sourceKey)) return false;
    const source = { epoch: inputEpoch, seat: control.seat, control: control.id, kind, pointerId };
    const controlSources = sourceKeysByControl.get(control.id);
    const shouldPress = controlSources.size === 0;
    sources.set(sourceKey, source);
    controlSources.add(sourceKey);
    if (shouldPress && !transition({ type: "PRESS", seat: control.seat, control: control.id }, { source: "input" })) {
      controlSources.delete(sourceKey);
      sources.delete(sourceKey);
      return false;
    }
    renderLocalSources();
    return true;
  }

  function endSource(sourceKey) {
    const source = sources.get(sourceKey);
    if (!source) return false;
    sources.delete(sourceKey);
    const controlSources = sourceKeysByControl.get(source.control);
    controlSources.delete(sourceKey);
    const ownsRelease = (
      source.epoch === inputEpoch
      && view.phase === "approaching"
      && controlSources.size === 0
    );
    if (ownsRelease) {
      transition({ type: "RELEASE", seat: source.seat, control: source.control }, { source: "input" });
    }
    renderLocalSources();
    return true;
  }

  function beginApproaching() {
    inputEpoch += 1;
    clearLocalSources();
    startClock();
  }

  function deactivateApproaching() {
    inputEpoch += 1;
    clearLocalSources();
    stopClock();
  }

  function clearLocalSources() {
    for (const session of pointerSessions.values()) {
      removePointerFallback(session);
      releasePointerCapture(session);
    }
    pointerSessions.clear();
    buttonKeySources.clear();
    sources.clear();
    for (const set of sourceKeysByControl.values()) set.clear();
    renderLocalSources();
  }

  function renderLocalSources() {
    for (const button of controlButtons) {
      const count = sourceKeysByControl.get(button.dataset.control)?.size || 0;
      button.toggleAttribute("data-locally-held", count > 0);
    }
  }

  function transition(action, options = {}) {
    const previousState = state;
    const previousView = view;
    const nextState = logic.reduce(state, action);
    if (nextState === previousState) return false;
    const nextView = logic.getPublicView(nextState, rawConfig);

    if (previousView.phase === "approaching" && nextView.phase !== "approaching") {
      deactivateApproaching();
    }
    state = nextState;
    view = nextView;
    if (view.phase === "complete" && previousView.phase !== "complete") {
      completionNote = logic.resolveCompletionNote(view.summary, rawConfig);
    }
    if (view.phase !== "complete") completionNote = "";
    if (shouldResetAllOkLatch(action, previousView, view)) allOkAnnouncementKey = "";

    render(previousView);
    announceTransition(action, previousView, view);
    maybeAnnounceAllOk();
    scheduleTransitionFocus(action, previousView, view, options.source);

    if (previousView.phase !== "approaching" && view.phase === "approaching") beginApproaching();
    return true;
  }

  function shouldResetAllOkLatch(action, previousView, nextView) {
    return (
      ["RETRY_LEG", "NEXT_LEG", "RESTART"].includes(action.type)
      || previousView.legIndex !== nextView.legIndex
      || previousView.attempt !== nextView.attempt
    );
  }

  function announceTransition(action, previousView, nextView) {
    let message = "";
    if (action.type === "START") message = "对接训练已开始。";
    else if (action.type === "BEGIN_LEG") message = `第 ${nextView.legIndex + 1} 段开始。`;
    else if (action.type === "SUSPEND") message = "已暂停并重置本段。";
    else if (action.type === "RETRY_LEG") message = `第 ${nextView.legIndex + 1} 段重新开始。`;
    else if (action.type === "NEXT_LEG" && nextView.phase === "leg-intro") {
      message = `进入第 ${nextView.legIndex + 1} 段。`;
    } else if (action.type === "NEXT_LEG" && nextView.phase === "mission-result") {
      message = "三段对接都完成了。";
    } else if (action.type === "FINISH") message = "对接完成，这一程一起回家。";
    else if (action.type === "RESTART") message = "已回到第一段开始前。";
    else if (previousView.phase === "approaching" && nextView.phase === "failed") {
      message = nextView.lastResult?.status === "hull-contact"
        ? "舱体碰到接口外壳，本段需要重新靠近。"
        : "舱体飘出近距安全区，本段需要重新靠近。";
    } else if (previousView.phase === "approaching" && nextView.phase === "docked") {
      message = `第 ${nextView.legIndex + 1} 段已稳稳接住。`;
    }
    if (message) announce(message);
  }

  function maybeAnnounceAllOk() {
    if (view.phase !== "approaching" || !view.gate.allOk) return;
    const key = `${view.legIndex}:${view.attempt}`;
    if (allOkAnnouncementKey === key) return;
    allOkAnnouncementKey = key;
    announce("六条安全条件都满足，保持稳定。");
  }

  function announce(message) {
    elements.liveStatus.textContent = "";
    globalThis.setTimeout(() => {
      elements.liveStatus.textContent = message;
    }, 0);
  }

  function scheduleTransitionFocus(action, previousView, nextView, source) {
    if (source === "system-blur") return;
    let target = null;
    if (action.type === "BEGIN_LEG") target = elements.stagePanel;
    else if (
      ["START", "SUSPEND", "RETRY_LEG", "NEXT_LEG", "FINISH", "RESTART"].includes(action.type)
      || (previousView.phase === "approaching" && ["failed", "docked"].includes(nextView.phase))
    ) target = elements.phaseHeading;
    if (target) scheduleFocus(target, true);
  }

  function scheduleFocus(target, async) {
    const token = `${view.revision}:${view.phase}`;
    phaseToken = token;
    const focus = () => {
      if (phaseToken !== token || `${view.revision}:${view.phase}` !== token) return;
      target.focus({ preventScroll: true });
    };
    if (async) queueMicrotask(focus);
    else focus();
  }

  function startClock() {
    if (
      view.phase !== "approaching"
      || document.visibilityState !== "visible"
      || !document.hasFocus()
    ) return;
    stopClock();
    const generation = rafGeneration;
    frameBaseline = null;
    accumulatorMs = 0;
    frameId = globalThis.requestAnimationFrame((timestamp) => frame(timestamp, generation));
  }

  function stopClock() {
    rafGeneration += 1;
    if (frameId !== null) globalThis.cancelAnimationFrame(frameId);
    frameId = null;
    frameBaseline = null;
    accumulatorMs = 0;
  }

  function frame(timestamp, generation) {
    frameId = null;
    if (
      generation !== rafGeneration
      || view.phase !== "approaching"
      || document.visibilityState !== "visible"
      || !document.hasFocus()
    ) return;
    if (frameBaseline === null) {
      frameBaseline = timestamp;
    } else {
      const elapsed = Math.max(0, timestamp - frameBaseline);
      frameBaseline = timestamp;
      accumulatorMs += elapsed;
      const tickMs = 1000 / logic.TICK_RATE;
      const waitingTicks = Math.floor(accumulatorMs / tickMs);
      if (waitingTicks > 0) {
        const count = Math.min(waitingTicks, logic.MAX_TICK_BATCH);
        accumulatorMs = waitingTicks > logic.MAX_TICK_BATCH
          ? 0
          : accumulatorMs - count * tickMs;
        transition({ type: "TICK", count }, { source: "clock" });
      }
    }
    if (generation !== rafGeneration || view.phase !== "approaching") return;
    frameId = globalThis.requestAnimationFrame((nextTimestamp) => frame(nextTimestamp, generation));
  }

  function handleBlur() {
    if (view.phase === "approaching") transition({ type: "SUSPEND" }, { source: "system-blur" });
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden" && view.phase === "approaching") {
      transition({ type: "SUSPEND" }, { source: "system-hidden" });
    }
  }

  function handlePageHide() {
    if (view.phase === "approaching") transition({ type: "SUSPEND" }, { source: "system-pagehide" });
    else stopClock();
  }

  function handleFocus() {
    if (view.phase === "approaching") startClock();
  }

  function handlePageShow() {
    if (view.phase === "approaching") startClock();
  }

  function handleResize() {
    if (view.phase === "approaching") startClock();
  }

  function render(previousView) {
    root.dataset.phase = view.phase;
    root.dataset.revision = String(view.revision);
    root.dataset.leg = String(view.legIndex + 1);
    root.dataset.attempt = String(view.attempt);
    phaseToken = `${view.revision}:${view.phase}`;

    const presentation = phasePresentation[view.phase];
    elements.phaseName.textContent = `${presentation.name} · 第 ${view.legIndex + 1} / ${view.legCount} 段`;
    elements.phaseHeading.textContent = presentation.heading;
    elements.statusText.textContent = view.statusText;
    elements.primaryAction.textContent = primaryActionLabel(presentation);
    elements.primaryAction.dataset.action = presentation.action;
    elements.primaryAction.disabled = false;
    renderPhaseExtra();
    renderStage();
    renderTelemetry();
    renderGates();
    renderControls();
    renderStable();
    renderLog();

    if (previousView && previousView.phase !== view.phase) {
      root.dataset.previousPhase = previousView.phase;
    }
  }

  function primaryActionLabel(presentation) {
    if (view.phase === "leg-intro") return `开始第 ${view.legIndex + 1} 段`;
    if (view.phase === "docked") {
      return view.completedCount === view.legCount ? "查看共同记录" : "进入下一段";
    }
    return presentation.label;
  }

  function renderPhaseExtra() {
    elements.phaseExtra.replaceChildren();
    if (view.phase === "mission-result" || view.phase === "complete") {
      const summary = document.createElement("p");
      summary.className = "mission-summary";
      summary.textContent = `总尝试 ${view.summary.totalAttempts} · 共同重试 ${view.summary.retries}`;
      elements.phaseExtra.append(summary);
    }
    if (view.phase === "complete") {
      const note = document.createElement("p");
      note.className = "completion-note";
      note.textContent = completionNote;
      elements.phaseExtra.append(note);
    }
  }

  function renderStage() {
    const x = view.physics.x / logic.POSITION_SCALE;
    const y = view.physics.y / logic.POSITION_SCALE;
    const angle = view.physics.angleIndex * 360 / logic.ANGLE_STEPS;
    elements.capsule.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
    elements.capsule.classList.toggle("is-docked", view.phase === "docked" || view.phase === "complete");
    for (const control of logic.CONTROLS) {
      elements.capsule.classList.toggle(
        `held-${control.id}`,
        view.heldControls[control.seat].includes(control.id),
      );
    }

    const vectorScale = 0.55;
    const vectorX = view.physics.vx * vectorScale;
    const vectorY = view.physics.vy * vectorScale;
    elements.velocityVector.setAttribute("transform", `translate(${x} ${y})`);
    elements.velocityLine.setAttribute("d", `M0 0L${vectorX} ${vectorY}`);
    elements.velocityArrow.setAttribute(
      "transform",
      `translate(${vectorX} ${vectorY}) rotate(${Math.atan2(vectorY, vectorX) * 180 / Math.PI})`,
    );
    elements.velocityVector.hidden = view.physics.vx === 0 && view.physics.vy === 0;
    elements.stageDescription.textContent = stageDescription(x, y);
  }

  function stageDescription(x, y) {
    const vertical = y < 296 ? "接口轴线上方" : y > 324 ? "接口轴线下方" : "接口轴线附近";
    return `共享太空舱位于横向 ${formatNumber(x)}、纵向 ${formatNumber(y)}，在${vertical}；右侧是对接口。`;
  }

  function renderTelemetry() {
    const { x, y, vx, vy, angleError, angularVelocity } = view.physics;
    elements.positionValue.textContent = `${formatNumber(x / logic.POSITION_SCALE)} / ${formatNumber(y / logic.POSITION_SCALE)}`;
    elements.velocityValue.textContent = `${formatNumber(vx / logic.POSITION_SCALE)} / ${formatNumber(vy / logic.POSITION_SCALE)}`;
    elements.angleValue.textContent = signedInteger(angleError);
    elements.angularVelocityValue.textContent = signedInteger(angularVelocity);
    const released = view.gate.controlsReleased ? "已松手" : "仍有按键";
    elements.telemetrySentence.textContent = (
      `横向位置 ${formatNumber(x / logic.POSITION_SCALE)}，纵向位置 ${formatNumber(y / logic.POSITION_SCALE)}；`
      + `线速度 ${formatNumber(vx / logic.POSITION_SCALE)} / ${formatNumber(vy / logic.POSITION_SCALE)}；`
      + `船头角差 ${signedInteger(angleError)}，角速度 ${signedInteger(angularVelocity)}；${released}。`
    );
  }

  function renderGates() {
    elements.gatePanel.hidden = !view.gateVisible;
    elements.gateStatus.textContent = view.gateStatusText;
    for (const row of gateRows) {
      const safe = Boolean(view.gate[row.dataset.gate]);
      row.dataset.safe = String(safe);
      row.querySelector("strong").textContent = safe ? "安全" : "未安全";
    }
  }

  function renderControls() {
    elements.attitudeName.textContent = view.seats[0];
    elements.thrustName.textContent = view.seats[1];
    const enabled = view.phase === "approaching";
    for (const button of controlButtons) {
      const control = controlById.get(button.dataset.control);
      const pressed = enabled && view.heldControls[control.seat].includes(control.id);
      button.disabled = !enabled;
      button.setAttribute("aria-pressed", String(pressed));
      button.toggleAttribute("data-pressed", pressed);
    }
  }

  function renderStable() {
    elements.stablePanel.hidden = !view.gateVisible;
    elements.stableValue.textContent = `${view.stableTicks} / ${view.requiredStableTicks}`;
    for (let index = 0; index < stableMarks.length; index += 1) {
      stableMarks[index].toggleAttribute("data-filled", index < view.stableTicks);
    }
  }

  function renderLog() {
    const existingIds = [...elements.completedList.children].map((item) => item.dataset.legId);
    const nextIds = view.completedLegs.map((item) => item.legId);
    if (existingIds.join("|") === nextIds.join("|")) return;
    elements.completedList.replaceChildren();
    view.completedLegs.forEach((record, index) => {
      const item = document.createElement("li");
      item.dataset.legId = record.legId;
      item.textContent = (
        `第 ${index + 1} 段 · ${record.title} · 共同完成 · 第 ${record.attempts} 次尝试`
      );
      elements.completedList.append(item);
    });
    elements.logEmpty.hidden = view.completedLegs.length > 0;
  }

  function formatNumber(value) {
    return Number(value).toFixed(2);
  }

  function signedInteger(value) {
    if (value > 0) return `+${value}`;
    return String(value);
  }

  function isEditable(target) {
    if (!(target instanceof Element)) return false;
    return (
      target.matches("input, textarea, select")
      || target.isContentEditable
    );
  }
})();
