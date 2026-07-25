import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

await import("./config.js");
await import("./logic.js");

const logic = globalThis.HoneycombPassageLogic;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTION_FILES = [
  "index.html",
  "styles.css",
  "config.js",
  "logic.js",
  "app.js",
  "README.md",
  "ATTRIBUTION.md",
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function assertInOrder(source, fragments) {
  let cursor = -1;
  for (const fragment of fragments) {
    const next = source.indexOf(fragment, cursor + 1);
    assert.notEqual(next, -1, `missing ordered fragment: ${fragment}`);
    assert.ok(next > cursor, `out-of-order fragment: ${fragment}`);
    cursor = next;
  }
}

test("A 级生产包完整，并保持无构建的本地资源闭包", () => {
  for (const relativePath of PRODUCTION_FILES) {
    assert.equal(
      fs.statSync(path.join(ROOT, relativePath)).isFile(),
      true,
      relativePath,
    );
  }

  const html = read("index.html");
  assertInOrder(html, [
    '<link rel="stylesheet" href="./styles.css">',
    '<script src="./config.js"></script>',
    '<script src="./logic.js"></script>',
    '<script src="./app.js"></script>',
  ]);
  assert.doesNotMatch(html, /<script[^>]*\btype=["']module["']/iu);
  assert.doesNotMatch(
    html,
    /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//iu,
  );
  assert.doesNotMatch(
    html,
    /<(?:base|iframe|frame|embed|object|img|picture|audio|video|canvas)\b/iu,
  );
  assert.doesNotMatch(html, /\b(?:integrity|crossorigin)\s*=/iu);
});

test("静态入口冻结语义顺序、公开文案、JS 接管边界与 no-JS 基线", () => {
  const html = read("index.html");

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<html\s+lang="zh-CN">/u);
  assert.match(
    html,
    /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1">/u,
  );
  assert.match(html, /<main\b[^>]*id="honeycomb-passage"/u);
  assert.match(
    html,
    /id="experience-root"[^>]*hidden|hidden[^>]*id="experience-root"/u,
  );
  assert.match(html, /id="turn-heading"[^>]*tabindex="-1"/u);
  assert.match(html, /id="honeycomb-board"[^>]*aria-labelledby="turn-heading"/u);
  assert.match(
    html,
    /id="live-status"[^>]*role="status"[^>]*aria-live="polite"/u,
  );
  assert.match(
    html,
    /id="handoff-gate"[^>]*hidden|hidden[^>]*id="handoff-gate"/u,
  );
  assert.match(
    html,
    /<button\b[^>]*id="handoff-confirm"[^>]*type="button"[^>]*>[^<]*交给下一位[^<]*<\/button>/u,
  );

  for (const copy of [
    "蜜径相逢",
    "走一步，或封一格。先到对边，但谁都不能被彻底堵住。",
    "移动",
    "封蜡",
    "开始这一局",
    "再来一局",
  ]) {
    assert.equal(html.includes(copy), true, copy);
  }

  const noScript = html.match(/<noscript>([\s\S]*?)<\/noscript>/iu)?.[1] ?? "";
  for (const copy of [
    "蜜径相逢",
    "走一步，或封一格。先到对边，但谁都不能被彻底堵住。",
    "请开启 JavaScript 后再开始这一局。",
  ]) {
    assert.equal(noScript.includes(copy), true, copy);
  }
  assert.doesNotMatch(noScript, /<(?:button|canvas|svg|form|input|select)\b/iu);
});

test("app 从公开 view 生成精确 37 个原生 cell button，不自建第二份棋盘", () => {
  const source = read("app.js");
  const initialView = logic.getScreenView(logic.createInitialState());

  assert.equal(initialView.boardCells.length, 37);
  assert.equal(new Set(initialView.boardCells.map(logic.cellKey)).size, 37);

  for (const required of [
    "HoneycombPassageLogic",
    "createInitialState",
    "getScreenView",
    "view.boardCells",
    'document.createElement("button")',
    'cellButton.type = "button"',
    "cellButton.dataset.cellKey",
    'cellButton.setAttribute("aria-label"',
    "replaceChildren",
    "legalMoveKeys",
    "legalSealKeys",
    "sealsRemaining",
    'type: "ACT"',
  ]) {
    assert.equal(source.includes(required), true, required);
  }

  assert.doesNotMatch(source, /(?:const|let|var)\s+(?:BOARD|CELLS)\s*=\s*\[/u);
  assert.doesNotMatch(
    source,
    /(?:createElement|createElementNS)\(\s*["'](?:canvas|svg|img|picture)["']/u,
  );
  assert.doesNotMatch(
    source,
    /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/u,
  );
});

test("移动/封蜡模式、拒绝反馈、焦点与 live region 只投影权威状态", () => {
  const source = read("app.js");

  for (const required of [
    'let currentMode = "move"',
    '"move"',
    '"seal"',
    '"aria-pressed"',
    "modeMove",
    "modeSeal",
    "cellButton.focus",
    "turnHeading.focus",
    "liveStatus.textContent",
    "这格不能移动",
    "这格不能封蜡",
    "会让",
    "无路可走",
  ]) {
    assert.equal(source.includes(required), true, required);
  }

  assert.match(
    source,
    /modeSeal\.disabled\s*=\s*handoffPending\s*\|\|\s*view\.sealsRemaining\[view\.activePlayer\]\s*===\s*0/u,
  );
  assert.doesNotMatch(source, /cellButton\.disabled\s*=\s*!isLegal/u);
  assert.doesNotMatch(source, /\bstate\.(?:phase|history|revision|content)\s*=/u);
  assert.doesNotMatch(source, /\b(?:state|view)\.history\.push\b/u);
});

test("合法非终局行动进入可聚焦热座交接 gate，确认不 dispatch core", () => {
  const source = read("app.js");
  const coreSource = read("logic.js");

  for (const required of [
    "let handoffPending = false",
    "function showHandoff",
    "function confirmHandoff",
    "handoffPending = true",
    "handoffPending = false",
    "handoffGate.hidden",
    "handoffConfirm.focus",
    'nextView.phase === "playing"',
    "cellButton.disabled = handoffPending",
    "modeMove.disabled = handoffPending",
    "modeSeal.disabled = handoffPending",
  ]) {
    assert.equal(source.includes(required), true, required);
  }

  const confirmHandler = source.match(
    /function confirmHandoff\([^)]*\)\s*\{([\s\S]*?)\n\}/u,
  );
  assert.ok(confirmHandler, "confirmHandoff handler");
  assert.doesNotMatch(
    confirmHandler[1],
    /\b(?:reduce|dispatch)\s*\(|type\s*:\s*["'](?:ACT|START|RESTART)["']/u,
  );

  assert.doesNotMatch(
    coreSource,
    /\b(?:handoff|交接|交给下一位)\b/iu,
    "handoff is app-only presentation state",
  );
});

test("样式实现暖象牙纸雕蜂巢、触控目标、焦点和系统降级", () => {
  const css = read("styles.css");
  const lower = css.toLowerCase();

  for (const token of [
    "#f3e8cf",
    "#432819",
    "#756653",
    "#ebcb86",
    "#b9893d",
    "#d49713",
    "#4d3868",
    "#8f342d",
    "#6551a4",
    "#a64036",
  ]) {
    assert.equal(lower.includes(token), true, token);
  }

  for (const required of [
    ".hex-cell",
    "clip-path: polygon(",
    "min-width: 44px",
    "min-height: 44px",
    ".mode-button",
    "min-height: 48px",
    ":focus-visible",
    "outline-offset:",
    "@media (max-width: 600px)",
    "@media (prefers-reduced-motion: reduce)",
    "@media (forced-colors: active)",
  ]) {
    assert.equal(css.includes(required), true, required);
  }

  assert.doesNotMatch(css, /url\s*\(|@import\b|outline\s*:\s*none/iu);
  const reducedMotion = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/u,
  );
  assert.ok(reducedMotion, "reduced-motion media query");
  assert.match(reducedMotion[1], /animation(?:-duration)?\s*:\s*(?:none|0)/u);
  assert.match(reducedMotion[1], /transition(?:-duration)?\s*:\s*(?:none|0)/u);
});

test("运行代码保持 code-native、经典脚本、零网络、零存储与零计时规则依赖", () => {
  for (const file of ["index.html", "styles.css", "app.js"]) {
    const source = read(file);
    assert.doesNotMatch(source, /docs\/assets|concept-[a-z-]+\.(?:png|webp|jpe?g)/iu, file);
    assert.doesNotMatch(source, /(?:^|\n)\s*(?:import|export)\s/u, file);
    assert.doesNotMatch(source, /["']https?:\/\//iu, file);
  }

  const app = read("app.js");
  assert.doesNotMatch(
    app,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u,
  );
  assert.doesNotMatch(
    app,
    /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|caches)\b/u,
  );
  assert.doesNotMatch(
    app,
    /\b(?:setTimeout|setInterval|requestAnimationFrame|Math\.random|Date\.now)\b/u,
  );
  assert.doesNotMatch(app, /\b(?:Audio|AudioContext|Worker)\b/u);
});

test("README 与 ATTRIBUTION 完整说明启动、热座、隐私、离线和固定借鉴边界", () => {
  const readme = read("README.md");
  const attribution = read("ATTRIBUTION.md");

  for (const required of [
    "双击",
    "file://",
    "37",
    "移动",
    "封蜡",
    "不能",
    "路线",
    "16",
    "热座",
    "交给下一位",
    "config.js",
    "playerNames",
    "finalNote",
    "不是秘密",
    "零网络",
    "不使用 storage",
    "零第三方运行",
    "flauwekeul/honeycomb",
    "6353276ef8197fbdba60d0c964f7bd4f2169064c",
    "tridpt/TwoPlayerGames",
    "c96b802232d87d58408ed653dcbe43c0a68611f6",
    "未复制",
  ]) {
    assert.equal(readme.includes(required), true, required);
  }

  for (const required of [
    "Hexagonal Grids",
    "Implementation of Hex Grids",
    "flauwekeul/honeycomb",
    "6353276ef8197fbdba60d0c964f7bd4f2169064c",
    "MIT",
    "Copyright © 2017 Abbe Keultjes",
    "tridpt/TwoPlayerGames",
    "c96b802232d87d58408ed653dcbe43c0a68611f6",
    "Copyright © 2026 tridpt",
    "W3C WCAG 2.2",
    "未复制",
    "零代码、零素材复制",
  ]) {
    assert.equal(attribution.includes(required), true, required);
  }
});
