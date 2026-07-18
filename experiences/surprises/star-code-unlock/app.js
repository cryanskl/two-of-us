(function () {
  "use strict";

  const logic = globalThis.STAR_CODE_UNLOCK_LOGIC;
  if (!logic) {
    document.body.textContent = "星码解锁加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const rawConfig = globalThis.STAR_CODE_UNLOCK_CONFIG;
  const config = logic.sanitizeConfig(rawConfig);
  const hintPolicy = config !== logic.DEFAULT_CONFIG && typeof rawConfig?.hintAfterMiss === "function"
    ? rawConfig.hintAfterMiss
    : null;
  const svgNamespace = "http://www.w3.org/2000/svg";
  const app = document.querySelector(".app");
  const topProgress = document.querySelector("#top-progress");
  const clueProgress = document.querySelector("#clue-progress");
  const eventMessage = document.querySelector("#event-message");
  const stage = document.querySelector("#stage");
  const sealStage = document.querySelector("#seal-stage");
  const connectionSockets = document.querySelector("#connection-sockets");
  const chartDescription = document.querySelector("#chart-description");
  const chartBase = document.querySelector("#chart-base");
  const connectionLayer = document.querySelector("#connection-layer");
  const starLayer = document.querySelector("#star-layer");
  const wordLayer = document.querySelector("#word-layer");
  const liveRegion = document.querySelector("#live-region");

  let state = logic.createInitialState(config);
  let visibleEvent = "星盘还没有开始校准。";
  let focusRevision = 0;

  renderChartBase();
  renderStarNodes();
  render({ focus: true });

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    handleAction(button.dataset.action);
  });

  stage.addEventListener("submit", (event) => {
    if (!event.target.matches("#answer-form")) return;
    event.preventDefault();
    const input = event.target.querySelector("#answer-input");
    const next = logic.submitAnswer(state, input.value, config);
    if (next === state) return;
    state = next;
    if (state.phase === "linked") {
      visibleEvent = `第 ${state.clueIndex + 1} 颗星已经对齐。`;
    } else {
      visibleEvent = `第 ${state.clueIndex + 1} 条星讯暂时没有对准。`;
    }
    announce(visibleEvent);
    render({ focus: true });
  });

  function handleAction(action) {
    if (action === "start") {
      state = logic.start(state);
      visibleEvent = "第一条星讯已经送达。";
    } else if (action === "retry") {
      state = logic.retry(state);
      visibleEvent = `重新校准第 ${state.clueIndex + 1} 条星讯。`;
    } else if (action === "rescue") {
      state = logic.rescue(state, config);
      visibleEvent = `星盘替你找回了第 ${state.clueIndex + 1} 颗星。`;
    } else if (action === "continue") {
      const previousIndex = state.clueIndex;
      state = logic.continueAfterLink(state);
      visibleEvent = state.phase === "ready"
        ? "三颗星已经连成一段完整星码。"
        : `第 ${previousIndex + 2} 条星讯已经送达。`;
    } else if (action === "reveal") {
      state = logic.reveal(state);
      visibleEvent = "星码已经读出。";
    } else if (action === "restart") {
      state = logic.restart(state);
      visibleEvent = "星码重新封存，回到第一条星讯。";
    } else {
      return;
    }
    announce(visibleEvent);
    render({ focus: true });
  }

  function announce(message) {
    liveRegion.textContent = message;
  }

  function render(options = {}) {
    app.dataset.phase = state.phase;
    topProgress.textContent = topProgressText();
    eventMessage.textContent = visibleEvent;
    renderProgress();
    renderChartState();
    renderStage();
    renderSeal();
    if (options.focus) scheduleFocus();
  }

  function topProgressText() {
    if (state.phase === "ready") return "本地星盘 · 三星已连成";
    if (state.phase === "revealed") return "本地星盘 · 星码已读出";
    return `本地星盘 · 第 ${state.clueIndex + 1} / 3 题`;
  }

  function renderProgress() {
    const items = [...clueProgress.children];
    const sockets = [...connectionSockets.children];
    for (let index = 0; index < 3; index += 1) {
      const solved = Boolean(state.solvedStarIds[index]);
      const current = state.clueIndex === index && !["ready", "revealed"].includes(state.phase);
      items[index].classList.toggle("is-solved", solved);
      items[index].classList.toggle("is-current", current && !solved);
      items[index].querySelector("strong").textContent = solved ? `第 ${index + 1} 题 · 已对齐` : `第 ${index + 1} 题`;
      sockets[index].classList.toggle("is-solved", solved);
      sockets[index].setAttribute("aria-label", solved ? `连接座 ${index + 1}，已接通` : `连接座 ${index + 1}，未接通`);
    }
  }

  function renderStage() {
    stage.replaceChildren();
    if (state.phase === "intro") {
      const sheet = surface("intro-sheet");
      sheet.append(
        heading("这里有一座只认你答案的星盘"),
        paragraph(config.introCopy),
        action("开始校准", "start", "primary-action"),
      );
      stage.append(sheet);
      return;
    }
    if (state.phase === "solving") {
      stage.append(renderClueForm());
      return;
    }
    if (state.phase === "missed") {
      stage.append(renderMissed());
      return;
    }
    if (state.phase === "linked") {
      const clue = config.clues[state.clueIndex];
      const sheet = surface("result-sheet");
      const kicker = paragraph(`STAR ${String(state.clueIndex + 1).padStart(2, "0")} / ALIGNED`, "stage-kicker");
      const rescued = state.lastResult?.type === "rescued";
      const resultHeading = heading(rescued ? "星盘替你找回了这一颗" : "这颗星已经对齐");
      sheet.append(kicker, resultHeading, paragraph(rescued ? clue.rescueCopy : clue.successCopy));
      sheet.append(action(state.clueIndex === 2 ? "接通三星连线" : "接收下一条星讯", "continue", "primary-action"));
      stage.append(sheet);
      return;
    }
    if (state.phase === "ready") {
      const sheet = surface("result-sheet");
      sheet.append(
        paragraph("THREE POINTS / ONE CODE", "stage-kicker"),
        heading("三星已经连成"),
        paragraph("星码露出了三个词，最后一句仍封存在观测票背面。"),
        action("读出星码", "reveal", "primary-action"),
      );
      stage.append(sheet);
      return;
    }
    stage.append(renderReveal());
  }

  function renderClueForm() {
    const clue = config.clues[state.clueIndex];
    const fragment = document.createDocumentFragment();
    const ticket = surface("clue-ticket");
    const ticketHeading = document.createElement("p");
    ticketHeading.className = "ticket-heading";
    ticketHeading.append(
      textNode(`第 ${state.clueIndex + 1} 条星讯`),
      textNode(`${String(state.clueIndex + 1).padStart(2, "0")} / 03`),
    );
    const prompt = paragraph(clue.prompt, "clue-prompt");
    ticket.append(ticketHeading, prompt);

    const form = document.createElement("form");
    form.id = "answer-form";
    form.className = "answer-form";
    const label = document.createElement("label");
    label.htmlFor = "answer-input";
    label.textContent = "写下你的答案";
    const input = document.createElement("input");
    input.id = "answer-input";
    input.name = `star-answer-${state.clueIndex + 1}`;
    input.type = "text";
    input.maxLength = 80;
    input.required = true;
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.placeholder = "答案只在这一次校准中使用";
    input.setAttribute("data-focus", "true");
    form.append(label, input, action("校准这颗星", "submit", "primary-action", true));
    fragment.append(ticket, form);
    return fragment;
  }

  function renderMissed() {
    const wrongCount = state.wrongCounts[state.clueIndex];
    const sheet = surface("result-sheet");
    const hint = logic.resolveMissHint(hintPolicy, {
      clueIndex: state.clueIndex,
      wrongCount,
    });
    sheet.append(
      paragraph(`CALIBRATION / ATTEMPT ${wrongCount}`, "stage-kicker"),
      heading("这颗星还没有对准"),
      paragraph("答案没有被保存，也不会影响已经接通的星位。"),
      paragraph(hint, "miss-hint"),
    );
    const actions = document.createElement("div");
    actions.className = "stage-actions";
    actions.append(action("重新想想", "retry", "primary-action"));
    if (wrongCount >= 3) actions.append(action("让星盘帮一次", "rescue", "secondary-action"));
    sheet.append(actions);
    return sheet;
  }

  function renderReveal() {
    const article = surface("reveal-sheet", "article");
    article.append(
      paragraph(`TO / ${config.recipientName}`, "stage-kicker"),
      heading(config.revealTitle),
    );
    const lines = document.createElement("div");
    lines.className = "reveal-lines";
    for (const line of config.revealLines) lines.append(paragraph(line));
    article.append(
      lines,
      paragraph(config.signOff, "reveal-signoff"),
      paragraph(`—— ${config.senderName}`, "reveal-sender"),
      action("重新封存", "restart", "primary-action"),
    );
    return article;
  }

  function renderSeal() {
    sealStage.replaceChildren();
    const copy = paragraph(sealText());
    sealStage.classList.toggle("is-ready", ["ready", "revealed"].includes(state.phase));
    sealStage.append(copy);
  }

  function sealText() {
    if (state.phase === "revealed") return "星码已经读出";
    if (state.phase === "ready") return "三星已连成 · 等你读出";
    const solved = state.solvedStarIds.filter(Boolean).length;
    return solved ? `星码仍封存 · 已接通 ${solved} / 3` : "星码仍封存";
  }

  function renderChartBase() {
    chartBase.replaceChildren();
    chartBase.append(svg("rect", { x: 0, y: 0, width: 1000, height: 920, class: "chart-sky" }));
    for (const radius of [105, 205, 305, 395]) {
      chartBase.append(svg("circle", { cx: 500, cy: 450, r: radius, class: "chart-ring" }));
    }
    chartBase.append(
      svg("line", { x1: 105, y1: 450, x2: 895, y2: 450, class: "chart-axis" }),
      svg("line", { x1: 500, y1: 55, x2: 500, y2: 845, class: "chart-axis" }),
    );
    for (let degree = 0; degree < 360; degree += 30) {
      const radians = degree * Math.PI / 180;
      const innerX = 500 + Math.sin(radians) * 105;
      const innerY = 450 - Math.cos(radians) * 105;
      const outerX = 500 + Math.sin(radians) * 395;
      const outerY = 450 - Math.cos(radians) * 395;
      chartBase.append(svg("line", { x1: innerX, y1: innerY, x2: outerX, y2: outerY, class: "chart-spoke" }));
      const tickInX = 500 + Math.sin(radians) * 383;
      const tickInY = 450 - Math.cos(radians) * 383;
      chartBase.append(svg("line", { x1: tickInX, y1: tickInY, x2: outerX, y2: outerY, class: "chart-tick" }));
      if (degree % 90 !== 0) {
        const labelX = 500 + Math.sin(radians) * 430;
        const labelY = 456 - Math.cos(radians) * 430;
        chartBase.append(svgText(`${degree}°`, labelX, labelY, "chart-degree"));
      }
    }
    for (const [label, x, y] of [["N", 500, 34], ["E", 72, 458], ["S", 500, 892], ["W", 928, 458]]) {
      chartBase.append(svgText(label, x, y, "chart-cardinal"));
    }
    for (const [cx, cy, r] of [
      [112, 128, 2], [184, 216, 3], [286, 108, 2], [410, 260, 2], [574, 82, 3],
      [706, 112, 2], [860, 190, 3], [888, 360, 2], [110, 580, 3], [175, 720, 2],
      [430, 838, 2], [590, 680, 3], [842, 760, 2], [920, 550, 2], [350, 500, 2],
    ]) chartBase.append(svg("circle", { cx, cy, r, class: "decorative-star" }));
  }

  function renderStarNodes() {
    starLayer.replaceChildren();
    for (const [index, star] of logic.STAR_POSITIONS.entries()) {
      const group = svg("g", { class: "chart-star", "data-star-id": star.id, transform: `translate(${star.x} ${star.y})` });
      group.append(
        svg("circle", { cx: 0, cy: 0, r: 25, class: "star-crosshair" }),
        svg("line", { x1: -35, y1: 0, x2: 35, y2: 0, class: "star-crosshair" }),
        svg("line", { x1: 0, y1: -35, x2: 0, y2: 35, class: "star-crosshair" }),
        svg("circle", { cx: 0, cy: 0, r: 10, class: "star-core" }),
        svgText(String(index + 1).padStart(2, "0"), 0, 38, "star-number"),
      );
      starLayer.append(group);
    }
  }

  function renderChartState() {
    const solvedIds = state.solvedStarIds.filter(Boolean);
    for (const node of starLayer.querySelectorAll(".chart-star")) {
      node.classList.toggle("is-solved", solvedIds.includes(node.dataset.starId));
    }
    connectionLayer.replaceChildren();
    if (solvedIds.length >= 2) {
      const points = solvedIds.map(starPosition);
      connectionLayer.append(svg("polyline", {
        points: points.map((point) => `${point.x},${point.y}`).join(" "),
        class: "code-connection",
      }));
    }
    wordLayer.replaceChildren();
    if (["ready", "revealed"].includes(state.phase)) {
      solvedIds.forEach((id, index) => {
        const point = starPosition(id);
        const group = svg("g", { transform: `translate(${point.x} ${Math.max(48, point.y - 70)})` });
        group.append(
          svg("rect", { x: -58, y: -24, width: 116, height: 48, class: "code-word-box" }),
          svgText(config.secretWords[index], 0, 9, "code-word-text"),
        );
        wordLayer.append(group);
      });
    }
    chartDescription.textContent = chartDescriptionText(solvedIds.length);
  }

  function chartDescriptionText(solvedCount) {
    if (state.phase === "intro") return "十二颗星都还没有点亮，等待第一条星讯。";
    if (state.phase === "ready") return "三颗星已经按题序连接，显示三个星码词，最终内容仍封存。";
    if (state.phase === "revealed") return "三颗星已经连接，星码和最终内容都已经读出。";
    return `十二颗星中已经点亮 ${solvedCount} 颗，当前处理第 ${state.clueIndex + 1} 条星讯。`;
  }

  function starPosition(id) {
    return logic.STAR_POSITIONS.find((star) => star.id === id);
  }

  function scheduleFocus() {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      stage.querySelector("[data-focus]")?.focus({ preventScroll: true });
    });
  }

  function surface(className, tagName = "section") {
    const node = document.createElement(tagName);
    node.className = className;
    return node;
  }

  function heading(text) {
    const node = document.createElement("h2");
    node.textContent = text;
    return node;
  }

  function paragraph(text, className) {
    const node = document.createElement("p");
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function action(label, actionName, className, submit = false) {
    const button = document.createElement("button");
    button.type = submit ? "submit" : "button";
    button.className = className;
    button.textContent = label;
    button.setAttribute("data-focus", "true");
    if (!submit) button.dataset.action = actionName;
    return button;
  }

  function textNode(text) {
    const node = document.createElement("span");
    node.textContent = text;
    return node;
  }

  function svg(name, attributes) {
    const node = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  }

  function svgText(text, x, y, className) {
    const node = svg("text", { x, y, class: className });
    node.textContent = text;
    return node;
  }
})();
