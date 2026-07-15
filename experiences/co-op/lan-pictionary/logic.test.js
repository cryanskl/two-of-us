import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptPublicState,
  advanceRound,
  completeRound,
  drawerForRound,
  isCorrectGuess,
  normalizeGuess,
  normalizeSegment,
  startMatch,
  toPublicState,
} from "./logic.js";

const options = {
  memberIds: ["host", "guest"],
  rounds: 4,
  secondsPerRound: 45,
  words: ["热气球", "向日葵", "长颈鹿", "冰淇淋"],
  now: 1_000,
  random: () => 1,
};

test("公开状态不包含答案、题库和截止时间，并拒绝旧版本", () => {
  const full = startMatch(options);
  const publicState = toPublicState(full);
  assert.deepEqual(Object.keys(publicState).sort(), [
    "drawerId", "phase", "roundIndex", "score", "secondsPerRound", "totalRounds", "version",
  ].sort());
  assert.equal("answer" in publicState, false);
  assert.equal("words" in publicState, false);
  assert.equal("deadline" in publicState, false);
  assert.strictEqual(acceptPublicState(publicState, { ...publicState, version: 0 }), publicState);
  assert.equal(acceptPublicState(publicState, { ...publicState, version: 2, score: 1 }).score, 1);
});

test("画家按回合在两位玩家之间轮换", () => {
  assert.equal(drawerForRound(["host", "guest"], 0), "host");
  assert.equal(drawerForRound(["host", "guest"], 1), "guest");
  assert.equal(drawerForRound(["host", "guest"], 2), "host");
  assert.equal(drawerForRound(["host", "guest"], 3), "guest");
});

test("主机抽题不固定依赖题库前四项", () => {
  const words = ["热气球", "向日葵", "长颈鹿", "冰淇淋", "摩天轮", "小雨伞"];
  const originalOrder = startMatch({ ...options, words, random: () => 1 }).words;
  const shuffledOrder = startMatch({ ...options, words, random: () => 0 }).words;

  assert.deepEqual(originalOrder, words.slice(0, 4));
  assert.notDeepEqual(shuffledOrder, originalOrder);
});

test("猜词规范化移除空格与中英文标点并忽略大小写", () => {
  assert.equal(normalizeGuess("  Ice-Cream！ "), "icecream");
  assert.equal(normalizeGuess("热 气，球。"), "热气球");
  assert.equal(isCorrectGuess("热 气球！", "热气球"), true);
  assert.equal(isCorrectGuess("", "热气球"), false);
});

test("错误答案不计分，正确答案只结算一次", () => {
  const playing = startMatch(options);
  assert.strictEqual(completeRound(playing, { reason: "correct", guess: "雨伞" }), playing);

  const settled = completeRound(playing, { reason: "correct", guess: "热 气球！" });
  assert.equal(settled.score, 1);
  assert.equal(settled.phase, "round-result");
  assert.strictEqual(completeRound(settled, { reason: "correct", guess: "热气球" }), settled);
});

test("超时不加分并能进入下一回合", () => {
  const playing = startMatch(options);
  const timedOut = completeRound(playing, { reason: "timeout" });
  assert.equal(timedOut.score, 0);
  const next = advanceRound(timedOut, 10_000);
  assert.equal(next.phase, "playing");
  assert.equal(next.roundIndex, 1);
  assert.equal(next.drawerId, "guest");
  assert.equal(next.answer, "向日葵");
  assert.equal(next.deadline, 55_000);
});

test("四回合结束后进入 finished 且不再保留当前答案", () => {
  let state = startMatch(options);
  for (let round = 0; round < 4; round += 1) {
    state = completeRound(state, { reason: "timeout" });
    state = advanceRound(state, 2_000 + round);
  }
  assert.equal(state.phase, "finished");
  assert.equal(state.score, 0);
  assert.equal(state.drawerId, null);
  assert.equal(state.answer, null);
});

test("线段只保留并限制四个归一化坐标", () => {
  assert.deepEqual(normalizeSegment({ x1: -1, y1: 0.25, x2: 1.2, y2: 0.75, html: "<b>x</b>" }), {
    x1: 0, y1: 0.25, x2: 1, y2: 0.75,
  });
  assert.equal(normalizeSegment({ x1: 0, y1: 0, x2: "nope", y2: 1 }), null);
});
