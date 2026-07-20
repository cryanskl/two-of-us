# 月面供电：手动暂停缺少权威 pauseReason

- 日期：2026-07-20
- 阶段：逻辑实现前审查
- 影响：手动暂停无法生成通过 `isPowerState` 的合法 paused 状态
- 状态：已修正规格与计划

## 现象

`142-moon-base-power-spec.md` 的状态 schema 和交叉不变量只允许 `hidden / blur / long-frame`，但同一规格的静态/浏览器验收要求在 operating 中支持手动暂停。`144-moon-base-power-plan.md` 的测试 Gate 还误用了其他作品的 `stalled` 术语。

如果实现严格遵守原枚举，`pause(state, "manual")` 只能失败；如果把手动暂停伪装成其他原因，public view、播报和 replay 会失真。

## 解决方案

- 权威 `pauseReason` 增加 `manual`；
- `pause(state, reason)` 只接受 `manual / hidden / blur / long-frame`；
- 计划中的 `stalled` 改为 `long-frame`；
- UI 的暂停按钮派发 `manual`，长帧保护派发 `long-frame`，不做别名转换。

## 可复用结论

阶段状态的原因枚举必须覆盖所有公开入口：用户动作、浏览器生命周期和时间保护应使用不同的可观察值。复制相邻作品的测试清单时，要重新核对本作品冻结术语，避免把 `stalled`、`long-frame` 等近义名称混入同一协议。
