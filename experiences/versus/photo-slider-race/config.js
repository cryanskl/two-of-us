(function exposePhotoSliderRaceConfig(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.PhotoSliderRaceConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPhotoSliderRaceConfig() {
  "use strict";

  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
      || Object.isFrozen(value)
    ) return value;

    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    }
    return Object.freeze(value);
  }

  const PLAYER_IDS = deepFreeze(["left", "right"]);
  const DIRECTIONS = deepFreeze(["up", "left", "down", "right"]);
  const SOURCE_KINDS = deepFreeze(["builtin", "local"]);
  const SOURCE_STATUSES = deepFreeze(["ready", "loading", "error"]);
  const SOURCE_ERROR_CODES = deepFreeze([
    "unsupported-type",
    "file-too-large",
    "dimensions-too-small",
    "dimensions-too-large",
    "unsupported-browser",
    "decode-failed",
    "encode-failed",
  ]);

  const DEFAULT_CONFIG = deepFreeze({
    title: "同一张，谁先拼回",
    subtitle: "同一张回忆，同一个乱序。三、二、一——开拼。",
    playerLabels: ["左边的你", "右边的你"],
    inputHint: "方向键表示空格移动方向。",
    privacyNotice: "照片只在当前页面处理，不上传，也不保存。",
    rightsNotice: "请选择你自己拍摄、已获授权或有权使用的照片。",
  });

  const DEFAULT_SOURCE_METADATA = deepFreeze({
    kind: "builtin",
    status: "ready",
    generation: 0,
    errorCode: null,
  });

  return deepFreeze({
    PLAYER_IDS,
    DIRECTIONS,
    SOURCE_KINDS,
    SOURCE_STATUSES,
    SOURCE_ERROR_CODES,
    DEFAULT_CONFIG,
    DEFAULT_SOURCE_METADATA,
  });
});
