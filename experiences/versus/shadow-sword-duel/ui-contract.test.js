"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const baseUrl = new URL("./", import.meta.url);

function read(relativePath) {
  return readFileSync(new URL(relativePath, baseUrl), "utf8");
}

test("生产包完整且保持 A 级经典脚本闭包", () => {
  for (const relativePath of [
    "index.html",
    "styles.css",
    "config.js",
    "logic.js",
    "app.js",
    "README.md",
    "ATTRIBUTION.md",
  ]) {
    assert.equal(existsSync(new URL(relativePath, baseUrl)), true, relativePath);
  }

  const html = read("index.html");
  const configIndex = html.indexOf('src="./config.js"');
  const logicIndex = html.indexOf('src="./logic.js"');
  const appIndex = html.indexOf('src="./app.js"');
  assert.equal(configIndex >= 0, true);
  assert.equal(configIndex < logicIndex && logicIndex < appIndex, true);
  assert.doesNotMatch(html, /type\s*=\s*["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)\s*=\s*["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /<(?:base|iframe|form)\b/i);
  assert.match(html, /<noscript\b[^>]*>[\s\S]*此体验需要浏览器启用 JavaScript/);

  const localReferences = [...html.matchAll(
    /(?:src|href)\s*=\s*["'](\.\/[^"'?#]+)["']/g,
  )].map((match) => match[1]);
  for (const reference of localReferences) {
    assert.equal(existsSync(new URL(reference, baseUrl)), true, reference);
  }
});

test("HTML 冻结单一标题、公开资源 rail、动态舞台与单一状态播报", () => {
  const html = read("index.html");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1\b[^>]*>\s*影子剑术\s*<\/h1>/);
  assert.match(html, /先藏好这一招，再看看你有没有读懂我。/);
  assert.match(html, /id="left-rail"/);
  assert.match(html, /id="right-rail"/);
  assert.match(html, /id="stage"/);
  assert.match(html, /id="round-marker"/);
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  assert.match(html, /id="live-status"[^>]*role="status"/);
  assert.doesNotMatch(html, /sealedActions|draftAction|data-move|aria-pressed/);
});

test("controller 只把公开 view 交给 renderer，并以替换节点守住阶段隐私", () => {
  const source = read("app.js");
  assert.match(source, /ShadowSwordLogic/);
  assert.match(source, /\.createInitialState\(/);
  assert.match(source, /\.getScreenView\(/);
  assert.match(source, /\.reduce\(/);
  assert.doesNotMatch(source, /\bstate\.[A-Za-z_$]/);
  assert.doesNotMatch(source, /sealedActions/);
  assert.match(source, /\.replaceChildren\(/);
  assert.match(source, /\.textContent\s*=/);
  assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|eval\s*\(/);

  for (const actionType of [
    "START",
    "CHOOSE",
    "CONFIRM",
    "COVER",
    "RESUME",
    "TAKE_OVER",
    "REVEAL",
    "NEXT_ROUND",
    "RESTART",
  ]) {
    assert.match(source, new RegExp(`type:\\s*"${actionType}"`));
  }
});

test("输入与生命周期统一走 click/reducer，重复输入和失焦不会偷推进", () => {
  const source = read("app.js");
  assert.match(source, /addEventListener\("click"/);
  assert.match(source, /addEventListener\("keydown"/);
  assert.match(source, /event\.repeat/);
  assert.match(source, /event\.detail/);
  assert.match(source, /event\.timeStamp/);
  assert.doesNotMatch(source, /addEventListener\("pointer(?:down|up)"/);
  for (const eventName of ["visibilitychange", "pagehide", "blur", "focus"]) {
    assert.match(source, new RegExp(`addEventListener\\("${eventName}"`));
  }
  assert.match(source, /document\.visibilityState\s*===\s*"hidden"/);
  assert.match(source, /document\.hasFocus\(\)/);
  assert.doesNotMatch(
    source,
    /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.(?:clipboard|mediaDevices|geolocation)/,
  );
});

test("六阶段语义、四动作顺序、结果因果与焦点合同写入生产控制器", () => {
  const source = read("app.js");
  for (const renderer of [
    "renderIntro",
    "renderChoosing",
    "renderCovered",
    "renderHandoff",
    "renderReady",
    "renderResult",
  ]) {
    assert.match(source, new RegExp(`function ${renderer}\\(`));
  }
  assert.match(source, /\["attack", "guard", "dodge", "charge"\]/);
  for (const copy of [
    "花 1 点气；普通攻会被防住，先机攻可以破防。",
    "挡住普通攻并取得先机；空防没有收益。",
    "避开本回合任意攻击。",
    "本回合没受伤就回复 1 点气，最多 2 点。",
    "已选，尚未封招",
    "封好这一招",
    "两位都已封招",
    "一起揭晓",
    "再来一场",
  ]) {
    assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /tabIndex\s*=\s*-1/);
  assert.match(source, /\.focus\(/);
  assert.match(source, /latestRound\.effect/);
  assert.match(source, /matchResult\.reason/);
});

test("样式落实纸影视觉、触控尺寸、窄屏、reduced-motion 与 forced-colors", () => {
  const css = read("styles.css");
  for (const token of [
    "--night: #0c1725",
    "--night-raised: #142233",
    "--night-line: #304154",
    "--ivory: #ead8b8",
    "--ivory-muted: #a99d88",
    "--left: #cf5847",
    "--right: #78c3c8",
    "--focus: #9bd5ff",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /min-height:\s*(?:4[4-9]|[5-9]\d)px/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:\s*3px\s+solid\s+var\(--focus\)/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /url\s*\(/);
});

test("README 与 ATTRIBUTION 独立闭合固定许可载体、哈希和零复制边界", () => {
  const readme = read("README.md");
  const attribution = read("ATTRIBUTION.md");
  assert.match(readme, /^## 借鉴与来源声明$/m);

  for (const source of [
    "OpenSpiel",
    "boardgame.io",
    "PrinceJS",
    "W3C WCAG 2.2",
  ]) {
    assert.match(readme, new RegExp(source.replace(".", "\\.")));
    assert.match(attribution, new RegExp(source.replace(".", "\\.")));
  }

  for (const fixedLicenseUrl of [
    "https://github.com/google-deepmind/open_spiel/blob/112b77704631fc2ce7ad8e4581f6ca09798ce15a/LICENSE",
    "https://github.com/boardgameio/boardgame.io/blob/65ca73beb62ef2afd980bb9f569b10dabfc60075/LICENSE",
    "https://github.com/oklemenz/PrinceJS/blob/ea1a97a763ac78fee5b35129e2841ef31531328e/LICENSE",
    "https://www.w3.org/copyright/document-license-2023/",
  ]) {
    assert.match(readme, new RegExp(fixedLicenseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(attribution, new RegExp(
      fixedLicenseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ));
  }

  for (const document of [readme, attribution]) {
    assert.match(document, /SHA-256/);
    assert.match(document, /Copyright/);
    assert.match(document, /零第三方代码复制/);
    assert.match(document, /零第三方资产复制/);
    assert.match(document, /Prince of Persia/);
  }
});
