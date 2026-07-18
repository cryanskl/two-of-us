# A 级「光轨围猎」实现规格

> 状态：规则、数据、接口、交互与验收 Gate 冻结。来源与许可证见 [`75-light-trail-hunt-research.md`](./75-light-trail-hunt-research.md)。

## 1. 作品定义

「光轨围猎」是一款两人同机同时操作的短局轨迹对抗。双方光点持续前进，每个逻辑 tick 只能直行、左转或右转；走过的格子永久成为边界。最后存活者赢得本轮，同 tick 双亡则平局。

- 分类：`versus`；
- 目录：`experiences/versus/light-trail-hunt/`；
- 启动等级：A；
- 依赖：仅仓库共享运行时与浏览器原生 API；
- 网络、存储、摄像头、麦克风、定位：均不使用；
- 支持：`file://` 直接打开与仓库静态服务器打开；
- 比赛：最多三轮，先到 2 分提前获胜，三轮后允许总比分平局。

## 2. 文件边界

```text
experiences/versus/light-trail-hunt/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── board-texture.webp
    └── favicon.svg
```

- `config.js`：可编辑姓名、规则常量、允许文案和比赛结果文案组合；
- `logic.js`：无 DOM、无 Canvas、无时钟读取的纯状态机；
- `app.js`：输入队列、rAF 驱动、Canvas 渲染、阶段 DOM 与焦点管理；
- `logic.test.js`：碰撞向量、状态不变量、重放和时间切片测试；
- `ATTRIBUTION.md`：固定来源与零复制声明；
- `assets/`：仅放原创本地资产，不含远程字体或第三方素材。

## 3. 配置契约

页面加载 `config.js` 后读取：

```js
window.LIGHT_TRAIL_HUNT_CONFIG = {
  playerNames: ["小满", "阿昼"],
  grid: { columns: 48, rows: 32 },
  tickMs: 100,
  countdownMs: 2400,
  maxFrameGapMs: 500,
  maxRounds: 3,
  targetScore: 2,
  copy: {
    title: "光轨围猎",
    intro: "别追光，去改写它的边界。",
    start: "开始围猎",
    nextRound: "下一轮",
    restart: "重新比赛"
  }
};
```

### 3.1 校验与回退

- 姓名 `trim()` 后为空则分别回退为“玩家 1”“玩家 2”；
- 姓名最多保留 12 个 Unicode code point；
- 所有姓名和配置文案只使用 `textContent`；
- 棋盘尺寸必须是整数，且至少 `12 × 8`；
- `tickMs` 限定在 `60…250`；
- `countdownMs` 限定在 `0…5000`；
- `maxRounds` 固定为 3，`targetScore` 固定为 2；
- 非法值回退到上述默认值，不抛出阻断页面的错误。

实现时在 `config.js` 保留一个 5–10 行的 `composeMatchResult(view)` TODO，作为用户可亲自完成的文案组合小任务；缺省实现必须先可运行，TODO 不能阻塞作品。

## 4. 权威状态

### 4.1 公共状态

```js
{
  phase: "ready" | "countdown" | "playing" | "paused" | "round-end" | "match-end",
  playerNames: [string, string],
  rounds: [
    {
      spawnVariant: 0 | 1,
      ticks: [{ turns: [-1 | 0 | 1, -1 | 0 | 1] }]
    }
  ],
  countdownMs: number,
  pauseReason: null | "manual" | "hidden" | "blur" | "stalled",
  resumePhase: null | "countdown" | "playing",
  revision: number
}
```

约束：

- 所有公共对象和数组在开发环境测试中可递归冻结；
- reducer 不原地修改传入状态；
- 公共状态不暴露 `Uint8Array`、`Set`、`Map` 或 Canvas 对象；
- `revision` 只在有效状态变化时加一；
- 最多保存三轮，每轮在结束后不可继续追加 tick；
- `countdownMs` 是整数，最小为 0；
- `paused` 必须保留 `resumePhase`，其他阶段该字段为 `null`。

### 4.2 派生回放

`replayRound(round, rules)` 从出生点和 tick 日志生成只读派生结果：

```js
{
  tick,
  occupiedCells: [{ x, y, owner }],
  players: [{ x, y, direction, alive, marker }],
  outcome: null | {
    type: "winner" | "draw",
    winner: 0 | 1 | null,
    tick,
    attempts: [{ x, y }, { x, y }],
    reasons: [CollisionReason[], CollisionReason[]]
  }
}
```

`CollisionReason` 只允许：

```text
wall | own-trail | rival-trail | same-destination | head-swap
```

`occupiedCells` 是派生快照。调用方修改返回数组不得影响权威状态或下一次回放。

## 5. 纯逻辑 API

`logic.js` 以浏览器全局和 CommonJS 双入口暴露同一 API：

```js
createMatchState(rawConfig)
startMatch(state)
advanceCountdown(state, elapsedMs)
stepRound(state, { turns })
pauseMatch(state, reason)
resumeMatch(state)
nextRound(state)
restartMatch(state)
replayRound(round, rules)
getView(state)
classifyTurnCode(code)
```

### 5.1 `createMatchState`

- 清洗配置并创建 `ready` 状态；
- `rounds` 为空，分数为派生值；
- 不读取 DOM、时间、随机数或浏览器尺寸。

### 5.2 `startMatch`

- 仅 `ready` 和 `match-end` 可进入新比赛；
- 创建第 1 轮空 tick 日志，`spawnVariant = 0`；
- `countdownMs` 设为配置值；
- 配置倒计时为 0 时直接进入 `playing`；
- 其他阶段调用返回原状态引用。

### 5.3 `advanceCountdown`

- 仅 `countdown` 有效；
- `elapsedMs` 先转为非负整数；
- 扣至 0 时进入 `playing`；
- 不能在一次调用中顺带推进游戏 tick。

### 5.4 `stepRound`

- 仅 `playing` 有效；
- `turns` 必须归一化为两项 `-1 | 0 | 1`；
- 将一对意图作为一个不可拆分 tick 追加到当前轮；
- 由 `replayRound` 判定这一 tick 是否结束本轮；
- 结束时进入 `round-end` 或 `match-end`；
- 结束后的重复调用返回原状态引用。

### 5.5 暂停与恢复

- `pauseMatch` 只暂停 `countdown` 或 `playing`；
- 记录 `pauseReason` 与原阶段；
- 已暂停时再次暂停不覆盖首次原因；
- `resumeMatch` 回到 `resumePhase`，清空原因；
- 驱动层恢复时必须清空 accumulator 和 pending turns。

### 5.6 下一轮与重赛

- `nextRound` 仅在 `round-end` 有效；
- 比赛未结束且轮数少于 3 时创建新轮；
- 新轮 `spawnVariant = previous.spawnVariant === 0 ? 1 : 0`；
- `restartMatch` 从任意阶段返回全新 `ready` 状态并清空历史；
- 轮次比分全部从完成的 round outcome 派生，不单独维护可漂移的 `scores` 字段。

### 5.7 键位分类

```text
KeyA       -> { player: 0, turn: -1 }
KeyD       -> { player: 0, turn:  1 }
ArrowLeft  -> { player: 1, turn: -1 }
ArrowRight -> { player: 1, turn:  1 }
KeyJ       -> { player: 1, turn: -1 }
KeyL       -> { player: 1, turn:  1 }
other      -> null
```

`classifyTurnCode` 不处理 `event.repeat` 和 `preventDefault()`；这些属于 app 层。

## 6. 单 tick 形式化算法

设旧玩家为 `P0`、`P1`，输入为 `t0`、`t1`：

1. 分别把相对转向作用于旧方向，得到 `d0`、`d1`；
2. 从旧头部计算 `n0`、`n1`；
3. 不修改占用格，分别收集：越界、自己的旧轨、对方的旧轨；
4. 若 `n0 === n1`，双方追加 `same-destination`；
5. 若 `n0 === old(P1)` 且 `n1 === old(P0)`，双方追加 `head-swap`；
6. 任一方原因非空即死亡；
7. 仅一方死亡则另一方获胜，双方死亡则平局；
8. fatal tick 记录双方尝试位置与完整原因，但不提交任何新占用格；
9. 仅当双方均安全时同时提交两个新头部格。

死亡原因数组按以下固定顺序输出，保证快照稳定：

```text
wall -> own-trail -> rival-trail -> same-destination -> head-swap
```

## 7. 驱动层契约

### 7.1 rAF 与 accumulator

- `requestAnimationFrame` 只负责取时间和绘制；
- accumulator 累加有效帧间隔；
- 每满 `tickMs` 调一次 `stepRound`；
- 单帧最多推进 5 tick，超过时不追赶并进入 `stalled` 暂停；
- 帧间隔大于 `maxFrameGapMs` 直接暂停；
- `visibilitychange=hidden` 与 `blur` 自动暂停；
- 恢复后重新设定上一帧时间，清空 accumulator。

### 7.2 输入队列

app 层维护：

```js
pendingTurns = [0, 0];
```

- `queueTurn(player, turn)` 只在 `playing` 写入；
- 同玩家 tick 前的最后一次有效意图覆盖前一次；
- 一个 tick 开始时复制两项并立即清零；
- 键盘和 Pointer 按钮必须调用同一入口；
- `keydown.repeat`、结束阶段和暂停阶段输入均忽略；
- `Escape` 不进入转向队列。

## 8. 视图模型与阶段 DOM

`getView(state)` 至少返回：

```js
{
  phase,
  title,
  playerNames,
  scores,
  roundNumber,
  maxRounds,
  countdownLabel,
  statusLabel,
  outcome,
  canStart,
  canPause,
  canResume,
  canNextRound,
  canRestart,
  board
}
```

页面不是一张永远不变的 Canvas：

- `ready`：标题、短规则、键位说明、开始按钮；
- `countdown`：棋盘已显示出生点，DOM 显示 3/2/1；
- `playing`：比分、轮次、状态、Canvas、四个触控按钮和暂停按钮；
- `paused`：阶段内暂停面板，说明原因并提供恢复；
- `round-end`：DOM 结果标题、碰撞说明、比分和下一轮；
- `match-end`：DOM 比赛结果、最终比分和重新比赛。

重要文案必须是真实 DOM，可复制、可聚焦、可被辅助技术读取；Canvas 只承载赛场。

## 9. 视觉规格

最终视觉以 ImageGen 概念稿为准，但先冻结以下边界：

- 主意象：午夜制图桌上的发光轨迹图，而不是电影式霓虹摩托；
- 背景：深靛蓝绘图纸、细坐标网格和低对比纸张纹理；
- 玩家 1：青绿色光墨，圆形或带缺口圆形头部；
- 玩家 2：暖琥珀 / 珊瑚光墨，菱形头部；
- 两条轨迹必须在颜色之外使用不同端点形状和细微纹理；
- 禁止 TRON 标识、电影车辆轮廓、网格地平线和通用 synthwave 紫粉渐变；
- 标题不使用 eyebrow、胶囊标签或堆叠营销卡片；
- 动效围绕“墨迹推进”和“碰撞震点”，不做持续全屏发光脉冲。

### 9.1 响应式

- 桌面 `1504 × 1046`：棋盘约 `900 × 600px`，信息与控制在左右或上下形成清楚主次；
- 手机 `390 × 844`：棋盘约 `366 × 244px`，四按钮 56px；
- 窄屏 `320 × 700`：棋盘约 `296 × 197px`，四按钮至少 48px；
- Canvas 始终保持 `3:2`；
- 禁止横向滚动；
- 结果层不能覆盖下一轮或重赛按钮。

## 10. 测试规格

### 10.1 纯逻辑测试

至少覆盖：

1. 默认配置与非法配置回退；
2. 六个键位与未知键；
3. 安全前进；
4. 单方撞墙；
5. 双方撞墙；
6. 自己旧轨；
7. 对方旧轨；
8. 同格相撞；
9. 交换头部；
10. 不同原因同 tick 双亡；
11. 多原因固定排序；
12. fatal tick 不半提交；
13. 同 tick 最后意图；
14. 玩家输入顺序无关；
15. 玩家镜像公平；
16. 暂停、恢复和无效阶段幂等；
17. 倒计时不会顺带推进游戏；
18. 下一轮保留比分并切换出生变体；
19. 先到 2 分提前结束；
20. 三轮后比赛平局；
21. 重赛清空历史；
22. 同日志重放一致；
23. 返回视图被外部修改不污染权威状态；
24. 状态不包含可变 typed array / Set / Map。

### 10.2 目录契约

catalog 条目必须声明：

- `id: "light-trail-hunt"`；
- `category: "versus"`；
- `launchTier: "A"`；
- `inputModes` 包含 `keyboard` 与 `pointer`；
- `capabilities` 为空；
- `networkRequired: false`；
- `storage: "none"`；
- `attribution` 指向作品内 `ATTRIBUTION.md`。

### 10.3 浏览器 Gate

- `file://` 真机直开；
- 1504×1046、390×844、320×700 三档；
- console error 0、page error 0、外部请求 0；
- 键盘完成至少一轮；
- 两个 pointerId 同 tick 输入；
- 暂停、隐藏、恢复、下一轮、重赛；
- 同格、换位、单方撞墙和不同原因双亡；
- reduced motion 不改变状态；
- 长姓名和脚本字符串按纯文本显示；
- 截图对照设计稿并记录 5 项以上 fidelity ledger。

## 11. 借鉴声明

作品 README 使用简版声明；`ATTRIBUTION.md` 使用调研文档第 9 节的完整版，并包含固定提交与许可链接。声明必须明确：

- 只研究经典 light-cycle / trail-survival 抽象机制与工程取舍；
- 未复制参考项目代码、素材、声音、字体、模型或依赖；
- 状态机、同时结算、文案、视觉、测试和本地资产均为原创；
- 参考项目作者未参与也未认可本作品。

## 12. 完成定义

只有同时满足以下条件，才可把 V01 从创意池标记为已实现：

- 规格中的 API、规则和阶段全部落地；
- 纯逻辑、全仓与 catalog 测试通过；
- 三档浏览器 Gate 通过；
- `file://` 无外部请求；
- 调研来源和借鉴声明完整；
- 发现的 bug 已写入 `bugs/`；
- 可复用知识已写入 `learn/`；
- 每个完成部分已有独立提交；
- backlog、目录、根 README 和 docs 索引同步完成。
