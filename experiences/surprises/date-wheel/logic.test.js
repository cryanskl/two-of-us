import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const { normalizeItems, uint32ToUnit, pickIndex, getSegmentAngle, getTargetRotation } = globalThis.DATE_WHEEL_LOGIC;

test("配置只保留 2–12 个有效纯文本候选", () => {
  assert.deepEqual(normalizeItems([{ label: " A ", detail: " x " }, { label: "B" }]), [
    { label: "A", detail: "x" }, { label: "B", detail: "" },
  ]);
  assert.deepEqual(normalizeItems([{ label: "only" }]), []);
  assert.equal(normalizeItems(Array.from({ length: 15 }, (_, index) => ({ label: String(index) }))).length, 12);
});

test("32 位随机整数稳定映射到 [0, 1)", () => {
  assert.equal(uint32ToUnit(0), 0);
  assert.equal(uint32ToUnit(4294967295), 4294967295 / 4294967296);
  assert.equal(uint32ToUnit(-1), null);
  assert.equal(uint32ToUnit(4294967296), null);
});

test("等概率区间映射覆盖首尾索引并拒绝非法值", () => {
  assert.equal(pickIndex(0, 6), 0);
  assert.equal(pickIndex(1 / 6, 6), 1);
  assert.equal(pickIndex(0.999999, 6), 5);
  assert.equal(pickIndex(1, 6), null);
});

test("扇区等分且目标旋转把中奖扇区中心对齐指针", () => {
  assert.equal(getSegmentAngle(6), 60);
  for (let index = 0; index < 6; index += 1) {
    const target = getTargetRotation(17, index, 6, 3);
    assert.ok(target >= 17 + 1080);
    assert.ok(Math.abs((((target + (index + 0.5) * 60) % 360) + 360) % 360) < 1e-9);
  }
});

test("同一索引不受当前累计角度和整圈数影响", () => {
  const first = getTargetRotation(0, 2, 6, 3);
  const again = getTargetRotation(first, 2, 6, 4);
  assert.equal(((first % 360) + 360) % 360, ((again % 360) + 360) % 360);
});
