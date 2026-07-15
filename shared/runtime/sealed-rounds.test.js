import assert from "node:assert/strict";
import test from "node:test";

import { RoomError, RoomRegistry } from "./rooms.js";
import { SealedRoundRegistry } from "./sealed-rounds.js";

function setup() {
  const rooms = new RoomRegistry();
  const room = rooms.create("host", "主机");
  rooms.join(room.id, "guest", "同伴");
  return { rooms, roomId: room.id, sealed: new SealedRoundRegistry() };
}

test("第一份提交只返回 pending，不泄露秘密", () => {
  const { rooms, roomId, sealed } = setup();
  const reply = sealed.submit(rooms, "host", {
    roomId, namespace: "rps", roundId: "round-1", data: { choice: "rock" },
  });
  assert.deepEqual(reply, {
    roomId, namespace: "rps", roundId: "round-1", pending: true, complete: false,
  });
  assert.equal(JSON.stringify(reply).includes("rock"), false);
});

test("收齐两份后按冻结成员顺序生成一次结果", () => {
  const { rooms, roomId, sealed } = setup();
  sealed.submit(rooms, "guest", {
    roomId, namespace: "rps", roundId: "round-1", data: { choice: "paper" },
  });
  const complete = sealed.submit(rooms, "host", {
    roomId, namespace: "rps", roundId: "round-1", data: { choice: "rock" },
  });
  assert.equal(complete.complete, true);
  assert.deepEqual(complete.participantIds, ["host", "guest"]);
  assert.deepEqual(complete.result.submissions, [
    { memberId: "host", data: { choice: "rock" } },
    { memberId: "guest", data: { choice: "paper" } },
  ]);
  const replay = sealed.submit(rooms, "host", {
    roomId, namespace: "rps", roundId: "round-1", data: { choice: "rock" },
  });
  assert.equal(replay.replayed, true);
  assert.equal("result" in replay, false);
});

test("同值重试幂等，不同值重试被拒绝", () => {
  const { rooms, roomId, sealed } = setup();
  const payload = { roomId, namespace: "rps", roundId: "round-1", data: { b: 2, a: 1 } };
  sealed.submit(rooms, "host", payload);
  assert.equal(sealed.submit(rooms, "host", { ...payload, data: { a: 1, b: 2 } }).idempotent, true);
  assert.throws(
    () => sealed.submit(rooms, "host", { ...payload, data: { choice: "paper" } }),
    (error) => error instanceof RoomError && error.code === "SEALED_ALREADY_SUBMITTED",
  );
});

test("非成员、第三人和不足两人不能提交", () => {
  const { rooms, roomId, sealed } = setup();
  rooms.join(roomId, "third", "第三人");
  assert.throws(
    () => sealed.submit(rooms, "outsider", { roomId, namespace: "rps", roundId: "1", data: null }),
    (error) => error.code === "NOT_A_MEMBER",
  );
  assert.throws(
    () => sealed.submit(rooms, "third", { roomId, namespace: "rps", roundId: "1", data: null }),
    (error) => error.code === "SEALED_NOT_A_PLAYER",
  );
  const soloRooms = new RoomRegistry();
  const solo = soloRooms.create("solo", "单人");
  assert.throws(
    () => sealed.submit(soloRooms, "solo", { roomId: solo.id, namespace: "rps", roundId: "1", data: null }),
    (error) => error.code === "SEALED_NOT_READY",
  );
});

test("成员变化使原轮次失效，清理房间移除全部轮次", () => {
  const { rooms, roomId, sealed } = setup();
  sealed.submit(rooms, "host", { roomId, namespace: "rps", roundId: "1", data: "rock" });
  rooms.leave(roomId, "guest");
  rooms.join(roomId, "new-guest", "新人");
  assert.throws(
    () => sealed.submit(rooms, "host", { roomId, namespace: "rps", roundId: "1", data: "rock" }),
    (error) => error.code === "SEALED_MEMBERS_CHANGED",
  );
  sealed.submit(rooms, "host", { roomId, namespace: "rps", roundId: "2", data: "rock" });
  assert.equal(sealed.clearRoom(roomId), 1);
  assert.equal(sealed.clearRoom(roomId), 0);
});

test("拒绝循环、函数、非有限数字和超大数据", () => {
  const { rooms, roomId, sealed } = setup();
  const circular = {}; circular.self = circular;
  for (const data of [circular, { fn() {} }, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => sealed.submit(rooms, "host", { roomId, namespace: "rps", roundId: "bad", data }),
      (error) => error.code === "INVALID_SEALED_DATA",
    );
  }
  assert.throws(
    () => sealed.submit(rooms, "host", { roomId, namespace: "rps", roundId: "large", data: "x".repeat(3_000) }),
    (error) => error.code === "SEALED_DATA_TOO_LARGE",
  );
});
