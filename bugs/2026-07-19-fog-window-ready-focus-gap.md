# 在雾上，写给你：笔迹达标后焦点没有进入确认动作

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：在雾上，写给你
- 发现版本 / commit：前端实现的提交前候选；修复随 `312b18c feat: build fog window letter experience` 进入

## 环境

- 操作系统：macOS，其他平台同样受 DOM 焦点路由影响
- 浏览器与版本：现代 Chromium；键盘路径
- 启动等级与入口：A 级，`experiences/surprises/fog-window-letter/index.html`

## 复现步骤

1. 选择“开始写”，让焦点进入雾窗。
2. 写出满足点数、长度、宽度和高度 Gate 的笔迹并结束当前一笔。
3. 不使用鼠标，检查当前焦点和下一次 Tab 顺序。

## 预期结果

状态从 `writing` 进入 `ready` 后，焦点立即落在“就写到这里”，键盘用户可以直接确认并进入描回。

## 实际结果

确认按钮已经显示，但焦点仍停在雾窗交互面；键盘用户需要额外探索才能找到新出现的主动作。

## 根因

`moveFocus()` 覆盖 START、CONFIRM、PAUSE、RESUME、complete 和 RESTART，却漏掉了由 END_STROKE 触发的 `writing → ready` 转换。

## 解决方案

在焦点路由中显式检测 `previousView.phase === "writing" && view.phase === "ready"`，把目标设为 confirm 按钮。逻辑状态机和 Pointer 会话不变。

## 回归验证

- [x] 1280×800 真实拖动后进入 ready
- [x] 浏览器确认 active 元素为 `data-action="confirm"`
- [x] 173 / 173 定向测试与 1004 / 1004 当时全仓测试通过

## 相关提交

- `312b18c feat: build fog window letter experience`

