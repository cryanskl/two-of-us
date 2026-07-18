globalThis.CLOSER_CARDS_CONFIG = {
  aName: "A 席",
  bName: "B 席",
  firstSpeaker: "a",
  // 首版是固定六张的完整谈话仪式，请保持为 6。
  sessionSize: 6,

  // TODO：可以返回一张合法卡的 ID，让有私人意义的问题成为开场；保留 null 使用平衡随机。
  chooseOpeningCard({ cardIds, themeIds }) {
    void cardIds;
    void themeIds;
    return null;
  },
};
