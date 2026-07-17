(function () {
  "use strict";

  const levelModule = globalThis.TETHERED_HEART_LEVELS;
  const logic = globalThis.TETHERED_HEART_LOGIC;
  if (!levelModule || !logic) throw new Error("请先加载 levels.js 与 logic.js");

  const { WORLD_WIDTH, WORLD_HEIGHT, LEVELS } = levelModule;
  const {
    FIXED_DT,
    SAFE_TENSION,
    createGameState,
    startGame,
    stepGame,
    pauseGame,
    resumeGame,
    restartLevel,
    nextLevel,
    replayGame,
    deriveRibbonState,
  } = logic;

  const game = required("#game");
  const canvas = required("#game-canvas");
  const context = canvas.getContext("2d");
  const levelLabel = required("#level-label");
  const status = required("#game-status");
  const tensionLabel = required("#tension-label");
  const tensionMeter = required("#tension-meter");
  const tensionFill = required("#tension-fill");
  const resetCount = required("#reset-count");
  const primaryAction = required("#primary-action");
  const pauseButton = required("#pause-button");
  const restartButton = required("#restart-button");
  const helpButton = required("#help-button");
  const helpDialog = required("#help-dialog");
  const closeHelp = required("#close-help");
  const liveRegion = required("#live-region");

  const keyboard = new Set();
  const pointers = new Map();
  const images = {
    background: new Image(),
    atlas: new Image(),
  };
  const keyMap = Object.freeze({
    KeyW: Object.freeze({ seat: 0, direction: "up" }),
    KeyA: Object.freeze({ seat: 0, direction: "left" }),
    KeyS: Object.freeze({ seat: 0, direction: "down" }),
    KeyD: Object.freeze({ seat: 0, direction: "right" }),
    ArrowUp: Object.freeze({ seat: 1, direction: "up" }),
    ArrowLeft: Object.freeze({ seat: 1, direction: "left" }),
    ArrowDown: Object.freeze({ seat: 1, direction: "down" }),
    ArrowRight: Object.freeze({ seat: 1, direction: "right" }),
  });

  let state = createGameState();
  let assetsReady = false;
  let accumulator = 0;
  let previousTime = performance.now();
  let helpPausedGame = false;
  let devicePixelRatio = 1;

  bindControls();
  resizeCanvas();
  render();
  requestAnimationFrame(frame);

  Promise.all([
    loadImage(images.background, "assets/playfield-background.png"),
    loadImage(images.atlas, "assets/sprite-atlas.png"),
  ]).then(() => {
    assetsReady = true;
    primaryAction.disabled = false;
    render();
  }).catch(() => {
    primaryAction.disabled = true;
    status.textContent = "本地美术资源没有完整载入，请确认 assets 目录与页面在一起。";
    announce("本地美术资源载入失败");
  });

  function bindControls() {
    primaryAction.disabled = true;
    primaryAction.addEventListener("click", () => {
      const previousPhase = state.phase;
      if (state.phase === "ready") state = startGame(state);
      else if (state.phase === "paused") state = resumeGame(state);
      else if (state.phase === "level-complete") state = nextLevel(state);
      else if (state.phase === "game-complete") state = replayGame(state);
      if (state.phase !== previousPhase) {
        clearInputs();
        accumulator = 0;
        announce(phaseAnnouncement(state.phase));
        render();
      }
    });

    pauseButton.addEventListener("click", () => {
      if (state.phase === "playing") {
        state = pauseGame(state, "manual");
        clearInputs();
        announce("游戏已暂停");
      } else if (state.phase === "paused") {
        state = resumeGame(state);
        announce("继续牵引");
      }
      accumulator = 0;
      render();
    });

    restartButton.addEventListener("click", () => {
      state = restartLevel(state);
      clearInputs();
      accumulator = 0;
      announce("已经回到本幕起点");
      render();
    });

    helpButton.addEventListener("click", () => {
      helpPausedGame = state.phase === "playing";
      if (helpPausedGame) state = pauseGame(state, "manual");
      clearInputs();
      openDialog(helpDialog);
      render();
    });

    closeHelp.addEventListener("click", closeHelpDialog);
    helpDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeHelpDialog();
    });
    helpDialog.addEventListener("click", (event) => {
      if (event.target === helpDialog) closeHelpDialog();
    });

    window.addEventListener("keydown", (event) => {
      if (!keyMap[event.code]) return;
      if (state.phase === "playing") {
        event.preventDefault();
        keyboard.add(event.code);
      }
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      if (!keyMap[event.code]) return;
      keyboard.delete(event.code);
      if (state.phase === "playing") event.preventDefault();
    }, { passive: false });

    document.querySelectorAll("[data-seat][data-direction]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        if (state.phase !== "playing") return;
        event.preventDefault();
        const action = Object.freeze({
          seat: Number(button.dataset.seat),
          direction: button.dataset.direction,
          button,
        });
        pointers.set(event.pointerId, action);
        button.classList.add("is-pressed");
        button.setPointerCapture?.(event.pointerId);
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => {
        button.addEventListener(name, (event) => releasePointer(event.pointerId));
      });
    });

    window.addEventListener("blur", () => pauseForEnvironment("blur"));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseForEnvironment("hidden");
    });
    window.addEventListener("resize", resizeCanvas);
  }

  function frame(timestamp) {
    const seconds = Math.min(0.1, Math.max(0, (timestamp - previousTime) / 1000));
    previousTime = timestamp;

    if (state.phase === "playing") {
      accumulator += seconds;
      let steps = 0;
      let changed = false;
      while (accumulator >= FIXED_DT && steps < 12 && state.phase === "playing") {
        const before = state;
        state = stepGame(state, readInputs());
        accumulator -= FIXED_DT;
        steps += 1;
        changed = changed || state !== before;
        if (state.resetCount > before.resetCount) {
          clearInputs();
          announce("吊坠碰到针脚，已经回到检查点");
        }
        if (state.phase !== before.phase) {
          clearInputs();
          accumulator = 0;
          announce(phaseAnnouncement(state.phase));
        }
      }
      if (steps === 12 && accumulator >= FIXED_DT) accumulator = 0;
      if (changed) renderDom();
    } else {
      accumulator = 0;
    }

    draw();
    requestAnimationFrame(frame);
  }

  function readInputs() {
    const directions = [new Set(), new Set()];
    keyboard.forEach((code) => {
      const action = keyMap[code];
      if (action) directions[action.seat].add(action.direction);
    });
    pointers.forEach((action) => directions[action.seat]?.add(action.direction));
    return directions.map((pressed) => ({
      x: Number(pressed.has("right")) - Number(pressed.has("left")),
      y: Number(pressed.has("down")) - Number(pressed.has("up")),
    }));
  }

  function render() {
    renderDom();
    draw();
  }

  function renderDom() {
    const level = LEVELS[state.levelIndex];
    const ribbons = deriveRibbonState(state);
    const maximumTension = ribbons.length ? Math.max(...ribbons.map((ribbon) => ribbon.tension)) : 0;
    const tensionPercent = Math.round(maximumTension * 100);
    const goalPercent = Math.round(Math.min(1, state.goalHold / logic.GOAL_HOLD_SECONDS) * 100);

    game.dataset.phase = state.phase;
    levelLabel.textContent = `第 ${state.levelIndex + 1} 幕 / ${LEVELS.length} · ${level.title}`;
    tensionLabel.textContent = state.goalHold > 0
      ? `收针稳定度 ${goalPercent}%`
      : `线张力 ${tensionPercent}%`;
    const meterPercent = state.goalHold > 0 ? goalPercent : tensionPercent;
    tensionFill.style.width = `${meterPercent}%`;
    tensionFill.dataset.safe = String(maximumTension <= SAFE_TENSION);
    tensionMeter.setAttribute("aria-valuenow", String(meterPercent));
    tensionMeter.setAttribute(
      "aria-valuetext",
      state.goalHold > 0 ? `收针稳定度百分之 ${goalPercent}` : `最大线张力百分之 ${tensionPercent}`,
    );
    resetCount.textContent = state.resetCount === 0 ? "还没有碰到针脚" : `已经重新接线 ${state.resetCount} 次`;
    status.textContent = statusText(state, maximumTension, level.hint);
    canvas.setAttribute("aria-label", canvasDescription(level, ribbons));

    const action = primaryActionForPhase(state.phase);
    primaryAction.hidden = action === null;
    if (action) primaryAction.textContent = action;
    pauseButton.disabled = state.phase !== "playing" && state.phase !== "paused";
    pauseButton.textContent = state.phase === "paused" ? "继续" : "暂停";
    restartButton.disabled = state.phase === "ready";
  }

  function draw() {
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (assetsReady) context.drawImage(images.background, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    else {
      context.fillStyle = "#21101f";
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    const level = LEVELS[state.levelIndex];
    drawGoal(level.goal);
    level.obstacles.forEach(drawObstacle);
    level.hazards.forEach(drawHazard);

    const ribbons = deriveRibbonState(state);
    drawRibbon(state.anchors[0].position, state.payload.position, "#ea7464", ribbons[0]?.tension ?? 0, -1);
    drawRibbon(state.anchors[1].position, state.payload.position, "#43aaa5", ribbons[1]?.tension ?? 0, 1);

    drawSprite(0, 0, state.anchors[0].position.x, state.anchors[0].position.y, 70, 92);
    drawSprite(1, 0, state.anchors[1].position.x, state.anchors[1].position.y, 70, 92);
    drawSprite(2, 0, state.payload.position.x, state.payload.position.y, 82, 92);

    if (state.phase === "level-complete" || state.phase === "game-complete") {
      drawSprite(3, 1, level.goal.x, level.goal.y, 118, 118);
    }
    if (state.phase === "paused") drawPauseVeil();
  }

  function drawGoal(goal) {
    drawSprite(3, 0, goal.x, goal.y, goal.radius * 2.6, goal.radius * 2.8);
    context.save();
    context.beginPath();
    context.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2);
    context.setLineDash([7, 10]);
    context.strokeStyle = "rgba(242, 223, 182, .72)";
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }

  function drawObstacle(box) {
    drawSprite(0, 1, box.x + box.width / 2, box.y + box.height / 2, box.width + 30, box.height + 30);
  }

  function drawHazard(triangle) {
    const xs = triangle.map((point) => point.x);
    const ys = triangle.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    drawSprite(1, 1, (minX + maxX) / 2, (minY + maxY) / 2, maxX - minX + 52, maxY - minY + 54);
  }

  function drawRibbon(start, end, color, tension, side) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const normalLength = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / normalLength;
    const ny = dx / normalLength;
    const curve = (18 + (1 - tension) * 20) * side;
    const controlX = (start.x + end.x) / 2 + nx * curve;
    const controlY = (start.y + end.y) / 2 + ny * curve;

    context.save();
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(controlX, controlY, end.x, end.y);
    context.strokeStyle = "rgba(35, 12, 28, .78)";
    context.lineWidth = 13;
    context.stroke();

    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(controlX, controlY, end.x, end.y);
    context.strokeStyle = color;
    context.lineWidth = 8;
    context.stroke();

    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(controlX, controlY, end.x, end.y);
    context.setLineDash([3, 7]);
    context.strokeStyle = "rgba(255, 235, 196, .72)";
    context.lineWidth = 1.8;
    context.stroke();
    context.restore();
  }

  function drawSprite(column, row, x, y, width, height) {
    if (!assetsReady) return;
    const sourceWidth = images.atlas.naturalWidth / 4;
    const sourceHeight = images.atlas.naturalHeight / 2;
    context.drawImage(
      images.atlas,
      column * sourceWidth,
      row * sourceHeight,
      sourceWidth,
      sourceHeight,
      x - width / 2,
      y - height / 2,
      width,
      height,
    );
  }

  function drawPauseVeil() {
    context.save();
    context.fillStyle = "rgba(18, 8, 18, .58)";
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    context.fillStyle = "#f2dfb6";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = '500 34px Georgia, "Songti SC", serif';
    context.fillText("先停在这一针", WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    context.restore();
  }

  function resizeCanvas() {
    devicePixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(WORLD_WIDTH * devicePixelRatio);
    canvas.height = Math.round(WORLD_HEIGHT * devicePixelRatio);
    draw();
  }

  function pauseForEnvironment(reason) {
    clearInputs();
    if (state.phase !== "playing") return;
    state = pauseGame(state, reason);
    accumulator = 0;
    announce(reason === "hidden" ? "页面隐藏，游戏已暂停" : "窗口失去焦点，游戏已暂停");
    render();
  }

  function closeHelpDialog() {
    if (helpDialog.open) helpDialog.close();
    if (helpPausedGame && state.phase === "paused" && state.pauseReason === "manual") {
      state = resumeGame(state);
      announce("继续牵引");
    }
    helpPausedGame = false;
    render();
  }

  function clearInputs() {
    keyboard.clear();
    pointers.clear();
    document.querySelectorAll("[data-seat][data-direction].is-pressed")
      .forEach((button) => button.classList.remove("is-pressed"));
  }

  function releasePointer(pointerId) {
    const action = pointers.get(pointerId);
    if (!action) return;
    pointers.delete(pointerId);
    const stillPressed = Array.from(pointers.values()).some((item) => item.button === action.button);
    if (!stillPressed) action.button.classList.remove("is-pressed");
  }

  function statusText(current, maximumTension, hint) {
    if (current.phase === "ready") return "两个人各守一端，把同一颗心送进刺绣绷。";
    if (current.phase === "paused") return "先停在这一针，准备好再继续。";
    if (current.phase === "level-complete") return "这一幕穿过去了，下一针会更考验配合。";
    if (current.phase === "game-complete") return "这一针，我们一起穿过了。";
    if (current.goalHold > 0) return "稳住位置和张力，再一会儿就收好这一针。";
    if (maximumTension > 0.86) return "线绷得太紧了，彼此靠近一点。";
    return hint;
  }

  function canvasDescription(level, ribbons) {
    const tension = ribbons.length ? Math.round(Math.max(...ribbons.map((item) => item.tension)) * 100) : 0;
    return `${level.title}。珊瑚线轴位于 ${Math.round(state.anchors[0].position.x)}, ${Math.round(state.anchors[0].position.y)}；`
      + `青色线轴位于 ${Math.round(state.anchors[1].position.x)}, ${Math.round(state.anchors[1].position.y)}；`
      + `共享吊坠位于 ${Math.round(state.payload.position.x)}, ${Math.round(state.payload.position.y)}；最大线张力 ${tension}%。`;
  }

  function primaryActionForPhase(phase) {
    if (phase === "ready") return assetsReady ? "开始牵引" : "正在整理丝线…";
    if (phase === "paused") return "继续牵引";
    if (phase === "level-complete") return "穿下一针";
    if (phase === "game-complete") return "重新游玩";
    return null;
  }

  function phaseAnnouncement(phase) {
    if (phase === "playing") return `开始第 ${state.levelIndex + 1} 幕：${LEVELS[state.levelIndex].title}`;
    if (phase === "level-complete") return "本幕完成";
    if (phase === "game-complete") return "三幕完成，这一针我们一起穿过了";
    return "状态已更新";
  }

  function loadImage(image, source) {
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
      image.src = source;
    });
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function announce(message) {
    liveRegion.textContent = "";
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function required(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`页面缺少必要节点：${selector}`);
    return element;
  }
})();
