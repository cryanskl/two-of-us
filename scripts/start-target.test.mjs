import assert from "node:assert/strict";
import test from "node:test";
import { parseExperienceId, resolveExperienceUrl } from "./start-target.mjs";

function entry(overrides = {}) {
  const value = {
    id: "i-heard-you",
    title: "我听见你了",
    category: "co-op",
    level: "D",
    players: "2 人合作",
    devices: "单设备",
    entry: "experiences/co-op/i-heard-you/index.html",
    readme: "experiences/co-op/i-heard-you/README.md",
    description: "测试作品",
    installed: true,
    networkRequired: false,
    ...overrides,
  };
  if (!Object.hasOwn(overrides, "readme")) {
    value.readme = value.entry.replace(/index\.html$/, "README.md");
  }
  return value;
}

function catalog(...experiences) {
  return { schemaVersion: 1, experiences };
}

test("experience launcher parses one stable ID and rejects paths", () => {
  assert.equal(parseExperienceId(["--no-open"]), null);
  assert.equal(parseExperienceId(["--experience", "i-heard-you"]), "i-heard-you");
  assert.throws(() => parseExperienceId(["--experience"]), /合法/);
  assert.throws(() => parseExperienceId(["--experience", "../secret"]), /合法/);
});

test("experience launcher resolves only installed catalog entries", () => {
  const data = catalog(
    entry(),
    entry({
      id: "later",
      title: "以后",
      level: "B",
      entry: "experiences/co-op/later/index.html",
      installed: false,
    }),
  );
  assert.equal(
    resolveExperienceUrl(data, "http://127.0.0.1:4173/", "i-heard-you"),
    "http://127.0.0.1:4173/experiences/co-op/i-heard-you/index.html",
  );
  assert.equal(resolveExperienceUrl(data, "http://127.0.0.1:4173/", null), "http://127.0.0.1:4173/");
  assert.throws(() => resolveExperienceUrl(data, "http://127.0.0.1:4173/", "later"), /找不到/);
});

test("experience launcher rejects non-HTTP bases and exact-entry origin/path escapes", () => {
  const safe = catalog(entry());
  for (const localUrl of [
    "https://localhost:4173/", "file:///tmp/", "javascript:alert(1)",
    "http://localhost:4173/sub/", "http://localhost:4173/?next=1", "not a url",
  ]) {
    assert.throws(() => resolveExperienceUrl(safe, localUrl, "i-heard-you"), /地址/);
  }

  const invalidEntries = [
    "https://example.com/index.html",
    "//example.com/index.html",
    "experiences/co-op/i-heard-you\\index.html",
    "experiences/co-op/../i-heard-you/index.html",
    "experiences/co-op/i-heard-you/index.html?next=1",
    "experiences/co-op/i-heard-you/index.html#fragment",
    "experiences/co-op/%69-heard-you/index.html",
    "experiences/co-op/other/index.html",
  ];
  for (const unsafeEntry of invalidEntries) {
    assert.throws(
      () => resolveExperienceUrl(catalog(entry({ entry: unsafeEntry })),
        "http://127.0.0.1:4173/", "i-heard-you"),
      /入口/,
    );
  }
  for (const invalidId of ["Upper-Case", "under_score", "two..dots", "-leading"] ) {
    assert.throws(
      () => resolveExperienceUrl(catalog(entry({ id: invalidId })),
        "http://127.0.0.1:4173/", invalidId),
      /id|入口/,
    );
  }
});
