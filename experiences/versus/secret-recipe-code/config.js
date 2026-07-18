(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.SecretRecipeCodeConfig = api;
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
    title: "藏好这一味",
    subtitle: "你藏四味，我用七次慢慢猜到。",
    intro: "每人各藏一次四格配方。猜中得越快，越先尝到胜利；同位是配料和位置都对，有料是配料对了但位置不对。",
    playerNames: ["你", "TA"],
    ingredientText: {
      berry: { label: "红莓", description: "微酸，醒得快" },
      citrus: { label: "柑橘", description: "明亮，先闻见" },
      mint: { label: "薄荷", description: "清凉，留得久" },
      cocoa: { label: "可可", description: "温厚，慢慢化" },
      honey: { label: "蜂蜜", description: "柔甜，黏住余味" },
      salt: { label: "海盐", description: "清醒，托住其他味道" },
    },
    defaultMatchNote: "两份配方都揭开了，今晚的胜负留在这一杯里。",
  });

  function composeMatchNote(summary) {
    // TODO（准备者可选，5–10 行）：按平局、胜者或一试命中返回纯文本结语。
    return summary.defaultNote;
  }

  return deepFreeze({ DEFAULT_CONFIG, composeMatchNote });
});
