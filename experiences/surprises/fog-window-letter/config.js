(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.FOG_WINDOW_LETTER_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_MESSAGE = "你刚才写下的每一笔，都让窗外更亮了一点。想说的话没有被风吹走，它一直在这里等你。";

  function composeFogWindowLetter(view) {
    // TODO（欢迎你来改）：用下面 5–10 行，按笔画数、形态或完成方式写一句私人结语。
    const fallback = view && typeof view.defaultMessage === "string" ? view.defaultMessage : DEFAULT_MESSAGE;
    const strokeCount = view && Number.isInteger(view.strokeCount) ? view.strokeCount : 0;
    const drawingShape = view && typeof view.drawingShape === "string" ? view.drawingShape : "none";
    const completionReason = view && view.completionReason === "traced" ? "traced" : "direct";
    void strokeCount; void drawingShape; void completionReason;
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
    title: "在雾上，写给你",
    subtitle: "先写下一点什么，再沿着它，把窗外慢慢擦亮。",
    intro: "不用写得好看。一个字、一颗星，或者只有我们懂的符号，都可以。",
    startButton: "开始写",
    confirmButton: "就写到这里",
    clearButton: "清空重写",
    directButton: "不方便手写，直接打开",
    tracingInstruction: "沿刚才的笔迹再走一遍，露珠亮起的地方，就是你已经找回的路。",
    pauseButton: "先停一下",
    resumeButton: "继续写给你",
    completionTitle: "窗外亮了",
    defaultMessage: DEFAULT_MESSAGE,
    signature: "留给愿意再走一遍的你",
    restartButton: "再写一次",
    composeFogWindowLetter,
  });
});
