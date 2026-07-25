"use strict";

(function exposeConfig(root, factory) {
  var config = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }

  if (root) {
    root.KALEIDOSCOPE_NAMES_CONFIG = config;
  }
})(typeof window === "object" ? window : null, function createConfig() {
  return {
    publicTitle: "把名字折成同一束光",
    publicInstructions: "读两条线索，选折面、转相位，让两项都对齐。",
    foldHint: "示例线索：把折面调到一周里周末之前的那一天数。",
    phaseHint: "示例线索：让刻度停在钟面十一点的位置。",
    targetFolds: 5,
    targetPhase: 22,
    marks: ["光", "影"],
    finalTitle: "原来我们一直在同一束光里",
    finalMessage: "角度不同，折回来时，还是在这里遇见。",
    signature: "来自准备这枚小镜子的人"
  };
});
