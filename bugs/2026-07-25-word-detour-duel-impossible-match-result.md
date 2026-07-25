# 绕词对决终局派生接受不可能的回合记录

- 日期：2026-07-25
- 项目：`word-detour-duel`
- 影响范围：公开 `deriveMatchResult(confirmedTurns)` API
- 严重度：中；内建 reducer 不会生成这些记录，但公开纯函数会把无效 DTO 当真

## 现象

修复前，以下结构仍能得到终局：

- `finishReason: "cards-complete"`，但 results 为空或少于六张；
- `finishReason: "time-expired"`，但 results 已有六张；
- 不同回合重复使用同一个 cardId；
- 使用题库外 cardId，或不按任一固定 schedule 的当前 hand 前缀排列。

例如四个空的 `cards-complete` 回合会被派生成 `0 : 0` 平局。

## 根因

`parseConfirmedTurns()` 只复用单回合 `parseResults()` 的字段、长度上限和局部去重，
没有验证 finishReason 与数量的对应关系，也没有建立整局 cardId 集合。

## 修复

在终局派生边界增加三项结构不变量：

- `cards-complete` 必须恰好六张；
- `time-expired` 必须少于六张；
- cardId 在四回合中全局唯一；
- 四个回合必须共同匹配至少一套固定 schedule 的逐回合前缀。

`deriveMatchResult()` 未显式传 config 时使用 `DEFAULT_CONFIG`；reducer 传入当前
冻结 config，因此合法自定义题库仍按自己的 schedule 验证。函数不需要信任 action
提供 variant：它检查是否至少存在一个 variant 能解释全部已确认回合。

## 验证

回归测试覆盖合法平局、合法一席获胜、少卡完成、六卡超时、跨回合重复和未知卡。
内建四回合 happy path 继续由真实 reducer 完整重放。
