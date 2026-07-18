(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.STARLIGHT_KEEPSAKE_SEARCH_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WORLD_WIDTH = 1000;
  const WORLD_HEIGHT = 620;
  const LIGHT_START_X = 500;
  const LIGHT_START_Y = 310;
  const TARGET_COUNT = 5;
  const CAPTURE_RADIUS = 58;
  const TICK_MS = 50;
  const FOCUS_TICKS = 14;
  const KEYBOARD_STEP = 18;
  const MAX_TICKS_PER_ACTION = 5;
  const MAX_FRAME_GAP_MS = 250;

  const TARGETS = deepFreeze([
    { id: "k1", x: 180, y: 100, radius: 64 },
    { id: "k2", x: 800, y: 105, radius: 82 },
    { id: "k3", x: 295, y: 455, radius: 70 },
    { id: "k4", x: 685, y: 455, radius: 70 },
    { id: "k5", x: 948, y: 360, radius: 52 },
  ]);
  const TARGET_IDS = Object.freeze(TARGETS.map((target) => target.id));
  const TARGET_IDS_FOR_VALIDATION = Object.freeze(["k1", "k2", "k3", "k4", "k5"]);
  const PHASES = Object.freeze(["intro", "searching", "paused", "complete"]);
  const CONTROL_MODES = Object.freeze(["pointer", "keyboard"]);
  const POINTER_TYPES = Object.freeze(["mouse", "touch", "pen"]);
  const POINTER_END_REASONS = Object.freeze(["up", "cancel", "lost-capture", "leave"]);
  const PAUSE_REASONS = Object.freeze(["manual", "escape", "blur", "hidden", "long-frame"]);
  const HELD_KEY_ORDER = Object.freeze(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  const NOTICE_VALUES = Object.freeze([
    "started", "focus-entered", "focus-reset", "found", "paused", "resumed",
  ]);
  const STATE_KEYS = Object.freeze([
    "version", "phase", "resumePhase", "light", "controlMode", "activePointer",
    "lastGeneration", "heldKeys", "focusTargetId", "focusTicks", "foundIds",
    "completionReason", "announcementSerial", "lastNotice",
  ]);
  const CONFIG_FIELDS = deepFreeze([
    ["title", 40, "把夜晚照成我们"],
    ["subtitle", 100, "有些小事藏在暗处，等你慢一点，把光停在它们身上。"],
    ["intro", 180, "提起这盏灯，找找房间里留下的五点微光。看见以后别急着走，停一会儿，它才会记住你。"],
    ["startButton", 32, "提起灯"],
    ["directButton", 32, "不方便寻找，直接点亮"],
    ["searchInstruction", 180, "拖动或移动光心，在微微发亮的地方停一下。方向键也可以移动，Home 回到中央。"],
    ["pauseButton", 32, "先把灯放下"],
    ["resumeButton", 32, "再提起灯"],
    ["foundTitle", 40, "已经亮起"],
    ["completionTitle", 40, "原来，光一直在这里"],
    ["defaultMessage", 280, "你找到的不是散落的东西，是我们把普通日子过成故事的证据。以后天再黑一点，也没关系，我们已经知道怎样把彼此照亮。"],
    ["signature", 80, "留给愿意慢一点看见我的你"],
    ["restartButton", 32, "再照一次"],
  ]);
  const DEFAULT_KEEPSAKES = deepFreeze([
    { id: "k1", label: "那张车票", note: "原来期待一件事，也可以从和你一起出发开始。" },
    { id: "k2", label: "两只杯子", note: "平常的清晨，因为多了一只杯子，就有了名字。" },
    { id: "k3", label: "没拍完的照片", note: "有些瞬间不够端正，却刚好是我们。" },
    { id: "k4", label: "放在一起的钥匙", note: "从某一天起，回来不再只是回到一个地方。" },
    { id: "k5", label: "窗边那颗星", note: "最晚亮起的那颗，也一直没有错过我们。" },
  ]);

  function defaultComposeStarlightLetter(view) {
    return view.defaultMessage;
  }

  const DEFAULT_CONFIG = (() => {
    const value = {};
    for (const [key, , fallback] of CONFIG_FIELDS) value[key] = fallback;
    value.keepsakes = DEFAULT_KEEPSAKES;
    value.composeStarlightLetter = defaultComposeStarlightLetter;
    return deepFreeze(value);
  })();

  if (!validateStarlightTargets(TARGETS)) {
    throw new Error("internal contract: invalid starlight target map");
  }

  function createStarlightState() {
    return freezeState({
      version: 1,
      phase: "intro",
      resumePhase: null,
      light: { x: LIGHT_START_X, y: LIGHT_START_Y },
      controlMode: null,
      activePointer: null,
      lastGeneration: 0,
      heldKeys: [],
      focusTargetId: null,
      focusTicks: 0,
      foundIds: [],
      completionReason: null,
      announcementSerial: 0,
      lastNotice: null,
    });
  }

  function reduceStarlight(state, action) {
    assertState(state);
    assertAction(action);
    if (state.phase === "complete") {
      return action.type === "RESTART" ? createStarlightState() : state;
    }
    if (action.type === "START") return startSearch(state);
    if (action.type === "BEGIN_POINTER") return beginPointer(state, action);
    if (action.type === "MOVE_POINTER") return movePointer(state, action);
    if (action.type === "END_POINTER") return endPointer(state, action);
    if (action.type === "ACTIVATE_KEYBOARD") return activateKeyboard(state);
    if (action.type === "SET_KEY") return setKey(state, action);
    if (action.type === "CENTER_LIGHT") return centerLight(state);
    if (action.type === "TICK") return tickStarlight(state, action.ticks);
    if (action.type === "DIRECT_REVEAL") return directReveal(state);
    if (action.type === "PAUSE") return pauseStarlight(state);
    if (action.type === "RESUME") return resumeStarlight(state);
    return state;
  }

  function startSearch(state) {
    if (state.phase !== "intro") return state;
    return freezeState({
      ...state,
      phase: "searching",
      announcementSerial: state.announcementSerial + 1,
      lastNotice: "started",
    });
  }

  function beginPointer(state, action) {
    if (state.phase !== "searching" || state.activePointer !== null
      || action.generation !== state.lastGeneration + 1) return state;
    const base = {
      ...state,
      controlMode: "pointer",
      activePointer: {
        pointerId: action.pointerId,
        generation: action.generation,
        pointerType: action.pointerType,
      },
      lastGeneration: action.generation,
      heldKeys: [],
    };
    return applyPosition(base, action.x, action.y);
  }

  function movePointer(state, action) {
    if (!pointerMatches(state, action)) return state;
    return applyPosition(state, action.x, action.y);
  }

  function endPointer(state, action) {
    if (!pointerMatches(state, action)) return state;
    const resetFocus = state.focusTargetId !== null;
    return freezeState({
      ...state,
      controlMode: null,
      activePointer: null,
      focusTargetId: null,
      focusTicks: 0,
      announcementSerial: state.announcementSerial + Number(resetFocus),
      lastNotice: resetFocus ? "focus-reset" : state.lastNotice,
    });
  }

  function activateKeyboard(state) {
    if (state.phase !== "searching") return state;
    if (state.controlMode === "keyboard" && state.activePointer === null
      && state.heldKeys.length === 0 && state.focusTargetId === null) return state;
    const resetFocus = state.focusTargetId !== null;
    return freezeState({
      ...state,
      controlMode: "keyboard",
      activePointer: null,
      heldKeys: [],
      focusTargetId: null,
      focusTicks: 0,
      announcementSerial: state.announcementSerial + Number(resetFocus),
      lastNotice: resetFocus ? "focus-reset" : state.lastNotice,
    });
  }

  function setKey(state, action) {
    if (state.phase !== "searching") return state;
    const switching = state.controlMode !== "keyboard" || state.activePointer !== null;
    const resetFocus = switching && state.focusTargetId !== null;
    const currentKeys = switching ? [] : state.heldKeys;
    const present = currentKeys.includes(action.code);
    if (!switching && present === action.pressed) return state;
    const keySet = new Set(currentKeys);
    if (action.pressed) keySet.add(action.code);
    else keySet.delete(action.code);
    const heldKeys = HELD_KEY_ORDER.filter((code) => keySet.has(code));
    return freezeState({
      ...state,
      controlMode: "keyboard",
      activePointer: null,
      heldKeys,
      focusTargetId: switching ? null : state.focusTargetId,
      focusTicks: switching ? 0 : state.focusTicks,
      announcementSerial: state.announcementSerial + Number(resetFocus),
      lastNotice: resetFocus ? "focus-reset" : state.lastNotice,
    });
  }

  function centerLight(state) {
    if (state.phase !== "searching") return state;
    const unchanged = state.controlMode === "keyboard" && state.activePointer === null
      && state.heldKeys.length === 0 && state.focusTargetId === null
      && state.light.x === LIGHT_START_X && state.light.y === LIGHT_START_Y;
    if (unchanged) return state;
    const resetFocus = state.focusTargetId !== null;
    return freezeState({
      ...state,
      light: { x: LIGHT_START_X, y: LIGHT_START_Y },
      controlMode: "keyboard",
      activePointer: null,
      heldKeys: [],
      focusTargetId: null,
      focusTicks: 0,
      announcementSerial: state.announcementSerial + Number(resetFocus),
      lastNotice: resetFocus ? "focus-reset" : state.lastNotice,
    });
  }

  function tickStarlight(state, ticks) {
    if (state.phase !== "searching" || state.controlMode === null) return state;
    let next = state;
    for (let index = 0; index < ticks && next.phase === "searching"; index += 1) {
      next = tickOnce(next);
    }
    return next;
  }

  function tickOnce(state) {
    let x = state.light.x;
    let y = state.light.y;
    if (state.controlMode === "keyboard") {
      const dx = Number(state.heldKeys.includes("ArrowRight")) - Number(state.heldKeys.includes("ArrowLeft"));
      const dy = Number(state.heldKeys.includes("ArrowDown")) - Number(state.heldKeys.includes("ArrowUp"));
      x = clamp(x + dx * KEYBOARD_STEP, 0, WORLD_WIDTH);
      y = clamp(y + dy * KEYBOARD_STEP, 0, WORLD_HEIGHT);
    }
    const lightChanged = x !== state.light.x || y !== state.light.y;
    const targetId = targetIdAt(x, y, state.foundIds);
    if (targetId !== state.focusTargetId) {
      return freezeState({
        ...state,
        light: lightChanged ? { x, y } : state.light,
        focusTargetId: targetId,
        focusTicks: 0,
        announcementSerial: state.announcementSerial + 1,
        lastNotice: targetId === null ? "focus-reset" : "focus-entered",
      });
    }
    if (targetId === null) {
      return lightChanged ? freezeState({ ...state, light: { x, y } }) : state;
    }
    const focusTicks = state.focusTicks + 1;
    if (focusTicks < FOCUS_TICKS) {
      return freezeState({
        ...state,
        light: lightChanged ? { x, y } : state.light,
        focusTicks,
      });
    }
    const foundIds = state.foundIds.concat(targetId);
    if (foundIds.length === TARGET_COUNT) {
      return freezeState({
        ...state,
        phase: "complete",
        resumePhase: null,
        light: lightChanged ? { x, y } : state.light,
        controlMode: null,
        activePointer: null,
        heldKeys: [],
        focusTargetId: null,
        focusTicks: 0,
        foundIds,
        completionReason: "search",
        announcementSerial: state.announcementSerial + 1,
        lastNotice: "found",
      });
    }
    return freezeState({
      ...state,
      light: lightChanged ? { x, y } : state.light,
      focusTargetId: null,
      focusTicks: 0,
      foundIds,
      announcementSerial: state.announcementSerial + 1,
      lastNotice: "found",
    });
  }

  function directReveal(state) {
    if (state.phase !== "intro" && state.phase !== "searching" && state.phase !== "paused") return state;
    return freezeState({
      ...state,
      phase: "complete",
      resumePhase: null,
      controlMode: null,
      activePointer: null,
      heldKeys: [],
      focusTargetId: null,
      focusTicks: 0,
      completionReason: "direct",
      announcementSerial: state.announcementSerial + 1,
    });
  }

  function pauseStarlight(state) {
    if (state.phase !== "searching") return state;
    return freezeState({
      ...state,
      phase: "paused",
      resumePhase: "searching",
      controlMode: null,
      activePointer: null,
      heldKeys: [],
      focusTargetId: null,
      focusTicks: 0,
      announcementSerial: state.announcementSerial + 1,
      lastNotice: "paused",
    });
  }

  function resumeStarlight(state) {
    if (state.phase !== "paused") return state;
    return freezeState({
      ...state,
      phase: "searching",
      resumePhase: null,
      announcementSerial: state.announcementSerial + 1,
      lastNotice: "resumed",
    });
  }

  function applyPosition(state, x, y) {
    const targetId = targetIdAt(x, y, state.foundIds);
    const focusChanged = targetId !== state.focusTargetId;
    const lightChanged = x !== state.light.x || y !== state.light.y;
    if (!focusChanged && !lightChanged) return freezeState(state);
    return freezeState({
      ...state,
      light: lightChanged ? { x, y } : state.light,
      focusTargetId: targetId,
      focusTicks: focusChanged ? 0 : state.focusTicks,
      announcementSerial: state.announcementSerial + Number(focusChanged),
      lastNotice: focusChanged
        ? targetId === null ? "focus-reset" : "focus-entered"
        : state.lastNotice,
    });
  }

  function getStarlightView(state, rawConfig) {
    assertState(state);
    const config = sanitizeStarlightConfig(rawConfig);
    const itemById = new Map(config.keepsakes.map((item) => [item.id, item]));
    const foundItems = state.foundIds.map((id) => cloneKeepsake(itemById.get(id)));
    const revealedItems = state.phase === "complete"
      ? TARGET_IDS.map((id) => cloneKeepsake(itemById.get(id)))
      : [];
    const complete = state.phase === "complete";
    const completionMessage = complete ? resolveCompletionMessage(state, config, foundItems) : null;
    return deepFreeze({
      phase: state.phase,
      canStart: state.phase === "intro",
      canSearch: state.phase === "searching",
      canDirectReveal: state.phase === "intro" || state.phase === "searching" || state.phase === "paused",
      canPause: state.phase === "searching",
      canResume: state.phase === "paused",
      canRestart: state.phase === "complete",
      nextGeneration: state.lastGeneration === Number.MAX_SAFE_INTEGER ? null : state.lastGeneration + 1,
      light: {
        x: state.light.x,
        y: state.light.y,
        engaged: state.controlMode !== null,
        controlMode: state.controlMode,
      },
      focus: {
        targetId: state.focusTargetId,
        ticks: state.focusTicks,
        requiredTicks: FOCUS_TICKS,
        permille: Math.floor(state.focusTicks * 1000 / FOCUS_TICKS),
      },
      discovery: {
        count: state.foundIds.length,
        total: TARGET_COUNT,
        foundIds: [...state.foundIds],
        foundItems,
        revealedItems,
        targets: TARGETS.map((target) => ({
          id: target.id,
          x: target.x,
          y: target.y,
          radius: target.radius,
          found: state.foundIds.includes(target.id),
        })),
      },
      activePointer: state.activePointer ? { ...state.activePointer } : null,
      notice: noticeText(state, itemById),
      text: {
        title: config.title,
        subtitle: config.subtitle,
        intro: config.intro,
        instruction: state.phase === "intro" ? config.intro : config.searchInstruction,
        status: statusText(state),
        completionTitle: complete ? config.completionTitle : null,
        completionMessage,
        signature: complete ? config.signature : null,
      },
    });
  }

  function sanitizeStarlightConfig(rawConfig) {
    if (rawConfig === undefined || rawConfig === null) return DEFAULT_CONFIG;
    const source = typeof rawConfig === "object" || typeof rawConfig === "function" ? rawConfig : {};
    const safe = {};
    for (const [key, limit, fallback] of CONFIG_FIELDS) {
      safe[key] = cleanText(readProperty(source, key), limit, fallback);
    }
    safe.keepsakes = sanitizeKeepsakes(readProperty(source, "keepsakes"));
    const strategy = readProperty(source, "composeStarlightLetter");
    safe.composeStarlightLetter = typeof strategy === "function"
      ? function safeComposeStarlightLetter(view) {
        return Reflect.apply(strategy, undefined, [view]);
      }
      : defaultComposeStarlightLetter;
    return deepFreeze(safe);
  }

  function sanitizeKeepsakes(rawKeepsakes) {
    if (!Array.isArray(rawKeepsakes) || rawKeepsakes.length !== TARGET_COUNT) return DEFAULT_KEEPSAKES;
    const byId = new Map();
    try {
      for (const item of rawKeepsakes) {
        if (!isPlainObject(item) || !hasExactKeys(item, ["id", "label", "note"])
          || !TARGET_IDS.includes(item.id) || byId.has(item.id)) return DEFAULT_KEEPSAKES;
        byId.set(item.id, item);
      }
    } catch (_error) {
      return DEFAULT_KEEPSAKES;
    }
    if (byId.size !== TARGET_COUNT) return DEFAULT_KEEPSAKES;
    return deepFreeze(DEFAULT_KEEPSAKES.map((fallback) => {
      const source = byId.get(fallback.id);
      return {
        id: fallback.id,
        label: cleanKeepsakeText(readProperty(source, "label"), 24, fallback.label),
        note: cleanKeepsakeText(readProperty(source, "note"), 100, fallback.note),
      };
    }));
  }

  function resolveCompletionMessage(state, config, foundItems) {
    const summary = deepFreeze({
      foundCount: foundItems.length,
      foundLabels: foundItems.map((item) => item.label),
      lastFoundLabel: foundItems.length ? foundItems[foundItems.length - 1].label : null,
      completionReason: state.completionReason,
      defaultMessage: config.defaultMessage,
    });
    try {
      const result = Reflect.apply(config.composeStarlightLetter, undefined, [summary]);
      if (typeof result !== "string") return config.defaultMessage;
      const trimmed = result.trim();
      return trimmed && [...trimmed].length <= 280 ? trimmed : config.defaultMessage;
    } catch (_error) {
      return config.defaultMessage;
    }
  }

  function noticeText(state, itemById) {
    if (state.phase === "complete") {
      return state.completionReason === "search" ? "五件小物都亮起来了。" : "整间屋子已经亮起来了。";
    }
    if (state.lastNotice === "started") return "灯已经提起来了。";
    if (state.lastNotice === "focus-entered") return "这里有一点微光，停一下。";
    if (state.lastNotice === "focus-reset") return "微光停留重新开始。";
    if (state.lastNotice === "paused") return "灯先放在这里。";
    if (state.lastNotice === "resumed") return "灯重新提起来了。";
    if (state.lastNotice === "found" && state.foundIds.length) {
      return `${itemById.get(state.foundIds[state.foundIds.length - 1]).label}已经亮起。`;
    }
    return null;
  }

  function statusText(state) {
    if (state.phase === "intro") return "五点微光还藏在夜色里。";
    if (state.phase === "paused") return `已经亮起 ${state.foundIds.length} / ${TARGET_COUNT}`;
    if (state.phase === "complete") return `已经亮起 ${TARGET_COUNT} / ${TARGET_COUNT}`;
    if (state.focusTargetId !== null) return `停留 ${state.focusTicks} / ${FOCUS_TICKS}`;
    return `已经亮起 ${state.foundIds.length} / ${TARGET_COUNT}`;
  }

  function replayStarlight(actions) {
    if (!Array.isArray(actions)) throw new TypeError("actions must be an array");
    let state = createStarlightState();
    for (const action of actions) state = reduceStarlight(state, action);
    return state;
  }

  function findStarlightTarget(x, y, foundIds) {
    assertPoint(x, y);
    if (!validFoundIds(foundIds)) throw new TypeError("invalid foundIds");
    return targetIdAt(x, y, foundIds);
  }

  function targetIdAt(x, y, foundIds) {
    for (const target of TARGETS) {
      if (foundIds.includes(target.id)) continue;
      const dx = x - target.x;
      const dy = y - target.y;
      if (dx * dx + dy * dy <= target.radius * target.radius) return target.id;
    }
    return null;
  }

  function validateStarlightTargets(targets) {
    try {
      if (!Array.isArray(targets) || targets.length !== TARGET_COUNT) return false;
      const ids = new Set();
      for (const target of targets) {
        if (!isPlainObject(target) || !hasExactKeys(target, ["id", "x", "y", "radius"])
          || !TARGET_IDS_FOR_VALIDATION.includes(target.id) || ids.has(target.id)
          || !Number.isSafeInteger(target.x) || !Number.isSafeInteger(target.y)
          || !Number.isSafeInteger(target.radius) || target.radius <= 0
          || target.x - target.radius < 0 || target.x + target.radius > WORLD_WIDTH
          || target.y - target.radius < 0 || target.y + target.radius > WORLD_HEIGHT) return false;
        const startDx = LIGHT_START_X - target.x;
        const startDy = LIGHT_START_Y - target.y;
        if (startDx * startDx + startDy * startDy <= target.radius * target.radius) return false;
        ids.add(target.id);
      }
      if (ids.size !== TARGET_COUNT) return false;
      for (let first = 0; first < targets.length; first += 1) {
        for (let second = first + 1; second < targets.length; second += 1) {
          const dx = targets[first].x - targets[second].x;
          const dy = targets[first].y - targets[second].y;
          const radii = targets[first].radius + targets[second].radius;
          if (dx * dx + dy * dy <= radii * radii) return false;
        }
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function assertState(state) {
    if (!isPlainObject(state) || !hasExactKeys(state, STATE_KEYS)
      || state.version !== 1 || !PHASES.includes(state.phase)
      || (state.resumePhase !== null && state.resumePhase !== "searching")
      || !validLight(state.light)
      || (state.controlMode !== null && !CONTROL_MODES.includes(state.controlMode))
      || !validActivePointer(state.activePointer)
      || !Number.isSafeInteger(state.lastGeneration) || state.lastGeneration < 0
      || !validHeldKeys(state.heldKeys)
      || (state.focusTargetId !== null && !TARGET_IDS.includes(state.focusTargetId))
      || !Number.isInteger(state.focusTicks) || state.focusTicks < 0 || state.focusTicks >= FOCUS_TICKS
      || !validFoundIds(state.foundIds)
      || (state.completionReason !== null && state.completionReason !== "search" && state.completionReason !== "direct")
      || !Number.isSafeInteger(state.announcementSerial) || state.announcementSerial < 0
      || (state.lastNotice !== null && !NOTICE_VALUES.includes(state.lastNotice))) {
      throw new TypeError("invalid starlight state");
    }
    if (state.focusTargetId === null && state.focusTicks !== 0) throw new TypeError("focus ticks without a target");
    if (state.focusTargetId !== null) {
      if (state.controlMode === null || state.foundIds.includes(state.focusTargetId)
        || targetIdAt(state.light.x, state.light.y, state.foundIds) !== state.focusTargetId) {
        throw new TypeError("invalid focused target");
      }
    }
    if (state.controlMode === "pointer") {
      if (state.activePointer === null || state.heldKeys.length !== 0
        || targetIdAt(state.light.x, state.light.y, state.foundIds) !== state.focusTargetId) {
        throw new TypeError("invalid pointer control");
      }
    } else if (state.controlMode === "keyboard") {
      if (state.activePointer !== null) throw new TypeError("invalid keyboard control");
    } else if (state.activePointer !== null || state.heldKeys.length !== 0 || state.focusTargetId !== null) {
      throw new TypeError("input exists without a control mode");
    }
    if (state.activePointer !== null && state.activePointer.generation !== state.lastGeneration) {
      throw new TypeError("active generation is not current");
    }
    if (state.phase === "intro") {
      if (state.resumePhase !== null || state.light.x !== LIGHT_START_X || state.light.y !== LIGHT_START_Y
        || state.controlMode !== null || state.activePointer !== null || state.lastGeneration !== 0
        || state.heldKeys.length !== 0 || state.focusTargetId !== null || state.focusTicks !== 0
        || state.foundIds.length !== 0 || state.completionReason !== null
        || state.announcementSerial !== 0 || state.lastNotice !== null) throw new TypeError("invalid intro state");
      return state;
    }
    if (state.announcementSerial < 1) throw new TypeError("invalid announcement serial");
    if (state.phase === "searching") {
      if (state.resumePhase !== null || state.completionReason !== null || state.foundIds.length >= TARGET_COUNT) {
        throw new TypeError("invalid searching state");
      }
      return state;
    }
    if (state.phase === "paused") {
      if (state.resumePhase !== "searching" || state.controlMode !== null || state.activePointer !== null
        || state.heldKeys.length !== 0 || state.focusTargetId !== null || state.focusTicks !== 0
        || state.foundIds.length >= TARGET_COUNT || state.completionReason !== null
        || state.lastNotice !== "paused") throw new TypeError("invalid paused state");
      return state;
    }
    if (state.resumePhase !== null || state.controlMode !== null || state.activePointer !== null
      || state.heldKeys.length !== 0 || state.focusTargetId !== null || state.focusTicks !== 0) {
      throw new TypeError("invalid complete input state");
    }
    if (state.completionReason === "search") {
      if (state.foundIds.length !== TARGET_COUNT || state.lastNotice !== "found") {
        throw new TypeError("invalid searched completion");
      }
    } else if (state.completionReason === "direct") {
      if (state.foundIds.length >= TARGET_COUNT) throw new TypeError("invalid direct completion");
    } else {
      throw new TypeError("complete state needs a reason");
    }
    return state;
  }

  function assertAction(action) {
    if (!isPlainObject(action) || typeof action.type !== "string") {
      throw new TypeError("action must be an object with a type");
    }
    if (["START", "ACTIVATE_KEYBOARD", "CENTER_LIGHT", "DIRECT_REVEAL", "RESUME", "RESTART"].includes(action.type)) {
      if (!hasExactKeys(action, ["type"])) throw new TypeError(`invalid ${action.type} action`);
      return;
    }
    if (action.type === "BEGIN_POINTER") {
      if (!hasExactKeys(action, ["type", "pointerId", "generation", "pointerType", "x", "y"])) {
        throw new TypeError("invalid BEGIN_POINTER action");
      }
      assertPointer(action.pointerId, action.generation);
      if (!POINTER_TYPES.includes(action.pointerType)) throw new TypeError("invalid pointer type");
      assertPoint(action.x, action.y);
      return;
    }
    if (action.type === "MOVE_POINTER") {
      if (!hasExactKeys(action, ["type", "pointerId", "generation", "x", "y"])) {
        throw new TypeError("invalid MOVE_POINTER action");
      }
      assertPointer(action.pointerId, action.generation);
      assertPoint(action.x, action.y);
      return;
    }
    if (action.type === "END_POINTER") {
      if (!hasExactKeys(action, ["type", "pointerId", "generation", "reason"])) {
        throw new TypeError("invalid END_POINTER action");
      }
      assertPointer(action.pointerId, action.generation);
      if (!POINTER_END_REASONS.includes(action.reason)) throw new TypeError("invalid pointer end reason");
      return;
    }
    if (action.type === "SET_KEY") {
      if (!hasExactKeys(action, ["type", "code", "pressed"])
        || !HELD_KEY_ORDER.includes(action.code) || typeof action.pressed !== "boolean") {
        throw new TypeError("invalid SET_KEY action");
      }
      return;
    }
    if (action.type === "TICK") {
      if (!hasExactKeys(action, ["type", "ticks"]) || !Number.isSafeInteger(action.ticks)
        || action.ticks < 1 || action.ticks > MAX_TICKS_PER_ACTION) throw new TypeError("invalid TICK action");
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

  function validLight(light) {
    return isPlainObject(light) && hasExactKeys(light, ["x", "y"])
      && Number.isSafeInteger(light.x) && light.x >= 0 && light.x <= WORLD_WIDTH
      && Number.isSafeInteger(light.y) && light.y >= 0 && light.y <= WORLD_HEIGHT;
  }

  function validActivePointer(active) {
    return active === null || (isPlainObject(active)
      && hasExactKeys(active, ["pointerId", "generation", "pointerType"])
      && Number.isSafeInteger(active.pointerId) && active.pointerId >= 0
      && Number.isSafeInteger(active.generation) && active.generation > 0
      && POINTER_TYPES.includes(active.pointerType));
  }

  function validHeldKeys(keys) {
    if (!Array.isArray(keys)) return false;
    const expected = HELD_KEY_ORDER.filter((key) => keys.includes(key));
    return expected.length === keys.length && expected.every((key, index) => key === keys[index]);
  }

  function validFoundIds(ids) {
    if (!Array.isArray(ids) || ids.length > TARGET_COUNT) return false;
    const seen = new Set();
    return ids.every((id) => TARGET_IDS.includes(id) && !seen.has(id) && Boolean(seen.add(id)));
  }

  function pointerMatches(state, action) {
    return state.phase === "searching" && state.controlMode === "pointer" && state.activePointer !== null
      && state.activePointer.pointerId === action.pointerId
      && state.activePointer.generation === action.generation;
  }

  function assertPointer(pointerId, generation) {
    if (!Number.isSafeInteger(pointerId) || pointerId < 0
      || !Number.isSafeInteger(generation) || generation < 1) throw new TypeError("invalid pointer session");
  }

  function assertPoint(x, y) {
    if (!Number.isSafeInteger(x) || x < 0 || x > WORLD_WIDTH
      || !Number.isSafeInteger(y) || y < 0 || y > WORLD_HEIGHT) throw new TypeError("invalid light point");
  }

  function cloneKeepsake(item) {
    return { id: item.id, label: item.label, note: item.note };
  }

  function cleanText(value, limit, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return [...trimmed].slice(0, limit).join("");
  }

  function cleanKeepsakeText(value, limit, fallback) {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed || [...trimmed].length > limit) return fallback;
    return trimmed;
  }

  function readProperty(source, key) {
    try {
      return source[key];
    } catch (_error) {
      return undefined;
    }
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function hasExactKeys(value, keys) {
    if (!isPlainObject(value)) return false;
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
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
    WORLD_WIDTH,
    WORLD_HEIGHT,
    LIGHT_START_X,
    LIGHT_START_Y,
    TARGET_COUNT,
    CAPTURE_RADIUS,
    TICK_MS,
    FOCUS_TICKS,
    KEYBOARD_STEP,
    MAX_TICKS_PER_ACTION,
    MAX_FRAME_GAP_MS,
    TARGETS,
    HELD_KEY_ORDER,
    DEFAULT_CONFIG,
    sanitizeStarlightConfig,
    validateStarlightTargets,
    createStarlightState,
    reduceStarlight,
    getStarlightView,
    findStarlightTarget,
    replayStarlight,
    assertState,
  });
});
