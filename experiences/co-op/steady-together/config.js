(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.STEADY_TOGETHER_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeSteadyMessage(view) {
    // TODO（欢迎你来改）：用下面 5 行写一段只属于你们的并肩赠语。
    const reached = view && view.journey && Array.isArray(view.journey.reachedCheckpoints) ? view.journey.reachedCheckpoints.length : 0;
    const leftName = view && view.names ? view.names.left : "左边的你";
    const rightName = view && view.names ? view.names.right : "右边的你";
    if (reached < 2) return `${leftName} 和 ${rightName} 已经一起走过 ${reached} 处灯。`;
    return view && typeof view.finalMessage === "string" ? view.finalMessage : "不是从来不摇晃，是每次偏离时，我们都愿意把彼此接回来。";
  }

  function deepFreeze(value) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    if (Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return deepFreeze({
    leftName: "左边的你",
    rightName: "右边的你",
    intro: "托住两端，把滚珠稳在中央，我们才会一起向前。",
    finalTitle: "稳稳地，和你一起向前",
    finalMessage: "不是从来不摇晃，是每次偏离时，我们都愿意把彼此接回来。",
    signature: "留给并肩走的我们",
    composeSteadyMessage,
  });
});
