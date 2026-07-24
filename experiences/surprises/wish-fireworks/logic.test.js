import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

await import("./config.js");
await import("./logic.js");

const config = globalThis.WISH_FIREWORKS_CONFIG;
const logic = globalThis.WISH_FIREWORKS_LOGIC;

const EXPECTED_API_KEYS = [
  "ALPHA_SCALE",
  "ANIMATION_DURATION_MS",
  "ANIMATION_TIMEOUT_MS",
  "APEX_Y_BY_BAND",
  "ASCENT_TICKS",
  "CHARGE_QUANTUM_MS",
  "CHARGE_UNITS_BY_BAND",
  "DEFAULT_CHARGE_BAND",
  "DEFAULT_CONFIG",
  "FADE_TICKS",
  "FORMATION_TICKS",
  "GLYPH_COLUMNS",
  "GLYPH_COUNT",
  "GLYPH_ROWS",
  "HOLD_TICKS",
  "MAX_ACTIVE_CELLS",
  "MAX_HOLD_MS",
  "MAX_CHARGE_UNITS",
  "MAX_REVISION",
  "MIN_ACTIVE_CELLS",
  "MIN_CHARGE_UNITS",
  "ROCKET_START_X",
  "ROCKET_START_Y",
  "TARGET_STEP",
  "TARGET_X_ORIGIN",
  "TARGET_Y_ORIGIN",
  "TOTAL_PRESENTATION_TICKS",
  "VERSION",
  "WORLD_SCALE",
  "buildTargets",
  "chargeBandFromUnits",
  "createInitialState",
  "createStartAction",
  "directUnitsForBand",
  "getPresentationFrame",
  "getPublicView",
  "presentationTick",
  "quantizeHold",
  "reduce",
  "sanitizeConfig",
].sort();

const ROW_HASHES = [
  "12767751bbb49a68fc6e2be36f5d8efd0f87619395136c5f7df16eb336f5fc8b",
  "f7d71da102bbf70465f8f67ee721051aff0672f73b80cd68cd1b3abe443ad026",
  "b29b2fc488004ce2252c858f5dd4e94ff845ec263bdbee8bf7759bf187d0dbe0",
];
const GLYPHS_HASH = "2486a3253e586bddd69549d2628087ee61999f87e4c6a200c4062e7c721c0d10";
const CONFIG_HASH = "18cf4cc536e8653e81ca83be6df101f2b1a2918b794fafb28eca5a5f135def92";
const ALL_DEFAULT_TARGETS_HASH =
  "cbac1979ddab2aab39ec30e91d5a77bc8e87bbb2e8d23f35844ad36815c50e8a";
const DEFAULT_TARGET_HASHES = [
  "f40bbf74c83c28955d873a855d545dfb4d8bc566fffd32dc5d198670758d7978",
  "789acce9eae0f13c7bd3436238183595fe3d68ad82bff36394a3c915f6c3e530",
  "953b130d90e674e927b7fe295c5ac2cebd2c9865e310e7e42e330de4ba57b181",
];
const SENTINEL_TARGET_HASHES = [
  "1abeff1f8bd048e80666e6fa93d66bd041692098f3fbc9a845ba43a3f5de439d",
  "596cbf8212a40bf7a7d5f566644fee3cbf740bc9d5fe08d16ba61bb6a04d850f",
  "8eb8deb1179ec1a0c70232234cac68e04b304b3aa79306ec41fd38b99827e45b",
];

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

function stateSummary(state) {
  return {
    version: state.version,
    phase: state.phase,
    completedCount: state.completedCount,
    currentShot: state.currentShot,
    revision: state.revision,
  };
}

function start(rawConfig = config, initial = logic.createInitialState()) {
  return logic.reduce(initial, logic.createStartAction(rawConfig));
}

function launch(state, chargeUnits = 12) {
  return logic.reduce(state, {
    type: "LAUNCH",
    index: state.completedCount,
    expectedRevision: state.revision,
    chargeUnits,
  });
}

function completeBurst(state) {
  return logic.reduce(state, {
    type: "COMPLETE_BURST",
    burstToken: state.currentShot.burstToken,
  });
}

function finishRound(units = [1, 12, 20], rawConfig = config, initial) {
  let state = start(rawConfig, initial);
  for (let index = 0; index < 3; index += 1) {
    state = completeBurst(launch(state, units[index]));
  }
  return state;
}

function sentinelConfig() {
  return {
    recipient: "收件-X7",
    sender: "署名-Q2",
    glyphs: [
      {
        id: "g0",
        label: "岚",
        rows: [
          "####.....", "####.....", "####.....", "####.....", ".........",
          ".........", ".........", ".........", ".........",
        ],
      },
      {
        id: "g1",
        label: "屿",
        rows: [
          ".........", ".........", "..####...", "..####...", "..####...",
          "..####...", ".........", ".........", ".........",
        ],
      },
      {
        id: "g2",
        label: "棠",
        rows: [
          ".........", ".........", ".........", ".........", ".........",
          ".....####", ".....####", ".....####", ".....####",
        ],
      },
    ],
    patternLabel: "图案-P9",
    finalTitle: "标题-T4",
    finalNote: "留言-N6",
  };
}

function trackedProxy(target) {
  const counts = {
    getPrototypeOf: 0,
    ownKeys: 0,
    getOwnPropertyDescriptor: new Map(),
    get: 0,
  };
  return {
    counts,
    proxy: new Proxy(target, {
      getPrototypeOf(value) {
        counts.getPrototypeOf += 1;
        return Reflect.getPrototypeOf(value);
      },
      ownKeys(value) {
        counts.ownKeys += 1;
        return Reflect.ownKeys(value);
      },
      getOwnPropertyDescriptor(value, key) {
        counts.getOwnPropertyDescriptor.set(
          key,
          (counts.getOwnPropertyDescriptor.get(key) || 0) + 1,
        );
        return Reflect.getOwnPropertyDescriptor(value, key);
      },
      get() {
        counts.get += 1;
        throw new Error("ordinary get must not run");
      },
    }),
  };
}

test("root ESM side-effect imports expose editable config and the frozen exact 40-key API", () => {
  assert.equal(typeof config, "object");
  assert.equal(Object.isFrozen(config), false);
  assert.equal(typeof logic, "object");
  assert.deepEqual(Object.keys(logic).sort(), EXPECTED_API_KEYS);
  assert.equal(EXPECTED_API_KEYS.length, 40);
  assertDeepFrozen(logic);
});

test("VM execution exposes the same frozen API through a real CommonJS module", () => {
  const configSource = fs.readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const logicSource = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const configContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(configSource, configContext, { filename: "config.js" });
  assert.equal(configContext.module.exports, configContext.WISH_FIREWORKS_CONFIG);

  let requireCalls = 0;
  const logicContext = vm.createContext({
    module: { exports: {} },
    require() {
      requireCalls += 1;
      throw new Error("logic must not depend on config.js at initialization");
    },
  });
  vm.runInContext(logicSource, logicContext, { filename: "logic.js" });
  assert.equal(logicContext.module.exports, logicContext.WISH_FIREWORKS_LOGIC);
  assert.equal(vm.runInContext("Object.isFrozen(module.exports)", logicContext), true);
  assert.deepEqual(
    Array.from(Object.keys(logicContext.module.exports)).sort(),
    EXPECTED_API_KEYS,
  );
  assert.equal(hash(logicContext.module.exports.DEFAULT_CONFIG), CONFIG_HASH);
  assert.equal(requireCalls, 0);
});

test("invalid or hostile global config cannot break the canonical fallback", () => {
  const logicSource = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const invalidContext = vm.createContext({ WISH_FIREWORKS_CONFIG: { bad: true } });
  vm.runInContext(logicSource, invalidContext, { filename: "logic.js" });
  assert.equal(hash(invalidContext.WISH_FIREWORKS_LOGIC.DEFAULT_CONFIG), CONFIG_HASH);
  assert.equal(
    hash(invalidContext.WISH_FIREWORKS_LOGIC.sanitizeConfig({})),
    CONFIG_HASH,
  );

  const hostileContext = vm.createContext({});
  vm.runInContext(`
    Object.defineProperty(globalThis, "WISH_FIREWORKS_CONFIG", {
      configurable: true,
      get() { throw new Error("must not read editable config during logic initialization"); }
    });
  `, hostileContext);
  assert.doesNotThrow(
    () => vm.runInContext(logicSource, hostileContext, { filename: "logic.js" }),
  );
  assert.equal(hash(hostileContext.WISH_FIREWORKS_LOGIC.DEFAULT_CONFIG), CONFIG_HASH);
  const startAction = hostileContext.WISH_FIREWORKS_LOGIC.createStartAction({ bad: true });
  assert.equal(hash(startAction.content), CONFIG_HASH);
});

test("module initialization touches no DOM, clock, randomness, network, storage, or permissions", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(`
    for (const key of [
      "document", "window", "CanvasRenderingContext2D", "crypto", "Date", "performance",
      "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
      "cancelAnimationFrame", "queueMicrotask", "localStorage", "sessionStorage", "fetch",
      "XMLHttpRequest", "WebSocket", "navigator", "history", "indexedDB"
    ]) Object.defineProperty(globalThis, key, {
      configurable: true,
      get() { throw new Error("forbidden " + key); }
    });
    Object.defineProperty(Math, "random", {
      configurable: true,
      get() { throw new Error("forbidden random"); }
    });
  `, context);
  assert.doesNotThrow(() => vm.runInContext(source, context, { filename: "logic.js" }));
});

test("all constants match the frozen specification", () => {
  assert.deepEqual({
    VERSION: logic.VERSION,
    GLYPH_COUNT: logic.GLYPH_COUNT,
    GLYPH_ROWS: logic.GLYPH_ROWS,
    GLYPH_COLUMNS: logic.GLYPH_COLUMNS,
    MIN_ACTIVE_CELLS: logic.MIN_ACTIVE_CELLS,
    MAX_ACTIVE_CELLS: logic.MAX_ACTIVE_CELLS,
    WORLD_SCALE: logic.WORLD_SCALE,
    ROCKET_START_X: logic.ROCKET_START_X,
    ROCKET_START_Y: logic.ROCKET_START_Y,
    TARGET_X_ORIGIN: logic.TARGET_X_ORIGIN,
    TARGET_Y_ORIGIN: logic.TARGET_Y_ORIGIN,
    TARGET_STEP: logic.TARGET_STEP,
    CHARGE_QUANTUM_MS: logic.CHARGE_QUANTUM_MS,
    MAX_HOLD_MS: logic.MAX_HOLD_MS,
    MIN_CHARGE_UNITS: logic.MIN_CHARGE_UNITS,
    MAX_CHARGE_UNITS: logic.MAX_CHARGE_UNITS,
    DEFAULT_CHARGE_BAND: logic.DEFAULT_CHARGE_BAND,
    ASCENT_TICKS: logic.ASCENT_TICKS,
    FORMATION_TICKS: logic.FORMATION_TICKS,
    HOLD_TICKS: logic.HOLD_TICKS,
    FADE_TICKS: logic.FADE_TICKS,
    TOTAL_PRESENTATION_TICKS: logic.TOTAL_PRESENTATION_TICKS,
    ANIMATION_DURATION_MS: logic.ANIMATION_DURATION_MS,
    ANIMATION_TIMEOUT_MS: logic.ANIMATION_TIMEOUT_MS,
    ALPHA_SCALE: logic.ALPHA_SCALE,
    MAX_REVISION: logic.MAX_REVISION,
  }, {
    VERSION: 1,
    GLYPH_COUNT: 3,
    GLYPH_ROWS: 9,
    GLYPH_COLUMNS: 9,
    MIN_ACTIVE_CELLS: 16,
    MAX_ACTIVE_CELLS: 48,
    WORLD_SCALE: 1000,
    ROCKET_START_X: 500,
    ROCKET_START_Y: 900,
    TARGET_X_ORIGIN: -240,
    TARGET_Y_ORIGIN: -240,
    TARGET_STEP: 60,
    CHARGE_QUANTUM_MS: 50,
    MAX_HOLD_MS: 950,
    MIN_CHARGE_UNITS: 1,
    MAX_CHARGE_UNITS: 20,
    DEFAULT_CHARGE_BAND: 2,
    ASCENT_TICKS: 48,
    FORMATION_TICKS: 24,
    HOLD_TICKS: 36,
    FADE_TICKS: 12,
    TOTAL_PRESENTATION_TICKS: 120,
    ANIMATION_DURATION_MS: 1000,
    ANIMATION_TIMEOUT_MS: 1500,
    ALPHA_SCALE: 1000,
    MAX_REVISION: Number.MAX_SAFE_INTEGER,
  });
  assert.deepEqual(logic.CHARGE_UNITS_BY_BAND, [4, 8, 12, 16, 20]);
  assert.deepEqual(logic.APEX_Y_BY_BAND, [430, 390, 350, 310, 270]);
});

test("default rows, glyphs, config, active counts, and band-2 targets match fixed hashes", () => {
  const content = logic.sanitizeConfig(config);
  assert.equal(hash(content), CONFIG_HASH);
  assert.equal(hash(content.glyphs), GLYPHS_HASH);
  assert.deepEqual(content.glyphs.map((glyph) => hash(glyph.rows)), ROW_HASHES);
  assert.deepEqual(
    content.glyphs.map((glyph) => glyph.rows.join("").split("#").length - 1),
    [30, 29, 31],
  );
  const targets = content.glyphs.map((glyph) => logic.buildTargets(glyph.rows, 2));
  assert.deepEqual(targets.map(hash), DEFAULT_TARGET_HASHES);
  assert.equal(hash(targets), ALL_DEFAULT_TARGETS_HASH);
  assertDeepFrozen(content);
  for (const targetSet of targets) assertDeepFrozen(targetSet);
});

test("sanitizeConfig trims valid text and falls back atomically on Unicode or schema violations", () => {
  const candidate = clone(config);
  candidate.recipient = "  收件人  ";
  candidate.sender = "  署名  ";
  candidate.patternLabel = "  点阵说明  ";
  candidate.finalTitle = "  最终标题  ";
  candidate.finalNote = " 第一行 \n 第二行 ";
  const clean = logic.sanitizeConfig(candidate);
  assert.deepEqual({
    recipient: clean.recipient,
    sender: clean.sender,
    patternLabel: clean.patternLabel,
    finalTitle: clean.finalTitle,
    finalNote: clean.finalNote,
  }, {
    recipient: "收件人",
    sender: "署名",
    patternLabel: "点阵说明",
    finalTitle: "最终标题",
    finalNote: "第一行 \n 第二行",
  });

  for (const mutate of [
    (value) => { value.extra = true; },
    (value) => { value[Symbol("extra")] = true; },
    (value) => { value.recipient = "\ud800"; },
    (value) => { value.sender = "坏\u0000值"; },
    (value) => { value.finalNote = "一\n二\n三\n四\n五"; },
    (value) => { value.glyphs[0].rows = new Array(9).fill("........."); },
    (value) => { value.glyphs[0].rows.length = 8; },
    (value) => { value.glyphs[1].label = value.glyphs[0].label; },
    (value) => { Object.setPrototypeOf(value.glyphs[2], null); },
  ]) {
    const invalid = clone(config);
    mutate(invalid);
    assert.equal(hash(logic.sanitizeConfig(invalid)), CONFIG_HASH);
  }
});

test("hostile accessors, sparse arrays, custom prototypes, and custom array properties fail closed", () => {
  const getterConfig = clone(config);
  let getterReads = 0;
  Object.defineProperty(getterConfig, "recipient", {
    enumerable: true,
    get() {
      getterReads += 1;
      return "不应读取";
    },
  });
  assert.equal(hash(logic.sanitizeConfig(getterConfig)), CONFIG_HASH);
  assert.equal(getterReads, 0);

  const sparse = clone(config);
  delete sparse.glyphs[1];
  assert.equal(hash(logic.sanitizeConfig(sparse)), CONFIG_HASH);

  const arrayExtra = clone(config);
  arrayExtra.glyphs.map = () => [];
  assert.equal(hash(logic.sanitizeConfig(arrayExtra)), CONFIG_HASH);

  const customArray = clone(config);
  Object.setPrototypeOf(customArray.glyphs[0].rows, Object.create(Array.prototype));
  assert.equal(hash(logic.sanitizeConfig(customArray)), CONFIG_HASH);
});

test("valid config Proxy uses each reflection surface once and never performs ordinary get", () => {
  const tracked = trackedProxy(clone(config));
  const clean = logic.sanitizeConfig(tracked.proxy);
  assert.equal(hash(clean), CONFIG_HASH);
  assert.equal(tracked.counts.getPrototypeOf, 1);
  assert.equal(tracked.counts.ownKeys, 1);
  assert.equal(tracked.counts.get, 0);
  assert.deepEqual(
    Array.from(tracked.counts.getOwnPropertyDescriptor.values()),
    [1, 1, 1, 1, 1, 1],
  );
});

test("valid rows Proxy uses one prototype/keys/descriptor pass and no ordinary get", () => {
  const tracked = trackedProxy(clone(config.glyphs[0].rows));
  const targets = logic.buildTargets(tracked.proxy, 2);
  assert.equal(hash(targets), DEFAULT_TARGET_HASHES[0]);
  assert.equal(tracked.counts.getPrototypeOf, 1);
  assert.equal(tracked.counts.ownKeys, 1);
  assert.equal(tracked.counts.get, 0);
  assert.deepEqual(
    Array.from(tracked.counts.getOwnPropertyDescriptor.values()),
    new Array(10).fill(1),
  );
});

test("five direct bands and charge-unit band boundaries are exact", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(logic.directUnitsForBand), [4, 8, 12, 16, 20]);
  assert.deepEqual(
    [1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(logic.chargeBandFromUnits),
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
  for (const invalid of [-1, 5, 1.5, "2", NaN, Infinity, {}, null]) {
    assert.equal(logic.directUnitsForBand(invalid), null);
  }
  for (const invalid of [0, 21, 1.5, "12", NaN, Infinity, {}, null]) {
    assert.equal(logic.chargeBandFromUnits(invalid), null);
  }
});

test("hold quantization matches every fixed threshold and rejects invalid time", () => {
  const fixtures = [
    [0, 1, 0, 430], [49, 1, 0, 430], [50, 2, 0, 430],
    [199, 4, 0, 430], [200, 5, 1, 390], [399, 8, 1, 390],
    [400, 9, 2, 350], [599, 12, 2, 350], [600, 13, 3, 310],
    [799, 16, 3, 310], [800, 17, 4, 270], [949, 19, 4, 270],
    [950, 20, 4, 270], [5000, 20, 4, 270],
  ];
  for (const [elapsedMs, chargeUnits, chargeBand, apexY] of fixtures) {
    assert.deepEqual(logic.quantizeHold(100, 100 + elapsedMs), {
      elapsedMs: Math.min(elapsedMs, 950),
      chargeUnits,
      chargeBand,
      apexY,
    });
  }
  for (const pair of [
    [2, 1], [-1, 0], [0, -1], [0.5, 1], [0, 1.5],
    [0, Infinity], [0, Number.MAX_SAFE_INTEGER + 1], ["0", 1],
  ]) {
    assert.equal(logic.quantizeHold(pair[0], pair[1]), null);
  }
});

test("targets use fixed row-major IDs, coordinates, counts, and all five apex bands", () => {
  const content = logic.sanitizeConfig(config);
  const expectedEnds = [
    [{ id: "p00", x: 380, y: 110 }, { id: "p29", x: 740, y: 590 }],
    [{ id: "p00", x: 380, y: 110 }, { id: "p28", x: 680, y: 590 }],
    [{ id: "p00", x: 320, y: 110 }, { id: "p30", x: 680, y: 590 }],
  ];
  for (let index = 0; index < 3; index += 1) {
    const targets = logic.buildTargets(content.glyphs[index].rows, 2);
    assert.deepEqual([targets[0], targets.at(-1)], expectedEnds[index]);
  }
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((band) => logic.buildTargets(content.glyphs[0].rows, band)[0].y),
    [190, 150, 110, 70, 30],
  );
  assert.equal(logic.buildTargets(content.glyphs[0].rows, -1), null);
  assert.equal(logic.buildTargets(content.glyphs[0].rows, 5), null);
  assert.equal(logic.buildTargets(["........."], 2), null);
});

test("presentationTick matches all fixed millisecond fixtures", () => {
  const fixtures = [
    [0, 0], [399, 47], [400, 48], [599, 71], [600, 72],
    [899, 107], [900, 108], [950, 114], [999, 119],
    [1000, 120], [5000, 120],
  ];
  for (const [elapsed, expected] of fixtures) {
    assert.equal(logic.presentationTick(700, 700 + elapsed), expected);
  }
  assert.equal(logic.presentationTick(2, 1), null);
  assert.equal(logic.presentationTick(-1, 0), null);
  assert.equal(logic.presentationTick(0.5, 1), null);
  assert.equal(logic.presentationTick(0, Infinity), null);
});

test("g0 band-2 presentation frames match the independent fixed golden", () => {
  const rows = logic.sanitizeConfig(config).glyphs[0].rows;
  const frame0 = logic.getPresentationFrame(rows, 12, 0);
  const frame24 = logic.getPresentationFrame(rows, 12, 24);
  const frame47 = logic.getPresentationFrame(rows, 12, 47);
  assert.deepEqual([frame0.phase, frame0.rocket, frame0.points], [
    "ascent", { x: 500, y: 900 }, [],
  ]);
  assert.deepEqual(frame24.rocket, { x: 500, y: 625 });
  assert.deepEqual(frame47.rocket, { x: 500, y: 361 });

  const frame48 = logic.getPresentationFrame(rows, 12, 48);
  const frame60 = logic.getPresentationFrame(rows, 12, 60);
  const frame72 = logic.getPresentationFrame(rows, 12, 72);
  assert.deepEqual([frame48.points[0], frame48.points.at(-1)], [
    { id: "p00", x: 500, y: 350, alpha: 1000 },
    { id: "p29", x: 500, y: 350, alpha: 1000 },
  ]);
  assert.deepEqual([frame60.points[0], frame60.points.at(-1)], [
    { id: "p00", x: 440, y: 230, alpha: 1000 },
    { id: "p29", x: 620, y: 470, alpha: 1000 },
  ]);
  assert.deepEqual([frame72.points[0], frame72.points.at(-1)], [
    { id: "p00", x: 380, y: 110, alpha: 1000 },
    { id: "p29", x: 740, y: 590, alpha: 1000 },
  ]);
  assert.equal(logic.getPresentationFrame(rows, 12, 73).phase, "hold");
  assert.equal(logic.getPresentationFrame(rows, 12, 108).points[0].alpha, 1000);
  assert.equal(logic.getPresentationFrame(rows, 12, 114).points[0].alpha, 500);
  assert.equal(logic.getPresentationFrame(rows, 12, 120).points[0].alpha, 0);
  assert.equal(logic.getPresentationFrame(rows, 0, 0), null);
  assert.equal(logic.getPresentationFrame(rows, 12, 121), null);
});

test("initial state is exact, newly allocated, recursively frozen, and ordered", () => {
  const first = logic.createInitialState();
  const second = logic.createInitialState();
  assert.notEqual(first, second);
  assert.deepEqual(first, {
    version: 1,
    phase: "intro",
    content: null,
    completedCount: 0,
    currentShot: null,
    revision: 0,
  });
  assert.deepEqual(Object.keys(first), [
    "version", "phase", "content", "completedCount", "currentShot", "revision",
  ]);
  assertDeepFrozen(first);
});

test("the four exact actions produce the fixed state sequence and reject semantic mismatches", () => {
  const intro = logic.createInitialState();
  const ready0 = start(config, intro);
  assert.deepEqual(stateSummary(ready0), {
    version: 1, phase: "ready", completedCount: 0, currentShot: null, revision: 1,
  });
  assert.notEqual(ready0.content, config);

  const wrongLaunch = { type: "LAUNCH", index: 1, expectedRevision: 1, chargeUnits: 12 };
  assert.equal(logic.reduce(ready0, wrongLaunch), ready0);
  const burst0 = launch(ready0, 12);
  assert.deepEqual(stateSummary(burst0), {
    version: 1,
    phase: "bursting",
    completedCount: 0,
    currentShot: { index: 0, chargeUnits: 12, burstToken: 2 },
    revision: 2,
  });
  assert.equal(logic.reduce(burst0, { type: "COMPLETE_BURST", burstToken: 1 }), burst0);
  const ready1 = completeBurst(burst0);
  assert.deepEqual(stateSummary(ready1), {
    version: 1, phase: "ready", completedCount: 1, currentShot: null, revision: 3,
  });

  const complete = finishRound([4, 8, 20]);
  assert.deepEqual(stateSummary(complete), {
    version: 1, phase: "complete", completedCount: 3, currentShot: null, revision: 7,
  });
  assert.equal(logic.reduce(complete, { type: "COMPLETE_BURST", burstToken: 6 }), complete);
  const restarted = logic.reduce(complete, { type: "RESTART" });
  assert.deepEqual(stateSummary(restarted), {
    version: 1, phase: "intro", completedCount: 0, currentShot: null, revision: 8,
  });
  assert.equal(restarted.content, null);
});

test("all action schemas reject extras, symbols, accessors, custom prototypes, boxed values, and coercion", () => {
  const intro = logic.createInitialState();
  const ready = start();
  const burst = launch(ready);
  const cases = [
    [intro, { type: "START", content: clone(config), extra: true }],
    [ready, { type: "LAUNCH", index: 0, expectedRevision: 1, chargeUnits: "12" }],
    [ready, { type: "LAUNCH", index: new Number(0), expectedRevision: 1, chargeUnits: 12 }],
    [burst, { type: "COMPLETE_BURST", burstToken: 2, extra: true }],
    [finishRound(), { type: "RESTART", extra: true }],
  ];
  for (const [state, action] of cases) assert.equal(logic.reduce(state, action), state);

  const symbolAction = { type: "RESTART" };
  symbolAction[Symbol("extra")] = true;
  const complete = finishRound();
  assert.equal(logic.reduce(complete, symbolAction), complete);

  const accessorAction = {};
  let reads = 0;
  Object.defineProperty(accessorAction, "type", {
    enumerable: true,
    get() {
      reads += 1;
      return "RESTART";
    },
  });
  assert.equal(logic.reduce(complete, accessorAction), complete);
  assert.equal(reads, 0);

  const custom = Object.create({ inherited: true });
  custom.type = "RESTART";
  assert.equal(logic.reduce(complete, custom), complete);
});

test("valid state and action Proxies use one descriptor pass and no ordinary get", () => {
  const ready = clone(start());
  const trackedState = trackedProxy(ready);
  const action = {
    type: "LAUNCH", index: 0, expectedRevision: 1, chargeUnits: 12,
  };
  const trackedAction = trackedProxy(action);
  const burst = logic.reduce(trackedState.proxy, trackedAction.proxy);
  assert.equal(burst.phase, "bursting");
  assert.equal(trackedState.counts.getPrototypeOf, 1);
  assert.equal(trackedState.counts.ownKeys, 1);
  assert.equal(trackedState.counts.get, 0);
  assert.deepEqual(
    Array.from(trackedState.counts.getOwnPropertyDescriptor.values()),
    new Array(6).fill(1),
  );
  assert.equal(trackedAction.counts.getPrototypeOf, 1);
  assert.equal(trackedAction.counts.ownKeys, 1);
  assert.equal(trackedAction.counts.get, 0);
  assert.deepEqual(
    Array.from(trackedAction.counts.getOwnPropertyDescriptor.values()),
    new Array(4).fill(1),
  );
});

test("an invalid state returns a fresh intro without reading the action at all", () => {
  let actionReads = 0;
  const hostileAction = new Proxy({}, {
    getPrototypeOf() {
      actionReads += 1;
      throw new Error("must not inspect action");
    },
    ownKeys() {
      actionReads += 1;
      throw new Error("must not inspect action");
    },
    getOwnPropertyDescriptor() {
      actionReads += 1;
      throw new Error("must not inspect action");
    },
    get() {
      actionReads += 1;
      throw new Error("must not inspect action");
    },
  });
  const first = logic.reduce({ version: 99 }, hostileAction);
  const second = logic.reduce({ version: 99 }, hostileAction);
  assert.deepEqual(first, logic.createInitialState());
  assert.notEqual(first, second);
  assert.equal(actionReads, 0);
});

test("JSON-cloned legal states remain valid through every phase", () => {
  const states = [];
  let state = logic.createInitialState();
  states.push(state);
  state = start(config, clone(state));
  states.push(state);
  for (let index = 0; index < 3; index += 1) {
    state = launch(clone(state), 4 + index * 8);
    states.push(state);
    state = completeBurst(clone(state));
    states.push(state);
  }
  for (const legal of states) {
    assert.deepEqual(logic.getPublicView(clone(legal)), logic.getPublicView(legal));
  }
});

test("revision headroom accepts the exact MAX_SAFE full-round boundary", () => {
  const M = Number.MAX_SAFE_INTEGER;
  let state = {
    version: 1,
    phase: "intro",
    content: null,
    completedCount: 0,
    currentShot: null,
    revision: M - 7,
  };
  state = start(config, state);
  assert.deepEqual(stateSummary(state), {
    version: 1, phase: "ready", completedCount: 0, currentShot: null, revision: M - 6,
  });
  state = launch(state, 1);
  assert.equal(state.revision, M - 5);
  state = completeBurst(state);
  assert.equal(state.revision, M - 4);
  state = launch(state, 20);
  assert.equal(state.revision, M - 3);
  state = completeBurst(state);
  assert.equal(state.revision, M - 2);
  state = launch(state, 12);
  assert.equal(state.revision, M - 1);
  state = completeBurst(state);
  assert.deepEqual(stateSummary(state), {
    version: 1, phase: "complete", completedCount: 3, currentShot: null, revision: M,
  });
});

test("restart at M-8 reserves exactly one complete following round", () => {
  const M = Number.MAX_SAFE_INTEGER;
  const priorComplete = {
    version: 1,
    phase: "complete",
    content: clone(logic.DEFAULT_CONFIG),
    completedCount: 3,
    currentShot: null,
    revision: M - 8,
  };
  const intro = logic.reduce(priorComplete, { type: "RESTART" });
  assert.equal(intro.revision, M - 7);
  assert.equal(finishRound([1, 10, 20], config, intro).revision, M);

  const blockedIntro = { ...clone(intro), revision: M - 6 };
  assert.equal(logic.reduce(blockedIntro, logic.createStartAction(config)), blockedIntro);
  const blockedComplete = { ...clone(priorComplete), revision: M - 7 };
  assert.equal(logic.reduce(blockedComplete, { type: "RESTART" }), blockedComplete);
});

test("ready and bursting states exceeding their phase/count headroom are invalid", () => {
  const M = Number.MAX_SAFE_INTEGER;
  const content = clone(logic.DEFAULT_CONFIG);
  const cases = [
    ["ready", 0, null, M - 5],
    ["bursting", 0, { index: 0, chargeUnits: 1, burstToken: M - 4 }, M - 4],
    ["ready", 1, null, M - 3],
    ["bursting", 1, { index: 1, chargeUnits: 1, burstToken: M - 2 }, M - 2],
    ["ready", 2, null, M - 1],
    ["bursting", 2, { index: 2, chargeUnits: 1, burstToken: M }, M],
  ];
  for (const [phase, completedCount, currentShot, revision] of cases) {
    const malformed = {
      version: 1, phase, content, completedCount, currentShot, revision,
    };
    assert.deepEqual(logic.getPublicView(malformed), logic.getPublicView(logic.createInitialState()));
  }
});

test("all 8,000 three-shot charge sequences produce byte-identical complete state and view", () => {
  const expectedState = finishRound([1, 1, 1]);
  const expectedStateBytes = JSON.stringify(expectedState);
  const expectedViewBytes = JSON.stringify(logic.getPublicView(expectedState));
  for (let first = 1; first <= 20; first += 1) {
    for (let second = 1; second <= 20; second += 1) {
      for (let third = 1; third <= 20; third += 1) {
        const complete = finishRound([first, second, third]);
        assert.equal(JSON.stringify(complete), expectedStateBytes);
        assert.equal(JSON.stringify(logic.getPublicView(complete)), expectedViewBytes);
      }
    }
  }
});

test("an action log and its JSON clone replay to the same bytes", () => {
  const actions = [
    logic.createStartAction(config),
    { type: "LAUNCH", index: 0, expectedRevision: 1, chargeUnits: 3 },
    { type: "COMPLETE_BURST", burstToken: 2 },
    { type: "LAUNCH", index: 1, expectedRevision: 3, chargeUnits: 17 },
    { type: "COMPLETE_BURST", burstToken: 4 },
    { type: "LAUNCH", index: 2, expectedRevision: 5, chargeUnits: 9 },
    { type: "COMPLETE_BURST", burstToken: 6 },
  ];
  const replay = (entries) => entries.reduce(
    (state, action) => logic.reduce(state, action),
    logic.createInitialState(),
  );
  assert.equal(JSON.stringify(replay(actions)), JSON.stringify(replay(clone(actions))));
});

test("public view has exact keys, exact progress copy, and recursively frozen detached data", () => {
  const expectedKeys = [
    "phase", "completedCount", "totalCount", "progressText", "revealedGlyphs",
    "currentTargets", "currentChargeBand", "burstToken", "canStart", "canLaunch",
    "canRestart", "isBursting", "recipient", "sender", "patternLabel", "finalTitle",
    "finalNote", "revision",
  ];
  let state = logic.createInitialState();
  const snapshots = [[logic.getPublicView(state), "还没点亮第一束。"]];
  state = start();
  snapshots.push([logic.getPublicView(state), "准备点燃第 1 / 3 束。"]);
  for (let index = 0; index < 3; index += 1) {
    state = launch(state, 12);
    snapshots.push([logic.getPublicView(state), `第 ${index + 1} / 3 束正在升空。`]);
    state = completeBurst(state);
    snapshots.push([
      logic.getPublicView(state),
      [
        "第 1 束已经留下；准备第 2 / 3 束。",
        "前两束已经留下；准备第 3 / 3 束。",
        "三束光都留在夜空里。",
      ][index],
    ]);
  }
  for (const [view, progressText] of snapshots) {
    assert.deepEqual(Object.keys(view), expectedKeys);
    assert.equal(view.progressText, progressText);
    assertDeepFrozen(view);
  }
  assert.notEqual(snapshots[1][0].revealedGlyphs, state.content.glyphs);
});

test("privacy sentinel reveals only current targets, completed prefix, and complete-only final fields", () => {
  const raw = sentinelConfig();
  const labels = ["岚", "屿", "棠"];
  const finals = ["收件-X7", "署名-Q2", "图案-P9", "标题-T4", "留言-N6"];
  let state = logic.createInitialState();

  function assertStage(view, revealedCount, finalAllowed) {
    assert.deepEqual(view.revealedGlyphs.map((glyph) => glyph.label), labels.slice(0, revealedCount));
    assert.deepEqual(
      view.revealedGlyphs.map((glyph) => hash(glyph.targets)),
      SENTINEL_TARGET_HASHES.slice(0, revealedCount),
    );
    const serialized = JSON.stringify(view);
    for (let index = revealedCount; index < labels.length; index += 1) {
      assert.equal(serialized.includes(labels[index]), false);
    }
    for (const value of finals) {
      assert.equal(serialized.includes(value), finalAllowed);
    }
    for (const glyph of raw.glyphs) {
      for (const row of glyph.rows) assert.equal(serialized.includes(row), false);
    }
  }

  assertStage(logic.getPublicView(state), 0, false);
  state = start(raw, state);
  assertStage(logic.getPublicView(state), 0, false);
  for (let index = 0; index < 3; index += 1) {
    state = launch(state, 12);
    const bursting = logic.getPublicView(state);
    assertStage(bursting, index, false);
    assert.equal(hash(bursting.currentTargets), SENTINEL_TARGET_HASHES[index]);
    assert.equal(bursting.currentChargeBand, 2);
    assert.equal(bursting.burstToken, state.revision);
    state = completeBurst(state);
    assertStage(logic.getPublicView(state), index + 1, index === 2);
  }
  const complete = logic.getPublicView(state);
  assert.deepEqual({
    recipient: complete.recipient,
    sender: complete.sender,
    patternLabel: complete.patternLabel,
    finalTitle: complete.finalTitle,
    finalNote: complete.finalNote,
  }, {
    recipient: "收件-X7",
    sender: "署名-Q2",
    patternLabel: "图案-P9",
    finalTitle: "标题-T4",
    finalNote: "留言-N6",
  });
});

test("current targets follow shot band while every revealed glyph stays on band 2", () => {
  let state = start();
  for (const [index, units, band] of [[0, 1, 0], [1, 9, 2], [2, 20, 4]]) {
    state = launch(state, units);
    const burst = logic.getPublicView(state);
    assert.equal(burst.currentChargeBand, band);
    assert.equal(burst.currentTargets[0].y, [190, 150, 110, 70, 30][band]);
    state = completeBurst(state);
    const settled = logic.getPublicView(state);
    assert.equal(hash(settled.revealedGlyphs[index].targets), DEFAULT_TARGET_HASHES[index]);
  }
});

test("production attribution freezes five sources, licenses, hashes, and zero-copy boundary", () => {
  const attribution = fs.readFileSync(
    new URL("./assets/ATTRIBUTION.md", import.meta.url),
    "utf8",
  );
  for (const value of [
    "借鉴与来源声明",
    "8f01eeaef422c1f0880e94ce99040025a1b74d7e",
    "238e8273305bb2e3c76f9f0bb289fb127c3dff74",
    "9ee144a548aad85275318b30891c71dcf6e10f7b",
    "20eebad51dde793070c373d594099a7ed8d96e22",
    "07123b871c103268375880980fd715b2b26b2ff0",
    "90ee54acbb98a0f58ef428b972bc5641877b6c56315bd6983396a5682db5d937",
    "232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b",
    "2a9fec8f93f07847a22029d5c423e33e0839da09d516664e5f0608346c03a122",
    "fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a",
    "7a3ad7d36b8855bc301276279769da4aff648ea5d7b92f3f023c0823ee948764",
    "生成资产：无",
    "独立设计和实现",
    "不属于依赖",
  ]) {
    assert.match(attribution, new RegExp(value));
  }
});
