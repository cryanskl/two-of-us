import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CapabilityError,
  doctorCapability,
  getCapabilityStatus,
  installCapability,
  loadCapabilityManifest,
  removeCapability,
  resolveDataDir,
} from "./capabilities-lib.mjs";

const payload = Buffer.from("two-of-us optional capability fixture\n");
const payloadSha256 = createHash("sha256").update(payload).digest("hex");

test("resolveDataDir supports override and platform defaults", () => {
  assert.equal(resolveDataDir({ env: { TWO_OF_US_DATA_DIR: "./fixture-data" }, homeDir: "/home/me" }), path.resolve("fixture-data"));
  assert.equal(resolveDataDir({ env: {}, platform: "darwin", homeDir: "/Users/me" }), "/Users/me/Library/Application Support/TwoOfUs");
  assert.equal(resolveDataDir({ env: {}, platform: "linux", homeDir: "/home/me" }), "/home/me/.local/share/two-of-us");
  assert.equal(resolveDataDir({ env: { XDG_DATA_HOME: "/var/data" }, platform: "linux", homeDir: "/home/me" }), "/var/data/two-of-us");
  assert.equal(resolveDataDir({ env: { LOCALAPPDATA: "C:\\Local" }, platform: "win32", homeDir: "C:\\Users\\me" }), path.resolve("C:\\Local", "TwoOfUs"));
});

test("manifest is read, validated, hashed, and frozen", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/ok"));
  await writeManifest(fixture.rootDir, manifest);

  const record = await loadCapabilityManifest(fixture.rootDir, manifest.id);
  assert.equal(record.value.id, manifest.id);
  assert.match(record.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(record.value.artifacts));

  manifest.model.sha256 = "0".repeat(64);
  await writeManifest(fixture.rootDir, manifest);
  await assert.rejects(
    loadCapabilityManifest(fixture.rootDir, manifest.id),
    (error) => error instanceof CapabilityError && error.code === "MANIFEST_INVALID",
  );

  manifest.model.sha256 = payloadSha256;
  manifest.artifacts[0].url = "http://example.com/model.bin";
  await writeManifest(fixture.rootDir, manifest);
  await assert.rejects(
    loadCapabilityManifest(fixture.rootDir, manifest.id),
    (error) => error instanceof CapabilityError && error.code === "MANIFEST_INVALID",
  );
});

test("install verifies download, atomically writes receipt, and reports available", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/ok"));
  await writeManifest(fixture.rootDir, manifest);
  const progress = [];

  const result = await installCapability({
    rootDir: fixture.rootDir,
    dataDir: fixture.dataDir,
    id: manifest.id,
    onProgress: (event) => progress.push(event),
  });

  assert.equal(result.installed, true);
  assert.equal(result.status.state, "available");
  assert.equal(progress.at(-1).received, payload.length);
  const installDir = path.join(fixture.dataDir, "capabilities", manifest.id);
  assert.deepEqual(await readFile(path.join(installDir, "models", "fixture.bin")), payload);
  const receipt = JSON.parse(await readFile(path.join(installDir, "receipt.json"), "utf8"));
  assert.equal(receipt.manifestSha256.length, 64);
  assert.equal(receipt.artifacts[0].sha256, payloadSha256);
  assert.equal((await readdir(installDir, { recursive: true })).some((name) => name.endsWith(".part")), false);

  const repeated = await installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(repeated.alreadyAvailable, true);
});

test("content length mismatch leaves no visible installation", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/wrong-length"));
  await writeManifest(fixture.rootDir, manifest);

  await assert.rejects(
    installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id }),
    (error) => error.code === "DOWNLOAD_LENGTH_MISMATCH",
  );
  await assertNoVisibleInstall(fixture, manifest.id);
});

test("interrupted response leaves no visible installation", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/interrupted"));
  await writeManifest(fixture.rootDir, manifest);

  await assert.rejects(
    installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id }),
    (error) => error.code === "DOWNLOAD_INTERRUPTED",
  );
  await assertNoVisibleInstall(fixture, manifest.id);
});

test("sha256 mismatch leaves no visible installation", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/wrong-hash"));
  await writeManifest(fixture.rootDir, manifest);

  await assert.rejects(
    installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id }),
    (error) => error.code === "DOWNLOAD_HASH_MISMATCH",
  );
  await assertNoVisibleInstall(fixture, manifest.id);
});

test("doctor detects corrupt artifacts", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/ok"));
  await writeManifest(fixture.rootDir, manifest);
  await installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  const artifactPath = path.join(fixture.dataDir, "capabilities", manifest.id, "models", "fixture.bin");
  await writeFile(artifactPath, Buffer.alloc(payload.length, 1));

  const status = await doctorCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(status.state, "corrupt");
  assert.equal(status.code, "ARTIFACT_HASH_MISMATCH");
});

test("doctor distinguishes missing, corrupt, and incompatible installs", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/ok"));
  await writeManifest(fixture.rootDir, manifest);

  const missing = await doctorCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(missing.state, "missing");
  await installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });

  const receiptPath = path.join(fixture.dataDir, "capabilities", manifest.id, "receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  receipt.protocolVersion = 999;
  await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
  const incompatible = await doctorCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(incompatible.state, "incompatible");
  assert.equal(incompatible.code, "RECEIPT_INCOMPATIBLE");

  await rm(receiptPath);
  const corrupt = await doctorCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(corrupt.state, "corrupt");
  assert.equal(corrupt.code, "RECEIPT_MISSING");
});

test("doctor reports a non-directory install path as corrupt", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/ok"));
  await writeManifest(fixture.rootDir, manifest);
  const installPath = path.join(fixture.dataDir, "capabilities", manifest.id);
  await mkdir(path.dirname(installPath), { recursive: true });
  await writeFile(installPath, "not a directory");

  const status = await doctorCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(status.state, "corrupt");
  assert.equal(status.code, "INSTALL_PATH_NOT_DIRECTORY");
});

test("remove only deletes the selected capability directory", async (context) => {
  const fixture = await createFixture(context);
  const manifest = makeManifest(fixture.url("/ok"));
  await writeManifest(fixture.rootDir, manifest);
  await installCapability({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  const sibling = path.join(fixture.dataDir, "capabilities", "keep-me", "marker.txt");
  await mkdir(path.dirname(sibling), { recursive: true });
  await writeFile(sibling, "keep");

  const result = await removeCapability({ dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(result.removed, true);
  assert.equal(await readFile(sibling, "utf8"), "keep");
  const status = await getCapabilityStatus({ rootDir: fixture.rootDir, dataDir: fixture.dataDir, id: manifest.id });
  assert.equal(status.state, "missing");
});

function makeManifest(url) {
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
      url,
      bytes: payload.length,
      sha256: payloadSha256,
    }],
  };
}

async function writeManifest(rootDir, manifest) {
  const directory = path.join(rootDir, "capabilities", manifest.id);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function createFixture(context) {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-capabilities-"));
  const rootDir = path.join(baseDir, "repo");
  const dataDir = path.join(baseDir, "data");
  const server = createServer((request, response) => {
    if (request.url === "/ok") {
      response.writeHead(200, { "content-length": payload.length });
      response.end(payload);
      return;
    }
    if (request.url === "/wrong-length") {
      response.writeHead(200, { "content-length": payload.length - 1 });
      response.end(payload.subarray(0, payload.length - 1));
      return;
    }
    if (request.url === "/wrong-hash") {
      response.writeHead(200, { "content-length": payload.length });
      response.end(Buffer.alloc(payload.length, 7));
      return;
    }
    if (request.url === "/interrupted") {
      response.writeHead(200, { "content-length": payload.length });
      response.flushHeaders();
      response.write(payload.subarray(0, 5));
      setTimeout(() => response.socket.destroy(), 10);
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(baseDir, { recursive: true, force: true });
  });
  const { port } = server.address();
  return { baseDir, rootDir, dataDir, url: (pathname) => `http://127.0.0.1:${port}${pathname}` };
}

async function assertNoVisibleInstall(fixture, id) {
  const installDir = path.join(fixture.dataDir, "capabilities", id);
  await assert.rejects(stat(installDir), (error) => error.code === "ENOENT");
  const dataRoot = path.join(fixture.dataDir, "capabilities");
  const entries = await readdir(dataRoot).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
  assert.equal(entries.some((name) => name.includes(".part-")), false);
}
