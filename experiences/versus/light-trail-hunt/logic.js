(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LIGHT_TRAIL_HUNT_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DIRECTIONS = Object.freeze(["N", "E", "S", "W"]);
  const VECTORS = Object.freeze({
    N: Object.freeze({ x: 0, y: -1 }),
    E: Object.freeze({ x: 1, y: 0 }),
    S: Object.freeze({ x: 0, y: 1 }),
    W: Object.freeze({ x: -1, y: 0 }),
  });
  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "stalled"]);
  const DEFAULT_COPY = deepFreeze({
    title: "光轨围猎",
    intro: "别追光，去改写它的边界。",
    ready: "两束光同时出发。左转或右转，别撞上任何旧轨。",
    playing: "围猎进行中",
    manualPause: "制图暂停",
    awayPause: "离开页面，已为你们暂停",
    stalledPause: "时间间隔过长，已安全暂停",
    start: "开始围猎",
    pause: "暂停",
    resume: "继续",
    nextRound: "下一轮",
    restart: "重新比赛",
  });
  const DEFAULT_RULES = deepFreeze({
    grid: { columns: 48, rows: 32 },
    tickMs: 100,
    countdownMs: 2400,
    maxFrameGapMs: 500,
    maxRounds: 3,
    targetScore: 2,
    copy: DEFAULT_COPY,
  });

  function createMatchState(rawConfig) {
    const config = sanitizeConfig(rawConfig);
    return freezeState({
      phase: "ready",
      playerNames: config.playerNames,
      rules: config.rules,
      rounds: [],
      countdownMs: 0,
      pauseReason: null,
      resumePhase: null,
      revision: 0,
    });
  }

  function startMatch(state) {
    if (!isMatchState(state) || (state.phase !== "ready" && state.phase !== "match-end")) return state;
    const countdownMs = state.rules.countdownMs;
    return freezeState({
      ...state,
      phase: countdownMs === 0 ? "playing" : "countdown",
      rounds: [{ spawnVariant: 0, ticks: [] }],
      countdownMs,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function advanceCountdown(state, elapsedMs) {
    if (!isMatchState(state) || state.phase !== "countdown") return state;
    const elapsed = normalizeElapsed(elapsedMs);
    if (elapsed === 0) return state;
    const countdownMs = Math.max(0, state.countdownMs - elapsed);
    return freezeState({
      ...state,
      phase: countdownMs === 0 ? "playing" : "countdown",
      countdownMs,
      revision: state.revision + 1,
    });
  }

  function stepRound(state, input) {
    if (!isMatchState(state) || state.phase !== "playing" || state.rounds.length === 0) return state;
    const turns = normalizeTurns(input?.turns);
    const currentIndex = state.rounds.length - 1;
    const currentRound = state.rounds[currentIndex];
    const nextRoundLog = {
      spawnVariant: currentRound.spawnVariant,
      ticks: [...currentRound.ticks, { turns }],
    };
    const rounds = state.rounds.map((round, index) => index === currentIndex ? nextRoundLog : round);
    const replay = replayRound(nextRoundLog, state.rules);
    let phase = "playing";
    if (replay.outcome) {
      const scores = deriveScores(rounds, state.rules);
      const reachedTarget = scores.some((score) => score >= state.rules.targetScore);
      phase = reachedTarget || rounds.length >= state.rules.maxRounds ? "match-end" : "round-end";
    }
    return freezeState({
      ...state,
      phase,
      rounds,
      countdownMs: 0,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function pauseMatch(state, reason) {
    if (!isMatchState(state) || (state.phase !== "countdown" && state.phase !== "playing")) return state;
    return freezeState({
      ...state,
      phase: "paused",
      pauseReason: PAUSE_REASONS.includes(reason) ? reason : "manual",
      resumePhase: state.phase,
      revision: state.revision + 1,
    });
  }

  function resumeMatch(state) {
    if (!isMatchState(state) || state.phase !== "paused") return state;
    return freezeState({
      ...state,
      phase: state.resumePhase,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function nextRound(state) {
    if (!isMatchState(state) || state.phase !== "round-end" || state.rounds.length >= state.rules.maxRounds) return state;
    const previous = state.rounds[state.rounds.length - 1];
    const countdownMs = state.rules.countdownMs;
    return freezeState({
      ...state,
      phase: countdownMs === 0 ? "playing" : "countdown",
      rounds: [...state.rounds, { spawnVariant: previous.spawnVariant === 0 ? 1 : 0, ticks: [] }],
      countdownMs,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function restartMatch(state) {
    if (!isMatchState(state)) return createMatchState();
    return freezeState({
      phase: "ready",
      playerNames: state.playerNames,
      rules: state.rules,
      rounds: [],
      countdownMs: 0,
      pauseReason: null,
      resumePhase: null,
      revision: state.revision + 1,
    });
  }

  function replayRound(round, rawRules) {
    const rules = sanitizeReplayRules(rawRules);
    const normalizedRound = normalizeRound(round);
    const players = spawnPlayers(normalizedRound.spawnVariant, rules);
    const occupied = new Map(players.map((player, owner) => [cellKey(player.x, player.y), owner]));
    const occupiedCells = players.map((player, owner) => ({ x: player.x, y: player.y, owner }));
    let outcome = null;
    let tick = 0;

    for (const entry of normalizedRound.ticks) {
      if (outcome) break;
      tick += 1;
      const turns = normalizeTurns(entry.turns);
      const nextDirections = players.map((player, index) => turnDirection(player.direction, turns[index]));
      const attempts = players.map((player, index) => movePoint(player, nextDirections[index]));
      const reasons = [[], []];

      for (let index = 0; index < 2; index += 1) {
        const attempt = attempts[index];
        if (!inBounds(attempt, rules.grid)) {
          reasons[index].push("wall");
          continue;
        }
        const owner = occupied.get(cellKey(attempt.x, attempt.y));
        if (owner === index) reasons[index].push("own-trail");
        else if (owner !== undefined) reasons[index].push("rival-trail");
      }

      if (samePoint(attempts[0], attempts[1])) {
        reasons[0].push("same-destination");
        reasons[1].push("same-destination");
      }
      if (samePoint(attempts[0], players[1]) && samePoint(attempts[1], players[0])) {
        reasons[0].push("head-swap");
        reasons[1].push("head-swap");
      }

      const dead = reasons.map((entries) => entries.length > 0);
      if (dead[0] || dead[1]) {
        players.forEach((player, index) => {
          player.direction = nextDirections[index];
          player.alive = !dead[index];
        });
        outcome = {
          type: dead[0] && dead[1] ? "draw" : "winner",
          winner: dead[0] === dead[1] ? null : dead[0] ? 1 : 0,
          tick,
          attempts,
          reasons,
        };
        continue;
      }

      players.forEach((player, index) => {
        player.x = attempts[index].x;
        player.y = attempts[index].y;
        player.direction = nextDirections[index];
        occupied.set(cellKey(player.x, player.y), index);
        occupiedCells.push({ x: player.x, y: player.y, owner: index });
      });
    }

    return deepFreeze({
      tick,
      occupiedCells,
      players,
      outcome,
    });
  }

  function getView(state) {
    if (!isMatchState(state)) return null;
    const roundNumber = state.rounds.length || 1;
    const activeRound = state.rounds[state.rounds.length - 1] || { spawnVariant: 0, ticks: [] };
    const replay = replayRound(activeRound, state.rules);
    const scores = deriveScores(state.rounds, state.rules);
    const outcome = replay.outcome ? presentOutcome(replay.outcome, state.playerNames) : null;
    return {
      phase: state.phase,
      title: state.rules.copy.title,
      playerNames: [...state.playerNames],
      scores: [...scores],
      roundNumber,
      maxRounds: state.rules.maxRounds,
      countdownLabel: state.phase === "countdown" ? String(Math.max(1, Math.ceil(state.countdownMs / 1000))) : null,
      statusLabel: statusFor(state, outcome),
      outcome,
      canStart: state.phase === "ready" || state.phase === "match-end",
      canPause: state.phase === "countdown" || state.phase === "playing",
      canResume: state.phase === "paused",
      canNextRound: state.phase === "round-end",
      canRestart: state.phase === "match-end",
      board: cloneReplay(replay),
    };
  }

  function classifyTurnCode(code) {
    const entry = {
      KeyA: { player: 0, turn: -1 },
      KeyD: { player: 0, turn: 1 },
      ArrowLeft: { player: 1, turn: -1 },
      ArrowRight: { player: 1, turn: 1 },
      KeyJ: { player: 1, turn: -1 },
      KeyL: { player: 1, turn: 1 },
    }[code];
    return entry ? { ...entry } : null;
  }

  function sanitizeConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    const names = Array.isArray(source.playerNames) ? source.playerNames : [];
    const playerNames = [cleanName(names[0], "玩家 1"), cleanName(names[1], "玩家 2")];
    const grid = sanitizeGrid(source.grid, DEFAULT_RULES.grid);
    const rules = {
      grid,
      tickMs: boundedInteger(source.tickMs, 60, 250, DEFAULT_RULES.tickMs),
      countdownMs: boundedInteger(source.countdownMs, 0, 5000, DEFAULT_RULES.countdownMs),
      maxFrameGapMs: positiveInteger(source.maxFrameGapMs, DEFAULT_RULES.maxFrameGapMs),
      maxRounds: DEFAULT_RULES.maxRounds,
      targetScore: DEFAULT_RULES.targetScore,
      copy: sanitizeCopy(source.copy),
    };
    return deepFreeze({ playerNames, rules });
  }

  function sanitizeReplayRules(rawRules) {
    const source = rawRules && typeof rawRules === "object" ? rawRules : DEFAULT_RULES;
    const gridSource = source.grid && typeof source.grid === "object" ? source.grid : DEFAULT_RULES.grid;
    const columns = Number.isInteger(gridSource.columns) && gridSource.columns >= 2 ? gridSource.columns : DEFAULT_RULES.grid.columns;
    const rows = Number.isInteger(gridSource.rows) && gridSource.rows >= 2 ? gridSource.rows : DEFAULT_RULES.grid.rows;
    const spawnVariants = normalizeSpawnVariants(source.spawnVariants, { columns, rows });
    return { grid: { columns, rows }, spawnVariants };
  }

  function sanitizeGrid(value, fallback) {
    if (!value || typeof value !== "object") return { ...fallback };
    const columns = Number.isInteger(value.columns) && value.columns >= 12 ? value.columns : fallback.columns;
    const rows = Number.isInteger(value.rows) && value.rows >= 8 ? value.rows : fallback.rows;
    return { columns, rows };
  }

  function sanitizeCopy(value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.fromEntries(Object.entries(DEFAULT_COPY).map(([key, fallback]) => {
      const candidate = typeof source[key] === "string" ? source[key].trim() : "";
      return [key, candidate ? Array.from(candidate).slice(0, 120).join("") : fallback];
    }));
  }

  function normalizeSpawnVariants(value, grid) {
    if (Array.isArray(value) && value.length >= 2) {
      const normalized = value.slice(0, 2).map((variant) => normalizeSpawnPair(variant, grid));
      if (normalized.every(Boolean)) return normalized;
    }
    const xInset = Math.max(1, Math.min(grid.columns - 2, Math.floor(grid.columns / 6)));
    const yInset = Math.max(1, Math.min(grid.rows - 2, Math.floor(grid.rows / 4)));
    const first = { x: xInset, y: yInset, direction: "E", alive: true, marker: "ring" };
    const second = {
      x: grid.columns - 1 - xInset,
      y: grid.rows - 1 - yInset,
      direction: "W",
      alive: true,
      marker: "diamond",
    };
    return [[first, second], [
      { ...second, marker: "ring" },
      { ...first, marker: "diamond" },
    ]];
  }

  function normalizeSpawnPair(value, grid) {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const pair = value.map((player, index) => {
      if (!player || !inBounds(player, grid) || !DIRECTIONS.includes(player.direction)) return null;
      return {
        x: player.x,
        y: player.y,
        direction: player.direction,
        alive: true,
        marker: index === 0 ? "ring" : "diamond",
      };
    });
    return pair.every(Boolean) && !samePoint(pair[0], pair[1]) ? pair : null;
  }

  function spawnPlayers(variant, rules) {
    return rules.spawnVariants[variant].map((player) => ({ ...player }));
  }

  function normalizeRound(round) {
    const spawnVariant = round?.spawnVariant === 1 ? 1 : 0;
    const ticks = Array.isArray(round?.ticks) ? round.ticks.map((tick) => ({ turns: normalizeTurns(tick?.turns) })) : [];
    return { spawnVariant, ticks };
  }

  function normalizeTurns(value) {
    return [normalizeTurn(value?.[0]), normalizeTurn(value?.[1])];
  }

  function normalizeTurn(value) {
    return value === -1 || value === 1 ? value : 0;
  }

  function turnDirection(direction, turn) {
    const index = DIRECTIONS.indexOf(direction);
    return DIRECTIONS[(index + turn + DIRECTIONS.length) % DIRECTIONS.length];
  }

  function movePoint(player, direction) {
    return { x: player.x + VECTORS[direction].x, y: player.y + VECTORS[direction].y };
  }

  function deriveScores(rounds, rules) {
    const scores = [0, 0];
    for (const round of rounds) {
      const outcome = replayRound(round, rules).outcome;
      if (outcome?.winner === 0 || outcome?.winner === 1) scores[outcome.winner] += 1;
    }
    return scores;
  }

  function presentOutcome(outcome, names) {
    const bothReasons = [...outcome.reasons[0], ...outcome.reasons[1]];
    let title;
    let support;
    if (outcome.type === "winner") {
      title = `${names[outcome.winner]} 留住了这片边界`;
      support = `${names[outcome.winner === 0 ? 1 : 0]} 撞上了光轨。`;
    } else if (bothReasons.includes("same-destination")) {
      title = "同时撞线，平局";
      support = "同格相撞 · 双方不得分";
    } else if (bothReasons.includes("head-swap")) {
      title = "迎面换位，平局";
      support = "这一局谁也没抢走边界。";
    } else {
      title = "同时熄灭，平局";
      support = "这一局谁也没抢走边界。";
    }
    return {
      type: outcome.type,
      winner: outcome.winner,
      tick: outcome.tick,
      attempts: outcome.attempts.map((point) => ({ ...point })),
      reasons: outcome.reasons.map((entries) => [...entries]),
      title,
      support,
    };
  }

  function statusFor(state, outcome) {
    if (state.phase === "ready") return state.rules.copy.ready;
    if (state.phase === "countdown") return String(Math.max(1, Math.ceil(state.countdownMs / 1000)));
    if (state.phase === "playing") return state.rules.copy.playing;
    if (state.phase === "paused") {
      if (state.pauseReason === "stalled") return state.rules.copy.stalledPause;
      return state.pauseReason === "manual" ? state.rules.copy.manualPause : state.rules.copy.awayPause;
    }
    return outcome?.title || "本轮结束";
  }

  function cloneReplay(replay) {
    return {
      tick: replay.tick,
      occupiedCells: replay.occupiedCells.map((cell) => ({ ...cell })),
      players: replay.players.map((player) => ({ ...player })),
      outcome: replay.outcome ? {
        type: replay.outcome.type,
        winner: replay.outcome.winner,
        tick: replay.outcome.tick,
        attempts: replay.outcome.attempts.map((point) => ({ ...point })),
        reasons: replay.outcome.reasons.map((entries) => [...entries]),
      } : null,
    };
  }

  function normalizeElapsed(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.floor(value));
  }

  function boundedInteger(value, minimum, maximum, fallback) {
    return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
  }

  function positiveInteger(value, fallback) {
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  function cleanName(value, fallback) {
    const text = typeof value === "string" ? value.trim() : "";
    return text ? Array.from(text).slice(0, 12).join("") : fallback;
  }

  function inBounds(point, grid) {
    return Number.isInteger(point?.x) && Number.isInteger(point?.y)
      && point.x >= 0 && point.x < grid.columns && point.y >= 0 && point.y < grid.rows;
  }

  function samePoint(left, right) {
    return left.x === right.x && left.y === right.y;
  }

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function isMatchState(value) {
    return Boolean(value && typeof value === "object"
      && ["ready", "countdown", "playing", "paused", "round-end", "match-end"].includes(value.phase)
      && Array.isArray(value.playerNames) && value.playerNames.length === 2
      && value.rules && typeof value.rules === "object"
      && Array.isArray(value.rounds) && value.rounds.length <= 3
      && Number.isInteger(value.countdownMs) && value.countdownMs >= 0
      && Number.isInteger(value.revision) && value.revision >= 0);
  }

  function freezeState(state) {
    return deepFreeze(state);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return Object.freeze({
    DEFAULT_RULES,
    createMatchState,
    startMatch,
    advanceCountdown,
    stepRound,
    pauseMatch,
    resumeMatch,
    nextRound,
    restartMatch,
    replayRound,
    getView,
    classifyTurnCode,
  });
});
