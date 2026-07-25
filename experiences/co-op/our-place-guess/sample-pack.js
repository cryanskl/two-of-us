import { activeCardsFor, normalizePack } from "./pack.js";

export const SAMPLE_PACK = normalizePack({
  schemaVersion: 1,
  title: "四封没有寄出的地图明信片",
  finalNote: "四个坐标都是虚构故事，但一起抵达的感觉是真的。",
  cards: [
    {
      id: "borrowed-blue-umbrella",
      title: "借来的蓝色雨伞",
      clue: "雨停以后，我们沿着一条很长的河慢慢走回去。",
      era: "春末",
      target: { longitude: 2.3522, latitude: 48.8566 },
      revealNote: "这封明信片记住的是雨后，不是一座城市。",
    },
    {
      id: "first-morning-ferry",
      title: "清晨第一班渡船",
      clue: "天刚亮，岸边的热气和水面上的风同时醒来。",
      era: "盛夏",
      target: { longitude: 103.8198, latitude: 1.3521 },
      revealNote: "真正被记住的，也许是一起等船的那几分钟。",
    },
    {
      id: "crescent-bay-wind",
      title: "月牙海湾的风",
      clue: "我们把鞋拎在手里，沿着向南弯下去的海岸走。",
      era: "初秋",
      target: { longitude: 151.2093, latitude: -33.8688 },
      revealNote: "海湾只是背景，风里并肩的人才是答案。",
    },
    {
      id: "scarf-like-a-flag",
      title: "围巾被吹成旗子",
      clue: "高楼之间的风很直，我们在黄昏里等一盏灯亮起。",
      era: "深冬",
      target: { longitude: -73.9857, latitude: 40.7484 },
      revealNote: "那天的风没有方向，回忆却一直留在原地。",
    },
  ],
});

export const SAMPLE_ACTIVE_CARDS = activeCardsFor(SAMPLE_PACK);
