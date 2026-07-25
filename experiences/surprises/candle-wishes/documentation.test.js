"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(file) {
  return fs.readFileSync(path.join(__dirname, file), "utf8");
}

test("README independently records launch, privacy, customization, and fixed attribution", () => {
  const readme = read("README.md");
  for (const expected of [
    "双击本目录的 `index.html`",
    "不需要启动服务、安装依赖或连接网络",
    "只修改称呼、最终标题、最终留言、署名",
    "页面只会显示当前线索和已经点亮的愿望",
    "## 借鉴与来源声明",
    "d51cd5c73c3171d6b769b5da1b9072beca691ce6",
    "Unlicense",
    "Alexander A. Kropotin",
    "3d364f985b2d96057f30d3fc67c5ee71ec37556f",
    "Copyright (c) 2025 Vida Khoshpey",
    "bf6ec8cae8c756203e059940d42089504ae43ec8",
    "Copyright (c) 2024 Ayushman Bhattacharya",
    "仅借鉴",
    "未复制",
    "零第三方依赖",
    "本地打开不代表 `config.js` 已加密",
  ]) {
    assert.equal(readme.includes(expected), true, expected);
  }
});

test("ATTRIBUTION links each borrowed concept to its immutable revision", () => {
  const attribution = read("ATTRIBUTION.md");
  for (const url of [
    "https://github.com/ololx/birthday-cake/tree/d51cd5c73c3171d6b769b5da1b9072beca691ce6",
    "https://github.com/VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle/tree/3d364f985b2d96057f30d3fc67c5ee71ec37556f",
    "https://github.com/elixpo/wish.elixpo/tree/bf6ec8cae8c756203e059940d42089504ae43ec8",
  ]) {
    assert.equal(attribution.includes(url), true, url);
  }
});
