export const SCHEMA_VERSION = 1;
export const TARGET_PROGRESS = 30;
export const MATCH_WIN_SCORE = 2;
export const TAP_THROTTLE_MS = 30;

const PHASES = new Set([
  "waiting",
  "countdown",
  "racing",
  "round-ended",
  "match-ended",
]);

const STATE_KEYS = [
  "schemaVersion",
  "version",
  "phase",
  "memberIds",
  "roundNumber",
  "countdown",
  "progress",
  "scores",
  "lastInputSeq",
  "lastAcceptedAt",
  "roundWinnerId",
  "matchWinnerId",
];

export function createWaitingState({ memberIds, version = 0 } = {}) {
  const members = normalizeMembers(memberIds);
  if (!members) throw new TypeError("创建心跳冲刺需要两个不同的成员");

  const baseVersion = toBaseVersion(version);
  return {
    schemaVersion: SCHEMA_VERSION,
    version: baseVersion + 1,
    phase: "waiting",
    memberIds: members,
    roundNumber: 1,
    countdown: null,
    progress: createMemberRecord(members, 0),
    scores: createMemberRecord(members, 0),
    lastInputSeq: createMemberRecord(members, 0),
    lastAcceptedAt: createMemberRecord(members, 0),
    roundWinnerId: null,
    matchWinnerId: null,
  };
}

export function startCountdown(state) {
  if (!isValidState(state) || state.phase !== "waiting") return state;
  return {
    ...cloneState(state),
    version: state.version + 1,
    phase: "countdown",
    countdown: 3,
  };
}

export function advanceCountdown(state) {
  if (!isValidState(state) || state.phase !== "countdown") return state;
  if (state.countdown > 1) {
    return {
      ...cloneState(state),
      version: state.version + 1,
      countdown: state.countdown - 1,
    };
  }
  return {
    ...cloneState(state),
    version: state.version + 1,
    phase: "racing",
    countdown: null,
  };
}

export function applyTap(state, { senderId, inputSeq, acceptedAt } = {}) {
  if (!isValidState(state) || state.phase !== "racing") return state;
  if (!state.memberIds.includes(senderId)) return state;
  if (!Number.isSafeInteger(inputSeq) || inputSeq < 1) return state;
  if (!Number.isFinite(acceptedAt) || acceptedAt < 0) return state;
  if (inputSeq <= state.lastInputSeq[senderId]) return state;

  const next = cloneState(state);
  next.version += 1;
  next.lastInputSeq[senderId] = inputSeq;

  const elapsed = acceptedAt - state.lastAcceptedAt[senderId];
  if (elapsed < TAP_THROTTLE_MS) return next;

  next.lastAcceptedAt[senderId] = acceptedAt;
  next.progress[senderId] = Math.min(
    TARGET_PROGRESS,
    state.progress[senderId] + 1,
  );

  if (next.progress[senderId] !== TARGET_PROGRESS) return next;

  next.roundWinnerId = senderId;
  next.scores[senderId] = Math.min(
    MATCH_WIN_SCORE,
    state.scores[senderId] + 1,
  );
  if (next.scores[senderId] === MATCH_WIN_SCORE) {
    next.phase = "match-ended";
    next.matchWinnerId = senderId;
  } else {
    next.phase = "round-ended";
  }
  return next;
}

export function startNextRound(state) {
  if (!isValidState(state) || state.phase !== "round-ended") return state;
  const next = cloneState(state);
  next.version += 1;
  next.phase = "countdown";
  next.roundNumber += 1;
  next.countdown = 3;
  next.progress = createMemberRecord(next.memberIds, 0);
  next.lastAcceptedAt = createMemberRecord(next.memberIds, 0);
  next.roundWinnerId = null;
  return next;
}

export function restartMatch(state) {
  if (!isValidState(state) || state.phase !== "match-ended") return state;
  const next = createWaitingState({ memberIds: state.memberIds });
  next.version = state.version + 1;
  next.phase = "countdown";
  next.countdown = 3;
  return next;
}

export function resetForMembership({ memberIds, currentState = null } = {}) {
  return createWaitingState({
    memberIds,
    version: isValidState(currentState) ? currentState.version : 0,
  });
}

export function acceptPublicState(current, incoming, expectedMemberIds) {
  const members = normalizeMembers(expectedMemberIds);
  if (!members || !isValidState(incoming)) return current;
  if (!sameMembers(incoming.memberIds, members)) return current;
  if (incoming.version <= currentVersion(current)) return current;
  return cloneState(incoming);
}

export function cloneState(state) {
  return {
    schemaVersion: state.schemaVersion,
    version: state.version,
    phase: state.phase,
    memberIds: [...state.memberIds],
    roundNumber: state.roundNumber,
    countdown: state.countdown,
    progress: { ...state.progress },
    scores: { ...state.scores },
    lastInputSeq: { ...state.lastInputSeq },
    lastAcceptedAt: { ...state.lastAcceptedAt },
    roundWinnerId: state.roundWinnerId,
    matchWinnerId: state.matchWinnerId,
  };
}

export function isValidState(value) {
  if (!isPlainObject(value) || !hasExactKeys(value, STATE_KEYS)) return false;
  if (value.schemaVersion !== SCHEMA_VERSION) return false;
  if (!Number.isSafeInteger(value.version) || value.version < 1) return false;
  if (!PHASES.has(value.phase)) return false;

  const members = normalizeMembers(value.memberIds);
  if (!members || !sameMembers(value.memberIds, members)) return false;
  if (!Number.isSafeInteger(value.roundNumber)
    || value.roundNumber < 1
    || value.roundNumber > 3) return false;

  if (!isMemberRecord(value.progress, members, isProgress)) return false;
  if (!isMemberRecord(value.scores, members, isScore)) return false;
  if (!isMemberRecord(value.lastInputSeq, members, isInputSeq)) return false;
  if (!isMemberRecord(value.lastAcceptedAt, members, isTimestamp)) return false;
  if (!isNullableMember(value.roundWinnerId, members)) return false;
  if (!isNullableMember(value.matchWinnerId, members)) return false;

  const scoreTotal = sumRecord(value.scores, members);
  const completedRounds = value.phase === "round-ended" || value.phase === "match-ended"
    ? value.roundNumber
    : value.roundNumber - 1;
  if (scoreTotal !== completedRounds) return false;

  const winnerAtFinish = value.roundWinnerId === null
    ? false
    : value.progress[value.roundWinnerId] === TARGET_PROGRESS;

  switch (value.phase) {
    case "waiting":
      return value.roundNumber === 1
        && value.countdown === null
        && allRecordValues(value.progress, members, 0)
        && scoreTotal === 0
        && allRecordValues(value.lastInputSeq, members, 0)
        && allRecordValues(value.lastAcceptedAt, members, 0)
        && value.roundWinnerId === null
        && value.matchWinnerId === null;
    case "countdown":
      return [1, 2, 3].includes(value.countdown)
        && allRecordValues(value.progress, members, 0)
        && value.roundWinnerId === null
        && value.matchWinnerId === null;
    case "racing":
      return value.countdown === null
        && Object.values(value.progress).every((progress) => progress < TARGET_PROGRESS)
        && value.roundWinnerId === null
        && value.matchWinnerId === null;
    case "round-ended":
      return value.countdown === null
        && winnerAtFinish
        && value.matchWinnerId === null
        && value.scores[value.roundWinnerId] < MATCH_WIN_SCORE;
    case "match-ended":
      return value.countdown === null
        && winnerAtFinish
        && value.matchWinnerId === value.roundWinnerId
        && value.scores[value.matchWinnerId] === MATCH_WIN_SCORE;
    default:
      return false;
  }
}

function normalizeMembers(memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length !== 2) return null;
  const members = memberIds.map((memberId) => String(memberId ?? "").trim());
  if (members.some((memberId) => !memberId) || members[0] === members[1]) return null;
  return members;
}

function createMemberRecord(memberIds, value) {
  return Object.fromEntries(memberIds.map((memberId) => [memberId, value]));
}

function isMemberRecord(value, memberIds, validateValue) {
  return isPlainObject(value)
    && hasExactKeys(value, memberIds)
    && memberIds.every((memberId) => validateValue(value[memberId]));
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, expectedKeys) {
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isProgress(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= TARGET_PROGRESS;
}

function isScore(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MATCH_WIN_SCORE;
}

function isInputSeq(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isTimestamp(value) {
  return Number.isFinite(value) && value >= 0;
}

function isNullableMember(value, memberIds) {
  return value === null || memberIds.includes(value);
}

function allRecordValues(record, memberIds, expected) {
  return memberIds.every((memberId) => record[memberId] === expected);
}

function sumRecord(record, memberIds) {
  return memberIds.reduce((sum, memberId) => sum + record[memberId], 0);
}

function sameMembers(left, right) {
  return Array.isArray(left)
    && left.length === 2
    && left[0] === right[0]
    && left[1] === right[1];
}

function toBaseVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("状态版本必须是非负安全整数");
  }
  return value;
}

function currentVersion(state) {
  return isValidState(state) ? state.version : 0;
}
