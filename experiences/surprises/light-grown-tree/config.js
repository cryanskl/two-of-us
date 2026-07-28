globalThis.LIGHT_GROWN_TREE_CONFIG = {
  // 完成后称呼对方的方式。
  recipientName: "给你",

  // 最后展开的标题。
  finalTitle: "你把光放在哪，它就长到哪",

  // 信的正文，一行一句，最多 8 行。
  letterLines: [
    "这棵树没有预设的样子。",
    "它长成现在这样，是因为你把光带到了这些地方。",
    "我们大概也是这样长起来的。",
  ],

  // 落款。
  signature: "—— 种树的人",

  // 在一起的起点。留 null 就不显示相守时间。
  // 可写 "2019-04-20"，也可以精确到时刻："2019-04-20T20:15:00"。
  togetherSince: null,

  // TODO：这是留给准备者的 5–10 行提示策略。
  // 每长完一节会调用一次，返回一句 40 字以内的短提示显示在页面上。
  // 返回 null 使用仓库内置的六句；返回非字符串、空串或抛出异常都会安全回退，
  // 不会影响生长，也不会挡住最后的信。
  composeGrowthNote({ stepIndex, totalSteps }) {
    // 例如：只在最后三节换成你自己的话。
    // if (stepIndex > totalSteps - 3) return "再长一点点就好了。";
    void stepIndex;
    void totalSteps;
    return null;
  },
};
