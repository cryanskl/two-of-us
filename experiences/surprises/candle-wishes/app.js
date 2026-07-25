(function (root) {
  "use strict";

  const WRONG_MESSAGE = "这一盏还没轮到。再看看眼前的线索。";
  const READY_MESSAGE = "五盏都点亮了。愿望已经准备好。";
  const COMPLETE_MESSAGE = "五个愿望已经收下。最后的话已展开。";
  const PREPARATION_MESSAGE = "暂时没准备好，请重新准备。";

  const main = document.querySelector(".experience");
  const heading = document.querySelector("h1");
  const instructions = document.querySelector(".instructions");
  const stage = document.querySelector(".candle-stage");
  const progress = document.querySelector(".progress-status");
  const primary = document.querySelector(".primary-action");
  const privacy = document.querySelector(".privacy-note");
  const liveRegion = document.querySelector(".live-region");

  let logic = null;
  let state = null;
  let view = null;
  let prepared = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function removeOptionalSections() {
    const wishes = main.querySelector(".revealed-wishes");
    const letter = main.querySelector(".final-letter");
    if (wishes) wishes.remove();
    if (letter) letter.remove();
  }

  function buildCake(intro) {
    const scene = element("div", intro ? "cake-scene cake-scene--intro" : "cake-scene");
    scene.setAttribute("aria-hidden", "true");

    const cake = element("div", "cake");
    cake.append(element("span", "cake-highlight"));
    scene.append(cake);
    return scene;
  }

  function buildCandle(candle, index, newlyLitId) {
    const item = element("li", "candle-item");
    const button = element(
      "button",
      `candle-button candle-button--${index + 1}${candle.lit ? " is-lit" : ""}` +
        `${candle.id === newlyLitId ? " is-newly-lit" : ""}`,
    );
    button.type = "button";
    button.dataset.candleId = candle.id;
    button.disabled = candle.disabled;
    button.setAttribute("aria-pressed", String(candle.lit));

    const label = element("span", "candle-label", candle.label);
    const candleArt = element("span", "candle-art");
    candleArt.setAttribute("aria-hidden", "true");
    candleArt.append(element("span", "flame"));
    candleArt.append(element("span", "wick"));
    candleArt.append(element("span", "candle-stick"));
    candleArt.append(element("span", "candle-holder"));

    const status = element("span", "candle-state", candle.lit ? "已点亮" : "未点亮");
    button.append(label, candleArt, status);
    button.addEventListener("click", function () {
      tryCandle(candle.id, button);
    });
    item.append(button);
    return item;
  }

  function renderStage(newlyLitId) {
    stage.replaceChildren();
    stage.hidden = false;
    stage.dataset.phase = view.phase;

    if (view.phase === "intro") {
      stage.append(buildCake(true));
      return;
    }

    if (view.phase === "lighting") {
      const cue = element("h2", "current-cue", view.currentCue);
      cue.id = "current-cue";
      cue.tabIndex = -1;
      stage.append(cue);
    }

    const list = element("ol", "candle-list");
    list.setAttribute("aria-label", "五支蜡烛");
    for (let index = 0; index < view.candles.length; index += 1) {
      list.append(buildCandle(view.candles[index], index, newlyLitId));
    }
    stage.append(list, buildCake(false));
  }

  function renderWishes() {
    if (!view.revealedWishes || view.revealedWishes.length === 0) return;
    const list = element("ol", "revealed-wishes");
    list.setAttribute("aria-label", "已经点亮的愿望");
    for (const wish of view.revealedWishes) {
      const item = element("li", "wish");
      item.append(
        element("span", "wish-label", wish.label),
        element("span", "wish-text", wish.wish),
      );
      list.append(item);
    }
    primary.before(list);
  }

  function renderFinalLetter() {
    if (!view.result) return;
    const letter = element("section", "final-letter");
    letter.setAttribute("aria-labelledby", "final-title");
    const recipient = element("p", "recipient-line", view.result.recipientLine);
    const title = element("h2", "final-title", view.result.title);
    title.id = "final-title";
    title.tabIndex = -1;
    const message = element("p", "final-message", view.result.message);
    const signature = element("p", "signature", view.result.signature);
    letter.append(recipient, title, message, signature);
    primary.before(letter);
  }

  function render(newlyLitId) {
    removeOptionalSections();
    main.dataset.phase = view.phase;
    heading.textContent = view.publicTitle;
    instructions.textContent = view.instructions;
    progress.textContent = view.progressText;
    progress.hidden = false;
    privacy.textContent = view.privacyText;
    privacy.hidden = false;
    liveRegion.hidden = false;
    renderStage(newlyLitId);
    renderWishes();
    renderFinalLetter();

    primary.hidden = !view.primaryAction.visible;
    primary.disabled = view.primaryAction.disabled;
    primary.textContent = view.primaryAction.label;
    if (view.primaryAction.action) {
      primary.dataset.action = view.primaryAction.action;
    } else {
      delete primary.dataset.action;
    }
  }

  function renderPreparationFailure() {
    prepared = false;
    removeOptionalSections();
    main.dataset.phase = "unavailable";
    stage.replaceChildren();
    stage.hidden = true;
    progress.textContent = PREPARATION_MESSAGE;
    progress.hidden = false;
    primary.hidden = false;
    primary.disabled = false;
    primary.textContent = "重新准备";
    primary.dataset.action = "PREPARE";
    privacy.hidden = true;
    liveRegion.hidden = false;
    liveRegion.textContent = PREPARATION_MESSAGE;
  }

  function prepare() {
    try {
      logic = root.CANDLE_WISHES_LOGIC;
      if (!logic || typeof logic.createInitialState !== "function" ||
          typeof logic.getPublicView !== "function" ||
          typeof logic.reduce !== "function") {
        throw new TypeError("logic unavailable");
      }
      state = logic.createInitialState(root.CANDLE_WISHES_CONFIG);
      view = logic.getPublicView(state);
      if (!view) throw new TypeError("view unavailable");
      prepared = true;
      liveRegion.textContent = "";
      render();
    } catch {
      renderPreparationFailure();
    }
  }

  function focusElement(selector) {
    const target = document.querySelector(selector);
    if (target) target.focus({ preventScroll: true });
  }

  function tryCandle(id, clickedButton) {
    if (!prepared || view.phase !== "lighting") return;
    const publicCandle = view.candles.find(function (candle) {
      return candle.id === id;
    });
    if (!publicCandle || publicCandle.lit || publicCandle.disabled) return;

    const previousState = state;
    const nextState = logic.reduce(previousState, { type: "TRY_CANDLE", id });
    if (nextState === previousState) {
      liveRegion.textContent = WRONG_MESSAGE;
      clickedButton.focus({ preventScroll: true });
      return;
    }

    state = nextState;
    view = logic.getPublicView(state);
    if (!view) {
      renderPreparationFailure();
      return;
    }

    render(id);
    if (view.phase === "ready-to-receive") {
      liveRegion.textContent = READY_MESSAGE;
      focusElement(".primary-action");
      return;
    }

    const wish = view.revealedWishes[view.revealedWishes.length - 1];
    liveRegion.textContent = `第 ${view.revealedWishes.length} 盏已点亮：${wish.wish}`;
    focusElement("#current-cue");
  }

  function handlePrimaryAction() {
    if (!prepared) {
      prepare();
      focusElement(".primary-action");
      return;
    }

    const action = view.primaryAction.action;
    if (!action || view.primaryAction.disabled) return;
    const nextState = logic.reduce(state, { type: action });
    if (nextState === state) return;
    state = nextState;
    view = logic.getPublicView(state);
    if (!view) {
      renderPreparationFailure();
      return;
    }

    render();
    if (action === "START") {
      liveRegion.textContent = "";
      focusElement("#current-cue");
    } else if (action === "REVEAL") {
      liveRegion.textContent = COMPLETE_MESSAGE;
      focusElement("#final-title");
    } else if (action === "RESTART") {
      liveRegion.textContent = "";
      focusElement(".primary-action");
    }
  }

  primary.addEventListener("click", handlePrimaryAction);
  prepare();
})(typeof globalThis !== "undefined" ? globalThis : this);
