(function () {
  "use strict";

  const config = globalThis.SHARED_COLOR_STUDIO_CONFIG;
  const logic = globalThis.SHARED_COLOR_STUDIO_LOGIC;
  const root = document.querySelector("#studio-app");
  if (!config || !logic || !root) {
    showFatalError("调色台加载失败，请确认 config.js、logic.js 与 app.js 都在同一目录。");
    return;
  }

  const elements = {
    title: document.querySelector("#app-title"),
    round: document.querySelector("#round-label"),
    timer: document.querySelector("#timer-label"),
    stage: document.querySelector("#studio-stage"),
    ready: document.querySelector("#ready-banner"),
    intro: document.querySelector("#intro-copy"),
    start: document.querySelector("#start-button"),
    countdown: document.querySelector("#countdown-banner"),
    countdownLabel: document.querySelector("#countdown-label"),
    pause: document.querySelector("#pause-strip"),
    pauseTitle: document.querySelector("#pause-title"),
    pauseCopy: document.querySelector("#pause-copy"),
    targetSwatch: document.querySelector("#target-swatch"),
    currentSwatch: document.querySelector("#current-swatch"),
    targetCoordinate: document.querySelector("#target-coordinate"),
    currentCoordinate: document.querySelector("#current-coordinate"),
    note: document.querySelector("#paper-note"),
    stamp: document.querySelector("#success-stamp"),
    hueRail: document.querySelector("#hue-rail"),
    lightnessRail: document.querySelector("#lightness-rail"),
    hueStatus: document.querySelector("#hue-status"),
    lightnessStatus: document.querySelector("#lightness-status"),
    result: document.querySelector("#round-result"),
    resultTitle: document.querySelector("#result-title"),
    resultCopy: document.querySelector("#result-copy"),
    resultAction: document.querySelector("#result-action"),
    album: document.querySelector("#album-view"),
    albumTitle: document.querySelector("#album-title"),
    albumSlips: document.querySelector("#album-slips"),
    albumCopy: document.querySelector("#album-copy"),
    restart: document.querySelector("#restart-button"),
    footer: document.querySelector("#studio-footer"),
    live: document.querySelector("#live-status"),
    moveButtons: [...document.querySelectorAll("button[data-axis]")],
  };

  const supportsOklch = Boolean(globalThis.CSS?.supports?.("color", "oklch(60% 0.12 180)"));
  let state = logic.createStudioState(config);
  let previousPhase = null;
  let announcedStatus = "";
  let lastFrameTime = null;
  let accumulatorMs = 0;

  root.addEventListener("click", handleClick);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointerup", clearPressedState);
  root.addEventListener("pointercancel", clearPressedState);
  root.addEventListener("lostpointercapture", clearPressedState, true);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseFor("hidden");
  });
  globalThis.addEventListener("blur", () => pauseFor("blur"));

  render({ announce: true, focus: false });
  globalThis.requestAnimationFrame(frame);

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.dataset.axis) {
      dispatchMove({ axis: button.dataset.axis, direction: Number(button.dataset.direction) });
      return;
    }
    switch (button.dataset.action) {
      case "start": update(logic.startStudio(state), { focus: true }); break;
      case "resume": resume(); break;
      case "retry": update(logic.retryRound(state), { focus: true }); break;
      case "next": update(logic.advanceRound(state), { focus: true }); break;
      case "restart": update(logic.restartStudio(state), { focus: true }); break;
      default: break;
    }
  }

  function handleKeydown(event) {
    if (event.repeat || isEditableTarget(event.target)) return;
    const move = logic.classifyControlCode(event.code);
    if (!move || state.phase !== "playing") return;
    event.preventDefault();
    dispatchMove(move);
  }

  function handlePointerDown(event) {
    const button = event.target.closest("button[data-axis]");
    if (!button || button.disabled) return;
    button.classList.add("is-pressed");
    try { button.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
  }

  function clearPressedState(event) {
    const button = event.target.closest?.("button[data-axis]");
    button?.classList.remove("is-pressed");
  }

  function dispatchMove(move) {
    update(logic.applyAxisMove(state, move), { focus: true });
  }

  function pauseFor(reason) {
    const next = logic.pauseStudio(state, reason);
    if (next === state) return;
    accumulatorMs = 0;
    lastFrameTime = null;
    update(next, { focus: false });
  }

  function resume() {
    accumulatorMs = 0;
    lastFrameTime = null;
    update(logic.resumeStudio(state), { focus: true });
  }

  function frame(timestamp) {
    if (lastFrameTime === null) {
      lastFrameTime = timestamp;
      globalThis.requestAnimationFrame(frame);
      return;
    }

    const elapsed = Math.max(0, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    if ((state.phase === "countdown" || state.phase === "playing") && elapsed > state.rules.maxFrameGapMs) {
      pauseFor("stalled");
      globalThis.requestAnimationFrame(frame);
      return;
    }

    if (state.phase === "countdown" || state.phase === "playing") {
      accumulatorMs += elapsed;
      const ticks = Math.floor(accumulatorMs / state.rules.tickMs);
      if (ticks > 0) {
        accumulatorMs -= ticks * state.rules.tickMs;
        const next = state.phase === "countdown"
          ? logic.advanceCountdown(state, ticks)
          : logic.advanceTimer(state, ticks);
        update(next, { focus: next.phase !== state.phase });
      }
    } else {
      accumulatorMs = 0;
    }
    globalThis.requestAnimationFrame(frame);
  }

  function update(next, options = {}) {
    if (next === state) return;
    state = next;
    render({ announce: options.announce !== false, focus: options.focus === true });
  }

  function render(options) {
    const view = logic.getView(state);
    if (!view) {
      showFatalError("调色状态无效，请重新打开这个页面。");
      return;
    }

    const phaseChanged = previousPhase !== view.phase;
    root.dataset.phase = view.phase;
    root.dataset.colorMode = supportsOklch ? "oklch" : "hsl";
    elements.title.textContent = state.rules.copy.title;
    elements.round.textContent = `${view.roundNumber} / ${view.roundCount} ${view.title}`;
    elements.timer.textContent = timerText(view);
    elements.timer.classList.toggle("is-urgent", view.phase === "playing" && view.remainingMs <= 10000);
    elements.intro.textContent = state.rules.copy.intro;
    elements.start.textContent = state.rules.copy.start;

    elements.ready.hidden = view.phase !== "ready";
    elements.countdown.hidden = view.phase !== "countdown";
    elements.countdown.setAttribute("aria-hidden", String(view.phase !== "countdown"));
    elements.countdownLabel.textContent = view.countdownLabel || "";
    elements.pause.hidden = view.phase !== "paused";
    elements.pauseCopy.textContent = view.statusLabel;

    renderPapers(view);
    renderAxis(elements.hueRail, "hue", view.hueAxis, view);
    renderAxis(elements.lightnessRail, "lightness", view.lightnessAxis, view);
    elements.hueStatus.textContent = view.hueAxis.label;
    elements.hueStatus.classList.toggle("is-matched", view.hueAxis.direction === "matched");
    elements.lightnessStatus.textContent = view.lightnessAxis.label;
    elements.lightnessStatus.classList.toggle("is-matched", view.lightnessAxis.direction === "matched");
    elements.moveButtons.forEach((button) => { button.disabled = !view.canMove; });

    renderResult(view);
    renderAlbum(view);
    elements.stage.hidden = view.phase === "complete";
    elements.footer.hidden = view.phase === "complete";

    if (options.announce && phaseChanged && view.statusLabel !== announcedStatus) {
      elements.live.textContent = view.statusLabel;
      announcedStatus = view.statusLabel;
    }
    if (options.focus) schedulePhaseFocus(view, phaseChanged);
    previousPhase = view.phase;
  }

  function renderPapers(view) {
    const target = logic.getColorTokens(view.targetColor, supportsOklch);
    const current = logic.getColorTokens(view.currentColor, supportsOklch);
    elements.targetSwatch.style.setProperty("--swatch-color", target.css);
    elements.currentSwatch.style.setProperty("--swatch-color", current.css);
    elements.targetCoordinate.textContent = coordinate(view.targetColor);
    elements.currentCoordinate.textContent = coordinate(view.currentColor);
    elements.note.textContent = view.note;
    elements.stamp.hidden = !(view.phase === "round-result" && view.outcome === "success");
  }

  function renderAxis(container, axis, description, view) {
    const count = axis === "hue" ? state.rules.hueDegrees.length : state.rules.lightness.length;
    const colorBase = axis === "hue" ? view.targetColor : view.currentColor;
    const children = [];
    for (let index = 0; index < count; index += 1) {
      const step = document.createElement("span");
      step.className = "rail-step";
      step.classList.toggle("is-current", index === description.currentIndex);
      step.classList.toggle("is-target", index === description.targetIndex);
      const dot = document.createElement("i");
      dot.className = "rail-dot";
      const sample = { ...colorBase };
      if (axis === "hue") {
        sample.hueIndex = index;
        sample.hueDegrees = state.rules.hueDegrees[index];
      } else {
        sample.lightnessIndex = index;
        sample.lightness = state.rules.lightness[index];
      }
      dot.style.setProperty("--rail-color", logic.getColorTokens(sample, supportsOklch).css);
      dot.setAttribute("aria-hidden", "true");
      const number = document.createElement("span");
      number.textContent = String(index + 1);
      step.append(dot, number);
      children.push(step);
    }
    container.replaceChildren(...children);
    container.setAttribute("aria-label", `${axis === "hue" ? "色相" : "明度"}：当前第 ${description.currentIndex + 1} 格，目标第 ${description.targetIndex + 1} 格`);
  }

  function renderResult(view) {
    const visible = view.phase === "round-result";
    elements.result.hidden = !visible;
    if (!visible) return;
    const success = view.outcome === "success";
    elements.resultTitle.textContent = success ? `${view.title}已经合拍` : "时间到了";
    elements.resultCopy.textContent = view.statusLabel;
    elements.resultAction.textContent = success ? state.rules.copy.next : state.rules.copy.retry;
    elements.resultAction.dataset.action = success ? "next" : "retry";
  }

  function renderAlbum(view) {
    const complete = view.phase === "complete";
    elements.album.hidden = !complete;
    if (!complete) return;
    const slips = state.rules.rounds.map((round) => {
      const article = document.createElement("article");
      article.className = "album-slip";
      const title = document.createElement("h3");
      title.textContent = round.title;
      const swatch = document.createElement("div");
      swatch.className = "album-swatch";
      const color = {
        hueIndex: round.target.hueIndex,
        lightnessIndex: round.target.lightnessIndex,
        hueDegrees: state.rules.hueDegrees[round.target.hueIndex],
        lightness: state.rules.lightness[round.target.lightnessIndex],
        chroma: state.rules.chroma,
      };
      swatch.style.setProperty("--swatch-color", logic.getColorTokens(color, supportsOklch).css);
      swatch.setAttribute("aria-label", coordinate(color));
      const coordinateText = document.createElement("p");
      coordinateText.textContent = coordinate(color);
      article.append(title, swatch, coordinateText);
      return article;
    });
    elements.albumSlips.replaceChildren(...slips);
    elements.albumCopy.textContent = composeAlbumCopy(view);
    elements.restart.textContent = state.rules.copy.restart;
  }

  function composeAlbumCopy(view) {
    const fallback = "你转过色相，我照亮明暗。最后留下的是我们一起调出的颜色。";
    if (typeof config.composeStudioResult !== "function") return fallback;
    try {
      const result = config.composeStudioResult(view);
      if (typeof result !== "string" || !result.trim()) return fallback;
      return Array.from(result.trim()).slice(0, 96).join("");
    } catch {
      return fallback;
    }
  }

  function schedulePhaseFocus(view, phaseChanged) {
    globalThis.setTimeout(() => {
      if (view.phase === "round-result") elements.resultTitle.focus();
      else if (view.phase === "complete") elements.albumTitle.focus();
      else if (view.phase === "ready") elements.start.focus();
      else if (view.phase === "playing" && phaseChanged) elements.moveButtons[0]?.focus();
    }, 0);
  }

  function timerText(view) {
    if (view.phase === "countdown") return `${view.countdownLabel} 秒`;
    if (view.phase === "paused" && state.resumePhase === "countdown") return `${view.countdownLabel} 秒`;
    return `${(view.remainingMs / 1000).toFixed(1)} 秒`;
  }

  function coordinate(color) {
    return `H ${color.hueIndex + 1}/12 · L ${color.lightnessIndex + 1}/9`;
  }

  function isEditableTarget(target) {
    return Boolean(target && (target.closest?.("input, textarea, select, [contenteditable='true']") || target.isContentEditable));
  }

  function showFatalError(message) {
    const host = root || document.body;
    host.replaceChildren();
    const error = document.createElement("p");
    error.className = "app-error";
    error.textContent = message;
    host.append(error);
  }
})();
