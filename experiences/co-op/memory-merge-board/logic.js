"use strict";

(function exposeLogic(root, factory) {
  var sourceConfig =
    typeof module === "object" && module && module.exports
      ? require("./config.js")
      : root && root.MemoryMergeBoardConfig;
  var api = factory(sourceConfig);

  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MemoryMergeBoardLogic = api;
  }
})(typeof window === "object" ? window : null, function createLogic(config) {
  if (!config || !Object.isFrozen(config)) {
    throw new Error("memory-merge-board requires its frozen config first");
  }

  var STATE_KEYS = [
    "screen",
    "levelId",
    "board",
    "organizer",
    "phase",
    "candidates",
    "supplyIndex",
    "pendingTile",
    "incomingDirection",
    "shareQueue",
    "archivedThemes",
    "turn",
    "lossReason",
    "announcement"
  ];
  var TILE_KEYS = ["theme", "tier"];
  var REQUIRED_LEVEL_KEYS = [
    "id",
    "initialBoard",
    "initialCandidates",
    "supply",
    "targetDistinctChapters",
    "initialOrganizer"
  ];
  var ACTION_SCHEMAS = {
    SLIDE: ["type", "direction"],
    CONTINUE_SHARE: ["type"],
    CHOOSE_CANDIDATE: ["type", "candidateIndex"],
    PLACE: ["type", "boardIndex"],
    RESTART: ["type"]
  };

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

  var ACTIONS = deepFreeze({
    SLIDE: "SLIDE",
    CONTINUE_SHARE: "CONTINUE_SHARE",
    CHOOSE_CANDIDATE: "CHOOSE_CANDIDATE",
    PLACE: "PLACE",
    RESTART: "RESTART"
  });

  function snapshotRecord(value, expectedKeys, allowExtra) {
    try {
      if (
        value === null
        || typeof value !== "object"
        || Array.isArray(value)
        || Object.getPrototypeOf(value) !== Object.prototype
      ) {
        return null;
      }

      var ownKeys = Reflect.ownKeys(value);
      if (
        ownKeys.some(function hasNonStringKey(key) {
          return typeof key !== "string";
        })
        || (!allowExtra && ownKeys.length !== expectedKeys.length)
        || expectedKeys.some(function missingKey(key) {
          return ownKeys.indexOf(key) === -1;
        })
      ) {
        return null;
      }

      var snapshot = {};
      for (var index = 0; index < expectedKeys.length; index += 1) {
        var key = expectedKeys[index];
        var descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          !descriptor
          || descriptor.enumerable !== true
          || !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot[key] = descriptor.value;
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function snapshotArray(value, maximumLength) {
    try {
      if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
        return null;
      }
      var lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        !lengthDescriptor
        || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
        || !Number.isSafeInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || (
          maximumLength !== undefined
          && lengthDescriptor.value > maximumLength
        )
      ) {
        return null;
      }

      var length = lengthDescriptor.value;
      var ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== length + 1 || ownKeys[ownKeys.length - 1] !== "length") {
        return null;
      }

      var snapshot = [];
      for (var index = 0; index < length; index += 1) {
        if (ownKeys[index] !== String(index)) {
          return null;
        }
        var descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          !descriptor
          || descriptor.enumerable !== true
          || !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot.push(descriptor.value);
      }
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function isTheme(value) {
    return typeof value === "string" && config.THEMES.indexOf(value) !== -1;
  }

  function isDirection(value) {
    return (
      typeof value === "string"
      && config.DIRECTIONS.indexOf(value) !== -1
    );
  }

  function snapshotTile(value, allowChapter) {
    var tile = snapshotRecord(value, TILE_KEYS, false);
    if (
      !tile
      || !isTheme(tile.theme)
      || !Number.isSafeInteger(tile.tier)
      || tile.tier < 0
      || tile.tier >= config.TIERS.length
      || (!allowChapter && tile.tier === config.TIERS.length - 1)
    ) {
      return null;
    }
    return { theme: tile.theme, tier: tile.tier };
  }

  function createTile(theme, tier) {
    var candidate = { theme: theme, tier: tier };
    var snapshot = snapshotTile(candidate, true);
    return snapshot ? deepFreeze(snapshot) : null;
  }

  function isValidTile(value) {
    return snapshotTile(value, true) !== null;
  }

  function snapshotBoard(value) {
    var board = snapshotArray(value, config.BOARD_SIZE);
    if (!board || board.length !== config.BOARD_SIZE) {
      return null;
    }

    var snapshot = [];
    for (var index = 0; index < board.length; index += 1) {
      if (board[index] === null) {
        snapshot.push(null);
        continue;
      }
      var tile = snapshotTile(board[index], false);
      if (!tile) {
        return null;
      }
      snapshot.push(tile);
    }
    return snapshot;
  }

  function isValidBoard(value) {
    return snapshotBoard(value) !== null;
  }

  function snapshotThemeArray(value, maximumLength) {
    var array = snapshotArray(value, maximumLength);
    if (!array || array.some(function invalidTheme(theme) {
      return !isTheme(theme);
    })) {
      return null;
    }
    return array;
  }

  function snapshotLevel(value) {
    var level = snapshotRecord(value, REQUIRED_LEVEL_KEYS, true);
    if (
      !level
      || typeof level.id !== "string"
      || level.id.length < 1
      || level.id.length > 80
      || !Number.isSafeInteger(level.targetDistinctChapters)
      || level.targetDistinctChapters < 1
      || level.targetDistinctChapters > config.THEMES.length
      || config.SEATS.indexOf(level.initialOrganizer) === -1
    ) {
      return null;
    }

    var board = snapshotBoard(level.initialBoard);
    var candidates = snapshotThemeArray(level.initialCandidates, 2);
    var supply = snapshotThemeArray(level.supply);
    if (!board || !candidates || !supply) {
      return null;
    }

    return {
      id: level.id,
      initialBoard: board,
      initialCandidates: candidates,
      supply: supply,
      targetDistinctChapters: level.targetDistinctChapters,
      initialOrganizer: level.initialOrganizer
    };
  }

  function cloneTile(tile) {
    return tile === null ? null : { theme: tile.theme, tier: tile.tier };
  }

  function sameTile(left, right) {
    return (
      left === null
        ? right === null
        : right !== null
          && left.theme === right.theme
          && left.tier === right.tier
    );
  }

  function sameBoard(left, right) {
    return left.every(function sameCell(tile, index) {
      return sameTile(tile, right[index]);
    });
  }

  function mergeLine(value) {
    var line = snapshotArray(value, config.BOARD_COLUMNS);
    if (!line) {
      return null;
    }

    var input = [];
    for (var index = 0; index < line.length; index += 1) {
      var tile = snapshotTile(line[index], false);
      if (!tile) {
        return null;
      }
      input.push(tile);
    }

    var tiles = [];
    var merges = [];
    var chapters = [];
    var cursor = 0;
    while (cursor < input.length) {
      var current = input[cursor];
      var next = input[cursor + 1];
      if (
        next
        && current.theme === next.theme
        && current.tier === next.tier
      ) {
        var toTier = current.tier + 1;
        merges.push({
          theme: current.theme,
          fromTier: current.tier,
          toTier: toTier
        });
        if (toTier === config.TIERS.length - 1) {
          chapters.push(current.theme);
        } else {
          tiles.push({ theme: current.theme, tier: toTier });
        }
        cursor += 2;
      } else {
        tiles.push(cloneTile(current));
        cursor += 1;
      }
    }

    return deepFreeze({
      tiles: tiles,
      merges: merges,
      chapters: chapters,
      changed: merges.length > 0
    });
  }

  function lineIndexesFor(direction) {
    var lines = [];
    var row;
    var column;
    if (direction === "left" || direction === "right") {
      for (row = 0; row < config.BOARD_ROWS; row += 1) {
        var rowIndexes = [];
        for (column = 0; column < config.BOARD_COLUMNS; column += 1) {
          rowIndexes.push(row * config.BOARD_COLUMNS + column);
        }
        if (direction === "right") {
          rowIndexes.reverse();
        }
        lines.push(rowIndexes);
      }
      return lines;
    }

    if (direction === "up" || direction === "down") {
      for (column = 0; column < config.BOARD_COLUMNS; column += 1) {
        var columnIndexes = [];
        for (row = 0; row < config.BOARD_ROWS; row += 1) {
          columnIndexes.push(row * config.BOARD_COLUMNS + column);
        }
        if (direction === "down") {
          columnIndexes.reverse();
        }
        lines.push(columnIndexes);
      }
      return lines;
    }
    return null;
  }

  function slideBoard(value, direction) {
    var board = snapshotBoard(value);
    var lines = isDirection(direction) ? lineIndexesFor(direction) : null;
    if (!board || !lines) {
      return null;
    }

    var nextBoard = new Array(config.BOARD_SIZE).fill(null);
    var merges = [];
    var chapters = [];

    lines.forEach(function transformLine(indexes) {
      var occupied = indexes
        .map(function tileAt(index) {
          return board[index];
        })
        .filter(function notEmpty(tile) {
          return tile !== null;
        });
      var result = mergeLine(occupied);
      result.tiles.forEach(function placeTile(tile, index) {
        nextBoard[indexes[index]] = cloneTile(tile);
      });
      result.merges.forEach(function recordMerge(merge) {
        merges.push({
          theme: merge.theme,
          fromTier: merge.fromTier,
          toTier: merge.toTier
        });
      });
      result.chapters.forEach(function recordChapter(theme) {
        chapters.push(theme);
      });
    });

    return deepFreeze({
      board: nextBoard,
      merges: merges,
      chapters: chapters,
      changed: !sameBoard(board, nextBoard)
    });
  }

  function getIncomingEdgeIndexes(direction) {
    var indexes = [];
    var index;
    if (direction === "left") {
      for (index = config.BOARD_COLUMNS - 1; index < config.BOARD_SIZE; index += config.BOARD_COLUMNS) {
        indexes.push(index);
      }
    } else if (direction === "right") {
      for (index = 0; index < config.BOARD_SIZE; index += config.BOARD_COLUMNS) {
        indexes.push(index);
      }
    } else if (direction === "up") {
      for (
        index = config.BOARD_SIZE - config.BOARD_COLUMNS;
        index < config.BOARD_SIZE;
        index += 1
      ) {
        indexes.push(index);
      }
    } else if (direction === "down") {
      for (index = 0; index < config.BOARD_COLUMNS; index += 1) {
        indexes.push(index);
      }
    }
    return deepFreeze(indexes);
  }

  function getLegalPlacements(value, direction) {
    var board = snapshotBoard(value);
    if (!board || !isDirection(direction)) {
      return deepFreeze([]);
    }
    return deepFreeze(
      getIncomingEdgeIndexes(direction).filter(function isEmpty(index) {
        return board[index] === null;
      })
    );
  }

  function canSlide(value, direction) {
    var result = slideBoard(value, direction);
    return Boolean(result && result.changed);
  }

  function hasAnyLegalSlide(value) {
    var board = snapshotBoard(value);
    return Boolean(
      board
      && config.DIRECTIONS.some(function legalDirection(direction) {
        return canSlide(board, direction);
      })
    );
  }

  function distinctThemes(themes) {
    return config.THEMES.filter(function appeared(theme) {
      return themes.indexOf(theme) !== -1;
    });
  }

  function createInitialState(levelCandidate) {
    var level = snapshotLevel(levelCandidate);
    if (!level) {
      return null;
    }
    return deepFreeze({
      screen: "play",
      levelId: level.id,
      board: level.initialBoard.map(cloneTile),
      organizer: level.initialOrganizer,
      phase: "slide",
      candidates: level.initialCandidates.slice(),
      supplyIndex: 0,
      pendingTile: null,
      incomingDirection: null,
      shareQueue: [],
      archivedThemes: [],
      turn: 0,
      lossReason: null,
      announcement: ""
    });
  }

  function snapshotState(value, levelCandidate) {
    var level = snapshotLevel(levelCandidate);
    var state = snapshotRecord(value, STATE_KEYS, false);
    if (
      !level
      || !state
      || state.screen !== "play"
      || state.levelId !== level.id
      || config.SEATS.indexOf(state.organizer) === -1
      || config.PHASES.indexOf(state.phase) === -1
      || !Number.isSafeInteger(state.supplyIndex)
      || state.supplyIndex < 0
      || state.supplyIndex > level.supply.length
      || !Number.isSafeInteger(state.turn)
      || state.turn < 0
      || typeof state.announcement !== "string"
    ) {
      return null;
    }

    var board = snapshotBoard(state.board);
    var candidates = snapshotThemeArray(state.candidates, 2);
    var shareQueue = snapshotThemeArray(state.shareQueue);
    var archivedThemes = snapshotThemeArray(state.archivedThemes);
    var pendingTile = (
      state.pendingTile === null
        ? null
        : snapshotTile(state.pendingTile, false)
    );
    if (!board || !candidates || !shareQueue || !archivedThemes) {
      return null;
    }

    var incomingIsDirection = isDirection(state.incomingDirection);
    var pendingIsFragment = pendingTile && pendingTile.tier === 0;
    var distinctCount = distinctThemes(archivedThemes).length;

    if (state.phase === "slide") {
      if (
        pendingTile !== null
        || state.incomingDirection !== null
        || shareQueue.length !== 0
        || state.lossReason !== null
      ) {
        return null;
      }
    } else if (state.phase === "share") {
      if (
        pendingTile !== null
        || !incomingIsDirection
        || shareQueue.length === 0
        || state.lossReason !== null
      ) {
        return null;
      }
    } else if (state.phase === "choose") {
      if (
        pendingTile !== null
        || !incomingIsDirection
        || shareQueue.length !== 0
        || candidates.length === 0
        || state.lossReason !== null
      ) {
        return null;
      }
    } else if (state.phase === "place") {
      if (
        !pendingIsFragment
        || !incomingIsDirection
        || shareQueue.length !== 0
        || state.lossReason !== null
      ) {
        return null;
      }
    } else if (state.phase === "won") {
      if (
        pendingTile !== null
        || state.incomingDirection !== null
        || shareQueue.length !== 0
        || state.lossReason !== null
        || distinctCount < level.targetDistinctChapters
      ) {
        return null;
      }
    } else if (
      pendingTile !== null
      || state.incomingDirection !== null
      || shareQueue.length !== 0
      || config.LOSS_REASONS.indexOf(state.lossReason) === -1
      || distinctCount >= level.targetDistinctChapters
    ) {
      return null;
    }

    return {
      screen: state.screen,
      levelId: state.levelId,
      board: board,
      organizer: state.organizer,
      phase: state.phase,
      candidates: candidates,
      supplyIndex: state.supplyIndex,
      pendingTile: pendingTile,
      incomingDirection: state.incomingDirection,
      shareQueue: shareQueue,
      archivedThemes: archivedThemes,
      turn: state.turn,
      lossReason: state.lossReason,
      announcement: state.announcement
    };
  }

  function isState(value, levelCandidate) {
    return snapshotState(value, levelCandidate) !== null;
  }

  function snapshotAction(value) {
    var type;
    try {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return null;
      }
      var descriptor = Object.getOwnPropertyDescriptor(value, "type");
      if (
        !descriptor
        || !Object.prototype.hasOwnProperty.call(descriptor, "value")
      ) {
        return null;
      }
      type = descriptor.value;
    } catch (_error) {
      return null;
    }
    return ACTION_SCHEMAS[type]
      ? snapshotRecord(value, ACTION_SCHEMAS[type], false)
      : null;
  }

  function buildState(state, changes) {
    var next = {
      screen: state.screen,
      levelId: state.levelId,
      board: state.board.map(cloneTile),
      organizer: state.organizer,
      phase: state.phase,
      candidates: state.candidates.slice(),
      supplyIndex: state.supplyIndex,
      pendingTile: cloneTile(state.pendingTile),
      incomingDirection: state.incomingDirection,
      shareQueue: state.shareQueue.slice(),
      archivedThemes: state.archivedThemes.slice(),
      turn: state.turn,
      lossReason: state.lossReason,
      announcement: state.announcement
    };
    Object.keys(changes || {}).forEach(function applyChange(key) {
      next[key] = changes[key];
    });
    return deepFreeze(next);
  }

  function loseAfterSupply(state, message) {
    return buildState(state, {
      phase: "lost",
      pendingTile: null,
      incomingDirection: null,
      shareQueue: [],
      lossReason: "supply-exhausted",
      announcement: message
    });
  }

  function reduceSlide(stateCandidate, state, action, level) {
    if (state.phase !== "slide" || !isDirection(action.direction)) {
      return stateCandidate;
    }
    var result = slideBoard(state.board, action.direction);
    if (!result || !result.changed) {
      return stateCandidate;
    }

    var archived = state.archivedThemes.concat(result.chapters);
    if (
      result.chapters.length === 0
      && state.candidates.length === 0
      && state.supplyIndex >= level.supply.length
    ) {
      return loseAfterSupply(
        buildState(state, {
          board: result.board,
          archivedThemes: archived
        }),
        "固定线索已经用完，这一页先整理到这里。"
      );
    }

    return buildState(state, {
      board: result.board,
      phase: result.chapters.length > 0 ? "share" : "choose",
      incomingDirection: action.direction,
      shareQueue: result.chapters,
      archivedThemes: archived,
      announcement: (
        result.chapters.length > 0
          ? "新的章节已经收进共同相册。"
          : "线索已整理，现在请补页者选择下一张线索。"
      )
    });
  }

  function reduceShare(stateCandidate, state, level) {
    if (state.phase !== "share") {
      return stateCandidate;
    }
    var remaining = state.shareQueue.slice(1);
    if (remaining.length > 0) {
      return buildState(state, {
        shareQueue: remaining,
        announcement: "还有一个新章节，聊完再继续。"
      });
    }

    if (
      distinctThemes(state.archivedThemes).length
      >= level.targetDistinctChapters
    ) {
      return buildState(state, {
        phase: "won",
        incomingDirection: null,
        shareQueue: [],
        announcement: "三个不同主题的章节已经收进共同相册。"
      });
    }

    if (
      state.candidates.length === 0
      && state.supplyIndex >= level.supply.length
    ) {
      return loseAfterSupply(
        state,
        "固定线索已经用完，这一页先整理到这里。"
      );
    }

    return buildState(state, {
      phase: "choose",
      shareQueue: [],
      announcement: "现在请补页者选择下一张线索。"
    });
  }

  function reduceChoose(stateCandidate, state, action, level) {
    if (
      state.phase !== "choose"
      || !Number.isSafeInteger(action.candidateIndex)
      || action.candidateIndex < 0
      || action.candidateIndex >= state.candidates.length
    ) {
      return stateCandidate;
    }

    var candidates = state.candidates.slice();
    var selected = candidates.splice(action.candidateIndex, 1)[0];
    var supplyIndex = state.supplyIndex;
    if (supplyIndex < level.supply.length) {
      candidates.push(level.supply[supplyIndex]);
      supplyIndex += 1;
    }

    return buildState(state, {
      phase: "place",
      candidates: candidates,
      supplyIndex: supplyIndex,
      pendingTile: { theme: selected, tier: 0 },
      announcement: "请从亮起的来向边缘空位补上这张线索。"
    });
  }

  function reducePlace(stateCandidate, state, action) {
    if (
      state.phase !== "place"
      || !Number.isSafeInteger(action.boardIndex)
      || getLegalPlacements(
        state.board,
        state.incomingDirection
      ).indexOf(action.boardIndex) === -1
    ) {
      return stateCandidate;
    }

    var board = state.board.map(cloneTile);
    board[action.boardIndex] = cloneTile(state.pendingTile);
    var organizer = state.organizer === "left" ? "right" : "left";
    if (!hasAnyLegalSlide(board)) {
      return buildState(state, {
        board: board,
        organizer: organizer,
        phase: "lost",
        pendingTile: null,
        incomingDirection: null,
        turn: state.turn + 1,
        lossReason: "blocked",
        announcement: "这一页暂时排不下了。"
      });
    }

    return buildState(state, {
      board: board,
      organizer: organizer,
      phase: "slide",
      pendingTile: null,
      incomingDirection: null,
      turn: state.turn + 1,
      announcement: (
        organizer === "left"
          ? "完整回合结束，现在由左边的人整理。"
          : "完整回合结束，现在由右边的人整理。"
      )
    });
  }

  function reduce(stateCandidate, actionCandidate, levelCandidate) {
    var level = snapshotLevel(levelCandidate);
    if (!level) {
      return null;
    }
    var state = snapshotState(stateCandidate, levelCandidate);
    if (!state) {
      return createInitialState(levelCandidate);
    }
    var action = snapshotAction(actionCandidate);
    if (!action) {
      return stateCandidate;
    }

    if (action.type === ACTIONS.RESTART) {
      return state.phase === "won" || state.phase === "lost"
        ? createInitialState(levelCandidate)
        : stateCandidate;
    }
    if (state.phase === "won" || state.phase === "lost") {
      return stateCandidate;
    }
    if (action.type === ACTIONS.SLIDE) {
      return reduceSlide(stateCandidate, state, action, level);
    }
    if (action.type === ACTIONS.CONTINUE_SHARE) {
      return reduceShare(stateCandidate, state, level);
    }
    if (action.type === ACTIONS.CHOOSE_CANDIDATE) {
      return reduceChoose(stateCandidate, state, action, level);
    }
    if (action.type === ACTIONS.PLACE) {
      return reducePlace(stateCandidate, state, action);
    }
    return stateCandidate;
  }

  function tileToken(tile) {
    return tile === null ? "." : tile.theme + ":" + tile.tier;
  }

  function createCanonicalKey(stateCandidate, levelCandidate) {
    var state = snapshotState(stateCandidate, levelCandidate);
    if (!state) {
      return null;
    }
    return [
      state.levelId,
      state.board.map(tileToken).join(","),
      state.organizer,
      state.phase,
      state.candidates.join(","),
      String(state.supplyIndex),
      tileToken(state.pendingTile),
      state.incomingDirection || ".",
      state.shareQueue.join(","),
      distinctThemes(state.archivedThemes).sort().join(",")
    ].join("|");
  }

  function getPublicView(stateCandidate, levelCandidate) {
    var state = snapshotState(stateCandidate, levelCandidate);
    var level = snapshotLevel(levelCandidate);
    if (!state || !level) {
      return null;
    }
    return deepFreeze({
      levelId: state.levelId,
      board: state.board.map(cloneTile),
      organizer: state.organizer,
      replenisher: state.organizer === "left" ? "right" : "left",
      phase: state.phase,
      candidates: state.candidates.slice(),
      pendingTile: cloneTile(state.pendingTile),
      incomingDirection: state.incomingDirection,
      legalPlacements: (
        state.phase === "place"
          ? getLegalPlacements(state.board, state.incomingDirection)
          : []
      ),
      shareTheme: state.shareQueue.length > 0 ? state.shareQueue[0] : null,
      archivedThemes: state.archivedThemes.slice(),
      distinctChapterCount: distinctThemes(state.archivedThemes).length,
      targetDistinctChapters: level.targetDistinctChapters,
      turn: state.turn,
      lossReason: state.lossReason,
      announcement: state.announcement
    });
  }

  return deepFreeze({
    ACTIONS: ACTIONS,
    createTile: createTile,
    isValidTile: isValidTile,
    isValidBoard: isValidBoard,
    mergeLine: mergeLine,
    slideBoard: slideBoard,
    getIncomingEdgeIndexes: getIncomingEdgeIndexes,
    getLegalPlacements: getLegalPlacements,
    canSlide: canSlide,
    hasAnyLegalSlide: hasAnyLegalSlide,
    createInitialState: createInitialState,
    isState: isState,
    reduce: reduce,
    createCanonicalKey: createCanonicalKey,
    getPublicView: getPublicView
  });
});
