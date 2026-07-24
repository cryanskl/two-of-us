# 影子剑术：可变 state clone 在非法 action 路径泄出

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`shadow-sword-duel`
- 发现版本 / commit：`30bf117`

## 环境

- 操作系统：macOS
- 运行时：根仓库 Node ESM 定向测试
- 启动等级与入口：A；问题位于共享于浏览器与 Node 的 `logic.js`

## 复现步骤

1. 调用 `createInitialState()` 得到合法冻结初态。
2. 用 JSON 往返创建结构和值完全相同、但未冻结的 clone。
3. 调用 `reduce(clone, { type: "UNKNOWN" })`。
4. 检查返回引用及顶层、`content` 的冻结状态。

## 预期结果

state 合同要求递归冻结。未冻结 clone 应被视为畸形 state，并按安全回退合同返回
使用默认配置创建的全新冻结初态；合法冻结 state 遇到非法 action 时才保持原引用。

## 实际结果

reducer 把 clone 当成合法 state，随后在非法 action 分支原样返回：
`result === clone`，且 `Object.isFrozen(result)` 与
`Object.isFrozen(result.content)` 都是 `false`。

## 根因

`parseState()` 只校验精确 key、普通数据属性、值域和阶段不变量，没有校验顶层及
嵌套记录/数组是否不可扩展、数据属性是否不可写且不可配置。非法 action 的同引用
no-op 随后把不满足 state 冻结合同的调用方对象直接作为 reducer 输出。

## 解决方案

- 只对 state 解析启用 descriptor-based `requireFrozen`；
- 顶层 state、content、playerNames、sealedActions、history、event 与 event.actions
  都要求不可扩展，且数据属性不可写、不可配置；
- 每个属性仍只从 descriptor 取值，不执行 getter；
- `replayHistory()` 与 `resolveRound()` 的普通可变输入保持原合同，不被收紧；
- MAX_SAFE 测试夹具在构造完成后递归冻结。

## 回归验证

- [x] 未冻结 JSON clone 配非法 action 回到全新默认冻结初态
- [x] 只冻结顶层、嵌套仍可变的 clone 同样安全回退
- [x] 合法冻结 state 的非法 action 仍保持原引用
- [x] hostile getter / Proxy 路径不抛异常
- [x] 定向测试与仓库验证通过

## 相关提交

- 本修复提交
