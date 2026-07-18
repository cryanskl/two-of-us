globalThis.PAPER_PLANE_MAIL_CONFIG = {
  recipientName: "亲爱的你",
  senderName: "一直想把话寄给你的人",
  letterTitle: "这封信，终于飞到了",
  letterLines: [
    "有些话，放在心里太久，就想认真寄到你手上。",
    "谢谢你让平常的日子，也有了值得期待的方向。",
  ],
  signOff: "下一段路，也想继续和你一起走。",

  // TODO：这里最适合写成你们之间才懂的提示；返回 1–100 字即可。
  hintForMiss({ attemptNumber, missReason }) {
    if (attemptNumber >= 3) return "邮差密语：20°、70 格是一条稳妥航线。";
    if (missReason === "short") return "还差一点点，再给它多一点勇气。";
    if (missReason === "low") return "擦到邮箱下沿了，把机头稍稍抬高。";
    return "它飞得太高啦，把机头压低一点。";
  },
};
