# wish-fireworks no-Canvas 移动端横向溢出

- 发现日期：2026-07-25
- 影响：Canvas 不可用或强制颜色启用时的窄屏三字完成态
- 状态：已修复并补回归测试

## 现象

在真实 Chrome 中把 Canvas 上下文设为不可用后，390px 视口的三组 CSS 9×9
点阵令文档内容宽达到 412px。流程、文字和点阵都正确，但页面出现横向溢出。

## 原因

桌面降级点阵使用 `width:min(38vw, 180px)`。三个点阵、三个最小列表项和间距
并排时，窄屏可用宽度不足；通用 `overflow-x:hidden` 只能遮住症状，不能让内容
真正适配。

## 解决

在 700px 以下把降级点阵收束为 `width:min(25vw, 112px)`，间距降为 2px。
回归测试冻结该窄屏尺寸规则；真实 Chrome 再验 390×844 和 320×568 时，
`scrollWidth === innerWidth`，三字点阵、标签和结果短笺均保持完整。

## 可复用结论

响应式验证应读取 `scrollWidth`，不能只依赖截图或 `overflow-x:hidden`。Canvas
降级、forced-colors 等非常态分支需要用真实组件数量重新计算横向预算。
