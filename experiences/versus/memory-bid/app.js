(function () {
  "use strict";

  const configModule = globalThis.MemoryBidConfig;
  const logic = globalThis.MemoryBidLogic;
  const mount = document.querySelector("#app-content");
  const app = document.querySelector("#app");
  const liveRegion = document.querySelector("#live-region");
  const AUTO_ITEM_MS = 900;
  const AUTO_GAP_MS = 250;
  const FALLBACK_SEED = 0x6d2b79f5;

  if (!configModule || !logic || !mount || !app || !liveRegion) {
    document.body.textContent = "这一串，我还记得加载失败，请确认 config.js、logic.js 与 app.js 都在页面旁边。";
    return;
  }

  let safeConfig;
  let state;
  let view;
  let selectedMode = null;
  let playbackTimer = null;
  let lastPhase = null;
  let lastAnnouncementSerial = -1;
  let focusRevision = 0;

  try {
    safeConfig = logic.sanitizeConfig(configModule.DEFAULT_CONFIG, configModule.composeMatchNote);
    state = logic.createInitialState(safeConfig);
    view = logic.getMemoryBidView(state, safeConfig);
  } catch (error) {
    document.body.textContent = "这一串，我还记得初始化失败，请重新打开页面。";
    return;
  }

  mount.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  globalThis.addEventListener("blur", () => pauseForLifecycle("blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseForLifecycle("hidden");
  });
  globalThis.addEventListener("beforeunload", clearPlaybackTimer);

  render({ focus: "mode-manual" });

  function handleClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled || !mount.contains(button)) return;

    const type = button.dataset.action;
    if (type === "SELECT_MODE") {
      selectedMode = button.dataset.mode === "auto" ? "auto" : "manual";
      render({ focus: `mode-${selectedMode}` });
      return;
    }
    if (type === "START_MATCH") {
      dispatch({ type, seed: createSeed(), playbackMode: selectedMode }, { focus: "heading" });
      return;
    }
    if (type === "PAUSE_REVEAL") {
      clearPlaybackTimer();
      dispatch({ type, reason: "manual" }, { focus: "resume" });
      return;
    }
    if (type === "PLACE_BID") {
      dispatch({
        type,
        playerIndex: view.bidding.activeBidderIndex,
        amount: Number(button.dataset.amount),
      }, { focus: "bid" });
      return;
    }
    if (type === "PASS_BID") {
      dispatch({ type, playerIndex: view.bidding.activeBidderIndex }, { focus: "heading" });
      return;
    }
    if (type === "ADD_PROOF") {
      dispatch({ type, itemId: button.dataset.itemId }, { focus: "item" });
      return;
    }
    if (type === "REMOVE_PROOF_SLOT") {
      dispatch({ type, index: Number(button.dataset.index) }, { focus: "item" });
      return;
    }
    if (type === "RESTART_MATCH") selectedMode = null;

    const focusByAction = {
      ADVANCE_MANUAL_REVEAL: "reveal-action",
      RESUME_REVEAL: "reveal-action",
      CLEAR_PROOF: "item",
      SUBMIT_PROOF: "heading",
      FORFEIT_PROOF: "heading",
      ADVANCE_ROUND: "heading",
      RESTART_MATCH: "mode-manual",
    };
    dispatch({ type }, { focus: focusByAction[type] || "heading" });
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;

    if (view.phase === "proof" && view.controls.canEditProof && /^[1-6]$/.test(event.key) && !event.repeat) {
      const item = view.items[Number(event.key) - 1];
      if (!item) return;
      event.preventDefault();
      dispatch({ type: "ADD_PROOF", itemId: item.id }, { focus: "item" });
      return;
    }

    if (view.phase === "proof" && event.key === "Backspace" && view.proof.draft.length > 0) {
      event.preventDefault();
      dispatch({ type: "REMOVE_PROOF_SLOT", index: view.proof.draft.length - 1 }, { focus: "item" });
      return;
    }

    if (event.key === "Escape") {
      if (view.phase === "reveal" && view.controls.canPause) {
        event.preventDefault();
        clearPlaybackTimer();
        dispatch({ type: "PAUSE_REVEAL", reason: "manual" }, { focus: "resume" });
      } else if (view.phase === "proof" && view.proof.draft.length > 0) {
        event.preventDefault();
        dispatch({ type: "CLEAR_PROOF" }, { focus: "item" });
      }
    }
  }

  function pauseForLifecycle(reason) {
    clearPlaybackTimer();
    if (view.phase !== "reveal" || view.reveal.paused) return;
    dispatch({ type: "PAUSE_REVEAL", reason }, { focus: "resume", announce: false });
  }

  function dispatch(action, options = {}) {
    const previousPhase = view.phase;
    const activeFocusKey = document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.focus || null
      : null;
    clearPlaybackTimer();
    try {
      state = logic.reduceMemoryBid(state, action, safeConfig);
      view = logic.getMemoryBidView(state, safeConfig);
    } catch (error) {
      liveRegion.textContent = "这一步没有生效，请按页面上的可用动作再试一次。";
      schedulePlaybackTimer();
      return;
    }
    const phaseFocus = view.phase !== previousPhase
      ? (view.phase === "intro" ? "mode-manual" : "heading")
      : options.focus;
    render({ ...options, focus: phaseFocus, preservedFocus: phaseFocus ? null : activeFocusKey });
  }

  function render(options = {}) {
    const phaseChanged = lastPhase !== view.phase;
    lastPhase = view.phase;
    app.dataset.phase = view.phase;
    mount.replaceChildren(buildTopbar(), buildLedger(), buildPrivacyNote());
    if (phaseChanged) globalThis.scrollTo(0, 0);
    announceView(options.announce !== false);
    const focusKey = options.focus || (phaseChanged ? "heading" : options.preservedFocus);
    if (focusKey) scheduleFocus(resolveFocus(focusKey));
    schedulePlaybackTimer();
  }

  function buildTopbar() {
    const header = element("header", `topbar${view.phase === "intro" ? " is-intro" : ""}`);
    header.append(textElement("h1", view.title, "work-title", { id: "work-title" }));
    if (view.phase === "intro") return header;

    const scoreboard = element("div", "scoreboard");
    scoreboard.setAttribute("aria-label", `${view.playerNames[0]} ${view.scores[0]} 比 ${view.scores[1]} ${view.playerNames[1]}`);
    scoreboard.append(
      textElement("span", view.playerNames[0]),
      textElement("strong", String(view.scores[0]), "score-number player-zero"),
      textElement("span", "·"),
      textElement("strong", String(view.scores[1]), "score-number player-one"),
      textElement("span", view.playerNames[1]),
    );

    const roundStatus = element("div", "round-status");
    const roundCopy = view.phase === "match-result"
      ? "四轮完成"
      : `第 ${view.round.number} / ${view.round.total} 轮`;
    roundStatus.append(textElement("p", roundCopy, "round-line"), buildRoundTrack());
    header.append(scoreboard, roundStatus);
    return header;
  }

  function buildRoundTrack() {
    const track = element("div", "round-track");
    track.setAttribute("aria-hidden", "true");
    for (let index = 0; index < view.round.total; index += 1) {
      const completed = view.phase === "match-result" || index < view.round.index;
      const current = view.phase !== "match-result" && index === view.round.index;
      track.append(element("span", `round-dot${completed ? " is-complete" : ""}${current ? " is-current" : ""}`));
    }
    return track;
  }

  function buildLedger() {
    const ledger = element("section", "ledger");
    ledger.setAttribute("aria-label", "记忆竞拍账页");
    const body = element("div", "ledger-body");
    if (view.phase === "intro") body.append(buildIntro());
    else if (view.phase === "reveal") body.append(buildReveal());
    else if (view.phase === "bidding") body.append(buildBidding());
    else if (view.phase === "proof") body.append(buildProof());
    else if (view.phase === "round-result") body.append(buildRoundResult());
    else body.append(buildMatchResult());
    ledger.append(body);
    return ledger;
  }

  function buildIntro() {
    const section = element("section", "intro-panel");
    section.append(
      heading(view.subtitle || "看过八件旧物，再把记得的数量报得更高。"),
      textElement("p", view.intro, "intro-copy"),
    );

    const picker = element("div", "mode-picker");
    picker.setAttribute("aria-label", "选择整场展示方式");
    picker.append(
      modeButton("auto", "让旧物自己经过"),
      modeButton("manual", "我们自己翻下一件"),
    );
    section.append(picker, actionButton("开始看第一串", "START_MATCH", "primary-action", selectedMode === null, "start-action"));
    return section;
  }

  function modeButton(mode, label) {
    const button = actionButton("", "SELECT_MODE", `mode-option${selectedMode === mode ? " is-selected" : ""}`, false, `mode-${mode}`);
    button.dataset.mode = mode;
    button.setAttribute("aria-pressed", String(selectedMode === mode));
    button.append(textElement("span", label, "mode-name"));
    return button;
  }

  function buildReveal() {
    const section = element("section", "reveal-panel");
    section.append(
      heading(view.text.heading || "把这一件收进记忆"),
      textElement("p", `第 ${view.reveal.number} / ${view.reveal.total} 件`, "reveal-counter"),
    );
    const stage = element("div", "reveal-stage");
    if (view.reveal.currentItem) {
      stage.append(buildItemPortrait(view.reveal.currentItem));
    } else {
      stage.append(textElement("p", view.reveal.paused ? "旧物已经盖住" : "下一件就要经过", "reveal-cover"));
    }
    section.append(stage);

    const actions = element("div", "action-row");
    if (view.controls.canResume) {
      actions.append(actionButton("继续看这一件", "RESUME_REVEAL", "primary-action", false, "resume-action"));
    } else if (view.controls.canAdvanceManual) {
      actions.append(actionButton("收好，下一件", "ADVANCE_MANUAL_REVEAL", "primary-action", false, "reveal-action"));
      actions.append(actionButton("先停一下", "PAUSE_REVEAL", "secondary-action"));
    } else if (view.controls.canPause) {
      actions.append(actionButton("先停一下", "PAUSE_REVEAL", "secondary-action", false, "reveal-action"));
    }
    section.append(actions);
    return section;
  }

  function buildItemPortrait(item) {
    const portrait = element("div", `item-portrait item-${item.id}`);
    portrait.append(
      sprite(item, true),
      textElement("span", `第 ${item.number} 件`, "item-number"),
      textElement("strong", item.label, "item-label"),
    );
    return portrait;
  }

  function buildBidding() {
    const grid = element("section", "bidding-grid");
    const history = element("aside", "bid-history");
    history.append(textElement("h2", "出价记录", "section-label"));
    const list = element("ol", "bid-history-list");
    if (view.bidding.bids.length === 0) {
      list.append(textElement("li", "还没有人开价", "bid-history-row"));
    } else {
      view.bidding.bids.forEach((bid) => {
        const row = element("li", `bid-history-row${bid.playerIndex === 1 ? " is-rival" : ""}`);
        row.append(textElement("strong", bid.playerName), textElement("span", `前 ${bid.amount} 件`));
        list.append(row);
      });
    }
    history.append(list);

    const center = element("div", "bid-center");
    center.append(
      heading(view.text.heading || "我能记得更多"),
      textElement("p", view.text.instruction || "只能报得更高，或者把证明交给对方。", "phase-copy"),
      textElement("p", "当前出价", "current-bid-label"),
      textElement("div", view.bidding.currentBid === null ? "等待开价" : `前 ${view.bidding.currentBid} 件`, "current-bid-ticket"),
      textElement("p", `轮到${view.playerNames[view.bidding.activeBidderIndex]}`, "current-turn"),
    );

    const actions = element("aside", "bid-actions");
    actions.append(textElement("h2", "可用出价", "section-label"));
    const buttonList = element("div", "bid-button-list");
    view.bidding.allowedAmounts.forEach((amount, index) => {
      const button = actionButton(`我记得前 ${amount} 件`, "PLACE_BID", "bid-action", false, index === 0 ? "bid-action" : "");
      button.dataset.amount = String(amount);
      buttonList.append(button);
    });
    actions.append(buttonList);
    if (view.controls.canPass) actions.append(actionButton("就到这里", "PASS_BID", "secondary-action pass-action"));
    grid.append(history, center, actions);
    return grid;
  }

  function buildProof() {
    const section = element("section", "proof-panel");
    section.append(
      heading(view.text.heading || `轮到${view.proof.proverName}证明`),
      textElement("p", `按顺序点出前 ${view.proof.bidAmount} 件`, "proof-commitment"),
      buildProofSlots(),
      textElement("h2", "选择下一件", "section-label"),
      buildItemPicker(),
    );

    const actions = element("div", "proof-actions");
    actions.append(
      actionButton("撤回上一件", "REMOVE_LAST_PROOF", "secondary-action", view.proof.draft.length === 0),
      actionButton("重新摆", "CLEAR_PROOF", "secondary-action", view.proof.draft.length === 0),
      actionButton("就按这一串", "SUBMIT_PROOF", "primary-action", !view.controls.canSubmitProof),
      actionButton("这轮认输", "FORFEIT_PROOF", "danger-action", !view.controls.canForfeitProof),
    );
    const removeLast = actions.querySelector('[data-action="REMOVE_LAST_PROOF"]');
    removeLast.dataset.action = "REMOVE_PROOF_SLOT";
    removeLast.dataset.index = String(Math.max(0, view.proof.draft.length - 1));
    section.append(actions, textElement("p", noticeText(view.notice), "notice"));
    return section;
  }

  function buildProofSlots() {
    const slots = element("div", "proof-slots");
    slots.style.setProperty("--slot-count", String(view.proof.bidAmount));
    for (let index = 0; index < view.proof.bidAmount; index += 1) {
      const item = view.proof.draft[index];
      if (!item) {
        const empty = element("div", "proof-slot");
        empty.append(textElement("span", String(index + 1), "proof-slot-index"), textElement("span", "空位", "visually-hidden"));
        slots.append(empty);
        continue;
      }
      const button = actionButton("", "REMOVE_PROOF_SLOT", `proof-slot is-filled item-${item.id}`);
      button.dataset.index = String(index);
      button.setAttribute("aria-label", `第 ${index + 1} 格，${item.label}；点击移除`);
      button.append(textElement("span", String(index + 1), "proof-slot-index"), sprite(item, true), textElement("span", item.label, "item-label"));
      slots.append(button);
    }
    return slots;
  }

  function buildItemPicker() {
    const picker = element("div", "item-picker");
    view.items.forEach((item, index) => {
      const button = actionButton("", "ADD_PROOF", `item-button item-${item.id}`, !view.controls.canEditProof, index === 0 ? "item-action" : "");
      button.dataset.itemId = item.id;
      button.setAttribute("aria-label", `${item.number}，${item.label}`);
      const text = element("span", "item-button-text");
      text.append(textElement("span", String(item.number), "item-button-number"), textElement("span", item.label, "item-button-label"));
      button.append(sprite(item, true), text);
      picker.append(button);
    });
    return picker;
  }

  function buildRoundResult() {
    const result = view.roundResult;
    const success = result.success;
    const section = element("section", "result-panel");
    section.append(
      resultMark(success),
      heading(success ? `${result.proverName}记对了` : result.forfeited ? `${result.proverName}把这一分交给对方` : "这一件不一样"),
      textElement("p", roundResultCopy(result), "phase-copy"),
    );

    const comparison = element("div", "comparison");
    const answerRow = element("div", "comparison-row");
    answerRow.append(textElement("p", "这一轮的八件", "comparison-label"), buildSequenceStrip(result.sequence));
    const proofRow = element("div", "comparison-row");
    proofRow.append(
      textElement("p", `${result.proverName}证明的前 ${result.bidAmount} 件`, "comparison-label"),
      buildSequenceStrip(result.proof, result.mismatchIndex),
    );
    comparison.append(answerRow, proofRow);
    section.append(comparison);

    const actionLabel = view.controls.canShowMatchResult ? "看看四轮总分" : "换人先开价";
    section.append(actionButton(actionLabel, "ADVANCE_ROUND", "primary-action"));
    return section;
  }

  function roundResultCopy(result) {
    if (result.success) return `${result.proverName}按顺序守住了前 ${result.bidAmount} 件，${result.pointWinnerName}得 1 分。`;
    if (result.forfeited) return `${result.proverName}选择这轮认输，${result.pointWinnerName}得 1 分。`;
    return `第 ${result.mismatchIndex + 1} 件不同，${result.pointWinnerName}得 1 分。`;
  }

  function buildSequenceStrip(items, mismatchIndex = null) {
    const strip = element("div", "sequence-strip");
    items.forEach((item, index) => {
      const wrapper = element("div", `sequence-item item-${item.id}${index === mismatchIndex ? " is-mismatch" : ""}`);
      wrapper.append(sprite(item, true), textElement("span", item.label, "item-label"));
      if (index === mismatchIndex) wrapper.setAttribute("aria-label", `第 ${index + 1} 件首个不同：${item.label}`);
      strip.append(wrapper);
    });
    if (items.length === 0) strip.append(textElement("p", "没有摆下物件", "phase-copy"));
    return strip;
  }

  function buildMatchResult() {
    const section = element("section", "match-result-panel");
    const layout = element("div", "match-layout");
    const summary = element("section", "match-summary");
    const conclusion = view.match.tie
      ? "你们记得一样稳"
      : `${view.playerNames[view.match.winnerIndex]}记得更稳`;
    summary.append(
      heading("四轮都收好了"),
      textElement("p", conclusion, "phase-copy"),
      finalScore(view.match.scores),
      textElement("p", matchScoreCopy(), "phase-copy"),
    );

    const ledger = element("section", "match-ledger");
    ledger.append(textElement("h2", "四轮账簿", "section-label"));
    const list = element("ol", "round-result-list");
    view.match.results.forEach((result) => list.append(buildMatchRow(result)));
    ledger.append(list);
    layout.append(summary, ledger);
    section.append(layout, textElement("p", view.match.note, "match-note"));
    const action = element("div", "match-action");
    action.append(actionButton("再记四轮", "RESTART_MATCH", "primary-action", false, "restart-action"));
    section.append(action);
    return section;
  }

  function finalScore(scores) {
    const score = element("p", "final-score");
    score.append(textElement("span", String(scores[0]), "player-zero"), document.createTextNode(" · "), textElement("span", String(scores[1]), "player-one"));
    return score;
  }

  function matchScoreCopy() {
    if (view.match.tie) return "四轮总分相同，平局也是正式结果。";
    return `${view.playerNames[view.match.winnerIndex]}守住了更多承诺。`;
  }

  function buildMatchRow(result) {
    const row = element("li", "round-result-row");
    row.append(
      textElement("span", `第 ${result.roundNumber} 轮 · ${result.proverName}报前 ${result.bidAmount} 件`),
    );
    const outcome = element("span", "round-result-outcome");
    outcome.append(
      element("span", `mini-mark ${result.success ? "is-success" : "is-warning"}`),
      textElement("span", result.success ? "证明成功" : result.forfeited ? "主动认输" : `第 ${result.mismatchIndex + 1} 件不同`),
    );
    row.append(outcome, textElement("strong", `${result.pointWinnerName}得分`));
    return row;
  }

  function resultMark(success) {
    const mark = element("span", `result-mark ${success ? "is-success" : "is-warning"}`);
    mark.setAttribute("aria-hidden", "true");
    return mark;
  }

  function sprite(item, hiddenFromAssistiveTechnology) {
    const node = element("span", `item-sprite item-${item.id}`);
    if (hiddenFromAssistiveTechnology) node.setAttribute("aria-hidden", "true");
    return node;
  }

  function buildPrivacyNote() {
    const note = element("p", "privacy-note");
    note.append(element("span", "privacy-lock"), document.createTextNode("序列只在本机内存，刷新即清空"));
    return note;
  }

  function heading(copy) {
    return textElement("h2", copy, "phase-heading", { tabindex: "-1", "data-focus": "heading" });
  }

  function actionButton(label, action, className, disabled = false, focusName = "") {
    const button = textElement("button", label, className, { type: "button", "data-action": action });
    button.disabled = disabled;
    if (focusName) button.dataset.focus = focusName;
    return button;
  }

  function element(tagName, className = "") {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    return node;
  }

  function textElement(tagName, text, className = "", attributes = {}) {
    const node = element(tagName, className);
    node.textContent = text == null ? "" : String(text);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  function resolveFocus(key) {
    const selectors = {
      start: '[data-focus="start-action"]',
      heading: '[data-focus="heading"]',
      resume: '[data-focus="resume-action"]',
      "reveal-action": '[data-focus="reveal-action"]',
      bid: '[data-focus="bid-action"]',
      item: '[data-focus="item-action"]',
      "mode-auto": '[data-focus="mode-auto"]',
      "mode-manual": '[data-focus="mode-manual"]',
    };
    return mount.querySelector(selectors[key] || selectors.heading);
  }

  function scheduleFocus(target) {
    if (!target) return;
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision || !document.body.contains(target)) return;
      target.focus({ preventScroll: true });
    });
  }

  function schedulePlaybackTimer() {
    clearPlaybackTimer();
    if (view.phase !== "reveal" || view.reveal.mode !== "auto" || view.reveal.paused) return;
    if (!Number.isSafeInteger(view.reveal.generation)) return;
    const generation = view.reveal.generation;
    const showing = Boolean(view.reveal.currentItem);
    playbackTimer = globalThis.setTimeout(() => {
      playbackTimer = null;
      dispatch({ type: showing ? "HIDE_REVEAL_ITEM" : "SHOW_REVEAL_ITEM", generation });
    }, showing ? AUTO_ITEM_MS : AUTO_GAP_MS);
  }

  function clearPlaybackTimer() {
    if (playbackTimer === null) return;
    globalThis.clearTimeout(playbackTimer);
    playbackTimer = null;
  }

  function announceView(enabled) {
    if (!enabled || view.announcementSerial === lastAnnouncementSerial) return;
    lastAnnouncementSerial = view.announcementSerial;
    const notice = view.phase === "bidding" && view.notice === "reveal-hidden"
      ? "八件旧物已经收好，开始竞价。"
      : noticeText(view.notice);
    liveRegion.textContent = notice;
  }

  function noticeText(notice) {
    const messages = {
      "match-started": "第一轮开始，请一起看旧物。",
      "reveal-paused": "旧物已经盖住；准备好后继续。",
      "reveal-resumed": "继续展示这一件旧物。",
      "bid-placed": "新报价已经记入账簿。",
      "bid-passed": "竞价结束，最高报价者开始证明。",
      "proof-started": "竞价结束，最高报价者开始证明。",
      "proof-updated": "证明顺序已经更新。",
      "proof-cleared": "证明顺序已经清空。",
      "proof-incomplete": "还没有摆满承诺的数量。",
      "round-success": "证明成功，本轮得分已经记下。",
      "round-failed": "证明有一件不同，本轮得分已经记下。",
      "round-forfeited": "证明者选择认输，本轮得分已经记下。",
      "round-advanced": "下一轮开始，交换开价席。",
      "match-complete": "四轮完成，可以查看总结果。",
    };
    return messages[notice] || "";
  }

  function createSeed() {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") return FALLBACK_SEED;
    const values = new Uint32Array(1);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      globalThis.crypto.getRandomValues(values);
      if (values[0] !== 0) return values[0];
    }
    return FALLBACK_SEED;
  }
})();
