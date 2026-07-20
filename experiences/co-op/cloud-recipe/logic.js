(function (root, factory) {
  "use strict";

  let fileConfig = root && root.CLOUD_RECIPE_CONFIG;
  if (typeof module === "object" && module.exports) {
    fileConfig = fileConfig || require("./config.js");
  }
  const api = factory(fileConfig);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CloudRecipeLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (FILE_CONFIG) {
  "use strict";

  const LANE_COUNT = 7;
  const FIRST_LANE = 0;
  const LAST_LANE = 6;
  const DEFAULT_LEFT_LANE = 2;
  const DEFAULT_RIGHT_LANE = 4;
  const TICKS_PER_SECOND = 30;
  const WAVE_TICKS = 120;
  const MAX_CATCH_UP_TICKS = 5;
  const RECIPE_COUNT = 3;
  const WAVES_PER_RECIPE = 3;
  const PHASES = Object.freeze([
    "intro", "recipe-intro", "falling", "retry", "wave-result", "recipe-result", "complete",
  ]);
  const STATE_KEYS = Object.freeze([
    "phase", "recipeIndex", "waveIndex", "waveTick", "leftLane", "rightLane",
    "attempt", "lastResult", "completedWaves", "revision",
  ]);
  const DEFAULT_SEATS = Object.freeze(["你", "我"]);
  const DEFAULT_COMPLETION_NOTE = "你和我，往后的雨，也一起调成喜欢的颜色。";

  function deepFreeze(value, seen) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    if (Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    }
    return Object.freeze(value);
  }

  const INGREDIENTS = deepFreeze({
    blue: { id: "blue", label: "晴蓝露", symbol: "水滴" },
    gold: { id: "gold", label: "日光蜜", symbol: "光滴" },
    rose: { id: "rose", label: "晚霞汁", symbol: "花滴" },
  });

  const RECIPES = deepFreeze([
    {
      id: "morning-dew",
      title: "晨光露",
      note: "给今天留一口亮晶晶的开始。",
      waves: [
        { id: "morning-blue", ingredientId: "blue", targetLeft: 1, targetRight: 3 },
        { id: "morning-gold", ingredientId: "gold", targetLeft: 3, targetRight: 5 },
        { id: "morning-rose", ingredientId: "rose", targetLeft: 0, targetRight: 2 },
      ],
    },
    {
      id: "sunset-syrup",
      title: "晚霞糖露",
      note: "把慢下来的傍晚装进同一只瓶子。",
      waves: [
        { id: "sunset-rose", ingredientId: "rose", targetLeft: 4, targetRight: 6 },
        { id: "sunset-blue", ingredientId: "blue", targetLeft: 1, targetRight: 2 },
        { id: "sunset-gold", ingredientId: "gold", targetLeft: 3, targetRight: 6 },
      ],
    },
    {
      id: "star-soda",
      title: "星夜汽水",
      note: "最后一口，留给一起抬头的夜晚。",
      waves: [
        { id: "star-gold", ingredientId: "gold", targetLeft: 0, targetRight: 1 },
        { id: "star-rose", ingredientId: "rose", targetLeft: 1, targetRight: 5 },
        { id: "star-blue", ingredientId: "blue", targetLeft: 5, targetRight: 6 },
      ],
    },
  ]);

  function isPlainObject(value) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      return (prototype === Object.prototype || prototype === null)
        && Object.getOwnPropertySymbols(value).length === 0;
    } catch (_error) {
      return false;
    }
  }

  function exactDataObject(value, keys) {
    try {
      if (!isPlainObject(value)) return false;
      const ownKeys = Object.keys(value);
      if (ownKeys.length !== keys.length || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;
      return keys.every((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
      });
    } catch (_error) {
      return false;
    }
  }

  function safeRead(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function cloneFrozen(value) {
    if (Array.isArray(value)) return deepFreeze(value.map(cloneFrozen));
    if (isPlainObject(value)) {
      const result = {};
      Object.keys(value).forEach((key) => { result[key] = cloneFrozen(value[key]); });
      return deepFreeze(result);
    }
    return value;
  }

  function sameData(left, right) {
    try {
      if (Object.is(left, right)) return true;
      if (typeof left !== typeof right || left === null || right === null || typeof left !== "object") return false;
      if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left) && Array.isArray(right) && left.length === right.length
          && left.every((item, index) => sameData(item, right[index]));
      }
      if (!isPlainObject(left) || !isPlainObject(right)) return false;
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      return leftKeys.length === rightKeys.length && leftKeys.every((key) => (
        Object.prototype.hasOwnProperty.call(right, key) && sameData(left[key], right[key])
      ));
    } catch (_error) {
      return false;
    }
  }

  function validWave(wave) {
    return exactDataObject(wave, ["id", "ingredientId", "targetLeft", "targetRight"])
      && typeof wave.id === "string" && wave.id.length > 0
      && Object.prototype.hasOwnProperty.call(INGREDIENTS, wave.ingredientId)
      && Number.isSafeInteger(wave.targetLeft) && Number.isSafeInteger(wave.targetRight)
      && wave.targetLeft >= FIRST_LANE && wave.targetRight <= LAST_LANE
      && wave.targetLeft < wave.targetRight;
  }

  function createWaveDrops(wave) {
    if (!validWave(wave)) return deepFreeze([]);
    const drops = [
      { id: `${wave.id}-target-left`, kind: "target", side: "left", lane: wave.targetLeft, ingredientId: wave.ingredientId },
      { id: `${wave.id}-target-right`, kind: "target", side: "right", lane: wave.targetRight, ingredientId: wave.ingredientId },
    ];
    if (wave.targetLeft > FIRST_LANE) {
      drops.push({ id: `${wave.id}-grey-left`, kind: "grey", side: "left", lane: wave.targetLeft - 1, ingredientId: null });
    }
    if (wave.targetRight < LAST_LANE) {
      drops.push({ id: `${wave.id}-grey-right`, kind: "grey", side: "right", lane: wave.targetRight + 1, ingredientId: null });
    }
    const kindOrder = { target: 0, grey: 1 };
    const sideOrder = { left: 0, right: 1 };
    drops.sort((left, right) => left.lane - right.lane
      || kindOrder[left.kind] - kindOrder[right.kind]
      || sideOrder[left.side] - sideOrder[right.side]);
    return deepFreeze(drops);
  }

  function resolveCatch(wave, leftLane, rightLane) {
    if (!validWave(wave) || !validInterval(leftLane, rightLane)) return invalidResolution();
    const drops = createWaveDrops(wave);
    const caught = drops.filter((drop) => drop.lane >= leftLane && drop.lane <= rightLane);
    const caughtTargets = caught.filter((drop) => drop.kind === "target");
    const caughtGreys = caught.filter((drop) => drop.kind === "grey");
    const missedTargets = drops.filter((drop) => drop.kind === "target" && !caught.includes(drop));
    const status = caughtGreys.length > 0 ? "contamination" : missedTargets.length > 0 ? "missed" : "success";
    return deepFreeze({
      status,
      interval: { leftLane, rightLane },
      caughtIds: caught.map((drop) => drop.id),
      caughtTargetIds: caughtTargets.map((drop) => drop.id),
      caughtGreyIds: caughtGreys.map((drop) => drop.id),
      missedTargetIds: missedTargets.map((drop) => drop.id),
      missedSides: missedTargets.map((drop) => drop.side),
    });
  }

  function invalidResolution() {
    return deepFreeze({
      status: "invalid",
      interval: { leftLane: DEFAULT_LEFT_LANE, rightLane: DEFAULT_RIGHT_LANE },
      caughtIds: [], caughtTargetIds: [], caughtGreyIds: [], missedTargetIds: [], missedSides: [],
    });
  }

  function validInterval(leftLane, rightLane) {
    return Number.isSafeInteger(leftLane) && Number.isSafeInteger(rightLane)
      && leftLane >= FIRST_LANE && rightLane <= LAST_LANE && leftLane <= rightLane;
  }

  function enumerateIntervals() {
    const intervals = [];
    for (let leftLane = FIRST_LANE; leftLane <= LAST_LANE; leftLane += 1) {
      for (let rightLane = leftLane; rightLane <= LAST_LANE; rightLane += 1) {
        intervals.push({ leftLane, rightLane });
      }
    }
    return deepFreeze(intervals);
  }

  const INTERVALS = enumerateIntervals();

  function findSuccessfulIntervals(wave) {
    if (!validWave(wave)) return deepFreeze([]);
    return deepFreeze(INTERVALS
      .filter(({ leftLane, rightLane }) => resolveCatch(wave, leftLane, rightLane).status === "success")
      .map(cloneFrozen));
  }

  function validateRecipes(recipes) {
    try {
      if (!Array.isArray(recipes) || recipes.length !== RECIPE_COUNT) return false;
      const recipeIds = new Set();
      const waveIds = new Set();
      for (let recipeIndex = 0; recipeIndex < recipes.length; recipeIndex += 1) {
        const recipe = recipes[recipeIndex];
        if (!exactDataObject(recipe, ["id", "title", "note", "waves"]) || typeof recipe.id !== "string"
          || !recipe.id || typeof recipe.title !== "string" || !recipe.title || typeof recipe.note !== "string" || !recipe.note
          || recipeIds.has(recipe.id) || !Array.isArray(recipe.waves) || recipe.waves.length !== WAVES_PER_RECIPE) return false;
        recipeIds.add(recipe.id);
        const ingredients = new Set();
        for (const wave of recipe.waves) {
          if (!validWave(wave) || waveIds.has(wave.id) || ingredients.has(wave.ingredientId)
            || wave.targetLeft === DEFAULT_LEFT_LANE || wave.targetRight === DEFAULT_RIGHT_LANE) return false;
          waveIds.add(wave.id);
          ingredients.add(wave.ingredientId);
          const solutions = findSuccessfulIntervals(wave);
          if (solutions.length !== 1 || solutions[0].leftLane !== wave.targetLeft || solutions[0].rightLane !== wave.targetRight) return false;
        }
        if (ingredients.size !== Object.keys(INGREDIENTS).length) return false;
        if (!sameData(recipe, RECIPES[recipeIndex])) return false;
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  function normalizeRecipes(recipes) {
    return validateRecipes(recipes) ? cloneFrozen(recipes) : cloneFrozen(RECIPES);
  }

  function trimCodePoints(value, limit) {
    return [...value.trim()].slice(0, limit).join("");
  }

  function normalizeSeats(value) {
    try {
      if (!Array.isArray(value) || value.length !== 2) return [...DEFAULT_SEATS];
      const names = value.map((name) => typeof name === "string" ? trimCodePoints(name, 12) : "");
      if (names.some((name) => !name) || names[0] === names[1]) return [...DEFAULT_SEATS];
      return names;
    } catch (_error) {
      return [...DEFAULT_SEATS];
    }
  }

  function defaultComposer(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，往后的雨，也一起调成喜欢的颜色。`;
  }

  function normalizeConfig(raw) {
    const source = raw === undefined ? FILE_CONFIG : raw;
    const seats = isPlainObject(source) ? normalizeSeats(safeRead(source, "seats")) : [...DEFAULT_SEATS];
    const candidate = isPlainObject(source) ? safeRead(source, "composeCompletionNote") : undefined;
    const composeCompletionNote = typeof candidate === "function"
      ? function isolatedCompletionComposer(summary) { return candidate(summary); }
      : defaultComposer;
    return deepFreeze({
      seats,
      composeCompletionNote,
    });
  }

  function createInitialState() {
    return makeState({
      phase: "intro", recipeIndex: 0, waveIndex: 0, waveTick: 0,
      leftLane: DEFAULT_LEFT_LANE, rightLane: DEFAULT_RIGHT_LANE,
      attempt: 1, lastResult: null, completedWaves: [], revision: 0,
    });
  }

  function makeState(fields) {
    return deepFreeze({
      phase: fields.phase,
      recipeIndex: fields.recipeIndex,
      waveIndex: fields.waveIndex,
      waveTick: fields.waveTick,
      leftLane: fields.leftLane,
      rightLane: fields.rightLane,
      attempt: fields.attempt,
      lastResult: fields.lastResult ? cloneFrozen(fields.lastResult) : null,
      completedWaves: fields.completedWaves.map(cloneFrozen),
      revision: fields.revision,
    });
  }

  function currentWave(state) {
    return RECIPES[state.recipeIndex].waves[state.waveIndex];
  }

  function expectedPrefix(length) {
    const result = [];
    for (const recipe of RECIPES) {
      for (const wave of recipe.waves) {
        if (result.length === length) return result;
        result.push({ recipeId: recipe.id, waveId: wave.id });
      }
    }
    return result;
  }

  function validCompletedWaves(items) {
    if (!Array.isArray(items) || items.length > RECIPE_COUNT * WAVES_PER_RECIPE) return false;
    const expected = expectedPrefix(items.length);
    let totalAttempts = 0;
    const valid = items.every((item, index) => exactDataObject(item, ["recipeId", "waveId", "attempts"])
      && item.recipeId === expected[index].recipeId && item.waveId === expected[index].waveId
      && Number.isSafeInteger(item.attempts) && item.attempts >= 1);
    if (!valid) return false;
    for (const item of items) {
      totalAttempts += item.attempts;
      if (!Number.isSafeInteger(totalAttempts)) return false;
    }
    return true;
  }

  function isCloudRecipeState(value) {
    try {
      if (!exactDataObject(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
      if (!Number.isSafeInteger(value.recipeIndex) || value.recipeIndex < 0 || value.recipeIndex >= RECIPE_COUNT
        || !Number.isSafeInteger(value.waveIndex) || value.waveIndex < 0 || value.waveIndex >= WAVES_PER_RECIPE
        || !Number.isSafeInteger(value.waveTick) || value.waveTick < 0
        || !validInterval(value.leftLane, value.rightLane)
        || !Number.isSafeInteger(value.attempt) || value.attempt < 1
        || !Number.isSafeInteger(value.revision) || value.revision < 0
        || !validCompletedWaves(value.completedWaves)) return false;

      const ordinal = value.recipeIndex * WAVES_PER_RECIPE + value.waveIndex;
      if (value.phase === "intro") return value.recipeIndex === 0 && value.waveIndex === 0 && value.waveTick === 0
        && value.leftLane === DEFAULT_LEFT_LANE && value.rightLane === DEFAULT_RIGHT_LANE
        && value.attempt === 1 && value.lastResult === null && value.completedWaves.length === 0;
      if (value.phase === "recipe-intro") return value.waveIndex === 0 && value.waveTick === 0
        && value.leftLane === DEFAULT_LEFT_LANE && value.rightLane === DEFAULT_RIGHT_LANE
        && value.attempt === 1 && value.lastResult === null && value.completedWaves.length === ordinal;
      if (value.phase === "falling") return value.waveTick >= 0 && value.waveTick < WAVE_TICKS
        && value.lastResult === null && value.completedWaves.length === ordinal;
      if (value.waveTick !== 0) return false;
      const expectedResult = resolveCatch(currentWave(value), value.leftLane, value.rightLane);
      if (!sameData(value.lastResult, expectedResult)) return false;
      if (value.phase === "retry") return (value.lastResult.status === "missed" || value.lastResult.status === "contamination")
        && value.completedWaves.length === ordinal;
      if (value.lastResult.status !== "success" || value.completedWaves.length !== ordinal + 1
        || value.completedWaves[ordinal].attempts !== value.attempt) return false;
      if (value.phase === "wave-result") return value.waveIndex < WAVES_PER_RECIPE - 1;
      if (value.phase === "recipe-result") return value.waveIndex === WAVES_PER_RECIPE - 1;
      return value.phase === "complete" && value.recipeIndex === RECIPE_COUNT - 1
        && value.waveIndex === WAVES_PER_RECIPE - 1 && value.completedWaves.length === RECIPE_COUNT * WAVES_PER_RECIPE;
    } catch (_error) {
      return false;
    }
  }

  const ACTION_KEYS = deepFreeze({
    START: ["type"],
    BEGIN_RECIPE: ["type"],
    MOVE_BOUNDARY: ["type", "seat", "direction"],
    STEP: ["type", "ticks"],
    RETRY: ["type"],
    NEXT_WAVE: ["type"],
    NEXT_RECIPE: ["type"],
    RESTART: ["type"],
  });

  function validAction(action) {
    if (!isPlainObject(action)) return false;
    const type = safeRead(action, "type");
    const keys = ACTION_KEYS[type];
    if (!keys || !exactDataObject(action, keys)) return false;
    if (type === "MOVE_BOUNDARY") return (action.seat === 0 || action.seat === 1) && (action.direction === -1 || action.direction === 1);
    if (type === "STEP") return Number.isSafeInteger(action.ticks) && action.ticks >= 1 && action.ticks <= MAX_CATCH_UP_TICKS;
    return true;
  }

  function reduceCloudRecipe(state, action) {
    const current = isCloudRecipeState(state) ? state : createInitialState();
    if (!isCloudRecipeState(state)) return current;
    if (!validAction(action)) return current;
    if (action.type === "RESTART") {
      if (current.phase === "intro") return current;
      return changed(current, createInitialState());
    }
    if (action.type === "START") {
      return current.phase === "intro" ? changed(current, { phase: "recipe-intro" }) : current;
    }
    if (action.type === "BEGIN_RECIPE") {
      return current.phase === "recipe-intro" ? changed(current, { phase: "falling" }) : current;
    }
    if (action.type === "MOVE_BOUNDARY") return moveBoundary(current, action.seat, action.direction);
    if (action.type === "STEP") return step(current, action.ticks);
    if (action.type === "RETRY") {
      if (current.phase !== "retry") return current;
      return changed(current, {
        phase: "falling", waveTick: 0, leftLane: DEFAULT_LEFT_LANE, rightLane: DEFAULT_RIGHT_LANE,
        attempt: current.attempt + 1, lastResult: null,
      });
    }
    if (action.type === "NEXT_WAVE") {
      if (current.phase !== "wave-result") return current;
      return changed(current, {
        phase: "falling", waveIndex: current.waveIndex + 1, waveTick: 0,
        leftLane: DEFAULT_LEFT_LANE, rightLane: DEFAULT_RIGHT_LANE, attempt: 1, lastResult: null,
      });
    }
    if (action.type === "NEXT_RECIPE") {
      if (current.phase !== "recipe-result") return current;
      if (current.recipeIndex === RECIPE_COUNT - 1) return changed(current, { phase: "complete" });
      return changed(current, {
        phase: "recipe-intro", recipeIndex: current.recipeIndex + 1, waveIndex: 0, waveTick: 0,
        leftLane: DEFAULT_LEFT_LANE, rightLane: DEFAULT_RIGHT_LANE, attempt: 1, lastResult: null,
      });
    }
    return current;
  }

  function changed(state, patch) {
    if (!Number.isSafeInteger(state.revision + 1)) return state;
    const next = makeState({ ...state, ...patch, revision: state.revision + 1 });
    return isCloudRecipeState(next) ? next : state;
  }

  function moveBoundary(state, seat, direction) {
    if (state.phase !== "falling") return state;
    if (seat === 0) {
      const leftLane = state.leftLane + direction;
      if (leftLane < FIRST_LANE || leftLane > state.rightLane) return state;
      return changed(state, { leftLane });
    }
    const rightLane = state.rightLane + direction;
    if (rightLane > LAST_LANE || rightLane < state.leftLane) return state;
    return changed(state, { rightLane });
  }

  function step(state, ticks) {
    if (state.phase !== "falling") return state;
    const consumed = Math.min(ticks, WAVE_TICKS - state.waveTick);
    const nextTick = state.waveTick + consumed;
    if (nextTick < WAVE_TICKS) return changed(state, { waveTick: nextTick });
    const result = resolveCatch(currentWave(state), state.leftLane, state.rightLane);
    if (result.status !== "success") return changed(state, { phase: "retry", waveTick: 0, lastResult: result });
    const completedWaves = [...state.completedWaves, {
      recipeId: RECIPES[state.recipeIndex].id,
      waveId: currentWave(state).id,
      attempts: state.attempt,
    }];
    return changed(state, {
      phase: state.waveIndex === WAVES_PER_RECIPE - 1 ? "recipe-result" : "wave-result",
      waveTick: 0,
      lastResult: result,
      completedWaves,
    });
  }

  function replayCloudRecipe(actions, initialState) {
    let state = isCloudRecipeState(initialState) ? makeState(initialState) : createInitialState();
    if (!Array.isArray(actions)) return state;
    for (const action of actions) state = reduceCloudRecipe(state, action);
    return state;
  }

  function classifyBoundaryKey(eventLike) {
    if (!eventLike || (typeof eventLike !== "object" && typeof eventLike !== "function")) return null;
    const repeat = readEventProperty(eventLike, "repeat");
    const code = readEventProperty(eventLike, "code");
    if (!repeat.ok || !code.ok || repeat.value === true) return null;
    const mapped = {
      KeyA: { type: "MOVE_BOUNDARY", seat: 0, direction: -1 },
      KeyD: { type: "MOVE_BOUNDARY", seat: 0, direction: 1 },
      ArrowLeft: { type: "MOVE_BOUNDARY", seat: 1, direction: -1 },
      ArrowRight: { type: "MOVE_BOUNDARY", seat: 1, direction: 1 },
    }[code.value];
    return mapped ? deepFreeze(mapped) : null;
  }

  function readEventProperty(eventLike, key) {
    try {
      return { ok: true, value: eventLike[key] };
    } catch (_error) {
      return { ok: false, value: undefined };
    }
  }

  function completionSummary(state, config) {
    if (!isCloudRecipeState(state) || state.phase !== "complete") return null;
    const clean = normalizeConfig(config);
    return deepFreeze({
      seats: [...clean.seats],
      completedRecipeIds: RECIPES.map((recipe) => recipe.id),
      completedWaveCount: state.completedWaves.length,
      totalAttempts: state.completedWaves.reduce((total, item) => total + item.attempts, 0),
    });
  }

  function mutationTrackingClone(summary) {
    let mutated = false;
    const wrap = (value) => {
      if (!value || typeof value !== "object") return value;
      const target = Array.isArray(value) ? value.map(wrap) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wrap(item)]));
      deepFreeze(target);
      return new Proxy(target, {
        set() { mutated = true; return false; },
        deleteProperty() { mutated = true; return false; },
        defineProperty() { mutated = true; return false; },
        setPrototypeOf() { mutated = true; return false; },
      });
    };
    return { value: wrap(cloneFrozen(summary)), wasMutated: () => mutated };
  }

  function resolveCompletionNote(composer, summary) {
    if (!isCompletionSummary(summary)) return DEFAULT_COMPLETION_NOTE;
    const fallback = defaultComposer(summary);
    if (typeof composer !== "function") return fallback;
    const tracked = mutationTrackingClone(summary);
    try {
      const result = composer(tracked.value);
      if (tracked.wasMutated() || typeof result !== "string") return fallback;
      const clean = result.trim();
      return clean && [...clean].length <= 120 ? clean : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function isCompletionSummary(summary) {
    return exactDataObject(summary, ["seats", "completedRecipeIds", "completedWaveCount", "totalAttempts"])
      && Array.isArray(summary.seats) && summary.seats.length === 2
      && summary.seats.every((name) => typeof name === "string" && name.trim() && [...name].length <= 12)
      && Array.isArray(summary.completedRecipeIds) && sameData(summary.completedRecipeIds, RECIPES.map((recipe) => recipe.id))
      && summary.completedWaveCount === RECIPE_COUNT * WAVES_PER_RECIPE
      && Number.isSafeInteger(summary.totalAttempts) && summary.totalAttempts >= summary.completedWaveCount;
  }

  function getPublicView(state) {
    if (!isCloudRecipeState(state)) return null;
    const recipe = RECIPES[state.recipeIndex];
    const wave = recipe.waves[state.waveIndex];
    const ingredient = INGREDIENTS[wave.ingredientId];
    const completedRecipes = RECIPES.slice(0, Math.floor(state.completedWaves.length / WAVES_PER_RECIPE)).map((item, index) => ({
      id: item.id,
      title: item.title,
      totalAttempts: state.completedWaves.slice(index * WAVES_PER_RECIPE, (index + 1) * WAVES_PER_RECIPE)
        .reduce((total, completed) => total + completed.attempts, 0),
    }));
    return deepFreeze({
      phase: state.phase,
      recipe: { index: state.recipeIndex, total: RECIPE_COUNT, id: recipe.id, title: recipe.title, note: recipe.note },
      wave: {
        index: state.waveIndex, total: WAVES_PER_RECIPE, id: wave.id,
        ingredientId: ingredient.id, ingredientLabel: ingredient.label, ingredientSymbol: ingredient.symbol,
      },
      timing: {
        tick: state.phase === "falling" ? state.waveTick : 0,
        totalTicks: WAVE_TICKS,
        progressPermille: state.phase === "falling" ? Math.floor(state.waveTick * 1000 / WAVE_TICKS) : 0,
      },
      cloud: { leftLane: state.leftLane, rightLane: state.rightLane, widthLanes: state.rightLane - state.leftLane + 1 },
      drops: createWaveDrops(wave).map((drop) => ({
        ...drop,
        caughtAtCurrentInterval: drop.lane >= state.leftLane && drop.lane <= state.rightLane,
      })),
      attempt: state.attempt,
      lastResult: state.lastResult ? cloneFrozen(state.lastResult) : null,
      completedRecipes,
      completedWaveCount: state.completedWaves.length,
      controls: {
        canStart: state.phase === "intro",
        canBeginRecipe: state.phase === "recipe-intro",
        canMove: state.phase === "falling",
        canRetry: state.phase === "retry",
        canNextWave: state.phase === "wave-result",
        canNextRecipe: state.phase === "recipe-result",
        canRestart: true,
      },
      announcementCode: announcementCode(state),
    });
  }

  function announcementCode(state) {
    if (state.phase === "retry") {
      return state.lastResult.status === "contamination"
        ? "retry-contamination"
        : `retry-missed-${state.lastResult.missedSides.join("-")}`;
    }
    if (state.phase === "wave-result") return "wave-success";
    if (state.phase === "recipe-result") return "recipe-complete";
    if (state.phase === "complete") return "complete";
    return state.phase;
  }

  return deepFreeze({
    LANE_COUNT, FIRST_LANE, LAST_LANE, DEFAULT_LEFT_LANE, DEFAULT_RIGHT_LANE,
    TICKS_PER_SECOND, WAVE_TICKS, MAX_CATCH_UP_TICKS, RECIPE_COUNT, WAVES_PER_RECIPE,
    PHASES, INGREDIENTS, RECIPES, DEFAULT_SEATS, DEFAULT_COMPLETION_NOTE,
    deepFreeze, validateRecipes, normalizeRecipes, createWaveDrops, resolveCatch,
    enumerateIntervals, findSuccessfulIntervals, normalizeConfig, createInitialState,
    isCloudRecipeState, reduceCloudRecipe, replayCloudRecipe, classifyBoundaryKey,
    completionSummary, resolveCompletionNote, getPublicView,
  });
});
