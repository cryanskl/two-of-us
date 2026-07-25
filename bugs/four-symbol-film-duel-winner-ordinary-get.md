# 四符片名擂台：胜负计算会执行外部 getter

## 现象

公开纯函数 `getWinner(players)` 直接读取 `players.length`、数组索引和两位玩家的
`score`。函数虽然用 `try/catch` 把抛错输入收敛为 `null`，但 getter 或 Proxy
`get` trap 的副作用已经执行。

## 最小复现

```js
let gets = 0;
const players = new Proxy([{ score: 3 }, { score: 1 }], {
  get(target, key, receiver) {
    gets += 1;
    return Reflect.get(target, key, receiver);
  }
});

getWinner(players); // 修复前返回 "A"，同时 gets === 5
```

修复前新增回归测试结果为 `26/27`。

## 影响

- “纯函数”会执行调用方提供的代码；
- 结果可能受 getter 调用次数和顺序影响；
- 与配置、动作和计分输入已经采用的 descriptor snapshot 边界不一致。

内部状态本身受 `WeakSet` 与深冻结保护，因此这不是当前对局篡改漏洞；它是导出
辅助函数的敌意输入边界缺口。

## 根因

异常捕获只能处理 getter 抛错，不能撤销 getter 已经发生的副作用。原实现把
“不让异常逃逸”误当成了“没有执行外部代码”。

## 解决方案

- 用既有定长数组快照复制两位玩家；
- 对每位玩家只读取 own `score` data descriptor；
- accessor、数组子类、稀疏数组、异常代理和非普通对象返回 `null`；
- 保持非负安全整数、A / B / tie 的原有结果合同不变。

## 验证

- descriptor-only Array Proxy 仍返回 `"A"`，普通 `get` 次数为 `0`；
- `score` accessor 返回 `null`，getter 调用次数为 `0`；
- 负分和畸形输入仍返回 `null`；
- 修复后定向测试 `27/27`。

## 可复用经验

本问题同样属于仓库已有的
[单次观察快照](../learn/2026-07-23-single-observation-snapshot-boundary.md)
原则，没有新增重复 `learn/`。`try/catch` 是错误收敛，不是副作用隔离；公开纯
函数若接受对象输入，必须在业务读取前完成数据描述符快照。

## 影响范围

仅修改 `four-symbol-film-duel` 的胜负辅助函数与测试，没有改变计分规则、状态机、
生产 UI、共享依赖、入口、目录或其他体验。
