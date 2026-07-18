(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PAPER_PLANE_MAIL_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PHASES = Object.freeze(["intro", "aiming", "flying", "missed", "arrived", "revealed"]);
  const MISS_REASONS = Object.freeze(["short", "low", "high"]);
  const OUTCOME_REASONS = Object.freeze(["arrived", ...MISS_REASONS]);
  const FIXED_STEP = 1 / 120;
  const GRAVITY = 85;
  const SPEED_MIN = 245;
  const SPEED_MAX = 400;
  const PREVIEW_SECONDS = 0.85;
  const DEFAULT_AIM = Object.freeze({ angle: 20, power: 70 });
  const AIM_LIMITS = deepFreeze({
    angle: { min: 12, max: 38 },
    power: { min: 0, max: 100 },
  });
  const WORLD = deepFreeze({
    width: 1000,
    height: 620,
    start: { x: 90, y: 430 },
    ceilingY: 20,
    groundY: 530,
    mailbox: { left: 835, right: 925, top: 330, bottom: 420 },
  });
  const DEFAULT_CONFIG = deepFreeze({
    recipientName: "亲爱的你",
    senderName: "一直想把话寄给你的人",
    letterTitle: "这封信，终于飞到了",
    letterLines: [
      "有些话，放在心里太久，就想认真寄到你手上。",
      "谢谢你让平常的日子，也有了值得期待的方向。",
    ],
    signOff: "下一段路，也想继续和你一起走。",
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function isRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function cleanText(value, maximum) {
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    return cleaned && cleaned.length <= maximum ? cleaned : null;
  }

  function sanitizeConfig(raw) {
    if (!isRecord(raw)) return DEFAULT_CONFIG;
    const recipientName = cleanText(raw.recipientName, 24);
    const senderName = cleanText(raw.senderName, 32);
    const letterTitle = cleanText(raw.letterTitle, 60);
    const signOff = cleanText(raw.signOff, 100);
    if (!Array.isArray(raw.letterLines) || raw.letterLines.length < 1 || raw.letterLines.length > 4) {
      return DEFAULT_CONFIG;
    }
    const letterLines = raw.letterLines.map((line) => cleanText(line, 180));
    if (!recipientName || !senderName || !letterTitle || !signOff || letterLines.some((line) => !line)) {
      return DEFAULT_CONFIG;
    }
    return deepFreeze({ recipientName, senderName, letterTitle, letterLines: [...letterLines], signOff });
  }

  function initialPlane() {
    return deepFreeze({ x: WORLD.start.x, y: WORLD.start.y, vx: 0, vy: 0, rotation: -DEFAULT_AIM.angle });
  }

  function createInitialState(rawConfig) {
    sanitizeConfig(rawConfig);
    return deepFreeze({
      phase: "intro",
      angle: DEFAULT_AIM.angle,
      power: DEFAULT_AIM.power,
      attemptNumber: 1,
      plane: initialPlane(),
      elapsed: 0,
      missReason: null,
      lastOutcome: null,
      revision: 0,
    });
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isPlane(value) {
    return isRecord(value)
      && [value.x, value.y, value.vx, value.vy, value.rotation].every(isFiniteNumber);
  }

  function isOutcome(value) {
    return value === null || (isRecord(value)
      && Number.isInteger(value.attemptNumber)
      && value.attemptNumber >= 1
      && Number.isInteger(value.angle)
      && value.angle >= AIM_LIMITS.angle.min
      && value.angle <= AIM_LIMITS.angle.max
      && Number.isInteger(value.power)
      && value.power >= AIM_LIMITS.power.min
      && value.power <= AIM_LIMITS.power.max
      && OUTCOME_REASONS.includes(value.reason));
  }

  function isFlightState(value) {
    if (!isRecord(value) || !PHASES.includes(value.phase)) return false;
    if (!Number.isInteger(value.angle)
      || value.angle < AIM_LIMITS.angle.min
      || value.angle > AIM_LIMITS.angle.max) return false;
    if (!Number.isInteger(value.power)
      || value.power < AIM_LIMITS.power.min
      || value.power > AIM_LIMITS.power.max) return false;
    if (!Number.isInteger(value.attemptNumber) || value.attemptNumber < 1) return false;
    if (!isPlane(value.plane) || !isFiniteNumber(value.elapsed) || value.elapsed < 0) return false;
    if (!(value.missReason === null || MISS_REASONS.includes(value.missReason))) return false;
    if (!isOutcome(value.lastOutcome)) return false;
    if (!Number.isInteger(value.revision) || value.revision < 0) return false;
    if (value.phase === "missed") {
      return Boolean(value.missReason)
        && value.lastOutcome?.reason === value.missReason
        && value.lastOutcome.attemptNumber === value.attemptNumber;
    }
    if (value.missReason !== null) return false;
    if (["arrived", "revealed"].includes(value.phase)) {
      return value.lastOutcome?.reason === "arrived"
        && value.lastOutcome.attemptNumber === value.attemptNumber;
    }
    return true;
  }

  function safeState(state) {
    return isFlightState(state) ? state : null;
  }

  function clampInteger(value, limits, fallback) {
    if (!isFiniteNumber(value)) return fallback;
    return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
  }

  function speedForPower(power) {
    const safePower = clampInteger(power, AIM_LIMITS.power, DEFAULT_AIM.power);
    return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * (safePower / 100);
  }

  function velocityForAim(angle, power) {
    const safeAngle = clampInteger(angle, AIM_LIMITS.angle, DEFAULT_AIM.angle);
    const radians = safeAngle * Math.PI / 180;
    const speed = speedForPower(power);
    return deepFreeze({
      vx: speed * Math.cos(radians),
      vy: -speed * Math.sin(radians),
    });
  }

  function pointAtTime(angle, power, seconds) {
    const time = Math.max(0, isFiniteNumber(seconds) ? seconds : 0);
    const velocity = velocityForAim(angle, power);
    const vy = velocity.vy + GRAVITY * time;
    return deepFreeze({
      x: WORLD.start.x + velocity.vx * time,
      y: WORLD.start.y + velocity.vy * time + 0.5 * GRAVITY * time * time,
      vx: velocity.vx,
      vy,
      rotation: Math.atan2(vy, velocity.vx) * 180 / Math.PI,
    });
  }

  function start(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "intro") return current;
    return deepFreeze({ ...current, phase: "aiming", revision: current.revision + 1 });
  }

  function setAim(state, candidate) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "aiming" || !isRecord(candidate)) return current;
    const angle = clampInteger(candidate.angle, AIM_LIMITS.angle, current.angle);
    const power = clampInteger(candidate.power, AIM_LIMITS.power, current.power);
    if (angle === current.angle && power === current.power) return current;
    return deepFreeze({
      ...current,
      angle,
      power,
      plane: deepFreeze({ ...initialPlane(), rotation: -angle }),
      revision: current.revision + 1,
    });
  }

  function launch(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "aiming") return current;
    const velocity = velocityForAim(current.angle, current.power);
    return deepFreeze({
      ...current,
      phase: "flying",
      plane: deepFreeze({
        x: WORLD.start.x,
        y: WORLD.start.y,
        vx: velocity.vx,
        vy: velocity.vy,
        rotation: -current.angle,
      }),
      elapsed: 0,
      missReason: null,
      revision: current.revision + 1,
    });
  }

  function segmentRectEntry(from, to, rect) {
    if (!isRecord(from) || !isRecord(to) || !isRecord(rect)) return null;
    let minimum = 0;
    let maximum = 1;
    for (const [startValue, endValue, lower, upper] of [
      [from.x, to.x, rect.left, rect.right],
      [from.y, to.y, rect.top, rect.bottom],
    ]) {
      const delta = endValue - startValue;
      if (Math.abs(delta) < Number.EPSILON) {
        if (startValue < lower || startValue > upper) return null;
        continue;
      }
      let entry = (lower - startValue) / delta;
      let exit = (upper - startValue) / delta;
      if (entry > exit) [entry, exit] = [exit, entry];
      minimum = Math.max(minimum, entry);
      maximum = Math.min(maximum, exit);
      if (minimum > maximum) return null;
    }
    return minimum >= 0 && minimum <= 1 ? minimum : null;
  }

  function outcome(current, phase, reason, plane, elapsed) {
    const missReason = phase === "missed" ? reason : null;
    return deepFreeze({
      ...current,
      phase,
      plane: deepFreeze({ ...plane }),
      elapsed,
      missReason,
      lastOutcome: deepFreeze({
        attemptNumber: current.attemptNumber,
        angle: current.angle,
        power: current.power,
        reason,
      }),
      revision: current.revision + 1,
    });
  }

  function step(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "flying") return current;

    const from = current.plane;
    const nextVy = from.vy + GRAVITY * FIXED_STEP;
    const to = {
      x: from.x + from.vx * FIXED_STEP,
      y: from.y + from.vy * FIXED_STEP + 0.5 * GRAVITY * FIXED_STEP * FIXED_STEP,
      vx: from.vx,
      vy: nextVy,
      rotation: Math.atan2(nextVy, from.vx) * 180 / Math.PI,
    };
    const hitAt = segmentRectEntry(from, to, WORLD.mailbox);
    if (hitAt !== null) {
      const hitVy = from.vy + GRAVITY * FIXED_STEP * hitAt;
      const hitPlane = {
        x: from.x + (to.x - from.x) * hitAt,
        y: from.y + (to.y - from.y) * hitAt,
        vx: from.vx,
        vy: hitVy,
        rotation: Math.atan2(hitVy, from.vx) * 180 / Math.PI,
      };
      return outcome(current, "arrived", "arrived", hitPlane, current.elapsed + FIXED_STEP * hitAt);
    }

    const elapsed = current.elapsed + FIXED_STEP;
    if (to.y >= WORLD.groundY) {
      const reason = to.x < WORLD.mailbox.left ? "short" : "low";
      return outcome(current, "missed", reason, { ...to, y: Math.min(to.y, WORLD.groundY) }, elapsed);
    }
    if (to.x >= WORLD.mailbox.left && to.x <= WORLD.mailbox.right && to.y > WORLD.mailbox.bottom) {
      return outcome(current, "missed", "low", to, elapsed);
    }
    if (to.y <= WORLD.ceilingY || to.x > WORLD.mailbox.right || to.x > WORLD.width || elapsed >= 6) {
      const reason = to.y > WORLD.mailbox.bottom ? "low" : "high";
      return outcome(current, "missed", reason, to, elapsed);
    }
    return deepFreeze({ ...current, plane: deepFreeze(to), elapsed });
  }

  function finishFlight(state, maximumSteps = 1200) {
    let current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "flying") return current;
    const limit = Number.isInteger(maximumSteps) && maximumSteps > 0 ? maximumSteps : 1200;
    for (let index = 0; index < limit && current.phase === "flying"; index += 1) {
      current = step(current);
    }
    return current;
  }

  function retry(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "missed") return current;
    return deepFreeze({
      ...current,
      phase: "aiming",
      attemptNumber: current.attemptNumber + 1,
      plane: deepFreeze({ ...initialPlane(), rotation: -current.angle }),
      elapsed: 0,
      missReason: null,
      revision: current.revision + 1,
    });
  }

  function reveal(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "arrived") return current;
    return deepFreeze({ ...current, phase: "revealed", revision: current.revision + 1 });
  }

  function restart(state) {
    const current = safeState(state);
    if (!current) return createInitialState();
    if (current.phase !== "revealed") return current;
    return deepFreeze({ ...createInitialState(), revision: current.revision + 1 });
  }

  function previewTrajectory(state) {
    const current = safeState(state);
    if (!current) return Object.freeze([]);
    if (!["intro", "aiming"].includes(current.phase)) return Object.freeze([]);
    const points = [];
    for (let time = 0.1; time <= PREVIEW_SECONDS + Number.EPSILON; time += 0.1) {
      const point = pointAtTime(current.angle, current.power, time);
      if (point.x > WORLD.width || point.y < 0 || point.y > WORLD.height) break;
      points.push(deepFreeze({ x: point.x, y: point.y }));
    }
    return deepFreeze(points);
  }

  function defaultHint(context) {
    if (context.attemptNumber >= 3) return "邮差密语：20°、70 格是一条稳妥航线。";
    if (context.missReason === "short") return "提前落地了：多给一点力度，或把机头稍稍抬高。";
    if (context.missReason === "low") return "擦到邮箱下沿了：把仰角调高一点。";
    return "从邮箱上方飞过了：压低仰角，或收一点力度。";
  }

  function resolveHint(policy, context) {
    const safeContext = deepFreeze({
      attemptNumber: Number.isInteger(context?.attemptNumber) && context.attemptNumber >= 1
        ? context.attemptNumber
        : 1,
      missReason: MISS_REASONS.includes(context?.missReason) ? context.missReason : "short",
      angle: clampInteger(context?.angle, AIM_LIMITS.angle, DEFAULT_AIM.angle),
      power: clampInteger(context?.power, AIM_LIMITS.power, DEFAULT_AIM.power),
    });
    if (typeof policy === "function") {
      try {
        const custom = cleanText(policy(safeContext), 100);
        if (custom) return custom;
      } catch (_) {
        // User-authored local policy safely falls through to the deterministic hint.
      }
    }
    return defaultHint(safeContext);
  }

  return Object.freeze({
    PHASES,
    MISS_REASONS,
    FIXED_STEP,
    GRAVITY,
    SPEED_MIN,
    SPEED_MAX,
    PREVIEW_SECONDS,
    DEFAULT_AIM,
    AIM_LIMITS,
    WORLD,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    isFlightState,
    speedForPower,
    velocityForAim,
    pointAtTime,
    segmentRectEntry,
    start,
    setAim,
    launch,
    step,
    finishFlight,
    retry,
    reveal,
    restart,
    previewTrajectory,
    resolveHint,
  });
});
