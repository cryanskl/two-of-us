(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.CONSTELLATION_RELAY_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  return Object.freeze({
    seats: Object.freeze({ a: "你", b: "TA" }),
    completionNote: "这十次交接，刚好把同一束星光送到了彼此手里。",
  });
});
