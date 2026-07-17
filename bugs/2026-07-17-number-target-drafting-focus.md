# 数字凑靶：开局后焦点停在页面而不是首张可选牌

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：数字凑靶键盘开局与下一局
- 发现版本 / commit：实现提交前工作区

## 环境

- macOS 26.5.2；headed Chromium 150.0.7871.125；
- A 级页面通过 `127.0.0.1:8766` 的同目录静态服务做真实浏览器 fallback 验收；
- 视口：1504×1046、390×844、320×760。

## 复现步骤

1. 打开作品 intro，让“开始凑靶”获得焦点；
2. 点击或键盘激活该按钮；
3. 查询 `document.activeElement`。

## 预期结果

进入 drafting 后，焦点落在当前牌轨第一张可用牌，玩家可以立即继续用键盘选择。

## 实际结果

焦点退回 `body`。鼠标和触控不受影响，但键盘玩家需要额外按 Tab 才能继续。

## 根因

`startMatch()` 和 `startNextRound()` 都调用 `render(true)`；`true` 的含义是聚焦指令卡主按钮，但 drafting 指令卡没有按钮，因此聚焦分支没有候选，也不会回退到牌轨。

## 解决方案

成功进入 drafting 时调用 `render(false)`，只有安全随机失败时才用 `render(true)` 聚焦“重新检查”。牌轨焦点仍由当前 `kindForStep` 派生。

## 回归验证

- [x] 点击开始后 `activeElement` 为第一张可选数字牌；
- [x] 每次合法选择后焦点进入下一种可用牌轨；
- [x] 局结果、最终结果与重开按钮继续自动聚焦；
- [x] 浏览器控制台 0 error / 0 warning。

## 相关提交

- `d8da9f9 feat: add number target duel`
