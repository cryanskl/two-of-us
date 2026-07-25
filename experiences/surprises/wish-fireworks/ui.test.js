import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(name) {
  return fs.readFileSync(new URL(name, import.meta.url), "utf8");
}

test("A-level entry keeps the exact classic-script and no-JS contracts", () => {
  const html = read("./index.html");
  const configIndex = html.indexOf('<script src="./config.js"></script>');
  const logicIndex = html.indexOf('<script src="./logic.js"></script>');
  const appIndex = html.indexOf('<script src="./app.js"></script>');

  assert.ok(configIndex >= 0);
  assert.ok(configIndex < logicIndex);
  assert.ok(logicIndex < appIndex);
  assert.doesNotMatch(html, /type=["']module["']|https?:\/\/|<img\b|<audio\b|<video\b/i);
  assert.match(html, /<h1[^>]*>今晚，点三束光<\/h1>/);
  assert.match(
    html,
    /按住蓄光，松开就会发射；也可以选好高度后直接点燃。每一束都会成功。/,
  );
  assert.match(html, /请开启 JavaScript 后再点燃三束光/);
  assert.match(
    html,
    /内容写在本地文件里；页面不上传、不另存，愿望会在最后一束落定后出现。/,
  );
  assert.match(html, /<ol[^>]*id=["']revealed-glyphs["']/);
  assert.match(html, /<select[^>]*id=["']height-select["']/);
  assert.match(html, /<button[^>]*id=["']hold-launch["']/);
  assert.match(html, /<button[^>]*id=["']direct-launch["']/);
  assert.match(html, /<button[^>]*id=["']primary-action["']/);
});

test("browser adapter owns input cancellation, token completion, and private result rendering", () => {
  const app = read("./app.js");

  for (const marker of [
    "attemptStart",
    "suppressedMainPointerClicks",
    "reducedPointerCandidate",
    "pointercancel",
    "lostpointercapture",
    "visibilitychange",
    "pagehide",
    "pendingResultFocus",
    "queueMicrotask",
    "COMPLETE_BURST",
    "aria-disabled",
    "result-letter",
  ]) {
    assert.match(app, new RegExp(marker));
  }
  assert.doesNotMatch(
    app,
    /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|navigator\.permissions|serviceWorker)\b/,
  );
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|fillText\s*\(/);
});

test("styles implement the accepted responsive, reduced-motion, and forced-colors system", () => {
  const css = read("./styles.css");

  for (const marker of [
    "--night: #070c18",
    "--ivory: #f0d3a1",
    "--gold: #e4bc78",
    "--plum: #351424",
    "--paper: #e9d1a9",
    "@media (prefers-reduced-motion: reduce)",
    "@media (forced-colors: active)",
    "min-height: 56px",
    "touch-action: none",
    "grid-template-areas",
  ]) {
    assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(css, /animation-iteration-count:\s*infinite|animation-direction:\s*alternate/i);
});

test("project README documents direct launch, personalization, privacy, and fixed attribution", () => {
  const readme = read("./README.md");

  for (const marker of [
    "直接双击",
    "config.js",
    "点阵",
    "prefers-reduced-motion",
    "Canvas",
    "页面不上传、不另存",
    "8f01eeaef422c1f0880e94ce99040025a1b74d7e",
    "238e8273305bb2e3c76f9f0bb289fb127c3dff74",
    "9ee144a548aad85275318b30891c71dcf6e10f7b",
    "20eebad51dde793070c373d594099a7ed8d96e22",
    "07123b871c103268375880980fd715b2b26b2ff0",
    "明确未复制",
    "生成资产：无",
  ]) {
    assert.match(readme, new RegExp(marker));
  }
});
