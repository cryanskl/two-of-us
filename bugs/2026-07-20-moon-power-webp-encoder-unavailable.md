# 月面供电视觉稿：本机无可用 WebP 编码器

- 日期：2026-07-20
- 阶段：视觉概念落库
- 影响：仅影响文档概念图压缩，不影响玩法或原始图片
- 状态：已绕过，运行资产优化留到实现阶段

## 现象

尝试把 ImageGen PNG 概念图转换为 WebP 时：

1. `cwebp` 不在当前 `PATH`，shell 返回 `command not found`；
2. macOS `sips -s format webp ...` 能识别格式名，但写入返回 `Can't write format: org.webmproject.webp`；
3. 两次失败均未产生半成品 WebP，背景 PNG 已正常复制。

## 原因边界

当前机器没有独立 `cwebp` CLI，系统 ImageIO 也没有向 `sips` 暴露 WebP 写入编码器。不能因为 `sips` 可以读取 WebP，就假设它也可以编码 WebP。

## 解决方案

- 设计证据直接保留 ImageGen 原始 PNG，确保像素不变且不为文档新增依赖；
- 用 `sips -g pixelWidth -g pixelHeight` 和 `file` 核对尺寸与格式；
- 三张概念图只由 Markdown 引用，运行页面不得加载；
- 实现阶段优先使用仓库既有、已验证的图像运行时导出轻量背景，再验证图片失败时的 CSS 降级。

## 可复用结论

在 macOS 上开始批量转换前，先分别探测“工具存在”和“目标格式可写”，不要把读格式支持当成写格式支持。文档图片压缩不是增加全局依赖的充分理由；只有运行体积达到验收风险时，才把编码器纳入统一依赖。
