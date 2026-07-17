import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerPath = path.join(
  rootDir,
  "capabilities",
  "speech-whisper-base",
  "browser",
  "transcriber.worker.js",
);
const workerSource = await readFile(workerPath, "utf8");
const capabilityRoot = "/api/capabilities/speech-whisper-base";

test("transcriber worker loads fixed same-origin resources and reuses one engine", async () => {
  const fixture = createWorkerFixture();
  await fixture.send({
    type: "init",
    requestId: "init-1",
    resources: resourceUrls(),
    modelBytes: fixture.model.byteLength,
  });

  assert.equal(fixture.imports.length, 1);
  assert.equal(fixture.imports[0], `http://localhost:4173${capabilityRoot}/browser/engine-js`);
  assert.equal(fixture.factoryOptions.mainScriptUrlOrBlob, fixture.imports[0]);
  assert.equal(fixture.factoryOptions.locateFile("speech-whisper.wasm"), resourceUrls().engineWasm);
  assert.deepEqual(fixture.writtenModel, fixture.model);
  assert.equal(fixture.messages.at(-1).type, "ready");
  assert.equal(fixture.messages.at(-1).reused, false);

  await fixture.send({
    type: "init",
    requestId: "init-2",
    resources: resourceUrls(),
    modelBytes: fixture.model.byteLength,
  });
  assert.equal(fixture.imports.length, 1);
  assert.equal(fixture.messages.at(-1).reused, true);
});

test("transcriber worker returns structured results and disposes private state", async () => {
  const fixture = createWorkerFixture();
  await fixture.send({
    type: "init",
    requestId: "init",
    resources: resourceUrls(),
    modelBytes: fixture.model.byteLength,
  });
  const audio = new Float32Array(16_000);
  audio[0] = 0.25;
  await fixture.send({ type: "transcribe", requestId: "speech", audio, language: "zh", threads: 3 });

  const transcript = fixture.messages.at(-1);
  assert.equal(transcript.type, "transcript");
  assert.equal(transcript.requestId, "speech");
  assert.equal(transcript.result.text, "我听见了");
  assert.equal(fixture.transcribeCall.language, "zh");
  assert.equal(fixture.transcribeCall.threads, 3);
  assert.equal(fixture.transcribeCall.audio[0], 0.25);

  await fixture.send({ type: "dispose", requestId: "dispose" });
  assert.equal(fixture.disposed, 1);
  assert.equal(fixture.unlinked, "/ggml-base.bin");
  assert.equal(fixture.messages.at(-1).type, "disposed");
});

test("transcriber worker rejects external resources and invalid audio", async () => {
  const fixture = createWorkerFixture();
  await fixture.send({
    type: "init",
    requestId: "external",
    resources: { ...resourceUrls(), engineJs: "https://example.com/engine.js" },
    modelBytes: fixture.model.byteLength,
  });
  assert.equal(fixture.messages.at(-1).error.code, "RESOURCE_URL_REJECTED");
  assert.equal(fixture.imports.length, 0);

  await fixture.send({
    type: "init",
    requestId: "valid",
    resources: resourceUrls(),
    modelBytes: fixture.model.byteLength,
  });
  await fixture.send({ type: "transcribe", requestId: "bad-audio", audio: new Float32Array() });
  assert.equal(fixture.messages.at(-1).error.code, "AUDIO_LENGTH_INVALID");
});

function resourceUrls() {
  return {
    engineJs: `http://localhost:4173${capabilityRoot}/browser/engine-js`,
    engineWasm: `http://localhost:4173${capabilityRoot}/browser/engine-wasm`,
    model: `http://localhost:4173${capabilityRoot}/artifacts/ggml-base`,
  };
}

function createWorkerFixture() {
  const model = new Uint8Array([1, 2, 3, 4]);
  const messages = [];
  const imports = [];
  const fixture = {
    model,
    messages,
    imports,
    factoryOptions: null,
    writtenModel: null,
    transcribeCall: null,
    disposed: 0,
    unlinked: null,
  };
  const self = {
    location: new URL(`http://localhost:4173${capabilityRoot}/browser/transcriber-worker`),
    postMessage(message) { messages.push(message); },
  };
  const context = vm.createContext({
    self,
    URL,
    Error,
    Object,
    Number,
    Float32Array,
    Uint8Array,
    fetch: async () => ({
      ok: true,
      headers: { get: (name) => name === "content-length" ? String(model.byteLength) : null },
      arrayBuffer: async () => model.slice().buffer,
    }),
    importScripts(url) {
      imports.push(url);
      context.createSpeechWhisperModule = async (options) => {
        fixture.factoryOptions = options;
        return {
          FS: {
            writeFile(_path, bytes) { fixture.writtenModel = bytes.slice(); },
            unlink(target) { fixture.unlinked = target; },
          },
          init: () => ({ ok: true, code: "READY" }),
          transcribe(audio, language, threads) {
            fixture.transcribeCall = { audio: audio.slice(), language, threads };
            return { ok: true, text: "我听见了", segments: [], inferenceMs: 12 };
          },
          dispose() { fixture.disposed += 1; },
        };
      };
    },
  });
  vm.runInContext(workerSource, context, { filename: workerPath });
  fixture.send = (data) => self.onmessage({ data });
  return fixture;
}
