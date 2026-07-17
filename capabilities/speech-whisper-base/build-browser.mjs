import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const expected = Object.freeze({
  whisperRevision: "23ee03506a91ac3d3f0071b40e66a430eebdfa1d",
  emscriptenVersion: "4.0.23",
});

const capabilityDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(capabilityDir, "src");
const whisperDir = path.resolve(process.env.WHISPER_CPP_SOURCE ?? "tmp/whisper.cpp-v1.8.6");
const buildDir = path.resolve(process.env.WHISPER_BROWSER_BUILD_DIR
  ?? "tmp/speech-whisper-browser-build");

await assertWhisperRevision();
await assertEmscriptenVersion();
await run("emcmake", [
  "cmake",
  "-S", sourceDir,
  "-B", buildDir,
  "-DCMAKE_BUILD_TYPE=Release",
  `-DWHISPER_CPP_SOURCE=${whisperDir}`,
]);
await run("cmake", ["--build", buildDir, "--target", "speech-whisper", "--parallel", "8"]);

const assets = [];
for (const filename of ["speech-whisper.js", "speech-whisper.wasm"]) {
  const assetPath = path.join(buildDir, "browser", filename);
  const bytes = await readFile(assetPath);
  assets.push({ filename, bytes: (await stat(assetPath)).size, sha256: sha256(bytes) });
}
process.stdout.write(`${JSON.stringify({ ...expected, assets }, null, 2)}\n`);

async function assertWhisperRevision() {
  const revision = (await capture("git", ["-C", whisperDir, "rev-parse", "HEAD"])).trim();
  if (revision !== expected.whisperRevision) {
    throw new Error(`whisper.cpp revision mismatch: expected ${expected.whisperRevision}, got ${revision}`);
  }
}

async function assertEmscriptenVersion() {
  const output = await capture("emcc", ["--version"]);
  const version = /emcc .*? (\d+\.\d+\.\d+)/.exec(output)?.[1];
  if (version !== expected.emscriptenVersion) {
    throw new Error(`Emscripten version mismatch: expected ${expected.emscriptenVersion}, got ${version ?? "unknown"}`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} exited with code ${code}`)));
  });
}

function capture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { errorOutput += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0
      ? resolve(output)
      : reject(new Error(`${command} exited with code ${code}: ${errorOutput}`)));
  });
}
