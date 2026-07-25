(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: ["左方", "右方"],
    copy: {
      title: "这一弹，拐弯见你",
      subtitle: "读懂折射，躲开来弹，先命中三次。",
      start: "开始对战",
      resume: "继续对战",
      restart: "再来一局",
      localOnly: "只在本机运行，刷新即重置。",
    },
  });

  return deepFreeze({ DEFAULT_CONFIG });
});
