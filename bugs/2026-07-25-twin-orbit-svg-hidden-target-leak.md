# 这一圈，和你同时到：SVG `hidden` 属性写入方式泄露 intro 门位

- 状态：`fixed`
- 日期：2026-07-25
- 环境：Chrome，localhost 生产文件，intro 阶段

## 复现

1. 打开 `experiences/co-op/twin-orbit/index.html`；
2. 停留在 intro，不点击“开始第一圈”；
3. 观察双环顶部。

实际结果：左右两扇目标门以没有关卡变换的默认位置叠在 SVG 顶部。

预期结果：intro 的 public view 已将两席 `targetAngle` / `targetLane` 设为
`null`，页面不应显示任何门位。

## 根因

`placeGate()` 对 `SVGElement` 使用 `element.hidden = true/false`。`hidden` 是
HTML 元素的反射属性；在当前 SVG 元素上，这次赋值只创建普通 JavaScript 属性，
没有写入 DOM 的 `hidden` attribute，因此全局 `[hidden]` CSS 选择器没有命中。

## 修复

- 没有目标时调用 `setAttribute("hidden", "")`；
- 当前关开始后调用 `removeAttribute("hidden")`；
- 静态 UI 契约新增真实 attribute 写入回归。

## 回归

- intro：两扇门均不可见；
- gate-intro / playing：只显示当前关门位；
- complete：两扇门再次不可见；
- `node --test experiences/co-op/twin-orbit/ui-contract.test.js` 通过；
- Chrome 重新截图确认。
