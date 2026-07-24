"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const configApi = require("./config.js");
const logic = require("./logic.js");

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function throwingProxy() {
  return new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype");
    },
    ownKeys() {
      throw new Error("hostile keys");
    },
  });
}

function start(seed = 1) {
  return logic.reduceGardenResourceDuel(
    logic.createInitialState(),
    { type: "START_MATCH", seed },
  );
}

function chooseCurrent(state, card) {
  const seat = state.activeSeat;
  const choosing = logic.reduceGardenResourceDuel(
    state,
    { type: "TAKE_SEAT", playerIndex: seat },
  );
  return logic.reduceGardenResourceDuel(
    choosing,
    { type: "SEAL_CARD", playerIndex: seat, card },
  );
}

function playRound(state, cards) {
  let next = logic.reduceGardenResourceDuel(state, { type: "BEGIN_ROUND" });
  const firstSeat = next.activeSeat;
  next = chooseCurrent(next, cards[firstSeat]);
  const secondSeat = next.activeSeat;
  next = chooseCurrent(next, cards[secondSeat]);
  return logic.reduceGardenResourceDuel(next, { type: "REVEAL_ROUND" });
}

function uniquePermutations(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  const ordered = [...counts.keys()];
  const result = [];
  const current = [];
  function visit() {
    if (current.length === values.length) {
      result.push(current.slice());
      return;
    }
    for (const value of ordered) {
      const remaining = counts.get(value);
      if (remaining === 0) continue;
      counts.set(value, remaining - 1);
      current.push(value);
      visit();
      current.pop();
      counts.set(value, remaining);
    }
  }
  visit();
  return result;
}

test("导出冻结规则常量、配置与 UMD 全局", () => {
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.PLAYER_COUNT, 2);
  assert.equal(logic.ROUND_COUNT, 6);
  assert.equal(logic.BLOOM_TARGET, 5);
  assert.deepEqual(logic.CARD_TYPES, ["sun", "water", "pest"]);
  assert.deepEqual(logic.SEASON_TYPES, ["sun", "water"]);
  assert.deepEqual(logic.PETAL_VALUES, [1, 1, 2, 2, 3, 3]);
  assert.deepEqual(logic.INITIAL_HAND, { sun: 2, water: 2, pest: 2 });
  assert.deepEqual(logic.PHASES, [
    "intro",
    "season",
    "handoff",
    "choosing",
    "ready-to-reveal",
    "round-result",
    "match-result",
  ]);
  assert.deepEqual(logic.ACTION_TYPES, [
    "START_MATCH",
    "BEGIN_ROUND",
    "TAKE_SEAT",
    "COVER",
    "SEAL_CARD",
    "REVEAL_ROUND",
    "NEXT_ROUND",
    "RESTART_MATCH",
  ]);
  assert.equal(logic.DEFAULT_CONFIG, configApi.DEFAULT_CONFIG);
  assertDeepFrozen(configApi);
  assertDeepFrozen(logic);
});

test("真实 require 与浏览器经典脚本暴露同构冻结 API", () => {
  assert.equal(configApi, globalThis.GardenResourceDuelConfig);
  assert.equal(logic, globalThis.GardenResourceDuelLogic);

  const context = vm.createContext({});
  vm.runInContext(
    readFileSync(path.join(__dirname, "config.js"), "utf8"),
    context,
    { filename: "config.js" },
  );
  vm.runInContext(
    readFileSync(path.join(__dirname, "logic.js"), "utf8"),
    context,
    { filename: "logic.js" },
  );
  assert.equal(context.GardenResourceDuelConfig.DEFAULT_CONFIG.title, configApi.DEFAULT_CONFIG.title);
  assert.deepEqual(
    Array.from(context.GardenResourceDuelLogic.generateSeasonDeck(1)),
    logic.generateSeasonDeck(1),
  );
  assert.equal(context.GardenResourceDuelLogic.VERSION, logic.VERSION);
  assert.equal(Object.isFrozen(context.GardenResourceDuelConfig), true);
  assert.equal(Object.isFrozen(context.GardenResourceDuelLogic), true);
});

test("初态和重开递归冻结且深相等", () => {
  const initial = logic.createInitialState();
  assert.deepEqual(initial, {
    version: 1,
    phase: "intro",
    seed: null,
    seasonDeck: [],
    roundIndex: 0,
    firstSeat: 0,
    activeSeat: null,
    hands: [
      { sun: 2, water: 2, pest: 2 },
      { sun: 2, water: 2, pest: 2 },
    ],
    sealedCards: [null, null],
    scores: [0, 0],
    history: [],
    result: null,
    revision: 0,
    lastNotice: null,
  });
  assertDeepFrozen(initial);

  let terminal = start(1);
  const pairedCards = ["pest", "pest", "sun", "sun", "water", "water"];
  for (const card of pairedCards) {
    terminal = playRound(terminal, [card, card]);
    if (terminal.phase === "match-result") break;
    terminal = logic.reduceGardenResourceDuel(terminal, { type: "NEXT_ROUND" });
  }
  assert.equal(terminal.phase, "match-result");
  const restarted = logic.reduceGardenResourceDuel(terminal, { type: "RESTART_MATCH" });
  assert.deepEqual(restarted, initial);
  assert.notEqual(restarted, initial);
  assertDeepFrozen(restarted);
  assert.equal(logic.reduceGardenResourceDuel(initial, { type: "RESTART_MATCH" }), initial);
});

test("seed 严格、确定、跨调用隔离且牌堆始终三阳光三雨露", () => {
  assert.deepEqual(logic.generateSeasonDeck(1), [
    "sun", "water", "sun", "sun", "water", "water",
  ]);
  assert.deepEqual(logic.generateSeasonDeck(0xFFFFFFFF), [
    "sun", "water", "sun", "water", "sun", "water",
  ]);
  const first = logic.generateSeasonDeck(123456789);
  const second = logic.generateSeasonDeck(123456789);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.equal(first.filter((card) => card === "sun").length, 3);
  assert.equal(first.filter((card) => card === "water").length, 3);
  assertDeepFrozen(first);
  for (const seed of [undefined, null, 0, -1, 1.5, Number.NaN, 0x100000000, "1"]) {
    assert.throws(() => logic.generateSeasonDeck(seed), TypeError);
  }
  assert.throws(() => logic.generateSeasonDeck(1, 2), TypeError);
});

test("resolveRound 覆盖两种季节的全部 3×3 联合牌面并保持原子结算", () => {
  for (const seasonNeed of logic.SEASON_TYPES) {
    for (const first of logic.CARD_TYPES) {
      for (const second of logic.CARD_TYPES) {
        const input = {
          roundIndex: 2,
          seasonNeed,
          petalValue: 2,
          cards: [first, second],
          scoreBefore: [3, 4],
        };
        const result = logic.resolveRound(input);
        const expectedBlocked = [second === "pest", first === "pest"];
        const expectedEarned = [
          first === seasonNeed && !expectedBlocked[0] ? 2 : 0,
          second === seasonNeed && !expectedBlocked[1] ? 2 : 0,
        ];
        assert.deepEqual(result.blocked, expectedBlocked);
        assert.deepEqual(result.earned, expectedEarned);
        assert.deepEqual(result.scoreBefore, [3, 4]);
        assert.deepEqual(result.scoreAfter, [
          3 + expectedEarned[0],
          4 + expectedEarned[1],
        ]);
        assertDeepFrozen(result);
        input.cards[0] = "pest";
        input.scoreBefore[0] = 99;
        assert.deepEqual(result.cards, [first, second]);
        assert.deepEqual(result.scoreBefore, [3, 4]);
      }
    }
  }
});

test("严格动作解析拒绝缺键、多键、访问器、symbol、继承、数组和 Proxy", () => {
  const initial = logic.createInitialState();
  const nullPrototypeAction = Object.assign(Object.create(null), {
    type: "START_MATCH",
    seed: 7,
  });
  assert.equal(
    logic.reduceGardenResourceDuel(initial, nullPrototypeAction).phase,
    "season",
  );

  const accessor = {};
  Object.defineProperty(accessor, "type", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  const symbolAction = { type: "BEGIN_ROUND", [Symbol("extra")]: true };
  const inherited = Object.assign(Object.create({ type: "BEGIN_ROUND" }), {});
  for (const action of [
    null,
    [],
    {},
    { type: "NOPE" },
    { type: "BEGIN_ROUND", extra: true },
    { type: "START_MATCH" },
    { type: "START_MATCH", seed: 0 },
    { type: "TAKE_SEAT", playerIndex: 0.5 },
    { type: "SEAL_CARD", playerIndex: 0, card: "moon" },
    accessor,
    symbolAction,
    inherited,
    throwingProxy(),
  ]) {
    assert.throws(() => logic.reduceGardenResourceDuel(initial, action), TypeError);
  }
});

test("动作 Proxy 的 type descriptor 只快照一次，不能把 START_MATCH 变成 RESTART_MATCH", () => {
  const target = { type: "START_MATCH", seed: 73 };
  let typeDescriptorReads = 0;
  const action = new Proxy(target, {
    getOwnPropertyDescriptor(source, key) {
      if (key === "type") {
        typeDescriptorReads += 1;
        return {
          value: typeDescriptorReads === 1 ? "START_MATCH" : "RESTART_MATCH",
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }
      return Reflect.getOwnPropertyDescriptor(source, key);
    },
  });
  const state = logic.reduceGardenResourceDuel(logic.createInitialState(), action);
  assert.equal(state.phase, "season");
  assert.equal(state.seed, 73);
  assert.equal(typeDescriptorReads, 1);
});

test("阶段不允许、错席位和已用尽的合法动作返回同一引用", () => {
  const initial = logic.createInitialState();
  assert.equal(
    logic.reduceGardenResourceDuel(initial, { type: "BEGIN_ROUND" }),
    initial,
  );
  const season = start(9);
  assert.equal(
    logic.reduceGardenResourceDuel(season, { type: "TAKE_SEAT", playerIndex: 0 }),
    season,
  );
  const handoff = logic.reduceGardenResourceDuel(season, { type: "BEGIN_ROUND" });
  assert.equal(
    logic.reduceGardenResourceDuel(handoff, { type: "TAKE_SEAT", playerIndex: 1 }),
    handoff,
  );
  const choosing = logic.reduceGardenResourceDuel(
    handoff,
    { type: "TAKE_SEAT", playerIndex: 0 },
  );
  assert.equal(
    logic.reduceGardenResourceDuel(
      choosing,
      { type: "SEAL_CARD", playerIndex: 1, card: "sun" },
    ),
    choosing,
  );
});

test("reducer 与两个 view 只消费 state descriptor 快照，不触发验证后的 get", () => {
  function rejectPostValidationGet(state) {
    return new Proxy(state, {
      get(_target, key) {
        throw new Error(`post-validation get: ${String(key)}`);
      },
    });
  }

  const seasonProxy = rejectPostValidationGet(start(83));
  const noOp = logic.reduceGardenResourceDuel(seasonProxy, { type: "NEXT_ROUND" });
  assert.equal(noOp, seasonProxy);
  const handoff = logic.reduceGardenResourceDuel(seasonProxy, { type: "BEGIN_ROUND" });
  assert.equal(handoff.phase, "handoff");
  assert.equal(handoff.activeSeat, 0);
  assert.deepEqual(logic.getPublicView(seasonProxy).scores, [0, 0]);

  const choosing = logic.reduceGardenResourceDuel(
    handoff,
    { type: "TAKE_SEAT", playerIndex: 0 },
  );
  const choosingProxy = rejectPostValidationGet(choosing);
  assert.deepEqual(logic.getPlayerView(choosingProxy, 0).availableCards, [
    { card: "sun", remainingAtRoundStart: 2 },
    { card: "water", remainingAtRoundStart: 2 },
    { card: "pest", remainingAtRoundStart: 2 },
  ]);
  assert.equal(
    logic.getPlayerView(choosingProxy, 1).phase,
    "choosing",
  );
});

test("最大安全 revision 的合法转换 fail closed 并保持原 state 引用", () => {
  const season = start(89);
  const maximumRevision = Object.freeze({
    ...season,
    revision: Number.MAX_SAFE_INTEGER,
  });
  logic.assertState(maximumRevision);
  const result = logic.reduceGardenResourceDuel(
    maximumRevision,
    { type: "BEGIN_ROUND" },
  );
  assert.equal(result, maximumRevision);
  assert.equal(result.revision, Number.MAX_SAFE_INTEGER);
  logic.assertState(result);
});

test("COVER 幂等遮屏，不改变手牌、封牌、分数或历史", () => {
  let state = logic.reduceGardenResourceDuel(start(11), { type: "BEGIN_ROUND" });
  state = logic.reduceGardenResourceDuel(state, { type: "TAKE_SEAT", playerIndex: 0 });
  const covered = logic.reduceGardenResourceDuel(state, { type: "COVER", playerIndex: 0 });
  assert.equal(covered.phase, "handoff");
  assert.equal(covered.activeSeat, 0);
  assert.deepEqual(covered.hands, state.hands);
  assert.deepEqual(covered.sealedCards, [null, null]);
  assert.deepEqual(covered.scores, [0, 0]);
  assert.deepEqual(covered.history, []);
  assert.equal(covered.revision, state.revision + 1);
  assert.equal(
    logic.reduceGardenResourceDuel(covered, { type: "COVER", playerIndex: 0 }),
    covered,
  );
});

test("第一位封牌不扣手牌，第二位无法从公开 view 推断牌种", () => {
  let state = logic.reduceGardenResourceDuel(start(21), { type: "BEGIN_ROUND" });
  state = logic.reduceGardenResourceDuel(state, { type: "TAKE_SEAT", playerIndex: 0 });
  const beforeHands = state.hands;
  state = logic.reduceGardenResourceDuel(
    state,
    { type: "SEAL_CARD", playerIndex: 0, card: "pest" },
  );
  assert.equal(state.phase, "handoff");
  assert.equal(state.activeSeat, 1);
  assert.deepEqual(state.hands, beforeHands);
  const view = logic.getPublicView(state);
  assert.deepEqual(Object.keys(view).sort(), [
    "activeSeat",
    "firstSeat",
    "hands",
    "history",
    "petalValue",
    "phase",
    "revision",
    "roundIndex",
    "scores",
    "sealedCount",
    "seasonNeed",
  ].sort());
  assert.equal(view.sealedCount, 1);
  assert.equal(Object.hasOwn(view, "sealedCards"), false);
  assert.deepEqual(view.hands, [
    { sun: 2, water: 2, pest: 2 },
    { sun: 2, water: 2, pest: 2 },
  ]);
});

test("ready view 只公开流程计数，player view 只给当前席位可用牌", () => {
  let state = logic.reduceGardenResourceDuel(start(31), { type: "BEGIN_ROUND" });
  state = chooseCurrent(state, "sun");
  state = logic.reduceGardenResourceDuel(
    state,
    { type: "TAKE_SEAT", playerIndex: state.activeSeat },
  );
  const wrongSeatView = logic.getPlayerView(state, 0);
  assert.equal(Object.hasOwn(wrongSeatView, "availableCards"), false);
  const playerView = logic.getPlayerView(state, 1);
  assert.deepEqual(playerView.availableCards, [
    { card: "sun", remainingAtRoundStart: 2 },
    { card: "water", remainingAtRoundStart: 2 },
    { card: "pest", remainingAtRoundStart: 2 },
  ]);
  assert.equal(Object.hasOwn(playerView, "sealedCards"), false);
  state = logic.reduceGardenResourceDuel(
    state,
    { type: "SEAL_CARD", playerIndex: 1, card: "water" },
  );
  assert.equal(state.phase, "ready-to-reveal");
  const ready = logic.getPublicView(state);
  assert.deepEqual(Object.keys(ready).sort(), [
    "petalValue",
    "phase",
    "revision",
    "roundIndex",
    "scores",
    "sealedCount",
    "seasonNeed",
  ].sort());
  assert.equal(ready.sealedCount, 2);
  assert.equal(Object.hasOwn(ready, "sealedCards"), false);
  assert.equal(Object.hasOwn(ready, "hands"), false);
  assert.throws(() => logic.getPlayerView(state, -1), TypeError);
  assertDeepFrozen(ready);
});

test("揭晓后才同时扣牌、加分、公开历史并清空封牌", () => {
  const seed = 1;
  const season = start(seed);
  assert.equal(season.seasonDeck[0], "sun");
  const result = playRound(season, ["sun", "sun"]);
  assert.equal(result.phase, "round-result");
  assert.deepEqual(result.hands, [
    { sun: 1, water: 2, pest: 2 },
    { sun: 1, water: 2, pest: 2 },
  ]);
  assert.deepEqual(result.scores, [1, 1]);
  assert.deepEqual(result.sealedCards, [null, null]);
  assert.deepEqual(result.history[0].earned, [1, 1]);
  assert.deepEqual(result.history[0].scoreBefore, [0, 0]);
  assert.deepEqual(result.history[0].scoreAfter, [1, 1]);
  const view = logic.getPublicView(result);
  assert.deepEqual(view.roundRecord.cards, ["sun", "sun"]);
  assert.notEqual(view.history, result.history);
  assertDeepFrozen(result);
  assertDeepFrozen(view);
});

test("firstSeat 六轮交替，手牌不能重复使用或变负", () => {
  let state = start(1);
  const expectedFirstSeats = [0, 1, 0, 1, 0, 1];
  const pairedCards = ["water", "water", "pest", "pest", "sun", "sun"];
  for (let round = 0; round < 6 && state.phase !== "match-result"; round += 1) {
    assert.equal(state.firstSeat, expectedFirstSeats[round]);
    const cards = [pairedCards[round], pairedCards[round]];
    state = playRound(state, cards);
    for (const hand of state.hands) {
      for (const card of logic.CARD_TYPES) assert.ok(hand[card] >= 0);
    }
    if (state.phase === "round-result") {
      state = logic.reduceGardenResourceDuel(state, { type: "NEXT_ROUND" });
    }
  }
  assert.equal(state.phase, "match-result");
  assert.deepEqual(state.hands, [
    { sun: 0, water: 0, pest: 0 },
    { sun: 0, water: 0, pest: 0 },
  ]);
});

test("终局顺序覆盖单方开花、同时开花、轮次上限胜和平局", () => {
  assert.deepEqual(logic.determineTerminalResult(3, [5, 4], 8), {
    outcome: "win",
    winnerIndex: 0,
    reason: "bloom",
    scores: [5, 4],
    completedRounds: 4,
    seed: 8,
  });
  assert.deepEqual(logic.determineTerminalResult(4, [6, 5], 8), {
    outcome: "draw",
    winnerIndex: null,
    reason: "simultaneous-bloom",
    scores: [6, 5],
    completedRounds: 5,
    seed: 8,
  });
  assert.deepEqual(logic.determineTerminalResult(5, [4, 3], 8), {
    outcome: "win",
    winnerIndex: 0,
    reason: "round-cap",
    scores: [4, 3],
    completedRounds: 6,
    seed: 8,
  });
  assert.deepEqual(logic.determineTerminalResult(5, [4, 4], 8), {
    outcome: "draw",
    winnerIndex: null,
    reason: "round-cap-tie",
    scores: [4, 4],
    completedRounds: 6,
    seed: 8,
  });
  assert.equal(logic.determineTerminalResult(2, [4, 4], 8), null);
});

test("历史重放核验 seed、牌堆、结算、库存、连续轮次和终局边界", () => {
  let state = playRound(start(1), ["sun", "pest"]);
  state = logic.reduceGardenResourceDuel(state, { type: "NEXT_ROUND" });
  state = playRound(state, ["water", "water"]);
  const replay = logic.replayHistory(1, state.history);
  assert.deepEqual(replay.hands, state.hands);
  assert.deepEqual(replay.scores, state.scores);
  assert.equal(replay.completedRounds, 2);
  assert.equal(replay.nextRoundIndex, 2);
  assert.equal(replay.terminalResultOrNull, null);
  assertDeepFrozen(replay);

  const wrongSeason = state.history.map((record) => ({
    ...record,
    cards: record.cards.slice(),
    blocked: record.blocked.slice(),
    earned: record.earned.slice(),
    scoreBefore: record.scoreBefore.slice(),
    scoreAfter: record.scoreAfter.slice(),
  }));
  wrongSeason[0].seasonNeed = wrongSeason[0].seasonNeed === "sun" ? "water" : "sun";
  assert.throws(() => logic.replayHistory(1, wrongSeason), TypeError);

  const wrongScore = state.history.map((record) => ({
    ...record,
    cards: record.cards.slice(),
    blocked: record.blocked.slice(),
    earned: record.earned.slice(),
    scoreBefore: record.scoreBefore.slice(),
    scoreAfter: record.scoreAfter.slice(),
  }));
  wrongScore[1].scoreAfter[0] += 1;
  assert.throws(() => logic.replayHistory(1, wrongScore), TypeError);
});

test("state、view 与 history 拒绝 hostile 形状和可变伪造", () => {
  const state = start(77);
  const clone = {
    ...state,
    seasonDeck: state.seasonDeck.slice(),
    hands: state.hands.map((hand) => ({ ...hand })),
    sealedCards: state.sealedCards.slice(),
    scores: state.scores.slice(),
    history: [],
  };
  assert.throws(
    () => logic.reduceGardenResourceDuel(clone, { type: "BEGIN_ROUND" }),
    TypeError,
  );
  assert.throws(() => logic.getPublicView(throwingProxy()), TypeError);
  assert.throws(() => logic.replayHistory(1, [throwingProxy()]), TypeError);
  assert.throws(() => logic.resolveRound(throwingProxy()), TypeError);
});

test("sanitizeConfig 逐字段回退、Unicode 限长、断开引用且不触发 getter", () => {
  const names = ["  小花  ", "🌱"];
  const candidate = {
    title: "  <b>我们的花园</b>  ",
    subtitle: "",
    intro: "一起藏牌",
    playerNames: names,
    defaultWinNote: "  先开一朵  ",
    defaultDrawNote: "花".repeat(241),
  };
  const config = logic.sanitizeConfig(candidate);
  assert.equal(config.title, "<b>我们的花园</b>");
  assert.equal(config.subtitle, configApi.DEFAULT_CONFIG.subtitle);
  assert.equal(config.intro, "一起藏牌");
  assert.deepEqual(config.playerNames, ["小花", "🌱"]);
  assert.equal(config.defaultWinNote, "先开一朵");
  assert.equal(config.defaultDrawNote, configApi.DEFAULT_CONFIG.defaultDrawNote);
  names[0] = "篡改";
  candidate.intro = "篡改";
  assert.deepEqual(config.playerNames, ["小花", "🌱"]);
  assert.equal(config.intro, "一起藏牌");
  assertDeepFrozen(config);

  const accessor = {};
  Object.defineProperty(accessor, "title", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.doesNotThrow(() => logic.sanitizeConfig(accessor));
  assert.equal(logic.sanitizeConfig(accessor).title, configApi.DEFAULT_CONFIG.title);
  assert.equal(logic.sanitizeConfig(throwingProxy()).title, configApi.DEFAULT_CONFIG.title);
});

test("结语策略只收到冻结公开终局摘要，异常和非法文本回退", () => {
  const result = logic.determineTerminalResult(5, [4, 3], 42);
  let received;
  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, (summary) => {
    received = summary;
    return `${summary.winnerName} 的花先开。`;
  });
  assert.equal(logic.composeConfiguredResultNote(config, result), "你 的花先开。");
  assertDeepFrozen(received);
  assert.equal(Object.hasOwn(received, "history"), false);
  assert.equal(Object.hasOwn(received, "seasonDeck"), false);
  assert.equal(Object.hasOwn(received, "sealedCards"), false);

  for (const strategy of [
    () => {
      throw new Error("no");
    },
    () => "",
    () => "长".repeat(241),
    () => 7,
  ]) {
    const safe = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, strategy);
    assert.equal(
      logic.composeConfiguredResultNote(safe, result),
      configApi.DEFAULT_CONFIG.defaultWinNote,
    );
  }
});

test("来源声明保留固定 commit、许可证、哈希、实际借鉴和零复制边界", async () => {
  const source = await readFile(
    path.join(__dirname, "ATTRIBUTION.md"),
    "utf8",
  );
  for (const required of [
    "aeccb2a889eade57dec7a8ba542e1bd4307a526e",
    "8b9febb20d1fd967c26d9cbb751ea7307431f92b3d0e779a7983dc67fcbcf2f5",
    "Copyright (c) 2026 Aman Sanghi",
    "65ca73beb62ef2afd980bb9f569b10dabfc60075",
    "516bc5dc1560ba43d2097b5f9b4029a23d073ac7feaa94979ac011f4f959620c",
    "Copyright (c) 2017 The boardgame.io Authors",
    "MIT",
    "Hot Seat",
    "纯状态迁移",
    "零代码、零素材复制",
  ]) {
    assert.ok(source.includes(required), `ATTRIBUTION missing ${required}`);
  }
});

test("162,000 个固定序列夹具镜像公平且不存在固定不败序列", (t) => {
  const handOrders = uniquePermutations([
    "sun", "sun", "water", "water", "pest", "pest",
  ]);
  const seasonDecks = uniquePermutations([
    "sun", "sun", "sun", "water", "water", "water",
  ]);
  assert.equal(handOrders.length, 90);
  assert.equal(seasonDecks.length, 20);

  const outcomes = { player0: 0, player1: 0, draw: 0 };
  const player0HasLoss = Array(handOrders.length).fill(false);
  const player1HasLoss = Array(handOrders.length).fill(false);
  let fixtureCount = 0;

  for (const deck of seasonDecks) {
    for (let firstIndex = 0; firstIndex < handOrders.length; firstIndex += 1) {
      const first = handOrders[firstIndex];
      for (let secondIndex = 0; secondIndex < handOrders.length; secondIndex += 1) {
        const second = handOrders[secondIndex];
        let scores = [0, 0];
        let terminal = null;
        for (let roundIndex = 0; roundIndex < logic.ROUND_COUNT; roundIndex += 1) {
          const settlement = logic.resolveRound({
            roundIndex,
            seasonNeed: deck[roundIndex],
            petalValue: logic.PETAL_VALUES[roundIndex],
            cards: [first[roundIndex], second[roundIndex]],
            scoreBefore: scores,
          });
          scores = settlement.scoreAfter;
          terminal = logic.determineTerminalResult(roundIndex, scores, 1);
          if (terminal) break;
        }
        assert.ok(terminal);
        fixtureCount += 1;
        if (terminal.outcome === "draw") {
          outcomes.draw += 1;
        } else if (terminal.winnerIndex === 0) {
          outcomes.player0 += 1;
          player1HasLoss[secondIndex] = true;
        } else {
          outcomes.player1 += 1;
          player0HasLoss[firstIndex] = true;
        }
      }
    }
  }

  assert.equal(fixtureCount, 162000);
  assert.deepEqual(outcomes, {
    player0: 59444,
    player1: 59444,
    draw: 43112,
  });
  assert.equal(player0HasLoss.every(Boolean), true);
  assert.equal(player1HasLoss.every(Boolean), true);
  t.diagnostic(
    `exhaustive fixtures=${fixtureCount}, player0=${outcomes.player0}, `
      + `player1=${outcomes.player1}, draw=${outcomes.draw}`,
  );
});
