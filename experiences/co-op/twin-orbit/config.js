"use strict";

(function exposeConfig(root, factory) {
  var config = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }

  if (root) {
    root.TWIN_ORBIT_CONFIG = config;
  }
})(typeof window === "object" ? window : null, function createConfig() {
  return {
    leftName: "左边",
    rightName: "右边",
    introTitle: "这一圈，和你同时到",
    introMessage: "按住变快，松开变慢。让两颗星在同一拍穿过各自的门。",
    completeTitle: "这一圈，我们同时到了",
    completeMessage: "快一点，慢一点，最后还是在同一拍遇见。",
    signature: "给一起绕完这五圈的我们"
  };
});
