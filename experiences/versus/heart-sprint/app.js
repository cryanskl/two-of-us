import {
  TARGET_PROGRESS,
  advanceCountdown,
  applyTap,
  createWaitingState,
  restartMatch,
  startCountdown,
  startNextRound,
} from "./logic.js";
import {
  acceptHostState,
  reconcileMembership,
  validateTapMessage,
} from "./protocol.js";

const STATE_MESSAGE_TYPE = "heart-sprint:state";
const TAP_MESSAGE_TYPE = "heart-sprint:tap";
const SYNC_REQUEST_TYPE = "heart-sprint:sync-request";

const elements = {
  connection: document.querySelector(".connection"),
  connectionText: document.querySelector("#connection-text"),
  offline: document.querySelector("#offline"),
  lobby: document.querySelector("#lobby"),
  room: document.querySelector("#room"),
  createForm: document.querySelector("#create-form"),
  createName: document.querySelector("#create-name"),
  createRoom: document.querySelector("#create-room"),
  joinForm: document.querySelector("#join-form"),
  joinName: document.querySelector("#join-name"),
  roomCode: document.querySelector("#room-code"),
  lobbyError: document.querySelector("#lobby-error"),
  roomId: document.querySelector("#room-id"),
  copyRoom: document.querySelector("#copy-room"),
  roundLabel: document.querySelector("#round-label"),
  scoreOne: document.querySelector("#score-one"),
  scoreTwo: document.querySelector("#score-two"),
  playerOneName: document.querySelector("#player-one-name"),
  playerTwoName: document.querySelector("#player-two-name"),
  laneOneName: document.querySelector("#lane-one-name"),
  laneTwoName: document.querySelector("#lane-two-name"),
  playerOneStatus: document.querySelector("#player-one-status"),
  playerTwoStatus: document.querySelector("#player-two-status"),
  presenceDots: [...document.querySelectorAll(".presence-dot")],
  membersStatus: document.querySelector("#members-status"),
  laneOne: document.querySelector("#lane-one"),
  laneTwo: document.querySelector("#lane-two"),
  progressOne: document.querySelector("#progress-one"),
  progressTwo: document.querySelector("#progress-two"),
  gameStatusTitle: document.querySelector("#game-status-title"),
  gameStatus: document.querySelector("#game-status"),
  countdown: document.querySelector("#countdown"),
  hostAction: document.querySelector("#host-action"),
  tapButton: document.querySelector("#tap-button"),
  tapButtonLabel: document.querySelector("#tap-button-label"),
  tapHint: document.querySelector("#tap-hint"),
  roleStatus: document.querySelector("#role-status"),
};

let socket = null;
let roomId = null;
let roomMembers = [];
let knownHostId = null;
let publicState = null;
let localInputSeq = 0;
let countdownGeneration = 0;

if (typeof window.io !== "function") {
  showOffline("请从本地启动器打开心跳冲刺");
} else {
  socket = window.io();
  bindSocket();
  bindControls();
}

function bindSocket() {
  socket.on("connect", () => {
    elements.connection.classList.add("online");
    elements.connectionText.textContent = "已连接本机房间";
    if (!roomId) showOnly(elements.lobby);
  });

  socket.on("connect_error", () => showOffline("正在重连本机房间"));

  socket.on("disconnect", () => {
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetLocalMatch();
    showOffline("连接已断开，正在等待本地服务恢复");
  });

  socket.on("room:state", handleRoomState);
  socket.on("room:action", handleRoomAction);
}

function bindControls() {
  elements.createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.createRoom.disabled = true;
    elements.lobbyError.textContent = "";
    socket.emit("room:create", { name: elements.createName.value }, (reply) => {
      elements.createRoom.disabled = false;
      handleRoomReply(reply);
    });
  });

  elements.joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.lobbyError.textContent = "";
    socket.emit("room:join", {
      roomId: elements.roomCode.value.trim().toUpperCase(),
      name: elements.joinName.value,
    }, handleRoomReply);
  });

  elements.roomCode.addEventListener("input", () => {
    elements.roomCode.value = elements.roomCode.value.toUpperCase();
  });

  elements.copyRoom.addEventListener("click", copyRoomCode);
  elements.hostAction.addEventListener("click", advanceHostMatch);
  elements.tapButton.addEventListener("click", submitTap);
}

function handleRoomReply(reply) {
  if (!reply?.ok) {
    elements.lobbyError.textContent = reply?.error?.message || "房间操作失败，请重试。";
    return;
  }

  roomId = reply.room.id;
  elements.roomCode.value = "";
  showOnly(elements.room);
  handleRoomState(reply.room);
}

function handleRoomState(room) {
  if (!roomId || room.id !== roomId) return;
  const membership = reconcileMembership({
    previousMembers: roomMembers,
    incomingMembers: room.members,
    knownHostId,
    selfId: socket.id,
  });

  if (membership.shouldExit) {
    exitFullRoom();
    return;
  }

  roomMembers = membership.activeMembers;
  knownHostId = membership.nextHostId;

  if (membership.shouldReset || roomMembers.length !== 2) {
    resetLocalMatch();
    if (isHost() && roomMembers.length === 2) {
      publicState = createWaitingState({ memberIds: memberIds() });
      publishHostState();
    }
  }

  if (!isHost() && roomMembers.length === 2 && !publicState) requestHostState();

  render();
}

function handleRoomAction(action) {
  if (!roomId || action?.roomId !== roomId) return;

  if (action.type === SYNC_REQUEST_TYPE && isHost()) {
    if (memberIds().includes(action.senderId) && action.senderId !== socket.id) publishHostState();
    return;
  }

  if (action.type === TAP_MESSAGE_TYPE && isHost()) {
    const tap = validateTapMessage({
      roomId,
      knownHostId,
      selfId: socket.id,
      memberIds: memberIds(),
      message: action,
    });
    if (!tap || !publicState) return;
    const next = applyTap(publicState, { ...tap, acceptedAt: performance.now() });
    if (next === publicState) return;
    publicState = next;
    publishHostState();
    render();
    return;
  }

  if (action.type !== STATE_MESSAGE_TYPE || isHost()) return;
  const next = acceptHostState({
    roomId,
    knownHostId,
    currentState: publicState,
    memberIds: memberIds(),
    action,
  });
  if (next === publicState) return;

  const restarted = publicState?.phase === "match-ended"
    && next.phase === "countdown"
    && next.roundNumber === 1
    && next.scores[next.memberIds[0]] === 0
    && next.scores[next.memberIds[1]] === 0;
  publicState = next;
  if (restarted) localInputSeq = 0;
  render();
}

function advanceHostMatch() {
  if (!isHost() || roomMembers.length !== 2) return;

  let next = publicState;
  if (!next) {
    next = createWaitingState({ memberIds: memberIds() });
  }

  if (next.phase === "waiting") {
    next = startCountdown(next);
  } else if (next.phase === "round-ended") {
    next = startNextRound(next);
  } else if (next.phase === "match-ended") {
    next = restartMatch(next);
    localInputSeq = 0;
  } else {
    return;
  }

  if (next === publicState) return;
  publicState = next;
  publishHostState();
  render();
  if (publicState.phase === "countdown") scheduleCountdown();
}

function scheduleCountdown() {
  const generation = ++countdownGeneration;
  const expectedRoom = roomId;
  const expectedMembers = memberIds().join("|");

  window.setTimeout(() => {
    if (generation !== countdownGeneration || !isHost() || roomId !== expectedRoom) return;
    if (memberIds().join("|") !== expectedMembers || publicState?.phase !== "countdown") return;
    const next = advanceCountdown(publicState);
    if (next === publicState) return;
    publicState = next;
    publishHostState();
    render();
    if (publicState.phase === "countdown") scheduleCountdown();
  }, 1000);
}

function submitTap() {
  if (!canTap()) return;
  localInputSeq += 1;
  pulseTapButton();

  if (isHost()) {
    const next = applyTap(publicState, {
      senderId: socket.id,
      inputSeq: localInputSeq,
      acceptedAt: performance.now(),
    });
    if (next !== publicState) {
      publicState = next;
      publishHostState();
      render();
    }
    return;
  }

  socket.emit("room:action", {
    roomId,
    type: TAP_MESSAGE_TYPE,
    data: { inputSeq: localInputSeq },
  }, (reply) => {
    if (!reply?.ok) elements.gameStatus.textContent = reply?.error?.message || "这次点击没有送达主机。";
  });
}

function publishHostState() {
  if (!isHost() || !roomId || !publicState) return;
  socket.emit("room:action", {
    roomId,
    type: STATE_MESSAGE_TYPE,
    data: publicState,
  }, (reply) => {
    if (!reply?.ok) elements.gameStatus.textContent = reply?.error?.message || "比赛状态没有同步成功。";
  });
}

function requestHostState() {
  socket.emit("room:action", {
    roomId,
    type: SYNC_REQUEST_TYPE,
    data: null,
  }, (reply) => {
    if (!reply?.ok) elements.gameStatus.textContent = reply?.error?.message || "暂时无法取得比赛状态。";
  });
}

function render() {
  elements.roomId.textContent = roomId || "-----";
  const one = roomMembers[0] ?? null;
  const two = roomMembers[1] ?? null;
  const ids = memberIds();
  const selfSeat = socket?.id === one?.id ? "one" : socket?.id === two?.id ? "two" : "none";
  const phase = publicState?.phase ?? "waiting";
  const ready = roomMembers.length === 2;

  elements.room.dataset.phase = phase;
  elements.room.dataset.selfSeat = selfSeat;
  elements.playerOneName.textContent = one?.name || "第一位";
  elements.playerTwoName.textContent = two?.name || "等待加入";
  elements.laneOneName.textContent = one?.name || "第一位";
  elements.laneTwoName.textContent = two?.name || "等待加入";
  elements.playerOneStatus.textContent = one ? (one.id === socket.id ? "你" : "在线") : "空席";
  elements.playerTwoStatus.textContent = two ? (two.id === socket.id ? "你" : "在线") : "空席";
  elements.presenceDots[0]?.classList.toggle("online", Boolean(one));
  elements.presenceDots[1]?.classList.toggle("online", Boolean(two));
  elements.membersStatus.textContent = ready ? "两个人都在线" : "等待第二个人";
  elements.roleStatus.textContent = !ready
    ? "等待另一位加入"
    : isHost() ? "你是本局主机 · 两个人都在线" : "两个人都在线";

  const scoreOne = publicState?.scores?.[ids[0]] ?? 0;
  const scoreTwo = publicState?.scores?.[ids[1]] ?? 0;
  const progressOne = publicState?.progress?.[ids[0]] ?? 0;
  const progressTwo = publicState?.progress?.[ids[1]] ?? 0;
  elements.scoreOne.textContent = String(scoreOne);
  elements.scoreTwo.textContent = String(scoreTwo);
  elements.roundLabel.textContent = `第 ${publicState?.roundNumber ?? 1} 局`;
  renderLane(elements.laneOne, elements.progressOne, progressOne);
  renderLane(elements.laneTwo, elements.progressTwo, progressTwo);
  renderMatchCopy({ phase, ready, selfId: socket?.id });
  renderHostAction({ phase, ready });

  elements.tapButton.disabled = !canTap();
  elements.tapButtonLabel.textContent = phase === "racing" ? "为我加速" : buttonIdleLabel(phase, ready);
  elements.tapHint.textContent = phase === "racing"
    ? "连续点击，让你的心跳先抵达终点"
    : phase === "countdown" ? "倒数结束后再开始点击" : "两个人准备好后，由主机开始比赛";
}

function renderLane(lane, progressElement, value) {
  const progress = Math.max(0, Math.min(TARGET_PROGRESS, Number(value) || 0));
  const percent = `${(progress / TARGET_PROGRESS) * 100}%`;
  lane.style.setProperty("--progress", percent);
  lane.setAttribute("aria-valuenow", String(progress));
  lane.setAttribute("aria-valuemax", String(TARGET_PROGRESS));
  progressElement.textContent = `${progress} / ${TARGET_PROGRESS}`;
}

function renderMatchCopy({ phase, ready, selfId }) {
  elements.countdown.textContent = phase === "countdown" ? String(publicState.countdown) : "";
  elements.countdown.setAttribute("aria-hidden", String(phase !== "countdown"));

  if (!ready) {
    elements.gameStatusTitle.textContent = "等待另一位加入";
    elements.gameStatus.textContent = "把房间码告诉对方，两个人到齐后就可以开始。";
    return;
  }
  if (phase === "waiting") {
    elements.gameStatusTitle.textContent = isHost() ? "可以开始了" : "等待主机开始";
    elements.gameStatus.textContent = "三秒倒数后，连续点击自己的按钮冲向终点。";
  } else if (phase === "countdown") {
    elements.gameStatusTitle.textContent = "准备";
    elements.gameStatus.textContent = "倒数结束前的点击不会计入比赛。";
  } else if (phase === "racing") {
    elements.gameStatusTitle.textContent = "冲向终点";
    elements.gameStatus.textContent = "先完成 30 次有效点击的人赢下这一局。";
  } else if (phase === "round-ended") {
    elements.gameStatusTitle.textContent = publicState.roundWinnerId === selfId ? "这一局是你" : "这一局是 TA";
    elements.gameStatus.textContent = isHost() ? "点击下一局，再比一次。" : "等待主机开启下一局。";
  } else if (phase === "match-ended") {
    elements.gameStatusTitle.textContent = publicState.matchWinnerId === selfId ? "你先抵达了两次" : "TA 先抵达了两次";
    elements.gameStatus.textContent = isHost() ? "整场完成，要不要再来一场？" : "整场完成，等待主机选择。";
  }
}

function renderHostAction({ phase, ready }) {
  const visible = isHost() && ready && ["waiting", "round-ended", "match-ended"].includes(phase);
  elements.hostAction.classList.toggle("hidden", !visible);
  elements.hostAction.disabled = !visible;
  if (!visible) return;
  elements.hostAction.textContent = phase === "waiting"
    ? "开始比赛" : phase === "round-ended" ? "下一局" : "再来一场";
}

function buttonIdleLabel(phase, ready) {
  if (!ready) return "等待另一位";
  if (phase === "countdown") return "准备";
  if (phase === "round-ended") return "本局结束";
  if (phase === "match-ended") return "比赛完成";
  return "等待开始";
}

function canTap() {
  return Boolean(
    socket?.connected
    && publicState?.phase === "racing"
    && publicState.memberIds.includes(socket.id),
  );
}

function pulseTapButton() {
  elements.tapButton.classList.remove("tapped");
  void elements.tapButton.offsetWidth;
  elements.tapButton.classList.add("tapped");
  window.setTimeout(() => elements.tapButton.classList.remove("tapped"), 100);
}

async function copyRoomCode() {
  if (!roomId) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(roomId);
    copied = true;
  } catch {
    const field = document.createElement("textarea");
    field.value = roomId;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    copied = document.execCommand("copy");
    field.remove();
  }
  elements.copyRoom.textContent = copied ? "已复制" : roomId;
  window.setTimeout(() => { elements.copyRoom.textContent = "复制房间码"; }, 1200);
}

function memberIds() {
  return roomMembers.map((member) => member.id);
}

function isHost() {
  return Boolean(socket?.id && socket.id === knownHostId);
}

function resetLocalMatch() {
  countdownGeneration += 1;
  publicState = null;
  localInputSeq = 0;
}

function exitFullRoom() {
  const leavingRoom = roomId;
  roomId = null;
  roomMembers = [];
  knownHostId = null;
  resetLocalMatch();
  if (leavingRoom) socket.emit("room:leave", { roomId: leavingRoom }, () => {});
  elements.lobbyError.textContent = "这个房间已经有两个人了。";
  showOnly(elements.lobby);
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
  countdownGeneration += 1;
  if (roomId && socket?.connected) socket.emit("room:leave", { roomId });
});
