import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capabilityDir = path.join(rootDir, "capabilities", "speech-whisper-base");

test("speech browser build record matches committed source and assets", async () => {
  const record = JSON.parse(await readFile(path.join(capabilityDir, "browser-build.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(capabilityDir, "manifest.json"), "utf8"));
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.bindingProtocolVersion, 1);
  assert.equal(record.source.whisperRevision, "23ee03506a91ac3d3f0071b40e66a430eebdfa1d");
  assert.equal(record.toolchain.emsdkVersion, "4.0.23");

  const checks = [
    ["src/emscripten.cpp", record.source.bindingSha256],
    ["src/CMakeLists.txt", record.source.cmakeSha256],
    ...record.assets.map((asset) => [asset.path, asset.sha256, asset.bytes]),
    ...manifest.browserAssets.map((asset) => [asset.path, asset.sha256, asset.bytes]),
  ];
  for (const [relativePath, expectedSha256, expectedBytes] of checks) {
    const target = path.join(capabilityDir, ...relativePath.split("/"));
    const bytes = await readFile(target);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedSha256, relativePath);
    if (expectedBytes !== undefined) assert.equal((await stat(target)).size, expectedBytes, relativePath);
  }
});

test("speech browser build exposes only the structured binding surface", async () => {
  const source = await readFile(path.join(capabilityDir, "src", "emscripten.cpp"), "utf8");
  assert.match(source, /emscripten::function\("init"/);
  assert.match(source, /emscripten::function\("transcribe"/);
  assert.match(source, /emscripten::function\("dispose"/);
  assert.doesNotMatch(source, /print_realtime\s*=\s*true/);
  assert.doesNotMatch(source, /std::thread\s+g_worker/);
});
