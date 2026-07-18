(function () {
  "use strict";

  const logic = globalThis.LIGHT_TRAIL_HUNT_LOGIC;
  const rawConfig = globalThis.LIGHT_TRAIL_HUNT_CONFIG || {};
  const root = document.querySelector(".app");
  const canvas = document.querySelector("#board");
  const context = canvas.getContext("2d", { alpha: true });

  if (!logic || !context) {
    document.querySelector("#status-label").textContent = "光轨围猎加载失败";
    document.querySelector("#live-region").textContent = "请确认 config.js、logic.js 与 app.js 都在作品目录中。";
    return;
  }

  const elements = {
    title: document.querySelector("#game-title"),
    intro: document.querySelector("#game-intro"),
    names: [document.querySelector("#player-one-name"), document.querySelector("#player-two-name")],
    scores: [document.querySelector("#player-one-score"), document.querySelector("#player-two-score")],
    round: document.querySelector("#round-label"),
    status: document.querySelector("#status-label"),
    countdownPanel: document.querySelector("#countdown-panel"),
    countdown: document.querySelector("#countdown-label"),
    pausePanel: document.querySelector("#pause-panel"),
    pauseTitle: document.querySelector("#pause-title"),
    pauseReason: document.querySelector("#pause-reason"),
    readyPanel: document.querySelector("#ready-panel"),
    resultPanel: document.querySelector("#result-panel"),
    resultTitle: document.querySelector("#result-title"),
    resultDetail: document.querySelector("#result-detail"),
    resultScore: document.querySelector("#result-score"),
    nextButton: document.querySelector('[data-action="next"]'),
    restartButton: document.querySelector('[data-action="restart"]'),
    pauseButtons: Array.from(document.querySelectorAll('[data-action="pause"]')),
    resumeButton: document.querySelector('[data-action="resume"]'),
    startButton: document.querySelector('[data-action="start"]'),
    liveRegion: document.querySelector("#live-region"),
    nameLabels: [
      Array.from(document.querySelectorAll("#desktop-player-one, #legend-player-one, #touch-player-one")),
      Array.from(document.querySelectorAll("#desktop-player-two, #legend-player-two, #touch-player-two")),
    ],
    turnButtons: Array.from(document.querySelectorAll(".turn-button")),
  };

  let state = logic.createMatchState(rawConfig);
  const driver = Object.freeze({
    tickMs: state.rules.tickMs,
    maxFrameGapMs: state.rules.maxFrameGapMs,
    maxTicksPerFrame: 5,
  });
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") || { matches: false };
  const pendingTurns = [0, 0];
  const activePointers = new Map();

  let lastFrameTime = null;
  let accumulator = 0;
  let lastAnnouncedPhase = null;
  let lastFocusedRevision = -1;
  let canvasSize = { width: 0, height: 0, dpr: 1 };

  root.addEventListener("click", handleActionClick);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  globalThis.addEventListener("blur", () => autoPause("blur"));
  globalThis.addEventListener("resize", resizeCanvas);

  for (const button of elements.turnButtons) {
    button.addEventListener("pointerdown", handlePointerDown);
    button.addEventListener("pointercancel", releasePointer);
    button.addEventListener("lostpointercapture", releasePointer);
  }
  document.addEventListener("pointerup", releasePointer);

  if (typeof ResizeObserver === "function") {
    new ResizeObserver(resizeCanvas).observe(canvas);
  }

  resizeCanvas();
  render(true);
  globalThis.requestAnimationFrame(frame);

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;

    const previous = state;
    switch (button.dataset.action) {
      case "start":
        state = logic.startMatch(state);
        resetDriver();
        break;
      case "pause":
        state = logic.pauseMatch(state, "manual");
        resetDriver();
        break;
      case "resume":
        state = logic.resumeMatch(state);
        resetDriver();
        break;
      case "next":
        state = logic.nextRound(state);
        resetDriver();
        break;
      case "restart":
        state = logic.restartMatch(state);
        resetDriver();
        break;
      default:
        return;
    }

    if (state !== previous) render(true);
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      if (event.repeat) return;
      if (state.phase === "paused") {
        state = logic.resumeMatch(state);
      } else if (state.phase === "countdown" || state.phase === "playing") {
        state = logic.pauseMatch(state, "manual");
      } else {
        return;
      }
      event.preventDefault();
      resetDriver();
      render(true);
      return;
    }

    const command = logic.classifyTurnCode(event.code);
    if (!command || event.repeat || state.phase !== "playing") return;
    event.preventDefault();
    queueTurn(command.player, command.turn);
  }

  function handlePointerDown(event) {
    if (state.phase !== "playing") return;
    const button = event.currentTarget;
    const player = Number(button.dataset.player);
    const turn = Number(button.dataset.turn);
    if (!queueTurn(player, turn)) return;

    event.preventDefault();
    activePointers.set(event.pointerId, button);
    button.classList.add("is-pressed");
    try {
      button.setPointerCapture(event.pointerId);
    } catch (_error) {
      // Pointer capture is an enhancement; the document-level pointerup remains authoritative.
    }
  }

  function releasePointer(event) {
    const button = activePointers.get(event.pointerId);
    if (!button) return;
    button.classList.remove("is-pressed");
    activePointers.delete(event.pointerId);
  }

  function queueTurn(player, turn) {
    if (state.phase !== "playing") return false;
    if (![0, 1].includes(player) || ![-1, 1].includes(turn)) return false;
    pendingTurns[player] = turn;
    return true;
  }

  function handleVisibilityChange() {
    if (document.hidden) autoPause("hidden");
  }

  function autoPause(reason) {
    const previous = state;
    state = logic.pauseMatch(state, reason);
    resetDriver();
    if (state !== previous) render(true);
  }

  function frame(time) {
    if (lastFrameTime === null) {
      lastFrameTime = time;
      render(false);
      globalThis.requestAnimationFrame(frame);
      return;
    }

    const delta = Math.max(0, time - lastFrameTime);
    lastFrameTime = time;

    if ((state.phase === "countdown" || state.phase === "playing") && delta > driver.maxFrameGapMs) {
      state = logic.pauseMatch(state, "stalled");
      resetDriver(false);
      render(true);
      globalThis.requestAnimationFrame(frame);
      return;
    }

    if (state.phase === "countdown") {
      const previous = state;
      state = logic.advanceCountdown(state, Math.floor(delta));
      accumulator = 0;
      if (state !== previous) render(state.phase !== previous.phase);
    } else if (state.phase === "playing") {
      accumulator += delta;
      let ticks = 0;
      let stateChanged = false;

      while (accumulator >= driver.tickMs && ticks < driver.maxTicksPerFrame && state.phase === "playing") {
        const turns = pendingTurns.slice();
        pendingTurns[0] = 0;
        pendingTurns[1] = 0;
        const previous = state;
        state = logic.stepRound(state, { turns });
        stateChanged = stateChanged || state !== previous;
        accumulator -= driver.tickMs;
        ticks += 1;
      }

      if (accumulator >= driver.tickMs && state.phase === "playing") {
        state = logic.pauseMatch(state, "stalled");
        resetDriver(false);
        stateChanged = true;
      }

      render(stateChanged);
    } else {
      accumulator = 0;
      render(false);
    }

    globalThis.requestAnimationFrame(frame);
  }

  function resetDriver(resetTime = true) {
    accumulator = 0;
    pendingTurns[0] = 0;
    pendingTurns[1] = 0;
    if (resetTime) lastFrameTime = null;
    for (const button of activePointers.values()) button.classList.remove("is-pressed");
    activePointers.clear();
  }

  function render(announce) {
    const view = logic.getView(state);
    const phaseChanged = view.phase !== lastAnnouncedPhase;
    root.dataset.phase = view.phase;

    elements.title.textContent = textOr(view.title, rawConfig.copy?.title, "光轨围猎");
    elements.intro.textContent = textOr(state.rules?.copy?.intro, "别追光，去改写它的边界。");
    elements.startButton.textContent = textOr(state.rules?.copy?.start, "开始围猎");
    elements.nextButton.textContent = textOr(state.rules?.copy?.nextRound, "下一轮");
    elements.restartButton.textContent = textOr(state.rules?.copy?.restart, "重新比赛");
    elements.resumeButton.textContent = textOr(state.rules?.copy?.resume, "继续");
    elements.pauseButtons.forEach((button) => {
      button.textContent = textOr(state.rules?.copy?.pause, "暂停");
    });
    renderNames(view.playerNames);
    elements.scores[0].textContent = String(view.scores?.[0] ?? 0);
    elements.scores[1].textContent = String(view.scores?.[1] ?? 0);
    elements.round.textContent = `第 ${Math.max(1, Number(view.roundNumber) || 1)} / ${Number(view.maxRounds) || 3} 轮`;
    elements.status.textContent = statusText(view);

    const isCountdown = view.phase === "countdown";
    elements.countdownPanel.hidden = !isCountdown;
    elements.countdownPanel.setAttribute("aria-hidden", String(!isCountdown));
    elements.countdown.textContent = textOr(view.countdownLabel, countdownText(state.countdownMs));

    const isPaused = view.phase === "paused";
    elements.pausePanel.hidden = !isPaused;
    if (isPaused) {
      elements.pauseTitle.textContent = "制图暂停";
      elements.pauseReason.textContent = pauseText(state.pauseReason);
    }

    const isResult = view.phase === "round-end" || view.phase === "match-end";
    elements.resultPanel.hidden = !isResult;
    if (isResult) renderResult(view);

    const canPause = Boolean(view.canPause) || view.phase === "countdown" || view.phase === "playing";
    for (const button of elements.pauseButtons) button.disabled = !canPause;
    elements.resumeButton.disabled = !(Boolean(view.canResume) || view.phase === "paused");
    elements.startButton.disabled = !(Boolean(view.canStart) || view.phase === "ready");
    for (const button of elements.turnButtons) button.disabled = view.phase !== "playing";

    drawBoard(view.board, view);

    if (announce || phaseChanged) announceState(view);
    if (phaseChanged) scheduleFocus(view);
    lastAnnouncedPhase = view.phase;
  }

  function renderNames(names) {
    const cleanNames = Array.isArray(names) ? names : ["玩家 1", "玩家 2"];
    const first = textOr(cleanNames[0], "玩家 1");
    const second = textOr(cleanNames[1], "玩家 2");
    elements.names[0].textContent = first;
    elements.names[1].textContent = second;
    elements.nameLabels[0].forEach((element) => { element.textContent = first; });
    elements.nameLabels[1].forEach((element) => { element.textContent = second; });
    elements.turnButtons.forEach((button) => {
      const player = Number(button.dataset.player);
      const direction = Number(button.dataset.turn) < 0 ? "左转" : "右转";
      button.setAttribute("aria-label", `玩家${player === 0 ? "一" : "二"}${player === 0 ? first : second}${direction}`);
    });
  }

  function renderResult(view) {
    const result = describeOutcome(view);
    elements.resultTitle.textContent = result.title;
    elements.resultDetail.textContent = result.detail;
    elements.resultScore.textContent = `${view.scores?.[0] ?? 0} — ${view.scores?.[1] ?? 0}`;
    elements.nextButton.hidden = view.phase !== "round-end";
    elements.nextButton.disabled = !(Boolean(view.canNextRound) || view.phase === "round-end");
    elements.restartButton.hidden = view.phase !== "match-end";
    elements.restartButton.disabled = !(Boolean(view.canRestart) || view.phase === "match-end");
  }

  function describeOutcome(view) {
    const outcome = view.outcome || view.board?.outcome || null;
    const names = view.playerNames || ["玩家 1", "玩家 2"];
    const reasons = outcome?.reasons || [[], []];
    const flattened = reasons.flat();

    if (view.phase === "match-end") {
      const custom = typeof rawConfig.composeMatchResult === "function"
        ? rawConfig.composeMatchResult(view)
        : null;
      if (typeof custom === "string" && custom.trim()) {
        return { title: custom.trim(), detail: `${view.scores?.[0] ?? 0} — ${view.scores?.[1] ?? 0}` };
      }
    }

    if (outcome?.type === "winner" && [0, 1].includes(outcome.winner)) {
      return {
        title: textOr(outcome.title, `${names[outcome.winner]} 留住了这片边界`),
        detail: textOr(outcome.support, collisionDetail(reasons[outcome.winner === 0 ? 1 : 0])),
      };
    }
    if (flattened.includes("same-destination")) {
      return { title: "同时撞线，平局", detail: "同格相撞 · 双方不得分" };
    }
    if (flattened.includes("head-swap")) {
      return { title: "迎面换位，平局", detail: "这一局谁也没抢走边界。" };
    }
    return { title: "同时熄灭，平局", detail: "这一局谁也没抢走边界。" };
  }

  function collisionDetail(reasons) {
    if (reasons?.includes("wall")) return "对方越过了制图边界。";
    if (reasons?.includes("own-trail")) return "对方撞上了自己的旧轨。";
    if (reasons?.includes("rival-trail")) return "对方撞上了你的光轨。";
    return "最后一束光仍在边界里。";
  }

  function statusText(view) {
    if (view.phase === "playing") return "围猎进行中";
    if (view.phase === "paused") return pauseText(state.pauseReason);
    if (view.phase === "round-end" || view.phase === "match-end") return describeOutcome(view).title;
    if (view.phase === "countdown") return textOr(view.countdownLabel, countdownText(state.countdownMs));
    return "两束光同时出发";
  }

  function pauseText(reason) {
    if (reason === "hidden" || reason === "blur") return "离开页面，已为你们暂停";
    if (reason === "stalled") return "时间间隔过长，已安全暂停";
    return "制图暂停";
  }

  function announceState(view) {
    let message = statusText(view);
    if (view.phase === "round-end" || view.phase === "match-end") {
      const result = describeOutcome(view);
      message = `${result.title}。${result.detail}`;
    } else if (view.phase === "paused") {
      message = `${pauseText(state.pauseReason)}。按继续恢复。`;
    } else if (lastAnnouncedPhase === "paused" && view.phase !== "paused") {
      message = "比赛继续。";
    }
    elements.liveRegion.textContent = message;
  }

  function scheduleFocus(view) {
    const revision = Number(state.revision) || 0;
    if (revision === lastFocusedRevision) return;
    lastFocusedRevision = revision;
    globalThis.requestAnimationFrame(() => {
      if (view.phase === "paused") elements.pauseTitle.focus();
      if (view.phase === "round-end" || view.phase === "match-end") elements.resultTitle.focus();
      if (view.phase === "ready" && lastAnnouncedPhase !== null) elements.startButton.focus();
    });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(3, Math.max(1, globalThis.devicePixelRatio || 1));
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvasSize = { width: rect.width, height: rect.height, dpr };
    drawBoard(logic.getView(state).board, logic.getView(state));
  }

  function drawBoard(board, view) {
    const { width, height, dpr } = canvasSize;
    if (!width || !height) return;
    const dimensions = boardDimensions(board, view);
    const columns = dimensions.columns;
    const rows = dimensions.rows;
    const inset = Math.max(12, Math.min(width, height) * 0.035);
    const area = {
      left: inset,
      top: inset,
      width: width - inset * 2,
      height: height - inset * 2,
    };
    const cellWidth = area.width / columns;
    const cellHeight = area.height / rows;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    drawGrid(area, columns, rows, cellWidth, cellHeight, dpr);

    const snapshot = normalizeBoard(board, columns, rows);
    drawTrail(snapshot.occupiedCells, 0, area, cellWidth, cellHeight);
    drawTrail(snapshot.occupiedCells, 1, area, cellWidth, cellHeight);
    drawHeads(snapshot.players, area, cellWidth, cellHeight);
    drawCollision(snapshot.outcome, area, cellWidth, cellHeight, columns, rows);
  }

  function drawGrid(area, columns, rows, cellWidth, cellHeight, dpr) {
    context.save();
    context.strokeStyle = "rgba(154, 118, 68, 0.25)";
    context.lineWidth = 1 / dpr;
    context.beginPath();
    for (let x = 0; x <= columns; x += 1) {
      const px = area.left + x * cellWidth;
      context.moveTo(px, area.top);
      context.lineTo(px, area.top + area.height);
    }
    for (let y = 0; y <= rows; y += 1) {
      const py = area.top + y * cellHeight;
      context.moveTo(area.left, py);
      context.lineTo(area.left + area.width, py);
    }
    context.stroke();
    context.strokeStyle = "rgba(154, 118, 68, 0.58)";
    context.strokeRect(area.left, area.top, area.width, area.height);
    context.restore();
  }

  function drawTrail(cells, owner, area, cellWidth, cellHeight) {
    const trail = cells.filter((cell) => cell.owner === owner);
    if (!trail.length) return;
    const color = owner === 0 ? "#66dfd3" : "#ff805d";
    const lineWidth = Math.max(2, Math.min(7, Math.min(cellWidth, cellHeight) * 0.22));

    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = owner === 0 ? "rgba(102, 223, 211, 0.35)" : "rgba(255, 128, 93, 0.35)";
    context.shadowBlur = reducedMotion.matches ? 0 : Math.min(8, lineWidth * 1.35);

    context.beginPath();
    let previous = null;
    trail.forEach((cell) => {
      const point = cellCenter(cell, area, cellWidth, cellHeight);
      if (!previous || Math.abs(cell.x - previous.x) + Math.abs(cell.y - previous.y) !== 1) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
      previous = cell;
    });
    context.stroke();
    context.shadowBlur = 0;

    trail.forEach((cell, index) => {
      if (index === 0 || index % 4 !== 0) return;
      const point = cellCenter(cell, area, cellWidth, cellHeight);
      const size = Math.max(2, lineWidth * 0.75);
      context.strokeStyle = "rgba(7, 21, 35, 0.75)";
      context.lineWidth = Math.max(1, lineWidth * 0.25);
      context.beginPath();
      if (owner === 0) {
        context.moveTo(point.x - size, point.y);
        context.lineTo(point.x + size, point.y);
      } else {
        context.moveTo(point.x - size, point.y + size);
        context.lineTo(point.x + size, point.y - size);
      }
      context.stroke();
    });
    context.restore();
  }

  function drawHeads(players, area, cellWidth, cellHeight) {
    const size = Math.max(4, Math.min(12, Math.min(cellWidth, cellHeight) * 0.42));
    players.forEach((player, owner) => {
      if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return;
      const point = cellCenter(player, area, cellWidth, cellHeight);
      context.save();
      context.lineWidth = Math.max(2, size * 0.22);
      context.strokeStyle = owner === 0 ? "#66dfd3" : "#ff805d";
      context.fillStyle = "#0a1c2d";
      context.shadowColor = owner === 0 ? "rgba(102, 223, 211, 0.52)" : "rgba(255, 128, 93, 0.52)";
      context.shadowBlur = reducedMotion.matches ? 0 : 8;
      context.beginPath();
      if (owner === 0) {
        context.arc(point.x, point.y, size, 0.22 * Math.PI, 1.82 * Math.PI);
      } else {
        context.moveTo(point.x, point.y - size);
        context.lineTo(point.x + size, point.y);
        context.lineTo(point.x, point.y + size);
        context.lineTo(point.x - size, point.y);
        context.closePath();
      }
      context.fill();
      context.stroke();
      context.restore();
    });
  }

  function drawCollision(outcome, area, cellWidth, cellHeight, columns, rows) {
    if (!outcome?.attempts) return;
    const unique = new Map();
    outcome.attempts.forEach((attempt) => {
      if (!attempt || !Number.isFinite(attempt.x) || !Number.isFinite(attempt.y)) return;
      const x = Math.max(0, Math.min(columns - 1, attempt.x));
      const y = Math.max(0, Math.min(rows - 1, attempt.y));
      unique.set(`${x}:${y}`, { x, y });
    });

    context.save();
    context.strokeStyle = "#ffc069";
    context.lineWidth = 1.5;
    for (const cell of unique.values()) {
      const point = cellCenter(cell, area, cellWidth, cellHeight);
      const inner = Math.max(4, Math.min(cellWidth, cellHeight) * 0.38);
      const outer = inner * (reducedMotion.matches ? 1.55 : 2);
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4;
        context.beginPath();
        context.moveTo(point.x + Math.cos(angle) * inner, point.y + Math.sin(angle) * inner);
        context.lineTo(point.x + Math.cos(angle) * outer, point.y + Math.sin(angle) * outer);
        context.stroke();
      }
    }
    context.restore();
  }

  function normalizeBoard(board, columns, rows) {
    if (board && Array.isArray(board.occupiedCells) && Array.isArray(board.players)) return board;
    return {
      occupiedCells: [
        { x: Math.min(columns - 1, 8), y: Math.min(rows - 1, 8), owner: 0 },
        { x: Math.max(0, columns - 9), y: Math.max(0, rows - 9), owner: 1 },
      ],
      players: [
        { x: Math.min(columns - 1, 8), y: Math.min(rows - 1, 8) },
        { x: Math.max(0, columns - 9), y: Math.max(0, rows - 9) },
      ],
      outcome: null,
    };
  }

  function boardDimensions(board, view) {
    const grid = view.rules?.grid || view.grid || board?.grid || rawConfig.grid || {};
    return {
      columns: validInteger(grid.columns, 12, 160, 48),
      rows: validInteger(grid.rows, 8, 120, 32),
    };
  }

  function cellCenter(cell, area, cellWidth, cellHeight) {
    return {
      x: area.left + (cell.x + 0.5) * cellWidth,
      y: area.top + (cell.y + 0.5) * cellHeight,
    };
  }

  function countdownText(milliseconds) {
    return String(Math.max(1, Math.ceil((Number(milliseconds) || 0) / 1000)));
  }

  function validNumber(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= minimum && number <= maximum ? number : fallback;
  }

  function validInteger(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
  }

  function textOr(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }
})();
