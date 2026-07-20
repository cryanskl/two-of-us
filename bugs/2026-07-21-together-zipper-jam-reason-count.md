# 把两边，拉成我们：规格摘要把六种卡顿原因写成五种

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把两边，拉成我们
- 发现版本 / commit：`44c92ea`

## 环境

- macOS；规格审阅与双子任务并行实现
- 启动等级与入口：A；`docs/157-together-zipper-spec.md`

## 复现步骤

1. 阅读规格第 7 节的状态不变量；
2. 观察其中写着 `jammed 只能是五种失败原因`；
3. 阅读同文档第 9 节 `lastResult.reason` 枚举；
4. 计数 `early-left`、`early-right`、`apart`、`missed-left`、`missed-right`、`missed-both`。

## 预期结果

摘要计数与权威枚举一致，明确为六种；逻辑、前端和测试无需各自猜测是否要合并某两个原因。

## 实际结果

摘要写成五种，但同文档权威 schema、调研、实施任务和测试 Gate 都要求六种。两个实现子任务独立发现了同一矛盾。

## 根因

规格先写了自然语言摘要，后来把过早原因拆成 `early-left` 与 `early-right`，更新了权威枚举但漏改摘要数字。以手写数量描述枚举时，没有让审校逐项回数。

## 解决方案

把第 7 节的“五种失败原因”改为“六种失败原因”。实现继续使用六个稳定 reason；不改变 reducer、UI 文案、状态数据或 catalog。

## 回归验证

- [x] 第 7 节摘要与第 9 节六项枚举一致
- [x] `JAM_REASONS` 精确包含六项
- [x] early-left/right、apart、missed-left/right/both 均有定向测试
- [x] 逻辑测试 31 / 31 通过
- [x] 全仓测试 1400 / 1400 通过

## 相关提交

- 本次规格计数与 bug 记录提交
