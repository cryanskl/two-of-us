import assert from "node:assert/strict";
import test from "node:test";
import "./logic.js";

const logic = globalThis.ECHO_ARENA_LOGIC;

test("四音配置、快捷键和十六音上限稳定且深冻结", () => {
  assert.deepEqual(logic.NOTES.map(({ id, key, frequency, type }) => ({ id, key, frequency, type })), [
    { id: "do", key: "1", frequency: 261.63, type: "sine" },
    { id: "mi", key: "2", frequency: 329.63, type: "triangle" },
    { id: "sol", key: "3", frequency: 392, type: "sine" },
    { id: "la", key: "4", frequency: 440, type: "triangle" },
  ]);
  assert.equal(logic.MAX_SEQUENCE_LENGTH, 16);
  assert.equal(Object.isFrozen(logic.NOTES), true);
  assert.equal(Object.isFrozen(logic.NOTES[0]), true);
});

test("配置整份回退，合法名字规范化且状态完全冻结", () => {
  const custom = logic.createInitialState({ aName: "  小 岚 ", bName: "阿舟", firstPlayer: "b" });
  assert.deepEqual(custom.players, { a: "小 岚", b: "阿舟" });
  assert.equal(custom.currentPlayer, "b");
  assert.equal(custom.starter, "b");
  assert.equal(Object.isFrozen(custom), true);
  assert.equal(Object.isFrozen(custom.players), true);
  assert.equal(Object.isFrozen(custom.scores), true);

  const fallback = logic.createInitialState({ aName: "有效", bName: "", firstPlayer: "b" });
  assert.deepEqual(fallback.players, { a: "A 席", b: "B 席" });
  assert.equal(fallback.firstPlayer, "a");
});

test("只有 intro → handoff → playback → repeat 可以开始复现", () => {
  const intro = logic.createInitialState();
  assert.equal(logic.beginPlayback(intro), intro);
  assert.equal(logic.startMatch(intro, "unknown"), intro);

  const handoff = logic.startMatch(intro, "do");
  assert.equal(handoff.phase, "handoff");
  assert.deepEqual(handoff.sequence, ["do"]);
  assert.equal(logic.pressNote(handoff, "do"), handoff);

  const playback = logic.beginPlayback(handoff);
  assert.equal(playback.phase, "playback");
  assert.equal(playback.playbackToken, 1);
  assert.equal(logic.pressNote(playback, "do"), playback);

  const repeat = logic.finishPlayback(playback, playback.playbackToken);
  assert.equal(repeat.phase, "repeat");
});

test("playback token 单调且旧回调不能完成新播放", () => {
  const firstPlayback = beginGame("do");
  assert.equal(logic.finishPlayback(firstPlayback, firstPlayback.playbackToken - 1), firstPlayback);
  const repeat = logic.finishPlayback(firstPlayback, firstPlayback.playbackToken);
  const append = logic.pressNote(repeat, "do");
  const handoff = logic.pressNote(append, "mi");
  const secondPlayback = logic.beginPlayback(handoff);

  assert.equal(secondPlayback.playbackToken, firstPlayback.playbackToken + 1);
  assert.equal(logic.finishPlayback(secondPlayback, firstPlayback.playbackToken), secondPlayback);
  assert.equal(logic.finishPlayback(secondPlayback, secondPlayback.playbackToken).phase, "repeat");
});

test("正确前缀逐音推进，完整复现后才进入 append", () => {
  const repeat = repeatFor(["do", "mi", "sol"]);
  const one = logic.pressNote(repeat, "do");
  const two = logic.pressNote(one, "mi");
  const three = logic.pressNote(two, "sol");

  assert.equal(one.phase, "repeat");
  assert.equal(one.inputIndex, 1);
  assert.equal(two.inputIndex, 2);
  assert.equal(three.phase, "append");
  assert.equal(three.inputIndex, 3);
  assert.deepEqual(three.lastInput, { player: "a", noteId: "sol", expected: "sol", correct: true });
});

test("复现错误只给对方一分并记录实际与期望", () => {
  const repeat = repeatFor(["do", "mi"]);
  const lost = logic.pressNote(repeat, "la");

  assert.equal(lost.phase, "round-over");
  assert.deepEqual(lost.scores, { a: 0, b: 1 });
  assert.equal(lost.winner, "b");
  assert.equal(lost.loser, "a");
  assert.equal(lost.endReason, "mistake");
  assert.deepEqual(lost.lastInput, { player: "a", noteId: "la", expected: "do", correct: false });
  assert.equal(logic.pressNote(lost, "do"), lost);
});

test("追加新音后换手、增加回合并复制序列", () => {
  const repeat = repeatFor(["do"]);
  const append = logic.pressNote(repeat, "do");
  const originalSequence = append.sequence;
  const handoff = logic.pressNote(append, "mi");

  assert.equal(handoff.phase, "handoff");
  assert.equal(handoff.currentPlayer, "b");
  assert.equal(handoff.turnNumber, 2);
  assert.deepEqual(handoff.sequence, ["do", "mi"]);
  assert.notEqual(handoff.sequence, originalSequence);
  assert.deepEqual(originalSequence, ["do"]);
});

test("第十六音共同封顶且不改变比分", () => {
  const sequence = Array.from({ length: 15 }, (_, index) => logic.NOTE_IDS[index % 4]);
  let state = repeatFor(sequence);
  for (const noteId of sequence) state = logic.pressNote(state, noteId);
  assert.equal(state.phase, "append");

  const capped = logic.pressNote(state, "la");
  assert.equal(capped.phase, "round-over");
  assert.equal(capped.sequence.length, 16);
  assert.deepEqual(capped.scores, { a: 0, b: 0 });
  assert.equal(capped.endReason, "cap");
  assert.equal(capped.winner, null);
});

test("每局轮换先手、保留比分且一比一后允许决胜局", () => {
  const firstLoss = logic.pressNote(repeatFor(["do"]), "mi");
  const secondGame = logic.startNextGame(firstLoss, "sol");
  assert.equal(secondGame.gameNumber, 2);
  assert.equal(secondGame.starter, "b");
  assert.equal(secondGame.currentPlayer, "b");
  assert.deepEqual(secondGame.scores, { a: 0, b: 1 });
  assert.deepEqual(secondGame.sequence, ["sol"]);

  const secondRepeat = logic.finishPlayback(logic.beginPlayback(secondGame), secondGame.playbackToken + 1);
  const tiedRound = logic.pressNote(secondRepeat, "la");
  assert.equal(tiedRound.phase, "round-over");
  assert.equal(tiedRound.winner, "a");
  assert.deepEqual(tiedRound.scores, { a: 1, b: 1 });

  const thirdGame = logic.startNextGame(tiedRound, "do");
  assert.equal(thirdGame.phase, "handoff");
  assert.equal(thirdGame.gameNumber, 3);
  assert.equal(thirdGame.starter, "a");
});

test("同一位赢家拿到第二分才结束，重开恢复首局配置", () => {
  const firstLoss = logic.pressNote(repeatFor(["do"]), "mi");
  const secondGame = logic.startNextGame(firstLoss, "sol");
  let repeat = logic.finishPlayback(logic.beginPlayback(secondGame), secondGame.playbackToken + 1);
  repeat = logic.pressNote(repeat, "sol");
  const append = repeat;
  const nextHandoff = logic.pressNote(append, "do");
  repeat = logic.finishPlayback(logic.beginPlayback(nextHandoff), nextHandoff.playbackToken + 1);
  const match = logic.pressNote(repeat, repeat.sequence[0] === "la" ? "do" : "la");

  assert.equal(match.phase, "match-over");
  assert.equal(match.winner, "b");
  assert.deepEqual(match.scores, { a: 0, b: 2 });

  const restarted = logic.restartMatch(match);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.gameNumber, 1);
  assert.equal(restarted.playbackToken, 0);
  assert.deepEqual(restarted.scores, { a: 0, b: 0 });
});

test("非法阶段和音符保持原引用，畸形状态安全回退", () => {
  const intro = logic.createInitialState();
  assert.equal(logic.pressNote(intro, "do"), intro);
  assert.equal(logic.pressNote(intro, "bad"), intro);
  assert.equal(logic.finishPlayback(intro, 0), intro);
  assert.equal(logic.restartMatch(intro), intro);

  const recovered = logic.pressNote({ phase: "repeat", sequence: null }, "do");
  assert.equal(recovered.phase, "intro");
  assert.equal(logic.isGameState(recovered), true);
});

function beginGame(openingNote) {
  return logic.beginPlayback(logic.startMatch(logic.createInitialState(), openingNote));
}

function repeatFor(sequence) {
  let state = logic.finishPlayback(beginGame(sequence[0]), 1);
  if (sequence.length === 1) return state;
  state = { ...state, sequence: Object.freeze([...sequence]) };
  assert.equal(logic.isGameState(state), true);
  return Object.freeze(state);
}
