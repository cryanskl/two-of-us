(function () {
  "use strict";

  const logic = globalThis.PAPER_PLANE_MAIL_LOGIC;
  if (!logic) {
    document.body.textContent = "纸飞机投递加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const rawConfig = globalThis.PAPER_PLANE_MAIL_CONFIG;
  const config = logic.sanitizeConfig(rawConfig);
  const hintPolicy = config !== logic.DEFAULT_CONFIG && typeof rawConfig?.hintForMiss === "function"
    ? rawConfig.hintForMiss
    : null;
  const reducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
  const app = document.querySelector(".app");
  const attemptStatus = document.querySelector("#attempt-status");
  const statusTitle = document.querySelector("#status-title");
  const eventMessage = document.querySelector("#event-message");
  const introPane = document.querySelector("#intro-pane");
  const aimPane = document.querySelector("#aim-pane");
  const outcomePane = document.querySelector("#outcome-pane");
  const angleInput = document.querySelector("#angle-input");
  const powerInput = document.querySelector("#power-input");
  const angleOutput = document.querySelector("#angle-output");
  const powerOutput = document.querySelector("#power-output");
  const launchButton = document.querySelector("#launch-button");
  const outcomeTitle = document.querySelector("#outcome-title");
  const outcomeCopy = document.querySelector("#outcome-copy");
  const hintCopy = document.querySelector("#hint-copy");
  const outcomeAction = document.querySelector("#outcome-action");
  const mailStage = document.querySelector("#mail-stage");
  const flightDescription = document.querySelector("#flight-description");
  const mapBase = document.querySelector("#map-base");
  const previewLayer = document.querySelector("#preview-layer");
  const trailLayer = document.querySelector("#trail-layer");
  const planeLayer = document.querySelector("#plane-layer");
  const liveRegion = document.querySelector("#live-region");
  const svgNamespace = "http://www.w3.org/2000/svg";

  let state = logic.createInitialState(config);
  let visibleEvent = "一封信已经折成纸飞机。";
  let renderedMailPhase = null;
  let flightToken = 0;
  let focusRevision = 0;

  renderMapBase();
  render({ focus: "start" });

  app.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action || action.disabled) return;
    handleAction(action);
  });

  angleInput.addEventListener("input", () => updateAimFromInputs(false));
  powerInput.addEventListener("input", () => updateAimFromInputs(false));
  angleInput.addEventListener("change", announceAim);
  powerInput.addEventListener("change", announceAim);

  function handleAction(node) {
    const action = node.dataset.action;
    if (action === "start") {
      state = logic.start(state);
      visibleEvent = "航线已经展开，先试试中低仰角。";
      liveRegion.textContent = visibleEvent;
      render({ focus: "aim" });
      return;
    }
    if (action === "adjust") {
      const field = node.dataset.field;
      const delta = Number(node.dataset.delta);
      if (!Number.isFinite(delta) || !["angle", "power"].includes(field)) return;
      const candidate = { [field]: state[field] + delta };
      const next = logic.setAim(state, candidate);
      if (next === state) return;
      state = next;
      visibleEvent = aimSummary();
      render();
      return;
    }
    if (action === "launch") {
      const next = logic.launch(state);
      if (next === state) return;
      state = next;
      visibleEvent = `第 ${state.attemptNumber} 次投递已经起飞。`;
      liveRegion.textContent = visibleEvent;
      render();
      if (reducedMotion.matches) {
        state = logic.finishFlight(state);
        finishVisibleFlight();
      } else {
        beginFlightAnimation();
      }
      return;
    }
    if (action === "retry") {
      state = logic.retry(state);
      visibleEvent = "保留上次设定，再调整一次。";
      liveRegion.textContent = visibleEvent;
      render({ focus: "aim" });
      return;
    }
    if (action === "reveal") {
      state = logic.reveal(state);
      visibleEvent = "信封打开了。";
      liveRegion.textContent = `${config.letterTitle}。${visibleEvent}`;
      render({ focus: "outcome" });
      return;
    }
    if (action === "restart") {
      cancelFlightAnimation();
      state = logic.restart(state);
      visibleEvent = "信重新折好，回到第一次投递。";
      liveRegion.textContent = visibleEvent;
      render({ focus: "start" });
    }
  }

  function updateAimFromInputs(announce) {
    const next = logic.setAim(state, {
      angle: Number(angleInput.value),
      power: Number(powerInput.value),
    });
    if (next === state) return;
    state = next;
    visibleEvent = aimSummary();
    if (announce) liveRegion.textContent = visibleEvent;
    render();
  }

  function announceAim() {
    liveRegion.textContent = aimSummary();
  }

  function aimSummary() {
    return `当前设定：${state.angle} 度，${state.power} 格力度。`;
  }

  function beginFlightAnimation() {
    const token = ++flightToken;
    let previousTimestamp = null;
    let accumulator = 0;

    function frame(timestamp) {
      if (token !== flightToken || state.phase !== "flying") return;
      if (previousTimestamp === null) previousTimestamp = timestamp;
      const elapsed = Math.min(0.25, Math.max(0, (timestamp - previousTimestamp) / 1000));
      previousTimestamp = timestamp;
      accumulator = Math.min(0.25, accumulator + elapsed);
      while (accumulator >= logic.FIXED_STEP && state.phase === "flying") {
        state = logic.step(state);
        accumulator -= logic.FIXED_STEP;
      }
      if (state.phase === "flying") {
        render();
        globalThis.requestAnimationFrame(frame);
      } else {
        finishVisibleFlight();
      }
    }

    globalThis.requestAnimationFrame(frame);
  }

  function cancelFlightAnimation() {
    flightToken += 1;
  }

  function finishVisibleFlight() {
    cancelFlightAnimation();
    visibleEvent = outcomeEvent();
    liveRegion.textContent = visibleEvent;
    render({ focus: "outcome" });
  }

  function outcomeEvent() {
    if (state.phase === "arrived") return "纸飞机飞进邮箱，信已经送达。";
    if (state.missReason === "short") return "纸飞机提前落在邮箱前。";
    if (state.missReason === "low") return "纸飞机擦过了邮箱下沿。";
    return "纸飞机从邮箱上方飞过去了。";
  }

  function render(options = {}) {
    app.dataset.phase = state.phase;
    attemptStatus.textContent = `本地投递 · 第 ${state.attemptNumber} 次`;
    statusTitle.textContent = statusText();
    eventMessage.textContent = visibleEvent;
    syncAimControls();
    renderStagePanes();
    renderMap();
    renderMailStage();
    if (options.focus) scheduleFocus(options.focus);
  }

  function statusText() {
    if (state.phase === "flying") return `飞行中 · 第 ${state.attemptNumber} 次投递`;
    if (state.phase === "missed") return "这次还没送到";
    if (state.phase === "arrived") return "已送达 · 信还封着";
    if (state.phase === "revealed") return "信已经打开";
    return "等待起飞";
  }

  function syncAimControls() {
    angleInput.value = String(state.angle);
    powerInput.value = String(state.power);
    angleOutput.value = `${state.angle}°`;
    angleOutput.textContent = `${state.angle}°`;
    powerOutput.value = String(state.power);
    powerOutput.textContent = String(state.power);
    const locked = state.phase === "flying";
    angleInput.disabled = locked;
    powerInput.disabled = locked;
    launchButton.disabled = locked;
    launchButton.textContent = locked ? "飞行中…" : "放飞这封信";
    for (const button of aimPane.querySelectorAll("[data-action=adjust]")) {
      const field = button.dataset.field;
      const delta = Number(button.dataset.delta);
      const limits = logic.AIM_LIMITS[field];
      button.disabled = locked
        || (delta < 0 && state[field] <= limits.min)
        || (delta > 0 && state[field] >= limits.max);
    }
  }

  function renderStagePanes() {
    introPane.hidden = state.phase !== "intro";
    aimPane.hidden = !["aiming", "flying"].includes(state.phase);
    outcomePane.hidden = !["missed", "arrived", "revealed"].includes(state.phase);
    if (outcomePane.hidden) return;

    hintCopy.hidden = state.phase !== "missed";
    if (state.phase === "missed") {
      outcomeTitle.textContent = "航线没有对上";
      outcomeCopy.textContent = outcomeEvent();
      hintCopy.textContent = logic.resolveHint(hintPolicy, {
        attemptNumber: state.attemptNumber,
        missReason: state.missReason,
        angle: state.angle,
        power: state.power,
      });
      configureOutcomeButton("重新折一架", "retry");
      return;
    }
    if (state.phase === "arrived") {
      outcomeTitle.textContent = "信已经送达";
      outcomeCopy.textContent = "纸飞机停进邮箱，但信封还没有打开。";
      hintCopy.textContent = "";
      configureOutcomeButton("打开这封信", "reveal");
      return;
    }
    outcomeTitle.textContent = `给 ${config.recipientName}`;
    outcomeCopy.textContent = "这次投递已经完成。";
    hintCopy.textContent = "";
    configureOutcomeButton("再寄一次", "restart");
  }

  function configureOutcomeButton(label, action) {
    outcomeAction.textContent = label;
    outcomeAction.dataset.action = action;
  }

  function renderMailStage() {
    if (renderedMailPhase === state.phase) return;
    renderedMailPhase = state.phase;
    mailStage.replaceChildren();
    if (state.phase === "revealed") {
      const letter = document.createElement("article");
      letter.className = "letter-sheet";
      const to = paragraph(`给 ${config.recipientName}`, "letter-to");
      const title = document.createElement("h2");
      title.textContent = config.letterTitle;
      const body = document.createElement("div");
      body.className = "letter-body";
      for (const line of config.letterLines) body.append(paragraph(line));
      const signOff = paragraph(config.signOff, "letter-signoff");
      const sender = paragraph(`—— ${config.senderName}`, "letter-sender");
      letter.append(to, title, body, signOff, sender);
      mailStage.setAttribute("aria-label", "已经打开的信");
      mailStage.append(letter);
      return;
    }

    const envelope = document.createElement("div");
    envelope.className = `sealed-envelope${state.phase === "arrived" ? " is-arrived" : ""}`;
    const flap = document.createElement("span");
    flap.className = "envelope-flap";
    flap.setAttribute("aria-hidden", "true");
    const address = paragraph(`收件人 / ${config.recipientName}`, "envelope-address");
    const seal = document.createElement("span");
    seal.className = "wax-seal";
    seal.textContent = "✦";
    seal.setAttribute("aria-hidden", "true");
    const stateCopy = paragraph(state.phase === "arrived" ? "已送达 · 等你亲手打开" : "内容仍密封", "envelope-state");
    envelope.append(flap, address, seal, stateCopy);
    mailStage.setAttribute("aria-label", state.phase === "arrived" ? "已送达但尚未打开的信" : "尚未送达的密封信");
    mailStage.append(envelope);
  }

  function renderMapBase() {
    mapBase.replaceChildren();
    mapBase.append(svg("rect", { x: 0, y: 0, width: logic.WORLD.width, height: logic.WORLD.height, class: "map-sky" }));
    for (const x of [120, 240, 360, 480, 600, 720, 840]) {
      mapBase.append(svg("line", { x1: x, y1: 70, x2: x, y2: logic.WORLD.groundY, class: "map-grid" }));
    }
    for (const y of [110, 210, 310, 410, 510]) {
      mapBase.append(svg("line", { x1: 45, y1: y, x2: 955, y2: y, class: "map-grid" }));
    }
    for (const [cx, cy, radius] of [
      [94, 82, 3], [170, 130, 2], [270, 78, 2.8], [390, 150, 2], [520, 92, 3],
      [630, 175, 2], [735, 92, 2.5], [800, 150, 2], [905, 88, 3], [455, 230, 2],
    ]) mapBase.append(svg("circle", { cx, cy, r: radius, class: "map-star" }));
    mapBase.append(
      svg("circle", { cx: 132, cy: 126, r: 45, class: "moon" }),
      svg("circle", { cx: 151, cy: 111, r: 43, class: "moon-cutout" }),
      svg("path", { d: "M 20 500 L 75 455 L 122 474 L 182 430 L 235 465 L 300 415 L 360 460 L 432 421 L 500 470 L 570 430 L 645 468 L 720 420 L 790 455 L 855 410 L 980 470 L 980 530 L 20 530 Z", class: "map-horizon" }),
      svg("line", { x1: 20, y1: logic.WORLD.groundY, x2: 980, y2: logic.WORLD.groundY, class: "ground-line" }),
      svg("path", { d: "M 660 170 q 34 -20 68 0 M 682 196 q 34 -20 68 0 M 704 222 q 34 -20 68 0", class: "wind-mark" }),
    );

    const mailbox = svg("g", { class: "mailbox" });
    mailbox.append(
      svg("rect", { x: 825, y: 285, width: 120, height: 245, class: "mailbox-body" }),
      svg("path", { d: "M 825 330 A 60 60 0 0 1 945 330", class: "mailbox-roof" }),
      svg("rect", { x: 835, y: 330, width: 90, height: 90, class: "mailbox-opening" }),
      svg("rect", { x: 845, y: 344, width: 70, height: 15, class: "mailbox-slot" }),
      svg("line", { x1: 885, y1: 285, x2: 885, y2: 245, class: "mailbox-flag-pole" }),
      svg("path", { d: "M 885 245 L 945 257 L 885 275 Z", class: "mailbox-flag" }),
      svg("line", { x1: 855, y1: 530, x2: 855, y2: 575, class: "mailbox-leg" }),
      svg("line", { x1: 920, y1: 530, x2: 920, y2: 575, class: "mailbox-leg" }),
      svg("rect", { x: 830, y: 325, width: 100, height: 100, class: "target-outline" }),
    );
    mapBase.append(mailbox);
  }

  function renderMap() {
    previewLayer.replaceChildren();
    trailLayer.replaceChildren();
    planeLayer.replaceChildren();

    if (["intro", "aiming"].includes(state.phase)) {
      for (const point of logic.previewTrajectory(state)) {
        previewLayer.append(svg("circle", { cx: point.x, cy: point.y, r: 5.5, class: "preview-dot" }));
      }
    }
    if (["flying", "missed", "arrived", "revealed"].includes(state.phase) && state.elapsed > 0) {
      const points = [];
      for (let time = 0; time < state.elapsed; time += 0.05) points.push(logic.pointAtTime(state.angle, state.power, time));
      points.push(state.plane);
      const path = svg("path", { class: "flight-trail" });
      path.setAttribute("d", points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" "));
      trailLayer.append(path);
    }

    const plane = svg("g", {
      class: `paper-plane paper-plane--${state.phase}`,
      transform: `translate(${state.plane.x} ${state.plane.y}) rotate(${state.plane.rotation})`,
    });
    plane.append(
      svg("path", { d: "M -38 0 L 34 -21 L 12 3 L 34 18 Z", class: "plane-paper" }),
      svg("path", { d: "M -38 0 L 12 3 L -6 16 Z", class: "plane-fold" }),
      svg("path", { d: "M -25 -2 L -10 -7 M -18 4 L -2 0", class: "plane-stripe plane-stripe--red" }),
      svg("path", { d: "M -14 -5 L 1 -10 M -7 2 L 8 -2", class: "plane-stripe plane-stripe--blue" }),
    );
    planeLayer.append(plane);
    flightDescription.textContent = mapDescription();
  }

  function mapDescription() {
    if (state.phase === "intro") return "纸飞机还在起点，等待开始投递。";
    if (state.phase === "aiming") return `纸飞机在起点，当前仰角 ${state.angle} 度、力度 ${state.power} 格，虚线只预览最初一段航路。`;
    if (state.phase === "flying") return `纸飞机正在第 ${state.attemptNumber} 次飞行，当前位置横坐标 ${Math.round(state.plane.x)}，纵坐标 ${Math.round(state.plane.y)}。`;
    if (state.phase === "arrived" || state.phase === "revealed") return "纸飞机已经进入右侧邮箱开口，投递成功。";
    if (state.missReason === "short") return "纸飞机提前落地，停在邮箱之前。";
    if (state.missReason === "low") return "纸飞机到达邮箱时太低，擦过邮箱下沿。";
    return "纸飞机越过邮箱上方，没有进入开口。";
  }

  function scheduleFocus(kind) {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      if (kind === "start") document.querySelector("#start-button")?.focus({ preventScroll: true });
      else if (kind === "aim") angleInput.focus({ preventScroll: true });
      else if (kind === "outcome") outcomeAction.focus({ preventScroll: true });
    });
  }

  function paragraph(text, className) {
    const node = document.createElement("p");
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function svg(name, attributes) {
    const node = document.createElementNS(svgNamespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  }
})();
