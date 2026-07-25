"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const config = require("./config.js");
const logic = require("./logic.js");

function read(file) {
  return fs.readFileSync(path.join(__dirname, file), "utf8");
}

test("index is a self-contained classic-script file entry with a safe no-script baseline", () => {
  const html = read("index.html");
  const scriptSources = [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/gu)]
    .map((match) => match[1]);

  assert.deepEqual(scriptSources, ["config.js", "logic.js", "app.js"]);
  assert.match(html, /<html\s+lang="zh-CN">/u);
  assert.match(html, /name="viewport"/u);
  assert.match(
    html,
    /<link\s+rel="icon"\s+href="favicon\.svg"\s+type="image\/svg\+xml">/u,
  );
  assert.match(html, new RegExp(logic.PUBLIC_TITLE, "u"));
  assert.match(html, new RegExp(logic.INSTRUCTIONS, "u"));
  assert.match(html, new RegExp(logic.PRIVACY_TEXT, "u"));
  assert.match(html, /请开启 JavaScript 后再点亮这五支蜡烛。/u);
  assert.match(html, /role="status"/u);
  assert.match(html, /aria-live="polite"/u);

  for (const privateText of [
    config.finalTitle,
    config.finalMessage,
    config.signature,
    ...config.candles.flatMap((candle) => [
      candle.id,
      candle.label,
      candle.cue,
      candle.wish,
    ]),
  ]) {
    assert.equal(html.includes(privateText), false, privateText);
  }

  for (const pattern of [
    /<script[^>]+\btype=["']module["']/iu,
    /(?:src|href)=["'](?:https?:)?\/\//iu,
    /<(?:base|iframe|frame|embed|object|img|audio|video)\b/iu,
    /\b(?:integrity|crossorigin)\s*=/iu,
  ]) {
    assert.doesNotMatch(html, pattern);
  }

  const faviconPath = path.join(__dirname, "favicon.svg");
  assert.equal(fs.statSync(faviconPath).isFile(), true);
  const favicon = fs.readFileSync(faviconPath, "utf8");
  assert.match(favicon, /^<svg\s/u);
  for (const pattern of [
    /<(?:script|foreignObject|iframe|image|use|style)\b/iu,
    /\b(?:href|src)=/iu,
    /url\s*\(/iu,
  ]) {
    assert.doesNotMatch(favicon, pattern);
  }
});

test("application renders only public views and preserves the phase focus contract", () => {
  const source = read("app.js");

  for (const required of [
    "createInitialState",
    "getPublicView",
    "TRY_CANDLE",
    "START",
    "REVEAL",
    "RESTART",
    "#current-cue",
    "#final-title",
    "这一盏还没轮到。再看看眼前的线索。",
    "五盏都点亮了。愿望已经准备好。",
    "五个愿望已经收下。最后的话已展开。",
    "暂时没准备好，请重新准备。",
  ]) {
    assert.equal(source.includes(required), true, required);
  }

  for (const pattern of [
    /\bstate\.content\b/u,
    /\bstate\.(?:cursor|litIds|revision)\b/u,
    /CANDLE_WISHES_CONFIG\s*\.\s*candles/u,
    /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/u,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u,
    /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|caches)\b/u,
    /\b(?:getUserMedia|Audio|AudioContext|webkitAudioContext)\b/u,
    /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/u,
    /\b(?:CanvasRenderingContext2D|WebGLRenderingContext|Worker)\b/u,
    /\b(?:console|history)\s*\./u,
    /["']https?:\/\//iu,
  ]) {
    assert.doesNotMatch(source, pattern);
  }

  for (const privateText of [
    config.recipient,
    config.finalTitle,
    config.finalMessage,
    config.signature,
    ...config.candles.flatMap((candle) => [candle.cue, candle.wish]),
  ]) {
    assert.equal(source.includes(privateText), false, privateText);
  }
});

test("styles encode the approved paper-cake system and accessibility fallbacks", () => {
  const css = read("styles.css");

  for (const token of [
    "#f3ecdf",
    "#e8dcc9",
    "#2d241f",
    "#776a61",
    "#782536",
    "#561923",
    "#f4ead8",
    "#ba8434",
    "#245f72",
  ]) {
    assert.equal(css.toLowerCase().includes(token), true, token);
  }

  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/u);
  assert.match(css, /min-height:\s*48px/u);
  assert.match(css, /min-width:\s*48px/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /\.flame/u);
  assert.match(css, /\.candle-list/u);
  assert.match(css, /\.cake/u);

  for (const pattern of [
    /url\s*\(/iu,
    /@import\b/iu,
    /^\s*behavior\s*:/imu,
  ]) {
    assert.doesNotMatch(css, pattern);
  }
});
