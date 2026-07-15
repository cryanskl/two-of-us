import CONFIG from "./config.js";
import {
  acceptPublicState,
  advanceRound,
  completeRound,
  normalizeSegment,
  startMatch,
  toPublicState,
} from "./logic.js";

const elements = {
  connection: document.querySelector(".connection"),
  connectionText: document.querySelector("#connection-text"),
  offline: document.querySelector("#offline"),
  lobby: document.querySelector("#lobby"),
  room: document.querySelector("#room"),
  create: document.querySelector("#create-room"),
  joinForm: document.querySelector("#join-form"),
  roomCode: document.querySelector("#room-code"),
  lobbyError: document.querySelector("#lobby-error"),
  roomId: document.querySelector("#room-id"),
  selfMember: document.querySelector("#self-member"),
  partnerMember: document.querySelector("#partner-member"),
  start: document.querySelector("#start-game"),
  round: document.querySelector("#round-count"),
  score: document.querySelector("#score"),
  timer: document.querySelector("#timer"),
  role: document.querySelector("#role-label"),
  status: document.querySelector("#game-status"),
  note: document.querySelector("#game-note"),
  secretCard: document.querySelector("#secret-card"),
  secretWord: document.querySelector("#secret-word"),
  canvas: document.querySelector("#drawing-canvas"),
  canvasEmpty: document.querySelector("#canvas-empty"),
  clear: document.querySelector("#clear-canvas"),
  guessForm: document.querySelector("#guess-form"),
  guessInput: document.querySelector("#guess-input"),
};

let socket = null;
let roomId = null;
let roomMembers = [];
let knownHostId = null;
let publicState = null;
let hostState = null;
let secretWord = "";
let pendingAnswers = new Map();
let resultInfo = null;
let remainingSeconds = CONFIG.secondsPerRound;
let segments = [];
let hostTicker = null;
let roundAdvanceTimer = null;
let drawing = false;
let previousPoint = null;

if (typeof window.io !== "function") {
  showOffline("没有连接到本地运行时");
} else {
  socket = window.io();
  bindSocket();
  bindControls();
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(elements.canvas);
}

function bindSocket() {
  socket.on("connect", () => {
    elements.connection.classList.add("online");
    elements.connectionText.textContent = "已连接本地房间";
    if (!roomId) showOnly(elements.lobby);
  });

  socket.on("connect_error", () => showOffline("本地房间连接失败，正在重试"));
  socket.on("disconnect", () => {
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetGame();
    showOffline("连接已断开，正在等待本地服务恢复");
  });

  socket.on("room:state", handleRoomState);
  socket.on("room:action", handleRoomAction);
  socket.on("room:direct", handleDirectMessage);
}

function bindControls() {
  elements.create.addEventListener("click", () => {
    elements.create.disabled = true;
    elements.lobbyError.textContent = "";
    socket.emit("room:create", { name: "主机" }, (reply) => {
      elements.create.disabled = false;
      handleRoomReply(reply);
    });
  });

  elements.joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.lobbyError.textContent = "";
    socket.emit("room:join", {
      roomId: elements.roomCode.value.trim().toUpperCase(),
      name: "同伴",
    }, handleRoomReply);
  });

  elements.start.addEventListener("click", () => {
    if (!isHost() || roomMembers.length !== 2) return;
    clearHostTimers();
    hostState = startMatch({
      memberIds: roomMembers.map((member) => member.id),
      rounds: CONFIG.rounds,
      secondsPerRound: CONFIG.secondsPerRound,
      words: CONFIG.words,
      now: Date.now(),
      version: publicState?.version ?? 0,
    });
    beginPublishedRound();
  });

  elements.clear.addEventListener("click", () => {
    if (!canDraw()) return;
    clearDrawing();
    socket.emit("room:action", {
      roomId,
      type: "pictionary:clear",
      data: { version: publicState.version },
    });
  });

  elements.guessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const guess = elements.guessInput.value.trim();
    if (!guess || !canGuess()) return;
    elements.guessInput.value = "";
    if (isHost()) handleGuess(socket.id, guess);
    else sendDirect(knownHostId, "pictionary:guess", { guess, version: publicState.version });
  });

  elements.canvas.addEventListener("pointerdown", beginStroke);
  elements.canvas.addEventListener("pointermove", continueStroke);
  elements.canvas.addEventListener("pointerup", endStroke);
  elements.canvas.addEventListener("pointercancel", endStroke);
  elements.canvas.addEventListener("lostpointercapture", endStroke);
  elements.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}

function handleRoomReply(reply) {
  if (!reply?.ok) {
    elements.lobbyError.textContent = reply?.error?.message || "房间操作失败，请重试。";
    return;
  }
  roomId = reply.room.id;
  elements.roomId.textContent = roomId;
  elements.roomCode.value = "";
  showOnly(elements.room);
  handleRoomState(reply.room);
}

function handleRoomState(room) {
  if (!roomId || room.id !== roomId) return;
  const activeMembers = room.members.slice(0, 2);
  if (room.members.length > 2 && !activeMembers.some((member) => member.id === socket.id)) {
    socket.emit("room:leave", { roomId }, () => {});
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetGame();
    elements.lobbyError.textContent = "这个房间已经有两个人了。";
    showOnly(elements.lobby);
    return;
  }

  const previousIds = roomMembers.map((member) => member.id).join("|");
  const nextIds = activeMembers.map((member) => member.id).join("|");
  const nextHostId = activeMembers.find((member) => member.role === "host")?.id ?? null;
  const authorityChanged = Boolean(knownHostId && nextHostId !== knownHostId);
  roomMembers = activeMembers;
  knownHostId = nextHostId;

  if ((previousIds && previousIds !== nextIds) || authorityChanged) resetGame();
  render();
}

function handleRoomAction(action) {
  if (!roomId || action.roomId !== roomId) return;

  if (action.type === "pictionary:state") {
    if (action.senderId !== knownHostId) return;
    const accepted = acceptPublicState(publicState, action.data);
    if (accepted === publicState) return;
    publicState = accepted;
    secretWord = pendingAnswers.get(publicState.version) ?? "";
    pendingAnswers = new Map([...pendingAnswers].filter(([version]) => version >= publicState.version));
    if (publicState.phase === "playing") {
      resultInfo = null;
      elements.guessInput.value = "";
      elements.note.textContent = "";
    }
    render();
    return;
  }

  if (action.type === "pictionary:tick") {
    if (action.senderId !== knownHostId || action.data?.version !== publicState?.version) return;
    remainingSeconds = Math.max(0, Number(action.data?.seconds) || 0);
    renderTimer();
    return;
  }

  if (action.type === "pictionary:stroke") {
    if (action.senderId !== publicState?.drawerId || action.data?.version !== publicState?.version) return;
    const segment = normalizeSegment(action.data?.segment);
    if (!segment) return;
    segments.push(segment);
    drawSegment(segment);
    return;
  }

  if (action.type === "pictionary:clear") {
    if (action.senderId !== publicState?.drawerId || action.data?.version !== publicState?.version) return;
    clearDrawing();
    return;
  }

  if (action.type === "pictionary:result") {
    if (action.senderId !== knownHostId || action.data?.version !== publicState?.version) return;
    resultInfo = {
      answer: String(action.data?.answer ?? ""),
      correct: action.data?.reason === "correct",
    };
    secretWord = "";
    render();
  }
}

function handleDirectMessage(message) {
  if (!roomId || message.roomId !== roomId || message.senderId !== knownHostId && !isHost()) return;

  if (message.type === "pictionary:answer" && message.senderId === knownHostId) {
    const version = Number(message.data?.version);
    if (!Number.isInteger(version)) return;
    const answer = String(message.data?.answer ?? "");
    pendingAnswers.set(version, answer);
    if (publicState?.version === version && publicState.drawerId === socket.id) {
      secretWord = answer;
      render();
    }
    return;
  }

  if (message.type === "pictionary:guess" && isHost()) {
    handleGuess(message.senderId, String(message.data?.guess ?? ""), message.data?.version);
    return;
  }

  if (message.type === "pictionary:guess-result" && message.senderId === knownHostId) {
    if (message.data?.version !== publicState?.version || message.data?.correct !== false) return;
    elements.note.textContent = "还不对，再看看画面里的线索。";
  }
}

function beginPublishedRound() {
  clearDrawing();
  resultInfo = null;
  secretWord = "";
  elements.guessInput.value = "";
  elements.note.textContent = "";
  remainingSeconds = CONFIG.secondsPerRound;
  publishState();
  socket.emit("room:action", {
    roomId,
    type: "pictionary:clear",
    data: { version: hostState.version },
  });
  deliverAnswer();
  startHostTicker();
  render();
}

function publishState() {
  publicState = toPublicState(hostState);
  socket.emit("room:action", { roomId, type: "pictionary:state", data: publicState });
}

function deliverAnswer() {
  if (!hostState?.answer || !hostState.drawerId) return;
  if (hostState.drawerId === socket.id) secretWord = hostState.answer;
  else sendDirect(hostState.drawerId, "pictionary:answer", {
    answer: hostState.answer,
    version: hostState.version,
  });
}

function startHostTicker() {
  clearInterval(hostTicker);
  let lastSent = null;
  const tick = () => {
    if (!hostState || hostState.phase !== "playing") return;
    remainingSeconds = Math.max(0, Math.ceil((hostState.deadline - Date.now()) / 1000));
    if (remainingSeconds !== lastSent) {
      lastSent = remainingSeconds;
      socket.emit("room:action", {
        roomId,
        type: "pictionary:tick",
        data: { seconds: remainingSeconds, version: hostState.version },
      });
      renderTimer();
    }
    if (remainingSeconds === 0) settleRound("timeout");
  };
  tick();
  hostTicker = setInterval(tick, 250);
}

function handleGuess(senderId, guess, version = publicState?.version) {
  if (!isHost() || !hostState || hostState.phase !== "playing") return;
  if (version !== hostState.version || senderId === hostState.drawerId || !hostState.memberIds.includes(senderId)) return;
  const next = completeRound(hostState, { reason: "correct", guess });
  if (next === hostState) {
    if (senderId === socket.id) elements.note.textContent = "还不对，再看看画面里的线索。";
    else sendDirect(senderId, "pictionary:guess-result", { correct: false, version: hostState.version });
    return;
  }
  hostState = next;
  settleRound("correct");
}

function settleRound(reason) {
  if (!hostState || hostState.phase === "finished" || hostState.phase === "round-result" && reason === "timeout") return;
  if (hostState.phase === "playing") hostState = completeRound(hostState, { reason });
  if (hostState.phase !== "round-result") return;
  clearInterval(hostTicker);
  hostTicker = null;
  resultInfo = { answer: hostState.answer, correct: reason === "correct" };
  publishState();
  socket.emit("room:action", {
    roomId,
    type: "pictionary:result",
    data: { answer: resultInfo.answer, reason, version: hostState.version },
  });
  secretWord = "";
  render();
  roundAdvanceTimer = setTimeout(() => {
    if (!isHost() || hostState?.phase !== "round-result") return;
    hostState = advanceRound(hostState, Date.now());
    if (hostState.phase === "finished") {
      resultInfo = null;
      publishState();
      render();
    } else beginPublishedRound();
  }, 1800);
}

function sendDirect(targetId, type, data) {
  if (!targetId) return;
  socket.emit("room:direct", { roomId, targetId, type, data }, () => {});
}

function beginStroke(event) {
  if (!canDraw()) return;
  event.preventDefault();
  drawing = true;
  previousPoint = normalizedPoint(event);
  elements.canvas.setPointerCapture(event.pointerId);
}

function continueStroke(event) {
  if (!drawing || !canDraw()) return;
  event.preventDefault();
  const point = normalizedPoint(event);
  const segment = normalizeSegment({
    x1: previousPoint.x,
    y1: previousPoint.y,
    x2: point.x,
    y2: point.y,
  });
  previousPoint = point;
  if (!segment) return;
  segments.push(segment);
  drawSegment(segment);
  socket.emit("room:action", {
    roomId,
    type: "pictionary:stroke",
    data: { segment, version: publicState.version },
  });
}

function endStroke(event) {
  drawing = false;
  previousPoint = null;
  if (event?.pointerId !== undefined && elements.canvas.hasPointerCapture(event.pointerId)) {
    elements.canvas.releasePointerCapture(event.pointerId);
  }
}

function normalizedPoint(event) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

function resizeCanvas() {
  const rect = elements.canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (elements.canvas.width === width && elements.canvas.height === height) return;
  elements.canvas.width = width;
  elements.canvas.height = height;
  redraw();
}

function drawSegment(segment) {
  const context = elements.canvas.getContext("2d");
  context.strokeStyle = "#f8f2e6";
  context.lineWidth = Math.max(4, elements.canvas.width / 230);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(segment.x1 * elements.canvas.width, segment.y1 * elements.canvas.height);
  context.lineTo(segment.x2 * elements.canvas.width, segment.y2 * elements.canvas.height);
  context.stroke();
}

function redraw() {
  const context = elements.canvas.getContext("2d");
  context.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  segments.forEach(drawSegment);
}

function clearDrawing() {
  segments = [];
  redraw();
}

function resetGame() {
  clearHostTimers();
  publicState = null;
  hostState = null;
  secretWord = "";
  pendingAnswers = new Map();
  resultInfo = null;
  remainingSeconds = CONFIG.secondsPerRound;
  drawing = false;
  previousPoint = null;
  clearDrawing();
  render();
}

function clearHostTimers() {
  clearInterval(hostTicker);
  clearTimeout(roundAdvanceTimer);
  hostTicker = null;
  roundAdvanceTimer = null;
}

function isHost() {
  return socket?.id && socket.id === knownHostId;
}

function canDraw() {
  return publicState?.phase === "playing" && publicState.drawerId === socket?.id && Boolean(secretWord);
}

function canGuess() {
  return publicState?.phase === "playing" && publicState.drawerId !== socket?.id && roomMembers.length === 2;
}

function render() {
  if (!elements.room || elements.room.classList.contains("hidden")) return;
  const self = roomMembers.find((member) => member.id === socket.id);
  const partner = roomMembers.find((member) => member.id !== socket.id);
  elements.selfMember.textContent = self ? `你 · ${self.role === "host" ? "主机" : "同伴"}` : "你";
  elements.selfMember.classList.toggle("ready", Boolean(self));
  elements.partnerMember.textContent = partner ? "对方已加入" : "等待同伴";
  elements.partnerMember.classList.toggle("ready", Boolean(partner));
  elements.start.classList.toggle("hidden", !isHost());
  elements.start.disabled = roomMembers.length !== 2 || publicState?.phase === "playing" || publicState?.phase === "round-result";
  elements.start.textContent = publicState?.phase === "finished" ? "再来 4 回合" : "开始 4 回合";

  elements.score.textContent = String(publicState?.score ?? 0);
  elements.round.textContent = publicState ? `${Math.min(publicState.roundIndex + 1, CONFIG.rounds)} / ${CONFIG.rounds}` : `— / ${CONFIG.rounds}`;
  renderTimer();

  const phase = publicState?.phase ?? "waiting";
  const drawer = publicState?.drawerId === socket.id;
  const copy = phaseCopy(phase, drawer);
  elements.role.textContent = copy.role;
  elements.status.textContent = copy.status;
  if (!elements.note.textContent || phase !== "playing") elements.note.textContent = copy.note;

  elements.secretCard.classList.toggle("hidden", !drawer || phase !== "playing");
  elements.secretWord.textContent = secretWord || "题目传送中…";
  elements.guessForm.classList.toggle("hidden", drawer || phase !== "playing");
  elements.clear.disabled = !canDraw();
  elements.canvas.classList.toggle("drawable", canDraw());
  elements.canvasEmpty.classList.toggle("hidden", phase === "playing" || segments.length > 0);
}

function renderTimer() {
  elements.timer.textContent = `${publicState?.phase === "playing" ? remainingSeconds : CONFIG.secondsPerRound}s`;
}

function phaseCopy(phase, drawer) {
  if (phase === "playing") {
    return drawer
      ? { role: "你来画", status: "用线条把秘密题目画出来。", note: "对方提交正确答案后会自动结算。" }
      : { role: "你来猜", status: "观察对方传来的每一笔。", note: "可以反复提交，错误答案不会扣分。" };
  }
  if (phase === "round-result" && resultInfo) {
    return {
      role: resultInfo.correct ? "猜中了" : "时间到",
      status: `答案是「${resultInfo.answer}」`,
      note: "下一回合马上交换角色。",
    };
  }
  if (phase === "finished") {
    return { role: "完成", status: `四回合结束，共同猜中 ${publicState.score} 题。`, note: "主机可以发起新比赛。" };
  }
  return roomMembers.length === 2
    ? { role: "准备好了", status: isHost() ? "点击开始，秘密题目就会出现。" : "等待主机开始比赛。", note: "每轮自动交换画家和猜词者。" }
    : { role: "等待开始", status: "两个人到齐后，由主机开始比赛。", note: "每轮自动交换画家和猜词者。" };
}

function showOffline(message) {
  elements.connection.classList.remove("online");
  elements.connectionText.textContent = message;
  showOnly(elements.offline);
}

function showOnly(target) {
  [elements.offline, elements.lobby, elements.room].forEach((section) => {
    section.classList.toggle("hidden", section !== target);
  });
}

window.addEventListener("beforeunload", () => {
  clearHostTimers();
  if (roomId && socket?.connected) socket.emit("room:leave", { roomId });
});
