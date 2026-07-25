"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fixed = require("../js/fixed.js");
const geometry = require("../js/geometry.js");

const fp = fixed.toFp;
const point = (x, y) => ({ xFp: fp(x), yFp: fp(y) });
const delta = (x, y) => ({ xFp: fp(x), yFp: fp(y) });
const box = (id, minX, maxX, minY, maxY) => ({
  id,
  minX: fp(minX),
  maxX: fp(maxX),
  minY: fp(minY),
  maxY: fp(maxY),
});

function assertRatio(actual, num, den) {
  assert.deepEqual(actual, fixed.makeRational(num, den));
}

test("fixed/geometry 公共 API 与常量递归冻结", () => {
  assert.equal(fixed.FP_SCALE, 1024);
  assert.equal(Object.isFrozen(fixed), true);
  assert.equal(Object.isFrozen(geometry), true);
  for (const name of [
    "assertSafeInteger",
    "toFp",
    "roundDiv",
    "mulQ10",
    "makeRational",
    "compareRational",
    "equalRational",
    "oneMinusRational",
    "scaleByRational",
  ]) assert.equal(typeof fixed[name], "function", `missing fixed.${name}`);
  for (const name of [
    "sweepPointAabb",
    "sweepInsideBounds",
    "sweepMovingCircle",
    "compareCircleContactToRational",
    "collectEarliestContacts",
    "mergeContactNormals",
    "moveCircleWithSlides",
  ]) assert.equal(typeof geometry[name], "function", `missing geometry.${name}`);
});

test("Q10 乘法对正负输入对称舍入，半值远离零", () => {
  assert.equal(fixed.roundDiv(5, 2), 3);
  assert.equal(fixed.roundDiv(-5, 2), -3);
  assert.equal(fixed.roundDiv(4, -3), -1);
  assert.equal(fixed.mulQ10(fp(3), 724), 2172);
  assert.equal(fixed.mulQ10(fp(-3), 724), -2172);
  assert.equal(fixed.mulQ10(fp(3), -724), -2172);
  assert.throws(() => fixed.toFp(Number.MAX_SAFE_INTEGER), /safe integer|range/i);
});

test("有理数统一符号、约分和零，并以整数交叉乘法严格比较", () => {
  assert.deepEqual(fixed.makeRational(2, -4), { num: -1, den: 2 });
  assert.deepEqual(fixed.makeRational(0, -99), { num: 0, den: 1 });
  assert.equal(fixed.compareRational(fixed.makeRational(1, 3), fixed.makeRational(2, 5)), -1);
  assert.equal(fixed.compareRational(fixed.makeRational(6, 10), fixed.makeRational(3, 5)), 0);
  assert.equal(fixed.equalRational(fixed.makeRational(9, 15), fixed.makeRational(3, 5)), true);
  assert.deepEqual(fixed.oneMinusRational(fixed.makeRational(3, 8)), { num: 5, den: 8 });
  assert.equal(fixed.scaleByRational(fp(9), fixed.makeRational(1, 3)), fp(3));
  assert.throws(
    () => fixed.compareRational(
      { num: Number.MAX_SAFE_INTEGER, den: 1 },
      { num: Number.MAX_SAFE_INTEGER - 1, den: Number.MAX_SAFE_INTEGER },
    ),
    /safe integer|overflow/i,
  );
});

test("竖直墙正碰返回 1/2、进入法向和稳定表面 ID", () => {
  const hit = geometry.sweepPointAabb(
    point(0, 50),
    delta(100, 0),
    box("shield", 50, 60, 40, 60),
  );
  assertRatio(hit.toi, 1, 2);
  assert.deepEqual(hit.contacts, [{
    type: "wall",
    surfaceId: "shield:left",
    normalX: -1,
    normalY: 0,
    entering: true,
  }]);
});

test("水平墙正碰与高速穿越薄墙都不会漏检", () => {
  const horizontal = geometry.sweepPointAabb(
    point(50, 0),
    delta(0, 100),
    box("bar", 40, 60, 25, 26),
  );
  assertRatio(horizontal.toi, 1, 4);
  assert.equal(horizontal.contacts[0].surfaceId, "bar:top");
  assert.deepEqual(
    { x: horizontal.contacts[0].normalX, y: horizontal.contacts[0].normalY },
    { x: 0, y: -1 },
  );

  const fast = geometry.sweepPointAabb(
    point(-500, 50),
    delta(2000, 0),
    box("thin", 50, 51, 49, 51),
  );
  assertRatio(fast.toi, 11, 40);
});

test("平行、向外和恰好擦边不产生伪接触，零时进入有效", () => {
  const target = box("wall", 50, 60, 40, 60);
  assert.equal(geometry.sweepPointAabb(point(0, 30), delta(100, 0), target), null);
  assert.equal(geometry.sweepPointAabb(point(50, 50), delta(-10, 0), target), null);
  assert.equal(geometry.sweepPointAabb(point(0, 40), delta(100, 0), target), null);

  const entering = geometry.sweepPointAabb(point(50, 50), delta(10, 0), target);
  assertRatio(entering.toi, 0, 1);
  assert.equal(entering.contacts[0].surfaceId, "wall:left");
  assert.equal(entering.contacts[0].entering, true);
});

test("命中 AABB 拐角时合并双轴法向但仍是一个接触时刻", () => {
  const hit = geometry.sweepPointAabb(
    point(0, 0),
    delta(100, 100),
    box("corner", 50, 60, 50, 60),
  );
  assertRatio(hit.toi, 1, 2);
  assert.deepEqual(hit.contacts.map((event) => event.surfaceId), ["corner:left", "corner:top"]);
  assert.deepEqual(geometry.mergeContactNormals(hit.contacts), {
    flipX: true,
    flipY: true,
    surfaceIds: ["corner:left", "corner:top"],
  });
});

test("AABB 初始严格重叠失败关闭，而非静默夹断", () => {
  assert.throws(
    () => geometry.sweepPointAabb(
      point(55, 50),
      delta(10, 0),
      box("wall", 50, 60, 40, 60),
    ),
    /initial overlap/i,
  );
});

test("世界内边界返回固定 ID，镜像左右 TOI 完全相等", () => {
  const bounds = box("world", 24, 936, 24, 576);
  const right = geometry.sweepInsideBounds(point(900, 300), delta(72, 0), bounds);
  const left = geometry.sweepInsideBounds(point(60, 300), delta(-72, 0), bounds);
  assertRatio(right.toi, 1, 2);
  assertRatio(left.toi, 1, 2);
  assert.equal(right.contacts[0].surfaceId, "boundary-right");
  assert.equal(left.contacts[0].surfaceId, "boundary-left");
  assert.equal(right.contacts[0].normalX, -1);
  assert.equal(left.contacts[0].normalX, 1);
});

test("最早事件用有理比较集中收集，严格早于与完全并列不依赖 epsilon", () => {
  const candidates = [
    { toi: fixed.makeRational(1, 3), contacts: [{ surfaceId: "b" }] },
    { toi: fixed.makeRational(2, 6), contacts: [{ surfaceId: "a" }] },
    { toi: fixed.makeRational(4, 10), contacts: [{ surfaceId: "later" }] },
  ];
  const earliest = geometry.collectEarliestContacts(candidates);
  assertRatio(earliest.toi, 1, 3);
  assert.deepEqual(earliest.contacts.map((event) => event.surfaceId), ["a", "b"]);
});

test("移动圆 CCD 对静止、迎面和高速目标保留代数候选", () => {
  const stationary = geometry.sweepMovingCircle(
    point(-10, 0),
    delta(20, 0),
    fp(2),
  );
  assertRatio(stationary.toi, 2, 5);

  const irrational = geometry.sweepMovingCircle(
    point(-10, 1),
    delta(20, 0),
    fp(2),
  );
  assert.equal(irrational.toi, null);
  assert.equal(irrational.kind, "circle-contact");
  assert.equal(geometry.compareCircleContactToRational(
    irrational,
    fixed.makeRational(1, 2),
  ), -1);

  const noTunnel = geometry.sweepMovingCircle(
    point(-1000, 0),
    delta(2000, 0),
    fp(23),
  );
  assert.ok(noTunnel);
  assert.equal(geometry.compareCircleContactToRational(
    noTunnel,
    fixed.makeRational(1, 2),
  ), -1);
});

test("圆形 CCD 初始重叠失败，表面向外与纯切线无接触", () => {
  assert.throws(
    () => geometry.sweepMovingCircle(point(0, 0), delta(1, 0), fp(2)),
    /initial overlap/i,
  );
  assert.equal(geometry.sweepMovingCircle(point(2, 0), delta(1, 0), fp(2)), null);
  assert.equal(geometry.sweepMovingCircle(point(0, 2), delta(10, 0), fp(2)), null);
});

test("车辆圆扫掠在首次接触后保留切向运动并输出覆盖整 tick 的分段", () => {
  const result = geometry.moveCircleWithSlides(
    point(40, 40),
    delta(20, 20),
    [box("block", 50, 70, 0, 100)],
    2,
  );
  assert.deepEqual(result.end, point(50, 60));
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].surfaceId, "block:left");
  assert.ok(result.segments.length >= 2);
  assertRatio(result.segments[0].t0, 0, 1);
  assertRatio(result.segments.at(-1).t1, 1, 1);
});

