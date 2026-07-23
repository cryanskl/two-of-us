(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  root.HoneycombPassageConfig = api;

  // 准备者可以直接修改这两个纯文本字段，不能在这里改变游戏规则。
  root.HONEYCOMB_PASSAGE_CONFIG = api.DEFAULT_CONFIG;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_PLAYER_NAMES = ["蜜黄", "暮紫"];
  const DEFAULT_FINAL_NOTE = "绕一点路，也还是会在对面相逢。";
  const CONFIG_KEYS = ["playerNames", "finalNote"];
  const PLAYER_NAMES_KEYS = ["0", "1", "length"];

  function deepFreeze(value, seen) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")
      || Object.isFrozen(value)) return value;

    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);

    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) deepFreeze(descriptor.value, visited);
    }
    return Object.freeze(value);
  }

  function readExactRecord(value, expectedKeys) {
    try {
      if (value === null || typeof value !== "object"
        || Object.getPrototypeOf(value) !== Object.prototype) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== expectedKeys.length
        || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) return null;

      const result = {};
      for (const key of expectedKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        result[key] = descriptor.value;
      }
      return result;
    } catch (_error) {
      return null;
    }
  }

  function readPlayerNames(value) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
      const keys = Reflect.ownKeys(value);
      if (keys.length !== PLAYER_NAMES_KEYS.length
        || keys.some((key) => typeof key !== "string" || !PLAYER_NAMES_KEYS.includes(key))) return null;
      if (value.length !== 2) return null;

      const first = Object.getOwnPropertyDescriptor(value, "0");
      const second = Object.getOwnPropertyDescriptor(value, "1");
      if (!first || !second || !Object.hasOwn(first, "value") || !Object.hasOwn(second, "value")) return null;
      return [first.value, second.value];
    } catch (_error) {
      return null;
    }
  }

  function hasIsolatedSurrogate(value) {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xD800 && code <= 0xDBFF) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xDC00 && next <= 0xDFFF)) return true;
        index += 1;
      } else if (code >= 0xDC00 && code <= 0xDFFF) {
        return true;
      }
    }
    return false;
  }

  function cleanText(value, minimum, maximum) {
    if (typeof value !== "string"
      || /[\u0000-\u001F\u007F-\u009F]/u.test(value)
      || hasIsolatedSurrogate(value)) return null;
    const cleaned = value.trim();
    const length = [...cleaned].length;
    return length >= minimum && length <= maximum ? cleaned : null;
  }

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: [...DEFAULT_PLAYER_NAMES],
    finalNote: DEFAULT_FINAL_NOTE,
  });

  function sanitizeConfig(value) {
    if (value === undefined) return DEFAULT_CONFIG;
    try {
      const record = readExactRecord(value, CONFIG_KEYS);
      if (!record) return DEFAULT_CONFIG;

      const rawNames = readPlayerNames(record.playerNames);
      const cleanedNames = rawNames ? rawNames.map((name) => cleanText(name, 1, 12)) : null;
      const namesAreValid = cleanedNames
        && cleanedNames.every((name) => name !== null)
        && cleanedNames[0] !== cleanedNames[1];
      const finalNote = cleanText(record.finalNote, 1, 80);

      return deepFreeze({
        playerNames: namesAreValid ? [...cleanedNames] : [...DEFAULT_PLAYER_NAMES],
        finalNote: finalNote === null ? DEFAULT_FINAL_NOTE : finalNote,
      });
    } catch (_error) {
      return DEFAULT_CONFIG;
    }
  }

  return deepFreeze({
    DEFAULT_CONFIG,
    sanitizeConfig,
  });
});
