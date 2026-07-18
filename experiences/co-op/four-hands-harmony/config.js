(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.FOUR_HANDS_HARMONY_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeHarmonyMessage(view) {
    // TODO（欢迎你来改）：把下面 5 行换成只属于你们的合奏留言。
    const completed = Array.isArray(view && view.completed) ? view.completed.length : 0;
    const lowName = view && view.lowSeat ? view.lowSeat.name : "左边的你";
    const highName = view && view.highSeat ? view.highSeat.name : "右边的你";
    if (completed < 5) return `${lowName} 和 ${highName} 已经合好 ${completed} 次，再靠近一点点。`;
    return "不是谁跟上谁，是我们愿意在同一刻停下来。";
  }

  function deepFreeze(value) {
    if ((!value || typeof value !== "object") && typeof value !== "function") return value;
    if (Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return deepFreeze({
    lowSeatName: "左边的你",
    highSeatName: "右边的你",
    intro: "你接住低音，我接住高音。五次同时落下，就把这一小段合在一起。",
    finalTitle: "这一拍，刚好和你",
    finalMessage: "不是谁跟上谁，是我们愿意在同一刻停下来。",
    signature: "留给我们",
    composeHarmonyMessage,
  });
});
