export const MIN_LATITUDE = -80;
export const MAX_LATITUDE = 80;
export const ZOOM_LEVELS = Object.freeze([1, 2, 4, 8]);
export const COARSE_STEP_DEGREES = 0.5;
export const FINE_STEP_DEGREES = 0.1;

const FIT_PADDING = 0.02;
const POINT_KEYS = Object.freeze(["longitude", "latitude"]);
const POSITION_KEYS = Object.freeze(["x", "y"]);
const VIEWPORT_KEYS = Object.freeze(["zoom", "center"]);
const FEATURE_COLLECTION_KEYS = Object.freeze(["type", "features"]);
const FEATURE_KEYS = Object.freeze(["type", "geometry"]);
const GEOMETRY_KEYS = Object.freeze(["type", "coordinates"]);

export function normalizePoint(value) {
  const record = readExactRecord(value, POINT_KEYS);
  if (!record) return null;
  const longitude = normalizeFinite(record.longitude, -180, 180);
  const latitude = normalizeFinite(record.latitude, MIN_LATITUDE, MAX_LATITUDE);
  if (longitude === null || latitude === null) return null;
  return deepFreeze({ longitude, latitude });
}

export function projectPoint(value) {
  const point = normalizePoint(value);
  if (!point) return null;
  return deepFreeze({
    x: round9((point.longitude + 180) / 360),
    y: round9((90 - point.latitude) / 180),
  });
}

export function unprojectPoint(value) {
  const position = normalizePosition(value, { clamp: true });
  if (!position) return null;
  return deepFreeze({
    longitude: round6(position.x * 360 - 180),
    latitude: round6(clamp(90 - position.y * 180, MIN_LATITUDE, MAX_LATITUDE)),
  });
}

export function movePoint(value, direction, { fine = false } = {}) {
  const point = normalizePoint(value);
  if (!point || !["up", "right", "down", "left"].includes(direction)) return null;
  const step = fine === true ? FINE_STEP_DEGREES : COARSE_STEP_DEGREES;
  const delta = {
    up: [0, step],
    right: [step, 0],
    down: [0, -step],
    left: [-step, 0],
  }[direction];
  return deepFreeze({
    longitude: round6(clamp(point.longitude + delta[0], -180, 180)),
    latitude: round6(clamp(point.latitude + delta[1], MIN_LATITUDE, MAX_LATITUDE)),
  });
}

export function createViewport() {
  return deepFreeze({
    zoom: 1,
    center: { x: 0.5, y: 0.5 },
  });
}

export function zoomViewport(value, level, anchor = null) {
  const viewport = normalizeViewport(value);
  if (!viewport) return createViewport();
  if (!ZOOM_LEVELS.includes(level)) return makeViewport(viewport.zoom, viewport.center);
  if (level === viewport.zoom) return makeViewport(viewport.zoom, viewport.center);

  const currentBounds = rawViewportBounds(viewport);
  const normalizedAnchor = normalizePosition(anchor, { clamp: true }) ?? viewport.center;
  const screenX = (normalizedAnchor.x - currentBounds.left) / (currentBounds.right - currentBounds.left);
  const screenY = (normalizedAnchor.y - currentBounds.top) / (currentBounds.bottom - currentBounds.top);
  const nextSize = 1 / level;
  const center = {
    x: normalizedAnchor.x + (0.5 - screenX) * nextSize,
    y: normalizedAnchor.y + (0.5 - screenY) * nextSize,
  };
  return makeViewport(level, center);
}

export function panViewport(value, delta) {
  const viewport = normalizeViewport(value);
  const normalizedDelta = readExactRecord(delta, POSITION_KEYS);
  if (
    !viewport
    || !normalizedDelta
    || !Number.isFinite(normalizedDelta.x)
    || !Number.isFinite(normalizedDelta.y)
  ) return viewport ? makeViewport(viewport.zoom, viewport.center) : createViewport();
  if (normalizedDelta.x === 0 && normalizedDelta.y === 0) {
    return makeViewport(viewport.zoom, viewport.center);
  }
  return makeViewport(viewport.zoom, {
    x: viewport.center.x + normalizedDelta.x,
    y: viewport.center.y + normalizedDelta.y,
  });
}

export function fitPoints(values) {
  if (!Array.isArray(values) || values.length === 0) return createViewport();
  const points = values.map(normalizePoint);
  if (points.some((point) => !point)) return createViewport();

  const longitudes = points.map((point) => point.longitude);
  if (Math.max(...longitudes) - Math.min(...longitudes) > 180) return createViewport();

  const projected = points.map(projectPoint);
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const required = Math.max(spanX + FIT_PADDING * 2, spanY + FIT_PADDING * 2);
  const level = [...ZOOM_LEVELS].reverse().find((candidate) => 1 / candidate >= required) ?? 1;
  return makeViewport(level, {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  });
}

export function viewportBounds(value) {
  const viewport = normalizeViewport(value);
  if (!viewport) return null;
  const bounds = rawViewportBounds(viewport);
  return deepFreeze(Object.fromEntries(
    Object.entries(bounds).map(([key, number]) => [key, round6(number)]),
  ));
}

export function validateLandGeometry(value) {
  const root = requireExactRecord(value, FEATURE_COLLECTION_KEYS, "land");
  if (root.type !== "FeatureCollection") {
    throw new TypeError("land.type 必须是 FeatureCollection。");
  }
  const features = requireDenseArray(root.features, "land.features");
  if (features.length === 0) throw new TypeError("land.features 不能为空。");

  return deepFreeze({
    type: "FeatureCollection",
    features: features.map((feature, index) => normalizeLandFeature(feature, index)),
  });
}

function normalizeLandFeature(value, index) {
  const path = `land.features[${index}]`;
  const feature = requireExactRecord(value, FEATURE_KEYS, path);
  if (feature.type !== "Feature") throw new TypeError(`${path}.type 必须是 Feature。`);
  const geometry = requireExactRecord(feature.geometry, GEOMETRY_KEYS, `${path}.geometry`);
  if (!["Polygon", "MultiPolygon"].includes(geometry.type)) {
    throw new TypeError(`${path}.geometry.type 必须是 Polygon 或 MultiPolygon。`);
  }
  return {
    type: "Feature",
    geometry: {
      type: geometry.type,
      coordinates: geometry.type === "Polygon"
        ? normalizePolygon(geometry.coordinates, path)
        : normalizeMultiPolygon(geometry.coordinates, path),
    },
  };
}

function normalizeMultiPolygon(value, path) {
  const polygons = requireDenseArray(value, `${path}.geometry.coordinates`);
  if (polygons.length === 0) throw new TypeError(`${path}.geometry.coordinates 不能为空。`);
  return polygons.map((polygon) => normalizePolygon(polygon, path));
}

function normalizePolygon(value, path) {
  const rings = requireDenseArray(value, `${path}.geometry.coordinates`);
  if (rings.length === 0) throw new TypeError(`${path}.geometry.coordinates 不能为空。`);
  return rings.map((ring) => {
    const points = requireDenseArray(ring, `${path}.geometry.ring`);
    if (points.length < 4) throw new TypeError(`${path}.geometry.ring 至少需要四个点。`);
    const normalized = points.map((point) => normalizeLandCoordinate(point, path));
    const first = normalized[0];
    const last = normalized.at(-1);
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new TypeError(`${path}.geometry.ring 必须闭合。`);
    }
    return normalized;
  });
}

function normalizeLandCoordinate(value, path) {
  const point = requireDenseArray(value, `${path}.geometry.coordinate`);
  if (point.length !== 2) throw new TypeError(`${path}.geometry.coordinate 必须只有经纬度。`);
  const [longitude, latitude] = point;
  if (
    typeof longitude !== "number"
    || typeof latitude !== "number"
    || !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) throw new TypeError(`${path}.geometry.coordinate 超出 WGS84 范围。`);
  return [round6(longitude), round6(latitude)];
}

function makeViewport(zoom, center) {
  const half = 0.5 / zoom;
  return deepFreeze({
    zoom,
    center: {
      x: round6(clamp(center.x, half, 1 - half)),
      y: round6(clamp(center.y, half, 1 - half)),
    },
  });
}

function normalizeViewport(value) {
  const record = readExactRecord(value, VIEWPORT_KEYS);
  if (!record || !ZOOM_LEVELS.includes(record.zoom)) return null;
  const center = normalizePosition(record.center);
  if (!center) return null;
  const half = 0.5 / record.zoom;
  if (
    center.x < half
    || center.x > 1 - half
    || center.y < half
    || center.y > 1 - half
  ) return null;
  return {
    zoom: record.zoom,
    center,
  };
}

function rawViewportBounds(viewport) {
  const half = 0.5 / viewport.zoom;
  return {
    left: viewport.center.x - half,
    top: viewport.center.y - half,
    right: viewport.center.x + half,
    bottom: viewport.center.y + half,
  };
}

function normalizePosition(value, { clamp: shouldClamp = false } = {}) {
  const record = readExactRecord(value, POSITION_KEYS);
  if (!record || !Number.isFinite(record.x) || !Number.isFinite(record.y)) return null;
  if (!shouldClamp && (record.x < 0 || record.x > 1 || record.y < 0 || record.y > 1)) return null;
  return {
    x: round9(shouldClamp ? clamp(record.x, 0, 1) : record.x),
    y: round9(shouldClamp ? clamp(record.y, 0, 1) : record.y),
  };
}

function normalizeFinite(value, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    return null;
  }
  return round6(value);
}

function readExactRecord(value, allowedKeys) {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Object.getOwnPropertySymbols(value).length > 0
    || Object.keys(descriptors).length !== allowedKeys.length
  ) return null;
  const result = Object.create(null);
  for (const key of allowedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function requireExactRecord(value, allowedKeys, path) {
  if (!isPlainObject(value)) throw new TypeError(`${path} 必须是普通对象。`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} 不能包含 Symbol 字段。`);
  }
  for (const key of Object.keys(descriptors)) {
    if (!allowedKeys.includes(key)) throw new TypeError(`${path} 不支持字段 ${key}。`);
  }
  const result = Object.create(null);
  for (const key of allowedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor) throw new TypeError(`${path} 缺少字段 ${key}。`);
    if (!Object.hasOwn(descriptor, "value")) throw new TypeError(`${path}.${key} 必须是数据属性。`);
    result[key] = descriptor.value;
  }
  return result;
}

function requireDenseArray(value, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${path} 必须是普通连续数组。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || !expected.has(key)) {
      throw new TypeError(`${path} 必须是普通连续数组。`);
    }
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${path} 必须是普通连续数组。`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function round6(value) {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function round9(value) {
  const rounded = Number(value.toFixed(9));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
