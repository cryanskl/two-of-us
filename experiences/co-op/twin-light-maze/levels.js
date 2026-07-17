(function (root, factory) {
  "use strict";
  root.TWIN_LIGHT_LEVELS = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GRID_WIDTH = 12;
  const GRID_HEIGHT = 8;
  const MIN_GRID_SIZE = 4;
  const MAX_GRID_SIZE = 24;
  const ALLOWED_CELLS = new Set(["#", " ", "1", "2", "x", "y", "a", "b", "A", "B"]);

  const LEVEL_SOURCES = [
    {
      id: "first-relay",
      title: "第一次接力",
      hint: "一人留在左侧压住铜星，另一人先穿门。",
      rows: [
        "############",
        "#1    #   x#",
        "# a   # a  #",
        "#     A    #",
        "#     #    #",
        "#2    #   y#",
        "#     #    #",
        "############",
      ],
    },
    {
      id: "across-the-line",
      title: "隔岸照应",
      hint: "珊瑚守住上层星盘，让青色先到下层。",
      rows: [
        "############",
        "#1        x#",
        "# b   2    #",
        "######B#####",
        "#    b     #",
        "# y      ###",
        "#          #",
        "############",
      ],
    },
    {
      id: "double-relay",
      title: "双门接力",
      hint: "先接过铜星，再接过蓝星；每扇门都要两次交棒。",
      rows: [
        "############",
        "#1  #   # x#",
        "# a # a # b#",
        "#   A   B  #",
        "#2  # b # y#",
        "#   #   #  #",
        "#   #   #  #",
        "############",
      ],
    },
    {
      id: "home-together",
      title: "一起归巢",
      hint: "先向下交棒，再向右交棒；最后两束光并肩回家。",
      rows: [
        "############",
        "#1       2 #",
        "# a        #",
        "####A#######",
        "# b a # b  #",
        "#     B   x#",
        "#     #   y#",
        "############",
      ],
    },
  ];

  function validateLevel(input) {
    if (!input || typeof input !== "object" || !Array.isArray(input.rows)) {
      throw new TypeError("关卡必须提供字符串网格 rows");
    }
    const { rows } = input;
    if (rows.length < MIN_GRID_SIZE || rows.length > MAX_GRID_SIZE) {
      throw new RangeError("关卡高度超出允许范围");
    }
    if (rows.some((row) => typeof row !== "string")) {
      throw new TypeError("关卡的每一行都必须是字符串");
    }
    const width = rows[0].length;
    if (width < MIN_GRID_SIZE || width > MAX_GRID_SIZE) {
      throw new RangeError("关卡宽度超出允许范围");
    }
    if (rows.some((row) => row.length !== width)) {
      throw new RangeError("关卡网格必须是矩形");
    }

    const counts = { 1: 0, 2: 0, x: 0, y: 0, a: 0, b: 0, A: 0, B: 0 };
    for (const row of rows) {
      for (const cell of row) {
        if (!ALLOWED_CELLS.has(cell)) throw new TypeError(`关卡包含未知字符：${cell}`);
        if (Object.prototype.hasOwnProperty.call(counts, cell)) counts[cell] += 1;
      }
    }
    for (const required of ["1", "2", "x", "y"]) {
      if (counts[required] !== 1) throw new RangeError(`关卡必须且只能包含一个 ${required}`);
    }
    for (const [plate, door] of [["a", "A"], ["b", "B"]]) {
      if ((counts[plate] === 0) !== (counts[door] === 0)) {
        throw new RangeError(`${plate}/${door} 压力板与门必须成组出现`);
      }
    }
    return true;
  }

  function compileLevel(source) {
    validateLevel(source);
    const rows = Object.freeze(source.rows.slice());
    const positions = { 1: [], 2: [], x: [], y: [], a: [], b: [], A: [], B: [] };

    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        const cell = rows[y][x];
        if (Object.prototype.hasOwnProperty.call(positions, cell)) {
          positions[cell].push(y * rows[y].length + x);
        }
      }
    }

    return Object.freeze({
      id: source.id,
      title: source.title,
      hint: source.hint,
      width: rows[0].length,
      height: rows.length,
      rows,
      starts: Object.freeze([positions["1"][0], positions["2"][0]]),
      exits: Object.freeze([positions.x[0], positions.y[0]]),
      plates: Object.freeze({
        a: Object.freeze(positions.a.slice()),
        b: Object.freeze(positions.b.slice()),
      }),
      doors: Object.freeze({
        A: Object.freeze(positions.A.slice()),
        B: Object.freeze(positions.B.slice()),
      }),
    });
  }

  function cellAt(level, cellIndex) {
    if (!level || !Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= level.width * level.height) {
      return null;
    }
    return level.rows[Math.floor(cellIndex / level.width)][cellIndex % level.width];
  }

  const LEVELS = Object.freeze(LEVEL_SOURCES.map(compileLevel));

  if (LEVELS.some((level) => level.width !== GRID_WIDTH || level.height !== GRID_HEIGHT)) {
    throw new RangeError("内置关卡必须统一为 12×8");
  }

  return Object.freeze({
    GRID_WIDTH,
    GRID_HEIGHT,
    MIN_GRID_SIZE,
    MAX_GRID_SIZE,
    LEVELS,
    validateLevel,
    cellAt,
  });
});
