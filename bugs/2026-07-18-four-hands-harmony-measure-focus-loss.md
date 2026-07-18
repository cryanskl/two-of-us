# 这一拍，刚好和你：小节完成时禁用目标键造成键盘焦点断链

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：这一拍，刚好和你
- 发现版本 / commit：`2d36851 feat: add four hands harmony experience`

## 环境

- 操作系统：macOS
- 浏览器：Chromium 系浏览器
- 启动等级与入口：A 级，本地静态页面

## 复现步骤

1. 用键盘点击“开始合奏”，焦点自动落到当前低音目标键。
2. 同时按住本节低音与高音目标，直到进入 `measure-complete`。
3. 检查当前焦点；双方松开进入下一节后再检查一次。

## 预期结果

完成提示期间焦点仍保留在琴键区域；进入下一节后，焦点移动到新的低音目标键。

## 实际结果

旧实现把所有琴键设为原生 `disabled`，浏览器立即把当前目标键移出焦点序列；由于阶段 DOM 没有重建，下一节也不会重新安排焦点。

## 根因

`view.canPress` 同时被当作状态写入权限和 DOM 可聚焦权限。measure-complete 只应拒绝新的 PRESS，但原生 `disabled` 还会强制丢失焦点。

## 解决方案

- measure-complete 保持琴键可聚焦，以 `aria-disabled="true"` 表达暂时不可操作；
- Pointer handler 与 reducer 继续承担 PRESS Gate，不改变玩法；
- 检测 `measure-complete → playing`，显式把焦点落到新一节的低音目标键。

## 回归验证

- [x] 三份脚本语法检查通过
- [x] C04 逻辑测试 66 / 66 通过
- [x] 全仓测试 536 / 536，统一验收确认 40 个作品入口
- [ ] 浏览器五节键盘焦点链通过

## 相关提交

- `108d866 fix: preserve four hands keyboard focus`
