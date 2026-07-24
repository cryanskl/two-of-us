# “这一朵，我先养开”可执行规格

- 日期：2026-07-24
- 稳定工作 ID：`garden-resource-duel`
- 调研：[`240-garden-resource-duel-research.md`](./240-garden-resource-duel-research.md)
- Brainstorm：[`241-garden-resource-duel-brainstorm.md`](./241-garden-resource-duel-brainstorm.md)
- 目标等级：A（直接双击 `index.html`）

## 1. 完成定义

以下条件同时满足才算首版完成：

1. 两名玩家在同一设备完成最多六轮秘密出牌、共同揭晓和确定性胜负；
2. 每人始终只有 2 阳光、2 雨露、2 虫害，揭晓后消耗，不能重复使用；
3. 公共季节牌堆始终恰有 3 阳光需求、3 雨露需求，当前轮公开、未来隐藏；
4. 花瓣值固定为 `1,1,2,2,3,3`，5 花瓣开花；
5. 两份选择从同一轮开始状态联合结算，无玩家遍历顺序优势；
6. 确认后到揭晓前，秘密不进入公开 DTO、DOM、attribute、ARIA、storage 或 URL；
7. blur、页面隐藏、`pagehide` 和 Escape 能遮住当前选择并清空未确认 UI 草稿；
8. 键盘、触控、减少动态、强制颜色和窄屏路径可用；
9. 无网络、无服务、无第三方运行时、无第三方素材，直接双击可玩；
10. 生产目录含固定来源、许可证和零复制边界的 `ATTRIBUTION.md`；
11. 作品合同、catalog、README、bugs、learn 和 verification 完整；
12. 逻辑测试复现 162,000 个固定序列夹具，并通过全仓测试与 Chrome 验收。

## 2. 目录与文件

```text
experiences/versus/garden-resource-duel/
├── ATTRIBUTION.md
├── README.md
├── config.js
├── index.html
├── logic.js
├── logic.test.js
├── app.js
└── styles.css
```

首版不增加 assets、音频、字体、图片、package、module、service worker、storage、
网络请求或专用启动器。

脚本以经典脚本顺序加载：

```html
<script src="./config.js"></script>
<script src="./logic.js"></script>
<script src="./app.js"></script>
```

三者都必须在 `file://` 下工作；`logic.js` 同时支持 CommonJS 测试导入。

## 3. 常量

生产逻辑固定导出：

```text
VERSION = 1
PLAYER_COUNT = 2
ROUND_COUNT = 6
BLOOM_TARGET = 5
CARD_TYPES = sun / water / pest
SEASON_TYPES = sun / water
PETAL_VALUES = [1, 1, 2, 2, 3, 3]
INITIAL_HAND = { sun: 2, water: 2, pest: 2 }
PHASES =
  intro / season / handoff / choosing /
  ready-to-reveal / round-result / match-result
```

以上数组、对象和 API 返回值递归冻结。运行时不能由 DOM、CSS、配置或查询参数修改
规则常量。

## 4. 配置合同

`config.js` 暴露 `GardenResourceDuelConfig`：

```js
{
  DEFAULT_CONFIG,
  composeResultNote
}
```

`DEFAULT_CONFIG` 至少包含：

```text
title
subtitle
intro
playerNames[2]
defaultWinNote
defaultDrawNote
```

`sanitizeConfig(candidate, composeResultNote?)`：

- 只读取普通对象的自有数据属性；
- getter、setter、代理副作用、未知结构、非字符串、空白字符串和超长文本不得进入
  生产配置；
- `playerNames` 恰有两个非空名称，每项最多 16 Unicode code points；
- 普通文案最多 400 code points，结尾文案最多 240；
- 非法字段回退到 `DEFAULT_CONFIG` 对应值，不把用户字符串解释为 HTML；
- 返回值与嵌套对象递归冻结，并与输入断开引用；
- `composeResultNote` 若存在，只在终局公开状态上调用；异常时回退默认文案。

页面统一通过 `textContent` 渲染配置。默认称呼为“你”和“TA”，不在版本库放真实
姓名、纪念日或私人消息。

## 5. seed 与公共季节牌堆

### 5.1 seed

`START_MATCH` 接收一个非零 uint32 seed。UI 优先用 `crypto.getRandomValues()` 生成；
若结果为 0，替换为固定非零常量。这里不宣称密码学安全，seed 只负责可复现洗牌。

逻辑层不读时间、DOM、`Math.random()` 或全局 crypto。

### 5.2 `generateSeasonDeck(seed)`

输入必须是唯一一个非零 uint32，否则抛 `TypeError`。输出必须：

- 长度为 6；
- 恰有 3 个 `sun` 和 3 个 `water`；
- 同 seed 深相等；
- 使用本文件冻结的独立 PRNG 与 Fisher–Yates；
- 返回递归冻结的新数组；
- 不暴露或修改内部工作数组。

PRNG 的 `int(maxExclusive)` 使用拒绝采样消除简单取模偏差。具体常量在 `logic.js`
固定并由测试锁定。不同浏览器对同 seed 必须生成相同牌堆。

公开 view 只能暴露：

- 当前 `seasonDeck[roundIndex]`；
- 已揭晓历史中的过去需求；
- 当前 seed 可在结果页用于复现，但游戏中不显示未来 deck；
- 任何阶段都不能把完整未来 `seasonDeck` 送入渲染函数。

## 6. 权威状态

```js
{
  version,
  phase,
  seed,
  seasonDeck,
  roundIndex,
  firstSeat,
  activeSeat,
  hands: [
    { sun, water, pest },
    { sun, water, pest }
  ],
  sealedCards: [cardOrNull, cardOrNull],
  scores: [number, number],
  history: [
    {
      roundIndex,
      seasonNeed,
      petalValue,
      firstSeat,
      cards,
      blocked,
      earned,
      scoreBefore,
      scoreAfter
    }
  ],
  result,
  revision,
  lastNotice
}
```

约束：

- `intro` 中 seed/deck 为空，其他局内值等于初态；
- `season` 中没有 active seat 或 sealed card；
- `handoff` 中 activeSeat 指向即将接管者；
- `choosing` 中 activeSeat 指向当前唯一可操作席位；
- 第一位确认后的 `handoff` 恰有一张内部 sealed card；
- `ready-to-reveal` 恰有两张内部 sealed card，activeSeat 为空；
- `round-result` 和 `match-result` 没有 sealed card；
- hand 数量始终为 0–2 的整数，其总消耗数与历史一致；
- `scores` 与历史逐轮重放一致；
- `roundIndex` 为 0–5；
- `firstSeat = roundIndex % 2`；
- `result` 只存在于 `match-result`；
- 每个合法迁移 revision 恰加 1；
- 被规则拒绝的合法形状动作返回同一 state 引用，不增加 revision；
- 所有 state、history、result 与嵌套数组/对象递归冻结。

## 7. 动作合同

逻辑层只接受以下精确动作：

```text
START_MATCH      { type, seed }
BEGIN_ROUND      { type }
TAKE_SEAT        { type, playerIndex }
COVER            { type, playerIndex }
SEAL_CARD        { type, playerIndex, card }
REVEAL_ROUND     { type }
NEXT_ROUND       { type }
RESTART_MATCH    { type }
```

解析规则：

- 动作必须是普通对象或 null-prototype 普通记录；
- 只允许上表列出的自有、可枚举、数据属性；
- 未知键、缺键、symbol key、getter/setter、继承字段、数组、函数、代理异常、
  `NaN`、浮点、越界席位和未知 card 抛 `TypeError`；
- 形状合法但阶段不允许、席位不匹配或手牌已用完时，返回同一 state 引用；
- reducer 不修改 action 或 state；
- reducer 不读取配置、DOM、时钟、网络或 storage。

## 8. 状态迁移

### 8.1 初始与开局

```text
createInitialState()
  → phase=intro
  → seed=null
  → hands=双方各 2/2/2
  → scores=0/0
  → history=[]
  → revision=0
```

`START_MATCH(seed)` 仅在 intro 合法：

- 生成完整内部 seasonDeck；
- `roundIndex=0`、`firstSeat=0`；
- 进入 `season`；
- 不自动进入交接，不自动选择。

### 8.2 开始当前轮

`BEGIN_ROUND` 仅在 `season` 合法：

- `activeSeat=firstSeat`；
- 进入 `handoff`；
- 公共页提示把设备交给该席位。

`TAKE_SEAT(playerIndex)` 仅在 `handoff` 且席位匹配时合法：

- 进入 `choosing`；
- 不产生、恢复或预选草稿；
- UI 焦点移到该席位第一张可用手牌。

### 8.3 遮屏

`COVER(playerIndex)` 仅在 `choosing` 且席位匹配时合法：

- 回到 `handoff`；
- activeSeat 不变；
- 不改变 hand、sealedCards、scores 或 history；
- UI 层同步丢弃本地未确认草稿。

blur、`visibilitychange(hidden)`、`pagehide` 和 Escape 都调用这条动作；重复事件是
幂等的，不推进游戏。

### 8.4 封存一张牌

`SEAL_CARD(playerIndex, card)` 仅在 `choosing` 且：

- playerIndex 等于 activeSeat；
- 该席位本轮尚未封牌；
- 该牌在回合开始公开 hand 中仍至少有 1 张。

第一位确认：

- 内部写入 `sealedCards[playerIndex]`；
- **不扣公开 hand**；
- activeSeat 切到另一席位；
- 进入 `handoff`。

第二位确认：

- 内部写入第二张 sealed card；
- **仍不扣公开 hand**；
- activeSeat 置空；
- 进入 `ready-to-reveal`。

不在确认时扣 hand 是隐私硬约束。否则第二位可从公开剩余数量推断第一位牌种。

### 8.5 揭晓与联合结算

`REVEAL_ROUND` 仅在 `ready-to-reveal` 合法。实现必须先取同一份回合开始快照：

```text
beforeHands
beforeScores
seasonNeed
petalValue
cards[0..1]
```

然后调用纯函数：

```js
resolveRound({
  roundIndex,
  seasonNeed,
  petalValue,
  cards,
  scoreBefore
})
```

对每位玩家：

```text
matching = cards[player] === seasonNeed
blocked = cards[opponent] === pest
earned = matching && !blocked ? petalValue : 0
```

两人的 `matching/blocked/earned` 必须先全部派生，再一次性生成 after：

- 从双方 hand 各扣除实际使用的一张牌；
- 分数分别增加 earned；
- 写入完整公开历史；
- 清空 sealedCards；
- 判断终局。

不能在遍历玩家 0 后先判断胜负，也不能让第二次计算读取第一次写入的分数。

### 8.6 终局

揭晓后按唯一顺序判断：

1. 双方都达到 `BLOOM_TARGET`：`draw / simultaneous-bloom`；
2. 只有一方达到：该方 `win / bloom`；
3. 当前为第 6 轮：分数高者 `win / round-cap`，同分
   `draw / round-cap-tie`；
4. 其他情况：进入 `round-result`。

`result`：

```js
{
  outcome: "win" | "draw",
  winnerIndex: 0 | 1 | null,
  reason: "bloom" | "simultaneous-bloom" | "round-cap" | "round-cap-tie",
  scores: [number, number],
  completedRounds: number,
  seed: uint32
}
```

seed 只用于结果复现，不参与 tie-break。

### 8.7 下一轮与重开

`NEXT_ROUND` 仅在 `round-result` 合法：

- `roundIndex += 1`；
- `firstSeat = roundIndex % 2`；
- activeSeat 置空；
- 进入 `season`。

`RESTART_MATCH` 仅在 `match-result` 合法，返回与首次 `createInitialState()` 深相等的
新冻结对象。新 seed 只在下一次 `START_MATCH` 生成。

## 9. 公开投影

逻辑层暴露：

```text
getPublicView(state)
getPlayerView(state, viewerSeat)
```

### 9.1 所有 view

- 返回与内部 state 断开引用的递归冻结对象；
- 不包含完整 seasonDeck；
- 不包含 `sealedCards` 字段；
- 不包含内部对象、函数、config 或未公开历史；
- 历史只包含已经揭晓的回合。

### 9.2 `getPublicView`

允许字段按阶段裁剪：

| 阶段 | 可公开 |
| --- | --- |
| intro | phase、revision |
| season | 当前需求/价值/轮次、firstSeat、公开 hand、scores、history |
| handoff | 同上、activeSeat、`sealedCount` |
| choosing | phase、activeSeat、当前需求/价值；不返回任一牌种秘密 |
| ready-to-reveal | 当前需求/价值、scores、`sealedCount=2`；不返回牌值 |
| round-result | 本轮已公开记录、hands、scores、history |
| match-result | result、hands、scores、history、seed |

`sealedCount` 只表达流程进度，不表达任一牌种。

### 9.3 `getPlayerView`

仅当 `phase=choosing` 且 `viewerSeat=activeSeat` 时，额外返回：

```text
availableCards = [
  { card, remainingAtRoundStart }
]
```

它仍不返回任一 sealed card，也不因第一位已确认而提前扣减 hand。

错席位、非整数、越界 viewerSeat 抛 `TypeError`；非 choosing 阶段返回与 public view
等价的数据。

## 10. 历史重放

`replayHistory(seed, history)` 应从初始 hand、score 和生成牌堆重放已公开记录，并
验证：

- roundIndex 连续；
- seasonNeed 与 seed 牌堆一致；
- petalValue 与固定表一致；
- firstSeat 与轮次奇偶一致；
- 每张牌当时仍可用；
- blocked、earned、scoreBefore、scoreAfter 均与生产 `resolveRound` 一致；
- 不接受终局后额外记录。

返回至少包括：

```text
hands
scores
completedRounds
nextRoundIndex
terminalResultOrNull
```

生产测试必须证明当前 state 的公开历史重放后与 state.hands/scores 一致。历史不是
只供 UI 展示的自由文案。

## 11. DOM 与阶段隐私合同

页面有一个主状态容器，按 phase 重建，而不是把所有卡片永久留在 DOM 再切 CSS：

| 阶段 | 必须存在 | 必须不存在 |
| --- | --- | --- |
| intro | 标题、规则、开始按钮 | 季节、手牌、秘密、历史 |
| season | 当前需求、轮次价值、公开库存、开始藏牌 | 选择按钮、sealed 牌值 |
| handoff | 接管者、接管按钮、中性遮屏 | 任一牌值选择、上一位选中态 |
| choosing | 当前席位、该席位可用牌、确认/遮屏 | 对方秘密、已确认牌值、完整 future deck |
| ready-to-reveal | 当前需求、两位已完成、共同揭晓 | 两张牌值、选中态、秘密 live region |
| round-result | 两张公开牌、阻断、得分、继续 | 下一轮需求、任何未公开秘密 |
| match-result | 结果、公开历史、重开 | 新局 future deck |

额外禁止：

- secret 写入 `id`、class、`data-*`、style、title、aria-label、aria-description、
  hidden input、URL、hash、query、local/sessionStorage 或 console；
- 把秘密节点仅做 `display:none`、`visibility:hidden`、移出屏幕或 `aria-hidden`；
- 让揭晓动画结束事件决定扣牌、得分或胜负；
- 使用 `innerHTML` 渲染配置或历史。

## 12. UI 输入与生命周期

- 所有操作使用原生 `<button type="button">`；
- 手牌按钮支持 Tab、Shift+Tab、Enter、Space；`1/2/3` 可作为可选快捷键；
- Escape 在 choosing 阶段执行 COVER，其他阶段不推进；
- 点击一张牌只设置 UI 本地草稿，必须再点“确认这张”才 dispatch `SEAL_CARD`；
- blur/hidden/pagehide 清空本地草稿并 COVER；
- 从后台恢复停在 handoff，需要玩家再次明确接管；
- 焦点阶段切换后进入稳定标题或首个主要按钮；
- `aria-live=polite` 只报告公开流程和揭晓结果；
- 不自动开始下一轮、不自动揭晓、不自动重开；
- 不注册长按、双击、滑动、拖拽或真实计时规则。

## 13. 视觉规格

视觉系统由 [`243-garden-resource-duel-design.md`](./243-garden-resource-duel-design.md)
进一步冻结；逻辑规格要求：

- 左右两盆花的公开花瓣数与 scores 一致；
- 当前需求同时有文字和符号；
- 手牌种类同时有名称、说明、剩余数量和非颜色边界；
- 被阻断只表现“本轮没有长出”，不表现枯萎或扣除旧花瓣；
- 双方同轮开花时同时进入完成态；
- 减少动态不改变可见信息或迁移时机；
- 320px 窄屏无横向滚动；
- 200% 缩放下主要流程仍可操作。

## 14. 测试矩阵

### 14.1 纯逻辑

- 常量、初态、冻结和 restart 深相等；
- seed 边界、确定性、三阳光三雨露与拒绝采样；
- 固定 seed deck 夹具；
- 所有阶段合法/非法迁移和 revision；
- 第一位确认后 hand 不变，第二位无法从 view 推断牌种；
- 两位确认后 ready view 不含牌值；
- 所有 3×3 联合牌面对两种 season 的 earned/blocked；
- 同轮双得分、双开花与双方原子结算；
- 第六轮分数胜、平局和所有 result reason；
- firstSeat 六轮严格 `0,1,0,1,0,1`；
- hand 不会负数或重复使用；
- history 重放与 state 一致；
- config 清洗、组合文案异常回退；
- action/state/view 的 hostile object、getter、symbol、污染原型和可变引用；
- 公开 DTO 和 player DTO 的字段白名单。

### 14.2 穷举

生产 `logic.test.js` 必须生成：

- 90 个唯一手牌排列；
- 20 个唯一季节排列；
- 162,000 个完整固定序列夹具；
- 席位 0 胜 59,444；
- 席位 1 胜 59,444；
- 平局 43,112；
- 没有固定序列对全部对方序列与全部 deck 保持不败。

穷举必须调用生产 `resolveRound`/终局函数，不能复制一套测试专用规则。

### 14.3 DOM 与浏览器

- intro → season → 两次 handoff/choosing → ready → result 的真实点击路径；
- 第一位确认后 DOM、attribute、ARIA、状态消息无牌值；
- ready 阶段两张牌都不在 DOM；
- reveal 后两张牌、阻断原因和分数公开；
- blur、hidden、pagehide、Escape 遮屏且草稿消失；
- 键盘完成整局；
- 320×568、768×1024、1440×900；
- 200% 缩放、减少动态、强制颜色；
- 重开回到纯 intro；
- 无 console error、无网络请求、无 storage 写入。

### 14.4 A 级合同

- `index.html` 只有本地相对脚本和样式；
- 没有 module、fetch、动态 import、Worker、WASM、远程 URL、表单提交；
- `file://` 静态合同通过；
- 因浏览器自动化 URL 策略无法导航 `file://` 时，验收必须如实记录：
  - 静态 A 级 file 合同；
  - 人工双击路径说明；
  - 同源 localhost Chrome 行为验收；
  - 不把 localhost 证据冒充自动化 file 导航。

## 15. 作品合同草案

catalog 条目至少包括：

```text
id: garden-resource-duel
category: versus
title: 这一朵，我先养开
mode: 双人对抗
launchLevel: A
entry: experiences/versus/garden-resource-duel/index.html
networkRequired: false
permissions: []
runtimeDependencies: []
resourcePolicy: local-only
attribution: experiences/versus/garden-resource-duel/ATTRIBUTION.md
```

最终字段以仓库现有 catalog schema 为准，不新增未要求的分类或默认值。

## 16. 借鉴与版权验收

生产 `ATTRIBUTION.md` 必须记录：

- `amsanghi/gops` 固定 commit
  `aeccb2a889eade57dec7a8ba542e1bd4307a526e`、MIT、权利主体与 LICENSE SHA-256；
- `boardgameio/boardgame.io` 固定 commit
  `65ca73beb62ef2afd980bb9f569b10dabfc60075`、MIT、权利主体与 LICENSE SHA-256；
- 仅借鉴 Hot Seat / sealed choice / spent hand / pure transition / public projection 抽象；
- 不复制、改写、翻译、移植、打包或依赖其代码、API、测试、规则原句、页面、视觉、
  题材、图片、声音、字体、图标或其他资产；
- 本作季节牌堆、牌种作用、花瓣值、开花规则、状态机、中文文案、测试和 DOM/CSS
  视觉均为原创；
- 平台规范只用于行为验收。

## 17. 规格冻结

实现阶段不得无文档变更地修改：

- 牌数、牌种、季节组成、花瓣表或开花阈值；
- 虫害是否删除旧分或产生自己的得分；
- 第一位确认时是否扣公开 hand；
- 联合原子结算顺序；
- 平局与 round-cap；
- future deck 的公开边界；
- A 级、零依赖、零素材和借鉴声明边界。

若测试暴露规则缺陷，先记录 `bugs/`，再更新本规格和实现；不能只在 UI 层打补丁。
