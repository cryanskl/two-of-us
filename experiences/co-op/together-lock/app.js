import {
  acceptRemoteUnlock,
  advanceLock,
  createLockState,
  getChargeProgress,
  getLockPhase,
  resetLock,
  setMemberHold,
  syncMembers,
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
  lock: document.querySelector("#lock"),
  lockKicker: document.querySelector("#lock-kicker"),
  lockMessage: document.querySelector("#lock-message"),
  hold: document.querySelector("#hold-button"),
  holdStatus: document.querySelector("#hold-status"),
  progress: document.querySelector("#progress-fill"),
  reset: document.querySelector("#reset"),
};

let socket = null;
let roomId = null;
let roomMembers = [];
let lockState = createLockState();
let unlockBroadcast = false;
let animationId = null;

if (typeof window.io !== "function") {
  showOffline("没有连接到本地运行时");
} else {
  socket = window.io();
  bindSocket();
  bindControls();
  animate();
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
    lockState = createLockState();
    unlockBroadcast = false;
    showOffline("连接已断开，正在等待本地服务恢复");
  });

  socket.on("room:state", handleRoomState);
  socket.on("room:action", handleRoomAction);
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
    const code = elements.roomCode.value.trim().toUpperCase();
    elements.lobbyError.textContent = "";
    socket.emit("room:join", { roomId: code, name: "同伴" }, handleRoomReply);
  });

  const beginHold = (event) => {
    if (elements.hold.disabled || lockState.unlocked) return;
    event.preventDefault();
    if (event.pointerId !== undefined) elements.hold.setPointerCapture(event.pointerId);
    updateLocalHold(true);
  };
  const endHold = (event) => {
    if (event?.pointerId !== undefined && elements.hold.hasPointerCapture(event.pointerId)) {
      elements.hold.releasePointerCapture(event.pointerId);
    }
    updateLocalHold(false);
  };

  elements.hold.addEventListener("pointerdown", beginHold);
  elements.hold.addEventListener("pointerup", endHold);
  elements.hold.addEventListener("pointercancel", endHold);
  elements.hold.addEventListener("lostpointercapture", () => updateLocalHold(false));
  elements.hold.addEventListener("contextmenu", (event) => event.preventDefault());

  elements.reset.addEventListener("click", () => {
    if (!roomId) return;
    lockState = resetLock(lockState);
    unlockBroadcast = false;
    socket.emit("room:action", { roomId, type: "reset", data: null });
    render();
  });
}

function handleRoomReply(reply) {
  if (!reply?.ok) {
    elements.lobbyError.textContent = reply?.error?.message || "房间操作失败，请重试。";
    return;
  }
  enterRoom(reply.room);
}

function enterRoom(room) {
  roomId = room.id;
  elements.roomId.textContent = room.id;
  elements.roomCode.value = "";
  showOnly(elements.room);
  handleRoomState(room);
}

function handleRoomState(room) {
  if (!roomId || room.id !== roomId) return;
  roomMembers = room.members.slice(0, 2);
  const activeIds = roomMembers.map((member) => member.id);

  if (room.members.length > 2 && !activeIds.includes(socket.id)) {
    socket.emit("room:leave", { roomId }, () => {});
    roomId = null;
    elements.lobbyError.textContent = "这个房间已经有两个人了。";
    showOnly(elements.lobby);
    return;
  }

  lockState = syncMembers(lockState, activeIds);
  unlockBroadcast = lockState.unlocked;
  render();
}

function handleRoomAction(action) {
  if (!roomId || action.roomId !== roomId) return;
  const now = performance.now();
  if (action.type === "hold") {
    lockState = setMemberHold(lockState, action.senderId, action.data?.active === true, now);
  } else if (action.type === "unlock") {
    lockState = acceptRemoteUnlock(lockState);
    unlockBroadcast = lockState.unlocked;
  } else if (action.type === "reset") {
    lockState = resetLock(lockState);
    unlockBroadcast = false;
  }
  render();
}

function updateLocalHold(active) {
  if (!socket?.connected || !roomId || !lockState.memberIds.includes(socket.id)) return;
  const previous = lockState.holds[socket.id] === true;
  if (previous === active || lockState.unlocked) return;
  lockState = setMemberHold(lockState, socket.id, active, performance.now());
  socket.emit("room:action", { roomId, type: "hold", data: { active } });
  render();
}

function animate() {
  const now = performance.now();
  const advanced = advanceLock(lockState, now);
  if (advanced !== lockState) {
    lockState = advanced;
    if (lockState.unlocked && !unlockBroadcast && roomId) {
      unlockBroadcast = true;
      socket.emit("room:action", { roomId, type: "unlock", data: null });
    }
  }
  elements.progress.style.width = `${Math.round(getChargeProgress(lockState, now) * 100)}%`;
  renderPhase();
  animationId = window.requestAnimationFrame(animate);
}

function render() {
  const self = roomMembers.find((member) => member.id === socket.id);
  const partner = roomMembers.find((member) => member.id !== socket.id);
  elements.selfMember.textContent = self ? `你 · ${self.role === "host" ? "主机" : "同伴"}` : "你";
  elements.selfMember.classList.toggle("ready", Boolean(self));
  elements.partnerMember.textContent = partner ? "对方已加入" : "等待同伴";
  elements.partnerMember.classList.toggle("ready", Boolean(partner));

  const ready = lockState.memberIds.length === 2 && lockState.memberIds.includes(socket.id);
  elements.hold.disabled = !ready || lockState.unlocked;
  elements.hold.classList.toggle("active", lockState.holds[socket.id] === true);
  const partnerId = lockState.memberIds.find((memberId) => memberId !== socket.id);
  const selfStatus = lockState.holds[socket.id] ? "按住" : "未按住";
  const partnerStatus = partnerId && lockState.holds[partnerId] ? "按住" : "未按住";
  elements.holdStatus.textContent = `你：${selfStatus} · 对方：${partnerStatus}`;
  renderPhase();
}

function renderPhase() {
  const phase = getLockPhase(lockState);
  elements.lock.classList.toggle("unlocked", phase === "unlocked");
  elements.reset.classList.toggle("hidden", phase !== "unlocked");

  const copy = {
    waiting: ["等待另一位加入", "两个人都在房间里，机关才会出现"],
    connected: ["已经找到彼此", "请同时按住各自的心形按钮"],
    charging: ["不要松开", "两颗心正在一起打开机关"],
    unlocked: ["UNLOCKED", "成功了——这是你们一起完成的"],
  }[phase];
  elements.lockKicker.textContent = copy[0];
  elements.lockMessage.textContent = copy[1];
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
  window.cancelAnimationFrame(animationId);
  if (roomId && socket?.connected) socket.emit("room:leave", { roomId });
});
