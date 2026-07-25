(function () {
  "use strict";

  const logic = globalThis.COMPLIMENT_REELS_LOGIC;
  const rawConfig = globalThis.COMPLIMENT_REELS_CONFIG;
  const app = document.querySelector(".compliment-reels");
  const button = document.querySelector(".pull-handle");
  const stageCopy = document.querySelector(".stage-copy");
  const liveRegion = document.querySelector(".live-region");
  const reelElements = Array.from(document.querySelectorAll(".reel"));
  const reducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  const heldActivationKeys = new Set();
  const POINTER_COOLDOWN = 350;

  let state = logic ? logic.createInitialState() : null;
  let preparationFailed = true;
  let lastPointerTimestamp = null;
  let keyboardCycleAccepted = false;
  let runningAnimations = [];
  let animationTimer = 0;
  let restoreButtonFocus = false;
  let output = null;
  let historyStrip = null;
  let jackpotLetter = null;
  let fallbackCopy = null;
  let announcedRevision = null;
  let announcementGeneration = 0;

  if (logic && app && button) armRound();

  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.repeat || heldActivationKeys.has(event.key)) {
      event.preventDefault();
      return;
    }
    heldActivationKeys.add(event.key);
  });

  button.addEventListener("keyup", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    heldActivationKeys.delete(event.key);
    queueMicrotask(() => {
      if (heldActivationKeys.size === 0) keyboardCycleAccepted = false;
    });
  });
  button.addEventListener("blur", clearHeldKeys);

  button.addEventListener("click", (event) => {
    if (!acceptActivation(event)) return;
    const accepted = activate();
    if (accepted && event.detail > 0) lastPointerTimestamp = event.timeStamp;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearHeldKeys();
      restoreButtonFocus = false;
      suspendSpin();
    }
  });
  globalThis.addEventListener("pagehide", () => {
    clearHeldKeys();
    restoreButtonFocus = false;
    suspendSpin();
  });
  globalThis.addEventListener("blur", () => {
    clearHeldKeys();
    restoreButtonFocus = false;
    suspendSpin();
  });
  reducedMotion.addEventListener?.("change", (event) => {
    if (event.matches) suspendSpin();
  });

  function acceptActivation(event) {
    if (event.detail === 0) {
      if (keyboardCycleAccepted) return false;
      keyboardCycleAccepted = true;
      if (heldActivationKeys.size === 0) {
        queueMicrotask(() => {
          keyboardCycleAccepted = false;
        });
      }
      return true;
    }
    if (event.detail > 1 || !Number.isFinite(event.timeStamp)) return false;
    if (lastPointerTimestamp !== null
      && (event.timeStamp < lastPointerTimestamp
        || event.timeStamp - lastPointerTimestamp < POINTER_COOLDOWN)) {
      return false;
    }
    return true;
  }

  function activate() {
    if (!logic || !state) return false;
    let view = logic.getPublicView(state);
    if (view.phase === "intro") {
      return armRound();
    }
    if (view.canRestart) {
      const restarted = logic.reduce(state, { type: "RESTART" });
      if (restarted === state || logic.getPublicView(restarted).phase !== "intro") return false;
      state = restarted;
      armRound();
      return true;
    }
    if (!view.canPull) return false;

    restoreButtonFocus = document.activeElement === button;
    const next = logic.reduce(state, { type: "PULL" });
    if (next === state) return false;
    state = next;
    view = logic.getPublicView(state);
    render(view);
    beginSpin(view.animationToken);
    return true;
  }

  function armRound() {
    cancelAnimations();
    let action = null;
    try {
      const entropy = Array.from(
        globalThis.crypto.getRandomValues(new Uint32Array(logic.ENTROPY_LENGTH)),
      );
      action = logic.createArmAction(rawConfig, entropy, "crypto");
    } catch (_error) {
      action = null;
    }
    if (!action) {
      action = logic.createArmAction(
        rawConfig,
        Array.from(logic.FALLBACK_ENTROPY),
        "fallback",
      );
    }

    if (action) state = logic.reduce(state, action);
    const view = logic.getPublicView(state);
    preparationFailed = view.phase !== "ready";
    render(view);
    if (!preparationFailed) button.focus({ preventScroll: true });
    return !preparationFailed;
  }

  function beginSpin(token) {
    if (token === null) return;
    if (reducedMotion.matches) {
      queueMicrotask(() => finishSpin(token));
      return;
    }
    if (typeof reelElements[0]?.querySelector(".reel-window").animate !== "function") {
      queueMicrotask(() => finishSpin(token));
      return;
    }

    cancelAnimations();
    const durations = [380, 440, 500];
    runningAnimations = reelElements.map((reel, index) => (
      reel.querySelector(".reel-window").animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-10px)", offset: 0.35 },
          { transform: "translateY(8px)", offset: 0.7 },
          { transform: "translateY(0)" },
        ],
        {
          duration: durations[index],
          delay: index * 34,
          easing: "cubic-bezier(.3,.7,.25,1)",
        },
      )
    ));
    runningAnimations[runningAnimations.length - 1].finished.then(
      () => finishSpin(token),
      () => {},
    );
    animationTimer = globalThis.setTimeout(() => finishSpin(token), 620);
  }

  function finishSpin(token) {
    if (!logic || !state) return;
    const view = logic.getPublicView(state);
    if (!view.isSpinning || view.animationToken !== token) return;
    cancelAnimations();
    state = logic.reduce(state, { type: "SETTLE", spinToken: token });
    render(logic.getPublicView(state));
    restoreFocusAfterSettlement();
  }

  function suspendSpin() {
    if (!logic || !state) return;
    const view = logic.getPublicView(state);
    if (!view.isSpinning) return;
    cancelAnimations();
    state = logic.reduce(state, { type: "SUSPEND" });
    render(logic.getPublicView(state));
    restoreFocusAfterSettlement();
  }

  function cancelAnimations() {
    globalThis.clearTimeout(animationTimer);
    animationTimer = 0;
    for (const animation of runningAnimations) animation.cancel();
    runningAnimations = [];
  }

  function restoreFocusAfterSettlement() {
    if (restoreButtonFocus && !document.hidden && document.hasFocus()) {
      button.focus({ preventScroll: true });
    }
    restoreButtonFocus = false;
  }

  function clearHeldKeys() {
    heldActivationKeys.clear();
    keyboardCycleAccepted = false;
  }

  function render(view) {
    app.dataset.phase = view.phase;
    app.classList.toggle("is-preparation-failed", preparationFailed);

    for (let index = 0; index < reelElements.length; index += 1) {
      const reel = reelElements[index];
      const column = view.columns[index];
      const text = reel.querySelector(".reel-text");
      const mark = reel.querySelector(".paper-mark");
      text.textContent = column.text || "";
      text.hidden = column.text === null;
      mark.hidden = column.text !== null;
    }

    renderOutput(view);
    renderStage(view);
    renderHistory(view);
    renderJackpot(view);
    renderButton(view);
    renderFallback(view);
    if ((view.phase === "result" || view.phase === "jackpot")
      && announcedRevision !== view.revision) {
      announcedRevision = view.revision;
      announceSettlement(view);
    }
  }

  function renderOutput(view) {
    if (view.praise === null) {
      output?.remove();
      output = null;
      return;
    }
    if (!output) {
      output = document.createElement("output");
      output.className = "current-praise";
      output.setAttribute("aria-live", "off");
      app.insertBefore(output, stageCopy);
    }
    output.textContent = view.praise;
  }

  function renderStage(view) {
    let copy = "正在把这一轮排好。";
    if (view.phase === "ready") copy = "第一句，等你来拉。";
    if (view.phase === "spinning") copy = "正在把三段心意排在一起。";
    if (view.phase === "result") copy = "这一句已经印好了。";
    if (view.phase === "jackpot") copy = "特别同频到了，这些都是真心话。";
    stageCopy.textContent = copy;
    if (view.phase === "intro" && preparationFailed) {
      const diagnostic = document.createElement("span");
      diagnostic.className = "failure-diagnostic";
      diagnostic.textContent = "暂时没排好，请重试准备";
      stageCopy.append(diagnostic);
    }
  }

  function renderHistory(view) {
    if (view.revealedPraises.length === 0) {
      historyStrip?.remove();
      historyStrip = null;
      return;
    }
    if (!historyStrip) {
      historyStrip = document.createElement("ol");
      historyStrip.className = "history-strip";
      historyStrip.setAttribute("aria-label", "本轮已经印好的夸奖");
      app.insertBefore(historyStrip, jackpotLetter || button);
    }
    historyStrip.replaceChildren();
    for (const phrase of view.revealedPraises) {
      const item = document.createElement("li");
      item.textContent = phrase;
      historyStrip.append(item);
    }
  }

  function renderJackpot(view) {
    if (!view.isJackpot) {
      jackpotLetter?.remove();
      jackpotLetter = null;
      return;
    }
    if (!jackpotLetter) {
      jackpotLetter = document.createElement("section");
      jackpotLetter.className = "jackpot-letter";
      jackpotLetter.setAttribute("aria-label", "特别同频私人结语");
      app.insertBefore(jackpotLetter, button);
    }
    jackpotLetter.replaceChildren();
    const star = document.createElement("span");
    const title = document.createElement("h2");
    const note = document.createElement("p");
    star.className = "jackpot-star";
    star.setAttribute("aria-hidden", "true");
    star.textContent = "★";
    title.textContent = "特别同频";
    note.textContent = view.jackpotNote;
    jackpotLetter.append(star, title, note);
  }

  function renderButton(view) {
    let copy = "重试准备";
    if (view.phase === "ready") copy = "拉一下，夸夸你";
    if (view.phase === "spinning") copy = "正在组合…";
    if (view.phase === "result") copy = "再拉一句";
    if (view.phase === "jackpot") copy = "再夸一局";
    button.textContent = copy;
    button.disabled = view.isSpinning;
  }

  function renderFallback(view) {
    if (view.randomMode !== "fallback") {
      fallbackCopy?.remove();
      fallbackCopy = null;
      return;
    }
    if (!fallbackCopy) {
      fallbackCopy = document.createElement("p");
      fallbackCopy.className = "fallback-copy";
      app.insertBefore(fallbackCopy, liveRegion);
    }
    fallbackCopy.textContent = "本机随机不可用，本轮使用固定惊喜顺序";
  }

  function announceSettlement(view) {
    if (!view.praise || view.isSpinning) return;
    const message = view.isJackpot
      ? `特别同频已出现：${view.praise}。私人结语已展开。`
      : `本局第 ${view.spinCount} 次：${view.praise}`;
    announcementGeneration += 1;
    const generation = announcementGeneration;
    liveRegion.textContent = "";
    queueMicrotask(() => {
      if (generation === announcementGeneration) liveRegion.textContent = message;
    });
  }
})();
