"use strict";

(function exposeFixtures(root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.TwinOrbitFixtures = api;
  }
})(typeof window === "object" ? window : null, function createFixtures() {
  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
    ) {
      return value;
    }

    var visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);

    Reflect.ownKeys(value).forEach(function freezeChild(key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    });
    return Object.freeze(value);
  }

  var GOLDEN_FIXTURES = deepFreeze([
    {
      id: "first-meeting",
      left: [["inner", 20], ["outer", 40]],
      right: [["outer", 30], ["inner", 30]]
    },
    {
      id: "trade-the-lead",
      left: [["outer", 30], ["inner", 30]],
      right: [["inner", 20], ["outer", 40]]
    },
    {
      id: "same-count",
      left: [["inner", 18], ["outer", 36], ["inner", 18]],
      right: [["outer", 18], ["inner", 36], ["outer", 18]]
    },
    {
      id: "long-way-left",
      left: [["inner", 24], ["outer", 60]],
      right: [["outer", 44], ["inner", 40]]
    },
    {
      id: "long-way-right",
      left: [["outer", 44], ["inner", 40]],
      right: [["inner", 24], ["outer", 60]]
    }
  ]);

  function validateRuns(runs) {
    return (
      Array.isArray(runs)
      && Object.getPrototypeOf(runs) === Array.prototype
      && runs.length > 0
      && runs.every(function validRun(run) {
        return (
          Array.isArray(run)
          && Object.getPrototypeOf(run) === Array.prototype
          && run.length === 2
          && (run[0] === "outer" || run[0] === "inner")
          && Number.isSafeInteger(run[1])
          && run[1] > 0
        );
      })
    );
  }

  function validateFixtures() {
    var ids = new Set();
    GOLDEN_FIXTURES.forEach(function validateFixture(fixture) {
      if (
        fixture === null
        || typeof fixture !== "object"
        || Object.getPrototypeOf(fixture) !== Object.prototype
        || Reflect.ownKeys(fixture).length !== 3
        || typeof fixture.id !== "string"
        || fixture.id.length === 0
        || ids.has(fixture.id)
        || !validateRuns(fixture.left)
        || !validateRuns(fixture.right)
      ) {
        throw new Error("invalid frozen twin-orbit fixture");
      }
      ids.add(fixture.id);
    });
  }

  function expandRuns(runs) {
    var expanded = [];
    runs.forEach(function expandRun(run) {
      for (var index = 0; index < run[1]; index += 1) {
        expanded.push(run[0]);
      }
    });
    return expanded;
  }

  function expandFixture(id) {
    if (typeof id !== "string") return null;
    var fixture = GOLDEN_FIXTURES.find(function hasId(candidate) {
      return candidate.id === id;
    });
    if (!fixture) return null;
    return deepFreeze({
      id: fixture.id,
      left: expandRuns(fixture.left),
      right: expandRuns(fixture.right)
    });
  }

  validateFixtures();

  return deepFreeze({
    GOLDEN_FIXTURES: GOLDEN_FIXTURES,
    expandFixture: expandFixture
  });
});
