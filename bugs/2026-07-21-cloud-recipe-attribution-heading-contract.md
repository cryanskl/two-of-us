# 这一场雨，我们一起接：来源声明标题未满足仓库机器 Gate

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：这一场雨，我们一起接
- 发现版本 / commit：`37d5fad`

## 环境

- macOS；`npm run verify` 的 `scripts/validate-repository.mjs`
- 启动等级与入口：A；catalog 接入前静态审计

## 复现步骤

1. 打开作品 README；
2. 观察来源段标题为 `## 借鉴声明`；
3. 把作品加入 `experiences/catalog.json` 后运行统一验证。

## 预期结果

README 使用仓库 Gate 约定的精确标题 `## 借鉴与来源声明`，目录接入后验证通过。

## 实际结果

声明正文完整，但标题少了“与来源”，机器校验会报告缺少借鉴声明。

## 根因

前端文档沿用了自然语言短标题，没有对齐 `validate-repository.mjs` 的精确字符串协议。

## 解决方案

只把标题改为 `## 借鉴与来源声明`；完整来源表仍留在 `ATTRIBUTION.md`，README 保留机制研究与零复制摘要。

## 回归验证

- [x] README 精确标题存在
- [x] 声明正文与 ATTRIBUTION 链接保留
- [x] 目录接入后 `npm run verify` 通过
- [x] 全仓测试通过

## 相关提交

- 本次来源标题修复提交
