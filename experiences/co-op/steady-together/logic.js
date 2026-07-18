(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.STEADY_TOGETHER_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TICK_MS = 20;
  const MAX_FRAME_GAP_MS = 500;
  const LIFT_MIN = 0;
  const LIFT_MAX = 1000;
  const LIFT_RISE_PER_TICK = 48;
  const LIFT_FALL_PER_TICK = 32;
  const TILT_MIN = -300;
  const TILT_MAX = 300;
  const TILT_STEP_PER_TICK = 8;
  const BALL_POSITION_MIN = -6000;
  const BALL_POSITION_MAX = 6000;
  const BALL_VELOCITY_MIN = -72;
  const BALL_VELOCITY_MAX = 72;
  const SUPPORT_SUM_MIN = 1240;
  const TARGET_POSITION_ABS_MAX = 500;
  const TARGET_VELOCITY_ABS_MAX = 18;
  const SAFE_TILT_ABS_MAX = 48;
  const STABLE_WARMUP_TICKS = 12;
  const ROUTE_END = 2400;
  const ROUTE_PROGRESS_PER_TICK = 3;
  const FINAL_HOLD_TICKS = 30;
  const SIDES = Object.freeze(["left", "right"]);
  const PHASES = Object.freeze(["intro", "playing", "release-gate", "ready", "paused", "complete"]);
  const PAUSABLE_PHASES = Object.freeze(["playing", "release-gate", "ready"]);
  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "stalled"]);
  const FEEDBACK_VALUES = Object.freeze([
    "support-needed",
    "center-needed",
    "settle-needed",
    "checkpoint",
    "fell",
    "final-hold",
  ]);
  const CONFIG_LIMITS = Object.freeze({
    leftName: 12,
    rightName: 12,
    intro: 72,
    finalTitle: 28,
    finalMessage: 108,
    signature: 24,
  });

  const CHECKPOINTS = Object.freeze([0, 800, 1600]);
  const COURSE_SEGMENTS = deepFreeze([
    { id: "lean-left", start: 0, end: 799, bias: 84 },
    { id: "lean-right", start: 800, end: 1599, bias: -84 },
    { id: "come-home", start: 1600, end: 2400, bias: 0 },
  ]);
  const DEFAULT_CONFIG = deepFreeze({
    leftName: "左边的你",
    rightName: "右边的你",
    intro: "托住两端，把滚珠稳在中央，我们才会一起向前。",
    finalTitle: "稳稳地，和你一起向前",
    finalMessage: "不是从来不摇晃，是每次偏离时，我们都愿意把彼此接回来。",
    signature: "留给并肩走的我们",
  });

  function sanitizeSteadyConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    return deepFreeze({
      leftName: cleanText(readProperty(source, "leftName"), 12, DEFAULT_CONFIG.leftName),
      rightName: cleanText(readProperty(source, "rightName"), 12, DEFAULT_CONFIG.rightName),
      intro: cleanText(readProperty(source, "intro"), 72, DEFAULT_CONFIG.intro),
      finalTitle: cleanText(readProperty(source, "finalTitle"), 28, DEFAULT_CONFIG.finalTitle),
      finalMessage: cleanText(readProperty(source, "finalMessage"), 108, DEFAULT_CONFIG.finalMessage),
      signature: cleanText(readProperty(source, "signature"), 24, DEFAULT_CONFIG.signature),
    });
  }

  function validateCourseSegments(segments) {
    if (!Array.isArray(segments) || segments.length !== COURSE_SEGMENTS.length) return false;
    return segments.every((segment, index) => {
      if (!isPlainObject(segment) || Object.keys(segment).length !== 4) return false;
      const expected = COURSE_SEGMENTS[index];
      return segment.id === expected.id
        && segment.start === expected.start
        && segment.end === expected.end
        && segment.bias === expected.bias;
    });
  }

  function getCourseSegment(routeProgress) {
    if (!Number.isInteger(routeProgress) || routeProgress < 0 || routeProgress > ROUTE_END) return null;
    const segment = COURSE_SEGMENTS.find((item) => routeProgress >= item.start && routeProgress <= item.end);
    return segment ? deepFreeze({ ...segment }) : null;
  }

  function createSteadyState(rawConfig) {
    return createIntroState(sanitizeSteadyConfig(rawConfig), 0);
  }

  function reduceSteady(state, action) {
    if (!isSteadyState(state) || !isPlainObject(action) || typeof action.type !== "string") return state;
    if (action.type === "START") return startSteady(state);
    if (action.type === "RETRY") return retrySteady(state);
    if (action.type === "PRESS") return pressSteady(state, action);
    if (action.type === "RELEASE") return releaseSteady(state, action.inputId);
    if (action.type === "TICK") return tickSteady(state, action.ticks);
    if (action.type === "INTERRUPT") return interruptSteady(state, action.reason);
    if (action.type === "RESUME") return resumeSteady(state);
    if (action.type === "RESTART") return createIntroState(sanitizeSteadyConfig(state.config), state.revision + 1);
    return state;
  }

  function getSteadyView(state) {
    if (!isSteadyState(state)) return null;
    const segment = getCourseSegment(state.routeProgress) || COURSE_SEGMENTS[0];
    const supported = state.leftLift + state.rightLift >= SUPPORT_SUM_MIN;
    const centered = Math.abs(state.ballPosition) <= TARGET_POSITION_ABS_MAX;
    const settled = Math.abs(state.ballVelocity) <= TARGET_VELOCITY_ABS_MAX;
    const level = Math.abs(state.tilt) <= SAFE_TILT_ABS_MAX;
    const segmentText = segmentLabels(segment.id);
    return {
      phase: state.phase,
      title: "稳稳地，和你一起向前",
      intro: state.config.intro,
      names: { left: state.config.leftName, right: state.config.rightName },
      seats: {
        left: seatView("left", state),
        right: seatView("right", state),
      },
      beam: {
        tilt: finiteOr(state.tilt, 0),
        normalizedTilt: clamp(finiteOr(state.tilt, 0) / TILT_MAX, -1, 1),
        directionLabel: directionLabel(state.tilt, "横梁左端较高", "横梁右端较高", "横梁接近水平"),
      },
      ball: {
        position: finiteOr(state.ballPosition, 0),
        normalizedPosition: clamp(finiteOr(state.ballPosition, 0) / BALL_POSITION_MAX, -1, 1),
        velocity: finiteOr(state.ballVelocity, 0),
        zoneLabel: ballZoneLabel(state.ballPosition),
      },
      journey: {
        progress: state.routeProgress,
        progressPercent: clamp((state.routeProgress / ROUTE_END) * 100, 0, 100),
        segmentId: segment.id,
        segmentTitle: segmentText.title,
        slopeLabel: segmentText.slope,
        checkpoint: state.checkpoint,
        reachedCheckpoints: [...state.reachedCheckpoints],
      },
      stability: {
        supported,
        centered,
        settled,
        level,
        warmupTicks: Math.min(state.stableTicks, STABLE_WARMUP_TICKS),
        finalHoldTicks: state.finalHoldTicks,
        finalHoldTotal: FINAL_HOLD_TICKS,
      },
      instruction: instructionFor(state),
      feedback: state.feedback,
      statusText: statusTextFor(state, supported, centered, settled, level),
      finalTitle: state.config.finalTitle,
      finalMessage: state.config.finalMessage,
      signature: state.config.signature,
      canStart: state.phase === "intro",
      canRetry: state.phase === "ready",
      canPause: PAUSABLE_PHASES.includes(state.phase),
      canResume: state.phase === "paused",
      canRestart: true,
    };
  }

  function classifySteadyKey(code, edge, repeat) {
    if ((code !== "KeyA" && code !== "KeyL") || (edge !== "down" && edge !== "up")) return null;
    if (edge === "up") return { type: "RELEASE", inputId: `key:${code}` };
    if (repeat === true) return null;
    return {
      type: "PRESS",
      side: code === "KeyA" ? "left" : "right",
      inputId: `key:${code}`,
    };
  }

  function replaySteady(rawConfig, actions) {
    let state = createSteadyState(rawConfig);
    if (!Array.isArray(actions)) return state;
    for (const action of actions) state = reduceSteady(state, action);
    return state;
  }

  function startSteady(state) {
    if (state.phase !== "intro") return state;
    return freezeState({
      ...state,
      phase: "playing",
      revision: state.revision + 1,
    });
  }

  function retrySteady(state) {
    if (state.phase !== "ready" || (state.readyKind !== "retry" && state.readyKind !== "resume")) return state;
    if (!Number.isSafeInteger(state.attemptCount + 1)) return state;
    return freezeState({
      ...state,
      phase: "playing",
      readyKind: null,
      feedback: null,
      attemptCount: state.attemptCount + 1,
      revision: state.revision + 1,
    });
  }

  function pressSteady(state, action) {
    if (state.phase !== "playing" || !SIDES.includes(action.side) || !isInputId(action.inputId)) return state;
    if (state.active[action.side] || findInputSide(state.active, action.inputId)) return state;
    return freezeState({
      ...state,
      active: {
        ...state.active,
        [action.side]: { inputId: action.inputId, pressedAtTick: state.tick },
      },
      revision: state.revision + 1,
    });
  }

  function releaseSteady(state, inputId) {
    if (!isInputId(inputId)) return state;
    const side = findInputSide(state.active, inputId);
    if (!side) return state;
    const active = { ...state.active, [side]: null };
    if (state.phase === "playing") {
      return freezeState({ ...state, active, revision: state.revision + 1 });
    }
    if (state.phase === "release-gate") {
      if (hasActive(active)) return freezeState({ ...state, active, revision: state.revision + 1 });
      return freezeState({
        ...state,
        phase: "ready",
        readyKind: "retry",
        active,
        revision: state.revision + 1,
      });
    }
    return state;
  }

  function tickSteady(state, ticks) {
    if (state.phase !== "playing" || !isPositiveSafeInteger(ticks)) return state;
    if (!Number.isSafeInteger(state.tick + ticks)) return state;
    let next = state;
    let consumed = 0;
    while (consumed < ticks && next.phase === "playing") {
      next = advanceOneTick(next);
      consumed += 1;
    }
    return freezeState({ ...next, revision: state.revision + consumed });
  }

  function advanceOneTick(state) {
    const leftLift = moveToward(
      state.leftLift,
      state.active.left ? LIFT_MAX : LIFT_MIN,
      state.active.left ? LIFT_RISE_PER_TICK : LIFT_FALL_PER_TICK,
    );
    const rightLift = moveToward(
      state.rightLift,
      state.active.right ? LIFT_MAX : LIFT_MIN,
      state.active.right ? LIFT_RISE_PER_TICK : LIFT_FALL_PER_TICK,
    );
    const segment = getCourseSegment(state.routeProgress);
    const targetTilt = clamp(
      roundSymmetric((leftLift - rightLift) * 3, 10) + segment.bias,
      TILT_MIN,
      TILT_MAX,
    );
    const tilt = moveToward(state.tilt, targetTilt, TILT_STEP_PER_TICK);
    const ballVelocity = clamp(
      roundSymmetric(state.ballVelocity * 15 + tilt, 16),
      BALL_VELOCITY_MIN,
      BALL_VELOCITY_MAX,
    );
    const rawPosition = state.ballPosition + ballVelocity;
    if (Math.abs(rawPosition) > BALL_POSITION_MAX) {
      return fallState(state);
    }
    const ballPosition = clamp(rawPosition, BALL_POSITION_MIN, BALL_POSITION_MAX);
    const supported = leftLift + rightLift >= SUPPORT_SUM_MIN;
    const centered = Math.abs(ballPosition) <= TARGET_POSITION_ABS_MAX;
    const settled = Math.abs(ballVelocity) <= TARGET_VELOCITY_ABS_MAX;
    const level = Math.abs(tilt) <= SAFE_TILT_ABS_MAX;
    const stable = supported && centered && settled && level;
    const stableTicks = stable ? state.stableTicks + 1 : 0;
    let routeProgress = state.routeProgress;
    if (stableTicks >= STABLE_WARMUP_TICKS && routeProgress < ROUTE_END) {
      routeProgress = Math.min(ROUTE_END, routeProgress + ROUTE_PROGRESS_PER_TICK);
    }
    const checkpointResult = updateCheckpoints(
      state.routeProgress,
      routeProgress,
      state.checkpoint,
      state.reachedCheckpoints,
    );
    let finalHoldTicks = routeProgress === ROUTE_END && stable ? state.finalHoldTicks + 1 : 0;
    const complete = finalHoldTicks === FINAL_HOLD_TICKS;
    if (finalHoldTicks > FINAL_HOLD_TICKS) finalHoldTicks = FINAL_HOLD_TICKS;
    return {
      ...state,
      phase: complete ? "complete" : "playing",
      readyKind: null,
      tick: state.tick + 1,
      active: complete ? { left: null, right: null } : state.active,
      leftLift,
      rightLift,
      tilt,
      ballPosition,
      ballVelocity,
      routeProgress,
      stableTicks,
      finalHoldTicks,
      checkpoint: checkpointResult.checkpoint,
      reachedCheckpoints: checkpointResult.reachedCheckpoints,
      feedback: complete || finalHoldTicks > 0
        ? "final-hold"
        : checkpointResult.crossed
          ? "checkpoint"
          : feedbackFor(supported, centered, settled, level, stableTicks),
      pauseReason: null,
      pausedFrom: null,
    };
  }

  function fallState(state) {
    return {
      ...state,
      phase: hasActive(state.active) ? "release-gate" : "ready",
      readyKind: "retry",
      active: state.active,
      leftLift: 0,
      rightLift: 0,
      tilt: 0,
      ballPosition: 0,
      ballVelocity: 0,
      routeProgress: state.checkpoint,
      stableTicks: 0,
      finalHoldTicks: 0,
      feedback: "fell",
      pauseReason: null,
      pausedFrom: null,
    };
  }

  function interruptSteady(state, reason) {
    if (!PAUSABLE_PHASES.includes(state.phase)) return state;
    return freezeState({
      ...state,
      phase: "paused",
      readyKind: null,
      active: { left: null, right: null },
      leftLift: 0,
      rightLift: 0,
      tilt: 0,
      ballPosition: 0,
      ballVelocity: 0,
      routeProgress: state.checkpoint,
      stableTicks: 0,
      finalHoldTicks: 0,
      feedback: null,
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
      pausedFrom: state.phase,
      revision: state.revision + 1,
    });
  }

  function resumeSteady(state) {
    if (state.phase !== "paused") return state;
    return freezeState({
      ...state,
      phase: "ready",
      readyKind: "resume",
      feedback: null,
      pauseReason: null,
      pausedFrom: null,
      revision: state.revision + 1,
    });
  }

  function updateCheckpoints(previous, current, checkpoint, reachedCheckpoints) {
    let nextCheckpoint = checkpoint;
    const reached = [...reachedCheckpoints];
    let crossed = false;
    for (const value of CHECKPOINTS.slice(1)) {
      if (previous < value && current >= value && !reached.includes(value)) {
        reached.push(value);
        nextCheckpoint = value;
        crossed = true;
      }
    }
    return { checkpoint: nextCheckpoint, reachedCheckpoints: reached, crossed };
  }

  function feedbackFor(supported, centered, settled, level, stableTicks) {
    if (!supported) return "support-needed";
    if (!centered) return "center-needed";
    if (!settled || !level || stableTicks < STABLE_WARMUP_TICKS) return "settle-needed";
    return null;
  }

  function getCheckpointForProgress(routeProgress) {
    let checkpoint = 0;
    for (const value of CHECKPOINTS) if (value <= routeProgress) checkpoint = value;
    return checkpoint;
  }

  function seatView(side, state) {
    const lift = side === "left" ? state.leftLift : state.rightLift;
    const active = Boolean(state.active[side]);
    return {
      key: side === "left" ? "A" : "L",
      active,
      liftPercent: clamp((finiteOr(lift, 0) / LIFT_MAX) * 100, 0, 100),
      stateLabel: active ? "正在托住" : "已经松开",
    };
  }

  function segmentLabels(id) {
    if (id === "lean-left") return { title: "向右接住", slope: "坡势把滚珠带向右侧" };
    if (id === "lean-right") return { title: "换边接回", slope: "坡势把滚珠带向左侧" };
    return { title: "一起回正", slope: "坡势正在回正" };
  }

  function directionLabel(value, positive, negative, zero) {
    if (value > 0) return positive;
    if (value < 0) return negative;
    return zero;
  }

  function ballZoneLabel(position) {
    if (Math.abs(position) <= TARGET_POSITION_ABS_MAX) return "滚珠在中央区";
    return position > 0 ? "滚珠在中央右侧" : "滚珠在中央左侧";
  }

  function instructionFor(state) {
    if (state.phase === "intro") return state.config.intro;
    if (state.phase === "release-gate") return "先把两边都松开";
    if (state.phase === "ready") return "从最近的灯继续";
    if (state.phase === "paused") return "暂停在这里";
    if (state.phase === "complete") return "两盏灯都亮了，我们稳稳到达终点。";
    return "把滚珠接回中央，我们才会一起向前";
  }

  function statusTextFor(state, supported, centered, settled, level) {
    if (state.feedback === "fell" || state.phase === "release-gate") return "滚珠掉下来了，先把两边都松开";
    if (state.phase === "paused") return "暂停在这里，从最近的灯继续";
    if (state.phase === "complete") return "稳稳到达终点";
    if (state.routeProgress === ROUTE_END) return `终点保持 ${state.finalHoldTicks} / ${FINAL_HOLD_TICKS}`;
    if (!supported) return "两边再一起托稳一点";
    if (!centered) return "把滚珠接回中央";
    if (!settled) return "滚珠还在移动，慢慢接住它";
    if (!level) return "横梁还在倾斜，一起回正";
    if (state.stableTicks < STABLE_WARMUP_TICKS) return "正在稳住";
    return "稳稳地一起向前";
  }

  function isSteadyState(state) {
    if (!isPlainObject(state) || !PHASES.includes(state.phase)) return false;
    if (state.readyKind !== null && state.readyKind !== "retry" && state.readyKind !== "resume") return false;
    if (!Number.isSafeInteger(state.tick) || state.tick < 0) return false;
    if (!isPlainObject(state.active) || !validActive(state.active, state.tick)) return false;
    if (state.active.left && state.active.right && state.active.left.inputId === state.active.right.inputId) return false;
    if (!integerInRange(state.leftLift, LIFT_MIN, LIFT_MAX)) return false;
    if (!integerInRange(state.rightLift, LIFT_MIN, LIFT_MAX)) return false;
    if (!integerInRange(state.tilt, TILT_MIN, TILT_MAX)) return false;
    if (!integerInRange(state.ballPosition, BALL_POSITION_MIN, BALL_POSITION_MAX)) return false;
    if (!integerInRange(state.ballVelocity, BALL_VELOCITY_MIN, BALL_VELOCITY_MAX)) return false;
    if (!integerInRange(state.routeProgress, 0, ROUTE_END)) return false;
    if (!Number.isSafeInteger(state.stableTicks) || state.stableTicks < 0) return false;
    if (!Number.isInteger(state.finalHoldTicks) || state.finalHoldTicks < 0 || state.finalHoldTicks > FINAL_HOLD_TICKS) return false;
    if (!CHECKPOINTS.includes(state.checkpoint) || state.checkpoint !== getCheckpointForProgress(state.routeProgress)) return false;
    if (!validReachedCheckpoints(state.reachedCheckpoints, state.checkpoint)) return false;
    if (state.feedback !== null && !FEEDBACK_VALUES.includes(state.feedback)) return false;
    if (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason)) return false;
    if (state.pausedFrom !== null && !PAUSABLE_PHASES.includes(state.pausedFrom)) return false;
    if (!Number.isSafeInteger(state.attemptCount) || state.attemptCount < 1) return false;
    if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !isSanitizedConfig(state.config)) return false;
    return validPhaseShape(state);
  }

  function validPhaseShape(state) {
    if (state.phase === "intro") {
      return state.readyKind === null && state.tick === 0 && !hasActive(state.active)
        && resetPhysics(state, 0) && state.checkpoint === 0 && state.reachedCheckpoints.length === 0
        && state.feedback === null && state.pauseReason === null && state.pausedFrom === null
        && state.attemptCount === 1;
    }
    if (state.phase === "playing") {
      return state.readyKind === null && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "release-gate") {
      return state.readyKind === "retry" && hasActive(state.active) && resetPhysics(state, state.checkpoint)
        && state.feedback === "fell" && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "ready") {
      return (state.readyKind === "retry" || state.readyKind === "resume") && !hasActive(state.active)
        && resetPhysics(state, state.checkpoint) && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "paused") {
      return state.readyKind === null && !hasActive(state.active) && resetPhysics(state, state.checkpoint)
        && state.feedback === null && state.pauseReason !== null && state.pausedFrom !== null;
    }
    const supported = state.leftLift + state.rightLift >= SUPPORT_SUM_MIN;
    const stable = supported && Math.abs(state.ballPosition) <= TARGET_POSITION_ABS_MAX
      && Math.abs(state.ballVelocity) <= TARGET_VELOCITY_ABS_MAX && Math.abs(state.tilt) <= SAFE_TILT_ABS_MAX;
    return state.readyKind === null && !hasActive(state.active) && state.routeProgress === ROUTE_END
      && stable && state.finalHoldTicks === FINAL_HOLD_TICKS && state.feedback === "final-hold"
      && state.pauseReason === null && state.pausedFrom === null;
  }

  function resetPhysics(state, routeProgress) {
    return state.leftLift === 0 && state.rightLift === 0 && state.tilt === 0
      && state.ballPosition === 0 && state.ballVelocity === 0 && state.routeProgress === routeProgress
      && state.stableTicks === 0 && state.finalHoldTicks === 0;
  }

  function validActive(active, tick) {
    if (Object.keys(active).length !== 2) return false;
    return SIDES.every((side) => {
      const entry = active[side];
      if (entry === null) return true;
      return isPlainObject(entry) && Object.keys(entry).length === 2 && isInputId(entry.inputId)
        && Number.isSafeInteger(entry.pressedAtTick) && entry.pressedAtTick >= 0 && entry.pressedAtTick <= tick;
    });
  }

  function validReachedCheckpoints(reached, checkpoint) {
    if (!Array.isArray(reached) || reached.length > 2) return false;
    const expected = CHECKPOINTS.slice(1, reached.length + 1);
    if (!reached.every((value, index) => value === expected[index])) return false;
    return checkpoint === (reached.length ? reached[reached.length - 1] : 0);
  }

  function isSanitizedConfig(config) {
    if (!isPlainObject(config)) return false;
    const keys = Object.keys(DEFAULT_CONFIG);
    if (Object.keys(config).length !== keys.length) return false;
    return keys.every((key) => typeof config[key] === "string"
      && config[key].trim() === config[key]
      && [...config[key]].length > 0
      && [...config[key]].length <= CONFIG_LIMITS[key]);
  }

  function moveToward(value, target, step) {
    if (value < target) return Math.min(value + step, target);
    if (value > target) return Math.max(value - step, target);
    return value;
  }

  function roundSymmetric(numerator, denominator) {
    const sign = numerator < 0 ? -1 : 1;
    return sign * Math.floor((Math.abs(numerator) + denominator / 2) / denominator);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function cleanText(value, limit, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return [...trimmed].slice(0, limit).join("");
  }

  function readProperty(source, key) {
    try {
      return source[key];
    } catch {
      return undefined;
    }
  }

  function findInputSide(active, inputId) {
    if (active.left && active.left.inputId === inputId) return "left";
    if (active.right && active.right.inputId === inputId) return "right";
    return null;
  }

  function hasActive(active) {
    return Boolean(active.left || active.right);
  }

  function isInputId(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 80;
  }

  function isPositiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function integerInRange(value, minimum, maximum) {
    return Number.isInteger(value) && value >= minimum && value <= maximum;
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function createIntroState(config, revision) {
    return freezeState({
      phase: "intro",
      readyKind: null,
      tick: 0,
      active: { left: null, right: null },
      leftLift: 0,
      rightLift: 0,
      tilt: 0,
      ballPosition: 0,
      ballVelocity: 0,
      routeProgress: 0,
      stableTicks: 0,
      finalHoldTicks: 0,
      checkpoint: 0,
      reachedCheckpoints: [],
      feedback: null,
      pauseReason: null,
      pausedFrom: null,
      attemptCount: 1,
      revision,
      config,
    });
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

  return deepFreeze({
    TICK_MS,
    MAX_FRAME_GAP_MS,
    COURSE_SEGMENTS,
    CHECKPOINTS,
    DEFAULT_CONFIG,
    sanitizeSteadyConfig,
    validateCourseSegments,
    getCourseSegment,
    createSteadyState,
    reduceSteady,
    getSteadyView,
    classifySteadyKey,
    replaySteady,
  });
});
