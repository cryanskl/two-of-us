(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.SEVEN_DAY_GARDEN_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，把七天的水、光和修剪，慢慢养成了同一朵花。`;
  }

  Object.freeze(composeCompletionNote.prototype);
  Object.freeze(composeCompletionNote);

  return Object.freeze({
    seats: Object.freeze(["你", "我"]),
    composeCompletionNote,
  });
});
