# 企鹅冰原夺旗：spec

## 1. 文档状态

- 候选 ID：`penguin-flag-duel`
- 对外标题：企鹅冰原夺旗
- 分类：双人对抗
- 运行等级：A
- 产品决策：Conditional Go
- 规格状态：Ready for implementation

本规格冻结第一版合同。实现阶段可以修正代码缺陷，但不得自行加入双旗、随机地图、冲刺、技能、道具、AI、音频、联网或持久化。

## 2. 交付边界

未来生产目录固定为：

```text
experiences/versus/penguin-flag-duel/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── logic.test.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    └── favicon.svg
```

其中：

- `index.html` 只引用同目录经典脚本与样式；
- `config.js` 只包含静态可配置文案和两个席位名；
- `logic.js` 是 DOM-free UMD/经典脚本，可被 Node `require`；
- `app.js` 负责 DOM、输入、调度、渲染、暂停和会话日志；
- `logic.test.js` 使用项目现有 Node 测试方式；
- `favicon.svg` 必须为原创代码几何；
- 不需要打包、安装依赖或启动服务器。

## 3. 用户可见合同

### 3.1 一句话规则

滑向中央抢旗，带回自己的基地得分；持旗时被对手撞到会掉旗。先得 3 分，或 90 秒结束时分高者获胜。

### 3.2 首屏

首屏必须直接展示：

- 标题和一句话规则；
- 左席 WASD、右席方向键；
- “检测键盘组合”入口；
- “开始比赛”主按钮；
- 本地说明“只在本机运行，刷新即重置”；
- 触屏设备上可见的两席方向盘说明。

不得要求填写名字、授权、联网、下载或完成自检才能开始。

### 3.3 比赛阶段

核心阶段仅有：

```text
intro
countdown
playing
paused
capture-reset
match-result
```

输入自检属于 UI 外层状态，不进入比赛 reducer。

| 当前阶段 | 可接受动作 | 可见行为 |
| --- | --- | --- |
| `intro` | `START` | 进入 150 tick 开局倒计时 |
| `countdown` | `STEP`、`PAUSE` | 中性倒计时，忽略移动意图 |
| `playing` | `STEP`、`PAUSE` | 物理、旗、计分和计时 |
| `paused` | `RESUME` | 进入 90 tick 恢复倒计时 |
| `capture-reset` | `STEP`、`PAUSE` | 90 tick 得分重置倒计时 |
| `match-result` | `RESTART` | 返回全新开局倒计时 |

任何阶段不匹配、schema 非法或 revision 过期的动作都是 no-op。

## 4. 逻辑常量

所有位置、半径、速度和加速度使用 `FIXED_SCALE = 256` 的定点整数。

### 4.1 时间

| 常量 | 值 | 含义 |
| --- | ---: | --- |
| `VERSION` | 1 | 状态和重放协议版本 |
| `TICK_RATE` | 60 | 每秒逻辑 tick |
| `INITIAL_COUNTDOWN_TICKS` | 150 | 2.5 秒开局倒计时 |
| `RESUME_COUNTDOWN_TICKS` | 90 | 1.5 秒恢复倒计时 |
| `CAPTURE_RESET_TICKS` | 90 | 1.5 秒得分重置 |
| `MATCH_LIVE_TICKS` | 5400 | 90 秒有效比赛 |
| `FLAG_PICKUP_LOCK_TICKS` | 15 | 掉旗后 0.25 秒锁定 |
| `FLAG_RESET_TICKS` | 480 | 掉旗 8 秒无人拾取回中央 |
| `MAX_CATCH_UP_TICKS` | 5 | 每动画帧最多补算 |
| `MAX_FRAME_GAP_MS` | 250 | 超过即自动暂停 |

只有 `playing` 阶段消耗 `MATCH_LIVE_TICKS`。倒计时、得分重置和暂停均不消耗。

### 4.2 场地

下表单位先写逻辑像素，进入状态前统一乘以 256：

| 常量 | 值 |
| --- | ---: |
| `WORLD_WIDTH` | 1024 |
| `WORLD_HEIGHT` | 640 |
| `BASE_DEPTH` | 144 |
| `PLAYER_RADIUS` | 28 |
| `FLAG_RADIUS` | 14 |
| 左出生点 | `(160, 320)` |
| 右出生点 | `(864, 320)` |
| 中央旗点 | `(512, 320)` |
| 上冰岛 AABB | `x:448..576, y:168..216` |
| 下冰岛 AABB | `x:448..576, y:424..472` |

两个冰岛关于水平中线互为镜像，且各自关于垂直中线对称。基地是：

- 左席：玩家中心 `x <= BASE_DEPTH`；
- 右席：玩家中心 `x >= WORLD_WIDTH - BASE_DEPTH`。

出生点、基地和任何未来静态物件必须通过镜像函数派生。禁止为两席手写不一致的参数。

### 4.3 运动

| 常量 | 定点值 | 约合逻辑像素 |
| --- | ---: | ---: |
| `ACCEL_CARDINAL` | 40 | 0.15625 px/tick² |
| `ACCEL_DIAGONAL` | 28 | 每轴 0.109375 px/tick² |
| `DAMPING_NUMERATOR` | 255 | — |
| `DAMPING_DENOMINATOR` | 256 | — |
| `MAX_SPEED` | 1024 | 4 px/tick |
| `CARRIER_MAX_SPEED` | 768 | 3 px/tick |
| `CARRIER_ACCEL_NUMERATOR` | 3 | — |
| `CARRIER_ACCEL_DENOMINATOR` | 4 | — |
| `WALL_RESTITUTION_NUMERATOR` | 1 | — |
| `WALL_RESTITUTION_DENOMINATOR` | 4 | — |
| `PLAYER_RESTITUTION_NUMERATOR` | 1 | — |
| `PLAYER_RESTITUTION_DENOMINATOR` | 4 | — |
| `MAX_COLLISION_PASSES` | 4 | — |

输入意图固定为：

| 值 | 方向 | 加速度 `(x,y)` |
| ---: | --- | --- |
| 0 | 静止 | `(0,0)` |
| 1 | 上 | `(0,-40)` |
| 2 | 右上 | `(28,-28)` |
| 3 | 右 | `(40,0)` |
| 4 | 右下 | `(28,28)` |
| 5 | 下 | `(0,40)` |
| 6 | 左下 | `(-28,28)` |
| 7 | 左 | `(-40,0)` |
| 8 | 左上 | `(-28,-28)` |

持旗时先对上述加速度按 `3/4` 向零取整，再进入积分。

每个玩家的速度更新顺序：

1. `v += acceleration`；
2. `v = trunc(v * 255 / 256)`，逐分量向零取整；
3. 用整数平方根检查向量长度；
4. 超过当前速度上限时按长度等比缩放并用确定性 `roundDiv`；
5. `position += velocity`。

`integerSqrt` 必须返回非负安全整数平方根的 floor，禁止调用随帧变化的近似积分。所有乘法中间值必须保持在 `Number.MAX_SAFE_INTEGER` 内。

### 4.4 碰撞法线

圆形玩家碰撞使用 16 向定点单位法线，尺度 `NORMAL_SCALE = 4096`：

```text
(4096,0), (3784,1567), (2896,2896), (1567,3784),
(0,4096), (-1567,3784), (-2896,2896), (-3784,1567),
(-4096,0), (-3784,-1567), (-2896,-2896), (-1567,-3784),
(0,-4096), (1567,-3784), (2896,-2896), (3784,-1567)
```

选择与玩家中心差向量点积最大的法线；点积相同时取索引更小者。两中心完全重合时：

- 若两者 `lastNormalIndex` 相同，沿该法线；
- 否则固定沿索引 0，从左席指向右席。

这样不存在随机抖开。

## 5. 每 tick 物理合同

### 5.1 高层顺序

`simulatePlayingTick` 必须按以下顺序执行：

1. 校验并冻结输入意图；
2. 从 tick 开始快照计算两名玩家的加速度、阻尼和限速；
3. 同时积分位置；
4. 每名玩家依座位顺序执行世界边界和静态 AABB 修正；
5. 从修正后的共同快照解算玩家碰撞，最多 4 pass；
6. 记录本 tick 是否发生玩家接触；
7. 解算掉旗；
8. 解算拾旗；
9. 解算基地得分；
10. 更新无主旗锁定/离地计时；
11. 消耗 1 个有效比赛 tick；
12. 先判断目标分，再判断计时终局；
13. 构造、深冻结并返回新状态。

不得在两名玩家的积分之间读取对方已经更新的状态。

### 5.2 世界边界

玩家中心的合法范围：

```text
PLAYER_RADIUS <= x <= WORLD_WIDTH - PLAYER_RADIUS
PLAYER_RADIUS <= y <= WORLD_HEIGHT - PLAYER_RADIUS
```

越界时将位置钳回边界，并仅在速度朝向边界外时对法向分量执行 `-v * 1/4` 的向零取整。切向速度不变。

### 5.3 圆与冰岛 AABB

- 用圆心到 AABB 最近点进行平方距离检测；
- 穿透时沿最短退出轴修正；
- 距离和最短轴完全相同时，按左、右、上、下的固定优先级选择；
- 法向速度朝障碍内时按 `1/4` 回弹；
- 最多对两个冰岛各执行 2 次有序修正；
- 玩家最大单 tick 位移为 4 px，而冰岛最薄边为 48 px，因此首版不启用连续碰撞检测；
- 极限速度测试必须证明玩家不能从冰岛一侧穿到另一侧。

### 5.4 玩家碰撞

- 当中心距离平方小于 `(2 * PLAYER_RADIUS)²` 时视为接触；
- 沿选定 16 向法线各修正一半穿透，奇数余量固定给右席向外多 1 个定点单位；
- 使用两者碰撞前速度快照计算相对法向速度；
- 只有相向运动时施加等质量、`1/4` 恢复系数的对称冲量；
- 冲量后再次按各自当前速度上限限速；
- 最多 4 pass；
- 任一 pass 发生位置修正，则 `playerContact = true`。

持旗者即使因为碰撞后被推出基地，也仍按“先掉旗”规则失去旗。

## 6. 旗帜合同

旗状态严格为：

```js
{
  x: integer,
  y: integer,
  carrierSeat: null | 0 | 1,
  pickupLockTicks: integer 0..15,
  looseTicks: integer 0..480
}
```

### 6.1 携带

- `carrierSeat !== null` 时，`x/y` 必须等于该玩家 tick 结算后位置；
- `pickupLockTicks` 与 `looseTicks` 必须为 0；
- 旗不参与刚体碰撞；
- 视觉层根据玩家朝向把旗画在身体后方，但不能反写逻辑坐标。

### 6.2 掉旗

若 `playerContact === true` 且 tick 开始时或移动后存在携带者：

1. 清除 `carrierSeat`；
2. 取两名玩家碰撞修正后中心的整数中点；
3. 用旗半径按世界边界钳制；
4. 若落点与冰岛相交，按与圆-AABB相同的固定优先级投影到最近合法边；
5. 设置 `pickupLockTicks = 15`、`looseTicks = 0`。

掉旗 tick 不执行拾取和得分。

### 6.3 拾取

只在 `carrierSeat === null && pickupLockTicks === 0` 时执行。

- 接触阈值为 `(PLAYER_RADIUS + FLAG_RADIUS)²`；
- 一人接触则该人拾取；
- 两人都接触则比较距离平方；
- 小者拾取；
- 完全相等则无人拾取；
- 拾取后旗坐标立即等于携带者坐标。

### 6.4 无主旗计时

- `pickupLockTicks > 0` 时每个 `playing` tick 减 1，`looseTicks` 保持 0；
- 锁定归零后仍无主，每 tick `looseTicks += 1`；
- 到 480 时回 `(512,320)`，两个计时归零；
- 中央初始旗的 `looseTicks` 始终为 0，直到发生首次掉旗；
- 得分重置后也回到中央初始状态。

### 6.5 得分

只有 `carrierSeat !== null` 才检查基地：

- 左席携旗且 `x <= 144 * 256`：左席得分；
- 右席携旗且 `x >= 880 * 256`：右席得分；
- 得分 tick 已经消耗一个有效比赛 tick；
- 分数增加后若达到 3，直接进入 `match-result`；
- 否则玩家和旗回初始位置、速度归零，进入 `capture-reset`，`countdownTicks = 90`；
- `lastCaptureSeat` 记录得分席，下一次重新进入 `playing` 时清空。

## 7. 终局合同

| 条件 | 结果 |
| --- | --- |
| 任一席得分达到 3 | 该席立即获胜 |
| tick 结算后 `liveTicksRemaining === 0` 且分数不同 | 高分席获胜 |
| tick 结算后 `liveTicksRemaining === 0` 且同分 | 平局 |

目标分判断早于时间判断。最后 tick 上的得分、掉旗和拾取先结算。

结果状态保存：

```js
{
  winnerSeat: null | 0 | 1,
  reason: "target-score" | "time" | "draw"
}
```

`reason === "draw"` 时 `winnerSeat` 必须为 `null`；其他原因必须有获胜席。

## 8. 状态、动作与校验

### 8.1 状态 schema

状态只允许以下 own data keys：

```text
version
phase
playerNames
copy
players
flag
scores
liveTicksRemaining
countdownTicks
pauseReason
lastCaptureSeat
result
revision
```

玩家严格为：

```js
{
  seat: 0 | 1,
  x: integer,
  y: integer,
  vx: integer,
  vy: integer,
  lastNormalIndex: integer 0..15
}
```

状态必须深冻结。外部传入状态须：

- 是普通对象；
- own keys 精确匹配；
- 无 accessor、symbol key、thenable 或原型技巧；
- 数值均为有限安全整数并在阶段允许范围内；
- 玩家、旗、得分、结果与阶段交叉约束一致；
- 通过后复制并深冻结，不信任调用者引用。

校验失败时 reducer 返回全新的安全初始态；动作校验失败或过期时返回原安全状态。

### 8.2 配置

默认配置：

```js
{
  playerNames: ["左左", "右右"],
  copy: {
    title: "企鹅冰原夺旗",
    subtitle: "抢到旗只是开始，带回家才算得分。",
    start: "开始比赛",
    restart: "再抢一局",
    resume: "继续比赛",
    localOnly: "只在本机运行，刷新即重置。"
  }
}
```

限制：

- 两个名字去首尾空白、合并空白后各 1..12 code points，且不得完全相同；
- title 1..24；
- subtitle、localOnly 1..64；
- 按钮文案 1..16；
- 非法配置逐字段回退；
- 不允许配置函数或异步值。

### 8.3 动作 schema

所有动作必须包含当前 `expectedRevision`：

```js
{ type: "START", expectedRevision }
{ type: "STEP", expectedRevision, intents: [0..8, 0..8] }
{ type: "PAUSE", expectedRevision, reason }
{ type: "RESUME", expectedRevision }
{ type: "RESTART", expectedRevision }
```

`reason` 仅允许：

```text
manual
hidden
blur
pagehide
stalled
```

动作 own keys 必须精确匹配。接受的动作每次 `revision += 1`；no-op 不增加。

### 8.4 阶段转换细节

- `START`：初始化玩家、旗、比分和计时，进入 150 tick `countdown`；
- `countdown + STEP`：忽略 intents，仅倒计时；归零时进入 `playing`；
- `capture-reset + STEP`：忽略 intents，仅倒计时；归零时进入 `playing` 并清 `lastCaptureSeat`；
- `PAUSE`：可从 `countdown`、`playing`、`capture-reset` 进入 `paused`，速度和位置保持，`countdownTicks = 0`；
- `RESUME`：进入新的 90 tick `countdown`；输入从中性开始；
- `RESTART`：仅从 `match-result` 接受，保留配置，进入新的 150 tick `countdown`；
- `intro` 和 `match-result` 不接受 `PAUSE`。

暂停时核心状态不保存按键按下态。应用层必须先清输入，再派发 `PAUSE`。

## 9. 确定性重放

### 9.1 会话日志

应用层记录：

```js
{
  version: 1,
  config: sanitizedConfig,
  actions: [acceptedAction, ...]
}
```

只记录被 reducer 接受的动作；每项保留当时的 `expectedRevision`。不记录 DOM event、时间戳、帧率、pointerId、CSS 像素或渲染插值。

`replaySession(log)`：

1. 严格校验顶层、配置和每个动作；
2. 从 `createInitialState(config)` 开始；
3. 依次调用同一个 reducer；
4. 动作顺序、revision 或字段非法时抛出 `TypeError`/`RangeError`；
5. 返回深冻结末态。

原会话末态与重放末态必须 `deepStrictEqual`。

### 9.2 调度独立

应用调度器：

- 固定 `STEP_MS = 1000 / 60`；
- rAF 时间仅写入 accumulator；
- 每次循环最多派发 5 个 `STEP`；
- 超过 5 tick 的剩余积压不继续追赶，转 `stalled` 暂停；
- 单帧 gap >250 ms 直接 `stalled` 暂停；
- 渲染可使用 `alpha = accumulator / STEP_MS`，但不得修改状态；
- hidden 时不运行逻辑 tick。

测试以相同 tick 意图流模拟 30、60、144 Hz 帧序列，末态必须严格相等。

## 10. 键盘合同

### 10.1 映射

| 席位 | 上 | 右 | 下 | 左 |
| --- | --- | --- | --- | --- |
| 左席 | `KeyW` | `KeyD` | `KeyS` | `KeyA` |
| 右席 | `ArrowUp` | `ArrowRight` | `ArrowDown` | `ArrowLeft` |

- 使用 `event.code`；
- 游戏控制键 `keydown` 时阻止页面滚动；
- 忽略 `event.repeat` 对集合的重复写入；
- `keyup` 删除 held key；
- 同轴相反键相消；
- 每 tick 从 held set 编译为 0..8；
- 在表单控件获得焦点时，不接管普通键入；
- Escape 仅在允许阶段暂停/恢复。

### 10.2 矩阵自检

四步组合：

```text
WA + ↑←
WD + ↑→
SA + ↓←
SD + ↓→
```

每一步：

- 展示八个目标物理键；
- 必须在同一时刻观察到该步四键全部按下，才标记通过；
- 松开全部键后才进入下一步；
- 可重试、可跳过；
- 自检结果只存在内存，不写比赛状态或持久化；
- 任一步失败/跳过，开局旁显示非阻断提示“键盘可能漏键，建议双指触控”。

自检通过是“完整键盘验收”的必要条件，不是开始比赛的必要条件。

## 11. Pointer/touch 合同

- 左右各一个原生 button 八方向盘；
- 每个可按方向目标最小 44×44 CSS px；
- 两个方向盘分别维护 `activePointerId` 和当前 intent；
- 仅 `pointerType === "touch" || pointerType === "pen"` 时宣称可双席同时控制；
- `pointerdown` 绑定该席、设置 pointer capture 并设置 intent；
- 已有 active pointer 的席忽略第二个 pointer；
- `pointerup`、`pointercancel`、`lostpointercapture` 清空该席；
- `blur`、hidden、pagehide、暂停和结果都清空两席；
- 方向盘设置 `touch-action: none`；
- 单鼠标可用于验证单个按钮，但不作为完整双人输入路径。

两 pointer 同时按下时，每 tick 生成的意图对必须可包含两个非零值。

## 12. 暂停合同

下列信号映射到原因：

| 信号 | reason |
| --- | --- |
| Escape / 暂停按钮 | `manual` |
| `visibilitychange` 且 hidden | `hidden` |
| `window.blur` | `blur` |
| `pagehide` | `pagehide` |
| rAF gap >250 ms 或追赶超限 | `stalled` |

顺序必须是：

1. 清键盘 held set；
2. 释放或清空 pointer；
3. 清 accumulator 和上一帧时间；
4. 若当前阶段允许，派发 `PAUSE`；
5. 渲染暂停层。

恢复由按钮或 Escape 显式触发。恢复后进入 90 tick 中性倒计时，不能沿用暂停前仍按住的键。

## 13. 视图模型

`getViewModel(state)` 返回只读派生数据，不暴露配置函数、动作日志或可变引用：

```text
phase
revision
playerNames
players: position, speedRatio, seat, isCarrier
flag: position, carrierSeat, lockRatio, looseRatio
scores
liveTicksRemaining
countdownTicks
pauseReason
lastCaptureSeat
result
status: title, body
```

比赛信息不存在秘密；两席可看到同一完整场地。`speedRatio` 用整数速度长度与当前上限派生，视觉层不可反算或修改速度。

## 14. DOM 与渲染

### 14.1 SVG 冰场

- 单个内联 SVG，`viewBox="0 0 1024 640"`；
- 玩家、旗、基地和冰岛节点固定存在，只更新属性/class；
- 不用 Canvas 像素读回；
- 企鹅由原创 `<ellipse>`、`<circle>`、`<path>` 和 CSS 组合；
- 不嵌入 base64 图片、第三方 SVG path 或远程字体；
- 旗和基地有文字/纹样冗余，不只靠颜色；
- DOM 中不生成每 tick 粒子。

### 14.2 响应式

必须验收：

- 1504×1046 桌面；
- 844×390 手机横屏；
- 390×844 手机竖屏；
- 320×700 窄屏；
- 浏览器 200% 缩放。

所有尺寸下：

- 冰场完整可见；
- 比分、时间和暂停可见；
- 两席方向盘不重叠；
- 主按钮和结果按钮可操作；
- 页面可滚动到非关键说明，但比赛中的关键控件不被裁掉；
- 安全区使用 `env(safe-area-inset-*)` 时有 0 fallback。

### 14.3 降动效和高对比

`prefers-reduced-motion: reduce`：

- 所有装饰 animation/transition 时长归零或极短；
- 关闭雪粒、晃动、缩放、弹跳、路径飞行；
- 保留玩家位置更新，因为它是必要玩法信息；
- 得分用静态边框和文本提示。

`forced-colors: active`：

- 玩家、旗、基地和焦点轮廓使用系统色或可见边框；
- 不依赖背景图；
- `forced-color-adjust: none` 只在确有必要且仍能证明对比时使用。

### 14.4 可访问性

- 所有非方向性流程按钮是原生 button；
- 焦点顺序与视觉顺序一致；
- `:focus-visible` 轮廓清晰；
- 分数、时间、暂停、得分和结果有文本；
- 状态消息使用节制的 `aria-live="polite"`，每 tick 不播报位置；
- 方向按钮有席位和方向的完整 accessible name；
- 装饰 SVG 节点 `aria-hidden="true"`；
- 不加入闪烁内容。

## 15. 测试合同

### 15.1 逻辑单元测试

至少覆盖：

1. 默认配置、逐字段回退、Unicode code point 限制；
2. 初始状态 schema、深冻结、无可变引用；
3. action exact keys、过期 revision、非法 intent no-op；
4. 150/90 tick 倒计时边界；
5. 八方向加速度、相反轴相消由输入层测试；
6. 斜向与直向速度近似相等且不超上限；
7. 松手后阻尼单调减速；
8. 持旗加速度和速度上限为 75%；
9. 四面墙碰撞位置合法、法向回弹、切向保持；
10. 两个冰岛的四侧与角点碰撞；
11. 极限速度不能穿过 48 px 冰岛；
12. 玩家碰撞对称、最多 4 pass、同心时固定法线；
13. 地图横向/纵向镜像不变量；
14. 单人拾旗；
15. 双人同刻距离不同由近者拾旗；
16. 双人同刻等距无人拾旗；
17. 持旗碰撞掉旗且当 tick 不重拾；
18. 掉旗位置合法、15 tick 锁定；
19. 480 tick 后回中央；
20. 碰撞与进基地同 tick 先掉旗、不计分；
21. 正常得分进入 90 tick 重置；
22. 先到 3 分终局；
23. 90 秒高分获胜与同分平局；
24. 最后 tick 得分有效；
25. 暂停不消耗计时，恢复清成中性倒计时；
26. hostile state：额外字段、accessor、symbol、thenable、NaN、Infinity、越界数值 fail closed；
27. `replaySession` 末态严格相等；
28. 重放的 action 顺序/revision/字段异常被拒绝；
29. 相同意图流在不同渲染帧切分下末态严格一致；
30. `logic.js` 不访问 DOM、时间、随机或网络。

### 15.2 浏览器验收

在 Chromium 中用 `file://` 冷启动，逐项证明：

- 零网络请求、零控制台 error；
- 首屏与开始按钮可用；
- WASD、方向键、斜向和同轴相消；
- 四步键盘矩阵自检；
- 模拟两个 pointer 同时控制两席；
- `pointercancel` / `lostpointercapture` 不粘键；
- hidden、blur、pagehide 和长帧进入暂停；
- 恢复 1.5 秒倒计时，后台时间不消耗；
- 至少完成一局：拾旗、撞落、得分、3 分获胜；
- 90 秒同分能平局；
- 刷新重置；
- 320 px、横竖屏、200% 缩放；
- `prefers-reduced-motion`；
- forced colors；
- 键盘焦点与 accessible name；
- 结果文案包含双方比分，不羞辱输方。

浏览器验收需要保存关键截图或结构化记录；仅有单元测试不能证明输入与布局。

## 16. 安全与隐私

- 不发送网络请求；
- 不采集名字以外的用户输入；
- 默认配置名仅在当前页面内存；
- 不保存键盘自检、比赛、重放或设备信息；
- 所有可配置文案通过 `textContent` 写入；
- 不使用 `innerHTML` 拼接配置；
- 不执行配置中的函数；
- 无摄像头、麦克风、定位、通知、剪贴板或振动权限。

## 17. 借鉴与归属

未来 `ATTRIBUTION.md` 必须包含：

```text
Box2D
- URL: https://github.com/erincatto/box2d/tree/d5935a7a1853eb0f4aca92b369f37929d02c7e11
- Version: v3.1.0
- Commit: d5935a7a1853eb0f4aca92b369f37929d02c7e11
- License: MIT
- Copyright: Copyright (c) 2022 Erin Catto
- Borrowed: fixed time-step principle, distinction between damping and contact
  friction, awareness of tunneling in discrete simulation.
- Not copied: source code, APIs, constants, data structures, solver,
  tests, examples, visual design, or assets.
```

并声明：

- 第一版没有使用任何开源游戏实现；
- 企鹅、旗、基地、冰纹、图标和 favicon 都是仓库内原创 CSS/SVG 几何；
- 若实际实现发生变化，必须在安装前更新声明，不能沿用不真实的“零复制”说法。

## 18. Conditional Go 验收线

只有同时满足以下条件，才可从 Conditional Go 升为最终 Go 并加入 catalog：

1. 逻辑测试全通过，包含重放、同刻规则和 hostile state；
2. 仓库 verify 与 `git diff --check` 通过；
3. `file://` 冷启动和完整比赛通过；
4. 键盘四步矩阵与两个 pointer 路径有证据；
5. 暂停/恢复无偷跑、无粘键；
6. 320 px、200% 缩放、降动效和 forced colors 通过；
7. 无网络、无外部素材、借鉴声明与实际实现一致；
8. 体验测试确认“抢旗—护旗—截旗—回基地”全部真实发生。

若物理调参未达到“低摩擦但可控”，可保持 Conditional 并继续调参；若删除撞落或回基地，直接 No-Go。
