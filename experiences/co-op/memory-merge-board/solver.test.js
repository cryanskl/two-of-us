"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const config = require("./config.js");
const levels = require("./levels.js");
const logic = require("./logic.js");
const solver = require("./solver.js");

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

test("项目目录保持零依赖 CommonJS 边界", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
  assert.deepEqual(manifest, { type: "commonjs" });
});

test("三关通过 CommonJS 与经典脚本暴露同一冻结合同", () => {
  assert.deepEqual(Object.keys(levels), [
    "LEVELS",
    "getLevel",
    "validateLevelDefinitions",
  ]);
  assert.equal(levels.validateLevelDefinitions(), true);
  assertDeepFrozen(levels);

  const sandbox = { window: {} };
  vm.runInNewContext(
    readFileSync(require.resolve("./config.js"), "utf8"),
    sandbox,
    { filename: "config.js" },
  );
  vm.runInNewContext(
    readFileSync(require.resolve("./levels.js"), "utf8"),
    sandbox,
    { filename: "levels.js" },
  );
  assert.deepEqual(
    Array.from(sandbox.window.MemoryMergeBoardLevels.LEVELS, (level) => level.id),
    levels.LEVELS.map((level) => level.id),
  );
  assert.equal(
    Object.isFrozen(sandbox.window.MemoryMergeBoardLevels.LEVELS),
    true,
  );
});

test("固定关卡 ID、棋盘、候选、目标和黄金动作完整", () => {
  assert.deepEqual(levels.LEVELS.map((level) => level.id), [
    "first-page",
    "crossed-notes",
    "album-night",
  ]);
  for (const level of levels.LEVELS) {
    assert.equal(level.initialBoard.length, config.BOARD_SIZE);
    assert.equal(logic.isValidBoard(level.initialBoard), true);
    assert.equal(level.initialCandidates.length, 2);
    assert.notEqual(level.initialCandidates[0], level.initialCandidates[1]);
    assert.equal(
      level.targetDistinctChapters,
      config.TARGET_DISTINCT_CHAPTERS,
    );
    assert.equal(level.initialOrganizer, "left");
    assert.equal(level.hintPath.length, 28);
    assert.equal(level.hintPath[0].type, logic.ACTIONS.SLIDE);
    assert.equal(level.hintPath.at(-1).type, logic.ACTIONS.CONTINUE_SHARE);
  }
  assert.equal(levels.getLevel("missing"), null);
  assert.equal(levels.getLevel(null), null);
});

test("求解器公开 API 与状态上限递归冻结", () => {
  assert.deepEqual(Object.keys(solver), [
    "DEFAULT_LIMITS",
    "enumerateActions",
    "replayActions",
    "solveLevel",
    "analyzeSolution",
  ]);
  assert.deepEqual(solver.DEFAULT_LIMITS, {
    maxVisitedStates: 120000,
    maxDepth: 96,
  });
  assertDeepFrozen(solver);
});

test("三关均由确定性搜索在严格状态上限内求解", () => {
  for (const level of levels.LEVELS) {
    const result = solver.solveLevel(level, {
      maxVisitedStates: 10000,
      maxDepth: 64,
    });
    assert.equal(result.status, "solved", level.id);
    assert.ok(result.visitedStates > 1, level.id);
    assert.ok(result.visitedStates < 5000, level.id);
    assert.ok(result.generatedStates >= result.visitedStates, level.id);
    assert.ok(result.maxFrontier > 0, level.id);
    assert.equal(result.depth, 28, level.id);
    assert.equal(result.finalState.phase, "won", level.id);
    assertDeepFrozen(result);
  }
});

test("相同关卡重复求解得到逐动作完全相同的路径与统计", () => {
  for (const level of levels.LEVELS) {
    const first = solver.solveLevel(level, {
      maxVisitedStates: 10000,
      maxDepth: 64,
    });
    const second = solver.solveLevel(level, {
      maxVisitedStates: 10000,
      maxDepth: 64,
    });
    assert.deepEqual(second, first, level.id);
  }
});

test("冻结 golden path 与求解器发现的 witness 完全一致", () => {
  for (const level of levels.LEVELS) {
    const result = solver.solveLevel(level, {
      maxVisitedStates: 10000,
      maxDepth: 64,
    });
    assert.deepEqual(result.path, level.hintPath, level.id);
  }
});

test("golden path 经真实 reducer 重放且每步都改变权威状态", () => {
  for (const level of levels.LEVELS) {
    const replay = solver.replayActions(level, level.hintPath);
    assert.equal(replay.ok, true, level.id);
    assert.equal(replay.failedAt, null, level.id);
    assert.equal(replay.state.phase, "won", level.id);
    assert.equal(
      new Set(replay.state.archivedThemes).size,
      config.TARGET_DISTINCT_CHAPTERS,
      level.id,
    );
    assertDeepFrozen(replay);
  }
});

test("三条 golden path 都完成至少三次换位且两席承担两种职责", () => {
  for (const level of levels.LEVELS) {
    const analysis = solver.analyzeSolution(level, level.hintPath);
    assert.equal(analysis.solved, true, level.id);
    assert.ok(analysis.fullTurns >= 3, level.id);
    assert.deepEqual(analysis.organizerSeats, ["left", "right"], level.id);
    assert.deepEqual(analysis.replenisherSeats, ["left", "right"], level.id);
    assert.equal(analysis.distinctChapters, 3, level.id);
    assert.equal(analysis.repeatedChapters, 0, level.id);
  }
});

test("正式关至少两次具有实质候选分支和多落点分支", () => {
  for (const level of levels.LEVELS.slice(1)) {
    const analysis = solver.analyzeSolution(level, level.hintPath);
    assert.ok(analysis.meaningfulCandidateChoices >= 2, level.id);
    assert.ok(analysis.multiPlacementChoices >= 2, level.id);
  }
});

test("候选实质分支以不同 canonical successor 证明", () => {
  const level = levels.getLevel("crossed-notes");
  let state = logic.createInitialState(level);
  let witnessed = 0;

  for (const action of level.hintPath) {
    if (state.phase === "choose") {
      const keys = new Set(
        solver.enumerateActions(state, level).map((candidate) => (
          logic.createCanonicalKey(logic.reduce(state, candidate, level), level)
        )),
      );
      if (keys.size >= 2) witnessed += 1;
    }
    state = logic.reduce(state, action, level);
  }
  assert.ok(witnessed >= 2);
});

test("极低状态上限明确返回 state-limit 而非伪造未解", () => {
  const result = solver.solveLevel(levels.LEVELS[0], {
    maxVisitedStates: 1,
    maxDepth: 64,
  });
  assert.equal(result.status, "state-limit");
  assert.equal(result.path, null);
  assert.equal(result.finalState, null);
  assert.equal(result.visitedStates, 1);
});

test("非法关卡与非法 replay 安全返回结构化失败", () => {
  const invalid = solver.solveLevel({ id: "broken" });
  assert.equal(invalid.status, "invalid-level");
  assert.equal(invalid.visitedStates, 0);
  assert.deepEqual(solver.replayActions({ id: "broken" }, []), {
    ok: false,
    failedAt: 0,
    state: null,
  });
  assert.deepEqual(solver.replayActions(levels.LEVELS[0], null), {
    ok: false,
    failedAt: 0,
    state: null,
  });
  assert.equal(solver.analyzeSolution(levels.LEVELS[0], null), null);
});

test("生产核心不调用 DOM、随机、时钟、网络、存储或权限 API", () => {
  const files = ["config.js", "logic.js", "levels.js", "solver.js"];
  const forbidden = [
    ["DOM", /\b(?:document|HTMLElement|querySelector|createElement)\b/u],
    ["random", /\bMath\.random\s*\(|\bcrypto\.getRandomValues\s*\(/u],
    ["clock", /\b(?:Date|performance)\b|set(?:Timeout|Interval)\s*\(/u],
    ["network", /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u],
    ["storage", /\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b/u],
    ["permission", /\b(?:getUserMedia|geolocation|Notification|clipboard)\b/u],
    ["code generation", /\b(?:eval|Function)\s*\(/u],
  ];

  for (const file of files) {
    const source = readFileSync(join(__dirname, file), "utf8");
    for (const [label, pattern] of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} uses ${label}`);
    }
  }
});

test("核心阶段没有越权创建 UI 或 favicon 文件", () => {
  for (const file of [
    "index.html",
    "styles.css",
    "style.css",
    "app.js",
    "favicon.ico",
    "favicon.svg",
    "favicon.png",
  ]) {
    assert.equal(existsSync(join(__dirname, file)), false, file);
  }
});

test("README 与 ATTRIBUTION 固定来源、许可证和未复制边界", () => {
  const readme = readFileSync(join(__dirname, "README.md"), "utf8");
  const attribution = readFileSync(join(__dirname, "ATTRIBUTION.md"), "utf8");
  const fixedCommit = "478b6ec346e3787f589e4af751378d06ded4cbbc";
  for (const source of [readme, attribution]) {
    assert.match(source, new RegExp(fixedCommit, "u"));
    assert.match(source, /MIT License/u);
    assert.match(source, /Gabriele Cirulli/u);
    assert.match(source, /不复制|未复制/u);
  }
  assert.match(
    attribution,
    /57e12c39a6ad9d98b2e451065bfdfbd15fc9e0c2ed3bf4dc1d09acab41ff02fc/u,
  );
});

test("核心候选未进入共享 catalog", () => {
  const catalog = readFileSync(
    join(__dirname, "../../catalog.json"),
    "utf8",
  );
  assert.equal(catalog.includes('"memory-merge-board"'), false);
});
