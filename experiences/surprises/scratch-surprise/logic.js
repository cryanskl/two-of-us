(function (root, factory) {
  "use strict";
  root.SCRATCH_SURPRISE_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REVEAL_THRESHOLD = 0.55;
  const BRUSH_RATIO = 0.13;
  const MIN_BRUSH_SIZE = 38;
  const MAX_BRUSH_SIZE = 68;

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(1, Math.max(0, number));
  }

  function normalizePoint(x, y, width, height) {
    const safeWidth = Number(width);
    const safeHeight = Number(height);
    if (!Number.isFinite(safeWidth) || safeWidth <= 0 || !Number.isFinite(safeHeight) || safeHeight <= 0) {
      return null;
    }
    return {
      x: clamp01(Number(x) / safeWidth),
      y: clamp01(Number(y) / safeHeight),
    };
  }

  function normalizeSegment(value) {
    if (!value || typeof value !== "object") return null;
    const coordinates = [value.x1, value.y1, value.x2, value.y2].map(Number);
    if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) return null;
    const [x1, y1, x2, y2] = coordinates.map(clamp01);
    return { x1, y1, x2, y2 };
  }

  function sampleTransparentRatio(imageData, sampleStep) {
    const data = imageData && imageData.data ? imageData.data : imageData;
    if (!data || typeof data.length !== "number" || data.length < 4) return 0;
    const pixelCount = Math.floor(data.length / 4);
    if (pixelCount === 0) return 0;
    const step = Math.max(1, Math.floor(Number(sampleStep) || 1));
    let sampled = 0;
    let transparent = 0;
    for (let pixel = 0; pixel < pixelCount; pixel += step) {
      sampled += 1;
      if (data[pixel * 4 + 3] === 0) transparent += 1;
    }
    return sampled === 0 ? 0 : transparent / sampled;
  }

  function updateRevealState(state, sampledRatio, threshold) {
    const current = state && typeof state === "object" ? state : { revealed: false, progress: 0 };
    if (current.revealed) return current;
    const progress = clamp01(sampledRatio);
    const target = Number.isFinite(Number(threshold)) ? clamp01(threshold) : REVEAL_THRESHOLD;
    return {
      revealed: progress >= target,
      progress,
    };
  }

  function getBrushSize(width, height) {
    const shortestSide = Math.min(Number(width) || 0, Number(height) || 0);
    return Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, shortestSide * BRUSH_RATIO));
  }

  return Object.freeze({
    REVEAL_THRESHOLD,
    clamp01,
    normalizePoint,
    normalizeSegment,
    sampleTransparentRatio,
    updateRevealState,
    getBrushSize,
  });
});
