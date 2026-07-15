import {
  beginNextRound,
  restartMatch,
  revealRound,
  startMatch,
} from "./logic.js";
import {
  acceptHostState,
  isHostStateEnvelope,
  reconcileMembership,
  SEALED_NAMESPACE,
  validateSealedResult,
} from "./protocol.js";

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
  copyRoom: document.querySelector("#copy-room"),
  roundLabel: document.querySelector("#round-label"),
  scoreOne: document.querySelector("#score-one"),
  scoreTwo: document.querySelector("#score-two"),
  sealOne: document.querySelector("#seal-one"),
  sealTwo: document.querySelector("#seal-two"),
  playerOneLabel: document.querySelector("#player-one-label"),
  playerTwoLabel: document.querySelector("#player-two-label"),
  playerOneStatus: document.querySelector("#player-one-status"),
  playerTwoStatus: document.querySelector("#player-two-status"),
  gameTitle: document.querySelector("#game-status-title"),
  gameStatus: document.querySelector("#game-status"),
  hostAction: document.querySelector("#host-action"),
  choices: [...document.querySelectorAll(".choice")],
  submitChoice: document.querySelector("#submit-choice"),
  choiceStatus: document.querySelector("#choice-status"),
};

const choiceLabels = Object.freeze({ rock: "石头", scissors: "剪刀", paper: "布" });
const choiceMarks = Object.freeze({ rock: "石", scissors: "剪", paper: "布" });

let socket = null;
let roomId = null;
let roomMembers = [];
let knownHostId = null;
let publicState = null;
let hostState = null;
let selectedChoice = null;
let pendingChoice = null;
let submitted = false;
let verifiedResult = null;
let pendingHostMessage = null;
let roundSerial = 0;

if (typeof window.io !== "function") {
  showOffline("等待本机裁判");
} else {
  socket = window.io();
  bindSocket();
  bindControls();
}

function bindSocket() {
  socket.on("connect", () => {
    elements.connection.classList.add("online");
    elements.connectionText.textContent = "已连接本机裁判";
    if (!roomId) showOnly(elements.lobby);
  });
  socket.on("connect_error", () => showOffline("正在重连本机裁判"));
  socket.on("disconnect", () => {
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetMatch();
    showOffline("正在重连本机裁判");
  });
  socket.on("room:state", handleRoomState);
  socket.on("room:direct", handleDirectMessage);
  socket.on("room:sealed-result", handleSealedResult);
}

function bindControls() {
  elements.create.addEventListener("click", () => {
    elements.create.disabled = true;
    elements.lobbyError.textContent = "";
    socket.emit("room:create", { name: "玩家一" }, (reply) => {
      elements.create.disabled = false;
      handleRoomReply(reply);
    });
  });

  elements.joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.lobbyError.textContent = "";
    socket.emit("room:join", {
      roomId: elements.roomCode.value.trim().toUpperCase(),
      name: "玩家二",
    }, handleRoomReply);
  });

  elements.copyRoom.addEventListener("click", copyRoomCode);
  elements.hostAction.addEventListener("click", advanceHostMatch);
  for (const button of elements.choices) {
    button.addEventListener("click", () => {
      if (!canChoose()) return;
      selectedChoice = button.dataset.choice;
      render();
    });
  }
  elements.submitChoice.addEventListener("click", submitSealedChoice);
}

function handleRoomReply(reply) {
  if (!reply?.ok) {
    elements.lobbyError.textContent = reply?.error?.message || "加入房间失败。";
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
  const membership = reconcileMembership({
    previousMembers: roomMembers,
    incomingMembers: room.members,
    knownHostId,
    selfId: socket.id,
  });
  if (membership.shouldExit) {
    const leavingRoom = roomId;
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetMatch();
    socket.emit("room:leave", { roomId: leavingRoom }, () => {});
    elements.lobbyError.textContent = "房间已有玩家一和玩家二。";
    showOnly(elements.lobby);
    return;
  }

  roomMembers = membership.activeMembers;
  knownHostId = membership.nextHostId;
  if (membership.shouldReset) resetMatch();
  render();
}

function handleDirectMessage(message) {
  const authorizedEnvelope = isHostStateEnvelope({ roomId, knownHostId, message });
  const accepted = acceptHostState({
    roomId,
    knownHostId,
    currentState: publicState,
    memberIds: memberIds(),
    verifiedResult,
    action: message,
  });
  if (accepted === publicState) {
    if (
      authorizedEnvelope
      && publicState?.phase === "choosing"
      && ["revealed", "finished"].includes(message?.data?.phase)
      && message?.data?.roundId === publicState.roundId
    ) {
      pendingHostMessage = message;
    }
    return;
  }
  acceptRemoteState(accepted);
}

function handleSealedResult(message) {
  const state = isHost() ? hostState : publicState;
  const normalized = validateSealedResult({ roomId, memberIds: memberIds(), state, message });
  if (!normalized) return;
  verifiedResult = normalized;

  if (isHost()) {
    const next = revealRound(hostState, normalized);
    if (next === hostState) return;
    hostState = next;
    publicState = next;
    clearPrivateChoice();
    publishHostState();
    render();
    return;
  }

  if (pendingHostMessage) {
    const messageToRetry = pendingHostMessage;
    pendingHostMessage = null;
    handleDirectMessage(messageToRetry);
  }
}

function advanceHostMatch() {
  if (!isHost() || roomMembers.length !== 2) return;
  if (!hostState) {
    hostState = startMatch({ memberIds: memberIds(), roundId: nextRoundId() });
  } else if (hostState.phase === "revealed") {
    hostState = beginNextRound(hostState, nextRoundId());
  } else if (hostState.phase === "finished") {
    hostState = restartMatch(hostState, nextRoundId());
  } else {
    return;
  }
  publicState = hostState;
  clearPrivateChoice();
  verifiedResult = null;
  pendingHostMessage = null;
  publishHostState();
  render();
}

function submitSealedChoice() {
  if (!canChoose() || !selectedChoice) return;
  pendingChoice = selectedChoice;
  submitted = true;
  render();

  socket.emit("room:sealed-submit", {
    roomId,
    namespace: SEALED_NAMESPACE,
    roundId: publicState.roundId,
    data: { choice: pendingChoice },
  }, (reply) => {
    if (reply?.ok) return;
    if (reply?.error?.code !== "SEALED_ALREADY_SUBMITTED") {
      submitted = false;
      pendingChoice = null;
    }
    renderChoiceControls();
    elements.choiceStatus.textContent = reply?.error?.message || "密封失败。";
  });
}

function publishHostState() {
  const targetId = hostState?.memberIds.find((memberId) => memberId !== socket.id);
  if (!targetId) return;
  socket.emit("room:direct", {
    roomId,
    targetId,
    type: "sealed-rps:state",
    data: hostState,
  }, (reply) => {
    if (!reply?.ok) elements.gameStatus.textContent = reply?.error?.message || "等待本机裁判。";
  });
}

function acceptRemoteState(state) {
  const previousRoundId = publicState?.roundId;
  publicState = state;
  if (state.phase === "choosing" && state.roundId !== previousRoundId) clearPrivateChoice();
  if (state.phase !== "choosing") clearPrivateChoice();
  verifiedResult = null;
  pendingHostMessage = null;
  render();
}

function render() {
  const ids = memberIds();
  const selfIndex = ids.indexOf(socket?.id);
  const ready = ids.length === 2;
  elements.playerOneLabel.textContent = selfIndex === 0 ? "玩家一（你）" : "玩家一";
  elements.playerTwoLabel.textContent = selfIndex === 1 ? "玩家二（你）" : "玩家二";
  elements.scoreOne.textContent = String(publicState?.scores?.[ids[0]] ?? 0);
  elements.scoreTwo.textContent = String(publicState?.scores?.[ids[1]] ?? 0);
  elements.roundLabel.textContent = publicState ? `三局两胜 · 第 ${publicState.roundNumber} 轮` : "三局两胜";

  renderSeals(ready, selfIndex);
  renderStatus(ready);
  renderChoiceControls();
}

function renderSeals(ready, selfIndex) {
  const players = [
    { seal: elements.sealOne, status: elements.playerOneStatus },
    { seal: elements.sealTwo, status: elements.playerTwoStatus },
  ];
  const revealed = ["revealed", "finished"].includes(publicState?.phase);
  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    const memberId = publicState?.memberIds[index];
    const submission = revealed
      ? publicState.lastResult?.submissions.find((item) => item.memberId === memberId)
      : null;
    player.seal.textContent = submission ? choiceMarks[submission.choice] : "封";
    if (!ready) player.status.textContent = index === 0 && roomMembers.length ? "已就绪" : "等待";
    else if (submission) player.status.textContent = choiceLabels[submission.choice];
    else if (index === selfIndex && submitted) player.status.textContent = "已密封";
    else if (publicState?.phase === "choosing") player.status.textContent = "等待揭晓";
    else player.status.textContent = "已就绪";
  }
}

function renderStatus(ready) {
  const canHostAdvance = isHost() && ready && (!hostState || ["revealed", "finished"].includes(hostState.phase));
  elements.hostAction.classList.toggle("hidden", !canHostAdvance);

  if (!ready) {
    elements.gameTitle.textContent = "等待玩家二";
    elements.gameStatus.textContent = "等待双方进入房间。";
  } else if (!publicState) {
    elements.gameTitle.textContent = isHost() ? "开始对局" : "等待开始";
    elements.gameStatus.textContent = "三局两胜。";
  } else if (publicState.phase === "choosing") {
    elements.gameTitle.textContent = submitted ? "密封中：选择已隐藏" : "请选择你的出拳";
    elements.gameStatus.textContent = "等待双方密封后同时揭晓。";
  } else {
    const winnerId = publicState.lastResult?.winnerId;
    const winnerIndex = publicState.memberIds.indexOf(winnerId);
    const firstChoice = publicState.lastResult?.submissions.find((item) => item.memberId === publicState.memberIds[0])?.choice;
    const secondChoice = publicState.lastResult?.submissions.find((item) => item.memberId === publicState.memberIds[1])?.choice;
    const revealText = `玩家一出${choiceLabels[firstChoice]}，玩家二出${choiceLabels[secondChoice]}。`;
    if (publicState.phase === "finished") {
      elements.gameTitle.textContent = winnerIndex === 0 ? "玩家一获胜" : "玩家二获胜";
      elements.gameStatus.textContent = `${revealText}${winnerIndex === 0 ? "玩家一" : "玩家二"}胜，三局两胜。`;
    } else {
      elements.gameTitle.textContent = "结果已揭晓";
      elements.gameStatus.textContent = `${revealText}${winnerId ? `${winnerIndex === 0 ? "玩家一" : "玩家二"}胜。` : "平局。"}`;
    }
  }

  if (!hostState) elements.hostAction.textContent = "开始对局";
  else if (hostState.phase === "revealed") elements.hostAction.textContent = "下一轮";
  else elements.hostAction.textContent = "再来一局";
}

function renderChoiceControls() {
  const enabled = canChoose();
  for (const button of elements.choices) {
    button.disabled = !enabled;
    button.classList.toggle("selected", button.dataset.choice === selectedChoice);
    button.setAttribute("aria-pressed", String(button.dataset.choice === selectedChoice));
  }
  elements.submitChoice.disabled = !enabled || !selectedChoice;
  if (submitted) elements.choiceStatus.textContent = `已密封：${choiceLabels[pendingChoice]}。等待揭晓。`;
  else if (publicState?.phase === "choosing") elements.choiceStatus.textContent = "请选择石头、剪刀或布。";
  else if (["revealed", "finished"].includes(publicState?.phase)) elements.choiceStatus.textContent = "结果已揭晓。";
  else elements.choiceStatus.textContent = "等待开始。";
}

function canChoose() {
  return Boolean(
    socket?.id
    && publicState?.phase === "choosing"
    && publicState.memberIds.includes(socket.id)
    && !submitted,
  );
}

function clearPrivateChoice() {
  selectedChoice = null;
  pendingChoice = null;
  submitted = false;
}

function resetMatch() {
  publicState = null;
  hostState = null;
  verifiedResult = null;
  pendingHostMessage = null;
  clearPrivateChoice();
}

function memberIds() {
  return roomMembers.map((member) => member.id);
}

function isHost() {
  return Boolean(socket?.id && socket.id === knownHostId);
}

function nextRoundId() {
  roundSerial += 1;
  return `rps-${Date.now().toString(36)}-${roundSerial.toString(36)}`;
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
  window.setTimeout(() => { elements.copyRoom.textContent = "复制"; }, 1200);
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
  if (roomId && socket?.connected) socket.emit("room:leave", { roomId });
});
