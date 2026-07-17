window.FUTURE_TICKET_CONFIG = Object.freeze({
  passenger: "给最想同行的你",
  issuer: "由我全程负责",
  finalNote: "出发那天，记得把我也带上。",
  serial: "A 02 240624",
  groups: [
    {
      id: "when",
      label: "什么时候出发",
      prompt: "第一孔 · 什么时候出发？",
      options: ["周五下班后", "周六午后", "一个不设闹钟的早晨"],
    },
    {
      id: "where",
      label: "去哪里",
      prompt: "第二孔 · 想把方向交给哪一格？",
      options: ["去看晚霞", "去吃一顿热汤", "去没有走过的街区"],
    },
    {
      id: "bonus",
      label: "随行彩蛋",
      prompt: "第三孔 · 再带上一点什么？",
      options: ["我负责路线", "你负责选歌", "留一小时给未知"],
    },
  ],
});
