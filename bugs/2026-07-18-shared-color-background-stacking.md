# 把颜色调到一起：背景素材被负层级完全遮住

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把颜色调到一起
- 发现版本 / commit：前端实现提交前的工作区版本

## 环境

- macOS，本机 Google Chrome；
- A 级 `file://` 与 localhost 均可复现；
- 入口：`experiences/co-op/shared-color-studio/index.html`。

## 复现步骤

1. 给 `body::before` 设置全屏 `pigment-table.webp` 背景和 `z-index: -1`；
2. 给 `body` 设置不透明的深色 `background-color`；
3. 打开作品并观察桌面边缘的水彩纸、铜碗和画笔。

## 预期结果

背景素材位于交互内容后方，但仍显示在页面深色底色上方。

## 实际结果

图片请求成功，CSS 路径也正确，但水彩纸、铜碗和画笔完全不可见；页面只显示纯深色背景与交互内容。

## 根因

负 `z-index` 把伪元素放到了根堆叠上下文背后。`body` 自身的不透明背景在它上方绘制，因此素材即使加载成功也会被整层遮住。这不是资源加载失败，而是合成层顺序错误。

## 解决方案

1. 给 `body` 设置 `isolation: isolate`，建立独立堆叠上下文；
2. 把 `body::before` 放到 `z-index: 0`；
3. 给 `.studio-app` 设置 `position: relative; z-index: 1`；
4. 保留 `body` 的深色背景作为图片缺失时的可读降级。

## 回归验证

- [x] 1504×1046 的 `file://` 截图能看到水彩纸、铜碗和画笔；
- [x] localhost 桌面、390×844 与 320×700 均显示背景素材；
- [x] 人为阻断 `pigment-table.webp` 后仍保留深色背景和完整可读内容；
- [x] 正常路径 console error 为 0。

## 相关提交

- `d7c7f93 feat: add shared color studio experience`：在作品进入提交前完成层级修复；
- 本记录单独提交，便于后续按症状检索。
