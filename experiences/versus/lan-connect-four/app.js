import {
  applyMove,
  COLUMNS,
  getColumnCount,
  ROWS,
  startMatch,
} from "./logic.js";
import {
  acceptHostState,
  isAuthorizedMoveMessage,
  reconcileMembership,
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
  selfMember: document.querySelector("#self-member"),
  partnerMember: document.querySelector("#partner-member"),
  identity: document.querySelector("#identity"),
  title: document.querySelector("#game-title"),
  status: document.querySelector("#game-status"),
  start: document.querySelector("#start-game"),
  board: document.querySelector("#board"),
  boardSummary: document.querySelector("#board-summary"),
};

let socket = null;
let roomId = null;
let roomMembers = [];
let knownHostId = null;
let publicState = null;
let hostState = null;
let previousBoard = [];
const columnButtons = [];

createBoard();

if (typeof window.io !== "function") {
  showOffline("没有连接到本地运行时");
} else {
  socket = window.io();
  bindSocket();
  bindControls();
}

function createBoard() {
  for (let column = 0; column < COLUMNS; column += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "column";
    button.dataset.column = String(column);
    for (let row = 0; row < ROWS; row += 1) {
      const slot = document.createElement("span");
      slot.className = "slot";
      slot.dataset.index = String(row * COLUMNS + column);
      slot.setAttribute("aria-hidden", "true");
      button.append(slot);
    }
    button.addEventListener("click", () => requestMove(column));
    elements.board.append(button);
    columnButtons.push(button);
  }
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
    if (hostState && hostState.phase !== "finished") return;
    hostState = startMatch({
      memberIds: memberIds(),
      previousState: hostState,
      version: publicState?.version ?? 0,
    });
    publishState();
  });
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
  const membership = reconcileMembership({
    previousMembers: roomMembers,
    incomingMembers: room.members,
    knownHostId,
    selfId: socket.id,
  });
  if (membership.shouldExit) {
    socket.emit("room:leave", { roomId }, () => {});
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetGame();
    elements.lobbyError.textContent = "这个房间已经有两个人了。";
    showOnly(elements.lobby);
    return;
  }

  roomMembers = membership.activeMembers;
  knownHostId = membership.nextHostId;
  if (membership.shouldReset) resetGame();
  render();
}

function handleRoomAction(action) {
  const accepted = acceptHostState({
    roomId,
    knownHostId,
    currentState: publicState,
    memberIds: memberIds(),
    action,
  });
  if (accepted === publicState) return;
  publicState = accepted;
  render();
}

function handleDirectMessage(message) {
  if (!isAuthorizedMoveMessage({
    roomId,
    knownHostId,
    selfId: socket?.id,
    memberIds: memberIds(),
    hostState,
    message,
  })) return;
  applyAuthoritativeMove(message.senderId, message.data?.column, message.data?.version);
}

function requestMove(column) {
  if (!publicState || publicState.phase !== "playing" || publicState.currentPlayerId !== socket.id) return;
  if (isHost()) {
    applyAuthoritativeMove(socket.id, column, publicState.version);
    return;
  }
  if (!knownHostId) return;
  socket.emit("room:direct", {
    roomId,
    targetId: knownHostId,
    type: "connect-four:move",
    data: { column, version: publicState.version },
  }, (reply) => {
    if (!reply?.ok) elements.status.textContent = reply?.error?.message || "这一步没有送达，请重试。";
  });
}

function applyAuthoritativeMove(playerId, column, version) {
  if (!isHost() || !hostState || version !== hostState.version) return;
  const next = applyMove(hostState, { playerId, column, version });
  if (next === hostState) return;
  hostState = next;
  publishState();
}

function publishState() {
  publicState = hostState;
  socket.emit("room:action", { roomId, type: "connect-four:state", data: publicState });
  render();
}

function render() {
  const self = roomMembers.find((member) => member.id === socket?.id);
  const partner = roomMembers.find((member) => member.id !== socket?.id);
  elements.selfMember.textContent = self ? `你 · ${self.role === "host" ? "主机" : "同伴"}` : "你";
  elements.selfMember.classList.toggle("ready", Boolean(self));
  elements.partnerMember.textContent = partner ? "对方已加入" : "等待对方";
  elements.partnerMember.classList.toggle("ready", Boolean(partner));

  const selfIndex = publicState?.memberIds.indexOf(socket?.id) ?? -1;
  const tokenName = selfIndex === 0 ? "莓红爱心 ♥" : selfIndex === 1 ? "薄荷星星 ✦" : "等待分配棋子";
  elements.identity.textContent = selfIndex >= 0 ? `你的棋子：${tokenName}` : tokenName;

  const ready = roomMembers.length === 2;
  const canStart = isHost() && ready && (!hostState || hostState.phase === "finished");
  elements.start.disabled = !canStart;
  elements.start.classList.toggle("hidden", !isHost());
  elements.start.textContent = hostState?.phase === "finished" ? "再来一局" : "开始对局";

  if (!ready) {
    elements.title.textContent = "等对方加入后开始";
    elements.status.textContent = "把房间码告诉对方，两个人到齐后由主机开始。";
  } else if (!publicState) {
    elements.title.textContent = isHost() ? "两个人都到了" : "等待主机开始";
    elements.status.textContent = isHost() ? "点击“开始对局”，第一局由你先手。" : "主机开始后，双方棋盘会同时出现。";
  } else if (publicState.phase === "playing") {
    const selfTurn = publicState.currentPlayerId === socket.id;
    elements.title.textContent = selfTurn ? "轮到你落子" : "轮到对方落子";
    elements.status.textContent = selfTurn ? "选择一列，棋子会落到最低空位。" : "对方正在选择落子位置。";
  } else if (publicState.winnerId) {
    const won = publicState.winnerId === socket.id;
    elements.title.textContent = won ? "你连成了四颗" : "对方连成了四颗";
    elements.status.textContent = won ? "这一局由你获胜。主机可以发起下一局。" : "这一局由对方获胜。主机可以发起下一局。";
  } else {
    elements.title.textContent = "棋盘填满，平局";
    elements.status.textContent = "这一局不分胜负。主机可以发起下一局。";
  }
  renderBoard();
}

function renderBoard() {
  const board = publicState?.board ?? Array(ROWS * COLUMNS).fill(null);
  const winning = new Set(publicState?.winningCells ?? []);
  const canMove = publicState?.phase === "playing" && publicState.currentPlayerId === socket?.id;

  const summaries = [];
  for (const button of columnButtons) {
    const column = Number(button.dataset.column);
    const count = getColumnCount(board, column);
    const cells = [];
    for (let row = 0; row < ROWS; row += 1) {
      const memberId = board[row * COLUMNS + column];
      const memberIndex = publicState?.memberIds.indexOf(memberId) ?? -1;
      cells.push(memberIndex === 0 ? "莓红爱心" : memberIndex === 1 ? "薄荷星星" : "空位");
    }
    button.disabled = !canMove || count === ROWS;
    button.setAttribute("aria-label", `第 ${column + 1} 列，从上到下：${cells.join("、")}。剩余 ${ROWS - count} 个空位${button.disabled ? "" : "，点击在此列落子"}`);
    summaries.push(`第 ${column + 1} 列：${cells.join("、")}`);
    for (const slot of button.children) {
      const index = Number(slot.dataset.index);
      const memberId = board[index];
      const memberIndex = publicState?.memberIds.indexOf(memberId) ?? -1;
      slot.className = "slot";
      slot.textContent = "";
      if (memberIndex === 0) {
        slot.classList.add("rose");
        slot.textContent = "♥";
      } else if (memberIndex === 1) {
        slot.classList.add("mint");
        slot.textContent = "✦";
      }
      if (winning.has(index)) slot.classList.add("winning");
      if (memberId && previousBoard[index] === null) slot.classList.add("just-dropped");
    }
  }
  elements.boardSummary.textContent = `棋盘从左到右共七列。${summaries.join("；")}。`;
  previousBoard = [...board];
}

function resetGame() {
  publicState = null;
  hostState = null;
  previousBoard = [];
}

function memberIds() {
  return roomMembers.map((member) => member.id);
}

function isHost() {
  return Boolean(socket?.id && socket.id === knownHostId);
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
