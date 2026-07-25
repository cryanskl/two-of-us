# 「同路，谁先到」非视觉核心复验

- 日期：2026-07-25
- 项目 ID：`dual-maze-race`
- 分类 / 目标等级：`versus` / A
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/dual-maze-race-core-reaudit`
- 分支：`codex/exp-dual-maze-race-core-reaudit`
- 基线：`6560edeffddfde8ca9516c4549d66119b00b11af`
- 核心结论：**Core Go**
- 完整项目结论：**Conditional Go**

## 1. 复验结论

本轮从指定 main 基线重新审阅调研、脑暴、规格、计划、视觉提案、确定性迷宫、
规则状态机、测试、旧 bug 和借鉴声明。复验发现并修复三项核心缺口与一项来源缺口：

1. `validateMaze()` 只证明起点能到终点和 `E = V - 1`，会把“可达小树 +
   断开环岛”误判为合法树；
2. `readMazes()` 完成 descriptor 快照后又直接读取原 Proxy 的 seed/fingerprint，
   可能让 `createInitialState()` 抛异常；
3. passages 槽位是不可数值化对象时，诊断、导航、BFS 或分析 API 会触发隐式转换
   并抛异常；
4. `ATTRIBUTION.md` 没有覆盖调研实际使用的浏览器、无障碍、硬件来源和 Moore
   文献在线书目。

修复后，非视觉核心满足：

- 两个固定 seed、完整 fingerprint 和三项地图指标确定可复现；
- 两盘引用同一冻结 maze，四局按 seed 成对换席；
- 每 tick 同时消费两席各自 FIFO 的最多一个动作；
- 玩家编号镜像、入队顺序和 dispatcher 分组不改变规则结果；
- hostile maze/config/action/state 失败关闭；
- public view 共享公开 maze DTO，但不暴露输入队列、BFS 路径、fingerprint 或
  PRNG 中间状态；
- 调研与借鉴声明的 15 个 URL 集合完全一致，外部代码、地图和素材保持零复制。

当前仍没有生产 UI、浏览器验收、`file://` 完整四局、catalog 或 launcher，不能
宣称作品已经安装或本地点开即玩。

## 2. 审阅范围与历史

### 2.1 前置文档

- `docs/283-dual-maze-race-research.md`
- `docs/284-dual-maze-race-brainstorm.md`
- `docs/285-dual-maze-race-spec.md`
- `docs/286-dual-maze-race-plan.md`
- `docs/297-dual-maze-race-design-proposal.md`

### 2.2 当前核心

```text
experiences/versus/dual-maze-race/
├── ATTRIBUTION.md
├── config.js
├── logic.js
├── logic.test.js
└── package.json
```

关键历史提交：

| Commit | 职责 |
| --- | --- |
| `cbe8b2b` | 确定性双迷宫生成器、fingerprint 与结构测试 |
| `cb5b174` | 四局换席、fixed tick、输入检查、公开视图与配置 |
| `09de214` | 初版来源与借鉴声明 |
| `8af7fd1` | 起终点坐标转置 bug 记录 |
| `5900cbe` | 文档坐标修正为左中到右中 |
| `19d3ff1` | docs-only 视觉提案，等待用户确认 |
| `af7b1f7` | 本轮 validator、Proxy、hostile passage 修复 |
| `36dc62d` | 本轮来源补齐与自动防漂移测试 |

本轮没有修改 Board、catalog、共享运行时、根依赖、lockfile、launcher、生产 UI、
概念资产或其他体验。

## 3. 同源迷宫与坐标公平

冻结常量：

```text
ROWS = 9
COLS = 9
START = { row: 4, col: 0 }
GOAL = { row: 4, col: 8 }
方向顺序 = up, right, down, left
```

两个生产 fixture：

| Map | Seed | 路径长度 | 转弯 | 死胡同 |
| --- | --- | ---: | ---: | ---: |
| `COUP` | `0x434f5550` | 28 | 18 | 10 |
| `PAIR` | `0x50414952` | 30 | 19 | 10 |

完整 fingerprint：

```text
COUP
v1|9x9|36|44|434f5550|0608060a0a0a0a0a0c070a09060a0c060a0d05020a0b0c01030c05030a0c060d060a090504020b090105060805030c060a0a09070a090609030c040609060c030a0c050709060905020a0b09030a090209

PAIR
v1|9x9|36|44|50414952|0608060e08060e0a0c070a09030a0905020d05020e0a0a0c030c05030a09040609040505020c020b0b0e0905050609060c0209060905030a09030a0c030c05060a0a0a0c030a0905030a0a08030a0a0a09
```

每张默认地图均证明：

- 81 个节点；
- 80 条无向边；
- passage 只使用 `0..15` bitmask；
- passage 双向且不越界；
- 从起点遍历能访问全部 81 个节点；
- fingerprint 与 rows/cols/start/goal/seed/passages 同源；
- BFS 路径首尾为 index 36 和 44，连续且不重复。

旧坐标转置反例仍锁定：

| 坐标 | COUP：路径 / 转弯 / 死胡同 | PAIR：路径 / 转弯 / 死胡同 |
| --- | --- | --- |
| `{row:4,col:0}` → `{row:4,col:8}` | 28 / 18 / 10 | 30 / 19 / 10 |
| `{row:0,col:4}` → `{row:8,col:4}` | 48 / 30 / 11 | 34 / 25 / 14 |

两组坐标都能生成合法树，所以不能用“可解”代替坐标证明。生产常量、完整
fingerprint 和三项指标共同锁定左中到右中的同一方向。

## 4. 赛程、tick、replay 与输入隔离

赛程固定为：

```text
第 1 局：COUP，player 0 左席，player 1 右席
第 2 局：COUP，player 1 左席，player 0 右席
第 3 局：PAIR，player 0 左席，player 1 右席
第 4 局：PAIR，player 1 左席，player 0 右席
```

公平边界：

- 同一 seed 的两局引用同一个预生成 maze，不重新随机；
- 两块盘同尺寸、同朝向、同起终点和同 passage；
- 左席控制区与右席控制区在第二局交换 playerId；
- positions、queues、bumps 和 points 永远按 playerId 排列，不跟随 DOM 席位；
- 两条 FIFO 各自上限 2，每个 racing tick 各消费最多一项；
- 两位玩家从 tick 开始时的旧位置独立计算，再原子提交新位置；
- 同 tick 抵达双方各得 0.5，不用 DOM 事件先后拆分；
- 单人完整路径由 player 0 或 player 1 执行时，winner 与 points 精确镜像，
  elapsedTicks 和 bumps 相同；
- 相同整数 action trace 按每次 1 条或每次 7 条分组派发，最终 state 与 public
  view 完全一致；
- pause 清空队列且不推进 elapsedTicks，resume 使用固定 45 tick 倒数；
- 四局总分相同就是平局，不用 elapsedTicks 或 bump 暗中解平。

核心不读取 `Date.now()`、`performance.now()`、RAF、DOM 事件或系统时钟。未来 app
只能把浏览器时间转换成整数 `TICK`；RAF 分组本身没有规则权力。

## 5. hostile 输入与 public view

### 5.1 maze DTO

- record 与 array 只接受普通原型、精确 own data descriptor、无额外键；
- start/goal 必须是界内安全整数；
- seed 必须是非零 uint32；
- passage 必须是 `0..15` 安全整数，任何位运算前先验证；
- accessor、Symbol key、稀疏数组、数组子类和反射 trap 均失败关闭；
- descriptor 视图合法、普通 `get` 晚抛错的 Proxy 只观察一次快照；
- 断开环岛即使起终点可达、边数为 `V-1`、fingerprint 自洽也判 invalid；
- navigation 遇到 hostile passage 安全返回 `false`、原位置或 `null`，不抛异常。

### 5.2 state 与 action

- 只有 `createInitialState()` / reducer 产生并登记到内部 WeakSet 的 state 才合法；
- 伪造 state 进入 reducer 时恢复全新安全初态，进入 public view 时返回 `null`；
- action 要求精确字段、普通对象、own data descriptor 与当前 revision；
- 过期 revision、额外字段、accessor、Proxy trap、非法 playerId/direction/phase
  均不推进状态；
- state、maze、结果、配置与 public view 递归冻结并与调用者断开引用。

### 5.3 公开投影

两块 Board 的 `maze` 属性共享同一个新建公开 DTO 引用。公开 DTO 包含尺寸、
起终点和 passages，因为本作是全图公开的同题竞速；它不包含：

- 两条未消费输入队列；
- DFS stack / visited；
- BFS 最短路径；
- fingerprint；
- PRNG 中间状态；
- DOM、事件、timer 或可变内部 maze 引用。

## 6. 来源、借鉴与许可证

2026-07-25 重新访问并核对 15 个来源：

- Tarjan DFS 论文；
- Marsaglia xorshift 论文；
- Moore BFS 文献的 CiNii 书目记录；
- W3C UI Events、KeyboardEvent code、Pointer Events、High Resolution Time；
- WHATWG Page Visibility、Animation Frames；
- W3C Media Queries `prefers-reduced-motion`；
- WCAG Keyboard、Target Size、Focus Visible、Status Messages；
- Microsoft keyboard ghosting 说明。

集合检查：

```json
{"research":15,"attribution":15,"missing":[],"extra":[]}
```

算法资料只用于校准 DFS、xorshift 和 BFS 的理论/语义边界；浏览器、无障碍和硬件
页面只约束未来 UI Gate。没有复制论文文字、图、证明、伪代码、标准示例、产品、
演示或实现。

本轮没有搜索、克隆或阅读外部开源迷宫项目源码，也没有引入第三方代码、地图、
参数、测试、字体、图标、图片、音频或运行依赖。因此没有需要固定 commit/tag 的
外部开源对象，也没有需要随本作再分发的第三方软件许可证正文或 notice。

若未来实际参考开源实现，必须在写代码前固定仓库 URL 与 commit/tag，核对 LICENSE、
版权主体和资源许可证，并补实际借鉴、未复制范围及所需再分发文件。

## 7. 机制去重

当前仓库有 58 个已安装入口。最接近的作品仍没有覆盖本作的规则组合：

| 相邻作品 | 已有主机制 | 与本作的边界 |
| --- | --- | --- |
| `twin-light-maze` | 两人在同一地图用压力板与门合作到各自出口 | 本作是两块独立同构盘、无机关依赖、四局成对换席竞速 |
| `fog-navigation` | 全图观察者口述引导只见局部雾窗的移动者 | 本作双方始终看到完整同一地图，没有信息差 |
| `light-trail-hunt` | 自动前进、永久轨迹和玩家/轨迹碰撞 | 本作主动逐格移动，地图不改写且两盘无碰撞 |
| `orbit-star-race` | 自动绕行并改变速度层级追逐动态星流 | 本作固定网格、四向选择、无自动运动或动态目标 |
| `paper-soccer` | 轮流画不可复用边并借旧点连续行动 | 本作实时独立双盘，不画边、不封路、不借力 |

独立增量仍是：**同题双盘 + fixed tick 原子裁决 + 同 seed 换席复赛 + 双 seed 四局
公开竞速**。本轮没有增加陷阱、道具、动态改图、隐藏路线或 tie-break。

## 8. 自动验证

### 8.1 定向

```sh
node --test experiences/versus/dual-maze-race/logic.test.js
```

结果：

```text
tests 27
pass 27
fail 0
```

覆盖完整 fingerprint、独立指标、全图连通、坐标转置、passage 双向、敌对 maze、
hostile Proxy、输入检查、精确 action、90/45 tick、FIFO、撞墙、同 tick、玩家镜像、
分组 replay、四局换席、暂停、public view、配置与来源一致性。

### 8.2 全仓

新 worktree 初始没有 `node_modules`。按既有 `package.json` 和 lockfile 执行：

```sh
npm install --no-audit --no-fund
```

安装 55 个 package；`package.json` 和 `package-lock.json` 均未修改。

```sh
npm test
```

结果：

```text
tests 2281
pass 2281
fail 0
cancelled 0
skipped 0
todo 0
```

```sh
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

58 个入口不包含 `dual-maze-race`，不能据此推导该项目已经安装。

### 8.3 证据哈希

| 文件 | SHA-256 |
| --- | --- |
| `config.js` | `d0a03e5df3c5ce20fecf8c26e7ac0cd9c183e1078c12696ada353f2380e9cd42` |
| `logic.js` | `ca7fd5bb3b15c61d73a9e4be72f6b9b0e32d7facf12ba3b4047d7f1c1ae99a3e` |
| `logic.test.js` | `601366901aecff8a1831c24aabe8e62a7658e74637a13296e01934b2d34af970` |
| `ATTRIBUTION.md` | `72875306ba9be56c0715650f58f629bbf4677b28a8004d4c13cccaa1501695cc` |
| `283-dual-maze-race-research.md` | `63a7200cf8fd34222e1b0f84db9b3d8fc20c33edb5f8242a4c5fd9a58bc53f0f` |

## 9. bug 与 learn

既有坐标问题：

- `bugs/dual-maze-coordinate-transpose.md`

本轮新增并修复：

- `bugs/2026-07-25-dual-maze-validator-connectivity.md`
- `bugs/2026-07-25-dual-maze-proxy-second-read.md`
- `bugs/2026-07-25-dual-maze-hostile-passage-coercion.md`
- `bugs/2026-07-25-dual-maze-attribution-source-coverage.md`

新增跨项目沉淀：

- `learn/2026-07-25-tree-validation-needs-global-connectivity.md`

Proxy 二次观察继续引用既有：

- `learn/2026-07-23-single-observation-snapshot-boundary.md`

## 10. 未完成 Gate

`docs/297-dual-maze-race-design-proposal.md` 仍明确等待用户确认。当前没有：

- 生产 `index.html`、`styles.css`、`app.js`、favicon 或运行时资产；
- 键盘 code、联合 ghosting 检查与警告 UI；
- 双 Pointer、pointer cancel、触控区和真实双触点证据；
- RAF accumulator、hidden/blur/pagehide/stalled 的页面接线；
- 真实 DOM 焦点、live region、状态消息和按键等价入口；
- 1536/1440/1280/390/320 视口、200%/400%、reduced-motion、forced-colors、
  无 JavaScript或资源阻断验收；
- Chrome、真实 `file://` 四局、console 0、network 0 和 storage 0 证据；
- README、experience manifest、catalog、launcher、门户或分类索引登记。

本轮按授权明确不做浏览器验收，因为没有生产 UI 且用户尚未确认视觉提案。

结论保持：**非视觉核心可以继续使用；完整项目仍为 Conditional Go，尚未安装，
尚不能本地点开即玩。**
