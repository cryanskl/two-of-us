(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.SHADOW_DUET_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const seats = Object.freeze(["你", "TA"]);
  const composeCompletionNote = (summary) =>
    `${summary.seats[0]}和${summary.seats[1]}，六次定格以后，影子也记住了我们。`;
  Object.freeze(composeCompletionNote);
  return Object.freeze({
    seats,
    composeCompletionNote,
  });
});
