(function (global) {
  "use strict";

  global.ECHO_ARENA_CONFIG = Object.freeze({
    aName: "A 席",
    bName: "B 席",
    firstPlayer: "a",

    // TODO（可选，适合亲手写 5–10 行）：返回 do / mi / sol / la，
    // 就能按局数或先手安排你们的私密开场动机；返回 null 则每局随机。
    chooseOpeningNote({ gameNumber, starter, noteIds }) {
      void gameNumber;
      void starter;
      void noteIds;
      return null;
    },
  });
})(globalThis);
