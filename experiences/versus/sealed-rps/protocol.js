import { acceptPublicState, isChoice } from "./logic.js";
export {
  reconcileTwoPlayerMembership as reconcileMembership,
} from "../../../shared/runtime/two-player-membership.js";

export const SEALED_NAMESPACE = "sealed-rps";

export function validateSealedResult({ roomId, memberIds, state, message } = {}) {
  if (!roomId || message?.roomId !== roomId || message.namespace !== SEALED_NAMESPACE) return null;
  if (!state || state.phase !== "choosing" || message.roundId !== state.roundId) return null;
  if (!Array.isArray(memberIds) || memberIds.length !== 2 || !Array.isArray(message.submissions)) return null;
  if (message.submissions.length !== 2) return null;

  const choices = new Map();
  for (const submission of message.submissions) {
    const memberId = submission?.memberId;
    const choice = submission?.data?.choice;
    if (!memberIds.includes(memberId) || choices.has(memberId) || !isChoice(choice)) return null;
    choices.set(memberId, choice);
  }
  if (choices.size !== 2) return null;
  return {
    roundId: state.roundId,
    submissions: memberIds.map((memberId) => ({ memberId, choice: choices.get(memberId) })),
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

export function isHostStateEnvelope({ roomId, knownHostId, message } = {}) {
  return Boolean(
    roomId
    && knownHostId
    && message?.roomId === roomId
    && message.type === "sealed-rps:state"
    && message.senderId === knownHostId,
  );
}
