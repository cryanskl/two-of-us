# A 级“影子剑术”可执行规格

- 日期：2026-07-23
- 创意来源：创意池 V19“影子剑术”
- 前置调研：[`219-shadow-sword-duel-research.md`](./219-shadow-sword-duel-research.md)
- 工作 ID：`shadow-sword-duel`
- 目录：`experiences/versus/shadow-sword-duel/`
- 启动等级：A，经典脚本、相对路径、`file://` 直开
- 首版标题：`影子剑术`
- 规格状态：可进入纯逻辑实现；生产 UI 仍需视觉概念与用户确认

## 1. 产品承诺

两个人轮流接过同一台设备，各自暗选“攻、防、闪、蓄”之一。两份动作都封好后，
一起揭晓并从同一个回合开始快照结算。体力、气和先机会跨回合保留；先让对方
体力归零者获胜，最多九回合。

首版承诺：

- 第一次进入 30 秒内能理解“遮屏选招、一起揭晓、先把对方体力打到零”；
- 没有固定四向胜负表，同一“攻 / 防”因先机不同会产生不同结果；
- 单设备正常交接流程不会提前把已封动作渲染进 DOM；
- 双方规则、资源上限、终局与输入能力完全对称；
- 不依赖随机数、真实时钟、动画完成事件、网络、storage、权限或第三方运行包；
- 完整一局最迟在第 9 回合结束，重开与首次加载深相等。

首版不包含：

- 实时移动、碰撞、连招、反应速度或节奏判定；
- 电脑对手、难度、技能树、装备、道具、角色属性或随机暴击；
- 倒计时、长期战绩、排行榜、成就、账号、题库编辑器或分享链接；
- 双设备房间、可信裁判、密码学提交或对开发者工具的恶意检查防护；
- 音频、震动、商业 IP、第三方角色、关卡、精灵、图像或字体。

## 2. 冻结术语与资源

| 术语 | 精确定义 |
| --- | --- |
| 席位 | 稳定整数 `0` 或 `1`；与当前谁拿设备无关 |
| 回合开始快照 | 本回合任何选择前，由已揭晓历史重放得到的双方资源 |
| 草稿 | 当前持机者尚未确认、可以改选的动作 |
| 封招 | 已确认但尚未揭晓的动作；正常 UI 不可读取 |
| 联合结算 | 两份封招都合法时，用同一个开始快照一次性计算双方变化 |
| 体力 | 0–3；归零参与立即终局 |
| 气 | 0–2；选择“攻”需要并消耗 1 点 |
| 先机 | 公开布尔资源；成功挡住普通攻时取得，本人选择攻时消耗 |
| 普通攻 | 攻击者在回合开始快照中没有先机的“攻” |
| 先机攻 | 攻击者在回合开始快照中持有先机的“攻” |

“先机”只在持有者本人选择 `attack` 时消耗。被击中、被破防、选择防/闪/蓄，
都不会清除其此前已有先机；成功挡住普通攻会把它设为 `true`。

## 3. 冻结常量

```text
VERSION = 1
PLAYER_COUNT = 2
START_HEALTH = 3
START_ENERGY = 1
MAX_HEALTH = 3
MAX_ENERGY = 2
MAX_ROUNDS = 9
ATTACK_COST = 1
ACTIONS = ["attack", "guard", "dodge", "charge"]
PHASES = [
  "intro",
  "choosing",
  "handoff",
  "ready-to-reveal",
  "round-result",
  "match-result"
]
```

所有导出常量、默认配置、state、screen view、历史事件、解析结果和配置副本都必须
递归冻结。运行时不能根据视口、平台、上局结果或日期修改规则常量。

## 4. 配置合同

首版只开放最小个性化：

```js
window.SHADOW_SWORD_CONFIG = {
  playerNames: ["左席", "右席"],
  finalNote: "看懂对方之前，先藏好自己。"
};
```

默认值必须完整可玩，用户不编辑配置也没有 TODO 或占位文案。

### 4.1 校验

- 配置顶层必须是普通对象，只允许 `playerNames`、`finalNote` 两个 own data property；
- `playerNames` 必须是精确长度 2 的普通数组，允许的 own keys 只有 `0`、`1`、
  `length`，两个索引必须都是字符串 data property；
- 名字先 trim，再按 Unicode code point 计数，必须为 1–12 个 code point；
- 两个名字 trim 后必须不同；
- 任一名字非法时，整对名字回退为默认值，不能拼接一半用户值；
- `finalNote` trim 后必须为 1–80 个 Unicode code point，非法时单独回退；
- 缺失字段或 `undefined` 使用对应默认值；不能借缺失字段绕过顶层额外 key 检查；
- C0/C1 控制字符、孤立代理项、getter、setter、symbol key、额外 key、稀疏数组、
  数组子类、自定义原型与 Proxy 异常都安全回退；
- 返回值是递归冻结、断开调用方引用的纯文本副本；
- 页面只用 `textContent`，配置不能提供 HTML、URL、class、颜色、动作、规则或函数。

本地纯文本不是加密。拿到作品目录的人可以直接阅读 `config.js`。

## 5. 纯规则函数

逻辑层至少暴露：

```text
sanitizeConfig(candidate)
createInitialState(config?)
getPlayersBeforeRound(history)
isActionAvailable(player, move)
resolveRound(playersBefore, actions)
replayHistory(history)
reduce(state, action)
getScreenView(state)
```

可以增加内部 helper，但不能让 DOM、Date、performance、Math.random、storage、
fetch、WebSocket、AudioContext、requestAnimationFrame 或 catalog 进入纯逻辑。

### 5.1 玩家资源

纯规则中的玩家快照精确为：

```text
{
  health: integer 0..3,
  energy: integer 0..2,
  initiative: boolean
}
```

初始双方都是：

```text
{ health: 3, energy: 1, initiative: false }
```

### 5.2 动作合法性

- `attack`：仅当本人的回合开始 `energy >= 1`；
- `guard`、`dodge`、`charge`：体力大于 0 时始终合法；
- 玩家体力归零、未知字符串、大小写变体或非字符串一律非法；
- 两份动作都必须相对于同一个 `playersBefore` 校验，不能让第一份结算后的资源
  影响第二份动作合法性。

`isActionAvailable(player, move)` 只判断这一份资源快照能否选择该动作，不读取
phase、roundIndex 或 match result。是否已经终局由 replay/reducer 在调用它之前
判断。

## 6. 联合结算算法

`resolveRound(playersBefore, actions)` 只接受两个精确玩家快照和按席位排列的两个
合法动作。任一输入非法时精确返回 `null`，不抛异常、不修改输入、不得部分结算。

### 6.1 支付与命中

对每个席位 `i`：

```text
opponent = 1 - i
spentEnergy[i] = actions[i] == attack ? 1 : 0
spentInitiative[i] =
  actions[i] == attack && playersBefore[i].initiative
```

席位 `i` 是否被对手击中：

```text
if actions[opponent] != attack:
  hit[i] = false
else if actions[i] == dodge:
  hit[i] = false
else if actions[i] == guard:
  hit[i] = playersBefore[opponent].initiative
else:
  hit[i] = true
```

因此：

- 攻 / 攻：双方都命中；
- 普通攻 / 防：防守成功；
- 先机攻 / 防：破防命中；
- 任意攻 / 闪：攻击落空；
- 任意攻 / 蓄：命中并打断本回合蓄力收益。

### 6.2 资源变化

对每个席位 `i`：

```text
gainedInitiative[i] =
  actions[i] == guard
  && actions[opponent] == attack
  && playersBefore[opponent].initiative == false

gainedEnergy[i] =
  actions[i] == charge
  && hit[i] == false
  && playersBefore[i].energy < MAX_ENERGY

healthAfter =
  max(0, playersBefore[i].health - (hit[i] ? 1 : 0))

energyAfter =
  playersBefore[i].energy
  - spentEnergy[i]
  + (gainedEnergy[i] ? 1 : 0)

initiativeAfter =
  actions[i] == attack
    ? false
    : gainedInitiative[i]
      ? true
      : playersBefore[i].initiative
```

所有 `hit`、支付、获得与 after 值先计算后一次性组成新快照。不得在计算席位 1
之前写回席位 0。

### 6.3 冻结的 effect

合法结算返回：

```text
{
  playersBefore,
  actions,
  hit: [boolean, boolean],
  spentEnergy: [0|1, 0|1],
  spentInitiative: [boolean, boolean],
  gainedEnergy: [boolean, boolean],
  gainedInitiative: [boolean, boolean],
  playersAfter
}
```

输入数组和对象不得被修改；返回对象与输入断开引用并递归冻结。UI 文案从这些
布尔量派生，不能把自然语言战报当作权威规则。

## 7. 事件历史是唯一资源真相

state 不保存第二份可漂移的当前资源。每次需要当前资源时，从初始快照依次重放
最多九条已揭晓事件：

```text
{
  roundIndex: integer 1..9,
  firstSeat: 0 | 1,
  actions: ["attack" | "guard" | "dodge" | "charge", ...]
}
```

历史事件只保存身份、先持机席位与按席位排列的动作；before、effect、after、
胜负和战报全部可派生。每条事件必须是普通对象，own data property 精确为
`roundIndex`、`firstSeat`、`actions`，无 symbol、getter、setter 或额外 key；
`actions` 必须是普通长度 2 数组，own keys 精确为 `0`、`1`、`length`，两个索引
都是合法动作字符串。自定义原型、数组子类、稀疏项与 Proxy 异常均非法。

`replayHistory(history)` 对任意非法历史精确返回 `null`，不抛异常、不修改输入；
合法历史必须：

1. 从两份初始玩家快照开始；
2. 要求 roundIndex 从 1 严格连续；
3. 要求 firstSeat 按初始席位逐回合交替；
4. 在每条事件前校验双方仍存活且动作在当时合法；
5. 调用同一个 `resolveRound`；
6. 若上一事件已终局，拒绝任何后续事件；
7. 返回每回合 effect、当前 players 与派生 match result 的冻结副本。

禁止维护另外的 score、currentHealth、currentEnergy、currentInitiative 或
winner 字段。

## 8. 精确 state

```text
{
  version: 1,
  phase,
  content: {
    playerNames: [string, string],
    finalNote: string
  },
  roundIndex: integer 1..9,
  firstSeat: 0 | 1,
  activeSeat: 0 | 1 | null,
  covered: boolean,
  draftAction: action | null,
  sealedActions: [action | null, action | null],
  history: event[],
  revision: non-negative safe integer
}
```

### 8.1 阶段不变量

| phase | activeSeat | covered | draftAction | sealedActions |
| --- | --- | --- | --- | --- |
| intro | `null` | `false` | `null` | `[null,null]` |
| choosing，未遮屏 | 当前席 | `false` | `null` 或合法动作 | 已封 0 或 1 份，当前席必须为空 |
| choosing，遮屏 | 当前席 | `true` | `null` | 与遮屏前相同 |
| handoff，回合开场 | 本回合 firstSeat | `false` | `null` | 精确 0 份 |
| handoff，第二席交接 | `1 - firstSeat` | `false` | `null` | 精确 1 份，且只在 firstSeat 的 slot |
| ready-to-reveal | `null` | `false` | `null` | 精确 2 份 |
| round-result | `null` | `false` | `null` | `[null,null]` |
| match-result | `null` | `false` | `null` | `[null,null]` |

其他不变量：

- intro 的 history 为空、roundIndex 为 1、firstSeat 为配置固定初始席位 0；
- history 长度等于已揭晓回合数；
- choosing/handoff/ready 的 roundIndex 等于 `history.length + 1`；
- choosing 若已有 0 份 sealed，activeSeat 必须为 firstSeat；若已有 1 份，
  activeSeat 必须为 `1 - firstSeat`；
- 0 份 sealed 的 round-start handoff 必须 `history.length >= 1`；首回合 START
  直接进入 choosing，不存在首回合开场 handoff；
- result 阶段的 roundIndex 等于最后一条历史的 roundIndex；
- round-result 只在未终局且 roundIndex 小于 9 时成立；
- match-result 只在体力归零或第 9 回合已揭晓时成立；
- revision 每次合法 reducer 转换加 1，非法 action 保持原对象引用；
- RESTART 是唯一例外：返回新的初始 state，revision 重新为 0，以满足深相等。

畸形 state 传入 reducer 或 getScreenView 时不得崩溃、触发 getter 或修改调用方：

- `reduce(malformedState, anyAction)` 忽略 action，返回使用默认配置创建的全新初态；
- `getScreenView(malformedState)` 返回上述默认初态的 intro screen view；
- 两条路径都不得从畸形 state 抢救部分 config、history、revision 或秘密。

## 9. 精确 action schema

| action | 精确字段 | 合法阶段 |
| --- | --- | --- |
| `START` | `{type}` | intro |
| `CHOOSE` | `{type, seat, move}` | choosing 且未 covered，seat 为 activeSeat |
| `CONFIRM` | `{type, seat}` | choosing 且未 covered、有合法 draft，seat 为 activeSeat |
| `COVER` | `{type}` | choosing 且未 covered |
| `RESUME` | `{type, seat}` | choosing 且 covered，seat 为 activeSeat |
| `TAKE_OVER` | `{type, seat}` | handoff，seat 为 activeSeat |
| `REVEAL` | `{type}` | ready-to-reveal |
| `NEXT_ROUND` | `{type}` | round-result |
| `RESTART` | `{type}` | match-result |

所有 action 必须是普通对象、精确 own data property、无 symbol、无 getter/setter、
无额外字段且原型为 `Object.prototype` 或 `null`。数组、函数、Promise、Proxy
异常、污染原型、字符串缩写、旧席位和错阶段都 fail closed。

`CHOOSE` 可覆盖当前草稿但不封招。`COVER` 清空未确认草稿，不能确认它。

## 10. 状态流转

### 10.1 首回合

```text
intro
  START
→ choosing(seat 0)
  CHOOSE* → CONFIRM
→ handoff(seat 1)
  TAKE_OVER
→ choosing(seat 1)
  CHOOSE* → CONFIRM
→ ready-to-reveal
  REVEAL
→ round-result / match-result
```

### 10.2 后续回合

`NEXT_ROUND`：

- roundIndex 加 1；
- firstSeat 切换为 `1 - previousFirstSeat`；
- activeSeat 设为新的 firstSeat；
- phase 进入 `handoff`，让公共结果页先退出，再由下一位主动接手；
- history 保留，秘密与草稿为空。

handoff 之后沿用首回合的 `TAKE_OVER → choosing → ...`。

### 10.3 CONFIRM

- 若当前是本回合第一份：把 draft 写入对应 sealed slot，清 draft，activeSeat 设为
  对方并进入 handoff；
- 若已有另一份：写入第二个 sealed slot，清 draft、activeSeat 设 null，进入
  ready-to-reveal；
- 它从不调用 resolveRound，也不公开任一 sealed action。

### 10.4 REVEAL

1. 从 history 重放得到 `playersBefore`；
2. 对两个 sealed action 调用 `resolveRound`；
3. 追加精确历史事件；
4. 立即清空 sealedActions；
5. 从新历史重放终局；
6. 终局则进入 match-result，否则进入 round-result；
7. 本次 effect 由最后一条历史重新派生，不另存。

### 10.5 COVER / RESUME

- 页面在 choosing 期间收到 `visibilitychange(hidden)`、`pagehide` 或真实 window blur
  时派发 COVER；
- COVER 只设 `covered=true`、清空 draft、增加 revision；
- COVER 不封招、不换席、不揭晓、不结算；
- 回到页面后仍显示中性遮屏，当前席必须主动按“继续选招”派发 RESUME；
- RESUME 只取消 covered；不会恢复被清掉的草稿；
- 非 choosing 阶段的生命周期事件不改变 state。

## 11. 终局

在每次 REVEAL 后按固定顺序判断：

1. `health[0] == 0 && health[1] == 0`：`double-ko` 平局；
2. 只有席位 0 为 0：席位 1 `knockout` 获胜；
3. 只有席位 1 为 0：席位 0 `knockout` 获胜；
4. roundIndex 小于 9：未终局；
5. 第 9 回合，体力较高者 `health` 获胜；
6. 体力相等，气较高者 `energy` 获胜；
7. 体力与气都相等：`round-limit-draw` 平局。

派生结果：

```text
{
  kind: "win" | "draw",
  winnerSeat: 0 | 1 | null,
  reason:
    "knockout"
    | "double-ko"
    | "health"
    | "energy"
    | "round-limit-draw",
  roundsPlayed: 1..9
}
```

先机不参与第九回合 tie-break。不存在隐藏加赛、随机裁决、真实用时、先持机席位
或点击次数 tie-break。

## 12. Screen View 与秘密边界

渲染器只能消费 `getScreenView(state)`，不能直接遍历 state。所有阶段共有：

```text
version, phase, title, playerNames,
roundIndex, maxRounds, firstSeat, activeSeat,
covered, players, revealedHistory, controls, revision
```

- players 是从 history 重放的公开体力、气、先机；
- revealedHistory 只含已经 REVEAL 的事件及派生 effect；
- title 固定为“影子剑术”；
- controls 是精确普通对象，own boolean data property 固定为：

```text
canStart
canChoose
canConfirm
canCover
canResume
canTakeOver
canReveal
canNextRound
canRestart
```

恰好只有当前阶段与 state 允许的能力为 true；不含回调、move 或席位。

`availableActions` 若存在，必须是按 attack / guard / dodge / charge 固定顺序的四项
冻结数组，每项精确为：

```text
{
  move,
  label,
  available: boolean,
  reason: null | "needs-energy"
}
```

按阶段额外字段：

| phase | 允许额外公开 |
| --- | --- |
| intro | `instructions`（固定纯文本数组） |
| choosing 且未 covered | `prompt`、`draftAction`、当前席 `availableActions` |
| choosing 且 covered | resumeSeat；不含 draft 或动作按钮 |
| handoff | `handoffSeat`、`handoffKind: "round-start" \| "second-seat"` |
| ready-to-reveal | `readyMessage`，值为中性“两位都已封招” |
| round-result | latestRound（含本回合双方动作与 effect） |
| match-result | latestRound、matchResult、finalNote |

每个 view 的 own keys 必须恰好等于公共字段加本表对应字段。不属于当前阶段的字段
必须不存在，不能以 `null`、空数组、空字符串、hidden object 或 CSS 隐藏方式残留。

任何 view 都不得包含：

- 尚未揭晓的 `sealedActions`；
- 历史之外的内部动作数组引用；
- config 原对象、state、函数、getter、DOM node 或策略；
- 隐藏答案的 key、hash、编码、CSS class、data attribute 或可访问名称。

正常玩法的 DOM 保密规则：

- renderer 每次先销毁上一阶段秘密节点，再从 view 创建新节点；
- `display:none`、透明度、离屏定位、template、注释、Canvas text 都不算销毁；
- 第一位确认后，第一份动作不能出现在 handoff、第二次 choosing 或 ready 页面；
- 第二位确认后，两份动作都直到 REVEAL 后才进入 view/DOM；
- 过去已揭晓动作可以保留在公开历史；
- 同设备开发者工具可检查 JavaScript 内存，这不在 A 级热座威胁模型内，README
  必须诚实说明；恶意参与者隔离属于未来 C 级双设备变体。

## 13. 默认文案合同

首版功能文案冻结语义，不冻结视觉排版：

```text
影子剑术
先藏好这一招，再看看你有没有读懂我。

每人 3 点体力、1 点气。
攻要花 1 点气；防住普通攻会拿到先机；先机攻可以破防；闪能避开攻击；没被打中的蓄会回气。
两个人都封招后，一起揭晓。最多九回合。

开始决斗
请把设备交给 {player}
我拿好了
选一招
封好这一招
两位都已封招
一起揭晓
下一回合
再来一场
```

结果区至少逐项说清：

- 双方本回合选了什么；
- 谁受到几点伤害；
- 谁花费或取得气；
- 谁消耗或取得先机；
- 当前双方体力、气和先机；
- 是否终局以及终局原因。

不得只显示“赢/输”、颜色闪烁或图标碰撞动画。

## 14. HTML、输入与焦点

- 页面只有一个 `<h1>`，每阶段用 `<h2 tabindex="-1">` 作为焦点落点；
- 所有可操作项是原生 `<button type="button">`；
- 四个动作 DOM 顺序固定为攻、防、闪、蓄，视觉重排不得改变 Tab 顺序；
- `attack` 不可用时真实 disabled，并有邻近文字“需要 1 点气”；
- 动作按钮至少包含动作名和一句规则摘要，不只依赖图形；
- CHOOSE 后焦点留在所选按钮；选择样式含文字“已选，尚未封招”；
- CONFIRM 后焦点进入 handoff 标题；
- TAKE_OVER / RESUME 后焦点进入“选一招”标题；
- 第二次 CONFIRM 后焦点进入 ready 标题，再让 Tab 到“一起揭晓”；
- REVEAL 后焦点进入 round-result 或 match-result 标题；
- NEXT_ROUND 后焦点进入 handoff 标题；
- RESTART 后焦点回 intro 标题；
- 不注册全局单键快捷键，避免旁观者误按或与读屏冲突；
- Pointer、鼠标、触屏、Space 和 Enter 都走相同 button 事件路径。

单一 `role=status` 只播报一次最新转换摘要。焦点标题和 live region 不能重复朗读
完整战报。

## 15. 表现与生命周期

视觉概念确认前不冻结颜色、字体、插画、粒子、剑影或布局风格。无论采用何种
视觉，必须满足：

- 规则状态由 DOM 文本完整表达，Canvas/SVG 只能作冗余表现；
- 动画只读取已结算 effect，不反写 state；
- 动画结束、transitionend、requestAnimationFrame 次数不推进阶段；
- `prefers-reduced-motion: reduce` 取消位移、挥剑、闪白和连续漂浮；
- 页面失焦、隐藏、恢复、缩放、旋转或 resize 不改变结果；
- 320×568、375×667、768×1024、1440×900 下不横向滚动；
- 200% 文本缩放仍能看到资源、动作说明和主要按钮；
- 触控目标至少 44×44 CSS px，按钮间不依赖像素级精确命中；
- 无 JS 时显示“此体验需要浏览器启用 JavaScript”，不伪装成可玩页面。

## 16. 文件合同

预计生产目录：

```text
experiences/versus/shadow-sword-duel/
├── index.html
├── style.css
├── config.js
├── logic.js
├── app.js
├── logic.test.js
├── README.md
└── ATTRIBUTION.md
```

若视觉确认后需要原创本地资产，放入 `assets/` 并登记来源与生成台账。没有资产
需求时不得为了目录对称创建空文件夹。

`index.html`：

- 使用经典相对 `<script>`，顺序为 config → logic → app；
- 无 module、base、iframe、form action、远程 URL、preload 或 service worker；
- CSP 若使用必须兼容 `file://`，不能依赖本地服务器 header。

## 17. 来源与借鉴声明

生产 README 与 ATTRIBUTION 必须固定：

1. OpenSpiel commit `112b77704631fc2ce7ad8e4581f6ca09798ce15a`，Apache-2.0，
   只借鉴 simultaneous move / joint action / sequential encoding 的通用术语；
2. boardgame.io commit `65ca73beb62ef2afd980bb9f569b10dabfc60075`，MIT，
   Copyright © 2017 The boardgame.io Authors，只借鉴 phases、state log、time travel
   的公开产品描述；
3. W3C WCAG 2.2 Recommendation 与 W3C Document License 2023，只作无障碍校准；
4. PrinceJS commit `ea1a97a763ac78fee5b35129e2841ef31531328e`，Unlicense，
   仅作为已排除的实时动作路线；
5. 实现独立编写，零第三方代码、零第三方资产复制；
6. 不使用 Prince of Persia 名称、角色、故事、关卡、地图、图像、精灵、音频或
   任何被引用项目的视觉表达。

若实现阶段实际复制任何第三方文件，必须停止“零复制”声明，逐文件核验并更新
许可证、NOTICE 与来源台账，不能沿用本规格默认口径。

## 18. 定向测试 Gate

### 18.1 规则表

至少覆盖：

- 普通攻 / 防、先机攻 / 防、任意攻 / 闪、攻 / 蓄、攻 / 攻；
- 双方交换席位后 effect 只交换身份；
- 攻命中、被防、被闪都花气并消耗本人已有先机；
- 被破防者原有先机保留；
- 成功防住普通攻取得先机，空防和被破防不取得；
- 未受伤蓄力加气，受伤不加，满气不溢出；
- 零气 attack 非法，双方动作都按同一 before 校验；
- 双攻原子伤害与双归零平局。

### 18.2 状态与隐私

- 全阶段精确 state 不变量；
- CHOOSE 只改草稿，CONFIRM 才封招；
- 第一份封招后 handoff/第二次 choosing/ready view 都不含动作；
- COVER 清草稿但不确认，RESUME 不恢复草稿；
- 生命周期事件不换席、不揭晓、不结算；
- REVEAL 恰好追加一条事件并立即清 sealed；
- round-result 才公开 latestRound；
- firstSeat 九回合严格 `0,1,0,1,...`；
- 非法 action 同引用 no-op，revision 不变；
- RESTART 与 createInitialState 深相等；
- state/view/history/config 全部冻结、断引用且 getter/Proxy fail closed。

### 18.3 历史、终局与性质

- 深克隆与 JSON 往返历史重放得到相同 players/effects/result；
- 伪造 roundIndex、firstSeat、死后动作、无气 attack、超长历史都拒绝；
- 1–8 回合未终局不提前结束；
- 第 9 回合按体力、气、平局三条路径结束；
- 单 KO、double KO、health winner、energy winner、round-limit draw 全覆盖；
- 枚举所有合法资源快照与 16 个动作对，资源始终有界；
- 性质测试：

```text
swap(resolveRound(before, [a, b]))
==
resolveRound(swap(before), [b, a])
```

其中 swap 同时交换 players、actions、effect 中所有 seat-indexed 字段。

### 18.4 静态边界

- 生产 JS 无网络、storage、random、time、DOM in logic、音频或 runtime hook；
- HTML 只有本地相对依赖，`file://` 能加载；
- README 与 ATTRIBUTION 含固定来源、许可证、实际借鉴与零复制边界；
- catalog 只在生产页面完整后标记 installed，不能提前占位。

## 19. 真实浏览器验收

生产 UI 完成后使用 Chrome MCP，至少保存以下证据：

1. `file://` 首次加载，无控制台错误与网络请求；
2. 首回合第一位选招、改选、封招、handoff；
3. 第二位 screen view 不含第一份封招；阶段根节点不存在第一席的选中标记、
   `aria-pressed=true`、sealed value、data attribute 或可访问名称；
4. ready-to-reveal view/阶段根节点不含任一席位的选中标记、sealed value、
   data attribute 或可访问名称；页面保留四个通用动作词不算泄露；
5. 普通攻被防并取得先机；
6. 下一回合同样攻/防变成先机破防；
7. 攻被闪、攻打断蓄、双方同时攻击；
8. 零气时 attack disabled，伪造点击不能推进；
9. 页面隐藏时清草稿并显示 cover，恢复不自动推进；
10. 单 KO 与 double KO；
11. 第 9 回合体力、气和平局终局；
12. RESTART 回到初始资源和空历史；
13. 320×568、375×667、768×1024、1440×900；
14. 键盘全流程、200% 文本缩放、reduced-motion；
15. localhost 再跑一遍核心流程，证明 file 与服务模式规则一致。

验收时必须读取真实 DOM、焦点、按钮 disabled、网络请求、控制台和逻辑 view，
不能只凭截图判断。

## 20. 完成定义

“影子剑术”只有同时满足以下条件才可在创意池标记已实现：

- 本规格、实施计划和视觉方向均已提交；
- 视觉概念获得用户确认；
- 纯逻辑、配置、页面、文档与借鉴声明全部完成；
- 定向测试、整仓 `npm test`、`npm run verify` 全绿；
- Chrome 完成 file 与 localhost 的完整九回合/提前终局路径；
- 阶段 DOM 隐私、焦点、响应式、reduced-motion 与生命周期通过；
- 发现的真实问题写入 `bugs/`，可复用知识写入 `learn/`；
- 每个完成部分均有独立 commit。

本规格通过不代表生产页面已完成，也不允许绕过视觉确认 Gate。
