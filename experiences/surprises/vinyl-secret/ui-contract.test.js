"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const directory = __dirname;

function read(relativePath) {
  return fs.readFileSync(path.join(directory, relativePath), "utf8");
}

test("生产包完整且保持 A 级经典脚本闭包", () => {
  for (const relativePath of [
    "index.html",
    "styles.css",
    "config.js",
    "logic.js",
    "app.js",
    "README.md",
    "ATTRIBUTION.md",
    "assets/favicon.svg",
  ]) {
    assert.equal(fs.existsSync(path.join(directory, relativePath)), true, relativePath);
  }

  const html = read("index.html");
  const configIndex = html.indexOf('src="./config.js"');
  const logicIndex = html.indexOf('src="./logic.js"');
  const appIndex = html.indexOf('src="./app.js"');
  assert.equal(configIndex >= 0, true);
  assert.equal(configIndex < logicIndex && logicIndex < appIndex, true);
  assert.doesNotMatch(html, /type\s*=\s*["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)\s*=\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /<(?:base|iframe|form|canvas)\b/i);
  assert.match(html, /<link\b[^>]*rel="icon"[^>]*href="\.\/assets\/favicon\.svg"/i);
  assert.match(html, /<noscript\b[^>]*>[\s\S]*此体验需要浏览器启用 JavaScript/);

  const localReferences = [...html.matchAll(
    /(?:src|href)\s*=\s*["'](\.\/[^"'?#]+)["']/g,
  )].map((match) => match[1]);
  for (const reference of localReferences) {
    assert.equal(fs.existsSync(path.join(directory, reference)), true, reference);
  }
});

test("静态 HTML 只保留公共 shell、单一状态区与无源 audio", () => {
  const html = read("index.html");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1\b[^>]*>\s*把秘密藏进这一圈\s*<\/h1>/);
  assert.match(html, /id="stage"/);
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  assert.match(html, /id="live-status"[^>]*role="status"/);
  assert.equal((html.match(/<audio\b/g) || []).length, 1);
  assert.match(html, /<audio\b[^>]*id="track-audio"[^>]*preload="none"[^>]*><\/audio>/);
  assert.doesNotMatch(html, /<audio\b[^>]*(?:src|autoplay|loop|controls)\b/i);

  for (const secret of [
    "先从外圈找起",
    "第一次和你聊到忘记时间",
    "给你",
    "SIDE US",
    "这一张，想一直和你听下去",
    "private-audio",
    "targetGroove",
  ]) {
    assert.doesNotMatch(html, new RegExp(secret));
  }
});

test("controller 只消费公开 view，并以节点替换守住阶段所有权", () => {
  const source = read("app.js");
  assert.match(source, /VINYL_SECRET_LOGIC/);
  assert.match(source, /\.createInitialState\(/);
  assert.match(source, /\.getViewModel\(/);
  assert.match(source, /\.transition\(/);
  assert.doesNotMatch(source, /\bmachine\.[A-Za-z_$]/);
  assert.doesNotMatch(source, /targetGroove|foundTrackIds|pendingTrackId/);
  assert.match(source, /\.replaceChildren\(/);
  assert.match(source, /\.textContent\s*=/);
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|eval\s*\(/);

  for (const phase of ["intro", "seeking", "playing", "track-result", "complete"]) {
    assert.match(source, new RegExp(`"${phase}"`));
  }
  for (const action of [
    "START",
    "MOVE",
    "DROP_NEEDLE",
    "SETTLE_TRACK",
    "NEXT",
    "RESTART",
  ]) {
    assert.match(source, new RegExp(`type:\\s*"${action}"`));
  }
});

test("原生 range、十二圈、四级信号与焦点合同进入生产控制器", () => {
  const source = read("app.js");
  for (const id of [
    "start-button",
    "outward-button",
    "groove-control",
    "inward-button",
    "drop-button",
    "stop-audio-button",
    "next-button",
    "restart-button",
  ]) {
    assert.match(source, new RegExp(`"${id}"`));
  }
  assert.match(source, /type\s*=\s*"range"/);
  assert.match(source, /\.min\s*=\s*"1"/);
  assert.match(source, /\.max\s*=\s*String\(view\.grooveCount\)/);
  assert.match(source, /\.step\s*=\s*"1"/);
  assert.match(source, /valueAsNumber/);
  assert.match(source, /aria-valuetext/);
  assert.match(source, /view\.grooveCount/);
  assert.match(source, /view\.signalCode/);
  assert.match(source, /view\.signalLabel/);
  assert.match(source, /tabIndex\s*=\s*-1/);
  assert.match(source, /\.focus\(/);
  assert.doesNotMatch(source, /pointer(?:down|move|up)|setPointerCapture|offsetX|clientX/);
});

test("媒体生命周期只有一个 audio、同步 play、generation 与 token 失效保护", () => {
  const source = read("app.js");
  assert.match(source, /getElementById\("track-audio"\)/);
  assert.doesNotMatch(source, /new\s+Audio\s*\(|AudioContext|MediaRecorder|getUserMedia/);
  assert.match(source, /audioGeneration\s*\+=\s*1/);
  assert.match(source, /\.pause\(\)/);
  assert.match(source, /\.removeAttribute\("src"\)/);
  assert.match(source, /\.load\(\)/);
  assert.match(source, /\.play\(\)/);
  assert.match(source, /Promise\.resolve\(/);
  assert.match(source, /pendingToken/);
  assert.match(source, /generation\s*!==\s*audioGeneration/);
  assert.match(source, /setTimeout\(/);
  assert.match(source, /queueMicrotask\(/);
  assert.match(source, /TRACK_SETTLE_MS/);
  for (const reason of ["timer", "reduced-motion", "hidden", "pagehide"]) {
    assert.match(source, new RegExp(`"${reason}"`));
  }
  for (const eventName of ["visibilitychange", "pagehide", "error", "ended"]) {
    assert.match(source, new RegExp(`addEventListener\\("${eventName}"`));
  }
});

test("运行时保持本地、无存储录音上传或额外能力", () => {
  const sources = [read("index.html"), read("styles.css"), read("app.js")].join("\n");
  for (const forbidden of [
    /https?:\/\//,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /sendBeacon/,
    /localStorage/,
    /sessionStorage/,
    /indexedDB/,
    /document\.cookie/,
    /getUserMedia/,
    /MediaRecorder/,
    /AudioContext/,
    /showOpenFilePicker/,
    /<input\b[^>]*type=["']file["']/i,
  ]) {
    assert.doesNotMatch(sources, forbidden);
  }
});

test("样式冻结私人压片桌、响应式、触控与系统模式", () => {
  const css = read("styles.css");
  for (const token of [
    "--ink: #0e0d0c",
    "--tea: #211914",
    "--paper: #f1e7d4",
    "--oxblood: #7a2430",
    "--brass: #c7a45a",
    "--warm-gray: #9a9185",
    "--paper-ink: #241c18",
    "--focus: #f5d986",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.match(css, /min-height:\s*(?:4[8-9]|[5-9]\d)px/);
  assert.match(css, /min-width:\s*(?:4[8-9]|[5-9]\d)px/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /url\s*\(/);
});

test("README 与 ATTRIBUTION 闭合启动、隐私、音频权利和零复制边界", () => {
  const readme = read("README.md");
  const attribution = read("ATTRIBUTION.md");
  assert.match(readme, /^## 借鉴与来源声明$/m);
  for (const document of [readme, attribution]) {
    assert.match(document, /file:\/\//);
    assert.match(document, /默认无音频/);
    assert.match(document, /不是加密|不属于加密/);
    assert.match(document, /词曲权/);
    assert.match(document, /录音权|具体录音/);
    assert.match(document, /参与者.*同意/);
    assert.match(document, /封面/);
    assert.match(document, /字体/);
    assert.match(document, /纹理/);
    assert.match(document, /没有.*第三方开源|无第三方开源/);
    assert.match(document, /没有复制|未复制/);
  }
});
