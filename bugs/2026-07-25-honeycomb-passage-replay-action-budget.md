# 蜜径相逢：公开 replay 未核对 ply 行动预算

- 日期：2026-07-25
- 范围：`experiences/versus/honeycomb-passage/logic.js`
- 发现阶段：非视觉核心再验收
- 发现基线：`d916743`
- 状态：已修复

## 现象

`getLegalMoves`、`getLegalSeals` 与 `hasRouteForBoth` 接受公开 replay 快照。旧校验会
重算 blocked 数量、距离、合法集合和终局，但没有证明位置与封蜡库存能在声明的
`ply` 内形成。

两个固定反例都曾被接受：

1. 从合法 8 次封蜡快照复制全部派生字段，只把 `ply/completedRounds/round` 改成
   `0/0/1`；结果表示对局尚未行动，但双方 8 枚封蜡已经用完；
2. 从双方各移动一步的合法快照复制全部字段，同样把 ply 改为 0；结果表示初局时
   两枚棋子已经离开起点。

这些快照的 active player、距离、合法移动、合法封蜡和 blocked 数量内部一致，
所以旧版 `readReplaySnapshot` 会接受并返回合法行动。

## 影响

公开 replay 不是权威 history，但 helper 一旦接受它，就会为该快照派生行动集合。
不核对 ply 预算会让“不可能由任何对应长度历史形成”的棋盘被当成合法规则状态。

这不会改写 reducer 内部 history，但会破坏公开 API 的 fail-closed 合同，并可能让
未来 UI、预览或测试夹具基于伪造棋盘做决策。

## 红测

新增测试从真实合法 replay 构造上述两个反例，并要求三个公开 helper 全部拒绝：

```text
getLegalMoves(forged) → []
getLegalSeals(forged) → []
hasRouteForBoth(forged, candidate) → false
```

修复前定向结果为 `24 pass / 1 fail`；第一个伪造快照仍返回移动 `-2,0`。

## 根因

旧验证只检查“当前字段能否描述一张自洽棋盘”，没有检查“每位玩家是否拥有足够
行动次数形成这张棋盘”。

对于交替行动规则，在任意 ply：

```text
yellowTurns = ceil(ply / 2)
purpleTurns = floor(ply / 2)
sealsUsed[player] = 4 - sealsRemaining[player]
moveBudget[player] = turns[player] - sealsUsed[player]
```

若 `moveBudget < 0`，库存消耗已经超出行动数。若起点到当前位置的六角图距离大于
moveBudget，棋子也不可能在声明的 ply 内到达。

## 修复

公开 replay 快照校验新增：

- 按 ply 奇偶计算双方已经取得的行动数；
- 封蜡消耗不得超过对应玩家的行动数；
- 剩余移动预算不得小于起点到当前位置的轴坐标最短距离；
- 任一预算矛盾统一 fail closed。

距离只作为必要下界，不取代权威 history replay；真实 reducer 状态仍完全由事件
历史重放产生。

## 验证

```bash
node --check experiences/versus/honeycomb-passage/logic.js
node --test experiences/versus/honeycomb-passage/logic.test.js
```

结果：`25 / 25` 通过。最终全仓结果见
`docs/360-honeycomb-passage-core-verification.md`。

## 修复提交

- `6f069c4 fix: validate honeycomb replay action budgets`
