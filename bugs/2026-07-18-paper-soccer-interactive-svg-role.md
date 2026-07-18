# 纸上球局：整张 SVG 的图片角色隐藏了合法落点按钮

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：纸上球局棋盘的屏幕阅读器与键盘语义
- 发现版本 / commit：功能提交前工作区

## 环境

- macOS 26.5.2；headed Chromium 150.0.7871.125；
- 入口：`http://127.0.0.1:8769/experiences/versus/paper-soccer/index.html`。

## 复现步骤

1. 以 `role="img"` 渲染棋盘 SVG；
2. 开球，生成 8 个带 `role="button"` 和 `tabindex="0"` 的合法落点 `<g>`；
3. 获取浏览器 accessibility snapshot。

## 预期结果

棋盘有整体标题和描述，同时 8 个合法落点分别暴露为可聚焦按钮。

## 实际结果

DOM 中存在 8 个合法落点，但 accessibility tree 把整张 SVG 当成一个原子图片，内部按钮全部消失。

## 根因

`role="img"` 表示原子图像；辅助技术可以忽略其后代语义。它适合纯展示 SVG，不适合内部含可交互节点的复合棋盘。

## 解决方案

把 SVG 改为 `role="group"`，继续使用 `aria-labelledby="pitch-title pitch-description"` 提供整体说明；内部合法落点保留独立按钮角色、坐标标签、Enter / Space 处理和 Tab 顺序。

## 回归验证

- [x] 开球后 accessibility snapshot 暴露 8 个 SVG 按钮和 8 个方向按钮；
- [x] SVG 落点分别用 Enter 与 Space 各推进一步；
- [x] 鼠标点击、全局方向键和触控方向盘仍走同一 reducer。

## 相关提交

- `f734170 feat: add paper soccer duel`
