(function (root, factory) {
  "use strict";

  let configApi = root && root.SoftSumoConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch {
      configApi = null;
    }
  }
  const api = factory(configApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.SoftSumoLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const TICK_RATE = 60;
  const ROUND_COUNT = 3;
  const VECTOR_SCALE = 4096;
  const DIRECTION_COUNT = 64;
  const PLAYER_RADIUS = 48;
  const SPAWN_DISTANCE = 220;
  const ARENA_START_RADIUS = 430;
  const ARENA_MIN_RADIUS = 270;
  const SHRINK_GRACE_TICKS = 480;
  const SHRINK_END_TICKS = 2700;
  const MAX_CHARGE_TICKS = 54;
  const DASH_COOLDOWN_TICKS = 39;
  const COUNTDOWN_TICKS = 150;
  const RESUME_COUNTDOWN_TICKS = 90;
  const MAX_CATCH_UP_TICKS = 5;
  const MAX_FRAME_GAP_MS = 500;
  const MIN_DASH_IMPULSE = 8;
  const MAX_DASH_IMPULSE = 22;
  const MAX_SPEED = 28;
  const DRAG_NUMERATOR = 940;
  const DRAG_DENOMINATOR = 1000;
  const RESTITUTION_NUMERATOR = 1;
  const RESTITUTION_DENOMINATOR = 4;
  const MAX_COLLISION_CORRECTION_PASSES = 4;
  const MAX_NAME_POINTS = 12;
  const MAX_NOTE_POINTS = 120;

  const PHASES = deepFreeze(["intro", "countdown", "playing", "paused", "round-result", "match-result"]);
  const PAUSE_REASONS = deepFreeze(["manual", "hidden", "blur", "stalled"]);
  const ACTION_TYPES = deepFreeze(["START", "STEP", "PAUSE", "RESUME", "NEXT_ROUND", "RESTART"]);
  const SPAWN_VARIANTS = deepFreeze([0, 16, 8]);
  const DIRECTION_VECTORS = deepFreeze([
    { x: 4096, y: 0 }, { x: 4076, y: 401 }, { x: 4017, y: 799 }, { x: 3920, y: 1189 },
    { x: 3784, y: 1567 }, { x: 3612, y: 1931 }, { x: 3406, y: 2276 }, { x: 3166, y: 2598 },
    { x: 2896, y: 2896 }, { x: 2598, y: 3166 }, { x: 2276, y: 3406 }, { x: 1931, y: 3612 },
    { x: 1567, y: 3784 }, { x: 1189, y: 3920 }, { x: 799, y: 4017 }, { x: 401, y: 4076 },
    { x: 0, y: 4096 }, { x: -401, y: 4076 }, { x: -799, y: 4017 }, { x: -1189, y: 3920 },
    { x: -1567, y: 3784 }, { x: -1931, y: 3612 }, { x: -2276, y: 3406 }, { x: -2598, y: 3166 },
    { x: -2896, y: 2896 }, { x: -3166, y: 2598 }, { x: -3406, y: 2276 }, { x: -3612, y: 1931 },
    { x: -3784, y: 1567 }, { x: -3920, y: 1189 }, { x: -4017, y: 799 }, { x: -4076, y: 401 },
    { x: -4096, y: 0 }, { x: -4076, y: -401 }, { x: -4017, y: -799 }, { x: -3920, y: -1189 },
    { x: -3784, y: -1567 }, { x: -3612, y: -1931 }, { x: -3406, y: -2276 }, { x: -3166, y: -2598 },
    { x: -2896, y: -2896 }, { x: -2598, y: -3166 }, { x: -2276, y: -3406 }, { x: -1931, y: -3612 },
    { x: -1567, y: -3784 }, { x: -1189, y: -3920 }, { x: -799, y: -4017 }, { x: -401, y: -4076 },
    { x: 0, y: -4096 }, { x: 401, y: -4076 }, { x: 799, y: -4017 }, { x: 1189, y: -3920 },
    { x: 1567, y: -3784 }, { x: 1931, y: -3612 }, { x: 2276, y: -3406 }, { x: 2598, y: -3166 },
    { x: 2896, y: -2896 }, { x: 3166, y: -2598 }, { x: 3406, y: -2276 }, { x: 3612, y: -1931 },
    { x: 3784, y: -1567 }, { x: 3920, y: -1189 }, { x: 4017, y: -799 }, { x: 4076, y: -401 },
  ]);
  const RULES = deepFreeze({
    ROUND_COUNT, VECTOR_SCALE, DIRECTION_COUNT, PLAYER_RADIUS, SPAWN_DISTANCE,
    ARENA_START_RADIUS, ARENA_MIN_RADIUS, SHRINK_GRACE_TICKS, SHRINK_END_TICKS,
    MAX_CHARGE_TICKS, DASH_COOLDOWN_TICKS, COUNTDOWN_TICKS, RESUME_COUNTDOWN_TICKS,
    MAX_CATCH_UP_TICKS, MAX_FRAME_GAP_MS, MIN_DASH_IMPULSE, MAX_DASH_IMPULSE,
    MAX_SPEED, DRAG_NUMERATOR, DRAG_DENOMINATOR, RESTITUTION_NUMERATOR,
    RESTITUTION_DENOMINATOR, MAX_COLLISION_CORRECTION_PASSES, SPAWN_VARIANTS,
  });
  const FALLBACK_DEFAULT_CONFIG = deepFreeze({
    playerNames: ["莓果", "海盐"],
    copy: {
      title: "软软相扑", subtitle: "推我可以，先站稳自己。", rule: "转向，按住，松开冲出去。",
      start: "开始第一轮", resume: "继续比赛", nextRound: "下一轮", restart: "再推一局",
      localOnly: "只在本机运行，刷新即重置。",
    },
  });
  const DEFAULT_CONFIG = isUsableDefaultConfig(configApi && configApi.DEFAULT_CONFIG)
    ? configApi.DEFAULT_CONFIG : FALLBACK_DEFAULT_CONFIG;
  const COPY_LIMITS = deepFreeze({
    title: 24, subtitle: 48, rule: 48, start: 16, resume: 16, nextRound: 16, restart: 16, localOnly: 48,
  });
  const STATE_KEYS = deepFreeze([
    "phase", "playerNames", "copy", "roundIndex", "roundTick", "countdownTicks", "spawnVariant",
    "players", "scores", "completedRounds", "currentInputLog", "pauseReason", "revision",
  ]);
  const COPY_KEYS = deepFreeze(Object.keys(COPY_LIMITS));
  const BODY_KEYS = deepFreeze([
    "seat", "x", "y", "vx", "vy", "aimIndex", "chargeTicks", "wasCharging", "cooldownTicks", "lastNormalIndex",
  ]);
  const ROUND_KEYS = deepFreeze(["roundIndex", "spawnVariant", "winnerIndex", "reason", "ticks", "inputLog"]);
  const INPUT_KEYS = deepFreeze(["turn", "charging"]);
  const STEP_EVENT_KEYS = deepFreeze(["type", "inputs"]);
  const CANCEL_EVENT_KEYS = deepFreeze(["type", "atTick"]);
  const ACTION_KEYS = deepFreeze({
    START: ["type"], STEP: ["type", "inputs"], PAUSE: ["type", "reason"],
    RESUME: ["type"], NEXT_ROUND: ["type"], RESTART: ["type"],
  });
  const SESSION_KEYS = deepFreeze(["config", "actions"]);
  const ROUND_REASONS = deepFreeze(["player-0-out", "player-1-out", "double-out"]);
  const trustedStates = new WeakSet();
  const strategyStore = new WeakMap();

  function sanitizeConfig(rawConfig, composeStrategy) {
    try {
      let source = safePlainObject(rawConfig);
      if (source && hasOwnData(source, "DEFAULT_CONFIG")) source = safePlainObject(readOwnData(source, "DEFAULT_CONFIG"));
      if (source && hasOwnData(source, "then")) source = null;
      const names = sanitizeNames(source ? readOwnData(source, "playerNames") : undefined);
      const rawCopy = source ? safePlainObject(readOwnData(source, "copy")) : null;
      const copy = {};
      for (const key of COPY_KEYS) {
        copy[key] = cleanText(rawCopy ? readOwnData(rawCopy, key) : undefined, COPY_LIMITS[key], DEFAULT_CONFIG.copy[key]);
      }
      const config = deepFreeze({ playerNames: names, copy });
      const strategy = typeof composeStrategy === "function" ? composeStrategy : null;
      if (strategy) strategyStore.set(config, strategy);
      return config;
    } catch {
      return deepFreeze({ playerNames: [...DEFAULT_CONFIG.playerNames], copy: { ...DEFAULT_CONFIG.copy } });
    }
  }

  function createInitialState(rawConfig) {
    const strategy = findComposeStrategy(rawConfig) || strategyStore.get(rawConfig) || null;
    const config = sanitizeConfig(rawConfig, strategy);
    if (strategy) strategyStore.set(config, strategy);
    const state = makeState({
      phase: "intro", playerNames: config.playerNames, copy: config.copy, roundIndex: 0, roundTick: 0,
      countdownTicks: 0, spawnVariant: 0, players: deriveSpawn(0), scores: [0, 0], completedRounds: [],
      currentInputLog: [], pauseReason: null, revision: 0,
    });
    if (strategy) strategyStore.set(state, strategy);
    return state;
  }

  function reduceSoftSumo(state, action) {
    let safeState;
    try {
      safeState = trustedStates.has(state) ? state : assertState(state);
    } catch {
      return createInitialState();
    }
    let parsed;
    try {
      parsed = parseAction(action);
    } catch {
      parsed = null;
    }
    if (!parsed) return safeState;
    const carryStrategy = strategyStore.get(state) || strategyStore.get(safeState) || null;
    let next = safeState;
    if (parsed.type === "START" && safeState.phase === "intro") {
      next = transition(safeState, {
        phase: "countdown", countdownTicks: COUNTDOWN_TICKS, players: deriveSpawn(0), revision: safeState.revision + 1,
      });
    } else if (parsed.type === "STEP" && safeState.phase === "countdown") {
      const countdownTicks = safeState.countdownTicks - 1;
      next = transition(safeState, {
        phase: countdownTicks === 0 ? "playing" : "countdown", countdownTicks,
        revision: safeState.revision + 1,
      });
    } else if (parsed.type === "STEP" && safeState.phase === "playing") {
      next = stepPlayingState(safeState, parsed.inputs);
    } else if (parsed.type === "PAUSE" && (safeState.phase === "countdown" || safeState.phase === "playing")) {
      next = transition(safeState, {
        phase: "paused", countdownTicks: 0, players: cancelPlayers(safeState.players),
        currentInputLog: appendCancelEvent(safeState.currentInputLog, safeState.roundTick),
        pauseReason: parsed.reason, revision: safeState.revision + 1,
      });
    } else if (parsed.type === "RESUME" && safeState.phase === "paused") {
      next = transition(safeState, {
        phase: "countdown", countdownTicks: RESUME_COUNTDOWN_TICKS, pauseReason: null,
        revision: safeState.revision + 1,
      });
    } else if (parsed.type === "NEXT_ROUND" && safeState.phase === "round-result") {
      const roundIndex = safeState.roundIndex + 1;
      next = transition(safeState, {
        phase: "countdown", roundIndex, roundTick: 0, countdownTicks: COUNTDOWN_TICKS,
        spawnVariant: roundIndex, players: deriveSpawn(roundIndex), currentInputLog: [], pauseReason: null,
        revision: safeState.revision + 1,
      });
    } else if (parsed.type === "RESTART" && safeState.phase === "match-result") {
      next = createInitialState({ playerNames: safeState.playerNames, copy: safeState.copy });
    }
    if (next !== safeState && carryStrategy) strategyStore.set(next, carryStrategy);
    return next;
  }

  function stepPlayingState(state, inputs) {
    const simulated = simulateRoundTick({ players: state.players, roundTick: state.roundTick }, inputs);
    const currentInputLog = [...state.currentInputLog, { type: "step", inputs: cloneInputPair(inputs) }];
    if (!simulated.outcome) {
      return transition(state, {
        players: simulated.players, roundTick: simulated.roundTick, currentInputLog,
        revision: state.revision + 1,
      });
    }
    const result = {
      roundIndex: state.roundIndex, spawnVariant: state.spawnVariant,
      winnerIndex: simulated.outcome.winnerIndex, reason: simulated.outcome.reason,
      ticks: simulated.roundTick, inputLog: currentInputLog,
    };
    const completedRounds = [...state.completedRounds, result];
    const scores = scoresFromRounds(completedRounds);
    return transition(state, {
      phase: state.roundIndex === ROUND_COUNT - 1 ? "match-result" : "round-result",
      players: simulated.players, roundTick: simulated.roundTick, scores, completedRounds,
      currentInputLog: [], countdownTicks: 0, pauseReason: null, revision: state.revision + 1,
    });
  }

  function simulateRoundTick(roundState, inputs) {
    const parsed = parseRoundState(roundState);
    const pair = parseInputPair(inputs);
    if (!parsed || !pair) throw new TypeError("invalid round state or inputs");
    const prepared = parsed.players.map((body, index) => prepareBodyForTick(body, pair[index]));
    const moved = prepared.map(({ body, impulse }) => integrateBody(applyImpulse(body, impulse)));
    const players = resolvePlayerCollision(moved);
    const roundTick = parsed.roundTick + 1;
    const arenaRadius = deriveArenaRadius(roundTick);
    const out = players.map((body) => isOutside(body, arenaRadius));
    let outcome = null;
    if (out[0] || out[1]) {
      outcome = out[0] && out[1]
        ? { winnerIndex: null, reason: "double-out" }
        : out[0]
          ? { winnerIndex: 1, reason: "player-0-out" }
          : { winnerIndex: 0, reason: "player-1-out" };
    }
    return deepFreeze({ players, roundTick, arenaRadius, outcome });
  }

  function prepareBodyForTick(body, input) {
    const aimIndex = modulo(body.aimIndex + input.turn, DIRECTION_COUNT);
    let cooldownTicks = Math.max(0, body.cooldownTicks - 1);
    let chargeTicks = body.chargeTicks;
    let wasCharging = body.wasCharging;
    let impulse = 0;
    if (cooldownTicks > 0) {
      chargeTicks = 0;
      wasCharging = false;
    } else if (input.charging) {
      chargeTicks = Math.min(MAX_CHARGE_TICKS, chargeTicks + 1);
      wasCharging = true;
    } else if (wasCharging) {
      impulse = deriveDashImpulse(chargeTicks);
      chargeTicks = 0;
      wasCharging = false;
      cooldownTicks = DASH_COOLDOWN_TICKS;
    } else {
      chargeTicks = 0;
    }
    return {
      body: { ...body, aimIndex, chargeTicks, wasCharging, cooldownTicks },
      impulse,
    };
  }

  function deriveDashImpulse(chargeTicks) {
    if (!Number.isInteger(chargeTicks) || chargeTicks < 1 || chargeTicks > MAX_CHARGE_TICKS) return 0;
    const denominator = MAX_CHARGE_TICKS;
    const smoothNumerator = chargeTicks * chargeTicks * (3 * denominator - 2 * chargeTicks);
    return MIN_DASH_IMPULSE + roundDiv(
      (MAX_DASH_IMPULSE - MIN_DASH_IMPULSE) * smoothNumerator,
      denominator * denominator * denominator,
    );
  }

  function applyImpulse(body, impulse) {
    if (impulse === 0) return body;
    const vector = DIRECTION_VECTORS[body.aimIndex];
    return {
      ...body,
      vx: clamp(body.vx + roundDiv(vector.x * impulse, VECTOR_SCALE), -MAX_SPEED, MAX_SPEED),
      vy: clamp(body.vy + roundDiv(vector.y * impulse, VECTOR_SCALE), -MAX_SPEED, MAX_SPEED),
    };
  }

  function integrateBody(body) {
    const vx = roundTowardZero(body.vx * DRAG_NUMERATOR, DRAG_DENOMINATOR);
    const vy = roundTowardZero(body.vy * DRAG_NUMERATOR, DRAG_DENOMINATOR);
    return { ...body, x: body.x + vx, y: body.y + vy, vx, vy };
  }

  function resolvePlayerCollision(inputPlayers) {
    const players = parseBodies(inputPlayers, true);
    if (!players) throw new TypeError("players must be two valid bodies");
    let first = { ...players[0] };
    let second = { ...players[1] };
    let dx = second.x - first.x;
    let dy = second.y - first.y;
    if (dx * dx + dy * dy >= (PLAYER_RADIUS * 2) ** 2) return deepFreeze([first, second]);
    let normalIndex = selectNormalIndex(dx, dy, first, second);
    const normal = DIRECTION_VECTORS[normalIndex];
    for (let pass = 0; pass < MAX_COLLISION_CORRECTION_PASSES; pass += 1) {
      dx = second.x - first.x;
      dy = second.y - first.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= (PLAYER_RADIUS * 2) ** 2) break;
      const penetration = PLAYER_RADIUS * 2 - integerSqrt(distanceSquared);
      const correction = Math.ceil(penetration / 2) + 1;
      const cx = roundDiv(normal.x * correction, VECTOR_SCALE);
      const cy = roundDiv(normal.y * correction, VECTOR_SCALE);
      first.x -= cx;
      first.y -= cy;
      second.x += cx;
      second.y += cy;
    }
    first.lastNormalIndex = normalIndex;
    second.lastNormalIndex = normalIndex;
    const relativeNormal = roundDiv(
      (second.vx - first.vx) * normal.x + (second.vy - first.vy) * normal.y,
      VECTOR_SCALE,
    );
    if (relativeNormal < 0) {
      const impulse = roundDiv(
        -relativeNormal * (RESTITUTION_DENOMINATOR + RESTITUTION_NUMERATOR),
        2 * RESTITUTION_DENOMINATOR,
      );
      const ix = roundDiv(impulse * normal.x, VECTOR_SCALE);
      const iy = roundDiv(impulse * normal.y, VECTOR_SCALE);
      first.vx = clamp(first.vx - ix, -MAX_SPEED, MAX_SPEED);
      first.vy = clamp(first.vy - iy, -MAX_SPEED, MAX_SPEED);
      second.vx = clamp(second.vx + ix, -MAX_SPEED, MAX_SPEED);
      second.vy = clamp(second.vy + iy, -MAX_SPEED, MAX_SPEED);
    }
    return deepFreeze([first, second]);
  }

  function selectNormalIndex(dx, dy, first, second) {
    if (dx === 0 && dy === 0) {
      if (first.lastNormalIndex === second.lastNormalIndex) return first.lastNormalIndex;
      return 0;
    }
    let bestIndex = 0;
    let bestDot = -Infinity;
    for (let index = 0; index < DIRECTION_COUNT; index += 1) {
      const vector = DIRECTION_VECTORS[index];
      const dot = dx * vector.x + dy * vector.y;
      if (dot > bestDot) {
        bestDot = dot;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  function deriveArenaRadius(roundTick) {
    assertNonNegativeInteger(roundTick, "roundTick");
    if (roundTick <= SHRINK_GRACE_TICKS) return ARENA_START_RADIUS;
    if (roundTick >= SHRINK_END_TICKS) return ARENA_MIN_RADIUS;
    return ARENA_START_RADIUS - Math.floor(
      (ARENA_START_RADIUS - ARENA_MIN_RADIUS) * (roundTick - SHRINK_GRACE_TICKS)
      / (SHRINK_END_TICKS - SHRINK_GRACE_TICKS),
    );
  }

  function deriveSpawn(spawnVariant) {
    if (!Number.isInteger(spawnVariant)) throw new TypeError("spawnVariant must be an integer");
    if (spawnVariant < 0 || spawnVariant >= SPAWN_VARIANTS.length) throw new RangeError("spawnVariant out of range");
    const axis = SPAWN_VARIANTS[spawnVariant];
    const firstDirection = DIRECTION_VECTORS[modulo(axis + 32, DIRECTION_COUNT)];
    const secondDirection = DIRECTION_VECTORS[axis];
    return deepFreeze([
      createBody(0, firstDirection, axis),
      createBody(1, secondDirection, modulo(axis + 32, DIRECTION_COUNT)),
    ]);
  }

  function createBody(seat, direction, aimIndex) {
    return {
      seat,
      x: roundDiv(direction.x * SPAWN_DISTANCE, VECTOR_SCALE),
      y: roundDiv(direction.y * SPAWN_DISTANCE, VECTOR_SCALE),
      vx: 0, vy: 0, aimIndex, chargeTicks: 0, wasCharging: false, cooldownTicks: 0, lastNormalIndex: 0,
    };
  }

  function replayRound(inputLog, spawnVariant) {
    const log = parseInputLog(inputLog);
    if (!log) throw new TypeError("invalid inputLog");
    const players = deriveSpawn(spawnVariant);
    let replay = deepFreeze({ players, roundTick: 0, arenaRadius: deriveArenaRadius(0), outcome: null });
    for (const event of log) {
      if (replay.outcome) throw new TypeError("input follows completed round");
      if (event.type === "cancel-charge") {
        if (event.atTick !== replay.roundTick) throw new TypeError("cancel event tick mismatch");
        replay = deepFreeze({ ...replay, players: cancelPlayers(replay.players) });
      } else {
        replay = simulateRoundTick({ players: replay.players, roundTick: replay.roundTick }, event.inputs);
      }
    }
    return replay;
  }

  function replaySession(log) {
    const source = readExactRecord(log, SESSION_KEYS);
    if (!source || !Array.isArray(source.actions)) throw new TypeError("invalid session log");
    const config = sanitizeConfig(source.config, findComposeStrategy(source.config));
    let state = createInitialState(config);
    for (const action of source.actions) {
      const parsed = parseAction(action);
      if (!parsed) throw new TypeError("invalid session action");
      state = reduceSoftSumo(state, parsed);
    }
    return state;
  }

  function assertState(candidate) {
    if (trustedStates.has(candidate)) return candidate;
    const source = readExactRecord(candidate, STATE_KEYS);
    if (!source) throw new TypeError("invalid state schema");
    const phase = source.phase;
    if (!PHASES.includes(phase)) throw new TypeError("invalid phase");
    const playerNames = parseNamesStrict(source.playerNames);
    const copy = parseCopyStrict(source.copy);
    const roundIndex = requireInteger(source.roundIndex, 0, ROUND_COUNT - 1, "roundIndex");
    const roundTick = requireInteger(source.roundTick, 0, Number.MAX_SAFE_INTEGER, "roundTick");
    const countdownTicks = requireInteger(source.countdownTicks, 0, COUNTDOWN_TICKS, "countdownTicks");
    const spawnVariant = requireInteger(source.spawnVariant, 0, 2, "spawnVariant");
    const players = parseBodies(source.players);
    const scores = parseScores(source.scores);
    const completedRounds = parseCompletedRounds(source.completedRounds);
    const currentInputLog = parseInputLog(source.currentInputLog);
    const pauseReason = source.pauseReason;
    const revision = requireInteger(source.revision, 0, Number.MAX_SAFE_INTEGER, "revision");
    if (!playerNames || !copy || !players || !scores || !completedRounds || !currentInputLog) throw new TypeError("invalid state value");
    validatePhase({ phase, roundIndex, roundTick, countdownTicks, spawnVariant, players, scores, completedRounds, currentInputLog, pauseReason, revision, playerNames, copy });
    const canonical = makeState({
      phase, playerNames, copy, roundIndex, roundTick, countdownTicks, spawnVariant, players, scores,
      completedRounds, currentInputLog, pauseReason, revision,
    });
    return canonical;
  }

  function validatePhase(state) {
    const expectedScores = scoresFromRounds(state.completedRounds);
    if (!sameJson(expectedScores, state.scores)) throw new TypeError("scores do not match rounds");
    if (state.completedRounds.length > ROUND_COUNT) throw new TypeError("too many rounds");
    state.completedRounds.forEach((round, index) => {
      if (round.roundIndex !== index || round.spawnVariant !== index || round.ticks !== countStepEvents(round.inputLog)) {
        throw new TypeError("invalid completed round sequence");
      }
      const replay = replayRound(round.inputLog, round.spawnVariant);
      if (!replay.outcome || replay.roundTick !== round.ticks
        || replay.outcome.winnerIndex !== round.winnerIndex || replay.outcome.reason !== round.reason) {
        throw new TypeError("completed round replay mismatch");
      }
    });
    if (state.phase === "intro") {
      const initial = deriveSpawn(0);
      if (state.roundIndex !== 0 || state.roundTick !== 0 || state.countdownTicks !== 0 || state.spawnVariant !== 0
        || state.completedRounds.length !== 0 || state.currentInputLog.length !== 0 || state.pauseReason !== null
        || state.revision !== 0 || !sameJson(state.players, initial) || !sameJson(state.scores, [0, 0])) {
        throw new TypeError("invalid intro state");
      }
      return;
    }
    if (state.roundIndex !== state.completedRounds.length || state.spawnVariant !== state.roundIndex) {
      if (state.phase !== "round-result" && state.phase !== "match-result") throw new TypeError("invalid active round index");
    }
    if (["countdown", "playing", "paused"].includes(state.phase)) {
      if (state.roundIndex !== state.completedRounds.length || state.roundTick !== countStepEvents(state.currentInputLog)) {
        throw new TypeError("active round log mismatch");
      }
      const replay = replayRound(state.currentInputLog, state.spawnVariant);
      if (replay.outcome || replay.roundTick !== state.roundTick || !sameJson(replay.players, state.players)) {
        throw new TypeError("current round replay mismatch");
      }
    }
    if (state.phase === "countdown") {
      if (state.countdownTicks < 1 || state.pauseReason !== null) throw new TypeError("invalid countdown");
    } else if (state.phase === "playing") {
      if (state.countdownTicks !== 0 || state.pauseReason !== null) throw new TypeError("invalid playing state");
    } else if (state.phase === "paused") {
      if (state.countdownTicks !== 0 || !PAUSE_REASONS.includes(state.pauseReason)) throw new TypeError("invalid paused state");
    } else if (state.phase === "round-result" || state.phase === "match-result") {
      const expectedLength = state.roundIndex + 1;
      if (state.completedRounds.length !== expectedLength || state.currentInputLog.length !== 0
        || state.countdownTicks !== 0 || state.pauseReason !== null) throw new TypeError("invalid result state");
      const replay = replayRound(state.completedRounds.at(-1).inputLog, state.spawnVariant);
      if (!sameJson(replay.players, state.players) || state.roundTick !== replay.roundTick) throw new TypeError("result players mismatch");
      if (state.phase === "round-result" && expectedLength >= ROUND_COUNT) throw new TypeError("late round result");
      if (state.phase === "match-result" && expectedLength !== ROUND_COUNT) throw new TypeError("early match result");
    }
  }

  function getSoftSumoView(state) {
    let safe;
    try {
      safe = trustedStates.has(state) ? state : assertState(state);
    } catch {
      safe = createInitialState();
    }
    const arenaRadius = deriveArenaRadius(safe.roundTick);
    const lastRound = safe.completedRounds.at(-1) || null;
    const result = (safe.phase === "round-result" || safe.phase === "match-result") ? {
      winnerIndex: safe.phase === "match-result" ? winnerFromScores(safe.scores) : lastRound.winnerIndex,
      isDraw: safe.phase === "match-result" ? safe.scores[0] === safe.scores[1] : lastRound.winnerIndex === null,
      reason: lastRound.reason,
      rounds: safe.completedRounds.map(presentRound),
    } : null;
    const view = {
      phase: safe.phase, title: safe.copy.title, subtitle: safe.copy.subtitle, rule: safe.copy.rule,
      playerNames: [...safe.playerNames], scores: [...safe.scores], roundNumber: safe.roundIndex + 1,
      roundCount: ROUND_COUNT,
      countdownLabel: safe.phase === "countdown" ? String(Math.max(1, Math.ceil(safe.countdownTicks / TICK_RATE))) : null,
      arenaRadius, arenaRatio: (arenaRadius - ARENA_MIN_RADIUS) / (ARENA_START_RADIUS - ARENA_MIN_RADIUS),
      players: safe.players.map((body) => ({
        seat: body.seat, x: body.x, y: body.y, aimIndex: body.aimIndex,
        chargeRatio: body.chargeTicks / MAX_CHARGE_TICKS,
        cooldownRatio: body.cooldownTicks / DASH_COOLDOWN_TICKS,
        canTurn: safe.phase === "playing", canCharge: safe.phase === "playing" && body.cooldownTicks === 0,
        patternLabel: body.seat === 0 ? "莓果斜纹" : "海盐点纹",
      })),
      status: statusFor(safe, lastRound), result,
      canStart: safe.phase === "intro", canPause: safe.phase === "countdown" || safe.phase === "playing",
      canResume: safe.phase === "paused", canNextRound: safe.phase === "round-result", canRestart: safe.phase === "match-result",
    };
    return deepFreeze(view);
  }

  function resolveMatchNote(state, rawConfig) {
    let safe;
    try {
      safe = trustedStates.has(state) ? state : assertState(state);
    } catch {
      return null;
    }
    if (safe.phase !== "match-result") return null;
    const winnerIndex = winnerFromScores(safe.scores);
    const defaultNote = winnerIndex === null
      ? "一起出圈，也算默契。下一局再站稳一点。"
      : `这局，${safe.playerNames[winnerIndex]}站得更稳。下一局也别手软。`;
    const summary = deepFreeze({
      playerNames: [...safe.playerNames], scores: [...safe.scores], rounds: safe.completedRounds.map(presentRound),
      winnerIndex, isDraw: winnerIndex === null, defaultNote,
    });
    const strategy = findComposeStrategy(rawConfig) || strategyStore.get(rawConfig) || strategyStore.get(state)
      || (typeof configApi?.composeMatchNote === "function" ? configApi.composeMatchNote : null);
    if (!strategy) return defaultNote;
    try {
      const result = strategy(summary);
      return cleanText(result, MAX_NOTE_POINTS, defaultNote);
    } catch {
      return defaultNote;
    }
  }

  function statusFor(state, lastRound) {
    if (state.phase === "intro") return state.copy.subtitle;
    if (state.phase === "countdown") return `第 ${state.roundIndex + 1} 轮，${Math.max(1, Math.ceil(state.countdownTicks / TICK_RATE))} 秒后开始。`;
    if (state.phase === "playing") return `第 ${state.roundIndex + 1} 轮，擂台正在收紧。`;
    if (state.phase === "paused") return state.pauseReason === "manual" ? "比赛已暂停。" : "离开或间隔过久，比赛已安全暂停。";
    if (lastRound.winnerIndex === null) return "一起出圈，本轮平局。";
    if (state.phase === "round-result") return `这一轮，${state.playerNames[lastRound.winnerIndex]}站得更稳。`;
    const winner = winnerFromScores(state.scores);
    return winner === null ? "三轮结束，这局平分。" : `三轮结束，${state.playerNames[winner]}获胜。`;
  }

  function presentRound(round) {
    return { roundIndex: round.roundIndex, winnerIndex: round.winnerIndex, reason: round.reason };
  }

  function transition(state, changes) {
    const next = makeState({ ...state, ...changes });
    const strategy = strategyStore.get(state);
    if (strategy) strategyStore.set(next, strategy);
    return next;
  }

  function makeState(value) {
    const state = deepFreeze({
      phase: value.phase, playerNames: [...value.playerNames], copy: { ...value.copy }, roundIndex: value.roundIndex,
      roundTick: value.roundTick, countdownTicks: value.countdownTicks, spawnVariant: value.spawnVariant,
      players: value.players.map((body) => ({ ...body })), scores: [...value.scores],
      completedRounds: value.completedRounds.map((round) => ({
        ...round, inputLog: round.inputLog.map(cloneLogEvent),
      })),
      currentInputLog: value.currentInputLog.map(cloneLogEvent), pauseReason: value.pauseReason, revision: value.revision,
    });
    trustedStates.add(state);
    return state;
  }

  function cancelPlayers(players) {
    return deepFreeze(players.map((body) => ({ ...body, chargeTicks: 0, wasCharging: false })));
  }

  function cloneInputPair(pair) {
    return pair.map((input) => ({ turn: input.turn, charging: input.charging }));
  }

  function cloneLogEvent(event) {
    return event.type === "step"
      ? { type: "step", inputs: cloneInputPair(event.inputs) }
      : { type: "cancel-charge", atTick: event.atTick };
  }

  function appendCancelEvent(log, atTick) {
    const last = log.at(-1);
    if (last && last.type === "cancel-charge" && last.atTick === atTick) return log;
    return [...log, { type: "cancel-charge", atTick }];
  }

  function parseAction(action) {
    const type = safeReadType(action);
    if (!ACTION_TYPES.includes(type)) return null;
    const source = readExactRecord(action, ACTION_KEYS[type]);
    if (!source) return null;
    if (type === "STEP") {
      const inputs = parseInputPair(source.inputs);
      return inputs ? deepFreeze({ type, inputs }) : null;
    }
    if (type === "PAUSE") return PAUSE_REASONS.includes(source.reason) ? deepFreeze({ type, reason: source.reason }) : null;
    return deepFreeze({ type });
  }

  function parseRoundState(value) {
    const source = readExactRecord(value, ["players", "roundTick"]);
    if (!source) return null;
    const players = parseBodies(source.players);
    if (!players || !isSafeNonNegativeInteger(source.roundTick)) return null;
    return { players, roundTick: source.roundTick };
  }

  function parseBodies(value, allowSeatNormalization = false) {
    if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3) return null;
    const bodies = value.map(parseBody);
    if (!bodies[0] || !bodies[1] || bodies[0].seat === bodies[1].seat) return null;
    if (allowSeatNormalization) bodies.sort((a, b) => a.seat - b.seat);
    if (bodies[0].seat !== 0 || bodies[1].seat !== 1) return null;
    return bodies;
  }

  function parseBody(value) {
    const source = readExactRecord(value, BODY_KEYS);
    if (!source) return null;
    for (const key of ["seat", "x", "y", "vx", "vy", "aimIndex", "chargeTicks", "cooldownTicks", "lastNormalIndex"]) {
      if (!Number.isSafeInteger(source[key])) return null;
    }
    if (![0, 1].includes(source.seat) || Math.abs(source.vx) > MAX_SPEED || Math.abs(source.vy) > MAX_SPEED
      || source.aimIndex < 0 || source.aimIndex >= DIRECTION_COUNT || source.chargeTicks < 0
      || source.chargeTicks > MAX_CHARGE_TICKS || source.cooldownTicks < 0
      || source.cooldownTicks > DASH_COOLDOWN_TICKS || source.lastNormalIndex < 0
      || source.lastNormalIndex >= DIRECTION_COUNT || typeof source.wasCharging !== "boolean") return null;
    if (source.wasCharging !== (source.chargeTicks > 0) || (source.cooldownTicks > 0 && source.chargeTicks !== 0)) return null;
    return { ...source };
  }

  function parseInputPair(value) {
    if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3) return null;
    const parsed = value.map(parseInput);
    return parsed[0] && parsed[1] ? deepFreeze(parsed) : null;
  }

  function parseInput(value) {
    const source = readExactRecord(value, INPUT_KEYS);
    if (!source || ![-1, 0, 1].includes(source.turn) || typeof source.charging !== "boolean") return null;
    return { turn: source.turn, charging: source.charging };
  }

  function parseInputLog(value) {
    if (!Array.isArray(value) || Reflect.ownKeys(value).length !== value.length + 1) return null;
    const log = [];
    let stepCount = 0;
    let previousCancelTick = null;
    for (const event of value) {
      const parsed = parseLogEvent(event, stepCount);
      if (!parsed) return null;
      if (parsed.type === "cancel-charge" && parsed.atTick === previousCancelTick) return null;
      log.push(parsed);
      if (parsed.type === "step") {
        stepCount += 1;
        previousCancelTick = null;
      } else {
        previousCancelTick = parsed.atTick;
      }
    }
    return log;
  }

  function countStepEvents(log) {
    let count = 0;
    for (const event of log) if (event.type === "step") count += 1;
    return count;
  }

  function parseLogEvent(value, stepCount) {
    const type = safeReadType(value);
    if (type === "step") {
      const source = readExactRecord(value, STEP_EVENT_KEYS);
      const inputs = source && parseInputPair(source.inputs);
      return inputs ? deepFreeze({ type, inputs }) : null;
    }
    if (type === "cancel-charge") {
      const source = readExactRecord(value, CANCEL_EVENT_KEYS);
      if (!source || source.atTick !== stepCount) return null;
      return deepFreeze({ type, atTick: source.atTick });
    }
    return null;
  }

  function parseCompletedRounds(value) {
    if (!Array.isArray(value) || Reflect.ownKeys(value).length !== value.length + 1) return null;
    return value.map((entry) => {
      const source = readExactRecord(entry, ROUND_KEYS);
      if (!source) return null;
      const inputLog = parseInputLog(source.inputLog);
      if (!inputLog || !Number.isSafeInteger(source.roundIndex) || !Number.isSafeInteger(source.spawnVariant)
        || !Number.isSafeInteger(source.ticks) || ![0, 1, null].includes(source.winnerIndex)
        || !ROUND_REASONS.includes(source.reason)) return null;
      return { ...source, inputLog };
    });
  }

  function parseNamesStrict(value) {
    if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3) return null;
    if (value.some((name) => typeof name !== "string" || name.trim() !== name || !name || [...name].length > MAX_NAME_POINTS)) return null;
    return [...value];
  }

  function sanitizeNames(value) {
    try {
      if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3) {
        return [...DEFAULT_CONFIG.playerNames];
      }
      const first = cleanText(safeArrayValue(value, 0), MAX_NAME_POINTS, DEFAULT_CONFIG.playerNames[0]);
      const second = cleanText(safeArrayValue(value, 1), MAX_NAME_POINTS, DEFAULT_CONFIG.playerNames[1]);
      return [first, second];
    } catch {
      return [...DEFAULT_CONFIG.playerNames];
    }
  }

  function parseCopyStrict(value) {
    const source = readExactRecord(value, COPY_KEYS);
    if (!source) return null;
    const copy = {};
    for (const key of COPY_KEYS) {
      if (typeof source[key] !== "string" || source[key].trim() !== source[key] || !source[key]
        || [...source[key]].length > COPY_LIMITS[key]) return null;
      copy[key] = source[key];
    }
    return copy;
  }

  function parseScores(value) {
    if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3
      || value.some((score) => !Number.isSafeInteger(score) || score < 0 || score > ROUND_COUNT)) return null;
    return [...value];
  }

  function scoresFromRounds(rounds) {
    const scores = [0, 0];
    for (const round of rounds) if (round && round.winnerIndex !== null) scores[round.winnerIndex] += 1;
    return scores;
  }

  function winnerFromScores(scores) {
    return scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
  }

  function isOutside(body, arenaRadius) {
    return integerSqrt(body.x * body.x + body.y * body.y) + PLAYER_RADIUS > arenaRadius;
  }

  function integerSqrt(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("value must be a non-negative safe integer");
    if (value < 2) return value;
    let low = 1;
    let high = Math.min(value, 94906265);
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const square = middle * middle;
      if (square === value) return middle;
      if (square < value) low = middle + 1;
      else high = middle - 1;
    }
    return high;
  }

  function roundDiv(numerator, denominator) {
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
      throw new TypeError("roundDiv requires safe integers");
    }
    const sign = numerator < 0 ? -1 : 1;
    return sign * Math.floor((Math.abs(numerator) + Math.floor(denominator / 2)) / denominator);
  }

  function roundTowardZero(numerator, denominator) {
    const quotient = numerator / denominator;
    return quotient < 0 ? Math.ceil(quotient) : Math.floor(quotient);
  }

  function modulo(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function cleanText(value, limit, fallback) {
    if (typeof value !== "string") return fallback;
    const cleaned = value.trim().replace(/\s+/gu, " ");
    return cleaned && [...cleaned].length <= limit ? cleaned : fallback;
  }

  function findComposeStrategy(rawConfig) {
    if (typeof rawConfig === "function") return rawConfig;
    const source = safePlainObject(rawConfig);
    const candidate = source ? readOwnData(source, "composeMatchNote") : undefined;
    return typeof candidate === "function" ? candidate : null;
  }

  function isUsableDefaultConfig(value) {
    try {
      return Boolean(parseNamesStrict(value.playerNames) && parseCopyStrict(value.copy));
    } catch {
      return false;
    }
  }

  function safePlainObject(value) {
    try {
      return value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype ? value : null;
    } catch {
      return null;
    }
  }

  function readExactRecord(value, keys) {
    try {
      if (!safePlainObject(value)) return null;
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
      const result = {};
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return null;
        result[key] = descriptor.value;
      }
      return result;
    } catch {
      return null;
    }
  }

  function safeReadType(value) {
    try {
      if (!safePlainObject(value)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, "type");
      return descriptor && "value" in descriptor ? descriptor.value : null;
    } catch {
      return null;
    }
  }

  function hasOwnData(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return Boolean(descriptor && "value" in descriptor);
    } catch {
      return false;
    }
  }

  function readOwnData(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  }

  function safeArrayValue(value, index) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      return descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  }

  function requireInteger(value, minimum, maximum, label) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new TypeError(`invalid ${label}`);
    return value;
  }

  function assertNonNegativeInteger(value, label) {
    if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
    if (value < 0) throw new RangeError(`${label} must be non-negative`);
  }

  function isSafeNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  return deepFreeze({
    VERSION, TICK_RATE, PHASES, PAUSE_REASONS, ACTION_TYPES, RULES, DIRECTION_VECTORS, DEFAULT_CONFIG,
    sanitizeConfig, createInitialState, reduceSoftSumo, assertState, getSoftSumoView, resolveMatchNote,
    deriveArenaRadius, deriveSpawn, simulateRoundTick, resolvePlayerCollision, replayRound, replaySession, deepFreeze,
  });
});
