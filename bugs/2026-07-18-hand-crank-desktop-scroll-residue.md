# 把这首转给你：桌面原生尺寸残留可滚动高度

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把这首转给你
- 发现版本 / commit：`200c8fd`

## 环境

- 操作系统：macOS；
- 浏览器：headed Chromium；
- 启动等级与入口：A 级 `file://`；
- 视口：1504×1046。

## 复现步骤

1. 以概念原生 1504×1046 视口打开 intro；
2. 读取根元素 `scrollHeight` 与 `clientHeight`；
3. 尝试在视觉上已完整显示的页面继续纵向滚动。

## 预期结果

桌面首屏完整承载 intro，`scrollHeight = clientHeight = 1046`。

## 实际结果

视觉主体没有越界，但文档仍残留极小可滚动高度，导致原生尺寸截图与首屏预算不精确。

## 根因

屏幕阅读器专用节点设为 1×1px 并裁切，但缺少经典 `.sr-only` 负 margin；不可见盒仍对布局边界贡献像素。

## 解决方案

给 `.sr-only` 增加 `margin: -1px !important`，与现有绝对定位、裁切和 overflow 规则共同把它完全移出视觉布局预算，同时保留可访问文本。

## 回归验证

- [x] 1504×1046：`scrollWidth = clientWidth = 1504`；
- [x] 1504×1046：`scrollHeight = clientHeight = 1046`；
- [x] 页面仍保留 live region 与屏幕阅读器文本；
- [x] 控制台 0 error / 0 warning。

## 相关提交

- `a01e83e fix: remove music box desktop scroll residue`
