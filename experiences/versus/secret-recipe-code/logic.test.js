import test from "node:test";
import assert from "node:assert/strict";

await import("./config.js");
await import("./logic.js");

const configApi = globalThis.SecretRecipeCodeConfig;
const logic = globalThis.SecretRecipeCodeLogic;

const B = "berry";
const C = "citrus";
const M = "mint";
const O = "cocoa";
const H = "honey";
const S = "salt";

function dispatch(state, type, fields = {}) {
  return logic.reduceRecipe(state, { type, ...fields });
}

function replay(actions, initial = logic.createInitialState()) {
  return actions.reduce((state, action) => {
    const next = logic.reduceRecipe(state, action);
    assert.equal(logic.assertState(next), next);
    return next;
  }, initial);
}

function add(prefix, values) {
  return values.map((ingredientId) => ({ type: prefix, ingredientId }));
}

function roundActions(secret, guesses, includeAdvance = true) {
  const actions = [
    ...add("ADD_SECRET", secret),
    { type: "SUBMIT_SECRET" },
    { type: "CONFIRM_HANDOFF" },
  ];
  for (const guess of guesses) actions.push(...add("ADD_GUESS", guess), { type: "SUBMIT_GUESS" });
  if (includeAdvance) actions.push({ type: "ADVANCE_ROUND" });
  return actions;
}

function goldenActions() {
  return [
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], [[B, M, B, S], [B, B, H, M], [B, B, M, H]]),
    ...roundActions([S, C, O, S], [[S, S, C, O], [S, C, O, S]]),
  ];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value));
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

test("公共常量、默认配置与所有导出递归冻结", () => {
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.SLOT_COUNT, 4);
  assert.equal(logic.MAX_GUESSES, 7);
  assert.equal(logic.ROUND_COUNT, 2);
  assert.equal(logic.FAILED_SCORE, 8);
  assert.equal(logic.MAX_PER_SECRET_INGREDIENT, 2);
  assert.equal(logic.MIN_UNIQUE_SECRET_INGREDIENTS, 3);
  assert.deepEqual(logic.INGREDIENT_IDS, [B, C, M, O, H, S]);
  assert.deepEqual(logic.INGREDIENT_COLORS, {
    berry: "#c9656b", citrus: "#dfa547", mint: "#67a483",
    cocoa: "#8b604f", honey: "#d2ae59", salt: "#88a6b5",
  });
  assertDeepFrozen(logic);
  assertDeepFrozen(configApi);
  assertDeepFrozen(configApi.DEFAULT_CONFIG);
});

test("初始状态精确、可 JSON 往返且递归冻结", () => {
  const state = logic.createInitialState();
  assert.deepEqual(state, {
    version: 1,
    phase: "intro",
    roundIndex: 0,
    setterIndex: 0,
    breakerIndex: 1,
    covered: false,
    draft: [],
    secret: null,
    guessDraft: [],
    guesses: [],
    roundResults: [],
    announcementSerial: 0,
    lastNotice: null,
  });
  assertDeepFrozen(state);
  assert.deepEqual(logic.assertState(clone(state)), clone(state));
});

test("scoreGuess 覆盖同位、全错位、零命中、交叉重复和多余重复", () => {
  const cases = [
    [[B, B, M, H], [B, M, B, S], { exact: 1, misplaced: 2 }],
    [[B, B, M, H], [B, B, H, M], { exact: 2, misplaced: 2 }],
    [[B, B, M, H], [B, B, M, H], { exact: 4, misplaced: 0 }],
    [[B, B, M, H], [B, B, B, B], { exact: 2, misplaced: 0 }],
    [[B, C, M, H], [H, M, C, B], { exact: 0, misplaced: 4 }],
    [[B, C, M, H], [S, S, S, S], { exact: 0, misplaced: 0 }],
  ];
  for (const [secret, guess, expected] of cases) {
    const secretBefore = secret.slice();
    const guessBefore = guess.slice();
    const result = logic.scoreGuess(secret, guess);
    assert.deepEqual(result, expected);
    assertDeepFrozen(result);
    assert.deepEqual(secret, secretBefore);
    assert.deepEqual(guess, guessBefore);
  }
});

test("scoreGuess 严格拒绝非法秘密和猜测", () => {
  assert.throws(() => logic.scoreGuess([B, B, B, C], [B, C, M, H]), TypeError);
  assert.throws(() => logic.scoreGuess([B, B, C, C], [B, C, M, H]), TypeError);
  assert.throws(() => logic.scoreGuess([B, C, M, H], [B, C, M]), TypeError);
  assert.throws(() => logic.scoreGuess([B, C, M, H], ["x", C, M, H]), TypeError);
  const sparse = [B, C, M];
  sparse.length = 4;
  assert.throws(() => logic.scoreGuess(sparse, [B, C, M, H]), TypeError);
  const accessor = [B, C, M, H];
  Object.defineProperty(accessor, "3", { get() { return H; }, enumerable: true });
  assert.throws(() => logic.scoreGuess([B, C, M, H], accessor), TypeError);
});

test("秘密草稿执行四格、最多两份、至少三种边界", () => {
  let state = dispatch(logic.createInitialState(), "START_MATCH");
  state = replay(add("ADD_SECRET", [B, B]), state);
  const limited = dispatch(state, "ADD_SECRET", { ingredientId: B });
  assert.equal(limited.lastNotice, "secret-duplicate-limit");
  assert.deepEqual(limited.draft, [B, B]);
  assert.equal(dispatch(limited, "ADD_SECRET", { ingredientId: B }), limited);

  state = replay(add("ADD_SECRET", [C, C]), limited);
  const notVaried = dispatch(state, "SUBMIT_SECRET");
  assert.equal(notVaried.phase, "setting");
  assert.equal(notVaried.lastNotice, "secret-not-varied");
  state = dispatch(state, "REMOVE_SECRET_SLOT", { index: 3 });
  state = dispatch(state, "ADD_SECRET", { ingredientId: M });
  state = dispatch(state, "SUBMIT_SECRET");
  assert.equal(state.phase, "handoff");
  assert.deepEqual(state.secret, [B, B, C, M]);
  assert.deepEqual(state.draft, []);
});

test("cover/resume 隐藏草稿且 handoff 与 guessing view 不含秘密", () => {
  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, configApi.composeMatchNote);
  let state = dispatch(logic.createInitialState(), "START_MATCH");
  state = replay(add("ADD_SECRET", [B, B, M, H]), state);
  const visible = logic.getRecipeView(state, config);
  assert.deepEqual(visible.draft, [B, B, M, H]);
  state = dispatch(state, "COVER_SECRET", { reason: "escape" });
  const covered = logic.getRecipeView(state, config);
  assert.deepEqual(covered.draft, []);
  assert.deepEqual(covered.revealedSecret, []);
  assert.equal(covered.privacy.covered, true);
  assert.equal(JSON.stringify(covered).includes('"berry","berry","mint","honey"'), false);
  state = dispatch(state, "RESUME_SECRET");
  assert.deepEqual(logic.getRecipeView(state, config).draft, [B, B, M, H]);
  state = dispatch(state, "SUBMIT_SECRET");
  const handoff = logic.getRecipeView(state, config);
  assert.deepEqual(handoff.draft, []);
  assert.deepEqual(handoff.history, []);
  assert.deepEqual(handoff.revealedSecret, []);
  assert.equal(JSON.stringify(handoff).includes('"berry","berry","mint","honey"'), false);
  state = dispatch(state, "CONFIRM_HANDOFF");
  const guessing = logic.getRecipeView(state, config);
  assert.deepEqual(guessing.revealedSecret, []);
  assert.equal(JSON.stringify(guessing).includes('"berry","berry","mint","honey"'), false);
});

test("错 phase 的结构合法 action 保持原引用且不增加 announcement", () => {
  const intro = logic.createInitialState();
  for (const action of [
    { type: "ADD_SECRET", ingredientId: B },
    { type: "SUBMIT_SECRET" },
    { type: "COVER_SECRET", reason: "manual" },
    { type: "CONFIRM_HANDOFF" },
    { type: "ADD_GUESS", ingredientId: B },
    { type: "SUBMIT_GUESS" },
    { type: "ADVANCE_ROUND" },
  ]) assert.equal(logic.reduceRecipe(intro, action), intro);
});

test("action 精确字段、索引、枚举、getter、symbol、数组和污染原型均拒绝", () => {
  const state = logic.createInitialState();
  const getter = {};
  Object.defineProperty(getter, "type", { get() { throw new Error("read"); }, enumerable: true });
  const polluted = Object.create({ ingredientId: B });
  polluted.type = "START_MATCH";
  for (const action of [
    null,
    [],
    { type: "NOPE" },
    { type: "START_MATCH", extra: true },
    { type: "ADD_SECRET" },
    { type: "ADD_SECRET", ingredientId: "nope" },
    { type: "REMOVE_SECRET_SLOT", index: -1 },
    { type: "REMOVE_SECRET_SLOT", index: 4 },
    { type: "COVER_SECRET", reason: "timer" },
    getter,
    polluted,
  ]) assert.throws(() => logic.reduceRecipe(state, action), TypeError);
  const symbolAction = { type: "START_MATCH" };
  symbolAction[Symbol("x")] = 1;
  assert.throws(() => logic.reduceRecipe(state, symbolAction), TypeError);
});

test("移除、清空和未满提交遵守引用与 notice 合同", () => {
  let state = dispatch(logic.createInitialState(), "START_MATCH");
  assert.equal(dispatch(state, "CLEAR_SECRET"), state);
  assert.equal(dispatch(state, "REMOVE_SECRET_SLOT", { index: 0 }), state);
  state = dispatch(state, "ADD_SECRET", { ingredientId: B });
  state = dispatch(state, "ADD_SECRET", { ingredientId: C });
  state = dispatch(state, "REMOVE_SECRET_SLOT", { index: 0 });
  assert.deepEqual(state.draft, [C]);
  state = dispatch(state, "CLEAR_SECRET");
  assert.deepEqual(state.draft, []);
  const incomplete = dispatch(state, "SUBMIT_SECRET");
  assert.equal(incomplete.lastNotice, "secret-incomplete");
  assert.equal(dispatch(incomplete, "SUBMIT_SECRET"), incomplete);
});

test("40-action 黄金回放得到 2–3 且玩家 0 获胜", () => {
  const actions = goldenActions();
  assert.equal(actions.length, 40);
  const state = replay(actions);
  assert.equal(state.phase, "match-result");
  assert.equal(state.roundResults[0].breakerIndex, 1);
  assert.equal(state.roundResults[0].attempts, 3);
  assert.equal(state.roundResults[1].breakerIndex, 0);
  assert.equal(state.roundResults[1].attempts, 2);
  const view = logic.getRecipeView(state, logic.sanitizeConfig(configApi.DEFAULT_CONFIG, configApi.composeMatchNote));
  assert.deepEqual(view.score.values, [2, 3]);
  assert.deepEqual(view.score.solved, [true, true]);
  assert.equal(view.score.winnerIndex, 0);
  assert.equal(view.score.tied, false);
  assert.equal(view.results.length, 2);
  assert.deepEqual(view.results[0].secret, [B, B, M, H]);
  assert.deepEqual(view.results[1].secret, [S, C, O, S]);
  assertDeepFrozen(view);
});

test("同一日志、深克隆日志和 JSON 状态往返保持确定性", () => {
  const actions = goldenActions();
  const first = replay(actions);
  const second = replay(clone(actions));
  assert.deepEqual(first, second);
  assert.deepEqual(logic.assertState(clone(first)), first);
});

test("round-result 才揭晓秘密，推进后第一轮只存在公开 result", () => {
  const actions = [
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], [[B, B, M, H]], false),
  ];
  let state = replay(actions);
  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG);
  let view = logic.getRecipeView(state, config);
  assert.equal(state.phase, "round-result");
  assert.deepEqual(view.revealedSecret, [B, B, M, H]);
  assert.deepEqual(view.history[0], { number: 1, values: [B, B, M, H], exact: 4, misplaced: 0 });
  state = dispatch(state, "ADVANCE_ROUND");
  view = logic.getRecipeView(state, config);
  assert.equal(state.phase, "setting");
  assert.equal(state.secret, null);
  assert.deepEqual(view.revealedSecret, []);
  assert.deepEqual(view.results, []);
});

test("七次失败记 8，双方失败和同次数成功均为平局", () => {
  const miss = [S, S, S, S];
  let state = replay([
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], Array.from({ length: 7 }, () => miss)),
    ...roundActions([S, C, O, S], Array.from({ length: 7 }, () => [B, B, B, B])),
  ]);
  let view = logic.getRecipeView(state, logic.sanitizeConfig(configApi.DEFAULT_CONFIG));
  assert.deepEqual(view.score.values, [8, 8]);
  assert.deepEqual(view.score.solved, [false, false]);
  assert.equal(view.score.tied, true);
  assert.equal(view.score.winnerIndex, null);

  state = replay([
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], [[S, S, S, S], [B, B, M, H]]),
    ...roundActions([S, C, O, S], [[B, B, B, B], [S, C, O, S]]),
  ]);
  view = logic.getRecipeView(state, logic.sanitizeConfig(configApi.DEFAULT_CONFIG));
  assert.deepEqual(view.score.values, [2, 2]);
  assert.equal(view.score.tied, true);
});

test("一方失败时成功者获胜，成绩完全由 round result 派生", () => {
  const state = replay([
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], Array.from({ length: 7 }, () => [S, S, S, S])),
    ...roundActions([S, C, O, S], [[S, C, O, S]]),
  ]);
  const view = logic.getRecipeView(state, logic.sanitizeConfig(configApi.DEFAULT_CONFIG));
  assert.deepEqual(view.score.values, [1, 8]);
  assert.equal(view.score.winnerIndex, 0);
});

test("第七次成功仍记 7，玩家 1 的较低分对称获胜", () => {
  const state = replay([
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], [[B, B, M, H]]),
    ...roundActions(
      [S, C, O, S],
      [...Array.from({ length: 6 }, () => [B, B, B, B]), [S, C, O, S]],
    ),
  ]);
  const view = logic.getRecipeView(state, logic.sanitizeConfig(configApi.DEFAULT_CONFIG));
  assert.deepEqual(view.score.values, [7, 1]);
  assert.deepEqual(view.score.solved, [true, true]);
  assert.equal(view.score.winnerIndex, 1);
  assert.equal(view.score.tied, false);
});

test("任意阶段重开深等于首次状态，intro 重开保持引用", () => {
  const initial = logic.createInitialState();
  assert.equal(dispatch(initial, "RESTART_MATCH"), initial);
  let state = dispatch(initial, "START_MATCH");
  assert.deepEqual(dispatch(state, "RESTART_MATCH"), initial);
  state = replay(roundActions([B, B, M, H], [[B, B, M, H]], false), state);
  assert.deepEqual(dispatch(state, "RESTART_MATCH"), initial);
  state = dispatch(state, "ADVANCE_ROUND");
  assert.deepEqual(dispatch(state, "RESTART_MATCH"), initial);
});

test("assertState 拒绝多余字段、错误 key 顺序、共享数组、非法角色与伪造反馈", () => {
  const valid = replay([
    { type: "START_MATCH" },
    ...add("ADD_SECRET", [B, B, M, H]),
    { type: "SUBMIT_SECRET" },
    { type: "CONFIRM_HANDOFF" },
    ...add("ADD_GUESS", [B, M, B, S]),
    { type: "SUBMIT_GUESS" },
  ]);
  assert.throws(() => logic.assertState({ ...clone(valid), extra: true }), TypeError);
  const reordered = { phase: valid.phase, ...clone(valid) };
  assert.throws(() => logic.assertState(reordered), TypeError);
  assert.throws(() => logic.assertState({ ...clone(valid), breakerIndex: 0 }), TypeError);
  const forged = clone(valid);
  forged.guesses[0].exact = 4;
  assert.throws(() => logic.assertState(forged), TypeError);
  const shared = clone(valid);
  shared.guessDraft = shared.draft;
  assert.throws(() => logic.assertState(shared), TypeError);
});

test("assertState 重算 round result 并拒绝提前、跳轮和非法成绩", () => {
  const result = replay([
    { type: "START_MATCH" },
    ...roundActions([B, B, M, H], [[B, B, M, H]], false),
  ]);
  const wrongAttempts = clone(result);
  wrongAttempts.roundResults[0].attempts = 2;
  assert.throws(() => logic.assertState(wrongAttempts), TypeError);
  const earlyResult = clone(result);
  earlyResult.phase = "guessing";
  assert.throws(() => logic.assertState(earlyResult), TypeError);
  const skipRound = clone(result);
  skipRound.roundIndex = 1;
  skipRound.setterIndex = 1;
  skipRound.breakerIndex = 0;
  assert.throws(() => logic.assertState(skipRound), TypeError);
});

test("配置逐字段 trim、长度回退且配料 ID 顺序严格", () => {
  const candidate = clone(configApi.DEFAULT_CONFIG);
  candidate.title = "  私人配方  ";
  candidate.playerNames = ["  阿晨 ", " ".repeat(2)];
  candidate.ingredientText.berry = { label: "  莓果 ", description: " ".repeat(2) };
  candidate.ingredientText.citrus.label = "🍊".repeat(13);
  const safe = logic.sanitizeConfig(candidate);
  assert.equal(safe.title, "私人配方");
  assert.deepEqual(safe.playerNames, ["阿晨", "TA"]);
  assert.deepEqual(safe.ingredientText.berry, { label: "莓果", description: "微酸，醒得快" });
  assert.equal(safe.ingredientText.citrus.label, "柑橘");
  assertDeepFrozen(safe);

  const wrongOrder = clone(configApi.DEFAULT_CONFIG);
  wrongOrder.ingredientText = {
    citrus: wrongOrder.ingredientText.citrus,
    berry: wrongOrder.ingredientText.berry,
    mint: wrongOrder.ingredientText.mint,
    cocoa: wrongOrder.ingredientText.cocoa,
    honey: wrongOrder.ingredientText.honey,
    salt: wrongOrder.ingredientText.salt,
  };
  assert.deepEqual(logic.sanitizeConfig(wrongOrder).ingredientText, configApi.DEFAULT_CONFIG.ingredientText);
});

test("配置 getter 与多余配料只回退对应字段", () => {
  const candidate = clone(configApi.DEFAULT_CONFIG);
  Object.defineProperty(candidate, "subtitle", { get() { throw new Error("no"); }, enumerable: true });
  candidate.title = "安全标题";
  candidate.ingredientText.extra = { label: "额外", description: "额外" };
  const safe = logic.sanitizeConfig(candidate);
  assert.equal(safe.title, "安全标题");
  assert.equal(safe.subtitle, configApi.DEFAULT_CONFIG.subtitle);
  assert.deepEqual(safe.ingredientText, configApi.DEFAULT_CONFIG.ingredientText);
});

test("结语策略只收到冻结摘要，合法返回采用，异常与越界回退", () => {
  let received;
  const custom = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, (summary) => {
    received = summary;
    return summary.tied ? "一样懂这杯。" : `${summary.playerNames[summary.winnerIndex]} 先尝到了。`;
  });
  const state = replay(goldenActions());
  const view = logic.getRecipeView(state, custom);
  assert.equal(view.text.matchNote, "你 先尝到了。");
  assertDeepFrozen(received);
  assert.deepEqual(Object.keys(received), ["playerNames", "scores", "solved", "winnerIndex", "tied", "defaultNote"]);
  assert.equal(JSON.stringify(received).includes(B), false);

  for (const strategy of [
    () => " ",
    () => "x".repeat(241),
    () => 42,
    () => { throw new Error("strategy"); },
    (summary) => { summary.scores[0] = 99; return "不可采用"; },
  ]) {
    const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, strategy);
    assert.equal(logic.getRecipeView(state, config).text.matchNote, configApi.DEFAULT_CONFIG.defaultMatchNote);
  }
});

test("view 全部断开引用，并按阶段给出严格 controls", () => {
  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG);
  let state = logic.createInitialState();
  let view = logic.getRecipeView(state, config);
  assert.equal(view.controls.canStart, true);
  assert.equal(view.controls.canRestart, false);
  state = dispatch(state, "START_MATCH");
  view = logic.getRecipeView(state, config);
  assert.equal(view.controls.canEditSecret, true);
  assert.equal(view.controls.canSubmitSecret, false);
  state = replay(add("ADD_SECRET", [B, B, M, H]), state);
  view = logic.getRecipeView(state, config);
  assert.equal(view.controls.canSubmitSecret, true);
  assert.notEqual(view.draft, state.draft);
  state = dispatch(state, "SUBMIT_SECRET");
  state = dispatch(state, "CONFIRM_HANDOFF");
  state = replay(add("ADD_GUESS", [B, B, M, H]), state);
  view = logic.getRecipeView(state, config);
  assert.equal(view.controls.canSubmitGuess, true);
  assert.notEqual(view.guessDraft, state.guessDraft);
});
