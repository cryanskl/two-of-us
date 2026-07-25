# 这一弹，拐弯见你：畸形 STEP 输入绕过状态校验

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`ricochet-tank-duel`
- 发现版本 / commit：`66e3575`
- 失败测试提交：`86a113d`
- 修复提交：`5077976`

## 环境

- 操作系统：macOS
- 运行时：Node.js 22，纯 CommonJS 核心测试
- 入口：公开 `step(state, inputFrame)` reducer

## 复现步骤

```js
const hostileState = { attackerControlled: true };
const result = simulation.step(hostileState, { leftMask: 0 });
```

## 预期结果

所有公开 reducer 入口都必须先关闭非法 state。畸形 input frame 对合法 state 可以
保持 no-op，但不能让非法 state 绕过 `validateState`。

## 实际结果

`step` 在 input frame 缺少 `rightMask` 时直接 `return state`，原样返回攻击者控制的
对象。相同 state 通过 `applyCommand` 会正确恢复为冻结初态，两个公开入口的失败
关闭语义不一致。

## 根因

便捷入口在构造 `STEP` action 前做了提前返回，把“非法 action 不推进”错误实现成
了“完全不进入 reducer”。因此 action 校验同时跳过了本应先执行的 state 校验。

## 解决方案

畸形 input frame 改为调用 `applyCommand(state, null)`。`applyCommand` 先校验或恢复
state，再把非法 action 处理为 no-op；合法冻结 state 仍保持引用不变。

## 回归验证

- [x] 非法 state + 畸形 frame 返回规范冻结初态
- [x] 合法 state + 畸形 frame 保持 no-op
- [x] 合法 STEP 的固定 tick 行为不变
- [x] 定向核心测试通过
