import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { installCapability } from "../../scripts/capabilities-lib.mjs";
import {
  createCapabilitiesRuntime,
  isLoopbackAddress,
  parseSingleRange,
} from "./capabilities.js";

const payload = Buffer.from("runtime capability fixture\n");
const payloadSha256 = createHash("sha256").update(payload).digest("hex");

test("loopback detection covers IPv4, IPv6, and mapped addresses", () => {
  assert.equal(isLoopbackAddress("127.0.0.1"), true);
  assert.equal(isLoopbackAddress("127.12.0.4"), true);
  assert.equal(isLoopbackAddress("::1"), true);
  assert.equal(isLoopbackAddress("0:0:0:0:0:0:0:1"), true);
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("::ffff:7f00:1"), true);
  assert.equal(isLoopbackAddress("192.168.1.8"), false);
  assert.equal(isLoopbackAddress("::ffff:192.168.1.8"), false);
  assert.equal(isLoopbackAddress(undefined), false);
});

test("single range parser accepts complete forms and rejects ambiguous ranges", () => {
  assert.equal(parseSingleRange(undefined, 10), null);
  assert.deepEqual(parseSingleRange("bytes=2-5", 10), { start: 2, end: 5 });
  assert.deepEqual(parseSingleRange("bytes=7-", 10), { start: 7, end: 9 });
  assert.deepEqual(parseSingleRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.deepEqual(parseSingleRange("bytes=0-99", 10), { start: 0, end: 9 });
  assert.equal(parseSingleRange("bytes=10-", 10), false);
  assert.equal(parseSingleRange("bytes=5-2", 10), false);
  assert.equal(parseSingleRange("bytes=0-1,4-5", 10), false);
  assert.equal(parseSingleRange("items=0-1", 10), false);
});

test("public status DTO is sanitized and concurrent reads share one provider", async (context) => {
  const fixture = await createFixture(context, { install: false });
  let calls = 0;
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const runtime = createCapabilitiesRuntime({
    rootDir: fixture.rootDir,
    dataDir: fixture.dataDir,
    async statusProvider({ id }) {
      calls += 1;
      await waiting;
      return {
        id,
        state: "available",
        code: "OK",
        message: "available",
        installDir: "/private/secret/path",
        receipt: { installedAt: "secret" },
        manifest: fixture.manifest,
      };
    },
  });

  const first = runtime.getPublicStatuses();
  const second = runtime.getPublicStatuses();
  await new Promise((resolve) => setImmediate(resolve));
  release();
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.deepEqual(firstResult, secondResult);
  const serialized = JSON.stringify(firstResult);
  assert.doesNotMatch(serialized, /private\/secret|installedAt|example\.invalid|sha256/i);
  assert.deepEqual(firstResult.capabilities[0].artifacts, [{
    id: "fixture-model",
    bytes: payload.length,
    href: "/api/capabilities/fixture-speech/artifacts/fixture-model",
  }]);
});

test("status endpoint supports GET and HEAD without exposing internal paths", async (context) => {
  const fixture = await createFixture(context);
  const server = await startRuntimeServer(context, fixture);

  const response = await fetch(`${server.url}/api/capabilities`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.capabilities[0].state, "available");
  assert.doesNotMatch(JSON.stringify(body), new RegExp(escapeRegExp(fixture.baseDir)));

  const head = await fetch(`${server.url}/api/capabilities`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.ok(Number(head.headers.get("content-length")) > 0);

  const post = await fetch(`${server.url}/api/capabilities`, { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});

test("capability routes reject non-loopback clients before reading status", async (context) => {
  const fixture = await createFixture(context, { install: false });
  let statusCalls = 0;
  const runtime = createCapabilitiesRuntime({
    rootDir: fixture.rootDir,
    dataDir: fixture.dataDir,
    async statusProvider() {
      statusCalls += 1;
      throw new Error("non-loopback requests must not reach the provider");
    },
  });
  const response = createResponseRecorder();

  const handled = await runtime.handleRequest({
    method: "GET",
    url: "/api/capabilities",
    headers: {},
    socket: { remoteAddress: "192.168.1.23" },
  }, response, "/api/capabilities");

  assert.equal(handled, true);
  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, "CAPABILITY_LOCAL_ONLY");
  assert.equal(statusCalls, 0);
});

test("artifact endpoint serves exact bytes, HEAD, and single ranges", async (context) => {
  const fixture = await createFixture(context);
  const server = await startRuntimeServer(context, fixture);
  const artifactUrl = `${server.url}/api/capabilities/fixture-speech/artifacts/fixture-model`;

  const complete = await fetch(artifactUrl);
  assert.equal(complete.status, 200);
  assert.deepEqual(Buffer.from(await complete.arrayBuffer()), payload);
  assert.equal(complete.headers.get("content-type"), "application/octet-stream");
  assert.equal(complete.headers.get("accept-ranges"), "bytes");
  assert.equal(complete.headers.get("cache-control"), "private, no-store");
  assert.equal(complete.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(complete.headers.get("x-content-type-options"), "nosniff");

  const partial = await fetch(artifactUrl, { headers: { range: "bytes=2-7" } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("content-range"), `bytes 2-7/${payload.length}`);
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()), payload.subarray(2, 8));

  const suffix = await fetch(artifactUrl, { headers: { range: "bytes=-4" } });
  assert.equal(suffix.status, 206);
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), payload.subarray(-4));

  const head = await fetch(artifactUrl, { method: "HEAD", headers: { range: "bytes=0-3" } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get("content-length"), "4");
  assert.equal(await head.text(), "");
});

test("artifact endpoint rejects invalid ranges, unknown IDs, and encoded traversal", async (context) => {
  const fixture = await createFixture(context);
  const server = await startRuntimeServer(context, fixture);
  const base = `${server.url}/api/capabilities/fixture-speech/artifacts`;

  const invalidRange = await fetch(`${base}/fixture-model`, { headers: { range: "bytes=0-1,4-5" } });
  assert.equal(invalidRange.status, 416);
  assert.equal(invalidRange.headers.get("content-range"), `bytes */${payload.length}`);

  assert.equal((await fetch(`${base}/unknown-model`)).status, 404);
  assert.equal((await fetch(`${server.url}/api/capabilities/unknown-capability/artifacts/fixture-model`)).status, 404);
  assert.equal((await fetch(`${base}/%252e%252e`)).status, 404);
  assert.equal((await fetch(`${base}/fixture%2Fmodel`)).status, 404);
  assert.equal((await fetch(`${base}/fixture%5Cmodel`)).status, 404);
  assert.equal((await fetch(`${base}/fixture-model/receipt.json`)).status, 404);
});

test("realpath containment rejects an installed artifact symlink to another directory", async (context) => {
  const fixture = await createFixture(context);
  const artifactPath = path.join(fixture.dataDir, "capabilities", fixture.manifest.id, "models", "fixture.bin");
  const outsidePath = path.join(fixture.baseDir, "outside.bin");
  await writeFile(outsidePath, payload);
  await rm(artifactPath);
  await symlink(outsidePath, artifactPath);
  const server = await startRuntimeServer(context, fixture);

  const response = await fetch(`${server.url}/api/capabilities/fixture-speech/artifacts/fixture-model`);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "ARTIFACT_UNSAFE");
});

test("realpath containment rejects a capability directory symlink outside the data root", async (context) => {
  const fixture = await createFixture(context);
  const installDir = path.join(fixture.dataDir, "capabilities", fixture.manifest.id);
  const outsideDir = path.join(fixture.baseDir, "outside-capability");
  await rename(installDir, outsideDir);
  await symlink(outsideDir, installDir, "dir");
  const server = await startRuntimeServer(context, fixture);

  const response = await fetch(`${server.url}/api/capabilities/fixture-speech/artifacts/fixture-model`);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "ARTIFACT_UNSAFE");
});

test("unavailable capability never serves artifact bytes", async (context) => {
  const fixture = await createFixture(context, { install: false });
  const server = await startRuntimeServer(context, fixture);
  const statusResponse = await fetch(`${server.url}/api/capabilities`);
  const publicStatus = (await statusResponse.json()).capabilities[0];
  const response = await fetch(`${server.url}/api/capabilities/fixture-speech/artifacts/fixture-model`);

  assert.deepEqual(publicStatus.artifacts, [{
    id: "fixture-model",
    bytes: payload.length,
    href: null,
  }]);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).state, "missing");
});

async function createFixture(context, { install = true } = {}) {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-runtime-capabilities-"));
  const rootDir = path.join(baseDir, "repo");
  const dataDir = path.join(baseDir, "data");
  const manifest = makeManifest();
  const manifestDir = path.join(rootDir, "capabilities", manifest.id);
  await mkdir(manifestDir, { recursive: true });
  await writeFile(path.join(manifestDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (install) {
    await installCapability({
      rootDir,
      dataDir,
      id: manifest.id,
      fetchImpl: async () => new Response(payload, {
        status: 200,
        headers: { "content-length": payload.length },
      }),
    });
  }
  context.after(() => rm(baseDir, { recursive: true, force: true }));
  return { baseDir, rootDir, dataDir, manifest };
}

function makeManifest() {
  return {
    schemaVersion: 1,
    protocolVersion: 1,
    id: "fixture-speech",
    engine: { name: "Fixture Engine", version: "1.0.0", revision: "test", license: "MIT" },
    model: {
      name: "Fixture Model",
      revision: "test",
      license: "CC0-1.0",
      artifactId: "fixture-model",
      bytes: payload.length,
      sha256: payloadSha256,
    },
    requirements: {
      microphone: true,
      worker: true,
      wasmSimd: false,
      crossOriginIsolated: false,
      recommendedMemoryMiB: 64,
    },
    artifacts: [{
      id: "fixture-model",
      path: "models/fixture.bin",
      url: "https://example.invalid/model.bin",
      bytes: payload.length,
      sha256: payloadSha256,
    }],
  };
}

async function startRuntimeServer(context, fixture) {
  const runtime = createCapabilitiesRuntime({ rootDir: fixture.rootDir, dataDir: fixture.dataDir });
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (await runtime.handleRequest(request, response, url)) return;
    response.writeHead(404).end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  return { runtime, url: `http://127.0.0.1:${server.address().port}` };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createResponseRecorder() {
  return {
    statusCode: null,
    headers: null,
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = "") {
      this.body = String(body);
    },
  };
}
