(function (root, factory) {
  "use strict";
  root.LIGHTHOUSE_PASSAGE_LEVELS = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WORLD_WIDTH = 960;
  const WORLD_HEIGHT = 540;
  const BOAT_RADIUS = 14;

  const LEVEL_SOURCES = [
    {
      id: "first-light",
      title: "第一束光",
      hint: "先找到暖金航标，再照着检查点把船引向港口。",
      lighthouse: {
        position: { x: 72, y: 270 },
        initialAngle: -Math.PI,
        beamRange: 900,
        beamHalfAngle: 0.12,
      },
      boatStart: { position: { x: 150, y: 430 }, heading: 0 },
      reefs: [
        { id: "north-crescent", x: 360, y: 300, radius: 55 },
        { id: "low-stone", x: 555, y: 500, radius: 34 },
        { id: "harbor-shoulder", x: 690, y: 190, radius: 47 },
      ],
      beacons: [
        { id: "warm-mark", x: 330, y: 420, radius: 18, required: true, checkpoint: false },
        { id: "home-turn", x: 620, y: 330, radius: 20, required: false, checkpoint: true },
      ],
      checkpoints: [
        { position: { x: 150, y: 430 }, heading: 0 },
        { position: { x: 620, y: 350 }, heading: -0.2 },
      ],
      harbor: {
        x: 856,
        y: 270,
        radius: 50,
        heading: 0,
        headingTolerance: Math.PI * 16 / 180,
        lightTarget: { x: 875, y: 250, radius: 22 },
      },
    },
    {
      id: "turning-in-fog",
      title: "雾中转弯",
      hint: "灯光提前回扫下一枚航标，船再顺着 S 弯跟进。",
      lighthouse: {
        position: { x: 72, y: 270 },
        initialAngle: -Math.PI,
        beamRange: 900,
        beamHalfAngle: 0.115,
      },
      boatStart: { position: { x: 150, y: 105 }, heading: 0 },
      reefs: [
        { id: "upper-hook", x: 350, y: 235, radius: 62 },
        { id: "middle-hook", x: 540, y: 145, radius: 52 },
        { id: "lower-hook", x: 680, y: 300, radius: 60 },
      ],
      beacons: [
        { id: "fog-one", x: 300, y: 105, radius: 18, required: true, checkpoint: false },
        { id: "fog-two", x: 610, y: 390, radius: 20, required: true, checkpoint: true },
      ],
      checkpoints: [
        { position: { x: 150, y: 105 }, heading: 0 },
        { position: { x: 610, y: 410 }, heading: 0.2 },
      ],
      harbor: {
        x: 856,
        y: 420,
        radius: 50,
        heading: 0,
        headingTolerance: Math.PI * 16 / 180,
        lightTarget: { x: 875, y: 400, radius: 22 },
      },
    },
    {
      id: "harbor-together",
      title: "一起入港",
      hint: "连续换向穿过三道窄门，最后一起稳住方向。",
      lighthouse: {
        position: { x: 72, y: 270 },
        initialAngle: -Math.PI,
        beamRange: 900,
        beamHalfAngle: 0.11,
      },
      boatStart: { position: { x: 150, y: 270 }, heading: 0 },
      reefs: [
        { id: "gate-one-north", x: 320, y: 95, radius: 70 },
        { id: "gate-one-south", x: 320, y: 445, radius: 82 },
        { id: "gate-two-north", x: 480, y: 70, radius: 68 },
        { id: "gate-two-south", x: 480, y: 350, radius: 88 },
        { id: "gate-three-north", x: 720, y: 220, radius: 88 },
        { id: "gate-three-south", x: 720, y: 475, radius: 60 },
      ],
      beacons: [
        { id: "narrow-one", x: 285, y: 270, radius: 17, required: true, checkpoint: false },
        { id: "narrow-two", x: 565, y: 185, radius: 18, required: true, checkpoint: true },
        { id: "narrow-three", x: 650, y: 375, radius: 18, required: true, checkpoint: false },
      ],
      checkpoints: [
        { position: { x: 150, y: 270 }, heading: 0 },
        { position: { x: 575, y: 190 }, heading: 0 },
      ],
      harbor: {
        x: 870,
        y: 365,
        radius: 46,
        heading: 0,
        headingTolerance: Math.PI * 16 / 180,
        lightTarget: { x: 892, y: 345, radius: 20 },
      },
    },
  ];

  function validateLevel(level) {
    if (!isPlainObject(level)) throw new TypeError("关卡必须是普通对象");
    if (typeof level.id !== "string" || !level.id || typeof level.title !== "string") {
      throw new TypeError("关卡必须提供 id 与 title");
    }
    validateLighthouse(level.lighthouse);
    validateBoatStart(level.boatStart, "小船出生点");
    if (!Array.isArray(level.reefs) || !Array.isArray(level.beacons)
      || !Array.isArray(level.checkpoints)) {
      throw new TypeError("reefs、beacons 与 checkpoints 必须是数组");
    }
    if (level.beacons.length === 0 || !level.beacons.some((beacon) => beacon.required)) {
      throw new RangeError("每幕至少需要一枚必要航标");
    }

    const ids = new Set();
    level.reefs.forEach((reef) => validateNamedCircle(reef, ids, "暗礁"));
    level.beacons.forEach((beacon) => {
      validateNamedCircle(beacon, ids, "航标");
      if (typeof beacon.required !== "boolean" || typeof beacon.checkpoint !== "boolean") {
        throw new TypeError("航标 required/checkpoint 必须是布尔值");
      }
    });
    level.checkpoints.forEach((checkpoint) => validateBoatStart(checkpoint, "检查点"));
    if (level.checkpoints.length !== 1 + level.beacons.filter((beacon) => beacon.checkpoint).length) {
      throw new RangeError("每枚检查点航标必须映射到一个检查点状态");
    }
    validateHarbor(level.harbor);

    const safeStarts = [level.boatStart].concat(level.checkpoints);
    for (const start of safeStarts) {
      if (level.reefs.some((reef) => circlesOverlap(start.position, BOAT_RADIUS, reef, reef.radius))) {
        throw new RangeError("出生点或检查点不能落在暗礁内");
      }
    }
    if (level.reefs.some((reef) => circlesOverlap(level.harbor, level.harbor.radius, reef, reef.radius))) {
      throw new RangeError("港口不能与暗礁重叠");
    }

    const lightTargets = level.beacons.filter((beacon) => beacon.required)
      .concat([level.harbor.lightTarget]);
    for (const target of lightTargets) {
      if (distance(level.lighthouse.position, target) > level.lighthouse.beamRange + target.radius) {
        throw new RangeError("灯塔范围必须覆盖全部必要航标和港口灯牌");
      }
    }
    return true;
  }

  function compileLevel(source) {
    validateLevel(source);
    return deepFreeze({
      id: source.id,
      title: source.title,
      hint: source.hint,
      lighthouse: {
        ...source.lighthouse,
        position: copyPoint(source.lighthouse.position),
      },
      boatStart: copyBoatStart(source.boatStart),
      reefs: source.reefs.map((reef) => ({ ...reef })),
      beacons: source.beacons.map((beacon) => ({ ...beacon })),
      checkpoints: source.checkpoints.map(copyBoatStart),
      harbor: {
        ...source.harbor,
        lightTarget: { ...source.harbor.lightTarget },
      },
    });
  }

  function validateLighthouse(lighthouse) {
    if (!isPlainObject(lighthouse)) throw new TypeError("灯塔定义必须是对象");
    validatePoint(lighthouse.position, "灯塔坐标", 0);
    if (!finite(lighthouse.initialAngle) || !finite(lighthouse.beamRange)
      || !finite(lighthouse.beamHalfAngle)) {
      throw new TypeError("灯塔角度与光束参数必须有限");
    }
    if (lighthouse.beamRange <= 0 || lighthouse.beamHalfAngle <= 0
      || lighthouse.beamHalfAngle >= Math.PI / 2) {
      throw new RangeError("灯塔光束范围或半角非法");
    }
  }

  function validateBoatStart(start, label) {
    if (!isPlainObject(start) || !finite(start.heading)) {
      throw new TypeError(`${label}必须提供 position 与 heading`);
    }
    validatePoint(start.position, label, BOAT_RADIUS);
  }

  function validateNamedCircle(circle, ids, label) {
    if (!isPlainObject(circle) || typeof circle.id !== "string" || !circle.id) {
      throw new TypeError(`${label}必须提供唯一 id`);
    }
    if (ids.has(circle.id)) throw new RangeError(`重复的关卡对象 id：${circle.id}`);
    ids.add(circle.id);
    validatePoint(circle, label, 0);
    if (!finite(circle.radius)) throw new TypeError(`${label}半径必须有限`);
    if (circle.radius <= 0 || circle.x - circle.radius < 0 || circle.x + circle.radius > WORLD_WIDTH
      || circle.y - circle.radius < 0 || circle.y + circle.radius > WORLD_HEIGHT) {
      throw new RangeError(`${label}必须完整位于世界内且半径为正`);
    }
  }

  function validateHarbor(harbor) {
    if (!isPlainObject(harbor) || !finite(harbor.heading) || !finite(harbor.headingTolerance)) {
      throw new TypeError("港口必须提供位置、航向与容差");
    }
    validatePoint(harbor, "港口", 0);
    if (!finite(harbor.radius) || harbor.radius <= BOAT_RADIUS
      || harbor.x - harbor.radius < 0 || harbor.x + harbor.radius > WORLD_WIDTH
      || harbor.y - harbor.radius < 0 || harbor.y + harbor.radius > WORLD_HEIGHT
      || harbor.headingTolerance <= 0 || harbor.headingTolerance >= Math.PI) {
      throw new RangeError("港口几何非法");
    }
    if (!isPlainObject(harbor.lightTarget) || !finite(harbor.lightTarget.radius)) {
      throw new TypeError("港口必须提供灯牌圆");
    }
    validatePoint(harbor.lightTarget, "港口灯牌", 0);
    if (harbor.lightTarget.radius <= 0) throw new RangeError("港口灯牌半径必须为正");
  }

  function validatePoint(point, label, margin) {
    if (!isPlainObject(point) || !finite(point.x) || !finite(point.y)) {
      throw new TypeError(`${label}必须是有限坐标`);
    }
    if (point.x < margin || point.x > WORLD_WIDTH - margin
      || point.y < margin || point.y > WORLD_HEIGHT - margin) {
      throw new RangeError(`${label}超出世界边界`);
    }
  }

  function circlesOverlap(first, firstRadius, second, secondRadius) {
    return distance(first, second) < firstRadius + secondRadius;
  }

  function distance(first, second) {
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  function copyPoint(point) {
    return { x: point.x, y: point.y };
  }

  function copyBoatStart(start) {
    return { position: copyPoint(start.position), heading: start.heading };
  }

  function finite(value) {
    return Number.isFinite(value);
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach((key) => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  const LEVELS = deepFreeze(LEVEL_SOURCES.map(compileLevel));

  return deepFreeze({
    WORLD_WIDTH,
    WORLD_HEIGHT,
    BOAT_RADIUS,
    LEVELS,
    validateLevel,
  });
});
