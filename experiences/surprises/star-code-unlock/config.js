globalThis.STAR_CODE_UNLOCK_CONFIG = {
  recipientName: "亲爱的你",
  introCopy: "三条只有你知道的答案，会让星图说出一句话。",
  clues: [
    {
      id: "late-night-seat",
      prompt: "那次聊到很晚，我们坐在哪里？",
      acceptedAnswers: ["窗边", "靠窗的位置"],
      starId: "s03",
      successCopy: "窗边那颗星记住了那晚的声音。",
      rescueCopy: "记忆偶尔会走远，让星盘替你找回这一颗。",
    },
    {
      id: "first-sea-sky",
      prompt: "第一次一起去看海，天空是什么时候的颜色？",
      acceptedAnswers: ["日落", "傍晚", "黄昏"],
      starId: "s09",
      successCopy: "日落落进星盘，第二段坐标已经对齐。",
      rescueCopy: "那天的颜色没有消失，只是暂时躲进了星盘。",
    },
    {
      id: "before-goodbye",
      prompt: "每次分别前，我们最常说的两个字是什么？",
      acceptedAnswers: ["回家", "到家"],
      starId: "s12",
      successCopy: "最后一颗星收到了那句熟悉的叮嘱。",
      rescueCopy: "最后一段路，让星盘替我们记得。",
    },
  ],
  secretWords: ["答案", "一直", "是你"],
  revealTitle: "星图最后指向你",
  revealLines: [
    "我们一起记住的地方、颜色和叮嘱，原来一直连在同一张星图上。",
    "谢谢你让普通的夜晚，也有了值得反复辨认的坐标。",
  ],
  signOff: "往后的每一程，也想继续一起校准。",
  senderName: "一直和你看同一片天的人",

  // TODO：这里适合换成你们之间才懂的提示语，保持返回 1–100 字即可。
  hintAfterMiss({ clueIndex, wrongCount }) {
    const firstHints = ["想想我们当时离窗有多近。", "想想海面变成金色的时候。", "想想我总担心你路上太晚。"];
    const secondHints = ["答案和座位的位置有关。", "答案不是天气，而是一天里的时刻。", "答案和分别后的那段路有关。"];
    return (wrongCount === 1 ? firstHints : secondHints)[clueIndex];
  },
};
