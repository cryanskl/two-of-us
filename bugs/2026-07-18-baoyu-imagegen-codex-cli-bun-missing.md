# baoyu-image-gen 的 codex-cli 后端在只有 npx 时因缺少 bun 失败

- 状态：`open`
- 日期：2026-07-18
- 影响范围：「把颜色调到一起」视觉概念与生产背景生成
- 不影响：作品 A 级运行时、纯逻辑、经典脚本与 CSS 回退

## 环境

- macOS；
- `codex` 已安装且可找到；
- `npx` 已安装；
- `bun` 不在 PATH；
- 工具：`/Users/zenith/.agents/skills/baoyu-image-gen/scripts/main.ts`。

## 复现

```bash
npx -y tsx /Users/zenith/.agents/skills/baoyu-image-gen/scripts/main.ts \
  --provider codex-cli \
  --quality 2k \
  --ar 3:2 \
  --image docs/assets/shared-color-studio/pigment-table-source.png \
  --prompt '<prompt>'
```

## 预期

`--provider codex-cli` 调用已登录的 Codex 原生图片后端，或在启动前明确报告所需本地运行时。

## 实际

命令进入三次重试，最终返回：

```text
Using codex-cli / codex-image-gen for single
[single] Attempt 1/3 failed, retrying...
[single] Attempt 2/3 failed, retrying...
spawn bun ENOENT
```

外层脚本可由 `npx tsx` 执行，但 codex-cli provider 内部仍硬编码启动 `bun`。所以“主脚本可运行”不等于“选定 provider 的子管线依赖完整”。

## 当前处理

1. 不为单个视觉切片安装新的全局 `bun`，避免把开发工具依赖混入作品交付依赖；
2. 概念和生产资产改用 Codex 当前原生图片后端；
3. 前端必须先有纯 CSS 深墨桌面与纸纹回退，图片只是可替换氛围层；
4. 生成图成功后仍需检查尺寸、通道、文字污染和无图降级。

## 上游修复建议

- provider 启动前运行 `command -v bun` 并立即返回结构化依赖错误；
- 或让 codex-cli provider 继承外层已选择的 TypeScript runner，支持 `npx tsx`；
- 对 `ENOENT` 不必重试三次，因为缺少可执行文件不会因重试恢复。

## 验证状态

- [x] 可稳定复现 `spawn bun ENOENT`；
- [x] 失败前未生成半成品图片；
- [x] 仓库运行依赖没有因此变更；
- [ ] 上游 provider 可在无 bun 环境早失败，或支持 npx/tsx。
