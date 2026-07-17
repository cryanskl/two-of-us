(function (root, factory) {
  "use strict";
  root.NUMBER_TARGET_COPY = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PLAYER_NAMES = Object.freeze(["珊瑚方", "蓝方"]);

  // TODO（可由你改写）：这 5–10 行决定每局结算的语气。
  // 约束：平局保持中性；胜者只描述距离，不评价聪明、数学能力或关系。
  function describeRound(result) {
    if (!result || result.winner === null) {
      return "两边离靶心一样近，这一局各自守住一分。";
    }
    const name = PLAYER_NAMES[result.winner];
    return result.exact[result.winner]
      ? `${name} 正中靶心，本局得 1 分。`
      : `${name} 离靶心更近，本局得 1 分。`;
  }

  return Object.freeze({ describeRound });
});
