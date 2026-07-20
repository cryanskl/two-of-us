(function () {
  "use strict";

  const logic = globalThis.FogNavigationLogic;
  const config = globalThis.FOG_NAVIGATION_CONFIG;
  const stage = document.querySelector("#stage");
  const controls = document.querySelector("#controls");
  const roundStatus = document.querySelector("#round-status");
  const liveStatus = document.querySelector("#live-status");

  if (!logic || !stage || !controls || !roundStatus || !liveStatus) {
    if (stage) {
      const message = document.createElement("p");
      message.className = "phase-panel";
      message.textContent = "本地规则文件未能载入，请确认 config.js、levels.js 与 logic.js 都在当前目录。";
      stage.replaceChildren(message);
    }
    return;
  }

  const coverReasons = Object.freeze({
    timer: "看图时间到了，现在只留脚边的雾窗。",
    manual: "地图已经折好，可以交接了。",
    hidden: "页面离开过视线，地图已经安全遮盖。",
    blur: "窗口失去焦点，地图已经安全遮盖。",
  });
  const directionMeta = Object.freeze({
    up: Object.freeze({ arrow: "↑", label: "上", aria: "向上走一格" }),
    right: Object.freeze({ arrow: "→", label: "右", aria: "向右走一格" }),
    down: Object.freeze({ arrow: "↓", label: "下", aria: "向下走一格" }),
    left: Object.freeze({ arrow: "←", label: "左", aria: "向左走一格" }),
  });
  const kindLabels = Object.freeze({
    void: "雾外",
    wall: "山墙",
    floor: "道路",
    landmark: "地标",
    goal: "终点",
    player: "当前位置",
  });

  let state = logic.createInitialState(config);
  let view = logic.getPublicView(state);
  let frameId = null;
  let lastFrame = null;
  let accumulatorMs = 0;
  let lastCountdownSecond = null;
  let knownLandmarks = Object.create(null);

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

  function phaseHeading(text) {
    const heading = element("h2", "phase-title", text);
    heading.id = "phase-heading";
    heading.tabIndex = -1;
    return heading;
  }

  function actionButton(label, action, focusKey, className) {
    const button = element("button", className || "primary-action", label);
    button.type = "button";
    button.dataset.focusKey = focusKey;
    button.addEventListener("click", () => dispatch(action));
    return button;
  }

  function activeFocusKey() {
    const active = document.activeElement;
    return active instanceof HTMLElement ? active.dataset.focusKey || null : null;
  }

  function announce(message) {
    liveStatus.replaceChildren();
    if (message) liveStatus.append(document.createTextNode(message));
  }

  function seatOtherThan(name) {
    const seats = logic.ACTIVE_CONFIG.seats;
    return seats[0] === name ? seats[1] : seats[0];
  }

  function updateRoundStatus() {
    roundStatus.replaceChildren();
    if (view.phase === "intro") {
      roundStatus.append(element("span", "", view.rule));
      return;
    }
    if (view.phase === "complete") {
      roundStatus.append(element("span", "", "4 段雾路，都走到了灯下"));
      return;
    }

    const line = element("div", "status-line");
    const roundNumber = view.roundNumber || 1;
    const title = view.title || (view.summary && view.summary.title) || "";
    line.append(element("span", "", `第 ${roundNumber} / 4 段 · ${title}`));

    let navigatorName = view.navigatorName;
    let driverName = view.driverName;
    if (view.phase === "driving") navigatorName = seatOtherThan(driverName);
    if (view.phase === "round-result") {
      navigatorName = view.summary.navigatorName;
      driverName = view.summary.driverName;
    }
    if (navigatorName && driverName) {
      const roles = element("span", "");
      append(roles, [
        document.createTextNode("领航："),
        element("strong", "", navigatorName),
        document.createTextNode(` · 驾驶：${driverName}`),
      ]);
      line.append(roles);
    }
    roundStatus.append(line);
  }

  function rolePair(navigatorName, driverName) {
    const pair = element("div", "role-pair");
    const navigator = element("div", "role-card");
    append(navigator, [element("span", "", "领航"), element("strong", "", navigatorName)]);
    const driver = element("div", "role-card");
    append(driver, [element("span", "", "驾驶"), element("strong", "", driverName)]);
    append(pair, [navigator, driver]);
    return pair;
  }

  function buildIntro() {
    const panel = element("section", "phase-panel");
    const heading = phaseHeading("看图的人不碰方向，走路的人不看全图。");
    const copy = element("p", "phase-copy", "你记住整条路，我只看见脚边。");
    const pair = rolePair(view.seats[0], view.seats[1]);
    const start = actionButton("开始第一段雾路", { type: "START" }, "phase-primary");
    append(panel, [heading, copy, pair, start]);
    return panel;
  }

  function pointKey(point) {
    return `${point[0]},${point[1]}`;
  }

  function routeSegments(cell, path, pathSet) {
    const container = element("span", "route-lines");
    container.setAttribute("aria-hidden", "true");
    const directions = [
      [0, -1, "up"],
      [1, 0, "right"],
      [0, 1, "down"],
      [-1, 0, "left"],
    ];
    const index = path.findIndex((point) => point[0] === cell.x && point[1] === cell.y);
    if (index < 0) return null;
    directions.forEach(([dx, dy, name]) => {
      const adjacentKey = `${cell.x + dx},${cell.y + dy}`;
      const previous = index > 0 ? pointKey(path[index - 1]) : null;
      const next = index < path.length - 1 ? pointKey(path[index + 1]) : null;
      if (pathSet.has(adjacentKey) && (adjacentKey === previous || adjacentKey === next)) {
        container.append(element("span", `route-segment ${name}`));
      }
    });
    return container;
  }

  function navigatorAria(cell) {
    if (cell.kind === "wall") return "山墙，不可通行";
    if (cell.kind === "hazard") return "雾陷阱，不要进入";
    if (cell.label) return cell.label;
    return "安全小路";
  }

  function buildNavigatorMap() {
    const paper = element("section", "map-paper");
    const heading = phaseHeading(`第 ${view.roundNumber} / 4 段 · ${view.title}`);
    const grid = element("ol", "navigator-grid");
    grid.setAttribute("aria-label", "领航员完整地图，包含安全路线、地标、终点和雾陷阱");
    const pathSet = new Set(view.safePath.map(pointKey));

    view.grid.forEach((cell) => {
      const item = element("li", `navigator-cell ${cell.kind}${pathSet.has(`${cell.x},${cell.y}`) ? " path" : ""}`);
      item.setAttribute("aria-label", navigatorAria(cell));
      const lines = routeSegments(cell, view.safePath, pathSet);
      if (lines) item.append(lines);
      if (cell.symbol) item.append(element("span", "cell-symbol", cell.symbol));
      if (cell.label) item.append(element("span", "cell-label", cell.label));
      grid.append(item);
    });

    const legend = element("p", "map-legend");
    const landmarks = view.grid.filter((cell) => cell.kind === "landmark");
    append(legend, [
      element("span", "", "— 安全路"),
      element("span", "", "▲ 山墙"),
      element("span", "", "× 雾陷阱"),
      ...landmarks.map((cell) => element("span", "", `${cell.symbol} ${cell.label}`)),
    ]);
    append(paper, [heading, grid, legend]);
    return paper;
  }

  function updateCountdown(nextView) {
    const ring = stage.querySelector(".countdown-ring");
    const number = stage.querySelector(".countdown-number");
    const label = stage.querySelector(".countdown-label");
    if (!ring || !number || !label || nextView.phase !== "briefing") return;
    ring.style.setProperty("--progress", String(state.briefingTicks / logic.BRIEFING_TICKS));
    number.textContent = String(nextView.secondsRemaining);
    label.textContent = `还剩 ${nextView.secondsRemaining} 秒`;
    ring.setAttribute("aria-valuenow", String(nextView.secondsRemaining));
    if (lastCountdownSecond !== nextView.secondsRemaining) {
      lastCountdownSecond = nextView.secondsRemaining;
      announce(`还剩 ${nextView.secondsRemaining} 秒`);
    }
  }

  function buildBriefing() {
    const layout = element("section", "briefing-layout");
    const map = buildNavigatorMap();
    const panel = element("aside", "briefing-panel");
    const ring = element("div", "countdown-ring");
    ring.setAttribute("role", "progressbar");
    ring.setAttribute("aria-label", "看图剩余时间");
    ring.setAttribute("aria-valuemin", "0");
    ring.setAttribute("aria-valuemax", "7");
    ring.setAttribute("aria-valuenow", String(view.secondsRemaining));
    ring.style.setProperty("--progress", String(state.briefingTicks / logic.BRIEFING_TICKS));
    ring.append(element("strong", "countdown-number", String(view.secondsRemaining)));
    const countdown = element("p", "countdown-label", `还剩 ${view.secondsRemaining} 秒`);
    const action = actionButton("我记住了，折好地图", { type: "COVER", reason: "manual" }, "phase-primary");
    const note = element("p", "auto-cover-note", "时间到会自动遮盖");
    append(panel, [ring, countdown, action, note]);
    append(layout, [map, panel]);
    lastCountdownSecond = view.secondsRemaining;
    return layout;
  }

  function buildCover() {
    const panel = element("section", "phase-panel folded-map");
    const heading = phaseHeading("把地图折好，交给要走路的人");
    const reason = element("p", "phase-copy", coverReasons[view.coverReason] || coverReasons.manual);
    const pair = rolePair(view.navigatorName, view.driverName);
    const ready = actionButton("我只看脚边，出发", { type: "DRIVER_READY" }, "phase-primary");
    append(panel, [heading, reason, pair, ready]);
    return panel;
  }

  function buildRetry() {
    const panel = element("section", "phase-panel folded-map");
    const heading = phaseHeading("没关系，我们再看一次");
    const pair = rolePair(view.navigatorName, view.driverName);
    const attempt = element("p", "attempt-line", `尝试 ${view.attempt}`);
    const review = actionButton("重新看 7 秒", { type: "REVIEW" }, "phase-primary");
    append(panel, [heading, pair, attempt, review]);
    return panel;
  }

  function rememberLandmarks(driverView) {
    driverView.cells.forEach((cell) => {
      if (cell.kind === "landmark" && cell.symbol && cell.label) knownLandmarks[cell.symbol] = cell.label;
    });
  }

  function driverCellAria(cell) {
    if (cell.kind === "landmark") return `地标，${cell.label}`;
    if (cell.kind === "wall") return "山墙，不可通行";
    if (cell.kind === "goal") return "终点灯";
    if (cell.kind === "player") return "当前位置";
    return kindLabels[cell.kind] || "道路";
  }

  function driverFeedback(driverView) {
    if (driverView.feedbackCode === "wall") return "前面走不通，问问领航员";
    if (driverView.feedbackCode === "landmark-A") {
      return `到了${knownLandmarks["◆"] || "地标"}旁，等领航员说下一步`;
    }
    if (driverView.feedbackCode === "landmark-B") {
      return `到了${knownLandmarks["✦"] || "地标"}旁，等领航员说下一步`;
    }
    return "每次只走一格，慢一点也没关系";
  }

  function buildDriverGrid() {
    rememberLandmarks(view);
    const paper = element("section", "driver-paper");
    const wrap = element("div", "driver-grid-wrap");
    const grid = element("div", "driver-grid");
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", "驾驶员脚边五乘五雾窗");
    view.cells.forEach((cell, index) => {
      const item = element("div", `driver-cell ${cell.kind}`);
      item.setAttribute("role", "gridcell");
      item.setAttribute("aria-rowindex", String(Math.floor(index / view.windowSize) + 1));
      item.setAttribute("aria-colindex", String((index % view.windowSize) + 1));
      item.setAttribute("aria-label", driverCellAria(cell));
      if (cell.kind === "player") {
        append(item, [
          element("span", "cell-symbol", "● · ⌑"),
          element("span", "cell-label", "当前位置"),
        ]);
      } else {
        if (cell.symbol) item.append(element("span", "cell-symbol", cell.symbol));
        if (cell.label && ["landmark", "goal"].includes(cell.kind)) item.append(element("span", "cell-label", cell.label));
      }
      grid.append(item);
    });
    wrap.append(grid);
    const feedback = element("p", "driver-feedback", driverFeedback(view));
    const stats = element("p", "driver-stats", `步数 ${String(view.steps).padStart(2, "0")} · 尝试 ${view.attempts} · 撞墙 ${view.bumps}`);
    append(paper, [wrap, feedback, stats]);
    return paper;
  }

  function buildDirectionPad() {
    const pad = element("div", "direction-pad");
    pad.setAttribute("aria-label", "每次移动一格");
    ["up", "left", "down", "right"].forEach((direction) => {
      const meta = directionMeta[direction];
      const button = actionButton("", { type: "MOVE", direction }, `direction-${direction}`, "direction-button");
      button.dataset.direction = direction;
      button.setAttribute("aria-label", meta.aria);
      append(button, [
        element("span", "direction-arrow", meta.arrow),
        element("span", "direction-label", meta.label),
      ]);
      pad.append(button);
    });
    return pad;
  }

  function buildDriving() {
    const layout = element("section", "driving-layout");
    const map = buildDriverGrid();
    const side = element("aside", "driver-side");
    const heading = phaseHeading(`第 ${view.roundNumber} / 4 段 · ${view.title}`);
    const copy = element("p", "phase-copy", "每次只走一格，慢一点也没关系");
    append(side, [heading, copy]);
    append(layout, [map, side]);
    controls.append(buildDirectionPad());
    return layout;
  }

  function summaryMetric(label, value) {
    const item = element("li", "");
    append(item, [element("span", "", label), element("strong", "", String(value))]);
    return item;
  }

  function buildRoundResult() {
    const panel = element("section", "phase-panel result-paper");
    const heading = phaseHeading("这一段，走到了灯下");
    const copy = element("p", "phase-copy", `${view.summary.title} · 领航：${view.summary.navigatorName} · 驾驶：${view.summary.driverName}`);
    const summary = element("ul", "summary-list");
    append(summary, [
      summaryMetric("步数", view.summary.steps),
      summaryMetric("尝试", view.summary.attempts),
      summaryMetric("撞墙", view.summary.bumps),
    ]);
    const swap = element("p", "phase-copy", `领航：${view.nextNavigatorName} · 驾驶：${view.nextDriverName}`);
    const next = actionButton("交换角色，走下一段", { type: "NEXT" }, "phase-primary");
    append(panel, [heading, copy, summary, swap, next]);
    return panel;
  }

  function completionPayload() {
    return {
      seats: logic.ACTIVE_CONFIG.seats.slice(),
      rounds: view.summaries.map((summary) => ({
        title: summary.title,
        navigatorName: summary.navigatorName,
        driverName: summary.driverName,
        steps: summary.steps,
        attempts: summary.attempts,
        bumps: summary.bumps,
      })),
    };
  }

  function buildComplete() {
    const layout = element("section", "completion-layout");
    const ledger = element("article", "completion-ledger");
    const heading = phaseHeading("4 段雾路，都走到了灯下");
    const summaries = element("ol", "completion-list");
    view.summaries.forEach((summary) => {
      const row = element("li", "completion-row");
      append(row, [
        element("strong", "", summary.title),
        element("span", "round-role", `领航 ${summary.navigatorName}`),
        element("span", "round-role", `驾驶 ${summary.driverName}`),
        element("span", "", `步数 ${summary.steps}`),
        element("span", "", `尝试 ${summary.attempts}`),
      ]);
      summaries.append(row);
    });
    const balance = element("div", "role-balance");
    view.roleCounts.forEach((role) => {
      balance.append(element("p", "", `${role.name}：领航 ${role.navigator} 次 · 驾驶 ${role.driver} 次`));
    });
    append(ledger, [heading, summaries, balance]);

    const note = element("aside", "completion-note");
    const quote = element("blockquote", "", logic.resolveCompletionNote(completionPayload(), config));
    note.append(quote);
    append(layout, [ledger, note]);
    return layout;
  }

  function buildCompletionActions() {
    const actions = element("div", "completion-actions");
    const restart = actionButton("再走四段雾路", { type: "RESTART" }, "phase-primary");
    const catalog = element("a", "catalog-link", "返回体验目录");
    catalog.href = "../../../index.html#co-op";
    append(actions, [restart, catalog]);
    return actions;
  }

  function focusAfterRender(previousPhase, focusKey) {
    if (previousPhase === view.phase && focusKey) {
      const target = controls.querySelector(`[data-focus-key="${focusKey}"]`) || stage.querySelector(`[data-focus-key="${focusKey}"]`);
      if (target) target.focus({ preventScroll: true });
      return;
    }
    if (previousPhase && previousPhase !== view.phase) {
      if (view.phase === "driving") {
        roundStatus.focus({ preventScroll: true });
        return;
      }
      const heading = stage.querySelector("#phase-heading");
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  function render(previousPhase, focusKey) {
    controls.replaceChildren();
    updateRoundStatus();
    let content;
    if (view.phase === "intro") content = buildIntro();
    else if (view.phase === "briefing") content = buildBriefing();
    else if (view.phase === "cover") content = buildCover();
    else if (view.phase === "driving") content = buildDriving();
    else if (view.phase === "retry") content = buildRetry();
    else if (view.phase === "round-result") content = buildRoundResult();
    else content = buildComplete();

    stage.replaceChildren(content);
    if (view.phase === "complete") stage.append(buildCompletionActions());
    focusAfterRender(previousPhase, focusKey);
    syncAnimationFrame();
  }

  function phaseAnnouncement(previousPhase) {
    if (view.phase === "briefing") return `领航：${view.navigatorName}，还剩 ${view.secondsRemaining} 秒`;
    if (view.phase === "cover") return coverReasons[view.coverReason] || coverReasons.manual;
    if (view.phase === "driving") return `驾驶：${view.driverName}，每次只走一格`;
    if (view.phase === "retry") return "没关系，我们再看一次";
    if (view.phase === "round-result") return "这一段，走到了灯下";
    if (view.phase === "complete") return "4 段雾路，都走到了灯下";
    if (previousPhase) return "看图的人不碰方向，走路的人不看全图。";
    return "";
  }

  function feedbackAnnouncement(previousView) {
    if (view.phase !== "driving" || previousView.phase !== "driving") return "";
    if (view.feedbackCode === "wall" && view.bumps !== previousView.bumps) return "前面走不通，问问领航员";
    if (view.feedbackCode === "landmark-A") return driverFeedback(view);
    if (view.feedbackCode === "landmark-B") return driverFeedback(view);
    return "";
  }

  function dispatch(action) {
    const previousState = state;
    const previousView = view;
    const previousPhase = view.phase;
    const focusKey = activeFocusKey();
    const nextState = logic.reduce(state, action);
    if (nextState === previousState) return;
    state = nextState;
    view = logic.getPublicView(state);
    if (previousPhase !== view.phase) {
      accumulatorMs = 0;
      lastFrame = null;
      lastCountdownSecond = null;
      announce("");
      render(previousPhase, null);
      announce(phaseAnnouncement(previousPhase));
      return;
    }
    render(previousPhase, focusKey);
    const feedback = feedbackAnnouncement(previousView);
    if (feedback) announce(feedback);
  }

  function frame(timestamp) {
    frameId = null;
    if (state.phase !== "briefing") return;
    if (lastFrame === null) {
      lastFrame = timestamp;
      syncAnimationFrame();
      return;
    }
    const frameDelta = Math.min(100, Math.max(0, timestamp - lastFrame));
    lastFrame = timestamp;
    accumulatorMs += frameDelta;
    const tickMs = 1000 / logic.TICKS_PER_SECOND;
    const ticks = Math.min(3, Math.floor(accumulatorMs / tickMs));
    if (ticks > 0) {
      accumulatorMs -= ticks * tickMs;
      const previousPhase = state.phase;
      state = logic.tickBriefing(state, ticks);
      view = logic.getPublicView(state);
      if (state.phase !== previousPhase) {
        accumulatorMs = 0;
        lastFrame = null;
        lastCountdownSecond = null;
        render(previousPhase, null);
        announce(phaseAnnouncement(previousPhase));
        return;
      }
      updateCountdown(view);
    }
    syncAnimationFrame();
  }

  function syncAnimationFrame() {
    if (state.phase === "briefing" && frameId === null && !document.hidden) {
      frameId = requestAnimationFrame(frame);
    } else if (state.phase !== "briefing" && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function coverForLifecycle(type) {
    if (state.phase !== "briefing") return;
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    accumulatorMs = 0;
    lastFrame = null;
    dispatch({ type });
  }

  document.addEventListener("keydown", (event) => {
    const action = logic.classifyDirectionKey(state, event);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) coverForLifecycle("HIDE");
  });

  window.addEventListener("blur", () => coverForLifecycle("BLUR"));

  render(null, null);
})();
