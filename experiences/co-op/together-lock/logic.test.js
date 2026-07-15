import test from "node:test";
import assert from "node:assert/strict";
import {
  HOLD_DURATION_MS,
  acceptRemoteUnlock,
  advanceLock,
  createLockState,
  getChargeProgress,
  getLockPhase,
  resetLock,
  setMemberHold,
  syncMembers,
} from "./logic.js";

function readyState() {
  return syncMembers(createLockState(), ["guest", "host"]);
}

test("two members can begin charging only after both hold", () => {
  const firstHold = setMemberHold(readyState(), "host", true, 100);
  assert.equal(firstHold.chargeStartedAt, null);
  assert.equal(getLockPhase(firstHold), "connected");

  const bothHold = setMemberHold(firstHold, "guest", true, 140);
  assert.equal(bothHold.chargeStartedAt, 140);
  assert.equal(getLockPhase(bothHold), "charging");
});

test("releasing early cancels charging and clears progress", () => {
  let state = readyState();
  state = setMemberHold(state, "host", true, 10);
  state = setMemberHold(state, "guest", true, 20);
  assert.equal(getChargeProgress(state, 1270), 0.5);

  state = setMemberHold(state, "host", false, 1270);
  assert.equal(state.chargeStartedAt, null);
  assert.equal(getChargeProgress(state, 1270), 0);
  assert.equal(advanceLock(state, 10_000).unlocked, false);
});

test("holding together for 2.5 seconds unlocks", () => {
  let state = readyState();
  state = setMemberHold(state, "host", true, 1000);
  state = setMemberHold(state, "guest", true, 1200);

  assert.equal(advanceLock(state, 1200 + HOLD_DURATION_MS - 1).unlocked, false);
  state = advanceLock(state, 1200 + HOLD_DURATION_MS);
  assert.equal(state.unlocked, true);
  assert.equal(getChargeProgress(state, 1200 + HOLD_DURATION_MS), 1);
  assert.equal(getLockPhase(state), "unlocked");
});

test("remote unlock is accepted only while both current members hold", () => {
  const oneHold = setMemberHold(readyState(), "host", true, 0);
  assert.strictEqual(acceptRemoteUnlock(oneHold), oneHold);

  const bothHold = setMemberHold(oneHold, "guest", true, 1);
  assert.equal(acceptRemoteUnlock(bothHold).unlocked, true);
});

test("reset clears holds, charging and unlocked state", () => {
  let state = readyState();
  state = setMemberHold(state, "host", true, 0);
  state = setMemberHold(state, "guest", true, 0);
  state = advanceLock(state, HOLD_DURATION_MS);
  state = resetLock(state);

  assert.deepEqual(state.holds, { guest: false, host: false });
  assert.equal(state.chargeStartedAt, null);
  assert.equal(state.unlocked, false);
  assert.equal(getLockPhase(state), "connected");
});

test("member changes clear transient state, including disconnects", () => {
  let state = readyState();
  state = setMemberHold(state, "host", true, 0);
  state = setMemberHold(state, "guest", true, 0);
  state = advanceLock(state, HOLD_DURATION_MS);

  state = syncMembers(state, ["host"]);
  assert.deepEqual(state.memberIds, ["host"]);
  assert.deepEqual(state.holds, { host: false });
  assert.equal(state.chargeStartedAt, null);
  assert.equal(state.unlocked, false);
  assert.equal(getLockPhase(state), "waiting");
});

test("unchanged room membership preserves active state", () => {
  let state = readyState();
  state = setMemberHold(state, "host", true, 5);
  assert.strictEqual(syncMembers(state, ["host", "guest", "guest"]), state);
});
