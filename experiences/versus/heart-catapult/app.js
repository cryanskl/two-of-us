(function (root) {
  "use strict";

  const documentRef = root && root.document;
  if (!documentRef) return;

  const gameRoot = documentRef.getElementById("game-root");
  const liveRegion = documentRef.getElementById("public-live");
  const privacyCover = documentRef.getElementById("privacy-cover");
  const privacyResume = documentRef.getElementById("privacy-resume");
  const logic = root.HeartCatapultLogic;

  if (!gameRoot || !liveRegion || !privacyCover || !privacyResume || !logic) {
    if (gameRoot) showBootFailure("游戏逻辑没有载入。请确认文件完整后重新打开。");
    return;
  }

  const Q = logic.Q;
  const C = logic.CONSTANTS;
  const palette = Object.freeze({
    ink: "#202A44",
    paper: "#F6E3C5",
    berry: "#A43D5C",
    honey: "#D9A441",
    sage: "#698573",
  });
  const reducedMotionQuery = typeof root.matchMedia === "function"
    ? root.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const forcedColorsQuery = typeof root.matchMedia === "function"
    ? root.matchMedia("(forced-colors: active)")
    : null;

  let authorityState = logic.createInitialState(root.HEART_CATAPULT_CONFIG);
  let currentView = logic.getPublicView(authorityState);
  let aimingDraft = null;
  let privacyActive = false;
  let canvasUnavailable = false;
  let playback = null;
  let playbackGeneration = 0;
  let initialFocusPending = true;
  let coveredBackgroundState = null;
  const completedFlightTokens = new Set();

  if (!currentView) {
    showBootFailure("游戏初始状态无法建立。请确认文件完整后重新打开。");
    return;
  }

  privacyResume.addEventListener("click", resumeFromPrivacyCover);
  root.addEventListener("blur", activatePrivacyCover);
  root.addEventListener("pagehide", activatePrivacyCover);
  documentRef.addEventListener("visibilitychange", function () {
    if (documentRef.visibilityState === "hidden") activatePrivacyCover();
    else if (privacyActive) focusPrivacyHeading();
  });
  documentRef.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    activatePrivacyCover();
  });

  render();

  function showBootFailure(message) {
    gameRoot.replaceChildren();
    const section = makeElement("section", { className: "boot-failure" });
    const heading = makeElement("h2", {
      id: "phase-title",
      tabIndex: -1,
      text: "这个小游戏暂时不能开始",
    });
    section.append(heading, makeElement("p", { text: message }));
    gameRoot.append(section);
    focusHeading(heading);
  }

  function makeElement(tagName, options) {
    const element = documentRef.createElement(tagName);
    const values = options || {};
    if (values.className) element.className = values.className;
    if (values.id) element.id = values.id;
    if (values.text !== undefined) element.textContent = values.text;
    if (values.type) element.type = values.type;
    if (values.name) element.name = values.name;
    if (values.value !== undefined) element.value = String(values.value);
    if (values.tabIndex !== undefined) element.tabIndex = values.tabIndex;
    if (values.hidden) element.hidden = true;
    if (values.attributes) {
      const names = Object.keys(values.attributes);
      for (let index = 0; index < names.length; index += 1) {
        element.setAttribute(names[index], String(values.attributes[names[index]]));
      }
    }
    return element;
  }

  function makeButton(label, className, handler, attributes) {
    const button = makeElement("button", {
      className: className || "button",
      type: "button",
      text: label,
      attributes,
    });
    button.addEventListener("click", handler);
    return button;
  }

  function applyAction(action) {
    if (privacyActive) return;
    const nextState = logic.reduce(authorityState, action);
    authorityState = nextState;
    currentView = logic.getPublicView(authorityState);
    aimingDraft = null;
    cancelPlayback();
    if (!currentView) {
      showBootFailure("当前回合无法继续。请重新打开页面开始一局。");
      return;
    }
    render();
  }

  function expectedRevisionAction(type) {
    return { type, expectedRevision: currentView.revision };
  }

  function activatePrivacyCover() {
    if (privacyActive) return;
    privacyActive = true;
    aimingDraft = null;
    cancelPlayback();
    gameRoot.replaceChildren();
    gameRoot.hidden = true;
    gameRoot.setAttribute("aria-hidden", "true");
    liveRegion.textContent = "屏幕已遮住。";
    coverBackground();
    privacyCover.hidden = false;
    if (documentRef.visibilityState !== "hidden") focusPrivacyHeading();
  }

  function focusPrivacyHeading() {
    const heading = documentRef.getElementById("privacy-cover-title");
    if (!heading) return;
    try {
      heading.focus({ preventScroll: true });
    } catch (_error) {
      heading.focus();
    }
  }

  function resumeFromPrivacyCover() {
    if (!privacyActive || documentRef.visibilityState === "hidden") return;
    privacyActive = false;
    privacyCover.hidden = true;
    restoreBackground();
    gameRoot.hidden = false;
    gameRoot.removeAttribute("aria-hidden");
    currentView = logic.getPublicView(authorityState);
    aimingDraft = null;
    if (!currentView) {
      showBootFailure("当前回合无法恢复。请重新打开页面开始一局。");
      return;
    }
    render();
  }

  function coverBackground() {
    if (coveredBackgroundState) return;
    coveredBackgroundState = [];
    const children = documentRef.body ? Array.from(documentRef.body.children) : [];
    for (let index = 0; index < children.length; index += 1) {
      const element = children[index];
      if (element === privacyCover || element.tagName === "SCRIPT") continue;
      coveredBackgroundState.push({
        element,
        inert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      });
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }
  }

  function restoreBackground() {
    if (!coveredBackgroundState) return;
    for (let index = 0; index < coveredBackgroundState.length; index += 1) {
      const entry = coveredBackgroundState[index];
      if (!entry.inert) entry.element.removeAttribute("inert");
      if (entry.ariaHidden === null) entry.element.removeAttribute("aria-hidden");
      else entry.element.setAttribute("aria-hidden", entry.ariaHidden);
    }
    coveredBackgroundState = null;
  }

  function cancelPlayback() {
    playbackGeneration += 1;
    const activePlayback = playback;
    playback = null;
    if (activePlayback) cancelFrame(activePlayback);
  }

  function cancelFrame(activePlayback) {
    if (!activePlayback || activePlayback.rafId === null
      || typeof root.cancelAnimationFrame !== "function") return;
    const frameId = activePlayback.rafId;
    activePlayback.rafId = null;
    try {
      root.cancelAnimationFrame(frameId);
    } catch (_error) {
      // Playback identity has already been invalidated, so privacy cleanup can continue.
    }
  }

  function scheduleFrame(activePlayback, callback) {
    if (typeof root.requestAnimationFrame !== "function") return false;
    try {
      activePlayback.rafId = root.requestAnimationFrame(callback);
      return true;
    } catch (_error) {
      activePlayback.rafId = null;
      return false;
    }
  }

  function visibleSubstate(view) {
    if (view.phase === "handoff") {
      return view.lockedCount === 0 ? "handoff-first" : "handoff-second";
    }
    if (view.phase === "aiming") {
      return view.lockedCount === 0 ? "aiming-first" : "aiming-second";
    }
    if (view.phase === "flying" && view.currentFlight) {
      return view.currentFlight.seat === view.firstSeat ? "flying-first" : "flying-second";
    }
    return view.phase;
  }

  function render() {
    if (privacyActive) return;
    cancelPlayback();
    gameRoot.replaceChildren();
    gameRoot.dataset.visibleState = visibleSubstate(currentView);

    const scoreBoard = renderScoreBoard(currentView);
    const phaseSection = makeElement("section", {
      className: `phase phase--${currentView.phase}`,
      attributes: {
        "aria-labelledby": "phase-title",
      },
    });
    phaseSection.dataset.phase = currentView.phase;
    phaseSection.dataset.visibleState = visibleSubstate(currentView);

    const phaseHeader = makeElement("header", { className: "phase__header" });
    phaseHeader.append(
      makeElement("p", { className: "phase__eyebrow", text: currentView.copy.eyebrow }),
      makeElement("h2", {
        id: "phase-title",
        className: "phase__title",
        tabIndex: -1,
        text: currentView.copy.title,
      }),
      makeElement("p", { className: "phase__status", text: currentView.copy.status }),
      makeElement("p", {
        className: "phase__instruction",
        text: currentView.copy.instruction,
      }),
    );
    phaseSection.append(phaseHeader);

    if (currentView.phase === "intro") renderIntro(phaseSection);
    else if (currentView.phase === "handoff") renderHandoff(phaseSection);
    else if (currentView.phase === "aiming") renderAiming(phaseSection);
    else if (currentView.phase === "reveal-ready") renderRevealReady(phaseSection);
    else if (currentView.phase === "flying") renderFlying(phaseSection);
    else if (currentView.phase === "round-result") renderRoundResult(phaseSection);
    else renderComplete(phaseSection);

    gameRoot.append(scoreBoard, phaseSection);
    if (currentView.phase === "complete") {
      const history = renderHistory(currentView);
      if (history) gameRoot.append(history);
    }
    liveRegion.textContent = currentView.copy.live;
    if (initialFocusPending) {
      initialFocusPending = false;
      focusHeading(documentRef.getElementById("product-title"));
    } else {
      focusHeading(phaseHeader.querySelector("h2"));
    }
  }

  function focusHeading(heading) {
    if (!heading) return;
    try {
      heading.focus({ preventScroll: true });
    } catch (_error) {
      heading.focus();
    }
  }

  function renderScoreBoard(view) {
    const section = makeElement("section", {
      className: "scoreboard",
      attributes: {
        "aria-label": `第 ${view.round} 轮，当前比分`,
      },
    });
    const players = makeElement("div", { className: "scoreboard__players" });
    for (let index = 0; index < view.players.length; index += 1) {
      const player = view.players[index];
      const article = makeElement("article", {
        className: `player-score player-score--seat-${player.seat}`,
        attributes: {
          "aria-label": `${player.name}，送达 ${player.score} 次，目标 ${view.targetScore} 次`,
        },
      });
      if (player.seat === view.activeSeat) article.dataset.current = "true";
      article.append(
        makeElement("p", { className: "player-score__name", text: player.name }),
        makeElement("p", {
          className: "player-score__value",
          text: `${player.score} / ${view.targetScore}`,
        }),
      );
      players.append(article);
    }
    section.append(
      makeElement("p", {
        className: "scoreboard__round",
        text: `第 ${view.round} / ${view.maxRounds} 轮`,
      }),
      players,
      makeElement("p", {
        className: "scoreboard__target",
        text: `达到 ${view.targetScore} 次并领先才获胜`,
      }),
    );
    return section;
  }

  function renderIntro(section) {
    section.append(createStage("idle"));
    const rules = makeElement("ol", {
      className: "quick-rules",
      attributes: { "aria-label": "三步规则" },
    });
    for (const text of [
      "轮流秘密选择角度和力度。",
      "每颗心可以在软垫上反弹一次。",
      "两发都结束后，达到三次并领先的人获胜。",
    ]) {
      rules.append(makeElement("li", { text }));
    }
    section.append(
      rules,
      makeButton("开始这一局", "button button--primary", function () {
        applyAction(expectedRevisionAction("START"));
      }),
    );
  }

  function renderHandoff(section) {
    const stage = createStage("curtained");
    stage.append(makeElement("p", {
      className: "paper-curtain__message",
      text: "上一位的角度和力度已经完全收起。",
    }));
    section.append(
      stage,
      makeButton("我接好了", "button button--primary", function () {
        applyAction({
          type: "TAKE_OVER",
          seat: currentView.activeSeat,
          expectedRevision: currentView.revision,
        });
      }),
    );
  }

  function ensureAimingDraft() {
    if (aimingDraft && aimingDraft.revision === currentView.revision
      && aimingDraft.seat === currentView.activeSeat) return aimingDraft;
    aimingDraft = {
      revision: currentView.revision,
      seat: currentView.activeSeat,
      angleIndex: C.DEFAULT_ANGLE_INDEX,
      powerIndex: C.DEFAULT_POWER_INDEX,
    };
    return aimingDraft;
  }

  function renderAiming(section) {
    const draft = ensureAimingDraft();
    section.append(createStage("aiming"));

    const controls = makeElement("div", {
      className: "aim-controls",
      attributes: {
        "aria-label": `${currentView.players[draft.seat].name}的秘密瞄准`,
      },
    });
    const angleControl = createAimControl({
      id: "angle-control",
      label: "角度",
      minimum: 0,
      maximum: logic.ANGLE_DEGREES.length - 1,
      value: draft.angleIndex,
      valueText: function (index) {
        return `${logic.ANGLE_DEGREES[index]}°`;
      },
      onChange: function (index) {
        if (!aimingDraft) return;
        aimingDraft.angleIndex = index;
      },
    });
    const powerControl = createAimControl({
      id: "power-control",
      label: "力度",
      minimum: 0,
      maximum: logic.POWER2_VALUES.length - 1,
      value: draft.powerIndex,
      valueText: function (index) {
        return formatPower(logic.POWER2_VALUES[index]);
      },
      onChange: function (index) {
        if (!aimingDraft) return;
        aimingDraft.powerIndex = index;
      },
    });
    controls.append(angleControl.group, powerControl.group);

    const direction = makeElement("div", {
      className: "aim-direction",
      attributes: {
        "aria-hidden": "true",
      },
    });
    const directionLine = makeElement("span", { className: "aim-direction__line" });
    direction.append(directionLine);

    function updateDirection() {
      if (!aimingDraft) return;
      const degrees = logic.ANGLE_DEGREES[aimingDraft.angleIndex];
      directionLine.style.transform = `rotate(${-degrees}deg)`;
    }
    angleControl.onVisualChange = updateDirection;
    updateDirection();

    const lockButton = makeButton(
      "就按这个角度送出去",
      "button button--primary",
      function () {
        if (!aimingDraft) return;
        const locked = {
          angleIndex: aimingDraft.angleIndex,
          powerIndex: aimingDraft.powerIndex,
          seat: aimingDraft.seat,
          revision: aimingDraft.revision,
        };
        aimingDraft = null;
        applyAction({
          type: "LOCK_AIM",
          seat: locked.seat,
          angleIndex: locked.angleIndex,
          powerIndex: locked.powerIndex,
          expectedRevision: locked.revision,
        });
      },
    );
    section.append(controls, direction, lockButton);
  }

  function createAimControl(options) {
    const fieldset = makeElement("fieldset", { className: "aim-control" });
    const legend = makeElement("legend", {
      className: "aim-control__label",
      text: options.label,
    });
    const row = makeElement("div", { className: "aim-control__row" });
    const valueOutput = makeElement("output", {
      className: "aim-control__value",
      id: `${options.id}-value`,
      text: options.valueText(options.value),
    });
    const input = makeElement("input", {
      className: "aim-control__range",
      id: options.id,
      type: "range",
      value: options.value,
      attributes: {
        min: options.minimum,
        max: options.maximum,
        step: 1,
        "aria-label": options.label,
        "aria-describedby": `${options.id}-value`,
        "aria-valuetext": options.valueText(options.value),
      },
    });
    const decrease = makeButton(
      `${options.label}减一档`,
      "step-button",
      function () {
        changeTo(Number(input.value) - 1);
        input.focus();
      },
      { "aria-label": `${options.label}减一档` },
    );
    const increase = makeButton(
      `${options.label}加一档`,
      "step-button",
      function () {
        changeTo(Number(input.value) + 1);
        input.focus();
      },
      { "aria-label": `${options.label}加一档` },
    );

    function changeTo(rawIndex) {
      const index = Math.max(options.minimum, Math.min(options.maximum, rawIndex));
      input.value = String(index);
      const text = options.valueText(index);
      input.setAttribute("aria-valuetext", text);
      valueOutput.value = text;
      valueOutput.textContent = text;
      options.onChange(index);
      if (control.onVisualChange) control.onVisualChange();
    }

    input.addEventListener("input", function () {
      changeTo(Number(input.value));
    });
    row.append(input, decrease, increase, valueOutput);
    fieldset.append(legend, row);
    const control = {
      group: fieldset,
      input,
      onVisualChange: null,
    };
    return control;
  }

  function formatPower(power2) {
    return power2 % 2 === 0 ? String(power2 / 2) : `${Math.floor(power2 / 2)}.5`;
  }

  function renderRevealReady(section) {
    const stage = createStage("curtained");
    const locks = makeElement("div", {
      className: "sealed-count",
      attributes: { "aria-label": "两位玩家都已锁定" },
    });
    locks.append(
      makeElement("p", {
        text: `${currentView.players[0].name} · 已锁定`,
      }),
      makeElement("p", {
        text: `${currentView.players[1].name} · 已锁定`,
      }),
    );
    stage.append(locks);
    section.append(
      stage,
      makeButton("让两颗心飞起来", "button button--primary", function () {
        applyAction(expectedRevisionAction("BEGIN_REVEAL"));
      }),
    );
  }

  function renderFlying(section) {
    const flight = currentView.currentFlight;
    if (!flight) {
      section.append(makeElement("p", { text: "当前飞行信息不可用。" }));
      return;
    }
    const isFirst = flight.seat === currentView.firstSeat;
    const flightNumber = isFirst ? 1 : 2;
    const publicPanel = makeElement("section", {
      className: "flight-panel",
      attributes: {
        "aria-label": `第 ${flightNumber} 颗爱心`,
      },
    });
    publicPanel.append(
      makeElement("p", {
        className: "flight-panel__counter",
        text: `第 ${flightNumber} 颗 / 共 2 颗`,
      }),
      makeElement("p", {
        className: "flight-panel__owner",
        text: `${currentView.players[flight.seat].name}的爱心`,
      }),
      makeElement("p", {
        className: "flight-panel__parameters",
        text: `角度 ${flight.aim.angleDegrees}° · 力度 ${formatPower(flight.aim.power2)}`,
      }),
    );

    if (!isFirst && currentView.revealedShots.length === 1) {
      const previous = currentView.revealedShots[0];
      publicPanel.append(renderShotSummary(previous, "上一颗"));
    }

    const stage = createStage("flying");
    const resultRegion = makeElement("div", {
      className: "flight-result",
      attributes: {
        "aria-live": "polite",
        "aria-atomic": "true",
      },
    });
    const actionButton = makeButton("跳过动画", "button button--primary", function () {
      if (!playback || playback.token !== flight.token) return;
      if (!playback.settled) {
        settlePlayback(playback);
        return;
      }
      completeFlightOnce(flight.token);
    });
    actionButton.dataset.flightAction = "skip";

    section.append(publicPanel, stage, resultRegion, actionButton);
    startPlayback({
      flight,
      stage,
      resultRegion,
      actionButton,
      continueLabel: isFirst ? "播放下一颗" : "查看本轮结果",
    });
  }

  function startPlayback(options) {
    const canvas = options.stage.querySelector("canvas");
    const context = canvas ? getCanvasContext(canvas) : null;
    const generation = playbackGeneration;
    playback = {
      token: options.flight.token,
      generation,
      rafId: null,
      settled: false,
      canvas,
      context,
      flight: options.flight,
      resultRegion: options.resultRegion,
      actionButton: options.actionButton,
      continueLabel: options.continueLabel,
      stage: options.stage,
    };

    if (!context) {
      canvasUnavailable = true;
      showCanvasFailure(options.stage);
      settlePlayback(playback);
      return;
    }
    if (!drawPlaybackFrame(playback, 0)) {
      settlePlayback(playback);
      return;
    }
    const reduceMotion = reducedMotionQuery && reducedMotionQuery.matches;
    if (reduceMotion || typeof root.requestAnimationFrame !== "function") {
      settlePlayback(playback);
      return;
    }

    const duration = Math.max(
      900,
      Math.min(2200, options.flight.result.terminalTick * 12),
    );
    let startedAt = null;
    const activePlayback = playback;

    function step(timestamp) {
      if (!playback || playback !== activePlayback || activePlayback.settled || privacyActive
        || activePlayback.generation !== playbackGeneration) return;
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.max(0, Math.min(1, (timestamp - startedAt) / duration));
      const frameIndex = Math.min(
        options.flight.frames.length - 1,
        Math.floor(progress * (options.flight.frames.length - 1)),
      );
      if (!drawPlaybackFrame(activePlayback, frameIndex)) {
        settlePlayback(activePlayback);
        return;
      }
      if (progress >= 1) {
        settlePlayback(activePlayback);
        return;
      }
      if (!scheduleFrame(activePlayback, step)) settlePlayback(activePlayback);
    }
    if (!scheduleFrame(activePlayback, step)) settlePlayback(activePlayback);
  }

  function settlePlayback(activePlayback) {
    if (!activePlayback || activePlayback.settled || playback !== activePlayback) return;
    activePlayback.settled = true;
    cancelFrame(activePlayback);
    if (activePlayback.context) {
      drawPlaybackFrame(activePlayback, activePlayback.flight.frames.length - 1);
    }
    activePlayback.resultRegion.replaceChildren(
      renderFlightResult(activePlayback.flight.result),
    );
    activePlayback.actionButton.textContent = activePlayback.continueLabel;
    activePlayback.actionButton.dataset.flightAction = "continue";
  }

  function drawPlaybackFrame(activePlayback, frameIndex) {
    if (!activePlayback || !activePlayback.context) return false;
    try {
      drawFlightFrame(activePlayback.context, activePlayback.flight.frames, frameIndex);
      return true;
    } catch (_error) {
      activePlayback.context = null;
      canvasUnavailable = true;
      showCanvasFailure(activePlayback.stage);
      return false;
    }
  }

  function completeFlightOnce(token) {
    if (privacyActive || completedFlightTokens.has(token) || !currentView.currentFlight
      || currentView.currentFlight.token !== token) return;
    completedFlightTokens.add(token);
    const action = {
      type: "COMPLETE_FLIGHT",
      shotToken: token,
      expectedRevision: currentView.revision,
    };
    if (playback && playback.actionButton) playback.actionButton.disabled = true;
    applyAction(action);
  }

  function renderFlightResult(result) {
    const copy = flightResultCopy(result);
    const article = makeElement("article", {
      className: `result result--${result.outcome}`,
    });
    article.append(
      makeElement("p", { className: "result__title", text: copy.title }),
      makeElement("p", { className: "result__detail", text: copy.detail }),
    );
    return article;
  }

  function flightResultCopy(result) {
    if (result.outcome === "direct-hit") {
      return {
        title: "这一颗，直接送到了。",
        detail: "爱心落进了对面的窗台。",
      };
    }
    if (result.outcome === "bounce-hit") {
      return {
        title: "绕了一下，还是找到你了。",
        detail: "它在软垫上反弹了一次。",
      };
    }
    if (result.terminalReason === "second-ground") {
      return {
        title: "这一颗停在软垫上。",
        detail: "下一轮可以换一个角度或力度。",
      };
    }
    if (result.terminalReason === "horizontal-exit") {
      return {
        title: "这一颗飞出了贺卡。",
        detail: "记住这条线，下一轮再试。",
      };
    }
    return {
      title: "这一颗没有送到。",
      detail: "结果已经按固定规则记下。",
    };
  }

  function renderRoundResult(section) {
    section.append(createStage("idle"));
    const result = currentView.roundResult;
    if (result) section.append(renderPublicRound(result, true));
    const tiedAtTarget = currentView.players[0].score === currentView.players[1].score
      && currentView.players[0].score >= currentView.targetScore;
    if (tiedAtTarget) {
      section.append(makeElement("p", {
        className: "overtime-copy",
        text: `现在是 ${currentView.players[0].score} 比 `
          + `${currentView.players[1].score}。还是平局，那就再送一轮。`,
      }));
    }
    section.append(makeButton("交换先手，下一轮", "button button--primary", function () {
      applyAction(expectedRevisionAction("NEXT_ROUND"));
    }));
  }

  function renderComplete(section) {
    const stage = createStage(currentView.finalResult.winner === null ? "draw" : "winner");
    if (currentView.finalResult.winner !== null) {
      stage.dataset.winner = String(currentView.finalResult.winner);
      stage.append(makeElement("p", {
        className: "complete-mark",
        text: `${currentView.players[currentView.finalResult.winner].name} · 先达到目标并领先`,
      }));
    } else {
      stage.append(makeElement("p", {
        className: "complete-mark",
        text: "完整十二轮 · 本局平分",
      }));
    }
    section.append(
      stage,
      makeElement("p", {
        className: "final-score",
        text: `最终比分 ${currentView.finalResult.scores[0]} : `
          + `${currentView.finalResult.scores[1]}`,
      }),
    );
    if (currentView.controls.canRestart) {
      section.append(makeButton(
        "交换先手，再来一局",
        "button button--primary",
        function () {
          applyAction(expectedRevisionAction("RESTART"));
        },
      ));
    } else {
      section.append(makeElement("p", {
        className: "restart-unavailable",
        text: "这一页已经完成可安全记录的全部回合。",
      }));
    }
  }

  function renderHistory(view) {
    if (view.history.length === 0) return null;
    const details = makeElement("details", { className: "round-history" });
    details.append(makeElement("summary", {
      text: `已完成 ${view.history.length} 轮`,
    }));
    const list = makeElement("ol", { className: "round-history__list" });
    for (let index = 0; index < view.history.length; index += 1) {
      const item = makeElement("li");
      item.append(renderPublicRound(view.history[index], false));
      list.append(item);
    }
    details.append(list);
    return details;
  }

  function renderPublicRound(round, prominent) {
    const section = makeElement("section", {
      className: prominent ? "round-summary round-summary--current" : "round-summary",
      attributes: {
        "aria-label": `第 ${round.round} 轮结果`,
      },
    });
    section.append(makeElement("p", {
      className: "round-summary__title",
      text: `第 ${round.round} 轮 · 完整轮联合结算`,
    }));
    const shots = makeElement("div", { className: "round-summary__shots" });
    for (let seat = 0; seat < round.shots.length; seat += 1) {
      const shot = round.shots[seat];
      const article = renderShotSummary(shot, currentView.players[seat].name);
      article.append(
        makeElement("p", {
          className: "shot-summary__hit",
          text: `本轮 +${round.roundHits[seat]}`,
        }),
        makeElement("p", {
          className: "shot-summary__score",
          text: `累计 ${round.scoresAfter[seat]}`,
        }),
      );
      shots.append(article);
    }
    section.append(shots);
    return section;
  }

  function renderShotSummary(shot, label) {
    const article = makeElement("article", {
      className: `shot-summary shot-summary--${shot.outcome}`,
    });
    article.append(
      makeElement("p", { className: "shot-summary__player", text: label }),
      makeElement("p", {
        className: "shot-summary__aim",
        text: `${shot.aim.angleDegrees}° · ${formatPower(shot.aim.power2)}`,
      }),
      makeElement("p", {
        className: "shot-summary__outcome",
        text: outcomeLabel(shot.outcome),
      }),
    );
    return article;
  }

  function outcomeLabel(outcome) {
    if (outcome === "direct-hit") return "直接送达";
    if (outcome === "bounce-hit") return "反弹送达";
    return "未送达";
  }

  function createStage(mode) {
    const figure = makeElement("figure", {
      className: `paper-stage paper-stage--${mode}`,
    });
    const canvas = makeElement("canvas", {
      className: "paper-stage__canvas",
      attributes: {
        "aria-hidden": "true",
      },
    });
    const logicalWidth = C.WORLD_WIDTH_Q / Q;
    const logicalHeight = C.WORLD_HEIGHT_Q / Q;
    const rawPixelRatio = Number.isFinite(root.devicePixelRatio) ? root.devicePixelRatio : 1;
    const pixelRatio = Math.max(1, Math.min(3, rawPixelRatio));
    canvas.width = Math.round(logicalWidth * pixelRatio);
    canvas.height = Math.round(logicalHeight * pixelRatio);
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
    canvas.append(documentRef.createTextNode(
      "画面不可用时仍可阅读规则和结果；飞行轨迹需要 Canvas 才能观看。",
    ));
    figure.append(canvas);

    if (canvasUnavailable) {
      showCanvasFailure(figure);
      return figure;
    }
    const context = getCanvasContext(canvas);
    if (!context) {
      canvasUnavailable = true;
      showCanvasFailure(figure);
      return figure;
    }
    try {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    } catch (_error) {
      canvasUnavailable = true;
      showCanvasFailure(figure);
      return figure;
    }
    try {
      drawStage(context, null, -1);
    } catch (_error) {
      canvasUnavailable = true;
      showCanvasFailure(figure);
    }
    return figure;
  }

  function getCanvasContext(canvas) {
    if (!canvas || canvasUnavailable) return null;
    try {
      return canvas.getContext("2d");
    } catch (_error) {
      return null;
    }
  }

  function showCanvasFailure(stage) {
    if (stage.querySelector(".canvas-failure")) return;
    stage.append(makeElement("p", {
      className: "canvas-failure",
      text: "当前浏览器无法显示飞行画面；角度、结果和比分仍会用文字呈现。",
      attributes: {
        role: "status",
      },
    }));
  }

  function drawingColors() {
    if (forcedColorsQuery && forcedColorsQuery.matches) {
      return {
        ink: "CanvasText",
        paper: "Canvas",
        berry: "Highlight",
        honey: "CanvasText",
        sage: "GrayText",
      };
    }
    return palette;
  }

  function drawStage(context, frames, frameIndex) {
    const colors = drawingColors();
    const width = C.WORLD_WIDTH_Q / Q;
    const height = C.WORLD_HEIGHT_Q / Q;
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.ink;
    context.fillRect(0, 0, width, height);

    context.fillStyle = colors.paper;
    context.beginPath();
    context.moveTo(24, 76);
    context.lineTo(width / 2, 58);
    context.lineTo(width - 24, 76);
    context.lineTo(width - 24, height);
    context.lineTo(24, height);
    context.closePath();
    context.fill();

    context.strokeStyle = colors.sage;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(width / 2, 58);
    context.lineTo(width / 2, height);
    context.stroke();

    drawCastle(context, 0, colors);
    drawCastle(context, 1, colors);
    drawLauncher(context, 0, colors);
    drawLauncher(context, 1, colors);
    drawGround(context, colors);

    if (frames && frameIndex >= 0) {
      const finalIndex = Math.min(frameIndex, frames.length - 1);
      context.fillStyle = colors.berry;
      for (let index = 0; index <= finalIndex; index += 4) {
        const frame = frames[index];
        context.beginPath();
        context.arc(frame.xQ / Q, frame.yQ / Q, 2, 0, Math.PI * 2);
        context.fill();
      }
      const current = frames[finalIndex];
      drawHeart(
        context,
        current.xQ / Q,
        current.yQ / Q,
        C.PROJECTILE_RADIUS_Q / Q,
        colors.berry,
      );
      if (current.event === "bounce") drawBounceMark(context, current.xQ / Q, colors);
      if (current.event === "hit") drawHitMark(context, current.xQ / Q, colors);
    }
  }

  function drawCastle(context, seat, colors) {
    const worldWidthQ = C.WORLD_WIDTH_Q;
    const leftQ = seat === 0
      ? worldWidthQ - C.TARGET_ENTITY_RIGHT_Q
      : C.TARGET_ENTITY_LEFT_Q;
    const rightQ = seat === 0
      ? worldWidthQ - C.TARGET_ENTITY_LEFT_Q
      : C.TARGET_ENTITY_RIGHT_Q;
    const left = leftQ / Q;
    const right = rightQ / Q;
    const top = C.TARGET_ENTITY_TOP_Q / Q;
    const bottom = C.TARGET_ENTITY_BOTTOM_Q / Q;
    const width = right - left;

    context.fillStyle = colors.sage;
    context.strokeStyle = colors.ink;
    context.lineWidth = 3;
    context.beginPath();
    context.rect(left, top + 22, width, bottom - top - 22);
    context.fill();
    context.stroke();

    context.fillStyle = colors.paper;
    context.beginPath();
    context.moveTo(left, top + 22);
    context.lineTo(left + width * 0.25, top);
    context.lineTo(left + width * 0.5, top + 22);
    context.lineTo(left + width * 0.75, top);
    context.lineTo(right, top + 22);
    context.closePath();
    context.fill();
    context.stroke();

    drawHeart(context, left + width / 2, top + 58, 10, colors.paper);
  }

  function drawGround(context, colors) {
    const width = C.WORLD_WIDTH_Q / Q;
    const height = C.WORLD_HEIGHT_Q / Q;
    const groundY = C.GROUND_SOLID_Y_Q / Q;
    context.fillStyle = colors.sage;
    context.fillRect(0, groundY, width, height - groundY);
    context.strokeStyle = colors.ink;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, groundY);
    context.lineTo(width, groundY);
    context.stroke();
    context.lineWidth = 1;
    for (let x = 12; x < width; x += 24) {
      context.beginPath();
      context.moveTo(x, groundY + 8);
      context.lineTo(x + 10, groundY + 8);
      context.stroke();
    }
  }

  function drawLauncher(context, seat, colors) {
    const worldWidth = C.WORLD_WIDTH_Q / Q;
    const localX = C.LOCAL_LAUNCH_X_Q / Q;
    const x = seat === 0 ? localX : worldWidth - localX;
    const y = C.LOCAL_LAUNCH_Y_Q / Q;
    const direction = seat === 0 ? 1 : -1;
    context.fillStyle = colors.honey;
    context.strokeStyle = colors.ink;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x - direction * 18, y + 22);
    context.lineTo(x + direction * 14, y + 22);
    context.lineTo(x + direction * 4, y + 8);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(x - direction * 2, y + 12);
    context.lineTo(x + direction * 12, y - 8);
    context.stroke();
  }

  function drawHeart(context, centerX, centerY, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(centerX, centerY + radius);
    context.bezierCurveTo(
      centerX - radius * 1.5,
      centerY,
      centerX - radius,
      centerY - radius,
      centerX,
      centerY - radius * 0.25,
    );
    context.bezierCurveTo(
      centerX + radius,
      centerY - radius,
      centerX + radius * 1.5,
      centerY,
      centerX,
      centerY + radius,
    );
    context.fill();
  }

  function drawBounceMark(context, x, colors) {
    const groundY = C.GROUND_SOLID_Y_Q / Q;
    context.strokeStyle = colors.honey;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x - 18, groundY + 2);
    context.quadraticCurveTo(x, groundY + 8, x + 18, groundY + 2);
    context.stroke();
  }

  function drawHitMark(context, x, colors) {
    context.strokeStyle = colors.honey;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(x, C.TARGET_ENTITY_TOP_Q / Q + 58, 18, 0, Math.PI * 2);
    context.stroke();
  }

  function drawFlightFrame(context, frames, frameIndex) {
    drawStage(context, frames, frameIndex);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
