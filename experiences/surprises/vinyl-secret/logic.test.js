"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const config = require("./config.js");
const logic = require("./logic.js");

const EXPECTED_API_KEYS = [
  "ACTION_TYPES",
  "DEFAULT_CONFIG",
  "DEFAULT_TARGETS",
  "GROOVE_COUNT",
  "MAX_COUNTER",
  "PHASES",
  "SETTLE_REASONS",
  "SIGNAL_CODES",
  "SIGNAL_LABELS",
  "TRACK_COUNT",
  "TRACK_SETTLE_MS",
  "VERSION",
  "assertState",
  "createInitialState",
  "getSignal",
  "getViewModel",
  "sanitizeConfig",
  "transition",
].sort();

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

function candidateConfig() {
  return clone(config);
}

function customPrivateConfig() {
  const candidate = candidateConfig();
  candidate.recipientName = "收件人哨兵";
  candidate.finalEyebrow = "眉题哨兵";
  candidate.finalTitle = "终章标题哨兵";
  candidate.finalMessage = "终章正文哨兵";
  candidate.signature = "落款哨兵";
  candidate.tracks = [
    {
      id: "sentinel-one",
      targetGroove: 2,
      clue: "第一线索哨兵",
      note: "第一正文哨兵",
      audioSrc: "./assets/private-audio/one.mp3",
    },
    {
      id: "sentinel-two",
      targetGroove: 6,
      clue: "第二线索哨兵",
      note: "第二正文哨兵",
      audioSrc: "./assets/private-audio/two.wav",
    },
    {
      id: "sentinel-three",
      targetGroove: 10,
      clue: "第三线索哨兵",
      note: "第三正文哨兵",
      audioSrc: "./assets/private-audio/three.ogg",
    },
  ];
  return candidate;
}

function start(state = logic.createInitialState(), rawConfig = config) {
  return logic.transition(state, { type: "START" }, rawConfig);
}

function move(state, groove, rawConfig = config) {
  return logic.transition(state, { type: "MOVE", groove }, rawConfig);
}

function drop(state, rawConfig = config) {
  return logic.transition(state, { type: "DROP_NEEDLE" }, rawConfig);
}

function settle(state, rawConfig = config, reason = "timer", token = state.pendingToken) {
  return logic.transition(
    state,
    { type: "SETTLE_TRACK", token, reason },
    rawConfig,
  );
}

function advance(state, rawConfig = config) {
  return logic.transition(state, { type: "NEXT" }, rawConfig);
}

function finish(rawConfig = config) {
  const sanitized = logic.sanitizeConfig(rawConfig);
  let state = start(logic.createInitialState(), rawConfig);
  for (let index = 0; index < sanitized.tracks.length; index += 1) {
    state = move(state, sanitized.tracks[index].targetGroove, rawConfig);
    state = drop(state, rawConfig);
    state = settle(state, rawConfig);
    if (state.phase === "track-result") state = advance(state, rawConfig);
  }
  return state;
}

function withMutation(mutator) {
  const candidate = candidateConfig();
  mutator(candidate);
  return candidate;
}

test("CommonJS exports the frozen exact API and frozen production config", () => {
  assert.deepEqual(Object.keys(logic).sort(), EXPECTED_API_KEYS);
  assertDeepFrozen(logic);
  assertDeepFrozen(config);
  assert.deepEqual(config, logic.DEFAULT_CONFIG);
  assert.notEqual(config, logic.DEFAULT_CONFIG);
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.GROOVE_COUNT, 12);
  assert.equal(logic.TRACK_COUNT, 3);
  assert.equal(logic.TRACK_SETTLE_MS, 420);
  assert.deepEqual(logic.DEFAULT_TARGETS, [3, 7, 11]);
  assert.deepEqual(logic.ACTION_TYPES, [
    "START",
    "MOVE",
    "DROP_NEEDLE",
    "SETTLE_TRACK",
    "NEXT",
    "RESTART",
  ]);
});

test("classic-script VM exposes config and logic without runtime require calls", () => {
  const configSource = fs.readFileSync(require.resolve("./config.js"), "utf8");
  const logicSource = fs.readFileSync(require.resolve("./logic.js"), "utf8");
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(configSource, context, { filename: "config.js" });
  assert.equal(context.module.exports, context.VINYL_SECRET_CONFIG);
  assert.equal(vm.runInContext("Object.isFrozen(VINYL_SECRET_CONFIG)", context), true);

  context.module = { exports: {} };
  let requireCalls = 0;
  context.require = () => {
    requireCalls += 1;
    throw new Error("logic must not require runtime modules");
  };
  vm.runInContext(logicSource, context, { filename: "logic.js" });
  assert.equal(context.module.exports, context.VINYL_SECRET_LOGIC);
  assert.equal(requireCalls, 0);
  assert.equal(vm.runInContext("Object.isFrozen(VINYL_SECRET_LOGIC)", context), true);
});

test("default config freezes three ordered tracks and ships without audio", () => {
  assert.deepEqual(config.tracks.map((track) => track.id), [
    "first-chat",
    "ordinary-day",
    "many-tomorrows",
  ]);
  assert.deepEqual(config.tracks.map((track) => track.targetGroove), [3, 7, 11]);
  assert.deepEqual(config.tracks.map((track) => track.audioSrc), [null, null, null]);
  assert.equal(new Set(config.tracks.map((track) => track.clue)).size, 3);
  assert.equal(new Set(config.tracks.map((track) => track.note)).size, 3);
});

test("sanitizeConfig clones, trims and deeply freezes exact valid input", () => {
  const candidate = customPrivateConfig();
  candidate.recipientName = "  收件人哨兵  ";
  candidate.tracks[0].clue = "  第一线索哨兵  ";
  const sanitized = logic.sanitizeConfig(candidate);
  assert.notEqual(sanitized, candidate);
  assert.notEqual(sanitized.tracks, candidate.tracks);
  assert.equal(sanitized.recipientName, "收件人哨兵");
  assert.equal(sanitized.tracks[0].clue, "第一线索哨兵");
  assertDeepFrozen(sanitized);

  candidate.recipientName = "被后来修改";
  candidate.tracks[0].note = "被后来修改";
  assert.equal(sanitized.recipientName, "收件人哨兵");
  assert.equal(sanitized.tracks[0].note, "第一正文哨兵");
  assert.deepEqual(logic.sanitizeConfig(sanitized), sanitized);
});

test("all root text fields enforce Unicode code-point boundaries", () => {
  const limits = {
    recipientName: 20,
    finalEyebrow: 36,
    finalTitle: 40,
    finalMessage: 220,
    signature: 48,
  };
  for (const [field, maximum] of Object.entries(limits)) {
    const valid = withMutation((candidate) => {
      candidate[field] = "🌙".repeat(maximum);
    });
    assert.notEqual(logic.sanitizeConfig(valid), logic.DEFAULT_CONFIG, field);

    const tooLong = withMutation((candidate) => {
      candidate[field] = "🌙".repeat(maximum + 1);
    });
    assert.equal(logic.sanitizeConfig(tooLong), logic.DEFAULT_CONFIG, field);

    const blank = withMutation((candidate) => {
      candidate[field] = "   ";
    });
    assert.equal(logic.sanitizeConfig(blank), logic.DEFAULT_CONFIG, field);
  }
});

test("track clue and note enforce exact code-point limits", () => {
  for (const [field, maximum] of [["clue", 72], ["note", 160]]) {
    const valid = withMutation((candidate) => {
      candidate.tracks[0][field] = "声".repeat(maximum);
    });
    assert.notEqual(logic.sanitizeConfig(valid), logic.DEFAULT_CONFIG, field);

    const tooLong = withMutation((candidate) => {
      candidate.tracks[0][field] = "声".repeat(maximum + 1);
    });
    assert.equal(logic.sanitizeConfig(tooLong), logic.DEFAULT_CONFIG, field);
  }
});

test("track ids and target grooves use strict schemas and unique values", () => {
  const invalidIds = [
    "",
    "Upper",
    "1-start",
    "-start",
    "with space",
    "a".repeat(33),
    "中文",
  ];
  for (const id of invalidIds) {
    const candidate = withMutation((value) => {
      value.tracks[0].id = id;
    });
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG, id);
  }
  for (const target of [0, 13, 1.5, NaN, Infinity, "3"]) {
    const candidate = withMutation((value) => {
      value.tracks[0].targetGroove = target;
    });
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG, String(target));
  }

  for (const field of ["id", "targetGroove", "clue", "note"]) {
    const candidate = withMutation((value) => {
      value.tracks[1][field] = value.tracks[0][field];
    });
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG, field);
  }
});

test("audio paths accept only the frozen relative whitelist", () => {
  const validPaths = [
    "./assets/private-audio/a.mp3",
    "./assets/private-audio/A-1_2.wav",
    "./assets/private-audio/voice.take-3.ogg",
  ];
  for (const audioSrc of validPaths) {
    const candidate = withMutation((value) => {
      value.tracks[0].audioSrc = audioSrc;
    });
    assert.equal(logic.sanitizeConfig(candidate).tracks[0].audioSrc, audioSrc);
  }

  const invalidPaths = [
    "",
    "../voice.mp3",
    "./assets/private-audio/../voice.mp3",
    "./assets/private-audio/a..b.mp3",
    ".\\assets\\private-audio\\voice.mp3",
    "./assets/private-audio/voice note.mp3",
    "./assets/private-audio/sub/voice.mp3",
    "https://example.com/voice.mp3",
    "data:audio/mp3;base64,AA==",
    "blob:voice",
    "./assets/private-audio/voice.mp3?x=1",
    "./assets/private-audio/voice.mp3#x",
    "./assets/private-audio/voice%2Emp3",
    "./assets/private-audio/voice.MP3",
    "./assets/private-audio/.voice.mp3",
    "./assets/private-audio/_voice.mp3",
    "./assets/private-audio/-voice.mp3",
    "./assets/private-audio/voice.m4a",
  ];
  for (const audioSrc of invalidPaths) {
    const candidate = withMutation((value) => {
      value.tracks[0].audioSrc = audioSrc;
    });
    assert.equal(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG, audioSrc);
  }
});

test("root config rejects missing, extra, symbol, accessor and hostile proxy fields", () => {
  const missing = candidateConfig();
  delete missing.signature;
  assert.equal(logic.sanitizeConfig(missing), logic.DEFAULT_CONFIG);

  const extra = candidateConfig();
  extra.extra = true;
  assert.equal(logic.sanitizeConfig(extra), logic.DEFAULT_CONFIG);

  const symbol = candidateConfig();
  symbol[Symbol("secret")] = true;
  assert.equal(logic.sanitizeConfig(symbol), logic.DEFAULT_CONFIG);

  const accessor = candidateConfig();
  Object.defineProperty(accessor, "recipientName", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.equal(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);

  const wrongPrototype = Object.assign(Object.create(null), candidateConfig());
  assert.equal(logic.sanitizeConfig(wrongPrototype), logic.DEFAULT_CONFIG);

  const hostile = new Proxy(candidateConfig(), {
    ownKeys() {
      throw new Error("blocked");
    },
  });
  assert.equal(logic.sanitizeConfig(hostile), logic.DEFAULT_CONFIG);
});

test("tracks reject sparse arrays, subclasses, extras, symbols and accessors", () => {
  const sparse = candidateConfig();
  delete sparse.tracks[1];
  assert.equal(logic.sanitizeConfig(sparse), logic.DEFAULT_CONFIG);

  class TrackList extends Array {}
  const subclass = candidateConfig();
  subclass.tracks = new TrackList(...subclass.tracks);
  assert.equal(logic.sanitizeConfig(subclass), logic.DEFAULT_CONFIG);

  const extra = candidateConfig();
  extra.tracks.extra = true;
  assert.equal(logic.sanitizeConfig(extra), logic.DEFAULT_CONFIG);

  const symbol = candidateConfig();
  symbol.tracks[Symbol("x")] = true;
  assert.equal(logic.sanitizeConfig(symbol), logic.DEFAULT_CONFIG);

  const accessor = candidateConfig();
  Object.defineProperty(accessor.tracks, "1", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.equal(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);

  const revoked = candidateConfig();
  const revocableTracks = Proxy.revocable([], {});
  revoked.tracks = revocableTracks.proxy;
  revocableTracks.revoke();
  assert.doesNotThrow(() => logic.sanitizeConfig(revoked));
  assert.equal(logic.sanitizeConfig(revoked), logic.DEFAULT_CONFIG);
});

test("track objects reject wrong prototypes, missing/extra/symbol/accessor fields", () => {
  const missing = candidateConfig();
  delete missing.tracks[0].note;
  assert.equal(logic.sanitizeConfig(missing), logic.DEFAULT_CONFIG);

  const extra = candidateConfig();
  extra.tracks[0].extra = true;
  assert.equal(logic.sanitizeConfig(extra), logic.DEFAULT_CONFIG);

  const symbol = candidateConfig();
  symbol.tracks[0][Symbol("x")] = true;
  assert.equal(logic.sanitizeConfig(symbol), logic.DEFAULT_CONFIG);

  const accessor = candidateConfig();
  Object.defineProperty(accessor.tracks[0], "clue", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.equal(logic.sanitizeConfig(accessor), logic.DEFAULT_CONFIG);

  const wrongPrototype = candidateConfig();
  wrongPrototype.tracks[0] = Object.assign(
    Object.create(null),
    wrongPrototype.tracks[0],
  );
  assert.equal(logic.sanitizeConfig(wrongPrototype), logic.DEFAULT_CONFIG);
});

test("getSignal covers all 144 groove pairs and is symmetric", () => {
  for (let cursor = 1; cursor <= 12; cursor += 1) {
    for (let target = 1; target <= 12; target += 1) {
      const distance = Math.abs(cursor - target);
      const expected = distance === 0
        ? "clear"
        : distance === 1
          ? "near"
          : distance <= 3
            ? "warm"
            : "quiet";
      assert.equal(logic.getSignal(cursor, target), expected);
      assert.equal(logic.getSignal(cursor, target), logic.getSignal(target, cursor));
    }
  }
});

test("getSignal rejects every non-integer and out-of-range groove", () => {
  const invalid = [0, 13, -1, 1.5, NaN, Infinity, -Infinity, "3", null, undefined];
  for (const value of invalid) {
    assert.throws(() => logic.getSignal(value, 3), TypeError);
    assert.throws(() => logic.getSignal(3, value), TypeError);
  }
});

test("initial state is exact, JSON round-trippable and deeply frozen", () => {
  const state = logic.createInitialState();
  assert.deepEqual(state, {
    version: 1,
    phase: "intro",
    trackIndex: 0,
    cursorGroove: 1,
    foundTrackIds: [],
    pendingTrackId: null,
    pendingToken: null,
    lastToken: 0,
    noticeSerial: 0,
    lastNotice: null,
    revision: 0,
  });
  assertDeepFrozen(state);
  assert.equal(logic.assertState(JSON.parse(JSON.stringify(state)), config), true);
});

test("START and MOVE form a deterministic seeking state without notices on movement", () => {
  const initial = logic.createInitialState();
  const seeking = start(initial);
  assert.equal(seeking.phase, "seeking");
  assert.equal(seeking.lastNotice, "started");
  assert.equal(seeking.noticeSerial, 1);
  assert.equal(seeking.revision, 1);

  const moved = move(seeking, 2);
  assert.equal(moved.cursorGroove, 2);
  assert.equal(moved.lastNotice, "started");
  assert.equal(moved.noticeSerial, 1);
  assert.equal(moved.revision, 2);
  assertDeepFrozen(moved);
});

test("wrong DROP_NEEDLE never advances and repeated misses remain announceable", () => {
  let state = start();
  const firstMiss = drop(state);
  assert.equal(firstMiss.phase, "seeking");
  assert.deepEqual(firstMiss.foundTrackIds, []);
  assert.equal(firstMiss.lastNotice, "miss");
  assert.equal(firstMiss.noticeSerial, 2);

  const secondMiss = drop(firstMiss);
  assert.equal(secondMiss.phase, "seeking");
  assert.deepEqual(secondMiss.foundTrackIds, []);
  assert.equal(secondMiss.noticeSerial, 3);
  assert.equal(secondMiss.cursorGroove, 1);
});

test("correct DROP_NEEDLE enters playing without finding the track early", () => {
  const state = drop(move(start(), 3));
  assert.equal(state.phase, "playing");
  assert.deepEqual(state.foundTrackIds, []);
  assert.equal(state.pendingTrackId, "first-chat");
  assert.equal(state.pendingToken, 1);
  assert.equal(state.lastToken, 1);
  assert.equal(state.lastNotice, "hit");
});

test("only the exact pending token settles and all reasons produce equal state", () => {
  const playing = drop(move(start(), 3));
  assert.throws(
    () => settle(playing, config, "timer", playing.pendingToken - 1),
    TypeError,
  );
  assert.equal(settle(playing, config, "timer", playing.pendingToken + 1), playing);

  const results = logic.SETTLE_REASONS.map((reason) => settle(playing, config, reason));
  for (const result of results) {
    assert.deepEqual(result, results[0]);
    assert.equal(result.phase, "track-result");
    assert.deepEqual(result.foundTrackIds, ["first-chat"]);
    assert.equal(result.pendingTrackId, null);
    assert.equal(result.pendingToken, null);
    assertDeepFrozen(result);
  }
});

test("NEXT advances in order and always resets the cursor to groove one", () => {
  let state = settle(drop(move(start(), 3)));
  state = advance(state);
  assert.equal(state.phase, "seeking");
  assert.equal(state.trackIndex, 1);
  assert.equal(state.cursorGroove, 1);
  assert.deepEqual(state.foundTrackIds, ["first-chat"]);
  assert.equal(state.lastNotice, "advanced");
});

test("the canonical three-track route completes with ordered prefix state", () => {
  const state = finish();
  assert.equal(state.phase, "complete");
  assert.deepEqual(state.foundTrackIds, [
    "first-chat",
    "ordinary-day",
    "many-tomorrows",
  ]);
  assert.equal(state.trackIndex, 2);
  assert.equal(state.pendingTrackId, null);
  assert.equal(state.pendingToken, null);
  assert.equal(state.lastToken, 3);
  assert.equal(state.lastNotice, "completed");
  assert.equal(logic.assertState(state, config), true);
});

test("default no-audio route is complete and every playing view exposes null audio", () => {
  let state = start();
  for (const target of [3, 7, 11]) {
    state = drop(move(state, target));
    const view = logic.getViewModel(state, config);
    assert.equal(view.phase, "playing");
    assert.equal(view.audioSrc, null);
    state = settle(state);
    if (state.phase === "track-result") state = advance(state);
  }
  assert.equal(state.phase, "complete");
});

test("RESTART clears visible progress, preserves token monotonicity and rejects stale settle", () => {
  const complete = finish();
  const restarted = logic.transition(complete, { type: "RESTART" }, config);
  assert.equal(restarted.phase, "intro");
  assert.deepEqual(restarted.foundTrackIds, []);
  assert.equal(restarted.lastToken, 3);
  assert.equal(restarted.lastNotice, "restarted");

  let playing = drop(move(start(restarted), 3));
  assert.equal(playing.pendingToken, 4);
  assert.equal(settle(playing, config, "timer", 3), playing);
  playing = settle(playing);
  assert.deepEqual(playing.foundTrackIds, ["first-chat"]);
});

test("canonical legal no-ops preserve identity across every closed phase", () => {
  const intro = logic.createInitialState();
  assert.equal(logic.transition(intro, { type: "NEXT" }, config), intro);

  const seeking = start();
  assert.equal(move(seeking, 1), seeking);
  assert.equal(logic.transition(seeking, { type: "START" }, config), seeking);

  const playing = drop(move(seeking, 3));
  assert.equal(move(playing, 4), playing);
  assert.equal(drop(playing), playing);

  const result = settle(playing);
  assert.equal(logic.transition(result, { type: "RESTART" }, config), result);

  const complete = finish();
  assert.equal(logic.transition(complete, { type: "START" }, config), complete);
  assert.equal(drop(complete), complete);
});

test("valid JSON-cloned no-op state is canonicalized and frozen", () => {
  const completeClone = clone(finish());
  const result = logic.transition(completeClone, { type: "START" }, config);
  assert.notEqual(result, completeClone);
  assert.deepEqual(result, completeClone);
  assertDeepFrozen(result);
});

test("actions require exact plain data-property schemas even in wrong phases", () => {
  const state = logic.createInitialState();
  const invalidActions = [
    null,
    undefined,
    {},
    { type: "DROP" },
    { type: "DROP_NEEDLE", extra: true },
    { type: "MOVE" },
    { type: "MOVE", groove: 0 },
    { type: "MOVE", groove: 13 },
    { type: "MOVE", groove: 1.5 },
    { type: "MOVE", groove: "3" },
    { type: "SETTLE_TRACK", token: 0, reason: "timer" },
    { type: "SETTLE_TRACK", token: 1, reason: "unknown" },
    { type: "SETTLE_TRACK", token: 1 },
    { type: "START", extra: true },
  ];
  for (const action of invalidActions) {
    assert.throws(() => logic.transition(state, action, config), TypeError);
  }

  const symbol = { type: "START" };
  symbol[Symbol("x")] = true;
  assert.throws(() => logic.transition(state, symbol, config), TypeError);

  const accessor = {};
  Object.defineProperty(accessor, "type", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.throws(() => logic.transition(state, accessor, config), TypeError);

  class Action {}
  const subclass = new Action();
  subclass.type = "START";
  assert.throws(() => logic.transition(state, subclass, config), TypeError);
});

test("assertState rejects root schema and counter corruption", () => {
  const base = clone(start());
  const mutations = [
    (state) => { state.extra = true; },
    (state) => { state.version = 2; },
    (state) => { state.phase = "unknown"; },
    (state) => { state.trackIndex = 3; },
    (state) => { state.cursorGroove = 0; },
    (state) => { state.foundTrackIds = ["first-chat"]; },
    (state) => { state.pendingTrackId = "first-chat"; },
    (state) => { state.pendingToken = 1; },
    (state) => { state.lastToken = -1; },
    (state) => { state.noticeSerial = state.revision + 1; },
    (state) => { state.lastNotice = "unknown"; },
    (state) => { state.revision = 0.5; },
  ];
  for (const mutate of mutations) {
    const state = clone(base);
    mutate(state);
    assert.throws(() => logic.assertState(state, config), TypeError);
    assert.throws(() => logic.transition(state, { type: "START" }, config), TypeError);
  }
});

test("assertState rejects sparse, extra, subclass and out-of-order found arrays", () => {
  const result = clone(settle(drop(move(start(), 3))));
  const sparse = clone(result);
  delete sparse.foundTrackIds[0];
  assert.throws(() => logic.assertState(sparse, config), TypeError);

  const extra = clone(result);
  extra.foundTrackIds.extra = true;
  assert.throws(() => logic.assertState(extra, config), TypeError);

  class FoundIds extends Array {}
  const subclass = clone(result);
  subclass.foundTrackIds = new FoundIds("first-chat");
  assert.throws(() => logic.assertState(subclass, config), TypeError);

  const wrongOrder = clone(result);
  wrongOrder.foundTrackIds = ["ordinary-day"];
  assert.throws(() => logic.assertState(wrongOrder, config), TypeError);
});

test("phase-specific pending, notice and completion invariants are closed", () => {
  const playing = clone(drop(move(start(), 3)));
  const badPending = clone(playing);
  badPending.pendingTrackId = "ordinary-day";
  assert.throws(() => logic.assertState(badPending, config), TypeError);

  const badToken = clone(playing);
  badToken.pendingToken += 1;
  assert.throws(() => logic.assertState(badToken, config), TypeError);

  const result = clone(settle(playing));
  result.lastNotice = "hit";
  assert.throws(() => logic.assertState(result, config), TypeError);

  const incomplete = clone(finish());
  incomplete.foundTrackIds.pop();
  assert.throws(() => logic.assertState(incomplete, config), TypeError);
});

test("state created under different track ids cannot be reused while playing", () => {
  const playing = drop(move(start(), 3));
  const otherConfig = candidateConfig();
  otherConfig.tracks[0].id = "another-first";
  assert.throws(() => logic.assertState(playing, otherConfig), TypeError);
  assert.throws(
    () => logic.transition(playing, { type: "DROP_NEEDLE" }, otherConfig),
    TypeError,
  );
});

test("counter exhaustion fails closed without violating safe integers", () => {
  const exhausted = {
    ...clone(logic.createInitialState()),
    lastNotice: "restarted",
    noticeSerial: logic.MAX_COUNTER,
    revision: logic.MAX_COUNTER,
  };
  assert.equal(logic.assertState(exhausted, config), true);
  const result = logic.transition(exhausted, { type: "START" }, config);
  assert.deepEqual(result, exhausted);
  assertDeepFrozen(result);
});

test("intro public view contains no configurable secret", () => {
  const privateConfig = customPrivateConfig();
  const view = logic.getViewModel(logic.createInitialState(), privateConfig);
  const serialized = JSON.stringify(view);
  assert.deepEqual(Object.keys(view).sort(), [
    "intro",
    "lastNotice",
    "noticeSerial",
    "phase",
    "primaryAction",
    "title",
  ]);
  for (const secret of [
    privateConfig.recipientName,
    privateConfig.finalEyebrow,
    privateConfig.finalTitle,
    privateConfig.finalMessage,
    privateConfig.signature,
    ...privateConfig.tracks.flatMap((track) => [
      track.clue,
      track.note,
      track.audioSrc,
      track.id,
    ]),
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  assertDeepFrozen(view);
});

test("seeking view exposes only the current clue and derived signal", () => {
  const privateConfig = customPrivateConfig();
  const state = move(start(logic.createInitialState(), privateConfig), 1, privateConfig);
  const view = logic.getViewModel(state, privateConfig);
  const serialized = JSON.stringify(view);
  assert.equal(view.phase, "seeking");
  assert.equal(view.clue, "第一线索哨兵");
  assert.equal(view.signalCode, "near");
  assert.equal(view.signalLabel, "靠近");
  assert.equal("targetGroove" in view, false);
  assert.equal("note" in view, false);
  assert.equal("audioSrc" in view, false);
  for (const secret of [
    "第一正文哨兵",
    "./assets/private-audio/one.mp3",
    "第二线索哨兵",
    "第二正文哨兵",
    "./assets/private-audio/two.wav",
    "第三线索哨兵",
    "第三正文哨兵",
    "./assets/private-audio/three.ogg",
    "终章正文哨兵",
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
});

test("playing view exposes only the just-hit track note and optional audio metadata", () => {
  const privateConfig = customPrivateConfig();
  const state = drop(
    move(start(logic.createInitialState(), privateConfig), 2, privateConfig),
    privateConfig,
  );
  const view = logic.getViewModel(state, privateConfig);
  const serialized = JSON.stringify(view);
  assert.equal(view.phase, "playing");
  assert.equal(view.note, "第一正文哨兵");
  assert.equal(view.audioSrc, "./assets/private-audio/one.mp3");
  assert.equal(view.pendingToken, 1);
  assert.equal("targetGroove" in view, false);
  for (const secret of [
    "第二线索哨兵",
    "第二正文哨兵",
    "./assets/private-audio/two.wav",
    "第三线索哨兵",
    "第三正文哨兵",
    "./assets/private-audio/three.ogg",
    "终章正文哨兵",
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
});

test("track-result removes audio metadata and NEXT hides the previous note", () => {
  const privateConfig = customPrivateConfig();
  let state = drop(
    move(start(logic.createInitialState(), privateConfig), 2, privateConfig),
    privateConfig,
  );
  state = settle(state, privateConfig);
  const resultView = logic.getViewModel(state, privateConfig);
  assert.equal(resultView.phase, "track-result");
  assert.equal(resultView.note, "第一正文哨兵");
  assert.equal(resultView.audioSrc, null);
  assert.equal(JSON.stringify(resultView).includes("./assets/private-audio/one.mp3"), false);

  state = advance(state, privateConfig);
  const seekingView = logic.getViewModel(state, privateConfig);
  assert.equal(seekingView.clue, "第二线索哨兵");
  assert.equal(JSON.stringify(seekingView).includes("第一正文哨兵"), false);
});

test("complete view exposes final copy and found notes but never audio paths or targets", () => {
  const privateConfig = customPrivateConfig();
  const view = logic.getViewModel(finish(privateConfig), privateConfig);
  const serialized = JSON.stringify(view);
  assert.equal(view.phase, "complete");
  assert.equal(view.recipientName, "收件人哨兵");
  assert.equal(view.finalEyebrow, "眉题哨兵");
  assert.equal(view.finalTitle, "终章标题哨兵");
  assert.equal(view.finalMessage, "终章正文哨兵");
  assert.equal(view.signature, "落款哨兵");
  assert.deepEqual(view.notes, ["第一正文哨兵", "第二正文哨兵", "第三正文哨兵"]);
  assert.equal(view.audioSrc, null);
  assert.equal("targetGroove" in view, false);
  for (const path of privateConfig.tracks.map((track) => track.audioSrc)) {
    assert.equal(serialized.includes(path), false, path);
  }
  assertDeepFrozen(view);
});

test("getViewModel rejects malformed state and atomically falls back on invalid config", () => {
  assert.throws(() => logic.getViewModel({ phase: "intro" }, config), TypeError);
  const invalidConfig = candidateConfig();
  invalidConfig.tracks[0].audioSrc = "../private.mp3";
  const view = logic.getViewModel(logic.createInitialState(), invalidConfig);
  assert.equal(view.phase, "intro");
  assert.equal(logic.sanitizeConfig(invalidConfig), logic.DEFAULT_CONFIG);
});

test("logic source remains free of DOM, media, storage, timer and network APIs", () => {
  const source = fs.readFileSync(require.resolve("./logic.js"), "utf8");
  for (const forbidden of [
    "document.",
    "window.",
    "fetch(",
    "XMLHttpRequest",
    "sendBeacon",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "Audio(",
    "AudioContext",
    "HTMLAudioElement",
    "MediaRecorder",
    "getUserMedia",
    "setTimeout",
    "setInterval",
    "requestAnimationFrame",
    "Math.random",
    "Date.now",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
