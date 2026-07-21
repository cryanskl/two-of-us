import { spawn } from "node:child_process";
import process from "node:process";
import { parseExperienceId, resolveExperienceUrl } from "./start-target.mjs";
import {
  DEFAULT_MAX_PORT_ATTEMPTS,
  findReusableRuntime,
} from "./runtime-reuse.mjs";

const rootDir = new URL("..", import.meta.url);
const shouldOpenBrowser = !process.argv.includes("--no-open");
const preferredPort = Number.parseInt(process.env.TWO_OF_US_PORT ?? "4173", 10);

if (!Number.isInteger(preferredPort) || preferredPort < 0 || preferredPort > 65535) {
  console.error("TWO_OF_US_PORT 必须是 0 到 65535 之间的整数。");
  process.exit(1);
}

let runtime;
let experienceId;

try {
  experienceId = parseExperienceId(process.argv.slice(2));
  const reusable = await findReusableRuntime({
    preferredPort,
    maxPortAttempts: DEFAULT_MAX_PORT_ATTEMPTS,
    experienceId,
  });
  if (reusable) {
    console.log("\nTwo of Us 已经在运行，正在复用");
    console.log(`本机入口：${reusable.localUrl}`);
    if (experienceId) console.log(`当前作品：${reusable.openUrl}`);
    if (shouldOpenBrowser) openBrowser(reusable.openUrl);
  } else {
    const { createRuntimeServer } = await import("../shared/runtime/server.js");
    runtime = await createRuntimeServer({
      rootDir,
      preferredPort,
      maxPortAttempts: DEFAULT_MAX_PORT_ATTEMPTS,
    });
    const details = await runtime.start();
    const openUrl = resolveExperienceUrl(runtime.catalog, details.localUrl, experienceId);

    console.log("\nTwo of Us 已启动");
    console.log(`本机入口：${details.localUrl}`);
    if (experienceId) console.log(`当前作品：${openUrl}`);
    if (details.networkUrls.length > 0) {
      console.log("同一局域网的手机或电脑可打开：");
      for (const url of details.networkUrls) console.log(`  ${url}`);
    } else {
      console.log("没有检测到局域网地址；A/B 级体验仍可在本机使用。");
    }
    console.log("按 Ctrl+C 可安全停止服务。\n");

    if (shouldOpenBrowser) openBrowser(openUrl);
  }
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND") {
    console.error("共享依赖尚未安装。请先双击 setup.command（Windows 使用 setup.bat）。");
  } else {
    console.error(`启动失败：${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
}

let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n收到 ${signal}，正在停止本地服务……`);
  try {
    await runtime.stop();
    console.log("本地服务已停止，端口已经释放。");
    process.exit(0);
  } catch (error) {
    console.error(`停止服务时出错：${error.message}`);
    process.exit(1);
  }
}

if (runtime) {
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
}

function openBrowser(url) {
  const commands = {
    darwin: ["open", [url]],
    win32: ["cmd", ["/c", "start", "", url]],
    linux: ["xdg-open", [url]],
  };
  const command = commands[process.platform];
  if (!command) {
    console.log(`无法自动识别当前系统，请手动打开 ${url}`);
    return;
  }

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: "ignore",
  });
  child.once("error", () => console.log(`浏览器未能自动打开，请手动访问 ${url}`));
  child.unref();
}
