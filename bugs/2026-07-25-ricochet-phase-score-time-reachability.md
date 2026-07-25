# 这一弹，拐弯见你：phase、比分、时间和终局结果可组合成不可达状态

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`ricochet-tank-duel`
- 发现版本 / commit：`a68e54d`

## 环境

- 操作系统：macOS
- 运行时：Node.js 22，纯 CommonJS 核心测试
- 启动等级与入口：A；问题位于共享于浏览器与 Node 的 `js/simulation.js`

## 复现步骤

分别构造以下 exact-key 状态并调用 `validateState`：

1. `playing` 且 `activeMatchTicks = MATCH_ACTIVE_TICKS`；
2. `playing` 且 `scores = [TARGET_SCORE, 0]`；
3. `round-result`、`scores = [3, 0]`，但 `pendingMatchResult = "right"`；
4. `match-result`、`scores = [3, 0]`，但 `matchResult = "right"`。

第一个状态被接受后，再调用一次 `simulatePlayingTick`。

## 预期结果

validator 应只接受 reducer 可生成的组合：

- `instructions` 保持唯一初始逻辑状态；
- `countdown`、`playing`、`paused` 尚未达到目标分或时间上限；
- `round-result` 是否需要 pending 由目标分 / 时间上限唯一决定；
- pending 与终局结果都必须等于最终比分派生的 `left`、`right` 或 `draw`；
- `match-result` 必须有目标分或时间上限作为终局理由。

## 实际结果

四个状态都被 validator 接受。前三个结果字段或 phase 与比分 / 时间矛盾；第四个
可以直接伪造赢家。时间已满的 `playing` 状态继续推进时还会抛出：

```text
RangeError: activeMatchTicks out of range
```

## 根因

上一轮 hardening 已把 pending/result 限定到正确 phase，但仍只验证了字段“出现的
位置”，没有验证 phase 是否已经终局、pending 是否应该存在、以及结果值是否能从
最终比分重新派生。`activeMatchTicks` 和 `scores` 的局部值域因此仍可组成状态机
永远不会生成的联合状态。

## 解决方案

- 把目标分和时间上限统一计算为 `terminalReason`；
- 非终局 phase 严拒已经达到目标分或时间上限；
- `round-result` 对 pending 执行“终局时必须有、非终局时必须无”；
- pending 和 match result 都与 `matchResultFor(scores)` 严格相等；
- `match-result` 必须具有目标分或时间上限理由；
- `instructions` 校验出生点、比分、时间、弹体、ID、回合与事件的完整初态合同；
- 保留回合间 countdown 和暂停恢复 countdown 的比分、时间、历史与弹体状态。

## 回归验证

- [x] 四个原始伪造状态均在 validator 边界被拒绝
- [x] `playing` 的最后一个合法 tick 与 2–2 比分仍被接受
- [x] 回合间 countdown 与非终局 round-result 仍被接受
- [x] 目标分 / 时间上限 round-result 的正确 pending 被接受
- [x] 目标分终局与时间平局的正确结果被接受
- [x] 暂停恢复保留弹体测试继续通过
- [x] 定向测试、全仓测试与仓库验收通过

## 相关提交

- 本修复提交
