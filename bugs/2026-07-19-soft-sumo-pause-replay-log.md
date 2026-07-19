# 软软相扑：暂停取消蓄力无法从轮次日志重放

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：软软相扑
- 发现版本 / commit：`3d4d956 docs: specify soft sumo`

## 环境

- 操作系统：任意
- 浏览器与版本：任意；纯逻辑即可复现
- 启动等级与入口：A 级，`experiences/versus/soft-sumo/index.html`

## 复现步骤

1. 在 playing 中按住蓄力数个 tick。
2. 派发 PAUSE，使 `chargeTicks` 与 `wasCharging` 归中立。
3. RESUME 并完成恢复倒数，再继续若干 STEP 直到本轮结束。
4. 只用旧 schema 的 `inputPair[]` 重放 completed round。

## 预期结果

每轮日志应足够重建暂停前后所有权威棋子状态；JSON 往返、current round replay 和 completed round replay 都深相等。

## 实际结果

旧日志只记录物理 STEP 输入，没有记录 PAUSE 的取消蓄力边界。恢复后的 playing 与 completed round 已不带当前 phase 提示，重放会把暂停前的 charge 延续到下一次释放，产生错误冲刺或状态不一致。

## 根因

规格误把暂停取消输入当作可以由“当前 phase”推导的临时状态。这个推导只在 paused/恢复 countdown 当下成立；一旦恢复 playing 或完成轮次，历史暂停信息永久丢失。

## 解决方案

把每轮日志从 `inputPair[]` 改为精确事件联合：

```text
{ type: "step", inputs: [input0, input1] }
{ type: "cancel-charge", atTick }
```

PAUSE 立即追加 cancel-charge；roundTick 与 roundResult.ticks 只统计 step 事件。replay 按序应用两类事件，同 tick 重复 cancel 规范化为一条。这样不需要把真实时间、倒数 STEP 或整个 session action 混进物理日志。

## 回归验证

- [x] 规格明确日志联合、顺序和计数语义
- [ ] pause → resume → playing 的 current round replay 深相等
- [ ] pause → resume → outcome 的 completed round replay 深相等
- [ ] JSON 往返和完整 session replay 深相等
- [ ] 全仓测试与浏览器验收通过

## 相关提交

- 规格修复提交（本文件所在提交）
