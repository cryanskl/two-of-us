(function runPhotoSliderRace() {
  "use strict";

  const config = globalThis.PhotoSliderRaceConfig;
  const logic = globalThis.PhotoSliderRaceLogic;
  const template = document.getElementById("app-template");
  const experience = document.getElementById("experience");
  const statusMessage = document.getElementById("status-message");

  if (!config || !logic || !template || !experience || !statusMessage) return;

  experience.append(template.content.cloneNode(true));

  const elements = {
    sourcePanel: document.getElementById("source-panel"),
    sourcePreview: document.getElementById("source-preview"),
    sourceKind: document.getElementById("source-kind"),
    sourceStatus: document.getElementById("source-status"),
    photoInput: document.getElementById("photo-input"),
    startButton: document.getElementById("start-button"),
    restoreButton: document.getElementById("restore-button"),
    arena: document.getElementById("arena"),
    leftBoard: document.getElementById("left-board"),
    rightBoard: document.getElementById("right-board"),
    leftBoardStatus: document.getElementById("left-board-status"),
    rightBoardStatus: document.getElementById("right-board-status"),
    leftTime: document.getElementById("left-time"),
    rightTime: document.getElementById("right-time"),
    leftMoves: document.getElementById("left-moves"),
    rightMoves: document.getElementById("right-moves"),
    pauseButton: document.getElementById("pause-button"),
    countdownPanel: document.getElementById("countdown-panel"),
    countdownLabel: document.getElementById("countdown-label"),
    countdownNumber: document.getElementById("countdown-number"),
    pausePanel: document.getElementById("pause-panel"),
    pauseTitle: document.getElementById("pause-title"),
    resumeButton: document.getElementById("resume-button"),
    resultPanel: document.getElementById("result-panel"),
    resultTitle: document.getElementById("result-title"),
    resultLeft: document.getElementById("result-left"),
    resultRight: document.getElementById("result-right"),
    rematchButton: document.getElementById("rematch-button"),
    changeButton: document.getElementById("change-button"),
    utilityDock: document.getElementById("utility-dock"),
    moveFeedback: document.getElementById("move-feedback"),
  };

  if (Object.values(elements).some(function missing(node) { return !node; })) return;

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MIN_IMAGE_SHORT_SIDE = 600;
  const MAX_IMAGE_SIDE = 6000;
  const MAX_IMAGE_PIXELS = 24000000;
  const OUTPUT_SIDE = 1200;
  const ALLOWED_MIME_TYPES = Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  const ERROR_MESSAGES = Object.freeze({
    "unsupported-type": "请选择 JPEG、PNG 或 WebP 图片。当前图片没有改变。",
    "file-too-large": "图片超过 20 MiB，请换一张更小的。当前图片没有改变。",
    "dimensions-too-small": "图片短边至少需要 600 像素。当前图片没有改变。",
    "dimensions-too-large": "图片边长或总像素过大，请先缩小。当前图片没有改变。",
    "unsupported-browser": "当前浏览器不能可靠处理这张照片，你仍可使用内置图比赛。",
    "decode-failed": "没能读取这张图片，请换一张。当前图片没有改变。",
    "encode-failed": "没能准备游戏图片，请重试。当前图片没有改变。",
  });
  const PHASE_LABELS = Object.freeze({
    setup: "准备",
    countdown: "准备开拼",
    racing: "比赛中",
    settling: "十分之一秒结算中",
    paused: "已暂停",
    "resume-countdown": "准备继续",
    finished: "比赛结束",
  });

  let state = logic.createInitialState();
  let view = logic.getPublicView(state);
  let activeUrl = null;
  let activeKind = "builtin";
  let imageGeneration = 0;
  let disposed = false;
  let seedState = initialSeed();
  let countdownTimer = null;
  let settlementTimer = null;
  let hudFrame = null;
  let feedbackTimer = null;
  let displayedElapsed = { left: 0, right: 0 };
  const ownedUrls = new Set();

  function initialSeed() {
    const words = new Uint32Array(1);
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
      globalThis.crypto.getRandomValues(words);
      return words[0];
    }
    return Math.floor(globalThis.performance.now() * 1000) >>> 0;
  }

  function nextSeed() {
    seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
    return seedState;
  }

  function now() {
    return globalThis.performance.now();
  }

  function announce(message) {
    statusMessage.textContent = "";
    globalThis.requestAnimationFrame(function writeAnnouncement() {
      statusMessage.textContent = message;
    });
  }

  function dispatch(action) {
    const next = logic.reduce(state, action);
    if (next === state) return false;
    const previousPhase = view.phase;
    state = next;
    view = logic.getPublicView(state);
    render(previousPhase);
    return true;
  }

  function action(type, fields) {
    return Object.assign({ type: type, revision: view.revision }, fields || {});
  }

  function sourceMetadata(kind, status, generation, errorCode) {
    return {
      kind: kind,
      status: status,
      generation: generation,
      errorCode: errorCode,
    };
  }

  function beginSourceLoad() {
    const generation = view.sourceMetadata.generation + 1;
    const metadata = sourceMetadata(
      view.sourceMetadata.kind,
      "loading",
      generation,
      null,
    );
    const changed = dispatch(action(logic.ACTIONS.SET_SOURCE, { metadata: metadata }));
    if (!changed) return null;
    imageGeneration = generation;
    return generation;
  }

  function failSource(generation, code) {
    if (
      disposed
      || generation !== imageGeneration
      || view.sourceMetadata.generation !== generation
      || view.sourceMetadata.status !== "loading"
    ) return;
    const metadata = sourceMetadata(activeKind, "error", generation, code);
    if (dispatch(action(logic.ACTIONS.SET_SOURCE, { metadata: metadata }))) {
      announce(ERROR_MESSAGES[code]);
    }
  }

  function clearUrlReferences(url) {
    const nodes = [
      elements.sourcePreview,
      ...elements.leftBoard.querySelectorAll(".puzzle-tile"),
      ...elements.rightBoard.querySelectorAll(".puzzle-tile"),
    ];
    nodes.forEach(function clearNode(node) {
      if (!url || node.style.backgroundImage.includes(url)) {
        node.style.removeProperty("background-image");
      }
    });
  }

  function releaseUrl(url) {
    if (!url || !ownedUrls.has(url)) return;
    URL.revokeObjectURL(url);
    ownedUrls.delete(url);
  }

  function useActiveImage(node) {
    if (activeUrl) node.style.backgroundImage = 'url("' + activeUrl + '")';
    else node.style.removeProperty("background-image");
  }

  function applyImageReferences() {
    useActiveImage(elements.sourcePreview);
    elements.leftBoard.querySelectorAll(".puzzle-tile").forEach(useActiveImage);
    elements.rightBoard.querySelectorAll(".puzzle-tile").forEach(useActiveImage);
  }

  function commitCandidate(blob, kind, generation) {
    if (
      disposed
      || generation !== imageGeneration
      || view.sourceMetadata.generation !== generation
      || view.sourceMetadata.status !== "loading"
    ) return;

    const candidateUrl = URL.createObjectURL(blob);
    ownedUrls.add(candidateUrl);
    if (
      disposed
      || generation !== imageGeneration
      || view.sourceMetadata.generation !== generation
    ) {
      releaseUrl(candidateUrl);
      return;
    }

    const previousUrl = activeUrl;
    activeUrl = candidateUrl;
    activeKind = kind;
    applyImageReferences();

    const metadata = sourceMetadata(kind, "ready", generation, null);
    if (!dispatch(action(logic.ACTIONS.SET_SOURCE, { metadata: metadata }))) {
      activeUrl = previousUrl;
      applyImageReferences();
      releaseUrl(candidateUrl);
      return;
    }

    globalThis.requestAnimationFrame(function releasePreviousImage() {
      if (previousUrl && previousUrl !== activeUrl) {
        clearUrlReferences(previousUrl);
        applyImageReferences();
        releaseUrl(previousUrl);
      }
    });
    announce(kind === "local" ? "照片已在本页准备好。" : "原创内置图已准备好。");
  }

  function canvasBlob(canvas) {
    return new Promise(function resolveCanvasBlob(resolve) {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });
  }

  function drawSpark(context, x, y, radius, color) {
    context.save();
    context.translate(x, y);
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, radius * 0.12);
    context.beginPath();
    context.moveTo(-radius, 0);
    context.lineTo(radius, 0);
    context.moveTo(0, -radius);
    context.lineTo(0, radius);
    context.stroke();
    context.restore();
  }

  function drawBuiltinImage(context) {
    const canvas = context.canvas;
    canvas.width = OUTPUT_SIDE;
    canvas.height = OUTPUT_SIDE;

    const space = context.createLinearGradient(0, 0, OUTPUT_SIDE, OUTPUT_SIDE);
    space.addColorStop(0, "#020817");
    space.addColorStop(0.5, "#071a42");
    space.addColorStop(1, "#020717");
    context.fillStyle = space;
    context.fillRect(0, 0, OUTPUT_SIDE, OUTPUT_SIDE);

    for (let index = 0; index < 54; index += 1) {
      const x = (index * 197 + 73) % 1140 + 30;
      const y = (index * 307 + 41) % 1140 + 30;
      const radius = 1.5 + (index % 5) * 0.7;
      context.fillStyle = index % 4 === 0 ? "#f8d88c" : "#d8deef";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.save();
    context.lineWidth = 8;
    context.strokeStyle = "#f6b943";
    context.beginPath();
    context.bezierCurveTo(50, 850, 370, 280, 1110, 280);
    context.stroke();
    context.lineWidth = 6;
    context.strokeStyle = "#ff7864";
    context.beginPath();
    context.bezierCurveTo(90, 1070, 790, 980, 1070, 120);
    context.stroke();
    context.restore();

    const goldPlanet = context.createRadialGradient(340, 850, 20, 300, 860, 220);
    goldPlanet.addColorStop(0, "#ffe9ad");
    goldPlanet.addColorStop(0.32, "#f6b943");
    goldPlanet.addColorStop(0.72, "#a75f14");
    goldPlanet.addColorStop(1, "#44260d");
    context.fillStyle = goldPlanet;
    context.beginPath();
    context.arc(300, 880, 205, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(248, 216, 140, 0.6)";
    context.lineWidth = 8;
    context.beginPath();
    context.ellipse(300, 880, 260, 72, -0.24, 0, Math.PI * 2);
    context.stroke();

    const coralPlanet = context.createRadialGradient(895, 235, 12, 850, 270, 150);
    coralPlanet.addColorStop(0, "#ffd3c8");
    coralPlanet.addColorStop(0.36, "#ff7864");
    coralPlanet.addColorStop(0.8, "#9e302e");
    coralPlanet.addColorStop(1, "#3c1721");
    context.fillStyle = coralPlanet;
    context.beginPath();
    context.arc(850, 270, 142, 0, Math.PI * 2);
    context.fill();

    drawSpark(context, 590, 565, 42, "#f7edcf");
    drawSpark(context, 655, 565, 30, "#f8d88c");
    drawSpark(context, 190, 170, 18, "#d8deef");
    drawSpark(context, 1000, 690, 22, "#ffa08f");
    drawSpark(context, 770, 1010, 15, "#d8deef");

    context.fillStyle = "rgba(216, 222, 239, 0.13)";
    context.beginPath();
    context.arc(1050, 1030, 76, 0, Math.PI * 2);
    context.fill();
  }

  async function prepareBuiltin() {
    const generation = beginSourceLoad();
    if (generation === null) return;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        failSource(generation, "encode-failed");
        return;
      }
      drawBuiltinImage(context);
      const blob = await canvasBlob(canvas);
      if (!blob) {
        failSource(generation, "encode-failed");
        return;
      }
      commitCandidate(blob, "builtin", generation);
    } catch (_error) {
      failSource(generation, "encode-failed");
    }
  }

  async function prepareLocalPhoto(file) {
    const generation = beginSourceLoad();
    if (generation === null) return;

    if (ALLOWED_MIME_TYPES.indexOf(file.type) < 0) {
      failSource(generation, "unsupported-type");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      failSource(generation, "file-too-large");
      return;
    }
    if (typeof globalThis.createImageBitmap !== "function") {
      failSource(generation, "unsupported-browser");
      return;
    }

    let bitmap = null;
    try {
      bitmap = await globalThis.createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (generation !== imageGeneration || disposed) return;

      const width = bitmap.width;
      const height = bitmap.height;
      const shortSide = Math.min(width, height);
      const longSide = Math.max(width, height);
      if (shortSide < MIN_IMAGE_SHORT_SIDE) {
        failSource(generation, "dimensions-too-small");
        return;
      }
      if (longSide > MAX_IMAGE_SIDE || width * height > MAX_IMAGE_PIXELS) {
        failSource(generation, "dimensions-too-large");
        return;
      }

      const outputSide = Math.min(OUTPUT_SIDE, shortSide);
      const sourceX = (width - shortSide) / 2;
      const sourceY = (height - shortSide) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = outputSide;
      canvas.height = outputSide;
      const context = canvas.getContext("2d");
      if (!context) {
        failSource(generation, "encode-failed");
        return;
      }
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        shortSide,
        shortSide,
        0,
        0,
        outputSide,
        outputSide,
      );
      const blob = await canvasBlob(canvas);
      if (!blob) {
        failSource(generation, "encode-failed");
        return;
      }
      commitCandidate(blob, "local", generation);
    } catch (_error) {
      failSource(generation, "decode-failed");
    } finally {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
    }
  }

  function formatTime(milliseconds) {
    if (milliseconds === null || !Number.isFinite(milliseconds)) return "未完成";
    return (Math.max(0, milliseconds) / 1000).toFixed(1) + " 秒";
  }

  function elapsedForBoard(board, at) {
    if (!board || view.timing.raceStartedAt === null) return 0;
    if (board.solvedAt !== null) {
      return logic.calculateElapsed(
        view.timing.raceStartedAt,
        board.solvedAt,
        view.timing.accumulatedPausedMs,
      );
    }
    return Math.max(
      0,
      at - view.timing.raceStartedAt - view.timing.accumulatedPausedMs,
    );
  }

  function updateMetrics(at) {
    if (!view.boards.left || !view.boards.right) return;
    if (view.phase === "finished") {
      displayedElapsed.left = view.result.left.elapsedMs;
      displayedElapsed.right = view.result.right.elapsedMs;
    } else if (view.phase === "racing" || view.phase === "settling") {
      displayedElapsed.left = elapsedForBoard(view.boards.left, at);
      displayedElapsed.right = elapsedForBoard(view.boards.right, at);
    }
    elements.leftTime.textContent = formatTime(displayedElapsed.left);
    elements.rightTime.textContent = formatTime(displayedElapsed.right);
    elements.leftMoves.textContent = String(view.boards.left.moves);
    elements.rightMoves.textContent = String(view.boards.right.moves);
  }

  function stopTimers() {
    if (countdownTimer !== null) globalThis.clearTimeout(countdownTimer);
    if (settlementTimer !== null) globalThis.clearTimeout(settlementTimer);
    if (hudFrame !== null) globalThis.cancelAnimationFrame(hudFrame);
    countdownTimer = null;
    settlementTimer = null;
    hudFrame = null;
  }

  function startHudFrame() {
    function frame() {
      updateMetrics(now());
      if (view.phase === "racing" || view.phase === "settling") {
        hudFrame = globalThis.requestAnimationFrame(frame);
      } else {
        hudFrame = null;
      }
    }
    hudFrame = globalThis.requestAnimationFrame(frame);
  }

  function scheduleCountdown() {
    countdownTimer = globalThis.setTimeout(function countdownStep() {
      countdownTimer = null;
      dispatch(action(logic.ACTIONS.COUNTDOWN_TICK, { now: now() }));
    }, 1000);
  }

  function scheduleSettlement() {
    const remaining = Math.max(0, view.timing.settlementDeadline - now());
    settlementTimer = globalThis.setTimeout(function settleWhenDue() {
      settlementTimer = null;
      const currentTime = now();
      if (view.phase !== "settling") return;
      if (currentTime < view.timing.settlementDeadline) {
        scheduleSettlement();
        return;
      }
      dispatch(action(logic.ACTIONS.SETTLE, { now: currentTime }));
    }, Math.max(0, remaining));
  }

  function schedulePhaseDrivers() {
    stopTimers();
    if (view.phase === "countdown" || view.phase === "resume-countdown") {
      scheduleCountdown();
    }
    if (view.phase === "racing" || view.phase === "settling") {
      startHudFrame();
    }
    if (view.phase === "settling") scheduleSettlement();
  }

  function originalPosition(tile) {
    const index = tile - 1;
    return {
      row: Math.floor(index / 3),
      column: index % 3,
    };
  }

  function isAdjacent(first, second) {
    const firstRow = Math.floor(first / 3);
    const firstColumn = first % 3;
    const secondRow = Math.floor(second / 3);
    const secondColumn = second % 3;
    return Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn) === 1;
  }

  function directionForTile(board, tileIndex) {
    const moved = logic.moveTileAt(board.tiles, tileIndex);
    return moved.changed ? moved.direction : null;
  }

  function tileName(tile, index, movable) {
    const original = originalPosition(tile);
    return "原图第 " + (original.row + 1) + " 行第 " + (original.column + 1)
      + " 列；现在第 " + (Math.floor(index / 3) + 1) + " 行第 "
      + (index % 3 + 1) + " 列；" + (movable ? "可移动" : "不可移动");
  }

  function showMoveFeedback(message, isError) {
    const text = elements.moveFeedback.querySelector("span");
    text.textContent = message;
    elements.moveFeedback.dataset.state = isError ? "error" : "info";
    if (feedbackTimer !== null) globalThis.clearTimeout(feedbackTimer);
    feedbackTimer = globalThis.setTimeout(function restoreFeedback() {
      text.textContent = config.DEFAULT_CONFIG.inputHint;
      elements.moveFeedback.dataset.state = "info";
      feedbackTimer = null;
    }, 1400);
  }

  function dispatchMove(player, direction, repeat) {
    const canMove = player === "left"
      ? view.controls.canMoveLeft
      : view.controls.canMoveRight;
    if (!canMove) return false;
    return dispatch(action(logic.ACTIONS.MOVE, {
      player: player,
      direction: direction,
      repeat: repeat,
      now: now(),
    }));
  }

  function renderBoard(player, board, boardElement, canMove) {
    const focused = document.activeElement;
    const focusedTile = focused && focused.closest
      ? focused.closest(".puzzle-tile")
      : null;
    const restoreTile = focusedTile && boardElement.contains(focusedTile)
      ? focusedTile.dataset.tile
      : null;
    const fragment = document.createDocumentFragment();

    board.tiles.forEach(function renderTile(tile, index) {
      if (tile === 0) {
        const blank = document.createElement("div");
        blank.className = "blank-slot";
        blank.setAttribute("aria-hidden", "true");
        fragment.append(blank);
        return;
      }

      const movable = canMove && isAdjacent(index, board.blankIndex);
      const button = document.createElement("button");
      button.className = "puzzle-tile";
      button.type = "button";
      button.dataset.tile = String(tile);
      button.dataset.movable = movable ? "true" : "false";
      button.setAttribute("aria-label", tileName(tile, index, movable));
      button.disabled = !canMove;
      const original = originalPosition(tile);
      button.style.backgroundPosition = (original.column * 50) + "% "
        + (original.row * 50) + "%";
      useActiveImage(button);

      let consumed = false;
      button.addEventListener("click", function moveClickedTile() {
        if (consumed || !canMove) return;
        const currentBoard = player === "left" ? view.boards.left : view.boards.right;
        const currentIndex = currentBoard.tiles.indexOf(tile);
        const direction = directionForTile(currentBoard, currentIndex);
        if (!direction) {
          showMoveFeedback("只能移动空格旁边的一块", true);
          return;
        }
        consumed = dispatchMove(player, direction, false);
      });
      fragment.append(button);
    });

    boardElement.replaceChildren(fragment);
    boardElement.dataset.locked = board.locked ? "true" : "false";
    if (restoreTile) {
      const nextFocus = boardElement.querySelector('[data-tile="' + restoreTile + '"]');
      if (nextFocus && !nextFocus.disabled) nextFocus.focus({ preventScroll: true });
    }
  }

  function boardStatus(board, phase, player) {
    if (board.locked) return "已拼回";
    if (phase === "paused") return "已暂停";
    if (phase === "countdown" || phase === "resume-countdown") return "等待倒数";
    if (phase === "settling") {
      return view.firstFinisher === player ? "已拼回" : "继续拼";
    }
    if (phase === "finished") return "本局结束";
    return "拼图中";
  }

  function renderResult() {
    if (!view.result) return;
    const outcome = view.result.outcome;
    if (outcome === "left") elements.resultTitle.textContent = "左边的你先拼回来了";
    else if (outcome === "right") elements.resultTitle.textContent = "右边的你先拼回来了";
    else elements.resultTitle.textContent = "十分之一秒内，同时拼回来了";
    elements.resultLeft.textContent = formatTime(view.result.left.elapsedMs)
      + " · " + view.result.left.moves + " 步";
    elements.resultRight.textContent = formatTime(view.result.right.elapsedMs)
      + " · " + view.result.right.moves + " 步";
  }

  function renderSource() {
    const source = view.sourceMetadata;
    elements.startButton.disabled = !view.controls.canStart || !activeUrl;
    elements.photoInput.disabled = source.status === "loading";
    elements.restoreButton.hidden = activeKind !== "local";
    elements.restoreButton.disabled = source.status === "loading";
    elements.sourceKind.textContent = activeKind === "local" ? "本地照片" : "原创内置图";
    if (source.status === "loading") {
      elements.sourceStatus.textContent = "正在本页准备图片，当前图片保持不变。";
      elements.sourceStatus.dataset.state = "loading";
    } else if (source.status === "error") {
      elements.sourceStatus.textContent = ERROR_MESSAGES[source.errorCode];
      elements.sourceStatus.dataset.state = "error";
    } else {
      elements.sourceStatus.textContent = activeKind === "local"
        ? "照片已在本页准备好。"
        : "原创内置图已准备好。";
      elements.sourceStatus.dataset.state = "ready";
    }
    applyImageReferences();
  }

  function render(previousPhase) {
    document.body.dataset.phase = view.phase;
    elements.sourcePanel.hidden = view.phase !== "setup";
    elements.arena.hidden = view.phase === "setup";
    elements.utilityDock.hidden = view.phase === "setup";
    renderSource();

    if (view.boards.left && view.boards.right) {
      renderBoard("left", view.boards.left, elements.leftBoard, view.controls.canMoveLeft);
      renderBoard("right", view.boards.right, elements.rightBoard, view.controls.canMoveRight);
      updateMetrics(now());
      elements.leftBoardStatus.textContent = boardStatus(view.boards.left, view.phase, "left");
      elements.rightBoardStatus.textContent = boardStatus(view.boards.right, view.phase, "right");
      elements.leftBoardStatus.dataset.state = view.boards.left.locked ? "complete" : "active";
      elements.rightBoardStatus.dataset.state = view.boards.right.locked ? "complete" : "active";
    }

    const isCountdown = view.phase === "countdown" || view.phase === "resume-countdown";
    elements.countdownPanel.hidden = !isCountdown;
    if (isCountdown) {
      const remaining = view.phase === "countdown"
        ? view.countdown.race
        : view.countdown.resume;
      elements.countdownLabel.textContent = view.phase === "countdown" ? "准备" : "准备继续";
      elements.countdownNumber.textContent = String(remaining);
    }
    elements.pausePanel.hidden = view.phase !== "paused";
    elements.resultPanel.hidden = view.phase !== "finished";
    elements.pauseButton.hidden = !view.controls.canPause;
    elements.pauseButton.disabled = !view.controls.canPause;
    if (view.phase === "finished") renderResult();

    schedulePhaseDrivers();

    if (previousPhase !== view.phase) {
      if (isCountdown) {
        announce(String(view.phase === "countdown" ? view.countdown.race : view.countdown.resume));
      } else if (view.phase === "racing") {
        announce(previousPhase === "resume-countdown" ? "继续" : "开始");
      } else if (view.phase === "settling") {
        const winner = view.firstFinisher === "left" ? "左边的你" : "右边的你";
        announce(winner + "已拼回，另一方仍有十分之一秒。");
      } else if (view.phase === "paused") {
        announce("比赛已暂停");
        globalThis.requestAnimationFrame(function focusResume() {
          elements.pauseTitle.focus({ preventScroll: true });
        });
      } else if (view.phase === "finished") {
        announce(elements.resultTitle.textContent);
        globalThis.requestAnimationFrame(function focusResult() {
          elements.resultTitle.focus({ preventScroll: true });
        });
      }
    } else if (isCountdown) {
      announce(elements.countdownNumber.textContent);
    }
  }

  function pauseMatch() {
    if (!view.controls.canPause) return;
    const timestamp = now();
    if (view.boards.left && view.boards.right) {
      displayedElapsed.left = elapsedForBoard(view.boards.left, timestamp);
      displayedElapsed.right = elapsedForBoard(view.boards.right, timestamp);
    }
    dispatch(action(logic.ACTIONS.PAUSE, { now: timestamp }));
  }

  function isControlTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest("input, button, select, textarea, [contenteditable='true']"),
    );
  }

  elements.photoInput.addEventListener("change", function choosePhoto() {
    const file = elements.photoInput.files && elements.photoInput.files[0];
    elements.photoInput.value = "";
    if (!file) return;
    prepareLocalPhoto(file);
  });

  elements.startButton.addEventListener("click", function startMatch() {
    if (!activeUrl || !view.controls.canStart) return;
    displayedElapsed = { left: 0, right: 0 };
    if (dispatch(action(logic.ACTIONS.START_MATCH, { seed: nextSeed() }))) {
      elements.arena.setAttribute("tabindex", "-1");
      elements.arena.focus({ preventScroll: true });
    }
  });

  elements.restoreButton.addEventListener("click", prepareBuiltin);
  elements.pauseButton.addEventListener("click", pauseMatch);
  elements.resumeButton.addEventListener("click", function resumeMatch() {
    dispatch(action(logic.ACTIONS.RESUME));
  });
  elements.rematchButton.addEventListener("click", function rematch() {
    displayedElapsed = { left: 0, right: 0 };
    dispatch(action(logic.ACTIONS.REMATCH, { seed: nextSeed() }));
  });
  elements.changeButton.addEventListener("click", function returnToSetup() {
    dispatch(action(logic.ACTIONS.RETURN_TO_SETUP));
  });

  document.addEventListener("keydown", function handleKeydown(event) {
    if (isControlTarget(event.target)) return;
    const mapping = logic.classifyKeyInput({
      key: event.key,
      repeat: event.repeat,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    });
    if (!mapping) return;
    const canMove = mapping.player === "left"
      ? view.controls.canMoveLeft
      : view.controls.canMoveRight;
    if (!canMove) return;
    event.preventDefault();
    dispatchMove(mapping.player, mapping.direction, event.repeat);
  });

  globalThis.addEventListener("blur", pauseMatch);
  document.addEventListener("visibilitychange", function pauseWhenHidden() {
    if (document.visibilityState === "hidden") pauseMatch();
  });

  function disposePage() {
    if (disposed) return;
    disposed = true;
    imageGeneration += 1;
    stopTimers();
    if (feedbackTimer !== null) globalThis.clearTimeout(feedbackTimer);
    feedbackTimer = null;
    clearUrlReferences(null);
    Array.from(ownedUrls).forEach(releaseUrl);
    activeUrl = null;
  }

  globalThis.addEventListener("pagehide", disposePage);
  globalThis.addEventListener("beforeunload", disposePage);
  globalThis.addEventListener("pageshow", function recoverFromHistory(event) {
    if (event.persisted) globalThis.location.reload();
  });

  render(null);
  prepareBuiltin();
})();
