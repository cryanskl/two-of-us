# capsule-docking 复用 pointerId 时迟到 lost capture 误释放

- 发现日期：2026-07-25
- 环境：Chrome 1280×800，连续使用鼠标长按“主推”后立即长按“反推”
- 影响：反推按钮偶发已经产生 `pointerdown`，却马上被上一按钮迟到的
  `lostpointercapture` 结束；舱体继续保持正向高速，最终撞上接口后墙。

## 复现

1. 进入第一段 approaching；
2. 用拖动手势长按主推，使舱体获得较高正向速度；
3. 主推释放后立即在反推按钮开始新的拖动；
4. Chrome 为 mouse 复用同一个 `pointerId`，旧按钮的
   `lostpointercapture` 可能在新 session 建立后才送达；
5. 旧事件按 `pointerId` 命中新 session，错误派发 RELEASE。

## 根因

输入层只用 `pointerId` 查找当前 session，没有同时验证事件发生时间和
`lostpointercapture` 的目标按钮。`pointerId` 是可复用标识，不能单独承担跨 session
所有权。

## 修复

- 每个 pointer session 记录 `startedAt = pointerdown.timeStamp`；
- 结束器拒绝早于当前 session 的事件；
- `lostpointercapture` 还必须来自当前 session 的按钮；
- 原有 input epoch、原子删除与来源 `1→0` RELEASE 规则保持不变。

## 回归

- 项目 UI 契约新增 startedAt、时间比较和 target 归属断言；
- Chrome 中重新执行主推 → 反推连续长按，反推速度明确生效；
- `pointerup`、`pointercancel` 与当前按钮的 `lostpointercapture` 仍走同一结束器。
