# 月相重开后 live region 保留成功播报

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把月亮拨回那一天的调整与重开路径
- 发现版本 / commit：`845d13e fix: fit moon phase unlock in desktop viewport`

## 现象

完成三轴解锁后点击重开，界面恢复 intro、最终留言节点归零，但 `#status-live` 仍为“三项都已对齐，留言已经展开”。错误核对后调整任一刻度也会保留上一轮播报。

## 根因

`renderFeedback(null)` 会隐藏并清空视觉反馈列表，却在提前返回前没有清空独立的 live region。

## 解决方案

无 feedback 时同时把 `liveRegion.textContent` 设为空字符串，再返回。视觉反馈、隐藏播报和权威状态由同一 `feedback` 空值共同复位。

## 回归验证

- [x] 错误核对后调整月份，live region 从错误提示清空；
- [x] 成功时播报“三项都已对齐”，最终留言恰好一份；
- [x] 重开后留言节点、线索节点和 live region 全部归零；
- [x] 重开后焦点回到主动作，没有上一轮播报残留。
