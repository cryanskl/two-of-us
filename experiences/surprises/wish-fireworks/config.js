(function (root) {
  "use strict";

  const config = {
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

  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.WISH_FIREWORKS_CONFIG = config;
})(typeof globalThis !== "undefined" ? globalThis : this);
