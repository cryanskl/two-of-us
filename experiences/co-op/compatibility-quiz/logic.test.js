import assert from "node:assert/strict";
import test from "node:test";

import { QUESTION_IDS } from "./config.js";
import {
  acceptPublicState,
  beginNextQuestion,
  restartQuiz,
  revealAnswer,
  roundIdFor,
  startQuiz,
} from "./logic.js";

const members = ["host", "guest"];
const start = (quizId = "quiz-1") => startQuiz({
  memberIds: members,
  quizId,
  roundId: roundIdFor(quizId, 0),
});
const result = (state, hostAnswer = "a", guestAnswer = "a") => ({
  roundId: state.roundId,
  questionId: state.questionIds[state.questionIndex],
  submissions: [
    { memberId: "host", answerId: hostAnswer },
    { memberId: "guest", answerId: guestAnswer },
  ],
});

test("开始问答要求两位成员、固定八题和合法编号", () => {
  const state = start();
  assert.equal(state.phase, "answering");
  assert.equal(state.totalQuestions, 8);
  assert.deepEqual(state.questionIds, QUESTION_IDS);
  assert.equal(state.matchCount, 0);
  assert.equal(JSON.stringify(state).includes("answerId"), false);
  assert.throws(() => startQuiz({ memberIds: ["same", "same"], quizId: "q", roundId: roundIdFor("q", 0) }));
  assert.throws(() => startQuiz({ memberIds: members, quizId: "q", roundId: "old-round" }));
  assert.throws(() => startQuiz({ memberIds: members, quizId: "q", roundId: roundIdFor("q", 0), questionIds: QUESTION_IDS.slice(0, 7) }));
  assert.throws(() => startQuiz({ memberIds: members, quizId: "q", roundId: roundIdFor("q", 0), questionIds: [...QUESTION_IDS.slice(0, 7), QUESTION_IDS[0]] }));
});

test("同选加一颗同心，异选不扣分", () => {
  const initial = start();
  const matched = revealAnswer(initial, result(initial, "a", "a"));
  assert.equal(matched.phase, "revealed");
  assert.equal(matched.matchCount, 1);
  assert.equal(matched.lastResult.matched, true);

  const second = beginNextQuestion(matched, roundIdFor(matched.quizId, 1));
  const different = revealAnswer(second, result(second, "a", "b"));
  assert.equal(different.matchCount, 1);
  assert.equal(different.lastResult.matched, false);
});

test("旧题、旧回合、重复成员、第三人和非法答案都不能推进", () => {
  const state = start();
  const valid = result(state);
  for (const invalid of [
    { ...valid, roundId: "old" },
    { ...valid, questionId: QUESTION_IDS[1] },
    { ...valid, submissions: [valid.submissions[0], { memberId: "host", answerId: "b" }] },
    { ...valid, submissions: [valid.submissions[0], { memberId: "third", answerId: "b" }] },
    { ...valid, submissions: [valid.submissions[0], { memberId: "guest", answerId: "other" }] },
  ]) {
    assert.strictEqual(revealAnswer(state, invalid), state);
  }
});

test("下一题只能从揭晓推进一次并清除上一题结果", () => {
  const initial = start();
  const revealed = revealAnswer(initial, result(initial));
  assert.strictEqual(beginNextQuestion(initial, roundIdFor(initial.quizId, 1)), initial);
  assert.strictEqual(beginNextQuestion(revealed, revealed.roundId), revealed);
  const next = beginNextQuestion(revealed, roundIdFor(revealed.quizId, 1));
  assert.equal(next.phase, "answering");
  assert.equal(next.questionIndex, 1);
  assert.equal(next.lastResult, null);
  assert.strictEqual(beginNextQuestion(next, roundIdFor(next.quizId, 2)), next);
});

test("每题 roundId 与问答和题号绑定，历史 roundId 不能复用", () => {
  const first = start();
  const firstRevealed = revealAnswer(first, result(first));
  const second = beginNextQuestion(firstRevealed, roundIdFor(first.quizId, 1));
  const secondRevealed = revealAnswer(second, result(second));
  assert.strictEqual(beginNextQuestion(secondRevealed, first.roundId), secondRevealed);
  const third = beginNextQuestion(secondRevealed, roundIdFor(first.quizId, 2));
  assert.strictEqual(
    acceptPublicState(secondRevealed, { ...third, roundId: first.roundId }, members),
    secondRevealed,
  );
  assert.notEqual(second.roundId, first.roundId);
  assert.equal(roundIdFor(first.quizId, 2), "quiz-1-q3");
});

test("第八题直接完成，重新开始使用新编号并全部归零", () => {
  let state = start();
  for (let index = 0; index < 8; index += 1) {
    state = revealAnswer(state, result(state, "a", index % 2 ? "b" : "a"));
    if (index < 7) state = beginNextQuestion(state, roundIdFor(state.quizId, index + 1));
  }
  assert.equal(state.phase, "finished");
  assert.equal(state.questionIndex, 7);
  assert.equal(state.matchCount, 4);
  assert.strictEqual(revealAnswer(state, result(state)), state);
  assert.strictEqual(restartQuiz(state, { quizId: "quiz-1", roundId: roundIdFor("quiz-1", 0) }), state);
  assert.strictEqual(restartQuiz(state, { quizId: "quiz-2", roundId: roundIdFor("quiz-1", 0) }), state);

  const restarted = restartQuiz(state, { quizId: "quiz-2", roundId: roundIdFor("quiz-2", 0) });
  assert.equal(restarted.phase, "answering");
  assert.equal(restarted.questionIndex, 0);
  assert.equal(restarted.matchCount, 0);
  assert.equal(restarted.lastResult, null);
  assert.equal(restarted.version, state.version + 1);
});

test("访客只接受能从本机密封结果唯一推导出的状态", () => {
  const answering = start();
  const verified = result(answering, "a", "a");
  const revealed = revealAnswer(answering, verified);
  assert.deepEqual(acceptPublicState(answering, revealed, members, verified), revealed);
  assert.strictEqual(acceptPublicState(answering, revealed, members, null), answering);
  assert.strictEqual(acceptPublicState(answering, { ...revealed, matchCount: 0 }, members, verified), answering);
  assert.strictEqual(acceptPublicState(answering, { ...revealed, questionIndex: 1 }, members, verified), answering);
  assert.strictEqual(acceptPublicState(answering, revealed, ["host", "third"], verified), answering);
});

test("访客严格验证下一题、版本与重新开始状态", () => {
  const answering = start();
  const revealed = revealAnswer(answering, result(answering));
  const next = beginNextQuestion(revealed, roundIdFor(revealed.quizId, 1));
  assert.deepEqual(acceptPublicState(revealed, next, members), next);
  assert.strictEqual(acceptPublicState(revealed, { ...next, questionIndex: 2 }, members), revealed);
  assert.strictEqual(acceptPublicState(next, revealed, members), next);

  let finished = next;
  for (let index = 1; index < 8; index += 1) {
    finished = revealAnswer(finished, result(finished));
    if (index < 7) finished = beginNextQuestion(finished, roundIdFor(finished.quizId, index + 1));
  }
  const restarted = restartQuiz(finished, { quizId: "quiz-2", roundId: roundIdFor("quiz-2", 0) });
  assert.deepEqual(acceptPublicState(finished, restarted, members), restarted);
  assert.strictEqual(acceptPublicState(finished, { ...restarted, matchCount: 2 }, members), finished);
});
