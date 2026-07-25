# wish-fireworks no-JS 显示空留字轨

- 发现日期：2026-07-25
- 影响：禁用 JavaScript 时的静态入口
- 状态：已修复并补回归测试

## 现象

JavaScript 被禁用时，按钮和动态状态正确隐藏，但空的 `ol#revealed-glyphs` 仍以
flex 显示，留下两条没有语义内容的边线。no-JS 页面因此多出一个伪造的空状态。

## 原因

组件基础规则 `.revealed-glyphs { display:flex !important; }` 位于
`.js-only { display:none !important; }` 之后，且优先级相同，导致后声明覆盖隐藏。

## 解决

移除基础规则中的强制 display，只由
`.app-ready .revealed-glyphs.js-only:not([hidden])` 在应用成功初始化后启用 flex。
测试同时禁止基础规则重新加入 `display:flex !important`。真实 Chrome 禁用脚本
复验后，所有 `.js-only` 节点均为 `display:none`，页面只保留标题、说明、夜空、
隐私声明和 no-JS 提示。

## 可复用结论

渐进增强页面的组件布局不能先于增强成功状态覆盖隐藏合同。no-JS Gate 应读取每个
动态节点的 computed style，而不只检查提示文案是否存在。
