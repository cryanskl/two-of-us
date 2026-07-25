"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;

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

test("production bundle is complete and build-free", () => {
  for (const relativePath of [
    "index.html",
    "app.js",
    "styles.css",
    "README.md",
    "assets/favicon.svg",
  ]) {
    assert.equal(fs.statSync(path.join(ROOT, relativePath)).isFile(), true, relativePath);
  }
});

test("HTML freezes the semantic reading order and exact visible copy", () => {
  const html = read("index.html");
  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<html lang="zh-CN">/u);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/u);
  assert.match(html, /<link rel="icon" href="\.\/assets\/favicon\.svg" type="image\/svg\+xml">/u);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/u);
  assertInOrder(html, [
    '<main class="compliment-reels"',
    '<header class="page-heading">',
    '<p class="round-guarantee">',
    '<section class="reel-frame"',
    '<p class="stage-copy"',
    '<button class="pull-handle"',
    '<p class="live-region sr-only"',
  ]);
  assertInOrder(html, [
    '<script src="./config.js"></script>',
    '<script src="./logic.js"></script>',
    '<script src="./app.js"></script>',
  ]);

  for (const copy of [
    "每一格，都是喜欢你的理由",
    "这一轮最多六次，会遇到一组特别同频；顺序在开始时已经排好。每一次，都只是认真夸你。",
    "我看见的你",
    "发亮的样子",
    "留给我的感觉",
    "正在把这一轮排好。",
    "重试准备",
  ]) {
    assert.ok(html.includes(copy), copy);
  }

  assert.equal((html.match(/<button\b/gu) || []).length, 1);
  assert.equal(/class="(?:current-praise|history-strip|jackpot-letter|fallback-copy)"/u.test(html), false);
  assert.equal(/type=["']module["']/u.test(html), false);
  assert.equal(/https?:\/\//u.test(html), false);
  assert.equal(/m_(?:listen|remember|finish|slow|notice|care)/u.test(html), false);
});

test("controller uses public views, precommitted entropy and tokenized settling", () => {
  const app = read("app.js");
  for (const required of [
    "logic.getPublicView(state)",
    "logic.createArmAction(",
    "crypto.getRandomValues",
    "new Uint32Array(logic.ENTROPY_LENGTH)",
    "logic.FALLBACK_ENTROPY",
    'document.createElement("output")',
    'output.setAttribute("role", "paragraph")',
    'document.createElement("ol")',
    'document.createElement("section")',
    '{ type: "PULL" }',
    '{ type: "SUSPEND" }',
    'type: "SETTLE"',
    '{ type: "RESTART" }',
    "view.animationToken",
    'addEventListener("click"',
    'addEventListener("keydown"',
    'addEventListener("keyup"',
    'addEventListener("visibilitychange"',
    'addEventListener("pagehide"',
    'addEventListener("blur"',
    "prefers-reduced-motion: reduce",
    "queueMicrotask",
    "setTimeout",
    "clearTimeout",
  ]) {
    assert.ok(app.includes(required), required);
  }

  for (const forbidden of [
    "Math.random",
    "Date.now",
    "new Date",
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "localStorage",
    "sessionStorage",
    "document.cookie",
    "innerHTML",
    "console.",
    ".plan",
    ".jackpotSpin",
    ".entropy",
  ]) {
    assert.equal(app.includes(forbidden), false, forbidden);
  }
});

test("styles preserve the accepted materials and accessibility fallbacks", () => {
  const css = read("styles.css");
  for (const required of [
    "--clay-100: #f3dfda",
    "--plum-900: #351022",
    "--plum-750: #5b1837",
    "--paper-100: #fff3d6",
    "--coral-500: #ef776b",
    "--ink-950: #17243c",
    "--brass-600: #b48a4a",
    ".pull-handle:focus-visible",
    "padding: 44px 8px 8px",
    "@media (max-width: 359px)",
    "@media (prefers-reduced-motion: reduce)",
    "@media (forced-colors: active)",
  ]) {
    assert.ok(css.includes(required), required);
  }
  const handleRule = css.match(/\.pull-handle\s*\{([\s\S]*?)\}/u);
  assert.ok(handleRule);
  const targetHeight = handleRule[1].match(/min-height:\s*(\d+)px/u);
  assert.ok(targetHeight);
  assert.ok(Number(targetHeight[1]) >= 48);
  assert.equal(/url\s*\(/u.test(css), false);
  assert.equal(/(?:desktop|mobile|narrow|tablet)-[a-z-]*concept|\.png/iu.test(css), false);
});

test("README independently records all fixed open-source study boundaries", () => {
  const readme = read("README.md");
  for (const required of [
    "file://",
    "nuxy/slot-machine-gen",
    "56c9017e839583dcb8fcb5cc88b08b30ed63f66a",
    "davidbau/seedrandom",
    "4460ad325a0a15273a211e509f03ae0beb99511a",
    "tweenjs/tween.js",
    "20079e65f77bb2b8e52cc9d7dbed044b86e537d3",
    "catdad/canvas-confetti",
    "20eebad51dde793070c373d594099a7ed8d96e22",
    "未复制",
    "零第三方运行依赖",
  ]) {
    assert.ok(readme.includes(required), required);
  }
});
