"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const projectRoot = __dirname;

function source(name) {
  return readFileSync(resolve(projectRoot, name), "utf8");
}

test("生产入口闭包使用本地经典脚本且无远程运行资源", () => {
  const html = source("index.html");
  assert.match(html, /<html[^>]+lang="zh-CN"/);
  assert.match(html, /<link[^>]+href="style\.css"/);
  assert.match(
    html,
    /<script src="config\.js"><\/script>\s*<script src="logic\.js"><\/script>\s*<script src="app\.js"><\/script>/,
  );
  assert.doesNotMatch(html, /type="module"|https?:\/\/|srcset=|integrity=/i);
  assert.match(html, /<noscript>[\s\S]*启用 JavaScript[\s\S]*不上传[\s\S]*<\/noscript>/);
});

test("页面骨架和原生输入冻结可访问交互合同", () => {
  const html = source("index.html");
  for (const marker of [
    'id="experience"',
    'id="source-panel"',
    'id="photo-input"',
    'type="file"',
    'accept="image/jpeg,image/png,image/webp"',
    'id="arena"',
    'id="left-board"',
    'id="right-board"',
    'id="status-message"',
    'aria-live="polite"',
  ]) {
    assert.ok(html.includes(marker), marker);
  }
  assert.doesNotMatch(html, /role="grid"|maximum-scale|user-scalable/i);
});

test("运行时不联网、不持久化、不录音且不注入危险 HTML", () => {
  const runtime = [source("index.html"), source("style.css"), source("app.js")].join("\n");
  for (const forbidden of [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /sendBeacon/,
    /localStorage/,
    /sessionStorage/,
    /indexedDB/,
    /serviceWorker/,
    /\bcaches\./,
    /getUserMedia/,
    /MediaRecorder/,
    /SpeechRecognition/,
    /webkitSpeechRecognition/,
    /innerHTML/,
    /outerHTML/,
    /insertAdjacentHTML/,
    /document\.write/,
    /https?:\/\//,
  ]) {
    assert.doesNotMatch(runtime, forbidden);
  }
});

test("本地图片管线冻结验证、解码、裁切和 URL 释放边界", () => {
  const app = source("app.js");
  assert.match(app, /20\s*\*\s*1024\s*\*\s*1024/);
  assert.match(app, /createImageBitmap\([\s\S]*imageOrientation:\s*"from-image"/);
  assert.match(app, /\.close\(\)/);
  assert.match(app, /toBlob\(/);
  assert.match(app, /URL\.createObjectURL\(/);
  assert.match(app, /URL\.revokeObjectURL\(/);
  assert.match(app, /pagehide/);
  assert.match(app, /beforeunload/);
  assert.match(app, /generation/);
  assert.doesNotMatch(app, /file\.name|webkitRelativePath/);
});

test("比赛 UI 只通过冻结核心状态机驱动", () => {
  const app = source("app.js");
  assert.match(app, /PhotoSliderRaceLogic/);
  assert.match(app, /createInitialState\(\)/);
  assert.match(app, /getPublicView\(/);
  assert.match(app, /logic\.reduce\(/);
  for (const action of [
    "START_MATCH",
    "COUNTDOWN_TICK",
    "MOVE",
    "PAUSE",
    "RESUME",
    "SETTLE",
    "REMATCH",
    "RETURN_TO_SETUP",
  ]) {
    assert.ok(app.includes(`logic.ACTIONS.${action}`), action);
  }
  assert.match(app, /performance\.now\(\)/);
  assert.doesNotMatch(app, /Math\.random\(\)|Date\.now\(\)/);
});

test("键盘、点击、失焦和隐藏生命周期均有明确入口", () => {
  const app = source("app.js");
  assert.match(app, /keydown/);
  assert.match(app, /logic\.classifyKeyInput/);
  assert.match(app, /isControlTarget\(event\.target\)/);
  assert.match(app, /closest\("input, button, select, textarea/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /\bblur\b/);
  assert.match(app, /document\.visibilityState\s*===\s*"hidden"/);
  assert.match(app, /addEventListener\("click"/);
});

test("视觉系统覆盖双板、六类视口与辅助模式", () => {
  const css = source("style.css");
  for (const token of [
    "--color-bg: #03091c",
    "--color-left: #f6b943",
    "--color-right: #ff7864",
    "--font-display:",
    "--motion-tile:",
  ]) {
    assert.ok(css.includes(token), token);
  }
  assert.match(css, /grid-template-columns:[^;]*minmax\([^;]*232px[^;]*minmax\(/);
  assert.match(css, /@media[^{]*max-width:\s*1100px/);
  assert.match(css, /@media[^{]*max-width:\s*600px/);
  assert.match(css, /@media[^{]*max-width:\s*350px/);
  assert.match(css, /@media[^{]*orientation:\s*landscape/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /min-height:\s*44px|min-width:\s*44px/);
});

test("README 与借鉴声明锁定直开、隐私、权利和独立实现事实", () => {
  const readme = source("README.md");
  const attribution = source("ATTRIBUTION.md");
  for (const phrase of [
    "双击",
    "W/A/S/D",
    "方向键",
    "JPEG",
    "20 MiB",
    "不上传",
    "不保存",
    "有权使用",
    "Object URL",
    "createImageBitmap",
    "独立实现",
  ]) {
    assert.ok(readme.includes(phrase), phrase);
  }
  assert.match(attribution, /独立实现/);
  assert.match(attribution, /未复制[\s\S]*开源/);
  assert.match(attribution, /OpenAI Image Gen/);
  assert.match(attribution, /不作为运行时/);
});
