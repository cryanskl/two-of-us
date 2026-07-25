"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const PRODUCTION_FILES = Object.freeze([
  "config.js",
  "logic.js",
  "fixtures.js"
]);

function readProduction(file) {
  return readFileSync(join(__dirname, file), "utf8");
}

function assertAbsent(source, patterns, file) {
  for (const [label, pattern] of patterns) {
    assert.doesNotMatch(source, pattern, `${file} must not use ${label}`);
  }
}

test("production core has zero DOM, clock, random, network and storage APIs", () => {
  const forbidden = [
    ["DOM globals", /\b(?:document|HTMLElement|NodeList|MutationObserver)\b/u],
    ["DOM queries", /\.(?:querySelector|getElementById|createElement)\s*\(/u],
    ["animation frames", /\b(?:requestAnimationFrame|cancelAnimationFrame)\s*\(/u],
    ["clocks", /\b(?:Date|performance)\b|set(?:Timeout|Interval)\s*\(/u],
    ["randomness", /\bMath\.random\s*\(|\bcrypto\.getRandomValues\s*\(/u],
    [
      "network transports",
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u
    ],
    [
      "persistent storage",
      /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker|CacheStorage)\b/u
    ],
    ["cookies", /\bdocument\.cookie\b/u],
    ["code generation", /\b(?:eval|Function)\s*\(/u],
    ["embedded browsing", /\b(?:iframe|postMessage|BroadcastChannel)\b/u]
  ];

  for (const file of PRODUCTION_FILES) {
    assertAbsent(readProduction(file), forbidden, file);
  }
});

test("production core remains classic-script and repository-independent", () => {
  const forbidden = [
    ["ES module imports", /(?:^|\n)\s*import(?:\s|\()/u],
    ["ES module exports", /(?:^|\n)\s*export\s/u],
    ["dynamic require", /\brequire\s*\(/u],
    ["filesystem APIs", /\b(?:readFile|writeFile|__dirname|process\.cwd)\b/u],
    ["absolute local paths", /\/Users\/|[A-Za-z]:\\/u],
    ["remote resource literals", /["']https?:\/\//iu]
  ];

  for (const file of PRODUCTION_FILES) {
    assertAbsent(readProduction(file), forbidden, file);
  }
});

test("classic scripts initialize without browser services or timers", () => {
  const sandbox = { window: {} };
  for (const file of PRODUCTION_FILES) {
    vm.runInNewContext(readProduction(file), sandbox, { filename: file });
  }
  assert.ok(sandbox.window.TWIN_ORBIT_CONFIG);
  assert.ok(sandbox.window.TwinOrbitLogic);
  assert.ok(sandbox.window.TwinOrbitFixtures);
  assert.equal(Object.isFrozen(sandbox.window.TwinOrbitLogic), true);
  assert.equal(Object.isFrozen(sandbox.window.TwinOrbitFixtures), true);
});
