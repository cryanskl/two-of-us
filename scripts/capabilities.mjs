#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import process from "node:process";
import {
  CapabilityError,
  doctorCapability,
  getCapabilityStatus,
  installCapability,
  listCapabilityIds,
  loadCapabilityManifest,
  removeCapability,
  resolveDataDir,
} from "./capabilities-lib.mjs";

const repoRoot = new URL("../", import.meta.url);

export async function main(argv = process.argv.slice(2), {
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
  stdin = process.stdin,
  rootDir = repoRoot,
} = {}) {
  const options = new Set(argv.filter((argument) => argument.startsWith("-")));
  const positional = argv.filter((argument) => !argument.startsWith("-"));
  const [command, id] = positional;
  const dataDir = resolveDataDir({ env });
  const json = options.has("--json");

  if (!command || options.has("--help") || options.has("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    if (command === "status") {
      const ids = id ? [id] : await listCapabilityIds(rootDir);
      const statuses = await Promise.all(ids.map((capabilityId) => (
        getCapabilityStatus({ rootDir, dataDir, id: capabilityId })
      )));
      if (json) writeJson(stdout, id ? statuses[0] : statuses);
      else if (statuses.length === 0) stdout.write("仓库中没有已登记的可选能力。\n");
      else statuses.forEach((status) => printStatus(stdout, status));
      return 0;
    }

    requireId(command, id);
    if (command === "doctor") {
      const status = await doctorCapability({ rootDir, dataDir, id });
      if (json) writeJson(stdout, status);
      else printStatus(stdout, status);
      return status.state === "available" ? 0 : 2;
    }
    if (command === "install") {
      const manifest = await loadCapabilityManifest(rootDir, id);
      if (!options.has("--yes")) {
        printInstallNotice(stdout, manifest.value, dataDir);
        const accepted = await confirm(stdin, stdout);
        if (!accepted) {
          stdout.write("已取消安装。\n");
          return 0;
        }
      }
      const lastPercent = new Map();
      const result = await installCapability({
        rootDir,
        dataDir,
        id,
        onProgress({ artifactId, received, total }) {
          if (json) return;
          const percent = Math.floor((received / total) * 100);
          if (lastPercent.get(artifactId) === percent) return;
          lastPercent.set(artifactId, percent);
          stdout.write(`下载 ${artifactId}：${percent}%\n`);
        },
      });
      if (json) writeJson(stdout, result);
      else stdout.write(result.alreadyAvailable ? `${id} 已安装且校验通过。\n` : `${id} 安装完成。\n`);
      return 0;
    }
    if (command === "remove") {
      const result = await removeCapability({ dataDir, id });
      if (json) writeJson(stdout, result);
      else stdout.write(result.removed ? `${id} 已移除。\n` : `${id} 尚未安装。\n`);
      return 0;
    }

    throw new CapabilityError("UNKNOWN_COMMAND", `未知命令：${command}`);
  } catch (error) {
    const code = error instanceof CapabilityError ? error.code : "UNEXPECTED_ERROR";
    stderr.write(`[${code}] ${error.message}\n`);
    return 1;
  }
}

function requireId(command, id) {
  if (!id) throw new CapabilityError("CAPABILITY_ID_REQUIRED", `${command} 命令需要能力 id。`);
}

function printHelp(stream) {
  stream.write([
    "用法：node scripts/capabilities.mjs <command> [id] [options]",
    "",
    "命令：",
    "  status [id]      查看一个或全部已登记能力的状态",
    "  install <id>     下载、校验并安装能力",
    "  doctor <id>      完整校验已安装能力",
    "  remove <id>      仅移除该能力的数据目录",
    "",
    "选项：",
    "  --yes            跳过安装确认",
    "  --json           输出机器可读 JSON",
    "",
    "可用 TWO_OF_US_DATA_DIR 覆盖能力数据目录。",
    "",
  ].join("\n"));
}

function printStatus(stream, status) {
  stream.write(`${status.id}: ${status.state} (${status.code}) — ${status.message}\n`);
}

function printInstallNotice(stream, manifest, dataDir) {
  const total = manifest.artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0);
  const sources = [...new Set(manifest.artifacts.map(({ url }) => new URL(url).origin))];
  stream.write([
    `即将安装：${manifest.id}`,
    `下载大小：${formatBytes(total)}`,
    `数据目录：${dataDir}`,
    `下载来源：${sources.join(", ")}`,
    `引擎许可：${manifest.engine.license}`,
    `模型许可：${manifest.model.license}`,
    `移除命令：node scripts/capabilities.mjs remove ${manifest.id}`,
    "",
  ].join("\n"));
}

async function confirm(input, output) {
  const terminal = createInterface({ input, output });
  try {
    const answer = await terminal.question("继续安装？[y/N] ");
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    terminal.close();
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entrypoint) {
  process.exitCode = await main();
}
