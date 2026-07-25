(function runWordDetourDuel() {
  "use strict";

  const logic = globalThis.WordDetourLogic;
  const config = globalThis.WORD_DETOUR_CONFIG;
  const stage = document.getElementById("stage");
  const globalStatus = document.getElementById("global-status");
  const publicTimer = document.getElementById("public-timer");
  const scoreNodes = [
    document.getElementById("player-one-score"),
    document.getElementById("player-two-score"),
  ];
  const roleNodes = [
    document.getElementById("player-one-role"),
    document.getElementById("player-two-role"),
  ];

  if (
    !logic ||
    !config ||
    !stage ||
    !globalStatus ||
    !publicTimer ||
    scoreNodes.some(function (node) { return !node; }) ||
    roleNodes.some(function (node) { return !node; })
  ) {
    return;
  }

  const readNow = (
    globalThis.performance &&
    typeof globalThis.performance.now === "function"
  )
    ? function monotonicNow() { return globalThis.performance.now(); }
    : function wallClockNow() { return Date.now(); };

  const outcomeLabels = Object.freeze({
    correct: "猜中 +1",
    foul: "踩词 -1",
    skip: "跳过 0",
  });
  const interruptionLabels = Object.freeze({
    manual: "你主动暂停了这一回合。",
    blur: "窗口失去焦点，题卡已自动遮住。",
    hidden: "页面转入后台，题卡已自动遮住。",
    pagehide: "页面即将离开，题卡已自动遮住。",
  });
  const timerThresholds = Object.freeze([30, 10, 5, 0]);
  const actionTypes = Object.freeze({
    ENTER_SETUP: Object.freeze({ type: "ENTER_SETUP" }),
    SET_VARIANT: Object.freeze({ type: "SET_VARIANT" }),
    SET_TIMER: Object.freeze({ type: "SET_TIMER" }),
    START_MATCH: Object.freeze({ type: "START_MATCH" }),
    REVEAL_CARD: Object.freeze({ type: "REVEAL_CARD" }),
    START_CLOCK: Object.freeze({ type: "START_CLOCK" }),
    TICK: Object.freeze({ type: "TICK" }),
    RECORD_OUTCOME: Object.freeze({ type: "RECORD_OUTCOME" }),
    INTERRUPT: Object.freeze({ type: "INTERRUPT" }),
    PREPARE_RESUME: Object.freeze({ type: "PREPARE_RESUME" }),
    SHOW_REVIEW: Object.freeze({ type: "SHOW_REVIEW" }),
    RECLASSIFY_CARD: Object.freeze({ type: "RECLASSIFY_CARD" }),
    CONFIRM_TURN: Object.freeze({ type: "CONFIRM_TURN" }),
    RESTART: Object.freeze({ type: "RESTART" }),
  });

  let state = logic.createInitialState(config);
  let publicView = logic.getView(state);
  let timerDriver = null;
  let timerDriverToken = null;
  let lastAnnouncedTimer = null;

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function heading(text) {
    const node = element("h2", "stage-title", text);
    node.id = "stage-title";
    node.tabIndex = -1;
    return node;
  }

  function icon(kind) {
    const namespace = document.documentElement.namespaceURI.replace("1999/xhtml", "2000/svg");
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    if (kind === "correct") path.setAttribute("d", "M5 17l7 7L27 8");
    if (kind === "foul") path.setAttribute("d", "M7 7l18 18M25 7L7 25");
    if (kind === "skip") path.setAttribute("d", "M5 7l9 9-9 9M16 7l9 9-9 9");
    if (kind === "handoff") path.setAttribute("d", "M5 10h17m-5-5 5 5-5 5M27 22H10m5-5-5 5 5 5");
    if (kind === "covered") path.setAttribute("d", "M4 16s5-7 12-7 12 7 12 7-5 7-12 7S4 16 4 16Zm2-12 20 24");
    svg.append(path);
    return svg;
  }

  function routeLines() {
    const namespace = document.documentElement.namespaceURI.replace("1999/xhtml", "2000/svg");
    const svg = document.createElementNS(namespace, "svg");
    svg.classList.add("route-lines");
    svg.setAttribute("viewBox", "0 0 1000 500");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const pathData of [
      "M500 250H420C360 250 370 110 290 110H125",
      "M500 250H410C320 250 360 175 235 175H105",
      "M500 250H580C640 250 630 110 710 110H875",
      "M500 250H590C680 250 640 175 765 175H895",
      "M500 250H420C360 250 370 390 290 390H125",
      "M500 250H410C320 250 360 325 235 325H105",
      "M500 250H580C640 250 630 390 710 390H875",
      "M500 250H590C680 250 640 325 765 325H895",
    ]) {
      const path = document.createElementNS(namespace, "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    }
    return svg;
  }

  function makeButton(label, actionFactory, options) {
    const settings = options || {};
    const button = element("button", settings.className || "button", label);
    button.type = "button";
    if (settings.id) button.id = settings.id;
    if (settings.disabled) button.disabled = true;
    let consumed = false;
    button.addEventListener("keydown", function (event) {
      if (event.repeat && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
      }
    });
    button.addEventListener("click", function (event) {
      if (consumed || event.detail > 1) return;
      const changed = dispatch(actionFactory(), {
        focusId: settings.focusId || null,
        focusTarget: settings.focusTarget || "heading",
      });
      if (changed) consumed = true;
    });
    return button;
  }

  function action(type, extra) {
    return Object.assign({}, actionTypes[type], extra || {}, { revision: state.revision });
  }

  function clockFields() {
    const timed = (
      publicView.phase === "describing" &&
      publicView.phaseData &&
      publicView.phaseData.remainingSeconds !== null
    );
    return timed
      ? { nowMs: readNow(), token: state.clock.token }
      : { nowMs: null, token: null };
  }

  function dispatch(candidate, options) {
    const next = logic.reduce(state, candidate);
    if (next === state) return false;
    state = next;
    publicView = logic.getView(state);
    render(publicView, options || {});
    return true;
  }

  function dispatchTick(token) {
    const next = logic.reduce(state, action("TICK", {
      nowMs: readNow(),
      token: token,
    }));
    if (next === state) return;
    const previousPhase = publicView.phase;
    state = next;
    publicView = logic.getView(state);
    if (previousPhase === "describing" && publicView.phase === "describing") {
      updatePublicRail(publicView);
      updateTimerText(publicView);
      announceTimer(publicView.phaseData.remainingSeconds);
      return;
    }
    render(publicView, { focusTarget: "heading" });
  }

  function clearTimerDriver() {
    if (timerDriver !== null) {
      globalThis.clearInterval(timerDriver);
      timerDriver = null;
      timerDriverToken = null;
    }
  }

  function syncTimerDriver(view) {
    const needsDriver = (
      view.phase === "describing" &&
      view.phaseData.remainingSeconds !== null
    );
    if (!needsDriver) {
      clearTimerDriver();
      return;
    }
    const token = state.clock.token;
    if (timerDriver !== null && timerDriverToken === token) return;
    clearTimerDriver();
    timerDriverToken = token;
    timerDriver = globalThis.setInterval(function tickTimer() {
      dispatchTick(token);
    }, 200);
  }

  function announceTimer(seconds) {
    if (timerThresholds.indexOf(seconds) < 0 || lastAnnouncedTimer === seconds) return;
    lastAnnouncedTimer = seconds;
    globalStatus.textContent = seconds === 0 ? "本回合时间到。" : `本回合剩余 ${seconds} 秒。`;
  }

  function updateTimerText(view) {
    const timerText = document.getElementById("timer-text");
    if (!timerText || view.phase !== "describing") return;
    timerText.textContent = (
      view.phaseData.remainingSeconds === null
        ? "不计时"
        : formatSeconds(view.phaseData.remainingSeconds)
    );
  }

  function formatSeconds(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function roleFor(view, seat) {
    if (view.describerSeat === null) return "等待开始";
    if (view.describerSeat === seat) return "描述者";
    if (view.guesserSeat === seat) return "猜词者";
    return "等待";
  }

  function updatePublicRail(view) {
    const scores = view.scoreboard ? view.scoreboard.playerScores : null;
    for (let seat = 0; seat < 2; seat += 1) {
      scoreNodes[seat].textContent = scores ? String(scores[seat]) : "—";
      roleNodes[seat].textContent = roleFor(view, seat);
    }
    if (view.phase === "describing") {
      publicTimer.textContent = (
        view.phaseData.remainingSeconds === null
          ? "不计时"
          : formatSeconds(view.phaseData.remainingSeconds)
      );
    } else {
      const labels = {
        intro: "待机",
        setup: "待机",
        handoff: "待开始",
        "card-ready": "未开始",
        interrupted: "已暂停",
        "turn-ended": "已结束",
        "turn-review": "复核中",
        "match-result": "完成",
      };
      publicTimer.textContent = labels[view.phase];
    }
  }

  function focusAfterRender(options) {
    if (options.focusId) {
      const requested = document.getElementById(options.focusId);
      if (requested) {
        requested.focus();
        return;
      }
    }
    if (options.focusTarget === "secret") {
      const target = document.getElementById("target-word");
      if (target) {
        target.focus();
        return;
      }
    }
    const title = document.getElementById("stage-title");
    if (title) title.focus();
  }

  function render(view, options) {
    clearTimerDriver();
    document.body.className = `phase-${view.phase}`;
    updatePublicRail(view);
    stage.replaceChildren();
    lastAnnouncedTimer = null;

    if (view.phase === "intro") renderIntro(view);
    if (view.phase === "setup") renderSetup(view);
    if (view.phase === "handoff") renderHandoff(view);
    if (view.phase === "card-ready" || view.phase === "describing") renderSecret(view);
    if (view.phase === "interrupted") renderInterrupted(view);
    if (view.phase === "turn-ended") renderTurnEnded(view);
    if (view.phase === "turn-review") renderReview(view);
    if (view.phase === "match-result") renderResult(view);

    globalStatus.textContent = view.statusText;
    focusAfterRender(options);
    syncTimerDriver(view);
  }

  function panel(kicker) {
    const node = element("div", "stage-panel");
    if (kicker) node.append(element("p", "stage-kicker", kicker));
    return node;
  }

  function renderIntro(view) {
    const node = panel("双人 · 同机 · 四回合");
    node.append(
      heading("从一条绕开的路开始"),
      element("p", "stage-copy", view.publicInstructions),
    );
    const instructions = element("ol", "instructions");
    for (const copy of [
      "每回合由一人描述、另一人猜词；每人描述两回合。",
      "描述者要绕开题卡上的四个禁用提示。",
      "猜中记 +1，踩词记 -1，跳过不计分；回合后两人共同复核。",
    ]) {
      instructions.append(element("li", null, copy));
    }
    node.append(
      instructions,
      element("p", "stage-copy", view.trustNotice),
      makeButton("设置新对局", function () {
        return action("ENTER_SETUP");
      }, { className: "button button--primary" }),
    );
    stage.append(node);
  }

  function radioChoice(name, value, label, checked, onChange) {
    const wrapper = element("label", "choice");
    const input = element("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.id = `${name}-${value}`;
    input.checked = checked;
    input.addEventListener("change", onChange);
    wrapper.append(input, element("span", null, label));
    return wrapper;
  }

  function renderSetup(view) {
    const data = view.phaseData;
    const node = panel("对局设置");
    node.id = "setup-form";
    node.append(
      heading("选好路线，再把设备放在两人中间"),
      element("p", "stage-copy", "牌组只改变出题顺序；一局内计时方式保持不变。"),
    );
    const grid = element("div", "setup-grid");
    const decks = element("fieldset");
    decks.append(element("legend", null, "牌组"));
    const deckChoices = element("div", "choice-list");
    data.deckLabels.forEach(function (label, index) {
      deckChoices.append(radioChoice(
        "deck",
        String(index),
        label,
        data.selectedVariant === index,
        function () {
          dispatch(action("SET_VARIANT", { value: index }), {
            focusId: `deck-${index}`,
          });
        },
      ));
    });
    decks.append(deckChoices);

    const timers = element("fieldset");
    timers.append(element("legend", null, "每回合计时"));
    const timerChoices = element("div", "choice-list");
    data.timerOptions.forEach(function (seconds) {
      const value = seconds === null ? "none" : String(seconds);
      const label = seconds === null ? "不计时" : `${seconds} 秒`;
      timerChoices.append(radioChoice(
        "timer",
        value,
        label,
        data.selectedTimer === seconds,
        function () {
          dispatch(action("SET_TIMER", { value: seconds }), {
            focusId: `timer-${value}`,
          });
        },
      ));
    });
    timers.append(timerChoices);
    grid.append(decks, timers);
    const controls = element("div", "stage-actions");
    controls.append(makeButton("开始对局", function () {
      return action("START_MATCH");
    }, { className: "button button--primary" }));
    node.append(grid, controls);
    stage.append(node);
  }

  function renderHandoff(view) {
    const node = panel(`第 ${view.turnIndex + 1} / 4 回合`);
    node.id = "handoff-panel";
    node.append(heading("猜词者请背对屏幕"));
    const roles = element("div", "role-line");
    for (const item of [
      [view.phaseData.describerLabel, "描述者 · 接过设备"],
      [view.phaseData.guesserLabel, "猜词者 · 移开视线"],
    ]) {
      const badge = element("div", "role-badge");
      badge.append(element("strong", null, item[0]), element("span", null, item[1]));
      roles.append(badge);
    }
    const mark = element("div", "handoff-mark");
    mark.setAttribute("aria-hidden", "true");
    mark.append(icon("handoff"));
    node.append(
      roles,
      mark,
      element("p", "stage-copy", "确认只有描述者能看见屏幕后，再打开当前题卡。"),
      makeButton("只有我在看，打开题卡", function () {
        return action("REVEAL_CARD");
      }, { className: "button button--primary", focusTarget: "secret" }),
    );
    stage.append(node);
  }

  function renderSecret(view) {
    const data = view.phaseData;
    const shell = element("div", "secret-shell");
    const headingBlock = element("div", "secret-heading");
    const title = heading("目标词");
    headingBlock.append(title);
    const guidance = element(
      "p",
      "secret-guidance",
      "描述者看屏幕，猜词者继续背对屏幕。",
    );

    const map = element("section", "route-map");
    map.id = "secret-card";
    map.setAttribute("aria-live", "off");
    map.setAttribute("aria-label", "当前题卡");
    map.append(routeLines());
    const target = element("div", "target-node");
    target.append(element("span", "target-label", "目标词"));
    const targetWord = element("strong", "target-word", data.target);
    targetWord.id = "target-word";
    targetWord.tabIndex = -1;
    target.append(targetWord);

    const forbiddenList = element("ul", "forbidden-list");
    forbiddenList.id = "forbidden-list";
    data.forbidden.forEach(function (word) {
      const item = element("li", "forbidden-node");
      item.append(
        element("span", "forbidden-label", "不能说"),
        element("strong", null, word),
      );
      forbiddenList.append(item);
    });
    map.append(target, forbiddenList);

    const controls = element("div", "secret-controls");
    const progress = element(
      "p",
      "progress-line",
      `第 ${view.progress.turn} / ${view.progress.turns} 回合 · 第 ${view.progress.card} / ${view.progress.cards} 张`,
    );
    controls.append(progress);
    if (view.phase === "card-ready") {
      const actions = element("div", "stage-actions");
      actions.append(
        makeButton("开始本回合", function () {
          return action("START_CLOCK", { nowMs: readNow() });
        }, { className: "button button--primary" }),
        makeButton("暂停并遮住", function () {
          return action("INTERRUPT", Object.assign({ reason: "manual" }, clockFields()));
        }, { className: "button button--quiet" }),
      );
      controls.append(actions);
    } else {
      const timer = element(
        "p",
        "review-score",
        data.remainingSeconds === null ? "不计时" : formatSeconds(data.remainingSeconds),
      );
      timer.id = "timer-text";
      timer.setAttribute("aria-label", "本回合剩余时间");
      controls.append(timer);
      const outcomes = element("div", "outcome-controls");
      outcomes.id = "outcome-controls";
      for (const outcome of data.outcomes) {
        const button = makeButton(outcomeLabels[outcome], function () {
          return action("RECORD_OUTCOME", Object.assign(
            { outcome: outcome },
            clockFields(),
          ));
        }, {
          className: `outcome-button outcome-button--${outcome}`,
          focusTarget: "secret",
        });
        button.prepend(icon(outcome));
        outcomes.append(button);
      }
      const pause = element("div", "pause-row");
      pause.append(makeButton("暂停并遮住", function () {
        return action("INTERRUPT", Object.assign({ reason: "manual" }, clockFields()));
      }, { className: "button button--quiet" }));
      controls.append(outcomes, pause);
    }
    shell.append(headingBlock, guidance, map, controls);
    stage.append(shell);
  }

  function renderInterrupted(view) {
    const node = panel("题卡已安全移除");
    node.id = "interrupted-panel";
    node.append(heading("题卡已遮住，恢复不会自动继续计时"));
    const mark = element("div", "covered-mark");
    mark.setAttribute("aria-hidden", "true");
    mark.append(icon("covered"));
    node.append(
      mark,
      element("p", "stage-copy", interruptionLabels[view.phaseData.reason]),
      element("p", "stage-copy", "让猜词者重新背对屏幕，再由描述者主动恢复。"),
      makeButton("描述者准备恢复", function () {
        return action("PREPARE_RESUME");
      }, { className: "button button--primary", focusTarget: "secret" }),
    );
    stage.append(node);
  }

  function renderTurnEnded() {
    const node = panel("公开交接");
    node.id = "turn-ended-panel";
    node.append(
      heading("本回合已结束，请把设备放回中间"),
      element("p", "stage-copy", "题卡已经离开页面。等两个人都能看见屏幕，再开始复核。"),
      makeButton("两人都能看，开始复核", function () {
        return action("SHOW_REVIEW");
      }, { className: "button button--primary" }),
    );
    stage.append(node);
  }

  function renderReview(view) {
    const data = view.phaseData;
    const node = panel("共同复核");
    node.append(
      heading("只在两人一致时更正"),
      element("p", "stage-copy", "这里仅列出本回合实际出现过的题卡。确认后，本回合成绩会进入公共比分。"),
    );
    const list = element("ol", "review-list");
    list.id = "review-list";
    data.items.forEach(function (item, index) {
      const row = element("li", "review-item");
      const words = element("div");
      words.append(
        element("strong", "review-word", `${index + 1}. ${item.target}`),
        element("span", "review-forbidden", `不能说：${item.forbidden.join("、")}`),
      );
      const control = element("label", "review-control");
      control.append(element("span", null, "本张结果"));
      const select = element("select");
      select.id = `review-outcome-${index}`;
      for (const outcome of ["correct", "foul", "skip"]) {
        const option = element("option", null, outcomeLabels[outcome]);
        option.value = outcome;
        option.selected = item.outcome === outcome;
        select.append(option);
      }
      select.addEventListener("change", function () {
        dispatch(action("RECLASSIFY_CARD", {
          cardId: item.cardId,
          outcome: select.value,
        }), { focusId: select.id });
      });
      control.append(select);
      row.append(words, control);
      list.append(row);
    });
    const score = element(
      "p",
      "review-score",
      `本回合：猜中 ${data.score.correctCount} · 踩词 ${data.score.foulCount} · 跳过 ${data.score.skipCount} · 净分 ${data.score.score}`,
    );
    node.append(
      list,
      score,
      makeButton("确认本回合结果", function () {
        return action("CONFIRM_TURN");
      }, { className: "button button--primary" }),
    );
    stage.append(node);
  }

  function renderResult(view) {
    const data = view.phaseData;
    const node = panel("四回合完成");
    node.id = "match-result";
    node.append(heading(view.statusText));
    const scores = element("div", "result-scores");
    data.result.playerScores.forEach(function (score, seat) {
      const box = element("div", "result-score");
      box.append(
        element("span", null, view.playerLabels[seat]),
        element("strong", null, String(score)),
      );
      scores.append(box);
    });
    const list = element("ol", "turn-summary-list");
    data.turns.forEach(function (turn) {
      const summary = turn.summary;
      const row = element("li", "turn-summary");
      row.append(
        element("strong", null, `第 ${turn.turnIndex + 1} 回合 · ${view.playerLabels[turn.describerSeat]}描述`),
        element("span", null, `猜中 ${summary.correctCount}`),
        element("span", null, `踩词 ${summary.foulCount}`),
        element("span", null, `跳过 ${summary.skipCount}`),
        element("span", null, `净分 ${summary.score}`),
      );
      list.append(row);
    });
    node.append(
      scores,
      list,
      makeButton("再来一局", function () {
        return action("RESTART");
      }, { className: "button button--primary" }),
    );
    stage.append(node);
  }

  function interruptFor(reason) {
    if (publicView.phase !== "card-ready" && publicView.phase !== "describing") return;
    dispatch(action("INTERRUPT", Object.assign({ reason: reason }, clockFields())), {
      focusTarget: "heading",
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") interruptFor("hidden");
  });
  globalThis.addEventListener("pagehide", function () {
    interruptFor("pagehide");
  });
  globalThis.addEventListener("blur", function () {
    interruptFor("blur");
  });
  globalThis.addEventListener("focus", function () {
    /* 恢复焦点不推进状态，必须由描述者主动操作。 */
  });

  render(publicView, { focusTarget: "heading" });
})();
