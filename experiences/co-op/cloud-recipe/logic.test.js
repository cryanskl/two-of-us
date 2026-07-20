import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

await import("./config.js");
await import("./logic.js");

const logic = globalThis.CloudRecipeLogic;
const fileConfig = globalThis.CLOUD_RECIPE_CONFIG;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new Set()) {
  if ((!value || typeof value !== "object") && typeof value !== "function") return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  Reflect.ownKeys(value).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  });
}

function dispatch(state, ...actions) {
  return actions.reduce((current, action) => logic.reduceCloudRecipe(current, action), state);
}

function beginGame() {
  return dispatch(logic.createInitialState(), { type: "START" }, { type: "BEGIN_RECIPE" });
}

function moveToTarget(state) {
  const wave = logic.RECIPES[state.recipeIndex].waves[state.waveIndex];
  while (state.rightLane < wave.targetRight) {
    state = logic.reduceCloudRecipe(state, { type: "MOVE_BOUNDARY", seat: 1, direction: 1 });
  }
  while (state.leftLane > wave.targetLeft) {
    state = logic.reduceCloudRecipe(state, { type: "MOVE_BOUNDARY", seat: 0, direction: -1 });
  }
  while (state.leftLane < wave.targetLeft) {
    state = logic.reduceCloudRecipe(state, {
      type: "MOVE_BOUNDARY",
      seat: 0,
      direction: 1,
    });
  }
  while (state.rightLane > wave.targetRight) {
    state = logic.reduceCloudRecipe(state, {
      type: "MOVE_BOUNDARY",
      seat: 1,
      direction: -1,
    });
  }
  return state;
}

function finishCurrentWave(state) {
  state = moveToTarget(state);
  for (let ticks = 0; ticks < logic.WAVE_TICKS; ticks += logic.MAX_CATCH_UP_TICKS) {
    state = logic.reduceCloudRecipe(state, { type: "STEP", ticks: logic.MAX_CATCH_UP_TICKS });
  }
  return state;
}

function completeGame() {
  let state = beginGame();
  for (let recipeIndex = 0; recipeIndex < logic.RECIPE_COUNT; recipeIndex += 1) {
    for (let waveIndex = 0; waveIndex < logic.WAVES_PER_RECIPE; waveIndex += 1) {
      state = finishCurrentWave(state);
      if (waveIndex < logic.WAVES_PER_RECIPE - 1) {
        state = logic.reduceCloudRecipe(state, { type: "NEXT_WAVE" });
      }
    }
    state = logic.reduceCloudRecipe(state, { type: "NEXT_RECIPE" });
    if (recipeIndex < logic.RECIPE_COUNT - 1) {
      state = logic.reduceCloudRecipe(state, { type: "BEGIN_RECIPE" });
    }
  }
  return state;
}

test("exports the recursively frozen fixed contract", () => {
  assert.deepEqual([
    logic.LANE_COUNT, logic.FIRST_LANE, logic.LAST_LANE,
    logic.DEFAULT_LEFT_LANE, logic.DEFAULT_RIGHT_LANE,
    logic.TICKS_PER_SECOND, logic.WAVE_TICKS, logic.MAX_CATCH_UP_TICKS,
    logic.RECIPE_COUNT, logic.WAVES_PER_RECIPE,
  ], [7, 0, 6, 2, 4, 30, 120, 5, 3, 3]);
  assert.deepEqual(Object.keys(logic.INGREDIENTS), ["blue", "gold", "rose"]);
  assert.equal(logic.RECIPES.length, 3);
  assertDeepFrozen(logic);
  assertDeepFrozen(fileConfig);
});

test("classic wrappers expose the same browser and CommonJS contracts", () => {
  const context = createContext({});
  const execute = (file) => runInContext(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    context,
    { filename: file },
  );
  context.module = { exports: {} };
  context.exports = context.module.exports;
  execute("config.js");
  const commonConfig = context.module.exports;
  assert.strictEqual(context.CLOUD_RECIPE_CONFIG, commonConfig);

  context.CLOUD_RECIPE_CONFIG = undefined;
  context.module = { exports: {} };
  context.exports = context.module.exports;
  const required = [];
  context.require = (specifier) => {
    required.push(specifier);
    return commonConfig;
  };
  execute("logic.js");
  assert.deepEqual(required, ["./config.js"]);
  assert.strictEqual(context.CloudRecipeLogic, context.module.exports);
  assert.equal(context.module.exports.RECIPES.length, 3);
});

test("validates only the exact frozen recipe set and falls back as a whole", () => {
  assert.equal(logic.validateRecipes(clone(logic.RECIPES)), true);
  const cases = [];
  const extra = clone(logic.RECIPES); extra[0].extra = true; cases.push(extra);
  const duplicateRecipe = clone(logic.RECIPES); duplicateRecipe[1].id = duplicateRecipe[0].id; cases.push(duplicateRecipe);
  const duplicateWave = clone(logic.RECIPES); duplicateWave[1].waves[0].id = duplicateWave[0].waves[0].id; cases.push(duplicateWave);
  const duplicateIngredient = clone(logic.RECIPES); duplicateIngredient[0].waves[1].ingredientId = "blue"; cases.push(duplicateIngredient);
  const badTarget = clone(logic.RECIPES); badTarget[0].waves[0].targetLeft = 1.5; cases.push(badTarget);
  const noLeftAction = clone(logic.RECIPES); noLeftAction[0].waves[0].targetLeft = 2; cases.push(noLeftAction);
  const reordered = clone(logic.RECIPES); reordered[0].waves.reverse(); cases.push(reordered);
  const getter = clone(logic.RECIPES); Object.defineProperty(getter[0], "title", { get() { throw new Error("boom"); } }); cases.push(getter);
  cases.forEach((recipes) => {
    assert.equal(logic.validateRecipes(recipes), false);
    assert.deepEqual(logic.normalizeRecipes(recipes), logic.RECIPES);
    assert.notStrictEqual(logic.normalizeRecipes(recipes), logic.RECIPES);
  });
});

test("creates exact ordered drops and omits out-of-range grey drops", () => {
  assert.deepEqual(logic.createWaveDrops(logic.RECIPES[0].waves[0]), [
    { id: "morning-blue-grey-left", kind: "grey", side: "left", lane: 0, ingredientId: null },
    { id: "morning-blue-target-left", kind: "target", side: "left", lane: 1, ingredientId: "blue" },
    { id: "morning-blue-target-right", kind: "target", side: "right", lane: 3, ingredientId: "blue" },
    { id: "morning-blue-grey-right", kind: "grey", side: "right", lane: 4, ingredientId: null },
  ]);
  const leftEdge = logic.createWaveDrops(logic.RECIPES[0].waves[2]);
  const rightEdge = logic.createWaveDrops(logic.RECIPES[1].waves[0]);
  assert.equal(leftEdge.some((drop) => drop.id.endsWith("grey-left")), false);
  assert.equal(rightEdge.some((drop) => drop.id.endsWith("grey-right")), false);
  assertDeepFrozen(leftEdge);
  assert.deepEqual(logic.createWaveDrops({ id: "bad", ingredientId: "blue", targetLeft: 4, targetRight: 1 }), []);
});

test("enumerates 28 intervals in stable left-major order", () => {
  const intervals = logic.enumerateIntervals();
  assert.equal(intervals.length, 28);
  assert.deepEqual(intervals.slice(0, 8), [
    { leftLane: 0, rightLane: 0 }, { leftLane: 0, rightLane: 1 },
    { leftLane: 0, rightLane: 2 }, { leftLane: 0, rightLane: 3 },
    { leftLane: 0, rightLane: 4 }, { leftLane: 0, rightLane: 5 },
    { leftLane: 0, rightLane: 6 }, { leftLane: 1, rightLane: 1 },
  ]);
  assert.deepEqual(intervals.at(-1), { leftLane: 6, rightLane: 6 });
  assertDeepFrozen(intervals);
});

test("all nine waves have exactly their target interval as the unique success", () => {
  logic.RECIPES.flatMap((recipe) => recipe.waves).forEach((wave) => {
    assert.deepEqual(logic.findSuccessfulIntervals(wave), [{ leftLane: wave.targetLeft, rightLane: wave.targetRight }]);
    assert.notEqual(wave.targetLeft, logic.DEFAULT_LEFT_LANE);
    assert.notEqual(wave.targetRight, logic.DEFAULT_RIGHT_LANE);
  });
});

test("catch resolution is closed, contamination-first and invalid-safe", () => {
  const wave = logic.RECIPES[0].waves[0];
  assert.equal(logic.resolveCatch(wave, 1, 3).status, "success");
  const contamination = logic.resolveCatch(wave, 0, 2);
  assert.equal(contamination.status, "contamination");
  assert.deepEqual(contamination.missedSides, ["right"]);
  assert.deepEqual(contamination.caughtGreyIds, ["morning-blue-grey-left"]);
  const missed = logic.resolveCatch(wave, 1, 2);
  assert.equal(missed.status, "missed");
  assert.deepEqual(missed.missedSides, ["right"]);
  assert.deepEqual(logic.resolveCatch(wave, -1, 3), {
    status: "invalid",
    interval: { leftLane: 2, rightLane: 4 },
    caughtIds: [], caughtTargetIds: [], caughtGreyIds: [], missedTargetIds: [], missedSides: [],
  });
  assertDeepFrozen(contamination);
});

test("neither fixed seat can solve the complete nine-wave route", () => {
  const waves = logic.RECIPES.flatMap((recipe) => recipe.waves);
  assert.equal(waves.every((wave) => logic.enumerateIntervals().some(({ rightLane }) => (
    logic.resolveCatch(wave, logic.DEFAULT_LEFT_LANE, rightLane).status === "success"
  ))), false);
  assert.equal(waves.every((wave) => logic.enumerateIntervals().some(({ leftLane }) => (
    logic.resolveCatch(wave, leftLane, logic.DEFAULT_RIGHT_LANE).status === "success"
  ))), false);
});

test("normalizes Unicode seats as one atomic pair", () => {
  const composer = () => "好";
  assert.deepEqual(logic.normalizeConfig({ seats: ["  星河  ", "月亮"], composeCompletionNote: composer }).seats, ["星河", "月亮"]);
  assert.equal(Object.isFrozen(composer), false);
  assert.equal([...logic.normalizeConfig({ seats: ["一二三四五六七八九十一二三", "月亮"] }).seats[0]].length, 12);
  [["", "月亮"], ["同名", "同名"], ["一个"], "not-array", ["一", "二", "三"]].forEach((seats) => {
    assert.deepEqual(logic.normalizeConfig({ seats }).seats, ["你", "我"]);
  });
  const getter = {};
  Object.defineProperty(getter, "seats", { get() { throw new Error("boom"); } });
  assert.deepEqual(logic.normalizeConfig(getter).seats, ["你", "我"]);
});

test("isolates completion composer and rejects mutation, Promise, blank, excess and exceptions", () => {
  const state = completeGame();
  const summary = logic.completionSummary(state, { seats: ["阿晴", "阿岚"] });
  assertDeepFrozen(summary);
  assert.equal(logic.resolveCompletionNote((copy) => `${copy.seats[0]}和${copy.seats[1]}继续接雨。`, summary), "阿晴和阿岚继续接雨。");
  const invalid = [
    () => " ",
    () => "雨".repeat(121),
    () => Promise.resolve("later"),
    () => { throw new Error("boom"); },
    (copy) => { copy.seats[0] = "污染"; return "不该采用"; },
  ];
  invalid.forEach((composer) => assert.equal(
    logic.resolveCompletionNote(composer, summary),
    "阿晴和阿岚，往后的雨，也一起调成喜欢的颜色。",
  ));
  assert.deepEqual(summary.seats, ["阿晴", "阿岚"]);
});

test("creates the exact frozen intro and resets malformed state to a fresh intro", () => {
  const intro = logic.createInitialState();
  assert.deepEqual(intro, {
    phase: "intro", recipeIndex: 0, waveIndex: 0, waveTick: 0,
    leftLane: 2, rightLane: 4, attempt: 1, lastResult: null, completedWaves: [], revision: 0,
  });
  assert.equal(logic.isCloudRecipeState(intro), true);
  assertDeepFrozen(intro);
  const recovered = logic.reduceCloudRecipe({ ...intro, phase: "complete" }, { type: "START" });
  assert.deepEqual(recovered, intro);
  assert.notStrictEqual(recovered, intro);
});

test("START and BEGIN_RECIPE are phase-exact and illegal actions preserve identity", () => {
  const intro = logic.createInitialState();
  assert.strictEqual(logic.reduceCloudRecipe(intro, { type: "BEGIN_RECIPE" }), intro);
  const recipeIntro = logic.reduceCloudRecipe(intro, { type: "START" });
  assert.equal(recipeIntro.phase, "recipe-intro");
  assert.equal(recipeIntro.revision, 1);
  assert.strictEqual(logic.reduceCloudRecipe(recipeIntro, { type: "START" }), recipeIntro);
  const falling = logic.reduceCloudRecipe(recipeIntro, { type: "BEGIN_RECIPE" });
  assert.equal(falling.phase, "falling");
  assert.equal(falling.revision, 2);
});

test("enforces exact action schema, data properties and unpolluted prototypes", () => {
  const falling = beginGame();
  const cases = [
    null,
    { type: "STEP", ticks: 1, extra: true },
    { type: "STEP", ticks: "1" },
    { type: "STEP", ticks: 6 },
    { type: "MOVE_BOUNDARY", seat: 2, direction: 1 },
    Object.assign(Object.create({ polluted: true }), { type: "STEP", ticks: 1 }),
  ];
  const getter = {};
  Object.defineProperty(getter, "type", { get() { throw new Error("boom"); } });
  cases.push(getter);
  cases.forEach((action) => assert.strictEqual(logic.reduceCloudRecipe(falling, action), falling));
});

test("gives each seat exclusive control and preserves no-op revision", () => {
  let state = beginGame();
  const left = logic.reduceCloudRecipe(state, { type: "MOVE_BOUNDARY", seat: 0, direction: -1 });
  assert.deepEqual([left.leftLane, left.rightLane], [1, 4]);
  const right = logic.reduceCloudRecipe(state, { type: "MOVE_BOUNDARY", seat: 1, direction: 1 });
  assert.deepEqual([right.leftLane, right.rightLane], [2, 5]);
  assert.equal(left.revision, state.revision + 1);
  state = dispatch(state,
    { type: "MOVE_BOUNDARY", seat: 0, direction: 1 },
    { type: "MOVE_BOUNDARY", seat: 0, direction: 1 },
  );
  assert.deepEqual([state.leftLane, state.rightLane], [4, 4]);
  assert.strictEqual(logic.reduceCloudRecipe(state, { type: "MOVE_BOUNDARY", seat: 0, direction: 1 }), state);
  assert.strictEqual(logic.reduceCloudRecipe(state, { type: "MOVE_BOUNDARY", seat: 1, direction: -1 }), state);
});

test("safe-integer limits cannot produce an invalid authoritative state", () => {
  const falling = clone(beginGame());
  falling.revision = Number.MAX_SAFE_INTEGER;
  assert.equal(logic.isCloudRecipeState(falling), true);
  assert.strictEqual(logic.reduceCloudRecipe(falling, { type: "STEP", ticks: 1 }), falling);

  let retry = beginGame();
  retry = dispatch(retry, { type: "MOVE_BOUNDARY", seat: 1, direction: -1 });
  for (let index = 0; index < 24; index += 1) retry = logic.reduceCloudRecipe(retry, { type: "STEP", ticks: 5 });
  retry = clone(retry);
  retry.attempt = Number.MAX_SAFE_INTEGER;
  assert.equal(logic.isCloudRecipeState(retry), true);
  assert.strictEqual(logic.reduceCloudRecipe(retry, { type: "RETRY" }), retry);

  const complete = clone(completeGame());
  complete.completedWaves.forEach((wave) => { wave.attempts = Number.MAX_SAFE_INTEGER; });
  complete.attempt = Number.MAX_SAFE_INTEGER;
  assert.equal(logic.isCloudRecipeState(complete), false);

  const restartLimit = clone(beginGame());
  restartLimit.revision = Number.MAX_SAFE_INTEGER;
  assert.equal(logic.isCloudRecipeState(restartLimit), true);
  assert.strictEqual(logic.reduceCloudRecipe(restartLimit, { type: "RESTART" }), restartLimit);
});

test("classifies plain and native-style non-repeat boundary keys", () => {
  assert.deepEqual(logic.classifyBoundaryKey({ code: "KeyA" }), { type: "MOVE_BOUNDARY", seat: 0, direction: -1 });
  assert.deepEqual(logic.classifyBoundaryKey({ code: "KeyD" }), { type: "MOVE_BOUNDARY", seat: 0, direction: 1 });
  assert.deepEqual(logic.classifyBoundaryKey({ code: "ArrowLeft" }), { type: "MOVE_BOUNDARY", seat: 1, direction: -1 });
  assert.deepEqual(logic.classifyBoundaryKey({ code: "ArrowRight" }), { type: "MOVE_BOUNDARY", seat: 1, direction: 1 });
  assert.equal(logic.classifyBoundaryKey({ code: "KeyA", repeat: true }), null);
  assert.equal(logic.classifyBoundaryKey({ code: "Space" }), null);
  const nativeStyle = Object.create({ code: "KeyA", repeat: false });
  assert.deepEqual(logic.classifyBoundaryKey(nativeStyle), { type: "MOVE_BOUNDARY", seat: 0, direction: -1 });
  const getter = {};
  Object.defineProperty(getter, "code", { get() { throw new Error("boom"); } });
  assert.equal(logic.classifyBoundaryKey(getter), null);
});

test("STEP advances 1..5 ticks and resolves exactly once at tick 120", () => {
  let state = moveToTarget(beginGame());
  state = logic.reduceCloudRecipe(state, { type: "STEP", ticks: 5 });
  assert.equal(state.waveTick, 5);
  for (let index = 0; index < 22; index += 1) state = logic.reduceCloudRecipe(state, { type: "STEP", ticks: 5 });
  state = logic.reduceCloudRecipe(state, { type: "STEP", ticks: 4 });
  assert.equal(state.waveTick, 119);
  state = logic.reduceCloudRecipe(state, { type: "STEP", ticks: 5 });
  assert.equal(state.phase, "wave-result");
  assert.equal(state.completedWaves.length, 1);
  assert.strictEqual(logic.reduceCloudRecipe(state, { type: "STEP", ticks: 5 }), state);
});

test("missed and contamination retry the same wave with attempt increment and neutral interval", () => {
  let missed = beginGame();
  missed = dispatch(missed, { type: "MOVE_BOUNDARY", seat: 1, direction: -1 });
  for (let i = 0; i < 24; i += 1) missed = logic.reduceCloudRecipe(missed, { type: "STEP", ticks: 5 });
  assert.equal(missed.phase, "retry");
  assert.equal(missed.lastResult.status, "missed");
  const retry = logic.reduceCloudRecipe(missed, { type: "RETRY" });
  assert.deepEqual([retry.phase, retry.attempt, retry.leftLane, retry.rightLane], ["falling", 2, 2, 4]);
  assert.equal(retry.lastResult, null);

  let contaminated = beginGame();
  contaminated = dispatch(contaminated,
    { type: "MOVE_BOUNDARY", seat: 0, direction: -1 },
    { type: "MOVE_BOUNDARY", seat: 0, direction: -1 },
  );
  for (let i = 0; i < 24; i += 1) contaminated = logic.reduceCloudRecipe(contaminated, { type: "STEP", ticks: 5 });
  assert.equal(contaminated.lastResult.status, "contamination");
});

test("success appends once and selects wave-result versus recipe-result", () => {
  let state = finishCurrentWave(beginGame());
  assert.equal(state.phase, "wave-result");
  assert.deepEqual(state.completedWaves, [{ recipeId: "morning-dew", waveId: "morning-blue", attempts: 1 }]);
  state = logic.reduceCloudRecipe(state, { type: "NEXT_WAVE" });
  state = finishCurrentWave(state);
  state = logic.reduceCloudRecipe(state, { type: "NEXT_WAVE" });
  state = finishCurrentWave(state);
  assert.equal(state.phase, "recipe-result");
  assert.equal(state.completedWaves.length, 3);
  assert.equal(state.waveIndex, 2);
});

test("the deterministic golden replay completes all three recipes and restarts exactly", () => {
  const complete = completeGame();
  assert.equal(complete.phase, "complete");
  assert.equal(complete.completedWaves.length, 9);
  assert.equal(complete.completedWaves.every((wave) => wave.attempts === 1), true);
  assert.equal(logic.isCloudRecipeState(complete), true);
  const restarted = logic.reduceCloudRecipe(complete, { type: "RESTART" });
  assert.deepEqual({ ...restarted, revision: 0 }, logic.createInitialState());
  assert.equal(restarted.revision, complete.revision + 1);
  const intro = logic.createInitialState();
  assert.strictEqual(logic.reduceCloudRecipe(intro, { type: "RESTART" }), intro);
});

test("rejects forged prefix, attempts, phase and result states", () => {
  const complete = completeGame();
  const cases = [];
  const skipped = clone(complete); skipped.completedWaves[0].waveId = "morning-gold"; cases.push(skipped);
  const attempts = clone(complete); attempts.completedWaves[0].attempts = 0; cases.push(attempts);
  const phase = clone(complete); phase.phase = "wave-result"; cases.push(phase);
  const result = clone(complete); result.lastResult.status = "missed"; cases.push(result);
  cases.forEach((state) => assert.equal(logic.isCloudRecipeState(state), false));
});

test("JSON and cloned action logs replay to the same complete state", () => {
  const actions = [{ type: "START" }, { type: "BEGIN_RECIPE" }];
  let state = beginGame();
  for (let recipe = 0; recipe < 3; recipe += 1) {
    for (let waveIndex = 0; waveIndex < 3; waveIndex += 1) {
      const wave = logic.RECIPES[recipe].waves[waveIndex];
      while (state.rightLane < wave.targetRight) {
        const action = { type: "MOVE_BOUNDARY", seat: 1, direction: 1 };
        actions.push(action); state = logic.reduceCloudRecipe(state, action);
      }
      while (state.leftLane > wave.targetLeft) {
        const action = { type: "MOVE_BOUNDARY", seat: 0, direction: -1 };
        actions.push(action); state = logic.reduceCloudRecipe(state, action);
      }
      while (state.leftLane < wave.targetLeft) {
        const action = { type: "MOVE_BOUNDARY", seat: 0, direction: 1 };
        actions.push(action); state = logic.reduceCloudRecipe(state, action);
      }
      while (state.rightLane > wave.targetRight) {
        const action = { type: "MOVE_BOUNDARY", seat: 1, direction: -1 };
        actions.push(action); state = logic.reduceCloudRecipe(state, action);
      }
      for (let step = 0; step < 24; step += 1) actions.push({ type: "STEP", ticks: 5 });
      state = actions.slice(-24).reduce((current, action) => logic.reduceCloudRecipe(current, action), state);
      if (waveIndex < 2) { actions.push({ type: "NEXT_WAVE" }); state = logic.reduceCloudRecipe(state, actions.at(-1)); }
    }
    actions.push({ type: "NEXT_RECIPE" }); state = logic.reduceCloudRecipe(state, actions.at(-1));
    if (recipe < 2) { actions.push({ type: "BEGIN_RECIPE" }); state = logic.reduceCloudRecipe(state, actions.at(-1)); }
  }
  assert.deepEqual(logic.replayCloudRecipe(clone(actions)), state);
  assert.deepEqual(logic.replayCloudRecipe(JSON.parse(JSON.stringify(actions))), state);
  const middle = JSON.parse(JSON.stringify(beginGame()));
  assert.deepEqual(logic.replayCloudRecipe([], middle), beginGame());
  assert.notStrictEqual(logic.replayCloudRecipe([], middle), middle);
});

test("public view has exact frozen derived data and no shared state references", () => {
  let state = beginGame();
  state = logic.reduceCloudRecipe(state, { type: "STEP", ticks: 5 });
  const view = logic.getPublicView(state);
  assert.deepEqual(Object.keys(view), [
    "phase", "recipe", "wave", "timing", "cloud", "drops", "attempt", "lastResult",
    "completedRecipes", "completedWaveCount", "controls", "announcementCode",
  ]);
  assert.deepEqual(view.timing, { tick: 5, totalTicks: 120, progressPermille: 41 });
  assert.deepEqual(view.cloud, { leftLane: 2, rightLane: 4, widthLanes: 3 });
  assert.equal(view.controls.canMove, true);
  assert.equal(view.controls.canRestart, true);
  assertDeepFrozen(view);
  assert.notStrictEqual(view.drops, logic.createWaveDrops(logic.RECIPES[0].waves[0]));

  const completeView = logic.getPublicView(completeGame());
  assert.equal(completeView.completedRecipes.length, 3);
  assert.deepEqual(completeView.completedRecipes.map((item) => item.totalAttempts), [3, 3, 3]);
  assert.equal(completeView.announcementCode, "complete");
});

test("production logic has no network, storage, random, audio or runtime hook", () => {
  const source = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  [
    /\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /localStorage/, /sessionStorage/,
    /indexedDB/, /Math\.random/, /AudioContext/, /new\s+Audio/, /https?:\/\//,
  ].forEach((pattern) => assert.doesNotMatch(source, pattern));
});
