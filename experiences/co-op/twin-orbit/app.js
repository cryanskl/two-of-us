"use strict";

(function createTwinOrbitApp(root) {
  var logic = root.TwinOrbitLogic;
  var editableConfig = root.TWIN_ORBIT_CONFIG;
  var app = document.querySelector(".app-shell");

  if (!logic || !app) {
    document.body.textContent = "这一圈，和你同时到";
    return;
  }

  var ACTIONS = logic.ACTIONS;
  var CONSTANTS = logic.CONSTANTS;
  var state = logic.createInitialState(editableConfig);
  var view = logic.getPublicView(state);
  var pressedKeys = new Set();
  var activePointers = new Map();
  var inputEpoch = 0;
  var lastTimestamp = null;
  var accumulatorMs = 0;
  var rafGeneration = 0;
  var rafHandle = 0;
  var announcedPhase = "";

  var elements = {
    gateCount: document.querySelector("#gate-count"),
    gateTitle: document.querySelector("#gate-title"),
    windowLabel: document.querySelector("#window-label"),
    windowFill: document.querySelector("#window-fill"),
    gateProgress: Array.from(document.querySelectorAll("#gate-progress li")),
    leftGate: document.querySelector("#left-gate"),
    rightGate: document.querySelector("#right-gate"),
    leftPlayer: document.querySelector("#left-player"),
    rightPlayer: document.querySelector("#right-player"),
    leftReadout: document.querySelector("#left-readout"),
    rightReadout: document.querySelector("#right-readout"),
    holdControls: Array.from(document.querySelectorAll("[data-hold-control]")),
    pauseAction: document.querySelector("#pause-action"),
    phaseTitle: document.querySelector("#phase-title"),
    phaseMessage: document.querySelector("#phase-message"),
    phaseAction: document.querySelector("#phase-action"),
    liveStatus: document.querySelector("#live-status")
  };

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("pointerup", handlePointerEnd);
  document.addEventListener("pointercancel", handlePointerEnd);
  document.addEventListener("visibilitychange", function handleVisibility() {
    if (document.visibilityState === "hidden") {
      suspend("hidden");
    }
  });
  root.addEventListener("blur", function handleBlur() {
    suspend("blur");
  });
  root.addEventListener("pagehide", function handlePageHide() {
    suspend("pagehide");
  });

  elements.phaseAction.addEventListener("click", handlePhaseAction);
  elements.pauseAction.addEventListener("click", function handlePause() {
    suspend("escape");
  });
  elements.holdControls.forEach(function bindHoldControl(button) {
    button.addEventListener("pointerdown", handlePointerDown);
    button.addEventListener("pointerup", handlePointerEnd);
    button.addEventListener("pointercancel", handlePointerEnd);
    button.addEventListener("lostpointercapture", handlePointerEnd);
  });

  render(true);
  restartAnimationClock();

  function handlePhaseAction() {
    var actionName = elements.phaseAction.dataset.action;
    if (actionName === "start") {
      dispatch({ type: ACTIONS.START }, true);
    } else if (actionName === "begin") {
      dispatch({ type: ACTIONS.BEGIN_GATE }, true);
    } else if (actionName === "retry") {
      dispatch({ type: ACTIONS.RETRY_GATE }, true);
    } else if (actionName === "next") {
      dispatch({ type: ACTIONS.NEXT_GATE }, true);
    } else if (actionName === "restart") {
      dispatch({ type: ACTIONS.RESTART }, true);
    }
  }

  function isEditableTarget(target) {
    return target instanceof Element && Boolean(
      target.closest("input, textarea, select, [contenteditable='true']")
    );
  }

  function playerForCode(code) {
    if (code === "KeyF") return "left";
    if (code === "KeyJ") return "right";
    return null;
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      if (!event.repeat) {
        event.preventDefault();
        suspend("escape");
      }
      return;
    }
    if (
      event.repeat
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || isEditableTarget(event.target)
    ) {
      return;
    }
    var playerId = playerForCode(event.code);
    if (!playerId || view.phase !== "playing" || pressedKeys.has(event.code)) {
      return;
    }
    event.preventDefault();
    pressedKeys.add(event.code);
    syncHeld(playerId);
  }

  function handleKeyUp(event) {
    var playerId = playerForCode(event.code);
    if (!playerId || !pressedKeys.has(event.code)) {
      return;
    }
    pressedKeys.delete(event.code);
    syncHeld(playerId);
  }

  function pointerOwnsSeat(playerId) {
    var occupied = false;
    activePointers.forEach(function findSeat(session) {
      if (session.playerId === playerId) occupied = true;
    });
    return occupied;
  }

  function mouseAlreadyActive() {
    var occupied = false;
    activePointers.forEach(function findMouse(session) {
      if (session.pointerType === "mouse") occupied = true;
    });
    return occupied;
  }

  function handlePointerDown(event) {
    var button = event.currentTarget;
    var playerId = button.dataset.player;
    if (
      view.phase !== "playing"
      || activePointers.has(event.pointerId)
      || pointerOwnsSeat(playerId)
      || (event.pointerType === "mouse" && mouseAlreadyActive())
    ) {
      return;
    }

    event.preventDefault();
    activePointers.set(event.pointerId, {
      playerId: playerId,
      pointerType: event.pointerType,
      button: button,
      inputEpoch: inputEpoch
    });
    try {
      button.setPointerCapture(event.pointerId);
    } catch (_error) {
      /* Document-level release remains the fail-safe. */
    }
    syncHeld(playerId);
  }

  function handlePointerEnd(event) {
    var session = activePointers.get(event.pointerId);
    if (!session) return;

    activePointers.delete(event.pointerId);
    try {
      if (
        event.type !== "lostpointercapture"
        && session.button.hasPointerCapture(event.pointerId)
      ) {
        session.button.releasePointerCapture(event.pointerId);
      }
    } catch (_error) {
      /* The pointer may already be gone; local ownership is authoritative. */
    }
    if (session.inputEpoch === inputEpoch) {
      syncHeld(session.playerId);
    }
  }

  function syncHeld(playerId) {
    if (view.phase !== "playing") return;
    var keyHeld = pressedKeys.has(playerId === "left" ? "KeyF" : "KeyJ");
    var pointerHeld = pointerOwnsSeat(playerId);
    dispatch({
      type: ACTIONS.SET_HELD,
      playerId: playerId,
      held: keyHeld || pointerHeld,
      inputEpoch: inputEpoch
    });
  }

  function clearInputState() {
    pressedKeys.clear();
    activePointers.forEach(function releaseCapturedPointer(session, pointerId) {
      try {
        if (session.button.hasPointerCapture(pointerId)) {
          session.button.releasePointerCapture(pointerId);
        }
      } catch (_error) {
        /* Clearing local ownership is sufficient for a protected pause. */
      }
    });
    activePointers.clear();
  }

  function suspend(reason) {
    clearInputState();
    if (
      view.phase !== "playing"
      && view.phase !== "gate-retry"
      && view.phase !== "gate-success"
      && view.phase !== "complete"
    ) {
      restartAnimationClock();
      return;
    }
    dispatch({ type: ACTIONS.SUSPEND, reason: reason }, true);
  }

  function dispatch(action, focusAction) {
    var previousState = state;
    var previousPhase = view.phase;
    state = logic.reduce(state, action);
    if (state === previousState) return false;

    if (action.type === ACTIONS.SUSPEND || action.type === ACTIONS.RESTART) {
      inputEpoch += 1;
    }
    view = logic.getPublicView(state);
    if (previousPhase === "playing" && view.phase !== "playing") {
      clearInputState();
    }
    render(Boolean(focusAction || previousPhase !== view.phase));
    if (
      action.type !== ACTIONS.TICK
      || previousPhase !== view.phase
    ) {
      restartAnimationClock();
    }
    return true;
  }

  function restartAnimationClock() {
    cancelAnimationFrame(rafHandle);
    rafGeneration += 1;
    lastTimestamp = null;
    accumulatorMs = 0;
    var generation = rafGeneration;
    rafHandle = requestAnimationFrame(function firstFrame(timestamp) {
      runFrame(timestamp, generation);
    });
  }

  function runFrame(timestamp, generation) {
    if (generation !== rafGeneration) return;
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      rafHandle = requestAnimationFrame(function nextFrame(nextTimestamp) {
        runFrame(nextTimestamp, generation);
      });
      return;
    }

    var delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    if (
      !Number.isFinite(delta)
      || delta < 0
      || delta > CONSTANTS.MAX_FRAME_DELTA_MS
    ) {
      suspend("long-frame");
      return;
    }

    if (view.phase === "playing") {
      accumulatorMs += delta;
      var tickDuration = 1000 / CONSTANTS.TICK_RATE;
      var steps = 0;
      while (
        accumulatorMs >= tickDuration
        && steps < CONSTANTS.MAX_TICK_BATCH
        && view.phase === "playing"
      ) {
        accumulatorMs -= tickDuration;
        dispatch({ type: ACTIONS.TICK, count: 1 });
        steps += 1;
      }
    } else {
      accumulatorMs = 0;
    }

    if (generation === rafGeneration) {
      rafHandle = requestAnimationFrame(function nextFrame(nextTimestamp) {
        runFrame(nextTimestamp, generation);
      });
    }
  }

  function playerById(playerId) {
    return view.players.find(function findPlayer(player) {
      return player.id === playerId;
    });
  }

  function laneLabel(lane) {
    return lane === "inner" ? "内轨" : "外轨";
  }

  function markerPosition(angle, lane) {
    var radius = lane === "inner" ? 86 : 126;
    var radians = angle * 0.5 * Math.PI / 180;
    return {
      x: 160 + Math.sin(radians) * radius,
      y: 160 - Math.cos(radians) * radius
    };
  }

  function placePlayer(element, player) {
    var position = markerPosition(player.angle, player.lane);
    element.setAttribute(
      "transform",
      "translate(" + position.x.toFixed(3) + " " + position.y.toFixed(3) + ")"
    );
  }

  function placeGate(element, player) {
    if (player.targetAngle === null || player.targetLane === null) {
      element.hidden = true;
      return;
    }
    var radius = player.targetLane === "inner" ? 86 : 126;
    var degrees = player.targetAngle * 0.5;
    element.hidden = false;
    element.setAttribute(
      "transform",
      "translate(160 160) rotate(" + degrees + ") translate(0 -" + radius + ")"
    );
  }

  function renderStatus() {
    if (!view.gate) {
      elements.gateCount.textContent = view.phase === "complete"
        ? "五圈完成"
        : "准备出发";
      elements.gateTitle.textContent = view.phase === "complete"
        ? "一起完成这段轨迹"
        : "两颗星，共享一个时刻";
      elements.windowLabel.textContent = view.phase === "complete"
        ? "共同开门已经完成"
        : "共同开门尚未开始";
      elements.windowFill.style.width = view.phase === "complete" ? "100%" : "0%";
    } else {
      var progress = Math.min(1, view.gate.tick / view.gate.openWindow.center);
      elements.gateCount.textContent =
        "第 " + view.gate.number + " / " + view.gate.total + " 圈";
      elements.gateTitle.textContent = view.gate.title;
      elements.windowLabel.textContent =
        "共同开门 " + view.gate.tick + " / " + view.gate.openWindow.center;
      elements.windowFill.style.width = (progress * 100).toFixed(2) + "%";
    }

    elements.gateProgress.forEach(function updateProgress(item, index) {
      item.classList.toggle("is-complete", index < view.completedCount);
      item.classList.toggle(
        "is-current",
        Boolean(view.gate) && index === view.gate.number - 1
      );
    });
  }

  function renderPlayers() {
    var left = playerById("left");
    var right = playerById("right");
    placePlayer(elements.leftPlayer, left);
    placePlayer(elements.rightPlayer, right);
    placeGate(elements.leftGate, left);
    placeGate(elements.rightGate, right);

    var shared = view.phase === "gate-success" || view.phase === "complete";
    elements.leftPlayer.classList.toggle("is-shared", shared);
    elements.rightPlayer.classList.toggle("is-shared", shared);
    elements.leftGate.classList.toggle("is-shared", shared);
    elements.rightGate.classList.toggle("is-shared", shared);

    elements.leftReadout.textContent =
      left.name + " · " + laneLabel(left.lane) + " · " + left.angle + " 格 · "
      + left.relationText;
    elements.rightReadout.textContent =
      right.name + " · " + laneLabel(right.lane) + " · " + right.angle + " 格 · "
      + right.relationText;
  }

  function actionForPhase() {
    if (view.phase === "intro") {
      return { action: "start", label: "开始第一圈" };
    }
    if (view.phase === "gate-intro") {
      return { action: "begin", label: "两边准备好" };
    }
    if (view.phase === "gate-retry") {
      return { action: "retry", label: "再试一次" };
    }
    if (view.phase === "gate-success") {
      return { action: "next", label: "下一圈" };
    }
    if (view.phase === "complete") {
      return { action: "restart", label: "再走一遍" };
    }
    return null;
  }

  function renderControls() {
    var playing = view.phase === "playing";
    elements.holdControls.forEach(function updateControl(button) {
      var player = playerById(button.dataset.player);
      button.disabled = !playing;
      button.setAttribute("aria-pressed", playing && player.lane === "inner"
        ? "true"
        : "false");
    });
    elements.pauseAction.hidden = !playing;
  }

  function renderPhase(focusAction) {
    elements.phaseTitle.textContent = view.title;
    elements.phaseMessage.textContent = view.message;
    var phaseAction = actionForPhase();
    elements.phaseAction.hidden = phaseAction === null;
    if (phaseAction) {
      elements.phaseAction.dataset.action = phaseAction.action;
      elements.phaseAction.textContent = phaseAction.label;
    }

    if (announcedPhase !== view.phase) {
      announcedPhase = view.phase;
      elements.liveStatus.textContent = view.title + "。" + view.message;
      if (focusAction && phaseAction) {
        elements.phaseAction.focus({ preventScroll: true });
      }
    }
  }

  function render(focusAction) {
    app.dataset.phase = view.phase;
    renderStatus();
    renderPlayers();
    renderControls();
    renderPhase(focusAction);
  }
})(window);
