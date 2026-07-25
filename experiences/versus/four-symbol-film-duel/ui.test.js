"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = __dirname;

function source(file) {
  return readFileSync(join(ROOT, file), "utf8");
}

test("production entrypoint loads local styles and scripts in privacy-safe order", () => {
  const html = source("index.html");
  assert.match(html, /<link[^>]+href="style\.css"/);
  assert.ok(html.indexOf('src="config.js"') < html.indexOf('src="logic.js"'));
  assert.ok(html.indexOf('src="logic.js"') < html.indexOf('src="app.js"'));
  assert.doesNotMatch(html, /https?:\/\//i);
});

test("static HTML contains only the public shell and useful no-JavaScript fallback", () => {
  const html = source("index.html");
  assert.match(html, /<h1>四符片名擂台<\/h1>/);
  assert.match(html, /<noscript>/);
  assert.match(html, /需要启用 JavaScript/);
  assert.match(html, /2 分.*1 分.*0 分/s);
  assert.doesNotMatch(html, /data-(?:card|answer|option|rationale|token)/i);
  assert.doesNotMatch(html, /<template\b/i);
});

test("runtime renders only the core public projection and uses textContent for copy", () => {
  const app = source("app.js");
  assert.match(app, /getPublicView\(/);
  assert.match(app, /\.textContent\s*=/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(app, /DEFAULT_CONFIG\.(?:cards|tokens)/);
});

test("handoff and setup have dedicated renderers while every phase is explicit", () => {
  const app = source("app.js");
  for (const phase of [
    "setup",
    "handoff",
    "question",
    "confirm",
    "result",
    "summary"
  ]) {
    assert.match(app, new RegExp(`"${phase}"`), phase);
  }
  assert.match(app, /请交给/);
  assert.match(app, /确认前不会显示符号、选项或答案/);
});

test("keyboard, visibility and interaction-cancellation contracts are present", () => {
  const app = source("app.js");
  assert.match(app, /addEventListener\("keydown"/);
  assert.match(app, /addEventListener\("visibilitychange"/);
  assert.match(app, /addEventListener\("blur"/);
  assert.match(app, /addEventListener\("pointercancel"/);
  assert.match(app, /heading\.tabIndex\s*=\s*-1/);
  assert.match(app, /"question-heading"/);
});

test("runtime is local-only and does not add persistence, media or timers", () => {
  const app = source("app.js");
  for (const forbidden of [
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "localStorage",
    "sessionStorage",
    "new Audio",
    "AudioContext",
    "setTimeout",
    "setInterval"
  ]) {
    assert.equal(app.includes(forbidden), false, forbidden);
  }
});

test("styles include responsive, focus, reduced-motion and forced-colors gates", () => {
  const css = source("style.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*390px\)/);
  assert.match(css, /@media\s*\(max-width:\s*320px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /min-height:\s*(?:44|48)px/);
});

test("README freezes direct-open, rules, privacy and attribution boundaries", () => {
  const readme = source("README.md");
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /双击.*index\.html/);
  assert.match(readme, /8\s*题/);
  assert.match(readme, /2\s*\/\s*1\s*\/\s*0/);
  assert.match(readme, /交接页[\s\S]*不会出现在 DOM/);
  assert.match(readme, /没有参考或复制[\s\S]*开源项目[\s\S]*代码/);
  assert.match(readme, /Unicode/);
});
