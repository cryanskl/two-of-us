# A 级“一起，把家搬进来”可执行规格

- 日期：2026-07-19
- 工作 ID：`moving-home-together`
- 标题：`一起，把家搬进来`
- 规格状态：冻结；实现若偏离，必须先修改本文并独立提交
- 前置调研：[106-moving-home-together-research.md](./106-moving-home-together-research.md)

## 1. 产品一句话与首版边界

两个人各握住沙发一端，在同一台设备上同时给出八向意图，把一个长矩形穿过 S 形门厅转角，最后一起松手放进客厅地毯。

首版只有一个固定关卡、一件动态家具和一个终点。它不包含角色行走、自由拖拽、完整刚体物理、计时排名、失败次数、联网、存档、音频、关卡编辑器或随机内容。

开场说明冻结为：

> 左边握住左端，右边握住右端。一起给方向，沙发才会动；同向往前，错开一点就能转弯。

完成文案冻结为：

> 家放稳了。难的从来不是那道门，是我们愿意一起慢一点。

实现可以在 `config.js` 留出不影响规则的个性化落款 TODO，但不得把空配置、姓名或纪念日设为运行前置条件。

## 2. 坐标、常量与权威状态

### 2.1 世界常量

```text
WORLD_WIDTH = 1000
WORLD_HEIGHT = 680
TICK_MS = 20
MAX_FRAME_GAP_MS = 250
MAX_CATCH_UP_TICKS = 5

ANGLE_COUNT = 256
ANGLE_SCALE = 16384
ANGLE_STEP_DEGREES = 360 / 256 = 1.40625°

SOFA_HALF_LENGTH = 110
SOFA_HALF_DEPTH = 38
COLLISION_GAP = 2
MOVE_UNITS_PER_INTENT = 1
TURN_THRESHOLD = ANGLE_SCALE × ANGLE_SCALE
GOAL_HOLD_TICKS = 12
```

坐标原点在左上，`x` 向右、`y` 向下；`angleIndex = 0` 表示沙发长轴向右，索引增加表示顺时针旋转。所有位置、tick、角度索引和计数器均为整数。

生产代码提交一个 256 项常量方向表：

```text
ANGLE_TABLE[i] = {
  cos: round(cos(2πi / 256) × 16384),
  sin: round(sin(2πi / 256) × 16384)
}
```

该表离线生成并以字面量提交；游戏运行期间不调用 `Math.sin`、`Math.cos`，也不保存浮点角度。

### 2.2 reducer 权威状态

```text
tick
phase                    // intro | playing | paused | complete
pauseReason              // null | manual | hidden | blur | long-frame
centerX, centerY
angleIndex               // 0..255
heldInputs[]             // 按 id 字典序排序
routeStage               // 0 门厅 | 1 转角 | 2 客厅
collisionSerial
lastCollisionObstacleId
insideGoalTicks          // 0..12
completionTick           // null 或整数
announcementSerial
```

`heldInputs` 的条目为 `{ id, side, x, y }`，其中 `side` 只能是 `left/right`，`x/y` 只能是 `-1/0/1` 且不能同时为零。数组排序是状态契约的一部分，不能依赖对象插入顺序。

初始姿态冻结为：

```text
centerX = 190
centerY = 518
angleIndex = 0
routeStage = 0
phase = intro
```

## 3. 原创地图

### 3.1 碰撞矩形

全部障碍为闭合 AABB，格式是 `[left, top, right, bottom]`：

| ID | 名称 | 矩形 |
| --- | --- | --- |
| `wall-top` | 上外墙 | `[0, 0, 1000, 24]` |
| `wall-bottom` | 下外墙 | `[0, 656, 1000, 680]` |
| `wall-left` | 左外墙 | `[0, 24, 24, 656]` |
| `wall-right` | 右外墙 | `[976, 24, 1000, 656]` |
| `block-north-west` | 左上封闭区 | `[24, 24, 360, 380]` |
| `block-south-east` | 右下封闭区 | `[640, 300, 976, 656]` |

这两个封闭区形成一条 S 形安全路线：底部门厅 `y ≥ 380`、中央转角 `360 ≤ x ≤ 640`、顶部客厅 `y ≤ 300`。视觉可以在封闭区内画纸箱、柜子或墙面纹理，但它们不新增碰撞矩形。

所有实体最薄为 24；一个角度格造成的沙发最远角点弧长小于 3，单 tick 平移每轴不超过 2，因此最终姿态 Gate 不可能一次跨过完整实体。

### 3.2 目标地毯

目标闭合矩形为：

```text
GOAL = [690, 90, 950, 230]
```

姿态满足以下全部条件时才算 `insideGoal`：

1. 以定标整数计算的四个沙发角都在目标闭合边界内；角在边界上算进入。
2. `angleIndex` 到 `0` 或 `128` 的环形距离不超过 `2`，即允许水平目标方向 ±2.8125°。
3. 当前姿态通过全部碰撞 Gate。

只让中心进入、包围盒进入或角度正确但角点越界都不算进入。

### 3.3 路线段

路线段只用于提示和一次性播报，不限制玩家移动，也不会倒退：

```text
stage 0 → 1: centerX >= 420 且 centerY >= 390
stage 1 → 2: centerY <= 270 且 362 <= centerX <= 638
```

目标只有在 `routeStage === 2` 时才能结算。生产测试必须保存一段只调用公开 reducer action 的 golden replay，证明从初始姿态可到达目标并完成 12 tick 松手保持。

## 4. 输入合成

### 4.1 公开 action

```text
START
SET_INPUT { id, side, x, y }
RELEASE_INPUT { id }
RELEASE_ALL_INPUTS
TICK { count }
PAUSE { reason }
RESUME
RESTART
```

`TICK.count` 只能是 `1..5` 的整数。非法 action、字段或枚举值在开发测试中抛出 `TypeError`；生产 UI 不派发非法值。

`SET_INPUT` 以相同 `id` 精确替换旧条目，再按 id 排序；`RELEASE_INPUT` 只删除完全相同的 id，迟到 release 对不存在 id 是幂等 no-op。`START`、`PAUSE`、`RESUME`、`RESTART` 都清空输入。

### 4.2 每侧意图

对每一侧分别求所有 held 条目的 `x/y` 和，再把每轴夹到 `-1/0/1`。一侧意图 `(0,0)` 即该侧未发力。

只有左右两侧都非零且 `phase === playing` 时才计算运动；否则姿态完全不变。这个 Gate 使单人单侧无法移动或旋转沙发。

键盘映射冻结为：

| 左端 | 意图 | 右端 | 意图 |
| --- | --- | --- | --- |
| `KeyW` | `(0,-1)` | `ArrowUp` | `(0,-1)` |
| `KeyA` | `(-1,0)` | `ArrowLeft` | `(-1,0)` |
| `KeyS` | `(0,1)` | `ArrowDown` | `(0,1)` |
| `KeyD` | `(1,0)` | `ArrowRight` | `(1,0)` |

键盘 id 为 `keyboard:${code}`。触控 id 为每次按下新生成的 `pointer:${side}:${pointerId}:${generation}`，避免旧指针释放误伤复用 pointerId 的新会话。

### 4.3 平移

```text
deltaX = left.x + right.x
deltaY = left.y + right.y
```

因此两边同向每轴移动 2；一边给对角、一边给直向时可得到每轴 1 或 2；相反方向的对应轴抵消。首版不做向量归一化，公式和轴向差异属于公开规则。

### 4.4 旋转

旋转只使用八向单位向量表。直向分量为 `±ANGLE_SCALE`，对角分量为 `±11585`；零分量为 0。设当前沙发长轴为 `(cos, sin)`，右端与左端的单位意图差为 `(diffX, diffY)`：

```text
turnScore = cos × diffY - sin × diffX

turnScore >= TURN_THRESHOLD  → angleDelta = +1
turnScore <= -TURN_THRESHOLD → angleDelta = -1
其他                         → angleDelta = 0
```

没有旋转余数或惯性。两端同向时差分为零，只平移；两端沿当前长轴的法线反向发力时中心平移抵消并旋转；混合输入可以同 tick 平移和旋转。角度始终按模 256 归一化。

## 5. 微步、碰撞与接触语义

### 5.1 固定微步顺序

令 `steps = max(abs(deltaX), abs(deltaY))`。从 tick 起始中心出发，对 `i = 1..steps` 依次构造：

```text
candidateX = startX + truncTowardZero(deltaX × i / steps)
candidateY = startY + truncTowardZero(deltaY × i / steps)
candidateAngle = startAngle
```

只在候选中心相对上一个候选变化时做 Gate。全部平移微步接受后，再以当前中心和 `startAngle + angleDelta` 构造唯一旋转候选。

每个候选安全则成为新的最后安全姿态；任一候选碰撞时停止该 tick 的剩余运动，保留最后安全姿态，`collisionSerial += 1` 并记录按障碍表顺序命中的第一个 ID。一次 tick 最多增加一次 collision serial。

不计算推出向量、反弹、摩擦、伤害、扣分、失败数或责任方。

### 5.2 OBB/AABB 四轴 Gate

方向表的 `cos/sin` 已按 `ANGLE_SCALE` 定标。对沙发中心 `S`、障碍中心 `O`、障碍半宽高 `hx/hy`，依次检查世界 X、世界 Y、沙发长轴 U、沙发短轴 V。

例如世界 X 轴上的定标中心距离和半径为：

```text
distance = abs(S.x - O.x) × ANGLE_SCALE
sofaRadius = abs(cos) × SOFA_HALF_LENGTH + abs(sin) × SOFA_HALF_DEPTH
obstacleRadius = hx × ANGLE_SCALE
```

U 轴为：

```text
distance = abs((S.x - O.x) × cos + (S.y - O.y) × sin)
sofaRadius = SOFA_HALF_LENGTH × ANGLE_SCALE
obstacleRadius = hx × abs(cos) + hy × abs(sin)
```

Y、V 轴按同样投影计算。任一轴满足：

```text
distance >= sofaRadius + obstacleRadius + COLLISION_GAP × ANGLE_SCALE
```

即判定分离，候选与该障碍安全；四轴都不分离才判定碰撞。等于冻结安全间距时算安全，不使用运行时 epsilon。

障碍矩形边长均为偶数，中心与半宽高均为整数；Gate 全程使用安全整数范围内的 Number 整数运算。

## 6. 终点、优先级与重置

每个 playing tick 按以下固定优先级执行：

1. 派生两侧意图；若双方都非零，执行运动与碰撞。
2. 根据最后安全姿态单调更新 `routeStage`。
3. 若任一侧仍非零，`insideGoalTicks = 0`。
4. 若双方都为零、`routeStage === 2` 且姿态满足完整目标，`insideGoalTicks += 1`，否则归零。
5. 到 12 时切换 `phase = complete`、写入 `completionTick`、清空输入，且后续 TICK 不再改变状态。

碰撞不会直接清零路线段，但只要玩家仍按着控制键，终点保持必然为零。完成要求两边真实松手，而不是仅仅合力相消。

`RESTART` 从任何 phase 返回与首次加载深相等的初始状态；唯一允许由调用层另存的内容是个性化配置，不进入 reducer。

## 7. 固定时间与页面生命周期

`requestAnimationFrame` 仅负责 accumulator：

- 第一帧只记录时间，不派发 tick。
- 正常帧每累计 20ms 派发一个 tick，单帧最多 5 个。
- 帧间隔大于 250ms，或正常 accumulator 需要超过 5 tick，派发 `PAUSE { reason: 'long-frame' }` 并清空 accumulator；不追算丢失时间。
- `document.hidden`、`window.blur` 和 Escape 分别暂停为 `hidden/blur/manual`，同时清空 held input 和 accumulator。
- 恢复必须由可见的“继续一起搬”按钮显式触发；恢复第一帧重新建立时间基线。

30、60、144Hz 只改变渲染次数，不改变相同 tick/action 日志的整数终态。

## 8. DOM、双指与无障碍契约

- 桌面场景用 SVG `viewBox="0 0 1000 680"` 投影权威状态；CSS transform、动画或像素位置不得回写 reducer。
- 沙发、墙、目标地毯、朝向箭头、当前路线段和“为什么没动”都必须有 DOM 文本或语义等价物；不能仅依赖颜色。
- 左右触控盘各是原生可聚焦控件，视觉操作区至少 120×120px，只在盘面设置 `touch-action:none`。
- 每个盘同一时刻只接纳一个活跃 pointerId；左右盘可同时接纳不同手指，不读取或筛选 `isPrimary`。
- `pointerup`、`pointercancel`、`lostpointercapture` 和 document 级兜底释放都调用同一个按会话 id 幂等清理函数。第三指不会抢占已有盘。
- 拖动距离按盘半径量化为八向；中心 18% 半径以内为 `(0,0)` 并从 reducer 释放该会话输入，但 pointer 会话仍保持到结束。
- 只有玩法已开始且命中冻结控制键时调用 `preventDefault()`；文本输入、按钮和未识别按键不拦截。
- `keydown.repeat` 不创建新 id；keyup 按原始 code 精确释放。
- `aria-live` 只报告开始、路线段变化、节流后的碰撞、暂停和完成；坐标、角度和逐 tick 意图不播报。
- 320×700、390×844 和 1280×800 下都必须同时看到场景、当前提示、两端控制入口和暂停按钮，不允许关键控件横向溢出。
- `prefers-reduced-motion` 关闭抖动、漂浮和庆祝位移，不改变 reducer；`forced-colors` 使用系统色、轮廓、文字和图案维持区分。

## 9. 文件与依赖

```text
experiences/co-op/moving-home-together/
  index.html
  styles.css
  config.js
  logic.js
  app.js
  logic.test.js
  assets/
    moving-day-paper.jpg
  README.md
  ATTRIBUTION.md
```

`logic.js` 是无 DOM 的纯规则层，以经典脚本方式暴露冻结命名空间；`app.js` 是唯一 DOM/Pointer/rAF 适配层。所有 URL 为相对路径，禁止 ESM、fetch、CDN、远程字体、远程图片、运行依赖和构建前置。

## 10. 验收矩阵

### 10.1 规则与碰撞

- 初态、START、PAUSE、RESUME、RESTART 深相等语义。
- 单侧全部方向、双方同向、反向、混合和对角输入。
- 顺/逆时针跨过索引 `255 ↔ 0`。
- 0°、90°、斜角、边相切、角相切、恰好 2 间距和小于 2 间距。
- 六个障碍、窄门、转角、平移微步、旋转角点和组合动作。
- 碰撞停在最后安全姿态，一 tick 只记一次，日志重放深相等。
- 目标中心进入但角越界、角度错误、路线未到、仍按键、保持 11/12 tick。
- golden replay 使用生产 action 完成固定关卡；其中每个已接受姿态重新检查全部障碍。

### 10.2 输入与生命周期

- 键盘 repeat、对角多键、未知键、修饰键变化、迟到 keyup。
- 两指先后交换、第三指、拖出、中心死区、pointercancel、lost capture、复用 pointerId。
- Escape、blur、hidden、长帧、catch-up 上限、显式恢复和后台不补算。
- 30/60/144Hz 分片导出相同 action 日志与终态。

### 10.3 页面与仓库

- `file://` 直开无控制台错误、网络请求或模块 MIME 问题。
- 320×700、390×844、1280×800 视觉截图；键盘走到转角；两盘真实双 Pointer 同时影响状态。
- 键盘焦点、可见 focus、live 文案、reduced motion、forced colors 和非颜色信息。
- `npm test`、项目测试、catalog 测试、`npm run verify`、`git diff --check` 全部通过。
- `ATTRIBUTION.md` 明示原创实现、固定研究来源、未复制范围和未来引入代码时的许可义务。

## 11. 借鉴与原创声明契约

实现必须逐字保留以下事实语义，但页面措辞可适配视觉：

1. 玩法、地图、界面、代码、文案和素材为本仓库独立原创。
2. SAT.js、Box2D、dyn4j、p2.js 仅用于理解分离轴、凸形状变换和固定步边界。
3. js_thrustvector、TwoPlayerGames 仅用于理解双人共同影响对象与同机输入的产品问题。
4. 没有复制上述来源或排除项目的源码、API、算法实现、测试、参数、关卡、图形、音频、截图、结构或文案。
5. 不使用商业搬家游戏的名称、角色、家具造型、关卡和品牌表达。

若后续发现实质借用，必须先暂停发布，新增对应许可证文件、来源固定版本、复制范围和修改说明，再重新执行权利与离线验收。
