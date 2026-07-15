import { acceptPublicState } from "./logic.js";

export function acceptHostState({ roomId, knownHostId, currentState, memberIds, action } = {}) {
  if (!roomId || !knownHostId || action?.roomId !== roomId) return currentState;
  if (action.type !== "connect-four:state" || action.senderId !== knownHostId) return currentState;
  return acceptPublicState(currentState, action.data, memberIds);
}

export function isAuthorizedMoveMessage({
  roomId,
  knownHostId,
  selfId,
  memberIds,
  hostState,
  message,
} = {}) {
  return Boolean(
    roomId
    && selfId
    && selfId === knownHostId
    && message?.roomId === roomId
    && message.type === "connect-four:move"
    && Array.isArray(memberIds)
    && memberIds.includes(message.senderId)
    && message.senderId !== selfId
    && message.data?.version === hostState?.version,
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
