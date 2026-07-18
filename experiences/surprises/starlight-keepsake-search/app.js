(function () {
  "use strict";

  const logic = globalThis.STARLIGHT_KEEPSAKE_SEARCH_LOGIC;
  const rawConfig = globalThis.STARLIGHT_KEEPSAKE_SEARCH_CONFIG;
  const root = document.getElementById("keepsake-app");
  if (!root) return;

  const elements = {
    pageTitle: document.getElementById("page-title"),
    subtitle: document.querySelector(".subtitle"),
    instruction: document.getElementById("instruction"),
    visibleStatus: document.getElementById("visible-status"),
    completionHost: document.getElementById("completion-host"),
    stage: document.getElementById("night-stage"),
    image: document.getElementById("night-image"),
    veilCanvas: document.getElementById("veil-canvas"),
    lightCanvas: document.getElementById("light-canvas"),
    fallback: document.getElementById("canvas-fallback"),
    forcedLight: document.getElementById("forced-light"),
    forcedTargets: document.getElementById("forced-targets"),
    actions: document.getElementById("actions"),
    start: document.querySelector('[data-action="start"]'),
    pause: document.querySelector('[data-action="pause"]'),
    resume: document.querySelector('[data-action="resume"]'),
    direct: document.querySelector('[data-action="direct"]'),
    foundTitle: document.getElementById("found-title"),
    progressCopy: document.getElementById("progress-copy"),
    progressDots: document.getElementById("progress-dots"),
    foundList: document.getElementById("found-list"),
    liveStatus: document.getElementById("live-status"),
  };

  if (!logic || typeof logic.createStarlightState !== "function"
    || typeof logic.reduceStarlight !== "function"
    || typeof logic.getStarlightView !== "function"
    || typeof logic.sanitizeStarlightConfig !== "function") {
    elements.fallback.hidden = false;
    elements.fallback.textContent = "页面逻辑没有完整载入，请确认 logic.js 与 index.html 放在同一目录后再打开。";
    elements.visibleStatus.textContent = "当前无法开始寻找。";
    for (const button of elements.actions.querySelectorAll("button")) button.hidden = true;
    return;
  }

  const config = logic.sanitizeStarlightConfig(rawConfig);
  let state = logic.createStarlightState();
  let view = logic.getStarlightView(state, config);
  let pointerSession = null;
  let veilContext = null;
  let lightContext = null;
  let canvasAvailable = true;
  let backgroundAvailable = false;
  let animationFrame = 0;
  let insideAnimationFrame = false;
  let lastFrameTime = null;
  let tickAccumulator = 0;
  let liveMessageSerial = 0;
  let renderedItemIds = "";
  let resizeObserver = null;
  const localHeldKeys = new Set();

  const reducedMotion = globalThis.matchMedia
    ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  initializeCopy();
  initializeCanvas();
  initializeImage();
  initializeForcedTargets();
  installEvents();
  render(null, { type: "INITIALIZE" });

  function initializeCopy() {
    document.title = config.title;
    elements.pageTitle.textContent = config.title;
    elements.subtitle.textContent = config.subtitle;
    elements.start.textContent = config.startButton;
    elements.pause.textContent = config.pauseButton;
    elements.resume.textContent = config.resumeButton;
    elements.direct.textContent = config.directButton;
    elements.foundTitle.textContent = config.foundTitle;
    elements.visibleStatus.tabIndex = -1;
  }

  function initializeImage() {
    const imageLoaded = () => {
      backgroundAvailable = true;
      elements.image.hidden = false;
      root.classList.remove("has-background-fallback");
      drawCanvases(0);
    };
    const imageFailed = () => {
      backgroundAvailable = false;
      elements.image.hidden = true;
      root.classList.add("has-background-fallback");
      drawCanvases(0);
    };
    elements.image.addEventListener("load", imageLoaded);
    elements.image.addEventListener("error", imageFailed);
    if (elements.image.complete) {
      if (elements.image.naturalWidth > 0) imageLoaded();
      else imageFailed();
    }
  }

  function initializeCanvas() {
    try {
      veilContext = elements.veilCanvas.getContext("2d");
      lightContext = elements.lightCanvas.getContext("2d");
      canvasAvailable = Boolean(veilContext && lightContext);
    } catch {
      canvasAvailable = false;
    }
    if (!canvasAvailable) {
      elements.fallback.hidden = false;
      elements.stage.classList.add("is-unavailable");
      return;
    }
    resizeCanvas();
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(elements.stage);
    } else {
      globalThis.addEventListener("resize", resizeCanvas, { passive: true });
    }
  }

  function initializeForcedTargets() {
    for (let index = 0; index < view.discovery.targets.length; index += 1) {
      const target = view.discovery.targets[index];
      const marker = document.createElement("i");
      marker.dataset.targetId = target.id;
      marker.textContent = String(index + 1);
      marker.style.left = `${target.x / 10}%`;
      marker.style.top = `${(target.y * 100) / logic.WORLD_HEIGHT}%`;
      elements.forcedTargets.append(marker);
    }
  }

  function installEvents() {
    elements.actions.addEventListener("click", handleControlClick);
    elements.stage.addEventListener("pointerenter", handlePointerEnter);
    elements.stage.addEventListener("pointerdown", handlePointerDown);
    elements.stage.addEventListener("pointermove", handlePointerMove);
    elements.stage.addEventListener("pointerleave", handlePointerLeave);
    elements.stage.addEventListener("pointerup", handlePointerUp);
    elements.stage.addEventListener("pointercancel", handlePointerCancel);
    elements.stage.addEventListener("lostpointercapture", handleLostPointerCapture);
    elements.stage.addEventListener("keydown", handleStageKeyDown);
    document.addEventListener("keyup", handleDocumentKeyUp);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("keydown", handleEscape);
    globalThis.addEventListener("blur", () => pauseFor("blur"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") pauseFor("hidden");
    });
    globalThis.addEventListener("pagehide", stopLocalActivity);

    const motionChanged = () => drawCanvases(0);
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", motionChanged);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(motionChanged);
    }
  }

  function handleControlClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || button.hidden || button.disabled) return;
    if (button.dataset.action === "start") {
      dispatch({ type: "START" });
      return;
    }
    if (button.dataset.action === "pause") {
      pauseFor("manual");
      return;
    }
    if (button.dataset.action === "resume") {
      dispatch({ type: "RESUME" });
      return;
    }
    if (button.dataset.action === "direct") revealDirectly();
  }

  function handlePointerEnter(event) {
    if (event.pointerType !== "mouse") return;
    beginPointerSession(event);
  }

  function handlePointerDown(event) {
    if (event.pointerType === "mouse") {
      elements.stage.focus({ preventScroll: true });
      return;
    }
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    beginPointerSession(event);
  }

  function beginPointerSession(event) {
    if (!canvasAvailable || !view.canSearch || pointerSession !== null || view.activePointer !== null) return;
    if (!Number.isSafeInteger(event.pointerId) || event.pointerId < 0 || view.nextGeneration === null) return;
    if (event.pointerType !== "mouse" && event.pointerType !== "touch" && event.pointerType !== "pen") return;
    const point = eventToWorldPoint(event);
    if (!point) return;
    const generation = view.nextGeneration;
    dispatch({
      type: "BEGIN_POINTER",
      pointerId: event.pointerId,
      generation,
      pointerType: event.pointerType,
      x: point.x,
      y: point.y,
    });
    if (!view.activePointer || view.activePointer.pointerId !== event.pointerId
      || view.activePointer.generation !== generation
      || view.activePointer.pointerType !== event.pointerType) return;

    localHeldKeys.clear();
    pointerSession = {
      pointerId: event.pointerId,
      generation,
      pointerType: event.pointerType,
      startedAt: finiteTimestamp(event.timeStamp),
      captured: false,
    };
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      event.preventDefault();
      try {
        elements.stage.setPointerCapture(event.pointerId);
        pointerSession.captured = elements.stage.hasPointerCapture(event.pointerId);
      } catch {
        // Document pointerup/pointercancel remains the fallback when capture fails.
      }
    }
  }

  function handlePointerMove(event) {
    if (event.pointerType === "mouse" && pointerSession === null) beginPointerSession(event);
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId) return;
    event.preventDefault();
    for (const sample of coalescedSamples(event)) {
      if (pointerSession !== session) break;
      const point = eventToWorldPoint(sample);
      if (!point) continue;
      dispatch({
        type: "MOVE_POINTER",
        pointerId: session.pointerId,
        generation: session.generation,
        x: point.x,
        y: point.y,
      });
    }
  }

  function handlePointerLeave(event) {
    const session = pointerSession;
    if (!session || session.pointerType !== "mouse" || event.pointerId !== session.pointerId) return;
    finishPointerSession(event, "leave");
  }

  function handlePointerUp(event) {
    const session = pointerSession;
    if (!session || session.pointerType === "mouse") return;
    finishPointerSession(event, "up");
  }

  function handlePointerCancel(event) {
    finishPointerSession(event, "cancel");
  }

  function handleLostPointerCapture(event) {
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId || !session.captured) return;
    if (eventIsOlderThanSession(event, session)) return;
    try {
      if (elements.stage.hasPointerCapture(event.pointerId)) return;
    } catch {
      // Timestamp and generation still protect the active adapter session.
    }
    finishPointerSession(event, "lost-capture");
  }

  function finishPointerSession(event, reason) {
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId || eventIsOlderThanSession(event, session)) return;
    pointerSession = null;
    dispatch({
      type: "END_POINTER",
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
      || finiteTimestamp(last.timeStamp) !== finiteTimestamp(event.timeStamp)) samples.push(event);
    return samples;
  }

  function handleStageKeyDown(event) {
    if (!view.canSearch) return;
    if (event.code === "Home") {
      event.preventDefault();
      abandonPointerAdapter();
      localHeldKeys.clear();
      dispatch({ type: "CENTER_LIGHT" });
      return;
    }
    if (!logic.HELD_KEY_ORDER.includes(event.code)) return;
    event.preventDefault();
    if (event.repeat || localHeldKeys.has(event.code)) return;
    abandonPointerAdapter();
    localHeldKeys.add(event.code);
    dispatch({ type: "SET_KEY", code: event.code, pressed: true });
  }

  function handleDocumentKeyUp(event) {
    if (!logic.HELD_KEY_ORDER.includes(event.code) || !localHeldKeys.has(event.code)) return;
    localHeldKeys.delete(event.code);
    if (view.canSearch) dispatch({ type: "SET_KEY", code: event.code, pressed: false });
  }

  function handleEscape(event) {
    if (event.code !== "Escape" || event.repeat || !view.canPause) return;
    event.preventDefault();
    pauseFor("escape");
  }

  function eventToWorldPoint(event) {
    const rect = elements.stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0
      || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    return {
      x: clampInteger(Math.round(((event.clientX - rect.left) * logic.WORLD_WIDTH) / rect.width), 0, logic.WORLD_WIDTH),
      y: clampInteger(Math.round(((event.clientY - rect.top) * logic.WORLD_HEIGHT) / rect.height), 0, logic.WORLD_HEIGHT),
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
    abandonAllInputAdapters();
    dispatch({ type: "DIRECT_REVEAL" });
  }

  function pauseFor(reason) {
    if (!view.canPause) return;
    abandonAllInputAdapters();
    dispatch({ type: "PAUSE", reason });
  }

  function abandonAllInputAdapters() {
    abandonPointerAdapter();
    localHeldKeys.clear();
  }

  function abandonPointerAdapter() {
    const session = pointerSession;
    pointerSession = null;
    if (session) releaseCapturedPointer(session.pointerId);
  }

  function releaseCapturedPointer(pointerId) {
    try {
      if (elements.stage.hasPointerCapture(pointerId)) elements.stage.releasePointerCapture(pointerId);
    } catch {
      // Already released or detached pointers need no further adapter work.
    }
  }

  function stopLocalActivity() {
    abandonAllInputAdapters();
    resetClock();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function dispatch(action) {
    const previousView = view;
    const nextState = logic.reduceStarlight(state, action);
    if (nextState === state) return false;
    state = nextState;
    view = logic.getStarlightView(state, config);
    synchronizeClock(previousView, action);
    synchronizeInputAdapters();
    render(previousView, action);
    return true;
  }

  function synchronizeClock(previousView, action) {
    const focusChanged = previousView.focus.targetId !== view.focus.targetId;
    const modeChanged = previousView.light.controlMode !== view.light.controlMode;
    const discoveryChanged = previousView.discovery.count !== view.discovery.count;
    const phaseChanged = previousView.phase !== view.phase;
    const explicitReset = [
      "START", "END_POINTER", "CENTER_LIGHT", "DIRECT_REVEAL", "PAUSE", "RESUME", "RESTART",
    ].includes(action.type);
    if (focusChanged || modeChanged || discoveryChanged || phaseChanged || explicitReset) resetClock();
  }

  function synchronizeInputAdapters() {
    if (!view.activePointer && pointerSession) abandonPointerAdapter();
    if (view.light.controlMode !== "keyboard") localHeldKeys.clear();
  }

  function resetClock() {
    tickAccumulator = 0;
    lastFrameTime = null;
  }

  function render(previousView, action) {
    root.dataset.phase = view.phase;
    renderCopy();
    renderControls();
    renderProgress();
    renderFoundItems();
    renderCompletion();
    renderStageState();
    drawCanvases(0);
    announceMeaningfulChange(previousView);
    moveFocus(previousView, action);
    syncAnimation();
  }

  function renderCopy() {
    const complete = view.phase === "complete";
    elements.subtitle.hidden = complete;
    elements.instruction.hidden = complete;
    elements.visibleStatus.hidden = complete;
    elements.instruction.textContent = view.text.instruction;
    elements.visibleStatus.textContent = view.text.status;
  }

  function renderControls() {
    elements.actions.hidden = view.phase === "complete";
    elements.start.hidden = !canvasAvailable || !view.canStart;
    elements.pause.hidden = !canvasAvailable || !view.canPause;
    elements.resume.hidden = !canvasAvailable || !view.canResume;
    elements.direct.hidden = !view.canDirectReveal;
    elements.direct.classList.toggle("button-primary", !canvasAvailable);
  }

  function renderProgress() {
    const visibleCount = view.phase === "complete"
      ? view.discovery.revealedItems.length
      : view.discovery.count;
    elements.progressCopy.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = String(visibleCount);
    elements.progressCopy.append(strong, ` / ${view.discovery.total}`);
    const dots = Array.from(elements.progressDots.children);
    for (let index = 0; index < dots.length; index += 1) {
      dots[index].classList.toggle("is-lit", index < visibleCount);
    }
  }

  function renderFoundItems() {
    const items = view.phase === "complete"
      ? view.discovery.revealedItems
      : view.discovery.foundItems;
    const nextIds = items.map((item) => item.id).join(",");
    if (nextIds === renderedItemIds) return;
    const existing = new Map(Array.from(elements.foundList.children)
      .map((node) => [node.dataset.keepsakeId, node]));
    const ordered = [];
    for (const item of items) {
      let node = existing.get(item.id);
      if (!node) node = createFoundItem(item);
      ordered.push(node);
    }
    elements.foundList.replaceChildren(...ordered);
    renderedItemIds = nextIds;
  }

  function createFoundItem(item) {
    const entry = document.createElement("li");
    entry.className = "found-item";
    entry.dataset.keepsakeId = item.id;
    const title = document.createElement("h3");
    title.textContent = item.label;
    const note = document.createElement("p");
    note.textContent = item.note;
    entry.append(title, note);
    return entry;
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
    restart.type = "button";
    restart.className = "button button-primary";
    restart.dataset.action = "restart";
    restart.textContent = config.restartButton;
    restart.addEventListener("click", () => {
      abandonAllInputAdapters();
      dispatch({ type: "RESTART" });
    });
    const portfolio = document.createElement("a");
    portfolio.className = "portfolio-link";
    portfolio.href = "../../../index.html";
    portfolio.textContent = "回到作品集";
    actions.append(restart, portfolio);
    article.append(title, message, signature, actions);
    elements.completionHost.append(article);
  }

  function renderStageState() {
    const searchable = canvasAvailable && view.canSearch;
    elements.stage.classList.toggle("is-idle", !searchable);
    elements.stage.classList.toggle("is-unavailable", !canvasAvailable);
    elements.stage.classList.toggle("is-complete", view.phase === "complete");
    elements.stage.setAttribute("aria-disabled", searchable ? "false" : "true");
    elements.fallback.hidden = canvasAvailable || view.phase === "complete";
    elements.forcedLight.style.left = `${view.light.x / 10}%`;
    elements.forcedLight.style.top = `${(view.light.y * 100) / logic.WORLD_HEIGHT}%`;
    elements.forcedLight.classList.toggle("is-engaged", view.light.engaged);
    const markerById = new Map(Array.from(elements.forcedTargets.children)
      .map((node) => [node.dataset.targetId, node]));
    for (const target of view.discovery.targets) {
      const marker = markerById.get(target.id);
      marker.classList.toggle("is-found", target.found || view.phase === "complete");
      marker.classList.toggle("is-focused", target.id === view.focus.targetId);
    }
  }

  function announceMeaningfulChange(previousView) {
    if (!previousView) {
      announce(view.text.intro);
      return;
    }
    if (view.phase !== previousView.phase
      || view.discovery.count !== previousView.discovery.count
      || view.notice !== previousView.notice) {
      announce(view.notice || view.text.status);
    }
  }

  function announce(message) {
    if (!message) return;
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
    if (action.type === "START" || action.type === "RESUME") target = elements.stage;
    if (action.type === "PAUSE") target = elements.visibleStatus;
    if (view.phase === "complete" && previousView.phase !== "complete") {
      target = elements.completionHost.querySelector("#completion-title");
    }
    if (action.type === "RESTART") target = elements.start;
    if (target) globalThis.setTimeout(() => target.focus({ preventScroll: true }), 0);
  }

  function resizeCanvas() {
    if (!canvasAvailable) return;
    const rect = elements.stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pixelRatio = Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    for (const canvas of [elements.veilCanvas, elements.lightCanvas]) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    }
    drawCanvases(0);
  }

  function drawCanvases(timestamp) {
    if (!canvasAvailable) return;
    try {
      prepareContext(veilContext, elements.veilCanvas);
      prepareContext(lightContext, elements.lightCanvas);
      drawVeil(timestamp);
      drawLightProjection(timestamp);
    } catch {
      disableCanvas();
    }
  }

  function prepareContext(context, canvas) {
    context.setTransform(canvas.width / logic.WORLD_WIDTH, 0, 0,
      canvas.height / logic.WORLD_HEIGHT, 0, 0);
    context.clearRect(0, 0, logic.WORLD_WIDTH, logic.WORLD_HEIGHT);
  }

  function drawVeil(timestamp) {
    if (view.phase === "complete") return;
    veilContext.fillStyle = "rgba(5, 8, 18, 0.76)";
    veilContext.fillRect(0, 0, logic.WORLD_WIDTH, logic.WORLD_HEIGHT);
    veilContext.save();
    veilContext.globalCompositeOperation = "destination-out";
    for (const target of view.discovery.targets) {
      if (target.found) cutLight(veilContext, target.x, target.y, target.radius + 54, 0.68);
    }
    const activeStrength = view.light.engaged ? 0.97 : 0.36;
    const breathing = reducedMotion.matches ? 0 : Math.sin(timestamp / 1200) * 4;
    cutLight(veilContext, view.light.x, view.light.y, 142 + breathing, activeStrength);
    veilContext.restore();
  }

  function cutLight(context, x, y, radius, strength) {
    const gradient = context.createRadialGradient(x, y, 12, x, y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    gradient.addColorStop(0.48, `rgba(0, 0, 0, ${strength * 0.78})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawLightProjection(timestamp) {
    if (!backgroundAvailable) drawAnonymousFallbackTargets();
    if (view.phase === "complete") {
      lightContext.fillStyle = "rgba(240, 189, 114, 0.12)";
      lightContext.fillRect(0, 0, logic.WORLD_WIDTH, logic.WORLD_HEIGHT);
    }

    const revealed = view.phase === "complete";
    for (let index = 0; index < view.discovery.targets.length; index += 1) {
      const target = view.discovery.targets[index];
      if (target.found || revealed) drawTargetMarker(target, index + 1, revealed);
    }

    if (view.phase !== "complete") drawMovableLight(timestamp);
    if (view.focus.targetId !== null) drawFocusRing();
  }

  function drawAnonymousFallbackTargets() {
    lightContext.save();
    lightContext.strokeStyle = "rgba(243, 231, 208, 0.38)";
    lightContext.fillStyle = "rgba(243, 231, 208, 0.72)";
    lightContext.lineWidth = 3;
    lightContext.font = "22px system-ui";
    lightContext.textAlign = "center";
    lightContext.textBaseline = "middle";
    for (let index = 0; index < view.discovery.targets.length; index += 1) {
      const target = view.discovery.targets[index];
      lightContext.beginPath();
      lightContext.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      lightContext.stroke();
      lightContext.fillText(String(index + 1), target.x, target.y);
    }
    lightContext.restore();
  }

  function drawTargetMarker(target, number, complete) {
    lightContext.save();
    const glow = lightContext.createRadialGradient(target.x, target.y, 4,
      target.x, target.y, target.radius + 44);
    glow.addColorStop(0, complete ? "rgba(255, 209, 138, 0.3)" : "rgba(240, 189, 114, 0.2)");
    glow.addColorStop(1, "rgba(240, 189, 114, 0)");
    lightContext.fillStyle = glow;
    lightContext.beginPath();
    lightContext.arc(target.x, target.y, target.radius + 44, 0, Math.PI * 2);
    lightContext.fill();
    lightContext.strokeStyle = "rgba(255, 209, 138, 0.92)";
    lightContext.lineWidth = 4;
    lightContext.beginPath();
    lightContext.arc(target.x, target.y, 13, 0, Math.PI * 2);
    lightContext.stroke();
    lightContext.fillStyle = "#ffd18a";
    lightContext.font = "18px system-ui";
    lightContext.textAlign = "center";
    lightContext.textBaseline = "middle";
    lightContext.fillText(String(number), target.x, target.y);
    lightContext.restore();
  }

  function drawMovableLight(timestamp) {
    const radius = 42;
    const breath = reducedMotion.matches ? 0 : Math.sin(timestamp / 900) * 0.05;
    lightContext.save();
    const glow = lightContext.createRadialGradient(view.light.x, view.light.y, 2,
      view.light.x, view.light.y, 92);
    glow.addColorStop(0, `rgba(255, 209, 138, ${0.5 + breath})`);
    glow.addColorStop(1, "rgba(240, 189, 114, 0)");
    lightContext.fillStyle = glow;
    lightContext.beginPath();
    lightContext.arc(view.light.x, view.light.y, 92, 0, Math.PI * 2);
    lightContext.fill();
    lightContext.strokeStyle = view.light.engaged
      ? "rgba(255, 225, 168, 0.94)"
      : "rgba(243, 231, 208, 0.48)";
    lightContext.lineWidth = 4;
    lightContext.beginPath();
    lightContext.arc(view.light.x, view.light.y, radius, 0, Math.PI * 2);
    lightContext.stroke();
    lightContext.restore();
  }

  function drawFocusRing() {
    const start = -Math.PI / 2;
    const end = start + (Math.PI * 2 * view.focus.permille) / 1000;
    lightContext.save();
    lightContext.lineWidth = 9;
    lightContext.strokeStyle = "rgba(243, 231, 208, 0.3)";
    lightContext.beginPath();
    lightContext.arc(view.light.x, view.light.y, 54, 0, Math.PI * 2);
    lightContext.stroke();
    if (view.focus.permille > 0) {
      lightContext.strokeStyle = "#ffd18a";
      lightContext.beginPath();
      lightContext.arc(view.light.x, view.light.y, 54, start, end);
      lightContext.stroke();
    }
    lightContext.fillStyle = "#f3e7d0";
    lightContext.font = "22px system-ui";
    lightContext.textAlign = "center";
    lightContext.textBaseline = "middle";
    lightContext.fillText(`${Math.floor(view.focus.permille / 10)}%`, view.light.x, view.light.y);
    lightContext.restore();
  }

  function disableCanvas() {
    canvasAvailable = false;
    abandonAllInputAdapters();
    resetClock();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    elements.stage.classList.add("is-unavailable");
    elements.fallback.hidden = false;
    renderControls();
    renderStageState();
  }

  function shouldAnimate() {
    return canvasAvailable && view.phase === "searching";
  }

  function syncAnimation() {
    if (insideAnimationFrame) return;
    if (!shouldAnimate()) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      resetClock();
      return;
    }
    if (!animationFrame) animationFrame = requestAnimationFrame(animationStep);
  }

  function animationStep(timestamp) {
    animationFrame = 0;
    if (!shouldAnimate()) {
      resetClock();
      return;
    }
    insideAnimationFrame = true;
    if (lastFrameTime === null) {
      lastFrameTime = timestamp;
    } else {
      const delta = timestamp - lastFrameTime;
      lastFrameTime = timestamp;
      if (delta > logic.MAX_FRAME_GAP_MS) {
        resetClock();
        pauseFor("long-frame");
        insideAnimationFrame = false;
        return;
      }
      if (view.light.engaged) {
        tickAccumulator += delta;
        const ticks = Math.min(logic.MAX_TICKS_PER_ACTION,
          Math.floor(tickAccumulator / logic.TICK_MS));
        if (ticks > 0) {
          tickAccumulator -= ticks * logic.TICK_MS;
          dispatch({ type: "TICK", ticks });
        }
      } else {
        tickAccumulator = 0;
      }
    }
    if (!reducedMotion.matches) drawCanvases(timestamp);
    insideAnimationFrame = false;
    if (shouldAnimate()) animationFrame = requestAnimationFrame(animationStep);
  }
})();
