import test from "node:test";
import assert from "node:assert/strict";

import { applyMove, startMatch } from "./logic.js";
import {
  acceptHostState,
  isAuthorizedMoveMessage,
  reconcileMembership,
} from "./protocol.js";

const memberIds = ["host", "guest"];

test("只有当前主机可发布同房间的递增状态", () => {
  const current = startMatch({ memberIds });
  const next = applyMove(current, { playerId: "host", column: 0, version: current.version });
  const base = { roomId: "ABCDE", knownHostId: "host", currentState: current, memberIds };
  const accepted = acceptHostState({
    ...base,
    action: { roomId: "ABCDE", senderId: "host", type: "connect-four:state", data: next },
  });
  assert.deepEqual(accepted, next);
  assert.notStrictEqual(accepted, next);
  assert.strictEqual(acceptHostState({
    ...base,
    action: { roomId: "ABCDE", senderId: "guest", type: "connect-four:state", data: next },
  }), current);
  assert.strictEqual(acceptHostState({
    ...base,
    action: { roomId: "OTHER", senderId: "host", type: "connect-four:state", data: next },
  }), current);
});

test("主机只接受当前两人中非主机发送的同版本落子", () => {
  const hostState = startMatch({ memberIds });
  const base = {
    roomId: "ABCDE",
    knownHostId: "host",
    selfId: "host",
    memberIds,
    hostState,
  };
  assert.equal(isAuthorizedMoveMessage({
    ...base,
    message: { roomId: "ABCDE", senderId: "guest", type: "connect-four:move", data: { version: hostState.version } },
  }), true);
  for (const message of [
    { roomId: "ABCDE", senderId: "third", type: "connect-four:move", data: { version: hostState.version } },
    { roomId: "ABCDE", senderId: "host", type: "connect-four:move", data: { version: hostState.version } },
    { roomId: "OTHER", senderId: "guest", type: "connect-four:move", data: { version: hostState.version } },
    { roomId: "ABCDE", senderId: "guest", type: "connect-four:move", data: { version: hostState.version - 1 } },
  ]) {
    assert.equal(isAuthorizedMoveMessage({ ...base, message }), false);
  }
});

test("第三人退出，成员替换和主机迁移都会要求重置", () => {
  const previousMembers = [{ id: "host", role: "host" }, { id: "guest", role: "guest" }];
  const thirdView = reconcileMembership({
    previousMembers: [],
    incomingMembers: [...previousMembers, { id: "third", role: "guest" }],
    knownHostId: null,
    selfId: "third",
  });
  assert.equal(thirdView.shouldExit, true);
  assert.deepEqual(thirdView.activeMembers, previousMembers);

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
});
