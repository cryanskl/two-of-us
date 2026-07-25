(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelConstants = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  const VERSION = 1;
  const TICK_HZ = 60;
  const FP_SCALE = 1024;
  const WORLD_W = 960;
  const WORLD_H = 600;
  const TANK_RADIUS = 18;
  const TANK_FORWARD_SPEED_FP = 3 * FP_SCALE;
  const TANK_REVERSE_SPEED_FP = 2 * FP_SCALE;
  const TANK_TURN_STEPS_PER_TICK = 1;
  const BULLET_RADIUS = 5;
  const BULLET_SPEED_FP = 9 * FP_SCALE;
  const FIRE_COOLDOWN_TICKS = 24;
  const MAX_BULLETS_PER_PLAYER = 2;
  const BULLET_LIFETIME_TICKS = 360;
  const MAX_REFLECTIONS = 3;
  const MAX_CONTACTS_PER_TICK = 4;
  const COUNTDOWN_TICKS = 180;
  const ROUND_RESULT_TICKS = 90;
  const MATCH_ACTIVE_TICKS = 5400;
  const TARGET_SCORE = 3;
  const MAX_FRAME_GAP_MS = 250;
  const MAX_STEPS_PER_FRAME = 5;
  const SPAWN_CLEARANCE = 4;

  const INPUT_BITS = deepFreeze({
    FORWARD: 1 << 0,
    REVERSE: 1 << 1,
    TURN_LEFT: 1 << 2,
    TURN_RIGHT: 1 << 3,
    FIRE_HELD: 1 << 4,
    FIRE_EDGE: 1 << 5,
  });
  const ALL_INPUT_BITS = Object.values(INPUT_BITS).reduce((mask, bit) => mask | bit, 0);
  const PHASES = deepFreeze([
    "instructions", "countdown", "playing", "round-result", "paused", "match-result",
  ]);
  const PAUSE_REASONS = deepFreeze(["manual", "hidden", "blur", "stalled", "invariant"]);
  const ACTION_TYPES = deepFreeze(["START", "STEP", "PAUSE", "RESUME", "RESTART"]);

  const DIRECTION_VECTORS = deepFreeze([
    { x: 1024, y: 0 }, { x: 1004, y: 200 }, { x: 946, y: 392 }, { x: 851, y: 569 },
    { x: 724, y: 724 }, { x: 569, y: 851 }, { x: 392, y: 946 }, { x: 200, y: 1004 },
    { x: 0, y: 1024 }, { x: -200, y: 1004 }, { x: -392, y: 946 }, { x: -569, y: 851 },
    { x: -724, y: 724 }, { x: -851, y: 569 }, { x: -946, y: 392 }, { x: -1004, y: 200 },
    { x: -1024, y: 0 }, { x: -1004, y: -200 }, { x: -946, y: -392 }, { x: -851, y: -569 },
    { x: -724, y: -724 }, { x: -569, y: -851 }, { x: -392, y: -946 }, { x: -200, y: -1004 },
    { x: 0, y: -1024 }, { x: 200, y: -1004 }, { x: 392, y: -946 }, { x: 569, y: -851 },
    { x: 724, y: -724 }, { x: 851, y: -569 }, { x: 946, y: -392 }, { x: 1004, y: -200 },
  ]);

  const WORLD_BOUNDS = deepFreeze({
    minX: 24 * FP_SCALE,
    maxX: 936 * FP_SCALE,
    minY: 24 * FP_SCALE,
    maxY: 576 * FP_SCALE,
  });
  const PLAYER_ZONES = deepFreeze([
    { id: "zone-left", minX: 48 * FP_SCALE, maxX: 432 * FP_SCALE, minY: 48 * FP_SCALE, maxY: 552 * FP_SCALE },
    { id: "zone-right", minX: 528 * FP_SCALE, maxX: 912 * FP_SCALE, minY: 48 * FP_SCALE, maxY: 552 * FP_SCALE },
  ]);
  const WALLS = deepFreeze([
    { id: "wall-left-shield", minX: 300 * FP_SCALE, maxX: 340 * FP_SCALE, minY: 210 * FP_SCALE, maxY: 390 * FP_SCALE },
    { id: "wall-right-shield", minX: 620 * FP_SCALE, maxX: 660 * FP_SCALE, minY: 210 * FP_SCALE, maxY: 390 * FP_SCALE },
    { id: "wall-center-top", minX: 456 * FP_SCALE, maxX: 504 * FP_SCALE, minY: 72 * FP_SCALE, maxY: 222 * FP_SCALE },
    { id: "wall-center-bottom", minX: 456 * FP_SCALE, maxX: 504 * FP_SCALE, minY: 378 * FP_SCALE, maxY: 528 * FP_SCALE },
  ]);
  const SPAWNS = deepFreeze([
    { id: 0, xFp: 150 * FP_SCALE, yFp: 300 * FP_SCALE, heading: 0 },
    { id: 1, xFp: 810 * FP_SCALE, yFp: 300 * FP_SCALE, heading: 16 },
  ]);

  const RULES = deepFreeze({
    TICK_HZ,
    FP_SCALE,
    WORLD_W,
    WORLD_H,
    TANK_RADIUS,
    TANK_FORWARD_SPEED_FP,
    TANK_REVERSE_SPEED_FP,
    TANK_TURN_STEPS_PER_TICK,
    BULLET_RADIUS,
    BULLET_SPEED_FP,
    FIRE_COOLDOWN_TICKS,
    MAX_BULLETS_PER_PLAYER,
    BULLET_LIFETIME_TICKS,
    MAX_REFLECTIONS,
    MAX_CONTACTS_PER_TICK,
    COUNTDOWN_TICKS,
    ROUND_RESULT_TICKS,
    MATCH_ACTIVE_TICKS,
    TARGET_SCORE,
    MAX_FRAME_GAP_MS,
    MAX_STEPS_PER_FRAME,
    SPAWN_CLEARANCE,
  });

  function mirrorX(xFp) {
    if (!Number.isSafeInteger(xFp)) throw new TypeError("xFp must be a safe integer");
    return WORLD_W * FP_SCALE - xFp;
  }

  function mirrorHeading(heading) {
    if (!Number.isInteger(heading) || heading < 0 || heading >= 32) {
      throw new RangeError("heading must be in 0..31");
    }
    return (16 - heading + 32) % 32;
  }

  return deepFreeze({
    VERSION,
    RULES,
    INPUT_BITS,
    ALL_INPUT_BITS,
    PHASES,
    PAUSE_REASONS,
    ACTION_TYPES,
    DIRECTION_VECTORS,
    WORLD_BOUNDS,
    PLAYER_ZONES,
    WALLS,
    SPAWNS,
    mirrorX,
    mirrorHeading,
    deepFreeze,
  });
});
