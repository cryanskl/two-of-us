import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../shared/portal-filters.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);

const { filterExperiences, pickRandom } = context.PortalFilters;
const experiences = [
  { id: "letter", level: "A", category: "surprise", featured: true },
  { id: "garden", level: "A", category: "co-op" },
  { id: "race", level: "C", category: "versus", featured: true },
];

test("portal filters combine level and category selections", () => {
  assert.deepEqual(
    filterExperiences(experiences, { level: "A", category: "co-op" }).map(({ id }) => id),
    ["garden"],
  );
  assert.equal(filterExperiences(experiences, { level: "all", category: "versus" }).length, 1);
  assert.equal(filterExperiences(experiences, { level: "D", category: "all" }).length, 0);
});

test("portal featured filter narrows to opted-in experiences only", () => {
  assert.deepEqual(
    filterExperiences(experiences, { featured: "featured" }).map(({ id }) => id),
    ["letter", "race"],
  );
  assert.deepEqual(
    filterExperiences(experiences, { featured: "featured", category: "versus" }).map(({ id }) => id),
    ["race"],
  );
  assert.equal(filterExperiences(experiences, { featured: "all" }).length, 3);
  assert.equal(filterExperiences(experiences).length, 3);
});

test("portal random selection is deterministic at collection boundaries", () => {
  assert.equal(pickRandom(experiences, () => 0).id, "letter");
  assert.equal(pickRandom(experiences, () => 0.999999).id, "race");
  assert.equal(pickRandom([], () => 0), null);
});
