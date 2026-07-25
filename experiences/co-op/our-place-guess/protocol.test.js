import assert from "node:assert/strict";
import test from "node:test";

import {
  beginNextRound,
  revealRound,
  startGame,
} from "./logic.js";
import {
  acceptHostState,
  enqueueHostStateEnvelope,
  isExpectedHostEnvelope,
  MAX_PENDING_ENVELOPES,
  nextSubmissionStatus,
  reconcileMembership,
  replayHostStateEnvelopes,
  SEALED_NAMESPACE,
  STATE_MESSAGE_TYPE,
  validateSealedResult,
} from "./protocol.js";
import { SAMPLE_ACTIVE_CARDS } from "./sample-pack.js";
import { RoomRegistry } from "../../../shared/runtime/rooms.js";
import { SealedRoundRegistry } from "../../../shared/runtime/sealed-rounds.js";

const ROOM_ID = "ABCDE";
const MEMBER_IDS = Object.freeze(["host", "guest"]);
const STATE = startGame({
  memberIds: MEMBER_IDS,
  activeCards: SAMPLE_ACTIVE_CARDS,
  gameId: "protocol",
});

function resultMessage(state = STATE) {
  return {
    roomId: ROOM_ID,
    namespace: SEALED_NAMESPACE,
    roundId: state.roundId,
    submissions: [
      {
        memberId: "guest",
        data: {
          cardId: state.card.id,
          point: { longitude: 10, latitude: 20 },
        },
      },
      {
        memberId: "host",
        data: {
          cardId: state.card.id,
          point: { longitude: 30, latitude: 40 },
        },
      },
    ],
  };
}

function envelope(data, senderId = "host") {
  return {
    roomId: ROOM_ID,
    senderId,
    type: STATE_MESSAGE_TYPE,
    data,
  };
}

function deepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(deepFrozen);
}

test("密封结果严格核对 room、namespace、round、card、成员、字段和坐标", () => {
  const message = resultMessage();
  const normalized = validateSealedResult({
    roomId: ROOM_ID,
    memberIds: MEMBER_IDS,
    state: STATE,
    message,
  });
  assert.deepEqual(normalized, {
    roundId: STATE.roundId,
    cardId: STATE.card.id,
    submissions: [
      { memberId: "host", point: { longitude: 30, latitude: 40 } },
      { memberId: "guest", point: { longitude: 10, latitude: 20 } },
    ],
  });
  deepFrozen(normalized);

  const invalidMessages = [
    { ...message, roomId: "OTHER" },
    { ...message, namespace: "other" },
    { ...message, roundId: "old" },
    { ...message, extra: true },
    { ...message, submissions: message.submissions.slice(0, 1) },
    {
      ...message,
      submissions: [message.submissions[0], { ...message.submissions[1], memberId: "guest" }],
    },
    {
      ...message,
      submissions: [
        message.submissions[0],
        { memberId: "host", data: { ...message.submissions[1].data, cardId: "wrong" } },
      ],
    },
    {
      ...message,
      submissions: [
        message.submissions[0],
        {
          memberId: "host",
          data: {
            cardId: STATE.card.id,
            point: { longitude: 30, latitude: 40 },
            extra: true,
          },
        },
      ],
    },
    {
      ...message,
      submissions: [
        message.submissions[0],
        {
          memberId: "host",
          data: {
            cardId: STATE.card.id,
            point: { longitude: 30, latitude: 99 },
          },
        },
      ],
    },
  ];
  for (const invalid of invalidMessages) {
    assert.equal(validateSealedResult({
      roomId: ROOM_ID,
      memberIds: MEMBER_IDS,
      state: STATE,
      message: invalid,
    }), null);
  }
});

test("只有已知 host 的同房间状态可接受，揭晓必须由已验证结果唯一推导", () => {
  const verified = validateSealedResult({
    roomId: ROOM_ID,
    memberIds: MEMBER_IDS,
    state: STATE,
    message: resultMessage(),
  });
  const revealed = revealRound(STATE, verified, SAMPLE_ACTIVE_CARDS[0]);
  const action = envelope(revealed);
  const base = {
    roomId: ROOM_ID,
    knownHostId: "host",
    currentState: STATE,
    memberIds: MEMBER_IDS,
    verifiedResult: verified,
  };
  assert.deepEqual(acceptHostState({ ...base, action }), revealed);
  assert.strictEqual(acceptHostState({ ...base, action: envelope(revealed, "guest") }), STATE);
  assert.strictEqual(acceptHostState({
    ...base,
    action: { ...action, roomId: "OTHER" },
  }), STATE);
  assert.strictEqual(acceptHostState({
    ...base,
    action: { ...action, type: "other" },
  }), STATE);
  assert.strictEqual(acceptHostState({ ...base, verifiedResult: null, action }), STATE);

  const forged = structuredClone(revealed);
  forged.lastResult.jointDistanceKm = 1;
  forged.summaries[0].jointDistanceKm = 1;
  assert.strictEqual(acceptHostState({ ...base, action: envelope(forged) }), STATE);
});

test("host state 早到时有界暂存，sealed result 到达后连续重放", () => {
  const verified = validateSealedResult({
    roomId: ROOM_ID,
    memberIds: MEMBER_IDS,
    state: STATE,
    message: resultMessage(),
  });
  const revealed = revealRound(STATE, verified, SAMPLE_ACTIVE_CARDS[0]);
  const next = beginNextRound(revealed, SAMPLE_ACTIVE_CARDS[1]);
  let queueState = enqueueHostStateEnvelope({
    queue: [],
    roomId: ROOM_ID,
    knownHostId: "host",
    currentVersion: STATE.version,
    message: envelope(next),
  });
  queueState = enqueueHostStateEnvelope({
    queue: queueState.queue,
    roomId: ROOM_ID,
    knownHostId: "host",
    currentVersion: STATE.version,
    message: envelope(revealed),
  });
  assert.equal(queueState.overflowed, false);
  assert.deepEqual(queueState.queue.map(({ data }) => data.version), [
    revealed.version,
    next.version,
  ]);

  const blocked = replayHostStateEnvelopes({
    roomId: ROOM_ID,
    knownHostId: "host",
    currentState: STATE,
    memberIds: MEMBER_IDS,
    queue: queueState.queue,
  });
  assert.strictEqual(blocked.state, STATE);
  assert.equal(blocked.pending.length, 2);

  const replayed = replayHostStateEnvelopes({
    roomId: ROOM_ID,
    knownHostId: "host",
    currentState: STATE,
    memberIds: MEMBER_IDS,
    verifiedResults: [verified],
    queue: blocked.pending,
  });
  assert.deepEqual(replayed.state, next);
  assert.deepEqual(replayed.pending, []);

  const duplicate = replayHostStateEnvelopes({
    roomId: ROOM_ID,
    knownHostId: "host",
    currentState: next,
    memberIds: MEMBER_IDS,
    verifiedResults: [verified],
    queue: [envelope(revealed), envelope(revealed)],
  });
  assert.strictEqual(duplicate.state, next);
  assert.deepEqual(duplicate.pending, []);
});

test("队列拒绝旧 host、旧版本与重复版本，并在第五个唯一版本时失败关闭", () => {
  assert.equal(isExpectedHostEnvelope({
    roomId: ROOM_ID,
    knownHostId: "host",
    message: envelope(STATE),
  }), true);
  assert.equal(isExpectedHostEnvelope({
    roomId: ROOM_ID,
    knownHostId: "host",
    message: envelope(STATE, "old-host"),
  }), false);

  let result = { queue: [], overflowed: false };
  for (let offset = 1; offset <= MAX_PENDING_ENVELOPES; offset += 1) {
    result = enqueueHostStateEnvelope({
      queue: result.queue,
      roomId: ROOM_ID,
      knownHostId: "host",
      currentVersion: STATE.version,
      message: envelope({ ...STATE, version: STATE.version + offset }),
    });
    assert.equal(result.overflowed, false);
  }
  assert.equal(result.queue.length, MAX_PENDING_ENVELOPES);

  const duplicate = enqueueHostStateEnvelope({
    queue: result.queue,
    roomId: ROOM_ID,
    knownHostId: "host",
    currentVersion: STATE.version,
    message: envelope({ ...STATE, version: STATE.version + 2 }),
  });
  assert.equal(duplicate.queue.length, MAX_PENDING_ENVELOPES);

  const overflow = enqueueHostStateEnvelope({
    queue: result.queue,
    roomId: ROOM_ID,
    knownHostId: "host",
    currentVersion: STATE.version,
    message: envelope({ ...STATE, version: STATE.version + 5 }),
  });
  assert.deepEqual(overflow, { queue: [], overflowed: true });

  const stale = enqueueHostStateEnvelope({
    queue: [],
    roomId: ROOM_ID,
    knownHostId: "host",
    currentVersion: STATE.version,
    message: envelope({ ...STATE, version: STATE.version }),
  });
  assert.deepEqual(stale, { queue: [], overflowed: false });
});

test("result 比 ack 更早时提交状态只前进不回退", () => {
  assert.equal(nextSubmissionStatus("editing", "submit"), "submitted");
  assert.equal(nextSubmissionStatus("editing", "result"), "revealed");
  assert.equal(nextSubmissionStatus("revealed", "ack"), "revealed");
  assert.equal(nextSubmissionStatus("submitted", "ack"), "submitted");
  assert.equal(nextSubmissionStatus("submitted", "result"), "revealed");
  assert.equal(nextSubmissionStatus("revealed", "reset"), "editing");
});

test("共享两人席位门控处理第三人、成员替换和 host 迁移", () => {
  const previous = [{ id: "host", role: "host" }, { id: "guest", role: "guest" }];
  assert.equal(reconcileMembership({
    previousMembers: [],
    incomingMembers: [...previous, { id: "third", role: "guest" }],
    selfId: "third",
  }).shouldExit, true);
  assert.equal(reconcileMembership({
    previousMembers: previous,
    incomingMembers: [{ id: "host", role: "host" }, { id: "new", role: "guest" }],
    knownHostId: "host",
    selfId: "host",
  }).shouldReset, true);
  assert.equal(reconcileMembership({
    previousMembers: previous,
    incomingMembers: [{ id: "guest", role: "host" }],
    knownHostId: "host",
    selfId: "guest",
  }).shouldReset, true);
});

test("共享 sealed registry 支持同值幂等、改值拒绝、第三人门控和成员清局", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("host", "主机");
  rooms.join(room.id, "guest", "同伴");
  rooms.join(room.id, "third", "第三人");
  const sealed = new SealedRoundRegistry();
  const payload = {
    roomId: room.id,
    namespace: SEALED_NAMESPACE,
    roundId: STATE.roundId,
    data: {
      cardId: STATE.card.id,
      point: { longitude: 10, latitude: 20 },
    },
  };
  sealed.submit(rooms, "host", payload);
  assert.equal(sealed.submit(rooms, "host", {
    ...payload,
    data: {
      point: { latitude: 20, longitude: 10 },
      cardId: STATE.card.id,
    },
  }).idempotent, true);
  assert.throws(
    () => sealed.submit(rooms, "host", {
      ...payload,
      data: { ...payload.data, point: { longitude: 11, latitude: 20 } },
    }),
    (error) => error.code === "SEALED_ALREADY_SUBMITTED",
  );
  assert.throws(
    () => sealed.submit(rooms, "third", payload),
    (error) => error.code === "SEALED_NOT_A_PLAYER",
  );
  assert.equal(sealed.clearMember(room.id, "guest"), 1);
  assert.equal(sealed.clearMember(room.id, "guest"), 0);
});
