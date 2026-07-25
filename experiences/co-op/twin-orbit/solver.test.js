"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const logic = require("./logic.js");
const fixtures = require("./fixtures.js");

const { ACTIONS, GATES, createInitialState, reduce, getPublicView } = logic;
const { GOLDEN_FIXTURES, expandFixture } = fixtures;

const ORACLE_TURN_STEPS = 720;
const ORACLE_SPEEDS = Object.freeze({ outer: 2, inner: 3 });
const ORACLE_LANES = Object.freeze(["outer", "inner"]);
const JOINT_CHOICES = Object.freeze([
  Object.freeze({ left: "outer", right: "outer" }),
  Object.freeze({ left: "outer", right: "inner" }),
  Object.freeze({ left: "inner", right: "outer" }),
  Object.freeze({ left: "inner", right: "inner" })
]);

function oracleNormalize(value) {
  return ((value % ORACLE_TURN_STEPS) + ORACLE_TURN_STEPS)
    % ORACLE_TURN_STEPS;
}

function oracleCrossed(previous, target, speed) {
  const distance = oracleNormalize(target - previous);
  return distance > 0 && distance <= speed;
}

function decodePath(encoded, ticks) {
  const choices = new Array(ticks);
  let value = encoded;
  for (let index = ticks - 1; index >= 0; index -= 1) {
    choices[index] = JOINT_CHOICES[Number(value & 3n)];
    value >>= 2n;
  }
  return choices;
}

function allowedChoices(fixed) {
  return JOINT_CHOICES.filter((choice) => (
    (!fixed.left || choice.left === fixed.left)
    && (!fixed.right || choice.right === fixed.right)
  ));
}

function solveGate(gate, fixed = {}) {
  let states = new Map([
    [`${gate.startAngles.left},${gate.startAngles.right}`, 0n]
  ]);
  const solutionTicks = new Set();
  let witness = null;
  const choices = allowedChoices(fixed);
  const openStart = gate.openTick - 2;
  const openEnd = gate.openTick + 2;

  for (let tick = 1; tick <= openEnd; tick += 1) {
    const nextStates = new Map();
    for (const [key, path] of states) {
      const [leftAngle, rightAngle] = key.split(",").map(Number);
      for (const choice of choices) {
        const leftSpeed = ORACLE_SPEEDS[choice.left];
        const rightSpeed = ORACLE_SPEEDS[choice.right];
        const leftCrossed = oracleCrossed(
          leftAngle,
          gate.targets.left.angle,
          leftSpeed
        );
        const rightCrossed = oracleCrossed(
          rightAngle,
          gate.targets.right.angle,
          rightSpeed
        );
        const leftNext = oracleNormalize(leftAngle + leftSpeed);
        const rightNext = oracleNormalize(rightAngle + rightSpeed);
        const encoded = (path << 2n) | BigInt(JOINT_CHOICES.indexOf(choice));
        const inWindow = tick >= openStart && tick <= openEnd;

        if (
          leftCrossed
          && rightCrossed
          && inWindow
          && choice.left === gate.targets.left.lane
          && choice.right === gate.targets.right.lane
        ) {
          solutionTicks.add(tick);
          if (!witness) {
            witness = {
              tick,
              path: decodePath(encoded, tick)
            };
          }
        }

        if (leftCrossed || rightCrossed || tick >= openEnd) continue;
        const nextKey = `${leftNext},${rightNext}`;
        if (!nextStates.has(nextKey)) nextStates.set(nextKey, encoded);
      }
    }
    states = nextStates;
  }

  return {
    solutionTicks: [...solutionTicks].sort((left, right) => left - right),
    witness
  };
}

function oracleReplay(gate, expanded) {
  assert.equal(expanded.left.length, expanded.right.length);
  let leftAngle = gate.startAngles.left;
  let rightAngle = gate.startAngles.right;
  const events = [];

  for (let index = 0; index < expanded.left.length; index += 1) {
    const tick = index + 1;
    const leftLane = expanded.left[index];
    const rightLane = expanded.right[index];
    const leftSpeed = ORACLE_SPEEDS[leftLane];
    const rightSpeed = ORACLE_SPEEDS[rightLane];
    const leftCrossed = oracleCrossed(
      leftAngle,
      gate.targets.left.angle,
      leftSpeed
    );
    const rightCrossed = oracleCrossed(
      rightAngle,
      gate.targets.right.angle,
      rightSpeed
    );
    leftAngle = oracleNormalize(leftAngle + leftSpeed);
    rightAngle = oracleNormalize(rightAngle + rightSpeed);
    if (leftCrossed || rightCrossed) {
      events.push({
        tick,
        leftCrossed,
        rightCrossed,
        leftLane,
        rightLane,
        leftAngle,
        rightAngle
      });
    }
  }

  return { leftAngle, rightAngle, events };
}

function setHeld(state, playerId, held) {
  return reduce(state, {
    type: ACTIONS.SET_HELD,
    playerId,
    held,
    inputEpoch: state.inputEpoch
  });
}

function beginGate(state) {
  if (state.phase === "intro") state = reduce(state, { type: ACTIONS.START });
  return reduce(state, { type: ACTIONS.BEGIN_GATE });
}

function replayFixture(state, expanded, batched) {
  state = beginGate(state);
  let cursor = 0;
  while (cursor < expanded.left.length && state.phase === "playing") {
    const leftLane = expanded.left[cursor];
    const rightLane = expanded.right[cursor];
    state = setHeld(state, "left", leftLane === "inner");
    state = setHeld(state, "right", rightLane === "inner");

    let count = 1;
    if (batched) {
      while (
        count < 5
        && cursor + count < expanded.left.length
        && expanded.left[cursor + count] === leftLane
        && expanded.right[cursor + count] === rightLane
      ) {
        count += 1;
      }
    }
    state = reduce(state, { type: ACTIONS.TICK, count });
    cursor += count;
  }
  return state;
}

function innerCount(lanes) {
  return lanes.filter((lane) => lane === "inner").length;
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

test("fixtures expose exact frozen runs through classic and CommonJS boundaries", () => {
  assert.deepEqual(Object.keys(fixtures), ["GOLDEN_FIXTURES", "expandFixture"]);
  assert.equal(GOLDEN_FIXTURES.length, 5);
  assertDeepFrozen(fixtures);

  const sandbox = { window: {} };
  vm.runInNewContext(
    readFileSync(require.resolve("./fixtures.js"), "utf8"),
    sandbox,
    { filename: "fixtures.js" }
  );
  assert.deepEqual(
    Object.keys(sandbox.window.TwinOrbitFixtures),
    Object.keys(fixtures)
  );
  assert.equal(
    sandbox.window.TwinOrbitFixtures.GOLDEN_FIXTURES[4].id,
    "long-way-right"
  );
});

test("expanded fixtures are fresh, deeply frozen and exact-length", () => {
  for (const gate of GATES) {
    const first = expandFixture(gate.id);
    const second = expandFixture(gate.id);
    assert.notEqual(first, second);
    assert.notEqual(first.left, second.left);
    assert.notEqual(first.right, second.right);
    assert.equal(first.left.length, gate.openTick);
    assert.equal(first.right.length, gate.openTick);
    assertDeepFrozen(first);
  }
  assert.equal(expandFixture("missing"), null);
  assert.equal(expandFixture(null), null);
});

test("independent oracle replays all five fixtures at the center tick", () => {
  GATES.forEach((gate) => {
    const expanded = expandFixture(gate.id);
    const result = oracleReplay(gate, expanded);
    assert.deepEqual(result.events, [
      {
        tick: gate.openTick,
        leftCrossed: true,
        rightCrossed: true,
        leftLane: gate.targets.left.lane,
        rightLane: gate.targets.right.lane,
        leftAngle: gate.targets.left.angle,
        rightAngle: gate.targets.right.angle
      }
    ]);
  });
});

test("independent solver finds every legal window tick for all five gates", () => {
  GATES.forEach((gate) => {
    const result = solveGate(gate);
    assert.deepEqual(result.solutionTicks, [
      gate.openTick - 2,
      gate.openTick - 1,
      gate.openTick,
      gate.openTick + 1,
      gate.openTick + 2
    ]);
    assert.ok(result.witness);
    assert.ok(result.witness.tick >= gate.openTick - 2);
    assert.ok(result.witness.tick <= gate.openTick + 2);
  });
});

test("fixing either seat to either lane makes every gate unsolvable", () => {
  for (const gate of GATES) {
    for (const playerId of ["left", "right"]) {
      for (const lane of ORACLE_LANES) {
        const result = solveGate(gate, { [playerId]: lane });
        assert.deepEqual(
          result.solutionTicks,
          [],
          `${gate.id}: ${playerId} fixed ${lane}`
        );
        assert.equal(result.witness, null);
      }
    }
  }
});

test("an absent released seat cannot be compensated by the active partner", () => {
  for (const gate of GATES) {
    assert.deepEqual(solveGate(gate, { left: "outer" }).solutionTicks, []);
    assert.deepEqual(solveGate(gate, { right: "outer" }).solutionTicks, []);
  }
});

test("fixture workload is mirror-balanced at 150 inner ticks per seat", () => {
  const expanded = GATES.map((gate) => expandFixture(gate.id));
  assert.equal(
    expanded.reduce((total, fixture) => total + innerCount(fixture.left), 0),
    150
  );
  assert.equal(
    expanded.reduce((total, fixture) => total + innerCount(fixture.right), 0),
    150
  );
  for (const fixture of expanded) {
    assert.ok(fixture.left.includes("inner"));
    assert.ok(fixture.left.includes("outer"));
    assert.ok(fixture.right.includes("inner"));
    assert.ok(fixture.right.includes("outer"));
  }
  assert.deepEqual(expanded[0].left, expanded[1].right);
  assert.deepEqual(expanded[0].right, expanded[1].left);
  assert.deepEqual(expanded[3].left, expanded[4].right);
  assert.deepEqual(expanded[3].right, expanded[4].left);
  assert.equal(innerCount(expanded[2].left), innerCount(expanded[2].right));
});

test("fifth fixture proves the 719-to-0 boundary with exact target 32", () => {
  const gate = GATES[4];
  const expanded = expandFixture(gate.id);
  let rightAngle = gate.startAngles.right;
  let previous = rightAngle;
  let sawWrap = false;
  for (const lane of expanded.right) {
    previous = rightAngle;
    rightAngle = oracleNormalize(rightAngle + ORACLE_SPEEDS[lane]);
    if (rightAngle < previous) sawWrap = true;
  }
  assert.equal(sawWrap, true);
  assert.equal(previous, 30);
  assert.equal(rightAngle, 32);
  assert.equal(gate.targets.right.angle, 32);
  assert.equal(oracleCrossed(previous, gate.targets.right.angle, 2), true);
});

test("real reducer completes all five fixtures and only then enters complete", () => {
  let state = createInitialState();
  for (let index = 0; index < GATES.length; index += 1) {
    state = replayFixture(state, expandFixture(GATES[index].id), false);
    assert.equal(state.phase, "gate-success");
    assert.equal(state.gateIndex, index);
    assert.equal(state.tick, GATES[index].openTick);
    assert.deepEqual(
      state.completedGateIds,
      GATES.slice(0, index + 1).map((gate) => gate.id)
    );
    state = reduce(state, { type: ACTIONS.NEXT_GATE });
    assert.equal(
      state.phase,
      index === GATES.length - 1 ? "complete" : "gate-intro"
    );
  }
  const view = getPublicView(state);
  assert.equal(view.phase, "complete");
  assert.equal(view.completedCount, 5);
  assert.equal(view.canRestart, true);
  assert.equal(JSON.stringify(view).includes("first-meeting"), false);
});

test("batched and one-tick fixture replays produce identical authoritative state", () => {
  let singles = createInitialState();
  let batched = createInitialState();
  for (let index = 0; index < GATES.length; index += 1) {
    const expanded = expandFixture(GATES[index].id);
    singles = replayFixture(singles, expanded, false);
    batched = replayFixture(batched, expanded, true);
    assert.deepEqual(batched, singles);
    singles = reduce(singles, { type: ACTIONS.NEXT_GATE });
    batched = reduce(batched, { type: ACTIONS.NEXT_GATE });
    assert.deepEqual(batched, singles);
  }
});

test("JSON replay, terminal no-ops and full restart preserve the campaign contract", () => {
  let direct = createInitialState();
  let serialized = JSON.parse(JSON.stringify(direct));

  for (let index = 0; index < GATES.length; index += 1) {
    const expanded = expandFixture(GATES[index].id);
    direct = replayFixture(direct, expanded, true);
    serialized = replayFixture(serialized, expanded, true);
    assert.deepEqual(serialized, direct);

    direct = reduce(direct, { type: ACTIONS.NEXT_GATE });
    serialized = reduce(
      JSON.parse(JSON.stringify(serialized)),
      { type: ACTIONS.NEXT_GATE }
    );
    assert.deepEqual(serialized, direct);
  }

  assert.equal(direct.phase, "complete");
  for (const action of [
    { type: ACTIONS.START },
    { type: ACTIONS.BEGIN_GATE },
    {
      type: ACTIONS.SET_HELD,
      playerId: "left",
      held: true,
      inputEpoch: direct.inputEpoch
    },
    { type: ACTIONS.TICK, count: 1 },
    { type: ACTIONS.RETRY_GATE },
    { type: ACTIONS.NEXT_GATE },
    { type: ACTIONS.CONTINUE }
  ]) {
    assert.equal(reduce(direct, action), direct);
  }

  const restarted = reduce(direct, { type: ACTIONS.RESTART });
  assert.equal(restarted.phase, "intro");
  assert.equal(restarted.gateIndex, 0);
  assert.equal(restarted.tick, 0);
  assert.deepEqual(restarted.completedGateIds, []);
  assert.equal(restarted.inputEpoch, direct.inputEpoch + 1);
  assert.equal(restarted.revision, direct.revision + 1);
  assert.deepEqual(restarted.content, direct.content);
  assertDeepFrozen(restarted);
});
