# 星座接线员：全局键盘保护漏掉合法 contenteditable 形式

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把星光，一笔一笔交给你
- 发现版本 / commit：前端首次实现，提交前只读复审发现

## 环境

- 文件：`experiences/co-op/constellation-relay/app.js`
- 输入：方向键、Enter、Space、Escape

## 复现步骤

把焦点置于任一种合法可编辑元素：

```html
<div contenteditable></div>
<div contenteditable=""></div>
<div contenteditable="plaintext-only"></div>
```

原保护只匹配 `[contenteditable='true']`，再按方向键或 Enter。

## 预期结果

全局接线键盘处理器在 input、textarea、select 和任意实际可编辑节点内立即退出，不 `preventDefault()`。

## 实际结果

空值和 `plaintext-only` 未被识别，可能抢占编辑按键。

## 根因

用单个属性字符串枚举可编辑语义，没有使用浏览器已经归一化的 `isContentEditable`。

## 解决方案

改为 `target.isContentEditable`，同时保留 input、textarea、select 的祖先检查；repeat 与 Ctrl/Meta/Alt 仍先 fail closed。

## 回归验证

- [x] `contenteditable` 空值、空字符串、true 与 plaintext-only 均被保护
- [x] input/textarea/select 仍被保护
- [x] 普通星点方向键与 Enter/Space 不受影响

## 相关提交

- 前端修复：`81c3428`
