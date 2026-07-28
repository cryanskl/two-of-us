# 这一串，我还记得：系统 Python 缺 Pillow，图集去背无法启动

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：这一串，我还记得的生产图集
- 发现版本 / commit：视觉资产提交前候选；成品随 `2201058 design: freeze memory bid` 进入

## 环境

- 操作系统：macOS
- 工具：ImageGen skill 的 `remove_chroma_key.py`
- 启动等级与入口：开发期资产管线；不进入 A 级运行路径

## 复现步骤

1. 用 shell 默认的 `python3` 运行 `remove_chroma_key.py`。
2. 输入洋红底的 `design/memory-bid/keepsake-atlas-chroma-source.png`。
3. 选择 border 自动取色、soft matte、透明阈值 12、不透明阈值 220 与 despill。

## 预期结果

生成带真实 alpha 通道的 `experiences/versus/memory-bid/assets/keepsake-atlas.png`。

## 实际结果

脚本在处理前报出 `Pillow is required for chroma-key removal`；系统 Python 没有 Pillow，无法读取或写出图像。

## 根因

资产工具依赖 Pillow，但仓库的 A 级运行依赖刻意保持为零，shell 默认 Python 也没有开发期图像库。运行页面与生成资产是两条不同依赖链，不应为了修复一次性生产工具而把 Pillow 加进作品或根依赖。

## 解决方案

从 Codex workspace dependencies 读取已捆绑的 Python：

`<tool-runtime>/bin/python3`

用该解释器运行同一脚本和参数，成功生成 RGBA 图集。源图保留在 `design/memory-bid/`，运行时只加载处理后的 PNG；没有修改 `package.json`、lockfile 或用户安装流程。

## 回归验证

- [x] `sips` 确认生产 PNG 具有 alpha 通道
- [x] 浏览器中六个格位都显示去背旧物，没有洋红底块
- [x] 最终资产 SHA-256 为 `ff8ded1e60e8b96086995619afe5ded1e8eddba650817e8462f3a3fd6493fcb8`
- [x] A 级页面仍不依赖 Python、Pillow、服务或网络

## 相关提交

- `2201058 design: freeze memory bid`

## 2026-07-21 复现补记

“把七天，养成一朵花”的八阶段植物图集再次用 shell 默认 `python` 运行同一脚本，稳定复现 `Pillow is required for chroma-key removal`。沿用本记录方案，通过 `codex_app__load_workspace_dependencies` 取得捆绑解释器后成功生成 1774×887 RGBA 图集：四角 alpha 均为 0，SHA-256 为 `75409d8bb8d9b9f2a07409e6f228ce6fec324e6d913c77a215c4309f2a9c2316`。仓库 manifest、lockfile与 A 级运行路径均未增加 Python/Pillow。
