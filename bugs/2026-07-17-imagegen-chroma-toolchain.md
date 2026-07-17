# ImageGen 图集去绿：系统 Python 缺 Pillow，FFmpeg 进程挂起

## 状态

已修复，2026-07-17。

## 复现条件

1. 对 `docs/assets/twin-light-maze/sprite-atlas-source.png` 运行内置 ImageGen skill 的 `remove_chroma_key.py`；
2. 当前系统 Python 报错 `Pillow is required for chroma-key removal`；
3. 尝试用 `/opt/homebrew/bin/ffmpeg` 的 `chromakey` 滤镜替代时，进程在读取 PNG 或打印版本阶段持续挂起，没有生成文件；
4. 工作区捆绑依赖探测超过两分钟仍没有结果，需要终止。

## 原因

仓库运行依赖本来不包含图像处理库；当前 shell 选中的 Jupyter Python 也没有 Pillow。Homebrew FFmpeg 在本机环境存在独立启动问题，不能作为可靠的一次性资产管线。直接把 Pillow 加进根 `package.json` 或作品依赖会把开发期工具误变成用户运行依赖。

## 解决方案

使用 `uv run --with pillow python <remove_chroma_key.py> ...` 创建缓存级临时 Python 环境，并在持久 PTY 会话等待首次下载完成。处理成功后得到 1448×1086 RGBA PNG：905024 个全透明像素、20136 个半透明像素。Pillow 没有写入仓库 manifest、lockfile 或 A 级运行路径。

原始绿色图集保留在 `docs/assets/` 作为可复核设计输入；页面只加载处理后的 `experiences/co-op/twin-light-maze/assets/sprite-atlas.png`。

## 回归验证

- [x] `sips` 确认最终 PNG 为 1448×1086 且 `hasAlpha: yes`
- [x] `view_image` 检查 4×3 图块边缘和内部材质没有明显绿色残边
- [x] 运行作品不需要 Python、Pillow、FFmpeg 或 uv
- [x] 根依赖清单与 lockfile 没有因资产处理改变

## 相关提交

- 见本次双光点归巢规格与视觉资产提交。
