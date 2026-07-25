# Bug：Twin Orbit canonical 内容校验二次触发 Proxy get trap

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：`2242f21` 之后的 hostile-object 验证

## 环境

- 操作系统：macOS
- Node.js：当前仓库锁定环境
- 启动等级与入口：目标 A 级；当前无生产入口

## 复现步骤

1. 创建一份字段完整的 `playing` state。
2. 用 Proxy 包住 `content`，在 `get` trap 中累计读取次数。
3. dispatch 一个合法 `TICK`。
4. 检查 trap 计数与返回 state 的引用所有权。

## 预期结果

外部对象只通过 own data descriptor 快照读取。`get` trap 和 accessor 都不执行；
合法数据进入 reducer 前复制为普通对象，不与调用者共享引用。

## 实际结果

初版先通过 descriptor 生成规范化结果，随后又用 `value[key]` 比较 canonical
文本，七个字段各触发两次 Proxy `get`，总计 14 次。

## 根因

canonical 检查的第二阶段重新读取了外部对象，而没有继续使用第一阶段已获取的
descriptor snapshot。这让本应纯数据的验证边界重新获得可执行行为。

## 解决方案

- 拆分“取得 descriptor snapshot”和“规范化 snapshot”；
- canonical 比较只使用同一个普通对象快照；
- `snapshotState()` 将规范化后的普通内容副本交给 reducer；
- 回归覆盖 accessor 零执行、Proxy `get` 零执行、抛错 trap containment、
  自定义数组拒绝和引用隔离。

无法禁止 Proxy 的元对象 trap 被反射 API 调用；这些 trap 可能抛错，但异常必须
被边界捕获，且其返回值不能绕过 exact own-data schema。

## 回归验证

- [x] 项目测试通过
- [x] `node --check` 通过
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过
- [x] `npm test` 通过

## 相关提交

- 本 bug 修复提交
