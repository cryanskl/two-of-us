import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const logic = globalThis.LIGHT_GROWN_TREE_LOGIC;

function started(config) {
  return logic.start(logic.createInitialState(config));
}

function growToEnd(state, lights = []) {
  let current = state;
  for (let step = 0; step < logic.TOTAL_STEPS; step += 1) {
    if (lights[step]) current = logic.moveLight(current, lights[step]);
    current = logic.growOnce(current);
  }
  return current;
}

test("config sanitizing keeps every field usable or falls back", () => {
  const sanitized = logic.sanitizeConfig({
    recipientName: "  小满  ",
    finalTitle: "   ",
    letterLines: ["  第一行  ", "", 42, "第二行"],
    signature: "—— 我",
    togetherSince: "2019-04-20T10:00:00Z",
    composeGrowthNote: () => "自定义",
  });

  assert.equal(sanitized.recipientName, "小满");
  assert.equal(sanitized.finalTitle, logic.DEFAULT_CONFIG.finalTitle);
  assert.deepEqual(sanitized.letterLines, ["第一行", "第二行"]);
  assert.equal(sanitized.togetherSince, Date.parse("2019-04-20T10:00:00Z"));
  assert.equal(typeof sanitized.composeGrowthNote, "function");

  const empty = logic.sanitizeConfig(null);
  assert.deepEqual(empty.letterLines, logic.DEFAULT_CONFIG.letterLines);
  assert.equal(empty.togetherSince, null);
  assert.equal(empty.composeGrowthNote, logic.DEFAULT_CONFIG.composeGrowthNote);
});

test("an unparseable or non-string togetherSince degrades to no counter", () => {
  for (const value of ["昨天", "", 1587376800000, {}, undefined, "not-a-date"]) {
    assert.equal(logic.sanitizeConfig({ togetherSince: value }).togetherSince, null, String(value));
  }
  const asDate = logic.sanitizeConfig({ togetherSince: new Date("2020-01-02T03:04:05Z") });
  assert.equal(asDate.togetherSince, Date.parse("2020-01-02T03:04:05Z"));
});

test("growth only runs between start and the final step", () => {
  const initial = logic.createInitialState();
  assert.equal(initial.phase, "intro");
  assert.equal(logic.growOnce(initial), initial, "intro 阶段不生长");

  const complete = growToEnd(started());
  assert.equal(complete.phase, "complete");
  assert.equal(complete.stepIndex, logic.TOTAL_STEPS);
  assert.equal(logic.growOnce(complete), complete, "长满后再点也不会继续");
});

test("each step adds exactly one segment per active tip", () => {
  let state = started();
  let expectedSegments = 0;
  for (let step = 1; step <= logic.TOTAL_STEPS; step += 1) {
    const tipsBefore = state.tips.length;
    state = logic.growOnce(state);
    expectedSegments += tipsBefore;
    assert.equal(state.segments.length, expectedSegments, `第 ${step} 步的枝段数`);
    assert.equal(state.stepIndex, step);
  }
});

test("tips split on the declared steps and never exceed the cap", () => {
  let state = started();
  const counts = [state.tips.length];
  for (let step = 1; step <= logic.TOTAL_STEPS; step += 1) {
    state = logic.growOnce(state);
    counts.push(state.tips.length);
    assert.ok(state.tips.length <= logic.MAX_TIPS, `第 ${step} 步不超过上限`);
  }
  assert.deepEqual(counts, [1, 1, 2, 2, 2, 4, 4, 4, 8, 8, 8, 8, 8]);
  assert.equal(new Set(state.tips.map((tip) => tip.id)).size, state.tips.length, "枝条 id 唯一");
});

test("the same light path always grows the same tree", () => {
  const path = [
    { x: -0.5, y: 0.8 }, { x: -0.5, y: 0.8 }, { x: 0.4, y: 0.9 },
    { x: 0.4, y: 0.9 }, { x: 0.1, y: 1 }, { x: -0.7, y: 0.6 },
  ];
  const first = growToEnd(started(), path);
  const second = growToEnd(started(), path);
  assert.deepEqual(second.segments, first.segments);
  assert.deepEqual(second.blossoms, first.blossoms);
});

test("a different light path grows a different tree", () => {
  const left = growToEnd(started(), Array.from({ length: 12 }, () => ({ x: -0.9, y: 0.7 })));
  const right = growToEnd(started(), Array.from({ length: 12 }, () => ({ x: 0.9, y: 0.7 })));
  assert.notDeepEqual(right.segments, left.segments);

  const averageX = (state) => state.tips.reduce((sum, tip) => sum + tip.x, 0) / state.tips.length;
  assert.ok(averageX(left) < 0, "光一直在左边时树应偏左");
  assert.ok(averageX(right) > 0, "光一直在右边时树应偏右");
});

test("every segment rises, however the light is moved", () => {
  const paths = [
    Array.from({ length: 12 }, () => ({ x: 0, y: logic.LIGHT_BOUNDS.minY })),
    Array.from({ length: 12 }, (_unused, index) => ({ x: index % 2 ? -1 : 1, y: 0.2 })),
    Array.from({ length: 12 }, () => ({ x: -1, y: 0.18 })),
  ];
  for (const [index, path] of paths.entries()) {
    const state = growToEnd(started(), path);
    for (const segment of state.segments) {
      assert.ok(segment.y2 > segment.y1, `路径 ${index} 的枝段必须向上：${segment.y1} → ${segment.y2}`);
    }
    const highest = Math.max(...state.tips.map((tip) => tip.y));
    assert.ok(highest > 0.5, `路径 ${index} 的树应该长起来，实际最高 ${highest}`);
  }
});

test("every segment and tip stays inside the growing space", () => {
  const wild = Array.from({ length: 12 }, (_unused, index) => (
    { x: index % 2 === 0 ? -9 : 9, y: index % 3 === 0 ? -4 : 8 }
  ));
  const state = growToEnd(started(), wild);
  for (const segment of state.segments) {
    for (const [axis, value] of [["x", segment.x2], ["y", segment.y2]]) {
      const bounds = axis === "x"
        ? [logic.TIP_BOUNDS.minX, logic.TIP_BOUNDS.maxX]
        : [logic.TIP_BOUNDS.minY, logic.TIP_BOUNDS.maxY];
      assert.ok(value >= bounds[0] && value <= bounds[1], `${axis}=${value} 越界`);
    }
  }
});

test("light movement is clamped and never rejects hostile input", () => {
  const state = started();
  assert.deepEqual(logic.moveLight(state, { x: 40, y: 40 }).light,
    { x: logic.LIGHT_BOUNDS.maxX, y: logic.LIGHT_BOUNDS.maxY });
  assert.deepEqual(logic.moveLight(state, { x: -40, y: -40 }).light,
    { x: logic.LIGHT_BOUNDS.minX, y: logic.LIGHT_BOUNDS.minY });

  for (const hostile of [null, undefined, {}, { x: Number.NaN, y: 1 }, "left"]) {
    const moved = logic.moveLight(state, hostile);
    assert.ok(Number.isFinite(moved.light.x) && Number.isFinite(moved.light.y), String(hostile));
  }
  assert.equal(logic.moveLight(state, state.light), state, "同一位置不产生新状态");
});

test("nudging accumulates and stays inside the light bounds", () => {
  let state = started();
  for (let index = 0; index < 30; index += 1) state = logic.nudgeLight(state, -0.1, 0.1);
  assert.equal(state.light.x, logic.LIGHT_BOUNDS.minX);
  assert.equal(state.light.y, logic.LIGHT_BOUNDS.maxY);
  assert.deepEqual(logic.nudgeLight(state, Number.NaN, undefined).light, state.light);
});

test("a hostile growth note never blocks growth", () => {
  const thrown = growToEnd(started({
    composeGrowthNote() { throw new Error("boom"); },
  }));
  assert.equal(thrown.phase, "complete");

  const wrongType = logic.growOnce(started({ composeGrowthNote: () => 42 }));
  assert.ok(logic.DEFAULT_GROWTH_NOTES.includes(wrongType.lastNote));

  const blank = logic.growOnce(started({ composeGrowthNote: () => "   " }));
  assert.ok(logic.DEFAULT_GROWTH_NOTES.includes(blank.lastNote));

  const long = logic.growOnce(started({ composeGrowthNote: () => "长".repeat(200) }));
  assert.equal(long.lastNote.length, 40, "过长的提示被截断而不是撑破版面");

  const complete = growToEnd(started({ composeGrowthNote: () => "还在长" }));
  assert.equal(complete.lastNote, "", "完成时不再显示生长提示");
});

test("blossoms appear only once the tree is complete", () => {
  let state = started();
  for (let step = 1; step < logic.TOTAL_STEPS; step += 1) {
    state = logic.growOnce(state);
    assert.deepEqual(state.blossoms, [], `第 ${step} 步不应开花`);
  }
  state = logic.growOnce(state);
  assert.equal(state.blossoms.length, state.tips.length);
  for (const blossom of state.blossoms) {
    assert.ok(blossom.size > 0 && Number.isFinite(blossom.size));
    assert.ok(blossom.tint >= 0 && blossom.tint < 1);
  }
});

test("restart clears the tree but keeps the prepared config", () => {
  const config = { recipientName: "小满", letterLines: ["只写一行"] };
  const complete = growToEnd(started(config));
  const restarted = logic.restart(complete);

  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.stepIndex, 0);
  assert.deepEqual(restarted.segments, []);
  assert.deepEqual(restarted.blossoms, []);
  assert.equal(restarted.config.recipientName, "小满");
  assert.ok(restarted.revision > complete.revision, "revision 单调递增");
});

test("derived progress mirrors the state", () => {
  let state = started();
  assert.deepEqual(logic.getDerivedProgress(state), {
    stepIndex: 0,
    totalSteps: logic.TOTAL_STEPS,
    remainingSteps: logic.TOTAL_STEPS,
    branchCount: 1,
    segmentCount: 0,
    ratio: 0,
    isComplete: false,
  });

  state = growToEnd(state);
  const progress = logic.getDerivedProgress(state);
  assert.equal(progress.remainingSteps, 0);
  assert.equal(progress.ratio, 1);
  assert.equal(progress.isComplete, true);
  assert.equal(logic.getDerivedProgress(null), null);
});

test("direction wording covers the whole light area", () => {
  assert.equal(logic.describeDirection({ x: 0, y: 0.6 }), "正前方");
  assert.equal(logic.describeDirection({ x: -0.9, y: 0.6 }), "左边");
  assert.equal(logic.describeDirection({ x: 0.9, y: 0.6 }), "右边");
  assert.equal(logic.describeDirection({ x: 0, y: 1 }), "正上方");
  assert.equal(logic.describeDirection({ x: -0.9, y: 1 }), "左上方");
  assert.equal(logic.describeDirection({ x: 0.9, y: 0.2 }), "右低方");
  assert.equal(typeof logic.describeDirection(null), "string");
});

test("together duration formats from a pure millisecond difference", () => {
  assert.deepEqual(logic.formatTogetherDuration(0), {
    days: 0, hours: 0, minutes: 0, seconds: 0,
  });
  const span = ((2 * 86400) + (3 * 3600) + (4 * 60) + 5) * 1000;
  assert.deepEqual(logic.formatTogetherDuration(span), {
    days: 2, hours: 3, minutes: 4, seconds: 5,
  });
  assert.equal(logic.formatTogetherDuration(-1), null);
  assert.equal(logic.formatTogetherDuration(Number.NaN), null);
  assert.equal(logic.formatTogetherDuration("100"), null);
});

test("state objects are frozen and rejected when malformed", () => {
  const state = growToEnd(started());
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.segments[0]));
  assert.equal(logic.isTreeState(state), true);

  for (const invalid of [null, {}, { phase: "unknown" }, { phase: "growing" }]) {
    assert.equal(logic.isTreeState(invalid), false, JSON.stringify(invalid));
    assert.equal(logic.growOnce(invalid), invalid);
    assert.equal(logic.moveLight(invalid, { x: 0, y: 1 }), invalid);
  }
});
