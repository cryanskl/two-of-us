(function () {
  "use strict";

  const levelsModule = globalThis.TWIN_LIGHT_LEVELS;
  const logic = globalThis.TWIN_LIGHT_MAZE_LOGIC;
  const keyMap = Object.freeze({
    KeyW: [0, "up"],
    KeyA: [0, "left"],
    KeyS: [0, "down"],
    KeyD: [0, "right"],
    ArrowUp: [1, "up"],
    ArrowLeft: [1, "left"],
    ArrowDown: [1, "down"],
    ArrowRight: [1, "right"],
  });

  const elements = {
    game: document.querySelector("#game"),
    levelCurrent: document.querySelector("#level-current"),
    levelTotal: document.querySelector("#level-total"),
    mazeGrid: document.querySelector("#maze-grid"),
    statusSummary: document.querySelector("#status-summary"),
    statusDetail: document.querySelector("#status-detail"),
    primaryAction: document.querySelector("#primary-action"),
    pauseButton: document.querySelector("#pause-button"),
    restartButton: document.querySelector("#restart-button"),
    helpButton: document.querySelector("#help-button"),
    helpDialog: document.querySelector("#help-dialog"),
    closeHelp: document.querySelector("#close-help"),
    liveRegion: document.querySelector("#live-region"),
  };

  const requiredLogic = [
    "createGameState",
    "startGame",
    "movePlayer",
    "pauseGame",
    "resumeGame",
    "restartLevel",
    "nextLevel",
    "replayGame",
    "deriveBoardState",
  ];

  if (
    !levelsModule
    || !Array.isArray(levelsModule.LEVELS)
    || !logic
    || requiredLogic.some((name) => typeof logic[name] !== "function")
    || Object.values(elements).some((element) => !element)
  ) {
    renderUnavailable();
    return;
  }

  let game = logic.createGameState();
  let renderedLevelIndex = -1;
  let lastAnnouncementKey = "";
  let bumpedSeat = null;
  let bumpTimer = null;
  const heldCodes = new Set();

  elements.primaryAction.addEventListener("click", handlePrimaryAction);
  elements.pauseButton.addEventListener("click", handlePause);
  elements.restartButton.addEventListener("click", restartLevel);
  elements.helpButton.addEventListener("click", openHelp);
  elements.closeHelp.addEventListener("click", closeHelp);
  elements.helpDialog.addEventListener("click", (event) => {
    if (event.target === elements.helpDialog) closeHelp();
  });
  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("pointerdown", handlePointerMove);
  });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => pauseFor("blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pauseFor("hidden");
  });

  render(true);

  function handlePrimaryAction() {
    if (game.phase === "ready") game = logic.startGame(game);
    else if (game.phase === "level-complete") game = logic.nextLevel(game);
    else if (game.phase === "game-complete") game = logic.replayGame(game);
    else return;
    clearTransientInput();
    render(true);
  }

  function handlePause() {
    if (game.phase === "playing") game = logic.pauseGame(game, "manual");
    else if (game.phase === "paused") game = logic.resumeGame(game);
    else return;
    clearTransientInput();
    render(true);
  }

  function restartLevel() {
    if (game.phase === "ready") return;
    game = logic.restartLevel(game);
    clearTransientInput();
    announce(`第 ${game.levelIndex + 1} 关已重来。`, `restart-${game.levelIndex}-${Date.now()}`);
    render();
  }

  function pauseFor(reason) {
    if (game.phase !== "playing") {
      clearTransientInput();
      return;
    }
    game = logic.pauseGame(game, reason);
    clearTransientInput();
    render(true);
  }

  function handleKeyDown(event) {
    const move = keyMap[event.code];
    if (!move) return;
    event.preventDefault();
    if (event.repeat || heldCodes.has(event.code)) return;
    heldCodes.add(event.code);
    attemptMove(move[0], move[1]);
  }

  function handleKeyUp(event) {
    if (!keyMap[event.code]) return;
    event.preventDefault();
    heldCodes.delete(event.code);
  }

  function handlePointerMove(event) {
    event.preventDefault();
    const seat = Number(event.currentTarget.dataset.seat);
    const direction = event.currentTarget.dataset.direction;
    attemptMove(seat, direction);
  }

  function attemptMove(seat, direction) {
    if (game.phase !== "playing") return;
    const previous = game;
    game = logic.movePlayer(game, seat, direction);
    if (game === previous) {
      showBump(seat);
      announce(seat === 0 ? "珊瑚光点这边走不通。" : "青色光点这边走不通。", `bump-${seat}-${Date.now()}`);
    } else {
      bumpedSeat = null;
      window.clearTimeout(bumpTimer);
    }
    render(game.phase !== previous.phase);
  }

  function showBump(seat) {
    bumpedSeat = seat;
    window.clearTimeout(bumpTimer);
    bumpTimer = window.setTimeout(() => {
      bumpedSeat = null;
      render();
    }, 180);
  }

  function render(forceAnnouncement) {
    const level = levelsModule.LEVELS[game.levelIndex];
    const derived = logic.deriveBoardState(game);
    if (renderedLevelIndex !== game.levelIndex) {
      renderedLevelIndex = game.levelIndex;
      elements.mazeGrid.style.setProperty("--columns", String(level.width));
      elements.mazeGrid.style.setProperty("--rows", String(level.height));
    }

    elements.game.dataset.phase = game.phase;
    elements.levelCurrent.textContent = String(game.levelIndex + 1);
    elements.levelTotal.textContent = String(levelsModule.LEVELS.length);
    elements.mazeGrid.setAttribute("aria-label", `${level.title}，12 列 8 行合作迷宫`);
    elements.mazeGrid.replaceChildren(...createCells(level, derived));

    const view = describeView(level, derived);
    elements.statusSummary.textContent = view.title;
    elements.statusDetail.textContent = view.detail;
    elements.primaryAction.textContent = view.primaryLabel;
    elements.primaryAction.hidden = !view.primaryLabel;
    elements.pauseButton.disabled = !["playing", "paused"].includes(game.phase);
    elements.pauseButton.textContent = game.phase === "paused" ? "继续" : "暂停";
    elements.pauseButton.setAttribute("aria-pressed", String(game.phase === "paused"));
    elements.restartButton.disabled = game.phase === "ready";
    document.querySelectorAll("[data-move]").forEach((button) => {
      button.disabled = game.phase !== "playing";
    });

    if (forceAnnouncement || view.announcementKey !== lastAnnouncementKey) {
      announce(view.announcement, view.announcementKey);
    }
  }

  function createCells(level, derived) {
    const cells = [];
    for (let index = 0; index < level.width * level.height; index += 1) {
      const cell = document.createElement("div");
      const symbol = levelsModule.cellAt(level, index);
      cell.className = `maze-cell ${tileClass(symbol)}`;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", describeCell(symbol, index, level, derived));
      if (symbol === "a" && derived.plates.a) cell.classList.add("is-pressed");
      if (symbol === "b" && derived.plates.b) cell.classList.add("is-pressed");
      if (symbol === "A" && derived.doors.A) cell.classList.add("is-open");
      if (symbol === "B" && derived.doors.B) cell.classList.add("is-open");
      game.players.forEach((position, seat) => {
        if (position !== index) return;
        cell.classList.add(seat === 0 ? "player--coral" : "player--cyan");
        cell.dataset.player = seat === 0 ? "coral" : "cyan";
        if (bumpedSeat === seat) cell.classList.add("is-bumped");
      });
      cells.push(cell);
    }
    return cells;
  }

  function tileClass(symbol) {
    return ({
      "#": "tile--wall",
      a: "tile--plate-a",
      b: "tile--plate-b",
      A: "tile--door-a",
      B: "tile--door-b",
      x: "tile--exit-coral",
      y: "tile--exit-cyan",
    })[symbol] || "tile--floor";
  }

  function describeCell(symbol, index, level, derived) {
    const occupants = [];
    if (game.players[0] === index) occupants.push("珊瑚玩家");
    if (game.players[1] === index) occupants.push("青色玩家");
    const kind = ({
      "#": "墙",
      a: derived.plates.a ? "A 压力板，已按下" : "A 压力板",
      b: derived.plates.b ? "B 压力板，已按下" : "B 压力板",
      A: derived.doors.A ? "A 门，已开启" : "A 门，已关闭",
      B: derived.doors.B ? "B 门，已开启" : "B 门，已关闭",
      x: "珊瑚光门",
      y: "青色光门",
    })[symbol] || "地面";
    const row = Math.floor(index / level.width) + 1;
    const column = (index % level.width) + 1;
    return `${row} 行 ${column} 列，${[...occupants, kind].join("，")}`;
  }

  function describeView(level, derived) {
    const doorState = [
      level.doors.A.length ? `A 门${derived.doors.A ? "已开" : "关闭"}` : null,
      level.doors.B.length ? `B 门${derived.doors.B ? "已开" : "关闭"}` : null,
    ].filter(Boolean).join("，");
    const homes = `${derived.home[0] ? "珊瑚已归巢" : "珊瑚在路上"}，${derived.home[1] ? "青色已归巢" : "青色在路上"}`;

    if (game.phase === "ready") return {
      title: level.title,
      detail: `${level.hint} WASD 控制珊瑚，方向键控制青色。`,
      primaryLabel: "开始归巢",
      announcement: `第 1 关，${level.title}。准备好后开始归巢。`,
      announcementKey: "ready",
    };
    if (game.phase === "paused") return {
      title: "星图暂时静止",
      detail: game.pauseReason === "manual" ? "你们主动暂停了这一关。" : "页面离开前已自动暂停，回来后点击继续。",
      primaryLabel: "",
      announcement: "游戏已暂停。",
      announcementKey: `paused-${game.pauseReason}`,
    };
    if (game.phase === "level-complete") return {
      title: "两束光一起到了",
      detail: `第 ${game.levelIndex + 1} 关完成，共移动 ${game.moveCount} 步。`,
      primaryLabel: "下一关",
      announcement: `第 ${game.levelIndex + 1} 关完成。`,
      announcementKey: `complete-${game.levelIndex}`,
    };
    if (game.phase === "game-complete") return {
      title: "我们一起回来了",
      detail: `第四关完成，最后一程用了 ${game.moveCount} 步。`,
      primaryLabel: "重新游玩",
      announcement: "四关全部完成，我们一起回来了。",
      announcementKey: "game-complete",
    };
    return {
      title: level.title,
      detail: `${level.hint} ${doorState}；${homes}。`,
      primaryLabel: "",
      announcement: `第 ${game.levelIndex + 1} 关开始。${level.hint}`,
      announcementKey: `playing-${game.levelIndex}`,
    };
  }

  function openHelp() {
    if (typeof elements.helpDialog.showModal === "function") elements.helpDialog.showModal();
    else elements.helpDialog.setAttribute("open", "");
  }

  function closeHelp() {
    if (typeof elements.helpDialog.close === "function") elements.helpDialog.close();
    else elements.helpDialog.removeAttribute("open");
    elements.helpButton.focus();
  }

  function announce(message, key) {
    lastAnnouncementKey = key;
    elements.liveRegion.textContent = "";
    window.requestAnimationFrame(() => { elements.liveRegion.textContent = message; });
  }

  function clearTransientInput() {
    heldCodes.clear();
    bumpedSeat = null;
    window.clearTimeout(bumpTimer);
  }

  function renderUnavailable() {
    document.body.textContent = "双光点归巢加载失败：请确认 levels.js、logic.js 与 app.js 位于同一目录。";
  }
})();
