# Bug：Twin Orbit 接受与穿门快照矛盾的 gate-retry state

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`e539ca3991b20afa2139c495e5969ad6bbe41218`

## 复现

从第 1 关 canonical playing state 构造 exact 外部对象：

```text
phase = gate-retry
tick = 1
retryReason = window-closed
left/right crossed = false
left/right angle = 各自在 outer 前进一个 tick 后的位置
```

共同窗口实际是 58–62 tick，但修复前该状态仍被接受；public view 会在第 1 tick
显示“开门已经合上”，`RETRY_GATE` 也可以继续推进。

## 预期

gate-retry 的状态与原因必须对应 reducer 的固定裁决：

- `wrong-lane`：窗口内双方同 tick 穿门，但至少一席目标 lane 错误；
- `not-together`：窗口内恰有一席穿门；
- `too-early`：窗口开始前至少一席穿门；
- `window-closed`：窗口末 tick 双方均未穿门。

每席的 `crossed/crossingTick` 还必须与当前 angle、lane 所反推的
`(previous, next]` 穿越结果一致。

## 根因

`snapshotState()` 对 gate-retry 只验证 `retryReason !== null` 与 `tick >= 1`，
没有把公开原因重新绑定到权威双席穿越快照和窗口边界。

## 修复

- 抽取 `crossingProjectionMatches()`，用 lane 推导 `+2/+3`，反推上一角度并
  校验本 tick 穿越投影；
- 新增 `hasValidRetrySnapshot()` 固定四种失败原因的互斥谓词；
- 拒绝超过窗口末端、原因错配或 crossing 字段矛盾的外部 retry state；
- 保留真实 reducer 产生的早到、单边、错半径和关窗状态。

## 验证

- 修复前：24 项 logic 测试中 1 项失败；
- 修复后：logic、solver、静态合同测试全部通过；
- 全仓测试、仓库验证与 `git diff --check` 通过。
