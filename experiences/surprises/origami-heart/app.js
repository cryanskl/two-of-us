(function () {
  "use strict";

  const logic = globalThis.OrigamiHeartLogic;
  const app = document.querySelector("#app");
  const phaseMount = document.querySelector("#phase-mount");
  const foldProgress = document.querySelector("#fold-progress");
  const stepCounter = document.querySelector("#step-counter");
  const liveRegion = document.querySelector("#live-region");

  if (!logic || !app || !phaseMount || !foldProgress || !stepCounter || !liveRegion) {
    document.body.textContent = "折纸心加载失败，请确认 config.js、logic.js 与 app.js 都在页面旁边。";
    return;
  }

  let safeConfig;
  let state;
  let view;

  try {
    safeConfig = logic.sanitizeConfig(globalThis.OrigamiHeartConfig);
    state = logic.createInitialState();
    view = logic.getOrigamiHeartView(state, safeConfig);
  } catch (_error) {
    document.body.textContent = "折纸心初始化失败，请重新打开页面。";
    return;
  }

  let gestureGeneration = 0;
  let gesture = null;
  let suppressedCompatibilityClick = null;
  let focusRevision = 0;
  let currentStage = null;

  if (globalThis.CSS?.supports?.("transform-style", "preserve-3d")) {
    document.documentElement.classList.add("has-3d");
  }

  phaseMount.addEventListener("click", handleClick);
  phaseMount.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  document.addEventListener("pointercancel", handlePointerCancel);
  document.addEventListener("lostpointercapture", handleLostPointerCapture, true);
  document.addEventListener("click", suppressCompatibilityClick, true);
  document.addEventListener("keydown", handleKeydown);
  globalThis.addEventListener("blur", clearGesture);
  globalThis.addEventListener("pagehide", clearGesture);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearGesture();
  });

  render("start");

  function handleClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !phaseMount.contains(button) || button.disabled) return;
    const type = button.dataset.action;
    if (type === "COMMIT_FOLD") {
      if (!view.controls.canCommitFold || !view.currentFold) return;
      dispatch({ type, foldId: view.currentFold.id }, "fold");
      return;
    }
    if (type === "START") dispatch({ type }, "fold");
    else if (type === "TURN_OVER") dispatch({ type }, "complete");
    else if (type === "RESTART") dispatch({ type }, "start");
  }

  function handleKeydown(event) {
    if (event.key !== "ArrowRight" || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!view.controls.canCommitFold || !view.currentFold) return;
    event.preventDefault();
    dispatch({ type: "COMMIT_FOLD", foldId: view.currentFold.id }, "fold");
  }

  function handlePointerDown(event) {
    const handle = event.target.closest(".fold-handle");
    if (!handle || !phaseMount.contains(handle) || !view.controls.canCommitFold || !view.currentFold) return;
    if (event.isPrimary === false || (event.pointerType === "mouse" && event.button !== 0)) return;

    const step = logic.FOLD_STEPS.find((candidate) => candidate.id === view.currentFold.id);
    const paper = phaseMount.querySelector(".paper-object");
    if (!step || !paper) return;
    const rect = paper.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const travelPx = size * step.travelFactor;
    if (!Number.isFinite(travelPx) || travelPx < 1) return;

    clearGesture();
    const generation = ++gestureGeneration;
    gesture = {
      generation,
      pointerId: event.pointerId,
      foldId: view.currentFold.id,
      startX: event.clientX,
      startY: event.clientY,
      travelPx,
      progress: 0,
      moved: false,
      handle,
      paper,
    };
    handle.dataset.gestureGeneration = String(generation);
    try {
      handle.setPointerCapture(event.pointerId);
    } catch (_error) {
      // Document-level listeners retain the same-element fallback when capture is unavailable.
    }
  }

  function handlePointerMove(event) {
    const session = matchingGesture(event);
    if (!session) return;
    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    if (Math.hypot(deltaX, deltaY) >= 6) session.moved = true;
    session.progress = logic.projectFoldProgress(session.foldId, deltaX, deltaY, session.travelPx);
    session.paper.style.setProperty("--fold-progress", String(session.progress));
  }

  function handlePointerUp(event) {
    const session = matchingGesture(event);
    if (!session) return;
    const shouldCommit = logic.shouldCommitFold(session.progress);
    if (shouldCommit || session.moved) {
      suppressedCompatibilityClick = {
        generation: session.generation,
        pointerId: session.pointerId,
      };
    }
    const foldId = session.foldId;
    clearGesture();
    if (shouldCommit) dispatch({ type: "COMMIT_FOLD", foldId }, "fold");
  }

  function handlePointerCancel(event) {
    if (matchingGesture(event)) clearGesture();
  }

  function handleLostPointerCapture(event) {
    if (matchingGesture(event)) clearGesture();
  }

  function matchingGesture(event) {
    if (!gesture || gesture.generation !== gestureGeneration || event.pointerId !== gesture.pointerId) return null;
    return gesture;
  }

  function clearGesture() {
    if (gesture?.paper) gesture.paper.style.setProperty("--fold-progress", "0");
    gesture = null;
    gestureGeneration += 1;
  }

  function suppressCompatibilityClick(event) {
    if (!suppressedCompatibilityClick) return;
    const button = event.target.closest?.(".fold-handle");
    if (!button) return;
    const generation = Number(button.dataset.gestureGeneration);
    const pointerMatches = Number.isFinite(event.pointerId)
      && event.pointerId === suppressedCompatibilityClick.pointerId;
    if (generation !== suppressedCompatibilityClick.generation || !pointerMatches) return;
    suppressedCompatibilityClick = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function dispatch(action, focusTarget) {
    let next;
    try {
      next = logic.reduceOrigamiHeart(state, action);
    } catch (_error) {
      liveRegion.textContent = "这一步没有生效，请再试一次。";
      return;
    }
    if (next === state) return;
    state = next;
    view = logic.getOrigamiHeartView(state, safeConfig);
    render(focusTarget);
    announce(action.type);
  }

  function render(focusTarget) {
    clearGesture();
    app.dataset.phase = view.phase;
    stepCounter.textContent = view.text.progress;
    currentStage = buildStage();
    phaseMount.replaceChildren(currentStage);
    renderFoldProgress();
    scheduleFocus(resolveFocus(focusTarget));
  }

  function buildStage() {
    if (view.phase === "complete") return buildComplete();
    const panel = element("div", `phase-panel is-${view.phase}`);
    panel.dataset.screen = view.phase;
    const paperColumn = element("div", "paper-column");
    const reusablePaper = view.phase === "folding" && currentStage?.dataset.screen === "folding"
      ? currentStage.querySelector(".paper-object")
      : null;
    paperColumn.append(buildPaper(reusablePaper), textElement("p", view.text.progress, "paper-state-copy"));
    const interaction = element("div", "interaction-panel");
    interaction.append(
      textElement("h2", view.text.heading, "phase-heading", { id: "phase-heading", tabindex: "-1" }),
      textElement("p", view.text.instruction, "phase-instruction"),
    );
    const actions = element("div", "phase-actions");

    if (view.phase === "intro") {
      interaction.append(
        textElement("p", "没有计时，也没有折错扣分。拖动和按钮都可以完成同一道折痕。", "phase-detail"),
      );
      actions.append(actionButton("开始折", "START", "primary-action", "start-action"));
    } else if (view.phase === "folding") {
      interaction.append(
        textElement("p", `${view.currentFold.label}。沿纸上的箭头拖动，或直接按下纸边的“折好这一步”。`, "phase-detail"),
      );
    } else {
      paperColumn.querySelector(".paper-object")?.classList.add("turning-paper");
      interaction.append(
        textElement("p", "五道折痕都收好了。背面的内容还没有进入页面，等你主动翻开。", "phase-detail"),
      );
      actions.append(actionButton("翻到背面", "TURN_OVER", "primary-action", "turn-action"));
    }

    panel.append(paperColumn, interaction);
    if (actions.childElementCount) panel.append(actions);
    return panel;
  }

  function buildPaper(reusablePaper) {
    const scene = element("div", "paper-scene");
    const paper = reusablePaper || element("div", "paper-object");
    paper.replaceChildren();
    paper.dataset.phase = view.phase;
    paper.dataset.completed = String(view.progress.completed);
    if (view.currentFold) paper.dataset.currentFold = view.currentFold.id;
    else delete paper.dataset.currentFold;
    paper.setAttribute("role", "group");
    paper.setAttribute("aria-label", paperLabel());
    paper.style.setProperty("--fold-progress", "0");

    paper.append(
      visualLayer("div", "paper-shadow"),
      visualLayer("div", "paper-face paper-face--front"),
      visualLayer("div", "paper-face paper-face--back"),
    );

    for (const fold of view.foldList) {
      const flap = visualLayer("div", `paper-flap is-${fold.status}`);
      flap.dataset.foldId = fold.id;
      paper.append(flap);
    }

    const creaseLayer = visualLayer("div", "crease-layer");
    for (const fold of view.foldList) {
      const crease = visualLayer("span", `crease is-${fold.status}`);
      crease.dataset.foldId = fold.id;
      crease.dataset.number = String(fold.index + 1);
      creaseLayer.append(crease);
    }
    paper.append(creaseLayer);

    if (view.phase === "folding" && view.currentFold) {
      const handle = actionButton("", "COMMIT_FOLD", "fold-handle", "fold-handle");
      handle.dataset.foldId = view.currentFold.id;
      handle.setAttribute("aria-label", `${view.currentFold.label}：${view.currentFold.instruction}。按下立即完成，或沿箭头拖动。`);
      handle.append(visualLayer("span", "handle-arrow"), textElement("span", "折好这一步", "handle-label"));
      paper.append(handle);
    }

    scene.append(paper);
    return scene;
  }

  function buildComplete() {
    const panel = element("div", "phase-panel is-complete");
    const paperColumn = element("div", "paper-column");
    const heart = element("div", "final-heart");
    heart.setAttribute("aria-hidden", "true");
    heart.append(element("span", "heart-center"));
    paperColumn.append(heart, textElement("p", "五道折痕，已经收成一颗心。", "paper-state-copy"));

    const content = view.privateContent;
    const note = element("article", "final-note");
    note.append(
      textElement("p", content.recipientName, "recipient"),
      textElement("h2", content.finalTitle, "final-title", { id: "phase-heading", tabindex: "-1" }),
      textElement("p", content.finalMessage, "final-message"),
      textElement("p", `—— ${content.signature}`, "signature"),
      actionButton("再折一次", "RESTART", "secondary-action", "restart-action"),
    );
    panel.append(paperColumn, note);
    return panel;
  }

  function renderFoldProgress() {
    foldProgress.replaceChildren();
    for (const fold of view.foldList) {
      const item = element("li", "");
      item.dataset.status = fold.status;
      if (fold.status === "current") item.setAttribute("aria-current", "step");
      const statusText = fold.status === "done" ? "已折好" : fold.status === "current" ? "正在折" : "还没开始";
      const copy = element("span", "step-copy");
      copy.append(
        textElement("span", fold.label, "step-label"),
        textElement("span", statusText, "step-status"),
      );
      item.append(
        textElement("span", fold.status === "done" ? "✓" : String(fold.index + 1), "step-number", { "aria-hidden": "true" }),
        copy,
      );
      foldProgress.append(item);
    }
  }

  function announce(actionType) {
    if (actionType === "START") {
      liveRegion.textContent = "开始第一道折痕。";
      return;
    }
    if (actionType === "COMMIT_FOLD") {
      if (view.phase === "turning") {
        liveRegion.textContent = "五道折痕完成。现在可以翻到背面。";
      } else {
        const completed = view.progress.completed;
        liveRegion.textContent = `第 ${completed} 道折痕完成。下一步，${view.currentFold.instruction}。`;
      }
      return;
    }
    if (actionType === "TURN_OVER") {
      liveRegion.textContent = view.privateContent.finalTitle;
      return;
    }
    if (actionType === "RESTART") liveRegion.textContent = "";
  }

  function resolveFocus(requested) {
    if (view.phase === "turning") return "turn-action";
    if (view.phase === "complete") return "phase-heading";
    if (view.phase === "folding") return "fold-handle";
    return requested || "start-action";
  }

  function scheduleFocus(name) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      const target = phaseMount.querySelector(`#${name}`);
      target?.focus({ preventScroll: true });
    });
  }

  function paperLabel() {
    if (view.phase === "intro") return "一张还没有折过的方形信纸";
    if (view.phase === "turning") return "五道折痕已经完成的信纸正面";
    return `${view.text.progress}当前是${view.currentFold.label}：${view.currentFold.instruction}`;
  }

  function actionButton(label, action, className, id) {
    const button = textElement("button", label, className, { type: "button", "data-action": action });
    if (id) button.id = id;
    return button;
  }

  function visualLayer(tagName, className) {
    const node = element(tagName, className);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function textElement(tagName, value, className, attributes) {
    const node = element(tagName, className);
    node.textContent = value == null ? "" : String(value);
    if (attributes) {
      for (const [name, attributeValue] of Object.entries(attributes)) {
        node.setAttribute(name, attributeValue);
      }
    }
    return node;
  }

  function element(tagName, className) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    return node;
  }
})();
