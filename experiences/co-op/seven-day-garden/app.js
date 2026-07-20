(function () {
  "use strict";

  const logic = globalThis.SevenDayGardenLogic;
  const fileConfig = globalThis.SEVEN_DAY_GARDEN_CONFIG || {};
  const root = document.querySelector("#garden-app");
  const stage = document.querySelector("#stage");
  const weekRibbon = document.querySelector("#week-ribbon");
  const liveStatus = document.querySelector("#live-status");

  if (!logic || !root || !stage || !weekRibbon || !liveStatus) {
    if (stage) stage.textContent = "把七天，养成一朵花：运行文件未完整加载。";
    return;
  }

  const requiredApi = [
    "createInitialState", "reduce", "getPublicView", "normalizeConfig",
    "resolveCompletionNote", "classifyResourceKey",
  ];
  if (requiredApi.some((name) => typeof logic[name] !== "function")) {
    stage.textContent = "把七天，养成一朵花：逻辑接口不可用。";
    return;
  }

  const config = logic.normalizeConfig(fileConfig);
  const resources = Object.freeze({
    water: Object.freeze({ name: "浇水", key: "W", icon: "drop" }),
    sun: Object.freeze({ name: "补光", key: "S", icon: "sun" }),
    prune: Object.freeze({ name: "修剪", key: "P", icon: "shears" }),
  });
  const stageNames = Object.freeze(["土壤", "萌芽", "两叶", "四叶", "成株", "花苞", "初绽", "开花"]);
  const failureCopy = Object.freeze({
    "pair-mismatch": "这两张卡没有合上今天的花签。卡已放回两只工具篮，请重新商量今天的搭配。",
    "future-stranded": "今天够了，但后面会少一张卡。卡已放回两只工具篮，请换一种分配。",
  });

  let state = logic.createInitialState();
  let view = logic.getPublicView(state, config);
  let dispatchLocked = false;

  if (!view) {
    stage.textContent = "把七天，养成一朵花：初始状态不可用。";
    return;
  }

  stage.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeyDown);
  probeAsset("./assets/garden-table-background.png", "background-image-ready");
  probeAsset("./assets/plant-states.png", "plant-image-ready");
  probeAsset("./assets/completion-keepsake.png", "keepsake-image-ready");
  render(false);

  function probeAsset(source, readyClass) {
    const probe = new Image();
    probe.addEventListener("load", () => root.classList.add(readyClass), { once: true });
    probe.addEventListener("error", () => root.classList.remove(readyClass), { once: true });
    probe.src = source;
  }

  function handleClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !stage.contains(button) || button.disabled || dispatchLocked) return;
    const type = button.dataset.action;
    if (type === "PICK") {
      dispatch({ type, seat: Number(button.dataset.seat), resource: button.dataset.resource });
      return;
    }
    dispatch({ type });
  }

  function handleKeyDown(event) {
    if (dispatchLocked || hasCommandModifier(event) || isEditable(event.target)) return;
    const action = logic.classifyResourceKey(state, event);
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  }

  function hasCommandModifier(event) {
    try {
      return event.ctrlKey === true || event.metaKey === true || event.altKey === true;
    } catch (_error) {
      return true;
    }
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function dispatch(action) {
    if (dispatchLocked) return;
    dispatchLocked = true;
    const previousState = state;
    const previousView = view;
    const nextState = logic.reduce(state, action);
    if (nextState !== previousState) {
      state = nextState;
      view = logic.getPublicView(state, config);
      if (!view) {
        stage.textContent = "把七天，养成一朵花：公开状态不可用。";
      } else {
        render(true);
        announceChange(previousView, view);
      }
    }
    queueMicrotask(() => { dispatchLocked = false; });
  }

  function render(shouldFocus) {
    root.dataset.phase = view.phase;
    renderWeekRibbon();
    stage.replaceChildren(buildPhase());
    if (shouldFocus) {
      queueMicrotask(() => {
        const heading = stage.querySelector("#phase-heading");
        if (heading) heading.focus();
      });
    }
  }

  function renderWeekRibbon() {
    weekRibbon.replaceChildren(...view.weekPlan.map((day) => {
      const item = el("li", `week-leaf is-${day.status}`);
      if (day.status === "current" && view.phase !== "complete") item.setAttribute("aria-current", "step");
      item.append(
        el("span", "week-number", `第 ${day.number} 天`),
        el("strong", "week-title", day.title),
        resourcePair(day.resources, "week-resources")
      );
      return item;
    }));
  }

  function buildPhase() {
    if (view.phase === "intro") return buildIntro();
    if (view.phase === "day-intro") return buildDayIntro();
    if (view.phase === "first-pick" || view.phase === "second-pick") return buildChoosing();
    if (view.phase === "handoff") return buildHandoff();
    if (view.phase === "day-result") return buildDayResult();
    if (view.phase === "jammed") return buildJammed();
    return buildComplete();
  }

  function buildIntro() {
    const layout = careLayout("intro-view");
    const copy = phaseCopy(
      "先看看这七天",
      "每天你们各出一张卡，让两张卡一起满足当天花签，也要为后面的日子留够工具。"
    );
    const rules = el("ol", "rule-list");
    [
      "七天花签和双方剩余卡始终公开。",
      "每天两席各选一张，先行动的人逐日交换。",
      "两张卡符合今天，并且后面的日子仍能完成，植物才会生长。",
      "没合上时，两张卡都会放回，只重新商量今天。",
    ].forEach((text) => rules.append(el("li", "", text)));
    copy.append(rules);
    layout.append(
      copy,
      buildPlant(),
      noteCard("同一台设备，轮流接手", "请在同一台设备上轮流操作。页面不联网、不保存，也不会识别是谁按下按钮。", "trust-note"),
      ...buildBaskets(false),
      buildActions(primaryButton("开始这七天", "START"))
    );
    return layout;
  }

  function buildDayIntro() {
    const first = view.seats.find((seat) => seat.isFirst);
    const other = view.seats.find((seat) => !seat.isFirst);
    const layout = careLayout("day-intro-view");
    layout.append(
      phaseCopy(
        `第 ${view.day.number} 天 · ${view.day.title}`,
        `${view.day.note}。今天由${first.name}先照料，${other.name}接着来。`,
        `第 ${view.attempt} 次商量`
      ),
      buildPlant(),
      buildCareNote("今天的花签", false),
      ...buildBaskets(false),
      buildActions(
        primaryButton(`开始第 ${view.day.number} 天`, "BEGIN_DAY"),
        secondaryButton("从头再来", "RESTART")
      )
    );
    return layout;
  }

  function buildChoosing() {
    const active = view.seats.find((seat) => seat.isActive);
    const isSecond = view.phase === "second-pick";
    const layout = careLayout("choosing-view");
    layout.append(
      phaseCopy(
        `${active.name}，选一张照料卡`,
        isSecond
          ? "第一张卡已经公开放好。请从自己的工具篮选择一张，和它一起合上花签。"
          : "从自己的工具篮选一张。选择后会立即放到花签旁，今天每席只能选一次。",
        `第 ${view.day.number} 天 · ${view.day.title}`
      ),
      buildPlant(),
      buildCareNote("把两张卡放到一起", false),
      ...buildBaskets(true),
      buildActions(secondaryButton("从头再来", "RESTART"))
    );
    return layout;
  }

  function buildHandoff() {
    const active = view.seats.find((seat) => seat.isActive);
    const picked = view.commitments[0];
    const pickedSeat = view.seats.find((seat) => seat.id === picked.seat);
    const layout = careLayout("handoff-view");
    layout.append(
      phaseCopy(
        `把花园交给${active.name}`,
        `${pickedSeat.name}已经放下“${resourceName(picked.resource)}”。花签、两只工具篮和这张卡都继续公开。`,
        `第 ${view.day.number} 天 · 公开交接`
      ),
      buildPlant(),
      buildCareNote("第一张卡已经放好", false),
      ...buildBaskets(false),
      buildActions(
        primaryButton("我接好了", "HANDOFF_READY"),
        secondaryButton("从头再来", "RESTART")
      )
    );
    return layout;
  }

  function buildDayResult() {
    const remaining = 7 - view.day.number;
    const message = view.day.number === 7
      ? "第 7 天完成：开花。七张花签都被你们一起养成了。"
      : `第 ${view.day.number} 天完成：${view.day.title}。两张卡正好合上花签，后面的 ${remaining} 天仍然可以完成。`;
    const layout = careLayout("result-view success-view");
    layout.append(
      phaseCopy("今天，养成了", message, `第 ${view.day.number} 天 · ${view.day.title}`),
      buildPlant(true),
      buildCareNote("这一天已经压进手账", false, "accepted"),
      ...buildBaskets(false),
      buildActions(
        primaryButton(view.day.number === 7 ? "留下这朵花" : `去看第 ${view.day.number + 1} 天`, "NEXT_DAY"),
        secondaryButton("从头再来", "RESTART")
      )
    );
    return layout;
  }

  function buildJammed() {
    const reason = view.result ? failureCopy[view.result.status] : "今天还没有合上，请重新商量。";
    const layout = careLayout(`result-view jammed-view ${view.result ? view.result.status : ""}`);
    layout.append(
      phaseCopy("今天还没合上", reason, `第 ${view.day.number} 天 · 第 ${view.attempt} 次商量`),
      buildPlant(),
      buildCareNote("两张卡已经归还", true, view.result ? view.result.status : "jammed"),
      ...buildBaskets(false),
      buildActions(
        primaryButton("重新商量今天", "RETRY_DAY"),
        secondaryButton("从头再来", "RESTART")
      )
    );
    return layout;
  }

  function buildComplete() {
    const summary = view.summary;
    const wrapper = el("div", "complete-view");
    const heading = phaseCopy(
      "你们把七天，养成了一朵花",
      "两只工具篮、十四次照料，没有排名，也不比较谁做得更多。",
      "七日共同标本册"
    );
    const stats = el("ul", "summary-list");
    [
      [summary.totalDays, "天共同照料"],
      [summary.totalCards, "张卡被用完"],
      [summary.totalAttempts, "次共同尝试"],
      [summary.replans, "次重新商量"],
    ].forEach(([value, label]) => {
      const item = el("li");
      item.append(el("strong", "", String(value)), el("span", "", label));
      stats.append(item);
    });
    const log = el("ol", "pressed-log");
    summary.days.forEach((day) => {
      const item = el("li", "pressed-entry");
      item.append(
        el("span", "pressed-number", `第 ${day.number} 天`),
        el("strong", "", day.title),
        resourcePair([day.leftResource, day.rightResource], "pressed-tools"),
        el("span", "pressed-attempts", day.attempts === 1 ? "一次合上" : `${day.attempts} 次商量`)
      );
      log.append(item);
    });
    const note = el("p", "completion-note");
    note.textContent = logic.resolveCompletionNote(config.composeCompletionNote, summary);
    wrapper.append(
      heading,
      buildPlant(),
      stats,
      log,
      note,
      buildActions(primaryButton("再养一次", "RESTART"))
    );
    return wrapper;
  }

  function careLayout(extraClass) {
    return el("div", `care-layout ${extraClass}`);
  }

  function phaseCopy(title, description, meta) {
    const section = el("section", "phase-copy");
    if (meta) section.append(el("p", "phase-meta", meta));
    const heading = el("h2", "", title);
    heading.id = "phase-heading";
    heading.tabIndex = -1;
    section.append(heading, el("p", "phase-description", description));
    return section;
  }

  function buildPlant(grewToday) {
    const figure = el("figure", `plant-scene${grewToday ? " just-grew" : ""}`);
    figure.dataset.stage = String(view.plantStage);
    const viewport = el("div", `plant-viewport plant-stage-${view.plantStage}`);
    viewport.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.className = "plant-strip";
    image.src = "./assets/plant-states.png";
    image.alt = "";
    image.decoding = "async";
    image.addEventListener("error", () => root.classList.remove("plant-image-ready"), { once: true });
    const fallback = el("div", "fallback-plant");
    fallback.append(el("span", "fallback-stem"), el("span", "fallback-pot"));
    for (let index = 0; index < view.plantStage; index += 1) {
      fallback.append(el("span", `fallback-leaf leaf-${index + 1}`));
    }
    if (view.plantStage === 7) fallback.append(el("span", "fallback-flower"));
    const assetClip = el("div", "plant-asset-clip");
    assetClip.append(image);
    viewport.append(assetClip, fallback);
    const caption = el("figcaption", "plant-caption");
    caption.append(
      el("strong", "", stageNames[view.plantStage] || "生长中"),
      el("span", "", `已养成 ${view.plantStage} / 7 天`)
    );
    figure.append(viewport, caption);
    return figure;
  }

  function buildCareNote(title, returned, stateClass) {
    const section = el("section", `care-note${stateClass ? ` is-${stateClass}` : ""}`);
    section.setAttribute("aria-label", `${view.day.title}花签与两张照料卡`);
    const ticket = el("div", "day-ticket");
    ticket.append(
      el("span", "ticket-day", `第 ${view.day.number} 天`),
      el("strong", "", view.day.title),
      el("p", "", view.day.note),
      resourcePair(view.day.resources, "required-pair")
    );
    const placements = el("div", "commitment-slots");
    view.seats.forEach((seat) => {
      const commitment = view.commitments.find((item) => item.seat === seat.id);
      const slot = el("div", `commitment-slot${commitment ? " is-filled" : ""}`);
      slot.append(el("span", "slot-seat", seat.name));
      if (commitment) {
        slot.append(resourceToken(commitment.resource, false));
        if (returned) slot.append(el("span", "returned-label", "已归还"));
      } else {
        slot.append(el("span", "slot-empty", seat.isActive ? "等你接手" : "还没有放卡"));
      }
      placements.append(slot);
    });
    section.append(el("h3", "", title), ticket, placements);
    return section;
  }

  function buildBaskets(interactive) {
    return view.seats.map((seat) => {
      const active = interactive && seat.isActive;
      const article = el("article", `tool-basket seat-${seat.id}${active ? " is-active" : ""}`);
      article.dataset.seat = String(seat.id);
      const heading = el("div", "basket-heading");
      heading.append(
        el("h3", "", `${seat.name}的工具篮`),
        el("span", "basket-role", seat.isFirst ? "今天先照料" : "今天后照料")
      );
      const list = el("ul", "tool-list");
      Object.keys(resources).forEach((resource) => {
        const item = el("li");
        if (active) {
          const control = view.controls.find((entry) => entry.action === "PICK" && entry.resource === resource && entry.seat === seat.id);
          const button = resourceToken(resource, true, seat.inventory[resource]);
          button.dataset.action = "PICK";
          button.dataset.seat = String(seat.id);
          button.dataset.resource = resource;
          button.dataset.focusKey = `pick-${seat.id}-${resource}`;
          button.disabled = !control || !control.enabled;
          button.setAttribute("aria-label", `${seat.name}选择${resourceName(resource)}，剩余 ${seat.inventory[resource]} 张，快捷键 ${resources[resource].key}`);
          item.append(button);
        } else {
          item.append(resourceToken(resource, false, seat.inventory[resource]));
        }
        list.append(item);
      });
      article.append(heading, list);
      return article;
    });
  }

  function resourceToken(resource, interactive, count) {
    const token = el(interactive ? "button" : "div", `resource-card resource-${resource}${interactive ? " is-button" : ""}`);
    if (interactive) token.type = "button";
    const info = resources[resource];
    const icon = el("span", `tool-icon icon-${info.icon}`);
    icon.setAttribute("aria-hidden", "true");
    const label = el("span", "resource-label");
    label.append(el("strong", "", info.name), el("span", "shortcut", info.key));
    token.append(icon, label);
    if (count !== undefined) token.append(el("span", "resource-count", `剩余 ${count} 张`));
    return token;
  }

  function resourcePair(pair, className) {
    const wrapper = el("span", className);
    pair.forEach((resource, index) => {
      if (index) wrapper.append(el("span", "pair-plus", "+"));
      const item = el("span", `pair-resource resource-${resource}`);
      const icon = el("span", `mini-icon icon-${resources[resource].icon}`);
      icon.setAttribute("aria-hidden", "true");
      item.append(icon, document.createTextNode(resourceName(resource)));
      wrapper.append(item);
    });
    return wrapper;
  }

  function noteCard(title, text, className) {
    const section = el("section", `care-note ${className || ""}`);
    section.append(el("h3", "", title), el("p", "", text));
    return section;
  }

  function buildActions() {
    const actions = el("div", "stage-actions");
    actions.append(...arguments);
    return actions;
  }

  function primaryButton(label, action) {
    return actionButton(label, action, "primary-action");
  }

  function secondaryButton(label, action) {
    return actionButton(label, action, "secondary-action");
  }

  function actionButton(label, action, className) {
    const button = el("button", className, label);
    button.type = "button";
    button.dataset.action = action;
    const control = view.controls.find((item) => item.action === action);
    button.disabled = !control || !control.enabled;
    return button;
  }

  function resourceName(resource) {
    return resources[resource] ? resources[resource].name : "未知工具";
  }

  function announceChange(previous, current) {
    liveStatus.textContent = "";
    let message = "";
    if (current.phase === "handoff") {
      const picked = current.commitments[0];
      const first = current.seats.find((seat) => seat.id === picked.seat);
      const next = current.seats.find((seat) => seat.isActive);
      message = `${first.name}选择了${resourceName(picked.resource)}。请把花园交给${next.name}。`;
    } else if (current.phase === "first-pick" && previous.phase === "jammed") {
      message = `两张卡已归还，重新商量第 ${current.day.number} 天。`;
    } else if (current.phase === "day-result") {
      message = current.day.number === 7
        ? "第 7 天完成，七张花签都被你们一起养成了。"
        : `第 ${current.day.number} 天完成，植物长出了新的一层。`;
    } else if (current.phase === "jammed") {
      message = failureCopy[current.result.status] || "两张卡已归还，请重新商量今天。";
    } else if (current.phase === "complete") {
      message = "七天共同照料完成，你们把七天养成了一朵花。";
    }
    if (!message) return;
    queueMicrotask(() => { liveStatus.textContent = message; });
  }

  function el(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
})();
