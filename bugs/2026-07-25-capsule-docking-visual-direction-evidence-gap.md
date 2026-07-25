# Bug：太空舱对接看板声称存在三个视觉方向，但仓库没有可审阅预览

- 状态：`fixed`
- 日期：2026-07-25
- 影响项目：`capsule-docking`
- 发现版本 / commit：`0f95f8c`

## 环境

- 范围：`docs/orchestration-board.md`、`docs/208-capsule-docking-imagegen-brief.md` 与 `docs/assets/`
- 浏览器与版本：不涉及；这是仓库证据一致性问题
- 启动等级与入口：尚未安装，生产 UI 仍处于视觉确认 Gate

## 复现步骤

1. 阅读 Board 的 `capsule-docking` Blocked 行。
2. 按“从总控生成的三个视觉方向中选择”查找对应预览。
3. 检查 `docs/208-capsule-docking-imagegen-brief.md` 和 `docs/assets/capsule-docking/`。

## 预期结果

Board 只能要求用户确认真实存在、可点击且已登记的 active 概念稿；如果只有生成简报，应明确写为“尚无预览，先生成候选”。

## 实际结果

- Board 声称已有三个视觉方向可选；
- `docs/208-capsule-docking-imagegen-brief.md` 明确写明尚未生成概念；
- `docs/assets/capsule-docking/` 与 `GENERATION.md` 均不存在。

因此用户无法完成 Board 所要求的选择，任何“确认”都缺少视觉证据。

## 根因

早期调度文案把“未来准备比较的方向”写成“已经生成的方向”，后续没有用磁盘资产和生成台账反向校验动态 Board。

## 解决方案

1. 在 `docs/365-visual-approval-digest.md` 中把本项标为无预览、不可批准；
2. 修正 Board：先生成可审阅候选、生成台账和 active 清单，再请求用户确认；
3. 后续视觉摘要必须检查每个预览链接存在，并排除 superseded / draft 资产。

## 回归验证

- [x] `docs/365-visual-approval-digest.md` 明确写明本项当前不可批准
- [x] 摘要中的 122 个本地证据链接全部存在
- [x] Board 不再声称仓库已有三个可选方向
- [x] `npm run verify` 通过
- [ ] 新候选生成后补 `GENERATION.md`、active 预览和用户明确确认

## 借鉴与来源声明

本记录只核对 Two of Us 仓库内部 Board、ImageGen 简报和资产目录，没有参考、复制或改写第三方开源代码、视觉、文案或素材。

## 相关提交

- `0f95f8c`：加入 21 项视觉确认摘要并暴露证据差异
- 本记录与 Board 修正在同一后续提交中完成
