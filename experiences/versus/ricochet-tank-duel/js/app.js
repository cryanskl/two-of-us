(function (root) {
  "use strict";

  const constants = root.RicochetTankDuelConstants;
  const simulation = root.RicochetTankDuelSimulation;
  const inputModule = root.RicochetTankDuelInput;
  const rendererModule = root.RicochetTankDuelRenderer;
  const accessibilityModule = root.RicochetTankDuelAccessibility;
  if (!constants || !simulation || !inputModule || !rendererModule || !accessibilityModule) {
    throw new Error("这一弹，拐弯见你未能加载完整本地脚本");
  }

  const { RULES } = constants;
  const STEP_MS = 1000 / RULES.TICK_HZ;
  const app = document.querySelector(".duel-app");
  const canvas = document.getElementById("duel-canvas");
  const renderer = rendererModule.createRenderer(canvas);
  const accessibility = accessibilityModule.createAccessibility(document);
  const phasePanels = [...document.querySelectorAll("[data-phase-panel]")];
  const controlButtons = [...document.querySelectorAll("[data-seat][data-control]")];
  const rulesDialog = document.getElementById("rules-dialog");
  const rulesTitle = document.getElementById("rules-title");
  let rulesReturnFocus = null;
  let state = simulation.createInitialState();
  let accumulatorMs = 0;
  let previousFrameTime = null;
  let animationFrameId = 0;
  let running = true;

  function phaseCanPause() {
    return state.phase === "countdown" || state.phase === "playing";
  }

  function pause(reason) {
    if (!phaseCanPause()) return;
    input.clearAll();
    accumulatorMs = 0;
    state = simulation.applyCommand(state, { type: "PAUSE", reason });
    render();
    accessibility.focus("pause-title");
  }

  function pauseRequest(mode) {
    if (state.phase === "paused" && mode === "toggle") {
      resume();
    } else if (state.phase !== "paused") {
      pause("manual");
    }
  }

  const input = inputModule.createInput({
    buttons: controlButtons,
    onPauseRequest: pauseRequest,
  });

  function resume() {
    if (state.phase !== "paused") return;
    input.clearAll();
    accumulatorMs = 0;
    previousFrameTime = null;
    state = simulation.applyCommand(state, { type: "RESUME" });
    render();
  }

  function roundMessage(result) {
    if (result === "both-hit") return ["双双命中 · 双方各得 1 分", "比分已同时结算。"];
    if (result === "left-hit") return ["左方命中", "左方获得 1 分。"];
    return ["右方命中", "右方获得 1 分。"];
  }

  function matchMessage(result) {
    if (result === "left") return "左方胜";
    if (result === "right") return "右方胜";
    return "平局";
  }

  function countdownMessage() {
    const seconds = Math.max(1, Math.ceil(state.phaseTicksRemaining / RULES.TICK_HZ));
    return ["开始", "一", "二", "三"][seconds] || "三";
  }

  function setControlAvailability() {
    for (const button of controlButtons) {
      const seat = button.dataset.seat === "left" ? 0 : 1;
      const isFire = button.dataset.control === "fire";
      const count = state.bullets.filter((bullet) => bullet.ownerId === seat).length;
      const blockedFire = isFire && (
        state.tanks[seat].cooldownTicks > 0 || count >= RULES.MAX_BULLETS_PER_PLAYER
      );
      button.disabled = state.phase !== "playing" || blockedFire;
      if (blockedFire) {
        button.title = count >= RULES.MAX_BULLETS_PER_PLAYER
          ? "场上已有 2 枚"
          : "冷却中";
      } else {
        button.removeAttribute("title");
      }
    }
    const pauseButton = document.querySelector("[data-action='pause']");
    pauseButton.disabled = !phaseCanPause();
  }

  function render() {
    app.dataset.phase = state.phase;
    for (const panel of phasePanels) {
      const active = panel.dataset.phasePanel === state.phase;
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", String(!active));
    }
    if (state.phase === "countdown") {
      document.getElementById("countdown-copy").textContent = countdownMessage();
    }
    if (state.phase === "round-result") {
      const [title, detail] = roundMessage(state.lastRoundResult);
      document.getElementById("round-result-title").textContent = title;
      document.getElementById("round-result-copy").textContent = detail;
      document.getElementById("event-strip").textContent = title;
    }
    if (state.phase === "paused") {
      const reasons = {
        manual: "你暂停了比赛，双方输入已清空。",
        hidden: "页面离开可见区域，比赛已公平暂停。",
        blur: "窗口失去焦点，比赛已公平暂停。",
        stalled: "浏览器出现长帧，比赛没有追赶后台时间。",
        invariant: "状态异常，请重新开始。",
      };
      document.getElementById("pause-copy").textContent = reasons[state.pauseReason];
    }
    if (state.phase === "match-result") {
      const result = matchMessage(state.matchResult);
      document.getElementById("match-result-title").textContent = result;
      document.getElementById("match-result-copy").textContent =
        `最终比分 ${state.scores[0]} : ${state.scores[1]}`;
      document.getElementById("event-strip").textContent = result;
    }
    setControlAvailability();
    renderer.draw(state);
    accessibility.update(state);
  }

  function runStep() {
    try {
      state = simulation.step(state, input.consumeFrame());
    } catch (error) {
      console.error("比赛状态异常", error);
      input.clearAll();
      state = simulation.applyCommand(state, { type: "PAUSE", reason: "invariant" });
    }
    render();
  }

  function frame(timestamp) {
    if (!running) return;
    if (previousFrameTime === null) {
      previousFrameTime = timestamp;
    } else {
      const gap = timestamp - previousFrameTime;
      previousFrameTime = timestamp;
      if (gap > RULES.MAX_FRAME_GAP_MS && phaseCanPause()) {
        pause("stalled");
      } else if (["countdown", "playing", "round-result"].includes(state.phase)) {
        accumulatorMs += gap;
        let steps = 0;
        while (accumulatorMs >= STEP_MS && steps < RULES.MAX_STEPS_PER_FRAME) {
          runStep();
          accumulatorMs -= STEP_MS;
          steps += 1;
        }
        if (accumulatorMs >= STEP_MS) pause("stalled");
      } else {
        accumulatorMs = 0;
      }
    }
    animationFrameId = requestAnimationFrame(frame);
  }

  function start() {
    if (state.phase !== "instructions") return;
    input.clearAll();
    state = simulation.applyCommand(state, { type: "START" });
    previousFrameTime = null;
    accumulatorMs = 0;
    render();
  }

  function restart() {
    if (state.phase !== "match-result") return;
    input.clearAll();
    state = simulation.applyCommand(state, { type: "RESTART" });
    previousFrameTime = null;
    accumulatorMs = 0;
    render();
  }

  function openRules(trigger) {
    rulesReturnFocus = trigger;
    if (typeof rulesDialog.showModal === "function") rulesDialog.showModal();
    else rulesDialog.setAttribute("open", "");
    accessibility.focus("rules-title");
  }

  for (const button of document.querySelectorAll("[data-action]")) {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "start") start();
      else if (action === "pause") pause("manual");
      else if (action === "resume") resume();
      else if (action === "restart") restart();
      else if (action === "rules") openRules(button);
    });
  }

  rulesDialog.addEventListener("close", () => {
    rulesReturnFocus?.focus();
    rulesReturnFocus = null;
  });

  window.addEventListener("blur", () => pause("blur"));
  window.addEventListener("pagehide", () => {
    pause("hidden");
    running = false;
    cancelAnimationFrame(animationFrameId);
  });
  window.addEventListener("pageshow", () => {
    if (running) return;
    running = true;
    previousFrameTime = null;
    animationFrameId = requestAnimationFrame(frame);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pause("hidden");
  });
  window.addEventListener("resize", () => renderer.resize());

  render();
  animationFrameId = requestAnimationFrame(frame);

  root.RicochetTankDuelApp = Object.freeze({
    getState() {
      return simulation.normalizeState(state);
    },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
