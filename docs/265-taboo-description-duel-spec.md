# “绕词对决”可执行规格

- 日期：2026-07-25
- 候选追踪 ID：`taboo-description-duel`
- 冻结生产 ID：`word-detour-duel`
- 调研：[`263-taboo-description-duel-research.md`](./263-taboo-description-duel-research.md)
- Brainstorm：[`264-taboo-description-duel-brainstorm.md`](./264-taboo-description-duel-brainstorm.md)
- 主分类：双人对抗（信任型友谊赛）
- 本地启动等级：A（真实 `file://` 直开）
- 本文状态：冻结规则、数据、隐私、DOM、验收与测试；不授权生产 UI

## 1. 产品合同

两位玩家在同一台设备上完成四个描述回合，每人轮流担任两次描述者。描述者私下
看一张目标词和四个禁用提示，猜词者背对屏幕听口头线索。描述者按：

```text
猜中  → +1
踩词  → -1
跳过  →  0
```

每回合最多六张，四回合使用同一计时选项。每个回合结束后，双方共同复核已经用过
的卡片；确认后该回合永久冻结。终局比较双方两个描述回合的净分，分数相同即平局。

本作明确是信任型友谊赛：

- 程序保证回合数、卡数上限、主题、难度、计时、计分和复核窗口对称；
- 程序不请求麦克风、不识别语音，也不能证明某人说了什么或是否故意不猜；
- 口头违规由描述者自报，并允许双方在回合后共同更正；
- 正常流程通过遮屏和 DOM 卸载减少偷看，不抵御开发者工具或恶意检查内存。

只有满足这条诚实边界，项目才可进入生产。

## 2. 文件边界

建议生产目录：

```text
experiences/versus/word-detour-duel/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── README.md
├── ATTRIBUTION.md
├── package.json
└── logic.test.js
```

| 文件 | 唯一职责 |
| --- | --- |
| `index.html` | 稳定语义容器、无脚本提示、经典脚本顺序 |
| `styles.css` | 原创视觉、响应式、焦点、对比与降动效 |
| `config.js` | 公开文案、两席称呼、三套牌组名、72 张原创卡和冻结 schedule |
| `logic.js` | 配置验证、牌组验证、纯状态机、计时计算、计分和阶段视图 |
| `app.js` | DOM 投影、事件、单调时钟注入、生命周期、焦点和 ARIA |
| `README.md` | 启动、玩法、信任/隐私、定制、测试与借鉴说明 |
| `ATTRIBUTION.md` | 商业品牌边界、官方来源、独立创作与零第三方引入 |
| `package.json` | 仅建立项目级 CommonJS 测试边界 |
| `logic.test.js` | 配置、状态机、计时、隐私、恶意输入和静态合同 |

浏览器加载顺序：

```text
config.js → logic.js → app.js
```

`package.json` 精确为 `{"type":"commonjs"}`；不得添加 dependencies、scripts、
main 或构建入口。`logic.js` 必须同时支持 CommonJS 与浏览器经典全局。生产不使用
ES module、bundle、transpile、runtime npm 包或根依赖。

## 3. 固定常量

```js
{
  VERSION: 1,
  PLAYER_COUNT: 2,
  TURN_COUNT: 4,
  TURNS_PER_PLAYER: 2,
  CARDS_PER_TURN: 6,
  VARIANT_COUNT: 3,
  CARD_COUNT: 72,
  FORBIDDEN_PER_CARD: 4,
  TIMER_OPTIONS: [30, 60, 90, null],
  DEFAULT_TIMER_SECONDS: 60,
  THEMES: ["daily", "food", "nature", "action", "place", "feeling"],
  DIFFICULTIES: [1, 2, 3],
  OUTCOMES: ["correct", "foul", "skip"],
  INTERRUPTION_REASONS: ["manual", "blur", "hidden", "pagehide"],
  MAX_TIME_MS: 90000,
  MAX_REVISION: 1000000,
  MAX_CLOCK_TOKEN: 1000000
}
```

额外恒等式：

```text
PLAYER_COUNT × TURNS_PER_PLAYER = TURN_COUNT
TURN_COUNT × CARDS_PER_TURN = 24 cards per variant
VARIANT_COUNT × TURN_COUNT × CARDS_PER_TURN = CARD_COUNT
THEMES.length = CARDS_PER_TURN
```

常量对象及全部数组递归冻结；config 不能覆盖规则常量。

## 4. 配置 schema

### 4.1 顶层精确字段

`window.WORD_DETOUR_CONFIG` 必须是只有以下 own enumerable data properties 的
普通对象：

```text
publicTitle
publicInstructions
trustNotice
playerLabels
deckLabels
cards
schedules
```

任何缺失、多余字段、accessor、读取异常、非普通原型或子项非法，整份配置原子
回退到冻结 `DEFAULT_CONFIG`。不允许“默认卡片 + 自定义 schedule”或“自定义卡片 +
默认称呼”的混合。

### 4.2 公开文本

建议默认：

```js
{
  publicTitle: "绕词对决",
  publicInstructions: "绕开四个禁用提示，让对方猜到目标词。每人描述两回合。",
  trustNotice: "这是信任型友谊赛：页面不会录音或自动判罚，请主动记录踩词并在回合后一起复核。",
  playerLabels: ["玩家 1", "玩家 2"],
  deckLabels: ["纸飞机", "晚风", "星灯"]
}
```

文本清洗统一：

1. 必须是 string primitive；
2. 必须是 well-formed Unicode，不含孤立 surrogate；
3. `normalize("NFC")`；
4. 连续普通/Unicode 空白折叠为一个 U+0020；
5. 去掉首尾空白；
6. 拒绝 C0/C1 control、U+2028/U+2029 和双向控制字符
   U+061C、U+200E、U+200F、U+202A–U+202E、U+2066–U+2069；
7. 长度按 Unicode code point 计，不按 UTF-16 code unit。

| 字段 | 最短 | 最长 code point | 额外规则 |
| --- | ---: | ---: | --- |
| `publicTitle` | 1 | 30 | 不得包含 `taboo`，大小写不敏感 |
| `publicInstructions` | 1 | 140 | 不得出现商业产品名 |
| `trustNotice` | 1 | 180 | 必须包含“不录音”或等价明确否定 |
| `playerLabels[0/1]` | 1 | 12 | 规范化后互不相同 |
| `deckLabels[0..2]` | 1 | 12 | 规范化后两两不同，不暗示难度 |

`playerLabels` 是 dense 原生 Array、长度 2；`deckLabels` 长度 3。拒绝数组子类、
稀疏项、额外 enumerable key、accessor、非普通原型或 boxed String。

### 4.3 卡片精确字段

每张卡必须是只有以下字段的普通对象：

```text
id
theme
difficulty
target
forbidden
```

精确 schema：

```js
{
  id: "daily-01",
  theme: "daily",
  difficulty: 1,
  target: "目标词",
  forbidden: ["提示一", "提示二", "提示三", "提示四"]
}
```

限制：

- `id` 匹配 `/^[a-z][a-z0-9-]{2,31}$/`，全库唯一；
- `theme` 必须是 `THEMES` 之一；
- `difficulty` 必须是 number primitive、安全整数且为 `1 / 2 / 3`；
- `target` 为 2–8 code point，不含任何空白；
- `forbidden` 是 dense 原生 Array，长度精确 4；
- 每个 forbidden 为 1–8 code point，不含任何空白；
- target 与同卡四个 forbidden 规范化后不得相同；
- target 与同卡 forbidden 规范化后不得互为完整子串，避免“钥匙/钥匙圈”这类
  实际没有增加独立限制的提示；
- 同卡四个 forbidden 规范化后两两不同；
- 全库 target 规范化后唯一；
- 任一 target 不得与全库任一 forbidden 规范化后完全相同，避免直接泄露未来答案；
- 不接受 getter、setter、Symbol key、额外 enumerable key、Proxy trap 或自定义原型。

`normalizeLexeme()`：

1. 执行公开文本的 Unicode、控制字符和 NFC 检查；
2. 拒绝任何空白；
3. 使用内建 `toLowerCase()` 生成比较键；
4. 不做中文分词、拼音、同音、词干、繁简或 locale 猜测；
5. 只用于配置唯一性，不用于自动判罚口头内容。

### 4.4 题库分布

72 张卡必须精确满足：

```text
每个 theme: 12 张
每个 difficulty: 24 张
每个 theme × difficulty: 4 张
```

所有卡均为仓库原创。禁止把商业示例、第三方词库、影视/游戏角色、商标、歌词、
台词、名人、时事或默认私人信息写入默认配置。

内容人工审计表必须在实施阶段逐卡覆盖：

- 原创来源；
- 目标/禁词重复；
- 商标和作品名；
- 成人、羞辱、创伤、疾病、身份刻板印象；
- 难度与主题；
- 是否依赖特定地域、年龄或关系身份；
- 是否需要随时间更新。

### 4.5 Schedule

`schedules` 是 dense 原生 Array，长度 3。每个 variant 是长度 4 的 hand 数组，
每个 hand 是长度 6 的 card ID 数组：

```js
schedules[variantIndex][turnIndex][cardIndex]
```

验证必须证明：

1. 每个 ID 存在于 cards；
2. 三套 schedule 合计 72 个位置；
3. 每个 card ID 在三套 schedule 中恰好出现一次；
4. 单个 variant 内没有重复；
5. 每个 hand 六个 theme 恰好各出现一次；
6. 每个 hand 的 difficulty 计数精确为 `{1:2, 2:2, 3:2}`；
7. 每个 hand 的 24 个 forbidden 规范化后两两不同；
8. 玩家 1 使用 turn 0/2，玩家 2 使用 turn 1/3；
9. 两位玩家每人合计 12 张、每档难度各 4 张、每个主题各 2 张。

Schedule 顺序属于规则数据，不在运行时洗牌。玩家只看到 `deckLabels`，不能在 setup
看到 card ID、target、forbidden、theme 或 difficulty。

### 4.6 原子回退与断引用

`sanitizeConfig(candidate)`：

- 全份合法时，返回新的递归冻结、与输入断开引用的配置；
- 任一项非法时，返回同一个递归冻结 `DEFAULT_CONFIG` 引用；
- 捕获属性读取、descriptor、迭代和 Proxy 抛错，不能向页面传播；
- 验证不调用候选对象的 `toString/valueOf/iterator`；
- 不从 Symbol、继承属性或 getter 读取数据。

`DEFAULT_CONFIG` 自身必须通过相同公开 `validateCorpus()` 与 `validateSchedules()`。

## 5. 公开逻辑 API

`logic.js` 同时暴露：

```text
window.WordDetourLogic
module.exports
```

exact API 顺序：

```text
CONSTANTS
DEFAULT_CONFIG
ACTIONS
normalizeLexeme
validateCorpus
validateSchedules
sanitizeConfig
scoreTurn
deriveMatchResult
createInitialState
reduce
getView
```

`ACTIONS` 精确为：

```js
{
  ENTER_SETUP: "ENTER_SETUP",
  SET_VARIANT: "SET_VARIANT",
  SET_TIMER: "SET_TIMER",
  START_MATCH: "START_MATCH",
  REVEAL_CARD: "REVEAL_CARD",
  START_CLOCK: "START_CLOCK",
  RECORD_OUTCOME: "RECORD_OUTCOME",
  TICK: "TICK",
  INTERRUPT: "INTERRUPT",
  PREPARE_RESUME: "PREPARE_RESUME",
  SHOW_REVIEW: "SHOW_REVIEW",
  RECLASSIFY_CARD: "RECLASSIFY_CARD",
  CONFIRM_TURN: "CONFIRM_TURN",
  RESTART: "RESTART"
}
```

API、常量、配置、state、view 和全部嵌套返回对象递归冻结。规则层不读取 DOM、
时间、随机、Storage、网络、权限、navigator、location 或设备信息；`nowMs` 由
app 作为 action 数据注入。

## 6. 状态 schema

顶层 state 精确字段：

```text
version
phase
config
settings
turnIndex
activeCardIndex
draftTurn
confirmedTurns
clock
interruptionReason
result
revision
```

### 6.1 固定 phase

```text
intro
setup
handoff
card-ready
describing
interrupted
turn-ended
turn-review
match-result
```

### 6.2 settings

```js
{
  variantIndex: 0,
  timerSeconds: 60
}
```

- 只在 `setup` 可修改；
- `variantIndex` 为 `0..2` 安全整数；
- `timerSeconds` 精确为 `30 / 60 / 90 / null`；
- `START_MATCH` 后冻结到整局结束；
- 不接受字符串数字、NaN、Infinity、BigInt 或 coercion。

### 6.3 draftTurn

`handoff` 前创建：

```js
{
  turnIndex,
  describerSeat,
  guesserSeat,
  cardIds,
  results,
  finishReason
}
```

- `describerSeat = turnIndex % 2`；
- `guesserSeat = 1 - describerSeat`；
- `cardIds` 是当前 schedule hand 的六个 ID；
- `results` 初始 `[]`，每项为 `{ cardId, outcome }`；
- `finishReason` 初始 `null`，终止后为 `cards-complete / time-expired`；
- state 内可以保存秘密 cardIds，但 view 只能按 phase 投影。

每个 result 的 cardId 必须等于本 hand 下一个尚未处理的 ID，不能跳号、重复或由
action 指定。`RECORD_OUTCOME` action 只提交 outcome，永远不能从 UI 传 cardId。

### 6.4 confirmedTurns

确认项：

```js
{
  turnIndex,
  describerSeat,
  results,
  correctCount,
  foulCount,
  skipCount,
  score,
  finishReason
}
```

`results` 只保存 `{cardId, outcome}`。所有计数和 score 必须由 results 重新派生并
与保存值一致；实现可选择只存 results、在 view 时派生。为避免双源，本规格冻结为：
**state 只存 turnIndex/describerSeat/results/finishReason，计数和 score 永远派生。**

### 6.5 clock

```js
{
  token,
  running,
  remainingMs,
  deadlineMs
}
```

不计时：

```js
{ token, running: false, remainingMs: null, deadlineMs: null }
```

计时但尚未开始/已暂停：

```js
{ token, running: false, remainingMs: 30000|60000|90000, deadlineMs: null }
```

进行中：

```js
{ token, running: true, remainingMs, deadlineMs }
```

要求：

- `token` 为 `0..MAX_CLOCK_TOKEN` 安全整数；
- `remainingMs` 为 `0..MAX_TIME_MS` 安全整数或 null；
- `deadlineMs` 为非负有限 number 或 null；
- state 中 remainingMs 是最近一次 action 的冻结快照；
- view 秒数为 `ceil(remainingMs / 1000)`；
- CSS 动画、interval 次数和 Date 字符串不得进入规则。

### 6.6 result

只在 `match-result` 非 null：

```js
{
  kind: "seat-win" | "tie",
  winnerSeat: 0 | 1 | null,
  playerScores: [integer, integer]
}
```

允许负分。只比较双方净分，不使用 correct、foul、skip、剩余时间或先后手做
tiebreaker。

## 7. 初始化与阶段转换

### 7.1 `createInitialState`

签名：

```text
createInitialState(candidateConfig)
```

返回：

```text
phase = intro
settings = {variantIndex:0, timerSeconds:60}
turnIndex = 0
activeCardIndex = 0
draftTurn = null
confirmedTurns = []
clock = {token:0, running:false, remainingMs:null, deadlineMs:null}
interruptionReason = null
result = null
revision = 0
```

候选配置先原子 sanitize。初始化不读取时间、随机或浏览器环境。

### 7.2 `ENTER_SETUP`

仅 `intro → setup`。创建设置草稿，不创建 schedule、draftTurn 或秘密 view。

### 7.3 `SET_VARIANT / SET_TIMER`

仅 `setup` 接受合法精确值。相同值是同一 state 引用 no-op；非法 action 或值也是
同一引用 no-op。

### 7.4 `START_MATCH`

仅 `setup → handoff`：

- 从冻结 settings 选择 schedule；
- `turnIndex = 0`；
- 建立第一份 draftTurn；
- `activeCardIndex = 0`；
- timed 时 remainingMs 为选定秒数 × 1000；untimed 为 null；
- clock token +1，running false；
- view 只显示当前描述者、猜词者和遮屏提示。

如果 token/revision 将溢出，action no-op。

### 7.5 `REVEAL_CARD`

仅 `handoff → card-ready`：

- 不启动 timer；
- view 首次投影当前 card 的 target/forbidden；
- card-ready 可让描述者读卡，但猜词者应已背对屏幕；
- 不投影后续 cardIds、theme、difficulty 或整份 corpus。

### 7.6 `START_CLOCK`

仅 `card-ready → describing`：

- untimed：clock 保持非运行、null；
- timed：action 必须带合法 `nowMs`；`deadlineMs = nowMs + remainingMs`；
- `nowMs` 为非负有限 number，deadline 必须保持有限且不超过安全数值边界；
- token +1；
- view 保留当前秘密卡并开始显示权威剩余秒数。

在首次开始和中断恢复后使用同一 action。不能通过多次点击重复建立 deadline。

## 8. 计时与竞态

### 8.1 同步函数

内部 `syncClock(state, nowMs, token)` 只在 `describing` 调用：

- untimed 返回当前 state；
- token 必须等于 state.clock.token；
- nowMs 必须为非负有限 number；
- 如果 `nowMs < deadlineMs`：
  `remainingMs = max(0, ceil(deadlineMs - nowMs))`，phase 不变；
- 如果 `nowMs >= deadlineMs`：结束回合，`finishReason = time-expired`，
  卸载秘密 view，phase 进入 `turn-ended`，remainingMs = 0；
- 旧 token、倒退到上次 action 之前的 nowMs、非法数值均为 no-op。

为检测时钟倒退，clock 追加内部精确字段会破坏 schema，因此冻结为：
`deadlineMs - remainingMs` 即本段开始 now；合法 now 必须不小于该值。暂停/恢复会
重新建立本段起点。

### 8.2 `TICK`

仅 `describing` 接受 `{type, nowMs, token}`。每次只同步一次：

- 秒数未变化也允许 revision +1 会制造噪声，因此冻结为：若派生 remainingMs 与
  当前相同，返回同一 state；
- 秒数或毫秒快照变化时，更新 state 并 revision +1；
- 到时只生成一个 `turn-ended`；
- 之后到达的旧 TICK no-op。

app 可以约每 200ms 派发 TICK，但精确频率不是合同。

### 8.3 `RECORD_OUTCOME`

仅 `describing` 接受：

```js
{ type: "RECORD_OUTCOME", outcome, nowMs, token }
```

顺序固定：

1. timed 模式先执行 `syncClock`；
2. 若同步后已 `turn-ended`，不记录 outcome；
3. untimed 模式忽略 nowMs/token，但它们若存在必须是普通 data properties；
4. outcome 必须是 exact `correct / foul / skip`；
5. 追加当前 cardId 和 outcome；
6. activeCardIndex +1；
7. 如果达到 6，结束回合，finishReason = `cards-complete`；
8. 否则仍为 `describing`，view 投影下一张秘密卡；
9. 整个 action revision 只 +1。

边界固定：

```text
nowMs < deadlineMs  → outcome 有效
nowMs >= deadlineMs → 到时优先，outcome 无效
```

同一 action 不能既记第六张又产生第二次到时结果。

## 9. 中断

### 9.1 `INTERRUPT`

仅 `card-ready / describing` 接受：

```js
{ type: "INTERRUPT", reason, nowMs?, token? }
```

- reason 必须是固定四项之一；
- describing + timed 先同步时钟；
- 若已到时，直接 `turn-ended`，不进入 interrupted；
- 否则 phase = `interrupted`，clock running false、deadline null；
- timed 保留同步后的 remainingMs；
- untimed 仍为 null；
- interruptionReason 保存 reason；
- view 立即移除 target、forbidden、cardId、结果动作和剩余卡信息；
- 重复 blur/hidden/pagehide 是 no-op。

`card-ready` 中断时尚未计时，remainingMs 不变。

### 9.2 `PREPARE_RESUME`

仅 `interrupted → card-ready`：

- interruptionReason 清空；
- view 再次投影同一张当前卡；
- timer 仍未运行；
- 描述者按 `START_CLOCK` 后才恢复；
- 不改变 results、activeCardIndex 或剩余时间。

页面重新 visible 不自动派发 PREPARE_RESUME；必须由当前描述者主动确认。

## 10. 回合结束与复核

### 10.1 `turn-ended`

这是秘密态与公共态之间的第二道遮屏：

- 不含当前卡、已用卡、目标、禁词或结果详情；
- 只显示“本回合已结束，请把设备放回中间”；
- 双方确认都能看屏幕后派发 `SHOW_REVIEW`；
- clock 不运行，deadline null；
- action 不再接受结果或计时事件。

### 10.2 `SHOW_REVIEW`

仅 `turn-ended → turn-review`。view 只公开本回合实际出现的卡，按原顺序包含：

```text
cardId（只作 DOM key，不显示给用户）
target
forbidden[4]
outcome
points
```

未来未出现的卡、本 variant 后续 hand、其他 variant 和 difficulty 不进入 view。

### 10.3 `RECLASSIFY_CARD`

仅 `turn-review` 接受：

```js
{ type: "RECLASSIFY_CARD", cardId, outcome }
```

- cardId 必须是当前 draftTurn.results 中的 exact ID；
- outcome 必须合法；
- 相同 outcome 同引用 no-op；
- 更新该 result 后，从整个 results 重新调用 `scoreTurn()`；
- 不接受 index，避免 DOM 排序变化改错卡；
- 不能增删 result、改变顺序、改未来卡或旧 confirmedTurn；
- view 明示“只在两人一致时更正”。

### 10.4 `CONFIRM_TURN`

仅 `turn-review`：

1. 把断引用、冻结的 `{turnIndex, describerSeat, results, finishReason}` 追加到
   confirmedTurns；
2. 如果是 turn 0–2：turnIndex +1，创建下一 hand 的 draftTurn，activeCardIndex 0，
   重置 clock，进入 `handoff`；
3. 如果是 turn 3：清空 draftTurn，调用 `deriveMatchResult()`，进入
   `match-result`；
4. review action、旧 timer 与旧 secret 引用全部失效；
5. revision +1。

不能跳过复核直接开始下一回合。

## 11. 计分与终局

### 11.1 `scoreTurn(results)`

输入必须是 dense 原生 Array，每项是 exact `{cardId,outcome}` 普通 data object，
长度 `0..6`，cardId 唯一。合法返回：

```js
{
  correctCount,
  foulCount,
  skipCount,
  score: correctCount - foulCount
}
```

非法输入返回 `null`，不抛异常、不 coercion。

### 11.2 `deriveMatchResult(confirmedTurns)`

必须精确四项，turnIndex 为 `0,1,2,3`，describerSeat 为 `0,1,0,1`，每项通过
scoreTurn；非法返回 null。

```text
seat0 = score(turn0) + score(turn2)
seat1 = score(turn1) + score(turn3)
```

- seat0 > seat1：`seat-win`, winnerSeat 0；
- seat1 > seat0：`seat-win`, winnerSeat 1；
- 相等：`tie`, winnerSeat null。

不看 finishReason、剩余时间、总答题数、正确数或先后手。

### 11.3 `RESTART`

仅 `match-result` 接受。返回 `createInitialState(state.config)` 深相等的新状态：

- 回到 intro；
- settings 回默认 variant 0 / 60 秒；
- 清空 schedule 选择、turn、card、history、clock、interruption、result；
- revision 回 0；
- 不保存上局赢家、分数、牌组、题目或玩家操作。

setup 可用普通“返回说明”导航而非 reducer restart；活动局不提供无确认的重开。

## 12. Action 安全与 no-op

每个 action：

- 必须是普通对象；
- `type` 是 own enumerable data property；
- 只允许该 action 的精确字段，不接受额外 key 或 Symbol key；
- 拒绝 getter/setter、继承字段、Proxy 抛错、自定义原型；
- 字符串/数字不 coercion；
- phase、token、revision、domain 任一不匹配，返回原 state 同一引用；
- reducer 不修改 action、state、config 或调用方数组；
- 未知 action 和 `null/undefined/primitive` no-op；
- revision 每个成功外部 action最多 +1，溢出时整个 action no-op。

reduce 遇到损坏或非本 API 创建的 state 必须返回原输入或安全初态；首版冻结为：
**如果 state 不是由内部 WeakSet 登记的冻结状态，返回同一个 state，不尝试修复。**
这避免读取恶意伪 state。重新开始只从合法 `match-result` 进入。

## 13. 阶段视图与秘密字段

`getView(state)` 对每个合法 state 返回冻结、断引用 DTO。通用字段：

```text
phase
publicTitle
publicInstructions
trustNotice
playerLabels
turnIndex
describerSeat
guesserSeat
progress
scoreboard
primaryAction
statusText
```

字段可按 phase 为 null，但对象 key 集合固定，便于 app 只做投影。额外 phaseData
是 exact discriminated union：

| phase | phaseData 可含 | 必须排除 |
| --- | --- | --- |
| `intro` | 无 | settings、schedule、卡片、分数 |
| `setup` | deckLabels、timer options、当前选择 | card IDs、target、forbidden、difficulty |
| `handoff` | 当前角色、遮屏提示 | 当前/未来卡、历史答案 |
| `card-ready` | 当前单卡 target、forbidden、序号 | 后续 card IDs、theme、difficulty |
| `describing` | 当前单卡、三动作、剩余秒数 | 后续卡、其他 hand |
| `interrupted` | 中断原因、恢复提示 | 任意 target、forbidden、cardId |
| `turn-ended` | 中性交接提示 | 任意已用/未来卡详情 |
| `turn-review` | 当前已用卡与 draft score | 未出现卡、旧 turn 全卡、未来 hand |
| `match-result` | 双方四回合统计与终局 | 完整题库、schedule、未使用卡 |

隐私测试使用每张卡都不同的 marker：

- handoff/interrupted/turn-ended 的序列化 view 不包含任一 marker；
- card-ready/describing 只包含当前卡 marker；
- turn-review 只包含本回合 results 对应 marker；
- match-result 不包含任何 target/forbidden marker，只含统计；
- config、schedules、cardIds、deadlineMs、clock token、revision、action log、Storage
  key 不进入 view；
- view 不暴露函数、getter、内部 state 引用或可变数组。

## 14. DOM 合同

### 14.1 永久骨架

`index.html` 只提供：

```text
a#back-link
main#experience
  header#experience-header
  section#stage[aria-labelledby="stage-title"]
p#global-status[role=status][aria-live=polite]
noscript
```

动态内容全部通过 DOM API 创建，字符串只写 `textContent`。禁止 `innerHTML`、
`insertAdjacentHTML`、`document.write`、模板字符串 HTML 和不可信 CSS selector。

### 14.2 节点存在性

| 节点 | 允许 phase |
| --- | --- |
| `#setup-form` | setup |
| `#handoff-panel` | handoff |
| `#secret-card` | card-ready / describing |
| `#target-word` | card-ready / describing |
| `#forbidden-list` | card-ready / describing |
| `#outcome-controls` | describing |
| `#timer-text` | describing + timed |
| `#interrupted-panel` | interrupted |
| `#turn-ended-panel` | turn-ended |
| `#review-list` | turn-review |
| `#match-result` | match-result |

`#secret-card` 离开允许 phase 后必须从 DOM 移除，不是加 hidden/class/opacity。属性、
`aria-label`、title、data-*、CSS custom property 和 comment 都不能残留秘密。

### 14.3 控件

- 设置：原生 fieldset/radio 或 select；
- 主要动作：原生 button；
- 猜中、踩词、跳过是三个文字完整的 button；
- 复核 outcome 使用原生 select 或三项 radio，label 包含目标词；
- 不使用全局单字符快捷键；
- disabled 必须使用原生 disabled，并有附近原因文字；
- 触控目标最小 48×48 CSS px；
- pointer click 与键盘 Enter/Space 派发同一个 action；
- app 不在按下时提前改分，只在 reducer 返回新 state 后重绘。

### 14.4 焦点

- phase 改变后焦点移到该阶段 `h1/h2`（临时 `tabindex=-1`）或唯一主动作；
- 显示秘密卡后焦点移到 `#target-word`，但 `aria-live=off`，避免自动扬声朗读；
- describing 后焦点默认在“猜中”，Tab 可达另两项；
- interrupted/turn-ended 焦点移到中性标题，秘密节点先卸载再 focus；
- turn-review 焦点移到复核标题；
- match-result 焦点移到结果标题；
- `:focus-visible` 保持高对比，不通过 `outline:none` 移除而无替代。

### 14.5 ARIA

- `#global-status` 只播报公开状态、计分改变和中断，不播报 target/forbidden；
- timer 不每 200ms 播报；只在 30、10、5、0 秒或阶段变化时用独立克制状态文本；
- 禁用提示使用真实 `<ul><li>`；
- 计分表使用语义 table 或带标题的 definition list；
- 不能通过颜色单独区分 correct/foul/skip；
- 秘密卡对屏幕阅读器仍可聚焦读取，README 提醒共享扬声器泄密并建议耳机；
- 不用 `aria-hidden=true` 包住可聚焦控件。

## 15. App 时钟与生命周期

app 使用同一单调时钟函数：

```js
const now = () => performance.now();
```

若 `performance.now` 不可用，回退 `Date.now`，但整局固定一种来源，不能中途切换。
规则只接收非负有限 nowMs。

调度：

- describing + timed 时启动单个 interval 或 rAF 驱动器；
- 每次派发 TICK 时携带当前 clock token；
- phase/token 改变立即取消旧驱动；
- cleanup 后旧 callback 即使到达也被 reducer token 拒绝；
- untimed 不启动 timer 驱动；
- `visibilitychange hidden`、window blur、pagehide 派发对应 INTERRUPT；
- 多个生命周期事件连续到达只产生一次 interrupted；
- visible/focus 不自动恢复；
- unload 不发送网络、不保存进度。

页面不监听麦克风、录音、语音识别、剪贴板、键盘内容或全局输入历史。

## 16. 响应式、颜色与降动效

关键视口：

```text
320×568
390×844
768×1024
1440×900
```

合同：

- 320px 下无页面横向滚动；
- 秘密卡、四项列表和三按钮按单列重排；
- 768px 以上可把卡面与公开记分并列，但猜词者可能看到的 scoreboard 不含题目；
- 200% zoom 仍能到达全部控件；
- 不锁定 orientation、viewport maximum-scale 或 user-scalable；
- 文本/背景、控件边界和 focus 达到合理对比；
- 状态同时有文字和图形，不只用红/绿。

动效：

- 正常模式只允许 `<=180ms` 的 opacity、border-color 或小幅非空间位移；
- 不做翻卡 3D、持续倒计时脉冲、全屏震动、蜂鸣动画、粒子或自动滚动；
- `prefers-reduced-motion: reduce` 下 animation/transition 为 `0ms`；
- 规则不等待 `transitionend/animationend/requestAnimationFrame`；
- 不闪烁，不自动播放声音。

## 17. A 级静态合同

运行时必须为零：

- 网络：fetch/XHR/WebSocket/EventSource/sendBeacon；
- 权限：麦克风、摄像头、定位、通知、剪贴板读写；
- 存储：localStorage/sessionStorage/IndexedDB/Cache/Cookie；
- 服务：server、Service Worker、Worker、WebTransport；
- 远程资源：CDN、远程字体、图片、音频、视频、iframe；
- 构建：module、dynamic import、bundle、WASM；
- 不确定外部状态：随机、时区、日期、语言包、在线题库。

允许：

- 经典脚本；
- 原生 DOM/CSS；
- `performance.now` 的单调时间；
- 本地配置与原创文本；
- Node 内建测试工具仅用于开发。

真实验收分三层：

1. 静态依赖/path/禁止 API 合同；
2. Finder 真实双击 `index.html` 完整游玩和重开；
3. localhost Chrome 自动化完成玩法、响应式、键盘、控制台与 network 观察。

localhost 不能替代 file:// 直开证据。

## 18. 借鉴与许可证

本项目不引入第三方开源代码、题库、字体、图片、音频或运行依赖，因此没有需要固定
commit/tag 的开源依赖。

`ATTRIBUTION.md` 必须包含：

- Hasbro 官方产品页和 Virtual Rules PDF URL；
- `Taboo` 商业品牌/商标事实只用于边界审计；
- 美国版权局 Games 与 Circular 33 URL；
- 实际只研究“目标词 + 禁用提示 + 口头描述 + 猜词”的抽象机制；
- 明确没有复制或改写品牌、规则文字、示例、词卡、卡面、蜂鸣器、视觉、音效、
  包装、源码或素材；
- 名称、两人回合、复核、状态机、代码、中文文案和 72 张卡均为独立创作；
- 若实施期间查看任何开源实现，必须先补固定 commit、许可证、版权主体、借鉴点和
  未复制范围；未补前不得合入。

生产可见标题和 metadata 不出现 `Taboo`。README 的借鉴章节可以为法律边界提及
来源，但不能把自己描述成“网页版/双人版 Taboo”。

## 19. 项目级测试矩阵

### 19.1 配置

- 顶层字段、descriptor、prototype、Symbol、Proxy、getter、原子回退；
- Unicode、控制字符、双向字符、长度与品牌词；
- 两席/三牌组标签长度、唯一性、dense array；
- 72 卡、ID、主题、难度、target/forbidden schema；
- 6×3×4 分布；
- target 全局唯一、target 不等于任一 forbidden；
- target 与同卡 forbidden 不互为完整子串；
- schedules 三套、四 hand、六卡、全库恰用一次；
- 每 hand 六主题各一、难度 2/2/2；
- 每 hand 的 24 个 forbidden 无 exact 重复；
- 每位玩家每 variant 主题和难度累计相同；
- DEFAULT_CONFIG 自身通过公开验证并递归冻结。

### 19.2 状态机 happy path

- intro → setup → handoff；
- 玩家 1 完成六卡 → 复核 → 玩家 2；
- 四回合描述顺序 0/1/0/1；
- correct/foul/skip 计分；
- 复核修改后 score 重新派生；
- 第四回合确认后 seat0 win、seat1 win、tie；
- 负分合法；
- restart 深等于首次初态。

### 19.3 计时

- 30/60/90/null；
- deadline 之前有效、等于/之后到时优先；
- 第六卡与到时不会双结算；
- TICK 重复、秒数不变 no-op；
- token 过期 no-op；
- 非有限、负数、倒退时钟 no-op；
- 手动/blur/hidden/pagehide 中断保留精确剩余；
- 到时中断直接 turn-ended；
- 恢复不自动跑钟，START_CLOCK 建新 deadline；
- untimed 不创建 deadline。

### 19.4 隐私投影

- intro/setup/handoff 无任一卡 marker；
- card-ready/describing 只有当前一张；
- interrupted/turn-ended 秘密 marker 为零；
- review 只有已出现卡；
- result 只有统计，不含题库 marker；
- future hand、variant、schedule、difficulty 不泄露；
- view 冻结、断引用、无函数/accessor；
- action、错误、序列化和 console 路径不含秘密。

### 19.5 敌对输入

- 未知/错 phase/多余 key/action accessor/Proxy no-op；
- cardId 不能由 live action 注入；
- 当前 card 不能跳过 schedule 顺序；
- review 不能修改未出现卡、旧回合或未来回合；
- CONFIRM_TURN 不能重复追加；
- revision/token 边界不溢出；
- state/action/input 不被 mutate；
- 返回对象递归冻结；
- 伪 state 不被信任或读取。

### 19.6 静态与 DOM

- 经典相对脚本顺序；
- 无 module、网络、Storage、权限、第三方运行依赖；
- 无 `innerHTML` 与危险 HTML 注入；
- production title/meta/config 不含商业品牌；
- secret 节点阶段存在性；
- 320/390/768/1440 视口；
- Tab/Enter/Space 路径；
- 可见焦点、48px target、200% zoom；
- reduced-motion；
- lifecycle 中断；
- 无控制台 error、unhandled rejection、外部请求。

## 20. 浏览器验收脚本

至少完成：

1. 从统一门户打开，再直接双击入口验证 file://；
2. 首屏确认原创名称、信任说明和零麦克风提示；
3. setup 选择 30 秒与一个非默认牌组；
4. 交接页确认没有秘密；
5. reveal 后确认只出现一张目标和四个禁用提示；
6. 用键盘依次记录猜中、踩词、跳过；
7. 手动暂停，确认秘密节点被卸载；
8. 恢复并继续，触发到时；
9. turn-ended 确认中性遮屏；
10. review 更正一张 outcome 后确认分数重算；
11. 完成另外三回合，覆盖六卡提前结束和不计时新局；
12. 终局覆盖胜、负或平局之一，并用逻辑测试补齐另两种；
13. restart 确认秘密、分数、牌组与历史清空；
14. 320×568、390×844、768×1024、1440×900；
15. 键盘全路径、触屏按钮、200% zoom、reduced-motion；
16. hidden/blur 后不自动显示秘密、不自动继续；
17. Console 无未解释错误，Network 无运行时请求。

浏览器自动化不录制或注入真实语音；口头互动由两人手工验收，自动化只验证按钮和
状态合同。

## 21. 完成定义

项目只有同时满足以下条件才可标记 installed：

- 生产 ID/标题完全中性，不使用商业游戏名做产品标识；
- 72 张卡完成原创与敏感内容人工审计；
- 四回合、两人各两次、每回合六卡和牌组分层全部通过；
- 口头玩法真实可完成，信任边界在首屏和 README 可见；
- 秘密阶段投影、中断遮屏和复核冻结通过；
- 30/60/90/不计时及最后一刻竞态通过；
- 鼠标、触屏、键盘、焦点、响应式、降动效通过；
- A 级真实 file://、localhost 浏览器、零网络/权限/存储通过；
- README、ATTRIBUTION、catalog、门户、分类索引和文档一致；
- 项目测试、全仓测试、repository verify 全部通过；
- 实际 bug/learn 已按事实记录；
- 项目阶段和总控集成均有可追踪独立 commit。

当前只完成规格，不创建入口，不计入 installed。
