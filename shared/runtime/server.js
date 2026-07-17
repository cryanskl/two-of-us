import { createServer } from "node:http";
import process from "node:process";
import QRCode from "qrcode";
import { Server as SocketServer } from "socket.io";
import { createCapabilitiesRuntime } from "./capabilities.js";
import { loadCatalog } from "./catalog.js";
import { getNetworkUrls } from "./network.js";
import {
  prepareDirectMessage,
  RoomRegistry,
  RoomError,
  normalizeRoomId,
} from "./rooms.js";
import { serveStatic } from "./static.js";
import { SealedRoundRegistry } from "./sealed-rounds.js";

const defaultHost = "0.0.0.0";

export async function createRuntimeServer({
  rootDir = new URL("../../", import.meta.url),
  host = defaultHost,
  preferredPort = 4173,
  maxPortAttempts = 20,
  dataDir,
} = {}) {
  const catalog = await loadCatalog(rootDir);
  const capabilities = createCapabilitiesRuntime({
    rootDir,
    ...(dataDir === undefined ? {} : { dataDir }),
  });
  const rooms = new RoomRegistry({ maxMembers: 2 });
  const sealedRounds = new SealedRoundRegistry();
  let runtimeDetails = null;

  const httpServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const readMethod = request.method === "GET" || request.method === "HEAD";

      if (await capabilities.handleRequest(request, response, url)) return;

      if (url.pathname.startsWith("/api/") && !readMethod) {
        return sendJson(request, response, 405, { error: "METHOD_NOT_ALLOWED" }, {
          allow: "GET, HEAD",
        });
      }

      if (url.pathname === "/api/health") {
        return sendJson(request, response, 200, {
          ok: true,
          service: "two-of-us",
          version: 1,
          node: process.versions.node,
          ...runtimeDetails,
        });
      }

      if (url.pathname === "/api/catalog") {
        return sendJson(request, response, 200, catalog);
      }

      if (!readMethod) {
        return sendJson(request, response, 405, { error: "METHOD_NOT_ALLOWED" }, {
          allow: "GET, HEAD",
        });
      }

      if (await serveStatic(request, response, rootDir, url.pathname)) return;
      sendJson(request, response, 404, { error: "NOT_FOUND" });
    } catch (error) {
      console.error(error);
      if (!response.headersSent) sendJson(request, response, 500, { error: "INTERNAL_ERROR" });
      else response.destroy();
    }
  });

  const io = new SocketServer(httpServer, {
    serveClient: true,
    maxHttpBufferSize: 100_000,
    cors: false,
  });
  registerRoomProtocol(io, rooms, sealedRounds);

  return {
    catalog,
    capabilities,
    rooms,
    sealedRounds,
    httpServer,
    io,
    async start() {
      if (runtimeDetails) return runtimeDetails;
      const port = await listenOnAvailablePort(httpServer, host, preferredPort, maxPortAttempts);
      const localUrl = `http://localhost:${port}/`;
      const networkUrls = getNetworkUrls(port);
      const joinUrl = networkUrls[0] ?? localUrl;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
      });
      runtimeDetails = { port, localUrl, networkUrls, joinUrl, qrDataUrl };
      return runtimeDetails;
    },
    async stop() {
      if (!httpServer.listening) {
        runtimeDetails = null;
        return;
      }
      await new Promise((resolve) => io.close(resolve));
      runtimeDetails = null;
    },
  };
}

export function registerRoomProtocol(io, rooms, sealedRounds = new SealedRoundRegistry()) {
  io.on("connection", (socket) => {
    socket.on("room:create", async (payload = {}, callback) => {
      const reply = acknowledge(callback);
      try {
        const state = rooms.create(socket.id, payload.name);
        await socket.join(roomChannel(state.id));
        reply({ ok: true, room: state });
        io.to(roomChannel(state.id)).emit("room:state", state);
      } catch (error) {
        reply(toProtocolError(error));
      }
    });

    socket.on("room:join", async (payload = {}, callback) => {
      const reply = acknowledge(callback);
      try {
        const state = rooms.join(payload.roomId, socket.id, payload.name);
        await socket.join(roomChannel(state.id));
        reply({ ok: true, room: state });
        io.to(roomChannel(state.id)).emit("room:state", state);
      } catch (error) {
        reply(toProtocolError(error));
      }
    });

    socket.on("room:leave", async (payload = {}, callback) => {
      const reply = acknowledge(callback);
      try {
        const roomId = normalizeRoomId(payload.roomId);
        if (!rooms.hasMember(roomId, socket.id)) {
          throw new RoomError("NOT_A_MEMBER", "你不在这个房间中。");
        }
        const state = rooms.leave(roomId, socket.id);
        sealedRounds.clearMember(roomId, socket.id);
        if (!state) sealedRounds.clearRoom(roomId);
        await socket.leave(roomChannel(roomId));
        reply({ ok: true, room: state });
        if (state) io.to(roomChannel(roomId)).emit("room:state", state);
      } catch (error) {
        reply(toProtocolError(error));
      }
    });

    socket.on("room:action", (payload = {}, callback) => {
      const reply = acknowledge(callback);
      try {
        const roomId = normalizeRoomId(payload.roomId);
        if (!rooms.hasMember(roomId, socket.id)) {
          throw new RoomError("NOT_A_MEMBER", "加入房间后才能发送操作。");
        }
        socket.to(roomChannel(roomId)).emit("room:action", {
          roomId,
          senderId: socket.id,
          type: String(payload.type ?? "action").slice(0, 48),
          data: payload.data ?? null,
        });
        reply({ ok: true });
      } catch (error) {
        reply(toProtocolError(error));
      }
    });

    socket.on("room:direct", (payload = {}, callback) => {
      const reply = acknowledge(callback);
      try {
        const { targetId, message } = prepareDirectMessage(rooms, socket.id, payload);
        io.to(targetId).emit("room:direct", message);
        reply({ ok: true });
      } catch (error) {
        reply(toProtocolError(error));
      }
    });

    socket.on("room:sealed-submit", (payload = {}, callback) => {
      const reply = acknowledge(callback);
      try {
        const outcome = sealedRounds.submit(rooms, socket.id, payload);
        if (outcome.result && outcome.participantIds) {
          for (const participantId of outcome.participantIds) {
            io.to(participantId).emit("room:sealed-result", outcome.result);
          }
        }
        reply({
          ok: true,
          pending: outcome.pending,
          complete: outcome.complete,
          idempotent: outcome.idempotent === true,
          replayed: outcome.replayed === true,
        });
      } catch (error) {
        reply(toProtocolError(error));
      }
    });

    socket.on("disconnect", () => {
      for (const { roomId, state } of rooms.leaveAll(socket.id)) {
        sealedRounds.clearMember(roomId, socket.id);
        if (!state) sealedRounds.clearRoom(roomId);
        if (state) io.to(roomChannel(roomId)).emit("room:state", state);
      }
    });
  });
}

async function listenOnAvailablePort(server, host, preferredPort, maxAttempts) {
  if (preferredPort === 0) return listenOnce(server, host, 0);

  let lastError;
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    try {
      return await listenOnce(server, host, preferredPort + offset);
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
      lastError = error;
    }
  }
  throw new Error(`端口 ${preferredPort} 到 ${preferredPort + maxAttempts - 1} 均被占用。`, {
    cause: lastError,
  });
}

function listenOnce(server, host, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(server.address().port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function sendJson(request, response, statusCode, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  if (request.method === "HEAD") response.end();
  else response.end(body);
}

function roomChannel(roomId) {
  return `room:${roomId}`;
}

function acknowledge(callback) {
  return typeof callback === "function" ? callback : () => {};
}

function toProtocolError(error) {
  if (error instanceof RoomError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  console.error(error);
  return { ok: false, error: { code: "INTERNAL_ERROR", message: "本地房间出现错误。" } };
}
