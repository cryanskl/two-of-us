(function () {
  "use strict";

  const configModule = globalThis.SecretRecipeCodeConfig;
  const logic = globalThis.SecretRecipeCodeLogic;
  const mount = document.querySelector("#app-content");
  const app = document.querySelector("#app");
  const liveRegion = document.querySelector("#live-region");

  if (!configModule || !logic || !mount || !app || !liveRegion) {
    document.body.textContent = "藏好这一味加载失败，请确认 config.js、logic.js 与 app.js 都在页面旁边。";
    return;
  }

  let state;
  let safeConfig;
  let view;
  let focusRevision = 0;

  try {
    safeConfig = logic.sanitizeConfig(configModule.DEFAULT_CONFIG, configModule.composeMatchNote);
    state = logic.createInitialState();
    view = logic.getRecipeView(state, safeConfig);
  } catch (error) {
    document.body.textContent = "藏好这一味初始化失败，请重新打开页面。";
    return;
  }

  mount.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  globalThis.addEventListener("blur", () => coverForLifecycle("blur"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) coverForLifecycle("hidden");
  });

  render({ focus: "start" });

  function handleClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled || !mount.contains(button)) return;

    const type = button.dataset.action;
    if (type === "ADD_SECRET" || type === "ADD_GUESS") {
      dispatch({ type, ingredientId: button.dataset.ingredientId }, { focus: "ingredient" });
      return;
    }
    if (type === "REMOVE_SECRET_SLOT" || type === "REMOVE_GUESS_SLOT") {
      dispatch({ type, index: Number(button.dataset.index) }, { focus: "ingredient" });
      return;
    }

    const focusByAction = {
      START_MATCH: "ingredient",
      CLEAR_SECRET: "ingredient",
      SUBMIT_SECRET: "heading",
      COVER_SECRET: "resume",
      RESUME_SECRET: "ingredient",
      CONFIRM_HANDOFF: "ingredient",
      CLEAR_GUESS: "ingredient",
      SUBMIT_GUESS: "phase",
      ADVANCE_ROUND: "phase",
      RESTART_MATCH: "start",
    };
    const action = type === "COVER_SECRET" ? { type, reason: "manual" } : { type };
    dispatch(action, { focus: focusByAction[type] || "phase" });
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!document.body.contains(event.target)) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;

    if (/^[1-6]$/.test(event.key) && !event.repeat) {
      const ingredient = view.ingredients[Number(event.key) - 1];
      if (!ingredient) return;
      if (view.controls.canEditSecret) {
        event.preventDefault();
        dispatch({ type: "ADD_SECRET", ingredientId: ingredient.id }, { focus: "ingredient" });
      } else if (view.controls.canEditGuess) {
        event.preventDefault();
        dispatch({ type: "ADD_GUESS", ingredientId: ingredient.id }, { focus: "ingredient" });
      }
      return;
    }

    if (event.key === "Backspace") {
      if (view.controls.canEditSecret && view.draft.length > 0) {
        event.preventDefault();
        dispatch({ type: "REMOVE_SECRET_SLOT", index: view.draft.length - 1 }, { focus: "ingredient" });
      } else if (view.controls.canEditGuess && view.guessDraft.length > 0) {
        event.preventDefault();
        dispatch({ type: "REMOVE_GUESS_SLOT", index: view.guessDraft.length - 1 }, { focus: "ingredient" });
      }
      return;
    }

    if (event.key === "Escape") {
      if (view.phase === "setting" && !view.privacy.covered) {
        event.preventDefault();
        dispatch({ type: "COVER_SECRET", reason: "escape" }, { focus: "resume" });
      } else if (view.phase === "guessing" && view.guessDraft.length > 0) {
        event.preventDefault();
        dispatch({ type: "CLEAR_GUESS" }, { focus: "ingredient" });
      }
    }
  }

  function coverForLifecycle(reason = "blur") {
    if (view.phase !== "setting" || view.privacy.covered) return;
    dispatch({ type: "COVER_SECRET", reason }, { focus: "resume", announce: false });
  }

  function dispatch(action, options) {
    const previousState = state;
    const previousView = view;
    try {
      state = logic.reduceRecipe(state, action);
      view = logic.getRecipeView(state, safeConfig);
    } catch (error) {
      liveRegion.textContent = "这一步没有生效，请重新选择。";
      return;
    }
    if (state === previousState) {
      if (view !== previousView || view.notice) render(options);
      else announceNotice(view.notice);
      return;
    }
    render(options);
    if (options?.announce !== false) announceAction(action.type);
  }

  function render(options = {}) {
    app.dataset.phase = view.phase;
    mount.replaceChildren(buildRail(), buildLedger());
    scheduleFocus(resolveFocus(options.focus));
  }

  function buildRail() {
    const rail = element("aside", "identity-rail");
    const lockup = element("div", "brand-lockup");
    lockup.append(decorativeHerb(), textElement("h1", view.text.title, "work-title", { id: "work-title" }));
    rail.append(lockup, textElement("p", view.text.subtitle, "subtitle"));

    if (view.phase !== "intro") {
      const status = element("div", "rail-status");
      status.append(
        textElement("p", `第 ${view.round.number} / ${view.round.total} 轮`, "round-line"),
        textElement("p", roleCopy(), "role-line"),
      );
      rail.append(status);
    } else {
      rail.append(element("div", "rail-status"));
    }

    rail.append(privacyNote());
    return rail;
  }

  function buildLedger() {
    const ledger = element("section", "ledger");
    ledger.setAttribute("aria-label", "配方账页");
    const body = element("div", "ledger-body");

    if (view.phase === "intro") body.append(buildIntro());
    else if (view.phase === "setting" && view.privacy.covered) body.append(buildPrivacyCover());
    else if (view.phase === "setting") body.append(buildSetting());
    else if (view.phase === "handoff") body.append(buildHandoff());
    else if (view.phase === "guessing") body.append(buildGuessing());
    else if (view.phase === "round-result") body.append(buildRoundResult());
    else body.append(buildMatchResult());

    ledger.append(body);
    return ledger;
  }

  function buildIntro() {
    const panel = element("section", "intro-panel ledger-body");
    panel.append(
      textElement("p", view.text.instruction, "phase-copy"),
      actionButton(view.text.primaryLabel || "开始第一轮", "START_MATCH", "primary-action"),
    );
    return panel;
  }

  function buildSetting() {
    const section = element("section", "ledger-body");
    section.append(
      heading(`${view.roles.setterName}，藏好四味`),
      textElement("p", view.text.instruction, "phase-copy"),
    );
    const work = element("div", "work-area");
    work.append(
      buildSlots(view.draft, "secret"),
      textElement("p", "选择配料", "section-label"),
      buildIngredients("ADD_SECRET", view.controls.canEditSecret),
    );
    const validation = secretValidation();
    work.append(textElement("p", validation.text, `notice${validation.ready ? " is-ready" : ""}`));
    const actions = element("div", "action-row");
    const submit = actionButton(view.text.primaryLabel || "藏好配方", "SUBMIT_SECRET", "primary-action");
    submit.disabled = !view.controls.canSubmitSecret;
    actions.append(
      submit,
      actionButton("先盖住配方", "COVER_SECRET", "secondary-action"),
      actionButton("清空", "CLEAR_SECRET", "text-action", view.draft.length === 0),
    );
    work.append(actions);
    section.append(work);
    return section;
  }

  function buildPrivacyCover() {
    const section = element("section", "privacy-cover");
    section.append(
      lockIcon("cover-icon"),
      heading("配方已盖住"),
      textElement("p", "草稿仍在本机内存里，但已经从页面移除。确认只有配方师在看，再继续。", "phase-copy"),
      actionButton(view.text.primaryLabel || "只有我在看，继续设置", "RESUME_SECRET", "primary-action", false, "resume-action"),
    );
    return section;
  }

  function buildHandoff() {
    const section = element("section", "handoff-seal");
    section.append(
      lockIcon("cover-icon"),
      heading(view.text.instruction || `把设备交给 ${view.roles.breakerName}`),
      textElement("p", "配方已经从页面移除。接手后只能看到自己的试配和公开反馈。", "phase-copy"),
      actionButton(view.text.primaryLabel || "我接好了", "CONFIRM_HANDOFF", "primary-action"),
    );
    return section;
  }

  function buildGuessing() {
    const section = element("section", "ledger-body");
    section.append(
      heading(`${view.roles.breakerName}，试着破译`),
      textElement("p", view.text.instruction, "phase-copy"),
      feedbackLegend(),
    );
    const work = element("div", "work-area");
    work.append(
      buildSlots(view.guessDraft, "guess"),
      textElement("p", "选择配料", "section-label"),
      buildIngredients("ADD_GUESS", view.controls.canEditGuess),
    );
    const guessReady = view.guessDraft.length === logic.SLOT_COUNT;
    work.append(textElement("p", guessReady ? "四味齐了，可以试这一杯。" : `还差 ${logic.SLOT_COUNT - view.guessDraft.length} 格`, `notice${guessReady ? " is-ready" : ""}`));
    const actions = element("div", "action-row");
    const submit = actionButton(view.text.primaryLabel || "试这一杯", "SUBMIT_GUESS", "primary-action");
    submit.disabled = !view.controls.canSubmitGuess;
    actions.append(submit, actionButton("倒掉重调", "CLEAR_GUESS", "secondary-action", view.guessDraft.length === 0));
    work.append(actions, buildHistory());
    section.append(work);
    return section;
  }

  function buildRoundResult() {
    const section = element("section", "ledger-body");
    const result = view.results[view.results.length - 1];
    const failed = Boolean(result?.failed);
    section.append(
      heading(failed ? "这一轮，秘密守住了" : `${view.roles.breakerName} 破译成功`),
      textElement("p", "这份秘密现在才公开。", "phase-copy"),
      buildRevealedRecipe(view.revealedSecret),
      textElement("p", failed ? "七次都没有完全同位，本轮记 8。" : `用了 ${result?.attempts ?? view.history.length} 次试配。`, "result-summary"),
    );
    const label = view.round.index === logic.ROUND_COUNT - 1 ? "看看谁先尝到" : "交换角色";
    section.append(actionButton(view.text.primaryLabel || label, "ADVANCE_ROUND", "primary-action"));
    return section;
  }

  function buildMatchResult() {
    const section = element("section", "ledger-body");
    const winner = view.score.winnerIndex;
    const title = view.score.tied ? "今晚刚好同样懂" : `${safeConfig.playerNames[winner]} 先尝到了`;
    section.append(heading(title));

    const board = element("div", "score-board");
    board.append(
      playerScore(0, winner === 0),
      textElement("span", "比", "score-divider"),
      playerScore(1, winner === 1),
    );
    section.append(board, buildRoundSummaries(), textElement("p", view.text.matchNote || "这一场，只留在你们之间。", "match-note"));
    const actions = element("div", "action-row");
    actions.append(actionButton(view.text.primaryLabel || "再藏一回", "RESTART_MATCH", "primary-action"));
    section.append(actions);
    const link = textElement("a", "回到 Two of Us 作品集", "collection-link");
    link.href = "../../../index.html";
    section.append(link);
    return section;
  }

  function buildSlots(values, kind) {
    const slots = element("div", "slots");
    slots.setAttribute("aria-label", kind === "secret" ? "秘密配方草稿" : "当前试配草稿");
    for (let index = 0; index < logic.SLOT_COUNT; index += 1) {
      const id = values[index];
      if (id) {
        const ingredient = ingredientById(id);
        const button = actionButton("", kind === "secret" ? "REMOVE_SECRET_SLOT" : "REMOVE_GUESS_SLOT", "slot is-filled");
        button.dataset.index = String(index);
        button.setAttribute("aria-label", `移除第 ${index + 1} 格 ${ingredient.label}`);
        button.style.setProperty("--ingredient-color", ingredient.color);
        const icon = ingredientIcon(ingredient.iconKey || ingredient.id, "slot-icon");
        button.append(icon, textElement("span", ingredient.label, "slot-label"), textElement("span", "×", "slot-remove", { "aria-hidden": "true" }));
        slots.append(button);
      } else {
        const slot = element("div", "slot is-empty");
        slot.setAttribute("aria-label", `第 ${index + 1} 格，空`);
        slot.append(bottleIcon(), textElement("span", String(index + 1), "slot-label"));
        slots.append(slot);
      }
    }
    return slots;
  }

  function buildIngredients(action, enabled) {
    const grid = element("div", "ingredient-grid");
    for (const ingredient of view.ingredients) {
      const button = actionButton("", action, "ingredient-button");
      button.dataset.ingredientId = ingredient.id;
      button.disabled = !enabled;
      button.style.setProperty("--ingredient-color", ingredient.color);
      button.setAttribute("aria-label", `${ingredient.number}，${ingredient.label}。${ingredient.description}`);
      const copy = element("span", "ingredient-copy");
      copy.append(textElement("span", ingredient.label, "ingredient-name"), textElement("span", ingredient.description, "ingredient-description"));
      button.append(textElement("span", String(ingredient.number), "ingredient-number"), ingredientIcon(ingredient.iconKey || ingredient.id, "ingredient-icon"), copy);
      grid.append(button);
    }
    return grid;
  }

  function buildHistory() {
    const history = element("section", "history");
    history.setAttribute("aria-label", "已提交试配");
    history.append(textElement("h3", `已试 ${view.history.length} / ${logic.MAX_GUESSES}`, "history-heading"));
    if (view.history.length === 0) {
      history.append(textElement("p", "第一杯还没端上来。", "history-empty"));
      return history;
    }
    const list = element("ol", "history-list");
    for (const row of view.history) {
      const item = element("li", "history-row");
      item.append(
        textElement("span", `#${row.number}`, "attempt-number"),
        buildMiniRecipe(row.values),
        feedbackValue("同位", row.exact, "exact"),
        feedbackValue("有料", row.misplaced, "misplaced"),
      );
      list.append(item);
    }
    history.append(list);
    return history;
  }

  function buildRevealedRecipe(values) {
    const strip = element("div", "reveal-strip");
    strip.setAttribute("aria-label", "本轮公开配方");
    for (const id of values) {
      const ingredient = ingredientById(id);
      const slot = element("div", "slot is-filled");
      slot.style.setProperty("--ingredient-color", ingredient.color);
      slot.append(ingredientIcon(ingredient.iconKey || ingredient.id, "slot-icon"), textElement("span", ingredient.label, "slot-label"));
      strip.append(slot);
    }
    return strip;
  }

  function buildMiniRecipe(values) {
    const recipe = element("span", "mini-recipe");
    recipe.setAttribute("aria-label", values.map((id) => ingredientById(id).label).join("、"));
    for (const id of values) {
      const ingredient = ingredientById(id);
      const item = element("span", "mini-ingredient");
      item.style.setProperty("--ingredient-color", ingredient.color);
      item.append(ingredientIcon(ingredient.iconKey || ingredient.id));
      item.setAttribute("aria-hidden", "true");
      recipe.append(item);
    }
    return recipe;
  }

  function feedbackLegend() {
    const legend = element("div", "feedback-legend");
    legend.append(
      feedbackKey("同位", "配料和位置都对", "exact"),
      feedbackKey("有料", "配料对了，位置不对", "misplaced"),
    );
    return legend;
  }

  function feedbackKey(label, description, type) {
    const key = element("span", "feedback-key");
    key.append(feedbackSymbol(type), textElement("span", `${label}：${description}`));
    return key;
  }

  function feedbackValue(label, value, type) {
    const score = element("span", "feedback-score");
    score.append(feedbackSymbol(type), textElement("span", `${label} ${value}`));
    return score;
  }

  function feedbackSymbol(type) {
    const symbol = element("span", `feedback-symbol is-${type}`);
    symbol.setAttribute("aria-hidden", "true");
    return symbol;
  }

  function buildRoundSummaries() {
    const summaries = element("div", "round-summaries");
    for (const result of view.results) {
      const card = element("section", "round-summary");
      const breakerName = safeConfig.playerNames[result.breakerIndex];
      card.append(
        textElement("h3", `第 ${result.roundIndex + 1} 轮 · ${breakerName} 破译`),
        textElement("p", result.failed ? "七次未完全同位 · 记 8" : `${result.attempts} 次破译成功`),
      );
      summaries.append(card);
    }
    return summaries;
  }

  function playerScore(index, winner) {
    const item = element("div", `player-score${winner ? " is-winner" : ""}`);
    item.append(textElement("strong", String(view.score.values[index])), textElement("span", safeConfig.playerNames[index]));
    return item;
  }

  function privacyNote() {
    const note = element("p", "privacy-note");
    note.append(lockIcon(), textElement("span", "只在本机内存，刷新即清空"));
    return note;
  }

  function roleCopy() {
    if (view.phase === "setting") return `${view.roles.setterName} 藏配方`;
    if (view.phase === "handoff" || view.phase === "guessing") return `${view.roles.breakerName} 来破译`;
    if (view.phase === "round-result") return "本轮公开";
    return "双轮结算";
  }

  function secretValidation() {
    if (view.notice === "secret-duplicate-limit") return { text: "同一种配料最多放两格。", ready: false };
    if (view.draft.length < logic.SLOT_COUNT) return { text: `还差 ${logic.SLOT_COUNT - view.draft.length} 格`, ready: false };
    if (!view.controls.canSubmitSecret) return { text: "整份配方至少要有三种配料。", ready: false };
    return { text: "配方可以藏好了。", ready: true };
  }

  function ingredientById(id) {
    return view.ingredients.find((ingredient) => ingredient.id === id) || {
      id,
      label: "未知配料",
      description: "",
      color: "#9b7440",
      iconKey: "salt",
    };
  }

  function announceAction(type) {
    const messages = {
      START_MATCH: `第一轮开始，由 ${view.roles.setterName} 藏配方。`,
      SUBMIT_SECRET: `配方已经藏好。把设备交给 ${view.roles.breakerName}。`,
      COVER_SECRET: "配方草稿已经盖住。",
      RESUME_SECRET: "继续设置配方。",
      CONFIRM_HANDOFF: `${view.roles.breakerName} 开始破译。`,
      SUBMIT_GUESS: view.phase === "round-result"
        ? (view.results[view.results.length - 1]?.failed ? "本轮七次未猜中，秘密已公开。" : "本轮破译成功，秘密已公开。")
        : latestFeedbackAnnouncement(),
      ADVANCE_ROUND: view.phase === "match-result" ? "双轮结束，最终结果已经出现。" : `交换角色，由 ${view.roles.setterName} 藏配方。`,
      RESTART_MATCH: "比赛已经清空，回到开场。",
    };
    if (messages[type]) liveRegion.textContent = messages[type];
    else announceNotice(view.notice);
  }

  function latestFeedbackAnnouncement() {
    const row = view.history[view.history.length - 1];
    return row ? `第 ${row.number} 次试配：同位 ${row.exact}，有料 ${row.misplaced}。` : "试配已提交。";
  }

  function announceNotice(notice) {
    const messages = {
      "secret-incomplete": "配方还没有填满四格。",
      "secret-not-varied": "整份配方至少要有三种配料。",
      "secret-duplicate-limit": "同一种配料最多放两格。",
      "guess-incomplete": "试配还没有填满四格。",
    };
    if (messages[notice]) liveRegion.textContent = messages[notice];
  }

  function resolveFocus(requested) {
    if (requested === "phase") {
      if (view.phase === "setting" || view.phase === "guessing") return "ingredient";
      if (view.phase === "match-result" || view.phase === "round-result" || view.phase === "handoff") return "heading";
    }
    return requested;
  }

  function scheduleFocus(target) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      let node = null;
      if (target === "ingredient") node = mount.querySelector(".ingredient-button:not(:disabled)");
      else if (target === "start") node = mount.querySelector('[data-action="START_MATCH"]');
      else if (target === "resume") node = mount.querySelector('[data-action="RESUME_SECRET"]');
      else if (target === "heading") node = mount.querySelector("#phase-heading");
      if (node) node.focus({ preventScroll: true });
    });
  }

  function actionButton(label, action, className, disabled = false, id = "") {
    const button = textElement("button", label, className);
    button.type = "button";
    button.dataset.action = action;
    button.disabled = disabled;
    if (id) button.id = id;
    return button;
  }

  function heading(value) {
    return textElement("h2", value, "phase-heading", { id: "phase-heading", tabindex: "-1" });
  }

  function textElement(tag, value, className = "", attributes = {}) {
    const node = element(tag, className);
    node.textContent = value ?? "";
    for (const [key, attributeValue] of Object.entries(attributes)) node.setAttribute(key, attributeValue);
    return node;
  }

  function element(tag, className = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function svg(className = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 48 48");
    node.setAttribute("aria-hidden", "true");
    if (className) node.setAttribute("class", className);
    return node;
  }

  function svgNode(tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function ingredientIcon(key, className = "") {
    const icon = svg(className);
    icon.setAttribute("fill", "currentColor");
    const iconKey = String(key).toLowerCase();
    if (iconKey === "berry" || iconKey === "triple-fruit") {
      icon.append(svgNode("circle", { cx: "18", cy: "27", r: "8" }), svgNode("circle", { cx: "30", cy: "27", r: "8" }), svgNode("circle", { cx: "24", cy: "17", r: "8" }), svgNode("path", { d: "M26 11C30 5 37 6 40 9c-4 4-9 6-14 2Z" }));
    } else if (iconKey === "citrus" || iconKey === "six-slice") {
      icon.append(svgNode("circle", { cx: "24", cy: "24", r: "17", fill: "none", stroke: "currentColor", "stroke-width": "3" }));
      for (const d of ["M24 24V8", "M24 24l14-8", "M24 24l14 8", "M24 24v16", "M24 24l-14 8", "M24 24l-14-8"]) icon.append(svgNode("path", { d, fill: "none", stroke: "currentColor", "stroke-width": "2" }));
    } else if (iconKey === "mint" || iconKey === "double-leaf") {
      icon.append(svgNode("path", { d: "M24 39C9 35 7 20 11 9c12 1 18 9 13 30Z" }), svgNode("path", { d: "M24 39c15-4 17-19 13-30-12 1-18 9-13 30Z", opacity: ".72" }), svgNode("path", { d: "M24 38V16", fill: "none", stroke: "currentColor", "stroke-width": "2.5" }));
    } else if (iconKey === "cocoa" || iconKey === "split-bean") {
      icon.append(svgNode("path", { d: "M24 5C12 8 7 19 10 30c3 11 15 16 25 9 10-7 7-25-11-34Z" }), svgNode("path", { d: "M26 8c-8 10-9 20-4 31", fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": "2.5" }));
    } else if (iconKey === "honey" || iconKey === "single-drop") {
      icon.append(svgNode("path", { d: "M24 5C19 15 11 23 11 31a13 13 0 0 0 26 0c0-8-8-16-13-26Z" }));
    } else {
      icon.append(svgNode("polygon", { points: "24,5 40,23 27,43 9,30" }), svgNode("path", { d: "M24 5l3 38M9 30l31-7", fill: "none", stroke: "rgba(255,255,255,.6)", "stroke-width": "2" }));
    }
    return icon;
  }

  function decorativeHerb() {
    const icon = svg("brand-mark");
    icon.append(
      svgNode("path", { d: "M10 41C18 33 22 24 23 7M22 21c-8-1-13-5-14-11 8 0 13 4 14 11ZM23 29c8-1 14-6 16-13-8 0-14 5-16 13Z", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    );
    return icon;
  }

  function lockIcon(className = "") {
    const icon = svg(className);
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.append(svgNode("rect", { x: "5", y: "10", width: "14", height: "11", rx: "2" }), svgNode("path", { d: "M8 10V7a4 4 0 0 1 8 0v3" }));
    return icon;
  }

  function bottleIcon() {
    const icon = svg("slot-empty-icon");
    icon.append(svgNode("path", { d: "M17 5h14M19 5v9l-6 8v15c0 4 3 6 7 6h8c4 0 7-2 7-6V22l-6-8V5M14 27h20" }));
    return icon;
  }
})();
