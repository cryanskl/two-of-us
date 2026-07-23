"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const config = require("./config.js");
const logic = require("./logic.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function assertDeepFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key]);
}

function customConfig(overrides = {}) {
  const source = clone(config);
  return {
    recipient: overrides.recipient === undefined ? source.recipient : overrides.recipient,
    finalTitle: overrides.finalTitle === undefined ? source.finalTitle : overrides.finalTitle,
    finalMessage:
      overrides.finalMessage === undefined ? source.finalMessage : overrides.finalMessage,
    signature: overrides.signature === undefined ? source.signature : overrides.signature,
    candles: overrides.candles === undefined ? source.candles : overrides.candles,
  };
}

function runRoute(rawConfig = config, reveal = false) {
  let state = logic.createInitialState(rawConfig);
  state = logic.reduce(state, { type: "START" });
  for (const candle of rawConfig.candles) {
    state = logic.reduce(state, { type: "TRY_CANDLE", id: candle.id });
  }
  if (reveal) state = logic.reduce(state, { type: "REVEAL" });
  return state;
}

function permutations(values) {
  if (values.length === 0) return [[]];
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    const rest = values.slice(0, index).concat(values.slice(index + 1));
    for (const suffix of permutations(rest)) result.push([values[index], ...suffix]);
  }
  return result;
}

function exactKeys(value, keys) {
  assert.deepEqual(Object.keys(value), keys);
}

test("classic browser global and CommonJS exports share one frozen API", () => {
  assert.equal(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
    "{\"type\":\"commonjs\"}\n",
  );
  const source = fs.readFileSync(path.join(__dirname, "logic.js"), "utf8");
  const browserContext = vm.createContext({});
  vm.runInContext(source, browserContext);
  assert.equal(typeof browserContext.CANDLE_WISHES_LOGIC.reduce, "function");

  const commonJsContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(source, commonJsContext);
  assert.equal(commonJsContext.module.exports, commonJsContext.CANDLE_WISHES_LOGIC);
  assert.equal(Object.isFrozen(commonJsContext.module.exports), true);
  assert.equal(require("./logic.js"), logic);
});

test("config exposes the same editable inventory to classic scripts and CommonJS", () => {
  const source = fs.readFileSync(path.join(__dirname, "config.js"), "utf8");
  const browserContext = vm.createContext({});
  vm.runInContext(source, browserContext);
  assert.deepEqual(clone(browserContext.CANDLE_WISHES_CONFIG), clone(config));
  assert.equal(config.candles.length, 5);
});

test("constants, fixed copy, permutation, default ownership, and canonical hash are exact", () => {
  assert.deepEqual({
    VERSION: logic.VERSION,
    CANDLE_COUNT: logic.CANDLE_COUNT,
    DISPLAY_PERMUTATION: logic.DISPLAY_PERMUTATION,
    MAX_REVISION: logic.MAX_REVISION,
  }, {
    VERSION: 1,
    CANDLE_COUNT: 5,
    DISPLAY_PERMUTATION: [2, 4, 0, 3, 1],
    MAX_REVISION: Number.MAX_SAFE_INTEGER,
  });
  assert.equal(logic.PUBLIC_TITLE, "今晚，点亮五支蜡烛");
  assert.equal(logic.INSTRUCTIONS,
    "读一条线索，点亮对应的蜡烛。选错不会失去什么；五盏都亮起后，会有一段话留给你。");
  assert.equal(logic.PRIVACY_TEXT,
    "内容写在本地文件里；页面不会上传或另存，最后的话会在五盏都亮起后出现。");
  assert.equal(hash(logic.DEFAULT_CONFIG),
    "fa84ee0e0c8e400f22cabd346cfbfa432a69e751bda85fd439071205ff03d37b");
  assert.deepEqual(logic.DEFAULT_CONFIG, config);
  assert.notEqual(logic.DEFAULT_CONFIG, config);
  assertDeepFrozen(logic);
  assertDeepFrozen(logic.DEFAULT_CONFIG);
  assertDeepFrozen(logic.DISPLAY_PERMUTATION);
});

test("sanitizeConfig normalizes NFC, trims text, counts code points, and disconnects ownership", () => {
  const candidate = customConfig({
    recipient: "  e\u0301  ",
    finalMessage: " 第一行\n第二行 ",
  });
  const safe = logic.sanitizeConfig(candidate);
  assert.equal(safe.recipient, "é");
  assert.equal(safe.finalMessage, "第一行\n第二行");
  candidate.candles[0].wish = "调用方后来修改";
  assert.equal(safe.candles[0].wish, config.candles[0].wish);
  assert.notEqual(safe, candidate);
  assert.notEqual(safe.candles, candidate.candles);
  assert.notEqual(safe.candles[0], candidate.candles[0]);
  assertDeepFrozen(safe);

  const emojiLabel = customConfig();
  emojiLabel.candles[0].label = "雨🌧";
  assert.equal(logic.sanitizeConfig(emojiLabel).candles[0].label, "雨🌧");
});

test("config uses one descriptor snapshot per layer and never invokes ordinary getters", () => {
  let getterCalls = 0;
  const accessor = customConfig();
  Object.defineProperty(accessor, "recipient", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "不应读取";
    },
  });
  assert.equal(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);
  assert.equal(getterCalls, 0);

  const calls = { prototype: 0, keys: 0, descriptors: 0, get: 0 };
  const proxy = new Proxy(customConfig(), {
    getPrototypeOf(target) {
      calls.prototype += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      calls.keys += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      calls.descriptors += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      calls.get += 1;
      throw new Error("ordinary get must not run");
    },
  });
  assert.deepEqual(logic.sanitizeConfig(proxy), logic.DEFAULT_CONFIG);
  assert.deepEqual(calls, { prototype: 1, keys: 1, descriptors: 5, get: 0 });
});

test("config rejects hostile schemas, invalid Unicode, duplicates, and bad lengths atomically", () => {
  const cases = [];
  cases.push({ ...customConfig(), extra: true });
  const symbol = customConfig();
  symbol[Symbol("extra")] = true;
  cases.push(symbol);
  cases.push(Object.assign(Object.create(null), customConfig()));
  cases.push(Object.assign(Object.create({}), customConfig()));
  const sparse = customConfig();
  delete sparse.candles[2];
  cases.push(sparse);
  const subclass = class Candles extends Array {};
  cases.push(customConfig({ candles: new subclass(...clone(config.candles)) }));
  const iterator = clone(config.candles);
  iterator[Symbol.iterator] = function* customIterator() {};
  cases.push(customConfig({ candles: iterator }));
  const itemExtra = customConfig();
  itemExtra.candles[0].extra = true;
  cases.push(itemExtra);
  const itemGetter = customConfig();
  Object.defineProperty(itemGetter.candles[0], "label", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  cases.push(itemGetter);
  for (const field of ["recipient", "finalTitle", "signature"]) {
    cases.push(customConfig({ [field]: "坏\n值" }));
  }
  cases.push(customConfig({ recipient: "\ud800" }));
  cases.push(customConfig({ finalMessage: "一\r二" }));
  cases.push(customConfig({ finalMessage: "一\n二\n三\n四\n五" }));
  cases.push(customConfig({ finalTitle: "标题\u2028坏" }));
  const duplicateId = customConfig();
  duplicateId.candles[1].id = duplicateId.candles[0].id;
  cases.push(duplicateId);
  const duplicateLabel = customConfig();
  duplicateLabel.candles[1].label = ` ${duplicateLabel.candles[0].label} `;
  cases.push(duplicateLabel);
  const badId = customConfig();
  badId.candles[0].id = "0bad";
  cases.push(badId);
  const shortWish = customConfig();
  shortWish.candles[0].wish = "太短";
  cases.push(shortWish);

  for (const candidate of cases) {
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG);
  }
  const trap = new Proxy(customConfig(), {
    ownKeys() {
      throw new Error("hostile");
    },
  });
  assert.equal(logic.sanitizeConfig(trap), logic.DEFAULT_CONFIG);
});

test("initial state has exact schema, frozen ownership, and JSON-safe content", () => {
  const state = logic.createInitialState(config);
  exactKeys(state, ["version", "phase", "content", "litIds", "cursor", "revision"]);
  assert.deepEqual(state, {
    version: 1,
    phase: "intro",
    content: logic.DEFAULT_CONFIG,
    litIds: [],
    cursor: 0,
    revision: 0,
  });
  assert.deepEqual(clone(state), state);
  assertDeepFrozen(state);
});

test("independent transition oracle proves golden route, ready, reveal, and restart", () => {
  let state = logic.createInitialState(config);
  state = logic.reduce(state, { type: "START" });
  assert.deepEqual([state.phase, state.cursor, state.revision], ["lighting", 0, 1]);
  for (let index = 0; index < config.candles.length; index += 1) {
    const before = state;
    state = logic.reduce(state, { type: "TRY_CANDLE", id: config.candles[index].id });
    assert.equal(state.cursor, index + 1);
    assert.deepEqual(state.litIds, config.candles.slice(0, index + 1).map((item) => item.id));
    assert.equal(state.revision, before.revision + 1);
    assert.equal(state.phase, index === 4 ? "ready-to-receive" : "lighting");
  }
  state = logic.reduce(state, { type: "REVEAL" });
  assert.deepEqual([state.phase, state.cursor, state.revision], ["complete", 5, 7]);
  const content = state.content;
  state = logic.reduce(state, { type: "RESTART" });
  assert.deepEqual([state.phase, state.cursor, state.revision], ["intro", 0, 8]);
  assert.deepEqual(state.litIds, []);
  assert.deepEqual(state.content, content);
});

test("every wrong valid candle at every route position is a same-reference no-op", () => {
  let state = logic.reduce(logic.createInitialState(config), { type: "START" });
  for (let position = 0; position < config.candles.length; position += 1) {
    const correct = config.candles[position].id;
    for (const candidate of config.candles) {
      if (candidate.id !== correct) {
        assert.equal(logic.reduce(state, { type: "TRY_CANDLE", id: candidate.id }), state);
      }
    }
    assert.equal(logic.reduce(state, { type: "TRY_CANDLE", id: "unknown" }), state);
    state = logic.reduce(state, { type: "TRY_CANDLE", id: correct });
    assert.equal(logic.reduce(state, { type: "TRY_CANDLE", id: correct }), state);
  }
});

test("wrong phase and malformed actions fail closed with the required identity semantics", () => {
  const intro = clone(logic.createInitialState(config));
  assert.equal(logic.reduce(intro, { type: "REVEAL" }), intro);
  assert.equal(logic.reduce(intro, { type: "TRY_CANDLE", id: "rain" }), intro);
  const lighting = logic.reduce(intro, { type: "START" });
  assert.equal(logic.reduce(lighting, { type: "START" }), lighting);

  const malformed = [
    null,
    [],
    { type: "TRY_CANDLE", id: "Bad" },
    { type: "TRY_CANDLE", id: "rain", extra: true },
    { type: "START", extra: true },
    { type: "UNKNOWN" },
    Object.assign(Object.create(null), { type: "START" }),
  ];
  const getter = {};
  Object.defineProperty(getter, "type", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  malformed.push(getter);
  const symbol = { type: "START" };
  symbol[Symbol("extra")] = true;
  malformed.push(symbol);
  for (const action of malformed) assert.equal(logic.reduce(lighting, action), lighting);
});

test("late-changing Proxy descriptors are consumed exactly once", () => {
  let typeReads = 0;
  const action = new Proxy({ type: "START" }, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "type") {
        typeReads += 1;
        return {
          value: typeReads === 1 ? "START" : "RESTART",
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const state = logic.reduce(logic.createInitialState(config), action);
  assert.equal(state.phase, "lighting");
  assert.equal(typeReads, 1);

  let idReads = 0;
  const candleAction = new Proxy({ type: "TRY_CANDLE", id: "rain" }, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "id") {
        idReads += 1;
        return {
          value: idReads === 1 ? "rain" : "home",
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const lit = logic.reduce(state, candleAction);
  assert.deepEqual(lit.litIds, ["rain"]);
  assert.equal(idReads, 1);

  let phaseReads = 0;
  let ordinaryGets = 0;
  const intro = clone(logic.createInitialState(config));
  const stateProxy = new Proxy(intro, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "phase") {
        phaseReads += 1;
        return {
          value: phaseReads === 1 ? "intro" : "complete",
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() {
      ordinaryGets += 1;
      throw new Error("ordinary get must not run");
    },
  });
  assert.equal(logic.reduce(stateProxy, { type: "START" }).phase, "lighting");
  assert.equal(phaseReads, 1);
  assert.equal(ordinaryGets, 0);
});

test("nested config and state descriptors are consumed exactly once", () => {
  const candidate = customConfig({ recipient: "快照收信人" });
  const firstItemTarget = candidate.candles[0];
  let itemLabelReads = 0;
  const firstItem = new Proxy(firstItemTarget, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "label") {
        itemLabelReads += 1;
        return {
          value: itemLabelReads === 1 ? firstItemTarget.label : "第二次读取",
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const candleArrayTarget = candidate.candles;
  candleArrayTarget[0] = firstItem;
  let firstIndexReads = 0;
  const candleArray = new Proxy(candleArrayTarget, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "0") {
        firstIndexReads += 1;
        return {
          value: firstIndexReads === 1 ? firstItem : target[1],
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  candidate.candles = candleArray;
  let candlesReads = 0;
  const configProxy = new Proxy(candidate, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "candles") {
        candlesReads += 1;
        return {
          value: candlesReads === 1 ? candleArray : [],
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const safe = logic.sanitizeConfig(configProxy);
  assert.equal(safe.recipient, "快照收信人");
  assert.equal(safe.candles[0].label, config.candles[0].label);
  assert.deepEqual([candlesReads, firstIndexReads, itemLabelReads], [1, 1, 1]);

  const stateTarget = clone(logic.reduce(
    logic.reduce(logic.createInitialState(config), { type: "START" }),
    { type: "TRY_CANDLE", id: "rain" },
  ));
  const litIdsTarget = stateTarget.litIds;
  let litIndexReads = 0;
  const litIds = new Proxy(litIdsTarget, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "0") {
        litIndexReads += 1;
        return {
          value: litIndexReads === 1 ? "rain" : "home",
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  stateTarget.litIds = litIds;
  let contentReads = 0;
  let litIdsReads = 0;
  const stateProxy = new Proxy(stateTarget, {
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === "content") contentReads += 1;
      if (key === "litIds") litIdsReads += 1;
      if (key === "content" && contentReads > 1) {
        return {
          value: null,
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      if (key === "litIds" && litIdsReads > 1) {
        return {
          value: [],
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const next = logic.reduce(stateProxy, { type: "TRY_CANDLE", id: "noodle" });
  assert.deepEqual([next.phase, next.cursor, next.revision], ["lighting", 2, 3]);
  assert.deepEqual(next.litIds, ["rain", "noodle"]);
  assert.deepEqual([contentReads, litIdsReads, litIndexReads], [1, 1, 1]);
});

test("malformed state snapshots reset to a new default intro without partial repair", () => {
  const good = logic.reduce(logic.createInitialState(config), { type: "START" });
  const malformed = [
    { ...clone(good), extra: true },
    { ...clone(good), phase: "unknown" },
    { ...clone(good), cursor: 2 },
    { ...clone(good), litIds: ["rain"] },
    { ...clone(good), revision: -1 },
    { ...clone(good), content: { ...clone(good.content), extra: true } },
  ];
  for (const state of malformed) {
    const reset = logic.reduce(state, { type: "TRY_CANDLE", id: "rain" });
    assert.deepEqual(reset, logic.createInitialState());
    assert.notEqual(reset, state);
    assert.equal(reset.content, logic.DEFAULT_CONFIG);
  }
  const trapped = new Proxy(good, {
    getPrototypeOf() {
      throw new Error("hostile");
    },
  });
  assert.deepEqual(logic.reduce(trapped, { type: "START" }), logic.createInitialState());
});

test("headroom boundaries reserve the whole current round and disable unsafe restart", () => {
  const maximum = logic.MAX_REVISION;
  const content = clone(logic.DEFAULT_CONFIG);
  const intro = {
    version: 1,
    phase: "intro",
    content,
    litIds: [],
    cursor: 0,
    revision: maximum - 7,
  };
  let state = logic.reduce(intro, { type: "START" });
  assert.equal(state.revision, maximum - 6);
  for (let index = 0; index < 5; index += 1) {
    state = logic.reduce(state, { type: "TRY_CANDLE", id: content.candles[index].id });
  }
  state = logic.reduce(state, { type: "REVEAL" });
  assert.deepEqual([state.phase, state.revision], ["complete", maximum]);
  assert.equal(logic.getPublicView(state).primaryAction.disabled, true);
  assert.equal(logic.reduce(state, { type: "RESTART" }), state);

  const complete = runRoute(config, true);
  const restartable = { ...clone(complete), revision: maximum - 8 };
  const restarted = logic.reduce(restartable, { type: "RESTART" });
  assert.deepEqual([restarted.phase, restarted.revision], ["intro", maximum - 7]);
  let next = logic.reduce(restarted, { type: "START" });
  for (const candle of config.candles) {
    next = logic.reduce(next, { type: "TRY_CANDLE", id: candle.id });
  }
  next = logic.reduce(next, { type: "REVEAL" });
  assert.equal(next.revision, maximum);

  const invalidHeadrooms = [
    { ...clone(logic.createInitialState()), revision: maximum - 6 },
    {
      ...clone(logic.reduce(logic.createInitialState(), { type: "START" })),
      revision: maximum - 5,
    },
    { ...clone(runRoute()), revision: maximum },
  ];
  for (const invalid of invalidHeadrooms) {
    assert.deepEqual(logic.reduce(invalid, { type: "START" }), logic.createInitialState());
  }

  for (let cursor = 0; cursor < 5; cursor += 1) {
    const boundary = {
      version: 1,
      phase: "lighting",
      content: clone(logic.DEFAULT_CONFIG),
      litIds: config.candles.slice(0, cursor).map((item) => item.id),
      cursor,
      revision: maximum - (6 - cursor),
    };
    let remaining = boundary;
    for (let index = cursor; index < 5; index += 1) {
      remaining = logic.reduce(remaining, {
        type: "TRY_CANDLE",
        id: config.candles[index].id,
      });
    }
    remaining = logic.reduce(remaining, { type: "REVEAL" });
    assert.deepEqual([remaining.phase, remaining.revision], ["complete", maximum]);
  }

  const readyBoundary = {
    version: 1,
    phase: "ready-to-receive",
    content: clone(logic.DEFAULT_CONFIG),
    litIds: config.candles.map((item) => item.id),
    cursor: 5,
    revision: maximum - 1,
  };
  assert.deepEqual(
    [logic.reduce(readyBoundary, { type: "REVEAL" }).phase,
      logic.reduce(readyBoundary, { type: "REVEAL" }).revision],
    ["complete", maximum],
  );
});

test("all 120 route permutations obey their own route while display mapping stays fixed", () => {
  const routes = permutations(clone(config.candles));
  assert.equal(routes.length, 120);
  for (const route of routes) {
    const candidate = customConfig({ candles: route });
    let state = logic.reduce(logic.createInitialState(candidate), { type: "START" });
    const firstView = logic.getPublicView(state);
    assert.deepEqual(firstView.candles.map((item) => item.id),
      [route[2].id, route[4].id, route[0].id, route[3].id, route[1].id]);
    for (let position = 0; position < route.length; position += 1) {
      const wrong = route[(position + 1) % route.length].id;
      if (wrong !== route[position].id) {
        assert.equal(logic.reduce(state, { type: "TRY_CANDLE", id: wrong }), state);
      }
      state = logic.reduce(state, { type: "TRY_CANDLE", id: route[position].id });
      assert.equal(state.cursor, position + 1);
    }
    assert.equal(state.phase, "ready-to-receive");
  }
});

test("golden replay accepts semantic no-ops and is deterministic across clones and JSON", () => {
  const actions = [
    { type: "START" },
    { type: "TRY_CANDLE", id: "home" },
    { type: "TRY_CANDLE", id: "rain" },
    { type: "TRY_CANDLE", id: "noodle" },
    { type: "TRY_CANDLE", id: "journey" },
    { type: "TRY_CANDLE", id: "quiet" },
    { type: "TRY_CANDLE", id: "home" },
    { type: "REVEAL" },
    { type: "RESTART" },
  ];
  const expected = {
    version: 1,
    phase: "intro",
    content: clone(logic.DEFAULT_CONFIG),
    litIds: [],
    cursor: 0,
    revision: 8,
  };
  assert.deepEqual(logic.replaySession(config, actions), expected);
  assert.deepEqual(logic.replaySession(clone(config), clone(actions)), expected);
  assert.deepEqual(logic.replaySession(
    JSON.parse(JSON.stringify(config)),
    JSON.parse(JSON.stringify(actions)),
  ), expected);
});

test("JSON-cloned state continues safely from every phase", () => {
  const intro = clone(logic.createInitialState(config));
  const lighting = logic.reduce(intro, { type: "START" });
  assert.equal(lighting.phase, "lighting");

  const lightingClone = clone(lighting);
  const firstLit = logic.reduce(lightingClone, { type: "TRY_CANDLE", id: "rain" });
  assert.deepEqual([firstLit.phase, firstLit.cursor], ["lighting", 1]);

  const ready = clone(runRoute());
  const complete = logic.reduce(ready, { type: "REVEAL" });
  assert.equal(complete.phase, "complete");

  const completeClone = clone(complete);
  const restarted = logic.reduce(completeClone, { type: "RESTART" });
  assert.deepEqual([restarted.phase, restarted.cursor, restarted.revision], ["intro", 0, 8]);
  assertDeepFrozen(restarted);
});

test("replay rejects malformed arrays and action schemas instead of skipping them", () => {
  const invalidLogs = [
    [{ type: "TRY_CANDLE", id: "Bad" }],
    [{ type: "START", extra: true }],
    [{ type: "UNKNOWN" }],
    Array(1),
  ];
  const customIterator = [{ type: "START" }];
  customIterator[Symbol.iterator] = function* iterator() {};
  invalidLogs.push(customIterator);
  const subclass = class Log extends Array {};
  invalidLogs.push(new subclass({ type: "START" }));
  for (const actions of invalidLogs) assert.equal(logic.replaySession(config, actions), null);

  const getter = {};
  Object.defineProperty(getter, "type", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.equal(logic.replaySession(config, [getter]), null);
});

test("public views have exact phase keys, fixed display order, and prefix-only wishes", () => {
  const intro = logic.getPublicView(logic.createInitialState(config));
  exactKeys(intro, [
    "phase", "publicTitle", "instructions", "privacyText", "progressText", "primaryAction",
  ]);
  assert.deepEqual(intro.primaryAction, {
    visible: true,
    label: "开始点亮",
    action: "START",
    disabled: false,
  });

  let state = logic.reduce(logic.createInitialState(config), { type: "START" });
  let lighting = logic.getPublicView(state);
  exactKeys(lighting, [
    "phase", "publicTitle", "instructions", "privacyText", "progressText",
    "currentCue", "candles", "revealedWishes", "primaryAction",
  ]);
  assert.equal(lighting.currentCue, config.candles[0].cue);
  assert.deepEqual(lighting.candles.map((item) => item.id),
    ["journey", "home", "rain", "quiet", "noodle"]);
  for (const candle of lighting.candles) {
    exactKeys(candle, ["id", "label", "lit", "disabled"]);
  }
  exactKeys(lighting.primaryAction, ["visible", "label", "action", "disabled"]);
  assert.deepEqual(lighting.revealedWishes, []);
  state = logic.reduce(state, { type: "TRY_CANDLE", id: "rain" });
  lighting = logic.getPublicView(state);
  assert.deepEqual(lighting.revealedWishes, [{
    label: config.candles[0].label,
    wish: config.candles[0].wish,
  }]);
  exactKeys(lighting.revealedWishes[0], ["label", "wish"]);
  assert.equal(lighting.candles.find((item) => item.id === "rain").disabled, true);

  const ready = logic.getPublicView(runRoute());
  exactKeys(ready, [
    "phase", "publicTitle", "instructions", "privacyText", "progressText",
    "candles", "revealedWishes", "primaryAction",
  ]);
  assert.equal(ready.revealedWishes.length, 5);
  assert.equal(ready.candles.every((item) => item.lit && item.disabled), true);
  for (const candle of ready.candles) {
    exactKeys(candle, ["id", "label", "lit", "disabled"]);
  }
  for (const wish of ready.revealedWishes) exactKeys(wish, ["label", "wish"]);
  assert.deepEqual(ready.primaryAction, {
    visible: true,
    label: "收下这些愿望",
    action: "REVEAL",
    disabled: false,
  });

  const complete = logic.getPublicView(runRoute(config, true));
  exactKeys(complete, [
    "phase", "publicTitle", "instructions", "privacyText", "progressText",
    "candles", "revealedWishes", "result", "primaryAction",
  ]);
  exactKeys(complete.result, ["recipientLine", "title", "message", "signature"]);
  exactKeys(complete.primaryAction, ["visible", "label", "action", "disabled"]);
  assert.deepEqual(complete.result, {
    recipientLine: "给你",
    title: config.finalTitle,
    message: config.finalMessage,
    signature: config.signature,
  });
  assertDeepFrozen(intro);
  assertDeepFrozen(lighting);
  assertDeepFrozen(ready);
  assertDeepFrozen(complete);
});

test("phase privacy sentinel forbids future cue, wish, and final text until authorized", () => {
  const sentinel = customConfig({
    recipient: "收信人-R7",
    finalTitle: "终章标题-T9",
    finalMessage: "终章留言-M8",
    signature: "署名-S6",
    candles: clone(config.candles).map((candle, index) => ({
      id: candle.id,
      label: `标签${index}-L`,
      cue: `这是第${index}条私密线索-C`,
      wish: `这是只在点亮以后公开的第${index}条愿望-W`,
    })),
  });
  let state = logic.createInitialState(sentinel);
  const introJson = JSON.stringify(logic.getPublicView(state));
  for (const value of [
    sentinel.recipient, sentinel.finalTitle, sentinel.finalMessage, sentinel.signature,
    ...sentinel.candles.flatMap((item) => [item.id, item.label, item.cue, item.wish]),
  ]) assert.equal(introJson.includes(value), false, value);

  state = logic.reduce(state, { type: "START" });
  for (let cursor = 0; cursor < 5; cursor += 1) {
    const json = JSON.stringify(logic.getPublicView(state));
    assert.equal(json.includes(sentinel.candles[cursor].cue), true);
    for (let future = cursor + 1; future < 5; future += 1) {
      assert.equal(json.includes(sentinel.candles[future].cue), false);
      assert.equal(json.includes(sentinel.candles[future].wish), false);
    }
    for (const finalValue of [
      sentinel.recipient, sentinel.finalTitle, sentinel.finalMessage, sentinel.signature,
    ]) assert.equal(json.includes(finalValue), false);
    state = logic.reduce(state, { type: "TRY_CANDLE", id: sentinel.candles[cursor].id });
  }
  const readyJson = JSON.stringify(logic.getPublicView(state));
  for (const finalValue of [
    sentinel.recipient, sentinel.finalTitle, sentinel.finalMessage, sentinel.signature,
  ]) assert.equal(readyJson.includes(finalValue), false);
  state = logic.reduce(state, { type: "REVEAL" });
  const completeJson = JSON.stringify(logic.getPublicView(state));
  for (const finalValue of [
    sentinel.recipient, sentinel.finalTitle, sentinel.finalMessage, sentinel.signature,
  ]) assert.equal(completeJson.includes(finalValue), true);
});

test("public views are disconnected and never expose internal route metadata", () => {
  const state = logic.reduce(logic.createInitialState(config), { type: "START" });
  const view = logic.getPublicView(state);
  assert.notEqual(view.candles, state.content.candles);
  assert.notEqual(view.candles[0], state.content.candles[2]);
  const json = JSON.stringify(view);
  for (const key of ["routeIndex", "displayIndex", "target", "content", "revision", "cursor"]) {
    assert.equal(json.includes(`"${key}"`), false);
  }
  assert.equal(logic.getPublicView({ ...clone(state), extra: true }), null);
});

test("production logic has no browser, clock, randomness, persistence, network, or sink dependency", () => {
  const source = fs.readFileSync(path.join(__dirname, "logic.js"), "utf8");
  for (const pattern of [
    /\bdocument\b/, /\bCanvasRenderingContext2D\b/, /\bDate\b/, /\bMath\.random\b/,
    /\bsetTimeout\b/, /\bsetInterval\b/, /\brequestAnimationFrame\b/,
    /\blocalStorage\b/, /\bsessionStorage\b/, /\bfetch\b/, /\bXMLHttpRequest\b/,
    /\bnavigator\b/, /\bAudio\b/, /\bpermissions\b/, /\binnerHTML\b/,
    /\binsertAdjacentHTML\b/,
  ]) assert.equal(pattern.test(source), false, String(pattern));

  const context = vm.createContext({});
  vm.runInContext(`
    for (const key of [
      "document", "CanvasRenderingContext2D", "Date", "performance", "setTimeout",
      "setInterval", "queueMicrotask", "localStorage", "sessionStorage", "fetch",
      "XMLHttpRequest", "navigator", "Audio"
    ]) Object.defineProperty(globalThis, key, {
      get() { throw new Error("forbidden " + key); }
    });
    Object.defineProperty(Math, "random", {
      get() { throw new Error("forbidden random"); }
    });
  `, context);
  assert.doesNotThrow(() => vm.runInContext(source, context));
});
