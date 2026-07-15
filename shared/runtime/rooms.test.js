import assert from "node:assert/strict";
import test from "node:test";
import { prepareDirectMessage, RoomError, RoomRegistry } from "./rooms.js";

test("room lifecycle promotes the remaining member and removes empty rooms", () => {
  const rooms = new RoomRegistry({ maxMembers: 2 });
  const created = rooms.create("socket-a", "小猫");
  const joined = rooms.join(created.id.toLowerCase(), "socket-b", "小狗");

  assert.equal(joined.members.length, 2);
  assert.equal(joined.members[0].role, "host");

  const afterHostLeaves = rooms.leave(created.id, "socket-a");
  assert.deepEqual(afterHostLeaves.members.map(({ name, role }) => ({ name, role })), [
    { name: "小狗", role: "host" },
  ]);
  assert.equal(rooms.leave(created.id, "socket-b"), null);
  assert.equal(rooms.snapshot(created.id), null);
});

test("room rejects extra members with a stable protocol error", () => {
  const rooms = new RoomRegistry({ maxMembers: 1 });
  const created = rooms.create("socket-a", "主机");

  assert.throws(
    () => rooms.join(created.id, "socket-b", "访客"),
    (error) => error instanceof RoomError && error.code === "ROOM_FULL",
  );
});

test("direct message accepts a target in the sender's room and rebuilds its envelope", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("socket-a", "小猫");
  rooms.join(room.id, "socket-b", "小狗");

  const direct = prepareDirectMessage(rooms, "socket-a", {
    roomId: room.id.toLowerCase(),
    targetId: "socket-b",
    type: "secret:".padEnd(60, "x"),
    data: { answer: "星星" },
    senderId: "forged-sender",
  });

  assert.equal(direct.targetId, "socket-b");
  assert.deepEqual(direct.message, {
    roomId: room.id,
    senderId: "socket-a",
    type: "secret:".padEnd(60, "x").slice(0, 48),
    data: { answer: "星星" },
  });
});

test("direct message rejects a target from another room", () => {
  const rooms = new RoomRegistry();
  const senderRoom = rooms.create("socket-a", "小猫");
  rooms.create("socket-b", "小狗");

  assert.throws(
    () => prepareDirectMessage(rooms, "socket-a", {
      roomId: senderRoom.id,
      targetId: "socket-b",
      type: "secret",
    }),
    (error) => error instanceof RoomError && error.code === "TARGET_NOT_IN_ROOM",
  );
});

test("direct message rejects a sender who is not in the claimed room", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("socket-a", "小猫");
  rooms.join(room.id, "socket-b", "小狗");

  assert.throws(
    () => prepareDirectMessage(rooms, "socket-outsider", {
      roomId: room.id,
      targetId: "socket-b",
      type: "guess",
    }),
    (error) => error instanceof RoomError && error.code === "NOT_A_MEMBER",
  );
});
