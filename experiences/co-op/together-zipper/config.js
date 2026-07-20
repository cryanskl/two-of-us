(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.TOGETHER_ZIPPER_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，往后的日子，也把两边慢慢拉成我们。`;
  }

  Object.freeze(composeCompletionNote.prototype);
  Object.freeze(composeCompletionNote);

  return Object.freeze({
    seats: Object.freeze(["你", "我"]),
    composeCompletionNote,
  });
});
