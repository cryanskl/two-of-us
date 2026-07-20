(function (root, factory) {
  "use strict";

  const levels = factory();
  if (typeof module === "object" && module.exports) module.exports = levels;
  if (root) root.FOG_NAVIGATION_LEVELS = levels;
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
      id: "mist-pine-slope",
      title: "雾松坡",
      navigatorSeat: 0,
      landmarks: { A: "松果牌", B: "蓝风铃" },
      critical: { cell: [5, 4], safe: "right", decoy: "left", arrival: "up" },
      safeDistance: 22,
      rows: [
        "#############",
        "#####S#######",
        "#####.#######",
        "#####.#######",
        "#H.........A#",
        "###########.#",
        "###########.#",
        "#G....B.....#",
        "#############",
      ],
    },
    {
      id: "wind-chime-lane",
      title: "风铃巷",
      navigatorSeat: 1,
      landmarks: { A: "月牙石", B: "纸风车" },
      critical: { cell: [5, 4], safe: "down", decoy: "up", arrival: "left" },
      safeDistance: 13,
      rows: [
        "#############",
        "#####H......#",
        "#####.#######",
        "#####.#######",
        "#S....#######",
        "#####.#######",
        "#####.#######",
        "#####...A.BG#",
        "#############",
      ],
    },
    {
      id: "moss-light-shore",
      title: "苔光岸",
      navigatorSeat: 0,
      landmarks: { A: "萤石堆", B: "小木桥" },
      critical: { cell: [7, 4], safe: "left", decoy: "right", arrival: "down" },
      safeDistance: 22,
      rows: [
        "#############",
        "#.....B....G#",
        "#.###########",
        "#.###########",
        "#A.........H#",
        "#######.#####",
        "#######.#####",
        "#######S#####",
        "#############",
      ],
    },
    {
      id: "home-lantern-terrace",
      title: "归灯台",
      navigatorSeat: 1,
      landmarks: { A: "白羽标", B: "暖灯亭" },
      critical: { cell: [6, 4], safe: "up", decoy: "down", arrival: "right" },
      safeDistance: 13,
      rows: [
        "#############",
        "#GBA...######",
        "######.######",
        "######.######",
        "######.....S#",
        "######.######",
        "######.######",
        "#.....H######",
        "#############",
      ],
    },
  ]);
});
