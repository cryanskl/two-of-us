"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const directory = __dirname;

function read(relativePath) {
  return fs.readFileSync(path.join(directory, relativePath), "utf8");
}

test("生产包完整且保持 file:// 经典脚本闭包", () => {
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
  assert.match(html, /<noscript\b[^>]*>[\s\S]*此体验需要浏览器启用 JavaScript/);

  for (const reference of [...html.matchAll(
    /(?:src|href)\s*=\s*["'](\.\/[^"'?#]+)["']/g,
  )].map((match) => match[1])) {
    assert.equal(fs.existsSync(path.join(directory, reference)), true, reference);
  }
});

test("静态 HTML 只有中文公共 shell、公共比赛轨与一个状态播报区", () => {
  const html = read("index.html");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1\b[^>]*>\s*绕词对决\s*<\/h1>/);
  assert.match(html, /id="experience"/);
  assert.match(html, /id="experience-header"/);
  assert.match(html, /id="match-rail"/);
  assert.match(html, /id="player-one-score"/);
  assert.match(html, /id="public-timer"/);
  assert.match(html, /id="player-two-score"/);
  assert.match(html, /id="stage"[^>]*aria-labelledby="stage-title"/);
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  assert.match(html, /id="global-status"[^>]*role="status"/);
  assert.doesNotMatch(html, /word-detour-duel|WORD_DETOUR|target-word|forbidden-list/);
});

test("controller 只将公开 view 交给 renderer，秘密舞台使用节点替换", () => {
  const source = read("app.js");
  assert.match(source, /WordDetourLogic/);
  assert.match(source, /\.createInitialState\(/);
  assert.match(source, /\.getView\(/);
  assert.match(source, /\.reduce\(/);
  assert.doesNotMatch(source, /\bstate\.(?:config|draftTurn|confirmedTurns|result|settings|activeCardIndex|turnIndex)\b/);
  assert.match(source, /\bstate\.revision\b/);
  assert.match(source, /\bstate\.clock\.token\b/);
  assert.match(source, /stage\.replaceChildren\(/);
  assert.match(source, /\.textContent\s*=/);
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|eval\s*\(/);

  for (const phase of [
    "intro",
    "setup",
    "handoff",
    "card-ready",
    "describing",
    "interrupted",
    "turn-ended",
    "turn-review",
    "match-result",
  ]) {
    assert.match(source, new RegExp(`"${phase}"`));
  }
  for (const action of [
    "ENTER_SETUP",
    "SET_VARIANT",
    "SET_TIMER",
    "START_MATCH",
    "REVEAL_CARD",
    "START_CLOCK",
    "RECORD_OUTCOME",
    "INTERRUPT",
    "PREPARE_RESUME",
    "SHOW_REVIEW",
    "RECLASSIFY_CARD",
    "CONFIRM_TURN",
    "RESTART",
  ]) {
    assert.match(source, new RegExp(`type:\\s*"${action}"`));
  }
});

test("题卡、三结果、复核和焦点合同写入生产控制器", () => {
  const source = read("app.js");
  for (const id of [
    "setup-form",
    "handoff-panel",
    "secret-card",
    "target-word",
    "forbidden-list",
    "outcome-controls",
    "interrupted-panel",
    "turn-ended-panel",
    "review-list",
    "match-result",
  ]) {
    assert.match(source, new RegExp(`"${id}"`));
  }
  for (const copy of [
    "猜中 +1",
    "踩词 -1",
    "跳过 0",
    "暂停并遮住",
    "描述者准备恢复",
    "确认本回合结果",
    "再来一局",
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /createElementNS\(/);
  assert.match(source, /aria-hidden/);
  assert.match(source, /tabIndex\s*=\s*-1/);
  assert.match(source, /\.focus\(/);
  assert.doesNotMatch(source, /\.dataset\.(?:card|target|forbidden)/);
});

test("计时、重复输入和页面生命周期遵守显式暂停合同", () => {
  const source = read("app.js");
  assert.match(source, /performance\.now/);
  assert.match(source, /Date\.now/);
  assert.match(source, /setInterval\(/);
  assert.match(source, /clearInterval\(/);
  assert.match(source, /200/);
  assert.match(source, /event\.repeat/);
  assert.match(source, /event\.detail\s*>\s*1/);
  assert.match(source, /document\.visibilityState\s*===\s*"hidden"/);
  for (const eventName of ["visibilitychange", "pagehide", "blur", "focus"]) {
    assert.match(source, new RegExp(`addEventListener\\("${eventName}"`));
  }
  assert.doesNotMatch(source, /addEventListener\("pointer(?:down|up|move)"/);
  assert.doesNotMatch(source, /addEventListener\("dblclick"/);
  assert.doesNotMatch(source, /addEventListener\("keydown"[\s\S]{0,300}event\.key\.length\s*===\s*1/);
});

test("运行时零网络、零存储、零录音、零语音与零剪贴板", () => {
  const runtime = [read("index.html"), read("styles.css"), read("app.js")].join("\n");
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
    /SpeechRecognition/,
    /speechSynthesis/,
    /navigator\.clipboard/,
  ]) {
    assert.doesNotMatch(runtime, forbidden);
  }
});

test("样式冻结纸面路线系统、触控、窄屏与系统模式", () => {
  const css = read("styles.css");
  for (const token of [
    "--paper-100: #f3ead7",
    "--paper-200: #e8d9be",
    "--route-900: #17283f",
    "--route-700: #30465e",
    "--graphite-700: #4a4a46",
    "--success-700: #2d7d72",
    "--foul-700: #b84d3d",
    "--skip-700: #b9842d",
    "--focus-outer: #ffffff",
    "--focus-inner: #116d8a",
  ]) {
    assert.match(css.toLowerCase(), new RegExp(token));
  }
  assert.match(css, /min-height:\s*(?:4[8-9]|[5-9]\d)px/);
  assert.match(css, /min-width:\s*(?:4[8-9]|[5-9]\d)px/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /@media\s*\(max-width:\s*340px\)/);
  assert.match(css, /@media\s*\(max-height:\s*500px\)\s*and\s*\(orientation:\s*landscape\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /url\s*\(/);
});

test("README 与借鉴声明闭合本地启动、隐私、来源和零复制边界", () => {
  const readme = read("README.md");
  const attribution = read("ATTRIBUTION.md");
  assert.match(readme, /^## 借鉴与来源声明$/m);
  for (const document of [readme, attribution]) {
    assert.match(document, /file:\/\//);
    assert.match(document, /开发者工具/);
    assert.match(document, /读屏|朗读/);
    assert.match(document, /刷新|关闭/);
    assert.match(document, /不录音/);
    assert.match(document, /不联网/);
    assert.match(document, /72/);
    assert.match(document, /ImageGen/);
    assert.match(document, /零第三方代码复制/);
    assert.match(document, /零第三方资产复制/);
  }
});
