(function () {
  "use strict";

  const logic = globalThis.DOTS_AND_BOXES_LOGIC;
  if (!logic) {
    document.body.textContent = "这一格归谁加载失败，请确认 config.js、logic.js 与页面放在同一目录。";
    return;
  }

  const config = logic.sanitizeConfig(globalThis.DOTS_AND_BOXES_CONFIG);
  const board = document.querySelector("#board");
  const actionStage = document.querySelector("#action-stage");
  const turnStatus = document.querySelector("#turn-status");
  const remainingStatus = document.querySelector("#remaining-status");
  const eventMessage = document.querySelector("#event-message");
  const liveRegion = document.querySelector("#live-region");
  const playerCards = [document.querySelector("#player-0"), document.querySelector("#player-1")];
  const playerNameNodes = [document.querySelector("#player-name-0"), document.querySelector("#player-name-1")];
  const playerScoreNodes = [document.querySelector("#player-score-0"), document.querySelector("#player-score-1")];
  const edgeButtons = new Map();
  const boxNodes = new Map();
  let state = logic.createInitialState(config);
  let visibleEvent = "轮流连起相邻的点。圈住一格，它就归你，而且还能再走一步。";
  let focusRevision = 0;

  createBoard();
  render({ kind: "primary" });

  actionStage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "start") {
      state = logic.start(state);
      visibleEvent = `${state.playerNames[state.currentPlayer]}先落笔。`;
      liveRegion.textContent = visibleEvent;
      render({ kind: "first-edge" });
      return;
    }
    if (button.dataset.action === "restart") {
      state = logic.restart(state);
      visibleEvent = `${state.playerNames[state.starter]}成为新一页的先手。`;
      liveRegion.textContent = visibleEvent;
      render({ kind: "primary" });
    }
  });

  board.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edge-id]");
    if (!button || button.disabled) return;
    commitEdge(button.dataset.edgeId);
  });

  function createBoard() {
    const fragment = document.createDocumentFragment();
    for (const edgeId of logic.getAllEdgeIds()) {
      const edge = logic.parseEdgeId(edgeId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `edge-button edge-button--${edge.orientation === "H" ? "horizontal" : "vertical"}`;
      button.dataset.edgeId = edgeId;
      button.style.gridRow = String(edge.orientation === "H" ? edge.row * 2 + 1 : edge.row * 2 + 2);
      button.style.gridColumn = String(edge.orientation === "H" ? edge.column * 2 + 2 : edge.column * 2 + 1);
      button.disabled = true;
      edgeButtons.set(edgeId, button);
      fragment.append(button);
    }

    for (let row = 0; row < logic.DOT_COUNT; row += 1) {
      for (let column = 0; column < logic.DOT_COUNT; column += 1) {
        const dot = document.createElement("span");
        dot.className = "board-dot";
        dot.style.gridRow = String(row * 2 + 1);
        dot.style.gridColumn = String(column * 2 + 1);
        dot.setAttribute("aria-hidden", "true");
        fragment.append(dot);
      }
    }

    for (const boxId of logic.getAllBoxIds()) {
      const box = logic.parseBoxId(boxId);
      const owner = document.createElement("span");
      owner.className = "box-owner";
      owner.style.gridRow = String(box.row * 2 + 2);
      owner.style.gridColumn = String(box.column * 2 + 2);
      owner.setAttribute("role", "img");
      boxNodes.set(boxId, owner);
      fragment.append(owner);
    }
    board.append(fragment);
  }

  function commitEdge(edgeId) {
    const next = logic.claimEdge(state, edgeId);
    if (next === state) return;
    state = next;
    visibleEvent = describeMove(state.lastMove);
    liveRegion.textContent = `${visibleEvent} ${scoreSummary()}`;
    render(state.phase === logic.PHASES.FINISHED
      ? { kind: "result" }
      : { kind: "next-edge", edgeId });
  }

  function describeMove(lastMove) {
    const playerName = state.playerNames[lastMove.player];
    if (lastMove.kind === "finished") return "最后一格已经有归属。";
    if (lastMove.kind === "capture-two") return `一笔圈住两格，${playerName}继续。`;
    if (lastMove.kind === "capture-one") return `${playerName}圈住一格，继续落笔。`;
    return `这一笔没有围成格，轮到${state.playerNames[state.currentPlayer]}。`;
  }

  function render(focusRequest) {
    const view = logic.getViewModel(state);
    document.body.dataset.stage = view.phase;
    for (let player = 0; player < 2; player += 1) {
      playerNameNodes[player].textContent = view.playerNames[player];
      playerScoreNodes[player].textContent = String(view.scores[player]);
      playerCards[player].classList.toggle("is-current", view.phase !== logic.PHASES.FINISHED && view.currentPlayer === player);
      playerCards[player].classList.toggle("is-winner", view.result?.winnerIndex === player);
    }
    turnStatus.textContent = turnCopy(view);
    remainingStatus.textContent = `还剩 ${view.remainingBoxes} 格`;
    eventMessage.textContent = visibleEvent;
    renderBoard(view);
    renderAction(view);
    scheduleFocus(focusRequest);
  }

  function turnCopy(view) {
    if (view.phase === logic.PHASES.INTRO) return `${view.playerNames[view.starter]}先落笔`;
    if (view.phase === logic.PHASES.FINISHED) return `这一页写满了 · ${view.scores[0]} 比 ${view.scores[1]}`;
    return `轮到${view.currentPlayerName}`;
  }

  function renderBoard(view) {
    board.dataset.moveNumber = String(view.moveNumber);
    const edgeOwners = new Map(view.edges.map((edge) => [edge.id, edge.owner]));
    for (const [edgeId, button] of edgeButtons) {
      const owner = edgeOwners.get(edgeId);
      const claimed = owner === 0 || owner === 1;
      button.disabled = view.controlsDisabled || claimed;
      button.classList.toggle("is-claimed", claimed);
      button.classList.toggle("is-red", owner === 0);
      button.classList.toggle("is-blue", owner === 1);
      button.setAttribute("aria-label", edgeLabel(edgeId, owner, view.currentPlayerName, view.playerNames));
    }

    for (const boxState of view.boxes) {
      const node = boxNodes.get(boxState.id);
      node.classList.toggle("is-red", boxState.owner === 0);
      node.classList.toggle("is-blue", boxState.owner === 1);
      node.textContent = boxState.owner === null ? "" : boxState.owner === 0 ? "朱" : "蓝";
      node.setAttribute("aria-label", boxLabel(boxState, view.playerNames));
    }
  }

  function edgeLabel(edgeId, owner, currentPlayerName, playerNames) {
    const edge = logic.parseEdgeId(edgeId);
    const start = `第 ${edge.row + 1} 行第 ${edge.column + 1} 个点`;
    const end = edge.orientation === "H"
      ? `同行右侧相邻点`
      : `同列下方相邻点`;
    if (owner === 0 || owner === 1) return `${start}到${end}的线，已由${playerNames[owner]}落笔`;
    return `${start}到${end}的空线，${currentPlayerName}可以落笔`;
  }

  function boxLabel(boxState, playerNames) {
    const box = logic.parseBoxId(boxState.id);
    const position = `第 ${box.row + 1} 行第 ${box.column + 1} 格`;
    return boxState.owner === null ? `${position}，尚未归属` : `${position}，归${playerNames[boxState.owner]}`;
  }

  function renderAction(view) {
    actionStage.replaceChildren();
    if (view.phase === logic.PHASES.INTRO) {
      actionStage.append(actionButton("开始落笔", "start"));
      return;
    }
    if (view.phase !== logic.PHASES.FINISHED) return;

    const copy = logic.resolveResultCopy(state, config);
    const result = document.createElement("div");
    result.className = "result-sheet";
    if (view.result.winnerIndex === 0) result.classList.add("is-red");
    if (view.result.winnerIndex === 1) result.classList.add("is-blue");
    const title = document.createElement("h2");
    title.id = "result-title";
    title.tabIndex = -1;
    title.textContent = copy.title;
    const body = document.createElement("p");
    body.textContent = copy.body;
    result.append(title, body);
    actionStage.append(result, actionButton("再来一页", "restart"));
  }

  function actionButton(label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-action";
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  function scoreSummary() {
    return `${state.playerNames[0]} ${state.scores[0]} 格，${state.playerNames[1]} ${state.scores[1]} 格。`;
  }

  function scheduleFocus(request = { kind: "primary" }) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      if (request.kind === "result") {
        document.querySelector("#result-title")?.focus({ preventScroll: true });
        return;
      }
      if (request.kind === "primary") {
        actionStage.querySelector("button")?.focus({ preventScroll: true });
        return;
      }
      if (request.kind === "first-edge") {
        firstAvailableEdge()?.focus({ preventScroll: true });
        return;
      }
      if (request.kind === "next-edge") {
        nextAvailableEdge(request.edgeId)?.focus({ preventScroll: true });
      }
    });
  }

  function firstAvailableEdge() {
    return [...edgeButtons.values()].find((button) => !button.disabled) || null;
  }

  function nextAvailableEdge(edgeId) {
    const buttons = [...edgeButtons.values()];
    const currentIndex = buttons.findIndex((button) => button.dataset.edgeId === edgeId);
    for (let offset = 1; offset <= buttons.length; offset += 1) {
      const button = buttons[(currentIndex + offset) % buttons.length];
      if (!button.disabled) return button;
    }
    return null;
  }
})();
