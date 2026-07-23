"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const logicPath = path.join(__dirname, "logic.js");
const configPath = path.join(__dirname, "config.js");
const logicSource = fs.readFileSync(logicPath, "utf8");
const configSource = fs.readFileSync(configPath, "utf8");
const logic = require("./logic.js");
const editableConfig = require("./config.js");

const EXPECTED_API_KEYS = [
  "COMMIT_THRESHOLD",
  "DEFAULT_CONFIG",
  "FOLD_COUNT",
  "FOLD_IDS",
  "FOLD_STEPS",
  "MAX_TRAVEL_PX",
  "PHASES",
  "VERSION",
  "assertState",
  "createInitialState",
  "getOrigamiHeartView",
  "projectFoldProgress",
  "reduceOrigamiHeart",
  "sanitizeConfig",
  "shouldCommitFold",
];

const CONFIG_HASH = "ee52a0c917c83b5cb14e2a7ba3254dc2341b9e4dec8687018b67f86c69bfacae";
const FOLD_STEPS_HASH = "edd0e5bdee646d9a78fdf135a044efd98761d17971e2f46fdd59bcc43199217b";

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  if (typeof value === "function") return;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

function validConfig(overrides = {}) {
  return {
    recipientName: "收件人",
    finalTitle: "最终标题",
    finalMessage: "这是一段只在最后出现的留言。",
    signature: "署名",
    ...overrides,
  };
}

function startState() {
  return logic.reduceOrigamiHeart(logic.createInitialState(), { type: "START" });
}

function completeState() {
  let state = startState();
  for (const foldId of logic.FOLD_IDS) {
    state = logic.reduceOrigamiHeart(state, { type: "COMMIT_FOLD", foldId });
  }
  return logic.reduceOrigamiHeart(state, { type: "TURN_OVER" });
}

test("UMD exposes one frozen browser/CommonJS API and editable config", () => {
  assert.equal(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
    "{\"type\":\"commonjs\"}\n",
  );
  assert.deepEqual(Object.keys(logic).sort(), EXPECTED_API_KEYS);
  assertDeepFrozen(logic);

  const logicContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(logicSource, logicContext, { filename: "logic.js" });
  assert.equal(logicContext.module.exports, logicContext.OrigamiHeartLogic);
  assert.deepEqual(
    Array.from(Object.keys(logicContext.module.exports)).sort(),
    EXPECTED_API_KEYS,
  );
  assert.equal(
    vm.runInContext("Object.isFrozen(module.exports)", logicContext),
    true,
  );
  assert.equal(require("./logic.js"), logic);

  const configContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(configSource, configContext, { filename: "config.js" });
  assert.equal(configContext.module.exports, configContext.OrigamiHeartConfig);
  assert.deepEqual(
    JSON.parse(JSON.stringify(configContext.module.exports)),
    logic.DEFAULT_CONFIG,
  );
  assert.deepEqual(editableConfig, logic.DEFAULT_CONFIG);
});

test("constants and the five-step geometry are canonical and frozen", () => {
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.FOLD_COUNT, 5);
  assert.equal(logic.COMMIT_THRESHOLD, 0.72);
  assert.equal(logic.MAX_TRAVEL_PX, 4096);
  assert.deepEqual(logic.FOLD_IDS, [
    "bottom-up",
    "left-in",
    "right-in",
    "top-left-soften",
    "top-right-soften",
  ]);
  assert.deepEqual(
    logic.FOLD_STEPS.map(({ axisX, axisY, travelFactor }) => ({
      axisX,
      axisY,
      travelFactor,
    })),
    [
      { axisX: 0, axisY: -1, travelFactor: 0.36 },
      { axisX: 1, axisY: 0, travelFactor: 0.28 },
      { axisX: -1, axisY: 0, travelFactor: 0.28 },
      { axisX: 1, axisY: 1, travelFactor: 0.24 },
      { axisX: -1, axisY: 1, travelFactor: 0.24 },
    ],
  );
  assert.equal(sha256(logic.DEFAULT_CONFIG), CONFIG_HASH);
  assert.equal(sha256(logic.FOLD_STEPS), FOLD_STEPS_HASH);
  assertDeepFrozen(logic.FOLD_STEPS);
  assertDeepFrozen(logic.DEFAULT_CONFIG);
});

test("sanitizeConfig normalizes NFC and Unicode whitespace atomically", () => {
  const source = Object.create(null);
  source.recipientName = "  e\u0301 \n 爱  ";
  source.finalTitle = "\t 一张\u00a0纸 ";
  source.finalMessage = " 第一行\r\n第二行 ";
  source.signature = " 署\u3000名 ";

  const sanitized = logic.sanitizeConfig(source);
  assert.deepEqual(sanitized, {
    recipientName: "é 爱",
    finalTitle: "一张 纸",
    finalMessage: "第一行 第二行",
    signature: "署 名",
  });
  assert.notEqual(sanitized, source);
  assertDeepFrozen(sanitized);

  source.recipientName = "改过";
  assert.equal(sanitized.recipientName, "é 爱");
});

test("sanitizeConfig enforces code-point bounds and full fallback", () => {
  assert.equal(
    logic.sanitizeConfig(validConfig({ recipientName: "😀".repeat(24) })).recipientName,
    "😀".repeat(24),
  );
  assert.equal(
    logic.sanitizeConfig(validConfig({ recipientName: "😀".repeat(25) })),
    logic.DEFAULT_CONFIG,
  );
  assert.equal(
    logic.sanitizeConfig(validConfig({ finalTitle: "题".repeat(41) })),
    logic.DEFAULT_CONFIG,
  );
  assert.equal(
    logic.sanitizeConfig(validConfig({ finalMessage: "话".repeat(181) })),
    logic.DEFAULT_CONFIG,
  );
  assert.equal(
    logic.sanitizeConfig(validConfig({ signature: "名".repeat(33) })),
    logic.DEFAULT_CONFIG,
  );
  assert.equal(
    logic.sanitizeConfig(validConfig({ finalMessage: "   \n\t " })),
    logic.DEFAULT_CONFIG,
  );
  assert.equal(
    logic.sanitizeConfig(validConfig({ signature: new String("署名") })),
    logic.DEFAULT_CONFIG,
  );
});

test("sanitizeConfig rejects hostile schemas without executing getters", () => {
  let getterCalls = 0;
  const accessor = validConfig();
  Object.defineProperty(accessor, "finalTitle", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "不能执行";
    },
  });
  assert.equal(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);
  assert.equal(getterCalls, 0);

  const extra = validConfig();
  extra.extra = "x";
  assert.equal(logic.sanitizeConfig(extra), logic.DEFAULT_CONFIG);

  const symbol = validConfig();
  symbol[Symbol("x")] = "x";
  assert.equal(logic.sanitizeConfig(symbol), logic.DEFAULT_CONFIG);

  const customPrototype = Object.assign(Object.create({ inherited: true }), validConfig());
  assert.equal(logic.sanitizeConfig(customPrototype), logic.DEFAULT_CONFIG);

  assert.equal(logic.sanitizeConfig([]), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig(null), logic.DEFAULT_CONFIG);
});

test("config snapshots use descriptors once and never ordinary Proxy get", () => {
  const calls = new Map();
  let ordinaryGets = 0;
  const proxy = new Proxy(validConfig(), {
    get() {
      ordinaryGets += 1;
      throw new Error("ordinary get must not run");
    },
    getOwnPropertyDescriptor(target, key) {
      calls.set(key, (calls.get(key) || 0) + 1);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  assert.deepEqual(logic.sanitizeConfig(proxy), validConfig());
  assert.equal(ordinaryGets, 0);
  for (const key of ["recipientName", "finalTitle", "finalMessage", "signature"]) {
    assert.equal(calls.get(key), 1);
  }

  const throwing = new Proxy(validConfig(), {
    ownKeys() {
      throw new Error("trap");
    },
  });
  assert.equal(logic.sanitizeConfig(throwing), logic.DEFAULT_CONFIG);

  const revoked = Proxy.revocable(validConfig(), {});
  revoked.revoke();
  assert.equal(logic.sanitizeConfig(revoked.proxy), logic.DEFAULT_CONFIG);
});

test("projectFoldProgress covers all vectors, clamp, and orthogonal motion", () => {
  assert.equal(logic.projectFoldProgress("bottom-up", 0, -72, 100), 0.72);
  assert.equal(logic.projectFoldProgress("bottom-up", 90, 0, 100), 0);
  assert.equal(logic.projectFoldProgress("bottom-up", 0, 20, 100), 0);

  assert.equal(logic.projectFoldProgress("left-in", 72, 0, 100), 0.72);
  assert.equal(logic.projectFoldProgress("left-in", 0, 72, 100), 0);
  assert.equal(logic.projectFoldProgress("right-in", -72, 0, 100), 0.72);
  assert.equal(logic.projectFoldProgress("right-in", 72, 0, 100), 0);

  assert.equal(logic.projectFoldProgress("top-left-soften", 72, 72, 100), 0.72);
  assert.equal(logic.projectFoldProgress("top-left-soften", 72, -72, 100), 0);
  assert.equal(logic.projectFoldProgress("top-right-soften", -72, 72, 100), 0.72);
  assert.equal(logic.projectFoldProgress("top-right-soften", 72, -72, 100), 0);

  assert.equal(logic.projectFoldProgress("left-in", 500, 0, 100), 1);
  assert.equal(logic.projectFoldProgress("left-in", -500, 0, 100), 0);
});

test("projectFoldProgress and shouldCommitFold reject non-finite or out-of-range values", () => {
  for (const value of [NaN, Infinity, -Infinity, "72", null, {}, new Number(72)]) {
    assert.equal(logic.projectFoldProgress("left-in", value, 0, 100), 0);
    assert.equal(logic.shouldCommitFold(value), false);
  }
  for (const travel of [0, -1, 4097, Infinity, NaN, "100"]) {
    assert.equal(logic.projectFoldProgress("left-in", 72, 0, travel), 0);
  }
  assert.equal(logic.projectFoldProgress("unknown", 72, 0, 100), 0);
  assert.equal(logic.projectFoldProgress({}, 72, 0, 100), 0);
  assert.equal(logic.projectFoldProgress("left-in", 0.72, 0, 1), 0.72);
  assert.equal(logic.projectFoldProgress("left-in", 4096, 0, 4096), 1);

  assert.equal(logic.shouldCommitFold(0), false);
  assert.equal(logic.shouldCommitFold(0.719), false);
  assert.equal(logic.shouldCommitFold(0.72), true);
  assert.equal(logic.shouldCommitFold(1), true);
});

test("initial state is a fresh exact frozen canonical value", () => {
  const first = logic.createInitialState();
  const second = logic.createInitialState();
  assert.notEqual(first, second);
  assert.deepEqual(first, {
    version: 1,
    phase: "intro",
    completedFoldIds: [],
    revision: 0,
    lastNotice: "ready",
  });
  assert.deepEqual(Object.keys(first), [
    "version",
    "phase",
    "completedFoldIds",
    "revision",
    "lastNotice",
  ]);
  assertDeepFrozen(first);
  assert.equal(logic.assertState(first), first);

  const clone = JSON.parse(JSON.stringify(first));
  assert.equal(logic.assertState(clone), clone);
});

test("golden reducer path has exact canonical states and requires TURN_OVER", () => {
  const expected = [
    ["folding", [], 1, "started"],
    ["folding", ["bottom-up"], 2, "fold-committed"],
    ["folding", ["bottom-up", "left-in"], 3, "fold-committed"],
    ["folding", ["bottom-up", "left-in", "right-in"], 4, "fold-committed"],
    [
      "folding",
      ["bottom-up", "left-in", "right-in", "top-left-soften"],
      5,
      "fold-committed",
    ],
    ["turning", [...logic.FOLD_IDS], 6, "folding-complete"],
    ["complete", [...logic.FOLD_IDS], 7, "revealed"],
  ];

  let state = logic.reduceOrigamiHeart(logic.createInitialState(), { type: "START" });
  assertStateTuple(state, expected[0]);
  for (let index = 0; index < logic.FOLD_IDS.length; index += 1) {
    state = logic.reduceOrigamiHeart(state, {
      type: "COMMIT_FOLD",
      foldId: logic.FOLD_IDS[index],
    });
    assertStateTuple(state, expected[index + 1]);
  }
  assert.equal(state.phase, "turning");
  state = logic.reduceOrigamiHeart(state, { type: "TURN_OVER" });
  assertStateTuple(state, expected[6]);
  assertDeepFrozen(state);
});

function assertStateTuple(state, expected) {
  assert.deepEqual(
    [state.phase, state.completedFoldIds, state.revision, state.lastNotice],
    expected,
  );
}

test("every fold prefix rejects all other valid fold IDs by same-reference no-op", () => {
  let state = startState();
  for (let expectedIndex = 0; expectedIndex < logic.FOLD_IDS.length; expectedIndex += 1) {
    for (let candidateIndex = 0; candidateIndex < logic.FOLD_IDS.length; candidateIndex += 1) {
      if (candidateIndex === expectedIndex) continue;
      const result = logic.reduceOrigamiHeart(state, {
        type: "COMMIT_FOLD",
        foldId: logic.FOLD_IDS[candidateIndex],
      });
      assert.equal(result, state);
    }
    state = logic.reduceOrigamiHeart(state, {
      type: "COMMIT_FOLD",
      foldId: logic.FOLD_IDS[expectedIndex],
    });
  }
  assert.equal(state.phase, "turning");
  for (const foldId of logic.FOLD_IDS) {
    assert.equal(
      logic.reduceOrigamiHeart(state, { type: "COMMIT_FOLD", foldId }),
      state,
    );
  }
});

test("well-formed actions in the wrong phase are same-reference no-ops", () => {
  const intro = logic.createInitialState();
  assert.equal(logic.reduceOrigamiHeart(intro, { type: "TURN_OVER" }), intro);
  assert.equal(logic.reduceOrigamiHeart(intro, { type: "RESTART" }), intro);

  const folding = startState();
  assert.equal(logic.reduceOrigamiHeart(folding, { type: "START" }), folding);
  assert.equal(logic.reduceOrigamiHeart(folding, { type: "TURN_OVER" }), folding);
  assert.equal(logic.reduceOrigamiHeart(folding, { type: "RESTART" }).phase, "intro");

  const complete = completeState();
  assert.equal(logic.reduceOrigamiHeart(complete, { type: "START" }), complete);
  const restarted = logic.reduceOrigamiHeart(complete, { type: "RESTART" });
  assert.deepEqual(restarted, logic.createInitialState());
  assert.notEqual(restarted, complete);
});

test("action schema is exact, hostile accessors do not execute, and null prototype is accepted", () => {
  const folding = startState();
  const nullPrototypeAction = Object.create(null);
  nullPrototypeAction.type = "COMMIT_FOLD";
  nullPrototypeAction.foldId = "bottom-up";
  assert.equal(
    logic.reduceOrigamiHeart(folding, nullPrototypeAction).revision,
    2,
  );

  const malformed = [
    null,
    [],
    { type: "UNKNOWN" },
    { type: "START", extra: true },
    { type: "COMMIT_FOLD" },
    { type: "COMMIT_FOLD", foldId: "unknown" },
    { type: "COMMIT_FOLD", foldId: new String("bottom-up") },
    Object.assign(Object.create({ inherited: true }), { type: "START" }),
  ];
  for (const action of malformed) {
    assert.throws(
      () => logic.reduceOrigamiHeart(folding, action),
      TypeError,
    );
  }

  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "type", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "START";
    },
  });
  assert.throws(() => logic.reduceOrigamiHeart(folding, accessor), TypeError);
  assert.equal(getterCalls, 0);

  const symbolic = { type: "START" };
  symbolic[Symbol("extra")] = true;
  assert.throws(() => logic.reduceOrigamiHeart(folding, symbolic), TypeError);
});

test("action Proxy is read by descriptors once and never by ordinary get", () => {
  const folding = startState();
  let ordinaryGets = 0;
  const descriptorCalls = new Map();
  const action = new Proxy({ type: "COMMIT_FOLD", foldId: "bottom-up" }, {
    get() {
      ordinaryGets += 1;
      throw new Error("ordinary get must not run");
    },
    getOwnPropertyDescriptor(target, key) {
      descriptorCalls.set(key, (descriptorCalls.get(key) || 0) + 1);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const next = logic.reduceOrigamiHeart(folding, action);
  assert.equal(next.revision, 2);
  assert.equal(ordinaryGets, 0);
  assert.equal(descriptorCalls.get("type"), 1);
  assert.equal(descriptorCalls.get("foldId"), 1);
});

test("invalid state returns a fresh safe intro without reading the action", () => {
  let actionReads = 0;
  const action = new Proxy({}, {
    ownKeys() {
      actionReads += 1;
      throw new Error("must not inspect action");
    },
  });
  const invalidState = {
    version: 1,
    phase: "folding",
    completedFoldIds: [],
    revision: 99,
    lastNotice: "started",
  };
  const first = logic.reduceOrigamiHeart(invalidState, action);
  const second = logic.reduceOrigamiHeart(invalidState, action);
  assert.deepEqual(first, logic.createInitialState());
  assert.deepEqual(second, logic.createInitialState());
  assert.notEqual(first, second);
  assert.equal(actionReads, 0);
});

test("state validation rejects forged prefix, phase, revision, notice, and hostile arrays", () => {
  const valid = JSON.parse(JSON.stringify(startState()));
  const forgeries = [
    { ...valid, version: 2 },
    { ...valid, phase: "complete" },
    { ...valid, revision: 2 },
    { ...valid, lastNotice: "ready" },
    { ...valid, completedFoldIds: ["left-in"] },
    { ...valid, completedFoldIds: ["bottom-up", "bottom-up"] },
    { ...valid, completedFoldIds: new Array(1) },
    { ...valid, completedFoldIds: Object.assign(["bottom-up"], { extra: true }) },
  ];
  for (const candidate of forgeries) {
    assert.throws(() => logic.assertState(candidate), TypeError);
    assert.deepEqual(
      logic.reduceOrigamiHeart(candidate, { type: "START" }),
      logic.createInitialState(),
    );
  }

  const customArray = ["bottom-up"];
  Object.setPrototypeOf(customArray, Object.create(Array.prototype));
  assert.throws(
    () => logic.assertState({ ...valid, completedFoldIds: customArray }),
    TypeError,
  );

  const throwingArray = new Proxy([], {
    ownKeys() {
      throw new Error("trap");
    },
  });
  assert.throws(
    () => logic.assertState({ ...valid, completedFoldIds: throwingArray }),
    TypeError,
  );
});

test("JSON-cloned canonical states remain valid and transition deterministically", () => {
  let state = startState();
  for (const foldId of logic.FOLD_IDS) {
    const clone = JSON.parse(JSON.stringify(state));
    assert.equal(logic.assertState(clone), clone);
    state = logic.reduceOrigamiHeart(clone, { type: "COMMIT_FOLD", foldId });
  }
  const turningClone = JSON.parse(JSON.stringify(state));
  const completeFromClone = logic.reduceOrigamiHeart(turningClone, { type: "TURN_OVER" });
  assert.deepEqual(completeFromClone, completeState());
});

test("public views expose exact fold prefix and controls for every phase", () => {
  let state = logic.createInitialState();
  let view = logic.getOrigamiHeartView(state, validConfig());
  assert.equal(view.phase, "intro");
  assert.equal(view.currentFold, null);
  assert.deepEqual(view.controls, {
    canStart: true,
    canCommitFold: false,
    canTurnOver: false,
    canRestart: false,
  });
  assert.deepEqual(view.foldList.map((item) => item.status), [
    "upcoming", "upcoming", "upcoming", "upcoming", "upcoming",
  ]);

  state = logic.reduceOrigamiHeart(state, { type: "START" });
  for (let index = 0; index < logic.FOLD_IDS.length; index += 1) {
    view = logic.getOrigamiHeartView(state, validConfig());
    assert.equal(view.currentFold.id, logic.FOLD_IDS[index]);
    assert.equal(view.progress.completed, index);
    assert.equal(view.progress.total, 5);
    assert.equal(view.progress.currentStepNumber, index + 1);
    assert.deepEqual(
      view.foldList.map((item) => item.status),
      logic.FOLD_IDS.map((_id, itemIndex) => (
        itemIndex < index ? "done" : itemIndex === index ? "current" : "upcoming"
      )),
    );
    assert.equal(view.controls.canCommitFold, true);
    state = logic.reduceOrigamiHeart(state, {
      type: "COMMIT_FOLD",
      foldId: logic.FOLD_IDS[index],
    });
  }

  view = logic.getOrigamiHeartView(state, validConfig());
  assert.equal(view.phase, "turning");
  assert.equal(view.currentFold, null);
  assert.equal(view.controls.canTurnOver, true);
  assert.deepEqual(view.foldList.map((item) => item.status), [
    "done", "done", "done", "done", "done",
  ]);

  state = logic.reduceOrigamiHeart(state, { type: "TURN_OVER" });
  view = logic.getOrigamiHeartView(state, validConfig());
  assert.equal(view.phase, "complete");
  assert.equal(view.controls.canRestart, true);
  assertDeepFrozen(view);
});

test("private config is structurally absent from every pre-complete view", () => {
  const sentinel = {
    recipientName: "收件-X7",
    finalTitle: "标题-T4",
    finalMessage: "留言-N6",
    signature: "署名-Q2",
  };
  const forbidden = Object.values(sentinel);

  let state = logic.createInitialState();
  const states = [state];
  state = logic.reduceOrigamiHeart(state, { type: "START" });
  states.push(state);
  for (const foldId of logic.FOLD_IDS) {
    state = logic.reduceOrigamiHeart(state, { type: "COMMIT_FOLD", foldId });
    states.push(state);
  }
  for (const candidate of states) {
    assert.notEqual(candidate.phase, "complete");
    const view = logic.getOrigamiHeartView(candidate, sentinel);
    assert.equal(view.privateContent, null);
    const serialized = JSON.stringify(view);
    for (const value of forbidden) assert.equal(serialized.includes(value), false);
  }

  let configReads = 0;
  const hostileConfig = new Proxy(sentinel, {
    ownKeys() {
      configReads += 1;
      throw new Error("pre-complete config must not be inspected");
    },
  });
  const view = logic.getOrigamiHeartView(startState(), hostileConfig);
  assert.equal(view.privateContent, null);
  assert.equal(configReads, 0);
});

test("complete view exposes only sanitized private content and breaks input references", () => {
  const candidate = {
    recipientName: " 收件-X7 ",
    finalTitle: " 标题-T4 ",
    finalMessage: " 留言-N6 ",
    signature: " 署名-Q2 ",
  };
  const view = logic.getOrigamiHeartView(completeState(), candidate);
  assert.deepEqual(view.privateContent, {
    recipientName: "收件-X7",
    finalTitle: "标题-T4",
    finalMessage: "留言-N6",
    signature: "署名-Q2",
  });
  assert.notEqual(view.privateContent, candidate);
  assertDeepFrozen(view);

  candidate.finalMessage = "修改";
  assert.equal(view.privateContent.finalMessage, "留言-N6");

  const invalidView = logic.getOrigamiHeartView(completeState(), {
    ...validConfig(),
    extra: true,
  });
  assert.deepEqual(invalidView.privateContent, logic.DEFAULT_CONFIG);
  assert.notEqual(invalidView.privateContent, logic.DEFAULT_CONFIG);
});

test("invalid state yields a safe intro view and does not inspect config", () => {
  let configReads = 0;
  const hostileConfig = new Proxy(validConfig(), {
    ownKeys() {
      configReads += 1;
      throw new Error("must not inspect config");
    },
  });
  const view = logic.getOrigamiHeartView({
    version: 1,
    phase: "complete",
    completedFoldIds: [...logic.FOLD_IDS],
    revision: 6,
    lastNotice: "revealed",
  }, hostileConfig);
  assert.equal(view.phase, "intro");
  assert.equal(view.privateContent, null);
  assert.equal(configReads, 0);
  assertDeepFrozen(view);
});

test("production logic has no DOM, time, random, storage, network, or unsafe sink", () => {
  const forbidden = [
    /\bdocument\b/u,
    /\bwindow\b/u,
    /\bDate\b/u,
    /\bperformance\b/u,
    /Math\.random/u,
    /\bsetTimeout\b/u,
    /\bsetInterval\b/u,
    /\brequestAnimationFrame\b/u,
    /\bfetch\b/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\binnerHTML\b/u,
    /\beval\s*\(/u,
    /\bFunction\s*\(/u,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(logicSource), false, `forbidden production token: ${pattern}`);
  }
});
