# dual-maze-race 起终点坐标转置

## 状态

- 发现日期：2026-07-25
- 影响阶段：确定性迷宫 P4
- 当前处理：已修复；生产核心与 `docs/283–286` 均采用左中到右中坐标，并锁定转置反例
- 后续所有者：无

## 环境

- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/dual-maze-race-core`
- 分支：`codex/exp-dual-maze-race-core`
- 基线：`4c3c017008e9f4157886fe626d6f99240fe80c28`
- Node：仓库声明的 Node 18+ CommonJS 项目边界

## 复现

使用同一个生产 `createMaze()`，固定：

- `9 × 9`
- 邻居顺序 `up, right, down, left`
- 精确 `xorshift32`
- `nextUint32() % candidates.length`
- seed `0x434f5550` 与 `0x50414952`

只替换起终点坐标后运行生产 `analyzeMaze()`：

| 坐标 | COUP：路径 / 转弯 / 死胡同 | PAIR：路径 / 转弯 / 死胡同 |
| --- | --- | --- |
| `{row:0,col:4}` → `{row:8,col:4}` | 48 / 30 / 11 | 34 / 25 / 14 |
| `{row:4,col:0}` → `{row:4,col:8}` | 28 / 18 / 10 | 30 / 19 / 10 |

两组结果都通过 81 节点、80 无向边、全连通、无环、passage 双向和 fingerprint 自洽
检查。因此普通“迷宫可解”测试不会暴露问题。

## 预期

文档中的显式 `{row,col}` 坐标和同文档冻结的 seed 指标应描述同一张地图。

## 实际

- `docs/283-dual-maze-race-research.md:153` 写 `(0,4) → (8,4)`；
- `docs/284-dual-maze-race-brainstorm.md:118` 写 `(0,4) → (8,4)`；
- `docs/285-dual-maze-race-spec.md:61–62` 写
  `{row:0,col:4} → {row:8,col:4}`；
- 但 `docs/283:192–193`、`docs/284:129–130`、
  `docs/285:187–188` 和 `docs/286:89` 冻结的指标
  `28/18/10`、`30/19/10` 只由左中到右中坐标产生。

## 根因

调研阶段的临时模型按笛卡尔 `(x,y)` 理解 `(0,4) → (8,4)`，实现规格后来把同一数字
直接标成 `{row,col}`，导致行列语义转置。指标来自横向的左中到右中地图，显式 row/col
常量却变成纵向的上中到下中地图。

## 选择

经总控确认，本实现保留已经跨四份文档重复冻结的指标，生产常量采用：

```text
START = { row: 4, col: 0 }
GOAL  = { row: 4, col: 8 }
```

这也与并排双盘从左向右竞速的空间语义一致。本执行 Session 未修改未授权的
`docs/283–286`。

## 修复与回归

- `logic.js` 的生产常量使用 `{row:4,col:0} → {row:4,col:8}`；
- 两个完整 v1 fingerprint 已冻结；
- `logic.test.js` 锁定正确坐标和 `28/18/10`、`30/19/10`；
- 单独锁定转置反例 `48/30/11`、`34/25/14`；
- 两套坐标都继续跑结构校验，证明回归不是靠破坏迷宫得到。

验证：

```bash
node --test experiences/versus/dual-maze-race/logic.test.js
npm test
npm run verify
git diff --check
```

## 总控文档修复

总控保持冻结指标不变，已将以下坐标改为左中到右中：

- `docs/283-dual-maze-race-research.md:153`
- `docs/284-dual-maze-race-brainstorm.md:118`
- `docs/285-dual-maze-race-spec.md:61–62`

同时已复查这些文档中所有把 `(0,4) → (8,4)` 称为 `{row,col}` 的派生描述，并由
总控创建独立修复 commit。
