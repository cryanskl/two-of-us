(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.MoonBasePowerConfig = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeCompletionNote(summary) {
    // TODO：根据三次交接写一段你们自己的值班结语。
    // 你可以读取双方称呼、班次 ID、稳定 tick 与联络传输量。
    // 只返回一段 1–160 字的纯文本，不要修改 summary。
    // 留着下面这行也能直接游玩，并会使用安全的默认结语。
    return summary.defaultNote;
  }

  return Object.freeze({
    powerOperatorName: "电源席",
    loadOperatorName: "负载席",
    completionTitle: "三次交接，月面没有熄灯",
    composeCompletionNote,
  });
});
