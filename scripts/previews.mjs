#!/usr/bin/env node

// 制作期工具：为 catalog 中的每个作品生成一张门户预览图。
// 预览图不是运行依赖：门户在缺图时会退回纯文字卡片，作品本身从不加载它。
// 需要本机已安装 Chromium / Chrome / Edge，以及 Node 18+ 的 WebSocket 全局对象（Node 22+）。

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadCatalog, previewPathFor } from "../shared/runtime/catalog.js";

const rootDir = new URL("../", import.meta.url);
const rootPath = fileURLToPath(rootDir);
const defaultLayout = Object.freeze({ width: 1280, height: 800, scale: 0.5, quality: 80 });
const settleTimeoutMs = 20000;
const captureSettleMs = 1400;

// 绝大多数作品的开场画面就是最诚实的预览，默认不做任何交互。个别作品开场是一块空地，
// 要先替体验者走几步才有可看的东西，才在这里登记一条最小配方。
// 每一步是一次点击：`selector` 点某个元素的中心，`offset` 再给出元素框内的相对位置，
// `point` 直接给视口坐标。用选择器而不是硬编码坐标，配方才不会被版面变化悄悄弄坏。
const captureRecipes = Object.freeze({
  "light-grown-tree": {
    steps: [
      { selector: "#primary-button" },
      ...[
        [0.30, 0.42], [0.30, 0.42], [0.24, 0.30], [0.70, 0.28], [0.74, 0.24], [0.74, 0.24],
        [0.44, 0.12], [0.20, 0.20], [0.80, 0.22], [0.50, 0.10], [0.50, 0.10], [0.50, 0.10],
      ].flatMap(([x, y]) => [
        { selector: ".canvas-frame", offset: { x, y } },
        { selector: "#grow-button" },
      ]),
    ],
    settleMs: 2600,
  },
});

if (import.meta.url === `file://${process.argv[1]}`) {
  await main(process.argv.slice(2));
}

export async function main(argv = []) {
  const options = parseArguments(argv);
  const catalog = await loadCatalog(rootDir);
  const targets = catalog.experiences.filter((experience) => (
    experience.installed === true
    && (options.only.size === 0 || options.only.has(experience.id))
  ));

  if (targets.length === 0) {
    console.error("没有匹配的作品：请检查 --only 传入的 id。");
    process.exit(1);
  }

  const executable = options.chromium ?? await findChromium();
  if (!executable) {
    console.error([
      "找不到可用的 Chromium / Chrome / Edge。",
      "请安装其中一个浏览器，或用 TWO_OF_US_CHROMIUM=/path/to/chrome 指定可执行文件。",
    ].join("\n"));
    process.exit(1);
  }
  if (typeof globalThis.WebSocket !== "function") {
    console.error("当前 Node 缺少全局 WebSocket：预览生成需要 Node 22 或更高版本。");
    process.exit(1);
  }

  const { createRuntimeServer } = await import("../shared/runtime/server.js");
  const runtime = await createRuntimeServer({ rootDir, preferredPort: 0, maxPortAttempts: 1 });
  const details = await runtime.start();
  const browser = await launchChromium(executable);

  let failures = 0;
  try {
    for (const [index, experience] of targets.entries()) {
      const position = `${index + 1}/${targets.length}`;
      try {
        const image = await capture(browser, {
          url: new URL(experience.entry, details.localUrl).href,
          recipe: captureRecipes[experience.id] ?? {},
          options,
        });
        await writeFile(path.join(rootPath, previewPathFor(experience)), image);
        console.log(`${position} ${experience.id} · ${Math.round(image.length / 1024)} KB`);
      } catch (error) {
        failures += 1;
        console.error(`${position} ${experience.id} 预览生成失败：${error.message}`);
      }
    }
  } finally {
    await browser.close();
    await runtime.stop();
  }

  if (failures > 0) {
    console.error(`${failures} 个作品没有生成预览图。`);
    process.exit(1);
  }
  console.log(`已生成 ${targets.length} 张预览图，写入各作品目录的 preview.webp。`);
}

function parseArguments(argv) {
  const options = {
    ...defaultLayout,
    only: new Set(),
    chromium: process.env.TWO_OF_US_CHROMIUM || null,
  };

  for (const argument of argv) {
    const match = /^--([a-z]+)=(.+)$/.exec(argument);
    if (!match) throw new Error(`无法识别的参数：${argument}`);
    const [, name, value] = match;
    if (name === "only") {
      for (const id of value.split(",").map((entry) => entry.trim()).filter(Boolean)) {
        options.only.add(id);
      }
      continue;
    }
    if (name === "chromium") {
      options.chromium = value;
      continue;
    }
    if (!(name in defaultLayout)) throw new Error(`无法识别的参数：--${name}`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`--${name} 需要一个正数：${value}`);
    }
    options[name] = parsed;
  }
  return options;
}

async function findChromium() {
  const candidates = [
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/microsoft-edge",
  ];

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsersPath) {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(browsersPath, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("chromium-")) continue;
      candidates.unshift(path.join(browsersPath, entry.name, "chrome-linux", "chrome"));
      candidates.unshift(path.join(
        browsersPath,
        entry.name,
        "chrome-mac",
        "Chromium.app",
        "Contents",
        "MacOS",
        "Chromium",
      ));
    }
  }

  const { access } = await import("node:fs/promises");
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // 继续尝试下一个候选路径。
    }
  }
  return null;
}

async function launchChromium(executable) {
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "two-of-us-preview-"));
  const child = spawn(executable, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--mute-audio",
    "--force-color-profile=srgb",
    "--no-sandbox",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const endpoint = await readDevToolsEndpoint(child);
  const socket = await openSocket(endpoint);
  const pending = new Map();
  let nextId = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(typeof event.data === "string" ? event.data : "");
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message ?? "CDP 调用失败"));
    else entry.resolve(message.result);
  });

  function send(method, params = {}, sessionId = undefined) {
    const id = (nextId += 1);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => {
        if (!pending.delete(id)) return;
        reject(new Error(`CDP 调用超时：${method}`));
      }, settleTimeoutMs);
    });
  }

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  return {
    send: (method, params) => send(method, params, sessionId),
    async close() {
      socket.close();
      child.kill("SIGTERM");
      await rm(profileDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

function readDevToolsEndpoint(child) {
  return new Promise((resolve, reject) => {
    let buffered = "";
    const timer = setTimeout(() => {
      reject(new Error("等待 Chromium 输出调试地址超时。"));
    }, settleTimeoutMs);

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      buffered += chunk;
      const match = /ws:\/\/[^\s]+/.exec(buffered);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[0]);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function openSocket(endpoint) {
  return new Promise((resolve, reject) => {
    const socket = new globalThis.WebSocket(endpoint);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("无法连接 Chromium 调试端口。")), {
      once: true,
    });
  });
}

async function capture(browser, { url, recipe, options }) {
  await browser.send("Emulation.setDeviceMetricsOverride", {
    width: options.width,
    height: options.height,
    deviceScaleFactor: options.scale,
    mobile: false,
  });
  await browser.send("Page.navigate", { url });
  await wait(captureSettleMs);

  for (const step of recipe.steps ?? []) {
    const point = await resolveStepPoint(browser, step);
    if (!point) throw new Error(`预览配方找不到目标：${step.selector ?? "point"}`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await browser.send("Input.dispatchMouseEvent", {
        type,
        x: point.x,
        y: point.y,
        button: "left",
        buttons: type === "mousePressed" ? 1 : 0,
        clickCount: 1,
      });
    }
    await wait(step.waitMs ?? 90);
  }
  if (recipe.settleMs) await wait(recipe.settleMs);

  const { data } = await browser.send("Page.captureScreenshot", {
    format: "webp",
    quality: options.quality,
    captureBeyondViewport: false,
  });
  const image = Buffer.from(data, "base64");
  if (image.length === 0) throw new Error("Chromium 返回了空截图。");
  return image;
}

async function resolveStepPoint(browser, step) {
  if (step.point) return step.point;
  const { result } = await browser.send("Runtime.evaluate", {
    expression: `(() => {
      const element = document.querySelector(${JSON.stringify(step.selector)});
      if (!element) return "";
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return "";
      return JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    })()`,
    returnByValue: true,
  });
  if (typeof result.value !== "string" || result.value === "") return null;
  const rect = JSON.parse(result.value);
  const offset = step.offset ?? { x: 0.5, y: 0.5 };
  return {
    x: rect.left + rect.width * offset.x,
    y: rect.top + rect.height * offset.y,
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}
