import assert from "node:assert/strict";
import test from "node:test";
import { advance, createSession, prompts } from "./logic.js";

test("two-round session requires record, transcript, edit, and confirmation", () => {
  let state = createSession();
  state = advance(state, { type: "BEGIN" });
  state = advance(state, { type: "START_RECORDING" });
  state = advance(state, { type: "STOP_RECORDING" });
  state = advance(state, { type: "TRANSCRIBED", text: "  第一句  " });
  state = advance(state, { type: "EDIT_DRAFT", text: "第一句，改好了" });
  state = advance(state, { type: "CONFIRM" });
  assert.equal(state.phase, "handoff");
  assert.equal(state.roundIndex, 1);
  assert.deepEqual(state.confirmed, ["第一句，改好了", ""]);

  state = advance(state, { type: "ACCEPT_HANDOFF" });
  state = advance(state, { type: "START_RECORDING" });
  state = advance(state, { type: "STOP_RECORDING" });
  state = advance(state, { type: "TRANSCRIBED", text: "第二句" });
  state = advance(state, { type: "CONFIRM" });
  assert.equal(state.phase, "complete");
  assert.deepEqual(state.confirmed, ["第一句，改好了", "第二句"]);
});

test("empty transcript returns to ready and private text is bounded", () => {
  let state = advance(createSession(), { type: "BEGIN" });
  state = advance(state, { type: "START_RECORDING" });
  state = advance(state, { type: "STOP_RECORDING" });
  state = advance(state, { type: "TRANSCRIBED", text: "   " });
  assert.equal(state.phase, "ready");
  assert.match(state.error, /没有听清/);

  state = advance(state, { type: "START_RECORDING" });
  state = advance(state, { type: "STOP_RECORDING" });
  state = advance(state, { type: "TRANSCRIBED", text: "爱".repeat(260) });
  assert.equal(state.draft.length, 200);
});

test("invalid actions never skip recording or reveal the first sentence early", () => {
  const initial = createSession();
  assert.equal(advance(initial, { type: "CONFIRM" }), initial);
  assert.equal(advance(initial, { type: "TRANSCRIBED", text: "偷跑" }), initial);
  assert.equal(prompts.length, 2);
  assert.ok(Object.isFrozen(initial.confirmed));
});

test("recording failures become recoverable without retaining a draft", () => {
  let state = advance(createSession(), { type: "BEGIN" });
  state = advance(state, { type: "START_RECORDING" });
  state = advance(state, { type: "FAIL", message: "麦克风被占用。" });
  assert.equal(state.phase, "error");
  assert.equal(state.draft, "");
  state = advance(state, { type: "RETRY" });
  assert.equal(state.phase, "ready");
  assert.equal(state.error, null);
});
