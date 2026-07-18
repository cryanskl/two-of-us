# 月相隐藏播报节点留下 17px 桌面滚动

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把月亮拨回那一天 1504×1046 桌面首屏
- 发现版本 / commit：`f5708e0 feat: add moon phase secret experience`

## 现象

真实浏览器在 1504×1046 下显示完整界面，但 `documentElement.scrollHeight` 为 1063，比视口多 17px。

## 复现步骤

1. 用 Chromium 从 `file://` 打开作品；
2. 将视口设为 1504×1046；
3. 比较 `scrollHeight` 与 `innerHeight`；
4. 遍历所有元素的 `getBoundingClientRect().bottom`，唯一越界的是 `#status-live`。

## 根因

`.sr-only` 使用了 `position: absolute`，但没有设置 `top` / `left`。浏览器按该段落原本位于 `main` 之后的静态位置安放 1px 盒子，使隐藏 live region 成为页面最底部元素。

## 解决方案

为 `.sr-only` 显式设置 `top: 0`、`left: 0`，保留 1px 可访问隐藏模式，同时让它脱离文档末尾的静态定位点。

## 回归验证

- [x] 1504×1046 的 `scrollHeight === innerHeight`；
- [x] intro 的 `scrollWidth === innerWidth === 1504`；
- [x] live region 仍保持绝对定位和可写文本节点；校准/解锁阶段继续在完整浏览器流程验证。
