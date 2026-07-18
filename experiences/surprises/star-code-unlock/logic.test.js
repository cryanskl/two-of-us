import test from "node:test";
import assert from "node:assert/strict";

delete globalThis.STAR_CODE_UNLOCK_LOGIC;
await import("./logic.js");

const logic = globalThis.STAR_CODE_UNLOCK_LOGIC;

function solving() {
  return logic.start(logic.createInitialState());
}

function miss(state, answer = "完全不对") {
  return logic.submitAnswer(state, answer, logic.DEFAULT_CONFIG);
}

function solve(state, answer) {
  return logic.submitAnswer(state, answer, logic.DEFAULT_CONFIG);
}

test("公开 12 个固定星位、阶段与默认三题星码", () => {
  assert.deepEqual(logic.PHASES, ["intro", "solving", "missed", "linked", "ready", "revealed"]);
  assert.equal(logic.STAR_POSITIONS.length, 12);
  assert.deepEqual(logic.STAR_POSITIONS[0], { id: "s01", x: 500, y: 120 });
  assert.deepEqual(logic.STAR_POSITIONS.at(-1), { id: "s12", x: 500, y: 810 });
  assert.equal(new Set(logic.STAR_POSITIONS.map((star) => star.id)).size, 12);
  assert.deepEqual(logic.DEFAULT_CONFIG.clues.map((clue) => clue.starId), ["s03", "s09", "s12"]);
  assert.ok(logic.DEFAULT_CONFIG.clues.every((clue) => logic.STAR_POSITIONS.some((star) => star.id === clue.starId)));
  assert.ok(Object.isFrozen(logic.STAR_POSITIONS));
  assert.ok(logic.STAR_POSITIONS.every(Object.isFrozen));
});

test("配置修剪、递归冻结且隔离调用方数组和对象", () => {
  const source = structuredClone(logic.DEFAULT_CONFIG);
  source.recipientName = "  小满  ";
  source.clues[0].prompt = "  我们第一次坐在哪里？  ";
  source.clues[0].acceptedAnswers = [" 窗边 ", " 靠窗 "];
  source.secretWords = [" 你 ", " 就是 ", " 答案 "];
  source.revealLines = [" 第一段 ", " 第二段 "];
  source.hintAfterMiss = () => "策略不进入受控数据";
  const config = logic.sanitizeConfig(source);

  source.clues[0].acceptedAnswers[0] = "被修改";
  source.secretWords[0] = "被修改";
  assert.equal(config.recipientName, "小满");
  assert.equal(config.clues[0].prompt, "我们第一次坐在哪里？");
  assert.deepEqual(config.clues[0].acceptedAnswers, ["窗边", "靠窗"]);
  assert.deepEqual(config.secretWords, ["你", "就是", "答案"]);
  assert.deepEqual(config.revealLines, ["第一段", "第二段"]);
  assert.equal(Object.hasOwn(config, "hintAfterMiss"), false);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.clues));
  assert.ok(Object.isFrozen(config.clues[0]));
  assert.ok(Object.isFrozen(config.clues[0].acceptedAnswers));
});

test("任一配置 Gate 失败都整份回退默认配置", () => {
  const valid = structuredClone(logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig(null), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({ ...valid, recipientName: "" }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({ ...valid, clues: valid.clues.slice(0, 2) }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({
    ...valid,
    clues: valid.clues.map((clue, index) => ({ ...clue, id: index ? clue.id : "c2" })),
  }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({
    ...valid,
    clues: valid.clues.map((clue, index) => ({ ...clue, starId: index ? clue.starId : "s09" })),
  }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({
    ...valid,
    clues: valid.clues.map((clue, index) => index === 0
      ? { ...clue, acceptedAnswers: ["７ 月", "7月"] }
      : clue),
  }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({ ...valid, secretWords: ["只", "两段"] }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({ ...valid, revealLines: [] }), logic.DEFAULT_CONFIG);
});

test("答案匹配执行 NFKC、大小写、空白与常见标点规范化", () => {
  assert.equal(logic.normalizeAnswer(" ７ 月！ "), "7月");
  assert.equal(logic.normalizeAnswer(" Ｈｅｌｌｏ，WORLD。 "), "helloworld");
  assert.equal(logic.normalizeAnswer("靠 窗 的 位 置"), "靠窗的位置");
  assert.equal(logic.normalizeAnswer("“日落”"), "日落");
  assert.equal(logic.normalizeAnswer("，！？…"), null);
  assert.equal(logic.normalizeAnswer(null), null);
  assert.equal(logic.normalizeAnswer("字".repeat(81)), null);
});

test("intro 只能开始一次，solving 一次提交后立即锁定", () => {
  const initial = logic.createInitialState();
  const started = logic.start(initial);
  const missed = miss(started);
  assert.equal(started.phase, "solving");
  assert.strictEqual(logic.start(started), started);
  assert.equal(missed.phase, "missed");
  assert.strictEqual(miss(missed), missed);
  assert.strictEqual(solve(missed, "窗边"), missed);
  assert.ok(Object.isFrozen(missed));
  assert.ok(Object.isFrozen(missed.wrongCounts));
  assert.ok(Object.isFrozen(missed.lastResult));
});

test("错误只递增当前题且状态绝不保存任何答案", () => {
  const firstMiss = miss(solving(), "秘密原文 123");
  assert.deepEqual(firstMiss.wrongCounts, [1, 0, 0]);
  assert.deepEqual(firstMiss.lastResult, { clueId: "c1", type: "wrong", wrongCount: 1 });
  assert.deepEqual(Object.keys(firstMiss).sort(), [
    "clueIndex", "lastResult", "phase", "revision", "solvedStarIds", "wrongCounts",
  ]);
  assert.doesNotMatch(JSON.stringify(firstMiss), /秘密原文|123|窗边|acceptedAnswers/);

  const second = logic.continueAfterLink(solve(logic.retry(firstMiss), "窗边"));
  const secondMiss = miss(second);
  assert.deepEqual(secondMiss.wrongCounts, [1, 1, 0]);
  assert.deepEqual(secondMiss.solvedStarIds, ["s03", null, null]);
});

test("retry 只恢复同一题并保留累计错误数", () => {
  const missed = miss(solving());
  const retried = logic.retry(missed);
  assert.equal(retried.phase, "solving");
  assert.equal(retried.clueIndex, 0);
  assert.deepEqual(retried.wrongCounts, [1, 0, 0]);
  assert.equal(retried.lastResult, null);
  assert.strictEqual(logic.retry(retried), retried);
});

test("rescue 第三次前无效，第三次后点亮与正确答案相同的星", () => {
  const first = miss(solving());
  assert.strictEqual(logic.rescue(first, logic.DEFAULT_CONFIG), first);
  const second = miss(logic.retry(first));
  assert.strictEqual(logic.rescue(second, logic.DEFAULT_CONFIG), second);
  const third = miss(logic.retry(second));
  const rescued = logic.rescue(third, logic.DEFAULT_CONFIG);
  const correct = solve(solving(), "窗边");
  assert.equal(rescued.phase, "linked");
  assert.deepEqual(rescued.solvedStarIds, correct.solvedStarIds);
  assert.deepEqual(rescued.lastResult, { clueId: "c1", type: "rescued", wrongCount: 3 });
});

test("多个可接受写法稳定匹配，未知输入不能点亮", () => {
  const canonical = solve(solving(), "窗边");
  const alias = solve(solving(), " 靠，窗 的 位 置！ ");
  const wrong = solve(solving(), "门边");
  assert.equal(canonical.phase, "linked");
  assert.equal(alias.phase, "linked");
  assert.deepEqual(canonical.solvedStarIds, alias.solvedStarIds);
  assert.equal(wrong.phase, "missed");
  assert.deepEqual(wrong.solvedStarIds, [null, null, null]);
});

test("linked 仅显式推进，前两题进入下一题，第三题唯一进入 ready", () => {
  const firstLink = solve(solving(), "窗边");
  assert.strictEqual(solve(firstLink, "傍晚"), firstLink);
  const secondSolving = logic.continueAfterLink(firstLink);
  const secondLink = solve(secondSolving, "傍晚");
  const thirdSolving = logic.continueAfterLink(secondLink);
  const thirdLink = solve(thirdSolving, "到家");
  const ready = logic.continueAfterLink(thirdLink);
  assert.deepEqual([secondSolving.phase, secondSolving.clueIndex], ["solving", 1]);
  assert.deepEqual([thirdSolving.phase, thirdSolving.clueIndex], ["solving", 2]);
  assert.equal(thirdLink.phase, "linked");
  assert.equal(ready.phase, "ready");
  assert.deepEqual(ready.solvedStarIds, ["s03", "s09", "s12"]);
  assert.strictEqual(logic.continueAfterLink(ready), ready);
});

test("reveal 只从 ready 生效，restart 只从 revealed 清空且 revision 单调", () => {
  let state = solving();
  for (const answer of ["窗边", "日落", "回家"]) {
    state = solve(state, answer);
    state = logic.continueAfterLink(state);
  }
  assert.equal(state.phase, "ready");
  assert.strictEqual(logic.restart(state), state);
  const revealed = logic.reveal(state);
  assert.equal(revealed.phase, "revealed");
  assert.strictEqual(logic.reveal(revealed), revealed);
  const restarted = logic.restart(revealed);
  assert.equal(restarted.phase, "intro");
  assert.deepEqual(restarted.solvedStarIds, [null, null, null]);
  assert.deepEqual(restarted.wrongCounts, [0, 0, 0]);
  assert.equal(restarted.revision, revealed.revision + 1);
});

test("默认路径只通过生产 API 可确定到达 revealed", () => {
  let state = logic.start(logic.createInitialState(logic.DEFAULT_CONFIG));
  for (const clue of logic.DEFAULT_CONFIG.clues) {
    state = logic.submitAnswer(state, clue.acceptedAnswers[0], logic.DEFAULT_CONFIG);
    assert.equal(state.phase, "linked");
    state = logic.continueAfterLink(state);
  }
  assert.equal(state.phase, "ready");
  state = logic.reveal(state);
  assert.equal(state.phase, "revealed");
  assert.equal(logic.isStarCodeState(state), true);
});

test("hint 策略安全回退，畸形状态回初始且非法动作保持原引用", () => {
  let received;
  const custom = logic.resolveMissHint((context) => {
    received = context;
    return "  再想想窗外的光。  ";
  }, { clueIndex: 1, wrongCount: 2, acceptedAnswers: ["泄露"] });
  assert.equal(custom, "再想想窗外的光。");
  assert.deepEqual(received, { clueIndex: 1, wrongCount: 2 });
  assert.ok(Object.isFrozen(received));
  assert.equal(Object.hasOwn(received, "acceptedAnswers"), false);
  assert.match(logic.resolveMissHint(() => { throw new Error("坏策略"); }, {
    clueIndex: 0, wrongCount: 1,
  }), /没有落在/);
  assert.match(logic.resolveMissHint(() => "x".repeat(101), {
    clueIndex: 0, wrongCount: 2,
  }), /换个/);
  let called = false;
  assert.match(logic.resolveMissHint(() => { called = true; return "取消帮助"; }, {
    clueIndex: 0, wrongCount: 3,
  }), /可以帮你/);
  assert.equal(called, false);

  const malformed = { phase: "solving", rawAnswer: "窗边" };
  for (const result of [
    logic.start(malformed),
    logic.submitAnswer(malformed, "窗边", logic.DEFAULT_CONFIG),
    logic.retry(malformed),
    logic.rescue(malformed, logic.DEFAULT_CONFIG),
    logic.continueAfterLink(malformed),
    logic.reveal(malformed),
    logic.restart(malformed),
  ]) {
    assert.equal(result.phase, "intro");
    assert.equal(logic.isStarCodeState(result), true);
  }

  const initial = logic.createInitialState();
  const solvingState = logic.start(initial);
  assert.strictEqual(logic.retry(initial), initial);
  assert.strictEqual(logic.reveal(initial), initial);
  assert.strictEqual(logic.restart(initial), initial);
  assert.strictEqual(logic.continueAfterLink(solvingState), solvingState);
  assert.strictEqual(logic.rescue(solvingState, logic.DEFAULT_CONFIG), solvingState);
  assert.equal(logic.isStarCodeState({ ...initial, rawAnswer: "泄露" }), false);
});
