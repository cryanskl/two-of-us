(function (root, factory) {
  "use strict";
  root.PANORAMA_MEMORY_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MEBIBYTE = 1024 * 1024;
  const MAX_FILE_SIZE = 40 * MEBIBYTE;
  const ALLOWED_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
  const MIN_RATIO = 1.9;
  const MAX_RATIO = 2.1;
  const LOW_WIDTH = 2048;
  const LOW_HEIGHT = 1024;
  const HIGH_WIDTH = 4096;
  const HIGH_HEIGHT = 2048;
  const MAX_WIDTH = 8192;
  const MAX_HEIGHT = 4096;

  function result(ok, code, message, extras) {
    return Object.assign({ ok, code, message }, extras || {});
  }

  function validateFileMetadata(metadata) {
    const input = metadata && typeof metadata === "object" ? metadata : {};
    const type = String(input.type || "").trim().toLowerCase();
    const size = Number(input.size);

    if (!ALLOWED_TYPES.includes(type)) {
      return result(false, "unsupported-type", "请选择 JPEG、PNG 或 WebP 格式的图片。");
    }
    if (!Number.isFinite(size) || size < 0) {
      return result(false, "invalid-file-size", "无法读取这个文件的大小，请换一张照片重试。");
    }
    if (size === 0) {
      return result(false, "empty-file", "这个文件是空的，请重新选择一张全景照片。");
    }
    if (size > MAX_FILE_SIZE) {
      return result(false, "file-too-large", "照片超过 40 MiB，请先在本地缩小后再试。");
    }
    return result(true, "ok", "文件格式和大小符合要求。", { type, size });
  }

  function assessPanoramaDimensions(dimensions) {
    const input = dimensions && typeof dimensions === "object" ? dimensions : {};
    const width = Number(input.width);
    const height = Number(input.height);

    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      return result(false, "invalid-dimensions", "无法读取有效的照片尺寸，请确认图片没有损坏。");
    }
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      return result(false, "dimensions-too-large", "照片尺寸超过 8192×4096，请先在本地缩小后再试。", {
        width,
        height,
      });
    }

    const ratio = width / height;
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      return result(false, "invalid-aspect-ratio", "这不是接近 2:1 的完整 360° 全景照片。", {
        width,
        height,
        ratio,
      });
    }

    const warnings = [];
    if (width < LOW_WIDTH || height < LOW_HEIGHT) {
      warnings.push({
        code: "low-resolution",
        message: "这张照片可以打开，但尺寸较小，放大后可能不够清晰。",
      });
    }
    if (width > HIGH_WIDTH || height > HIGH_HEIGHT) {
      warnings.push({
        code: "high-resolution",
        message: "这张照片尺寸较大，部分设备加载和拖动时可能较慢。",
      });
    }

    return result(true, warnings[0]?.code || "ok", warnings[0]?.message || "照片尺寸符合全景要求。", {
      width,
      height,
      ratio,
      warnings,
    });
  }

  return Object.freeze({
    ALLOWED_TYPES,
    MAX_FILE_SIZE,
    MIN_RATIO,
    MAX_RATIO,
    MAX_WIDTH,
    MAX_HEIGHT,
    validateFileMetadata,
    assessPanoramaDimensions,
  });
});
