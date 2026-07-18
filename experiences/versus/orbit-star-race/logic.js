(function (root, factory) {
  "use strict";
  root.ORBIT_STAR_RACE_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const FIXED_DT = 1 / 120;
  const RING_RADII = deepFreeze([0.82, 1, 1.22]);
  const BASE_ANGULAR_SPEED = 0.6;
  const PLAYER_DIRECTIONS = deepFreeze([1, -1]);
  const START_ANGLES = deepFreeze([Math.PI * 1.5, Math.PI * 0.5]);
  const START_LANE = 1;
  const PREVIEW_STEPS = 96;
  const SHIFT_COOLDOWN_STEPS = 30;
  const CAPTURE_ANGLE = 0.11;
  const SHARED_EPSILON = 1e-5;
  const TARGET_SCORE = 5;
  const PHASES = deepFreeze(["intro", "preview", "live", "finished"]);
  const STATE_KEYS = deepFreeze([
    "phase", "seed", "stepCount", "previewSteps", "revision",
    "playerNames", "players", "claims",
  ]);
  const PLAYER_KEYS = deepFreeze(["angle", "lane", "cooldownSteps"]);
  const CLAIM_KEYS = deepFreeze(["starIndex", "stepCount", "winners"]);
  const CONFIG_KEYS = deepFreeze(["playerNames", "composeResult"]);
  const SHIFT_KEYS = deepFreeze(["step", "playerIndex", "direction"]);
  const REPLAY_KEYS = deepFreeze(["seed", "shifts", "totalSteps", "config"]);

  function defaultComposeResult() {
    return null;
  }

  const DEFAULT_CONFIG = deepFreeze({
    playerNames: ["朱方", "蓝方"],
    composeResult: defaultComposeResult,
  });

  function sanitizeConfig(rawConfig) {
    try {
      return sanitizeConfigValue(rawConfig);
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  function sanitizeConfigValue(rawConfig) {
    if (!isRecord(rawConfig) || !hasOnlyKeys(rawConfig, CONFIG_KEYS)) return DEFAULT_CONFIG;
    const playerNames = sanitizeNames(rawConfig.playerNames);
    if (!playerNames || (rawConfig.composeResult !== undefined && typeof rawConfig.composeResult !== "function")) {
      return DEFAULT_CONFIG;
    }
    const formatter = rawConfig.composeResult ?? defaultComposeResult;
    return deepFreeze({
      playerNames: [...playerNames],
      composeResult(context) {
        return formatter(context);
      },
    });
  }

  function createGameState(rawConfig) {
    const config = rawConfig === undefined ? DEFAULT_CONFIG : sanitizeConfig(rawConfig);
    return createIntro(config.playerNames);
  }

  function createIntro(playerNames = DEFAULT_CONFIG.playerNames) {
    return freezeState({
      phase: "intro",
      seed: 0,
      stepCount: 0,
      previewSteps: 0,
      revision: 0,
      playerNames,
      players: initialPlayers(),
      claims: [],
    });
  }

  function startGame(state, seed) {
    if (!isGameState(state)) return createGameState();
    if (state.phase !== "intro" || !isUint32Seed(seed)) return state;
    return freezeState({
      ...state,
      phase: "preview",
      seed,
      previewSteps: PREVIEW_STEPS,
      revision: state.revision + 1,
      players: initialPlayers(),
      claims: [],
    });
  }

  function shiftOrbit(state, playerIndex, direction) {
    if (!isGameState(state)) return createGameState();
    if (!["preview", "live"].includes(state.phase)) return state;
    if ((playerIndex !== 0 && playerIndex !== 1) || (direction !== -1 && direction !== 1)) return state;
    const player = state.players[playerIndex];
    const nextLane = player.lane + direction;
    if (player.cooldownSteps > 0 || nextLane < 0 || nextLane >= RING_RADII.length) return state;
    const players = state.players.map((current, index) => index === playerIndex
      ? { ...current, lane: nextLane, cooldownSteps: SHIFT_COOLDOWN_STEPS }
      : current);
    return freezeState({ ...state, players });
  }

  function stepGame(state) {
    if (!isGameState(state)) return createGameState();
    if (state.phase === "intro" || state.phase === "finished") return state;

    const players = state.players.map((player, index) => ({
      angle: normalizeAngle(player.angle + PLAYER_DIRECTIONS[index] * angularSpeedForLane(player.lane) * FIXED_DT),
      lane: player.lane,
      cooldownSteps: Math.max(0, player.cooldownSteps - 1),
    }));
    const stepCount = state.stepCount + 1;

    if (state.phase === "preview") {
      const previewSteps = state.previewSteps - 1;
      return freezeState({
        ...state,
        phase: previewSteps === 0 ? "live" : "preview",
        previewSteps,
        stepCount,
        players,
      });
    }

    const star = deriveStar(state.seed, state.claims.length);
    const distances = players.map((player) => player.lane === star.lane
      ? Math.abs(shortestAngleDifference(star.angle, player.angle))
      : Infinity);
    const captured = distances.map((distance) => distance <= CAPTURE_ANGLE);
    if (!captured[0] && !captured[1]) {
      return freezeState({ ...state, stepCount, players });
    }

    let winners;
    if (captured[0] && captured[1]) {
      winners = Math.abs(distances[0] - distances[1]) <= SHARED_EPSILON
        ? [0, 1]
        : [distances[0] < distances[1] ? 0 : 1];
    } else {
      winners = [captured[0] ? 0 : 1];
    }
    const claims = [...state.claims, {
      starIndex: state.claims.length,
      stepCount,
      winners,
    }];
    const scores = scoresFromClaims(claims);
    const finished = Math.max(...scores) >= TARGET_SCORE && scores[0] !== scores[1];
    return freezeState({
      ...state,
      phase: finished ? "finished" : "preview",
      previewSteps: finished ? 0 : PREVIEW_STEPS,
      stepCount,
      players,
      claims,
    });
  }

  function restartGame(state, seed) {
    if (!isGameState(state)) return createGameState();
    if (state.phase !== "finished" || !isUint32Seed(seed)) return state;
    return freezeState({
      phase: "preview",
      seed,
      stepCount: 0,
      previewSteps: PREVIEW_STEPS,
      revision: state.revision + 1,
      playerNames: state.playerNames,
      players: initialPlayers(),
      claims: [],
    });
  }

  function deriveStar(seed, starIndex) {
    assertSeed(seed);
    if (!Number.isInteger(starIndex)) throw new TypeError("starIndex 必须是整数");
    if (starIndex < 0) throw new RangeError("starIndex 不能小于 0");
    const group = Math.floor(starIndex / 3);
    const position = starIndex % 3;
    const permutation = [0, 1, 2];
    let entropy = mix32(seed ^ Math.imul(group + 1, 0x9e3779b9));
    for (let index = 2; index > 0; index -= 1) {
      const swapIndex = entropy % (index + 1);
      [permutation[index], permutation[swapIndex]] = [permutation[swapIndex], permutation[index]];
      entropy = mix32(entropy + 0x6d2b79f5);
    }
    const sector = mix32(seed ^ Math.imul(starIndex + 1, 0x85ebca6b)) % 12;
    return deepFreeze({
      id: `star-${String(starIndex + 1).padStart(3, "0")}`,
      index: starIndex,
      lane: permutation[position],
      sector,
      angle: ((sector + 0.5) / 12) * TAU,
    });
  }

  function deriveScores(state) {
    return deepFreeze(isGameState(state) ? scoresFromClaims(state.claims) : [0, 0]);
  }

  function getViewModel(state) {
    const safeState = isGameState(state) ? state : createGameState();
    const scores = scoresFromClaims(safeState.claims);
    const sharedClaims = safeState.claims.filter((claim) => claim.winners.length === 2).length;
    const leaderIndex = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    const winnerIndex = safeState.phase === "finished" ? leaderIndex : null;
    const activeIndex = safeState.phase === "finished" ? safeState.claims.length - 1 : safeState.claims.length;
    const star = safeState.phase === "intro" ? null : {
      ...deriveStar(safeState.seed, activeIndex),
      status: safeState.phase === "preview" ? "preview" : "live",
    };
    const controlsEnabled = safeState.phase === "preview" || safeState.phase === "live";
    const players = safeState.players.map((player, index) => ({
      angle: player.angle,
      lane: player.lane,
      direction: PLAYER_DIRECTIONS[index],
      cooldownRatio: player.cooldownSteps / SHIFT_COOLDOWN_STEPS,
      score: scores[index],
      canRise: controlsEnabled && player.cooldownSteps === 0 && player.lane < RING_RADII.length - 1,
      canDrop: controlsEnabled && player.cooldownSteps === 0 && player.lane > 0,
    }));
    const result = safeState.phase === "finished" ? { winnerIndex, sharedClaims } : null;
    return deepFreeze({
      phase: safeState.phase,
      stepCount: safeState.stepCount,
      revision: safeState.revision,
      playerNames: [...safeState.playerNames],
      players,
      star,
      scores,
      sharedClaims,
      targetScore: TARGET_SCORE,
      leaderIndex,
      winnerIndex,
      result,
      status: statusFor(safeState, scores, winnerIndex),
    });
  }

  function resolveResultCopy(state, rawConfig) {
    if (!isGameState(state) || state.phase !== "finished") return null;
    const scores = scoresFromClaims(state.claims);
    const winnerIndex = scores[0] > scores[1] ? 0 : 1;
    const sharedClaims = state.claims.filter((claim) => claim.winners.length === 2).length;
    const fallback = defaultResultCopy(state.playerNames, scores, winnerIndex);
    const config = rawConfig === undefined ? DEFAULT_CONFIG : sanitizeConfig(rawConfig);
    const context = deepFreeze({
      winnerIndex,
      playerNames: [...state.playerNames],
      scores: [...scores],
      sharedClaims,
    });
    try {
      const result = config.composeResult(context);
      if (!isRecord(result) || isThenable(result) || !hasExactKeys(result, ["title", "body"])) return fallback;
      const title = cleanText(result.title, 80);
      const body = cleanText(result.body, 180);
      return title && body ? deepFreeze({ title, body }) : fallback;
    } catch {
      return fallback;
    }
  }

  function replaySession(log) {
    validateReplayLog(log);
    let state = createGameState(log.config);
    state = startGame(state, log.seed);
    let shiftIndex = 0;
    for (let step = 0; step < log.totalSteps; step += 1) {
      while (shiftIndex < log.shifts.length && log.shifts[shiftIndex].step === step) {
        const shift = log.shifts[shiftIndex];
        state = shiftOrbit(state, shift.playerIndex, shift.direction);
        shiftIndex += 1;
      }
      state = stepGame(state);
    }
    return state;
  }

  function validateReplayLog(log) {
    if (!isRecord(log) || !hasOnlyKeys(log, REPLAY_KEYS)
      || !Object.prototype.hasOwnProperty.call(log, "seed")
      || !Object.prototype.hasOwnProperty.call(log, "shifts")
      || !Object.prototype.hasOwnProperty.call(log, "totalSteps")) {
      throw new TypeError("回放日志字段不完整或包含额外字段");
    }
    assertSeed(log.seed);
    if (!Number.isInteger(log.totalSteps)) throw new TypeError("totalSteps 必须是整数");
    if (log.totalSteps < 0) throw new RangeError("totalSteps 不能小于 0");
    if (!Array.isArray(log.shifts)) throw new TypeError("shifts 必须是数组");
    let previousStep = -1;
    for (const shift of log.shifts) {
      if (!isRecord(shift) || !hasExactKeys(shift, SHIFT_KEYS)) throw new TypeError("shift 字段必须严格匹配协议");
      if (!Number.isInteger(shift.step)) throw new TypeError("shift.step 必须是整数");
      if (shift.step < 0 || shift.step >= log.totalSteps) throw new RangeError("shift.step 超出回放范围");
      if (shift.step < previousStep) throw new RangeError("shifts 必须按 step 非递减排列");
      if (shift.playerIndex !== 0 && shift.playerIndex !== 1) throw new TypeError("playerIndex 只能是 0 或 1");
      if (shift.direction !== -1 && shift.direction !== 1) throw new TypeError("direction 只能是 -1 或 1");
      previousStep = shift.step;
    }
  }

  function statusFor(state, scores, winnerIndex) {
    if (state.phase === "intro") {
      return deepFreeze({
        title: "两颗卫星已经就位",
        body: "看准星轨，再一起出发。",
        remainingPreviewSteps: 0,
      });
    }
    if (state.phase === "finished") {
      const copy = defaultResultCopy(state.playerNames, scores, winnerIndex);
      return deepFreeze({ ...copy, remainingPreviewSteps: 0 });
    }
    if (state.phase === "preview") {
      const lastClaim = state.claims.at(-1);
      if (lastClaim && lastClaim.winners.length === 2) {
        return deepFreeze({
          title: "这一颗同时到达",
          body: "两边都加一分，继续。",
          remainingPreviewSteps: state.previewSteps,
        });
      }
      if (lastClaim) {
        const winner = lastClaim.winners[0];
        return deepFreeze({
          title: `${state.playerNames[winner]}先碰到了`,
          body: `比分 ${scores[0]} 比 ${scores[1]}，下一颗正在亮起。`,
          remainingPreviewSteps: state.previewSteps,
        });
      }
      return deepFreeze({
        title: `第 ${state.claims.length + 1} 颗星正在亮起`,
        body: "先看清它在哪条轨道。",
        remainingPreviewSteps: state.previewSteps,
      });
    }
    return deepFreeze({
      title: `第 ${state.claims.length + 1} 颗星可以争了`,
      body: "内轨更快，外轨更稳。",
      remainingPreviewSteps: 0,
    });
  }

  function defaultResultCopy(playerNames, scores, winnerIndex) {
    const otherIndex = winnerIndex === 0 ? 1 : 0;
    return deepFreeze({
      title: `${playerNames[winnerIndex]}抢先一步`,
      body: `${playerNames[winnerIndex]} ${scores[winnerIndex]} 颗，${playerNames[otherIndex]} ${scores[otherIndex]} 颗。今晚的星轨先记这一局。`,
    });
  }

  function isGameState(value) {
    try {
      return validateGameState(value);
    } catch {
      return false;
    }
  }

  function validateGameState(value) {
    if (!isRecord(value) || !hasExactKeys(value, STATE_KEYS) || !isDeepFrozen(value)) return false;
    if (!PHASES.includes(value.phase) || !isUint32OrZero(value.seed)) return false;
    if (!Number.isInteger(value.stepCount) || value.stepCount < 0) return false;
    if (!Number.isInteger(value.previewSteps) || value.previewSteps < 0 || value.previewSteps > PREVIEW_STEPS) return false;
    if (!Number.isInteger(value.revision) || value.revision < 0) return false;
    const names = sanitizeNames(value.playerNames);
    if (!names || names[0] !== value.playerNames[0] || names[1] !== value.playerNames[1]) return false;
    if (!Array.isArray(value.players) || value.players.length !== 2) return false;
    for (const player of value.players) {
      if (!isRecord(player) || !hasExactKeys(player, PLAYER_KEYS)) return false;
      if (!Number.isFinite(player.angle) || player.angle < 0 || player.angle >= TAU) return false;
      if (!Number.isInteger(player.lane) || player.lane < 0 || player.lane >= RING_RADII.length) return false;
      if (!Number.isInteger(player.cooldownSteps) || player.cooldownSteps < 0 || player.cooldownSteps > SHIFT_COOLDOWN_STEPS) return false;
    }
    if (!Array.isArray(value.claims)) return false;
    let previousStep = 0;
    for (let index = 0; index < value.claims.length; index += 1) {
      const claim = value.claims[index];
      if (!isRecord(claim) || !hasExactKeys(claim, CLAIM_KEYS) || claim.starIndex !== index) return false;
      if (!Number.isInteger(claim.stepCount) || claim.stepCount <= previousStep || claim.stepCount > value.stepCount) return false;
      if (!isWinnerList(claim.winners)) return false;
      previousStep = claim.stepCount;
    }
    const scores = scoresFromClaims(value.claims);
    const terminal = Math.max(...scores) >= TARGET_SCORE && scores[0] !== scores[1];
    if (value.phase === "intro") {
      return value.seed === 0 && value.stepCount === 0 && value.previewSteps === 0 && value.claims.length === 0
        && playersAtStart(value.players);
    }
    if (value.seed === 0) return false;
    if (value.phase === "preview") return value.previewSteps >= 1 && !terminal;
    if (value.phase === "live") return value.previewSteps === 0 && !terminal;
    return value.previewSteps === 0 && terminal;
  }

  function initialPlayers() {
    return START_ANGLES.map((angle) => ({ angle, lane: START_LANE, cooldownSteps: 0 }));
  }

  function playersAtStart(players) {
    return players.every((player, index) => player.angle === START_ANGLES[index]
      && player.lane === START_LANE && player.cooldownSteps === 0);
  }

  function sanitizeNames(value) {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const names = value.map(cleanName);
    if (!names[0] || !names[1] || names[0] === names[1]) return null;
    return names;
  }

  function cleanName(value) {
    return cleanText(value, 12);
  }

  function cleanText(value, maxCodePoints) {
    if (typeof value !== "string") return null;
    const text = value.trim().replace(/\s+/gu, " ");
    const length = Array.from(text).length;
    return length >= 1 && length <= maxCodePoints ? text : null;
  }

  function scoresFromClaims(claims) {
    const scores = [0, 0];
    for (const claim of claims) {
      for (const winner of claim.winners) scores[winner] += 1;
    }
    return scores;
  }

  function isWinnerList(value) {
    return Array.isArray(value) && (
      (value.length === 1 && (value[0] === 0 || value[0] === 1))
      || (value.length === 2 && value[0] === 0 && value[1] === 1)
    );
  }

  function normalizeAngle(angle) {
    if (!Number.isFinite(angle)) return 0;
    const normalized = angle % TAU;
    if (normalized === 0) return 0;
    return normalized < 0 ? normalized + TAU : normalized;
  }

  function shortestAngleDifference(target, current) {
    if (!Number.isFinite(target) || !Number.isFinite(current)) return 0;
    let difference = normalizeAngle(target) - normalizeAngle(current);
    if (difference > Math.PI) difference -= TAU;
    if (difference <= -Math.PI) difference += TAU;
    return difference;
  }

  function angularSpeedForLane(lane) {
    return Number.isInteger(lane) && lane >= 0 && lane < RING_RADII.length
      ? BASE_ANGULAR_SPEED * RING_RADII[lane] ** -1.5
      : null;
  }

  function freezeState(value) {
    return deepFreeze({
      phase: value.phase,
      seed: value.seed,
      stepCount: value.stepCount,
      previewSteps: value.previewSteps,
      revision: value.revision,
      playerNames: [...value.playerNames],
      players: value.players.map((player) => ({ ...player })),
      claims: value.claims.map((claim) => ({ ...claim, winners: [...claim.winners] })),
    });
  }

  function assertSeed(seed) {
    if (!Number.isInteger(seed)) throw new TypeError("seed 必须是整数");
    if (!isUint32Seed(seed)) throw new RangeError("seed 必须位于 1..0xffffffff");
  }

  function isUint32Seed(value) {
    return Number.isInteger(value) && value >= 1 && value <= 0xffffffff;
  }

  function isUint32OrZero(value) {
    return Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
  }

  function mix32(value) {
    let mixed = value >>> 0;
    mixed ^= mixed >>> 16;
    mixed = Math.imul(mixed, 0x7feb352d);
    mixed ^= mixed >>> 15;
    mixed = Math.imul(mixed, 0x846ca68b);
    mixed ^= mixed >>> 16;
    return mixed >>> 0;
  }

  function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function hasOnlyKeys(value, allowedKeys) {
    return Reflect.ownKeys(value).every((key) => typeof key === "string" && allowedKeys.includes(key));
  }

  function hasExactKeys(value, expectedKeys) {
    const keys = Reflect.ownKeys(value);
    return keys.length === expectedKeys.length
      && keys.every((key) => typeof key === "string" && expectedKeys.includes(key));
  }

  function isThenable(value) {
    return Boolean(value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function");
  }

  function isDeepFrozen(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return true;
    if (seen.has(value)) return true;
    if (!Object.isFrozen(value)) return false;
    seen.add(value);
    return Reflect.ownKeys(value).every((key) => isDeepFrozen(value[key], seen));
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  return Object.freeze({
    TAU,
    FIXED_DT,
    RING_RADII,
    BASE_ANGULAR_SPEED,
    PLAYER_DIRECTIONS,
    START_ANGLES,
    START_LANE,
    PREVIEW_STEPS,
    SHIFT_COOLDOWN_STEPS,
    CAPTURE_ANGLE,
    SHARED_EPSILON,
    TARGET_SCORE,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createGameState,
    startGame,
    shiftOrbit,
    stepGame,
    restartGame,
    deriveStar,
    deriveScores,
    getViewModel,
    resolveResultCopy,
    normalizeAngle,
    shortestAngleDifference,
    angularSpeedForLane,
    replaySession,
    isGameState,
  });
});
