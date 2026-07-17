import { acceptPublicState, currentQuestionId } from "./logic.js";
import { isAnswerId } from "./config.js";

export {
  reconcileTwoPlayerMembership as reconcileMembership,
} from "../../../shared/runtime/two-player-membership.js";

export const SEALED_NAMESPACE = "compatibility-quiz";
export const STATE_MESSAGE_TYPE = "compatibility-quiz:state";
export const MAX_PENDING_HOST_STATES = 8;

export function validateSealedResult({ roomId, memberIds, state, message } = {}) {
  if (!roomId || message?.roomId !== roomId || message.namespace !== SEALED_NAMESPACE) return null;
  if (!state || state.phase !== "answering" || message.roundId !== state.roundId) return null;
  if (!Array.isArray(memberIds) || memberIds.length !== 2 || !Array.isArray(message.submissions)) return null;
  if (message.submissions.length !== 2) return null;

  const questionId = currentQuestionId(state);
  const answers = new Map();
  for (const submission of message.submissions) {
    const memberId = submission?.memberId;
    const submittedQuestionId = submission?.data?.questionId;
    const answerId = submission?.data?.answerId;
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
    roundId: state.roundId,
    questionId,
    submissions: memberIds.map((memberId) => ({ memberId, answerId: answers.get(memberId) })),
  };
}

export function acceptHostState({
  roomId,
  knownHostId,
  currentState,
  memberIds,
  verifiedResult,
  action,
} = {}) {
  if (!isHostStateEnvelope({ roomId, knownHostId, message: action })) return currentState;
  return acceptPublicState(currentState, action.data, memberIds, verifiedResult);
}

export function enqueueHostStateEnvelope({
  queue = [],
  roomId,
  knownHostId,
  message,
  limit = MAX_PENDING_HOST_STATES,
} = {}) {
  const boundedLimit = Number.isInteger(limit) && limit > 0 ? limit : MAX_PENDING_HOST_STATES;
  const candidates = Array.isArray(queue) ? queue.filter((item) => (
    isHostStateEnvelope({ roomId, knownHostId, message: item })
    && Number.isInteger(item?.data?.version)
  )) : [];
  if (
    isHostStateEnvelope({ roomId, knownHostId, message })
    && Number.isInteger(message?.data?.version)
    && !candidates.some((item) => item.data.version === message.data.version)
  ) candidates.push(message);
  return candidates
    .sort((left, right) => left.data.version - right.data.version)
    .slice(0, boundedLimit);
}

export function replayHostStateEnvelopes({
  roomId,
  knownHostId,
  currentState,
  memberIds,
  verifiedResult,
  queue = [],
} = {}) {
  let state = currentState;
  const pending = [];
  const ordered = (Array.isArray(queue) ? queue : []).reduce(
    (result, action) => enqueueHostStateEnvelope({
      queue: result,
      roomId,
      knownHostId,
      message: action,
    }),
    [],
  );

  for (const action of ordered) {
    if (action.data.version <= (state?.version ?? 0)) continue;
    const accepted = acceptHostState({
      roomId,
      knownHostId,
      currentState: state,
      memberIds,
      verifiedResult,
      action,
    });
    if (accepted === state) pending.push(action);
    else state = accepted;
  }
  return {
    state,
    pending: pending.filter((action) => action.data.version > (state?.version ?? 0)),
  };
}

export function isHostStateEnvelope({ roomId, knownHostId, message } = {}) {
  return Boolean(
    roomId
    && knownHostId
    && message?.roomId === roomId
    && message.type === STATE_MESSAGE_TYPE
    && message.senderId === knownHostId,
  );
}
