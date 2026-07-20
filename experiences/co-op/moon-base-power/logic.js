(function (root, factory) {
  "use strict";

  let levels = root && root.MoonBasePowerLevels;
  let config = root && root.MoonBasePowerConfig;
  if (typeof module === "object" && module.exports) {
    levels = levels || require("./levels.js");
    config = config || require("./config.js");
  }
  const api = factory(levels, config);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MoonBasePowerLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (LEVELS, FILE_CONFIG) {
  "use strict";

  const BUS_L = "L";
  const BUS_R = "R";
  const OFF = "off";
  const TIE_LR = "L-to-R";
  const TIE_RL = "R-to-L";
  const TICK_RATE = 30;
  const TICK_MS = 1000 / TICK_RATE;
  const STABLE_TICKS_REQUIRED = 90;
  const TRANSFER_CAPACITY = 2;
  const MAX_CATCH_UP_TICKS = 5;
  const MAX_FRAME_BUDGET_MS = TICK_MS * MAX_CATCH_UP_TICKS;
  const LOADS = Object.freeze(["oxygen", "lights", "comms"]);
  const TIES = Object.freeze([OFF, TIE_LR, TIE_RL]);
  const BUSES = Object.freeze([BUS_L, BUS_R]);
  const LOAD_VALUES = Object.freeze([OFF, BUS_L, BUS_R]);
  const PHASES = Object.freeze(["intro", "handoff", "operating", "paused", "shift-result", "complete"]);
  const PAUSE_REASONS = Object.freeze(["manual", "hidden", "blur", "long-frame"]);
  const FAULT_ORDER = Object.freeze([
    "invalid-input", "solar-off", "battery-off", "oxygen-off", "lights-off", "comms-off",
    "oxygen-port-unavailable", "lights-port-unavailable", "comms-port-unavailable",
    "tie-maintenance", "tie-required", "tie-idle", "deficit-L", "deficit-R",
  ]);
  const DEFAULT_CONTROLS = deepFreeze({
    solarOn: false,
    batteryOn: false,
    tie: OFF,
    oxygen: OFF,
    lights: OFF,
    comms: OFF,
  });
  const DEFAULT_NOTE = "三次交接都稳稳完成，因为你们把每一次调整都交给了彼此。";
  const DEFAULT_CONFIG = deepFreeze({
    powerOperatorName: "电源席",
    loadOperatorName: "负载席",
    completionTitle: "三次交接，月面没有熄灯",
  });
  const CONFIG_LIMITS = deepFreeze({ powerOperatorName: 16, loadOperatorName: 16, completionTitle: 40 });
  const STATE_KEYS = Object.freeze([
    "phase", "shiftIndex", "controls", "stableTicks", "lastEvaluation", "completedShifts",
    "pauseReason", "resumePhase", "revision",
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function safePlain(value) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) return false;
      return Object.getOwnPropertySymbols(value).length === 0;
    } catch (_error) {
      return false;
    }
  }

  function exactDataObject(value, keys) {
    try {
      if (!safePlain(value)) return false;
      const ownKeys = Object.keys(value);
      if (ownKeys.length !== keys.length || !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;
      return keys.every((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");
      });
    } catch (_error) {
      return false;
    }
  }

  function sameData(left, right) {
    try {
      if (Object.is(left, right)) return true;
      if (typeof left !== typeof right || left === null || right === null) return false;
      if (typeof left !== "object") return false;
      if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left) && Array.isArray(right) && left.length === right.length
          && left.every((item, index) => sameData(item, right[index]));
      }
      if (!safePlain(left) || !safePlain(right)) return false;
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      return leftKeys.length === rightKeys.length && leftKeys.every((key) => (
        Object.prototype.hasOwnProperty.call(right, key) && sameData(left[key], right[key])
      ));
    } catch (_error) {
      return false;
    }
  }

  function cloneFrozen(value) {
    if (Array.isArray(value)) return deepFreeze(value.map(cloneFrozen));
    if (safePlain(value)) {
      const result = {};
      Object.keys(value).forEach((key) => { result[key] = cloneFrozen(value[key]); });
      return deepFreeze(result);
    }
    return value;
  }

  function validLevel(level) {
    try {
      if (!exactDataObject(level, ["id", "number", "title", "note", "supply", "demand", "allowedBuses", "tieRequirement", "transferCapacity"])) return false;
      if (typeof level.id !== "string" || !level.id || !Number.isSafeInteger(level.number) || level.number < 1 || level.number > 3) return false;
      if (typeof level.title !== "string" || !level.title || typeof level.note !== "string" || !level.note) return false;
      if (!exactDataObject(level.supply, ["L", "R"]) || !BUSES.every((bus) => Number.isSafeInteger(level.supply[bus]) && level.supply[bus] >= 0)) return false;
      if (!exactDataObject(level.demand, LOADS) || !LOADS.every((load) => Number.isSafeInteger(level.demand[load]) && level.demand[load] >= 0)) return false;
      if (!exactDataObject(level.allowedBuses, LOADS)) return false;
      if (!LOADS.every((load) => Array.isArray(level.allowedBuses[load])
        && level.allowedBuses[load].length > 0
        && level.allowedBuses[load].every((bus) => BUSES.includes(bus))
        && new Set(level.allowedBuses[load]).size === level.allowedBuses[load].length)) return false;
      return (level.tieRequirement === "off" || level.tieRequirement === "transfer")
        && level.transferCapacity === TRANSFER_CAPACITY;
    } catch (_error) {
      return false;
    }
  }

  function validControls(controls) {
    try {
      return exactDataObject(controls, ["solarOn", "batteryOn", "tie", "oxygen", "lights", "comms"])
        && typeof controls.solarOn === "boolean"
        && typeof controls.batteryOn === "boolean"
        && TIES.includes(controls.tie)
        && LOADS.every((load) => LOAD_VALUES.includes(controls[load]));
    } catch (_error) {
      return false;
    }
  }

  const INVALID_EVALUATION = deepFreeze({
    isSafe: false,
    faults: ["invalid-input"],
    supply: { L: 0, R: 0, total: 0 },
    demand: { L: 0, R: 0, total: 0 },
    local: {
      L: { supply: 0, demand: 0, surplus: 0, deficit: 0 },
      R: { supply: 0, demand: 0, surplus: 0, deficit: 0 },
    },
    transfer: { direction: OFF, from: null, to: null, amount: 0, capacity: TRANSFER_CAPACITY },
    final: {
      L: { supplied: 0, demand: 0, surplus: 0, deficit: 0 },
      R: { supplied: 0, demand: 0, surplus: 0, deficit: 0 },
    },
    loads: {
      oxygen: { bus: OFF, demand: 0, connected: false, allowed: false, safe: false },
      lights: { bus: OFF, demand: 0, connected: false, allowed: false, safe: false },
      comms: { bus: OFF, demand: 0, connected: false, allowed: false, safe: false },
    },
  });

  function evaluateGrid(level, controls) {
    if (!validLevel(level) || !validControls(controls)) return INVALID_EVALUATION;
    const supply = {
      L: controls.solarOn ? level.supply.L : 0,
      R: controls.batteryOn ? level.supply.R : 0,
    };
    supply.total = supply.L + supply.R;
    const demand = { L: 0, R: 0, total: 0 };
    LOADS.forEach((load) => {
      const bus = controls[load];
      if (BUSES.includes(bus)) demand[bus] += level.demand[load];
      if (bus !== OFF) demand.total += level.demand[load];
    });
    const local = {
      L: localSide(supply.L, demand.L),
      R: localSide(supply.R, demand.R),
    };
    let from = null;
    let to = null;
    let amount = 0;
    if (level.tieRequirement === "transfer" && controls.tie !== OFF) {
      from = controls.tie === TIE_LR ? BUS_L : BUS_R;
      to = from === BUS_L ? BUS_R : BUS_L;
      amount = Math.min(level.transferCapacity, local[from].surplus, local[to].deficit);
    }
    const suppliedL = supply.L + (to === BUS_L ? amount : 0) - (from === BUS_L ? amount : 0);
    const suppliedR = supply.R + (to === BUS_R ? amount : 0) - (from === BUS_R ? amount : 0);
    const final = {
      L: finalSide(suppliedL, demand.L),
      R: finalSide(suppliedR, demand.R),
    };
    const faults = [];
    if (!controls.solarOn) faults.push("solar-off");
    if (!controls.batteryOn) faults.push("battery-off");
    LOADS.forEach((load) => { if (controls[load] === OFF) faults.push(`${load}-off`); });
    LOADS.forEach((load) => {
      if (controls[load] !== OFF && !level.allowedBuses[load].includes(controls[load])) faults.push(`${load}-port-unavailable`);
    });
    if (level.tieRequirement === "off" && controls.tie !== OFF) faults.push("tie-maintenance");
    if (level.tieRequirement === "transfer" && controls.tie === OFF) faults.push("tie-required");
    if (level.tieRequirement === "transfer" && controls.tie !== OFF && amount === 0) faults.push("tie-idle");
    if (final.L.deficit > 0) faults.push("deficit-L");
    if (final.R.deficit > 0) faults.push("deficit-R");
    const loads = {};
    LOADS.forEach((load) => {
      const bus = controls[load];
      const connected = bus !== OFF;
      const allowed = connected && level.allowedBuses[load].includes(bus);
      loads[load] = {
        bus,
        demand: level.demand[load],
        connected,
        allowed,
        safe: connected && allowed && final[bus].deficit === 0,
      };
    });
    return deepFreeze({
      isSafe: faults.length === 0,
      faults,
      supply,
      demand,
      local,
      transfer: { direction: controls.tie, from, to, amount, capacity: level.transferCapacity },
      final,
      loads,
    });
  }

  function localSide(supply, demand) {
    return { supply, demand, surplus: Math.max(0, supply - demand), deficit: Math.max(0, demand - supply) };
  }

  function finalSide(supplied, demand) {
    return { supplied, demand, surplus: Math.max(0, supplied - demand), deficit: Math.max(0, demand - supplied) };
  }

  function enumerateControlVectors() {
    const vectors = [];
    [false, true].forEach((solarOn) => {
      [false, true].forEach((batteryOn) => {
        TIES.forEach((tie) => {
          LOAD_VALUES.forEach((oxygen) => {
            LOAD_VALUES.forEach((lights) => {
              LOAD_VALUES.forEach((comms) => vectors.push(deepFreeze({ solarOn, batteryOn, tie, oxygen, lights, comms })));
            });
          });
        });
      });
    });
    return deepFreeze(vectors);
  }

  const CONTROL_VECTORS = enumerateControlVectors();

  function enumerateSolutions(level) {
    if (!validLevel(level)) return deepFreeze([]);
    return deepFreeze(CONTROL_VECTORS.filter((controls) => evaluateGrid(level, controls).isSafe).map(cloneFrozen));
  }

  function sanitizeConfig(rawConfig) {
    const source = rawConfig === undefined ? FILE_CONFIG : rawConfig;
    try {
      if (!safePlain(source) || !["powerOperatorName", "loadOperatorName", "completionTitle"].every((key) => validText(source[key], CONFIG_LIMITS[key]))) {
        return cloneFrozen(DEFAULT_CONFIG);
      }
      return deepFreeze({
        powerOperatorName: source.powerOperatorName.trim(),
        loadOperatorName: source.loadOperatorName.trim(),
        completionTitle: source.completionTitle.trim(),
      });
    } catch (_error) {
      return cloneFrozen(DEFAULT_CONFIG);
    }
  }

  function validText(value, limit) {
    return typeof value === "string" && value.trim().length > 0 && [...value.trim()].length <= limit;
  }

  function createInitialState(config) {
    sanitizeConfig(config);
    return makeState({
      phase: "intro",
      shiftIndex: 0,
      controls: DEFAULT_CONTROLS,
      stableTicks: 0,
      completedShifts: [],
      pauseReason: null,
      resumePhase: null,
      revision: 0,
    });
  }

  function makeState(fields) {
    const controls = cloneFrozen(fields.controls);
    return deepFreeze({
      phase: fields.phase,
      shiftIndex: fields.shiftIndex,
      controls,
      stableTicks: fields.stableTicks,
      lastEvaluation: evaluateGrid(LEVELS[fields.shiftIndex], controls),
      completedShifts: fields.completedShifts.map(cloneFrozen),
      pauseReason: fields.pauseReason,
      resumePhase: fields.resumePhase,
      revision: fields.revision,
    });
  }

  function safeState(state) {
    return isPowerState(state) ? state : null;
  }

  function start(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "intro") return current;
    return makeState({ ...current, phase: "handoff" });
  }

  function ready(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "handoff") return current;
    return makeState({ ...current, phase: "operating", revision: current.revision + 1 });
  }

  function toggleFeed(state, feed) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "operating" || (feed !== "solar" && feed !== "battery")) return current;
    const key = feed === "solar" ? "solarOn" : "batteryOn";
    return changedControls(current, { ...current.controls, [key]: !current.controls[key] });
  }

  function setTie(state, direction) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "operating" || !TIES.includes(direction) || current.controls.tie === direction) return current;
    return changedControls(current, { ...current.controls, tie: direction });
  }

  function setLoad(state, load, bus) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "operating" || !LOADS.includes(load) || !LOAD_VALUES.includes(bus) || current.controls[load] === bus) return current;
    return changedControls(current, { ...current.controls, [load]: bus });
  }

  function changedControls(state, controls) {
    return makeState({ ...state, controls, stableTicks: 0 });
  }

  function tick(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "operating") return current;
    if (!current.lastEvaluation.isSafe) {
      if (current.stableTicks === 0) return current;
      return makeState({ ...current, stableTicks: 0 });
    }
    const nextTicks = current.stableTicks + 1;
    if (nextTicks < STABLE_TICKS_REQUIRED) return makeState({ ...current, stableTicks: nextTicks });
    const summary = createShiftSummary(current);
    const completedShifts = [...current.completedShifts, summary];
    return makeState({
      ...current,
      phase: current.shiftIndex === LEVELS.length - 1 ? "complete" : "shift-result",
      stableTicks: STABLE_TICKS_REQUIRED,
      completedShifts,
      revision: current.revision + 1,
    });
  }

  function createShiftSummary(state) {
    return deepFreeze({
      levelId: LEVELS[state.shiftIndex].id,
      stableTicks: STABLE_TICKS_REQUIRED,
      controls: cloneFrozen(state.controls),
      transferAmount: state.lastEvaluation.transfer.amount,
    });
  }

  function nextShift(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "shift-result" || current.shiftIndex >= LEVELS.length - 1) return current;
    return makeState({
      ...current,
      phase: "handoff",
      shiftIndex: current.shiftIndex + 1,
      controls: DEFAULT_CONTROLS,
      stableTicks: 0,
    });
  }

  function pause(state, reason) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "operating" || !PAUSE_REASONS.includes(reason)) return current;
    return makeState({
      ...current,
      phase: "paused",
      pauseReason: reason,
      resumePhase: "operating",
      revision: current.revision + 1,
    });
  }

  function resume(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "paused") return current;
    return makeState({
      ...current,
      phase: "operating",
      pauseReason: null,
      resumePhase: null,
      revision: current.revision + 1,
    });
  }

  function restart(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    const initial = createInitialState();
    return makeState({ ...initial, revision: current.revision + 1 });
  }

  function reducePower(state, action) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (!safePlain(action) || typeof safeRead(action, "type") !== "string") return current;
    const type = safeRead(action, "type");
    const actionKeys = {
      START: ["type"],
      READY: ["type"],
      TOGGLE_FEED: ["type", "feed"],
      SET_TIE: ["type", "direction"],
      SET_LOAD: ["type", "load", "bus"],
      TICK: ["type"],
      NEXT_SHIFT: ["type"],
      PAUSE: ["type", "reason"],
      RESUME: ["type"],
      RESTART: ["type"],
    }[type];
    if (!actionKeys || !exactDataObject(action, actionKeys)) return current;
    if (type === "START") return start(current);
    if (type === "READY") return ready(current);
    if (type === "TOGGLE_FEED") return toggleFeed(current, safeRead(action, "feed"));
    if (type === "SET_TIE") return setTie(current, safeRead(action, "direction"));
    if (type === "SET_LOAD") return setLoad(current, safeRead(action, "load"), safeRead(action, "bus"));
    if (type === "TICK") return tick(current);
    if (type === "NEXT_SHIFT") return nextShift(current);
    if (type === "PAUSE") return pause(current, safeRead(action, "reason"));
    if (type === "RESUME") return resume(current);
    if (type === "RESTART") return restart(current);
    return current;
  }

  function safeRead(value, key) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function replayPower(actions, initialState) {
    let state = initialState === undefined ? createInitialState() : (safeState(initialState) ? cloneState(initialState) : createInitialState());
    if (!Array.isArray(actions)) return state;
    actions.forEach((action) => { state = reducePower(state, action); });
    return state;
  }

  function cloneState(state) {
    return makeState({
      ...state,
      controls: state.controls,
      completedShifts: state.completedShifts,
    });
  }

  function classifyPowerKey(state, event) {
    if (!isPowerState(state) || state.phase !== "operating" || !event || typeof event !== "object") return null;
    const repeat = Boolean(safeRead(event, "repeat"));
    const modified = ["ctrlKey", "altKey", "metaKey", "shiftKey"].some((key) => Boolean(safeRead(event, key)));
    if (repeat || modified) return null;
    const code = safeRead(event, "code");
    if (code === "KeyA") return deepFreeze({ type: "TOGGLE_FEED", feed: "solar" });
    if (code === "KeyS") return deepFreeze({ type: "TOGGLE_FEED", feed: "battery" });
    if (code === "KeyD") return deepFreeze({ type: "SET_TIE", direction: nextValue(TIES, state.controls.tie) });
    const load = code === "KeyJ" ? "oxygen" : code === "KeyK" ? "lights" : code === "KeyL" ? "comms" : null;
    if (!load) return null;
    const sequence = [OFF, ...LEVELS[state.shiftIndex].allowedBuses[load]];
    const currentIndex = sequence.indexOf(state.controls[load]);
    return deepFreeze({ type: "SET_LOAD", load, bus: currentIndex < 0 ? OFF : sequence[(currentIndex + 1) % sequence.length] });
  }

  function nextValue(values, current) {
    const index = values.indexOf(current);
    return index < 0 ? values[0] : values[(index + 1) % values.length];
  }

  function consumeFrame(accumulatorMs, elapsedMs) {
    if (!Number.isFinite(accumulatorMs) || accumulatorMs < 0 || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
      return deepFreeze({ pauseReason: "long-frame", ticks: 0, accumulatorMs: 0 });
    }
    const total = accumulatorMs + elapsedMs;
    if (total > MAX_FRAME_BUDGET_MS) return deepFreeze({ pauseReason: "long-frame", ticks: 0, accumulatorMs: 0 });
    const ticks = Math.min(MAX_CATCH_UP_TICKS, Math.floor((total + Number.EPSILON) / TICK_MS));
    return deepFreeze({ pauseReason: null, ticks, accumulatorMs: total - ticks * TICK_MS });
  }

  function isPowerState(value) {
    try {
      if (!exactDataObject(value, STATE_KEYS) || !PHASES.includes(value.phase)) return false;
      if (!Number.isSafeInteger(value.shiftIndex) || value.shiftIndex < 0 || value.shiftIndex >= LEVELS.length) return false;
      if (!validControls(value.controls) || !Number.isSafeInteger(value.stableTicks) || value.stableTicks < 0 || value.stableTicks > STABLE_TICKS_REQUIRED) return false;
      if (!Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.completedShifts)) return false;
      if (!sameData(value.lastEvaluation, evaluateGrid(LEVELS[value.shiftIndex], value.controls))) return false;
      if (!validSummaries(value.completedShifts)) return false;
      const active = ["intro", "handoff", "operating", "paused"].includes(value.phase);
      if (active && value.completedShifts.length !== value.shiftIndex) return false;
      if ((value.phase === "intro" || value.phase === "handoff") && (!sameData(value.controls, DEFAULT_CONTROLS) || value.stableTicks !== 0)) return false;
      if ((value.phase === "operating" || value.phase === "paused") && value.stableTicks > 89) return false;
      if (value.phase === "shift-result" && (value.shiftIndex > 1 || value.completedShifts.length !== value.shiftIndex + 1 || value.stableTicks !== 90 || !value.lastEvaluation.isSafe)) return false;
      if (value.phase === "complete" && (value.shiftIndex !== 2 || value.completedShifts.length !== 3 || value.stableTicks !== 90 || !value.lastEvaluation.isSafe)) return false;
      if (value.phase === "paused") return PAUSE_REASONS.includes(value.pauseReason) && value.resumePhase === "operating";
      return value.pauseReason === null && value.resumePhase === null;
    } catch (_error) {
      return false;
    }
  }

  function validSummaries(summaries) {
    if (summaries.length > LEVELS.length) return false;
    return summaries.every((summary, index) => {
      if (!exactDataObject(summary, ["levelId", "stableTicks", "controls", "transferAmount"])) return false;
      if (summary.levelId !== LEVELS[index].id || summary.stableTicks !== STABLE_TICKS_REQUIRED || !validControls(summary.controls)) return false;
      const evaluation = evaluateGrid(LEVELS[index], summary.controls);
      return evaluation.isSafe && summary.transferAmount === evaluation.transfer.amount;
    });
  }

  function completionSummary(state, config) {
    if (!isPowerState(state) || state.phase !== "complete") return null;
    const clean = sanitizeConfig(config);
    return deepFreeze({
      powerOperatorName: clean.powerOperatorName,
      loadOperatorName: clean.loadOperatorName,
      completedShiftIds: state.completedShifts.map((item) => item.levelId),
      totalStableTicks: state.completedShifts.reduce((total, item) => total + item.stableTicks, 0),
      transferAmounts: state.completedShifts.map((item) => item.transferAmount),
      defaultNote: DEFAULT_NOTE,
    });
  }

  function resolveCompletionNote(policy, summary) {
    if (!validCompletionSummary(summary)) return DEFAULT_NOTE;
    const fallback = DEFAULT_NOTE;
    if (typeof policy !== "function") return fallback;
    const isolated = cloneFrozen(summary);
    try {
      const result = policy(isolated);
      return validText(result, 160) ? result.trim() : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function validCompletionSummary(summary) {
    return exactDataObject(summary, ["powerOperatorName", "loadOperatorName", "completedShiftIds", "totalStableTicks", "transferAmounts", "defaultNote"])
      && validText(summary.powerOperatorName, CONFIG_LIMITS.powerOperatorName)
      && validText(summary.loadOperatorName, CONFIG_LIMITS.loadOperatorName)
      && Array.isArray(summary.completedShiftIds) && sameData(summary.completedShiftIds, LEVELS.map((level) => level.id))
      && summary.totalStableTicks === STABLE_TICKS_REQUIRED * LEVELS.length
      && Array.isArray(summary.transferAmounts) && sameData(summary.transferAmounts, [0, 0, 1])
      && summary.defaultNote === DEFAULT_NOTE;
  }

  function getPublicView(state, config) {
    const current = safeState(state);
    if (!current) return null;
    const clean = sanitizeConfig(config);
    const level = LEVELS[current.shiftIndex];
    const summary = completionSummary(current, config);
    const policy = safePlain(config) && typeof safeRead(config, "composeCompletionNote") === "function"
      ? safeRead(config, "composeCompletionNote")
      : FILE_CONFIG && typeof FILE_CONFIG.composeCompletionNote === "function" ? FILE_CONFIG.composeCompletionNote : null;
    return deepFreeze({
      phase: current.phase,
      shift: cloneFrozen(level),
      progress: {
        stableTicks: current.stableTicks,
        requiredTicks: STABLE_TICKS_REQUIRED,
        fraction: current.stableTicks / STABLE_TICKS_REQUIRED,
        isSafe: current.lastEvaluation.isSafe,
      },
      controls: cloneFrozen(current.controls),
      evaluation: cloneFrozen(current.lastEvaluation),
      operators: { power: clean.powerOperatorName, load: clean.loadOperatorName },
      interlockNote: level.tieRequirement === "off" ? "联络线维护中，必须断开。" : "联络线必须发生正整数转移。",
      availableBusOptions: {
        oxygen: [OFF, ...level.allowedBuses.oxygen],
        lights: [OFF, ...level.allowedBuses.lights],
        comms: [OFF, ...level.allowedBuses.comms],
      },
      actions: {
        canStart: current.phase === "intro",
        canReady: current.phase === "handoff",
        canOperate: current.phase === "operating",
        canPause: current.phase === "operating",
        canResume: current.phase === "paused",
        canNextShift: current.phase === "shift-result",
        canRestart: true,
      },
      primaryTitle: current.phase === "complete" ? clean.completionTitle : "月面，保持有光",
      primaryDescription: descriptionFor(current),
      liveMessage: liveMessageFor(current),
      completedShifts: current.completedShifts.map(cloneFrozen),
      completion: summary ? {
        title: clean.completionTitle,
        note: resolveCompletionNote(policy, summary),
        summary,
      } : null,
    });
  }

  function descriptionFor(state) {
    if (state.phase === "intro") return "一个管电从哪里来，一个管光往哪里去。";
    if (state.phase === "handoff") return `第 ${state.shiftIndex + 1} 班，双方准备交接。`;
    if (state.phase === "paused") return "值班已暂停，安全进度保持不变。";
    if (state.phase === "shift-result") return "这一班已经稳稳交出去了。";
    if (state.phase === "complete") return "氧气、照明和通信，在三次交接里始终亮着。";
    return "安全不是一瞬间——一起稳住它。";
  }

  function liveMessageFor(state) {
    if (state.phase === "paused") return `值班暂停：${state.pauseReason}`;
    if (state.phase === "shift-result") return `第 ${state.shiftIndex + 1} 班完成`;
    if (state.phase === "complete") return "三次交接全部完成";
    if (state.phase !== "operating") return descriptionFor(state);
    if (state.lastEvaluation.isSafe) return `供电稳定 ${state.stableTicks} / ${STABLE_TICKS_REQUIRED}`;
    return state.lastEvaluation.faults[0] || "等待共同调整";
  }

  return deepFreeze({
    BUS_L, BUS_R, OFF, TIE_LR, TIE_RL, TICK_RATE, TICK_MS, STABLE_TICKS_REQUIRED,
    TRANSFER_CAPACITY, MAX_CATCH_UP_TICKS, MAX_FRAME_BUDGET_MS, LOADS, TIES, BUSES,
    LOAD_VALUES, PHASES, PAUSE_REASONS, FAULT_ORDER, DEFAULT_CONTROLS, DEFAULT_CONFIG,
    DEFAULT_NOTE, INVALID_EVALUATION, LEVELS,
    deepFreeze, validLevel, validControls, sanitizeConfig, evaluateGrid,
    enumerateControlVectors, enumerateSolutions, createInitialState, start, ready,
    toggleFeed, setTie, setLoad, tick, nextShift, pause, resume, restart,
    reducePower, replayPower, classifyPowerKey, consumeFrame, isPowerState,
    completionSummary, resolveCompletionNote, getPublicView,
  });
});
