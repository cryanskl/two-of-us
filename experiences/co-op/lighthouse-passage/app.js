(function () {
  "use strict";

  const levelsModule = globalThis.LIGHTHOUSE_PASSAGE_LEVELS;
  const logic = globalThis.LIGHTHOUSE_PASSAGE_LOGIC;
  if (!levelsModule || !logic) return;

  const { WORLD_WIDTH, WORLD_HEIGHT, BOAT_RADIUS, LEVELS } = levelsModule;
  const canvas = document.querySelector("#playfield-canvas");
  const context = canvas.getContext("2d");
  const game = document.querySelector("#game");
  const primaryAction = document.querySelector("#primary-action");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const helpButton = document.querySelector("#help-button");
  const helpDialog = document.querySelector("#help-dialog");
  const closeHelpButton = document.querySelector("#close-help");
  const confirmHelpButton = document.querySelector("#confirm-help");
  const controlButtons = [...document.querySelectorAll("[data-control]")];
  const levelCurrent = document.querySelector("#level-current");
  const levelTotal = document.querySelector("#level-total");
  const levelTitle = document.querySelector("#level-title");
  const statusSummary = document.querySelector("#status-summary");
  const beaconCurrent = document.querySelector("#beacon-current");
  const beaconTotal = document.querySelector("#beacon-total");
  const lighthouseDial = document.querySelector("#lighthouse-dial");
  const lighthouseAngle = document.querySelector("#lighthouse-angle");
  const liveRegion = document.querySelector("#live-region");

  const backgroundImage = loadImage("./assets/playfield-background.png");
  const atlasImage = loadImage("./assets/sprite-atlas.png");
  const pressedKeys = new Set();
  const pointerControls = new Map();
  let state = logic.createGameState();
  let previousState = null;
  let accumulator = 0;
  let lastFrameTime = performance.now();
  let helpPausedGame = false;

  const spriteCells = Object.freeze({
    lighthouse: [0, 0],
    boat: [1, 0],
    reef: [2, 0],
    beaconOff: [3, 0],
    beaconOn: [0, 1],
    harbor: [1, 1],
    checkpoint: [2, 1],
    splash: [3, 1],
    wake: [0, 2],
    fogA: [1, 2],
    fogB: [2, 2],
    flare: [3, 2],
  });

  const keyBindings = Object.freeze({
    KeyA: ["lighthouse", "left"],
    KeyD: ["lighthouse", "right"],
    ArrowUp: ["boat", "forward"],
    ArrowDown: ["boat", "reverse"],
    ArrowLeft: ["boat", "left"],
    ArrowRight: ["boat", "right"],
  });

  function loadImage(source) {
    const image = new Image();
    image.addEventListener("load", renderCanvas, { once: true });
    image.addEventListener("error", () => announce("本地绘图资源未能载入，请确认 assets 文件夹完整。"), { once: true });
    image.src = source;
    return image;
  }

  function resizeCanvas() {
    const dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    const width = Math.round(WORLD_WIDTH * dpr);
    const height = Math.round(WORLD_HEIGHT * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function currentInput() {
    return logic.normalizeInput({
      lighthouse: {
        turn: Number(isPressed("lighthouse", "right")) - Number(isPressed("lighthouse", "left")),
      },
      boat: {
        throttle: Number(isPressed("boat", "forward")) - Number(isPressed("boat", "reverse")),
        steer: Number(isPressed("boat", "right")) - Number(isPressed("boat", "left")),
      },
    });
  }

  function isPressed(channel, action) {
    const keyboardPressed = Object.entries(keyBindings).some(([code, binding]) => (
      binding[0] === channel && binding[1] === action && pressedKeys.has(code)
    ));
    const pointerPressed = [...pointerControls.values()].some((control) => (
      control.channel === channel && control.action === action
    ));
    return keyboardPressed || pointerPressed;
  }

  function releaseInputs() {
    pressedKeys.clear();
    pointerControls.clear();
    controlButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function updatePressedButtons() {
    controlButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(isPressed(button.dataset.channel, button.dataset.action)),
      );
    });
  }

  function stepFrame(now) {
    const frameSeconds = Math.min(0.1, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    if (state.phase === "playing") {
      accumulator += frameSeconds;
      let steps = 0;
      while (accumulator >= logic.FIXED_DT && steps < 12) {
        state = logic.stepGame(state, currentInput());
        accumulator -= logic.FIXED_DT;
        steps += 1;
      }
      if (steps === 12 && accumulator >= logic.FIXED_DT) accumulator = 0;
    } else {
      accumulator = 0;
    }
    render();
    requestAnimationFrame(stepFrame);
  }

  function render() {
    const level = LEVELS[state.levelIndex];
    const visibility = logic.deriveVisibility(state);
    game.dataset.phase = state.phase;
    levelCurrent.textContent = String(state.levelIndex + 1);
    levelTotal.textContent = String(LEVELS.length);
    levelTitle.textContent = level.title;

    const requiredIndices = level.beacons
      .map((beacon, index) => (beacon.required ? index : -1))
      .filter((index) => index >= 0);
    const foundCount = requiredIndices.filter((index) => state.beaconsFound[index]).length;
    beaconCurrent.textContent = String(foundCount);
    beaconTotal.textContent = String(requiredIndices.length);

    const angleDegrees = Math.round(logic.normalizeAngle(state.lighthouse.angle) * 180 / Math.PI);
    lighthouseAngle.value = `${angleDegrees}°`;
    lighthouseAngle.textContent = `${angleDegrees}°`;
    lighthouseDial.style.setProperty("--lighthouse-angle", `${angleDegrees + 90}deg`);
    lighthouseDial.setAttribute("aria-label", `灯塔当前角度 ${angleDegrees} 度`);

    const active = state.phase === "playing";
    controlButtons.forEach((button) => { button.disabled = !active; });
    pauseButton.disabled = !["playing", "paused"].includes(state.phase);
    restartButton.disabled = state.phase === "ready";
    pauseButton.setAttribute("aria-pressed", String(state.phase === "paused"));
    pauseButton.querySelector("span").textContent = state.phase === "paused" ? "继续" : "暂停";

    primaryAction.hidden = state.phase === "playing";
    primaryAction.textContent = actionLabel(state.phase);
    statusSummary.textContent = state.phase === "game-complete"
      ? "灯光一直在，船也回来了。"
      : "你照亮前路，我把船开回家。";

    canvas.setAttribute("aria-label", canvasLabel(level, visibility, foundCount, requiredIndices.length));
    renderCanvas();
    announceTransitions(previousState, state, level);
    previousState = state;
  }

  function actionLabel(phase) {
    if (phase === "ready") return "点亮海面";
    if (phase === "paused") return "继续领航";
    if (phase === "level-complete") return "下一段海程";
    if (phase === "game-complete") return "重新领航";
    return "继续领航";
  }

  function canvasLabel(level, visibility, found, total) {
    const boatX = Math.round(state.boat.position.x);
    const boatY = Math.round(state.boat.position.y);
    const heading = Math.round(state.boat.heading * 180 / Math.PI);
    const revealed = visibility.reefs.filter(Boolean).length;
    return `${level.title}夜航海图：小船位于 ${boatX}, ${boatY}，航向 ${heading} 度；`
      + `已发现航标 ${found}/${total}，当前显露暗礁 ${revealed} 处，港口${visibility.harborLit ? "正在受光" : "尚未受光"}。`;
  }

  function announceTransitions(previous, current, level) {
    if (!previous || previous.levelIndex !== current.levelIndex) return;
    current.beaconsFound.forEach((found, index) => {
      if (found && !previous.beaconsFound[index]) announce(`发现航标：${level.beacons[index].id}。`);
    });
    if (current.checkpointIndex > previous.checkpointIndex) announce("检查点已点亮。" );
    if (current.resetCount > previous.resetCount) announce("小船触礁，已回到最近的检查点。" );
    if (current.phase !== previous.phase) {
      if (current.phase === "paused") announce("领航已暂停。" );
      if (current.phase === "level-complete") announce(`第 ${current.levelIndex + 1} 幕完成。`);
      if (current.phase === "game-complete") announce("灯光一直在，船也回来了。" );
    }
  }

  function announce(message) {
    liveRegion.textContent = "";
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function renderCanvas() {
    if (!context) return;
    resizeCanvas();
    const level = LEVELS[state.levelIndex];
    const visibility = logic.deriveVisibility(state);
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawBackground();
    drawFog(level);
    drawBeam(level, state.lighthouse.angle);

    level.reefs.forEach((reef, index) => drawReef(reef, visibility.reefs[index], index));
    level.beacons.forEach((beacon, index) => drawBeacon(beacon, visibility.beacons[index], index));
    drawHarbor(level.harbor, visibility.harborLit);
    drawSprite("lighthouse", level.lighthouse.position.x, level.lighthouse.position.y, 100, 100);
    drawBoat(state.boat);

    if (state.phase === "level-complete" || state.phase === "game-complete") {
      drawSprite("flare", level.harbor.x, level.harbor.y - 72, 126, 126, 0, 0.94);
    }
    if (state.phase === "paused") drawPauseVeil();
  }

  function drawBackground() {
    if (backgroundImage.complete && backgroundImage.naturalWidth) {
      context.drawImage(backgroundImage, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      return;
    }
    const gradient = context.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    gradient.addColorStop(0, "#102f3b");
    gradient.addColorStop(1, "#06141b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  function drawFog(level) {
    context.save();
    context.globalAlpha = 0.16;
    drawSprite("fogA", 390, 122 + state.levelIndex * 28, 250, 135);
    drawSprite("fogB", 650, 395 - state.levelIndex * 35, 280, 150);
    if (level.reefs.length > 4) drawSprite("fogA", 505, 282, 220, 120, Math.PI, 0.7);
    context.restore();
  }

  function drawBeam(level, angle) {
    const { x, y } = level.lighthouse.position;
    const range = level.lighthouse.beamRange;
    const half = level.lighthouse.beamHalfAngle;
    context.save();
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - half, angle + half);
    context.closePath();
    const gradient = context.createRadialGradient(x, y, 4, x, y, range);
    gradient.addColorStop(0, "rgba(255, 235, 159, 0.72)");
    gradient.addColorStop(0.42, "rgba(245, 212, 119, 0.3)");
    gradient.addColorStop(1, "rgba(245, 212, 119, 0)");
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = "rgba(255, 237, 173, 0.33)";
    context.lineWidth = 1.3;
    context.stroke();
    context.restore();
  }

  function drawReef(reef, revealed, index) {
    const size = reef.radius * 2.55;
    context.save();
    context.globalAlpha = revealed ? 0.98 : 0.075;
    drawSprite("reef", reef.x, reef.y, size, size, index % 2 ? 0.18 : -0.12);
    if (revealed) {
      context.beginPath();
      context.arc(reef.x, reef.y, reef.radius + 4, 0, Math.PI * 2);
      context.strokeStyle = "rgba(230, 226, 194, 0.8)";
      context.setLineDash([5, 6]);
      context.lineWidth = 2;
      context.stroke();
    }
    context.restore();
  }

  function drawBeacon(beacon, found, index) {
    const size = beacon.radius * 4.2;
    if (beacon.checkpoint && found) {
      drawSprite("checkpoint", beacon.x, beacon.y + 10, size * 1.55, size * 1.1, 0, 0.65);
    }
    drawSprite(found ? "beaconOn" : "beaconOff", beacon.x, beacon.y, size, size, index % 2 ? 0.08 : -0.08);
  }

  function drawHarbor(harbor, lit) {
    context.save();
    context.globalAlpha = lit ? 1 : 0.66;
    drawSprite("harbor", harbor.x, harbor.y, 142, 142);
    context.beginPath();
    context.arc(harbor.x, harbor.y, harbor.radius, 0, Math.PI * 2);
    context.strokeStyle = lit ? "rgba(245, 212, 119, 0.94)" : "rgba(185, 166, 126, 0.45)";
    context.lineWidth = lit ? 4 : 2;
    context.setLineDash([9, 8]);
    context.stroke();
    context.restore();
  }

  function drawBoat(boat) {
    const speed = Math.hypot(boat.velocity.x, boat.velocity.y);
    if (speed > 8) {
      drawSprite("wake", boat.position.x - Math.cos(boat.heading) * 24, boat.position.y - Math.sin(boat.heading) * 24, 62, 48, boat.heading, 0.55);
    }
    drawSprite("boat", boat.position.x, boat.position.y, BOAT_RADIUS * 4.4, BOAT_RADIUS * 4.4, boat.heading + Math.PI / 4);
  }

  function drawSprite(name, x, y, width, height, rotation = 0, alpha = 1) {
    if (!atlasImage.complete || !atlasImage.naturalWidth) return;
    const cell = spriteCells[name];
    const sourceWidth = atlasImage.naturalWidth / 4;
    const sourceHeight = atlasImage.naturalHeight / 3;
    context.save();
    context.globalAlpha *= alpha;
    context.translate(x, y);
    context.rotate(rotation);
    context.drawImage(
      atlasImage,
      cell[0] * sourceWidth,
      cell[1] * sourceHeight,
      sourceWidth,
      sourceHeight,
      -width / 2,
      -height / 2,
      width,
      height,
    );
    context.restore();
  }

  function drawPauseVeil() {
    context.save();
    context.fillStyle = "rgba(3, 11, 16, 0.68)";
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    context.strokeStyle = "rgba(208, 170, 99, 0.72)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(468, 245);
    context.lineTo(468, 295);
    context.moveTo(492, 245);
    context.lineTo(492, 295);
    context.stroke();
    context.restore();
  }

  function activatePrimaryAction() {
    releaseInputs();
    if (state.phase === "ready") state = logic.startGame(state);
    else if (state.phase === "paused") state = logic.resumeGame(state);
    else if (state.phase === "level-complete") state = logic.nextLevel(state);
    else if (state.phase === "game-complete") state = logic.replayGame(state);
    accumulator = 0;
    render();
  }

  function togglePause(reason = "manual") {
    releaseInputs();
    state = state.phase === "playing" ? logic.pauseGame(state, reason) : logic.resumeGame(state);
    accumulator = 0;
    render();
  }

  function restart() {
    releaseInputs();
    state = logic.restartLevel(state);
    accumulator = 0;
    announce("本幕已重新开始。" );
    render();
  }

  function openHelp() {
    helpPausedGame = state.phase === "playing";
    if (helpPausedGame) {
      releaseInputs();
      state = logic.pauseGame(state, "manual");
      render();
    }
    helpDialog.showModal();
  }

  function closeHelp() {
    helpDialog.close();
    if (helpPausedGame && state.phase === "paused") {
      state = logic.resumeGame(state);
      helpPausedGame = false;
      render();
    }
  }

  function handleKeyDown(event) {
    if (!keyBindings[event.code]) return;
    if (state.phase === "playing") event.preventDefault();
    pressedKeys.add(event.code);
    updatePressedButtons();
  }

  function handleKeyUp(event) {
    if (!keyBindings[event.code]) return;
    pressedKeys.delete(event.code);
    updatePressedButtons();
  }

  function pressPointer(event) {
    if (state.phase !== "playing") return;
    event.preventDefault();
    const button = event.currentTarget;
    pointerControls.set(event.pointerId, {
      channel: button.dataset.channel,
      action: button.dataset.action,
      button,
    });
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
    updatePressedButtons();
  }

  function releasePointer(event) {
    if (!pointerControls.has(event.pointerId)) return;
    pointerControls.delete(event.pointerId);
    updatePressedButtons();
  }

  primaryAction.addEventListener("click", activatePrimaryAction);
  pauseButton.addEventListener("click", () => togglePause("manual"));
  restartButton.addEventListener("click", restart);
  helpButton.addEventListener("click", openHelp);
  closeHelpButton.addEventListener("click", closeHelp);
  confirmHelpButton.addEventListener("click", closeHelp);
  helpDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeHelp();
  });
  controlButtons.forEach((button) => {
    button.addEventListener("pointerdown", pressPointer);
    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", releasePointer);
    button.addEventListener("lostpointercapture", releasePointer);
  });
  globalThis.addEventListener("keydown", handleKeyDown, { passive: false });
  globalThis.addEventListener("keyup", handleKeyUp);
  globalThis.addEventListener("blur", () => {
    releaseInputs();
    if (state.phase === "playing") {
      state = logic.pauseGame(state, "blur");
      render();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    releaseInputs();
    if (state.phase === "playing") {
      state = logic.pauseGame(state, "hidden");
      render();
    }
  });
  globalThis.addEventListener("resize", renderCanvas);

  render();
  requestAnimationFrame(stepFrame);
})();
