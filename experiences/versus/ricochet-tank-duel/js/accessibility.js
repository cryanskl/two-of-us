(function (root, factory) {
  "use strict";

  const constants = typeof module === "object" && module.exports
    ? require("./constants.js")
    : root.RicochetTankDuelConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelAccessibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants) {
  "use strict";

  if (!constants) throw new Error("RicochetTankDuelConstants must load before accessibility.js");

  const { RULES, PLAYER_ZONES, deepFreeze } = constants;
  const DIRECTIONS = deepFreeze(["东", "东南", "南", "西南", "西", "西北", "北", "东北"]);

  function directionName(heading) {
    return DIRECTIONS[Math.floor(((heading + 2) % 32) / 4) % 8];
  }

  function relativeDirection(dx, dy) {
    if (dx === 0 && dy === 0) return "身边";
    const angle = Math.atan2(dy, dx);
    const index = Math.round(angle / (Math.PI / 4));
    return DIRECTIONS[(index + 8) % 8];
  }

  function zoneName(tank, seat) {
    const zone = PLAYER_ZONES[seat];
    const width = zone.maxX - zone.minX;
    const height = zone.maxY - zone.minY;
    const column = Math.min(2, Math.floor(((tank.xFp - zone.minX) * 3) / (width + 1)));
    const row = Math.min(2, Math.floor(((tank.yFp - zone.minY) * 3) / (height + 1)));
    return `${seat === 0 ? "左区" : "右区"} / ${["左列", "中列", "右列"][column]} / ${["上行", "中行", "下行"][row]}`;
  }

  function threatFor(state, seat) {
    const tank = state.tanks[seat];
    const threats = state.bullets
      .filter((bullet) => bullet.ownerId !== seat)
      .map((bullet) => {
        const dx = bullet.xFp - tank.xFp;
        const dy = bullet.yFp - tank.yFp;
        return { dx, dy, squared: dx * dx + dy * dy };
      })
      .sort((left, right) => left.squared - right.squared);
    if (threats.length === 0) return "暂无来弹";
    const nearest = threats[0];
    const distance = Math.sqrt(nearest.squared) / RULES.FP_SCALE;
    const level = distance < 160 ? "近" : (distance < 340 ? "中" : "远");
    return `${relativeDirection(nearest.dx, nearest.dy)} · ${level}`;
  }

  function cooldownFor(state, seat) {
    const bullets = state.bullets.filter((bullet) => bullet.ownerId === seat).length;
    if (bullets >= RULES.MAX_BULLETS_PER_PLAYER) return "场上已有 2 枚";
    const cooldown = state.tanks[seat].cooldownTicks;
    if (cooldown === 0) return "可发射";
    return `冷却中 · ${Math.ceil((cooldown / RULES.TICK_HZ) * 10) / 10} 秒`;
  }

  function formatTime(activeMatchTicks) {
    const remaining = Math.max(0, RULES.MATCH_ACTIVE_TICKS - activeMatchTicks);
    const seconds = Math.ceil(remaining / RULES.TICK_HZ);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function projectPlayer(state, seat) {
    const tank = state.tanks[seat];
    return {
      score: state.scores[seat],
      heading: directionName(tank.heading),
      zone: zoneName(tank, seat),
      bullets: `${state.bullets.filter((bullet) => bullet.ownerId === seat).length} / 2`,
      cooldown: cooldownFor(state, seat),
      threat: threatFor(state, seat),
    };
  }

  function eventMessage(event) {
    if (!event) return "";
    if (event.type === "match-started") return "三秒倒计时开始。";
    if (event.type === "playing-started") return "开始。";
    if (event.type === "paused") return "比赛已暂停。";
    if (event.type === "resumed") return "继续前重新倒计时。";
    if (event.type === "round-reset") return "下一回合，三秒倒计时开始。";
    if (event.type === "fire-blocked") return `${event.ownerId === 0 ? "左方" : "右方"}车头贴墙，无法发射。`;
    if (event.type === "tank-hit") return `${event.targetId === 1 ? "左方" : "右方"}命中。`;
    if (event.type === "match-finished") return "比赛结束。";
    return "";
  }

  function createAccessibility(doc = document) {
    const live = doc.getElementById("live-status");
    const eventStrip = doc.getElementById("event-strip");
    let lastAnnouncement = "";

    function set(id, value) {
      const node = doc.getElementById(id);
      if (node) node.textContent = String(value);
    }

    function announce(message) {
      if (!message || message === lastAnnouncement) return;
      lastAnnouncement = message;
      live.textContent = "";
      requestAnimationFrame(() => {
        live.textContent = message;
      });
    }

    function update(state) {
      const left = projectPlayer(state, 0);
      const right = projectPlayer(state, 1);
      set("left-score", left.score);
      set("right-score", right.score);
      set("remaining-time", formatTime(state.activeMatchTicks));
      for (const [seat, projection] of [["left", left], ["right", right]]) {
        set(`${seat}-heading`, projection.heading);
        set(`${seat}-zone`, projection.zone);
        set(`${seat}-bullets`, projection.bullets);
        set(`${seat}-cooldown`, projection.cooldown);
        set(`${seat}-threat`, projection.threat);
      }
      const messages = state.semanticEvents.map(eventMessage).filter(Boolean);
      if (messages.length > 0) {
        const message = messages.join(" ");
        eventStrip.textContent = message;
        announce(message);
      }
    }

    function focus(id) {
      requestAnimationFrame(() => doc.getElementById(id)?.focus());
    }

    return Object.freeze({ update, announce, focus, projectPlayer, formatTime });
  }

  return deepFreeze({ directionName, zoneName, threatFor, formatTime, projectPlayer, createAccessibility });
});
