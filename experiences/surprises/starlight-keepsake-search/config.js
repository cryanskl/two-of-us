(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.STARLIGHT_KEEPSAKE_SEARCH_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_MESSAGE = "你找到的不是散落的东西，是我们把普通日子过成故事的证据。以后天再黑一点，也没关系，我们已经知道怎样把彼此照亮。";

  function composeStarlightLetter(view) {
    // TODO（欢迎准备者来改）：用下面 5–10 行，按最后找到的小物或发现顺序写一句私人结尾。
    const fallback = view && typeof view.defaultMessage === "string" ? view.defaultMessage : DEFAULT_MESSAGE;
    const foundLabels = view && Array.isArray(view.foundLabels) ? view.foundLabels : [];
    const lastFoundLabel = view && typeof view.lastFoundLabel === "string" ? view.lastFoundLabel : null;
    const completionReason = view && view.completionReason === "search" ? "search" : "direct";
    void foundLabels; void lastFoundLabel; void completionReason;
    return fallback;
  }

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    if (Object.isFrozen(value)) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  return deepFreeze({
    title: "把夜晚照成我们",
    subtitle: "有些小事藏在暗处，等你慢一点，把光停在它们身上。",
    intro: "提起这盏灯，找找房间里留下的五点微光。看见以后别急着走，停一会儿，它才会记住你。",
    startButton: "提起灯",
    directButton: "不方便寻找，直接点亮",
    searchInstruction: "拖动或移动光心，在微微发亮的地方停一下。方向键也可以移动，Home 回到中央。",
    pauseButton: "先把灯放下",
    resumeButton: "再提起灯",
    foundTitle: "已经亮起",
    completionTitle: "原来，光一直在这里",
    defaultMessage: DEFAULT_MESSAGE,
    signature: "留给愿意慢一点看见我的你",
    restartButton: "再照一次",
    keepsakes: [
      { id: "k1", label: "那张车票", note: "原来期待一件事，也可以从和你一起出发开始。" },
      { id: "k2", label: "两只杯子", note: "平常的清晨，因为多了一只杯子，就有了名字。" },
      { id: "k3", label: "没拍完的照片", note: "有些瞬间不够端正，却刚好是我们。" },
      { id: "k4", label: "放在一起的钥匙", note: "从某一天起，回来不再只是回到一个地方。" },
      { id: "k5", label: "窗边那颗星", note: "最晚亮起的那颗，也一直没有错过我们。" },
    ],
    composeStarlightLetter,
  });
});
