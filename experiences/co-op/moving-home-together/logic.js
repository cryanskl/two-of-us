(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MOVING_HOME_TOGETHER_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WORLD_WIDTH = 1000;
  const WORLD_HEIGHT = 680;
  const TICK_MS = 20;
  const MAX_FRAME_GAP_MS = 250;
  const MAX_CATCH_UP_TICKS = 5;
  const ANGLE_COUNT = 256;
  const ANGLE_SCALE = 16384;
  const SOFA_HALF_LENGTH = 110;
  const SOFA_HALF_DEPTH = 38;
  const COLLISION_GAP = 2;
  const MOVE_UNITS_PER_INTENT = 1;
  const TURN_THRESHOLD = ANGLE_SCALE * ANGLE_SCALE;
  const GOAL_HOLD_TICKS = 12;
  const INITIAL_POSE = Object.freeze({ centerX: 190, centerY: 518, angleIndex: 0 });
  const PHASES = Object.freeze(["intro", "playing", "paused", "complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "long-frame"]);
  const SIDES = Object.freeze(["left", "right"]);
  const CONFIG_LIMITS = Object.freeze({
    leftName: 12,
    rightName: 12,
    intro: 96,
    finalTitle: 24,
    finalMessage: 108,
    signature: 24,
  });

  const ANGLE_TABLE = deepFreeze([
    { cos: 16384, sin: 0 },
    { cos: 16379, sin: 402 },
    { cos: 16364, sin: 804 },
    { cos: 16340, sin: 1205 },
    { cos: 16305, sin: 1606 },
    { cos: 16261, sin: 2006 },
    { cos: 16207, sin: 2404 },
    { cos: 16143, sin: 2801 },
    { cos: 16069, sin: 3196 },
    { cos: 15986, sin: 3590 },
    { cos: 15893, sin: 3981 },
    { cos: 15791, sin: 4370 },
    { cos: 15679, sin: 4756 },
    { cos: 15557, sin: 5139 },
    { cos: 15426, sin: 5520 },
    { cos: 15286, sin: 5897 },
    { cos: 15137, sin: 6270 },
    { cos: 14978, sin: 6639 },
    { cos: 14811, sin: 7005 },
    { cos: 14635, sin: 7366 },
    { cos: 14449, sin: 7723 },
    { cos: 14256, sin: 8076 },
    { cos: 14053, sin: 8423 },
    { cos: 13842, sin: 8765 },
    { cos: 13623, sin: 9102 },
    { cos: 13395, sin: 9434 },
    { cos: 13160, sin: 9760 },
    { cos: 12916, sin: 10080 },
    { cos: 12665, sin: 10394 },
    { cos: 12406, sin: 10702 },
    { cos: 12140, sin: 11003 },
    { cos: 11866, sin: 11297 },
    { cos: 11585, sin: 11585 },
    { cos: 11297, sin: 11866 },
    { cos: 11003, sin: 12140 },
    { cos: 10702, sin: 12406 },
    { cos: 10394, sin: 12665 },
    { cos: 10080, sin: 12916 },
    { cos: 9760, sin: 13160 },
    { cos: 9434, sin: 13395 },
    { cos: 9102, sin: 13623 },
    { cos: 8765, sin: 13842 },
    { cos: 8423, sin: 14053 },
    { cos: 8076, sin: 14256 },
    { cos: 7723, sin: 14449 },
    { cos: 7366, sin: 14635 },
    { cos: 7005, sin: 14811 },
    { cos: 6639, sin: 14978 },
    { cos: 6270, sin: 15137 },
    { cos: 5897, sin: 15286 },
    { cos: 5520, sin: 15426 },
    { cos: 5139, sin: 15557 },
    { cos: 4756, sin: 15679 },
    { cos: 4370, sin: 15791 },
    { cos: 3981, sin: 15893 },
    { cos: 3590, sin: 15986 },
    { cos: 3196, sin: 16069 },
    { cos: 2801, sin: 16143 },
    { cos: 2404, sin: 16207 },
    { cos: 2006, sin: 16261 },
    { cos: 1606, sin: 16305 },
    { cos: 1205, sin: 16340 },
    { cos: 804, sin: 16364 },
    { cos: 402, sin: 16379 },
    { cos: 0, sin: 16384 },
    { cos: -402, sin: 16379 },
    { cos: -804, sin: 16364 },
    { cos: -1205, sin: 16340 },
    { cos: -1606, sin: 16305 },
    { cos: -2006, sin: 16261 },
    { cos: -2404, sin: 16207 },
    { cos: -2801, sin: 16143 },
    { cos: -3196, sin: 16069 },
    { cos: -3590, sin: 15986 },
    { cos: -3981, sin: 15893 },
    { cos: -4370, sin: 15791 },
    { cos: -4756, sin: 15679 },
    { cos: -5139, sin: 15557 },
    { cos: -5520, sin: 15426 },
    { cos: -5897, sin: 15286 },
    { cos: -6270, sin: 15137 },
    { cos: -6639, sin: 14978 },
    { cos: -7005, sin: 14811 },
    { cos: -7366, sin: 14635 },
    { cos: -7723, sin: 14449 },
    { cos: -8076, sin: 14256 },
    { cos: -8423, sin: 14053 },
    { cos: -8765, sin: 13842 },
    { cos: -9102, sin: 13623 },
    { cos: -9434, sin: 13395 },
    { cos: -9760, sin: 13160 },
    { cos: -10080, sin: 12916 },
    { cos: -10394, sin: 12665 },
    { cos: -10702, sin: 12406 },
    { cos: -11003, sin: 12140 },
    { cos: -11297, sin: 11866 },
    { cos: -11585, sin: 11585 },
    { cos: -11866, sin: 11297 },
    { cos: -12140, sin: 11003 },
    { cos: -12406, sin: 10702 },
    { cos: -12665, sin: 10394 },
    { cos: -12916, sin: 10080 },
    { cos: -13160, sin: 9760 },
    { cos: -13395, sin: 9434 },
    { cos: -13623, sin: 9102 },
    { cos: -13842, sin: 8765 },
    { cos: -14053, sin: 8423 },
    { cos: -14256, sin: 8076 },
    { cos: -14449, sin: 7723 },
    { cos: -14635, sin: 7366 },
    { cos: -14811, sin: 7005 },
    { cos: -14978, sin: 6639 },
    { cos: -15137, sin: 6270 },
    { cos: -15286, sin: 5897 },
    { cos: -15426, sin: 5520 },
    { cos: -15557, sin: 5139 },
    { cos: -15679, sin: 4756 },
    { cos: -15791, sin: 4370 },
    { cos: -15893, sin: 3981 },
    { cos: -15986, sin: 3590 },
    { cos: -16069, sin: 3196 },
    { cos: -16143, sin: 2801 },
    { cos: -16207, sin: 2404 },
    { cos: -16261, sin: 2006 },
    { cos: -16305, sin: 1606 },
    { cos: -16340, sin: 1205 },
    { cos: -16364, sin: 804 },
    { cos: -16379, sin: 402 },
    { cos: -16384, sin: 0 },
    { cos: -16379, sin: -402 },
    { cos: -16364, sin: -804 },
    { cos: -16340, sin: -1205 },
    { cos: -16305, sin: -1606 },
    { cos: -16261, sin: -2006 },
    { cos: -16207, sin: -2404 },
    { cos: -16143, sin: -2801 },
    { cos: -16069, sin: -3196 },
    { cos: -15986, sin: -3590 },
    { cos: -15893, sin: -3981 },
    { cos: -15791, sin: -4370 },
    { cos: -15679, sin: -4756 },
    { cos: -15557, sin: -5139 },
    { cos: -15426, sin: -5520 },
    { cos: -15286, sin: -5897 },
    { cos: -15137, sin: -6270 },
    { cos: -14978, sin: -6639 },
    { cos: -14811, sin: -7005 },
    { cos: -14635, sin: -7366 },
    { cos: -14449, sin: -7723 },
    { cos: -14256, sin: -8076 },
    { cos: -14053, sin: -8423 },
    { cos: -13842, sin: -8765 },
    { cos: -13623, sin: -9102 },
    { cos: -13395, sin: -9434 },
    { cos: -13160, sin: -9760 },
    { cos: -12916, sin: -10080 },
    { cos: -12665, sin: -10394 },
    { cos: -12406, sin: -10702 },
    { cos: -12140, sin: -11003 },
    { cos: -11866, sin: -11297 },
    { cos: -11585, sin: -11585 },
    { cos: -11297, sin: -11866 },
    { cos: -11003, sin: -12140 },
    { cos: -10702, sin: -12406 },
    { cos: -10394, sin: -12665 },
    { cos: -10080, sin: -12916 },
    { cos: -9760, sin: -13160 },
    { cos: -9434, sin: -13395 },
    { cos: -9102, sin: -13623 },
    { cos: -8765, sin: -13842 },
    { cos: -8423, sin: -14053 },
    { cos: -8076, sin: -14256 },
    { cos: -7723, sin: -14449 },
    { cos: -7366, sin: -14635 },
    { cos: -7005, sin: -14811 },
    { cos: -6639, sin: -14978 },
    { cos: -6270, sin: -15137 },
    { cos: -5897, sin: -15286 },
    { cos: -5520, sin: -15426 },
    { cos: -5139, sin: -15557 },
    { cos: -4756, sin: -15679 },
    { cos: -4370, sin: -15791 },
    { cos: -3981, sin: -15893 },
    { cos: -3590, sin: -15986 },
    { cos: -3196, sin: -16069 },
    { cos: -2801, sin: -16143 },
    { cos: -2404, sin: -16207 },
    { cos: -2006, sin: -16261 },
    { cos: -1606, sin: -16305 },
    { cos: -1205, sin: -16340 },
    { cos: -804, sin: -16364 },
    { cos: -402, sin: -16379 },
    { cos: 0, sin: -16384 },
    { cos: 402, sin: -16379 },
    { cos: 804, sin: -16364 },
    { cos: 1205, sin: -16340 },
    { cos: 1606, sin: -16305 },
    { cos: 2006, sin: -16261 },
    { cos: 2404, sin: -16207 },
    { cos: 2801, sin: -16143 },
    { cos: 3196, sin: -16069 },
    { cos: 3590, sin: -15986 },
    { cos: 3981, sin: -15893 },
    { cos: 4370, sin: -15791 },
    { cos: 4756, sin: -15679 },
    { cos: 5139, sin: -15557 },
    { cos: 5520, sin: -15426 },
    { cos: 5897, sin: -15286 },
    { cos: 6270, sin: -15137 },
    { cos: 6639, sin: -14978 },
    { cos: 7005, sin: -14811 },
    { cos: 7366, sin: -14635 },
    { cos: 7723, sin: -14449 },
    { cos: 8076, sin: -14256 },
    { cos: 8423, sin: -14053 },
    { cos: 8765, sin: -13842 },
    { cos: 9102, sin: -13623 },
    { cos: 9434, sin: -13395 },
    { cos: 9760, sin: -13160 },
    { cos: 10080, sin: -12916 },
    { cos: 10394, sin: -12665 },
    { cos: 10702, sin: -12406 },
    { cos: 11003, sin: -12140 },
    { cos: 11297, sin: -11866 },
    { cos: 11585, sin: -11585 },
    { cos: 11866, sin: -11297 },
    { cos: 12140, sin: -11003 },
    { cos: 12406, sin: -10702 },
    { cos: 12665, sin: -10394 },
    { cos: 12916, sin: -10080 },
    { cos: 13160, sin: -9760 },
    { cos: 13395, sin: -9434 },
    { cos: 13623, sin: -9102 },
    { cos: 13842, sin: -8765 },
    { cos: 14053, sin: -8423 },
    { cos: 14256, sin: -8076 },
    { cos: 14449, sin: -7723 },
    { cos: 14635, sin: -7366 },
    { cos: 14811, sin: -7005 },
    { cos: 14978, sin: -6639 },
    { cos: 15137, sin: -6270 },
    { cos: 15286, sin: -5897 },
    { cos: 15426, sin: -5520 },
    { cos: 15557, sin: -5139 },
    { cos: 15679, sin: -4756 },
    { cos: 15791, sin: -4370 },
    { cos: 15893, sin: -3981 },
    { cos: 15986, sin: -3590 },
    { cos: 16069, sin: -3196 },
    { cos: 16143, sin: -2801 },
    { cos: 16207, sin: -2404 },
    { cos: 16261, sin: -2006 },
    { cos: 16305, sin: -1606 },
    { cos: 16340, sin: -1205 },
    { cos: 16364, sin: -804 },
    { cos: 16379, sin: -402 },
  ]);

  const OBSTACLES = deepFreeze([
    { id: "wall-top", name: "上外墙", left: 0, top: 0, right: 1000, bottom: 24 },
    { id: "wall-bottom", name: "下外墙", left: 0, top: 656, right: 1000, bottom: 680 },
    { id: "wall-left", name: "左外墙", left: 0, top: 24, right: 24, bottom: 656 },
    { id: "wall-right", name: "右外墙", left: 976, top: 24, right: 1000, bottom: 656 },
    { id: "block-north-west", name: "左上封闭区", left: 24, top: 24, right: 360, bottom: 380 },
    { id: "block-south-east", name: "右下封闭区", left: 640, top: 300, right: 976, bottom: 656 },
  ]);
  const GOAL = Object.freeze({ left: 690, top: 90, right: 950, bottom: 230 });
  const DEFAULT_CONFIG = deepFreeze({
    leftName: "左边的你",
    rightName: "右边的你",
    intro: "左边握住左端，右边握住右端。一起给方向，沙发才会动；同向往前，错开一点就能转弯。",
    finalTitle: "家放稳了",
    finalMessage: "家放稳了。难的从来不是那道门，是我们愿意一起慢一点。",
    signature: "留给一起安家的我们",
  });

  const KEY_BINDINGS = new Map([
    ["KeyW", { side: "left", x: 0, y: -1 }],
    ["KeyA", { side: "left", x: -1, y: 0 }],
    ["KeyS", { side: "left", x: 0, y: 1 }],
    ["KeyD", { side: "left", x: 1, y: 0 }],
    ["ArrowUp", { side: "right", x: 0, y: -1 }],
    ["ArrowLeft", { side: "right", x: -1, y: 0 }],
    ["ArrowDown", { side: "right", x: 0, y: 1 }],
    ["ArrowRight", { side: "right", x: 1, y: 0 }],
  ]);

  function sanitizeMovingHomeConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    return deepFreeze({
      leftName: cleanText(readProperty(source, "leftName"), 12, DEFAULT_CONFIG.leftName),
      rightName: cleanText(readProperty(source, "rightName"), 12, DEFAULT_CONFIG.rightName),
      intro: cleanText(readProperty(source, "intro"), 96, DEFAULT_CONFIG.intro),
      finalTitle: cleanText(readProperty(source, "finalTitle"), 24, DEFAULT_CONFIG.finalTitle),
      finalMessage: cleanText(readProperty(source, "finalMessage"), 108, DEFAULT_CONFIG.finalMessage),
      signature: cleanText(readProperty(source, "signature"), 24, DEFAULT_CONFIG.signature),
    });
  }

  function validateAngleTable(table) {
    if (!Array.isArray(table) || table.length !== ANGLE_COUNT) return false;
    return table.every((entry, index) => isPlainObject(entry)
      && Object.keys(entry).length === 2
      && entry.cos === ANGLE_TABLE[index].cos
      && entry.sin === ANGLE_TABLE[index].sin);
  }

  function validateMovingHomeMap(obstacles, goal) {
    if (!Array.isArray(obstacles) || obstacles.length !== OBSTACLES.length) return false;
    const obstaclesMatch = obstacles.every((item, index) => {
      if (!isPlainObject(item) || Object.keys(item).length !== 6) return false;
      const expected = OBSTACLES[index];
      return Object.keys(expected).every((key) => item[key] === expected[key]);
    });
    return obstaclesMatch && isPlainObject(goal) && hasExactKeys(goal, ["left", "top", "right", "bottom"])
      && goal.left === GOAL.left && goal.top === GOAL.top
      && goal.right === GOAL.right && goal.bottom === GOAL.bottom;
  }

  function createMovingHomeState() {
    return freezeState({
      tick: 0,
      phase: "intro",
      pauseReason: null,
      centerX: INITIAL_POSE.centerX,
      centerY: INITIAL_POSE.centerY,
      angleIndex: INITIAL_POSE.angleIndex,
      heldInputs: [],
      routeStage: 0,
      collisionSerial: 0,
      lastCollisionObstacleId: null,
      insideGoalTicks: 0,
      completionTick: null,
      announcementSerial: 0,
    });
  }

  function reduceMovingHome(state, action) {
    assertState(state);
    assertAction(action);
    if (action.type === "RESTART") return createMovingHomeState();
    if (action.type === "START") {
      if (state.phase !== "intro") return state;
      return freezeState({
        ...state,
        phase: "playing",
        pauseReason: null,
        heldInputs: [],
        announcementSerial: state.announcementSerial + 1,
      });
    }
    if (action.type === "PAUSE") {
      if (state.phase !== "playing") return state;
      return freezeState({
        ...state,
        phase: "paused",
        pauseReason: action.reason,
        heldInputs: [],
        insideGoalTicks: 0,
        announcementSerial: state.announcementSerial + 1,
      });
    }
    if (action.type === "RESUME") {
      if (state.phase !== "paused") return state;
      return freezeState({
        ...state,
        phase: "playing",
        pauseReason: null,
        heldInputs: [],
        announcementSerial: state.announcementSerial + 1,
      });
    }
    if (action.type === "SET_INPUT") return setInput(state, action);
    if (action.type === "RELEASE_INPUT") return releaseInput(state, action.id);
    if (action.type === "RELEASE_ALL_INPUTS") return releaseAllInputs(state);
    return tickMovingHome(state, action.count);
  }

  function getMovingHomeView(state, rawConfig) {
    assertState(state);
    const config = sanitizeMovingHomeConfig(rawConfig);
    const intents = deriveIntents(state.heldInputs);
    const insideGoal = isPoseInsideGoal(state.centerX, state.centerY, state.angleIndex);
    const stageText = routeStageText(state.routeStage);
    return {
      phase: state.phase,
      title: "一起，把家搬进来",
      subtitle: "同一个转角，一起给方向。",
      names: { left: config.leftName, right: config.rightName },
      pose: {
        centerX: state.centerX,
        centerY: state.centerY,
        angleIndex: state.angleIndex,
        angleDegrees: (state.angleIndex * 360) / ANGLE_COUNT,
        directionLabel: angleDirectionLabel(state.angleIndex),
      },
      intents: {
        left: { ...intents.left, label: intentLabel(intents.left) },
        right: { ...intents.right, label: intentLabel(intents.right) },
      },
      route: { stage: state.routeStage, title: stageText.title, instruction: stageText.instruction },
      collision: {
        serial: state.collisionSerial,
        obstacleId: state.lastCollisionObstacleId,
        active: state.lastCollisionObstacleId !== null,
      },
      goal: {
        inside: insideGoal,
        holdTicks: state.insideGoalTicks,
        holdTotal: GOAL_HOLD_TICKS,
        angleReady: angleDistanceToHorizontal(state.angleIndex) <= 2,
        released: state.heldInputs.length === 0,
      },
      statusText: statusTextFor(state, intents, insideGoal),
      finalTitle: config.finalTitle,
      finalMessage: config.finalMessage,
      signature: config.signature,
      canStart: state.phase === "intro",
      canPause: state.phase === "playing",
      canResume: state.phase === "paused",
      canRestart: true,
    };
  }

  function classifyMovingHomeKey(code, edge, repeat) {
    if (typeof code !== "string" || (edge !== "down" && edge !== "up")) return null;
    const binding = KEY_BINDINGS.get(code);
    if (!binding) return null;
    const id = `keyboard:${code}`;
    if (edge === "up") return { type: "RELEASE_INPUT", id };
    if (repeat === true) return null;
    return { type: "SET_INPUT", id, ...binding };
  }

  function replayMovingHome(actions) {
    if (!Array.isArray(actions)) throw new TypeError("actions must be an array");
    let state = createMovingHomeState();
    for (const action of actions) state = reduceMovingHome(state, action);
    return state;
  }

  function setInput(state, action) {
    if (state.phase !== "playing") return state;
    const nextEntry = { id: action.id, side: action.side, x: action.x, y: action.y };
    const existing = state.heldInputs.find((entry) => entry.id === action.id);
    if (existing && entriesEqual(existing, nextEntry)) return state;
    const heldInputs = state.heldInputs.filter((entry) => entry.id !== action.id).concat(nextEntry);
    heldInputs.sort((a, b) => a.id.localeCompare(b.id));
    return freezeState({ ...state, heldInputs });
  }

  function releaseInput(state, id) {
    if (state.phase !== "playing") return state;
    if (!state.heldInputs.some((entry) => entry.id === id)) return state;
    return freezeState({ ...state, heldInputs: state.heldInputs.filter((entry) => entry.id !== id) });
  }

  function releaseAllInputs(state) {
    if (state.phase !== "playing" || state.heldInputs.length === 0) return state;
    return freezeState({ ...state, heldInputs: [] });
  }

  function tickMovingHome(state, count) {
    if (state.phase !== "playing") return state;
    let next = state;
    for (let index = 0; index < count && next.phase === "playing"; index += 1) {
      next = advanceOneTick(next);
    }
    return next === state ? state : freezeState(next);
  }

  function advanceOneTick(state) {
    const intents = deriveIntents(state.heldInputs);
    const bothActive = !isZeroIntent(intents.left) && !isZeroIntent(intents.right);
    let movement = {
      centerX: state.centerX,
      centerY: state.centerY,
      angleIndex: state.angleIndex,
      collisionObstacleId: null,
      moved: false,
    };
    if (bothActive) movement = applyMotion(state, intents);
    const routeStage = updateRouteStage(state.routeStage, movement.centerX, movement.centerY);
    const released = state.heldInputs.length === 0;
    const insideGoal = released && routeStage === 2
      && isPoseInsideGoal(movement.centerX, movement.centerY, movement.angleIndex);
    const insideGoalTicks = insideGoal ? state.insideGoalTicks + 1 : 0;
    const complete = insideGoalTicks >= GOAL_HOLD_TICKS;
    const collisionChanged = movement.collisionObstacleId !== null;
    const routeChanged = routeStage !== state.routeStage;
    const announcementDelta = Number(collisionChanged) + Number(routeChanged) + Number(complete);
    const tick = state.tick + 1;
    return {
      ...state,
      tick,
      phase: complete ? "complete" : "playing",
      pauseReason: null,
      centerX: movement.centerX,
      centerY: movement.centerY,
      angleIndex: movement.angleIndex,
      heldInputs: complete ? [] : state.heldInputs,
      routeStage,
      collisionSerial: state.collisionSerial + Number(collisionChanged),
      lastCollisionObstacleId: collisionChanged
        ? movement.collisionObstacleId
        : movement.moved
          ? null
          : state.lastCollisionObstacleId,
      insideGoalTicks: Math.min(GOAL_HOLD_TICKS, insideGoalTicks),
      completionTick: complete ? tick : null,
      announcementSerial: state.announcementSerial + announcementDelta,
    };
  }

  function applyMotion(state, intents) {
    const deltaX = (intents.left.x + intents.right.x) * MOVE_UNITS_PER_INTENT;
    const deltaY = (intents.left.y + intents.right.y) * MOVE_UNITS_PER_INTENT;
    const angleDelta = deriveAngleDelta(state.angleIndex, intents.left, intents.right);
    const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    let centerX = state.centerX;
    let centerY = state.centerY;
    let angleIndex = state.angleIndex;
    let moved = false;
    for (let index = 1; index <= steps; index += 1) {
      const candidateX = state.centerX + Math.trunc((deltaX * index) / steps);
      const candidateY = state.centerY + Math.trunc((deltaY * index) / steps);
      if (candidateX === centerX && candidateY === centerY) continue;
      const collision = firstCollision(candidateX, candidateY, angleIndex);
      if (collision) return { centerX, centerY, angleIndex, collisionObstacleId: collision.id, moved };
      centerX = candidateX;
      centerY = candidateY;
      moved = true;
    }
    if (angleDelta !== 0) {
      const candidateAngle = normalizeAngle(angleIndex + angleDelta);
      const collision = firstCollision(centerX, centerY, candidateAngle);
      if (collision) return { centerX, centerY, angleIndex, collisionObstacleId: collision.id, moved };
      angleIndex = candidateAngle;
      moved = true;
    }
    return { centerX, centerY, angleIndex, collisionObstacleId: null, moved };
  }

  function deriveIntents(heldInputs) {
    const totals = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
    for (const entry of heldInputs) {
      totals[entry.side].x += entry.x;
      totals[entry.side].y += entry.y;
    }
    return {
      left: { x: clampSign(totals.left.x), y: clampSign(totals.left.y) },
      right: { x: clampSign(totals.right.x), y: clampSign(totals.right.y) },
    };
  }

  function deriveAngleDelta(angleIndex, leftIntent, rightIntent) {
    const angle = ANGLE_TABLE[angleIndex];
    const leftUnit = intentUnit(leftIntent);
    const rightUnit = intentUnit(rightIntent);
    const diffX = rightUnit.x - leftUnit.x;
    const diffY = rightUnit.y - leftUnit.y;
    const turnScore = angle.cos * diffY - angle.sin * diffX;
    if (turnScore >= TURN_THRESHOLD) return 1;
    if (turnScore <= -TURN_THRESHOLD) return -1;
    return 0;
  }

  function intentUnit(intent) {
    if (intent.x !== 0 && intent.y !== 0) {
      return { x: intent.x * 11585, y: intent.y * 11585 };
    }
    return { x: intent.x * ANGLE_SCALE, y: intent.y * ANGLE_SCALE };
  }

  function firstCollision(centerX, centerY, angleIndex) {
    return OBSTACLES.find((obstacle) => poseIntersectsAabb(centerX, centerY, angleIndex, obstacle)) || null;
  }

  function poseIntersectsAabb(centerX, centerY, angleIndex, obstacle) {
    const angle = ANGLE_TABLE[normalizeAngle(angleIndex)];
    const hx = (obstacle.right - obstacle.left) / 2;
    const hy = (obstacle.bottom - obstacle.top) / 2;
    const obstacleX = obstacle.left + hx;
    const obstacleY = obstacle.top + hy;
    const dx = centerX - obstacleX;
    const dy = centerY - obstacleY;
    const absCos = Math.abs(angle.cos);
    const absSin = Math.abs(angle.sin);
    const gap = COLLISION_GAP * ANGLE_SCALE;
    if (Math.abs(dx) * ANGLE_SCALE >= absCos * SOFA_HALF_LENGTH + absSin * SOFA_HALF_DEPTH + hx * ANGLE_SCALE + gap) return false;
    if (Math.abs(dy) * ANGLE_SCALE >= absSin * SOFA_HALF_LENGTH + absCos * SOFA_HALF_DEPTH + hy * ANGLE_SCALE + gap) return false;
    if (Math.abs(dx * angle.cos + dy * angle.sin) >= SOFA_HALF_LENGTH * ANGLE_SCALE + hx * absCos + hy * absSin + gap) return false;
    if (Math.abs(-dx * angle.sin + dy * angle.cos) >= SOFA_HALF_DEPTH * ANGLE_SCALE + hx * absSin + hy * absCos + gap) return false;
    return true;
  }

  function isPoseSafe(centerX, centerY, angleIndex) {
    return Number.isSafeInteger(centerX) && centerX >= 0 && centerX <= WORLD_WIDTH
      && Number.isSafeInteger(centerY) && centerY >= 0 && centerY <= WORLD_HEIGHT
      && Number.isInteger(angleIndex)
      && normalizeAngle(angleIndex) === angleIndex && firstCollision(centerX, centerY, angleIndex) === null;
  }

  function getSofaCorners(centerX, centerY, angleIndex) {
    const angle = ANGLE_TABLE[normalizeAngle(angleIndex)];
    const corners = [];
    for (const along of [-1, 1]) {
      for (const across of [-1, 1]) {
        corners.push({
          xScaled: centerX * ANGLE_SCALE
            + along * SOFA_HALF_LENGTH * angle.cos
            - across * SOFA_HALF_DEPTH * angle.sin,
          yScaled: centerY * ANGLE_SCALE
            + along * SOFA_HALF_LENGTH * angle.sin
            + across * SOFA_HALF_DEPTH * angle.cos,
        });
      }
    }
    return corners;
  }

  function isPoseInsideGoal(centerX, centerY, angleIndex) {
    if (!isPoseSafe(centerX, centerY, angleIndex) || angleDistanceToHorizontal(angleIndex) > 2) return false;
    const left = GOAL.left * ANGLE_SCALE;
    const top = GOAL.top * ANGLE_SCALE;
    const right = GOAL.right * ANGLE_SCALE;
    const bottom = GOAL.bottom * ANGLE_SCALE;
    return getSofaCorners(centerX, centerY, angleIndex).every((corner) => corner.xScaled >= left
      && corner.xScaled <= right && corner.yScaled >= top && corner.yScaled <= bottom);
  }

  function updateRouteStage(routeStage, centerX, centerY) {
    if (routeStage === 0 && centerX >= 420 && centerY >= 390) return 1;
    if (routeStage === 1 && centerY <= 270 && centerX >= 362 && centerX <= 638) return 2;
    return routeStage;
  }

  function assertAction(action) {
    if (!isPlainObject(action) || typeof action.type !== "string") throw new TypeError("action must be an object with a type");
    if (action.type === "START" || action.type === "RESUME" || action.type === "RESTART"
      || action.type === "RELEASE_ALL_INPUTS") {
      if (!hasExactKeys(action, ["type"])) throw new TypeError(`invalid ${action.type} action`);
      return;
    }
    if (action.type === "SET_INPUT") {
      if (!hasExactKeys(action, ["type", "id", "side", "x", "y"])
        || !isInputId(action.id) || !SIDES.includes(action.side) || !isIntentComponent(action.x)
        || !isIntentComponent(action.y) || (action.x === 0 && action.y === 0)) {
        throw new TypeError("invalid SET_INPUT action");
      }
      return;
    }
    if (action.type === "RELEASE_INPUT") {
      if (!hasExactKeys(action, ["type", "id"]) || !isInputId(action.id)) throw new TypeError("invalid RELEASE_INPUT action");
      return;
    }
    if (action.type === "TICK") {
      if (!hasExactKeys(action, ["type", "count"])
        || !Number.isInteger(action.count) || action.count < 1 || action.count > MAX_CATCH_UP_TICKS) {
        throw new TypeError("invalid TICK action");
      }
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

  function assertState(state) {
    const stateKeys = ["tick", "phase", "pauseReason", "centerX", "centerY", "angleIndex", "heldInputs",
      "routeStage", "collisionSerial", "lastCollisionObstacleId", "insideGoalTicks", "completionTick",
      "announcementSerial"];
    if (!isPlainObject(state) || !hasExactKeys(state, stateKeys)
      || !Number.isSafeInteger(state.tick) || state.tick < 0
      || !PHASES.includes(state.phase) || (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason))
      || !Number.isSafeInteger(state.centerX) || state.centerX < 0 || state.centerX > WORLD_WIDTH
      || !Number.isSafeInteger(state.centerY) || state.centerY < 0 || state.centerY > WORLD_HEIGHT
      || !Number.isInteger(state.angleIndex) || state.angleIndex < 0 || state.angleIndex >= ANGLE_COUNT
      || !validHeldInputs(state.heldInputs) || !Number.isInteger(state.routeStage) || state.routeStage < 0 || state.routeStage > 2
      || !Number.isSafeInteger(state.collisionSerial) || state.collisionSerial < 0
      || (state.lastCollisionObstacleId !== null && !OBSTACLES.some((item) => item.id === state.lastCollisionObstacleId))
      || !Number.isInteger(state.insideGoalTicks) || state.insideGoalTicks < 0 || state.insideGoalTicks > GOAL_HOLD_TICKS
      || (state.completionTick !== null && (!Number.isSafeInteger(state.completionTick) || state.completionTick < 0))
      || !Number.isSafeInteger(state.announcementSerial) || state.announcementSerial < 0) {
      throw new TypeError("invalid moving-home state");
    }
    if (state.phase === "intro" && (state.pauseReason !== null || state.heldInputs.length !== 0
      || state.completionTick !== null || state.insideGoalTicks !== 0 || state.tick !== 0
      || state.centerX !== INITIAL_POSE.centerX || state.centerY !== INITIAL_POSE.centerY
      || state.angleIndex !== INITIAL_POSE.angleIndex || state.routeStage !== 0
      || state.collisionSerial !== 0 || state.lastCollisionObstacleId !== null
      || state.announcementSerial !== 0)) throw new TypeError("invalid intro state");
    if (state.phase === "playing" && (state.pauseReason !== null || state.completionTick !== null
      || state.insideGoalTicks === GOAL_HOLD_TICKS)) throw new TypeError("invalid playing state");
    if (state.phase === "paused" && (state.pauseReason === null || state.heldInputs.length !== 0
      || state.insideGoalTicks !== 0 || state.completionTick !== null)) throw new TypeError("invalid paused state");
    if (state.phase === "complete" && (state.pauseReason !== null || state.heldInputs.length !== 0
      || state.insideGoalTicks !== GOAL_HOLD_TICKS || state.completionTick !== state.tick
      || state.routeStage !== 2 || !isPoseInsideGoal(state.centerX, state.centerY, state.angleIndex))) {
      throw new TypeError("invalid complete state");
    }
    if (!isPoseSafe(state.centerX, state.centerY, state.angleIndex)) throw new TypeError("unsafe moving-home state");
  }

  function validHeldInputs(inputs) {
    if (!Array.isArray(inputs)) return false;
    let previousId = null;
    const ids = new Set();
    return inputs.every((entry) => {
      if (!isPlainObject(entry) || Object.keys(entry).length !== 4 || !isInputId(entry.id)
        || !SIDES.includes(entry.side) || !isIntentComponent(entry.x) || !isIntentComponent(entry.y)
        || (entry.x === 0 && entry.y === 0) || ids.has(entry.id)) return false;
      if (previousId !== null && previousId.localeCompare(entry.id) >= 0) return false;
      previousId = entry.id;
      ids.add(entry.id);
      return true;
    });
  }

  function statusTextFor(state, intents, insideGoal) {
    if (state.phase === "intro") return "同一个转角，一起给方向。";
    if (state.phase === "paused") return "暂停在这里，继续后一起接着搬。";
    if (state.phase === "complete") return "家放稳了。";
    if (state.lastCollisionObstacleId) return "碰到边了，先回一点，再一起转。";
    if (isZeroIntent(intents.left) && !isZeroIntent(intents.right)) return "还差左边给一个方向。";
    if (!isZeroIntent(intents.left) && isZeroIntent(intents.right)) return "还差右边给一个方向。";
    if (state.routeStage === 2 && insideGoal && state.heldInputs.length === 0) return `一起松手放稳 ${state.insideGoalTicks} / ${GOAL_HOLD_TICKS}`;
    return routeStageText(state.routeStage).instruction;
  }

  function routeStageText(stage) {
    if (stage === 0) return { title: "门厅", instruction: "先一起往右，把长边送到转角。" };
    if (stage === 1) return { title: "转角", instruction: "慢一点，让两端朝相反方向发力。" };
    return { title: "客厅", instruction: "回正，再一起送进地毯。" };
  }

  function intentLabel(intent) {
    const vertical = intent.y < 0 ? "上" : intent.y > 0 ? "下" : "";
    const horizontal = intent.x < 0 ? "左" : intent.x > 0 ? "右" : "";
    return `${vertical}${horizontal}` || "等待";
  }

  function angleDirectionLabel(angleIndex) {
    const normalized = normalizeAngle(angleIndex);
    if (angleDistanceToHorizontal(normalized) <= 2) return "沙发接近水平";
    if (Math.min(Math.abs(normalized - 64), Math.abs(normalized - 192)) <= 2) return "沙发接近竖直";
    return normalized < 128 ? "沙发顺时针斜放" : "沙发逆时针斜放";
  }

  function angleDistanceToHorizontal(angleIndex) {
    const normalized = normalizeAngle(angleIndex);
    const toZero = Math.min(normalized, ANGLE_COUNT - normalized);
    return Math.min(toZero, Math.abs(normalized - 128));
  }

  function normalizeAngle(value) {
    return ((value % ANGLE_COUNT) + ANGLE_COUNT) % ANGLE_COUNT;
  }

  function clampSign(value) {
    return value < 0 ? -1 : value > 0 ? 1 : 0;
  }

  function isZeroIntent(intent) {
    return intent.x === 0 && intent.y === 0;
  }

  function entriesEqual(left, right) {
    return left.id === right.id && left.side === right.side && left.x === right.x && left.y === right.y;
  }

  function isIntentComponent(value) {
    return value === -1 || value === 0 || value === 1;
  }

  function isInputId(value) {
    return typeof value === "string" && value.length > 0;
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

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function hasExactKeys(value, expectedKeys) {
    const keys = Object.keys(value);
    return keys.length === expectedKeys.length && expectedKeys.every((key) => keys.includes(key));
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value, seen) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
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
    WORLD_WIDTH,
    WORLD_HEIGHT,
    TICK_MS,
    MAX_FRAME_GAP_MS,
    MAX_CATCH_UP_TICKS,
    ANGLE_COUNT,
    ANGLE_SCALE,
    SOFA_HALF_LENGTH,
    SOFA_HALF_DEPTH,
    COLLISION_GAP,
    MOVE_UNITS_PER_INTENT,
    TURN_THRESHOLD,
    GOAL_HOLD_TICKS,
    ANGLE_TABLE,
    OBSTACLES,
    GOAL,
    DEFAULT_CONFIG,
    sanitizeMovingHomeConfig,
    validateAngleTable,
    validateMovingHomeMap,
    createMovingHomeState,
    reduceMovingHome,
    getMovingHomeView,
    classifyMovingHomeKey,
    replayMovingHome,
    deriveIntents,
    deriveAngleDelta,
    poseIntersectsAabb,
    isPoseSafe,
    getSofaCorners,
    isPoseInsideGoal,
  });
});
