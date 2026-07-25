"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const editableConfig = require("./config.js");
const logic = require("./logic.js");

const {
  CONSTANTS,
  DEFAULT_CONFIG,
  ACTIONS,
  GATES,
  sanitizeConfig,
  normalizeAngle,
  forwardDistance,
  crossedTarget,
  createInitialState,
  reduce,
  getPublicView
} = logic;

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)
  ) {
    return;
  }
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  if (typeof value === "function") return;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function validConfig(overrides = {}) {
  return { ...DEFAULT_CONFIG, ...overrides };
}

function startGate(state = createInitialState()) {
  const started = reduce(state, { type: ACTIONS.START });
  return reduce(started, { type: ACTIONS.BEGIN_GATE });
}

function setHeld(state, playerId, held) {
  return reduce(state, {
    type: ACTIONS.SET_HELD,
    playerId,
    held,
    inputEpoch: state.inputEpoch
  });
}

function tick(state, count = 1) {
  return reduce(state, { type: ACTIONS.TICK, count });
}

function replaceState(state, overrides) {
  return {
    version: state.version,
    phase: state.phase,
    content: { ...state.content },
    gateIndex: state.gateIndex,
    tick: state.tick,
    openWindow: { ...state.openWindow },
    players: {
      left: { ...state.players.left },
      right: { ...state.players.right }
    },
    retryReason: state.retryReason,
    completedGateIds: [...state.completedGateIds],
    inputEpoch: state.inputEpoch,
    revision: state.revision,
    ...overrides
  };
}

test("exports exact recursively frozen core contracts", () => {
  assert.deepEqual(Object.keys(logic), [
    "CONSTANTS",
    "DEFAULT_CONFIG",
    "ACTIONS",
    "GATES",
    "sanitizeConfig",
    "normalizeAngle",
    "forwardDistance",
    "crossedTarget",
    "createInitialState",
    "reduce",
    "getPublicView"
  ]);
  assert.deepEqual(CONSTANTS, {
    VERSION: 1,
    TICK_RATE: 30,
    TURN_STEPS: 720,
    OUTER_SPEED: 2,
    INNER_SPEED: 3,
    OPEN_RADIUS: 2,
    MAX_TICK_BATCH: 5,
    MAX_FRAME_DELTA_MS: 250,
    PLAYER_IDS: ["left", "right"],
    LANES: ["outer", "inner"],
    PHASES: [
      "intro",
      "gate-intro",
      "playing",
      "gate-success",
      "gate-retry",
      "complete"
    ]
  });
  assert.deepEqual(Object.values(ACTIONS), [
    "START",
    "BEGIN_GATE",
    "SET_HELD",
    "TICK",
    "CONTINUE",
    "RETRY_GATE",
    "NEXT_GATE",
    "RESTART",
    "SUSPEND"
  ]);
  assert.equal(GATES.length, 5);
  assertDeepFrozen(logic);
});

test("classic browser and CommonJS expose the same API while config stays editable", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(
    readFileSync(require.resolve("./config.js"), "utf8"),
    sandbox,
    { filename: "config.js" }
  );
  vm.runInNewContext(
    readFileSync(require.resolve("./logic.js"), "utf8"),
    sandbox,
    { filename: "logic.js" }
  );

  assert.deepEqual(
    Object.keys(sandbox.window.TWIN_ORBIT_CONFIG),
    Object.keys(editableConfig)
  );
  assert.equal(Object.isFrozen(sandbox.window.TWIN_ORBIT_CONFIG), false);
  assert.deepEqual(
    Object.keys(sandbox.window.TwinOrbitLogic),
    Object.keys(logic)
  );
  assert.equal(
    sandbox.window.TwinOrbitLogic.GATES[4].targets.right.angle,
    32
  );
  assert.equal(Object.isFrozen(sandbox.window.TwinOrbitLogic), true);
});

test("editable config matches canonical defaults but does not share ownership", () => {
  assert.deepEqual(editableConfig, DEFAULT_CONFIG);
  assert.notEqual(editableConfig, DEFAULT_CONFIG);
  assert.equal(Object.isFrozen(editableConfig), false);
  assert.equal(Object.isFrozen(DEFAULT_CONFIG), true);
});

test("sanitizeConfig normalizes valid Unicode and falls back atomically", () => {
  const candidate = validConfig({
    leftName: "  e\u0301  ",
    introMessage: "  一起\u00a0绕完  "
  });
  const sanitized = sanitizeConfig(candidate);
  assert.equal(sanitized.leftName, "é");
  assert.equal(sanitized.introMessage, "一起 绕完");
  assert.notEqual(sanitized, candidate);
  assertDeepFrozen(sanitized);

  const invalidCases = [
    undefined,
    null,
    { ...validConfig(), extra: true },
    (() => {
      const value = validConfig();
      delete value.signature;
      return value;
    })(),
    validConfig({ leftName: "" }),
    validConfig({ rightName: "x".repeat(21) }),
    validConfig({ introTitle: "<b>坏</b>" }),
    validConfig({ introMessage: "https://example.com" }),
    validConfig({ completeMessage: "坏\u202e文本" }),
    validConfig({ signature: "\ud800" }),
    validConfig({ signature: "\udc00" }),
    validConfig({ signature: "\ud800x" })
  ];
  for (const invalid of invalidCases) {
    assert.equal(sanitizeConfig(invalid), DEFAULT_CONFIG);
  }
});

test("integer angle helpers use the frozen half-open circular contract", () => {
  assert.equal(normalizeAngle(720), 0);
  assert.equal(normalizeAngle(-1), 719);
  assert.equal(normalizeAngle(1441), 1);
  assert.equal(normalizeAngle(1.5), null);
  assert.equal(forwardDistance(719, 1), 2);
  assert.equal(forwardDistance(1, 719), 718);
  assert.equal(crossedTarget(718, 0, 2), true);
  assert.equal(crossedTarget(719, 0, 2), true);
  assert.equal(crossedTarget(0, 0, 2), false);
  assert.equal(crossedTarget(717, 0, 2), false);
  assert.equal(crossedTarget(719, 0, 4), null);
});

test("five frozen gates exactly match the specification", () => {
  assert.deepEqual(
    GATES.map((gate) => ({
      id: gate.id,
      openTick: gate.openTick,
      starts: [gate.startAngles.left, gate.startAngles.right],
      targets: [gate.targets.left.angle, gate.targets.right.angle],
      lanes: [gate.targets.left.lane, gate.targets.right.lane]
    })),
    [
      {
        id: "first-meeting",
        openTick: 60,
        starts: [40, 320],
        targets: [180, 470],
        lanes: ["outer", "inner"]
      },
      {
        id: "trade-the-lead",
        openTick: 60,
        starts: [80, 400],
        targets: [230, 540],
        lanes: ["inner", "outer"]
      },
      {
        id: "same-count",
        openTick: 72,
        starts: [120, 450],
        targets: [300, 630],
        lanes: ["inner", "outer"]
      },
      {
        id: "long-way-left",
        openTick: 84,
        starts: [160, 500],
        targets: [352, 708],
        lanes: ["outer", "inner"]
      },
      {
        id: "long-way-right",
        openTick: 84,
        starts: [200, 560],
        targets: [408, 32],
        lanes: ["inner", "outer"]
      }
    ]
  );
});

test("initial state, START and BEGIN_GATE form the only opening path", () => {
  const initial = createInitialState(editableConfig);
  assert.equal(initial.phase, "intro");
  assert.equal(initial.gateIndex, 0);
  assert.equal(initial.tick, 0);
  assert.deepEqual(initial.openWindow, { start: 58, center: 60, end: 62 });
  assert.deepEqual(initial.completedGateIds, []);
  assertDeepFrozen(initial);

  const invalidBegin = reduce(initial, { type: ACTIONS.BEGIN_GATE });
  assert.equal(invalidBegin, initial);
  const intro = reduce(initial, { type: ACTIONS.START });
  assert.equal(intro.phase, "gate-intro");
  const playing = reduce(intro, { type: ACTIONS.BEGIN_GATE });
  assert.equal(playing.phase, "playing");
  assert.equal(playing.revision, 2);
  assert.equal(reduce(playing, { type: ACTIONS.START }), playing);
});

test("SET_HELD is seat-exact, epoch-exact and idempotent", () => {
  let state = startGate();
  const original = state;
  state = setHeld(state, "left", true);
  assert.equal(state.players.left.held, true);
  assert.equal(state.players.left.lane, "inner");
  assert.equal(state.players.right.held, false);
  assert.equal(state.revision, original.revision + 1);

  assert.equal(setHeld(state, "left", true), state);
  assert.equal(
    reduce(state, {
      type: ACTIONS.SET_HELD,
      playerId: "right",
      held: true,
      inputEpoch: state.inputEpoch + 1
    }),
    state
  );
  assert.equal(
    reduce(state, {
      type: ACTIONS.SET_HELD,
      playerId: "middle",
      held: true,
      inputEpoch: state.inputEpoch
    }),
    state
  );
});

test("TICK snapshots both seats before integer movement", () => {
  let state = startGate();
  state = setHeld(state, "left", true);
  state = setHeld(state, "right", true);
  state = tick(state);
  assert.equal(state.tick, 1);
  assert.equal(state.players.left.angle, 43);
  assert.equal(state.players.right.angle, 323);
  assert.equal(state.players.left.lane, "inner");
  assert.equal(state.players.right.lane, "inner");

  state = setHeld(state, "left", false);
  state = tick(state);
  assert.equal(state.players.left.angle, 45);
  assert.equal(state.players.right.angle, 326);
  assert.equal(state.players.left.lane, "outer");
  assert.equal(state.players.right.lane, "inner");
});

test("batching 1..5 ticks changes neither integer movement nor revision count", () => {
  let singles = startGate();
  let batched = startGate();
  singles = setHeld(singles, "left", true);
  batched = setHeld(batched, "left", true);
  for (let index = 0; index < 5; index += 1) singles = tick(singles);
  batched = tick(batched, 5);
  assert.deepEqual(batched, singles);
});

test("TICK overflow preserves the last frozen authoritative reference", () => {
  const playing = startGate();
  const saturated = replaceState(playing, {
    revision: Number.MAX_SAFE_INTEGER
  });
  assert.equal(tick(saturated, 2), saturated);

  const oneStepLeft = replaceState(playing, {
    revision: Number.MAX_SAFE_INTEGER - 1
  });
  const expected = tick(oneStepLeft);
  const batched = tick(oneStepLeft, 2);
  assert.deepEqual(batched, expected);
  assert.equal(Object.isFrozen(batched), true);
  assert.equal(batched.tick, 1);
  assert.equal(batched.revision, Number.MAX_SAFE_INTEGER);
});

test("gate success is an atomic same-tick decision", () => {
  let state = startGate();
  state = replaceState(state, {
    tick: 59,
    players: {
      left: {
        angle: 178,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 467,
        lane: "inner",
        held: true,
        crossed: false,
        crossingTick: null
      }
    }
  });
  const success = tick(state);
  assert.equal(success.phase, "gate-success");
  assert.equal(success.tick, 60);
  assert.equal(success.players.left.crossingTick, 60);
  assert.equal(success.players.right.crossingTick, 60);
  assert.deepEqual(success.completedGateIds, ["first-meeting"]);

  const swappedStorage = replaceState(state, {
    players: {
      right: { ...state.players.right },
      left: { ...state.players.left }
    }
  });
  assert.deepEqual(tick(swappedStorage), success);
});

test("failure priority separates wrong lane, one-sided crossing and early crossing", () => {
  let state = startGate();
  state = replaceState(state, {
    tick: 59,
    players: {
      left: {
        angle: 177,
        lane: "inner",
        held: true,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 468,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      }
    }
  });
  assert.equal(tick(state).retryReason, "wrong-lane");

  state = replaceState(state, {
    players: {
      left: {
        angle: 178,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 460,
        lane: "inner",
        held: true,
        crossed: false,
        crossingTick: null
      }
    }
  });
  assert.equal(tick(state).retryReason, "not-together");

  state = replaceState(state, {
    tick: 20,
    players: {
      left: {
        angle: 178,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 400,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      }
    }
  });
  assert.equal(tick(state).retryReason, "too-early");
});

test("the last legal window tick is evaluated before window-closed", () => {
  let state = startGate();
  state = replaceState(state, {
    tick: 61,
    players: {
      left: {
        angle: 178,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 467,
        lane: "inner",
        held: true,
        crossed: false,
        crossingTick: null
      }
    }
  });
  assert.equal(tick(state).phase, "gate-success");

  state = replaceState(state, {
    players: {
      left: {
        angle: 170,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 460,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      }
    }
  });
  const closed = tick(state);
  assert.equal(closed.phase, "gate-retry");
  assert.equal(closed.retryReason, "window-closed");
  assert.equal(closed.tick, 62);
});

test("SUSPEND resets only the current gate and invalidates old epochs", () => {
  let state = startGate();
  state = setHeld(state, "left", true);
  state = tick(state, 5);
  const oldEpoch = state.inputEpoch;
  const suspended = reduce(state, {
    type: ACTIONS.SUSPEND,
    reason: "hidden"
  });
  assert.equal(suspended.phase, "gate-intro");
  assert.equal(suspended.tick, 0);
  assert.equal(suspended.players.left.held, false);
  assert.equal(suspended.players.left.angle, GATES[0].startAngles.left);
  assert.equal(suspended.inputEpoch, oldEpoch + 1);
  assert.deepEqual(suspended.completedGateIds, []);

  const resumed = reduce(suspended, { type: ACTIONS.BEGIN_GATE });
  assert.equal(
    reduce(resumed, {
      type: ACTIONS.SET_HELD,
      playerId: "left",
      held: false,
      inputEpoch: oldEpoch
    }),
    resumed
  );
});

test("SUSPEND clears terminal input without erasing a confirmed gate result", () => {
  let state = startGate();
  state = replaceState(state, {
    tick: 59,
    players: {
      left: {
        angle: 178,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 467,
        lane: "inner",
        held: true,
        crossed: false,
        crossingTick: null
      }
    }
  });
  const success = tick(state);
  const suspended = reduce(success, {
    type: ACTIONS.SUSPEND,
    reason: "hidden"
  });

  assert.equal(suspended.phase, "gate-success");
  assert.equal(getPublicView(suspended).phase, "gate-success");
  assert.equal(suspended.players.left.held, false);
  assert.equal(suspended.players.right.held, false);
  assert.equal(suspended.players.left.lane, "outer");
  assert.equal(suspended.players.right.lane, "inner");
  assert.equal(suspended.players.left.crossingTick, 60);
  assert.equal(suspended.players.right.crossingTick, 60);
  assert.deepEqual(suspended.completedGateIds, ["first-meeting"]);
  assert.equal(suspended.inputEpoch, success.inputEpoch + 1);
});

test("retry resets current gate while public view hides internal evidence", () => {
  let state = startGate();
  state = replaceState(state, {
    tick: 20,
    players: {
      left: {
        angle: 178,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: 400,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      }
    }
  });
  const failed = tick(state);
  const view = getPublicView(failed);
  assert.equal(view.phase, "gate-retry");
  assert.equal(view.canRetry, true);
  assert.equal("retryReason" in view, false);
  assert.equal("inputEpoch" in view, false);
  assert.equal("fixtures" in view, false);
  assertDeepFrozen(view);

  const intro = reduce(failed, { type: ACTIONS.RETRY_GATE });
  assert.equal(intro.phase, "gate-intro");
  assert.equal(intro.tick, 0);
  assert.deepEqual(intro.completedGateIds, []);
});

test("malformed external state falls back safely while malformed action is identity no-op", () => {
  const initial = createInitialState();
  assert.deepEqual(reduce(null, { type: ACTIONS.START }), initial);
  assert.deepEqual(
    reduce({ ...initial, extra: true }, { type: ACTIONS.START }),
    initial
  );
  assert.equal(reduce(initial, null), initial);
  assert.equal(reduce(initial, { type: ACTIONS.START, extra: true }), initial);
  assert.equal(reduce(initial, { type: "UNKNOWN" }), initial);
});

test("hostile descriptors and proxies cannot execute value access or escape snapshots", () => {
  const initial = createInitialState();
  const playing = startGate();
  let getterReads = 0;
  const accessorConfig = validConfig();
  Object.defineProperty(accessorConfig, "signature", {
    enumerable: true,
    get() {
      getterReads += 1;
      return DEFAULT_CONFIG.signature;
    }
  });
  assert.equal(sanitizeConfig(accessorConfig), DEFAULT_CONFIG);
  assert.equal(getterReads, 0);

  let proxyGets = 0;
  const proxiedContent = new Proxy(
    { ...playing.content },
    {
      get(target, key, receiver) {
        proxyGets += 1;
        return Reflect.get(target, key, receiver);
      }
    }
  );
  const external = replaceState(playing, { content: proxiedContent });
  const advanced = tick(external);
  assert.equal(advanced.phase, "playing");
  assert.equal(advanced.tick, 1);
  assert.equal(proxyGets, 0);
  assert.notEqual(advanced.content, proxiedContent);
  assertDeepFrozen(advanced);

  const throwingState = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error("state trap must stay contained");
      }
    }
  );
  const throwingAction = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error("action trap must stay contained");
      }
    }
  );
  assert.deepEqual(reduce(throwingState, { type: ACTIONS.START }), initial);
  assert.equal(reduce(initial, throwingAction), initial);
  assert.deepEqual(getPublicView(throwingState), getPublicView(initial));

  class ForgedCompleted extends Array {}
  const forgedArrayState = replaceState(initial, {
    completedGateIds: new ForgedCompleted()
  });
  assert.deepEqual(
    reduce(forgedArrayState, { type: ACTIONS.START }),
    initial
  );
});

test("config, JSON state and public view keep independent frozen ownership", () => {
  const config = validConfig({ leftName: "小左", rightName: "小右" });
  const initial = createInitialState(config);
  config.leftName = "后来改名";
  assert.equal(initial.content.leftName, "小左");
  assert.notEqual(initial.content, config);

  const external = JSON.parse(JSON.stringify(startGate(initial)));
  const advanced = tick(external);
  external.content.leftName = "外部污染";
  external.players.left.angle = 0;
  assert.equal(advanced.content.leftName, "小左");
  assert.equal(advanced.players.left.angle, 42);
  assertDeepFrozen(advanced);

  const firstView = getPublicView(advanced);
  const secondView = getPublicView(advanced);
  assert.notEqual(firstView, secondView);
  assert.notEqual(firstView.players, secondView.players);
  assertDeepFrozen(firstView);
});

test("terminal phases, stale epochs and safe-integer extremes stay phase-exact", () => {
  const playing = startGate();
  const staleHeld = {
    type: ACTIONS.SET_HELD,
    playerId: "left",
    held: true,
    inputEpoch: playing.inputEpoch + 1
  };
  assert.equal(reduce(playing, staleHeld), playing);
  assert.equal(reduce(playing, { type: ACTIONS.TICK, count: 0 }), playing);
  assert.equal(
    reduce(playing, {
      type: ACTIONS.TICK,
      count: Number.MAX_SAFE_INTEGER
    }),
    playing
  );
  assert.equal(reduce(playing, { type: ACTIONS.CONTINUE }), playing);

  const saturatedEpoch = replaceState(playing, {
    inputEpoch: Number.MAX_SAFE_INTEGER
  });
  assert.equal(
    reduce(saturatedEpoch, {
      type: ACTIONS.SUSPEND,
      reason: "long-frame"
    }),
    saturatedEpoch
  );

  const intro = createInitialState();
  assert.equal(
    reduce(intro, { type: ACTIONS.SUSPEND, reason: "hidden" }),
    intro
  );
  assert.equal(reduce(intro, { type: ACTIONS.RESTART }), intro);
  assert.equal(reduce(intro, { type: ACTIONS.NEXT_GATE }), intro);
});

test("complete requires a reachable final same-tick crossing snapshot", () => {
  const initial = createInitialState();
  const finalGate = GATES[GATES.length - 1];
  const forgedComplete = replaceState(initial, {
    phase: "complete",
    gateIndex: GATES.length - 1,
    tick: 0,
    openWindow: {
      start: finalGate.openTick - CONSTANTS.OPEN_RADIUS,
      center: finalGate.openTick,
      end: finalGate.openTick + CONSTANTS.OPEN_RADIUS
    },
    players: {
      left: {
        angle: finalGate.startAngles.left,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      },
      right: {
        angle: finalGate.startAngles.right,
        lane: "outer",
        held: false,
        crossed: false,
        crossingTick: null
      }
    },
    completedGateIds: GATES.map((gate) => gate.id)
  });

  assert.equal(getPublicView(forgedComplete).phase, "intro");
  assert.deepEqual(
    reduce(forgedComplete, { type: ACTIONS.RESTART }),
    createInitialState()
  );
});

test("public intro and complete content contain no score, winner or private solver data", () => {
  const intro = getPublicView(createInitialState());
  assert.equal(intro.phase, "intro");
  assert.equal(intro.gate, null);
  assert.equal(intro.canStart, true);
  assert.deepEqual(
    intro.players.map((player) => player.name),
    ["左边", "右边"]
  );
  assert.equal(JSON.stringify(intro).includes("openTick"), false);
  assert.equal(JSON.stringify(intro).includes("winner"), false);
  assert.equal(JSON.stringify(intro).includes("score"), false);
});
