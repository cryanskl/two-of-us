import { acceptPublicState } from "./logic.js";
export {
  reconcileTwoPlayerMembership as reconcileMembership,
} from "../../../shared/runtime/two-player-membership.js";

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
