(function (root) {
  "use strict";

  const config = {
    recipient: "你",
    finalTitle: "愿每一个以后，都有我们",
    finalMessage:
      "这些愿望不是今天才有。只是今晚，我把它们一盏一盏点亮，想认真交给你。",
    signature: "——一直想和你走下去的我",
    candles: [
      {
        id: "rain",
        label: "那场雨",
        cue: "先从我们都没带伞的那天开始",
        wish: "愿以后的雨天，我们还愿意把伞往对方那边多偏一点。",
      },
      {
        id: "noodle",
        label: "深夜面馆",
        cue: "下一盏，留给那碗把疲惫慢慢赶走的热汤",
        wish: "愿再晚的夜，我们也有一张桌子可以坐下来好好说话。",
      },
      {
        id: "journey",
        label: "第一次远行",
        cue: "再想想那次第一次一起走到陌生地方",
        wish: "愿每一段陌生的路，因为并肩走着，都慢慢变成值得记住的地方。",
      },
      {
        id: "quiet",
        label: "安静并肩",
        cue: "这一盏属于不用说话也很安心的时刻",
        wish: "愿我们不只分享热闹，也能在安静里好好陪着彼此。",
      },
      {
        id: "home",
        label: "回家以后",
        cue: "最后，把光留给每一次一起回家的以后",
        wish: "愿以后推开门的时候，我们总能先看见彼此，再看见一天的疲惫。",
      },
    ],
  };

  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.CANDLE_WISHES_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
