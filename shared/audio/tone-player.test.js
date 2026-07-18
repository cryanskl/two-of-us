import assert from "node:assert/strict";
import test from "node:test";
import "./tone-player.js";

const { createTonePlayer } = globalThis.TWO_OF_US_TONE_PLAYER;

test("unsupported browsers stay silent without throwing", async () => {
  const player = createTonePlayer({ AudioContextCtor: null });

  assert.equal(await player.ensureReady(), false);
  assert.equal(player.playTone({ frequency: 440 }), false);
  await player.close();
});

test("ensureReady creates, resumes, and reuses one audio context", async () => {
  const fixture = createAudioFixture({ initialState: "suspended" });
  const player = createTonePlayer({ AudioContextCtor: fixture.AudioContext });

  assert.equal(await player.ensureReady(), true);
  assert.equal(await player.ensureReady(), true);
  assert.equal(fixture.contexts.length, 1);
  assert.equal(fixture.contexts[0].resumeCalls, 1);
});

test("playTone schedules an envelope and releases its nodes", async () => {
  const fixture = createAudioFixture();
  const player = createTonePlayer({ AudioContextCtor: fixture.AudioContext });
  await player.ensureReady();

  assert.equal(player.playTone({
    frequency: 392,
    type: "triangle",
    duration: .28,
    attack: .018,
    gain: .16,
  }), true);

  const [{ oscillator, gainNode }] = fixture.contexts[0].voices;
  assert.equal(oscillator.type, "triangle");
  assert.deepEqual(oscillator.frequency.events, [[392, 7]]);
  assert.deepEqual(gainNode.gain.events, [
    ["set", .0001, 7],
    ["ramp", .16, 7.018],
    ["ramp", .0001, 7.28],
  ]);
  assert.equal(oscillator.startedAt, 7);
  assert.equal(oscillator.stoppedAt, 7.3);
  assert.equal(oscillator.connectedTo, gainNode);
  assert.equal(gainNode.connectedTo, fixture.contexts[0].destination);

  oscillator.finish();
  assert.equal(oscillator.disconnected, true);
  assert.equal(gainNode.disconnected, true);
});

test("invalid tone options never allocate audio nodes", async () => {
  const fixture = createAudioFixture();
  const player = createTonePlayer({ AudioContextCtor: fixture.AudioContext });
  await player.ensureReady();

  assert.equal(player.playTone({ frequency: 0 }), false);
  assert.equal(player.playTone({ frequency: 440, type: "noise" }), false);
  assert.equal(player.playTone({ frequency: 440, duration: 0 }), false);
  assert.equal(player.playTone({ frequency: 440, duration: .1, attack: .2 }), false);
  assert.equal(player.playTone({ frequency: 440, gain: 2 }), false);
  assert.equal(fixture.contexts[0].voices.length, 0);
});

test("close releases the context and a later gesture may create another", async () => {
  const fixture = createAudioFixture();
  const player = createTonePlayer({ AudioContextCtor: fixture.AudioContext });
  await player.ensureReady();
  await player.close();

  assert.equal(fixture.contexts[0].closeCalls, 1);
  assert.equal(await player.ensureReady(), true);
  assert.equal(fixture.contexts.length, 2);
});

function createAudioFixture({ initialState = "running" } = {}) {
  const contexts = [];

  class AudioContext {
    constructor() {
      this.state = initialState;
      this.currentTime = 7;
      this.destination = { kind: "destination" };
      this.resumeCalls = 0;
      this.closeCalls = 0;
      this.voices = [];
      this.pendingOscillator = null;
      contexts.push(this);
    }

    async resume() {
      this.resumeCalls += 1;
      this.state = "running";
    }

    createOscillator() {
      const oscillator = createOscillator();
      this.pendingOscillator = oscillator;
      return oscillator;
    }

    createGain() {
      const gainNode = createGainNode();
      this.voices.push({ oscillator: this.pendingOscillator, gainNode });
      this.pendingOscillator = null;
      return gainNode;
    }

    async close() {
      this.closeCalls += 1;
      this.state = "closed";
    }
  }

  return { AudioContext, contexts };
}

function createOscillator() {
  let endedHandler = null;
  return {
    type: "sine",
    frequency: {
      events: [],
      setValueAtTime(value, time) { this.events.push([value, time]); },
    },
    connect(target) { this.connectedTo = target; },
    disconnect() { this.disconnected = true; },
    addEventListener(name, handler) {
      if (name === "ended") endedHandler = handler;
    },
    start(time) { this.startedAt = time; },
    stop(time) { this.stoppedAt = time; },
    finish() { endedHandler?.(); },
  };
}

function createGainNode() {
  return {
    gain: {
      events: [],
      setValueAtTime(value, time) { this.events.push(["set", value, time]); },
      exponentialRampToValueAtTime(value, time) { this.events.push(["ramp", value, time]); },
    },
    connect(target) { this.connectedTo = target; },
    disconnect() { this.disconnected = true; },
  };
}
