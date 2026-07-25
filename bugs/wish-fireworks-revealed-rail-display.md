# wish-fireworks 留字轨被显示规则覆盖

- 发现日期：2026-07-25
- 影响：桌面、移动与横屏的 normal Canvas 路径
- 状态：已修复并补回归测试

## 现象

三束落定后，Canvas 中的“我爱你”点阵正确，但相邻的公开文字轨把三个 `li`
纵向排列，偏离概念稿要求的横向开放留字轨。逻辑状态、DOM 顺序和隐私边界均未受
影响。

## 原因

`.revealed-glyphs { display:flex !important; }` 的选择器优先级低于
`.app-ready .js-only:not([hidden]) { display:revert !important; }`。后者用于在
JavaScript 初始化后恢复通用元素，却把 `ol` 的最终 display 计算成 `block`。

## 解决

新增更具体的
`.app-ready .revealed-glyphs.js-only:not([hidden]) { display:flex !important; }`
覆盖规则，并在 `ui.test.js` 冻结该选择器。真实 Chrome 重新验证 1504×1046、
390×844 与 844×390，三个标签均为单行横向排列且无横向溢出。

## 可复用结论

当“默认隐藏、初始化后恢复”与组件自身布局都使用 `!important` 时，测试不能只
确认组件声明存在，还要冻结最终覆盖选择器，并在真实浏览器读取 computed style。
