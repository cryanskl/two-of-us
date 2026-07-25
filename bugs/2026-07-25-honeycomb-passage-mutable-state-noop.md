# 蜜径相逢：可变 state 沿 no-op 原样逃逸

- 日期：2026-07-25
- 范围：`experiences/versus/honeycomb-passage/logic.js`
- 发现阶段：非视觉核心再验收
- 发现基线：`9d52b5c1d9b628cd61be563bba29fa40478289bd`
- 状态：已修复

## 现象

把一个合法 `playing` state 做 `structuredClone` 后交给 reducer：

```js
const started = logic.reduce(logic.createInitialState(), { type: "START" });
const mutable = structuredClone(started);
const returned = logic.reduce(mutable, { type: "UNKNOWN" });
```

旧实现得到：

```text
returned === mutable
Object.isFrozen(returned) === false
returned.phase === "playing"
```

只对 clone 的顶层调用 `Object.freeze` 也会原样逃逸；它的 `content`、`history` 和
历史事件仍可变。

## 影响

规格要求所有权威 state 递归冻结。旧版 `readState` 只检查结构和值，没有验证冻结
不变量，因此外部可变副本会被当成可信 state。合法 state 遇到非法 action 时必须
同引用 no-op，这又把调用方的可变对象直接作为 reducer 返回值继续传播。

后续代码若把返回值视为规则层产生的权威状态，调用方仍能在 reducer 之外修改
phase、配置或历史。`getScreenView` 也会把这个可变对象投影成正在进行的对局，而
不是按畸形 state 回到安全初态。

## 红测

新增回归同时覆盖：

1. 完全可变的 `structuredClone(state)`；
2. 只冻结顶层、嵌套仍可变的 clone；
3. `reduce(candidate, UNKNOWN)` 必须返回全新、递归冻结的默认初态；
4. `getScreenView(candidate)` 必须等于默认初态 view；
5. 现有冻结 descriptor-only Proxy state 仍可正常 ACT 和生成 view。

修复前定向结果为 `23 pass / 1 fail`，失败项精确显示可变 state 被原样返回为
`playing / revision 1`。

## 根因

`readState` 把“字段结构和值一致”错误地等同于“由规则层拥有的 state”。但 reducer
的同引用 no-op 语义只有在输入已经满足不可变所有权合同时才安全。

顶层 `Object.isFrozen` 也不足够：浅层冻结对象仍可通过嵌套数组和事件修改历史。

## 修复

在 state 入口增加递归冻结 data graph 校验：

- 每个对象和数组都必须 `Object.isFrozen`；
- 每个 own property 都必须是 data descriptor；
- 使用 `WeakSet` 处理重复引用；
- 任一反射异常 fail closed；
- 原始 state 校验通过后才进入现有 exact schema 和 replay 不变量检查。

未修改 history、replay、BFS、行动或胜负规则。合法冻结 state 的非法 action 仍保持
原引用；可变或浅层冻结 state 现在统一恢复全新默认初态。

## 验证

```bash
node --check experiences/versus/honeycomb-passage/logic.js
node --test experiences/versus/honeycomb-passage/logic.test.js
```

结果：`24 / 24` 通过。最终全仓测试与仓库 verify 记录在
`docs/360-honeycomb-passage-core-verification.md`。

## 修复提交

- `d916743 fix: reject mutable honeycomb state`
