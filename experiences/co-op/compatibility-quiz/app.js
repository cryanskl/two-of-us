import { getQuestion, QUESTION_IDS } from "./config.js";
import {
  beginNextQuestion,
  currentQuestionId,
  restartQuiz,
  revealAnswer,
  roundIdFor,
  startQuiz,
} from "./logic.js";
import {
  enqueueHostStateEnvelope,
  reconcileMembership,
  replayHostStateEnvelopes,
  SEALED_NAMESPACE,
  STATE_MESSAGE_TYPE,
  validateSealedResult,
} from "./protocol.js";

const elements = {
  connectionStatus: document.querySelector("#connection-status"),
  offline: document.querySelector("#offline"),
  lobby: document.querySelector("#lobby"),
  room: document.querySelector("#room"),
  create: document.querySelector("#create-room"),
  joinForm: document.querySelector("#join-form"),
  roomCode: document.querySelector("#room-code"),
  lobbyError: document.querySelector("#lobby-error"),
  roomId: document.querySelector("#room-id"),
  leaveRoom: document.querySelector("#leave-room"),
  waiting: document.querySelector("#waiting"),
  waitingTitle: document.querySelector("#waiting-title"),
  waitingStatus: document.querySelector("#waiting-status"),
  quiz: document.querySelector("#quiz"),
  progress: document.querySelector("#progress"),
  question: document.querySelector("#question-prompt"),
  duet: document.querySelector("#duet"),
  choices: [...document.querySelectorAll(".answer-choice")],
  partnerChoices: [...document.querySelectorAll(".partner-choice")],
  answerLabels: [...document.querySelectorAll("[data-answer-label]")],
  partnerLabels: [...document.querySelectorAll("[data-partner-label]")],
  selfState: document.querySelector("#self-state"),
  partnerState: document.querySelector("#partner-state"),
  submitAnswer: document.querySelector("#submit-answer"),
  hostAction: document.querySelector("#host-action"),
  quizStatus: document.querySelector("#quiz-status"),
};

let socket = null;
let roomId = null;
let roomMembers = [];
let knownHostId = null;
let publicState = null;
let hostState = null;
let selectedAnswer = null;
let pendingAnswer = null;
let submitted = false;
let verifiedResult = null;
let pendingHostMessages = [];
let quizSerial = 0;

if (typeof window.io !== "function") {
  showOffline("等待本机房间");
} else {
  socket = window.io();
  bindSocket();
  bindControls();
}

function bindSocket() {
  socket.on("connect", () => {
    elements.connectionStatus.textContent = "已连接本机房间";
    if (!roomId) showOnly(elements.lobby);
  });
  socket.on("connect_error", () => showOffline("正在重连本机房间"));
  socket.on("disconnect", () => {
    roomId = null;
    roomMembers = [];
    knownHostId = null;
    resetQuiz();
    showOffline("正在重连本机房间");
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

  elements.leaveRoom.addEventListener("click", leaveCurrentRoom);
  elements.hostAction.addEventListener("click", advanceHostQuiz);
  elements.submitAnswer.addEventListener("click", submitSealedAnswer);
  for (const button of elements.choices) {
    button.addEventListener("click", () => {
      if (!canChoose()) return;
      selectedAnswer = button.dataset.answerId;
      renderQuestion();
    });
  }
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
    resetQuiz();
    socket.emit("room:leave", { roomId: leavingRoom }, () => {});
    elements.lobbyError.textContent = "房间里已经有两个人了。";
    showOnly(elements.lobby);
    return;
  }

  roomMembers = membership.activeMembers;
  knownHostId = membership.nextHostId;
  if (membership.shouldReset) resetQuiz();
  render();
}

function handleDirectMessage(message) {
  pendingHostMessages = enqueueHostStateEnvelope({
    queue: pendingHostMessages,
    roomId,
    knownHostId,
    message,
  });
  replayQueuedHostStates();
}

function handleSealedResult(message) {
  const state = isHost() ? hostState : publicState;
  const normalized = validateSealedResult({ roomId, memberIds: memberIds(), state, message });
  if (!normalized) return;
  verifiedResult = normalized;

  if (isHost()) {
    const next = revealAnswer(hostState, normalized);
    if (next === hostState) return;
    hostState = next;
    publicState = next;
    clearPrivateAnswer();
    publishHostState();
    verifiedResult = null;
    pendingHostMessages = [];
    render();
    return;
  }

  replayQueuedHostStates();
}

function advanceHostQuiz() {
  if (!isHost() || roomMembers.length !== 2) return;
  if (!hostState) {
    const quizId = nextQuizId();
    hostState = startQuiz({
      memberIds: memberIds(),
      quizId,
      roundId: roundIdFor(quizId, 0),
      questionIds: QUESTION_IDS,
    });
  } else if (hostState.phase === "revealed") {
    hostState = beginNextQuestion(
      hostState,
      roundIdFor(hostState.quizId, hostState.questionIndex + 1),
    );
  } else if (hostState.phase === "finished") {
    const quizId = nextQuizId();
    hostState = restartQuiz(hostState, { quizId, roundId: roundIdFor(quizId, 0) });
  } else return;

  publicState = hostState;
  clearPrivateAnswer();
  verifiedResult = null;
  pendingHostMessages = [];
  publishHostState();
  render();
}

function submitSealedAnswer() {
  if (!canChoose() || !selectedAnswer) return;
  pendingAnswer = selectedAnswer;
  submitted = true;
  renderQuestion();

  socket.emit("room:sealed-submit", {
    roomId,
    namespace: SEALED_NAMESPACE,
    roundId: publicState.roundId,
    data: { questionId: currentQuestionId(publicState), answerId: pendingAnswer },
  }, (reply) => {
    if (reply?.ok) return;
    if (reply?.error?.code !== "SEALED_ALREADY_SUBMITTED") {
      submitted = false;
      pendingAnswer = null;
    }
    renderQuestion();
    elements.quizStatus.textContent = reply?.error?.message || "选择没有密封成功。";
  });
}

function publishHostState() {
  const targetId = hostState?.memberIds.find((memberId) => memberId !== socket.id);
  if (!targetId) return;
  socket.emit("room:direct", {
    roomId,
    targetId,
    type: STATE_MESSAGE_TYPE,
    data: hostState,
  }, (reply) => {
    if (!reply?.ok) elements.quizStatus.textContent = reply?.error?.message || "等待本机房间。";
  });
}

function replayQueuedHostStates() {
  const replayed = replayHostStateEnvelopes({
    roomId,
    knownHostId,
    currentState: publicState,
    memberIds: memberIds(),
    verifiedResult,
    queue: pendingHostMessages,
  });
  pendingHostMessages = replayed.pending;
  if (replayed.state !== publicState) acceptRemoteState(replayed.state);
}

function acceptRemoteState(state) {
  const previousRoundId = publicState?.roundId;
  publicState = state;
  if (state.phase === "answering" && state.roundId !== previousRoundId) clearPrivateAnswer();
  if (state.phase !== "answering") clearPrivateAnswer();
  verifiedResult = null;
  render();
}

function render() {
  const ready = roomMembers.length === 2;
  elements.roomId.textContent = roomId || "-----";
  elements.waiting.classList.toggle("hidden", Boolean(publicState));
  elements.quiz.classList.toggle("hidden", !publicState);

  if (!publicState) {
    elements.waitingTitle.textContent = ready ? (isHost() ? "可以开始了" : "等对方开始") : "等待另一个人";
    elements.waitingStatus.textContent = ready ? "八道题，各自选择后一起揭晓。" : "把房间码告诉对方，两人到齐后就可以开始。";
  }
  renderHostAction(ready);
  if (publicState) renderQuestion();
}

function renderHostAction(ready) {
  const canStart = isHost() && ready && !hostState;
  const canAdvance = isHost() && ready && ["revealed", "finished"].includes(hostState?.phase);
  elements.hostAction.classList.toggle("hidden", !(canStart || canAdvance));
  if (canStart) {
    elements.waiting.append(elements.hostAction);
    elements.hostAction.textContent = "开始八道题";
  } else if (canAdvance) {
    elements.quiz.querySelector(".quiz-actions").prepend(elements.hostAction);
    elements.hostAction.textContent = hostState.phase === "finished" ? "再玩一次" : "下一题";
  }
}

function renderQuestion() {
  const question = getQuestion(currentQuestionId(publicState));
  if (!question) return;
  const revealed = ["revealed", "finished"].includes(publicState.phase);
  const selfSubmission = revealed
    ? publicState.lastResult?.submissions.find(({ memberId }) => memberId === socket.id)
    : null;
  const partnerSubmission = revealed
    ? publicState.lastResult?.submissions.find(({ memberId }) => memberId !== socket.id)
    : null;
  const selfAnswerId = selfSubmission?.answerId ?? selectedAnswer;

  elements.progress.textContent = `${String(publicState.questionIndex + 1).padStart(2, "0")} / ${String(publicState.totalQuestions).padStart(2, "0")}`;
  elements.question.textContent = question.prompt;
  for (const label of elements.answerLabels) label.textContent = answerLabel(question, label.dataset.answerLabel);
  for (const label of elements.partnerLabels) label.textContent = answerLabel(question, label.dataset.partnerLabel);

  for (const button of elements.choices) {
    const selected = button.dataset.answerId === selfAnswerId;
    button.disabled = !canChoose();
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  for (const choice of elements.partnerChoices) {
    choice.classList.toggle("revealed", choice.dataset.answerId === partnerSubmission?.answerId);
  }
  elements.duet.classList.toggle("revealed", revealed);
  elements.submitAnswer.classList.toggle("hidden", revealed);
  elements.submitAnswer.disabled = !canChoose() || !selectedAnswer;

  if (revealed) {
    const matched = publicState.lastResult.matched;
    elements.selfState.textContent = `你选了：${answerLabel(question, selfSubmission?.answerId)}`;
    elements.partnerState.textContent = `对方选了：${answerLabel(question, partnerSubmission?.answerId)}`;
    if (publicState.phase === "finished") {
      elements.quizStatus.textContent = `八题完成：${publicState.matchCount} / ${publicState.totalQuestions} 次不约而同。`;
    } else if (matched) {
      elements.quizStatus.textContent = `这一题，我们想到一起了 · ${publicState.matchCount} 颗同心`;
    } else {
      elements.quizStatus.textContent = `这一题，我们想得不一样 · ${publicState.matchCount} 颗同心`;
    }
  } else if (submitted) {
    elements.selfState.textContent = `已选好：${answerLabel(question, pendingAnswer)}`;
    elements.partnerState.textContent = "等待对方";
    elements.quizStatus.textContent = "已选好，等你";
  } else {
    elements.selfState.textContent = selectedAnswer ? `准备选择：${answerLabel(question, selectedAnswer)}` : "还没有选择";
    elements.partnerState.textContent = "等待对方";
    elements.quizStatus.textContent = selectedAnswer ? "准备好后，把这个答案密封。" : "先选一个答案，再把它密封。";
  }
}

function canChoose() {
  return Boolean(
    socket?.id
    && publicState?.phase === "answering"
    && publicState.memberIds.includes(socket.id)
    && !submitted,
  );
}

function answerLabel(question, answerId) {
  return question?.answers.find(({ id }) => id === answerId)?.label ?? "";
}

function clearPrivateAnswer() {
  selectedAnswer = null;
  pendingAnswer = null;
  submitted = false;
}

function resetQuiz() {
  publicState = null;
  hostState = null;
  verifiedResult = null;
  pendingHostMessages = [];
  clearPrivateAnswer();
  clearQuestionPresentation();
}

function clearQuestionPresentation() {
  elements.progress.textContent = "01 / 08";
  elements.question.textContent = "";
  elements.selfState.textContent = "还没有选择";
  elements.partnerState.textContent = "等待对方";
  elements.quizStatus.textContent = "先选一个答案，再把它密封。";
  elements.duet.classList.remove("revealed");
  for (const label of [...elements.answerLabels, ...elements.partnerLabels]) label.textContent = "";
  for (const button of elements.choices) {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
    button.disabled = true;
  }
  for (const choice of elements.partnerChoices) choice.classList.remove("revealed");
}

function memberIds() {
  return roomMembers.map((member) => member.id);
}

function isHost() {
  return Boolean(socket?.id && socket.id === knownHostId);
}

function nextQuizId() {
  quizSerial += 1;
  return `quiz-${Date.now().toString(36)}-${quizSerial.toString(36)}`;
}

function leaveCurrentRoom() {
  const leavingRoom = roomId;
  roomId = null;
  roomMembers = [];
  knownHostId = null;
  resetQuiz();
  if (leavingRoom) socket.emit("room:leave", { roomId: leavingRoom }, () => {});
  elements.lobbyError.textContent = "";
  showOnly(elements.lobby);
}

function showOffline(message) {
  elements.connectionStatus.textContent = message;
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
