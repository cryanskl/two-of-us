import test from "node:test";
import assert from "node:assert/strict";

await import("./config.js");
await import("./logic.js");

const configApi = globalThis.MemoryBidConfig;
const logic = globalThis.MemoryBidLogic;
const [TICKET, CAMERA, SHELL, KEY, MUG, MAP] = logic.ITEM_IDS;

function dispatch(state, type, fields = {}) {
  return logic.reduceMemoryBid(state, { type, ...fields });
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

function start(mode = "manual", seed = 0x12345678) {
  return dispatch(logic.createInitialState(), "START_MATCH", { seed, playbackMode: mode });
}

function finishReveal(state) {
  if (state.playbackMode === "manual") {
    for (let index = 0; index < logic.SEQUENCE_LENGTH; index += 1) {
      state = dispatch(state, "ADVANCE_MANUAL_REVEAL");
    }
    return state;
  }
  while (state.phase === "reveal") {
    state = state.revealVisible
      ? dispatch(state, "HIDE_REVEAL_ITEM", { generation: state.playbackGeneration })
      : dispatch(state, "SHOW_REVEAL_ITEM", { generation: state.playbackGeneration });
  }
  return state;
}

function completeRound(state, outcome = "success", bidAmount = 2) {
  state = finishReveal(state);
  const openerIndex = state.roundIndex % 2;
  state = dispatch(state, "PLACE_BID", { playerIndex: openerIndex, amount: bidAmount });
  if (bidAmount < logic.MAX_BID) state = dispatch(state, "PASS_BID", { playerIndex: 1 - openerIndex });
  if (outcome === "forfeit") return dispatch(state, "FORFEIT_PROOF");
  const answer = state.sequences[state.roundIndex].slice(0, bidAmount);
  if (outcome === "failure") {
    answer[0] = logic.ITEM_IDS.find((id) => id !== answer[0]);
  }
  for (const itemId of answer) state = dispatch(state, "ADD_PROOF", { itemId });
  return dispatch(state, "SUBMIT_PROOF");
}

function playMatch(outcomes, seed = 0x12345678) {
  let state = start("manual", seed);
  for (let round = 0; round < logic.ROUND_COUNT; round += 1) {
    state = completeRound(state, outcomes[round]);
    state = dispatch(state, "ADVANCE_ROUND");
  }
  return state;
}

test("公共 API、常量和默认配置精确且递归冻结", () => {
  assert.deepEqual(Object.keys(logic), [
    "VERSION", "ROUND_COUNT", "SEQUENCE_LENGTH", "MIN_BID", "MAX_BID", "ITEM_IDS", "PHASES",
    "PLAYBACK_MODES", "ACTION_TYPES", "generateSequences", "createInitialState", "sanitizeConfig",
    "reduceMemoryBid", "assertState", "getMemoryBidView", "summarizeMatch", "deepFreeze",
  ]);
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.ROUND_COUNT, 4);
  assert.equal(logic.SEQUENCE_LENGTH, 8);
  assert.equal(logic.MIN_BID, 2);
  assert.equal(logic.MAX_BID, 8);
  assert.deepEqual(logic.ITEM_IDS, [TICKET, CAMERA, SHELL, KEY, MUG, MAP]);
  assert.deepEqual(logic.PHASES, ["intro", "reveal", "bidding", "proof", "round-result", "match-result"]);
  assert.deepEqual(logic.PLAYBACK_MODES, ["auto", "manual"]);
  assertDeepFrozen(logic);
  assertDeepFrozen(configApi);
  assertDeepFrozen(configApi.DEFAULT_CONFIG);
});

test("初始状态精确、递归冻结且可 JSON 往返", () => {
  const expected = {
    version: 1,
    phase: "intro",
    seed: null,
    playbackMode: null,
    roundIndex: 0,
    revealIndex: 0,
    revealVisible: false,
    revealPaused: false,
    pauseReason: null,
    playbackGeneration: 0,
    sequences: [],
    bids: [],
    currentBid: null,
    highBidderIndex: null,
    activeBidderIndex: null,
    proofDraft: [],
    scores: [0, 0],
    roundResults: [],
    announcementSerial: 0,
    lastNotice: null,
  };
  const state = logic.createInitialState();
  assert.deepEqual(state, expected);
  assert.equal(logic.assertState(state), state);
  assert.deepEqual(logic.assertState(clone(state)), expected);
  const forged = clone(state);
  forged.announcementSerial = 1;
  forged.lastNotice = "match-started";
  assert.throws(() => logic.assertState(forged), TypeError);
  assertDeepFrozen(state);
});

test("固定 seed 生成冻结的已知四轮向量", () => {
  assert.deepEqual(logic.generateSequences(0x12345678), [
    [MAP, KEY, TICKET, CAMERA, SHELL, MAP, CAMERA, MUG],
    [MUG, KEY, TICKET, MAP, KEY, CAMERA, SHELL, TICKET],
    [KEY, MAP, CAMERA, SHELL, MUG, CAMERA, TICKET, MUG],
    [TICKET, CAMERA, SHELL, CAMERA, SHELL, MUG, MAP, KEY],
  ]);
  assertDeepFrozen(logic.generateSequences(0x12345678));
});

test("大量 seed 均满足六种齐全、两种各重复一次且无相邻重复", () => {
  for (let seed = 1; seed <= 512; seed += 1) {
    const sequences = logic.generateSequences(seed);
    assert.equal(sequences.length, 4);
    for (const sequence of sequences) {
      assert.equal(sequence.length, 8);
      const counts = new Map(logic.ITEM_IDS.map((id) => [id, 0]));
      sequence.forEach((id, index) => {
        assert.ok(logic.ITEM_IDS.includes(id));
        counts.set(id, counts.get(id) + 1);
        if (index) assert.notEqual(id, sequence[index - 1]);
      });
      assert.deepEqual([...counts.values()].sort(), [1, 1, 1, 1, 2, 2]);
    }
  }
});

test("generateSequences 严拒绝非法 seed 与额外参数", () => {
  for (const seed of [0, -1, 1.5, "1", NaN, Infinity, 0x100000000, null, {}, []]) {
    assert.throws(() => logic.generateSequences(seed), TypeError);
  }
  assert.throws(() => logic.generateSequences(1, 2), TypeError);
});

test("手动展示逐件推进，最后一件后进入竞价且玩家 0 先手", () => {
  let state = start("manual");
  assert.equal(state.revealVisible, true);
  for (let index = 0; index < 7; index += 1) {
    const before = state.playbackGeneration;
    state = dispatch(state, "ADVANCE_MANUAL_REVEAL");
    assert.equal(state.revealIndex, index + 1);
    assert.equal(state.playbackGeneration, before + 1);
    assert.equal(state.revealVisible, true);
  }
  state = dispatch(state, "ADVANCE_MANUAL_REVEAL");
  assert.equal(state.phase, "bidding");
  assert.equal(state.activeBidderIndex, 0);
  assert.equal(state.revealVisible, false);
});

test("自动展示只接受当前 generation，依次 show/hide 后进入竞价", () => {
  let state = start("auto");
  assert.equal(state.revealVisible, false);
  const old = state.playbackGeneration - 1;
  assert.equal(dispatch(state, "SHOW_REVEAL_ITEM", { generation: old }), state);
  for (let index = 0; index < 8; index += 1) {
    const showGeneration = state.playbackGeneration;
    state = dispatch(state, "SHOW_REVEAL_ITEM", { generation: showGeneration });
    assert.equal(state.revealVisible, true);
    assert.equal(dispatch(state, "HIDE_REVEAL_ITEM", { generation: showGeneration }), state);
    state = dispatch(state, "HIDE_REVEAL_ITEM", { generation: state.playbackGeneration });
  }
  assert.equal(state.phase, "bidding");
});

test("暂停立即盖住物件，manual/auto 均从同一件恢复", () => {
  let manual = start("manual");
  manual = dispatch(manual, "ADVANCE_MANUAL_REVEAL");
  const index = manual.revealIndex;
  manual = dispatch(manual, "PAUSE_REVEAL", { reason: "hidden" });
  assert.equal(manual.revealVisible, false);
  assert.equal(manual.pauseReason, "hidden");
  assert.equal(dispatch(manual, "PAUSE_REVEAL", { reason: "blur" }), manual);
  manual = dispatch(manual, "RESUME_REVEAL");
  assert.equal(manual.revealIndex, index);
  assert.equal(manual.revealVisible, true);

  let auto = start("auto");
  auto = dispatch(auto, "SHOW_REVEAL_ITEM", { generation: auto.playbackGeneration });
  auto = dispatch(auto, "PAUSE_REVEAL", { reason: "blur" });
  auto = dispatch(auto, "RESUME_REVEAL");
  assert.equal(auto.revealIndex, 0);
  assert.equal(auto.revealVisible, false);
});

test("竞价首次 2–8、严格升价、交替行动和 PASS 前置", () => {
  let state = finishReveal(start());
  assert.throws(() => dispatch(state, "PASS_BID", { playerIndex: 0 }), TypeError);
  assert.throws(() => dispatch(state, "PLACE_BID", { playerIndex: 1, amount: 2 }), TypeError);
  state = dispatch(state, "PLACE_BID", { playerIndex: 0, amount: 3 });
  assert.deepEqual(state.bids, [{ playerIndex: 0, amount: 3 }]);
  assert.equal(state.activeBidderIndex, 1);
  assert.throws(() => dispatch(state, "PLACE_BID", { playerIndex: 0, amount: 4 }), TypeError);
  assert.throws(() => dispatch(state, "PLACE_BID", { playerIndex: 1, amount: 3 }), TypeError);
  state = dispatch(state, "PLACE_BID", { playerIndex: 1, amount: 6 });
  assert.equal(state.highBidderIndex, 1);
  state = dispatch(state, "PASS_BID", { playerIndex: 0 });
  assert.equal(state.phase, "proof");
  assert.equal(state.highBidderIndex, 1);
});

test("报到 8 在同一动作自动锁定证明", () => {
  let state = finishReveal(start());
  state = dispatch(state, "PLACE_BID", { playerIndex: 0, amount: 8 });
  assert.equal(state.phase, "proof");
  assert.equal(state.currentBid, 8);
  assert.equal(state.activeBidderIndex, null);
  assert.equal(state.lastNotice, "proof-started");
});

test("证明支持重复物件、指定格删除、清空和未满提示", () => {
  let state = finishReveal(start());
  state = dispatch(state, "PLACE_BID", { playerIndex: 0, amount: 3 });
  state = dispatch(state, "PASS_BID", { playerIndex: 1 });
  state = dispatch(state, "ADD_PROOF", { itemId: TICKET });
  state = dispatch(state, "ADD_PROOF", { itemId: TICKET });
  state = dispatch(state, "ADD_PROOF", { itemId: CAMERA });
  state = dispatch(state, "REMOVE_PROOF_SLOT", { index: 1 });
  assert.deepEqual(state.proofDraft, [TICKET, CAMERA]);
  assert.equal(dispatch(state, "REMOVE_PROOF_SLOT", { index: 7 }), state);
  state = dispatch(state, "SUBMIT_PROOF");
  assert.equal(state.phase, "proof");
  assert.equal(state.lastNotice, "proof-incomplete");
  assert.equal(dispatch(state, "SUBMIT_PROOF"), state);
  state = dispatch(state, "CLEAR_PROOF");
  assert.deepEqual(state.proofDraft, []);
  assert.equal(dispatch(state, "CLEAR_PROOF"), state);
});

test("正确证明给证明者一分，错误记录首错并给对手一分", () => {
  const success = completeRound(start(), "success", 4);
  assert.equal(success.phase, "round-result");
  assert.equal(success.roundResults[0].success, true);
  assert.equal(success.roundResults[0].mismatchIndex, null);
  assert.deepEqual(success.scores, [1, 0]);

  const failure = completeRound(start(), "failure", 4);
  assert.equal(failure.roundResults[0].success, false);
  assert.equal(failure.roundResults[0].mismatchIndex, 0);
  assert.deepEqual(failure.scores, [0, 1]);
});

test("主动认输保存部分草稿且不给第二次证明", () => {
  let state = finishReveal(start());
  state = dispatch(state, "PLACE_BID", { playerIndex: 0, amount: 4 });
  state = dispatch(state, "PASS_BID", { playerIndex: 1 });
  state = dispatch(state, "ADD_PROOF", { itemId: state.sequences[0][0] });
  state = dispatch(state, "FORFEIT_PROOF");
  const result = state.roundResults[0];
  assert.deepEqual(result.proof, [result.sequence[0]]);
  assert.equal(result.forfeited, true);
  assert.equal(result.success, false);
  assert.equal(result.mismatchIndex, null);
  assert.deepEqual(state.scores, [0, 1]);
  assert.equal(dispatch(state, "SUBMIT_PROOF"), state);
});

test("固定四轮双方各先手两次并支持 4–0、3–1、2–2 与双方获胜", () => {
  const cases = [
    [["success", "failure", "success", "failure"], [4, 0], 0],
    [["success", "failure", "success", "success"], [3, 1], 0],
    [["success", "success", "success", "success"], [2, 2], null],
    [["failure", "success", "failure", "success"], [0, 4], 1],
    [["failure", "success", "success", "success"], [1, 3], 1],
  ];
  for (const [outcomes, scores, winnerIndex] of cases) {
    const state = playMatch(outcomes);
    assert.equal(state.phase, "match-result");
    assert.deepEqual(state.roundResults.map((result) => result.openerIndex), [0, 1, 0, 1]);
    assert.deepEqual(state.scores, scores);
    const summary = logic.summarizeMatch(state, configApi.DEFAULT_CONFIG);
    assert.equal(summary.winnerIndex, winnerIndex);
    assert.equal(summary.tie, winnerIndex === null);
  }
});

test("下一轮保持模式、轮换先手并重置当前轮输入", () => {
  let state = completeRound(start("manual"), "success");
  state = dispatch(state, "ADVANCE_ROUND");
  assert.equal(state.phase, "reveal");
  assert.equal(state.roundIndex, 1);
  assert.equal(state.playbackMode, "manual");
  assert.equal(state.revealVisible, true);
  assert.deepEqual(state.bids, []);
  state = finishReveal(state);
  assert.equal(state.activeBidderIndex, 1);
});

test("match-result 只允许重开，重开与首次加载深相等", () => {
  const terminal = playMatch(["success", "success", "success", "success"]);
  for (const action of [
    { type: "ADVANCE_ROUND" },
    { type: "CLEAR_PROOF" },
    { type: "PAUSE_REVEAL", reason: "manual" },
    { type: "START_MATCH", seed: 7, playbackMode: "auto" },
  ]) assert.equal(logic.reduceMemoryBid(terminal, action), terminal);
  assert.deepEqual(dispatch(terminal, "RESTART_MATCH"), logic.createInitialState());
  const intro = logic.createInitialState();
  assert.equal(dispatch(intro, "RESTART_MATCH"), intro);
});

test("错 phase 的结构合法动作保持原引用", () => {
  const intro = logic.createInitialState();
  for (const action of [
    { type: "SHOW_REVEAL_ITEM", generation: 0 },
    { type: "ADVANCE_MANUAL_REVEAL" },
    { type: "PLACE_BID", playerIndex: 0, amount: 2 },
    { type: "ADD_PROOF", itemId: TICKET },
    { type: "SUBMIT_PROOF" },
    { type: "ADVANCE_ROUND" },
  ]) assert.equal(logic.reduceMemoryBid(intro, action), intro);
});

test("action 精确字段、getter、symbol、数组、原型和非法枚举全部拒绝", () => {
  const state = logic.createInitialState();
  const getter = {};
  Object.defineProperty(getter, "type", { get() { throw new Error("read"); }, enumerable: true });
  const inherited = Object.create({ seed: 1 });
  inherited.type = "START_MATCH";
  inherited.playbackMode = "auto";
  const symbol = { type: "RESTART_MATCH" };
  symbol[Symbol("x")] = true;
  for (const action of [
    null, [], getter, inherited, symbol, { type: "NOPE" }, { type: "RESTART_MATCH", extra: true },
    { type: "START_MATCH", seed: 0, playbackMode: "auto" },
    { type: "START_MATCH", seed: 1, playbackMode: "fast" },
    { type: "PAUSE_REVEAL", reason: "escape" },
    { type: "PLACE_BID", playerIndex: 2, amount: 2 },
    { type: "PLACE_BID", playerIndex: 0, amount: 9 },
    { type: "ADD_PROOF", itemId: "nope" },
    { type: "REMOVE_PROOF_SLOT", index: 8 },
  ]) assert.throws(() => logic.reduceMemoryBid(state, action), TypeError);
});

test("public view 固定 exact keys 且 reveal 只公开当前可见单件", () => {
  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, configApi.composeMatchNote);
  let state = start("manual");
  let view = logic.getMemoryBidView(state, config);
  assert.deepEqual(Object.keys(view), [
    "phase", "title", "subtitle", "intro", "playerNames", "items", "round", "scores",
    "announcementSerial", "notice", "reveal", "bidding", "proof", "roundResult", "match",
    "controls", "text",
  ]);
  assert.deepEqual(Object.keys(view.reveal), [
    "mode", "index", "number", "total", "paused", "pauseReason", "generation", "currentItem",
  ]);
  assert.equal(view.reveal.currentItem.id, state.sequences[0][0]);
  assert.equal(Object.hasOwn(view, "seed"), false);
  assert.equal(Object.hasOwn(view, "sequences"), false);
  assertDeepFrozen(view);
  state = dispatch(state, "PAUSE_REVEAL", { reason: "manual" });
  view = logic.getMemoryBidView(state, config);
  assert.equal(view.reveal.currentItem, null);
});

test("bidding/proof view 不含答案，round-result 只公开本轮", () => {
  const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, configApi.composeMatchNote);
  let state = finishReveal(start());
  let view = logic.getMemoryBidView(state, config);
  assert.equal(view.reveal, null);
  assert.equal(view.proof, null);
  assert.equal(Object.hasOwn(view.bidding, "sequence"), false);
  state = dispatch(state, "PLACE_BID", { playerIndex: 0, amount: 2 });
  state = dispatch(state, "PASS_BID", { playerIndex: 1 });
  view = logic.getMemoryBidView(state, config);
  assert.equal(Object.hasOwn(view.proof, "sequence"), false);
  assert.equal(Object.hasOwn(view.proof, "answer"), false);
  const answer = state.sequences[0].slice(0, 2);
  for (const itemId of answer) state = dispatch(state, "ADD_PROOF", { itemId });
  state = dispatch(state, "SUBMIT_PROOF");
  view = logic.getMemoryBidView(state, config);
  assert.deepEqual(view.roundResult.sequence.map((item) => item.id), state.sequences[0]);
  assert.equal(view.match, null);
  assert.equal(JSON.stringify(view).includes(JSON.stringify(state.sequences[1])), false);
});

test("终局摘要和策略输入不含任何答案", () => {
  const state = playMatch(["success", "failure", "success", "failure"]);
  const summary = logic.summarizeMatch(state, configApi.DEFAULT_CONFIG);
  assert.deepEqual(Object.keys(summary), ["scores", "winnerIndex", "tie", "playerNames", "results", "defaultNote"]);
  assert.equal(Object.hasOwn(summary.results[0], "sequence"), false);
  assert.equal(Object.hasOwn(summary.results[0], "proof"), false);
  assert.equal(Object.hasOwn(summary, "seed"), false);
  assertDeepFrozen(summary);
  assert.throws(() => logic.summarizeMatch(start(), configApi.DEFAULT_CONFIG), TypeError);
});

test("相同 action 日志、深克隆日志和 JSON 中间态得到相同终态", () => {
  const actions = [{ type: "START_MATCH", seed: 987654321, playbackMode: "manual" }];
  for (let index = 0; index < 8; index += 1) actions.push({ type: "ADVANCE_MANUAL_REVEAL" });
  actions.push(
    { type: "PLACE_BID", playerIndex: 0, amount: 2 },
    { type: "PASS_BID", playerIndex: 1 },
  );
  const generated = logic.generateSequences(987654321)[0];
  actions.push(...generated.slice(0, 2).map((itemId) => ({ type: "ADD_PROOF", itemId })), { type: "SUBMIT_PROOF" });
  const replay = (log, initial = logic.createInitialState()) => log.reduce(
    (state, action) => logic.reduceMemoryBid(state, action),
    initial,
  );
  const first = replay(actions);
  assert.deepEqual(first, replay(clone(actions)));
  const split = replay(actions.slice(0, 5));
  assert.deepEqual(first, replay(actions.slice(5), logic.assertState(clone(split))));
});

test("assertState 拒绝答案、报价、得分、generation、多余字段与引用复用伪造", () => {
  const result = completeRound(start(), "success");
  const mutations = [
    (state) => { state.sequences[0][0] = state.sequences[0][1]; },
    (state) => { state.bids[0].amount = 7; },
    (state) => { state.scores = [4, 0]; },
    (state) => { state.playbackGeneration = state.announcementSerial + 1; },
    (state) => { state.extra = true; },
    (state) => { state.roundResults[0].sequence = state.sequences[0]; },
    (state) => { state.roundResults[0].pointWinnerIndex = 1; },
  ];
  for (const mutate of mutations) {
    const state = clone(result);
    mutate(state);
    assert.throws(() => logic.assertState(state), TypeError);
  }
  const wrongProto = Object.assign(Object.create(null), clone(result));
  assert.throws(() => logic.assertState(wrongProto), TypeError);
});

test("sanitizeConfig 逐字段回退、Unicode 限长、getter 安全且 HTML 保持纯文本", () => {
  const names = ["甲", "乙"];
  Object.defineProperty(names, "0", { get() { throw new Error("read"); }, enumerable: true });
  const config = logic.sanitizeConfig({
    title: "  <b>我们的局</b>  ",
    subtitle: "",
    intro: "🧳".repeat(401),
    playerNames: names,
    itemText: { ticket: { label: "票票" } },
    defaultMatchNote: "  记住啦  ",
  });
  assert.equal(config.title, "<b>我们的局</b>");
  assert.equal(config.subtitle, configApi.DEFAULT_CONFIG.subtitle);
  assert.equal(config.intro, configApi.DEFAULT_CONFIG.intro);
  assert.deepEqual(config.playerNames, ["你", "TA"]);
  assert.equal(config.itemText.ticket.label, "票票");
  assert.equal(config.itemText.ticket.description, configApi.DEFAULT_CONFIG.itemText.ticket.description);
  assert.equal(config.defaultMatchNote, "记住啦");
  assertDeepFrozen(config);
});

test("结语策略接受冻结无答案摘要，异常、空白和超长均回退", () => {
  const state = playMatch(["success", "success", "success", "success"]);
  let received;
  const custom = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, (summary) => {
    received = summary;
    return summary.tie ? "今晚一样会记。" : "分出胜负。";
  });
  assert.equal(logic.getMemoryBidView(state, custom).match.note, "今晚一样会记。");
  assertDeepFrozen(received);
  assert.equal(Object.hasOwn(received.results[0], "sequence"), false);
  for (const strategy of [() => { throw new Error("no"); }, () => "   ", () => "长".repeat(241), () => 7]) {
    const config = logic.sanitizeConfig(configApi.DEFAULT_CONFIG, strategy);
    assert.equal(logic.getMemoryBidView(state, config).match.note, configApi.DEFAULT_CONFIG.defaultMatchNote);
  }
});

test("状态、view、摘要与配置均断开调用方可变引用", () => {
  const candidate = { playerNames: ["甲", "乙"], itemText: { ticket: { label: "一张票" } } };
  const config = logic.sanitizeConfig(candidate);
  candidate.playerNames[0] = "改名";
  candidate.itemText.ticket.label = "改票";
  assert.deepEqual(config.playerNames, ["甲", "乙"]);
  assert.equal(config.itemText.ticket.label, "一张票");

  const state = start();
  const view = logic.getMemoryBidView(state, config);
  assert.notEqual(view.scores, state.scores);
  assert.notEqual(view.playerNames, config.playerNames);
  assertDeepFrozen(state);
  assertDeepFrozen(view);
});
