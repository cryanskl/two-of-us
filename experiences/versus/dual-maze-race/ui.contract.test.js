"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const projectRoot = __dirname;

function readProjectFile(name) {
  return readFileSync(join(projectRoot, name), "utf8");
}

test("production entry uses semantic A-level classic scripts and eight native controls", () => {
  const html = readProjectFile("index.html");

  assert.match(html, /<html\b[^>]*lang="zh-CN"/u);
  assert.match(html, /<meta\b[^>]*name="viewport"/u);
  assert.match(html, /<h1\b[^>]*>同路，谁先到<\/h1>/u);
  assert.match(html, /<noscript\b/u);
  assert.match(html, /<div\b[^>]*id="app-status"[^>]*role="status"[^>]*aria-live="polite"/u);
  assert.match(html, /<section\b[^>]*id="left-board"[^>]*aria-label=/u);
  assert.match(html, /<section\b[^>]*id="right-board"[^>]*aria-label=/u);

  const directionButtons = html.match(
    /<button\b[^>]*data-seat="(?:left|right)"[^>]*data-direction="(?:up|right|down|left)"[^>]*>/gu
  ) || [];
  assert.equal(directionButtons.length, 8);
  assert.equal(directionButtons.every((button) => /type="button"/u.test(button)), true);

  const configIndex = html.indexOf('src="config.js"');
  const logicIndex = html.indexOf('src="logic.js"');
  const appIndex = html.indexOf('src="app.js"');
  assert.ok(configIndex > -1 && logicIndex > configIndex && appIndex > logicIndex);
  assert.doesNotMatch(html, /type=["']module["']/u);
  assert.doesNotMatch(html, /https?:\/\//u);
});

test("app delegates authority to the deterministic core and owns only browser adaptation", () => {
  const source = readProjectFile("app.js");

  for (const required of [
    /window\.DualMazeRaceLogic/u,
    /\.createInitialState\(/u,
    /\.getPublicView\(/u,
    /\.recordDirectionCheck\(/u,
    /\.recordJointCheck\(/u,
    /\.queueMove\(/u,
    /\.pauseMatch\(/u,
    /\.resumeMatch\(/u,
    /\.advanceHeat\(/u,
    /\.restartMatch\(/u,
    /requestAnimationFrame/u,
    /performance\.now/u,
    /visibilitychange/u,
    /pagehide/u,
    /pointercancel/u,
    /KeyW/u,
    /KeyA/u,
    /KeyS/u,
    /KeyD/u,
    /ArrowUp/u,
    /ArrowLeft/u,
    /ArrowDown/u,
    /ArrowRight/u
  ]) {
    assert.match(source, required);
  }

  assert.doesNotMatch(source, /\.findShortestPath\(/u);
  assert.doesNotMatch(source, /\bMath\.random\b/u);
  assert.doesNotMatch(source, /\bDate\.now\b/u);
  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB)\b/u);
  assert.doesNotMatch(source, /https?:\/\//u);
});

test("styles freeze the approved shared-map-table system and accessible variants", () => {
  const css = readProjectFile("styles.css");

  for (const required of [
    /--color-page:\s*#f6f1e7/u,
    /--color-ink:\s*#102c56/u,
    /--color-player-one:\s*#1266e8/u,
    /--color-player-two:\s*#e63d2f/u,
    /--color-goal:\s*#13845d/u,
    /\.maze-board/u,
    /\.player-marker--one/u,
    /\.player-marker--two/u,
    /min-width:\s*52px/u,
    /min-height:\s*52px/u,
    /@media\s*\(max-width:\s*390px\)/u,
    /@media\s*\(max-width:\s*320px\)/u,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/u,
    /@media\s*\(forced-colors:\s*active\)/u,
    /:focus-visible/u
  ]) {
    assert.match(css, required);
  }
});

test("production runtime remains local-only and does not load concept images", () => {
  const source = [
    readProjectFile("index.html"),
    readProjectFile("styles.css"),
    readProjectFile("app.js"),
    readProjectFile("config.js"),
    readProjectFile("logic.js")
  ].join("\n");

  assert.doesNotMatch(source, /docs\/assets|active-race-concept\.png/u);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|WebRTC)\b/u);
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b/u);
  assert.doesNotMatch(source, /https?:\/\//u);
});
