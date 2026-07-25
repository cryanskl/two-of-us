# Bug：Twin Orbit 接受当前 tick 不可能到达的玩家角度

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`e539ca3991b20afa2139c495e5969ad6bbe41218`

## 复现

从第 1 关 canonical playing state 构造 exact 外部对象：

```text
tick = 1
left.angle = 500
left.lane = outer
right.angle = 322
right.lane = outer
```

左星从起点 40 在一个 tick 内只能到 42 或 43，不可能到 500。修复前 validator
只确认角度位于 `0..719`，因此 public view 仍显示 playing，后续 TICK 也会从
这个瞬移位置继续计算。

## 预期

在第 `t` 个 tick，每席从当前关固定起点累计前进距离必须位于：

```text
2t <= distance <= 3t
```

五关最大检查 tick 不超过 86，因此最大距离 258，小于 720；环形
`forwardDistance(start, angle)` 在该范围内没有整圈歧义。

## 根因

state validator 验证了角度值域、阶段、窗口和玩家字段，却没有把 angle 重新绑定
到固定起点、tick 与两档整数速度。

## 修复

- 新增 `isReachableAtTick()`；
- 对左右席在所有阶段统一验证从当前关起点的累计距离上下界；
- 保留真实 outer/inner 混合路线、第五关跨 719→0 和成功后 SUSPEND；
- 新增 `tick=1 / angle=500` 红灯回归。

## 验证

- 修复前：25 项 logic 测试中 1 项失败；
- 修复后：logic、solver、静态合同测试全部通过；
- 五关 fixture、窗口边界、批处理与 JSON replay 均保持通过；
- 全仓测试、仓库验证与 `git diff --check` 通过。
