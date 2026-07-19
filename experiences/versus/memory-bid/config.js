(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.MemoryBidConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || Object.isFrozen(value)) return value;
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    title: "这一串，我还记得",
    subtitle: "看过八件旧物，再把记得的数量报得更高。",
    intro: "四轮里，你们各先开价两次。最高报价的人按顺序证明；全对自己得分，错一件或认输则对方得分。",
    playerNames: ["你", "TA"],
    itemText: {
      ticket: { label: "旧车票", description: "去过的地方，留下一道缺口" },
      camera: { label: "小相机", description: "把一秒钟收进镜头" },
      shell: { label: "海边贝壳", description: "带回一小段潮声" },
      key: { label: "房间钥匙", description: "住过一晚的门牌记忆" },
      mug: { label: "搪瓷杯", description: "清晨一起喝过的热气" },
      map: { label: "折叠地图", description: "绕远也算旅程的一部分" },
    },
    defaultMatchNote: "四串旧物都收好了，今晚谁记得更多，也留一点给彼此慢慢想起。",
  });

  function composeMatchNote(summary) {
    // TODO（准备者可选，5–10 行）：按胜者或平局返回一段纯文本结语。
    return summary.defaultNote;
  }

  return deepFreeze({ DEFAULT_CONFIG, composeMatchNote });
});
