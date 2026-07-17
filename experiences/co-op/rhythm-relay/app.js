(function () {
  "use strict";

  const logic = globalThis.RHYTHM_RELAY_LOGIC;
  if (!logic) {
    document.body.textContent = "节拍接力加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const machine = document.querySelector(".machine");
  const stage = document.querySelector("#stage");
  const status = document.querySelector("#relay-status");
  const heroCopy = document.querySelector("#hero-copy");
  const tape = document.querySelector("#tape");
  const counter = document.querySelector("#counter");
  const progressCopy = document.querySelector("#progress-copy");
  const nextCopy = document.querySelector("#next-copy");
  const echoes = document.querySelector("#echoes");
  const soundToggle = document.querySelector("#sound-toggle");
  const beatButtons = [...document.querySelectorAll("[data-beat]")];

  let state = logic.createRelayState();
  let soundEnabled = true;
  let audioContext = null;
  let playbackTimers = new Set();
  let playbackInterrupted = false;
  let activeBeat = null;
  let activeIndex = -1;
  let startError = "";

  render();

  stage.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") {
      startError = "";
      try {
        state = logic.startRelay(state, generateInitialSequence());
      } catch (error) {
        startError = error instanceof Error ? error.message : "无法生成本局节拍。";
      }
      render();
      return;
    }
    if (action === "ready") {
      await ensureAudio();
      state = logic.markReady(state);
      render();
      beginPlayback();
      return;
    }
    if (action === "replay") {
      await ensureAudio();
      beginPlayback();
      return;
    }
    if (action === "retry") {
      await ensureAudio();
      state = logic.retrySequence(state);
      render();
      beginPlayback();
      return;
    }
    if (action === "restart") {
      cancelPlayback(false);
      state = logic.restartRelay();
      startError = "";
      render();
    }
  });

  beatButtons.forEach((button) => {
    button.addEventListener("click", () => enterBeat(button.dataset.beat));
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const beat = event.key.toLowerCase() === "f" ? "coral" : event.key.toLowerCase() === "j" ? "sage" : null;
    if (!beat || (state.phase !== "repeat" && state.phase !== "append")) return;
    event.preventDefault();
    enterBeat(beat);
  });

  soundToggle.addEventListener("click", async () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? "声音开" : "声音关";
    soundToggle.setAttribute("aria-pressed", String(!soundEnabled));
    if (soundEnabled) await ensureAudio();
  });

  window.addEventListener("blur", interruptPlayback);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interruptPlayback();
  });
  window.addEventListener("beforeunload", releaseAudio);

  function enterBeat(beat) {
    if (state.phase !== "repeat" && state.phase !== "append") return;
    void ensureAudio();
    playTone(beat, .2);
    state = state.phase === "repeat" ? logic.tapBeat(state, beat) : logic.appendBeat(state, beat);
    flashBeat(beat);
    render();
  }

  function beginPlayback() {
    if (state.phase !== "playback") return;
    cancelPlayback(false);
    playbackInterrupted = false;
    machine.classList.add("is-playing");
    render();
    const startDelay = 300;
    const step = 540;
    const pulse = 360;
    state.sequence.forEach((beat, index) => {
      schedule(() => {
        activeBeat = beat;
        activeIndex = index;
        playTone(beat, .28);
        renderVisuals();
      }, startDelay + index * step);
      schedule(() => {
        if (activeIndex === index) {
          activeBeat = null;
          activeIndex = -1;
          renderVisuals();
        }
      }, startDelay + index * step + pulse);
    });
    schedule(() => {
      playbackTimers.clear();
      machine.classList.remove("is-playing");
      activeBeat = null;
      activeIndex = -1;
      state = logic.finishPlayback(state);
      render();
    }, startDelay + state.sequence.length * step + 180);
  }

  function interruptPlayback() {
    if (state.phase !== "playback" || playbackTimers.size === 0) return;
    cancelPlayback(true);
    render();
  }

  function cancelPlayback(interrupted) {
    for (const timer of playbackTimers) window.clearTimeout(timer);
    playbackTimers = new Set();
    playbackInterrupted = interrupted;
    activeBeat = null;
    activeIndex = -1;
    machine.classList.remove("is-playing");
  }

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      playbackTimers.delete(timer);
      callback();
    }, delay);
    playbackTimers.add(timer);
  }

  function render() {
    const player = state.playerIndex === 0 ? "甲" : "乙";
    status.textContent = state.phase === "intro"
      ? "双人接力 · 3 → 10"
      : `${player}棒 · ${state.sequence.length} / ${logic.TARGET_LENGTH}`;
    heroCopy.textContent = state.phase === "complete" ? "这十拍，是你们一起留下的" : "把这一段记住，再交给对方";
    counter.textContent = `${String(Math.max(logic.INITIAL_LENGTH, state.sequence.length)).padStart(3, "0")} / ${String(logic.TARGET_LENGTH).padStart(3, "0")}`;
    nextCopy.textContent = state.phase === "complete" ? "共同完成" : "下一棒由对方接力";
    renderVisuals();
    renderStage(player);
    const focusTarget = stage.querySelector("[data-focus]");
    if (focusTarget) window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }

  function renderVisuals() {
    const visibleProgress = state.phase === "repeat" ? state.inputIndex : 0;
    progressCopy.textContent = state.phase === "repeat"
      ? `已复现 ${visibleProgress} / ${state.sequence.length} 拍`
      : state.phase === "append" ? "整段接住了" : state.phase === "complete" ? "十拍完整保留" : "序列进度";
    tape.replaceChildren(...Array.from({ length: logic.TARGET_LENGTH }, (_, index) => {
      const hole = document.createElement("li");
      if (index >= state.sequence.length) hole.className = "pending";
      else if (state.phase === "complete") hole.className = state.sequence[index];
      else if (index < visibleProgress) hole.className = "reached";
      else if (state.phase === "playback" && index === activeIndex) hole.className = `${activeBeat} active`;
      else hole.className = "";
      hole.setAttribute("aria-hidden", "true");
      return hole;
    }));
    tape.setAttribute("aria-label", `${Math.max(logic.INITIAL_LENGTH, state.sequence.length)} 拍序列，目标 ${logic.TARGET_LENGTH} 拍`);
    echoes.replaceChildren(...Array.from({ length: logic.STARTING_ECHOES }, (_, index) => {
      const echo = document.createElement("i");
      if (index >= state.echoes) echo.className = "spent";
      echo.setAttribute("aria-hidden", "true");
      return echo;
    }));
    echoes.setAttribute("aria-label", `剩余 ${state.echoes} 次回声`);
    const canBeat = state.phase === "repeat" || state.phase === "append";
    beatButtons.forEach((button) => {
      button.disabled = !canBeat;
      button.classList.toggle("is-active", button.dataset.beat === activeBeat);
    });
  }

  function renderStage(player) {
    if (state.phase === "intro") {
      stage.innerHTML = `<h2>两个人，把三拍接成十拍</h2><p>先听、再复现，最后留一拍给下一棒。共有三次重听机会。</p>${startError ? `<p class="error">${startError}</p>` : ""}<button class="stage-action" data-action="start" data-focus type="button">开始接力</button>`;
      return;
    }
    if (state.phase === "handoff") {
      stage.innerHTML = `<h2>把设备交给${player}，另一位先移开视线</h2><p>准备好后会播放 ${state.sequence.length} 拍；交接页不会显示答案。</p><button class="stage-action" data-action="ready" data-focus type="button">${player}准备好了</button>`;
      return;
    }
    if (state.phase === "playback") {
      stage.innerHTML = playbackInterrupted
        ? `<h2>播放已经暂停</h2><p>页面离开过焦点，本局没有偷偷推进。</p><button class="stage-action" data-action="replay" data-focus type="button">从头再听一次</button>`
        : `<h2>先听这一段</h2><p>看纸带亮起，也可以听两种音色。播放结束后再复现。</p>`;
      return;
    }
    if (state.phase === "repeat") {
      stage.innerHTML = `<h2>${player}来复现</h2><p>按 F / J 或点击两枚拍键：${state.inputIndex} / ${state.sequence.length}</p>`;
      return;
    }
    if (state.phase === "append") {
      stage.innerHTML = `<h2>整段接住了</h2><p>${player}再选择一拍，亲手交给下一棒。</p>`;
      return;
    }
    if (state.phase === "miss") {
      stage.innerHTML = `<h2>有一拍散进回声里</h2><p>不换棒、不加拍；同一段从头再听。</p><button class="stage-action" data-action="retry" data-focus type="button">再听一次</button>`;
      return;
    }
    if (state.phase === "failed") {
      stage.innerHTML = `<h2>三次回声用完了</h2><p>这不是默契测试，只是这盘磁带暂时绕住了。换一段重新接。</p><button class="stage-action" data-action="restart" data-focus type="button">换一段重来</button>`;
      return;
    }
    const sequence = state.sequence.map((beat) => `<i class="${beat}" aria-label="${beat === "coral" ? "珊瑚拍" : "青绿拍"}"></i>`).join("");
    stage.innerHTML = `<h2>十拍完整相遇</h2><p>甲和乙轮流留下了这一段。</p><div class="final-sequence" aria-label="共同完成的十拍">${sequence}</div><button class="stage-action" data-action="restart" data-focus type="button">再接一盘</button>`;
  }

  function generateInitialSequence() {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
      throw new Error("当前浏览器没有安全随机源，无法开始新一局。");
    }
    const values = new Uint32Array(logic.INITIAL_LENGTH);
    globalThis.crypto.getRandomValues(values);
    return [...values].map((value) => logic.BEATS[value % logic.BEATS.length]);
  }

  async function ensureAudio() {
    if (!soundEnabled) return;
    const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      audioContext ||= new AudioContextCtor();
      if (audioContext.state === "suspended") await audioContext.resume();
    } catch {
      audioContext = null;
    }
  }

  function playTone(beat, duration) {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = beat === "coral" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(beat === "coral" ? 246.94 : 392, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.16, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  function flashBeat(beat) {
    activeBeat = beat;
    renderVisuals();
    window.setTimeout(() => {
      if (activeBeat === beat && state.phase !== "playback") {
        activeBeat = null;
        renderVisuals();
      }
    }, 150);
  }

  function releaseAudio() {
    cancelPlayback(false);
    if (audioContext) void audioContext.close();
    audioContext = null;
  }
})();
