# 爱心投石器：角度与力度滑块缺少可访问名称

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`heart-catapult`
- 发现版本 / commit：`04d903f` 提交前候选

## 环境

- 操作系统：macOS
- 浏览器与版本：Chrome MCP 当前连接版本
- 启动等级与入口：A；`experiences/versus/heart-catapult/index.html`

## 复现步骤

1. 进入任一玩家的秘密瞄准阶段；
2. 打开浏览器可访问树；
3. 查找两个 `slider`；
4. 检查它们的可访问名称。

## 预期结果

两个控件分别暴露为 `slider "角度"` 和 `slider "力度"`，并保留数值、最小值、
最大值与步长语义。

## 实际结果

候选界面在滑块附近显示了“角度”和“力度”，但这些文字没有与动态创建的 input
建立程序化关联，可访问树中的两个 slider 名称为空。

## 根因

渲染器把文字和值视为视觉布局元素，没有同步创建 `label[for]` 关系，也没有给
input 提供等价的可访问名称。

## 解决方案

为两个 range 分别设置稳定的 `aria-label="角度"` 与 `aria-label="力度"`；保持
DOM 顺序为 range 在前、微调按钮在后，使阶段标题后的第一次自然 Tab 进入角度
滑块。

## 回归验证

- [x] Chrome 可访问树显示 `slider "角度"`
- [x] Chrome 可访问树显示 `slider "力度"`
- [x] 从阶段标题按一次 Tab 进入角度 range
- [x] 两个 range 仍暴露正确的范围、当前值和步长
- [x] 最终只读复审确认无剩余 P0/P1/P2

## 相关提交

- `04d903f feat: add heart catapult interaction`
