(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SHARED_COLOR_STUDIO_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "stalled"]);
  const DEFAULT_HUES = Object.freeze([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);
  const DEFAULT_LIGHTNESS = Object.freeze([0.48, 0.52, 0.56, 0.60, 0.64, 0.68, 0.72, 0.76, 0.80]);
  const DEFAULT_ROUNDS = deepFreeze([
    {
      id: "sunset-letter",
      title: "晚霞信笺",
      note: "像那天回头时，天边刚好慢下来。",
      target: { hueIndex: 1, lightnessIndex: 7 },
      start: { hueIndex: 8, lightnessIndex: 2 },
    },
    {
      id: "sea-glass",
      title: "海玻璃",
      note: "把风和浪磨成一小块安静。",
      target: { hueIndex: 6, lightnessIndex: 6 },
      start: { hueIndex: 2, lightnessIndex: 1 },
    },
    {
      id: "berry-night",
      title: "莓果夜灯",
      note: "深一点，再留一盏只给彼此的灯。",
      target: { hueIndex: 11, lightnessIndex: 3 },
      start: { hueIndex: 4, lightnessIndex: 8 },
    },
    {
      id: "moss-letter",
      title: "苔痕小纸条",
      note: "被雨淋过的话，也会慢慢长出颜色。",
      target: { hueIndex: 4, lightnessIndex: 5 },
      start: { hueIndex: 9, lightnessIndex: 2 },
    },
    {
      id: "lavender-dawn",
      title: "薰衣草清晨",
      note: "最后一张，调成我们醒来时的光。",
      target: { hueIndex: 9, lightnessIndex: 8 },
      start: { hueIndex: 1, lightnessIndex: 4 },
    },
  ]);
  const DEFAULT_COPY = deepFreeze({
    title: "把颜色调到一起",
    intro: "你转色相，我调明暗。一起把五张色笺调到目标刻度。",
    start: "开始调色",
    retry: "再调一次",
    next: "收下这张",
    restart: "重新调一册",
  });
  const DEFAULT_CONFIG = deepFreeze({
    tickMs: 100,
    countdownTicks: 30,
    roundTicks: 240,
    maxFrameGapMs: 500,
    chroma: 0.12,
    hueDegrees: DEFAULT_HUES,
    lightness: DEFAULT_LIGHTNESS,
    rounds: DEFAULT_ROUNDS,
    copy: DEFAULT_COPY,
  });

  function createStudioState(rawConfig) {
    const rules = sanitizeConfig(rawConfig);
    return createReadyState(rules, 0);
  }

  function startStudio(state) {
    if (!isStudioState(state) || (state.phase !== "ready" && state.phase !== "complete")) return state;
    const round = state.rules.rounds[0];
    return freezeState({
      phase: state.rules.countdownTicks === 0 ? "playing" : "countdown",
      roundIndex: 0,
      attemptNumber: 1,
      current: clonePoint(round.start),
      countdownTicks: state.rules.countdownTicks,
      remainingTicks: state.rules.roundTicks,
      moves: { hue: 0, lightness: 0 },
      completed: [],
      outcome: null,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
      rules: state.rules,
    });
  }

  function advanceCountdown(state, ticks) {
    if (!isStudioState(state) || state.phase !== "countdown") return state;
    const elapsed = normalizeTicks(ticks);
    if (elapsed === 0) return state;
    const countdownTicks = Math.max(0, state.countdownTicks - elapsed);
    return freezeState({
      ...state,
      phase: countdownTicks === 0 ? "playing" : "countdown",
      countdownTicks,
      revision: state.revision + 1,
    });
  }

  function applyAxisMove(state, move) {
    if (!isStudioState(state) || state.phase !== "playing") return state;
    if (!move || (move.axis !== "hue" && move.axis !== "lightness")) return state;
    if (move.direction !== -1 && move.direction !== 1) return state;

    const current = clonePoint(state.current);
    const moves = { ...state.moves };
    if (move.axis === "hue") {
      current.hueIndex = modulo(current.hueIndex + move.direction, state.rules.hueDegrees.length);
      moves.hue += 1;
    } else {
      const next = clamp(current.lightnessIndex + move.direction, 0, state.rules.lightness.length - 1);
      if (next === current.lightnessIndex) return state;
      current.lightnessIndex = next;
      moves.lightness += 1;
    }

    const target = state.rules.rounds[state.roundIndex].target;
    const succeeded = samePoint(current, target);
    const completed = succeeded
      ? [...state.completed, {
        id: state.rules.rounds[state.roundIndex].id,
        moves: { ...moves },
        attempts: state.attemptNumber,
        remainingTicks: state.remainingTicks,
      }]
      : state.completed;
    return freezeState({
      ...state,
      phase: succeeded ? "round-result" : "playing",
      current,
      moves,
      completed,
      outcome: succeeded ? "success" : null,
      revision: state.revision + 1,
    });
  }

  function advanceTimer(state, ticks) {
    if (!isStudioState(state) || state.phase !== "playing") return state;
    const elapsed = normalizeTicks(ticks);
    if (elapsed === 0) return state;
    const remainingTicks = Math.max(0, state.remainingTicks - elapsed);
    return freezeState({
      ...state,
      phase: remainingTicks === 0 ? "round-result" : "playing",
      remainingTicks,
      outcome: remainingTicks === 0 ? "timeout" : null,
      revision: state.revision + 1,
    });
  }

  function retryRound(state) {
    if (!isStudioState(state) || state.phase !== "round-result" || state.outcome !== "timeout") return state;
    const round = state.rules.rounds[state.roundIndex];
    return freezeState({
      ...state,
      phase: state.rules.countdownTicks === 0 ? "playing" : "countdown",
      attemptNumber: state.attemptNumber + 1,
      current: clonePoint(round.start),
      countdownTicks: state.rules.countdownTicks,
      remainingTicks: state.rules.roundTicks,
      moves: { hue: 0, lightness: 0 },
      outcome: null,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function advanceRound(state) {
    if (!isStudioState(state) || state.phase !== "round-result" || state.outcome !== "success") return state;
    if (state.roundIndex >= state.rules.rounds.length - 1) {
      return freezeState({
        ...state,
        phase: "complete",
        pauseReason: null,
        resumePhase: null,
        revision: state.revision + 1,
      });
    }
    const roundIndex = state.roundIndex + 1;
    const round = state.rules.rounds[roundIndex];
    return freezeState({
      ...state,
      phase: state.rules.countdownTicks === 0 ? "playing" : "countdown",
      roundIndex,
      attemptNumber: 1,
      current: clonePoint(round.start),
      countdownTicks: state.rules.countdownTicks,
      remainingTicks: state.rules.roundTicks,
      moves: { hue: 0, lightness: 0 },
      outcome: null,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function pauseStudio(state, reason) {
    if (!isStudioState(state) || (state.phase !== "countdown" && state.phase !== "playing")) return state;
    return freezeState({
      ...state,
      phase: "paused",
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
      resumePhase: state.phase,
      revision: state.revision + 1,
    });
  }

  function resumeStudio(state) {
    if (!isStudioState(state) || state.phase !== "paused") return state;
    return freezeState({
      ...state,
      phase: state.resumePhase,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function restartStudio(state) {
    if (!isStudioState(state)) return state;
    return createReadyState(state.rules, state.revision + 1);
  }

  function getView(state) {
    if (!isStudioState(state)) return null;
    const round = state.rules.rounds[state.roundIndex];
    const hueAxis = describeHueAxis(state.current.hueIndex, round.target.hueIndex, state.rules.hueDegrees.length);
    const lightnessAxis = describeLightnessAxis(state.current.lightnessIndex, round.target.lightnessIndex);
    const countdownVisible = state.phase === "countdown" || (state.phase === "paused" && state.resumePhase === "countdown");
    const view = {
      phase: state.phase,
      roundNumber: state.roundIndex + 1,
      roundCount: state.rules.rounds.length,
      attemptNumber: state.attemptNumber,
      title: round.title,
      note: round.note,
      currentColor: describeColor(state.current, state.rules),
      targetColor: describeColor(round.target, state.rules),
      hueAxis,
      lightnessAxis,
      remainingMs: state.remainingTicks * state.rules.tickMs,
      countdownLabel: countdownVisible
        ? String(Math.max(1, Math.ceil((state.countdownTicks * state.rules.tickMs) / 1000)))
        : null,
      moves: { ...state.moves },
      completed: state.completed.map(cloneCompleted),
      outcome: state.outcome,
      statusLabel: "",
      canStart: state.phase === "ready" || state.phase === "complete",
      canMove: state.phase === "playing",
      canPause: state.phase === "countdown" || state.phase === "playing",
      canResume: state.phase === "paused",
      canRetry: state.phase === "round-result" && state.outcome === "timeout",
      canAdvance: state.phase === "round-result" && state.outcome === "success",
      canRestart: state.phase === "complete",
    };
    view.statusLabel = statusFor(state, view);
    return view;
  }

  function classifyControlCode(code) {
    const move = {
      KeyA: { axis: "hue", direction: -1 },
      KeyD: { axis: "hue", direction: 1 },
      KeyJ: { axis: "lightness", direction: -1 },
      KeyL: { axis: "lightness", direction: 1 },
    }[code];
    return move ? { ...move } : null;
  }

  function getColorTokens(viewColor, supportsOklch) {
    const source = viewColor && typeof viewColor === "object" ? viewColor : {};
    const hueIndex = clampInteger(source.hueIndex, 0, DEFAULT_HUES.length - 1, 0);
    const lightnessIndex = clampInteger(source.lightnessIndex, 0, DEFAULT_LIGHTNESS.length - 1, 0);
    const hueDegrees = finiteNumber(source.hueDegrees, DEFAULT_HUES[hueIndex]);
    const lightnessValue = clamp(finiteNumber(source.lightness, DEFAULT_LIGHTNESS[lightnessIndex]), 0, 1);
    const chroma = clamp(finiteNumber(source.chroma, DEFAULT_CONFIG.chroma), 0.02, 0.16);
    const lightnessPercent = Math.round(lightnessValue * 100);
    if (supportsOklch === true) {
      return {
        mode: "oklch",
        css: `oklch(${lightnessPercent}% ${formatNumber(chroma)} ${formatNumber(hueDegrees)})`,
        hueDegrees,
        lightnessPercent,
      };
    }
    const saturation = clamp(Math.round(chroma * 500 + 16), 24, 88);
    return {
      mode: "hsl",
      css: `hsl(${formatNumber(hueDegrees)} ${saturation}% ${lightnessPercent}%)`,
      hueDegrees,
      lightnessPercent,
    };
  }

  function replayStudio(rawConfig, events) {
    let state = createStudioState(rawConfig);
    const entries = Array.isArray(events) ? events : [];
    for (const event of entries) {
      if (!event || typeof event !== "object") continue;
      switch (event.type) {
        case "start": state = startStudio(state); break;
        case "countdown": state = advanceCountdown(state, event.ticks); break;
        case "move": state = applyAxisMove(state, { axis: event.axis, direction: event.direction }); break;
        case "timer": state = advanceTimer(state, event.ticks); break;
        case "retry": state = retryRound(state); break;
        case "next": state = advanceRound(state); break;
        case "pause": state = pauseStudio(state, event.reason); break;
        case "resume": state = resumeStudio(state); break;
        case "restart": state = restartStudio(state); break;
        default: break;
      }
    }
    return state;
  }

  function sanitizeConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    const hueDegrees = sameNumberArray(source.hueDegrees, DEFAULT_HUES) ? [...source.hueDegrees] : [...DEFAULT_HUES];
    const lightness = sameNumberArray(source.lightness, DEFAULT_LIGHTNESS) ? [...source.lightness] : [...DEFAULT_LIGHTNESS];
    const rounds = sanitizeRounds(source.rounds, hueDegrees.length, lightness.length);
    return deepFreeze({
      tickMs: boundedInteger(source.tickMs, 50, 250, DEFAULT_CONFIG.tickMs),
      countdownTicks: boundedInteger(source.countdownTicks, 0, 100, DEFAULT_CONFIG.countdownTicks),
      roundTicks: boundedInteger(source.roundTicks, 50, 1200, DEFAULT_CONFIG.roundTicks),
      maxFrameGapMs: boundedInteger(source.maxFrameGapMs, 250, 2000, DEFAULT_CONFIG.maxFrameGapMs),
      chroma: boundedNumber(source.chroma, 0.02, 0.16, DEFAULT_CONFIG.chroma),
      hueDegrees,
      lightness,
      rounds,
      copy: sanitizeCopy(source.copy),
    });
  }

  function sanitizeRounds(value, hueCount, lightnessCount) {
    if (!Array.isArray(value) || value.length !== DEFAULT_ROUNDS.length) return cloneRounds(DEFAULT_ROUNDS);
    const seen = new Set();
    const rounds = value.map((round) => {
      if (!round || typeof round !== "object") return null;
      const id = typeof round.id === "string" ? round.id.trim() : "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64 || seen.has(id)) return null;
      const target = sanitizePoint(round.target, hueCount, lightnessCount);
      const start = sanitizePoint(round.start, hueCount, lightnessCount);
      if (!target || !start || samePoint(target, start)) return null;
      seen.add(id);
      const fallback = DEFAULT_ROUNDS[seen.size - 1];
      return {
        id,
        title: cleanText(round.title, 16, fallback.title),
        note: cleanText(round.note, 48, fallback.note),
        target,
        start,
      };
    });
    return rounds.every(Boolean) ? rounds : cloneRounds(DEFAULT_ROUNDS);
  }

  function sanitizePoint(value, hueCount, lightnessCount) {
    if (!value || typeof value !== "object") return null;
    if (!Number.isInteger(value.hueIndex) || value.hueIndex < 0 || value.hueIndex >= hueCount) return null;
    if (!Number.isInteger(value.lightnessIndex) || value.lightnessIndex < 0 || value.lightnessIndex >= lightnessCount) return null;
    return { hueIndex: value.hueIndex, lightnessIndex: value.lightnessIndex };
  }

  function sanitizeCopy(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      title: cleanText(source.title, 24, DEFAULT_COPY.title),
      intro: cleanText(source.intro, 120, DEFAULT_COPY.intro),
      start: cleanText(source.start, 24, DEFAULT_COPY.start),
      retry: cleanText(source.retry, 24, DEFAULT_COPY.retry),
      next: cleanText(source.next, 24, DEFAULT_COPY.next),
      restart: cleanText(source.restart, 24, DEFAULT_COPY.restart),
    };
  }

  function createReadyState(rules, revision) {
    const first = rules.rounds[0];
    return freezeState({
      phase: "ready",
      roundIndex: 0,
      attemptNumber: 1,
      current: clonePoint(first.start),
      countdownTicks: rules.countdownTicks,
      remainingTicks: rules.roundTicks,
      moves: { hue: 0, lightness: 0 },
      completed: [],
      outcome: null,
      pauseReason: null,
      resumePhase: null,
      revision,
      rules,
    });
  }

  function describeColor(point, rules) {
    return {
      hueIndex: point.hueIndex,
      lightnessIndex: point.lightnessIndex,
      hueDegrees: rules.hueDegrees[point.hueIndex],
      lightness: rules.lightness[point.lightnessIndex],
      chroma: rules.chroma,
    };
  }

  function describeHueAxis(currentIndex, targetIndex, count) {
    const clockwise = modulo(targetIndex - currentIndex, count);
    const counterclockwise = modulo(currentIndex - targetIndex, count);
    if (clockwise === 0) {
      return { currentIndex, targetIndex, distance: 0, direction: "matched", label: "色相已经合拍" };
    }
    const useClockwise = clockwise <= counterclockwise;
    const distance = useClockwise ? clockwise : counterclockwise;
    return {
      currentIndex,
      targetIndex,
      distance,
      direction: useClockwise ? "clockwise" : "counterclockwise",
      label: `色相还差 ${distance} 格，${useClockwise ? "顺时针转" : "逆时针转"}`,
    };
  }

  function describeLightnessAxis(currentIndex, targetIndex) {
    if (currentIndex === targetIndex) {
      return { currentIndex, targetIndex, distance: 0, direction: "matched", label: "明度已经合拍" };
    }
    const lighter = currentIndex < targetIndex;
    const distance = Math.abs(targetIndex - currentIndex);
    return {
      currentIndex,
      targetIndex,
      distance,
      direction: lighter ? "lighter" : "darker",
      label: `明度还差 ${distance} 格，${lighter ? "再亮一点" : "再深一点"}`,
    };
  }

  function statusFor(state, view) {
    if (state.phase === "ready") return state.rules.copy.intro;
    if (state.phase === "countdown") return `准备调色，倒数 ${view.countdownLabel}。`;
    if (state.phase === "playing") return `${view.hueAxis.label}；${view.lightnessAxis.label}。`;
    if (state.phase === "paused") {
      if (state.pauseReason === "hidden" || state.pauseReason === "blur") return "离开页面，调色已为你们暂停。";
      if (state.pauseReason === "stalled") return "时间间隔过长，调色已安全暂停。";
      return "调色暂停，准备好再继续。";
    }
    if (state.phase === "round-result" && state.outcome === "success") {
      return `两条刻度合拍，收下${view.title}。`;
    }
    if (state.phase === "round-result" && state.outcome === "timeout") {
      return "时间到了，颜色没有丢。一起再调一次。";
    }
    if (state.phase === "complete") return "五张色笺已经合成一本共同色册。";
    return "";
  }

  function isStudioState(state) {
    if (!state || typeof state !== "object" || !isRuleSet(state.rules)) return false;
    if (!["ready", "countdown", "playing", "paused", "round-result", "complete"].includes(state.phase)) return false;
    if (!Number.isInteger(state.roundIndex) || state.roundIndex < 0 || state.roundIndex >= state.rules.rounds.length) return false;
    if (!isPoint(state.current, state.rules.hueDegrees.length, state.rules.lightness.length)) return false;
    if (!isPositiveInteger(state.attemptNumber) || !isNonNegativeInteger(state.countdownTicks)) return false;
    if (!isNonNegativeInteger(state.remainingTicks) || state.remainingTicks > state.rules.roundTicks) return false;
    if (!isMoveCount(state.moves) || !isNonNegativeInteger(state.revision)) return false;
    if (!Array.isArray(state.completed) || !hasValidCompletedPrefix(state.completed, state.rules)) return false;
    if (state.outcome !== null && state.outcome !== "success" && state.outcome !== "timeout") return false;

    const paused = state.phase === "paused";
    if (paused) {
      if (!PAUSE_REASONS.includes(state.pauseReason)) return false;
      if (state.resumePhase !== "countdown" && state.resumePhase !== "playing") return false;
    } else if (state.pauseReason !== null || state.resumePhase !== null) {
      return false;
    }

    const success = state.phase === "round-result" && state.outcome === "success";
    const timeout = state.phase === "round-result" && state.outcome === "timeout";
    const expectedCompleted = state.roundIndex + (success || state.phase === "complete" ? 1 : 0);
    if (state.completed.length !== expectedCompleted) return false;
    if (state.phase === "ready" && (state.roundIndex !== 0 || state.attemptNumber !== 1 || state.outcome !== null)) return false;
    if ((state.phase === "countdown" || state.phase === "playing" || paused) && state.outcome !== null) return false;
    if (state.phase === "countdown" && state.countdownTicks === 0) return false;
    if (state.phase === "playing" && (state.countdownTicks !== 0 || state.remainingTicks === 0)) return false;
    if (success && !samePoint(state.current, state.rules.rounds[state.roundIndex].target)) return false;
    if (timeout && state.remainingTicks !== 0) return false;
    if (state.phase === "round-result" && !success && !timeout) return false;
    if (state.phase === "complete" && (state.roundIndex !== state.rules.rounds.length - 1 || state.outcome !== "success")) return false;
    return true;
  }

  function isRuleSet(rules) {
    if (!rules || typeof rules !== "object") return false;
    if (!sameNumberArray(rules.hueDegrees, DEFAULT_HUES) || !sameNumberArray(rules.lightness, DEFAULT_LIGHTNESS)) return false;
    if (!boundedInteger(rules.tickMs, 50, 250, null) || !boundedInteger(rules.roundTicks, 50, 1200, null)) return false;
    if (!Number.isInteger(rules.countdownTicks) || rules.countdownTicks < 0 || rules.countdownTicks > 100) return false;
    if (!boundedInteger(rules.maxFrameGapMs, 250, 2000, null)) return false;
    if (!Number.isFinite(rules.chroma) || rules.chroma < 0.02 || rules.chroma > 0.16) return false;
    if (!Array.isArray(rules.rounds) || rules.rounds.length !== DEFAULT_ROUNDS.length) return false;
    if (!rules.copy || typeof rules.copy !== "object" || Object.values(DEFAULT_COPY).some((_, index) => {
      const key = Object.keys(DEFAULT_COPY)[index];
      return typeof rules.copy[key] !== "string";
    })) return false;

    const ids = new Set();
    return rules.rounds.every((round) => {
      if (!round || typeof round !== "object" || typeof round.id !== "string" || ids.has(round.id)) return false;
      if (typeof round.title !== "string" || typeof round.note !== "string") return false;
      if (!isPoint(round.target, rules.hueDegrees.length, rules.lightness.length)) return false;
      if (!isPoint(round.start, rules.hueDegrees.length, rules.lightness.length) || samePoint(round.target, round.start)) return false;
      ids.add(round.id);
      return true;
    });
  }

  function hasValidCompletedPrefix(completed, rules) {
    if (completed.length > rules.rounds.length) return false;
    return completed.every((entry, index) => Boolean(
      entry
      && typeof entry === "object"
      && entry.id === rules.rounds[index].id
      && isMoveCount(entry.moves)
      && isPositiveInteger(entry.attempts)
      && isNonNegativeInteger(entry.remainingTicks)
      && entry.remainingTicks <= rules.roundTicks
    ));
  }

  function isPoint(point, hueCount, lightnessCount) {
    return Boolean(
      point
      && typeof point === "object"
      && Number.isInteger(point.hueIndex)
      && point.hueIndex >= 0
      && point.hueIndex < hueCount
      && Number.isInteger(point.lightnessIndex)
      && point.lightnessIndex >= 0
      && point.lightnessIndex < lightnessCount
    );
  }

  function isMoveCount(moves) {
    return Boolean(moves && typeof moves === "object" && isNonNegativeInteger(moves.hue) && isNonNegativeInteger(moves.lightness));
  }

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  function isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function normalizeTicks(value) {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function boundedInteger(value, min, max, fallback) {
    return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }

  function boundedNumber(value, min, max, fallback) {
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  }

  function clampInteger(value, min, max, fallback) {
    return Number.isInteger(value) ? clamp(value, min, max) : fallback;
  }

  function finiteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function cleanText(value, maxLength, fallback) {
    const text = typeof value === "string" ? value.trim() : "";
    return text ? Array.from(text).slice(0, maxLength).join("") : fallback;
  }

  function sameNumberArray(value, expected) {
    return Array.isArray(value)
      && value.length === expected.length
      && value.every((entry, index) => Number.isFinite(entry) && entry === expected[index]);
  }

  function cloneRounds(rounds) {
    return rounds.map((round) => ({
      id: round.id,
      title: round.title,
      note: round.note,
      target: clonePoint(round.target),
      start: clonePoint(round.start),
    }));
  }

  function clonePoint(point) {
    return { hueIndex: point.hueIndex, lightnessIndex: point.lightnessIndex };
  }

  function cloneCompleted(entry) {
    return {
      id: entry.id,
      moves: { ...entry.moves },
      attempts: entry.attempts,
      remainingTicks: entry.remainingTicks,
    };
  }

  function samePoint(first, second) {
    return first.hueIndex === second.hueIndex && first.lightnessIndex === second.lightnessIndex;
  }

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value) {
    return String(Number(value.toFixed(4)));
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return Object.freeze({
    createStudioState,
    startStudio,
    advanceCountdown,
    applyAxisMove,
    advanceTimer,
    retryRound,
    advanceRound,
    pauseStudio,
    resumeStudio,
    restartStudio,
    getView,
    classifyControlCode,
    getColorTokens,
    replayStudio,
  });
});
