import test from "node:test";
import assert from "node:assert/strict";

import {
  acceptPublicState,
  advanceCountdown,
  applyTap,
  cloneState,
  createWaitingState,
  isValidState,
  MATCH_WIN_SCORE,
  resetForMembership,
  restartMatch,
  startCountdown,
  startNextRound,
  TAP_THROTTLE_MS,
  TARGET_PROGRESS,
} from "./logic.js";

const members = ["host", "guest"];

function beginRace(state = createWaitingState({ memberIds: members })) {
  let next = startCountdown(state);
  assert.equal(next.countdown, 3);
  next = advanceCountdown(next);
  assert.equal(next.countdown, 2);
  next = advanceCountdown(next);
  assert.equal(next.countdown, 1);
  next = advanceCountdown(next);
  assert.equal(next.phase, "racing");
  return next;
}

function tapMany(state, senderId, count, { seq = 0, at = 0 } = {}) {
  let next = state;
  for (let index = 1; index <= count; index += 1) {
    next = applyTap(next, {
      senderId,
      inputSeq: seq + index,
      acceptedAt: at + index * TAP_THROTTLE_MS,
    });
  }
  return next;
}

test("只有两个不同且有效的成员才能创建等待状态", () => {
  for (const memberIds of [undefined, [], ["host"], ["host", "host"], ["host", ""]]) {
    assert.throws(() => createWaitingState({ memberIds }), TypeError);
  }

  const state = createWaitingState({ memberIds: [" host ", "guest"], version: 8 });
  assert.equal(state.version, 9);
  assert.equal(state.phase, "waiting");
  assert.deepEqual(state.memberIds, ["host", "guest"]);
  assert.deepEqual(state.progress, { host: 0, guest: 0 });
  assert.equal(isValidState(state), true);
});

test("等待、三段权威倒数与比赛状态按次递增版本", () => {
  const waiting = createWaitingState({ memberIds: members });
  const countdown3 = startCountdown(waiting);
  const countdown2 = advanceCountdown(countdown3);
  const countdown1 = advanceCountdown(countdown2);
  const racing = advanceCountdown(countdown1);

  assert.deepEqual(
    [waiting.version, countdown3.version, countdown2.version, countdown1.version, racing.version],
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    [waiting.phase, countdown3.countdown, countdown2.countdown, countdown1.countdown, racing.phase],
    ["waiting", 3, 2, 1, "racing"],
  );
  assert.equal(racing.countdown, null);
  assert.strictEqual(startCountdown(countdown3), countdown3);
  assert.strictEqual(advanceCountdown(waiting), waiting);
});

test("有效点击每次只前进一步，无效发送者、序号、时间和阶段保持原对象", () => {
  const racing = beginRace();
  const first = applyTap(racing, { senderId: "host", inputSeq: 1, acceptedAt: 30 });
  assert.equal(first.progress.host, 1);
  assert.equal(first.progress.guest, 0);
  assert.equal(first.version, racing.version + 1);

  for (const [state, input] of [
    [racing, { senderId: "third", inputSeq: 1, acceptedAt: 30 }],
    [racing, { senderId: "host", inputSeq: 0, acceptedAt: 30 }],
    [racing, { senderId: "host", inputSeq: 1.5, acceptedAt: 30 }],
    [racing, { senderId: "host", inputSeq: 1, acceptedAt: -1 }],
    [racing, { senderId: "host", inputSeq: 1, acceptedAt: Number.NaN }],
    [createWaitingState({ memberIds: members }), { senderId: "host", inputSeq: 1, acceptedAt: 30 }],
  ]) {
    assert.strictEqual(applyTap(state, input), state);
  }
});

test("重复、倒退与过快输入不加进度，被节流序号也不能稍后重放", () => {
  const first = applyTap(beginRace(), { senderId: "host", inputSeq: 1, acceptedAt: 30 });
  assert.strictEqual(
    applyTap(first, { senderId: "host", inputSeq: 1, acceptedAt: 60 }),
    first,
  );
  assert.strictEqual(
    applyTap(first, { senderId: "host", inputSeq: 0, acceptedAt: 60 }),
    first,
  );

  const throttled = applyTap(first, { senderId: "host", inputSeq: 2, acceptedAt: 59 });
  assert.equal(throttled.progress.host, 1);
  assert.equal(throttled.lastInputSeq.host, 2);
  assert.equal(throttled.lastAcceptedAt.host, 30);
  assert.equal(throttled.version, first.version + 1);
  assert.strictEqual(
    applyTap(throttled, { senderId: "host", inputSeq: 2, acceptedAt: 90 }),
    throttled,
  );

  const recovered = applyTap(throttled, { senderId: "host", inputSeq: 3, acceptedAt: 60 });
  assert.equal(recovered.progress.host, 2);
  assert.equal(recovered.lastAcceptedAt.host, 60);
});

test("第 30 步在同一次 reducer 中封顶进度、冻结赢家并加分", () => {
  const almost = tapMany(beginRace(), "host", TARGET_PROGRESS - 1);
  assert.equal(almost.progress.host, 29);
  assert.equal(almost.phase, "racing");

  const won = applyTap(almost, {
    senderId: "host",
    inputSeq: TARGET_PROGRESS,
    acceptedAt: TARGET_PROGRESS * TAP_THROTTLE_MS,
  });
  assert.equal(won.progress.host, TARGET_PROGRESS);
  assert.equal(won.roundWinnerId, "host");
  assert.equal(won.scores.host, 1);
  assert.equal(won.phase, "round-ended");
  assert.equal(won.matchWinnerId, null);
  assert.strictEqual(
    applyTap(won, { senderId: "guest", inputSeq: 1, acceptedAt: 9999 }),
    won,
  );
});

test("下一局保留比分与已观察序号，同时清空局内进度和节流时间", () => {
  const won = tapMany(beginRace(), "host", TARGET_PROGRESS);
  const nextRound = startNextRound(won);

  assert.equal(nextRound.phase, "countdown");
  assert.equal(nextRound.countdown, 3);
  assert.equal(nextRound.roundNumber, 2);
  assert.deepEqual(nextRound.scores, { host: 1, guest: 0 });
  assert.deepEqual(nextRound.progress, { host: 0, guest: 0 });
  assert.deepEqual(nextRound.lastInputSeq, { host: TARGET_PROGRESS, guest: 0 });
  assert.deepEqual(nextRound.lastAcceptedAt, { host: 0, guest: 0 });
  assert.equal(nextRound.roundWinnerId, null);
  assert.strictEqual(startNextRound(nextRound), nextRound);
});

test("同一成员先赢两局后原子进入整场结束", () => {
  const roundOne = tapMany(beginRace(), "host", TARGET_PROGRESS);
  const roundTwoRace = advanceCountdown(advanceCountdown(advanceCountdown(startNextRound(roundOne))));
  const finished = tapMany(roundTwoRace, "host", TARGET_PROGRESS, {
    seq: roundTwoRace.lastInputSeq.host,
  });

  assert.equal(finished.phase, "match-ended");
  assert.equal(finished.roundNumber, 2);
  assert.equal(finished.scores.host, MATCH_WIN_SCORE);
  assert.equal(finished.roundWinnerId, "host");
  assert.equal(finished.matchWinnerId, "host");
  assert.equal(isValidState(finished), true);
});

test("再来一场清空比分、进度、序号和赢家并重新倒数", () => {
  const roundOne = tapMany(beginRace(), "guest", TARGET_PROGRESS);
  const roundTwoRace = advanceCountdown(advanceCountdown(advanceCountdown(startNextRound(roundOne))));
  const finished = tapMany(roundTwoRace, "guest", TARGET_PROGRESS, {
    seq: roundTwoRace.lastInputSeq.guest,
  });
  const restarted = restartMatch(finished);

  assert.equal(restarted.version, finished.version + 1);
  assert.equal(restarted.phase, "countdown");
  assert.equal(restarted.countdown, 3);
  assert.equal(restarted.roundNumber, 1);
  assert.deepEqual(restarted.progress, { host: 0, guest: 0 });
  assert.deepEqual(restarted.scores, { host: 0, guest: 0 });
  assert.deepEqual(restarted.lastInputSeq, { host: 0, guest: 0 });
  assert.deepEqual(restarted.lastAcceptedAt, { host: 0, guest: 0 });
  assert.equal(restarted.roundWinnerId, null);
  assert.equal(restarted.matchWinnerId, null);
  assert.equal(isValidState(restarted), true);
});

test("成员替换或主机迁移可建立版本更新的全新等待态", () => {
  const racing = beginRace();
  const progressed = applyTap(racing, { senderId: "host", inputSeq: 9, acceptedAt: 300 });
  const reset = resetForMembership({
    memberIds: ["guest", "new-member"],
    currentState: progressed,
  });

  assert.equal(reset.version, progressed.version + 1);
  assert.equal(reset.phase, "waiting");
  assert.deepEqual(reset.memberIds, ["guest", "new-member"]);
  assert.deepEqual(reset.progress, { guest: 0, "new-member": 0 });
  assert.deepEqual(reset.scores, { guest: 0, "new-member": 0 });
});

test("公开状态拒绝畸形结构、成员变化和版本回退，并深克隆全部可变字段", () => {
  const current = beginRace();
  const incoming = applyTap(current, { senderId: "host", inputSeq: 1, acceptedAt: 30 });
  const accepted = acceptPublicState(current, incoming, members);
  assert.deepEqual(accepted, incoming);
  assert.notStrictEqual(accepted, incoming);
  for (const key of ["memberIds", "progress", "scores", "lastInputSeq", "lastAcceptedAt"]) {
    assert.notStrictEqual(accepted[key], incoming[key]);
  }

  assert.strictEqual(acceptPublicState(incoming, current, members), incoming);
  assert.strictEqual(acceptPublicState(current, incoming, ["guest", "host"]), current);
  assert.strictEqual(acceptPublicState(current, { ...incoming, extra: true }, members), current);
  assert.strictEqual(acceptPublicState(current, { ...incoming, progress: { host: 31, guest: 0 } }, members), current);
  assert.strictEqual(acceptPublicState(current, { ...incoming, scores: { host: 0, third: 0 } }, members), current);

  const cloned = cloneState(incoming);
  cloned.progress.host = 99;
  cloned.memberIds[0] = "mutated";
  assert.equal(incoming.progress.host, 1);
  assert.equal(incoming.memberIds[0], "host");
});
