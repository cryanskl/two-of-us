import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createViewport,
  fitPoints,
  movePoint,
  normalizePoint,
  panViewport,
  projectPoint,
  unprojectPoint,
  validateLandGeometry,
  viewportBounds,
  ZOOM_LEVELS,
  zoomViewport,
} from "./map.js";

function deepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(deepFrozen);
}

test("经纬度与等距圆柱投影往返并固定六位小数", () => {
  const point = normalizePoint({ longitude: 121.4737001, latitude: 31.2304001 });
  assert.deepEqual(point, { longitude: 121.4737, latitude: 31.2304 });
  assert.deepEqual(unprojectPoint(projectPoint(point)), point);
  assert.deepEqual(projectPoint({ longitude: -180, latitude: 80 }), {
    x: 0,
    y: 0.055555556,
  });
  assert.deepEqual(projectPoint({ longitude: 180, latitude: -80 }), {
    x: 1,
    y: 0.944444444,
  });
  deepFrozen(point);
});

test("反投影钳制世界边界和首版纬度范围", () => {
  assert.deepEqual(unprojectPoint({ x: -2, y: -2 }), {
    longitude: -180,
    latitude: 80,
  });
  assert.deepEqual(unprojectPoint({ x: 2, y: 2 }), {
    longitude: 180,
    latitude: -80,
  });
  assert.equal(normalizePoint({ longitude: 181, latitude: 0 }), null);
  assert.equal(normalizePoint({ longitude: 0, latitude: 81 }), null);
  assert.equal(normalizePoint({ longitude: 0, latitude: 0, extra: true }), null);
  assert.equal(projectPoint({ longitude: "0", latitude: 0 }), null);
});

test("键盘粗调 0.5 度、细调 0.1 度且不越界", () => {
  const origin = { longitude: 10, latitude: 20 };
  assert.deepEqual(movePoint(origin, "up"), { longitude: 10, latitude: 20.5 });
  assert.deepEqual(movePoint(origin, "down", { fine: true }), { longitude: 10, latitude: 19.9 });
  assert.deepEqual(movePoint(origin, "left"), { longitude: 9.5, latitude: 20 });
  assert.deepEqual(movePoint(origin, "right", { fine: true }), { longitude: 10.1, latitude: 20 });
  assert.deepEqual(movePoint({ longitude: 180, latitude: 80 }, "right"), {
    longitude: 180,
    latitude: 80,
  });
  assert.deepEqual(movePoint({ longitude: 180, latitude: 80 }, "up"), {
    longitude: 180,
    latitude: 80,
  });
  assert.equal(movePoint(origin, "sideways"), null);
});

test("视口只接受四个缩放档位并始终钳制在世界内", () => {
  assert.deepEqual(ZOOM_LEVELS, [1, 2, 4, 8]);
  const initial = createViewport();
  assert.deepEqual(initial, { zoom: 1, center: { x: 0.5, y: 0.5 } });
  assert.deepEqual(viewportBounds(initial), { left: 0, top: 0, right: 1, bottom: 1 });

  const zoomed = zoomViewport(initial, 4, { x: 0.75, y: 0.25 });
  assert.equal(zoomed.zoom, 4);
  assert.deepEqual(viewportBounds(zoomed), {
    left: 0.5625,
    top: 0.1875,
    right: 0.8125,
    bottom: 0.4375,
  });
  assert.strictEqual(zoomViewport(zoomed, 3), zoomed);

  const panned = panViewport(zoomed, { x: 10, y: -10 });
  assert.deepEqual(viewportBounds(panned), {
    left: 0.75,
    top: 0,
    right: 1,
    bottom: 0.25,
  });
  deepFrozen(panned);
});

test("fitPoints 选择能容纳全部点的最高档位并处理重合与边缘", () => {
  const close = fitPoints([
    { longitude: 10, latitude: 10 },
    { longitude: 11, latitude: 11 },
    { longitude: 10.5, latitude: 10.2 },
  ]);
  assert.equal(close.zoom, 8);
  const closeBounds = viewportBounds(close);
  for (const point of [
    { longitude: 10, latitude: 10 },
    { longitude: 11, latitude: 11 },
    { longitude: 10.5, latitude: 10.2 },
  ]) {
    const projected = projectPoint(point);
    assert.ok(projected.x >= closeBounds.left && projected.x <= closeBounds.right);
    assert.ok(projected.y >= closeBounds.top && projected.y <= closeBounds.bottom);
  }

  const same = fitPoints(Array(3).fill({ longitude: -179, latitude: 79 }));
  assert.equal(same.zoom, 8);
  const sameBounds = viewportBounds(same);
  const projected = projectPoint({ longitude: -179, latitude: 79 });
  assert.ok(projected.x >= sameBounds.left && projected.x <= sameBounds.right);
  assert.ok(projected.y >= sameBounds.top && projected.y <= sameBounds.bottom);
});

test("反经线点集失败关闭为完整世界视图", () => {
  assert.deepEqual(fitPoints([
    { longitude: 179.8, latitude: 10 },
    { longitude: -179.7, latitude: 11 },
    { longitude: 179.5, latitude: 12 },
  ]), createViewport());
  assert.deepEqual(fitPoints([]), createViewport());
});

test("本地 land 资产通过严格 geometry 校验并返回断开冻结副本", async () => {
  const text = await readFile(new URL("./assets/ne-110m-land.min.geojson", import.meta.url), "utf8");
  const source = JSON.parse(text);
  const normalized = validateLandGeometry(source);
  assert.notStrictEqual(normalized, source);
  assert.notStrictEqual(normalized.features, source.features);
  assert.ok(normalized.features.length > 0);
  deepFrozen(normalized);
});

test("land 校验拒绝属性、CRS、非面、空环与越界坐标", () => {
  const polygon = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
      },
    }],
  };
  assert.doesNotThrow(() => validateLandGeometry(polygon));
  assert.throws(() => validateLandGeometry({ ...polygon, crs: {} }), /不支持字段 crs/);
  assert.throws(() => validateLandGeometry({
    ...polygon,
    features: [{ ...polygon.features[0], properties: {} }],
  }), /不支持字段 properties/);
  assert.throws(() => validateLandGeometry({
    ...polygon,
    features: [{ type: "Feature", geometry: { type: "LineString", coordinates: [] } }],
  }), /Polygon/);
  assert.throws(() => validateLandGeometry({
    ...polygon,
    features: [{
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [181, 0], [1, 1], [0, 0]]],
      },
    }],
  }), /WGS84/);
});
