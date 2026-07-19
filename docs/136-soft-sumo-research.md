# A 级“软软相扑”定向调研

- 日期：2026-07-19
- 创意来源：创意池 V02“方块相扑”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`soft-sumo`
- 冻结标题：`软软相扑`
- 结论：进入规格；采用“两枚等质量软垫棋子只靠瞄准、蓄力与冲刺互推，擂台按逻辑 tick 对称缩小，三轮比较站稳次数”的原创同屏对抗玩法

## 1. 为什么它不是已有实时对抗换皮

仓库已经有几类实时对抗：

- “心动拔河”把离散按键次数累积成一条共享位置，没有二维移动、方向或碰撞；
- “光轨围猎”在整数网格上同时转向并留下致命轨迹，接触意味着立即失败，不存在质量、速度和冲量；
- “这一颗我先到”让两颗卫星只切换轨道高低，位置由固定角速度派生，双方不会彼此推动；
- “心跳冲刺”使用手机控制器和主机权威高频输入，属于 C 级局域网玩法。

V02 新增的机制是：双方在同一二维圆形场地内，用对称蓄力冲量改变自己和对方的速度；碰撞不是装饰，而是唯一得分手段；场地收缩迫使双方接触；同一个逻辑 tick 可能出现单方或双方出界，必须原子裁决。

它补齐四个能力：

1. **两体冲量**：位置纠正和速度冲量分离，不把重叠修复误当作额外攻击力；
2. **蓄力释放边沿**：持续按住只增加有限 charge，松开才产生一次冲刺；
3. **对称缩圈**：擂台半径只由 round tick 派生，渲染卡顿不改变战局；
4. **同 tick 原子出界**：先收集双方结果再结算，数组顺序不能决定赢家。

## 2. Brainstorm：四种产品方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| WASD / 方向键持续走动互推 | 像双人俯视动作游戏，持续加速度 | 拒绝；容易退化为绕圈和贴边推挤，触屏还需要完整摇杆 |
| 自转指针 + 每人一个蓄力键 | 等待指针转到方向后按住并释放 | 可行但不采用；一键简单，却把主要技巧变成等待周期 |
| 拖拽任意方向并按住蓄力 | 每半屏一个大触控区，拖向目标、松手冲刺 | 暂缓；触屏自然，但键盘与指针的方向精度不完全等价 |
| 左右瞄准 + 中央蓄力键 | 每人三个原生按钮；按住中央、松开冲刺 | 采用；键盘和触屏同为离散方向 + 固定 tick 蓄力，规则最容易对称测试 |

首版没有持续行走、跳跃、攻击键、生命值、随机道具、角色技能、音频、震动、排行榜、电脑对手或网络房间。两个棋子的质量、半径、转向、蓄力、冷却、阻尼和碰撞参数完全相同。

## 3. 冻结的产品流程

1. `intro`：说明“转向、按住、松开冲刺；把对方推出圈；三轮比较站稳次数”，显示双方键位和“开始第一轮”；
2. `countdown`：固定逻辑倒数，清空所有输入，双方不能提前蓄力；
3. `playing`：双方同时瞄准、蓄力和冲刺，擂台在宽限期后按 tick 缩小；
4. `round-result`：仅一方出界则另一方得 1 分；同 tick 双方出界则本轮平局、双方不得分；
5. 固定完成三轮，不采用“先到 2 分立即结束”，保证双方获得相同轮数；
6. `match-result`：总分高者获胜，同分平局；
7. `restart`：清除输入、速度、蓄力、回放、轮次和成绩，回到与首次加载深相等的 intro。

默认文案方向：

```text
软软相扑
推我可以，先站稳自己。
转向，按住，松开冲出去。
开始第一轮
这一轮，{player} 站得更稳。
一起出圈，也算默契。
再推一局
```

玩家显示名和结尾短句允许在 `config.js` 个性化；规则、数值与胜负不能由文案策略修改。

## 4. 固定 tick 与权威顺序

逻辑固定 60 tick/s；`requestAnimationFrame` 只负责积累真实时间、按固定步长派发 tick 和渲染。每帧最多追赶 5 tick；超过阈值时进入安全暂停并清空 accumulator，不在页面恢复后一次性追赶数秒。

每个 playing tick 的唯一顺序：

1. 读取双方同一时刻的输入快照；
2. 同时更新瞄准、charge tick、释放边沿和 cooldown；
3. 同时向两个速度向量施加本 tick 的冲刺冲量；
4. 对称应用阻尼并积分双方位置；
5. 对唯一玩家碰撞对求解一次：先平分最小位置纠正，再只在相向时施加等质量法向冲量；
6. 从当前 `roundTick` 纯派生同一个 arena radius；
7. 同时计算两位玩家的出界布尔值；
8. 统一结算单方出界、双方出界或继续；
9. 表现层读取 view，不能反写逻辑状态。

任何实现都不得在遍历玩家 0 时立即宣告玩家 1 获胜，否则同 tick 双出界会被错误降格为单方胜利。

## 5. 建议规则常量

规格阶段可微调数值，但必须保持以下结构：

```text
TICK_RATE = 60
ROUND_COUNT = 3
PLAYER_MASS = 1
PLAYER_RADIUS = 48        // 逻辑坐标
ARENA_START_RADIUS = 430
ARENA_MIN_RADIUS = 270
SHRINK_GRACE_TICKS = 480  // 8 秒
SHRINK_END_TICKS = 2700   // 45 秒
MAX_CHARGE_TICKS = 54     // 0.9 秒
DASH_COOLDOWN_TICKS = 39  // 0.65 秒
COUNTDOWN_TICKS = 150     // 2.5 秒
MAX_CATCH_UP_TICKS = 5
DIRECTION_COUNT = 64
```

- 蓄力强度是 `chargeTicks / MAX_CHARGE_TICKS` 的单调整数映射；达到上限后继续按住不再增加；
- 方向使用 64 档单位向量查表，斜向与轴向的速度模长一致；
- 阻尼、最大速度、位置和速度使用整数或定点整数；不得把 DOM 像素作为权威物理状态；
- arena radius 由 round tick 分段线性派生，不存第二份可漂移半径；
- out 判定冻结为 `distance(center, arenaCenter) + PLAYER_RADIUS > arenaRadius`，边界相等仍在场内；
- 到达最小半径后仍无人出界，则保持最小圈继续，不用真实时钟或隐藏 tie-breaker 强制判胜。

## 6. 两圆碰撞的独立实现边界

只需两个等半径、等质量圆体，不引入完整 Matter.js、Box2D、cannon-es 或其他运行依赖。

碰撞检测：

```text
dx = p1.x - p0.x
dy = p1.y - p0.y
colliding iff dx² + dy² < (2R)²
```

接触但不重叠（等号）不做位置纠正。发生重叠时：

1. 用固定方向表选取与中心差点积最大的法线方向；不在运行时依赖随机法线；
2. 将 penetration 的一半沿相反方向分配给双方，保证交换玩家索引后只交换身份；
3. 计算相对速度在法线上的投影；只有双方仍在相向时才施加冲量；
4. 等质量使两个速度变化大小相同、方向相反；恢复系数固定且较低，突出“软垫”而不是弹珠；
5. 位置纠正只改变位置，不增加速度或能量。

若中心完全重合，先使用上一 tick 的非零中心差；仍为零时按稳定玩家 ID 选择固定水平轴。该分支必须无 NaN、无随机，并通过交换身份性质测试。

## 7. 状态、回放与公开 view

建议权威状态：

```text
phase
roundIndex
roundTick
countdownTicks
players[] = {
  x, y, vx, vy,
  aimIndex,
  chargeTicks,
  wasCharging,
  cooldownTicks
}
scores[]
rounds[] = { winnerIndex | null, reason, inputLog[] }
pauseReason
resumePhase
revision
```

每个 tick 的日志只记录规范化输入：

```text
[
  { turn: -1 | 0 | 1, charging: boolean },
  { turn: -1 | 0 | 1, charging: boolean }
]
```

`replayRound(inputLog, spawnVariant)` 从冻结初态重放；state 中的实时位置供 O(1) 推进，回放函数用于测试、结果证明和 JSON 往返，不在每个渲染帧重复重演全部历史。

public view 可公开双方全部当前物理状态，因为本作没有秘密；但不得公开内部 accumulator、未归一化按键集合、调试碰撞法线、历史页面时间或函数引用。view 只给 UI：阶段、分数、当前圈半径、棋子位置/角度、charge/cooldown 比例、合法动作、状态文案和结果。

## 8. 输入与生命周期

### 键盘

- 玩家 0：`KeyA` / `KeyD` 转向，`KeyW` 按住蓄力、松开冲刺；
- 玩家 1：`ArrowLeft` / `ArrowRight` 转向，`ArrowUp` 按住蓄力、松开冲刺；
- 使用 `KeyboardEvent.code`，不使用 `keyCode`；
- `keydown` / `keyup` 只维护 held set，固定 tick 才读取快照；
- 只在比赛激活且命中这六个游戏键时阻止默认滚动，不吞 Tab、Escape 或页面快捷键；
- `blur`、`visibilitychange -> hidden` 清空全部 held input 并暂停。

### 指针 / 触屏

- 每位玩家有独立的“左转 / 蓄力 / 右转”原生按钮组；
- 每个按钮保存自己的 `pointerId`，成功按下后调用 pointer capture；
- 不筛掉 `isPrimary === false`，否则同类触摸只会保留一个主指针；
- `pointerup`、`pointercancel`、`lostpointercapture` 走同一个幂等释放路径；
- 第三指不会抢走已有控制权，滑出按钮仍能可靠释放；
- 控制区 `touch-action: none`，页面其他区域仍允许正常浏览。

### 暂停

- `blur`、hidden、超过最大帧间隔都进入显式 paused；
- 暂停前清空双方 turn/charging，不保留“回来就自动冲刺”的粘滞输入；
- 恢复必须点击“继续”，重新倒数，双方都从中立输入开始；
- reduced-motion 只去掉震屏、拖尾、粒子、脉冲缩放和大幅转场，不能改变物理 tick、位置、缩圈或胜负。

## 9. 公平性不变量

1. 两位玩家全部物理参数深相等；
2. 输入快照同 tick 读取、冲量同阶段施加；
3. 斜向不存在，因为瞄准由同一离散角度表表示；
4. 玩家数组交换后，数值轨迹只交换身份，不能出现 player 0 专属舍入优势；
5. 位置纠正平分，速度冲量等大反向；
6. 同 tick 双出界恒为 draw；
7. 三轮都从镜像对称位置开始，round 2 使用反向 spawn variant，降低固定屏幕一侧的习惯优势；
8. 没有随机数、隐藏道具、临界概率、真实时间或帧率优势；
9. 键盘和触屏最终都只产生同一种 `{turn, charging}` tick 快照；
10. `prefers-reduced-motion`、DPR、viewport 和渲染刷新率不得进入 reducer。

## 10. 固定版本开源调研与零复制边界

核验日期：2026-07-19。下列项目只用于研究机制、固定步进和冲量分层，不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [SteelCantSpeak/robot_sumo](https://github.com/SteelCantSpeak/robot_sumo/tree/b10f099c613501bf11bf0d4c9e7ca238ac8e0e58) | commit `b10f099c613501bf11bf0d4c9e7ca238ac8e0e58`；MIT；Copyright (c) 2024 Steelcantspeak | 方块刚体互推、平台坠落淘汰、固定 `1/60` 世界步长和视觉/物理分层 | Three.js、cannon-es、Socket.IO、CDN、服务器、控制器、位置修改、页面、WIP 占位、随机方块与素材 |
| [Matter.js 0.20.0](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da) | tag `0.20.0`；commit `8a67787735585f02c4b46eabf7b9fcc1c7c321da`；MIT；Copyright (c) Liam Brummitt and contributors | accumulator 固定步进、检测/位置纠正/速度冲量分阶段和追帧上限 | Engine、Runner、Resolver、Bodies、API、源码、测试、示例、渲染器、文档文字和 npm 包 |
| [Box2D-Lite](https://github.com/erincatto/box2d-lite/tree/227b71b6974ea57ab7e96d40f6374287bd6a0e77) | commit `227b71b6974ea57ab7e96d40f6374287bd6a0e77`；MIT；Copyright (c) 2019 Erin Catto | 等质量法向冲量、恢复系数、穿透纠正和纯物理内核的教学边界 | C++ 引擎、求解器、接触结构、示例、变量、测试、构建和逐行公式实现 |

即使这些许可证允许复制，本作仍选择零复制；如果后续实际复制任何实质代码，必须改写声明、随作品分发完整许可证文本并重新做依赖与离线审计。

## 11. 平台规范

- [W3C Pointer Events Level 3 Recommendation](https://www.w3.org/TR/2026/REC-pointerevents3-20260630/) 用于确认 `pointerId`、pointer capture、`pointercancel`、`lostpointercapture` 和 `touch-action`；
- [UI Events KeyboardEvent code Values](https://www.w3.org/TR/2025/REC-uievents-code-20250422/) 用于确认物理键位 `code` 和游戏键盘输入；
- [WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames) 用于确认 rAF 是渲染调度边界，不是权威物理时钟；
- [Media Queries Level 5](https://www.w3.org/TR/2026/WD-mediaqueries-5-20260219/) 用于减少非必要动效；
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 与 [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/) 用于键盘、目标尺寸、非颜色信息、焦点和 forced-colors。

实现标准接口不等于复制规范文字；文档、图表、IDL、示例和测试若被复制仍受 W3C/WHATWG 许可约束。本作只根据公开行为独立实现。

## 12. 明确排除的权利不清案例

[AlexSalamanca/SumoBall](https://github.com/AlexSalamanca/SumoBall/tree/f5c7144dcc537df23396cce4d8b1797a825632d9) 固定提交 `f5c7144dcc537df23396cce4d8b1797a825632d9`，仓库没有 `LICENSE`、`COPYING` 或源码许可头，另含来源未说明的 `Fonts/Sketch3D.otf` 与 `Sounds/bounce.wav`。

虽然它具有圆形平台、距离中心判出界和弹性碰撞，但公开可见不等于获准复制。本作不得复制其 JavaScript、HTML、CSS、字体、音频、数值、数组删除方式、旧 `keyCode` 输入、随机初速度或视觉。它只作为“为什么不能引入”的排除证据。

商业相扑游戏、Mario Party 式滚球、应用商店截图、CodePen 和 itch.io 可玩页也不作为实现来源；不复制名称、人物、擂台造型、规则原句、UI、音效、音乐、截图或 trade dress。

## 13. 无障碍与视觉边界

- 双方同时使用颜色、编号 `01 / 02`、独立织物纹样和玩家名，不只靠珊瑚/海盐色；
- aim 由可见箭头和角度方向表示，charge/cooldown 同时有文字、数值比例和进度条；
- arena 边界用粗环、纹理和“场内/出界”状态区分，forced-colors 下仍有系统边框；
- 所有控制为原生按钮，触控目标至少 48×48px；
- `aria-live` 只播报倒数、冲刺就绪、暂停、单方出界、双方出界和赛果，不逐 tick 播报坐标；
- 1280×800 首屏应同时看到标题、比分、完整擂台、两组控制和主动作；
- 390×844、320×700 允许纵向排布或滚动，但不得横向溢出，双方控制不能互相覆盖；
- 生成背景、棋子 sprite 或装饰失败时，CSS 纯色圆、编号、方向与控制仍能完成比赛；
- 任何生成资产都不承载比分、玩家名、charge、按钮、胜负或碰撞热区。

## 14. 准备者可参与的 5–10 行业务策略

后续 `config.js` 预留 `composeMatchNote(summary)`。它只收到冻结摘要：双方显示名、三轮结果、最终分数、winner index 或平局、默认结语；不接触输入日志、坐标、速度或内部状态。

准备者可用 5–10 行决定：平局时写“一起出圈，也算默契”，某人 2–0 领先时换成专属夸奖，或始终返回一段约好再战的短句。返回空白、非字符串、超长、抛错或试图修改摘要时安全回退。默认实现无需修改即可完成整场。

## 15. 必须通过的 Gate

### 逻辑

1. 相同初态与 tick 输入日志得到深相等终态；30/60/120/144Hz 渲染调度不改变结果；
2. charge 单调、封顶、松开只冲刺一次；快速点击、长按、取消、冷却期和恢复后中立输入均覆盖；
3. 64 档方向模长一致，转向边界循环正确；
4. 位置纠正不改变速度，只有相向时施加等大反向法向冲量；
5. 完全重叠、边相切、低速接触、高速对撞和多 tick 重叠无 NaN、无穿透爆炸；
6. arena radius 只由 round tick 派生，宽限、线性缩圈和最小圈边界精确；
7. 单方出界、另一方出界、同 tick 双出界和边界相等分别正确；
8. 交换玩家数组与输入后，结果只交换身份；
9. 三轮固定、得分派生、平局、换轮、暂停、恢复、旧输入、任意阶段重开和 JSON 往返；
10. view、state、config 与 summary 递归冻结、断开引用且严格拒绝额外字段。

### 输入与浏览器

1. 键盘和两个并发 pointer 都能完成完整三轮；第三指、交换按下顺序、滑出、cancel、lost capture 不粘键；
2. hidden、blur、长帧间隔进入安全暂停，回来不追帧、不自动冲刺；
3. `file://` 经典脚本、相对资源、零 CDN/fetch/XHR/WebSocket/module/storage/audio/传感器；
4. 1280×800、768×1024、390×844、320×700 无横向溢出、控制裁切或不可见主动作；
5. reduced-motion 不改变状态 hash，forced-colors 和禁背景/禁 sprite 仍能完整游玩；
6. 浏览器控制台零 error/warning，快速多键/多指不产生重复冲刺；
7. 概念图与最新浏览器截图在同一 QA 轮用 `view_image` 对照至少五项 fidelity 和首屏文案；
8. README/ATTRIBUTION 固定来源、commit/tag、许可证、权利主体、排除项、零复制和 ImageGen 生产链。

## 16. Go / No-Go

**Go。** “软软相扑”补齐仓库尚未覆盖的“同屏蓄力冲刺 + 两体对称冲量 + 逻辑缩圈 + 同 tick 原子出界”对抗样板。它无需联网、随机、音频、存储、服务端或第三方运行依赖，可以在 A 级经典脚本中完整实现。

进入规格前必须冻结：定点坐标尺度、64 档方向表、冲量和阻尼整数公式、位置纠正舍入、完全重叠 fallback、arena radius 公式、出界等号语义、三轮 spawn variant、action/state schema、输入释放、暂停恢复、配置 summary 和 golden replays。

## 17. 借鉴声明摘要

“软软相扑”的软垫主题、三轮赛制、三键控制、缩圈、冲量实现、状态机、测试、中文文案、界面和生成素材将由本仓库独立原创。Robot Sumo、Matter.js 与 Box2D-Lite 只用于研究抽象机制、固定步进和冲量分层；未复制、改写、翻译、移植、打包或依赖其源码、API、测试、示例、页面、服务器、资源或文案。

SumoBall 因无许可证及素材来源不明只作为排除记录。未来若实质引入任何第三方代码或素材，必须另立变更、保留完整许可证与版权声明，并重新执行离线、性能、输入和浏览器验收。
