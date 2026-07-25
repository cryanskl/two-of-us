# “这一圈，和你同时到”玩法规格

- 日期：2026-07-25
- 稳定工作 ID：`twin-orbit`
- 公开标题：`这一圈，和你同时到`
- 主分类：`co-op`
- 目标等级：A
- 前置调研：[`305-twin-orbit-research.md`](./305-twin-orbit-research.md)
- 状态：Conditional Go；本规格冻结首版合同，但尚未创建生产实现

## 1. 一句话玩法

> 两个人分别按住或松开自己的星，让它在快、慢两条轨道间切换；在共同开门的
> 那一拍，两颗星必须同时穿过各自指定的角度和半径。

30 秒教学只说：

- 左边按住 `F`、右边按住 `J`，按住走内轨更快，松开走外轨更慢；
- 看清两扇门的角度、半径和共同开门时刻；
- 只有两颗星在同一拍穿过各自门，才算一起到。

不加入真实轨道物理、引力、质量、燃料、分数、排名、随机星流或个人准确率。
“内快外慢”是抽象桌面规则，不是天体力学模拟或教育结论。

## 2. 首版范围

### 2.1 必须有

- 五关固定、可证明的双门会合；
- 同设备双人键盘与双 Pointer；
- 两席相同的一键按住/松开能力；
- 30Hz 整数固定步；
- intro、单关说明、进行、成功、重试、完成；
- 自动暂停、继续、重来当前关、完整重开；
- 公开状态文字、键盘等价、reduced-motion 与图片/Canvas 降级；
- 经典相对脚本和完整 `file://` 直开；
- README、归属声明、纯逻辑测试、浏览器验收和三层启动证据。

### 2.2 明确不做

- 对抗、个人比分、赢家、生命值、失败次数或责任归因；
- 第六关、难度、随机题、每日题、关卡编辑器或自定义物理；
- 三轨、反向绕行、抢同一颗星或随机目标；
- 碰撞、引力、弹性、惯性、拖尾作为规则或连续浮点物理；
- 单人 AI、自动补位、远程联机、账号、存档或排行榜；
- 音频、震动、传感器、权限、分享、截图或导出；
- 第三方库、远程资源、WebGL、Worker、WASM 或构建产物；
- 英文产品名 “Twin Orbit”。

## 3. 目录与启动合同

建议生产目录：

```text
experiences/co-op/twin-orbit/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── fixtures.js
├── app.js
├── package.json
├── logic.test.js
├── README.md
└── ATTRIBUTION.md
```

加载顺序：

```html
<script src="./config.js"></script>
<script src="./logic.js"></script>
<script src="./fixtures.js"></script>
<script src="./app.js"></script>
```

要求：

- 全部为经典相对脚本，不使用 `type="module"` 或 dynamic import；
- 项目目录单独复制后仍可运行和阅读归属；
- `logic.js` 用 UMD 风格同时暴露浏览器全局和 CommonJS 测试出口；
- 项目 `package.json` 只用于把测试目录声明为 CommonJS，不是运行依赖；
- 不读取仓库根 JS、node_modules、共享运行时或服务器端文件；
- 不使用 `fetch`、XHR、WebSocket、EventSource、sendBeacon、Service Worker、
  storage、cookie、Cache API 或远程 URL；
- 无图片时仍可用 CSS/DOM/SVG 完成全部规则；首版默认不需要生产图片。

## 4. 权威常量

```js
VERSION = 1
TICK_RATE = 30
TURN_STEPS = 720
OUTER_SPEED = 2
INNER_SPEED = 3
OPEN_RADIUS = 2
MAX_TICK_BATCH = 5
MAX_FRAME_DELTA_MS = 250
PLAYER_IDS = ["left", "right"]
LANES = ["outer", "inner"]
PHASES = [
  "intro",
  "gate-intro",
  "playing",
  "gate-success",
  "gate-retry",
  "complete"
]
```

`OPEN_RADIUS=2` 表示一关的合法共同开门窗口为：

```text
[openTick - 2, openTick + 2]
```

金路径在 `openTick` 命中；窗口允许相邻少量路线，但不改变“同 tick 双门”要求。

规则层只使用 safe integer。CSS 角度、弧度、像素和插值不能回写 state。

## 5. 固定关卡

### 5.1 exact schema

每关必须是只含以下自有 data properties 的普通对象：

```js
{
  id,
  title,
  openTick,
  startAngles: { left, right },
  targets: {
    left: { angle, lane },
    right: { angle, lane }
  }
}
```

约束：

- `id` 是固定白名单字符串；
- `openTick` 是 `[1, 240]` 内整数；
- 所有 angle 是 `[0, 719]` 内整数；
- lane 只能是 `outer` 或 `inner`；
- 禁止额外字段、accessor、Proxy 派生值、原型污染或运行时修改；
- 规范化后深冻结配置和关卡。

### 5.2 冻结数据

| id | 标题 | openTick | 起点 L/R | 目标 L/R | 目标半径 L/R |
| --- | --- | ---: | --- | --- | --- |
| `first-meeting` | 先学会一快一慢 | 60 | 40 / 320 | 180 / 470 | outer / inner |
| `trade-the-lead` | 把刚才的路换给彼此 | 60 | 80 / 400 | 230 / 540 | inner / outer |
| `same-count` | 走不同的路，用一样的力 | 72 | 120 / 450 | 300 / 630 | inner / outer |
| `long-way-left` | 这次左边先收住 | 84 | 160 / 500 | 352 / 708 | outer / inner |
| `long-way-right` | 最后一圈换右边收住 | 84 | 200 / 560 | 408 / 32 | inner / outer |

### 5.3 金路径 fixture

fixture 只用于测试和验收，不进入 public view，不在 UI 中提供自动解法：

```js
[
  {
    id: "first-meeting",
    left:  [["inner", 20], ["outer", 40]],
    right: [["outer", 30], ["inner", 30]]
  },
  {
    id: "trade-the-lead",
    left:  [["outer", 30], ["inner", 30]],
    right: [["inner", 20], ["outer", 40]]
  },
  {
    id: "same-count",
    left:  [["inner", 18], ["outer", 36], ["inner", 18]],
    right: [["outer", 18], ["inner", 36], ["outer", 18]]
  },
  {
    id: "long-way-left",
    left:  [["inner", 24], ["outer", 60]],
    right: [["outer", 44], ["inner", 40]]
  },
  {
    id: "long-way-right",
    left:  [["outer", 44], ["inner", 40]],
    right: [["inner", 24], ["outer", 60]]
  }
]
```

fixture 验收：

- 五关分别在 60 / 60 / 72 / 84 / 84 tick 双门同达；
- 左、右内轨总量均为 150 tick；
- 每关每席都至少有一个 inner 和一个 outer tick；
- 每个 fixture 的最后 lane 与目标 lane 一致；
- 去掉任一席的输入，或把任一席替换成恒定 inner/outer，该关不能完成；
- fixture 数组、run 和展开日志全部深冻结且引用隔离。

## 6. 配置合同

配置只允许：

```text
leftName
rightName
introTitle
introMessage
completeTitle
completeMessage
signature
```

规则：

- 所有字段为纯文本，不接受 HTML、URL、CSS、函数或关卡数据；
- 名字 1–20 个 Unicode code point，正文 1–160，署名 1–60；
- NFC 规范化，折叠普通空白；
- 拒绝控制字符、双向控制符、孤立 surrogate 和 accessor；
- 输出只用 `textContent`；
- 配置不能修改速度、关卡、窗口、键位、结果、分类或启动等级；
- 整份配置原子校验；任一字段非法则回退完整默认配置，不混搭；
- 默认称呼是“左边”和“右边”，不提交真实姓名或私人消息。

README 必须说明：`config.js` 是本地明文，不是加密或隐藏内容。

## 7. 状态、action 与公开视图

### 7.1 action

```text
START
BEGIN_GATE
SET_HELD { playerId, held, inputEpoch }
TICK { count }
CONTINUE
RETRY_GATE
NEXT_GATE
RESTART
SUSPEND { reason }
```

规则：

- action 必须是 exact own-data plain object；
- `playerId` 只能是 `left` / `right`；
- `held` 必须是 boolean；
- `inputEpoch` 必须等于当前 state epoch，旧 Pointer/旧 keyup 无效；
- `TICK.count` 是 `[1, MAX_TICK_BATCH]` 内整数；
- 非法 action、字段、类型、阶段或旧 epoch 返回原 state 引用；
- `RESTART` 是唯一从 complete 开启新一轮的 action。

### 7.2 state

```js
{
  version: 1,
  phase,
  content,
  gateIndex,
  tick,
  openWindow: { start, center, end },
  players: {
    left: {
      angle,
      lane,
      held,
      crossed,
      crossingTick
    },
    right: {
      angle,
      lane,
      held,
      crossed,
      crossingTick
    }
  },
  retryReason,
  completedGateIds,
  inputEpoch,
  revision
}
```

边界：

- `lane` 由当前 `held` 派生并冻结进本 tick 状态；
- `crossed` 只表示当前 tick 是否穿过目标，不跨 tick 保留为成功凭据；
- `crossingTick` 只在当前 tick 穿越时为整数，否则 `null`；
- `retryReason` 只允许公共、无归责文案枚举；
- 不存个人失误、按键次数、贡献、准确率或用时排名；
- 所有 state 深冻结；任何输入对象、配置或旧 state 都不共享可变引用；
- 非法外部 state 在 public API 边界安全回到默认 intro。

### 7.3 public view

公开 DTO 只包含 UI 所需：

```js
{
  phase,
  title,
  message,
  gate: {
    number,
    total,
    title,
    tick,
    openWindow,
    openState
  } | null,
  players: [
    {
      id,
      name,
      angle,
      lane,
      targetAngle, // intro / complete 为 null
      targetLane,  // intro / complete 为 null
      relationText
    }
  ],
  completedCount,
  canStart,
  canBeginGate,
  canContinue,
  canRetry,
  canAdvance,
  canRestart
}
```

不公开 fixture、未来关卡、输入 epoch、内部 retry 枚举、个人 control tick 或
求解路径。intro 在玩家按下 `START` 前不公开第 1 关目标角与目标半径；complete
也不继续携带最后一关目标字段。两阶段保持 DTO 键稳定，但 `targetAngle` 和
`targetLane` 均为 `null`，`relationText` 只表达等待开始或共同完成。

## 8. 单 tick 更新顺序

每个逻辑 tick 必须严格执行：

1. 验证当前 phase 是 `playing`；
2. 把左右 `held` 同时快照；
3. 同时派生左右 lane；
4. 记录左右 previous angle；
5. 按 lane 同时计算速度；
6. 同时计算并规范化 next angle；
7. 分别用半开环形区间判断本 tick 是否穿过自己的目标角；
8. 生成左右 crossing event，但不逐席修改 phase；
9. 一次性裁决双事件、窗口与目标 lane；
10. 若仍 playing，再递增 tick 并清本 tick crossing 投影；
11. 深冻结新 state。

### 8.1 角度规范

```js
normalize(angle) = ((angle % 720) + 720) % 720
forwardDistance(from, to) = normalize(to - from)
```

从 `previous` 以 `speed` 前进到 `next` 时：

```text
crossed =
  forwardDistance(previous, target) > 0
  AND
  forwardDistance(previous, target) <= speed
```

区间是 `(previous, next]`：

- 起点本身不算穿越；
- 终点正好等于目标算穿越；
- 719→0 可正确穿越 0；
- 同一目标不会在相邻 tick 重复计数。

### 8.2 双门裁决

成功必须同时满足：

```text
left.crossed === true
right.crossed === true
left.crossingTick === right.crossingTick
crossingTick in [openStart, openEnd]
left.lane === left.targetLane
right.lane === right.targetLane
```

裁决结果：

- 全部满足：`gate-success`；
- 任一星在窗口前穿门：`gate-retry / too-early`；
- 窗口内只有一星穿门：`gate-retry / not-together`；
- 双方同 tick 穿门但半径错误：`gate-retry / wrong-lane`；
- 窗口结束后仍未成功：`gate-retry / window-closed`；
- 不出现“左边害的”“右边失误”或个人失败原因。

如果同一 tick 同时满足多个失败条件，优先级固定：

```text
success > wrong-lane > not-together > too-early > window-closed
```

`window-closed` 只在完成该 tick 裁决后判断，不能在合法末 tick 前抢先失败。

## 9. 阶段转换

```text
intro
  START → gate-intro(0)

gate-intro
  BEGIN_GATE → playing(current gate, tick 0)
  SUSPEND → gate-intro(no change)

playing
  TICK → playing | gate-success | gate-retry
  SUSPEND → gate-intro(current gate, reset)

gate-retry
  RETRY_GATE → gate-intro(current gate, reset)
  SUSPEND → gate-intro(current gate, reset)

gate-success
  NEXT_GATE → gate-intro(next)
  NEXT_GATE on final → complete
  SUSPEND → gate-success(no rollback)

complete
  RESTART → intro(new revision/epoch)
```

阶段不由 `setTimeout`、CSS animation、transitionend、Canvas 或音频推进。

## 10. 暂停与输入生命周期

### 10.1 自动暂停

以下事件 dispatch `SUSPEND`：

- `window.blur`
- `document.visibilitychange` 且 hidden
- `window.pagehide`
- `Escape`
- RAF delta 大于 `MAX_FRAME_DELTA_MS`

在 `playing` 中：

- held 全部 false；
- Pointer map、pressed key set、accumulator 和 last timestamp 全清；
- `inputEpoch += 1`；
- 当前关回到 `gate-intro` 的冻结起点；
- 不增加失败次数，也不改变已完成关卡。

在 `gate-success` / `complete` 中不回滚已经确认的完成结果，但仍清输入和时钟。

### 10.2 继续

`gate-intro` 的主动作是“这一圈开始”。没有隐藏自动倒计时。用户主动点击后：

- 重建当前关起点；
- tick 从 0 开始；
- held 为 false、lane 为 outer；
- 焦点回到左席按钮；
- 下一帧只记录 timestamp，不补算暂停期间时间。

### 10.3 手动重来

进行态提供“暂停”而不是破坏性重开。暂停后进入 `gate-intro`。`gate-retry`
提供“再来这一圈”。完整页提供“再绕一次”。

首版不增加确认弹窗；所有重来都只影响无持久化的当前内存状态。

## 11. 键盘与 Pointer

### 11.1 键盘

```text
left  = KeyboardEvent.code === "KeyF"
right = KeyboardEvent.code === "KeyJ"
```

- 只在 `playing` 阶段拦截 F/J 默认行为；
- keydown 首次出现时 dispatch held=true；
- `event.repeat` 或已在 pressed set 中时不重复 dispatch；
- keyup dispatch held=false；
- 若在按钮获得焦点时按 Space/Enter，使用原生按钮 Pointer/click 等价路径，
  避免快捷键与按钮监听重复触发；
- IME、修饰键或 Unidentified 不映射；
- 页面没有输入框，但仍只在白名单阶段 preventDefault。

### 11.2 Pointer / touch

- 两个席位各有一个原生按住按钮；
- pointerdown 时按 `pointerId` 绑定该席，设置 capture 并 dispatch held=true；
- 同一席一次只接受一个活动 pointer；另一 pointer 不覆盖；
- pointerup、pointercancel、lostpointercapture、元素移除和 document 级兜底释放
  都按精确 pointerId 清理；
- 一个 pointer 不能同时占据两个席位；
- Mouse pointer 只能占一席，真实双触点可同时占两席；
- `touch-action: none` 只施加在两个实时按住按钮，不阻止页面其余区域滚动缩放；
- blur/hidden/pagehide 直接失效整个 input epoch，迟到的旧释放事件不能改新局。

## 12. RAF 与固定步

app 持有：

```text
lastTimestamp
accumulatorMs
rafGeneration
```

每帧：

1. generation 不匹配则丢弃旧回调；
2. 首帧只记 timestamp；
3. delta 小于 0 或非有限值则 SUSPEND；
4. delta 大于 250ms 则 SUSPEND；
5. accumulator 增加 delta；
6. 每满 `1000/30` ms dispatch 一个 `TICK {count: 1}`；
7. 单帧最多 5 tick；
8. phase 离开 playing 后立即停止消费；
9. render 只从 public view 投影。

测试必须证明同一 held log 在 30/60/120Hz 和任意合法 RAF 分组下终态一致。

## 13. DOM 与可访问性

建议语义结构：

```text
main
├── nav
│   └── a 返回合集
├── header
│   ├── h1
│   └── p 规则说明
├── section.status[role=status]
├── section.stage[aria-label]
│   ├── div.shared-clock
│   ├── div.left-orbit
│   ├── div.right-orbit
│   └── p.visually-hidden
├── section.controls[aria-label="双星控制"]
│   ├── fieldset.left-seat
│   │   ├── legend
│   │   └── button 左星按住加速
│   └── fieldset.right-seat
│       ├── legend
│       └── button 右星按住加速
└── section.actions
```

要求：

- 使用原生 `a/button/fieldset/legend`，不伪造 switch 或 slider；
- 两个实时按钮至少 48×48px，视觉和 DOM 权重相同；
- held 用文字、pressed 外观和 `aria-pressed` 共同表达；
- 左右星除颜色外还用形状和文字区分；
- 不逐 tick 更新 live region；只播阶段、开门临近、成功和重试；
- 当前角度不要求读屏逐格跟踪，提供“还早 / 接近 / 已过”的节流关系摘要；
- intro 开始后焦点到关卡主动作；
- BEGIN_GATE 后焦点到左席控制；
- gate-retry 聚焦重试标题或“再来这一圈”；
- gate-success 聚焦“下一圈”；
- complete 聚焦完成标题；
- `prefers-reduced-motion` 不改变逻辑或输入时序；
- no-JS 显示公开说明和“请启用 JavaScript”，不伪造可玩状态。

## 14. 视觉信息边界

视觉设计阶段可以决定排版、材质和颜色，但不能改变：

- 两颗星同向；
- 两条半径和各自目标半径；
- 共同开门时间；
- 一键按住/松开；
- 同 tick 双门判定；
- 五关固定顺序；
- 公开标题与非竞争文案。

舞台必须让用户同时看见：

- 左右星身份；
- 当前角位置和内/外半径；
- 左右目标门的角度和目标半径；
- 共同开门进度；
- 当前阶段与下一合法动作。

不使用商业游戏截图、App Store `Twin Orbit` 视觉、火箭、陨石、生存 HUD、
排行榜或霓虹街机品牌表达。若生成概念图，只能用无第三方输入的原创提示词，并
在归属声明记录工具、日期、用途和实际运行资产。

## 15. 依赖、隐私与安全

- 运行依赖：无；
- 开发依赖：无项目级依赖；只使用仓库已有 Node 测试能力；
- 网络：0 请求；
- 存储：0 写入；
- 权限：0 请求；
- 用户数据：只在内存读取本地明文 `config.js`；
- 输出：全部纯文本，禁用配置 `innerHTML`；
- 不使用 eval、Function constructor、blob URL、data URL、iframe 或跨窗口通信；
- 不记录键位、pointerId、设备信息、关卡失败或完成历史；
- 刷新关闭即清空全部状态。

## 16. 借鉴与归属合同

项目 README 与 `ATTRIBUTION.md` 必须明确：

1. 玩法、五关数据、整数逻辑、状态机、界面、文案、测试和资产由本仓库独立
   编写；
2. 高层机制“半径选择角速度”参考了仓库内部 `orbit-star-race`，但未复制其
   代码、常量、三轨、随机目标、比分、视觉、素材、文案或测试；
3. W3C/WHATWG/WAI 文档只用于键位、Pointer、可见性、动画帧和可访问性边界；
4. 未参考、复制、修改、打包或依赖任何外部开源轨道游戏、物理引擎、demo、
   素材、字体、音频或图标；
5. “Twin Orbit” 只作内部 ID；公开标题使用“这一圈，和你同时到”；
6. 若后续参考或引入第三方内容，先更新 research 与审计，再编码。

## 17. 纯逻辑测试矩阵

至少覆盖：

1. API、常量、关卡和 fixture 深冻结；
2. 配置 exact schema、Unicode、整份回退与 hostile object；
3. angle normalize、forward distance、`(previous,next]` 和 719→0；
4. outer +2、inner +3、双方同 tick 快照；
5. 五组 fixture 精确完成；
6. 左右各 150 inner tick、每关双方使用两种 lane；
7. 每关恒定 outer/inner、单席日志和错 lane 均失败；
8. 开窗中心、起止边界、边界外一 tick；
9. 同 tick 成功、单边穿越、半径错误和失败优先级；
10. 第五关目标 32 的跨零穿越；
11. intro→五关→complete 唯一路径；
12. retry 不丢已完成关，restart 完整清空；
13. SUSPEND 清 held、递增 epoch、重置当前关；
14. 旧 keyup/pointer epoch 不污染新局；
15. 非法 action/state、额外字段、getter、Proxy 和极值；
16. terminal state 幂等；
17. 同 input log 在不同 TICK batch/RAF 分片下终态一致；
18. public view 不泄露 fixture、epoch、个人控制量或未来关卡；
19. config/state/view 引用隔离；
20. 静态零网络、零 storage、零模块、零仓库外依赖。

## 18. 浏览器验收矩阵

实现后必须验证：

1. Finder 双击 `index.html` 完成五关和完整重开；
2. `file://` 下控制台 0 error/warning、network 0 公网请求；
3. F/J 各自只控制自己，真实同时保持不丢键；
4. 两个真实触点可分别占据两席；
5. pointercancel/lostcapture/滑出/抬起无粘键；
6. 成功 fixture、过早、单边、错半径、窗口关闭都显示中性结果；
7. blur、hidden、pagehide、Escape、长帧都回当前关说明且不计失败；
8. 返回后旧 keyup/pointerup 不改变新 epoch；
9. 第 1/2、4/5 关角色负担镜像，完成页无个人统计；
10. reduced-motion 下规则轨迹和结果一致；
11. forced-colors、200% text、400% zoom、no-JS 可读；
12. 1504×1046、768×1024、390×844、320×700 无横向溢出；
13. 两个控制目标至少 48px；
14. 装饰图、Canvas 或 SVG 阻断后仍可完成；
15. 键盘焦点顺序、live region、成功/重试/终局焦点正确；
16. 首页卡片、co-op 索引、catalog、README 与实际入口一致。

自动化 localhost 可以验证交互和响应式，但不能替代真实系统 `file://` 双击。

## 19. 实施前最终 Go 条件

本规格进入逻辑实现前仍需完成：

- 独立求解器穷举五关开放窗口；
- 关卡数据 exact schema 测试；
- 名称与归属审计文档；
- 分阶段验收计划；
- 父分支确认没有其他项目占用同一生产目录或 catalog ID。

满足后才创建 `experiences/co-op/twin-orbit/`。本文件本身不代表 installed。
