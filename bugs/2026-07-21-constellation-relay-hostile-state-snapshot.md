# 星座接线员：自定义数组与延迟 Proxy 绕过状态校验

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把星光，一笔一笔交给你
- 发现版本 / commit：逻辑首次实现，提交前只读复审发现

## 环境

- 文件：`experiences/co-op/constellation-relay/logic.js`
- 接口：`countCompletions()`、`reduce()`、`getPublicView()`
- 启动等级：A；问题属于 hostile JavaScript 输入边界

## 复现步骤

自定义数组继承迭代器：

```js
const ids = ["unknown"];
Object.setPrototypeOf(ids, {
  [Symbol.iterator]: function* () {}
});
logic.countCompletions("spool", ids);
```

自定义完成记录数组的 `map()`：

```js
const moves = [];
Object.setPrototypeOf(moves, {
  map() { throw new Error("polluted map executed"); }
});
logic.reduce({
  phase: "intro", cursorId: "spool", completedMoves: moves,
  attempt: 1, lastResult: null, revision: 0
}, { type: "START" });
```

另可构造具有普通 data descriptor、但在后续 `get` 次数抛错的 Proxy；原 `getPublicView()` 会在 `isState()` 已通过后再次读取它并抛异常。

## 预期结果

公开 API 只接受原生普通数组；任何外部 state、move、result 和点对象只读取一次安全 descriptor 快照。恶意输入不执行继承方法、不抛异常、不发生部分转换。

## 实际结果

- 原数组校验只检查 own keys，没有检查 `Array.prototype`，继承 iterator 可把 `unknown` 隐藏成空数组并错误返回 4；
- `makeState()` 直接调用外部数组 `.map()`，会执行污染原型；
- state 先验证后又读取原 Proxy，形成验证与使用之间的 TOCTOU 窗口。

## 根因

“结构合法”只在一个时点成立，但生产逻辑继续消费了原始外部对象。原型方法、迭代器与 Proxy trap 都可以让验证后的读取看到不同数据或执行调用方代码。

## 解决方案

- `snapshotExactArray()` 只接受 `Object.getPrototypeOf(value) === Array.prototype` 的密集原生数组；
- 逐索引读取 data descriptor，拒绝数组子类、null/custom prototype、额外 key 与继承迭代器；
- state 顶层、completedMoves、move、lastResult 与几何点全部一次性 descriptor 快照；
- reducer 与公开 view 只消费内部冻结副本；合法 no-op 仍返回原引用；
- 非法 hostile state：`getPublicView()` 返回 `null`，`reduce()` 返回全新初态；
- 补充失败 → 重试 → 完成 → FINISH → RESTART 的 JSON 重放。

## 回归验证

- [x] 数组子类、null/custom prototype 与继承 iterator 均被拒绝
- [x] 自定义 `map()` 不执行且 reducer 不抛
- [x] 延迟抛错 Proxy 不再穿过验证边界
- [x] descriptor-only Proxy 可安全流转
- [x] C18 逻辑 41/41 通过
- [x] 全仓 1490/1490 通过

## 相关提交

- 逻辑修复与回归：`6c905ca`
