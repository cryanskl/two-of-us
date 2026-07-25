(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.PenguinFlagDuelConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: ["左左", "右右"],
    copy: {
      title: "企鹅冰原夺旗",
      subtitle: "抢到旗只是开始，带回家才算得分。",
      start: "开始比赛",
      restart: "再抢一局",
      resume: "继续比赛",
      localOnly: "只在本机运行，刷新即重置。",
    },
  });

  return deepFreeze({ DEFAULT_CONFIG });
});
