import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const logic = globalThis.INSTANT_PHOTO_LOGIC;

function toDeveloping() {
  let state = logic.capture(logic.createInitialState());
  return logic.finishEject(state, state.ejectToken);
}

function alternate(state, count, first = "left") {
  let direction = first;
  for (let index = 0; index < count; index += 1) {
    state = logic.shake(state, direction);
    direction = direction === "left" ? "right" : "left";
  }
  return state;
}

test("默认配置可直接使用且冻结", () => {
  assert.equal(logic.DEFAULT_CONFIG.photo, "./assets/demo-bicycles.png");
  assert.equal(Object.isFrozen(logic.DEFAULT_CONFIG), true);
  assert.strictEqual(logic.sanitizeConfig(null), logic.DEFAULT_CONFIG);
});

test("配置 trim 后整份接收，调用方对象不被冻结", () => {
  const input = {
    photo: " ./assets/ours.webp ",
    title: " 我们 ",
    stamp: " 周末 ",
    caption: " 一起慢下来 ",
    finalNote: " 下一次也一起 ",
  };
  const config = logic.sanitizeConfig(input);
  assert.deepEqual(config, {
    photo: "./assets/ours.webp",
    title: "我们",
    stamp: "周末",
    caption: "一起慢下来",
    finalNote: "下一次也一起",
  });
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(input), false);
});

test("只接受安全本地图片相对路径", () => {
  for (const path of ["assets/a.jpg", "./assets/a.JPEG", "photos/us.png", "a.webp", "a.avif"]) {
    assert.equal(logic.isSafePhotoPath(path), true, path);
  }
  for (const path of ["https://x/a.jpg", "//x/a.jpg", "/tmp/a.jpg", "../a.jpg", "assets/../a.jpg", "assets\\a.jpg", "a.png?x=1", "a.svg", "data:image/png;base64,x"]) {
    assert.equal(logic.isSafePhotoPath(path), false, path);
  }
});

test("任一配置字段非法时整份回退默认值", () => {
  const valid = { ...logic.DEFAULT_CONFIG };
  assert.strictEqual(logic.sanitizeConfig({ ...valid, title: "" }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({ ...valid, photo: "https://example.com/a.jpg" }), logic.DEFAULT_CONFIG);
  assert.strictEqual(logic.sanitizeConfig({ ...valid, finalNote: "字".repeat(81) }), logic.DEFAULT_CONFIG);
});

test("出片必须使用当前 token，旧回调不能推进", () => {
  const intro = logic.createInitialState(4);
  assert.strictEqual(logic.finishEject(intro, 5), intro);
  const ejecting = logic.capture(intro);
  assert.equal(ejecting.ejectToken, 5);
  assert.strictEqual(logic.finishEject(ejecting, 4), ejecting);
  assert.equal(logic.finishEject(ejecting, 5).phase, "developing");
});

test("第一次任一方向有效，之后同向输入保持同一引用", () => {
  const developing = toDeveloping();
  const left = logic.shake(developing, "left");
  assert.equal(left.acceptedShakes, 1);
  assert.strictEqual(logic.shake(left, "left"), left);
  assert.strictEqual(logic.shake(left, "up"), left);
  assert.equal(logic.shake(left, "right").acceptedShakes, 2);
});

test("九次交替唯一进入完成且百分比由次数派生", () => {
  const developing = toDeveloping();
  const almost = alternate(developing, logic.SHAKES_REQUIRED - 1);
  assert.equal(almost.phase, "developing");
  assert.equal(almost.acceptedShakes, 8);
  assert.equal(logic.getProgress(almost), 89);
  const complete = logic.shake(almost, "left");
  assert.equal(complete.phase, "complete");
  assert.equal(complete.acceptedShakes, 9);
  assert.equal(logic.getProgress(complete), 100);
  assert.strictEqual(logic.shake(complete, "right"), complete);
});

test("重开保留单调 token，下一次出片不会撞上旧回调", () => {
  let state = alternate(toDeveloping(), logic.SHAKES_REQUIRED);
  const oldToken = state.ejectToken;
  state = logic.restart(state);
  assert.equal(state.phase, "intro");
  assert.equal(state.ejectToken, oldToken);
  state = logic.capture(state);
  assert.equal(state.ejectToken, oldToken + 1);
  assert.strictEqual(logic.finishEject(state, oldToken), state);
});

test("非法阶段与畸形状态安全", () => {
  const intro = logic.createInitialState();
  assert.strictEqual(logic.shake(intro, "left"), intro);
  assert.strictEqual(logic.restart(intro), intro);
  assert.deepEqual(logic.shake({ ...intro, acceptedShakes: Number.NaN }, "left"), logic.createInitialState());
  assert.equal(logic.getProgress({}), 0);
});
