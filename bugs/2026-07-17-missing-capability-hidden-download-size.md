# 缺失能力状态隐藏模型体积

- 状态：`fixed`
- 发现日期：2026-07-17
- 影响范围：D 级能力前置页

## 复现

当 `speech-whisper-base` 未安装时，请求 `/api/capabilities`。初版公开 DTO 只在状态为 `available` 时返回 artifact 数组，因此缺失页无法展示即将下载的模型体积。

## 根因

实现把“可以取得 artifact 的本地 URL”和“可以公开 artifact 的安全元数据”绑定成同一条件。模型尚未安装时确实不能提供文件，但 manifest 中的 ID 与字节数仍然是安装前必须展示的信息。

## 修复

公开 DTO 在 manifest 合法时始终返回 artifact 的 `id` 与 `bytes`；只有能力完整可用时才生成 `href`，否则明确返回 `null`。

## 验证

- missing 状态仍能读取 `147951465` 字节安装预算。
- missing 状态的 artifact `href` 为 `null`。
- 直接请求 artifact 返回 `409`，不会输出模型字节。

