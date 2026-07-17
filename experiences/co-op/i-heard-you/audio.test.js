import assert from "node:assert/strict";
import test from "node:test";
import { mergeChunks, recordingLevel, resampleTo16k, TARGET_SAMPLE_RATE } from "./audio.js";

test("PCM chunks merge in order without sharing caller buffers", () => {
  const first = new Float32Array([0.1, 0.2]);
  const merged = mergeChunks([first, new Float32Array(), new Float32Array([0.3])]);
  assert.deepEqual(merged, new Float32Array([0.1, 0.2, 0.3]));
  first[0] = 1;
  assert.notEqual(merged[0], 1);
});

test("48 kHz input is averaged to exact 16 kHz length", () => {
  const input = new Float32Array(48_000).fill(0.5);
  const output = resampleTo16k(input, 48_000);
  assert.equal(output.length, TARGET_SAMPLE_RATE);
  assert.ok(output.every((sample) => Math.abs(sample - 0.5) < 1e-6));
});

test("resampler caps output at twelve seconds and validates rate", () => {
  assert.equal(resampleTo16k(new Float32Array(48_000 * 20), 48_000).length, 16_000 * 12);
  assert.throws(() => resampleTo16k(new Float32Array([1]), 0), TypeError);
  assert.equal(resampleTo16k(new Float32Array(), 48_000).length, 0);
});

test("recording level is normalized and bounded", () => {
  assert.equal(recordingLevel(new Float32Array()), 0);
  assert.equal(recordingLevel(new Float32Array([0, 0])), 0);
  assert.ok(recordingLevel(new Float32Array([0.1, -0.1])) > 0);
  assert.equal(recordingLevel(new Float32Array([1, -1])), 1);
});
