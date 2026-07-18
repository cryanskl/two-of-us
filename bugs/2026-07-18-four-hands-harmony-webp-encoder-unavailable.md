# 这一拍，刚好和你：FFmpeg 可执行但没有 WebP 编码器

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：这一拍，刚好和你
- 发现版本 / commit：`85903b0 docs: plan four hands harmony` 之后的视觉资产阶段

## 环境

- macOS，Apple Silicon；
- `/opt/homebrew/bin/ffmpeg` 可执行；
- 系统 Python 3 没有 Pillow；
- `sips --formats` 将 WebP 列为只读；
- 输入：ImageGen 生成的 1504×1046 PNG，1,928,044 bytes；
- 目标：`experiences/co-op/four-hands-harmony/assets/harmony-table.webp`。

## 复现

```bash
ffmpeg -hide_banner -loglevel error -y \
  -i harmony-table.png \
  -c:v libwebp -quality 82 -compression_level 6 \
  experiences/co-op/four-hands-harmony/assets/harmony-table.webp
```

## 预期

FFmpeg 输出真实 WebP，保留 1504×1046 尺寸并明显小于源 PNG。

## 实际

命令立即失败且没有留下输出文件：

```text
Unknown encoder 'libwebp'
Error selecting an encoder
Error opening output file .../harmony-table.webp.
```

## 根因

当前 FFmpeg 构建没有编入 `libwebp` encoder。`command -v ffmpeg` 只能证明二进制存在，不能证明它支持目标编码器。当前系统的 `sips` 也不能写 WebP，系统 Python 则缺少 Pillow，因此这三条本机路径都不可用。

这是 [`2026-07-18-signal-repair-webp-encoder-unavailable.md`](./2026-07-18-signal-repair-webp-encoder-unavailable.md) 的同类环境根因，但本作独立复现并保留自己的输入、输出与回归证据。

## 修复

使用已安装 `baoyu-compress-image` 技能的临时 Bun/Sharp 回退，不修改项目依赖：

```bash
npx -y bun /Users/zenith/.agents/skills/baoyu-compress-image/scripts/main.ts \
  harmony-table.png \
  --output experiences/co-op/four-hands-harmony/assets/harmony-table.webp \
  --format webp --quality 82 --keep --json
```

源 PNG 留在 Codex 生成目录，不覆盖、不删除；项目只保存最终 WebP。

## 回归

- [x] 技能返回 `compressor: "sharp"`，退出码 0；
- [x] `file` 识别为 `RIFF ... Web/P image, VP8 encoding`；
- [x] 输出保留 1504×1046；
- [x] 体积从 1,928,044 bytes 降到 65,080 bytes；
- [x] `view_image` 原生检查中央留白、叶影、边缘薄荷/杏色织物与物件无明显压缩损伤；
- [x] `package.json` 与 lockfile 没有变化；
- [x] 作品运行时仍不依赖 Bun、Sharp、FFmpeg 或 Pillow。

## 预防

资产脚本在选择 FFmpeg 前应检查目标 encoder，而不是只检查命令存在。仓库中继续使用压缩技能作为制作期回退；不得为了单张背景把 Sharp 加入浏览器运行依赖。
