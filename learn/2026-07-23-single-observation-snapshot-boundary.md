# 单次观察快照：把 hostile 输入变成内部普通数据

适用范围：公开 reducer、配置清洗器、回放器、几何 helper，以及任何会接收
调用方 object/array/Proxy 的本地 JavaScript 规则层。

## 核心结论

“先验证，再使用原对象”不是安全边界。Getter、Proxy trap、污染原型和自定义
迭代器都能让两次观察得到不同结果，或在验证后执行调用方代码。

更稳的边界是：

1. 模块加载时捕获检查与转换所需的 intrinsic；
2. 对每一层输入只读取一次 prototype、ownKeys 和各字段 descriptor；
3. 只接受精确普通对象或密集原生数组的 own data descriptor；
4. 把 descriptor value 复制进内部普通数据；
5. 验证、计算、冻结和 public projection 从此只消费内部副本。

这不是把所有 Proxy 一概拒绝。一个只暴露稳定 data descriptor 的 Proxy 可以
被安全快照；会改变 descriptor、抛 trap 或依赖普通 `get` 的输入应 fail closed。

## 为什么“验证两次”反而危险

下面的伪代码有一个 TOCTOU 窗口：

```js
const type = Object.getOwnPropertyDescriptor(action, "type").value;
const snapshot = snapshotObject(action, schemaFor(type));
```

如果 `action` 是 Proxy，第一次 descriptor 可以是 `BEGIN`，第二次可以是
`RESTART`。第一次验证没有约束第二次使用，甚至可能把一个本应 no-op 的动作
变成有效破坏性转移。

正确做法是在同一轮观察中完成：

```text
prototype + ownKeys + descriptors
             ↓
       immutable snapshot
             ↓
      validate and execute
```

类型字段本身也是 snapshot 的一部分，不能先探测一次，再让通用 helper 重读。

## 数组需要比 object 多一层约束

只检查索引和 length 不够。严格规则数据通常还应要求：

- `Array.isArray(value) === true`；
- prototype 精确为当前 realm 的 `Array.prototype`；
- ownKeys 只有 `0..length-1` 与 `length`；
- 每个索引都是 data descriptor；
- 无稀疏项、extra string key 或 symbol；
- 不调用输入的 iterator、map、forEach、toJSON 或 valueOf。

数组子类和自定义 iterator 不是“更灵活的合法数组”，而是额外的执行入口。

## 捕获 Reflect 仍不等于捕获完整 intrinsic

快照过程之外的内部转换也会被原型污染影响。例如：

- 文本扫描动态调用 `raw.charCodeAt(i)`；
- ID 生成动态调用 `text.padStart(...)`；
- 状态文案动态调用 `labels.join("、")`。

即使输入已被安全复制，加载后改写这些 prototype 方法仍会让公开 API 抛错或
改变结果。因此应在模块初始化时捕获实际使用的方法，并统一通过已捕获的
`Reflect.apply` 调用。

捕获范围应由真实调用图决定，不是机械地复制一份“大而全”的白名单。新增
字符串/数组方法时，静态审查和原型污染回归也要同步更新。

## No-op 身份与非法状态回退

严格快照不应破坏 reducer 的两个不同合同：

- 合法 state + 非法/无效 action：返回调用方原 state 引用；
- 非法 state：返回全新安全初态。

实现可以用内部 snapshot 做判断，但 no-op 时不能错误返回 snapshot。这样 UI
能用引用判断是否真正转移，同时 hostile state 也不会继续传播。

## 验证方法

至少覆盖以下 fixture：

- getter/accessor 字段，断言 getter 调用次数为 0；
- symbol、extra key、null/custom prototype、数组子类和稀疏数组；
- descriptor-only Proxy，普通 `get` 设置为抛错，合法路径仍通过；
- ownKeys/getPrototypeOf/getOwnPropertyDescriptor 任一 trap 抛错；
- 同一字段第二次 descriptor 改值，断言读取次数精确为 1；
- 模块加载后污染实际使用的 String/Array prototype 方法；
- 合法 JSON clone state 的无效动作保持原引用；
- 非法 state 返回与 canonical 初态深相等但引用不同的新对象。

## 反例

- `hasOwnProperty` 通过后继续 `input.field`；
- 先用 descriptor 判类型，再调用另一个会重读 descriptor 的通用 helper；
- 使用 spread、`Array.from`、迭代器或 `.map()` 复制 hostile 数组；
- 只捕获 Reflect，却继续动态调用字符串/数组原型方法；
- 为了避免 Proxy 问题而把所有跨 realm 数据也默认视为可信普通对象；
- 测试只断言“不抛”，不检查 trap/getter 调用次数和 no-op 引用。

## 本仓库证据

- 星座接线员：`bugs/2026-07-21-constellation-relay-hostile-state-snapshot.md`
- 雪球留言：`bugs/2026-07-23-snow-globe-hostile-input-contract-gaps.md`
- 雪球实现与回归：
  `experiences/surprises/snow-globe-message/logic.js`、
  `experiences/surprises/snow-globe-message/logic.test.js`

本文只沉淀仓库内实现与回归证据，没有新增第三方代码、素材或运行依赖。
