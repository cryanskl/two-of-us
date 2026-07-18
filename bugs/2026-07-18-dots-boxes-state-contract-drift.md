# 这一格归谁：并行提交后主线程沿用旧状态规格

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：`experiences/versus/dots-and-boxes`
- 发现版本 / commit：`6f6a086`

## 环境

- 规格：`docs/70-dots-and-boxes-spec.md`；
- 最新规格提交：`0180462`；
- 状态引擎基线：`aeed5bb`；
- 验证：Node.js `node:test`。

## 复现步骤

1. 主线程读取一次规格并把十字段 `edges + moves:number` 记入上下文；
2. 并行执行链提交 `0180462`，把合同强化为 `moves[] + moveNumber`，并要求 `replayMoves()` 完整重放；
3. 主线程没有重新读取 HEAD 中的规格，看到新引擎后按旧快照将其“修复”回旧模型；
4. 比较 `git log`、当前规格与 `6f6a086`。

## 预期结果

并行提交发生后，进入实现、测试或 commit 前重新读取 HEAD 中的权威规格；主线程和子任务使用同一 commit 快照。

## 实际结果

主线程把正确的新模型误判为子任务漂移。`6f6a086` 的测试自身通过，但它验证的是已过期状态合同，没有满足最新规格要求的逐手 player 校验和完整重放一致性。

## 根因

压缩摘要和早先读取的文件是路由线索，不是并行 worktree 的实时真相。主线程只检查了 worktree diff，没有同时检查 `git log` 与规格文件的最新内容，因此错过了已经落在 HEAD 历史中的权威变更。

## 解决方案

- 以 `0180462` 后的 `docs/70-dots-and-boxes-spec.md` 为唯一合同；
- 恢复 `aeed5bb` 的 `moves[] / moveNumber / replayMoves()` 状态引擎；
- UI 只消费由 moves 派生、按棋盘顺序排列的 `view.edges`，不维护第二份规则真值；
- commit 前核对 `git log -n`、规格 blob 与待提交实现，不能只看测试是否全绿；
- 验证后用新的修复提交明确覆盖 `6f6a086`，不改写历史。

## 回归验证

- [x] 定向规则测试 17/17 通过；
- [x] 重放拒绝错误 player、重复边、终局追加与伪造派生字段；
- [x] 40 边终局、8–8 平局与 6–10 胜局通过；
- [x] 双格闭合只追加一个时间事件并加两分；
- [x] UI 的 `view.edges` 仍按 40 条规范边顺序派生；
- [x] `git diff --check` 与整仓测试通过。

## 相关提交

- `0180462 docs: harden dots and boxes state model`；
- `aeed5bb feat: add dots and boxes state engine`；
- `6f6a086 fix: align dots and boxes state contract`（过期规格修复，后续已纠正）。
