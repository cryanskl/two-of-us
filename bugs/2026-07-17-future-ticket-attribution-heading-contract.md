# Bug：未来车票来源声明标题未满足仓库机器 Gate

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：未来车票
- 发现版本 / commit：`b58b4d3` 后的实现阶段，修复包含于 `5393fd0`

## 环境

- 操作系统：macOS
- 检查器：`scripts/validate-repository.mjs`
- 启动等级与入口：A 级，`experiences/surprises/future-ticket/index.html`

## 复现步骤

1. 在作品 README 中使用 `## 来源` 标题并写入完整原创/生成资产声明；
2. 把作品加入 `experiences/catalog.json`；
3. 运行 `npm run verify`。

## 预期结果

来源内容完整时仓库验收通过，或检查器明确要求固定标题契约。

## 实际结果

验收失败并报告：`future-ticket 的 README 缺少“借鉴与来源声明”`。自然语言内容存在，但标题不是验证器识别的固定短语。

## 根因

仓库把 `借鉴与来源声明` 同时作为人类文档标题和机器可扫描标记。实现初版只满足语义内容，没有复用固定标题。

## 解决方案

把 README 标题从 `## 来源` 改为 `## 借鉴与来源声明`，正文和资产明细保持不变。

## 回归验证

- [x] `npm run verify` 通过：22 个作品入口、1 个能力声明
- [x] 作品 README 和资产 ATTRIBUTION 均可从入口追溯
- [x] 没有绕过或放宽仓库验证器

## 相关提交

- `5393fd0`：作品实现与来源标题契约修复
