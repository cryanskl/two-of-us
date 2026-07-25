"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectDir = __dirname;

function read(name) {
  return fs.readFileSync(path.join(projectDir, name), "utf8");
}

function assertOrdered(source, fragments) {
  let cursor = -1;
  for (const fragment of fragments) {
    const next = source.indexOf(fragment, cursor + 1);
    assert.notEqual(next, -1, `缺少顺序片段：${fragment}`);
    assert.ok(next > cursor, `顺序错误：${fragment}`);
    cursor = next;
  }
}

test("生产 UI 文件与目录级 CommonJS 边界齐全", () => {
  for (const name of ["index.html", "style.css", "app.js", "README.md"]) {
    assert.equal(fs.existsSync(path.join(projectDir, name)), true, `缺少 ${name}`);
  }
  assert.equal(read("package.json"), "{\"type\":\"commonjs\"}\n");
});

test("HTML 使用 A 级经典脚本顺序与冻结 main 阅读顺序", () => {
  const html = read("index.html");
  assert.match(html, /<link[^>]+href="\.\/style\.css"/);
  const scripts = [...html.matchAll(/<script\b([^>]*)src="([^"]+)"([^>]*)><\/script>/g)];
  assert.deepEqual(scripts.map((match) => match[2]), [
    "./logic.js",
    "./config.js",
    "./app.js",
  ]);
  assert.ok(scripts.every((match) => !/\btype\s*=\s*["']module["']/.test(`${match[1]} ${match[3]}`)));
  assertOrdered(html, [
    'data-region="header"',
    'data-region="phase"',
    'data-region="stage"',
    'data-region="telemetry"',
    'data-region="gates"',
    'data-region="attitude-controls"',
    'data-region="thrust-controls"',
    'data-region="stable"',
    'data-region="log"',
    'data-region="live"',
  ]);
  assert.doesNotMatch(html, /https?:\/\/|\/\/cdn\.|type=["']module["']/i);
});

test("页面只出现冻结文案、四项遥测、六条 Gate 与四个原生控制", () => {
  const html = read("index.html");
  for (const copy of [
    "转一点，推一点，刚好回家",
    "姿态席只管转，推进席只管推。六条条件一起安全，并保持 30 格，就能稳稳接住。",
    "本地同机，不联网。这是归一化的合作游戏，不是航天训练或真实操作建议。",
    "位置 x / y",
    "线速度 vx / vy",
    "船头角差",
    "角速度",
    "位置进入接口",
    "线速度收住",
    "船头对准",
    "角速度收住",
    "四键已松开",
    "路径无碰撞",
  ]) assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const controls = [...html.matchAll(/<button\b[^>]*data-control="([^"]+)"[^>]*>/g)];
  assert.deepEqual(controls.map((match) => match[1]), [
    "rotate-left",
    "rotate-right",
    "thrust-forward",
    "thrust-reverse",
  ]);
  assert.ok(controls.every((match) => /\btype="button"/.test(match[0])));
  assert.ok(controls.every((match) => /\bdisabled\b/.test(match[0])));
  assert.ok(controls.every((match) => /\baria-pressed="false"/.test(match[0])));
});

test("无脚本回退只有静态说明，不伪造可玩状态", () => {
  const html = read("index.html");
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/i)?.[1] || "";
  for (const copy of [
    "转一点，推一点，刚好回家",
    "姿态席只管转，推进席只管推。六条条件一起安全，并保持 30 格，就能稳稳接住。",
    "请开启本地 JavaScript 后再开始对接；页面不会联网。",
    "这是归一化的合作游戏，不是航天训练或真实操作建议。",
  ]) assert.match(noscript, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(noscript, /noscript-stage/);
  assert.doesNotMatch(noscript, /data-control=|data-gate=|遥测|完成日志|你 · 姿态席|TA · 推进席|稳稳接回家/);
});

test("app 只投影 public view，并具备输入 epoch、固定步 generation 与清理边界", () => {
  const source = read("app.js");
  assert.match(source, /CapsuleDockingLogic/);
  assert.match(source, /\.createInitialState\(/);
  assert.match(source, /\.reduce\(/);
  assert.match(source, /\.getPublicView\(/);
  assert.doesNotMatch(source, /evaluateDockGate|circleIntersectsAabb|shortestAngleDiff|golden-fixtures/);
  assert.match(source, /\binputEpoch\b/);
  assert.match(source, /\brafGeneration\b/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /lostpointercapture/);
  assert.match(source, /pointercancel/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /pagehide/);
  assert.match(source, /pageshow/);
  assert.match(source, /\bblur\b/);
  assert.match(source, /\bEscape\b/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /queueMicrotask/);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(source, /\b(?:AudioContext|webkitAudioContext|getUserMedia|geolocation)\b/);
});

test("CSS 锁定纸质训练台、触控尺寸、回流与系统可访问模式", () => {
  const css = read("style.css");
  for (const fragment of [
    "--paper",
    "--window",
    "--attitude",
    "--thrust",
    ":focus-visible",
    "min-height: 44px",
    "min-height: 48px",
    "@media (max-width: 390px)",
    "@media (max-width: 320px)",
    "@media (prefers-reduced-motion: reduce)",
    "@media (forced-colors: active)",
  ]) assert.match(css, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(css, /\border\s*:|display\s*:\s*contents/i);
});

test("README 说明直开、双席信任边界、配置入口和完整借鉴声明", () => {
  const markdown = read("README.md");
  for (const fragment of [
    "双击",
    "index.html",
    "A / D",
    "J / L",
    "config.js",
    "不联网",
    "无法证明",
    "Gymnasium",
    "p2.js",
    "SAT.js",
    "Phaser",
    "20b453de30ef725a538e235fcdec909f30c95783",
    "2beb2750f42d29014e289cb803b7269d5b0edaad",
    "20e612681d1f9eabc9ea34dc98c4d27f985ffec6",
    "41be1e462bc600064e498cba370bfa8c5c055a22",
  ]) assert.match(markdown, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
