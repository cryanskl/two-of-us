# A 级“蜜径相逢”可执行规格

- 日期：2026-07-24
- 创意来源：创意池 V20“蜂巢封路”
- 前置调研：[`223-honeycomb-passage-research.md`](./223-honeycomb-passage-research.md)
- 工作 ID：`honeycomb-passage`
- 目录：`experiences/versus/honeycomb-passage/`
- 启动等级：A，经典脚本、相对路径、`file://` 直开
- 首版标题：`蜜径相逢`
- 规格状态：可进入纯逻辑实现；生产 UI 仍需视觉概念与用户确认

## 1. 产品承诺

两个人在同一块 37 格蜂巢上轮流行动。每回合走一格，或消耗一枚封蜡永久封住
一格；任何封蜡都不能让任一方失去通往目标边的全部路线。先从自己的尖端走到
对面边缘者获胜，最迟在第 16 个完整回合结束。

首版承诺：

- 第一次进入 30 秒内能理解“走一步或封一格；先到对边；谁都不能被彻底堵死”；
- 封蜡合法性由纯逻辑对双方各做一次可达性检查，不依赖 UI disabled；
- 双方棋盘、移动、库存、目标距离和终局规则镜像；
- 不依赖随机、真实时钟、动画完成事件、网络、storage、权限或第三方运行包；
- 合法行动最多 32 个半回合，重开与首次加载深相等；
- 作品内有明确借鉴声明，生产代码、文案、视觉和资源独立实现。

首版不包含：

- 跳跃、推挤、交换、连走、拆墙、移动封蜡、技能、道具或隐藏格；
- 计时赛、AI、难度、关卡编辑器、录像导出、悔棋、长期战绩或排行榜；
- 双设备房间、在线匹配、账户、分享链接、音频、震动或商业棋类素材；
- Hex 的连边落子目标、Quoridor 风格的边界长墙、跳子或固定棋盘装饰。

## 2. 冻结术语

| 术语 | 精确定义 |
| --- | --- |
| 格 | 一个合法轴坐标 `{ q, r }`，第三轴 `s = -q-r` |
| 格 key | 坐标的唯一规范字符串 `${q},${r}`，仅用于逻辑集合与历史 |
| 半回合 `ply` | 一位玩家完成一次合法 `MOVE` 或 `SEAL` |
| 完整回合 `round` | 黄色、紫色各完成一次行动；只在紫色行动后增加 |
| 目标边 | 黄色为全部 `q = 3` 格，紫色为全部 `q = -3` 格 |
| 封蜡 | 永久占据一个格的中性障碍；不属于任一玩家，不可移动 |
| 永久路线 | 只把封蜡视为障碍，从当前棋子到任一目标格的图路径 |
| 实际落脚 | `MOVE` 还必须避开另一枚棋子的当前格 |
| 最短剩余距离 | 在只避开封蜡的图上，到任一目标格所需的最少移动数 |
| 无行动 | 当前玩家既没有合法相邻移动，也没有任何合法封蜡 |

路径保全只限制 `SEAL`。玩家不能通过封蜡制造永久无路状态，但可以用自己的棋子
暂时挡住一个格；因此永久路线检查忽略对手棋子，实际移动检查不忽略。

## 3. 冻结常量

```text
VERSION = 1
PLAYER_COUNT = 2
BOARD_RADIUS = 3
BOARD_CELL_COUNT = 37
STARTING_SEALS = 4
MAX_ROUNDS = 16
MAX_PLIES = 32
YELLOW = 0
PURPLE = 1
STARTS = [{ q: -3, r: 0 }, { q: 3, r: 0 }]
ACTIONS = ["move", "seal"]
PHASES = ["intro", "playing", "result"]
DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
]
```

所有导出常量、默认配置、cell、board、state、历史、replay、view、合法行动列表和
配置副本递归冻结。运行时不能根据设备、视口、日期或上一局结果改变规则常量。

## 4. 配置合同

首版只开放纯文本个性化：

```js
window.HONEYCOMB_PASSAGE_CONFIG = {
  playerNames: ["蜜黄", "暮紫"],
  finalNote: "绕一点路，也还是会在对面相逢。"
};
```

### 4.1 校验

- 配置顶层必须是普通对象，只允许 `playerNames`、`finalNote` 两个 own data property；
- `playerNames` 必须是精确长度 2 的普通数组，own keys 仅 `0`、`1`、`length`；
- 名字 trim 后按 Unicode code point 计数，必须为 1–12 个 code point 且彼此不同；
- 任一名字非法时，整对名字回退；`finalNote` 为 1–80 code point，独立回退；
- C0/C1 控制字符、孤立代理项、getter、setter、symbol、额外 key、稀疏数组、
  数组子类、自定义原型和 Proxy 异常都安全回退；
- 返回递归冻结、断开调用方引用的纯文本副本；
- 页面只用 `textContent`；配置不能提供 HTML、URL、class、颜色、规则或函数。

默认配置必须完整可玩。本地纯文本不是秘密，拿到作品目录的人可以直接阅读。

## 5. 棋盘与坐标合同

逻辑层至少暴露：

```text
cellKey(cell)
parseCellKey(key)
isCellOnBoard(cell)
createBoard(radius?)
getNeighbors(cell)
isGoalCell(player, cell)
findShortestDistance(start, player, blockedKeys)
```

### 5.1 合法 cell

公开 API 只接受精确 own data property 为 `q`、`r` 的普通对象：

- `q`、`r` 均为有限安全整数；
- `s = -q-r` 也必须是安全整数；
- `max(abs(q), abs(r), abs(s)) <= BOARD_RADIUS`；
- 不接受数组、Date、class 实例、自定义原型、额外 key、symbol、getter、setter、
  字符串数字、`NaN`、Infinity、浮点或 Proxy 异常。

`cellKey` 对非法输入返回 `null`；合法输入返回无空格的十进制 `"q,r"`。
`parseCellKey` 只接受 canonical key：`"0,0"` 合法，`"+0,0"`、`"-0,0"`、
`"00,0"`、`"0, 0"`、越界值或非字符串返回 `null`。

### 5.2 棋盘生成

`createBoard()` 返回按 `q` 升序、同 `q` 按 `r` 升序排列的 37 个冻结 cell。
返回数组及元素递归冻结，每次调用可返回新副本，但值与顺序必须稳定。

`getNeighbors(cell)`：

- 非法或越界 cell 返回冻结空数组；
- 按 `DIRECTIONS` 固定顺序生成；
- 过滤越界格；
- 返回值不含重复项。

### 5.3 BFS

`findShortestDistance(start, player, blockedKeys)`：

- 只接受合法玩家 `0|1`、合法起点和 canonical key 普通数组；
- `blockedKeys` 不得重复、不得包含越界 key 或起点 key；
- BFS 只把 blocked key 当障碍，不读取棋子、DOM 或像素坐标；
- 起点已经在目标边时返回 `0`；
- 可达时返回最少边数，不可达或任一输入非法时返回 `null`；
- 不修改输入，返回不依赖邻居枚举偶然顺序。

内部可以使用 `Set` 加速，但公开 state、event 与 view 不暴露可变 Set。

## 6. 历史是唯一棋盘真相

权威历史事件精确为：

```text
{
  ply: integer 1..32,
  player: 0 | 1,
  type: "move" | "seal",
  targetKey: canonical cell key
}
```

history 是普通数组；每个事件必须是普通对象，own data property 精确为 `ply`、
`player`、`type`、`targetKey`，无 symbol、getter、setter、额外 key 或自定义原型。

`replayHistory(history)` 从固定起点与双方 4 枚封蜡开始，逐条验证：

1. `ply` 从 1 严格连续；
2. `player` 严格按 `0,1,0,1...` 交替；
3. 上一事件尚未产生终局；
4. `targetKey` canonical、在棋盘内；
5. `move` 目标属于当前六邻居，未封蜡且不被对手占据；
6. `seal` 时库存大于 0，目标未封蜡且不被任一棋子占据；
7. 候选封蜡后两位玩家的永久路线均存在；
8. 应用事件并检查终局。

合法 replay 返回：

```text
{
  positions: [cell, cell],
  sealsRemaining: [integer, integer],
  blockedKeys: canonical key[],
  activePlayer: 0 | 1 | null,
  ply: integer 0..32,
  round: integer 1..16,
  completedRounds: integer 0..16,
  distances: [integer, integer],
  legalMoves: cell[],
  legalSeals: cell[],
  result: null | result
}
```

`legalMoves`、`legalSeals` 属于下一位 active player；已有 result 时均为空数组，
activePlayer 为 `null`。任一非法历史精确返回 `null`，不抛异常、不修改输入。

state 不另外保存 positions、blocked、库存、activePlayer、round、distance 或
winner，防止与历史漂移。

## 7. 合法行动

纯逻辑至少暴露：

```text
getLegalMoves(replay)
getLegalSeals(replay)
hasRouteForBoth(replay, candidateCell)
applyAction(history, player, type, target)
```

### 7.1 移动

合法 `move` 必须同时满足：

- 当前 phase 为 `playing`，replay 未终局；
- player 等于 activePlayer；
- target 是当前棋子六邻接格；
- target 不在 blockedKeys；
- target 不等于对手当前位置。

移动不会增加或返还封蜡，也不会把离开的格变成障碍。移动后的位置一定仍有永久
路线：它至少可以沿刚走过的边回到旧位置；路径判断仍不得把对手当永久墙。

### 7.2 封蜡

合法 `seal` 必须同时满足：

- 当前玩家库存大于 0；
- target 在棋盘内、未封蜡且不是任一棋子位置；
- 把 target 加入 blockedKeys 后，两位玩家各自到目标边的 BFS 距离都不是 `null`。

封蜡可放在棋盘任意合法空格，不要求靠近当前棋子。合法封蜡仅扣当前玩家 1 枚，
不改变双方位置。

### 7.3 无行动

每次合法事件应用且未触发到边/回合上限后，立即为下一位玩家枚举两类行动。
若两类都为空，比赛结束，上一位玩家以 `immobilized` 获胜。

“仍有永久路线”不保证“此刻一定能走”：对手棋子可能暂时占住唯一邻格。因此无
行动判定必须使用实际 `getLegalMoves + getLegalSeals`，不能只看 BFS。

## 8. 终局与精确 result

终局检查顺序固定：

1. 当前 `move` 后，行动者在自己的目标边：`reached-goal`；
2. 若当前事件是第 32 ply（紫色完成第 16 个完整回合）：`round-limit`；
3. 下一位玩家无任何合法行动：`immobilized`；
4. 否则继续。

到边 result：

```text
{
  reason: "reached-goal",
  winner: 0 | 1,
  distances: [0 | integer, 0 | integer],
  sealsRemaining: [integer, integer]
}
```

无行动 result：

```text
{
  reason: "immobilized",
  winner: 0 | 1,
  immobilizedPlayer: 0 | 1,
  distances: [integer, integer],
  sealsRemaining: [integer, integer]
}
```

回合上限 result：

```text
{
  reason: "round-limit",
  winner: 0 | 1 | null,
  tiebreak: "distance" | "seals" | "draw",
  distances: [integer, integer],
  sealsRemaining: [integer, integer]
}
```

回合上限先比较较小的 shortest distance，再比较较多的 sealsRemaining，仍相同
为平局。固定顺序里 `round-limit` 先于“下一位无行动”，因为 32 ply 后已经没有
下一行动者；不能在终局后再制造第二个原因。

## 9. state、reducer 与 revision

精确 state：

```text
{
  version: 1,
  phase: "intro" | "playing" | "result",
  content: sanitized config,
  history: event[],
  revision: non-negative safe integer
}
```

reducer 只接受三类精确 action：

```text
{ type: "START" }
{ type: "ACT", player: 0|1, move: "move"|"seal", target: cell }
{ type: "RESTART" }
```

- action 必须是普通对象，own data keys 与对应类型精确一致；
- `START` 只在 intro 合法，转为 playing，history 仍空，revision +1；
- `ACT` 只在 playing 合法；调用同一个 `applyAction`，成功后 history 追加一条；
- 追加后 replay 有 result，则 phase 为 result，否则仍 playing；
- `RESTART` 只在 result 合法，保留当前 sanitized content，回到 intro，revision +1；
- 任意未知、畸形、错 phase、错玩家或非法目标 action 返回原 state 同一引用；
- 畸形 state 输入安全回到带默认配置的初始 state，不抛异常；
- revision 只记录被接受的 reducer 行动，不等于 ply；非法 action 不推进。

模式选择、hover 预览、焦点格和动画阶段是 app 表现状态，不进入权威 reducer。

## 10. 公开 view 合同

`getScreenView(state)` 只输出渲染所需冻结副本，至少包括：

```text
version, phase, title, playerNames, finalNote,
boardCells, positions, blockedKeys, sealsRemaining,
activePlayer, ply, round, completedRounds, distances,
legalMoveKeys, legalSealKeys, history, result, controls, revision
```

controls 精确为：

```text
{ canStart, canAct, canRestart }
```

- intro：展示规则、空棋盘起点和 `canStart=true`；
- playing：展示公开全盘、当前玩家、库存、距离与合法 key，`canAct=true`；
- result：展示终局原因、胜者/平局、最终盘面与 finalNote，`canRestart=true`；
- 所有阶段都不得暴露内部 Set、函数、DOM、未校验配置或可变引用；
- 视图中的 history 是规范事件副本，不把自然语言战报写回权威历史。

## 11. 必须通过的测试矩阵

### 11.1 几何与路径

- `createBoard()` 恰有 37 个唯一 canonical key；
- 内部格 6 邻居、角格 3 邻居，所有邻接双向对称；
- 起点和目标边镜像，双方初始距离均为 6；
- 对任意合法格，镜像 `mirror({q,r})={q:-q,r:-r}` 仍在棋盘；
- 固定 blocked 夹具的可达、唯一通道和不可达距离精确；
- blocked 输入重复、包含起点、越界、畸形 key 时安全返回 `null`。

### 11.2 行动与封路

- 初始双方合法移动集合互为镜像；
- 不能移动两格、进墙、进对手格、越界或原地；
- 合法封蜡扣正确库存、位置不变、轮到对手；
- 封住任一方最后路线的候选均不出现在 `legalSeals`，直接提交也被拒绝；
- BFS 忽略对手占位，实际移动不忽略；
- 库存为 0 时无 `seal`，另一方库存不受影响；
- 历史重放能重建位置、封蜡、库存、ply、round 与 activePlayer。

### 11.3 终局与对称

- 黄色/紫色到边都立即获胜；
- 下一位无移动且无封蜡时，上一位以 `immobilized` 获胜；
- 32 ply 精确触发距离、库存与平局三类 round-limit；
- 31 ply 不得提前比较距离；
- 终局后的额外历史与 ACT 均拒绝；
- 玩家互换并做坐标镜像后，合法行动、距离和胜负也镜像；
- `restart(result)` 与相同 config 的首次加载深相等，revision 规则除外。

### 11.4 输入与不变量

- 配置、cell、event、history、state、action 的 getter / Proxy / prototype 攻击不抛；
- 非法 reducer action 返回同一引用且 revision 不变；
- 所有公开对象递归冻结并与调用方断开引用；
- 逻辑脚本不含 `Date`、`Math.random`、`performance`、storage、网络、DOM 或计时 API；
- 对固定种子的至少 1,000 条合法随机游走逐步断言：位置不重叠、不在封蜡上、
  库存 0..4、永久路线存在、ply 连续、终局后不再推进。

## 12. A 级文件与脚本合同

生产目录计划：

```text
index.html
styles.css
config.js
logic.js
app.js
logic.test.js
README.md
ATTRIBUTION.md
```

加载顺序固定：

```html
<script src="./config.js"></script>
<script src="./logic.js"></script>
<script src="./app.js"></script>
```

不用 `type="module"`、npm 运行依赖、fetch、XHR、WebSocket、Worker、Service Worker、
浏览器存储、远程字体、CDN 或服务端。`logic.js` 需同时支持经典脚本全局
`HoneycombPassageLogic` 与 Node 测试导入。

## 13. 验收门

纯逻辑可以立即实现并独立提交。生产 UI 只有在以下条件全部满足后开始：

1. 本规格已提交；
2. 实施计划已提交；
3. 逻辑测试通过，路径夹具、镜像和终局均有证据；
4. 借鉴声明文件结构已在计划中锁定；
5. 视觉概念图和设计提案经用户明确确认。

实现若发现规则需要变化，先更新本规格并独立提交，不能只在代码里悄悄改。
