# 软软相扑：色键脚本参数与 Python 环境不一致

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：软软相扑
- 发现版本 / commit：视觉资产提交前候选；修复随本次视觉资产部分进入

## 环境

- 操作系统：macOS
- 工具：ImageGen 色键源图、`remove_chroma_key.py`
- 启动等级与入口：不影响 A 级网页运行，只影响生产资产准备

## 复现步骤

1. 生成纯 `#ff00ff` 背景的 3×2 棋子图集。
2. 用 `--edge-contract 0.25` 调用色键脚本。
3. 改为整数后，直接用 shell 的 `python` 再调用一次。

## 预期结果

脚本生成保留布料边缘、背景透明的 RGBA PNG，网页运行时不需要 Python。

## 实际结果

第一次调用因 `edge-contract` 只接受整数而拒绝 `0.25`；第二次调用因 shell Python 未安装 Pillow 而退出。两次都没有生成透明目标文件。

## 根因

色键脚本把边缘收缩量定义为整数像素，而调用方误按羽化半径传了小数；仓库 shell 的默认 Python 也不是 Codex 工作区提供的统一图像运行时，因此找不到 Pillow。

## 解决方案

使用 `edge-contract=0`、`edge-feather=0.6`，并固定调用工作区 Python：

```text
/Users/zenith/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
```

输出 PNG 后以 Pillow 无损 WebP 保存为 `token-atlas.webp`。网页只加载 WebP，不把 Python 或 Pillow加入作品运行依赖。

## 回归验证

- [x] 色键脚本成功退出并写入目标文件
- [x] 1536 × 1024 输出保持 RGBA 透明通道
- [x] 原尺寸 `view_image` 未见整片洋红背景或明显缝线侵蚀
- [x] 运行目录只保留最终背景和最终透明图集

## 相关提交

- 视觉资产提交（本文件所在提交）
