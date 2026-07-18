(function () {
  "use strict";

  const logic = globalThis.HAND_CRANK_MUSIC_BOX_LOGIC;
  if (!logic) return;

  const rawConfig = globalThis.HAND_CRANK_MUSIC_BOX_CONFIG;
  const config = logic.sanitizeConfig(rawConfig);
  const frequencyByNoteId = Object.freeze({
    c5: 523.25,
    d5: 587.33,
    e5: 659.25,
    f5: 698.46,
    g5: 783.99,
    a5: 880,
    c6: 1046.5,
    d6: 1174.66,
  });
  const silentTonePlayer = Object.freeze({
    async ensureReady() { return false; },
    playTone() { return false; },
    async close() {},
  });
  const tonePlayer = globalThis.TWO_OF_US_TONE_PLAYER?.createTonePlayer?.() || silentTonePlayer;

  const elements = {
    body: document.body,
    soundButtons: [document.querySelector("#sound-button"), document.querySelector("#mobile-sound-button")],
    soundLabels: [document.querySelector("#sound-label"), document.querySelector("#mobile-sound-label")],
    soundNotes: [document.querySelector("#sound-note"), document.querySelector("#mobile-sound-note")],
    primaryButtons: [document.querySelector("#primary-button"), document.querySelector("#mobile-primary-button")],
    turnCounts: [document.querySelector("#turn-count"), document.querySelector("#mobile-turn-count")],
    turnTracks: [document.querySelector("#turn-track"), document.querySelector("#mobile-turn-track")],
    lidScene: document.querySelector("#lid-scene"),
    dioramaImages: [document.querySelector("#diorama-image"), document.querySelector("#diorama-reveal-image")],
    cylinder: document.querySelector("#cylinder"),
    toothWindow: document.querySelector("#tooth-window"),
    crank: document.querySelector("#crank-control"),
    crankHint: document.querySelector("#crank-hint"),
    advanceButton: document.querySelector("#advance-button"),
    liveRegion: document.querySelector("#live-region"),
  };

  let state = logic.createInitialState(config);
  let soundEnabled = true;
  let audioAvailable = null;
  let audioEpoch = 0;
  let readinessPromise = null;
  let noteQueue = Promise.resolve();
  let lastToneStartedAt = 0;
  let pointerId = null;
  let previousPointerAngle = null;
  let lastAnnouncedTurn = 0;
  let audioUnavailableAnnounced = false;

  buildFixedDetails();
  bindEvents();
  render();

  function buildFixedDetails() {
    for (const track of elements.turnTracks) {
      const teeth = Array.from({ length: logic.TOTAL_TURNS }, (_, index) => {
        const item = document.createElement("li");
        item.dataset.turn = String(index + 1);
        item.setAttribute("aria-label", `第 ${index + 1} 圈`);
        return item;
      });
      track.replaceChildren(...teeth);
    }

    const toothNodes = Array.from({ length: state.motif.length }, (_, index) => {
      const tooth = document.createElement("span");
      tooth.dataset.tooth = String(index);
      return tooth;
    });
    elements.toothWindow.style.setProperty("--motif-length", String(state.motif.length));
    elements.toothWindow.replaceChildren(...toothNodes);
  }

  function bindEvents() {
    for (const button of elements.primaryButtons) button.addEventListener("click", handlePrimaryAction);
    for (const button of elements.soundButtons) button.addEventListener("click", toggleSound);
    elements.advanceButton.addEventListener("click", advanceOneStep);

    elements.crank.addEventListener("pointerdown", beginPointerSession);
    elements.crank.addEventListener("pointermove", movePointerSession);
    elements.crank.addEventListener("pointerup", endPointerSession);
    elements.crank.addEventListener("pointercancel", endPointerSession);
    elements.crank.addEventListener("lostpointercapture", clearPointerSession);
    elements.crank.addEventListener("keydown", handleCrankKeydown);

    for (const image of elements.dioramaImages) image.addEventListener("error", useImageFallback, { once: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", closeAudio, { once: true });
  }

  function handlePrimaryAction() {
    if (state.phase === "intro") {
      state = logic.start(state);
      render();
      void ensureAudioReady();
      requestAnimationFrame(() => elements.crank.focus());
      return;
    }
    if (state.phase === "complete") {
      invalidateAudio();
      state = logic.restart(state);
      lastAnnouncedTurn = 0;
      removeFinalMessage();
      render();
    }
  }

  function handleCrankKeydown(event) {
    if (event.key !== "ArrowRight" && event.key !== " ") return;
    event.preventDefault();
    advanceOneStep();
  }

  function advanceOneStep() {
    if (state.phase !== "playing") return;
    void ensureAudioReady();
    commitState(logic.advanceOneStep(state));
  }

  function beginPointerSession(event) {
    if (state.phase !== "playing" || !event.isPrimary) return;
    const angle = pointerAngle(event);
    if (!Number.isFinite(angle)) return;
    pointerId = event.pointerId;
    previousPointerAngle = angle;
    elements.crank.setPointerCapture?.(event.pointerId);
    void ensureAudioReady();
    event.preventDefault();
  }

  function movePointerSession(event) {
    if (event.pointerId !== pointerId || previousPointerAngle === null || state.phase !== "playing") return;
    const nextPointerAngle = pointerAngle(event);
    const delta = logic.normalizeAngularDelta(previousPointerAngle, nextPointerAngle);
    previousPointerAngle = nextPointerAngle;
    if (delta === null) return;
    commitState(logic.applyAngularDelta(state, delta));
    event.preventDefault();
  }

  function endPointerSession(event) {
    if (event.pointerId !== pointerId) return;
    if (elements.crank.hasPointerCapture?.(event.pointerId)) elements.crank.releasePointerCapture(event.pointerId);
    clearPointerSession();
  }

  function clearPointerSession() {
    pointerId = null;
    previousPointerAngle = null;
  }

  function pointerAngle(event) {
    const bounds = elements.crank.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    return Math.atan2(event.clientY - centerY, event.clientX - centerX);
  }

  function commitState(nextState) {
    const previousStep = state.stepIndex;
    state = nextState;
    if (state.stepIndex > previousStep) queueCurrentNote(state.lastNoteId);
    render();
    announceMilestones();
  }

  function queueCurrentNote(noteId) {
    if (!soundEnabled || !noteId) return;
    const epoch = audioEpoch;
    noteQueue = noteQueue.then(() => playQueuedNote(noteId, epoch));
  }

  async function playQueuedNote(noteId, epoch) {
    const ready = await ensureAudioReady(epoch);
    if (!ready || epoch !== audioEpoch || !soundEnabled || document.hidden) return;

    const elapsed = performance.now() - lastToneStartedAt;
    if (elapsed < 72) await new Promise((resolve) => window.setTimeout(resolve, 72 - elapsed));
    if (epoch !== audioEpoch || !soundEnabled || document.hidden) return;

    const played = tonePlayer.playTone({
      frequency: frequencyByNoteId[noteId],
      type: "triangle",
      duration: .22,
      attack: .012,
      gain: .075,
    });
    if (played) lastToneStartedAt = performance.now();
    else markAudioUnavailable(epoch);
  }

  async function ensureAudioReady(epoch = audioEpoch) {
    if (epoch !== audioEpoch || !soundEnabled) return false;
    if (audioAvailable === true) return true;
    if (!readinessPromise) {
      const pending = Promise.resolve()
        .then(() => tonePlayer.ensureReady())
        .then(Boolean, () => false);
      readinessPromise = pending;
      pending.finally(() => {
        if (readinessPromise === pending) readinessPromise = null;
      });
    }
    const ready = await readinessPromise;
    if (epoch !== audioEpoch || !soundEnabled) return false;
    audioAvailable = ready;
    if (!ready) markAudioUnavailable(epoch);
    renderSoundControls();
    return ready;
  }

  function markAudioUnavailable(epoch = audioEpoch) {
    if (epoch !== audioEpoch) return;
    audioAvailable = false;
    if (!audioUnavailableAnnounced) {
      audioUnavailableAnnounced = true;
      announce("声音暂时不可用，无声也能继续");
    }
    renderSoundControls();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    invalidateAudio();
    if (!soundEnabled) {
      renderSoundControls();
    } else {
      void ensureAudioReady();
    }
    renderSoundControls();
  }

  function handleVisibilityChange() {
    if (!document.hidden) return;
    clearPointerSession();
    invalidateAudio();
    renderSoundControls();
  }

  function closeAudio() {
    clearPointerSession();
    invalidateAudio();
  }

  function invalidateAudio() {
    audioEpoch += 1;
    readinessPromise = null;
    noteQueue = Promise.resolve();
    lastToneStartedAt = 0;
    audioAvailable = null;
    void tonePlayer.close();
  }

  function useImageFallback() {
    elements.lidScene.classList.add("image-failed");
    for (const image of elements.dioramaImages) {
      image.hidden = true;
      image.removeAttribute("src");
    }
  }

  function render() {
    const progress = logic.getDerivedProgress(state);
    elements.body.dataset.phase = state.phase;
    elements.body.dataset.step = String(state.stepIndex);
    elements.body.style.setProperty("--crank-angle", `${state.currentAngle}rad`);
    elements.body.style.setProperty("--reveal-ratio", String(progress.ratio));
    elements.body.style.setProperty("--reveal-hidden", `${(1 - progress.ratio) * 100}%`);
    elements.body.style.setProperty("--reveal-opacity", String(.22 + progress.ratio * .78));
    elements.cylinder.style.transform = `rotate(${state.currentAngle}rad)`;

    const playing = state.phase === "playing";
    const complete = state.phase === "complete";
    elements.crank.disabled = !playing;
    elements.advanceButton.disabled = !playing;
    elements.crank.setAttribute("aria-valuemin", "0");
    elements.crank.setAttribute("aria-valuemax", String(logic.TOTAL_STEPS));
    elements.crank.setAttribute("aria-valuenow", String(state.stepIndex));
    elements.crank.setAttribute("aria-valuetext", `${state.completedTurns} / ${logic.TOTAL_TURNS} 圈，第 ${state.stepIndex} / ${logic.TOTAL_STEPS} 格`);

    for (const button of elements.primaryButtons) {
      button.hidden = playing;
      button.textContent = complete ? "再转一次" : "开始转动";
    }
    elements.crankHint.textContent = playing ? "拖动摇柄，或按 → 转一格" : complete ? "旋律已经转到最后" : "开始后，顺时针转动摇柄";

    renderProgress();
    renderToothWindow(progress);
    renderSoundControls();
    if (complete) createFinalMessage();
  }

  function renderProgress() {
    const count = `${state.completedTurns} / ${logic.TOTAL_TURNS} 圈`;
    for (const node of elements.turnCounts) node.textContent = count;
    for (const track of elements.turnTracks) {
      const teeth = [...track.children];
      teeth.forEach((tooth, index) => {
        tooth.classList.toggle("is-complete", index < state.completedTurns);
        tooth.classList.toggle("is-current", state.phase === "playing" && index === state.completedTurns);
        tooth.setAttribute("aria-current", state.phase === "playing" && index === state.completedTurns ? "step" : "false");
      });
      track.setAttribute("aria-label", `已完成 ${state.completedTurns} 圈，共 ${logic.TOTAL_TURNS} 圈`);
    }
  }

  function renderToothWindow(progress) {
    [...elements.toothWindow.children].forEach((tooth, index) => {
      tooth.classList.toggle("is-active", index === progress.activeTooth);
    });
  }

  function renderSoundControls() {
    const muted = !soundEnabled;
    for (const button of elements.soundButtons) {
      button.setAttribute("aria-pressed", String(muted));
      button.setAttribute("aria-label", muted ? "开启声音" : "静音");
    }
    for (const label of elements.soundLabels) label.textContent = muted ? "静音" : "声音";
    for (const note of elements.soundNotes) note.hidden = audioAvailable !== false;
  }

  function announceMilestones() {
    if (state.completedTurns > lastAnnouncedTurn) {
      lastAnnouncedTurn = state.completedTurns;
      announce(state.phase === "complete" ? "八圈完成，留言已经展开" : `已完成第 ${state.completedTurns} 圈`);
    }
  }

  function announce(message) {
    elements.liveRegion.textContent = "";
    requestAnimationFrame(() => { elements.liveRegion.textContent = message; });
  }

  function createFinalMessage() {
    if (elements.lidScene.querySelector(".final-message")) return;
    const message = document.createElement("section");
    message.className = "final-message";
    message.setAttribute("aria-label", "最终留言");

    const recipient = document.createElement("p");
    recipient.className = "final-recipient";
    recipient.textContent = config.recipientName;

    const title = document.createElement("h2");
    title.textContent = config.finalTitle;

    const body = document.createElement("p");
    body.className = "final-body";
    body.textContent = config.finalMessage;

    message.append(recipient, title, body);
    elements.lidScene.append(message);
  }

  function removeFinalMessage() {
    elements.lidScene.querySelector(".final-message")?.remove();
  }
})();
