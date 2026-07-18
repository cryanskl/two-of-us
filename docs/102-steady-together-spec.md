# A 级“稳稳地，和你一起向前”实现规格

> 状态：作品边界、配置、整数动力学、输入归属、检查点、生命周期、可访问视图和验收 Gate 冻结。固定来源与零复制声明见 [`101-steady-together-research.md`](./101-steady-together-research.md)。

## 1. 作品定义

“稳稳地，和你一起向前”是一款两人同机的连续合作体验。左边托起横梁左端，右边托起横梁右端；只有双方提供足够支撑，并把滚珠稳定在中央，小车才会穿过左偏、右偏、回正三段坡路抵达终点。

- 分类：`co-op`；
- 目录：`experiences/co-op/steady-together/`；
- 启动等级：A；
- 支持：`file://` 直接打开与仓库静态服务器；
- 运行依赖：无；
- 网络、存储、账号、音频、振动、传感器、相机、麦克风、定位：均不使用；
- 共同目标：通过两个检查点，在终点保持复合稳定条件 30 tick；
- 不设置分数、赢家、生命、失败次数、排行榜、随机难度或感情评价。

## 2. 文件边界

```text
experiences/co-op/steady-together/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── balance-journey.webp
    └── favicon.svg
```

- `config.js`：称呼、开场和结尾文案，以及带安全默认值的学习 TODO；
- `logic.js`：配置清洗、整数动力学、不可变 reducer、视图与重放；
- `app.js`：rAF accumulator、键盘/Pointer、SVG 投影、阶段 DOM、焦点和生命周期；
- `logic.test.js`：公式边界、合作不可退化、检查点、终点、输入归属、暂停、视图和重放；
- `ATTRIBUTION.md`：固定来源、许可证、生成资产与完整零复制声明；
- `assets/`：只放本项目原创无字资产；缺失时 CSS/SVG 回退保留全部规则信息。

所有脚本使用经典 `<script>`。不得使用 module、`fetch()`、XHR、WebSocket、Worker、Service Worker、浏览器存储、外部字体、CDN 或远程资源；整个目录复制到任意相对路径后仍应运行。

## 3. 固定规则常量

```js
TICK_MS = 20;
MAX_FRAME_GAP_MS = 500;

LIFT_MIN = 0;
LIFT_MAX = 1000;
LIFT_RISE_PER_TICK = 48;
LIFT_FALL_PER_TICK = 32;

TILT_MIN = -300;
TILT_MAX = 300;
TILT_STEP_PER_TICK = 8;

BALL_POSITION_MIN = -6000;
BALL_POSITION_MAX = 6000;
BALL_VELOCITY_MIN = -72;
BALL_VELOCITY_MAX = 72;

SUPPORT_SUM_MIN = 1240;
TARGET_POSITION_ABS_MAX = 500;
TARGET_VELOCITY_ABS_MAX = 18;
SAFE_TILT_ABS_MAX = 48;
STABLE_WARMUP_TICKS = 12;

ROUTE_END = 2400;
ROUTE_PROGRESS_PER_TICK = 3;
CHECKPOINTS = [0, 800, 1600];
FINAL_HOLD_TICKS = 30;

COURSE_SEGMENTS = [
  { id: "lean-left", start: 0,    end: 799,  bias: 84 },
  { id: "lean-right", start: 800, end: 1599, bias: -84 },
  { id: "come-home", start: 1600, end: 2400, bias: 0 }
];
```

符号约定：`tilt > 0` 表示左端较高、滚珠趋向右侧；`ballPosition > 0` 表示滚珠位于中心右侧。左端升力大于右端会增加正倾角，当前坡势 bias 也进入目标倾角。

所有数值均为无单位定标整数，只服务于确定性规则；SVG 可以把它们映射为像素和角度，但渲染值绝不能反馈给 reducer。

## 4. 配置契约

```js
window.STEADY_TOGETHER_CONFIG = {
  leftName: "左边的你",
  rightName: "右边的你",
  intro: "托住两端，把滚珠稳在中央，我们才会一起向前。",
  finalTitle: "稳稳地，和你一起向前",
  finalMessage: "不是从来不摇晃，是每次偏离时，我们都愿意把彼此接回来。",
  signature: "留给并肩走的我们"
};
```

清洗规则：

- leftName/rightName 各最多 12 个 Unicode code point；
- intro 最多 72 个、finalTitle 最多 28 个、finalMessage 最多 108 个、signature 最多 24 个；
- 只接受字符串，去除首尾空白，空值与错误类型回退默认；
- 不解析 HTML，页面只以 `textContent` 输出配置；
- 清洗结果深拷贝并冻结，修改原对象不得污染状态。

`config.js` 保留一个有完整默认返回值的 5–10 行 `composeSteadyMessage(view)` TODO。用户可利用双方称呼、通过的检查点和终态方向写自己的赠语；不修改时作品仍完整可玩，TODO 不得进入物理规则或阻塞终局。

## 5. 权威状态

```js
{
  phase: "intro" | "playing" | "release-gate" |
    "ready" | "paused" | "complete",
  readyKind: null | "retry" | "resume",
  tick: 0,
  active: {
    left: null | { inputId: "key:KeyA", pressedAtTick: 12 },
    right: null | { inputId: "pointer:7", pressedAtTick: 18 }
  },
  leftLift: 0,
  rightLift: 0,
  tilt: 0,
  ballPosition: 0,
  ballVelocity: 0,
  routeProgress: 0,
  stableTicks: 0,
  finalHoldTicks: 0,
  checkpoint: 0,
  reachedCheckpoints: [],
  feedback: null | "support-needed" | "center-needed" |
    "settle-needed" | "checkpoint" | "fell" | "final-hold",
  pauseReason: null | "manual" | "hidden" | "blur" | "stalled",
  pausedFrom: null | "playing" | "release-gate" | "ready",
  attemptCount: 1,
  revision: 0,
  config: { /* 清洗并冻结 */ }
}
```

不变量：

1. 每席同时最多一个活动 inputId，同一个 inputId 不能占两席；
2. leftLift/rightLift、tilt、ballPosition、ballVelocity 与 routeProgress 始终在公开范围内；
3. checkpoint 只能是 `0/800/1600`，且为不大于 routeProgress 的最大已到达检查点；
4. reachedCheckpoints 只能是 `[800, 1600]` 的严格前缀，不重复、不倒退；
5. stableTicks 条件失效后立即归零；routeProgress 只增加或在掉落时回到 checkpoint；
6. finalHoldTicks 只在 routeProgress 已到终点且复合稳定条件成立时增加，否则归零；
7. release-gate 与 paused 不推进物理；complete 冻结终态；
8. revision 只在有效状态变化时递增；非法 action 返回原状态引用；
9. reducer 不读取 DOM、CSS、viewport、真实时间、动画或随机数，不修改输入 state/action。

## 6. 纯逻辑 API

`logic.js` 通过浏览器全局 `STEADY_TOGETHER_LOGIC` 和 CommonJS 暴露：

```js
TICK_MS
MAX_FRAME_GAP_MS
COURSE_SEGMENTS
CHECKPOINTS
DEFAULT_CONFIG
sanitizeSteadyConfig(rawConfig)
validateCourseSegments(segments)
getCourseSegment(routeProgress)
createSteadyState(rawConfig)
reduceSteady(state, action)
getSteadyView(state)
classifySteadyKey(code, edge, repeat)
replaySteady(rawConfig, actions)
```

### 6.1 Action

```text
START
RETRY
PRESS { side, inputId }
RELEASE { inputId }
TICK { ticks }
INTERRUPT { reason }
RESUME
RESTART
```

`ticks` 只接受正整数；side、inputId 与 reason 只接受白名单形状。未知、畸形、阶段不允许或不会改变状态的动作返回原引用。

### 6.2 阶段入口

- START 只在 intro 有效，进入 playing，使用中心、静止、零升力和路线起点状态；
- 掉落时进入 release-gate，保留 active 只用于精确释放，物理状态立即回到最近检查点的中心静止状态；
- release-gate 双席均释放后进入 ready/retry；RETRY 进入 playing 并增加 attemptCount；
- RESUME 从 paused 回到 ready/resume；之后用 RETRY 从检查点开始，不能继续半个 tick；
- RESTART 从任意阶段创建全新 intro，清空检查点、尝试次数和输入。

### 6.3 物理输入

PRESS 只在 playing 接受：

1. side 必须为 left/right，inputId 必须为非空、长度不超过 80 的字符串；
2. 重复 inputId、该席已有输入，或 inputId 已占另一席时返回原引用；
3. 有效输入记录 `{ inputId, pressedAtTick }`，下一次 TICK 才改变升力；
4. 键盘和 Pointer 使用相同 action，不存在设备专属规则。

RELEASE 按完全匹配的 inputId 查找席位：

- playing 中清除该席输入，下一 tick 开始回落；
- release-gate 中先清除匹配项，双方均空后进入 ready/retry；
- 未知或迟到的旧 RELEASE 返回原引用，不能释放后来建立的新输入；
- paused/ready/complete 中不保留 active，RELEASE 不改变状态。

### 6.4 单 tick 的唯一结算顺序

每个 TICK 必须逐 tick 消费；一次 tick 与下列伪代码等价：

```text
1. leftLift/rightLift 分别向本席目标移动：
   active ? LIFT_MAX : LIFT_MIN
   上升最多 48，回落最多 32

2. segment = getCourseSegment(routeProgress)
   targetTilt = clamp(round((leftLift - rightLift) * 3 / 10)
                      + segment.bias, -300, 300)

3. tilt 向 targetTilt 移动，单 tick 最多 8

4. ballVelocity = clamp(round((ballVelocity * 15 + tilt) / 16),
                        -72, 72)

5. ballPosition += ballVelocity

6. 若 abs(ballPosition) > 6000：立即执行掉落结算并停止本 action

7. stable =
     leftLift + rightLift >= 1240
     && abs(ballPosition) <= 500
     && abs(ballVelocity) <= 18
     && abs(tilt) <= 48

8. stable ? stableTicks += 1 : stableTicks = 0

9. stableTicks >= 12 且 routeProgress < 2400 时：
   routeProgress = min(2400, routeProgress + 3)
   若首次跨过 800/1600，则更新 checkpoint 和 reachedCheckpoints

10. routeProgress == 2400 时：
    stable ? finalHoldTicks += 1 : finalHoldTicks = 0
    finalHoldTicks == 30 时进入 complete

11. tick += 1
```

所有除法使用对称的“最接近整数、恰好 `.5` 远离零”舍入帮助函数，禁止依赖语言对负数 `.5` 的隐式差异。clamp 和 moveToward 也必须为纯函数。

### 6.5 掉落与检查点

掉落在位置更新后、稳定和路线更新前结算：

- routeProgress 回到 checkpoint，不撤销 reachedCheckpoints；
- leftLift/rightLift/tilt/ballPosition/ballVelocity/stableTicks/finalHoldTicks 全部归零；
- feedback=`fell`，attemptCount 暂不增加；
- 任一 active 仍存在则进入 release-gate；理论上的无活动掉落直接进入 ready/retry；
- 本次 TICK 剩余 ticks 立即丢弃，不在重置状态继续推进；
- 检查点起点的 course bias 由回退后的 routeProgress 重新派生。

### 6.6 稳定进度与终点优先级

- warmup 的前 11 tick 只显示“正在稳住”，不增加路线；第 12 tick 开始增加 3；
- routeProgress 跨过检查点时先 clamp 到合法整数，再追加一次 checkpoint；同一 tick 不进入特殊不可操作阶段；
- 到达 2400 的同一个稳定 tick计为 finalHold 的第 1 tick；
- 终点期间任一稳定子条件失败会把 finalHoldTicks 归零，但路线保持 2400；
- 掉落优先于终点；complete 只可能来自未掉落且连续稳定 30 tick 的状态；
- complete 保存最终物理状态供画面投影，之后 PRESS/RELEASE/TICK 均无效。

### 6.7 TICK 分片与长帧

- `TICK { ticks }` 逐个调用单 tick 规则，完成、掉落或阶段改变后立即停止；
- 在 action 边界一致的前提下，`TICK(1) × N` 与 `TICK(N)` 深相等；
- app 每帧最多派发累积的整数 ticks，帧余量小于 20ms 时保留到下一帧；
- 单帧 `delta > 500ms` 不派发 TICK，改为 `INTERRUPT { reason: "stalled" }` 并清空 accumulator；
- hidden、blur 与 manual pause 同样不补跑后台时间。

### 6.8 暂停与恢复

- INTERRUPT 对 playing/release-gate/ready 有效；reason 白名单为 manual/hidden/blur/stalled，其他值规范为 manual；
- 中断清空 active、升力、倾角、滚珠位置/速度、稳定保持与 final hold，并把 routeProgress 回到 checkpoint；
- pausedFrom 只用于文案，不允许恢复半局物理；RESUME 一律进入 ready/resume；
- 重复 INTERRUPT 不覆盖第一次原因，paused/complete 不接受 TICK；
- app 在中断时释放 Pointer capture、清空本地 inputId 映射和 rAF 余量。

### 6.9 键位分类

```js
classifySteadyKey("KeyA", "down", false)
// { type: "PRESS", side: "left", inputId: "key:KeyA" }

classifySteadyKey("KeyL", "up", false)
// { type: "RELEASE", inputId: "key:KeyL" }
```

- 使用 `KeyboardEvent.code`；左席 `KeyA`，右席 `KeyL`；
- edge 只接受 down/up；repeat=true 的 down 返回 null，keyup 仍生成 RELEASE；
- 未知 code 返回 null；修饰键、可编辑元素和 IME 来源由 app 拒绝。

### 6.10 重放

`replaySteady(rawConfig, actions)` 从全新 intro 顺序调用 reducer。同配置与同 action 日志必须深相等，且不能修改 actions 或嵌套对象。viewport、rAF 分片、降动效、forced-colors、资产可用性、焦点和 live region 不进入日志。

## 7. 视图模型

`getSteadyView(state)` 至少返回：

```js
{
  phase,
  title,
  names: { left, right },
  seats: {
    left: { key: "A", active, liftPercent, stateLabel },
    right: { key: "L", active, liftPercent, stateLabel }
  },
  beam: { tilt, normalizedTilt, directionLabel },
  ball: { position, normalizedPosition, velocity, zoneLabel },
  journey: {
    progress, progressPercent, segmentId, segmentTitle,
    slopeLabel, checkpoint, reachedCheckpoints
  },
  stability: {
    supported, centered, settled, level, warmupTicks,
    finalHoldTicks, finalHoldTotal: 30
  },
  instruction,
  feedback,
  statusText,
  finalMessage
}
```

规则：

- 所有 percent 与 normalized 值均 clamp，非法状态返回安全有限数；
- statusText 按优先级表达：掉落/暂停 > 终点保持 > 支撑不足 > 滚珠偏离 > 速度过高 > 横梁过斜 > 正在稳住 > 一起前进；
- 不显示“左边害你掉了”或“右边不够好”等责任归因；
- checkpoint 使用“第一处灯 / 第二处灯”与形状标记，不只靠进度条颜色；
- complete 的 finalMessage 由清洗配置和 compose TODO 安全生成，只以 textContent 插入。

## 8. DOM、SVG 与交互结构

单页只保留以下主阶段：

```text
main
├── intro-panel
├── play-panel
│   ├── status-header + pause
│   ├── journey-track + 3 segment labels + 2 checkpoints
│   ├── balance-stage
│   │   ├── native SVG beam / ball / target zone / cart
│   │   └── DOM text fallback status
│   └── controls
│       ├── button[data-side="left"]
│       └── button[data-side="right"]
├── ready-dialog / paused-dialog
├── complete-panel
└── polite status + assertive status
```

- SVG 只投影 view；不得用 SVG DOM 坐标做碰撞或完成判断；
- 左右 pad 为真实 `<button type="button">`，同时支持 Pointer 与键盘；Pointer 操作只在 pad 上阻止默认行为；
- A/L 全局键在非编辑、非组合键环境下有效，pad 自身 Enter/Space 的浏览器 click 不应重复生成物理 PRESS；
- play-panel 中“为什么没前进”始终有可见短句；live region 只在检查点、掉落、暂停和完成时播报，不逐 tick 刷新；
- dialog 显示时采用 inert/hidden 或等价焦点约束；关闭后焦点回到开始、继续或左侧 pad。

## 9. 响应式、降动效与强制颜色

- 桌面世界基准约 800×520，SVG 使用 viewBox 等比缩放；
- 390×844 与 320×700 进行态首屏保留路线、横梁、滚珠、状态短句、两个至少约 120px 高的 pad 和暂停；
- 所有主要操作目标最小 48×48px，焦点环不被 overflow 裁切；
- 窄屏下只折叠长说明，不隐藏坡向、中央区、检查点或双方按住状态；
- `prefers-reduced-motion: reduce` 关闭粒子、晃动、背景视差、滚动景色与非必要 transition，SVG 仍按规则状态直接定位；
- `forced-colors` 使用 Canvas/CanvasText/ButtonText/Highlight 等系统色，中央区、滚珠、端点、按下态和焦点均有轮廓冗余；
- 背景资产失败、禁图或慢载时使用 CSS 纸张/晨光回退，不影响对比度和规则理解。

## 10. 自动测试 Gate

`logic.test.js` 至少覆盖：

1. 常量、course 分段连续性、检查点与终点合法；
2. 配置 Unicode 截断、类型/空值回退、冻结和 XSS 文本边界；
3. moveToward、对称舍入、负数 `.5`、clamp 与公式边界；
4. 一方从未输入时 support 永不成立，路线保持起点；
5. 双方持续等量按住在第一坡段掉落且不能增加路线；
6. 至少一条只通过生产 reducer 的双人控制轨迹可完成三段路线；
7. 可达轨迹中两席都必须多次 PRESS/RELEASE，不能把任一席替换为常量；
8. 静止、支撑不足、位置越界、速度过高、倾角过大分别阻止进度；
9. warmup 第 11/12 tick、检查点跨越、终点第 29/30 tick 精确边界；
10. 掉落回最近检查点、保留已达检查点、丢弃 TICK 余量并进入 release Gate；
11. inputId 唯一、重复 keydown、迟到旧 release、pointercancel 等价释放；
12. TICK 分片等价、固定日志重放深相等、state/action 不变；
13. 在第一/第二段的同一局部物理状态下，交换左右输入与升力，并将位置、速度、倾角和 `+84/-84` 坡势反号后，下一 tick 的物理字段严格镜像；路线/checkpoint 元数据不作整体深相等；
14. pause/hidden/blur/stalled 清空物理并回检查点，complete 冻结；
15. view 的有限数、优先提示、非颜色标签与不责备措辞；
16. 浏览器全局与 CommonJS 导出一致。

生产 reducer 的可达测试允许使用测试侧反馈控制器选择下一步 PRESS/RELEASE，但不得直接写 state、调用私有物理函数推进或使用测试专属捷径。

## 11. 浏览器验收

至少验证：

- 桌面 Chrome 通过真实 `A/L` 控制完成三段路线；
- 两个独立 Pointer ID 可同时按住，抬起/取消一个不会释放另一个；
- 持续双按、只按一边、快速掠过中央均不增加到终点；
- 第一、第二检查点后掉落分别回正确位置，双方释放后才能继续；
- 隐藏标签页、窗口 blur、500ms 长帧和手动暂停不补跑；
- 320×700、390×844、桌面、reduced-motion 与 forced-colors 的核心信息与焦点可见；
- `file://` 与本地启动器都能打开，无请求、无控制台错误；
- 删除/改名背景 WebP 后 CSS/SVG 回退仍可完成整局；
- README、ATTRIBUTION、门户卡片和研究文档的名称、等级与借鉴声明一致。

## 12. 非目标

首版不做：

- Matter.js、Planck.js、Box2D 或其他物理依赖；
- 二维碰撞、自由关卡编辑、程序生成坡路、难度选择；
- gamepad、陀螺仪、设备姿态、震动、声音或语音提示；
- 分数、计时排名、生命、成就、失败责任与“默契指数”；
- AI 自动搭档、在线房间、账号、云同步、统计或遥测；
- 共享物理抽象、仓库级 accumulator 重构或现有作品迁移。

这些均需独立 brainstorm 和规格，不在 C06 实现过程中顺手加入。

## 13. 实现借鉴声明

本作按 [`101-steady-together-research.md`](./101-steady-together-research.md) 的固定版本边界研究通用机制，但代码与素材完全自行实现。不得从参考仓库复制或翻写源代码、公式、参数、关卡、视觉、音频、字体、图标、截图、页面结构或文案；不得把第三方脚本通过 CDN 或 vendor 目录隐式引入。

`ATTRIBUTION.md` 必须逐项列出研究来源、固定 commit、许可证/权利主体、仅借鉴的抽象机制和未复制内容，并声明 HTML、CSS、JavaScript、整数动力学、测试、中文文案和生成资产均为本项目独立创作。
