(function () {
  "use strict";

  var logic = globalThis.KaleidoscopeNamesLogic;
  var rawConfig = globalThis.KALEIDOSCOPE_NAMES_CONFIG;
  var app = document.querySelector("#app");

  if (!logic || !app) {
    return;
  }

  var reducedMotion = globalThis.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  var state = logic.createInitialState(rawConfig);
  var activePhase = null;
  var activeElements = null;
  var activePattern = null;
  var renderGeneration = 0;
  var animationFrame = 0;
  var lastAnnouncedSummary = "";

  render(logic.getPublicView(state), {
    focus: false,
    announce: false
  });

  globalThis.addEventListener("resize", function handleResize() {
    redrawCurrentPattern();
  });

  document.addEventListener("visibilitychange", function handleVisibility() {
    if (document.hidden) {
      cancelPatternFrame();
      return;
    }
    redrawCurrentPattern();
  });

  globalThis.addEventListener("pagehide", function handlePageHide() {
    cancelPatternFrame();
  });

  globalThis.addEventListener("pageshow", function handlePageShow() {
    redrawCurrentPattern();
  });

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", function handleMotionChange() {
      cancelPatternFrame();
      redrawCurrentPattern();
    });
  }

  function dispatch(action, options) {
    var previousView = logic.getPublicView(state);
    var nextState = logic.reduce(state, action);

    if (nextState === state) {
      return false;
    }

    state = nextState;
    var nextView = logic.getPublicView(state);
    var phaseChanged = previousView.phase !== nextView.phase;

    render(nextView, {
      focus: phaseChanged && options.focus !== false,
      announce: options.announce === true
    });
    return true;
  }

  function render(view, options) {
    if (!view) {
      return;
    }

    if (view.phase !== activePhase) {
      activePhase = view.phase;
      cancelPatternFrame();

      if (view.phase === "intro") {
        activeElements = createIntroPhase(view);
      } else if (view.phase === "tuning") {
        activeElements = createTuningPhase(view);
      } else if (view.phase === "aligned") {
        activeElements = createAlignedPhase(view);
      } else if (view.phase === "complete") {
        activeElements = createCompletePhase(view);
      }

      app.replaceChildren(activeElements.section);
    }

    app.dataset.phase = view.phase;

    if (view.phase === "tuning") {
      updateTuningPhase(view, options.announce);
    }

    if (activeElements.patternFigure && view.pattern) {
      activeElements.patternFigure.caption.textContent =
        view.summary || view.publicTitle || view.title;
      schedulePattern(view.pattern, activeElements.patternFigure);
    } else {
      activePattern = null;
    }

    if (options.focus) {
      moveFocusForPhase(view.phase, activeElements);
    }
  }

  function createIntroPhase(view) {
    var section = createPhaseSection("intro");
    var heading = createHeading(view.title, "intro-title");
    var instructions = document.createElement("p");
    var actionButton = createPrimaryAction(view.primaryAction);

    instructions.className = "intro-instructions";
    instructions.textContent = view.instructions;
    actionButton.addEventListener("click", function handleStart() {
      dispatch(
        {
          type: logic.ACTIONS.START,
          revision: view.revision
        },
        { focus: true, announce: false }
      );
    });

    section.setAttribute("aria-labelledby", heading.id);
    section.append(heading, instructions, actionButton);

    return {
      section: section,
      heading: heading,
      actionButton: actionButton,
      patternFigure: null
    };
  }

  function createTuningPhase(view) {
    var section = createPhaseSection("tuning");
    var heading = createHeading(view.title, "tuning-title");
    var workspace = document.createElement("div");
    var controls = document.createElement("div");
    var foldGroup = document.createElement("fieldset");
    var foldLegend = document.createElement("legend");
    var foldHint = document.createElement("p");
    var foldButtons = document.createElement("div");
    var phaseGroup = document.createElement("section");
    var phaseHeading = document.createElement("h2");
    var phaseHint = document.createElement("p");
    var rangeRow = document.createElement("div");
    var rangeLabel = document.createElement("label");
    var range = document.createElement("input");
    var output = document.createElement("output");
    var statusList = document.createElement("ul");
    var foldStatus = createStatusItem(view.foldControl.label);
    var phaseStatus = createStatusItem(view.phaseControl.label);
    var liveRegion = document.createElement("div");
    var patternFigure = createPatternFigure(view.summary);

    workspace.className = "tuning-workspace";
    controls.className = "calibration-controls";
    foldGroup.className = "control-group fold-control";
    foldLegend.textContent = view.foldControl.label;
    foldHint.className = "control-hint";
    foldHint.textContent = view.foldControl.hint;
    foldButtons.className = "fold-buttons";

    view.foldControl.values.forEach(function createFoldButton(value) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "fold-button";
      button.textContent = value + " 面";
      button.setAttribute(
        "aria-pressed",
        String(value === view.foldControl.selected)
      );
      button.addEventListener("click", function handleFoldSelection() {
        dispatch(
          {
            type: logic.ACTIONS.SET_FOLDS,
            value: value,
            revision: logic.getPublicView(state).revision
          },
          { focus: true, announce: true }
        );
      });
      foldButtons.append(button);
    });

    foldGroup.append(foldLegend, foldHint, foldButtons);

    phaseGroup.className = "control-group phase-control";
    phaseGroup.setAttribute("aria-labelledby", "phase-control-title");
    phaseHeading.id = "phase-control-title";
    phaseHeading.textContent = view.phaseControl.label;
    phaseHint.className = "control-hint";
    phaseHint.textContent = view.phaseControl.hint;
    rangeRow.className = "range-row";
    rangeLabel.className = "sr-only";
    rangeLabel.htmlFor = "phase-range";
    rangeLabel.textContent = view.phaseControl.label;
    range.id = "phase-range";
    range.type = "range";
    range.min = String(view.phaseControl.min);
    range.max = String(view.phaseControl.max);
    range.step = String(view.phaseControl.step);
    range.value = String(view.phaseControl.selected);
    output.className = "phase-output";
    output.htmlFor = "phase-range";
    output.textContent = view.phaseControl.displayText;

    range.addEventListener("input", function handlePhaseInput() {
      dispatch(
        {
          type: logic.ACTIONS.SET_PHASE,
          value: range.valueAsNumber,
          revision: logic.getPublicView(state).revision
        },
        { focus: true, announce: false }
      );
    });

    range.addEventListener("change", function announcePhaseChange() {
      var currentView = logic.getPublicView(state);
      if (currentView && currentView.phase === "tuning") {
        announce(currentView.summary);
      }
    });

    rangeRow.append(rangeLabel, range, output);
    phaseGroup.append(phaseHeading, phaseHint, rangeRow);

    statusList.className = "status-list";
    statusList.setAttribute("aria-label", "当前校准状态");
    statusList.append(foldStatus.item, phaseStatus.item);

    liveRegion.className = "live-region sr-only";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");

    controls.append(foldGroup, phaseGroup, statusList, liveRegion);
    workspace.append(controls, patternFigure.figure);
    section.setAttribute("aria-labelledby", heading.id);
    section.append(heading, workspace);

    return {
      section: section,
      heading: heading,
      actionButton: null,
      foldButtons: Array.from(foldButtons.children),
      range: range,
      output: output,
      foldStatus: foldStatus,
      phaseStatus: phaseStatus,
      liveRegion: liveRegion,
      patternFigure: patternFigure
    };
  }

  function createAlignedPhase(view) {
    var section = createPhaseSection("aligned");
    var heading = createHeading(view.title, "aligned-title");
    var summary = document.createElement("p");
    var patternFigure = createPatternFigure(view.summary);
    var actionButton = createPrimaryAction(view.primaryAction);

    summary.className = "aligned-summary";
    summary.setAttribute("role", "status");
    summary.textContent = view.summary;
    actionButton.addEventListener("click", function handleReveal() {
      dispatch(
        {
          type: logic.ACTIONS.REVEAL,
          revision: view.revision
        },
        { focus: true, announce: false }
      );
    });

    section.setAttribute("aria-labelledby", heading.id);
    section.append(
      heading,
      summary,
      patternFigure.figure,
      actionButton
    );

    return {
      section: section,
      heading: heading,
      actionButton: actionButton,
      patternFigure: patternFigure
    };
  }

  function createCompletePhase(view) {
    var section = createPhaseSection("complete");
    var publicTitle = document.createElement("p");
    var patternFigure = createPatternFigure(view.publicTitle);
    var heading = createHeading(view.finalTitle, "complete-title");
    var marks = document.createElement("dl");
    var finalMessage = document.createElement("p");
    var signature = document.createElement("p");
    var actionButton = createPrimaryAction(view.primaryAction);

    publicTitle.className = "public-title";
    publicTitle.textContent = view.publicTitle;
    marks.className = "mark-list";
    marks.setAttribute("aria-label", view.finalTitle);

    view.marks.forEach(function createMark(mark) {
      var item = document.createElement("div");
      var label = document.createElement("dt");
      var text = document.createElement("dd");

      item.className = "mark-well mark-" + mark.position;
      label.textContent = mark.label;
      text.textContent = mark.text;
      item.append(label, text);
      marks.append(item);
    });

    finalMessage.className = "final-message";
    finalMessage.textContent = view.finalMessage;
    signature.className = "signature";
    signature.textContent = view.signature;
    actionButton.addEventListener("click", function handleRestart() {
      dispatch(
        {
          type: logic.ACTIONS.RESTART,
          revision: view.revision
        },
        { focus: true, announce: false }
      );
    });

    section.setAttribute("aria-labelledby", heading.id);
    section.append(
      publicTitle,
      patternFigure.figure,
      heading,
      marks,
      finalMessage,
      signature,
      actionButton
    );

    return {
      section: section,
      heading: heading,
      actionButton: actionButton,
      patternFigure: patternFigure
    };
  }

  function createPhaseSection(phase) {
    var section = document.createElement("section");
    section.className = "phase phase-" + phase;
    return section;
  }

  function createHeading(text, id) {
    var heading = document.createElement("h1");
    heading.id = id;
    heading.tabIndex = -1;
    heading.textContent = text;
    return heading;
  }

  function createPrimaryAction(action) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "primary-action";
    button.textContent = action.label;
    return button;
  }

  function createStatusItem(label) {
    var item = document.createElement("li");
    var marker = document.createElement("span");
    var axis = document.createElement("span");
    var text = document.createElement("strong");

    item.className = "axis-status";
    marker.className = "status-marker";
    marker.setAttribute("aria-hidden", "true");
    axis.className = "status-axis";
    axis.textContent = label;
    text.className = "status-text";
    item.append(marker, axis, text);

    return {
      item: item,
      text: text
    };
  }

  function createPatternFigure(captionText) {
    var figure = document.createElement("figure");
    var shell = document.createElement("div");
    var fallback = document.createElement("div");
    var canvas = document.createElement("canvas");
    var caption = document.createElement("figcaption");

    figure.className = "pattern-figure";
    shell.className = "pattern-shell";
    fallback.className = "pattern-fallback";
    fallback.setAttribute("aria-hidden", "true");
    canvas.className = "pattern-canvas";
    canvas.setAttribute("aria-hidden", "true");
    caption.className = "pattern-caption";
    caption.textContent = captionText;
    shell.append(fallback, canvas);
    figure.append(shell, caption);

    return {
      figure: figure,
      shell: shell,
      fallback: fallback,
      canvas: canvas,
      caption: caption
    };
  }

  function updateTuningPhase(view, shouldAnnounce) {
    activeElements.foldButtons.forEach(function updateFoldButton(
      button,
      index
    ) {
      var selected =
        view.foldControl.values[index] === view.foldControl.selected;
      button.setAttribute("aria-pressed", String(selected));
    });

    if (document.activeElement !== activeElements.range) {
      activeElements.range.value = String(view.phaseControl.selected);
    }
    activeElements.output.textContent = view.phaseControl.displayText;
    updateStatus(
      activeElements.foldStatus,
      view.foldControl.status,
      view.foldControl.statusText
    );
    updateStatus(
      activeElements.phaseStatus,
      view.phaseControl.status,
      view.phaseControl.statusText
    );

    if (shouldAnnounce) {
      announce(view.summary);
    }
  }

  function updateStatus(statusElement, status, text) {
    statusElement.item.dataset.status = status;
    statusElement.text.textContent = text;
  }

  function announce(summary) {
    if (
      !activeElements.liveRegion ||
      summary === lastAnnouncedSummary
    ) {
      return;
    }
    lastAnnouncedSummary = summary;
    activeElements.liveRegion.textContent = summary;
  }

  function moveFocusForPhase(phase, elements) {
    if (document.hidden || !document.hasFocus()) {
      return;
    }

    if (phase === "aligned") {
      elements.actionButton.focus({ preventScroll: true });
      return;
    }

    elements.heading.focus({ preventScroll: true });
  }

  function schedulePattern(model, patternFigure) {
    activePattern = {
      model: model,
      figure: patternFigure
    };
    renderGeneration += 1;
    var generation = renderGeneration;
    cancelPatternFrame();

    if (reducedMotion.matches || document.hidden) {
      drawPattern(model, patternFigure);
      return;
    }

    animationFrame = globalThis.requestAnimationFrame(
      function drawScheduledPattern() {
        animationFrame = 0;
        if (generation !== renderGeneration) {
          return;
        }
        drawPattern(model, patternFigure);
      }
    );
  }

  function redrawCurrentPattern() {
    if (!activePattern) {
      return;
    }
    schedulePattern(activePattern.model, activePattern.figure);
  }

  function cancelPatternFrame() {
    if (animationFrame) {
      globalThis.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  function drawPattern(model, patternFigure) {
    var canvas = patternFigure.canvas;
    var context;

    try {
      context = canvas.getContext("2d");
    } catch (_error) {
      context = null;
    }

    if (!context) {
      patternFigure.shell.classList.add("is-canvas-fallback");
      return;
    }

    patternFigure.shell.classList.remove("is-canvas-fallback");

    var bounds = patternFigure.shell.getBoundingClientRect();
    var cssSize = Math.max(180, Math.floor(Math.min(bounds.width, bounds.height)));
    var pixelRatio = Math.max(
      1,
      Math.min(2, Number(globalThis.devicePixelRatio) || 1)
    );
    var bitmapSize = Math.max(1, Math.round(cssSize * pixelRatio));

    if (canvas.width !== bitmapSize || canvas.height !== bitmapSize) {
      canvas.width = bitmapSize;
      canvas.height = bitmapSize;
    }
    canvas.style.width = cssSize + "px";
    canvas.style.height = cssSize + "px";

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssSize, cssSize);
    context.save();
    context.translate(cssSize / 2, cssSize / 2);

    var radius = cssSize * 0.46;
    drawRings(context, radius, model);
    model.wedges.forEach(function drawWedge(wedge) {
      context.save();
      context.rotate(
        wedge.rotationUnits / model.turnUnits * Math.PI * 2
      );
      if (wedge.mirrored) {
        context.scale(1, -1);
      }
      drawMotifs(context, radius, wedge.index);
      context.restore();
    });

    context.restore();
  }

  function drawRings(context, radius, model) {
    context.save();
    context.strokeStyle = "#756e86";
    context.lineWidth = Math.max(1, radius * 0.008);

    context.beginPath();
    context.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
    context.stroke();

    var tickCount = model.turnUnits / model.phaseUnits;
    for (var index = 0; index < tickCount; index += 1) {
      var angle = index / tickCount * Math.PI * 2 - Math.PI / 2;
      var inner = radius * (index % 6 === 0 ? 0.88 : 0.9);
      var outer = radius * 0.94;
      context.beginPath();
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      context.stroke();
    }

    context.fillStyle = "#f5f0e8";
    context.beginPath();
    context.arc(0, 0, Math.max(2, radius * 0.035), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawMotifs(context, radius, index) {
    context.save();
    context.lineCap = "round";

    context.globalAlpha = 0.78;
    context.strokeStyle = "#53d6c5";
    context.lineWidth = radius * 0.026;
    context.beginPath();
    context.moveTo(radius * 0.06, 0);
    context.bezierCurveTo(
      radius * 0.2,
      radius * -0.02,
      radius * 0.48,
      radius * -0.18,
      radius * 0.82,
      radius * -0.4
    );
    context.stroke();

    context.globalAlpha = 0.66;
    context.strokeStyle = "#ff7b72";
    context.lineWidth = radius * 0.022;
    context.beginPath();
    context.moveTo(radius * 0.08, 0);
    context.bezierCurveTo(
      radius * 0.26,
      radius * 0.08,
      radius * 0.54,
      radius * 0.24,
      radius * 0.8,
      radius * 0.12
    );
    context.stroke();

    context.globalAlpha = 0.16;
    context.fillStyle = index % 2 === 0 ? "#f2c96d" : "#9b8cff";
    context.strokeStyle = index % 2 === 0 ? "#f2c96d" : "#9b8cff";
    context.lineWidth = radius * 0.008;
    context.beginPath();
    context.moveTo(radius * 0.1, radius * -0.03);
    context.lineTo(radius * 0.56, radius * -0.25);
    context.lineTo(radius * 0.72, radius * 0.02);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
})();
