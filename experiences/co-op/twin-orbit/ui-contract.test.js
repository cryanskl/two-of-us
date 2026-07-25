"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = __dirname;
const PUBLIC_TITLE = "这一圈，和你同时到";
const PRODUCTION_FILES = Object.freeze([
  "index.html",
  "styles.css",
  "config.js",
  "logic.js",
  "fixtures.js",
  "app.js",
  "favicon.svg",
  "README.md",
  "ATTRIBUTION.md"
]);

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function assertInOrder(source, fragments) {
  let cursor = -1;
  for (const fragment of fragments) {
    const index = source.indexOf(fragment, cursor + 1);
    assert.notEqual(index, -1, `missing ordered fragment: ${fragment}`);
    assert.ok(index > cursor, `out-of-order fragment: ${fragment}`);
    cursor = index;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

test("A 级生产包完整，并按冻结顺序加载四个经典相对脚本", () => {
  for (const relativePath of PRODUCTION_FILES) {
    assert.equal(
      existsSync(join(ROOT, relativePath)),
      true,
      `missing production file: ${relativePath}`
    );
  }

  const html = read("index.html");
  assertInOrder(html, [
    '<link rel="stylesheet" href="./styles.css">',
    '<script src="./config.js"></script>',
    '<script src="./logic.js"></script>',
    '<script src="./fixtures.js"></script>',
    '<script src="./app.js"></script>'
  ]);
  assert.match(
    html,
    /<link\s+rel=["']icon["']\s+href=["']\.\/favicon\.svg["']/u
  );
  assert.doesNotMatch(html, /<script[^>]*\btype=["']module["']/iu);
  assert.doesNotMatch(html, /<(?:base|iframe|frame|embed|object)\b/iu);
  assert.doesNotMatch(
    html,
    /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//iu
  );
});

test("静态入口只公开中文标题，并提供真实语义与 no-JS 说明", () => {
  const html = read("index.html");
  const escapedTitle = escapeRegExp(PUBLIC_TITLE);

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<html\s+lang=["']zh-CN["']/u);
  assert.match(
    html,
    /<meta\s+name=["']viewport["']\s+content=["']width=device-width,\s*initial-scale=1["']/u
  );
  assert.match(
    html,
    new RegExp(`<title>\\s*${escapedTitle}\\s*</title>`, "u")
  );
  assert.equal((html.match(/<h1\b/giu) || []).length, 1);
  assert.match(
    html,
    new RegExp(`<h1\\b[^>]*>\\s*${escapedTitle}\\s*</h1>`, "u")
  );
  assert.doesNotMatch(html, />[^<]*\bTwin\s+Orbit\b[^<]*</iu);

  for (const semanticElement of [
    /<main\b/iu,
    /<nav\b[^>]*aria-label=/iu,
    /<header\b/iu,
    /<section\b[^>]*(?:role=["']status["']|aria-live=["']polite["'])/iu,
    /<section\b[^>]*aria-label=["'][^"']*(?:双环|双星|轨道)[^"']*["']/iu,
    /<fieldset\b/iu,
    /<legend\b/iu
  ]) {
    assert.match(html, semanticElement);
  }

  const noScript = html.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/iu)?.[1] ?? "";
  assert.equal(noScript.includes(PUBLIC_TITLE), true);
  assert.match(noScript, /请启用 JavaScript/u);
  assert.match(noScript, /按住[^。]*内轨[^。]*松开[^。]*外轨/u);
  assert.doesNotMatch(
    noScript,
    /<(?:button|canvas|svg|form|input|select|progress)\b/iu
  );
  assert.match(
    html,
    /<button\b(?=[^>]*\bid=["']phase-action["'])(?=[^>]*\bdisabled\b)[^>]*>/iu,
    "the static primary action must stay inert until JavaScript initializes"
  );
  assert.match(
    read("app.js"),
    /phaseAction\.disabled\s*=\s*phaseAction\s*===\s*null/u,
    "the renderer must enable only actions that exist in the public phase"
  );
});

test("左右席是等权原生按住按钮，并明确给出 F/J 键盘等价", () => {
  const html = read("index.html");
  const holdButtons = [
    ...html.matchAll(
      /<button\b(?=[^>]*\btype=["']button["'])(?=[^>]*\bdata-hold-control\b)(?=[^>]*\bdata-player=["'](left|right)["'])(?=[^>]*\baria-pressed=["']false["'])[^>]*>/giu
    )
  ];

  assert.deepEqual(
    holdButtons.map((match) => match[1]).sort(),
    ["left", "right"]
  );
  assert.match(html, /左边[\s\S]{0,120}(?:KeyF|>\s*F\s*<)/u);
  assert.match(html, /右边[\s\S]{0,120}(?:KeyJ|>\s*J\s*<)/u);
  assert.match(html, /按住走内轨更快/u);
  assert.match(html, /松开走外轨更慢/u);
});

test("控制器只从 public view 渲染，并覆盖六阶段的唯一合法操作", () => {
  const source = read("app.js");

  for (const required of [
    "TwinOrbitLogic",
    "createInitialState",
    "getPublicView",
    "reduce",
    "view.phase",
    "view.players",
    "textContent",
    "intro",
    "gate-intro",
    "playing",
    "gate-success",
    "gate-retry",
    "complete"
  ]) {
    assert.equal(source.includes(required), true, required);
  }

  for (const actionType of [
    "START",
    "BEGIN_GATE",
    "SET_HELD",
    "TICK",
    "RETRY_GATE",
    "NEXT_GATE",
    "RESTART",
    "SUSPEND"
  ]) {
    assert.match(
      source,
      new RegExp(`type\\s*:\\s*(?:ACTIONS\\.)?["']?${actionType}["']?`, "u"),
      actionType
    );
  }

  assert.doesNotMatch(source, /\bTwinOrbitFixtures\b/u);
  assert.doesNotMatch(source, /\bTwinOrbitLogic\.GATES\b/u);
  assert.doesNotMatch(
    source,
    /\bstate\.(?:phase|content|gateIndex|tick|openWindow|players|retryReason|completedGateIds)\b/u
  );
  assert.doesNotMatch(
    source,
    /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/u
  );
  assert.doesNotMatch(
    source,
    /\b(?:getBoundingClientRect|getComputedStyle|animationend|transitionend)\b/u
  );
  assert.match(
    source,
    /setAttribute\(\s*["']hidden["']/u,
    "SVG target gates must set the actual hidden attribute outside gate phases"
  );
  assert.match(
    source,
    /removeAttribute\(\s*["']hidden["']/u,
    "SVG target gates must remove the actual hidden attribute in gate phases"
  );
});

test("30Hz 固定步、长帧保护与 SUSPEND 生命周期由核心常量驱动", () => {
  const source = read("app.js");

  for (const required of [
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "lastTimestamp",
    "accumulatorMs",
    "rafGeneration",
    "CONSTANTS.TICK_RATE",
    "CONSTANTS.MAX_TICK_BATCH",
    "CONSTANTS.MAX_FRAME_DELTA_MS",
    "visibilitychange",
    "visibilityState",
    "pagehide",
    "blur",
    "Escape",
    "long-frame"
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  assert.match(source, /type\s*:\s*(?:ACTIONS\.)?["']?TICK["']?/u);
  assert.match(source, /count\s*:\s*1\b/u);
  assert.match(source, /visibilityState\s*===\s*["']hidden["']/u);
  assert.doesNotMatch(
    source,
    /\b(?:setTimeout|setInterval|Date\.now|Math\.random)\b/u
  );
});

test("F/J 与双 Pointer 精确占席、capture、取消和迟到释放清理", () => {
  const source = read("app.js");

  for (const required of [
    "KeyF",
    "KeyJ",
    "event.repeat",
    "pressedKeys",
    "pointerdown",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "pointerId",
    "pointerType",
    "setPointerCapture",
    "releasePointerCapture",
    "activePointers",
    "inputEpoch"
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  assert.match(source, /addEventListener\(\s*["']keydown["']/u);
  assert.match(source, /addEventListener\(\s*["']keyup["']/u);
  assert.match(source, /addEventListener\(\s*["']pointerdown["']/u);
  assert.match(source, /addEventListener\(\s*["']pointercancel["']/u);
  assert.match(source, /addEventListener\(\s*["']lostpointercapture["']/u);
  assert.match(source, /(?:clear|reset)[A-Za-z]*(?:Input|Pointer|Pressed)/u);
});

test("视觉降级保留焦点、目标尺寸和双形状；touch-action 只锁实时控制", () => {
  const css = read("styles.css");
  const html = read("index.html");

  assert.match(css, /:focus-visible/u);
  assert.match(css, /min-height\s*:\s*(?:4[8-9]|[5-9]\d|\d{3,})px/u);
  assert.match(css, /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)/u);
  assert.match(css, /@media\s*\(forced-colors\s*:\s*active\)/u);
  assert.match(css, /@media\s*\(max-width\s*:\s*(?:390|3[0-8]\d|320)px\)/u);
  assert.doesNotMatch(css, /url\s*\(|@import\b|outline\s*:\s*none/iu);

  const touchActionRules = [
    ...css.matchAll(/([^{}]+)\{([^{}]*touch-action\s*:\s*none[^{}]*)\}/giu)
  ];
  assert.ok(touchActionRules.length > 0, "missing touch-action:none");
  for (const rule of touchActionRules) {
    assert.match(rule[1], /(?:\[data-hold-control\]|\.hold-control)/u);
  }

  assert.match(html, /data-player-shape=["']rosette["']/u);
  assert.match(html, /data-player-shape=["']kite["']/u);
  assert.match(html, /(?:点纹|dot)/iu);
  assert.match(html, /(?:横纹|stripe)/iu);
});

test("生产 UI 零网络、零存储、零权限且不依赖概念图或外部资产", () => {
  const runtimeFiles = [
    "index.html",
    "styles.css",
    "config.js",
    "logic.js",
    "fixtures.js",
    "app.js"
  ];
  const combined = runtimeFiles.map(read).join("\n");

  assert.doesNotMatch(combined, /docs\/assets|twin-orbit-(?:desktop|mobile)-playing-concept/iu);
  assert.doesNotMatch(combined, /["']https?:\/\//iu);
  assert.doesNotMatch(
    combined,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|BroadcastChannel)\b/u
  );
  assert.doesNotMatch(
    combined,
    /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|CacheStorage|caches)\b/u
  );
  assert.doesNotMatch(
    combined,
    /\bnavigator\.(?:clipboard|mediaDevices|geolocation|permissions)\b/u
  );
  assert.doesNotMatch(
    combined,
    /\b(?:eval|Function)\s*\(|\bBlob\b|URL\.createObjectURL|data:/u
  );
  assert.doesNotMatch(
    read("index.html"),
    /<(?:img|picture|audio|video|canvas)\b/iu
  );
});
