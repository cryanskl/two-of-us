import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { RoomError, RoomRegistry } from "./rooms.js";
import { SealedRoundRegistry } from "./sealed-rounds.js";
import { createRuntimeServer, registerRoomProtocol } from "./server.js";

class FakeIo {
  constructor() {
    this.emissions = [];
    this.connectionHandler = null;
  }

  on(event, handler) {
    if (event === "connection") this.connectionHandler = handler;
  }

  connect(id) {
    const socket = new FakeSocket(id, this.emissions);
    this.connectionHandler(socket);
    return socket;
  }

  to(target) {
    return {
      emit: (event, data) => this.emissions.push({ target, event, data }),
    };
  }
}

class FakeSocket {
  constructor(id, emissions) {
    this.id = id;
    this.emissions = emissions;
    this.listeners = new Map();
  }

  on(event, handler) {
    this.listeners.set(event, handler);
  }

  join() {}

  leave() {}

  to(target) {
    return {
      emit: (event, data) => this.emissions.push({ target, event, data, senderId: this.id }),
    };
  }

  request(event, payload = {}) {
    return new Promise((resolve) => this.listeners.get(event)(payload, resolve));
  }

  disconnect() {
    this.listeners.get("disconnect")();
  }
}

class TrackingSealedRoundRegistry extends SealedRoundRegistry {
  constructor() {
    super();
    this.clearMemberCalls = [];
    this.clearRoomCalls = [];
  }

  clearMember(roomId, memberId) {
    this.clearMemberCalls.push([roomId, memberId]);
    return super.clearMember(roomId, memberId);
  }

  clearRoom(roomId) {
    this.clearRoomCalls.push(roomId);
    return super.clearRoom(roomId);
  }
}

async function createSafePortBlocker() {
  for (let port = 42000; port <= 64000; port += 1) {
    const server = createServer();
    server.listen(port, "127.0.0.1");
    try {
      await once(server, "listening");
      return { server, port };
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  throw new Error("测试端口区间 42000 到 64000 均被占用。");
}

test("runtime serves health, catalog, portal, and releases its port", async (context) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-runtime-data-"));
  context.after(() => rm(dataDir, { recursive: true, force: true }));
  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "127.0.0.1",
    preferredPort: 0,
    dataDir,
  });
  context.after(() => runtime.stop());

  const details = await runtime.start();
  const healthResponse = await fetch(`${details.localUrl}api/health`);
  const health = await healthResponse.json();
  const catalogResponse = await fetch(`${details.localUrl}api/catalog`);
  const catalog = await catalogResponse.json();
  const capabilitiesResponse = await fetch(`${details.localUrl}api/capabilities`);
  const capabilities = await capabilitiesResponse.json();
  const healthHeadResponse = await fetch(`${details.localUrl}api/health`, { method: "HEAD" });
  const catalogHeadResponse = await fetch(`${details.localUrl}api/catalog`, { method: "HEAD" });
  const rejectedPostResponse = await fetch(`${details.localUrl}api/catalog`, { method: "POST" });
  const portalResponse = await fetch(details.localUrl);
  const vendorResponse = await fetch(`${details.localUrl}vendor/pannellum/2.5.7/pannellum.js`);
  const missingResponse = await fetch(`${details.localUrl}api/not-found`);

  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get("x-two-of-us-runtime"), "1");
  assert.equal(health.ok, true);
  assert.equal(health.port, details.port);
  assert.match(health.contentIdentity, /^sha256:[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(health), new RegExp(projectRootPattern()));
  assert.match(health.qrDataUrl, /^data:image\/png;base64,/);
  assert.equal(catalog.experiences[0].id, "love-tree");
  assert.equal(catalogResponse.headers.get("x-two-of-us-runtime"), "1");
  assert.equal(capabilitiesResponse.status, 200);
  assert.equal(capabilitiesResponse.headers.get("x-two-of-us-runtime"), null);
  assert.equal(capabilities.capabilities[0].id, "speech-whisper-base");
  assert.equal(capabilities.capabilities[0].state, "missing");
  assert.equal(capabilities.capabilities[0].artifacts[0].bytes, 147951465);
  assert.equal(capabilities.capabilities[0].artifacts[0].href, null);
  assert.doesNotMatch(JSON.stringify(capabilities), new RegExp(dataDir));
  assert.equal(healthHeadResponse.status, 200);
  assert.equal(healthHeadResponse.headers.get("x-two-of-us-runtime"), "1");
  assert.ok(Number(healthHeadResponse.headers.get("content-length")) > 0);
  assert.equal(await healthHeadResponse.text(), "");
  assert.equal(catalogHeadResponse.status, 200);
  assert.equal(catalogHeadResponse.headers.get("x-two-of-us-runtime"), "1");
  assert.equal(await catalogHeadResponse.text(), "");
  assert.equal(rejectedPostResponse.status, 405);
  assert.equal(rejectedPostResponse.headers.get("x-two-of-us-runtime"), null);
  assert.equal(rejectedPostResponse.headers.get("allow"), "GET, HEAD");
  assert.equal(portalResponse.status, 200);
  assert.equal(portalResponse.headers.get("x-two-of-us-runtime"), null);
  assert.match(await portalResponse.text(), /Two of Us/);
  assert.equal(vendorResponse.status, 200);
  assert.equal(vendorResponse.headers.get("x-two-of-us-runtime"), null);
  assert.match(vendorResponse.headers.get("content-type"), /^text\/javascript/);
  assert.match(await vendorResponse.text(), /pannellum/);
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.headers.get("x-two-of-us-runtime"), null);

  await runtime.stop();
  assert.equal(runtime.httpServer.listening, false);
});

function projectRootPattern() {
  const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
  return root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("runtime advertises its IPv4 listener even when the same port has an IPv6-only service", async (context) => {
  const foreign = createServer((_request, response) => response.end("ipv6-foreign"));
  try {
    foreign.listen({ host: "::1", port: 0, ipv6Only: true });
    await once(foreign, "listening");
  } catch (error) {
    if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") {
      context.skip(`当前环境没有可用 IPv6 loopback：${error.code}`);
      return;
    }
    throw error;
  }
  context.after(() => new Promise((resolve) => foreign.close(resolve)));

  const port = foreign.address().port;
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-runtime-address-family-"));
  context.after(() => rm(dataDir, { recursive: true, force: true }));
  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "0.0.0.0",
    preferredPort: port,
    maxPortAttempts: 1,
    dataDir,
  });
  context.after(() => runtime.stop());

  const details = await runtime.start();
  assert.equal(details.localUrl, `http://127.0.0.1:${port}/`);
  const [runtimeResponse, foreignResponse] = await Promise.all([
    fetch(`${details.localUrl}api/health`),
    fetch(`http://[::1]:${port}/`),
  ]);
  assert.equal(runtimeResponse.headers.get("x-two-of-us-runtime"), "1");
  assert.equal((await runtimeResponse.json()).service, "two-of-us");
  assert.equal(await foreignResponse.text(), "ipv6-foreign");
});

test("runtime listener truncates its occupied window at 65535", async (context) => {
  const blockers = [];
  for (const port of [65534, 65535]) {
    const blocker = createServer();
    try {
      blocker.listen(port, "127.0.0.1");
      await once(blocker, "listening");
      blockers.push(blocker);
    } catch (error) {
      if (error.code !== "EADDRINUSE") throw error;
    }
  }
  context.after(async () => {
    await Promise.all(blockers.map((blocker) => new Promise((resolve) => blocker.close(resolve))));
  });

  const dataDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-runtime-boundary-"));
  context.after(() => rm(dataDir, { recursive: true, force: true }));
  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "127.0.0.1",
    preferredPort: 65534,
    maxPortAttempts: 20,
    dataDir,
  });
  context.after(() => runtime.stop());

  await assert.rejects(runtime.start(), (error) => {
    assert.match(error.message, /端口 65534 到 65535 均被占用/);
    assert.doesNotMatch(`${error.message}\n${error.cause?.message ?? ""}`, /ERR_SOCKET_BAD_PORT|65536/);
    return true;
  });
});

test("runtime selects the next port when the preferred one is occupied", async (context) => {
  const { server: blocker, port: occupiedPort } = await createSafePortBlocker();
  context.after(() => new Promise((resolve) => blocker.close(resolve)));
  const maxPortAttempts = 32;

  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "127.0.0.1",
    preferredPort: occupiedPort,
    maxPortAttempts,
  });
  context.after(() => runtime.stop());

  const details = await runtime.start();
  assert.ok(details.port > occupiedPort);
  assert.ok(details.port < occupiedPort + maxPortAttempts);
});

test("runtime room registry rejects a third member with ROOM_FULL", async (context) => {
  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "127.0.0.1",
    preferredPort: 0,
  });
  context.after(() => runtime.stop());

  const room = runtime.rooms.create("socket-a", "小猫");
  runtime.rooms.join(room.id, "socket-b", "小狗");
  assert.throws(
    () => runtime.rooms.join(room.id, "socket-c", "第三人"),
    (error) => error instanceof RoomError && error.code === "ROOM_FULL",
  );
});

test("room protocol cleans sealed rounds by participant before clearing an empty room", async () => {
  const io = new FakeIo();
  const rooms = new RoomRegistry();
  const sealedRounds = new TrackingSealedRoundRegistry();
  registerRoomProtocol(io, rooms, sealedRounds);
  const playerA = io.connect("socket-a");
  const playerB = io.connect("socket-b");
  const third = io.connect("socket-c");

  const created = await playerA.request("room:create", { name: "小猫" });
  const roomId = created.room.id;
  await playerB.request("room:join", { roomId, name: "小狗" });
  await third.request("room:join", { roomId, name: "第三人" });
  const pending = await playerA.request("room:sealed-submit", {
    roomId, namespace: "rps", roundId: "round-1", data: { choice: "rock" },
  });
  assert.equal(pending.pending, true);

  await third.request("room:leave", { roomId });
  assert.deepEqual(sealedRounds.clearMemberCalls, [[roomId, "socket-c"]]);
  assert.deepEqual(sealedRounds.clearRoomCalls, []);
  const complete = await playerB.request("room:sealed-submit", {
    roomId, namespace: "rps", roundId: "round-1", data: { choice: "paper" },
  });
  assert.equal(complete.complete, true);

  await playerA.request("room:sealed-submit", {
    roomId, namespace: "rps", roundId: "round-2", data: { choice: "rock" },
  });
  playerA.disconnect();
  await third.request("room:join", { roomId, name: "第三人" });
  const replacementPending = await playerB.request("room:sealed-submit", {
    roomId, namespace: "rps", roundId: "round-2", data: { choice: "paper" },
  });
  assert.equal(replacementPending.pending, true);
  const replacementComplete = await third.request("room:sealed-submit", {
    roomId, namespace: "rps", roundId: "round-2", data: { choice: "scissors" },
  });
  assert.equal(replacementComplete.complete, true);

  await playerB.request("room:leave", { roomId });
  assert.deepEqual(sealedRounds.clearRoomCalls, []);
  third.disconnect();
  assert.deepEqual(sealedRounds.clearRoomCalls, [roomId]);
  assert.equal(rooms.snapshot(roomId), null);
});
