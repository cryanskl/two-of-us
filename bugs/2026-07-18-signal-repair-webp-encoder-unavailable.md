# 把信号接回来：系统 FFmpeg 存在但缺少 WebP 编码器

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把信号接回来
- 发现版本 / commit：`17244f1 docs: plan signal repair manual` 之后的视觉资产工作区

## 环境

- macOS，Apple Silicon；
- `/opt/homebrew/bin/ffmpeg` 可执行；
- `/usr/bin/sips` 可执行；
- 系统 `python3` 未安装 Pillow；
- 输入：ImageGen 生成的 1536 × 1024 PNG；
- 目标：`experiences/co-op/signal-repair-manual/assets/signal-dust.webp`。

## 复现步骤

执行：

```bash
ffmpeg -hide_banner -loglevel error -y \
  -i signal-dust.png \
  -c:v libwebp -quality 82 -compression_level 6 \
  signal-dust.webp
```

再检查系统替代能力：

```bash
sips --formats
python3 -c 'import PIL'
```

## 预期结果

FFmpeg 将 PNG 转成真实 WebP；输出可被 `file` 识别，保留 1536 × 1024 尺寸并明显小于源文件。

## 实际结果

FFmpeg 立即失败：

```text
Unknown encoder 'libwebp'
Error selecting an encoder
```

没有留下输出文件。`sips --formats` 显示 WebP 只有读取能力，没有 `Writable`；系统 Python 抛出 `ModuleNotFoundError: No module named 'PIL'`。

## 根因

本机 FFmpeg 构建没有编入 `libwebp` encoder。`command -v ffmpeg` 只能证明命令存在，不能证明特定编码器可用。macOS ImageIO 在当前系统版本也只提供 WebP 解码，因此 `sips` 不能作为写入回退。

## 解决方案

1. 保留 ImageGen 原始 PNG，不删除或覆盖；
2. 使用仓库外的 `baoyu-compress-image` 技能脚本；
3. 该脚本通过临时 Bun/Sharp 能力以 quality 82 输出 WebP；
4. 不修改项目 `package.json`，不把 Sharp 变成浏览器运行依赖；
5. 用 `file`、尺寸和字节数检查真实产物。

实际命令：

将 `SKILL_ROOT` 指向本机已安装的 skill 根目录：

```bash
npx -y bun "${SKILL_ROOT}/baoyu-compress-image/scripts/main.ts" \
  signal-dust.png \
  --output experiences/co-op/signal-repair-manual/assets/signal-dust.webp \
  --format webp --quality 82 --keep --json
```

## 回归验证

- [x] 技能返回 compressor=`sharp` 且退出码为 0；
- [x] `file` 识别为 `RIFF ... Web/P image, VP8 encoding`；
- [x] 输出仍为 1536 × 1024；
- [x] 文件从 2,682,073 bytes 降至 144,098 bytes；
- [x] `view_image` 原生查看时构图、中央低对比和边缘轨道完整；
- [x] `package.json`、lockfile 与 Node 运行依赖未改变；
- [x] 全仓 465 项测试与仓库校验通过。

## 相关提交

- `7256124 design: define signal repair visuals`：提交已验证的最终 WebP 与概念资产；
- 本记录单独提交，便于后续按“FFmpeg 存在但编码器缺失”检索。
