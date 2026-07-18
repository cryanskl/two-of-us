# 这一格归谁：规则实现把整数步数改成时间事件数组

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：`experiences/versus/dots-and-boxes`
- 发现版本 / commit：`4ded99f`

## 环境

- 规格：`docs/70-dots-and-boxes-spec.md`；
- 规则实现：经典脚本 `logic.js`；
- 验证：Node.js `node:test`。

## 复现步骤

1. 读取规格冻结的十个公开状态字段；
2. 创建初态并检查 `Object.keys(state)`；
3. 落下一条边后检查 `state.moves`、`state.edges` 和测试 fixture。

## 预期结果

- `edges` 是按 `getAllEdgeIds()` 排序的 `[{ id, owner }]`；
- `moves` 是等于 `edges.length` 的非负整数；
- 状态不暴露额外回放字段。

## 实际结果

并行规则实现把 `moves` 改成按时间排列的 `[{ edgeId, player }]`，新增 `moveNumber`，并删除公开 `edges`；测试也跟着新结构改写，因此 16 项测试仍全部通过，但实现已经偏离冻结合同。

## 根因

子任务在 commit 暂存窗口继续写入另一版事件溯源设计，主线程的测试与 `git add` 分别观察到了不同文件快照。功能表面仍可运行，且实现和测试同步漂移，使普通测试通过不足以暴露问题。

## 解决方案

- 恢复精确十字段公开状态；
- 以规范物理边 `edges` 作为唯一边真值，`moves` 恢复为整数；
- `claimEdge` 只从规范边集合检查相邻格，不把时间事件暴露进状态；
- 重写测试，显式断言精确键、整数步数、规范排序边、双格只新增一边和一笔；
- commit 前同时比较 worktree blob 与暂存 blob，避免并行写入跨过暂存边界。

## 回归验证

- [x] 定向规则测试 16/16 通过；
- [x] 40 边终局、8–8 平局与 6–10 胜局通过；
- [x] 双格闭合只增加一条边、一步和两分；
- [x] 畸形状态回到安全初态；
- [x] `git diff --check` 通过。

## 相关提交

- 修复提交见本文件进入仓库的 commit。
