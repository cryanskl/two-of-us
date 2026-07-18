(function () {
  "use strict";

  const config = globalThis.SIGNAL_REPAIR_CONFIG;
  const logic = globalThis.SignalRepairLogic;
  const root = document.querySelector("#signal-app");
  if (!config || !logic || !root) {
    showFatal("信号台加载失败，请确认 config.js、logic.js 与 app.js 都在同一目录。");
    return;
  }

  const elements = {
    headerRound: document.querySelector("#header-round"),
    intro: document.querySelector("#intro-panel"),
    introTitle: document.querySelector("#intro-title"),
    handoff: document.querySelector("#handoff-panel"),
    handoffTitle: document.querySelector("#handoff-title"),
    northReady: document.querySelector(".ready-seat--north"),
    southReady: document.querySelector(".ready-seat--south"),
    northReadyName: document.querySelector("#north-ready-name"),
    southReadyName: document.querySelector("#south-ready-name"),
    northReadyRole: document.querySelector("#north-ready-role"),
    southReadyRole: document.querySelector("#south-ready-role"),
    readyButtons: Array.from(document.querySelectorAll("button[data-action='ready']")),
    table: document.querySelector("#game-table"),
    playingTitle: document.querySelector("#playing-title"),
    northWorkspace: document.querySelector("#north-workspace"),
    southWorkspace: document.querySelector("#south-workspace"),
    northWorkspaceName: document.querySelector("#north-workspace-name"),
    southWorkspaceName: document.querySelector("#south-workspace-name"),
    northWorkspaceTitle: document.querySelector("#north-workspace-title"),
    southWorkspaceTitle: document.querySelector("#south-workspace-title"),
    northContent: document.querySelector("#north-workspace-content"),
    southContent: document.querySelector("#south-workspace-content"),
    roundNumber: document.querySelector("#round-number"),
    seconds: document.querySelector("#remaining-seconds"),
    operatorName: document.querySelector("#operator-name"),
    paused: document.querySelector("#paused-panel"),
    pausedTitle: document.querySelector("#paused-title"),
    timeout: document.querySelector("#timeout-panel"),
    timeoutTitle: document.querySelector("#timeout-title"),
    result: document.querySelector("#result-panel"),
    resultTitle: document.querySelector("#result-title"),
    resultBranch: document.querySelector("#result-branch"),
    resultRule: document.querySelector("#result-rule"),
    complete: document.querySelector("#complete-panel"),
    completeTitle: document.querySelector("#complete-title"),
    transmission: document.querySelector("#transmission"),
    records: document.querySelector("#round-records"),
    persistentStatus: document.querySelector("#persistent-status"),
    live: document.querySelector("#live-status"),
  };

  const MAX_FRAME_GAP_MS = 500;
  const TICK_MS = 1000 / logic.TICKS_PER_SECOND;
  const randomIndex = logic.createUnbiasedRandomIndex(globalThis.crypto);
  let state = logic.createInitialState(config);
  let lastFrameTime = null;
  let accumulatorMs = 0;
  let previousPhase = null;
  let announcedStatus = "";
  let lastSelectedBranch = null;

  root.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pauseFor("hidden");
  });
  globalThis.addEventListener("blur", function () { pauseFor("blur"); });

  render({ focus: false });
  globalThis.requestAnimationFrame(frame);

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (button.dataset.branchId) {
      lastSelectedBranch = button.dataset.branchId;
      dispatch({ type: "SELECT", branchId: button.dataset.branchId });
      return;
    }
    if (action === "start") {
      const plan = logic.createSession(logic.DEFAULT_PUZZLES, randomIndex);
      dispatch({ type: "START", plan });
    } else if (action === "ready") {
      dispatch({ type: "READY", seat: button.dataset.seat });
    } else if (action === "pause") {
      pauseFor("manual");
    } else if (action === "resume") {
      resetClock();
      dispatch({ type: "RESUME" });
    } else if (action === "retry") {
      dispatch({ type: "RETRY" });
    } else if (action === "next") {
      dispatch({ type: "NEXT" });
    } else if (action === "restart") {
      dispatch({ type: "RESTART" });
    }
  }

  function handleKeydown(event) {
    if (isEditable(event.target)) return;
    const action = logic.classifyKey(event.code, event.repeat);
    if (!action) return;
    if (action.type === "SELECT" && state.phase !== "playing") return;
    if (action.type === "PAUSE" && state.phase !== "playing") return;
    event.preventDefault();
    if (action.type === "SELECT") lastSelectedBranch = action.branchId;
    dispatch(action);
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function pauseFor(reason) {
    const next = logic.reduce(state, { type: "PAUSE", reason });
    if (next === state) return;
    resetClock();
    update(next);
  }

  function dispatch(action) {
    update(logic.reduce(state, action));
  }

  function update(next) {
    if (!next || next === state) return;
    const previous = state;
    state = next;
    render({ focus: true, previous });
  }

  function frame(now) {
    if (lastFrameTime === null) {
      lastFrameTime = now;
      globalThis.requestAnimationFrame(frame);
      return;
    }
    const elapsed = now - lastFrameTime;
    lastFrameTime = now;
    if (state.phase === "playing") {
      if (elapsed > MAX_FRAME_GAP_MS) {
        pauseFor("stalled");
      } else {
        accumulatorMs += elapsed;
        const ticks = Math.floor(accumulatorMs / TICK_MS);
        if (ticks > 0) {
          accumulatorMs -= ticks * TICK_MS;
          update(logic.reduce(state, { type: "TICK", ticks }));
        }
      }
    } else {
      accumulatorMs = 0;
    }
    globalThis.requestAnimationFrame(frame);
  }

  function resetClock() {
    lastFrameTime = null;
    accumulatorMs = 0;
  }

  function render(options) {
    const view = logic.getView(state);
    const phaseChanged = previousPhase !== view.phase;
    root.dataset.phase = view.phase;
    elements.headerRound.hidden = view.phase === "intro" || view.phase === "complete";
    elements.headerRound.textContent = `第 ${view.roundNumber} / ${view.roundCount} 轮`;
    elements.intro.hidden = view.phase !== "intro";
    elements.handoff.hidden = view.phase !== "handoff";
    elements.table.hidden = view.phase !== "playing";
    elements.paused.hidden = view.phase !== "paused";
    elements.timeout.hidden = view.phase !== "timeout";
    elements.result.hidden = view.phase !== "round-result";
    elements.complete.hidden = view.phase !== "complete";

    if (view.phase === "handoff") renderHandoff(view);
    if (view.phase === "playing") renderPlaying(view);
    else clearPlaying();
    if (view.phase === "round-result") renderResult(view);
    if (view.phase === "complete") renderComplete(view);

    elements.persistentStatus.textContent = view.statusLabel;
    if (view.statusLabel !== announcedStatus && (phaseChanged || view.isLocked)) {
      announcedStatus = view.statusLabel;
      elements.live.textContent = view.statusLabel;
    }

    if (options.focus && phaseChanged) focusPhase(view);
    if (options.previous && options.previous.lockTicks > 0 && view.lockTicks === 0 && view.phase === "playing") {
      const restored = root.querySelector(`button[data-branch-id="${lastSelectedBranch}"]`);
      restored?.focus({ preventScroll: true });
    }
    previousPhase = view.phase;
  }

  function renderHandoff(view) {
    elements.northReadyName.textContent = view.north.name;
    elements.southReadyName.textContent = view.south.name;
    elements.northReadyRole.textContent = roleDescription(view.north.role);
    elements.southReadyRole.textContent = roleDescription(view.south.role);
    elements.northReady.classList.toggle("is-ready", view.ready.north);
    elements.southReady.classList.toggle("is-ready", view.ready.south);
    elements.readyButtons.forEach(function (button) {
      const ready = view.ready[button.dataset.seat];
      button.disabled = ready;
      button.setAttribute("aria-disabled", String(ready));
      button.textContent = ready ? "已经准备好" : "我准备好了";
    });
  }

  function renderPlaying(view) {
    elements.roundNumber.textContent = `${view.roundNumber} / ${view.roundCount}`;
    elements.seconds.textContent = String(view.remainingSeconds);
    elements.operatorName.textContent = view.operatorName;
    renderWorkspace("north", view.north, view);
    renderWorkspace("south", view.south, view);
  }

  function renderWorkspace(seat, seatView, view) {
    const workspace = seat === "north" ? elements.northWorkspace : elements.southWorkspace;
    const name = seat === "north" ? elements.northWorkspaceName : elements.southWorkspaceName;
    const title = seat === "north" ? elements.northWorkspaceTitle : elements.southWorkspaceTitle;
    const content = seat === "north" ? elements.northContent : elements.southContent;
    workspace.classList.toggle("is-operator", seatView.role === "operator");
    workspace.classList.toggle("is-navigator", seatView.role === "navigator");
    name.textContent = seatView.name;
    title.textContent = seatView.role === "operator" ? "操作员 · 描述并选择星路" : "领航员 · 依次读优先规则";
    content.replaceChildren(seatView.role === "operator" ? createBranches(view) : createRules(view));
  }

  function createRules(view) {
    const sheet = document.createElement("div");
    sheet.className = "rule-sheet";
    const list = document.createElement("ol");
    view.rules.forEach(function (rule) {
      const item = document.createElement("li");
      item.textContent = rule.text;
      list.append(item);
    });
    sheet.append(list);
    return sheet;
  }

  function createBranches(view) {
    const wrapper = document.createElement("div");
    const grid = document.createElement("div");
    wrapper.className = "operator-board";
    grid.className = "branch-grid";
    view.currentPuzzle.branches.forEach(function (branch) {
      grid.append(createBranchButton(branch, view.isLocked));
    });
    const message = document.createElement("p");
    message.className = "lock-message";
    message.textContent = view.isLocked ? "这条还没有接通，继续听对方说，短暂停顿后再试。" : `题卡：${view.currentPuzzle.title}`;
    wrapper.append(grid, message);
    return wrapper;
  }

  function createBranchButton(branch, locked) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `branch-card texture-${branch.texture}`;
    button.dataset.branchId = branch.id;
    button.disabled = locked;
    button.setAttribute("aria-disabled", String(locked));
    button.setAttribute("aria-label", `${branch.id} 星路，${branch.textureLabel}，${branch.nodeCount} 个节点，${branch.symbolLabel}，信号${branch.signalLabel}`);

    const head = document.createElement("span");
    head.className = "branch-card__head";
    const id = document.createElement("span");
    id.className = "branch-id";
    id.textContent = branch.id;
    const texture = document.createElement("span");
    texture.className = "texture-name";
    texture.textContent = branch.textureLabel;
    head.append(id, texture);

    const path = document.createElement("span");
    path.className = "signal-path";
    const symbol = document.createElement("i");
    symbol.className = `symbol symbol-${branch.symbol}`;
    symbol.setAttribute("aria-hidden", "true");
    const nodes = document.createElement("span");
    nodes.className = "node-row";
    nodes.setAttribute("aria-hidden", "true");
    for (let index = 0; index < branch.nodeCount; index += 1) nodes.append(document.createElement("i"));
    path.append(symbol, nodes);

    const fields = document.createElement("span");
    fields.className = "branch-fields";
    [`${branch.nodeCount} 个节点`, branch.symbolLabel, `信号${branch.signalLabel}`].forEach(function (text) {
      const entry = document.createElement("span");
      entry.textContent = text;
      fields.append(entry);
    });

    const meter = document.createElement("span");
    meter.className = "signal-meter";
    const meterLabel = document.createElement("span");
    meterLabel.textContent = `档位 ${branch.signalLevel}/3`;
    meter.append(meterLabel);
    for (let level = 1; level <= 3; level += 1) {
      const bar = document.createElement("i");
      bar.classList.toggle("is-on", level <= branch.signalLevel);
      bar.setAttribute("aria-hidden", "true");
      meter.append(bar);
    }
    button.append(head, path, fields, meter);
    return button;
  }

  function clearPlaying() {
    elements.northContent.replaceChildren();
    elements.southContent.replaceChildren();
  }

  function renderResult(view) {
    elements.resultBranch.textContent = `接回了 ${view.outcome.branchId} 星路。`;
    elements.resultRule.textContent = `命中第 ${view.outcome.ruleIndex + 1} 条优先规则：${view.outcome.ruleText}`;
  }

  function renderComplete(view) {
    elements.transmission.replaceChildren();
    view.transmissionFragments.forEach(function (fragment) {
      const slip = document.createElement("p");
      slip.className = "transmission-slip";
      slip.textContent = fragment;
      elements.transmission.append(slip);
    });
    elements.records.replaceChildren();
    view.completed.forEach(function (record, index) {
      const puzzle = logic.DEFAULT_PUZZLES.find(function (entry) { return entry.id === record.puzzleId; });
      const item = document.createElement("li");
      const operator = record.operatorSeat === "north" ? view.north.name : view.south.name;
      item.textContent = `第 ${index + 1} 轮 · ${puzzle ? puzzle.title : record.puzzleId} · ${operator}操作 · ${record.attempts} 次尝试`;
      elements.records.append(item);
    });
    if (typeof config.composeTransmission === "function") {
      elements.complete.dataset.transmission = config.composeTransmission(view);
    }
  }

  function roleDescription(role) {
    return role === "operator" ? "操作员 · 描述三条星路" : "领航员 · 按优先规则判断";
  }

  function focusPhase(view) {
    globalThis.requestAnimationFrame(function () {
      const target = {
        intro: elements.introTitle,
        handoff: elements.handoffTitle,
        playing: elements.playingTitle,
        paused: elements.pausedTitle,
        timeout: elements.timeoutTitle,
        "round-result": elements.resultTitle,
        complete: elements.completeTitle,
      }[view.phase];
      target?.focus({ preventScroll: true });
    });
  }

  function showFatal(message) {
    document.body.textContent = message;
  }
})();
