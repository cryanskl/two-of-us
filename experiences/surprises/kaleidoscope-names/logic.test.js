"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const config = require("./config.js");
const logic = require("./logic.js");

const {
  CONSTANTS,
  DEFAULT_CONFIG,
  ACTIONS,
  sanitizeConfig,
  evaluateSelection,
  createPatternModel,
  createInitialState,
  reduce,
  getPublicView
} = logic;

function validConfig(overrides = {}) {
  return {
    publicTitle: DEFAULT_CONFIG.publicTitle,
    publicInstructions: DEFAULT_CONFIG.publicInstructions,
    foldHint: DEFAULT_CONFIG.foldHint,
    phaseHint: DEFAULT_CONFIG.phaseHint,
    targetFolds: DEFAULT_CONFIG.targetFolds,
    targetPhase: DEFAULT_CONFIG.targetPhase,
    marks: [...DEFAULT_CONFIG.marks],
    finalTitle: DEFAULT_CONFIG.finalTitle,
    finalMessage: DEFAULT_CONFIG.finalMessage,
    signature: DEFAULT_CONFIG.signature,
    ...overrides
  };
}

function action(state, type, value) {
  if (arguments.length === 3) {
    return { type, value, revision: state.revision };
  }
  return { type, revision: state.revision };
}

function start(state) {
  return reduce(state, action(state, ACTIONS.START));
}

function align(state) {
  let next = state;
  if (next.selection.folds !== next.content.targetFolds) {
    next = reduce(
      next,
      action(next, ACTIONS.SET_FOLDS, next.content.targetFolds)
    );
  }
  if (next.selection.phaseStep !== next.content.targetPhase) {
    next = reduce(
      next,
      action(next, ACTIONS.SET_PHASE, next.content.targetPhase)
    );
  }
  return next;
}

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function") ||
    seen.has(value)
  ) {
    return;
  }
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  if (typeof value === "function") {
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

test("exports the exact frozen API, constants, and actions", () => {
  assert.deepEqual(Object.keys(logic), [
    "CONSTANTS",
    "DEFAULT_CONFIG",
    "ACTIONS",
    "sanitizeConfig",
    "evaluateSelection",
    "createPatternModel",
    "createInitialState",
    "reduce",
    "getPublicView"
  ]);
  assert.deepEqual(Object.keys(CONSTANTS), [
    "VERSION",
    "FOLD_MIN",
    "FOLD_MAX",
    "FOLD_VALUES",
    "PHASE_MIN",
    "PHASE_MAX",
    "PHASE_COUNT",
    "TURN_UNITS",
    "PHASE_UNITS",
    "NEAR_FOLD_DISTANCE",
    "NEAR_PHASE_DISTANCE",
    "INITIAL_FOLDS",
    "INITIAL_PHASE",
    "MAX_REVISION"
  ]);
  assert.deepEqual(Object.keys(ACTIONS), [
    "START",
    "SET_FOLDS",
    "SET_PHASE",
    "REVEAL",
    "RESTART"
  ]);
  assert.deepEqual(ACTIONS, {
    START: "START",
    SET_FOLDS: "SET_FOLDS",
    SET_PHASE: "SET_PHASE",
    REVEAL: "REVEAL",
    RESTART: "RESTART"
  });
  assertDeepFrozen(logic);
});

test("classic scripts expose editable config and the same frozen browser API", () => {
  const sandbox = { window: {} };
  const configSource = readFileSync(require.resolve("./config.js"), "utf8");
  const logicSource = readFileSync(require.resolve("./logic.js"), "utf8");

  vm.runInNewContext(configSource, sandbox, { filename: "config.js" });
  vm.runInNewContext(logicSource, sandbox, { filename: "logic.js" });

  assert.deepEqual(
    Object.keys(sandbox.window.KALEIDOSCOPE_NAMES_CONFIG),
    Object.keys(config)
  );
  assert.equal(
    sandbox.window.KALEIDOSCOPE_NAMES_CONFIG.targetPhase,
    config.targetPhase
  );
  assert.equal(
    Object.isFrozen(sandbox.window.KALEIDOSCOPE_NAMES_CONFIG),
    false
  );
  assert.deepEqual(
    Object.keys(sandbox.window.KaleidoscopeNamesLogic),
    Object.keys(logic)
  );
  assert.equal(
    sandbox.window.KaleidoscopeNamesLogic.CONSTANTS.TURN_UNITS,
    logic.CONSTANTS.TURN_UNITS
  );
  assert.equal(Object.isFrozen(sandbox.window.KaleidoscopeNamesLogic), true);
});

test("default config and editable config candidate have exact values", () => {
  assert.deepEqual(config, {
    publicTitle: "把名字折成同一束光",
    publicInstructions: "读两条线索，选折面、转相位，让两项都对齐。",
    foldHint: "示例线索：把折面调到一周里周末之前的那一天数。",
    phaseHint: "示例线索：让刻度停在钟面十一点的位置。",
    targetFolds: 5,
    targetPhase: 22,
    marks: ["光", "影"],
    finalTitle: "原来我们一直在同一束光里",
    finalMessage: "角度不同，折回来时，还是在这里遇见。",
    signature: "来自准备这枚小镜子的人"
  });
  assert.deepEqual(config, DEFAULT_CONFIG);
  assert.equal(Object.isFrozen(config), false);
  assert.notEqual(config, DEFAULT_CONFIG);
  assert.notEqual(config.marks, DEFAULT_CONFIG.marks);
  assert.notDeepEqual(
    [CONSTANTS.INITIAL_FOLDS, CONSTANTS.INITIAL_PHASE],
    [DEFAULT_CONFIG.targetFolds, DEFAULT_CONFIG.targetPhase]
  );
});

test("sanitizeConfig normalizes valid text and severs ownership", () => {
  const marks = ["e\u0301", "光"];
  const candidate = validConfig({
    publicTitle: "  把\u00a0名字\u2003折成光  ",
    marks
  });
  const sanitized = sanitizeConfig(candidate);

  assert.equal(sanitized.publicTitle, "把 名字 折成光");
  assert.equal(sanitized.marks[0], "é");
  assert.notEqual(sanitized, candidate);
  assert.notEqual(sanitized.marks, marks);
  assertDeepFrozen(sanitized);

  marks[0] = "坏";
  candidate.publicTitle = "坏";
  assert.equal(sanitized.publicTitle, "把 名字 折成光");
  assert.equal(sanitized.marks[0], "é");
});

test("sanitizeConfig falls back atomically to the same default reference", () => {
  const cases = [
    undefined,
    null,
    { ...validConfig(), extra: true },
    (() => {
      const value = validConfig();
      delete value.signature;
      return value;
    })(),
    validConfig({ targetFolds: "5" }),
    validConfig({ targetPhase: new Number(22) }),
    validConfig({ targetFolds: 4, targetPhase: 0 }),
    validConfig({ finalMessage: "" }),
    validConfig({ signature: "x".repeat(51) }),
    validConfig({ marks: ["光", " "] }),
    validConfig({ marks: ["👩‍❤️‍👩", "光"] }),
    validConfig({ publicTitle: "安全\u202e标题" }),
    validConfig({ publicTitle: "\ud800" }),
    validConfig({ targetPhase: Infinity }),
    validConfig({ targetPhase: NaN }),
    validConfig({ targetPhase: 1n })
  ];

  for (const candidate of cases) {
    assert.equal(sanitizeConfig(candidate), DEFAULT_CONFIG);
  }
});

test("sanitizeConfig rejects accessors, sparse arrays, subclasses, and hostile proxies", () => {
  const getterConfig = validConfig();
  Object.defineProperty(getterConfig, "foldHint", {
    enumerable: true,
    get() {
      throw new Error("must not read");
    }
  });

  const getterMarks = validConfig();
  Object.defineProperty(getterMarks.marks, "0", {
    enumerable: true,
    get() {
      throw new Error("must not read");
    }
  });

  const sparse = validConfig({ marks: new Array(2) });
  class Marks extends Array {}
  const subclass = validConfig({ marks: new Marks("光", "影") });
  const extraMarkKey = validConfig();
  extraMarkKey.marks.extra = "x";

  const hostileConfig = new Proxy(validConfig(), {
    ownKeys() {
      throw new Error("hostile");
    }
  });
  const hostileMarks = validConfig({
    marks: new Proxy(["光", "影"], {
      getOwnPropertyDescriptor() {
        throw new Error("hostile");
      }
    })
  });

  for (const candidate of [
    getterConfig,
    getterMarks,
    sparse,
    subclass,
    extraMarkKey,
    hostileConfig,
    hostileMarks
  ]) {
    assert.doesNotThrow(() => sanitizeConfig(candidate));
    assert.equal(sanitizeConfig(candidate), DEFAULT_CONFIG);
  }
});

test("marks may be equal and are counted by Unicode code point", () => {
  const same = sanitizeConfig(validConfig({ marks: ["光", "光"] }));
  const pair = sanitizeConfig(validConfig({ marks: ["❤️", "AB"] }));
  assert.deepEqual(same.marks, ["光", "光"]);
  assert.deepEqual(pair.marks, ["❤️", "AB"]);
});

test("evaluateSelection enforces exact domains and circular distance", () => {
  assert.deepEqual(evaluateSelection(4, 0, 5, 22), {
    foldDistance: 1,
    phaseDistance: 2,
    foldStatus: "near",
    phaseStatus: "near",
    aligned: false
  });
  assert.equal(evaluateSelection(4, 0, 4, 23).phaseDistance, 1);
  assert.equal(evaluateSelection(4, 0, 4, 22).phaseDistance, 2);
  assert.equal(evaluateSelection(4, 23, 4, 1).phaseDistance, 2);
  assert.equal(evaluateSelection(4, 0, 4, 12).phaseDistance, 12);
  assert.equal(evaluateSelection(7, 11, 7, 11).aligned, true);
  assertDeepFrozen(evaluateSelection(7, 11, 7, 11));

  for (const args of [
    [3, 0, 4, 0],
    [4, 24, 4, 0],
    ["4", 0, 4, 0],
    [4, 0, 4, 0.5],
    [4, 0, 4, NaN],
    [4, 0, 4, 0n]
  ]) {
    assert.equal(evaluateSelection(...args), null);
  }
});

test("all 144 targets have exactly one aligned selection", () => {
  for (let targetFolds = 4; targetFolds <= 9; targetFolds += 1) {
    for (let targetPhase = 0; targetPhase <= 23; targetPhase += 1) {
      let actualAligned = 0;
      let oracleAligned = 0;

      for (let folds = 4; folds <= 9; folds += 1) {
        for (let phase = 0; phase <= 23; phase += 1) {
          if (evaluateSelection(folds, phase, targetFolds, targetPhase).aligned) {
            actualAligned += 1;
          }
          if (folds === targetFolds && phase === targetPhase) {
            oracleAligned += 1;
          }
        }
      }

      assert.equal(actualAligned, 1);
      assert.equal(oracleAligned, 1);
    }
  }
});

test("pattern model uses exact integer rotations and alternating mirrors", () => {
  for (let folds = 4; folds <= 9; folds += 1) {
    assert.equal(2520 % folds, 0);
    const wedgeUnits = 2520 / folds;

    for (let phase = 0; phase <= 23; phase += 1) {
      const model = createPatternModel(folds, phase);
      assert.deepEqual(Object.keys(model), [
        "turnUnits",
        "phaseUnits",
        "folds",
        "phaseStep",
        "wedges"
      ]);
      assert.equal(model.wedges.length, folds);
      model.wedges.forEach((wedge, index) => {
        assert.deepEqual(wedge, {
          index,
          rotationUnits: (phase * 105 + index * wedgeUnits) % 2520,
          mirrored: index % 2 === 1
        });
        assert.equal(Number.isSafeInteger(wedge.rotationUnits), true);
        assert.equal(wedge.rotationUnits >= 0 && wedge.rotationUnits < 2520, true);
      });
      assertDeepFrozen(model);
    }
  }
  assert.equal(2520 % 24, 0);
  assert.equal(2520 / 24, 105);
  assert.equal(createPatternModel(3, 0), null);
  assert.equal(createPatternModel(4, 24), null);
  assert.equal(createPatternModel("4", 0), null);
});

test("pattern models are deterministic and separately owned", () => {
  const first = createPatternModel(7, 11);
  const second = createPatternModel(7, 11);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.notEqual(first.wedges, second.wedges);
  assert.notEqual(first.wedges[0], second.wedges[0]);
});

test("initial state has exact frozen shape and content ownership", () => {
  const candidate = validConfig({ marks: ["A", "B"] });
  const state = createInitialState(candidate);
  assert.deepEqual(Object.keys(state), [
    "version",
    "phase",
    "content",
    "selection",
    "revision"
  ]);
  assert.equal(state.version, 1);
  assert.equal(state.phase, "intro");
  assert.deepEqual(state.selection, { folds: 4, phaseStep: 0 });
  assert.equal(state.revision, 0);
  assert.notEqual(state.content, candidate);
  assert.notEqual(state.content.marks, candidate.marks);
  assertDeepFrozen(state);

  const defaultState = createInitialState();
  assert.equal(defaultState.content, DEFAULT_CONFIG);
});

test("START and SET actions advance revisions and align atomically", () => {
  let state = createInitialState();
  state = start(state);
  assert.equal(state.phase, "tuning");
  assert.equal(state.revision, 1);

  state = reduce(state, action(state, ACTIONS.SET_FOLDS, 5));
  assert.equal(state.phase, "tuning");
  assert.equal(state.revision, 2);

  state = reduce(state, action(state, ACTIONS.SET_PHASE, 22));
  assert.equal(state.phase, "aligned");
  assert.equal(state.revision, 3);
  assert.deepEqual(state.selection, { folds: 5, phaseStep: 22 });
});

test("fold-first and phase-first produce the same authoritative result", () => {
  let foldFirst = start(createInitialState());
  foldFirst = reduce(
    foldFirst,
    action(foldFirst, ACTIONS.SET_FOLDS, DEFAULT_CONFIG.targetFolds)
  );
  foldFirst = reduce(
    foldFirst,
    action(foldFirst, ACTIONS.SET_PHASE, DEFAULT_CONFIG.targetPhase)
  );

  let phaseFirst = start(createInitialState());
  phaseFirst = reduce(
    phaseFirst,
    action(phaseFirst, ACTIONS.SET_PHASE, DEFAULT_CONFIG.targetPhase)
  );
  phaseFirst = reduce(
    phaseFirst,
    action(phaseFirst, ACTIONS.SET_FOLDS, DEFAULT_CONFIG.targetFolds)
  );

  assert.equal(foldFirst.phase, "aligned");
  assert.equal(phaseFirst.phase, "aligned");
  assert.deepEqual(foldFirst.selection, phaseFirst.selection);
  assert.equal(foldFirst.revision, phaseFirst.revision);
});

test("invalid, stale, future, extra-field, and same-value actions are no-ops", () => {
  const intro = createInitialState();
  const tuning = start(intro);
  const cases = [
    null,
    {},
    { type: ACTIONS.START, revision: tuning.revision, extra: true },
    { type: ACTIONS.SET_FOLDS, value: 5, revision: tuning.revision, extra: true },
    { type: ACTIONS.SET_FOLDS, value: "5", revision: tuning.revision },
    { type: ACTIONS.SET_PHASE, value: 24, revision: tuning.revision },
    { type: ACTIONS.SET_PHASE, value: 0, revision: tuning.revision },
    { type: ACTIONS.SET_FOLDS, value: 4, revision: tuning.revision },
    { type: ACTIONS.SET_FOLDS, value: 5, revision: tuning.revision - 1 },
    { type: ACTIONS.SET_FOLDS, value: 5, revision: tuning.revision + 1 },
    { type: ACTIONS.REVEAL, revision: tuning.revision },
    { type: "UNKNOWN", revision: tuning.revision }
  ];

  for (const candidate of cases) {
    assert.equal(reduce(tuning, candidate), tuning);
  }

  const hostile = new Proxy(
    { type: ACTIONS.START, revision: intro.revision },
    {
      ownKeys() {
        throw new Error("hostile");
      }
    }
  );
  assert.doesNotThrow(() => reduce(intro, hostile));
  assert.equal(reduce(intro, hostile), intro);
});

test("accessor actions and invalid states never throw", () => {
  const state = createInitialState();
  const getterAction = {};
  Object.defineProperty(getterAction, "type", {
    enumerable: true,
    get() {
      throw new Error("must not read");
    }
  });
  Object.defineProperty(getterAction, "revision", {
    enumerable: true,
    value: 0
  });

  const hostileState = new Proxy(state, {
    getPrototypeOf() {
      throw new Error("hostile");
    }
  });

  assert.doesNotThrow(() => reduce(state, getterAction));
  assert.equal(reduce(state, getterAction), state);
  assert.doesNotThrow(() => reduce(hostileState, action(state, ACTIONS.START)));
  assert.equal(
    reduce(hostileState, action(state, ACTIONS.START)),
    hostileState
  );
  assert.equal(getPublicView(hostileState), null);
});

test("MAX_REVISION and malformed state structures are no-ops", () => {
  const maxState = {
    ...JSON.parse(JSON.stringify(createInitialState())),
    revision: CONSTANTS.MAX_REVISION
  };
  assert.equal(
    reduce(maxState, { type: ACTIONS.START, revision: CONSTANTS.MAX_REVISION }),
    maxState
  );

  for (const candidate of [
    null,
    { ...JSON.parse(JSON.stringify(createInitialState())), extra: true },
    { ...JSON.parse(JSON.stringify(createInitialState())), version: 2 },
    {
      ...JSON.parse(JSON.stringify(createInitialState())),
      selection: { folds: 4, phaseStep: 0, extra: true }
    },
    {
      ...JSON.parse(JSON.stringify(createInitialState())),
      phase: "aligned"
    }
  ]) {
    assert.equal(reduce(candidate, { type: ACTIONS.START, revision: 0 }), candidate);
    assert.equal(getPublicView(candidate), null);
  }
});

test("aligned accepts only REVEAL and complete accepts only RESTART", () => {
  let state = align(start(createInitialState()));
  assert.equal(state.phase, "aligned");

  const aligned = state;
  assert.equal(
    reduce(state, action(state, ACTIONS.SET_FOLDS, 6)),
    aligned
  );
  assert.equal(
    reduce(state, action(state, ACTIONS.SET_PHASE, 21)),
    aligned
  );
  assert.equal(reduce(state, action(state, ACTIONS.START)), aligned);

  state = reduce(state, action(state, ACTIONS.REVEAL));
  assert.equal(state.phase, "complete");
  const complete = state;
  assert.equal(reduce(state, action(state, ACTIONS.REVEAL)), complete);
  assert.equal(
    reduce(state, action(state, ACTIONS.SET_FOLDS, 6)),
    complete
  );

  state = reduce(state, action(state, ACTIONS.RESTART));
  assert.equal(state.phase, "intro");
  assert.deepEqual(state.selection, { folds: 4, phaseStep: 0 });
  assert.equal(state.revision, complete.revision + 1);
  assert.equal(state.content, complete.content);
});

test("JSON cloned state is accepted and newly returned state is frozen", () => {
  const clone = JSON.parse(JSON.stringify(createInitialState()));
  assert.equal(Object.isFrozen(clone), false);
  const next = reduce(clone, {
    type: ACTIONS.START,
    revision: clone.revision
  });
  assert.equal(next.phase, "tuning");
  assertDeepFrozen(next);

  const same = reduce(clone, {
    type: ACTIONS.START,
    revision: 99
  });
  assert.equal(same, clone);
  assertDeepFrozen(getPublicView(clone));
});

test("intro public view has exact public-only keys", () => {
  const view = getPublicView(createInitialState());
  assert.deepEqual(view, {
    phase: "intro",
    revision: 0,
    title: DEFAULT_CONFIG.publicTitle,
    instructions: DEFAULT_CONFIG.publicInstructions,
    primaryAction: {
      id: "start",
      label: "开始折光"
    }
  });
  assertDeepFrozen(view);
});

test("tuning public view exposes fixed controls without distances or private content", () => {
  const state = start(createInitialState());
  const view = getPublicView(state);
  assert.deepEqual(Object.keys(view), [
    "phase",
    "revision",
    "title",
    "foldControl",
    "phaseControl",
    "summary",
    "pattern"
  ]);
  assert.deepEqual(view.foldControl, {
    label: "选择镜面阶数",
    hint: DEFAULT_CONFIG.foldHint,
    values: [4, 5, 6, 7, 8, 9],
    selected: 4,
    status: "near",
    statusText: "已经贴近"
  });
  assert.deepEqual(view.phaseControl, {
    label: "转动相位",
    hint: DEFAULT_CONFIG.phaseHint,
    min: 0,
    max: 23,
    step: 1,
    selected: 0,
    displayText: "第 0 / 24 格",
    status: "near",
    statusText: "已经贴近"
  });
  assert.equal(view.summary, "折面已经贴近；相位已经贴近。");
  assertDeepFrozen(view);
});

test("aligned public view exposes the solved selection but no private content", () => {
  const state = align(start(createInitialState()));
  const view = getPublicView(state);
  assert.deepEqual(Object.keys(view), [
    "phase",
    "revision",
    "title",
    "summary",
    "selection",
    "pattern",
    "primaryAction"
  ]);
  assert.deepEqual(view.selection, {
    folds: 5,
    phaseStep: 22,
    phaseDisplayText: "第 22 / 24 格"
  });
  assert.equal(view.summary, "这束光已经对齐。");
  assert.deepEqual(view.primaryAction, {
    id: "reveal",
    label: "照见我们"
  });
  assertDeepFrozen(view);
});

test("complete public view reveals freshly owned marks and restart action", () => {
  const custom = validConfig({
    marks: ["光", "光"],
    finalTitle: "自定义终章",
    finalMessage: "自定义终章正文",
    signature: "自定义署名"
  });
  let state = align(start(createInitialState(custom)));
  state = reduce(state, action(state, ACTIONS.REVEAL));

  const first = getPublicView(state);
  const second = getPublicView(state);
  assert.deepEqual(Object.keys(first), [
    "phase",
    "revision",
    "publicTitle",
    "finalTitle",
    "marks",
    "finalMessage",
    "signature",
    "pattern",
    "primaryAction"
  ]);
  assert.deepEqual(first.marks, [
    { position: "left", label: "左边的光", text: "光" },
    { position: "right", label: "右边的光", text: "光" }
  ]);
  assert.equal(first.finalTitle, "自定义终章");
  assert.equal(first.finalMessage, "自定义终章正文");
  assert.equal(first.signature, "自定义署名");
  assert.deepEqual(first.primaryAction, {
    id: "restart",
    label: "再折一次"
  });
  assert.notEqual(first, second);
  assert.notEqual(first.marks, second.marks);
  assert.notEqual(first.marks[0], second.marks[0]);
  assertDeepFrozen(first);
});

test("private sentinels are absent before REVEAL and removed after RESTART", () => {
  const sentinels = [
    "甲密",
    "乙密",
    "PRIVATE_FINAL_TITLE",
    "PRIVATE_FINAL_MESSAGE",
    "PRIVATE_SIGNATURE"
  ];
  const custom = validConfig({
    marks: sentinels.slice(0, 2),
    finalTitle: sentinels[2],
    finalMessage: sentinels[3],
    signature: sentinels[4]
  });

  let state = createInitialState(custom);
  for (const phaseState of [
    state,
    (state = start(state)),
    (state = align(state))
  ]) {
    const serialized = JSON.stringify(getPublicView(phaseState));
    for (const sentinel of sentinels) {
      assert.equal(serialized.includes(sentinel), false);
    }
    assert.equal(serialized.includes('"target"'), false);
  }

  state = reduce(state, action(state, ACTIONS.REVEAL));
  const completeJson = JSON.stringify(getPublicView(state));
  for (const sentinel of sentinels) {
    assert.equal(completeJson.includes(sentinel), true);
  }

  const staleReveal = { type: ACTIONS.REVEAL, revision: state.revision - 1 };
  assert.equal(reduce(state, staleReveal), state);

  state = reduce(state, action(state, ACTIONS.RESTART));
  const restartedJson = JSON.stringify(getPublicView(state));
  for (const sentinel of sentinels) {
    assert.equal(restartedJson.includes(sentinel), false);
  }
});
