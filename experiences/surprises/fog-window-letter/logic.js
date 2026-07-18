(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FOG_WINDOW_LETTER_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WINDOW_WIDTH = 1000;
  const WINDOW_HEIGHT = 620;
  const MIN_POINT_GAP = 12;
  const MIN_POINT_COUNT = 12;
  const MIN_DRAW_LENGTH = 720;
  const MIN_BOUNDS_WIDTH = 220;
  const MIN_BOUNDS_HEIGHT = 140;
  const MAX_STROKES = 8;
  const MAX_POINTS_PER_STROKE = 160;
  const MAX_TOTAL_POINTS = 480;
  const ANCHOR_SPACING = 32;
  const MAX_ANCHORS = 160;
  const TRACE_RADIUS = 46;
  const TRACE_REQUIRED_NUMERATOR = 4;
  const TRACE_REQUIRED_DENOMINATOR = 5;
  const MAX_FRAME_GAP_MS = 250;

  const PHASES = Object.freeze(["intro", "writing", "ready", "tracing", "paused", "complete"]);
  const RESUME_PHASES = Object.freeze(["writing", "ready", "tracing"]);
  const END_REASONS = Object.freeze(["up", "cancel", "lost-capture", "limit", "pause", "direct"]);
  const PUBLIC_END_REASONS = Object.freeze(["up", "cancel", "lost-capture"]);
  const PAUSE_REASONS = Object.freeze(["manual", "escape", "blur", "hidden", "long-frame"]);
  const NOTICE_VALUES = Object.freeze(["cancel", "limit", "cleared", "paused", "resumed"]);
  const STATE_KEYS = Object.freeze([
    "version", "phase", "resumePhase", "strokes", "active", "nextStrokeId", "lastGeneration",
    "drawLength", "bounds", "anchors", "hitAnchorIds", "traceStrokeCount", "completionReason",
    "announcementSerial", "lastNotice",
  ]);
  const CONFIG_FIELDS = deepFreeze([
    ["title", 40, "在雾上，写给你"],
    ["subtitle", 100, "先写下一点什么，再沿着它，把窗外慢慢擦亮。"],
    ["intro", 180, "不用写得好看。一个字、一颗星，或者只有我们懂的符号，都可以。"],
    ["startButton", 32, "开始写"],
    ["confirmButton", 32, "就写到这里"],
    ["clearButton", 32, "清空重写"],
    ["directButton", 32, "不方便手写，直接打开"],
    ["tracingInstruction", 180, "沿刚才的笔迹再走一遍，露珠亮起的地方，就是你已经找回的路。"],
    ["pauseButton", 32, "先停一下"],
    ["resumeButton", 32, "继续写给你"],
    ["completionTitle", 40, "窗外亮了"],
    ["defaultMessage", 240, "你刚才写下的每一笔，都让窗外更亮了一点。想说的话没有被风吹走，它一直在这里等你。"],
    ["signature", 80, "留给愿意再走一遍的你"],
    ["restartButton", 32, "再写一次"],
  ]);

  function defaultComposeFogWindowLetter(view) {
    return view.defaultMessage;
  }

  const DEFAULT_CONFIG = (() => {
    const value = {};
    for (const [key, , fallback] of CONFIG_FIELDS) value[key] = fallback;
    value.composeFogWindowLetter = defaultComposeFogWindowLetter;
    return deepFreeze(value);
  })();

  function createFogWindowState() {
    return freezeState({
      version: 1,
      phase: "intro",
      resumePhase: null,
      strokes: [],
      active: null,
      nextStrokeId: 0,
      lastGeneration: 0,
      drawLength: 0,
      bounds: null,
      anchors: [],
      hitAnchorIds: [],
      traceStrokeCount: 0,
      completionReason: null,
      announcementSerial: 0,
      lastNotice: null,
    });
  }

  function reduceFogWindow(state, action) {
    assertState(state);
    assertAction(action);
    if (action.type === "RESTART") return createFogWindowState();
    if (state.phase === "complete") return state;
    if (action.type === "START") return startWriting(state);
    if (action.type === "BEGIN_STROKE") return beginStroke(state, action);
    if (action.type === "ADD_STROKE_POINT") return addStrokePoint(state, action);
    if (action.type === "END_STROKE") return endStroke(state, action);
    if (action.type === "CLEAR_DRAWING") return clearDrawing(state);
    if (action.type === "CONFIRM_DRAWING") return confirmDrawing(state);
    if (action.type === "BEGIN_TRACE") return beginTrace(state, action);
    if (action.type === "ADD_TRACE_POINT") return addTracePoint(state, action);
    if (action.type === "END_TRACE") return endTrace(state, action);
    if (action.type === "DIRECT_REVEAL") return directReveal(state);
    if (action.type === "PAUSE") return pauseExperience(state);
    return resumeExperience(state);
  }

  function startWriting(state) {
    if (state.phase !== "intro") return state;
    return freezeState({
      ...state,
      phase: "writing",
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function beginStroke(state, action) {
    if ((state.phase !== "writing" && state.phase !== "ready") || state.active !== null
      || state.strokes.length >= MAX_STROKES || countPoints(state.strokes) >= MAX_TOTAL_POINTS
      || action.generation !== state.lastGeneration + 1) return state;
    const point = freezePoint(action.x, action.y);
    const stroke = deepFreeze({ id: state.nextStrokeId, points: [point], endReason: null });
    const phaseChanged = state.phase === "ready";
    return freezeState({
      ...state,
      phase: "writing",
      strokes: state.strokes.concat(stroke),
      active: {
        mode: "write",
        pointerId: action.pointerId,
        generation: action.generation,
        strokeId: stroke.id,
        lastPoint: point,
      },
      nextStrokeId: state.nextStrokeId + 1,
      lastGeneration: action.generation,
      bounds: extendBounds(state.bounds, point),
      lastNotice: null,
      announcementSerial: state.announcementSerial + Number(phaseChanged),
    });
  }

  function addStrokePoint(state, action) {
    if (!activeMatches(state, action, "write")) return state;
    const strokeIndex = state.strokes.length - 1;
    const stroke = state.strokes[strokeIndex];
    const point = freezePoint(action.x, action.y);
    const distance = approximateDistance(state.active.lastPoint, point);
    if (distance < MIN_POINT_GAP) return state;
    const nextStroke = deepFreeze({ ...stroke, points: stroke.points.concat(point) });
    const strokes = replaceAt(state.strokes, strokeIndex, nextStroke);
    const reachesLimit = nextStroke.points.length >= MAX_POINTS_PER_STROKE
      || countPoints(strokes) >= MAX_TOTAL_POINTS;
    const base = {
      ...state,
      strokes,
      drawLength: state.drawLength + distance,
      bounds: extendBounds(state.bounds, point),
      active: reachesLimit ? null : {
        ...state.active,
        lastPoint: point,
      },
    };
    if (!reachesLimit) return freezeState(base);
    return finishWriteSession(base, "limit", true);
  }

  function endStroke(state, action) {
    if (!activeMatches(state, action, "write")) return state;
    return finishWriteSession({ ...state, active: null }, action.reason, false);
  }

  function finishWriteSession(state, reason, fromLimit) {
    const strokeIndex = state.strokes.length - 1;
    const stroke = state.strokes[strokeIndex];
    const strokes = replaceAt(state.strokes, strokeIndex, deepFreeze({ ...stroke, endReason: reason }));
    const summary = summarizeStrokes(strokes);
    const phase = summary.gateReady ? "ready" : "writing";
    const cancelled = reason === "cancel" || reason === "lost-capture";
    const lastNotice = fromLimit ? "limit" : cancelled ? "cancel" : null;
    return freezeState({
      ...state,
      phase,
      strokes,
      active: null,
      lastNotice,
      announcementSerial: state.announcementSerial + Number(phase !== state.phase || lastNotice !== null),
    });
  }

  function clearDrawing(state) {
    if ((state.phase !== "writing" && state.phase !== "ready") || state.active !== null) return state;
    return freezeState({
      version: 1,
      phase: "writing",
      resumePhase: null,
      strokes: [],
      active: null,
      nextStrokeId: 0,
      lastGeneration: state.lastGeneration,
      drawLength: 0,
      bounds: null,
      anchors: [],
      hitAnchorIds: [],
      traceStrokeCount: 0,
      completionReason: null,
      announcementSerial: state.announcementSerial + 1,
      lastNotice: "cleared",
    });
  }

  function confirmDrawing(state) {
    if (state.phase !== "ready" || state.active !== null) return state;
    const anchors = generateAnchorsInternal(state.strokes);
    if (anchors.length < 18) throw new Error("internal contract: a ready drawing must generate at least 18 anchors");
    return freezeState({
      ...state,
      phase: "tracing",
      anchors,
      hitAnchorIds: [],
      traceStrokeCount: 0,
      lastNotice: null,
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function beginTrace(state, action) {
    if (state.phase !== "tracing" || state.active !== null
      || action.generation !== state.lastGeneration + 1) return state;
    const point = freezePoint(action.x, action.y);
    const hitAnchorIds = mergeHitIds(state.anchors, state.hitAnchorIds,
      (anchor) => squaredDistance(anchor, point) <= TRACE_RADIUS * TRACE_RADIUS);
    const base = {
      ...state,
      lastGeneration: action.generation,
      traceStrokeCount: state.traceStrokeCount + 1,
      hitAnchorIds,
      active: {
        mode: "trace",
        pointerId: action.pointerId,
        generation: action.generation,
        strokeId: null,
        lastPoint: point,
      },
      lastNotice: null,
    };
    return completeIfThreshold(base);
  }

  function addTracePoint(state, action) {
    if (!activeMatches(state, action, "trace")) return state;
    const point = freezePoint(action.x, action.y);
    const start = state.active.lastPoint;
    const hitAnchorIds = mergeHitIds(state.anchors, state.hitAnchorIds,
      (anchor) => pointHitsSegmentNumbers(anchor.x, anchor.y, start.x, start.y, point.x, point.y));
    return completeIfThreshold({
      ...state,
      hitAnchorIds,
      active: { ...state.active, lastPoint: point },
    });
  }

  function endTrace(state, action) {
    if (!activeMatches(state, action, "trace")) return state;
    const cancelled = action.reason === "cancel" || action.reason === "lost-capture";
    return freezeState({
      ...state,
      active: null,
      lastNotice: cancelled ? "cancel" : null,
      announcementSerial: state.announcementSerial + Number(cancelled),
    });
  }

  function completeIfThreshold(state) {
    if (state.hitAnchorIds.length < requiredHitCount(state.anchors.length)) return freezeState(state);
    return freezeState({
      ...state,
      phase: "complete",
      resumePhase: null,
      active: null,
      completionReason: "traced",
      lastNotice: null,
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function directReveal(state) {
    if (!["intro", "writing", "ready", "tracing", "paused"].includes(state.phase)) return state;
    let strokes = state.strokes;
    if (state.active && state.active.mode === "write") {
      const index = strokes.length - 1;
      strokes = replaceAt(strokes, index, deepFreeze({ ...strokes[index], endReason: "direct" }));
    }
    return freezeState({
      ...state,
      phase: "complete",
      resumePhase: null,
      strokes,
      active: null,
      completionReason: "direct",
      lastNotice: null,
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function pauseExperience(state) {
    if (!RESUME_PHASES.includes(state.phase)) return state;
    let strokes = state.strokes;
    let resumePhase = state.phase;
    if (state.active && state.active.mode === "write") {
      const index = strokes.length - 1;
      strokes = replaceAt(strokes, index, deepFreeze({ ...strokes[index], endReason: "pause" }));
      resumePhase = summarizeStrokes(strokes).gateReady ? "ready" : "writing";
    }
    return freezeState({
      ...state,
      phase: "paused",
      resumePhase,
      strokes,
      active: null,
      lastNotice: "paused",
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function resumeExperience(state) {
    if (state.phase !== "paused") return state;
    return freezeState({
      ...state,
      phase: state.resumePhase,
      resumePhase: null,
      lastNotice: "resumed",
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function getFogWindowView(state, rawConfig) {
    assertState(state);
    const config = sanitizeFogWindowConfig(rawConfig);
    const summary = summarizeStrokes(state.strokes);
    const gate = gateView(summary);
    const drawingShape = drawingShapeFor(state, summary);
    const requiredCount = requiredHitCount(state.anchors.length);
    const strategyView = deepFreeze({
      strokeCount: state.strokes.length,
      drawingShape,
      completionReason: state.completionReason,
      hitCount: state.hitAnchorIds.length,
      anchorCount: state.anchors.length,
      defaultMessage: config.defaultMessage,
    });
    const completionMessage = state.phase === "complete"
      ? config.composeFogWindowLetter(strategyView)
      : config.defaultMessage;
    return deepFreeze({
      phase: state.phase,
      resumePhase: state.resumePhase,
      canStart: state.phase === "intro",
      canDraw: (state.phase === "writing" || state.phase === "ready") && state.active === null
        && state.strokes.length < MAX_STROKES && summary.pointCount < MAX_TOTAL_POINTS,
      canConfirm: state.phase === "ready" && state.active === null,
      canTrace: state.phase === "tracing",
      canClear: (state.phase === "writing" || state.phase === "ready")
        && state.active === null && state.strokes.length > 0,
      canDirectReveal: state.phase !== "complete",
      canResume: state.phase === "paused",
      canRestart: state.phase === "complete",
      nextGeneration: state.lastGeneration + 1,
      drawing: {
        strokeCount: state.strokes.length,
        pointCount: summary.pointCount,
        length: state.drawLength,
        bounds: cloneBounds(state.bounds),
        shape: drawingShape,
        gate,
        strokes: cloneStrokes(state.strokes),
      },
      tracing: {
        anchorCount: state.anchors.length,
        hitCount: state.hitAnchorIds.length,
        requiredCount,
        ratioPermille: state.anchors.length === 0
          ? 0 : Math.floor((state.hitAnchorIds.length * 1000) / state.anchors.length),
        traceStrokeCount: state.traceStrokeCount,
        anchors: state.anchors.map((anchor) => ({ ...anchor })),
        hitAnchorIds: [...state.hitAnchorIds],
      },
      active: state.active ? {
        mode: state.active.mode,
        pointerId: state.active.pointerId,
        generation: state.active.generation,
      } : null,
      notice: state.lastNotice,
      text: {
        title: config.title,
        subtitle: config.subtitle,
        instruction: instructionFor(state, config),
        status: statusFor(state, summary),
        completionTitle: config.completionTitle,
        completionMessage,
        signature: config.signature,
      },
    });
  }

  function sanitizeFogWindowConfig(rawConfig) {
    const source = rawConfig && (typeof rawConfig === "object" || typeof rawConfig === "function")
      ? rawConfig : {};
    const safe = {};
    for (const [key, limit, fallback] of CONFIG_FIELDS) {
      safe[key] = cleanText(readProperty(source, key), limit, fallback);
    }
    const candidate = readProperty(source, "composeFogWindowLetter");
    const strategy = typeof candidate === "function" ? candidate : defaultComposeFogWindowLetter;
    safe.composeFogWindowLetter = makeSafeComposer(strategy, safe.defaultMessage);
    return deepFreeze(safe);
  }

  function makeSafeComposer(strategy, fallback) {
    return function safeComposeFogWindowLetter(view) {
      try {
        const result = strategy(view);
        if (typeof result !== "string") return fallback;
        const trimmed = result.trim();
        if (!trimmed || [...trimmed].length > 240) return fallback;
        return trimmed;
      } catch {
        return fallback;
      }
    };
  }

  function approximateDistance(first, second) {
    assertExactPoint(first, "first point");
    assertExactPoint(second, "second point");
    const dx = Math.abs(second.x - first.x);
    const dy = Math.abs(second.y - first.y);
    return Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2);
  }

  function generateFogWindowAnchors(strokes) {
    validateStrokes(strokes);
    return generateAnchorsInternal(strokes);
  }

  function generateAnchorsInternal(strokes) {
    const candidates = [];
    let order = 0;
    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const points = strokes[strokeIndex].points;
      const perStroke = [];
      const first = points[0];
      perStroke.push({ strokeIndex, x: first.x, y: first.y, order: order += 1 });
      let cumulative = 0;
      let target = ANCHOR_SPACING;
      for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
        const start = points[pointIndex - 1];
        const end = points[pointIndex];
        const segmentLength = approximateDistanceUnchecked(start, end);
        while (target <= cumulative + segmentLength) {
          const numerator = target - cumulative;
          perStroke.push({
            strokeIndex,
            x: interpolateInteger(start.x, end.x, numerator, segmentLength),
            y: interpolateInteger(start.y, end.y, numerator, segmentLength),
            order: order += 1,
          });
          target += ANCHOR_SPACING;
        }
        cumulative += segmentLength;
      }
      const last = points[points.length - 1];
      perStroke.push({ strokeIndex, x: last.x, y: last.y, order: order += 1 });
      const deduped = perStroke.filter((candidate, index) => index === 0
        || candidate.x !== perStroke[index - 1].x || candidate.y !== perStroke[index - 1].y);
      deduped[0].mandatory = true;
      deduped[deduped.length - 1].mandatory = true;
      candidates.push(...deduped);
    }
    let selected = candidates;
    if (candidates.length > MAX_ANCHORS) {
      const mandatory = candidates.filter((candidate) => candidate.mandatory);
      const remaining = candidates.filter((candidate) => !candidate.mandatory);
      const slots = MAX_ANCHORS - mandatory.length;
      const sampled = selectEvenlySpacedIndices(remaining.length, slots).map((index) => remaining[index]);
      const keep = new Set(mandatory.concat(sampled));
      selected = candidates.filter((candidate) => keep.has(candidate));
    }
    const sequenceByStroke = new Map();
    return deepFreeze(selected.map((candidate) => {
      const sequenceIndex = sequenceByStroke.get(candidate.strokeIndex) || 0;
      sequenceByStroke.set(candidate.strokeIndex, sequenceIndex + 1);
      return {
        id: `${candidate.strokeIndex}:${sequenceIndex}`,
        strokeIndex: candidate.strokeIndex,
        sequenceIndex,
        x: candidate.x,
        y: candidate.y,
      };
    }));
  }

  function pointHitsTraceSegment(point, start, end) {
    assertExactPoint(point, "point");
    assertExactPoint(start, "segment start");
    assertExactPoint(end, "segment end");
    return pointHitsSegmentNumbers(point.x, point.y, start.x, start.y, end.x, end.y);
  }

  function selectEvenlySpacedIndices(count, slots) {
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(slots)
      || slots < 0 || slots > count) throw new TypeError("invalid stable sampling size");
    if (slots === 0) return deepFreeze([]);
    if (slots === 1) return deepFreeze([Math.floor((count - 1) / 2)]);
    return deepFreeze(Array.from({ length: slots }, (_, index) =>
      Math.floor((index * (count - 1)) / (slots - 1))));
  }

  function pointHitsSegmentNumbers(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const vv = vx * vx + vy * vy;
    const projection = wx * vx + wy * vy;
    const radiusSquared = TRACE_RADIUS * TRACE_RADIUS;
    if (vv === 0 || projection <= 0) return wx * wx + wy * wy <= radiusSquared;
    if (projection >= vv) {
      const dx = px - bx;
      const dy = py - by;
      return dx * dx + dy * dy <= radiusSquared;
    }
    const cross = vx * wy - vy * wx;
    return cross * cross <= radiusSquared * vv;
  }

  function replayFogWindow(actions) {
    if (!Array.isArray(actions)) throw new TypeError("actions must be an array");
    return actions.reduce((state, action) => reduceFogWindow(state, action), createFogWindowState());
  }

  function assertState(state) {
    if (!isPlainObject(state) || !hasExactKeys(state, STATE_KEYS)) throw new TypeError("invalid fog-window state shape");
    if (state.version !== 1 || !PHASES.includes(state.phase)
      || (state.resumePhase !== null && !RESUME_PHASES.includes(state.resumePhase))
      || !Number.isSafeInteger(state.nextStrokeId) || state.nextStrokeId < 0
      || !Number.isSafeInteger(state.lastGeneration) || state.lastGeneration < 0
      || !Number.isSafeInteger(state.drawLength) || state.drawLength < 0
      || !Number.isSafeInteger(state.traceStrokeCount) || state.traceStrokeCount < 0
      || (state.completionReason !== null && state.completionReason !== "traced" && state.completionReason !== "direct")
      || !Number.isSafeInteger(state.announcementSerial) || state.announcementSerial < 0
      || (state.lastNotice !== null && !NOTICE_VALUES.includes(state.lastNotice))) {
      throw new TypeError("invalid fog-window state scalar");
    }
    const strokeSummary = validateStrokes(state.strokes);
    if (state.nextStrokeId !== (state.strokes.length === 0 ? 0 : state.strokes[state.strokes.length - 1].id + 1)
      || state.lastGeneration < state.strokes.length + state.traceStrokeCount
      || state.drawLength !== strokeSummary.drawLength || !boundsEqual(state.bounds, strokeSummary.bounds)) {
      throw new TypeError("invalid fog-window derived drawing state");
    }
    validateInternalEndReasons(state, strokeSummary);
    validateActive(state.active);
    validateAnchors(state.anchors);
    validateHitIds(state.anchors, state.hitAnchorIds);
    validateOpenStrokeInvariant(state);
    validatePhaseMatrix(state, strokeSummary);
  }

  function validateStrokes(strokes) {
    if (!Array.isArray(strokes) || strokes.length > MAX_STROKES) throw new TypeError("invalid strokes");
    let totalPoints = 0;
    let drawLength = 0;
    let bounds = null;
    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const stroke = strokes[strokeIndex];
      if (!isPlainObject(stroke) || !hasExactKeys(stroke, ["id", "points", "endReason"])
        || stroke.id !== strokeIndex || !Array.isArray(stroke.points)
        || stroke.points.length < 1 || stroke.points.length > MAX_POINTS_PER_STROKE
        || (stroke.endReason !== null && !END_REASONS.includes(stroke.endReason))) {
        throw new TypeError("invalid stroke");
      }
      totalPoints += stroke.points.length;
      if (totalPoints > MAX_TOTAL_POINTS) throw new TypeError("too many points");
      for (let pointIndex = 0; pointIndex < stroke.points.length; pointIndex += 1) {
        const point = stroke.points[pointIndex];
        assertExactPoint(point, "stroke point");
        bounds = extendBounds(bounds, point);
        if (pointIndex > 0) {
          const distance = approximateDistanceUnchecked(stroke.points[pointIndex - 1], point);
          if (distance < MIN_POINT_GAP) throw new TypeError("accepted stroke points are too close");
          drawLength += distance;
        }
      }
    }
    return {
      pointCount: totalPoints,
      drawLength,
      bounds,
      gateReady: gateReady(totalPoints, drawLength, bounds),
    };
  }

  function validateActive(active) {
    if (active === null) return;
    if (!isPlainObject(active) || !hasExactKeys(active,
      ["mode", "pointerId", "generation", "strokeId", "lastPoint"])
      || (active.mode !== "write" && active.mode !== "trace")
      || !Number.isSafeInteger(active.pointerId) || active.pointerId < 0
      || !Number.isSafeInteger(active.generation) || active.generation < 1
      || (active.mode === "write" && (!Number.isSafeInteger(active.strokeId) || active.strokeId < 0))
      || (active.mode === "trace" && active.strokeId !== null)) {
      throw new TypeError("invalid active pointer");
    }
    assertExactPoint(active.lastPoint, "active lastPoint");
  }

  function validateAnchors(anchors) {
    if (!Array.isArray(anchors) || anchors.length > MAX_ANCHORS) throw new TypeError("invalid anchors");
    const ids = new Set();
    for (const anchor of anchors) {
      if (!isPlainObject(anchor) || !hasExactKeys(anchor, ["id", "strokeIndex", "sequenceIndex", "x", "y"])
        || typeof anchor.id !== "string" || ids.has(anchor.id)
        || !Number.isSafeInteger(anchor.strokeIndex) || anchor.strokeIndex < 0
        || !Number.isSafeInteger(anchor.sequenceIndex) || anchor.sequenceIndex < 0
        || anchor.id !== `${anchor.strokeIndex}:${anchor.sequenceIndex}`) {
        throw new TypeError("invalid anchor");
      }
      assertCoordinates(anchor.x, anchor.y, "anchor");
      ids.add(anchor.id);
    }
  }

  function validateHitIds(anchors, hitAnchorIds) {
    if (!Array.isArray(hitAnchorIds)) throw new TypeError("invalid hit IDs");
    const order = new Map(anchors.map((anchor, index) => [anchor.id, index]));
    let previous = -1;
    const seen = new Set();
    for (const id of hitAnchorIds) {
      const index = order.get(id);
      if (typeof id !== "string" || index === undefined || seen.has(id) || index <= previous) {
        throw new TypeError("invalid ordered hit IDs");
      }
      seen.add(id);
      previous = index;
    }
  }

  function validateOpenStrokeInvariant(state) {
    const open = state.strokes.filter((stroke) => stroke.endReason === null);
    if (state.active && state.active.mode === "write") {
      const last = state.strokes[state.strokes.length - 1];
      const lastPoint = last && last.points[last.points.length - 1];
      if (open.length !== 1 || last !== open[0] || last.id !== state.active.strokeId
        || !pointsEqual(lastPoint, state.active.lastPoint) || state.active.generation !== state.lastGeneration) {
        throw new TypeError("invalid active write invariant");
      }
      return;
    }
    if (open.length !== 0) throw new TypeError("open stroke without active writer");
    if (state.active && state.active.generation !== state.lastGeneration) {
      throw new TypeError("active generation is not current");
    }
  }

  function validateInternalEndReasons(state, summary) {
    for (let index = 0; index < state.strokes.length; index += 1) {
      const stroke = state.strokes[index];
      const isLast = index === state.strokes.length - 1;
      if (stroke.endReason === "direct"
        && !(state.phase === "complete" && state.completionReason === "direct" && isLast)) {
        throw new TypeError("invalid internal direct end reason");
      }
      if (stroke.endReason === "limit"
        && stroke.points.length !== MAX_POINTS_PER_STROKE
        && !(isLast && summary.pointCount === MAX_TOTAL_POINTS)) {
        throw new TypeError("invalid internal limit end reason");
      }
      if (stroke.points.length === MAX_POINTS_PER_STROKE && stroke.endReason !== "limit") {
        throw new TypeError("full stroke must end by limit");
      }
    }
    if (summary.pointCount === MAX_TOTAL_POINTS
      && state.strokes[state.strokes.length - 1].endReason !== "limit") {
      throw new TypeError("full drawing must end by limit");
    }
  }

  function validatePhaseMatrix(state, summary) {
    const noCompletion = state.completionReason === null;
    const noResume = state.resumePhase === null;
    const noTraceData = state.anchors.length === 0 && state.hitAnchorIds.length === 0 && state.traceStrokeCount === 0;
    const expectedAnchors = () => generateAnchorsInternal(state.strokes);
    const anchorsMatch = () => deepEqualData(state.anchors, expectedAnchors());
    if (state.phase === "intro") {
      if (state.strokes.length !== 0 || state.active !== null || !noTraceData || state.nextStrokeId !== 0
        || state.lastGeneration !== 0 || !noResume || !noCompletion || state.drawLength !== 0
        || state.bounds !== null || state.announcementSerial !== 0 || state.lastNotice !== null) {
        throw new TypeError("invalid intro state");
      }
      return;
    }
    if (state.phase === "writing") {
      if (!noResume || !noCompletion || !noTraceData
        || (state.active !== null && state.active.mode !== "write")
        || (state.active === null && summary.gateReady)) throw new TypeError("invalid writing state");
      return;
    }
    if (state.phase === "ready") {
      if (!noResume || !noCompletion || state.active !== null || !noTraceData || !summary.gateReady) {
        throw new TypeError("invalid ready state");
      }
      return;
    }
    if (state.phase === "tracing") {
      if (!noResume || !noCompletion || !summary.gateReady || !anchorsMatch()
        || state.hitAnchorIds.length >= requiredHitCount(state.anchors.length)
        || (state.active !== null && state.active.mode !== "trace")) throw new TypeError("invalid tracing state");
      return;
    }
    if (state.phase === "paused") {
      if (state.active !== null || state.resumePhase === null || !noCompletion) throw new TypeError("invalid paused state");
      if (state.resumePhase === "writing" && (!noTraceData || summary.gateReady)) throw new TypeError("invalid paused writing state");
      if (state.resumePhase === "ready" && (!noTraceData || !summary.gateReady)) throw new TypeError("invalid paused ready state");
      if (state.resumePhase === "tracing" && (!summary.gateReady || !anchorsMatch()
        || state.hitAnchorIds.length >= requiredHitCount(state.anchors.length))) {
        throw new TypeError("invalid paused tracing state");
      }
      return;
    }
    if (!noResume || state.active !== null || state.completionReason === null) throw new TypeError("invalid complete state");
    if (state.completionReason === "traced") {
      if (!summary.gateReady || !anchorsMatch()
        || state.hitAnchorIds.length < requiredHitCount(state.anchors.length)) {
        throw new TypeError("invalid traced completion");
      }
      return;
    }
    if (state.anchors.length === 0) {
      if (state.hitAnchorIds.length !== 0 || state.traceStrokeCount !== 0) throw new TypeError("invalid direct trace data");
    } else if (!summary.gateReady || !anchorsMatch()
      || state.hitAnchorIds.length >= requiredHitCount(state.anchors.length)) {
      throw new TypeError("invalid direct anchors");
    }
  }

  function assertAction(action) {
    if (!isPlainObject(action) || typeof action.type !== "string") throw new TypeError("action must have a type");
    const simple = ["START", "CLEAR_DRAWING", "CONFIRM_DRAWING", "DIRECT_REVEAL", "RESUME", "RESTART"];
    if (simple.includes(action.type)) {
      if (!hasExactKeys(action, ["type"])) throw new TypeError(`invalid ${action.type} action`);
      return;
    }
    if (action.type === "BEGIN_STROKE" || action.type === "ADD_STROKE_POINT"
      || action.type === "BEGIN_TRACE" || action.type === "ADD_TRACE_POINT") {
      if (!hasExactKeys(action, ["type", "pointerId", "generation", "x", "y"])) {
        throw new TypeError(`invalid ${action.type} action`);
      }
      assertPointerSession(action.pointerId, action.generation);
      assertCoordinates(action.x, action.y, "action point");
      return;
    }
    if (action.type === "END_STROKE" || action.type === "END_TRACE") {
      if (!hasExactKeys(action, ["type", "pointerId", "generation", "reason"])
        || !PUBLIC_END_REASONS.includes(action.reason)) throw new TypeError(`invalid ${action.type} action`);
      assertPointerSession(action.pointerId, action.generation);
      return;
    }
    if (action.type === "PAUSE") {
      if (!hasExactKeys(action, ["type", "reason"]) || !PAUSE_REASONS.includes(action.reason)) {
        throw new TypeError("invalid PAUSE action");
      }
      return;
    }
    throw new TypeError(`unknown action type: ${action.type}`);
  }

  function summarizeStrokes(strokes) {
    let pointCount = 0;
    let drawLength = 0;
    let bounds = null;
    for (const stroke of strokes) {
      pointCount += stroke.points.length;
      for (let index = 0; index < stroke.points.length; index += 1) {
        const point = stroke.points[index];
        bounds = extendBounds(bounds, point);
        if (index > 0) drawLength += approximateDistanceUnchecked(stroke.points[index - 1], point);
      }
    }
    return { pointCount, drawLength, bounds, gateReady: gateReady(pointCount, drawLength, bounds) };
  }

  function gateReady(pointCount, drawLength, bounds) {
    return pointCount >= MIN_POINT_COUNT && drawLength >= MIN_DRAW_LENGTH && bounds !== null
      && bounds.width >= MIN_BOUNDS_WIDTH && bounds.height >= MIN_BOUNDS_HEIGHT;
  }

  function gateView(summary) {
    return deepFreeze({
      points: summary.pointCount >= MIN_POINT_COUNT,
      length: summary.drawLength >= MIN_DRAW_LENGTH,
      width: summary.bounds !== null && summary.bounds.width >= MIN_BOUNDS_WIDTH,
      height: summary.bounds !== null && summary.bounds.height >= MIN_BOUNDS_HEIGHT,
      ready: summary.gateReady,
    });
  }

  function drawingShapeFor(state, summary) {
    if (state.completionReason === "direct" && !summary.gateReady) return "none";
    if (!summary.bounds) return "none";
    if (summary.bounds.width * 4 >= summary.bounds.height * 5) return "wide";
    if (summary.bounds.height * 4 >= summary.bounds.width * 5) return "tall";
    return "balanced";
  }

  function instructionFor(state, config) {
    if (state.phase === "intro") return config.intro;
    if (state.phase === "tracing" || state.resumePhase === "tracing") return config.tracingInstruction;
    if (state.phase === "paused") return "先停在这里，准备好后再继续。";
    if (state.phase === "complete") return "窗外已经亮了。";
    return config.subtitle;
  }

  function statusFor(state, summary) {
    if (state.phase === "complete") return "窗外亮了。";
    if (state.phase === "paused") return "这一刻已经安全停住。";
    if (state.phase === "tracing") return `已经重新走过 ${state.hitAnchorIds.length} / ${state.anchors.length} 个露珠点。`;
    if (state.lastNotice === "cancel") return "这一笔停在这里，已经写下的部分还在。";
    if (state.lastNotice === "limit") return "雾已经记满了这些笔迹，可以沿它再走一遍。";
    if (state.phase === "ready") return "雾已经记住了，可以沿它再走一遍。";
    if (summary.pointCount < MIN_POINT_COUNT) return "再多写几笔，让雾记住你的手势。";
    if (summary.drawLength < MIN_DRAW_LENGTH) return "让这一笔再走远一点。";
    if (!summary.bounds || summary.bounds.width < MIN_BOUNDS_WIDTH) return "也向左或向右写一点。";
    if (summary.bounds.height < MIN_BOUNDS_HEIGHT) return "也向上或向下写一点。";
    return "雾正在记住你的手势。";
  }

  function mergeHitIds(anchors, currentIds, predicate) {
    const hits = new Set(currentIds);
    for (const anchor of anchors) if (predicate(anchor)) hits.add(anchor.id);
    return deepFreeze(anchors.filter((anchor) => hits.has(anchor.id)).map((anchor) => anchor.id));
  }

  function requiredHitCount(anchorCount) {
    return Math.ceil((anchorCount * TRACE_REQUIRED_NUMERATOR) / TRACE_REQUIRED_DENOMINATOR);
  }

  function interpolateInteger(first, second, numerator, denominator) {
    return first + roundHalfAwayFromZero((second - first) * numerator, denominator);
  }

  function roundHalfAwayFromZero(numerator, denominator) {
    const sign = numerator < 0 ? -1 : 1;
    const absolute = Math.abs(numerator);
    let quotient = Math.floor(absolute / denominator);
    if ((absolute % denominator) * 2 >= denominator) quotient += 1;
    return sign * quotient;
  }

  function approximateDistanceUnchecked(first, second) {
    const dx = Math.abs(second.x - first.x);
    const dy = Math.abs(second.y - first.y);
    return Math.max(dx, dy) + Math.floor(Math.min(dx, dy) / 2);
  }

  function squaredDistance(first, second) {
    const dx = first.x - second.x;
    const dy = first.y - second.y;
    return dx * dx + dy * dy;
  }

  function activeMatches(state, action, mode) {
    return state.active !== null && state.active.mode === mode
      && state.active.pointerId === action.pointerId && state.active.generation === action.generation;
  }

  function countPoints(strokes) {
    return strokes.reduce((total, stroke) => total + stroke.points.length, 0);
  }

  function replaceAt(array, index, value) {
    const copy = array.slice();
    copy[index] = value;
    return copy;
  }

  function extendBounds(bounds, point) {
    if (bounds === null) {
      return deepFreeze({ minX: point.x, minY: point.y, maxX: point.x, maxY: point.y, width: 0, height: 0 });
    }
    const minX = Math.min(bounds.minX, point.x);
    const minY = Math.min(bounds.minY, point.y);
    const maxX = Math.max(bounds.maxX, point.x);
    const maxY = Math.max(bounds.maxY, point.y);
    return deepFreeze({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
  }

  function cloneBounds(bounds) {
    return bounds === null ? null : { ...bounds };
  }

  function cloneStrokes(strokes) {
    return strokes.map((stroke) => ({
      id: stroke.id,
      points: stroke.points.map((point) => ({ ...point })),
      endReason: stroke.endReason,
    }));
  }

  function boundsEqual(first, second) {
    if (first === null || second === null) return first === second;
    if (!isPlainObject(first) || !hasExactKeys(first, ["minX", "minY", "maxX", "maxY", "width", "height"])) return false;
    return first.minX === second.minX && first.minY === second.minY && first.maxX === second.maxX
      && first.maxY === second.maxY && first.width === second.width && first.height === second.height;
  }

  function deepEqualData(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
  }

  function pointsEqual(first, second) {
    return first && second && first.x === second.x && first.y === second.y;
  }

  function freezePoint(x, y) {
    return deepFreeze({ x, y });
  }

  function assertExactPoint(point, label) {
    if (!isPlainObject(point) || !hasExactKeys(point, ["x", "y"])) throw new TypeError(`${label} must be an exact point`);
    assertCoordinates(point.x, point.y, label);
  }

  function assertCoordinates(x, y, label) {
    if (!Number.isSafeInteger(x) || x < 0 || x > WINDOW_WIDTH
      || !Number.isSafeInteger(y) || y < 0 || y > WINDOW_HEIGHT) {
      throw new TypeError(`${label} is outside the integer window`);
    }
  }

  function assertPointerSession(pointerId, generation) {
    if (!Number.isSafeInteger(pointerId) || pointerId < 0
      || !Number.isSafeInteger(generation) || generation < 1) {
      throw new TypeError("invalid pointer session");
    }
  }

  function cleanText(value, limit, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const truncated = [...trimmed].slice(0, limit).join("");
    return truncated || fallback;
  }

  function readProperty(source, key) {
    try {
      return source[key];
    } catch {
      return undefined;
    }
  }

  function hasExactKeys(value, expected) {
    const keys = Object.keys(value);
    return keys.length === expected.length && expected.every((key) => keys.includes(key));
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    if (Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  return deepFreeze({
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    MIN_POINT_GAP,
    MIN_POINT_COUNT,
    MIN_DRAW_LENGTH,
    MIN_BOUNDS_WIDTH,
    MIN_BOUNDS_HEIGHT,
    MAX_STROKES,
    MAX_POINTS_PER_STROKE,
    MAX_TOTAL_POINTS,
    ANCHOR_SPACING,
    MAX_ANCHORS,
    TRACE_RADIUS,
    TRACE_REQUIRED_NUMERATOR,
    TRACE_REQUIRED_DENOMINATOR,
    MAX_FRAME_GAP_MS,
    DEFAULT_CONFIG,
    createFogWindowState,
    reduceFogWindow,
    getFogWindowView,
    sanitizeFogWindowConfig,
    approximateDistance,
    generateFogWindowAnchors,
    selectEvenlySpacedIndices,
    pointHitsTraceSegment,
    replayFogWindow,
    assertState,
  });
});
