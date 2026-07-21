#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { main as defaultCapabilityMain } from "./capabilities.mjs";
import {
  getCapabilityStatus as defaultGetCapabilityStatus,
  listCapabilityIds as defaultListCapabilityIds,
  resolveDataDir,
} from "./capabilities-lib.mjs";

const minimumMajor = 18;
const repoRoot = new URL("../", import.meta.url);
const finalLaunchMessage = "现在可以双击根目录或作品目录的 start.command / start.bat。";

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const stdin = dependencies.stdin ?? process.stdin;
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const platform = dependencies.platform ?? process.platform;
  const nodeVersion = dependencies.nodeVersion ?? process.versions.node;
  const rootDir = dependencies.rootDir ?? repoRoot;
  const npmRunner = dependencies.runNpmInstall
    ?? (() => runNpmInstall({ platform, rootDir }));
  const listCapabilityIds = dependencies.listCapabilityIds ?? defaultListCapabilityIds;
  const getCapabilityStatus = dependencies.getCapabilityStatus ?? defaultGetCapabilityStatus;
  const capabilityMain = dependencies.capabilityMain ?? defaultCapabilityMain;

  const unknownOption = argv.find((argument) => argument !== "--skip-optional");
  if (unknownOption !== undefined) {
    stderr.write(`[UNKNOWN_OPTION] 未知选项：${String(unknownOption)}\n`);
    return 1;
  }
  const skipOptional = argv.includes("--skip-optional");

  const nodeMajor = parseNodeMajor(nodeVersion);
  if (nodeMajor === null || nodeMajor < minimumMajor) {
    stderr.write(`需要 Node.js ${minimumMajor} 或更高版本，当前版本是 ${String(nodeVersion)}。\n`);
    stderr.write("请先从 https://nodejs.org/ 安装长期支持版，然后重新运行本安装器。\n");
    return 1;
  }

  stdout.write(`Node.js ${nodeVersion} 检查通过。\n`);
  stdout.write("正在安装并锁定 Two of Us 的共享依赖……\n");
  let npmResult;
  try {
    npmResult = await npmRunner();
  } catch (error) {
    npmResult = {
      ok: false,
      kind: "spawn",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  const npmExitCode = reportNpmFailure(npmResult, stderr);
  if (npmExitCode !== null) return npmExitCode;

  stdout.write("基础共享依赖安装完成。\n");
  if (skipOptional) {
    stdout.write("已按 --skip-optional 跳过全部可选能力。\n");
    stdout.write(`${finalLaunchMessage}\n`);
    return 0;
  }

  const summary = {
    ready: [],
    installed: [],
    skipped: [],
    failed: [],
  };
  let capabilityIds;
  try {
    capabilityIds = await listCapabilityIds(rootDir);
  } catch {
    stderr.write("[CAPABILITY_LIST_FAILED] 无法读取可选能力登记。\n");
    stderr.write("基础共享依赖已经完成，可修复后安全重试 setup 或精确能力命令。\n");
    stdout.write(`${finalLaunchMessage}\n`);
    return 1;
  }

  if (capabilityIds.length === 0) {
    stdout.write("仓库中没有已登记的可选能力。\n");
    stdout.write(`${finalLaunchMessage}\n`);
    return 0;
  }

  const dataDir = resolveDataDir({ env });
  const interactive = stdin.isTTY === true && stdout.isTTY === true;
  const seen = new Set();
  for (const id of capabilityIds) {
    if (seen.has(id)) continue;
    seen.add(id);

    let initialStatus;
    try {
      initialStatus = await getCapabilityStatus({ rootDir, dataDir, id });
    } catch {
      summary.failed.push(id);
      continue;
    }

    if (initialStatus?.state === "available") {
      summary.ready.push(id);
      stdout.write(`${id} 已安装且校验通过。\n`);
      continue;
    }

    if (!interactive) {
      summary.skipped.push(id);
      stdout.write(`${id} 尚未安装；当前不是交互终端，已跳过。\n`);
      printInstallCommand(stdout, id);
      continue;
    }

    let cliCode = null;
    let cliThrew = false;
    const capabilityErrors = createBufferedStream();
    try {
      cliCode = await capabilityMain(["install", id], {
        env,
        stdin,
        stdout,
        stderr: capabilityErrors,
        rootDir,
      });
    } catch {
      cliThrew = true;
    }

    let postStatus = null;
    let postStatusThrew = false;
    try {
      postStatus = await getCapabilityStatus({ rootDir, dataDir, id });
    } catch {
      postStatusThrew = true;
    }

    if (cliThrew || cliCode !== 0 || postStatusThrew) {
      const errorCode = readStableErrorCode(capabilityErrors.value)
        ?? "CAPABILITY_INSTALL_FAILED";
      stderr.write(`[${errorCode}] ${id} 安装失败。\n`);
      summary.failed.push(id);
    } else if (postStatus?.state === "available") {
      summary.installed.push(id);
      stdout.write(`${id} 安装完成且校验通过。\n`);
    } else {
      summary.skipped.push(id);
      printInstallCommand(stdout, id);
    }
  }

  stdout.write(`${finalLaunchMessage}\n`);
  if (summary.failed.length > 0) {
    stderr.write(`以下可选能力处理失败：${summary.failed.join("、")}。\n`);
    stderr.write("基础共享依赖已经完成，可修复后安全重试 setup 或精确能力命令。\n");
    return 1;
  }
  return 0;
}

export function runNpmInstall({
  platform = process.platform,
  rootDir = repoRoot,
  spawnImpl = spawn,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(Object.freeze(result));
    };

    let child;
    try {
      child = spawnImpl(platform === "win32" ? "npm.cmd" : "npm", [
        "install",
        "--no-audit",
        "--no-fund",
      ], {
        cwd: rootDir,
        stdio: "inherit",
      });
    } catch (error) {
      finish({
        ok: false,
        kind: "spawn",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    child.once("error", (error) => {
      finish({ ok: false, kind: "spawn", message: error.message });
    });
    child.once("exit", (code, signal) => {
      if (signal) finish({ ok: false, kind: "signal", signal });
      else if (code === 0) finish({ ok: true });
      else finish({ ok: false, kind: "exit", code: code ?? 1 });
    });
  });
}

function parseNodeMajor(nodeVersion) {
  if (typeof nodeVersion !== "string") return null;
  const [majorText] = nodeVersion.split(".", 1);
  if (!/^[0-9]+$/.test(majorText)) return null;
  const major = Number(majorText);
  return Number.isSafeInteger(major) && major > 0 ? major : null;
}

function reportNpmFailure(result, stderr) {
  if (result?.ok === true) return null;
  if (result?.kind === "spawn") {
    stderr.write(`无法运行 npm：${String(result.message ?? "未知错误")}\n`);
    return 1;
  }
  if (result?.kind === "signal") {
    stderr.write(`安装被信号 ${String(result.signal ?? "unknown")} 中断。\n`);
    return 1;
  }
  const code = result?.kind === "exit" ? result.code : 1;
  stderr.write(`依赖安装失败，npm 退出码：${String(code)}。\n`);
  return Number.isSafeInteger(code) && code > 0 ? code : 1;
}

function printInstallCommand(stdout, id) {
  stdout.write(`需要时运行：node scripts/capabilities.mjs install ${id}\n`);
}

function createBufferedStream() {
  return {
    value: "",
    write(chunk) {
      this.value += String(chunk);
      return true;
    },
  };
}

function readStableErrorCode(message) {
  const match = /^\[([A-Z][A-Z0-9_]*)\]/.exec(message);
  return match ? match[1] : null;
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entrypoint) {
  process.exitCode = await main();
}
