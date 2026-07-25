# Bug：Twin Orbit 空闲或极值 SUSPEND 泄出校验快照

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`8f2febb` 之后的阶段与极值验证

## 环境

- 操作系统：macOS
- Node.js：当前仓库锁定环境
- 启动等级与入口：目标 A 级；当前无生产入口

## 复现步骤

以下任一路径均可复现：

1. 对 canonical intro dispatch `SUSPEND { reason: "hidden" }`；或
2. 构造合法 playing state，把 `inputEpoch` 设为
   `Number.MAX_SAFE_INTEGER`，再 dispatch SUSPEND。

比较返回引用与调用者 state。

## 预期结果

intro/gate-intro 的 SUSPEND 不改变状态；epoch 或 revision 无法安全递增时也不能
提交暂停。两者都应返回调用者原 state 引用。

## 实际结果

初版 `suspendState()` 接收校验后的普通 snapshot，并在无需变化或计数器溢出时
直接返回该 snapshot。数据等值，但引用改变且未冻结。

## 根因

内部 helper 不掌握原始调用者引用，却用 state 返回值表达 no-op，重复了
“校验副本被误当成权威结果”的边界错误。

## 解决方案

- `suspendState()` 用内部 `null` 哨兵表达未提交；
- 公共 reducer 把哨兵转换为 `stateCandidate` 原引用；
- 回归覆盖 intro、无效阶段与最大 input epoch。

## 回归验证

- [x] 项目测试通过
- [x] `node --check` 通过
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过
- [x] `npm test` 通过

## 相关提交

- 本 bug 修复提交
