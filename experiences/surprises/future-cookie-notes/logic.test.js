import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

await import("./config.js");
await import("./logic.js");

const configApi = globalThis.FutureCookieNotesConfig;
const logic = globalThis.FutureCookieNotesLogic;

function dispatch(state, type, fields = {}) {
  return logic.reduceFutureCookieNotes(state, { type, ...fields });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

function openAll(order = logic.NOTE_IDS) {
  return order.reduce((state, noteId) => dispatch(state, "OPEN_NOTE", { noteId }), logic.createInitialState());
}

function permutations(values) {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations(values.filter((_, itemIndex) => itemIndex !== index))
    .map((tail) => [value, ...tail]));
}

test("UMD 公共 API、常量与默认配置精确且递归冻结", () => {
  assert.deepEqual(Object.keys(configApi), ["DEFAULT_CONFIG", "composeInvitation"]);
  assert.deepEqual(Object.keys(logic), [
    "VERSION", "NOTE_IDS", "NOTE_META", "PHASES", "ACTION_TYPES", "createInitialState",
    "sanitizeConfig", "reduceFutureCookieNotes", "assertState", "getFutureCookieNotesView",
    "replayFutureCookieNotes", "deepFreeze",
  ]);
  assert.equal(logic.VERSION, 1);
  assert.deepEqual(logic.NOTE_IDS, ["when", "where", "together"]);
  assert.deepEqual(logic.NOTE_META, {
    when: { number: 1, label: "什么时候", position: 1 },
    where: { number: 2, label: "去哪里", position: 2 },
    together: { number: 3, label: "一起做什么", position: 3 },
  });
  assert.deepEqual(logic.PHASES, ["collecting", "ready", "finale"]);
  assert.deepEqual(logic.ACTION_TYPES, ["OPEN_NOTE", "ASSEMBLE", "RESTART"]);
  assertDeepFrozen(configApi);
  assertDeepFrozen(logic);
});

test("UMD 全局名与 CommonJS 出口在隔离环境中一致", () => {
  const configSource = readFileSync(new URL("./config.js", import.meta.url), "utf8");
  const configModule = { exports: {} };
  const configSandbox = { module: configModule };
  runInNewContext(configSource, configSandbox);
  assert.equal(configModule.exports, configSandbox.FutureCookieNotesConfig);

  const logicSource = readFileSync(new URL("./logic.js", import.meta.url), "utf8");
  const logicModule = { exports: {} };
  const logicSandbox = {
    module: logicModule,
    require(specifier) {
      assert.equal(specifier, "./config.js");
      return configModule.exports;
    },
  };
  runInNewContext(logicSource, logicSandbox);
  assert.equal(logicModule.exports, logicSandbox.FutureCookieNotesLogic);
  assert.equal(logicModule.exports.VERSION, 1);
  assert.equal(logicModule.exports.sanitizeConfig(null).invitation,
    "下一个不赶时间的周末，我们去一条我们都没走过的街，慢慢吃，慢慢逛，再拍一张新的合照。");
});

test("默认配置与默认邀请精确", () => {
  assert.deepEqual(configApi.DEFAULT_CONFIG, {
    title: "三枚以后，都是我们",
    subtitle: "敲开三枚未来签，把三个小约定拼成一封邀请。",
    intro: "有三个以后，我先替我们收好了。你想先打开哪一枚？",
    readyTitle: "三个以后，都到齐了。",
    finalTitle: "这不是预言，是我想和你兑现的以后。",
    notes: {
      when: "下一个不赶时间的周末",
      where: "去一条我们都没走过的街",
      together: "慢慢吃，慢慢逛，再拍一张新的合照",
    },
    closing: "只要你愿意，我们就挑一天出发。",
    signature: "—— 一直想和你去的人",
    privacy: "这三段只在本机页面中使用，刷新即重置。",
  });
  assert.equal(configApi.composeInvitation(configApi.DEFAULT_CONFIG.notes),
    "下一个不赶时间的周末，我们去一条我们都没走过的街，慢慢吃，慢慢逛，再拍一张新的合照。");
});

test("初始状态形状精确、创建间断开引用、递归冻结且可 JSON 往返", () => {
  const first = logic.createInitialState();
  const second = logic.createInitialState();
  assert.deepEqual(first, { version: 1, phase: "collecting", openedOrder: [] });
  assert.notEqual(first, second);
  assert.notEqual(first.openedOrder, second.openedOrder);
  assert.deepEqual(clone(first), first);
  const roundTripped = clone(first);
  assert.equal(logic.assertState(roundTripped), roundTripped);
  assertDeepFrozen(first);
});

const fieldLimits = [
  ["title", 32], ["subtitle", 96], ["intro", 96], ["readyTitle", 96],
  ["finalTitle", 96], ["closing", 120], ["signature", 48], ["privacy", 100],
];

for (const [field, limit] of fieldLimits) {
  test(`配置 ${field} 以 Unicode code point 判限并在超长时回退`, () => {
    const exact = logic.sanitizeConfig({ [field]: `  ${"🌙".repeat(limit)}  ` });
    assert.equal(exact[field], "🌙".repeat(limit));
    const tooLong = logic.sanitizeConfig({ [field]: "🌙".repeat(limit + 1) });
    assert.equal(tooLong[field], configApi.DEFAULT_CONFIG[field]);
  });
}

for (const noteId of logic.NOTE_IDS) {
  test(`配置 notes.${noteId} 独立清洗并按 80 code points 回退`, () => {
    const exact = logic.sanitizeConfig({ notes: { [noteId]: `  ${"约".repeat(80)}  ` } });
    assert.equal(exact.notes[noteId], "约".repeat(80));
    const tooLong = logic.sanitizeConfig({ notes: { [noteId]: "约".repeat(81) } });
    assert.equal(tooLong.notes[noteId], configApi.DEFAULT_CONFIG.notes[noteId]);
  });
}

test("配置非字符串、空白、异常 getter 与代理读取异常逐字段回退", () => {
  const candidate = { title: 42, subtitle: "   ", notes: { where: null } };
  Object.defineProperty(candidate, "intro", { enumerable: true, get() { throw new Error("private"); } });
  const safe = logic.sanitizeConfig(candidate);
  assert.equal(safe.title, configApi.DEFAULT_CONFIG.title);
  assert.equal(safe.subtitle, configApi.DEFAULT_CONFIG.subtitle);
  assert.equal(safe.intro, configApi.DEFAULT_CONFIG.intro);
  assert.equal(safe.notes.where, configApi.DEFAULT_CONFIG.notes.where);
  const proxy = new Proxy({}, { get() { throw new Error("blocked"); } });
  assert.deepEqual(logic.sanitizeConfig(proxy), logic.sanitizeConfig(null));
});

test("合法配置被 trim、复制和递归冻结，嵌套 notes 与输入断开引用", () => {
  const candidate = {
    title: "  给你  ",
    notes: { when: "  明晚  ", where: "  去河边  ", together: "  吹一会儿风  " },
  };
  const safe = logic.sanitizeConfig(candidate);
  candidate.notes.when = "已被调用方修改";
  assert.equal(safe.title, "给你");
  assert.deepEqual(safe.notes, { when: "明晚", where: "去河边", together: "吹一会儿风" });
  assert.equal(safe.invitation, "明晚，我们去河边，吹一会儿风。");
  assertDeepFrozen(safe);
});

test("合成策略只收到精确冻结三段副本，合法返回被 trim", () => {
  let received;
  const safe = logic.sanitizeConfig({ notes: { when: "明天", where: "去山里", together: "看云" } }, (notes) => {
    received = notes;
    return "  明天一起看云。  ";
  });
  assert.deepEqual(Object.keys(received), ["when", "where", "together"]);
  assertDeepFrozen(received);
  assert.equal(safe.invitation, "明天一起看云。");
  assert.notEqual(received, safe.notes);
});

const badStrategies = [
  ["抛错", () => { throw new Error("bad compose"); }],
  ["非字符串", () => 42],
  ["空白", () => "   "],
  ["超长", () => "邀".repeat(281)],
  ["试图修改冻结参数", (notes) => { notes.when = "篡改"; return "不应采用"; }],
];

for (const [name, strategy] of badStrategies) {
  test(`非法合成策略安全回退：${name}`, () => {
    const safe = logic.sanitizeConfig(null, strategy);
    assert.equal(safe.invitation,
      "下一个不赶时间的周末，我们去一条我们都没走过的街，慢慢吃，慢慢逛，再拍一张新的合照。");
  });
}

test("三个 ID 都能作为第一枚，重复与错阶段动作保持原引用", () => {
  for (const noteId of logic.NOTE_IDS) {
    const initial = logic.createInitialState();
    const opened = dispatch(initial, "OPEN_NOTE", { noteId });
    assert.deepEqual(opened.openedOrder, [noteId]);
    assert.equal(opened.phase, "collecting");
    assert.equal(dispatch(opened, "OPEN_NOTE", { noteId }), opened);
    assert.equal(dispatch(opened, "ASSEMBLE"), opened);
    assert.equal(dispatch(opened, "RESTART"), opened);
  }
});

test("六种打开排列都保留真实顺序、第三枚只进入 ready", () => {
  for (const order of permutations([...logic.NOTE_IDS])) {
    const state = openAll(order);
    assert.equal(state.phase, "ready");
    assert.deepEqual(state.openedOrder, order);
    assertDeepFrozen(state);
  }
});

test("只有 ready 可主动合成，只有 finale 可返回新的初始状态", () => {
  const ready = openAll();
  const finale = dispatch(ready, "ASSEMBLE");
  assert.equal(finale.phase, "finale");
  assert.deepEqual(finale.openedOrder, ready.openedOrder);
  assert.notEqual(finale.openedOrder, ready.openedOrder);
  assert.equal(dispatch(finale, "ASSEMBLE"), finale);
  assert.equal(dispatch(finale, "OPEN_NOTE", { noteId: "when" }), finale);
  const restarted = dispatch(finale, "RESTART");
  assert.deepEqual(restarted, logic.createInitialState());
  assert.notEqual(restarted, finale);
});

test("非法 action schema、异常 getter、数组、函数和原型伪造全部幂等", () => {
  const state = logic.createInitialState();
  const getter = Object.defineProperty({}, "type", { enumerable: true, get() { throw new Error("nope"); } });
  const symbol = { type: "ASSEMBLE" };
  symbol[Symbol("extra")] = true;
  const wrongPrototype = Object.create({ type: "OPEN_NOTE" });
  wrongPrototype.noteId = "when";
  const actions = [
    null, undefined, [], () => {}, {}, { type: "UNKNOWN" },
    { type: "OPEN_NOTE" }, { type: "OPEN_NOTE", noteId: "unknown" },
    { type: "OPEN_NOTE", noteId: "when", extra: true }, { type: "ASSEMBLE", extra: true },
    { type: "RESTART", extra: true }, getter, symbol, wrongPrototype, Object.create(null),
  ];
  for (const action of actions) assert.equal(logic.reduceFutureCookieNotes(state, action), state);
});

test("action 不会被读取型副作用以外修改，合法输入状态保持不变", () => {
  const action = { type: "OPEN_NOTE", noteId: "where" };
  const state = clone(logic.createInitialState());
  const beforeAction = clone(action);
  const beforeState = clone(state);
  logic.reduceFutureCookieNotes(state, action);
  assert.deepEqual(action, beforeAction);
  assert.deepEqual(state, beforeState);
});

test("assertState 接受全部可达和 JSON 状态，拒绝精确形状及阶段不变量错误", () => {
  const reachable = [logic.createInitialState()];
  let current = reachable[0];
  for (const noteId of logic.NOTE_IDS) {
    current = dispatch(current, "OPEN_NOTE", { noteId });
    reachable.push(current);
  }
  reachable.push(dispatch(current, "ASSEMBLE"));
  for (const state of reachable) assert.equal(logic.assertState(clone(state)).phase, state.phase);

  const invalid = [
    null, [], { version: 1, phase: "collecting", openedOrder: [], extra: true },
    { version: 2, phase: "collecting", openedOrder: [] },
    { version: 1, phase: "unknown", openedOrder: [] },
    { version: 1, phase: "collecting", openedOrder: ["when", "where", "together"] },
    { version: 1, phase: "ready", openedOrder: ["when", "where"] },
    { version: 1, phase: "finale", openedOrder: ["when", "when", "where"] },
    { version: 1, phase: "ready", openedOrder: ["when", "where", "unknown"] },
  ];
  const wrongProto = Object.assign(Object.create(null), clone(logic.createInitialState()));
  invalid.push(wrongProto);
  const getter = { version: 1, phase: "collecting" };
  Object.defineProperty(getter, "openedOrder", { enumerable: true, get() { return []; } });
  invalid.push(getter);
  for (const state of invalid) assert.throws(() => logic.assertState(state), TypeError);
});

test("畸形 state 经 reducer 返回新的冻结初始状态且不抛错", () => {
  const malformed = { version: 1, phase: "ready", openedOrder: [] };
  const recovered = logic.reduceFutureCookieNotes(malformed, { type: "ASSEMBLE" });
  assert.deepEqual(recovered, logic.createInitialState());
  assert.notEqual(recovered, malformed);
  assertDeepFrozen(recovered);
});

test("collecting public view 只公开已打开正文并返回精确进度与播报", () => {
  const safe = logic.sanitizeConfig(null);
  const initialView = logic.getFutureCookieNotesView(logic.createInitialState(), safe);
  assert.equal(initialView.intro, configApi.DEFAULT_CONFIG.intro);
  assert.deepEqual(initialView.progress, { opened: 0, total: 3, text: "已收好 0 / 3" });
  assert.equal(initialView.announcement, "三枚未来签已摆好。");
  assert.equal(initialView.ready, null);
  assert.equal(initialView.finale, null);
  assert.equal(initialView.notes.every((note) => !("body" in note)), true);

  const state = dispatch(logic.createInitialState(), "OPEN_NOTE", { noteId: "where" });
  const view = logic.getFutureCookieNotesView(state, safe);
  assert.equal(view.notes[0].id, "when");
  assert.equal(view.notes[1].body, safe.notes.where);
  assert.equal("body" in view.notes[0], false);
  assert.equal("body" in view.notes[2], false);
  assert.equal(view.announcement, "已收好‘去哪里’，共 1 枚。");
  const serialized = JSON.stringify(view);
  assert.equal(serialized.includes(safe.notes.when), false);
  assert.equal(serialized.includes(safe.notes.together), false);
  assert.equal(serialized.includes(safe.invitation), false);
});

test("ready view 三段按语义顺序公开，但最终文字与开场不存在", () => {
  const safe = logic.sanitizeConfig(null);
  const ready = openAll(["together", "when", "where"]);
  const view = logic.getFutureCookieNotesView(ready, safe);
  assert.equal(view.intro, null);
  assert.deepEqual(view.notes.map((note) => note.id), logic.NOTE_IDS);
  assert.equal(view.notes.every((note) => "body" in note), true);
  assert.deepEqual(view.ready, { title: "三个以后，都到齐了。", actionLabel: "把三个以后拼起来" });
  assert.equal(view.finale, null);
  assert.equal(view.announcement, "三枚未来签已到齐，可以拼成邀请了。");
  const serialized = JSON.stringify(view);
  for (const secret of [safe.invitation, safe.closing, safe.signature, safe.finalTitle]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("finale view 才公开完整邀请、结语、署名和重开文案", () => {
  const safe = logic.sanitizeConfig(null);
  const finale = dispatch(openAll(), "ASSEMBLE");
  const view = logic.getFutureCookieNotesView(finale, safe);
  assert.equal(view.intro, null);
  assert.equal(view.ready, null);
  assert.deepEqual(view.finale, {
    title: safe.finalTitle,
    invitation: safe.invitation,
    closing: safe.closing,
    signature: safe.signature,
    restartLabel: "再打开一遍",
  });
  assert.equal(view.announcement, "完整邀请已展开。");
  assertDeepFrozen(view);
  assert.notEqual(view.notes, finale.openedOrder);
  assert.notEqual(view.notes, safe.notes);
});

test("六种打开顺序得到同一语义 view 与同一完整邀请", () => {
  const safe = logic.sanitizeConfig(null);
  const views = permutations([...logic.NOTE_IDS]).map((order) =>
    logic.getFutureCookieNotesView(dispatch(openAll(order), "ASSEMBLE"), safe));
  for (const view of views.slice(1)) {
    assert.deepEqual(view.notes, views[0].notes);
    assert.equal(view.finale.invitation, views[0].finale.invitation);
  }
});

test("重放对原日志零修改，深克隆与 JSON 往返得到相同冻结终态", () => {
  const actions = [
    { type: "OPEN_NOTE", noteId: "where" },
    { type: "OPEN_NOTE", noteId: "where" },
    { type: "OPEN_NOTE", noteId: "together" },
    { type: "OPEN_NOTE", noteId: "when" },
    { type: "ASSEMBLE" },
  ];
  const before = clone(actions);
  const first = logic.replayFutureCookieNotes(actions);
  const second = logic.replayFutureCookieNotes(clone(actions));
  const third = logic.replayFutureCookieNotes(JSON.parse(JSON.stringify(actions)));
  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
  assert.deepEqual(actions, before);
  assertDeepFrozen(first);
  assert.throws(() => logic.replayFutureCookieNotes(null), TypeError);
});

test("deepFreeze 支持循环引用并冻结已冻结父对象中的嵌套值", () => {
  const child = { value: 1 };
  const parent = { child };
  parent.self = parent;
  logic.deepFreeze(parent);
  assertDeepFrozen(parent);
});
