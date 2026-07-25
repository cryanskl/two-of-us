const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;

function source(name) {
  return readFileSync(path.join(root, name), "utf8");
}

test("production entry files exist and use the frozen classic-script order", () => {
  for (const name of ["index.html", "styles.css", "app.js", "README.md"]) {
    assert.equal(existsSync(path.join(root, name)), true, name);
  }

  const html = source("index.html");
  const logic = html.indexOf('src="./logic.js"');
  const config = html.indexOf('src="./config.js"');
  const app = html.indexOf('src="./app.js"');
  assert.equal(logic >= 0 && config > logic && app > config, true);
  assert.doesNotMatch(html, /type\s*=\s*["']module["']/i);
  assert.doesNotMatch(html, /https?:\/\/|<base\b|modulepreload|preload/i);
});

test("HTML is semantic, progressively enhanced, and keeps exactly eight native pose buttons", () => {
  const html = source("index.html");
  assert.match(html, /<main\b[^>]*id=["']shadow-duet["']/i);
  assert.match(html, /<h1\b[^>]*>把影子，跳成我们<\/h1>/);
  assert.match(html, /四个姿势，两道影子。看准目标，在亮起的这一拍一起定格。/);
  assert.match(html, /<section\b[^>]*aria-labelledby=/i);
  assert.equal((html.match(/<fieldset\b/g) || []).length, 2);
  assert.equal((html.match(/<button\b[^>]*data-seat=/g) || []).length, 8);
  assert.equal((html.match(/<legend\b/g) || []).length, 2);
  assert.match(html, /aria-live=["']polite["']/i);
  assert.match(html, /<noscript>[\s\S]*请开启 JavaScript 后再一起排这支影子舞[\s\S]*<\/noscript>/);
  assert.match(html, /这支舞只在本机运行，不录音、不录像，也不会上传两个人的操作。/);
  assert.doesNotMatch(html, /<canvas\b|<img\b|<audio\b|<video\b/i);
});

test("controller consumes only the public view and never duplicates frozen game data", () => {
  const app = source("app.js");
  assert.match(app, /ShadowDuetLogic/);
  assert.match(app, /\.createInitialState\(\)/);
  assert.match(app, /\.reduce\(/);
  assert.match(app, /\.getPublicView\(/);
  assert.match(app, /\.resolveCompletionNote\(/);
  assert.doesNotMatch(app, /\.SCENES\b|WINDOW_START_TICK|WINDOW_END_TICK|REQUIRED_STABLE_TICKS/);
  assert.doesNotMatch(app, /open-wings|little-roof|moon-left|moon-right|offer-hand|swap-hand/);
  assert.doesNotMatch(app, /winner|score|combo|accuracy|perfect|ranking/i);
});

test("keyboard input is phase-gated, physical-code based, and cleans up exact held poses", () => {
  const app = source("app.js");
  for (const expected of [
    "keydown", "keyup", "event.code", "event.repeat", "event.isComposing",
    "event.altKey", "event.ctrlKey", "event.metaKey", "event.shiftKey",
    "contenteditable", "PRESS", "RELEASE", "Escape", "preventDefault",
  ]) assert.equal(app.includes(expected), true, expected);
  assert.match(app, /view\.phase\s*!==\s*["']dancing["']/);
  assert.match(app, /pressedKeys\.(?:has|add|delete|clear)/);
  assert.doesNotMatch(app, /event\.key\b|keyCode|which\b/);
});

test("pointer ownership is exact-id, capture-safe, idempotent, and click-free", () => {
  const app = source("app.js");
  for (const expected of [
    "pointerdown", "pointerup", "pointercancel", "lostpointercapture",
    "setPointerCapture", "releasePointerCapture", "pointerId", "isPrimary",
    "activePointers", "document.addEventListener", "document.removeEventListener",
  ]) assert.equal(app.includes(expected), true, expected);
  assert.match(app, /activePointers\.delete\([^)]*pointerId/);
  assert.match(app, /activePointers\.delete\([^)]*pointerId[\s\S]{0,500}type:\s*["']RELEASE["']/);
  assert.doesNotMatch(app, /addEventListener\(["']click["'][\s\S]{0,200}(?:data-seat|data-pose)/);
});

test("the single RAF clock bounds catch-up and fails closed on invalid timestamps", () => {
  const app = source("app.js");
  for (const expected of [
    "requestAnimationFrame", "cancelAnimationFrame", "Number.isFinite",
    "lastTimestamp", "accumulator", "TICK_RATE", "MAX_STEP_TICKS",
  ]) assert.equal(app.includes(expected), true, expected);
  assert.match(app, /Math\.min\([^)]*MAX_STEP_TICKS/);
  assert.match(app, /timestamp\s*<\s*lastTimestamp|timestamp\s*<=\s*lastTimestamp/);
  assert.match(app, /type:\s*["']STEP["']/);
  assert.match(app, /view\.phase\s*===\s*["']dancing["']/);
  assert.doesNotMatch(app, /setInterval|setTimeout/);
});

test("blur, visibility, pagehide, phase focus, and live announcements are explicit", () => {
  const app = source("app.js");
  for (const expected of [
    "visibilitychange", "document.hidden", "pagehide", "blur", "focus",
    "SUSPEND", "queueMicrotask", "focusToken", "aria-pressed",
  ]) assert.equal(app.includes(expected), true, expected);
  assert.match(app, /liveRegion\.textContent/);
  assert.doesNotMatch(app, /liveRegion\.textContent\s*=[^;]*(?:view\.tick|stableTicks)/);
});

test("visual system preserves the paper theatre and all accessibility fallbacks", () => {
  const css = source("styles.css");
  for (const token of [
    "--night:", "--indigo:", "--indigo-raised:", "--paper:", "--paper-hot:",
    "--paper-card:", "--ink:", "--brass:", "--text:", "--muted:", "--focus:",
  ]) assert.equal(css.includes(token), true, token);
  for (const expected of [
    "min-width: 44px", "min-height: 56px", "min-height: 48px",
    "prefers-reduced-motion: reduce", "forced-colors: active",
    "overflow-x: hidden", ":focus-visible", "[aria-pressed=\"true\"]",
  ]) assert.equal(css.includes(expected), true, expected);
  assert.match(css, /@media\s*\([^)]*max-width:\s*390px/);
  assert.match(css, /@media\s*\([^)]*max-width:\s*844px/);
  assert.doesNotMatch(css, /url\s*\(/i);
});

test("phase privacy, local-only boundaries, and attribution are statically enforceable", () => {
  const html = source("index.html");
  const app = source("app.js");
  const readme = source("README.md");
  const combined = `${html}\n${app}`;

  for (const forbidden of [
    /\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /EventSource/,
    /localStorage|sessionStorage|indexedDB/, /serviceWorker/,
    /getUserMedia|MediaRecorder|AudioContext/, /navigator\.share|clipboard/,
    /new\s+Image\b|createElement\(["']img["']\)/,
  ]) assert.doesNotMatch(combined, forbidden);

  assert.match(app, /view\.phase\s*===\s*["']act-result["']/);
  assert.match(app, /view\.phase\s*===\s*["']complete["']/);
  assert.match(app, /replaceChildren|remove\(\)/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  for (const expected of [
    "5688164b1904c0cc129b832c91160704b96b3cf3", "AGPL",
    "b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d", "MIT",
    "1d90a20c62433ba68dff78466e06ee372a5a5232", "Mathew Groves", "Chad Engler",
    "0ad5a71bcdff3d756dc5b07f93765aaeb4152538", "Apache-2.0",
    "未复制", "不是运行依赖",
  ]) assert.equal(readme.includes(expected), true, expected);
});
