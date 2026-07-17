(function () {
  "use strict";

  const logic = globalThis.RIBBON_TUG_LOGIC;
  const STEP_MS = 1000 / 60;
  const MAX_CATCH_UP_STEPS = 5;
  const KNOT_TRAVEL_PERCENT = 38;
  const ACTIVE_PHASES = new Set(["countdown", "playing"]);
  const PULL_KEYS = new Set(["a", "l"]);

  const elements = {
    game: document.querySelector("#game"),
    statusText: document.querySelector("#status-text"),
    statusDetail: document.querySelector("#status-detail"),
    liveRegion: document.querySelector("#live-region"),
    ribbonMeter: document.querySelector("#ribbon-meter"),
    ribbonKnot: document.querySelector("#ribbon-knot"),
    leftScore: document.querySelector("#left-score"),
    rightScore: document.querySelector("#right-score"),
    roundNumber: document.querySelector("#round-number"),
    leftPull: document.querySelector("#left-pull"),
    rightPull: document.querySelector("#right-pull"),
    primaryAction: document.querySelector("#primary-action"),
    pauseButton: document.querySelector("#pause-button"),
  };

  const requiredMethods = [
    "createMatchState",
    "startRound",
    "advanceMatch",
    "pauseMatch",
    "resumeMatch",
    "resetMatch",
    "classifyPullKey",
  ];

  if (
    !logic
    || typeof window.requestAnimationFrame !== "function"
    || requiredMethods.some((name) => typeof logic[name] !== "function")
    || Object.values(elements).some((element) => !element)
  ) {
    renderUnavailable();
    return;
  }

  let match = logic.createMatchState();
  let accumulatorMs = 0;
  let lastFrameTime = null;
  let pendingLeftPulls = 0;
  let pendingRightPulls = 0;
  let lastAnnouncementKey = "";
  const heldKeys = new Set();
  const feedbackTimers = { left: null, right: null };

  elements.primaryAction.addEventListener("click", handlePrimaryAction);
  elements.pauseButton.addEventListener("click", handlePauseAction);
  elements.leftPull.addEventListener("click", () => enqueuePull("left"));
  elements.rightPull.addEventListener("click", () => enqueuePull("right"));
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => pauseFor("blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pauseFor("hidden");
  });

  render();
  window.requestAnimationFrame(runFrame);

  function runFrame(frameTime) {
    const elapsedMs = lastFrameTime === null ? 0 : Math.max(0, frameTime - lastFrameTime);
    lastFrameTime = frameTime;

    if (ACTIVE_PHASES.has(match.phase)) {
      accumulatorMs = Math.min(accumulatorMs + elapsedMs, STEP_MS * MAX_CATCH_UP_STEPS);
      let steps = 0;
      let drainedThisFrame = false;

      while (accumulatorMs + 0.001 >= STEP_MS && steps < MAX_CATCH_UP_STEPS) {
        const pulls = drainedThisFrame ? { leftPulls: 0, rightPulls: 0 } : drainPulls();
        drainedThisFrame = true;
        match = logic.advanceMatch(match, {
          elapsedMs: STEP_MS,
          leftPulls: pulls.leftPulls,
          rightPulls: pulls.rightPulls,
        });
        accumulatorMs = Math.max(0, accumulatorMs - STEP_MS);
        steps += 1;

        if (!ACTIVE_PHASES.has(match.phase)) {
          accumulatorMs = 0;
          discardPendingPulls();
          break;
        }
      }
    } else {
      accumulatorMs = 0;
    }

    render();
    window.requestAnimationFrame(runFrame);
  }

  function handlePrimaryAction() {
    if (match.phase === "idle" || match.phase === "round-end") {
      clearTransientInput();
      match = logic.startRound(match);
    } else if (match.phase === "match-end") {
      clearTransientInput();
      match = logic.resetMatch();
    }
    render();
  }

  function handlePauseAction() {
    if (ACTIVE_PHASES.has(match.phase)) {
      match = logic.pauseMatch(match, "manual");
      clearTransientInput();
    } else if (match.phase === "paused") {
      clearTransientInput();
      match = logic.resumeMatch(match);
    }
    render();
  }

  function pauseFor(reason) {
    if (ACTIVE_PHASES.has(match.phase)) match = logic.pauseMatch(match, reason);
    clearTransientInput();
    render();
  }

  function handleKeyDown(event) {
    const key = String(event.key || "").toLowerCase();
    if (!PULL_KEYS.has(key)) return;
    event.preventDefault();

    const side = logic.classifyPullKey({
      key: event.key,
      repeat: event.repeat,
      isHeld: heldKeys.has(key),
    });
    if (!side) return;

    heldKeys.add(key);
    enqueuePull(side);
  }

  function handleKeyUp(event) {
    const key = String(event.key || "").toLowerCase();
    if (!PULL_KEYS.has(key)) return;
    event.preventDefault();
    heldKeys.delete(key);
  }

  function enqueuePull(side) {
    if (match.phase !== "playing") return;
    if (side === "left") pendingLeftPulls += 1;
    else if (side === "right") pendingRightPulls += 1;
    else return;
    showPullFeedback(side);
  }

  function drainPulls() {
    const pulls = { leftPulls: pendingLeftPulls, rightPulls: pendingRightPulls };
    discardPendingPulls();
    return pulls;
  }

  function discardPendingPulls() {
    pendingLeftPulls = 0;
    pendingRightPulls = 0;
  }

  function clearTransientInput() {
    accumulatorMs = 0;
    lastFrameTime = null;
    discardPendingPulls();
    heldKeys.clear();
    clearPullFeedback("left");
    clearPullFeedback("right");
  }

  function showPullFeedback(side) {
    const button = side === "left" ? elements.leftPull : elements.rightPull;
    window.clearTimeout(feedbackTimers[side]);
    button.classList.remove("is-pulling");
    void button.offsetWidth;
    button.classList.add("is-pulling");
    feedbackTimers[side] = window.setTimeout(() => clearPullFeedback(side), 120);
  }

  function clearPullFeedback(side) {
    const button = side === "left" ? elements.leftPull : elements.rightPull;
    window.clearTimeout(feedbackTimers[side]);
    feedbackTimers[side] = null;
    button.classList.remove("is-pulling");
  }

  function render() {
    const position = clampPosition(match.position);
    const view = describeState(match);
    const round = Number.isInteger(match.roundNumber) && match.roundNumber > 0 ? match.roundNumber : 1;
    const canPull = match.phase === "playing";
    const canPause = ACTIVE_PHASES.has(match.phase) || match.phase === "paused";
    const canUsePrimary = match.phase === "idle" || match.phase === "round-end" || match.phase === "match-end";
    const winnerVisible = match.phase === "round-end" || match.phase === "match-end";

    elements.game.dataset.phase = match.phase;
    elements.game.classList.toggle("is-left-winner", winnerVisible && match.lastWinner === "left");
    elements.game.classList.toggle("is-right-winner", winnerVisible && match.lastWinner === "right");
    elements.statusText.textContent = view.title;
    elements.statusDetail.textContent = view.detail;
    elements.leftScore.textContent = String(match.leftScore);
    elements.rightScore.textContent = String(match.rightScore);
    elements.roundNumber.textContent = String(round);
    elements.leftPull.disabled = !canPull;
    elements.rightPull.disabled = !canPull;
    elements.primaryAction.disabled = !canUsePrimary;
    elements.primaryAction.textContent = view.primaryLabel;
    elements.pauseButton.disabled = !canPause;
    elements.pauseButton.textContent = match.phase === "paused" ? "继续比赛" : "暂停";
    elements.pauseButton.setAttribute("aria-pressed", String(match.phase === "paused"));

    elements.ribbonMeter.style.setProperty("--position", String(position));
    elements.ribbonMeter.style.setProperty("--travel", `${KNOT_TRAVEL_PERCENT}%`);
    elements.ribbonKnot.style.setProperty("--position", String(position));
    elements.ribbonKnot.style.left = `${50 + position * KNOT_TRAVEL_PERCENT}%`;
    elements.ribbonMeter.setAttribute("aria-valuemin", "-100");
    elements.ribbonMeter.setAttribute("aria-valuemax", "100");
    elements.ribbonMeter.setAttribute("aria-valuenow", String(Math.round(position * 100)));
    elements.ribbonMeter.setAttribute("aria-valuetext", describePosition(position));

    if (view.announcementKey !== lastAnnouncementKey) {
      lastAnnouncementKey = view.announcementKey;
      elements.liveRegion.textContent = view.announcement;
    }
  }

  function describeState(state) {
    const score = `${state.leftScore} 比 ${state.rightScore}`;
    const winner = state.lastWinner === "left" ? "左边" : "右边";

    if (state.phase === "countdown") {
      const count = Math.max(1, Math.ceil(state.countdownMs / 1000));
      return {
        title: String(count),
        detail: "倒计时结束后开始拉",
        primaryLabel: "准备中",
        announcementKey: `countdown:${state.roundNumber}:${count}`,
        announcement: `${count}，准备。`,
      };
    }
    if (state.phase === "playing") {
      return {
        title: "开始拉！",
        detail: "左边按 A，右边按 L",
        primaryLabel: "比赛进行中",
        announcementKey: `playing:${state.roundNumber}`,
        announcement: "开始拉。",
      };
    }
    if (state.phase === "paused") {
      const reason = state.pauseReason === "hidden"
        ? "页面切到后台，比赛已自动暂停"
        : state.pauseReason === "blur"
          ? "窗口失去焦点，比赛已自动暂停"
          : "比赛由玩家暂停";
      return {
        title: "已暂停",
        detail: `${reason}，继续后会先倒计时。`,
        primaryLabel: "比赛已暂停",
        announcementKey: `paused:${state.roundNumber}:${state.pauseReason}`,
        announcement: `${reason}。`,
      };
    }
    if (state.phase === "round-end") {
      return {
        title: `${winner}赢下这一局`,
        detail: `当前比分 ${score}`,
        primaryLabel: "开始下一局",
        announcementKey: `round-end:${state.roundNumber}:${score}`,
        announcement: `${winner}赢下这一局，当前比分 ${score}。`,
      };
    }
    if (state.phase === "match-end") {
      return {
        title: `${winner}赢得比赛`,
        detail: `最终比分 ${score} · 三局两胜`,
        primaryLabel: "重新比赛",
        announcementKey: `match-end:${score}`,
        announcement: `${winner}赢得比赛，最终比分 ${score}。`,
      };
    }
    return {
      title: "把织带结拉过终点线",
      detail: "左边按 A，右边按 L；也可以点击两侧按钮。",
      primaryLabel: "开始比赛",
      announcementKey: "idle",
      announcement: "心动拔河准备好了。",
    };
  }

  function describePosition(position) {
    const percent = Math.round(Math.abs(position) * 100);
    if (percent === 0) return "织带结在中间";
    return `织带结向${position < 0 ? "左" : "右"}偏移 ${percent}%`;
  }

  function clampPosition(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(-1, Math.min(1, number));
  }

  function renderUnavailable() {
    const statusText = document.querySelector("#status-text");
    const statusDetail = document.querySelector("#status-detail");
    if (statusText) statusText.textContent = "当前浏览器无法启动游戏";
    if (statusDetail) statusDetail.textContent = "请使用支持 JavaScript 与 requestAnimationFrame 的现代浏览器。";
    for (const selector of ["#left-pull", "#right-pull", "#primary-action", "#pause-button"]) {
      const button = document.querySelector(selector);
      if (button) button.disabled = true;
    }
  }
})();
