(function () {
  "use strict";

  const logic = globalThis.INSTANT_PHOTO_LOGIC;
  if (!logic) {
    document.body.textContent = "拍立得显影加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const FALLBACK_PHOTO = "./assets/demo-bicycles.png";
  const DRAG_THRESHOLD = 48;
  const MAX_DRAG = 76;
  const config = logic.sanitizeConfig(globalThis.INSTANT_PHOTO_CONFIG);
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") ?? { matches: false };
  const status = document.querySelector("#photo-status");
  const studio = document.querySelector(".studio");
  const photo = document.querySelector("#instant-photo");
  const photoWindow = document.querySelector("#photo-window");
  const photoCopy = document.querySelector("#photo-copy");
  const stageCopy = document.querySelector("#stage-copy");
  const progressPanel = document.querySelector("#progress-panel");
  const remaining = document.querySelector("#remaining");
  const progressDots = document.querySelector("#progress-dots");
  const keyboardHint = document.querySelector(".keyboard-hint");

  let state = logic.createInitialState();
  let photoLoad = { phase: "loading", source: null, usedFallback: false };
  let drag = null;
  let ejectTimer = 0;
  let lastRenderedPhase = state.phase;

  preloadPhoto(config.photo, false);
  render();

  stageCopy.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "capture") {
      state = logic.capture(state);
      render();
      beginEject();
      return;
    }
    if (button.dataset.action === "restart") {
      cancelEject();
      state = logic.restart(state);
      resetDrag();
      render();
      return;
    }
    if (button.dataset.action === "retry-photo") {
      photoLoad = { phase: "loading", source: null, usedFallback: false };
      preloadPhoto(config.photo, false);
      render();
    }
  });

  photo.addEventListener("animationend", (event) => {
    if (event.animationName === "eject-photo") finishEject(state.ejectToken);
  });

  photo.addEventListener("pointerdown", (event) => {
    if (!canShake() || event.button !== 0) return;
    event.preventDefault();
    photo.setPointerCapture(event.pointerId);
    drag = { pointerId: event.pointerId, startX: event.clientX, zone: "center", delta: 0 };
    photo.classList.add("is-grabbing");
  });

  photo.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId || !canShake()) return;
    const delta = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, event.clientX - drag.startX));
    drag.delta = delta;
    setDragVisual(delta);
    const zone = delta >= DRAG_THRESHOLD ? "right" : delta <= -DRAG_THRESHOLD ? "left" : "center";
    if (zone === "center" || zone === drag.zone) return;
    drag.zone = zone;
    acceptDirection(zone);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    photo.addEventListener(eventName, (event) => {
      if (drag && event.pointerId === drag.pointerId) resetDrag();
    });
  }

  photo.addEventListener("keydown", (event) => {
    if (event.repeat || !canShake()) return;
    const direction = event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : null;
    if (!direction) return;
    event.preventDefault();
    acceptDirection(direction);
    flashDirection(direction);
  });

  window.addEventListener("blur", resetDrag);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetDrag();
  });
  window.addEventListener("beforeunload", cancelEject);

  function preloadPhoto(source, usedFallback) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      photoLoad = { phase: "ready", source, usedFallback };
      render();
    };
    image.onerror = () => {
      if (!usedFallback && source !== FALLBACK_PHOTO) {
        preloadPhoto(FALLBACK_PHOTO, true);
        return;
      }
      photoLoad = { phase: "error", source: null, usedFallback };
      resetDrag();
      render();
    };
    image.src = source;
  }

  function beginEject() {
    cancelEject();
    const token = state.ejectToken;
    if (reducedMotion.matches) {
      finishEject(token);
      return;
    }
    ejectTimer = window.setTimeout(() => finishEject(token), 780);
  }

  function finishEject(token) {
    window.clearTimeout(ejectTimer);
    ejectTimer = 0;
    state = logic.finishEject(state, token);
    render();
  }

  function cancelEject() {
    window.clearTimeout(ejectTimer);
    ejectTimer = 0;
  }

  function acceptDirection(direction) {
    const previous = state;
    state = logic.shake(state, direction);
    if (state === previous) return;
    render();
    if (state.phase === "complete") resetDrag();
  }

  function canShake() {
    return state.phase === "developing" && photoLoad.phase === "ready";
  }

  function setDragVisual(delta) {
    photo.style.setProperty("--drag-x", `${delta}px`);
    photo.style.setProperty("--drag-rotate", `${delta / MAX_DRAG * 4}deg`);
  }

  function resetDrag() {
    drag = null;
    photo.classList.remove("is-grabbing");
    setDragVisual(0);
  }

  function flashDirection(direction) {
    photo.style.setProperty("--drag-x", direction === "left" ? "-36px" : "36px");
    photo.style.setProperty("--drag-rotate", direction === "left" ? "-2deg" : "2deg");
    window.setTimeout(() => {
      if (!drag) setDragVisual(0);
    }, reducedMotion.matches ? 0 : 130);
  }

  function render() {
    const previousPhase = lastRenderedPhase;
    const progress = logic.getProgress(state);
    const isVisible = state.phase !== "intro";
    studio.dataset.phase = state.phase;
    status.textContent = state.phase === "intro" ? "等待快门" : `显影 ${progress}%`;
    photo.hidden = !isVisible;
    photo.classList.toggle("is-ejecting", state.phase === "ejecting");
    photo.classList.toggle("is-developing", state.phase === "developing");
    photo.classList.toggle("is-complete", state.phase === "complete");
    photo.setAttribute("aria-label", state.phase === "complete" ? "已经显影完成的照片" : `待显影的相纸，当前 ${progress}%`);
    photo.setAttribute("aria-disabled", String(!canShake()));
    renderPhoto(progress);
    renderControls(progress);
    lastRenderedPhase = state.phase;
    if (state.phase === "developing" && previousPhase !== "developing") {
      window.requestAnimationFrame(() => photo.focus({ preventScroll: true }));
    }
  }

  function renderPhoto(progress) {
    photoWindow.replaceChildren();
    photoCopy.replaceChildren();
    if (state.phase === "intro") return;

    if (photoLoad.phase === "ready") {
      const image = document.createElement("img");
      image.src = photoLoad.source;
      image.alt = state.phase === "complete" ? config.title : "正在显影的本地照片";
      image.draggable = false;
      const ratio = progress / 100;
      image.style.opacity = String(.18 + ratio * .82);
      image.style.filter = `grayscale(${1 - ratio}) saturate(${.55 + ratio * .45}) contrast(${.78 + ratio * .22}) blur(${(1 - ratio) * 5}px)`;
      const veil = document.createElement("span");
      veil.className = "developing-veil";
      veil.style.opacity = String(Math.max(0, .82 - ratio * .82));
      photoWindow.append(image, veil);
    } else {
      const loading = document.createElement("p");
      loading.className = photoLoad.phase === "error" ? "photo-error" : "photo-loading";
      loading.textContent = photoLoad.phase === "error" ? "照片没有装好" : "照片正在装片";
      photoWindow.append(loading);
    }

    if (state.phase === "complete") {
      const title = document.createElement("h2");
      const stamp = document.createElement("p");
      const caption = document.createElement("p");
      const note = document.createElement("blockquote");
      title.textContent = config.title;
      stamp.className = "photo-stamp";
      stamp.textContent = config.stamp;
      caption.className = "photo-caption";
      caption.textContent = config.caption;
      note.textContent = config.finalNote;
      photoCopy.append(title, stamp, caption, note);
    }
  }

  function renderControls(progress) {
    stageCopy.replaceChildren();
    progressDots.replaceChildren();
    const showProgress = state.phase === "developing" || state.phase === "complete";
    progressPanel.hidden = !showProgress;
    keyboardHint.hidden = state.phase !== "developing";

    if (state.phase === "intro") {
      stageCopy.append(
        heading("按下快门"),
        copy("照片会从相机里慢慢出来。"),
        action("按下快门", "capture", true),
      );
      return;
    }

    if (state.phase === "ejecting") {
      stageCopy.append(heading("相纸出来了"), copy("先别急，让它站稳一点。"));
      return;
    }

    if (photoLoad.phase === "error") {
      stageCopy.append(
        heading("照片没有装好"),
        copy("检查 assets 中的照片路径，再重新读取。"),
        action("重新检查", "retry-photo", true),
      );
      return;
    }

    if (state.phase === "developing") {
      stageCopy.append(
        heading("左右摇动这张照片"),
        copy(photoLoad.usedFallback
          ? "准备的照片暂时没有装好，先用示例继续。每次越过中线，影像会更清楚一点。"
          : "每次越过中线，影像会更清楚一点。"),
      );
    } else {
      stageCopy.append(
        heading("照片显影完成"),
        copy("这张照片和下面的话，现在都交给你。"),
        action("再显影一次", "restart", true),
      );
    }

    remaining.textContent = state.phase === "complete" ? "已经显影完成" : `还差 ${logic.SHAKES_REQUIRED - state.acceptedShakes} 次`;
    for (let index = 0; index < logic.SHAKES_REQUIRED; index += 1) {
      const dot = document.createElement("li");
      dot.className = index < state.acceptedShakes ? "is-filled" : "";
      dot.setAttribute("aria-hidden", "true");
      progressDots.append(dot);
    }
    progressDots.setAttribute("aria-label", `已完成 ${state.acceptedShakes} / ${logic.SHAKES_REQUIRED} 次有效摇动，显影 ${progress}%`);
  }

  function heading(value) {
    const element = document.createElement("h2");
    element.textContent = value;
    return element;
  }

  function copy(value) {
    const element = document.createElement("p");
    element.textContent = value;
    return element;
  }

  function action(label, name, focus = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-action";
    button.dataset.action = name;
    if (focus) button.dataset.focus = "";
    button.textContent = label;
    window.requestAnimationFrame(() => {
      if (focus) button.focus({ preventScroll: true });
    });
    return button;
  }
})();
