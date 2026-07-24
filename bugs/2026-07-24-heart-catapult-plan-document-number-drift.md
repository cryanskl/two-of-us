# 爱心投石器：计划中的裸文档编号未随路径一起迁移

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`heart-catapult`
- 发现版本 / commit：`8f93259`

## 环境

- 操作系统：macOS
- 运行时：Markdown 文档与 Git
- 启动等级与入口：A；问题位于实施计划，不影响已提交的纯逻辑

## 复现步骤

1. 打开 `docs/250-heart-catapult-plan.md`；
2. 搜索 `251-heart-catapult-design`，确认文件路径已迁移为
   `252-heart-catapult-design.md`；
3. 再搜索全部裸文本 `251`；
4. 观察视觉批次职责和第 7 节仍要求“实现 251”。

## 预期结果

调研增量占用 `docs/251` 后，爱心投石器设计文档及所有语义引用都应一致指向
`docs/252-heart-catapult-design.md`，最终验收一致指向
`docs/253-heart-catapult-verification.md`。

## 实际结果

第一次编号迁移只修改了四处完整文件名，没有修改两处省略文件名的裸编号，导致
同一份计划同时把设计真值称为 251 和 252。

## 根因

回归搜索只覆盖完整目标文件名，没有覆盖自然语言中的裸编号。编号在本仓库既是
路径的一部分，也是文档之间的语义引用；只验证路径模式不足以证明迁移完整。

## 解决方案

- 把两处“实现 251”改为“实现 252”；
- 用 `rg -n "251|252|253" docs/250-heart-catapult-plan.md` 复核所有编号语境；
- 保留第一次提交，不使用 `--amend`，让缺陷发现和修复历史可追溯。

## 回归验证

- [x] 设计路径只指向 `docs/252-heart-catapult-design.md`
- [x] 设计语义引用只使用 252
- [x] 最终验收路径只指向 `docs/253-heart-catapult-verification.md`
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过

## 相关提交

- `8f93259 docs: renumber heart catapult deliverables`
- 修复提交：本文件所在提交
