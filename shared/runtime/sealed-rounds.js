import { normalizeRoomId, RoomError } from "./rooms.js";

export class SealedRoundRegistry {
  constructor({ maxDataBytes = 2_048 } = {}) {
    this.maxDataBytes = maxDataBytes;
    this.rounds = new Map();
  }

  submit(rooms, senderId, payload = {}) {
    const roomId = normalizeRoomId(payload.roomId);
    if (!rooms.hasMember(roomId, senderId)) {
      throw new RoomError("NOT_A_MEMBER", "加入房间后才能提交密封选择。");
    }

    const namespace = normalizeNamespace(payload.namespace);
    const roundId = normalizeRoundId(payload.roundId);
    const room = rooms.snapshot(roomId);
    const participantIds = room.members.slice(0, 2).map((member) => member.id);
    if (participantIds.length !== 2) {
      throw new RoomError("SEALED_NOT_READY", "需要两位玩家才能开始密封轮次。");
    }
    if (!participantIds.includes(senderId)) {
      throw new RoomError("SEALED_NOT_A_PLAYER", "这个密封轮次已经有两位玩家。");
    }

    const data = cloneJsonValue(payload.data, this.maxDataBytes);
    const key = `${roomId}\u0000${namespace}\u0000${roundId}`;
    let round = this.rounds.get(key);
    if (!round) {
      round = {
        roomId,
        namespace,
        roundId,
        participantIds,
        submissions: new Map(),
        complete: false,
      };
      this.rounds.set(key, round);
    } else if (!sameMembers(round.participantIds, participantIds)) {
      this.rounds.delete(key);
      throw new RoomError("SEALED_MEMBERS_CHANGED", "房间成员已经变化，请重新开始这一轮。");
    }

    if (round.complete) {
      return publicReply(round, { replayed: true });
    }

    const previous = round.submissions.get(senderId);
    if (previous) {
      if (previous.canonical !== canonicalJson(data)) {
        throw new RoomError("SEALED_ALREADY_SUBMITTED", "这一轮已经提交，不能再修改选择。");
      }
      return publicReply(round, { idempotent: true });
    }

    round.submissions.set(senderId, { data, canonical: canonicalJson(data) });
    if (round.submissions.size < 2) return publicReply(round);

    round.complete = true;
    const submissions = round.participantIds.map((memberId) => ({
      memberId,
      data: round.submissions.get(memberId).data,
    }));
    return {
      ...publicReply(round),
      participantIds: [...round.participantIds],
      result: { roomId, namespace, roundId, submissions },
    };
  }

  clearRoom(roomId) {
    const normalized = normalizeRoomId(roomId);
    let cleared = 0;
    for (const [key, round] of this.rounds) {
      if (round.roomId !== normalized) continue;
      this.rounds.delete(key);
      cleared += 1;
    }
    return cleared;
  }
}

function publicReply(round, extra = {}) {
  return {
    roomId: round.roomId,
    namespace: round.namespace,
    roundId: round.roundId,
    pending: !round.complete,
    complete: round.complete,
    ...extra,
  };
}

function normalizeNamespace(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(normalized)) {
    throw new RoomError("INVALID_SEALED_NAMESPACE", "密封轮次类型格式不正确。");
  }
  return normalized;
}

function normalizeRoundId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(normalized)) {
    throw new RoomError("INVALID_SEALED_ROUND", "密封轮次编号格式不正确。");
  }
  return normalized;
}

function cloneJsonValue(value, maxDataBytes) {
  if (!isJsonValue(value, new Set())) {
    throw new RoomError("INVALID_SEALED_DATA", "密封数据必须是有限大小的 JSON 值。");
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > maxDataBytes) {
    throw new RoomError("SEALED_DATA_TOO_LARGE", "密封数据超过大小限制。");
  }
  return JSON.parse(serialized);
}

function isJsonValue(value, ancestors) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, ancestors))
    : Object.values(value).every((item) => isJsonValue(item, ancestors));
  ancestors.delete(value);
  return valid;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((memberId, index) => memberId === right[index]);
}
