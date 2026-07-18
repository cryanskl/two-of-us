(function () {
  "use strict";

  const logic = globalThis.ORBIT_STAR_RACE_LOGIC;
  const requiredMethods = [
    "createGameState", "sanitizeConfig", "startGame", "shiftOrbit", "stepGame",
    "restartGame", "getViewModel", "resolveResultCopy",
  ];
  const elements = {
    primaryAction: document.querySelector("#primary-action"),
    actionStage: document.querySelector("#action-stage"),
    statusTitle: document.querySelector("#status-title"),
    statusBody: document.querySelector("#status-body"),
    starCounter: document.querySelector("#star-counter"),
    matchStatus: document.querySelector("#match-status"),
    liveRegion: document.querySelector("#live-region"),
    stageDescription: document.querySelector("#stage-description"),
    orbitStage: document.querySelector("#orbit-stage"),
    starObject: document.querySelector("#star-object"),
    playerObjects: [document.querySelector("#player-object-0"), document.querySelector("#player-object-1")],
    playerSummaries: [document.querySelector("#player-summary-0"), document.querySelector("#player-summary-1")],
    playerNames: [document.querySelector("#player-name-0"), document.querySelector("#player-name-1")],
    playerScores: [document.querySelector("#player-score-0"), document.querySelector("#player-score-1")],
    controlNames: [document.querySelector("#control-name-0"), document.querySelector("#control-name-1")],
    laneStatuses: [document.querySelector("#lane-status-0"), document.querySelector("#lane-status-1")],
    controlButtons: [...document.querySelectorAll("[data-player][data-direction]")],
  };

  if (!logic || requiredMethods.some((name) => typeof logic[name] !== "function")
    || Object.values(elements).some((value) => value === null)) {
    document.body.textContent = "这一颗我先到加载失败，请确认 config.js、logic.js 与页面放在同一目录。";
    return;
  }

  const MAX_FRAME_DELTA = 0.1;
  const MAX_STEPS_PER_FRAME = 12;
  const LANE_NAMES = ["内轨", "中轨", "外轨"];
  const LANE_RADII = ["28%", "36%", "44%"];
  const FALLBACK_SEED = 0x6f726269;
  const config = logic.sanitizeConfig(globalThis.ORBIT_STAR_RACE_CONFIG);
  const heldKeys = new Set();
  let state = logic.createGameState(config);
  let accumulator = 0;
  let lastTimestamp = null;
  let focusToken = 0;
  let lastAnnouncedPhase = state.phase;
  let lastAnnouncedClaimCount = 0;
  let lastDescriptionStep = -1;

  elements.primaryAction.addEventListener("click", handlePrimaryAction);
  elements.actionStage.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='restart']")) restartGame();
  });
  for (const button of elements.controlButtons) {
    button.addEventListener("click", () => shiftPlayer(Number(button.dataset.player), Number(button.dataset.direction)));
  }
  globalThis.addEventListener("keydown", handleKeyDown);
  globalThis.addEventListener("keyup", handleKeyUp);
  globalThis.addEventListener("blur", resetFrameClock);
  globalThis.addEventListener("pagehide", resetFrameClock);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") resetFrameClock();
  });

  preloadAsset("./assets/orbit-sprites.png", "sprite-missing");
  preloadAsset("./assets/star-chart.png", "background-missing");
  render();
  globalThis.requestAnimationFrame(runFrame);

  function runFrame(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const elapsed = Math.min(MAX_FRAME_DELTA, Math.max(0, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;

    if (state.phase === "preview" || state.phase === "live") {
      accumulator = Math.min(MAX_FRAME_DELTA, accumulator + elapsed);
      let steps = 0;
      while (accumulator + Number.EPSILON >= logic.FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        const previous = state;
        state = logic.stepGame(state);
        accumulator = Math.max(0, accumulator - logic.FIXED_DT);
        steps += 1;
        announceStateTransition(previous, state);
        if (state.phase === "finished") {
          accumulator = 0;
          scheduleFocus("result");
          break;
        }
      }
      if (steps > 0) render();
    } else {
      accumulator = 0;
    }
    globalThis.requestAnimationFrame(runFrame);
  }

  function handlePrimaryAction() {
    if (state.phase !== "intro") return;
    state = logic.startGame(state, createSeed());
    resetFrameClock();
    render();
    elements.liveRegion.textContent = "第一颗星正在亮起。";
    scheduleFocus("first-control");
  }

  function restartGame() {
    if (state.phase !== "finished") return;
    state = logic.restartGame(state, createSeed());
    lastAnnouncedPhase = state.phase;
    lastAnnouncedClaimCount = 0;
    resetFrameClock();
    render();
    elements.liveRegion.textContent = "新一局开始，第一颗星正在亮起。";
    scheduleFocus("first-control");
  }

  function handleKeyDown(event) {
    const action = keyAction(event.key);
    if (!action || (state.phase !== "preview" && state.phase !== "live")) return;
    event.preventDefault();
    const key = String(event.key).toLowerCase();
    if (event.repeat || heldKeys.has(key)) return;
    heldKeys.add(key);
    shiftPlayer(action.playerIndex, action.direction);
  }

  function handleKeyUp(event) {
    const action = keyAction(event.key);
    if (!action) return;
    heldKeys.delete(String(event.key).toLowerCase());
  }

  function keyAction(keyValue) {
    const key = String(keyValue || "").toLowerCase();
    if (key === "w") return { playerIndex: 0, direction: 1 };
    if (key === "s") return { playerIndex: 0, direction: -1 };
    if (key === "arrowup") return { playerIndex: 1, direction: 1 };
    if (key === "arrowdown") return { playerIndex: 1, direction: -1 };
    return null;
  }

  function shiftPlayer(playerIndex, direction) {
    const next = logic.shiftOrbit(state, playerIndex, direction);
    if (next === state) return;
    state = next;
    render();
    const player = state.players[playerIndex];
    elements.liveRegion.textContent = `${state.playerNames[playerIndex]}切到${LANE_NAMES[player.lane]}。`;
  }

  function announceStateTransition(previous, next) {
    if (next.claims.length > previous.claims.length) {
      const view = logic.getViewModel(next);
      elements.liveRegion.textContent = `${view.status.title}。${view.status.body}`;
      lastAnnouncedClaimCount = next.claims.length;
      lastAnnouncedPhase = next.phase;
      return;
    }
    if (previous.phase === "preview" && next.phase === "live") {
      const view = logic.getViewModel(next);
      elements.liveRegion.textContent = `${view.status.title}。`;
      lastAnnouncedPhase = next.phase;
    }
  }

  function render() {
    const view = logic.getViewModel(state);
    document.body.dataset.phase = view.phase;
    document.body.classList.toggle("has-shared-claim", view.sharedClaims > 0);
    for (let playerIndex = 0; playerIndex < 2; playerIndex += 1) {
      const player = view.players[playerIndex];
      elements.playerNames[playerIndex].textContent = view.playerNames[playerIndex];
      elements.controlNames[playerIndex].textContent = view.playerNames[playerIndex];
      elements.playerScores[playerIndex].textContent = String(view.scores[playerIndex]);
      elements.laneStatuses[playerIndex].textContent = `${LANE_NAMES[player.lane]} · ${player.direction > 0 ? "顺时针" : "逆时针"}`;
      elements.playerSummaries[playerIndex].classList.toggle("is-leading", view.leaderIndex === playerIndex);
      elements.playerSummaries[playerIndex].classList.toggle("is-winner", view.winnerIndex === playerIndex);
      positionObject(elements.playerObjects[playerIndex], player.angle, player.lane);
    }

    for (const button of elements.controlButtons) {
      const playerIndex = Number(button.dataset.player);
      const direction = Number(button.dataset.direction);
      const player = view.players[playerIndex];
      button.disabled = direction === 1 ? !player.canRise : !player.canDrop;
      button.classList.toggle("is-cooling", player.cooldownRatio > 0);
      button.style.setProperty("--cooldown", String(player.cooldownRatio));
    }

    elements.statusTitle.textContent = view.status.title;
    elements.statusBody.textContent = view.status.body;
    elements.matchStatus.textContent = matchCopy(view);
    elements.starCounter.textContent = view.phase === "intro"
      ? "星轨待命"
      : view.phase === "finished"
        ? `本局 ${view.scores[0] + view.scores[1] - view.sharedClaims} 次抵达`
        : `目标 ${view.star.index + 1} · ${LANE_NAMES[view.star.lane]}`;

    const showActiveStar = view.star && view.phase !== "finished";
    elements.starObject.hidden = !showActiveStar;
    if (showActiveStar) positionObject(elements.starObject, view.star.angle, view.star.lane);
    renderAction(view);
    updateStageDescription(view);
  }

  function renderAction(view) {
    if (view.phase === "intro") {
      elements.actionStage.replaceChildren(elements.primaryAction);
      elements.primaryAction.hidden = false;
      elements.primaryAction.textContent = "开始抢星";
      return;
    }
    elements.primaryAction.hidden = true;
    if (view.phase !== "finished") {
      elements.actionStage.replaceChildren();
      return;
    }

    const copy = logic.resolveResultCopy(state, config);
    const result = document.createElement("section");
    result.className = "result-copy";
    const title = document.createElement("h2");
    title.id = "result-title";
    title.tabIndex = -1;
    title.textContent = copy.title;
    const body = document.createElement("p");
    body.textContent = copy.body;
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "primary-action";
    restart.dataset.action = "restart";
    restart.textContent = "再绕一圈";
    result.append(title, body, restart);
    elements.actionStage.replaceChildren(result);
  }

  function positionObject(element, angle, lane) {
    element.style.setProperty("--angle", `${angle}rad`);
    element.style.setProperty("--counter-angle", `${-angle}rad`);
    element.style.setProperty("--orbit-radius", LANE_RADII[lane]);
    element.dataset.lane = String(lane);
  }

  function matchCopy(view) {
    if (view.phase === "intro") return "先拿到 5 颗星";
    if (view.phase === "finished") return `${view.scores[0]} 比 ${view.scores[1]} · 本局收轨`;
    if (view.scores[0] === view.scores[1] && view.scores[0] >= view.targetScore) return `${view.scores[0]} 比 ${view.scores[1]} · 继续加赛`;
    if (view.sharedClaims > 0) return `${view.scores[0]} 比 ${view.scores[1]} · 共享 ${view.sharedClaims} 颗`;
    return `${view.scores[0]} 比 ${view.scores[1]} · 先到 ${view.targetScore}`;
  }

  function updateStageDescription(view) {
    if (view.stepCount === lastDescriptionStep || (view.stepCount % 30 !== 0 && view.phase !== "finished")) return;
    lastDescriptionStep = view.stepCount;
    const players = view.players.map((player, index) => `${view.playerNames[index]}在${LANE_NAMES[player.lane]}${clockDirection(player.angle)}`);
    const target = view.star && view.phase !== "finished"
      ? `目标在${LANE_NAMES[view.star.lane]}${clockDirection(view.star.angle)}`
      : "当前没有可捕获目标";
    elements.stageDescription.textContent = `${players.join("，")}，${target}。`;
  }

  function clockDirection(angle) {
    const clock = ((Math.round((angle / logic.TAU) * 12 + 3) % 12) + 12) % 12 || 12;
    return `${clock}点方向`;
  }

  function resetFrameClock() {
    accumulator = 0;
    lastTimestamp = null;
    heldKeys.clear();
  }

  function createSeed() {
    try {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
        const values = new Uint32Array(1);
        for (let attempt = 0; attempt < 4; attempt += 1) {
          globalThis.crypto.getRandomValues(values);
          if (values[0] !== 0) return values[0];
        }
      }
    } catch {
      // 本地旧浏览器或严格 file:// 环境使用稳定非零后备 seed。
    }
    return FALLBACK_SEED;
  }

  function preloadAsset(source, failureClass) {
    const image = new Image();
    image.addEventListener("error", () => document.body.classList.add(failureClass), { once: true });
    image.src = source;
  }

  function scheduleFocus(kind) {
    const token = ++focusToken;
    globalThis.requestAnimationFrame(() => {
      if (token !== focusToken) return;
      if (kind === "result") {
        document.querySelector("#result-title")?.focus({ preventScroll: true });
        return;
      }
      elements.controlButtons.find((button) => button.dataset.player === "0" && button.dataset.direction === "-1" && !button.disabled)
        ?.focus({ preventScroll: true });
    });
  }
})();
