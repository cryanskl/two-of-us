# 稳稳地，和你一起向前：FFmpeg 可执行但没有 WebP 编码器

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：稳稳地，和你一起向前
- 发现版本 / commit：`8330919 docs: plan steady together` 之后的视觉资产阶段

## 环境

- macOS，Apple Silicon；
- `/opt/homebrew/bin/ffmpeg` 可执行，但没有 `libwebp` encoder；
- Codex 工作区 Python 提供 Pillow 且 `features.check("webp") === true`；
- 输入：ImageGen 生成的 1536×1024 PNG；
- 目标：`experiences/co-op/steady-together/assets/balance-journey.webp`。

## 复现

```bash
ffmpeg -hide_banner -loglevel error \
  -i balance-journey.png \
  -c:v libwebp -quality 86 -compression_level 6 \
  experiences/co-op/steady-together/assets/balance-journey.webp
```

## 预期与实际

预期输出真实 WebP。实际命令立即失败且没有留下目标文件：

```text
Unknown encoder 'libwebp'
Error selecting an encoder
Error opening output file .../balance-journey.webp.
```

## 根因

当前 FFmpeg 构建没有编入 `libwebp`。`which ffmpeg` 只能证明二进制存在，不能证明目标编码器可用。这与仓库此前的 ImageGen 背景转换问题是同类环境根因，本作品独立复现。

## 修复

加载 Codex 工作区依赖，确认 Pillow 的 WebP 能力后，用制作期 Python 转换：

将 `TOOL_RUNTIME` 指向工作区依赖提供的运行时根目录：

```bash
"${TOOL_RUNTIME}/bin/python3" \
  -c "from PIL import Image; src=Image.open('balance-journey.png'); src.save('experiences/co-op/steady-together/assets/balance-journey.webp', 'WEBP', quality=86, method=6)"
```

源 PNG 保留在 Codex 生成目录；仓库只保存最终 WebP。作品运行时不依赖 Python、Pillow 或 FFmpeg。

## 回归

- [x] Pillow 报告 `features.check("webp") === true`；
- [x] `file` 将输出识别为 WebP；
- [x] 输出保留 1536×1024；
- [x] `view_image(detail=original)` 检查背景留白、路径、双灯和纸纹没有明显损伤；
- [x] `package.json` 与 lockfile 不变。

## 预防

资产转换前先执行 `ffmpeg -encoders | rg 'libwebp'`。缺失时直接使用已核验的制作期 Pillow 回退，不为了单张背景增加项目运行依赖，也不假定系统中同名工具具有相同 codec 能力。
