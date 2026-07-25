import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ASSET_URL,
  buildAsset,
  NATURAL_EARTH_COMMIT,
  NATURAL_EARTH_VERSION,
  normalizeFeatureCollection,
  sha256,
  SOURCE_SHA256,
} from "./vendor-map.mjs";

function fixture(overrides = {}) {
  return {
    type: "FeatureCollection",
    name: "must-be-removed",
    crs: { type: "name" },
    features: [{
      type: "Feature",
      properties: { label: "must-be-removed" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [0.123456789, -0],
          [1, 0],
          [1, 1],
          [0.123456789, -0],
        ]],
      },
    }],
    ...overrides,
  };
}

function fixtureBytes(value = fixture()) {
  return Buffer.from(JSON.stringify(value), "utf8");
}

test("固定 Natural Earth 版本、commit 与原始哈希", () => {
  assert.equal(NATURAL_EARTH_VERSION, "5.1.2");
  assert.equal(NATURAL_EARTH_COMMIT, "f1890d9f152c896d250a77557a5751a93d494776");
  assert.equal(SOURCE_SHA256, "9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9");
});

test("派生结果只保留陆地 geometry 并固定六位小数", () => {
  const bytes = fixtureBytes();
  const output = buildAsset(bytes, { expectedHash: sha256(bytes) });
  assert.equal(output.endsWith("\n"), true);
  assert.equal(output.includes("properties"), false);
  assert.equal(output.includes("\"name\""), false);
  assert.equal(output.includes("\"crs\""), false);
  assert.deepEqual(JSON.parse(output), {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [0.123457, 0],
          [1, 0],
          [1, 1],
          [0.123457, 0],
        ]],
      },
    }],
  });
});

test("相同输入产生逐字节相同输出，错误输入哈希失败", () => {
  const bytes = fixtureBytes();
  const expectedHash = sha256(bytes);
  assert.equal(buildAsset(bytes, { expectedHash }), buildAsset(bytes, { expectedHash }));
  assert.throws(
    () => buildAsset(bytes, { expectedHash: "0".repeat(64) }),
    /输入哈希不匹配/,
  );
});

test("拒绝空图层、非面 geometry、未闭合环和越界坐标", () => {
  assert.throws(
    () => normalizeFeatureCollection({ type: "FeatureCollection", features: [] }),
    /空图层/,
  );
  assert.throws(
    () => normalizeFeatureCollection(fixture({
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] } }],
    })),
    /不是陆地面/,
  );
  assert.throws(
    () => normalizeFeatureCollection(fixture({
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
      }],
    })),
    /没有闭合/,
  );
  assert.throws(
    () => normalizeFeatureCollection(fixture({
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[0, 0], [181, 0], [1, 1], [0, 0]]] },
      }],
    })),
    /超出 WGS84/,
  );
});

test("提交的生产资产结构、来源声明与输出哈希一致", async () => {
  const [assetText, attribution] = await Promise.all([
    readFile(ASSET_URL, "utf8"),
    readFile(new URL("../ATTRIBUTION.md", import.meta.url), "utf8"),
  ]);
  const asset = JSON.parse(assetText);
  assert.equal(asset.type, "FeatureCollection");
  assert.ok(asset.features.length > 0);
  asset.features.forEach((feature) => {
    assert.deepEqual(Object.keys(feature).sort(), ["geometry", "type"]);
    assert.ok(["Polygon", "MultiPolygon"].includes(feature.geometry.type));
  });
  assert.match(attribution, new RegExp(SOURCE_SHA256));
  assert.match(attribution, new RegExp(sha256(assetText)));
});
