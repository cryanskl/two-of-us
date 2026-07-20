# 七日小花园：成功日结的前缀长度与日序不变量冲突

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把七天，养成一朵花
- 发现版本 / commit：规格提交 `b765077`，实现前审计发现

## 环境

- 文档：`docs/162-seven-day-garden-spec.md`
- 阶段：逻辑实现开始前的状态机不变量审计
- 启动等级：A；问题属于规格，不依赖浏览器

## 复现步骤

1. 按规格转换表从 `second-pick` 提交一组 accepted 卡；
2. reducer 原子追加当天 `completedDays` 并进入 `day-result`；
3. 根据同一规格，`dayIndex` 只有在 `NEXT_DAY` 时才增加；
4. 对照原不变量 `completedDays.length === dayIndex`。

## 预期结果

成功结果页是合法中间状态：当天已被记录，但仍停留在当天，等待用户查看结果并主动进入下一天。

## 实际结果

第 1 天结果页应为 `dayIndex === 0`、`completedDays.length === 1`，与原不变量冲突。若按原不变量写 validator，所有成功结果页都会被当作畸形状态重置；若延迟追加记录，则又违反“accepted 原子提交”和结果页展示已完成日的要求。

## 根因

规格把“尚未结算的普通阶段”和“已结算但尚未推进的结果阶段”错误合并成一个前缀公式。转换表与原子提交规则本身是一致的，缺少的是 `day-result` 的显式例外。

## 解决方案

把不变量拆为：

- `intro / day-intro / first-pick / handoff / second-pick / jammed`：`completedDays.length === dayIndex`；
- `day-result`：`completedDays.length === dayIndex + 1`；
- `complete`：`completedDays.length === 7` 且 `dayIndex === 6`。

保留原转换顺序：accepted 时原子扣卡并追加记录，`NEXT_DAY` 才推进日序；第七日也先进入结果页，再由用户进入 complete。

## 回归验证

- [x] 规格不变量与转换表一致
- [x] 逻辑测试覆盖第 1 天和第 7 天结果页
- [x] JSON action log 可重放经过所有七个结果页
- [x] 浏览器结果页显示新生长层后才进入下一天

## 相关提交

- 规格修复：`2e9fc74`
- 逻辑实现与回归：`92e4d79`
