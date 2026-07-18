(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SignalRepairLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TICKS_PER_SECOND = 10;
  const ROUND_TICKS = 45 * TICKS_PER_SECOND;
  const LOCK_TICKS = 9;
  const UINT32_RANGE = 0x100000000;
  const BRANCH_IDS = Object.freeze(["A", "B", "C"]);
  const TEXTURES = Object.freeze(["ripple", "grain", "lattice"]);
  const SYMBOLS = Object.freeze(["moon", "comet", "ring"]);
  const SIGNALS = Object.freeze(["low", "middle", "high"]);
  const PHASES = Object.freeze(["intro", "handoff", "playing", "round-result", "timeout", "paused", "complete"]);
  const TEXTURE_LABELS = Object.freeze({ ripple: "波纹", grain: "星砂", lattice: "网格" });
  const SYMBOL_LABELS = Object.freeze({ moon: "月弧", comet: "彗尾", ring: "星环" });
  const SIGNAL_LABELS = Object.freeze({ low: "微弱", middle: "平稳", high: "明亮" });
  const SIGNAL_RANK = Object.freeze({ low: 0, middle: 1, high: 2 });

  const DEFAULT_CONFIG = deepFreeze({
    northName: "北席",
    southName: "南席",
    transmissionFragments: [
      "原来每次信号微弱时，",
      "都是你还在另一端回应。",
      "以后也请继续和我说话，",
      "我会一直把你接回来。",
    ],
  });

  const DEFAULT_PUZZLES = deepFreeze([
    puzzle("echo-01", "初醒微光", 0, [
      branch("A", "ripple", 2, "moon", "low"),
      branch("B", "grain", 3, "comet", "middle"),
      branch("C", "lattice", 5, "ring", "high"),
    ], [rule("parity", "even"), rule("symbol", "moon"), rule("signal-extreme", "max")]),
    puzzle("echo-02", "偏航薄雾", 1, [
      branch("A", "ripple", 3, "moon", "low"),
      branch("B", "grain", 4, "comet", "middle"),
      branch("C", "lattice", 6, "ring", "high"),
    ], [rule("parity", "even"), rule("symbol", "moon"), rule("signal-extreme", "max")]),
    puzzle("echo-03", "静默潮汐", 2, [
      branch("A", "ripple", 2, "moon", "low"),
      branch("B", "grain", 4, "comet", "high"),
      branch("C", "lattice", 6, "ring", "middle"),
    ], [rule("parity", "even"), rule("symbol", "moon"), rule("signal-extreme", "min")]),
    puzzle("echo-04", "深空回声", 3, [
      branch("A", "ripple", 3, "moon", "middle"),
      branch("B", "grain", 5, "moon", "low"),
      branch("C", "lattice", 7, "comet", "high"),
    ], [rule("parity", "odd"), rule("symbol", "moon"), rule("signal-extreme", "max")]),
    puzzle("echo-05", "双星干涉", 0, [
      branch("A", "ripple", 4, "moon", "low"),
      branch("B", "grain", 4, "comet", "high"),
      branch("C", "lattice", 5, "ring", "middle"),
    ], [rule("parity", "even"), rule("symbol", "ring"), rule("node-extreme", "max")]),
    puzzle("echo-06", "折返信标", 1, [
      branch("A", "ripple", 2, "moon", "high"),
      branch("B", "ripple", 5, "comet", "low"),
      branch("C", "lattice", 6, "ring", "middle"),
    ], [rule("texture", "ripple"), rule("parity", "even"), rule("signal-extreme", "min")]),
    puzzle("echo-07", "暗面漂移", 2, [
      branch("A", "grain", 2, "moon", "middle"),
      branch("B", "lattice", 5, "comet", "middle"),
      branch("C", "ripple", 7, "ring", "low"),
    ], [rule("signal", "middle"), rule("parity", "odd"), rule("node-extreme", "min")]),
    puzzle("echo-08", "近日扰动", 3, [
      branch("A", "lattice", 6, "moon", "high"),
      branch("B", "grain", 3, "comet", "high"),
      branch("C", "ripple", 5, "ring", "middle"),
    ], [rule("signal", "high"), rule("parity", "odd"), rule("node-extreme", "max")]),
    puzzle("echo-09", "远日衰减", 0, [
      branch("A", "grain", 7, "ring", "high"),
      branch("B", "lattice", 2, "moon", "low"),
      branch("C", "ripple", 4, "comet", "low"),
    ], [rule("signal", "low"), rule("parity", "even"), rule("node-extreme", "max")]),
    puzzle("echo-10", "晶格噪声", 1, [
      branch("A", "grain", 3, "moon", "low"),
      branch("B", "grain", 5, "comet", "high"),
      branch("C", "lattice", 4, "ring", "middle"),
    ], [rule("texture", "grain"), rule("parity", "odd"), rule("symbol", "ring")]),
    puzzle("echo-11", "环带遮蔽", 2, [
      branch("A", "ripple", 2, "ring", "low"),
      branch("B", "grain", 3, "ring", "middle"),
      branch("C", "lattice", 5, "moon", "high"),
    ], [rule("symbol", "ring"), rule("parity", "odd"), rule("signal-extreme", "max")]),
    puzzle("echo-12", "余波重叠", 3, [
      branch("A", "lattice", 6, "comet", "high"),
      branch("B", "grain", 3, "moon", "middle"),
      branch("C", "ripple", 5, "ring", "high"),
    ], [rule("signal", "high"), rule("parity", "odd"), rule("signal", "middle")]),
  ]);
  const PUZZLE_BY_ID = new Map(DEFAULT_PUZZLES.map((entry) => [entry.id, entry]));

  function sanitizeConfig(rawConfig) {
    const source = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    const fragments = sanitizeFragments(source.transmissionFragments);
    return deepFreeze({
      northName: cleanText(source.northName, 12, DEFAULT_CONFIG.northName),
      southName: cleanText(source.southName, 12, DEFAULT_CONFIG.southName),
      transmissionFragments: fragments,
    });
  }

  function validatePuzzleBank(bank) {
    if (!Array.isArray(bank) || bank.length !== 12) return false;
    const ids = new Set();
    for (const entry of bank) {
      if (!isPuzzle(entry) || ids.has(entry.id)) return false;
      if (new Set(entry.branches).size !== 3) return false;
      const solution = solvePuzzle(entry);
      if (!solution || !entry.branches.some((candidate) => candidate.id === solution.branchId)) return false;
      ids.add(entry.id);
    }
    return true;
  }

  function explainRule(value) {
    if (!isRule(value)) return null;
    if (value.kind === "parity") {
      return `若恰有一条星路的节点数为${value.value === "even" ? "偶数" : "奇数"}，接回它。`;
    }
    if (value.kind === "symbol") return `若恰有一条星路带${SYMBOL_LABELS[value.value]}，接回它。`;
    if (value.kind === "texture") return `若恰有一条星路呈${TEXTURE_LABELS[value.value]}，接回它。`;
    if (value.kind === "signal") return `若恰有一条星路的信号${SIGNAL_LABELS[value.value]}，接回它。`;
    if (value.kind === "node-extreme") return `若只有一条星路的节点${value.value === "min" ? "最少" : "最多"}，接回它。`;
    return `若只有一条星路的信号${value.value === "min" ? "最低" : "最高"}，接回它。`;
  }

  function solvePuzzle(value) {
    if (!isPuzzle(value)) return null;
    for (let ruleIndex = 0; ruleIndex < value.rules.length; ruleIndex += 1) {
      const currentRule = value.rules[ruleIndex];
      const matches = matchingBranches(value.branches, currentRule);
      if (matches.length === 1) {
        return deepFreeze({
          branchId: matches[0].id,
          ruleIndex,
          ruleText: explainRule(currentRule),
        });
      }
    }
    return null;
  }

  function createSession(puzzles = DEFAULT_PUZZLES, randomIndex, count = 4) {
    const source = validatePuzzleBank(puzzles) ? puzzles : DEFAULT_PUZZLES;
    const desiredCount = Number.isInteger(count) && count > 0 && count <= source.length ? count : 4;
    const pool = source.map((entry) => entry.id);
    const plan = [];
    while (plan.length < desiredCount) {
      let index = 0;
      if (typeof randomIndex === "function") {
        try {
          const candidate = randomIndex(pool.length);
          if (Number.isInteger(candidate) && candidate >= 0 && candidate < pool.length) index = candidate;
        } catch {
          index = 0;
        }
      }
      plan.push(pool.splice(index, 1)[0]);
    }
    return Object.freeze(plan);
  }

  function createUnbiasedRandomIndex(cryptoLike) {
    return function randomIndex(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
        throw new RangeError("maxExclusive must be an integer from 1 through 2^32");
      }
      if (maxExclusive === 1) return 0;
      if (!cryptoLike || typeof cryptoLike.getRandomValues !== "function") return 0;
      const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
      const sample = new Uint32Array(1);
      for (let attempt = 0; attempt < 128; attempt += 1) {
        try {
          cryptoLike.getRandomValues(sample);
        } catch {
          return 0;
        }
        if (sample[0] < limit) return sample[0] % maxExclusive;
      }
      return 0;
    };
  }

  function createInitialState(rawConfig) {
    return createIntroState(sanitizeConfig(rawConfig), 0);
  }

  function reduce(state, action) {
    if (!isState(state) || !action || typeof action !== "object" || typeof action.type !== "string") return state;
    if (action.type === "START") return start(state, action.plan);
    if (action.type === "READY") return ready(state, action.seat);
    if (action.type === "SELECT") return select(state, action.branchId);
    if (action.type === "TICK") return tick(state, action.ticks);
    if (action.type === "PAUSE") return pause(state);
    if (action.type === "RESUME") return resume(state);
    if (action.type === "RETRY") return retry(state);
    if (action.type === "NEXT") return next(state);
    if (action.type === "RESTART") return restart(state);
    return state;
  }

  function getView(state) {
    if (!isState(state)) return null;
    const puzzleEntry = state.plan.length === 4 ? PUZZLE_BY_ID.get(state.plan[state.roundIndex]) : null;
    const southRole = state.northRole === "operator" ? "navigator" : "operator";
    const operatorSeat = state.northRole === "operator" ? "north" : "south";
    const visiblePuzzle = state.phase === "playing" ? presentPuzzle(puzzleEntry) : null;
    const visibleRules = state.phase === "playing"
      ? puzzleEntry.rules.map((entry, index) => ({ index, text: explainRule(entry) }))
      : null;
    const revealRecords = state.phase === "complete";
    const completed = state.completed.map((entry) => revealRecords ? cloneCompleted(entry) : {
      puzzleId: entry.puzzleId,
      operatorSeat: entry.operatorSeat,
      attempts: entry.attempts,
      remainingTicks: entry.remainingTicks,
    });
    return {
      phase: state.phase,
      roundNumber: state.roundIndex + 1,
      roundCount: 4,
      north: { name: state.config.northName, role: state.northRole, orientation: "north" },
      south: { name: state.config.southName, role: southRole, orientation: "south" },
      operatorSeat,
      operatorName: operatorSeat === "north" ? state.config.northName : state.config.southName,
      navigatorSeat: operatorSeat === "north" ? "south" : "north",
      navigatorName: operatorSeat === "north" ? state.config.southName : state.config.northName,
      ready: { ...state.ready },
      remainingTicks: state.remainingTicks,
      remainingSeconds: Math.ceil(state.remainingTicks / TICKS_PER_SECOND),
      lockTicks: state.lockTicks,
      isLocked: state.lockTicks > 0,
      attempts: state.attempts,
      currentPuzzle: visiblePuzzle,
      puzzleTitle: puzzleEntry && !["intro", "handoff", "timeout", "paused"].includes(state.phase) ? puzzleEntry.title : null,
      rules: visibleRules,
      completed,
      outcome: state.phase === "round-result" || state.phase === "complete" ? cloneOutcome(state.outcome) : null,
      transmissionFragments: state.phase === "complete" ? [...state.config.transmissionFragments] : [],
      statusLabel: statusFor(state),
      canStart: state.phase === "intro",
      canReady: state.phase === "handoff",
      canSelect: state.phase === "playing" && state.lockTicks === 0,
      canPause: state.phase === "playing",
      canResume: state.phase === "paused",
      canRetry: state.phase === "timeout",
      canNext: state.phase === "round-result",
      canRestart: state.phase === "complete",
    };
  }

  function replay(rawConfig, actions) {
    let state = createInitialState(rawConfig);
    if (!Array.isArray(actions)) return state;
    for (const action of actions) state = reduce(state, action);
    return state;
  }

  function classifyKey(code, repeat = false) {
    if (repeat === true) return null;
    if (code === "Escape") return { type: "PAUSE", reason: "manual" };
    const branchId = { KeyA: "A", KeyB: "B", KeyC: "C" }[code];
    return branchId ? { type: "SELECT", branchId } : null;
  }

  function start(state, plan) {
    if (state.phase !== "intro" || !isValidPlan(plan)) return state;
    return update(state, {
      phase: "handoff",
      plan: [...plan],
      roundIndex: 0,
      northRole: "navigator",
      ready: { north: false, south: false },
      remainingTicks: ROUND_TICKS,
      lockTicks: 0,
      attempts: 0,
      completed: [],
      outcome: null,
      pausedFrom: null,
    });
  }

  function ready(state, seat) {
    if (state.phase !== "handoff" || (seat !== "north" && seat !== "south") || state.ready[seat]) return state;
    const nextReady = { ...state.ready, [seat]: true };
    return update(state, {
      phase: nextReady.north && nextReady.south ? "playing" : "handoff",
      ready: nextReady,
      remainingTicks: ROUND_TICKS,
    });
  }

  function select(state, branchId) {
    if (state.phase !== "playing" || state.lockTicks !== 0 || !BRANCH_IDS.includes(branchId)) return state;
    const puzzleEntry = PUZZLE_BY_ID.get(state.plan[state.roundIndex]);
    const solution = solvePuzzle(puzzleEntry);
    const attempts = state.attempts + 1;
    if (branchId !== solution.branchId) {
      return update(state, { attempts, lockTicks: LOCK_TICKS });
    }
    const operatorSeat = state.northRole === "operator" ? "north" : "south";
    const completedEntry = {
      puzzleId: puzzleEntry.id,
      operatorSeat,
      attempts,
      remainingTicks: state.remainingTicks,
      branchId: solution.branchId,
      ruleIndex: solution.ruleIndex,
    };
    return update(state, {
      phase: "round-result",
      attempts,
      completed: [...state.completed, completedEntry],
      outcome: solution,
      pausedFrom: null,
    });
  }

  function tick(state, ticks) {
    if (state.phase !== "playing" || !Number.isInteger(ticks) || ticks <= 0) return state;
    const remainingTicks = Math.max(0, state.remainingTicks - ticks);
    const lockTicks = Math.max(0, state.lockTicks - ticks);
    if (remainingTicks === 0) {
      return update(state, {
        phase: "timeout",
        remainingTicks,
        lockTicks,
        outcome: null,
        pausedFrom: null,
      });
    }
    return update(state, { remainingTicks, lockTicks });
  }

  function pause(state) {
    if (state.phase !== "playing") return state;
    return update(state, { phase: "paused", pausedFrom: "playing" });
  }

  function resume(state) {
    if (state.phase !== "paused" || state.pausedFrom !== "playing") return state;
    return update(state, { phase: "playing", pausedFrom: null });
  }

  function retry(state) {
    if (state.phase !== "timeout") return state;
    return update(state, {
      phase: "handoff",
      ready: { north: false, south: false },
      remainingTicks: ROUND_TICKS,
      lockTicks: 0,
      outcome: null,
      pausedFrom: null,
    });
  }

  function next(state) {
    if (state.phase !== "round-result") return state;
    if (state.roundIndex === state.plan.length - 1) {
      return update(state, { phase: "complete", pausedFrom: null });
    }
    const roundIndex = state.roundIndex + 1;
    return update(state, {
      phase: "handoff",
      roundIndex,
      northRole: roundIndex % 2 === 1 ? "operator" : "navigator",
      ready: { north: false, south: false },
      remainingTicks: ROUND_TICKS,
      lockTicks: 0,
      attempts: 0,
      outcome: null,
      pausedFrom: null,
    });
  }

  function restart(state) {
    if (state.phase !== "complete") return state;
    return createIntroState(state.config, state.revision + 1);
  }

  function createIntroState(config, revision) {
    return freezeState({
      phase: "intro",
      plan: [],
      roundIndex: 0,
      northRole: "navigator",
      ready: { north: false, south: false },
      remainingTicks: ROUND_TICKS,
      lockTicks: 0,
      attempts: 0,
      completed: [],
      outcome: null,
      pausedFrom: null,
      revision,
      config,
    });
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch, revision: state.revision + 1 });
  }

  function isState(state) {
    if (!state || typeof state !== "object" || !PHASES.includes(state.phase) || !isConfig(state.config)) return false;
    if (!Array.isArray(state.plan) || !Number.isInteger(state.roundIndex) || state.roundIndex < 0 || state.roundIndex > 3) return false;
    if (state.northRole !== expectedNorthRole(state.roundIndex)) return false;
    if (!isReady(state.ready) || !isBoundedInteger(state.remainingTicks, 0, ROUND_TICKS)) return false;
    if (!isBoundedInteger(state.lockTicks, 0, LOCK_TICKS) || !isNonNegativeInteger(state.attempts)) return false;
    if (!Array.isArray(state.completed) || !isNonNegativeInteger(state.revision)) return false;
    if (state.pausedFrom !== null && state.pausedFrom !== "playing") return false;
    if (state.phase === "intro") {
      return state.plan.length === 0
        && state.roundIndex === 0
        && !state.ready.north && !state.ready.south
        && state.remainingTicks === ROUND_TICKS
        && state.lockTicks === 0 && state.attempts === 0
        && state.completed.length === 0 && state.outcome === null && state.pausedFrom === null;
    }
    if (!isValidPlan(state.plan) || !hasValidCompletedPrefix(state.completed, state.plan)) return false;
    const successPhase = state.phase === "round-result" || state.phase === "complete";
    const expectedCompleted = state.roundIndex + (successPhase ? 1 : 0);
    if (state.completed.length !== expectedCompleted) return false;
    if (successPhase) {
      const solution = solvePuzzle(PUZZLE_BY_ID.get(state.plan[state.roundIndex]));
      if (!sameOutcome(state.outcome, solution)) return false;
      if (state.attempts !== state.completed[state.completed.length - 1].attempts) return false;
    } else if (state.outcome !== null) return false;
    if (state.phase === "handoff") {
      return !(state.ready.north && state.ready.south)
        && state.remainingTicks === ROUND_TICKS && state.lockTicks === 0 && state.pausedFrom === null;
    }
    if (state.phase === "playing") {
      return state.ready.north && state.ready.south && state.remainingTicks > 0 && state.pausedFrom === null;
    }
    if (state.phase === "paused") {
      return state.ready.north && state.ready.south && state.remainingTicks > 0 && state.pausedFrom === "playing";
    }
    if (state.phase === "timeout") {
      return state.ready.north && state.ready.south && state.remainingTicks === 0 && state.pausedFrom === null;
    }
    if (state.phase === "round-result") {
      return state.ready.north && state.ready.south && state.remainingTicks > 0 && state.lockTicks === 0 && state.pausedFrom === null;
    }
    return state.roundIndex === 3 && state.completed.length === 4 && state.pausedFrom === null;
  }

  function hasValidCompletedPrefix(completed, plan) {
    if (completed.length > plan.length) return false;
    return completed.every((entry, index) => {
      const puzzleEntry = PUZZLE_BY_ID.get(plan[index]);
      const solution = solvePuzzle(puzzleEntry);
      return Boolean(
        entry && typeof entry === "object"
        && entry.puzzleId === plan[index]
        && entry.operatorSeat === (index % 2 === 0 ? "south" : "north")
        && isPositiveInteger(entry.attempts)
        && isBoundedInteger(entry.remainingTicks, 1, ROUND_TICKS)
        && entry.branchId === solution.branchId
        && entry.ruleIndex === solution.ruleIndex
      );
    });
  }

  function isValidPlan(plan) {
    return Array.isArray(plan)
      && plan.length === 4
      && new Set(plan).size === 4
      && plan.every((id) => typeof id === "string" && PUZZLE_BY_ID.has(id));
  }

  function isConfig(value) {
    return Boolean(
      value && typeof value === "object"
      && typeof value.northName === "string" && value.northName.length > 0 && Array.from(value.northName).length <= 12
      && typeof value.southName === "string" && value.southName.length > 0 && Array.from(value.southName).length <= 12
      && Array.isArray(value.transmissionFragments) && value.transmissionFragments.length === 4
      && value.transmissionFragments.every((entry) => typeof entry === "string" && entry.length > 0 && Array.from(entry).length <= 48)
    );
  }

  function isPuzzle(value) {
    if (!value || typeof value !== "object" || typeof value.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) return false;
    if (!hasOnlyKeys(value, ["id", "title", "transmissionIndex", "branches", "rules"])) return false;
    if (typeof value.title !== "string" || value.title.trim() === "" || Array.from(value.title).length > 12) return false;
    if (!isBoundedInteger(value.transmissionIndex, 0, 3)) return false;
    if (!Array.isArray(value.branches) || value.branches.length !== 3 || !Array.isArray(value.rules) || value.rules.length !== 3) return false;
    if (!value.branches.every(isBranch) || !value.rules.every(isRule)) return false;
    return value.branches.map((entry) => entry.id).join("") === "ABC";
  }

  function isBranch(value) {
    return Boolean(
      value && typeof value === "object"
      && hasOnlyKeys(value, ["id", "texture", "nodeCount", "symbol", "signal"])
      && BRANCH_IDS.includes(value.id)
      && TEXTURES.includes(value.texture)
      && isBoundedInteger(value.nodeCount, 2, 7)
      && SYMBOLS.includes(value.symbol)
      && SIGNALS.includes(value.signal)
    );
  }

  function isRule(value) {
    if (!value || typeof value !== "object" || typeof value.kind !== "string") return false;
    if (!hasOnlyKeys(value, ["kind", "value"])) return false;
    if (value.kind === "parity") return value.value === "even" || value.value === "odd";
    if (value.kind === "symbol") return SYMBOLS.includes(value.value);
    if (value.kind === "texture") return TEXTURES.includes(value.value);
    if (value.kind === "signal") return SIGNALS.includes(value.value);
    if (value.kind === "node-extreme" || value.kind === "signal-extreme") return value.value === "min" || value.value === "max";
    return false;
  }

  function matchingBranches(branches, currentRule) {
    if (currentRule.kind === "parity") {
      const remainder = currentRule.value === "even" ? 0 : 1;
      return branches.filter((entry) => entry.nodeCount % 2 === remainder);
    }
    if (currentRule.kind === "symbol" || currentRule.kind === "texture" || currentRule.kind === "signal") {
      return branches.filter((entry) => entry[currentRule.kind] === currentRule.value);
    }
    if (currentRule.kind === "node-extreme") {
      const values = branches.map((entry) => entry.nodeCount);
      const extreme = currentRule.value === "min" ? Math.min(...values) : Math.max(...values);
      return branches.filter((entry) => entry.nodeCount === extreme);
    }
    const values = branches.map((entry) => SIGNAL_RANK[entry.signal]);
    const extreme = currentRule.value === "min" ? Math.min(...values) : Math.max(...values);
    return branches.filter((entry) => SIGNAL_RANK[entry.signal] === extreme);
  }

  function presentPuzzle(value) {
    return {
      id: value.id,
      title: value.title,
      branches: value.branches.map((entry) => ({
        ...entry,
        textureLabel: TEXTURE_LABELS[entry.texture],
        symbolLabel: SYMBOL_LABELS[entry.symbol],
        signalLabel: SIGNAL_LABELS[entry.signal],
        signalLevel: SIGNAL_RANK[entry.signal] + 1,
      })),
    };
  }

  function statusFor(state) {
    if (state.phase === "intro") return "面对面放好设备，准备一起接回信号。";
    if (state.phase === "handoff") {
      if (state.ready.north || state.ready.south) return "一边已经准备好，等待另一边。";
      return "这一轮交换视角，两边准备好后再开始。";
    }
    if (state.phase === "playing" && state.lockTicks > 0) return "这条还没有接通，继续听对方说。";
    if (state.phase === "playing") return "听对方说，再接回一条星路。";
    if (state.phase === "paused") return "这一轮暂停了，时间和信号都停在这里。";
    if (state.phase === "timeout") return "信号淡出了，不公布答案，原题再听一次。";
    if (state.phase === "round-result") return "这一段接回来了，准备交换位置。";
    return "传输已完整，在漫长的夜里，我们终于听见彼此。";
  }

  function sanitizeFragments(value) {
    if (!Array.isArray(value) || value.length !== 4) return [...DEFAULT_CONFIG.transmissionFragments];
    const cleaned = value.map((entry) => cleanText(entry, 48, ""));
    return cleaned.every(Boolean) ? cleaned : [...DEFAULT_CONFIG.transmissionFragments];
  }

  function cleanText(value, maxLength, fallback) {
    const text = typeof value === "string" ? value.trim() : "";
    return text ? Array.from(text).slice(0, maxLength).join("") : fallback;
  }

  function cloneCompleted(entry) {
    return {
      puzzleId: entry.puzzleId,
      operatorSeat: entry.operatorSeat,
      attempts: entry.attempts,
      remainingTicks: entry.remainingTicks,
      branchId: entry.branchId,
      ruleIndex: entry.ruleIndex,
    };
  }

  function cloneOutcome(value) {
    return value ? { branchId: value.branchId, ruleIndex: value.ruleIndex, ruleText: value.ruleText } : null;
  }

  function sameOutcome(left, right) {
    return Boolean(left && right
      && left.branchId === right.branchId
      && left.ruleIndex === right.ruleIndex
      && left.ruleText === right.ruleText);
  }

  function isReady(value) {
    return Boolean(value && typeof value === "object" && typeof value.north === "boolean" && typeof value.south === "boolean");
  }

  function hasOnlyKeys(value, keys) {
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
  }

  function expectedNorthRole(roundIndex) {
    return roundIndex % 2 === 1 ? "operator" : "navigator";
  }

  function isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
  }

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  function isBoundedInteger(value, min, max) {
    return Number.isInteger(value) && value >= min && value <= max;
  }

  function branch(id, texture, nodeCount, symbol, signal) {
    return { id, texture, nodeCount, symbol, signal };
  }

  function rule(kind, value) {
    return { kind, value };
  }

  function puzzle(id, title, transmissionIndex, branches, rules) {
    return { id, title, transmissionIndex, branches, rules };
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
    DEFAULT_PUZZLES,
    DEFAULT_CONFIG,
    TICKS_PER_SECOND,
    sanitizeConfig,
    validatePuzzleBank,
    explainRule,
    solvePuzzle,
    createSession,
    createInitialState,
    reduce,
    getView,
    replay,
    classifyKey,
    createUnbiasedRandomIndex,
  });
});
