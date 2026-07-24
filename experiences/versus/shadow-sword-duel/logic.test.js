"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import "./config.js";
import "./logic.js";

const logic = globalThis.ShadowSwordLogic;

const API_KEYS = [
  "VERSION",
  "PLAYER_COUNT",
  "START_HEALTH",
  "START_ENERGY",
  "MAX_HEALTH",
  "MAX_ENERGY",
  "MAX_ROUNDS",
  "ATTACK_COST",
  "TITLE",
  "ACTIONS",
  "PHASES",
  "DEFAULT_CONFIG",
  "sanitizeConfig",
  "createInitialState",
  "getPlayersBeforeRound",
  "isActionAvailable",
  "resolveRound",
  "replayHistory",
  "reduce",
  "getScreenView",
];

const COMMON_VIEW_KEYS = [
  "version",
  "phase",
  "title",
  "playerNames",
  "roundIndex",
  "maxRounds",
  "firstSeat",
  "activeSeat",
  "covered",
  "players",
  "revealedHistory",
  "controls",
  "revision",
];

const CONTROL_KEYS = [
  "canStart",
  "canChoose",
  "canConfirm",
  "canCover",
  "canResume",
  "canTakeOver",
  "canReveal",
  "canNextRound",
  "canRestart",
];

const STATE_KEYS = [
  "version",
  "phase",
  "content",
  "roundIndex",
  "firstSeat",
  "activeSeat",
  "covered",
  "draftAction",
  "sealedActions",
  "history",
  "revision",
];

const MOVE_PAIRS = [
  ["attack", "attack", [true, true], [[2, 0, false], [2, 0, false]]],
  ["attack", "guard", [false, false], [[3, 0, false], [3, 1, true]]],
  ["attack", "dodge", [false, false], [[3, 0, false], [3, 1, false]]],
  ["attack", "charge", [false, true], [[3, 0, false], [2, 1, false]]],
  ["guard", "attack", [false, false], [[3, 1, true], [3, 0, false]]],
  ["guard", "guard", [false, false], [[3, 1, false], [3, 1, false]]],
  ["guard", "dodge", [false, false], [[3, 1, false], [3, 1, false]]],
  ["guard", "charge", [false, false], [[3, 1, false], [3, 2, false]]],
  ["dodge", "attack", [false, false], [[3, 1, false], [3, 0, false]]],
  ["dodge", "guard", [false, false], [[3, 1, false], [3, 1, false]]],
  ["dodge", "dodge", [false, false], [[3, 1, false], [3, 1, false]]],
  ["dodge", "charge", [false, false], [[3, 1, false], [3, 2, false]]],
  ["charge", "attack", [true, false], [[2, 1, false], [3, 0, false]]],
  ["charge", "guard", [false, false], [[3, 2, false], [3, 1, false]]],
  ["charge", "dodge", [false, false], [[3, 2, false], [3, 1, false]]],
  ["charge", "charge", [false, false], [[3, 2, false], [3, 2, false]]],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function freezeFixture(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      freezeFixture(descriptor.value);
    }
  }
  return Object.freeze(value);
}

function assertDeepFrozen(value, seen = new Set()) {
  if ((!value || typeof value !== "object") && typeof value !== "function") return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function assertExactKeys(value, expected) {
  assert.deepEqual(Reflect.ownKeys(value).sort(), [...expected].sort());
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert.equal(typeof key, "string");
    assert.equal(Object.prototype.hasOwnProperty.call(descriptor, "value"), true);
  }
}

function player(health = 3, energy = 1, initiative = false) {
  return { health, energy, initiative };
}

function unpackPlayers(players) {
  return players.map(({ health, energy, initiative }) => [health, energy, initiative]);
}

function event(roundIndex, left, right) {
  return {
    roundIndex,
    firstSeat: (roundIndex - 1) % 2,
    actions: [left, right],
  };
}

function historyFromPairs(pairs) {
  return pairs.map(([left, right], index) => event(index + 1, left, right));
}

function chooseAndConfirm(state, move) {
  const seat = state.activeSeat;
  state = logic.reduce(state, { type: "CHOOSE", seat, move });
  return logic.reduce(state, { type: "CONFIRM", seat });
}

function sealRound(state, moves) {
  if (state.phase === "intro") state = logic.reduce(state, { type: "START" });
  if (state.phase === "round-result") state = logic.reduce(state, { type: "NEXT_ROUND" });
  if (state.phase === "handoff" && state.sealedActions.every((move) => move === null)) {
    state = logic.reduce(state, { type: "TAKE_OVER", seat: state.activeSeat });
  }
  const firstSeat = state.activeSeat;
  state = chooseAndConfirm(state, moves[firstSeat]);
  state = logic.reduce(state, { type: "TAKE_OVER", seat: state.activeSeat });
  state = chooseAndConfirm(state, moves[1 - firstSeat]);
  assert.equal(state.phase, "ready-to-reveal");
  return state;
}

function playRound(state, moves) {
  return logic.reduce(sealRound(state, moves), { type: "REVEAL" });
}

function playPairs(pairs, config) {
  let state = logic.createInitialState(config);
  for (const pair of pairs) state = playRound(state, pair);
  return state;
}

function swapSeats(value) {
  return [value[1], value[0]];
}

function buildReachableStates() {
  const intro = logic.createInitialState();
  const choosing = logic.reduce(intro, { type: "START" });
  const choosingWithDraft = logic.reduce(choosing, { type: "CHOOSE", seat: 0, move: "attack" });
  const covered = logic.reduce(choosingWithDraft, { type: "COVER" });
  const handoff = logic.reduce(choosingWithDraft, { type: "CONFIRM", seat: 0 });
  const secondChoosing = logic.reduce(handoff, { type: "TAKE_OVER", seat: 1 });
  const secondDraft = logic.reduce(secondChoosing, { type: "CHOOSE", seat: 1, move: "guard" });
  const ready = logic.reduce(secondDraft, { type: "CONFIRM", seat: 1 });
  const roundResult = logic.reduce(ready, { type: "REVEAL" });
  const roundStartHandoff = logic.reduce(roundResult, { type: "NEXT_ROUND" });
  const matchResult = playPairs([
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
  ]);
  return {
    intro,
    choosing,
    choosingWithDraft,
    covered,
    handoff,
    secondChoosing,
    ready,
    roundResult,
    roundStartHandoff,
    matchResult,
  };
}

function reducerActionScenarios() {
  const states = buildReachableStates();
  return [
    ["START", states.intro, { type: "START" }],
    ["CHOOSE", states.choosing, { type: "CHOOSE", seat: 0, move: "guard" }],
    ["CONFIRM", states.choosingWithDraft, { type: "CONFIRM", seat: 0 }],
    ["COVER", states.choosing, { type: "COVER" }],
    ["RESUME", states.covered, { type: "RESUME", seat: 0 }],
    ["TAKE_OVER", states.handoff, { type: "TAKE_OVER", seat: 1 }],
    ["REVEAL", states.ready, { type: "REVEAL" }],
    ["NEXT_ROUND", states.roundResult, { type: "NEXT_ROUND" }],
    ["RESTART", states.matchResult, { type: "RESTART" }],
  ];
}

test("副作用加载暴露精确、递归冻结的规则 API", () => {
  assertExactKeys(logic, API_KEYS);
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.PLAYER_COUNT, 2);
  assert.equal(logic.START_HEALTH, 3);
  assert.equal(logic.START_ENERGY, 1);
  assert.equal(logic.MAX_HEALTH, 3);
  assert.equal(logic.MAX_ENERGY, 2);
  assert.equal(logic.MAX_ROUNDS, 9);
  assert.equal(logic.ATTACK_COST, 1);
  assert.equal(logic.TITLE, "影子剑术");
  assert.deepEqual(logic.ACTIONS, ["attack", "guard", "dodge", "charge"]);
  assert.deepEqual(logic.PHASES, [
    "intro",
    "choosing",
    "handoff",
    "ready-to-reveal",
    "round-result",
    "match-result",
  ]);
  assertDeepFrozen(logic);
});

test("配置接受最小纯文本个性化并断开调用方引用", () => {
  const candidate = {
    playerNames: ["  阿左  ", "阿右🐾"],
    finalNote: "  读懂你了。  ",
  };
  const result = logic.sanitizeConfig(candidate);
  assert.deepEqual(result, {
    playerNames: ["阿左", "阿右🐾"],
    finalNote: "读懂你了。",
  });
  assert.notStrictEqual(result, candidate);
  assert.notStrictEqual(result.playerNames, candidate.playerNames);
  candidate.playerNames[0] = "后来";
  candidate.finalNote = "后来";
  assert.deepEqual(result, {
    playerNames: ["阿左", "阿右🐾"],
    finalNote: "读懂你了。",
  });
  assertDeepFrozen(result);
});

test("名字整对回退、结语单独回退，缺失字段使用默认值", () => {
  assert.deepEqual(logic.sanitizeConfig({}), logic.DEFAULT_CONFIG);
  assert.deepEqual(logic.sanitizeConfig({
    playerNames: ["同名", " 同名 "],
    finalNote: "仍保留这句",
  }), {
    playerNames: ["左席", "右席"],
    finalNote: "仍保留这句",
  });
  assert.deepEqual(logic.sanitizeConfig({
    playerNames: ["甲", "乙"],
    finalNote: "\u0000",
  }), {
    playerNames: ["甲", "乙"],
    finalNote: logic.DEFAULT_CONFIG.finalNote,
  });
  assert.deepEqual(logic.sanitizeConfig({
    playerNames: ["甲", "乙"],
  }), {
    playerNames: ["甲", "乙"],
    finalNote: logic.DEFAULT_CONFIG.finalNote,
  });
});

test("配置边界对 accessor、symbol、原型、稀疏数组与 Proxy fail closed", () => {
  const getter = {};
  Object.defineProperty(getter, "playerNames", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  const symbol = { playerNames: ["甲", "乙"] };
  symbol[Symbol("secret")] = true;
  const customPrototype = Object.create({ inherited: true });
  customPrototype.playerNames = ["甲", "乙"];
  const sparseNames = [];
  sparseNames.length = 2;
  sparseNames[1] = "乙";
  class NameList extends Array {}
  const hostile = new Proxy({}, {
    ownKeys() {
      throw new Error("must be contained");
    },
  });
  const cases = [
    null,
    [],
    { playerNames: ["甲", "乙"], extra: true },
    getter,
    symbol,
    customPrototype,
    { playerNames: sparseNames },
    { playerNames: new NameList("甲", "乙") },
    { playerNames: ["\ud800", "乙"] },
    hostile,
  ];
  for (const candidate of cases) {
    assert.doesNotThrow(() => logic.sanitizeConfig(candidate));
    assert.deepEqual(logic.sanitizeConfig(candidate), logic.DEFAULT_CONFIG);
  }
});

test("动作可用性只由精确资源快照决定", () => {
  assert.equal(logic.isActionAvailable(player(3, 1), "attack"), true);
  assert.equal(logic.isActionAvailable(player(3, 0), "attack"), false);
  for (const move of ["guard", "dodge", "charge"]) {
    assert.equal(logic.isActionAvailable(player(3, 0), move), true);
  }
  assert.equal(logic.isActionAvailable(player(0, 2, true), "guard"), false);
  assert.equal(logic.isActionAvailable(player(), "Attack"), false);
  assert.equal(logic.isActionAvailable({ ...player(), extra: true }, "guard"), false);
});

test("普通初始快照的 16 组动作得到冻结的联合资源结算", () => {
  for (const [left, right, expectedHit, expectedAfter] of MOVE_PAIRS) {
    const inputPlayers = [player(), player()];
    const inputActions = [left, right];
    const beforePlayers = clone(inputPlayers);
    const beforeActions = inputActions.slice();
    const result = logic.resolveRound(inputPlayers, inputActions);

    assert.deepEqual(result.playersBefore, beforePlayers, `${left}/${right} before`);
    assert.deepEqual(result.actions, beforeActions, `${left}/${right} actions`);
    assert.deepEqual(result.hit, expectedHit, `${left}/${right} hit`);
    assert.deepEqual(unpackPlayers(result.playersAfter), expectedAfter, `${left}/${right} after`);
    assert.deepEqual(result.spentEnergy, [
      left === "attack" ? 1 : 0,
      right === "attack" ? 1 : 0,
    ]);
    assert.deepEqual(result.spentInitiative, [false, false]);
    assert.deepEqual(result.gainedEnergy, [
      left === "charge" && !expectedHit[0],
      right === "charge" && !expectedHit[1],
    ]);
    assert.deepEqual(result.gainedInitiative, [
      left === "guard" && right === "attack",
      right === "guard" && left === "attack",
    ]);
    assert.deepEqual(inputPlayers, beforePlayers);
    assert.deepEqual(inputActions, beforeActions);
    assert.notStrictEqual(result.playersBefore, inputPlayers);
    assert.notStrictEqual(result.actions, inputActions);
    assertDeepFrozen(result);
  }
});

test("先机改变攻防结果，蓄力有上限且双 KO 原子发生", () => {
  const penetrating = logic.resolveRound(
    [player(3, 2, true), player(3, 1, true)],
    ["attack", "guard"],
  );
  assert.deepEqual(penetrating.hit, [false, true]);
  assert.deepEqual(penetrating.spentInitiative, [true, false]);
  assert.deepEqual(penetrating.gainedInitiative, [false, false]);
  assert.deepEqual(unpackPlayers(penetrating.playersAfter), [
    [3, 1, false],
    [2, 1, true],
  ]);

  for (const opposingMove of ["dodge", "charge", "attack"]) {
    const spent = logic.resolveRound(
      [player(3, 2, true), player()],
      ["attack", opposingMove],
    );
    assert.equal(spent.spentInitiative[0], true, opposingMove);
    assert.equal(spent.playersAfter[0].initiative, false, opposingMove);
  }

  const capped = logic.resolveRound(
    [player(3, 2, true), player(3, 2, false)],
    ["charge", "charge"],
  );
  assert.deepEqual(capped.gainedEnergy, [false, false]);
  assert.deepEqual(unpackPlayers(capped.playersAfter), [
    [3, 2, true],
    [3, 2, false],
  ]);

  const doubleKo = logic.resolveRound(
    [player(1, 1), player(1, 1)],
    ["attack", "attack"],
  );
  assert.deepEqual(doubleKo.hit, [true, true]);
  assert.deepEqual(unpackPlayers(doubleKo.playersAfter), [
    [0, 0, false],
    [0, 0, false],
  ]);
});

test("联合结算对两席完全对称", () => {
  const left = player(2, 2, true);
  const right = player(3, 1, false);
  for (const firstMove of logic.ACTIONS) {
    for (const secondMove of logic.ACTIONS) {
      const direct = logic.resolveRound([left, right], [firstMove, secondMove]);
      const mirrored = logic.resolveRound([right, left], [secondMove, firstMove]);
      if (direct === null || mirrored === null) {
        assert.equal(direct, mirrored);
        continue;
      }
      for (const key of [
        "playersBefore",
        "actions",
        "hit",
        "spentEnergy",
        "spentInitiative",
        "gainedEnergy",
        "gainedInitiative",
        "playersAfter",
      ]) {
        assert.deepEqual(mirrored[key], swapSeats(direct[key]), `${firstMove}/${secondMove} ${key}`);
      }
    }
  }
});

test("5,184 组存活资源快照与动作对穷举合法性、对称性和资源边界", () => {
  const snapshots = [];
  for (let health = 1; health <= 3; health += 1) {
    for (let energy = 0; energy <= 2; energy += 1) {
      for (const initiative of [false, true]) snapshots.push(player(health, energy, initiative));
    }
  }
  assert.equal(snapshots.length, 18);

  let checked = 0;
  let legal = 0;
  for (const left of snapshots) {
    for (const right of snapshots) {
      for (const leftMove of logic.ACTIONS) {
        for (const rightMove of logic.ACTIONS) {
          const players = [left, right];
          const actions = [leftMove, rightMove];
          const expectedLegal = !(
            (leftMove === "attack" && left.energy === 0)
            || (rightMove === "attack" && right.energy === 0)
          );
          const result = logic.resolveRound(players, actions);
          const mirrored = logic.resolveRound(
            [right, left],
            [rightMove, leftMove],
          );
          assert.equal(result !== null, expectedLegal);
          assert.equal(mirrored !== null, expectedLegal);
          checked += 1;
          if (!expectedLegal) continue;
          legal += 1;

          for (const after of result.playersAfter) {
            assert.equal(Number.isInteger(after.health), true);
            assert.equal(after.health >= 0 && after.health <= 3, true);
            assert.equal(Number.isInteger(after.energy), true);
            assert.equal(after.energy >= 0 && after.energy <= 2, true);
            assert.equal(typeof after.initiative, "boolean");
          }
          for (const key of [
            "playersBefore",
            "actions",
            "hit",
            "spentEnergy",
            "spentInitiative",
            "gainedEnergy",
            "gainedInitiative",
            "playersAfter",
          ]) {
            assert.deepEqual(mirrored[key], swapSeats(result[key]));
          }
        }
      }
    }
  }
  assert.equal(checked, 18 * 18 * 16);
  assert.equal(legal, 18 * 18 * 16 - 18 * 6 * 4 - 6 * 18 * 4 + 6 * 6);
});

test("联合结算拒绝非法资源、动作与 hostile 容器且不部分结算", () => {
  const getter = [player(), player()];
  Object.defineProperty(getter[0], "health", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  const sparse = [];
  sparse.length = 2;
  sparse[1] = "guard";
  const hostile = new Proxy([], {
    ownKeys() {
      throw new Error("must be contained");
    },
  });
  const cases = [
    [null, ["guard", "guard"]],
    [[player(), { ...player(), extra: true }], ["guard", "guard"]],
    [[player(3, 0), player()], ["attack", "guard"]],
    [[player(0, 1), player()], ["guard", "guard"]],
    [[player(), player()], ["Attack", "guard"]],
    [[player(), player()], sparse],
    [getter, ["guard", "guard"]],
    [[player(), player()], hostile],
  ];
  for (const [players, actions] of cases) {
    assert.doesNotThrow(() => logic.resolveRound(players, actions));
    assert.equal(logic.resolveRound(players, actions), null);
  }
});

test("历史重放是资源唯一真相并返回断开引用的逐回合 effect", () => {
  const history = historyFromPairs([
    ["attack", "guard"],
    ["charge", "attack"],
    ["guard", "charge"],
  ]);
  const replay = logic.replayHistory(history);
  assert.equal(replay.effects.length, 3);
  assert.deepEqual(replay.effects.map((effect) => effect.actions), history.map(({ actions }) => actions));
  assert.deepEqual(logic.getPlayersBeforeRound(history), replay.players);
  assert.deepEqual(replay.players, [
    player(2, 0, false),
    player(3, 1, false),
  ]);
  assert.equal(replay.result, null);
  assertDeepFrozen(replay);

  history[0].actions[0] = "charge";
  history.push(event(4, "guard", "guard"));
  assert.deepEqual(replay.effects[0].actions, ["attack", "guard"]);
  assert.equal(replay.effects.length, 3);
});

test("历史严格拒绝断号、错 firstSeat、终局后续与畸形事件", () => {
  const wrongRound = [event(2, "guard", "guard")];
  const wrongSeat = [{ ...event(1, "guard", "guard"), firstSeat: 1 }];
  const extraKey = [{ ...event(1, "guard", "guard"), result: "win" }];
  const doubleKoThenExtra = historyFromPairs([
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
    ["guard", "guard"],
  ]);
  const getter = event(1, "guard", "guard");
  Object.defineProperty(getter, "actions", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  for (const history of [wrongRound, wrongSeat, extraKey, doubleKoThenExtra, [getter]]) {
    assert.doesNotThrow(() => logic.replayHistory(history));
    assert.equal(logic.replayHistory(history), null);
    assert.equal(logic.getPlayersBeforeRound(history), null);
  }
});

test("历史边界拒绝零气攻击、超长、稀疏、子类、symbol 与 Proxy", () => {
  const zeroEnergyAttack = historyFromPairs([
    ["attack", "attack"],
    ["attack", "guard"],
  ]);
  const tooLong = historyFromPairs(Array.from({ length: 10 }, () => ["guard", "guard"]));
  const sparse = [];
  sparse.length = 1;
  class HistoryList extends Array {}
  const subclass = new HistoryList(event(1, "guard", "guard"));
  const symbolHistory = [event(1, "guard", "guard")];
  symbolHistory[Symbol("hidden")] = true;
  const symbolEvent = event(1, "guard", "guard");
  symbolEvent[Symbol("hidden")] = true;
  const symbolActions = ["guard", "guard"];
  symbolActions[Symbol("hidden")] = true;
  const hostile = new Proxy([], {
    ownKeys() {
      throw new Error("must be contained");
    },
  });

  for (const history of [
    zeroEnergyAttack,
    tooLong,
    sparse,
    subclass,
    symbolHistory,
    [symbolEvent],
    [{ roundIndex: 1, firstSeat: 0, actions: symbolActions }],
    hostile,
  ]) {
    assert.doesNotThrow(() => logic.replayHistory(history));
    assert.equal(logic.replayHistory(history), null);
  }
});

test("合法历史 JSON 往返保持派生结果，安全序列第 1–8 回合不提前终局", () => {
  const safeHistory = historyFromPairs(
    Array.from({ length: 8 }, () => ["guard", "guard"]),
  );
  for (let length = 1; length <= 8; length += 1) {
    const prefix = safeHistory.slice(0, length);
    const replay = logic.replayHistory(prefix);
    assert.notEqual(replay, null);
    assert.equal(replay.result, null);
    assert.equal(replay.effects.length, length);
    assert.deepEqual(replay.players, [player(), player()]);
  }
  const roundTripped = JSON.parse(JSON.stringify(safeHistory));
  assert.deepEqual(logic.replayHistory(roundTripped), logic.replayHistory(safeHistory));
  assert.deepEqual(logic.getPlayersBeforeRound(roundTripped), [player(), player()]);
});

test("历史派生 knockout、double-ko、health、energy 与回合上限平局五类终局", () => {
  const scenarios = [
    {
      pairs: [
        ["attack", "attack"],
        ["charge", "guard"],
        ["attack", "charge"],
        ["charge", "guard"],
        ["attack", "charge"],
      ],
      result: { kind: "win", winnerSeat: 0, reason: "knockout", roundsPlayed: 5 },
    },
    {
      pairs: [
        ["attack", "attack"],
        ["charge", "charge"],
        ["attack", "attack"],
        ["charge", "charge"],
        ["attack", "attack"],
      ],
      result: { kind: "draw", winnerSeat: null, reason: "double-ko", roundsPlayed: 5 },
    },
    {
      pairs: [
        ["attack", "attack"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "charge"],
        ["charge", "attack"],
      ],
      result: { kind: "win", winnerSeat: 1, reason: "health", roundsPlayed: 9 },
    },
    {
      pairs: [
        ["attack", "attack"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "charge"],
      ],
      result: { kind: "win", winnerSeat: 1, reason: "energy", roundsPlayed: 9 },
    },
    {
      pairs: [
        ["attack", "attack"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
        ["guard", "guard"],
      ],
      result: { kind: "draw", winnerSeat: null, reason: "round-limit-draw", roundsPlayed: 9 },
    },
  ];
  for (const scenario of scenarios) {
    assert.deepEqual(logic.replayHistory(historyFromPairs(scenario.pairs)).result, scenario.result);
  }
});

test("reducer 精确经过六阶段、交替首席并只在合法转换增加 revision", () => {
  let state = logic.createInitialState();
  assert.equal(state.phase, "intro");
  assert.equal(state.revision, 0);

  state = logic.reduce(state, { type: "START" });
  assert.deepEqual([state.phase, state.firstSeat, state.activeSeat, state.revision], ["choosing", 0, 0, 1]);
  state = chooseAndConfirm(state, "attack");
  assert.deepEqual([state.phase, state.activeSeat, state.revision], ["handoff", 1, 3]);
  state = logic.reduce(state, { type: "TAKE_OVER", seat: 1 });
  assert.equal(state.phase, "choosing");
  state = chooseAndConfirm(state, "guard");
  assert.deepEqual([state.phase, state.activeSeat], ["ready-to-reveal", null]);
  state = logic.reduce(state, { type: "REVEAL" });
  assert.deepEqual([state.phase, state.roundIndex, state.history.length], ["round-result", 1, 1]);
  state = logic.reduce(state, { type: "NEXT_ROUND" });
  assert.deepEqual(
    [state.phase, state.roundIndex, state.firstSeat, state.activeSeat],
    ["handoff", 2, 1, 1],
  );

  const beforeInvalid = state;
  assert.strictEqual(logic.reduce(state, { type: "START" }), beforeInvalid);
  assert.strictEqual(logic.reduce(state, { type: "TAKE_OVER", seat: 0 }), beforeInvalid);
});

test("九种 reducer action 接受精确 null-prototype schema 并拒绝所有能力夹带", () => {
  for (const [type, state, validAction] of reducerActionScenarios()) {
    const nullPrototypeAction = Object.assign(Object.create(null), validAction);
    const accepted = logic.reduce(state, nullPrototypeAction);
    assert.notStrictEqual(accepted, state, `${type} null prototype`);

    const extra = { ...validAction, extra: true };
    const symbol = { ...validAction };
    symbol[Symbol("hidden")] = true;
    const accessor = { ...validAction };
    Object.defineProperty(accessor, "type", {
      enumerable: true,
      get() {
        throw new Error("must not run");
      },
    });
    const customPrototype = Object.assign(Object.create({ inherited: true }), validAction);
    const polluted = { ...validAction };
    Object.defineProperty(polluted, "__proto__", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: { polluted: true },
    });
    const missing = { ...validAction };
    delete missing[Object.keys(missing).at(-1)];
    const wrongType = { ...validAction, type: `${type}-unknown` };
    const malformedPayloads = [];
    if (Object.prototype.hasOwnProperty.call(validAction, "seat")) {
      malformedPayloads.push({ ...validAction, seat: 2 });
    }
    if (Object.prototype.hasOwnProperty.call(validAction, "move")) {
      malformedPayloads.push({ ...validAction, move: "Attack" });
    }

    for (const malformed of [
      extra,
      symbol,
      accessor,
      customPrototype,
      polluted,
      missing,
      wrongType,
      ...malformedPayloads,
    ]) {
      assert.doesNotThrow(() => logic.reduce(state, malformed), type);
      assert.strictEqual(logic.reduce(state, malformed), state, type);
    }
    assert.equal({}.polluted, undefined);
  }
});

test("九种 action 在错阶段 fail closed，带席位 action 拒绝旧席位", () => {
  const states = buildReachableStates();
  for (const [type, state, validAction] of reducerActionScenarios()) {
    const wrongPhase = type === "START" ? states.choosing : states.intro;
    assert.strictEqual(logic.reduce(wrongPhase, validAction), wrongPhase, `${type} wrong phase`);
    if (Object.prototype.hasOwnProperty.call(validAction, "seat")) {
      const staleSeat = { ...validAction, seat: 1 - validAction.seat };
      assert.strictEqual(logic.reduce(state, staleSeat), state, `${type} stale seat`);
    }
  }
});

test("六种 phase 全部由 reducer 可达，伪造 phase 不变量统一回退默认初态", () => {
  const states = buildReachableStates();
  const reachable = [
    states.intro,
    states.choosing,
    states.handoff,
    states.ready,
    states.roundResult,
    states.matchResult,
  ];
  assert.deepEqual(reachable.map(({ phase }) => phase), logic.PHASES);
  for (const state of reachable) {
    assertExactKeys(state, STATE_KEYS);
    assertDeepFrozen(state);
    assert.strictEqual(logic.reduce(state, { type: "UNKNOWN" }), state);
    assert.equal(logic.getScreenView(state).phase, state.phase);
  }

  const mutate = (source, changes) => Object.assign(clone(source), changes);
  const pseudoStates = [
    mutate(states.intro, { firstSeat: 1 }),
    mutate(states.intro, { history: [event(1, "guard", "guard")] }),
    mutate(states.choosing, { activeSeat: 1 }),
    mutate(states.choosingWithDraft, { covered: true }),
    mutate(states.choosing, { sealedActions: [null, "guard"] }),
    mutate(states.handoff, { activeSeat: 0 }),
    mutate(states.handoff, { draftAction: "guard" }),
    mutate(states.roundStartHandoff, { sealedActions: ["guard", null] }),
    mutate(states.ready, { sealedActions: ["attack", null] }),
    mutate(states.ready, { activeSeat: 0 }),
    mutate(states.roundResult, { activeSeat: 0 }),
    mutate(states.roundResult, { roundIndex: 2 }),
    mutate(states.matchResult, { phase: "round-result" }),
    mutate(states.matchResult, { sealedActions: ["guard", null] }),
    mutate(states.choosing, { revision: -1 }),
    mutate(states.choosing, { roundIndex: 9 }),
  ];
  const defaultState = logic.createInitialState();
  const defaultView = logic.getScreenView(defaultState);
  for (const pseudo of pseudoStates) {
    assert.deepEqual(logic.reduce(pseudo, { type: "START" }), defaultState);
    assert.deepEqual(logic.getScreenView(pseudo), defaultView);
  }
});

test("0/1 份 handoff、四种第一席秘密与 16 种 ready 组合在揭晓前不可区分", () => {
  const firstSecretView = (move) => {
    let state = logic.reduce(logic.createInitialState(), { type: "START" });
    state = chooseAndConfirm(state, move);
    assert.equal(state.sealedActions.filter(Boolean).length, 1);
    return {
      handoff: logic.getScreenView(state),
      choosing: logic.getScreenView(logic.reduce(state, { type: "TAKE_OVER", seat: 1 })),
    };
  };
  const firstSecretViews = logic.ACTIONS.map(firstSecretView);
  const canonicalFirstSecret = firstSecretViews[0];
  for (const view of firstSecretViews) {
    assert.deepEqual(view.handoff, canonicalFirstSecret.handoff);
    assert.deepEqual(view.choosing, canonicalFirstSecret.choosing);
    assert.equal(view.handoff.handoffKind, "second-seat");
  }

  const readyView = (moves) => logic.getScreenView(sealRound(logic.createInitialState(), moves));
  const readyViews = [];
  for (const left of logic.ACTIONS) {
    for (const right of logic.ACTIONS) readyViews.push(readyView([left, right]));
  }
  assert.equal(readyViews.length, 16);
  for (const view of readyViews) {
    assert.deepEqual(view, readyViews[0]);
    assert.equal(view.readyMessage, "两位都已封招");
  }

  let result = playRound(logic.createInitialState(), ["attack", "guard"]);
  result = logic.reduce(result, { type: "NEXT_ROUND" });
  assert.equal(result.sealedActions.filter(Boolean).length, 0);
  const zeroSecretHandoff = logic.getScreenView(result);
  assert.equal(zeroSecretHandoff.handoffKind, "round-start");
  assert.equal(Object.prototype.hasOwnProperty.call(zeroSecretHandoff, "latestRound"), false);
});

test("COVER 清掉草稿但不封招、不换席，RESUME 必须由当前席主动恢复", () => {
  let state = logic.reduce(logic.createInitialState(), { type: "START" });
  state = logic.reduce(state, { type: "CHOOSE", seat: 0, move: "attack" });
  assert.equal(state.draftAction, "attack");
  const covered = logic.reduce(state, { type: "COVER" });
  assert.deepEqual({
    phase: covered.phase,
    activeSeat: covered.activeSeat,
    covered: covered.covered,
    draftAction: covered.draftAction,
    sealedActions: covered.sealedActions,
  }, {
    phase: "choosing",
    activeSeat: 0,
    covered: true,
    draftAction: null,
    sealedActions: [null, null],
  });
  assert.strictEqual(logic.reduce(covered, { type: "CHOOSE", seat: 0, move: "guard" }), covered);
  assert.strictEqual(logic.reduce(covered, { type: "RESUME", seat: 1 }), covered);
  const resumed = logic.reduce(covered, { type: "RESUME", seat: 0 });
  assert.equal(resumed.covered, false);
  assert.equal(resumed.draftAction, null);
});

test("各阶段 screen view 只暴露精确字段与精确 controls", () => {
  const views = {};
  let state = logic.createInitialState();
  views.intro = logic.getScreenView(state);
  state = logic.reduce(state, { type: "START" });
  views.choosing = logic.getScreenView(state);
  state = logic.reduce(state, { type: "COVER" });
  views.covered = logic.getScreenView(state);
  state = logic.reduce(state, { type: "RESUME", seat: 0 });
  state = chooseAndConfirm(state, "attack");
  views.handoff = logic.getScreenView(state);
  state = logic.reduce(state, { type: "TAKE_OVER", seat: 1 });
  state = chooseAndConfirm(state, "guard");
  views.ready = logic.getScreenView(state);
  state = logic.reduce(state, { type: "REVEAL" });
  views.round = logic.getScreenView(state);
  views.match = logic.getScreenView(playPairs([
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
  ]));

  const expectedExtras = {
    intro: ["instructions"],
    choosing: ["prompt", "draftAction", "availableActions"],
    covered: ["resumeSeat"],
    handoff: ["handoffSeat", "handoffKind"],
    ready: ["readyMessage"],
    round: ["latestRound"],
    match: ["latestRound", "matchResult", "finalNote"],
  };
  const expectedControls = {
    intro: ["canStart"],
    choosing: ["canChoose", "canCover"],
    covered: ["canResume"],
    handoff: ["canTakeOver"],
    ready: ["canReveal"],
    round: ["canNextRound"],
    match: ["canRestart"],
  };
  for (const [name, view] of Object.entries(views)) {
    assertExactKeys(view, COMMON_VIEW_KEYS.concat(expectedExtras[name]));
    assertExactKeys(view.controls, CONTROL_KEYS);
    assert.deepEqual(
      Object.entries(view.controls).filter(([, enabled]) => enabled).map(([key]) => key),
      expectedControls[name],
      name,
    );
    assertDeepFrozen(view);
  }
  for (const item of views.choosing.availableActions) {
    assertExactKeys(item, ["move", "label", "available", "reason"]);
  }
});

test("未揭晓 view 不含封招字段、内部动作数组或可推断秘密的差异", () => {
  const forbiddenKeys = new Set([
    "sealedActions",
    "history",
    "state",
    "secret",
    "secretAction",
    "hiddenAction",
  ]);
  let state = logic.reduce(logic.createInitialState(), { type: "START" });
  state = chooseAndConfirm(state, "attack");
  const views = [
    logic.getScreenView(state),
    logic.getScreenView(logic.reduce(state, { type: "TAKE_OVER", seat: 1 })),
  ];
  state = logic.reduce(state, { type: "TAKE_OVER", seat: 1 });
  state = chooseAndConfirm(state, "charge");
  views.push(logic.getScreenView(state));
  for (const view of views) {
    for (const key of Reflect.ownKeys(view)) assert.equal(forbiddenKeys.has(key), false);
    assert.equal(Object.prototype.hasOwnProperty.call(view, "actions"), false);
  }
});

test("畸形 state 回到全新默认初态，畸形 action 原对象不动且不触发 getter", () => {
  const initial = logic.createInitialState({ playerNames: ["甲", "乙"], finalNote: "自定义" });
  const malformed = { ...clone(initial), extra: true };
  const recovered = logic.reduce(malformed, { type: "START" });
  assert.deepEqual(recovered, logic.createInitialState());
  assert.notStrictEqual(recovered, initial);
  assert.deepEqual(logic.getScreenView(malformed), logic.getScreenView(logic.createInitialState()));

  const mutableClone = clone(initial);
  const recoveredClone = logic.reduce(mutableClone, { type: "UNKNOWN" });
  assert.deepEqual(recoveredClone, logic.createInitialState());
  assert.notStrictEqual(recoveredClone, mutableClone);
  assertDeepFrozen(recoveredClone);
  assert.deepEqual(
    logic.getScreenView(mutableClone),
    logic.getScreenView(logic.createInitialState()),
  );

  const shallowFrozenClone = Object.freeze(clone(initial));
  assert.deepEqual(
    logic.reduce(shallowFrozenClone, { type: "UNKNOWN" }),
    logic.createInitialState(),
  );

  const accessorState = clone(initial);
  Object.defineProperty(accessorState, "phase", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.doesNotThrow(() => logic.reduce(accessorState, { type: "START" }));
  assert.deepEqual(logic.reduce(accessorState, { type: "START" }), logic.createInitialState());

  const choosing = logic.reduce(initial, { type: "START" });
  const hostileAction = new Proxy({}, {
    ownKeys() {
      throw new Error("must be contained");
    },
  });
  const getterAction = {};
  Object.defineProperty(getterAction, "type", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  for (const action of [
    null,
    "START",
    { type: "CHOOSE", seat: 0, move: "guard", extra: true },
    getterAction,
    hostileAction,
  ]) {
    assert.doesNotThrow(() => logic.reduce(choosing, action));
    assert.strictEqual(logic.reduce(choosing, action), choosing);
  }
});

test("RESTART 只在 match-result 生效并与同配置首次加载深相等", () => {
  const config = { playerNames: ["月", "影"], finalNote: "再读一次。" };
  const initial = logic.createInitialState(config);
  assert.strictEqual(logic.reduce(initial, { type: "RESTART" }), initial);
  const finished = playPairs([
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
    ["charge", "charge"],
    ["attack", "attack"],
  ], config);
  assert.equal(finished.phase, "match-result");
  const restarted = logic.reduce(finished, { type: "RESTART" });
  assert.deepEqual(restarted, initial);
  assert.notStrictEqual(restarted, initial);
  assert.equal(restarted.revision, 0);
  assertDeepFrozen(restarted);
});

test("revision 到 MAX_SAFE_INTEGER 后普通转换饱和，终局 RESTART 仍归零", () => {
  const states = buildReachableStates();
  const saturatedChoosing = freezeFixture({
    ...clone(states.choosing),
    revision: Number.MAX_SAFE_INTEGER,
  });
  assert.strictEqual(
    logic.reduce(saturatedChoosing, { type: "CHOOSE", seat: 0, move: "guard" }),
    saturatedChoosing,
  );

  const saturatedMatch = freezeFixture({
    ...clone(states.matchResult),
    revision: Number.MAX_SAFE_INTEGER,
  });
  const restarted = logic.reduce(saturatedMatch, { type: "RESTART" });
  assert.deepEqual(restarted, logic.createInitialState(states.matchResult.content));
  assert.equal(restarted.revision, 0);

  const unsafeRevision = {
    ...clone(states.choosing),
    revision: Number.MAX_SAFE_INTEGER + 1,
  };
  assert.deepEqual(
    logic.reduce(unsafeRevision, { type: "CHOOSE", seat: 0, move: "guard" }),
    logic.createInitialState(),
  );
});

test("纯逻辑静态不依赖网络、存储、随机、时钟或 DOM", () => {
  const sources = ["./config.js", "./logic.js"]
    .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
    .join("\n");
  for (const forbidden of [
    /\bdocument\b/,
    /\bwindow\b/,
    /\bfetch\b/,
    /XMLHttpRequest/,
    /WebSocket/,
    /EventSource/,
    /navigator\./,
    /localStorage|sessionStorage|indexedDB/,
    /Math\.random/,
    /\bDate\b/,
    /performance\./,
    /setTimeout|setInterval/,
    /requestAnimationFrame/,
    /AudioContext|getUserMedia|MediaRecorder/,
  ]) {
    assert.doesNotMatch(sources, forbidden);
  }
});
