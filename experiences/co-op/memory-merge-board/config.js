"use strict";

(function exposeConfig(root, factory) {
  var api = factory();

  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MemoryMergeBoardConfig = api;
  }
})(typeof window === "object" ? window : null, function createConfig() {
  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
    ) {
      return value;
    }

    var visited = seen || new Set();
    if (visited.has(value)) {
      return value;
    }
    visited.add(value);

    Reflect.ownKeys(value).forEach(function freezeChild(key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    });

    return Object.freeze(value);
  }

  var SEATS = ["left", "right"];
  var DIRECTIONS = ["up", "right", "down", "left"];
  var THEMES = ["place", "taste", "sound", "care"];
  var TIERS = ["fragment", "moment", "story", "chapter"];
  var PHASES = ["slide", "share", "choose", "place", "won", "lost"];
  var LOSS_REASONS = ["blocked", "supply-exhausted"];

  var THEME_CONTENT = {
    place: {
      label: "地点",
      marker: "路标",
      prompt: "你们会把哪一次一起出发收进这里？"
    },
    taste: {
      label: "味道",
      marker: "蒸汽",
      prompt: "哪一种味道会让你立刻想到对方？"
    },
    sound: {
      label: "声音",
      marker: "声纹",
      prompt: "有没有一段声音，一听就像你们的某一天？"
    },
    care: {
      label: "照顾",
      marker: "缝线",
      prompt: "哪一次小小的照顾，让你觉得被放在心上？"
    }
  };

  var TIER_CONTENT = {
    fragment: "碎片",
    moment: "片段",
    story: "故事",
    chapter: "章节"
  };

  var DEFAULT_COPY = {
    title: "把小事，合成我们的故事",
    privacyNotice: "只说给身边的人听。页面不会录音、保存或上传你们的回答。",
    continueShare: "说好了，继续",
    leaveBlank: "这题先留白",
    blocked: "这一页暂时排不下了。你们可以从开头再整理一次。"
  };

  return deepFreeze({
    VERSION: 1,
    BOARD_ROWS: 3,
    BOARD_COLUMNS: 4,
    BOARD_SIZE: 12,
    TARGET_DISTINCT_CHAPTERS: 3,
    SEATS: SEATS,
    DIRECTIONS: DIRECTIONS,
    THEMES: THEMES,
    TIERS: TIERS,
    PHASES: PHASES,
    LOSS_REASONS: LOSS_REASONS,
    THEME_CONTENT: THEME_CONTENT,
    TIER_CONTENT: TIER_CONTENT,
    DEFAULT_COPY: DEFAULT_COPY
  });
});
