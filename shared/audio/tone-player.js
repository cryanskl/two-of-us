(function (global) {
  "use strict";

  const OSCILLATOR_TYPES = new Set(["sine", "square", "sawtooth", "triangle"]);

  function createTonePlayer(options = {}) {
    const AudioContextCtor = options.AudioContextCtor
      || global.AudioContext
      || global.webkitAudioContext;
    let audioContext = null;

    async function ensureReady() {
      if (!AudioContextCtor) return false;
      try {
        if (!audioContext || audioContext.state === "closed") {
          audioContext = new AudioContextCtor();
        }
        if (audioContext.state === "suspended") await audioContext.resume();
        return audioContext.state === "running";
      } catch {
        const failedContext = audioContext;
        audioContext = null;
        try {
          await failedContext?.close();
        } catch {
          // A failed audio context is already unusable; there is nothing else to release.
        }
        return false;
      }
    }

    function playTone({
      frequency,
      type = "sine",
      duration = .2,
      attack = .015,
      gain = .12,
    } = {}) {
      if (!audioContext || audioContext.state !== "running") return false;
      if (!isFiniteBetween(frequency, 20, 24000)) return false;
      if (!OSCILLATOR_TYPES.has(type)) return false;
      if (!isFiniteBetween(duration, .01, 10)) return false;
      if (!isFiniteBetween(attack, .001, duration)) return false;
      if (!isFiniteBetween(gain, .0001, 1)) return false;

      let oscillator;
      let gainNode;
      try {
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        gainNode.gain.setValueAtTime(.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(.0001, now + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.addEventListener("ended", () => {
          oscillator.disconnect();
          gainNode.disconnect();
        }, { once: true });
        oscillator.start(now);
        oscillator.stop(now + duration + .02);
        return true;
      } catch {
        try {
          oscillator?.disconnect();
          gainNode?.disconnect();
        } catch {
          // Partially-created nodes may already be disconnected.
        }
        return false;
      }
    }

    async function close() {
      const contextToClose = audioContext;
      audioContext = null;
      if (!contextToClose || contextToClose.state === "closed") return;
      try {
        await contextToClose.close();
      } catch {
        // Closing is best-effort during page teardown.
      }
    }

    return Object.freeze({ ensureReady, playTone, close });
  }

  function isFiniteBetween(value, minimum, maximum) {
    return Number.isFinite(value) && value >= minimum && value <= maximum;
  }

  global.TWO_OF_US_TONE_PLAYER = Object.freeze({ createTonePlayer });
})(globalThis);
