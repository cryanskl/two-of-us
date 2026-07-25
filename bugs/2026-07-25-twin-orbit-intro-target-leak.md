# Bug：Twin Orbit intro public view 提前公开第 1 关目标

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`e539ca3991b20afa2139c495e5969ad6bbe41218`

## 复现

对 `createInitialState()` 调用 `getPublicView()`。修复前，虽然 `gate` 为 `null`，
两项 player DTO 仍分别公开：

```text
left.targetAngle  = 180
left.targetLane   = outer
right.targetAngle = 470
right.targetLane  = inner
```

complete view 同样继续携带第五关目标字段。

## 预期

视觉提案冻结的阶段边界要求 intro 不显示第 1 关完整目标角度；玩家主动 `START`
进入 `gate-intro` 后，才公开当前关两扇门。complete 也不需要继续携带最后一关
目标字段。

public DTO 可以保持固定键，但 intro / complete 的 `targetAngle` 与
`targetLane` 应为 `null`。

## 根因

`getPublicView()` 已用 `showGate` 隐藏顶层 gate DTO，却无条件从当前
`gateIndex` 填充 player 的目标字段。顶层阶段门控没有同步应用到嵌套 player。

## 修复

- player 目标字段统一受 `showGate` 控制；
- intro / complete 使用 `null`，关系文本改为阶段级中性说明；
- 更新规格明确 nullable 阶段合同；
- logic 与完整五关 solver 回归分别固定 intro 和 complete。

## 验证

- 修复前：logic 与 solver 各有 1 项红灯；
- 修复后：项目 logic、solver、静态合同测试全部通过；
- intro 不再公开第 1 关目标，gate-intro/playing/success/retry 仍公开当前关；
- `git diff --check` 与仓库验证通过。
