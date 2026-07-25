# 四符片名擂台：配置校验会触发普通 getter

## 现象

非视觉核心审计发现，`sanitizeConfig()` 在解析 token 的 `concepts` 数组时会读取
`item.concepts.length`；`validateGameData()` 也会直接读取候选对象的
`genres`、`tokens`、`cards` 和 `packs`。

因此，一个结构合法但拦截普通属性读取的 Array Proxy 会让配置净化直接抛错；一个
顶层 Proxy 或 accessor 则会在开发校验过程中执行外部代码。

## 最小复现

```js
const candidate = editableConfig();
candidate.tokens[0].concepts = new Proxy(candidate.tokens[0].concepts, {
  get() {
    throw new Error("ordinary get");
  }
});

sanitizeConfig(candidate); // 修复前抛出 ordinary get
```

修复前新增回归测试结果为 `25/26`，失败栈指向 `parseTokens()` 对
`item.concepts.length` 的读取。

## 影响

- `sanitizeConfig()` 未能履行“非法或敌意候选配置原子回退默认配置”的边界；
- `validateGameData()` 可能执行输入 getter，校验结果因副作用而不再确定；
- 浏览器全局配置、测试夹具或未来扩展输入都可能借此越过纯数据边界。

该问题不泄露题目答案，也不涉及网络或持久化，但会破坏纯逻辑 API 的
fail-closed 合同。

## 根因

外层对象和定长数组已经使用 property descriptor 复制数据，但两个入口仍保留了
普通属性读取：

1. 可变长度 `concepts` 为取得长度先执行 `.length`；
2. `validateGameData()` 在快照前直接解引用顶层字段。

这是“部分使用 descriptor snapshot”留下的边界缺口。

## 解决方案

- `snapshotArray()` 从 `length` 的 own data descriptor 校验长度；
- 新增有界数组快照，先从 descriptor 取得 `concepts` 长度并限制为 `1..5`；
- `validateGameData()` 先快照 `tokens`、`cards`、`packs` 和可选 `genres`；
- 相关 accessor 只返回结构错误，代理元操作异常继续安全收敛为 hostile 错误；
- 不放宽稀疏数组、数组子类、额外索引或 getter 的既有拒绝规则。

## 验证

- 红灯证据：修复前定向测试 `25/26`；
- 修复后 `node --check logic.js` 通过；
- 修复后定向测试 `26/26`；
- 普通 getter 调用计数保持为 `0`；
- 合法 descriptor-only Proxy 仍可得到空错误数组；
- accessor 输入不执行 getter，并返回非空结构错误。

## 可复用经验

本问题属于仓库已有的
[单次观察快照](../learn/2026-07-23-single-observation-snapshot-boundary.md)
模式：快照边界必须覆盖每一层元数据读取，不能在 descriptor 复制之间夹入一次普通
`.length` 或字段解引用。本次没有新增独立 `learn/`，避免重复沉淀同一原则。

## 影响范围

仅修改 `four-symbol-film-duel` 的纯逻辑配置解析和测试，没有生产 UI、共享依赖、
入口、目录或其他体验改动。
