globalThis.HAND_CRANK_MUSIC_BOX_CONFIG = {
  recipientName: "给你",
  finalTitle: "这段路，想和你慢慢走",
  finalMessage: "谢谢你把这首小小的旋律转到最后。",

  // TODO：这是留给准备者的 5–10 行旋律策略；返回 8–16 个合法 note ID。
  composeMotif({ availableNoteIds, defaultMotif }) {
    // 可用音：c5 / d5 / e5 / f5 / g5 / a5 / c6 / d6。
    // 你可以从 availableNoteIds 取音并重排，也可以基于 defaultMotif 做变化。
    // 例如先复制默认动机，再替换其中 2–3 个音，保留一段熟悉的轮廓。
    // 返回 null 会继续使用仓库内置的原创动机；非法返回值也会安全回退。
    void availableNoteIds;
    void defaultMotif;
    return null;
  },
};
