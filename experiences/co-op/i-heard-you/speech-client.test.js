import assert from "node:assert/strict";
import test from "node:test";
import { createSpeechClient } from "./speech-client.js";

test("speech client maps manifest IDs to worker protocol and transfers PCM", async () => {
  const client = createSpeechClient(capability(), { WorkerCtor: FakeWorker });
  await client.initialize();
  const audio = new Float32Array([0.1, 0.2]);
  const result = await client.transcribe(audio, { language: "zh", threads: 2 });
  assert.equal(result.text, "本机结果");
  assert.equal(FakeWorker.last.messages[0].resources.engineJs, "/api/capabilities/speech/browser/engine-js");
  assert.equal(FakeWorker.last.messages[0].modelBytes, 12);
  assert.equal(FakeWorker.last.transfers[1][0], audio.buffer);
  await client.dispose();
  assert.equal(FakeWorker.last.terminated, true);
});

test("speech client rejects incomplete public capability DTO", () => {
  assert.throws(
    () => createSpeechClient({ ...capability(), browserAssets: [] }, { WorkerCtor: FakeWorker }),
    /transcriber-worker/,
  );
});

test("speech client preserves a bounded worker startup error for local diagnosis", async () => {
  const client = createSpeechClient(capability(), { WorkerCtor: FakeWorker });
  const pending = client.initialize();
  FakeWorker.last.listeners.get("error")({ message: `ReferenceError: broken ${"x".repeat(300)}` });
  await assert.rejects(pending, (error) => error.message.startsWith("ReferenceError: broken")
    && error.message.length === 180);
  client.terminate();
});

function capability() {
  return {
    artifacts: [{ id: "ggml-base", bytes: 12, href: "/api/capabilities/speech/artifacts/model" }],
    browserAssets: [
      { id: "transcriber-worker", href: "/api/capabilities/speech/browser/worker" },
      { id: "engine-js", href: "/api/capabilities/speech/browser/engine-js" },
      { id: "engine-wasm", href: "/api/capabilities/speech/browser/engine-wasm" },
    ],
  };
}

class FakeWorker {
  static last;

  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.listeners = new Map();
    this.messages = [];
    this.transfers = [];
    this.terminated = false;
    FakeWorker.last = this;
  }

  addEventListener(type, handler) { this.listeners.set(type, handler); }

  postMessage(message, transfer = []) {
    this.messages.push(message);
    this.transfers.push(transfer);
    queueMicrotask(() => this.listeners.get("message")({ data: responseFor(message) }));
  }

  terminate() { this.terminated = true; }
}

function responseFor(message) {
  if (message.type === "init") return { type: "ready", requestId: message.requestId };
  if (message.type === "transcribe") {
    return { type: "transcript", requestId: message.requestId, result: { ok: true, text: "本机结果" } };
  }
  return { type: "disposed", requestId: message.requestId };
}
