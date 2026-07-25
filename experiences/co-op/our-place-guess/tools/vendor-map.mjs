import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NATURAL_EARTH_VERSION = "5.1.2";
export const NATURAL_EARTH_COMMIT = "f1890d9f152c896d250a77557a5751a93d494776";
export const SOURCE_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_COMMIT}/geojson/ne_110m_land.geojson`;
export const SOURCE_SHA256 = "9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9";
export const ASSET_URL = new URL("../assets/ne-110m-land.min.geojson", import.meta.url);

const ALLOWED_GEOMETRIES = new Set(["Polygon", "MultiPolygon"]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildAsset(sourceBytes, { expectedHash = SOURCE_SHA256 } = {}) {
  if (!(sourceBytes instanceof Uint8Array)) {
    throw new TypeError("Natural Earth 输入必须是字节数组。");
  }
  const actualHash = sha256(sourceBytes);
  if (actualHash !== expectedHash) {
    throw new Error(`Natural Earth 输入哈希不匹配：${actualHash}`);
  }

  let source;
  try {
    source = JSON.parse(Buffer.from(sourceBytes).toString("utf8"));
  } catch {
    throw new Error("Natural Earth 输入不是合法 UTF-8 JSON。");
  }
  const asset = normalizeFeatureCollection(source);
  return `${JSON.stringify(asset)}\n`;
}

export function normalizeFeatureCollection(value) {
  if (!isPlainObject(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error("Natural Earth 输入必须是 FeatureCollection。");
  }
  if (value.features.length === 0) throw new Error("Natural Earth 输入不能是空图层。");

  return {
    type: "FeatureCollection",
    features: value.features.map((feature, index) => normalizeFeature(feature, index)),
  };
}

export async function fetchSource(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new TypeError("当前 Node 环境不支持 fetch。");
  const response = await fetchImpl(SOURCE_URL, { redirect: "follow" });
  if (!response?.ok) {
    throw new Error(`下载 Natural Earth 失败：HTTP ${response?.status ?? "unknown"}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function generateAsset({
  check = false,
  fetchImpl = globalThis.fetch,
  assetUrl = ASSET_URL,
} = {}) {
  const bytes = await fetchSource(fetchImpl);
  const output = buildAsset(bytes);
  const outputHash = sha256(output);

  if (check) {
    let existing;
    try {
      existing = await readFile(assetUrl, "utf8");
    } catch {
      throw new Error("本地 Natural Earth 派生资产不存在。");
    }
    if (existing !== output) throw new Error("本地 Natural Earth 派生资产与固定来源不一致。");
  } else {
    await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
    await writeFile(assetUrl, output, "utf8");
  }

  return {
    sourceHash: sha256(bytes),
    outputHash,
    outputBytes: Buffer.byteLength(output),
  };
}

function normalizeFeature(feature, index) {
  if (!isPlainObject(feature) || feature.type !== "Feature" || !isPlainObject(feature.geometry)) {
    throw new Error(`Natural Earth 第 ${index + 1} 个要素格式不正确。`);
  }
  const type = feature.geometry.type;
  if (!ALLOWED_GEOMETRIES.has(type)) {
    throw new Error(`Natural Earth 第 ${index + 1} 个要素不是陆地面。`);
  }
  return {
    type: "Feature",
    geometry: {
      type,
      coordinates: normalizeGeometryCoordinates(type, feature.geometry.coordinates, index),
    },
  };
}

function normalizeGeometryCoordinates(type, coordinates, featureIndex) {
  if (!Array.isArray(coordinates)) {
    throw new Error(`Natural Earth 第 ${featureIndex + 1} 个要素坐标不正确。`);
  }
  if (type === "Polygon") return normalizePolygon(coordinates, featureIndex);
  if (coordinates.length === 0) {
    throw new Error(`Natural Earth 第 ${featureIndex + 1} 个 MultiPolygon 为空。`);
  }
  return coordinates.map((polygon) => normalizePolygon(polygon, featureIndex));
}

function normalizePolygon(polygon, featureIndex) {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    throw new Error(`Natural Earth 第 ${featureIndex + 1} 个 Polygon 为空。`);
  }
  return polygon.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error(`Natural Earth 第 ${featureIndex + 1} 个环至少需要四个点。`);
    }
    const normalized = ring.map((point) => normalizeCoordinate(point, featureIndex));
    if (!sameCoordinate(normalized[0], normalized.at(-1))) {
      throw new Error(`Natural Earth 第 ${featureIndex + 1} 个环没有闭合。`);
    }
    return normalized;
  });
}

function normalizeCoordinate(point, featureIndex) {
  if (!Array.isArray(point) || point.length !== 2) {
    throw new Error(`Natural Earth 第 ${featureIndex + 1} 个坐标必须只有经纬度。`);
  }
  const [longitude, latitude] = point;
  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) {
    throw new Error(`Natural Earth 第 ${featureIndex + 1} 个坐标超出 WGS84 范围。`);
  }
  return [roundCoordinate(longitude), roundCoordinate(latitude)];
}

function roundCoordinate(value) {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function sameCoordinate(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

async function main(argv = process.argv.slice(2)) {
  if (argv.some((argument) => argument !== "--check")) {
    throw new Error("只支持 --check 参数。");
  }
  const result = await generateAsset({ check: argv.includes("--check") });
  const action = argv.includes("--check") ? "已核对" : "已生成";
  console.log(`${action} Natural Earth ${NATURAL_EARTH_VERSION} land 资产`);
  console.log(`来源 SHA-256：${result.sourceHash}`);
  console.log(`输出 SHA-256：${result.outputHash}`);
  console.log(`输出字节数：${result.outputBytes}`);
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
