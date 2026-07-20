(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.CLOUD_RECIPE_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，往后的雨，也一起调成喜欢的颜色。`;
  }

  Object.freeze(composeCompletionNote.prototype);
  Object.freeze(composeCompletionNote);

  return Object.freeze({
    seats: Object.freeze(["你", "我"]),
    composeCompletionNote,
  });
});
