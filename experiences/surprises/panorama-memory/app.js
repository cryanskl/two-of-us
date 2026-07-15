(function () {
  "use strict";

  const logic = window.PANORAMA_MEMORY_LOGIC;
  const elements = {
    chooseLabel: document.querySelector("#choose-label"),
    fileInput: document.querySelector("#panorama-file"),
    stage: document.querySelector("#panorama-stage"),
    viewer: document.querySelector("#viewer"),
    placeholder: document.querySelector("#placeholder"),
    emptyMessage: document.querySelector("#empty-message"),
    status: document.querySelector("#live-status"),
    viewerHelp: document.querySelector("#viewer-help"),
    replaceButton: document.querySelector("#replace-button"),
    clearButton: document.querySelector("#clear-button"),
    startupCopy: document.querySelector("#startup-copy"),
  };

  let validationToken = 0;
  let viewerGeneration = 0;
  let active = null;
  let runtimeReady = false;
  const candidateUrls = new Set();

  bindLifecycleCleanup();

  if (!isLocalServer()) {
    showStaticMode("这是 B 级体验。请先从仓库根目录运行本地启动器，再回到这里选择照片。");
    return;
  }
  if (!logic || !window.pannellum || typeof window.pannellum.viewer !== "function") {
    showStaticMode("全景依赖没有加载成功，请重新运行 setup 后再启动本地服务。");
    return;
  }

  runtimeReady = true;
  elements.startupCopy.textContent = "B 级体验 · 本地运行时已就绪";
  elements.fileInput.disabled = false;
  elements.chooseLabel.hidden = false;
  elements.fileInput.addEventListener("change", handleInputChange);
  elements.replaceButton.addEventListener("click", () => elements.fileInput.click());
  elements.clearButton.addEventListener("click", clearPhoto);

  function isLocalServer() {
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function showStaticMode(message) {
    elements.fileInput.disabled = true;
    elements.chooseLabel.hidden = true;
    elements.replaceButton.disabled = true;
    elements.clearButton.disabled = true;
    showStatus(message, "error");
  }

  function handleInputChange(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (file) validateAndOpen(file);
  }

  async function validateAndOpen(file) {
    const token = ++validationToken;
    const metadata = logic.validateFileMetadata({ type: file.type, size: file.size });
    showStatus("正在检查照片格式和尺寸…", "info");

    if (!metadata.ok) {
      showCandidateFailure(metadata.message);
      return;
    }

    const candidateUrl = URL.createObjectURL(file);
    candidateUrls.add(candidateUrl);

    let dimensions;
    try {
      dimensions = await decodeDimensions(candidateUrl);
    } catch {
      releaseCandidate(candidateUrl);
      if (token !== validationToken) return;
      showCandidateFailure("浏览器无法解码这张照片，请确认文件没有损坏。");
      return;
    }

    if (token !== validationToken) {
      releaseCandidate(candidateUrl);
      return;
    }

    const assessed = logic.assessPanoramaDimensions(dimensions);
    if (!assessed.ok) {
      releaseCandidate(candidateUrl);
      showCandidateFailure(assessed.message);
      return;
    }

    candidateUrls.delete(candidateUrl);
    openViewer(candidateUrl, assessed);
  }

  function decodeDimensions(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("decode-failed"));
      image.src = url;
    });
  }

  function showCandidateFailure(message) {
    const suffix = active ? " 当前全景已保留。" : "";
    showStatus(`${message}${suffix}`, "error");
  }

  function openViewer(url, assessed) {
    destroyActiveViewer();

    const id = ++viewerGeneration;
    active = { id, url, viewer: null, state: "loading", warning: assessed.warnings[0] || null };
    elements.viewer.hidden = false;
    elements.placeholder.hidden = false;
    elements.emptyMessage.textContent = "正在打开全景照片…";
    syncControls();
    showStatus("正在本机浏览器中加载全景照片…", "info");

    let viewer;
    try {
      viewer = window.pannellum.viewer(elements.viewer, {
        type: "equirectangular",
        panorama: url,
        autoLoad: true,
        autoRotate: false,
        orientationOnByDefault: false,
        showControls: true,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        compass: false,
        hotSpots: [],
        escapeHTML: true,
        strings: {
          loadButtonLabel: "加载全景",
          loadingLabel: "正在加载…",
          bylineLabel: "作者：%s",
          noPanoramaError: "没有指定全景照片。",
          fileAccessError: "无法读取照片 %s。",
          malformedURLError: "照片地址无效。",
          iOS8WebGLError: "当前设备无法显示这张全景照片。",
          genericWebGLError: "当前浏览器或设备不支持显示 WebGL 全景。",
          textureSizeError: "照片宽度为 %spx，但设备最多支持 %spx，请先缩小照片。",
          unknownError: "全景加载失败，请换一张照片重试。",
        },
      });
    } catch {
      failActiveViewer(id, "无法创建全景查看器，请确认浏览器支持 WebGL。");
      return;
    }

    if (!active || active.id !== id) {
      viewer.destroy();
      return;
    }
    active.viewer = viewer;
    viewer.on("load", () => finishViewerLoad(id));
    viewer.on("error", () => failActiveViewer(id, "全景照片加载失败，请换一张照片重试。"));
  }

  function finishViewerLoad(id) {
    if (!active || active.id !== id) return;
    active.state = "ready";
    elements.placeholder.hidden = true;
    elements.viewerHelp.hidden = false;
    if (active.warning) showStatus(`${active.warning.message} 照片只在这台设备的当前页面中。`, "warning");
    else showStatus("全景已经准备好。照片只在这台设备的当前页面中，不会上传或保存。", "info");
    syncControls();
  }

  function failActiveViewer(id, message) {
    if (!active || active.id !== id) return;
    destroyActiveViewer();
    renderIdle();
    showStatus(message, "error");
  }

  function clearPhoto() {
    validationToken += 1;
    releaseAllCandidates();
    destroyActiveViewer();
    renderIdle();
    showStatus("照片已从当前页面清除，对象地址也已释放。", "info");
  }

  function renderIdle() {
    elements.viewer.hidden = true;
    elements.viewerHelp.hidden = true;
    elements.placeholder.hidden = false;
    elements.emptyMessage.textContent = "还没有选择照片";
    syncControls();
  }

  function syncControls() {
    const hasActive = Boolean(active);
    elements.chooseLabel.hidden = !runtimeReady || hasActive;
    elements.replaceButton.disabled = !hasActive;
    elements.clearButton.disabled = !hasActive;
  }

  function destroyActiveViewer() {
    const previous = active;
    active = null;
    if (!previous) return;
    try {
      previous.viewer?.destroy();
    } catch {
      // 清理必须幂等；上游已销毁时不阻断对象 URL 释放。
    }
    safeRevoke(previous.url);
    elements.viewer.replaceChildren();
  }

  function releaseCandidate(url) {
    candidateUrls.delete(url);
    safeRevoke(url);
  }

  function releaseAllCandidates() {
    for (const url of candidateUrls) safeRevoke(url);
    candidateUrls.clear();
  }

  function safeRevoke(url) {
    if (url) URL.revokeObjectURL(url);
  }

  function showStatus(message, kind) {
    elements.status.textContent = message;
    elements.status.dataset.kind = kind;
  }

  function bindLifecycleCleanup() {
    const cleanup = () => {
      validationToken += 1;
      releaseAllCandidates();
      destroyActiveViewer();
      if (runtimeReady) renderIdle();
    };
    window.addEventListener("pagehide", cleanup);
    window.addEventListener("beforeunload", cleanup);
  }
})();
