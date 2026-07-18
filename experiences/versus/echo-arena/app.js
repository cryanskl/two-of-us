(function () {
  "use strict";

  const logic = globalThis.ECHO_ARENA_LOGIC;
  const config = globalThis.ECHO_ARENA_CONFIG || {};
  const tonePlayer = globalThis.TWO_OF_US_TONE_PLAYER?.createTonePlayer();
  if (!logic) {
    document.body.textContent = "回声擂台加载失败，请确认 config.js、logic.js 与共享音频脚本路径。";
    return;
  }

  const app = document.querySelector(".app");
  const stage = document.querySelector("#stage");
  const gameStatus = document.querySelector("#game-status");
  const turnStatus = document.querySelector("#turn-status");
  const sequenceCount = document.querySelector("#sequence-count");
  const sequenceTrack = document.querySelector("#sequence-track");
  const audioStatus = document.querySelector("#audio-status");
  const soundToggle = document.querySelector("#sound-toggle");
  const noteKeys = [...document.querySelectorAll("[data-note]")];
  const playerCards = {
    a: document.querySelector("#player-a"),
    b: document.querySelector("#player-b"),
  };
  const nameNodes = {
    a: document.querySelector("#name-a"),
    b: document.querySelector("#name-b"),
  };
  const scoreNodes = {
    a: document.querySelector("#score-a"),
    b: document.querySelector("#score-b"),
  };
  const noteById = new Map(logic.NOTES.map((note) => [note.id, note]));
  const noteByKey = new Map(logic.NOTES.map((note) => [note.key, note.id]));

  let state = logic.createInitialState(config);
  let soundEnabled = true;
  let audioReady = false;
  let playbackInterrupted = false;
  let playbackTimers = new Set();
  let activeNote = null;
  let activePosition = -1;
  let focusRevision = 0;

  stage.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") {
      state = logic.startMatch(state, chooseOpeningNote(state.gameNumber, state.starter));
      render(true);
      return;
    }
    if (action === "listen" || action === "resume") {
      if (soundEnabled) await ensureAudio();
      if (action === "listen") state = logic.beginPlayback(state);
      playbackInterrupted = false;
      render();
      beginPlayback();
      return;
    }
    if (action === "next") {
      cancelPlayback();
      const nextGame = state.gameNumber + 1;
      const nextStarter = logic.otherPlayer(state.starter);
      state = logic.startNextGame(state, chooseOpeningNote(nextGame, nextStarter));
      render(true);
      return;
    }
    if (action === "restart") {
      cancelPlayback();
      state = logic.restartMatch(state);
      playbackInterrupted = false;
      render(true);
    }
  });

  noteKeys.forEach((button) => {
    button.addEventListener("click", () => void enterNote(button.dataset.note));
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const noteId = noteByKey.get(event.key);
    if (!noteId || (state.phase !== "repeat" && state.phase !== "append")) return;
    event.preventDefault();
    void enterNote(noteId);
  });

  soundToggle.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) await ensureAudio();
    renderSound();
  });

  window.addEventListener("blur", interruptPlayback);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interruptPlayback();
  });
  window.addEventListener("beforeunload", releaseResources);

  render(true);

  async function enterNote(noteId) {
    if (state.phase !== "repeat" && state.phase !== "append") return;
    if (soundEnabled) await ensureAudio();
    const previous = state;
    state = logic.pressNote(state, noteId);
    if (state === previous) return;
    playNote(noteId, .22);
    flashNote(noteId);
    render(true);
  }

  function beginPlayback() {
    if (state.phase !== "playback") return;
    cancelPlayback(false);
    playbackInterrupted = false;
    const token = state.playbackToken;
    const startDelay = 280;
    const step = 570;
    const pulse = 360;
    state.sequence.forEach((noteId, index) => {
      schedule(() => {
        if (!isCurrentPlayback(token)) return;
        activeNote = noteId;
        activePosition = index;
        playNote(noteId, .3);
        renderPlaybackVisuals();
      }, startDelay + index * step);
      schedule(() => {
        if (!isCurrentPlayback(token) || activePosition !== index) return;
        activeNote = null;
        activePosition = -1;
        renderPlaybackVisuals();
      }, startDelay + index * step + pulse);
    });
    schedule(() => {
      if (!isCurrentPlayback(token)) return;
      activeNote = null;
      activePosition = -1;
      state = logic.finishPlayback(state, token);
      render(true);
    }, startDelay + state.sequence.length * step + 80);
  }

  function isCurrentPlayback(token) {
    return state.phase === "playback" && state.playbackToken === token && !playbackInterrupted;
  }

  function schedule(callback, delay) {
    const timer = globalThis.setTimeout(() => {
      playbackTimers.delete(timer);
      callback();
    }, delay);
    playbackTimers.add(timer);
  }

  function cancelPlayback(clearInterrupted = true) {
    for (const timer of playbackTimers) globalThis.clearTimeout(timer);
    playbackTimers.clear();
    activeNote = null;
    activePosition = -1;
    if (clearInterrupted) playbackInterrupted = false;
    renderPlaybackVisuals();
  }

  function interruptPlayback() {
    if (state.phase !== "playback" || playbackInterrupted) return;
    playbackInterrupted = true;
    cancelPlayback(false);
    render(true);
  }

  async function ensureAudio() {
    if (!soundEnabled || !tonePlayer) return false;
    audioReady = await tonePlayer.ensureReady();
    renderSound();
    return audioReady;
  }

  function playNote(noteId, duration) {
    if (!soundEnabled || !audioReady) return;
    const note = noteById.get(noteId);
    tonePlayer?.playTone({
      frequency: note.frequency,
      type: note.type,
      duration,
      attack: .018,
      gain: .14,
    });
  }

  function flashNote(noteId) {
    activeNote = noteId;
    renderPlaybackVisuals();
    globalThis.setTimeout(() => {
      if (activeNote === noteId && state.phase !== "playback") {
        activeNote = null;
        renderPlaybackVisuals();
      }
    }, 150);
  }

  function chooseOpeningNote(gameNumber, starter) {
    const context = deepFreeze({
      gameNumber,
      starter,
      noteIds: [...logic.NOTE_IDS],
    });
    try {
      const chosen = typeof config.chooseOpeningNote === "function"
        ? config.chooseOpeningNote(context)
        : null;
      if (logic.NOTE_IDS.includes(chosen)) return chosen;
    } catch {
      // Invalid personal strategies safely fall back to a local opening note.
    }
    return randomOpeningNote(gameNumber, starter);
  }

  function randomOpeningNote(gameNumber, starter) {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / logic.NOTE_IDS.length) * logic.NOTE_IDS.length;
      for (let attempt = 0; attempt < 64; attempt += 1) {
        globalThis.crypto.getRandomValues(values);
        if (values[0] < limit) return logic.NOTE_IDS[values[0] % logic.NOTE_IDS.length];
      }
    }
    const offset = starter === "b" ? 1 : 0;
    return logic.NOTE_IDS[(gameNumber - 1 + offset) % logic.NOTE_IDS.length];
  }

  function render(focusPrimary = false) {
    app.dataset.phase = state.phase;
    app.dataset.player = state.currentPlayer;
    gameStatus.textContent = state.phase === "intro" ? "准备开局" : `第 ${state.gameNumber} 局 · 第 ${state.turnNumber} 轮`;
    turnStatus.textContent = state.phase === "intro"
      ? "三局两胜"
      : `${state.players[state.currentPlayer]} ${phaseLabel(state.phase)}`;
    sequenceCount.textContent = `${String(state.sequence.length).padStart(2, "0")} / ${logic.MAX_SEQUENCE_LENGTH}`;
    for (const player of logic.PLAYER_IDS) {
      nameNodes[player].textContent = state.players[player];
      scoreNodes[player].textContent = String(state.scores[player]);
      playerCards[player].classList.toggle("is-current", state.phase !== "intro" && state.currentPlayer === player);
      playerCards[player].classList.toggle("is-winner", state.winner === player);
    }
    renderTrack();
    renderStage();
    renderKeys();
    renderSound();
    if (focusPrimary) scheduleFocus();
  }

  function renderTrack() {
    sequenceTrack.replaceChildren();
    for (let index = 0; index < logic.MAX_SEQUENCE_LENGTH; index += 1) {
      const item = document.createElement("li");
      item.textContent = String(index + 1).padStart(2, "0");
      item.classList.toggle("is-filled", index < state.sequence.length);
      item.classList.toggle("is-active", state.phase === "playback" && index === activePosition);
      sequenceTrack.append(item);
    }
    sequenceTrack.setAttribute("aria-label", `当前共有 ${state.sequence.length} 个音，最多 ${logic.MAX_SEQUENCE_LENGTH} 个`);
  }

  function renderStage() {
    stage.replaceChildren();
    if (state.phase === "intro") {
      stage.append(
        label("三局两胜 · 每局轮换先手"),
        heading("把一音，接成两个人都忘不掉的旋律。"),
        paragraph("听完、完整复现、再添一音；第一位按错的人输掉本局。"),
        action("拉下开局推杆", "start"),
      );
      return;
    }
    if (state.phase === "handoff") {
      stage.append(
        label(`第 ${state.gameNumber} 局 · ${state.sequence.length} 音`),
        heading(`把设备交给 ${state.players[state.currentPlayer]}`),
        paragraph("另一位先移开视线。交接页不会显示音符答案。"),
        action(`${state.players[state.currentPlayer]} 开始听`, "listen"),
      );
      return;
    }
    if (state.phase === "playback") {
      stage.append(
        label(`正在播放 ${Math.max(0, activePosition + 1)} / ${state.sequence.length}`),
        heading(playbackInterrupted ? "回放被暂停" : "只听、只看，先不要按。"),
        paragraph(playbackInterrupted ? "页面刚才离开了前台，重新从第一音播放。" : "四枚音键会按顺序亮起；声音关闭时仍可看颜色和编号。"),
      );
      if (playbackInterrupted) stage.append(action("重新播放", "resume"));
      return;
    }
    if (state.phase === "repeat") {
      stage.append(
        label(`复现 ${state.inputIndex} / ${state.sequence.length}`),
        heading(`${state.players[state.currentPlayer]}，从第一音开始`),
        paragraph("按 1 / 2 / 3 / 4 或点击下方四键。按错立即结算本局。"),
      );
      return;
    }
    if (state.phase === "append") {
      stage.append(
        label("完整接住"),
        heading(`${state.players[state.currentPlayer]}，现在添一音`),
        paragraph("任选一个音留给对方；添加后设备会回到安全交接页。"),
      );
      return;
    }
    if (state.phase === "round-over") {
      const capped = state.endReason === "cap";
      stage.append(
        label(capped ? "共同封顶 · 本局不计分" : `${state.players[state.winner]} 得 1 分`),
        heading(capped ? "十六音，今晚共同守住了。" : `${state.players[state.loser]} 在第 ${state.inputIndex + 1} 音失手`),
        paragraph(capped ? "序列达到控制台上限，轮换先手开启下一局。" : mistakeCopy()),
        action("下一局", "next"),
        action("整场重开", "restart", "secondary"),
      );
      return;
    }
    stage.append(
      label(`最终比分 ${state.scores.a} : ${state.scores.b}`),
      heading(`${state.players[state.winner]} 拿下回声擂台`),
      paragraph(`${state.players[state.loser]} 留下的旋律没有消失，只是这场先到这里。`),
      action("再来一场", "restart"),
    );
  }

  function renderKeys() {
    const enabled = state.phase === "repeat" || state.phase === "append";
    noteKeys.forEach((button) => {
      button.disabled = !enabled;
      const note = noteById.get(button.dataset.note);
      button.setAttribute("aria-label", `${note.key} · ${note.label} 音`);
      button.classList.toggle("is-active", activeNote === note.id);
    });
  }

  function renderPlaybackVisuals() {
    renderTrack();
    renderKeys();
    if (state.phase === "playback") {
      const progress = stage.querySelector(".stage-label");
      if (progress) progress.textContent = `正在播放 ${Math.max(0, activePosition + 1)} / ${state.sequence.length}`;
    }
  }

  function renderSound() {
    soundToggle.setAttribute("aria-checked", String(soundEnabled));
    soundToggle.lastChild.textContent = soundEnabled ? " 声音开" : " 声音关";
    audioStatus.textContent = !soundEnabled
      ? "静音视觉模式 · 规则不变"
      : audioReady
        ? "四音合成器已就绪"
        : "浏览器即时合成四个短音";
  }

  function mistakeCopy() {
    const actual = noteById.get(state.lastInput.noteId)?.label || state.lastInput.noteId;
    const expected = noteById.get(state.lastInput.expected)?.label || state.lastInput.expected;
    return `按下 ${actual}，这一位应是 ${expected}。答案只在本局结算后出现。`;
  }

  function phaseLabel(phase) {
    return ({
      handoff: "等待交接",
      playback: "正在听",
      repeat: "正在复现",
      append: "正在添音",
      "round-over": "本局结束",
      "match-over": "比赛结束",
    })[phase] || "准备中";
  }

  function label(text) {
    const node = document.createElement("span");
    node.className = "stage-label";
    node.textContent = text;
    return node;
  }

  function heading(text) {
    const node = document.createElement("h2");
    node.textContent = text;
    return node;
  }

  function paragraph(text) {
    const node = document.createElement("p");
    node.textContent = text;
    return node;
  }

  function action(text, actionId, variant = "primary") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stage-action stage-action-${variant}`;
    button.dataset.action = actionId;
    button.dataset.focus = "true";
    button.textContent = text;
    return button;
  }

  function scheduleFocus() {
    const revision = ++focusRevision;
    globalThis.requestAnimationFrame(() => {
      if (revision !== focusRevision) return;
      const target = stage.querySelector("[data-focus]")
        || (state.phase === "repeat" || state.phase === "append" ? noteKeys[0] : null);
      target?.focus({ preventScroll: true });
    });
  }

  function releaseResources() {
    cancelPlayback();
    void tonePlayer?.close();
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const nested of Object.values(value)) deepFreeze(nested);
    return Object.freeze(value);
  }
})();
