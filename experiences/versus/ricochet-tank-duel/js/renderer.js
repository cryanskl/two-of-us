(function (root, factory) {
  "use strict";

  const constants = typeof module === "object" && module.exports
    ? require("./constants.js")
    : root.RicochetTankDuelConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelRenderer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants) {
  "use strict";

  if (!constants) throw new Error("RicochetTankDuelConstants must load before renderer.js");

  const {
    RULES,
    WORLD_BOUNDS,
    PLAYER_ZONES,
    WALLS,
    DIRECTION_VECTORS,
    deepFreeze,
  } = constants;
  const { WORLD_W, WORLD_H, FP_SCALE, TANK_RADIUS, BULLET_RADIUS } = RULES;
  const COLORS = deepFreeze({
    stage: "#0b1022",
    grid: "rgba(181, 189, 209, 0.08)",
    boundary: "#59617d",
    prism: "rgba(141, 145, 180, 0.38)",
    prismLine: "#8d91b4",
    left: "#ff765f",
    leftStrong: "#ff9a84",
    right: "#55c7e8",
    rightStrong: "#8de4f5",
    text: "#f7f2e8",
  });

  function logical(valueFp) {
    return valueFp / FP_SCALE;
  }

  function createRenderer(canvas, options = {}) {
    const context = canvas.getContext("2d", { alpha: false });
    const media = options.motionQuery || matchMedia("(prefers-reduced-motion: reduce)");
    const previousReflections = new Map();
    const scars = [];

    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const width = Math.max(1, Math.round(rect.width * devicePixelRatio));
      const height = Math.max(1, Math.round(rect.height * devicePixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(width / WORLD_W, 0, 0, height / WORLD_H, 0, 0);
    }

    function drawGrid() {
      context.strokeStyle = COLORS.grid;
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 60; x < WORLD_W; x += 60) {
        context.moveTo(x, 0);
        context.lineTo(x, WORLD_H);
      }
      for (let y = 60; y < WORLD_H; y += 60) {
        context.moveTo(0, y);
        context.lineTo(WORLD_W, y);
      }
      context.stroke();
    }

    function drawZone(zone, seat) {
      context.save();
      context.fillStyle = seat === 0 ? "rgba(255, 118, 95, 0.055)" : "rgba(85, 199, 232, 0.055)";
      context.fillRect(
        logical(zone.minX),
        logical(zone.minY),
        logical(zone.maxX - zone.minX),
        logical(zone.maxY - zone.minY),
      );
      context.restore();
    }

    function drawWalls() {
      for (const wall of WALLS) {
        const x = logical(wall.minX);
        const y = logical(wall.minY);
        const width = logical(wall.maxX - wall.minX);
        const height = logical(wall.maxY - wall.minY);
        context.save();
        context.fillStyle = COLORS.prism;
        context.strokeStyle = COLORS.prismLine;
        context.lineWidth = 2;
        context.setLineDash([8, 5]);
        context.fillRect(x, y, width, height);
        context.strokeRect(x, y, width, height);
        context.beginPath();
        context.moveTo(x + 7, y);
        context.lineTo(x + width, y + Math.min(height, width));
        context.stroke();
        context.restore();
      }
    }

    function drawTank(tank) {
      const seat = tank.id;
      const direction = DIRECTION_VECTORS[tank.heading];
      const angle = Math.atan2(direction.y, direction.x);
      const color = seat === 0 ? COLORS.left : COLORS.right;
      const strong = seat === 0 ? COLORS.leftStrong : COLORS.rightStrong;
      context.save();
      context.translate(logical(tank.xFp), logical(tank.yFp));
      context.rotate(angle);
      context.lineWidth = 3;
      context.strokeStyle = strong;
      context.fillStyle = seat === 0 ? color : COLORS.stage;
      if (seat === 1) context.setLineDash([5, 3]);
      context.beginPath();
      context.roundRect(-TANK_RADIUS, -12, TANK_RADIUS * 2, 24, 11);
      context.fill();
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = strong;
      context.beginPath();
      context.moveTo(TANK_RADIUS + 7, 0);
      context.lineTo(4, -8);
      context.lineTo(4, 8);
      context.closePath();
      if (seat === 0) context.fill();
      else context.stroke();
      context.rotate(-angle);
      context.fillStyle = COLORS.text;
      context.font = "700 12px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      if (seat === 0) context.fillText("左", 0, 0);
      else context.fillText("右", 0, 0);
      context.restore();
    }

    function drawBullet(bullet) {
      const seat = bullet.ownerId;
      const x = logical(bullet.xFp);
      const y = logical(bullet.yFp);
      const color = seat === 0 ? COLORS.leftStrong : COLORS.rightStrong;
      context.save();
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(x, y, BULLET_RADIUS + 2, 0, Math.PI * 2);
      if (seat === 0) context.fill();
      else {
        context.setLineDash([4, 3]);
        context.stroke();
      }
      if (!media.matches) {
        const length = 13;
        const speed = Math.hypot(bullet.vxFp, bullet.vyFp) || 1;
        context.setLineDash(seat === 0 ? [] : [3, 2]);
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - (bullet.vxFp / speed) * length, y - (bullet.vyFp / speed) * length);
        context.stroke();
      }
      context.restore();
    }

    function collectScars(state) {
      const liveIds = new Set();
      for (const bullet of state.bullets) {
        liveIds.add(bullet.id);
        const previous = previousReflections.get(bullet.id);
        if (previous !== undefined && bullet.reflectionCount > previous) {
          scars.push({
            x: logical(bullet.xFp),
            y: logical(bullet.yFp),
            seat: bullet.ownerId,
            life: 90,
          });
          if (scars.length > 12) scars.shift();
        }
        previousReflections.set(bullet.id, bullet.reflectionCount);
      }
      for (const id of previousReflections.keys()) {
        if (!liveIds.has(id)) previousReflections.delete(id);
      }
    }

    function drawScars() {
      for (let index = scars.length - 1; index >= 0; index -= 1) {
        const scar = scars[index];
        context.save();
        context.translate(scar.x, scar.y);
        context.strokeStyle = scar.seat === 0 ? COLORS.leftStrong : COLORS.rightStrong;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-7, -5);
        context.lineTo(0, 0);
        context.lineTo(6, -7);
        context.moveTo(0, 0);
        context.lineTo(7, 5);
        context.stroke();
        context.restore();
        scar.life -= 1;
        if (scar.life <= 0) scars.splice(index, 1);
      }
    }

    function draw(state) {
      sizeCanvas();
      context.fillStyle = COLORS.stage;
      context.fillRect(0, 0, WORLD_W, WORLD_H);
      drawGrid();
      PLAYER_ZONES.forEach(drawZone);
      context.strokeStyle = COLORS.boundary;
      context.lineWidth = 3;
      context.strokeRect(
        logical(WORLD_BOUNDS.minX),
        logical(WORLD_BOUNDS.minY),
        logical(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX),
        logical(WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY),
      );
      drawWalls();
      collectScars(state);
      drawScars();
      state.bullets.forEach(drawBullet);
      state.tanks.forEach(drawTank);
    }

    return Object.freeze({ draw, resize: sizeCanvas });
  }

  return deepFreeze({ createRenderer });
});
