import { acceptPublicState, isChoice } from "./logic.js";

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

export function reconcileMembership({ previousMembers, incomingMembers, knownHostId, selfId } = {}) {
  const previous = Array.isArray(previousMembers) ? previousMembers : [];
  const incoming = Array.isArray(incomingMembers) ? incomingMembers : [];
  const activeMembers = incoming.slice(0, 2);
  const nextHostId = activeMembers.find((member) => member?.role === "host")?.id ?? null;
  const previousIds = previous.map((member) => member?.id).join("|");
  const nextIds = activeMembers.map((member) => member?.id).join("|");
  return {
    activeMembers,
    nextHostId,
    shouldExit: incoming.length > 2 && !activeMembers.some((member) => member?.id === selfId),
    shouldReset: Boolean(
      (previousIds && previousIds !== nextIds)
      || (knownHostId && knownHostId !== nextHostId),
    ),
  };
}
