(function (root, factory) {
  "use strict";
  root.LIGHT_GROWN_TREE_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 生长空间是归一化坐标：x ∈ [-1, 1] 从左到右，y 从地面 0 向上。
  // 渲染层负责把它映射到画布，逻辑层不知道任何像素。
  const TOTAL_STEPS = 12;
  const SPLIT_STEPS = Object.freeze([2, 5, 8]);
  const MAX_TIPS = 8;
  const BASE_SEGMENT_LENGTH = 0.118;
  const SEGMENT_FALLOFF = 0.9;
  // 生长方向 = 原方向的惯性 + 恒定向上的偏置 + 朝光的牵引。向上的偏置让树始终长高，
  // 光只负责把它掰向左右和调整倾斜度；没有这一项，枝条会一路收敛到光点上，
  // 树冠塌成一个点。MIN_RISE 再兜底一次：任何一节都必须比上一节高。
  const HEADING_INERTIA = 0.55;
  const UP_BIAS = 0.5;
  const STEER_WEIGHT = 0.85;
  // 越细的枝越不追光、越守住自己的方向。没有这两条，分叉出来的枝会立刻
  // 全部拐回同一个光点，树冠收拢成一束而不是散开。
  const STEER_FALLOFF = 0.58;
  const INERTIA_GAIN = 0.34;
  // 越细的枝越不急着向上，分叉之后才能继续往外张，树冠才铺得开。
  const UP_BIAS_FALLOFF = 0.24;
  const MIN_RISE = 0.18;
  const JITTER_RADIANS = 0.16;
  const SPLIT_RADIANS = 0.78;
  const LIGHT_BOUNDS = Object.freeze({ minX: -1, maxX: 1, minY: 0.18, maxY: 1.1 });
  const TIP_BOUNDS = Object.freeze({ minX: -1.08, maxX: 1.08, minY: 0, maxY: 1.3 });
  const DEFAULT_LIGHT = Object.freeze({ x: 0, y: 0.74 });
  const PHASES = Object.freeze(["intro", "growing", "complete"]);
  const CONFIG_KEYS = Object.freeze([
    "recipientName",
    "finalTitle",
    "letterLines",
    "signature",
    "togetherSince",
    "composeGrowthNote",
  ]);
  const DEFAULT_GROWTH_NOTES = Object.freeze([
    "它记住了这个方向。",
    "再往那边一点，它就跟过去了。",
    "枝条分开了，但根还是同一条。",
    "长得慢一点也没关系。",
    "你把光放在哪，它就朝哪长。",
    "快到能开花的高度了。",
  ]);

  function defaultComposeGrowthNote() {
    return null;
  }

  const DEFAULT_CONFIG = deepFreeze({
    recipientName: "给你",
    finalTitle: "你把光放在哪，它就长到哪",
    letterLines: [
      "这棵树没有预设的样子。",
      "它长成现在这样，是因为你把光带到了这些地方。",
      "我们大概也是这样长起来的。",
    ],
    signature: "—— 种树的人",
    togetherSince: null,
    composeGrowthNote: defaultComposeGrowthNote,
  });

  // 标准整数散列（Knuth 乘法 + MurmurHash3 finalizer 常量），只用来把
  // (枝条 id, 步序) 变成可重放的偏移量，不使用 Math.random。
  function deterministicUnit(seed) {
    let value = Math.imul(seed >>> 0, 2654435761) >>> 0;
    value ^= value >>> 15;
    value = Math.imul(value, 2246822519) >>> 0;
    value ^= value >>> 13;
    value = Math.imul(value, 3266489917) >>> 0;
    value = (value ^ (value >>> 16)) >>> 0;
    return value / 4294967296;
  }

  function signedJitter(branchId, stepIndex) {
    return deterministicUnit(branchId * 733 + stepIndex * 19 + 7) * 2 - 1;
  }

  function clamp(value, minimum, maximum) {
    if (!Number.isFinite(value)) return minimum;
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalize(vector) {
    const length = Math.hypot(vector.x, vector.y);
    if (!Number.isFinite(length) || length === 0) return { x: 0, y: 1 };
    return { x: vector.x / length, y: vector.y / length };
  }

  function rotate(vector, radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
  }

  // 任何一节都必须向上：把方向压回最小仰角，而不是直接丢弃它的左右分量。
  function ensureRise(vector) {
    if (vector.y >= MIN_RISE) return vector;
    return normalize({ x: vector.x, y: MIN_RISE });
  }

  function isFinitePoint(value) {
    return Boolean(value) && typeof value === "object"
      && Number.isFinite(value.x) && Number.isFinite(value.y);
  }

  function clampLight(light) {
    if (!isFinitePoint(light)) return { ...DEFAULT_LIGHT };
    return {
      x: clamp(light.x, LIGHT_BOUNDS.minX, LIGHT_BOUNDS.maxX),
      y: clamp(light.y, LIGHT_BOUNDS.minY, LIGHT_BOUNDS.maxY),
    };
  }

  function sanitizeText(value, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed === "" ? fallback : trimmed;
  }

  function sanitizeLetterLines(value, fallback) {
    if (!Array.isArray(value)) return fallback;
    const lines = value
      .filter((line) => typeof line === "string")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .slice(0, 8);
    return lines.length === 0 ? fallback : deepFreeze(lines);
  }

  // togetherSince 只接受能解析成过去时刻的日期；解析失败一律回退到 null，
  // 这样最终页面只是不显示相守时间，而不会显示一个错误的数字。
  function sanitizeTogetherSince(value) {
    if (typeof value !== "string" && !(value instanceof Date)) return null;
    const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  function sanitizeConfig(config) {
    const source = config && typeof config === "object" && !Array.isArray(config) ? config : {};
    const composeGrowthNote = typeof source.composeGrowthNote === "function"
      ? source.composeGrowthNote
      : DEFAULT_CONFIG.composeGrowthNote;

    return deepFreeze({
      recipientName: sanitizeText(source.recipientName, DEFAULT_CONFIG.recipientName),
      finalTitle: sanitizeText(source.finalTitle, DEFAULT_CONFIG.finalTitle),
      letterLines: sanitizeLetterLines(source.letterLines, DEFAULT_CONFIG.letterLines),
      signature: sanitizeText(source.signature, DEFAULT_CONFIG.signature),
      togetherSince: sanitizeTogetherSince(source.togetherSince),
      composeGrowthNote,
    });
  }

  function createInitialState(config) {
    return deepFreeze({
      phase: "intro",
      stepIndex: 0,
      light: { ...DEFAULT_LIGHT },
      segments: [],
      tips: [],
      blossoms: [],
      lastNote: "",
      config: sanitizeConfig(config),
      revision: 0,
    });
  }

  function start(state) {
    if (!isTreeState(state) || state.phase !== "intro") return state;
    return deepFreeze({
      ...state,
      phase: "growing",
      tips: [{ id: 1, x: 0, y: 0, headingX: 0, headingY: 1, generation: 0 }],
      lastNote: "",
      revision: state.revision + 1,
    });
  }

  function moveLight(state, light) {
    if (!isTreeState(state)) return state;
    const next = clampLight(light);
    if (next.x === state.light.x && next.y === state.light.y) return state;
    return deepFreeze({ ...state, light: next, revision: state.revision + 1 });
  }

  function nudgeLight(state, deltaX, deltaY) {
    if (!isTreeState(state)) return state;
    const dx = Number.isFinite(deltaX) ? deltaX : 0;
    const dy = Number.isFinite(deltaY) ? deltaY : 0;
    return moveLight(state, { x: state.light.x + dx, y: state.light.y + dy });
  }

  function growOnce(state) {
    if (!isTreeState(state) || state.phase !== "growing") return state;
    if (state.stepIndex >= TOTAL_STEPS) return state;

    const stepIndex = state.stepIndex + 1;
    const segments = state.segments.slice();
    const grownTips = [];
    let nextId = state.tips.reduce((highest, tip) => Math.max(highest, tip.id), 0);

    for (const tip of state.tips) {
      const toLight = normalize({ x: state.light.x - tip.x, y: state.light.y - tip.y });
      const steer = STEER_WEIGHT * Math.pow(STEER_FALLOFF, tip.generation);
      const inertia = HEADING_INERTIA + INERTIA_GAIN * tip.generation;
      const upBias = UP_BIAS * Math.max(0.25, 1 - UP_BIAS_FALLOFF * tip.generation);
      const blended = normalize({
        x: tip.headingX * inertia + toLight.x * steer,
        y: tip.headingY * inertia + upBias + toLight.y * steer,
      });
      const heading = ensureRise(rotate(blended, signedJitter(tip.id, stepIndex) * JITTER_RADIANS));
      const length = BASE_SEGMENT_LENGTH * Math.pow(SEGMENT_FALLOFF, tip.generation);
      const endX = clamp(tip.x + heading.x * length, TIP_BOUNDS.minX, TIP_BOUNDS.maxX);
      const endY = clamp(tip.y + heading.y * length, TIP_BOUNDS.minY, TIP_BOUNDS.maxY);

      segments.push(Object.freeze({
        x1: tip.x,
        y1: tip.y,
        x2: endX,
        y2: endY,
        generation: tip.generation,
        step: stepIndex,
      }));
      grownTips.push({
        id: tip.id,
        x: endX,
        y: endY,
        headingX: heading.x,
        headingY: heading.y,
        generation: tip.generation,
      });
    }

    let tips = grownTips;
    if (SPLIT_STEPS.includes(stepIndex) && grownTips.length * 2 <= MAX_TIPS) {
      tips = [];
      for (const tip of grownTips) {
        const heading = { x: tip.headingX, y: tip.headingY };
        const left = rotate(heading, SPLIT_RADIANS);
        const right = rotate(heading, -SPLIT_RADIANS);
        tips.push({
          ...tip,
          headingX: left.x,
          headingY: left.y,
          generation: tip.generation + 1,
        });
        nextId += 1;
        tips.push({
          id: nextId,
          x: tip.x,
          y: tip.y,
          headingX: right.x,
          headingY: right.y,
          generation: tip.generation + 1,
        });
      }
    }

    const complete = stepIndex >= TOTAL_STEPS;
    return deepFreeze({
      ...state,
      phase: complete ? "complete" : "growing",
      stepIndex,
      segments,
      tips,
      blossoms: complete ? buildBlossoms(tips) : [],
      lastNote: complete ? "" : resolveGrowthNote(state.config, stepIndex),
      revision: state.revision + 1,
    });
  }

  function buildBlossoms(tips) {
    return tips.map((tip, index) => Object.freeze({
      x: tip.x,
      y: tip.y,
      size: 0.55 + deterministicUnit(tip.id * 97 + index) * 0.6,
      tint: deterministicUnit(tip.id * 31 + index * 5),
    }));
  }

  // 准备者写的策略只影响一句提示文字。它返回非字符串、抛异常或返回空串时都安全回退，
  // 绝不会阻断生长或最后的信。
  function resolveGrowthNote(config, stepIndex) {
    const fallback = DEFAULT_GROWTH_NOTES[(stepIndex - 1) % DEFAULT_GROWTH_NOTES.length];
    let composed = null;
    try {
      composed = config.composeGrowthNote({ stepIndex, totalSteps: TOTAL_STEPS });
    } catch {
      return fallback;
    }
    if (typeof composed !== "string") return fallback;
    const trimmed = composed.trim();
    return trimmed === "" ? fallback : trimmed.slice(0, 40);
  }

  function restart(state) {
    if (!isTreeState(state)) return state;
    return deepFreeze({
      ...createInitialState(state.config),
      revision: state.revision + 1,
    });
  }

  function getDerivedProgress(state) {
    if (!isTreeState(state)) return null;
    return deepFreeze({
      stepIndex: state.stepIndex,
      totalSteps: TOTAL_STEPS,
      remainingSteps: Math.max(0, TOTAL_STEPS - state.stepIndex),
      branchCount: state.tips.length,
      segmentCount: state.segments.length,
      ratio: state.stepIndex / TOTAL_STEPS,
      isComplete: state.phase === "complete",
    });
  }

  // 方向只用于朗读和文字镜像，八个方位足够描述“它往哪边长了”。
  function describeDirection(light) {
    const point = clampLight(light);
    const horizontal = point.x < -0.28 ? "左" : point.x > 0.28 ? "右" : "";
    const vertical = point.y > 0.82 ? "上" : point.y < 0.45 ? "低" : "";
    if (horizontal === "" && vertical === "") return "正前方";
    if (horizontal === "") return `正${vertical}方`;
    if (vertical === "") return `${horizontal}边`;
    return `${horizontal}${vertical}方`;
  }

  // 纯函数：只接受毫秒差，方便测试，也不在逻辑层读取当前时间。
  function formatTogetherDuration(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return null;
    const totalSeconds = Math.floor(milliseconds / 1000);
    return deepFreeze({
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    });
  }

  function isTreeState(value) {
    return Boolean(value) && typeof value === "object"
      && PHASES.includes(value.phase)
      && Number.isInteger(value.stepIndex)
      && Array.isArray(value.segments)
      && Array.isArray(value.tips)
      && Array.isArray(value.blossoms)
      && isFinitePoint(value.light)
      && Boolean(value.config);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }

  return deepFreeze({
    TOTAL_STEPS,
    SPLIT_STEPS,
    MAX_TIPS,
    LIGHT_BOUNDS,
    TIP_BOUNDS,
    DEFAULT_LIGHT,
    DEFAULT_CONFIG,
    DEFAULT_GROWTH_NOTES,
    sanitizeConfig,
    createInitialState,
    start,
    moveLight,
    nudgeLight,
    growOnce,
    restart,
    getDerivedProgress,
    describeDirection,
    formatTogetherDuration,
    isTreeState,
  });
});
