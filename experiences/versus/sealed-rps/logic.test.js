import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptPublicState,
  beginNextRound,
  restartMatch,
  resolveChoices,
  revealRound,
  startMatch,
} from "./logic.js";

const members = ["host", "guest"];
const result = (roundId, hostChoice, guestChoice) => ({
  roundId,
  submissions: [
    { memberId: "host", choice: hostChoice },
    { memberId: "guest", choice: guestChoice },
  ],
});

test("三种克制关系、平局和非法选择均确定", () => {
  assert.equal(resolveChoices("rock", "scissors"), "first");
  assert.equal(resolveChoices("scissors", "paper"), "first");
  assert.equal(resolveChoices("paper", "rock"), "first");
  assert.equal(resolveChoices("rock", "paper"), "second");
  assert.equal(resolveChoices("rock", "rock"), "tie");
  assert.equal(resolveChoices("fire", "rock"), null);
});

test("开始比赛要求两位不同成员并生成零比分", () => {
  const state = startMatch({ memberIds: members, roundId: "r1" });
  assert.equal(state.phase, "choosing");
  assert.deepEqual(state.scores, { host: 0, guest: 0 });
  assert.equal(state.targetScore, 2);
  assert.throws(() => startMatch({ memberIds: ["same", "same"], roundId: "r1" }));
});

test("平局不加分，胜局只给胜者加一分", () => {
  const initial = startMatch({ memberIds: members, roundId: "r1" });
  const tied = revealRound(initial, result("r1", "rock", "rock"));
  assert.deepEqual(tied.scores, { host: 0, guest: 0 });
  assert.equal(tied.phase, "revealed");

  const secondRound = beginNextRound(tied, "r2");
  const won = revealRound(secondRound, result("r2", "paper", "rock"));
  assert.deepEqual(won.scores, { host: 1, guest: 0 });
});

test("先到两分结束，完成后不能再次结算", () => {
  let state = startMatch({ memberIds: members, roundId: "r1" });
  state = revealRound(state, result("r1", "rock", "scissors"));
  state = beginNextRound(state, "r2");
  state = revealRound(state, result("r2", "paper", "rock"));
  assert.equal(state.phase, "finished");
  assert.equal(state.scores.host, 2);
  assert.strictEqual(revealRound(state, result("r2", "paper", "rock")), state);
});

test("旧回合、重复成员和非法选择不能推进状态", () => {
  const state = startMatch({ memberIds: members, roundId: "current" });
  assert.strictEqual(revealRound(state, result("old", "rock", "paper")), state);
  assert.strictEqual(revealRound(state, {
    roundId: "current",
    submissions: [{ memberId: "host", choice: "rock" }, { memberId: "host", choice: "paper" }],
  }), state);
  assert.strictEqual(revealRound(state, result("current", "water", "paper")), state);
});

test("下一轮必须使用新 roundId，重新开始清空比分且版本递增", () => {
  const first = startMatch({ memberIds: members, roundId: "r1" });
  const revealed = revealRound(first, result("r1", "rock", "scissors"));
  assert.strictEqual(beginNextRound(revealed, "r1"), revealed);
  const second = beginNextRound(revealed, "r2");
  assert.equal(second.roundNumber, 2);
  assert.equal(second.version, revealed.version + 1);

  const finished = revealRound(
    beginNextRound(revealRound(second, result("r2", "rock", "scissors")), "r3"),
    result("r3", "paper", "rock"),
  );
  const restarted = restartMatch(finished, "new-match");
  assert.deepEqual(restarted.scores, { host: 0, guest: 0 });
  assert.equal(restarted.roundNumber, 1);
  assert.equal(restarted.version, finished.version + 1);
});

test("访客只接受由本机密封结果推导出的递增状态", () => {
  const choosing = startMatch({ memberIds: members, roundId: "r1" });
  const verified = result("r1", "rock", "scissors");
  const revealed = revealRound(choosing, verified);
  assert.deepEqual(acceptPublicState(choosing, revealed, members, verified), revealed);
  assert.strictEqual(acceptPublicState(choosing, { ...revealed, scores: { host: 2, guest: 0 } }, members, verified), choosing);
  assert.strictEqual(acceptPublicState(revealed, choosing, members), revealed);
  assert.strictEqual(acceptPublicState(choosing, revealed, ["host", "third"], verified), choosing);
});

test("选择阶段公开状态不包含任何出拳", () => {
  const state = startMatch({ memberIds: members, roundId: "r1" });
  const serialized = JSON.stringify(state);
  for (const choice of ["rock", "scissors", "paper"]) assert.equal(serialized.includes(choice), false);
});
