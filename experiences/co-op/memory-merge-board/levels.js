"use strict";

(function exposeLevels(root, factory) {
  var sourceConfig =
    typeof module === "object" && module && module.exports
      ? require("./config.js")
      : root && root.MemoryMergeBoardConfig;
  var api = factory(sourceConfig);

  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MemoryMergeBoardLevels = api;
  }
})(typeof window === "object" ? window : null, function createLevels(config) {
  if (!config || !Object.isFrozen(config)) {
    throw new Error("memory-merge-board levels require frozen config");
  }

  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
    ) {
      return value;
    }
    var visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    Reflect.ownKeys(value).forEach(function freezeChild(key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    });
    return Object.freeze(value);
  }

  function tile(theme, tier) {
    return { theme: theme, tier: tier };
  }

  function slide(direction) {
    return { type: "SLIDE", direction: direction };
  }

  function share() {
    return { type: "CONTINUE_SHARE" };
  }

  function choose(candidateIndex) {
    return { type: "CHOOSE_CANDIDATE", candidateIndex: candidateIndex };
  }

  function place(boardIndex) {
    return { type: "PLACE", boardIndex: boardIndex };
  }

  function goldenPath(initialDirection, firstPlacement) {
    return [
      slide(initialDirection),
      share(),
      share(),
      choose(0),
      place(firstPlacement),
      slide("up"),
      choose(0),
      place(8),
      slide("up"),
      choose(0),
      place(8),
      slide("right"),
      choose(0),
      place(0),
      slide("right"),
      choose(0),
      place(4),
      slide("left"),
      choose(0),
      place(3),
      slide("up"),
      choose(0),
      place(8),
      slide("up"),
      choose(0),
      place(8),
      slide("right"),
      share()
    ];
  }

  var LEVELS = [
    {
      id: "first-page",
      title: "第一页",
      description: "先整理两个现成章节，再一起补完第三段声音。",
      initialBoard: [
        tile("place", 2), tile("place", 2), null, null,
        tile("taste", 2), tile("taste", 2), null, null,
        tile("sound", 2), null, null, null
      ],
      initialCandidates: ["sound", "care"],
      supply: ["sound", "sound", "sound", "care", "place", "taste"],
      targetDistinctChapters: 3,
      initialOrganizer: "left",
      hintPath: goldenPath("right", 0)
    },
    {
      id: "crossed-notes",
      title: "交错的便笺",
      description: "两列旧故事可以先归档，再为照顾线索留出合成路线。",
      initialBoard: [
        tile("place", 2), null, tile("taste", 2), null,
        tile("place", 2), null, tile("taste", 2), null,
        null, tile("care", 2), null, null
      ],
      initialCandidates: ["care", "sound"],
      supply: ["care", "care", "care", "sound", "place", "taste"],
      targetDistinctChapters: 3,
      initialOrganizer: "left",
      hintPath: goldenPath("up", 8)
    },
    {
      id: "album-night",
      title: "相册之夜",
      description: "先收好声音与照顾，再共同补完最后一段地点故事。",
      initialBoard: [
        tile("sound", 2), null, tile("care", 2), null,
        tile("sound", 2), null, tile("care", 2), null,
        null, null, tile("place", 2), null
      ],
      initialCandidates: ["place", "taste"],
      supply: ["place", "place", "place", "taste", "sound", "care"],
      targetDistinctChapters: 3,
      initialOrganizer: "left",
      hintPath: goldenPath("up", 8)
    }
  ];

  function validateThemeList(value, expectedLength) {
    return (
      Array.isArray(value)
      && Object.getPrototypeOf(value) === Array.prototype
      && (expectedLength === undefined || value.length === expectedLength)
      && value.every(function validTheme(theme) {
        return config.THEMES.indexOf(theme) !== -1;
      })
    );
  }

  function validateLevelDefinitions() {
    var ids = new Set();
    if (LEVELS.length !== 3) {
      throw new Error("memory-merge-board requires exactly three levels");
    }
    LEVELS.forEach(function validateLevel(level) {
      if (
        typeof level.id !== "string"
        || level.id.length === 0
        || ids.has(level.id)
        || typeof level.title !== "string"
        || level.title.length === 0
        || typeof level.description !== "string"
        || level.description.length === 0
        || !Array.isArray(level.initialBoard)
        || Object.getPrototypeOf(level.initialBoard) !== Array.prototype
        || level.initialBoard.length !== config.BOARD_SIZE
        || level.initialBoard.some(function invalidCell(cell) {
          return (
            cell !== null
            && (
              typeof cell !== "object"
              || Object.getPrototypeOf(cell) !== Object.prototype
              || config.THEMES.indexOf(cell.theme) === -1
              || !Number.isSafeInteger(cell.tier)
              || cell.tier < 0
              || cell.tier >= config.TIERS.length - 1
            )
          );
        })
        || !validateThemeList(level.initialCandidates, 2)
        || !validateThemeList(level.supply)
        || level.targetDistinctChapters !== config.TARGET_DISTINCT_CHAPTERS
        || config.SEATS.indexOf(level.initialOrganizer) === -1
        || !Array.isArray(level.hintPath)
        || Object.getPrototypeOf(level.hintPath) !== Array.prototype
      ) {
        throw new Error("invalid memory-merge-board level: " + level.id);
      }
      ids.add(level.id);
    });
    return true;
  }

  function getLevel(id) {
    if (typeof id !== "string") return null;
    return LEVELS.find(function matchingLevel(level) {
      return level.id === id;
    }) || null;
  }

  validateLevelDefinitions();

  return deepFreeze({
    LEVELS: LEVELS,
    getLevel: getLevel,
    validateLevelDefinitions: validateLevelDefinitions
  });
});
