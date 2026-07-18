// 这份文件可以直接修改。保存后重新打开 index.html 即可生效。
globalThis.PAPER_SOCCER_CONFIG = {
  redName: "红方",
  blueName: "蓝方",
  firstPlayer: "red",

  // TODO（可选）：这里决定下一局谁开球。
  // 默认采用交替开球；也可以根据 winner / winReason 改成输家开球。
  chooseNextStarter({ previousStarter }) {
    return previousStarter === "red" ? "blue" : "red";
  },
};
