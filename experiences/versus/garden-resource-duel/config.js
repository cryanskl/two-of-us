(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.GardenResourceDuelConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")
      || Object.isFrozen(value)) return value;

    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    title: "这一朵，我先养开",
    subtitle: "六张牌，六个季节。照料、保留，或者猜猜我这一手。",
    intro: "看当前季节需求，轮流遮屏藏一张有限手牌。匹配需求就长花瓣，虫害能挡住对方这一轮。",
    playerNames: ["你", "TA"],
    defaultWinNote: "这一朵先开了。下一局，换你读懂我的手。",
    defaultDrawNote: "这一轮，两朵刚好一起开。",
  });

  function composeResultNote(summary) {
    // 准备者可以按公开终局摘要返回一段纯文本；不要读取或保存未揭晓选择。
    return summary.defaultNote;
  }

  return deepFreeze({
    DEFAULT_CONFIG,
    composeResultNote,
  });
});
