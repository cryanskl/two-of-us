import assert from "node:assert/strict";
import test from "node:test";

import { reconcileTwoPlayerMembership } from "./two-player-membership.js";

const originalMembers = [
  { id: "host", role: "host" },
  { id: "guest", role: "guest" },
];

test("成员与主机均未变化时保留两席且不重置", () => {
  assert.deepEqual(reconcileTwoPlayerMembership({
    previousMembers: originalMembers,
    incomingMembers: originalMembers,
    knownHostId: "host",
    selfId: "guest",
  }), {
    activeMembers: originalMembers,
    nextHostId: "host",
    shouldExit: false,
    shouldReset: false,
  });
});

test("前两席成员替换时要求重置", () => {
  const result = reconcileTwoPlayerMembership({
    previousMembers: originalMembers,
    incomingMembers: [originalMembers[0], { id: "new-guest", role: "guest" }],
    knownHostId: "host",
    selfId: "host",
  });

  assert.equal(result.shouldReset, true);
  assert.deepEqual(result.activeMembers.map((member) => member.id), ["host", "new-guest"]);
});

test("主机迁移时更新主机并要求重置", () => {
  const result = reconcileTwoPlayerMembership({
    previousMembers: originalMembers,
    incomingMembers: [{ id: "guest", role: "host" }],
    knownHostId: "host",
    selfId: "guest",
  });

  assert.equal(result.nextHostId, "guest");
  assert.equal(result.shouldReset, true);
});

test("第三人不在前两席时退出，前两席中的自己继续留下", () => {
  const incomingMembers = [...originalMembers, { id: "third", role: "guest" }];

  assert.equal(reconcileTwoPlayerMembership({
    previousMembers: [],
    incomingMembers,
    selfId: "third",
  }).shouldExit, true);
  assert.equal(reconcileTwoPlayerMembership({
    previousMembers: originalMembers,
    incomingMembers,
    knownHostId: "host",
    selfId: "guest",
  }).shouldExit, false);
});

test("畸形数组与空成员 ID 不会抛出异常", () => {
  assert.deepEqual(reconcileTwoPlayerMembership({
    previousMembers: null,
    incomingMembers: null,
    knownHostId: null,
    selfId: null,
  }), {
    activeMembers: [],
    nextHostId: null,
    shouldExit: false,
    shouldReset: false,
  });

  assert.doesNotThrow(() => reconcileTwoPlayerMembership({
    previousMembers: [null, { id: null }],
    incomingMembers: [null, { id: null, role: "host" }, { id: "third", role: "guest" }],
    knownHostId: null,
    selfId: "third",
  }));
});
