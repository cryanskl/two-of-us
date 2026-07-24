(function (root, factory) {
  "use strict";

  let configApi = root && root.ShadowSwordConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch {
      configApi = null;
    }
  }
  const api = factory(configApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.ShadowSwordLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const PLAYER_COUNT = 2;
  const START_HEALTH = 3;
  const START_ENERGY = 1;
  const MAX_HEALTH = 3;
  const MAX_ENERGY = 2;
  const MAX_ROUNDS = 9;
  const ATTACK_COST = 1;
  const TITLE = "影子剑术";
  const ACTIONS = deepFreeze(["attack", "guard", "dodge", "charge"]);
  const PHASES = deepFreeze([
    "intro",
    "choosing",
    "handoff",
    "ready-to-reveal",
    "round-result",
    "match-result",
  ]);
  const PLAYER_KEYS = deepFreeze(["health", "energy", "initiative"]);
  const EVENT_KEYS = deepFreeze(["roundIndex", "firstSeat", "actions"]);
  const STATE_KEYS = deepFreeze([
    "version",
    "phase",
    "content",
    "roundIndex",
    "firstSeat",
    "activeSeat",
    "covered",
    "draftAction",
    "sealedActions",
    "history",
    "revision",
  ]);
  const CONTENT_KEYS = deepFreeze(["playerNames", "finalNote"]);
  const CONTROL_KEYS = deepFreeze([
    "canStart",
    "canChoose",
    "canConfirm",
    "canCover",
    "canResume",
    "canTakeOver",
    "canReveal",
    "canNextRound",
    "canRestart",
  ]);
  const ACTION_FIELDS = deepFreeze({
    START: [],
    CHOOSE: ["seat", "move"],
    CONFIRM: ["seat"],
    COVER: [],
    RESUME: ["seat"],
    TAKE_OVER: ["seat"],
    REVEAL: [],
    NEXT_ROUND: [],
    RESTART: [],
  });
  const ACTION_LABELS = deepFreeze({
    attack: "攻",
    guard: "防",
    dodge: "闪",
    charge: "蓄",
  });
  const INSTRUCTIONS = deepFreeze([
    "每人 3 点体力、1 点气。",
    "攻要花 1 点气；防住普通攻会拿到先机；先机攻可以破防。",
    "闪能避开攻击；没被打中的蓄会回复 1 点气。",
    "两个人都封招后一起揭晓，最多九回合。",
  ]);
  const FALLBACK_DEFAULT_CONFIG = deepFreeze({
    playerNames: ["左席", "右席"],
    finalNote: "看懂对方之前，先藏好自己。",
  });
  const DEFAULT_CONFIG = sanitizeAgainst(
    configApi && configApi.DEFAULT_CONFIG,
    FALLBACK_DEFAULT_CONFIG,
  );

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

  function sanitizeConfig(candidate) {
    return sanitizeAgainst(candidate, DEFAULT_CONFIG);
  }

  function sanitizeAgainst(candidate, fallback) {
    const observed = observeRecord(candidate, CONTENT_KEYS, true);
    if (!observed) return copyConfig(fallback);

    const playerNames = sanitizePlayerNames(observed.playerNames, fallback.playerNames);
    const finalNote = sanitizeText(observed.finalNote, fallback.finalNote, 1, 80);
    return deepFreeze({ playerNames, finalNote });
  }

  function sanitizePlayerNames(candidate, fallback) {
    if (candidate === undefined) return fallback.slice();
    const observed = observeArray(candidate, 2);
    if (!observed) return fallback.slice();
    const left = cleanText(observed[0], 1, 12);
    const right = cleanText(observed[1], 1, 12);
    if (left === null || right === null || left === right) return fallback.slice();
    return [left, right];
  }

  function sanitizeText(candidate, fallback, min, max) {
    if (candidate === undefined) return fallback;
    const clean = cleanText(candidate, min, max);
    return clean === null ? fallback : clean;
  }

  function cleanText(value, min, max) {
    if (typeof value !== "string") return null;
    if (/[\u0000-\u001f\u007f-\u009f]/u.test(value) || hasLoneSurrogate(value)) return null;
    const trimmed = value.trim();
    const count = Array.from(trimmed).length;
    return count >= min && count <= max ? trimmed : null;
  }

  function hasLoneSurrogate(value) {
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
        index += 1;
      } else if (code >= 0xdc00 && code <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  function copyConfig(config) {
    return deepFreeze({
      playerNames: config.playerNames.slice(),
      finalNote: config.finalNote,
    });
  }

  function createInitialState(config) {
    const content = sanitizeConfig(config);
    return freezeState({
      version: VERSION,
      phase: "intro",
      content,
      roundIndex: 1,
      firstSeat: 0,
      activeSeat: null,
      covered: false,
      draftAction: null,
      sealedActions: [null, null],
      history: [],
      revision: 0,
    });
  }

  function isActionAvailable(player, move) {
    const safePlayer = parsePlayer(player);
    if (!safePlayer || !ACTIONS.includes(move) || safePlayer.health <= 0) return false;
    return move !== "attack" || safePlayer.energy >= ATTACK_COST;
  }

  function resolveRound(playersBefore, actions) {
    const safePlayers = parsePlayers(playersBefore);
    const safeActions = parseMoveArray(actions);
    if (!safePlayers || !safeActions) return null;
    if (!safeActions.every((move, seat) => isActionAvailable(safePlayers[seat], move))) return null;

    const hit = [false, false];
    const spentEnergy = [0, 0];
    const spentInitiative = [false, false];
    const gainedEnergy = [false, false];
    const gainedInitiative = [false, false];

    for (let seat = 0; seat < PLAYER_COUNT; seat += 1) {
      const opponent = 1 - seat;
      spentEnergy[seat] = safeActions[seat] === "attack" ? ATTACK_COST : 0;
      spentInitiative[seat] = safeActions[seat] === "attack" && safePlayers[seat].initiative;

      if (safeActions[opponent] !== "attack") {
        hit[seat] = false;
      } else if (safeActions[seat] === "dodge") {
        hit[seat] = false;
      } else if (safeActions[seat] === "guard") {
        hit[seat] = safePlayers[opponent].initiative;
      } else {
        hit[seat] = true;
      }

      gainedInitiative[seat] = (
        safeActions[seat] === "guard"
        && safeActions[opponent] === "attack"
        && safePlayers[opponent].initiative === false
      );
      gainedEnergy[seat] = (
        safeActions[seat] === "charge"
        && hit[seat] === false
        && safePlayers[seat].energy < MAX_ENERGY
      );
    }

    const playersAfter = safePlayers.map((player, seat) => ({
      health: Math.max(0, player.health - (hit[seat] ? 1 : 0)),
      energy: player.energy - spentEnergy[seat] + (gainedEnergy[seat] ? 1 : 0),
      initiative: safeActions[seat] === "attack"
        ? false
        : gainedInitiative[seat]
          ? true
          : player.initiative,
    }));

    return deepFreeze({
      playersBefore: copyPlayers(safePlayers),
      actions: safeActions.slice(),
      hit,
      spentEnergy,
      spentInitiative,
      gainedEnergy,
      gainedInitiative,
      playersAfter,
    });
  }

  function replayHistory(history) {
    const safeHistory = parseHistory(history);
    if (!safeHistory) return null;

    let players = initialPlayers();
    const effects = [];
    let result = null;
    for (let index = 0; index < safeHistory.length; index += 1) {
      const event = safeHistory[index];
      if (result) return null;
      if (event.roundIndex !== index + 1 || event.firstSeat !== index % 2) return null;
      const effect = resolveRound(players, event.actions);
      if (!effect) return null;
      effects.push(effect);
      players = copyPlayers(effect.playersAfter);
      result = deriveMatchResult(players, event.roundIndex);
    }

    return deepFreeze({
      effects,
      players,
      result,
    });
  }

  function getPlayersBeforeRound(history) {
    const replay = replayHistory(history);
    return replay ? deepFreeze(copyPlayers(replay.players)) : null;
  }

  function deriveMatchResult(players, roundIndex) {
    if (players[0].health === 0 && players[1].health === 0) {
      return deepFreeze({
        kind: "draw",
        winnerSeat: null,
        reason: "double-ko",
        roundsPlayed: roundIndex,
      });
    }
    if (players[0].health === 0) {
      return deepFreeze({
        kind: "win",
        winnerSeat: 1,
        reason: "knockout",
        roundsPlayed: roundIndex,
      });
    }
    if (players[1].health === 0) {
      return deepFreeze({
        kind: "win",
        winnerSeat: 0,
        reason: "knockout",
        roundsPlayed: roundIndex,
      });
    }
    if (roundIndex < MAX_ROUNDS) return null;
    if (players[0].health !== players[1].health) {
      return deepFreeze({
        kind: "win",
        winnerSeat: players[0].health > players[1].health ? 0 : 1,
        reason: "health",
        roundsPlayed: roundIndex,
      });
    }
    if (players[0].energy !== players[1].energy) {
      return deepFreeze({
        kind: "win",
        winnerSeat: players[0].energy > players[1].energy ? 0 : 1,
        reason: "energy",
        roundsPlayed: roundIndex,
      });
    }
    return deepFreeze({
      kind: "draw",
      winnerSeat: null,
      reason: "round-limit-draw",
      roundsPlayed: roundIndex,
    });
  }

  function reduce(state, action) {
    const safeState = parseState(state);
    if (!safeState) return createInitialState();
    const safeAction = parseReducerAction(action);
    if (!safeAction) return state;
    if (safeState.revision >= Number.MAX_SAFE_INTEGER && safeAction.type !== "RESTART") return state;

    switch (safeAction.type) {
      case "START":
        if (safeState.phase !== "intro") return state;
        return transition(safeState, {
          phase: "choosing",
          activeSeat: safeState.firstSeat,
        });
      case "CHOOSE": {
        if (
          safeState.phase !== "choosing"
          || safeState.covered
          || safeAction.seat !== safeState.activeSeat
        ) return state;
        const players = getPlayersBeforeRound(safeState.history);
        if (!players || !isActionAvailable(players[safeAction.seat], safeAction.move)) return state;
        return transition(safeState, { draftAction: safeAction.move });
      }
      case "CONFIRM": {
        if (
          safeState.phase !== "choosing"
          || safeState.covered
          || safeAction.seat !== safeState.activeSeat
          || safeState.draftAction === null
        ) return state;
        const sealedActions = safeState.sealedActions.slice();
        sealedActions[safeAction.seat] = safeState.draftAction;
        const sealedCount = countSealed(sealedActions);
        return transition(safeState, {
          phase: sealedCount === 1 ? "handoff" : "ready-to-reveal",
          activeSeat: sealedCount === 1 ? 1 - safeAction.seat : null,
          draftAction: null,
          sealedActions,
        });
      }
      case "COVER":
        if (safeState.phase !== "choosing" || safeState.covered) return state;
        return transition(safeState, { covered: true, draftAction: null });
      case "RESUME":
        if (
          safeState.phase !== "choosing"
          || !safeState.covered
          || safeAction.seat !== safeState.activeSeat
        ) return state;
        return transition(safeState, { covered: false });
      case "TAKE_OVER":
        if (safeState.phase !== "handoff" || safeAction.seat !== safeState.activeSeat) return state;
        return transition(safeState, { phase: "choosing" });
      case "REVEAL": {
        if (safeState.phase !== "ready-to-reveal") return state;
        const playersBefore = getPlayersBeforeRound(safeState.history);
        const effect = resolveRound(playersBefore, safeState.sealedActions);
        if (!effect) return state;
        const history = safeState.history.concat({
          roundIndex: safeState.roundIndex,
          firstSeat: safeState.firstSeat,
          actions: safeState.sealedActions.slice(),
        });
        const replay = replayHistory(history);
        if (!replay) return state;
        return transition(safeState, {
          phase: replay.result ? "match-result" : "round-result",
          activeSeat: null,
          draftAction: null,
          sealedActions: [null, null],
          history,
        });
      }
      case "NEXT_ROUND":
        if (safeState.phase !== "round-result") return state;
        return transition(safeState, {
          phase: "handoff",
          roundIndex: safeState.roundIndex + 1,
          firstSeat: 1 - safeState.firstSeat,
          activeSeat: 1 - safeState.firstSeat,
        });
      case "RESTART":
        return safeState.phase === "match-result"
          ? createInitialState(safeState.content)
          : state;
      default:
        return state;
    }
  }

  function getScreenView(state) {
    let safeState = parseState(state);
    if (!safeState) safeState = parseState(createInitialState());
    const replay = replayHistory(safeState.history);
    const players = replay ? replay.players : initialPlayers();
    const revealedHistory = safeState.history.map((event, index) => ({
      roundIndex: event.roundIndex,
      firstSeat: event.firstSeat,
      actions: event.actions.slice(),
      effect: replay.effects[index],
    }));
    const common = {
      version: VERSION,
      phase: safeState.phase,
      title: TITLE,
      playerNames: safeState.content.playerNames.slice(),
      roundIndex: safeState.roundIndex,
      maxRounds: MAX_ROUNDS,
      firstSeat: safeState.firstSeat,
      activeSeat: safeState.activeSeat,
      covered: safeState.covered,
      players: copyPlayers(players),
      revealedHistory,
      controls: createControls(safeState),
      revision: safeState.revision,
    };

    if (safeState.phase === "intro") {
      common.instructions = INSTRUCTIONS.slice();
    } else if (safeState.phase === "choosing" && !safeState.covered) {
      common.prompt = `请 ${safeState.content.playerNames[safeState.activeSeat]} 选一招`;
      common.draftAction = safeState.draftAction;
      common.availableActions = ACTIONS.map((move) => ({
        move,
        label: ACTION_LABELS[move],
        available: isActionAvailable(players[safeState.activeSeat], move),
        reason: move === "attack" && players[safeState.activeSeat].energy < ATTACK_COST
          ? "needs-energy"
          : null,
      }));
    } else if (safeState.phase === "choosing") {
      common.resumeSeat = safeState.activeSeat;
    } else if (safeState.phase === "handoff") {
      common.handoffSeat = safeState.activeSeat;
      common.handoffKind = countSealed(safeState.sealedActions) === 0
        ? "round-start"
        : "second-seat";
    } else if (safeState.phase === "ready-to-reveal") {
      common.readyMessage = "两位都已封招";
    } else if (safeState.phase === "round-result") {
      common.latestRound = revealedHistory[revealedHistory.length - 1];
    } else if (safeState.phase === "match-result") {
      common.latestRound = revealedHistory[revealedHistory.length - 1];
      common.matchResult = replay.result;
      common.finalNote = safeState.content.finalNote;
    }
    return deepFreeze(common);
  }

  function createControls(state) {
    const values = {
      canStart: state.phase === "intro",
      canChoose: state.phase === "choosing" && !state.covered,
      canConfirm: state.phase === "choosing" && !state.covered && state.draftAction !== null,
      canCover: state.phase === "choosing" && !state.covered,
      canResume: state.phase === "choosing" && state.covered,
      canTakeOver: state.phase === "handoff",
      canReveal: state.phase === "ready-to-reveal",
      canNextRound: state.phase === "round-result",
      canRestart: state.phase === "match-result",
    };
    if (!sameKeySet(Reflect.ownKeys(values), CONTROL_KEYS)) throw new Error("invalid controls");
    return values;
  }

  function transition(state, changes) {
    return freezeState({
      version: VERSION,
      phase: changes.phase ?? state.phase,
      content: state.content,
      roundIndex: changes.roundIndex ?? state.roundIndex,
      firstSeat: changes.firstSeat ?? state.firstSeat,
      activeSeat: Object.prototype.hasOwnProperty.call(changes, "activeSeat")
        ? changes.activeSeat
        : state.activeSeat,
      covered: Object.prototype.hasOwnProperty.call(changes, "covered")
        ? changes.covered
        : state.covered,
      draftAction: Object.prototype.hasOwnProperty.call(changes, "draftAction")
        ? changes.draftAction
        : state.draftAction,
      sealedActions: changes.sealedActions ?? state.sealedActions,
      history: changes.history ?? state.history,
      revision: state.revision + 1,
    });
  }

  function freezeState(state) {
    return deepFreeze({
      version: state.version,
      phase: state.phase,
      content: {
        playerNames: state.content.playerNames.slice(),
        finalNote: state.content.finalNote,
      },
      roundIndex: state.roundIndex,
      firstSeat: state.firstSeat,
      activeSeat: state.activeSeat,
      covered: state.covered,
      draftAction: state.draftAction,
      sealedActions: state.sealedActions.slice(),
      history: state.history.map((event) => ({
        roundIndex: event.roundIndex,
        firstSeat: event.firstSeat,
        actions: event.actions.slice(),
      })),
      revision: state.revision,
    });
  }

  function parseState(candidate) {
    const state = observeRecord(candidate, STATE_KEYS, false, true);
    if (!state) return null;
    const content = parseContent(state.content, true);
    const sealedActions = parseSealedArray(state.sealedActions, true);
    const history = parseHistory(state.history, true);
    if (
      state.version !== VERSION
      || !PHASES.includes(state.phase)
      || !content
      || !Number.isInteger(state.roundIndex)
      || state.roundIndex < 1
      || state.roundIndex > MAX_ROUNDS
      || !(state.firstSeat === 0 || state.firstSeat === 1)
      || !(state.activeSeat === 0 || state.activeSeat === 1 || state.activeSeat === null)
      || typeof state.covered !== "boolean"
      || !(state.draftAction === null || ACTIONS.includes(state.draftAction))
      || !sealedActions
      || !history
      || !Number.isSafeInteger(state.revision)
      || state.revision < 0
    ) return null;

    const safe = {
      version: VERSION,
      phase: state.phase,
      content,
      roundIndex: state.roundIndex,
      firstSeat: state.firstSeat,
      activeSeat: state.activeSeat,
      covered: state.covered,
      draftAction: state.draftAction,
      sealedActions,
      history,
      revision: state.revision,
    };
    return stateInvariantHolds(safe) ? safe : null;
  }

  function stateInvariantHolds(state) {
    const replay = replayHistory(state.history);
    if (!replay) return false;
    const sealedCount = countSealed(state.sealedActions);
    const emptySecrets = sealedCount === 0;
    const noDraft = state.draftAction === null;
    const expectedFirstSeat = (state.roundIndex - 1) % 2;
    if (state.firstSeat !== expectedFirstSeat) return false;

    if (state.phase === "intro") {
      return (
        state.history.length === 0
        && state.roundIndex === 1
        && state.firstSeat === 0
        && state.activeSeat === null
        && !state.covered
        && noDraft
        && emptySecrets
      );
    }

    if (["choosing", "handoff", "ready-to-reveal"].includes(state.phase)) {
      if (
        replay.result
        || state.roundIndex !== state.history.length + 1
        || state.roundIndex > MAX_ROUNDS
      ) return false;
    } else {
      const last = state.history[state.history.length - 1];
      if (
        !last
        || state.roundIndex !== last.roundIndex
        || state.activeSeat !== null
        || state.covered
        || !noDraft
        || !emptySecrets
      ) return false;
    }

    if (state.phase === "choosing") {
      if (!(state.activeSeat === 0 || state.activeSeat === 1) || sealedCount > 1) return false;
      if (sealedCount === 0 && state.activeSeat !== state.firstSeat) return false;
      if (sealedCount === 1) {
        if (
          state.sealedActions[state.firstSeat] === null
          || state.sealedActions[1 - state.firstSeat] !== null
          || state.activeSeat !== 1 - state.firstSeat
        ) return false;
      }
      if (state.covered && !noDraft) return false;
      if (!state.covered && state.draftAction !== null) {
        if (!isActionAvailable(replay.players[state.activeSeat], state.draftAction)) return false;
      }
      return state.sealedActions.every((move, seat) => (
        move === null || isActionAvailable(replay.players[seat], move)
      ));
    }

    if (state.phase === "handoff") {
      if (state.covered || !noDraft) return false;
      if (sealedCount === 0) {
        return state.history.length >= 1 && state.activeSeat === state.firstSeat;
      }
      return (
        sealedCount === 1
        && state.sealedActions[state.firstSeat] !== null
        && state.sealedActions[1 - state.firstSeat] === null
        && state.activeSeat === 1 - state.firstSeat
        && isActionAvailable(replay.players[state.firstSeat], state.sealedActions[state.firstSeat])
      );
    }

    if (state.phase === "ready-to-reveal") {
      return (
        state.activeSeat === null
        && !state.covered
        && noDraft
        && sealedCount === 2
        && state.sealedActions.every((move, seat) => isActionAvailable(replay.players[seat], move))
      );
    }

    if (state.phase === "round-result") {
      return !replay.result && state.roundIndex < MAX_ROUNDS;
    }
    return state.phase === "match-result" && replay.result !== null;
  }

  function parseContent(candidate, requireFrozen = false) {
    const content = observeRecord(candidate, CONTENT_KEYS, false, requireFrozen);
    if (!content) return null;
    const names = observeArray(content.playerNames, 2, requireFrozen);
    if (!names) return null;
    const left = cleanText(names[0], 1, 12);
    const right = cleanText(names[1], 1, 12);
    const note = cleanText(content.finalNote, 1, 80);
    if (left === null || right === null || left !== names[0] || right !== names[1] || left === right) {
      return null;
    }
    if (note === null || note !== content.finalNote) return null;
    return { playerNames: [left, right], finalNote: note };
  }

  function parsePlayers(candidate) {
    const rows = observeArray(candidate, PLAYER_COUNT);
    if (!rows) return null;
    const players = rows.map(parsePlayer);
    return players.every(Boolean) ? players : null;
  }

  function parsePlayer(candidate) {
    const player = observeRecord(candidate, PLAYER_KEYS, false);
    if (
      !player
      || !Number.isInteger(player.health)
      || player.health < 0
      || player.health > MAX_HEALTH
      || !Number.isInteger(player.energy)
      || player.energy < 0
      || player.energy > MAX_ENERGY
      || typeof player.initiative !== "boolean"
    ) return null;
    return {
      health: player.health,
      energy: player.energy,
      initiative: player.initiative,
    };
  }

  function parseHistory(candidate, requireFrozen = false) {
    const rows = observeVariableArray(candidate, MAX_ROUNDS, requireFrozen);
    if (!rows) return null;
    const events = rows.map((event) => parseEvent(event, requireFrozen));
    return events.every(Boolean) ? events : null;
  }

  function parseEvent(candidate, requireFrozen = false) {
    const event = observeRecord(candidate, EVENT_KEYS, false, requireFrozen);
    const actions = event ? parseMoveArray(event.actions, requireFrozen) : null;
    if (
      !event
      || !Number.isInteger(event.roundIndex)
      || event.roundIndex < 1
      || event.roundIndex > MAX_ROUNDS
      || !(event.firstSeat === 0 || event.firstSeat === 1)
      || !actions
    ) return null;
    return {
      roundIndex: event.roundIndex,
      firstSeat: event.firstSeat,
      actions,
    };
  }

  function parseMoveArray(candidate, requireFrozen = false) {
    const moves = observeArray(candidate, PLAYER_COUNT, requireFrozen);
    return moves && moves.every((move) => ACTIONS.includes(move)) ? moves : null;
  }

  function parseSealedArray(candidate, requireFrozen = false) {
    const moves = observeArray(candidate, PLAYER_COUNT, requireFrozen);
    return moves && moves.every((move) => move === null || ACTIONS.includes(move)) ? moves : null;
  }

  function parseReducerAction(candidate) {
    const base = observeAnyRecord(candidate);
    if (!base) return null;
    const type = base.values.type;
    if (typeof type !== "string" || !Object.prototype.hasOwnProperty.call(ACTION_FIELDS, type)) return null;
    const expected = ["type", ...ACTION_FIELDS[type]];
    if (!sameKeySet(base.keys, expected)) return null;
    const action = { type };
    if (expected.includes("seat")) {
      if (!(base.values.seat === 0 || base.values.seat === 1)) return null;
      action.seat = base.values.seat;
    }
    if (expected.includes("move")) {
      if (!ACTIONS.includes(base.values.move)) return null;
      action.move = base.values.move;
    }
    return action;
  }

  function observeRecord(candidate, allowedKeys, allowMissing, requireFrozen = false) {
    const observed = observeAnyRecord(candidate, requireFrozen);
    if (!observed) return null;
    const validKeys = allowMissing
      ? observed.keys.every((key) => allowedKeys.includes(key))
      : sameKeySet(observed.keys, allowedKeys);
    if (!validKeys) return null;
    const result = Object.create(null);
    for (const key of allowedKeys) result[key] = observed.values[key];
    return result;
  }

  function observeAnyRecord(candidate, requireFrozen = false) {
    try {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
      const prototype = Object.getPrototypeOf(candidate);
      if (!(prototype === Object.prototype || prototype === null)) return null;
      const keys = Reflect.ownKeys(candidate);
      if (keys.some((key) => typeof key !== "string")) return null;
      if (requireFrozen && Object.isExtensible(candidate)) return null;
      const values = Object.create(null);
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        if (requireFrozen && (descriptor.configurable || descriptor.writable)) return null;
        values[key] = descriptor.value;
      }
      return { keys, values };
    } catch {
      return null;
    }
  }

  function observeArray(candidate, length, requireFrozen = false) {
    const values = observeVariableArray(candidate, length, requireFrozen);
    return values && values.length === length ? values : null;
  }

  function observeVariableArray(candidate, maxLength, requireFrozen = false) {
    try {
      if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype) return null;
      if (requireFrozen && Object.isExtensible(candidate)) return null;
      const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, "length");
      if (
        !lengthDescriptor
        || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
        || !Number.isInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || lengthDescriptor.value > maxLength
        || (requireFrozen && (lengthDescriptor.configurable || lengthDescriptor.writable))
      ) return null;
      const length = lengthDescriptor.value;
      const expectedKeys = Array.from({ length }, (_, index) => String(index)).concat("length");
      const keys = Reflect.ownKeys(candidate);
      if (!sameKeySet(keys, expectedKeys)) return null;
      const values = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        if (requireFrozen && (descriptor.configurable || descriptor.writable)) return null;
        values.push(descriptor.value);
      }
      return values;
    } catch {
      return null;
    }
  }

  function sameKeySet(actual, expected) {
    if (actual.length !== expected.length) return false;
    const set = new Set(expected);
    return actual.every((key) => typeof key === "string" && set.has(key));
  }

  function initialPlayers() {
    return [
      { health: START_HEALTH, energy: START_ENERGY, initiative: false },
      { health: START_HEALTH, energy: START_ENERGY, initiative: false },
    ];
  }

  function copyPlayers(players) {
    return players.map((player) => ({
      health: player.health,
      energy: player.energy,
      initiative: player.initiative,
    }));
  }

  function countSealed(sealedActions) {
    return sealedActions.reduce((count, move) => count + (move === null ? 0 : 1), 0);
  }

  return deepFreeze({
    VERSION,
    PLAYER_COUNT,
    START_HEALTH,
    START_ENERGY,
    MAX_HEALTH,
    MAX_ENERGY,
    MAX_ROUNDS,
    ATTACK_COST,
    TITLE,
    ACTIONS,
    PHASES,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    getPlayersBeforeRound,
    isActionAvailable,
    resolveRound,
    replayHistory,
    reduce,
    getScreenView,
  });
});
