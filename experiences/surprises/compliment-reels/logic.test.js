"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");

const config = require("./config.js");
const logic = require("./logic.js");

const EXPECTED_INVENTORY_HASH =
  "d399e92747960af6d0d281d77da0e39a4a2ad0f22f592b8ca511153cab8b6fb0";
const EXPECTED_FALLBACK_HASH =
  "a49d88051b2d2e5d1255d4f806a7569cda9b33a650a908566197031349ad8db4";
const EXPECTED_API_KEYS = [
  "COLUMN_IDS",
  "COLUMN_LABELS",
  "DEFAULT_CONFIG",
  "ENTROPY_LENGTH",
  "FALLBACK_ENTROPY",
  "ITEM_IDS",
  "JACKPOT_MAX_SPIN",
  "JACKPOT_MIN_SPIN",
  "MAX_REVISION",
  "PLAN_LENGTH",
  "SIGNATURE_IDS",
  "UINT32_RANGE",
  "VERSION",
  "buildSpinPlan",
  "composePraise",
  "createArmAction",
  "createInitialState",
  "getPublicView",
  "reduce",
  "sanitizeConfig",
].sort();

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

function inventoryFrom(rawConfig) {
  return {
    columns: {
      moment: rawConfig.columns.moment.map(({ id, text }) => [id, text]),
      shine: rawConfig.columns.shine.map(({ id, text }) => [id, text]),
      echo: rawConfig.columns.echo.map(({ id, text }) => [id, text]),
    },
    signature: [
      logic.SIGNATURE_IDS.moment,
      logic.SIGNATURE_IDS.shine,
      logic.SIGNATURE_IDS.echo,
    ],
  };
}

function customConfig(composer) {
  const candidate = clone(config);
  candidate.composeJackpotNote = composer || (() => "只属于这轮的结语");
  return candidate;
}

function arm(entropy = logic.FALLBACK_ENTROPY, mode = "fallback", rawConfig = config) {
  const action = logic.createArmAction(rawConfig, Array.from(entropy), mode);
  assert.ok(action);
  return action;
}

function begin(action = arm(), initial = logic.createInitialState()) {
  return logic.reduce(initial, action);
}

function pull(state) {
  return logic.reduce(state, { type: "PULL" });
}

function settle(state, token = state.spinToken) {
  return logic.reduce(state, { type: "SETTLE", spinToken: token });
}

function finish(action = arm(), initial) {
  let state = begin(action, initial || logic.createInitialState());
  while (state.phase !== "jackpot") state = settle(pull(state));
  return state;
}

test("CommonJS exports the frozen exact API and editable config", () => {
  assert.deepEqual(Object.keys(logic).sort(), EXPECTED_API_KEYS);
  assert.equal(Object.isFrozen(config), false);
  assertDeepFrozen(logic);
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.PLAN_LENGTH, 6);
  assert.equal(logic.ENTROPY_LENGTH, 64);
});

test("classic-script VM exposes config and logic without requiring dependencies", () => {
  const configSource = fs.readFileSync(require.resolve("./config.js"), "utf8");
  const logicSource = fs.readFileSync(require.resolve("./logic.js"), "utf8");
  const context = vm.createContext({ module: { exports: {} }, Intl });
  vm.runInContext(configSource, context, { filename: "config.js" });
  assert.equal(context.module.exports, context.COMPLIMENT_REELS_CONFIG);

  context.module = { exports: {} };
  let requireCalls = 0;
  context.require = () => {
    requireCalls += 1;
    throw new Error("logic must not require runtime modules");
  };
  vm.runInContext(logicSource, context, { filename: "logic.js" });
  assert.equal(context.module.exports, context.COMPLIMENT_REELS_LOGIC);
  assert.equal(requireCalls, 0);
  assert.equal(vm.runInContext("Object.isFrozen(COMPLIMENT_REELS_LOGIC)", context), true);
});

test("production inventory matches the frozen hash and all 216 phrases are unique", () => {
  assert.equal(hash(inventoryFrom(logic.DEFAULT_CONFIG)), EXPECTED_INVENTORY_HASH);
  const phrases = new Set();
  for (const moment of logic.DEFAULT_CONFIG.columns.moment) {
    for (const shine of logic.DEFAULT_CONFIG.columns.shine) {
      for (const echo of logic.DEFAULT_CONFIG.columns.echo) {
        const phrase = logic.composePraise(moment.text, shine.text, echo.text);
        assert.match(phrase, /^[^，。]+，[^，。]+，[^，。]+。$/u);
        assert.ok(Array.from(phrase).length <= 61);
        phrases.add(phrase);
      }
    }
  }
  assert.equal(phrases.size, 216);
});

test("fallback entropy has the fixed hash and exact six-stop plan", () => {
  assert.equal(hash(logic.FALLBACK_ENTROPY), EXPECTED_FALLBACK_HASH);
  const plan = logic.buildSpinPlan(Array.from(logic.FALLBACK_ENTROPY));
  assert.deepEqual(plan, {
    jackpotSpin: 3,
    stops: [
      ["m_care", "s_lovely", "e_closer"],
      ["m_notice", "s_true", "e_beside"],
      ["m_slow", "s_safe", "e_here"],
      ["m_listen", "s_light", "e_future"],
      ["m_finish", "s_steady", "e_strength"],
      ["m_remember", "s_gentle", "e_smile"],
    ],
  });
  assertDeepFrozen(plan);
});

test("four fixtures place the unique signature at spins 3 through 6", () => {
  for (let first = 0; first < 4; first += 1) {
    const entropy = Array(64).fill(0);
    entropy[0] = first;
    const plan = logic.buildSpinPlan(entropy);
    assert.equal(plan.jackpotSpin, first + 3);
    let matches = 0;
    for (let index = 0; index < plan.stops.length; index += 1) {
      const stop = plan.stops[index];
      const signature = stop[0] === "m_slow" && stop[1] === "s_safe"
        && stop[2] === "e_here";
      if (signature) {
        matches += 1;
        assert.equal(index, first + 2);
      }
    }
    assert.equal(matches, 1);
    for (let column = 0; column < 3; column += 1) {
      assert.equal(new Set(plan.stops.map((stop) => stop[column])).size, 6);
    }
    assert.equal(new Set(plan.stops.map((stop) => stop.join("|"))).size, 6);
  }
});

test("rejection sampling consumes rejected words and fails closed on exhaustion", () => {
  const exhausted = Array(64).fill(4294967295);
  exhausted[0] = 0;
  assert.equal(logic.buildSpinPlan(exhausted), null);

  const continued = Array.from({ length: 64 }, (_, index) => Math.max(0, index - 1));
  continued[0] = 0;
  continued[1] = 4294967295;
  assert.deepEqual(
    logic.buildSpinPlan(continued),
    logic.buildSpinPlan(Array.from(logic.FALLBACK_ENTROPY)),
  );
});

test("entropy exact schema rejects sparse arrays, subclasses and invalid uint32", () => {
  const sparse = Array(64).fill(0);
  delete sparse[4];
  class Entropy extends Array {}
  const subclass = new Entropy(...Array(64).fill(0));
  const extra = Array(64).fill(0);
  extra.extra = true;
  const symbol = Array(64).fill(0);
  symbol[Symbol("x")] = true;
  assert.equal(logic.buildSpinPlan(sparse), null);
  assert.equal(logic.buildSpinPlan(subclass), null);
  assert.equal(logic.buildSpinPlan(extra), null);
  assert.equal(logic.buildSpinPlan(symbol), null);
  assert.equal(logic.buildSpinPlan([...Array(63).fill(0), 4294967296]), null);
  assert.equal(logic.buildSpinPlan([...Array(63).fill(0), -1]), null);
  assert.equal(logic.buildSpinPlan([...Array(63).fill(0), 0.5]), null);
});

test("config sanitizer accepts exact content and atomically falls back on any violation", () => {
  const valid = customConfig();
  valid.recipient = "  小宇  ";
  valid.sender = "阿岚";
  valid.columns.moment[0].text = "你认真望向我的时候";
  const sanitized = logic.sanitizeConfig(valid);
  assert.equal(sanitized.content.recipient, "小宇");
  assert.equal(sanitized.content.columns.moment[0].text, "你认真望向我的时候");
  assert.notEqual(sanitized.content.columns, valid.columns);
  assertDeepFrozen(sanitized);

  for (const mutate of [
    (value) => { value.extra = true; },
    (value) => { value.recipient = value.sender; },
    (value) => { value.columns.moment[0].id = "changed"; },
    (value) => { value.columns.shine[1].text = value.columns.shine[0].text; },
    (value) => { value.columns.echo[0].text = "含有，标点"; },
    (value) => { value.columns.moment.pop(); },
  ]) {
    const invalid = customConfig();
    mutate(invalid);
    const result = logic.sanitizeConfig(invalid);
    assert.equal(hash(inventoryFrom(result.content)), EXPECTED_INVENTORY_HASH);
    assert.equal(result.content.recipient, "你");
  }
});

test("Unicode grapheme limits accept composed emoji and reject lone surrogates or controls", () => {
  const valid = customConfig();
  valid.recipient = "👩‍❤️‍👩";
  valid.sender = "我";
  assert.equal(logic.sanitizeConfig(valid).content.recipient, "👩‍❤️‍👩");

  const lone = customConfig();
  lone.recipient = "\ud800";
  assert.equal(logic.sanitizeConfig(lone).content.recipient, "你");
  const control = customConfig();
  control.columns.echo[0].text = "让我喜欢\u0000这样的日子";
  assert.equal(hash(inventoryFrom(logic.sanitizeConfig(control).content)), EXPECTED_INVENTORY_HASH);
});

test("deterministic grapheme fallback preserves exact limits without Intl.Segmenter", () => {
  const configSource = fs.readFileSync(require.resolve("./config.js"), "utf8");
  const logicSource = fs.readFileSync(require.resolve("./logic.js"), "utf8");
  const context = vm.createContext({ module: { exports: {} }, Intl: {} });
  vm.runInContext(configSource, context, { filename: "config.js" });
  context.module = { exports: {} };
  vm.runInContext(logicSource, context, { filename: "logic.js" });

  const clusters = [
    "e\u0301", "שְ", "نّ", "का", "가", "❤️", "👍🏽", "👩‍❤️‍👩", "🇲🇾",
  ];
  for (const cluster of clusters) {
    context.recipient = cluster.repeat(12);
    assert.equal(vm.runInContext(`
      COMPLIMENT_REELS_LOGIC.sanitizeConfig({
        recipient,
        sender: "我",
        columns: COMPLIMENT_REELS_CONFIG.columns,
        composeJackpotNote: COMPLIMENT_REELS_CONFIG.composeJackpotNote
      }).content.recipient
    `, context), context.recipient);

    context.recipient = cluster.repeat(13);
    assert.equal(vm.runInContext(`
      COMPLIMENT_REELS_LOGIC.sanitizeConfig({
        recipient,
        sender: "我",
        columns: COMPLIMENT_REELS_CONFIG.columns,
        composeJackpotNote: COMPLIMENT_REELS_CONFIG.composeJackpotNote
      }).content.recipient
    `, context), "你");
  }

  context.noteText = "👍🏽".repeat(120);
  assert.equal(vm.runInContext(`
    COMPLIMENT_REELS_LOGIC.createArmAction({
      recipient: "甲",
      sender: "乙",
      columns: COMPLIMENT_REELS_CONFIG.columns,
      composeJackpotNote() { return noteText; }
    }, Array.from(COMPLIMENT_REELS_LOGIC.FALLBACK_ENTROPY), "fallback").jackpotNote
  `, context), context.noteText);
  context.noteText = "👍🏽".repeat(121);
  assert.notEqual(vm.runInContext(`
    COMPLIMENT_REELS_LOGIC.createArmAction({
      recipient: "甲",
      sender: "乙",
      columns: COMPLIMENT_REELS_CONFIG.columns,
      composeJackpotNote() { return noteText; }
    }, Array.from(COMPLIMENT_REELS_LOGIC.FALLBACK_ENTROPY), "fallback").jackpotNote
  `, context), context.noteText);
});

test("createArmAction calls composer once with a frozen guarded summary", () => {
  let calls = 0;
  let captured;
  const candidate = customConfig((summary) => {
    calls += 1;
    captured = summary;
    return `${summary.recipient}，本轮共 ${summary.pullCount} 次。——${summary.sender}`;
  });
  const action = arm(logic.FALLBACK_ENTROPY, "fallback", candidate);
  assert.equal(calls, 1);
  assert.equal(captured.pullCount, 3);
  assert.equal(captured.revealedPraises.length, 3);
  assert.equal(captured.jackpotPhrase, captured.revealedPraises[2]);
  assert.match(action.jackpotNote, /本轮共 3 次/u);
  assertDeepFrozen(action);
});

test("composer mutation, throw, thenable, empty and overlong output use default note", () => {
  const composers = [
    (summary) => {
      summary.revealedPraises.push("篡改");
      return "不会采用";
    },
    () => { throw new Error("boom"); },
    () => ({ then() {} }),
    () => "   ",
    () => "长".repeat(121),
  ];
  for (const composer of composers) {
    const action = arm(logic.FALLBACK_ENTROPY, "fallback", customConfig(composer));
    assert.equal(action.jackpotNote, "你，这些不是碰巧，是我真的一直这样看见你。——我");
  }
});

test("fallback mode accepts only the frozen fallback while crypto accepts any legal entropy", () => {
  const other = Array(64).fill(0);
  assert.equal(logic.createArmAction(config, other, "fallback"), null);
  assert.ok(logic.createArmAction(config, other, "crypto"));
  assert.ok(logic.createArmAction(config, Array.from(logic.FALLBACK_ENTROPY), "crypto"));
  assert.equal(logic.createArmAction(config, other, "unknown"), null);
});

test("state machine completes the precommitted prefix and reveals note only at jackpot", () => {
  const action = arm();
  let state = begin(action);
  let view = logic.getPublicView(state);
  assert.equal(state.phase, "ready");
  assert.equal(view.praise, null);
  assert.equal(view.jackpotNote, null);
  assert.equal(view.canPull, true);

  state = pull(state);
  view = logic.getPublicView(state);
  assert.equal(state.phase, "spinning");
  assert.equal(view.praise, null);
  assert.equal(view.animationToken, state.spinToken);
  const firstToken = state.spinToken;

  state = settle(state);
  view = logic.getPublicView(state);
  assert.equal(state.phase, "result");
  assert.equal(view.spinCount, 1);
  assert.equal(view.revealedPraises.length, 1);
  assert.equal(view.jackpotNote, null);
  assert.equal(logic.reduce(state, { type: "SETTLE", spinToken: firstToken }), state);

  state = settle(pull(state));
  state = settle(pull(state));
  view = logic.getPublicView(state);
  assert.equal(state.phase, "jackpot");
  assert.equal(view.isJackpot, true);
  assert.equal(view.spinCount, 3);
  assert.equal(view.jackpotNote, action.jackpotNote);
  assert.equal(view.praise, view.revealedPraises[view.spinCount - 1]);
  assert.equal(JSON.stringify(view).includes("m_slow"), false);
  assert.equal(JSON.stringify(view).includes("jackpotSpin"), false);
});

test("SUSPEND and correct SETTLE produce byte-equivalent next states", () => {
  const spinning = pull(begin());
  const bySettle = logic.reduce(spinning, { type: "SETTLE", spinToken: spinning.spinToken });
  const bySuspend = logic.reduce(spinning, { type: "SUSPEND" });
  assert.deepEqual(bySuspend, bySettle);
});

test("wrong token, repeated pull, extra keys and invalid phases are same-reference no-ops", () => {
  const ready = begin();
  const spinning = pull(ready);
  assert.equal(logic.reduce(spinning, { type: "PULL" }), spinning);
  assert.equal(logic.reduce(spinning, {
    type: "SETTLE",
    spinToken: spinning.spinToken + 1,
  }), spinning);
  assert.equal(logic.reduce(ready, { type: "PULL", extra: true }), ready);
  const jackpot = finish();
  assert.equal(logic.reduce(jackpot, { type: "PULL" }), jackpot);
});

test("JSON-cloned ARM action replays to byte-equivalent state and view without composer", () => {
  let calls = 0;
  const action = arm(logic.FALLBACK_ENTROPY, "fallback", customConfig(() => {
    calls += 1;
    return "动作里已经封好的结语";
  }));
  assert.equal(calls, 1);
  const cloned = clone(action);
  const first = finish(action);
  const replay = finish(cloned);
  assert.equal(calls, 1);
  assert.deepEqual(replay, first);
  assert.deepEqual(logic.getPublicView(replay), logic.getPublicView(first));
});

test("restart preserves monotonic revision and an old token cannot hit a new round", () => {
  const jackpot = finish();
  const oldRevision = jackpot.revision;
  const restarted = logic.reduce(jackpot, { type: "RESTART" });
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.revision, oldRevision + 1);
  const ready = begin(arm(), restarted);
  const spinning = pull(ready);
  assert.notEqual(spinning.spinToken, 2);
  assert.equal(logic.reduce(spinning, { type: "SETTLE", spinToken: 2 }), spinning);
});

test("revision headroom accepts the exact ARM boundary and rejects one above", () => {
  const action = arm();
  const boundary = logic.MAX_REVISION - (1 + 2 * 3);
  const accepted = logic.reduce(logic.createInitialState(boundary), action);
  assert.equal(accepted.phase, "ready");
  const tooLate = logic.createInitialState(boundary + 1);
  assert.equal(logic.reduce(tooLate, action), tooLate);
});

test("invalid state resets safely while a legal data-descriptor Proxy never performs get", () => {
  const invalid = clone(begin());
  invalid.phase = "broken";
  const reset = logic.reduce(invalid, { type: "PULL" });
  assert.deepEqual(reset, logic.createInitialState());
  assert.notEqual(reset, invalid);

  const target = begin();
  let gets = 0;
  const proxy = new Proxy(target, {
    get() {
      gets += 1;
      throw new Error("ordinary get must not run");
    },
  });
  const next = logic.reduce(proxy, { type: "PULL" });
  assert.equal(next.phase, "spinning");
  assert.equal(gets, 0);
});

test("a forged fallback state with a different valid plan resets safely", () => {
  const forged = clone(begin());
  forged.plan = logic.buildSpinPlan(Array(64).fill(0));
  assert.notDeepEqual(forged.plan, begin().plan);
  assert.deepEqual(logic.reduce(forged, { type: "PULL" }), logic.createInitialState());
  assert.equal(logic.getPublicView(forged).phase, "intro");
});

test("hostile action accessors, symbols and reflection traps fail closed", () => {
  const ready = begin();
  const accessor = {};
  Object.defineProperty(accessor, "type", { get() { throw new Error("getter"); } });
  assert.equal(logic.reduce(ready, accessor), ready);
  const symbol = { type: "PULL" };
  symbol[Symbol("extra")] = true;
  assert.equal(logic.reduce(ready, symbol), ready);
  const trap = new Proxy({ type: "PULL" }, {
    ownKeys() {
      throw new Error("trap");
    },
  });
  assert.equal(logic.reduce(ready, trap), ready);
});

test("public view keeps future sentinel text hidden until its stop settles", () => {
  const candidate = customConfig(() => "终局私语-Z9");
  candidate.columns.moment[0].text = "你认真留意风声的时候";
  candidate.columns.moment[1].text = "你记得晚霞颜色的时候";
  candidate.columns.moment[2].text = "你耐心等云散开的时候";
  candidate.columns.moment[4].text = "你发现季节变化的时候";
  candidate.columns.moment[5].text = "你照顾窗边小花的时候";
  const action = arm(logic.FALLBACK_ENTROPY, "fallback", candidate);
  const ready = begin(action);
  const readyText = JSON.stringify(logic.getPublicView(ready));
  assert.equal(readyText.includes("终局私语-Z9"), false);
  assert.equal(readyText.includes("你照顾窗边小花的时候"), false);

  const spinning = pull(ready);
  const spinningText = JSON.stringify(logic.getPublicView(spinning));
  assert.equal(spinningText.includes("你照顾窗边小花的时候"), false);
  const result = settle(spinning);
  assert.equal(JSON.stringify(logic.getPublicView(result)).includes("你照顾窗边小花的时候"), true);
  assert.equal(JSON.stringify(logic.getPublicView(result)).includes("终局私语-Z9"), false);
});

test("logic source has no DOM, clock, random, timer, storage or network dependency", () => {
  const source = fs.readFileSync(require.resolve("./logic.js"), "utf8");
  for (const forbidden of [
    "Math.random",
    "new Date",
    "Date.now",
    "document.",
    "window.",
    "setTimeout",
    "setInterval",
    "requestAnimationFrame",
    "localStorage",
    "sessionStorage",
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
