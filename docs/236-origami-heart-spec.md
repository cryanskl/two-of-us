# “沿着折痕，折到你心里”可执行规格

- 日期：2026-07-24
- 状态：冻结，可进入纯逻辑与代码原生 UI 实现
- 对应 Brainstorm：[`234-origami-heart-brainstorm.md`](./234-origami-heart-brainstorm.md)
- 对应调研：[`235-origami-heart-research.md`](./235-origami-heart-research.md)
- 目标目录：`experiences/surprises/origami-heart/`
- 启动等级：A

## 1. 产品契约

公开作品名：

> 沿着折痕，折到你心里

complete 前固定公开 H1：

> 沿着折痕，慢慢折

完整路径：

```text
intro
  → folding / 0
  → folding / 1
  → folding / 2
  → folding / 3
  → folding / 4
  → turning / 5
  → complete / 5
```

用户可以拖动当前活动折边，也可以按“折好这一步”。两条输入路径只产生同一个 `COMMIT_FOLD`。五道折痕完成后必须再主动执行 `TURN_OVER`，不能由最后一次拖动、CSS 动画结束或计时器自动揭晓。

## 2. 冻结常量

```js
VERSION = 1
FOLD_COUNT = 5
COMMIT_THRESHOLD = 0.72
MAX_TRAVEL_PX = 4096
```

折痕顺序：

| index | foldId | 公开标签 | 公开指令 | 投影向量 | `travelPx` |
|---:|---|---|---|---|---:|
| 0 | `bottom-up` | 第一折 · 收起下边 | 把下边沿亮起的折痕向上收好 | `(0, -1)` | `0.36 * S` |
| 1 | `left-in` | 第二折 · 收进左角 | 把左边的角收向纸心 | `(1, 0)` | `0.28 * S` |
| 2 | `right-in` | 第三折 · 收进右角 | 把右边的角收向纸心 | `(-1, 0)` | `0.28 * S` |
| 3 | `top-left-soften` | 第四折 · 收圆左尖 | 把左上尖角轻轻向内收 | `(1, 1)` | `0.24 * S` |
| 4 | `top-right-soften` | 第五折 · 收圆右尖 | 把右上尖角轻轻向内收 | `(-1, 1)` | `0.24 * S` |

`S` 是 pointerdown 时 `.paper-object` 宽高较小值，并冻结到该次手势。对角投影除以 `2 * travelPx`，水平/垂直投影除以 `travelPx`。负投影返回 0，大于 1 返回 1；正交位移不能产生进度。

这些是原创网页仪式步骤，不声称是传统折纸模型教学。

## 3. 配置契约

`config.js` 提供：

```js
window.OrigamiHeartConfig = {
  recipientName,
  finalTitle,
  finalMessage,
  signature
}
```

精确字段和限制：

| 字段 | 规范化后长度 | 默认值 |
|---|---:|---|
| `recipientName` | 1..24 | `给正在读这张纸的你` |
| `finalTitle` | 1..40 | `这颗心，折给你` |
| `finalMessage` | 1..180 | `有些话想慢一点说，所以先把它折好，再交到你手里。` |
| `signature` | 1..32 | `一直站在你这边的人` |

规范化：

1. 只接受 native plain object 或 `null` prototype；
2. 只能有四个字符串 data property，不能有 symbol、accessor、继承字段或额外字段；
3. 字符串先 NFC，再把连续 Unicode whitespace 折叠为一个空格并 trim；
4. 任一字段失败则整份回退到递归冻结的默认配置；
5. 返回值与输入断开引用并递归冻结；
6. 配置校验不能调用普通 getter。

## 4. 权威状态

精确状态：

```js
{
  version,
  phase,
  completedFoldIds,
  revision,
  lastNotice
}
```

字段约束：

- `version === 1`；
- `phase` 只能是 `intro | folding | turning | complete`；
- `completedFoldIds` 是 dense native array，只能是 `FOLD_IDS` 的严格前缀；
- `revision` 是安全非负整数，并与规范状态唯一对应；
- `lastNotice` 与规范状态唯一对应；
- reducer 产生的状态递归冻结。

规范状态表：

| phase | 已完成数 | revision | lastNotice |
|---|---:|---:|---|
| intro | 0 | 0 | `ready` |
| folding | 0 | 1 | `started` |
| folding | 1..4 | `completed + 1` | `fold-committed` |
| turning | 5 | 6 | `folding-complete` |
| complete | 5 | 7 | `revealed` |

JSON clone 的合法状态必须能够通过 `assertState`；冻结不是输入合法性的必要条件。

## 5. Action 与 reducer

精确 action：

```text
START          { type }
COMMIT_FOLD    { type, foldId }
TURN_OVER      { type }
RESTART        { type }
```

Action 要求：

- native plain object 或 `null` prototype；
- 精确 own string keys、data property、无 symbol/accessor；
- `COMMIT_FOLD.foldId` 必须属于冻结 ID；
- 结构畸形 action 抛 `TypeError`；
- 结构合法但 phase/顺序不对的 action 返回原 state 引用；
- 畸形 state 通过任意公开 reducer 调用都回到一个新的安全 intro，不继续执行该 action。

转移：

### 5.1 `START`

- 只在 intro 生效；
- 转到 folding，前缀仍为空，revision 1。

### 5.2 `COMMIT_FOLD`

- 只在 folding 生效；
- `foldId` 必须等于前缀之后唯一的下一 ID；
- 前四次提交仍为 folding；
- 第五次提交原子进入 turning；
- 重复、越序或历史 foldId 都是 no-op。

### 5.3 `TURN_OVER`

- 只在 turning 生效；
- 原子进入 complete；
- 私密内容不写进 state。

### 5.4 `RESTART`

- intro 中 no-op；
- 其他 phase 返回新的 canonical intro；
- 不保留完成内容、手势、进度或历史。

## 6. 纯函数

### 6.1 `projectFoldProgress`

```js
projectFoldProgress(foldId, deltaX, deltaY, travelPx) -> number
```

- 四个数值输入必须有限；
- `travelPx` 必须在 `1..4096`；
- 未知 foldId 或非法数值返回 0，不抛异常；
- 只计算当前向量投影并钳制到 `0..1`；
- 不读取 DOM、PointerEvent、时间或设备信息。

### 6.2 `shouldCommitFold`

```js
shouldCommitFold(progress) -> boolean
```

- 只对有限数值生效；
- `progress >= 0.72` 返回 true；
- 其他值返回 false。

纯函数只帮助 app 决定是否派发 action，不能直接修改 state。

## 7. 公开 DTO

```js
getOrigamiHeartView(state, config)
```

返回递归冻结、与输入断开引用的：

```js
{
  version,
  phase,
  revision,
  lastNotice,
  progress: {
    completed,
    total,
    currentStepNumber
  },
  currentFold,
  foldList,
  controls: {
    canStart,
    canCommitFold,
    canTurnOver,
    canRestart
  },
  text: {
    heading,
    instruction,
    progress
  },
  privateContent
}
```

### 7.1 `currentFold`

- folding 时是 `{ id, index, label, instruction }`；
- 其他 phase 为 `null`。

### 7.2 `foldList`

五项冻结数组，每项：

```js
{ id, index, label, status }
```

`status` 只能是 `done | current | upcoming`。

### 7.3 私密边界

- intro、folding、turning：`privateContent === null`；
- complete 才返回四个配置字段；
- complete 前 JSON、字符串字段、折痕 label、进度和状态文案都不得包含配置值；
- `getOrigamiHeartView` 接收畸形 state 时返回安全 intro view；
- complete 前 app 不创建私密节点，也不把配置写入属性、ARIA、注释、template 或隐藏元素。

## 8. App 层手势状态

手势只存在于 app 闭包：

```js
{
  generation,
  pointerId,
  foldId,
  startX,
  startY,
  travelPx,
  progress
}
```

生命周期：

1. 仅当前 fold handle 的 primary `pointerdown` 开始；mouse 还必须是 button 0；
2. 调用 `setPointerCapture`，失败则仍允许同元素内完成；
3. `pointermove` 调用 `projectFoldProgress` 并只更新 CSS 变量；
4. `pointerup` 调用 `shouldCommitFold`，成功才派发 `COMMIT_FOLD`；
5. `pointercancel`、`lostpointercapture`、`blur`、`visibilitychange(hidden)` 清空；
6. 清空后 CSS 变量回到 0；
7. Pointer 成功提交后只抑制同一 pointer generation 产生的兼容 click；不能使用全局时间锁；
8. 阶段 render 前递增 generation 并清理旧手势，迟到事件身份不匹配时只清理；
9. reducer 仍必须对重复提交 no-op。

## 9. DOM 与隐私

`index.html` 只含公开壳：

```text
body.origami-heart
└── main.app-shell
    ├── header（公开 H1、公开说明、进度）
    ├── section#stage（phase-owned DOM）
    ├── ol#fold-progress（五步公开状态）
    └── p#live-status.sr-only[role=status]
```

规则：

- phase 变化使用 `replaceChildren()` 替换 stage；
- 标题使用真实 heading，阶段变化后聚焦 `#phase-heading`；
- 所有配置文本只通过 `textContent` 写入 complete 新节点；
- 禁止 `innerHTML` 写配置；
- 单一稳定 live region，只播开始、折好、准备翻面、完成与重开；
- `<noscript>` 只说需要启用 JavaScript，不包含私密内容；
- HTML 注释、metadata、favicon 和默认属性不含配置值。

## 10. 代码原生视觉

### 10.1 纸张结构

- 一张 `.paper-model`；
- 一个正面、一个背面；
- 五个与折痕 ID 对应的 flap/crease；
- CSS `data-completed` 与 `data-phase` 只反映 view；
- 手势进度只写 `--fold-progress`；
- 不从元素几何或 computed style 读取规则状态。

### 10.2 渐进增强

- 基础层：2D 纸张、编号折痕、状态文本与按钮；
- `@supports (transform-style: preserve-3d)`：增加 perspective、翻面与折面层叠；
- reduced-motion：移除 transition/animation，直接显示稳态；
- forced-colors：使用 Canvas/CanvasText/ButtonText/Highlight 系统色，保留边框、编号和 outline；
- 不支持 `clip-path` 时保持矩形纸片与折痕，不影响操作。

### 10.3 触控与响应式

| 条件 | Gate |
|---|---|
| 1728×906 | 纸张与步骤并列，主动作首屏可见 |
| 1280×800 | 纸张至少 360px，信息不覆盖 |
| 390×844 | 单列，纸张 260–310px，按钮 ≥56px |
| 320 CSS px 等效宽度 | 无横向溢出，允许纵向滚动，按钮 ≥52px |
| 1280×800 / 400% zoom | 回流到等效 320 CSS px，不丢功能或要求非必要双向滚动 |
| 200% 文本缩放 | 不裁字、不遮按钮，所有文本和控件仍可用 |

项目命中目标使用至少 48×48 CSS px，focus-visible outline 至少 3px。

## 11. A 级启动与安全边界

- 经典脚本顺序：`config.js → logic.js → app.js`；
- 无 module、fetch/XHR/WebSocket、Storage、Service Worker、Worker、Clipboard、WebAudio、媒体、传感器或权限；
- 无 runtime dependency、vendor、CDN、远程字体、图片或音频；
- `file://` 下使用相对路径直接打开；
- 不读取其他体验私有文件；
- 不使用 `eval`、`Function`、字符串 timer 或配置 `innerHTML`。

## 12. 测试矩阵

逻辑测试至少覆盖：

1. UMD/CommonJS 同一冻结 API；
2. 初始化零浏览器、时间、随机、存储和网络副作用；
3. 常量、五步表、向量、默认配置和递归冻结；
4. 配置整份回退、getter/symbol/extra/null-prototype/Unicode/长度；
5. 水平、垂直、对角、反向、正交、0/0.719/0.72/1 投影；
6. START、五步金路径、TURN_OVER、RESTART；
7. 五步所有越序、重复和历史提交 no-op；
8. exact action schema、accessor、symbol、prototype 与错误 phase；
9. canonical state 表、JSON clone、伪造前缀/revision/notice/phase；
10. complete 前 view 不含四个私密值；
11. complete 才公开配置，且与输入断开；
12. app/logic 生产源码无禁用 API 与不安全 sink。

UI/浏览器至少覆盖：

1. 只点按钮完整完成；
2. Pointer 成功、未过阈值、反向、cancel、lost capture；
3. blur/hidden 清理且不推进；
4. compatibility click 不重复推进；
5. complete 前 outerHTML/文本/属性无私密值；
6. complete 后四项文本正确且重开删除；
7. 键盘 Tab/Enter/Space/ArrowRight、焦点与 live region；
8. 四档视口、1280/400% reflow、200% 文本、reduced-motion、forced-colors；
9. 3D/clip-path 不可用与脚本阻断；
10. console、network 与 `file://` / localhost 边界。

## 13. 完成定义

S16 只有同时满足以下条件才从创意池改为已实现：

- 逻辑、UI、README、ATTRIBUTION、catalog 和共享测试完成；
- 五步 + 主动翻面 + complete 私密 DOM 全路径可用；
- A 级离线直开契约通过；
- 两个 MIT 来源、GPL/无许可证排除和零复制声明一致；
- 定向、全仓、verify 与 Chrome 验收通过；
- 新发现 bug 写入 `bugs/`，可复用知识写入 `learn/`；
- 各部分独立提交且最终 worktree clean。
