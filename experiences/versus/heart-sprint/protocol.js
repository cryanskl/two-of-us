import { acceptPublicState } from "./logic.js";

export {
  reconcileTwoPlayerMembership as reconcileMembership,
} from "../../../shared/runtime/two-player-membership.js";

const TAP_MESSAGE_KEYS = ["roomId", "senderId", "type", "data"];
const TAP_DATA_KEYS = ["inputSeq"];

export function acceptHostState({
  roomId,
  knownHostId,
  currentState,
  memberIds,
  action,
} = {}) {
  if (!isNonEmptyString(roomId) || !isNonEmptyString(knownHostId)) return currentState;
  if (!isPlainObject(action) || action.roomId !== roomId) return currentState;
  if (action.type !== "heart-sprint:state" || action.senderId !== knownHostId) {
    return currentState;
  }
  return acceptPublicState(currentState, action.data, memberIds);
}

export function validateTapMessage({
  roomId,
  knownHostId,
  selfId,
  memberIds,
  message,
} = {}) {
  if (!isNonEmptyString(roomId)
    || !isNonEmptyString(knownHostId)
    || selfId !== knownHostId) return null;
  if (!isValidMembers(memberIds) || !isPlainObject(message)) return null;
  if (!hasExactKeys(message, TAP_MESSAGE_KEYS)) return null;
  if (message.roomId !== roomId || message.type !== "heart-sprint:tap") return null;
  if (!memberIds.includes(message.senderId) || message.senderId === selfId) return null;
  if (!isPlainObject(message.data) || !hasExactKeys(message.data, TAP_DATA_KEYS)) return null;
  if (!Number.isSafeInteger(message.data.inputSeq) || message.data.inputSeq < 1) return null;
  return { senderId: message.senderId, inputSeq: message.data.inputSeq };
}

function isValidMembers(memberIds) {
  return Array.isArray(memberIds)
    && memberIds.length === 2
    && memberIds.every((memberId) => (
      isNonEmptyString(memberId) && memberId === memberId.trim()
    ))
    && memberIds[0] !== memberIds[1];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
