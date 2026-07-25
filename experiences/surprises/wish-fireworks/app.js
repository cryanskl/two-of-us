(function () {
  "use strict";

  const logic = window.WISH_FIREWORKS_LOGIC;
  const rawConfig = window.WISH_FIREWORKS_CONFIG;
  const root = document.documentElement;
  const main = document.getElementById("wish-fireworks");
  const pageTitle = document.getElementById("page-title");
  const stage = document.getElementById("sky-stage");
  const canvas = document.getElementById("fireworks-canvas");
  const burstFallback = document.getElementById("burst-fallback");
  const revealedList = document.getElementById("revealed-glyphs");
  const progress = document.getElementById("progress-status");
  const controls = document.getElementById("launch-controls");
  const heightSelect = document.getElementById("height-select");
  const holdLaunch = document.getElementById("hold-launch");
  const directLaunch = document.getElementById("direct-launch");
  const primaryAction = document.getElementById("primary-action");
  const liveRegion = document.getElementById("live-region");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointerEventsAvailable = typeof window.PointerEvent === "function";
  const pointerBuckets = ["mouse", "touch", "pen", "other"];

  if (!logic || !main || !pageTitle || !stage || !canvas || !burstFallback
    || !revealedList || !progress || !controls || !heightSelect || !holdLaunch
    || !directLaunch || !primaryAction || !liveRegion || !motionQuery) return;

  let state = logic.createInitialState();
  let preparationFailed = false;
  let startInProgress = false;
  let generation = 0;
  let chargeSession = null;
  let reducedPointerCandidate = null;
  let activeBurst = null;
  let pendingResultFocus = null;
  let canvasContext = null;
  let canvasAvailable = false;
  const heldKeys = new Set();
  const suppressedMainPointerClicks = {
    mouse: null,
    touch: null,
    pen: null,
    other: null,
  };

  try {
    canvasContext = canvas.getContext("2d");
    canvasAvailable = Boolean(canvasContext && canvas.width > 0 && canvas.height > 0);
  } catch (_error) {
    canvasContext = null;
    canvasAvailable = false;
  }

  function normalizePointerType(value) {
    return pointerBuckets.includes(value) ? value : "other";
  }

  function safePointerId(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
      ? value
      : null;
  }

  function safeNow() {
    let value;
    try {
      value = performance.now();
    } catch (_error) {
      return null;
    }
    if (!Number.isFinite(value) || value < 0) return null;
    const integer = Math.trunc(value);
    return Number.isSafeInteger(integer) ? integer : null;
  }

  function validRect(rect) {
    if (!rect) return false;
    const values = [rect.left, rect.right, rect.top, rect.bottom];
    if (values.some((value) => !Number.isFinite(value)
      || Math.abs(value) > Number.MAX_SAFE_INTEGER)) return false;
    return rect.left <= rect.right && rect.top <= rect.bottom;
  }

  function pointInside(rect, x, y) {
    return validRect(rect)
      && Number.isFinite(x) && Number.isFinite(y)
      && Math.abs(x) <= Number.MAX_SAFE_INTEGER
      && Math.abs(y) <= Number.MAX_SAFE_INTEGER
      && x >= rect.left && x <= rect.right
      && y >= rect.top && y <= rect.bottom;
  }

  function selectedUnits() {
    if (!/^[0-4]$/.test(heightSelect.value)) heightSelect.value = "2";
    const band = Number(heightSelect.value);
    const units = logic.directUnitsForBand(band);
    if (units !== null) return units;
    heightSelect.value = "2";
    return logic.directUnitsForBand(logic.DEFAULT_CHARGE_BAND);
  }

  function makeDotGrid(targets, band, className) {
    const grid = document.createElement("div");
    grid.className = className;
    grid.setAttribute("aria-hidden", "true");
    const active = new Set();
    const apex = logic.APEX_Y_BY_BAND[band];
    for (const target of targets) {
      const column = Math.round((target.x - 260) / 60);
      const row = Math.round((target.y - (apex - 240)) / 60);
      if (row >= 0 && row < 9 && column >= 0 && column < 9) {
        active.add(`${row}:${column}`);
      }
    }
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        const dot = document.createElement("span");
        dot.className = "glyph-dot";
        if (active.has(`${row}:${column}`)) dot.dataset.active = "true";
        grid.append(dot);
      }
    }
    return grid;
  }

  function renderRevealed(view) {
    revealedList.replaceChildren();
    for (const glyph of view.revealedGlyphs) {
      const item = document.createElement("li");
      item.className = "revealed-glyph";
      item.dataset.glyphId = glyph.id;
      item.append(makeDotGrid(glyph.targets, logic.DEFAULT_CHARGE_BAND, "glyph-grid"));
      const label = document.createElement("span");
      label.className = "glyph-label";
      label.textContent = glyph.label;
      item.append(label);
      revealedList.append(item);
    }
    revealedList.hidden = view.revealedGlyphs.length === 0;
  }

  function renderBurstFallback(view) {
    burstFallback.replaceChildren();
    if (!view.isBursting || view.currentChargeBand === null) return;
    burstFallback.append(
      makeDotGrid(view.currentTargets, view.currentChargeBand, "glyph-grid current-grid"),
    );
  }

  function removeResult() {
    const existing = document.getElementById("final-message");
    if (existing) existing.remove();
  }

  function renderResult(view) {
    removeResult();
    if (view.phase !== "complete") return;

    const section = document.createElement("section");
    section.id = "final-message";
    section.className = "result-letter";

    const pattern = document.createElement("p");
    pattern.id = "pattern-label";
    pattern.className = "pattern-label";
    pattern.dataset.field = "patternLabel";
    pattern.textContent = view.patternLabel;

    const recipient = document.createElement("p");
    recipient.className = "recipient-line";
    recipient.append("给 ");
    const recipientValue = document.createElement("span");
    recipientValue.dataset.field = "recipient";
    recipientValue.textContent = view.recipient;
    recipient.append(recipientValue);

    const title = document.createElement("h2");
    title.id = "final-title";
    title.dataset.field = "finalTitle";
    title.tabIndex = -1;
    title.setAttribute("aria-describedby", "revealed-glyphs pattern-label");
    title.textContent = view.finalTitle;

    const note = document.createElement("p");
    note.className = "final-note";
    note.dataset.field = "finalNote";
    note.textContent = view.finalNote;

    const signature = document.createElement("p");
    signature.className = "signature";
    signature.append("——");
    const sender = document.createElement("span");
    sender.dataset.field = "sender";
    sender.textContent = view.sender;
    signature.append(sender);

    section.append(pattern, recipient, title, note, signature);
    main.insertBefore(section, primaryAction);
  }

  function drawDot(context, x, y, alpha, radius) {
    context.save();
    context.globalAlpha = Math.max(0, Math.min(1, alpha));
    context.fillStyle = "#f0d3a1";
    context.shadowColor = "#e4bc78";
    context.shadowBlur = radius * 2.2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawStableGlyphs(view) {
    if (!canvasAvailable) return;
    const centers = view.revealedGlyphs.length === 1
      ? [500]
      : view.revealedGlyphs.length === 2
        ? [360, 640]
        : [220, 500, 780];
    view.revealedGlyphs.forEach((glyph, glyphIndex) => {
      const centerX = centers[glyphIndex];
      for (const target of glyph.targets) {
        const x = centerX + (target.x - 500) * 0.48;
        const y = 455 + (target.y - 350) * 0.48;
        drawDot(canvasContext, x, y, 0.98, 8);
      }
    });
  }

  function clearCanvas(view) {
    if (!canvasAvailable) return;
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    drawStableGlyphs(view);
  }

  function drawBurstFrame(view, tick) {
    if (!canvasAvailable || !view.isBursting || view.currentChargeBand === null) return;
    clearCanvas(view);
    const apexY = logic.APEX_Y_BY_BAND[view.currentChargeBand];
    if (tick < logic.ASCENT_TICKS) {
      const amount = tick / logic.ASCENT_TICKS;
      const y = logic.ROCKET_START_Y + (apexY - logic.ROCKET_START_Y) * amount;
      canvasContext.save();
      canvasContext.strokeStyle = "#b54c36";
      canvasContext.lineWidth = 4;
      canvasContext.globalAlpha = 0.72;
      canvasContext.beginPath();
      canvasContext.moveTo(logic.ROCKET_START_X, logic.ROCKET_START_Y);
      canvasContext.lineTo(logic.ROCKET_START_X, y);
      canvasContext.stroke();
      canvasContext.restore();
      drawDot(canvasContext, logic.ROCKET_START_X, y, 1, 10);
      return;
    }

    let formation = 1;
    let alpha = 1;
    if (tick <= logic.ASCENT_TICKS + logic.FORMATION_TICKS) {
      formation = (tick - logic.ASCENT_TICKS) / logic.FORMATION_TICKS;
    } else if (tick > logic.ASCENT_TICKS + logic.FORMATION_TICKS + logic.HOLD_TICKS) {
      const fadeStart = logic.ASCENT_TICKS + logic.FORMATION_TICKS + logic.HOLD_TICKS;
      alpha = 1 - (tick - fadeStart) / logic.FADE_TICKS;
    }
    for (const target of view.currentTargets) {
      const x = logic.ROCKET_START_X + (target.x - logic.ROCKET_START_X) * formation;
      const y = apexY + (target.y - apexY) * formation;
      drawDot(canvasContext, x, y, alpha, 8);
    }
  }

  function render() {
    const view = logic.getPublicView(state);
    main.dataset.phase = view.phase;
    root.classList.toggle("canvas-failed", !canvasAvailable);
    root.classList.toggle("motion-reduced", motionQuery.matches);
    progress.textContent = preparationFailed
      ? "暂时没准备好，请重新准备。"
      : view.progressText;
    renderRevealed(view);
    renderBurstFallback(view);
    renderResult(view);

    const launchVisible = view.phase === "ready" || view.phase === "bursting";
    controls.hidden = !launchVisible;
    const launchBlocked = !view.canLaunch;
    holdLaunch.setAttribute("aria-disabled", String(launchBlocked));
    directLaunch.setAttribute("aria-disabled", String(launchBlocked));
    holdLaunch.dataset.canHold = String(
      view.canLaunch && pointerEventsAvailable && !motionQuery.matches,
    );

    const primaryVisible = view.phase === "intro" || view.phase === "complete";
    primaryAction.hidden = !primaryVisible;
    if (view.phase === "complete") primaryAction.textContent = "再看一次";
    else primaryAction.textContent = preparationFailed ? "重新准备" : "开始点光";

    if (!activeBurst) clearCanvas(view);
    return view;
  }

  function setHolding(active, ratio) {
    holdLaunch.setAttribute("aria-pressed", String(active));
    holdLaunch.style.setProperty("--charge", `${Math.max(0, Math.min(1, ratio || 0)) * 100}%`);
    holdLaunch.classList.toggle("is-holding", active);
  }

  function removeDocumentFallback(session) {
    if (!session || !session.fallback) return;
    document.removeEventListener("pointerup", onDocumentPointerUp, true);
    document.removeEventListener("pointercancel", onDocumentPointerCancel, true);
    session.fallback = false;
  }

  function stopChargeLoop(session) {
    if (!session) return;
    if (session.chargeRaf !== null) cancelAnimationFrame(session.chargeRaf);
    session.chargeRaf = null;
    setHolding(false, 0);
  }

  function releaseCapture(session) {
    if (!session || !session.captured) return;
    session.captured = false;
    try {
      if (holdLaunch.hasPointerCapture(session.pointerId)) {
        holdLaunch.releasePointerCapture(session.pointerId);
      }
    } catch (_error) {
      // Capture may already be released by the browser.
    }
  }

  function tombstone(session) {
    if (!session) return;
    suppressedMainPointerClicks[session.pointerType] = {
      generation: session.generation,
      pointerId: session.pointerId,
      pointerType: session.pointerType,
    };
  }

  function cancelInput(options) {
    const settings = options || {};
    const session = chargeSession;
    const reducedCandidate = reducedPointerCandidate;
    if (settings.suppress) tombstone(session || reducedCandidate);
    generation += 1;
    chargeSession = null;
    reducedPointerCandidate = null;
    if (session) {
      stopChargeLoop(session);
      removeDocumentFallback(session);
      releaseCapture(session);
    }
    heldKeys.clear();
    setHolding(false, 0);
  }

  function chargeFrame(session) {
    if (chargeSession !== session || session.phase !== "holding") return;
    const now = safeNow();
    const elapsed = now === null ? 0 : Math.max(0, Math.min(logic.MAX_HOLD_MS, now - session.startMs));
    setHolding(true, elapsed / logic.MAX_HOLD_MS);
    session.chargeRaf = requestAnimationFrame(() => chargeFrame(session));
  }

  function beginPointer(event) {
    const view = logic.getPublicView(state);
    if (!view.canLaunch || event.isPrimary === false) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (chargeSession && chargeSession.phase === "holding") return;
    const pointerId = safePointerId(event.pointerId);
    if (pointerId === null) return;
    const pointerType = normalizePointerType(event.pointerType);
    generation += 1;

    if (motionQuery.matches) {
      reducedPointerCandidate = {
        generation,
        pointerId,
        pointerType,
        index: view.completedCount,
        expectedRevision: view.revision,
      };
      chargeSession = null;
      return;
    }

    const startMs = safeNow();
    const rect = holdLaunch.getBoundingClientRect();
    if (startMs === null || !validRect(rect)) return;

    const session = {
      phase: "holding",
      generation,
      pointerId,
      pointerType,
      startMs,
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      },
      index: view.completedCount,
      expectedRevision: view.revision,
      candidate: null,
      captured: false,
      fallback: false,
      chargeRaf: null,
    };
    chargeSession = session;
    setHolding(true, 0);
    event.preventDefault();
    try {
      holdLaunch.setPointerCapture(pointerId);
      session.captured = true;
    } catch (_error) {
      session.fallback = true;
      document.addEventListener("pointerup", onDocumentPointerUp, true);
      document.addEventListener("pointercancel", onDocumentPointerCancel, true);
    }
    session.chargeRaf = requestAnimationFrame(() => chargeFrame(session));
  }

  function finishPointer(event) {
    const session = chargeSession;
    if (!session || session.phase !== "holding"
      || safePointerId(event.pointerId) !== session.pointerId
      || normalizePointerType(event.pointerType) !== session.pointerType) return;
    const endMs = safeNow();
    const quantized = endMs === null ? null : logic.quantizeHold(session.startMs, endMs);
    const accepted = quantized !== null
      && pointInside(session.rect, event.clientX, event.clientY);
    stopChargeLoop(session);
    removeDocumentFallback(session);
    session.phase = "awaiting-click";
    session.candidate = {
      generation: session.generation,
      pointerId: session.pointerId,
      pointerType: session.pointerType,
      accepted,
      chargeUnits: accepted ? quantized.chargeUnits : null,
      index: session.index,
      expectedRevision: session.expectedRevision,
    };
    releaseCapture(session);
  }

  function cancelMatchingPointer(event) {
    const pointerId = safePointerId(event.pointerId);
    const pointerType = normalizePointerType(event.pointerType);
    const session = chargeSession;
    if (session && session.pointerId === pointerId && session.pointerType === pointerType) {
      chargeSession = null;
      stopChargeLoop(session);
      removeDocumentFallback(session);
      releaseCapture(session);
    }
    if (reducedPointerCandidate
      && reducedPointerCandidate.pointerId === pointerId
      && reducedPointerCandidate.pointerType === pointerType) {
      reducedPointerCandidate = null;
    }
    const debt = suppressedMainPointerClicks[pointerType];
    if (debt && debt.pointerId === pointerId) suppressedMainPointerClicks[pointerType] = null;
  }

  function onDocumentPointerUp(event) {
    finishPointer(event);
  }

  function onDocumentPointerCancel(event) {
    cancelMatchingPointer(event);
  }

  function consumeTombstone(event, candidate) {
    if (event.detail !== 1) return false;
    const pointerId = safePointerId(event.pointerId);
    const pointerType = normalizePointerType(event.pointerType);
    const hasDebt = pointerBuckets.some((bucket) => suppressedMainPointerClicks[bucket]);
    if (pointerId === null) return hasDebt;
    const debt = suppressedMainPointerClicks[pointerType];
    if (!debt) return false;
    if (debt.pointerId === pointerId) {
      suppressedMainPointerClicks[pointerType] = null;
      if (candidate && candidate.pointerId === pointerId
        && candidate.pointerType === pointerType) {
        chargeSession = null;
        reducedPointerCandidate = null;
      }
      return true;
    }
    const candidateMatches = candidate
      && candidate.pointerId === pointerId
      && candidate.pointerType === pointerType;
    return !candidateMatches;
  }

  function dispatchLaunch(index, expectedRevision, chargeUnits, launcher) {
    const before = state;
    state = logic.reduce(state, {
      type: "LAUNCH",
      index,
      expectedRevision,
      chargeUnits,
    });
    if (state === before) {
      render();
      return false;
    }
    const view = render();
    startBurst(view, launcher);
    return true;
  }

  function mainClick(event) {
    if (event.detail > 1) return;
    const view = logic.getPublicView(state);
    if (!view.canLaunch) return;
    let candidate = motionQuery.matches
      ? reducedPointerCandidate
      : chargeSession && chargeSession.phase === "awaiting-click"
        ? chargeSession.candidate
        : null;
    if (consumeTombstone(event, candidate)) return;

    let units = null;
    let index = view.completedCount;
    let revision = view.revision;
    if (event.detail === 0) {
      cancelInput();
      units = selectedUnits();
    } else if (!pointerEventsAvailable) {
      units = selectedUnits();
    } else if (motionQuery.matches) {
      const pointerId = safePointerId(event.pointerId);
      const pointerType = normalizePointerType(event.pointerType);
      if (!candidate || candidate.pointerId !== pointerId
        || candidate.pointerType !== pointerType) return;
      index = candidate.index;
      revision = candidate.expectedRevision;
      units = selectedUnits();
      generation += 1;
      reducedPointerCandidate = null;
    } else {
      const pointerId = safePointerId(event.pointerId);
      const pointerType = normalizePointerType(event.pointerType);
      if (!candidate || !candidate.accepted || candidate.pointerId !== pointerId
        || candidate.pointerType !== pointerType) return;
      index = candidate.index;
      revision = candidate.expectedRevision;
      units = candidate.chargeUnits;
      generation += 1;
      chargeSession = null;
    }
    dispatchLaunch(index, revision, units, holdLaunch);
  }

  function directClick(event) {
    if (event.detail > 1) return;
    const view = logic.getPublicView(state);
    if (!view.canLaunch) return;
    const index = view.completedCount;
    const revision = view.revision;
    const units = selectedUnits();
    cancelInput({ suppress: Boolean(chargeSession || reducedPointerCandidate) });
    dispatchLaunch(index, revision, units, directLaunch);
  }

  function finishBurst(token, launcher) {
    if (!activeBurst || activeBurst.token !== token) return;
    const burst = activeBurst;
    activeBurst = null;
    if (burst.raf !== null) cancelAnimationFrame(burst.raf);
    if (burst.timeout !== null) clearTimeout(burst.timeout);

    const before = logic.getPublicView(state);
    state = logic.reduce(state, { type: "COMPLETE_BURST", burstToken: token });
    const view = render();
    if (view.revision === before.revision) return;

    if (view.phase === "complete") {
      const canFocusNow = document.visibilityState === "visible" && document.hasFocus();
      if (canFocusNow) {
        const title = document.getElementById("final-title");
        if (title) title.focus();
      } else {
        pendingResultFocus = { burstToken: token, launcher };
      }
    } else {
      const glyph = view.revealedGlyphs[view.revealedGlyphs.length - 1];
      liveRegion.textContent = `第 ${view.completedCount} 束留下：${glyph.label}`;
    }
  }

  function runBurstFrame(burst) {
    if (activeBurst !== burst) return;
    const now = safeNow();
    const tick = now === null ? null : logic.presentationTick(burst.startMs, now);
    if (tick === null) {
      finishBurst(burst.token, burst.launcher);
      return;
    }
    try {
      drawBurstFrame(logic.getPublicView(state), tick);
    } catch (_error) {
      canvasAvailable = false;
      queueMicrotask(() => finishBurst(burst.token, burst.launcher));
      return;
    }
    if (tick >= logic.TOTAL_PRESENTATION_TICKS) {
      finishBurst(burst.token, burst.launcher);
      return;
    }
    burst.raf = requestAnimationFrame(() => runBurstFrame(burst));
  }

  function startBurst(view, launcher) {
    if (!view.isBursting || view.burstToken === null) return;
    const burst = {
      token: view.burstToken,
      launcher,
      startMs: safeNow(),
      raf: null,
      timeout: null,
    };
    activeBurst = burst;
    if (motionQuery.matches || !canvasAvailable || burst.startMs === null) {
      queueMicrotask(() => finishBurst(burst.token, launcher));
      return;
    }
    burst.timeout = setTimeout(
      () => finishBurst(burst.token, launcher),
      logic.ANIMATION_TIMEOUT_MS,
    );
    burst.raf = requestAnimationFrame(() => runBurstFrame(burst));
  }

  function flushPendingResultFocus() {
    if (!pendingResultFocus) return;
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;
    const pending = pendingResultFocus;
    pendingResultFocus = null;
    const view = logic.getPublicView(state);
    const active = document.activeElement;
    const allowedActive = active === document.body || active === pending.launcher;
    if (view.phase !== "complete" || view.revision !== pending.burstToken + 1
      || !allowedActive) return;
    const title = document.getElementById("final-title");
    if (title) title.focus();
  }

  function attemptStart(options) {
    const settings = options || {};
    if (startInProgress || logic.getPublicView(state).phase !== "intro") return;
    startInProgress = true;
    try {
      const action = logic.createStartAction(rawConfig);
      if (action === null) throw new Error("unavailable");
      const next = logic.reduce(state, action);
      if (next === state || logic.getPublicView(next).phase !== "ready") {
        throw new Error("unavailable");
      }
      state = next;
      preparationFailed = false;
      render();
      if (settings.focusOnSuccess) holdLaunch.focus();
    } catch (_error) {
      preparationFailed = true;
      render();
      primaryAction.focus();
    } finally {
      startInProgress = false;
    }
  }

  function primaryClick(event) {
    if (event.detail > 1) return;
    const view = logic.getPublicView(state);
    if (view.phase === "intro") {
      attemptStart({ focusOnSuccess: true });
      return;
    }
    if (view.phase !== "complete" || !view.canRestart) return;
    pendingResultFocus = null;
    const next = logic.reduce(state, { type: "RESTART" });
    if (next === state) return;
    state = next;
    preparationFailed = false;
    render();
    attemptStart({ focusOnSuccess: true });
  }

  function cancelForLifecycle() {
    cancelInput({ suppress: Boolean(chargeSession || reducedPointerCandidate) });
    if (activeBurst) {
      const burst = activeBurst;
      finishBurst(burst.token, burst.launcher);
    }
  }

  function motionChanged() {
    root.classList.toggle("motion-reduced", motionQuery.matches);
    if (motionQuery.matches) {
      cancelInput({ suppress: Boolean(chargeSession || reducedPointerCandidate) });
      if (activeBurst) {
        const burst = activeBurst;
        queueMicrotask(() => finishBurst(burst.token, burst.launcher));
      }
    }
    render();
  }

  function onKeyDown(event) {
    if (event.target !== holdLaunch && event.target !== directLaunch
      && event.target !== primaryAction) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.repeat || heldKeys.has(event.key)) {
      event.preventDefault();
      return;
    }
    heldKeys.add(event.key);
  }

  function onKeyUp(event) {
    heldKeys.delete(event.key);
  }

  holdLaunch.addEventListener("pointerdown", beginPointer);
  holdLaunch.addEventListener("pointerup", finishPointer);
  holdLaunch.addEventListener("pointercancel", cancelMatchingPointer);
  holdLaunch.addEventListener("lostpointercapture", (event) => {
    const session = chargeSession;
    if (!session || session.phase !== "holding"
      || session.pointerId !== safePointerId(event.pointerId)) return;
    cancelMatchingPointer(event);
  });
  holdLaunch.addEventListener("click", mainClick);
  directLaunch.addEventListener("click", directClick);
  primaryAction.addEventListener("click", primaryClick);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", cancelForLifecycle);
  window.addEventListener("focus", flushPendingResultFocus);
  window.addEventListener("pagehide", cancelForLifecycle);
  window.addEventListener("pageshow", flushPendingResultFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") cancelForLifecycle();
    else flushPendingResultFocus();
  });
  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", motionChanged);
  } else {
    motionQuery.addListener(motionChanged);
  }

  root.classList.add("app-ready");
  root.classList.toggle("canvas-failed", !canvasAvailable);
  document.querySelector(".no-js-status").hidden = true;
  render();
  pageTitle.focus();
})();
