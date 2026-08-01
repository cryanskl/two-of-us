import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.SPOT_THE_ONE_LOGIC;

function startedMatch(config = {}, seed = "测试种子") {
  return logic.start(logic.createMatch(config, seed));
}

function attrsOf(cell) {
  return ["ornament", "hue", "light", "rotation", "scale", "stroke"]
    .map((key) => `${key}:${cell[key]}`).join("|");
}

test("配置清洗：非法值全部回退，合法值被钳制", () => {
  const fallback = logic.sanitizeConfig(null);
  assert.deepEqual(fallback, logic.DEFAULT_CONFIG);

  const sanitized = logic.sanitizeConfig({
    leftName: "  阿短  ",
    rightName: "",
    roundsTotal: 99,
    lockMs: -5,
  });
  assert.equal(sanitized.leftName, "阿短");
  assert.equal(sanitized.rightName, logic.DEFAULT_CONFIG.rightName);
  assert.equal(sanitized.roundsTotal, 9);
  assert.equal(sanitized.lockMs, 300);

  const longName = logic.sanitizeConfig({ leftName: "一二三四五六七八九十一二三四" });
  assert.equal(Array.from(longName.leftName).length, 12);
});

test("种子归一化：数字与字符串都得到非零 uint32，且稳定", () => {
  assert.equal(logic.normalizeSeed("同一颗种子"), logic.normalizeSeed("同一颗种子"));
  assert.notEqual(logic.normalizeSeed("种子甲"), logic.normalizeSeed("种子乙"));
  assert.equal(logic.normalizeSeed(undefined), 1);
  assert.equal(logic.normalizeSeed(""), 1);
  for (const seed of [0, 1, -7, "a", "情侣"]) {
    const normalized = logic.normalizeSeed(seed);
    assert.ok(Number.isSafeInteger(normalized) && normalized > 0);
  }
});

test("同一种子逐题重放完全一致，不同种子的题面不同", () => {
  for (let roundIndex = 0; roundIndex < 7; roundIndex += 1) {
    assert.deepEqual(
      logic.createRound(logic.normalizeSeed("甲"), roundIndex),
      logic.createRound(logic.normalizeSeed("甲"), roundIndex),
    );
  }
  const first = logic.createRound(logic.normalizeSeed("甲"), 0);
  const second = logic.createRound(logic.normalizeSeed("乙"), 0);
  assert.notDeepEqual(first.cells, second.cells);
});

test("每一题有且仅有一处差异，且差异总包含几何属性", () => {
  for (const seedText of ["甲", "乙", "丙", "夏天的第一场雨"]) {
    const seed = logic.normalizeSeed(seedText);
    for (let roundIndex = 0; roundIndex < 9; roundIndex += 1) {
      const round = logic.createRound(seed, roundIndex);
      const left = logic.panelCells(round, "left");
      const right = logic.panelCells(round, "right");
      assert.equal(left.length, round.cellCount);
      assert.equal(right.length, round.cellCount);

      const differing = [];
      for (let cellIndex = 0; cellIndex < round.cellCount; cellIndex += 1) {
        if (attrsOf(left[cellIndex]) !== attrsOf(right[cellIndex])) differing.push(cellIndex);
      }
      assert.deepEqual(differing, [round.diffIndex], `${seedText} 第 ${roundIndex} 题`);

      const base = left[round.diffIndex];
      const variant = right[round.diffIndex];
      const geometricChanged = base.rotation !== variant.rotation
        || base.scale !== variant.scale
        || base.stroke !== variant.stroke;
      assert.ok(geometricChanged, "差异必须包含旋转、大小或线宽之一");
      assert.equal(base.ornament, variant.ornament);
      assert.equal(base.hue, variant.hue);

      for (const cell of right) {
        assert.ok(cell.rotation >= 0 && cell.rotation < logic.ROTATION_STEPS);
        assert.ok(cell.scale >= 0 && cell.scale < logic.SCALES.length);
        assert.ok(cell.stroke >= 0 && cell.stroke < logic.STROKES.length);
        assert.ok(cell.light >= 0 && cell.light < logic.LIGHTS);
      }
    }
  }
});

test("题面从 3×3 逐题放大，到 7×7 封顶", () => {
  const seed = logic.normalizeSeed("甲");
  const sizes = [];
  for (let roundIndex = 0; roundIndex < 8; roundIndex += 1) {
    sizes.push(logic.createRound(seed, roundIndex).gridSize);
  }
  assert.deepEqual(sizes, [3, 4, 5, 6, 7, 7, 7, 7]);
});

test("点中差异格得分并进入揭晓，点错被锁定且对手不受影响", () => {
  const match = startedMatch();
  const wrongIndex = (match.round.diffIndex + 1) % match.round.cellCount;

  const missed = logic.pick(match, "left", wrongIndex, 1000);
  assert.equal(missed.phase, "playing");
  assert.equal(missed.scores.left, 0);
  assert.equal(missed.locks.left, 1000 + missed.config.lockMs);
  assert.equal(missed.locks.right, 0);
  assert.deepEqual(missed.outcome, {
    type: "miss", side: "left", cellIndex: wrongIndex, roundIndex: 0,
  });

  const lockedRetry = logic.pick(missed, "left", missed.round.diffIndex, 1200);
  assert.equal(lockedRetry, missed);

  const rivalHit = logic.pick(missed, "right", missed.round.diffIndex, 1200);
  assert.equal(rivalHit.phase, "reveal");
  assert.equal(rivalHit.scores.right, 1);
  assert.deepEqual(rivalHit.outcome, {
    type: "hit", side: "right", cellIndex: missed.round.diffIndex, roundIndex: 0,
  });

  const unlockedHit = logic.pick(missed, "left", missed.round.diffIndex, 1000 + missed.config.lockMs);
  assert.equal(unlockedHit.phase, "reveal");
  assert.equal(unlockedHit.scores.left, 1);
});

test("非法输入一律原样返回：错误席位、越界格号、非整数、错误阶段", () => {
  const match = startedMatch();
  assert.equal(logic.pick(match, "middle", 0, 0), match);
  assert.equal(logic.pick(match, "left", -1, 0), match);
  assert.equal(logic.pick(match, "left", match.round.cellCount, 0), match);
  assert.equal(logic.pick(match, "left", 1.5, 0), match);

  const intro = logic.createMatch({}, "甲");
  assert.equal(logic.pick(intro, "left", 0, 0), intro);
  assert.equal(logic.advance(intro), intro);
  assert.equal(logic.start(match), match);

  const revealed = logic.pick(match, "left", match.round.diffIndex, 0);
  assert.equal(logic.pick(revealed, "right", revealed.round.diffIndex, 0), revealed);
});

test("整场对局：五题分出胜负，比分与胜者一致", () => {
  let match = startedMatch({ roundsTotal: 5 });
  const plan = ["left", "left", "right", "left", "right"];
  for (const side of plan) {
    match = logic.pick(match, side, match.round.diffIndex, 0);
    assert.equal(match.phase, "reveal");
    match = logic.advance(match);
  }
  assert.equal(match.phase, "finished");
  assert.equal(match.scores.left, 3);
  assert.equal(match.scores.right, 2);
  assert.equal(match.winner, "left");
  assert.equal(logic.advance(match), match);
});

test("常规题打平进入加时：加时题带 overtime 标记，一题定胜负", () => {
  let match = startedMatch({ roundsTotal: 2 });
  for (const side of ["left", "right"]) {
    match = logic.advance(logic.pick(match, side, match.round.diffIndex, 0));
  }
  assert.equal(match.phase, "playing");
  assert.equal(match.roundIndex, 2);
  assert.equal(match.round.overtime, true);

  const decided = logic.advance(logic.pick(match, "right", match.round.diffIndex, 0));
  assert.equal(decided.phase, "finished");
  assert.equal(decided.winner, "right");
});

test("重新开始换一颗种子会得到新题面，比分清零", () => {
  let match = startedMatch({}, "甲");
  match = logic.advance(logic.pick(match, "left", match.round.diffIndex, 0));
  const rematch = logic.restart(match, "乙");
  assert.equal(rematch.phase, "playing");
  assert.equal(rematch.roundIndex, 0);
  assert.deepEqual(rematch.scores, { left: 0, right: 0 });
  assert.notDeepEqual(rematch.round.cells, logic.createRound(logic.normalizeSeed("甲"), 0).cells);
});

test("状态不可变：pick 与 advance 不修改传入状态", () => {
  const match = startedMatch();
  const before = JSON.stringify(match);
  logic.pick(match, "left", 0, 0);
  logic.pick(match, "left", match.round.diffIndex, 0);
  logic.advance(logic.pick(match, "left", match.round.diffIndex, 0));
  assert.equal(JSON.stringify(match), before);
  assert.ok(Object.isFrozen(match));
  assert.ok(Object.isFrozen(match.round.cells));
});

test("格位文案按行列描述", () => {
  const round = logic.createRound(logic.normalizeSeed("甲"), 1);
  assert.equal(logic.cellLabel(round, 0), "第 1 行第 1 列");
  assert.equal(logic.cellLabel(round, round.gridSize + 2), "第 2 行第 3 列");
});

test("isMatchState 识别有效状态并拒绝畸形对象", () => {
  assert.ok(logic.isMatchState(startedMatch()));
  assert.ok(!logic.isMatchState(null));
  assert.ok(!logic.isMatchState({ phase: "flying", scores: { left: 0, right: 0 } }));
  assert.ok(!logic.isMatchState({ phase: "playing", scores: { left: "0", right: 0 } }));
});
