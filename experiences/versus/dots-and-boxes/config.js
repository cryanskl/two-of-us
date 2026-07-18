(function (root) {
  "use strict";

  function deepFreeze(value) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  // 这份配置可以直接修改。保存后重新打开 index.html 即可生效。
  root.DOTS_AND_BOXES_CONFIG = deepFreeze({
    playerNames: ["朱方", "蓝方"],

    // TODO（可选）：这是留给准备者的 5–10 行终局语气策略。
    // winnerIndex 为 0 / 1，平局时为 null；名字与分数都是只读快照。
    // 这里只能改变结果措辞，不能改变分数、赢家、回合或棋盘。
    // 返回合法的 { title, body } 可换成你们之间的语气。
    // 返回 null 或非法内容会继续使用内置中性文案。
    composeResult({ winnerIndex, playerNames, scores }) {
      void winnerIndex;
      void playerNames;
      void scores;
      return null;
    },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
