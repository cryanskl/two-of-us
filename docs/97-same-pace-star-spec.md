# A 级“慢一点，也和你一起”实现规格

> 状态：玩法、配置、整数时间线、物理输入、阶段 DOM、降动效和验收 Gate 冻结。来源、健康措辞与许可证边界见 [`96-same-pace-star-research.md`](./96-same-pace-star-research.md)。

## 1. 作品定义

“慢一点，也和你一起”是一款两人同机的短节奏合作体验。左边和右边轮流领拍，每颗星依次完成“领拍按住、对方接住、领拍松开、对方松开”四个动作；六颗星全部接好后展示一段可编辑的赠予文案。

- 分类：`co-op`；
- 目录：`experiences/co-op/same-pace-star/`；
- 启动等级：A；
- 支持：`file://` 直接打开与仓库静态服务器；
- 运行依赖：无；
- 网络、存储、账户、音频、振动、相机、麦克风、定位：均不使用；
- 目标：两边各领拍三颗星，共同完成六次四拍交接；
- 不设置分数、赢家、连击、生命、失败次数展示、排行榜或健康效果。

光圈只是节拍氛围，不要求玩家改变真实呼吸。本作品不是呼吸训练、健康评估或治疗工具；可见文案不得声称减压、助眠、缓解焦虑、调节神经系统、心率同步或生理呼吸同步。

## 2. 文件边界

```text
experiences/co-op/same-pace-star/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── quiet-sky.webp
    └── favicon.svg
```

- `config.js`：玩家称呼、介绍与完成文案，以及 5–10 行学习 TODO；
- `logic.js`：固定节拍、配置清洗、不可变 reducer、视图与重放；
- `app.js`：rAF accumulator、键盘/Pointer、阶段 DOM、焦点与生命周期；
- `logic.test.js`：窗口边界、四拍、六星、release Gate、暂停、视图、重放与畸形输入；
- `ATTRIBUTION.md`：固定来源、许可证、ImageGen 与完整零复制声明；
- `assets/`：只放本项目原创无字资产，缺失时 CSS 回退必须保留全部玩法信息。

所有脚本使用经典 `<script>`。不得使用 module、`fetch()`、XHR、WebSocket、Worker、Service Worker、浏览器存储、外部字体、CDN 或远程资源；整个作品目录复制到任意相对路径后仍应运行。

## 3. 固定节拍与领拍计划

```js
TICK_MS = 50;
STEP_TICKS = 24;             // 每步 1.2 秒
ACTION_WINDOW_START = 8;     // tick 8，400ms
ACTION_WINDOW_END = 19;      // tick 19，950ms，包含端点
MISS_TICK = 20;              // 跨入 tick 20 时失败
MAX_FRAME_GAP_MS = 500;

MEASURES = [
  { id: "first-light", leader: "left",  title: "第一颗，慢慢靠近" },
  { id: "answer-light", leader: "right", title: "第二颗，换你回应" },
  { id: "warm-light", leader: "left",  title: "第三颗，把光接稳" },
  { id: "near-light", leader: "right", title: "第四颗，再近一点" },
  { id: "home-light", leader: "left",  title: "第五颗，留在这里" },
  { id: "our-light", leader: "right", title: "最后一颗，一起放开" }
];
```

每颗星的权威动作由 leader 派生：

```text
step 0: leader   PRESS
step 1: follower PRESS
step 2: leader   RELEASE
step 3: follower RELEASE
```

不变量：

1. 左右各领拍三次，动作数和窗口完全镜像；
2. 每个 step 从 tick 0 开始，tick 8–19 的正确动作有效；
3. 正确动作发生后，step 在 tick 24 边界换到下一拍；
4. step 3 的正确 RELEASE 当次立即完成该星，不再等待装饰 tick；
5. 未满足动作而跨到 tick 20 时立即失败，不继续消费剩余 tick；
6. `TICK { ticks }` 逐 boundary 消费，分片方式不能改变结果；
7. 常量、MEASURES 与派生动作只读，运行配置不能覆盖规则。

六颗星的正常规则时长约 24–27.3 秒，另加每颗之间由玩家主动点击“下一颗”的时间。

## 4. 配置契约

```js
window.SAME_PACE_STAR_CONFIG = {
  leftName: "左边的你",
  rightName: "右边的你",
  intro: "轮流把星光收起、交给对方，再一起放开。",
  finalTitle: "慢一点，也和你一起",
  finalMessage: "不是谁追上谁，是我们都愿意为对方停一下。",
  signature: "留给我们的夜晚"
};
```

清洗规则：

- leftName/rightName 各最多 12 个 Unicode code point；
- intro 最多 72 个、finalTitle 最多 24 个、finalMessage 最多 96 个、signature 最多 24 个；
- 只接受字符串，去除首尾空白，空值和错误类型回退默认；
- 不解析 HTML，页面只以 `textContent` 输出配置；
- 清洗结果深拷贝并冻结，调用方后续修改原对象不得污染状态。

`config.js` 保留一个有完整默认返回值的 5–10 行 `composeSamePaceMessage(view)` TODO。用户可以利用双方称呼和 `view.completed.length` 改写结尾；不修改时作品仍完整可玩，TODO 不得阻塞默认终局。

## 5. 权威状态

```js
{
  phase: "intro" | "playing" | "release-gate" |
    "ready" | "measure-complete" | "paused" | "complete",
  readyKind: null | "retry",
  measureIndex: 0,
  stepIndex: 0,
  stepTick: 0,
  stepSatisfied: false,
  clockTick: 0,
  active: {
    left: null | { inputId: "key:KeyA", pressedAtTick: 8 },
    right: null | { inputId: "pointer:7", pressedAtTick: 32 }
  },
  attemptCount: 1,
  completed: [
    { measureId: "first-light", leader: "left", attemptCount: 2, completedAtTick: 77 }
  ],
  failureReason: null | "early-edge" | "missed-edge" |
    "wrong-seat" | "released-early",
  feedback: null | "step-received" | "measure-complete" | "retry",
  pauseReason: null | "manual" | "hidden" | "blur" | "stalled",
  pausedFrom: null | "playing" | "release-gate" | "ready" |
    "measure-complete",
  revision: 0,
  config: { /* 清洗并冻结 */ }
}
```

核心不变量：

1. 每席同时最多一个活动 inputId，同一个 inputId 不能占两席；
2. completed 严格等于 MEASURES 前缀，id 不重复，完成 tick 非递减；
3. measureIndex 与 completed 长度一致，complete 时均为 6；
4. stepSatisfied 为 true 时不接受额外 PRESS/RELEASE，只等待边界；
5. release-gate 只清理精确匹配输入，双方都空后进入 ready/retry；
6. ready/measure-complete/paused/complete 不接受 PRESS 或 TICK 推进；
7. paused 不保留活动输入、step 余量或半完成动作；
8. revision 只在有效状态变化时递增；非法 action 返回原状态引用；
9. reducer 不读取 DOM、CSS、真实时间、动画、音频或随机数，不修改输入状态或 action。

## 6. 纯逻辑 API

`logic.js` 通过浏览器全局 `SAME_PACE_STAR_LOGIC` 和 CommonJS 暴露：

```js
TICK_MS
STEP_TICKS
ACTION_WINDOW_START
ACTION_WINDOW_END
MISS_TICK
MAX_FRAME_GAP_MS
MEASURES
DEFAULT_CONFIG
sanitizeSamePaceConfig(rawConfig)
validateMeasures(measures)
createSamePaceState(rawConfig)
getExpectedAction(state)
reduceSamePace(state, action)
getSamePaceView(state)
classifySamePaceKey(code, edge, repeat)
replaySamePace(rawConfig, actions)
```

### 6.1 Action

```text
START
NEXT
RETRY
PRESS { side, inputId }
RELEASE { inputId }
TICK { ticks }
INTERRUPT { reason }
RESUME
RESTART
```

`ticks` 只接受正整数；side、inputId、reason 只接受白名单形状。未知、畸形、阶段不允许或不会改变状态的动作返回原引用。

### 6.2 阶段入口

- START 只在 intro 有效，进入第一颗 playing、attemptCount=1、step 0/tick 0；
- NEXT 只在 measure-complete 有效，进入下一颗 playing 并重置 attemptCount=1；
- RETRY 只在 ready/retry 有效，进入当前颗 playing，attemptCount 加一；
- 第六颗完成时直接进入 complete，不经过 measure-complete；
- RESTART 从任意阶段创建全新 intro，清空完成记录与时钟。

### 6.3 物理输入优先规则

PRESS 的处理顺序：

1. 只在 playing 接受；重复 inputId、该席已占用或 inputId 已在另一席活动时返回原引用；
2. 先把 `{ inputId, pressedAtTick }` 登记到对应席；
3. 再与当前唯一期望 `{ side, edge: "press" | "release" }` 比较；
4. 正确席位、正确边沿且 tick 8–19 时设 stepSatisfied=true；
5. 正确 PRESS 早于 tick 8，失败为 early-edge；
6. 其他 PRESS 失败为 wrong-seat；
7. 失败后只要任一席仍活动就进入 release-gate，否则进入 ready/retry。

RELEASE 的处理顺序：

1. 任何阶段都只能按完全匹配的 inputId 找到席位；旧或未知 release 返回原引用；
2. 先从 active 清除该 inputId，再作规则判断；
3. release-gate 中若仍有活动输入则继续等待，双方都空后进入 ready/retry；
4. playing 中，只有当前期望席位的 RELEASE 且 tick 8–19 有效；
5. 期望席位在 tick 8 前 RELEASE，或任何已按住席位在自己的释放拍之前松开，失败为 released-early；
6. 非期望席位的 RELEASE 优先归为 released-early，不使用 wrong-seat 责备玩家；
7. step 3 的有效 RELEASE 当次调用完成当前星。

DOM 反馈不显示具体席位或“谁错了”；failureReason 只供测试、调试和中性提示映射使用。

### 6.4 stepSatisfied 后的额外动作

一次动作已被接收但尚未到 tick 24 时：

- 重复 keydown 由 inputId 幂等规则忽略；
- 新的额外 PRESS 登记后以 wrong-seat 失败；
- 任一活动席提前 RELEASE 以 released-early 失败；
- 只有 TICK 可以推进到下一 step；
- 换 step 时保留 active，清零 stepTick 与 stepSatisfied。

因此 leader 必须从 step 0 持续按到 step 2，follower 必须从 step 1 持续按到 step 3；双键从开局一直压住不可能完成释放两拍。

### 6.5 TICK 边界消费

TICK 只在 playing 接受，伪代码必须等价于：

```text
while remainingTicks > 0 and phase == playing:
  boundary = stepSatisfied ? STEP_TICKS : MISS_TICK
  consume = min(remainingTicks, boundary - stepTick)
  stepTick += consume
  clockTick += consume
  remainingTicks -= consume

  if !stepSatisfied and stepTick == MISS_TICK:
    fail("missed-edge")
  else if stepSatisfied and stepTick == STEP_TICKS:
    stepIndex += 1
    stepTick = 0
    stepSatisfied = false
```

- 失败或完成后立即停止消费本次 action 的剩余 ticks；
- action 发生在 tick 7 无效、tick 8 有效、tick 19 有效；状态不得停留在未满足的 tick 20；
- 超大 TICK 可以从已满足 step 跨入下一 step，并在下一 step 的 miss boundary 停下；
- `TICK(1) × N` 与 `TICK(N)` 在同一 action 边界下必须得到深相等状态。

### 6.6 完成记录

- step 3 有效 RELEASE 只追加一条当前 measure 记录；
- 前五颗进入 measure-complete，展示已点亮星和“下一颗”；
- 第六颗进入 complete；之后 PRESS/RELEASE/TICK/NEXT 均不能修改完成记录；
- completed 记录保存本颗 leader、attemptCount 与 completedAtTick，不保存失败责任或精确输入设备；
- retry 不撤销此前完成的星，restart 才清空整局。

### 6.7 暂停与恢复

- INTERRUPT 对 playing/release-gate/ready/measure-complete 有效，原因白名单为 manual/hidden/blur/stalled；其他值规范为 manual；
- 中断清空 active、stepTick、stepSatisfied 和 app accumulator，并保存 pausedFrom；
- 从 playing/release-gate 恢复进入 ready/retry，当前星必须完整重试；
- 从 ready 恢复仍回 ready；从 measure-complete 恢复仍回 measure-complete；
- 重复 INTERRUPT 不覆盖第一次原因；paused/complete 不接受 TICK；
- hidden、blur 与单帧 `> MAX_FRAME_GAP_MS` 不补跑后台时间。

### 6.8 键位分类

```js
classifySamePaceKey("KeyA", "down", false)
// { type: "PRESS", side: "left", inputId: "key:KeyA" }

classifySamePaceKey("KeyL", "up", false)
// { type: "RELEASE", inputId: "key:KeyL" }
```

- 使用布局无关的 `KeyboardEvent.code`；左席 `KeyA`，右席 `KeyL`；
- edge 只接受 down/up；repeat=true 的 down 返回 null，keyup 仍生成 RELEASE；
- 未知 code 返回 null；修饰键和可编辑元素来源由 app 拒绝。

### 6.9 重放

`replaySamePace(rawConfig, actions)` 从全新 intro 顺序调用 reducer；同配置与同 action 序列必须深相等，且不能修改 action 数组或嵌套对象。reduced-motion、资产可用性、viewport、焦点和 live region 不进入 action 日志。

## 7. 视图模型

`getSamePaceView(state)` 至少返回：

```js
{
  phase,
  measureNumber,
  measureCount: 6,
  measureTitle,
  leader: { side, name },
  follower: { side, name },
  stepNumber,
  steps: [{ side, edge, label, status }],
  expected: { side, edge, name, instruction },
  timing: { stepTick, zone: "prepare" | "act" | "received" },
  seats: {
    left: { name, key: "A", active, stateLabel },
    right: { name, key: "L", active, stateLabel }
  },
  completed,
  progressLabel,
  instruction,
  feedback,
  safetyNote,
  finalTitle,
  finalMessage,
  signature,
  canStart, canNext, canRetry, canPause, canResume, canRestart
}
```

- steps 始终四项，status 为 upcoming/current/received；边沿同时有“按住/松开”文字和方向形状；
- timing.zone 在 tick 0–7 为 prepare、8–19 为 act，stepSatisfied 后为 received；精确 tick 不在可见 UI 制造倒数压力；
- instruction 必须包含席位名和动作，不只靠颜色、光圈大小或位置；
- failureReason 映射到共同文案“光没接上，松开再来”，可附不指名的操作提示；
- view 的数组和嵌套对象与 state 隔离，调用方修改不得污染权威状态；
- complete 的 finalMessage 由 app 调用 `composeSamePaceMessage(view)` 后用 textContent 输出。

## 8. DOM、输入与焦点

### 8.1 持久骨架

```html
<main>
  <header>返回、标题、玩法帮助</header>
  <section data-phase-host></section>
  <p role="status" aria-live="polite"></p>
</main>
```

### 8.2 阶段 DOM

- intro：标题、四拍说明、六颗空星、安全短句、主按钮“开始接光”；
- playing：六星进度、当前标题、中央光圈、四格节拍轨、左右两个大 pad、暂停；
- release-gate：保留左右 pad 的实时松手状态，显示“先都松开”；双方空后进入 ready；
- ready：移除可按 pad，显示共同提示和“再试这颗”；
- measure-complete：移除可按 pad，点亮当前星，显示“下一颗”；
- paused：移除可按 pad，显示原因和“继续”；
- complete：移除整套节拍控件，显示六颗星、完成文案、“再来一次”和“返回作品库”。

隐藏阶段不能仅靠 CSS `display:none` 常驻 DOM；暂停、ready、完成后旧 pad 不得仍可聚焦或被辅助技术访问。

### 8.3 输入接线

- keydown 先分类并同步 dispatch PRESS；keyup 按 inputId dispatch RELEASE；
- 对已识别且阶段可用的 A/L 阻止默认行为；修饰键、repeat 和可编辑元素不参与；
- 左右 pad 是原生 button，pointerdown 以 `pointer:<id>` dispatch PRESS 并尝试 setPointerCapture；
- pointerup/cancel/lostpointercapture 只释放自己的 ID；不通过 click 再派发；不读取 `isPrimary`；
- document 级 pointerup 作为 capture 丢失兜底；旧 release 由 reducer 精确匹配拒绝；
- 同一 pointerId 不能跨席，两指可以分别占据左右席；只有 pad 设置 `touch-action: none`；
- blur、hidden、Escape dispatch INTERRUPT，并清空 app 的 pressedKeys、activePointers、accumulator 与 lastTimestamp；
- rAF 只在 playing 运行；帧间隔大于 500ms dispatch stalled，不补算；
- 普通 tick 只更新必要字段，不重建 pad DOM，不移动焦点，不逐 tick 更新 live region。

### 8.4 焦点

- intro 聚焦开始按钮；playing 开始时聚焦当前领拍 pad；
- release-gate 不抢焦点，只更新松手状态；ready 聚焦“再试这颗”；
- measure-complete 聚焦“下一颗”；paused 聚焦“继续”；complete 聚焦完成标题；
- Pointer 操作不强制把焦点搬到另一席；
- `:focus-visible`、forced-colors 与键盘完整六颗必须可见可用。

## 9. 动效、降级与响应式边界

视觉核心是“安静夜色里，两道手感不同的光轮沿四格节拍交接，六颗纸质/玻璃星逐颗亮起”，不是医疗呼吸界面、冥想 App、心电图、霓虹节奏机或默认卡片仪表盘。

- 桌面 1504×1046：中央四拍与六星在视觉轴上，左右 pad 对称放置；
- 手机 390×844：左右 pad 横排，适合两人各用一只手；进行态核心控件在首屏；
- 窄屏 320×700：允许纵向滚动，不允许横向溢出；pad 最小 56px；
- 正常模式只允许缓慢光晕、收到动作后的离散亮起和完成星光，不用快速闪烁、持续视差或背景漂移；
- reduced-motion 关闭环的缩放、位置、脉冲和粒子，四格轨只作离散状态切换，规则完全相同；
- forced-colors 保留席位边框、焦点、active、当前拍和完成星轮廓；
- 背景、颜色与 CSS 动画缺失时，动作文字、四格轨、左右状态、进度和终局仍完整；
- 页面文本和控件 code-native；可使用一张无字 ImageGen 夜空生产图，不使用第三方字体、图片或图标。

概念图、设计令牌、允许文案、资产提示词、移动重排和 fidelity ledger 在后续设计文档冻结并独立提交。

## 10. 自动测试 Gate

定向逻辑测试不少于 44 项，至少覆盖：

1. 常量、六颗 id、左右领拍交替、四步派生与深冻结；
2. 配置类型、Unicode 截断、HTML 惰性、深拷贝、冻结与默认回退；
3. START/NEXT/RETRY 的阶段、计数与重复调用；
4. tick 7/8、19/20、23/24 精确边界；
5. 左领拍四边沿、右领拍镜像与完整六颗终局；
6. 正确动作后的固定 step boundary；第四次 RELEASE 即时完成；
7. 早 PRESS、早 RELEASE、missed、wrong-seat 与 stepSatisfied 后额外动作；
8. 双键从开局持续压住、缺少释放、长按跨星都不能完成；
9. repeat keydown、重复 inputId、同 ID 跨席、席位占用和旧 RELEASE；
10. release-gate 单边释放、全部释放、ready 重试和完成星不回退；
11. TICK 分片等价、大 tick 跨 step/miss、失败后停止剩余消费；
12. manual/blur/hidden/stalled 中断、幂等中断、四类 pausedFrom 恢复；
13. complete 后输入幂等、restart 清零、completed 只追加一次；
14. getView 的四格、文字冗余、zone、席位状态、嵌套隔离与安全短句；
15. classify key 的 down/up/repeat/未知输入；
16. replay 确定性、不修改 action、畸形 action/tick/state 安全拒绝；
17. reduced-motion、资产和 viewport 不进入 reducer。

作品提交前至少运行：

```bash
node --check experiences/co-op/same-pace-star/config.js
node --check experiences/co-op/same-pace-star/logic.js
node --check experiences/co-op/same-pace-star/app.js
node --test experiences/co-op/same-pace-star/logic.test.js
npm test
npm run verify
git diff --check
```

## 11. 浏览器验收 Gate

- 使用 Chrome MCP 验证；不可用或不可靠时记录原因后再用仓库现有 Playwright 路径；
- 真正 `file://` 与 localhost 门户各跑一次；
- 尺寸：1504×1046、390×844、320×700；
- 键盘完成六颗，双 Pointer 完成至少左右各领拍一颗；
- 实测 tick 8/19 可接受、早按/错席/提前松手/持续双按不可穿透；
- pointercancel、lost capture、document pointerup、Escape、blur、hidden、stalled、暂停与恢复；
- reduced-motion、forced-colors、背景缺失和 CSS 动画禁用；
- paused/ready/complete 不残留可按 pad，普通 tick 不丢焦点，live region 不刷屏；
- VoiceOver 实测动作播报；若 600ms 窗口不适用，如实记录为已知限制，不虚称完整读屏可玩；
- 无公网请求、无外部字体、无音频、无控制台错误；
- 同轮用 `view_image` 比较已接受概念与最新截图，记录至少五项 fidelity ledger 和首屏 copy diff。

## 12. 借鉴与原创声明 Gate

README 与 ATTRIBUTION 必须包含：

- breathing-exercises、breathe、Breathly、Zen Clock Workshop、BreatheWithMe、WHATWG、Pointer Events 与 WCAG 的固定版本、许可证/权利主体；
- 每个来源只研究的抽象机制和明确零复制内容；
- 无许可证项目只列为排除项，不作为可复制来源；
- 没有复制代码、数据结构、处方节奏、音频、字体、图标、SVG、截图、论文图表、设备、实验流程、文案或 UI；
- 接光四拍、六星计划、状态机、文字、界面和测试均为独立创作；
- ImageGen 资产的最终提示词、生成方式、路径和无第三方输入声明；
- 作品不是健康产品，不声称真实呼吸或生理同步。

缺少借鉴声明、引入未核验素材、出现健康效果承诺，或需要新增未冻结运行依赖，均为 No-Go。

## 13. 完成定义

只有同时满足以下条件才算完成：

- 六颗星、左右轮换领拍、键盘与双 Pointer 均真实完成；
- 逻辑测试、全仓测试、repository verify 和 diff check 全部通过；
- file/localhost、三档响应式、生命周期、动效/资产降级已验收；
- 持续双按无法通关，release Gate、后台暂停和旧 inputId 已实测；
- 页面明确不要求配合真实呼吸，无健康效果文案；
- 概念与运行截图经同轮 `view_image` 比较，无未记录的可修复偏差；
- 真实 bug 写入 `bugs/`，验证过的通用结论写入 `learn/`；
- catalog、创意池、README 和文档索引同步；
- 每个完成部分拥有独立提交，最终验收文档列出完整提交链。
