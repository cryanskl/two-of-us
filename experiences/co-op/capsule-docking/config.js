(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.CAPSULE_DOCKING_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  return Object.freeze({
    seats: Object.freeze(["你", "TA"]),
    composeCompletionNote(summary) {
      return `${summary.seats[0]}和${summary.seats[1]}，转一点，推一点，终于把这一程稳稳接回家。`;
    },
  });
});
