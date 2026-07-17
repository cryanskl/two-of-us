import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { loadCatalog } from "./catalog.js";

test("catalog exposes an installed A-level Love Tree", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const loveTree = catalog.experiences.find((item) => item.id === "love-tree");

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(loveTree.level, "A");
  assert.equal(loveTree.installed, true);
  assert.equal(loveTree.networkRequired, false);
});

test("catalog exposes the installed B-level panorama memory experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const panorama = catalog.experiences.find((item) => item.id === "panorama-memory");

  assert.equal(panorama.level, "B");
  assert.equal(panorama.networkRequired, false);
  assert.match(panorama.entry, /panorama-memory\/index\.html$/);
});

test("catalog exposes the installed A-level private photo puzzle", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const puzzle = catalog.experiences.find((item) => item.id === "photo-swap-puzzle");

  assert.equal(puzzle.level, "A");
  assert.equal(puzzle.networkRequired, false);
  assert.match(puzzle.entry, /photo-swap-puzzle\/index\.html$/);
});

test("catalog exposes the installed C-level sealed compatibility quiz", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const quiz = catalog.experiences.find((item) => item.id === "compatibility-quiz");

  assert.equal(quiz.category, "co-op");
  assert.equal(quiz.level, "C");
  assert.equal(quiz.networkRequired, false);
  assert.match(quiz.entry, /compatibility-quiz\/index\.html$/);
});

test("catalog exposes the installed A-level ribbon tug", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const ribbonTug = catalog.experiences.find((item) => item.id === "ribbon-tug");

  assert.equal(ribbonTug.category, "versus");
  assert.equal(ribbonTug.level, "A");
  assert.equal(ribbonTug.networkRequired, false);
  assert.match(ribbonTug.entry, /ribbon-tug\/index\.html$/);
});

test("every installed catalog entry points to a local file", async () => {
  const root = new URL("../../", import.meta.url);
  const catalog = await loadCatalog(root);

  await Promise.all(
    catalog.experiences
      .filter((item) => item.installed)
      .map((item) => access(new URL(item.entry, root))),
  );
});
