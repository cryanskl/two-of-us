import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");

const {
  MAX_FILE_SIZE,
  validateFileMetadata,
  assessPanoramaDimensions,
} = globalThis.PANORAMA_MEMORY_LOGIC;

test("JPEG、PNG 和 WebP 的有效文件元数据会通过", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const checked = validateFileMetadata({ type, size: 8 * 1024 * 1024 });
    assert.equal(checked.ok, true);
    assert.equal(checked.code, "ok");
  }
});

test("空文件、超大文件、非法大小和其他类型有稳定错误码", () => {
  assert.equal(validateFileMetadata({ type: "image/jpeg", size: 0 }).code, "empty-file");
  assert.equal(validateFileMetadata({ type: "image/png", size: MAX_FILE_SIZE + 1 }).code, "file-too-large");
  assert.equal(validateFileMetadata({ type: "image/jpeg", size: Number.NaN }).code, "invalid-file-size");
  assert.equal(validateFileMetadata({ type: "image/gif", size: 100 }).code, "unsupported-type");
});

test("2:1 以及 1.9 和 2.1 的比例边界会通过", () => {
  assert.equal(assessPanoramaDimensions({ width: 4096, height: 2048 }).ok, true);
  assert.equal(assessPanoramaDimensions({ width: 3800, height: 2000 }).ok, true);
  assert.equal(assessPanoramaDimensions({ width: 4200, height: 2000 }).ok, true);
});

test("越界比例和无效尺寸会拒绝", () => {
  assert.equal(assessPanoramaDimensions({ width: 1899, height: 1000 }).code, "invalid-aspect-ratio");
  assert.equal(assessPanoramaDimensions({ width: 2101, height: 1000 }).code, "invalid-aspect-ratio");
  assert.equal(assessPanoramaDimensions({ width: 0, height: 1000 }).code, "invalid-dimensions");
  assert.equal(assessPanoramaDimensions({ width: 2000.5, height: 1000 }).code, "invalid-dimensions");
});

test("小尺寸仅提醒，不阻塞加载", () => {
  const assessed = assessPanoramaDimensions({ width: 1600, height: 800 });
  assert.equal(assessed.ok, true);
  assert.equal(assessed.code, "low-resolution");
  assert.deepEqual(assessed.warnings.map((warning) => warning.code), ["low-resolution"]);
});

test("大尺寸先提醒，超过 8192×4096 才拒绝", () => {
  const large = assessPanoramaDimensions({ width: 6000, height: 3000 });
  assert.equal(large.ok, true);
  assert.equal(large.code, "high-resolution");
  assert.equal(assessPanoramaDimensions({ width: 8192, height: 4096 }).ok, true);
  assert.equal(assessPanoramaDimensions({ width: 8194, height: 4096 }).code, "dimensions-too-large");
});
