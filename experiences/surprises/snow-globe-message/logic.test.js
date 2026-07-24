import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

await import("./config.js");
await import("./logic.js");

const config = globalThis.SNOW_GLOBE_MESSAGE_CONFIG;
const logic = globalThis.SNOW_GLOBE_MESSAGE_LOGIC;
const content = logic.sanitizeConfig(config);

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
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

function customConfig(overrides = {}) {
  return {
    recipient: overrides.recipient ?? config.recipient,
    sender: overrides.sender ?? config.sender,
    patternRows: overrides.patternRows ?? [...config.patternRows],
    patternLabel: overrides.patternLabel ?? config.patternLabel,
    finalTitle: overrides.finalTitle ?? config.finalTitle,
    finalNote: overrides.finalNote ?? config.finalNote,
  };
}

function runToPhase(phase = "complete", rawConfig = config) {
  let state = logic.createInitialState();
  if (phase === "intro") return state;
  state = logic.reduce(state, logic.createStartAction(rawConfig));
  if (phase === "gathering") return state;
  for (const direction of logic.DIRECTIONS) {
    state = logic.reduce(state, { type: "ADD_WIND", direction });
  }
  if (phase === "armed") return state;
  state = logic.reduce(state, { type: "BEGIN_SETTLE" });
  if (phase === "settling") return state;
  return logic.reduce(state, { type: "COMPLETE_SETTLE", settleToken: state.settleToken });
}

function permutations(values) {
  if (values.length === 0) return [[]];
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    for (const rest of permutations(values.filter((_value, itemIndex) => itemIndex !== index))) {
      result.push([values[index], ...rest]);
    }
  }
  return result;
}

test("classic browser global and CommonJS exports share one frozen API", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const browserContext = vm.createContext({});
  vm.runInContext(source, browserContext);
  assert.equal(typeof browserContext.SNOW_GLOBE_MESSAGE_LOGIC.reduce, "function");

  const commonJsContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(source, commonJsContext);
  assert.equal(commonJsContext.module.exports, commonJsContext.SNOW_GLOBE_MESSAGE_LOGIC);
  assert.equal(Object.isFrozen(commonJsContext.module.exports), true);
});

test("module initialization does not touch browser, time, random, storage, or network APIs", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(`
    for (const key of [
      "document", "CanvasRenderingContext2D", "crypto", "Date", "performance",
      "setTimeout", "setInterval", "queueMicrotask", "localStorage", "sessionStorage",
      "fetch", "XMLHttpRequest", "navigator"
    ]) Object.defineProperty(globalThis, key, { get() { throw new Error("forbidden " + key); } });
    Object.defineProperty(Math, "random", { get() { throw new Error("forbidden random"); } });
  `, context);
  assert.doesNotThrow(() => vm.runInContext(source, context));
});

test("captured intrinsics keep public helpers deterministic after prototype poisoning", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const sandboxLogic = context.SNOW_GLOBE_MESSAGE_LOGIC;
  let state = sandboxLogic.reduce(
    sandboxLogic.createInitialState(),
    sandboxLogic.createStartAction(sandboxLogic.DEFAULT_CONFIG),
  );
  vm.runInContext(`
    String.prototype.charCodeAt = function () { throw new Error("poisoned charCodeAt"); };
    String.prototype.padStart = function () { throw new Error("poisoned padStart"); };
    Array.prototype.join = function () { throw new Error("poisoned join"); };
  `, context);
  assert.doesNotThrow(() => sandboxLogic.sanitizeConfig(sandboxLogic.DEFAULT_CONFIG));
  assert.equal(sandboxLogic.buildTargets(sandboxLogic.DEFAULT_CONFIG.patternRows).length, 63);
  assert.equal(sandboxLogic.getPublicView(state).progressText,
    "已收好 0 / 4 阵风；还差：上、右、下、左");
});

test("constants, defaults, canonical hashes, targets, and frozen ownership match the spec", () => {
  assert.deepEqual({
    VERSION: logic.VERSION,
    GRID_ROWS: logic.GRID_ROWS,
    GRID_COLUMNS: logic.GRID_COLUMNS,
    MIN_ACTIVE_CELLS: logic.MIN_ACTIVE_CELLS,
    MAX_ACTIVE_CELLS: logic.MAX_ACTIVE_CELLS,
    COORD_SCALE: logic.COORD_SCALE,
    INNER_THRESHOLD: logic.INNER_THRESHOLD,
    OUTER_THRESHOLD: logic.OUTER_THRESHOLD,
    TARGET_X_ORIGIN: logic.TARGET_X_ORIGIN,
    TARGET_X_STEP: logic.TARGET_X_STEP,
    TARGET_Y_ORIGIN: logic.TARGET_Y_ORIGIN,
    TARGET_Y_STEP: logic.TARGET_Y_STEP,
    DISPLAY_FLAKES: logic.DISPLAY_FLAKES,
    SETTLE_DURATION_MS: logic.SETTLE_DURATION_MS,
    SETTLE_TIMEOUT_MS: logic.SETTLE_TIMEOUT_MS,
    MAX_REVISION: logic.MAX_REVISION,
  }, {
    VERSION: 1, GRID_ROWS: 9, GRID_COLUMNS: 11,
    MIN_ACTIVE_CELLS: 16, MAX_ACTIVE_CELLS: 72, COORD_SCALE: 1000,
    INNER_THRESHOLD: 100, OUTER_THRESHOLD: 260,
    TARGET_X_ORIGIN: 140, TARGET_X_STEP: 72,
    TARGET_Y_ORIGIN: 130, TARGET_Y_STEP: 78,
    DISPLAY_FLAKES: 72, SETTLE_DURATION_MS: 900, SETTLE_TIMEOUT_MS: 1400,
    MAX_REVISION: Number.MAX_SAFE_INTEGER,
  });
  assert.deepEqual(logic.DIRECTIONS, ["up", "right", "down", "left"]);
  assert.equal(hash(content.patternRows),
    "8f09060956c7564b04df72eb464fa9f87dd9e5d6194d18d13d55d6bfccc9f270");
  const targets = logic.buildTargets(content.patternRows);
  assert.equal(targets.length, 63);
  assert.deepEqual(targets[0], { id: "p00", x: 212, y: 130 });
  assert.deepEqual(targets[62], { id: "p62", x: 500, y: 754 });
  assert.equal(hash(targets),
    "0091bf6cb08c824260f851918eb1323a0e7fb54a1e0637ec9656c5928dac81a1");
  assertDeepFrozen(logic);
  assertDeepFrozen(content);
  assertDeepFrozen(targets);
});

test("sanitizeConfig uses an all-or-nothing strict snapshot and never invokes ordinary getters", () => {
  const candidate = customConfig();
  const safe = logic.sanitizeConfig(candidate);
  candidate.recipient = "外部改动";
  candidate.patternRows[0] = "...........";
  assert.deepEqual(safe, content);
  assert.notEqual(safe, candidate);
  assert.notEqual(safe.patternRows, candidate.patternRows);

  let getterCalls = 0;
  const accessor = customConfig();
  Object.defineProperty(accessor, "recipient", {
    enumerable: true,
    get() { getterCalls += 1; return "不应读取"; },
  });
  assert.equal(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);
  assert.equal(getterCalls, 0);

  const calls = { prototype: 0, keys: 0, descriptors: 0, get: 0 };
  const proxy = new Proxy(customConfig(), {
    getPrototypeOf(target) { calls.prototype += 1; return Reflect.getPrototypeOf(target); },
    ownKeys(target) { calls.keys += 1; return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      calls.descriptors += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() { calls.get += 1; throw new Error("ordinary get must not run"); },
  });
  assert.deepEqual(logic.sanitizeConfig(proxy), content);
  assert.deepEqual(calls, { prototype: 1, keys: 1, descriptors: 6, get: 0 });
});

test("config rejects extra/symbol/custom schemas, invalid text, and invalid patterns as one unit", () => {
  const cases = [];
  const extra = { ...customConfig(), extra: true };
  cases.push(extra);
  const symbol = customConfig();
  symbol[Symbol("extra")] = true;
  cases.push(symbol);
  cases.push(Object.assign(Object.create(null), customConfig()));
  cases.push(Object.assign(Object.create({}), customConfig()));
  cases.push(customConfig({ recipient: "同名", sender: "同名" }));
  cases.push(customConfig({ recipient: "\ud800" }));
  cases.push(customConfig({ finalTitle: "标题\u2028坏" }));
  cases.push(customConfig({ finalNote: "一\n二\n三\n四\n五" }));
  cases.push(customConfig({ patternRows: [...config.patternRows, "..........."] }));
  cases.push(customConfig({ patternRows: Array(9) }));
  const subclass = class Rows extends Array {};
  cases.push(customConfig({ patternRows: new subclass(...config.patternRows) }));
  const customIterator = [...config.patternRows];
  customIterator[Symbol.iterator] = function* iterator() { yield "###########"; };
  cases.push(customConfig({ patternRows: customIterator }));
  cases.push(customConfig({ patternRows: Array(9).fill("...........") }));
  cases.push(customConfig({ patternRows: Array(9).fill("###########") }));
  cases.push(customConfig({ patternRows: [".###...###.", ...config.patternRows.slice(1, 8), "....x......"] }));

  for (const candidate of cases) {
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG);
  }
  assert.equal(logic.sanitizeConfig(customConfig({
    recipient: "  雪雪  ",
    sender: "  风风  ",
    finalNote: " 第一行\n第二行 ",
  })).recipient, "雪雪");
});

test("buildTargets accepts only dense native 9x11 patterns with 16..72 active cells", () => {
  const sixteen = [
    "####.......", "####.......", "####.......", "####.......",
    "...........", "...........", "...........", "...........", "...........",
  ];
  const seventyTwo = [
    "###########", "###########", "###########", "###########",
    "###########", "###########", "######.....", "...........", "...........",
  ];
  assert.equal(logic.buildTargets(sixteen).length, 16);
  assert.equal(logic.buildTargets(seventyTwo).length, 72);
  assert.equal(logic.buildTargets(Array(9).fill("...........")), null);
  assert.equal(logic.buildTargets(Array(9).fill("###########")), null);
  assert.equal(logic.buildTargets(config.patternRows.slice(0, 8)), null);
  assert.equal(logic.buildTargets([...config.patternRows, "..........."]), null);
  assert.equal(logic.buildTargets([...config.patternRows.slice(0, 8), ".........."]), null);
});

test("classifyWindSample follows exact hysteresis and vertical tie boundaries", () => {
  const fixtures = [
    [false, 259, 0, { latched: false, direction: null }],
    [false, 260, 259, { latched: true, direction: "right" }],
    [false, 259, 260, { latched: true, direction: "down" }],
    [false, 260, 260, { latched: true, direction: "down" }],
    [false, -260, -260, { latched: true, direction: "up" }],
    [true, 101, 0, { latched: true, direction: null }],
    [true, 100, 100, { latched: false, direction: null }],
  ];
  for (const [latched, dx, dy, expected] of fixtures) {
    const result = logic.classifyWindSample(latched, dx, dy);
    assert.deepEqual(result, expected);
    assertDeepFrozen(result);
  }
  for (const invalid of [
    [0, 0, 0], [false, 1.5, 0], [false, 1001, 0],
    [false, 0, Number.NaN], [false, {}, 0],
  ]) assert.equal(logic.classifyWindSample(...invalid), null);
});

test("independent oracle proves all 24 direction orders and duplicate no-ops", () => {
  assert.equal(permutations(logic.DIRECTIONS).length, 24);
  for (const order of permutations(logic.DIRECTIONS)) {
    let state = logic.reduce(logic.createInitialState(), logic.createStartAction(config));
    const seen = new Set();
    for (let index = 0; index < order.length; index += 1) {
      const direction = order[index];
      const before = state;
      state = logic.reduce(state, { type: "ADD_WIND", direction });
      seen.add(direction);
      assert.equal(state.revision, before.revision + 1);
      assert.equal(state.phase, index === 3 ? "armed" : "gathering");
      assert.equal(logic.getPublicView(state).collectedCount, seen.size);
      assert.equal(logic.reduce(state, { type: "ADD_WIND", direction }), state);
    }
    assert.equal(state.phase, "armed");
  }
});

test("independent 16-subset oracle matches order, count, missing labels, and progress text", () => {
  const labels = { up: "上", right: "右", down: "下", left: "左" };
  for (let mask = 0; mask < 16; mask += 1) {
    let state = logic.reduce(logic.createInitialState(), logic.createStartAction(config));
    const collected = [];
    const missing = [];
    for (let index = 0; index < logic.DIRECTIONS.length; index += 1) {
      const direction = logic.DIRECTIONS[index];
      if ((mask & (1 << index)) !== 0) {
        state = logic.reduce(state, { type: "ADD_WIND", direction });
        collected.push(direction);
      } else {
        missing.push(labels[direction]);
      }
    }
    const view = logic.getPublicView(state);
    assert.equal(view.collectedCount, collected.length);
    assert.deepEqual(view.missingLabels, missing);
    if (collected.length < 4) {
      assert.equal(view.progressText,
        `已收好 ${collected.length} / 4 阵风；还差：${missing.join("、")}`);
    } else {
      assert.equal(view.progressText, "四阵风都在了。准备好，就让雪落下。");
    }
  }
});

test("settle token, restart, JSON replay, and stale callbacks are deterministic", () => {
  const actionLog = [
    logic.createStartAction(config),
    { type: "ADD_WIND", direction: "left" },
    { type: "ADD_WIND", direction: "up" },
    { type: "ADD_WIND", direction: "down" },
    { type: "ADD_WIND", direction: "right" },
    { type: "BEGIN_SETTLE" },
  ];
  let state = logic.createInitialState();
  for (const action of actionLog) state = logic.reduce(state, action);
  const token = state.settleToken;
  assert.equal(state.phase, "settling");
  assert.equal(state.revision, 6);
  assert.equal(token, 6);
  assert.equal(logic.reduce(state, { type: "COMPLETE_SETTLE", settleToken: token - 1 }), state);
  state = logic.reduce(state, { type: "COMPLETE_SETTLE", settleToken: token });
  assert.equal(state.phase, "complete");
  assert.equal(logic.reduce(state, { type: "COMPLETE_SETTLE", settleToken: token }), state);

  const replayLog = clone([...actionLog, { type: "COMPLETE_SETTLE", settleToken: token }]);
  let replay = logic.createInitialState();
  for (const action of replayLog) replay = logic.reduce(clone(replay), action);
  assert.deepEqual(replay, state);

  const restarted = logic.reduce(state, { type: "RESTART" });
  const newRound = logic.reduce(restarted, logic.createStartAction(config));
  assert.equal(logic.reduce(newRound, { type: "COMPLETE_SETTLE", settleToken: token }), newRound);
  assert.equal(newRound.revision, restarted.revision + 1);
});

test("an independent transition table proves token and every headroom boundary", () => {
  const maximum = logic.MAX_REVISION;
  for (let count = 0; count < 4; count += 1) {
    const winds = { up: false, right: false, down: false, left: false };
    for (let index = 0; index < count; index += 1) winds[logic.DIRECTIONS[index]] = true;
    const state = {
      version: 1,
      phase: "gathering",
      content: clone(content),
      winds,
      settleToken: null,
      revision: maximum - (6 - count),
    };
    const next = logic.reduce(state, {
      type: "ADD_WIND",
      direction: logic.DIRECTIONS[count],
    });
    assert.equal(next.revision, state.revision + 1);
    assert.equal(next.phase, count === 3 ? "armed" : "gathering");
  }

  const armed = {
    version: 1,
    phase: "armed",
    content: clone(content),
    winds: { up: true, right: true, down: true, left: true },
    settleToken: null,
    revision: maximum - 2,
  };
  const settling = logic.reduce(armed, { type: "BEGIN_SETTLE" });
  assert.equal(settling.revision, maximum - 1);
  assert.equal(settling.settleToken, maximum - 1);
  const completed = logic.reduce(settling, {
    type: "COMPLETE_SETTLE",
    settleToken: maximum - 1,
  });
  assert.equal(completed.revision, maximum);
  assert.equal(completed.phase, "complete");

  const restartable = { ...clone(completed), revision: maximum - 8 };
  const intro = logic.reduce(restartable, { type: "RESTART" });
  assert.equal(intro.revision, maximum - 7);
  const nextRound = logic.reduce(intro, logic.createStartAction(config));
  assert.equal(nextRound.revision, maximum - 6);
  assert.equal(nextRound.phase, "gathering");
});

test("public view enforces target and five-field phase privacy", () => {
  const sentinel = customConfig({
    recipient: "小雪-X7",
    sender: "北风-Q2",
    patternLabel: "图案-P9",
    finalTitle: "标题-T4",
    finalNote: "留言-N6",
  });
  for (const phase of ["intro", "gathering", "armed"]) {
    const view = logic.getPublicView(runToPhase(phase, sentinel));
    assert.deepEqual(view.visibleTargets, []);
    for (const key of ["patternLabel", "recipient", "sender", "finalTitle", "finalNote"]) {
      assert.equal(view[key], null);
    }
  }
  const settling = logic.getPublicView(runToPhase("settling", sentinel));
  assert.equal(settling.visibleTargets.length, 63);
  for (const key of ["patternLabel", "recipient", "sender", "finalTitle", "finalNote"]) {
    assert.equal(settling[key], null);
  }
  const complete = logic.getPublicView(runToPhase("complete", sentinel));
  assert.deepEqual({
    patternLabel: complete.patternLabel,
    recipient: complete.recipient,
    sender: complete.sender,
    finalTitle: complete.finalTitle,
    finalNote: complete.finalNote,
  }, {
    patternLabel: "图案-P9",
    recipient: "小雪-X7",
    sender: "北风-Q2",
    finalTitle: "标题-T4",
    finalNote: "留言-N6",
  });
  assertDeepFrozen(complete);
});

test("revision headroom prevents incomplete transactions and never overflows", () => {
  const initial = logic.createInitialState();
  const nearStart = { ...clone(initial), revision: logic.MAX_REVISION - 6 };
  assert.equal(logic.reduce(nearStart, logic.createStartAction(config)), nearStart);

  const complete = runToPhase("complete");
  const nearRestart = { ...clone(complete), revision: logic.MAX_REVISION - 7 };
  assert.equal(logic.reduce(nearRestart, { type: "RESTART" }), nearRestart);

  const armed = runToPhase("armed");
  const nearBegin = { ...clone(armed), revision: logic.MAX_REVISION - 1 };
  assert.deepEqual(logic.reduce(nearBegin, { type: "BEGIN_SETTLE" }),
    logic.createInitialState());

  const malformed = { ...clone(initial), revision: logic.MAX_REVISION + 1 };
  assert.deepEqual(logic.reduce(malformed, { type: "RESTART" }), logic.createInitialState());
});

test("actions and state fail closed for hostile schemas while valid JSON clones retain identity on no-op", () => {
  const state = clone(runToPhase("gathering"));
  const badActions = [
    null,
    { type: "ADD_WIND", direction: "up", extra: true },
    { type: "ADD_WIND", direction: {} },
    Object.assign(Object.create(null), { type: "ADD_WIND", direction: "up" }),
  ];
  const getter = {};
  Object.defineProperty(getter, "type", { enumerable: true, get() { throw new Error("no"); } });
  badActions.push(getter);
  const symbol = { type: "ADD_WIND", direction: "up" };
  symbol[Symbol("extra")] = true;
  badActions.push(symbol);
  for (const action of badActions) assert.equal(logic.reduce(state, action), state);

  let typeReads = 0;
  const changingType = new Proxy({ type: "BEGIN_SETTLE" }, {
    getPrototypeOf(target) { return Reflect.getPrototypeOf(target); },
    ownKeys(target) { return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      if (key === "type") {
        typeReads += 1;
        return {
          value: typeReads === 1 ? "BEGIN_SETTLE" : "RESTART",
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const complete = runToPhase("complete");
  assert.equal(logic.reduce(complete, changingType), complete);
  assert.equal(typeReads, 1);

  const malformedStates = [
    { ...state, extra: true },
    { ...state, winds: { ...state.winds, extra: true } },
    { ...state, phase: "unknown" },
    { ...state, revision: -1 },
  ];
  for (const malformed of malformedStates) {
    assert.deepEqual(logic.reduce(malformed, { type: "ADD_WIND", direction: "up" }),
      logic.createInitialState());
  }
});

test("production logic contains no forbidden browser/runtime dependency or unsafe HTML sink", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  for (const pattern of [
    /\bdocument\b/, /\bCanvasRenderingContext2D\b/, /\bDate\b/, /\bMath\.random\b/,
    /\bsetTimeout\b/, /\brequestAnimationFrame\b/, /\blocalStorage\b/,
    /\bsessionStorage\b/, /\bfetch\b/, /\bXMLHttpRequest\b/, /\binnerHTML\b/,
    /\binsertAdjacentHTML\b/,
  ]) assert.equal(pattern.test(source), false, String(pattern));
});

test("attribution pins licensed references and preserves the zero-copy boundary", () => {
  const attribution = fs.readFileSync(
    new URL("./assets/ATTRIBUTION.md", import.meta.url),
    "utf8",
  );
  for (const expected of [
    "627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59",
    "c5c18dbc27f490f2ef90e0b574b8c40f534e495d2cb8a6f1c4bb1183a9c381a4",
    "9ee144a548aad85275318b30891c71dcf6e10f7b",
    "2a9fec8f93f07847a22029d5c423e33e0839da09d516664e5f0608346c03a122",
    "20eebad51dde793070c373d594099a7ed8d96e22",
    "fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a",
    "70d42d5484db7fd1646e48cc17caa5ff1c9d92cb",
    "cd28c5af6bf84d8612db3094498d59f66e59468dc645b9e8e70e9d1b377bdf3a",
    "d232eee7a5f31e9fd37aa79aa83f1f206035ccc9",
    "NOASSERTION",
    "没有复制",
    "不使用传感器",
    "生成资产",
    "无。",
    "仅供文档讨论",
  ]) assert.equal(attribution.includes(expected), true, expected);
});
