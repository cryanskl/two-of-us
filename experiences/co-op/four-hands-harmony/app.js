(function () {
  "use strict";

  const config = globalThis.FOUR_HANDS_HARMONY_CONFIG || {};
  const logic = globalThis.FOUR_HANDS_HARMONY_LOGIC;
  const root = document.querySelector("#harmony-app");
  const phaseHost = document.querySelector("#phase-host");
  const liveStatus = document.querySelector("#live-status");
  const soundToggle = document.querySelector("#sound-toggle");
  const soundLabel = document.querySelector("#sound-label");

  if (!logic || !root || !phaseHost || !liveStatus || !soundToggle || !soundLabel) {
    document.body.textContent = "这一拍，刚好和你";
    return;
  }

  const audioFactory = globalThis.TWO_OF_US_TONE_PLAYER || globalThis.TWO_OF_US_AUDIO;
  const silentPlayer = Object.freeze({
    ensureReady: async () => false,
    playTone: () => false,
    close: async () => {},
  });
  const lowNotes = new Map(logic.LOW_NOTES.map((note) => [note.id, note]));
  const highNotes = new Map(logic.HIGH_NOTES.map((note) => [note.id, note]));
  const pressedKeys = new Set();
  const activePointers = new Map();
  const safeConfig = logic.sanitizeHarmonyConfig(config);

  let state = logic.createHarmonyState(config);
  let view = logic.getHarmonyView(state);
  let structure = "";
  let lastFrameTime = null;
  let accumulatorMs = 0;
  let soundEnabled = true;
  let audioReady = false;
  let audioPreparing = false;
  let audioUnavailable = !audioFactory || typeof audioFactory.createTonePlayer !== "function";
  let audioGeneration = 0;
  let tonePlayer = createTonePlayer();
  let playedCompletedCount = view.completed.length;
  let announcedKey = "";

  phaseHost.addEventListener("click", handleActionClick);
  phaseHost.addEventListener("pointerdown", handlePointerDown);
  phaseHost.addEventListener("pointerup", handlePointerRelease);
  phaseHost.addEventListener("pointercancel", handlePointerRelease);
  phaseHost.addEventListener("lostpointercapture", handlePointerRelease, true);
  document.addEventListener("pointerup", handlePointerRelease);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interrupt("hidden");
  });
  globalThis.addEventListener("blur", () => interrupt("blur"));
  globalThis.addEventListener("beforeunload", () => { void releaseAudio(); });
  soundToggle.addEventListener("click", toggleSound);

  render(true);
  globalThis.requestAnimationFrame(frame);

  function createTonePlayer() {
    try {
      const player = audioFactory?.createTonePlayer?.();
      if (player && typeof player.ensureReady === "function" && typeof player.playTone === "function") {
        return player;
      }
    } catch {
      // Audio is an optional feedback layer; the visual game remains authoritative.
    }
    audioUnavailable = true;
    return silentPlayer;
  }

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "start":
        update({ type: "START" }, { focus: true, resetClock: true });
        void prepareAudio();
        break;
      case "pause":
        interrupt("manual");
        break;
      case "resume":
        clearLocalInputs();
        update({ type: "RESUME" }, { focus: true, resetClock: true });
        replaceTonePlayer();
        void prepareAudio();
        break;
      case "restart":
        clearLocalInputs();
        void releaseAudio();
        update({ type: "RESTART" }, { focus: true, resetClock: true });
        break;
      default:
        break;
    }
  }

  function handleKeyDown(event) {
    if (event.code === "Escape") {
      if (event.repeat || (view.phase !== "playing" && view.phase !== "measure-complete")) return;
      event.preventDefault();
      interrupt("manual");
      return;
    }
    if (hasModifier(event) || isEditable(event.target)) return;
    const action = logic.classifyHarmonyKey(event.code, "down", event.repeat);
    if (!action) return;
    if (view.canPress) event.preventDefault();
    pressedKeys.add(action.inputId);
    update(action);
  }

  function handleKeyUp(event) {
    const action = logic.classifyHarmonyKey(event.code, "up", false);
    if (!action) return;
    pressedKeys.delete(action.inputId);
    update(action);
  }

  function handlePointerDown(event) {
    const button = event.target.closest("button[data-note-id]");
    if (!button || !view.canPress || activePointers.has(event.pointerId)) return;
    event.preventDefault();
    const inputId = `pointer:${event.pointerId}`;
    activePointers.set(event.pointerId, { inputId, button });
    button.classList.add("is-pointer-down");
    try { button.setPointerCapture(event.pointerId); } catch { /* Capture is an enhancement. */ }
    update({
      type: "PRESS",
      voice: button.dataset.voice,
      noteId: button.dataset.noteId,
      inputId,
    });
  }

  function handlePointerRelease(event) {
    const active = activePointers.get(event.pointerId);
    if (!active) return;
    activePointers.delete(event.pointerId);
    active.button.classList.remove("is-pointer-down");
    update({ type: "RELEASE", inputId: active.inputId });
  }

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function isEditable(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function interrupt(reason) {
    if (view.phase !== "playing" && view.phase !== "measure-complete") return;
    clearLocalInputs();
    update({ type: "INTERRUPT", reason }, { focus: reason === "manual", resetClock: true });
    void releaseAudio();
  }

  function clearLocalInputs() {
    pressedKeys.clear();
    for (const active of activePointers.values()) active.button.classList.remove("is-pointer-down");
    activePointers.clear();
  }

  function frame(timestamp) {
    if (lastFrameTime === null) {
      lastFrameTime = timestamp;
      globalThis.requestAnimationFrame(frame);
      return;
    }
    const gap = Math.max(0, timestamp - lastFrameTime);
    lastFrameTime = timestamp;
    if (gap > logic.MAX_FRAME_GAP_MS && (view.phase === "playing" || view.phase === "measure-complete")) {
      interrupt("stalled");
      globalThis.requestAnimationFrame(frame);
      return;
    }
    if (view.phase === "playing") {
      accumulatorMs += gap;
      const ticks = Math.floor(accumulatorMs / logic.TICK_MS);
      if (ticks > 0) {
        accumulatorMs -= ticks * logic.TICK_MS;
        update({ type: "TICK", ticks });
      }
    } else {
      accumulatorMs = 0;
    }
    globalThis.requestAnimationFrame(frame);
  }

  function update(action, options = {}) {
    const previousState = state;
    const previousView = view;
    state = logic.reduceHarmony(state, action);
    if (state === previousState) return;
    view = logic.getHarmonyView(state);
    if (view.completed.length < previousView.completed.length) {
      playedCompletedCount = view.completed.length;
    }
    if (options.resetClock) {
      accumulatorMs = 0;
      lastFrameTime = null;
    }
    const completedGrew = view.completed.length > previousView.completed.length;
    render(Boolean(options.focus));
    if (completedGrew) playCompletedHarmony();
  }

  function render(forceFocus) {
    const nextStructure = structureFor(view.phase);
    const structureChanged = nextStructure !== structure;
    if (structureChanged) {
      structure = nextStructure;
      phaseHost.replaceChildren(buildStructure(nextStructure));
    }
    if (nextStructure === "intro") renderIntro();
    if (nextStructure === "performance") renderPerformance();
    if (nextStructure === "paused") renderPaused();
    if (nextStructure === "complete") renderComplete();
    renderSound();
    announce();
    if (structureChanged || forceFocus) scheduleFocus(nextStructure);
  }

  function structureFor(phase) {
    if (phase === "playing" || phase === "measure-complete") return "performance";
    return phase;
  }

  function buildStructure(kind) {
    if (kind === "intro") return buildIntro();
    if (kind === "performance") return buildPerformance();
    if (kind === "paused") return buildPaused();
    return buildComplete();
  }

  function buildIntro() {
    const wrapper = element("div", "intro-view");
    wrapper.append(buildScore(false));
    const panel = element("section", "intro-panel");
    const heading = element("h2", "", safeConfig.intro);
    const guide = element("p", "", "谱一直在这里，不用背。找到各自的键，一起按住。");
    const button = actionButton("开始合奏", "start", "primary-action");
    button.dataset.focus = "true";
    panel.append(heading, guide, button);
    wrapper.append(panel);
    return wrapper;
  }

  function buildPerformance() {
    const wrapper = element("section", "performance");
    wrapper.append(buildScore(true));
    const measureLabel = element("p", "measure-label");
    measureLabel.id = "measure-label";
    const grid = element("div", "performance-grid");
    grid.append(buildVoice("low"), buildChordMark(), buildVoice("high"));
    const pauseRow = element("div", "pause-row");
    const pause = actionButton("暂停合奏", "pause", "pause-action");
    pause.append(pauseIcon());
    pauseRow.append(pause);
    wrapper.append(measureLabel, grid, pauseRow);
    return wrapper;
  }

  function buildVoice(voice) {
    const fieldset = element("fieldset", `voice-rail voice-${voice}`);
    fieldset.dataset.voicePanel = voice;
    const legend = element("legend");
    legend.dataset.voiceLegend = voice;
    const keys = element("div", "keys");
    keys.dataset.keyGroup = voice;
    const notes = voice === "low" ? logic.LOW_NOTES : logic.HIGH_NOTES;
    for (const note of notes) {
      const button = element("button", "note-key");
      button.type = "button";
      button.dataset.voice = voice;
      button.dataset.noteId = note.id;
      button.append(
        element("kbd", "", note.key),
        element("span", "note-name", note.label),
        element("span", "key-state"),
      );
      keys.append(button);
    }
    fieldset.append(legend, keys);
    return fieldset;
  }

  function buildChordMark() {
    const section = element("section", "chord-mark");
    section.setAttribute("aria-labelledby", "chord-instruction");
    const pair = element("div", "target-pair");
    pair.append(
      targetNode("low"),
      element("span", "pair-plus", "+"),
      targetNode("high"),
    );
    const instruction = element("p", "instruction");
    instruction.id = "chord-instruction";
    const completeWord = element("div", "complete-word");
    const track = element("div", "hold-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-label", "当前小节和弦保持进度");
    track.append(element("span", "hold-part hold-low"), element("span", "hold-part hold-high"));
    const progress = element("p", "progress-copy");
    section.append(pair, instruction, completeWord, track, progress);
    return section;
  }

  function targetNode(voice) {
    const target = element("div", `target target-${voice}`);
    target.dataset.target = voice;
    target.append(element("span", "target-key"), element("span", "target-note"));
    return target;
  }

  function buildPaused() {
    const panel = element("section", "paused-panel");
    const heading = element("h2", "", "琴键已经松开");
    heading.tabIndex = -1;
    panel.append(
      heading,
      element("p", "", "回来后从这一小节继续。"),
      actionButton("继续合奏", "resume", "primary-action"),
    );
    return panel;
  }

  function buildComplete() {
    const wrapper = element("section", "complete-view");
    const seals = element("ol", "complete-seals");
    seals.setAttribute("aria-label", "五节和弦全部完成");
    for (let index = 0; index < logic.PHRASE.length; index += 1) {
      const measure = logic.PHRASE[index];
      const seal = element("li", "complete-seal");
      seal.append(element("strong", "", String(index + 1)), element("span", "", measure.title), checkWithText());
      seals.append(seal);
    }
    const letter = element("section", "letter");
    const title = element("h2", "complete-title");
    title.tabIndex = -1;
    title.dataset.completeTitle = "true";
    const message = element("p", "letter-message");
    const signature = element("p", "signature");
    letter.append(title, element("p", "", "五次相遇，成了我们的小曲"), message, signature);
    const actions = element("div", "complete-actions");
    actions.append(
      actionButton("再合一次", "restart", "primary-action"),
      linkButton("返回作品库", "../../../index.html"),
    );
    wrapper.append(seals, letter, actions);
    return wrapper;
  }

  function buildScore(showCurrent) {
    const section = element("section", "score-strip");
    section.setAttribute("aria-label", "五节公开谱带");
    const list = element("ol", "score-list");
    for (let index = 0; index < logic.PHRASE.length; index += 1) {
      const measure = logic.PHRASE[index];
      const item = element("li", "score-step");
      item.dataset.measureIndex = String(index);
      item.dataset.showCurrent = String(showCurrent);
      item.append(
        element("span", "score-number", String(index + 1)),
        element("span", "score-title", measure.title),
        element("span", "score-state"),
      );
      list.append(item);
    }
    section.append(list);
    return section;
  }

  function renderIntro() {
    renderScore(false);
    const heading = phaseHost.querySelector(".intro-panel h2");
    heading.textContent = safeConfig.intro;
  }

  function renderPerformance() {
    renderScore(true);
    phaseHost.querySelector("#measure-label").textContent = `第 ${view.measureNumber} / ${view.measureCount} 节 · ${view.measureTitle}`;
    renderVoice("low", view.lowSeat);
    renderVoice("high", view.highSeat);
    const lowTarget = phaseHost.querySelector('[data-target="low"]');
    const highTarget = phaseHost.querySelector('[data-target="high"]');
    setTarget(lowTarget, view.lowSeat.target);
    setTarget(highTarget, view.highSeat.target);
    const instruction = phaseHost.querySelector(".instruction");
    instruction.textContent = instructionForView();
    phaseHost.querySelector(".complete-word").textContent = view.phase === "measure-complete" ? "完成" : "";
    const track = phaseHost.querySelector(".hold-track");
    const hold = Math.max(0, Math.min(1, Number(view.holdProgress) || 0));
    const lowHeld = Boolean(view.lowSeat.held);
    const highHeld = Boolean(view.highSeat.held);
    const lowProgress = lowHeld ? Math.max(.1, hold) : 0;
    const highProgress = highHeld ? Math.max(.1, hold) : 0;
    track.style.setProperty("--low-progress", String(lowProgress));
    track.style.setProperty("--high-progress", String(highProgress));
    track.setAttribute("aria-valuenow", String(Math.round(hold * 100)));
    track.setAttribute("aria-valuetext", progressText(hold));
    phaseHost.querySelector(".progress-copy").textContent = progressText(hold);
    phaseHost.querySelector('[data-action="pause"]').disabled = !view.canPause;
  }

  function renderVoice(voice, seat) {
    const fieldset = phaseHost.querySelector(`[data-voice-panel="${voice}"]`);
    fieldset.querySelector("legend").textContent = `${seat.name} · ${voice === "low" ? "低音席" : "高音席"}`;
    const buttons = fieldset.querySelectorAll("button[data-note-id]");
    for (const button of buttons) {
      const note = seat.notes.find((candidate) => candidate.id === button.dataset.noteId);
      const isHeld = Boolean(note?.isHeld);
      const isTarget = Boolean(note?.isTarget);
      button.classList.toggle("is-target", isTarget);
      button.classList.toggle("is-held", isHeld);
      button.classList.toggle("is-complete", view.phase === "measure-complete" && isTarget);
      button.disabled = !view.canPress;
      button.setAttribute("aria-pressed", String(isHeld));
      button.setAttribute("aria-label", `${seat.name}，${voice === "low" ? "低音席" : "高音席"} ${note.key}，${note.label}${isTarget ? "，目标键" : ""}${isHeld ? "，按住" : ""}`);
      button.querySelector(".key-state").textContent = isHeld ? "按住" : isTarget ? "目标键" : "";
    }
  }

  function setTarget(node, target) {
    node.querySelector(".target-key").textContent = target.key;
    node.querySelector(".target-note").textContent = target.label;
  }

  function renderScore(showCurrent) {
    const items = phaseHost.querySelectorAll(".score-step");
    for (const item of items) {
      const index = Number(item.dataset.measureIndex);
      const completed = index < view.completed.length;
      const current = showCurrent && !completed && index === view.measureNumber - 1;
      item.classList.toggle("is-complete", completed);
      if (current) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      const stateNode = item.querySelector(".score-state");
      stateNode.replaceChildren();
      if (completed) stateNode.append(checkIcon(), document.createTextNode("完成"));
      else if (current) stateNode.textContent = "当前";
      item.setAttribute("aria-label", `${index + 1}，${logic.PHRASE[index].title}，${completed ? "完成" : current ? "当前" : "等待"}`);
    }
  }

  function renderPaused() {
    // Copy is fixed in the accepted design; the reducer still preserves the pause reason.
  }

  function renderComplete() {
    const title = phaseHost.querySelector("[data-complete-title]");
    const message = phaseHost.querySelector(".letter-message");
    const signature = phaseHost.querySelector(".signature");
    title.textContent = view.finalTitle;
    message.textContent = composeMessage();
    signature.textContent = view.signature;
  }

  function instructionForView() {
    if (view.phase === "measure-complete") return "和弦收好了，双方松开";
    if (view.feedback === "outside-window" || view.feedback === "released-early") {
      return "差一点没关系，双方松开再来";
    }
    if (view.feedback === "wrong-low" || view.feedback === "wrong-high") {
      return "这个音在旁边，看看目标键";
    }
    if (view.holdProgress > 0 || view.feedback === "joined") return "保持中";
    if (view.lowSeat.held || view.highSeat.held) return "等待另一边";
    return "一起按住，让这一小节合上";
  }

  function progressText(hold) {
    if (view.phase === "measure-complete") return "完成";
    if (hold > 0) return "保持中";
    if (view.lowSeat.held || view.highSeat.held) return "等待另一边";
    return "一起按住，让这一小节合上";
  }

  function composeMessage() {
    let result = view.finalMessage;
    try {
      if (typeof config.composeHarmonyMessage === "function") result = config.composeHarmonyMessage(view);
    } catch {
      result = view.finalMessage;
    }
    if (typeof result !== "string" || !result.trim()) result = view.finalMessage;
    return [...result.trim()].slice(0, 160).join("");
  }

  function announce() {
    const key = `${view.phase}|${view.feedback || ""}|${view.completed.length}`;
    if (key === announcedKey) return;
    announcedKey = key;
    if (view.phase === "paused") liveStatus.textContent = "琴键已经松开。回来后从这一小节继续。";
    else if (view.phase === "complete") liveStatus.textContent = "五次相遇，成了我们的小曲";
    else if (view.phase === "measure-complete") liveStatus.textContent = "和弦收好了，双方松开";
    else if (view.feedback === "outside-window" || view.feedback === "released-early") liveStatus.textContent = "差一点没关系，双方松开再来";
    else if (view.feedback === "wrong-low" || view.feedback === "wrong-high") liveStatus.textContent = "这个音在旁边，看看目标键";
    else if (view.feedback === "joined") liveStatus.textContent = "保持中";
    else if (view.phase === "playing") liveStatus.textContent = `第 ${view.measureNumber} / ${view.measureCount} 节 · ${view.measureTitle}`;
  }

  function scheduleFocus(kind) {
    globalThis.requestAnimationFrame(() => {
      let target = null;
      if (kind === "intro") target = phaseHost.querySelector('[data-action="start"]');
      if (kind === "performance") target = phaseHost.querySelector('.voice-low .note-key.is-target');
      if (kind === "paused") target = phaseHost.querySelector('[data-action="resume"]');
      if (kind === "complete") target = phaseHost.querySelector("[data-complete-title]");
      target?.focus({ preventScroll: true });
    });
  }

  async function toggleSound() {
    if (soundEnabled) {
      soundEnabled = false;
      audioReady = false;
      audioUnavailable = false;
      await releaseAudio();
      renderSound();
      return;
    }
    soundEnabled = true;
    replaceTonePlayer();
    await prepareAudio();
  }

  async function prepareAudio() {
    if (!soundEnabled) return false;
    const player = tonePlayer;
    const generation = audioGeneration;
    audioPreparing = true;
    let ready = false;
    try {
      ready = Boolean(await player.ensureReady());
    } catch {
      ready = false;
    }
    if (generation !== audioGeneration || player !== tonePlayer || !soundEnabled) return false;
    audioPreparing = false;
    audioReady = ready;
    audioUnavailable = !ready;
    if (ready) playCompletedHarmony();
    else playedCompletedCount = view.completed.length;
    renderSound();
    return audioReady;
  }

  function playCompletedHarmony() {
    if (view.completed.length <= playedCompletedCount) return;
    if (!soundEnabled) {
      playedCompletedCount = view.completed.length;
      return;
    }
    if (audioPreparing) return;
    if (!audioReady) {
      playedCompletedCount = view.completed.length;
      return;
    }
    while (playedCompletedCount < view.completed.length) {
      const index = playedCompletedCount;
      playedCompletedCount += 1;
      if (!playHarmonyAt(index)) {
        playedCompletedCount = view.completed.length;
        audioReady = false;
        audioUnavailable = true;
        renderSound();
        return;
      }
    }
  }

  function playHarmonyAt(index) {
    const measure = logic.PHRASE[index];
    const low = lowNotes.get(measure.low);
    const high = highNotes.get(measure.high);
    try {
      const lowPlayed = tonePlayer.playTone({ frequency: low.frequency, type: "triangle", duration: .42, attack: .018, gain: .12 });
      const highPlayed = tonePlayer.playTone({ frequency: high.frequency, type: "sine", duration: .42, attack: .018, gain: .1 });
      return Boolean(lowPlayed && highPlayed);
    } catch {
      return false;
    }
  }

  function replaceTonePlayer() {
    audioGeneration += 1;
    audioPreparing = false;
    audioReady = false;
    audioUnavailable = false;
    tonePlayer = createTonePlayer();
  }

  async function releaseAudio() {
    const player = tonePlayer;
    audioGeneration += 1;
    audioPreparing = false;
    audioReady = false;
    playedCompletedCount = view.completed.length;
    try { await player.close?.(); } catch { /* Closing is best effort. */ }
  }

  function renderSound() {
    const unavailable = soundEnabled && audioUnavailable;
    soundToggle.setAttribute("aria-checked", String(soundEnabled && !unavailable));
    soundToggle.classList.toggle("is-unavailable", unavailable);
    soundLabel.textContent = !soundEnabled
      ? "声音：关"
      : unavailable
        ? "声音未开启，视觉模式仍可完成"
        : "声音：开";
  }

  function actionButton(text, action, className) {
    const button = element("button", className, text);
    button.type = "button";
    button.dataset.action = action;
    return button;
  }

  function linkButton(text, href) {
    const link = element("a", "secondary-action", text);
    link.href = href;
    return link;
  }

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function pauseIcon() {
    const svg = svgElement("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": "true" });
    svg.append(
      svgElement("path", { d: "M8 6v12M16 6v12", fill: "none", stroke: "currentColor", "stroke-width": "3", "stroke-linecap": "round" }),
    );
    return svg;
  }

  function checkIcon() {
    const svg = svgElement("svg", { viewBox: "0 0 16 16", class: "score-check", "aria-hidden": "true" });
    svg.append(svgElement("path", { d: "m3 8 3 3 7-7", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }));
    return svg;
  }

  function checkWithText() {
    const node = element("span", "seal-state");
    node.append(checkIcon(), document.createTextNode("完成"));
    return node;
  }

  function svgElement(tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
  }
})();
