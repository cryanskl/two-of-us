# “把名字折成同一束光”可执行规格

- 日期：2026-07-25
- 稳定工作 ID：`kaleidoscope-names`
- 调研：[`259-kaleidoscope-names-research.md`](./259-kaleidoscope-names-research.md)
- Brainstorm：[`260-kaleidoscope-names-brainstorm.md`](./260-kaleidoscope-names-brainstorm.md)
- 主分类：单人惊喜
- 本地启动等级：A（真实 `file://` 直开）
- 本文状态：冻结规则、数据、DOM 与验收；不授权生产 UI

## 1. 产品合同

准备者在 `config.js` 写两条公开线索、一个 `4–9` 的镜面阶数答案、一个 `0–23`
的相位答案、两枚简短标记和最终留言。

体验者：

1. 主动开始；
2. 从六个折面按钮选择一个值；
3. 用原生 range 选择 24 格相位；
4. 根据两项 far/near/exact 反馈继续校准；
5. 两项同时 exact 后进入不可撤销的 `aligned`；
6. 主动按“照见我们”后才看到两枚标记与结尾；
7. 可重开回到不含私人节点的 intro。

唯一成功条件：

```text
selectedFolds === targetFolds
&& selectedPhase === targetPhase
```

没有容差成功、随机答案、自动吸附、计时、扣分、尝试次数、评分或失败结局。

## 2. 固定常量

生产 `CONSTANTS` 精确包含以下字段和值：

```js
{
  VERSION: 1,
  FOLD_MIN: 4,
  FOLD_MAX: 9,
  FOLD_VALUES: [4, 5, 6, 7, 8, 9],
  PHASE_MIN: 0,
  PHASE_MAX: 23,
  PHASE_COUNT: 24,
  TURN_UNITS: 2520,
  PHASE_UNITS: 105,
  NEAR_FOLD_DISTANCE: 1,
  NEAR_PHASE_DISTANCE: 2,
  INITIAL_FOLDS: 4,
  INITIAL_PHASE: 0,
  MAX_REVISION: 1000000
}
```

不允许从 config 改变这些值。证明：

```text
2520 % 4 === 0
2520 % 5 === 0
2520 % 6 === 0
2520 % 7 === 0
2520 % 8 === 0
2520 % 9 === 0
2520 % 24 === 0
2520 / 24 === 105
```

`CONSTANTS` 与其中的 `FOLD_VALUES` 必须递归冻结。

## 3. 默认配置与 schema

### 3.1 精确字段

配置必须是只有以下 own enumerable data properties 的普通对象：

```text
publicTitle
publicInstructions
foldHint
phaseHint
targetFolds
targetPhase
marks
finalTitle
finalMessage
signature
```

建议默认内容：

```js
{
  publicTitle: "把名字折成同一束光",
  publicInstructions: "读两条线索，选折面、转相位，让两项都对齐。",
  foldHint: "示例线索：把折面调到一周里周末之前的那一天数。",
  phaseHint: "示例线索：让刻度停在钟面十一点的位置。",
  targetFolds: 5,
  targetPhase: 22,
  marks: ["光", "影"],
  finalTitle: "原来我们一直在同一束光里",
  finalMessage: "角度不同，折回来时，还是在这里遇见。",
  signature: "来自准备这枚小镜子的人"
}
```

默认初值 `4 / 0` 与默认答案 `5 / 22` 不相同，且两项均为 near，便于首局理解
反馈但不会加载即完成。`phaseHint` 中十一点对应 24 格制的 `22`；README 必须
给准备者明确映射，不能要求自己猜换算。

### 3.2 文本清洗

所有文本必须：

1. 是 string primitive；
2. 是 well-formed Unicode，不含孤立 surrogate；
3. 先 `normalize("NFC")`；
4. 把连续普通/Unicode 空白折叠为一个 U+0020；
5. 去掉首尾空白；
6. 拒绝 C0/C1 control、U+2028/U+2029 与双向控制字符
   U+061C、U+200E、U+200F、U+202A–U+202E、U+2066–U+2069；
7. 按 Unicode code point 计数，不按 UTF-16 code unit。

字段范围：

| 字段 | 最短 | 最长 code point | 额外规则 |
| --- | ---: | ---: | --- |
| `publicTitle` | 1 | 40 | 可含内部空格 |
| `publicInstructions` | 1 | 120 | 可含内部空格 |
| `foldHint` | 1 | 120 | 可含内部空格 |
| `phaseHint` | 1 | 120 | 可含内部空格 |
| `marks[0/1]` | 1 | 2 | 不允许任何空白 |
| `finalTitle` | 1 | 60 | 可含内部空格 |
| `finalMessage` | 1 | 240 | 可含内部空格 |
| `signature` | 1 | 50 | 可含内部空格 |

marks 可以相同。位置标签“左边的光 / 右边的光”仍提供区分。首版不使用
`Intl.Segmenter`，因此组合 emoji 可能超过 2 code point 并触发整份回退；README
要如实说明，不把“看起来一个字形”承诺为任意 grapheme 支持。

### 3.3 数字与数组

- `targetFolds` 必须是 number primitive、安全整数且在 `[4,9]`；
- `targetPhase` 必须是 number primitive、安全整数且在 `[0,23]`；
- 不接受数字字符串、BigInt、boxed Number、NaN、Infinity 或 coercion；
- `marks` 必须是原生 dense Array，长度精确为 2；
- `marks` 不接受 getter、setter、额外 enumerable key、稀疏项、自定义原型或
  Array subclass。

### 3.4 原子回退

`sanitizeConfig(candidate)`：

- 候选全份合法：返回新的递归冻结、断引用配置；
- 任一字段缺失/多余、descriptor 非 data、读取抛错、字符串/数字/marks 非法：
  返回新的默认配置快照；
- 不允许“自定义线索 + 默认 target”或“自定义 marks + 默认 final”的混合；
- 不能把返回引用指向候选、`DEFAULT_CONFIG` 的可变子对象或调用方数组。

`DEFAULT_CONFIG` 自身递归冻结。每次原子回退可以返回同一冻结默认常量，也可以返回
新的冻结快照，但必须在实现中选一种并由测试固定。首版冻结为：**返回同一个
`DEFAULT_CONFIG` 引用**，减少无意义分配。

## 4. 公开 API

`logic.js` 同时暴露：

```text
window.KaleidoscopeNamesLogic
module.exports
```

顶层 exact API 顺序：

```text
CONSTANTS
DEFAULT_CONFIG
ACTIONS
sanitizeConfig
evaluateSelection
createPatternModel
createInitialState
reduce
getPublicView
```

`ACTIONS` 精确为：

```js
{
  START: "START",
  SET_FOLDS: "SET_FOLDS",
  SET_PHASE: "SET_PHASE",
  REVEAL: "REVEAL",
  RESTART: "RESTART"
}
```

API、常量、配置与所有成功返回对象递归冻结。初始化不得读取 DOM、时间、随机、
storage、网络、权限、音频或设备像素比。

## 5. 选择评估

### 5.1 `evaluateSelection`

签名：

```text
evaluateSelection(selectedFolds, selectedPhase, targetFolds, targetPhase)
```

四项必须分别满足自己的 exact integer domain；非法输入返回 `null`。

计算：

```text
foldDistance = abs(selectedFolds - targetFolds)

rawPhaseDistance = abs(selectedPhase - targetPhase)
phaseDistance = min(rawPhaseDistance, 24 - rawPhaseDistance)

foldStatus =
  foldDistance === 0 ? "exact" :
  foldDistance <= 1 ? "near" :
  "far"

phaseStatus =
  phaseDistance === 0 ? "exact" :
  phaseDistance <= 2 ? "near" :
  "far"

aligned = foldStatus === "exact" && phaseStatus === "exact"
```

成功 exact return keys：

```js
{
  foldDistance,
  phaseDistance,
  foldStatus,
  phaseStatus,
  aligned
}
```

返回递归冻结。phase 环形边界必须满足：

```text
distance(0, 23) = 1
distance(0, 22) = 2
distance(23, 1) = 2
distance(0, 12) = 12
```

### 5.2 唯一解

对任意合法 target，穷举：

```text
folds = 4..9
phase = 0..23
```

恰好 1 个组合的 `aligned === true`。near 不进入 aligned。

## 6. Pattern model

### 6.1 `createPatternModel`

签名：

```text
createPatternModel(folds, phaseStep)
```

非法输入返回 `null`。合法返回 exact keys：

```js
{
  turnUnits: 2520,
  phaseUnits: 105,
  folds,
  phaseStep,
  wedges
}
```

`wedges.length === folds`。第 `i` 项：

```js
{
  index: i,
  rotationUnits:
    (phaseStep * 105 + i * (2520 / folds)) % 2520,
  mirrored: i % 2 === 1
}
```

`rotationUnits` 始终为 `[0,2519]` 的安全整数。模型及 wedges 递归冻结、每次返回
断引用。

### 6.2 Renderer 合同

app：

```text
radians = rotationUnits / 2520 * Math.PI * 2
```

Canvas 只消费 model。原创 base motif 由三条固定 normalized path 组成；精确
path 坐标在 design 后由实现计划冻结，不进入规则 API。

Renderer 禁止：

- 根据像素、图像识别、`measureText()` 或 animation state 判断 aligned；
- 复制 near/exact 阈值；
- 把 target、marks 或 final 内容绘入 tuning/aligned Canvas；
- 通过 Canvas hit testing 操作 controls；
- 用 CSS/Canvas failure 改变 reducer action。

## 7. 权威状态

### 7.1 Exact state

```js
{
  version: 1,
  phase: "intro" | "tuning" | "aligned" | "complete",
  content,
  selection: {
    folds,
    phaseStep
  },
  revision
}
```

- `content` 是 sanitized config；
- `selection` 初始为 `{ folds: 4, phaseStep: 0 }`；
- `revision` 是 `[0, 1000000]` 安全整数；
- state、content、selection 递归冻结；
- 不存 evaluation、pattern model、DOM、Canvas、焦点、notice 或 animation token；
- `phase` 与 selection 必须一致：
  - `intro` / `tuning`：selection 可为任意合法组合，但 tuning 不得已 aligned；
  - `aligned` / `complete`：selection 必须等于 target。

`intro` 初始 selection 固定为 `4 / 0`。若未来自定义 target 恰好也是 `4 / 0`，
仍保持 intro；START 后直接进入 aligned 会让作品加载后第一步完成，因此配置
合法性增加一条：**target 不得同时等于 `INITIAL_FOLDS / INITIAL_PHASE`**。
违反时整份回退。

### 7.2 `createInitialState`

```text
createInitialState(candidateConfig?)
```

- 无参数或非法 candidate 使用 `DEFAULT_CONFIG`；
- 返回 `phase="intro"`、初始 selection、`revision=0`；
- 不自动评估或进入 aligned；
- 返回递归冻结、断引用 state。

## 8. Actions 与 reducer

### 8.1 Exact action schema

所有 action 必须是普通对象、只有 own enumerable data properties、不接受 getter、
setter、Proxy 抛错、额外字段、继承字段或 coercion。

```js
{ type: "START", revision }
{ type: "SET_FOLDS", value, revision }
{ type: "SET_PHASE", value, revision }
{ type: "REVEAL", revision }
{ type: "RESTART", revision }
```

`revision` 必须严格等于当前 state revision。旧、未来或非整数 revision no-op。

### 8.2 通用 no-op

以下均返回原 state 引用：

- state 非法；
- action 非法；
- action revision 不匹配；
- phase 不允许该 action；
- value 不在 exact domain；
- SET value 与当前值相同；
- 当前 revision 已为 `MAX_REVISION`；
- action 处理需要越过 revision 上界。

reducer 不抛异常。

### 8.3 START

只允许 intro：

1. 评估初始 selection；
2. 因 config 已排除初始 target，结果必不 aligned；
3. phase 进入 tuning；
4. revision `+1`。

### 8.4 SET_FOLDS / SET_PHASE

只允许 tuning：

1. 用 action value 产生新 selection；
2. 调用同一 `evaluateSelection`；
3. 非 aligned：phase 保持 tuning；
4. aligned：同一 action 原子进入 aligned；
5. revision `+1`。

不得先返回“tuning + aligned selection”的中间 state。

### 8.5 REVEAL

只允许 aligned 且 state selection 与 target exact：

- phase 进入 complete；
- selection/content 不变；
- revision `+1`。

marks/final 不因 reducer action 被复制进其他字段；它们仍只在 content 内，并由
public view 控制公开。

### 8.6 RESTART

只允许 complete：

- phase 进入 intro；
- selection 重置为 `4 / 0`；
- content 保留同一冻结引用；
- revision `+1`，不回到 0。

旧 complete view 与新 intro view 不共享 marks/final 数组或对象引用。app 必须
卸载 complete DOM。

## 9. Public view

`getPublicView(state)`：

- state 非法返回 `null`；
- 每个 phase 返回 exact、递归冻结、断引用 DTO；
- 不返回 content、target、未来 phase 字段、函数或 state 引用；
- pattern 由当前 selection 生成；
- 状态文本由 exact status 表生成，不接受 config 覆盖。

### 9.1 Intro

Exact keys：

```js
{
  phase: "intro",
  revision,
  title: content.publicTitle,
  instructions: content.publicInstructions,
  primaryAction: {
    id: "start",
    label: "开始折光"
  }
}
```

不得含 hint、selection、pattern、target、marks 或 final。

### 9.2 Tuning

Exact keys：

```js
{
  phase: "tuning",
  revision,
  title,
  foldControl: {
    label: "选择镜面阶数",
    hint: content.foldHint,
    values: [4, 5, 6, 7, 8, 9],
    selected,
    status: "far" | "near" | "exact",
    statusText
  },
  phaseControl: {
    label: "转动相位",
    hint: content.phaseHint,
    min: 0,
    max: 23,
    step: 1,
    selected,
    displayText: "第 n / 24 格",
    status,
    statusText
  },
  summary,
  pattern
}
```

`statusText` 固定：

```text
far   → “还没贴近”
near  → “已经贴近”
exact → “已对齐”
```

`summary` 固定组合：

```text
“折面{statusText}；相位{statusText}。”
```

DTO 不含距离数字、方向、target、marks 或 final。

### 9.3 Aligned

Exact keys：

```js
{
  phase: "aligned",
  revision,
  title,
  summary: "这束光已经对齐。",
  selection: {
    folds,
    phaseStep,
    phaseDisplayText
  },
  pattern,
  primaryAction: {
    id: "reveal",
    label: "照见我们"
  }
}
```

不得含 marks、final 或 content。selection 只公开用户刚刚完成的答案，不额外
公开“target”字段。

### 9.4 Complete

Exact keys：

```js
{
  phase: "complete",
  revision,
  publicTitle,
  finalTitle,
  marks: [
    { position: "left", label: "左边的光", text: content.marks[0] },
    { position: "right", label: "右边的光", text: content.marks[1] }
  ],
  finalMessage,
  signature,
  pattern,
  primaryAction: {
    id: "restart",
    label: "再折一次"
  }
}
```

marks 数组与两项对象每次断引用、递归冻结。

## 10. App-local 状态

app 只允许维护：

```text
current authoritative state
last rendered phase
active render generation
reduced-motion match
canvas context / dimensions
last announced summary
```

禁止 app-local 保存：

- target 副本；
- marks/final 副本；
- near/exact 阈值；
- 第二套 selection；
- hidden complete DOM；
- storage snapshot；
- 定时自动推进。

事件流程：

1. 从最新 public view 渲染；
2. 用户动作携带 `view.revision`；
3. reducer 返回 next state；
4. 同引用则只处理合法的界面 no-op，不伪造 revision；
5. 新引用则替换 state，再从新 view 完整投影。

## 11. DOM 合同

### 11.1 静态 HTML

静态入口只含：

- skip link；
- 公共 `<header>`；
- 单一 `<main id="app">`；
- 一个 `<noscript>` 的公开提示；
- 本地经典脚本顺序；
- 不含 marks、final title/message/signature 或两条 config hint 的模板/隐藏文本。

脚本：

```html
<script src="./config.js"></script>
<script src="./logic.js"></script>
<script src="./app.js"></script>
```

不使用 `type=module`、inline event handler、远程 URL 或动态脚本。

### 11.2 Phase DOM

每次 phase 改变，清空并重建 `#app` 的 phase subtree。不能用一套完整模板配合
`display:none`。

Intro：

```text
section[aria-labelledby]
  h1
  p
  button
```

Tuning：

```text
section
  h1
  fieldset + legend + hint + six buttons
  label + hint + input[type=range] + output
  status list
  figure
    canvas[aria-hidden=true]
    figcaption
  div[role=status][aria-live=polite]
```

Aligned：

```text
section
  h1
  p status
  figure/canvas + figcaption
  button reveal
```

Complete：

```text
section
  h1 final title
  figure/canvas + figcaption
  dl or list containing two labeled marks
  p final message
  p signature
  button restart
```

不把配置文本写入 `innerHTML`、`outerHTML`、style、URL、`data-*`、class name、
id 或 Canvas。全部通过 `textContent`。

### 11.3 焦点

- 初始焦点不强抢；
- START 后聚焦 tuning `h1`（`tabindex=-1`）；
- SET 后焦点留在触发控件；
- 进入 aligned 后同步聚焦 reveal button；
- REVEAL 后聚焦 complete `h1`；
- RESTART 后聚焦 intro `h1`；
- 只有当前前台、由当前 generation 用户动作产生的 transition 可以移动焦点；
- `pageshow`、resize、media query change、Canvas retry 不移动焦点。

## 12. Canvas 与绘制生命周期

- 视觉逻辑在 `app.js`，首版不需要单独 renderer 模块；
- 使用 Canvas 2D；`getContext("2d")` 返回 null 时走 CSS fallback；
- DPR 只影响 bitmap 清晰度，CSS 尺寸由容器决定；
- resize 使用当前 pattern model 重绘，不派发 action；
- 正常状态过渡最长 240ms，只插值当前/下一 model 的表现；
- reduced-motion、页面 hidden、Canvas failure 时直接画/投影 final model；
- 每次 phase/action 增加 app render generation；旧 rAF callback no-op；
- `pagehide` 取消 rAF；`pageshow` 只从当前 state 重绘；
- 不使用无限 rAF loop。

Pattern 由原创固定路径构成。精确颜色、normalized path 与布局需在 design 确认后
写入实施计划，当前规格不批准视觉生产。

## 13. CSS、动效与可访问合同

- 所有交互目标视觉框至少 48×48 CSS px；
- `:focus-visible` 有至少 2px、与相邻背景 3:1 的可见轮廓；
- pressed、near、exact 同时有文字和非颜色形状；
- 文档顺序与视觉顺序一致；
- 320px 无页面横向滚动；
- 200% text 不裁切；
- 400% zoom 控件/文字单列，图案可缩小；
- forced-colors 使用系统颜色、真实 border 和 outline；
- no-CSS 仍按语义顺序操作；
- no-JS 不出现私人内容或伪按钮；
- `prefers-reduced-motion: reduce` 取消全部 transform/position/size 动画；
- 不定义 infinite animation、闪烁、全屏亮度翻转或红色高频脉冲；
- complete 的 opacity 淡入不是规则 Gate，reduced-motion 下为 0ms。

## 14. 隐私与生命周期

禁止：

```text
fetch / XMLHttpRequest / WebSocket / EventSource / sendBeacon
localStorage / sessionStorage / IndexedDB / cookie
serviceWorker / Worker
mediaDevices / geolocation / sensors / notification
clipboard / share
URL query/hash private content
```

页面 `visibilitychange` 不改权威 state，不清空 tuning selection，也不自动 REVEAL。
BFCache 返回从当前 state 重建当前 phase；若返回 complete，可以重新投影已经由
用户揭晓的内容，但不能先出现旧 complete 再闪回 intro。

隐私 sentinel 至少选默认 marks、finalTitle、finalMessage、signature 和自定义
fixture 各一组，扫描：

- 静态 HTML；
- 当前 DOM text/attributes/ARIA；
- Canvas fallback text；
- live region；
- tuning/aligned public view JSON；
- app debug/global surface。

源文件明文不在 sentinel 的保密承诺内；README 必须解释这一点。

## 15. 文件与模块

生产阶段目标：

```text
experiences/surprises/kaleidoscope-names/
├── ATTRIBUTION.md
├── README.md
├── app.js
├── config.js
├── index.html
├── logic.js
├── logic.test.js
├── package.json
└── styles.css
```

目录级 `package.json`：

```json
{ "type": "commonjs" }
```

不增加根依赖、lockfile、共享 runtime 或外部资产。

## 16. 测试规格

### 16.1 逻辑单测

至少覆盖：

1. 顶层 API、ACTIONS、CONSTANTS exact keys/order 与递归冻结；
2. 默认配置 exact 值、初值不等于 target；
3. 配置原子回退、NFC、空白、code point、控制/双向字符、surrogate；
4. marks 相同合法；稀疏数组、subclass、额外 key、getter、Proxy 非法；
5. 数字字符串/BigInt/boxed/NaN/Infinity/边界拒绝；
6. `evaluateSelection` 全边界与环形距离；
7. 6 组 target × 24 组 target，各自穷举 144 selection，唯一 aligned；
8. `2520` 整除、各 folds wedge count、rotation range、alternating mirror；
9. pattern model 断引用、冻结与确定性；
10. initial state exact、冻结、content ownership；
11. 五 action schema、额外字段、stale/future revision 与 MAX_REVISION；
12. SET 顺序交换律、same-value 同引用；
13. 第二项 exact 原子进入 aligned；
14. aligned 只接受 REVEAL、complete 只接受 RESTART；
15. restart selection 重置但 revision 单调；
16. 每个 phase public DTO exact keys、冻结、断引用；
17. intro/tuning/aligned sentinel 无 marks/final/target；
18. complete marks 相同/不同、Unicode 与长文投影；
19. JSON clone state 的明确策略。

JSON clone 会丢失冻结但保留普通数据。首版 `reduce/getPublicView` 接受结构合法的
JSON clone state，并重新冻结新返回；若 action no-op，则允许返回传入 clone
原引用。带自定义原型、accessor 或额外 key 的 state 非法。

### 16.2 静态合同

- 三个经典脚本顺序正确；
- 不含 module、远程 URL、网络/storage/权限 API；
- 静态 HTML 不含私人 sentinel；
- no inline handler、no `innerHTML`；
- 控件/label/role/status/heading 结构；
- CSS reduced-motion/forced-colors/focus-visible；
- 无 infinite animation/flash token；
- attribution 与 README 必需标题；
- 目录单独复制的相对引用闭包。

### 16.3 浏览器场景

正常默认配置完整跑：

1. Intro → Start；
2. 键盘选择错误 folds，确认 far/near；
3. 键盘 range 跨越 `23 → 0`，确认环形反馈；
4. 先 phase exact、后 folds exact，进入 aligned；
5. aligned 检查 marks/final 不在 DOM；
6. Reveal → complete；
7. Restart → intro，私人节点卸载；
8. 再以 folds-first 顺序完成，结果相同。

另测：

- 鼠标与触屏；
- 320×568、390×844、768×1024、1280×720、1504×1000；
- 200% text、400% zoom、横屏低高度；
- reduced-motion、forced-colors、Canvas `getContext` null；
- no-JS；
- 页面 hidden/visible、BFCache/刷新；
- Network 零公网请求、console 零未解释错误。

### 16.4 启动 Gate

命令：

```bash
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --check experiences/surprises/kaleidoscope-names/app.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js
npm test
npm run verify
git diff --check
```

A 级另需：

- Finder 真实双击 `index.html` 跑完一轮和重开；
- 静态服务浏览器自动化完整跑；
- 断网后重复；
- 作品目录单独复制后直开；
- 三层证据分别记录，不用 localhost 冒充 `file://`。

## 17. 借鉴与许可证

生产 `ATTRIBUTION.md` 必须包含：

> 本作的二维校准玩法、2520 整数圈模型、状态机、默认内容、Canvas 图案、DOM、
> CSS 与测试由本仓库独立设计和编写。开发前置阶段没有参考、复制、修改、链接或
> 打包任何第三方万花筒项目、源码、纹样、图片、字体、图标、文案或视觉作品。

并列出仅用于平台校准的一手文档：

- WHATWG HTML Canvas；
- WHATWG HTML Range state；
- W3C Pointer Events；
- WCAG 2.2 / WAI Keyboard、Status Messages、Target Size、Animation、Three
  Flashes；
- Media Queries Level 5 reduced-motion。

这些文档不是运行依赖或视觉来源。若生产阶段新增任何开源参考，必须暂停实现，
回到 research：

1. 固定 commit/tag URL；
2. 核对 LICENSE、版权人和资源单独许可证；
3. 写明借鉴什么、没有复制什么；
4. 若复制代码/资产，保留许可证正文、版权与 notice；
5. 再由总控决定是否继续。

## 18. 生产前 Gate

本规格冻结后仍不得直接生产 UI。后续必须：

1. 完成实施 plan；
2. 单独产出 design proposal；
3. 由用户确认设计方向；
4. 再按 plan 分批实现逻辑、交互、样式与集成；
5. 每个阶段独立 commit。

design 可以选择颜色、排版、图案路径和响应式构图，但不能改变：

- 两轴 exact 规则；
- 原生按钮/range；
- 四阶段；
- active privacy；
- A 级与零依赖；
- reduced-motion / Canvas failure 等价路径。

任何改变上述合同的设计建议都必须返回本规格复审。
