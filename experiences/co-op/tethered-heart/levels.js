(function (root, factory) {
  "use strict";
  root.TETHERED_HEART_LEVELS = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WORLD_WIDTH = 960;
  const WORLD_HEIGHT = 540;
  const ANCHOR_RADIUS = 18;
  const PAYLOAD_RADIUS = 17;

  const LEVEL_SOURCES = [
    {
      id: "through-the-stitches",
      title: "穿过针脚",
      hint: "先一起向下绕过第一块软垫，再向上收回丝带。",
      anchors: [{ x: 118, y: 218 }, { x: 118, y: 322 }],
      payload: { x: 228, y: 270 },
      obstacles: [
        { x: 300, y: 0, width: 132, height: 254 },
        { x: 526, y: 286, width: 132, height: 254 },
      ],
      hazards: [],
      goal: { x: 804, y: 270, radius: 60, anchorMinX: 742 },
    },
    {
      id: "around-the-pin",
      title: "绕过别针",
      hint: "由一人先向上引导，另一人跟进，再一起落回中线。",
      anchors: [{ x: 118, y: 218 }, { x: 118, y: 322 }],
      payload: { x: 228, y: 270 },
      obstacles: [
        { x: 362, y: 174, width: 174, height: 192 },
      ],
      hazards: [
        [{ x: 564, y: 104 }, { x: 626, y: 104 }, { x: 595, y: 170 }],
        [{ x: 584, y: 436 }, { x: 646, y: 436 }, { x: 615, y: 370 }],
      ],
      goal: { x: 804, y: 270, radius: 60, anchorMinX: 742 },
    },
    {
      id: "finish-the-stitch",
      title: "收好这一针",
      hint: "穿过错位窄门后，反向微调并一起放慢。",
      anchors: [{ x: 118, y: 218 }, { x: 118, y: 322 }],
      payload: { x: 228, y: 270 },
      obstacles: [
        { x: 302, y: 0, width: 124, height: 210 },
        { x: 472, y: 330, width: 124, height: 210 },
        { x: 642, y: 0, width: 116, height: 210 },
      ],
      hazards: [
        [{ x: 438, y: 218 }, { x: 472, y: 244 }, { x: 438, y: 270 }],
      ],
      goal: { x: 838, y: 270, radius: 58, anchorMinX: 790 },
    },
  ];

  function validateLevel(level) {
    if (!isPlainObject(level)) throw new TypeError("关卡必须是普通对象");
    if (typeof level.id !== "string" || !level.id || typeof level.title !== "string") {
      throw new TypeError("关卡必须提供 id 与 title");
    }
    if (!Array.isArray(level.anchors) || level.anchors.length !== 2) {
      throw new RangeError("关卡必须提供两枚线轴出生点");
    }
    level.anchors.forEach((point) => validateCirclePoint(point, ANCHOR_RADIUS, "线轴"));
    validateCirclePoint(level.payload, PAYLOAD_RADIUS, "吊坠");

    if (!Array.isArray(level.obstacles) || !Array.isArray(level.hazards)) {
      throw new TypeError("obstacles 与 hazards 必须是数组");
    }
    for (const box of level.obstacles) validateBox(box);
    for (const triangle of level.hazards) validateTriangle(triangle);
    validateGoal(level.goal);

    const circles = level.anchors.concat([level.payload]);
    for (const point of circles) {
      if (level.obstacles.some((box) => pointInBox(point, box))) {
        throw new RangeError("出生点不能位于软垫内部");
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
      anchors: source.anchors.map(copyPoint),
      payload: copyPoint(source.payload),
      obstacles: source.obstacles.map((box) => ({ ...box })),
      hazards: source.hazards.map((triangle) => triangle.map(copyPoint)),
      goal: { ...source.goal },
      checkpoint: {
        anchors: source.anchors.map(copyPoint),
        payload: copyPoint(source.payload),
      },
    });
  }

  function validateCirclePoint(point, radius, label) {
    validatePoint(point, label);
    if (point.x < radius || point.x > WORLD_WIDTH - radius
      || point.y < radius || point.y > WORLD_HEIGHT - radius) {
      throw new RangeError(`${label}超出世界边界`);
    }
  }

  function validatePoint(point, label) {
    if (!isPlainObject(point) || !finite(point.x) || !finite(point.y)) {
      throw new TypeError(`${label}必须是有限坐标`);
    }
  }

  function validateBox(box) {
    if (!isPlainObject(box) || !finite(box.x) || !finite(box.y)
      || !finite(box.width) || !finite(box.height)) {
      throw new TypeError("软垫必须提供有限矩形坐标");
    }
    if (box.width <= 0 || box.height <= 0 || box.x < 0 || box.y < 0
      || box.x + box.width > WORLD_WIDTH || box.y + box.height > WORLD_HEIGHT) {
      throw new RangeError("软垫必须完整位于世界内且尺寸为正");
    }
  }

  function validateTriangle(triangle) {
    if (!Array.isArray(triangle) || triangle.length !== 3) {
      throw new RangeError("危险针脚必须恰有三个顶点");
    }
    triangle.forEach((point) => {
      validatePoint(point, "危险针脚顶点");
      if (point.x < 0 || point.x > WORLD_WIDTH || point.y < 0 || point.y > WORLD_HEIGHT) {
        throw new RangeError("危险针脚必须位于世界内");
      }
    });
    const [a, b, c] = triangle;
    const twiceArea = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(twiceArea) < 0.001) throw new RangeError("危险针脚不能退化为直线");
  }

  function validateGoal(goal) {
    if (!isPlainObject(goal) || !finite(goal.x) || !finite(goal.y)
      || !finite(goal.radius) || !finite(goal.anchorMinX)) {
      throw new TypeError("终点必须提供有限坐标、半径和收束线");
    }
    if (goal.radius <= PAYLOAD_RADIUS || goal.x - goal.radius < 0
      || goal.x + goal.radius > WORLD_WIDTH || goal.y - goal.radius < 0
      || goal.y + goal.radius > WORLD_HEIGHT || goal.anchorMinX < 0
      || goal.anchorMinX > WORLD_WIDTH) {
      throw new RangeError("终点几何超出世界或无法容纳吊坠");
    }
  }

  function pointInBox(point, box) {
    return point.x >= box.x && point.x <= box.x + box.width
      && point.y >= box.y && point.y <= box.y + box.height;
  }

  function copyPoint(point) {
    return { x: point.x, y: point.y };
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
    ANCHOR_RADIUS,
    PAYLOAD_RADIUS,
    LEVELS,
    validateLevel,
  });
});
