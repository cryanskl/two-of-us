(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.SIGNAL_REPAIR_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeTransmission(view) {
    // TODO（欢迎你来改）：把下面 4 行改成只属于你们的最终传输。
    const fragments = Array.isArray(view?.transmissionFragments)
      ? view.transmissionFragments.filter((entry) => typeof entry === "string")
      : [];
    if (fragments.length !== 4) return "传输还没有完整，再接回一段吧。";
    return fragments.join("");
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return deepFreeze({
    northName: "北席",
    southName: "南席",
    transmissionFragments: [
      "原来每次信号微弱时，",
      "都是你还在另一端回应。",
      "以后也请继续和我说话，",
      "我会一直把你接回来。",
    ],
    composeTransmission,
  });
});
