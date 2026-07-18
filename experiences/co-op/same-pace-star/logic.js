(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SAME_PACE_STAR_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TICK_MS = 50;
  const STEP_TICKS = 24;
  const ACTION_WINDOW_START = 8;
  const ACTION_WINDOW_END = 19;
  const MISS_TICK = 20;
  const MAX_FRAME_GAP_MS = 500;
  const SIDES = Object.freeze(["left", "right"]);
  const PHASES = Object.freeze([
    "intro",
    "playing",
    "release-gate",
    "ready",
    "measure-complete",
    "paused",
    "complete",
  ]);
  const PAUSABLE_PHASES = Object.freeze(["playing", "release-gate", "ready", "measure-complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "stalled"]);
  const FAILURE_REASONS = Object.freeze(["early-edge", "missed-edge", "wrong-seat", "released-early"]);
  const FEEDBACK_VALUES = Object.freeze(["step-received", "measure-complete", "retry"]);
  const CONFIG_LIMITS = Object.freeze({
    leftName: 12,
    rightName: 12,
    intro: 72,
    finalTitle: 24,
    finalMessage: 96,
    signature: 24,
  });

  const MEASURES = deepFreeze([
    { id: "first-light", leader: "left", title: "第一颗，慢慢靠近" },
    { id: "answer-light", leader: "right", title: "第二颗，换你回应" },
    { id: "warm-light", leader: "left", title: "第三颗，把光接稳" },
    { id: "near-light", leader: "right", title: "第四颗，再近一点" },
    { id: "home-light", leader: "left", title: "第五颗，留在这里" },
    { id: "our-light", leader: "right", title: "最后一颗，一起放开" },
  ]);
  const DEFAULT_CONFIG = deepFreeze({
    leftName: "左边的你",
    rightName: "右边的你",
    intro: "轮流把星光收起、交给对方，再一起放开。",
    finalTitle: "慢一点，也和你一起",
    finalMessage: "不是谁追上谁，是我们都愿意为对方停一下。",
    signature: "留给我们的夜晚",
  });

  function sanitizeSamePaceConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    return deepFreeze({
      leftName: cleanText(readProperty(source, "leftName"), 12, DEFAULT_CONFIG.leftName),
      rightName: cleanText(readProperty(source, "rightName"), 12, DEFAULT_CONFIG.rightName),
      intro: cleanText(readProperty(source, "intro"), 72, DEFAULT_CONFIG.intro),
      finalTitle: cleanText(readProperty(source, "finalTitle"), 24, DEFAULT_CONFIG.finalTitle),
      finalMessage: cleanText(readProperty(source, "finalMessage"), 96, DEFAULT_CONFIG.finalMessage),
      signature: cleanText(readProperty(source, "signature"), 24, DEFAULT_CONFIG.signature),
    });
  }

  function validateMeasures(measures) {
    if (!Array.isArray(measures) || measures.length !== MEASURES.length) return false;
    return measures.every((measure, index) => {
      if (!isPlainObject(measure) || Object.keys(measure).length !== 3) return false;
      const expected = MEASURES[index];
      return measure.id === expected.id
        && measure.leader === expected.leader
        && measure.title === expected.title;
    });
  }

  function createSamePaceState(rawConfig) {
    return createIntroState(sanitizeSamePaceConfig(rawConfig), 0);
  }

  function getExpectedAction(state) {
    if (!isSamePaceState(state) || state.phase !== "playing") return null;
    return expectedFor(state.measureIndex, state.stepIndex);
  }

  function reduceSamePace(state, action) {
    if (!isSamePaceState(state) || !isPlainObject(action) || typeof action.type !== "string") return state;
    if (action.type === "START") return startSamePace(state);
    if (action.type === "NEXT") return nextSamePace(state);
    if (action.type === "RETRY") return retrySamePace(state);
    if (action.type === "PRESS") return pressSamePace(state, action);
    if (action.type === "RELEASE") return releaseSamePace(state, action.inputId);
    if (action.type === "TICK") return tickSamePace(state, action.ticks);
    if (action.type === "INTERRUPT") return interruptSamePace(state, action.reason);
    if (action.type === "RESUME") return resumeSamePace(state);
    if (action.type === "RESTART") return createIntroState(sanitizeSamePaceConfig(state.config), state.revision + 1);
    return state;
  }

  function getSamePaceView(state) {
    if (!isSamePaceState(state)) return null;
    const displayIndex = getDisplayMeasureIndex(state);
    const measure = MEASURES[displayIndex];
    const actions = actionsFor(measure.leader);
    const currentStep = state.phase === "playing" ? state.stepIndex : 0;
    const currentAction = actions[currentStep];
    const leaderSide = measure.leader;
    const followerSide = otherSide(leaderSide);
    const expectedName = state.config[`${currentAction.side}Name`];
    const completed = state.completed.map((record) => ({ ...record }));
    const steps = actions.map((item, index) => ({
      side: item.side,
      edge: item.edge,
      label: `${state.config[`${item.side}Name`]}${edgeLabel(item.edge)}`,
      status: stepStatus(state, index),
    }));
    return {
      phase: state.phase,
      measureNumber: displayIndex + 1,
      measureCount: MEASURES.length,
      measureTitle: measure.title,
      leader: { side: leaderSide, name: state.config[`${leaderSide}Name`] },
      follower: { side: followerSide, name: state.config[`${followerSide}Name`] },
      stepNumber: state.phase === "playing" ? state.stepIndex + 1 : 1,
      steps,
      expected: {
        side: currentAction.side,
        edge: currentAction.edge,
        name: expectedName,
        instruction: `${expectedName}${edgeLabel(currentAction.edge)}`,
      },
      timing: { stepTick: state.stepTick, zone: timingZone(state) },
      seats: {
        left: seatView("left", state),
        right: seatView("right", state),
      },
      completed,
      progressLabel: state.phase === "complete"
        ? "六次交接，刚好成了一片属于我们的光。"
        : `第 ${displayIndex + 1} / ${MEASURES.length} 颗 · ${measure.title}`,
      instruction: instructionFor(state, expectedName, currentAction.edge),
      feedback: state.feedback,
      safetyNote: "不用憋气或刻意调整呼吸；如果感到不适，请停下来。",
      finalTitle: state.config.finalTitle,
      finalMessage: state.config.finalMessage,
      signature: state.config.signature,
      canStart: state.phase === "intro",
      canNext: state.phase === "measure-complete",
      canRetry: state.phase === "ready" && state.readyKind === "retry",
      canPause: PAUSABLE_PHASES.includes(state.phase),
      canResume: state.phase === "paused",
      canRestart: true,
    };
  }

  function classifySamePaceKey(code, edge, repeat) {
    if ((code !== "KeyA" && code !== "KeyL") || (edge !== "down" && edge !== "up")) return null;
    if (edge === "up") return { type: "RELEASE", inputId: `key:${code}` };
    if (repeat === true) return null;
    return {
      type: "PRESS",
      side: code === "KeyA" ? "left" : "right",
      inputId: `key:${code}`,
    };
  }

  function replaySamePace(rawConfig, actions) {
    let state = createSamePaceState(rawConfig);
    if (!Array.isArray(actions)) return state;
    for (const action of actions) state = reduceSamePace(state, action);
    return state;
  }

  function startSamePace(state) {
    if (state.phase !== "intro") return state;
    return freezeState({
      ...state,
      phase: "playing",
      revision: state.revision + 1,
    });
  }

  function nextSamePace(state) {
    if (state.phase !== "measure-complete" || state.measureIndex >= MEASURES.length) return state;
    return freezeState({
      ...state,
      phase: "playing",
      attemptCount: 1,
      feedback: null,
      revision: state.revision + 1,
    });
  }

  function retrySamePace(state) {
    if (state.phase !== "ready" || state.readyKind !== "retry") return state;
    if (!Number.isSafeInteger(state.attemptCount + 1)) return state;
    return freezeState({
      ...state,
      phase: "playing",
      readyKind: null,
      attemptCount: state.attemptCount + 1,
      failureReason: null,
      feedback: null,
      revision: state.revision + 1,
    });
  }

  function pressSamePace(state, action) {
    if (state.phase !== "playing" || !SIDES.includes(action.side) || !isInputId(action.inputId)) return state;
    if (findInputSide(state.active, action.inputId) || state.active[action.side]) return state;
    const active = {
      ...state.active,
      [action.side]: { inputId: action.inputId, pressedAtTick: state.clockTick },
    };
    const expected = expectedFor(state.measureIndex, state.stepIndex);
    if (state.stepSatisfied || expected.edge !== "press" || expected.side !== action.side) {
      return failSamePace(state, active, "wrong-seat");
    }
    if (state.stepTick < ACTION_WINDOW_START) return failSamePace(state, active, "early-edge");
    if (state.stepTick <= ACTION_WINDOW_END) {
      return freezeState({
        ...state,
        active,
        stepSatisfied: true,
        feedback: "step-received",
        revision: state.revision + 1,
      });
    }
    return failSamePace(state, active, "wrong-seat");
  }

  function releaseSamePace(state, inputId) {
    if (!isInputId(inputId)) return state;
    const side = findInputSide(state.active, inputId);
    if (!side) return state;
    const active = { ...state.active, [side]: null };
    if (state.phase === "release-gate") {
      if (hasActive(active)) return freezeState({ ...state, active, revision: state.revision + 1 });
      return freezeState({
        ...state,
        phase: "ready",
        active,
        readyKind: "retry",
        feedback: "retry",
        revision: state.revision + 1,
      });
    }
    if (state.phase !== "playing") return state;
    const expected = expectedFor(state.measureIndex, state.stepIndex);
    if (!state.stepSatisfied
      && expected.edge === "release"
      && expected.side === side
      && state.stepTick >= ACTION_WINDOW_START
      && state.stepTick <= ACTION_WINDOW_END) {
      if (state.stepIndex === 3) return completeMeasure(state, active);
      return freezeState({
        ...state,
        active,
        stepSatisfied: true,
        feedback: "step-received",
        revision: state.revision + 1,
      });
    }
    return failSamePace(state, active, "released-early");
  }

  function tickSamePace(state, ticks) {
    if (state.phase !== "playing" || !isPositiveSafeInteger(ticks)) return state;
    if (!Number.isSafeInteger(state.clockTick + ticks)) return state;
    let remaining = ticks;
    let next = { ...state };
    while (remaining > 0 && next.phase === "playing") {
      const boundary = next.stepSatisfied ? STEP_TICKS : MISS_TICK;
      const consume = Math.min(remaining, boundary - next.stepTick);
      next = {
        ...next,
        stepTick: next.stepTick + consume,
        clockTick: next.clockTick + consume,
      };
      remaining -= consume;
      if (!next.stepSatisfied && next.stepTick === MISS_TICK) {
        return failSamePace(
          state,
          next.active,
          "missed-edge",
          next.clockTick,
          next.clockTick - state.clockTick,
        );
      }
      if (next.stepSatisfied && next.stepTick === STEP_TICKS) {
        next = {
          ...next,
          stepIndex: next.stepIndex + 1,
          stepTick: 0,
          stepSatisfied: false,
          feedback: null,
        };
      }
    }
    return freezeState({
      ...next,
      revision: state.revision + (next.clockTick - state.clockTick),
    });
  }

  function interruptSamePace(state, reason) {
    if (!PAUSABLE_PHASES.includes(state.phase)) return state;
    const pausedFrom = state.phase;
    return freezeState({
      ...state,
      phase: "paused",
      readyKind: pausedFrom === "measure-complete" ? null : "retry",
      stepIndex: 0,
      stepTick: 0,
      stepSatisfied: false,
      active: { left: null, right: null },
      failureReason: pausedFrom === "measure-complete" ? null : state.failureReason,
      feedback: pausedFrom === "measure-complete" ? "measure-complete" : "retry",
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
      pausedFrom,
      revision: state.revision + 1,
    });
  }

  function resumeSamePace(state) {
    if (state.phase !== "paused") return state;
    if (state.pausedFrom === "measure-complete") {
      return freezeState({
        ...state,
        phase: "measure-complete",
        pauseReason: null,
        pausedFrom: null,
        revision: state.revision + 1,
      });
    }
    return freezeState({
      ...state,
      phase: "ready",
      readyKind: "retry",
      feedback: "retry",
      pauseReason: null,
      pausedFrom: null,
      revision: state.revision + 1,
    });
  }

  function completeMeasure(state, active) {
    const measure = MEASURES[state.measureIndex];
    const completed = state.completed.concat({
      measureId: measure.id,
      leader: measure.leader,
      attemptCount: state.attemptCount,
      completedAtTick: state.clockTick,
    });
    const measureIndex = state.measureIndex + 1;
    const phase = measureIndex === MEASURES.length ? "complete" : "measure-complete";
    return freezeState({
      ...state,
      phase,
      readyKind: null,
      measureIndex,
      stepIndex: 0,
      stepTick: 0,
      stepSatisfied: false,
      active,
      completed,
      failureReason: null,
      feedback: "measure-complete",
      revision: state.revision + 1,
    });
  }

  function failSamePace(
    state,
    active,
    failureReason,
    clockTick = state.clockTick,
    revisionDelta = 1,
  ) {
    return freezeState({
      ...state,
      phase: hasActive(active) ? "release-gate" : "ready",
      readyKind: "retry",
      stepIndex: 0,
      stepTick: 0,
      stepSatisfied: false,
      clockTick,
      active,
      failureReason,
      feedback: "retry",
      revision: state.revision + revisionDelta,
    });
  }

  function createIntroState(config, revision) {
    return freezeState({
      phase: "intro",
      readyKind: null,
      measureIndex: 0,
      stepIndex: 0,
      stepTick: 0,
      stepSatisfied: false,
      clockTick: 0,
      active: { left: null, right: null },
      attemptCount: 1,
      completed: [],
      failureReason: null,
      feedback: null,
      pauseReason: null,
      pausedFrom: null,
      revision,
      config,
    });
  }

  function expectedFor(measureIndex, stepIndex) {
    const measure = MEASURES[measureIndex];
    if (!measure || !Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > 3) return null;
    const action = actionsFor(measure.leader)[stepIndex];
    return deepFreeze({ ...action });
  }

  function actionsFor(leader) {
    const follower = otherSide(leader);
    return [
      { side: leader, edge: "press" },
      { side: follower, edge: "press" },
      { side: leader, edge: "release" },
      { side: follower, edge: "release" },
    ];
  }

  function getDisplayMeasureIndex(state) {
    if (state.phase === "complete") return MEASURES.length - 1;
    if (state.phase === "measure-complete") return state.measureIndex - 1;
    if (state.phase === "paused" && state.pausedFrom === "measure-complete") return state.measureIndex - 1;
    return Math.min(state.measureIndex, MEASURES.length - 1);
  }

  function stepStatus(state, index) {
    if (state.phase === "complete" || state.phase === "measure-complete"
      || (state.phase === "paused" && state.pausedFrom === "measure-complete")) return "received";
    if (state.phase !== "playing") return index === 0 ? "current" : "upcoming";
    if (index < state.stepIndex) return "received";
    if (index > state.stepIndex) return "upcoming";
    return state.stepSatisfied ? "received" : "current";
  }

  function timingZone(state) {
    if (state.phase === "complete" || state.phase === "measure-complete" || state.stepSatisfied) return "received";
    if (state.phase !== "playing") return "prepare";
    return state.stepTick < ACTION_WINDOW_START ? "prepare" : "act";
  }

  function seatView(side, state) {
    const active = Boolean(state.active[side]);
    return {
      name: state.config[`${side}Name`],
      key: side === "left" ? "A" : "L",
      active,
      stateLabel: active ? "按住" : "松开",
    };
  }

  function instructionFor(state, expectedName, edge) {
    if (state.phase === "intro") return state.config.intro;
    if (state.phase === "release-gate") return "先都松开";
    if (state.phase === "ready") return "光没接上，松开再来";
    if (state.phase === "measure-complete") return "这一颗接好了";
    if (state.phase === "paused") return "星光停在这里";
    if (state.phase === "complete") return "六次交接，刚好成了一片属于我们的光。";
    if (state.stepSatisfied) return "接住了，等下一拍";
    if (state.stepTick < ACTION_WINDOW_START) return `准备 · ${expectedName}${edgeLabel(edge)}`;
    return `现在 · ${expectedName}${edgeLabel(edge)}`;
  }

  function edgeLabel(edge) {
    return edge === "press" ? "按住" : "松开";
  }

  function otherSide(side) {
    return side === "left" ? "right" : "left";
  }

  function findInputSide(active, inputId) {
    if (active.left && active.left.inputId === inputId) return "left";
    if (active.right && active.right.inputId === inputId) return "right";
    return null;
  }

  function hasActive(active) {
    return Boolean(active.left || active.right);
  }

  function isSamePaceState(state) {
    if (!isPlainObject(state) || !PHASES.includes(state.phase)) return false;
    if (!Number.isInteger(state.measureIndex) || state.measureIndex < 0 || state.measureIndex > MEASURES.length) return false;
    if (!Number.isInteger(state.stepIndex) || state.stepIndex < 0 || state.stepIndex > 3) return false;
    if (!Number.isInteger(state.stepTick) || state.stepTick < 0 || state.stepTick >= STEP_TICKS) return false;
    if (typeof state.stepSatisfied !== "boolean") return false;
    if (!Number.isSafeInteger(state.clockTick) || state.clockTick < 0) return false;
    if (!isPlainObject(state.active) || !validActive(state.active, state.clockTick)) return false;
    if (state.active.left && state.active.right && state.active.left.inputId === state.active.right.inputId) return false;
    if (!Number.isSafeInteger(state.attemptCount) || state.attemptCount < 1) return false;
    if (!Array.isArray(state.completed) || !validCompleted(state.completed)) return false;
    if (state.completed.length !== state.measureIndex) return false;
    if (state.readyKind !== null && state.readyKind !== "retry") return false;
    if (state.failureReason !== null && !FAILURE_REASONS.includes(state.failureReason)) return false;
    if (state.feedback !== null && !FEEDBACK_VALUES.includes(state.feedback)) return false;
    if (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason)) return false;
    if (state.pausedFrom !== null && !PAUSABLE_PHASES.includes(state.pausedFrom)) return false;
    if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !isSanitizedConfig(state.config)) return false;
    return validPhaseShape(state);
  }

  function validPhaseShape(state) {
    if (state.phase === "intro") {
      return state.measureIndex === 0 && state.stepIndex === 0 && state.stepTick === 0
        && !state.stepSatisfied && state.clockTick === 0 && !hasActive(state.active)
        && state.attemptCount === 1 && state.completed.length === 0 && state.readyKind === null
        && state.failureReason === null && state.feedback === null
        && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "playing") return validPlayingShape(state);
    if (state.phase === "release-gate") {
      return state.measureIndex < MEASURES.length && hasActive(state.active) && resetStep(state)
        && state.readyKind === "retry" && state.failureReason !== null && state.feedback === "retry"
        && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "ready") {
      return state.measureIndex < MEASURES.length && !hasActive(state.active) && resetStep(state)
        && state.readyKind === "retry" && state.feedback === "retry"
        && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "measure-complete") {
      return state.measureIndex > 0 && state.measureIndex < MEASURES.length && !hasActive(state.active)
        && resetStep(state) && state.readyKind === null && state.failureReason === null
        && state.feedback === "measure-complete" && state.pauseReason === null && state.pausedFrom === null;
    }
    if (state.phase === "paused") {
      if (state.measureIndex >= MEASURES.length || hasActive(state.active) || !resetStep(state)) return false;
      if (state.pauseReason === null || state.pausedFrom === null) return false;
      if (state.pausedFrom === "measure-complete") {
        return state.readyKind === null && state.failureReason === null && state.feedback === "measure-complete";
      }
      return state.readyKind === "retry" && state.feedback === "retry";
    }
    return state.measureIndex === MEASURES.length && !hasActive(state.active) && resetStep(state)
      && state.readyKind === null && state.failureReason === null && state.feedback === "measure-complete"
      && state.pauseReason === null && state.pausedFrom === null;
  }

  function validPlayingShape(state) {
    if (state.measureIndex >= MEASURES.length || state.readyKind !== null || state.failureReason !== null
      || state.pauseReason !== null || state.pausedFrom !== null) return false;
    if (state.stepSatisfied !== (state.feedback === "step-received")) return false;
    if (!state.stepSatisfied && state.stepTick >= MISS_TICK) return false;
    const actions = actionsFor(MEASURES[state.measureIndex].leader);
    const expectedActive = { left: false, right: false };
    for (let index = 0; index < state.stepIndex; index += 1) {
      const action = actions[index];
      expectedActive[action.side] = action.edge === "press";
    }
    if (state.stepSatisfied) {
      const action = actions[state.stepIndex];
      expectedActive[action.side] = action.edge === "press";
    }
    return Boolean(state.active.left) === expectedActive.left
      && Boolean(state.active.right) === expectedActive.right;
  }

  function resetStep(state) {
    return state.stepIndex === 0 && state.stepTick === 0 && state.stepSatisfied === false;
  }

  function validActive(active, clockTick) {
    if (Object.keys(active).length !== 2) return false;
    return SIDES.every((side) => {
      const entry = active[side];
      if (entry === null) return true;
      return isPlainObject(entry) && Object.keys(entry).length === 2 && isInputId(entry.inputId)
        && Number.isSafeInteger(entry.pressedAtTick) && entry.pressedAtTick >= 0 && entry.pressedAtTick <= clockTick;
    });
  }

  function validCompleted(records) {
    if (records.length > MEASURES.length) return false;
    let previousTick = -1;
    return records.every((record, index) => {
      const measure = MEASURES[index];
      if (!isPlainObject(record) || Object.keys(record).length !== 4) return false;
      if (record.measureId !== measure.id || record.leader !== measure.leader) return false;
      if (!Number.isSafeInteger(record.attemptCount) || record.attemptCount < 1) return false;
      if (!Number.isSafeInteger(record.completedAtTick) || record.completedAtTick < previousTick) return false;
      previousTick = record.completedAtTick;
      return true;
    });
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

  function isInputId(value) {
    return typeof value === "string" && value.length > 0;
  }

  function isPositiveSafeInteger(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
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
    STEP_TICKS,
    ACTION_WINDOW_START,
    ACTION_WINDOW_END,
    MISS_TICK,
    MAX_FRAME_GAP_MS,
    MEASURES,
    DEFAULT_CONFIG,
    sanitizeSamePaceConfig,
    validateMeasures,
    createSamePaceState,
    getExpectedAction,
    reduceSamePace,
    getSamePaceView,
    classifySamePaceKey,
    replaySamePace,
  });
});
