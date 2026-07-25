# 四符片名擂台：动作类型可在两次快照之间变化

## 现象

基线 `parseAction()` 会先尝试按 `{ type, revision }` 快照，失败后单独读取一次
`type` descriptor 以选择动作 schema，随后再完整快照。

敌意 Proxy 可在第一次把类型报告为 `SELECT_OPTION`，第二次改成
`ACK_HANDOFF`。复现中，一条带 `optionId` 的动作让状态从 `handoff` 非法推进到
`question`，而 `type` descriptor 被观察了两次。

## 影响

- schema 是根据第一次观察选择的，实际派发的却可能是第二次观察到的另一动作；
- reducer 的结果依赖 Proxy trap 调用次数；
- 违反本仓库“输入只观察一次，再在普通快照上做业务判断”的纯逻辑边界。

内建 UI 创建的普通对象不触发该问题，但公开 reducer 对敌意或可变输入没有
fail-closed。

## 根因

旧实现把“先探测类型”和“按类型复制字段”分成多个反射阶段。异常捕获只能处理
抛错，无法消除两次合法但不一致的观察。

## 解决方案

`parseAction()` 现在：

1. 一次取得候选对象的全部 own property descriptors；
2. 在该普通 descriptor 快照上读取 `type`；
3. 根据同一份 `type` 选择精确键集合；
4. 从同一份 descriptor 快照复制所有 data property；
5. 最后校验 revision。

accessor、额外键、Symbol 键、数组、原型污染对象和异常 Proxy 继续返回 no-op，
普通 getter 不会执行。

## 验证

- 红灯：新增 Proxy 回归后定向测试 `28/29`；
- 修复后定向测试 `29/29`；
- reducer 返回原 `handoff` state 引用；
- `type` descriptor 调用次数固定为 1；
- `node --check logic.js` 通过。

## 可复用经验

本问题由既有
[单次观察快照边界](../learn/2026-07-23-single-observation-snapshot-boundary.md)
直接覆盖，因此不重复创建同主题 learn。

## 影响范围

仅修改 `four-symbol-film-duel` 的动作解析与测试，不改变动作类型、阶段规则、
计分、题库或生产 UI。
