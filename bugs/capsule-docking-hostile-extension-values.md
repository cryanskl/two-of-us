# capsule-docking 扩展值触发 Proxy trap

- 日期：2026-07-25
- 影响范围：`normalizeConfig()`、`resolveCompletionNote()` 与 `reduce(PRESS/RELEASE)`
- 状态：已修复

## 复现与影响

规格要求所有公开入口面对 accessor、异常 Proxy 与其他敌对输入时安全拒绝、不得
抛异常。审计发现两条正常玩法不会触发、但公开 API 可直接触发的路径：

1. `composeCompletionNote` 是函数型 Proxy，且其 `ownKeys` trap 抛错时，
   `normalizeConfig()` 会在递归冻结调用方函数时把异常传播出去；
2. `PRESS/RELEASE.control` 是对象型 Proxy，且属性读取 trap 抛错时，
   `validControlAction()` 会在把它转换为对象键时传播异常。

配置路径还会直接冻结调用方传入的函数对象，违反“返回值与输入断开引用”的合同。

## 根因

- 配置归一化对象直接保存外部 callback，随后 `deepFreeze()` 递归进入该函数；
- control 在完成字符串类型收窄前就用于 `CONTROL_BY_ID[action.control]`。

descriptor snapshot 只保护了外层普通对象，不能自动保护嵌套的可调用对象或后续
发生的隐式属性键转换。

## 解决方案

- 归一化配置保存一个内部新建的 wrapper，由 wrapper 在完成赠言阶段调用外部
  callback；冻结结果不再遍历或冻结调用方函数；
- control lookup 前先要求 `seat` 与 `control` 都是字符串，其他值直接 no-op。

callback 的实际调用仍位于 `resolveCompletionNote()` 的 `try/catch` 内；若 Proxy
的 `apply` trap 抛错，继续回退默认赠言。

## 回归

`logic.test.js` 新增函数型 Proxy 与对象型 control 回归，断言：

- `normalizeConfig()`、`resolveCompletionNote()` 与 `reduce()` 均不抛；
- 归一化 callback 与外部 callback 不是同一引用；
- 外部 callback 不会因归一化被冻结；
- 非字符串 control 返回原 state 的 no-op；
- 全部项目测试 22/22 通过。
