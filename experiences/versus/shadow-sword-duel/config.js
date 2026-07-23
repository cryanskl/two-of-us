(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") {
    root.ShadowSwordConfig = api;
    if (!Object.prototype.hasOwnProperty.call(root, "SHADOW_SWORD_CONFIG")) {
      root.SHADOW_SWORD_CONFIG = api.DEFAULT_CONFIG;
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || Object.isFrozen(value)) {
      return value;
    }
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, seen);
      }
    }
    return Object.freeze(value);
  }

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: ["左席", "右席"],
    finalNote: "看懂对方之前，先藏好自己。",
  });

  return deepFreeze({ DEFAULT_CONFIG });
});
