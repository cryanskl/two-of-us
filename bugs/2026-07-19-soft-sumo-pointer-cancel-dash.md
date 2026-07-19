# 软软相扑：Pointer 取消被当成松手冲刺

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：软软相扑
- 发现版本 / commit：前端提交前候选

## 环境

- 操作系统：触屏、触控笔或发生 Pointer capture 取消的桌面环境
- 浏览器与版本：支持 Pointer Events 的现代浏览器
- 启动等级与入口：A 级，`experiences/versus/soft-sumo/index.html`

## 复现步骤

1. 在 playing 按住一方“蓄力冲刺”至少一个逻辑 tick。
2. 让浏览器派发 `pointercancel`，或在映射仍活动时丢失 pointer capture。
3. 等待下一个逻辑 tick。

## 预期结果

系统取消必须清除双方输入并安全暂停；不能替玩家执行一次冲刺。

## 实际结果

初版把 `pointerup`、`pointercancel` 和 `lostpointercapture` 全部交给普通释放函数。映射被清除后，下一 tick 看到 `charging=false`，把系统取消解释为主动松手并触发冲刺。

## 根因

Pointer 层把“玩家确认松手”和“浏览器中止这次指针序列”合并成同一语义，但逻辑层的 charge edge 必须区分两者。

## 解决方案

保留 `pointerup → releasePointer` 的主动松手路径；新增取消路径，在仍存在 active pointer 时先释放映射，再派发安全 PAUSE。PAUSE 通过权威 `cancel-charge` 事件清零 charge/wasCharging。正常 pointerup 主动释放 capture 后触发的 lost 事件因映射已删除，保持幂等且不误暂停。

## 回归验证

- [x] VM smoke：蓄力后 pointer cancel 进入 paused
- [x] VM smoke：取消后 chargeTicks 为 0
- [x] 正常 pointerup 仍可在下一 tick 冲刺
- [ ] 真实触屏 pointercancel / lostpointercapture 浏览器路径通过
- [x] 全仓 1278 项测试通过，浏览器控制台无 warning/error

## 相关提交

- 前端提交（本文件所在提交）
