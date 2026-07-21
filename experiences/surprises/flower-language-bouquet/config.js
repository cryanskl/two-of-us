(function (root) {
  "use strict";

  const config = {
    recipient: "给最特别的你",
    sender: "总想把好事都留给你的人",
    finalTitle: "这束花，替我把心意放在这里",

    // 学习 TODO（可选）：只改引号里的纯文字，就能把花束写成你们自己的故事。
    // finalNote 最多三行；需要换行时请在字符串里使用 \n。
    // 六段 meaning 会按收礼者选择花朵的先后顺序组成最终花语。
    // 不需要修改花朵 id、数组顺序、状态机、SVG 或保存逻辑。
    // 这些句子是私人表达，不是权威花语或植物学结论。
    finalNote: "不用等某个特别的日子，我也想把认真、明亮和长久，都一枝一枝送给你。",
    flowers: [
      { id: "rose", name: "玫瑰", meaning: "偏爱这件事，我一直很认真" },
      { id: "tulip", name: "郁金香", meaning: "和你在一起，平常也值得期待" },
      { id: "daisy", name: "雏菊", meaning: "喜欢你让我放心做自己的样子" },
      { id: "sunflower", name: "向日葵", meaning: "有你在的方向，总会更明亮" },
      { id: "lisianthus", name: "洋桔梗", meaning: "温柔不是偶然，是我想给你的日常" },
      { id: "gypsophila", name: "满天星", meaning: "小小的好，都想和你慢慢攒起来" },
    ],
  };

  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.FLOWER_LANGUAGE_BOUQUET_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
