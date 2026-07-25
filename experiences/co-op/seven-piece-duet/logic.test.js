"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

const geometry = require("./geometry.js");
const targets = require("./targets.js");
const modulePath = require.resolve("./logic.js");
const logic = require(modulePath);

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

function act(state, type, fields = {}) {
  return logic.transition(state, logic.createAction(state, type, fields));
}

function start() {
  return act(logic.createInitialState(), "START");
}

function moveToPose(state, pieceId, targetPose) {
  const piece = state.pieces.find(({ id }) => id === pieceId);
  let next = act(state, "SELECT", { seat: piece.owner, pieceId });
  for (let count = 0; count < Math.abs(targetPose.tx); count += 1) {
    next = act(next, "MOVE_DRAFT", {
      seat: piece.owner,
      dx: Math.sign(targetPose.tx),
      dy: 0
    });
  }
  for (let count = 0; count < Math.abs(targetPose.ty); count += 1) {
    next = act(next, "MOVE_DRAFT", {
      seat: piece.owner,
      dx: 0,
      dy: Math.sign(targetPose.ty)
    });
  }
  for (let count = 0; count < targetPose.quarterTurns; count += 1) {
    next = act(next, "ROTATE_DRAFT", {
      seat: piece.owner,
      direction: 1
    });
  }
  if (targetPose.flipped) {
    next = act(next, "FLIP_DRAFT", { seat: piece.owner });
  }
  return act(next, "COMMIT_DRAFT", { seat: piece.owner });
}

function completeCurrentRound(state) {
  const target = targets.getTargets()[state.roundIndex];
  let next = state;
  for (const pieceId of geometry.PIECE_IDS) {
    next = moveToPose(next, pieceId, target.solution[pieceId]);
  }
  return next;
}

test("exports the exact deeply frozen browser/CommonJS reducer contract", () => {
  assert.deepEqual(Object.keys(logic), [
    "createInitialState",
    "transition",
    "createAction",
    "getPublicView",
    "getCommittedCells",
    "canCommitDraft",
    "isRoundComplete",
    "replaySession"
  ]);
  assertDeepFrozen(logic);
  assert.equal(Object.hasOwn(globalThis, "SevenPieceDuetLogic"), false);

  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(require.resolve("./geometry.js"), "utf8"), sandbox);
  vm.runInNewContext(readFileSync(require.resolve("./targets.js"), "utf8"), sandbox);
  vm.runInNewContext(readFileSync(modulePath, "utf8"), sandbox);
  assert.deepEqual(
    Object.keys(sandbox.window.SevenPieceDuetLogic),
    Object.keys(logic)
  );
  assertDeepFrozen(sandbox.window.SevenPieceDuetLogic);
});

test("initial state is exact, isolated, frozen and owns the first schedule", () => {
  const first = logic.createInitialState();
  const second = logic.createInitialState();
  assert.deepEqual(first, {
    phase: "intro",
    roundIndex: 0,
    revision: 0,
    pieces: geometry.PIECE_IDS.map((id) => ({
      id,
      owner: geometry.PIECE_GROUPS.fine.includes(id) ? "A" : "B",
      committedPose: null
    })),
    drafts: { A: null, B: null },
    completedRounds: [],
    noticeSerial: 0,
    notice: null
  });
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  assertDeepFrozen(first);
});

test("actions require exact revisions, schemas and data descriptors", () => {
  const state = start();
  const valid = logic.createAction(state, "SELECT", {
    seat: "A",
    pieceId: "large-a"
  });
  assert.deepEqual(valid, {
    type: "SELECT",
    revision: state.revision,
    seat: "A",
    pieceId: "large-a"
  });
  assertDeepFrozen(valid);

  for (const invalid of [
    { ...valid, revision: state.revision - 1 },
    { ...valid, extra: true },
    { type: "MOVE_DRAFT", revision: state.revision, seat: "A", dx: 0, dy: 0 },
    { type: "ROTATE_DRAFT", revision: state.revision, seat: "A", direction: 0 },
    Object.assign(Object.create(null), valid),
    new Proxy(valid, {
      get() {
        throw new Error("must not read");
      }
    })
  ]) {
    assert.equal(logic.transition(state, invalid), state);
  }

  const accessor = {};
  let reads = 0;
  Object.defineProperties(accessor, {
    type: { enumerable: true, value: "START" },
    revision: {
      enumerable: true,
      get() {
        reads += 1;
        return state.revision;
      }
    }
  });
  assert.equal(logic.transition(state, accessor), state);
  assert.equal(reads, 0);
});

test("seat ownership, two drafts and board-origin cancellation are exact", () => {
  let state = start();
  const wrong = act(state, "SELECT", { seat: "B", pieceId: "large-a" });
  assert.equal(wrong.notice.code, "wrong-owner");
  assert.equal(wrong.pieces[0].committedPose, null);

  state = act(wrong, "SELECT", { seat: "A", pieceId: "large-a" });
  state = act(state, "SELECT", { seat: "B", pieceId: "large-b" });
  assert.equal(state.drafts.A.pieceId, "large-a");
  assert.equal(state.drafts.B.pieceId, "large-b");
  const same = act(state, "SELECT", { seat: "A", pieceId: "small-a" });
  assert.equal(same, state);

  state = act(state, "CANCEL_DRAFT", { seat: "B" });
  state = act(state, "COMMIT_DRAFT", { seat: "A" });
  const committed = state.pieces[0].committedPose;
  state = act(state, "SELECT", { seat: "A", pieceId: "large-a" });
  assert.equal(state.drafts.A.origin, "board");
  state = act(state, "CANCEL_DRAFT", { seat: "A" });
  assert.deepEqual(state.pieces[0].committedPose, committed);
});

test("draft movement, rotation and flip are bounded by piece rules", () => {
  let state = start();
  state = act(state, "SELECT", { seat: "A", pieceId: "small-a" });
  const beforeInvalidFlip = state;
  assert.equal(act(state, "FLIP_DRAFT", { seat: "A" }), beforeInvalidFlip);
  state = act(state, "MOVE_DRAFT", { seat: "A", dx: -1, dy: 1 });
  state = act(state, "ROTATE_DRAFT", { seat: "A", direction: -1 });
  assert.deepEqual(state.drafts.A.pose, {
    tx: -1,
    ty: 1,
    quarterTurns: 3,
    flipped: false
  });

  state = act(state, "CANCEL_DRAFT", { seat: "A" });
  state = act(state, "SELECT", { seat: "B", pieceId: "parallelogram" });
  state = act(state, "FLIP_DRAFT", { seat: "B" });
  assert.equal(state.drafts.B.pose.flipped, true);
});

test("invalid commits clear only their draft with stable reason priority", () => {
  let state = start();
  state = moveToPose(
    state,
    "large-a",
    targets.getTargetById("embrace").solution["large-a"]
  );
  state = act(state, "SELECT", { seat: "A", pieceId: "small-a" });
  const overlap = act(state, "COMMIT_DRAFT", { seat: "A" });
  assert.equal(overlap.notice.code, "overlap");
  assert.equal(overlap.notice.conflictPieceId, "large-a");
  assert.equal(overlap.drafts.A, null);

  state = act(overlap, "SELECT", { seat: "A", pieceId: "small-a" });
  for (let index = 0; index < 8; index += 1) {
    state = act(state, "MOVE_DRAFT", { seat: "A", dx: 1, dy: 0 });
  }
  const outside = act(state, "COMMIT_DRAFT", { seat: "A" });
  assert.equal(outside.notice.code, "out-of-bounds");
  assert.equal(outside.notice.conflictPieceId, null);
});

test("golden standard solutions complete four rounds and alternate groups", () => {
  let state = start();
  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    assert.equal(state.roundIndex, roundIndex);
    const schedule = targets.getRoundSchedule()[roundIndex];
    for (const piece of state.pieces) {
      const expectedOwner = geometry.PIECE_GROUPS.fine.includes(piece.id)
        ? schedule.fineSeat
        : schedule.boldSeat;
      assert.equal(piece.owner, expectedOwner);
    }
    state = completeCurrentRound(state);
    assert.equal(
      state.phase,
      roundIndex === 3 ? "match-complete" : "round-complete"
    );
    assert.equal(logic.isRoundComplete(state), true);
    if (roundIndex < 3) state = act(state, "NEXT_ROUND");
  }
  assert.deepEqual(state.completedRounds, [
    "embrace",
    "side-by-side",
    "echo",
    "interlock"
  ]);
});

test("strict JSON replay reaches the same match and rejects no-op logs", () => {
  let state = logic.createInitialState();
  const actions = [];
  function record(type, fields = {}) {
    const action = logic.createAction(state, type, fields);
    const next = logic.transition(state, action);
    assert.notEqual(next, state);
    actions.push(action);
    state = next;
  }
  record("START");
  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    const target = targets.getTargets()[roundIndex];
    for (const pieceId of geometry.PIECE_IDS) {
      const piece = state.pieces.find(({ id }) => id === pieceId);
      const targetPose = target.solution[pieceId];
      record("SELECT", { seat: piece.owner, pieceId });
      for (let count = 0; count < Math.abs(targetPose.tx); count += 1) {
        record("MOVE_DRAFT", {
          seat: piece.owner,
          dx: Math.sign(targetPose.tx),
          dy: 0
        });
      }
      for (let count = 0; count < Math.abs(targetPose.ty); count += 1) {
        record("MOVE_DRAFT", {
          seat: piece.owner,
          dx: 0,
          dy: Math.sign(targetPose.ty)
        });
      }
      for (let count = 0; count < targetPose.quarterTurns; count += 1) {
        record("ROTATE_DRAFT", { seat: piece.owner, direction: 1 });
      }
      if (targetPose.flipped) record("FLIP_DRAFT", { seat: piece.owner });
      record("COMMIT_DRAFT", { seat: piece.owner });
    }
    if (roundIndex < 3) record("NEXT_ROUND");
  }
  const clonedLog = JSON.parse(JSON.stringify(actions));
  assert.deepEqual(logic.replaySession(clonedLog), state);
  assert.throws(
    () => logic.replaySession([
      { type: "START", revision: 99 }
    ]),
    RangeError
  );
});

test("restart preserves monotonic revision while resetting authoritative gameplay", () => {
  const playing = start();
  const restarted = act(playing, "RESTART_MATCH");
  const initial = logic.createInitialState();
  assert.equal(restarted.revision, playing.revision + 1);
  assert.equal(restarted.noticeSerial, playing.noticeSerial + 1);
  assert.deepEqual(
    { ...restarted, revision: 0, noticeSerial: 0 },
    initial
  );
  assert.equal(
    logic.transition(restarted, {
      type: "START",
      revision: initial.revision
    }),
    restarted
  );
});

test("malformed state fails closed without inspecting hostile inputs", () => {
  let stateReads = 0;
  const hostileState = new Proxy({}, {
    get() {
      stateReads += 1;
      throw new Error("must not read malformed state");
    }
  });
  let actionReads = 0;
  const hostileAction = new Proxy({}, {
    get() {
      actionReads += 1;
      throw new Error("must not read hostile action");
    }
  });
  const recovered = logic.transition(hostileState, hostileAction);
  assert.deepEqual(recovered, logic.createInitialState());
  assert.equal(stateReads, 0);
  assert.equal(actionReads, 0);

  const view = logic.getPublicView(hostileState);
  assertDeepFrozen(view);
  assert.doesNotMatch(JSON.stringify(view), /solution/u);
});

test("production logic is free of DOM, network, storage, random and clocks", () => {
  const source = readFileSync(modulePath, "utf8");
  for (const forbidden of [
    /\bdocument\b/u,
    /\bfetch\b/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bMath\.random\b/u,
    /\bDate\b/u,
    /\bperformance\b/u
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});
