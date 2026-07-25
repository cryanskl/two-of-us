import { normalizePoint } from "./map.js";
import { normalizePack } from "./pack.js";

export const SCHEMA_VERSION = 1;
export const TOTAL_ROUNDS = 4;
export const EARTH_RADIUS_KM = 6371.0088;

const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/u;
const CARD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/u;
const PHASES = Object.freeze(["guessing", "revealed", "finished"]);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "version",
  "phase",
  "gameId",
  "memberIds",
  "roundIndex",
  "totalRounds",
  "roundId",
  "card",
  "lastResult",
  "summaries",
]);
const PUBLIC_CARD_KEYS = Object.freeze(["id", "title", "clue", "era"]);
const PRIVATE_CARD_KEYS = Object.freeze(["id", "title", "clue", "era", "target", "revealNote"]);
const SEALED_KEYS = Object.freeze(["roundId", "cardId", "submissions"]);
const SEALED_SUBMISSION_KEYS = Object.freeze(["memberId", "point"]);
const RESULT_KEYS = Object.freeze([
  "roundId",
  "cardId",
  "target",
  "submissions",
  "jointDistanceKm",
  "tierId",
  "revealNote",
]);
const RESULT_SUBMISSION_KEYS = Object.freeze(["memberId", "point", "distanceKm"]);

export function roundIdFor(gameId, roundIndex) {
  if (!isGameId(gameId) || !Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= TOTAL_ROUNDS) {
    return null;
  }
  const roundId = `${gameId}-r${roundIndex + 1}`;
  return roundId.length <= 64 ? roundId : null;
}

export function startGame({ memberIds, activeCards, gameId, version = 0 } = {}) {
  const members = normalizeMembers(memberIds);
  if (!members) throw new TypeError("开始游戏需要两个不同且有序的成员。");
  if (!isGameId(gameId)) throw new TypeError("gameId 格式不正确。");
  if (!Number.isInteger(version) || version < 0) throw new TypeError("version 必须是非负整数。");
  const cards = normalizeActiveCards(activeCards);
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    version: version + 1,
    phase: "guessing",
    gameId,
    memberIds: members,
    roundIndex: 0,
    totalRounds: TOTAL_ROUNDS,
    roundId: roundIdFor(gameId, 0),
    card: publicCard(cards[0]),
    lastResult: null,
    summaries: [],
  });
}

export function revealRound(state, sealedResult, privateCard) {
  const current = normalizeState(state);
  if (!current || current.phase !== "guessing") return state;
  const card = normalizePrivateCard(privateCard);
  if (!card || !samePublicCard(current.card, publicCard(card))) return state;
  const sealed = normalizeSealedResult(
    sealedResult,
    current.memberIds,
    current.roundId,
    current.card.id,
  );
  if (!sealed) return state;

  const submissions = sealed.submissions.map(({ memberId, point }) => ({
    memberId,
    point,
    distanceKm: distanceKm(point, card.target),
  }));
  const jointDistanceKm = Math.max(...submissions.map(({ distanceKm: value }) => value));
  const result = {
    roundId: current.roundId,
    cardId: current.card.id,
    target: card.target,
    submissions,
    jointDistanceKm,
    tierId: tierForDistance(jointDistanceKm),
    revealNote: card.revealNote,
  };
  return deepFreeze({
    ...cloneState(current),
    version: current.version + 1,
    phase: current.roundIndex === TOTAL_ROUNDS - 1 ? "finished" : "revealed",
    lastResult: result,
    summaries: [...current.summaries, result],
  });
}

export function beginNextRound(state, nextPrivateCard) {
  const current = normalizeState(state);
  if (!current || current.phase !== "revealed") return state;
  const card = normalizePrivateCard(nextPrivateCard);
  if (!card) return state;
  return deepFreeze({
    ...cloneState(current),
    version: current.version + 1,
    phase: "guessing",
    roundIndex: current.roundIndex + 1,
    roundId: roundIdFor(current.gameId, current.roundIndex + 1),
    card: publicCard(card),
    lastResult: null,
  });
}

export function restartGame(state, { activeCards, gameId } = {}) {
  const current = normalizeState(state);
  if (!current || current.phase !== "finished" || gameId === current.gameId) return state;
  try {
    return startGame({
      memberIds: current.memberIds,
      activeCards,
      gameId,
      version: current.version,
    });
  } catch {
    return state;
  }
}

export function distanceKm(left, right) {
  const first = normalizePoint(left);
  const second = normalizePoint(right);
  if (!first || !second) return null;
  if (first.longitude === second.longitude && first.latitude === second.latitude) return 0;

  const latitude1 = toRadians(first.latitude);
  const latitude2 = toRadians(second.latitude);
  const latitudeDelta = latitude2 - latitude1;
  const longitudeDelta = wrapToPi(toRadians(second.longitude - first.longitude));
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2
  );
  const bounded = Math.min(1, Math.max(0, haversine));
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
}

export function tierForDistance(distance) {
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) return null;
  if (distance <= 50) return "close";
  if (distance <= 200) return "near";
  if (distance <= 800) return "familiar";
  return "far";
}

export function summarizeGame(state) {
  const current = normalizeState(state);
  if (!current || current.phase !== "finished" || current.summaries.length !== TOTAL_ROUNDS) {
    return null;
  }
  let closestRoundIndex = 0;
  for (let index = 1; index < current.summaries.length; index += 1) {
    if (
      current.summaries[index].jointDistanceKm
      < current.summaries[closestRoundIndex].jointDistanceKm
    ) closestRoundIndex = index;
  }
  return deepFreeze({
    rounds: TOTAL_ROUNDS,
    bothWithin200Count: current.summaries.filter((summary) => (
      summary.submissions.every(({ distanceKm: value }) => value <= 200)
    )).length,
    closestRoundIndex,
    closestJointDistance: current.summaries[closestRoundIndex].jointDistanceKm,
    tiers: current.summaries.map(({ tierId }) => tierId),
  });
}

export function toPublicState(state) {
  const normalized = normalizeState(state);
  if (!normalized) return null;
  return deepFreeze(cloneState(normalized));
}

export function acceptPublicState(current, incoming, expectedMemberIds, verifiedResult = null) {
  const members = normalizeMembers(expectedMemberIds);
  const next = normalizeState(incoming);
  if (!members || !next || !sameMembers(next.memberIds, members)) return current;

  if (!current) {
    return isInitialState(next) ? deepFreeze(cloneState(next)) : current;
  }
  const previous = normalizeState(current);
  if (!previous || !sameMembers(previous.memberIds, members)) return current;
  if (next.version !== previous.version + 1) return current;

  let expected = previous;
  if (previous.phase === "guessing") {
    if (!next.lastResult) return current;
    expected = revealRound(previous, verifiedResult, {
      ...previous.card,
      target: next.lastResult.target,
      revealNote: next.lastResult.revealNote,
    });
  } else if (previous.phase === "revealed") {
    expected = beginNextRound(previous, {
      ...next.card,
      target: { longitude: 0, latitude: 0 },
      revealNote: "",
    });
  } else if (previous.phase === "finished") {
    expected = publicRestart(previous, next);
  }

  if (expected === previous || !sameState(expected, next)) return current;
  return deepFreeze(cloneState(next));
}

function publicRestart(previous, next) {
  if (
    next.phase !== "guessing"
    || next.gameId === previous.gameId
    || next.roundIndex !== 0
    || next.roundId !== roundIdFor(next.gameId, 0)
    || next.lastResult !== null
    || next.summaries.length !== 0
  ) return previous;
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    version: previous.version + 1,
    phase: "guessing",
    gameId: next.gameId,
    memberIds: [...previous.memberIds],
    roundIndex: 0,
    totalRounds: TOTAL_ROUNDS,
    roundId: next.roundId,
    card: clonePublicCard(next.card),
    lastResult: null,
    summaries: [],
  });
}

function normalizeActiveCards(value) {
  if (!Array.isArray(value) || value.length !== TOTAL_ROUNDS) {
    throw new TypeError(`activeCards 必须恰好包含 ${TOTAL_ROUNDS} 张卡片。`);
  }
  const pack = normalizePack({
    schemaVersion: 1,
    title: "运行时题包",
    cards: value,
  });
  return pack.cards;
}

function normalizePrivateCard(value) {
  const record = readExactRecord(value, PRIVATE_CARD_KEYS);
  if (!record) return null;
  const card = normalizePublicCard(record, { allowPrivateFields: true });
  const target = normalizePoint(record.target);
  if (!card || !target || !validText(record.revealNote, 0, 120)) return null;
  return deepFreeze({
    ...card,
    target,
    revealNote: record.revealNote,
  });
}

function publicCard(card) {
  return deepFreeze({
    id: card.id,
    title: card.title,
    clue: card.clue,
    era: card.era,
  });
}

function normalizePublicCard(value, { allowPrivateFields = false } = {}) {
  const record = readExactRecord(value, PUBLIC_CARD_KEYS, { allowExtra: allowPrivateFields });
  if (!record) return null;
  if (
    typeof record.id !== "string"
    || !CARD_ID_PATTERN.test(record.id)
    || !validText(record.title, 1, 40)
    || !validText(record.clue, 1, 160)
    || !validText(record.era, 0, 24)
  ) return null;
  return deepFreeze({
    id: record.id,
    title: record.title,
    clue: record.clue,
    era: record.era,
  });
}

function normalizeState(value) {
  const record = readExactRecord(value, ROOT_KEYS);
  if (!record) return null;
  const members = normalizeMembers(record.memberIds);
  const card = normalizePublicCard(record.card);
  if (
    record.schemaVersion !== SCHEMA_VERSION
    || !Number.isInteger(record.version)
    || record.version < 1
    || !PHASES.includes(record.phase)
    || !isGameId(record.gameId)
    || !members
    || !Number.isInteger(record.roundIndex)
    || record.roundIndex < 0
    || record.roundIndex >= TOTAL_ROUNDS
    || record.totalRounds !== TOTAL_ROUNDS
    || record.roundId !== roundIdFor(record.gameId, record.roundIndex)
    || !card
  ) return null;

  const summaries = normalizeSummaries(record.summaries, members, record.gameId);
  if (!summaries) return null;
  if (record.phase === "guessing") {
    if (record.lastResult !== null || summaries.length !== record.roundIndex) return null;
  } else {
    if (
      summaries.length !== record.roundIndex + 1
      || (record.phase === "revealed" && record.roundIndex >= TOTAL_ROUNDS - 1)
      || (record.phase === "finished" && record.roundIndex !== TOTAL_ROUNDS - 1)
    ) return null;
    const lastResult = normalizeRoundResult(record.lastResult, members);
    if (!lastResult || !sameState(lastResult, summaries.at(-1))) return null;
    if (
      lastResult.roundId !== record.roundId
      || lastResult.cardId !== card.id
    ) return null;
  }

  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    version: record.version,
    phase: record.phase,
    gameId: record.gameId,
    memberIds: members,
    roundIndex: record.roundIndex,
    totalRounds: TOTAL_ROUNDS,
    roundId: record.roundId,
    card,
    lastResult: record.phase === "guessing" ? null : summaries.at(-1),
    summaries,
  });
}

function normalizeSummaries(value, memberIds, gameId) {
  const summaries = readDenseArray(value);
  if (!summaries || summaries.length > TOTAL_ROUNDS) return null;
  const normalized = [];
  for (let index = 0; index < summaries.length; index += 1) {
    const result = normalizeRoundResult(summaries[index], memberIds);
    if (!result || result.roundId !== roundIdFor(gameId, index)) return null;
    normalized.push(result);
  }
  return deepFreeze(normalized);
}

function normalizeRoundResult(value, memberIds) {
  const record = readExactRecord(value, RESULT_KEYS);
  if (!record || typeof record.cardId !== "string" || !CARD_ID_PATTERN.test(record.cardId)) return null;
  const target = normalizePoint(record.target);
  const submissions = readDenseArray(record.submissions);
  if (!target || !submissions || submissions.length !== 2) return null;
  const normalized = [];
  for (let index = 0; index < memberIds.length; index += 1) {
    const submission = readExactRecord(submissions[index], RESULT_SUBMISSION_KEYS);
    const point = submission && normalizePoint(submission.point);
    if (
      !submission
      || submission.memberId !== memberIds[index]
      || !point
      || submission.distanceKm !== distanceKm(point, target)
    ) return null;
    normalized.push({
      memberId: memberIds[index],
      point,
      distanceKm: submission.distanceKm,
    });
  }
  const jointDistanceKm = Math.max(...normalized.map(({ distanceKm: distance }) => distance));
  if (
    record.jointDistanceKm !== jointDistanceKm
    || record.tierId !== tierForDistance(jointDistanceKm)
    || !validText(record.revealNote, 0, 120)
    || typeof record.roundId !== "string"
    || record.roundId.length > 64
  ) return null;
  return deepFreeze({
    roundId: record.roundId,
    cardId: record.cardId,
    target,
    submissions: normalized,
    jointDistanceKm,
    tierId: record.tierId,
    revealNote: record.revealNote,
  });
}

function normalizeSealedResult(value, memberIds, roundId, cardId) {
  const record = readExactRecord(value, SEALED_KEYS);
  const submissions = record && readDenseArray(record.submissions);
  if (
    !record
    || record.roundId !== roundId
    || record.cardId !== cardId
    || !submissions
    || submissions.length !== 2
  ) return null;
  const byMember = new Map();
  for (const raw of submissions) {
    const submission = readExactRecord(raw, SEALED_SUBMISSION_KEYS);
    const point = submission && normalizePoint(submission.point);
    if (
      !submission
      || !memberIds.includes(submission.memberId)
      || byMember.has(submission.memberId)
      || !point
    ) return null;
    byMember.set(submission.memberId, point);
  }
  if (byMember.size !== 2) return null;
  return deepFreeze({
    roundId,
    cardId,
    submissions: memberIds.map((memberId) => ({
      memberId,
      point: byMember.get(memberId),
    })),
  });
}

function cloneState(state) {
  return {
    schemaVersion: state.schemaVersion,
    version: state.version,
    phase: state.phase,
    gameId: state.gameId,
    memberIds: [...state.memberIds],
    roundIndex: state.roundIndex,
    totalRounds: state.totalRounds,
    roundId: state.roundId,
    card: clonePublicCard(state.card),
    lastResult: state.lastResult ? cloneResult(state.lastResult) : null,
    summaries: state.summaries.map(cloneResult),
  };
}

function clonePublicCard(card) {
  return {
    id: card.id,
    title: card.title,
    clue: card.clue,
    era: card.era,
  };
}

function cloneResult(result) {
  return {
    roundId: result.roundId,
    cardId: result.cardId,
    target: { ...result.target },
    submissions: result.submissions.map((submission) => ({
      memberId: submission.memberId,
      point: { ...submission.point },
      distanceKm: submission.distanceKm,
    })),
    jointDistanceKm: result.jointDistanceKm,
    tierId: result.tierId,
    revealNote: result.revealNote,
  };
}

function isInitialState(state) {
  return state.phase === "guessing"
    && state.roundIndex === 0
    && state.lastResult === null
    && state.summaries.length === 0;
}

function normalizeMembers(value) {
  const members = readDenseArray(value);
  if (
    !members
    || members.length !== 2
    || members.some((memberId) => typeof memberId !== "string" || memberId.trim() !== memberId || !memberId)
    || members[0] === members[1]
  ) return null;
  return deepFreeze([...members]);
}

function readExactRecord(value, allowedKeys, { allowExtra = false } = {}) {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length > 0) return null;
  if (!allowExtra && Object.keys(descriptors).length !== allowedKeys.length) return null;
  const output = Object.create(null);
  for (const key of allowedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    output[key] = descriptor.value;
  }
  if (allowExtra) {
    for (const key of Object.keys(descriptors)) {
      if (!PRIVATE_CARD_KEYS.includes(key)) return null;
    }
  }
  return output;
}

function readDenseArray(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string" || !expected.has(key))) return null;
  const output = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    output.push(descriptor.value);
  }
  return output;
}

function validText(value, minimum, maximum) {
  return typeof value === "string"
    && value.trim() === value
    && [...value].length >= minimum
    && [...value].length <= maximum
    && !/[<>]/u.test(value)
    && !/(?:https?:\/\/|www\.|data:|blob:)/iu.test(value);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isGameId(value) {
  return typeof value === "string" && GAME_ID_PATTERN.test(value);
}

function sameMembers(left, right) {
  return left.length === 2 && left[0] === right[0] && left[1] === right[1];
}

function samePublicCard(left, right) {
  return left.id === right.id
    && left.title === right.title
    && left.clue === right.clue
    && left.era === right.era;
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function wrapToPi(value) {
  const wrapped = (value + Math.PI) % (2 * Math.PI);
  return (wrapped < 0 ? wrapped + 2 * Math.PI : wrapped) - Math.PI;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
