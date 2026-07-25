"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

const config = require("./config.js");
const logic = require("./logic.js");

const {
  ACTIONS,
  createCanonicalKey,
  createInitialState,
  createTile,
  getIncomingEdgeIndexes,
  getLegalPlacements,
  hasAnyLegalSlide,
  isState,
  isValidBoard,
  isValidTile,
  mergeLine,
  reduce,
  slideBoard,
} = logic;

const emptyBoard = () => new Array(config.BOARD_SIZE).fill(null);
const tile = (theme, tier = 0) => ({ theme, tier });

function createLevel(overrides = {}) {
  return {
    id: "test-page",
    title: "测试页",
    description: "只用于冻结规则合同",
    initialBoard: [
      tile("place"), tile("place"), null, null,
      tile("taste"), null, null, null,
      null, null, null, null,
    ],
    initialCandidates: ["sound", "care"],
    supply: ["place", "taste", "sound", "care"],
    targetDistinctChapters: 3,
    initialOrganizer: "left",
    hintPath: [],
    ...overrides,
  };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)
  ) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  if (typeof value === "function") return;
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function action(type, fields = {}) {
  return { type, ...fields };
}

test("公开 API、配置边界和动作枚举精确冻结", () => {
  assert.deepEqual(Object.keys(logic), [
    "ACTIONS",
    "createTile",
    "isValidTile",
    "isValidBoard",
    "mergeLine",
    "slideBoard",
    "getIncomingEdgeIndexes",
    "getLegalPlacements",
    "canSlide",
    "hasAnyLegalSlide",
    "createInitialState",
    "isState",
    "reduce",
    "createCanonicalKey",
    "getPublicView",
  ]);
  assert.deepEqual(ACTIONS, {
    SLIDE: "SLIDE",
    CONTINUE_SHARE: "CONTINUE_SHARE",
    CHOOSE_CANDIDATE: "CHOOSE_CANDIDATE",
    PLACE: "PLACE",
    RESTART: "RESTART",
  });
  assertDeepFrozen(logic);
});

test("经典脚本与 CommonJS 暴露同构 API", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(
    readFileSync(require.resolve("./config.js"), "utf8"),
    sandbox,
    { filename: "config.js" },
  );
  vm.runInNewContext(
    readFileSync(require.resolve("./logic.js"), "utf8"),
    sandbox,
    { filename: "logic.js" },
  );
  assert.deepEqual(
    Object.keys(sandbox.window.MemoryMergeBoardLogic),
    Object.keys(logic),
  );
  assert.equal(Object.isFrozen(sandbox.window.MemoryMergeBoardLogic), true);
});

test("线索只接受四主题和四个安全整数阶段", () => {
  for (const theme of config.THEMES) {
    for (let tier = 0; tier < config.TIERS.length; tier += 1) {
      const value = createTile(theme, tier);
      assert.deepEqual(value, { theme, tier });
      assert.equal(isValidTile(value), true);
      assertDeepFrozen(value);
    }
  }
  for (const value of [
    null,
    {},
    { theme: "place", tier: -1 },
    { theme: "place", tier: 4 },
    { theme: "unknown", tier: 0 },
    { theme: "place", tier: 0.5 },
    { theme: "place", tier: 0, extra: true },
  ]) {
    assert.equal(isValidTile(value), false);
  }
  assert.equal(createTile("unknown", 0), null);
});

test("棋盘精确要求 12 格且不能保留章节", () => {
  const board = emptyBoard();
  board[0] = tile("place", 2);
  assert.equal(isValidBoard(board), true);
  assert.equal(isValidBoard(board.slice(0, 11)), false);
  board[1] = tile("taste", 3);
  assert.equal(isValidBoard(board), false);
  assert.equal(isValidBoard(new Array(12)), false);
});

test("单线合并覆盖两项、三项、四项与禁止连锁", () => {
  assert.deepEqual(mergeLine([tile("place"), tile("place")]), {
    tiles: [tile("place", 1)],
    merges: [{ theme: "place", fromTier: 0, toTier: 1 }],
    chapters: [],
    changed: true,
  });
  assert.deepEqual(
    mergeLine([tile("place"), tile("place"), tile("place")]).tiles,
    [tile("place", 1), tile("place")],
  );
  assert.deepEqual(
    mergeLine([
      tile("place"), tile("place"), tile("place"), tile("place"),
    ]).tiles,
    [tile("place", 1), tile("place", 1)],
  );
  assert.deepEqual(
    mergeLine([tile("place"), tile("place"), tile("place", 1)]).tiles,
    [tile("place", 1), tile("place", 1)],
  );
});

test("不同主题、不同阶段和隔开的同主题都不合并", () => {
  for (const line of [
    [tile("place"), tile("taste")],
    [tile("place"), tile("place", 1)],
    [tile("place"), tile("taste"), tile("place")],
  ]) {
    const result = mergeLine(line);
    assert.deepEqual(result.tiles, line);
    assert.equal(result.changed, false);
    assert.deepEqual(result.merges, []);
    assert.deepEqual(result.chapters, []);
  }
});

test("两个故事形成章节后离开输出线", () => {
  const result = mergeLine([
    tile("sound", 2),
    tile("sound", 2),
    tile("care"),
  ]);
  assert.deepEqual(result.tiles, [tile("care")]);
  assert.deepEqual(result.chapters, ["sound"]);
  assert.deepEqual(result.merges, [
    { theme: "sound", fromTier: 2, toTier: 3 },
  ]);
  assertDeepFrozen(result);
});

test("整盘四方向压缩使用 3×4 行主序且不修改输入", () => {
  const source = emptyBoard();
  source[1] = tile("place");
  source[3] = tile("place");
  const original = structuredClone(source);

  assert.deepEqual(slideBoard(source, "left").board.slice(0, 4), [
    tile("place", 1), null, null, null,
  ]);
  assert.deepEqual(slideBoard(source, "right").board.slice(0, 4), [
    null, null, null, tile("place", 1),
  ]);

  const vertical = emptyBoard();
  vertical[0] = tile("taste");
  vertical[8] = tile("taste");
  assert.deepEqual(
    [slideBoard(vertical, "up").board[0], slideBoard(vertical, "up").board[8]],
    [tile("taste", 1), null],
  );
  assert.deepEqual(
    [slideBoard(vertical, "down").board[0], slideBoard(vertical, "down").board[8]],
    [null, tile("taste", 1)],
  );
  assert.deepEqual(source, original);
});

test("一次整盘可形成多个章节且事件顺序稳定", () => {
  const board = [
    tile("place", 2), tile("place", 2), null, null,
    tile("taste", 2), tile("taste", 2), null, null,
    null, null, null, null,
  ];
  const result = slideBoard(board, "left");
  assert.equal(result.changed, true);
  assert.deepEqual(result.board, emptyBoard());
  assert.deepEqual(result.chapters, ["place", "taste"]);
  assert.equal(result.merges.length, 2);
});

test("无效方向返回冻结结果且棋盘内容不变", () => {
  const board = emptyBoard();
  board[0] = tile("place");
  const result = slideBoard(board, "left");
  assert.equal(result.changed, false);
  assert.deepEqual(result.board, board);
  assertDeepFrozen(result);
  assert.equal(slideBoard(board, "diagonal"), null);
});

test("来向边缘和合法落点精确对应四方向", () => {
  assert.deepEqual(getIncomingEdgeIndexes("left"), [3, 7, 11]);
  assert.deepEqual(getIncomingEdgeIndexes("right"), [0, 4, 8]);
  assert.deepEqual(getIncomingEdgeIndexes("up"), [8, 9, 10, 11]);
  assert.deepEqual(getIncomingEdgeIndexes("down"), [0, 1, 2, 3]);

  const board = emptyBoard();
  board[3] = tile("care");
  assert.deepEqual(getLegalPlacements(board, "left"), [7, 11]);
  assert.deepEqual(getLegalPlacements(board, "unknown"), []);
});

test("初态精确、深冻、保留两张候选且不含私人内容", () => {
  const level = createLevel();
  const state = createInitialState(level);
  assert.equal(state.screen, "play");
  assert.equal(state.levelId, level.id);
  assert.equal(state.phase, "slide");
  assert.equal(state.organizer, "left");
  assert.equal(state.board.length, 12);
  assert.deepEqual(state.candidates, ["sound", "care"]);
  assert.equal(state.supplyIndex, 0);
  assert.equal(state.pendingTile, null);
  assert.equal(state.incomingDirection, null);
  assert.deepEqual(state.shareQueue, []);
  assert.deepEqual(state.archivedThemes, []);
  assert.equal(state.turn, 0);
  assert.equal(state.lossReason, null);
  assert.equal(isState(state, level), true);
  assertDeepFrozen(state);
  assert.equal(JSON.stringify(state).includes("测试页"), false);
});

test("无效滑动保持同一引用且不推进角色、候选或回合", () => {
  const level = createLevel({
    initialBoard: [
      tile("place"), null, null, null,
      null, null, null, null,
      null, null, null, null,
    ],
  });
  const state = createInitialState(level);
  const next = reduce(state, action(ACTIONS.SLIDE, { direction: "left" }), level);
  assert.equal(next, state);
});

test("有效滑动进入 choose，选择候选后补充供给并进入 place", () => {
  const level = createLevel();
  const start = createInitialState(level);
  const slid = reduce(start, action(ACTIONS.SLIDE, { direction: "left" }), level);
  assert.equal(slid.phase, "choose");
  assert.equal(slid.incomingDirection, "left");
  assert.equal(slid.organizer, "left");
  assert.equal(slid.turn, 0);

  const chosen = reduce(
    slid,
    action(ACTIONS.CHOOSE_CANDIDATE, { candidateIndex: 1 }),
    level,
  );
  assert.equal(chosen.phase, "place");
  assert.deepEqual(chosen.pendingTile, tile("care"));
  assert.deepEqual(chosen.candidates, ["sound", "place"]);
  assert.equal(chosen.supplyIndex, 1);
});

test("只有来向空位可补页，成功后交换角色并增加完整回合", () => {
  const level = createLevel();
  let state = createInitialState(level);
  state = reduce(state, action(ACTIONS.SLIDE, { direction: "left" }), level);
  state = reduce(
    state,
    action(ACTIONS.CHOOSE_CANDIDATE, { candidateIndex: 0 }),
    level,
  );
  const illegal = reduce(state, action(ACTIONS.PLACE, { boardIndex: 0 }), level);
  assert.equal(illegal, state);

  const legalIndex = getLegalPlacements(state.board, "left")[0];
  state = reduce(state, action(ACTIONS.PLACE, { boardIndex: legalIndex }), level);
  assert.equal(state.phase, "slide");
  assert.equal(state.organizer, "right");
  assert.equal(state.turn, 1);
  assert.deepEqual(state.board[legalIndex], tile("sound"));
  assert.equal(state.pendingTile, null);
  assert.equal(state.incomingDirection, null);
});

test("章节按稳定队列分享，继续与留白由同一动作消费", () => {
  const level = createLevel({
    initialBoard: [
      tile("place", 2), tile("place", 2), null, null,
      tile("taste", 2), tile("taste", 2), null, null,
      null, null, null, null,
    ],
  });
  let state = createInitialState(level);
  state = reduce(state, action(ACTIONS.SLIDE, { direction: "left" }), level);
  assert.equal(state.phase, "share");
  assert.deepEqual(state.shareQueue, ["place", "taste"]);
  assert.deepEqual(state.archivedThemes, ["place", "taste"]);

  state = reduce(state, action(ACTIONS.CONTINUE_SHARE), level);
  assert.equal(state.phase, "share");
  assert.deepEqual(state.shareQueue, ["taste"]);
  state = reduce(state, action(ACTIONS.CONTINUE_SHARE), level);
  assert.equal(state.phase, "choose");
  assert.deepEqual(state.shareQueue, []);
});

test("三个不同主题只在分享完成后胜利并清理补页链", () => {
  const level = createLevel({
    initialBoard: [
      tile("sound", 2), tile("sound", 2), null, null,
      null, null, null, null,
      null, null, null, null,
    ],
    targetDistinctChapters: 3,
  });
  let state = createInitialState(level);
  state = {
    ...state,
    archivedThemes: Object.freeze(["place", "taste"]),
  };
  Object.freeze(state);
  assert.equal(isState(state, level), true);

  state = reduce(state, action(ACTIONS.SLIDE, { direction: "left" }), level);
  assert.equal(state.phase, "share");
  state = reduce(state, action(ACTIONS.CONTINUE_SHARE), level);
  assert.equal(state.phase, "won");
  assert.equal(state.incomingDirection, null);
  assert.equal(state.pendingTile, null);
  assert.equal(state.lossReason, null);
});

test("重复章节会出板但不会增加不同主题完成进度", () => {
  const level = createLevel({
    initialBoard: [
      tile("place", 2), tile("place", 2), null, null,
      null, null, null, null,
      null, null, null, null,
    ],
  });
  let state = createInitialState(level);
  state = Object.freeze({
    ...state,
    archivedThemes: Object.freeze(["place", "taste"]),
  });
  state = reduce(state, action(ACTIONS.SLIDE, { direction: "left" }), level);
  state = reduce(state, action(ACTIONS.CONTINUE_SHARE), level);
  assert.equal(state.phase, "choose");
  assert.equal(new Set(state.archivedThemes).size, 2);
});

test("候选耗尽在下一次需要选择时失败", () => {
  const level = createLevel({
    initialBoard: [
      tile("place", 2), tile("place", 2), null, null,
      null, null, null, null,
      null, null, null, null,
    ],
    initialCandidates: [],
    supply: [],
  });
  let state = createInitialState(level);
  state = reduce(state, action(ACTIONS.SLIDE, { direction: "left" }), level);
  state = reduce(state, action(ACTIONS.CONTINUE_SHARE), level);
  assert.equal(state.phase, "lost");
  assert.equal(state.lossReason, "supply-exhausted");
});

test("补页后若没有任一合法滑动则以 blocked 结束", () => {
  const alternating = [
    tile("place"), tile("taste"), tile("sound"), tile("care"),
    tile("taste"), tile("care"), tile("taste"), tile("sound"),
    tile("sound"), tile("place"), tile("taste"), null,
  ];
  const level = createLevel({
    initialBoard: alternating,
    initialCandidates: ["care", "place"],
    supply: [],
  });
  let state = createInitialState(level);
  state = reduce(state, action(ACTIONS.SLIDE, { direction: "right" }), level);
  state = reduce(
    state,
    action(ACTIONS.CHOOSE_CANDIDATE, { candidateIndex: 0 }),
    level,
  );
  const position = getLegalPlacements(state.board, "right")[0];
  state = reduce(state, action(ACTIONS.PLACE, { boardIndex: position }), level);
  assert.equal(hasAnyLegalSlide(state.board), false);
  assert.equal(state.phase, "lost");
  assert.equal(state.lossReason, "blocked");
});

test("终态拒绝游戏动作，RESTART 恢复同一固定关卡", () => {
  const level = createLevel();
  const initial = createInitialState(level);
  const lost = Object.freeze({
    ...initial,
    phase: "lost",
    lossReason: "blocked",
  });
  assert.equal(isState(lost, level), true);
  for (const candidate of [
    action(ACTIONS.SLIDE, { direction: "right" }),
    action(ACTIONS.CONTINUE_SHARE),
    action(ACTIONS.CHOOSE_CANDIDATE, { candidateIndex: 0 }),
    action(ACTIONS.PLACE, { boardIndex: 0 }),
  ]) {
    assert.equal(reduce(lost, candidate, level), lost);
  }
  assert.deepEqual(
    reduce(lost, action(ACTIONS.RESTART), level),
    createInitialState(level),
  );
});

test("canonical key 忽略回合公告和重复归档但保留求解状态", () => {
  const level = createLevel();
  const state = createInitialState(level);
  const changedPresentation = Object.freeze({
    ...state,
    turn: 99,
    announcement: "只影响呈现",
    archivedThemes: Object.freeze(["taste", "place", "taste"]),
  });
  const normalizedArchives = Object.freeze({
    ...state,
    archivedThemes: Object.freeze(["place", "taste"]),
  });
  assert.equal(isState(changedPresentation, level), true);
  assert.equal(
    createCanonicalKey(changedPresentation, level),
    createCanonicalKey(normalizedArchives, level),
  );
});

test("畸形 state/action/level 安全拒绝且不触发 accessor", () => {
  const level = createLevel();
  const state = createInitialState(level);
  const hostileAction = {};
  Object.defineProperty(hostileAction, "type", {
    enumerable: true,
    get() {
      throw new Error("must not read");
    },
  });
  assert.equal(reduce(state, hostileAction, level), state);
  assert.equal(reduce({ phase: "slide" }, action(ACTIONS.SLIDE, {
    direction: "left",
  }), level).phase, "slide");
  assert.equal(createInitialState({ id: "bad" }), null);
  assert.equal(isState(new Proxy({}, {
    ownKeys() {
      throw new Error("must not inspect unsafely");
    },
  }), level), false);
});
