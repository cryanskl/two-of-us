# “雾里，跟着你走”产品与实现规格

- 日期：2026-07-20
- 状态：已冻结，待视觉与实现
- 对应调研：[`146-fog-navigation-research.md`](./146-fog-navigation-research.md)
- 目标等级：A，直接双击 `index.html`
- 主分类：双人合作
- 工作 ID：`fog-navigation`
- 设备：单设备热座，键盘或触屏

## 1. 产品结论

本作实现创意池 C09“迷雾领航”，作品名冻结为「雾里，跟着你走」。每轮由领航员独自看完整地图 7 秒；页面随后真实移除完整图并遮盖交接；驾驶员只看当前位置周围 `5×5` 的雾窗，依靠领航员口述一步步走到终点。四轮固定交换角色，让两个人各领航两次、驾驶两次。

最小版本只保留一条核心关系：**看见整条路的人不能按方向，只看见脚边的人愿意跟着对方说的走。**

不加入随机地图、计时驾驶、积分、排名、生命、语音识别、联网、存档、编辑器、AI 提示、振动或音频。重试不惩罚；陷阱只让两人重新看图和沟通。

## 2. 首局体验

1. intro 显示两张角色牌、四轮流程和“开始第一段雾路”；
2. A 独自看第一张完整地图，页面显示安全路线、两枚地标、危险格和 7 秒纸图计时；
3. 计时结束或页面失焦时，完整地图节点从 DOM 移除，显示不透视的交接页；
4. B 接过设备并点击“我只看脚边，出发”；
5. B 用方向键或四向按钮移动；A 只能口述，页面不提供领航控制；
6. 撞墙时位置不变；进入危险格后回到重看页；到达终点后显示本轮步数和尝试次数；
7. 下一轮角色交换，重复至四轮；
8. complete 显示四轮摘要、双方各两次领航/驾驶的对称证明和可配置共同结语。

冻结短文案：

```text
标题：雾里，跟着你走
副标题：你记住整条路，我只看见脚边。
规则：看图的人不碰方向，走路的人不看全图。
交接：把地图折好，交给要走路的人。
重试：没关系，我们再看一次。
完成：四段雾路，都有人记得回家的方向。
```

## 3. 角色与轮次

默认席位：

```js
const DEFAULT_SEATS = Object.freeze([
  Object.freeze({ id: "A", name: "你" }),
  Object.freeze({ id: "B", name: "我" }),
]);
```

冻结领航顺序：

| 轮 | 地图 | 领航员 | 驾驶员 | 安全最短路 |
| ---: | --- | --- | --- | ---: |
| 1 | 雾松坡 | A | B | 22 |
| 2 | 风铃巷 | B | A | 13 |
| 3 | 苔光岸 | A | B | 22 |
| 4 | 归灯台 | B | A | 13 |

不得根据成功、失败、重试或配置改变角色顺序。`navigatorSeat` 必须由 `level.navigatorSeat` 派生，`driverSeat = 1 - navigatorSeat`，不能让状态同时保存两个可互相矛盾的来源。

## 4. 冻结关卡数据

### 4.1 字符语义

| 字符 | 导航图 | 驾驶雾窗 | 规则 |
| --- | --- | --- | --- |
| `#` | 墨色山墙 | 墙 | 不可进入 |
| `.` | 安全小路 | 普通路 | 可进入 |
| `S` | 起点 | 玩家所在格/普通路 | 每图恰好一个 |
| `G` | 终点灯 | 进入半径 2 后显示 | 每图恰好一个 |
| `A` / `B` | 地标章 | 进入半径 2 后显示地标 | 每图各一个 |
| `H` | 雾陷阱与警示叉 | **普通路** | 进入后重看本轮 |

地标字母只是数据键，界面必须显示关卡 metadata 中的原创名称与符号，不直接向玩家显示 `A/B/H`。

### 4.2 四张地图

```js
const LEVELS = [
  {
    id: "mist-pine-slope",
    title: "雾松坡",
    navigatorSeat: 0,
    landmarks: { A: "松果牌", B: "蓝风铃" },
    critical: { cell: [5, 4], safe: "right", decoy: "left", arrival: "up" },
    safeDistance: 22,
    rows: [
      "#############",
      "#####S#######",
      "#####.#######",
      "#####.#######",
      "#H.........A#",
      "###########.#",
      "###########.#",
      "#G....B.....#",
      "#############",
    ],
  },
  {
    id: "wind-chime-lane",
    title: "风铃巷",
    navigatorSeat: 1,
    landmarks: { A: "月牙石", B: "纸风车" },
    critical: { cell: [5, 4], safe: "down", decoy: "up", arrival: "left" },
    safeDistance: 13,
    rows: [
      "#############",
      "#####H......#",
      "#####.#######",
      "#####.#######",
      "#S....#######",
      "#####.#######",
      "#####.#######",
      "#####...A.BG#",
      "#############",
    ],
  },
  {
    id: "moss-light-shore",
    title: "苔光岸",
    navigatorSeat: 0,
    landmarks: { A: "萤石堆", B: "小木桥" },
    critical: { cell: [7, 4], safe: "left", decoy: "right", arrival: "down" },
    safeDistance: 22,
    rows: [
      "#############",
      "#.....B....G#",
      "#.###########",
      "#.###########",
      "#A.........H#",
      "#######.#####",
      "#######.#####",
      "#######S#####",
      "#############",
    ],
  },
  {
    id: "home-lantern-terrace",
    title: "归灯台",
    navigatorSeat: 1,
    landmarks: { A: "白羽标", B: "暖灯亭" },
    critical: { cell: [6, 4], safe: "up", decoy: "down", arrival: "right" },
    safeDistance: 13,
    rows: [
      "#############",
      "#GBA...######",
      "######.######",
      "######.######",
      "######.....S#",
      "######.######",
      "######.######",
      "#.....H######",
      "#############",
    ],
  },
];
```

坐标统一为 `[x, y]`，左上角 `[0, 0]`。所有行恰为 13 字符，所有地图恰为 9 行。关卡数组、关卡对象、rows、landmarks 和 critical 必须递归冻结。

### 4.3 关卡校验

`validateLevel(level)` 必须拒绝：

- 非普通对象、额外字段、重复或非法 ID；
- 非 13×9、行宽不一、边界不是全 `#`；
- 未知字符、非精确一个 `S/G/H/A/B`；
- metadata 地标键与地图不一致；
- `navigatorSeat` 不是 0/1；
- critical cell 不是可走格、三方向非法、方向重复或 arrival 不能到达 critical；
- safe/decoy 前两步不是可走且局部结构不满足等价 Gate；
- `safeDistance` 不是安全 BFS 的真实最短距离；
- 起终点通过不含 H 的路径不可达，或 H 不可从起点通过普通可走图到达。

配置失败时不得部分采用；整套关卡回退到冻结默认值。

## 5. 合作必要性证明

### 5.1 安全 BFS

`findSafePath(level)`：

- 邻接顺序固定 `up, right, down, left`；
- `#` 和 `H` 都不可进入；
- 用 FIFO 队列与 predecessor 重建第一条最短安全路径；
- 返回冻结的坐标数组，调用方修改不影响内部；
- 四关距离必须分别严格等于 `[22, 13, 22, 13]`。

另有 `findReachablePath(level, { hazardsWalkable: true })` 用于证明 H 本身可被驾驶员走到，但不作为答案路线。

### 5.2 局部分叉等价

`analyzeCooperationGate(level)` 以 critical cell 为起点，分别沿 safe 和 decoy 走两步。每一步生成面向前方归一化的 `5×5` 结构签名：

```text
wall / walkable / landmark / goal / void
```

签名生成时必须：

- 把 `H` 规范成 `walkable`；
- 忽略具体地标名称和颜色，但保留“这里有地标”的结构类别；
- 将两个候选方向各自旋转到“前方为 up”；
- 对旋转后的签名再计算一次左右镜像，并取两者中字典序较小者作为 canonical signature；
- 不包含安全路径、危险距离或地图 ID；
- 比较从 critical 后第 1、2 步的签名序列。

四张冻结地图的 safe/decoy 签名序列必须相等；第 3 步以后 decoy 路径最终进入 H，而 safe 路径存在到 G 的无危险路径。由此证明驾驶员在关键分叉的头两步只看局部结构不能区分方向，必须依赖 briefing 信息或领航员口述。

## 6. 配置契约

`config.js` 暴露：

```js
window.FOG_NAVIGATION_CONFIG = Object.freeze({
  seats: Object.freeze(["你", "我"]),
  composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，雾再浓一点，也会有人记得方向。`;
  },
});
```

`normalizeConfig(raw)`：

- `seats` 必须是恰含两个字符串的数组；
- 每个名字 trim 后按 Unicode code point 截至 12 字；
- 空白、重复名字、getter 抛错、非数组或额外元素整项回退；
- composer 只在 complete 由 app 调用，不进入 reducer；
- 输入是递归冻结、与真实状态断开引用的 summary；
- 返回值 trim 后最多 120 code points；非字符串、空白、超长、抛错或试图修改 summary 时回退默认结语。

默认配置不修改即可完整游玩。配置不得改变关卡、角色顺序、7 秒计时、局部半径、危险或完成条件。

## 7. 权威状态与不变量

```js
{
  phase,                 // intro | briefing | cover | driving | retry | round-result | complete
  roundIndex,            // 0..3
  briefingTicks,         // 0..210
  position: [x, y],
  path: [[x, y], ...],   // 含起点与每次成功进入的格
  attempt,               // 从 1 开始
  bumpCount,
  completedRounds: [{ levelId, navigatorSeat, driverSeat, steps, attempts, bumps }],
  coverReason,           // timer | manual | hidden | blur | null
  feedbackCode,
  revision
}
```

不变量：

- `roundIndex`、position、path、completedRounds 必须和 phase 相容；
- navigator/driver 不直接存状态，只从当前关卡派生；
- briefing 初始 `briefingTicks = 210`，每个 `TICK` 只接受正安全整数；
- path 第一项永远是 S，末项永远等于 position；
- 撞墙不追加 path，进入 H 前也不把 H 写入可公开路径；
- retry 保留本轮 attempt、bumpCount，但 position/path 回到起点；
- round-result 恰比进入本轮前多一条冻结摘要；
- complete 恰有四条摘要，领航席为 `[0,1,0,1]`；
- revision 只在权威状态真实改变时加一；
- 所有合法返回状态递归冻结，不共享调用方数组或对象。

合法状态上的非法动作返回同一引用。畸形 state、action 或 level 不抛异常；公开 reducer 返回安全初始态或原引用，具体行为由测试固定。

## 8. 状态转换 API

### 8.1 初始化与开始

- `createInitialState(config?)` 返回精确 intro；
- `start(state)` 仅在 intro 生效，进入第 0 轮 briefing；
- `restart(state)` 在任何合法 phase 返回同一配置的新 intro；
- intro 不提前构造或公开 navigator map view。

### 8.2 briefing 与遮盖

- 常量 `TICKS_PER_SECOND = 30`、`BRIEFING_TICKS = 210`；
- `tickBriefing(state, ticks = 1)` 只在 briefing 生效；
- 209 tick 后仍是 briefing 且余 1；第 210 tick 原子进入 cover；
- 超大 ticks 只进入一次 cover，不穿透到 driving；
- `cover(state, reason)` 接受 `manual/hidden/blur`，timer 只能由 tick 产生；
- cover 把 `briefingTicks` 归零并保存枚举原因；
- `driverReady(state)` 仅在 cover 生效，进入 driving；
- hidden/blur 在 intro、cover、driving、retry、result、complete 不修改规则状态。

### 8.3 驾驶

`move(state, direction)` 只接受精确枚举 `up/right/down/left`：

- 墙或边界：position/path 不变，`bumpCount += 1`，feedback `wall`；
- 安全格/地标：移动一格、追加 path，feedback 为 `moved` 或 `landmark-A/B`；
- H：进入 retry，attempt 加 1，position/path 重置到 S，feedback `mist-trap`；
- G：追加 G、生成轮摘要并原子进入 round-result 或 complete；
- 在非 driving phase、未知方向或畸形 action 下不移动。

`review(state)` 只在 retry 生效，回同一轮 briefing，计时恢复 210；`nextRound(state)` 只在非最终 round-result 生效，roundIndex 加一并进入 briefing。

## 9. 阶段 view 与隐私

所有 view 都返回只读 DTO，不暴露 state、level 或嵌套引用。

### 9.1 `getNavigatorView(state)`

只在 briefing 返回：

```js
{
  phase, roundNumber, title, navigatorName, driverName,
  secondsRemaining,
  grid: [{ kind, x, y, label?, symbol? }],
  safePath: [[x, y], ...],
  instruction
}
```

允许包含完整墙体、H、地标、终点和安全路径。非 briefing 返回 `null`。

### 9.2 `getDriverView(state)`

只在 driving 返回固定 25 格：

```js
{
  phase, roundNumber, title, driverName,
  windowSize: 5,
  cells: [{ dx, dy, kind, label?, symbol? }],
  position: [2, 2],
  steps, attempts, bumps, feedbackCode
}
```

`dx/dy` 固定为 `-2..2`；越地图边界为 `void`。H 必须输出 `floor`，不返回世界坐标、完整 rows、hazard、critical、safePath、goal 距离或 navigator view。G/地标只有落在窗口内才可见。position 永远是局部中心 `[2,2]`，不能泄露世界坐标。

### 9.3 `getPublicView(state)`

- intro：双方名字、规则、轮数；
- cover：当前轮、交接双方、coverReason 和主动作；
- retry：中性重看文案、attempt 和主动作，不显示 H 世界位置；
- round-result：当前冻结摘要与下一轮角色；
- complete：四轮摘要与对称计数；
- briefing/driving 分别只组合对应专用 view，不同时返回两者。

app 必须按 phase 使用 `replaceChildren()` 重建 stage。完整导航图不得通过 hidden DOM、template、data 属性、aria 文本、CSS 变量或 JSON script 留在 cover/driving 页面。

## 10. 时间与页面生命周期

- rAF 只积累真实时间并派发固定 `1/30s` tick；
- 单帧接收时间上限 100ms，最多追赶 3 tick，多余积压丢弃；
- 只有 briefing 消耗 tick，其他阶段不启动规则计时；
- `visibilitychange` hidden 或 `blur` 在 briefing 立即 `cover(reason)` 并清空 accumulator；
- 回到页面不自动恢复 briefing，也不补算后台时间；
- rAF、timer ID、accumulator、lastFrame、DOM 与事件对象不得进入 state；
- `prefers-reduced-motion` 只影响雾与纸图动画，不改变 tick 数。

## 11. 输入与焦点

### 11.1 键盘

- driving：`ArrowUp/Right/Down/Left` 各移动一格；
- 只在 driving 且焦点不在可编辑控件时阻止方向键滚动；
- `event.code` 与 `event.key` 均可识别原生 KeyboardEvent；
- `event.repeat` 必须忽略，避免长按跨越多个未知格；
- intro/cover/retry/result/complete 使用原生按钮与 Enter/Space；
- hidden/blur 清空任何展示层输入锁，但不产生额外 move。

### 11.2 触屏

- 四个方向是独立原生 button，一次点击只派发一步；
- 不做 pointer hold 连发、多点同步或滑动手势；
- 按钮最小 56×56px，390px 及以下仍保持至少 52×52px；
- driving 渲染后焦点进入状态标题，不自动聚焦某个方向，避免误触；
- 撞墙、陷阱、结果和换轮后焦点进入对应主标题/主动作。

## 12. DOM 与可访问性

建议阶段结构：

```text
main
├── header：轮次、角色、静态状态
├── stage（每 phase replaceChildren）
│   ├── briefing-map / cover-card / driver-grid / result-card
│   └── phase-actions
├── controls（仅 driving）
└── live-status
```

- briefing 地图用 CSS Grid + 语义列表，不使用 Canvas 作为唯一信息载体；
- driver grid 用 `role="grid"`，25 个格有行列与类型的简短可访问名；
- 完整安全路线另有领航员专属短句摘要，但该节点随地图一起移除；
- 墙/路/地标/危险/终点使用形状、图标、纹理和文字冗余，不只靠颜色；
- live region 仅播报倒计时整数秒、撞墙、地标、陷阱、到达、换角和完成；
- 不能逐帧或一次性朗读完整地图；
- `:focus-visible` 清晰，forced-colors 使用系统色与轮廓；
- 200% 字体下地图可以缩放但主动作不得被裁切。

## 13. 冻结视觉方向

详细视觉稿在下一份 design 文档冻结；规格先锁定：

- 主题：夜雾、折叠纸图、铅笔路线、手工地标章；
- 避免：军用雷达、霓虹赛博面板、商业 Roguelike 像素风、奇幻战争地图；
- briefing 是温暖纸面，driving 是深蓝局部雾窗，complete 是两张合拢的路线卡；
- 页面背景可使用本项目 ImageGen 原创资产，但网格、路线、危险和主控制必须由 DOM/CSS 保底；
- 1280×800 首屏看见标题、完整主舞台和当前主动作；
- 390×844 与 320×700 可纵向滚动但不横向溢出；
- 背景加载失败不影响规则、地图或控制。

编码前必须生成并原尺寸查看桌面 briefing、移动 driving 和桌面 complete 三个概念，产出 design 文档、允许文案、设计令牌、生产资产来源和 fidelity ledger。

## 14. 文件与运行边界

```text
experiences/co-op/fog-navigation/
├── index.html
├── styles.css
├── config.js
├── levels.js
├── logic.js
├── logic.test.js
├── app.js
├── assets/
│   ├── fog-paper-background.png
│   └── favicon.svg
├── README.md
└── ATTRIBUTION.md
```

- 脚本顺序严格为 `config.js → levels.js → logic.js → app.js`；
- 经典脚本同时暴露浏览器 global；可测试文件另暴露 CommonJS；
- 不使用 `type=module`、动态 import、npm 运行包、远程 URL、fetch、XHR、WebSocket、存储、Worker、Service Worker、AudioContext、FileReader、媒体或传感器；
- 不引用 `shared/`，作品目录单独复制后可直开；
- 不用 `innerHTML` 注入配置或状态文案，使用 textContent 与 DOM 构造；
- favicon 与背景均为本项目原创或 ImageGen 资产，并在 README/ATTRIBUTION 说明。

## 15. 借鉴与来源声明

作品 README 与 ATTRIBUTION 必须独立列出并固定：

1. rot.js v2.2.1：annotated tag object `55f487ca0384c9a10d19a705504c83def21654a1`，解引用 commit `46782e248c2db9d379a5e4f13bb8323f18dff04b`，BSD-3-Clause，Copyright 2012-now Ondrej Zara；
2. TwoPlayerGames commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`，MIT，Copyright 2026 tridpt；
3. Amazeing v1.4.1 / commit `10daea21682eb3a868a03043452c8254178b8504`，MIT，Copyright 2021 Thorsten Schulz；
4. wblachut/fog-of-war commit `1e2c17c332307b0f112895114b9dadc0db2b948f` 仅作排除来源：未找到许可证且 README 明示使用商业游戏主题/资产，未复制；
5. OpenAI 内置 ImageGen 的生成日期、输入是否含第三方图片、源稿与生产资产路径；
6. “代码、算法实现、关卡、地图、参数、测试、DOM、CSS、文案和素材零复制”的完整声明。

如果实施偏离零复制，必须先修改规格和声明，不得在验收后补写。

## 16. 测试矩阵

### 16.1 关卡与算法

1. 四图全量 schema、字符计数、边界、尺寸、ID 与深冻结；
2. BFS 固定邻接顺序、四个距离、路径连续、避开 H、起终点正确；
3. 修改返回 path 不污染后续结果；
4. H 在普通可走图可达，但安全 BFS 不经过 H；
5. 四个 critical 的 safe/decoy 两步规范化签名相等；
6. decoy 最终到 H，safe 最终到 G；
7. 每种非法 schema 单独拒绝，整套回退不部分采用。

### 16.2 reducer

1. 精确 intro、开始、四轮角色派生；
2. 209/210 tick 边界、超大 tick、非法 tick；
3. timer/manual/hidden/blur cover 原因与幂等；
4. 墙、边界、普通路、A/B、H、G 六类移动；
5. repeat key 不派发、未知方向和非 driving 不移动；
6. retry 重看、attempt 保留、路径重置、角色不变；
7. result/next/complete 四轮摘要与角色对称；
8. 任意阶段 restart 清除旧路径、旧 live 文案所需状态和摘要；
9. 非法动作同引用、畸形状态安全、深冻结与引用隔离；
10. 同一 action trace 重放得到同 state hash。

### 16.3 view 与静态 Gate

1. navigator view 只在 briefing 存在并包含完整信息；
2. driver view 恰 25 格，中心固定 `[2,2]`，H 输出 floor；
3. driver/public view JSON 不含 rows、hazard、critical、safePath、世界 position；
4. cover/retry/result/complete 不含上一张地图；
5. 配置清洗、composer 冻结输入、异常与超长回退；
6. 经典脚本顺序、file 协议、零远程/网络/存储/随机/共享运行时；
7. README/ATTRIBUTION 四个固定对象、许可证、ImageGen 与零复制边界；
8. CSS 包含 52/56px 触控、focus-visible、reduced-motion 与 forced-colors。

## 17. 浏览器验收

1. `file://` 人工双击完整一轮，localhost 完成四轮；
2. 第一轮键盘走完；第二轮按钮走完；第三轮先撞墙再进入 H 并重看；第四轮混合输入；
3. briefing 7 秒自动遮盖，manual、hidden 与 blur 三种遮盖路径分别实测；
4. cover/driving 阶段抓 DOM 文本与属性，确认没有完整 rows、H 坐标或安全路径；
5. 四轮完成后摘要真实对应 0/1/0/1 领航和实际 steps/attempts/bumps；
6. 1440×900、1280×800、390×844、320×700 无横向溢出，主动作可达，最小按钮达标；
7. 键盘焦点、repeat、返回页面、reduced motion、无背景、forced-colors 手工或自动覆盖；
8. 桌面 briefing、移动 driving、桌面 complete 最终截图与三个概念原尺寸对照；
9. 控制台 0 error，资源全部来自作品目录，统一门户入口唯一。

## 18. 完成定义

只有同时满足以下条件才算作品完成：

- 四图可解与合作必要性由生产同源算法证明；
- 阶段 reducer、局部 view 和 DOM 隐私 Gate 全部通过；
- 四轮真实浏览器完成并对称换角；
- A 级直开、零运行依赖、零网络、零存储、零随机成立；
- 视觉概念、生产资产、响应式、无障碍与降级完成验收；
- README/ATTRIBUTION 完整记录固定来源与零复制声明；
- 新发现 bug 写入 `/bugs`，可复用经验写入 `/learn`；
- 逻辑、前端、目录、学习和验收按实施计划分别提交。
