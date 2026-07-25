# dual-maze-race maze Proxy 二次读取抛错

## 状态

- 发现日期：2026-07-25
- 影响范围：`createInitialState({ mazes })` 的 hostile input 边界
- 当前处理：已修复并加入晚抛 get trap 回归

## 现象

旧 `readMazes()` 先通过 descriptor 快照让 `validateMaze()` 验证 maze，之后却再次
直接读取原对象：

```js
mazes[index].seed
mazes[index].fingerprint
```

一个 descriptor 视图完全合法、但普通 `get("seed")` 抛错的 Proxy 因此能穿过
第一层校验并让 `createInitialState()` 抛出 `late hostile get`。

## 根因

同一不可信对象被观察了两次，而且两次使用不同机制。第一次只读取 own data
descriptor；第二次触发普通属性访问。Proxy 可以让两次观察给出不同行为，破坏
“先快照、后只处理内部普通数据”的边界。

## 修复

`readMazes()` 现在先用 `readMaze()` 取得普通 DTO，后续结构诊断、seed 和
fingerprint 比较都只读取该快照，不再回读原 Proxy。

回归测试使用真实默认 maze 作为 Proxy target，让 `get("seed")` 抛错，同时保留
合法 descriptor。新实现不会执行该 trap，能安全接受快照、保留玩家名字，并继续
只使用冻结的 `DEFAULT_MAZES`。

相关通用原则已记录在
[`learn/2026-07-23-single-observation-snapshot-boundary.md`](../learn/2026-07-23-single-observation-snapshot-boundary.md)。
