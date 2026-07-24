(function (root) {
  "use strict";

  const config = {
    playerNames: ["你", "TA"],
  };

  if (typeof module === "object" && module && module.exports) module.exports = config;
  if (root && typeof root === "object") root.HEART_CATAPULT_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
