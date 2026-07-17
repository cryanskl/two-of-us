# 照片拼图：新候选校验失败时旧候选 URL 延迟释放

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：`experiences/surprises/photo-swap-puzzle/app.js`

## 复现条件

1. 选择一个 MIME 合法、正在异步解码的候选文件；
2. 在解码完成前立即再选择一个 MIME 不支持的文件；
3. 包裹 `URL.createObjectURL` 与 `URL.revokeObjectURL` 计数；
4. 第二次选择完成后观察：已创建 1 个候选 URL，但撤销数仍为 0。

Chrome 本地 QA 使用页面内临时 `File` 触发相同 `change` 事件，稳定观察到 `created: 1, revoked: 0`。旧任务最终回调时会释放 URL，因此它不是永久泄漏；但解码慢、连续误选或大文件场景会让已经过期的私人候选继续占用内存。

## 根因

每次选图会递增 `operationToken`，所以旧任务不能提交结果；但元数据校验失败会提前返回，没有主动撤销前一任务仍持有的原始候选 URL。逻辑过期与资源释放是两个独立责任，token 不能代替 `URL.revokeObjectURL`。

## 修复

新一轮 `preparePhoto` 在递增 token 后立即调用 `releaseAllOriginals()`。这样无论新文件稍后通过、失败或被清除，上一轮候选都在任务失效时同步释放。旧解码回调再次调用释放函数是幂等的，不会影响当前有效派生图。

## 回归验证

- 同样的连续选择场景应立即得到 `created: 1, revoked: 1`；
- 合法新图仍需等解码与 Canvas 输出成功后才替换当前拼图；
- 非法新图仍保留当前有效拼图；
- 清除后原始候选集合与活动派生 URL 均为空。
