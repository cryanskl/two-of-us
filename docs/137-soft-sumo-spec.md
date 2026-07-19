# A 级“软软相扑”可执行规格

- 日期：2026-07-19
- 工作 ID：`soft-sumo`
- 分类：`versus`
- 启动等级：A
- 对应调研：[136-soft-sumo-research.md](./136-soft-sumo-research.md)
- 运行边界：经典脚本、相对路径、零运行依赖、零网络、零存储、零音频、零随机

## 1. 交付定义

在 `experiences/versus/soft-sumo/` 新增同屏双人对抗作品“软软相扑”。两位玩家各控制一枚圆形物理碰撞体、圆角软垫视觉棋子：左右旋转瞄准，按住中键蓄力，松开沿当前方向冲刺。双方只能通过冲刺和碰撞把对方推出持续收缩的圆形擂台。

比赛固定三轮；单方出界时另一方得 1 分，同一逻辑 tick 双方出界则本轮平局、双方不得分；三轮后比较总分，可以产生玩家胜利或平局。

本规格不允许首版加入：持续行走、跳跃、攻击、生命值、角色差异、随机道具、电脑玩家、局域网、公网、音效、振动、难度选择、参数设置、排行榜、战绩存储、回放 UI、关卡选择、皮肤商城或分享。

## 2. 文件与全局接口

```text
experiences/versus/soft-sumo/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── soft-sumo-arena.<production-format>
    ├── soft-sumo-tokens.png
    └── favicon.svg
```

脚本顺序严格为：

```html
<script src="config.js"></script>
<script src="logic.js"></script>
<script src="app.js"></script>
```

### `config.js`

UMD 全局：`window.SoftSumoConfig`；CommonJS 出口：

```text
DEFAULT_CONFIG
composeMatchNote(summary)
```

### `logic.js`

UMD 全局：`window.SoftSumoLogic`；CommonJS 出口至少包含：

```text
VERSION
TICK_RATE
PHASES
PAUSE_REASONS
ACTION_TYPES
RULES
DIRECTION_VECTORS
DEFAULT_CONFIG
sanitizeConfig(rawConfig, composeStrategy?)
createInitialState(rawConfig?)
reduceSoftSumo(state, action)
assertState(state)
getSoftSumoView(state)
resolveMatchNote(state, rawConfig?)
deriveArenaRadius(roundTick)
deriveSpawn(spawnVariant)
simulateRoundTick(roundState, inputs)
resolvePlayerCollision(players)
replayRound(inputLog, spawnVariant)
replaySession(log)
deepFreeze(value)
```

不得把 DOM、`requestAnimationFrame`、`performance.now()`、`Date`、随机、媒体查询或浏览器事件放进 `logic.js`。

## 3. 冻结常量

```text
VERSION = 1
TICK_RATE = 60
ROUND_COUNT = 3
VECTOR_SCALE = 4096
DIRECTION_COUNT = 64
PLAYER_RADIUS = 48
SPAWN_DISTANCE = 220
ARENA_START_RADIUS = 430
ARENA_MIN_RADIUS = 270
SHRINK_GRACE_TICKS = 480
SHRINK_END_TICKS = 2700
MAX_CHARGE_TICKS = 54
DASH_COOLDOWN_TICKS = 39
COUNTDOWN_TICKS = 150
RESUME_COUNTDOWN_TICKS = 90
MAX_CATCH_UP_TICKS = 5
MAX_FRAME_GAP_MS = 500
MIN_DASH_IMPULSE = 8
MAX_DASH_IMPULSE = 22
MAX_SPEED = 28
DRAG_NUMERATOR = 940
DRAG_DENOMINATOR = 1000
RESTITUTION_NUMERATOR = 1
RESTITUTION_DENOMINATOR = 4
MAX_COLLISION_CORRECTION_PASSES = 4
SPAWN_VARIANTS = [0, 16, 8]
```

所有位置、速度、charge、cooldown、tick、angle index、得分和 revision 都是整数。运行时不保存弧度或浮点权威角度。

## 4. 64 档方向表

`DIRECTION_VECTORS` 是长度 64 的递归冻结数组，每项严格为：

```text
{ x: integer, y: integer }
```

索引语义：

- `0`：向右；
- `16`：向下；
- `32`：向左；
- `48`：向上；
- 索引递增为顺时针；
- `vector[i + 32]` 必须严格等于 `-vector[i]`；
- 轴向长度精确为 `VECTOR_SCALE`；
- 其余向量的平方长度与 `VECTOR_SCALE²` 的误差不得超过冻结容差；
- 表在源码中固定，不能每局重新生成，也不能依赖 viewport 或 DPR。

转向：每个 playing tick 将 `aimIndex` 加上 `turn` 后模 64。`turn = -1` 逆时针，`0` 不变，`1` 顺时针。两个玩家使用同一公式。

## 5. 擂台半径

```text
deriveArenaRadius(tick):
  tick <= SHRINK_GRACE_TICKS -> ARENA_START_RADIUS
  tick >= SHRINK_END_TICKS   -> ARENA_MIN_RADIUS
  otherwise:
    ARENA_START_RADIUS
      - floor(
          (ARENA_START_RADIUS - ARENA_MIN_RADIUS)
          * (tick - SHRINK_GRACE_TICKS)
          / (SHRINK_END_TICKS - SHRINK_GRACE_TICKS)
        )
```

输入必须是非负整数；非法值抛出 `TypeError` / `RangeError`。半径随 tick 单调不增，恰在 `SHRINK_END_TICKS` 达到最小值，之后永不继续缩小。

出界判定：

```text
integerSqrt(x*x + y*y) + PLAYER_RADIUS > arenaRadius
```

严格大于才出界；等于边界仍在场内。两位玩家使用同一个 tick 派生的半径快照。

## 6. 三个确定出生轴

`deriveSpawn(spawnVariant)` 只接受 `0 / 1 / 2`，分别使用 `SPAWN_VARIANTS` 中的方向索引。

若本轮轴索引为 `a`：

```text
player 0 position = direction[a + 32] * SPAWN_DISTANCE
player 0 aim      = a
player 1 position = direction[a] * SPAWN_DISTANCE
player 1 aim      = a + 32
```

位置乘法按 `VECTOR_SCALE` 做明确四舍五入到整数。两枚棋子朝向圆心，速度、charge、cooldown 与上一接触法线全部归零。

三轮依次使用水平、垂直、对角出生轴。所有场景和碰撞规则保持径向对称；出生轴只增加视觉与测试覆盖，不引入随机或地形优势。

## 7. 配置与准备者策略

默认配置：

```text
playerNames = ["莓果", "海盐"]
copy.title = "软软相扑"
copy.subtitle = "推我可以，先站稳自己。"
copy.rule = "转向，按住，松开冲出去。"
copy.start = "开始第一轮"
copy.resume = "继续比赛"
copy.nextRound = "下一轮"
copy.restart = "再推一局"
copy.localOnly = "只在本机运行，刷新即重置。"
```

长度上限：玩家名 12 code points；title 24；subtitle 48；rule 48；动作 16；localOnly 48；最终 note 120。

`sanitizeConfig` 逐字段读取、trim、按 Unicode code point 判限并安全回退；异常 getter、Proxy 抛错、thenable、数组伪装、空白、非字符串和超长均不能逃逸。结果递归冻结并与输入断开引用。

`composeMatchNote(summary)` 的 summary 严格为：

```text
{
  playerNames,
  scores,
  rounds,
  winnerIndex,
  isDraw,
  defaultNote
}
```

summary 递归冻结，不含坐标、速度、输入日志、frame time、内部 state 或函数。合法返回必须是非空、trim 后不超过 120 code points 的字符串；异常、修改 summary、Promise/thenable、空白、非字符串或超长均回退 `defaultNote`。

默认结语：

- 玩家胜利：`这局，{name} 站得更稳。下一局也别手软。`
- 平局：`一起出圈，也算默契。下一局再站稳一点。`

## 8. phase 与 action

### phase

```text
intro
countdown
playing
paused
round-result
match-result
```

### action 精确 schema

```text
{ type: "START" }
{ type: "STEP", inputs: [input0, input1] }
{ type: "PAUSE", reason: "manual" | "hidden" | "blur" | "stalled" }
{ type: "RESUME" }
{ type: "NEXT_ROUND" }
{ type: "RESTART" }
```

input 精确为：

```text
{ turn: -1 | 0 | 1, charging: boolean }
```

额外字段、缺字段、访问器属性、错误原型、数组/函数/thenable、非法枚举和非布尔 charging 全部视为非法 action；合法 state 上必须返回原引用。

### 允许转移

```text
intro --START--> countdown
countdown --STEP--> countdown | playing
countdown/playing --PAUSE--> paused
paused --RESUME--> countdown
playing --STEP(outcome)--> round-result | match-result
round-result --NEXT_ROUND--> countdown
match-result --RESTART--> intro
```

`START` 初始化第 1 轮、spawn variant 0、150 tick 倒数。countdown 的 STEP 仍要求合法 inputs，但完全忽略其值并逐 tick 递减；进入 playing 的同一 STEP 不执行物理，防止提前蓄力。

`PAUSE` 对两位玩家应用同一个 `cancelChargeState`：只把 `chargeTicks` 归零、把 `wasCharging` 设为 false；`cooldownTicks` 不变。位置、速度、aim、round tick、得分和日志全部保留。`RESUME` 进入 90 tick 倒数，倒数结束后才继续原位置比赛。

第 3 轮结束直接进入 match-result。NEXT_ROUND 不得在 match-result 生效。RESTART 只在 match-result 生效并保留已清洗配置。

## 9. state 精确结构

```text
{
  phase,
  playerNames: [string, string],
  copy: {
    title, subtitle, rule,
    start, resume, nextRound, restart,
    localOnly
  },
  roundIndex,
  roundTick,
  countdownTicks,
  spawnVariant,
  players: [body0, body1],
  scores: [integer, integer],
  completedRounds: [roundResult...],
  currentInputLog: [inputPair...],
  pauseReason,
  revision
}
```

body：

```text
{
  seat: 0 | 1,
  x, y,
  vx, vy,
  aimIndex,
  chargeTicks,
  wasCharging,
  cooldownTicks,
  lastNormalIndex
}
```

roundResult：

```text
{
  roundIndex,
  spawnVariant,
  winnerIndex: 0 | 1 | null,
  reason: "player-0-out" | "player-1-out" | "double-out",
  ticks,
  inputLog
}
```

inputPair 是两个冻结 input 的冻结数组。

### phase 不变量

- intro：roundIndex 0、roundTick/countdown 0、默认 spawn、初始 players、分数 0–0、无轮次和日志；
- countdown：roundIndex 0–2、countdown 1..150、当前轮 players 合法、pauseReason null；
- playing：countdown 0、pauseReason null；
- paused：countdown 0、pauseReason 为合法枚举；
- round-result：completedRounds 长度 = roundIndex + 1 且小于 3，currentInputLog 空；
- match-result：completedRounds 恰好 3，currentInputLog 空，scores 可完全由三轮 winner 派生；
- 所有阶段 players 数组顺序固定为 seat 0 / seat 1；
- `roundTick === currentInputLog.length` 仅在 countdown/playing/paused；
- scores 等于 completedRounds 中各 winner 次数，round-result/match-result 不接受调用方直接写分数；
- state、copy、body、日志、轮次和字符串数组递归冻结。

`assertState` 对 JSON 往返状态执行完整严格验证，包括从每轮 inputLog 重放并核对 winner/reason/ticks、从 completedRounds 重算 score、从 currentInputLog 重放核对 players/roundTick。校验 paused，或 `roundTick > 0` 的恢复 countdown 时，先对重放所得 players 应用与 `PAUSE` 完全相同的 `cancelChargeState`，再比较 players；这一步只取消 charge/wasCharging，不能改 cooldown、位置或速度。正常 reducer 可对内部已验证冻结 state 使用可信快路径，但不能因此接受伪造外部对象。

## 10. STEP：瞄准、蓄力与冲刺

对两位玩家先计算全部输入派生，再统一应用冲量。

### cooldown

每 tick 开头：

```text
cooldownTicks = max(0, cooldownTicks - 1)
```

cooldown 大于 0 时不增加 charge；瞄准仍可旋转。

### charge

- `charging=true` 且 cooldown 为 0：`chargeTicks = min(MAX_CHARGE_TICKS, chargeTicks + 1)`，`wasCharging=true`；
- `charging=false` 且 `wasCharging=false`：charge 保持 0；
- `charging=false` 且 `wasCharging=true`：产生一次 release，随后 charge=0、wasCharging=false、cooldown=39；
- pause、round result、next round、match result、restart 都不能保留 wasCharging；
- charging 在 cooldown 期间保持按下，cooldown 归零后可开始新的 charge，但不会自动产生 release。

### impulse

```text
ratioNumerator = chargeTicks
ratioDenominator = MAX_CHARGE_TICKS
smoothNumerator = ratio² * (3*denominator - 2*ratio)
impulse = MIN_DASH_IMPULSE
  + round(
      (MAX_DASH_IMPULSE - MIN_DASH_IMPULSE)
      * smoothNumerator
      / denominator³
    )
```

charge 1 tick 也产生最小冲量；满 charge 恰为最大冲量。用 aim 方向整数向量把 impulse 分配到 vx/vy；双方使用同一舍入函数。施加后每轴 clamp 到 `[-MAX_SPEED, MAX_SPEED]`。

## 11. 阻尼与积分

```text
vx = roundTowardZero(vx * DRAG_NUMERATOR / DRAG_DENOMINATOR)
vy = roundTowardZero(vy * DRAG_NUMERATOR / DRAG_DENOMINATOR)
x += vx
y += vy
```

绝对值小于 1 的速度归零。双方先完成阻尼和候选积分，再把两个候选 body 一起交给碰撞求解；不能先完整推进 player 0 再推进 player 1。

## 12. 碰撞求解

### 12.1 法线

从 seat 0 指向 seat 1 的中心差 `(dx,dy)` 与 64 个方向向量做整数点积，选择最大值；同值选择较小索引。若中心完全重合，使用双方 `lastNormalIndex` 中一致的上一非零法线；仍无可用值则固定为 index 0。

返回 players 始终按 seat 排序。交换函数输入顺序不改变结果。

### 12.2 位置纠正

若 `distanceSquared >= (2R)²`，不纠正。否则用纯整数平方根得到 distance，计算：

```text
penetration = 2R - distance
correction = ceil(penetration / 2) + 1
```

seat 0 沿法线反向移动 correction，seat 1 沿法线正向移动 correction；两个位移大小严格相同。最多重复 4 次，直到不重叠。若达到上限仍重叠，返回最后有限状态并由 assert/test 报告；不得随机抛开、设 NaN 或只移动一方。

位置纠正不修改 vx/vy。

### 12.3 速度冲量

在位置纠正使用的同一法线上计算：

```text
relativeNormal = dot(v1 - v0, normal) / VECTOR_SCALE
```

`relativeNormal >= 0` 表示分离，不施加冲量。否则：

```text
j = -relativeNormal
    * (RESTITUTION_DENOMINATOR + RESTITUTION_NUMERATOR)
    / (2 * RESTITUTION_DENOMINATOR)
```

按统一舍入得到整数 j；seat 0 减去 `j*normal`，seat 1 加上相同向量。两方最终速度再次 clamp。切向速度保持不变。

冲量只求解一次，不循环堆叠能量；位置纠正 pass 与速度冲量 pass 必须分离。

## 13. 原子出界与轮次结算

碰撞完成后，同时计算：

```text
out0 = isOutside(players[0], arenaRadius)
out1 = isOutside(players[1], arenaRadius)
```

结算表：

| out0 | out1 | 结果 |
| --- | --- | --- |
| false | false | 继续 playing |
| true | false | winner 1，reason `player-0-out` |
| false | true | winner 0，reason `player-1-out` |
| true | true | winner null，reason `double-out` |

完成 tick 的规范化 input 仍进入 inputLog，roundResult.ticks 与日志长度一致。单方胜者得 1 分；double-out 不得分。

## 14. 回放合同

`replayRound(inputLog, spawnVariant)`：

1. 从对应 spawn 创建纯 round 初态；
2. 对每个 inputPair 严格调用同一 `simulateRoundTick`；
3. outcome 后仍有日志条目则拒绝；
4. 返回 `{players, roundTick, arenaRadius, outcome}` 的冻结副本。

`replaySession(log)` 的 log：

```text
{
  config,
  actions
}
```

只允许 START、STEP、PAUSE、RESUME、NEXT_ROUND、RESTART 的精确 action；深克隆、JSON 往返与原日志重放必须得到深相等状态，且原日志不被修改。

## 15. public view

`getSoftSumoView(state)` 返回递归冻结、断开引用的代码原生 UI 数据：

```text
phase
title, subtitle, rule
playerNames
scores
roundNumber, roundCount
countdownLabel | null
arenaRadius, arenaRatio
players[] = {
  seat, x, y, aimIndex,
  chargeRatio, cooldownRatio,
  canTurn, canCharge,
  patternLabel
}
status
result | null
canStart, canPause, canResume, canNextRound, canRestart
```

不得返回：vx/vy、inputLog、raw config、compose function、frame accumulator、pause generation、碰撞法线、调试 hash、DOM 节点或事件对象。

position 和 aim 是可见玩法信息，可以公开。UI 将逻辑坐标映射到 board CSS 坐标；映射只影响渲染，不影响 reducer。

## 16. UI 与焦点合同

- intro：焦点在 H1 后的“开始第一轮”；
- countdown：焦点移到 arena heading，不允许双方按钮响应；
- playing：开始时焦点落到上次输入方式对应的第一控制；触屏不强制抢焦点；
- paused：显示一个对话式单容器，焦点落到“继续比赛”；背景控制从 DOM 移除或 inert；
- round-result：焦点落到结果 H2，“下一轮”为唯一主动作；
- match-result：焦点落到赛果 H2，“再推一局”为唯一主动作；
- 控制按钮是原生 button，玩家 0/1 各自一组“逆时针 / 蓄力冲刺 / 顺时针”；
- 蓄力按钮 accessible name 随状态为“莓果，按住蓄力”或“莓果，松开冲刺”；
- 页面持久包含视觉隐藏 `role=status`、`aria-live=polite`、`aria-atomic=true`；
- live region 不逐 tick、逐角度或逐百分比播报。

## 17. 浏览器输入适配器

### 键盘

```text
player 0: KeyA / KeyW / KeyD
player 1: ArrowLeft / ArrowUp / ArrowRight
```

held set 只保存 code；每 tick 规范化为两个 input。相反转向同时按下时 turn=0。`event.repeat` 不产生离散冲刺，因为冲刺只由 fixed tick 中 charging 的 true→false 边沿产生。

只在 phase 为 countdown/playing 且 code 属于上述六键时阻止默认行为。keyup、blur、hidden、pause、round end、match end 与 restart 都清理 held set。

### pointer

每个控制 button 最多拥有一个 active pointerId；一个 pointerId 不能同时归属两个控制。成功 pointerdown 后 capture；up/cancel/lostcapture 统一释放。第三指不替换既有 pointer。鼠标离开仍由 capture 收到释放。

多指状态在每 tick 转为同一 inputs；app 不直接修改 body、charge 或 velocity。

## 18. rAF 与安全暂停

UI 保存：

```text
lastFrameTime
accumulatorMs
held inputs
inputGeneration
```

- frame gap 大于 500ms：不追赶，清 accumulator，派发 `{type:"PAUSE",reason:"stalled"}`；
- 正常帧：累加 delta，每消费 `1000/60` 派发一个 STEP，单帧最多 5 次；
- 达到 5 次仍有完整 tick：清 accumulator 并安全暂停；
- hidden/blur：先清 held，再暂停；
- RESUME：清 frame time/accumulator，90 tick 倒数后继续；
- reduced-motion 不改变上述调度。

## 19. 视觉与资产前置要求

编码前必须生成并冻结：

1. 桌面 playing 完整概念：标题、三轮比分、圆形擂台、两枚软垫棋子、aim、charge、双方三键控制和暂停；
2. 390×844 移动 playing 概念：完整擂台和两组控制无重叠；
3. 桌面 match-result 完整概念：保留擂台余韵、赛果、三轮摘要与唯一重开动作；
4. 生产背景：不含棋子、分数、文案、按钮或交互热区的圆形织物擂台/桌面场景；
5. 两色棋子状态图集：idle / charging / dash，纯色键源图后本地去背；所有玩家名、编号、aim、charge、状态保持代码原生。

视觉方向：深夜客厅地毯上的小型软垫竞技场；墨绿或深蓝地面，黄铜/奶白边线，珊瑚与海盐两枚圆角织物棋子。不是日式相扑人物、商业派对游戏、霓虹赛博擂台或默认 Canvas 圆形。

图片失效时用 CSS 纯色圆、编号、纹样、粗边和 aim 箭头继续完整游玩。CSS fallback 与图片正常态必须互斥，避免透明 sprite 下方双重渲染。

## 20. 响应式

### 1280×800

- 标题/规则和比分为安静横栏；
- arena 最大边长约 560–620px；
- 双方控制分列 arena 左右或下方两端；
- intro、playing、round-result、match-result 的唯一主动作均在首屏；
- 页面无横向或纵向溢出。

### 768×1024

- arena 居中，控制在下方双列；
- 三轮比分不拆成卡片；
- arena 与全部控制首屏可见。

### 390×844

- header 仍显示 H1、当前轮与 0–0；
- arena 尺寸不超过可用宽度；
- 两组控制上下或左右对称排列，蓄力键至少 64px，转向键至少 48px；
- 不使用固定底栏遮住 arena；
- 允许结果摘要在文档流中轻微滚动，不横向溢出。

### 320×700

- 允许纵向滚动；
- arena、当前状态和双方控制仍按阅读顺序可达；
- 不因高度不足缩小触控目标；
- focus ring 不被 overflow 裁切。

## 21. 无障碍与降级

- 双方同时使用颜色、`01 / 02`、玩家名和不同织物纹样；
- arena 边界同时使用粗线、内外纹理差与状态文字；
- charge/cooldown 有文字与进度，不只靠颜色；
- aim 箭头是 CSS/SVG 装饰，accessible name 在控制和状态文字中说明；
- `prefers-reduced-motion: reduce` 取消拖尾、震屏、粒子、脉冲、结果上移和 sprite 过渡；玩法位移保持即时；
- forced-colors 下隐藏图片纹理，使用系统 Canvas/CanvasText/ButtonText/Highlight、2px 以上边框、编号和图案；
- 背景或图集失败不改变 DOM、按钮、碰撞、比分、焦点或重开；
- no-JS 提示说明需启用 JavaScript，不伪装可玩。

## 22. 来源声明合同

README 必须有精确标题 `## 借鉴与来源声明` 并链接 `ATTRIBUTION.md`。

ATTRIBUTION 必须固定：

1. Robot Sumo commit `b10f099...`、MIT、权利主体和只研究的机制；
2. Matter.js 0.20.0 commit `8a677...`、MIT、权利主体和未引入引擎；
3. Box2D-Lite commit `227b71...`、MIT、权利主体和未移植源码；
4. Pointer Events、UI Events、WHATWG、Media Queries、WCAG/CSS Color Adjustment 的行为边界；
5. SumoBall commit `f5c714...` 无许可证、字体/音频来源不明的排除原因；
6. 本作软垫主题、三键控制、三轮、缩圈、物理、测试、UI、文案和素材均独立原创；
7. ImageGen 概念、生产背景、色键图集、去背命令、尺寸与哈希；
8. 零代码/资产复制；若未来实质复制必须附完整许可证并修订声明。

## 23. 逻辑测试矩阵

### 常量、配置与冻结

- 全部出口、常量、枚举、方向表、默认配置与 Unicode 上限；
- UMD/CommonJS 一致、递归冻结、断开引用、异常 getter/Proxy/thenable；
- compose summary 精确字段、冻结、正常/异常/空白/超长/修改输入回退。

### 状态与 action

- 初态、START、countdown 150 tick、playing、pause/resume 90 tick、next round、三轮 match、restart；
- 每个 phase 的错阶段 action、额外字段、缺字段、原型伪造与畸形 state；
- scores/rounds/log/player/revision 不变量和 JSON 往返。

### 瞄准、charge、cooldown

- 64 次 turn 回到原方向，正反转对称；
- 相反键 turn=0 由 app 输入测试覆盖；
- 1 / 27 / 54 / 55 tick charge，松开仅一次 impulse；
- cooldown 38/39/40 边界、cooldown 内持续按住、pause 取消 charge；
- impulse 单调、端点精确、所有方向模长误差在容差内。

### 物理性质

- 静止分离、相向对撞、同向追尾、已分离不冲量、边相切；
- 完全重叠 fallback、上一法线、最大速度 clamp；
- 位置纠正不改速度，冲量总法向动量对称；
- 输入 players 顺序交换、坐标镜像、速度取反后得到身份交换结果；
- 1–4 correction pass 后无正重叠、无 NaN/Infinity。

### 缩圈与出界

- tick 0、grace-1、grace、grace+1、end-1、end、end+1；
- radius 单调、最小值保持；
- 玩家边缘等于圈、超 1、单方 0/1 出界和 double-out；
- outcome tick 进入日志，之后 STEP 幂等。

### 回放与公平

- 三段 golden replay：player 0 胜、player 1 胜、double-out；
- 完整三轮覆盖 3–0、2–1、1–1（含平局轮）、0–0 三轮平局；
- 相同输入日志、深克隆、JSON 往返、30/60/120/144Hz 调度产生深相等结果；
- reduced-motion 标志不进入 logic，交换玩家/镜像输入只交换身份。

## 24. 静态与浏览器 Gate

1. `file://` 直接打开，Network 0；无 CDN、fetch、XHR、WebSocket、module、Worker、Service Worker、存储、音频、传感器或仓库外依赖；
2. Browser/IAB 完成键盘三轮：双方转向、短蓄力、满蓄力、对撞、单方出界、double-out、换轮、赛果和重开；
3. 两个并发 pointerId 完成一轮，覆盖第三指、交换按下顺序、拖出、cancel、lost capture；
4. hidden、blur、500ms+ frame gap 安全暂停，恢复不追帧、不粘 charge；
5. 1280×800、768×1024、390×844、320×700 无横向溢出、主动作/控制裁切和标题孤字；
6. 禁背景、禁图集、reduced motion、forced colors 下完整可玩且状态 hash 不变；
7. DOM/CSS 不保存速度、日志或隐藏结果；控制 accessible name、focus-visible、live region 正确；
8. 概念原尺寸、当前浏览器、桌面和移动截图同轮 `view_image`，至少五项 fidelity ledger 与 above-the-fold copy diff；
9. console 零 error/warning；页面卸载后 rAF、事件和 pointer capture 正确清理；
10. logic tests、catalog tests、`npm test`、`npm run verify`、`git diff --check` 全通过。

## 25. 完成判据

1. 两人只用方向 + charge tick 冲刺，参数完全对称；
2. 规则按固定 tick 推进，rAF、DPR、viewport、帧率、减少动效都不影响胜负；
3. 碰撞位置纠正和速度冲量分离，交换身份性质成立；
4. arena 按 tick 缩圈，边界等号和同 tick 双出界原子裁决精确；
5. 固定三轮、三个出生轴、分数派生、平局与重开完整；
6. 键盘和双 pointer 统一为同一 input schema，不粘键、不追帧；
7. A 级目录可单独复制，图片失败仍可玩，零运行依赖和公网；
8. 固定来源、许可证、权利主体、排除项、零复制和 ImageGen 链完整；
9. bugs/learn、目录、自动测试、Browser/IAB、响应式、降级和视觉 fidelity 全部闭环；
10. 每个调研、规格、设计、计划、逻辑、前端、目录、修复和验收部分独立提交。
