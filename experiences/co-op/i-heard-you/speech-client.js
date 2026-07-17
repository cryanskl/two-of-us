export function createSpeechClient(capability, { WorkerCtor = globalThis.Worker } = {}) {
  if (typeof WorkerCtor !== "function") throw new Error("当前浏览器不支持 Worker。");
  const workerHref = browserHref(capability, "transcriber-worker");
  const resources = Object.freeze({
    engineJs: browserHref(capability, "engine-js"),
    engineWasm: browserHref(capability, "engine-wasm"),
    model: artifactHref(capability, "ggml-base"),
  });
  const modelBytes = capability.artifacts.find(({ id }) => id === "ggml-base")?.bytes;
  if (!Number.isSafeInteger(modelBytes) || modelBytes <= 0) throw new Error("模型体积声明无效。");

  const worker = new WorkerCtor(workerHref, { name: "two-of-us-speech" });
  const pending = new Map();
  let sequence = 0;
  let closed = false;
  worker.addEventListener("message", ({ data }) => {
    const request = pending.get(data?.requestId);
    if (!request) return;
    pending.delete(data.requestId);
    if (data.type === "error") request.reject(Object.assign(new Error(data.error.message), data.error));
    else request.resolve(data);
  });
  worker.addEventListener("error", () => rejectAll("本地语音 Worker 意外停止。"));

  return Object.freeze({
    initialize() {
      return request("init", { resources, modelBytes });
    },
    async transcribe(audio, { language = "zh", threads = suggestedThreads() } = {}) {
      if (!(audio instanceof Float32Array)) throw new TypeError("audio must be Float32Array");
      const response = await request("transcribe", { audio, language, threads }, [audio.buffer]);
      return response.result;
    },
    async dispose() {
      if (closed) return;
      try { await request("dispose"); } finally {
        closed = true;
        worker.terminate();
        rejectAll("本地语音 Worker 已关闭。");
      }
    },
    terminate() {
      if (closed) return;
      closed = true;
      worker.terminate();
      rejectAll("本地语音 Worker 已关闭。");
    },
  });

  function request(type, body = {}, transfer = []) {
    if (closed) return Promise.reject(new Error("本地语音 Worker 已关闭。"));
    const requestId = `speech-${Date.now().toString(36)}-${sequence += 1}`;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      worker.postMessage({ type, requestId, ...body }, transfer);
    });
  }

  function rejectAll(message) {
    for (const { reject } of pending.values()) reject(new Error(message));
    pending.clear();
  }
}

function browserHref(capability, id) {
  const href = capability.browserAssets?.find((asset) => asset.id === id)?.href;
  if (typeof href !== "string" || !href.startsWith("/api/capabilities/")) {
    throw new Error(`缺少浏览器资产：${id}`);
  }
  return href;
}

function artifactHref(capability, id) {
  const href = capability.artifacts?.find((asset) => asset.id === id)?.href;
  if (typeof href !== "string" || !href.startsWith("/api/capabilities/")) {
    throw new Error(`缺少能力资源：${id}`);
  }
  return href;
}

function suggestedThreads() {
  const available = Number(globalThis.navigator?.hardwareConcurrency) || 4;
  return Math.max(1, Math.min(4, available - 1 || 1));
}
