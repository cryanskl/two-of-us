(function () {
  "use strict";

  const logic = globalThis.TogetherZipperLogic;
  const fileConfig = globalThis.TOGETHER_ZIPPER_CONFIG || {};
  const root = document.querySelector("#zipper-app");
  const stage = document.querySelector("#stage");
  const headerProgress = document.querySelector("#header-progress");
  const liveStatus = document.querySelector("#live-status");

  if (!logic || !root || !stage || !headerProgress || !liveStatus) {
    if (stage) stage.textContent = "把两边，拉成我们：运行文件未完整加载。";
    return;
  }

  const createState = logic.createInitialState;
  const reduceState = logic.reduceTogetherZipper;
  if (typeof createState !== "function" || typeof reduceState !== "function" || typeof logic.getPublicView !== "function") {
    stage.textContent = "把两边，拉成我们：逻辑接口不可用。";
    return;
  }

  const safeConfig = typeof logic.normalizeConfig === "function" ? logic.normalizeConfig(fileConfig) : fileConfig;
  let compatClicks = new WeakSet();
  const clockPhases = new Set(["playing", "tooth-result", "jammed"]);
  const feedbackReasons = Object.freeze({
    "early-left": "还没到这一齿，先等一等彼此。",
    "early-right": "还没到这一齿，先等一等彼此。",
    apart: "听见彼此了，再靠近同一拍。",
    "missed-left": "左边还没有拉住。",
    "missed-right": "右边还没有拉住。",
    "missed-both": "这一齿还在等我们。",
  });
  const sectionHints = Object.freeze({
    "first-stitch": "这一段的亮窗宽一些，先让两边找到彼此。",
    "through-rain": "这一段要再近一点，听见对方再拉。",
    "coming-home": "最后一段，靠近同一拍把两边带回家。",
  });
  const announcementMessages = Object.freeze({
    intro: "准备一起拉好十五颗齿。",
    "section-intro": "双方准备开始这一段。",
    playing: "新的一齿开始，等公共窗口亮起。",
    "window-open": "公共窗口亮起，可以一起拉了。",
    "left-ready": "左边已经拉住，等右边。",
    "right-ready": "右边已经拉住，等左边。",
    "tooth-success": "这一齿，合上了。",
    "section-complete": "这一段，被我们拉到了一起。",
    complete: "十五颗齿全部合上。",
  });

  let state = createState();
  let view = logic.getPublicView(state);
  let renderedPhase = "";
  let announcedKey = "";
  let rafId = 0;
  let frameRunning = false;
  let lastTimestamp = null;
  let accumulatorMs = 0;

  stage.addEventListener("click", handleClick);
  stage.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibility);
  globalThis.addEventListener("blur", stopClock);
  globalThis.addEventListener("focus", startClock);
  globalThis.addEventListener("pagehide", stopClock);

  render(true);

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button || !stage.contains(button)) return;
    if (button.hasAttribute("data-seat")) {
      if (compatClicks.has(button)) {
        compatClicks.delete(button);
        return;
      }
      dispatch({ type: "PULL", seat: Number(button.dataset.seat) });
      return;
    }
    const action = button.dataset.action;
    if (action === "start") dispatch({ type: "START" }, true);
    if (action === "begin-section") dispatch({ type: "BEGIN_SECTION" }, true);
    if (action === "next-section") dispatch({ type: "NEXT_SECTION" }, true);
    if (action === "restart") dispatch({ type: "RESTART" }, true);
  }

  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const button = event.target.closest("button[data-seat]");
    if (!button || !stage.contains(button) || button.disabled || view.phase !== "playing") return;
    event.preventDefault();
    button.focus({ preventScroll: true });
    compatClicks.add(button);
    dispatch({ type: "PULL", seat: Number(button.dataset.seat) });
  }

  function handleKeyDown(event) {
    if (view.phase !== "playing" || isEditable(event.target) || typeof logic.classifyPullKey !== "function") return;
    const action = logic.classifyPullKey(event);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function handleVisibility() {
    if (document.hidden) stopClock();
    else startClock();
  }

  function dispatch(action, forceFocus) {
    const previous = state;
    const previousPhase = view.phase;
    state = reduceState(state, action);
    if (state === previous) return;
    view = logic.getPublicView(state);
    const phaseChanged = view.phase !== previousPhase;
    render(Boolean(forceFocus || phaseChanged));
  }

  function render(shouldFocus) {
    const phaseChanged = renderedPhase !== view.phase;
    if (phaseChanged) {
      renderedPhase = view.phase;
      stage.replaceChildren(buildPhase(view));
    } else {
      patchLivePhase(view);
    }
    renderHeader(view);
    announce(view);
    syncClock();
    if (phaseChanged || shouldFocus) scheduleFocus();
  }

  function buildPhase(current) {
    if (current.phase === "intro") return buildIntro(current);
    if (current.phase === "section-intro") return buildSectionIntro(current);
    if (current.phase === "playing") return buildPlaying(current, null);
    if (current.phase === "tooth-result") return buildPlaying(current, "success");
    if (current.phase === "jammed") return buildPlaying(current, "jammed");
    if (current.phase === "section-result") return buildSectionResult(current);
    return buildComplete(current);
  }

  function buildIntro(current) {
    const wrapper = el("div", "stage-view paper-layout");
    const card = el("section", "paper-card");
    card.append(
      el("p", "phase-kicker", "同一条拉链 · 两个同样重要的位置"),
      el("h2", "", "等到彼此都在附近，一起拉。"),
      el("p", "", "光点进入亮起的窗口后，两边各拉一次。相隔太远也没关系，这一齿会回到起点等我们。"),
      buildSeatCards(),
      actionButton("拿好两边", "start")
    );
    const preview = el("div", "fabric-preview");
    preview.setAttribute("aria-label", "靛蓝与酒红两块布还没有被中央拉链合拢");
    wrapper.append(card, preview);
    return wrapper;
  }

  function buildSeatCards() {
    const cards = el("div", "seat-cards");
    const left = el("div", "seat-card left");
    const right = el("div", "seat-card right");
    left.append(el("strong", "", `${safeSeat(0)} · 左边`), seatKeyLine("F", "拉这一边"));
    right.append(el("strong", "", `${safeSeat(1)} · 右边`), seatKeyLine("J", "拉这一边"));
    cards.append(left, right);
    return cards;
  }

  function seatKeyLine(key, text) {
    const line = el("span");
    line.append(el("span", "keycap", key), document.createTextNode(text));
    return line;
  }

  function buildSectionIntro(current) {
    const wrapper = el("div", "stage-view paper-layout");
    const card = el("section", "paper-card result-card");
    card.append(
      el("p", "phase-kicker", `第 ${current.section.index + 1} / ${current.section.total} 段`),
      el("h2", "", current.section.title),
      el("p", "", current.section.note),
      el("p", "", `这一段有 ${current.section.toothCount} 颗齿。${sectionHints[current.section.id] || "等亮窗出现，再一起拉。"}`),
      buildCompletedStamps(current.completedSections),
      actionButton("开始这一段", "begin-section")
    );
    wrapper.append(card);
    return wrapper;
  }

  function buildCompletedStamps(sections) {
    const stamps = el("div", "completed-stamps");
    if (!sections.length) stamps.append(el("span", "", "两边已经拿好"));
    sections.forEach((section) => stamps.append(el("span", "", `✓ ${section.title}`)));
    return stamps;
  }

  function buildPlaying(current, feedback) {
    const wrapper = el("div", "stage-view play-layout");
    const board = el("section", "zipper-stage");
    board.setAttribute("aria-label", "十五齿同心拉链与公共时间轨");
    board.append(el("div", "fabric-side left"), buildZipperCore(current), el("div", "fabric-side right"));
    if (feedback) board.append(buildFeedback(current, feedback));
    wrapper.append(board);
    if (!feedback) wrapper.append(buildControls(current));
    return wrapper;
  }

  function buildZipperCore(current) {
    const core = el("div", "zipper-core");
    const meta = el("div", "stage-meta");
    meta.append(
      el("span", "", `第 ${current.section.index + 1} 段`),
      el("span", "", `第 ${current.tooth.number} / ${current.tooth.totalInSection} 齿`),
      el("span", "", `第 ${current.attempt} 次尝试`)
    );
    const teeth = el("div", "teeth-wrap");
    teeth.append(buildTeeth(current), buildPullBadge(current));
    core.append(meta, teeth, buildTimingPanel(current));
    return core;
  }

  function buildTeeth(current) {
    const list = el("ol", "teeth-list");
    list.setAttribute("aria-label", `共 ${current.tooth.total} 颗齿，已完成 ${current.tooth.completedTotal} 颗`);
    for (let index = 0; index < current.tooth.total; index += 1) {
      const item = el("li", "zip-tooth");
      const complete = index < current.tooth.completedTotal;
      const active = index === current.tooth.completedTotal && current.phase !== "complete";
      if (complete) item.classList.add("is-complete");
      if (active) item.classList.add("is-current");
      if (index === 4 || index === 9) item.classList.add("section-start");
      if (index === 0 || index === 4 || index === 9) {
        item.append(el("span", "tooth-label", index === 0 ? "4" : index === 4 ? "5" : "6"));
      }
      item.append(el("span", "sr-only", `第 ${index + 1} 齿，${complete ? "已完成" : active ? "当前" : "未完成"}`));
      list.append(item);
    }
    return list;
  }

  function buildPullBadge(current) {
    const badge = el("div", "pull-badge");
    badge.style.setProperty("--pull-position", `${Math.min(94, current.tooth.completedTotal / Math.max(1, current.tooth.total - 1) * 94)}%`);
    const image = document.createElement("img");
    image.src = "./assets/brass-zipper-pull.png";
    image.alt = "";
    image.width = 1254;
    image.height = 1254;
    image.addEventListener("error", () => image.remove(), { once: true });
    badge.append(image, el("span", "sr-only", `当前在第 ${Math.min(current.tooth.completedTotal + 1, current.tooth.total)} 齿`));
    return badge;
  }

  function buildTimingPanel(current) {
    const panel = el("div", "timing-panel");
    const track = el("div", "timing-track");
    track.id = "timing-track";
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", "一条公共时间轨，亮框是两边共同的拉动窗口");
    const windowMark = el("span", "timing-window");
    windowMark.id = "timing-window";
    const dot = el("span", "timing-dot");
    dot.id = "timing-dot";
    track.append(windowMark, dot);
    const fact = el("p", "timing-fact");
    fact.id = "timing-fact";
    panel.append(track, fact);
    patchTiming(panel, current);
    return panel;
  }

  function buildControls(current) {
    const controls = el("section", "seat-controls");
    controls.setAttribute("aria-label", "左右双席控制");
    controls.append(buildSeatControl(current, 0), buildSeatControl(current, 1));
    return controls;
  }

  function buildSeatControl(current, seat) {
    const side = seat === 0 ? "left" : "right";
    const key = seat === 0 ? "F" : "J";
    const ready = seat === 0 ? current.pulls.left === "ready" : current.pulls.right === "ready";
    const panel = el("div", `seat-control ${side}`);
    const copy = el("div");
    copy.append(
      el("h2", "", `${seat === 0 ? "左边" : "右边"} · ${safeSeat(seat)}`),
      el("p", "seat-state", `${ready ? "● 已经拉住" : "○ 等这一边"}`)
    );
    const button = el("button", `seat-pull ${side}`);
    button.type = "button";
    button.dataset.seat = String(seat);
    button.dataset.focus = seat === 0 ? "true" : "false";
    button.disabled = ready || !current.controls.canPull;
    button.setAttribute("aria-pressed", String(ready));
    button.append(el("span", "keycap", key), document.createTextNode(ready ? "已经拉住" : "拉这一边"));
    panel.append(copy, button);
    return panel;
  }

  function buildFeedback(current, kind) {
    const panel = el("div", "feedback-panel");
    const copy = el("div");
    const heading = el("h2", "", kind === "success" ? "这一齿，合上了。" : "这一齿，先等等我们。");
    heading.tabIndex = -1;
    heading.dataset.focus = "true";
    copy.append(heading);
    if (kind === "success") {
      copy.append(el("span", "feedback-symbol", "━ ◆ ━"), el("p", "", "两边在同一个窗口里相遇，下一齿马上就来。"));
    } else {
      copy.append(
        el("span", "feedback-symbol", "┈ × ┈"),
        el("p", "", feedbackReasons[current.lastResult && current.lastResult.reason] || "这颗齿会自己回到起点。"),
        buildJamSeatFacts(current.lastResult),
        el("p", "", "这颗齿会自己回到起点，已经合好的都还在。")
      );
    }
    const line = el("div", "feedback-line");
    const fill = el("span");
    fill.id = "feedback-progress";
    fill.style.setProperty("--feedback-progress", `${current.feedbackProgressPermille / 10}%`);
    line.append(fill);
    copy.append(line);
    panel.append(copy);
    return panel;
  }

  function buildJamSeatFacts(result) {
    const facts = el("div", "jam-seat-facts");
    const leftReady = Boolean(result && result.leftPullTick !== null);
    const rightReady = Boolean(result && result.rightPullTick !== null);
    facts.append(
      el("span", "", `${leftReady ? "●" : "○"} 左边${leftReady ? "已拉住" : "未拉住"}`),
      el("span", "", `${rightReady ? "●" : "○"} 右边${rightReady ? "已拉住" : "未拉住"}`)
    );
    return facts;
  }

  function buildSectionResult(current) {
    const wrapper = el("div", "stage-view paper-layout");
    const record = current.completedSections[current.completedSections.length - 1];
    const card = el("section", "paper-card result-card");
    const heading = el("h2", "", "这一段，被我们拉到了一起。");
    heading.tabIndex = -1;
    heading.dataset.focus = "true";
    card.append(el("p", "phase-kicker", record ? record.title : current.section.title), heading);
    const stats = el("div", "result-summary");
    stats.append(
      resultStat(record ? record.teeth : current.section.toothCount, "颗齿"),
      resultStat(record ? record.attempts : current.totalAttempts, "共同尝试"),
      resultStat(record ? record.jams : current.jams, "重新靠近")
    );
    card.append(
      stats,
      el("p", "", `我们用 ${record ? record.attempts : current.totalAttempts} 次把这一段拉好。`),
      buildQuietRail(current.tooth.completedTotal, current.tooth.total),
      actionButton(current.section.index < current.section.total - 1 ? "看看下一段" : "收好这条拉链", "next-section")
    );
    wrapper.append(card);
    return wrapper;
  }

  function buildQuietRail(completed, total) {
    const rail = el("div", "quiet-teeth");
    rail.setAttribute("aria-label", `十五颗链齿中已完成 ${completed} 颗`);
    for (let index = 0; index < total; index += 1) {
      const tooth = el("span", index < completed ? "is-complete" : "");
      tooth.append(el("span", "sr-only", index < completed ? "已完成" : "未完成"));
      rail.append(tooth);
    }
    return rail;
  }

  function resultStat(value, label) {
    const stat = el("div", "result-stat");
    stat.append(el("strong", "", String(value)), el("span", "", label));
    return stat;
  }

  function buildComplete(current) {
    const wrapper = el("div", "stage-view complete-layout");
    const figure = el("div", "keepsake-frame");
    const image = document.createElement("img");
    image.src = "./assets/completed-keepsake.png";
    image.alt = "靛蓝和酒红布面被同一条拉链合好，双色针脚汇成一条线";
    image.width = 1536;
    image.height = 1024;
    image.addEventListener("error", () => figure.classList.add("is-broken"), { once: true });
    figure.append(image, el("div", "keepsake-fallback"));

    const card = el("section", "complete-copy");
    const heading = el("h2", "", "原来两边，真的可以慢慢变成我们。");
    heading.tabIndex = -1;
    heading.dataset.focus = "true";
    card.append(heading, el("p", "", `${current.tooth.total} 颗齿都合上 · 一共尝试 ${current.totalAttempts} 次`));
    const records = el("ul", "section-records");
    current.completedSections.forEach((section) => {
      const item = el("li");
      item.append(el("strong", "", section.title), el("span", "", `${section.attempts} 次 · 卡住 ${section.jams} 次`));
      records.append(item);
    });
    card.append(records, el("p", "completion-note", completionNote(current)), actionButton("再拉一次", "restart"));
    const directory = el("a", "", "返回体验目录");
    directory.href = "../../../index.html";
    card.append(directory);
    wrapper.append(figure, card);
    return wrapper;
  }

  function completionNote() {
    const summary = logic.completionSummary(state, safeConfig);
    return logic.resolveCompletionNote(safeConfig.composeCompletionNote, summary);
  }

  function patchLivePhase(current) {
    if (current.phase === "playing") {
      const timingPanel = document.querySelector(".timing-panel");
      if (timingPanel) patchTiming(timingPanel, current);
      patchSeat(0, current.pulls.left === "ready", current.controls.canPull);
      patchSeat(1, current.pulls.right === "ready", current.controls.canPull);
    }
    if (current.phase === "tooth-result" || current.phase === "jammed") {
      const fill = document.querySelector("#feedback-progress");
      if (fill) fill.style.setProperty("--feedback-progress", `${current.feedbackProgressPermille / 10}%`);
    }
  }

  function patchTiming(panel, current) {
    const track = panel.querySelector("#timing-track");
    const windowMark = panel.querySelector("#timing-window");
    const dot = panel.querySelector("#timing-dot");
    const fact = panel.querySelector("#timing-fact");
    if (!track || !windowMark || !dot || !fact) return;
    const end = Math.max(1, current.timing.trackEndTick);
    const startPercent = current.timing.windowStart / end * 100;
    const widthPercent = (current.timing.windowEnd - current.timing.windowStart) / end * 100;
    windowMark.style.setProperty("--window-start", `${startPercent}%`);
    windowMark.style.setProperty("--window-width", `${widthPercent}%`);
    dot.style.setProperty("--track-progress", `${current.timing.progressPermille / 10}%`);
    fact.textContent = timingFact(current);
  }

  function timingFact(current) {
    if (current.pulls.left === "ready" && current.pulls.right !== "ready") return "左边已拉 · 等右边";
    if (current.pulls.right === "ready" && current.pulls.left !== "ready") return "右边已拉 · 等左边";
    return current.timing.isWindowOpen ? "〔 可以拉了 〕" : "窗口还没亮";
  }

  function patchSeat(seat, ready, canPull) {
    const button = stage.querySelector(`button[data-seat="${seat}"]`);
    if (!button) return;
    button.disabled = ready || !canPull;
    button.setAttribute("aria-pressed", String(ready));
    const stateText = button.closest(".seat-control").querySelector(".seat-state");
    if (stateText) stateText.textContent = ready ? "● 已经拉住" : "○ 等这一边";
    const textNode = button.lastChild;
    if (textNode) textNode.textContent = ready ? "已经拉住" : "拉这一边";
  }

  function renderHeader(current) {
    if (current.phase === "intro") {
      headerProgress.replaceChildren(el("span", "", "三段 · 十五齿"), el("span", "", "等同一拍"));
      return;
    }
    headerProgress.replaceChildren(
      el("span", "", `段落 ${Math.min(current.section.index + 1, current.section.total)} / ${current.section.total}`),
      el("span", "", `链齿 ${current.tooth.completedTotal} / ${current.tooth.total}`)
    );
  }

  function announce(current) {
    const reason = current.lastResult && current.lastResult.reason;
    const code = current.announcementCode;
    const key = `${code}:${current.section.index}:${current.tooth.completedTotal}:${current.attempt}`;
    if (key === announcedKey) return;
    announcedKey = key;
    if (code === "section-intro") liveStatus.textContent = `准备开始${current.section.title}。`;
    else if (code.startsWith("jam-")) liveStatus.textContent = feedbackReasons[reason] || "这一齿会回到起点。";
    else liveStatus.textContent = announcementMessages[code] || "两边继续一起拉。";
  }

  function syncClock() {
    if (clockPhases.has(view.phase) && !document.hidden && document.hasFocus()) startClock();
    else stopClock();
  }

  function startClock() {
    if (!clockPhases.has(view.phase) || document.hidden || !document.hasFocus() || rafId || frameRunning) return;
    lastTimestamp = null;
    accumulatorMs = 0;
    rafId = globalThis.requestAnimationFrame(frame);
  }

  function stopClock() {
    if (rafId) globalThis.cancelAnimationFrame(rafId);
    rafId = 0;
    lastTimestamp = null;
    accumulatorMs = 0;
    compatClicks = new WeakSet();
  }

  function frame(timestamp) {
    rafId = 0;
    frameRunning = true;
    if (!clockPhases.has(view.phase) || document.hidden || !document.hasFocus()) {
      lastTimestamp = null;
      accumulatorMs = 0;
      frameRunning = false;
      return;
    }
    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      frameRunning = false;
      rafId = globalThis.requestAnimationFrame(frame);
      return;
    }
    const tickMs = logic.TICK_MS || 1000 / (logic.TICKS_PER_SECOND || 30);
    accumulatorMs += Math.max(0, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    const available = Math.floor(accumulatorMs / tickMs);
    if (available > 0) {
      const ticks = Math.min(logic.MAX_STEP_TICKS || 5, available);
      accumulatorMs %= tickMs;
      dispatch({ type: "STEP", ticks });
    }
    frameRunning = false;
    if (clockPhases.has(view.phase) && !rafId) rafId = globalThis.requestAnimationFrame(frame);
  }

  function scheduleFocus() {
    globalThis.requestAnimationFrame(() => {
      const target = stage.querySelector("[data-focus='true']:not(:disabled)") || stage.querySelector("[tabindex='-1']");
      if (target) target.focus({ preventScroll: true });
    });
  }

  function actionButton(label, action) {
    const button = el("button", "primary-action", label);
    button.type = "button";
    button.dataset.action = action;
    button.dataset.focus = "true";
    return button;
  }

  function safeSeat(index) {
    return safeConfig && Array.isArray(safeConfig.seats) && typeof safeConfig.seats[index] === "string"
      ? safeConfig.seats[index]
      : index === 0 ? "你" : "我";
  }

  function el(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
})();
