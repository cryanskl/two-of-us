# 「同路，谁先到」产品与技术规格

> 产品 ID：`dual-maze-race`
> 标题：同路，谁先到
> 分类：`versus`
> 等级：A，单设备同屏，`file://` 直开
> 状态：Conditional Go
> 前置：[调研](./283-dual-maze-race-research.md) · [方向收敛](./284-dual-maze-race-brainstorm.md)

## 1. 范围与验收结论

首版是一个四局制本地双人迷宫竞速：

- 每局两人面对同一个只读 `9 × 9` perfect maze；
- 双方在物理隔离的两块盘上独立逐格移动；
- 规则以 `30Hz` fixed tick 同时结算；
- 同 seed 连赛两局并交换左右席与键区；
- 两个 seed 共四局；
- 本局胜者 1 分，同 tick 完成各 0.5 分；
- 允许整场平局；
- 零运行依赖、零网络、零存储、零权限。

只有第 15 节 Gate 全部通过，状态才可由 Conditional Go 转为 Go 并安装到 catalog。

## 2. 文件边界

实施目录冻结为：

```text
experiences/versus/dual-maze-race/
├── index.html
├── styles.css
├── config.js
├── maze.js
├── maze.test.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
└── ATTRIBUTION.md
```

所有脚本使用经典相对路径，不使用 `type="module"`、动态 import、fetch 或构建产物。

责任边界：

| 文件 | 责任 | 不得负责 |
| --- | --- | --- |
| `config.js` | 默认称呼、赛后自定义文案 | 地图、积分、tick、赢家 |
| `maze.js` | PRNG、生成、校验、BFS、公开 DTO | DOM、玩家、计时 |
| `logic.js` | 状态机、队列、tick、赛程、积分、public view | DOM、RAF、媒体查询 |
| `app.js` | 事件归一化、fixed-step 驱动、DOM 投影、暂停来源 | 自行改规则或重算赢家 |
| `styles.css` | 布局、状态外观、响应式、降动效 | 通过动画推进状态 |
| `index.html` | 语义骨架与本地脚本装载 | 内联隐藏规则 |

## 3. 冻结常量

```text
ROWS = 9
COLS = 9
START = { row: 0, col: 4 }
GOAL = { row: 8, col: 4 }
TICK_HZ = 30
TICK_MS = 1000 / 30
COUNTDOWN_TICKS = 90
RESUME_COUNTDOWN_TICKS = 45
MAX_QUEUE = 2
STALL_THRESHOLD_MS = 500
```

方向顺序与 bit：

| 方向 | code | bit | `dr` | `dc` | opposite |
| --- | --- | ---: | ---: | ---: | --- |
| `up` | `KeyW` / `ArrowUp` | 1 | -1 | 0 | `down` |
| `right` | `KeyD` / `ArrowRight` | 2 | 0 | 1 | `left` |
| `down` | `KeyS` / `ArrowDown` | 4 | 1 | 0 | `up` |
| `left` | `KeyA` / `ArrowLeft` | 8 | 0 | -1 | `right` |

收集 DFS 候选邻居时必须使用 `up, right, down, left`。改变顺序等同改变关卡。

## 4. 确定性迷宫合同

### 4.1 PRNG

输入 seed 先做 `Number(seed) >>> 0`。结果为 0 时抛出 `RangeError`，不得暗中换默认值。

每次 `nextUint32()` 严格执行：

```text
x ^= x << 13
x ^= x >>> 17
x ^= x << 5
x = x >>> 0
return x
```

选择候选索引：

```text
nextUint32() % candidates.length
```

不得用 `Math.random()`、浮点归一化、随机 sort 或拒绝采样替换。

### 4.2 生成

```js
createMaze({ rows, cols, start, goal, seed })
```

前置条件：

- `rows`、`cols` 是正整数；
- `start`、`goal` 均在界内且不同；
- seed 是非零 uint32。

算法：

1. 创建长度 `rows * cols` 的 `Uint8Array passages`；
2. 从 `start` 开始迭代 DFS；
3. 当前 cell 按冻结方向收集未访问邻居；
4. 用一次 PRNG 调用选择候选；
5. 对当前格与邻格分别 OR 互为 opposite 的 bit；
6. 邻格入栈；无候选则出栈；
7. 直到全部访问。

返回普通、深冻结 DTO：

```js
{
  rows,
  cols,
  start: { row, col },
  goal: { row, col },
  seed,
  passages: [number, ...],
  fingerprint
}
```

`fingerprint` 不是密码学 hash。冻结格式为：

```text
v1|<rows>x<cols>|<startIndex>|<goalIndex>|<seedHex8>|<passages hex2 concatenation>
```

它只用于检测两盘引用与算法漂移，不用于安全声明。

### 4.3 API

`maze.js` 暴露到 `window.DualMaze`：

```js
window.DualMaze = Object.freeze({
  DIRECTIONS,
  createMaze,
  validateMaze,
  findShortestPath,
  analyzeMaze,
  canMove,
  moveIndex
});
```

- `validateMaze(maze)` 返回深冻结诊断 `{ valid, errors, nodeCount, edgeCount }`；
- `findShortestPath(maze, from, to)` 返回新的 index 数组或 `null`；
- `analyzeMaze(maze)` 返回 `{ pathLength, turnCount, deadEndCount }`；
- `canMove(maze, index, direction)` 只读判断；
- `moveIndex(...)` 合法时返回邻格 index，不合法时返回原 index；
- 所有返回数组与输入内部引用断开；
- 生产 DOM 与 public view 不调用或暴露 `findShortestPath` 的结果。

### 4.4 固定关卡

```js
const MAPS = Object.freeze([
  Object.freeze({ label: "COUP", seed: 0x434f5550 }),
  Object.freeze({ label: "PAIR", seed: 0x50414952 })
]);
```

生产同源测试必须得到：

| Map | fingerprint | 路径 | 转弯 | 死胡同 |
| --- | --- | ---: | ---: | ---: |
| `COUP` | 实施后由测试冻结完整 v1 字符串 | 28 | 18 | 10 |
| `PAIR` | 实施后由测试冻结完整 v1 字符串 | 30 | 19 | 10 |

在第一次实现 commit 中计算完整 fingerprint、人工复核后写入 fixture。若三个指标与表
不同，不得只更新期望值；先检查位运算、邻居顺序、起点、边计数和转弯定义。

`turnCount` 统计连续移动方向改变的次数；长度不足 3 个 cell 时为 0。`deadEndCount`
统计 degree 为 1 的 cell，起点和终点也按图度数计入。

## 5. 赛程与身份

逻辑玩家身份固定为 `playerId: 0 | 1`。席位和控制区随 heat 改变：

```js
const HEATS = Object.freeze([
  { mapIndex: 0, leftPlayer: 0, rightPlayer: 1 },
  { mapIndex: 0, leftPlayer: 1, rightPlayer: 0 },
  { mapIndex: 1, leftPlayer: 0, rightPlayer: 1 },
  { mapIndex: 1, leftPlayer: 1, rightPlayer: 0 }
]);
```

- 左席永远对应 WASD 与左侧触控区；
- 右席永远对应方向键与右侧触控区；
- 玩家积分和名字跟随 `playerId`，不能跟随 DOM 左右位置；
- 同一 map 的两局必须引用同一个预生成 maze；
- 四局开始前生成两张 maze 并冻结，局间不重新生成。

## 6. 权威状态

```js
{
  phase:
    "intro" |
    "input-check" |
    "countdown" |
    "racing" |
    "paused" |
    "heat-result" |
    "match-result",
  playerNames: ["玩家一", "玩家二"],
  inputCheck: {
    directions: [
      { up: false, right: false, down: false, left: false },
      { up: false, right: false, down: false, left: false }
    ],
    jointDetected: false,
    warningAccepted: false
  },
  mazes: [mazeCOUP, mazePAIR],
  heatIndex: 0,
  positions: [START_INDEX, START_INDEX],
  queues: [[], []],
  countdownTicks: 90,
  elapsedTicks: 0,
  bumps: [0, 0],
  heatResults: [],
  pauseReason: null,
  revision: 0
}
```

不变量：

- state 和嵌套数据深冻结；
- 每个 reducer 返回新 state；非法动作返回原引用；
- `positions`、`queues`、`bumps` 始终按 playerId 排列；
- 当前左右席只能由 `HEATS[heatIndex]` 派生；
- `heatResults.length === heatIndex`，除非 phase 为 `match-result`，此时均为 4；
- `phase === racing` 时 `countdownTicks === 0`；
- `phase === paused` 时两条 queue 都为空；
- 结果一旦追加不可修改。

`inputCheck` 是风险提示，不是完美硬件证明。若方向检查完成但联合测试失败，用户可在
看到明确警告后选择触控，或显式接受风险继续；接受行为要进入 state，但不影响积分。

## 7. 逻辑 API

`logic.js` 暴露到 `window.DualMazeLogic`：

```js
window.DualMazeLogic = Object.freeze({
  CONSTANTS,
  HEATS,
  createInitialState,
  enterInputCheck,
  recordDirectionCheck,
  recordJointCheck,
  acceptInputWarning,
  startMatch,
  queueMove,
  advanceCountdown,
  stepRace,
  pauseMatch,
  resumeMatch,
  advanceHeat,
  restartMatch,
  getPublicView
});
```

### 7.1 名字

`createInitialState({ playerNames, mazes })`：

- trim 字符串；
- 空值分别回退为“玩家一”“玩家二”；
- 每个名字按 Unicode code points 截断到 20 个；
- DOM 始终通过 `textContent` 投影；
- 配置与输入不能注入 HTML。

### 7.2 输入检查

- `enterInputCheck` 只允许 `intro → input-check`；
- `recordDirectionCheck(state, playerId, direction)` 只在 `input-check` 生效；
- `recordJointCheck` 标记联合测试成功；
- 四方向全完成且 `jointDetected` 时可开始；
- 联合测试失败时只能在 `warningAccepted` 后开始；
- 触控按钮同样可完成方向检查；
- 检查输入不得残留到比赛 queue。

联合窗口和物理按键追踪属于 `app.js`；logic 只接收“检测成功”动作。

### 7.3 入队

`queueMove(state, playerId, direction)` 仅在 `phase === racing` 生效：

- playerId 必须为 0 或 1；
- direction 必须属于冻结枚举；
- 队列长度已为 2 时返回原引用；
- 每个调用最多追加一个方向；
- 不合并、排序或覆盖已有方向；
- countdown、paused、result 阶段不入队。

### 7.4 倒数

`advanceCountdown(state)`：

- 只在 `phase === countdown` 生效；
- 每次减 1；
- 从 1 到 0 的同一动作把 phase 改为 `racing` 并清空两队列；
- 开局倒数为 90 tick，暂停恢复倒数为 45 tick；
- 倒数不增加 `elapsedTicks`。

### 7.5 竞速 tick

`stepRace(state)` 必须按以下顺序：

1. 读取 tick 开始时的两个位置与两个队列；
2. 每位玩家各 shift 最前的一项；无项则原地；
3. 对两人分别用当前 maze 计算合法目标；
4. 非法移动保持原位置并让对应 bump 加一；
5. 合法移动更新位置；
6. `elapsedTicks + 1`；
7. 用两个新位置同时计算 `reachedGoal`；
8. 原子提交；
9. 任一到达时创建唯一 heat result，并转 `heat-result` 或 `match-result`。

同 tick：

- 只有玩家 0 到达：winner 为 0；
- 只有玩家 1 到达：winner 为 1；
- 两人都到达：winner 为 `null`，双方各得 0.5；
- 两人都未到达：继续 racing。

后续 tick 不得覆盖结果。两盘独立，因此没有同格、交换位置或角色碰撞规则。

### 7.6 结果

每个 heat result：

```js
{
  heatIndex,
  mapLabel,
  seed,
  leftPlayer,
  rightPlayer,
  winner: 0 | 1 | null,
  points: [0 | 0.5 | 1, 0 | 0.5 | 1],
  elapsedTicks,
  bumps: [number, number]
}
```

`advanceHeat`：

- 只从 `heat-result` 进入下一局；
- `heatIndex + 1`；
- 重置位置、队列、tick、bump；
- 根据新 heat 派生席位；
- 进入 90 tick countdown。

第 4 局由 `stepRace` 直接进入 `match-result`。总分为四个 result 的 points 逐项相加；
高者获胜，相等则 `winner: null`。不用时间或 bump 解平。

`restartMatch` 保留玩家名字和输入检查结果，清空比赛结果，回到第 1 局倒数。它重用
同两张冻结 maze，不生成新 seed。

## 8. Public view 与泄漏边界

`getPublicView(state)` 返回新的深冻结 DTO，仅包含：

- phase、玩家显示名；
- 当前局编号与 map label；
- 当前左右席玩家；
- 两块盘共同使用的公开 `passages`、尺寸、起终点；
- 双方当前位置；
- countdown、elapsedTicks、bumps；
- 已完成结果与总分；
- pause reason、输入检查公开状态；
- 可执行动作布尔值。

不得包含：

- BFS / gold path；
- DFS stack、visited、PRNG 中间 state；
- 未消费输入队列；
- 未来 heat 之外的隐藏数据；
- DOM 节点、事件对象或计时器；
- 可变 maze 内部引用。

两块 Board view 必须共享同一个公开 maze DTO 引用，以便测试 `left.maze === right.maze`。

## 9. App fixed-step 驱动

`app.js` 是唯一读取浏览器时间的层：

```text
frame(now):
  if first frame: remember now
  delta = now - previous
  previous = now
  if delta > 500ms: dispatch pause("stalled"); clear accumulator
  else accumulator += delta
  while accumulator >= TICK_MS and safeStepBudget remains:
    dispatch advanceCountdown or stepRace
    accumulator -= TICK_MS
  render(getPublicView(state))
```

要求：

- `performance.now()` 只计算 frame delta；
- `requestAnimationFrame()` 只驱动，不决定规则结果；
- 每帧安全上限为 5 个 tick；达到上限且仍有积压就暂停为 `stalled`；
- hidden、blur、pagehide 立即暂停并清 accumulator；
- 恢复必须经用户 button，进入 45 tick 倒数；
- 不在 background 补跑；
- render 不能产生新的规则 action。

`Date.now()`、CSS 动画回调、audio currentTime 和 DOM event timestamp 均不得参与判胜。

## 10. 浏览器输入合同

### 10.1 键盘

`keydown` 转换条件：

- `event.code` 属于两套游戏键；
- `event.repeat === false`；
- `ctrlKey / altKey / metaKey` 均为 false；
- target 不是 input、textarea、select 或 contenteditable；
- 当前 phase 允许检查或移动。

只有满足这些条件并命中游戏键时调用 `preventDefault()`。`keyup` 只服务联合检查的
按下集合，不触发移动。

联合检查使用一个公开测试组合，例如左席 `KeyD` 与右席 `ArrowLeft`：

- 页面要求双方按住自己的键；
- app 同时观察两 code 为 pressed 才 dispatch `recordJointCheck`；
- 超时只显示风险，不推断哪一方失败；
- 这不证明其他硬件组合，README 必须保留限制说明。

### 10.2 触控

- 八个原生 `<button type="button">`；
- `data-player-id` 使用逻辑玩家，而不是固定左右 DOM；
- 每次 click / keyboard activation 只调用一次 queue；
- 不同时监听 pointerdown 和 click 来造成双入队；
- `touch-action: manipulation` 或更严格的局部声明；
- `pointercancel` 清理视觉状态；
- 不依赖 hover；
- 实机验证两个独立触点并发。

## 11. DOM 与可访问语义

页面至少包含：

- 一个 `h1`；
- 赛制说明与输入兼容提示；
- 两个有 label 的名字 input；
- 输入检查 panel；
- 当前局、比分与席位 summary；
- 两个带独立可访问名的 board region；
- 两组方向 button；
- 暂停 / 继续 / 下一局 / 重赛 button；
- 一个 polite status region；
- 一个结果 heading。

规则：

- Board 不把每个 cell 变成焦点；
- 当前格使用 `aria-current="location"` 或等价摘要，但不逐 tick 强制朗读；
- status 只更新输入警告、撞墙摘要、暂停、换席与结果；
- 玩家身份至少由名字 + 左右席 + 形状/纹理表达；
- 终点和墙在 forced-colors 下仍有非颜色边界；
- 所有交互可见焦点；
- Tab 顺序跟视觉顺序一致；
- 结果出现后焦点移动到结果 heading，移动中不抢焦点。

## 12. 响应式与降动效

### 12.1 视口

| 视口 | 硬性要求 |
| --- | --- |
| `1440 × 900` | 两盘、比分、倒数、两组控制同屏；棋盘等尺寸 |
| `1280 × 800` | 无横向滚动；主动作首屏可达；结果层不遮盘 |
| `390 × 844` | 两盘同时可见，各不低于约 166px；八按钮至少 52px |
| `320 × 700` | 两盘各不低于约 136px；无横向溢出；控制可纵向到达 |

断点只改变布局，不改变左右席、按键、maze 朝向、tick 或赛程。小屏不能隐藏一个
Board 或切换为轮流玩法。

### 12.2 降动效

`prefers-reduced-motion: reduce`：

- 关闭棋子位移 transition；
- 关闭倒数缩放、闪光、脉冲；
- 保留即时状态变化和文字；
- 不改任何 JS 常量或 action；
- 普通模式和降动效模式跑同一 action trace，最终 public view 应相同。

## 13. 配置合同

```js
window.DUAL_MAZE_CONFIG = Object.freeze({
  defaultPlayerNames: Object.freeze(["玩家一", "玩家二"]),
  composeMatchNote(summary) {
    // 返回纯文本
  }
});
```

要求：

- 配置缺失、非对象或函数抛错时使用内置安全默认；
- 函数输入是深冻结的最终公开摘要；
- 返回值通过 `String()` 后按 code points 截断至 160；
- 只用 `textContent`；
- 配置不能替换 seed、HEATS、常量、积分或 winner；
- 默认配置匿名且无需编辑即可玩。

## 14. 本地合同与依赖

运行时禁止：

- 模块脚本、fetch、XHR、WebSocket、WebRTC；
- Worker、Service Worker；
- localStorage、sessionStorage、IndexedDB、Cookie、Cache API；
- 外部图片、字体、音频、统计；
- 麦克风、摄像头、定位、震动、文件系统；
- npm runtime dependency。

验收：

- 从作品目录双击 `index.html`，在 `file://` 完成四局；
- 页面加载后 DevTools Network 无远程请求；
- 禁网、刷新、图片阻断仍可开始新比赛；
- 将整个目录复制到另一文件夹后仍可直开；
- localhost 只用于自动化和补充浏览器验证，不是用户运行前提。

## 15. 测试 Gate

### 15.1 `maze.test.js`

必须覆盖：

- 同 seed 同 fingerprint；
- 两个冻结 seed 的完整 fingerprint 与三项指标；
- 81 节点、80 无向边、全连通、无环；
- passage 双向、不越界；
- 起终点与 BFS 路径连续；
- 非零 seed Gate；
- 邻居顺序漂移 fixture；
- 返回对象、数组不可由调用方改写；
- gold path 不进入生产 fixture 或 public view。

### 15.2 `logic.test.js`

必须覆盖：

- 初始状态与安全名字；
- 所有 phase 合法 / 非法转移；
- 队列上限 2、FIFO、每 tick 一项；
- 非法方向、playerId、phase 返回原引用；
- 合法移动、撞墙原地与 bump；
- 两人同 tick 原子移动；
- 单方抵达、双方同时抵达；
- 交换 action 顺序、玩家编号镜像后公平结果；
- RAF 分组无关：相同整数 tick action trace 得到相同结果；
- 4 局席位、map 配对、积分与整场平局；
- pause 清队列、不加 tick、resume 倒数；
- restart 保留名字和 maze、清空结果；
- 深冻结、不污染前态；
- public view 无队列、gold path 或 PRNG 状态；
- 左右 Board 共用同一 maze DTO 引用；
- `composeMatchNote` 不改变 winner。

### 15.3 浏览器

真实浏览器逐项验证：

- 名字输入与特殊字符安全；
- 单键和联合键检查；
- WASD / 方向键同时输入；
- 键盘 warning → 触控替代；
- 两个真实触点并发；
- 四局换席、两次同 seed；
- 同 tick 平局的可控 debug action trace；
- 撞墙、暂停、hidden、blur、pagehide、stalled；
- 继续后 45 tick 倒数且无 catch-up；
- 结果焦点、Tab / Enter / Space、status 不刷屏；
- 200% zoom、forced-colors、图片阻断；
- reduced motion 与普通模式规则一致；
- 四档视口；
- Console 无错误；
- Network 无远程请求；
- Storage 无新增；
- `file://` 手工完整四局；
- localhost 自动化完整四局。

### 15.4 仓库

```bash
node --test experiences/versus/dual-maze-race/maze.test.js
node --test experiences/versus/dual-maze-race/logic.test.js
npm test
npm run verify
git diff --check
```

若测试脚本采用 VM 加载经典脚本，测试装载方式不得反向要求生产改为 module。

## 16. 安全、隐私与故障

- 用户输入只作本地纯文本，不上传、不持久化；
- 不使用 `innerHTML` 投影名字或配置文案；
- malformed config 使用安全默认；
- reducer 对畸形 action 不抛出到 UI；
- render 异常不得继续后台 tick；app 应暂停并在 console 给出可诊断错误；
- 不创建“排行榜已保存”等虚假状态；
- 不把键盘漏报描述成玩家操作失误；
- 不把浏览器无法自动导航 `file://` 描述成产品不支持直开；
- 实际 bug 才写入 `bugs/`，实际可复用经验才写入 `learn/`。

## 17. 借鉴声明

本项目独立实现。调研只参考：

- Tarjan 的 DFS 图算法论文；
- Marsaglia 的 xorshift 论文；
- Moore 的迷宫最短路论文；
- W3C / WHATWG 的 UI Events、Pointer Events、计时、可见性、RAF、降动效与 WCAG；
- Microsoft 的 keyboard ghosting 硬件说明。

不得复制这些来源的文字、图、示例代码或软件实现。本轮没有参考外部开源迷宫项目。

如果实施阶段实际阅读或借鉴开源项目，写代码前必须在 `ATTRIBUTION.md` 增加固定仓库
URL、commit/tag、LICENSE 固定链接、许可证、版权人、借鉴内容和未复制范围；若引入
代码或素材，连同许可证正文、copyright 和 notice 一并保留。

## 18. 明确排除

- 不做不同陷阱、道具、随机事件；
- 不做隐藏地图、迷雾、秘密提示；
- 不做玩家碰撞、阻挡或改图；
- 不做长按连发、swipe、自动寻路；
- 不做一局制或隐藏 tie-break；
- 不做自定义 seed、难度、编辑器；
- 不做 AI、单人榜、在线房间、账号与存档；
- 不做 Gamepad、音频、震动或设备权限；
- 不在本规格阶段创建生产目录、UI、catalog、bug 或 learn。

## 19. Go / No-Go

实施可以开始，但安装结论仍为 **Conditional Go**。

转为 Go 的必要条件：

1. 生产同源生成器复现两个 seed 指标和冻结 fingerprint；
2. 两块盘共享同一 maze，public view 无答案泄漏；
3. 同 tick 与换席公平测试全部通过；
4. 键盘联合检查和真实双触控有浏览器证据；
5. 四档视口、键盘、焦点、降动效和暂停通过；
6. `file://` 完成四局，零远程请求、零存储；
7. 测试、仓库 verify、借鉴与文档合同通过。

任何一项无法证明时保持未安装；若同机输入或移动端双盘在目标设备上不可可信使用，
判 No-Go，不用增加功能掩盖。
