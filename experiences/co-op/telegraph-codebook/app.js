(function () {
  "use strict";

  const logic = globalThis.TELEGRAPH_CODEBOOK_LOGIC;
  if (!logic) {
    document.body.textContent = "默契电报码加载失败，请确认 logic.js 与页面放在同一目录。";
    return;
  }

  const codebook = document.querySelector("#codebook");
  const station = document.querySelector(".station");
  const roundStatus = document.querySelector("#round-status");
  const score = document.querySelector("#score");
  const targetLabel = document.querySelector("#target-label");
  const targetValue = document.querySelector("#target-value");
  const pulseStrip = document.querySelector("#pulse-strip");
  const stage = document.querySelector("#stage");
  const dialNeedle = document.querySelector("#dial-needle");
  const pulseButtons = [...document.querySelectorAll("[data-pulse]")];

  let state = logic.createInitialState(createRounds());
  let audioContext = null;
  let soundEnabled = true;
  let playbackTimers = new Set();
  let activePulse = null;
  let activePulseIndex = -1;
  let playbackInterrupted = false;

  render();

  stage.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start") state = logic.startGame(state);
    if (action === "ready-sender") state = logic.readySender(state);
    if (action === "undo") state = logic.undoPulse(state);
    if (action === "seal") state = logic.sealTelegram(state);
    if (action === "ready-receiver") {
      await ensureAudio();
      state = logic.readyReceiver(state);
      render();
      beginPlayback();
      return;
    }
    if (action === "replay") {
      await ensureAudio();
      state = logic.replay(state);
      render();
      beginPlayback();
      return;
    }
    if (action === "resume-playback") {
      await ensureAudio();
      beginPlayback();
      return;
    }
    if (action === "guess") state = logic.guess(state, button.dataset.candidate);
    if (action === "next") state = logic.nextRound(state);
    if (action === "restart") {
      cancelPlayback(false);
      state = logic.restart(state, createRounds());
    }
    render();
  });

  pulseButtons.forEach((button) => {
    button.addEventListener("click", () => enterPulse(button.dataset.pulse));
  });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (state.phase === "sending") {
      if (key === "s" || key === ".") enterPulse("short");
      else if (key === "l" || key === "-") enterPulse("long");
      else if (event.key === "Backspace") {
        event.preventDefault();
        state = logic.undoPulse(state);
        render();
      } else if (event.key === "Enter" && state.sentPulses.length === 3) {
        event.preventDefault();
        state = logic.sealTelegram(state);
        render();
      }
      return;
    }
    if (state.phase === "guessing" && /^[1-4]$/.test(event.key)) {
      const candidateId = currentRound().candidateIds[Number(event.key) - 1];
      state = logic.guess(state, candidateId);
      render();
    } else if (state.phase === "guessing" && key === "r" && state.replaysUsed === 0) {
      event.preventDefault();
      state = logic.replay(state);
      render();
      void ensureAudio().then(beginPlayback);
    }
  });

  window.addEventListener("blur", interruptPlayback);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) interruptPlayback();
  });
  window.addEventListener("beforeunload", releaseAudio);

  function enterPulse(pulse) {
    if (state.phase !== "sending") return;
    void ensureAudio();
    const previousLength = state.sentPulses.length;
    state = logic.tapPulse(state, pulse);
    if (state.sentPulses.length === previousLength) return;
    playTone(pulse);
    pulseButtons.find((button) => button.dataset.pulse === pulse)?.classList.add("is-pressed");
    window.setTimeout(() => {
      pulseButtons.forEach((button) => button.classList.remove("is-pressed"));
    }, 140);
    render();
  }

  function beginPlayback() {
    if (state.phase !== "playback") return;
    cancelPlayback(false);
    playbackInterrupted = false;
    const token = state.playbackToken;
    const sequence = [...state.sentPulses];
    let cursor = 420;
    sequence.forEach((pulse, index) => {
      schedule(() => {
        activePulse = pulse;
        activePulseIndex = index;
        playTone(pulse);
        renderPulseStrip();
      }, cursor);
      cursor += pulse === "short" ? 180 : 480;
      schedule(() => {
        if (activePulseIndex === index) {
          activePulse = null;
          activePulseIndex = -1;
          renderPulseStrip();
        }
      }, cursor);
      cursor += 220;
    });
    schedule(() => {
      playbackTimers.clear();
      activePulse = null;
      activePulseIndex = -1;
      state = logic.finishPlayback(state, token);
      render();
    }, cursor + 120);
  }

  function interruptPlayback() {
    if (state.phase !== "playback" || playbackTimers.size === 0) return;
    cancelPlayback(true);
    render();
  }

  function cancelPlayback(interrupted) {
    for (const timer of playbackTimers) window.clearTimeout(timer);
    playbackTimers = new Set();
    activePulse = null;
    activePulseIndex = -1;
    playbackInterrupted = interrupted;
  }

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      playbackTimers.delete(timer);
      callback();
    }, delay);
    playbackTimers.add(timer);
  }

  function render() {
    const isIntro = state.phase === "intro";
    codebook.replaceChildren();
    codebook.hidden = !isIntro;
    station.classList.toggle("codebook-closed", !isIntro);
    station.dataset.phase = state.phase;
    if (isIntro) renderCodebook();

    const player = playerName();
    roundStatus.textContent = isIntro ? "四轮交替发送" : `第 ${state.roundIndex + 1} / 4 轮 · ${player}`;
    score.textContent = `共同译对 ${state.score} / 4`;
    renderTarget();
    renderPulseStrip();
    renderStage(player);
    const canTap = state.phase === "sending" && state.sentPulses.length < 3;
    pulseButtons.forEach((button) => {
      button.disabled = !canTap;
    });
    dialNeedle.style.setProperty("--dial-turn", `${state.roundIndex * 11 + state.sentPulses.length * 6}deg`);
    const focusTarget = stage.querySelector("[data-focus]");
    if (focusTarget) window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }

  function renderCodebook() {
    const title = document.createElement("h2");
    title.textContent = "今晚的六码本";
    const list = document.createElement("dl");
    logic.CODEBOOK.forEach((item) => {
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = item.label;
      definition.textContent = pulseText(item.pulses);
      list.append(term, definition);
    });
    codebook.append(title, list);
  }

  function renderTarget() {
    if (state.phase === "sending" || state.phase === "result") {
      const target = targetCode();
      targetLabel.textContent = state.phase === "sending" ? "这轮请发送" : "本轮目标";
      targetValue.textContent = `${target.label}  ${pulseText(target.pulses)}`;
      return;
    }
    if (state.phase === "complete") {
      targetLabel.textContent = "四封电报已经收齐";
      targetValue.textContent = `共同译对 ${state.score} 封`;
      return;
    }
    if (state.phase === "intro") {
      targetLabel.textContent = "今晚共同守台";
      targetValue.textContent = "先记住六码本";
      return;
    }
    targetLabel.textContent = state.phase === "senderHandoff" ? "等待发送方接台" : "目标已封存";
    targetValue.textContent = state.phase === "playback" ? "电报正在抵达" : "交接后再继续";
  }

  function renderPulseStrip() {
    pulseStrip.replaceChildren();
    for (let index = 0; index < 3; index += 1) {
      const lamp = document.createElement("li");
      const visibleSending = state.phase === "sending" && state.sentPulses[index];
      const visibleResult = state.phase === "result" && state.sentPulses[index];
      const visiblePlayback = state.phase === "playback" && activePulseIndex === index;
      const pulse = visibleSending || visibleResult ? state.sentPulses[index] : visiblePlayback ? activePulse : null;
      lamp.className = pulse ? `pulse ${pulse} is-lit` : "pulse";
      lamp.textContent = pulse ? (pulse === "short" ? "短" : "长") : "·";
      lamp.setAttribute("aria-label", pulse ? `第 ${index + 1} 拍，${pulse === "short" ? "短" : "长"}` : `第 ${index + 1} 拍，等待`);
      pulseStrip.append(lamp);
    }
    const revealed = state.phase === "sending" || state.phase === "result";
    pulseStrip.setAttribute("aria-label", revealed ? `已录入 ${state.sentPulses.length} / 3 拍` : "三拍电报灯");
  }

  function renderStage(player) {
    stage.replaceChildren();
    if (state.phase === "intro") {
      stage.append(
        heading("两个人，共用一套暗号"),
        copy("先一起记住左边六码本。四轮交替发送，每人两次。"),
        action("开始守台", "start", true),
      );
      return;
    }
    if (state.phase === "senderHandoff") {
      stage.append(
        heading(`请把设备交给${player}`),
        copy("另一位先移开视线；准备好后才会显示本轮目标。"),
        action(`${player}接好了`, "ready-sender", true),
      );
      return;
    }
    if (state.phase === "sending") {
      const actions = document.createElement("div");
      actions.className = "stage-actions";
      const undo = action("撤回一拍", "undo");
      undo.disabled = state.sentPulses.length === 0;
      const seal = action("封存电报", "seal");
      seal.disabled = state.sentPulses.length !== 3;
      actions.append(undo, seal);
      stage.append(
        heading(`${player}报码 · ${state.sentPulses.length} / 3 拍`),
        copy("照目标顺序按短 / 长键；输错可以撤回，不会自动纠正。"),
        actions,
      );
      return;
    }
    if (state.phase === "receiverHandoff") {
      stage.append(
        heading("电报已经封存"),
        copy("发送方移开视线，把设备交给另一位。目标与报码已从交接页移除。"),
        action("接收方戴好耳朵了", "ready-receiver", true),
      );
      return;
    }
    if (state.phase === "playback") {
      if (playbackInterrupted) {
        const resume = action("从头播放", "resume-playback", true);
        stage.append(heading("播放已暂停"), copy("页面刚刚离开焦点，本轮没有偷偷推进。"), resume);
      } else {
        stage.append(heading("电报正在抵达"), copy("留意每次亮灯的长短；播放结束后才会出现选项。"));
      }
      return;
    }
    if (state.phase === "guessing") {
      const choices = document.createElement("div");
      choices.className = "choices";
      currentRound().candidateIds.forEach((candidateId, index) => {
        const button = action(`${index + 1} · ${logic.getCode(candidateId).label}`, "guess", index === 0);
        button.dataset.candidate = candidateId;
        choices.append(button);
      });
      const replay = action(state.replaysUsed === 0 ? "再听一次（R）" : "重听机会已用", "replay");
      replay.classList.add("secondary");
      replay.disabled = state.replaysUsed !== 0;
      stage.append(heading("这封电报说的是？"), choices, replay);
      return;
    }
    if (state.phase === "result") {
      const resultCopy = {
        delivered: "报码和译码都准确，这封电报完整送达。",
        encodingError: "目标猜对了，但发送的三拍与码本不同。",
        decodingError: "三拍发送准确，这次译成了另一个词。",
        bothError: "这次报码与译码都拐了个弯，下一封再会合。",
      }[state.resultKind];
      const guessed = logic.getCode(state.guess).label;
      stage.append(
        heading(state.resultKind === "delivered" ? "电报准确送达" : "电报留下了一点杂音"),
        copy(`${resultCopy} 接收方选择：${guessed}；实际报码：${pulseText(state.sentPulses)}。`),
        action(state.roundIndex === 3 ? "查看守台记录" : "交给下一位", "next", true),
      );
      return;
    }
    stage.append(
      heading(state.score === 4 ? "四封电报，全都抵达" : "今晚的电报收齐了"),
      copy(`共同译对 ${state.score} / 4。这个数字只记录今晚的报码，不评价你们的关系。`),
      action("再守一轮", "restart", true),
    );
  }

  function action(label, name, focus = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-action";
    button.dataset.action = name;
    if (focus) button.dataset.focus = "";
    button.textContent = label;
    return button;
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

  function currentRound() {
    return state.rounds[state.roundIndex];
  }

  function targetCode() {
    return logic.getCode(currentRound().targetId);
  }

  function playerName() {
    return state.roundIndex % 2 === 0 ? "珊瑚方" : "青绿方";
  }

  function pulseText(pulses) {
    return pulses.map((pulse) => pulse === "short" ? "·" : "—").join("");
  }

  function createRounds() {
    return logic.createRoundPlan(secureRandomIndex);
  }

  function secureRandomIndex(limit) {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") throw new Error("crypto unavailable");
    const range = 0x100000000;
    const threshold = range - (range % limit);
    const buffer = new Uint32Array(1);
    do {
      globalThis.crypto.getRandomValues(buffer);
    } while (buffer[0] >= threshold);
    return buffer[0] % limit;
  }

  async function ensureAudio() {
    if (!soundEnabled) return;
    const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      audioContext ||= new AudioContextCtor();
      if (audioContext.state === "suspended") await audioContext.resume();
    } catch {
      soundEnabled = false;
      audioContext = null;
    }
  }

  function playTone(pulse) {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const duration = pulse === "short" ? .18 : .48;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.12, now + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  function releaseAudio() {
    cancelPlayback(false);
    if (audioContext) void audioContext.close();
    audioContext = null;
  }
})();
