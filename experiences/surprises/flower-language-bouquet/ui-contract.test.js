import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const productionFiles = ["index.html", "app.js", "styles.css", "README.md"];

function read(file) {
  return readFileSync(join(projectDir, file), "utf8");
}

test("A 级生产入口、应用、样式和 README 全部存在", () => {
  for (const file of productionFiles) {
    assert.equal(existsSync(join(projectDir, file)), true, file);
  }
});

test("index 使用语义 DOM 与固定经典脚本顺序，不预埋私人结果", () => {
  const html = read("index.html");
  assert.match(html, /<main\b[^>]*id="bouquet-app"/u);
  assert.match(html, /<header\b/u);
  assert.match(html, /<section\b[^>]*id="experience-root"/u);
  assert.match(html, /id="live-status"[^>]*role="status"[^>]*aria-live="polite"/u);
  assert.match(html, /<noscript>[^]*需要启用 JavaScript[^]*<\/noscript>/u);
  assert.match(
    html,
    /<script src="config\.js"><\/script>\s*<script src="logic\.js"><\/script>\s*<script src="app\.js"><\/script>/u,
  );
  assert.doesNotMatch(html, /type="module"|https?:\/\/|<iframe\b|<img\b/u);
  for (const secret of [
    "给最特别的你",
    "总想把好事都留给你的人",
    "这束花，替我把心意放在这里",
    "不用等某个特别的日子",
  ]) {
    assert.equal(html.includes(secret), false, secret);
  }
});

test("app 只投影 core public view，并锁定完整阶段动作与单通道反馈", () => {
  const source = read("app.js");
  for (const required of [
    "FLOWER_LANGUAGE_BOUQUET_LOGIC",
    "createStartAction",
    "getPublicView",
    "buildExportModel",
    "开始挑花",
    "撤回上一枝",
    "系好这束花",
    "重新挑一束",
    "已选第",
    "已撤回：",
    "已交给浏览器处理",
    "queueMicrotask",
    "focusRequestToken",
    "aria-disabled",
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  assert.doesNotMatch(source, /\.innerHTML\b|insertAdjacentHTML|document\.write/u);
  assert.doesNotMatch(
    source,
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|clipboard|share)\b/u,
  );
});

test("页面与 standalone 导出都使用受控 SVG primitive 和结构白名单", () => {
  const source = read("app.js");
  for (const shape of ["rose", "tulip", "daisy", "sunflower", "lisianthus", "gypsophila"]) {
    assert.match(source, new RegExp(`(?:function|const)\\\\s+[^\\\\n]*${shape}|[\"']${shape}[\"']\\\\s*:`, "u"), shape);
  }
  for (const required of [
    "createElementNS",
    "XMLSerializer",
    "image/svg+xml;charset=utf-8",
    "flower-language-bouquet.svg",
    "256 * 1024",
    "foreignObject",
    "textContent",
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  assert.doesNotMatch(source, /createElementNS\([^)]*,\s*model\.|setAttribute\([^,]+,\s*model\./u);
});

test("导出 controller 保持显式 link、可重试错误与安全 object URL 生命周期", () => {
  const source = read("app.js");
  for (const required of [
    "unsupported",
    "preparing",
    "ready",
    "error",
    "createObjectURL",
    "revokeObjectURL",
    "保存文件已经准备好",
    "保存含留言的 SVG",
    "重新准备保存文件",
    "花束和留言都还在。",
  ]) {
    assert.equal(source.includes(required), true, required);
  }
  assert.doesNotMatch(source, /\.click\s*\(\s*\)/u);
  assert.doesNotMatch(source, /pagehide[^]*revokeObjectURL|revokeObjectURL[^]*pagehide/u);
  assert.doesNotMatch(source, /保存成功|已保存到|保存到相册/u);
});

test("样式精确实现已接受 token、触控、焦点、响应式与系统降级", () => {
  const css = read("styles.css");
  for (const token of [
    "#faf8f3",
    "#f1ede5",
    "#20342d",
    "#661f22",
    "#30483d",
    "#9a7a43",
    "#3b216d",
    "min-block-size: 56px",
    "outline: 3px solid",
    "outline-offset: 3px",
    "prefers-reduced-motion: reduce",
    "forced-colors: active",
    "safe-area-inset-bottom",
    "overflow-wrap: anywhere",
  ]) {
    assert.equal(css.includes(token), true, token);
  }
  assert.match(css, /@media\s*\([^)]*max-width:\s*899px/u);
  assert.match(css, /@media\s*\([^)]*max-width:\s*599px/u);
  assert.doesNotMatch(css, /url\(|@import|outline:\s*none/u);
});

test("生产运行时保持 classic、零公网、零持久化与零 docs 图片依赖", () => {
  for (const file of ["index.html", "app.js", "styles.css"]) {
    const source = read(file);
    assert.doesNotMatch(source, /docs\/assets|desktop-.*concept|mobile-.*concept/u, file);
    assert.doesNotMatch(source, /https?:\/\/|(?:^|\n)\s*(?:import|export)\s/u, file);
    assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB|CacheStorage)\b/u, file);
  }
});

test("README 完整说明双击、玩法、隐私、SVG 保存限制、零依赖与固定借鉴", () => {
  const readme = read("README.md");
  for (const required of [
    "双击",
    "第一枝",
    "撤回上一枝",
    "系好这束花",
    "config.js",
    "不是权威花语",
    "不是加密",
    "保存含留言的 SVG",
    "不含收件人称呼",
    "下载、预览或交给系统文件",
    "零网络",
    "零第三方运行依赖",
    "8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9",
    "cea522bc41bfadc364837293d0c4dc585a65ac46",
    "c7573530343759ace8e46438a1fa2c44515b5554",
    "GENERATION.md",
    "十张",
    "不复制",
  ]) {
    assert.equal(readme.includes(required), true, required);
  }
});
