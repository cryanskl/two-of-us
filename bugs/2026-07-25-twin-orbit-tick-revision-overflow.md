# Bug：Twin Orbit 批量 TICK 在 revision 溢出时泄出未冻结快照

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`1139704` 之后的核心边界验证

## 环境

- 操作系统：macOS
- Node.js：当前仓库锁定环境
- 启动等级与入口：目标 A 级；当前无生产入口

## 复现步骤

1. 从合法 `playing` state 复制 exact schema 数据。
2. 把 `revision` 设为 `Number.MAX_SAFE_INTEGER`。
3. dispatch `TICK { count: 2 }`。
4. 比较返回引用并检查 `Object.isFrozen()`。

## 预期结果

首个 tick 已无法安全递增 revision，整个 action 应返回调用者原 state 引用。
若批处理中途才触顶，则保留最后一个已提交、已冻结的权威 state。

## 实际结果

初版内部 `stepPlaying()` 在溢出时返回校验生成的普通 snapshot。批处理把该
snapshot 当作成功结果返回，导致引用变化且对象未冻结。

## 根因

内部 step 用同一种返回类型表达“合法新状态”和“无法提交”，丢失了调用者的
原始权威引用；批处理层无法区分 no-op 与一次正常推进。

## 解决方案

- `stepPlaying()` 在 revision 无法递增时返回内部哨兵 `null`；
- 批处理层遇到哨兵时返回上一个已提交 state 引用；
- 回归同时覆盖首步溢出与第二步才溢出的部分提交语义。

这与逐个 dispatch `TICK { count: 1 }` 的结果保持一致。

## 回归验证

- [x] 项目测试通过
- [x] `node --check` 通过
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过
- [x] `npm test` 通过

## 相关提交

- 本 bug 修复提交
