import assert from "node:assert/strict";
import test from "node:test";

import { beginNextQuestion, revealAnswer, roundIdFor, startQuiz } from "./logic.js";
import {
  acceptHostState,
  enqueueHostStateEnvelope,
  isHostStateEnvelope,
  MAX_PENDING_HOST_STATES,
  reconcileMembership,
  replayHostStateEnvelopes,
  SEALED_NAMESPACE,
  STATE_MESSAGE_TYPE,
  validateSealedResult,
} from "./protocol.js";

const memberIds = ["host", "guest"];
const answering = startQuiz({ memberIds, quizId: "quiz-1", roundId: roundIdFor("quiz-1", 0) });
const questionId = answering.questionIds[0];
const message = {
  roomId: "ABCDE",
  namespace: SEALED_NAMESPACE,
  roundId: answering.roundId,
  submissions: [
    { memberId: "host", data: { questionId, answerId: "a" } },
    { memberId: "guest", data: { questionId, answerId: "b" } },
  ],
};

test("密封结果严格核对房间、命名空间、回合、题目、成员和答案", () => {
  assert.deepEqual(validateSealedResult({ roomId: "ABCDE", memberIds, state: answering, message }), {
    roundId: answering.roundId,
    questionId,
    submissions: [{ memberId: "host", answerId: "a" }, { memberId: "guest", answerId: "b" }],
  });
  for (const invalid of [
    { ...message, roomId: "OTHER" },
    { ...message, namespace: "other" },
    { ...message, roundId: "old" },
    { ...message, submissions: message.submissions.slice(0, 1) },
    { ...message, submissions: [message.submissions[0], { memberId: "third", data: { questionId, answerId: "b" } }] },
    { ...message, submissions: [message.submissions[0], { memberId: "guest", data: { questionId: "other", answerId: "b" } }] },
    { ...message, submissions: [message.submissions[0], { memberId: "guest", data: { questionId, answerId: "c" } }] },
  ]) {
    assert.equal(validateSealedResult({ roomId: "ABCDE", memberIds, state: answering, message: invalid }), null);
  }
});

test("只有当前主机可发布同房间状态，揭晓必须匹配已验证结果", () => {
  const verified = validateSealedResult({ roomId: "ABCDE", memberIds, state: answering, message });
  const revealed = revealAnswer(answering, verified);
  const base = { roomId: "ABCDE", knownHostId: "host", currentState: answering, memberIds, verifiedResult: verified };
  const action = { roomId: "ABCDE", senderId: "host", type: STATE_MESSAGE_TYPE, data: revealed };
  assert.deepEqual(acceptHostState({ ...base, action }), revealed);
  assert.strictEqual(acceptHostState({ ...base, action: { ...action, senderId: "guest" } }), answering);
  assert.strictEqual(acceptHostState({ ...base, action: { ...action, roomId: "OTHER" } }), answering);
  assert.strictEqual(acceptHostState({ ...base, action: { ...action, type: "other" } }), answering);
  assert.strictEqual(acceptHostState({ ...base, verifiedResult: null, action }), answering);
  assert.strictEqual(acceptHostState({ ...base, action: { ...action, data: { ...revealed, matchCount: 2 } } }), answering);
});

test("密封结果晚到时按版本连续重放揭晓与下一题状态", () => {
  const verified = validateSealedResult({ roomId: "ABCDE", memberIds, state: answering, message });
  const revealed = revealAnswer(answering, verified);
  const next = beginNextQuestion(revealed, roundIdFor(revealed.quizId, 1));
  const revealEnvelope = { roomId: "ABCDE", senderId: "host", type: STATE_MESSAGE_TYPE, data: revealed };
  const nextEnvelope = { roomId: "ABCDE", senderId: "host", type: STATE_MESSAGE_TYPE, data: next };

  let queue = enqueueHostStateEnvelope({
    queue: [], roomId: "ABCDE", knownHostId: "host", message: nextEnvelope,
  });
  queue = enqueueHostStateEnvelope({
    queue, roomId: "ABCDE", knownHostId: "host", message: revealEnvelope,
  });
  assert.deepEqual(queue.map(({ data }) => data.version), [revealed.version, next.version]);

  const blocked = replayHostStateEnvelopes({
    roomId: "ABCDE", knownHostId: "host", currentState: answering, memberIds, queue,
  });
  assert.strictEqual(blocked.state, answering);
  assert.equal(blocked.pending.length, 2);

  const replayed = replayHostStateEnvelopes({
    roomId: "ABCDE",
    knownHostId: "host",
    currentState: answering,
    memberIds,
    verifiedResult: verified,
    queue: blocked.pending,
  });
  assert.deepEqual(replayed.state, next);
  assert.deepEqual(replayed.pending, []);

  const stale = replayHostStateEnvelopes({
    roomId: "ABCDE",
    knownHostId: "host",
    currentState: next,
    memberIds,
    queue: [revealEnvelope],
  });
  assert.strictEqual(stale.state, next);
  assert.deepEqual(stale.pending, []);

  const forged = replayHostStateEnvelopes({
    roomId: "ABCDE",
    knownHostId: "host",
    currentState: answering,
    memberIds,
    verifiedResult: verified,
    queue: [{ ...revealEnvelope, data: { ...revealed, matchCount: 2 } }],
  });
  assert.strictEqual(forged.state, answering);
});

test("主机状态等待队列拒绝非法 envelope 并保持有界", () => {
  let queue = [];
  for (let version = 20; version > 0; version -= 1) {
    queue = enqueueHostStateEnvelope({
      queue,
      roomId: "ABCDE",
      knownHostId: "host",
      message: {
        roomId: "ABCDE",
        senderId: "host",
        type: STATE_MESSAGE_TYPE,
        data: { ...answering, version },
      },
    });
  }
  assert.equal(queue.length, MAX_PENDING_HOST_STATES);
  assert.deepEqual(queue.map(({ data }) => data.version), [1, 2, 3, 4, 5, 6, 7, 8]);
  const unchanged = enqueueHostStateEnvelope({
    queue,
    roomId: "ABCDE",
    knownHostId: "host",
    message: { roomId: "ABCDE", senderId: "third", type: STATE_MESSAGE_TYPE, data: answering },
  });
  assert.deepEqual(unchanged, queue);
});

test("只有当前主机的状态 envelope 可以进入乱序等待队列", () => {
  const base = { roomId: "ABCDE", knownHostId: "host" };
  assert.equal(isHostStateEnvelope({
    ...base,
    message: { roomId: "ABCDE", senderId: "host", type: STATE_MESSAGE_TYPE, data: answering },
  }), true);
  for (const invalid of [
    { roomId: "ABCDE", senderId: "third", type: STATE_MESSAGE_TYPE, data: answering },
    { roomId: "OTHER", senderId: "host", type: STATE_MESSAGE_TYPE, data: answering },
    { roomId: "ABCDE", senderId: "host", type: "other", data: answering },
  ]) assert.equal(isHostStateEnvelope({ ...base, message: invalid }), false);
});

test("第三人、成员替换和主机迁移遵循统一两人席位门控", () => {
  const previous = [{ id: "host", role: "host" }, { id: "guest", role: "guest" }];
  assert.equal(reconcileMembership({
    previousMembers: [], incomingMembers: [...previous, { id: "third", role: "guest" }], selfId: "third",
  }).shouldExit, true);
  assert.equal(reconcileMembership({
    previousMembers: previous,
    incomingMembers: [{ id: "host", role: "host" }, { id: "new", role: "guest" }],
    knownHostId: "host", selfId: "host",
  }).shouldReset, true);
  assert.equal(reconcileMembership({
    previousMembers: previous,
    incomingMembers: [{ id: "guest", role: "host" }],
    knownHostId: "host", selfId: "guest",
  }).shouldReset, true);
});
