(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.SoftSumoConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: ["莓果", "海盐"],
    copy: {
      title: "软软相扑",
      subtitle: "推我可以，先站稳自己。",
      rule: "转向，按住，松开冲出去。",
      start: "开始第一轮",
      resume: "继续比赛",
      nextRound: "下一轮",
      restart: "再推一局",
      localOnly: "只在本机运行，刷新即重置。",
    },
  });

  function composeMatchNote(summary) {
    // TODO（可选）：用下面这些冻结字段，写 5–10 行只属于你们的赛后结语。
    const { isDraw, winnerIndex, playerNames, scores } = summary;
    void isDraw;
    void winnerIndex;
    void playerNames;
    void scores;
    return summary.defaultNote;
  }

  return deepFreeze({ DEFAULT_CONFIG, composeMatchNote });
});
