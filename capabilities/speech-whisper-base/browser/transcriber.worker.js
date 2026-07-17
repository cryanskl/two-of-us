const CAPABILITY_ROOT = "/api/capabilities/speech-whisper-base";
const RESOURCE_PATHS = Object.freeze({
  engineJs: `${CAPABILITY_ROOT}/browser/engine-js`,
  engineWasm: `${CAPABILITY_ROOT}/browser/engine-wasm`,
  model: `${CAPABILITY_ROOT}/artifacts/ggml-base`,
});
const MODEL_PATH = "/ggml-base.bin";
const MAX_MODEL_BYTES = 200_000_000;
const MAX_AUDIO_SAMPLES = 12 * 16_000;

let engine = null;
let state = "idle";

self.onmessage = async ({ data }) => {
  const requestId = normalizeRequestId(data?.requestId);
  try {
    if (data?.type === "init") {
      await initialize(data, requestId);
      return;
    }
    if (data?.type === "transcribe") {
      transcribe(data, requestId);
      return;
    }
    if (data?.type === "dispose") {
      dispose(requestId);
      return;
    }
    throw protocolError("UNKNOWN_MESSAGE", "无法识别的语音任务。", true);
  } catch (error) {
    postError(requestId, error);
  }
};

async function initialize(message, requestId) {
  if (state === "ready") {
    self.postMessage({ type: "ready", requestId, reused: true });
    return;
  }
  if (state !== "idle") throw protocolError("NOT_IDLE", "语音能力正在准备，请稍候。", true);
  state = "loading";
  try {
    const resources = validateResources(message.resources);
    const modelBytes = validateModelBytes(message.modelBytes);
    importScripts(resources.engineJs);
    if (typeof createSpeechWhisperModule !== "function") {
      throw protocolError("ENGINE_SCRIPT_INVALID", "本地语音引擎脚本无效。", false);
    }

    engine = await createSpeechWhisperModule({
      locateFile(filename) {
        if (filename.endsWith(".wasm")) return resources.engineWasm;
        return new URL(filename, resources.engineJs).href;
      },
      mainScriptUrlOrBlob: resources.engineJs,
      print() {},
      printErr() {},
    });

    const response = await fetch(resources.model, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) throw protocolError("MODEL_FETCH_FAILED", "无法读取已安装的本地模型。", true);
    const advertisedBytes = Number(response.headers.get("content-length"));
    if (advertisedBytes !== modelBytes) {
      throw protocolError("MODEL_LENGTH_MISMATCH", "本地模型长度与能力声明不一致。", false);
    }
    const model = new Uint8Array(await response.arrayBuffer());
    if (model.byteLength !== modelBytes) {
      throw protocolError("MODEL_LENGTH_MISMATCH", "本地模型读取不完整。", true);
    }
    engine.FS.writeFile(MODEL_PATH, model);
    const initialized = engine.init(MODEL_PATH);
    if (!initialized?.ok) {
      throw protocolError(initialized?.code ?? "MODEL_LOAD_FAILED", "本地模型无法载入。", false);
    }
    state = "ready";
    self.postMessage({ type: "ready", requestId, reused: false, modelBytes });
  } catch (error) {
    releaseEngine();
    state = "idle";
    throw error;
  }
}

function transcribe(message, requestId) {
  if (state !== "ready" || !engine) {
    throw protocolError("NOT_READY", "语音能力尚未准备完成。", true);
  }
  if (!(message.audio instanceof Float32Array)) {
    throw protocolError("AUDIO_INVALID", "录音数据格式无效。", true);
  }
  if (message.audio.length === 0 || message.audio.length > MAX_AUDIO_SAMPLES) {
    throw protocolError("AUDIO_LENGTH_INVALID", "录音需要在 12 秒以内。", true);
  }
  state = "busy";
  try {
    const language = typeof message.language === "string" ? message.language.slice(0, 8) : "zh";
    const threads = Number.isSafeInteger(message.threads) ? message.threads : 4;
    const result = engine.transcribe(message.audio, language, threads);
    if (!result?.ok) {
      throw protocolError(result?.code ?? "TRANSCRIBE_FAILED", result?.message ?? "本机转写失败。", true);
    }
    self.postMessage({ type: "transcript", requestId, result });
  } finally {
    state = "ready";
  }
}

function dispose(requestId) {
  releaseEngine();
  state = "disposed";
  self.postMessage({ type: "disposed", requestId });
}

function releaseEngine() {
  if (!engine) return;
  try { engine.dispose(); } catch {}
  try { engine.FS.unlink(MODEL_PATH); } catch {}
  engine = null;
}

function validateResources(resources) {
  if (!resources || typeof resources !== "object") {
    throw protocolError("RESOURCES_INVALID", "缺少本地语音资源地址。", false);
  }
  const validated = {};
  for (const [key, pathname] of Object.entries(RESOURCE_PATHS)) {
    let url;
    try {
      url = new URL(resources[key], self.location.href);
    } catch {
      throw protocolError("RESOURCE_URL_INVALID", "本地语音资源地址无效。", false);
    }
    if (url.origin !== self.location.origin || url.pathname !== pathname || url.search || url.hash) {
      throw protocolError("RESOURCE_URL_REJECTED", "本地语音资源不在允许范围内。", false);
    }
    validated[key] = url.href;
  }
  return validated;
}

function validateModelBytes(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_MODEL_BYTES) {
    throw protocolError("MODEL_SIZE_INVALID", "本地模型体积声明无效。", false);
  }
  return value;
}

function normalizeRequestId(value) {
  return typeof value === "string" ? value.slice(0, 80) : "unknown";
}

function protocolError(code, message, recoverable) {
  return Object.assign(new Error(message), { code, recoverable });
}

function postError(requestId, error) {
  self.postMessage({
    type: "error",
    requestId,
    error: {
      code: typeof error?.code === "string" ? error.code : "WORKER_ERROR",
      message: typeof error?.message === "string" ? error.message : "本地语音任务失败。",
      recoverable: error?.recoverable !== false,
    },
  });
}
