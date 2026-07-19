(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.FutureCookieNotesConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    title: "三枚以后，都是我们",
    subtitle: "敲开三枚未来签，把三个小约定拼成一封邀请。",
    intro: "有三个以后，我先替我们收好了。你想先打开哪一枚？",
    readyTitle: "三个以后，都到齐了。",
    finalTitle: "这不是预言，是我想和你兑现的以后。",
    // TODO（欢迎你来改）：把下面三段约定、结语和署名换成你们真正想兑现的以后。
    notes: {
      when: "下一个不赶时间的周末",
      where: "去一条我们都没走过的街",
      together: "慢慢吃，慢慢逛，再拍一张新的合照",
    },
    closing: "只要你愿意，我们就挑一天出发。",
    signature: "—— 一直想和你去的人",
    privacy: "这三段只在本机页面中使用，刷新即重置。",
  });

  function composeInvitation(notes) {
    // TODO（可选）：只改下面几行纯文本组合方式；不要加入网络、随机数或浏览器存储。
    const when = notes && typeof notes.when === "string" ? notes.when : DEFAULT_CONFIG.notes.when;
    const where = notes && typeof notes.where === "string" ? notes.where : DEFAULT_CONFIG.notes.where;
    const together = notes && typeof notes.together === "string"
      ? notes.together
      : DEFAULT_CONFIG.notes.together;
    return `${when}，我们${where}，${together}。`;
  }

  return deepFreeze({ DEFAULT_CONFIG, composeInvitation });
});
