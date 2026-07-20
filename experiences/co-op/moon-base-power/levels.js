(function (root, factory) {
  "use strict";

  const levels = factory();
  if (typeof module === "object" && module.exports) module.exports = levels;
  if (root) root.MoonBasePowerLevels = levels;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return deepFreeze([
    {
      id: "daylight",
      number: 1,
      title: "日照接班",
      note: "联络线维护中，请让两条母线各自承担合适的负载。",
      supply: { L: 3, R: 5 },
      demand: { oxygen: 4, lights: 1, comms: 3 },
      allowedBuses: {
        oxygen: ["L", "R"],
        lights: ["L", "R"],
        comms: ["L", "R"],
      },
      tieRequirement: "off",
      transferCapacity: 2,
    },
    {
      id: "shadow",
      number: 2,
      title: "影区接班",
      note: "供给换到了另一侧，联络线仍在维护中。",
      supply: { L: 5, R: 3 },
      demand: { oxygen: 4, lights: 1, comms: 3 },
      allowedBuses: {
        oxygen: ["L", "R"],
        lights: ["L", "R"],
        comms: ["L", "R"],
      },
      tieRequirement: "off",
      transferCapacity: 2,
    },
    {
      id: "earth-window",
      number: 3,
      title: "地月窗口",
      note: "氧气与照明各有一侧插口受损，请让联络线真正送出电力。",
      supply: { L: 4, R: 4 },
      demand: { oxygen: 5, lights: 1, comms: 2 },
      allowedBuses: {
        oxygen: ["R"],
        lights: ["L"],
        comms: ["L", "R"],
      },
      tieRequirement: "transfer",
      transferCapacity: 2,
    },
  ]);
});
