(function () {
  "use strict";

  const logic = globalThis.CLOSER_CARDS_LOGIC;
  const rawConfig = globalThis.CLOSER_CARDS_CONFIG || {};
  if (!logic) {
    document.body.textContent = "靠近一点加载失败，请确认 config.js 与 logic.js 和页面放在同一目录。";
    return;
  }
  const config = logic.sanitizeConfig(rawConfig);

  const app = document.querySelector(".app");
  const progress = document.querySelector("#session-progress");
  const card = document.querySelector("#prompt-card");
  const theme = document.querySelector("#card-theme");
  const kicker = document.querySelector("#card-kicker");
  const question = document.querySelector("#card-question");
  const speakerCopy = document.querySelector("#speaker-copy");
  const primaryAction = document.querySelector("#primary-action");
  const skipAction = document.querySelector("#skip-action");
  const announcement = document.querySelector("#announcement");
  const dots = [...document.querySelectorAll("#progress-dots li")];
  const playerNodes = {
    a: document.querySelector("#player-a"),
    b: document.querySelector("#player-b"),
  };
  const nameNodes = {
    a: document.querySelector("#name-a"),
    b: document.querySelector("#name-b"),
  };
  const statusNodes = {
    a: document.querySelector("#status-a"),
    b: document.querySelector("#status-b"),
  };

  let state = logic.createInitialState(config);
  let fallbackSeed = initialFallbackSeed();
  let primaryLockedUntil = 0;

  primaryAction.addEventListener("click", (event) => {
    const eventTime = Number.isFinite(event.timeStamp) ? event.timeStamp : globalThis.performance.now();
    if (eventTime < primaryLockedUntil) return;
    primaryLockedUntil = eventTime + 650;
    const previousPhase = state.phase;
    if (state.phase === "intro") {
      state = logic.startSession(state, logic.CARDS, randomIndex, config.chooseOpeningCard);
    } else if (state.phase === "card-back") {
      state = logic.revealCard(state);
    } else if (state.phase === "first-speaking" || state.phase === "second-speaking") {
      state = logic.finishSpeaking(state);
    } else if (state.phase === "settle") {
      state = logic.settleCard(state);
    } else if (state.phase === "complete") {
      state = logic.restartSession(state);
    }
    if (state.phase !== previousPhase) announceTransition();
    render(true);
  });

  skipAction.addEventListener("click", () => {
    const previous = state;
    state = logic.skipCard(state);
    if (state !== previous) {
      announcement.textContent = state.phase === "complete"
        ? "今晚先聊到这里。"
        : `已换一张，下一张由${playerName(state.firstSpeaker)}先说。`;
    }
    render(true);
  });

  render(false);

  function render(shouldFocus) {
    app.dataset.phase = state.phase;
    nameNodes.a.textContent = state.players.a;
    nameNodes.b.textContent = state.players.b;
    renderProgress();
    renderPlayers();
    renderCard();
    renderActions();
    if (shouldFocus) globalThis.requestAnimationFrame(() => primaryAction.focus({ preventScroll: true }));
  }

  function renderProgress() {
    const completed = state.completedIds.length;
    const current = state.phase === "intro" || state.phase === "complete"
      ? completed
      : Math.min(state.sessionSize, completed + 1);
    progress.textContent = `${current} / ${state.sessionSize}`;
    progress.setAttribute("aria-label", `已完成 ${completed} 张，共 ${state.sessionSize} 张${state.phase === "complete" ? "，会话完成" : ""}`);

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-complete", index < completed);
      dot.classList.toggle("is-active", state.phase !== "intro" && state.phase !== "complete" && index === completed);
      const status = index < completed ? "已完成" : index === completed && state.phase !== "intro" && state.phase !== "complete" ? "正在进行" : "未开始";
      dot.querySelector("span").textContent = `第 ${index + 1} 张，${status}`;
    });
  }

  function renderPlayers() {
    const activeSpeaker = state.currentSpeaker || (state.phase === "card-back" ? state.firstSpeaker : null);
    for (const id of ["a", "b"]) {
      const isActive = id === activeSpeaker;
      playerNodes[id].classList.toggle("is-active", isActive);
      if (state.phase === "intro") statusNodes[id].textContent = "等待开始";
      else if (state.phase === "complete") statusNodes[id].textContent = "一起完成";
      else if (state.phase === "card-back") statusNodes[id].textContent = isActive ? "下一张先说" : "准备倾听";
      else if (state.phase === "settle") statusNodes[id].textContent = "都已说完";
      else statusNodes[id].textContent = isActive ? "正在回答" : "正在倾听";
    }
  }

  function renderCard() {
    theme.hidden = true;
    theme.textContent = "";
    kicker.textContent = "";

    if (state.phase === "intro") {
      kicker.textContent = "今晚，留一点不被打断的时间";
      question.textContent = "把六张卡慢慢聊完，也可以随时换一张。";
      speakerCopy.textContent = "准备好，就从第一张开始";
      card.setAttribute("aria-label", "靠近一点开始说明");
      return;
    }

    if (state.phase === "complete") {
      kicker.textContent = state.endReason === "deck-exhausted" ? "今晚先聊到这里" : "六张卡 · 已完成";
      question.textContent = state.endReason === "deck-exhausted"
        ? "愿意停下来听彼此，本身就是一次靠近。"
        : "六张话，都被认真接住了。";
      speakerCopy.textContent = "没有输赢，也不需要总结";
      card.setAttribute("aria-label", "靠近一点完成页");
      return;
    }

    if (state.phase === "card-back") {
      kicker.textContent = `今晚的第 ${state.completedIds.length + 1} 张`;
      question.textContent = "等两个人都准备好，再一起翻开。";
      speakerCopy.textContent = `${playerName(state.firstSpeaker)}先说`;
      card.setAttribute("aria-label", `第 ${state.completedIds.length + 1} 张卡背，问题尚未显示`);
      return;
    }

    const currentCard = logic.getCurrentCard(state, logic.CARDS);
    if (!currentCard) {
      question.textContent = "这张卡暂时没有找到，请换一张。";
      speakerCopy.textContent = "不会计入完成";
      card.setAttribute("aria-label", "谈话卡读取失败");
      return;
    }

    theme.hidden = false;
    theme.textContent = themeLabel(currentCard.theme);
    question.textContent = currentCard.question;
    card.setAttribute("aria-label", `${theme.textContent}主题谈话卡`);
    if (state.phase === "first-speaking") {
      speakerCopy.textContent = `${playerName(state.currentSpeaker)}先说`;
    } else if (state.phase === "second-speaking") {
      speakerCopy.textContent = `轮到${playerName(state.currentSpeaker)}`;
    } else {
      speakerCopy.textContent = "两个人都说完了";
    }
  }

  function renderActions() {
    skipAction.hidden = !["first-speaking", "second-speaking", "settle"].includes(state.phase);
    if (state.phase === "intro") primaryAction.textContent = "开始靠近";
    else if (state.phase === "card-back") primaryAction.textContent = "翻开这张";
    else if (state.phase === "first-speaking") primaryAction.textContent = "我说完了";
    else if (state.phase === "second-speaking") primaryAction.textContent = "我也说完了";
    else if (state.phase === "settle") primaryAction.textContent = "收好这张";
    else primaryAction.textContent = "再聊六张";
  }

  function announceTransition() {
    if (state.phase === "card-back") announcement.textContent = `第 ${state.completedIds.length + 1} 张卡已就位，问题尚未显示。`;
    else if (state.phase === "first-speaking") {
      const currentCard = logic.getCurrentCard(state, logic.CARDS);
      announcement.textContent = currentCard
        ? `问题已翻开：${currentCard.question} 由${playerName(state.currentSpeaker)}先说。`
        : `问题已翻开，由${playerName(state.currentSpeaker)}先说。`;
    }
    else if (state.phase === "second-speaking") announcement.textContent = `已换席，轮到${playerName(state.currentSpeaker)}回答。`;
    else if (state.phase === "settle") announcement.textContent = "两个人都说完了，可以收好这张。";
    else if (state.phase === "complete") announcement.textContent = "六张卡已经完成。";
    else announcement.textContent = "会话已经重新开始。";
  }

  function playerName(id) {
    return state.players[id] || (id === "a" ? "A 席" : "B 席");
  }

  function themeLabel(id) {
    const found = logic.THEMES.find((item) => item.id === id);
    return found ? found.label : "聊一聊";
  }

  function randomIndex(max) {
    if (!Number.isInteger(max) || max <= 1) return 0;
    const cryptoObject = globalThis.crypto;
    if (cryptoObject && typeof cryptoObject.getRandomValues === "function") {
      const range = 0x100000000;
      const limit = range - (range % max);
      const value = new Uint32Array(1);
      do cryptoObject.getRandomValues(value);
      while (value[0] >= limit);
      return value[0] % max;
    }
    fallbackSeed ^= fallbackSeed << 13;
    fallbackSeed ^= fallbackSeed >>> 17;
    fallbackSeed ^= fallbackSeed << 5;
    fallbackSeed >>>= 0;
    return fallbackSeed % max;
  }

  function initialFallbackSeed() {
    const time = Date.now() >>> 0;
    const fineTime = Number.isFinite(globalThis.performance?.now())
      ? Math.floor(globalThis.performance.now() * 1000) >>> 0
      : 0x6d2b79f5;
    return (time ^ fineTime ^ 0xa5a5a5a5) >>> 0 || 0x6d2b79f5;
  }
})();
