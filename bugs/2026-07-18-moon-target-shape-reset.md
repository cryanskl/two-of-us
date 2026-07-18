# 月相目标四字段被日期三字段校验拒绝

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：把月亮拨回那一天的月份、日期、月相 reducer
- 发现版本 / commit：实现提交前工作区

## 现象

初态能够创建，但 `start()`、月份/日期/月相调整和核对操作都会把合法状态重置回 intro；角度余量测试还会得到 `-0`。

## 复现步骤

1. 用合法配置调用 `createInitialState()`；
2. 调用 `start(state)`；
3. 观察返回阶段仍为 `intro`；
4. 运行定向测试，状态机、环绕、解锁和公开投影共 7 项失败。

## 根因

内部 `target` 合法包含 `{ year, month, day, phaseIndex }` 四个字段，月相计算却复用了只接受 `{ year, month, day }` 精确 schema 的日期校验。目标被误判后，状态校验失败，所有公开动作按安全策略回到默认初态。角度量化的向零取整还保留了 JavaScript 的 `-0`。

## 解决方案

- 月相计算入口只投影并校验目标中的日期三元组，不放宽内部 target 的四字段白名单；
- `stepsFromAngularTravel()` 在返回前把 `-0` 规范为 `0`；
- 保留畸形状态必须回安全初态的防线，不用绕开状态校验解决症状。

## 回归验证

- [x] 月相定向测试 15 / 15 通过；
- [x] 正负月份/日期/月相环绕通过；
- [x] intro → calibrating → feedback → unlocked → restart 通过；
- [x] 全仓测试 423 / 423 通过。

## 相关提交

- `ea48d4e feat: add moon phase secret logic`
