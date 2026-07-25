"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const read = (name) => readFileSync(join(root, name), "utf8");

test("生产入口保持公开标题、960×600 舞台、六态壳与 no-JS 说明", () => {
  const html = read("index.html");
  assert.match(html, /<title>这一弹，拐弯见你<\/title>/);
  assert.match(html, /<h1[^>]*>这一弹，拐弯见你<\/h1>/);
  assert.match(html, /<canvas[^>]+width="960"[^>]+height="600"/);
  for (const phase of [
    "instructions", "countdown", "playing", "round-result", "paused", "match-result",
  ]) assert.match(html, new RegExp(`data-phase-panel="${phase}"`));
  assert.match(html, /<noscript>[^<]*JavaScript[^<]*<\/noscript>/);
});

test("入口只按经典相对路径加载本地样式与脚本，运行面无网络或存储", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /type=["']module["']/);
  const scripts = [...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)]
    .map((match) => match[1]);
  assert.deepEqual(scripts, [
    "config.js",
    "js/constants.js",
    "js/fixed.js",
    "js/geometry.js",
    "js/simulation.js",
    "js/input.js",
    "js/renderer.js",
    "js/accessibility.js",
    "js/app.js",
  ]);
  const production = [
    html,
    read("style.css"),
    read("js/input.js"),
    read("js/renderer.js"),
    read("js/accessibility.js"),
    read("js/app.js"),
  ].join("\n");
  for (const forbidden of [
    /https?:\/\//i,
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bnavigator\.serviceWorker\b/,
  ]) assert.doesNotMatch(production, forbidden);
});

test("左右两席各有五个文字控制，动作与键盘提示完整且等权", () => {
  const html = read("index.html");
  for (const seat of ["left", "right"]) {
    const controls = [...html.matchAll(
      new RegExp(`<button[^>]+data-seat="${seat}"[^>]+data-control="([^"]+)"[^>]*>([^<]+)<\\/button>`, "g"),
    )];
    assert.deepEqual(
      controls.map((match) => [match[1], match[2].trim()]),
      [
        ["forward", "前进"],
        ["reverse", "后退"],
        ["turn-left", "左转"],
        ["turn-right", "右转"],
        ["fire", "发射"],
      ],
    );
  }
  assert.match(html, /W · S · A · D · F/);
  assert.match(html, /↑ · ↓ · ← · → · Enter/);
});

test("输入层以来源集合统一键盘和 pointer，并对取消与页面生命周期清理", () => {
  const source = read("js/input.js");
  for (const token of [
    "Set", "pointerId", "setPointerCapture", "releasePointerCapture",
    "pointercancel", "lostpointercapture", "keydown", "keyup", "repeat",
    "blur", "visibilitychange", "pagehide", "clearAll", "consumeFrame",
  ]) assert.match(source, new RegExp(token));
  assert.match(source, /FIRE_EDGE/);
  assert.match(source, /activeElement/);
  assert.match(source, /event\.code === "Enter"[\s\S]*activeElement\.matches\("button"\)/);
  assert.doesNotMatch(source, /return activeElement\.matches\("button,/);
  assert.match(source, /Escape/);
  assert.match(source, /KeyP/);
});

test("应用层以 60Hz 累加器单步推进，并对长帧和积压公平暂停", () => {
  const source = read("js/app.js");
  for (const token of [
    "requestAnimationFrame", "cancelAnimationFrame", "MAX_FRAME_GAP_MS",
    "MAX_STEPS_PER_FRAME", "PAUSE", "RESUME", "START", "RESTART",
    "visibilityState", "pagehide", "blur",
  ]) assert.match(source, new RegExp(token));
  assert.match(source, /1000\s*\/\s*RULES\.TICK_HZ/);
  assert.match(source, /while\s*\([\s\S]*accumulatorMs[\s\S]*STEP_MS/);
  assert.match(source, /input\.clearAll\(\)/);
});

test("Canvas 渲染严格来自冻结常量与模拟 state，并保留阵营形状冗余", () => {
  const source = read("js/renderer.js");
  for (const token of [
    "WORLD_W", "WORLD_H", "WORLD_BOUNDS", "PLAYER_ZONES", "WALLS",
    "DIRECTION_VECTORS", "state.tanks", "state.bullets", "devicePixelRatio",
  ]) assert.match(source, new RegExp(token.replace(".", "\\.")));
  assert.match(source, /setLineDash/);
  assert.match(source, /arc\(/);
  assert.match(source, /fillText\(["']左["']/);
  assert.match(source, /fillText\(["']右["']/);
});

test("Canvas 外提供双方完整文本投影、低频状态与可聚焦规则/恢复/重开", () => {
  const html = read("index.html");
  const accessibility = read("js/accessibility.js");
  for (const id of [
    "left-score", "right-score", "remaining-time", "left-heading", "right-heading",
    "left-zone", "right-zone", "left-bullets", "right-bullets",
    "left-cooldown", "right-cooldown", "left-threat", "right-threat",
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /role="status"[^>]+aria-live="polite"/);
  assert.match(html, /<dialog[^>]+id="rules-dialog"/);
  assert.match(accessibility, /东南|西南|西北|东北/);
  assert.match(accessibility, /暂无来弹/);
  assert.match(accessibility, /近|中|远/);
  assert.match(accessibility, /focus\(\)/);
});

test("样式实现深靛棱镜双席、六档视口基础、44px 目标与无障碍媒体模式", () => {
  const css = read("style.css");
  for (const token of [
    "--duel-bg: #101426", "--duel-left: #ff765f", "--duel-right: #55c7e8",
    "min-width: 44px", "min-height: 44px", "@media (max-width: 1180px)",
    "@media (max-width: 900px)", "@media (max-width: 700px)",
    "@media (max-width: 480px)", "prefers-reduced-motion: reduce",
    "forced-colors: active", "touch-action: none", "focus-visible",
  ]) assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*10/);
  assert.match(css, /overflow-x:\s*hidden/);
});
