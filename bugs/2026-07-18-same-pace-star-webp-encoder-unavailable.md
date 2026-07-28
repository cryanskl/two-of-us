# 慢一点，也和你一起：FFmpeg 可执行但没有 WebP 编码器

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：慢一点，也和你一起
- 发现版本 / commit：`e831d5b docs: plan same pace star implementation` 之后的视觉资产阶段

## 环境

- macOS，Apple Silicon；
- `/opt/homebrew/bin/ffmpeg` 可执行；
- Codex 工作区 Python 提供 Pillow 且 `features.check("webp") === true`；
- 输入：ImageGen 生成的 1717×916 PNG；
- 目标：`experiences/co-op/same-pace-star/assets/quiet-sky.webp`。

## 复现

```bash
ffmpeg -hide_banner -loglevel error -y \
  -i quiet-sky.png \
  -c:v libwebp -quality 82 -compression_level 6 \
  experiences/co-op/same-pace-star/assets/quiet-sky.webp
```

## 预期

FFmpeg 输出真实 WebP，保留 1717×916 尺寸并明显小于源 PNG。

## 实际

命令立即失败且没有留下可用输出文件：

```text
Unknown encoder 'libwebp'
Error selecting an encoder
Error opening output file .../quiet-sky.webp.
```

## 根因

当前 FFmpeg 构建没有编入 `libwebp` encoder。`command -v ffmpeg` 只能证明二进制存在，不能证明它支持目标编码器。

这是 [`2026-07-18-four-hands-harmony-webp-encoder-unavailable.md`](./2026-07-18-four-hands-harmony-webp-encoder-unavailable.md) 的同类环境根因，但本次作品独立复现，并使用工作区自带 Pillow 作为不修改项目依赖的新回退路径。

## 修复

先加载 Codex 工作区依赖并确认 Pillow 的 WebP 能力，再用制作期 Python 转换：

将 `TOOL_RUNTIME` 指向工作区依赖提供的运行时根目录：

```bash
"${TOOL_RUNTIME}/bin/python3" \
  -c "from PIL import Image; src=Image.open('quiet-sky.png'); src.save('experiences/co-op/same-pace-star/assets/quiet-sky.webp', 'WEBP', quality=82, method=6)"
```

源 PNG 留在 Codex 生成目录，不覆盖、不删除；项目只保存最终 WebP。

## 回归

- [x] `file` 识别输出为 `RIFF ... Web/P image, VP8 encoding`；
- [x] 输出保留 1717×916；
- [x] 输出体积为 184KB；
- [x] `view_image(detail=original)` 检查中央低细节留白、靛蓝纸纹、边缘暖金星点与淡圆轨无明显压缩损伤；
- [x] `package.json` 与 lockfile 没有变化；
- [x] 作品运行时不依赖 Python、Pillow、FFmpeg 或 Codex 工作区依赖。

## 预防

选择 FFmpeg 路径前先运行 `ffmpeg -encoders | rg 'libwebp'`；缺失时直接使用已核验的制作期回退，不先创建目标文件。不得为了单张背景把 Pillow、Sharp 或 WebP encoder 加入作品运行依赖。
