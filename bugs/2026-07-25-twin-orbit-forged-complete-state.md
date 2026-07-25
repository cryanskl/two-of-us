# Bug：Twin Orbit 接受没有最终穿门证据的 complete state

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`e539ca3991b20afa2139c495e5969ad6bbe41218`

## 复现

1. 从 canonical intro 复制 exact state schema；
2. 把 `phase` 改成 `complete`、`gateIndex` 改成 4；
3. 把 `completedGateIds` 填成五个固定关卡 ID；
4. 保持 `tick=0`，两席仍在第五关起点，`crossed=false`；
5. 调用 `getPublicView()` 或 dispatch `RESTART`。

修复前该对象被当成合法 complete：公开视图直接进入完成态，`RESTART` 也被接受。

## 预期

`complete` 只能从第五关已经确认的 `gate-success` 进入。外部 state 必须同时保留：

- 两席在同一个 tick 穿门；
- tick 位于共同窗口；
- 两席 lane 与各自目标 lane 相同；
- 当前角度确实能由本 tick 的 `+2` 或 `+3` 半开区间穿越得到；
- 五个完成 ID 构成完整固定前缀。

缺少任一终态证据都应视为畸形外部 state，并安全回到 canonical intro。

## 根因

`snapshotState()` 对 `gate-success` 检查了双门证据，但 `complete` 分支只验证最终
关卡索引、五个 completed ID 和空 retry reason。阶段转换虽然会保留上一关成功
快照，外部调用者却能绕过 reducer 直接伪造 complete。

## 修复

- 抽取 `hasConfirmedCrossing()`，共同验证 `gate-success` 与 `complete`；
- 从 lane 推导本 tick 速度，反推出 previous angle，再用既有
  `(previous, next]` 判定确认目标确实被穿越；
- 允许成功后 SUSPEND 清除 `held`，但不允许 `held=true` 与 outer lane 矛盾；
- 新增红灯回归，确认 `tick=0` 的伪造 complete 被拒绝，而真实五关完成路径仍
  由 solver 测试覆盖。

## 验证

- 修复前：23 项 logic 测试中 1 项失败；
- 修复后：项目 logic、solver、静态合同测试全部通过；
- `git diff --check` 与仓库验证通过。
