import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceCountdown,
  applyTap,
  createWaitingState,
  startCountdown,
} from "./logic.js";
import {
  acceptHostState,
  reconcileMembership,
  validateTapMessage,
} from "./protocol.js";

const memberIds = ["host", "guest"];

function racingState() {
  let state = startCountdown(createWaitingState({ memberIds }));
  state = advanceCountdown(state);
  state = advanceCountdown(state);
  return advanceCountdown(state);
}

function stateAction(data, overrides = {}) {
  return {
    roomId: "ABCDE",
    senderId: "host",
    type: "heart-sprint:state",
    data,
    ...overrides,
  };
}

test("只接受当前房间、当前主机、当前成员顺序与更高版本的公开状态", () => {
  const current = racingState();
  const next = applyTap(current, { senderId: "host", inputSeq: 1, acceptedAt: 30 });
  const base = {
    roomId: "ABCDE",
    knownHostId: "host",
    currentState: current,
    memberIds,
  };

  const accepted = acceptHostState({ ...base, action: stateAction(next) });
  assert.deepEqual(accepted, next);
  assert.notStrictEqual(accepted, next);
  assert.notStrictEqual(accepted.progress, next.progress);
  assert.notStrictEqual(accepted.scores, next.scores);
  assert.notStrictEqual(accepted.lastInputSeq, next.lastInputSeq);
  assert.notStrictEqual(accepted.lastAcceptedAt, next.lastAcceptedAt);

  for (const action of [
    stateAction(next, { roomId: "OTHER" }),
    stateAction(next, { senderId: "old-host" }),
    stateAction(next, { senderId: "third" }),
    stateAction(next, { type: "other:state" }),
    null,
  ]) {
    assert.strictEqual(acceptHostState({ ...base, action }), current);
  }
  assert.strictEqual(acceptHostState({ ...base, memberIds: ["guest", "host"], action: stateAction(next) }), current);
  assert.strictEqual(acceptHostState({ ...base, currentState: next, action: stateAction(current) }), next);
});

test("公开状态拒绝无效结构而不污染当前状态", () => {
  const current = racingState();
  const next = applyTap(current, { senderId: "host", inputSeq: 1, acceptedAt: 30 });
  const base = {
    roomId: "ABCDE",
    knownHostId: "host",
    currentState: current,
    memberIds,
  };
  for (const data of [
    null,
    { ...next, schemaVersion: 2 },
    { ...next, progress: { host: 31, guest: 0 } },
    { ...next, memberIds: ["host", "third"] },
    { ...next, extra: "unknown-field" },
  ]) {
    assert.strictEqual(acceptHostState({ ...base, action: stateAction(data) }), current);
  }
});

test("主机只接收同房间当前同伴发送的严格点击信封", () => {
  const base = {
    roomId: "ABCDE",
    knownHostId: "host",
    selfId: "host",
    memberIds,
  };
  const message = {
    roomId: "ABCDE",
    senderId: "guest",
    type: "heart-sprint:tap",
    data: { inputSeq: 17 },
  };

  const accepted = validateTapMessage({ ...base, message });
  assert.deepEqual(accepted, { senderId: "guest", inputSeq: 17 });
  assert.notStrictEqual(accepted, message.data);

  for (const invalid of [
    { ...message, roomId: "OTHER" },
    { ...message, senderId: "host" },
    { ...message, senderId: "third" },
    { ...message, type: "heart-sprint:state" },
    { ...message, data: { inputSeq: 0 } },
    { ...message, data: { inputSeq: 1.5 } },
    { ...message, data: { inputSeq: 1, extra: true } },
    { ...message, extra: true },
  ]) {
    assert.equal(validateTapMessage({ ...base, message: invalid }), null);
  }
  assert.equal(validateTapMessage({ ...base, selfId: "guest", message }), null);
  assert.equal(validateTapMessage({ ...base, memberIds: ["host", "third"], message }), null);
});

test("共享成员协调器识别替换、第三人和主机迁移", () => {
  const previousMembers = [{ id: "host", role: "host" }, { id: "guest", role: "guest" }];
  const replaced = reconcileMembership({
    previousMembers,
    incomingMembers: [{ id: "host", role: "host" }, { id: "new", role: "guest" }],
    knownHostId: "host",
    selfId: "host",
  });
  assert.equal(replaced.shouldReset, true);

  const promoted = reconcileMembership({
    previousMembers,
    incomingMembers: [{ id: "guest", role: "host" }],
    knownHostId: "host",
    selfId: "guest",
  });
  assert.equal(promoted.nextHostId, "guest");
  assert.equal(promoted.shouldReset, true);

  const third = reconcileMembership({
    previousMembers: [],
    incomingMembers: [...previousMembers, { id: "third", role: "guest" }],
    knownHostId: null,
    selfId: "third",
  });
  assert.equal(third.shouldExit, true);
  assert.deepEqual(third.activeMembers, previousMembers);
});
