(function () {
  "use strict";

  const logic = window.SCRATCH_SURPRISE_LOGIC;
  const config = window.SCRATCH_SURPRISE_CONFIG;
  if (!logic || !config) return;

  const elements = {
    eyebrow: document.querySelector("#eyebrow"),
    title: document.querySelector("#title"),
    instruction: document.querySelector("#instruction"),
    giftLabel: document.querySelector("#gift-label"),
    giftCard: document.querySelector("#gift-card"),
    giftTitle: document.querySelector("#gift-title"),
    giftText: document.querySelector("#gift-text"),
    closing: document.querySelector("#closing"),
    sender: document.querySelector("#sender"),
    stage: document.querySelector("#scratch-stage"),
    canvas: document.querySelector("#scratch-canvas"),
    status: document.querySelector("#scratch-status"),
    announcement: document.querySelector("#reveal-announcement"),
    progress: document.querySelector("#progress-fill"),
    reveal: document.querySelector("#reveal-button"),
  };

  const context = elements.canvas.getContext("2d", { willReadFrequently: true });
  let state = { revealed: false, progress: 0 };
  let segments = [];
  let drawing = false;
  let activePointerId = null;
  let previousPoint = null;
  let pixelRatio = 1;

  applyConfig();
  bindControls();
  resizeCanvas();
  elements.giftCard.setAttribute("aria-hidden", "true");
  elements.stage.classList.add("ready");
  new ResizeObserver(resizeCanvas).observe(elements.stage);

  function applyConfig() {
    const mapping = {
      eyebrow: "eyebrow",
      title: "title",
      instruction: "instruction",
      giftLabel: "giftLabel",
      giftTitle: "giftTitle",
      giftText: "giftText",
      closing: "closing",
      sender: "sender",
    };
    for (const [elementName, configName] of Object.entries(mapping)) {
      elements[elementName].textContent = String(config[configName] ?? "");
    }
    elements.reveal.textContent = String(config.revealButtonText ?? "直接揭晓");
  }

  function bindControls() {
    elements.canvas.addEventListener("pointerdown", beginStroke);
    elements.canvas.addEventListener("pointermove", continueStroke);
    elements.canvas.addEventListener("pointerup", endStroke);
    elements.canvas.addEventListener("pointercancel", endStroke);
    elements.canvas.addEventListener("lostpointercapture", endStroke);
    elements.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    elements.reveal.addEventListener("click", () => completeReveal("button"));
  }

  function beginStroke(event) {
    if (state.revealed || activePointerId !== null || event.isPrimary === false) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (!point) return;
    drawing = true;
    activePointerId = event.pointerId;
    previousPoint = point;
    elements.canvas.setPointerCapture(event.pointerId);
  }

  function continueStroke(event) {
    if (!drawing || state.revealed || event.pointerId !== activePointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const segment = point && logic.normalizeSegment({
      x1: previousPoint.x,
      y1: previousPoint.y,
      x2: point.x,
      y2: point.y,
    });
    if (!segment) return;
    previousPoint = point;
    segments.push(segment);
    eraseSegment(segment);
  }

  function endStroke(event) {
    if (!drawing || event.pointerId !== activePointerId) return;
    drawing = false;
    previousPoint = null;
    if (event?.pointerId !== undefined && elements.canvas.hasPointerCapture(event.pointerId)) {
      elements.canvas.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
    measureProgress();
  }

  function pointFromEvent(event) {
    const rect = elements.canvas.getBoundingClientRect();
    return logic.normalizePoint(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
  }

  function resizeCanvas() {
    if (state.revealed) return;
    const rect = elements.stage.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (elements.canvas.width === width && elements.canvas.height === height) return;
    elements.canvas.width = width;
    elements.canvas.height = height;
    paintCover();
    segments.forEach(eraseSegment);
  }

  function paintCover() {
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    context.globalCompositeOperation = "source-over";
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#bb8a82");
    gradient.addColorStop(.52, "#d2a68d");
    gradient.addColorStop(1, "#a86b69");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(255, 247, 232, .12)";
    context.lineWidth = Math.max(1, pixelRatio);
    const spacing = 24 * pixelRatio;
    for (let offset = -height; offset < width; offset += spacing) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + height, height);
      context.stroke();
    }

    context.fillStyle = "rgba(255, 250, 240, .9)";
    const cssWidth = width / pixelRatio;
    const fontSize = Math.max(16, Math.min(25, cssWidth / 30));
    context.font = `600 ${fontSize * pixelRatio}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("从这里慢慢刮开", width / 2, height / 2);
  }

  function eraseSegment(segment) {
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = "rgba(0, 0, 0, 1)";
    context.lineWidth = logic.getBrushSize(width / pixelRatio, height / pixelRatio) * pixelRatio;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(segment.x1 * width, segment.y1 * height);
    context.lineTo(segment.x2 * width, segment.y2 * height);
    context.stroke();
  }

  function measureProgress() {
    const imageData = context.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
    const ratio = logic.sampleTransparentRatio(imageData, 16);
    state = logic.updateRevealState(state, ratio);
    const percent = Math.round(state.progress * 100);
    elements.progress.style.width = `${Math.min(100, percent)}%`;
    if (state.revealed) completeReveal("scratch");
    else elements.status.textContent = `已经刮开约 ${percent}%，再多一点就会完整揭晓。`;
  }

  function completeReveal(source) {
    if (elements.stage.classList.contains("revealed")) return;
    state = { revealed: true, progress: 1 };
    drawing = false;
    activePointerId = null;
    previousPoint = null;
    elements.stage.classList.add("revealed");
    elements.giftCard.removeAttribute("aria-hidden");
    elements.canvas.setAttribute("aria-hidden", "true");
    elements.progress.style.width = "100%";
    elements.status.textContent = source === "button" ? "惊喜已经直接揭晓。" : "刮开完成，惊喜已经全部出现。";
    elements.announcement.textContent = `惊喜揭晓：${elements.giftTitle.textContent}。${elements.giftText.textContent}`;
    elements.reveal.disabled = true;
    elements.reveal.textContent = "已经揭晓";
  }
})();
