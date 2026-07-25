(function () {
  "use strict";

  const logic = globalThis.HoneycombPassageLogic;
  const experience = document.querySelector("#honeycomb-passage");
  const experienceRoot = document.querySelector("#experience-root");
  const introPanel = document.querySelector("#intro-panel");
  const primaryAction = document.querySelector("#primary-action");
  const turnPanel = document.querySelector("#turn-panel");
  const turnHeading = document.querySelector("#turn-heading");
  const turnCopy = document.querySelector("#turn-copy");
  const board = document.querySelector("#honeycomb-board");
  const boardInstruction = document.querySelector("#board-instruction");
  const routeLayer = document.querySelector("#route-layer");
  const modeMove = document.querySelector("#mode-move");
  const modeSeal = document.querySelector("#mode-seal");
  const visibleStatus = document.querySelector("#visible-status");
  const liveStatus = document.querySelector("#live-status");
  const handoffGate = document.querySelector("#handoff-gate");
  const handoffTitle = document.querySelector("#handoff-title");
  const handoffCopy = document.querySelector("#handoff-copy");
  const handoffConfirm = document.querySelector("#handoff-confirm");
  const resultPanel = document.querySelector("#result-panel");
  const resultTitle = document.querySelector("#result-title");
  const resultReason = document.querySelector("#result-reason");
  const resultSummaries = document.querySelector("#result-summaries");
  const finalNote = document.querySelector("#final-note");
  const restartAction = document.querySelector("#restart-action");
  const playerSummaries = [
    document.querySelector("#player-summary-0"),
    document.querySelector("#player-summary-1"),
  ];
  const playerNames = [
    document.querySelector("#player-name-0"),
    document.querySelector("#player-name-1"),
  ];
  const playerSeals = [
    document.querySelector("#player-seals-0"),
    document.querySelector("#player-seals-1"),
  ];
  const playerDistances = [
    document.querySelector("#player-distance-0"),
    document.querySelector("#player-distance-1"),
  ];

  let state = null;
  let view = null;
  let currentMode = "move";
  let handoffPending = false;
  let rejectedKey = null;
  let statusMessage = "蜜黄先行动。";
  let focusToken = 0;
  const cellButtons = new Map();

  if (!logic || typeof logic.createInitialState !== "function"
    || typeof logic.getScreenView !== "function" || typeof logic.reduce !== "function") {
    experienceRoot.hidden = false;
    turnHeading.textContent = "这一局暂时没有准备好";
    turnCopy.textContent = "请确认 config.js、logic.js 与 app.js 都在当前目录。";
    introPanel.hidden = true;
    return;
  }

  state = logic.createInitialState(globalThis.HONEYCOMB_PASSAGE_CONFIG);
  view = logic.getScreenView(state);
  createBoard(view);
  bindEvents();
  experienceRoot.hidden = false;
  primaryAction.hidden = false;
  render();

  function bindEvents() {
    primaryAction.addEventListener("click", startGame);
    restartAction.addEventListener("click", restartGame);
    modeMove.addEventListener("click", function () {
      selectMode("move");
    });
    modeSeal.addEventListener("click", function () {
      selectMode("seal");
    });
    handoffConfirm.addEventListener("click", confirmHandoff);
    board.addEventListener("click", function (event) {
      const cellButton = event.target.closest("[data-cell-key]");
      if (!cellButton || handoffPending || view.phase !== "playing") return;
      activateCell(cellButton);
    });
  }

  function createBoard(initialView) {
    const fragment = document.createDocumentFragment();
    for (const cell of initialView.boardCells) {
      const key = logic.cellKey(cell);
      const position = boardPosition(cell);
      const cellButton = document.createElement("button");
      cellButton.type = "button";
      cellButton.className = "hex-cell";
      cellButton.dataset.cellKey = key;
      cellButton.style.setProperty("--cell-x", String(position.x));
      cellButton.style.setProperty("--cell-y", String(position.y));
      cellButton.setAttribute("aria-label", `坐标 ${key}，空格`);
      cellButton.append(
        span("cell-mark", ""),
        span("cell-object", ""),
      );
      cellButtons.set(key, cellButton);
      fragment.append(cellButton);
    }
    board.replaceChildren(fragment);
  }

  function startGame() {
    const nextState = logic.reduce(state, { type: "START" });
    if (nextState === state) return;
    state = nextState;
    view = logic.getScreenView(state);
    currentMode = "move";
    handoffPending = false;
    rejectedKey = null;
    statusMessage = `${view.playerNames[view.activePlayer]}先行动。`;
    announce(`${view.playerNames[view.activePlayer]}先行动。`);
    render();
    scheduleFocus("turn");
  }

  function restartGame() {
    const nextState = logic.reduce(state, { type: "RESTART" });
    if (nextState === state) return;
    state = nextState;
    view = logic.getScreenView(state);
    currentMode = "move";
    handoffPending = false;
    rejectedKey = null;
    statusMessage = `${view.playerNames[0]}先行动。`;
    announce("新一局已经准备好。");
    render();
    scheduleFocus("primary");
  }

  function selectMode(mode) {
    if (handoffPending || view.phase !== "playing") return;
    if (mode === "seal" && view.sealsRemaining[view.activePlayer] === 0) {
      announce("封蜡已经用完。");
      return;
    }
    currentMode = mode;
    rejectedKey = null;
    statusMessage = mode === "move"
      ? "选择相邻空格移动。"
      : "选择空格封蜡；不能让任何一方无路可走。";
    render();
  }

  function activateCell(cellButton) {
    const key = cellButton.dataset.cellKey;
    const legalKeys = currentMode === "move" ? view.legalMoveKeys : view.legalSealKeys;
    if (!legalKeys.includes(key)) {
      rejectedKey = key;
      statusMessage = rejectionMessage(key);
      announce(statusMessage);
      render();
      scheduleFocus("cell", key);
      return;
    }

    const target = logic.parseCellKey(key);
    const actingPlayer = view.activePlayer;
    const nextState = logic.reduce(state, {
      type: "ACT",
      player: actingPlayer,
      move: currentMode,
      target,
    });
    if (nextState === state) {
      rejectedKey = key;
      statusMessage = currentMode === "move" ? "这格不能移动。" : "这格不能封蜡。";
      announce(statusMessage);
      render();
      scheduleFocus("cell", key);
      return;
    }

    state = nextState;
    const nextView = logic.getScreenView(state);
    const actionMessage = describeLatestAction(nextView);
    view = nextView;
    currentMode = "move";
    rejectedKey = null;
    statusMessage = actionMessage;
    announce(actionMessage);
    if (nextView.phase === "playing") {
      showHandoff(nextView);
    } else {
      handoffPending = false;
      render();
      scheduleFocus("result");
    }
  }

  function showHandoff(nextView) {
    handoffPending = true;
    const nextName = nextView.playerNames[nextView.activePlayer];
    handoffTitle.textContent = `请把页面交给${nextName}`;
    handoffCopy.textContent = `${nextName}确认后再选择移动或封蜡。`;
    handoffConfirm.textContent = `交给下一位 · ${nextName}拿好了`;
    render();
    scheduleFocus("handoff");
  }

  function confirmHandoff() {
    if (!handoffPending || view.phase !== "playing") return;
    handoffPending = false;
    rejectedKey = null;
    statusMessage = `轮到${view.playerNames[view.activePlayer]}。`;
    announce(statusMessage);
    render();
    scheduleFocus("turn");
  }

  function render() {
    experience.dataset.phase = view.phase;
    introPanel.hidden = view.phase !== "intro";
    turnPanel.hidden = view.phase === "intro";
    resultPanel.hidden = view.phase !== "result";
    boardInstruction.hidden = view.phase !== "playing";
    visibleStatus.hidden = view.phase !== "playing";
    modeMove.closest(".mode-switch").hidden = view.phase !== "playing";
    handoffGate.hidden = !handoffPending;
    primaryAction.hidden = view.phase !== "intro";

    renderTurn();
    renderPlayers();
    renderModes();
    renderCells();
    renderRoutes();
    renderResult();
    visibleStatus.textContent = statusMessage;
  }

  function renderTurn() {
    if (view.phase === "intro") return;
    if (view.phase === "playing") {
      const activeName = view.playerNames[view.activePlayer];
      turnHeading.textContent = `回合 ${view.round} · ${activeName}行动`;
      turnCopy.textContent = handoffPending
        ? `请把页面交给${activeName}`
        : "选一格移动，或放下一枚封蜡";
      return;
    }
    turnHeading.textContent = "这一局结束了";
    turnCopy.textContent = resultHeading(view.result);
  }

  function renderPlayers() {
    for (let player = 0; player < logic.PLAYER_COUNT; player += 1) {
      playerNames[player].textContent = view.playerNames[player];
      playerSeals[player].textContent = String(view.sealsRemaining[player]);
      playerDistances[player].textContent = String(view.distances[player]);
      playerSummaries[player].classList.toggle(
        "is-active",
        view.phase === "playing" && view.activePlayer === player && !handoffPending,
      );
      playerSummaries[player].classList.toggle(
        "is-winner",
        view.phase === "result" && view.result.winner === player,
      );
    }
  }

  function renderModes() {
    modeMove.setAttribute("aria-pressed", String(currentMode === "move"));
    modeSeal.setAttribute("aria-pressed", String(currentMode === "seal"));
    modeMove.disabled = handoffPending;
    modeSeal.disabled = handoffPending || view.sealsRemaining[view.activePlayer] === 0;
    if (view.phase !== "playing") {
      modeMove.disabled = true;
      modeSeal.disabled = true;
    }
  }

  function renderCells() {
    const positionKeys = view.positions.map(logic.cellKey);
    const blocked = new Set(view.blockedKeys);
    const legalMoveKeys = new Set(view.legalMoveKeys);
    const legalSealKeys = new Set(view.legalSealKeys);

    for (const cell of view.boardCells) {
      const key = logic.cellKey(cell);
      const cellButton = cellButtons.get(key);
      const cellMark = cellButton.querySelector(".cell-mark");
      const cellObject = cellButton.querySelector(".cell-object");
      const player = positionKeys.indexOf(key);
      const isBlocked = blocked.has(key);
      const isMove = view.phase === "playing" && currentMode === "move" && legalMoveKeys.has(key);
      const isSeal = view.phase === "playing" && currentMode === "seal" && legalSealKeys.has(key);
      const targetOwner = goalOwner(cell);

      cellButton.className = "hex-cell";
      cellButton.disabled = handoffPending;
      if (view.phase !== "playing") cellButton.disabled = true;
      cellButton.classList.toggle("is-legal-move", isMove);
      cellButton.classList.toggle("is-legal-seal", isSeal);
      cellButton.classList.toggle("is-blocked", isBlocked);
      cellButton.classList.toggle("is-rejected", rejectedKey === key);
      cellButton.classList.toggle("is-yellow-goal", targetOwner === logic.YELLOW);
      cellButton.classList.toggle("is-purple-goal", targetOwner === logic.PURPLE);
      cellButton.classList.toggle("has-yellow", player === logic.YELLOW);
      cellButton.classList.toggle("has-purple", player === logic.PURPLE);

      cellMark.textContent = isMove ? "○" : isSeal ? "╱" : "";
      cellObject.replaceChildren();
      if (player !== -1) cellObject.append(buildPawn(player));
      if (isBlocked) cellObject.append(buildWax());
      cellButton.setAttribute("aria-label", cellLabel(cell, key, player, isBlocked, isMove, isSeal));
    }
  }

  function renderRoutes() {
    routeLayer.replaceChildren();
    if (view.phase !== "result") return;
    const current = logic.STARTS.map((cell) => ({ q: cell.q, r: cell.r }));
    for (const event of view.history) {
      if (event.type !== "move") continue;
      const target = logic.parseCellKey(event.targetKey);
      routeLayer.append(buildRouteSegment(current[event.player], target, event.player));
      current[event.player] = target;
    }
  }

  function renderResult() {
    if (view.phase !== "result") {
      resultSummaries.replaceChildren();
      finalNote.textContent = "";
      return;
    }
    resultTitle.textContent = resultHeading(view.result);
    resultReason.textContent = resultDetail(view.result);
    finalNote.textContent = view.finalNote;
    const fragment = document.createDocumentFragment();
    for (let player = 0; player < logic.PLAYER_COUNT; player += 1) {
      const summary = document.createElement("p");
      summary.className = `result-summary result-summary--${player === 0 ? "yellow" : "purple"}`;
      summary.textContent = `${view.playerNames[player]} · 封蜡 ${view.sealsRemaining[player]} · 距终点 ${view.distances[player]}`;
      fragment.append(summary);
    }
    resultSummaries.replaceChildren(fragment);
  }

  function cellLabel(cell, key, player, isBlocked, isMove, isSeal) {
    const coordinate = `坐标 ${key}`;
    const goal = goalOwner(cell);
    const goalText = goal === logic.YELLOW
      ? "，蜜黄目标边"
      : goal === logic.PURPLE ? "，暮紫目标边" : "";
    if (player !== -1) return `${coordinate}${goalText}，${view.playerNames[player]}棋子`;
    if (isBlocked) return `${coordinate}${goalText}，已封蜡`;
    if (isMove) return `${coordinate}${goalText}，${view.playerNames[view.activePlayer]}可移动`;
    if (isSeal) return `${coordinate}${goalText}，${view.playerNames[view.activePlayer]}可封蜡`;
    if (view.phase === "playing") return `${coordinate}${goalText}，当前模式下不合法`;
    return `${coordinate}${goalText}，空格`;
  }

  function rejectionMessage(key) {
    const playerAtCell = view.positions.map(logic.cellKey).indexOf(key);
    if (playerAtCell !== -1) return `这格被${view.playerNames[playerAtCell]}占着。`;
    if (view.blockedKeys.includes(key)) return "这格已经封蜡。";
    if (currentMode === "move") return "这格不能移动；只能选择相邻的空格。";
    if (view.sealsRemaining[view.activePlayer] === 0) return "这格不能封蜡；封蜡已经用完。";

    const blocked = [...view.blockedKeys, key];
    const yellowDistance = logic.findShortestDistance(
      view.positions[logic.YELLOW],
      logic.YELLOW,
      blocked,
    );
    const purpleDistance = logic.findShortestDistance(
      view.positions[logic.PURPLE],
      logic.PURPLE,
      blocked,
    );
    if (yellowDistance === null && purpleDistance === null) return "这格会让双方无路可走。";
    if (yellowDistance === null) return `这格会让${view.playerNames[logic.YELLOW]}无路可走。`;
    if (purpleDistance === null) return `这格会让${view.playerNames[logic.PURPLE]}无路可走。`;
    return "这格不能封蜡。";
  }

  function describeLatestAction(nextView) {
    const event = nextView.history[nextView.history.length - 1];
    const name = nextView.playerNames[event.player];
    if (event.type === "move") return `${name}走到 ${event.targetKey}。`;
    return `${name}封住 ${event.targetKey}，还剩 ${nextView.sealsRemaining[event.player]} 枚封蜡。`;
  }

  function resultHeading(result) {
    if (!result) return "这一局结束了";
    if (result.reason === "reached-goal") {
      return `${view.playerNames[result.winner]}先到对岸`;
    }
    if (result.reason === "immobilized") {
      return `${view.playerNames[result.winner]}守住了蜜径`;
    }
    if (result.winner === null) return "16 回合结束 · 平局";
    return `${view.playerNames[result.winner]}在 16 回合后领先`;
  }

  function resultDetail(result) {
    if (result.reason === "reached-goal") return `第 ${view.ply} 手抵达目标边。`;
    if (result.reason === "immobilized") {
      return `${view.playerNames[result.immobilizedPlayer]}暂时无路可走。`;
    }
    if (result.tiebreak === "distance") return "距离更近，赢下这一局。";
    if (result.tiebreak === "seals") return "距离相同，剩余封蜡更多。";
    return "距离与剩余封蜡都相同。";
  }

  function buildPawn(player) {
    const pawn = span(`pawn pawn--${player === logic.YELLOW ? "yellow" : "purple"}`, "");
    pawn.setAttribute("aria-hidden", "true");
    pawn.append(span("pawn-head", ""), span("pawn-body", ""), span("pawn-mark", player === 0 ? "✣" : "◇"));
    return pawn;
  }

  function buildWax() {
    const wax = span("wax-seal", "封");
    wax.setAttribute("aria-hidden", "true");
    return wax;
  }

  function buildRouteSegment(from, to, player) {
    const start = boardPosition(from);
    const end = boardPosition(to);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const segment = span(`route-segment route-segment--${player === 0 ? "yellow" : "purple"}`, "");
    segment.style.left = `${start.x}%`;
    segment.style.top = `${start.y}%`;
    segment.style.width = `${Math.hypot(deltaX, deltaY)}%`;
    segment.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
    return segment;
  }

  function boardPosition(cell) {
    return {
      x: 50 + (cell.q + cell.r / 2) * (100 / 7),
      y: 50 + cell.r * 13.62,
    };
  }

  function goalOwner(cell) {
    if (logic.isGoalCell(logic.YELLOW, cell)) return logic.YELLOW;
    if (logic.isGoalCell(logic.PURPLE, cell)) return logic.PURPLE;
    return null;
  }

  function span(className, text) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = text;
    return node;
  }

  function announce(message) {
    liveStatus.textContent = "";
    queueMicrotask(function () {
      liveStatus.textContent = message;
    });
  }

  function scheduleFocus(kind, key) {
    const token = ++focusToken;
    const activeAtRequest = document.activeElement;
    queueMicrotask(function () {
      if (token !== focusToken || document.hidden || !document.hasFocus()) return;
      if (activeAtRequest && activeAtRequest !== document.body
        && activeAtRequest.isConnected && kind !== "cell") {
        const owned = activeAtRequest === primaryAction
          || activeAtRequest === handoffConfirm
          || activeAtRequest === restartAction
          || activeAtRequest.closest(".mode-switch")
          || activeAtRequest.closest(".honeycomb-board");
        if (!owned) return;
      }
      if (kind === "cell") {
        const cellButton = cellButtons.get(key);
        if (cellButton && !cellButton.disabled) cellButton.focus({ preventScroll: true });
      } else if (kind === "handoff") {
        handoffConfirm.focus({ preventScroll: true });
      } else if (kind === "result") {
        resultTitle.focus({ preventScroll: true });
      } else if (kind === "primary") {
        primaryAction.focus({ preventScroll: true });
      } else {
        turnHeading.focus({ preventScroll: true });
      }
    });
  }
})();
