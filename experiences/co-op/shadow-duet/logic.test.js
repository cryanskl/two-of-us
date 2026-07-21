const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const logic = require("./logic.js");
const config = require("./config.js");
const logicPath = path.join(__dirname, "logic.js");
const configPath = path.join(__dirname, "config.js");

function loadClassic(source = readFileSync(logicPath, "utf8"), globals = {}) {
  const context = vm.createContext({ ...globals });
  vm.runInContext(source, context);
  return context;
}

function assertDeepFrozen(value, seen = new Set()) {
  if ((value === null || typeof value !== "object") && typeof value !== "function") return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

function action(state, value) {
  return logic.reduce(state, value);
}

function enterScene(state = logic.createInitialState()) {
  if (state.phase === "intro") state = action(state, { type: "START" });
  return action(state, { type: "BEGIN_SCENE" });
}

function step(state, ticks) {
  let remaining = ticks;
  while (remaining > 0 && state.phase === "dancing") {
    const batch = Math.min(5, remaining);
    state = action(state, { type: "STEP", ticks: batch });
    remaining -= batch;
  }
  return state;
}

function pressTarget(state, includeLeft = true, includeRight = true) {
  const scene = logic.SCENES[state.sceneIndex];
  if (includeLeft) state = action(state, { type: "PRESS", seat: "left", pose: scene.leftPose });
  if (includeRight) state = action(state, { type: "PRESS", seat: "right", pose: scene.rightPose });
  return state;
}

function oracleScene({ correctFromTick, wrongTicks = new Set(), leftPresent = true, rightPresent = true }) {
  let stable = 0;
  for (let tick = 1; tick <= 62; tick += 1) {
    if (tick >= 48 && tick <= 61) {
      const correct = tick >= correctFromTick && !wrongTicks.has(tick) && leftPresent && rightPresent;
      stable = correct ? stable + 1 : 0;
      if (stable === 6) return { status: "captured", tick };
    }
  }
  return { status: "missed", tick: 62 };
}

function playSuccessfulScene(state) {
  state = enterScene(state);
  state = pressTarget(state);
  return step(state, 53);
}

function completeGame(withRetry = false) {
  let state = action(logic.createInitialState(), { type: "START" });
  const log = [{ type: "START" }];
  for (let index = 0; index < logic.SCENES.length; index += 1) {
    if (withRetry && index === 1) {
      state = action(state, { type: "BEGIN_SCENE" }); log.push({ type: "BEGIN_SCENE" });
      state = step(state, 62);
      for (let tick = 0; tick < 13; tick += 1) log.push({ type: "STEP", ticks: tick < 12 ? 5 : 2 });
      state = action(state, { type: "RETRY_SCENE" }); log.push({ type: "RETRY_SCENE" });
    }
    state = action(state, { type: "BEGIN_SCENE" }); log.push({ type: "BEGIN_SCENE" });
    const scene = logic.SCENES[index];
    state = action(state, { type: "PRESS", seat: "left", pose: scene.leftPose });
    state = action(state, { type: "PRESS", seat: "right", pose: scene.rightPose });
    log.push({ type: "PRESS", seat: "left", pose: scene.leftPose });
    log.push({ type: "PRESS", seat: "right", pose: scene.rightPose });
    for (let ticks = 0; ticks < 10; ticks += 1) { state = action(state, { type: "STEP", ticks: 5 }); log.push({ type: "STEP", ticks: 5 }); }
    state = action(state, { type: "STEP", ticks: 3 }); log.push({ type: "STEP", ticks: 3 });
    assert.equal(state.phase, "pose-result");
    state = action(state, { type: "NEXT_SCENE" }); log.push({ type: "NEXT_SCENE" });
  }
  assert.equal(state.phase, "act-result");
  state = action(state, { type: "FINISH" }); log.push({ type: "FINISH" });
  return { state, log };
}

function reachSceneIntro(sceneIndex) {
  let state = action(logic.createInitialState(), { type: "START" });
  for (let index = 0; index < sceneIndex; index += 1) {
    state = action(state, { type: "BEGIN_SCENE" });
    state = pressTarget(state);
    state = step(state, 53);
    state = action(state, { type: "NEXT_SCENE" });
  }
  return state;
}

function oracleForPoses(scene, leftPose, rightPose) {
  return leftPose === scene.leftPose && rightPose === scene.rightPose
    ? { phase: "pose-result", tick: 53 }
    : { phase: "missed", tick: 62 };
}

test("exports the exact recursively frozen browser/CommonJS contract", () => {
  assert.deepEqual(Object.keys(logic), [
    "SEATS", "POSES", "SCENES", "TICK_RATE", "WINDOW_START_TICK", "WINDOW_END_TICK",
    "REQUIRED_STABLE_TICKS", "MAX_STEP_TICKS", "DEFAULT_CONFIG", "normalizeConfig",
    "resolveCompletionNote", "createInitialState", "reduce", "getPublicView",
  ]);
  assertDeepFrozen(logic);
  const source = readFileSync(logicPath, "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.equal(typeof context.ShadowDuetLogic.reduce, "function");
  assert.deepEqual([...context.ShadowDuetLogic.SEATS], ["left", "right"]);
});

test("config and logic are real CommonJS exports and frozen classic-browser globals", () => {
  assert.equal(require("./logic.js"), logic);
  assert.equal(require("./config.js"), config);
  assert.deepEqual(Object.keys(config), ["seats", "composeCompletionNote"]);
  assertDeepFrozen(config);
  const context = loadClassic(readFileSync(configPath, "utf8"));
  assert.deepEqual([...context.SHADOW_DUET_CONFIG.seats], ["你", "TA"]);
  assert.equal(context.SHADOW_DUET_CONFIG.composeCompletionNote({ seats: ["甲", "乙"] }),
    "甲和乙，六次定格以后，影子也记住了我们。");
  assertDeepFrozen(context.SHADOW_DUET_CONFIG);
});

test("load self-check rejects a duplicated scene id fixture", () => {
  const source = readFileSync(logicPath, "utf8");
  const broken = source.replace('{ id: "little-roof", title:', '{ id: "open-wings", title:');
  assert.notEqual(broken, source);
  assert.throws(() => loadClassic(broken), /invalid shadow duet constants/);
});

test("constants, scene route, pose coverage, and clock math are exact", () => {
  assert.deepEqual([...logic.SEATS], ["left", "right"]);
  assert.deepEqual(logic.POSES.map((pose) => ({ ...pose })), [
    { id: "high", label: "举高", leftCode: "KeyW", rightCode: "ArrowUp" },
    { id: "wide", label: "展开", leftCode: "KeyA", rightCode: "ArrowRight" },
    { id: "low", label: "低身", leftCode: "KeyS", rightCode: "ArrowDown" },
    { id: "near", label: "向内", leftCode: "KeyD", rightCode: "ArrowLeft" },
  ]);
  assert.deepEqual(logic.SCENES.map((scene) => ({ ...scene })), [
    { id: "open-wings", title: "开幕·展翼", leftPose: "wide", rightPose: "wide" },
    { id: "little-roof", title: "屋檐·相接", leftPose: "near", rightPose: "near" },
    { id: "moon-left", title: "月钩·左起", leftPose: "high", rightPose: "low" },
    { id: "moon-right", title: "月钩·右起", leftPose: "low", rightPose: "high" },
    { id: "offer-hand", title: "窗边·递手", leftPose: "wide", rightPose: "near" },
    { id: "swap-hand", title: "谢幕·换手", leftPose: "near", rightPose: "wide" },
  ]);
  assert.deepEqual([logic.TICK_RATE, logic.WINDOW_START_TICK, logic.WINDOW_END_TICK,
    logic.REQUIRED_STABLE_TICKS, logic.MAX_STEP_TICKS], [30, 48, 61, 6, 5]);
  for (const seatKey of ["leftPose", "rightPose"]) {
    const counts = Object.fromEntries(logic.POSES.map(({ id }) => [id, 0]));
    for (const scene of logic.SCENES) counts[scene[seatKey]] += 1;
    assert.deepEqual(counts, { high: 1, wide: 2, low: 1, near: 2 });
  }
});

test("initial state and public view are detached and deeply frozen", () => {
  const first = logic.createInitialState();
  const second = logic.createInitialState();
  assert.notEqual(first, second);
  assert.deepEqual(first, {
    phase: "intro", sceneIndex: 0, tick: 0, heldPoses: { left: [], right: [] },
    stableTicks: 0, attempt: 1, completedScenes: [], lastResult: null, revision: 0,
  });
  const view = logic.getPublicView(first);
  assert.equal(view.phase, "intro");
  assert.equal(view.sceneCount, 6);
  assert.deepEqual(view.activePoses, { left: null, right: null });
  assert.equal(view.summary, null);
  assert.notEqual(view.heldPoses, first.heldPoses);
  assertDeepFrozen(first);
  assertDeepFrozen(view);
});

test("held stacks deduplicate, fall back on release, isolate seats, and fully clear on suspend", () => {
  let state = enterScene();
  state = action(state, { type: "PRESS", seat: "left", pose: "high" });
  const duplicate = action(state, { type: "PRESS", seat: "left", pose: "high" });
  assert.equal(duplicate, state);
  state = action(state, { type: "PRESS", seat: "left", pose: "near" });
  state = action(state, { type: "PRESS", seat: "right", pose: "low" });
  assert.deepEqual(logic.getPublicView(state).activePoses, { left: "near", right: "low" });
  state = action(state, { type: "RELEASE", seat: "left", pose: "near" });
  assert.deepEqual(logic.getPublicView(state).activePoses, { left: "high", right: "low" });
  state = action(state, { type: "PRESS", seat: "left", pose: "wide" });
  state = action(state, { type: "PRESS", seat: "left", pose: "low" });
  state = action(state, { type: "PRESS", seat: "left", pose: "near" });
  assert.deepEqual([...state.heldPoses.left], ["high", "wide", "low", "near"]);
  const attempt = state.attempt;
  state = action(state, { type: "SUSPEND" });
  assert.equal(state.phase, "scene-intro");
  assert.equal(state.attempt, attempt);
  assert.deepEqual(state.heldPoses, { left: [], right: [] });
});

test("independent oracle proves the earliest/latest tick boundaries", () => {
  for (const expected of [
    { start: 48, outcome: { status: "captured", tick: 53 } },
    { start: 56, outcome: { status: "captured", tick: 61 } },
    { start: 57, outcome: { status: "missed", tick: 62 } },
  ]) {
    assert.deepEqual(oracleScene({ correctFromTick: expected.start }), expected.outcome);
    let state = enterScene();
    state = step(state, expected.start - 1);
    state = pressTarget(state);
    state = step(state, 63 - expected.start);
    assert.equal(state.phase, expected.outcome.status === "captured" ? "pose-result" : "missed");
    assert.equal(state.tick, expected.outcome.tick);
  }
  assert.deepEqual(oracleScene({ correctFromTick: 55, wrongTicks: new Set([55]) }),
    { status: "captured", tick: 61 });
});

test("tick 61 is final input, tick 62 misses with its frozen window-end poses", () => {
  let state = enterScene();
  state = step(state, 55);
  state = pressTarget(state);
  state = step(state, 5);
  assert.equal(state.tick, 60);
  state = action(state, { type: "RELEASE", seat: "right", pose: logic.SCENES[0].rightPose });
  state = step(state, 1);
  assert.equal(state.tick, 61);
  const frozen = state;
  assert.equal(action(state, { type: "PRESS", seat: "right", pose: "wide" }), frozen);
  assert.equal(action(state, { type: "RELEASE", seat: "left", pose: "wide" }), frozen);
  state = step(state, 1);
  assert.equal(state.phase, "missed");
  assert.deepEqual(state.lastResult, { status: "missed", sceneId: "open-wings", leftPose: "wide", rightPose: null });
});

test("batched STEP stops atomically on capture and interruption resets stability", () => {
  let state = enterScene();
  state = step(state, 47);
  state = pressTarget(state);
  state = action(state, { type: "STEP", ticks: 5 });
  assert.equal(state.tick, 52);
  assert.equal(state.stableTicks, 5);
  state = action(state, { type: "STEP", ticks: 5 });
  assert.equal(state.phase, "pose-result");
  assert.equal(state.tick, 53);
  assert.equal(state.completedScenes.length, 1);

  state = enterScene();
  state = step(state, 47);
  state = pressTarget(state);
  state = step(state, 3);
  state = action(state, { type: "PRESS", seat: "left", pose: "near" });
  state = step(state, 1);
  assert.equal(state.stableTicks, 0);
  state = action(state, { type: "RELEASE", seat: "left", pose: "near" });
  state = step(state, 5);
  assert.equal(state.stableTicks, 5);
});

test("an independent single-seat oracle and production path can never capture", () => {
  assert.deepEqual(oracleScene({ correctFromTick: 48, rightPresent: false }), { status: "missed", tick: 62 });
  for (const seat of ["left", "right"]) {
    let state = enterScene();
    state = pressTarget(state, seat === "left", seat === "right");
    state = step(state, 62);
    assert.equal(state.phase, "missed");
    assert.equal(state.completedScenes.length, 0);
  }
});

test("independent pose oracle covers every scene, each seat alone, and all 4x4 pose pairs", () => {
  const candidates = [null, ...logic.POSES.map(({ id }) => id)];
  for (let sceneIndex = 0; sceneIndex < logic.SCENES.length; sceneIndex += 1) {
    const scene = logic.SCENES[sceneIndex];
    const intro = reachSceneIntro(sceneIndex);
    for (const leftPose of candidates) {
      for (const rightPose of candidates) {
        if (leftPose === null && rightPose === null) continue;
        const expected = oracleForPoses(scene, leftPose, rightPose);
        let state = action(intro, { type: "BEGIN_SCENE" });
        if (leftPose !== null) state = action(state, { type: "PRESS", seat: "left", pose: leftPose });
        if (rightPose !== null) state = action(state, { type: "PRESS", seat: "right", pose: rightPose });
        state = step(state, 62);
        assert.deepEqual({ phase: state.phase, tick: state.tick }, expected,
          `${scene.id}: ${leftPose || "empty"}/${rightPose || "empty"}`);
      }
    }
  }
});

test("miss, retry, all seven phases, six captures, summary, finish, and restart are exact", () => {
  const { state, log } = completeGame(true);
  assert.equal(state.phase, "complete");
  const view = logic.getPublicView(state, { seats: ["小岚", "小屿"], composeCompletionNote() { return "ok"; } });
  assert.deepEqual(view.summary, {
    seats: ["小岚", "小屿"], sceneCount: 6, totalAttempts: 7, retries: 1,
    captures: logic.SCENES.map(({ title }) => title),
  });
  assert.equal(view.isComplete, true);
  const restarted = action(state, { type: "RESTART" });
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.revision, state.revision + 1);
  const replay = JSON.parse(JSON.stringify(log)).reduce((current, item) => logic.reduce(current, item), logic.createInitialState());
  assert.deepEqual(logic.getPublicView(replay), logic.getPublicView(state));
});

test("actions require exact own-data ordinary-object schemas and safe integer headroom", () => {
  const state = enterScene();
  for (const bad of [
    null, [], { type: "PRESS", seat: "left", pose: "high", extra: true },
    Object.assign(Object.create(null), { type: "STEP", ticks: 1 }),
    { type: "PRESS", seat: "middle", pose: "high" }, { type: "PRESS", seat: "left", pose: "bad" },
    { type: "STEP", ticks: 0 }, { type: "STEP", ticks: 6 }, { type: "STEP", ticks: 1.5 },
  ]) assert.equal(logic.reduce(state, bad), state);
  const getter = {};
  Object.defineProperty(getter, "type", { enumerable: true, get() { throw new Error("no"); } });
  assert.equal(logic.reduce(state, getter), state);
  const hostile = new Proxy({ type: "STEP", ticks: 1 }, { ownKeys() { throw new Error("no"); } });
  assert.equal(logic.reduce(state, hostile), state);
  const maxRevision = { ...JSON.parse(JSON.stringify(state)), revision: Number.MAX_SAFE_INTEGER };
  assert.equal(logic.reduce(maxRevision, { type: "STEP", ticks: 1 }), maxRevision);
});

test("attempt headroom is exact in every incomplete phase and retry preserves one attempt per future scene", () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  for (let completedCount = 0; completedCount <= 5; completedCount += 1) {
    const intro = reachSceneIntro(completedCount);
    let missed = action(intro, { type: "BEGIN_SCENE" });
    missed = step(missed, 62);
    const boundaryAttempt = maximum - 5;
    const boundaryMissed = { ...JSON.parse(JSON.stringify(missed)), attempt: boundaryAttempt };
    const allowedRetryState = { ...boundaryMissed, attempt: boundaryAttempt - 1 };
    const allowed = action(allowedRetryState, { type: "RETRY_SCENE" });
    assert.equal(allowed.phase, "scene-intro");
    assert.equal(allowed.attempt, boundaryAttempt, `completed=${completedCount}`);
    assert.equal(action(boundaryMissed, { type: "RETRY_SCENE" }), boundaryMissed,
      `retry must reserve ${5 - completedCount} future scenes`);

    const phaseStates = [
      { ...boundaryMissed, phase: "scene-intro", tick: 0, lastResult: null },
      { ...boundaryMissed, phase: "dancing", tick: 0, lastResult: null },
      boundaryMissed,
    ];
    for (const state of phaseStates) {
      assert.equal(action(state, { type: "UNKNOWN" }), state);
      const beyond = { ...state, attempt: boundaryAttempt + 1 };
      assert.notEqual(action(beyond, { type: "UNKNOWN" }), beyond);
    }
  }
});

test("pose-result and terminal snapshots enforce the M-1/M remaining-scene headroom", () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  let fullBoundary = null;
  for (let completedCount = 1; completedCount <= 6; completedCount += 1) {
    let state = reachSceneIntro(completedCount - 1);
    state = action(state, { type: "BEGIN_SCENE" });
    state = pressTarget(state);
    state = step(state, 53);
    const snapshot = JSON.parse(JSON.stringify(state));
    const targetTotal = maximum - (6 - completedCount);
    const lastAttempts = targetTotal - (completedCount - 1);
    snapshot.completedScenes[completedCount - 1].attempts = lastAttempts;
    snapshot.attempt = lastAttempts;
    assert.equal(action(snapshot, { type: "UNKNOWN" }), snapshot,
      `pose-result ${completedCount} should accept total ${targetTotal}`);
    if (completedCount === 6) fullBoundary = snapshot;
    const beyond = JSON.parse(JSON.stringify(snapshot));
    beyond.completedScenes[completedCount - 1].attempts += 1;
    beyond.attempt += 1;
    assert.notEqual(action(beyond, { type: "UNKNOWN" }), beyond);
    if (completedCount === 5) assert.equal(targetTotal, maximum - 1);
    if (completedCount === 6) assert.equal(targetTotal, maximum);
  }
  const actResult = action(fullBoundary, { type: "NEXT_SCENE" });
  assert.equal(actResult.phase, "act-result");
  assert.equal(logic.getPublicView(actResult).summary.totalAttempts, maximum);
  const complete = action(actResult, { type: "FINISH" });
  assert.equal(complete.phase, "complete");
  assert.equal(logic.getPublicView(complete).summary.totalAttempts, maximum);
  const invalidTerminal = JSON.parse(JSON.stringify(actResult));
  invalidTerminal.completedScenes[5].attempts += 1;
  assert.notEqual(action(invalidTerminal, { type: "UNKNOWN" }), invalidTerminal);
});

test("invalid states fail closed to a fresh initial state and public view never throws", () => {
  const valid = enterScene();
  const invalids = [
    null, [], { ...JSON.parse(JSON.stringify(valid)), extra: true },
    { ...JSON.parse(JSON.stringify(valid)), tick: 48, stableTicks: 1 },
    { ...JSON.parse(JSON.stringify(valid)), heldPoses: { left: ["wide", "wide"], right: [] } },
    new Proxy({}, { getPrototypeOf() { throw new Error("no"); } }),
  ];
  for (const invalid of invalids) {
    const repaired = logic.reduce(invalid, { type: "START" });
    assert.deepEqual(repaired, logic.createInitialState());
    assert.notEqual(repaired, logic.createInitialState());
    assert.equal(logic.getPublicView(invalid).phase, "intro");
  }
});

test("descriptor snapshots accept late-throw get proxies and reject nested trap/accessor inputs", () => {
  const plain = JSON.parse(JSON.stringify(enterScene()));
  const late = new Proxy(plain, {
    get() { throw new Error("ordinary get must not run"); },
  });
  assert.equal(logic.reduce(late, { type: "UNKNOWN" }), late);
  assert.equal(logic.getPublicView(late).phase, "dancing");

  const nested = JSON.parse(JSON.stringify(plain));
  nested.heldPoses = new Proxy(nested.heldPoses, { ownKeys() { throw new Error("no"); } });
  assert.equal(logic.getPublicView(nested).phase, "intro");
  const accessor = JSON.parse(JSON.stringify(plain));
  Object.defineProperty(accessor.heldPoses, "left", { enumerable: true, get() { return []; } });
  assert.equal(logic.getPublicView(accessor).phase, "intro");
  const subclass = JSON.parse(JSON.stringify(plain));
  subclass.heldPoses.left = new (class extends Array {})("wide");
  assert.equal(logic.getPublicView(subclass).phase, "intro");
});

test("descriptor traps, symbols, malformed native arrays, and completed accessors fail closed", () => {
  const valid = JSON.parse(JSON.stringify(enterScene()));
  const descriptorTrap = (target) => new Proxy(target, {
    getOwnPropertyDescriptor() { throw new Error("descriptor"); },
  });
  const stable = enterScene();
  assert.equal(logic.reduce(stable, descriptorTrap({ type: "STEP", ticks: 1 })), stable);
  assert.equal(logic.getPublicView(descriptorTrap(valid)).phase, "intro");
  const nestedHeld = JSON.parse(JSON.stringify(valid));
  nestedHeld.heldPoses = descriptorTrap(nestedHeld.heldPoses);
  assert.equal(logic.getPublicView(nestedHeld).phase, "intro");

  const symbolAction = { type: "STEP", ticks: 1, [Symbol("extra")]: true };
  assert.equal(logic.reduce(stable, symbolAction), stable);
  const symbolState = { ...valid, [Symbol("extra")]: true };
  assert.equal(logic.getPublicView(symbolState).phase, "intro");

  const malformedArrays = [];
  const sparse = new Array(1);
  malformedArrays.push(sparse);
  const nullPrototype = ["wide"];
  Object.setPrototypeOf(nullPrototype, null);
  malformedArrays.push(nullPrototype);
  const customPrototype = ["wide"];
  Object.setPrototypeOf(customPrototype, Object.create(Array.prototype));
  malformedArrays.push(customPrototype);
  malformedArrays.push(new (class extends Array {})("wide"));
  for (const heldArray of malformedArrays) {
    const candidate = JSON.parse(JSON.stringify(valid));
    candidate.heldPoses.left = heldArray;
    assert.equal(logic.getPublicView(candidate).phase, "intro");
  }

  const completed = reachSceneIntro(1);
  const completedAccessor = JSON.parse(JSON.stringify(completed));
  Object.defineProperty(completedAccessor.completedScenes[0], "attempts", {
    enumerable: true, get() { throw new Error("accessor"); },
  });
  assert.equal(logic.getPublicView(completedAccessor).phase, "intro");
  const completedTrap = JSON.parse(JSON.stringify(completed));
  completedTrap.completedScenes[0] = descriptorTrap(completedTrap.completedScenes[0]);
  assert.equal(logic.getPublicView(completedTrap).phase, "intro");
  const malformedCompletedArrays = [new Array(1)];
  const nullCompleted = JSON.parse(JSON.stringify(completed.completedScenes));
  Object.setPrototypeOf(nullCompleted, null);
  malformedCompletedArrays.push(nullCompleted);
  const customCompleted = JSON.parse(JSON.stringify(completed.completedScenes));
  Object.setPrototypeOf(customCompleted, Object.create(Array.prototype));
  malformedCompletedArrays.push(customCompleted);
  for (const completedScenes of malformedCompletedArrays) {
    const candidate = JSON.parse(JSON.stringify(completed));
    candidate.completedScenes = completedScenes;
    assert.equal(logic.getPublicView(candidate).phase, "intro");
  }
});

test("reflection trap matrix fails closed for action records, held objects, and both state array layers", () => {
  const trapCases = [
    ["ownKeys", { ownKeys() { throw new Error("ownKeys"); } }],
    ["getOwnPropertyDescriptor", {
      getOwnPropertyDescriptor() { throw new Error("getOwnPropertyDescriptor"); },
    }],
    ["getPrototypeOf", { getPrototypeOf() { throw new Error("getPrototypeOf"); } }],
  ];
  const stable = enterScene();
  const completed = JSON.parse(JSON.stringify(reachSceneIntro(1)));
  for (const [trapName, handler] of trapCases) {
    const hostileAction = new Proxy({ type: "STEP", ticks: 1 }, handler);
    let actionResult;
    assert.doesNotThrow(() => { actionResult = logic.reduce(stable, hostileAction); }, `action/${trapName}`);
    assert.equal(actionResult, stable, `action/${trapName}`);

    const hostileHeld = JSON.parse(JSON.stringify(stable));
    hostileHeld.heldPoses = new Proxy(hostileHeld.heldPoses, handler);
    let heldView;
    assert.doesNotThrow(() => { heldView = logic.getPublicView(hostileHeld); }, `held/${trapName}`);
    assert.equal(heldView.phase, "intro", `held/${trapName}`);

    const hostileStack = JSON.parse(JSON.stringify(stable));
    hostileStack.heldPoses.left = new Proxy(hostileStack.heldPoses.left, handler);
    let stackView;
    assert.doesNotThrow(() => { stackView = logic.getPublicView(hostileStack); }, `stack/${trapName}`);
    assert.equal(stackView.phase, "intro", `stack/${trapName}`);

    const hostileCompleted = JSON.parse(JSON.stringify(completed));
    hostileCompleted.completedScenes = new Proxy(hostileCompleted.completedScenes, handler);
    let completedView;
    assert.doesNotThrow(() => {
      completedView = logic.getPublicView(hostileCompleted);
    }, `completed/${trapName}`);
    assert.equal(completedView.phase, "intro", `completed/${trapName}`);
  }
});

test("an invalid state returns before inspecting even a hostile action", () => {
  let inspected = 0;
  const hostileAction = new Proxy({}, {
    ownKeys() { inspected += 1; throw new Error("must not inspect"); },
    getOwnPropertyDescriptor() { inspected += 1; throw new Error("must not inspect"); },
    getPrototypeOf() { inspected += 1; throw new Error("must not inspect"); },
  });
  assert.deepEqual(logic.reduce(null, hostileAction), logic.createInitialState());
  assert.equal(inspected, 0);
});

test("state validation does not call inherited array iterator or map", () => {
  const plain = JSON.parse(JSON.stringify(enterScene()));
  const oldIterator = Array.prototype[Symbol.iterator];
  const oldMap = Array.prototype.map;
  try {
    Array.prototype[Symbol.iterator] = function poisonedIterator() { throw new Error("iterator"); };
    Array.prototype.map = function poisonedMap() { throw new Error("map"); };
    const view = logic.getPublicView(plain);
    assert.equal(view.phase, "dancing");
  } finally {
    Array.prototype[Symbol.iterator] = oldIterator;
    Array.prototype.map = oldMap;
  }
});

test("config normalizes graphemes atomically and composer is delayed, isolated, and bounded", () => {
  const family = "👩‍❤️‍👩";
  let called = 0;
  const composer = () => { called += 1; return "  六次影子，都是我们。  "; };
  const normalized = logic.normalizeConfig({ seats: [`  ${family}  `, "TA"], composeCompletionNote: composer });
  assert.deepEqual([...normalized.seats], [family, "TA"]);
  assert.equal(called, 0);
  assert.equal(Object.isFrozen(composer), false);
  assert.notEqual(normalized.composeCompletionNote, composer);
  for (const raw of [
    { seats: ["同名", "同名"], composeCompletionNote: composer },
    { seats: ["", "TA"], composeCompletionNote: composer },
    { seats: ["字".repeat(13), "TA"], composeCompletionNote: composer },
    { seats: ["你", "TA", "多"], composeCompletionNote: composer },
    { seats: ["你", "TA"], composeCompletionNote: null },
  ]) assert.deepEqual(logic.normalizeConfig(raw).seats, logic.DEFAULT_CONFIG.seats);
  const getter = {};
  Object.defineProperty(getter, "seats", { enumerable: true, get() { throw new Error("no"); } });
  Object.defineProperty(getter, "composeCompletionNote", { enumerable: true, value: composer });
  assert.deepEqual(logic.normalizeConfig(getter).seats, logic.DEFAULT_CONFIG.seats);

  const summary = logic.getPublicView(completeGame().state, normalized).summary;
  assert.equal(logic.resolveCompletionNote(composer, summary), "六次影子，都是我们。");
  assert.equal(called, 1);
  const fallback = `${family}和TA，六次定格以后，影子也记住了我们。`;
  assert.equal(logic.resolveCompletionNote(() => Promise.resolve("异步"), summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => " ", summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => "长".repeat(121), summary), fallback);
  assert.equal(logic.resolveCompletionNote(() => { throw new Error("no"); }, summary), fallback);
  assert.equal(logic.resolveCompletionNote((input) => { input.captures[0] = "篡改"; return "坏"; }, summary), fallback);
});

test("config descriptor traps, symbols, malformed seat arrays, and nested proxies fall back atomically", () => {
  const composer = () => "好";
  const trappedConfig = new Proxy({ seats: ["甲", "乙"], composeCompletionNote: composer }, {
    getOwnPropertyDescriptor() { throw new Error("descriptor"); },
  });
  assert.deepEqual(logic.normalizeConfig(trappedConfig).seats, logic.DEFAULT_CONFIG.seats);
  const trappedSeats = new Proxy(["甲", "乙"], {
    getOwnPropertyDescriptor() { throw new Error("descriptor"); },
  });
  assert.deepEqual(logic.normalizeConfig({ seats: trappedSeats, composeCompletionNote: composer }).seats,
    logic.DEFAULT_CONFIG.seats);
  assert.deepEqual(logic.normalizeConfig({
    seats: ["甲", "乙"], composeCompletionNote: composer, [Symbol("extra")]: true,
  }).seats, logic.DEFAULT_CONFIG.seats);

  const arrays = [new Array(2), new (class extends Array {})("甲", "乙")];
  const nullPrototype = ["甲", "乙"];
  Object.setPrototypeOf(nullPrototype, null);
  arrays.push(nullPrototype);
  const customPrototype = ["甲", "乙"];
  Object.setPrototypeOf(customPrototype, Object.create(Array.prototype));
  arrays.push(customPrototype);
  for (const seats of arrays) {
    assert.deepEqual(logic.normalizeConfig({ seats, composeCompletionNote: composer }).seats,
      logic.DEFAULT_CONFIG.seats);
  }
});

test("deterministic grapheme fallback handles Marks, Hangul, emoji sequences, and flags at 12/13", () => {
  const context = loadClassic(readFileSync(logicPath, "utf8"), { Intl: {} });
  const clusters = [
    "e\u0301", "שְ", "نّ", "का", "가", "❤️", "👍🏽", "👩‍❤️‍👩", "🇲🇾",
  ];
  for (const cluster of clusters) {
    const twelve = cluster.repeat(12);
    const thirteen = cluster.repeat(13);
    context.seatName = twelve;
    assert.deepEqual([...vm.runInContext(
      'ShadowDuetLogic.normalizeConfig({ seats: [seatName, "乙"], composeCompletionNote() { return "好"; } }).seats',
      context,
    )], [twelve, "乙"]);
    context.seatName = thirteen;
    assert.deepEqual([...vm.runInContext(
      'ShadowDuetLogic.normalizeConfig({ seats: [seatName, "乙"], composeCompletionNote() { return "好"; } }).seats',
      context,
    )], ["你", "TA"]);
  }
  const nonEmojiZwj = "a\u200db";
  context.seatName = nonEmojiZwj.repeat(6);
  assert.deepEqual([...vm.runInContext(
    'ShadowDuetLogic.normalizeConfig({ seats: [seatName, "乙"], composeCompletionNote() { return "好"; } }).seats',
    context,
  )], [nonEmojiZwj.repeat(6), "乙"]);
  context.seatName = `${nonEmojiZwj.repeat(6)}c`;
  assert.deepEqual([...vm.runInContext(
    'ShadowDuetLogic.normalizeConfig({ seats: [seatName, "乙"], composeCompletionNote() { return "好"; } }).seats',
    context,
  )], ["你", "TA"]);
  context.noteText = "👍🏽".repeat(120);
  const expression = `ShadowDuetLogic.resolveCompletionNote(
    function () { return noteText; },
    { seats: ["你", "TA"], sceneCount: 6, totalAttempts: 6, retries: 0,
      captures: ${JSON.stringify(logic.SCENES.map(({ title }) => title))} }
  )`;
  assert.equal(vm.runInContext(expression, context), context.noteText);
  context.noteText = "👍🏽".repeat(121);
  assert.notEqual(vm.runInContext(expression, context), context.noteText);
});

test("public view uses atomic config fallback and omits competitive/private implementation data", () => {
  const { state } = completeGame();
  const invalid = { seats: ["同名", "同名"], composeCompletionNote() { return "x"; } };
  const view = logic.getPublicView(state, invalid);
  assert.deepEqual(view.seats, logic.DEFAULT_CONFIG.seats);
  for (const forbidden of ["winner", "score", "accuracy", "failures", "rating", "timestamp", "actionLog"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(view, forbidden), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view.summary, forbidden), false);
  }
  assert.notEqual(view.completedScenes, state.completedScenes);
  assertDeepFrozen(view);
});

test("public view has exact keys, result/summary gating, and deep detachment in all seven phases", () => {
  const intro = logic.createInitialState();
  const sceneIntro = action(intro, { type: "START" });
  const dancing = action(sceneIntro, { type: "BEGIN_SCENE" });
  const missed = step(dancing, 62);
  let poseResult = pressTarget(dancing);
  poseResult = step(poseResult, 53);
  let finalPose = reachSceneIntro(5);
  finalPose = action(finalPose, { type: "BEGIN_SCENE" });
  finalPose = pressTarget(finalPose);
  finalPose = step(finalPose, 53);
  const actResult = action(finalPose, { type: "NEXT_SCENE" });
  const complete = action(actResult, { type: "FINISH" });
  const phases = { intro, "scene-intro": sceneIntro, dancing, missed, "pose-result": poseResult,
    "act-result": actResult, complete };
  const expectedKeys = [
    "phase", "sceneIndex", "sceneCount", "currentScene", "tick", "windowStartTick",
    "windowEndTick", "requiredStableTicks", "heldPoses", "activePoses", "stableTicks",
    "attempt", "completedScenes", "completedCount", "lastResult", "seats", "poses",
    "isComplete", "summary", "revision",
  ];
  const rawConfig = { seats: ["甲", "乙"], composeCompletionNote() { return "好"; } };
  for (const [phase, state] of Object.entries(phases)) {
    const view = logic.getPublicView(state, rawConfig);
    assert.deepEqual(Object.keys(view), expectedKeys, phase);
    assert.equal(view.phase, phase);
    assert.equal(view.summary !== null, phase === "act-result" || phase === "complete");
    assert.equal(view.lastResult !== null, phase === "missed" || phase === "pose-result");
    if (view.lastResult !== null) {
      assert.deepEqual(Object.keys(view.lastResult), phase === "missed"
        ? ["status", "sceneId", "leftPose", "rightPose"] : ["status", "sceneId", "tick"]);
    }
    assert.notEqual(view.heldPoses, state.heldPoses);
    assert.notEqual(view.completedScenes, state.completedScenes);
    assert.notEqual(view.currentScene, logic.SCENES[state.sceneIndex]);
    assert.notEqual(view.poses, logic.POSES);
    assert.notEqual(view.poses[0], logic.POSES[0]);
    assert.notEqual(view.seats, rawConfig.seats);
    if (view.lastResult !== null) assert.notEqual(view.lastResult, state.lastResult);
    if (view.summary !== null) {
      assert.notEqual(view.summary.seats, view.seats);
      assert.notEqual(view.summary.seats, rawConfig.seats);
    }
    if (view.completedScenes.length > 0) {
      assert.notEqual(view.completedScenes[0], state.completedScenes[0]);
    }
    assertDeepFrozen(view);
  }
  assert.deepEqual(Object.keys(logic.getPublicView(actResult, rawConfig).summary),
    ["seats", "sceneCount", "totalAttempts", "retries", "captures"]);
});

test("production logic has no runtime side-effect APIs", () => {
  const source = readFileSync(logicPath, "utf8");
  for (const forbidden of [
    /\bdocument\b/, /\bwindow\b/, /requestAnimationFrame/, /\bDate\b/, /performance\./,
    /setTimeout|setInterval/, /Math\.random/, /\bfetch\b/, /XMLHttpRequest/, /localStorage|sessionStorage|indexedDB/,
    /AudioContext|getUserMedia|MediaRecorder|WebSocket|Worker/,
  ]) assert.doesNotMatch(source, forbidden);
});
