(function () {
  "use strict";

  const logic = globalThis.LIGHT_GROWN_TREE_LOGIC;
  const canvas = document.querySelector("#tree-canvas");
  const canvasFrame = document.querySelector(".canvas-frame");
  const canvasFallback = document.querySelector("#canvas-fallback");
  const lightHandle = document.querySelector("#light-handle");
  const primaryButton = document.querySelector("#primary-button");
  const growButton = document.querySelector("#grow-button");
  const restartButton = document.querySelector("#restart-button");
  const growthNote = document.querySelector("#growth-note");
  const stepCount = document.querySelector("#step-count");
  const branchCount = document.querySelector("#branch-count");
  const progressFill = document.querySelector("#progress-fill");
  const textMirror = document.querySelector("#text-mirror");
  const letterPanel = document.querySelector("#letter-panel");
  const letterRecipient = document.querySelector("#letter-recipient");
  const letterTitle = document.querySelector("#letter-title");
  const letterBody = document.querySelector("#letter-body");
  const letterSignature = document.querySelector("#letter-signature");
  const together = document.querySelector("#together");
  const togetherValue = document.querySelector("#together-value");
  const liveRegion = document.querySelector("#live-region");

  const reducedMotion = globalThis.matchMedia
    ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  const context = getContext();
  let state = logic.createInitialState(globalThis.LIGHT_GROWN_TREE_CONFIG);
  let togetherTimer = null;
  let pointerId = null;

  if (!context) canvasFallback.hidden = false;

  primaryButton.addEventListener("click", () => {
    setState(logic.start(state));
    growButton.focus();
  });
  growButton.addEventListener("click", () => setState(logic.growOnce(state)));
  restartButton.addEventListener("click", () => {
    setState(logic.restart(state));
    primaryButton.focus();
  });

  lightHandle.addEventListener("pointerdown", (event) => {
    if (lightHandle.disabled) return;
    pointerId = event.pointerId;
    lightHandle.setPointerCapture(pointerId);
  });
  lightHandle.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    setState(logic.moveLight(state, toGrowthSpace(event.clientX, event.clientY)));
  });
  for (const type of ["pointerup", "pointercancel"]) {
    lightHandle.addEventListener(type, (event) => {
      if (pointerId !== event.pointerId) return;
      if (lightHandle.hasPointerCapture(pointerId)) lightHandle.releasePointerCapture(pointerId);
      pointerId = null;
    });
  }

  // 画面上任意位置按下也能把光挪过去，但键盘用户仍然只需要方向键。
  canvasFrame.addEventListener("pointerdown", (event) => {
    if (event.target === lightHandle || lightHandle.disabled) return;
    setState(logic.moveLight(state, toGrowthSpace(event.clientX, event.clientY)));
  });

  lightHandle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 0.16 : 0.06;
    const moves = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setState(logic.nudgeLight(state, move[0], move[1]));
  });

  globalThis.addEventListener("resize", () => {
    resizeCanvas();
    render();
  });

  resizeCanvas();
  render();

  function setState(next) {
    if (next === state) return;
    const previous = state;
    state = next;
    render();
    announce(previous);
  }

  function getContext() {
    try {
      return canvas.getContext ? canvas.getContext("2d") : null;
    } catch {
      return null;
    }
  }

  function resizeCanvas() {
    if (!context) return;
    const rect = canvasFrame.getBoundingClientRect();
    const ratio = Math.min(3, globalThis.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // 归一化坐标 → 画面像素。地面留出 12% 的空白，树顶留 8%。
  function projection() {
    const rect = canvasFrame.getBoundingClientRect();
    const groundY = rect.height * 0.88;
    const unit = rect.height * 0.8 / logic.TIP_BOUNDS.maxY;
    return {
      width: rect.width,
      height: rect.height,
      toPixels: (x, y) => ({ x: rect.width / 2 + x * unit, y: groundY - y * unit }),
    };
  }

  function toGrowthSpace(clientX, clientY) {
    const rect = canvasFrame.getBoundingClientRect();
    const view = projection();
    const point = view.toPixels(0, 0);
    const unit = rect.height * 0.8 / logic.TIP_BOUNDS.maxY;
    return {
      x: (clientX - rect.left - rect.width / 2) / unit,
      y: (point.y - (clientY - rect.top)) / unit,
    };
  }

  function render() {
    document.body.dataset.phase = state.phase;
    const progress = logic.getDerivedProgress(state);

    primaryButton.hidden = state.phase !== "intro";
    growButton.disabled = state.phase !== "growing";
    lightHandle.disabled = state.phase === "intro";
    stepCount.textContent = `${progress.stepIndex} / ${progress.totalSteps} 节`;
    branchCount.textContent = `${Math.max(1, progress.branchCount)} 根枝`;
    progressFill.style.width = `${progress.ratio * 100}%`;
    growthNote.textContent = state.lastNote || (state.phase === "intro"
      ? "十二节之后，它会开花。"
      : state.phase === "complete" ? "它开花了。" : growthNote.textContent);

    positionLight();
    renderTextMirror();
    renderCanvas();
    renderLetter();
  }

  function positionLight() {
    const view = projection();
    const point = view.toPixels(state.light.x, state.light.y);
    lightHandle.style.transform = `translate(${point.x}px, ${point.y}px)`;
  }

  function renderTextMirror() {
    // 画面之外的进度镜像：不依赖 canvas 也能知道树长到哪、往哪长。
    const entries = [];
    if (state.phase !== "intro") {
      entries.push(`已经长了 ${state.stepIndex} 节，共 ${state.tips.length} 根枝。`);
      entries.push(`光现在在${logic.describeDirection(state.light)}。`);
    }
    if (state.phase === "complete") entries.push(`${state.blossoms.length} 朵花开了。`);

    textMirror.replaceChildren(...entries.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
  }

  function renderCanvas() {
    if (!context) return;
    const view = projection();
    context.clearRect(0, 0, view.width, view.height);
    drawGround(view);

    for (const segment of state.segments) {
      const from = view.toPixels(segment.x1, segment.y1);
      const to = view.toPixels(segment.x2, segment.y2);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = branchColor(segment.generation);
      context.lineWidth = Math.max(1.6, (8.4 - segment.generation * 1.8) * (view.height / 460));
      context.lineCap = "round";
      context.stroke();
    }

    for (const blossom of state.blossoms) {
      const point = view.toPixels(blossom.x, blossom.y);
      const radius = (4 + blossom.size * 4.5) * (view.height / 460);
      const gradient = context.createRadialGradient(
        point.x, point.y, 0, point.x, point.y, radius * 2.2,
      );
      gradient.addColorStop(0, blossom.tint > 0.5 ? "#f7b9c4" : "#f3d9a8");
      gradient.addColorStop(1, "rgba(240, 160, 173, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(point.x, point.y, radius * 2.2, 0, Math.PI * 2);
      context.fill();
    }

    if (state.phase !== "intro") drawLightPool(view);
  }

  function drawGround(view) {
    const ground = view.toPixels(0, 0);
    const gradient = context.createLinearGradient(view.width * 0.14, 0, view.width * 0.86, 0);
    gradient.addColorStop(0, "rgba(242, 236, 226, 0)");
    gradient.addColorStop(0.5, "rgba(242, 236, 226, .17)");
    gradient.addColorStop(1, "rgba(242, 236, 226, 0)");
    context.fillStyle = gradient;
    context.fillRect(view.width * 0.14, ground.y, view.width * 0.72, 1.4);
  }

  function drawLightPool(view) {
    const point = view.toPixels(state.light.x, state.light.y);
    const radius = view.height * 0.34;
    const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    gradient.addColorStop(0, "rgba(246, 198, 106, .16)");
    gradient.addColorStop(1, "rgba(246, 198, 106, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const BRANCH_SHADES = Object.freeze(["#7d5f47", "#8a6a4e", "#9a7a5b", "#ab8b6a"]);

  function branchColor(generation) {
    return BRANCH_SHADES[Math.min(BRANCH_SHADES.length - 1, generation)];
  }

  function renderLetter() {
    const complete = state.phase === "complete";
    letterPanel.hidden = !complete;
    stopTogetherTimer();
    if (!complete) return;

    letterRecipient.textContent = state.config.recipientName;
    letterTitle.textContent = state.config.finalTitle;
    letterBody.replaceChildren(...state.config.letterLines.map((line, index) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      paragraph.style.transitionDelay = reducedMotion.matches ? "0s" : `${index * 0.34}s`;
      return paragraph;
    }));
    letterSignature.textContent = state.config.signature;
    revealLetterLines();

    if (state.config.togetherSince === null) {
      together.hidden = true;
      return;
    }
    together.hidden = false;
    updateTogether();
    togetherTimer = globalThis.setInterval(updateTogether, 1000);
  }

  // 先标记为“正在入场”，下一帧再摘掉标记让过渡跑起来。拿不到 rAF 时直接摘掉，
  // 结果只是少一次淡入，信仍然完整可读。
  function revealLetterLines() {
    if (reducedMotion.matches) return;
    letterPanel.dataset.entering = "true";
    const clear = () => letterPanel.removeAttribute("data-entering");
    if (typeof globalThis.requestAnimationFrame !== "function") {
      clear();
      return;
    }
    globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(clear));
  }

  function updateTogether() {
    const duration = logic.formatTogetherDuration(Date.now() - state.config.togetherSince);
    if (!duration) {
      together.hidden = true;
      stopTogetherTimer();
      return;
    }
    togetherValue.textContent =
      `${duration.days} 天 ${pad(duration.hours)} 小时 ${pad(duration.minutes)} 分 ${pad(duration.seconds)} 秒`;
  }

  function stopTogetherTimer() {
    if (togetherTimer === null) return;
    globalThis.clearInterval(togetherTimer);
    togetherTimer = null;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function announce(previous) {
    if (state.phase === "complete" && previous.phase !== "complete") {
      liveRegion.textContent = `树长满了十二节，${state.blossoms.length} 朵花开了，信已经展开。`;
      return;
    }
    if (state.stepIndex !== previous.stepIndex) {
      liveRegion.textContent =
        `第 ${state.stepIndex} 节，朝${logic.describeDirection(previous.light)}长了一节，还剩 ${logic.TOTAL_STEPS - state.stepIndex} 节。`;
      return;
    }
    if (state.light !== previous.light && state.phase !== "intro") {
      liveRegion.textContent = `光移到${logic.describeDirection(state.light)}。`;
    }
  }
})();
