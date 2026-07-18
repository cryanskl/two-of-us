// 这份文件可以直接修改。保存后重新打开 index.html 即可生效。
globalThis.DOTS_AND_BOXES_CONFIG = {
  playerNames: ["朱方", "蓝方"],

  // TODO（可选，适合准备惊喜的人填写）：
  // 这里只改变终局标题和正文，不会改变分数、赢家或规则。
  // winnerIndex 为 0 / 1，平局时为 null。
  // playerNames 和 scores 都是只读快照。
  // 返回 { title, body } 可换成你们之间的语气。
  // 不想定制时保留 null，页面会使用内置中性文案。
  composeResult({ winnerIndex, playerNames, scores }) {
    void winnerIndex;
    void playerNames;
    void scores;
    return null;
  },
};
