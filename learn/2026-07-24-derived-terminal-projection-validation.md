# 派生终局投影：既要验证“有结果”，也要证明“不能没有结果”

适用范围：把权威 history/state 投影成 replay、public view、缓存快照或可序列化
结果，并允许这些投影再次进入公开 helper 的本地游戏规则层。

## 核心结论

派生投影不是权威历史，但一旦公开 API 接受它，它就成了新的输入边界。只检查
字段类型与“声明的 result 看起来合理”不够；验证必须是双向的：

```text
result != null
  → 终局事实、行动者、原因和优先级全部匹配

result == null
  → 到边未发生、上限未到、当前行动者至少有一个合法行动
```

第二条经常被漏掉。它防止“已经终局但故意把 result 清空”的快照重新进入合法
行动枚举。

## 从 ply 恢复行动者语义

严格交替的双人游戏无需把 actor 再存一份。若 `ply` 从 1 开始：

```text
刚完成行动者 = (ply - 1) % 2
下一行动者   = ply % 2
```

因此：

- `reached-goal.winner` 必须是刚完成行动者；
- `immobilizedPlayer` 必须是下一行动者；
- 第 32 ply 的回合上限没有“下一行动者无行动”这一第二终局；
- 只验证“winner 的棋子在目标边”会错误接纳非本手玩家的伪造结果。

该规律适用于严格交替且每次只有一个权威事件的游戏；额外行动、跳过回合或同时
行动必须从自己的事件模型派生 actor，不能机械套用 `% 2`。

## 终局优先级必须进入验证器

若生产 reducer 的顺序是：

```text
reached-goal
→ round-limit
→ immobilized
→ continue
```

那么 projection validator 也要使用同一顺序。否则同一个棋盘可能被接受为两个
不同 reason：

- 第 32 手到边应是 `reached-goal`，不能被 round-limit 覆盖；
- 第 32 手后不再检查 immobilized；
- 未到上限但下一位无任何实际行动，不能继续声称 result=null。

最好让生产终局与投影验证共用 raw predicate/helper，而不是分别维护自然语言
判断。

## 永久可达不等于当前有行动

路径游戏里还要区分两个谓词：

- 永久可达：只把永久障碍视为墙；
- 当前可行动：还要考虑对手临时占位、库存和行动规则。

“双方 BFS 仍有路”不能证明当前玩家有合法行动。若 `result=null`，验证器必须用
生产同源的 `getLegalMovesRaw + getLegalSealsRaw` 检查，而不是只看 shortest
distance。

## 与单次观察快照的组合

输入观察先遵循
[`单次观察快照`](./2026-07-23-single-observation-snapshot-boundary.md)：

1. 一次读取 prototype、ownKeys 与 descriptor；
2. 复制成内部普通数据；
3. 此后不再普通读取调用方对象。

然后对内部副本做本篇的语义闭包验证。两层解决的是不同问题：

- 单次观察防止输入在验证与使用之间变化；
- 终局投影验证防止一份结构稳定但业务自相矛盾的快照被接纳。

## 最小验证矩阵

- 到边 result 的 winner 不是刚行动者；
- immobilizedPlayer 不是下一行动者；
- 已到目标边但 result=null；
- 达到最大 ply 但 result=null；
- 无实际行动但 result=null；
- 到边与回合上限同手发生，确认到边优先；
- 回合上限与无行动同手发生，确认上限优先；
- 非终局快照仍能枚举至少一个生产合法行动；
- descriptor-only Proxy 不触发普通 `get`；
- 合法 state 的非法 action 保持原引用。

## 本仓库证据

- bug：`bugs/2026-07-24-honeycomb-passage-replay-input-boundaries.md`
- 规格：`docs/224-honeycomb-passage-spec.md`
- 实现与回归：
  `experiences/versus/honeycomb-passage/logic.js`、
  `experiences/versus/honeycomb-passage/logic.test.js`
- 修复提交：`9b6c699`

本文只沉淀本仓库实现与回归证据，没有新增第三方代码、素材或运行依赖。

