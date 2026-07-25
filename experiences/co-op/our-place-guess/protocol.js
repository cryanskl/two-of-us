import {
  acceptPublicState,
  toPublicState,
} from "./logic.js";
import { normalizePoint } from "./map.js";

export {
  reconcileTwoPlayerMembership as reconcileMembership,
} from "../../../shared/runtime/two-player-membership.js";

export const SEALED_NAMESPACE = "our-place";
export const STATE_MESSAGE_TYPE = "our-place:state";
export const MAX_PENDING_ENVELOPES = 4;

const RESULT_KEYS = Object.freeze(["roomId", "namespace", "roundId", "submissions"]);
const RESULT_SUBMISSION_KEYS = Object.freeze(["memberId", "data"]);
const SEALED_DATA_KEYS = Object.freeze(["cardId", "point"]);
const ENVELOPE_KEYS = Object.freeze(["roomId", "senderId", "type", "data"]);
const SUBMISSION_STATES = Object.freeze(["editing", "submitted", "revealed"]);
const SUBMISSION_EVENTS = Object.freeze(["submit", "ack", "result", "reset"]);

export function validateSealedResult({
  roomId,
  memberIds,
  state,
  message,
} = {}) {
  const root = readExactRecord(message, RESULT_KEYS);
  const members = normalizeMembers(memberIds);
  const publicState = toPublicState(state);
  if (
    !root
    || !roomId
    || root.roomId !== roomId
    || root.namespace !== SEALED_NAMESPACE
    || !members
    || !publicState
    || publicState.phase !== "guessing"
    || root.roundId !== publicState.roundId
  ) return null;

  const submissions = readDenseArray(root.submissions);
  if (!submissions || submissions.length !== 2) return null;
  const byMember = new Map();
  for (const rawSubmission of submissions) {
    const submission = readExactRecord(rawSubmission, RESULT_SUBMISSION_KEYS);
    const data = submission && readExactRecord(submission.data, SEALED_DATA_KEYS);
    const point = data && normalizePoint(data.point);
    if (
      !submission
      || !data
      || !members.includes(submission.memberId)
      || byMember.has(submission.memberId)
      || data.cardId !== publicState.card.id
      || !point
    ) return null;
    byMember.set(submission.memberId, point);
  }
  if (byMember.size !== 2) return null;
  return deepFreeze({
    roundId: publicState.roundId,
    cardId: publicState.card.id,
    submissions: members.map((memberId) => ({
      memberId,
      point: byMember.get(memberId),
    })),
  });
}

export function acceptHostState({
  roomId,
  knownHostId,
  currentState,
  memberIds,
  verifiedResult,
  action,
} = {}) {
  if (!isExpectedHostEnvelope({ roomId, knownHostId, message: action })) return currentState;
  return acceptPublicState(currentState, action.data, memberIds, verifiedResult);
}

export function enqueueHostStateEnvelope({
  queue = [],
  roomId,
  knownHostId,
  currentVersion = 0,
  message,
} = {}) {
  const baseline = Number.isInteger(currentVersion) && currentVersion >= 0 ? currentVersion : 0;
  const candidates = normalizeQueue(queue, { roomId, knownHostId, currentVersion: baseline });
  const candidate = normalizeEnvelope(message, { roomId, knownHostId });
  if (
    candidate
    && candidate.data.version > baseline
    && !candidates.some(({ data }) => data.version === candidate.data.version)
  ) candidates.push(candidate);
  candidates.sort((left, right) => left.data.version - right.data.version);
  if (candidates.length > MAX_PENDING_ENVELOPES) {
    return deepFreeze({ queue: [], overflowed: true });
  }
  return deepFreeze({ queue: candidates, overflowed: false });
}

export function replayHostStateEnvelopes({
  roomId,
  knownHostId,
  currentState,
  memberIds,
  verifiedResults = [],
  queue = [],
} = {}) {
  let state = currentState;
  const currentVersion = Number.isInteger(currentState?.version) ? currentState.version : 0;
  const normalized = normalizeQueue(queue, { roomId, knownHostId, currentVersion });
  if (normalized.length > MAX_PENDING_ENVELOPES) {
    return deepFreeze({ state, pending: [], overflowed: true });
  }

  const pending = [];
  for (const action of normalized) {
    if (action.data.version <= (state?.version ?? 0)) continue;
    if (action.data.version !== (state?.version ?? 0) + 1) {
      pending.push(action);
      continue;
    }
    const verifiedResult = state?.phase === "guessing"
      ? findVerifiedResult(verifiedResults, state)
      : null;
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
  return deepFreeze({
    state,
    pending: pending.filter(({ data }) => data.version > (state?.version ?? 0)),
    overflowed: false,
  });
}

export function isExpectedHostEnvelope({ roomId, knownHostId, message } = {}) {
  const envelope = readExactRecord(message, ENVELOPE_KEYS);
  return Boolean(
    roomId
    && knownHostId
    && envelope
    && envelope.roomId === roomId
    && envelope.senderId === knownHostId
    && envelope.type === STATE_MESSAGE_TYPE,
  );
}

export function nextSubmissionStatus(current, event) {
  if (!SUBMISSION_STATES.includes(current) || !SUBMISSION_EVENTS.includes(event)) return current;
  if (event === "reset") return "editing";
  if (current === "revealed" || event === "result") return "revealed";
  if (current === "submitted" || event === "submit" || event === "ack") return "submitted";
  return current;
}

function normalizeQueue(queue, context) {
  const items = readDenseArray(queue);
  if (!items) return [];
  const byVersion = new Map();
  for (const message of items) {
    const envelope = normalizeEnvelope(message, context);
    if (
      !envelope
      || envelope.data.version <= context.currentVersion
      || byVersion.has(envelope.data.version)
    ) continue;
    byVersion.set(envelope.data.version, envelope);
  }
  return [...byVersion.values()].sort((left, right) => left.data.version - right.data.version);
}

function normalizeEnvelope(message, { roomId, knownHostId }) {
  if (!isExpectedHostEnvelope({ roomId, knownHostId, message })) return null;
  const data = toPublicState(message.data);
  if (!data) return null;
  return deepFreeze({
    roomId,
    senderId: knownHostId,
    type: STATE_MESSAGE_TYPE,
    data,
  });
}

function findVerifiedResult(results, state) {
  const values = readDenseArray(results);
  if (!values) return null;
  return values.find((result) => (
    result?.roundId === state.roundId
    && result?.cardId === state.card.id
  )) ?? null;
}

function normalizeMembers(value) {
  const members = readDenseArray(value);
  if (
    !members
    || members.length !== 2
    || members.some((memberId) => typeof memberId !== "string" || !memberId)
    || members[0] === members[1]
  ) return null;
  return members;
}

function readExactRecord(value, allowedKeys) {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.getOwnPropertySymbols(value).length > 0
    || Object.keys(descriptors).length !== allowedKeys.length
  ) return null;
  const result = Object.create(null);
  for (const key of allowedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function readDenseArray(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string" || !expected.has(key))) return null;
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    result.push(descriptor.value);
  }
  return result;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
