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

test("production bundle is a build-free local static closure", () => {
  for (const relativePath of [
    "index.html",
    "styles.css",
    "app.js",
    "README.md",
    "ATTRIBUTION.md",
    "config.js",
    "logic.js",
  ]) {
    assert.equal(
      fs.statSync(path.join(ROOT, relativePath)).isFile(),
      true,
      relativePath,
    );
  }
});

test("static HTML is public-only and loads classic local scripts in order", () => {
  const html = read("index.html");

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<html lang="zh-CN">/u);
  assert.match(
    html,
    /<meta name="viewport" content="width=device-width, initial-scale=1">/u,
  );
  assert.match(html, /<a class="skip-link" href="#app">/u);
  assert.match(html, /<main id="app"/u);
  assert.match(html, /<noscript>/u);
  assertInOrder(html, [
    '<script src="./config.js"></script>',
    '<script src="./logic.js"></script>',
    '<script src="./app.js"></script>',
  ]);

  for (const publicCopy of [
    "把名字折成同一束光",
    "读两条线索，选折面、转相位，让两项都对齐。",
    "需要启用 JavaScript",
  ]) {
    assert.ok(html.includes(publicCopy), publicCopy);
  }

  for (const privateOrFutureCopy of [
    "示例线索：把折面调到一周里周末之前的那一天数。",
    "示例线索：让刻度停在钟面十一点的位置。",
    "原来我们一直在同一束光里",
    "角度不同，折回来时，还是在这里遇见。",
    "来自准备这枚小镜子的人",
    "左边的光",
    "右边的光",
    "照见我们",
    "再折一次",
  ]) {
    assert.equal(html.includes(privateOrFutureCopy), false, privateOrFutureCopy);
  }

  assert.equal(/<template\b/iu.test(html), false);
  assert.equal(/<button\b/iu.test(html), false);
  assert.equal(/type=["']module["']/iu.test(html), false);
  assert.equal(/on(?:click|input|change|keydown)=/iu.test(html), false);
  assert.equal(/https?:\/\//iu.test(html), false);
});

test("controller projects only the core public view into phase-owned DOM", () => {
  const app = read("app.js");

  for (const required of [
    "logic.createInitialState(rawConfig)",
    "logic.getPublicView(state)",
    "logic.reduce(state,",
    "view.revision",
    "app.replaceChildren(",
    'view.phase === "intro"',
    'view.phase === "tuning"',
    'view.phase === "aligned"',
    'view.phase === "complete"',
    "document.createElement",
    ".textContent =",
  ]) {
    assert.ok(app.includes(required), required);
  }

  for (const forbidden of [
    ".content",
    "targetFolds",
    "targetPhase",
    "NEAR_FOLD_DISTANCE",
    "NEAR_PHASE_DISTANCE",
    "innerHTML",
    "outerHTML",
    "insertAdjacentHTML",
    "document.write",
    "console.",
  ]) {
    assert.equal(app.includes(forbidden), false, forbidden);
  }
});

test("tuning uses six native buttons and one native discrete range", () => {
  const app = read("app.js");

  for (const required of [
    "view.foldControl.values.forEach",
    'document.createElement("button")',
    'button.type = "button"',
    'button.setAttribute("aria-pressed"',
    "view.foldControl.selected",
    'document.createElement("input")',
    'range.type = "range"',
    "range.min = String(view.phaseControl.min)",
    "range.max = String(view.phaseControl.max)",
    "range.step = String(view.phaseControl.step)",
    "range.value = String(view.phaseControl.selected)",
    'range.addEventListener("input"',
    'range.addEventListener("change"',
    "view.phaseControl.displayText",
  ]) {
    assert.ok(app.includes(required), required);
  }

  for (const forbidden of [
    'addEventListener("wheel"',
    'addEventListener("pointermove"',
    'addEventListener("touchmove"',
    "setPointerCapture",
    "DeviceMotionEvent",
    "DeviceOrientationEvent",
  ]) {
    assert.equal(app.includes(forbidden), false, forbidden);
  }
});

test("private reveal nodes are created only by the complete renderer", () => {
  const app = read("app.js");
  const completeStart = app.indexOf("function createCompletePhase");
  const completeEnd = app.indexOf("\n  function ", completeStart + 1);

  assert.ok(completeStart >= 0);
  assert.ok(completeEnd > completeStart);

  const beforeComplete = app.slice(0, completeStart);
  const completeRenderer = app.slice(completeStart, completeEnd);

  for (const privateField of [
    "view.finalTitle",
    "view.marks",
    "view.finalMessage",
    "view.signature",
  ]) {
    assert.equal(beforeComplete.includes(privateField), false, privateField);
    assert.equal(completeRenderer.includes(privateField), true, privateField);
  }

  assert.ok(completeRenderer.includes('document.createElement("h1")'));
  assert.ok(completeRenderer.includes('document.createElement("dl")'));
  assert.ok(completeRenderer.includes("view.marks.forEach"));
});

test("canvas is a cancellable public-pattern projection with a CSS fallback", () => {
  const app = read("app.js");

  for (const required of [
    "view.pattern",
    'canvas.setAttribute("aria-hidden", "true")',
    'canvas.getContext("2d")',
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "renderGeneration",
    "globalThis.devicePixelRatio",
    'addEventListener("resize"',
    'addEventListener("visibilitychange"',
    'addEventListener("pagehide"',
    'addEventListener("pageshow"',
    "prefers-reduced-motion: reduce",
    "rotationUnits / model.turnUnits * Math.PI * 2",
  ]) {
    assert.ok(app.includes(required), required);
  }

  for (const forbidden of [
    "getImageData",
    "measureText",
    "drawImage",
    "new Image",
    "ImageData",
    "requestAnimationFrame(loop",
    "setInterval",
  ]) {
    assert.equal(app.includes(forbidden), false, forbidden);
  }
});

test("focus and live status follow phase transitions without hidden future nodes", () => {
  const app = read("app.js");

  for (const required of [
    'setAttribute("role", "status")',
    'setAttribute("aria-live", "polite")',
    'setAttribute("aria-atomic", "true")',
    'heading.tabIndex = -1',
    "heading.focus({ preventScroll: true })",
    "actionButton.focus({ preventScroll: true })",
    "lastAnnouncedSummary",
    "document.hidden",
    "document.hasFocus()",
  ]) {
    assert.ok(app.includes(required), required);
  }
});

test("styles lock the approved optical bench and accessibility fallbacks", () => {
  const css = read("styles.css");

  for (const required of [
    "--ink-950: #171326",
    "--ink-900: #211a35",
    "--ink-800: #312846",
    "--paper-100: #f5f0e8",
    "--paper-300: #d8d0c7",
    "--line-muted: #756e86",
    "--teal-400: #53d6c5",
    "--coral-400: #ff7b72",
    "--amber-400: #f2c96d",
    "--lavender-400: #9b8cff",
    ":focus-visible",
    "min-height: 48px",
    "@media (max-width: 767px)",
    "@media (max-width: 359px)",
    "@media (orientation: landscape) and (max-height: 430px)",
    "@media (prefers-reduced-motion: reduce)",
    "@media (forced-colors: active)",
  ]) {
    assert.ok(css.includes(required), required);
  }

  assert.equal(/url\s*\(/iu.test(css), false);
  assert.equal(/\.png|concept/iu.test(css), false);
  assert.equal(/animation-iteration-count\s*:\s*infinite/iu.test(css), false);
});

test("README records direct-open, config privacy, input, fallback and source boundaries", () => {
  const readme = read("README.md");

  for (const required of [
    "file://",
    "config.js",
    "targetFolds",
    "targetPhase",
    "phaseStep",
    "1–2",
    "明文",
    "键盘",
    "触屏",
    "Canvas",
    "prefers-reduced-motion",
    "零网络",
    "零存储",
    "零权限",
    "## 借鉴与来源声明",
    "ATTRIBUTION.md",
    "独立设计",
    "未复制",
  ]) {
    assert.ok(readme.includes(required), required);
  }
});

test("production files contain no network, storage, permission or concept asset runtime", () => {
  const production = [
    read("index.html"),
    read("app.js"),
    read("styles.css"),
  ].join("\n");

  for (const forbidden of [
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "sendBeacon",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document.cookie",
    "serviceWorker",
    "new Worker",
    "mediaDevices",
    "geolocation",
    "Notification",
    "clipboard",
    "navigator.share",
    "kaleidoscope-names-desktop-tuning-concept.png",
    "kaleidoscope-names-mobile-complete-concept.png",
    "https://",
    "http://",
  ]) {
    assert.equal(production.includes(forbidden), false, forbidden);
  }
});
