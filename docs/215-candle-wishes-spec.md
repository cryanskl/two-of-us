# “把愿望，一盏一盏点亮”可执行规格

- 规格日期：2026-07-23
- 对应调研与 Brainstorm：[214-candle-wishes-research.md](./214-candle-wishes-research.md)
- 对应创意：S17“蛋糕点烛”
- 目标目录：`experiences/surprises/candle-wishes/`
- 启动等级：A（直接双击 `index.html`，零安装、服务、权限或公网）

## 1. 产品定义

这是一个给对象准备的有限单人惊喜。接收者每次阅读一条当前线索，从五支有文字
标签的蜡烛中选择对应项。正确蜡烛永久点亮并追加一句愿望；错误选择不扣分、
不重置，也不改变权威状态。五支全部点亮后，只有主动按下“收下这些愿望”，
才创建称呼、私人标题、完整留言与署名。

页面固定公开标题：

> 今晚，点亮五支蜡烛

固定说明：

> 读一条线索，点亮对应的蜡烛。选错不会失去什么；五盏都亮起后，会有一段话留给你。

固定隐私说明：

> 内容写在本地文件里；页面不会上传或另存，最后的话会在五盏都亮起后出现。

首版只做：

- 固定五支蜡烛；
- 准备者配置的一条五步路线；
- 当前线索与五个公开标签的匹配；
- 已揭晓愿望的有序前缀；
- 五支齐后的主动最终揭晓；
- 重新开始、无脚本提示、降动效与 forced-colors；
- HTML/CSS/inline SVG 基本图形。

首版不做：

- 麦克风、语音、吹气、摄像头、传感器或任何权限；
- 年龄、生日、日期、随机数量或随机路线；
- 计时、分数、连错、惩罚、生命、评级或排行榜；
- 自动播放、自动点亮、循环动画、烟花、彩纸或音频；
- 图片、远程字体、Canvas、WebGL、Worker 或第三方运行依赖；
- 分享、导出、Storage、账号、URL 私密参数或公网。

## 2. 文件与职责

```text
experiences/surprises/candle-wishes/
├── index.html
├── package.json
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── styles.css
├── README.md
└── ATTRIBUTION.md
```

经典脚本顺序固定为 `config.js → logic.js → app.js`。不用 ES Module、dynamic
import、bundler、运行时 fetch 或远程资源。

- `package.json`：只含 `{"type":"commonjs"}`，证明 Node 可真实 `require()`；
- `config.js`：五支自定义蜡烛、称呼、私人标题、留言与署名；
- `logic.js`：配置快照、状态校验、reducer 与 exact public view；
- `app.js`：DOM 投影、click、app-local 错误播报、焦点与环境降级；
- `styles.css`：CSS 蛋糕/火焰、响应式、焦点、高对比与降动效；
- `logic.test.js`：纯 Node、零 DOM；
- README/ATTRIBUTION：玩法、定制、隐私、来源、许可证与零复制声明。

`logic.js` 使用浏览器全局/CommonJS 双出口；导入时不得访问 DOM、Date、随机、
timer、storage、network、audio、permissions 或 runtime hook。

## 3. 冻结常量与公开文案

```js
VERSION = 1
CANDLE_COUNT = 5
DISPLAY_PERMUTATION = [2, 4, 0, 3, 1]
MAX_REVISION = Number.MAX_SAFE_INTEGER
```

`DISPLAY_PERMUTATION` 是 route index 的展示顺序，不是 candle ID。它精确含
`0..4` 各一次，递归冻结，不能由 config、随机、视口或上局结果改变。

固定按钮与状态文案：

```text
intro progress       还没有点亮第一盏。
lighting progress    已经点亮 {n} / 5 盏。
ready progress       五盏都亮了。愿望还在等你收下。
complete progress    这些愿望都交给你了。

intro action         开始点亮
ready action         收下这些愿望
complete action      再看一次

wrong live           这一盏还没轮到。再看看眼前的线索。
ready live           五盏都点亮了。愿望已经准备好。
complete live        五个愿望已经收下。最后的话已展开。
```

正确点亮的 live 精确为：

```text
第 {n} 盏已点亮：{wish}
```

页面不得自行根据 CSS class、DOM 数量或数组长度发明第二套文案。

## 4. 默认配置

```js
window.CANDLE_WISHES_CONFIG = {
  recipient: "你",
  finalTitle: "愿每一个以后，都有我们",
  finalMessage:
    "这些愿望不是今天才有。只是今晚，我把它们一盏一盏点亮，想认真交给你。",
  signature: "——一直想和你走下去的我",
  candles: [
    {
      id: "rain",
      label: "那场雨",
      cue: "先从我们都没带伞的那天开始",
      wish: "愿以后的雨天，我们还愿意把伞往对方那边多偏一点。"
    },
    {
      id: "noodle",
      label: "深夜面馆",
      cue: "下一盏，留给那碗把疲惫慢慢赶走的热汤",
      wish: "愿再晚的夜，我们也有一张桌子可以坐下来好好说话。"
    },
    {
      id: "journey",
      label: "第一次远行",
      cue: "再想想那次第一次一起走到陌生地方",
      wish: "愿每一段陌生的路，因为并肩走着，都慢慢变成值得记住的地方。"
    },
    {
      id: "quiet",
      label: "安静并肩",
      cue: "这一盏属于不用说话也很安心的时刻",
      wish: "愿我们不只分享热闹，也能在安静里好好陪着彼此。"
    },
    {
      id: "home",
      label: "回家以后",
      cue: "最后，把光留给每一次一起回家的以后",
      wish: "愿以后推开门的时候，我们总能先看见彼此，再看见一天的疲惫。"
    }
  ]
};
```

数组顺序是唯一正确路线：`rain → noodle → journey → quiet → home`。默认按钮
展示顺序由 permutation 得到：

```text
journey → home → rain → quiet → noodle
```

Canonical 口径：生产 validator 先创建普通、断引用、固定属性顺序的数据；测试
再对原生 `JSON.stringify(value)` 的 UTF-8 字节做 SHA-256，不加 BOM、空格、
缩进或末尾换行，也不调用输入对象的 `toJSON`。生产逻辑不需要 crypto。

`DEFAULT_CONFIG` canonical JSON 的 SHA-256 固定为：

```text
fa84ee0e0c8e400f22cabd346cfbfa432a69e751bda85fd439071205ff03d37b
```

生产测试必须从导出的 `DEFAULT_CONFIG` 生成 canonical JSON 并校验该哈希；测试
不得维护第二份默认库存。

## 5. 配置合同

`sanitizeConfig(candidate)` 只接受精确 own-data schema：

- 顶层精确 `recipient / finalTitle / finalMessage / signature / candles`；
- 顶层和每个 item 原型精确为当前 realm 的 `Object.prototype`；
- `candles` 是当前 realm 原生 dense Array，精确 5 项；
- 每项精确 `id / label / cue / wish`；
- 数组和对象不得有 extra key、symbol、accessor、custom prototype、继承属性、
  自定义 iterator/map 或 sparse hole；
- `id` 匹配 `/^[a-z][a-z0-9-]{0,23}$/`，五项唯一；
- label 清洗后 `2..12` Unicode code point，五项唯一；
- cue 清洗后 `4..32` code point；
- wish 清洗后 `8..56` code point；
- recipient 清洗后 `1..12` code point；
- finalTitle 清洗后 `2..32` code point；
- finalMessage 清洗后 `1..180` code point，最多 4 行；
- signature 清洗后 `1..36` code point；
- 任一 trap、字段、长度、唯一性或复制失败，整份回 `DEFAULT_CONFIG`；
- 不做字段混搭，不冻结、修改或复用调用方引用。

单行字段 `recipient/finalTitle/signature/id/label/cue/wish` 拒绝 CR、LF、
U+2028/U+2029、C0/C1 control 和 lone surrogate。`finalMessage` 只允许 LF，
拒绝 CR、U+2028/U+2029、其他 C0/C1 control 与 lone surrogate。

文本处理顺序：

1. descriptor value 必须是 primitive string；
2. 在 raw UTF-16 上先拒绝非法 control、line separator 与 lone surrogate；
3. 调用捕获的 `String.prototype.normalize("NFC")`；
4. 调用捕获的 `String.prototype.trim`；
5. 用 UTF-16 索引循环计 Unicode code point，不用 iterator/`Array.from`；
6. 检查长度、行数、正则与清洗后唯一性。

返回递归冻结、与输入断开引用的纯数据 content。配置文件不会被加密；README
必须提醒：拿到作品目录的人可以直接阅读 `config.js`。

## 6. 权威状态

精确形状：

```js
{
  version: 1,
  phase: "intro" | "lighting" | "ready-to-receive" | "complete",
  content,
  litIds,
  cursor,
  revision
}
```

通用不变量：

- object/array 都是精确 own-data schema、当前 realm 原型、dense 且递归冻结；
- `content` 满足第 5 节，但 state validator 不重新清洗或调用配置 getter；
- `cursor` 是 `0..5` 整数；
- `litIds` 精确等于 `content.candles.slice(0, cursor).map(id)`，顺序和引用独立；
- `litIds` 不得重复、跳步或含未来 ID；
- revision 是 `0..MAX_REVISION` 安全整数；
- state 可 JSON 往返；不含函数、DOM、timer、focus、notice 或展示排列缓存。

阶段不变量：

| phase | cursor | litIds | revision headroom | 允许动作 |
| --- | ---: | ---: | ---: | --- |
| intro | 0 | 0 | 至少 7 | START |
| lighting | 0..4 | 同 cursor | 至少 `6-cursor` | TRY_CANDLE |
| ready-to-receive | 5 | 5 | 至少 1 | REVEAL |
| complete | 5 | 5 | 可为 0；重开另查 8 | RESTART |

headroom 指 `MAX_REVISION - revision`。合法 intro/lighting/ready 状态必须一次性
保留从该阶段完成当前整轮所需的全部 revision；不能构造“下一步能走、后续会卡住”
的合法状态。complete 是稳定终态，因此允许零 headroom；它只有在还剩至少 8 时
才允许执行 RESTART，这 8 次包括重开本身和下一整轮的 7 次递增。

`createInitialState(config)` 先原子清洗配置，再返回 revision=0 的新冻结 intro。
内部 restart helper 接受已验证 content 与新 revision，不重新读取外部 config。

## 7. Action 快照与 reducer

只接受当前 realm 普通 object、精确 own data descriptors、无 symbol/accessor/extra
key。每层 `ownKeys/prototype/descriptors` 只快照一次；trap 抛错安全拒绝，不能
通过二次读取产生类型漂移。

合法 schema：

```text
{ type: "START" }
{ type: "TRY_CANDLE", id }
{ type: "REVEAL" }
{ type: "RESTART" }
```

未知 type、数组、null/custom prototype、getter、symbol、额外字段、错误 key 数
或不匹配 `/^[a-z][a-z0-9-]{0,23}$/` 的 id 都是 schema 非法。错 phase、格式
合法但不属于当前 content 的未知 ID、已点亮 ID 或不是当前路线答案的未来 ID，
都是 schema 合法但语义无效的 same-reference no-op。

### START

- 只接受合法 intro；
- intro 阶段不变量已经保证至少 7 次 headroom；
- 进入 lighting，cursor/litIds 不变，revision+1。

### TRY_CANDLE

- 只接受合法 lighting；
- 格式合法但不属于五个 content ID 或已点亮的 id 返回原 state；
- 只有 id 等于 `content.candles[cursor].id` 才生效；
- lighting 阶段不变量已经保证完成本轮所需 headroom；
- 原子追加 ID、cursor+1、revision+1；
- 新 cursor=5 时进入 ready-to-receive，否则仍为 lighting；
- 错误但合法的未来 ID 返回原 state 引用，不产生 notice 或 revision。

### REVEAL

- 只接受合法 ready-to-receive；
- ready 阶段不变量已经保证至少 1 次 headroom；
- 进入 complete，revision+1，其余权威数据不变。

### RESTART

- 只接受合法 complete；
- 需要 `revision <= MAX_REVISION - 8`；
- 返回同一 content 的新 intro，cursor=0、litIds=[]、revision=旧值+1；
- revision 不归零，旧状态和旧日志不能与新一轮部分拼接。

合法 state 的无效动作保持原引用。畸形 state 交给 reducer 时，任何动作都返回
一份使用 `DEFAULT_CONFIG`、revision=0 的全新 intro；不得部分修复调用方 state。

任何需要递增但 headroom 不足的动作保持原引用，不溢出、不饱和、不重用旧值。

## 8. 确定性与回放

公开 `replaySession(initialConfig, actions)`：

- actions 必须是当前 realm 原生 dense Array，无 extra/symbol/accessor/custom
  iterator；
- 每个 action 使用与 reducer 相同的单次 descriptor snapshot；
- 从 `createInitialState(initialConfig)` 开始逐项 reducer；
- 任一 action schema 非法（包括 TRY_CANDLE 的 id 格式非法）返回 `null`，不能
  静默跳过；
- 合法但错 phase、未知/已点亮/未来 candle 的 no-op 允许出现在日志；
- 相同 config/action JSON、深克隆和 JSON 往返必须得到深相等终态；
- reducer/replay 不访问时间、随机、DOM 或配置函数。

独立 golden log 必须至少包含：

```text
START
TRY_CANDLE home        # 合法错误，no-op
TRY_CANDLE rain
TRY_CANDLE noodle
TRY_CANDLE journey
TRY_CANDLE quiet
TRY_CANDLE home
REVEAL
RESTART
```

## 9. exact public view 与隐私

`getPublicView(state)` 只接受合法 state；非法返回 `null`。返回值递归冻结、断开
引用，并按阶段使用 exact keys。

### intro

```js
{
  phase,
  publicTitle,
  instructions,
  privacyText,
  progressText,
  primaryAction: {
    visible: true,
    label: "开始点亮",
    action: "START",
    disabled: false
  }
}
```

不得含任何 config 字符串、candle ID/label/cue/wish、litIds、cursor、final 字段。

### lighting

```js
{
  phase,
  publicTitle,
  instructions,
  privacyText,
  progressText,
  currentCue,
  candles: [
    { id, label, lit, disabled }
    // 精确按 DISPLAY_PERMUTATION 投影
  ],
  revealedWishes: [
    { label, wish }
    // 精确为 route 的已揭晓前缀
  ],
  primaryAction: {
    visible: false,
    label: "",
    action: null,
    disabled: true
  }
}
```

- candles 不含 routeIndex、displayIndex、target、cue、wish 或未来状态；
- 当前正确 ID 不直接公开；接收者只能从 currentCue/label 语义判断；
- 已点亮项 `lit=true/disabled=true`，其余全部 false；
- future cue/wish、final 字段、content、revision 不得出现。

### ready-to-receive

与 lighting 的公共字段一致，但不含 `currentCue`；五支全部 lit/disabled，
revealedWishes 精确 5 项，primaryAction 显示“收下这些愿望”/REVEAL 且
`disabled=false`。不得含 final 字段。

### complete

保留五支与五句公开前缀，增加精确结果：

```js
result: {
  recipientLine: `给${recipient}`,
  title: finalTitle,
  message: finalMessage,
  signature
}
primaryAction: {
  visible: true,
  label: "再看一次",
  action: "RESTART",
  disabled: revision > MAX_REVISION - 8
}
```

result 只在 complete 存在。`recipientLine/title/message/signature` 各进入一个
code-native DOM 节点，不拼 HTML。

`primaryAction.disabled` 只反映相应权威动作能否安全开始并完成：合法
intro/ready 中固定为 false；lighting 隐藏动作固定为 true；complete 仅在不足
8 次 headroom 时为 true。app 不向 disabled 动作派发。

## 10. app-local 错误反馈

错误 candle 不进入 state/public view/action log 之外的结果语义。app 处理一次
真实用户点击时：

1. 保存 dispatch 前的合法 lighting view；
2. 只从该 view 确认 clicked ID 属于未点亮公开按钮；
3. dispatch 精确 `{type:"TRY_CANDLE", id}`；
4. 若 reducer 返回同 state 引用，写 fixed wrong live；
5. 若 state 改变，按新 view 写 correct/ready live；
6. 不读取 `state.content`、未来 route 或内部 target 来解释错误。

程序化重复 render、hostile action、错 phase 调用或 disabled 按钮不产生错误
播报。连续相同错误允许重写同一句，但不得累计计数。

## 11. DOM 与阶段隐私

`main` 直接子级顺序：

```text
header.page-heading > h1
p.instructions
section.candle-stage
  h2#current-cue（lighting 才创建）
  ol.candle-list（lighting 起创建）
    li > button × 5
p.progress-status
ol.revealed-wishes（有前缀时才创建）
section.final-letter（complete 才创建）
  p.recipient-line
  h2#final-title
  p.final-message
  p.signature
button.primary-action（persistent）
p.privacy-note
p.live-region[role=status]
noscript
```

- intro 不创建 candle list、cue、wish 或 final 子树；
- lighting 起才创建五个 label；
- future cue/wish 不得藏在 template、attribute、ARIA、CSS content、Canvas 或
  离屏节点；
- ready 删除 current cue，仍不创建 final；
- complete 才创建四节点 final-letter；
- primary-action 始终是同一 DOM node；lighting 时 `hidden`，不是 disabled 空壳；
- candle button 文本同时包含 label 与“未点亮/已点亮”，不只靠火焰颜色；
- lit button 使用真实 disabled，并保留非交互可读状态。

无 JavaScript 时只显示公开 H1、固定说明、固定隐私说明和：

> 请开启 JavaScript 后再点亮这五支蜡烛。

不得静态放入任何配置内容或结果。

## 12. 焦点与输入

- 只使用原生 button click；不注册 document 级字符快捷键；
- Enter/Space 由浏览器原生激活；
- START 成功后聚焦 `#current-cue`；
- 正确点亮会禁用当前按钮，render 后聚焦更新的 `#current-cue`；
- 下一次 Tab 按固定展示顺序进入首个未点亮按钮，不能直达下一答案；
- 错误选择保持原按钮焦点；
- 第五支后聚焦 persistent “收下这些愿望”；
- REVEAL 后聚焦 `#final-title`；
- RESTART 后聚焦 persistent “开始点亮”；
- 只有前台用户动作移动焦点；load、resize、visibilitychange、pagehide、pageshow
  或 render 不补发迟到焦点；
- CSS 视觉重排不得改变 DOM/Tab 顺序。

## 13. 视觉与动效边界

首版不等待 ImageGen，也不创建生产图片。视觉方向冻结为“安静餐桌上的纸艺小
蛋糕”：

- 暖灰纸面背景、深莓蛋糕体、奶油糖霜、五支低饱和彩色蜡烛；
- 一个蛋糕是唯一大形体，不套 dashboard、bento 或五张独立卡；
- candle button 的真实命中区包住蜡烛和标签，至少 48×48 CSS px；
- 火焰由 CSS/SVG primitive 组成，装饰全部 `aria-hidden`；
- 正确时只允许一次 180–260ms 火焰淡入/轻升；
- 不使用 glow 爆炸、bokeh、confetti、烟花、金币、徽章或假统计；
- `prefers-reduced-motion: reduce` 下火焰直接静态出现；
- `forced-colors: active` 隐藏材质，保留 ButtonText/Canvas/Highlight、真实
  border/outline 与文字状态；
- 200% 文本与 400% zoom 不依赖绝对定位保持信息关系。

## 14. 响应式 Gate

| 逻辑视口 | 硬要求 |
| --- | --- |
| 1504×1046 | 标题、当前线索、完整蛋糕、五支、进度和主动作首屏可达；intro/lighting/ready/complete 零横纵滚 |
| 1280×800 | lighting 主循环同屏；complete 可纵滚但 final title 与主动作可达 |
| 768×1024 | 五支保持同一 DOM 顺序，可用 3+2 排列；按钮 ≥48px |
| 390×844 | 五支用 2+3 或单列；允许纵滚、零横溢；cue 与首个按钮同屏 |
| 320×568 | 内容宽约 288–304px；单列或 2+3；签名和动作可滚动到达 |
| 844×390 | 蛋糕/线索双栏但 DOM 不逆序；零横溢；按钮与 final action 可达 |

还必须实测：

- 最大合法 label/cue/wish/final 文本；
- 200% 浏览器文本缩放与约 320 CSS px 的 400% zoom；
- `scrollWidth <= clientWidth`；
- safe-area、横屏与系统强制色；
- 图片/字体阻断（虽然首版无运行图片）；
- reduced-motion；
- disabled button 和焦点迁移的 computed rect。

## 15. 失败与降级

`sanitizeConfig` 永远返回默认或合法 content，因此正常启动没有“半份配置”。
只有 logic global 缺失、helper throw/null 或必要 DOM 不存在时进入 app-local
preparation failure：

- 只显示公开 H1、固定说明、固定安全提示“暂时没准备好，请重新准备。”；
- persistent action 显示“重新准备”；
- 不输出 exception、路径、config、私密文本或技术码；
- 重试调用同一个 `attemptPrepare()`；
- failure 不进入 reducer、state、storage 或 action log。

CSS/SVG 装饰失败时保留五个原生按钮、线索、愿望、结果和完整操作路径。

## 16. 来源、许可证与借鉴声明

README 与 `ATTRIBUTION.md` 必须各自完整列出：

1. `ololx/birthday-cake@d51cd5c...`，GitHub 识别为 Unlicense，LICENSE 含
   公有领域奉献；作者 Alexander A. Kropotin；只参考单 HTML 与逐支点击能力；
2. `VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle@3d364f9...`，MIT，
   Copyright 2025 Vida Khoshpey；只作麦克风/庆祝方案的排除对照；
3. `elixpo/wish.elixpo@bf6ec8c...`（旧路径 `Circuit-Overtime/Birthday`），
   MIT，Copyright 2024 Ayushman Bhattacharya；只作个性化、云端和权限边界对照；
4. MDN getUserMedia、W3C Pointer Events/WCAG 页面是标准校准，不是代码、
   素材或运行依赖。

必须声明：

- 本作零第三方运行依赖；
- 未复制、修改、链接或 vendoring 候选代码；
- 未使用候选图片、SVG、音频、生日歌、Lottie、字体、截图、文案、配色或
  trade dress；
- 状态机、默认五段文案、展示排列、DOM、CSS/SVG 和测试独立实现；
- 玩法机制可借鉴，许可证不自动覆盖项目素材或品牌；
- 本地运行不等于 config 加密。

## 17. 纯逻辑测试 Gate

至少覆盖：

1. DEFAULT_CONFIG、固定文案、permutation 递归冻结与 canonical hash；
2. 配置合法清洗、NFC/code point、五项唯一、整份回退和断引用；
3. top/item/array getter、symbol、extra、sparse、subclass、custom prototype、
   iterator/map、lone surrogate、control 与 trap；
4. UMD 浏览器全局和目录 CommonJS 真实 require；
5. 初态 exact schema、冻结、JSON 往返；
6. START、五步正确路线、ready、REVEAL、RESTART；
7. 五个 route 位置分别被每个错误合法 ID 尝试，全部 same-reference no-op；
8. duplicate/lit/future/unknown 格式合法 ID 与错 phase 为 same-reference
   no-op；格式非法 ID、extra action、getter action 使 replay 返回 null；
9. 单次 descriptor snapshot 的 late-changing Proxy；
10. litIds 伪造、cursor 跳步、错误 phase/content/revision state；
11. MAX_REVISION、阶段 headroom、complete 的 disabled RESTART；所有合法
    intro/lighting/ready 都能走完整轮，不产生溢出或半途死锁；
12. 5! = 120 种合法配置路线都只能按各自 route 完成，展示排列始终是固定映射；
13. golden replay、深克隆 action、JSON action 得到深相等终态；
14. intro/lighting/ready/complete exact public view、冻结和断引用；
15. 每阶段 forbidden strings sentinel：未来 cue/wish/final 不在 JSON view；
16. display view 不含 routeIndex/target，revealedWishes 只含前缀；
17. 生产逻辑静态扫描无 DOM、timer、Date、random、network、storage、audio、
   permission 或 runtime hook；
18. index 经典脚本顺序、无 module/fetch/远程 URL、no-JS 五项公开边界；
19. README/ATTRIBUTION 固定 commit、许可证、权利主体、零复制与隐私声明。

## 18. 浏览器与玩法验收

统一 localhost 入口必须真实完成：

1. intro 不存在任何 candle/final 配置文本；
2. START 后五个按钮按 `journey/home/rain/quiet/noodle` 展示；
3. 先点 home：状态/进度不变，固定错误 live，只保留 home 焦点；
4. 按完整正确路线点亮，每步只新增一个 wish；
5. 每次正确后焦点在新 cue，不落到下一正确 candle；
6. ready 有五句、无 final，主动作可达；
7. REVEAL 后四节点 final 出现且 final title 获焦；
8. RESTART 清除全部配置 DOM 并回公开 intro；
9. 全程零 console/page error、零远程请求、零 storage/permission；
10. CSS/SVG 阻断后仍可完成；
11. reduced-motion、forced-colors、键盘-only、Pointer click；
12. 第 14 节六档视口、最大文本、200%/400% zoom 与零横溢。

受控浏览器若拒绝 `file://`，必须如实记录。A 级由经典相对脚本、静态依赖闭包、
零网络/存储/权限 Gate 与人工双击证明；不能用 localhost 浏览器证据冒充真实
file 导航。

## 19. 完成定义

只有以下全部成立才把 S17 在 `docs/40-idea-backlog.md` 标记为已实现：

1. 纯逻辑、UI、来源文档、catalog 与门户均完成；
2. 五步玩法、一次错误、最终揭晓和重开真实跑通；
3. 阶段隐私、非泄漏焦点、响应式与降级 Gate 通过；
4. README/ATTRIBUTION 完整写借鉴声明；
5. `npm test`、`npm run verify`、Chrome 验收与验证报告通过；
6. 每个发现的缺陷和修复记录进 `bugs/`；
7. 可复用知识点记录进 `learn/`；
8. 各阶段按用户要求独立提交。

规格完成不等于作品完成，也不等于长期目标完成。
