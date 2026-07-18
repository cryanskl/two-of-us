# 光轨围猎：来源声明标题未满足仓库机器 Gate

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：光轨围猎 catalog 接入与仓库验收
- 发现版本 / commit：`f87914a`

## 环境

- Node.js 18+；
- 仓库 `shared/runtime/catalog.test.js` 与 `scripts/validate-repository.mjs`；
- A 级作品 `experiences/versus/light-trail-hunt/README.md`。

## 复现步骤

1. 把光轨围猎加入 `experiences/catalog.json`；
2. 运行 `node --test shared/runtime/catalog.test.js`；
3. 或运行 `npm run verify`。

## 预期结果

作品 README 的来源说明被目录测试与仓库验收器识别，catalog 接入通过。

## 实际结果

README 使用标题“借鉴声明”，而仓库机器 Gate 精确查找“借鉴与来源声明”。目录定向测试 49 项中 1 项失败；若继续运行仓库验收，也会报告该作品缺少规定标题。

## 根因

前端作品说明遵循了人类可读的简写标题，但没有复用仓库验收器要求的固定机器契约。作品未进入 catalog 时验收器不会读取该 README，因此问题直到目录接入才出现。

## 解决方案

把 README 二级标题改为“借鉴与来源声明”。完整固定提交、许可证、作者与零复制范围仍保留在同目录 `ATTRIBUTION.md`，无需改变声明内容。

## 回归验证

- [x] `node --test shared/runtime/catalog.test.js` 通过；
- [x] `npm run verify` 识别新入口和来源声明；
- [x] 没有放宽机器 Gate 或改写其他作品标题。

## 相关提交

- 本记录与标题修复所在 `fix:` 提交。
