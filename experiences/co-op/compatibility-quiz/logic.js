import { isAnswerId, QUESTION_IDS } from "./config.js";

export const SCHEMA_VERSION = 1;
export const TOTAL_QUESTIONS = QUESTION_IDS.length;

export function roundIdFor(quizId, questionIndex) {
  if (!isIdentifier(quizId)) return null;
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= TOTAL_QUESTIONS) return null;
  const roundId = `${quizId}-q${questionIndex + 1}`;
  return isIdentifier(roundId) ? roundId : null;
}

export function startQuiz({ memberIds, quizId, roundId, questionIds = QUESTION_IDS, version = 0 } = {}) {
  const members = normalizeMembers(memberIds);
  if (!members) throw new TypeError("开始问答需要两个不同的成员");
  if (!isIdentifier(quizId) || roundId !== roundIdFor(quizId, 0)) throw new TypeError("问答或题目编号格式不正确");
  if (!isQuestionSequence(questionIds)) throw new TypeError("问答需要完整且顺序固定的八道题");

  return {
    schemaVersion: SCHEMA_VERSION,
    version: toVersion(version) + 1,
    phase: "answering",
    memberIds: members,
    quizId,
    roundId,
    questionIndex: 0,
    totalQuestions: TOTAL_QUESTIONS,
    questionIds: [...QUESTION_IDS],
    matchCount: 0,
    lastResult: null,
  };
}

export function revealAnswer(state, sealedResult) {
  if (!isValidState(state) || state.phase !== "answering") return state;
  const normalized = normalizeSealedResult(
    sealedResult,
    state.memberIds,
    state.roundId,
    currentQuestionId(state),
  );
  if (!normalized) return state;

  const matched = normalized.submissions[0].answerId === normalized.submissions[1].answerId;
  return {
    ...state,
    version: state.version + 1,
    phase: state.questionIndex === state.totalQuestions - 1 ? "finished" : "revealed",
    matchCount: state.matchCount + (matched ? 1 : 0),
    lastResult: { ...normalized, matched },
  };
}

export function beginNextQuestion(state, roundId) {
  if (!isValidState(state) || state.phase !== "revealed") return state;
  if (roundId !== roundIdFor(state.quizId, state.questionIndex + 1)) return state;
  return {
    ...state,
    version: state.version + 1,
    phase: "answering",
    roundId,
    questionIndex: state.questionIndex + 1,
    lastResult: null,
  };
}

export function restartQuiz(state, { quizId, roundId } = {}) {
  if (!isValidState(state) || state.phase !== "finished") return state;
  if (!isIdentifier(quizId) || quizId === state.quizId) return state;
  if (roundId !== roundIdFor(quizId, 0)) return state;
  return startQuiz({
    memberIds: state.memberIds,
    quizId,
    roundId,
    questionIds: state.questionIds,
    version: state.version,
  });
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
  if (current.phase === "answering") expected = revealAnswer(current, verifiedResult);
  else if (current.phase === "revealed") expected = beginNextQuestion(current, incoming.roundId);
  else if (current.phase === "finished") {
    expected = restartQuiz(current, { quizId: incoming.quizId, roundId: incoming.roundId });
  }
  if (expected === current || !sameState(expected, incoming)) return current;
  return cloneState(incoming);
}

export function currentQuestionId(state) {
  return state?.questionIds?.[state.questionIndex] ?? null;
}

function normalizeSealedResult(value, memberIds, roundId, questionId) {
  if (!value || value.roundId !== roundId || value.questionId !== questionId) return null;
  if (!Array.isArray(value.submissions) || value.submissions.length !== 2) return null;
  const answers = new Map();
  for (const submission of value.submissions) {
    const memberId = submission?.memberId;
    const answerId = submission?.answerId ?? submission?.data?.answerId;
    const submittedQuestionId = submission?.questionId ?? submission?.data?.questionId ?? questionId;
    if (
      !memberIds.includes(memberId)
      || answers.has(memberId)
      || submittedQuestionId !== questionId
      || !isAnswerId(questionId, answerId)
    ) return null;
    answers.set(memberId, answerId);
  }
  if (answers.size !== 2) return null;
  return {
    roundId,
    questionId,
    submissions: memberIds.map((memberId) => ({ memberId, answerId: answers.get(memberId) })),
  };
}

function isInitialState(state) {
  return state.phase === "answering"
    && state.version >= 1
    && state.questionIndex === 0
    && state.matchCount === 0
    && state.lastResult === null;
}

function isValidState(value) {
  if (!value || typeof value !== "object" || value.schemaVersion !== SCHEMA_VERSION) return false;
  const members = normalizeMembers(value.memberIds);
  if (!members || !Number.isInteger(value.version) || value.version < 1) return false;
  if (!["answering", "revealed", "finished"].includes(value.phase)) return false;
  if (!isIdentifier(value.quizId) || value.roundId !== roundIdFor(value.quizId, value.questionIndex)) return false;
  if (!isQuestionSequence(value.questionIds) || value.totalQuestions !== TOTAL_QUESTIONS) return false;
  if (!Number.isInteger(value.questionIndex) || value.questionIndex < 0 || value.questionIndex >= TOTAL_QUESTIONS) return false;
  if (!Number.isInteger(value.matchCount) || value.matchCount < 0 || value.matchCount > value.questionIndex + 1) return false;
  if (value.phase === "answering") return value.lastResult === null;
  if (value.phase === "finished" && value.questionIndex !== TOTAL_QUESTIONS - 1) return false;
  if (value.phase === "revealed" && value.questionIndex >= TOTAL_QUESTIONS - 1) return false;

  const result = normalizeSealedResult(
    value.lastResult,
    members,
    value.roundId,
    currentQuestionId(value),
  );
  if (!result) return false;
  const matched = result.submissions[0].answerId === result.submissions[1].answerId;
  return value.lastResult.matched === matched;
}

function cloneState(state) {
  return {
    schemaVersion: state.schemaVersion,
    version: state.version,
    phase: state.phase,
    memberIds: [...state.memberIds],
    quizId: state.quizId,
    roundId: state.roundId,
    questionIndex: state.questionIndex,
    totalQuestions: state.totalQuestions,
    questionIds: [...state.questionIds],
    matchCount: state.matchCount,
    lastResult: state.lastResult ? {
      roundId: state.lastResult.roundId,
      questionId: state.lastResult.questionId,
      submissions: state.lastResult.submissions.map((submission) => ({ ...submission })),
      matched: state.lastResult.matched,
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

function isQuestionSequence(questionIds) {
  return Array.isArray(questionIds)
    && questionIds.length === TOTAL_QUESTIONS
    && questionIds.every((questionId, index) => questionId === QUESTION_IDS[index]);
}

function isIdentifier(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function toVersion(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
