export const SCHEMA_VERSION = 1;
export const TARGET_SCORE = 2;
export const CHOICES = Object.freeze(["rock", "scissors", "paper"]);

const beats = Object.freeze({ rock: "scissors", scissors: "paper", paper: "rock" });

export function resolveChoices(firstChoice, secondChoice) {
  if (!isChoice(firstChoice) || !isChoice(secondChoice)) return null;
  if (firstChoice === secondChoice) return "tie";
  return beats[firstChoice] === secondChoice ? "first" : "second";
}

export function startMatch({ memberIds, roundId, version = 0 } = {}) {
  const members = normalizeMembers(memberIds);
  if (!members) throw new TypeError("开始对局需要两个不同的成员");
  if (!isRoundId(roundId)) throw new TypeError("回合编号格式不正确");

  return {
    schemaVersion: SCHEMA_VERSION,
    version: toVersion(version) + 1,
    phase: "choosing",
    memberIds: members,
    roundId,
    roundNumber: 1,
    scores: Object.fromEntries(members.map((memberId) => [memberId, 0])),
    targetScore: TARGET_SCORE,
    lastResult: null,
  };
}

export function revealRound(state, sealedResult) {
  if (!isValidState(state) || state.phase !== "choosing") return state;
  const normalized = normalizeSealedResult(sealedResult, state.memberIds, state.roundId);
  if (!normalized) return state;

  const [first, second] = normalized.submissions;
  const outcome = resolveChoices(first.choice, second.choice);
  const winnerId = outcome === "first" ? first.memberId : outcome === "second" ? second.memberId : null;
  const scores = { ...state.scores };
  if (winnerId) scores[winnerId] += 1;
  const finished = winnerId ? scores[winnerId] >= state.targetScore : false;

  return {
    ...state,
    version: state.version + 1,
    phase: finished ? "finished" : "revealed",
    scores,
    lastResult: {
      roundId: state.roundId,
      submissions: normalized.submissions,
      winnerId,
    },
  };
}

export function beginNextRound(state, roundId) {
  if (!isValidState(state) || state.phase !== "revealed") return state;
  if (!isRoundId(roundId) || roundId === state.roundId) return state;
  return {
    ...state,
    version: state.version + 1,
    phase: "choosing",
    roundId,
    roundNumber: state.roundNumber + 1,
    lastResult: null,
  };
}

export function restartMatch(state, roundId) {
  if (!isValidState(state) || state.phase !== "finished") return state;
  return startMatch({ memberIds: state.memberIds, roundId, version: state.version });
}

export function acceptPublicState(current, incoming, expectedMemberIds, verifiedResult = null) {
  const members = normalizeMembers(expectedMemberIds);
  if (!members || !isValidState(incoming) || !sameMembers(incoming.memberIds, members)) return current;
  if (incoming.version <= toVersion(current?.version)) return current;

  if (!current) {
    if (!isInitialState(incoming)) return current;
    return cloneState(incoming);
  }
  if (!isValidState(current) || !sameMembers(current.memberIds, members)) return current;

  let expected = current;
  if (current.phase === "choosing") expected = revealRound(current, verifiedResult);
  else if (current.phase === "revealed") expected = beginNextRound(current, incoming.roundId);
  else if (current.phase === "finished") expected = restartMatch(current, incoming.roundId);
  if (expected === current || !sameState(expected, incoming)) return current;
  return cloneState(incoming);
}

export function isChoice(value) {
  return CHOICES.includes(value);
}

function normalizeSealedResult(value, memberIds, roundId) {
  if (!value || value.roundId !== roundId || !Array.isArray(value.submissions)) return null;
  if (value.submissions.length !== 2) return null;
  const byMember = new Map();
  for (const submission of value.submissions) {
    if (!submission || !memberIds.includes(submission.memberId) || byMember.has(submission.memberId)) return null;
    const choice = submission.choice ?? submission.data?.choice;
    if (!isChoice(choice)) return null;
    byMember.set(submission.memberId, choice);
  }
  if (byMember.size !== 2) return null;
  return {
    roundId,
    submissions: memberIds.map((memberId) => ({ memberId, choice: byMember.get(memberId) })),
  };
}

function isInitialState(state) {
  return state.phase === "choosing"
    && state.version >= 1
    && state.roundNumber === 1
    && state.lastResult === null
    && state.memberIds.every((memberId) => state.scores[memberId] === 0);
}

function isValidState(value) {
  if (!value || typeof value !== "object" || value.schemaVersion !== SCHEMA_VERSION) return false;
  const members = normalizeMembers(value.memberIds);
  if (!members || !Number.isInteger(value.version) || value.version < 1) return false;
  if (!["choosing", "revealed", "finished"].includes(value.phase)) return false;
  if (!isRoundId(value.roundId) || !Number.isInteger(value.roundNumber) || value.roundNumber < 1) return false;
  if (value.targetScore !== TARGET_SCORE || !isValidScores(value.scores, members)) return false;
  if (value.phase === "choosing") return value.lastResult === null;

  const result = normalizeSealedResult(value.lastResult, members, value.roundId);
  if (!result || value.lastResult.winnerId !== winnerFromResult(result)) return false;
  const reachedTarget = members.some((memberId) => value.scores[memberId] >= TARGET_SCORE);
  return value.phase === "finished" ? reachedTarget : !reachedTarget;
}

function winnerFromResult(result) {
  const [first, second] = result.submissions;
  const outcome = resolveChoices(first.choice, second.choice);
  return outcome === "first" ? first.memberId : outcome === "second" ? second.memberId : null;
}

function isValidScores(scores, members) {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return false;
  if (Object.keys(scores).length !== 2 || !members.every((memberId) => memberId in scores)) return false;
  return members.every((memberId) => Number.isInteger(scores[memberId]) && scores[memberId] >= 0 && scores[memberId] <= TARGET_SCORE);
}

function cloneState(state) {
  return {
    schemaVersion: state.schemaVersion,
    version: state.version,
    phase: state.phase,
    memberIds: [...state.memberIds],
    roundId: state.roundId,
    roundNumber: state.roundNumber,
    scores: { ...state.scores },
    targetScore: state.targetScore,
    lastResult: state.lastResult ? {
      roundId: state.lastResult.roundId,
      submissions: state.lastResult.submissions.map((submission) => ({ ...submission })),
      winnerId: state.lastResult.winnerId,
    } : null,
  };
}

function sameState(left, right) {
  return JSON.stringify(cloneState(left)) === JSON.stringify(cloneState(right));
}

function normalizeMembers(memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length !== 2) return null;
  const members = memberIds.map((memberId) => String(memberId ?? "").trim());
  if (members.some((memberId) => !memberId) || members[0] === members[1]) return null;
  return members;
}

function sameMembers(left, right) {
  return Array.isArray(left) && left.length === 2 && left[0] === right[0] && left[1] === right[1];
}

function isRoundId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function toVersion(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
