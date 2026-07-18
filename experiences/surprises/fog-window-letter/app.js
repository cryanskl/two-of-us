(function () {
  "use strict";

  const logic = globalThis.FOG_WINDOW_LETTER_LOGIC;
  const rawConfig = globalThis.FOG_WINDOW_LETTER_CONFIG;
  const root = document.getElementById("letter-app");
  if (!root) return;

  const elements = {
    pageTitle: document.getElementById("page-title"),
    subtitle: document.querySelector(".subtitle"),
    stageTitle: document.getElementById("stage-title"),
    instruction: document.getElementById("instruction"),
    traceProgress: document.getElementById("trace-progress"),
    surface: document.getElementById("window-surface"),
    fogCanvas: document.getElementById("fog-canvas"),
    clearCanvas: document.getElementById("clear-canvas"),
    completionHost: document.getElementById("completion-host"),
    fallback: document.getElementById("canvas-fallback"),
    visibleStatus: document.getElementById("visible-status"),
    liveStatus: document.getElementById("live-status"),
    controls: document.getElementById("controls"),
    start: document.querySelector('[data-action="start"]'),
    confirm: document.querySelector('[data-action="confirm"]'),
    clear: document.querySelector('[data-action="clear"]'),
    pause: document.querySelector('[data-action="pause"]'),
    resume: document.querySelector('[data-action="resume"]'),
    direct: document.querySelector('[data-action="direct"]'),
  };

  if (!logic || typeof logic.createFogWindowState !== "function"
    || typeof logic.reduceFogWindow !== "function"
    || typeof logic.getFogWindowView !== "function"
    || typeof logic.sanitizeFogWindowConfig !== "function") {
    elements.surface.hidden = true;
    elements.fallback.hidden = false;
    elements.fallback.textContent = "页面逻辑没有完整载入，请确认 logic.js 与 index.html 放在同一目录后再打开。";
    elements.visibleStatus.textContent = "当前无法开始手写。";
    for (const button of elements.controls.querySelectorAll("button")) button.hidden = true;
    return;
  }

  const config = logic.sanitizeFogWindowConfig(rawConfig);
  let state = logic.createFogWindowState();
  let view = logic.getFogWindowView(state, config);
  let pointerSession = null;
  let fogContext = null;
  let clearContext = null;
  let canvasAvailable = true;
  let animationFrame = 0;
  let previousFrameTime = null;
  let liveMessageSerial = 0;
  let lastTraceDecile = 0;
  let resizeObserver = null;

  const reducedMotion = globalThis.matchMedia
    ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  initializeCopy();
  initializeCanvas();
  installEvents();
  render(null, { type: "INITIALIZE" });

  function initializeCopy() {
    document.title = config.title;
    elements.pageTitle.textContent = config.title;
    elements.subtitle.textContent = config.subtitle;
    elements.start.textContent = config.startButton;
    elements.confirm.textContent = config.confirmButton;
    elements.clear.textContent = config.clearButton;
    elements.pause.textContent = config.pauseButton;
    elements.resume.textContent = config.resumeButton;
    elements.direct.textContent = config.directButton;
    elements.stageTitle.tabIndex = -1;
  }

  function initializeCanvas() {
    try {
      fogContext = elements.fogCanvas.getContext("2d");
      clearContext = elements.clearCanvas.getContext("2d");
      canvasAvailable = Boolean(fogContext && clearContext);
    } catch {
      canvasAvailable = false;
    }

    if (!canvasAvailable) {
      elements.surface.hidden = true;
      elements.surface.classList.add("is-unavailable");
      elements.fallback.hidden = false;
      return;
    }

    resizeCanvas();
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(elements.surface);
    } else {
      globalThis.addEventListener("resize", resizeCanvas, { passive: true });
    }
  }

  function installEvents() {
    elements.controls.addEventListener("click", handleControlClick);
    elements.surface.addEventListener("pointerdown", handlePointerDown);
    elements.surface.addEventListener("pointermove", handlePointerMove);
    elements.surface.addEventListener("pointerup", handlePointerUp);
    elements.surface.addEventListener("pointercancel", handlePointerCancel);
    elements.surface.addEventListener("lostpointercapture", handleLostPointerCapture);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("blur", () => pauseFor("blur"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") pauseFor("hidden");
    });
    globalThis.addEventListener("pagehide", stopLocalActivity);

    const motionChanged = () => {
      previousFrameTime = null;
      syncAnimation();
      drawCanvases(0);
    };
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", motionChanged);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(motionChanged);
    }
  }

  function handleControlClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || button.hidden || button.disabled) return;
    const actionName = button.dataset.action;
    if (actionName === "start") {
      dispatch({ type: "START" });
      return;
    }
    if (actionName === "confirm") {
      dispatch({ type: "CONFIRM_DRAWING" });
      return;
    }
    if (actionName === "clear") {
      dispatch({ type: "CLEAR_DRAWING" });
      return;
    }
    if (actionName === "pause") {
      pauseFor("manual");
      return;
    }
    if (actionName === "resume") {
      dispatch({ type: "RESUME" });
      return;
    }
    if (actionName === "direct") revealDirectly();
  }

  function handleKeyDown(event) {
    if (event.code !== "Escape" || event.repeat) return;
    if (view.phase !== "writing" && view.phase !== "ready" && view.phase !== "tracing") return;
    event.preventDefault();
    pauseFor("escape");
  }

  function handlePointerDown(event) {
    if (!canvasAvailable || pointerSession !== null || view.active !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!Number.isSafeInteger(event.pointerId) || event.pointerId < 0) return;

    const mode = view.canTrace ? "trace" : view.canDraw ? "write" : null;
    if (!mode) return;
    const point = eventToPoint(event);
    if (!point) return;

    const generation = view.nextGeneration;
    const action = {
      type: mode === "write" ? "BEGIN_STROKE" : "BEGIN_TRACE",
      pointerId: event.pointerId,
      generation,
      x: point.x,
      y: point.y,
    };
    dispatch(action);
    if (!view.active || view.active.pointerId !== event.pointerId
      || view.active.generation !== generation || view.active.mode !== mode) return;

    pointerSession = {
      pointerId: event.pointerId,
      generation,
      mode,
      startedAt: finiteTimestamp(event.timeStamp),
      captured: false,
    };
    event.preventDefault();
    try {
      elements.surface.setPointerCapture(event.pointerId);
      pointerSession.captured = elements.surface.hasPointerCapture(event.pointerId);
    } catch {
      // Document-level pointerup/pointercancel remains the fallback.
    }
  }

  function handlePointerMove(event) {
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId) return;
    event.preventDefault();

    const samples = coalescedSamples(event);
    let previousPoint = null;
    for (const sample of samples) {
      if (!pointerSession || pointerSession !== session) break;
      const point = eventToPoint(sample);
      if (!point || (previousPoint && point.x === previousPoint.x && point.y === previousPoint.y)) continue;
      previousPoint = point;
      dispatch({
        type: session.mode === "write" ? "ADD_STROKE_POINT" : "ADD_TRACE_POINT",
        pointerId: session.pointerId,
        generation: session.generation,
        x: point.x,
        y: point.y,
      });
      if (!view.active) releasePointerSession();
    }
  }

  function handlePointerUp(event) {
    finishPointerSession(event, "up");
  }

  function handlePointerCancel(event) {
    finishPointerSession(event, "cancel");
  }

  function handleLostPointerCapture(event) {
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId) return;
    if (!session.captured) return;
    if (eventIsOlderThanSession(event, session)) return;
    try {
      if (elements.surface.hasPointerCapture(event.pointerId)) return;
    } catch {
      // If capture inspection is unavailable, generation and timestamp still guard the session.
    }
    finishPointerSession(event, "lost-capture");
  }

  function finishPointerSession(event, reason) {
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId || eventIsOlderThanSession(event, session)) return;
    pointerSession = null;
    dispatch({
      type: session.mode === "write" ? "END_STROKE" : "END_TRACE",
      pointerId: session.pointerId,
      generation: session.generation,
      reason,
    });
    releaseCapturedPointer(session.pointerId);
  }

  function coalescedSamples(event) {
    let samples = [];
    if (typeof event.getCoalescedEvents === "function") {
      try {
        samples = event.getCoalescedEvents().filter((sample) => sample.pointerId === event.pointerId);
      } catch {
        samples = [];
      }
    }
    const last = samples[samples.length - 1];
    if (!last || last.clientX !== event.clientX || last.clientY !== event.clientY
      || finiteTimestamp(last.timeStamp) !== finiteTimestamp(event.timeStamp)) {
      samples.push(event);
    }
    return samples;
  }

  function eventToPoint(event) {
    const rect = elements.surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0
      || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    return {
      x: clampInteger(Math.round(((event.clientX - rect.left) * logic.WINDOW_WIDTH) / rect.width), 0, logic.WINDOW_WIDTH),
      y: clampInteger(Math.round(((event.clientY - rect.top) * logic.WINDOW_HEIGHT) / rect.height), 0, logic.WINDOW_HEIGHT),
    };
  }

  function eventIsOlderThanSession(event, session) {
    const timestamp = finiteTimestamp(event.timeStamp);
    return timestamp > 0 && session.startedAt > 0 && timestamp < session.startedAt;
  }

  function finiteTimestamp(value) {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function clampInteger(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function revealDirectly() {
    releasePointerSession();
    dispatch({ type: "DIRECT_REVEAL" });
  }

  function pauseFor(reason) {
    if (view.phase !== "writing" && view.phase !== "ready" && view.phase !== "tracing") return;
    releasePointerSession();
    dispatch({ type: "PAUSE", reason });
  }

  function releasePointerSession() {
    const session = pointerSession;
    pointerSession = null;
    if (session) releaseCapturedPointer(session.pointerId);
  }

  function releaseCapturedPointer(pointerId) {
    try {
      if (elements.surface.hasPointerCapture(pointerId)) elements.surface.releasePointerCapture(pointerId);
    } catch {
      // A detached or already released pointer needs no further adapter work.
    }
  }

  function stopLocalActivity() {
    releasePointerSession();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousFrameTime = null;
  }

  function dispatch(action) {
    const previousView = view;
    const nextState = logic.reduceFogWindow(state, action);
    if (nextState === state) return false;
    state = nextState;
    view = logic.getFogWindowView(state, config);
    render(previousView, action);
    return true;
  }

  function render(previousView, action) {
    root.dataset.phase = view.phase;
    renderCopy();
    renderControls();
    renderCompletion();
    renderAvailability();
    drawCanvases(0);
    announceMeaningfulChange(previousView, action);
    moveFocus(previousView, action);
    syncAnimation();
  }

  function renderCopy() {
    elements.instruction.textContent = view.text.instruction;
    elements.visibleStatus.textContent = view.phase === "intro"
      ? "准备好了，就从第一笔开始。"
      : view.text.status;
    elements.stageTitle.textContent = stageTitleFor(view);
    const percent = Math.floor(view.tracing.ratioPermille / 10);
    elements.traceProgress.textContent = `${percent}%`;
    elements.traceProgress.hidden = view.phase !== "tracing";
  }

  function stageTitleFor(currentView) {
    if (currentView.phase === "intro") return "写一点只有我们懂的形状";
    if (currentView.phase === "writing") return "在雾上写下第一遍";
    if (currentView.phase === "ready") return "雾已经记住了";
    if (currentView.phase === "tracing") return "沿着它，再走一遍";
    if (currentView.phase === "paused") return "先停在这里";
    return currentView.text.title;
  }

  function renderControls() {
    const pausable = canvasAvailable
      && (view.phase === "writing" || view.phase === "ready" || view.phase === "tracing");
    elements.start.hidden = !canvasAvailable || !view.canStart;
    elements.confirm.hidden = !canvasAvailable || !view.canConfirm;
    elements.clear.hidden = !canvasAvailable || !view.canClear;
    elements.pause.hidden = !pausable;
    elements.resume.hidden = !canvasAvailable || !view.canResume;
    elements.direct.hidden = !view.canDirectReveal;
  }

  function renderAvailability() {
    const shouldShowSurface = canvasAvailable || view.phase === "complete";
    elements.surface.hidden = !shouldShowSurface;
    elements.fallback.hidden = canvasAvailable || view.phase === "complete";
    elements.surface.classList.toggle("is-unavailable", !canvasAvailable);
    elements.surface.classList.toggle("is-complete", view.phase === "complete");
    elements.surface.classList.toggle("is-idle", !view.canDraw && !view.canTrace);
    if (shouldShowSurface && view.phase === "complete" && !canvasAvailable) resizeCanvas();
  }

  function renderCompletion() {
    if (view.phase !== "complete") {
      if (elements.completionHost.childElementCount > 0) elements.completionHost.replaceChildren();
      return;
    }
    if (elements.completionHost.childElementCount > 0) return;

    const article = document.createElement("article");
    article.className = "completion-letter";
    article.setAttribute("aria-labelledby", "completion-title");

    const title = document.createElement("h2");
    title.id = "completion-title";
    title.tabIndex = -1;
    title.textContent = view.text.completionTitle;

    const message = document.createElement("p");
    message.className = "completion-message";
    message.textContent = view.text.completionMessage;

    const signature = document.createElement("p");
    signature.className = "completion-signature";
    signature.textContent = `— ${view.text.signature}`;

    const actions = document.createElement("div");
    actions.className = "completion-actions";
    const restart = document.createElement("button");
    restart.className = "button";
    restart.type = "button";
    restart.dataset.action = "restart";
    restart.textContent = config.restartButton;
    restart.addEventListener("click", () => {
      releasePointerSession();
      dispatch({ type: "RESTART" });
    });
    actions.append(restart);
    article.append(title, message, signature, actions);
    elements.completionHost.append(article);
  }

  function announceMeaningfulChange(previousView, action) {
    if (!previousView) {
      announce(view.text.instruction);
      return;
    }

    let message = "";
    if (view.phase === "complete" && previousView.phase !== "complete") {
      message = view.text.status;
    } else if (view.phase !== previousView.phase) {
      message = view.phase === "intro" ? view.text.instruction : view.text.status;
    } else if (view.notice && view.notice !== previousView.notice) {
      message = view.text.status;
    } else if (action.type === "END_STROKE") {
      message = view.text.status;
    } else if ((action.type === "ADD_TRACE_POINT" || action.type === "BEGIN_TRACE")
      && view.phase === "tracing") {
      const decile = Math.floor(view.tracing.ratioPermille / 100);
      if (decile > lastTraceDecile) message = view.text.status;
      lastTraceDecile = Math.max(lastTraceDecile, decile);
    }

    if (view.phase !== "tracing") lastTraceDecile = 0;
    if (message) announce(message);
  }

  function announce(message) {
    liveMessageSerial += 1;
    const serial = liveMessageSerial;
    elements.liveStatus.textContent = "";
    globalThis.setTimeout(() => {
      if (serial === liveMessageSerial) elements.liveStatus.textContent = message;
    }, 0);
  }

  function moveFocus(previousView, action) {
    if (!previousView) return;
    let target = null;
    if (action.type === "START" || action.type === "CONFIRM_DRAWING") target = elements.surface;
    if (previousView.phase === "writing" && view.phase === "ready") target = elements.confirm;
    if (action.type === "PAUSE") target = elements.stageTitle;
    if (action.type === "RESUME") target = view.phase === "ready" ? elements.confirm : elements.surface;
    if (view.phase === "complete" && previousView.phase !== "complete") {
      target = elements.completionHost.querySelector("#completion-title");
    }
    if (action.type === "RESTART") target = elements.start;
    if (target) globalThis.setTimeout(() => target.focus({ preventScroll: true }), 0);
  }

  function resizeCanvas() {
    if (!canvasAvailable) return;
    const rect = elements.surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pixelRatio = Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    for (const canvas of [elements.fogCanvas, elements.clearCanvas]) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    }
    drawCanvases(0);
  }

  function drawCanvases(timestamp) {
    if (!canvasAvailable) return;
    prepareContext(fogContext, elements.fogCanvas);
    prepareContext(clearContext, elements.clearCanvas);
    drawFogLayer(timestamp);
    drawClearLayer();
  }

  function prepareContext(context, canvas) {
    const scaleX = canvas.width / logic.WINDOW_WIDTH;
    const scaleY = canvas.height / logic.WINDOW_HEIGHT;
    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    context.clearRect(0, 0, logic.WINDOW_WIDTH, logic.WINDOW_HEIGHT);
  }

  function drawFogLayer(timestamp) {
    const phaseAlpha = view.phase === "complete" ? 0.19 : view.phase === "intro" ? 0.9 : 0.82;
    const gradient = fogContext.createLinearGradient(0, 0, logic.WINDOW_WIDTH, logic.WINDOW_HEIGHT);
    gradient.addColorStop(0, `rgba(207, 216, 213, ${phaseAlpha})`);
    gradient.addColorStop(0.52, `rgba(180, 192, 190, ${phaseAlpha * 0.92})`);
    gradient.addColorStop(1, `rgba(142, 153, 151, ${phaseAlpha * 0.88})`);
    fogContext.fillStyle = gradient;
    fogContext.fillRect(0, 0, logic.WINDOW_WIDTH, logic.WINDOW_HEIGHT);

    const breath = reducedMotion.matches ? 0 : Math.sin(timestamp / 1450) * 0.045;
    fogContext.save();
    fogContext.fillStyle = `rgba(244, 235, 221, ${0.14 + breath})`;
    fogContext.strokeStyle = "rgba(68, 84, 88, 0.2)";
    fogContext.lineWidth = 1.4;
    for (let index = 0; index < 84; index += 1) {
      const x = 18 + ((index * 137 + 53) % 965);
      const y = 16 + ((index * 83 + 29) % 585);
      const radius = 2 + ((index * 17) % 7) * 0.72;
      fogContext.beginPath();
      fogContext.ellipse(x, y, radius * 0.64, radius, 0.18, 0, Math.PI * 2);
      fogContext.fill();
      fogContext.stroke();
    }
    fogContext.restore();

    if (view.drawing.strokes.length === 0) return;
    fogContext.save();
    fogContext.globalCompositeOperation = "destination-out";
    fogContext.strokeStyle = "rgba(0, 0, 0, 0.93)";
    fogContext.fillStyle = "rgba(0, 0, 0, 0.93)";
    fogContext.lineWidth = view.phase === "complete" ? 96 : 76;
    fogContext.lineCap = "round";
    fogContext.lineJoin = "round";
    for (const stroke of view.drawing.strokes) drawPath(fogContext, stroke.points, fogContext.lineWidth / 2);
    fogContext.restore();
  }

  function drawClearLayer() {
    if (view.drawing.strokes.length > 0 && view.phase !== "complete") {
      clearContext.save();
      clearContext.strokeStyle = view.phase === "tracing" || view.resumePhase === "tracing"
        ? "rgba(244, 235, 221, 0.3)"
        : "rgba(232, 179, 110, 0.46)";
      clearContext.fillStyle = clearContext.strokeStyle;
      clearContext.lineWidth = view.phase === "tracing" ? 6 : 4;
      clearContext.lineCap = "round";
      clearContext.lineJoin = "round";
      for (const stroke of view.drawing.strokes) drawPath(clearContext, stroke.points, clearContext.lineWidth / 2);
      clearContext.restore();
    }

    if (view.tracing.anchorCount === 0 || view.phase === "complete") return;
    const hits = new Set(view.tracing.hitAnchorIds);
    const anchorsByStroke = new Map();
    for (const anchor of view.tracing.anchors) {
      if (!anchorsByStroke.has(anchor.strokeIndex)) anchorsByStroke.set(anchor.strokeIndex, []);
      anchorsByStroke.get(anchor.strokeIndex).push(anchor);
    }

    clearContext.save();
    clearContext.lineCap = "round";
    clearContext.lineJoin = "round";
    clearContext.lineWidth = 16;
    clearContext.strokeStyle = "rgba(232, 179, 110, 0.72)";
    for (const anchors of anchorsByStroke.values()) {
      for (let index = 1; index < anchors.length; index += 1) {
        const first = anchors[index - 1];
        const second = anchors[index];
        if (!hits.has(first.id) || !hits.has(second.id)) continue;
        clearContext.beginPath();
        clearContext.moveTo(first.x, first.y);
        clearContext.lineTo(second.x, second.y);
        clearContext.stroke();
      }
    }

    for (const anchor of view.tracing.anchors) {
      const hit = hits.has(anchor.id);
      clearContext.beginPath();
      clearContext.arc(anchor.x, anchor.y, hit ? 9 : 7, 0, Math.PI * 2);
      clearContext.fillStyle = hit ? "#e8b36e" : "rgba(11, 23, 32, 0.48)";
      clearContext.fill();
      clearContext.lineWidth = hit ? 3 : 2;
      clearContext.strokeStyle = hit ? "#f4ebdd" : "rgba(244, 235, 221, 0.78)";
      clearContext.stroke();
    }
    clearContext.restore();
  }

  function drawPath(context, points, pointRadius) {
    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, pointRadius, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      context.lineTo(point.x, point.y);
    }
    context.stroke();
  }

  function shouldAnimate() {
    return canvasAvailable && !reducedMotion.matches
      && (view.phase === "writing" || view.phase === "ready" || view.phase === "tracing");
  }

  function syncAnimation() {
    if (!shouldAnimate()) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrameTime = null;
      return;
    }
    if (!animationFrame) animationFrame = requestAnimationFrame(animationStep);
  }

  function animationStep(timestamp) {
    animationFrame = 0;
    if (!shouldAnimate()) {
      previousFrameTime = null;
      return;
    }
    if (previousFrameTime !== null && timestamp - previousFrameTime > logic.MAX_FRAME_GAP_MS) {
      previousFrameTime = null;
      pauseFor("long-frame");
      return;
    }
    previousFrameTime = timestamp;
    drawCanvases(timestamp);
    animationFrame = requestAnimationFrame(animationStep);
  }
})();
