"use strict";

(function exposeDualMazeRaceConfig(root, factory) {
  var config = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = config;
  }
  if (root) {
    root.DUAL_MAZE_CONFIG = config;
  }
})(typeof window === "object" ? window : null, function createDualMazeRaceConfig() {
  var playerNames = Object.freeze(["玩家一", "玩家二"]);

  function composeMatchNote(summary) {
    void summary;
    return "同一条路，换个位置，再比一次。";
  }
  Object.freeze(composeMatchNote);

  return Object.freeze({
    defaultPlayerNames: playerNames,
    composeMatchNote: composeMatchNote
  });
});
