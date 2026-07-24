(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.WISH_FIREWORKS_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const objectFreeze = Object.freeze;
  const numberIsSafeInteger = Number.isSafeInteger;
  const mathFloor = Math.floor;
  const stringTrim = String.prototype.trim;
  const stringCharCodeAt = String.prototype.charCodeAt;
  const stringPadStart = String.prototype.padStart;
  const stringConstructor = String;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;

  const VERSION = 1;
  const GLYPH_COUNT = 3;
  const GLYPH_ROWS = 9;
  const GLYPH_COLUMNS = 9;
  const MIN_ACTIVE_CELLS = 16;
  const MAX_ACTIVE_CELLS = 48;

  const WORLD_SCALE = 1000;
  const ROCKET_START_X = 500;
  const ROCKET_START_Y = 900;
  const TARGET_X_ORIGIN = -240;
  const TARGET_Y_ORIGIN = -240;
  const TARGET_STEP = 60;

  const CHARGE_QUANTUM_MS = 50;
  const MAX_HOLD_MS = 950;
  const MIN_CHARGE_UNITS = 1;
  const MAX_CHARGE_UNITS = 20;
  const DEFAULT_CHARGE_BAND = 2;

  const ASCENT_TICKS = 48;
  const FORMATION_TICKS = 24;
  const HOLD_TICKS = 36;
  const FADE_TICKS = 12;
  const TOTAL_PRESENTATION_TICKS = 120;
  const ANIMATION_DURATION_MS = 1000;
  const ANIMATION_TIMEOUT_MS = 1500;
  const ALPHA_SCALE = 1000;

  const MAX_REVISION = 9007199254740991;

  const CHARGE_UNITS_BY_BAND = deepFreeze([4, 8, 12, 16, 20]);
  const APEX_Y_BY_BAND = deepFreeze([430, 390, 350, 310, 270]);
  const CONFIG_KEYS = deepFreeze([
    "recipient", "sender", "glyphs", "patternLabel", "finalTitle", "finalNote",
  ]);
  const GLYPH_KEYS = deepFreeze(["id", "label", "rows"]);
  const STATE_KEYS = deepFreeze([
    "version", "phase", "content", "completedCount", "currentShot", "revision",
  ]);
  const CURRENT_SHOT_KEYS = deepFreeze(["index", "chargeUnits", "burstToken"]);
  const PHASES = deepFreeze(["intro", "ready", "bursting", "complete"]);
  const GLYPH_IDS = deepFreeze(["g0", "g1", "g2"]);
  const CANONICAL_DEFAULT_CONFIG = {
    recipient: "你",
    sender: "我",
    glyphs: [
      {
        id: "g0",
        label: "我",
        rows: [
          "..###....",
          "...#.....",
          "########.",
          "...#..#..",
          ".#####...",
          "...#.#...",
          "..##..#..",
          ".#.#...#.",
          "#..#....#",
        ],
      },
      {
        id: "g1",
        label: "爱",
        rows: [
          "..#####..",
          "...#.#...",
          ".#######.",
          ".#.....#.",
          "..#####..",
          "....#....",
          "...###...",
          "..#...#..",
          ".#.....#.",
        ],
      },
      {
        id: "g2",
        label: "你",
        rows: [
          ".#..#....",
          ".#...#...",
          "##.#####.",
          ".#.#...#.",
          ".#...#...",
          ".#..###..",
          ".#.#.#.#.",
          ".#.#.#.#.",
          "#..#...#.",
        ],
      },
    ],
    patternLabel: "烟火写出的三个字",
    finalTitle: "这三束光，都想送给你",
    finalNote: "愿望写完了，但我还想和你一起看很多很多次夜空。",
  };

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function floor(value) {
    return call(mathFloor, null, [value]);
  }

  function deepFreeze(value) {
    if (value === null || typeof value !== "object") return value;
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value);
    }
    return objectFreeze(value);
  }

  function hasExactOwnKeys(actualKeys, expectedKeys) {
    if (actualKeys.length !== expectedKeys.length) return false;
    for (let actualIndex = 0; actualIndex < actualKeys.length; actualIndex += 1) {
      if (typeof actualKeys[actualIndex] !== "string") return false;
    }
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      let found = false;
      for (let actualIndex = 0; actualIndex < actualKeys.length; actualIndex += 1) {
        if (actualKeys[actualIndex] === expectedKeys[expectedIndex]) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function snapshotObject(value, expectedKeys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || !hasExactOwnKeys(ownKeys, expectedKeys)) return null;

    const snapshot = {};
    for (let index = 0; index < expectedKeys.length; index += 1) {
      const key = expectedKeys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  }

  function snapshotArray(value, exactLength) {
    if (value === null || typeof value !== "object") return null;
    let isNativeArray;
    let prototype;
    let ownKeys;
    try {
      isNativeArray = arrayIsArray(value);
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (!isNativeArray || prototype !== arrayPrototype || ownKeys.length !== exactLength + 1) {
      return null;
    }

    let lengthDescriptor;
    try {
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
      || lengthDescriptor.value !== exactLength
      || lengthDescriptor.enumerable !== false
      || lengthDescriptor.configurable !== false
      || typeof lengthDescriptor.writable !== "boolean") return null;

    for (let keyIndex = 0; keyIndex < ownKeys.length; keyIndex += 1) {
      const key = ownKeys[keyIndex];
      if (typeof key !== "string") return null;
      if (key === "length") continue;
      let matched = false;
      for (let index = 0; index < exactLength; index += 1) {
        if (key === stringConstructor(index)) {
          matched = true;
          break;
        }
      }
      if (!matched) return null;
    }

    const snapshot = [];
    for (let index = 0; index < exactLength; index += 1) {
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, stringConstructor(index));
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      snapshot[index] = descriptor.value;
    }
    return snapshot;
  }

  function hasLoneSurrogate(raw) {
    for (let index = 0; index < raw.length; index += 1) {
      const unit = call(stringCharCodeAt, raw, [index]);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= raw.length) return true;
        const next = call(stringCharCodeAt, raw, [index + 1]);
        if (next < 0xdc00 || next > 0xdfff) return true;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  function hasForbiddenControl(raw, allowLf) {
    for (let index = 0; index < raw.length; index += 1) {
      const unit = call(stringCharCodeAt, raw, [index]);
      if ((unit <= 0x1f && !(allowLf && unit === 0x0a))
        || (unit >= 0x7f && unit <= 0x9f)
        || unit === 0x2028 || unit === 0x2029) return true;
    }
    return false;
  }

  function countCodePoints(raw) {
    let count = 0;
    for (let index = 0; index < raw.length; index += 1) {
      const unit = call(stringCharCodeAt, raw, [index]);
      if (unit >= 0xd800 && unit <= 0xdbff) index += 1;
      count += 1;
    }
    return count;
  }

  function sanitizeText(raw, minimum, maximum, allowLf, maximumLines) {
    if (typeof raw !== "string" || hasLoneSurrogate(raw)
      || hasForbiddenControl(raw, allowLf)) return null;
    let cleaned;
    try {
      cleaned = call(stringTrim, raw, []);
    } catch (_error) {
      return null;
    }
    const length = countCodePoints(cleaned);
    if (length < minimum || length > maximum) return null;
    if (allowLf) {
      let lines = 1;
      for (let index = 0; index < cleaned.length; index += 1) {
        if (call(stringCharCodeAt, cleaned, [index]) === 0x0a) lines += 1;
      }
      if (lines > maximumLines) return null;
    }
    return cleaned;
  }

  function snapshotRows(candidate) {
    const rows = snapshotArray(candidate, GLYPH_ROWS);
    if (rows === null) return null;
    const copy = [];
    let activeCount = 0;
    for (let rowIndex = 0; rowIndex < GLYPH_ROWS; rowIndex += 1) {
      const row = rows[rowIndex];
      if (typeof row !== "string" || row.length !== GLYPH_COLUMNS) return null;
      for (let columnIndex = 0; columnIndex < GLYPH_COLUMNS; columnIndex += 1) {
        const unit = call(stringCharCodeAt, row, [columnIndex]);
        if (unit === 0x23) activeCount += 1;
        else if (unit !== 0x2e) return null;
      }
      copy[rowIndex] = row;
    }
    if (activeCount < MIN_ACTIVE_CELLS || activeCount > MAX_ACTIVE_CELLS) return null;
    return { rows: copy, activeCount };
  }

  function validateContent(candidate) {
    const outer = snapshotObject(candidate, CONFIG_KEYS);
    if (outer === null) return null;
    const recipient = sanitizeText(outer.recipient, 1, 12, false, 1);
    const sender = sanitizeText(outer.sender, 1, 12, false, 1);
    const glyphInputs = snapshotArray(outer.glyphs, GLYPH_COUNT);
    const patternLabel = sanitizeText(outer.patternLabel, 2, 32, false, 1);
    const finalTitle = sanitizeText(outer.finalTitle, 2, 32, false, 1);
    const finalNote = sanitizeText(outer.finalNote, 1, 180, true, 4);
    if (recipient === null || sender === null || recipient === sender
      || glyphInputs === null || patternLabel === null
      || finalTitle === null || finalNote === null) return null;

    const glyphs = [];
    for (let index = 0; index < GLYPH_COUNT; index += 1) {
      const input = snapshotObject(glyphInputs[index], GLYPH_KEYS);
      if (input === null || typeof input.id !== "string" || input.id !== GLYPH_IDS[index]) {
        return null;
      }
      const label = sanitizeText(input.label, 1, 1, false, 1);
      const pattern = snapshotRows(input.rows);
      if (label === null || pattern === null) return null;
      for (let previous = 0; previous < index; previous += 1) {
        if (glyphs[previous].label === label) return null;
      }
      glyphs[index] = {
        id: input.id,
        label,
        rows: pattern.rows,
      };
    }

    return deepFreeze({
      recipient,
      sender,
      glyphs,
      patternLabel,
      finalTitle,
      finalNote,
    });
  }

  const DEFAULT_CONFIG = validateContent(CANONICAL_DEFAULT_CONFIG);

  function sanitizeConfig(candidate) {
    const content = validateContent(candidate);
    if (content !== null) return content;
    return DEFAULT_CONFIG === null ? null : validateContent(DEFAULT_CONFIG);
  }

  function createStartAction(rawConfig) {
    const sanitized = sanitizeConfig(rawConfig);
    if (sanitized === null) return null;
    const content = validateContent(sanitized);
    return content === null ? null : deepFreeze({ type: "START", content });
  }

  function isSafeIntegerInRange(value, minimum, maximum) {
    return typeof value === "number" && numberIsSafeInteger(value)
      && value >= minimum && value <= maximum;
  }

  function chargeBandFromUnits(units) {
    if (!isSafeIntegerInRange(units, MIN_CHARGE_UNITS, MAX_CHARGE_UNITS)) return null;
    return floor((units - MIN_CHARGE_UNITS) / 4);
  }

  function directUnitsForBand(band) {
    if (!isSafeIntegerInRange(band, 0, CHARGE_UNITS_BY_BAND.length - 1)) return null;
    return CHARGE_UNITS_BY_BAND[band];
  }

  function quantizeHold(startMs, endMs) {
    if (!isSafeIntegerInRange(startMs, 0, MAX_REVISION)
      || !isSafeIntegerInRange(endMs, 0, MAX_REVISION)
      || endMs < startMs) return null;
    const difference = endMs - startMs;
    const elapsedMs = difference > MAX_HOLD_MS ? MAX_HOLD_MS : difference;
    const chargeUnits = MIN_CHARGE_UNITS + floor(elapsedMs / CHARGE_QUANTUM_MS);
    const chargeBand = chargeBandFromUnits(chargeUnits);
    return deepFreeze({
      elapsedMs,
      chargeUnits,
      chargeBand,
      apexY: APEX_Y_BY_BAND[chargeBand],
    });
  }

  function buildTargets(rowsCandidate, chargeBand) {
    const pattern = snapshotRows(rowsCandidate);
    if (pattern === null || !isSafeIntegerInRange(chargeBand, 0, APEX_Y_BY_BAND.length - 1)) {
      return null;
    }

    const targets = [];
    let ordinal = 0;
    for (let row = 0; row < GLYPH_ROWS; row += 1) {
      for (let column = 0; column < GLYPH_COLUMNS; column += 1) {
        if (call(stringCharCodeAt, pattern.rows[row], [column]) !== 0x23) continue;
        const ordinalText = stringConstructor(ordinal);
        targets[ordinal] = {
          id: `p${call(stringPadStart, ordinalText, [2, "0"])}`,
          x: ROCKET_START_X + TARGET_X_ORIGIN + TARGET_STEP * column,
          y: APEX_Y_BY_BAND[chargeBand] + TARGET_Y_ORIGIN + TARGET_STEP * row,
        };
        ordinal += 1;
      }
    }
    return deepFreeze(targets);
  }

  function roundDivSigned(numerator, denominator) {
    if (!numberIsSafeInteger(numerator)
      || !numberIsSafeInteger(denominator) || denominator <= 0) return null;
    const half = floor(denominator / 2);
    return numerator >= 0
      ? floor((numerator + half) / denominator)
      : -floor((-numerator + half) / denominator);
  }

  function lerpInt(start, end, step, totalSteps) {
    const delta = end - start;
    const product = delta * step;
    if (!numberIsSafeInteger(start) || !numberIsSafeInteger(end)
      || !numberIsSafeInteger(step) || !numberIsSafeInteger(totalSteps)
      || totalSteps <= 0 || !numberIsSafeInteger(delta)
      || !numberIsSafeInteger(product)) return null;
    const portion = roundDivSigned(product, totalSteps);
    return portion === null ? null : start + portion;
  }

  function presentationTick(startMs, nowMs) {
    if (!isSafeIntegerInRange(startMs, 0, MAX_REVISION)
      || !isSafeIntegerInRange(nowMs, 0, MAX_REVISION)
      || nowMs < startMs) return null;
    const difference = nowMs - startMs;
    const elapsedMs = difference > ANIMATION_DURATION_MS ? ANIMATION_DURATION_MS : difference;
    const tick = floor((elapsedMs * TOTAL_PRESENTATION_TICKS) / ANIMATION_DURATION_MS);
    return tick > TOTAL_PRESENTATION_TICKS ? TOTAL_PRESENTATION_TICKS : tick;
  }

  function makeFramePoint(target, x, y, alpha) {
    return {
      id: target.id,
      x,
      y,
      alpha,
    };
  }

  function getPresentationFrame(rowsCandidate, chargeUnits, tick) {
    const chargeBand = chargeBandFromUnits(chargeUnits);
    if (chargeBand === null
      || !isSafeIntegerInRange(tick, 0, TOTAL_PRESENTATION_TICKS)) return null;
    const targets = buildTargets(rowsCandidate, chargeBand);
    if (targets === null) return null;
    const apexY = APEX_Y_BY_BAND[chargeBand];

    if (tick < ASCENT_TICKS) {
      return deepFreeze({
        phase: "ascent",
        rocket: {
          x: ROCKET_START_X,
          y: lerpInt(ROCKET_START_Y, apexY, tick, ASCENT_TICKS),
        },
        points: [],
      });
    }

    const points = [];
    if (tick <= ASCENT_TICKS + FORMATION_TICKS) {
      const formationStep = tick - ASCENT_TICKS;
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        points[index] = makeFramePoint(
          target,
          lerpInt(ROCKET_START_X, target.x, formationStep, FORMATION_TICKS),
          lerpInt(apexY, target.y, formationStep, FORMATION_TICKS),
          ALPHA_SCALE,
        );
      }
      return deepFreeze({
        phase: "formation",
        rocket: null,
        points,
      });
    }

    if (tick <= ASCENT_TICKS + FORMATION_TICKS + HOLD_TICKS) {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        points[index] = makeFramePoint(target, target.x, target.y, ALPHA_SCALE);
      }
      return deepFreeze({
        phase: "hold",
        rocket: null,
        points,
      });
    }

    const fadeStep = tick - ASCENT_TICKS - FORMATION_TICKS - HOLD_TICKS;
    const faded = roundDivSigned(ALPHA_SCALE * fadeStep, FADE_TICKS);
    const alpha = ALPHA_SCALE - faded;
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      points[index] = makeFramePoint(target, target.x, target.y, alpha);
    }
    return deepFreeze({
      phase: "fade",
      rocket: null,
      points,
    });
  }

  function maximumRevisionFor(phase, completedCount) {
    if (phase === "ready") return MAX_REVISION - (6 - 2 * completedCount);
    if (phase === "bursting") return MAX_REVISION - (5 - 2 * completedCount);
    return MAX_REVISION;
  }

  function snapshotCurrentShot(candidate) {
    const shot = snapshotObject(candidate, CURRENT_SHOT_KEYS);
    if (shot === null
      || !isSafeIntegerInRange(shot.index, 0, GLYPH_COUNT - 1)
      || !isSafeIntegerInRange(shot.chargeUnits, MIN_CHARGE_UNITS, MAX_CHARGE_UNITS)
      || !isSafeIntegerInRange(shot.burstToken, 0, MAX_REVISION)) return null;
    return {
      index: shot.index,
      chargeUnits: shot.chargeUnits,
      burstToken: shot.burstToken,
    };
  }

  function snapshotState(candidate) {
    const raw = snapshotObject(candidate, STATE_KEYS);
    if (raw === null
      || typeof raw.version !== "number" || raw.version !== VERSION
      || typeof raw.phase !== "string" || !contains(PHASES, raw.phase)
      || !isSafeIntegerInRange(raw.completedCount, 0, GLYPH_COUNT)
      || !isSafeIntegerInRange(raw.revision, 0, MAX_REVISION)) return null;

    let content = null;
    let currentShot = null;
    if (raw.phase === "intro") {
      if (raw.content !== null || raw.completedCount !== 0 || raw.currentShot !== null) return null;
    } else {
      content = validateContent(raw.content);
      if (content === null) return null;
    }

    if (raw.phase === "ready") {
      if (raw.completedCount >= GLYPH_COUNT || raw.currentShot !== null
        || raw.revision > maximumRevisionFor(raw.phase, raw.completedCount)) return null;
    } else if (raw.phase === "bursting") {
      if (raw.completedCount >= GLYPH_COUNT) return null;
      currentShot = snapshotCurrentShot(raw.currentShot);
      if (currentShot === null
        || currentShot.index !== raw.completedCount
        || currentShot.burstToken !== raw.revision
        || raw.revision > maximumRevisionFor(raw.phase, raw.completedCount)) return null;
    } else if (raw.phase === "complete") {
      if (raw.completedCount !== GLYPH_COUNT || raw.currentShot !== null) return null;
    }

    return {
      version: VERSION,
      phase: raw.phase,
      content,
      completedCount: raw.completedCount,
      currentShot,
      revision: raw.revision,
    };
  }

  function createInitialState() {
    return deepFreeze({
      version: VERSION,
      phase: "intro",
      content: null,
      completedCount: 0,
      currentShot: null,
      revision: 0,
    });
  }

  function snapshotAction(candidate) {
    if (candidate === null || typeof candidate !== "object") return null;
    let prototype;
    let ownKeys;
    let typeDescriptor;
    try {
      prototype = reflectGetPrototypeOf(candidate);
      ownKeys = reflectOwnKeys(candidate);
      typeDescriptor = reflectGetOwnPropertyDescriptor(candidate, "type");
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || typeDescriptor === undefined
      || !("value" in typeDescriptor) || typeof typeDescriptor.value !== "string") return null;

    const type = typeDescriptor.value;
    let keys;
    if (type === "START") keys = ["type", "content"];
    else if (type === "LAUNCH") {
      keys = ["type", "index", "expectedRevision", "chargeUnits"];
    } else if (type === "COMPLETE_BURST") keys = ["type", "burstToken"];
    else if (type === "RESTART") keys = ["type"];
    else return null;
    if (!hasExactOwnKeys(ownKeys, keys)) return null;

    const action = { type };
    for (let index = 1; index < keys.length; index += 1) {
      const key = keys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(candidate, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      action[key] = descriptor.value;
    }

    if (type === "START") {
      const content = validateContent(action.content);
      return content === null ? null : { type, content };
    }
    if (type === "LAUNCH") {
      if (!isSafeIntegerInRange(action.index, 0, GLYPH_COUNT - 1)
        || !isSafeIntegerInRange(action.expectedRevision, 0, MAX_REVISION)
        || !isSafeIntegerInRange(action.chargeUnits, MIN_CHARGE_UNITS, MAX_CHARGE_UNITS)) {
        return null;
      }
    } else if (type === "COMPLETE_BURST"
      && !isSafeIntegerInRange(action.burstToken, 0, MAX_REVISION)) {
      return null;
    }
    return action;
  }

  function contains(values, candidate) {
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === candidate) return true;
    }
    return false;
  }

  function makeState(phase, content, completedCount, currentShot, revision) {
    const contentCopy = content === null ? null : validateContent(content);
    const shotCopy = currentShot === null ? null : {
      index: currentShot.index,
      chargeUnits: currentShot.chargeUnits,
      burstToken: currentShot.burstToken,
    };
    return deepFreeze({
      version: VERSION,
      phase,
      content: contentCopy,
      completedCount,
      currentShot: shotCopy,
      revision,
    });
  }

  function reduce(stateCandidate, actionCandidate) {
    const state = snapshotState(stateCandidate);
    if (state === null) return createInitialState();
    const action = snapshotAction(actionCandidate);
    if (action === null) return stateCandidate;

    if (action.type === "START") {
      if (state.phase !== "intro" || state.revision > MAX_REVISION - 7) return stateCandidate;
      return makeState("ready", action.content, 0, null, state.revision + 1);
    }

    if (action.type === "LAUNCH") {
      if (state.phase !== "ready"
        || action.index !== state.completedCount
        || action.expectedRevision !== state.revision) return stateCandidate;
      const burstToken = state.revision + 1;
      return makeState("bursting", state.content, state.completedCount, {
        index: action.index,
        chargeUnits: action.chargeUnits,
        burstToken,
      }, burstToken);
    }

    if (action.type === "COMPLETE_BURST") {
      if (state.phase !== "bursting"
        || action.burstToken !== state.currentShot.burstToken) return stateCandidate;
      const completedCount = state.completedCount + 1;
      return makeState(
        completedCount === GLYPH_COUNT ? "complete" : "ready",
        state.content,
        completedCount,
        null,
        state.revision + 1,
      );
    }

    if (action.type === "RESTART") {
      if (state.phase !== "complete" || state.revision > MAX_REVISION - 8) {
        return stateCandidate;
      }
      return makeState("intro", null, 0, null, state.revision + 1);
    }

    return stateCandidate;
  }

  function progressTextFor(state) {
    if (state.phase === "intro") return "还没点亮第一束。";
    if (state.phase === "ready") {
      if (state.completedCount === 0) return "准备点燃第 1 / 3 束。";
      if (state.completedCount === 1) return "第 1 束已经留下；准备第 2 / 3 束。";
      return "前两束已经留下；准备第 3 / 3 束。";
    }
    if (state.phase === "bursting") {
      return `第 ${state.completedCount + 1} / 3 束正在升空。`;
    }
    return "三束光都留在夜空里。";
  }

  function buildRevealedGlyphs(state) {
    const revealed = [];
    if (state.content === null) return revealed;
    for (let index = 0; index < state.completedCount; index += 1) {
      const glyph = state.content.glyphs[index];
      revealed[index] = {
        id: glyph.id,
        label: glyph.label,
        targets: buildTargets(glyph.rows, DEFAULT_CHARGE_BAND),
      };
    }
    return revealed;
  }

  function makePublicView(state) {
    const bursting = state.phase === "bursting";
    const complete = state.phase === "complete";
    let currentTargets = [];
    let currentChargeBand = null;
    let burstToken = null;
    if (bursting) {
      currentChargeBand = chargeBandFromUnits(state.currentShot.chargeUnits);
      currentTargets = buildTargets(
        state.content.glyphs[state.currentShot.index].rows,
        currentChargeBand,
      );
      burstToken = state.currentShot.burstToken;
    }

    return deepFreeze({
      phase: state.phase,
      completedCount: state.completedCount,
      totalCount: GLYPH_COUNT,
      progressText: progressTextFor(state),
      revealedGlyphs: buildRevealedGlyphs(state),
      currentTargets,
      currentChargeBand,
      burstToken,
      canStart: state.phase === "intro" && state.revision <= MAX_REVISION - 7,
      canLaunch: state.phase === "ready",
      canRestart: complete && state.revision <= MAX_REVISION - 8,
      isBursting: bursting,
      recipient: complete ? state.content.recipient : null,
      sender: complete ? state.content.sender : null,
      patternLabel: complete ? state.content.patternLabel : null,
      finalTitle: complete ? state.content.finalTitle : null,
      finalNote: complete ? state.content.finalNote : null,
      revision: state.revision,
    });
  }

  function getPublicView(stateCandidate) {
    const state = snapshotState(stateCandidate);
    return makePublicView(state === null ? createInitialState() : state);
  }

  return deepFreeze({
    VERSION,
    GLYPH_COUNT,
    GLYPH_ROWS,
    GLYPH_COLUMNS,
    MIN_ACTIVE_CELLS,
    MAX_ACTIVE_CELLS,
    WORLD_SCALE,
    ROCKET_START_X,
    ROCKET_START_Y,
    TARGET_X_ORIGIN,
    TARGET_Y_ORIGIN,
    TARGET_STEP,
    CHARGE_QUANTUM_MS,
    MAX_HOLD_MS,
    MIN_CHARGE_UNITS,
    MAX_CHARGE_UNITS,
    CHARGE_UNITS_BY_BAND,
    DEFAULT_CHARGE_BAND,
    APEX_Y_BY_BAND,
    ASCENT_TICKS,
    FORMATION_TICKS,
    HOLD_TICKS,
    FADE_TICKS,
    TOTAL_PRESENTATION_TICKS,
    ANIMATION_DURATION_MS,
    ANIMATION_TIMEOUT_MS,
    ALPHA_SCALE,
    MAX_REVISION,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createStartAction,
    quantizeHold,
    chargeBandFromUnits,
    directUnitsForBand,
    buildTargets,
    presentationTick,
    getPresentationFrame,
    createInitialState,
    reduce,
    getPublicView,
  });
});
