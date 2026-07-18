(function () {
  "use strict";

  const logic = globalThis.MOVING_HOME_TOGETHER_LOGIC;
  const rawConfig = globalThis.MOVING_HOME_TOGETHER_CONFIG || {};
  const root = document.querySelector("#moving-home-app");
  const scene = document.querySelector("#home-scene");
  const sofa = document.querySelector("#sofa");
  const sceneDescription = document.querySelector("#scene-description");
  const phaseHeading = document.querySelector("#phase-heading");
  const phaseMessage = document.querySelector("#phase-message");
  const signature = document.querySelector("#signature");
  const routeStage = document.querySelector("#route-stage");
  const politeStatus = document.querySelector("#polite-status");
  const urgentStatus = document.querySelector("#urgent-status");
  const pads = {
    left: document.querySelector("#left-pad"),
    right: document.querySelector("#right-pad"),
  };

  if (!logic || !root || !scene || !sofa || !phaseHeading || !phaseMessage || !routeStage
    || !politeStatus || !urgentStatus || !pads.left || !pads.right) {
    if (urgentStatus) urgentStatus.textContent = "页面没有完整加载。";
    return;
  }

  const safeConfig = logic.sanitizeMovingHomeConfig(rawConfig);
  const keyboardCodes = new Set();
  const sessionsByPointer = new Map();
  const sessionsBySide = { left: null, right: null };
  const generations = { left: 0, right: 0 };
  const directionVectors = [
    { name: "right", x: 1, y: 0 },
    { name: "down-right", x: 1, y: 1 },
    { name: "down", x: 0, y: 1 },
    { name: "down-left", x: -1, y: 1 },
    { name: "left", x: -1, y: 0 },
    { name: "up-left", x: -1, y: -1 },
    { name: "up", x: 0, y: -1 },
    { name: "up-right", x: 1, y: -1 },
  ];

  let state = logic.createMovingHomeState();
  let view = logic.getMovingHomeView(state, rawConfig);
  let animationFrameId = null;
  let lastFrameTimestamp = null;
  let accumulatorMs = 0;
  let collisionTimer = null;
  let lastCollisionAnnouncementAt = -Infinity;

  installPadArtwork(pads.left, "L");
  installPadArtwork(pads.right, "R");

  root.addEventListener("click", handleActionClick);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointermove", handlePointerMove);
  root.addEventListener("pointerup", handlePointerEnd);
  root.addEventListener("pointercancel", handlePointerEnd);
  root.addEventListener("lostpointercapture", handlePointerEnd, true);
  document.addEventListener("pointerup", handlePointerEnd);
  document.addEventListener("pointercancel", handlePointerEnd);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  globalThis.addEventListener("blur", () => pauseGame("blur", false));

  render(null);

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") {
      clearLocalInputs(false);
      dispatch({ type: "START" }, { focus: "left-pad", resetClock: true });
    }
    if (action === "pause") pauseGame("manual", true);
    if (action === "resume") {
      clearLocalInputs(false);
      dispatch({ type: "RESUME" }, { focus: "left-pad", resetClock: true });
    }
    if (action === "restart") {
      clearLocalInputs(false);
      dispatch({ type: "RESTART" }, { focus: "start", resetClock: true });
    }
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      if (event.repeat || view.phase !== "playing") return;
      event.preventDefault();
      pauseGame("manual", true);
      return;
    }
    if (view.phase !== "playing" || hasModifier(event) || event.isComposing || isEditable(event.target)) return;
    if (event.repeat) {
      if (logic.classifyMovingHomeKey(event.code, "up", false)) event.preventDefault();
      return;
    }
    const action = logic.classifyMovingHomeKey(event.code, "down", event.repeat);
    if (!action) return;
    event.preventDefault();
    if (dispatch(action)) keyboardCodes.add(event.code);
  }

  function handleKeyUp(event) {
    const action = logic.classifyMovingHomeKey(event.code, "up", false);
    if (!action) return;
    const tracked = keyboardCodes.delete(event.code);
    if (!tracked) return;
    event.preventDefault();
    if (view.phase === "playing") dispatch(action);
  }

  function handlePointerDown(event) {
    const pad = event.target.closest(".direction-pad[data-side]");
    if (!pad || view.phase !== "playing") return;
    const side = pad.dataset.side;
    if (sessionsBySide[side] || sessionsByPointer.has(event.pointerId)) return;
    event.preventDefault();
    const generation = generations[side] + 1;
    generations[side] = generation;
    const session = {
      side,
      pad,
      pointerId: event.pointerId,
      generation,
      id: `pointer:${side}:${event.pointerId}:${generation}`,
      startedAt: event.timeStamp,
      vector: null,
    };
    sessionsBySide[side] = session;
    sessionsByPointer.set(event.pointerId, session);
    pad.setAttribute("aria-pressed", "true");
    try {
      pad.setPointerCapture(event.pointerId);
    } catch {
      // Document-level release remains available when capture is unsupported.
    }
    updatePointerSession(session, event);
  }

  function handlePointerMove(event) {
    const session = sessionsByPointer.get(event.pointerId);
    if (!session || event.timeStamp < session.startedAt || view.phase !== "playing") return;
    event.preventDefault();
    updatePointerSession(session, event);
  }

  function handlePointerEnd(event) {
    const session = sessionsByPointer.get(event.pointerId);
    if (!session || event.timeStamp < session.startedAt) return;
    if (event.type === "lostpointercapture" && session.pad.hasPointerCapture(event.pointerId)) return;
    releasePointerSession(session, true);
  }

  function updatePointerSession(session, event) {
    if (sessionsBySide[session.side] !== session) return;
    const rect = session.pad.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance <= radius * 0.18) {
      if (session.vector) dispatch({ type: "RELEASE_INPUT", id: session.id });
      session.vector = null;
      renderPadSession(session.side);
      return;
    }
    const angle = Math.atan2(dy, dx);
    const index = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
    const next = directionVectors[index];
    if (session.vector && session.vector.x === next.x && session.vector.y === next.y) return;
    session.vector = next;
    dispatch({ type: "SET_INPUT", id: session.id, side: session.side, x: next.x, y: next.y });
  }

  function releasePointerSession(session, releaseReducer) {
    if (sessionsBySide[session.side] !== session || sessionsByPointer.get(session.pointerId) !== session) return;
    sessionsBySide[session.side] = null;
    sessionsByPointer.delete(session.pointerId);
    session.pad.setAttribute("aria-pressed", "false");
    session.pad.removeAttribute("data-pointer-direction");
    try {
      if (session.pad.hasPointerCapture(session.pointerId)) session.pad.releasePointerCapture(session.pointerId);
    } catch {
      // The reducer id is still released even if browser capture has already ended.
    }
    if (releaseReducer && view.phase === "playing" && session.vector) {
      dispatch({ type: "RELEASE_INPUT", id: session.id });
    }
    renderPadSession(session.side);
  }

  function clearLocalInputs(releaseReducer) {
    keyboardCodes.clear();
    const sessions = [...sessionsByPointer.values()];
    for (const session of sessions) releasePointerSession(session, releaseReducer);
  }

  function pauseGame(reason, focus) {
    if (view.phase !== "playing") return;
    clearLocalInputs(false);
    dispatch({ type: "PAUSE", reason }, { focus: focus ? "resume" : null, resetClock: true });
  }

  function handleVisibilityChange() {
    if (document.hidden) pauseGame("hidden", false);
  }

  function dispatch(action, options = {}) {
    const previousState = state;
    const previousView = view;
    state = logic.reduceMovingHome(state, action);
    if (state === previousState) return false;
    view = logic.getMovingHomeView(state, rawConfig);
    if (options.resetClock || view.phase !== "playing") stopClock();
    render(previousView);
    if (options.focus) scheduleFocus(options.focus);
    if (view.phase === "playing" && previousView.phase !== "playing") startClock();
    return true;
  }

  function startClock() {
    if (animationFrameId !== null || view.phase !== "playing") return;
    lastFrameTimestamp = null;
    accumulatorMs = 0;
    animationFrameId = globalThis.requestAnimationFrame(frame);
  }

  function stopClock() {
    if (animationFrameId !== null) globalThis.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    lastFrameTimestamp = null;
    accumulatorMs = 0;
  }

  function frame(timestamp) {
    animationFrameId = null;
    if (view.phase !== "playing") return;
    if (lastFrameTimestamp === null) {
      lastFrameTimestamp = timestamp;
      animationFrameId = globalThis.requestAnimationFrame(frame);
      return;
    }
    const gap = Math.max(0, timestamp - lastFrameTimestamp);
    lastFrameTimestamp = timestamp;
    if (gap > logic.MAX_FRAME_GAP_MS) {
      pauseGame("long-frame", false);
      return;
    }
    accumulatorMs += gap;
    const ticks = Math.floor(accumulatorMs / logic.TICK_MS);
    if (ticks > logic.MAX_CATCH_UP_TICKS) {
      pauseGame("long-frame", false);
      return;
    }
    if (ticks > 0) {
      accumulatorMs -= ticks * logic.TICK_MS;
      dispatch({ type: "TICK", count: ticks });
    }
    if (view.phase === "playing") animationFrameId = globalThis.requestAnimationFrame(frame);
  }

  function render(previousView) {
    root.dataset.phase = view.phase;
    renderScene();
    renderStatus();
    renderControls();
    announceChanges(previousView);
    if (previousView && view.collision.serial > previousView.collision.serial) flashCollision();
  }

  function renderScene() {
    const x = finiteNumber(view.pose.centerX, 190);
    const y = finiteNumber(view.pose.centerY, 518);
    const degrees = finiteNumber(view.pose.angleDegrees, 0);
    sofa.setAttribute("transform", `translate(${x} ${y}) rotate(${degrees})`);
    sofa.dataset.x = String(x);
    sofa.dataset.y = String(y);
    sofa.dataset.angle = String(view.pose.angleIndex);
    scene.dataset.routeStage = String(view.route.stage);
    scene.querySelector("[data-goal]")?.setAttribute("data-inside", String(Boolean(view.goal.inside)));
    scene.querySelectorAll("[data-route-pin]").forEach((pin) => {
      const stage = Number(pin.dataset.routePin);
      pin.dataset.reached = String(view.phase === "complete" || stage < view.route.stage);
    });
    if (sceneDescription) {
      sceneDescription.textContent = `沙发位于${view.route.title}，${view.pose.directionLabel}。${view.statusText}`;
    }
  }

  function renderStatus() {
    routeStage.textContent = view.route.title;
    signature.textContent = "";
    if (view.phase === "intro") {
      phaseHeading.textContent = view.subtitle;
      phaseMessage.textContent = safeConfig.intro;
      return;
    }
    if (view.phase === "playing") {
      phaseHeading.textContent = view.route.instruction;
      phaseMessage.textContent = view.statusText === view.route.instruction ? "" : view.statusText;
      return;
    }
    if (view.phase === "paused") {
      phaseHeading.textContent = view.subtitle;
      phaseMessage.textContent = view.statusText;
      return;
    }
    phaseHeading.textContent = view.finalTitle;
    phaseMessage.textContent = composeFinalMessage();
    signature.textContent = view.signature;
  }

  function renderControls() {
    document.querySelector("#left-title").textContent = view.names.left;
    document.querySelector("#right-title").textContent = view.names.right;
    for (const side of ["left", "right"]) {
      const pad = pads[side];
      const intent = view.intents[side];
      const label = `${view.names[side]}：${intent.label}`;
      pad.disabled = view.phase !== "playing";
      pad.setAttribute("aria-label", `${label}，${side === "left" ? "WASD" : "方向键"}或拖动控制盘`);
      document.querySelector(`#${side}-direction`).textContent = label;
      pad.querySelectorAll("[data-direction]").forEach((sector) => {
        sector.dataset.active = String(sector.dataset.direction === vectorName(intent.x, intent.y));
      });
      renderPadSession(side);
    }
  }

  function renderPadSession(side) {
    const pad = pads[side];
    const session = sessionsBySide[side];
    pad.setAttribute("aria-pressed", String(Boolean(session)));
    if (session?.vector) pad.dataset.pointerDirection = session.vector.name;
    else pad.removeAttribute("data-pointer-direction");
  }

  function flashCollision() {
    if (collisionTimer !== null) globalThis.clearTimeout(collisionTimer);
    scene.dataset.collision = "true";
    scene.querySelectorAll("[data-obstacle]").forEach((obstacle) => {
      obstacle.dataset.hit = String(obstacle.dataset.obstacle === view.collision.obstacleId);
    });
    collisionTimer = globalThis.setTimeout(() => {
      scene.dataset.collision = "false";
      scene.querySelectorAll("[data-obstacle]").forEach((obstacle) => { obstacle.dataset.hit = "false"; });
      collisionTimer = null;
    }, 180);
  }

  function announceChanges(previousView) {
    if (!previousView) return;
    if (previousView.phase === "intro" && view.phase === "playing") announce(politeStatus, "开始一起搬。");
    if (view.route.stage > previousView.route.stage) announce(politeStatus, view.route.instruction);
    if (view.collision.serial > previousView.collision.serial) {
      const now = globalThis.performance.now();
      if (now - lastCollisionAnnouncementAt >= 900) {
        lastCollisionAnnouncementAt = now;
        announce(politeStatus, "碰到边了，先回一点，再一起转。");
      }
    }
    if (previousView.phase !== "paused" && view.phase === "paused") announce(urgentStatus, view.statusText);
    if (previousView.phase !== "complete" && view.phase === "complete") {
      announce(urgentStatus, `${view.finalTitle}。${composeFinalMessage()}`);
      scheduleFocus("restart");
    }
  }

  function composeFinalMessage() {
    const fallback = view.finalMessage;
    const composer = rawConfig.composeMovingHomeMessage;
    let result = fallback;
    if (typeof composer === "function") {
      try {
        const candidate = composer(view);
        if (typeof candidate === "string" && candidate.trim()) result = candidate.trim();
      } catch {
        result = fallback;
      }
    }
    if (result.startsWith(view.finalTitle)) {
      const withoutTitle = result.slice(view.finalTitle.length).replace(/^[。！？!?\s]+/, "");
      if (withoutTitle) return withoutTitle;
    }
    return result;
  }

  function announce(target, message) {
    target.textContent = "";
    globalThis.setTimeout(() => { target.textContent = message; }, 20);
  }

  function scheduleFocus(kind) {
    globalThis.requestAnimationFrame(() => {
      if (document.hidden || !document.hasFocus()) return;
      let target = null;
      if (kind === "left-pad") target = pads.left;
      if (kind === "start") target = root.querySelector("[data-action='start']");
      if (kind === "resume") target = root.querySelector("[data-action='resume']");
      if (kind === "restart") target = root.querySelector("[data-action='restart']");
      target?.focus({ preventScroll: true });
    });
  }

  function installPadArtwork(pad, mark) {
    const svg = svgNode("svg", { viewBox: "0 0 160 160", "aria-hidden": "true" });
    const names = ["up", "up-right", "right", "down-right", "down", "down-left", "left", "up-left"];
    names.forEach((name, index) => {
      const group = svgNode("g", {
        class: "pad-sector",
        "data-direction": name,
        "data-active": "false",
        transform: `rotate(${index * 45} 80 80)`,
      });
      group.append(
        svgNode("path", { d: "M80 78 48 13A72 72 0 0 1 112 13Z" }),
        svgNode("path", { class: "pad-arrow", d: "M80 57V28m-11 12 11-12 11 12" }),
      );
      svg.append(group);
    });
    svg.append(
      svgNode("circle", { class: "pad-center", cx: 80, cy: 80, r: 27 }),
      svgNode("circle", { class: "pad-center-dot", cx: 80, cy: 80, r: 16 }),
      svgText(mark),
    );
    pad.append(svg);
  }

  function svgText(value) {
    const text = svgNode("text", {
      x: 80,
      y: 88,
      "text-anchor": "middle",
      fill: "currentColor",
      "font-family": "system-ui, sans-serif",
      "font-size": 20,
      "font-weight": 800,
    });
    text.textContent = value;
    return text;
  }

  function svgNode(tagName, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    return node;
  }

  function vectorName(x, y) {
    const match = directionVectors.find((item) => item.x === x && item.y === y);
    return match ? match.name : "none";
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }
})();
