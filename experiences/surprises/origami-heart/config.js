(function (root) {
  "use strict";

  const config = {
    recipientName: "给正在读这张纸的你",
    finalTitle: "这颗心，折给你",
    finalMessage: "有些话想慢一点说，所以先把它折好，再交到你手里。",
    signature: "一直站在你这边的人",
  };

  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.OrigamiHeartConfig = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
