"use strict";

(function runDualMazeRaceApp(window, document) {
  var logic = window.DualMazeRaceLogic;
  if (!logic) {
    throw new Error("DualMazeRaceLogic is required");
  }

  var config = window.DUAL_MAZE_CONFIG || logic.DEFAULT_CONFIG;
  var state = logic.createInitialState();
  var view = logic.getPublicView(state);
  var accumulator = 0;
  var previousFrameTime = null;
  var frameRequest = 0;
  var previousPhase = null;
  var previousBumps = [0, 0];
  var previousCountdown = null;
  var pressedCodes = new Set();
  var mazeSignatures = { left: "", right: "" };
  var directionLabels = {
    up: "上",
    right: "右",
    down: "下",
    left: "左"
  };
  var pauseLabels = {
    manual: "手动暂停。继续前会重新倒数，后台时间不会补跑。",
    hidden: "页面暂时不可见。继续前会重新倒数，后台时间不会补跑。",
    blur: "窗口失去焦点。继续前会重新倒数，后台时间不会补跑。",
    pagehide: "页面已离开。返回后继续前会重新倒数。",
    stalled: "页面停顿过久。为保持公平，本局已暂停且不会补算时间。"
  };
  var keyBindings = {
    KeyW: { seat: "left", direction: "up" },
    KeyD: { seat: "left", direction: "right" },
    KeyS: { seat: "left", direction: "down" },
    KeyA: { seat: "left", direction: "left" },
    ArrowUp: { seat: "right", direction: "up" },
    ArrowRight: { seat: "right", direction: "right" },
    ArrowDown: { seat: "right", direction: "down" },
    ArrowLeft: { seat: "right", direction: "left" }
  };

  var elements = {
    tagline: document.getElementById("tagline"),
    introPanel: document.getElementById("intro-panel"),
    checkPanel: document.getElementById("check-panel"),
    checkHeading: document.getElementById("check-heading"),
    nameOne: document.getElementById("player-one-name"),
    nameTwo: document.getElementById("player-two-name"),
    beginCheck: document.getElementById("begin-check"),
    checkNameOne: document.getElementById("check-name-one"),
    checkNameTwo: document.getElementById("check-name-two"),
    checksOne: document.getElementById("checks-one"),
    checksTwo: document.getElementById("checks-two"),
    jointState: document.getElementById("joint-state"),
    warningBox: document.getElementById("warning-box"),
    acceptWarning: document.getElementById("accept-warning"),
    startMatch: document.getElementById("start-match"),
    raceStage: document.getElementById("race-stage"),
    controlDeck: document.getElementById("control-deck"),
    scoreOne: document.getElementById("score-one"),
    scoreTwo: document.getElementById("score-two"),
    heatLabel: document.getElementById("heat-label"),
    elapsedTime: document.getElementById("elapsed-time"),
    leftIdentity: document.getElementById("left-identity"),
    rightIdentity: document.getElementById("right-identity"),
    leftPlayerName: document.getElementById("left-player-name"),
    rightPlayerName: document.getElementById("right-player-name"),
    leftSeatCopy: document.getElementById("left-seat-copy"),
    rightSeatCopy: document.getElementById("right-seat-copy"),
    leftBumps: document.getElementById("left-bumps"),
    rightBumps: document.getElementById("right-bumps"),
    leftBoard: document.getElementById("left-board"),
    rightBoard: document.getElementById("right-board"),
    leftMaze: document.getElementById("left-maze"),
    rightMaze: document.getElementById("right-maze"),
    leftBoardSummary: document.getElementById("left-board-summary"),
    rightBoardSummary: document.getElementById("right-board-summary"),
    countdownOverlay: document.getElementById("countdown-overlay"),
    countdownNumber: document.getElementById("countdown-number"),
    countdownCopy: document.getElementById("countdown-copy"),
    pausePanel: document.getElementById("pause-panel"),
    pauseHeading: document.getElementById("pause-heading"),
    pauseReason: document.getElementById("pause-reason"),
    resumeMatch: document.getElementById("resume-match"),
    pauseMatch: document.getElementById("pause-match"),
    leftControlLabel: document.getElementById("left-control-label"),
    rightControlLabel: document.getElementById("right-control-label"),
    resultPanel: document.getElementById("result-panel"),
    resultLabel: document.getElementById("result-label"),
    resultHeading: document.getElementById("result-heading"),
    resultLead: document.getElementById("result-lead"),
    resultScore: document.getElementById("result-score"),
    heatHistory: document.getElementById("heat-history"),
    matchNote: document.getElementById("match-note"),
    resultAction: document.getElementById("result-action"),
    status: document.getElementById("app-status"),
    directionButtons: Array.from(document.querySelectorAll(".direction-button"))
  };

  function announce(message) {
    elements.status.textContent = message;
  }

  function setState(nextState, announcement) {
    if (nextState === state) return false;
    state = nextState;
    view = logic.getPublicView(state);
    if (announcement) announce(announcement);
    render();
    return true;
  }

  function seatPlayerId(seat) {
    if (view.phase === "input-check" || view.phase === "intro") {
      return seat === "left" ? 0 : 1;
    }
    return seat === "left" ? view.leftPlayer : view.rightPlayer;
  }

  function scoreText(score) {
    return String(score) + " 分";
  }

  function secondsText(ticks) {
    return (ticks / logic.CONSTANTS.TICK_HZ).toFixed(1) + " 秒";
  }

  function playerIdentityClass(playerId) {
    return "identity-mark " + (playerId === 0 ? "identity-mark--one" : "identity-mark--two");
  }

  function playerMarkerClass(playerId) {
    return "player-marker " + (playerId === 0 ? "player-marker--one" : "player-marker--two");
  }

  function renderCheckChips(container, checks) {
    var fragment = document.createDocumentFragment();
    logic.DIRECTION_NAMES.forEach(function appendChip(direction) {
      var chip = document.createElement("span");
      chip.className = "check-chip" + (checks[direction] ? " is-checked" : "");
      chip.textContent = directionLabels[direction];
      fragment.appendChild(chip);
    });
    container.replaceChildren(fragment);
  }

  function mazeSignature(maze) {
    return maze.rows + "x" + maze.cols + "|" + maze.passages.join(",");
  }

  function addStaticMarker(cell, className) {
    var marker = document.createElement("span");
    marker.className = className;
    cell.appendChild(marker);
  }

  function buildMaze(board, maze, seat) {
    var signature = mazeSignature(maze);
    if (mazeSignatures[seat] === signature && board.children.length === maze.passages.length) {
      return;
    }
    mazeSignatures[seat] = signature;
    board.style.gridTemplateColumns = "repeat(" + maze.cols + ", 1fr)";
    var fragment = document.createDocumentFragment();
    for (var index = 0; index < maze.passages.length; index += 1) {
      var row = Math.floor(index / maze.cols);
      var col = index % maze.cols;
      var passage = maze.passages[index];
      var cell = document.createElement("span");
      cell.className = "maze-cell";
      if (row > 0 && (passage & logic.DIRECTIONS.up.bit) === 0) {
        cell.classList.add("wall-up");
      }
      if (col > 0 && (passage & logic.DIRECTIONS.left.bit) === 0) {
        cell.classList.add("wall-left");
      }
      if (row === maze.start.row && col === maze.start.col) {
        addStaticMarker(cell, "start-marker");
      }
      if (row === maze.goal.row && col === maze.goal.col) {
        addStaticMarker(cell, "goal-marker");
      }
      fragment.appendChild(cell);
    }
    board.replaceChildren(fragment);
  }

  function renderBoard(boardElement, regionElement, summaryElement, boardView) {
    buildMaze(boardElement, boardView.maze, boardView.seat);
    boardElement.querySelectorAll(".player-marker").forEach(function removeMarker(marker) {
      marker.remove();
    });
    var playerMarker = document.createElement("span");
    playerMarker.className = playerMarkerClass(boardView.playerId);
    boardElement.children[boardView.position].appendChild(playerMarker);

    var row = Math.floor(boardView.position / boardView.maze.cols) + 1;
    var col = (boardView.position % boardView.maze.cols) + 1;
    var playerName = view.playerNames[boardView.playerId];
    var seatName = boardView.seat === "left" ? "左席" : "右席";
    regionElement.setAttribute(
      "aria-label",
      seatName + "迷宫，" + playerName + "位于第" + row + "行第" + col + "列，终点在右侧中部"
    );
    summaryElement.textContent = playerName + "位于第 " + row + " 行、第 " + col + " 列。";
  }

  function resultSummary(result) {
    if (result.winner === null) {
      return "同一拍到达";
    }
    return view.playerNames[result.winner] + "先到";
  }

  function renderHistory() {
    var fragment = document.createDocumentFragment();
    view.heatResults.forEach(function appendResult(result) {
      var item = document.createElement("li");
      item.textContent = "第 " + (result.heatIndex + 1) + " 局 · " + result.mapLabel
        + " · " + resultSummary(result)
        + " · " + secondsText(result.elapsedTicks)
        + " · 撞墙 " + result.bumps[0] + " / " + result.bumps[1];
      fragment.appendChild(item);
    });
    elements.heatHistory.replaceChildren(fragment);
  }

  function renderResult() {
    var isMatch = view.phase === "match-result";
    var latest = view.heatResults[view.heatResults.length - 1];
    elements.resultLabel.textContent = isMatch ? "四局结果" : "本局结果";
    if (isMatch) {
      elements.resultHeading.textContent = view.matchWinner === null
        ? "四局打平"
        : view.playerNames[view.matchWinner] + "赢下这场";
      elements.resultLead.textContent = "两张图都完成了换席复赛，没有额外加赛或隐藏判定。";
      elements.resultScore.textContent = scoreText(view.scores[0]) + " · " + scoreText(view.scores[1]);
      elements.resultAction.textContent = "再来一场";
      elements.matchNote.textContent = logic.resolveMatchNote(state, config);
      elements.matchNote.hidden = false;
    } else {
      elements.resultHeading.textContent = resultSummary(latest);
      elements.resultLead.textContent = latest.winner === null
        ? "同一拍到达，这局算你们心有灵犀。"
        : "本局用时 " + secondsText(latest.elapsedTicks) + "；下一局会按赛程换席。";
      elements.resultScore.textContent = view.playerNames[0] + " " + scoreText(view.scores[0])
        + " · " + view.playerNames[1] + " " + scoreText(view.scores[1]);
      elements.resultAction.textContent = "下一局";
      elements.matchNote.hidden = true;
      elements.matchNote.textContent = "";
    }
    renderHistory();
  }

  function focusForPhase(phase) {
    if (phase === "input-check") {
      elements.checkHeading.focus();
    } else if (phase === "paused") {
      elements.resumeMatch.focus();
    } else if (phase === "heat-result" || phase === "match-result") {
      elements.resultHeading.focus();
    }
  }

  function render() {
    var phase = view.phase;
    var showCheck = phase === "input-check";
    var showRace = phase === "countdown" || phase === "racing" || phase === "paused";
    var showResult = phase === "heat-result" || phase === "match-result";
    var showControls = showCheck || showRace;

    document.body.dataset.phase = phase;
    elements.introPanel.hidden = phase !== "intro";
    elements.checkPanel.hidden = !showCheck;
    elements.raceStage.hidden = !showRace;
    elements.resultPanel.hidden = !showResult;
    elements.controlDeck.hidden = !showControls;
    elements.tagline.hidden = showRace;

    elements.checkNameOne.textContent = view.playerNames[0];
    elements.checkNameTwo.textContent = view.playerNames[1];
    renderCheckChips(elements.checksOne, view.inputCheck.directions[0]);
    renderCheckChips(elements.checksTwo, view.inputCheck.directions[1]);

    var directionsComplete = view.inputCheck.directions.every(function allChecked(checks) {
      return logic.DIRECTION_NAMES.every(function checked(direction) {
        return checks[direction];
      });
    });
    elements.jointState.textContent = view.inputCheck.jointDetected ? "已检测" : "等待检测";
    elements.jointState.classList.toggle("is-detected", view.inputCheck.jointDetected);
    elements.warningBox.hidden = !showCheck
      || !directionsComplete
      || view.inputCheck.jointDetected
      || view.inputCheck.warningAccepted;
    elements.startMatch.disabled = !view.actions.canStartMatch;

    elements.scoreOne.textContent = scoreText(view.scores[0]);
    elements.scoreTwo.textContent = scoreText(view.scores[1]);
    elements.heatLabel.textContent = "第 " + view.heatNumber + " / " + view.heatCount
      + " 局 · " + view.mapLabel;
    elements.elapsedTime.textContent = secondsText(view.elapsedTicks);

    elements.leftIdentity.className = playerIdentityClass(view.leftPlayer);
    elements.rightIdentity.className = playerIdentityClass(view.rightPlayer);
    elements.leftPlayerName.textContent = view.playerNames[view.leftPlayer];
    elements.rightPlayerName.textContent = view.playerNames[view.rightPlayer];
    elements.leftSeatCopy.textContent = "左席 · WASD";
    elements.rightSeatCopy.textContent = "右席 · 方向键";
    elements.leftControlLabel.textContent = "左席 · " + view.playerNames[view.leftPlayer] + " · WASD";
    elements.rightControlLabel.textContent = "右席 · " + view.playerNames[view.rightPlayer] + " · 方向键";
    elements.leftBumps.textContent = "撞墙 " + view.bumps[view.leftPlayer];
    elements.rightBumps.textContent = "撞墙 " + view.bumps[view.rightPlayer];

    if (showRace) {
      renderBoard(elements.leftMaze, elements.leftBoard, elements.leftBoardSummary, view.boards[0]);
      renderBoard(elements.rightMaze, elements.rightBoard, elements.rightBoardSummary, view.boards[1]);
    }

    var isCountdown = phase === "countdown";
    elements.countdownOverlay.hidden = !isCountdown;
    if (isCountdown) {
      var count = Math.max(1, Math.ceil(view.countdownTicks / logic.CONSTANTS.TICK_HZ));
      elements.countdownNumber.textContent = String(count);
      elements.countdownCopy.textContent = view.countdownTicks <= logic.CONSTANTS.RESUME_COUNTDOWN_TICKS
        ? "重新准备"
        : "准备出发";
      if (count !== previousCountdown) {
        previousCountdown = count;
        announce("倒数 " + count);
      }
    } else {
      previousCountdown = null;
    }

    elements.pausePanel.hidden = phase !== "paused";
    elements.pauseReason.textContent = pauseLabels[view.pauseReason] || pauseLabels.manual;
    elements.pauseMatch.hidden = showCheck;
    elements.pauseMatch.disabled = !view.actions.canPause;

    elements.directionButtons.forEach(function updateDirectionButton(button) {
      var enabled = phase === "input-check" || phase === "racing";
      button.disabled = !enabled;
    });

    if (showResult) {
      renderResult();
    }

    if (view.bumps[0] > previousBumps[0]) {
      announce(view.playerNames[0] + "撞墙 " + view.bumps[0] + " 次。");
    } else if (view.bumps[1] > previousBumps[1]) {
      announce(view.playerNames[1] + "撞墙 " + view.bumps[1] + " 次。");
    }
    previousBumps = view.bumps.slice();

    if (phase !== previousPhase) {
      if (phase === "racing") {
        announce("开始。两边同时出发。");
      } else if (phase === "paused") {
        announce("比赛已暂停。" + (pauseLabels[view.pauseReason] || ""));
      } else if (phase === "heat-result") {
        announce("本局结束。" + resultSummary(view.heatResults[view.heatResults.length - 1]) + "。");
      } else if (phase === "match-result") {
        announce("四局结束。" + elements.resultHeading.textContent + "。");
      }
      focusForPhase(phase);
      previousPhase = phase;
    }
  }

  function clearFrameClock() {
    accumulator = 0;
    previousFrameTime = window.performance.now();
  }

  function pauseFor(reason) {
    if (!view.actions.canPause) return;
    clearFrameClock();
    pressedCodes.clear();
    elements.directionButtons.forEach(function clearPressed(button) {
      button.classList.remove("is-pressed");
    });
    setState(logic.pauseMatch(state, reason));
  }

  function isEditableTarget(target) {
    if (!target || typeof target !== "object") return false;
    var tagName = String(target.tagName || "").toLowerCase();
    return tagName === "input"
      || tagName === "textarea"
      || tagName === "select"
      || target.isContentEditable === true;
  }

  function handleDirection(seat, direction) {
    var playerId = seatPlayerId(seat);
    if (view.phase === "input-check") {
      setState(
        logic.recordDirectionCheck(state, playerId, direction),
        view.playerNames[playerId] + "已检测" + directionLabels[direction] + "方向。"
      );
      return;
    }
    if (view.phase === "racing") {
      setState(logic.queueMove(state, playerId, direction));
    }
  }

  function onKeyDown(event) {
    var binding = keyBindings[event.code];
    if (!binding) return;
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || isEditableTarget(event.target)) {
      return;
    }
    if (view.phase !== "input-check" && view.phase !== "racing") return;
    event.preventDefault();
    pressedCodes.add(event.code);
    handleDirection(binding.seat, binding.direction);
    if (
      view.phase === "input-check"
      && pressedCodes.has("KeyD")
      && pressedCodes.has("ArrowLeft")
      && !view.inputCheck.jointDetected
    ) {
      setState(logic.recordJointCheck(state), "联合按键已检测。");
    }
  }

  function onKeyUp(event) {
    if (keyBindings[event.code]) {
      pressedCodes.delete(event.code);
    }
  }

  function stepFrame(now) {
    if (previousFrameTime === null) {
      previousFrameTime = now;
    }
    var delta = now - previousFrameTime;
    previousFrameTime = now;
    var phase = view.phase;
    if (phase === "countdown" || phase === "racing") {
      if (delta > logic.CONSTANTS.STALL_THRESHOLD_MS) {
        pauseFor("stalled");
      } else {
        accumulator += delta;
        var steps = 0;
        while (
          accumulator >= logic.CONSTANTS.TICK_MS
          && steps < 5
          && (view.phase === "countdown" || view.phase === "racing")
        ) {
          var next = view.phase === "countdown"
            ? logic.advanceCountdown(state)
            : logic.stepRace(state);
          state = next;
          view = logic.getPublicView(state);
          accumulator -= logic.CONSTANTS.TICK_MS;
          steps += 1;
        }
        if (steps === 5 && accumulator >= logic.CONSTANTS.TICK_MS) {
          pauseFor("stalled");
        } else if (steps > 0) {
          render();
        }
      }
    }
    frameRequest = window.requestAnimationFrame(stepFrame);
  }

  elements.nameOne.value = config.defaultPlayerNames[0];
  elements.nameTwo.value = config.defaultPlayerNames[1];

  elements.beginCheck.addEventListener("click", function beginInputCheck() {
    state = logic.createInitialState({
      playerNames: [elements.nameOne.value, elements.nameTwo.value],
      mazes: logic.DEFAULT_MAZES
    });
    state = logic.enterInputCheck(state);
    view = logic.getPublicView(state);
    announce("请依次试完两边的四个方向。");
    render();
  });

  elements.acceptWarning.addEventListener("click", function acceptWarning() {
    setState(logic.acceptInputWarning(state), "已记录键盘风险，比赛时可使用触控按钮。");
  });

  elements.startMatch.addEventListener("click", function startMatch() {
    clearFrameClock();
    setState(logic.startMatch(state), "第一局准备，倒数三秒。");
  });

  elements.pauseMatch.addEventListener("click", function pauseMatch() {
    pauseFor("manual");
  });

  elements.resumeMatch.addEventListener("click", function resumeMatch() {
    clearFrameClock();
    setState(logic.resumeMatch(state), "继续前重新倒数。");
  });

  elements.resultAction.addEventListener("click", function resultAction() {
    clearFrameClock();
    if (view.phase === "heat-result") {
      setState(logic.advanceHeat(state), "下一局准备，左右席按赛程交换。");
    } else if (view.phase === "match-result") {
      setState(logic.restartMatch(state), "新一场从第一局开始。");
    }
  });

  elements.directionButtons.forEach(function bindDirectionButton(button) {
    button.addEventListener("click", function activateDirection() {
      handleDirection(button.dataset.seat, button.dataset.direction);
    });
    button.addEventListener("pointerdown", function showPressed() {
      button.classList.add("is-pressed");
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function bindClear(type) {
      button.addEventListener(type, function clearPressed() {
        button.classList.remove("is-pressed");
      });
    });
  });

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("visibilitychange", function onVisibilityChange() {
    if (document.hidden) pauseFor("hidden");
  });
  window.addEventListener("blur", function onBlur() {
    pauseFor("blur");
  });
  window.addEventListener("pagehide", function onPageHide() {
    pauseFor("pagehide");
  });
  window.addEventListener("pageshow", function onPageShow() {
    clearFrameClock();
    render();
  });

  render();
  frameRequest = window.requestAnimationFrame(stepFrame);
  void frameRequest;
})(window, document);
