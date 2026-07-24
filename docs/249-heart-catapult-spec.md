# “这一颗，绕回来找你”可执行规格

- 日期：2026-07-24
- 稳定工作 ID：`heart-catapult`
- 对应调研：[`247-heart-catapult-research.md`](./247-heart-catapult-research.md)
- 对应 Brainstorm：[`248-heart-catapult-brainstorm.md`](./248-heart-catapult-brainstorm.md)
- 主分类：双人对抗
- 本地启动等级：A（真实 `file://` 直开）

## 1. 产品合同

两位玩家在同一设备上依次秘密锁定角度和力度。两份输入收齐后，两颗爱心按本轮
首位顺序依次播放；每颗最多在软垫地面反弹一次。两发播放完才联合计分。

固定胜负：

- 每次直接命中或一次反弹后命中均增加 1 次送达；
- 一方累计至少 3 次且严格领先时获胜；
- 双方一起达到目标但仍同分时继续延长轮；
- 最多 12 个完整轮；第 12 轮后仍无人“达到目标且领先”则平局；
- 不用先瞄准席、播放顺序、力度、反弹次数、轨迹长度或完成时间破平。

`MAX_ROUNDS = 12` 是有限终止 Gate，不是隐藏 tie-break。它覆盖双方连续使用镜像
参数而永远同分，以及双方持续 miss 的路径。

## 2. 固定物理常量

### 2.1 坐标与定点数

逻辑使用 Q12 定点整数：

```text
Q = 4096
logicalPixels = q12Integer / Q
```

屏幕坐标约定：`+x` 向右，`+y` 向下。

```text
WORLD_WIDTH          = 960 px
WORLD_HEIGHT         = 540 px
PROJECTILE_RADIUS    = 8 px

LEFT_CENTER_BOUND    = 8 px
RIGHT_CENTER_BOUND   = 952 px
TOP_CENTER_BOUND     = 8 px
GROUND_SOLID_Y       = 480 px
GROUND_CENTER_Y      = 472 px

LOCAL_LAUNCH_X       = 116 px
LOCAL_LAUNCH_Y       = 408 px
```

所有玩家都在“发射者位于左侧、目标位于右侧”的局部坐标系模拟。席位 1 只在公开
投影时镜像：

```text
mirrorXQ(xQ) = 960 * Q - xQ
```

席位 0 发射点为 `(116, 408)`；席位 1 的显示发射点为 `(844, 408)`。规则层不得
维护第二套向左发射的物理实现。

### 2.2 城堡目标

右侧城堡实体 AABB：

```text
x = [824, 900]
y = [376, 480]
```

爱心圆与城堡碰撞转换为“圆心线段对按半径扩张后的 AABB”：

```text
x = [816, 908]
y = [368, 472]
```

扩张后的底边裁到 `GROUND_CENTER_Y`。镜像显示时，左侧城堡实体为
`x=[60,136]`，圆心碰撞 AABB 为 `x=[52,144]`。

只检测对方城堡。爱心离开发射点后不与己方城堡发生规则碰撞。

### 2.3 重力、反弹与上限

```text
GRAVITY_Q12          = 640        // 0.15625 px / tick²
BOUNCE_X_NUMERATOR   = 3
BOUNCE_X_DENOMINATOR = 4
BOUNCE_Y_NUMERATOR   = 1
BOUNCE_Y_DENOMINATOR = 2
MAX_BOUNCES          = 1
MAX_TICKS            = 224
```

第一次地面接触后：

```text
postBounceVx = roundEven(vx * 3 / 4)
postBounceVy = -roundEven(candidateVy / 2)
```

这里的 `candidateVy = vy + GRAVITY_Q12` 是本 tick 到达接触点时的入射竖直速度，
不是 tick 开始前的旧 `vy`。使用旧值会改变冻结的 99 组合矩阵。

第二次地面接触立即 miss。当前 99 个 canonical 组合最迟在第 181 tick 终止，
`MAX_TICKS` 留 43 tick 余量。

## 3. 角度、力度与冻结查表

### 3.1 角度

```text
ANGLE_DEGREES = [15,20,25,30,35,40,45,50,55,60,65]
```

运行时不调用 `Math.sin` 或 `Math.cos`：

| angleIndex | 角度 | cosQ12 | sinQ12 |
| ---: | ---: | ---: | ---: |
| 0 | 15° | 3956 | 1060 |
| 1 | 20° | 3849 | 1401 |
| 2 | 25° | 3712 | 1731 |
| 3 | 30° | 3547 | 2048 |
| 4 | 35° | 3355 | 2349 |
| 5 | 40° | 3138 | 2633 |
| 6 | 45° | 2896 | 2896 |
| 7 | 50° | 2633 | 3138 |
| 8 | 55° | 2349 | 3355 |
| 9 | 60° | 2048 | 3547 |
| 10 | 65° | 1731 | 3712 |

### 3.2 力度

界面显示：

```text
POWER_VALUES = [8,8.5,9,9.5,10,10.5,11,11.5,12]
```

规则只存：

```text
POWER2_VALUES = [16,17,18,19,20,21,22,23,24]
speedQ12 = power2 * 2048
```

初速度：

```text
vx = roundEven(speedQ12 * cosQ12 / Q)
vy = -roundEven(speedQ12 * sinQ12 / Q)
```

默认本地草稿为 `angleIndex=4`（35°）、`powerIndex=4`（力度 10）。草稿只存在于
app，不进入 reducer，锁定动作一次性提交两个索引。

## 4. ties-to-even 整数除法

所有产生规则整数的除法使用“最近整数，正好一半取偶数”：

```text
roundEven( 2.5) =  2
roundEven( 3.5) =  4
roundEven(-2.5) = -2
roundEven(-3.5) = -4
```

`roundEven(numerator / denominator)` 的 denominator 必须为正整数：

1. 用绝对值计算整数商 `q` 与余数 `r`；
2. `2r < denominator`：保留 `q`；
3. `2r > denominator`：取 `q + 1`；
4. `2r == denominator`：`q` 为偶数时保留，否则取 `q + 1`；
5. 最后恢复 numerator 的符号。

禁止用 `Math.round()` 代替。ties-to-even 保证：

```text
roundEven(-v) = -roundEven(v)
roundEven(WQ - x) = WQ - roundEven(x)
```

从而保持左右镜像。

## 5. 单 tick 与连续事件

### 5.1 半隐式 Euler

每 tick：

```text
candidateVy = vy + GRAVITY_Q12
candidateX  = x + vx
candidateY  = y + candidateVy
segment     = (x,y) → (candidateX,candidateY)
```

随后在整条 segment 上找最早事件；不能先提交候选终点再把弹体推出碰撞体。

### 5.2 精确有理事件

事件参数表示为规范化有理数：

```text
t = numerator / denominator
denominator > 0
0 <= t <= 1
```

比较 `a/b` 与 `c/d` 使用精确交叉乘 `a*d` 与 `c*b`，不转换浮点。

候选事件：

1. 对方城堡扩张 AABB：二维 slab intersection 的入口 `t`；
2. 地面：仅当 `y < 472Q`、`candidateY >= 472Q` 且 `candidateVy > 0`，
   `t=(472Q-y)/candidateVy`；
3. 水平出口：圆心跨过 `952Q`；
4. 顶部出口：圆心跨过 `8Q`。

选严格最小的 `t`。只有 `t` 完全相等时，优先级为：

```text
castle > ground > horizontal-exit > top-exit
```

城堡底角与地面同刻接触仍算命中。

### 5.3 事件响应

- 城堡：把精确接触点按 `roundEven` 写入终点 frame，立即 hit；
- 第一次地面：把接触 `x` 按 `roundEven` 写入，`y=472Q`，更新反弹速度，
  `bounceCount=1`，并结束本 tick；
- 第一次地面不递归消费本 tick 剩余时间；
- 第二次地面：终点 frame 后 `missSecondGround`；
- 水平/顶部出口：边界接触 frame 后 `missWorldExit`；
- 无事件：提交候选点与 `candidateVy`；
- 第 224 tick 后仍无终点：`missTimeout`。

`resolveSegmentEvent({xQ,yQ,nextXQ,nextYQ,bounceCount})` 是公开纯 helper，
`simulateShot` 必须调用同一实现。它只接受精确普通对象、安全整数、canonical
字段与合法 bounceCount；非法输入返回 `null`。

四个坐标还必须分别位于闭区间：

```text
[-MAX_EVENT_COORD_Q, MAX_EVENT_COORD_Q]
MAX_EVENT_COORD_Q = 8,000,000
```

生产实现必须在做减法、交叉乘和线性插值前验证操作数，并在每一步验证结果仍为
safe integer；任一步不安全都返回 `null`。这个域内坐标差至多 `16,000,000`，
有理比较乘积至多 `256,000,000,000,000`，接触点插值分子绝对值至多
`384,000,000,000,000`，均小于 `Number.MAX_SAFE_INTEGER`。canonical 模拟轨迹
完全包含在该域内。

合法输入固定返回以下两种递归冻结结构之一：

```js
{
  type: "none",
  t: null,
  contact: null
}
```

```js
{
  type: "castle" | "ground" | "horizontal-exit" | "top-exit",
  t: {
    numerator: safeInteger,
    denominator: positiveSafeInteger
  },
  contact: {
    xQ: safeInteger,
    yQ: safeInteger
  }
}
```

`t` 必须除以最大公因数成为最简分数，denominator 始终为正，且
`0 <= numerator <= denominator`。contact 是精确线性插值后分别按 roundEven
量化的 Q12 整数；ground contact 的 `yQ` 强制为 `472Q`，exit contact 强制落在
对应边界。

slab 语义：

- AABB 使用闭边界；
- 与某轴平行且起点在该轴闭区间内时，该轴不收紧 entry/exit；
- 与某轴平行且起点在区间外时，没有 castle 候选；
- 起点已经位于扩张 AABB 内时，castle `t=0/1`；
- 起点恰在边界且运动向外时，仍先产生 `t=0/1` 的 castle；
- 只有从圆心可活动区内部跨出边界才产生 exit；
- ground 只接受 `yQ < GROUND_CENTER_Y_Q` 到 `nextYQ >=` 的向下穿越；
- bounceCount 不改变候选排序，只决定 ground 被上层模拟解释为 bounce 或 miss。

必须有以下次序夹具：

- segment 同时产生 ground `t=1/2` 与 horizontal-exit `t=3/5`：ground；
- segment 同时产生 horizontal-exit `t=1/5` 与 ground `t=1/3`：exit；
- target 与 ground 完全同 `t`：castle；
- target `t` 严格小于 ground：castle。

## 6. `simulateShot` 结果

输入：

```text
simulateShot(angleIndex, powerIndex)
```

输入必须是合法安全整数索引，不做 coercion。非法输入返回 `null`。

成功返回递归冻结、断引用对象：

```js
{
  outcome: "direct-hit" | "bounce-hit" | "miss",
  terminalReason:
    "castle" |
    "second-ground" |
    "horizontal-exit" |
    "top-exit" |
    "timeout",
  bounceCount: 0 | 1,
  terminalTick: 1..224,
  frames: [
    {
      tick: 0..224,
      xQ: safeInteger,
      yQ: safeInteger,
      event: "launch" | "flight" | "bounce" | "hit" | "miss"
    }
  ]
}
```

`frames[0]` 是发射点；每个 tick 至多增加一个 frame；最后一项必须与
terminalReason 对应。直接命中 `bounceCount=0`，反弹命中 `bounceCount=1`。

这些 frames 是规则输出，不是 rAF 采样。动画只能消费 frames，不能重新积分物理。

## 7. 99 组合冻结矩阵

列按力度：

```text
8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12
```

图例：

```text
D = direct-hit
B = bounce-hit
S = miss / second-ground
X = miss / horizontal-exit
```

```text
15°  SSSSSBBBB
20°  SSSBBBBBD
25°  SSBBBBBDD
30°  SSBBBBDDD
35°  SBBBBDDDX
40°  SBBBBDDDX
45°  SBBBBDDXX
50°  SBBBBDDDX
55°  SSBBBBDDX
60°  SSSBBBDDD
65°  SSSSBBBBD
```

精确计数：

| 结果 | 数量 |
| --- | ---: |
| direct-hit | 23 |
| bounce-hit | 45 |
| second-ground | 25 |
| horizontal-exit | 6 |
| top-exit | 0 |
| timeout | 0 |

两席共验证 `99 × 2 = 198` 条镜像轨迹。分类、terminalTick、bounceCount 和镜像
frame 全部一致。

35° 的连续学习线：

```text
8.0       → second-ground
8.5..10.0 → bounce-hit × 4
10.5..11.5→ direct-hit × 3
12.0      → horizontal-exit
```

## 8. Golden 物理夹具

至少冻结：

| 角度 / 力度 | 初速度 `(vxQ,vyQ)` | 关键事件 | 终点 |
| --- | --- | --- | --- |
| 35° / 8 | `(26840,-18792)` | tick 70 首次地面；tick 110 再落地 | second-ground |
| 35° / 10 | `(33550,-23490)` | tick 83 地面；tick 88 城堡 | bounce-hit |
| 35° / 11 | `(36905,-25839)` | tick 78 城堡 | direct-hit |
| 35° / 12 | `(40260,-28188)` | tick 86 右出口 | horizontal-exit |
| 65° / 10 | `(17310,-37120)` | tick 122 地面；tick 181 城堡 | bounce-hit；最慢 canonical |

关键精确参数：

```text
35° / 8:
  first ground t = 1649 / 3251
  second ground t = 1989 / 3149

35° / 10:
  ground t = 5202 / 14815
  castle t = 1836 / 12581

35° / 11:
  castle t = 5103 / 7381

35° / 12:
  exit t = 49 / 915

65° / 10:
  ground t = 233 / 320
  castle t = 3565 / 6491
```

测试 oracle 必须独立实现有理比较与 Q12 积分，不调用生产 `simulateShot` 生成
expected。

## 9. 整数安全

99 组合枚举观测：

```text
max pre-event |xQ|  = 3,897,236
max terminal |xQ|   = 3,899,392
max |yQ|            = 1,933,312
max |vxQ|           =    47,472
max |vyQ|           =    45,632
right boundary      = 3,899,392
```

`max pre-event |xQ|` 只统计事件解析前的在界候选点；horizontal-exit 的终点 frame
精确量化到右边界 `3,899,392`，因此 terminal 最大值等于该边界。

最大初速度乘 Q12 三角值为 `194,445,312`。枚举中最大的有理事件构造/比较中间
整数为 `130,407,923,712`，相对 `Number.MAX_SAFE_INTEGER` 仍有约 69,069 倍
余量。

生产逻辑使用普通整数 `Number`；测试用独立 `BigInt` oracle 复核全部中间乘积和
事件排序。任何新增障碍、风力、速度、世界尺寸、反弹次数或剩余 tick 消费方式都
必须重新做全矩阵和 headroom 证明。

## 10. 模块与 exact API

目录级 `package.json` 固定为：

```json
{"type":"commonjs"}
```

因此 `logic.js` 同时满足：

- 浏览器经典脚本设置 `window.HeartCatapultLogic`；
- Node `require("./logic.js")` 返回同一 API；
- 根级 ESM 可以用 side-effect `import()` 执行该 CommonJS 文件并检查全局；
- 模块初始化不读取 DOM、配置全局、时间、随机、timer、storage、network 或权限。

API 对象递归冻结，enumerable own keys 的精确顺序为：

```text
Q
CONSTANTS
ANGLE_DEGREES
COS_Q12
SIN_Q12
POWER2_VALUES
DEFAULT_CONFIG
sanitizeConfig
roundEven
mirrorXQ
resolveSegmentEvent
simulateShot
createInitialState
reduce
getPublicView
```

`CONSTANTS` 是扁平、无额外键、递归冻结的 exact 普通对象。enumerable own keys
按下列顺序排列，所有带 `_Q` 的值均为 Q12 整数：

```js
{
  WORLD_WIDTH_Q: 3932160,
  WORLD_HEIGHT_Q: 2211840,
  PROJECTILE_RADIUS_Q: 32768,
  LEFT_CENTER_BOUND_Q: 32768,
  RIGHT_CENTER_BOUND_Q: 3899392,
  TOP_CENTER_BOUND_Q: 32768,
  GROUND_SOLID_Y_Q: 1966080,
  GROUND_CENTER_Y_Q: 1933312,
  LOCAL_LAUNCH_X_Q: 475136,
  LOCAL_LAUNCH_Y_Q: 1671168,
  TARGET_ENTITY_LEFT_Q: 3375104,
  TARGET_ENTITY_RIGHT_Q: 3686400,
  TARGET_ENTITY_TOP_Q: 1540096,
  TARGET_ENTITY_BOTTOM_Q: 1966080,
  TARGET_COLLISION_LEFT_Q: 3342336,
  TARGET_COLLISION_RIGHT_Q: 3719168,
  TARGET_COLLISION_TOP_Q: 1507328,
  TARGET_COLLISION_BOTTOM_Q: 1933312,
  GRAVITY_Q12: 640,
  BOUNCE_X_NUMERATOR: 3,
  BOUNCE_X_DENOMINATOR: 4,
  BOUNCE_Y_NUMERATOR: 1,
  BOUNCE_Y_DENOMINATOR: 2,
  MAX_BOUNCES: 1,
  MAX_TICKS: 224,
  TARGET_SCORE: 3,
  MAX_ROUNDS: 12,
  DEFAULT_ANGLE_INDEX: 4,
  DEFAULT_POWER_INDEX: 4,
  MAX_EVENT_COORD_Q: 8000000
}
```

不得另藏第二套物理常量，也不得把区间改成嵌套对象。

公开 helper：

- `roundEven(numerator, denominator)`：两个 exact safe integer、denominator>0，
  合法返回 safe integer，否则 `null`；
- `mirrorXQ(xQ, seat)`：xQ 必须在 `[0, WORLD_WIDTH_Q]`，seat 为 0/1；seat 0
  返回原值，seat 1 返回 `WORLD_WIDTH_Q-xQ`，非法返回 `null`；
- `resolveSegmentEvent` 与 `simulateShot` 合同见第 5、6 节；
- 其余函数均不做字符串/数字 coercion，不修改输入。

## 11. 配置

`config.js` 只暴露：

```js
window.HEART_CATAPULT_CONFIG = {
  playerNames: ["你", "TA"]
};
```

CommonJS 导出同构可编辑对象。

`sanitizeConfig(raw)`：

- 只接受 exact 普通对象和唯一字段 `playerNames`；
- 数组必须 exact 长度 2、无洞、无额外键、普通原型；
- 每项必须是字符串，NFC、trim 并折叠内部空白；
- 每个名字 1..12 Unicode code points；
- 拒绝控制字符、孤立代理项、双向格式控制和相同名字；
- 任一字段非法则整份回 canonical 默认；
- 返回新分配、递归冻结、与调用方断引用的副本；
- hostile getter、Proxy、custom prototype、symbol 和可变 descriptor 安全拒绝。

canonical 默认 literal 私有保存在 `logic.js`。逻辑初始化不读取可编辑全局，也不
`require("./config.js")`；app 显式把可编辑对象传给 `createInitialState(raw)`。

## 12. 权威状态

顶层 exact state：

```js
{
  phase:
    "intro" |
    "handoff" |
    "aiming" |
    "reveal-ready" |
    "flying" |
    "round-result" |
    "complete",
  revision: safeInteger,
  openingSeat: 0 | 1,
  round: 1..12,
  firstSeat: 0 | 1,
  activeSeat: null | 0 | 1,
  sealedAims: [null | Aim, null | Aim],
  shotResults: null | [ShotResult, ShotResult],
  flightSeat: null | 0 | 1,
  flightToken: null | safeInteger,
  scores: [safeInteger, safeInteger],
  history: RoundHistory[],
  winner: null | 0 | 1,
  drawReason: null | "round-cap",
  config: SanitizedConfig
}
```

```js
Aim = { angleIndex, powerIndex }
```

历史按 round 递增，内部 shots 始终按席位 0/1 存储，不按播放顺序：

```js
RoundHistory = {
  round,
  firstSeat,
  aims: [Aim, Aim],
  outcomes: [
    { outcome, terminalReason, bounceCount, terminalTick },
    { outcome, terminalReason, bounceCount, terminalTick }
  ],
  roundHits: [0 | 1, 0 | 1],
  scoresAfter: [safeInteger, safeInteger]
}
```

初态精确为：

```text
phase         = intro
revision      = 0
openingSeat   = 0
round         = 1
firstSeat     = 0
activeSeat    = null
sealedAims    = [null,null]
shotResults   = null
flightSeat    = null
flightToken   = null
scores        = [0,0]
history       = []
winner        = null
drawReason    = null
```

每个 phase 的私有字段不变量：

| phase | activeSeat | sealedAims | shotResults | flightSeat / token | history 长度 |
| --- | --- | --- | --- | --- | ---: |
| intro | `null` | `[null,null]` | `null` | `null / null` | 0 |
| handoff(first) | `firstSeat` | `[null,null]` | `null` | `null / null` | `round-1` |
| aiming(first) | `firstSeat` | `[null,null]` | `null` | `null / null` | `round-1` |
| handoff(second) | `1-firstSeat` | 仅 firstSeat 项为 Aim | `null` | `null / null` | `round-1` |
| aiming(second) | `1-firstSeat` | 仅 firstSeat 项为 Aim | `null` | `null / null` | `round-1` |
| reveal-ready | `null` | 两项 Aim | 两项完整 ShotResult | `null / null` | `round-1` |
| flying(first) | `null` | 两项 Aim | 两项完整 ShotResult | `firstSeat / revision` | `round-1` |
| flying(second) | `null` | 两项 Aim | 两项完整 ShotResult | `1-firstSeat / revision` | `round-1` |
| round-result | `null` | `[null,null]` | `null` | `null / null` | `round` |
| complete | `null` | `[null,null]` | `null` | `null / null` | `round` |

第二发完成后不是“从 ShotResult 删除 frames”，而是先用两份完整结果生成
RoundHistory，再把 `shotResults` 整体设为 `null`。round-result 与 complete 的公开
摘要只从最后一条 history 投影。

其他状态不变量：

- `firstSeat = (openingSeat + round - 1) mod 2`；
- `history[i].round = i+1`，firstSeat 严格交替；
- 进行中 phase 的 history 长度为 `round-1`，已结算 phase 为 `round`；
- scores 必须等于 history 最后一项 scoresAfter，空历史为 `[0,0]`；
- history 不保存 frames；每条 history 的 outcomes 都由对应 aims 重算；
- shotResults 只在两份 aim 齐全时存在，并与两次 `simulateShot` 深相等；
- round-result 必须 `round < MAX_ROUNDS`、winner/drawReason 均为 null；
- complete 的 winner 与 drawReason 恰有一个非 null；
- winner complete 必须达到目标且领先；
- round-cap complete 必须 `round=MAX_ROUNDS` 且不存在达到目标并领先的一方。

state 校验必须重放每个 aim，复核 outcome、tick、比分、轮次、firstSeat、当前
sealed 前缀与 shotResults；不能信任调用方提供的派生字段。

所有合法返回递归冻结。合法 state 上的非法 action 返回同一引用；畸形或 hostile
state 回到 canonical 默认配置的全新 intro，并且不读取 action。

## 13. Action 与 reducer

只接受 exact 普通 data object：

```text
START
  {type, expectedRevision}

TAKE_OVER
  {type, seat, expectedRevision}

LOCK_AIM
  {type, seat, angleIndex, powerIndex, expectedRevision}

BEGIN_REVEAL
  {type, expectedRevision}

COMPLETE_FLIGHT
  {type, shotToken, expectedRevision}

NEXT_ROUND
  {type, expectedRevision}

RESTART
  {type, expectedRevision}
```

未知/缺失/额外键、symbol、访问器、数组、custom prototype、boxed primitive、
coercion、错席、错阶段、stale revision 和旧 token 均 no-op。

转换：

1. `intro + START` → `handoff(firstSeat)`；
2. 正确 `TAKE_OVER` → `aiming(activeSeat)`；
3. 第一位 `LOCK_AIM` → 保存 aim，`handoff(otherSeat)`；
4. 第二位 `LOCK_AIM` → 保存 aim、预生成两条 ShotResult，`reveal-ready`；
5. `BEGIN_REVEAL` → `flying(firstSeat)`，`flightToken=新 revision`；
6. 第一发正确 `COMPLETE_FLIGHT` → `flying(otherSeat)`，token 换为新 revision；
7. 第二发正确 `COMPLETE_FLIGHT` → 联合加分、追加 history、令
   `sealedAims=[null,null]`、`shotResults=null` 并清 flight 字段：
   - 达到目标且领先 → `complete(winner)`；
   - 第 12 轮仍无 winner → `complete(drawReason="round-cap")`；
   - 否则 → `round-result`；
8. `NEXT_ROUND` → round+1、firstSeat 交替、清本轮私有值、进入 handoff；
9. `complete + RESTART` → openingSeat 交替的全新 intro，保留 canonical/sanitized
   playerNames，revision 单调加一。

第一发完成不修改 scores/history；动画顺序永远不能成为结算顺序。

## 14. Revision headroom

每个完整轮固定需要 7 个核心动作：

```text
TAKE_OVER × 2
LOCK_AIM × 2
BEGIN_REVEAL × 1
COMPLETE_FLIGHT × 2
```

相邻轮另需一个 `NEXT_ROUND`。从全新 intro 到第 12 轮终局最多：

```text
START 1 + 12 × 7 + 11 × NEXT_ROUND = 96 actions
```

状态必须满足：

```text
revision + maxRemainingAcceptedActions(state)
  <= Number.MAX_SAFE_INTEGER
```

当前轮未完成时：

| phase | 当前轮最多还需核心动作 |
| --- | ---: |
| handoff(first) | 7 |
| aiming(first) | 6 |
| handoff(second) | 5 |
| aiming(second) | 4 |
| reveal-ready | 3 |
| flying(first) | 2 |
| flying(second) | 1 |
| round-result | 0 |

再加 `(12 - round) × 8`，其中每个未来轮由 `NEXT_ROUND + 7 核心动作` 组成。
intro 固定为 96，complete 为 0。

`RESTART` 只有在：

```text
revision + 1 + 96 <= MAX_SAFE
```

时生效，否则保持同引用。`flightToken` 直接使用进入当前 flying 状态后的 revision，
不另建可能回绕的计数器。

## 15. Public view 与阶段隐私

app 只能渲染 `getPublicView(state)`，不得读取 authority state 私有字段。

合法 state 固定返回新分配、递归冻结且与输入断引用的 exact 普通对象。顶层
enumerable own keys 顺序固定为：

```text
phase
revision
round
maxRounds
firstSeat
activeSeat
lockedCount
players
targetScore
history
revealedShots
currentFlight
roundResult
finalResult
controls
copy
```

exact DTO：

```js
{
  phase,
  revision,
  round,
  maxRounds: 12,
  firstSeat,
  activeSeat,
  lockedCount: 0 | 1 | 2,
  players: [
    { seat: 0, name: string, score: safeInteger },
    { seat: 1, name: string, score: safeInteger }
  ],
  targetScore: 3,
  history: PublicRoundSummary[],
  revealedShots: PublicShotSummary[],
  currentFlight: null | PublicFlight,
  roundResult: null | PublicRoundSummary,
  finalResult: null | {
    winner: null | 0 | 1,
    drawReason: null | "round-cap",
    scores: [safeInteger, safeInteger]
  },
  controls: {
    canStart: boolean,
    canTakeOver: boolean,
    canLockAim: boolean,
    canBeginReveal: boolean,
    canCompleteFlight: boolean,
    canNextRound: boolean,
    canRestart: boolean
  },
  copy: {
    eyebrow: string,
    title: string,
    status: string,
    instruction: string,
    live: string
  }
}
```

嵌套 schema：

```js
PublicAim = {
  angleIndex,
  angleDegrees,
  powerIndex,
  power2
}

PublicShotSummary = {
  seat,
  aim: PublicAim,
  outcome,
  terminalReason,
  bounceCount,
  terminalTick
}

PublicFlight = {
  seat,
  token,
  aim: PublicAim,
  result: {
    outcome,
    terminalReason,
    bounceCount,
    terminalTick
  },
  frames: [
    { tick, xQ, yQ, event }
  ]
}

PublicRoundSummary = {
  round,
  firstSeat,
  shots: [PublicShotSummary, PublicShotSummary],
  roundHits: [0 | 1, 0 | 1],
  scoresAfter: [safeInteger, safeInteger]
}
```

`players`、`scores`、`roundHits` 与 `scoresAfter` 固定是无额外键、无洞的二元数组。
`history` 始终只含已经完整结算的轮，按 round 递增。`PublicRoundSummary.shots`
始终按席位 0/1 排列，不按播放顺序。

各阶段的公开容器：

- intro / handoff(first) / aiming(first)：`lockedCount=0`，`revealedShots=[]`，
  `currentFlight=roundResult=finalResult=null`；
- handoff(second) / aiming(second)：`lockedCount=1`，但其余公开容器仍与上项相同；
- reveal-ready：`lockedCount=2`，但两份秘密仍不进入任何公开容器；
- flying(first)：`lockedCount=2`，`revealedShots=[]`，`currentFlight` 只含第一发；
- flying(second)：`lockedCount=2`，`revealedShots` 只含已完成的第一发，
  `currentFlight` 只含第二发；
- round-result：`lockedCount=0`，`revealedShots=[]`，`currentFlight=null`，
  `roundResult` 是最后一条 history 的断引用副本；
- complete：与 round-result 相同，但 `roundResult=null`，`finalResult` 非 null。

`controls` 七个键始终存在，只有当前 phase 唯一合法的主动作对应项为 true：
intro/start、handoff/takeOver、aiming/lockAim、reveal-ready/beginReveal、
flying/completeFlight、round-result/nextRound、complete/restart。

`copy` 五项始终是当前 phase 的非空中文字符串，不包含任何尚未公开的名字以外
秘密；live 只描述已经发生的阶段转换或公开结果。

非法或 hostile state 传给 `getPublicView` 返回 `null`，不得尝试修复、读取 getter
或隐式回退为另一个玩家的公开视图。

阶段 Gate：

| 阶段 | 可以公开 | 必须缺失 |
| --- | --- | --- |
| intro / handoff | 比分、轮次、接管对象 | 两份 aim、shot result、frames |
| aiming(first) | 当前席、合法档位 | 任何 sealed aim |
| aiming(second) | 当前席、合法档位、lockedCount=1 | 第一份 aim/result/frames |
| reveal-ready | lockedCount=2、开始放飞动作 | 两份 aim/result/frames |
| flying(first) | 第一份 aim、第一条镜像后 frames/result、token | 第二份 aim/result/frames |
| flying(second) | 已公开第一发摘要、第二份 aim 与当前 frames/result | 无未来本轮秘密 |
| round-result | 两份 aim、两发摘要、roundHits、scoresAfter | frames 已删除 |
| complete | 全历史、winner/draw | 无私有字段 |

顶层 phase 容器为保持 exact DTO 可以是 `null` 或空数组；“秘密字段结构性缺失”
指任何非空公开嵌套对象中都不得出现尚未公开的 `aim`、`result` 或 `frames` 键，
也不得以 `null`、空字符串、空对象或 CSS 隐藏方式占位。

锁定前的 range 草稿只在 app-local session；blur、hidden、pagehide 或 Escape
立即遮屏并丢弃草稿。已锁定 authority aim 留在内存，但不会进入公开 view。此合同
不抵御开发者工具读取内存，README 必须如实说明。

## 16. DOM、Canvas 与输入合同

生产 DOM 按 phase 拥有节点：

- intro：规则与开始；
- handoff：接管对象与“我接好了”；
- aiming：当前玩家、两个 range、减/加、当前值、锁定；
- reveal-ready：中性说明与“让两颗心飞起来”；
- flying：当前第几发、公开参数、Canvas、跳过动画/继续；
- round-result：两发摘要、联合比分、下一轮；
- complete：winner/draw、最终比分、再来一局。

旧阶段节点必须卸载。上一位 range、label、value、ARIA 和 live 文本不能留在 hidden
DOM。

Canvas：

- `aria-hidden="true"`，只负责纸雕场地与飞行；
- 不从像素、绘制完成、rAF 数量或 CSS animation event 裁决规则；
- 当前玩家、比分、角度、力度、结果和主动作都在真实 DOM；
- fallback 说明“画面不可用时仍可阅读规则，但需要 Canvas 才能观看轨迹”；
- 不用 `fillText` 作为唯一状态来源。

输入：

- 原生 range 支持方向键；
- 每个 range 都有减/加按钮；
- 最终锁定只在 click/键盘激活时发生；
- 不用 pointerdown 直接提交；
- 不要求拖拽投石器；
- compatibility click 不能重复锁定；
- 动画正常/减少动态都只派一个 token 化 `COMPLETE_FLIGHT`。

## 17. A 级、本地与静态安全

生产文件使用：

```text
index.html
styles.css
config.js
logic.js
app.js
package.json
README.md
ATTRIBUTION.md
assets/favicon.svg
```

加载顺序：

```html
<script src="./config.js"></script>
<script src="./logic.js"></script>
<script src="./app.js"></script>
```

禁止：

- ES modules、dynamic import、`fetch()`；
- CDN、远程字体、远程图片、远程音频；
- storage、cookie、Service Worker；
- 网络、权限、时间、随机数参与规则；
- 第三方运行依赖与资产。

验收必须同时覆盖真实 `file:///.../index.html` 与统一 localhost。localhost 成功
不能替代 file 导航证据。

## 18. 来源与借鉴声明

生产 `ATTRIBUTION.md` 固定写入：

- `tridpt/TwoPlayerGames`
  `c96b802232d87d58408ed653dcbe43c0a68611f6`，MIT；
- `niccolofanton/tanks-game`
  `e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12`，MIT；
- `liabru/matter-js`
  `acb99b6f8784c809b940f1d2cf745427e088e088`，MIT；
- `schteppe/p2.js`
  `2beb2750f42d29014e289cb803b7269d5b0edaad`，MIT；
- `jriecken/sat-js`
  `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`，MIT。

许可证哈希、权利主体、实际借鉴和排除项以
[`247-heart-catapult-research.md`](./247-heart-catapult-research.md) 为准。

必须声明：本作独立实现热座回合、状态机、Q12 物理、有理碰撞、反弹、城堡判定、
测试、UI、中文文案与视觉；未复制、改写、翻译、链接或打包五个来源的源码、API、
参数、测试、素材、品牌或界面。也不使用《愤怒的小鸟》《百战天虫》等商业作品的
代码、美术、声音、关卡或品牌表达。

## 19. 测试与验收 Gate

### 19.1 纯逻辑

- exact 冻结 API、浏览器全局、根 ESM side-effect import 与真实 CommonJS；
- canonical 默认不依赖可编辑 config；
- Q12 表、roundEven 正负半值、镜像恒等式；
- slab、ground、exit 和相等事件优先级；
- 99 组合矩阵、23/45/25/6/0/0 计数；
- 198 条左右镜像轨迹；
- 五条 golden 与 65°/10 的第 181 tick 最慢路径；
- 独立 BigInt oracle 与 safe integer headroom；
- action exact schema、descriptor snapshot、hostile Proxy；
- 所有阶段、错席、stale revision、旧 flightToken；
- 第一发完成不计分，第二发联合结算；
- `2:2 → 3:3` 延长、`3:3 → 4:3` 胜出；
- 12 轮 0:0、2:1、12:12 的 round-cap 平局；
- history 重放、JSON clone、malformed state 与 revision 上限；
- public view 每阶段隐私 sentinel；
- 逻辑初始化无 DOM、时间、随机、timer、storage、network、audio 或 permission。

### 19.2 浏览器

- 两人各锁一份，第二人阶段扫描第一份参数零命中；
- 第一发阶段扫描第二份参数与 frames 零命中；
- direct、bounce、second-ground、exit 各真实播放；
- 两发后才联合更新比分；
- 延长轮、round-cap draw、winner 与 restart；
- range、减/加、Tab、Shift+Tab、Enter、Space、方向键；
- blur、hidden、pagehide、Escape 遮屏与草稿清理；
- 正常动画、skip、reduced-motion 结果完全相同；
- 1728×906、1280×800、390×844、320 CSS px、400% zoom；
- forced-colors、200% text、无 CSS、无 favicon、无 JS；
- `scrollWidth <= clientWidth`、焦点、live region、Canvas fallback；
- console/network 清洁；
- 真实 file 与 localhost 同一路径。

## 20. 明确排除

首版不实现风向、随机地形、移动、爆炸、伤害、道具、障碍墙、多次反弹、斜面、
完整预测线、AI、倒计时、音频、震动、存档、账号、网络、排行榜、自定义物理、
自定义胜利分数或远程统计。

这些变化会破坏当前 99 组合矩阵、镜像与 headroom，必须另立 spec，不能作为 UI
实现时的顺手增强。
