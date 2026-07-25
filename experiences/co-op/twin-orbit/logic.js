"use strict";

(function exposeLogic(root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.TwinOrbitLogic = api;
  }
})(typeof window === "object" ? window : null, function createLogic() {
  var CONFIG_KEYS = [
    "leftName",
    "rightName",
    "introTitle",
    "introMessage",
    "completeTitle",
    "completeMessage",
    "signature"
  ];
  var STATE_KEYS = [
    "version",
    "phase",
    "content",
    "gateIndex",
    "tick",
    "openWindow",
    "players",
    "retryReason",
    "completedGateIds",
    "inputEpoch",
    "revision"
  ];
  var WINDOW_KEYS = ["start", "center", "end"];
  var PLAYERS_KEYS = ["left", "right"];
  var PLAYER_STATE_KEYS = [
    "angle",
    "lane",
    "held",
    "crossed",
    "crossingTick"
  ];
  var GATE_KEYS = ["id", "title", "openTick", "startAngles", "targets"];
  var ANGLES_KEYS = ["left", "right"];
  var TARGETS_KEYS = ["left", "right"];
  var TARGET_KEYS = ["angle", "lane"];
  var ACTION_SCHEMAS = {
    START: ["type"],
    BEGIN_GATE: ["type"],
    SET_HELD: ["type", "playerId", "held", "inputEpoch"],
    TICK: ["type", "count"],
    CONTINUE: ["type"],
    RETRY_GATE: ["type"],
    NEXT_GATE: ["type"],
    RESTART: ["type"],
    SUSPEND: ["type", "reason"]
  };
  var FORBIDDEN_TEXT =
    /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
  var FORBIDDEN_MARKUP_OR_URL = /[<>]|\b(?:https?|data|javascript):/iu;
  var COLLAPSIBLE_WHITESPACE = /\s+/gu;
  var RETRY_MESSAGES = {
    "too-early": "这一圈到得早了一点，再一起调一调。",
    "not-together": "两颗星没有落在同一拍，再来这一圈。",
    "wrong-lane": "时刻对了，半径还差一点。",
    "window-closed": "这次开门已经合上，再一起绕一圈。"
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

  var CONSTANTS = deepFreeze({
    VERSION: 1,
    TICK_RATE: 30,
    TURN_STEPS: 720,
    OUTER_SPEED: 2,
    INNER_SPEED: 3,
    OPEN_RADIUS: 2,
    MAX_TICK_BATCH: 5,
    MAX_FRAME_DELTA_MS: 250,
    PLAYER_IDS: ["left", "right"],
    LANES: ["outer", "inner"],
    PHASES: [
      "intro",
      "gate-intro",
      "playing",
      "gate-success",
      "gate-retry",
      "complete"
    ]
  });

  var DEFAULT_CONFIG = deepFreeze({
    leftName: "左边",
    rightName: "右边",
    introTitle: "这一圈，和你同时到",
    introMessage: "按住变快，松开变慢。让两颗星在同一拍穿过各自的门。",
    completeTitle: "这一圈，我们同时到了",
    completeMessage: "快一点，慢一点，最后还是在同一拍遇见。",
    signature: "给一起绕完这五圈的我们"
  });

  var ACTIONS = deepFreeze({
    START: "START",
    BEGIN_GATE: "BEGIN_GATE",
    SET_HELD: "SET_HELD",
    TICK: "TICK",
    CONTINUE: "CONTINUE",
    RETRY_GATE: "RETRY_GATE",
    NEXT_GATE: "NEXT_GATE",
    RESTART: "RESTART",
    SUSPEND: "SUSPEND"
  });

  var SUSPEND_REASONS = deepFreeze([
    "escape",
    "blur",
    "hidden",
    "pagehide",
    "long-frame"
  ]);

  var GATES = deepFreeze([
    {
      id: "first-meeting",
      title: "先学会一快一慢",
      openTick: 60,
      startAngles: { left: 40, right: 320 },
      targets: {
        left: { angle: 180, lane: "outer" },
        right: { angle: 470, lane: "inner" }
      }
    },
    {
      id: "trade-the-lead",
      title: "把刚才的路换给彼此",
      openTick: 60,
      startAngles: { left: 80, right: 400 },
      targets: {
        left: { angle: 230, lane: "inner" },
        right: { angle: 540, lane: "outer" }
      }
    },
    {
      id: "same-count",
      title: "走不同的路，用一样的力",
      openTick: 72,
      startAngles: { left: 120, right: 450 },
      targets: {
        left: { angle: 300, lane: "inner" },
        right: { angle: 630, lane: "outer" }
      }
    },
    {
      id: "long-way-left",
      title: "这次左边先收住",
      openTick: 84,
      startAngles: { left: 160, right: 500 },
      targets: {
        left: { angle: 352, lane: "outer" },
        right: { angle: 708, lane: "inner" }
      }
    },
    {
      id: "long-way-right",
      title: "最后一圈换右边收住",
      openTick: 84,
      startAngles: { left: 200, right: 560 },
      targets: {
        left: { angle: 408, lane: "inner" },
        right: { angle: 32, lane: "outer" }
      }
    }
  ]);

  function snapshotRecord(value, expectedKeys) {
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
        ownKeys.length !== expectedKeys.length
        || ownKeys.some(function hasNonString(key) {
          return typeof key !== "string";
        })
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

  function snapshotArray(value) {
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

  function isWellFormedUnicode(value) {
    for (var index = 0; index < value.length; index += 1) {
      var unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= value.length) {
          return false;
        }
        var next = value.charCodeAt(index + 1);
        if (next < 0xdc00 || next > 0xdfff) {
          return false;
        }
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return false;
      }
    }
    return true;
  }

  function normalizeText(value, minimum, maximum) {
    if (
      typeof value !== "string"
      || !isWellFormedUnicode(value)
      || FORBIDDEN_TEXT.test(value)
      || FORBIDDEN_MARKUP_OR_URL.test(value)
    ) {
      return null;
    }

    var normalized;
    try {
      normalized = value.normalize("NFC").replace(COLLAPSIBLE_WHITESPACE, " ").trim();
    } catch (_error) {
      return null;
    }

    var length = Array.from(normalized).length;
    if (length < minimum || length > maximum) {
      return null;
    }
    return normalized;
  }

  function normalizeConfigSnapshot(snapshot) {
    var normalized = {
      leftName: normalizeText(snapshot.leftName, 1, 20),
      rightName: normalizeText(snapshot.rightName, 1, 20),
      introTitle: normalizeText(snapshot.introTitle, 1, 160),
      introMessage: normalizeText(snapshot.introMessage, 1, 160),
      completeTitle: normalizeText(snapshot.completeTitle, 1, 160),
      completeMessage: normalizeText(snapshot.completeMessage, 1, 160),
      signature: normalizeText(snapshot.signature, 1, 60)
    };

    if (CONFIG_KEYS.some(function hasInvalidText(key) {
      return normalized[key] === null;
    })) {
      return null;
    }
    return normalized;
  }

  function normalizeConfigCandidate(candidate) {
    var snapshot = snapshotRecord(candidate, CONFIG_KEYS);
    return snapshot ? normalizeConfigSnapshot(snapshot) : null;
  }

  function sanitizeConfig(candidate) {
    var normalized = normalizeConfigCandidate(candidate);
    if (!normalized) {
      return DEFAULT_CONFIG;
    }
    return deepFreeze(normalized);
  }

  function snapshotCanonicalContent(value) {
    var snapshot = snapshotRecord(value, CONFIG_KEYS);
    if (!snapshot) {
      return null;
    }
    var normalized = normalizeConfigSnapshot(snapshot);
    if (!normalized) {
      return null;
    }
    return CONFIG_KEYS.every(function isSame(key) {
      return normalized[key] === snapshot[key];
    }) ? normalized : null;
  }

  function normalizeAngle(value) {
    if (!Number.isSafeInteger(value)) {
      return null;
    }
    return ((value % CONSTANTS.TURN_STEPS) + CONSTANTS.TURN_STEPS)
      % CONSTANTS.TURN_STEPS;
  }

  function forwardDistance(from, to) {
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) {
      return null;
    }
    return normalizeAngle(to - from);
  }

  function crossedTarget(previousAngle, targetAngle, speed) {
    if (
      normalizeAngle(previousAngle) !== previousAngle
      || normalizeAngle(targetAngle) !== targetAngle
      || (speed !== CONSTANTS.OUTER_SPEED && speed !== CONSTANTS.INNER_SPEED)
    ) {
      return null;
    }
    var distance = forwardDistance(previousAngle, targetAngle);
    return distance > 0 && distance <= speed;
  }

  function openWindowFor(gate) {
    return {
      start: gate.openTick - CONSTANTS.OPEN_RADIUS,
      center: gate.openTick,
      end: gate.openTick + CONSTANTS.OPEN_RADIUS
    };
  }

  function createPlayer(angle) {
    return {
      angle: angle,
      lane: "outer",
      held: false,
      crossed: false,
      crossingTick: null
    };
  }

  function createPlayersForGate(gate) {
    return {
      left: createPlayer(gate.startAngles.left),
      right: createPlayer(gate.startAngles.right)
    };
  }

  function createCanonicalState(content, phase, gateIndex, completedGateIds, inputEpoch, revision) {
    var gate = GATES[gateIndex];
    return deepFreeze({
      version: CONSTANTS.VERSION,
      phase: phase,
      content: content,
      gateIndex: gateIndex,
      tick: 0,
      openWindow: openWindowFor(gate),
      players: createPlayersForGate(gate),
      retryReason: null,
      completedGateIds: completedGateIds.slice(),
      inputEpoch: inputEpoch,
      revision: revision
    });
  }

  function createInitialState(configCandidate) {
    return createCanonicalState(
      sanitizeConfig(configCandidate === undefined ? DEFAULT_CONFIG : configCandidate),
      "intro",
      0,
      [],
      0,
      0
    );
  }

  function isSafeCounter(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function snapshotPlayer(value) {
    var player = snapshotRecord(value, PLAYER_STATE_KEYS);
    if (
      !player
      || normalizeAngle(player.angle) !== player.angle
      || CONSTANTS.LANES.indexOf(player.lane) === -1
      || typeof player.held !== "boolean"
      || typeof player.crossed !== "boolean"
      || !(
        player.crossingTick === null
        || (Number.isSafeInteger(player.crossingTick) && player.crossingTick > 0)
      )
      || player.crossed !== (player.crossingTick !== null)
    ) {
      return null;
    }
    return player;
  }

  function crossingProjectionMatches(state, player, target) {
    var speed = (
      player.lane === "inner"
        ? CONSTANTS.INNER_SPEED
        : CONSTANTS.OUTER_SPEED
    );
    var previousAngle = normalizeAngle(player.angle - speed);
    var crossed = crossedTarget(previousAngle, target.angle, speed);
    return (
      player.crossed === crossed
      && player.crossingTick === (crossed ? state.tick : null)
      && (!player.held || player.lane === "inner")
    );
  }

  function hasConfirmedCrossing(state, left, right, gate) {
    return (
      state.tick >= state.openWindow.start
      && state.tick <= state.openWindow.end
      && left.crossingTick === right.crossingTick
      && left.crossed
      && right.crossed
      && left.lane === gate.targets.left.lane
      && right.lane === gate.targets.right.lane
      && crossingProjectionMatches(state, left, gate.targets.left)
      && crossingProjectionMatches(state, right, gate.targets.right)
    );
  }

  function hasValidRetrySnapshot(state, left, right, gate) {
    if (
      state.tick < 1
      || state.tick > state.openWindow.end
      || !crossingProjectionMatches(state, left, gate.targets.left)
      || !crossingProjectionMatches(state, right, gate.targets.right)
    ) {
      return false;
    }

    var inWindow = (
      state.tick >= state.openWindow.start
      && state.tick <= state.openWindow.end
    );
    var bothCrossed = left.crossed && right.crossed;
    var exactlyOneCrossed = left.crossed !== right.crossed;
    var lanesMatch = (
      left.lane === gate.targets.left.lane
      && right.lane === gate.targets.right.lane
    );

    if (state.retryReason === "wrong-lane") {
      return inWindow && bothCrossed && !lanesMatch;
    }
    if (state.retryReason === "not-together") {
      return inWindow && exactlyOneCrossed;
    }
    if (state.retryReason === "too-early") {
      return state.tick < state.openWindow.start && (left.crossed || right.crossed);
    }
    return (
      state.retryReason === "window-closed"
      && state.tick === state.openWindow.end
      && !left.crossed
      && !right.crossed
    );
  }

  function isReachableAtTick(player, startAngle, tick) {
    var distance = forwardDistance(startAngle, player.angle);
    return (
      distance >= tick * CONSTANTS.OUTER_SPEED
      && distance <= tick * CONSTANTS.INNER_SPEED
    );
  }

  function hasExactWindow(value, expected) {
    var snapshot = snapshotRecord(value, WINDOW_KEYS);
    return Boolean(
      snapshot
      && snapshot.start === expected.start
      && snapshot.center === expected.center
      && snapshot.end === expected.end
    );
  }

  function isPrefix(array, expected) {
    return (
      array.length === expected.length
      && array.every(function same(value, index) {
        return value === expected[index];
      })
    );
  }

  function snapshotState(value) {
    var state = snapshotRecord(value, STATE_KEYS);
    var content = state ? snapshotCanonicalContent(state.content) : null;
    if (
      !state
      || state.version !== CONSTANTS.VERSION
      || CONSTANTS.PHASES.indexOf(state.phase) === -1
      || !content
      || !Number.isSafeInteger(state.gateIndex)
      || state.gateIndex < 0
      || state.gateIndex >= GATES.length
      || !isSafeCounter(state.tick)
      || !isSafeCounter(state.inputEpoch)
      || !isSafeCounter(state.revision)
    ) {
      return null;
    }

    var gate = GATES[state.gateIndex];
    if (!hasExactWindow(state.openWindow, openWindowFor(gate))) {
      return null;
    }

    var playersRecord = snapshotRecord(state.players, PLAYERS_KEYS);
    if (!playersRecord) {
      return null;
    }
    var left = snapshotPlayer(playersRecord.left);
    var right = snapshotPlayer(playersRecord.right);
    if (
      !left
      || !right
      || !isReachableAtTick(left, gate.startAngles.left, state.tick)
      || !isReachableAtTick(right, gate.startAngles.right, state.tick)
    ) {
      return null;
    }

    var completed = snapshotArray(state.completedGateIds);
    if (!completed) {
      return null;
    }

    var completedBefore = GATES.slice(0, state.gateIndex).map(function gateId(item) {
      return item.id;
    });
    var completedThrough = GATES.slice(0, state.gateIndex + 1).map(function gateId(item) {
      return item.id;
    });

    if (
      state.retryReason !== null
      && !Object.prototype.hasOwnProperty.call(RETRY_MESSAGES, state.retryReason)
    ) {
      return null;
    }

    if (state.phase === "intro") {
      if (
        state.gateIndex !== 0
        || state.tick !== 0
        || state.retryReason !== null
        || completed.length !== 0
      ) {
        return null;
      }
    } else if (state.phase === "gate-success") {
      if (
        !isPrefix(completed, completedThrough)
        || state.retryReason !== null
        || !hasConfirmedCrossing(state, left, right, gate)
      ) {
        return null;
      }
    } else if (state.phase === "complete") {
      if (
        state.gateIndex !== GATES.length - 1
        || !isPrefix(completed, GATES.map(function gateId(item) {
          return item.id;
        }))
        || state.retryReason !== null
        || !hasConfirmedCrossing(state, left, right, gate)
      ) {
        return null;
      }
    } else {
      if (!isPrefix(completed, completedBefore)) {
        return null;
      }
      if (state.phase === "gate-retry") {
        if (
          state.retryReason === null
          || !hasValidRetrySnapshot(state, left, right, gate)
        ) {
          return null;
        }
      } else if (state.retryReason !== null) {
        return null;
      }
    }

    if (state.phase === "intro" || state.phase === "gate-intro") {
      if (
        state.tick !== 0
        || left.angle !== gate.startAngles.left
        || right.angle !== gate.startAngles.right
        || left.held
        || right.held
        || left.lane !== "outer"
        || right.lane !== "outer"
        || left.crossed
        || right.crossed
      ) {
        return null;
      }
    }

    if (state.phase === "playing") {
      if (
        state.tick >= state.openWindow.end
        || left.crossed
        || right.crossed
        || left.lane !== (left.held ? "inner" : "outer")
        || right.lane !== (right.held ? "inner" : "outer")
      ) {
        return null;
      }
    }

    if (
      state.phase === "gate-retry"
      && (
        left.lane !== (left.held ? "inner" : "outer")
        || right.lane !== (right.held ? "inner" : "outer")
      )
    ) {
      return null;
    }

    return {
      version: state.version,
      phase: state.phase,
      content: content,
      gateIndex: state.gateIndex,
      tick: state.tick,
      openWindow: {
        start: state.openWindow.start,
        center: state.openWindow.center,
        end: state.openWindow.end
      },
      players: { left: left, right: right },
      retryReason: state.retryReason,
      completedGateIds: completed,
      inputEpoch: state.inputEpoch,
      revision: state.revision
    };
  }

  function nextRevision(value, amount) {
    var increment = amount === undefined ? 1 : amount;
    if (
      !isSafeCounter(value)
      || !Number.isSafeInteger(increment)
      || increment < 1
      || value > Number.MAX_SAFE_INTEGER - increment
    ) {
      return null;
    }
    return value + increment;
  }

  function snapshotAction(value) {
    var typeRecord = snapshotRecord(value, ["type"]);
    var type;
    if (typeRecord) {
      type = typeRecord.type;
    } else {
      try {
        var typeDescriptor = (
          value !== null && typeof value === "object"
            ? Object.getOwnPropertyDescriptor(value, "type")
            : null
        );
        if (
          !typeDescriptor
          || !Object.prototype.hasOwnProperty.call(typeDescriptor, "value")
        ) {
          return null;
        }
        type = typeDescriptor.value;
      } catch (_error) {
        return null;
      }
    }

    var expectedKeys = ACTION_SCHEMAS[type];
    if (!expectedKeys) {
      return null;
    }
    return snapshotRecord(value, expectedKeys);
  }

  function cloneState(state, changes) {
    var next = {
      version: state.version,
      phase: state.phase,
      content: state.content,
      gateIndex: state.gateIndex,
      tick: state.tick,
      openWindow: {
        start: state.openWindow.start,
        center: state.openWindow.center,
        end: state.openWindow.end
      },
      players: {
        left: {
          angle: state.players.left.angle,
          lane: state.players.left.lane,
          held: state.players.left.held,
          crossed: state.players.left.crossed,
          crossingTick: state.players.left.crossingTick
        },
        right: {
          angle: state.players.right.angle,
          lane: state.players.right.lane,
          held: state.players.right.held,
          crossed: state.players.right.crossed,
          crossingTick: state.players.right.crossingTick
        }
      },
      retryReason: state.retryReason,
      completedGateIds: state.completedGateIds.slice(),
      inputEpoch: state.inputEpoch,
      revision: state.revision
    };

    Object.keys(changes || {}).forEach(function applyChange(key) {
      next[key] = changes[key];
    });
    return deepFreeze(next);
  }

  function resetCurrentGate(state, phase, inputEpoch, revision) {
    return createCanonicalState(
      state.content,
      phase,
      state.gateIndex,
      state.completedGateIds,
      inputEpoch,
      revision
    );
  }

  function failureState(state, tick, players, reason, revision) {
    return cloneState(state, {
      phase: "gate-retry",
      tick: tick,
      players: players,
      retryReason: reason,
      revision: revision
    });
  }

  function stepPlaying(state) {
    var revision = nextRevision(state.revision);
    if (revision === null) {
      return null;
    }

    var gate = GATES[state.gateIndex];
    var currentTick = state.tick + 1;
    var leftHeld = state.players.left.held;
    var rightHeld = state.players.right.held;
    var leftLane = leftHeld ? "inner" : "outer";
    var rightLane = rightHeld ? "inner" : "outer";
    var leftSpeed = leftHeld ? CONSTANTS.INNER_SPEED : CONSTANTS.OUTER_SPEED;
    var rightSpeed = rightHeld ? CONSTANTS.INNER_SPEED : CONSTANTS.OUTER_SPEED;
    var leftPrevious = state.players.left.angle;
    var rightPrevious = state.players.right.angle;
    var leftNext = normalizeAngle(leftPrevious + leftSpeed);
    var rightNext = normalizeAngle(rightPrevious + rightSpeed);
    var leftCrossed = crossedTarget(
      leftPrevious,
      gate.targets.left.angle,
      leftSpeed
    );
    var rightCrossed = crossedTarget(
      rightPrevious,
      gate.targets.right.angle,
      rightSpeed
    );
    var players = {
      left: {
        angle: leftNext,
        lane: leftLane,
        held: leftHeld,
        crossed: leftCrossed,
        crossingTick: leftCrossed ? currentTick : null
      },
      right: {
        angle: rightNext,
        lane: rightLane,
        held: rightHeld,
        crossed: rightCrossed,
        crossingTick: rightCrossed ? currentTick : null
      }
    };
    var inWindow = (
      currentTick >= state.openWindow.start
      && currentTick <= state.openWindow.end
    );
    var bothCrossed = leftCrossed && rightCrossed;
    var anyCrossed = leftCrossed || rightCrossed;
    var lanesMatch = (
      leftLane === gate.targets.left.lane
      && rightLane === gate.targets.right.lane
    );

    if (bothCrossed && inWindow && lanesMatch) {
      return cloneState(state, {
        phase: "gate-success",
        tick: currentTick,
        players: players,
        completedGateIds: state.completedGateIds.concat(gate.id),
        revision: revision
      });
    }
    if (bothCrossed && inWindow && !lanesMatch) {
      return failureState(state, currentTick, players, "wrong-lane", revision);
    }
    if (anyCrossed && inWindow) {
      return failureState(state, currentTick, players, "not-together", revision);
    }
    if (anyCrossed && currentTick < state.openWindow.start) {
      return failureState(state, currentTick, players, "too-early", revision);
    }
    if (currentTick >= state.openWindow.end) {
      return failureState(state, currentTick, players, "window-closed", revision);
    }

    players.left.crossed = false;
    players.left.crossingTick = null;
    players.right.crossed = false;
    players.right.crossingTick = null;
    return cloneState(state, {
      tick: currentTick,
      players: players,
      revision: revision
    });
  }

  function suspendState(state) {
    var nextEpoch = nextRevision(state.inputEpoch);
    var revision = nextRevision(state.revision);
    if (nextEpoch === null || revision === null) {
      return null;
    }

    if (state.phase === "playing" || state.phase === "gate-retry") {
      return resetCurrentGate(state, "gate-intro", nextEpoch, revision);
    }
    if (state.phase === "gate-success" || state.phase === "complete") {
      return cloneState(state, {
        players: {
          left: {
            angle: state.players.left.angle,
            lane: state.players.left.lane,
            held: false,
            crossed: state.players.left.crossed,
            crossingTick: state.players.left.crossingTick
          },
          right: {
            angle: state.players.right.angle,
            lane: state.players.right.lane,
            held: false,
            crossed: state.players.right.crossed,
            crossingTick: state.players.right.crossingTick
          }
        },
        inputEpoch: nextEpoch,
        revision: revision
      });
    }
    return null;
  }

  function reduce(stateCandidate, actionCandidate) {
    var state = snapshotState(stateCandidate);
    if (!state) {
      return createInitialState();
    }

    var action = snapshotAction(actionCandidate);
    if (!action) {
      return stateCandidate;
    }

    var revision;
    if (action.type === ACTIONS.START && state.phase === "intro") {
      revision = nextRevision(state.revision);
      return revision === null
        ? stateCandidate
        : resetCurrentGate(state, "gate-intro", state.inputEpoch, revision);
    }

    if (action.type === ACTIONS.BEGIN_GATE && state.phase === "gate-intro") {
      revision = nextRevision(state.revision);
      return revision === null
        ? stateCandidate
        : resetCurrentGate(state, "playing", state.inputEpoch, revision);
    }

    if (action.type === ACTIONS.SET_HELD && state.phase === "playing") {
      if (
        CONSTANTS.PLAYER_IDS.indexOf(action.playerId) === -1
        || typeof action.held !== "boolean"
        || action.inputEpoch !== state.inputEpoch
        || state.players[action.playerId].held === action.held
      ) {
        return stateCandidate;
      }
      revision = nextRevision(state.revision);
      if (revision === null) {
        return stateCandidate;
      }
      var players = {
        left: {
          angle: state.players.left.angle,
          lane: state.players.left.lane,
          held: state.players.left.held,
          crossed: false,
          crossingTick: null
        },
        right: {
          angle: state.players.right.angle,
          lane: state.players.right.lane,
          held: state.players.right.held,
          crossed: false,
          crossingTick: null
        }
      };
      players[action.playerId].held = action.held;
      players[action.playerId].lane = action.held ? "inner" : "outer";
      return cloneState(state, {
        players: players,
        revision: revision
      });
    }

    if (action.type === ACTIONS.TICK && state.phase === "playing") {
      if (
        !Number.isSafeInteger(action.count)
        || action.count < 1
        || action.count > CONSTANTS.MAX_TICK_BATCH
      ) {
        return stateCandidate;
      }
      var stepped = stateCandidate;
      for (var tickIndex = 0; tickIndex < action.count; tickIndex += 1) {
        var nextStep = stepPlaying(snapshotState(stepped));
        if (nextStep === null) {
          return stepped;
        }
        stepped = nextStep;
        if (stepped.phase !== "playing") {
          break;
        }
      }
      return stepped;
    }

    if (action.type === ACTIONS.RETRY_GATE && state.phase === "gate-retry") {
      revision = nextRevision(state.revision);
      return revision === null
        ? stateCandidate
        : resetCurrentGate(state, "gate-intro", state.inputEpoch, revision);
    }

    if (action.type === ACTIONS.NEXT_GATE && state.phase === "gate-success") {
      revision = nextRevision(state.revision);
      if (revision === null) {
        return stateCandidate;
      }
      if (state.gateIndex === GATES.length - 1) {
        return cloneState(state, {
          phase: "complete",
          revision: revision
        });
      }
      return createCanonicalState(
        state.content,
        "gate-intro",
        state.gateIndex + 1,
        state.completedGateIds,
        state.inputEpoch,
        revision
      );
    }

    if (action.type === ACTIONS.RESTART && state.phase === "complete") {
      revision = nextRevision(state.revision);
      var restartEpoch = nextRevision(state.inputEpoch);
      if (revision === null || restartEpoch === null) {
        return stateCandidate;
      }
      return createCanonicalState(
        state.content,
        "intro",
        0,
        [],
        restartEpoch,
        revision
      );
    }

    if (
      action.type === ACTIONS.SUSPEND
      && SUSPEND_REASONS.indexOf(action.reason) !== -1
    ) {
      var suspended = suspendState(state);
      return suspended === null ? stateCandidate : suspended;
    }

    return stateCandidate;
  }

  function openStateFor(state) {
    if (state.tick < state.openWindow.start) {
      return "waiting";
    }
    if (state.tick <= state.openWindow.end) {
      return "open";
    }
    return "closed";
  }

  function relationTextFor(state, playerId) {
    var player = state.players[playerId];
    var gate = GATES[state.gateIndex];
    var distance = forwardDistance(player.angle, gate.targets[playerId].angle);
    if (distance === 0) {
      return "刚到目标角";
    }
    if (distance <= 12) {
      return "已经接近目标门";
    }
    if (state.tick < state.openWindow.start) {
      return "还在调整相位";
    }
    return "共同窗口临近";
  }

  function phaseCopy(state) {
    if (state.phase === "intro") {
      return {
        title: state.content.introTitle,
        message: state.content.introMessage
      };
    }
    if (state.phase === "gate-intro") {
      return {
        title: GATES[state.gateIndex].title,
        message: "看清两扇门的角度和半径，再一起开始。"
      };
    }
    if (state.phase === "playing") {
      return {
        title: GATES[state.gateIndex].title,
        message: "按住走内轨更快，松开走外轨更慢。"
      };
    }
    if (state.phase === "gate-success") {
      return {
        title: "这一圈，同时到了",
        message: "两颗星在同一拍穿过了各自的门。"
      };
    }
    if (state.phase === "gate-retry") {
      return {
        title: "再一起调一圈",
        message: RETRY_MESSAGES[state.retryReason]
      };
    }
    return {
      title: state.content.completeTitle,
      message: state.content.completeMessage
    };
  }

  function getPublicView(stateCandidate) {
    var state = snapshotState(stateCandidate);
    if (!state) {
      state = snapshotState(createInitialState());
    }
    var copy = phaseCopy(state);
    var showGate = state.phase !== "intro" && state.phase !== "complete";
    var gate = GATES[state.gateIndex];
    var players = CONSTANTS.PLAYER_IDS.map(function publicPlayer(playerId) {
      return {
        id: playerId,
        name: playerId === "left" ? state.content.leftName : state.content.rightName,
        angle: state.players[playerId].angle,
        lane: state.players[playerId].lane,
        targetAngle: showGate ? gate.targets[playerId].angle : null,
        targetLane: showGate ? gate.targets[playerId].lane : null,
        relationText: showGate
          ? relationTextFor(state, playerId)
          : (
            state.phase === "intro"
              ? "等待一起开始"
              : "五圈已经一起完成"
          )
      };
    });

    return deepFreeze({
      phase: state.phase,
      title: copy.title,
      message: copy.message,
      gate: showGate
        ? {
          number: state.gateIndex + 1,
          total: GATES.length,
          title: gate.title,
          tick: state.tick,
          openWindow: {
            start: state.openWindow.start,
            center: state.openWindow.center,
            end: state.openWindow.end
          },
          openState: openStateFor(state)
        }
        : null,
      players: players,
      completedCount: state.completedGateIds.length,
      canStart: state.phase === "intro",
      canBeginGate: state.phase === "gate-intro",
      canContinue: false,
      canRetry: state.phase === "gate-retry",
      canAdvance: state.phase === "gate-success",
      canRestart: state.phase === "complete"
    });
  }

  function validateInternalGates() {
    if (GATES.length !== 5) {
      throw new Error("twin-orbit requires exactly five gates");
    }
    GATES.forEach(function validateGate(gate, index) {
      var gateRecord = snapshotRecord(gate, GATE_KEYS);
      var angles = gateRecord && snapshotRecord(gateRecord.startAngles, ANGLES_KEYS);
      var targets = gateRecord && snapshotRecord(gateRecord.targets, TARGETS_KEYS);
      var leftTarget = targets && snapshotRecord(targets.left, TARGET_KEYS);
      var rightTarget = targets && snapshotRecord(targets.right, TARGET_KEYS);
      if (
        !gateRecord
        || typeof gateRecord.id !== "string"
        || gateRecord.id.length === 0
        || typeof gateRecord.title !== "string"
        || gateRecord.title.length === 0
        || !Number.isSafeInteger(gateRecord.openTick)
        || gateRecord.openTick < 1
        || gateRecord.openTick > 240
        || !angles
        || normalizeAngle(angles.left) !== angles.left
        || normalizeAngle(angles.right) !== angles.right
        || !leftTarget
        || !rightTarget
        || normalizeAngle(leftTarget.angle) !== leftTarget.angle
        || normalizeAngle(rightTarget.angle) !== rightTarget.angle
        || CONSTANTS.LANES.indexOf(leftTarget.lane) === -1
        || CONSTANTS.LANES.indexOf(rightTarget.lane) === -1
        || GATES.slice(0, index).some(function duplicateId(previous) {
          return previous.id === gateRecord.id;
        })
      ) {
        throw new Error("invalid frozen twin-orbit gate");
      }
    });
  }

  validateInternalGates();

  return deepFreeze({
    CONSTANTS: CONSTANTS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    ACTIONS: ACTIONS,
    GATES: GATES,
    sanitizeConfig: sanitizeConfig,
    normalizeAngle: normalizeAngle,
    forwardDistance: forwardDistance,
    crossedTarget: crossedTarget,
    createInitialState: createInitialState,
    reduce: reduce,
    getPublicView: getPublicView
  });
});
