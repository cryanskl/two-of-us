import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";

const setupUrl = new URL("./setup.mjs", import.meta.url);

class MemoryStream {
  constructor(isTTY = false) {
    this.isTTY = isTTY;
    this.value = "";
  }

  write(chunk) {
    this.value += String(chunk);
    return true;
  }
}

function createHarness(overrides = {}) {
  const stdout = overrides.stdout ?? new MemoryStream(overrides.tty ?? false);
  const stderr = overrides.stderr ?? new MemoryStream(false);
  const stdin = overrides.stdin ?? { isTTY: overrides.tty ?? false };
  const calls = {
    npm: 0,
    list: 0,
    status: [],
    install: [],
  };
  const dependencies = {
    env: { TWO_OF_US_DATA_DIR: "/fixture/two-of-us-data" },
    stdin,
    stdout,
    stderr,
    platform: "linux",
    nodeVersion: "20.11.1",
    rootDir: new URL("file:///fixture/two-of-us/"),
    async runNpmInstall() {
      calls.npm += 1;
      return { ok: true };
    },
    async listCapabilityIds() {
      calls.list += 1;
      return [];
    },
    async getCapabilityStatus({ id }) {
      calls.status.push(id);
      return { id, state: "missing" };
    },
    async capabilityMain(argv) {
      calls.install.push(argv);
      return 0;
    },
    ...overrides.dependencies,
  };
  return { stdout, stderr, stdin, calls, dependencies };
}

async function loadSetup() {
  return import(setupUrl.href);
}

test("setup source declares an import-safe main and CLI entrypoint guard", async () => {
  const source = await readFile(setupUrl, "utf8");
  assert.match(source, /export async function main\s*\(/);
  assert.match(source, /pathToFileURL\s*\(/);
  assert.match(source, /import\.meta\.url\s*===\s*entrypoint/);
});

test("import has no npm, capability, output, or process.exitCode side effects", async () => {
  const originalExitCode = process.exitCode;
  const beforeStdout = process.stdout.bytesWritten;
  const beforeStderr = process.stderr.bytesWritten;
  const setup = await loadSetup();
  assert.equal(typeof setup.main, "function");
  assert.equal(typeof setup.runNpmInstall, "function");
  assert.equal(process.exitCode, originalExitCode);
  assert.equal(process.stdout.bytesWritten, beforeStdout);
  assert.equal(process.stderr.bytesWritten, beforeStderr);
});

test("Node 17 and malformed versions fail before npm or capability access", async () => {
  const { main } = await loadSetup();
  for (const nodeVersion of ["17.9.1", "broken", "", "0.1.0", "18x.0.0", "-18.0.0"]) {
    const harness = createHarness({ dependencies: { nodeVersion } });
    assert.equal(await main([], harness.dependencies), 1);
    assert.equal(harness.calls.npm, 0);
    assert.equal(harness.calls.list, 0);
    assert.equal(harness.calls.status.length, 0);
    assert.equal(harness.calls.install.length, 0);
    assert.match(harness.stderr.value, /Node\.js|nodejs\.org/);
    assert.ok(harness.stderr.value.includes(nodeVersion));
  }
});

test("Node 18+ passes and invokes npm exactly once", async () => {
  const { main } = await loadSetup();
  for (const nodeVersion of ["18.0.0", "22.14.1", "999.0.0"]) {
    const harness = createHarness({ dependencies: { nodeVersion } });
    assert.equal(await main(["--skip-optional"], harness.dependencies), 0);
    assert.equal(harness.calls.npm, 1);
    assert.match(harness.stdout.value, new RegExp(`Node\\.js ${nodeVersion} 检查通过`));
  }
});

test("unknown options fail before npm with the frozen error", async () => {
  const { main } = await loadSetup();
  for (const option of ["--yes", "--unknown", "install", "-h"]) {
    const harness = createHarness();
    assert.equal(await main([option], harness.dependencies), 1);
    assert.equal(harness.calls.npm, 0);
    assert.equal(harness.calls.list, 0);
    assert.equal(harness.stderr.value, `[UNKNOWN_OPTION] 未知选项：${option}\n`);
  }
});

test("npm spawn, signal, and exit failures stop before capability enumeration", async () => {
  const { main } = await loadSetup();
  const cases = [
    [{ ok: false, kind: "spawn", message: "npm missing" }, 1, /无法运行 npm：npm missing/],
    [{ ok: false, kind: "signal", signal: "SIGTERM" }, 1, /安装被信号 SIGTERM 中断/],
    [{ ok: false, kind: "exit", code: 7 }, 7, /npm 退出码：7/],
    [{ ok: false, kind: "exit", code: 0 }, 1, /npm 退出码：0/],
  ];
  for (const [result, expectedCode, message] of cases) {
    const harness = createHarness({
      dependencies: {
        async runNpmInstall() {
          harness.calls.npm += 1;
          return result;
        },
      },
    });
    assert.equal(await main([], harness.dependencies), expectedCode);
    assert.equal(harness.calls.npm, 1);
    assert.equal(harness.calls.list, 0);
    assert.match(harness.stderr.value, message);
    assert.doesNotMatch(harness.stdout.value, /基础共享依赖安装完成/);
  }
});

test("a thrown npm runner is reported as spawn failure without capability access", async () => {
  const { main } = await loadSetup();
  const harness = createHarness({
    dependencies: {
      async runNpmInstall() {
        harness.calls.npm += 1;
        throw new Error("runner exploded");
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 1);
  assert.equal(harness.calls.list, 0);
  assert.match(harness.stderr.value, /无法运行 npm：runner exploded/);
});

test("--skip-optional installs base dependencies but never touches capability APIs", async () => {
  const { main } = await loadSetup();
  const harness = createHarness({
    dependencies: {
      async listCapabilityIds() { throw new Error("must not list"); },
      async getCapabilityStatus() { throw new Error("must not read status"); },
      async capabilityMain() { throw new Error("must not install"); },
    },
  });
  assert.equal(await main(["--skip-optional"], harness.dependencies), 0);
  assert.equal(harness.calls.npm, 1);
  assert.match(harness.stdout.value, /基础共享依赖安装完成。/);
  assert.match(harness.stdout.value, /已按 --skip-optional 跳过全部可选能力。/);
  assert.match(harness.stdout.value,
    /现在可以双击根目录或作品目录的 start\.command \/ start\.bat。/);
});

test("an empty capability list finishes successfully", async () => {
  const { main } = await loadSetup();
  const harness = createHarness();
  assert.equal(await main([], harness.dependencies), 0);
  assert.equal(harness.calls.list, 1);
  assert.match(harness.stdout.value, /仓库中没有已登记的可选能力。/);
  assert.equal(harness.calls.status.length, 0);
  assert.equal(harness.calls.install.length, 0);
});

test("available capabilities are ready and never invoke installation", async () => {
  const { main } = await loadSetup();
  const harness = createHarness({
    dependencies: {
      async listCapabilityIds() {
        harness.calls.list += 1;
        return ["speech-whisper-base"];
      },
      async getCapabilityStatus({ id }) {
        harness.calls.status.push(id);
        return { id, state: "available" };
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 0);
  assert.deepEqual(harness.calls.status, ["speech-whisper-base"]);
  assert.deepEqual(harness.calls.install, []);
  assert.match(harness.stdout.value, /speech-whisper-base 已安装且校验通过。/);
});

test("non-TTY skips every unavailable capability in stable order with exact commands", async () => {
  const { main } = await loadSetup();
  const ids = ["first-capability", "second-capability"];
  const harness = createHarness({
    tty: false,
    dependencies: {
      async listCapabilityIds() {
        harness.calls.list += 1;
        return ids;
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 0);
  assert.deepEqual(harness.calls.status, ids);
  assert.deepEqual(harness.calls.install, []);
  let previous = -1;
  for (const id of ids) {
    const statusLine = `${id} 尚未安装；当前不是交互终端，已跳过。`;
    const command = `需要时运行：node scripts/capabilities.mjs install ${id}`;
    assert.ok(harness.stdout.value.indexOf(statusLine) > previous);
    previous = harness.stdout.value.indexOf(statusLine);
    assert.ok(harness.stdout.value.indexOf(command) > previous);
    previous = harness.stdout.value.indexOf(command);
  }
});

test("interaction requires both stdin and stdout TTY", async () => {
  const { main } = await loadSetup();
  for (const [stdinTTY, stdoutTTY] of [[true, false], [false, true]]) {
    const stdout = new MemoryStream(stdoutTTY);
    const harness = createHarness({
      stdout,
      stdin: { isTTY: stdinTTY },
      dependencies: {
        async listCapabilityIds() { return ["optional-model"]; },
      },
    });
    assert.equal(await main([], harness.dependencies), 0);
    assert.deepEqual(harness.calls.install, []);
    assert.match(stdout.value, /当前不是交互终端，已跳过/);
  }
});

test("TTY refusal re-reads status after capabilityMain and classifies skipped", async () => {
  const { main } = await loadSetup();
  const events = [];
  const harness = createHarness({
    tty: true,
    dependencies: {
      async listCapabilityIds() { return ["optional-model"]; },
      async getCapabilityStatus({ id, dataDir, rootDir }) {
        events.push(`status:${id}`);
        assert.equal(dataDir, "/fixture/two-of-us-data");
        assert.equal(rootDir, harness.dependencies.rootDir);
        return { id, state: "missing" };
      },
      async capabilityMain(argv, passed) {
        events.push(`install:${argv[1]}`);
        assert.deepEqual(argv, ["install", "optional-model"]);
        assert.equal(passed.env, harness.dependencies.env);
        assert.equal(passed.stdin, harness.stdin);
        assert.equal(passed.stdout, harness.stdout);
        assert.notEqual(passed.stderr, harness.stderr);
        assert.equal(typeof passed.stderr.write, "function");
        assert.equal(passed.rootDir, harness.dependencies.rootDir);
        return 0;
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 0);
  assert.deepEqual(events, ["status:optional-model", "install:optional-model", "status:optional-model"]);
  assert.match(harness.stdout.value, /需要时运行：node scripts\/capabilities\.mjs install optional-model/);
});

test("TTY install succeeds only after post-install status becomes available", async () => {
  const { main } = await loadSetup();
  let statusReads = 0;
  const harness = createHarness({
    tty: true,
    dependencies: {
      async listCapabilityIds() { return ["optional-model"]; },
      async getCapabilityStatus({ id }) {
        statusReads += 1;
        return { id, state: statusReads === 1 ? "missing" : "available" };
      },
      async capabilityMain(argv) {
        harness.calls.install.push(argv);
        return 0;
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 0);
  assert.equal(statusReads, 2);
  assert.deepEqual(harness.calls.install, [["install", "optional-model"]]);
  assert.match(harness.stdout.value, /optional-model 安装完成且校验通过。/);
});

test("CLI nonzero, CLI throw, and status errors continue in order but aggregate failure", async () => {
  const { main } = await loadSetup();
  const ids = ["cli-nonzero", "cli-throws", "initial-status-throws", "post-status-throws", "last-refusal"];
  const reads = new Map();
  const events = [];
  const harness = createHarness({
    tty: true,
    dependencies: {
      async listCapabilityIds() { return ids; },
      async getCapabilityStatus({ id }) {
        events.push(`status:${id}`);
        const count = (reads.get(id) ?? 0) + 1;
        reads.set(id, count);
        if (id === "initial-status-throws") {
          throw new Error("PRIVATE /Users/person/model.bin https://secret.test " + "a".repeat(64));
        }
        if (id === "post-status-throws" && count === 2) {
          throw new Error("PRIVATE /Users/person/post.bin");
        }
        return { id, state: "missing" };
      },
      async capabilityMain(argv) {
        const id = argv[1];
        events.push(`install:${id}`);
        harness.calls.install.push(argv);
        if (id === "cli-nonzero") return 9;
        if (id === "cli-throws") throw new Error("PRIVATE https://download.test/model.bin");
        return 0;
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 1);
  assert.deepEqual(events, [
    "status:cli-nonzero", "install:cli-nonzero", "status:cli-nonzero",
    "status:cli-throws", "install:cli-throws", "status:cli-throws",
    "status:initial-status-throws",
    "status:post-status-throws", "install:post-status-throws", "status:post-status-throws",
    "status:last-refusal", "install:last-refusal", "status:last-refusal",
  ]);
  assert.equal(harness.calls.install.length, 4);
  assert.match(harness.stderr.value,
    /以下可选能力处理失败：cli-nonzero、cli-throws、initial-status-throws、post-status-throws。/);
  assert.match(harness.stderr.value, /基础共享依赖已经完成，可修复后安全重试 setup 或精确能力命令/);
  for (const secret of ["PRIVATE", "https://", "/Users/person/", "a".repeat(64)]) {
    assert.equal(`${harness.stdout.value}\n${harness.stderr.value}`.includes(secret), false);
  }
  assert.match(harness.stdout.value, /last-refusal/);
  assert.match(harness.stdout.value,
    /现在可以双击根目录或作品目录的 start\.command \/ start\.bat。/);
});

test("capability CLI stderr is reduced to a stable code before setup reports failure", async () => {
  const { main } = await loadSetup();
  const harness = createHarness({
    tty: true,
    dependencies: {
      async listCapabilityIds() { return ["private-model"]; },
      async capabilityMain(_argv, passed) {
        passed.stderr.write(
          `[DOWNLOAD_FAILED] 无法下载 https://secret.test/model.bin 到 /Users/person/.part/model.bin ${"a".repeat(64)}\n`,
        );
        return 1;
      },
    },
  });

  assert.equal(await main([], harness.dependencies), 1);
  assert.match(harness.stderr.value, /\[DOWNLOAD_FAILED\] private-model 安装失败。/);
  assert.match(harness.stderr.value, /以下可选能力处理失败：private-model。/);
  for (const secret of ["secret.test", "/Users/person/", "model.bin", "a".repeat(64)]) {
    assert.equal(`${harness.stdout.value}\n${harness.stderr.value}`.includes(secret), false);
  }
});

test("duplicate IDs cannot cause more than one install attempt in one setup process", async () => {
  const { main } = await loadSetup();
  const harness = createHarness({
    tty: true,
    dependencies: {
      async listCapabilityIds() { return ["same-id", "same-id"]; },
      async capabilityMain(argv) {
        harness.calls.install.push(argv);
        return 0;
      },
    },
  });
  assert.equal(await main([], harness.dependencies), 0);
  assert.deepEqual(harness.calls.install, [["install", "same-id"]]);
});

test("default npm runner selects executable/cwd/stdio and resolves every frozen result once", async () => {
  const { runNpmInstall } = await loadSetup();
  const rootDir = new URL("file:///fixture/repo/");

  for (const fixture of [
    { event: ["exit", 0, null], expected: { ok: true } },
    { event: ["exit", 5, null], expected: { ok: false, kind: "exit", code: 5 } },
    { event: ["exit", null, "SIGINT"], expected: { ok: false, kind: "signal", signal: "SIGINT" } },
  ]) {
    const child = new EventEmitter();
    const spawns = [];
    const promise = runNpmInstall({
      platform: "win32",
      rootDir,
      spawnImpl(command, args, options) {
        spawns.push({ command, args, options });
        return child;
      },
    });
    child.emit(...fixture.event);
    assert.deepEqual(await promise, fixture.expected);
    assert.deepEqual(spawns, [{
      command: "npm.cmd",
      args: ["install", "--no-audit", "--no-fund"],
      options: { cwd: rootDir, stdio: "inherit" },
    }]);
  }

  const child = new EventEmitter();
  const raced = runNpmInstall({ spawnImpl: () => child, rootDir, platform: "linux" });
  child.emit("error", new Error("not found"));
  child.emit("exit", 9, null);
  assert.deepEqual(await raced, { ok: false, kind: "spawn", message: "not found" });
  assert.deepEqual(await runNpmInstall({
    spawnImpl() { throw new Error("sync failure"); }, rootDir, platform: "linux",
  }), { ok: false, kind: "spawn", message: "sync failure" });
});
