import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.NESTED_GIFT_LOGIC;

function reachLayer(targetLayer) {
  let state = logic.start(logic.createInitialState());
  if (targetLayer === 0) return state;
  state = logic.releaseRibbon(logic.releaseRibbon(state, "left"), "right");
  state = logic.continueOpening(state);
  if (targetLayer === 1) return state;
  for (let index = 0; index < 4; index += 1) state = logic.peelCorner(state, index);
  state = logic.continueOpening(state);
  if (targetLayer === 2) return state;
  state = logic.setDrawerProgress(state, 80);
  return logic.continueOpening(state);
}

test("默认配置、合法配置与整份回退均深冻结", () => {
  assert.equal(logic.DEFAULT_CONFIG.layerMessages.length, 4);
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG));
  assert.ok(Object.isFrozen(logic.DEFAULT_CONFIG.layerMessages));

  const source = {
    recipient: "  给你  ",
    sender: "我",
    introNote: "慢慢拆",
    layerMessages: ["一", "二", "三", "四"],
    finalTitle: "盒心",
    finalMessage: "最后的话",
    invitation: "一起出发",
    acceptText: "再看一次",
  };
  const config = logic.sanitizeConfig(source);
  source.layerMessages[0] = "被修改";
  assert.equal(config.recipient, "给你");
  assert.deepEqual(config.layerMessages, ["一", "二", "三", "四"]);
  assert.equal(logic.sanitizeConfig({ ...source, layerMessages: ["少"] }), logic.DEFAULT_CONFIG);
  assert.equal(logic.sanitizeConfig({ ...source, finalMessage: "x".repeat(121) }), logic.DEFAULT_CONFIG);
});

test("初始状态字段稳定、完全冻结且开场只能推进一次", () => {
  const initial = logic.createInitialState();
  assert.deepEqual(initial, {
    phase: "intro",
    layerIndex: 0,
    ribbon: { left: false, right: false },
    peeledCorners: [false, false, false, false],
    drawerProgress: 0,
    knocks: 0,
    revision: 0,
  });
  assert.ok(Object.isFrozen(initial));
  assert.ok(Object.isFrozen(initial.ribbon));
  assert.ok(Object.isFrozen(initial.peeledCorners));
  const started = logic.start(initial);
  assert.equal(started.phase, "layer");
  assert.equal(logic.start(started), started);
});

test("左右丝带任意顺序完成，重复和未知输入不推进", () => {
  let state = reachLayer(0);
  const right = logic.releaseRibbon(state, "right");
  assert.equal(right.phase, "layer");
  assert.equal(right.ribbon.right, true);
  assert.equal(logic.releaseRibbon(right, "right"), right);
  assert.equal(logic.releaseRibbon(right, "middle"), right);
  state = logic.releaseRibbon(right, "left");
  assert.equal(state.phase, "note");
  assert.deepEqual(state.ribbon, { left: true, right: true });
});

test("四个纸角任意顺序且只有第四个进入留言", () => {
  let state = reachLayer(1);
  for (const index of [3, 0, 2]) state = logic.peelCorner(state, index);
  assert.equal(state.phase, "layer");
  assert.equal(logic.peelCorner(state, 3), state);
  assert.equal(logic.peelCorner(state, -1), state);
  state = logic.peelCorner(state, 1);
  assert.equal(state.phase, "note");
  assert.ok(state.peeledCorners.every(Boolean));
});

test("抽屉只接受整数、钳制范围并在 80 达到 Gate", () => {
  const initial = reachLayer(2);
  let state = initial;
  assert.equal(logic.setDrawerProgress(state, 12.5), state);
  assert.equal(logic.setDrawerProgress(state, -10), initial);
  state = logic.setDrawerProgress(state, 79);
  assert.equal(state.phase, "layer");
  assert.equal(state.drawerProgress, 79);
  state = logic.setDrawerProgress(state, 120);
  assert.equal(state.phase, "note");
  assert.equal(state.drawerProgress, 100);
});

test("敲盒三次才完成，其他层敲击保持原状态", () => {
  const drawerLayer = reachLayer(2);
  assert.equal(logic.knock(drawerLayer), drawerLayer);
  let state = reachLayer(3);
  state = logic.knock(state);
  assert.equal(state.knocks, 1);
  state = logic.knock(state);
  assert.equal(state.phase, "layer");
  state = logic.knock(state);
  assert.equal(state.phase, "note");
  assert.equal(state.knocks, logic.KNOCKS_REQUIRED);
  assert.equal(logic.knock(state), state);
});

test("四次留言交接是进入盒心的唯一路径", () => {
  let state = reachLayer(0);
  assert.equal(logic.continueOpening(state), state);
  state = logic.releaseRibbon(logic.releaseRibbon(state, "left"), "right");
  state = logic.continueOpening(state);
  assert.equal(state.layerIndex, 1);
  for (let index = 0; index < 4; index += 1) state = logic.peelCorner(state, index);
  state = logic.continueOpening(state);
  state = logic.setDrawerProgress(state, 80);
  state = logic.continueOpening(state);
  state = logic.knock(logic.knock(logic.knock(state)));
  assert.equal(state.phase, "note");
  state = logic.continueOpening(state);
  assert.equal(state.phase, "complete");
  assert.equal(state.layerIndex, 3);
});

test("非当前层操作、终局输入、重开与畸形状态安全", () => {
  const layer = reachLayer(1);
  assert.equal(logic.releaseRibbon(layer, "left"), layer);
  assert.equal(logic.setDrawerProgress(layer, 80), layer);
  assert.equal(logic.knock(layer), layer);

  let complete = reachLayer(3);
  complete = logic.knock(logic.knock(logic.knock(complete)));
  complete = logic.continueOpening(complete);
  assert.equal(logic.start(complete), complete);
  assert.equal(logic.peelCorner(complete, 0), complete);
  const restarted = logic.restart(complete);
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.revision, complete.revision + 1);
  assert.equal(logic.restart(restarted), restarted);

  const malformed = { ...complete, drawerProgress: 20 };
  assert.deepEqual(logic.knock(malformed), logic.createInitialState());
  assert.equal(logic.isGiftState(malformed), false);
});
