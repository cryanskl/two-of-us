import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(file) {
  return fs.readFileSync(new URL(file, import.meta.url), "utf8");
}

test("local entry is self-contained, classic-script ordered, and has the exact no-JavaScript fallback", () => {
  const html = read("./index.html");

  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["']https?:\/\//iu);
  assert.doesNotMatch(html, /<script[^>]*\btype=["']module["']/iu);

  const configIndex = html.indexOf('src="config.js"');
  const logicIndex = html.indexOf('src="logic.js"');
  const appIndex = html.indexOf('src="app.js"');
  assert.ok(configIndex >= 0 && configIndex < logicIndex && logicIndex < appIndex);

  const noScript = html.match(/<noscript>([\s\S]*?)<\/noscript>/iu)?.[1] ?? "";
  for (const text of [
    "等雪停下",
    "把四阵风收进雪球里。等雪慢慢落下，会有一句话留在里面。",
    "请开启 JavaScript 后再收集四阵风",
    "这只雪球只在本机运行，留言会在雪停后才出现。",
  ]) assert.ok(noScript.includes(text), text);
  assert.doesNotMatch(noScript, /<button|<canvas|final-message|pattern-label/iu);
});

test("the page keeps private content out of static markup and renders the complete letter structurally", () => {
  const html = read("./index.html");
  const app = read("./app.js");

  for (const privateText of [
    "一颗由雪花拼成的心",
    "雪停以后，是你",
    "风停下来的时候，我还是最想把这句话留给你。",
  ]) assert.equal(html.includes(privateText), false, privateText);

  assert.doesNotMatch(app, /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/u);
  for (const expected of [
    '"final-message"',
    '"result-letter"',
    '"pattern-label"',
    '"recipient-line"',
    '"final-title"',
    '"final-note"',
    '"signature"',
    '"tabindex"',
  ]) assert.ok(app.includes(expected), expected);
});

test("one app owns pointer equivalence, lifecycle cleanup, token completion, and no-Canvas fallback", () => {
  const app = read("./app.js");

  for (const expected of [
    "setPointerCapture",
    "lostpointercapture",
    "pointercancel",
    "pagehide",
    "visibilitychange",
    "prefers-reduced-motion",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "SETTLE_TIMEOUT_MS",
    "COMPLETE_SETTLE",
    "canvas-fallback",
    "createStartAction",
  ]) assert.ok(app.includes(expected), expected);

  assert.doesNotMatch(app, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/u);
  assert.doesNotMatch(app, /\b(?:devicemotion|deviceorientation)\b/u);
});

test("styles preserve the accepted palette, minimum targets, responsive gates, and accessibility modes", () => {
  const css = read("./styles.css");

  for (const expected of [
    "--night-950: #07111f",
    "--glass-300: #8fb7d8",
    "--snow-50: #fff7e8",
    "--berry-950: #2a1019",
    "--gold-350: #e7c487",
    "min-height: 48px",
    "touch-action: none",
    "prefers-reduced-motion",
    "forced-colors",
    "orientation: landscape",
    "320px",
    "390px",
    "768px",
  ]) assert.ok(css.includes(expected), expected);
});

test("experience README repeats every pinned attribution and zero-copy boundary", () => {
  const readme = read("./README.md");

  for (const expected of [
    "627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59",
    "9ee144a548aad85275318b30891c71dcf6e10f7b",
    "20eebad51dde793070c373d594099a7ed8d96e22",
    "70d42d5484db7fd1646e48cc17caa5ff1c9d92cb",
    "Copyright (c) 2020 Matteo Bruni",
    "Copyright (c) 2026, dango0812",
    "Copyright (c) 2020, Kiril Vatev",
    "W3C Software and Document License 2023",
    "没有复制",
    "零第三方运行时依赖",
  ]) assert.ok(readme.includes(expected), expected);
});
