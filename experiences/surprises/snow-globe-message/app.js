(function () {
  "use strict";

  const root = document.getElementById("snow-globe-app");
  const stage = document.getElementById("globe-stage");
  const interaction = document.getElementById("globe-interaction");
  const canvas = document.getElementById("snow-canvas");
  const fallback = document.getElementById("canvas-fallback");
  const controls = document.getElementById("wind-controls");
  const buttons = Array.from(controls.querySelectorAll(".wind-button"));
  const progress = document.getElementById("progress");
  const mainAction = document.getElementById("main-action");
  const privacy = root.querySelector(".privacy-note");
  const live = document.getElementById("live-region");

  let logic = window.SNOW_GLOBE_MESSAGE_LOGIC || null;
  let state = logic ? logic.createInitialState() : null;
  let view = logic && state ? logic.getPublicView(state) : null;
  let preparationFailed = false;
  let preparing = false;
  let pointerGeneration = 0;
  let pointerSession = null;
  let settleRun = null;
  let resultNode = null;
  let canvasContext = null;
  let noCanvas = false;

  const reducedMotion = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener() {}, removeEventListener() {} };

  const flakes = Array.from({ length: 72 }, function (_unused, index) {
    return {
      x: 86 + ((index * 137 + 41) % 828),
      y: 54 + ((index * 251 + 97) % 690),
      radius: 3 + ((index * 17) % 5),
    };
  });

  try {
    canvasContext = canvas.getContext("2d");
    if (!canvasContext) noCanvas = true;
  } catch (_error) {
    noCanvas = true;
  }
  root.classList.toggle("no-canvas", noCanvas);

  function foregroundFocusPolicy() {
    return document.visibilityState === "visible"
      && typeof document.hasFocus === "function"
      && document.hasFocus();
  }

  function announce(message) {
    const revision = view ? view.revision : -1;
    live.textContent = "";
    queueMicrotask(function () {
      if (view && view.revision === revision) live.textContent = message;
    });
  }

  function clearPointerSession() {
    if (!pointerSession) return;
    const pointerId = pointerSession.pointerId;
    pointerSession = null;
    try {
      if (interaction.hasPointerCapture(pointerId)) interaction.releasePointerCapture(pointerId);
    } catch (_error) {
      // Capture may already have been released by the browser.
    }
  }

  function clearSettlingResources() {
    if (!settleRun) return;
    if (settleRun.rafId !== null) cancelAnimationFrame(settleRun.rafId);
    if (settleRun.timeoutId !== null) clearTimeout(settleRun.timeoutId);
    reducedMotion.removeEventListener("change", settleRun.onMotionChange);
    settleRun = null;
  }

  function createResult(currentView) {
    const section = document.createElement("section");
    section.id = "final-message";
    section.className = "result-letter";

    const patternLabel = document.createElement("p");
    patternLabel.id = "pattern-label";
    patternLabel.className = "pattern-label";
    patternLabel.dataset.field = "patternLabel";
    patternLabel.textContent = currentView.patternLabel;

    const recipientLine = document.createElement("p");
    recipientLine.className = "recipient-line";
    recipientLine.append(document.createTextNode("给 "));
    const recipient = document.createElement("span");
    recipient.dataset.field = "recipient";
    recipient.textContent = currentView.recipient;
    recipientLine.append(recipient);

    const title = document.createElement("h2");
    title.id = "final-title";
    title.dataset.field = "finalTitle";
    title.setAttribute("tabindex", "-1");
    title.textContent = currentView.finalTitle;

    const note = document.createElement("p");
    note.className = "final-note";
    note.dataset.field = "finalNote";
    note.textContent = currentView.finalNote;

    const signature = document.createElement("p");
    signature.className = "signature";
    signature.append(document.createTextNode("——"));
    const sender = document.createElement("span");
    sender.dataset.field = "sender";
    sender.textContent = currentView.sender;
    signature.append(sender);

    section.append(patternLabel, recipientLine, title, note, signature);
    return section;
  }

  function removeResult() {
    if (resultNode) resultNode.remove();
    resultNode = null;
    stage.removeAttribute("role");
    stage.removeAttribute("aria-labelledby");
  }

  function renderFallback(currentView) {
    fallback.replaceChildren();
    const shouldShow = noCanvas
      && (currentView.phase === "settling" || currentView.phase === "complete");
    fallback.hidden = !shouldShow;
    canvas.hidden = noCanvas;
    if (!shouldShow) return;

    const activeCells = new Set();
    for (const target of currentView.visibleTargets) {
      const column = Math.round((target.x - logic.TARGET_X_ORIGIN) / logic.TARGET_X_STEP);
      const row = Math.round((target.y - logic.TARGET_Y_ORIGIN) / logic.TARGET_Y_STEP);
      activeCells.add(`${row}:${column}`);
    }
    for (let row = 0; row < logic.GRID_ROWS; row += 1) {
      for (let column = 0; column < logic.GRID_COLUMNS; column += 1) {
        const cell = document.createElement("span");
        cell.className = activeCells.has(`${row}:${column}`)
          ? "fallback-cell is-active"
          : "fallback-cell";
        fallback.append(cell);
      }
    }
  }

  function drawSnow(currentView, amount) {
    if (noCanvas || !canvasContext) return;
    const context = canvasContext;
    const targets = currentView.visibleTargets;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff7e8";

    for (let index = 0; index < flakes.length; index += 1) {
      const flake = flakes[index];
      let x = flake.x;
      let y = flake.y;
      let radius = flake.radius;
      if (targets.length > 0) {
        const target = index < targets.length
          ? targets[index]
          : { x: 260 + ((index * 89) % 480), y: 786 + ((index * 11) % 36) };
        const eased = 1 - Math.pow(1 - amount, 3);
        x += (target.x - x) * eased;
        y += (target.y - y) * eased;
        if (index < targets.length) radius += 3 * eased;
      }
      context.globalAlpha = 0.5 + ((index * 13) % 50) / 100;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function render(options) {
    const settings = options || {};
    if (!view) return;

    root.hidden = false;
    root.dataset.phase = view.phase;
    stage.dataset.phase = view.phase;
    interaction.setAttribute("aria-hidden", "true");
    controls.hidden = preparationFailed;
    progress.textContent = preparationFailed
      ? "暂时没准备好，请重新准备。"
      : view.progressText;

    for (let index = 0; index < buttons.length; index += 1) {
      const button = buttons[index];
      const control = view.windControls[index];
      const stateLabel = button.querySelector(".wind-state");
      button.dataset.collected = String(control.collected);
      button.setAttribute("aria-pressed", String(control.collected));
      button.setAttribute(
        "aria-label",
        control.collected ? `${control.label}，已收好` : `收集${control.label}风`,
      );
      button.disabled = !view.canAddWind || control.collected;
      stateLabel.textContent = control.collected ? "✓ 已收好" : "";
    }

    mainAction.hidden = true;
    mainAction.removeAttribute("aria-disabled");
    if (preparationFailed) {
      mainAction.hidden = false;
      mainAction.textContent = "重新准备";
    } else if (view.canBeginSettle) {
      mainAction.hidden = false;
      mainAction.textContent = "让雪落下";
    } else if (view.isSettling) {
      mainAction.hidden = false;
      mainAction.textContent = "正在落下…";
      mainAction.setAttribute("aria-disabled", "true");
    } else if (view.canRestart) {
      mainAction.hidden = false;
      mainAction.textContent = "再看一次";
    }

    if (view.phase === "complete") {
      if (!resultNode) {
        resultNode = createResult(view);
        root.insertBefore(resultNode, mainAction);
      }
      stage.setAttribute("role", "img");
      stage.setAttribute("aria-labelledby", "pattern-label");
    } else {
      removeResult();
    }

    renderFallback(view);
    if (!noCanvas) {
      if (view.phase === "complete") drawSnow(view, 1);
      else if (view.phase !== "settling") drawSnow(view, 0);
    }

    if (settings.focusMain && !mainAction.hidden) mainAction.focus();
    if (settings.focusFirstWind && !buttons[0].disabled) buttons[0].focus();
    if (settings.focusResult && resultNode) {
      const title = resultNode.querySelector("#final-title");
      if (title) title.focus();
    }
  }

  function attemptPrepare(focusAfter) {
    if (preparing) return;
    preparing = true;
    try {
      logic = window.SNOW_GLOBE_MESSAGE_LOGIC;
      if (!logic) throw new Error("logic unavailable");
      if (!state) state = logic.createInitialState();
      const action = logic.createStartAction(window.SNOW_GLOBE_MESSAGE_CONFIG);
      if (!action) throw new Error("start unavailable");
      const next = logic.reduce(state, action);
      const nextView = logic.getPublicView(next);
      if (nextView.phase !== "gathering") throw new Error("prepare rejected");
      state = next;
      view = nextView;
      preparationFailed = false;
      pointerGeneration += 1;
      clearPointerSession();
      render({ focusFirstWind: Boolean(focusAfter) });
    } catch (_error) {
      preparationFailed = true;
      if (logic && state) view = logic.getPublicView(state);
      controls.hidden = true;
      progress.textContent = "暂时没准备好，请重新准备。";
      mainAction.hidden = false;
      mainAction.textContent = "重新准备";
      root.dataset.phase = "intro";
      stage.dataset.phase = "intro";
      root.hidden = false;
    } finally {
      preparing = false;
    }
  }

  function addWind(direction, source) {
    if (!view || !view.canAddWind) return;
    const focusedInGroup = source === "button" && controls.contains(document.activeElement);
    const previous = state;
    const next = logic.reduce(state, { type: "ADD_WIND", direction });
    if (next === previous) return;
    state = next;
    view = logic.getPublicView(state);
    if (!view.canAddWind) {
      pointerGeneration += 1;
      clearPointerSession();
    }
    render({ focusMain: focusedInGroup && view.phase === "armed" });
    if (view.phase === "armed") {
      announce("四阵风都收好了。可以让雪落下。");
    } else {
      const label = logic.DIRECTION_LABELS[direction];
      announce(`收好一阵${label}风。现在是 ${view.collectedCount} / 4。`);
    }
  }

  function finishSettling(token, focusPolicy) {
    if (!view || view.phase !== "settling" || view.settleToken !== token) return;
    clearSettlingResources();
    const previous = state;
    const next = logic.reduce(state, { type: "COMPLETE_SETTLE", settleToken: token });
    if (next === previous) return;
    state = next;
    view = logic.getPublicView(state);
    render({ focusResult: Boolean(focusPolicy) });
    announce("雪已经停下，留言已展开。");
  }

  function scheduleSettling() {
    const token = view.settleToken;
    const startedAt = performance.now();
    const onMotionChange = function (event) {
      if (event.matches) queueMicrotask(function () {
        finishSettling(token, foregroundFocusPolicy());
      });
    };
    settleRun = {
      token,
      startedAt,
      rafId: null,
      timeoutId: null,
      onMotionChange,
    };
    reducedMotion.addEventListener("change", onMotionChange);

    if (reducedMotion.matches || noCanvas) {
      queueMicrotask(function () {
        finishSettling(token, foregroundFocusPolicy());
      });
      return;
    }

    function frame(now) {
      if (!settleRun || settleRun.token !== token) return;
      const amount = Math.min(1, Math.max(0, (now - startedAt) / logic.SETTLE_DURATION_MS));
      try {
        drawSnow(view, amount);
      } catch (_error) {
        noCanvas = true;
        root.classList.add("no-canvas");
        renderFallback(view);
        queueMicrotask(function () {
          finishSettling(token, foregroundFocusPolicy());
        });
        return;
      }
      if (amount >= 1) {
        finishSettling(token, foregroundFocusPolicy());
        return;
      }
      settleRun.rafId = requestAnimationFrame(frame);
    }

    settleRun.rafId = requestAnimationFrame(frame);
    settleRun.timeoutId = setTimeout(function () {
      finishSettling(token, foregroundFocusPolicy());
    }, logic.SETTLE_TIMEOUT_MS);
  }

  function beginSettling() {
    if (!view || !view.canBeginSettle || settleRun) return;
    const previous = state;
    const next = logic.reduce(state, { type: "BEGIN_SETTLE" });
    if (next === previous) return;
    state = next;
    view = logic.getPublicView(state);
    render();
    scheduleSettling();
  }

  function restart() {
    if (!view || !view.canRestart || preparing) return;
    clearSettlingResources();
    clearPointerSession();
    pointerGeneration += 1;
    const previous = state;
    const next = logic.reduce(state, { type: "RESTART" });
    if (next === previous) return;
    state = next;
    view = logic.getPublicView(state);
    live.textContent = "";
    render();
    attemptPrepare(true);
  }

  for (const button of buttons) {
    button.addEventListener("click", function () {
      addWind(button.dataset.direction, "button");
    });
  }

  mainAction.addEventListener("click", function () {
    if (preparationFailed) attemptPrepare(true);
    else if (!view) attemptPrepare(true);
    else if (view.phase === "armed") beginSettling();
    else if (view.phase === "complete") restart();
  });

  interaction.addEventListener("pointerdown", function (event) {
    if (!view || !view.canAddWind || pointerSession || !event.isPrimary) return;
    const rect = interaction.getBoundingClientRect();
    const shortSide = Math.min(rect.width, rect.height);
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)
      || !Number.isFinite(shortSide) || shortSide <= 0) return;
    try {
      interaction.setPointerCapture(event.pointerId);
      if (!interaction.hasPointerCapture(event.pointerId)) return;
    } catch (_error) {
      return;
    }
    pointerSession = {
      pointerId: event.pointerId,
      generation: pointerGeneration,
      startX: event.clientX,
      startY: event.clientY,
      shortSide,
      latched: false,
    };
  });

  interaction.addEventListener("pointermove", function (event) {
    const session = pointerSession;
    if (!session || event.pointerId !== session.pointerId
      || session.generation !== pointerGeneration || !view || !view.canAddWind) return;
    const normalize = function (value) {
      return Math.max(-1000, Math.min(1000, Math.round(value / session.shortSide * 1000)));
    };
    const sample = logic.classifyWindSample(
      session.latched,
      normalize(event.clientX - session.startX),
      normalize(event.clientY - session.startY),
    );
    if (!sample) return;
    session.latched = sample.latched;
    if (sample.direction) addWind(sample.direction, "pointer");
  });

  interaction.addEventListener("pointerup", clearPointerSession);
  interaction.addEventListener("pointercancel", clearPointerSession);
  interaction.addEventListener("lostpointercapture", clearPointerSession);

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "hidden") return;
    clearPointerSession();
    if (settleRun) finishSettling(settleRun.token, false);
  });
  window.addEventListener("pagehide", function () {
    clearPointerSession();
    if (settleRun) finishSettling(settleRun.token, false);
  });
  window.addEventListener("blur", function () {
    clearPointerSession();
    if (settleRun) finishSettling(settleRun.token, false);
  });

  privacy.textContent = "这只雪球只在本机运行，留言会在雪停后才出现。";
  attemptPrepare(false);
})();
