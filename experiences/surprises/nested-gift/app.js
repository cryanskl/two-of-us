(function () {
  "use strict";

  const logic = globalThis.NESTED_GIFT_LOGIC;
  if (!logic) {
    document.body.textContent = "一层一层加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const config = logic.sanitizeConfig(globalThis.NESTED_GIFT_CONFIG);
  const app = document.querySelector(".app");
  const stageCounter = document.querySelector("#stage-counter");
  const introNote = document.querySelector("#intro-note");
  const giftArt = document.querySelector("#gift-art");
  const instruction = document.querySelector("#instruction-title");
  const actionArea = document.querySelector("#action-area");
  const depthMarks = document.querySelector("#depth-marks");
  const depthLabel = document.querySelector("#depth-label");
  const recipient = document.querySelector("#recipient");
  const liveRegion = document.querySelector("#live-region");

  const layerCopy = [
    { instruction: "先把两边的丝带都解开。", artLabel: "第一层朱红礼盒" },
    { instruction: "把四个纸角一一揭开。", artLabel: "第二层孔雀绿包装盒" },
    { instruction: "把小抽屉慢慢拉到尽头。", artLabel: "第三层芥末黄抽屉盒" },
    { instruction: "在小盒盖上轻轻敲三次。", artLabel: "第四层墨蓝小盒" },
  ];

  let state = logic.createInitialState();
  let focusRevision = 0;

  app.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === "start") update(logic.start(state));
    if (action === "ribbon") update(logic.releaseRibbon(state, button.dataset.side));
    if (action === "corner") update(logic.peelCorner(state, Number(button.dataset.corner)));
    if (action === "knock") update(logic.knock(state));
    if (action === "continue") update(logic.continueOpening(state), true);
    if (action === "restart") update(logic.restart(state), true);
  });

  app.addEventListener("input", (event) => {
    if (!event.target.matches('[data-action="drawer"]')) return;
    update(logic.setDrawerProgress(state, Number(event.target.value)));
  });

  introNote.textContent = config.introNote;
  recipient.textContent = config.recipient;
  render(true);

  function update(next, primary = false) {
    if (next === state) return;
    const previous = state;
    state = next;
    render(primary);
    announceTransition(previous, next);
  }

  function render(primary = false) {
    app.dataset.phase = state.phase;
    app.dataset.layer = String(state.layerIndex);
    renderHeader();
    renderGift();
    renderInteraction();
    renderProgress();
    scheduleFocus(primary);
  }

  function renderHeader() {
    if (state.phase === "intro") stageCounter.textContent = "准备拆礼物";
    else if (state.phase === "complete") stageCounter.textContent = "拆到盒心";
    else stageCounter.textContent = `第 ${state.layerIndex + 1} / ${logic.LAYER_IDS.length} 层`;
  }

  function renderGift() {
    const art = state.phase === "complete" ? "final" : String(state.layerIndex);
    giftArt.dataset.art = art;
    giftArt.setAttribute("aria-label", state.phase === "complete" ? "盒心里的折叠信卡" : layerCopy[state.layerIndex].artLabel);
    giftArt.classList.toggle("is-note", state.phase === "note");
    giftArt.style.setProperty("--drawer-progress", `${state.drawerProgress}%`);
    document.querySelectorAll(".ribbon-echo i").forEach((node) => {
      node.classList.toggle("is-released", state.ribbon[node.dataset.side]);
    });
    document.querySelectorAll(".corner-echo i").forEach((node) => {
      node.classList.toggle("is-peeled", state.peeledCorners[Number(node.dataset.corner)]);
    });
  }

  function renderInteraction() {
    actionArea.replaceChildren();
    if (state.phase === "intro") {
      instruction.textContent = "这份礼物没有计时，慢慢来。";
      actionArea.append(actionButton("开始拆礼物", "start", "primary-action"));
      return;
    }
    if (state.phase === "note") {
      instruction.textContent = `第 ${state.layerIndex + 1} 层打开了`;
      const slip = document.createElement("blockquote");
      slip.className = "message-slip";
      slip.textContent = config.layerMessages[state.layerIndex];
      const label = state.layerIndex === logic.LAYER_IDS.length - 1 ? "打开盒心" : "继续拆下一层";
      actionArea.append(slip, actionButton(label, "continue", "primary-action"));
      return;
    }
    if (state.phase === "complete") {
      instruction.textContent = config.finalTitle;
      const card = document.createElement("div");
      card.className = "final-card";
      card.append(
        paragraph(config.recipient, "final-recipient"),
        paragraph(config.finalMessage, "final-message"),
        paragraph(config.invitation, "final-invitation"),
        paragraph(`—— ${config.sender}`, "final-sender"),
      );
      actionArea.append(card, actionButton(config.acceptText, "restart", "primary-action"));
      return;
    }

    instruction.textContent = layerCopy[state.layerIndex].instruction;
    if (state.layerIndex === 0) renderRibbonActions();
    if (state.layerIndex === 1) renderCornerActions();
    if (state.layerIndex === 2) renderDrawerAction();
    if (state.layerIndex === 3) renderKnockAction();
  }

  function renderRibbonActions() {
    const left = actionButton(state.ribbon.left ? "左边已解开" : "解开左边", "ribbon", "ribbon-action");
    left.dataset.side = "left";
    left.disabled = state.ribbon.left;
    const right = actionButton(state.ribbon.right ? "右边已解开" : "解开右边", "ribbon", "ribbon-action");
    right.dataset.side = "right";
    right.disabled = state.ribbon.right;
    actionArea.append(left, right);
  }

  function renderCornerActions() {
    const names = ["左上", "右上", "左下", "右下"];
    names.forEach((name, index) => {
      const button = actionButton(state.peeledCorners[index] ? `${name}已揭开` : `揭开${name}`, "corner", "corner-action");
      button.dataset.corner = String(index);
      button.disabled = state.peeledCorners[index];
      actionArea.append(button);
    });
  }

  function renderDrawerAction() {
    const wrap = document.createElement("label");
    wrap.className = "drawer-control";
    const label = document.createElement("span");
    label.textContent = `已经拉开 ${state.drawerProgress}%`;
    const range = document.createElement("input");
    range.type = "range";
    range.min = "0";
    range.max = "100";
    range.step = "1";
    range.value = String(state.drawerProgress);
    range.dataset.action = "drawer";
    range.setAttribute("aria-label", "向右拉开抽屉");
    wrap.append(label, range);
    actionArea.append(wrap);
  }

  function renderKnockAction() {
    const remaining = logic.KNOCKS_REQUIRED - state.knocks;
    const button = actionButton("轻敲盒盖", "knock", "knock-action");
    const count = document.createElement("p");
    count.className = "knock-count";
    count.textContent = `还要敲 ${remaining} 次`;
    actionArea.append(button, count);
  }

  function renderProgress() {
    depthMarks.replaceChildren();
    for (let index = 0; index < logic.LAYER_IDS.length; index += 1) {
      const mark = document.createElement("span");
      const completed = state.phase === "complete" || index < state.layerIndex || (index === state.layerIndex && state.phase === "note");
      mark.classList.toggle("is-active", state.phase !== "intro" && index === state.layerIndex);
      mark.classList.toggle("is-complete", completed);
      mark.textContent = completed ? "✓" : String(index + 1);
      depthMarks.append(mark);
    }
    if (state.phase === "complete") depthLabel.textContent = "已经拆到最后";
    else {
      const openedCurrentLayer = state.phase === "note" ? 1 : 0;
      depthLabel.textContent = `还有 ${logic.LAYER_IDS.length - state.layerIndex - openedCurrentLayer} 层`;
    }
  }

  function announceTransition(previous, next) {
    if (next.phase === "note") liveRegion.textContent = config.layerMessages[next.layerIndex];
    else if (next.phase === "complete") liveRegion.textContent = `${config.finalTitle}。${config.finalMessage}`;
    else if (previous.phase === "intro" && next.phase === "layer") liveRegion.textContent = layerCopy[0].instruction;
    else if (next.phase === "layer" && next.layerIndex !== previous.layerIndex) liveRegion.textContent = layerCopy[next.layerIndex].instruction;
    else if (next.layerIndex === 0) liveRegion.textContent = next.ribbon.left || next.ribbon.right ? "一边丝带已经解开。" : "";
    else if (next.layerIndex === 1) liveRegion.textContent = `已经揭开 ${next.peeledCorners.filter(Boolean).length} 个纸角。`;
    else if (next.layerIndex === 2) liveRegion.textContent = `抽屉已经拉开 ${next.drawerProgress}%。`;
    else if (next.layerIndex === 3) liveRegion.textContent = `已经轻敲 ${next.knocks} 次。`;
  }

  function scheduleFocus(primary) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      if (primary || ["intro", "note", "complete"].includes(state.phase)) {
        actionArea.querySelector("button, input")?.focus({ preventScroll: true });
        return;
      }
      actionArea.querySelector("button:not(:disabled), input")?.focus({ preventScroll: true });
    });
  }

  function actionButton(label, action, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.textContent = label;
    return button;
  }

  function paragraph(text, className) {
    const node = document.createElement("p");
    node.className = className;
    node.textContent = text;
    return node;
  }
})();
