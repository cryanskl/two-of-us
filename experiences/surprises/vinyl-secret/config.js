(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module && module.exports) module.exports = config;
  if (root && typeof root === "object") root.VINYL_SECRET_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value) {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value);
    }
    return Object.freeze(value);
  }

  return deepFreeze({
    recipientName: "给你",
    finalEyebrow: "SIDE US · PRIVATE PRESSING",
    finalTitle: "这一张，想一直和你听下去",
    finalMessage:
      "谢谢你把三段声音都找到。没有播放出来的部分，也已经被我们一起走过的日子填满。",
    signature: "留给愿意把针落在这里的你",
    tracks: [
      {
        id: "first-chat",
        targetGroove: 3,
        clue: "先从外圈找起，那里像我们第一次把话说慢。",
        note: "我最想重播的，不是哪一首歌，是第一次和你聊到忘记时间。",
        audioSrc: null,
      },
      {
        id: "ordinary-day",
        targetGroove: 7,
        clue: "下一段在唱片中间，像普通日子忽然发亮。",
        note: "后来我才发现，最安静的日子也会因为你有了旋律。",
        audioSrc: null,
      },
      {
        id: "many-tomorrows",
        targetGroove: 11,
        clue: "最后一段靠近标签，留给还没发生的以后。",
        note: "唱片会转到尽头，但我还想和你一起听很多个以后。",
        audioSrc: null,
      },
    ],
  });
});
