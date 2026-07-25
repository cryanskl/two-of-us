import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptPublicState,
  beginNextRound,
  distanceKm,
  restartGame,
  revealRound,
  roundIdFor,
  startGame,
  summarizeGame,
  tierForDistance,
  toPublicState,
} from "./logic.js";
import { SAMPLE_ACTIVE_CARDS } from "./sample-pack.js";

const MEMBERS = Object.freeze(["host", "guest"]);

function deepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(deepFrozen);
}

function sealedFor(state, hostPoint, guestPoint) {
  return {
    roundId: state.roundId,
    cardId: state.card.id,
    submissions: [
      { memberId: "guest", point: guestPoint },
      { memberId: "host", point: hostPoint },
    ],
  };
}

function revealAtTarget(state, privateCard) {
  return revealRound(
    state,
    sealedFor(state, privateCard.target, privateCard.target),
    privateCard,
  );
}

test("haversine 对称、跨反经线且使用固定平均半径", () => {
  const origin = { longitude: 0, latitude: 0 };
  const east = { longitude: 1, latitude: 0 };
  assert.ok(Math.abs(distanceKm(origin, east) - 111.1950802335) < 1e-9);
  assert.equal(distanceKm(origin, origin), 0);
  assert.equal(distanceKm(origin, east), distanceKm(east, origin));
  assert.ok(Math.abs(distanceKm(
    { longitude: 179.5, latitude: 0 },
    { longitude: -179.5, latitude: 0 },
  ) - 111.1950802335) < 1e-9);
  assert.ok(Math.abs(distanceKm(
    { longitude: 0, latitude: 0 },
    { longitude: 180, latitude: 0 },
  ) - 20015.114442035923) < 1e-9);
  assert.equal(distanceKm({ longitude: 0, latitude: 81 }, origin), null);
});

test("共同档位精确覆盖 50、200、800 km 边界", () => {
  assert.equal(tierForDistance(0), "close");
  assert.equal(tierForDistance(50), "close");
  assert.equal(tierForDistance(50.000001), "near");
  assert.equal(tierForDistance(200), "near");
  assert.equal(tierForDistance(200.000001), "familiar");
  assert.equal(tierForDistance(800), "familiar");
  assert.equal(tierForDistance(800.000001), "far");
  assert.equal(tierForDistance(-1), null);
  assert.equal(tierForDistance(Number.NaN), null);
});

test("开始游戏固定使用前四张顺序且公开态没有目标或未来卡", () => {
  const state = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "game-a",
    version: 0,
  });
  assert.deepEqual(state, {
    schemaVersion: 1,
    version: 1,
    phase: "guessing",
    gameId: "game-a",
    memberIds: ["host", "guest"],
    roundIndex: 0,
    totalRounds: 4,
    roundId: "game-a-r1",
    card: {
      id: SAMPLE_ACTIVE_CARDS[0].id,
      title: SAMPLE_ACTIVE_CARDS[0].title,
      clue: SAMPLE_ACTIVE_CARDS[0].clue,
      era: SAMPLE_ACTIVE_CARDS[0].era,
    },
    lastResult: null,
    summaries: [],
  });
  const serialized = JSON.stringify(toPublicState(state));
  assert.equal(serialized.includes("target"), false);
  assert.equal(serialized.includes("revealNote"), false);
  assert.equal(serialized.includes(SAMPLE_ACTIVE_CARDS[1].id), false);
  deepFrozen(state);
  deepFrozen(toPublicState(state));
  assert.notStrictEqual(toPublicState(state), state);
});

test("揭晓按成员顺序归一化并由较远者决定共同档位", () => {
  const state = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "game-b",
  });
  const target = SAMPLE_ACTIVE_CARDS[0].target;
  const result = revealRound(
    state,
    sealedFor(
      state,
      target,
      { longitude: target.longitude + 3, latitude: target.latitude },
    ),
    SAMPLE_ACTIVE_CARDS[0],
  );
  assert.equal(result.phase, "revealed");
  assert.equal(result.version, 2);
  assert.deepEqual(result.lastResult.submissions.map(({ memberId }) => memberId), MEMBERS);
  assert.equal(result.lastResult.submissions[0].distanceKm, 0);
  assert.ok(result.lastResult.submissions[1].distanceKm > 200);
  assert.equal(
    result.lastResult.jointDistanceKm,
    result.lastResult.submissions[1].distanceKm,
  );
  assert.equal(result.lastResult.tierId, tierForDistance(result.lastResult.jointDistanceKm));
  assert.deepEqual(result.summaries, [result.lastResult]);
  deepFrozen(result);
});

test("畸形、错轮次、错卡片、重复成员的 sealed result 原子拒绝", () => {
  const state = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "game-c",
  });
  const valid = sealedFor(state, { longitude: 0, latitude: 0 }, { longitude: 1, latitude: 1 });
  assert.strictEqual(revealRound(state, { ...valid, roundId: "wrong-r1" }, SAMPLE_ACTIVE_CARDS[0]), state);
  assert.strictEqual(revealRound(state, { ...valid, cardId: "wrong-card" }, SAMPLE_ACTIVE_CARDS[0]), state);
  assert.strictEqual(revealRound(state, {
    ...valid,
    submissions: [valid.submissions[0], valid.submissions[0]],
  }, SAMPLE_ACTIVE_CARDS[0]), state);
  assert.strictEqual(revealRound(state, {
    ...valid,
    submissions: [{ memberId: "host", point: { longitude: 0, latitude: 99 } }, valid.submissions[1]],
  }, SAMPLE_ACTIVE_CARDS[0]), state);
  assert.strictEqual(revealRound(state, valid, SAMPLE_ACTIVE_CARDS[1]), state);
});

test("四轮状态机递增 version 与 roundId 并一次性进入 finished", () => {
  let state = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "four-rounds",
    version: 8,
  });
  for (let index = 0; index < 4; index += 1) {
    assert.equal(state.card.id, SAMPLE_ACTIVE_CARDS[index].id);
    assert.equal(state.roundId, `four-rounds-r${index + 1}`);
    state = revealAtTarget(state, SAMPLE_ACTIVE_CARDS[index]);
    assert.equal(state.phase, index === 3 ? "finished" : "revealed");
    assert.equal(state.summaries.length, index + 1);
    if (index < 3) {
      state = beginNextRound(state, SAMPLE_ACTIVE_CARDS[index + 1]);
      assert.equal(state.phase, "guessing");
      assert.equal(state.lastResult, null);
    }
  }
  assert.equal(state.version, 16);
  assert.strictEqual(beginNextRound(state, SAMPLE_ACTIVE_CARDS[0]), state);
  assert.deepEqual(summarizeGame(state), {
    rounds: 4,
    bothWithin200Count: 4,
    closestRoundIndex: 0,
    closestJointDistance: 0,
    tiers: ["close", "close", "close", "close"],
  });
});

test("终局摘要同距取较早轮，非终局不生成摘要", () => {
  let state = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "summary",
  });
  assert.equal(summarizeGame(state), null);
  for (let index = 0; index < 4; index += 1) {
    state = revealAtTarget(state, SAMPLE_ACTIVE_CARDS[index]);
    if (index < 3) state = beginNextRound(state, SAMPLE_ACTIVE_CARDS[index + 1]);
  }
  const summary = summarizeGame(state);
  assert.equal(summary.closestRoundIndex, 0);
  deepFrozen(summary);
});

test("重开要求已完成、不同合法 gameId，并仍从第一张开始", () => {
  let state = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "before",
  });
  assert.strictEqual(restartGame(state, {
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "after",
  }), state);
  for (let index = 0; index < 4; index += 1) {
    state = revealAtTarget(state, SAMPLE_ACTIVE_CARDS[index]);
    if (index < 3) state = beginNextRound(state, SAMPLE_ACTIVE_CARDS[index + 1]);
  }
  assert.strictEqual(restartGame(state, {
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "before",
  }), state);
  const restarted = restartGame(state, {
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "after",
  });
  assert.equal(restarted.card.id, SAMPLE_ACTIVE_CARDS[0].id);
  assert.equal(restarted.roundId, "after-r1");
  assert.equal(restarted.version, state.version + 1);
});

test("访客用 sealed result 与公开 target 重算，拒绝被篡改距离", () => {
  const guessing = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "guest-check",
  });
  const sealed = sealedFor(
    guessing,
    SAMPLE_ACTIVE_CARDS[0].target,
    { longitude: 0, latitude: 0 },
  );
  const revealed = revealRound(guessing, sealed, SAMPLE_ACTIVE_CARDS[0]);
  assert.deepEqual(
    acceptPublicState(guessing, revealed, MEMBERS, sealed),
    revealed,
  );
  const tampered = structuredClone(revealed);
  tampered.lastResult.submissions[1].distanceKm = 1;
  tampered.summaries[0].submissions[1].distanceKm = 1;
  assert.strictEqual(
    acceptPublicState(guessing, tampered, MEMBERS, sealed),
    guessing,
  );
  assert.strictEqual(
    acceptPublicState(guessing, revealed, MEMBERS, null),
    guessing,
  );
  assert.strictEqual(
    acceptPublicState(guessing, revealed, ["host", "third"], sealed),
    guessing,
  );
});

test("公开下一轮与重开只能逐版本、逐阶段前进", () => {
  const first = startGame({
    memberIds: MEMBERS,
    activeCards: SAMPLE_ACTIVE_CARDS,
    gameId: "public-flow",
  });
  const firstRevealed = revealAtTarget(first, SAMPLE_ACTIVE_CARDS[0]);
  const second = beginNextRound(firstRevealed, SAMPLE_ACTIVE_CARDS[1]);
  assert.deepEqual(acceptPublicState(firstRevealed, second, MEMBERS), second);
  assert.strictEqual(acceptPublicState(firstRevealed, {
    ...second,
    roundIndex: 2,
  }, MEMBERS), firstRevealed);
  assert.strictEqual(acceptPublicState(second, firstRevealed, MEMBERS), second);
  assert.equal(roundIdFor("a".repeat(40), 3), `${"a".repeat(40)}-r4`);
  assert.equal(roundIdFor("bad id", 0), null);
  assert.equal(roundIdFor("game", 4), null);
});
