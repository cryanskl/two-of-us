import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const startScript = path.join(projectRoot, "scripts", "start.mjs");

test("a sequential second launcher reuses the first process and leaves the next port free", {
  timeout: 20_000,
}, async (context) => {
  const reservation = await reserveConsecutivePorts();
  const { port } = reservation;
  await closeServers(reservation.servers);

  const first = startProcess(port, "panorama-memory");
  context.after(() => terminateChild(first.child));
  await first.waitFor(`本机入口：http://127.0.0.1:${port}/`);
  assert.equal(first.child.exitCode, null);

  const second = startProcess(port, "compatibility-quiz");
  context.after(() => terminateChild(second.child));
  const secondExit = await waitForExit(second.child, 6_000);
  assert.deepEqual(secondExit, { code: 0, signal: null });
  assert.match(second.output(), /Two of Us 已经在运行，正在复用/);
  assert.match(second.output(), new RegExp(`本机入口：http://127.0.0.1:${port}/`));
  assert.match(second.output(), new RegExp(
    `当前作品：http://127.0.0.1:${port}/experiences/co-op/compatibility-quiz/index\\.html`,
  ));
  assert.equal(first.child.exitCode, null);

  const nextPortProbe = createServer();
  nextPortProbe.listen(port + 1, "127.0.0.1");
  await once(nextPortProbe, "listening");
  await new Promise((resolve) => nextPortProbe.close(resolve));

  await terminateChild(first.child);
  assert.equal(await canListen(port), true);
});

test("a foreign HTTP service on the preferred port is skipped and a new runtime uses the next port", {
  timeout: 20_000,
}, async (context) => {
  const reservation = await reserveConsecutivePorts();
  const { port, servers } = reservation;
  const foreign = servers[0];
  await new Promise((resolve) => servers[1].close(resolve));
  context.after(() => new Promise((resolve) => foreign.close(resolve)));

  const launcher = startProcess(port, "panorama-memory");
  context.after(() => terminateChild(launcher.child));
  await launcher.waitFor(`本机入口：http://127.0.0.1:${port + 1}/`);
  assert.match(launcher.output(), /Two of Us 已启动/);
  assert.doesNotMatch(launcher.output(), /正在复用/);
  assert.equal(launcher.child.exitCode, null);

  const healthResponse = await fetch(`http://127.0.0.1:${port + 1}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get("x-two-of-us-runtime"), "1");
  assert.equal(foreign.listening, true);

  await terminateChild(launcher.child);
  assert.equal(await canListen(port + 1), true);
});

async function reserveConsecutivePorts() {
  for (let port = 43000; port < 65000; port += 2) {
    const first = await tryListen(port);
    if (!first) continue;
    const second = await tryListen(port + 1);
    if (second) return { port, servers: [first, second] };
    await new Promise((resolve) => first.close(resolve));
  }
  throw new Error("找不到两个连续的空闲测试端口。");
}

async function tryListen(port) {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end("{}");
  });
  try {
    server.listen(port, "0.0.0.0");
    await once(server, "listening");
    return server;
  } catch (error) {
    if (error.code !== "EADDRINUSE") throw error;
    return null;
  }
}

async function closeServers(servers) {
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
}

function startProcess(port, experienceId) {
  const child = spawn(process.execPath, [
    startScript,
    "--no-open",
    "--experience",
    experienceId,
  ], {
    cwd: projectRoot,
    env: { ...process.env, TWO_OF_US_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  const listeners = new Set();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; notify(); });
  child.stderr.on("data", (chunk) => { stderr += chunk; notify(); });
  return {
    child,
    output: () => `${stdout}\n${stderr}`,
    waitFor(fragment, timeout = 8_000) {
      return new Promise((resolve, reject) => {
        let timer;
        const check = () => {
          if (`${stdout}\n${stderr}`.includes(fragment)) {
            clearTimeout(timer);
            listeners.delete(check);
            resolve();
          } else if (child.exitCode !== null) {
            clearTimeout(timer);
            listeners.delete(check);
            reject(new Error(`启动器提前退出：\n${stdout}\n${stderr}`));
          }
        };
        listeners.add(check);
        timer = setTimeout(() => {
          listeners.delete(check);
          reject(new Error(`等待启动器输出超时：${fragment}\n${stdout}\n${stderr}`));
        }, timeout);
        check();
      });
    },
  };
}

function waitForExit(child, timeout) {
  if (child.exitCode !== null) return Promise.resolve({ code: child.exitCode, signal: null });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("等待 child process 退出超时。")), timeout);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
}

async function terminateChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await waitForExit(child, 5_000);
}

async function canListen(port) {
  const server = await tryListen(port);
  if (!server) return false;
  await new Promise((resolve) => server.close(resolve));
  return true;
}
