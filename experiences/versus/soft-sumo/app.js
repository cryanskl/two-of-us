(function () {
  "use strict";

  const logic = globalThis.SoftSumoLogic;
  const configApi = globalThis.SoftSumoConfig || {};
  const required = [
    "sanitizeConfig", "createInitialState", "reduceSoftSumo", "getSoftSumoView",
  ];
  const root = document.getElementById("soft-sumo-app");
  if (!root) return;

  const elements = {
    title: document.getElementById("game-title"),
    subtitle: document.getElementById("game-subtitle"),
    rule: document.getElementById("game-rule"),
    localOnly: document.getElementById("local-only"),
    names: [document.getElementById("player-name-0"), document.getElementById("player-name-1")],
    scores: [document.getElementById("score-0"), document.getElementById("score-1")],
    round: document.getElementById("round-label"),
    arenaHeading: document.getElementById("arena-heading"),
    arena: document.getElementById("arena-frame"),
    arenaRing: document.getElementById("arena-ring"),
    tokens: [document.getElementById("token-0"), document.getElementById("token-1")],
    phaseLayer: document.getElementById("phase-layer"),
    controls: document.getElementById("controls-host"),
    pause: document.getElementById("pause-button"),
    status: document.getElementById("match-status"),
    live: document.getElementById("live-region"),
  };

  if (!logic || required.some((name) => typeof logic[name] !== "function")) {
    elements.phaseLayer.textContent = "比赛逻辑没有完整载入，请确认 config.js、logic.js 与 app.js 在同一目录。";
    return;
  }

  const rawConfig = configApi.DEFAULT_CONFIG || configApi;
  const safeConfig = logic.sanitizeConfig(rawConfig, configApi.composeMatchNote);
  const tickMs = 1000 / (Number(logic.TICK_RATE) || 60);
  const maxCatchUp = Number(logic.RULES?.MAX_CATCH_UP_TICKS) || 5;
  const maxFrameGap = Number(logic.RULES?.MAX_FRAME_GAP_MS) || 500;
  const arenaStartRadius = Number(logic.RULES?.ARENA_START_RADIUS) || 430;
  const gameCodes = new Set(["KeyA", "KeyW", "KeyD", "ArrowLeft", "ArrowUp", "ArrowRight"]);
  const heldCodes = new Set();
  const pointerById = new Map();
  const pointerByButton = new Map();
  const pointerControls = [createHeldControls(), createHeldControls()];
  const buttonPulse = [createPulse(), createPulse()];
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") || { matches: false };

  let state = logic.createInitialState(safeConfig);
  let view = logic.getSoftSumoView(state);
  let lastFrameTime = null;
  let accumulatorMs = 0;
  let frameRequest = 0;
  let disposed = false;
  let lastPhase = null;
  let lastCountdown = null;
  let lastInputMode = "keyboard";

  root.addEventListener("click", handleClick);
  root.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("pointerup", releasePointer);
  document.addEventListener("pointercancel", cancelPointer);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  globalThis.addEventListener("blur", () => safePause("blur"));
  globalThis.addEventListener("pagehide", dispose);

  preloadAsset("assets/arena-background.webp", "has-arena-image");
  preloadAsset("assets/token-atlas.webp", "has-token-atlas");
  render(true);
  frameRequest = globalThis.requestAnimationFrame(runFrame);

  function createHeldControls() {
    return { left: new Set(), charge: new Set(), right: new Set() };
  }

  function createPulse() {
    return { turn: 0, chargeTicks: 0 };
  }

  function handleClick(event) {
    const actionButton = event.target.closest("button[data-action]");
    if (actionButton && !actionButton.disabled) {
      const actionMap = {
        start: "START",
        pause: "PAUSE",
        resume: "RESUME",
        next: "NEXT_ROUND",
        restart: "RESTART",
      };
      const type = actionMap[actionButton.dataset.action];
      if (!type) return;
      if (type === "PAUSE") dispatch({ type, reason: "manual" });
      else dispatch({ type });
      return;
    }

    const control = event.target.closest("button[data-seat][data-control]");
    if (!control || control.disabled || event.detail !== 0 || view.phase !== "playing") return;
    lastInputMode = "keyboard";
    const seat = Number(control.dataset.seat);
    const kind = control.dataset.control;
    if (kind === "left") buttonPulse[seat].turn = -1;
    if (kind === "right") buttonPulse[seat].turn = 1;
    if (kind === "charge") buttonPulse[seat].chargeTicks = 1;
  }

  function handleKeyDown(event) {
    if (!gameCodes.has(event.code) || (view.phase !== "countdown" && view.phase !== "playing")) return;
    event.preventDefault();
    lastInputMode = "keyboard";
    heldCodes.add(event.code);
  }

  function handleKeyUp(event) {
    if (!gameCodes.has(event.code)) return;
    heldCodes.delete(event.code);
  }

  function handlePointerDown(event) {
    const button = event.target.closest("button[data-seat][data-control]");
    if (!button || button.disabled || view.phase !== "playing") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointerById.has(event.pointerId) || pointerByButton.has(button)) return;
    const seat = Number(button.dataset.seat);
    const kind = button.dataset.control;
    if (![0, 1].includes(seat) || !pointerControls[seat][kind]) return;

    event.preventDefault();
    lastInputMode = "pointer";
    pointerById.set(event.pointerId, { button, seat, kind });
    pointerByButton.set(button, event.pointerId);
    pointerControls[seat][kind].add(event.pointerId);
    button.classList.add("is-held");
    try {
      button.setPointerCapture(event.pointerId);
    } catch (_error) {
      // Document-level pointerup and pointercancel remain the release fallback.
    }
  }

  function releasePointer(event) {
    const active = pointerById.get(event.pointerId);
    if (!active) return;
    pointerById.delete(event.pointerId);
    pointerByButton.delete(active.button);
    pointerControls[active.seat][active.kind].delete(event.pointerId);
    active.button.classList.remove("is-held");
    try {
      if (active.button.hasPointerCapture(event.pointerId)) active.button.releasePointerCapture(event.pointerId);
    } catch (_error) {
      // The pointer may already have been released by the browser.
    }
  }

  function cancelPointer(event) {
    if (!pointerById.has(event.pointerId)) return;
    releasePointer(event);
    safePause("manual");
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") safePause("hidden");
  }

  function runFrame(timestamp) {
    if (disposed) return;
    if (lastFrameTime === null) {
      lastFrameTime = timestamp;
      frameRequest = globalThis.requestAnimationFrame(runFrame);
      return;
    }

    const delta = Math.max(0, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    if ((view.phase === "countdown" || view.phase === "playing") && delta > maxFrameGap) {
      safePause("stalled");
      frameRequest = globalThis.requestAnimationFrame(runFrame);
      return;
    }

    if (view.phase === "countdown" || view.phase === "playing") {
      accumulatorMs += delta;
      let steps = 0;
      while (accumulatorMs >= tickMs && steps < maxCatchUp
        && (view.phase === "countdown" || view.phase === "playing")) {
        dispatch({ type: "STEP", inputs: collectInputs() }, false);
        accumulatorMs -= tickMs;
        steps += 1;
      }
      if (accumulatorMs >= tickMs && (view.phase === "countdown" || view.phase === "playing")) {
        safePause("stalled");
      }
    } else {
      accumulatorMs = 0;
    }
    frameRequest = globalThis.requestAnimationFrame(runFrame);
  }

  function collectInputs() {
    return [inputFor(0), inputFor(1)];
  }

  function inputFor(seat) {
    const keys = seat === 0
      ? { left: "KeyA", charge: "KeyW", right: "KeyD" }
      : { left: "ArrowLeft", charge: "ArrowUp", right: "ArrowRight" };
    const left = heldCodes.has(keys.left) || pointerControls[seat].left.size > 0;
    const right = heldCodes.has(keys.right) || pointerControls[seat].right.size > 0;
    let turn = left === right ? 0 : left ? -1 : 1;
    if (turn === 0 && buttonPulse[seat].turn !== 0) turn = buttonPulse[seat].turn;
    const charging = heldCodes.has(keys.charge) || pointerControls[seat].charge.size > 0
      || buttonPulse[seat].chargeTicks > 0;
    buttonPulse[seat].turn = 0;
    buttonPulse[seat].chargeTicks = Math.max(0, buttonPulse[seat].chargeTicks - 1);
    return { turn, charging };
  }

  function dispatch(action, resetClock) {
    const previous = state;
    const previousPhase = view.phase;
    const next = logic.reduceSoftSumo(state, action);
    if (next === state) return false;
    state = next;
    view = logic.getSoftSumoView(state);
    if (resetClock !== false && action.type !== "STEP") resetDriverClock();
    if (previousPhase === "countdown" && view.phase === "playing") clearInputs();
    if (["START", "RESUME", "NEXT_ROUND", "RESTART"].includes(action.type)) clearInputs();
    if (view.phase !== previousPhase && !["countdown", "playing"].includes(view.phase)) clearInputs();
    render(view.phase !== previousPhase || action.type !== "STEP");
    return state !== previous;
  }

  function safePause(reason) {
    clearInputs();
    accumulatorMs = 0;
    lastFrameTime = null;
    if (view.phase === "countdown" || view.phase === "playing") dispatch({ type: "PAUSE", reason }, false);
  }

  function resetDriverClock() {
    accumulatorMs = 0;
    lastFrameTime = null;
  }

  function clearInputs() {
    heldCodes.clear();
    for (const seat of [0, 1]) {
      for (const kind of ["left", "charge", "right"]) pointerControls[seat][kind].clear();
      buttonPulse[seat].turn = 0;
      buttonPulse[seat].chargeTicks = 0;
    }
    const captures = [...pointerById.entries()];
    for (const active of pointerById.values()) active.button.classList.remove("is-held");
    pointerById.clear();
    pointerByButton.clear();
    for (const [pointerId, active] of captures) {
      try {
        if (active.button.hasPointerCapture(pointerId)) active.button.releasePointerCapture(pointerId);
      } catch (_error) {
        // Detached controls can already have released capture.
      }
    }
  }

  function render(forceAnnouncement) {
    root.dataset.phase = view.phase;
    document.title = view.title;
    elements.title.textContent = view.title;
    elements.subtitle.textContent = view.subtitle;
    elements.rule.textContent = view.rule;
    elements.localOnly.textContent = safeConfig.copy.localOnly;
    for (const seat of [0, 1]) {
      elements.names[seat].textContent = view.playerNames[seat];
      elements.scores[seat].textContent = String(view.scores[seat]);
    }
    elements.round.textContent = `第 ${view.roundNumber} / ${view.roundCount} 轮`;
    elements.status.textContent = view.status;
    elements.pause.hidden = !view.canPause;
    renderArena();
    renderPhase();
    announce(forceAnnouncement);
    focusPhase();
    lastPhase = view.phase;
    lastCountdown = view.countdownLabel;
  }

  function renderArena() {
    elements.arenaRing.style.setProperty("--arena-ratio", String(view.arenaRadius / arenaStartRadius));
    view.players.forEach((player, seat) => {
      const token = elements.tokens[seat];
      const x = 50 + (player.x / (arenaStartRadius * 2)) * 100;
      const y = 50 + (player.y / (arenaStartRadius * 2)) * 100;
      token.style.setProperty("--token-x", `${x}%`);
      token.style.setProperty("--token-y", `${y}%`);
      token.style.setProperty("--aim-angle", `${player.aimIndex * 5.625}deg`);
      token.style.setProperty("--charge", String(player.chargeRatio));
      token.dataset.spriteState = player.chargeRatio > 0 ? "charging" : player.cooldownRatio > 0 ? "dashing" : "idle";
      token.classList.toggle("is-cooling", player.cooldownRatio > 0);
    });
    elements.arena.setAttribute("aria-label", `${view.playerNames[0]}与${view.playerNames[1]}在第 ${view.roundNumber} 轮擂台中。${view.status}`);
  }

  function renderPhase() {
    if (view.phase === "playing") {
      elements.phaseLayer.replaceChildren();
      if (lastPhase !== "playing" || elements.controls.childElementCount !== 2) {
        elements.controls.replaceChildren();
        renderControls();
      } else {
        updateControls();
      }
      return;
    }

    elements.phaseLayer.replaceChildren();
    elements.controls.replaceChildren();

    const panel = document.createElement("section");
    panel.className = "phase-card";
    const heading = document.createElement("h2");
    heading.tabIndex = -1;
    const detail = document.createElement("p");
    panel.append(heading, detail);

    if (view.phase === "intro") {
      heading.textContent = view.rule;
      detail.textContent = "三轮比较站稳次数；同一刻一起出圈，本轮平局。";
      panel.append(createAction(safeConfig.copy.start, "start", view.canStart, true));
    } else if (view.phase === "countdown") {
      heading.className = "countdown-label";
      heading.textContent = view.countdownLabel || "准备";
      detail.textContent = "倒数结束后再开始蓄力。";
    } else if (view.phase === "paused") {
      heading.textContent = "比赛暂停";
      detail.textContent = pauseCopy(state.pauseReason);
      panel.append(createAction(safeConfig.copy.resume, "resume", view.canResume, true));
    } else if (view.phase === "round-result") {
      heading.textContent = view.status;
      detail.textContent = `${view.scores[0]} — ${view.scores[1]}`;
      panel.append(createAction(safeConfig.copy.nextRound, "next", view.canNextRound, true));
    } else if (view.phase === "match-result") {
      heading.textContent = view.status;
      detail.textContent = matchNote();
      const score = document.createElement("strong");
      score.className = "final-score";
      score.textContent = `${view.scores[0]} — ${view.scores[1]}`;
      panel.append(score, createAction(safeConfig.copy.restart, "restart", view.canRestart, true));
    }
    elements.phaseLayer.append(panel);
  }

  function renderControls() {
    for (const seat of [0, 1]) {
      const player = view.players[seat];
      const group = document.createElement("section");
      group.className = `player-controls player-controls--${seat === 0 ? "berry" : "salt"}`;
      group.setAttribute("aria-label", `${view.playerNames[seat]}操作`);
      const header = document.createElement("div");
      header.className = "control-heading";
      const name = document.createElement("h2");
      name.textContent = `0${seat + 1} ${view.playerNames[seat]}`;
      const meterText = document.createElement("span");
      meterText.className = "meter-text";
      meterText.textContent = player.cooldownRatio > 0
        ? `冷却 ${Math.round(player.cooldownRatio * 100)}%`
        : `蓄力 ${Math.round(player.chargeRatio * 100)}%`;
      header.append(name, meterText);
      const meter = document.createElement("div");
      meter.className = "charge-meter";
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-label", `${view.playerNames[seat]}蓄力`);
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", "100");
      meter.setAttribute("aria-valuenow", String(Math.round(player.chargeRatio * 100)));
      const fill = document.createElement("span");
      fill.className = "meter-fill";
      fill.style.setProperty("--meter", String(player.chargeRatio));
      meter.append(fill);
      const buttons = document.createElement("div");
      buttons.className = "control-buttons";
      buttons.append(
        createControl(seat, "left", "逆时针", seat === 0 ? "A" : "←", player.canTurn),
        createControl(seat, "charge", player.chargeRatio > 0 ? "松开冲刺" : "按住蓄力", seat === 0 ? "W" : "↑", player.canCharge, true),
        createControl(seat, "right", "顺时针", seat === 0 ? "D" : "→", player.canTurn),
      );
      group.append(header, meter, buttons);
      elements.controls.append(group);
    }
  }

  function createControl(seat, kind, label, key, enabled, primary) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `control-button${primary ? " control-button--charge" : ""}`;
    button.dataset.seat = String(seat);
    button.dataset.control = kind;
    button.disabled = !enabled;
    button.setAttribute("aria-label", `${view.playerNames[seat]}，${label}`);
    const action = document.createElement("span");
    action.className = "control-label";
    action.textContent = label;
    const keycap = document.createElement("kbd");
    keycap.textContent = key;
    button.append(action, keycap);
    button.addEventListener("lostpointercapture", cancelPointer);
    return button;
  }

  function updateControls() {
    view.players.forEach((player, seat) => {
      const group = elements.controls.children[seat];
      if (!group) return;
      const meterText = group.querySelector(".meter-text");
      const meter = group.querySelector(".charge-meter");
      const fill = group.querySelector(".meter-fill");
      meterText.textContent = player.cooldownRatio > 0
        ? `冷却 ${Math.round(player.cooldownRatio * 100)}%`
        : `蓄力 ${Math.round(player.chargeRatio * 100)}%`;
      meter.setAttribute("aria-valuenow", String(Math.round(player.chargeRatio * 100)));
      fill.style.setProperty("--meter", String(player.chargeRatio));
      for (const button of group.querySelectorAll("button[data-control]")) {
        const kind = button.dataset.control;
        button.disabled = kind === "charge" ? !player.canCharge : !player.canTurn;
        const label = kind === "charge"
          ? player.chargeRatio > 0 ? "松开冲刺" : "按住蓄力"
          : kind === "left" ? "逆时针" : "顺时针";
        button.querySelector(".control-label").textContent = label;
        button.setAttribute("aria-label", `${view.playerNames[seat]}，${label}`);
      }
    });
  }

  function createAction(label, action, enabled, primary) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = primary ? "primary-action" : "quiet-action";
    button.dataset.action = action;
    button.disabled = !enabled;
    button.textContent = label;
    return button;
  }

  function announce(force) {
    const countdownChanged = view.phase === "countdown" && view.countdownLabel !== lastCountdown;
    if (!force && view.phase === lastPhase && !countdownChanged) return;
    elements.live.textContent = view.countdownLabel || view.status;
  }

  function focusPhase() {
    if (view.phase === lastPhase) return;
    globalThis.requestAnimationFrame(() => {
      if (view.phase === "intro") elements.phaseLayer.querySelector("[data-action='start']")?.focus();
      else if (view.phase === "countdown") elements.arenaHeading.focus();
      else if (view.phase === "playing" && lastInputMode === "keyboard") elements.controls.querySelector("button")?.focus();
      else if (view.phase === "paused") elements.phaseLayer.querySelector("[data-action='resume']")?.focus();
      else if (view.phase === "round-result" || view.phase === "match-result") elements.phaseLayer.querySelector("h2")?.focus();
    });
  }

  function matchNote() {
    if (typeof logic.resolveMatchNote !== "function") return view.status;
    try {
      const note = logic.resolveMatchNote(state, safeConfig);
      return typeof note === "string" && note.trim() ? note.trim() : view.status;
    } catch (_error) {
      return view.status;
    }
  }

  function pauseCopy(reason) {
    if (reason === "hidden") return "页面离开视线，双方输入已归零。";
    if (reason === "blur") return "窗口失去焦点，双方输入已归零。";
    if (reason === "stalled") return "画面停顿过久，比赛已安全暂停。";
    return "双方输入已归零，继续前会重新倒数。";
  }

  function preloadAsset(source, className) {
    if (typeof Image !== "function") return;
    const image = new Image();
    image.addEventListener("load", () => root.classList.add(className), { once: true });
    image.src = source;
  }

  function dispose() {
    disposed = true;
    clearInputs();
    if (frameRequest) globalThis.cancelAnimationFrame(frameRequest);
  }
})();
