(function (root) {
  "use strict";

  const config = {
    recipient: "你",
    sender: "我",

    // 学习 TODO（可选）：把下面 9 行改成只属于你们的图案。
    // 每行必须精确包含 11 个字符，并且只能使用 . 和 #。
    // 9 行中 # 的总数必须在 16 到 72 之间。
    // 你可以画首字母、月亮、星星，或两个人约定的符号。
    // 不需要修改状态机、坐标、Canvas、Pointer 或计时逻辑。
    // 如果格式不合法，页面会整份安全回到默认心形。
    patternRows: [
      ".###...###.",
      "#####.#####",
      "###########",
      "###########",
      ".#########.",
      "..#######..",
      "...#####...",
      "....###....",
      ".....#.....",
    ],
    patternLabel: "一颗由雪花拼成的心",
    finalTitle: "雪停以后，是你",
    finalNote: "风停下来的时候，我还是最想把这句话留给你。",
  };

  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.SNOW_GLOBE_MESSAGE_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
