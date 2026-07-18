(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.MOVING_HOME_TOGETHER_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeMovingHomeMessage(view) {
    // TODO（欢迎你来改）：用下面 5 行写一段只属于你们的新家落款。
    const stage = view && view.route ? view.route.stage : 0;
    const leftName = view && view.names ? view.names.left : "左边的你";
    const rightName = view && view.names ? view.names.right : "右边的你";
    if (stage < 2) return `${leftName} 和 ${rightName} 已经把家搬到第 ${stage + 1} 段。`;
    return view && typeof view.finalMessage === "string" ? view.finalMessage : "家放稳了。难的从来不是那道门，是我们愿意一起慢一点。";
  }

  function deepFreeze(value, seen) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    if (Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  return deepFreeze({
    leftName: "左边的你",
    rightName: "右边的你",
    intro: "左边握住左端，右边握住右端。一起给方向，沙发才会动；同向往前，错开一点就能转弯。",
    finalTitle: "家放稳了",
    finalMessage: "家放稳了。难的从来不是那道门，是我们愿意一起慢一点。",
    signature: "留给一起安家的我们",
    composeMovingHomeMessage,
  });
});
