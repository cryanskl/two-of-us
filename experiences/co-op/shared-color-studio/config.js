(function (root, factory) {
  "use strict";

  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.SHARED_COLOR_STUDIO_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function composeStudioResult(view) {
    // TODO（欢迎你来改）：把下面 5 行换成只属于你们的合册文案。
    const completed = Array.isArray(view?.completed) ? view.completed.length : 0;
    if (completed < 5) return `已经收下 ${completed} 张色笺，下一张还在等你们。`;
    return "你转过色相，我照亮明暗。最后留下的是我们一起调出的颜色。";
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  return deepFreeze({
    tickMs: 100,
    countdownTicks: 30,
    roundTicks: 240,
    maxFrameGapMs: 500,
    chroma: 0.12,
    hueDegrees: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
    lightness: [0.48, 0.52, 0.56, 0.60, 0.64, 0.68, 0.72, 0.76, 0.80],
    rounds: [
      {
        id: "sunset-letter",
        title: "晚霞信笺",
        note: "像那天回头时，天边刚好慢下来。",
        target: { hueIndex: 1, lightnessIndex: 7 },
        start: { hueIndex: 8, lightnessIndex: 2 },
      },
      {
        id: "sea-glass",
        title: "海玻璃",
        note: "把风和浪磨成一小块安静。",
        target: { hueIndex: 6, lightnessIndex: 6 },
        start: { hueIndex: 2, lightnessIndex: 1 },
      },
      {
        id: "berry-night",
        title: "莓果夜灯",
        note: "深一点，再留一盏只给彼此的灯。",
        target: { hueIndex: 11, lightnessIndex: 3 },
        start: { hueIndex: 4, lightnessIndex: 8 },
      },
      {
        id: "moss-letter",
        title: "苔痕小纸条",
        note: "被雨淋过的话，也会慢慢长出颜色。",
        target: { hueIndex: 4, lightnessIndex: 5 },
        start: { hueIndex: 9, lightnessIndex: 2 },
      },
      {
        id: "lavender-dawn",
        title: "薰衣草清晨",
        note: "最后一张，调成我们醒来时的光。",
        target: { hueIndex: 9, lightnessIndex: 8 },
        start: { hueIndex: 1, lightnessIndex: 4 },
      },
    ],
    copy: {
      title: "把颜色调到一起",
      intro: "你转色相，我调明暗。一起把五张色笺调到目标刻度。",
      start: "开始调色",
      retry: "再调一次",
      next: "收下这张",
      restart: "重新调一册",
    },
    composeStudioResult,
  });
});
