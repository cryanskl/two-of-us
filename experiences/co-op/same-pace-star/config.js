(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.SAME_PACE_STAR_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeSamePaceMessage(view) {
    // TODO（欢迎你来改）：用下面 5 行写一段只属于你们的接光留言。
    const completed = Array.isArray(view && view.completed) ? view.completed.length : 0;
    const leftName = view && view.seats ? view.seats.left.name : "左边的你";
    const rightName = view && view.seats ? view.seats.right.name : "右边的你";
    if (completed < 6) return `${leftName} 和 ${rightName} 已经接好 ${completed} 颗星。`;
    return view && typeof view.finalMessage === "string" ? view.finalMessage : "不是谁追上谁，是我们都愿意为对方停一下。";
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
    intro: "轮流把星光收起、交给对方，再一起放开。",
    finalTitle: "慢一点，也和你一起",
    finalMessage: "不是谁追上谁，是我们都愿意为对方停一下。",
    signature: "留给我们的夜晚",
    composeSamePaceMessage,
  });
});
