"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const geometry = require("./geometry.js");
const geometryPath = require.resolve("./geometry.js");
const targetsPath = require.resolve("./targets.js");
const targets = require(targetsPath);
const generatorPath = join(__dirname, "tools", "generate-targets.mjs");

function assertDeepFrozen(value, seen = new Set()) {
  if (
    value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)
  ) {
    return;
  }
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

test("target API is exact, recursively frozen and browser/CommonJS compatible", () => {
  assert.deepEqual(Object.keys(targets), [
    "getTargets",
    "getTargetById",
    "getRoundSchedule",
    "validateAllTargets"
  ]);
  assertDeepFrozen(targets);
  assert.equal(Object.hasOwn(globalThis, "SevenPieceDuetTargets"), false);

  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(geometryPath, "utf8"), sandbox, {
    filename: "geometry.js"
  });
  vm.runInNewContext(readFileSync(targetsPath, "utf8"), sandbox, {
    filename: "targets.js"
  });
  assert.deepEqual(
    Object.keys(sandbox.window.SevenPieceDuetTargets),
    Object.keys(targets)
  );
  assertDeepFrozen(sandbox.window.SevenPieceDuetTargets);
});

test("four generated targets are isolated exact covers with unique outlines", () => {
  const generated = targets.getTargets();
  assert.deepEqual(
    generated.map(({ id, title }) => ({ id, title })),
    [
      { id: "embrace", title: "相拥" },
      { id: "side-by-side", title: "并肩" },
      { id: "echo", title: "回响" },
      { id: "interlock", title: "相扣" }
    ]
  );
  assertDeepFrozen(generated);
  assert.equal(new Set(generated.map(({ fingerprint }) => fingerprint)).size, 4);

  for (const target of generated) {
    assert.equal(target.cells.length, geometry.CONSTANTS.TOTAL_CELLS);
    assert.equal(
      geometry.coverageShape(target.cells).length,
      geometry.CONSTANTS.TOTAL_COVERAGE_CELLS
    );
    assert.deepEqual(geometry.validateTarget(target), {
      valid: true,
      errors: []
    });
    assert.deepEqual(
      Object.keys(target.solution),
      geometry.PIECE_IDS
    );
  }
  assert.equal(
    generated.some(({ solution }) => solution.parallelogram.flipped),
    true
  );
  assert.deepEqual(targets.validateAllTargets(), {
    valid: true,
    errors: [],
    reports: generated.map(({ id }) => ({ id, valid: true, errors: [] }))
  });
});

test("target reads are fresh and the four-round seat schedule is frozen", () => {
  const first = targets.getTargets();
  const second = targets.getTargets();
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assert.notEqual(first[0], second[0]);
  assert.notEqual(first[0].solution, second[0].solution);
  assert.deepEqual(targets.getTargetById("echo"), first[2]);
  assert.equal(targets.getTargetById("missing"), null);
  assert.equal(targets.getTargetById({}), null);

  const schedule = targets.getRoundSchedule();
  assert.deepEqual(schedule, [
    { roundIndex: 0, targetId: "embrace", fineSeat: "A", boldSeat: "B" },
    { roundIndex: 1, targetId: "side-by-side", fineSeat: "B", boldSeat: "A" },
    { roundIndex: 2, targetId: "echo", fineSeat: "A", boldSeat: "B" },
    { roundIndex: 3, targetId: "interlock", fineSeat: "B", boldSeat: "A" }
  ]);
  assertDeepFrozen(schedule);
});

test("generator output is byte-identical and matches the frozen target module", () => {
  const run = (mode) => execFileSync(
    process.execPath,
    [generatorPath, mode],
    { encoding: "utf8" }
  );
  const first = run("--summary");
  const second = run("--summary");
  assert.equal(first, second);
  assert.match(
    first,
    /SHA-256 c41d1e8e73a1caf3d994d9b9b8b81e0287d4838d8d2986caad7e3ed21766506a/u
  );
  assert.match(run("--check"), /目标生成检查通过/u);
});

test("target production files have no network, random or copied asset inputs", () => {
  for (const path of [targetsPath, generatorPath]) {
    const source = readFileSync(path, "utf8");
    for (const forbidden of [
      /\bfetch\b/u,
      /\bXMLHttpRequest\b/u,
      /\bWebSocket\b/u,
      /\bMath\.random\b/u,
      /https?:\/\//u
    ]) {
      assert.doesNotMatch(source, forbidden);
    }
  }
});
