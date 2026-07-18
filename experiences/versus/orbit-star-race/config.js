// 这份文件可以直接修改。保存后重新打开 index.html 即可生效。
globalThis.ORBIT_STAR_RACE_CONFIG = {
  playerNames: ["朱方", "蓝方"],

  // TODO（可选）：在这里改写终局语气；返回 null 会使用内置中性文案。
  composeResult({ winnerIndex, playerNames, scores, sharedClaims }) {
    void winnerIndex;
    void playerNames;
    void scores;
    void sharedClaims;
    return null;
  },
};
