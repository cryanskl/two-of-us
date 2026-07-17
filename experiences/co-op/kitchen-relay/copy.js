(function (root, factory) {
  "use strict";
  root.KITCHEN_RELAY_COPY = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // TODO（可由你改写）：这几行决定每次接取后的共同语气。
  // 约束：不点名责怪任何角色；正确、接错、漏接必须能一眼区分。
  function describeServiceEvent(event, ingredientName) {
    if (!event) return "左边选食材，右边把盘子移到同一条滑槽。";
    if (event.type === "correct") return `${ingredientName} 接稳了，继续下一样。`;
    if (event.type === "wrong") return `盘子接稳了，但 ${ingredientName} 还不是下一样。`;
    if (event.type === "missed") return `${ingredientName} 滑过去了，这次没落进盘里。`;
    if (event.type === "dispatched") return `${ingredientName} 已经出发，盘子快去接它。`;
    return "两边准备好，下一样继续配合。";
  }

  return Object.freeze({ describeServiceEvent });
});
