import { MAX_RECORDING_SECONDS, mergeChunks, recordingLevel, resampleTo16k } from "./audio.js";
import { advance, createSession, prompts } from "./logic.js";
import { createSpeechClient } from "./speech-client.js";

const capabilityId = "speech-whisper-base";
const gate = document.querySelector("#gate");
const gateCopy = document.querySelector("#gate-copy");
const gateAction = document.querySelector("#gate-action");
const experience = document.querySelector("#experience");
const stage = document.querySelector("#stage");
const progress = document.querySelector("#progress");
const roundLabel = document.querySelector("#round-label");
const prompt = document.querySelector("#prompt");

let session = createSession();
let capability = null;
let speech = null;
let recorder = null;
let elapsedTimer = null;
let deadlineTimer = null;
let startedAt = 0;

checkCapability();
window.addEventListener("pagehide", releaseEverything);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && session.phase === "recording") abortRecording("页面已隐藏，录音已经停止。请回来后重试。");
});

async function checkCapability() {
  if (location.protocol === "file:") {
    showGate("这个作品需要本地服务", "请先双击仓库根目录的 start.command（Windows 使用 start.bat），再从门户打开。", retryButton());
    return;
  }
  try {
    const response = await fetch("/api/capabilities", { cache: "no-store" });
    if (!response.ok) throw new Error("能力状态接口不可用");
    const body = await response.json();
    capability = body.capabilities?.find(({ id }) => id === capabilityId);
    if (!capability) throw new Error("能力声明不存在");
    if (capability.state !== "available") {
      showMissingCapability(capability);
      return;
    }
    const compatibilityError = browserCompatibilityError();
    if (compatibilityError) {
      showGate("当前浏览器还不能运行本地语音", compatibilityError, retryButton());
      return;
    }
    showGate(
      "两句话，只留在这台电脑",
      "模型已安装。准备时会把约 142 MiB 模型读进浏览器内存；第一次可能需要一点时间。",
      actionButton("准备本机语音", prepareSpeech),
    );
  } catch {
    showGate("没有连上 Two of Us 本地服务", "请确认 start.command / start.bat 仍在运行，然后重新检查。", retryButton());
  }
}

async function prepareSpeech() {
  const button = gateAction.querySelector("button");
  button.disabled = true;
  button.textContent = "正在把模型放进本机内存…";
  try {
    speech = createSpeechClient(capability);
    await speech.initialize();
    session = advance(session, { type: "BEGIN" });
    gate.hidden = true;
    experience.hidden = false;
    render();
  } catch (error) {
    speech?.terminate();
    speech = null;
    showGate("本地语音没有准备好", readableError(error), actionButton("再试一次", prepareSpeech));
  }
}

function render() {
  progress.textContent = session.phase === "complete" ? "两句话 · 已相遇" : `第 ${session.roundIndex + 1} 句话`;
  roundLabel.textContent = session.phase === "complete" ? "2 / 2" : `${session.roundIndex + 1} / 2`;
  prompt.textContent = session.phase === "complete" ? "原来，我们都在认真听" : prompts[session.roundIndex];
  document.documentElement.style.setProperty("--level", "0");

  if (session.phase === "ready" || session.phase === "recording" || session.phase === "transcribing") {
    stage.innerHTML = recordStage();
    const recordButton = stage.querySelector("#record");
    if (session.phase === "ready") recordButton.addEventListener("click", startRecording);
    if (session.phase === "recording") recordButton.addEventListener("click", stopAndTranscribe);
    return;
  }
  if (session.phase === "review") {
    stage.innerHTML = reviewStage();
    const field = stage.querySelector("#transcript");
    field.addEventListener("input", () => {
      session = advance(session, { type: "EDIT_DRAFT", text: field.value });
      stage.querySelector("#counter").textContent = `${session.draft.length} / 200`;
      stage.querySelector("#review-error").textContent = session.error ?? "";
    });
    stage.querySelector("#retry").addEventListener("click", () => { session = advance(session, { type: "RETRY" }); render(); });
    stage.querySelector("#confirm").addEventListener("click", () => { session = advance(session, { type: "CONFIRM" }); render(); });
    field.focus();
    return;
  }
  if (session.phase === "handoff") {
    stage.innerHTML = `<div class="handoff"><h2>把电脑交给对方</h2><p>第一句话已经收好，不会在交接时显示。<br>对方准备好后，再继续第二句话。</p><button id="handoff" class="button button-primary">我拿好了，继续</button></div>`;
    stage.querySelector("#handoff").addEventListener("click", () => { session = advance(session, { type: "ACCEPT_HANDOFF" }); render(); });
    return;
  }
  if (session.phase === "complete") {
    stage.innerHTML = `<div class="complete"><h2>两条声音，在这里相遇</h2><div class="voices"><article class="quote"><small>第一句话</small><p>${escapeHtml(session.confirmed[0])}</p></article><article class="quote"><small>第二句话</small><p>${escapeHtml(session.confirmed[1])}</p></article></div><button id="again" class="button">重新听彼此一次</button></div>`;
    stage.querySelector("#again").addEventListener("click", () => location.reload());
    return;
  }
  if (session.phase === "error") {
    stage.innerHTML = `<div class="handoff"><h2>这次没有录好</h2><p>${escapeHtml(session.error)}</p><button id="retry" class="button button-primary">再说一次</button></div>`;
    stage.querySelector("#retry").addEventListener("click", () => { session = advance(session, { type: "RETRY" }); render(); });
  }
}

async function startRecording() {
  let pendingStream = null;
  let pendingContext = null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    pendingStream = stream;
    const context = new AudioContext({ latencyHint: "interactive" });
    pendingContext = context;
    await context.audioWorklet.addModule("./recorder-worklet.js");
    const source = context.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(context, "local-pcm-recorder", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    const mute = context.createGain();
    mute.gain.value = 0;
    source.connect(worklet).connect(mute).connect(context.destination);
    recorder = { stream, context, source, worklet, mute, chunks: [], sampleRate: context.sampleRate };
    pendingStream = null;
    pendingContext = null;
    worklet.port.onmessage = ({ data }) => {
      if (!(data instanceof Float32Array) || !recorder) return;
      recorder.chunks.push(data);
      document.documentElement.style.setProperty("--level", recordingLevel(data).toFixed(3));
    };
    session = advance(session, { type: "START_RECORDING" });
    startedAt = performance.now();
    elapsedTimer = setInterval(updateTimer, 100);
    deadlineTimer = setTimeout(stopAndTranscribe, MAX_RECORDING_SECONDS * 1000);
    render();
    updateTimer();
  } catch (error) {
    for (const track of pendingStream?.getTracks() ?? []) track.stop();
    await pendingContext?.close().catch(() => {});
    await shutdownRecorder();
    session = advance(advance(session, { type: "START_RECORDING" }), {
      type: "FAIL",
      message: microphoneError(error),
    });
    render();
  }
}

async function stopAndTranscribe() {
  if (session.phase !== "recording" || !recorder) return;
  session = advance(session, { type: "STOP_RECORDING" });
  render();
  const sampleRate = recorder.sampleRate;
  const merged = mergeChunks(recorder.chunks);
  await shutdownRecorder();
  try {
    const audio = resampleTo16k(merged, sampleRate);
    if (audio.length < 1_600) throw new Error("这句话太短了，请完整地说一次。 ");
    const result = await speech.transcribe(audio);
    session = advance(session, { type: "TRANSCRIBED", text: result.text });
  } catch (error) {
    session = advance(session, { type: "FAIL", message: readableError(error) });
  }
  render();
}

async function abortRecording(message) {
  await shutdownRecorder();
  session = advance(session, { type: "FAIL", message });
  render();
}

async function shutdownRecorder() {
  clearInterval(elapsedTimer);
  clearTimeout(deadlineTimer);
  elapsedTimer = null;
  deadlineTimer = null;
  const active = recorder;
  recorder = null;
  if (!active) return;
  active.worklet.port.onmessage = null;
  try { active.source.disconnect(); } catch {}
  try { active.worklet.disconnect(); } catch {}
  try { active.mute.disconnect(); } catch {}
  for (const track of active.stream.getTracks()) track.stop();
  await active.context.close().catch(() => {});
  active.chunks.length = 0;
}

function updateTimer() {
  const timer = stage.querySelector("#timer");
  if (!timer) return;
  const elapsed = Math.min(MAX_RECORDING_SECONDS, (performance.now() - startedAt) / 1000);
  timer.textContent = `${elapsed.toFixed(1)} / ${MAX_RECORDING_SECONDS}.0 秒`;
}

function recordStage() {
  const recording = session.phase === "recording";
  const transcribing = session.phase === "transcribing";
  return `<button id="record" class="record" type="button" aria-pressed="${recording}" ${transcribing ? "disabled" : ""}><span class="record-icon" aria-hidden="true">${recording ? "■" : "♩"}</span><span class="record-label">${recording ? "说完了" : transcribing ? "请稍候" : "按下开始说"}</span></button><p class="status">${recording ? "正在听，只在本机" : transcribing ? "正在本机整理" : session.error ?? "最长 12 秒，可以慢慢说"}</p><p id="timer" class="timer">${recording ? `0.0 / ${MAX_RECORDING_SECONDS}.0 秒` : ""}</p>`;
}

function reviewStage() {
  return `<div class="review"><label for="transcript">本机整理出的草稿，可以亲自改正</label><textarea id="transcript" class="transcript" maxlength="200">${escapeHtml(session.draft)}</textarea><p id="counter" class="counter">${session.draft.length} / 200</p><div class="actions"><button id="retry" class="button">↻ 重新说</button><button id="confirm" class="button button-primary">✓ 确认这句话</button></div><p id="review-error" class="inline-error">${escapeHtml(session.error ?? "")}</p></div>`;
}

function showMissingCapability(status) {
  const gib = (status.artifacts?.reduce((sum, item) => sum + item.bytes, 0) / 1024 / 1024).toFixed(1);
  showGate(
    status.state === "missing" ? "还没有安装本地语音模型" : "本地语音能力需要修复",
    status.state === "missing" ? `模型约 ${gib} MiB，只需安装一次；之后断开公网也能使用。` : status.message,
    `<div class="install-box"><strong>在仓库终端运行</strong><code>node scripts/capabilities.mjs install speech-whisper-base</code><div class="actions"><button id="copy-command" class="button">复制命令</button><button id="retry-check" class="button button-primary">安装后重新检查</button></div></div>`,
  );
  gateAction.querySelector("#copy-command").addEventListener("click", async (event) => {
    await navigator.clipboard.writeText("node scripts/capabilities.mjs install speech-whisper-base");
    event.currentTarget.textContent = "已复制";
  });
  gateAction.querySelector("#retry-check").addEventListener("click", checkCapability);
}

function showGate(title, copy, action) {
  gate.querySelector("#gate-title").textContent = title;
  gateCopy.textContent = copy;
  gateAction.innerHTML = typeof action === "string" ? action : "";
  if (action instanceof HTMLElement) gateAction.replaceChildren(action);
  gate.hidden = false;
  experience.hidden = true;
}

function actionButton(label, handler) {
  const button = document.createElement("button");
  button.className = "button button-primary";
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function retryButton() { return actionButton("重新检查", checkCapability); }

function browserCompatibilityError() {
  if (!globalThis.crossOriginIsolated) return "本地服务没有为此页面启用隔离环境，请重新启动服务并刷新。";
  if (!navigator.mediaDevices?.getUserMedia) return "当前浏览器没有可用的麦克风接口。建议使用最新版 Chrome 或 Edge。";
  if (!globalThis.AudioWorkletNode) return "当前浏览器不支持 AudioWorklet。建议使用最新版 Chrome 或 Edge。";
  if (!globalThis.Worker || !globalThis.WebAssembly) return "当前浏览器缺少本地推理所需的 Worker 或 WebAssembly。";
  return null;
}

function microphoneError(error) {
  if (error?.name === "NotAllowedError") return "麦克风权限被拒绝。请在地址栏允许后再试。";
  if (error?.name === "NotFoundError") return "没有找到可用麦克风。请连接设备后再试。";
  if (error?.name === "NotReadableError") return "麦克风可能正被其他应用占用。关闭占用后再试。";
  return "麦克风没有准备好，请检查设备和权限后重试。";
}

function readableError(error) {
  return typeof error?.message === "string" && error.message.trim()
    ? error.message.trim().slice(0, 160)
    : "本机语音处理失败，请再试一次。";
}

function releaseEverything() {
  shutdownRecorder();
  speech?.terminate();
  speech = null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}
