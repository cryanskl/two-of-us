# Shadow Duet 强制颜色下人物轮廓消失

日期：2026-07-25

## 现象

Chrome 模拟 `forced-colors: active` 时，文字、舞台边框、拍灯和按钮都保留，但两道人物
完全不可见。截图中纸幕只剩四个角钉。

## 原因

人物由多个 `background: currentColor` 的圆角块组成。强制颜色算法会重写非文本背景，
所以即使父元素使用 `CanvasText`，肢体填充仍会被改为画布色。

## 修复与回归

先增加静态回归断言，再在 forced-colors 媒体查询中为头、躯干、手臂和腿增加真实
`CanvasText` 边框，并把内部设为 `Canvas`。没有使用 `forced-color-adjust: none`，
仍由系统色控制对比度。Chrome 复验可见两道完整轮廓。
