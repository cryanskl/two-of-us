import test from "node:test";
import assert from "node:assert/strict";

delete globalThis.CLOSER_CARDS_LOGIC;
await import("./logic.js");
delete globalThis.CLOSER_CARDS_CONFIG;
await import("./config.js");

const logic = globalThis.CLOSER_CARDS_LOGIC;

function zeroIndex() {
  return 0;
}

function start(config, strategy) {
  return logic.startSession(logic.createInitialState(config), logic.CARDS, zeroIndex, strategy);
}

function reveal(state) {
  return logic.revealCard(state);
}

function completeCurrent(state) {
  return logic.settleCard(logic.finishSpeaking(logic.finishSpeaking(reveal(state))));
}

function longestThemeRun(plan) {
  const themeById = new Map(logic.CARDS.map((card) => [card.id, card.theme]));
  let longest = 0;
  let current = 0;
  let previous = null;
  for (const id of plan) {
    const theme = themeById.get(id);
    current = theme === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = theme;
  }
  return longest;
}

test("24 张原创问题分为三个主题、ID 唯一且长度符合 Gate", () => {
  assert.equal(logic.CARDS.length, 24);
  assert.equal(new Set(logic.CARDS.map((card) => card.id)).size, 24);
  assert.deepEqual(logic.THEMES.map((theme) => theme.id), ["today", "us", "tomorrow"]);
  for (const theme of logic.THEMES) {
    assert.equal(logic.CARDS.filter((card) => card.theme === theme.id).length, 8);
  }
  assert.ok(logic.CARDS.every((card) => card.question.length >= 18 && card.question.length <= 42));
  assert.ok(Object.isFrozen(logic.CARDS));
  assert.ok(Object.isFrozen(logic.CARDS[0]));
});

test("配置整份回退、名字去空白、目标张数与状态递归冻结", () => {
  const strategy = () => null;
  const config = logic.sanitizeConfig({
    aName: "  小满  ",
    bName: "  阿岚 ",
    firstSpeaker: "b",
    sessionSize: 6,
    chooseOpeningCard: strategy,
  });
  assert.deepEqual(config, {
    aName: "小满",
    bName: "阿岚",
    firstSpeaker: "b",
    sessionSize: 6,
    chooseOpeningCard: strategy,
  });
  assert.ok(Object.isFrozen(config));
  assert.equal(logic.sanitizeConfig({ ...config, aName: "" }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ ...config, firstSpeaker: "c" }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ ...config, sessionSize: 4 }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ ...config, chooseOpeningCard: null }), logic.DEFAULT_CONFIG);

  const state = logic.createInitialState(config);
  assert.deepEqual(state.players, { a: "小满", b: "阿岚" });
  assert.equal(state.firstSpeaker, "b");
  assert.equal(state.sessionSize, 6);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.players));
  assert.ok(Object.isFrozen(state.plan));
  assert.ok(Object.isFrozen(state.completedIds));
});

test("本地 config 提供默认双席与可安全校验的开场策略", () => {
  const config = globalThis.CLOSER_CARDS_CONFIG;
  assert.equal(config.aName, "A 席");
  assert.equal(config.bName, "B 席");
  assert.equal(config.firstSpeaker, "a");
  assert.equal(config.sessionSize, 6);
  assert.equal(typeof config.chooseOpeningCard, "function");
  assert.equal(config.chooseOpeningCard({ cardIds: [], themeIds: [] }), null);
  assert.notEqual(logic.sanitizeConfig(config), logic.DEFAULT_CONFIG);
});

test("平衡计划恰含 24 张唯一卡，前六覆盖三主题且不出现三连", () => {
  const plan = logic.createBalancedPlan(logic.CARDS, zeroIndex);
  const themes = plan.slice(0, 6).map((id) => logic.CARDS.find((card) => card.id === id).theme);
  assert.equal(plan.length, 24);
  assert.equal(new Set(plan).size, 24);
  assert.deepEqual(new Set(themes), new Set(["today", "us", "tomorrow"]));
  assert.ok(longestThemeRun(plan) <= 2);
  assert.ok(Object.isFrozen(plan));
  assert.equal(logic.createBalancedPlan(logic.CARDS, () => 99), null);
});

test("合法开场卡只移动到首位，策略上下文冻结且异常和非法返回安全回退", () => {
  let received;
  const wanted = "tomorrow-teamwork";
  const chosen = logic.createBalancedPlan(logic.CARDS, zeroIndex, (context) => {
    received = context;
    return wanted;
  });
  assert.equal(chosen[0], wanted);
  assert.equal(chosen.filter((id) => id === wanted).length, 1);
  assert.equal(chosen.length, 24);
  assert.ok(longestThemeRun(chosen) <= 2);
  assert.ok(Object.isFrozen(received));
  assert.ok(Object.isFrozen(received.cardIds));
  assert.ok(Object.isFrozen(received.themeIds));

  const baseline = logic.createBalancedPlan(logic.CARDS, zeroIndex);
  assert.deepEqual(logic.createBalancedPlan(logic.CARDS, zeroIndex, () => "not-a-card"), baseline);
  assert.deepEqual(logic.createBalancedPlan(logic.CARDS, zeroIndex, () => { throw new Error("策略坏了"); }), baseline);
  assert.deepEqual(logic.createBalancedPlan(logic.CARDS, zeroIndex, ({ cardIds }) => {
    cardIds.pop();
    return wanted;
  }), baseline);
});

test("intro 到收好阶段的权威流转不会提前推进卡片", () => {
  const initial = logic.createInitialState();
  const back = logic.startSession(initial, logic.CARDS, zeroIndex);
  const first = logic.revealCard(back);
  const second = logic.finishSpeaking(first);
  const settle = logic.finishSpeaking(second);
  assert.deepEqual(
    [initial.phase, back.phase, first.phase, second.phase, settle.phase],
    ["intro", "card-back", "first-speaking", "second-speaking", "settle"],
  );
  assert.equal(first.currentSpeaker, "a");
  assert.equal(second.currentSpeaker, "b");
  assert.equal(settle.currentSpeaker, null);
  assert.equal(settle.cursor, 0);
  assert.deepEqual(settle.completedIds, []);
  assert.equal(logic.getCurrentCard(back, logic.CARDS).id, back.plan[0]);
});

test("完成卡计数、首发严格交替并在目标张数进入共同完成", () => {
  let state = start();
  const firstId = state.plan[0];
  state = completeCurrent(state);
  assert.equal(state.phase, "card-back");
  assert.deepEqual(state.completedIds, [firstId]);
  assert.equal(state.firstSpeaker, "b");
  assert.equal(reveal(state).currentSpeaker, "b");

  for (let count = 1; count < 6; count += 1) state = completeCurrent(state);
  assert.equal(state.phase, "complete");
  assert.equal(state.endReason, "six-complete");
  assert.equal(state.completedIds.length, 6);
  assert.equal(state.skippedIds.length, 0);
  assert.equal(state.firstSpeaker, "a");
});

test("三个公开阶段都能中性换卡，换卡不计完成但照常切换首发", () => {
  for (const targetPhase of logic.PUBLIC_CARD_PHASES) {
    let state = start();
    state = reveal(state);
    if (targetPhase !== "first-speaking") state = logic.finishSpeaking(state);
    if (targetPhase === "settle") state = logic.finishSpeaking(state);
    const skippedId = state.plan[0];
    const skipped = logic.skipCard(state);
    assert.equal(skipped.phase, "card-back");
    assert.deepEqual(skipped.completedIds, []);
    assert.deepEqual(skipped.skippedIds, [skippedId]);
    assert.equal(skipped.cursor, 1);
    assert.equal(skipped.firstSpeaker, "b");
  }
  const back = start();
  assert.equal(logic.skipCard(back), back);
});

test("24 张全部换过仍未完成时安全以牌库耗尽结束", () => {
  let state = start();
  while (state.phase !== "complete") state = logic.skipCard(reveal(state));
  assert.equal(state.endReason, "deck-exhausted");
  assert.equal(state.cursor, 24);
  assert.equal(state.completedIds.length, 0);
  assert.equal(state.skippedIds.length, 24);
  assert.equal(logic.getCurrentCard(state, logic.CARDS), null);
});

test("合法状态的非法动作保持原引用，畸形状态经公开动作回到安全初始态", () => {
  const initial = logic.createInitialState();
  assert.equal(logic.revealCard(initial), initial);
  assert.equal(logic.finishSpeaking(initial), initial);
  assert.equal(logic.settleCard(initial), initial);
  assert.equal(logic.skipCard(initial), initial);
  assert.equal(logic.restartSession(initial), initial);

  for (const action of [
    logic.revealCard,
    logic.finishSpeaking,
    logic.settleCard,
    logic.skipCard,
    logic.restartSession,
  ]) {
    const recovered = action({ phase: "first-speaking", plan: ["fake"] });
    assert.equal(recovered.phase, "intro");
    assert.equal(logic.isGameState(recovered), true);
  }
  assert.equal(logic.isGameState({ ...initial, cursor: -1 }), false);
  assert.equal(logic.isGameState({ ...initial, answer: "不应进入状态" }), false);

  const started = start();
  assert.equal(logic.isGameState({ ...started, plan: ["not-a-card", ...started.plan.slice(1)] }), false);
  assert.equal(logic.isGameState({ ...started, players: { ...started.players, answer: "不应进入玩家状态" } }), false);

  const oneSkipped = logic.skipCard(reveal(started));
  assert.equal(logic.isGameState({
    ...oneSkipped,
    skippedIds: [oneSkipped.plan[1]],
  }), false);
});

test("重开只在终局生效并清除上一场计划与处理结果", () => {
  let state = start({
    aName: "甲",
    bName: "乙",
    firstSpeaker: "a",
    sessionSize: 6,
    chooseOpeningCard: () => null,
  });
  for (let count = 0; count < 6; count += 1) state = completeCurrent(state);
  const restarted = logic.restartSession(state);
  assert.equal(restarted.phase, "intro");
  assert.deepEqual(restarted.players, { a: "甲", b: "乙" });
  assert.deepEqual(restarted.plan, []);
  assert.deepEqual(restarted.completedIds, []);
  assert.deepEqual(restarted.skippedIds, []);
  assert.equal(restarted.endReason, null);
  assert.ok(restarted.revision > state.revision);
});

test("奇数次处理后完成，重开仍恢复配置首发席", () => {
  let state = start();
  state = logic.skipCard(reveal(state));
  for (let count = 0; count < 6; count += 1) state = completeCurrent(state);

  assert.equal(state.phase, "complete");
  assert.equal(state.cursor, 7);
  assert.equal(state.firstSpeaker, "b");

  const restarted = logic.restartSession(state);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.firstSpeaker, "a");
});
