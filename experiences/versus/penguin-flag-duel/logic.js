(function (root, factory) {
  "use strict";

  let configApi = root && root.PenguinFlagDuelConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch {
      configApi = null;
    }
  }
  const api = factory(configApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.PenguinFlagDuelLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const TICK_RATE = 60;
  const FIXED_SCALE = 256;
  const NORMAL_SCALE = 4096;
  const INITIAL_COUNTDOWN_TICKS = 150;
  const RESUME_COUNTDOWN_TICKS = 90;
  const CAPTURE_RESET_TICKS = 90;
  const MATCH_LIVE_TICKS = 5400;
  const FLAG_PICKUP_LOCK_TICKS = 15;
  const FLAG_RESET_TICKS = 480;
  const MAX_CATCH_UP_TICKS = 5;
  const MAX_FRAME_GAP_MS = 250;
  const WORLD_WIDTH = 1024 * FIXED_SCALE;
  const WORLD_HEIGHT = 640 * FIXED_SCALE;
  const BASE_DEPTH = 144 * FIXED_SCALE;
  const PLAYER_RADIUS = 28 * FIXED_SCALE;
  const FLAG_RADIUS = 14 * FIXED_SCALE;
  const ACCEL_CARDINAL = 40;
  const ACCEL_DIAGONAL = 28;
  const DAMPING_NUMERATOR = 255;
  const DAMPING_DENOMINATOR = 256;
  const MAX_SPEED = 1024;
  const CARRIER_MAX_SPEED = 768;
  const CARRIER_ACCEL_NUMERATOR = 3;
  const CARRIER_ACCEL_DENOMINATOR = 4;
  const RESTITUTION_NUMERATOR = 1;
  const RESTITUTION_DENOMINATOR = 4;
  const MAX_COLLISION_PASSES = 4;
  const TARGET_SCORE = 3;

  const LEFT_SPAWN = deepFreeze({ x: 160 * FIXED_SCALE, y: 320 * FIXED_SCALE });
  const FLAG_HOME = deepFreeze({ x: 512 * FIXED_SCALE, y: 320 * FIXED_SCALE });
  const PHASES = deepFreeze(["intro", "countdown", "playing", "paused", "capture-reset", "match-result"]);
  const PAUSE_REASONS = deepFreeze(["manual", "hidden", "blur", "pagehide", "stalled"]);
  const ACTION_TYPES = deepFreeze(["START", "STEP", "PAUSE", "RESUME", "RESTART"]);
  const INTENT_ACCELERATIONS = deepFreeze([
    { x: 0, y: 0 },
    { x: 0, y: -ACCEL_CARDINAL },
    { x: ACCEL_DIAGONAL, y: -ACCEL_DIAGONAL },
    { x: ACCEL_CARDINAL, y: 0 },
    { x: ACCEL_DIAGONAL, y: ACCEL_DIAGONAL },
    { x: 0, y: ACCEL_CARDINAL },
    { x: -ACCEL_DIAGONAL, y: ACCEL_DIAGONAL },
    { x: -ACCEL_CARDINAL, y: 0 },
    { x: -ACCEL_DIAGONAL, y: -ACCEL_DIAGONAL },
  ]);
  const NORMAL_VECTORS = deepFreeze([
    { x: 4096, y: 0 }, { x: 3784, y: 1567 }, { x: 2896, y: 2896 }, { x: 1567, y: 3784 },
    { x: 0, y: 4096 }, { x: -1567, y: 3784 }, { x: -2896, y: 2896 }, { x: -3784, y: 1567 },
    { x: -4096, y: 0 }, { x: -3784, y: -1567 }, { x: -2896, y: -2896 }, { x: -1567, y: -3784 },
    { x: 0, y: -4096 }, { x: 1567, y: -3784 }, { x: 2896, y: -2896 }, { x: 3784, y: -1567 },
  ]);
  const OBSTACLES = deepFreeze([
    scaleBox({ minX: 448, maxX: 576, minY: 168, maxY: 216 }),
    scaleBox({ minX: 448, maxX: 576, minY: 424, maxY: 472 }),
  ]);
  const RULES = deepFreeze({
    FIXED_SCALE, NORMAL_SCALE, INITIAL_COUNTDOWN_TICKS, RESUME_COUNTDOWN_TICKS,
    CAPTURE_RESET_TICKS, MATCH_LIVE_TICKS, FLAG_PICKUP_LOCK_TICKS, FLAG_RESET_TICKS,
    MAX_CATCH_UP_TICKS, MAX_FRAME_GAP_MS, WORLD_WIDTH, WORLD_HEIGHT, BASE_DEPTH,
    PLAYER_RADIUS, FLAG_RADIUS, ACCEL_CARDINAL, ACCEL_DIAGONAL, DAMPING_NUMERATOR,
    DAMPING_DENOMINATOR, MAX_SPEED, CARRIER_MAX_SPEED, CARRIER_ACCEL_NUMERATOR,
    CARRIER_ACCEL_DENOMINATOR, RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR,
    MAX_COLLISION_PASSES, TARGET_SCORE, LEFT_SPAWN, FLAG_HOME, OBSTACLES,
  });

  const FALLBACK_CONFIG = deepFreeze({
    playerNames: ["左左", "右右"],
    copy: {
      title: "企鹅冰原夺旗",
      subtitle: "抢到旗只是开始，带回家才算得分。",
      start: "开始比赛",
      restart: "再抢一局",
      resume: "继续比赛",
      localOnly: "只在本机运行，刷新即重置。",
    },
  });
  const COPY_LIMITS = deepFreeze({
    title: 24, subtitle: 64, start: 16, restart: 16, resume: 16, localOnly: 64,
  });
  const COPY_KEYS = deepFreeze(Object.keys(COPY_LIMITS));
  const CONFIG_KEYS = deepFreeze(["playerNames", "copy"]);
  const DEFAULT_CONFIG = resolveDefaultConfig(configApi);
  const STATE_KEYS = deepFreeze([
    "version", "phase", "playerNames", "copy", "players", "flag", "scores",
    "liveTicksRemaining", "countdownTicks", "pauseReason", "lastCaptureSeat", "result", "revision",
  ]);
  const PLAYER_KEYS = deepFreeze(["seat", "x", "y", "vx", "vy", "lastNormalIndex"]);
  const FLAG_KEYS = deepFreeze(["x", "y", "carrierSeat", "pickupLockTicks", "looseTicks"]);
  const RESULT_KEYS = deepFreeze(["winnerSeat", "reason"]);
  const REPLAY_KEYS = deepFreeze(["version", "config", "actions"]);
  const ACTION_KEYS = deepFreeze({
    START: ["type", "expectedRevision"],
    STEP: ["type", "expectedRevision", "intents"],
    PAUSE: ["type", "expectedRevision", "reason"],
    RESUME: ["type", "expectedRevision"],
    RESTART: ["type", "expectedRevision"],
  });
  const trustedStates = new WeakSet();

  function sanitizeConfig(rawConfig) {
    try {
      const source = safePlainRecord(rawConfig);
      if (!source || hasOwnData(source, "then")) return cloneDefaultConfig();
      const names = sanitizeNames(readOwnData(source, "playerNames"));
      const rawCopy = safePlainRecord(readOwnData(source, "copy"));
      const copy = {};
      for (const key of COPY_KEYS) {
        copy[key] = cleanText(
          rawCopy ? readOwnData(rawCopy, key) : undefined,
          COPY_LIMITS[key],
          DEFAULT_CONFIG.copy[key],
        );
      }
      return deepFreeze({ playerNames: names || [...DEFAULT_CONFIG.playerNames], copy });
    } catch {
      return cloneDefaultConfig();
    }
  }

  function createInitialState(rawConfig) {
    const config = sanitizeConfig(rawConfig);
    return makeState({
      version: VERSION,
      phase: "intro",
      playerNames: config.playerNames,
      copy: config.copy,
      players: deriveSpawn(),
      flag: createHomeFlag(),
      scores: [0, 0],
      liveTicksRemaining: MATCH_LIVE_TICKS,
      countdownTicks: 0,
      pauseReason: null,
      lastCaptureSeat: null,
      result: null,
      revision: 0,
    });
  }

  function reducePenguinFlagDuel(state, action) {
    let safeState;
    try {
      safeState = trustedStates.has(state) ? state : assertState(state);
    } catch {
      return createInitialState();
    }
    const parsed = parseAction(action, safeState.revision);
    if (!parsed) return safeState;

    if (parsed.type === "START" && safeState.phase === "intro") {
      return transition(safeState, {
        phase: "countdown",
        players: deriveSpawn(),
        flag: createHomeFlag(),
        scores: [0, 0],
        liveTicksRemaining: MATCH_LIVE_TICKS,
        countdownTicks: INITIAL_COUNTDOWN_TICKS,
        pauseReason: null,
        lastCaptureSeat: null,
        result: null,
      });
    }
    if (parsed.type === "STEP" && safeState.phase === "countdown") {
      const countdownTicks = safeState.countdownTicks - 1;
      return transition(safeState, {
        phase: countdownTicks === 0 ? "playing" : "countdown",
        countdownTicks,
        pauseReason: null,
        lastCaptureSeat: countdownTicks === 0 ? null : safeState.lastCaptureSeat,
      });
    }
    if (parsed.type === "STEP" && safeState.phase === "capture-reset") {
      const countdownTicks = safeState.countdownTicks - 1;
      return transition(safeState, {
        phase: countdownTicks === 0 ? "playing" : "capture-reset",
        countdownTicks,
        lastCaptureSeat: countdownTicks === 0 ? null : safeState.lastCaptureSeat,
      });
    }
    if (parsed.type === "STEP" && safeState.phase === "playing") {
      return simulatePlayingTick(safeState, parsed.intents);
    }
    if (parsed.type === "PAUSE" && ["countdown", "playing", "capture-reset"].includes(safeState.phase)) {
      return transition(safeState, {
        phase: "paused",
        countdownTicks: 0,
        pauseReason: parsed.reason,
      });
    }
    if (parsed.type === "RESUME" && safeState.phase === "paused") {
      return transition(safeState, {
        phase: "countdown",
        countdownTicks: RESUME_COUNTDOWN_TICKS,
        pauseReason: null,
      });
    }
    if (parsed.type === "RESTART" && safeState.phase === "match-result") {
      return transition(safeState, {
        phase: "countdown",
        players: deriveSpawn(),
        flag: createHomeFlag(),
        scores: [0, 0],
        liveTicksRemaining: MATCH_LIVE_TICKS,
        countdownTicks: INITIAL_COUNTDOWN_TICKS,
        pauseReason: null,
        lastCaptureSeat: null,
        result: null,
      });
    }
    return safeState;
  }

  function simulatePlayingTick(state, intents) {
    const pair = parseIntentPair(intents);
    if (!pair) throw new TypeError("intents must contain two integers in 0..8");
    const startingCarrier = state.flag.carrierSeat;
    const moved = state.players.map((player, seat) => resolvePlayerMotion(
      player,
      pair[seat],
      startingCarrier === seat,
    ));
    const collision = resolvePlayerCollision(moved, startingCarrier);
    let flag = startingCarrier === null
      ? { ...state.flag }
      : {
        ...state.flag,
        x: collision.players[startingCarrier].x,
        y: collision.players[startingCarrier].y,
      };
    let droppedThisTick = false;
    if (collision.contacted && startingCarrier !== null) {
      flag = dropFlag(collision.players);
      droppedThisTick = true;
    } else if (flag.carrierSeat === null && flag.pickupLockTicks === 0) {
      flag = resolveFlagPickup(flag, collision.players);
    }

    let scores = [...state.scores];
    let capturedSeat = null;
    if (!droppedThisTick && flag.carrierSeat !== null && isInsideOwnBase(collision.players[flag.carrierSeat])) {
      capturedSeat = flag.carrierSeat;
      scores[capturedSeat] += 1;
    }
    if (capturedSeat === null) flag = ageLooseFlag(flag, droppedThisTick);

    const liveTicksRemaining = state.liveTicksRemaining - 1;
    const terminal = resolveTerminal(scores, liveTicksRemaining);
    const phase = terminal ? "match-result" : capturedSeat === null ? "playing" : "capture-reset";
    const players = capturedSeat === null ? collision.players : deriveSpawn();
    return transition(state, {
      phase,
      players,
      flag: capturedSeat === null ? flag : createHomeFlag(),
      scores,
      liveTicksRemaining,
      result: terminal,
      countdownTicks: phase === "capture-reset" ? CAPTURE_RESET_TICKS : 0,
      pauseReason: null,
      lastCaptureSeat: capturedSeat,
    });
  }

  function dropFlag(players) {
    const midpoint = {
      x: roundTowardZero(players[0].x + players[1].x, 2),
      y: roundTowardZero(players[0].y + players[1].y, 2),
    };
    const point = legalizeFlagPoint(midpoint);
    return {
      x: point.x,
      y: point.y,
      carrierSeat: null,
      pickupLockTicks: FLAG_PICKUP_LOCK_TICKS,
      looseTicks: 0,
    };
  }

  function resolveFlagPickup(flag, players) {
    const thresholdSquared = (PLAYER_RADIUS + FLAG_RADIUS) ** 2;
    const distances = players.map((player) => (
      (player.x - flag.x) ** 2 + (player.y - flag.y) ** 2
    ));
    const candidates = distances.map((distance) => distance <= thresholdSquared);
    let carrierSeat = null;
    if (candidates[0] && candidates[1]) {
      if (distances[0] !== distances[1]) carrierSeat = distances[0] < distances[1] ? 0 : 1;
    } else if (candidates[0] || candidates[1]) {
      carrierSeat = candidates[0] ? 0 : 1;
    }
    if (carrierSeat === null) return flag;
    return {
      x: players[carrierSeat].x,
      y: players[carrierSeat].y,
      carrierSeat,
      pickupLockTicks: 0,
      looseTicks: 0,
    };
  }

  function ageLooseFlag(flag, droppedThisTick) {
    if (flag.carrierSeat !== null || droppedThisTick) return flag;
    if (flag.pickupLockTicks > 0) {
      return { ...flag, pickupLockTicks: flag.pickupLockTicks - 1, looseTicks: 0 };
    }
    if (flag.x === FLAG_HOME.x && flag.y === FLAG_HOME.y && flag.looseTicks === 0) return flag;
    const looseTicks = flag.looseTicks + 1;
    return looseTicks >= FLAG_RESET_TICKS ? createHomeFlag() : { ...flag, looseTicks };
  }

  function legalizeFlagPoint(rawPoint) {
    let point = {
      seat: 0,
      x: clamp(rawPoint.x, FLAG_RADIUS, WORLD_WIDTH - FLAG_RADIUS),
      y: clamp(rawPoint.y, FLAG_RADIUS, WORLD_HEIGHT - FLAG_RADIUS),
      vx: 0,
      vy: 0,
      lastNormalIndex: 0,
    };
    for (let pass = 0; pass < 2; pass += 1) {
      for (const obstacle of OBSTACLES) point = resolveCircleAabb(point, obstacle, FLAG_RADIUS);
    }
    return deepFreeze({ x: point.x, y: point.y });
  }

  function isInsideOwnBase(player) {
    return player.seat === 0 ? player.x <= BASE_DEPTH : player.x >= WORLD_WIDTH - BASE_DEPTH;
  }

  function resolveTerminal(scores, liveTicksRemaining) {
    if (scores[0] >= TARGET_SCORE || scores[1] >= TARGET_SCORE) {
      return { winnerSeat: scores[0] >= TARGET_SCORE ? 0 : 1, reason: "target-score" };
    }
    if (liveTicksRemaining > 0) return null;
    if (scores[0] === scores[1]) return { winnerSeat: null, reason: "draw" };
    return { winnerSeat: scores[0] > scores[1] ? 0 : 1, reason: "time" };
  }

  function resolvePlayerMotion(rawPlayer, intent, isCarrier) {
    const player = parsePlayer(rawPlayer);
    if (!player) throw new TypeError("invalid player");
    if (!Number.isInteger(intent) || intent < 0 || intent >= INTENT_ACCELERATIONS.length) {
      throw new RangeError("intent out of range");
    }
    const base = INTENT_ACCELERATIONS[intent];
    const ax = isCarrier
      ? roundTowardZero(base.x * CARRIER_ACCEL_NUMERATOR, CARRIER_ACCEL_DENOMINATOR) : base.x;
    const ay = isCarrier
      ? roundTowardZero(base.y * CARRIER_ACCEL_NUMERATOR, CARRIER_ACCEL_DENOMINATOR) : base.y;
    let vx = roundTowardZero((player.vx + ax) * DAMPING_NUMERATOR, DAMPING_DENOMINATOR);
    let vy = roundTowardZero((player.vy + ay) * DAMPING_NUMERATOR, DAMPING_DENOMINATOR);
    const limited = limitVelocity(vx, vy, isCarrier ? CARRIER_MAX_SPEED : MAX_SPEED);
    vx = limited.vx;
    vy = limited.vy;
    let body = { ...player, x: player.x + vx, y: player.y + vy, vx, vy };
    body = resolveWorldBounds(body);
    for (let pass = 0; pass < 2; pass += 1) {
      for (const obstacle of OBSTACLES) body = resolveCircleAabb(body, obstacle, PLAYER_RADIUS);
    }
    return deepFreeze(body);
  }

  function resolveWorldBounds(player) {
    let { x, y, vx, vy } = player;
    const minX = PLAYER_RADIUS;
    const maxX = WORLD_WIDTH - PLAYER_RADIUS;
    const minY = PLAYER_RADIUS;
    const maxY = WORLD_HEIGHT - PLAYER_RADIUS;
    if (x < minX) {
      x = minX;
      if (vx < 0) vx = -roundTowardZero(vx * RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR);
    } else if (x > maxX) {
      x = maxX;
      if (vx > 0) vx = -roundTowardZero(vx * RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR);
    }
    if (y < minY) {
      y = minY;
      if (vy < 0) vy = -roundTowardZero(vy * RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR);
    } else if (y > maxY) {
      y = maxY;
      if (vy > 0) vy = -roundTowardZero(vy * RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR);
    }
    return { ...player, x, y, vx, vy };
  }

  function resolveCircleAabb(player, box, radius) {
    const nearestX = clamp(player.x, box.minX, box.maxX);
    const nearestY = clamp(player.y, box.minY, box.maxY);
    const dx = player.x - nearestX;
    const dy = player.y - nearestY;
    if (dx * dx + dy * dy >= radius * radius) return player;

    const candidates = [
      { axis: "x", value: box.minX - radius, displacement: box.minX - radius - player.x, direction: -1 },
      { axis: "x", value: box.maxX + radius, displacement: box.maxX + radius - player.x, direction: 1 },
      { axis: "y", value: box.minY - radius, displacement: box.minY - radius - player.y, direction: -1 },
      { axis: "y", value: box.maxY + radius, displacement: box.maxY + radius - player.y, direction: 1 },
    ];
    let selected = candidates[0];
    for (let index = 1; index < candidates.length; index += 1) {
      if (Math.abs(candidates[index].displacement) < Math.abs(selected.displacement)) selected = candidates[index];
    }
    let { x, y, vx, vy } = player;
    if (selected.axis === "x") {
      x = selected.value;
      if (vx * selected.direction < 0) {
        vx = -roundTowardZero(vx * RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR);
      }
    } else {
      y = selected.value;
      if (vy * selected.direction < 0) {
        vy = -roundTowardZero(vy * RESTITUTION_NUMERATOR, RESTITUTION_DENOMINATOR);
      }
    }
    return { ...player, x, y, vx, vy };
  }

  function resolvePlayerCollision(rawPlayers, carrierSeat = null) {
    const players = parsePlayers(rawPlayers);
    if (!players) throw new TypeError("players must contain two valid bodies");
    if (carrierSeat !== null && carrierSeat !== 0 && carrierSeat !== 1) {
      throw new TypeError("invalid carrier seat");
    }
    let first = { ...players[0] };
    let second = { ...players[1] };
    const collisionVelocity = [{ vx: first.vx, vy: first.vy }, { vx: second.vx, vy: second.vy }];
    let contacted = false;
    let normalIndex = selectNormalIndex(second.x - first.x, second.y - first.y, first, second);

    for (let pass = 0; pass < MAX_COLLISION_PASSES; pass += 1) {
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distanceSquared = dx * dx + dy * dy;
      const minimumDistance = PLAYER_RADIUS * 2;
      if (distanceSquared >= minimumDistance * minimumDistance) break;
      contacted = true;
      normalIndex = selectNormalIndex(dx, dy, first, second);
      const normal = NORMAL_VECTORS[normalIndex];
      const penetration = minimumDistance - integerSqrt(distanceSquared);
      const halfCorrection = Math.ceil((penetration + 1) / 2);
      const cx = roundDiv(normal.x * halfCorrection, NORMAL_SCALE);
      const cy = roundDiv(normal.y * halfCorrection, NORMAL_SCALE);
      first.x -= cx;
      first.y -= cy;
      second.x += cx;
      second.y += cy;
      first = resolveStaticPlacement(first);
      second = resolveStaticPlacement(second);
    }

    if (contacted) {
      const normal = NORMAL_VECTORS[normalIndex];
      const relativeNormal = roundDiv(
        (collisionVelocity[1].vx - collisionVelocity[0].vx) * normal.x
          + (collisionVelocity[1].vy - collisionVelocity[0].vy) * normal.y,
        NORMAL_SCALE,
      );
      if (relativeNormal < 0) {
        const impulse = roundDiv(
          -relativeNormal * (RESTITUTION_DENOMINATOR + RESTITUTION_NUMERATOR),
          2 * RESTITUTION_DENOMINATOR,
        );
        const ix = roundDiv(impulse * normal.x, NORMAL_SCALE);
        const iy = roundDiv(impulse * normal.y, NORMAL_SCALE);
        first.vx -= ix;
        first.vy -= iy;
        second.vx += ix;
        second.vy += iy;
      }
      first.lastNormalIndex = normalIndex;
      second.lastNormalIndex = normalIndex;
      const firstLimit = carrierSeat === 0 ? CARRIER_MAX_SPEED : MAX_SPEED;
      const secondLimit = carrierSeat === 1 ? CARRIER_MAX_SPEED : MAX_SPEED;
      Object.assign(first, limitVelocity(first.vx, first.vy, firstLimit));
      Object.assign(second, limitVelocity(second.vx, second.vy, secondLimit));
    }
    return deepFreeze({ players: [first, second], contacted });
  }

  function resolveStaticPlacement(player) {
    let body = resolveWorldBounds(player);
    for (let pass = 0; pass < 2; pass += 1) {
      for (const obstacle of OBSTACLES) body = resolveCircleAabb(body, obstacle, PLAYER_RADIUS);
    }
    return body;
  }

  function selectNormalIndex(dx, dy, first, second) {
    if (dx === 0 && dy === 0) {
      return first.lastNormalIndex === second.lastNormalIndex ? first.lastNormalIndex : 0;
    }
    let bestIndex = 0;
    let bestDot = -Infinity;
    for (let index = 0; index < NORMAL_VECTORS.length; index += 1) {
      const vector = NORMAL_VECTORS[index];
      const dot = dx * vector.x + dy * vector.y;
      if (dot > bestDot) {
        bestDot = dot;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  function deriveSpawn() {
    const right = mirrorPointHorizontally(LEFT_SPAWN);
    return deepFreeze([
      createPlayer(0, LEFT_SPAWN.x, LEFT_SPAWN.y),
      createPlayer(1, right.x, right.y),
    ]);
  }

  function mirrorPointHorizontally(point) {
    return deepFreeze({ x: WORLD_WIDTH - point.x, y: point.y });
  }

  function getViewModel(state) {
    let safeState;
    try {
      safeState = trustedStates.has(state) ? state : assertState(state);
    } catch {
      safeState = createInitialState();
    }
    const players = safeState.players.map((player, seat) => {
      const isCarrier = safeState.flag.carrierSeat === seat;
      const limit = isCarrier ? CARRIER_MAX_SPEED : MAX_SPEED;
      return {
        seat,
        x: player.x,
        y: player.y,
        speedRatio: Math.min(1, integerSqrt(player.vx * player.vx + player.vy * player.vy) / limit),
        isCarrier,
      };
    });
    return deepFreeze({
      phase: safeState.phase,
      revision: safeState.revision,
      playerNames: [...safeState.playerNames],
      players,
      flag: {
        x: safeState.flag.x,
        y: safeState.flag.y,
        carrierSeat: safeState.flag.carrierSeat,
        lockRatio: safeState.flag.pickupLockTicks / FLAG_PICKUP_LOCK_TICKS,
        looseRatio: safeState.flag.looseTicks / FLAG_RESET_TICKS,
      },
      scores: [...safeState.scores],
      liveTicksRemaining: safeState.liveTicksRemaining,
      countdownTicks: safeState.countdownTicks,
      pauseReason: safeState.pauseReason,
      lastCaptureSeat: safeState.lastCaptureSeat,
      result: safeState.result ? { ...safeState.result } : null,
      status: statusFor(safeState),
    });
  }

  function replaySession(log) {
    const source = readExactRecord(log, REPLAY_KEYS);
    if (!source || source.version !== VERSION) throw new TypeError("invalid replay session");
    const actions = snapshotDenseArray(source.actions);
    if (!actions) throw new TypeError("invalid replay session");
    const config = parseConfigStrict(source.config);
    let state = createInitialState(config);
    for (const action of actions) {
      const parsed = parseAction(action, state.revision);
      if (!parsed) throw new TypeError("invalid replay action");
      const next = reducePenguinFlagDuel(state, action);
      if (next === state) throw new TypeError("replay action is illegal in the current phase");
      state = next;
    }
    return state;
  }

  function assertState(candidate) {
    if (trustedStates.has(candidate)) return candidate;
    const source = readExactRecord(candidate, STATE_KEYS);
    if (!source) throw new TypeError("invalid state schema");
    if (source.version !== VERSION || !PHASES.includes(source.phase)) throw new TypeError("invalid state identity");
    const names = parseNamesStrict(source.playerNames);
    const copy = parseCopyStrict(source.copy);
    const players = parsePlayers(source.players);
    const flag = parseFlag(source.flag, players);
    const scores = parseScores(source.scores);
    const liveTicksRemaining = requireInteger(source.liveTicksRemaining, 0, MATCH_LIVE_TICKS, "liveTicksRemaining");
    const countdownTicks = requireInteger(
      source.countdownTicks, 0, INITIAL_COUNTDOWN_TICKS, "countdownTicks",
    );
    const pauseReason = source.pauseReason;
    const lastCaptureSeat = parseNullableSeat(source.lastCaptureSeat, "lastCaptureSeat");
    const result = parseResult(source.result);
    const revision = requireInteger(source.revision, 0, Number.MAX_SAFE_INTEGER, "revision");
    validatePhaseCrossFields({
      phase: source.phase, countdownTicks, pauseReason, lastCaptureSeat, result,
      liveTicksRemaining, scores, players, flag,
    });
    return makeState({
      version: VERSION,
      phase: source.phase,
      playerNames: names,
      copy,
      players,
      flag,
      scores,
      liveTicksRemaining,
      countdownTicks,
      pauseReason,
      lastCaptureSeat,
      result,
      revision,
    });
  }

  function validatePhaseCrossFields(fields) {
    const {
      phase, countdownTicks, pauseReason, result, liveTicksRemaining, scores, players, flag,
    } = fields;
    if (phase !== "match-result" && Math.max(...scores) >= TARGET_SCORE) {
      throw new TypeError("non-terminal state reached target score");
    }
    if (phase === "intro") {
      if (countdownTicks !== 0 || pauseReason !== null || result !== null
        || liveTicksRemaining !== MATCH_LIVE_TICKS || scores[0] !== 0 || scores[1] !== 0
        || !playersAtSpawn(players) || !flagAtHome(flag) || fields.lastCaptureSeat !== null) {
        throw new TypeError("invalid intro state");
      }
      return;
    }
    if (phase === "countdown") {
      if (countdownTicks < 1 || pauseReason !== null || result !== null) throw new TypeError("invalid countdown");
      return;
    }
    if (phase === "capture-reset") {
      if (countdownTicks < 1 || countdownTicks > CAPTURE_RESET_TICKS
        || pauseReason !== null || result !== null || fields.lastCaptureSeat === null
        || !playersAtSpawn(players) || !flagAtHome(flag)) {
        throw new TypeError("invalid capture reset");
      }
      return;
    }
    if (phase === "playing") {
      if (countdownTicks !== 0 || pauseReason !== null || result !== null
        || liveTicksRemaining < 1 || fields.lastCaptureSeat !== null) {
        throw new TypeError("invalid playing state");
      }
      return;
    }
    if (phase === "paused") {
      if (countdownTicks !== 0 || !PAUSE_REASONS.includes(pauseReason) || result !== null) {
        throw new TypeError("invalid paused state");
      }
      return;
    }
    if (countdownTicks !== 0 || pauseReason !== null || result === null) {
      throw new TypeError("invalid match result");
    }
    const highest = Math.max(...scores);
    if (result.reason === "target-score") {
      const loserSeat = result.winnerSeat === 0 ? 1 : 0;
      if (scores[result.winnerSeat] !== TARGET_SCORE || scores[loserSeat] >= TARGET_SCORE) {
        throw new TypeError("target result without unique target score");
      }
    } else {
      if (liveTicksRemaining !== 0 || highest >= TARGET_SCORE) throw new TypeError("timed result invariant failed");
      if (result.reason === "draw" && scores[0] !== scores[1]) throw new TypeError("draw scores differ");
      if (result.reason === "time") {
        const expectedWinner = scores[0] > scores[1] ? 0 : 1;
        if (scores[0] === scores[1] || result.winnerSeat !== expectedWinner) {
          throw new TypeError("time winner mismatch");
        }
      }
    }
  }

  function parseAction(action, expectedRevision) {
    try {
      const type = safeActionType(action);
      if (!type) return null;
      const source = readExactRecord(action, ACTION_KEYS[type]);
      if (!source || source.expectedRevision !== expectedRevision) return null;
      if (!Number.isSafeInteger(source.expectedRevision) || source.expectedRevision < 0) return null;
      if (type === "STEP") {
        const intents = parseIntentPair(source.intents);
        return intents ? deepFreeze({ type, expectedRevision, intents }) : null;
      }
      if (type === "PAUSE") {
        return PAUSE_REASONS.includes(source.reason)
          ? deepFreeze({ type, expectedRevision, reason: source.reason }) : null;
      }
      return deepFreeze({ type, expectedRevision });
    } catch {
      return null;
    }
  }

  function safeActionType(action) {
    try {
      const record = safePlainRecord(action);
      if (!record) return null;
      const type = readOwnData(record, "type");
      return ACTION_TYPES.includes(type) ? type : null;
    } catch {
      return null;
    }
  }

  function parseIntentPair(value) {
    const pair = snapshotDenseArray(value, 2);
    if (!pair) return null;
    return pair.every((intent) => Number.isInteger(intent) && intent >= 0 && intent <= 8)
      ? deepFreeze(pair) : null;
  }

  function transition(state, patch) {
    return makeState({
      ...state,
      ...patch,
      revision: state.revision + 1,
    });
  }

  function makeState(value) {
    const state = deepFreeze({
      version: VERSION,
      phase: value.phase,
      playerNames: [...value.playerNames],
      copy: { ...value.copy },
      players: value.players.map((player) => ({ ...player })),
      flag: { ...value.flag },
      scores: [...value.scores],
      liveTicksRemaining: value.liveTicksRemaining,
      countdownTicks: value.countdownTicks,
      pauseReason: value.pauseReason,
      lastCaptureSeat: value.lastCaptureSeat,
      result: value.result ? { ...value.result } : null,
      revision: value.revision,
    });
    trustedStates.add(state);
    return state;
  }

  function createPlayer(seat, x, y) {
    return { seat, x, y, vx: 0, vy: 0, lastNormalIndex: 0 };
  }

  function createHomeFlag() {
    return {
      x: FLAG_HOME.x,
      y: FLAG_HOME.y,
      carrierSeat: null,
      pickupLockTicks: 0,
      looseTicks: 0,
    };
  }

  function playersAtSpawn(players) {
    const expected = deriveSpawn();
    return players.every((player, seat) => PLAYER_KEYS.every((key) => player[key] === expected[seat][key]));
  }

  function flagAtHome(flag) {
    const expected = createHomeFlag();
    return FLAG_KEYS.every((key) => flag[key] === expected[key]);
  }

  function parsePlayer(value, expectedSeat) {
    const source = readExactRecord(value, PLAYER_KEYS);
    if (!source) return null;
    const seat = requireInteger(source.seat, 0, 1, "seat");
    if (expectedSeat !== undefined && seat !== expectedSeat) return null;
    const x = requireInteger(source.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS, "x");
    const y = requireInteger(source.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS, "y");
    const vx = requireInteger(source.vx, -MAX_SPEED, MAX_SPEED, "vx");
    const vy = requireInteger(source.vy, -MAX_SPEED, MAX_SPEED, "vy");
    const lastNormalIndex = requireInteger(source.lastNormalIndex, 0, NORMAL_VECTORS.length - 1, "lastNormalIndex");
    return { seat, x, y, vx, vy, lastNormalIndex };
  }

  function parsePlayers(value) {
    const players = snapshotDenseArray(value, 2);
    if (!players) return null;
    const first = parsePlayer(players[0], 0);
    const second = parsePlayer(players[1], 1);
    return first && second ? [first, second] : null;
  }

  function parseFlag(value, players) {
    const source = readExactRecord(value, FLAG_KEYS);
    if (!source) throw new TypeError("invalid flag");
    const x = requireInteger(source.x, FLAG_RADIUS, WORLD_WIDTH - FLAG_RADIUS, "flag.x");
    const y = requireInteger(source.y, FLAG_RADIUS, WORLD_HEIGHT - FLAG_RADIUS, "flag.y");
    const carrierSeat = parseNullableSeat(source.carrierSeat, "carrierSeat");
    const pickupLockTicks = requireInteger(
      source.pickupLockTicks, 0, FLAG_PICKUP_LOCK_TICKS, "pickupLockTicks",
    );
    const looseTicks = requireInteger(source.looseTicks, 0, FLAG_RESET_TICKS, "looseTicks");
    if (carrierSeat !== null) {
      if (pickupLockTicks !== 0 || looseTicks !== 0
        || x !== players[carrierSeat].x || y !== players[carrierSeat].y) {
        throw new TypeError("carried flag invariant failed");
      }
    } else if (pickupLockTicks > 0 && looseTicks !== 0) {
      throw new TypeError("locked flag cannot age");
    }
    return { x, y, carrierSeat, pickupLockTicks, looseTicks };
  }

  function parseScores(value) {
    const scores = snapshotDenseArray(value, 2);
    if (!scores) throw new TypeError("invalid scores");
    return [
      requireInteger(scores[0], 0, TARGET_SCORE, "score 0"),
      requireInteger(scores[1], 0, TARGET_SCORE, "score 1"),
    ];
  }

  function parseResult(value) {
    if (value === null) return null;
    const source = readExactRecord(value, RESULT_KEYS);
    if (!source || !["target-score", "time", "draw"].includes(source.reason)) {
      throw new TypeError("invalid result");
    }
    const winnerSeat = parseNullableSeat(source.winnerSeat, "winnerSeat");
    if ((source.reason === "draw") !== (winnerSeat === null)) throw new TypeError("result winner mismatch");
    return { winnerSeat, reason: source.reason };
  }

  function parseNullableSeat(value, label) {
    if (value === null || value === 0 || value === 1) return value;
    throw new TypeError(`invalid ${label}`);
  }

  function parseNamesStrict(value) {
    const source = snapshotDenseArray(value, 2);
    const names = sanitizeNames(source);
    if (!names || names[0] !== source[0] || names[1] !== source[1]) throw new TypeError("invalid names");
    return names;
  }

  function sanitizeNames(value) {
    const source = snapshotDenseArray(value, 2);
    if (!source) return null;
    const names = source.map((name) => cleanText(name, 12, null));
    return names[0] && names[1] && names[0] !== names[1] ? names : null;
  }

  function parseCopyStrict(value) {
    const source = readExactRecord(value, COPY_KEYS);
    if (!source) throw new TypeError("invalid copy");
    const copy = {};
    for (const key of COPY_KEYS) {
      const cleaned = cleanText(source[key], COPY_LIMITS[key], null);
      if (!cleaned || cleaned !== source[key]) throw new TypeError("invalid copy value");
      copy[key] = cleaned;
    }
    return copy;
  }

  function parseConfigStrict(value) {
    const source = readExactRecord(value, CONFIG_KEYS);
    if (!source) throw new TypeError("invalid replay config");
    return deepFreeze({
      playerNames: parseNamesStrict(source.playerNames),
      copy: parseCopyStrict(source.copy),
    });
  }

  function statusFor(state) {
    if (state.phase === "intro") return { title: state.copy.title, body: state.copy.subtitle };
    if (state.phase === "paused") return { title: "比赛已暂停", body: "继续后会先进行三秒内的中性倒计时。" };
    if (state.phase === "match-result") {
      if (state.result.reason === "draw") return { title: "这一局打平", body: `比分 ${state.scores[0]} 比 ${state.scores[1]}。` };
      return {
        title: `${state.playerNames[state.result.winnerSeat]}赢下这一局`,
        body: `比分 ${state.scores[0]} 比 ${state.scores[1]}。`,
      };
    }
    if (state.phase === "capture-reset") {
      return { title: `${state.playerNames[state.lastCaptureSeat]}带旗回家`, body: "双方正在回到起点。" };
    }
    if (state.phase === "countdown") return { title: "准备滑行", body: "倒计时结束前移动输入不会生效。" };
    return state.flag.carrierSeat === null
      ? { title: "中立旗正在场上", body: "抢到后带回自己的基地。" }
      : { title: `${state.playerNames[state.flag.carrierSeat]}正在持旗`, body: "碰到对手会掉旗。" };
  }

  function limitVelocity(vx, vy, maximum) {
    const magnitudeSquared = vx * vx + vy * vy;
    if (magnitudeSquared <= maximum * maximum) return { vx, vy };
    const magnitude = integerSqrt(magnitudeSquared);
    if (magnitude === 0) return { vx: 0, vy: 0 };
    let limitedX = roundDiv(vx * maximum, magnitude);
    let limitedY = roundDiv(vy * maximum, magnitude);
    while (limitedX * limitedX + limitedY * limitedY > maximum * maximum) {
      if (Math.abs(limitedX) >= Math.abs(limitedY) && limitedX !== 0) limitedX -= Math.sign(limitedX);
      else if (limitedY !== 0) limitedY -= Math.sign(limitedY);
      else break;
    }
    return { vx: limitedX, vy: limitedY };
  }

  function integerSqrt(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("integerSqrt requires a safe non-negative integer");
    if (value < 2) return value;
    let low = 1;
    let high = Math.min(value, 1 << 26);
    let answer = 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const quotient = Math.floor(value / middle);
      if (middle <= quotient) {
        answer = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return answer;
  }

  function roundDiv(numerator, denominator) {
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
      throw new TypeError("roundDiv requires safe integers and a positive denominator");
    }
    const sign = Math.sign(numerator);
    return sign * Math.floor((Math.abs(numerator) + Math.floor(denominator / 2)) / denominator);
  }

  function roundTowardZero(numerator, denominator) {
    return Math.trunc(numerator / denominator);
  }

  function scaleBox(box) {
    return {
      minX: box.minX * FIXED_SCALE,
      maxX: box.maxX * FIXED_SCALE,
      minY: box.minY * FIXED_SCALE,
      maxY: box.maxY * FIXED_SCALE,
    };
  }

  function requireInteger(value, minimum, maximum, label) {
    if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer`);
    if (value < minimum || value > maximum) throw new RangeError(`${label} out of range`);
    return value;
  }

  function cleanText(value, maximumCodePoints, fallback) {
    if (typeof value !== "string") return fallback;
    const text = value.trim().replace(/\s+/gu, " ");
    const length = Array.from(text).length;
    return length >= 1 && length <= maximumCodePoints ? text : fallback;
  }

  function cloneDefaultConfig() {
    return deepFreeze({
      playerNames: [...DEFAULT_CONFIG.playerNames],
      copy: { ...DEFAULT_CONFIG.copy },
    });
  }

  function resolveDefaultConfig(value) {
    try {
      const source = safePlainRecord(value);
      const candidate = source ? readOwnData(source, "DEFAULT_CONFIG") : null;
      return candidate ? parseConfigStrict(candidate) : FALLBACK_CONFIG;
    } catch {
      return FALLBACK_CONFIG;
    }
  }

  function safePlainRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => {
      const descriptor = descriptors[key];
      return typeof key !== "string" || !Object.prototype.hasOwnProperty.call(descriptor, "value");
    })) return null;
    return value;
  }

  function readExactRecord(value, expectedKeys) {
    try {
      const record = safePlainRecord(value);
      if (!record) return null;
      const keys = Reflect.ownKeys(record);
      if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key))) return null;
      const output = {};
      for (const key of expectedKeys) output[key] = readOwnData(record, key);
      return output;
    } catch {
      return null;
    }
  }

  function readOwnData(value, key) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
  }

  function hasOwnData(value, key) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Boolean(descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value"));
  }

  function snapshotDenseArray(value, expectedLength) {
    try {
      if (!Array.isArray(value)) return null;
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const lengthDescriptor = descriptors.length;
      if (!lengthDescriptor || !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value")
        || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
        return null;
      }
      const length = lengthDescriptor.value;
      if (expectedLength !== undefined && length !== expectedLength) return null;
      const keys = Reflect.ownKeys(descriptors);
      if (keys.length !== length + 1 || keys.some((key) => (
        key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/u.test(key)
          || Number(key) >= length)
      ))) return null;
      const output = new Array(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return null;
        output[index] = descriptor.value;
      }
      return output;
    } catch {
      return null;
    }
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  return deepFreeze({
    VERSION,
    TICK_RATE,
    PHASES,
    PAUSE_REASONS,
    ACTION_TYPES,
    RULES,
    INTENT_ACCELERATIONS,
    NORMAL_VECTORS,
    OBSTACLES,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    reducePenguinFlagDuel,
    assertState,
    getViewModel,
    deriveSpawn,
    mirrorPointHorizontally,
    resolvePlayerMotion,
    resolvePlayerCollision,
    simulatePlayingTick,
    integerSqrt,
    roundDiv,
    replaySession,
    deepFreeze,
  });
});
