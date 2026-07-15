import assert from "node:assert/strict";
import test from "node:test";
import { RoomError, RoomRegistry } from "./rooms.js";

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
