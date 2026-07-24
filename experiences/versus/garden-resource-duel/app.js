(function () {
  "use strict";

  const logic = globalThis.GardenResourceDuelLogic;
  const configApi = globalThis.GardenResourceDuelConfig;
  const app = document.getElementById("app");
  const content = document.getElementById("app-content");
  const liveRegion = document.getElementById("live-region");

  if (!logic || !configApi || !app || !content || !liveRegion) {
    const fallback = document.createElement("p");
    fallback.className = "boot-error";
    fallback.textContent = "页面文件未完整加载。请确认 config.js、logic.js 和 app.js 位于同一目录。";
    if (content) content.replaceChildren(fallback);
    return;
  }

  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, configApi.composeResultNote);
  const cardCopy = Object.freeze({
    sun: Object.freeze({
      name: "阳光",
      symbol: "☀",
      detail: "当前需要阳光时，得到本轮花瓣。",
    }),
    water: Object.freeze({
      name: "雨露",
      symbol: "◇",
      detail: "当前需要雨露时，得到本轮花瓣。",
    }),
    pest: Object.freeze({
      name: "虫害",
      symbol: "···",
      detail: "挡住对方本轮匹配资源；自己不得分。",
    }),
  });
  const phaseCopy = Object.freeze({
    intro: "准备",
    season: "看季节",
    handoff: "交接屏幕",
    choosing: "秘密藏牌",
    "ready-to-reveal": "等待揭晓",
    "round-result": "本轮结果",
    "match-result": "本局结果",
  });

  let state = logic.createInitialState();
  let draftCard = null;
  let sharedPublic = null;

  document.title = `${config.title} · Two of Us`;

  function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeButton(label, className, onClick) {
    const element = makeElement("button", className, label);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
  }

  function makePhaseTitle(text) {
    const heading = makeElement("h2", "phase-title", text);
    heading.id = "phase-title";
    heading.tabIndex = -1;
    return heading;
  }

  function copyHands(hands) {
    return hands.map((hand) => ({
      sun: hand.sun,
      water: hand.water,
      pest: hand.pest,
    }));
  }

  function copyHistory(history) {
    return history.map((record) => ({
      roundIndex: record.roundIndex,
      seasonNeed: record.seasonNeed,
      petalValue: record.petalValue,
      firstSeat: record.firstSeat,
      cards: record.cards.slice(),
      blocked: record.blocked.slice(),
      earned: record.earned.slice(),
      scoreBefore: record.scoreBefore.slice(),
      scoreAfter: record.scoreAfter.slice(),
    }));
  }

  function refreshSharedPublic(view) {
    if (!sharedPublic) {
      sharedPublic = {
        scores: [0, 0],
        hands: null,
        history: [],
      };
    }
    if (Array.isArray(view.scores)) sharedPublic.scores = view.scores.slice();
    if (Array.isArray(view.hands)) sharedPublic.hands = copyHands(view.hands);
    if (Array.isArray(view.history)) sharedPublic.history = copyHistory(view.history);
  }

  function currentView() {
    const publicView = logic.getPublicView(state);
    if (publicView.phase === "choosing") {
      return logic.getPlayerView(state, publicView.activeSeat);
    }
    return publicView;
  }

  function dispatch(action, options) {
    state = logic.reduceGardenResourceDuel(state, action);
    render(options);
  }

  function makeSeed() {
    const values = new Uint32Array(1);
    try {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(values);
      }
    } catch {
      values[0] = 0;
    }
    return values[0] === 0 ? 0xA341316C : values[0];
  }

  function announce(message) {
    liveRegion.textContent = message || "";
  }

  function focusAfterRender(target) {
    let focusTarget = null;
    if (target === "first-card") focusTarget = content.querySelector(".card-choice");
    if (target === "confirm") focusTarget = document.getElementById("confirm-choice");
    if (target === "primary") focusTarget = document.getElementById("phase-primary");
    if (!focusTarget) focusTarget = document.getElementById("phase-title");
    if (focusTarget) focusTarget.focus();
  }

  function clearSecretSurface() {
    draftCard = null;
    content.replaceChildren();
  }

  function coverChoosing(message) {
    const view = logic.getPublicView(state);
    draftCard = null;
    if (view.phase !== "choosing") return;
    clearSecretSurface();
    state = logic.reduceGardenResourceDuel(state, {
      type: "COVER",
      playerIndex: view.activeSeat,
    });
    render({
      announcement: message || "选择已遮住，请重新接管屏幕。",
      focus: "primary",
    });
  }

  function selectDraft(card) {
    const view = currentView();
    if (view.phase !== "choosing"
      || !view.availableCards.some((entry) => entry.card === card)) return;
    draftCard = card;
    render({ focus: "confirm" });
  }

  function confirmDraft() {
    const view = currentView();
    if (view.phase !== "choosing" || !draftCard) return;
    const chosenCard = draftCard;
    const playerIndex = view.activeSeat;
    clearSecretSurface();
    state = logic.reduceGardenResourceDuel(state, {
      type: "SEAL_CARD",
      playerIndex,
      card: chosenCard,
    });
    const nextView = logic.getPublicView(state);
    render({
      announcement: nextView.phase === "ready-to-reveal"
        ? "两位都已选好，可以共同揭晓。"
        : "一位已经选好，请把屏幕交给下一位。",
      focus: nextView.phase === "handoff" ? "primary" : "phase",
    });
  }

  function createHeader(view) {
    const header = makeElement("header", "quiet-header");
    const heading = makeElement("h1", "work-title", config.title);
    const status = makeElement("p", "phase-status", phaseCopy[view.phase]);
    header.append(heading, status);
    return header;
  }

  function seasonRecordFor(view) {
    if (view.phase === "round-result") return view.roundRecord;
    if (view.phase === "match-result") {
      return view.history.length > 0 ? view.history[view.history.length - 1] : null;
    }
    return view;
  }

  function createSeasonCard(view) {
    const card = makeElement("section", "season-card");
    card.setAttribute("aria-label", view.phase === "match-result" ? "本局完成" : "当前季节");
    if (view.phase === "match-result") {
      const count = view.result.completedRounds;
      card.append(
        makeElement("p", "season-round", `本局完成 · ${count} / ${logic.ROUND_COUNT} 轮`),
        makeElement("p", "season-need", "两盆花都留下了这一局的花瓣"),
        makeElement("p", "season-value", `最终比分 ${view.scores[0]} : ${view.scores[1]}`),
      );
      return card;
    }

    const record = seasonRecordFor(view);
    const need = cardCopy[record.seasonNeed];
    card.classList.add(`season-${record.seasonNeed}`);
    card.append(
      makeElement("p", "season-round", `第 ${record.roundIndex + 1} / ${logic.ROUND_COUNT} 轮`),
      makeElement("p", "season-need", `${need.symbol} 这一次，需要${need.name}`),
      makeElement("p", "season-value", `本轮值 ${record.petalValue} 片花瓣`),
    );
    return card;
  }

  function createFlower(score, displayBloom, glow) {
    const flower = makeElement("div", "flower");
    flower.setAttribute("aria-hidden", "true");
    const grownPetals = displayBloom ? logic.BLOOM_TARGET : Math.min(score, logic.BLOOM_TARGET);
    if (displayBloom) flower.classList.add("is-blooming");
    if (glow) flower.classList.add("is-glowing");

    const blossom = makeElement("div", "blossom");
    for (let index = 0; index < logic.BLOOM_TARGET; index += 1) {
      const petal = makeElement(
        "span",
        `petal petal-${index + 1}${index < grownPetals ? " is-grown" : ""}`,
      );
      blossom.append(petal);
    }
    blossom.append(makeElement("span", "flower-heart"));
    flower.append(
      blossom,
      makeElement("span", "stem"),
      makeElement("span", "leaf leaf-left"),
      makeElement("span", "leaf leaf-right"),
      makeElement("span", "flower-pot"),
    );
    return flower;
  }

  function celebrationFor(view, playerIndex) {
    if (view.phase !== "match-result") return { bloom: false, glow: false };
    const result = view.result;
    if (result.outcome === "draw") {
      return {
        bloom: result.reason === "simultaneous-bloom",
        glow: true,
      };
    }
    return {
      bloom: result.winnerIndex === playerIndex,
      glow: result.winnerIndex === playerIndex,
    };
  }

  function createGarden(view, playerIndex) {
    const score = sharedPublic ? sharedPublic.scores[playerIndex] : 0;
    const celebration = celebrationFor(view, playerIndex);
    const garden = makeElement("figure", `player-garden player-${playerIndex + 1}`);
    const caption = makeElement(
      "figcaption",
      "garden-caption",
      `${config.playerNames[playerIndex]} · ${score} / ${logic.BLOOM_TARGET} 花瓣`,
    );
    const progress = makeElement("progress", "garden-progress");
    progress.max = logic.BLOOM_TARGET;
    progress.value = Math.min(score, logic.BLOOM_TARGET);
    progress.setAttribute(
      "aria-label",
      `${config.playerNames[playerIndex]}的花瓣进度：${score} / ${logic.BLOOM_TARGET}`,
    );
    garden.append(
      caption,
      createFlower(score, celebration.bloom, celebration.glow),
      progress,
    );
    return garden;
  }

  function createLedger(view) {
    const ledger = makeElement("section", "public-ledger");
    ledger.setAttribute("aria-label", "公开花园状态");
    const scores = sharedPublic ? sharedPublic.scores : [0, 0];
    const scoreLine = makeElement("div", "score-line");
    for (let player = 0; player < logic.PLAYER_COUNT; player += 1) {
      const item = makeElement("p", "score-item");
      item.append(
        makeElement("span", "score-name", config.playerNames[player]),
        makeElement("strong", "score-number", `${scores[player]} / ${logic.BLOOM_TARGET}`),
      );
      scoreLine.append(item);
    }
    ledger.append(scoreLine);

    if (sharedPublic && sharedPublic.hands && view.phase !== "choosing") {
      const stocks = makeElement("div", "hand-summary");
      for (let player = 0; player < logic.PLAYER_COUNT; player += 1) {
        const hand = sharedPublic.hands[player];
        stocks.append(makeElement(
          "p",
          "hand-line",
          `${config.playerNames[player]}剩余：阳光 ${hand.sun} · 雨露 ${hand.water} · 虫害 ${hand.pest}`,
        ));
      }
      ledger.append(stocks);
    }
    return ledger;
  }

  function createIntro(view) {
    const shell = makeElement("div", "experience experience-intro");
    shell.append(createHeader(view));

    const introStage = makeElement("section", "intro-stage");
    const panel = makeElement("div", "phase-panel phase-intro");
    panel.append(
      makePhaseTitle(config.title),
      makeElement("p", "intro-subtitle", config.subtitle),
      makeElement("p", "intro-copy", config.intro),
    );
    const rules = makeElement("ul", "rule-list");
    [
      "每人有两张阳光、两张雨露和两张虫害，牌揭晓后就会用掉。",
      "阳光或雨露匹配当前季节，就得到这一轮的花瓣。",
      "虫害只挡住对方这一轮，不会拿走已经长出的花瓣。",
    ].forEach((rule) => rules.append(makeElement("li", "", rule)));
    const start = makeButton("开始这局", "primary-button", () => {
      dispatch(
        { type: "START_MATCH", seed: makeSeed() },
        { announcement: "新的一局开始，第一轮季节已经公开。", focus: "phase" },
      );
    });
    start.id = "phase-primary";
    panel.append(rules, start);

    introStage.append(
      createGarden(view, 0),
      panel,
      createGarden(view, 1),
    );
    shell.append(introStage);
    return shell;
  }

  function createSeasonPhase(view) {
    const panel = makeElement("section", "phase-panel phase-season");
    panel.append(
      makePhaseTitle(`第 ${view.roundIndex + 1} 轮，先看看季节`),
      makeElement(
        "p",
        "phase-copy",
        `${config.playerNames[view.firstSeat]}先藏牌。选择顺序不影响联合结算。`,
      ),
    );
    const button = makeButton(
      `开始藏第 ${view.roundIndex + 1} 轮`,
      "primary-button",
      () => dispatch(
        { type: "BEGIN_ROUND" },
        {
          announcement: `请把屏幕交给${config.playerNames[view.firstSeat]}。`,
          focus: "primary",
        },
      ),
    );
    button.id = "phase-primary";
    panel.append(button);
    return panel;
  }

  function createHandoffPhase(view) {
    const panel = makeElement("section", "phase-panel phase-handoff");
    panel.append(
      makePhaseTitle(`把屏幕交给${config.playerNames[view.activeSeat]}`),
      makeElement(
        "p",
        "phase-copy",
        `${config.playerNames[view.activeSeat]}接好后再继续。前一位的选择不会出现在这里。`,
      ),
    );
    const button = makeButton("我接好了", "primary-button", () => {
      dispatch(
        { type: "TAKE_SEAT", playerIndex: view.activeSeat },
        { focus: "first-card" },
      );
    });
    button.id = "phase-primary";
    panel.append(button);
    return panel;
  }

  function createCardChoice(entry, index) {
    const copy = cardCopy[entry.card];
    const selected = draftCard === entry.card;
    const button = makeButton(
      `${copy.symbol} ${copy.name} · 剩 ${entry.remainingAtRoundStart} 张`,
      `card-choice card-${entry.card}`,
      () => selectDraft(entry.card),
    );
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.setAttribute(
      "aria-label",
      `${copy.name}，剩 ${entry.remainingAtRoundStart} 张。${copy.detail}`,
    );
    const hint = makeElement("span", "card-detail", `${index + 1} · ${copy.detail}`);
    button.append(hint);
    return button;
  }

  function createChoosingPhase(view) {
    const panel = makeElement("section", "phase-panel phase-choosing");
    panel.append(
      makePhaseTitle(`${config.playerNames[view.activeSeat]}，藏一张牌`),
      makeElement(
        "p",
        "phase-copy",
        `当前需要${cardCopy[view.seasonNeed].name}，本轮值 ${view.petalValue} 片花瓣。`,
      ),
    );

    const cards = makeElement("div", "card-grid");
    view.availableCards.forEach((entry, index) => {
      cards.append(createCardChoice(entry, index));
    });

    const actions = makeElement("div", "phase-actions");
    const confirm = makeButton("确认这张", "primary-button", confirmDraft);
    confirm.id = "confirm-choice";
    confirm.disabled = draftCard === null;
    const cover = makeButton(
      "先遮住",
      "secondary-button",
      () => coverChoosing("选择已遮住，请重新接管屏幕。"),
    );
    actions.append(confirm, cover);

    const publicRounds = sharedPublic ? sharedPublic.history.length : 0;
    panel.append(
      cards,
      actions,
      makeElement("p", "history-summary", `已有 ${publicRounds} 轮公开记录。`),
    );
    return panel;
  }

  function createReadyPhase() {
    const panel = makeElement("section", "phase-panel phase-ready");
    panel.append(
      makePhaseTitle("两张牌都藏好了"),
      makeElement("p", "phase-copy", "把屏幕放在两个人都看得到的地方，再一起揭晓。"),
    );
    const backs = makeElement("div", "card-backs");
    for (let index = 0; index < logic.PLAYER_COUNT; index += 1) {
      const back = makeElement("span", "card-back");
      back.setAttribute("aria-label", `第 ${index + 1} 张已封存的牌`);
      backs.append(back);
    }
    const reveal = makeButton(
      "我们一起揭晓",
      "primary-button",
      () => dispatch(
        { type: "REVEAL_ROUND" },
        { announcement: "本轮牌面和结果已经公开。", focus: "phase" },
      ),
    );
    reveal.id = "phase-primary";
    panel.append(backs, reveal);
    return panel;
  }

  function roundOutcomeText(record) {
    const pestPlayers = [];
    for (let player = 0; player < logic.PLAYER_COUNT; player += 1) {
      if (record.cards[player] === "pest") pestPlayers.push(config.playerNames[player]);
    }
    const pestText = pestPlayers.length > 0
      ? `${pestPlayers.join("和")}打出虫害。`
      : "这轮没有虫害。";
    return `${pestText}${config.playerNames[0]}得到 ${record.earned[0]} 片，`
      + `${config.playerNames[1]}得到 ${record.earned[1]} 片。`;
  }

  function createRevealedCards(record) {
    const cards = makeElement("div", "revealed-cards");
    for (let player = 0; player < logic.PLAYER_COUNT; player += 1) {
      const card = record.cards[player];
      const copy = cardCopy[card];
      const item = makeElement("article", `revealed-card card-${card}`);
      item.append(
        makeElement("p", "revealed-owner", config.playerNames[player]),
        makeElement("strong", "revealed-name", `${copy.symbol} ${copy.name}`),
        makeElement("p", "revealed-earned", `本轮 +${record.earned[player]} 花瓣`),
      );
      cards.append(item);
    }
    return cards;
  }

  function createRoundResultPhase(view) {
    const panel = makeElement("section", "phase-panel phase-round-result");
    panel.append(
      makePhaseTitle(`第 ${view.roundRecord.roundIndex + 1} 轮公开结果`),
      createRevealedCards(view.roundRecord),
      makeElement("p", "result-copy", roundOutcomeText(view.roundRecord)),
    );
    const button = makeButton(
      "看看下一个季节",
      "primary-button",
      () => dispatch(
        { type: "NEXT_ROUND" },
        {
          announcement: `第 ${view.roundIndex + 2} 轮季节已经公开。`,
          focus: "phase",
        },
      ),
    );
    button.id = "phase-primary";
    panel.append(button);
    return panel;
  }

  function matchTitle(view) {
    const result = view.result;
    if (result.outcome === "draw") {
      return result.reason === "simultaneous-bloom"
        ? "这一轮，两朵刚好一起开"
        : "六个季节走完，两盆花一样近";
    }
    if (result.reason === "bloom") {
      return `${config.playerNames[result.winnerIndex]}的花先开了`;
    }
    return `${config.playerNames[result.winnerIndex]}留下了更多花瓣`;
  }

  function createMatchResultPhase(view) {
    const panel = makeElement("section", "phase-panel phase-match-result");
    const title = makePhaseTitle(matchTitle(view));
    const note = logic.composeConfiguredResultNote(config, view.result);
    const score = makeElement(
      "p",
      "final-score",
      `${config.playerNames[0]} ${view.scores[0]} : ${view.scores[1]} ${config.playerNames[1]}`,
    );
    const seed = makeElement("p", "seed-note");
    seed.append("复现 seed：", makeElement("code", "", String(view.seed)));
    const restart = makeButton(
      "再养一局",
      "primary-button",
      () => {
        sharedPublic = null;
        draftCard = null;
        dispatch(
          { type: "RESTART_MATCH" },
          { announcement: "已经回到开始页。", focus: "phase" },
        );
      },
    );
    restart.id = "phase-primary";
    panel.append(title, score, makeElement("p", "result-note", note), seed, restart);
    return panel;
  }

  function createPhasePanel(view) {
    if (view.phase === "season") return createSeasonPhase(view);
    if (view.phase === "handoff") return createHandoffPhase(view);
    if (view.phase === "choosing") return createChoosingPhase(view);
    if (view.phase === "ready-to-reveal") return createReadyPhase(view);
    if (view.phase === "round-result") return createRoundResultPhase(view);
    return createMatchResultPhase(view);
  }

  function createHistory(view) {
    const history = sharedPublic ? sharedPublic.history : [];
    if (view.phase === "choosing" || history.length === 0) return null;
    const section = makeElement("section", "public-history");
    section.append(makeElement("h2", "history-title", "已经公开的季节"));
    const list = makeElement("ol", "history-list");
    history.forEach((record) => {
      const item = makeElement("li", "history-entry");
      const need = cardCopy[record.seasonNeed].name;
      item.append(
        makeElement(
          "p",
          "history-round",
          `第 ${record.roundIndex + 1} 轮 · 需要${need} · 值 ${record.petalValue}`,
        ),
        makeElement(
          "p",
          "history-detail",
          `${config.playerNames[0]}：${cardCopy[record.cards[0]].name}，+${record.earned[0]}；`
            + `${config.playerNames[1]}：${cardCopy[record.cards[1]].name}，+${record.earned[1]}`,
        ),
      );
      if (record.cards.includes("pest")) {
        item.append(makeElement("p", "history-blocked", "虫害只影响了这一轮。"));
      }
      list.append(item);
    });
    section.append(list);
    return section;
  }

  function createGame(view) {
    const shell = makeElement("div", `experience experience-${view.phase}`);
    shell.append(
      createHeader(view),
      createSeasonCard(view),
      createLedger(view),
      createPhasePanel(view),
      createGarden(view, 0),
      createGarden(view, 1),
    );
    const history = createHistory(view);
    if (history) shell.append(history);
    return shell;
  }

  function render(options) {
    const settings = options || {};
    const view = currentView();
    refreshSharedPublic(view);
    app.dataset.phase = view.phase;
    const tree = view.phase === "intro" ? createIntro(view) : createGame(view);
    content.replaceChildren(tree);
    if (Object.hasOwn(settings, "announcement")) announce(settings.announcement);
    focusAfterRender(settings.focus || "phase");
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const view = logic.getPublicView(state);
      if (view.phase === "choosing") {
        event.preventDefault();
        coverChoosing("选择已遮住，请重新接管屏幕。");
      }
      return;
    }
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!["1", "2", "3"].includes(event.key)) return;
    const view = currentView();
    if (view.phase !== "choosing") return;
    const entry = view.availableCards[Number(event.key) - 1];
    if (!entry) return;
    event.preventDefault();
    selectDraft(entry.card);
  });

  globalThis.addEventListener("blur", () => coverChoosing());
  globalThis.addEventListener("pagehide", () => coverChoosing());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") coverChoosing();
  });

  render();
})();
