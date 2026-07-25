# dual-maze-race validator 未证明全图连通

## 状态

- 发现日期：2026-07-25
- 影响范围：`validateMaze()` 公共诊断 API
- 当前处理：已修复并锁定断开环岛反例

## 现象

旧 validator 只检查：

1. 起点到终点存在路径；
2. 无向边数等于 `nodeCount - 1`。

这两个条件不能共同证明整张图是一棵树。以下 3×3 DTO 由两个分量组成：起点与
终点在一个二节点树中，另外七个节点形成带一条环的连通分量。总边数仍是 8，
fingerprint 也自洽：

```js
{
  rows: 3,
  cols: 3,
  start: { row: 0, col: 0 },
  goal: { row: 0, col: 1 },
  seed: 1,
  passages: [2, 8, 4, 6, 10, 13, 3, 10, 9],
  fingerprint: "v1|3x3|0|1|00000001|020804060a0d030a09"
}
```

旧实现错误返回：

```text
{ valid: true, errors: [], nodeCount: 9, edgeCount: 8 }
```

## 根因

“指定两点可达”是局部性质。断开的其他分量可以用额外环边补齐全图边数，使
`E = V - 1` 仍成立。只有“全体节点连通”与 `E = V - 1` 结合，才能证明无向图
是一棵树。

## 修复

`validateMaze()` 现在从起点遍历 passage 图并统计所有可达节点。只要
`reachableCount !== nodeCount` 就记录 `unreachable`，不再只检查起点到终点。

回归测试同时锁定：

- 反例的起终点仍可达；
- nodeCount 仍为 9；
- edgeCount 仍为 8；
- validator 必须返回 invalid 且包含 `unreachable`。
