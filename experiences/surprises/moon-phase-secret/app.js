(function () {
  "use strict";

  const logic = globalThis.MOON_PHASE_SECRET_LOGIC;
  const rawConfig = globalThis.MOON_PHASE_SECRET_CONFIG;
  const primaryButton = document.querySelector("#primary-button");
  const liveRegion = document.querySelector("#status-live");

  if (!logic || !primaryButton || !liveRegion) return;

  const config = logic.sanitizeConfig(rawConfig);
  let state = logic.createInitialState(config);
  const elements = {
    actionStage: document.querySelector(".action-stage"),
    calibrator: document.querySelector("#calibrator"),
    clueList: document.querySelector("#clue-list"),
    clueStage: document.querySelector("#clue-stage"),
    combinedReadout: document.querySelector("#combined-readout"),
    dayReadout: document.querySelector("#day-readout"),
    feedbackList: document.querySelector("#feedback-list"),
    mechanicalDay: document.querySelector("#mechanical-day-value"),
    minorTicks: document.querySelector("#minor-ticks"),
    monthLabels: document.querySelector("#month-labels"),
    monthReadout: document.querySelector("#month-readout"),
    monthRing: document.querySelector("#month-ring"),
    moonImage: document.querySelector("#moon-image"),
    phaseLabels: document.querySelector("#phase-labels"),
    phaseReadout: document.querySelector("#phase-readout"),
    phaseRing: document.querySelector("#phase-ring"),
    primaryButton,
  };

  buildDial();
  bindControls();
  bindRing(elements.monthRing, "month");
  bindRing(elements.phaseRing, "phase");
  bindImageFallback();
  render();

  function buildDial() {
    for (let index = 0; index < 60; index += 1) {
      const tick = document.createElement("span");
      const angle = index * 6;
      tick.className = "minor-tick";
      placeAroundDial(tick, 46.6, angle);
      tick.style.setProperty("--tick-angle", `${angle}deg`);
      elements.minorTicks.append(tick);
    }

    for (let month = 1; month <= 12; month += 1) {
      const label = document.createElement("span");
      const angle = month * 30;
      label.className = "month-label";
      label.dataset.month = String(month);
      label.textContent = `${month}月`;
      placeAroundDial(label, 42.5, angle);
      elements.monthLabels.append(label);
    }

    logic.PHASE_NAMES.forEach((phaseName, index) => {
      const label = document.createElement("span");
      const mini = document.createElement("span");
      const shadow = document.createElement("span");
      label.className = "phase-label";
      label.dataset.phase = String(index);
      label.title = phaseName;
      placeAroundDial(label, 25.2, index * 45);
      mini.className = "phase-mini";
      mini.dataset.index = String(index);
      shadow.className = "mini-shadow";
      mini.append(shadow);
      label.append(mini);
      elements.phaseLabels.append(label);
    });
  }

  function bindControls() {
    elements.primaryButton.addEventListener("click", () => {
      if (state.phase === "intro") {
        state = logic.start(state);
        render();
        elements.monthRing.focus();
        return;
      }
      if (state.phase === "calibrating") {
        state = logic.checkAlignment(state);
        render();
        const finalTitle = document.querySelector(".final-message h2");
        if (finalTitle) finalTitle.focus();
        return;
      }
      state = logic.restart(state);
      render();
      elements.primaryButton.focus();
    });

    document.querySelectorAll("[data-adjust]").forEach((button) => {
      button.addEventListener("click", () => {
        adjust(button.dataset.adjust, Number(button.dataset.delta));
      });
    });
  }

  function bindRing(ring, kind) {
    if (!ring) return;
    ring.addEventListener("keydown", (event) => {
      if (event.key === "Home") {
        event.preventDefault();
        const view = logic.getViewModel(state);
        adjust(kind, kind === "month" ? 1 - view.selectedMonth : -view.selectedPhaseIndex);
        return;
      }
      const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      adjust(kind, delta);
    });

    const pointer = { id: null, previousAngle: 0, carry: 0 };
    ring.addEventListener("pointerdown", (event) => {
      if (state.phase !== "calibrating"
        || !event.isPrimary
        || pointer.id !== null
        || (event.pointerType === "mouse" && event.button !== 0)) return;
      pointer.id = event.pointerId;
      pointer.previousAngle = angleFromCenter(event, elements.calibrator);
      pointer.carry = 0;
      ring.setPointerCapture(event.pointerId);
      ring.focus({ preventScroll: true });
      event.preventDefault();
    });
    ring.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointer.id) return;
      const nextAngle = angleFromCenter(event, elements.calibrator);
      const delta = logic.normalizeAngularDelta(pointer.previousAngle, nextAngle);
      pointer.previousAngle = nextAngle;
      if (!Number.isFinite(delta) || Math.abs(delta) > logic.MAX_POINTER_DELTA) return;
      const stepAngle = kind === "month" ? logic.MONTH_STEP_ANGLE : logic.MOON_PHASE_STEP_ANGLE;
      const result = logic.stepsFromAngularTravel(pointer.carry, delta, stepAngle);
      pointer.carry = result.newCarry;
      if (result.steps) adjust(kind, result.steps);
      event.preventDefault();
    });
    ["pointerup", "pointercancel"].forEach((eventName) => {
      ring.addEventListener(eventName, (event) => {
        if (event.pointerId === pointer.id) finishPointer(ring, pointer);
      });
    });
    ring.addEventListener("lostpointercapture", (event) => {
      if (event.pointerId === pointer.id) resetPointer(pointer);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) finishPointer(ring, pointer);
    });
    window.addEventListener("blur", () => finishPointer(ring, pointer));
  }

  function bindImageFallback() {
    const fail = () => document.body.classList.add("image-failed");
    elements.moonImage.addEventListener("error", fail, { once: true });
    if (elements.moonImage.complete && elements.moonImage.naturalWidth === 0) fail();
  }

  function adjust(kind, delta) {
    if (kind === "month") state = logic.adjustMonth(state, delta);
    if (kind === "day") state = logic.adjustDay(state, delta);
    if (kind === "phase") state = logic.adjustMoonPhase(state, delta);
    render();
  }

  function render() {
    const view = logic.getViewModel(state);
    const controlsDisabled = view.phase !== "calibrating";
    document.body.dataset.stage = view.phase;
    document.body.dataset.moonPhase = String(view.selectedPhaseIndex);
    document.documentElement.style.setProperty("--month-angle", `${view.selectedMonth * 30}deg`);
    document.documentElement.style.setProperty("--phase-angle", `${view.selectedPhaseIndex * 45}deg`);

    elements.monthReadout.textContent = `${view.selectedMonth} 月`;
    elements.dayReadout.textContent = `${view.selectedDay} 日`;
    elements.mechanicalDay.textContent = String(view.selectedDay).padStart(2, "0");
    elements.phaseReadout.textContent = view.selectedPhaseName;
    elements.combinedReadout.textContent = `${view.year} 年 · ${view.selectedMonth} 月 · ${view.selectedDay} 日 · ${view.selectedPhaseName}`;
    elements.monthRing.disabled = controlsDisabled;
    elements.phaseRing.disabled = controlsDisabled;
    document.querySelectorAll("[data-adjust]").forEach((button) => {
      button.disabled = controlsDisabled;
    });
    document.querySelectorAll("[data-month]").forEach((label) => {
      label.classList.toggle("is-current", Number(label.dataset.month) === view.selectedMonth);
    });
    document.querySelectorAll("[data-phase]").forEach((label) => {
      label.classList.toggle("is-current", Number(label.dataset.phase) === view.selectedPhaseIndex);
    });
    elements.monthRing.setAttribute("aria-label", `当前月份 ${view.selectedMonth} 月。拖动，或按左右方向键调整；按 Home 回到 1 月。`);
    elements.phaseRing.setAttribute("aria-label", `当前月相 ${view.selectedPhaseName}。拖动，或按左右方向键调整；按 Home 回到新月。`);

    renderClues(Array.isArray(view.clues) ? view.clues : []);
    renderFeedback(view.feedback, view.phase);
    renderFinal(view.finalMessage);
    elements.primaryButton.textContent = view.phase === "intro"
      ? "开始校准"
      : view.phase === "calibrating" ? "核对这一天" : "再找一次";
  }

  function renderClues(clues) {
    elements.clueList.replaceChildren();
    elements.clueStage.hidden = clues.length === 0;
    clues.forEach((clue, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      const text = document.createElement("span");
      number.className = "clue-number";
      number.textContent = String(index + 1).padStart(2, "0");
      text.textContent = clue;
      item.append(number, text);
      elements.clueList.append(item);
    });
  }

  function renderFeedback(feedback, phase) {
    elements.feedbackList.replaceChildren();
    elements.feedbackList.hidden = !feedback || phase === "unlocked";
    if (!feedback) return;
    const rows = [
      [feedback.monthAligned ? "月序已对齐" : "月序还没对齐", feedback.monthAligned],
      [feedback.dayAligned ? "日期已对齐" : "日期还没对齐", feedback.dayAligned],
      [feedback.phaseAligned ? "月相已对齐" : "月相还没对齐", feedback.phaseAligned],
    ];
    rows.forEach(([message, aligned]) => {
      const item = document.createElement("li");
      const symbol = document.createElement("span");
      const text = document.createElement("span");
      item.classList.toggle("is-aligned", aligned);
      symbol.className = "feedback-symbol";
      symbol.textContent = aligned ? "✓" : "·";
      text.textContent = message;
      item.append(symbol, text);
      elements.feedbackList.append(item);
    });
    liveRegion.textContent = rows.every(([, aligned]) => aligned)
      ? "三项都已对齐，留言已经展开。"
      : "核对完成，请继续调整还没对齐的项目。";
  }

  function renderFinal(message) {
    document.querySelector(".final-message")?.remove();
    if (!message) return;
    const article = document.createElement("article");
    const recipient = document.createElement("p");
    const title = document.createElement("h2");
    const body = document.createElement("p");
    article.className = "final-message";
    recipient.className = "final-recipient";
    body.className = "final-body";
    recipient.textContent = message.recipientName;
    title.textContent = message.finalTitle;
    title.tabIndex = -1;
    body.textContent = message.finalMessage;
    article.append(recipient, title, body);
    elements.actionStage.insertBefore(article, elements.primaryButton);
  }

  function angleFromCenter(event, element) {
    const rect = element.getBoundingClientRect();
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
  }

  function placeAroundDial(element, radiusPercent, angleDegrees) {
    const radians = angleDegrees * Math.PI / 180;
    element.style.left = `${50 + Math.sin(radians) * radiusPercent}%`;
    element.style.top = `${50 - Math.cos(radians) * radiusPercent}%`;
  }

  function finishPointer(ring, pointer) {
    const pointerId = pointer.id;
    resetPointer(pointer);
    if (pointerId !== null && ring.hasPointerCapture?.(pointerId)) ring.releasePointerCapture(pointerId);
  }

  function resetPointer(pointer) {
    pointer.id = null;
    pointer.previousAngle = 0;
    pointer.carry = 0;
  }
})();
