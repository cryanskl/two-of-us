# “蜜径相逢”非视觉核心再验收

- 验收日期：2026-07-25
- 基线：`9d52b5c1d9b628cd61be563bba29fa40478289bd`
- 作品目录：[`../experiences/versus/honeycomb-passage/`](../experiences/versus/honeycomb-passage/)
- 冻结规格：[`224-honeycomb-passage-spec.md`](./224-honeycomb-passage-spec.md)
- 验收范围：图结构、双席规则、历史重放、公开投影、敌对输入、来源与机制去重
- 明确不在范围：生产 HTML/CSS/app、catalog、Board、launcher、共享依赖与视觉验收

## 1. 结论

本轮发现并修复两类真实核心缺口：

1. 结构合法但可变或只浅层冻结的 state 会沿非法 action 的同引用 no-op 逃逸；
2. 公开 replay helper 会接受超出声明 ply 行动预算的封蜡库存和棋子位置。

修复后非视觉核心 Gate 通过：

- 37 格轴坐标棋盘、六邻接和双方目标边严格镜像；
- 任一合法封蜡都保留双方从当前位置到目标边的永久路线；
- 实际移动避开对手，永久 BFS 刻意忽略对手临时占位；
- history 是位置、库存、障碍、回合和终局的唯一权威来源；
- reached-goal、round-limit 和 immobilized 按冻结优先级确定；
- 公开 view 只含共享棋盘信息、规范历史与渲染副本；
- state/action/history/replay/config/cell 的异常 Proxy、accessor、原型与字段攻击
  fail closed；
- 固定来源、许可证、零代码复制、零生产素材复制与机制差异声明完整。

这不是“作品已可玩”的验收。当前生产目录没有 `index.html`、`styles.css`、
`app.js` 或 README，视觉提案仍标记等待用户确认；因此不能接入 catalog，也不能把
纯逻辑目录报告成 A 级直开作品。

## 2. 已修复缺口

### 2.1 可变 state 沿 no-op 逃逸

旧 `readState` 验证字段和值，但没有验证冻结所有权。以下输入会被当成合法
`playing` state：

```text
structuredClone(validState)
Object.freeze(structuredClone(validState))
```

非法 action 按合同返回原引用，导致可变或嵌套可变的调用方对象继续作为权威 state
传播；`getScreenView` 也会把它投影为进行中对局。

修复后 state 入口要求整个 own-data graph 递归冻结，并安全处理反射异常。合法冻结
state 的非法 action 仍保持原引用；可变或浅层冻结 state 回到全新默认初态。

证据：

- 修复前新增红测：`23 pass / 1 fail`；
- 修复后定向：`24 / 24`；
- 既有 descriptor-only Proxy state 的合法 ACT 与 view 仍通过；
- 记录：
  [`2026-07-25-honeycomb-passage-mutable-state-noop.md`](../bugs/2026-07-25-honeycomb-passage-mutable-state-noop.md)；
- 沉淀：
  [`2026-07-25-reducer-noop-requires-owned-frozen-state.md`](../learn/2026-07-25-reducer-noop-requires-owned-frozen-state.md)。

### 2.2 replay 快照缺少行动预算

旧 `readReplaySnapshot` 会重算 blocked 数量、距离、合法集合与终局，却没有证明
快照能在声明的 `ply` 内形成。固定反例包括：

- `ply=0`，但双方 8 枚封蜡已经用完；
- `ply=0`，但双方棋子已经各移动一步；
- 黄方声明执行一次 move，却仍停在起点。

修复分两层：

1. 按 ply 奇偶计算两席行动数，封蜡消耗不能超过各自行动预算，起点到当前位置的
   最短距离不能超过剩余移动预算；
2. 因规则没有原地等待，还要求在完整棋盘上存在恰好 `moveBudget` 步的 walk；
   验证忽略后来障碍和对手临时占位，所以仍是不会误拒真实历史的必要条件。

三个公开 helper 对反例现在统一返回安全值：

```text
getLegalMoves(forged) → []
getLegalSeals(forged) → []
hasRouteForBoth(forged, candidate) → false
```

证据：

- 两轮红测均为 `24 pass / 1 fail`；
- 最终定向：`25 / 25`；
- 记录：
  [`2026-07-25-honeycomb-passage-replay-action-budget.md`](../bugs/2026-07-25-honeycomb-passage-replay-action-budget.md)；
- 沉淀：
  [`2026-07-25-derived-snapshot-action-budget-invariants.md`](../learn/2026-07-25-derived-snapshot-action-budget-invariants.md)。

必要预算校验不替代 history。reducer 的权威状态仍只接受严格事件历史重放结果；
公开 snapshot helper 只用预算排除明显不可能的派生快照。

## 3. 图结构与独立 BFS 证据

现有定向测试固定：

- 半径 3 棋盘恰有 37 个唯一 canonical cell，按 q/r 稳定排序；
- 中心 6 邻、六个角各 3 邻，所有邻接双向；
- 双方起点到目标边初始距离均为 6；
- 坐标镜像 `(-q,-r)` 保持棋盘、目标、距离与合法行动镜像；
- 唯一走廊、完全截断与绕行夹具结果精确；
- 重复、起点、越界、非 canonical、稀疏、accessor、数组子类和异常 Proxy
  blocked 输入全部拒绝。

本轮另写未进入生产代码的独立 oracle：

- 独立生成 37 格集合和六方向邻接；
- 独立实现队列 BFS，不调用生产 `getNeighbors` 或 `findShortestDistance`；
- 枚举除双方起点外 35 格的所有 0、1、2、3 障碍组合；
- 共比较 7,176 个 blocked 集合 × 2 位玩家，即 14,352 次距离结果。

结果：`14,352 / 14,352` 与生产 BFS 一致，包括可达整数距离和不可达 `null`。

这不是全博弈树穷举。完整对局另由固定终局夹具、双席镜像性质与至少 1,000 步
固定种子合法随机游走覆盖；随机只存在于测试进程，不进入生产规则。

## 4. 封蜡、共享规则与双席公平

封蜡合法性只有一条生产管线：

```text
候选格未占用
→ 加入 blocked
→ 蜜黄 BFS 到 q=3
→ 暮紫 BFS 到 q=-3
→ 两者均可达才接受
```

检查从两枚棋子的当前位置开始，只把永久封蜡当障碍。对手棋子是临时占位：

- `findShortestDistance` 与封蜡路径保全忽略它；
- 本手实际 `move` 明确禁止进入它；
- 实际零库存夹具证明“永久路径仍存在”不等于“当前一定有合法移动”，因此
  immobilized 必须枚举真实 moves + seals。

两席共享同一：

- 4 枚初始封蜡；
- 六邻移动规则；
- BFS 与封路保全；
- 到边、无行动和 16 回合终止规则；
- 距离、剩余封蜡、平局的 tie-break 顺序。

黄色固定先手是首版公开规则，不进入隐藏伤害或 tie-break。玩家互换并做坐标镜像
后，起点、目标、距离与合法集合镜像；若后续浏览器实玩证明先手优势明显，应另做
交换先手的两局制，不能在当前核心暗加补偿。

## 5. replay、确定性与终局

history 事件精确为：

```text
{ ply, player, type, targetKey }
```

`replayHistory` 从固定起点、双方 4 枚封蜡和空障碍开始，严格要求：

- ply 从 1 连续；
- player 为 `0,1,0,1...`；
- move 六邻、非封蜡、非对手占位；
- seal 有库存、目标为空且双方路线存在；
- 上一事件未终局；
- 最多 32 ply。

终局顺序固定：

1. 本次 move 到达行动者目标边；
2. 第 32 ply 做 round-limit；
3. 下一席 moves 与 seals 均为空时 immobilized；
4. 否则继续。

自动化覆盖双方 reached-goal、可实际形成的零库存 immobilized、31/32 ply 边界，
以及 round-limit 的距离胜、封蜡胜和平局。终局 history 后续事件、终局 state 的
ACT 与错误玩家动作均拒绝。

state 不保存第二份 positions、blocked、库存、距离或 winner；screen view 每次从
history 重放得到同一冻结投影。生产核心不读取随机、真实时钟或动画完成事件。

## 6. public view 与敌对输入

本作是公开共享棋盘，没有秘密手牌或隐藏答案。public view 应完整公开：

- 37 格棋盘；
- 两枚棋子位置；
- 永久封蜡、双方库存与距离；
- 当前玩家、ply、round；
- 当前合法移动/封蜡 key；
- 已发生规范事件与终局。

它不得暴露内部 Set、函数、未校验配置、可变引用或平行权威字段。现有测试确认
view、history、cell、result、controls 与嵌套数组递归冻结，并与 state 引用断开。

本轮用 revoked Proxy 覆盖 17 个公开调用位，包括：

- cell key / parse / board / neighbor / goal / BFS；
- replay 与三个 replay snapshot helper；
- applyAction；
- createInitialState、reduce 的 state/action/target；
- getScreenView；
- sanitizeConfig。

结果：`17 / 17` 均未抛异常。accessor、symbol、额外字段、稀疏数组、数组子类、
自定义原型和 descriptor-only Proxy 的既有定向测试继续通过。

## 7. 机制去重

| 邻近作品 | 现有核心 | “蜜径相逢”的独立核心 |
| --- | --- | --- |
| `paper-soccer` | 沿点阵画不可复用边、球随边移动、反弹/封死 | 移动不留边；有限占格封蜡必须保留双方路线 |
| `dots-and-boxes` | 轮流补边、围格计分、闭合后连走 | 不补边、不围格计分、不连走 |
| `light-trail-hunt` | 两人实时移动、轨迹增长、碰线淘汰、fixed tick replay | 轮流离散决策；移动不留轨迹；没有时钟/tick |
| `twin-light-maze` | 固定迷宫中的合作开门与共同到达 | 动态改图的对抗竞速，目标边相反 |
| Hex | 双方落子连接各自两边 | 两枚棋子移动竞速；中性占格封蜡；禁止彻底断路 |
| Quoridor 类路线 | 方格、边界长墙、跳子 | 六角格、整格封蜡、无跳跃或交换 |

共享“图”和“路径”不是机制重复。这里的新增约束是每个攻击性障碍都必须同时保留
双方永久路线，胜负来自棋子竞速或冻结终局，不来自连边落子或完全封死对手。

## 8. 来源、许可证与资产

本轮在线复核
[`ATTRIBUTION.md`](../experiences/versus/honeycomb-passage/ATTRIBUTION.md) 中的固定来源：

- Amit Patel / Red Blob Games 的 Hexagonal Grids 与 Implementation of Hex Grids：
  仅核对轴坐标、六邻接与图寻路教学概念；网页内容版权与配套代码许可边界已写明；
- `flauwekeul/honeycomb@6353276...`：MIT，Copyright © 2017 Abbe Keultjes；
- `tridpt/TwoPlayerGames@c96b802...` 的 Hex：MIT，Copyright © 2026 tridpt；
- W3C WCAG 2.2：2024-12-12 Recommendation，W3C Document License 2023。

声明明确：

- 没有安装 honeycomb 库；
- 没有复制、翻译、改写或打包源码、API、类型、测试、DOM、CSS、示例或素材；
- TwoPlayerGames Hex 只作为主动避开的连边落子反例；
- 本作的移动/封蜡组合、双方路径保全、16 回合终止、中文文案与测试独立编写。

四张 ImageGen 概念图只存在于
[`assets/honeycomb-passage/`](./assets/honeycomb-passage/)。
[`GENERATION.md`](./assets/honeycomb-passage/GENERATION.md) 记录无第三方图片输入、
原生尺寸、使用范围和错误格数/路线排除边界。当前没有生产生成资产；概念图不是
规则、棋盘几何或运行时素材来源。

## 9. 自动化结果

| 检查 | 结果 |
| --- | --- |
| `node --check` config / logic / test | PASS |
| `node --test experiences/versus/honeycomb-passage/logic.test.js` | 25 / 25 PASS |
| 独立 BFS oracle | 14,352 / 14,352 PASS |
| revoked Proxy 公开入口探针 | 17 / 17 不抛异常 |
| 固定种子合法随机游走 | 至少 1,000 步 PASS |
| `npm test` | 2,286 / 2,286 PASS |
| `npm run verify` | 58 个作品入口、1 个能力声明 PASS |

`npm run verify` 的 58 个入口不包含尚无 HTML 的“蜜径相逢”；这是正确边界。

## 10. 本轮提交链

| commit | 部分 |
| --- | --- |
| `d916743` | 拒绝可变/浅层冻结 state，新增红测与回归 |
| `90342a4` | 记录 mutable state no-op bug |
| `e29d430` | 沉淀冻结 state 与同引用 no-op 边界 |
| `6f069c4` | 校验公开 replay 的库存与位置行动预算 |
| `153dd3a` | 记录 replay budget 伪造 |
| `e57ac89` | 沉淀派生快照行动预算 |
| `04b33c1` | 要求存在恰好移动次数的棋盘 walk |
| `2436203` | 补全 replay budget bug 记录 |
| `3af5839` | 补全 exact move-count 学习边界 |

本验收报告作为最后一个独立 docs 提交。

## 11. Gate 与后续

| Gate | 状态 |
| --- | --- |
| 非视觉规则核心 | PASS |
| 37 格图结构、BFS 与封路保全 | PASS |
| 双席镜像与终局确定性 | PASS |
| history replay 与 public view | PASS |
| hostile Proxy/state/action/replay | PASS |
| 来源与借鉴声明 | PASS |
| 机制去重 | PASS |
| 可双击游玩 | BLOCKED BY DESIGN |
| UI、响应式、浏览器与视觉 fidelity | NOT RUN / OUT OF SCOPE |

下一阶段必须先获得
[`226-honeycomb-passage-design-proposal.md`](./226-honeycomb-passage-design-proposal.md)
要求的明确视觉确认，再实现生产资产与 `index.html/styles.css/app.js/README.md`。
完成后另做真实 `file://`、localhost、37 个 cell button、合法/拒绝封蜡、完整双席
对局、三档响应式、键盘/触控、reduced-motion、DOM 共享投影与视觉 fidelity 验收，
最后才接入 catalog 与创意池。
