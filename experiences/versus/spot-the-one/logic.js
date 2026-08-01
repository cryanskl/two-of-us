(function (root, factory) {
  "use strict";
  root.SPOT_THE_ONE_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 题面完全由整数散列从（种子 + 题号 + 格号）推出：同一颗种子永远给出
  // 同一组题，测试可以逐题穷举断言“有且仅有一处差异”。
  const ROUND_GRID_SIZES = Object.freeze([3, 4, 5, 6, 7]);
  const MAX_GRID_SIZE = 7;
  // 每个图形都带一根从圆心指向外圈的指针，所以旋转差异对任何图形都可见，
  // 不依赖颜色分辨；HUES/LIGHTS 只是让画面有变化，不承担差异本身。
  const ROTATION_STEPS = 8;
  const SCALES = Object.freeze([0.68, 0.84, 1]);
  const STROKES = Object.freeze([2.5, 4.5, 7]);
  const ORNAMENTS = 3;
  const HUES = 5;
  const LIGHTS = 3;
  // 差异维度按题号轮换：几何属性（旋转 / 大小 / 线宽）永远参与，明度偏移
  // 只是辅助提示——色觉不同的玩家不会因此吃亏。
  const DIFF_KINDS = Object.freeze(["rotation", "scale", "stroke"]);
  const EARLY_ROTATION_DELTA = 2;
  const LATE_ROTATION_DELTA = 1;
  const SIDES = Object.freeze(["left", "right"]);
  const PHASES = Object.freeze(["intro", "playing", "reveal", "finished"]);

  const DEFAULT_CONFIG = Object.freeze({
    leftName: "左边这位",
    rightName: "右边这位",
    roundsTotal: 5,
    lockMs: 1500,
  });
  const MIN_ROUNDS = 1;
  const MAX_ROUNDS = 9;
  const MIN_LOCK_MS = 300;
  const MAX_LOCK_MS = 5000;
  const MAX_NAME_LENGTH = 12;

  function deepFreeze(value) {
    if (value === null || typeof value !== "object") return value;
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }

  // 标准整数散列：Knuth 乘法常量与 MurmurHash3 finalizer 的公开常量，
  // 只用来把离散坐标映射成稳定的伪随机位，替代 Math.random。
  function mixInt(value) {
    let hash = value | 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  function combine(seed, ...parts) {
    let hash = seed >>> 0;
    for (const part of parts) {
      hash = mixInt(hash ^ Math.imul(part + 0x9e3779b9, 0x85ebca6b));
    }
    return hash;
  }

  function normalizeSeed(value) {
    if (Number.isSafeInteger(value)) return mixInt(value) || 1;
    if (typeof value === "string" && value !== "") {
      let hash = 0x811c9dc5;
      for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
      }
      return mixInt(hash) || 1;
    }
    return 1;
  }

  function sanitizeName(value, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (trimmed === "") return fallback;
    return Array.from(trimmed).slice(0, MAX_NAME_LENGTH).join("");
  }

  function clampInt(value, minimum, maximum, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.round(value)));
  }

  function sanitizeConfig(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return deepFreeze({
      leftName: sanitizeName(source.leftName, DEFAULT_CONFIG.leftName),
      rightName: sanitizeName(source.rightName, DEFAULT_CONFIG.rightName),
      roundsTotal: clampInt(source.roundsTotal, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_CONFIG.roundsTotal),
      lockMs: clampInt(source.lockMs, MIN_LOCK_MS, MAX_LOCK_MS, DEFAULT_CONFIG.lockMs),
    });
  }

  function gridSizeFor(roundIndex) {
    if (roundIndex < ROUND_GRID_SIZES.length) return ROUND_GRID_SIZES[roundIndex];
    return MAX_GRID_SIZE;
  }

  function baseCell(seed, roundIndex, cellIndex) {
    return {
      ornament: combine(seed, roundIndex, cellIndex, 1) % ORNAMENTS,
      hue: combine(seed, roundIndex, cellIndex, 2) % HUES,
      light: combine(seed, roundIndex, cellIndex, 3) % LIGHTS,
      rotation: combine(seed, roundIndex, cellIndex, 4) % ROTATION_STEPS,
      scale: combine(seed, roundIndex, cellIndex, 5) % SCALES.length,
      stroke: combine(seed, roundIndex, cellIndex, 6) % STROKES.length,
    };
  }

  // 相邻档位平移：结果一定落在合法档位里，而且一定不等于原档位。
  function shiftIndex(index, length, upward) {
    if (upward && index + 1 < length) return index + 1;
    if (!upward && index > 0) return index - 1;
    return upward ? index - 1 : index + 1;
  }

  function createRound(seed, roundIndex) {
    const gridSize = gridSizeFor(roundIndex);
    const cellCount = gridSize * gridSize;
    const cells = [];
    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      cells.push(baseCell(seed, roundIndex, cellIndex));
    }
    const diffIndex = combine(seed, roundIndex, 7) % cellCount;
    const diffKind = DIFF_KINDS[roundIndex % DIFF_KINDS.length];
    const upward = combine(seed, roundIndex, 8) % 2 === 0;

    const variant = { ...cells[diffIndex] };
    if (diffKind === "rotation") {
      const delta = roundIndex < 3 ? EARLY_ROTATION_DELTA : LATE_ROTATION_DELTA;
      variant.rotation = (variant.rotation + delta) % ROTATION_STEPS;
    } else if (diffKind === "scale") {
      variant.scale = shiftIndex(variant.scale, SCALES.length, upward);
    } else {
      variant.stroke = shiftIndex(variant.stroke, STROKES.length, upward);
    }
    variant.light = shiftIndex(variant.light, LIGHTS, upward);

    return deepFreeze({
      index: roundIndex,
      gridSize,
      cellCount,
      cells,
      diffIndex,
      diffKind,
      variant,
      overtime: false,
    });
  }

  function panelCells(round, side) {
    if (side !== "right") return round.cells;
    const cells = round.cells.slice();
    cells[round.diffIndex] = round.variant;
    return cells;
  }

  function createMatch(rawConfig, rawSeed) {
    const config = sanitizeConfig(rawConfig);
    return deepFreeze({
      phase: "intro",
      seed: normalizeSeed(rawSeed),
      config,
      roundIndex: -1,
      round: null,
      scores: { left: 0, right: 0 },
      locks: { left: 0, right: 0 },
      outcome: null,
      winner: null,
    });
  }

  function withRound(state, roundIndex) {
    const round = createRound(state.seed, roundIndex);
    const overtime = roundIndex >= state.config.roundsTotal;
    return deepFreeze({
      ...state,
      phase: "playing",
      roundIndex,
      round: overtime ? deepFreeze({ ...round, overtime: true }) : round,
      locks: { left: 0, right: 0 },
      outcome: null,
    });
  }

  function start(state) {
    if (state.phase !== "intro") return state;
    return withRound(state, 0);
  }

  function pick(state, side, cellIndex, nowMs) {
    if (state.phase !== "playing") return state;
    if (!SIDES.includes(side)) return state;
    if (!Number.isSafeInteger(cellIndex)
      || cellIndex < 0 || cellIndex >= state.round.cellCount) return state;
    const now = Number.isFinite(nowMs) ? nowMs : 0;
    if (now < state.locks[side]) return state;

    if (cellIndex !== state.round.diffIndex) {
      return deepFreeze({
        ...state,
        locks: { ...state.locks, [side]: now + state.config.lockMs },
        outcome: { type: "miss", side, cellIndex, roundIndex: state.roundIndex },
      });
    }

    return deepFreeze({
      ...state,
      phase: "reveal",
      scores: { ...state.scores, [side]: state.scores[side] + 1 },
      outcome: { type: "hit", side, cellIndex, roundIndex: state.roundIndex },
    });
  }

  function advance(state) {
    if (state.phase !== "reveal") return state;
    const nextIndex = state.roundIndex + 1;
    const done = nextIndex >= state.config.roundsTotal
      && state.scores.left !== state.scores.right;
    if (done) {
      return deepFreeze({
        ...state,
        phase: "finished",
        winner: state.scores.left > state.scores.right ? "left" : "right",
        outcome: null,
      });
    }
    // 常规题打完仍平局时进入加时：每题必有一人得分，一道加时题就分出胜负。
    return withRound(state, nextIndex);
  }

  function restart(state, rawSeed) {
    return start(createMatch(state.config, rawSeed));
  }

  function cellLabel(round, cellIndex) {
    const row = Math.floor(cellIndex / round.gridSize) + 1;
    const column = (cellIndex % round.gridSize) + 1;
    return `第 ${row} 行第 ${column} 列`;
  }

  function isMatchState(value) {
    return Boolean(value) && typeof value === "object"
      && PHASES.includes(value.phase)
      && value.scores && Number.isSafeInteger(value.scores.left)
      && Number.isSafeInteger(value.scores.right);
  }

  return deepFreeze({
    ROUND_GRID_SIZES,
    MAX_GRID_SIZE,
    ROTATION_STEPS,
    SCALES,
    STROKES,
    ORNAMENTS,
    HUES,
    LIGHTS,
    DIFF_KINDS,
    SIDES,
    PHASES,
    DEFAULT_CONFIG,
    normalizeSeed,
    sanitizeConfig,
    createRound,
    panelCells,
    createMatch,
    start,
    pick,
    advance,
    restart,
    cellLabel,
    isMatchState,
  });
});
