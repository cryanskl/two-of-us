import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("./config.js");
await import("./logic.js");

const configApi = globalThis.HoneycombPassageConfig;
const editableConfig = globalThis.HONEYCOMB_PASSAGE_CONFIG;
const logic = globalThis.HoneycombPassageLogic;

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) assertDeepFrozen(descriptor.value, seen);
  }
}

function mirror(cell) {
  return { q: -cell.q, r: -cell.r };
}

function throwingProxy() {
  return new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype");
    },
    ownKeys() {
      throw new Error("hostile keys");
    },
  });
}

test("导出冻结常量、默认配置和稳定 UMD 全局", () => {
  assert.equal(logic.VERSION, 1);
  assert.equal(logic.PLAYER_COUNT, 2);
  assert.equal(logic.BOARD_RADIUS, 3);
  assert.equal(logic.BOARD_CELL_COUNT, 37);
  assert.equal(logic.STARTING_SEALS, 4);
  assert.equal(logic.MAX_ROUNDS, 16);
  assert.equal(logic.MAX_PLIES, 32);
  assert.equal(logic.YELLOW, 0);
  assert.equal(logic.PURPLE, 1);
  assert.deepEqual(logic.STARTS, [{ q: -3, r: 0 }, { q: 3, r: 0 }]);
  assert.deepEqual(logic.ACTIONS, ["move", "seal"]);
  assert.deepEqual(logic.PHASES, ["intro", "playing", "result"]);
  assert.deepEqual(logic.DIRECTIONS, [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ]);
  assert.deepEqual(editableConfig, {
    playerNames: ["蜜黄", "暮紫"],
    finalNote: "绕一点路，也还是会在对面相逢。",
  });
  assert.equal(editableConfig, configApi.DEFAULT_CONFIG);
  assertDeepFrozen(configApi);
  assertDeepFrozen(logic);
});

test("配置严格白名单、清理纯文本并隔离调用方引用", () => {
  const source = {
    playerNames: ["  小蜜  ", "暮暮"],
    finalNote: "  总会相逢。  ",
  };
  const sanitized = configApi.sanitizeConfig(source);
  assert.deepEqual(sanitized, {
    playerNames: ["小蜜", "暮暮"],
    finalNote: "总会相逢。",
  });
  assert.notEqual(sanitized.playerNames, source.playerNames);
  source.playerNames[0] = "篡改";
  source.finalNote = "篡改";
  assert.deepEqual(sanitized, {
    playerNames: ["小蜜", "暮暮"],
    finalNote: "总会相逢。",
  });
  assertDeepFrozen(sanitized);

  assert.deepEqual(configApi.sanitizeConfig({
    playerNames: ["同名", "同名"],
    finalNote: "合法结语",
  }), {
    playerNames: ["蜜黄", "暮紫"],
    finalNote: "合法结语",
  });
  assert.deepEqual(configApi.sanitizeConfig({
    playerNames: ["甲", "乙"],
    finalNote: "",
  }), {
    playerNames: ["甲", "乙"],
    finalNote: "绕一点路，也还是会在对面相逢。",
  });
  assert.equal(configApi.sanitizeConfig({
    playerNames: ["甲", "乙"],
    finalNote: "合法",
    extra: true,
  }), configApi.DEFAULT_CONFIG);
});

test("配置拒绝控制字符、孤立代理项、畸形数组、访问器、自定义原型和 Proxy", () => {
  const invalidNames = [
    ["甲\n", "乙"],
    ["\uD800", "乙"],
    ["", "乙"],
    ["1234567890123", "乙"],
  ];
  for (const playerNames of invalidNames) {
    assert.deepEqual(configApi.sanitizeConfig({ playerNames, finalNote: "仍合法" }), {
      playerNames: ["蜜黄", "暮紫"],
      finalNote: "仍合法",
    });
  }

  const sparse = [];
  sparse.length = 2;
  sparse[1] = "乙";
  const subclass = new (class extends Array {})("甲", "乙");
  const accessor = { finalNote: "合法" };
  Object.defineProperty(accessor, "playerNames", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  const inherited = Object.assign(Object.create({}), {
    playerNames: ["甲", "乙"],
    finalNote: "合法",
  });

  for (const value of [
    { playerNames: sparse, finalNote: "合法" },
    { playerNames: subclass, finalNote: "合法" },
  ]) {
    assert.doesNotThrow(() => configApi.sanitizeConfig(value));
    assert.deepEqual(configApi.sanitizeConfig(value), {
      playerNames: ["蜜黄", "暮紫"],
      finalNote: "合法",
    });
  }
  for (const value of [accessor, inherited, throwingProxy()]) {
    assert.doesNotThrow(() => configApi.sanitizeConfig(value));
    assert.equal(configApi.sanitizeConfig(value), configApi.DEFAULT_CONFIG);
  }
});

test("cell key 只接受精确普通安全整数坐标并严格解析 canonical key", () => {
  assert.equal(logic.cellKey({ q: 0, r: 0 }), "0,0");
  assert.equal(logic.cellKey({ q: -0, r: 0 }), "0,0");
  assert.equal(logic.cellKey({ q: -3, r: 3 }), "-3,3");
  assert.deepEqual(logic.parseCellKey("-3,3"), { q: -3, r: 3 });
  assert.equal(logic.isCellOnBoard({ q: 3, r: -3 }), true);

  for (const cell of [
    null,
    [],
    { q: 0 },
    { q: 0, r: 0, s: 0 },
    { q: 4, r: 0 },
    { q: 3, r: 1 },
    { q: 0.5, r: 0 },
    { q: "0", r: 0 },
    { q: Number.NaN, r: 0 },
    { q: Number.POSITIVE_INFINITY, r: 0 },
    { q: Number.MAX_SAFE_INTEGER, r: Number.MAX_SAFE_INTEGER },
    Object.assign(Object.create({}), { q: 0, r: 0 }),
    { q: 0, r: 0, [Symbol("extra")]: true },
    throwingProxy(),
  ]) {
    assert.doesNotThrow(() => logic.cellKey(cell));
    assert.equal(logic.cellKey(cell), null);
    assert.equal(logic.isCellOnBoard(cell), false);
  }

  const getter = { r: 0 };
  Object.defineProperty(getter, "q", {
    enumerable: true,
    get() {
      throw new Error("must not run");
    },
  });
  assert.equal(logic.cellKey(getter), null);

  for (const key of [
    "+0,0", "-0,0", "00,0", "0,-0", "0, 0", "0,0 ", "3,1", "4,0",
    "9007199254740992,0", "", null, throwingProxy(),
  ]) {
    assert.doesNotThrow(() => logic.parseCellKey(key));
    assert.equal(logic.parseCellKey(key), null);
  }
  assertDeepFrozen(logic.parseCellKey("1,-2"));
});

test("默认棋盘有 37 个唯一格并按 q、r 稳定排序", () => {
  const first = logic.createBoard();
  const second = logic.createBoard();
  const keys = first.map(logic.cellKey);
  assert.equal(first.length, 37);
  assert.equal(new Set(keys).size, 37);
  assert.deepEqual(first.slice(0, 4), [
    { q: -3, r: 0 },
    { q: -3, r: 1 },
    { q: -3, r: 2 },
    { q: -3, r: 3 },
  ]);
  assert.deepEqual(first.slice(-4), [
    { q: 3, r: -3 },
    { q: 3, r: -2 },
    { q: 3, r: -1 },
    { q: 3, r: 0 },
  ]);
  for (let index = 1; index < first.length; index += 1) {
    const previous = first[index - 1];
    const current = first[index];
    assert.equal(previous.q < current.q || (previous.q === current.q && previous.r < current.r), true);
  }
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
  assertDeepFrozen(first);
  assert.deepEqual(logic.createBoard(2).length, 19);
  assert.deepEqual(logic.createBoard(0), [{ q: 0, r: 0 }]);
  for (const radius of [-1, 4, 1.5, "3", Number.NaN]) assert.deepEqual(logic.createBoard(radius), []);
});

test("邻居遵循固定方向，内部六邻、六角三邻且邻接双向", () => {
  assert.deepEqual(logic.getNeighbors({ q: 0, r: 0 }), logic.DIRECTIONS);
  const corners = [
    { q: 3, r: 0 },
    { q: 3, r: -3 },
    { q: 0, r: -3 },
    { q: -3, r: 0 },
    { q: -3, r: 3 },
    { q: 0, r: 3 },
  ];
  for (const corner of corners) assert.equal(logic.getNeighbors(corner).length, 3);

  for (const cell of logic.createBoard()) {
    const key = logic.cellKey(cell);
    const neighborKeys = logic.getNeighbors(cell).map(logic.cellKey);
    assert.equal(new Set(neighborKeys).size, neighborKeys.length);
    for (const neighbor of logic.getNeighbors(cell)) {
      assert.equal(logic.getNeighbors(neighbor).map(logic.cellKey).includes(key), true);
    }
  }
  assert.deepEqual(logic.getNeighbors({ q: 4, r: 0 }), []);
  assertDeepFrozen(logic.getNeighbors({ q: 0, r: 0 }));
});

test("起点、目标边和坐标镜像严格对称", () => {
  assert.equal(logic.isGoalCell(logic.YELLOW, { q: 3, r: -2 }), true);
  assert.equal(logic.isGoalCell(logic.YELLOW, { q: 2, r: 0 }), false);
  assert.equal(logic.isGoalCell(logic.PURPLE, { q: -3, r: 2 }), true);
  assert.equal(logic.isGoalCell(logic.PURPLE, { q: -2, r: 0 }), false);
  assert.equal(logic.isGoalCell(2, { q: 3, r: 0 }), false);
  assert.equal(logic.isGoalCell(0, throwingProxy()), false);

  for (const cell of logic.createBoard()) {
    assert.equal(logic.isCellOnBoard(mirror(cell)), true);
    assert.equal(logic.isGoalCell(logic.YELLOW, cell), logic.isGoalCell(logic.PURPLE, mirror(cell)));
  }
});

test("BFS 给出初始距离、目标距离、唯一走廊、截断和绕行结果", () => {
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, []), 6);
  assert.equal(logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, []), 6);
  assert.equal(logic.findShortestDistance({ q: 3, r: -1 }, logic.YELLOW, []), 0);
  assert.equal(logic.findShortestDistance({ q: -3, r: 1 }, logic.PURPLE, []), 0);

  const allMiddle = logic.createBoard()
    .filter((cell) => cell.q === 0)
    .map(logic.cellKey);
  const oneOpening = allMiddle.filter((key) => key !== "0,0");
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, oneOpening), 6);
  assert.equal(logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, oneOpening), 6);
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, allMiddle), null);
  assert.equal(logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, allMiddle), null);
  assert.equal(logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, ["0,0"]), 6);

  const descriptorOnlyStart = new Proxy({ q: -3, r: 0 }, {
    get(target, property, receiver) {
      if (property === "q" || property === "r") throw new Error("must not read through proxy get");
      return Reflect.get(target, property, receiver);
    },
  });
  assert.doesNotThrow(
    () => logic.findShortestDistance(descriptorOnlyStart, logic.YELLOW, []),
  );
  assert.equal(logic.findShortestDistance(descriptorOnlyStart, logic.YELLOW, []), 6);
});

test("镜像封蜡夹具保持 BFS 距离镜像", () => {
  const fixtures = [
    [],
    ["0,0"],
    ["-1,0", "0,-1", "1,-1"],
    ["-2,1", "-1,1", "0,1", "1,0"],
  ];
  for (const blocked of fixtures) {
    const mirrored = blocked.map((key) => logic.cellKey(mirror(logic.parseCellKey(key))));
    assert.equal(
      logic.findShortestDistance(logic.STARTS[0], logic.YELLOW, blocked),
      logic.findShortestDistance(logic.STARTS[1], logic.PURPLE, mirrored),
    );
  }
});

test("BFS 拒绝重复、起点、越界、非 canonical、稀疏、访问器、子类和 Proxy blocked", () => {
  const start = logic.STARTS[0];
  const sparse = [];
  sparse.length = 1;
  const accessor = [];
  Object.defineProperty(accessor, "0", {
    enumerable: true,
    configurable: true,
    get() {
      throw new Error("must not run");
    },
  });
  accessor.length = 1;
  const subclass = new (class extends Array {})("0,0");
  const proxy = new Proxy([], {
    ownKeys() {
      throw new Error("hostile keys");
    },
  });

  for (const blocked of [
    ["0,0", "0,0"],
    ["-3,0"],
    ["4,0"],
    ["00,0"],
    sparse,
    accessor,
    subclass,
    proxy,
    null,
  ]) {
    assert.doesNotThrow(() => logic.findShortestDistance(start, logic.YELLOW, blocked));
    assert.equal(logic.findShortestDistance(start, logic.YELLOW, blocked), null);
  }
  assert.equal(logic.findShortestDistance({ q: 4, r: 0 }, logic.YELLOW, []), null);
  assert.equal(logic.findShortestDistance(start, 2, []), null);
});

test("生产脚本没有 DOM、网络、存储、随机或计时依赖", async () => {
  const sources = await Promise.all([
    readFile(new URL("./config.js", import.meta.url), "utf8"),
    readFile(new URL("./logic.js", import.meta.url), "utf8"),
  ]);
  const forbidden = [
    /\bdocument\b/u,
    /\bwindow\b/u,
    /\bfetch\b/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\bDate\b/u,
    /\bperformance\b/u,
    /\bMath\.random\b/u,
    /\bsetTimeout\b/u,
    /\bsetInterval\b/u,
  ];
  for (const source of sources) {
    for (const pattern of forbidden) assert.equal(pattern.test(source), false, String(pattern));
  }
});
