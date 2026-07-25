import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";

await import("./config.js");
await import("./logic.js");

const config = globalThis.FLOWER_LANGUAGE_BOUQUET_CONFIG;
const logic = globalThis.FLOWER_LANGUAGE_BOUQUET_LOGIC;
const content = logic.sanitizeConfig(config);
const goldenIds = ["rose", "sunflower", "gypsophila"];

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

function makeState(phase, selectedIds, revision = 0, stateContent = content) {
  return {
    version: 1,
    phase,
    content: phase === "intro" ? null : stateContent,
    selectedIds,
    revision,
  };
}

function runToPhase(phase = "complete", ids = goldenIds, rawConfig = config) {
  let state = logic.createInitialState();
  if (phase === "intro") return state;
  state = logic.reduce(state, logic.createStartAction(rawConfig));
  if (phase === "arranging") return state;
  for (const flowerId of ids) state = logic.reduce(state, { type: "ADD_FLOWER", flowerId });
  if (phase === "preview") return state;
  return logic.reduce(state, { type: "TIE_BOUQUET" });
}

function customConfig(overrides = {}) {
  return {
    recipient: overrides.recipient ?? config.recipient,
    sender: overrides.sender ?? config.sender,
    finalTitle: overrides.finalTitle ?? config.finalTitle,
    finalNote: overrides.finalNote ?? config.finalNote,
    flowers: overrides.flowers ?? config.flowers.map((flower) => ({ ...flower })),
  };
}

function sentinelConfig() {
  const names = ["花-A1", "花-B2", "花-C3", "花-D4", "花-E5", "花-F6"];
  const meanings = ["意-A7", "意-B8", "意-C9", "意-D0", "意-E1", "意-F2"];
  return customConfig({
    recipient: "收件-R3",
    sender: "署名-S4",
    finalTitle: "标题-T5",
    finalNote: "留言-N6",
    flowers: logic.FLOWER_IDS.map((id, index) => ({ id, name: names[index], meaning: meanings[index] })),
  });
}

test("classic browser global and CommonJS exports share the same frozen API", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const browserContext = vm.createContext({});
  vm.runInContext(source, browserContext);
  assert.equal(typeof browserContext.FLOWER_LANGUAGE_BOUQUET_LOGIC.reduce, "function");

  const commonJsContext = vm.createContext({ module: { exports: {} } });
  vm.runInContext(source, commonJsContext);
  assert.equal(commonJsContext.module.exports, commonJsContext.FLOWER_LANGUAGE_BOUQUET_LOGIC);
  assert.equal(Object.isFrozen(commonJsContext.module.exports), true);
});

test("module initialization never touches forbidden host, time, random, storage, or network APIs", () => {
  const source = fs.readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(`
    for (const key of [
      "document", "SVGElement", "CanvasRenderingContext2D", "Blob", "URL", "XMLSerializer",
      "crypto", "Date", "performance", "setTimeout", "setInterval", "queueMicrotask",
      "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "navigator"
    ]) Object.defineProperty(globalThis, key, { get() { throw new Error("forbidden " + key); } });
    Object.defineProperty(Math, "random", { get() { throw new Error("forbidden random"); } });
  `, context);
  assert.doesNotThrow(() => vm.runInContext(source, context));
});

test("all frozen constants and canonical hashes match the specification", () => {
  assert.deepEqual({
    VERSION: logic.VERSION,
    FLOWER_COUNT: logic.FLOWER_COUNT,
    REQUIRED_SELECTIONS: logic.REQUIRED_SELECTIONS,
    EXPORT_FILENAME: logic.EXPORT_FILENAME,
    EXPORT_MIME_TYPE: logic.EXPORT_MIME_TYPE,
    EXPORT_WIDTH: logic.EXPORT_WIDTH,
    EXPORT_HEIGHT: logic.EXPORT_HEIGHT,
    EXPORT_VIEW_BOX: logic.EXPORT_VIEW_BOX,
    EXPORT_TEXT_X: logic.EXPORT_TEXT_X,
    EXPORT_TEXT_START_Y: logic.EXPORT_TEXT_START_Y,
    EXPORT_TEXT_MAX_BASELINE_Y: logic.EXPORT_TEXT_MAX_BASELINE_Y,
    EXPORT_WRAP_CODE_POINTS: logic.EXPORT_WRAP_CODE_POINTS,
    EXPORT_BLOCK_GAP: logic.EXPORT_BLOCK_GAP,
    EXPORT_TITLE_FONT_SIZE: logic.EXPORT_TITLE_FONT_SIZE,
    EXPORT_TITLE_LINE_HEIGHT: logic.EXPORT_TITLE_LINE_HEIGHT,
    EXPORT_BODY_FONT_SIZE: logic.EXPORT_BODY_FONT_SIZE,
    EXPORT_BODY_LINE_HEIGHT: logic.EXPORT_BODY_LINE_HEIGHT,
    MAX_EXPORT_LINES: logic.MAX_EXPORT_LINES,
    MAX_REVISION: logic.MAX_REVISION,
  }, {
    VERSION: 1, FLOWER_COUNT: 6, REQUIRED_SELECTIONS: 3,
    EXPORT_FILENAME: "flower-language-bouquet.svg",
    EXPORT_MIME_TYPE: "image/svg+xml;charset=utf-8",
    EXPORT_WIDTH: 1000, EXPORT_HEIGHT: 1800, EXPORT_VIEW_BOX: "0 0 1000 1800",
    EXPORT_TEXT_X: 80, EXPORT_TEXT_START_Y: 920, EXPORT_TEXT_MAX_BASELINE_Y: 1720,
    EXPORT_WRAP_CODE_POINTS: 22, EXPORT_BLOCK_GAP: 24,
    EXPORT_TITLE_FONT_SIZE: 30, EXPORT_TITLE_LINE_HEIGHT: 40,
    EXPORT_BODY_FONT_SIZE: 22, EXPORT_BODY_LINE_HEIGHT: 32,
    MAX_EXPORT_LINES: 22, MAX_REVISION: Number.MAX_SAFE_INTEGER,
  });
  assert.deepEqual(logic.ROLE_IDS, ["main", "companion", "accent"]);
  assert.deepEqual(logic.ROLE_LABELS, ["主花", "陪花", "点缀"]);
  assert.deepEqual(logic.FLOWER_IDS,
    ["rose", "tulip", "daisy", "sunflower", "lisianthus", "gypsophila"]);
  assert.equal(hash(content.flowers), "ef6599362c88e73a8e8105b5faa3048c4148edacb31c7073701df8ede95dc1b6");
  assert.equal(hash(content), "93e0bc7d5b783460e37f9a05d5401c45935d3198731d6730499de8aed7696b91");
  assert.equal(hash(logic.ROLE_SLOTS), "0dae830137e3146444aea52e2b9636e16a3eef64deca6dd51c36fb2d404fbd87");
  assertDeepFrozen(logic);
});

test("config.js default runs unedited and sanitization returns detached recursively frozen content", () => {
  const candidate = customConfig();
  const safe = logic.sanitizeConfig(candidate);
  candidate.recipient = "外部修改";
  candidate.flowers[0].name = "外部修改";
  assert.equal(safe.recipient, config.recipient);
  assert.equal(safe.flowers[0].name, "玫瑰");
  assert.notEqual(safe, candidate);
  assert.notEqual(safe.flowers, candidate.flowers);
  assertDeepFrozen(safe);
});

test("valid proxy config is accepted using reflection once and never invokes ordinary get", () => {
  const calls = { prototype: 0, keys: 0, descriptors: 0, get: 0 };
  const candidate = customConfig();
  const proxy = new Proxy(candidate, {
    getPrototypeOf(target) { calls.prototype += 1; return Reflect.getPrototypeOf(target); },
    ownKeys(target) { calls.keys += 1; return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      calls.descriptors += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() { calls.get += 1; throw new Error("ordinary get must not run"); },
  });
  assert.deepEqual(logic.sanitizeConfig(proxy), content);
  assert.deepEqual(calls, { prototype: 1, keys: 1, descriptors: 5, get: 0 });
});

test("hostile object schemas cause whole-config fallback without getter execution", () => {
  let getterCalls = 0;
  const accessor = customConfig();
  Object.defineProperty(accessor, "recipient", {
    enumerable: true,
    get() { getterCalls += 1; return "不应读取"; },
  });
  const symbol = customConfig();
  symbol[Symbol("extra")] = true;
  const extra = { ...customConfig(), extra: true };
  const nullPrototype = Object.assign(Object.create(null), customConfig());
  const customPrototype = Object.assign(Object.create({}), customConfig());
  const trapNames = ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"];
  const hostile = trapNames.map((trapName) => new Proxy(customConfig(), {
    [trapName]() { throw new Error(trapName); },
  }));
  for (const candidate of [accessor, symbol, extra, nullPrototype, customPrototype, ...hostile]) {
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG);
  }
  assert.equal(getterCalls, 0);
});

test("hostile flower arrays, entries, sparse data, iterators, and array subclasses fall back as a whole", () => {
  const cases = [];
  cases.push(customConfig({ flowers: config.flowers.slice(0, 5) }));
  const sparse = config.flowers.map((flower) => ({ ...flower }));
  delete sparse[2];
  cases.push(customConfig({ flowers: sparse }));
  const extra = config.flowers.map((flower) => ({ ...flower }));
  extra.extra = true;
  cases.push(customConfig({ flowers: extra }));
  const iterator = config.flowers.map((flower) => ({ ...flower }));
  iterator[Symbol.iterator] = function* iteratorOverride() {};
  cases.push(customConfig({ flowers: iterator }));
  const map = config.flowers.map((flower) => ({ ...flower }));
  map.map = () => [];
  cases.push(customConfig({ flowers: map }));
  class FlowerArray extends Array {}
  cases.push(customConfig({ flowers: new FlowerArray(...config.flowers.map((flower) => ({ ...flower }))) }));
  const wrongEntryPrototype = config.flowers.map((flower) => ({ ...flower }));
  wrongEntryPrototype[0] = Object.assign(Object.create(null), wrongEntryPrototype[0]);
  cases.push(customConfig({ flowers: wrongEntryPrototype }));
  const entryExtra = config.flowers.map((flower) => ({ ...flower }));
  entryExtra[0].extra = true;
  cases.push(customConfig({ flowers: entryExtra }));
  const duplicateName = config.flowers.map((flower) => ({ ...flower }));
  duplicateName[1].name = duplicateName[0].name;
  cases.push(customConfig({ flowers: duplicateName }));
  const wrongOrder = config.flowers.map((flower) => ({ ...flower })).reverse();
  cases.push(customConfig({ flowers: wrongOrder }));
  for (const candidate of cases) assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG);
});

test("nested descriptor traps and revoked array proxies safely fall back", () => {
  const flowersWithTrap = config.flowers.map((flower) => ({ ...flower }));
  flowersWithTrap[2] = new Proxy(flowersWithTrap[2], {
    getOwnPropertyDescriptor() { throw new Error("descriptor"); },
  });
  assert.equal(logic.sanitizeConfig(customConfig({ flowers: flowersWithTrap })), logic.DEFAULT_CONFIG);
  const revocable = Proxy.revocable(config.flowers.map((flower) => ({ ...flower })), {});
  revocable.revoke();
  assert.equal(logic.sanitizeConfig(customConfig({ flowers: revocable.proxy })), logic.DEFAULT_CONFIG);

  let getterCalls = 0;
  const accessorArray = config.flowers.map((flower) => ({ ...flower }));
  Object.defineProperty(accessorArray, "0", {
    enumerable: true,
    configurable: true,
    get() { getterCalls += 1; return config.flowers[0]; },
  });
  assert.equal(logic.sanitizeConfig(customConfig({ flowers: accessorArray })), logic.DEFAULT_CONFIG);
  assert.equal(getterCalls, 0);
});

test("text validation follows surrogate, control, trim, line, length, and whole-fallback rules", () => {
  const trimmed = customConfig({
    recipient: "  给你  ", sender: "  是我  ", finalTitle: "  一束花  ",
    finalNote: "  第一行  \n  第二行  ",
  });
  const safe = logic.sanitizeConfig(trimmed);
  assert.equal(safe.recipient, "给你");
  assert.equal(safe.sender, "是我");
  assert.equal(safe.finalTitle, "一束花");
  assert.equal(safe.finalNote, "第一行\n第二行");

  const invalidOverrides = [
    { recipient: "同", sender: "同" },
    { recipient: "收".repeat(13) },
    { sender: "署".repeat(13) },
    { finalTitle: "题" },
    { finalTitle: "题".repeat(41) },
    { finalNote: "" },
    { finalNote: "一\n\n三" },
    { finalNote: "一\n二\n三\n四" },
    { finalNote: "言".repeat(161) },
    { recipient: "坏\ud800" },
    { finalNote: "坏\udc00" },
    { recipient: "换\n行" },
    { finalNote: "回\r车" },
    { finalTitle: "分\u2028隔" },
    { finalNote: "分\u2029隔" },
    { recipient: "控\u0000制" },
    { sender: "控\u007f制" },
    { finalNote: "控\u0085制" },
  ];
  for (const overrides of invalidOverrides) {
    assert.equal(logic.sanitizeConfig(customConfig(overrides)), logic.DEFAULT_CONFIG);
  }
  const validEmoji = logic.sanitizeConfig(customConfig({ recipient: "😀".repeat(12), sender: "伴侣" }));
  assert.equal(validEmoji.recipient, "😀".repeat(12));
});

test("one invalid flower field rejects the entire candidate instead of mixing defaults", () => {
  const flowers = config.flowers.map((flower) => ({ ...flower }));
  flowers[0].name = "私人玫瑰";
  flowers[1].meaning = " ";
  const safe = logic.sanitizeConfig(customConfig({ recipient: "私人称呼", flowers }));
  assert.equal(safe, logic.DEFAULT_CONFIG);
  assert.equal(safe.recipient, config.recipient);
  assert.equal(safe.flowers[0].name, "玫瑰");
});

test("createStartAction is the only fallback entry and returns exact detached frozen content", () => {
  const fallback = logic.createStartAction({ invalid: true });
  assert.deepEqual(Object.keys(fallback), ["type", "content"]);
  assert.equal(fallback.type, "START");
  assert.deepEqual(fallback.content, logic.DEFAULT_CONFIG);
  assert.notEqual(fallback.content, logic.DEFAULT_CONFIG);
  assertDeepFrozen(fallback);

  const privateConfig = customConfig({ recipient: "给某人" });
  const action = logic.createStartAction(privateConfig);
  privateConfig.recipient = "外部修改";
  assert.equal(action.content.recipient, "给某人");
});

test("initial state is canonical, deeply frozen, and a new reference every time", () => {
  const first = logic.createInitialState();
  const second = logic.createInitialState();
  assert.deepEqual(first, { version: 1, phase: "intro", content: null, selectedIds: [], revision: 0 });
  assert.notEqual(first, second);
  assert.notEqual(first.selectedIds, second.selectedIds);
  assertDeepFrozen(first);
});

test("all five exact actions implement the frozen ordered transaction", () => {
  const startAction = logic.createStartAction(config);
  let state = logic.reduce(logic.createInitialState(), startAction);
  assert.deepEqual([state.phase, state.selectedIds, state.revision], ["arranging", [], 1]);
  state = logic.reduce(state, { type: "ADD_FLOWER", flowerId: "sunflower" });
  state = logic.reduce(state, { type: "ADD_FLOWER", flowerId: "rose" });
  assert.deepEqual([state.phase, state.selectedIds, state.revision],
    ["arranging", ["sunflower", "rose"], 3]);
  state = logic.reduce(state, { type: "UNDO_LAST" });
  assert.deepEqual([state.phase, state.selectedIds, state.revision],
    ["arranging", ["sunflower"], 4]);
  state = logic.reduce(state, { type: "ADD_FLOWER", flowerId: "gypsophila" });
  state = logic.reduce(state, { type: "ADD_FLOWER", flowerId: "daisy" });
  assert.equal(state.phase, "preview");
  state = logic.reduce(state, { type: "TIE_BOUQUET" });
  assert.equal(state.phase, "complete");
  const revision = state.revision;
  state = logic.reduce(state, { type: "RESTART" });
  assert.deepEqual(state, {
    version: 1, phase: "intro", content: null, selectedIds: [], revision: revision + 1,
  });
  assertDeepFrozen(state);
});

test("invalid action schema, values, accessors, symbols, and prototypes preserve caller state identity", () => {
  const state = runToPhase("arranging");
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "type", { get() { getterCalls += 1; return "UNDO_LAST"; } });
  const symbol = { type: "UNDO_LAST", [Symbol("extra")]: true };
  const badPrototype = Object.assign(Object.create(null), { type: "UNDO_LAST" });
  const invalid = [
    null, {}, { type: 1 }, { type: "UNKNOWN" }, { type: "UNDO_LAST", extra: true },
    { type: "ADD_FLOWER" }, { type: "ADD_FLOWER", flowerId: "orchid" },
    { type: "ADD_FLOWER", flowerId: new String("rose") },
    { type: "START" }, { type: "START", content: { invalid: true } },
    accessor, symbol, badPrototype,
    new Proxy({ type: "UNDO_LAST" }, { ownKeys() { throw new Error("trap"); } }),
  ];
  for (const action of invalid) assert.equal(logic.reduce(state, action), state);
  assert.equal(getterCalls, 0);
});

test("valid state and action proxies use descriptor snapshots without ordinary property reads", () => {
  const baseState = runToPhase("arranging");
  const stateCalls = { prototype: 0, keys: 0, descriptors: 0, get: 0 };
  const stateProxy = new Proxy(baseState, {
    getPrototypeOf(target) { stateCalls.prototype += 1; return Reflect.getPrototypeOf(target); },
    ownKeys(target) { stateCalls.keys += 1; return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      stateCalls.descriptors += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() { stateCalls.get += 1; throw new Error("state ordinary get must not run"); },
  });
  const actionCalls = { prototype: 0, keys: 0, descriptors: 0, get: 0 };
  const actionTarget = { type: "ADD_FLOWER", flowerId: "rose" };
  const actionProxy = new Proxy(actionTarget, {
    getPrototypeOf(target) { actionCalls.prototype += 1; return Reflect.getPrototypeOf(target); },
    ownKeys(target) { actionCalls.keys += 1; return Reflect.ownKeys(target); },
    getOwnPropertyDescriptor(target, key) {
      actionCalls.descriptors += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
    get() { actionCalls.get += 1; throw new Error("action ordinary get must not run"); },
  });
  const result = logic.reduce(stateProxy, actionProxy);
  assert.deepEqual(result.selectedIds, ["rose"]);
  assert.deepEqual(stateCalls, { prototype: 1, keys: 1, descriptors: 5, get: 0 });
  assert.deepEqual(actionCalls, { prototype: 1, keys: 1, descriptors: 2, get: 0 });
});

test("START reducer is strict and never performs config fallback", () => {
  const initial = logic.createInitialState();
  assert.equal(logic.reduce(initial, { type: "START", content: { bad: true } }), initial);
  const fallbackAction = logic.createStartAction({ bad: true });
  assert.equal(logic.reduce(initial, fallbackAction).phase, "arranging");
});

test("invalid state returns one fresh canonical initial state without reading action", () => {
  const invalidStates = [
    null,
    {},
    { ...makeState("intro", []), extra: true },
    makeState("intro", ["rose"]),
    makeState("arranging", [], 0, null),
    makeState("arranging", ["rose", "rose"]),
    makeState("preview", ["rose", "tulip"]),
    makeState("complete", goldenIds, Number.MAX_SAFE_INTEGER + 1),
    Object.assign(Object.create(null), makeState("intro", [])),
  ];
  for (const invalidState of invalidStates) {
    const unreadableAction = new Proxy({}, {
      getPrototypeOf() { throw new Error("action must not be read"); },
    });
    const result = logic.reduce(invalidState, unreadableAction);
    assert.deepEqual(result, logic.createInitialState());
    assert.notEqual(result, logic.createInitialState());
    assertDeepFrozen(result);
  }
});

test("state and selectedIds reject accessors, sparse arrays, extras, custom methods, and proxy traps", () => {
  let getterCalls = 0;
  const accessorState = makeState("arranging", []);
  Object.defineProperty(accessorState, "phase", {
    enumerable: true,
    get() { getterCalls += 1; return "arranging"; },
  });
  const sparseIds = ["rose", "tulip"];
  delete sparseIds[0];
  const extraIds = ["rose"];
  extraIds.extra = true;
  const iteratorIds = ["rose"];
  iteratorIds[Symbol.iterator] = function* iteratorOverride() {};
  const mapIds = ["rose"];
  mapIds.map = () => [];
  const trappedIds = new Proxy(["rose"], {
    getOwnPropertyDescriptor() { throw new Error("descriptor trap"); },
  });
  const invalidStates = [
    accessorState,
    makeState("arranging", sparseIds),
    makeState("arranging", extraIds),
    makeState("arranging", iteratorIds),
    makeState("arranging", mapIds),
    makeState("arranging", trappedIds),
  ];
  for (const state of invalidStates) {
    assert.deepEqual(logic.reduce(state, { type: "ADD_FLOWER", flowerId: "tulip" }),
      logic.createInitialState());
  }
  assert.equal(getterCalls, 0);
});

test("valid JSON-cloned states accept arbitrary unique selected order and remain deterministic", () => {
  const state = makeState("preview", ["gypsophila", "rose", "sunflower"], 4, clone(content));
  const complete = logic.reduce(clone(state), { type: "TIE_BOUQUET" });
  assert.equal(complete.phase, "complete");
  assert.deepEqual(complete.selectedIds, ["gypsophila", "rose", "sunflower"]);
  assert.equal(logic.getPublicView(clone(state)).phase, "preview");
});

test("revision phase/count headroom table rejects only out-of-contract incoming states", () => {
  const M = logic.MAX_REVISION;
  const boundaries = [
    ["intro", [], M - 5],
    ["arranging", [], M - 4],
    ["arranging", ["rose"], M - 3],
    ["arranging", ["rose", "tulip"], M - 2],
    ["preview", goldenIds, M - 1],
    ["complete", goldenIds, M],
  ];
  for (const [phase, ids, revision] of boundaries) {
    assert.equal(logic.getPublicView(makeState(phase, ids, revision)).phase, phase);
    assert.equal(logic.getPublicView(makeState(phase, ids, revision + 1)).phase, "intro");
  }
});

test("latest forward path reaches complete at MAX_REVISION without wrapping", () => {
  const M = logic.MAX_REVISION;
  let state = makeState("intro", [], M - 5);
  state = logic.reduce(state, logic.createStartAction(config));
  assert.deepEqual([state.phase, state.revision], ["arranging", M - 4]);
  for (const flowerId of goldenIds) state = logic.reduce(state, { type: "ADD_FLOWER", flowerId });
  assert.deepEqual([state.phase, state.revision], ["preview", M - 1]);
  state = logic.reduce(state, { type: "TIE_BOUQUET" });
  assert.deepEqual([state.phase, state.revision], ["complete", M]);
  assert.equal(logic.reduce(state, { type: "RESTART" }), state);
});

test("UNDO and RESTART use their additional headroom while forward completion remains available", () => {
  const M = logic.MAX_REVISION;
  const undoCases = [
    [makeState("arranging", ["rose"], M - 5), true],
    [makeState("arranging", ["rose"], M - 4), false],
    [makeState("arranging", ["rose", "tulip"], M - 4), true],
    [makeState("arranging", ["rose", "tulip"], M - 3), false],
    [makeState("preview", goldenIds, M - 3), true],
    [makeState("preview", goldenIds, M - 2), false],
  ];
  for (const [state, allowed] of undoCases) {
    const result = logic.reduce(state, { type: "UNDO_LAST" });
    assert.equal(result !== state, allowed);
    assert.equal(logic.getPublicView(state).canUndo, allowed);
  }
  const cannotUndoButCanAdd = makeState("arranging", ["rose"], M - 4);
  assert.equal(logic.reduce(cannotUndoButCanAdd, { type: "ADD_FLOWER", flowerId: "tulip" }).revision, M - 3);
  const cannotUndoButCanTie = makeState("preview", goldenIds, M - 2);
  assert.equal(logic.reduce(cannotUndoButCanTie, { type: "TIE_BOUQUET" }).phase, "complete");

  const restartAllowed = makeState("complete", goldenIds, M - 6);
  const restartDenied = makeState("complete", goldenIds, M - 5);
  assert.notEqual(logic.reduce(restartAllowed, { type: "RESTART" }), restartAllowed);
  assert.equal(logic.reduce(restartDenied, { type: "RESTART" }), restartDenied);
  assert.equal(logic.getPublicView(restartAllowed).canRestart, true);
  assert.equal(logic.getPublicView(restartDenied).canRestart, false);
});

test("canonical 120 permutations come only from the production generator and all are unique", () => {
  const permutations = logic.FLOWER_PERMUTATIONS;
  assert.equal(permutations.length, 120);
  assert.equal(hash(permutations), "1e7754c3c0094732cf8f86f811341926658deba4f753f14ba5c22bc6c11bb8ab");
  assert.deepEqual(permutations[0], ["rose", "tulip", "daisy"]);
  assert.deepEqual(permutations[119], ["gypsophila", "lisianthus", "sunflower"]);
  assert.equal(new Set(permutations.map((ids) => ids.join("/"))).size, 120);
  for (const ids of permutations) assert.equal(new Set(ids).size, 3);
  assert.deepEqual(logic.createFlowerPermutations(), permutations);
  assert.notEqual(logic.createFlowerPermutations(), permutations);
  assertDeepFrozen(permutations);
});

test("all 120 permutations are reachable by the five-action reducer", () => {
  for (const ids of logic.FLOWER_PERMUTATIONS) {
    const preview = runToPhase("preview", ids);
    assert.deepEqual(preview.selectedIds, ids);
    assert.equal(preview.phase, "preview");
    assert.equal(logic.reduce(preview, { type: "TIE_BOUQUET" }).phase, "complete");
  }
});

test("default and all 120 compositions match canonical hashes", () => {
  const golden = logic.composeBouquetMeaning(content, goldenIds);
  assert.equal(golden,
    "这束花先用「玫瑰」说“偏爱这件事，我一直很认真”，\n"
    + "再让「向日葵」接住“有你在的方向，总会更明亮”，\n"
    + "最后由「满天星」把“小小的好，都想和你慢慢攒起来”留给以后。");
  assert.equal(hash(golden), "bf8b3328d024cd86c36de88df4f6460311af8e1e4c57d8acb7b8b822d2f8a2f7");
  const all = logic.FLOWER_PERMUTATIONS.map((ids) => logic.composeBouquetMeaning(content, ids));
  assert.equal(hash(all), "bf183475d1ab000d4c5182c320b9d4777dd2dd9ed09cf408f0f390352a5ecb99");
  assert.equal(logic.composeBouquetMeaning(content, ["rose", "rose", "tulip"]), null);
  assert.equal(logic.composeBouquetMeaning(content, ["rose", "tulip"]), null);
  assert.equal(logic.composeBouquetMeaning({ bad: true }, goldenIds), null);
});

test("progressive scene uses exact slots and full scenes match canonical hashes", () => {
  assert.deepEqual(logic.buildBouquetScene([]), {
    version: 1, width: 1000, height: 1800, tieX: 500, tieY: 850, stems: [],
  });
  const progressive = logic.buildBouquetScene(["tulip", "rose"]);
  assert.equal(progressive.stems.length, 2);
  assert.deepEqual(progressive.stems.map((stem) => stem.role), ["main", "companion"]);
  assert.deepEqual(progressive.stems.map((stem) => stem.flowerId), ["tulip", "rose"]);
  assert.equal(progressive.stems[0].shapeKey, "tulip");
  assert.deepEqual(Object.keys(progressive.stems[0]), [
    "ordinal", "role", "flowerId", "shapeKey", "x", "y", "scaleMilli", "rotationDeg",
    "stemEndX", "stemEndY",
  ]);
  const golden = logic.buildBouquetScene(goldenIds);
  assert.equal(hash(golden), "f95b01fe4a671e384c25539a42afe0eda076b859f1bca4403e74bab41c7edaa7");
  const all = logic.FLOWER_PERMUTATIONS.map((ids) => logic.buildBouquetScene(ids));
  assert.equal(hash(all), "34a43a165f3c5d5f8ae6fa529f85fdae6c959f2dd7e39aa25396a32374379c05");
  assert.equal(logic.buildBouquetScene(["rose", "rose"]), null);
  assert.equal(logic.buildBouquetScene(["orchid"]), null);
  assertDeepFrozen(golden);
});

test("scene input hostile arrays fail closed without invoking index getters or ordinary Proxy gets", () => {
  let getterCalls = 0;
  const accessor = ["rose"];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    configurable: true,
    get() { getterCalls += 1; return "rose"; },
  });
  assert.equal(logic.buildBouquetScene(accessor), null);
  assert.equal(getterCalls, 0);

  const calls = { get: 0 };
  const proxy = new Proxy(["rose", "tulip"], {
    get() { calls.get += 1; throw new Error("ordinary get must not run"); },
  });
  assert.deepEqual(logic.buildBouquetScene(proxy).stems.map((stem) => stem.flowerId), ["rose", "tulip"]);
  assert.equal(calls.get, 0);
  const extra = ["rose"];
  extra.map = () => [];
  assert.equal(logic.buildBouquetScene(extra), null);
});

test("wrapSvgText covers 0/1/21/22/23/44 code points, LF, multibyte, and surrogate pairs", () => {
  assert.equal(logic.wrapSvgText(""), null);
  assert.deepEqual(logic.wrapSvgText("字"), ["字"]);
  assert.deepEqual(logic.wrapSvgText("字".repeat(21)), ["字".repeat(21)]);
  assert.deepEqual(logic.wrapSvgText("字".repeat(22)), ["字".repeat(22)]);
  assert.deepEqual(logic.wrapSvgText("字".repeat(23)), ["字".repeat(22), "字"]);
  assert.deepEqual(logic.wrapSvgText("字".repeat(44)), ["字".repeat(22), "字".repeat(22)]);
  assert.deepEqual(logic.wrapSvgText("一\n二"), ["一", "二"]);
  assert.deepEqual(logic.wrapSvgText("😀".repeat(23)), ["😀".repeat(22), "😀"]);
  assert.deepEqual(logic.wrapSvgText("é漢😀"), ["é漢😀"]);
  assertDeepFrozen(logic.wrapSvgText("一行"));
});

test("wrapSvgText enforces 192, line, surrogate, and control boundaries without trimming", () => {
  assert.deepEqual(logic.wrapSvgText("字".repeat(192)).join(""), "字".repeat(192));
  assert.equal(logic.wrapSvgText("字".repeat(193)), null);
  assert.equal(logic.wrapSvgText("一\n二\n三\n四"), null);
  assert.equal(logic.wrapSvgText("一\n\n三"), null);
  assert.equal(logic.wrapSvgText("\ud800"), null);
  assert.equal(logic.wrapSvgText("坏\r行"), null);
  assert.equal(logic.wrapSvgText("坏\u2028行"), null);
  assert.equal(logic.wrapSvgText("坏\u0001行"), null);
  assert.equal(logic.wrapSvgText({ toString: () => "文字" }), null);
  assert.deepEqual(logic.wrapSvgText("  不裁空格  "), ["  不裁空格  "]);
  const compositionLines = logic.wrapSvgText(logic.composeBouquetMeaning(content, goldenIds));
  assert.equal(compositionLines.length, 6);
  assert.deepEqual(logic.wrapSvgText(`—— ${content.sender}`), [`—— ${content.sender}`]);
});

test("default layout is exact and default/all-120 hashes match", () => {
  const layout = logic.buildExportTextLayout(content, goldenIds);
  assert.deepEqual(layout, [
    { block: "title", lineIndex: 0, text: "这束花，替我把心意放在这里", x: 80, y: 920, fontSize: 30 },
    { block: "composition", lineIndex: 0, text: "这束花先用「玫瑰」说“偏爱这件事，我一直很认", x: 80, y: 984, fontSize: 22 },
    { block: "composition", lineIndex: 1, text: "真”，", x: 80, y: 1016, fontSize: 22 },
    { block: "composition", lineIndex: 2, text: "再让「向日葵」接住“有你在的方向，总会更明亮", x: 80, y: 1048, fontSize: 22 },
    { block: "composition", lineIndex: 3, text: "”，", x: 80, y: 1080, fontSize: 22 },
    { block: "composition", lineIndex: 4, text: "最后由「满天星」把“小小的好，都想和你慢慢攒", x: 80, y: 1112, fontSize: 22 },
    { block: "composition", lineIndex: 5, text: "起来”留给以后。", x: 80, y: 1144, fontSize: 22 },
    { block: "note", lineIndex: 0, text: "不用等某个特别的日子，我也想把认真、明亮和长", x: 80, y: 1200, fontSize: 22 },
    { block: "note", lineIndex: 1, text: "久，都一枝一枝送给你。", x: 80, y: 1232, fontSize: 22 },
    { block: "sender", lineIndex: 0, text: "—— 总想把好事都留给你的人", x: 80, y: 1288, fontSize: 22 },
  ]);
  assert.equal(hash(layout), "4acd8ed97e0b6c1550f12d9831e14f1e068d533340bee32052a4bb3dc758509b");
  const all = logic.FLOWER_PERMUTATIONS.map((ids) => logic.buildExportTextLayout(content, ids));
  assert.equal(hash(all), "addebe218b9ee074f47c62ee2f053865bea0672b75208f7e1c07a81e9c6edcf2");
  assertDeepFrozen(layout);
});

test("maximum layout reaches 2/9/10/1 lines and last baseline 1680", () => {
  const nameHeads = ["甲", "乙", "丙", "丁", "戊", "己"];
  const meaningHeads = ["庚", "辛", "壬", "癸", "子", "丑"];
  const maximum = logic.sanitizeConfig(customConfig({
    recipient: "收".repeat(12),
    sender: "署".repeat(12),
    finalTitle: "题".repeat(40),
    finalNote: `甲\n乙\n${"丙".repeat(156)}`,
    flowers: logic.FLOWER_IDS.map((id, index) => ({
      id,
      name: nameHeads[index].repeat(8),
      meaning: meaningHeads[index].repeat(32),
    })),
  }));
  assert.notEqual(maximum, logic.DEFAULT_CONFIG);
  const layout = logic.buildExportTextLayout(maximum, goldenIds);
  const counts = {};
  for (const line of layout) counts[line.block] = (counts[line.block] || 0) + 1;
  assert.deepEqual(counts, { title: 2, composition: 9, note: 10, sender: 1 });
  assert.equal(layout.length, 22);
  assert.equal(layout.at(-1).y, 1680);
});

test("public view has exact fields and phase-specific capabilities", () => {
  const keys = [
    "phase", "selectedCount", "requiredCount", "catalog", "selected", "composition", "scene",
    "canStart", "canAdd", "canUndo", "canTie", "canRestart", "canPrepareExport",
    "recipient", "sender", "finalTitle", "finalNote", "revision",
  ];
  const intro = logic.getPublicView(logic.createInitialState());
  assert.deepEqual(Object.keys(intro), keys);
  assert.deepEqual(intro.catalog, []);
  assert.deepEqual(intro.selected, []);
  assert.equal(intro.scene, null);
  assert.equal(intro.canStart, true);

  let arrangingState = runToPhase("arranging");
  arrangingState = logic.reduce(arrangingState, { type: "ADD_FLOWER", flowerId: "rose" });
  const arranging = logic.getPublicView(arrangingState);
  assert.equal(arranging.catalog.length, 6);
  assert.equal(arranging.selected.length, 1);
  assert.equal(arranging.scene.stems.length, 1);
  assert.equal(arranging.composition, null);
  assert.equal(arranging.canAdd, true);
  assert.deepEqual(Object.keys(arranging.catalog[0]), ["id", "name", "meaning", "isSelected", "canAdd"]);
  assert.deepEqual(Object.keys(arranging.selected[0]), ["ordinal", "role", "roleLabel", "id", "name", "meaning"]);

  const preview = logic.getPublicView(runToPhase("preview"));
  assert.equal(preview.catalog.length, 6);
  assert.equal(preview.catalog.every((item) => item.canAdd === false), true);
  assert.equal(preview.canTie, true);
  assert.equal(typeof preview.composition, "string");

  const complete = logic.getPublicView(runToPhase("complete"));
  assert.deepEqual(complete.catalog, []);
  assert.equal(complete.selected.length, 3);
  assert.equal(complete.canPrepareExport, true);
  assert.equal(complete.finalTitle, config.finalTitle);
  assertDeepFrozen(complete);
});

test("public view privacy sentinel reveals only each phase's permitted data", () => {
  const raw = sentinelConfig();
  const allCatalog = [...raw.flowers.map((flower) => flower.name), ...raw.flowers.map((flower) => flower.meaning)];
  const finals = [raw.recipient, raw.sender, raw.finalTitle, raw.finalNote];
  const introText = JSON.stringify(logic.getPublicView(logic.createInitialState()));
  for (const secret of [...allCatalog, ...finals]) assert.equal(introText.includes(secret), false);

  const arrangingText = JSON.stringify(logic.getPublicView(runToPhase("arranging", goldenIds, raw)));
  for (const value of allCatalog) assert.equal(arrangingText.includes(value), true);
  for (const secret of finals) assert.equal(arrangingText.includes(secret), false);

  const previewText = JSON.stringify(logic.getPublicView(runToPhase("preview", goldenIds, raw)));
  for (const value of allCatalog) assert.equal(previewText.includes(value), true);
  for (const secret of finals) assert.equal(previewText.includes(secret), false);

  const completeText = JSON.stringify(logic.getPublicView(runToPhase("complete", goldenIds, raw)));
  for (const secret of finals) assert.equal(completeText.includes(secret), true);
});

test("invalid public-view state safely derives from a fresh canonical intro", () => {
  const view = logic.getPublicView({ hostile: true });
  assert.deepEqual(view, logic.getPublicView(logic.createInitialState()));
  assertDeepFrozen(view);
});

test("export model exists only for complete and has exact document metadata and schema", () => {
  assert.equal(logic.buildExportModel(logic.createInitialState()), null);
  assert.equal(logic.buildExportModel(runToPhase("preview")), null);
  assert.equal(logic.buildExportModel({ hostile: true }), null);
  const model = logic.buildExportModel(runToPhase("complete"));
  assert.deepEqual(Object.keys(model), [
    "version", "filename", "mimeType", "width", "height", "viewBox", "documentTitle",
    "documentDescription", "scene", "textLines",
  ]);
  assert.equal(model.documentTitle, config.finalTitle);
  assert.equal(model.documentDescription, "一束由「玫瑰」、「向日葵」和「满天星」组成的花。");
  assert.equal(model.filename, "flower-language-bouquet.svg");
  assert.equal(model.mimeType, "image/svg+xml;charset=utf-8");
  assertDeepFrozen(model);
});

test("export model excludes recipient, unselected catalog, history, revision, and controller data", () => {
  const raw = sentinelConfig();
  const model = logic.buildExportModel(runToPhase("complete", goldenIds, raw));
  const serialized = JSON.stringify(model);
  assert.equal(serialized.includes(raw.recipient), false);
  for (const index of [1, 2, 4]) {
    assert.equal(serialized.includes(raw.flowers[index].name), false);
    assert.equal(serialized.includes(raw.flowers[index].meaning), false);
    assert.equal(serialized.includes(raw.flowers[index].id), false);
  }
  for (const index of [0, 3, 5]) {
    assert.equal(serialized.includes(raw.flowers[index].name), true);
    assert.equal(serialized.includes(raw.flowers[index].meaning), true);
    assert.equal(model.scene.stems.some((stem) => stem.flowerId === raw.flowers[index].id), true);
    assert.equal(model.scene.stems.some((stem) => stem.shapeKey === raw.flowers[index].id), true);
  }
  for (const forbidden of ["recipient", "revision", "actionLog", "controller", "timestamp", "url"]) {
    assert.equal(forbidden in model, false);
  }
});

test("the same config and JSON-cloned action log produce deeply equal detached outputs", () => {
  const actions = [
    logic.createStartAction(config),
    { type: "ADD_FLOWER", flowerId: "daisy" },
    { type: "ADD_FLOWER", flowerId: "rose" },
    { type: "UNDO_LAST" },
    { type: "ADD_FLOWER", flowerId: "tulip" },
    { type: "ADD_FLOWER", flowerId: "gypsophila" },
    { type: "TIE_BOUQUET" },
  ];
  function replay(log) {
    let state = logic.createInitialState();
    for (const action of log) state = logic.reduce(state, action);
    return state;
  }
  const first = replay(actions);
  const second = replay(clone(actions));
  assert.deepEqual(first, second);
  assert.deepEqual(logic.getPublicView(first), logic.getPublicView(second));
  assert.deepEqual(logic.buildExportModel(first), logic.buildExportModel(second));
  assert.notEqual(first, second);
  assert.notEqual(first.content, second.content);
  assert.notEqual(first.selectedIds, second.selectedIds);
});

test("all helper outputs are detached from caller arrays and recursively frozen", () => {
  const ids = ["rose", "sunflower", "gypsophila"];
  const scene = logic.buildBouquetScene(ids);
  const layout = logic.buildExportTextLayout(content, ids);
  ids[0] = "tulip";
  assert.equal(scene.stems[0].flowerId, "rose");
  assert.equal(layout[1].text.includes("玫瑰"), true);
  assertDeepFrozen(scene);
  assertDeepFrozen(layout);
});

test("attribution pins all research sources, licenses, and docs-only generated assets", () => {
  const attribution = fs.readFileSync(
    new URL("./assets/ATTRIBUTION.md", import.meta.url),
    "utf8",
  );
  for (const expected of [
    "8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9",
    "d857fbe846d5899cd5cf8ea6a47d37e6030f53c0",
    "6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e",
    "723838fcbb9feaa87c8840082640de2ed82383da",
    "c4ae7066d5a52e8aeaab24b3f7113e25c38183f2",
    "cea522bc41bfadc364837293d0c4dc585a65ac46",
    "24c5e48bf66ea61bc199ec6338c81258275ba9c6",
    "cd1d1da9a5375af0622af4b36e76c6e6bd9d130b",
    "8b521081b0c65490c9b80633be68871f7bf441fa",
    "07123b871c103268375880980fd715b2b26b2ff0",
    "c7573530343759ace8e46438a1fa2c44515b5554",
    "不复制",
    "不是植物学事实",
    "不代表 `config.js` 已加密",
    "工具调用结果未暴露",
    "第三方图片、开源截图",
    "十张图片只在 `docs/` 中",
      "用户已接受 v2 视觉方向",
  ]) assert.equal(attribution.includes(expected), true, expected);

  const generatedHashes = attribution.match(/`[a-f0-9]{64}`/g) ?? [];
  assert.equal(generatedHashes.length >= 21, true);
});
