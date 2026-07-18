globalThis.CLOSER_CARDS_CONFIG = {
  aName: "A 席",
  bName: "B 席",
  firstSpeaker: "a",
  sessionSize: 6,

  // TODO：可以返回一张合法卡的 ID，让有私人意义的问题成为开场；保留 null 使用平衡随机。
  chooseOpeningCard({ cardIds, themeIds }) {
    void cardIds;
    void themeIds;
    return null;
  },
};
