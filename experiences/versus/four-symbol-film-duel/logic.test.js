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
  validateGameData,
  normalizePlayerName,
  scoreAnswer,
  buildSchedule,
  getWinner,
  createInitialState,
  reduce,
  getPublicView
} = logic;

function action(state, type, fields = {}) {
  return { type, revision: state.revision, ...fields };
}

function start(packId = DEFAULT_CONFIG.packs[0].id, names = ["阿光", "阿影"]) {
  const initial = createInitialState();
  return reduce(
    initial,
    action(initial, ACTIONS.START_MATCH, { packId, playerNames: names })
  );
}

function enterQuestion(state) {
  return reduce(state, action(state, ACTIONS.ACK_HANDOFF));
}

function choose(state, optionId) {
  return reduce(
    state,
    action(state, ACTIONS.SELECT_OPTION, { optionId })
  );
}

function submit(state) {
  let next = reduce(state, action(state, ACTIONS.OPEN_CONFIRMATION));
  return reduce(next, action(next, ACTIONS.SUBMIT_ANSWER));
}

function correctOption(state) {
  const view = getPublicView(state);
  const internal = DEFAULT_CONFIG.cards.find((card) => card.id === view.currentCard.id);
  return internal.answerOptionId;
}

function wrongOption(state) {
  const view = getPublicView(state);
  const internal = DEFAULT_CONFIG.cards.find((card) => card.id === view.currentCard.id);
  return internal.options.find(
    (option) =>
      option.id !== internal.answerOptionId &&
      option.id !== internal.spotlightRemoves
  ).id;
}

function playRound(state, { correct = true, spotlight = false } = {}) {
  let next = enterQuestion(state);
  if (spotlight) {
    next = reduce(next, action(next, ACTIONS.USE_SPOTLIGHT));
  }
  next = choose(next, correct ? correctOption(next) : wrongOption(next));
  next = submit(next);
  return next;
}

function advance(state) {
  return reduce(state, action(state, ACTIONS.ADVANCE_ROUND));
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
  if (typeof value === "function") return;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function editableConfig() {
  return JSON.parse(JSON.stringify(config));
}

test("exports the exact recursively frozen rule API", () => {
  assert.deepEqual(Object.keys(logic), [
    "CONSTANTS",
    "DEFAULT_CONFIG",
    "ACTIONS",
    "sanitizeConfig",
    "validateGameData",
    "normalizePlayerName",
    "scoreAnswer",
    "buildSchedule",
    "getWinner",
    "createInitialState",
    "reduce",
    "getPublicView"
  ]);
  assert.deepEqual(Object.keys(ACTIONS), [
    "START_MATCH",
    "ACK_HANDOFF",
    "SELECT_OPTION",
    "USE_SPOTLIGHT",
    "OPEN_CONFIRMATION",
    "RETURN_TO_QUESTION",
    "SUBMIT_ANSWER",
    "ADVANCE_ROUND",
    "RESTART"
  ]);
  assertDeepFrozen(logic);
});

test("classic scripts expose editable config and the same frozen browser API", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(require.resolve("./config.js"), "utf8"), sandbox);
  vm.runInNewContext(readFileSync(require.resolve("./logic.js"), "utf8"), sandbox);

  assert.equal(sandbox.window.FOUR_SYMBOL_FILM_CONFIG.cards.length, 32);
  assert.equal(Object.isFrozen(sandbox.window.FOUR_SYMBOL_FILM_CONFIG), false);
  assert.deepEqual(
    Object.keys(sandbox.window.FourSymbolFilmLogic),
    Object.keys(logic)
  );
  assert.equal(
    sandbox.window.FourSymbolFilmLogic.CONSTANTS.ROUND_COUNT,
    CONSTANTS.ROUND_COUNT
  );
  assert.equal(Object.isFrozen(sandbox.window.FourSymbolFilmLogic), true);
});

test("built-in content has 48 safe tokens, 32 cards, 16 pairs and 4 balanced packs", () => {
  assert.deepEqual(validateGameData(config), []);
  assert.equal(DEFAULT_CONFIG.tokens.length, 48);
  assert.equal(DEFAULT_CONFIG.cards.length, 32);
  assert.equal(DEFAULT_CONFIG.packs.length, 4);
  assert.equal(new Set(DEFAULT_CONFIG.cards.flatMap((card) => card.options.map((option) => option.title))).size, 128);

  for (const pack of DEFAULT_CONFIG.packs) {
    const schedule = buildSchedule(pack.id);
    assert.equal(schedule.length, 8);
    assert.deepEqual(
      schedule.map((id) => DEFAULT_CONFIG.cards.find((card) => card.id === id).side),
      ["A", "B", "A", "B", "A", "B", "A", "B"]
    );
    for (let pair = 0; pair < 4; pair += 1) {
      const a = DEFAULT_CONFIG.cards.find((card) => card.id === schedule[pair * 2]);
      const b = DEFAULT_CONFIG.cards.find((card) => card.id === schedule[pair * 2 + 1]);
      assert.equal(a.difficulty, b.difficulty);
      assert.equal(a.genre, b.genre);
    }
  }
});

test("validator detects duplicate token, unknown token, wrong answer, wrong spotlight and broken pair", () => {
  const duplicate = editableConfig();
  duplicate.tokens[1].id = duplicate.tokens[0].id;
  assert.ok(validateGameData(duplicate).some((error) => error.includes("token:1:id")));

  const unknown = editableConfig();
  unknown.cards[0].tokens[0] = "not-in-table";
  assert.ok(validateGameData(unknown).some((error) => error.includes("card:0:tokens")));

  const answer = editableConfig();
  answer.cards[0].answerOptionId = "missing";
  assert.ok(validateGameData(answer).some((error) => error.includes("card:0:answer")));

  const spotlight = editableConfig();
  spotlight.cards[0].spotlightRemoves = spotlight.cards[0].answerOptionId;
  assert.ok(validateGameData(spotlight).some((error) => error.includes("card:0:spotlight")));

  const pair = editableConfig();
  pair.cards[1].difficulty = 3;
  assert.ok(validateGameData(pair).some((error) => error.includes("pair-balance")));
});

test("validator rejects ZWJ, skin, flag, tag and private glyphs", () => {
  const values = [
    "👩‍💻",
    "👍🏽",
    "🇨🇳",
    "🏴\u{e0067}\u{e0062}\u{e007f}",
    "\ue000"
  ];
  for (const glyph of values) {
    const candidate = editableConfig();
    candidate.tokens[0].glyph = glyph;
    assert.ok(validateGameData(candidate).some((error) => error.includes("glyph")));
  }
});

test("sanitizeConfig severs ownership and falls back atomically", () => {
  const candidate = editableConfig();
  candidate.publicTitle = "  四符\u00a0片名擂台  ";
  const safe = sanitizeConfig(candidate);
  assert.equal(safe.publicTitle, "四符 片名擂台");
  assert.notEqual(safe, candidate);
  assert.notEqual(safe.cards, candidate.cards);
  assertDeepFrozen(safe);
  candidate.cards[0].options[0].title = "被修改";
  assert.notEqual(safe.cards[0].options[0].title, "被修改");

  const malformed = editableConfig();
  malformed.cards[0].reviewed = false;
  assert.equal(sanitizeConfig(malformed), DEFAULT_CONFIG);
  assert.equal(sanitizeConfig({ ...editableConfig(), extra: true }), DEFAULT_CONFIG);
});

test("config parsing rejects accessors, sparse arrays, subclasses and hostile proxies", () => {
  const getter = editableConfig();
  Object.defineProperty(getter.cards[0], "rationale", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    }
  });
  assert.equal(sanitizeConfig(getter), DEFAULT_CONFIG);

  const sparse = editableConfig();
  sparse.cards[0].tokens = new Array(4);
  assert.equal(sanitizeConfig(sparse), DEFAULT_CONFIG);

  class Tokens extends Array {}
  const subclass = editableConfig();
  subclass.tokens = new Tokens(...subclass.tokens);
  assert.equal(sanitizeConfig(subclass), DEFAULT_CONFIG);

  const hostile = new Proxy(editableConfig(), {
    ownKeys() {
      throw new Error("hostile");
    }
  });
  assert.equal(sanitizeConfig(hostile), DEFAULT_CONFIG);
});

test("nested config arrays and data validation never perform ordinary property gets", () => {
  const candidate = editableConfig();
  candidate.publicTitle = "代理配置";
  let nestedGets = 0;
  candidate.tokens[0].concepts = new Proxy(candidate.tokens[0].concepts, {
    get() {
      nestedGets += 1;
      throw new Error("ordinary nested get must not run");
    }
  });
  const sanitized = sanitizeConfig(candidate);
  assert.equal(sanitized.publicTitle, "代理配置");
  assert.equal(nestedGets, 0);

  const source = editableConfig();
  let topLevelGets = 0;
  const dataProxy = new Proxy(source, {
    get() {
      topLevelGets += 1;
      throw new Error("ordinary top-level get must not run");
    }
  });
  assert.deepEqual(validateGameData(dataProxy), []);
  assert.equal(topLevelGets, 0);

  let accessorCalls = 0;
  const accessor = editableConfig();
  Object.defineProperty(accessor, "tokens", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return source.tokens;
    }
  });
  assert.ok(validateGameData(accessor).length > 0);
  assert.equal(accessorCalls, 0);
});

test("player names normalize Unicode whitespace and fall back safely", () => {
  assert.equal(normalizePlayerName("  阿\u00a0光  ", "玩家 A"), "阿 光");
  assert.equal(normalizePlayerName("   ", "玩家 A"), "玩家 A");
  assert.equal(normalizePlayerName("x".repeat(13), "玩家 A"), "玩家 A");
  assert.equal(normalizePlayerName("\ud800", "玩家 A"), "玩家 A");
  assert.equal(normalizePlayerName("安全\u202e名字", "玩家 A"), "玩家 A");
});

test("score contract is exactly 2, 1, 0 and rejects malformed records", () => {
  assert.equal(scoreAnswer({ isCorrect: true, spotlightUsed: false }), 2);
  assert.equal(scoreAnswer({ isCorrect: true, spotlightUsed: true }), 1);
  assert.equal(scoreAnswer({ isCorrect: false, spotlightUsed: false }), 0);
  assert.equal(scoreAnswer({ isCorrect: false, spotlightUsed: true }), 0);
  assert.equal(scoreAnswer({ isCorrect: true, spotlightUsed: false, extra: 1 }), null);
  assert.equal(scoreAnswer({ isCorrect: 1, spotlightUsed: false }), null);
});

test("initial state, start and handoff preserve exact deterministic schedule", () => {
  const initial = createInitialState();
  assert.equal(initial.phase, "setup");
  assert.equal(initial.revision, 0);
  assert.deepEqual(initial.schedule, []);
  assertDeepFrozen(initial);

  const started = start(DEFAULT_CONFIG.packs[1].id, ["  ", "小影"]);
  assert.equal(started.phase, "handoff");
  assert.equal(started.players[0].name, "玩家 A");
  assert.equal(started.players[1].name, "小影");
  assert.deepEqual(started.schedule, buildSchedule(DEFAULT_CONFIG.packs[1].id));
  assert.equal(started.revision, 1);

  const question = enterQuestion(started);
  assert.equal(question.phase, "question");
  assert.equal(question.revision, 2);
});

test("invalid pack, stale revision, extra fields and wrong phase are identity no-ops", () => {
  const initial = createInitialState();
  assert.equal(
    reduce(initial, action(initial, ACTIONS.START_MATCH, { packId: "missing", playerNames: ["A", "B"] })),
    initial
  );

  const started = start();
  assert.equal(
    reduce(started, { type: ACTIONS.ACK_HANDOFF, revision: started.revision - 1 }),
    started
  );
  assert.equal(
    reduce(started, { type: ACTIONS.ACK_HANDOFF, revision: started.revision, extra: true }),
    started
  );
  assert.equal(
    reduce(started, action(started, ACTIONS.SUBMIT_ANSWER)),
    started
  );
});

test("selection is single, movable and eliminated options cannot be selected", () => {
  let state = enterQuestion(start());
  const card = getPublicView(state).currentCard;
  state = choose(state, card.options[0].id);
  assert.equal(state.selectedOptionId, card.options[0].id);
  const moved = choose(state, card.options[1].id);
  assert.equal(moved.selectedOptionId, card.options[1].id);
  assert.equal(choose(moved, card.options[1].id), moved);

  const lit = reduce(moved, action(moved, ACTIONS.USE_SPOTLIGHT));
  assert.equal(
    choose(lit, lit.eliminatedOptionId),
    lit
  );
});

test("spotlight is atomic, clears the eliminated selection and cannot be reused", () => {
  let state = enterQuestion(start());
  const internal = DEFAULT_CONFIG.cards.find(
    (card) => card.id === getPublicView(state).currentCard.id
  );
  state = choose(state, internal.spotlightRemoves);
  const lit = reduce(state, action(state, ACTIONS.USE_SPOTLIGHT));
  assert.equal(lit.players[0].spotlights, 1);
  assert.equal(lit.players[1].spotlights, 2);
  assert.equal(lit.selectedOptionId, null);
  assert.equal(lit.eliminatedOptionId, internal.spotlightRemoves);
  assert.equal(lit.spotlightUsedThisRound, true);
  assert.equal(reduce(lit, action(lit, ACTIONS.USE_SPOTLIGHT)), lit);
});

test("confirmation can return without settlement, but submit settles exactly once", () => {
  let state = enterQuestion(start());
  state = choose(state, correctOption(state));
  const confirm = reduce(state, action(state, ACTIONS.OPEN_CONFIRMATION));
  assert.equal(confirm.phase, "confirm");
  assert.equal(confirm.results.length, 0);
  const returned = reduce(confirm, action(confirm, ACTIONS.RETURN_TO_QUESTION));
  assert.equal(returned.phase, "question");
  assert.equal(returned.results.length, 0);

  const reconfirmed = reduce(returned, action(returned, ACTIONS.OPEN_CONFIRMATION));
  const result = reduce(reconfirmed, action(reconfirmed, ACTIONS.SUBMIT_ANSWER));
  assert.equal(result.phase, "result");
  assert.equal(result.results.length, 1);
  assert.equal(result.players[0].score, 2);
  assert.equal(reduce(result, action(result, ACTIONS.SUBMIT_ANSWER)), result);
});

test("direct correct scores 2, spotlight correct scores 1 and either wrong scores 0", () => {
  const direct = playRound(start(), { correct: true });
  assert.equal(direct.results[0].scoreAwarded, 2);

  const hinted = playRound(start(), { correct: true, spotlight: true });
  assert.equal(hinted.results[0].scoreAwarded, 1);

  const wrong = playRound(start(), { correct: false });
  assert.equal(wrong.results[0].scoreAwarded, 0);

  const hintedWrong = playRound(start(), { correct: false, spotlight: true });
  assert.equal(hintedWrong.results[0].scoreAwarded, 0);
  assert.equal(hintedWrong.players[0].spotlights, 1);
});

test("eight rounds strictly alternate, give four each and consume at most two spotlights each", () => {
  let state = start();
  for (let round = 0; round < 8; round += 1) {
    state = playRound(state, {
      correct: true,
      spotlight: round < 4
    });
    assert.equal(state.results.at(-1).playerId, round % 2 === 0 ? "A" : "B");
    if (round < 7) state = advance(state);
  }
  assert.deepEqual(
    state.results.map((result) => result.playerId),
    ["A", "B", "A", "B", "A", "B", "A", "B"]
  );
  assert.equal(state.results.filter((result) => result.playerId === "A").length, 4);
  assert.equal(state.results.filter((result) => result.playerId === "B").length, 4);
  assert.equal(state.players[0].spotlights, 0);
  assert.equal(state.players[1].spotlights, 0);
  assert.equal(state.phase, "result");

  state = advance(state);
  assert.equal(state.phase, "summary");
  assert.equal(state.results.length, 8);
});

test("score totals equal result sums and all winner outcomes are stable", () => {
  let state = start();
  for (let round = 0; round < 8; round += 1) {
    state = playRound(state, { correct: round % 2 === 0 });
    if (round < 7) state = advance(state);
  }
  assert.equal(
    state.players[0].score,
    state.results.filter((result) => result.playerId === "A").reduce((sum, result) => sum + result.scoreAwarded, 0)
  );
  assert.equal(
    state.players[1].score,
    state.results.filter((result) => result.playerId === "B").reduce((sum, result) => sum + result.scoreAwarded, 0)
  );
  assert.equal(getWinner(state.players), "A");
  assert.equal(getWinner([{ score: 1 }, { score: 2 }]), "B");
  assert.equal(getWinner([{ score: 2 }, { score: 2 }]), "tie");
  assert.equal(getWinner([{ score: -1 }, { score: 0 }]), null);
});

test("winner calculation does not execute array or score getters", () => {
  let arrayGets = 0;
  const players = new Proxy([{ score: 3 }, { score: 1 }], {
    get(target, key, receiver) {
      arrayGets += 1;
      return Reflect.get(target, key, receiver);
    }
  });
  assert.equal(getWinner(players), "A");
  assert.equal(arrayGets, 0);

  let scoreGets = 0;
  const accessorPlayer = {};
  Object.defineProperty(accessorPlayer, "score", {
    enumerable: true,
    get() {
      scoreGets += 1;
      return 3;
    }
  });
  assert.equal(getWinner([accessorPlayer, { score: 1 }]), null);
  assert.equal(scoreGets, 0);
});

test("round advance resets transient fields and only round eight can summarize", () => {
  let state = playRound(start(), { correct: true, spotlight: true });
  const next = advance(state);
  assert.equal(next.phase, "handoff");
  assert.equal(next.roundIndex, 1);
  assert.equal(next.selectedOptionId, null);
  assert.equal(next.spotlightUsedThisRound, false);
  assert.equal(next.eliminatedOptionId, null);
  assert.equal(next.results.length, 1);
});

test("public view hides answer and rationale until result and never exposes schedule", () => {
  let state = start();
  let view = getPublicView(state);
  assert.equal(view.currentCard, null);
  assert.equal(view.availablePacks.length, 4);
  assert.equal("schedule" in view, false);
  assert.equal("content" in view, false);

  state = enterQuestion(state);
  view = getPublicView(state);
  assert.equal("correctOptionId" in view.currentCard, false);
  assert.equal("rationale" in view.currentCard, false);
  assert.equal("answerOptionId" in view.currentCard, false);

  state = choose(state, correctOption(state));
  state = submit(state);
  view = getPublicView(state);
  assert.equal(typeof view.currentCard.correctOptionId, "string");
  assert.equal(typeof view.currentCard.rationale, "string");
  assert.equal(view.lastResult.isCorrect, true);
  assertDeepFrozen(view);
});

test("summary exposes only settled review data and tie ends without extra round", () => {
  let state = start();
  for (let round = 0; round < 8; round += 1) {
    state = playRound(state, { correct: true });
    state = advance(state);
  }
  const view = getPublicView(state);
  assert.equal(view.phase, "summary");
  assert.equal(view.roundNumber, 8);
  assert.equal(view.currentCard, null);
  assert.equal(view.summary.winner, "tie");
  assert.equal(view.summary.results.length, 8);
  assert.equal(view.summary.results[0].tokens.length, 4);
  assert.equal(state.schedule.length, 8);
});

test("restart is summary-only, clears the match and keeps revision monotonic", () => {
  const started = start();
  assert.equal(reduce(started, action(started, ACTIONS.RESTART)), started);

  let state = started;
  for (let round = 0; round < 8; round += 1) {
    state = playRound(state, { correct: true });
    state = advance(state);
  }
  const restarted = reduce(state, action(state, ACTIONS.RESTART));
  assert.equal(restarted.phase, "setup");
  assert.equal(restarted.revision, state.revision + 1);
  assert.deepEqual(restarted.schedule, []);
  assert.deepEqual(restarted.results, []);
  assert.equal(restarted.players[0].score, 0);
  assert.equal(
    reduce(restarted, {
      type: ACTIONS.START_MATCH,
      revision: 0,
      packId: DEFAULT_CONFIG.packs[0].id,
      playerNames: ["旧 A", "旧 B"]
    }),
    restarted
  );
});

test("foreign, cloned and hostile states fail closed to a fresh setup", () => {
  const state = start();
  const clone = JSON.parse(JSON.stringify(state));
  const reset = reduce(clone, { type: ACTIONS.ACK_HANDOFF, revision: clone.revision });
  assert.equal(reset.phase, "setup");
  assert.equal(reset.revision, 0);

  const hostile = new Proxy({}, {
    get() {
      throw new Error("must not read");
    }
  });
  assert.equal(getPublicView(hostile).phase, "setup");
});

test("action getters, sparse names, array subclasses and polluted schemas are no-ops", () => {
  const initial = createInitialState();
  const getter = {};
  Object.defineProperty(getter, "type", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    }
  });
  Object.defineProperty(getter, "revision", {
    enumerable: true,
    value: initial.revision
  });
  assert.equal(reduce(initial, getter), initial);

  const sparse = {
    type: ACTIONS.START_MATCH,
    revision: initial.revision,
    packId: DEFAULT_CONFIG.packs[0].id,
    playerNames: new Array(2)
  };
  assert.equal(reduce(initial, sparse), initial);

  class Names extends Array {}
  const subclass = {
    ...sparse,
    playerNames: new Names("A", "B")
  };
  assert.equal(reduce(initial, subclass), initial);
});

test("maximum revision stops every action without integer overflow", () => {
  const initial = createInitialState();
  let state = initial;
  for (let index = 0; index < 2; index += 1) {
    state = index === 0 ? start() : state;
  }
  const forged = {
    ...state,
    revision: CONSTANTS.MAX_REVISION
  };
  const reset = reduce(forged, {
    type: ACTIONS.ACK_HANDOFF,
    revision: CONSTANTS.MAX_REVISION
  });
  assert.equal(reset.phase, "setup");
  assert.equal(reset.revision, 0);
});

test("production core has no network, storage, DOM, random, clock or media dependency", () => {
  const source = readFileSync(require.resolve("./logic.js"), "utf8");
  for (const forbidden of [
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "localStorage",
    "sessionStorage",
    "document.",
    "Math.random",
    "Date.now",
    "setTimeout",
    "AudioContext",
    "new Audio"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
