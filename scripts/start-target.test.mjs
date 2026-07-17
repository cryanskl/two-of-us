import assert from "node:assert/strict";
import test from "node:test";
import { parseExperienceId, resolveExperienceUrl } from "./start-target.mjs";

test("experience launcher parses one stable ID and rejects paths", () => {
  assert.equal(parseExperienceId(["--no-open"]), null);
  assert.equal(parseExperienceId(["--experience", "i-heard-you"]), "i-heard-you");
  assert.throws(() => parseExperienceId(["--experience"]), /合法/);
  assert.throws(() => parseExperienceId(["--experience", "../secret"]), /合法/);
});

test("experience launcher resolves only installed catalog entries", () => {
  const catalog = {
    experiences: [
      { id: "i-heard-you", entry: "experiences/co-op/i-heard-you/index.html", installed: true },
      { id: "later", entry: "experiences/later/index.html", installed: false },
    ],
  };
  assert.equal(
    resolveExperienceUrl(catalog, "http://localhost:4173/", "i-heard-you"),
    "http://localhost:4173/experiences/co-op/i-heard-you/index.html",
  );
  assert.equal(resolveExperienceUrl(catalog, "http://localhost:4173/", null), "http://localhost:4173/");
  assert.throws(() => resolveExperienceUrl(catalog, "http://localhost:4173/", "later"), /找不到/);
});
