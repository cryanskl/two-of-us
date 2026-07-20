# 星座接线员：移动视觉顺序与 DOM/Tab 顺序相反

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把星光，一笔一笔交给你
- 发现版本 / commit：前端首次实现，提交前只读复审发现

## 环境

- 文件：`index.html`、`style.css`
- 视口：原 720px 以下移动布局
- 输入：键盘与屏幕阅读器

## 复现步骤

1. 原 DOM 把棋盘放在 `aside.control-rail` 之前；
2. 移动 CSS 用 `display: contents` 和 `order` 把 phase panel 视觉移到棋盘之前；
3. 在 intro 看见“开始接线”位于棋盘上方；
4. 按 Tab，焦点却先进入 DOM 中更早的星点。

## 预期结果

移动端视觉、DOM、读屏与 Tab 顺序一致：当前行动 → 棋盘 → 两席图例 → 日志。

## 实际结果

视觉先显示当前行动，但读屏和键盘先经过尚不可操作的星点，违反冻结规格的顺序一致性。

## 根因

核心交互顺序由 CSS 重排，真实 DOM 仍服务桌面布局；视觉修复没有同步语义顺序。

## 解决方案

- `workbench` 直属 DOM 改为 `phase-stack → board-panel → seat-legend → log-panel`；
- 桌面使用 grid area 把 board 放左侧、其余放右侧；
- 移动使用自然文档流，不再用 `order` 或 `display: contents` 反转核心内容。

## 回归验证

- [x] DOM 顺序与移动视觉顺序相同
- [x] intro 主动作先于九个星点进入 Tab 序列
- [x] 桌面仍为大棋盘左、控制栏右
- [x] 无 `display: contents` 或移动 `order` 依赖

## 相关提交

- 前端修复：`81c3428`
