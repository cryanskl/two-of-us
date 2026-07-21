# A 级“转一点，推一点，刚好回家”可执行规格

规格日期：2026-07-21

对应调研：`docs/176-capsule-docking-research.md`

目标目录：`experiences/co-op/capsule-docking/`

## 1. 完成定义

本作是一份双击 `index.html` 即可完整游玩的同机双人近距离对接游戏。姿态席只控制左右姿态喷口，推进席只控制主推/反推；三段固定航程都必须把同一舱体的相对位置、线速度、船头角度和角速度压入接口窗口，并在四键全松时稳定 30 个 60Hz tick。

实现只有同时满足以下条件才算完成：

- 三组初态、定点整数物理、256 格角度、四键权限、碰撞和六项安全 Gate 与本规格一致；
- 每段至少有一条固定 action fixture 可从初态重放到精确终态，三条金路径都包含两席有效输入；
- 单席穷举、持续压键、擦边高速穿墙、失焦和过期输入均不能错误完成；
- 纯规则层同时支持浏览器经典脚本与 CommonJS，页面不复制物理或 Gate；
- `file://` 下无网络、服务端、构建、存储、随机、音频、传感器或第三方运行依赖；
- 纯键盘、双 pointer、读屏文本、四档响应式、200% zoom 和图片阻断均通过；
- 借鉴声明、测试、bug/learn、目录入口、浏览器证据和全量验证齐全。

本作是归一化的近距离合作游戏，不是轨道模拟器、航天训练软件或真实操作建议。

## 2. 文件边界

| 文件 | 唯一职责 |
| --- | --- |
| `index.html` | 稳定语义结构、首屏说明、无脚本提示与经典脚本顺序 |
| `style.css` | 纸质轨道训练台、响应式、焦点、降动效与高对比 |
| `package.json` | 仅声明 `{"type":"commonjs"}`，使本目录 `.js` 可被 Node 真实 `require()` |
| `logic.js` | 常量、整数物理、微步碰撞、状态机、配置和公开视图 |
| `config.js` | 两席称呼与 5–10 行完成赠言函数；不能修改规则 |
| `app.js` | SVG/DOM 投影、固定步调度、键盘/Pointer 生命周期、焦点和 ARIA |
| `logic.test.js` | 纯逻辑、金路径、独立 oracle、敌对输入和静态边界 |
| `golden-fixtures.js` | 仅测试使用的固定动作段；不由运行页面加载，不生成答案 |
| `README.md` | 本地打开、玩法、信任/隐私边界、定制、借鉴声明、测试 |
| `ATTRIBUTION.md` | 固定来源、许可证、版权、零复制和生成资产证据 |
| `assets/*` | 原创生成背景/材质；损坏时不影响玩法 |

浏览器加载顺序必须是 `logic.js → config.js → app.js`。子目录 `package.json` 不得添加 dependencies、scripts、main 或入口重定向；`logic.js/config.js/golden-fixtures.js/logic.test.js` 必须由 Node 真实 `require()`，另在不提供 `module` 的 VM 中验证浏览器经典全局。禁止 ES module、`fetch()`、Worker、CDN、远程字体、远程媒体和运行时第三方包。

## 3. 冻结常量

### 3.1 席位与控制

```js
SEATS = ["attitude", "thrust"];

CONTROLS = [
  { id: "rotate-left",    seat: "attitude", code: "KeyA", axis: -1 },
  { id: "rotate-right",   seat: "attitude", code: "KeyD", axis:  1 },
  { id: "thrust-forward", seat: "thrust",   code: "KeyJ", axis:  1 },
  { id: "thrust-reverse", seat: "thrust",   code: "KeyL", axis: -1 }
];
```

姿态席动作不能引用推进 control，推进席动作不能引用姿态 control。控制顺序、ID、code 和 axis 是稳定合同。

### 3.2 世界与物理

```js
TICK_RATE = 60;
MAX_TICK_BATCH = 5;

WORLD_WIDTH = 100000;   // 1000.00
WORLD_HEIGHT = 62000;   // 620.00
POSITION_SCALE = 100;
CAPSULE_RADIUS = 2200;  // 22.00

ANGLE_STEPS = 256;
TRIG_SCALE = 16384;
LINEAR_ACCELERATION = 3;
LINEAR_DAMPING = 1;
MAX_AXIS_VELOCITY = 240;
ANGULAR_ACCELERATION = 1;
ANGULAR_DAMPING = 1;
MAX_ANGULAR_VELOCITY = 4;

REQUIRED_STABLE_TICKS = 30;
```

世界坐标原点在左上，x 向右、y 向下；`angleIndex = 0` 指向右侧，索引顺时针增加。

`COS_TABLE` 与 `SIN_TABLE` 是各 256 项的冻结安全整数字面量，在开发期按 `round(cos/sin(2πi/256) × 16384)` 生成、把 `-0` 归一为 `0` 后提交。生产运行不得调用 `Math.sin/Math.cos`。表必须满足：

- `cos[0]=16384 / sin[0]=0`；`cos[64]=0 / sin[64]=16384`；
- `cos[128]=-16384 / sin[128]=0`；`cos[192]=0 / sin[192]=-16384`；
- 四象限与半圈反号对称；所有项为安全整数且绝对值不超过 16384；
- 规范串 `JSON.stringify({cos:COS_TABLE,sin:SIN_TABLE})` 的 SHA-256 必须为 `33ba6aa1ad08759367f945d173cc89d34e5de1177c1c1bc92426568212727573`；Node 测试/验证脚本核对完整哈希，浏览器同步加载自检只核对长度、整数范围、关键象限与对称关系。

### 3.3 空间站 AABB

```js
STATION_RECTS = [
  { id: "upper-hull", xMin: 84000, xMax: 100000, yMin:     0, yMax: 27000 },
  { id: "lower-hull", xMin: 84000, xMax: 100000, yMin: 35000, yMax: 62000 },
  { id: "dock-back",  xMin: 86000, xMax: 100000, yMin: 27000, yMax: 35000 }
];

SAFE_CENTER = {
  xMin: 2200, xMax: 97800,
  yMin: 2200, yMax: 59800
};
```

AABB 边界与舱体圆都按闭集处理；相切即 `hull-contact`。世界安全边界也按闭区间：中心恰在边界合法，越过 1 个定点单位即 `drifted`。

### 3.4 对接 Gate

```js
DOCK_GATE = {
  xMin: 80500,
  xMax: 83500,
  yMin: 29600,
  yMax: 32400,
  maxAbsVelocityX: 50,
  maxAbsVelocityY: 25,
  targetAngleIndex: 0,
  maxAbsAngleError: 5,
  maxAbsAngularVelocity: 1,
  requiredStableTicks: 30
};
```

Gate 的所有 `<=` 都是闭区间。位置、速度、角度、角速度、四键全松与无碰撞同时成立才累计稳定 tick；任一条件失效归零。

## 4. 三个冻结航段

```js
LEGS = [
  {
    id: "turn-home",
    title: "靠近·把船头转回来",
    initial: { x: 18000, y: 31000, vx: 0,  vy: 0,   angleIndex: 32,  angularVelocity: 0 }
  },
  {
    id: "drop-axis",
    title: "修正·从上方落回轴线",
    initial: { x: 18000, y: 18000, vx: 0,  vy: 30,  angleIndex: 16,  angularVelocity: 0 }
  },
  {
    id: "bleed-drift",
    title: "回家·带着余速停稳",
    initial: { x: 22000, y: 42000, vx: 90, vy: -35, angleIndex: 240, angularVelocity: 0 }
  }
];
```

三组初态都在安全区且不碰站体；角差分别为 `32 / 16 / -16`，均严格超出 ±5。第一段无初速；第二、三段即使不推进，既有速度经阻尼后的总位移也不足以到达 x Gate。

## 5. 整数辅助函数

### 5.1 `roundDiv`

所有定点除法使用关于 0 对称的最近整数；正好 `.5` 时远离 0：

```js
roundDiv(n, d) = n >= 0
  ? floor((n + floor(d / 2)) / d)
  : -floor((-n + floor(d / 2)) / d)
```

`d` 必须为正安全整数，`n` 必须为安全整数，且中间加法/乘法仍安全；非法输入返回 `null`。固定边界：`roundDiv(5,2)=3`、`roundDiv(-5,2)=-3`、`roundDiv(4,3)=1`、`roundDiv(-4,3)=-1`。

### 5.2 环形角差

`normalizeAngle(i)` 把安全整数映射到 `0..255`。`shortestAngleDiff(from, target)` 返回 `-128..127`：先算 `normalizeAngle(from-target)`，若大于 127 则减 256。固定 tie：半圈差返回 `-128`，不返回 `+128`。

### 5.3 向零阻尼

`approachZero(v, amount)`：正数减到不低于 0，负数加到不高于 0，0 不变；不越过零。所有参数和结果为安全整数。

## 6. 单 tick 物理顺序

仅 `approaching` 接受 `TICK`。每个子 tick 必须严格按以下顺序：

1. 从两席冻结持有数组派生净 `torque` 与净 `thrust`；同席双按或全松均为 0；
2. 若 torque 为 0，角速度向 0 阻尼 1；否则 `angularVelocity += torque`；再钳制到 `[-4,4]`；
3. `angleIndex = normalizeAngle(angleIndex + angularVelocity)`；
4. 若 thrust 为 0，vx/vy 各自向 0 阻尼 1；否则用**更新后的船头**计算：
   - `ax = roundDiv(COS_TABLE[angleIndex] × 3 × thrust, 16384)`；
   - `ay = roundDiv(SIN_TABLE[angleIndex] × 3 × thrust, 16384)`；
   - vx/vy 加速度后各自钳制到 `[-240,240]`；
5. `controlTicks.attitude` 在 `torque !== 0` 时加一，`controlTicks.thrust` 在 `thrust !== 0` 时加一；任何计数溢出则整个 action no-op；
6. 用更新后的 `(vx,vy)` 从旧位置做整数微步移动和碰撞；
7. 若任一微步越界/撞壳，停在最后安全位置，vx/vy/角速度归 0，四键清空、stable 归 0，进入 `failed`；本 action 剩余 tick 不处理；
8. 无失败时提交新位置，检查六项 Gate；符合则 stable +1，否则归 0；
9. stable 达 30 时原子追加当前航段记录，四键清空，进入 `docked`；本 action 剩余 tick 不处理；
10. 每个实际执行的子 tick 使 `legTick += 1`；TICK action 整体只使 revision +1。

线性阻尼只在净 thrust 为 0 时应用；角阻尼只在净 torque 为 0 时应用。双按会抵消并触发阻尼，不会叠加更大力。

## 7. 整数微步碰撞

设本 tick 位移 `dx=vx, dy=vy`，`steps=max(|dx|,|dy|)`：

- `steps=0` 时只检查当前位置一次；
- 否则对 `i=1..steps` 依次检查：
  - `x_i = oldX + roundDiv(dx × i, steps)`；
  - `y_i = oldY + roundDiv(dy × i, steps)`；
- 相邻候选在每轴最多相差 1 个定点单位；重复候选可以跳过，但不得跳过最后一点；
- 每个候选先查世界边界，再按 `STATION_RECTS` 顺序查圆/AABB；越界优先返回 `drifted`，否则首个命中返回 `hull-contact`；
- 失败视图停在前一个安全候选；若第一个候选失败，停在旧位置。

公开函数签名固定为 `circleIntersectsAabb(circle, bounds)`：

- `circle` 必须是精确 `{x, y, radius}` 普通对象，三项均为安全整数，`radius >= 0`；
- `bounds` 必须是精确 `{xMin, xMax, yMin, yMax}` 普通对象，四项均为安全整数，且 min 不大于 max；
- 合法输入返回 boolean；非法原型、字段、多余 key、accessor、Proxy trap、整数或中间平方和非法时返回 `null`，不抛异常；
- 内部检查站体时从已验证的 `STATION_RECTS` 项构造四字段 bounds 快照，不把 `id` 混入几何 DTO。

几何使用最近点：

```text
nearestX = clamp(cx, rect.xMin, rect.xMax)
nearestY = clamp(cy, rect.yMin, rect.yMax)
dx = cx - nearestX
dy = cy - nearestY
collides iff dx² + dy² <= CAPSULE_RADIUS²
```

最大坐标平方和仍小于 `Number.MAX_SAFE_INTEGER`。不得使用 SVGGeometryElement、Canvas 像素、浮点 epsilon、SAT.js 或第三方碰撞库。

测试必须用独立的高精度有理数/稠密采样 oracle 覆盖四条 AABB 边、四角、相切±1、最大速度斜穿、重复微步、世界边界和优先级。

## 8. Gate 判定

`evaluateDockGate(physics, heldControls)` 的 `physics` 必须是精确普通对象 `{x,y,vx,vy,angleIndex,angularVelocity}`；`heldControls` 必须是精确普通对象 `{attitude,thrust}`，两项为符合 state held 契约的原生数组。合法时返回冻结对象：

```js
{
  positionOk,
  velocityOk,
  angleOk,
  angularVelocityOk,
  controlsReleased,
  collisionFree,
  allOk
}
```

- `velocityOk` 同时要求 `abs(vx)<=50 && abs(vy)<=25`，不计算平方根；
- `angleOk` 使用 `abs(shortestAngleDiff(angleIndex,0))<=5`，能正确处理 255/0；
- `controlsReleased` 要求四个 held 数组项都不存在，不是只看净轴为 0；
- `collisionFree` 要求中心在安全区且圆不碰任一站体；
- `allOk` 是前六项逻辑与；
- 输入非法返回一份全 false 的冻结结果，不抛异常。

## 9. 可解性与冻结金路径

开发期使用与本规格一致的整数公式找到三条金路径。下表的 `STEER n` 是文档简写：测试 fixture 必须展开为固定 PRESS/RELEASE/TICK action 段，不得在测试时运行控制器、搜索器或读取生产 evaluator 生成答案。

| 航段 | 固定控制段 | 总 tick | 精确完成物理状态 |
| --- | --- | ---: | --- |
| 1 | `STEER 0 (12)` → 正推 262 → 反推 63 → 全松 30 | 367 | `x=81537,y=31000,vx=21,vy=0,angle=0,av=0` |
| 2 | `STEER 11 (4)` → 正推 59 → `STEER 238 (17)` → 正推 33 → `STEER 0 (8)` → 正推 149 → 反推 65 → 全松 47 | 382 | `x=80851,y=30762,vx=0,vy=0,angle=255,av=0` |
| 3 | `STEER 237 (4)` → 正推 29 → `STEER 6 (16)` → 正推 43 → `STEER 0 (4)` → 正推 109 → 反推 35 → 全松 146 | 386 | `x=80658,y=31114,vx=0,vy=0,angle=1,av=0` |

三条路线最后连续 30 tick 六项 Gate 全为 true；位置全程不越界，x 最大值不超过最终值，包含 tick 0 初态的第二段 y 范围为 `18000..30762`，第三段为 `31114..42000`，不碰站体。

`STEER target` 的展开 fixture 使用同一固定 bang-bang 意图，但最终提交的测试数据必须只是显式控制段和 tick 数；fixture 生成脚本只可作为开发记录放在 `learn/` 或计划文档，不进入生产目录。

为使规格本身足以重建 fixture，下列 torque run 按每次 `STEER` 的相对 tick 冻结；`-1/+1/0` 分别表示只按左姿态、只按右姿态、两键全松。某 run 持续到下一 run 的 start，最后一个 run 持续到该 STEER 的总 ticks：

| 航段/STEER | torque runs（`start:torque`） | 结束角/角速度 |
| --- | --- | --- |
| 1 / `STEER 0 (12)` | `0:-1, 8:+1, 11:0` | `0 / 0` |
| 2 / `STEER 11 (4)` | `0:-1, 2:+1, 3:0` | `12 / 0` |
| 2 / `STEER 238 (17)` | `0:-1, 7:+1, 9:-1, 10:+1, 15:-1, 16:0` | `239 / 0` |
| 2 / `STEER 0 (8)` | `0:+1, 4:-1, 7:0` | `255 / 0` |
| 3 / `STEER 237 (4)` | `0:-1, 2:+1, 3:0` | `236 / 0` |
| 3 / `STEER 6 (16)` | `0:+1, 6:-1, 8:+1, 9:-1, 14:+1, 15:0` | `5 / 0` |
| 3 / `STEER 0 (4)` | `0:-1, 2:+1, 3:0` | `1 / 0` |

姿态 run 期间净 thrust 固定为 0；“正推/反推/全松”段期间 torque 固定为 0。fixture 必须把 run 边界展开为对应 PRESS/RELEASE，并用 `TICK {count:1..5}` 分片；不同分片只能改变 revision，物理、legTick、controlTicks、记录和最终公共 view（排除 revision）必须一致。

必须另证单席不可解：

- thrust 控制完全缺席时，从三组初态枚举所有姿态 action 到合理状态上界，x 永远无法进入 Gate；
- attitude 控制完全缺席时，角度在阻尼后保持初值 32/16/240，永远不能满足 ±5；
- 四键持续保持任意组合时 `controlsReleased=false`，stable 永远为 0。

## 10. 权威状态

合法 state 只有精确字段：

```js
{
  phase,
  legIndex,
  x, y, vx, vy,
  angleIndex,
  angularVelocity,
  heldControls: { attitude: [], thrust: [] },
  stableTicks,
  legTick,
  controlTicks: { attitude, thrust },
  attempt,
  completedLegs,
  lastResult,
  revision
}
```

每项完成记录只有：

```js
{ legId, attempts, attitudeTicks, thrustTicks }
```

`lastResult` 为 `null` 或：

```js
{ status: "hull-contact", legId, obstacleId }
{ status: "drifted", legId, obstacleId: null }
{ status: "docked", legId, obstacleId: null }
```

公共不变量：

- 所有数字均为安全整数；坐标、速度、角速度和计数在规定范围；
- held 数组必须是 `Array.prototype` 的普通数组、唯一合法 control ID、无 accessor/继承 iterator；
- `completedLegs` 是 LEGS 从 0 开始的连续前缀，attempts/controlTicks 为正安全整数；
- 完成记录 attempts 和两个 control tick 的各自累计和仍为安全整数；
- 每条完成记录 `attitudeTicks>0 && thrustTicks>0`；
- 当前 `controlTicks.attitude <= legTick` 且 `controlTicks.thrust <= legTick`；
- 当前 state 通过圆/AABB 检查；只有 failed 可保留“最后安全位置 + 已归零速度”；
- revision 为 0..MAX_SAFE_INTEGER；有效 action +1，非法 action 同对象 no-op。

阶段不变量：

| phase | 航段/记录 | 物理 | held/stable | 计数与结果 |
| --- | --- | --- | --- | --- |
| `intro` | index 0 / 0 项 | 第一段 initial | 空 / 0 | legTick=0、control=0、attempt=1、last=null |
| `leg-intro` | index=length，0..2 | 当前段 initial | 空 / 0 | legTick=0、control=0、attempt≥1、last=null |
| `approaching` | index=length，0..2 | 安全且不碰站体 | 每席0..2 / 0..29 | legTick≥0、control≤legTick、last=null |
| `failed` | index=length，0..2 | 最后安全位置；保留 angle；vx=vy=av=0 | 空 / 0 | last 为当前段 hull/drift；保留本 attempt 的 legTick/control |
| `docked` | index=length-1，1..3 | `evaluateDockGate(...).allOk` | 空 / 30 | 末记录=当前 control/attempt；保留 legTick/control；last=docked |
| `mission-result` | index 2 / 3项 | 标准纪念姿态 | 空 / 0 | legTick=0、control=0、attempt=1、last=null |
| `complete` | index 2 / 3项 | 标准纪念姿态 | 空 / 0 | 同 mission-result |

`approaching.stableTicks > 0` 时，当前 `evaluateDockGate(...).allOk` 必须为 true、两席 held 必须全空，且 `stableTicks <= Math.min(29, legTick)`。任何有效 PRESS 在写入 held 的同一 action 立即把 stableTicks 归 0，防止两个物理 tick 之间的短按被稳定窗漏采样。

`failed.lastResult` 还必须与失败类型关联：`hull-contact.obstacleId` 必须是 `STATION_RECTS` 中的已知 ID，`drifted.obstacleId` 必须为 `null`；两者的 legId 都必须是当前航段。`docked.lastResult` 必须是当前航段的 `docked`，且 `evaluateDockGate(...).allOk === true`。

标准纪念姿态为 `x=82000,y=31000,vx=0,vy=0,angleIndex=0,angularVelocity=0`，只在从第三段 docked 进入 mission-result 时写入，不参与物理成功判定。

## 11. 动作闭包与七阶段

action 必须是普通对象、精确 own data property、无多余 key：

| phase | action | 前置 | 后置 |
| --- | --- | --- | --- |
| `intro` | `{type:"START"}` | 无 | 第一段 `leg-intro` |
| `leg-intro` | `{type:"BEGIN_LEG"}` | 当前段未完成 | `approaching`，物理保持 initial |
| `approaching` | `{type:"PRESS",seat,control}` | control 属于 seat 且未持有 | 追加到该席 held；stable 立即归 0 |
| `approaching` | `{type:"RELEASE",seat,control}` | control 属于 seat 且已持有 | 从该席 held 移除 |
| `approaching` | `{type:"TICK",count}` | count 为 1..5 | 顺序执行，可能 docked/failed |
| `approaching` | `{type:"SUSPEND"}` | 无 | 清 held/stable/legTick/control/last，重置当前段 initial，回 `leg-intro`；attempt 不变 |
| `failed` | `{type:"RETRY_LEG"}` | attempt 可加一 | attempt+1；清 held/stable/legTick/control/last，重置当前段，回 `leg-intro` |
| `docked` | `{type:"NEXT_LEG"}` | 已完成1..2段 | index+1、attempt=1；清 held/stable/legTick/control/last，载入下一段，回 `leg-intro` |
| `docked` | `{type:"NEXT_LEG"}` | 已完成3段 | 写标准纪念姿态；held/stable/legTick/control 清0，last清空，attempt=1，进 `mission-result` |
| `mission-result` | `{type:"FINISH"}` | 三记录合法 | `complete` |
| `complete` | `{type:"RESTART"}` | 无 | 全新初态，revision=旧值+1 |

合法 action 但不改变 held 的重复 PRESS/RELEASE 是同对象 no-op；TICK 中途 phase 改变后丢弃剩余 count。revision/attempt/legTick/controlTicks 或完成累计将溢出时，整个 action 同对象 no-op。

## 12. 纯规则 API 与敌对输入

浏览器暴露冻结 `window.CapsuleDockingLogic`，CommonJS 暴露同一对象：

```js
{
  SEATS, CONTROLS, LEGS, STATION_RECTS, DOCK_GATE,
  TICK_RATE, MAX_TICK_BATCH, POSITION_SCALE, CAPSULE_RADIUS,
  ANGLE_STEPS, TRIG_SCALE, COS_TABLE, SIN_TABLE,
  DEFAULT_CONFIG, normalizeConfig, resolveCompletionNote,
  roundDiv, normalizeAngle, shortestAngleDiff, approachZero,
  circleIntersectsAabb, evaluateDockGate,
  createInitialState, reduce, getPublicView
}
```

所有返回对象/数组递归冻结并与输入断开引用。所有公开入口使用 descriptor 一次快照，禁止 validate-then-use；`ownKeys/getOwnPropertyDescriptor/getPrototypeOf` 抛错、accessor、数组子类、自定义原型和继承 map/iterator 一律安全拒绝。若 Proxy 返回完整合法 data descriptor 快照，则入口只使用 descriptor.value 并不得再触发它的 `get` trap；测试中的 late-throw `get` 应保持未调用，而不是试图识别 Proxy。

- `reduce(invalidState, action)` 返回全新初态；
- `getPublicView(invalidState, config)` 返回初态安全 view；
- 非法 config 整份回默认；
- 数学/碰撞查询非法输入返回 `null` 或全 false 结果；
- 任一路径不得抛异常、访问 DOM、网络、存储、Date、随机或运行时钩子。

## 13. 公开视图

`getPublicView(state, config)` 是页面唯一规则来源：

```js
{
  phase, legIndex, legCount, currentLeg,
  statusText,
  physics: { x, y, vx, vy, angleIndex, angleError, angularVelocity },
  heldControls, stableTicks, requiredStableTicks,
  gate: { positionOk, velocityOk, angleOk, angularVelocityOk, controlsReleased, collisionFree, allOk },
  gateVisible, gateStatusText,
  attempt, completedLegs, completedCount,
  seats, controls, lastResult, isComplete, summary, revision
}
```

页面不得自行计算速度阈值、环形角差、当前航段、成功、碰撞、稳定计数、主状态或 Gate 呈现。内部完成记录的 `attitudeTicks/thrustTicks` 只用于合作证明；public `completedLegs` 精确投影为 `{legId,title,attempts}`，不得泄露个人控制量。summary 只在 mission-result/complete 存在：

```js
{
  seats: [attitudeName, thrustName],
  legCount: 3,
  totalAttempts,
  retries: totalAttempts - 3,
  legs: ["靠近·把船头转回来", "修正·从上方落回轴线", "回家·带着余速停稳"]
}
```

不公开个人控制 tick、速度评分、燃料、用时、评级、赢家、金路径或未来动作。

`statusText` 精确使用第 16 节阶段主文案。Gate 呈现按阶段冻结：

- intro/leg-intro/approaching：`gateVisible=true`，`gate` 是当前物理的六项计算；allOk false 时 `gateStatusText="六条条件还没有同时安全。"`，allOk true 且 stable 0..29 时为 `六条条件都安全，继续保持 {stable} / 30。`；
- failed：`gateVisible=true`；其他五项保留最后安全位置的计算值，但强制 `collisionFree=false`、`allOk=false`，`gateStatusText="本次接近已经结束，路径未安全。"`；
- docked：`gateVisible=true`、六项全 true、`gateStatusText="已经稳定 30 / 30。"`；
- mission-result/complete：标准纪念姿态不参与新 Gate，`gateVisible=false`、`gateStatusText=""`；页面把 persistent Gate 与稳定区设为 hidden 并移出可访问树。

failed 的 swept 失败候选只由 lastResult 表达，不写回权威坐标；因此必须使用上述 public 呈现覆盖，不能从最后安全位置重新计算出“路径安全”。

## 14. 配置与学习钩子

```js
window.CAPSULE_DOCKING_CONFIG = {
  seats: ["你", "TA"],
  composeCompletionNote(summary) {
    return `${summary.seats[0]}和${summary.seats[1]}，转一点，推一点，终于把这一程稳稳接回家。`;
  }
};
```

- 两个称呼去 Unicode 首尾空白后各 1–12 字素，且不得相同；
- composer 必须是函数，否则整份原子回默认；
- `resolveCompletionNote` 用断开引用、递归冻结 summary 调用；
- 抛错、thenable、非字符串、空白或超过 120 字素均回退默认；
- 结果只进入 `textContent`；不能覆盖物理、键位、航段、Gate、资产路径或安全文案；
- mission-result 只创建共同汇总；complete 才调用 composer 并创建完成赠言，未来赠言不得提前进入 hidden DOM、template、data attribute 或 accessible name；
- 该 5–10 行函数是用户可学习和个性化的业务选择，不修改也能完整游玩。

## 15. 浏览器调度与输入生命周期

### 15.1 固定步

- 单一 rAF 只在 `phase === "approaching" && document.visibilityState === "visible" && document.hasFocus()` 时累积；
- 每 tick 为 `1000/60` ms；每帧最多派发 `TICK {count:5}`；
- 超出五步的积压丢弃并重置基准；进入 approaching 后的首次帧、窗口重新获得焦点和 resize 都只重置基准、不补算；
- 每次启动循环创建新的 `rafGeneration`；任一退出 approaching、blur、hidden、pagehide 都先使旧 generation 失效，再取消帧并清 accumulator/baseline；已排队回调必须先核对 generation 与 phase，失配时不得 TICK 或重启循环；
- focus、visible 与 BFCache `pageshow` 只在当前仍 approaching 时建立新 generation 与新基准，恢复首帧不补 tick；既定 SUSPEND 已回 leg-intro 时不得自动续跑或抢焦点；
- reduced-motion 只改变表现，不改变规则 tick；
- 不用 CSS animationend、SVG transform、音频或图片帧推进规则。

### 15.2 键盘

- 每次进入 approaching 创建新的 `inputEpoch`；页面为每个 control 维护带 epoch 的来源集合：物理键盘来源为 `keyboard:<code>`，聚焦控制按钮的 Space/Enter 来源为 `button-key:<control>:<code>`，pointer 来源为 `pointer:<pointerId>`；来源总数从0到1才派 PRESS，从1到0才派 RELEASE；
- 只有当前 approaching epoch 可创建四个物理控制来源；非 approaching 的物理 control key/pointer/click 不登记且不 preventDefault，阶段 `.primary-action` click 不属于 inputEpoch；
- 未跟踪的 `keydown` 若为 repeat、含 Ctrl/Meta/Alt、IME composing 或来自可编辑元素，不进入玩法；当前 inputEpoch 内已经跟踪的 `keyup` 不受 modifier、composing 或 target 过滤，必须先移除来源并在需要时派 RELEASE；phase/epoch 已退出时来源已由统一清理移除，迟到 keyup 只安全 no-op，不向 reducer 派 RELEASE；
- 聚焦四个控制 button 时，Space/Enter 的 keydown/keyup 按同一边沿规则表达按住/松开；二者阻止默认 click/滚动，浏览器合成的 click 不再派动作；
- 只在 approaching 且事件属于 A/D/J/L，或焦点位于控制 button 且事件属于 Space/Enter 时 preventDefault；
- Escape 在 approaching 派发 SUSPEND，其余阶段不抢占；
- 自动 failed/docked、SUSPEND、blur、hidden、pagehide 都先使 inputEpoch 失效，再清 DOM 键/pointer 映射、fallback、pressed 样式与 accumulator；阶段已退出时只清本地来源，不向 reducer 派过期 RELEASE。

### 15.3 Pointer

- 每个控制 button 在合法 `pointerdown` 捕获 pointer：mouse 只接受 `button===0`，touch/pen 不按 `isPrimary` 过滤；控制区使用 `touch-action:none`、`user-select:none` 并阻止长按菜单；
- pointer ID 绑定唯一 seat/control；同一 control 可被多个来源持有；只有 pointer capture 成功，或 document 级 up/cancel fallback 成功安装后，才登记来源并派 PRESS；两者都失败时不开始；
- up/cancel/lost capture/fallback 进入统一结束器：先原子取出并删除来源，只有首个结束事件拥有 RELEASE 权，之后移除 fallback；
- 同席两 pointer 可同时按两键，规则按净轴抵消；click 不重复派发；
- 每键至少44×44px，主动作至少48px；不依赖压力、拖动、hover、长按时长或双击。

## 16. 页面、文案与可访问性

页面至少有一个 main、题名、短规则、当前航段/尝试、完整 SVG 舞台、四项遥测、六项 Gate、两个等权控制组、稳定进度、live region、有序完成日志和每阶段最多一个可见 `.primary-action`。

初始化前交互根默认隐藏或禁用，app 成功读取 logic/config 后才设置 ready。阶段面板只创建当前标题、`statusText` 和当前主动作；舞台、遥测、Gate、两席控制、稳定进度和完成日志保持 persistent 节点身份。四个控制 button 只在 approaching 可用，其他阶段原生 disabled 且 `aria-pressed=false`。完成日志只创建已完成前缀；mission-result 才创建汇总，complete 才创建赠言，未来内容不得预埋。

固定主文案：

| phase | 文案 |
| --- | --- |
| intro | `一边只管转，一边只管推。把位置、速度、角度和旋转一起放进安全窗。` |
| leg-intro | `第 {n} 段：{title}。先看船头和余速，再一起接近。` |
| approaching | `接口就在右边；轻推、回正、收住余速。` |
| failed/hull | `舱体碰到接口外壳了，这一段重新靠近。` |
| failed/drift | `舱体飘出近距安全区了，这一段重新靠近。` |
| docked | `位置、速度和船头一起稳住了。` |
| mission-result | `三次靠近，都被我们稳稳接住。` |
| complete | `对接完成，这一程一起回家。` |

主动作文字与 action 固定：

| phase | 可见按钮 | action |
| --- | --- | --- |
| intro | `开始对接` | `START` |
| leg-intro | `开始第 {n} 段` | `BEGIN_LEG` |
| approaching | `暂停这一段` | `SUSPEND` |
| failed | `重新靠近` | `RETRY_LEG` |
| docked 1–2 | `进入下一段` | `NEXT_LEG` |
| docked 3 | `查看共同记录` | `NEXT_LEG` |
| mission-result | `收下这次对接` | `FINISH` |
| complete | `再对接一次` | `RESTART` |

- 四张遥测卡固定为：位置 `x / y`、线速度 `vx / vy`、船头角差 `angleError`、角速度 `angularVelocity`，整数单位分别写作 `距离单位`、`距离单位/tick`、`角度格`、`角度格/tick`，不得把 `(vx,vy)` 合成为另一套标量规则；
- Gate 可见阶段始终显示六条：`positionOk → 位置进入接口`、`velocityOk → 线速度收住`、`angleOk → 船头对准`、`angularVelocityOk → 角速度收住`、`controlsReleased → 四键已松开`、`collisionFree → 路径无碰撞`，逐条显示 `安全/未安全`；`allOk` 只控制 `gateStatusText` 和稳定进度，不作为第七条；
- 实时文本同时说明 `横向位置 / 纵向位置 / 线速度 / 船头角差 / 角速度 / 已松手`；
- SVG 航向、颜色、喷焰不是唯一信息；
- 两席用文字、位置、线型和色彩多重编码；
- live region 只播开始、每个 attempt 的 Gate 第一次全绿、失败、对接、换段、暂停和完成，不逐 tick 读数；精确事件句以 [207](./207-capsule-docking-brainstorm.md) 第 8 节为准。Gate latch 以 attempt 为作用域，在 RETRY_LEG、NEXT_LEG、RESTART 时重置；stable 打断后同 attempt 不重复播报；
- 完成日志只说第 n 段、名称、共同完成和尝试次数，不显示两席控制量；
- 四个控制 button 的 accessible name 固定包含席位、动作和物理键，例如“姿态席，向左转，A”；`aria-pressed` 只由权威 `view.heldControls` 投影，非 approaching 一律为 false，不以本地 pointer 样式推断；
- 焦点转换固定如下；所有可编程聚焦标题使用 `tabindex="-1"`。自动 failed/docked 在 DOM 更新后的单次微任务中聚焦标题，微任务捕获 `{revision,phase}` token，执行前失配即放弃；物理 tick 不移动焦点：

| action/自动转换 | 转换后的焦点 |
| --- | --- |
| 初次载入、RESTART | intro 标题 |
| START、NEXT_LEG | leg-intro 标题 |
| BEGIN_LEG | 舞台说明（`tabindex="-1"`） |
| 自动 failed、自动 docked | 对应阶段标题（`tabindex="-1"`） |
| SUSPEND、RETRY_LEG | leg-intro 标题 |
| 第三段 NEXT_LEG、FINISH | mission-result / complete 标题 |
| window blur 后 | 不主动抢回焦点；用户回到页面后仍处于 leg-intro，下一次 Tab 从阶段动作继续 |

- forced-colors 用系统色、边框、线型和文字；reduced-motion 关闭喷焰抖动、星流和缓动；
- `main` 直接子级 DOM 顺序固定为：页头 → 阶段面板（阶段标题、说明、唯一主动作）→ 舞台 → 遥测 → Gate → 姿态席 → 推进席 → 稳定进度 → 完成日志 → live region；移动端不使用 CSS `order` 或 `display:contents` 反转，DOM 与视觉顺序一致；
- 200% zoom、读屏和纯键盘均可完成。

无 JavaScript 固定只显示 H1、固定短规则、无答案静态观察窗轮廓、`请开启本地 JavaScript 后再开始对接；页面不会联网。` 与 `这是归一化的合作游戏，不是航天训练或真实操作建议。`。不得显示伪遥测、Gate、控制、日志、称呼、赠言、金路径或未来状态。

## 17. 视觉与响应式 Gate

视觉冻结为“纸质近地轨道训练台”：深炭蓝观察窗、暖灰站体、珊瑚红姿态喷口、青绿主推/反推、象牙白仪表；使用原创几何，不仿 NASA/SpaceX 标志、任务徽章、国旗或现役接口。

| 视口 | 必须通过 |
| --- | --- |
| 1504×1046 | 无横纵滚动；标题、舞台、Gate、两席控制和主动作同屏 |
| 1280×800 | 无横向滚动；舞台≥720×446；即时仪表与主动作同屏 |
| 390×844 | 舞台完整宽高比；控制可上下排但 DOM/视觉顺序一致；四键≥44px |
| 320×568 | 内容296–304px；零横向溢出；允许纵滚；仪表保留全称 |

上表四档尺寸只在 100% zoom 验收。另在 1280×800 与 1504×1046 以 200% zoom 验收单列回流、零横向滚动、允许纵滚；舞台随容器缩小并保持完整宽高比，不再套用 100% 的 `≥720×446` 最小值。

所有适用档位还检查图片阻断、reduced-motion、forced-colors、焦点环、双 pointer、四按钮中心 elementFromPoint、文本截断和控制台/网络。移动端断言上述直接子级 DOM 顺序与视觉顺序一致。

完整概念获用户明确接受前，禁止创建 `experiences/co-op/capsule-docking/` 生产目录中的代码、测试、样式或资产。视觉产物链固定为 [208 视觉简报](./208-capsule-docking-imagegen-brief.md) → `docs/assets/capsule-docking/` 原图与台账 → `docs/209-capsule-docking-design-proposal.md` 用户接受状态、design-system inventory 与 fidelity ledger → 端到端实施计划。概念必须明确覆盖 intro、至少两个差异初态的 leg-intro、approaching 部分 Gate、allOk 且 stable 0..29、hull-contact、drifted、docked、mission-result、complete，以及桌面/移动/小屏、200% zoom、图片阻断、reduced-motion、forced-colors 与无脚本。

## 18. 借鉴与资产声明

README/ATTRIBUTION 必须写明：

- 本作的双席权限、航段、数值、积分、碰撞、Gate、状态机、代码、界面、文案和生成资产独立实现；
- Gymnasium、p2.js、SAT.js、Phaser 只研究抽象机制，不是依赖；
- 固定 commit、许可证、版权与排除范围和 `docs/176-capsule-docking-research.md` 一致；
- 不复制源码、API、物理常量、奖励、动作/观察空间、求解器、测试、界面、品牌或素材；
- NASA 资料只用于说明状态类别，不复制文档、图表、参数或训练结论；
- ImageGen 设计锚点逐项记录提示词、生成日期、尺寸、格式、SHA-256、第三方输入“无”；锚点可用非权威 UI 表意布局与状态，但不作为精确文案或行为证据。进入生产运行目录的图片资产不得烘焙文字、按键、Gate 或答案。

## 19. 测试矩阵

逻辑：

- 常量、递归冻结、三初态、trig 表校验、CommonJS/浏览器同构；
- 子目录 `package.json` 精确内容、Node 真实 `require(logic/config/fixtures)` 与无 module 浏览器 VM；
- roundDiv 正负半值、角度跨0/半圈、阻尼、钳制、双按抵消；
- 更新顺序：新角度施力、无输入才阻尼、轴速度独立钳制；
- circle/AABB 边角/相切±1、世界边界、最大斜速微步、失败优先级；
- Gate 六布尔、闭区间、255/0 角差、仍按键不累计、打断归零、30 tick；
- 三条固定 fixture 精确 367/382/386 tick 与终态、最后30 tick、两席 controlTicks>0；
- 无推进/无姿态/持续压键不可完成；失败/重试、SUSPEND不增 attempt、三段/纪念态/重开；
- action schema、畸形 state、数组子类/custom prototype、accessor、继承 iterator/map、Proxy snapshot trap；合法 data descriptor Proxy 的 late-throw `get` 不得被调用；
- 计数/乘法/累计安全整数上界；非法 state/config fallback 全程不抛；
- JSON action log 重放到字节等价公共 view；view 无内部引用、个人统计、答案或搜索器；
- public completed DTO 不含 control ticks；statusText、gateVisible/gateStatusText 覆盖七阶段与 allOk+stable 0..29；failed Gate 覆盖和 terminal hidden 精确；
- 生产目录无网络、存储、随机、Date、DOM物理、音频、传感器、第三方运行 import。

浏览器：

- `file://` 三段完整金路径、至少一次 hull/drift 重试、mission、complete、restart；
- 纯键盘与双 pointer 分别游玩；同 control 键盘+pointer、双 pointer 的来源边沿正确；双按抵消、pointercancel、捕获失败、blur/hidden/pagehide 不 stuck；
- 当前 epoch 的已跟踪 keyup 在 modifier、editable 或 IME 改变后仍释放；epoch 已退出的迟到 keyup 安全 no-op；聚焦 button 的 Space/Enter 可按住/松开；
- 七阶段、八个主动作分支的精确文字/action；非 approaching 四控制原生 disabled；persistent 节点身份不重建；phase-owned 汇总/赠言与未来内容 absence；
- Gate 六字段文本、每-attempt live latch、207 第 8 节精确事件句、日志、阶段焦点表、aria-pressed、主动作唯一；mission-result/complete 的 Gate 与稳定区 hidden 且不在可访问树；
- inputEpoch/rafGeneration 迟到事件、capture 与 fallback 竞态、旧焦点微任务、pageshow 新基准均不得跨阶段生效；
- 无 JavaScript 五项静态内容与 controls/Gate/log/result absence；
- 四档 100% 视口、两档 200% zoom、单列回流、DOM/视觉顺序、图片阻断、reduced-motion、forced-colors；
- 四键 elementFromPoint、零横向溢出、零 console error、零失败请求；
- 最新截图与接受概念图逐项 fidelity ledger；
- 项目测试、catalog 测试、`npm test`、`npm run verify` 全绿。
