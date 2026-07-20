# 七日小花园：修饰键组合误触照料卡并吞掉浏览器快捷键

- 状态：`fixed`
- 日期：2026-07-21
- 环境：Codex In-app Browser；桌面键盘
- 影响阶段：first-pick / second-pick
- 发现版本：界面提交前评审

## 复现

1. 进入任一选卡阶段；
2. 按 `Command+W`、`Control+W` 或带 Alt/Meta 的 `W/S/P` 组合；
3. 页面把字母识别为水、日照或耐心卡，并调用 `preventDefault()`。

## 预期

只有无命令修饰键的单独 `W/S/P` 才能选择卡；浏览器与辅助技术的组合快捷键必须保留。

## 根因

键盘入口先按 `event.key` 分类，再执行选卡，没有在业务快捷键之前拒绝 `ctrlKey`、`metaKey`、`altKey`。因此合法字母与浏览器组合键共用了同一分支。

## 修复

新增 `hasCommandModifier` 边界检查。任一 Ctrl、Meta 或 Alt 修饰存在时直接退出，不选卡也不阻止默认行为；Shift 不改变字母快捷键语义。

## 回归

- [x] 无修饰键 `W/S/P` 仍可完成两席选卡
- [x] Ctrl/Meta/Alt 组合不改变状态
- [x] Ctrl/Meta/Alt 组合不调用 `preventDefault()`
- [x] 完整七日键盘路径可完成

## 相关提交

- 界面修复：`9bf8f62`
