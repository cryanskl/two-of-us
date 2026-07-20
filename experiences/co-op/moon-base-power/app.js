(function () {
  "use strict";

  const logic = globalThis.MoonBasePowerLogic;
  const config = globalThis.MoonBasePowerConfig;
  const mount = document.querySelector("#app");

  if (!logic || !mount) {
    if (mount) {
      const message = document.createElement("p");
      message.className = "noscript";
      message.textContent = "本地规则文件未能载入，请确认 config.js、levels.js 与 logic.js 都在当前目录。";
      mount.replaceChildren(message);
    }
    return;
  }

  const faultLabels = Object.freeze({
    "invalid-input": "规则输入无效",
    "solar-off": "太阳能馈线未接通",
    "battery-off": "蓄电池馈线未接通",
    "oxygen-off": "氧气未接通",
    "lights-off": "照明未接通",
    "comms-off": "通信未接通",
    "oxygen-port-unavailable": "氧气接在受损插口",
    "lights-port-unavailable": "照明接在受损插口",
    "comms-port-unavailable": "通信接在受损插口",
    "tie-maintenance": "联络线维护中，必须断开",
    "tie-required": "需要接通联络线并送出电力",
    "tie-idle": "联络方向不对，没有发生转移",
    "deficit-L": "BUS L 供给不足",
    "deficit-R": "BUS R 供给不足",
  });
  const loadLabels = Object.freeze({ oxygen: "氧气", lights: "照明", comms: "通信" });
  const busLabels = Object.freeze({ off: "关闭", L: "L", R: "R" });
  const tieLabels = Object.freeze({ off: "断开", "L-to-R": "L→R", "R-to-L": "R→L" });
  const pauseLabels = Object.freeze({
    manual: "双方手动暂停",
    hidden: "页面进入后台",
    blur: "页面失去焦点",
    "long-frame": "画面间隔过长",
  });

  let state = logic.createInitialState(config);
  let view = logic.getPublicView(state, config);
  let phaseHost = null;
  let liveRegion = null;
  let animationToken = 0;
  let frameId = null;
  let accumulatorMs = 0;
  let lastTimestamp = null;

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function append(parent, children) {
    children.forEach((child) => {
      if (child) parent.append(child);
    });
    return parent;
  }

  function makeButton(label, className, focusKey, action) {
    const button = element("button", className, label);
    button.type = "button";
    if (focusKey) button.dataset.focusKey = focusKey;
    button.addEventListener("click", () => dispatch(action, true));
    return button;
  }

  function buildShell() {
    const shell = element("div", "page-shell");
    const utility = element("nav", "utility-bar");
    utility.setAttribute("aria-label", "作品导航");
    const back = element("a", "back-link", "返回双人合作");
    back.href = "../../../index.html#co-op";
    const code = element("span", "work-code", "C08 · 月面供电");
    append(utility, [back, code]);

    phaseHost = element("main", "phase-host");
    phaseHost.id = "main-content";
    const disclaimer = element("p", "abstract-disclaimer", "本作是原创抽象协作玩法，不模拟真实电力系统。");
    const localOnly = element("p", "local-only", "本地运行 · 不联网 · 抽象谜题 · 刷新即重置");
    liveRegion = element("div", "sr-only");
    liveRegion.id = "live-region";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    append(shell, [utility, phaseHost, disclaimer, localOnly, liveRegion]);
    mount.replaceChildren(shell);
  }

  function buildHeader() {
    const header = element("header", "mission-header");
    const copy = element("div", "mission-heading");
    const eyebrow = element("p", "eyebrow", "共享值班台 / 双母线");
    const title = element("h1", "", view.primaryTitle);
    title.id = "mission-title";
    const description = element(
      "p",
      "mission-copy",
      view.phase === "operating" || view.phase === "paused"
        ? "一人守住供电，一人安顿负载。稳定三秒，把这一班交到对方手里。"
        : view.primaryDescription,
    );
    append(copy, [eyebrow, title, description]);

    let badgeText = "值班准备 · 电源席 / 负载席";
    if (view.phase !== "intro") badgeText = `第 ${view.shift.number} 班 · ${view.shift.title} · 电源席 / 负载席`;
    const badge = element("div", "shift-badge", badgeText);
    append(header, [copy, badge]);
    return header;
  }

  function buildIntro() {
    const panel = element("section", "phase-panel intro-panel");
    panel.setAttribute("aria-labelledby", "mission-title");
    const intro = element("p", "panel-intro", "氧气、照明、通信，都要亮着。安全不是一瞬间——一起稳住它。三班都完成，月面才算没有熄灯。");
    const roles = element("div", "intro-grid");
    const power = element("article", "role-card power");
    append(power, [
      element("h2", "", view.operators.power),
      element("p", "", "控制太阳能、蓄电池与联络方向。键盘 A / S / D。"),
    ]);
    const load = element("article", "role-card load");
    append(load, [
      element("h2", "", view.operators.load),
      element("p", "", "安排氧气、照明与通信接入哪条母线。键盘 J / K / L。"),
    ]);
    append(roles, [power, load]);
    const start = makeButton("开始第一班", "primary-action", "phase-primary", { type: "START" });
    append(panel, [intro, roles, start]);
    return panel;
  }

  function briefCard(title, supply, details) {
    const card = element("article", "brief-card");
    append(card, [
      element("h2", "", title),
      element("p", "", `供给 ${supply.L} / ${supply.R} · ${details}`),
    ]);
    return card;
  }

  function buildHandoff() {
    const panel = element("section", "phase-panel handoff-panel");
    panel.setAttribute("aria-labelledby", "handoff-title");
    const title = element("h2", "", `第 ${view.shift.number} 班，双方准备交接`);
    title.id = "handoff-title";
    const note = element("p", "", view.shift.note);
    const cards = element("div", "handoff-grid");
    append(cards, [
      briefCard("BUS L / 太阳能", { L: view.shift.supply.L, R: view.shift.supply.R }, "左 / 右额定单位"),
      briefCard(
        "生命负载",
        { L: view.shift.demand.oxygen, R: view.shift.demand.lights + view.shift.demand.comms },
        `氧气 ${view.shift.demand.oxygen} · 照明 ${view.shift.demand.lights} · 通信 ${view.shift.demand.comms}`,
      ),
    ]);
    const interlock = element("p", "interlock-note", view.interlockNote);
    const ready = makeButton("已经换好位置", "primary-action", "phase-primary", { type: "READY" });
    append(panel, [title, note, cards, interlock, ready]);
    return panel;
  }

  function balanceText(side) {
    if (side.deficit > 0) return `缺口 −${side.deficit}`;
    return `余量 +${side.surplus}`;
  }

  function buildSource(side, name, enabled) {
    const evaluation = view.evaluation;
    const card = element("article", `source-card ${side === "L" ? "left" : "right"}${enabled ? " online" : ""}`);
    append(card, [
      element("span", "source-name", name),
      element("strong", "source-value", `${evaluation.supply[side]} u`),
      element("span", "source-state", `${enabled ? "已接通" : "未接通"} · 额定 ${view.shift.supply[side]}`),
    ]);
    return card;
  }

  function buildBus(side) {
    const final = view.evaluation.final[side];
    const card = element("article", `bus-card bus-${side.toLowerCase()}`);
    append(card, [
      element("span", "data-label", `BUS ${side}`),
      element("strong", "bus-number", String(final.supplied)),
      element("span", "bus-detail", `需求 ${final.demand} · ${balanceText(final)}`),
    ]);
    return card;
  }

  function buildTie() {
    const transfer = view.evaluation.transfer;
    const card = element("article", "tie-card");
    const lineClass = transfer.direction === logic.OFF
      ? "tie-line"
      : `tie-line active ${transfer.direction === logic.TIE_LR ? "to-right" : "to-left"}`;
    append(card, [
      element("span", "data-label", "联络"),
      element("strong", "tie-direction", tieLabels[transfer.direction]),
      element("span", lineClass),
      element("span", "transfer-value", `转移 ${transfer.amount} / ${transfer.capacity}`),
    ]);
    return card;
  }

  function buildLoadRoute(load) {
    const item = view.evaluation.loads[load];
    const row = element("article", `load-route load-${load}${item.safe ? " safe" : ""}`);
    const leftLine = element("span", `route-segment left${item.bus === "L" ? " connected" : ""}`);
    leftLine.setAttribute("aria-hidden", "true");
    const rightLine = element("span", `route-segment right${item.bus === "R" ? " connected" : ""}`);
    rightLine.setAttribute("aria-hidden", "true");
    append(row, [
      element("strong", "load-name", `${loadLabels[load]} · ${item.demand}`),
      leftLine,
      element("span", "load-bus", item.bus === "off" ? "未接" : `BUS ${item.bus}`),
      rightLine,
      element("span", `load-status${item.safe ? "" : " bad"}`, item.safe ? "✓ 供给满足" : item.allowed ? "等待供给" : item.connected ? "插口受损" : "未接通"),
    ]);
    return row;
  }

  function buildGridStage() {
    const stage = element("section", "grid-stage");
    stage.setAttribute("aria-labelledby", "grid-title");
    const meta = element("div", "stage-meta");
    const heading = element("div", "");
    const title = element("h2", "", `第 ${view.shift.number} 班 · ${view.shift.title}`);
    title.id = "grid-title";
    append(heading, [title, element("p", "stage-note", view.shift.note)]);
    const stageUtility = element("div", "stage-utility");
    stageUtility.append(element("p", "interlock-note", view.interlockNote));
    if (view.phase === "operating") {
      stageUtility.append(makeButton("暂停值班", "utility-button", "pause-manual", { type: "PAUSE", reason: "manual" }));
    }
    append(meta, [heading, stageUtility]);

    const map = element("div", "power-map");
    append(map, [
      buildSource("L", "太阳能", view.controls.solarOn),
      buildBus("L"),
      buildTie(),
      buildBus("R"),
      buildSource("R", "蓄电池", view.controls.batteryOn),
      buildLoadRoute("oxygen"),
      buildLoadRoute("lights"),
      buildLoadRoute("comms"),
    ]);
    append(stage, [meta, map]);
    return stage;
  }

  function buildStatus() {
    const strip = element("div", "status-strip");
    const faultPanel = element("section", "fault-panel");
    const statusTitle = element("div", "status-title");
    const statusMark = element("span", "status-mark", view.progress.isSafe ? "✓" : "!");
    statusMark.setAttribute("aria-hidden", "true");
    append(statusTitle, [statusMark, element("span", "", view.progress.isSafe ? "供电稳定 · 安全窗口" : faultLabels[view.evaluation.faults[0]] || "等待共同调整")]);
    const faults = element("ul", "fault-list");
    if (view.evaluation.faults.length === 0) {
      faults.append(element("li", "", "两侧最终缺口均为 0"));
    } else {
      view.evaluation.faults.forEach((fault) => faults.append(element("li", "", faultLabels[fault] || fault)));
    }
    append(faultPanel, [statusTitle, faults]);

    const stable = element("section", "stable-panel");
    stable.setAttribute("aria-label", "连续安全窗");
    const stableCopy = element("div", "stable-copy");
    append(stableCopy, [
      element("span", "", view.progress.isSafe ? "安全窗口" : "稳定被中断"),
      element("strong", "", `稳定 ${view.progress.stableTicks} / ${view.progress.requiredTicks}`),
    ]);
    stableCopy.lastChild.dataset.stableCurrent = "true";
    const progress = element("progress", "");
    progress.max = view.progress.requiredTicks;
    progress.value = view.progress.stableTicks;
    progress.dataset.stableProgress = "true";
    progress.textContent = `${view.progress.stableTicks} / ${view.progress.requiredTicks}`;
    append(stable, [stableCopy, progress]);
    append(strip, [faultPanel, stable]);
    return strip;
  }

  function buildRadioGroup(options) {
    const fieldset = element("fieldset", "option-group");
    const legend = element("legend", "sr-only", options.legend);
    fieldset.append(legend);
    options.values.forEach((option) => {
      const label = element("label", "option-label");
      const input = element("input", "");
      input.type = "radio";
      input.name = options.name;
      input.value = option.value;
      input.checked = option.value === options.current;
      input.disabled = Boolean(option.disabled || options.disabled);
      input.dataset.focusKey = `${options.name}-${option.value}`;
      input.addEventListener("change", () => {
        if (input.checked) dispatch(options.action(option.value), true);
      });
      const text = element("span", "", option.label);
      append(label, [input, text]);
      if (option.disabled) label.append(element("small", "port-damaged", "插口受损"));
      fieldset.append(label);
    });
    return fieldset;
  }

  function settingRow(label, meta, group) {
    const row = element("div", "setting-row");
    const name = element("div", "setting-name", label);
    name.append(element("span", "setting-meta", meta));
    append(row, [name, group]);
    return row;
  }

  function buildPowerConsole(disabled) {
    const consolePanel = element("section", "console power");
    consolePanel.setAttribute("aria-labelledby", "power-console-title");
    const heading = element("div", "console-heading");
    const title = element("h2", "", view.operators.power);
    title.id = "power-console-title";
    append(heading, [title, element("span", "key-hint", "A / S / D")]);

    const feeds = element("div", "feed-controls");
    const solar = makeButton(`太阳能 ${view.controls.solarOn ? "开" : "关"}`, "feed-button", "feed-solar", { type: "TOGGLE_FEED", feed: "solar" });
    solar.setAttribute("aria-pressed", String(view.controls.solarOn));
    solar.setAttribute("aria-keyshortcuts", "A");
    solar.disabled = disabled;
    const battery = makeButton(`蓄电池 ${view.controls.batteryOn ? "开" : "关"}`, "feed-button", "feed-battery", { type: "TOGGLE_FEED", feed: "battery" });
    battery.setAttribute("aria-pressed", String(view.controls.batteryOn));
    battery.setAttribute("aria-keyshortcuts", "S");
    battery.disabled = disabled;
    append(feeds, [solar, battery]);

    const tie = buildRadioGroup({
      legend: "联络线方向",
      name: "tie",
      current: view.controls.tie,
      disabled,
      values: [
        { value: logic.OFF, label: "断开" },
        { value: logic.TIE_LR, label: "L→R" },
        { value: logic.TIE_RL, label: "R→L" },
      ],
      action: (direction) => ({ type: "SET_TIE", direction }),
    });
    append(consolePanel, [heading, feeds, settingRow("联络", "D 循环", tie)]);
    return consolePanel;
  }

  function buildLoadConsole(disabled) {
    const consolePanel = element("section", "console load");
    consolePanel.setAttribute("aria-labelledby", "load-console-title");
    const heading = element("div", "console-heading");
    const title = element("h2", "", view.operators.load);
    title.id = "load-console-title";
    append(heading, [title, element("span", "key-hint", "J / K / L")]);
    const settings = element("div", "load-settings");
    logic.LOADS.forEach((load, index) => {
      const allowed = view.availableBusOptions[load];
      const values = [logic.OFF, logic.BUS_L, logic.BUS_R].map((bus) => ({
        value: bus,
        label: busLabels[bus],
        disabled: !allowed.includes(bus),
      }));
      const group = buildRadioGroup({
        legend: `${loadLabels[load]}接线母线`,
        name: load,
        current: view.controls[load],
        disabled,
        values,
        action: (bus) => ({ type: "SET_LOAD", load, bus }),
      });
      settings.append(settingRow(loadLabels[load], `${["J", "K", "L"][index]} · 需求 ${view.shift.demand[load]}`, group));
    });
    append(consolePanel, [heading, settings]);
    return consolePanel;
  }

  function buildOperating() {
    const layout = element("section", `operating-layout${view.phase === "paused" ? " paused-layout" : ""}`);
    append(layout, [buildGridStage(), buildStatus()]);
    const consoles = element("div", "role-consoles");
    append(consoles, [buildPowerConsole(view.phase === "paused"), buildLoadConsole(view.phase === "paused")]);
    layout.append(consoles);
    if (view.phase === "paused") {
      const pauseCard = element("section", "pause-card");
      pauseCard.setAttribute("aria-labelledby", "pause-title");
      const title = element("h2", "", "值班已暂停");
      title.id = "pause-title";
      append(pauseCard, [
        title,
        element("p", "", `${pauseLabels[state.pauseReason] || "值班暂停"}。安全进度保持不变，不会在后台补算。`),
        makeButton("继续值班", "primary-action", "phase-primary", { type: "RESUME" }),
      ]);
      layout.prepend(pauseCard);
    }
    return layout;
  }

  function controlSummary(summary) {
    const controls = summary.controls;
    const route = logic.LOADS.map((load) => `${loadLabels[load]}→${controls[load]}`).join(" · ");
    return `${route} · 联络 ${tieLabels[controls.tie]} · 转移 ${summary.transferAmount}`;
  }

  function buildResult() {
    const panel = element("section", "phase-panel result-panel");
    const summary = view.completedShifts[view.completedShifts.length - 1];
    const title = element("h2", "", `第 ${view.shift.number} 班已经稳稳交出去了`);
    append(panel, [
      title,
      element("p", "", "连续安全 90 / 90，氧气、照明和通信都保持接通。"),
      element("p", "route-summary", controlSummary(summary)),
      makeButton("交给下一班", "primary-action", "phase-primary", { type: "NEXT_SHIFT" }),
    ]);
    return panel;
  }

  function buildComplete() {
    const panel = element("section", "phase-panel complete-panel");
    panel.setAttribute("aria-labelledby", "mission-title");
    const records = element("div", "completion-records");
    view.completedShifts.forEach((summary, index) => {
      const card = element("article", "record-card");
      append(card, [
        element("h3", "", `第 ${index + 1} 班 · 稳定 90 / 90`),
        element("p", "", controlSummary(summary)),
      ]);
      records.append(card);
    });
    const noteTitle = element("h2", "note-title", "留给彼此的话");
    const note = element("blockquote", "complete-note", view.completion.note);
    const actions = element("div", "action-row");
    const restart = makeButton("重新值班", "primary-action", "phase-primary", { type: "RESTART" });
    const back = element("a", "", "返回目录");
    back.href = "../../../index.html#co-op";
    append(actions, [restart, back]);
    append(panel, [
      element("p", "", "氧气、照明和通信，在三次交接里始终亮着。"),
      records,
      noteTitle,
      note,
      actions,
    ]);
    return panel;
  }

  function activeFocusKey() {
    const active = document.activeElement;
    return active && active.dataset ? active.dataset.focusKey || null : null;
  }

  function findFocusKey(key) {
    return [...phaseHost.querySelectorAll("[data-focus-key]")].find((node) => node.dataset.focusKey === key) || null;
  }

  function render(options) {
    const settings = options || {};
    const oldFocusKey = settings.preserveFocus ? activeFocusKey() : null;
    const oldPhase = phaseHost.dataset.phase;
    view = logic.getPublicView(state, config);
    phaseHost.dataset.phase = view.phase;
    let content = buildIntro();
    if (view.phase === "handoff") content = buildHandoff();
    if (view.phase === "operating" || view.phase === "paused") content = buildOperating();
    if (view.phase === "shift-result") content = buildResult();
    if (view.phase === "complete") content = buildComplete();
    phaseHost.replaceChildren(buildHeader(), content);

    let focusTarget = oldFocusKey && oldPhase === view.phase ? findFocusKey(oldFocusKey) : null;
    if (!focusTarget && settings.focusPhase !== false) focusTarget = findFocusKey(view.phase === "operating" ? "feed-solar" : "phase-primary");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function announce(message) {
    if (!message || !liveRegion) return;
    liveRegion.textContent = "";
    liveRegion.textContent = message;
  }

  function operationAnnouncement(previous, current) {
    if (!current.lastEvaluation.isSafe) {
      const first = current.lastEvaluation.faults[0];
      return faultLabels[first] || first;
    }
    if (!previous.lastEvaluation.isSafe) return "进入安全窗口，一起稳住三秒。";
    return "供电保持稳定。";
  }

  function stopLoop() {
    animationToken += 1;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    accumulatorMs = 0;
    lastTimestamp = null;
  }

  function startLoop() {
    stopLoop();
    if (state.phase !== "operating") return;
    const token = animationToken;
    const revision = state.revision;

    function frame(timestamp) {
      if (token !== animationToken || state.phase !== "operating" || state.revision !== revision) return;
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        frameId = requestAnimationFrame(frame);
        return;
      }
      const frameResult = logic.consumeFrame(accumulatorMs, timestamp - lastTimestamp);
      lastTimestamp = timestamp;
      if (frameResult.pauseReason) {
        accumulatorMs = 0;
        dispatch({ type: "PAUSE", reason: frameResult.pauseReason }, false);
        return;
      }
      accumulatorMs = frameResult.accumulatorMs;
      advanceTicks(frameResult.ticks);
      if (token === animationToken && state.phase === "operating" && state.revision === revision) frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);
  }

  function updateStableProgress() {
    view = logic.getPublicView(state, config);
    const current = phaseHost.querySelector("[data-stable-current]");
    const progress = phaseHost.querySelector("[data-stable-progress]");
    if (current) current.textContent = `稳定 ${view.progress.stableTicks} / ${view.progress.requiredTicks}`;
    if (progress) {
      progress.value = view.progress.stableTicks;
      progress.textContent = `${view.progress.stableTicks} / ${view.progress.requiredTicks}`;
    }
  }

  function advanceTicks(count) {
    if (count <= 0) return;
    const previous = state;
    let next = state;
    for (let index = 0; index < count && next.phase === "operating"; index += 1) {
      next = logic.reducePower(next, { type: "TICK" });
    }
    if (next === state) return;
    state = next;
    if (state.phase !== "operating" || state.revision !== previous.revision) {
      stopLoop();
      render({ focusPhase: true });
      announce(logic.getPublicView(state, config).liveMessage);
      return;
    }
    updateStableProgress();
    const before = previous.stableTicks;
    const after = state.stableTicks;
    [30, 60].forEach((milestone) => {
      if (before < milestone && after >= milestone) announce(`安全窗口 ${milestone / 30} / 3。`);
    });
  }

  function dispatch(action, interaction) {
    const previous = state;
    const next = logic.reducePower(state, action);
    if (next === previous) return false;
    state = next;
    const phaseChanged = previous.phase !== state.phase;
    const revisionChanged = previous.revision !== state.revision;
    if (phaseChanged || revisionChanged) stopLoop();
    render({ preserveFocus: Boolean(interaction && !phaseChanged), focusPhase: phaseChanged });

    if (action.type === "TOGGLE_FEED" || action.type === "SET_TIE" || action.type === "SET_LOAD") {
      const interrupted = previous.stableTicks > 0 && state.stableTicks === 0;
      announce(interrupted ? `稳定被中断。${operationAnnouncement(previous, state)}` : operationAnnouncement(previous, state));
    } else {
      announce(logic.getPublicView(state, config).liveMessage);
    }
    if (state.phase === "operating" && (phaseChanged || revisionChanged)) startLoop();
    return true;
  }

  function pauseFor(reason) {
    if (state.phase !== "operating") return;
    accumulatorMs = 0;
    lastTimestamp = null;
    dispatch({ type: "PAUSE", reason }, false);
  }

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTextEntry = target && (target.isContentEditable || target.matches(
      "textarea, select, input:not([type]), input[type='text'], input[type='search'], input[type='email'], input[type='url'], input[type='tel'], input[type='password'], input[type='number']",
    ));
    if (isTextEntry) return;
    const action = logic.classifyPowerKey(state, event);
    if (!action) return;
    event.preventDefault();
    dispatch(action, true);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseFor("hidden");
  });
  globalThis.addEventListener("blur", () => pauseFor("blur"));

  buildShell();
  render({ focusPhase: true });
})( );
