(function () {
  "use strict";

  const logic = globalThis.PAPER_SOCCER_LOGIC;
  if (!logic) {
    document.body.textContent = "纸上球局加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const rawConfig = globalThis.PAPER_SOCCER_CONFIG;
  const config = logic.sanitizeConfig(rawConfig);
  const starterPolicy = config !== logic.DEFAULT_CONFIG && typeof rawConfig?.chooseNextStarter === "function"
    ? rawConfig.chooseNextStarter
    : null;
  const app = document.querySelector(".app");
  const pitch = document.querySelector("#pitch");
  const pitchBase = document.querySelector("#pitch-base");
  const trailLayer = document.querySelector("#trail-layer");
  const targetLayer = document.querySelector("#target-layer");
  const ballLayer = document.querySelector("#ball-layer");
  const roundStatus = document.querySelector("#round-status");
  const turnBanner = document.querySelector("#turn-banner");
  const eventMessage = document.querySelector("#event-message");
  const redName = document.querySelector("#red-name");
  const blueName = document.querySelector("#blue-name");
  const redScore = document.querySelector("#red-score");
  const blueScore = document.querySelector("#blue-score");
  const controlsTitle = document.querySelector("#controls-title");
  const controlArea = document.querySelector("#control-area");
  const liveRegion = document.querySelector("#live-region");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const grid = Object.freeze({ left: 80, top: 100, step: 75, goalTop: 25, goalBottom: 925 });

  let state = logic.createInitialState(config);
  let visibleEvent = "球从正中央开始。";
  let focusRevision = 0;

  renderPitchBase();
  render({ kind: "primary" });

  app.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action) handleAction(action);
  });

  pitch.addEventListener("keydown", (event) => {
    const target = event.target.closest(".legal-target");
    if (!target || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    moveToDataset(target, "target");
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || state.phase !== "playing") return;
    const directionId = logic.directionForKey(event.key);
    if (!directionId) return;
    event.preventDefault();
    moveDirection(directionId, "direction");
  });

  function handleAction(node) {
    if (node.disabled) return;
    const action = node.dataset.action;
    if (action === "start") {
      state = logic.start(state);
      visibleEvent = `${playerName(state.currentPlayer)}先开球。`;
      liveRegion.textContent = `${visibleEvent}${turnText()}`;
      render({ kind: "first-move" });
      return;
    }
    if (action === "direction") {
      moveDirection(node.dataset.direction, "direction");
      return;
    }
    if (action === "target") {
      moveToDataset(node, "target");
      return;
    }
    if (action === "rematch") {
      const nextStarter = logic.resolveNextStarter(starterPolicy, {
        previousStarter: state.starter,
        winner: state.winner,
        winReason: state.winReason,
        matchNumber: state.matchNumber,
      });
      state = logic.rematch(state, nextStarter);
      visibleEvent = `${playerName(nextStarter)}取得新一局开球权。`;
      liveRegion.textContent = `${visibleEvent}${turnText()}`;
      render({ kind: "first-move" });
      return;
    }
    if (action === "reset") {
      state = logic.resetSeries(state, config.firstPlayer);
      visibleEvent = "胜局已经清空，球回到正中央。";
      liveRegion.textContent = visibleEvent;
      render({ kind: "primary" });
    }
  }

  function moveDirection(directionId, focusKind) {
    const candidate = logic.getLegalMoves(state).find((move) => move.id === directionId);
    if (!candidate) return;
    commitMove(candidate.target, { kind: focusKind, direction: directionId });
  }

  function moveToDataset(node, focusKind) {
    const x = Number(node.dataset.targetX);
    const y = Number(node.dataset.targetY);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    commitMove({ x, y }, { kind: focusKind });
  }

  function commitMove(target, focusRequest) {
    const previous = state;
    const next = logic.move(state, target);
    if (next === state) return;
    state = next;
    visibleEvent = describeTransition(previous, next);
    liveRegion.textContent = `${visibleEvent}${state.phase === "playing" ? turnText() : ""}`;
    render(state.phase === "complete" ? { kind: "primary" } : focusRequest);
  }

  function describeTransition(previous, next) {
    const owner = playerName(previous.currentPlayer);
    if (next.phase === "complete" && next.winReason === "trap") {
      return `${owner}借力后没有出口，${playerName(next.winner)}赢下这一局。`;
    }
    if (next.phase === "complete") {
      const ownGoal = next.winner !== previous.currentPlayer;
      return ownGoal
        ? `${owner}把球送进了自己的球门，${playerName(next.winner)}赢下这一局。`
        : `${playerName(next.winner)}把球送进球门，赢下这一局。`;
    }
    if (next.lastMove.bounced) {
      return `借到旧点或边线，${owner}继续走 · 连续 ${next.bounceChain} 次。`;
    }
    return `落到新点，轮到${playerName(next.currentPlayer)}。`;
  }

  function render(focusRequest) {
    app.dataset.phase = state.phase;
    app.dataset.current = state.currentPlayer;
    roundStatus.textContent = `第 ${state.turnNumber} 回合`;
    redName.textContent = config.redName;
    blueName.textContent = config.blueName;
    redScore.textContent = String(state.scores.red);
    blueScore.textContent = String(state.scores.blue);
    turnBanner.textContent = bannerText();
    eventMessage.textContent = visibleEvent;
    renderTrails();
    renderTargets();
    renderBall();
    renderControls();
    scheduleFocus(focusRequest);
  }

  function bannerText() {
    if (state.phase === "complete") return `${playerName(state.winner)}赢下第 ${state.matchNumber} 局`;
    const player = state.phase === "intro" ? state.starter : state.currentPlayer;
    const action = state.phase === "intro" ? "开球" : "进攻";
    return `${playerName(player)}${action} · 朝${player === "red" ? "上方" : "下方"}球门`;
  }

  function turnText() {
    return `${playerName(state.currentPlayer)}朝${state.currentPlayer === "red" ? "上方" : "下方"}球门进攻。`;
  }

  function renderPitchBase() {
    pitchBase.replaceChildren();
    const fieldLeft = grid.left;
    const fieldRight = pointX(logic.FIELD_WIDTH);
    const fieldTop = grid.top;
    const fieldBottom = pointY(logic.FIELD_HEIGHT);
    const mouthLeft = pointX(3);
    const mouthRight = pointX(5);

    for (let x = 1; x < logic.FIELD_WIDTH; x += 1) {
      pitchBase.append(svgLine(pointX(x), fieldTop, pointX(x), fieldBottom, "grid-line"));
    }
    for (let y = 1; y < logic.FIELD_HEIGHT; y += 1) {
      pitchBase.append(svgLine(fieldLeft, pointY(y), fieldRight, pointY(y), "grid-line"));
    }

    for (const [x1, y1, x2, y2] of [
      [fieldLeft, fieldTop, mouthLeft, fieldTop],
      [mouthRight, fieldTop, fieldRight, fieldTop],
      [fieldLeft, fieldBottom, mouthLeft, fieldBottom],
      [mouthRight, fieldBottom, fieldRight, fieldBottom],
      [fieldLeft, fieldTop, fieldLeft, fieldBottom],
      [fieldRight, fieldTop, fieldRight, fieldBottom],
    ]) pitchBase.append(svgLine(x1, y1, x2, y2, "field-line"));

    pitchBase.append(goalPath(mouthLeft, mouthRight, fieldTop, grid.goalTop, "top"));
    pitchBase.append(goalPath(mouthLeft, mouthRight, fieldBottom, grid.goalBottom, "bottom"));

    for (let y = 0; y <= logic.FIELD_HEIGHT; y += 1) {
      for (let x = 0; x <= logic.FIELD_WIDTH; x += 1) {
        const dot = svg("circle", { cx: pointX(x), cy: pointY(y), r: 4.4, class: "grid-dot" });
        pitchBase.append(dot);
      }
    }
  }

  function renderTrails() {
    trailLayer.replaceChildren();
    state.edges.forEach((edge, index) => {
      const from = pointToSvg(edge.from);
      const to = pointToSvg(edge.to);
      const line = svgLine(from.x, from.y, to.x, to.y, `trail trail--${edge.owner}`);
      if (index === state.edges.length - 1) line.classList.add("is-latest");
      trailLayer.append(line);
    });
  }

  function renderTargets() {
    targetLayer.replaceChildren();
    if (state.phase !== "playing") return;
    for (const move of logic.getLegalMoves(state)) {
      const point = pointToSvg(move.target);
      const group = svg("g", {
        class: `legal-target target--${state.currentPlayer}${move.bounces ? " is-bounce" : ""}`,
        role: "button",
        tabindex: "0",
        "data-action": "target",
        "data-direction": move.id,
        "data-target-x": move.target.x,
        "data-target-y": move.target.y,
        "aria-label": `${move.label}到${destinationName(move.target)}${move.bounces ? "，落点可借力继续" : ""}`,
      });
      group.append(
        svg("circle", { cx: point.x, cy: point.y, r: 22, class: "target-ring" }),
        svg("circle", { cx: point.x, cy: point.y, r: 5, class: "target-core" }),
      );
      targetLayer.append(group);
    }
  }

  function renderBall() {
    ballLayer.replaceChildren();
    const point = pointToSvg(state.ball);
    const group = svg("g", { class: "paper-ball", transform: `translate(${point.x} ${point.y})` });
    group.append(
      svg("circle", { cx: 0, cy: 0, r: 19, class: "ball-shell" }),
      svg("circle", { cx: 0, cy: 0, r: 5, class: "ball-core" }),
      svgLine(-5, -4, -14, -11, "ball-stitch"),
      svgLine(5, -4, 14, -11, "ball-stitch"),
      svgLine(-5, 4, -13, 12, "ball-stitch"),
      svgLine(5, 4, 13, 12, "ball-stitch"),
    );
    ballLayer.append(group);
  }

  function renderControls() {
    controlArea.replaceChildren();
    if (state.phase === "intro") {
      controlsTitle.textContent = "准备开球";
      controlArea.append(
        paragraph("每次只画一小格；踩到旧点或边线，就能继续走。", "intro-copy"),
        actionButton("把球放到中点", "start", "primary-action"),
      );
      return;
    }
    if (state.phase === "complete") {
      controlsTitle.textContent = state.winReason === "goal" ? "球进了" : "没有出口";
      const result = document.createElement("div");
      result.className = `result-sheet result-sheet--${state.winner}`;
      result.append(
        paragraph(`${playerName(state.winner)}获胜`, "result-title"),
        paragraph(state.winReason === "goal" ? "一条线走进了网里。" : "对方借力后被封在旧点。", "result-copy"),
      );
      const actions = document.createElement("div");
      actions.className = "result-actions";
      actions.append(
        actionButton("再踢一场", "rematch", "primary-action"),
        actionButton("清空胜局", "reset", "secondary-action"),
      );
      controlArea.append(result, actions);
      return;
    }

    controlsTitle.textContent = "选择下一点";
    const moves = new Map(logic.getLegalMoves(state).map((move) => [move.id, move]));
    const pad = document.createElement("div");
    pad.className = "direction-pad";
    const layout = ["nw", "n", "ne", "w", null, "e", "sw", "s", "se"];
    for (const directionId of layout) {
      if (!directionId) {
        const center = document.createElement("span");
        center.className = "pad-center";
        center.setAttribute("aria-hidden", "true");
        pad.append(center);
        continue;
      }
      const direction = logic.DIRECTIONS.find((item) => item.id === directionId);
      const move = moves.get(directionId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "direction-button";
      button.dataset.action = "direction";
      button.dataset.direction = directionId;
      button.disabled = !move;
      button.setAttribute("aria-keyshortcuts", direction.key.toUpperCase());
      button.setAttribute("aria-label", move
        ? `${direction.label}，按 ${direction.key.toUpperCase()}，到${destinationName(move.target)}${move.bounces ? "并继续" : ""}`
        : `${direction.label}不可走`);
      const arrow = document.createElement("span");
      arrow.className = "direction-arrow";
      arrow.textContent = arrowFor(directionId);
      const key = document.createElement("kbd");
      key.textContent = direction.key.toUpperCase();
      button.append(arrow, key);
      if (move?.bounces) button.classList.add("is-bounce");
      pad.append(button);
    }
    controlArea.append(pad);
  }

  function scheduleFocus(request = { kind: "primary" }) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      if (state.phase !== "playing" || request.kind === "primary") {
        controlArea.querySelector("button")?.focus({ preventScroll: true });
        return;
      }
      if (request.kind === "direction" && request.direction) {
        const preferred = controlArea.querySelector(`[data-direction="${request.direction}"]:not(:disabled)`);
        if (preferred) {
          preferred.focus({ preventScroll: true });
          return;
        }
      }
      if (request.kind === "target") {
        const target = targetLayer.querySelector(".legal-target");
        if (target) {
          target.focus({ preventScroll: true });
          return;
        }
      }
      controlArea.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
    });
  }

  function goalPath(left, right, lineY, goalY, position) {
    const path = svg("path", { class: `goal-net goal-net--${position}` });
    path.setAttribute("d", `M ${left} ${lineY} L ${left} ${goalY} L ${right} ${goalY} L ${right} ${lineY}`);
    return path;
  }

  function svgLine(x1, y1, x2, y2, className) {
    return svg("line", { x1, y1, x2, y2, class: className });
  }

  function svg(name, attributes) {
    const node = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  }

  function pointToSvg(point) {
    if (point.y === -1) return { x: pointX(4), y: grid.goalTop };
    if (point.y === 11) return { x: pointX(4), y: grid.goalBottom };
    return { x: pointX(point.x), y: pointY(point.y) };
  }

  function pointX(x) {
    return grid.left + x * grid.step;
  }

  function pointY(y) {
    return grid.top + y * grid.step;
  }

  function destinationName(point) {
    if (point.y === -1) return "上方球门";
    if (point.y === 11) return "下方球门";
    return `格点 ${point.x + 1}-${point.y + 1}`;
  }

  function playerName(player) {
    return player === "red" ? config.redName : config.blueName;
  }

  function arrowFor(direction) {
    return { nw: "↖", n: "↑", ne: "↗", w: "←", e: "→", sw: "↙", s: "↓", se: "↘" }[direction];
  }

  function actionButton(label, action, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  function paragraph(text, className) {
    const node = document.createElement("p");
    node.className = className;
    node.textContent = text;
    return node;
  }
})();
