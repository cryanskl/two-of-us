"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const config = require("./config.js");

test("项目目录是无依赖 CommonJS 边界", () => {
  const manifest = JSON.parse(readFileSync(require.resolve("./package.json"), "utf8"));
  assert.deepEqual(manifest, { type: "commonjs" });
});

test("config 在 CommonJS 与经典脚本暴露同一递归冻结合同", () => {
  assert.deepEqual(Reflect.ownKeys(config), [
    "PLAYER_IDS",
    "DIRECTIONS",
    "SOURCE_KINDS",
    "SOURCE_STATUSES",
    "SOURCE_ERROR_CODES",
    "DEFAULT_CONFIG",
    "DEFAULT_SOURCE_METADATA",
  ]);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.DEFAULT_CONFIG.playerLabels), true);
  assert.equal(Object.isFrozen(config.DEFAULT_SOURCE_METADATA), true);

  const context = { globalThis: {} };
  vm.runInNewContext(readFileSync(require.resolve("./config.js"), "utf8"), context);
  const browserConfig = context.globalThis.PhotoSliderRaceConfig;
  assert.deepEqual(
    JSON.parse(JSON.stringify(browserConfig)),
    JSON.parse(JSON.stringify(config)),
  );
  assert.equal(Object.isFrozen(browserConfig), true);
});

test("固定规则枚举精确且不重复", () => {
  assert.deepEqual(config.PLAYER_IDS, ["left", "right"]);
  assert.deepEqual(config.DIRECTIONS, ["up", "left", "down", "right"]);
  assert.deepEqual(config.SOURCE_KINDS, ["builtin", "local"]);
  assert.deepEqual(config.SOURCE_STATUSES, ["ready", "loading", "error"]);
  assert.equal(new Set(config.SOURCE_ERROR_CODES).size, config.SOURCE_ERROR_CODES.length);
});

test("默认来源元数据是最小白名单且不含可识别照片信息", () => {
  assert.deepEqual(config.DEFAULT_SOURCE_METADATA, {
    kind: "builtin",
    status: "ready",
    generation: 0,
    errorCode: null,
  });
  const serialized = JSON.stringify(config.DEFAULT_SOURCE_METADATA);
  for (const forbidden of [
    "url",
    "path",
    "name",
    "filename",
    "file",
    "blob",
    "exif",
    "gps",
    "width",
    "height",
    "mime",
  ]) {
    assert.equal(serialized.toLowerCase().includes(forbidden), false, forbidden);
  }
});

test("默认文案冻结隐私和权利边界", () => {
  assert.equal(config.DEFAULT_CONFIG.title, "同一张，谁先拼回");
  assert.match(config.DEFAULT_CONFIG.privacyNotice, /不上传，也不保存/);
  assert.match(config.DEFAULT_CONFIG.rightsNotice, /有权使用/);
  assert.deepEqual(config.DEFAULT_CONFIG.playerLabels, ["左边的你", "右边的你"]);
});
