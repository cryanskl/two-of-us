(function (root) {
  "use strict";

  function deepFreeze(value) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  root.MOON_PHASE_SECRET_CONFIG = deepFreeze({
    targetDate: "2024-05-20",
    recipientName: "给你",
    finalTitle: "原来月亮也记得",
    finalMessage: "那一天之后，普通的日子也开始有了坐标。",
    clues: [
      "春天快走到尾声的时候。",
      "把两双手的手指都数一遍。",
      "月光已经越过半圆，正走向圆满。",
    ],

    // TODO：这是留给准备者的 5–10 行线索策略；返回三条私人线索或 null。
    composeClues({ targetDate, targetPhaseIndex, targetPhaseName, baseClues }) {
      // 可以结合季节、共同场景和一句只有彼此懂的话重排线索。
      // 不建议直接返回日期数字，否则会失去校准谜题的意义。
      // context 和其中的 baseClues 已冻结，请复制后再调整。
      void targetDate;
      void targetPhaseIndex;
      void targetPhaseName;
      void baseClues;
      return null;
    },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
