# Compliment Reels 结果纸产生第二个 status

- 日期：2026-07-25
- 状态：已修复
- 影响：result/jackpot 的辅助技术播报
- 回归测试 commit：`48c2c44`
- 修复 commit：`ca8f28b`

## 现象

首次结果落定后，Chrome 无障碍树同时出现：

1. `<output class="current-praise">` 的隐式 `status`；
2. 专用 `<p role="status" aria-live="polite">`。

即使 `<output>` 设置 `aria-live="off"`，其隐式 role 仍存在，破坏“全页唯一 live
region”合同，也可能让读屏软件把完整句重复播报。

## 根因

`output` 元素本身带有隐式 status 语义；`aria-live="off"` 只关闭 live 行为，不会
删除该 role。

## 修复

动态创建结果纸时保留语义元素 `<output>`，同时显式设置 `role="paragraph"`；
唯一专用 live region 继续负责普通结果与特别同频消息。静态回归锁定这一覆盖。

修复后从首次 result 到第六次 jackpot，Chrome 每阶段
`document.querySelectorAll('[role="status"]').length` 均为 1。
