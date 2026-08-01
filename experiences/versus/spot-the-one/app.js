(function () {
  "use strict";

  const logic = globalThis.SPOT_THE_ONE_LOGIC;
  const config = logic.sanitizeConfig(globalThis.SPOT_THE_ONE_CONFIG);
  const SVG_NS = "http://www.w3.org/2000/svg";
  const HUE_ANGLES = [205, 350, 42, 132, 276];
  const LIGHT_LEVELS = [48, 62, 74];
  const REVEAL_MS = 1700;

  const dom = {
    body: document.body,
    leftName: document.getElementById("left-name"),
    rightName: document.getElementById("right-name"),
    leftScore: document.getElementById("left-score"),
    rightScore: document.getElementById("right-score"),
    leftSeat: document.querySelector(".seat--left"),
    rightSeat: document.querySelector(".seat--right"),
    roundLabel: document.getElementById("round-label"),
    roundHint: document.getElementById("round-hint"),
    panels: {
      left: document.getElementById("panel-left"),
      right: document.getElementById("panel-right"),
    },
    overlay: document.getElementById("overlay"),
    overlayCopy: document.getElementById("overlay-copy"),
    startButton: document.getElementById("start-button"),
    liveRegion: document.getElementById("live-region"),
  };

  let state = logic.createMatch(config, freshSeed());
  const cursors = { left: 0, right: 0 };
  const lockTimers = { left: 0, right: 0 };
  let advanceTimer = 0;

  dom.leftName.textContent = config.leftName;
  dom.rightName.textContent = config.rightName;
  dom.roundHint.textContent = `共 ${config.roundsTotal} 题 · 点错锁 ${formatSeconds(config.lockMs)}`;
  const keyHints = document.querySelectorAll(".seat-keys");
  if (keyHints[0]) keyHints[0].textContent = "W A S D 移动 · F 作答";

  dom.startButton.addEventListener("click", () => {
    if (state.phase === "intro") {
      applyState(logic.start(state));
    } else if (state.phase === "finished") {
      applyState(logic.restart(state, freshSeed()));
    }
  });

  document.addEventListener("keydown", handleKeydown);

  function freshSeed() {
    return `${Date.now()}-${Math.floor(Math.random() * 0xffffffff)}`;
  }

  function nameOf(side) {
    return side === "left" ? config.leftName : config.rightName;
  }

  function formatSeconds(ms) {
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds} 秒` : `${seconds.toFixed(1)} 秒`;
  }

  function applyState(next) {
    const previous = state;
    state = next;
    if (state === previous) return;

    if (state.phase === "playing" && (previous.phase !== "playing"
      || previous.roundIndex !== state.roundIndex)) {
      cursors.left = 0;
      cursors.right = 0;
      renderRound();
      const overtimeNote = state.round.overtime ? "加时题，" : "";
      announce(`${overtimeNote}第 ${state.roundIndex + 1} 题，${state.round.gridSize} 乘 ${state.round.gridSize} 的题面已出现。`);
    }

    renderScores();
    renderRoundLabel();
    renderLocks();
    handleOutcome(previous);
    renderPhase();
  }

  function renderPhase() {
    dom.body.dataset.phase = state.phase === "reveal" ? "playing" : state.phase;
    if (state.phase === "intro") {
      dom.overlayCopy.textContent = "同一块题面会同时出现在两边，只有一格不一样：可能转了个角度、变了大小，或者线条粗细不同。";
      dom.startButton.textContent = "开始第一题";
    } else if (state.phase === "finished") {
      const finalScore = `${state.scores.left} 比 ${state.scores.right}`;
      dom.overlayCopy.textContent = `${nameOf(state.winner)}赢下这一局，${finalScore}。`;
      dom.startButton.textContent = "再来一局";
      announce(`对局结束，${nameOf(state.winner)}获胜，比分 ${finalScore}。`);
    }
  }

  function renderScores() {
    dom.leftScore.textContent = String(state.scores.left);
    dom.rightScore.textContent = String(state.scores.right);
  }

  function renderRoundLabel() {
    if (state.roundIndex < 0) {
      dom.roundLabel.textContent = "准备开始";
      return;
    }
    dom.roundLabel.textContent = state.round && state.round.overtime
      ? "加时题"
      : `第 ${state.roundIndex + 1} / ${state.config.roundsTotal} 题`;
  }

  function renderRound() {
    for (const side of logic.SIDES) {
      const panel = dom.panels[side];
      panel.replaceChildren();
      panel.style.gridTemplateColumns = `repeat(${state.round.gridSize}, 1fr)`;
      const cells = logic.panelCells(state.round, side);
      cells.forEach((cell, cellIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cell";
        button.dataset.index = String(cellIndex);
        button.tabIndex = -1;
        button.setAttribute("aria-label", `${side === "left" ? "左席" : "右席"}${logic.cellLabel(state.round, cellIndex)}`);
        button.append(renderGlyph(cell));
        button.addEventListener("click", () => attemptPick(side, cellIndex));
        panel.append(button);
      });
    }
    renderCursors();
  }

  function renderGlyph(cell) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "-50 -50 100 100");
    svg.setAttribute("aria-hidden", "true");
    const color = `hsl(${HUE_ANGLES[cell.hue]} 42% ${LIGHT_LEVELS[cell.light]}%)`;
    const strokeWidth = logic.STROKES[cell.stroke] * 1.5;
    const scale = logic.SCALES[cell.scale];
    const angle = cell.rotation * (360 / logic.ROTATION_STEPS);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("transform", `scale(${scale}) rotate(${angle})`);
    group.setAttribute("fill", "none");
    group.setAttribute("stroke", color);
    group.setAttribute("stroke-width", String(strokeWidth));
    group.setAttribute("stroke-linecap", "round");

    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("r", "33");

    const pointer = document.createElementNS(SVG_NS, "line");
    pointer.setAttribute("x1", "0");
    pointer.setAttribute("y1", "0");
    pointer.setAttribute("x2", "0");
    pointer.setAttribute("y2", "-33");

    group.append(ring, pointer);

    if (cell.ornament === 1) {
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("cy", "-18");
      dot.setAttribute("r", "5");
      dot.setAttribute("fill", color);
      dot.setAttribute("stroke", "none");
      group.append(dot);
    } else if (cell.ornament === 2) {
      const notch = document.createElementNS(SVG_NS, "line");
      notch.setAttribute("x1", "-9");
      notch.setAttribute("y1", "-18");
      notch.setAttribute("x2", "9");
      notch.setAttribute("y2", "-18");
      group.append(notch);
    }

    svg.append(group);
    return svg;
  }

  function renderCursors() {
    for (const side of logic.SIDES) {
      const buttons = dom.panels[side].children;
      for (let index = 0; index < buttons.length; index += 1) {
        if (buttons[index].dataset.cursor !== undefined || index === cursors[side]) {
          if (index === cursors[side]) buttons[index].dataset.cursor = "true";
          else delete buttons[index].dataset.cursor;
        }
      }
    }
  }

  function renderLocks() {
    const now = performance.now();
    for (const side of logic.SIDES) {
      const locked = state.phase === "playing" && now < state.locks[side];
      const seat = side === "left" ? dom.leftSeat : dom.rightSeat;
      seat.dataset.locked = locked ? "true" : "false";
      dom.panels[side].dataset.locked = locked ? "true" : "false";
      clearTimeout(lockTimers[side]);
      if (locked) {
        lockTimers[side] = setTimeout(() => {
          if (state.phase !== "playing" || performance.now() < state.locks[side]) return;
          seat.dataset.locked = "false";
          dom.panels[side].dataset.locked = "false";
          announce(`${nameOf(side)}可以继续作答了。`);
        }, state.locks[side] - now + 20);
      }
    }
  }

  function handleOutcome(previous) {
    const outcome = state.outcome;
    if (!outcome || outcome === previous.outcome) return;

    if (outcome.type === "miss") {
      const button = dom.panels[outcome.side].children[outcome.cellIndex];
      if (button) {
        button.dataset.missed = "true";
        setTimeout(() => delete button.dataset.missed, state.config.lockMs);
      }
      announce(`${nameOf(outcome.side)}点错了，锁定 ${formatSeconds(state.config.lockMs)}。`);
      return;
    }

    for (const side of logic.SIDES) {
      const button = dom.panels[side].children[state.round.diffIndex];
      if (button) button.dataset.reveal = "true";
    }
    announce(`${nameOf(outcome.side)}先看穿了：差异在${logic.cellLabel(state.round, outcome.cellIndex)}。`);
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => applyState(logic.advance(state)), REVEAL_MS);
  }

  function attemptPick(side, cellIndex) {
    if (state.phase !== "playing") return;
    applyState(logic.pick(state, side, cellIndex, performance.now()));
  }

  function moveCursor(side, deltaColumn, deltaRow) {
    if (state.phase !== "playing") return;
    const size = state.round.gridSize;
    const row = Math.floor(cursors[side] / size);
    const column = cursors[side] % size;
    const nextRow = Math.min(size - 1, Math.max(0, row + deltaRow));
    const nextColumn = Math.min(size - 1, Math.max(0, column + deltaColumn));
    cursors[side] = nextRow * size + nextColumn;
    renderCursors();
  }

  function handleKeydown(event) {
    if (event.repeat && (event.key === "f" || event.key === "F" || event.key === "Enter")) return;
    switch (event.key) {
      case "w": case "W": moveCursor("left", 0, -1); break;
      case "s": case "S": moveCursor("left", 0, 1); break;
      case "a": case "A": moveCursor("left", -1, 0); break;
      case "d": case "D": moveCursor("left", 1, 0); break;
      case "f": case "F": attemptPick("left", cursors.left); break;
      case "ArrowUp": event.preventDefault(); moveCursor("right", 0, -1); break;
      case "ArrowDown": event.preventDefault(); moveCursor("right", 0, 1); break;
      case "ArrowLeft": event.preventDefault(); moveCursor("right", -1, 0); break;
      case "ArrowRight": event.preventDefault(); moveCursor("right", 1, 0); break;
      case "Enter":
        if (document.activeElement !== dom.startButton) attemptPick("right", cursors.right);
        break;
      default:
    }
  }

  function announce(message) {
    dom.liveRegion.textContent = message;
  }

  renderRoundLabel();
})();
