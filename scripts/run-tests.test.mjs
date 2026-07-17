import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectProjectTestFiles } from "./run-tests.mjs";

test("test discovery stays inside project source roots", async (context) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-test-discovery-"));
  context.after(() => rm(rootDir, { recursive: true, force: true }));
  await Promise.all([
    mkdir(path.join(rootDir, "experiences", "nested"), { recursive: true }),
    mkdir(path.join(rootDir, "shared"), { recursive: true }),
    mkdir(path.join(rootDir, "scripts"), { recursive: true }),
    mkdir(path.join(rootDir, "tmp", "vendor"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(rootDir, "experiences", "nested", "game.test.js"), ""),
    writeFile(path.join(rootDir, "shared", "runtime.test.js"), ""),
    writeFile(path.join(rootDir, "scripts", "tool.test.mjs"), ""),
    writeFile(path.join(rootDir, "scripts", "not-a-test.js"), ""),
    writeFile(path.join(rootDir, "tmp", "vendor", "foreign.test.js"), ""),
  ]);

  const relativeFiles = (await collectProjectTestFiles(rootDir))
    .map((filePath) => path.relative(rootDir, filePath));

  assert.deepEqual(relativeFiles, [
    path.join("experiences", "nested", "game.test.js"),
    path.join("scripts", "tool.test.mjs"),
    path.join("shared", "runtime.test.js"),
  ]);
});

