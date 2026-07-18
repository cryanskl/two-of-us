(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.LIGHT_TRAIL_HUNT_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeMatchResult(view) {
    // TODO（欢迎你来改）：把下面 5 行换成只属于你们的赛后文案。
    const names = Array.isArray(view?.playerNames) ? view.playerNames : ["玩家 1", "玩家 2"];
    const scores = Array.isArray(view?.scores) ? view.scores : [0, 0];
    if (scores[0] === scores[1]) return `边界未定，${names[0]}与${names[1]}平分了这片光。`;
    const winner = scores[0] > scores[1] ? 0 : 1;
    return `${names[winner]}留住了最后一段光轨。`;
  }

  return Object.freeze({
    playerNames: Object.freeze(["小满", "阿昼"]),
    grid: Object.freeze({ columns: 48, rows: 32 }),
    tickMs: 100,
    countdownMs: 2400,
    maxFrameGapMs: 500,
    maxRounds: 3,
    targetScore: 2,
    copy: Object.freeze({
      title: "光轨围猎",
      intro: "别追光，去改写它的边界。",
      start: "开始围猎",
      nextRound: "下一轮",
      restart: "重新比赛",
    }),
    composeMatchResult,
  });
});
