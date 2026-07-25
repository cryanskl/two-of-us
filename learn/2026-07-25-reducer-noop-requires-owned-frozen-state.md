# 同引用 no-op 的前提：先证明 state 属于不可变域

## 问题模型

纯 reducer 常用下面的合同：

```text
合法 state + 非法 action → 返回原 state 同一引用
```

它可以避免无意义渲染，也能让测试精确区分“没有转换”和“生成了等值新状态”。
但这个优化隐含了一个前提：输入 state 已经属于 reducer 的不可变权威域。

若入口只验证字段结构和值，调用方可以构造一个可变的等形对象。非法 action 随后
把该对象原样返回，等于由 reducer 为外部可变对象背书。

## 为什么浅层冻结不够

典型 state 包含：

```text
state
├── content
│   └── playerNames[]
└── history[]
    └── event
```

只冻结 `state` 顶层仍允许修改名字数组、追加历史或改写事件。验证
`Object.isFrozen(state)` 不能证明整个权威图不可变。

## 安全边界

对采用同引用 no-op 的 reducer，入口应区分两类数据：

1. **外部事件数据**：例如可 JSON 往返的 action log，可以接受普通可变输入，
   但必须先正规化为断开引用的内部副本；
2. **权威 state**：若非法 action 会原样返回，输入必须满足递归冻结、data
   descriptor、精确 schema 和语义不变量。

一个通用的递归冻结验证器至少要：

- 检查每层 `Object.isFrozen`；
- 只沿 own data descriptor 读取值，不调用 getter；
- 用 `Reflect.ownKeys` 覆盖 symbol 和非枚举属性；
- 用 `WeakSet` 防止重复引用导致无限递归；
- 捕获 Proxy 的反射异常并 fail closed。

验证后，业务逻辑只消费已经观察到的普通快照；原输入引用只保留给已证明安全的
no-op 返回。

## 测试矩阵

至少固定以下四项：

| 输入 | 期望 |
| --- | --- |
| reducer 自己产生的递归冻结 state | 合法 action 正常转换 |
| 冻结 state + 非法 action | 原引用 no-op |
| `structuredClone(state)` | 视为畸形并恢复安全 state |
| `Object.freeze(structuredClone(state))` | 仍拒绝，因为嵌套可变 |

若实现支持 descriptor-only Proxy，还应证明校验过程不触发普通 property `get`。

## 可复用结论

“输出会冻结”不代表“输入天然可信”。只要 API 同时具有：

- 外部可构造 state；
- 合法输入上的同引用 no-op；
- 不可变 state 合同；

就必须把“递归冻结所有权”纳入 state 的合法性，而不是只在创建 state 时调用一次
`deepFreeze`。
