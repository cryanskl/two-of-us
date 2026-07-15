export const HOLD_DURATION_MS = 2500;

export function createLockState() {
  return {
    memberIds: [],
    holds: {},
    chargeStartedAt: null,
    unlocked: false,
  };
}

export function syncMembers(state, memberIds) {
  const normalizedIds = [...new Set(memberIds.map(String))].sort();
  if (sameMembers(state.memberIds, normalizedIds)) return state;

  return {
    memberIds: normalizedIds,
    holds: Object.fromEntries(normalizedIds.map((memberId) => [memberId, false])),
    chargeStartedAt: null,
    unlocked: false,
  };
}

export function setMemberHold(state, memberId, active, now) {
  const normalizedId = String(memberId);
  if (state.unlocked || !state.memberIds.includes(normalizedId)) return state;

  const holds = { ...state.holds, [normalizedId]: Boolean(active) };
  const bothHolding = areBothHolding(state.memberIds, holds);

  return {
    ...state,
    holds,
    chargeStartedAt: bothHolding ? (state.chargeStartedAt ?? now) : null,
  };
}

export function advanceLock(state, now) {
  if (
    state.unlocked ||
    state.chargeStartedAt === null ||
    !areBothHolding(state.memberIds, state.holds) ||
    now - state.chargeStartedAt < HOLD_DURATION_MS
  ) {
    return state;
  }

  return { ...state, unlocked: true };
}

export function acceptRemoteUnlock(state) {
  if (state.unlocked || !areBothHolding(state.memberIds, state.holds)) return state;
  return { ...state, unlocked: true };
}

export function resetLock(state) {
  return {
    ...state,
    holds: Object.fromEntries(state.memberIds.map((memberId) => [memberId, false])),
    chargeStartedAt: null,
    unlocked: false,
  };
}

export function getChargeProgress(state, now) {
  if (state.unlocked) return 1;
  if (state.chargeStartedAt === null || !areBothHolding(state.memberIds, state.holds)) return 0;
  return Math.min(1, Math.max(0, (now - state.chargeStartedAt) / HOLD_DURATION_MS));
}

export function getLockPhase(state) {
  if (state.unlocked) return "unlocked";
  if (state.memberIds.length !== 2) return "waiting";
  if (state.chargeStartedAt !== null) return "charging";
  return "connected";
}

function areBothHolding(memberIds, holds) {
  return memberIds.length === 2 && memberIds.every((memberId) => holds[memberId] === true);
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((memberId, index) => memberId === right[index]);
}
