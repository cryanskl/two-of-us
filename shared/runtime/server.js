import { createServer } from "node:http";
import { isIP } from "node:net";
import process from "node:process";
import QRCode from "qrcode";
import { Server as SocketServer } from "socket.io";
import { createCapabilitiesRuntime } from "./capabilities.js";
import { loadCatalog } from "./catalog.js";
import { computeContentIdentity, isContentIdentity } from "./content-identity.js";
import { getNetworkUrls } from "./network.js";
import {
  prepareDirectMessage,
  RoomRegistry,
  RoomError,
  normalizeRoomId,
} from "./rooms.js";
import { serveStatic } from "./static.js";
import { SealedRoundRegistry } from "./sealed-rounds.js";
import {
  RUNTIME_HEADER_NAME,
  RUNTIME_HEADER_VALUE,
} from "../../scripts/runtime-reuse.mjs";

const defaultHost = "0.0.0.0";

export async function createRuntimeServer({
  rootDir = new URL("../../", import.meta.url),
  host = defaultHost,
  preferredPort = 4173,
  maxPortAttempts = 20,
  dataDir,
  contentIdentity,
  contentIdentityProvider = computeContentIdentity,
  identityCacheMs = 2000,
} = {}) {
  const resolvedContentIdentity = contentIdentity
    ?? await contentIdentityProvider(rootDir);
  if (!isContentIdentity(resolvedContentIdentity)) {
    throw new Error("运行时内容身份格式无效。");
  }
  const catalog = await loadCatalog(rootDir);
  const capabilities = createCapabilitiesRuntime({
    rootDir,
    ...(dataDir === undefined ? {} : { dataDir }),
  });
  const rooms = new RoomRegistry({ maxMembers: 2 });
  const sealedRounds = new SealedRoundRegistry();
  let runtimeDetails = null;
  let inFlightContentIdentityCheck = null;
  let cachedContentIdentityCheck = null;

  function getReusableContentIdentity() {
    // 全量内容身份要读入并哈希整个 experiences/（本仓库约 1 秒、100 MB 磁盘读）。
    // 每个 /api/health 请求都重算既慢又是零成本的磁盘放大，这里给结果一个短 TTL。
    if (cachedContentIdentityCheck
      && Date.now() - cachedContentIdentityCheck.at < identityCacheMs) {
      return Promise.resolve(cachedContentIdentityCheck.value);
    }
    if (inFlightContentIdentityCheck) return inFlightContentIdentityCheck;
    inFlightContentIdentityCheck = Promise.resolve()
      .then(() => contentIdentityProvider(rootDir))
      .then((currentIdentity) => (
        currentIdentity === resolvedContentIdentity ? resolvedContentIdentity : null
      ))
      .catch(() => null)
      .then((value) => {
        cachedContentIdentityCheck = { value, at: Date.now() };
        return value;
      })
      .finally(() => { inFlightContentIdentityCheck = null; });
    return inFlightContentIdentityCheck;
  }

  const httpServer = createServer(async (request, response) => {
    try {
      // 运行时默认监听 0.0.0.0，浏览器却可能带着攻击者控制的 DNS 名来访问
      // （DNS 重绑定）。合法入口只有 localhost 与二维码里的局域网 IP 直连，
      // 因此 Host 只放行 IP 字面量、localhost 和链路本地的 mDNS 名。
      if (!isTrustedHostHeader(request.headers.host)) {
        return sendJson(request, response, 403, { error: "FORBIDDEN_HOST" });
      }

      const url = new URL(request.url ?? "/", "http://localhost");
      const readMethod = request.method === "GET" || request.method === "HEAD";

      if (await capabilities.handleRequest(request, response, url)) return;

      if (url.pathname.startsWith("/api/") && !readMethod) {
        return sendJson(request, response, 405, { error: "METHOD_NOT_ALLOWED" }, {
          allow: "GET, HEAD",
        });
      }

      if (url.pathname === "/api/health") {
        const reusableContentIdentity = await getReusableContentIdentity();
        return sendJson(request, response, 200, {
          ok: true,
          service: "two-of-us",
          version: 1,
          node: process.versions.node,
          contentIdentity: reusableContentIdentity,
          ...runtimeDetails,
        }, {
          [RUNTIME_HEADER_NAME]: RUNTIME_HEADER_VALUE,
        });
      }

      if (url.pathname === "/api/catalog") {
        return sendJson(request, response, 200, catalog, {
          [RUNTIME_HEADER_NAME]: RUNTIME_HEADER_VALUE,
        });
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
    // cors: false 只是不下发 CORS 头，挡不住 WebSocket：任意外部网页都能
    // 直接向本机 4173 发起 WebSocket 握手并加入房间。这里要求握手要么不带
    // Origin（非浏览器客户端），要么与 Host 同源（本服务自己发出的页面）。
    allowRequest: (handshakeRequest, callback) => {
      const allowed = isTrustedHostHeader(handshakeRequest.headers.host)
        && isSameOriginOrAbsent(handshakeRequest.headers.origin, handshakeRequest.headers.host);
      callback(null, allowed);
    },
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
      const localUrl = `http://127.0.0.1:${port}/`;
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
  const finalPort = Math.min(65535, preferredPort + maxAttempts - 1);
  for (let port = preferredPort; port <= finalPort; port += 1) {
    try {
      return await listenOnce(server, host, port);
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
      lastError = error;
    }
  }
  throw new Error(`端口 ${preferredPort} 到 ${finalPort} 均被占用。`, {
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

export function isTrustedHostHeader(hostHeader) {
  if (typeof hostHeader !== "string" || hostHeader === "") return false;
  let hostname;
  try {
    hostname = new URL(`http://${hostHeader}`).hostname;
  } catch {
    return false;
  }
  const bare = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  if (isIP(bare) !== 0) return true;
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local");
}

export function isSameOriginOrAbsent(origin, hostHeader) {
  if (origin === undefined) return true;
  try {
    return new URL(origin).host === hostHeader;
  } catch {
    return false;
  }
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
