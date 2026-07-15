import assert from "node:assert/strict";
import test from "node:test";

import { revealRound, startMatch } from "./logic.js";
import {
  acceptHostState,
  isHostStateEnvelope,
  reconcileMembership,
  validateSealedResult,
} from "./protocol.js";

const memberIds = ["host", "guest"];
const choosing = startMatch({ memberIds, roundId: "round-1" });
const message = {
  roomId: "ABCDE",
  namespace: "sealed-rps",
  roundId: "round-1",
  submissions: [
    { memberId: "host", data: { choice: "rock" } },
    { memberId: "guest", data: { choice: "scissors" } },
  ],
};

test("密封结果核对房间、命名空间、回合、成员和选择", () => {
  assert.deepEqual(validateSealedResult({ roomId: "ABCDE", memberIds, state: choosing, message }), {
    roundId: "round-1",
    submissions: [{ memberId: "host", choice: "rock" }, { memberId: "guest", choice: "scissors" }],
  });
  for (const invalid of [
    { ...message, roomId: "OTHER" },
    { ...message, namespace: "other" },
    { ...message, roundId: "old" },
    { ...message, submissions: message.submissions.slice(0, 1) },
    { ...message, submissions: [message.submissions[0], { memberId: "third", data: { choice: "paper" } }] },
    { ...message, submissions: [message.submissions[0], { memberId: "guest", data: { choice: "fire" } }] },
  ]) {
    assert.equal(validateSealedResult({ roomId: "ABCDE", memberIds, state: choosing, message: invalid }), null);
  }
});

test("只有当前主机可发布同房间状态，揭晓比分必须匹配已验证结果", () => {
  const verified = validateSealedResult({ roomId: "ABCDE", memberIds, state: choosing, message });
  const revealed = revealRound(choosing, verified);
  const base = { roomId: "ABCDE", knownHostId: "host", currentState: choosing, memberIds, verifiedResult: verified };
  assert.deepEqual(acceptHostState({
    ...base,
    action: { roomId: "ABCDE", senderId: "host", type: "sealed-rps:state", data: revealed },
  }), revealed);
  assert.strictEqual(acceptHostState({
    ...base,
    action: { roomId: "ABCDE", senderId: "guest", type: "sealed-rps:state", data: revealed },
  }), choosing);
  assert.strictEqual(acceptHostState({
    ...base,
    verifiedResult: null,
    action: { roomId: "ABCDE", senderId: "host", type: "sealed-rps:state", data: revealed },
  }), choosing);
  assert.strictEqual(acceptHostState({
    ...base,
    action: { roomId: "ABCDE", senderId: "host", type: "sealed-rps:state", data: { ...revealed, scores: { host: 2, guest: 0 } } },
  }), choosing);
});

test("只有当前主机的同房间定向 envelope 可以进入待验证队列", () => {
  const base = { roomId: "ABCDE", knownHostId: "host" };
  assert.equal(isHostStateEnvelope({
    ...base,
    message: { roomId: "ABCDE", senderId: "host", type: "sealed-rps:state", data: choosing },
  }), true);
  for (const invalid of [
    { roomId: "ABCDE", senderId: "third", type: "sealed-rps:state", data: choosing },
    { roomId: "OTHER", senderId: "host", type: "sealed-rps:state", data: choosing },
    { roomId: "ABCDE", senderId: "host", type: "other", data: choosing },
  ]) {
    assert.equal(isHostStateEnvelope({ ...base, message: invalid }), false);
  }
});

test("第三人退出，成员替换与主机迁移都重置比赛", () => {
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
