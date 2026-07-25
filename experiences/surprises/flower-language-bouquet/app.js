(function (window, document) {
  "use strict";

  const logic = window.FLOWER_LANGUAGE_BOUQUET_LOGIC;
  const rawConfig = window.FLOWER_LANGUAGE_BOUQUET_CONFIG;
  const root = document.getElementById("experience-root");
  const liveStatus = document.getElementById("live-status");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MAX_EXPORT_BYTES = 256 * 1024;

  if (!logic || !root || !liveStatus) return;

  const PHASES = Object.freeze({
    INTRO: "intro",
    ARRANGING: "arranging",
    PREVIEW: "preview",
    COMPLETE: "complete",
  });
  const palette = Object.freeze({
    ink: "#20342d",
    inkSoft: "#596044",
    wine: "#843034",
    wineDark: "#661f22",
    brass: "#9a7a43",
    brassLight: "#c2a66d",
    paper: "#faf8f3",
    paperShade: "#f1ede5",
    leaf: "#d6dccf",
    rose: "#a95455",
    roseLight: "#d7a4a0",
    tulip: "#d38b78",
    daisy: "#f7f2e7",
    sunflower: "#e7bd63",
    lisianthus: "#b99aa9",
    gypsophila: "#f7f2e7",
  });

  let state = logic.createInitialState();
  let screen = null;
  let workspace = null;
  let focusRequestToken = 0;
  let pendingFocusRequest = null;
  const heldKeys = new Set();
  let exportController = createExportController();

  function createExportController() {
    return {
      generation: 0,
      phase: "idle",
      objectUrl: null,
    };
  }

  function element(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function svgElement(name, attributes) {
    const node = document.createElementNS(SVG_NS, name);
    const keys = Object.keys(attributes || {});
    for (let index = 0; index < keys.length; index += 1) {
      node.setAttribute(keys[index], String(attributes[keys[index]]));
    }
    return node;
  }

  function setText(node, value) {
    node.textContent = value;
  }

  function announce(message) {
    liveStatus.textContent = "";
    liveStatus.textContent = message;
  }

  function isModifiedActivation(event) {
    return Boolean(event.ctrlKey || event.metaKey || event.altKey);
  }

  function isDuplicatePointerActivation(event) {
    return typeof event.detail === "number" && event.detail > 1;
  }

  function nextFocusToken() {
    focusRequestToken = focusRequestToken >= Number.MAX_SAFE_INTEGER ? 1 : focusRequestToken + 1;
    return focusRequestToken;
  }

  function scheduleFocus(target, origin) {
    const request = { token: nextFocusToken(), target, origin };
    pendingFocusRequest = request;
    window.queueMicrotask(function () {
      flushPendingFocus(request.token);
    });
  }

  function flushPendingFocus(expectedToken) {
    const request = pendingFocusRequest;
    if (!request || request.token !== expectedToken) return;
    if (!request.target || !request.target.isConnected) {
      pendingFocusRequest = null;
      return;
    }
    if (document.visibilityState === "hidden"
      || (typeof document.hasFocus === "function" && !document.hasFocus())) return;
    const active = document.activeElement;
    const originStillOwnsFocus = active === document.body || active === request.origin
      || (!request.origin || !request.origin.isConnected) && active === document.body;
    if (!originStillOwnsFocus) {
      pendingFocusRequest = null;
      return;
    }
    pendingFocusRequest = null;
    request.target.focus({ preventScroll: false });
  }

  function flushLatestFocus() {
    if (pendingFocusRequest) flushPendingFocus(pendingFocusRequest.token);
  }

  function clearTransientInput() {
    heldKeys.clear();
  }

  function handleKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
    const key = `${event.key}:${event.code || ""}`;
    if (event.repeat || heldKeys.has(key)) {
      event.preventDefault();
      return;
    }
    heldKeys.add(key);
  }

  function handleKeyUp(event) {
    heldKeys.delete(`${event.key}:${event.code || ""}`);
  }

  function dispatch(action, intent) {
    const previous = state;
    const next = logic.reduce(previous, action);
    if (next === previous) return false;
    state = next;
    render();
    applyFeedback(previous, next, intent);
    return true;
  }

  function applyFeedback(previous, next, intent) {
    if (!intent) return;
    if (intent.type === "start") {
      scheduleFocus(workspace.cards.get(logic.FLOWER_IDS[0]), intent.origin);
      return;
    }
    if (intent.type === "add") {
      const view = logic.getPublicView(next);
      if (next.phase === PHASES.PREVIEW) {
        scheduleFocus(workspace.previewHeading, intent.origin);
        return;
      }
      const flower = view.selected[view.selected.length - 1];
      announce(`已选第 ${view.selectedCount} 枝：${flower.name}`);
      scheduleFocus(findNextAvailableCard(intent.flowerId, view), intent.origin);
      return;
    }
    if (intent.type === "undo") {
      const previousView = logic.getPublicView(previous);
      const removed = previousView.selected[previousView.selected.length - 1];
      announce(`已撤回：${removed.name}`);
      scheduleFocus(workspace.cards.get(removed.id), intent.origin);
      return;
    }
    if (intent.type === "tie") {
      scheduleFocus(screen.resultHeading, intent.origin);
      return;
    }
    if (intent.type === "restart") {
      scheduleFocus(screen.startButton, intent.origin);
    }
  }

  function findNextAvailableCard(currentId, view) {
    const start = logic.FLOWER_IDS.indexOf(currentId);
    for (let offset = 1; offset <= logic.FLOWER_IDS.length; offset += 1) {
      const id = logic.FLOWER_IDS[(start + offset) % logic.FLOWER_IDS.length];
      const item = view.catalog.find(function (flower) { return flower.id === id; });
      if (item && item.canAdd) return workspace.cards.get(id);
    }
    return workspace.cards.get(currentId);
  }

  function render() {
    const view = logic.getPublicView(state);
    if (view.phase === PHASES.INTRO) renderIntro(view);
    else if (view.phase === PHASES.ARRANGING || view.phase === PHASES.PREVIEW) {
      renderWorkspace(view);
    } else {
      renderComplete(view);
    }
  }

  function renderIntro(view) {
    if (screen && screen.kind === PHASES.INTRO) return;
    revokeCurrentObjectUrl();
    exportController.phase = "idle";
    workspace = null;

    const section = element("section", "intro-screen");
    section.setAttribute("aria-label", "开始挑花");
    const copy = element("div", "intro-copy");
    const action = element("button", "button button-primary intro-action", "开始挑花");
    action.type = "button";
    action.disabled = !view.canStart;
    action.addEventListener("click", function (event) {
      if (isDuplicatePointerActivation(event) || isModifiedActivation(event)) return;
      const startAction = logic.createStartAction(rawConfig);
      if (startAction) dispatch(startAction, { type: "start", origin: action });
    });
    copy.append(action);

    const stage = element("div", "bouquet-stage intro-stage");
    stage.append(createPageBouquetSvg(null, true));
    section.append(copy, stage);
    root.replaceChildren(section);
    screen = { kind: PHASES.INTRO, startButton: action };
  }

  function buildWorkspace() {
    const section = element("section", "workspace");
    const visualColumn = element("section", "workspace-visual");
    visualColumn.setAttribute("aria-labelledby", "workspace-progress");
    const progress = element("p", "progress-line");
    progress.id = "workspace-progress";
    const stage = element("div", "bouquet-stage");
    const sceneHost = element("div", "scene-host");
    stage.append(sceneHost);

    const roleTitle = element("h2", "section-title", "这束花里的顺序");
    const roleList = element("ol", "role-list");
    roleList.id = "selected-role-list";
    const roleRows = [];
    for (let index = 0; index < logic.REQUIRED_SELECTIONS; index += 1) {
      const row = element("li", "role-row");
      const label = element("span", "role-label");
      const name = element("strong", "role-name");
      const meaning = element("span", "role-meaning");
      row.append(label, name, meaning);
      roleList.append(row);
      roleRows.push({ row, label, name, meaning });
    }
    visualColumn.append(progress, stage, roleTitle, roleList);

    const controls = element("section", "workspace-controls");
    const previewHeading = element("h2", "preview-heading", "三枝花已经选好");
    previewHeading.id = "preview-heading";
    previewHeading.tabIndex = -1;
    previewHeading.hidden = true;
    previewHeading.setAttribute("aria-describedby", "selected-role-list bouquet-composition");
    const composition = element("p", "composition");
    composition.id = "bouquet-composition";
    composition.hidden = true;

    const actions = element("div", "action-row");
    const tieButton = element("button", "button button-primary", "系好这束花");
    tieButton.type = "button";
    tieButton.hidden = true;
    tieButton.addEventListener("click", function (event) {
      if (isDuplicatePointerActivation(event) || isModifiedActivation(event)) return;
      dispatch({ type: "TIE_BOUQUET" }, { type: "tie", origin: tieButton });
    });
    const undoButton = element("button", "button button-secondary", "撤回上一枝");
    undoButton.type = "button";
    undoButton.addEventListener("click", function (event) {
      if (isDuplicatePointerActivation(event) || isModifiedActivation(event)) return;
      dispatch({ type: "UNDO_LAST" }, { type: "undo", origin: undoButton });
    });
    actions.append(tieButton, undoButton);

    const fieldset = element("fieldset", "flower-pool");
    const legend = element("legend", "sr-only", "六种花材");
    const grid = element("div", "flower-grid");
    const cards = new Map();
    const cardParts = new Map();
    for (let index = 0; index < logic.FLOWER_IDS.length; index += 1) {
      const id = logic.FLOWER_IDS[index];
      const card = element("button", "flower-card");
      card.type = "button";
      const icon = createFlowerIcon(id);
      const text = element("span", "flower-card-copy");
      const name = element("strong", "flower-card-name");
      const meaning = element("span", "flower-card-meaning");
      const status = element("span", "flower-card-status");
      text.append(name, meaning, status);
      card.append(icon, text);
      card.addEventListener("click", function (event) {
        if (isDuplicatePointerActivation(event) || isModifiedActivation(event)
          || card.getAttribute("aria-disabled") === "true") return;
        dispatch({ type: "ADD_FLOWER", flowerId: id }, {
          type: "add",
          flowerId: id,
          origin: card,
        });
      });
      cards.set(id, card);
      cardParts.set(id, { card, name, meaning, status });
      grid.append(card);
    }
    fieldset.append(legend, grid);
    controls.append(previewHeading, composition, actions, fieldset);
    section.append(visualColumn, controls);

    return {
      section,
      progress,
      sceneHost,
      roleRows,
      previewHeading,
      composition,
      tieButton,
      undoButton,
      fieldset,
      cards,
      cardParts,
    };
  }

  function renderWorkspace(view) {
    if (!workspace) {
      workspace = buildWorkspace();
      root.replaceChildren(workspace.section);
      screen = { kind: "workspace" };
    }

    const isPreview = view.phase === PHASES.PREVIEW;
    setText(
      workspace.progress,
      isPreview ? "3 / 3 枝已经选好" : `已经挑了 ${view.selectedCount} / 3 枝`,
    );
    workspace.sceneHost.replaceChildren(createPageBouquetSvg(view.scene, false));
    updateRoleRows(view);
    workspace.previewHeading.hidden = !isPreview;
    workspace.composition.hidden = !isPreview;
    setText(workspace.composition, view.composition || "");
    workspace.tieButton.hidden = !isPreview;
    workspace.tieButton.disabled = !view.canTie;
    workspace.undoButton.hidden = !view.canUndo;
    workspace.undoButton.disabled = !view.canUndo;

    for (let index = 0; index < view.catalog.length; index += 1) {
      const flower = view.catalog[index];
      const parts = workspace.cardParts.get(flower.id);
      setText(parts.name, flower.name);
      setText(parts.meaning, flower.meaning);
      const selected = view.selected.find(function (item) { return item.id === flower.id; });
      setText(parts.status, selected ? `已选 · ${selected.roleLabel}` : "");
      parts.card.classList.toggle("is-selected", flower.isSelected);
      parts.card.setAttribute("aria-disabled", flower.canAdd ? "false" : "true");
      parts.card.setAttribute(
        "aria-label",
        selected
          ? `${flower.name}，${flower.meaning}，已选为${selected.roleLabel}`
          : `${flower.name}，${flower.meaning}`,
      );
    }
  }

  function updateRoleRows(view) {
    for (let index = 0; index < workspace.roleRows.length; index += 1) {
      const parts = workspace.roleRows[index];
      const selected = view.selected[index];
      setText(parts.label, logic.ROLE_LABELS[index]);
      setText(parts.name, selected ? selected.name : "等你挑选");
      setText(parts.meaning, selected ? selected.meaning : "");
      parts.row.classList.toggle("is-filled", Boolean(selected));
    }
  }

  function renderComplete(view) {
    if (screen && screen.kind === PHASES.COMPLETE && screen.revision === view.revision) return;
    workspace = null;
    const section = element("section", "complete-screen");
    const visual = element("section", "complete-visual");
    visual.setAttribute("aria-label", "完成的花束");
    const stage = element("div", "bouquet-stage complete-stage");
    stage.append(createPageBouquetSvg(view.scene, false));
    visual.append(stage, createCompleteRoleList(view));

    const result = element("article", "result-letter");
    const recipient = element("p", "recipient", view.recipient);
    const title = element("h2", "result-title", view.finalTitle);
    title.id = "result-title";
    title.tabIndex = -1;
    title.setAttribute("aria-describedby", "complete-composition complete-note");
    const note = element("p", "final-note", view.finalNote);
    note.id = "complete-note";
    const composition = element("p", "composition complete-composition", view.composition);
    composition.id = "complete-composition";
    const sender = element("p", "sender", `—— ${view.sender}`);
    result.append(recipient, title, note, composition, sender);

    const exportPanel = element("section", "export-panel");
    exportPanel.setAttribute("aria-label", "保存花束");
    const restartButton = element("button", "button button-secondary restart-button", "重新挑一束");
    restartButton.type = "button";
    restartButton.hidden = !view.canRestart;
    restartButton.addEventListener("click", function (event) {
      if (isDuplicatePointerActivation(event) || isModifiedActivation(event)) return;
      revokeCurrentObjectUrl();
      exportController.phase = "idle";
      dispatch({ type: "RESTART" }, { type: "restart", origin: restartButton });
    });

    section.append(visual, result, exportPanel, restartButton);
    root.replaceChildren(section);
    screen = {
      kind: PHASES.COMPLETE,
      revision: view.revision,
      resultHeading: title,
      exportPanel,
      restartButton,
    };
    prepareExport(false);
  }

  function createCompleteRoleList(view) {
    const list = element("ol", "role-list complete-role-list");
    list.setAttribute("aria-label", "花束顺序");
    for (let index = 0; index < view.selected.length; index += 1) {
      const item = view.selected[index];
      const row = element("li", "role-row is-filled");
      row.append(
        element("span", "role-label", item.roleLabel),
        element("strong", "role-name", item.name),
        element("span", "role-meaning", item.meaning),
      );
      list.append(row);
    }
    return list;
  }

  function createPageBouquetSvg(scene, isIntro) {
    const svg = svgElement("svg", {
      viewBox: "0 0 1000 1000",
      role: "presentation",
      focusable: "false",
      "aria-hidden": "true",
    });
    svg.classList.add("bouquet-svg");
    const paper = svgElement("rect", {
      x: 18,
      y: 18,
      width: 964,
      height: 964,
      rx: 16,
      fill: palette.paper,
      stroke: palette.ink,
      "stroke-width": 3,
    });
    svg.append(paper);

    const stems = scene ? scene.stems : [];
    for (let index = 0; index < logic.REQUIRED_SELECTIONS; index += 1) {
      if (stems[index]) {
        svg.append(renderStem(stems[index], false));
      } else {
        svg.append(renderEmptySlot(logic.ROLE_SLOTS[index], isIntro));
      }
    }
    if (stems.length === logic.REQUIRED_SELECTIONS) svg.append(renderRibbon(500, 850, false));
    return svg;
  }

  function renderEmptySlot(slot, isIntro) {
    const group = svgElement("g", {
      fill: "none",
      stroke: isIntro ? "#c8b9a5" : "#9b9488",
      "stroke-width": isIntro ? 3 : 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    group.setAttribute("stroke-dasharray", isIntro ? "10 14" : "8 12");
    group.append(
      svgElement("line", {
        x1: slot.x,
        y1: slot.y + 70,
        x2: slot.stemEndX,
        y2: slot.stemEndY,
      }),
      svgElement("ellipse", {
        cx: slot.x,
        cy: slot.y,
        rx: 58 * slot.scaleMilli / 1000,
        ry: 50 * slot.scaleMilli / 1000,
      }),
    );
    return group;
  }

  function renderStem(stem, exportMode) {
    const group = svgElement("g", {
      fill: "none",
      stroke: palette.ink,
      "stroke-width": exportMode ? 5 : 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    const startY = stem.y + 56 * stem.scaleMilli / 1000;
    group.append(svgElement("line", {
      x1: stem.x,
      y1: startY,
      x2: stem.stemEndX,
      y2: stem.stemEndY,
    }));

    const dx = stem.stemEndX - stem.x;
    const dy = stem.stemEndY - startY;
    const leafOneX = stem.x + dx * 0.42;
    const leafOneY = startY + dy * 0.42;
    const leafTwoX = stem.x + dx * 0.64;
    const leafTwoY = startY + dy * 0.64;
    group.append(
      svgElement("ellipse", {
        cx: leafOneX - 30,
        cy: leafOneY,
        rx: 36,
        ry: 16,
        transform: `rotate(${stem.rotationDeg - 28} ${leafOneX - 30} ${leafOneY})`,
        fill: palette.leaf,
      }),
      svgElement("ellipse", {
        cx: leafTwoX + 30,
        cy: leafTwoY,
        rx: 36,
        ry: 16,
        transform: `rotate(${stem.rotationDeg + 28} ${leafTwoX + 30} ${leafTwoY})`,
        fill: palette.leaf,
      }),
    );

    const head = svgElement("g", {
      transform: `translate(${stem.x} ${stem.y}) rotate(${stem.rotationDeg}) scale(${stem.scaleMilli / 1000})`,
    });
    renderHead(head, stem.shapeKey, exportMode);
    group.append(head);
    return group;
  }

  function appendRadialEllipses(group, count, radius, petalRx, petalRy, fill) {
    for (let index = 0; index < count; index += 1) {
      const angle = index * 360 / count;
      group.append(svgElement("ellipse", {
        cx: 0,
        cy: -radius,
        rx: petalRx,
        ry: petalRy,
        transform: `rotate(${angle})`,
        fill,
      }));
    }
  }

  const flowerRenderers = Object.freeze({
    rose: function renderRose(group) {
      appendRadialEllipses(group, 8, 34, 28, 42, palette.roseLight);
      appendRadialEllipses(group, 5, 18, 24, 34, palette.rose);
      group.append(svgElement("circle", { cx: 0, cy: 0, r: 17, fill: palette.wineDark }));
    },
    tulip: function renderTulip(group) {
      group.append(
        svgElement("path", {
          d: "M -62 -34 Q -34 -78 0 -40 Q 34 -78 62 -34 L 48 30 Q 0 70 -48 30 Z",
          fill: palette.tulip,
        }),
        svgElement("path", { d: "M -62 -34 Q -18 -8 0 46", fill: "none" }),
        svgElement("path", { d: "M 62 -34 Q 18 -8 0 46", fill: "none" }),
      );
    },
    daisy: function renderDaisy(group) {
      appendRadialEllipses(group, 12, 48, 15, 38, palette.daisy);
      group.append(svgElement("circle", { cx: 0, cy: 0, r: 26, fill: palette.brassLight }));
    },
    sunflower: function renderSunflower(group) {
      appendRadialEllipses(group, 16, 52, 16, 40, palette.sunflower);
      group.append(
        svgElement("circle", { cx: 0, cy: 0, r: 34, fill: palette.brass }),
        svgElement("circle", { cx: 0, cy: 0, r: 20, fill: palette.inkSoft }),
      );
    },
    lisianthus: function renderLisianthus(group) {
      appendRadialEllipses(group, 10, 36, 24, 38, palette.lisianthus);
      appendRadialEllipses(group, 6, 20, 20, 28, palette.paperShade);
      group.append(svgElement("circle", { cx: 0, cy: 0, r: 14, fill: palette.brassLight }));
    },
    gypsophila: function renderGypsophila(group) {
      const points = [[-44, -26], [-18, -62], [14, -48], [46, -18], [8, 4]];
      for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
        const mini = svgElement("g", {
          transform: `translate(${points[pointIndex][0]} ${points[pointIndex][1]})`,
        });
        for (let petalIndex = 0; petalIndex < 5; petalIndex += 1) {
          const angle = petalIndex * Math.PI * 2 / 5 - Math.PI / 2;
          mini.append(svgElement("circle", {
            cx: Math.cos(angle) * 10,
            cy: Math.sin(angle) * 10,
            r: 7,
            fill: palette.gypsophila,
          }));
        }
        mini.append(svgElement("circle", { cx: 0, cy: 0, r: 4, fill: palette.brassLight }));
        group.append(mini);
      }
    },
  });

  function renderHead(group, shapeKey) {
    const renderer = flowerRenderers[shapeKey];
    if (!renderer) throw new Error("unknown flower shape");
    renderer(group);
  }

  function renderRibbon(x, y) {
    const group = svgElement("g", {
      fill: "none",
      stroke: palette.wine,
      "stroke-width": 5,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    group.append(
      svgElement("ellipse", { cx: x - 38, cy: y, rx: 42, ry: 22 }),
      svgElement("ellipse", { cx: x + 38, cy: y, rx: 42, ry: 22 }),
      svgElement("circle", { cx: x, cy: y, r: 10, fill: palette.wine }),
      svgElement("line", { x1: x - 4, y1: y + 10, x2: x - 62, y2: y + 86 }),
      svgElement("line", { x1: x + 4, y1: y + 10, x2: x + 62, y2: y + 86 }),
    );
    return group;
  }

  function createFlowerIcon(shapeKey) {
    const svg = svgElement("svg", {
      viewBox: "-95 -95 190 190",
      focusable: "false",
      "aria-hidden": "true",
    });
    svg.classList.add("flower-icon");
    const group = svgElement("g", {
      fill: "none",
      stroke: palette.ink,
      "stroke-width": 4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      transform: "scale(.72)",
    });
    renderHead(group, shapeKey);
    svg.append(group);
    return svg;
  }

  function revokeCurrentObjectUrl() {
    if (!exportController.objectUrl) return;
    try {
      window.URL.revokeObjectURL(exportController.objectUrl);
    } catch (_error) {
      // Cleanup is best-effort and idempotent.
    }
    exportController.objectUrl = null;
  }

  function supportsExport() {
    return typeof window.Blob === "function"
      && typeof window.XMLSerializer === "function"
      && window.URL && typeof window.URL.createObjectURL === "function"
      && typeof window.URL.revokeObjectURL === "function"
      && typeof document.createElementNS === "function";
  }

  function prepareExport(isRetry) {
    if (!screen || screen.kind !== PHASES.COMPLETE) return;
    if (!supportsExport()) {
      exportController.phase = "unsupported";
      renderExportPanel();
      return;
    }
    if (exportController.generation >= Number.MAX_SAFE_INTEGER) {
      exportController.phase = "error";
      renderExportPanel();
      return;
    }

    revokeCurrentObjectUrl();
    exportController.generation += 1;
    const generation = exportController.generation;
    exportController.phase = "preparing";
    renderExportPanel();

    let objectUrl = null;
    try {
      const model = logic.buildExportModel(state);
      if (!model) throw new Error("missing export model");
      const exportSvg = buildStandaloneSvg(model);
      auditStandaloneSvg(exportSvg);
      const serialized = new window.XMLSerializer().serializeToString(exportSvg);
      if (!serialized || serialized.length > MAX_EXPORT_BYTES) throw new Error("invalid serialization");
      const blob = new window.Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      if (blob.size > MAX_EXPORT_BYTES) throw new Error("SVG exceeds 256 * 1024 bytes");
      objectUrl = window.URL.createObjectURL(blob);
      if (typeof objectUrl !== "string" || objectUrl.length === 0) throw new Error("invalid object URL");
      if (generation !== exportController.generation || exportController.phase !== "preparing") {
        window.URL.revokeObjectURL(objectUrl);
        return;
      }
      exportController.objectUrl = objectUrl;
      exportController.phase = "ready";
      renderExportPanel();
      if (isRetry) announce("保存文件已重新准备");
    } catch (_error) {
      if (objectUrl) {
        try {
          window.URL.revokeObjectURL(objectUrl);
        } catch (_cleanupError) {
          // The visible state remains a retryable error.
        }
      }
      exportController.objectUrl = null;
      exportController.phase = "error";
      renderExportPanel();
      announce("暂时没准备好文件，花束仍在这里");
    }
  }

  function renderExportPanel() {
    const panel = screen.exportPanel;
    panel.removeAttribute("aria-busy");
    const title = element("h3", "export-title");
    const detail = element("p", "export-detail");
    const actions = element("div", "export-actions");

    if (exportController.phase === "unsupported") {
      setText(title, "这个浏览器暂时不能准备 SVG 文件");
      setText(detail, "花束和留言仍会留在页面里。");
    } else if (exportController.phase === "preparing") {
      panel.setAttribute("aria-busy", "true");
      setText(title, "正在准备保存文件…");
      setText(detail, "花束和留言都还在。");
    } else if (exportController.phase === "ready") {
      setText(title, "保存文件已经准备好");
      setText(detail, "由浏览器决定下载、预览或交给系统文件。");
      const link = element("a", "button button-primary export-link", "保存含留言的 SVG");
      link.href = exportController.objectUrl;
      link.download = "flower-language-bouquet.svg";
      link.addEventListener("click", function (event) {
        if (isDuplicatePointerActivation(event) || isModifiedActivation(event)) {
          event.preventDefault();
          return;
        }
        announce("已交给浏览器处理");
      });
      actions.append(link);
    } else if (exportController.phase === "error") {
      const exhausted = exportController.generation >= Number.MAX_SAFE_INTEGER;
      setText(title, exhausted ? "暂时不能继续准备保存文件" : "这次没能准备好保存文件");
      setText(detail, "花束和留言都还在。");
      if (!exhausted) {
        const retry = element("button", "button button-primary", "重新准备保存文件");
        retry.type = "button";
        retry.addEventListener("click", function (event) {
          if (isDuplicatePointerActivation(event) || isModifiedActivation(event)) return;
          prepareExport(true);
        });
        actions.append(retry);
      }
    }
    panel.replaceChildren(title, detail, actions);
  }

  const allowedSvgElements = Object.freeze(new Set([
    "svg", "title", "desc", "rect", "g", "path", "circle", "ellipse", "line", "text", "tspan",
  ]));
  const allowedSvgAttributes = Object.freeze(new Set([
    "xmlns", "version", "viewBox", "width", "height", "transform", "fill", "stroke",
    "stroke-width", "stroke-linecap", "stroke-linejoin", "x", "y", "d", "r", "rx", "ry",
    "cx", "cy", "x1", "y1", "x2", "y2", "font-family", "font-size", "font-weight",
    "text-anchor",
  ]));

  function buildStandaloneSvg(model) {
    const svg = svgElement("svg", {
      version: "1.1",
      viewBox: model.viewBox,
      width: model.width,
      height: model.height,
    });
    const title = svgElement("title");
    title.textContent = model.documentTitle;
    const description = svgElement("desc");
    description.textContent = model.documentDescription;
    svg.append(title, description);
    svg.append(svgElement("rect", {
      x: 0,
      y: 0,
      width: model.width,
      height: model.height,
      fill: palette.paper,
    }));
    svg.append(svgElement("rect", {
      x: 38,
      y: 38,
      width: model.width - 76,
      height: model.height - 76,
      rx: 18,
      fill: "none",
      stroke: palette.ink,
      "stroke-width": 3,
    }));

    for (let index = 0; index < model.scene.stems.length; index += 1) {
      svg.append(renderStem(model.scene.stems[index], true));
    }
    svg.append(renderRibbon(model.scene.tieX, model.scene.tieY, true));

    for (let index = 0; index < model.textLines.length; index += 1) {
      const line = model.textLines[index];
      const text = svgElement("text", {
        x: line.x,
        y: line.y,
        fill: line.block === "title" ? palette.wineDark : palette.ink,
        "font-family": line.block === "title"
          ? "Iowan Old Style, Songti SC, STSong, serif"
          : "Avenir Next, PingFang SC, Microsoft YaHei, sans-serif",
        "font-size": line.fontSize,
        "font-weight": line.block === "title" ? 600 : 400,
      });
      const tspan = svgElement("tspan", { x: line.x, y: line.y });
      tspan.textContent = line.text;
      text.append(tspan);
      svg.append(text);
    }
    return svg;
  }

  function auditStandaloneSvg(svg) {
    const nodes = [svg];
    let index = 0;
    while (index < nodes.length) {
      const node = nodes[index];
      index += 1;
      if (node.namespaceURI !== SVG_NS || !allowedSvgElements.has(node.localName)) {
        throw new Error("forbidden SVG element or namespace");
      }
      for (let attributeIndex = 0; attributeIndex < node.attributes.length; attributeIndex += 1) {
        const attribute = node.attributes[attributeIndex];
        if (!allowedSvgAttributes.has(attribute.name)
          || /^on/i.test(attribute.name)
          || /href|url/i.test(attribute.name)) {
          throw new Error("forbidden SVG attribute");
        }
      }
      for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
        nodes.push(node.children[childIndex]);
      }
    }
    for (const forbidden of ["script", "style", "foreignObject", "use", "image", "a", "metadata"]) {
      if (svg.querySelector(forbidden)) throw new Error("forbidden SVG node");
    }
  }

  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("blur", clearTransientInput);
  window.addEventListener("focus", flushLatestFocus);
  window.addEventListener("pagehide", function () {
    clearTransientInput();
    pendingFocusRequest = null;
  });
  document.addEventListener("visibilitychange", function () {
    clearTransientInput();
    if (document.visibilityState !== "hidden") flushLatestFocus();
  });

  render();
})(window, document);
