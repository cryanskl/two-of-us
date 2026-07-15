import { randomInt } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomRegistry {
  constructor({ maxMembers = 8, codeLength = 5 } = {}) {
    this.maxMembers = maxMembers;
    this.codeLength = codeLength;
    this.rooms = new Map();
  }

  create(socketId, name = "主机") {
    const roomId = this.#uniqueCode();
    const room = {
      id: roomId,
      createdAt: new Date().toISOString(),
      members: new Map(),
    };
    this.rooms.set(roomId, room);
    this.#addMember(room, socketId, name, "host");
    return this.snapshot(roomId);
  }

  join(roomId, socketId, name = "玩家") {
    const normalizedId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedId);
    if (!room) throw new RoomError("ROOM_NOT_FOUND", "没有找到这个房间，请检查房间码。");
    if (!room.members.has(socketId) && room.members.size >= this.maxMembers) {
      throw new RoomError("ROOM_FULL", "房间人数已满。");
    }
    this.#addMember(room, socketId, name, room.members.get(socketId)?.role ?? "guest");
    return this.snapshot(normalizedId);
  }

  leave(roomId, socketId) {
    const normalizedId = normalizeRoomId(roomId);
    const room = this.rooms.get(normalizedId);
    if (!room) return null;

    room.members.delete(socketId);
    if (room.members.size === 0) {
      this.rooms.delete(normalizedId);
      return null;
    }

    if (![...room.members.values()].some((member) => member.role === "host")) {
      room.members.values().next().value.role = "host";
    }
    return this.snapshot(normalizedId);
  }

  leaveAll(socketId) {
    const changed = [];
    for (const roomId of [...this.rooms.keys()]) {
      const room = this.rooms.get(roomId);
      if (!room.members.has(socketId)) continue;
      changed.push({ roomId, state: this.leave(roomId, socketId) });
    }
    return changed;
  }

  hasMember(roomId, socketId) {
    try {
      return this.rooms.get(normalizeRoomId(roomId))?.members.has(socketId) ?? false;
    } catch {
      return false;
    }
  }

  snapshot(roomId) {
    const room = this.rooms.get(normalizeRoomId(roomId));
    if (!room) return null;
    return {
      id: room.id,
      createdAt: room.createdAt,
      members: [...room.members.values()].map((member) => ({ ...member })),
    };
  }

  #addMember(room, socketId, name, role) {
    room.members.set(socketId, {
      id: socketId,
      name: sanitizeName(name),
      role,
    });
  }

  #uniqueCode() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      let code = "";
      for (let index = 0; index < this.codeLength; index += 1) {
        code += alphabet[randomInt(alphabet.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new RoomError("ROOM_CODE_EXHAUSTED", "暂时无法创建房间，请稍后重试。");
  }
}

export class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RoomError";
    this.code = code;
  }
}

export function normalizeRoomId(roomId) {
  const normalized = String(roomId ?? "").trim().toUpperCase();
  if (!/^[A-Z2-9]{4,8}$/.test(normalized)) {
    throw new RoomError("INVALID_ROOM_ID", "房间码格式不正确。");
  }
  return normalized;
}

export function prepareDirectMessage(rooms, senderId, payload = {}) {
  const roomId = normalizeRoomId(payload.roomId);
  if (!rooms.hasMember(roomId, senderId)) {
    throw new RoomError("NOT_A_MEMBER", "加入房间后才能发送定向消息。");
  }

  const targetId = String(payload.targetId ?? "");
  if (!rooms.hasMember(roomId, targetId)) {
    throw new RoomError("TARGET_NOT_IN_ROOM", "目标成员不在这个房间中。");
  }

  return {
    targetId,
    message: {
      roomId,
      senderId,
      type: String(payload.type ?? "action").slice(0, 48),
      data: payload.data ?? null,
    },
  };
}

function sanitizeName(name) {
  const value = String(name ?? "").trim().slice(0, 24);
  return value || "玩家";
}
