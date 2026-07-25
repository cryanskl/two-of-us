# 绕词对决两张卡未满足冻结内容 Gate

- 日期：2026-07-25
- 项目：`word-detour-duel`
- 影响范围：`daily-04`、`action-09` 与内容 validator

## 缺口

1. `daily-04` 目标为“钥匙”，第四个 forbidden 为“钥匙圈”。提示包含目标本身，
   说出口已经直接违反目标词规则，没有增加第四条独立绕词限制。
2. `action-09` 与 `daily-09` 都使用 forbidden“纸张”，且固定 schedule 把两张卡
   放在 variant 0 / turn 2 的同一个 hand；这违反 brainstorm 冻结的单 hand
   禁用提示唯一性。

原 validator 只检查同卡 exact 重复和 target 与任一 forbidden exact 相同，因此
两项都能通过。

## 修复

- “钥匙圈”改为“随身”；
- `action-09` 的“纸张”改为“翻折”；
- corpus 校验拒绝 target 与同卡 forbidden 互为完整子串；
- schedule 校验拒绝同一 hand 的 24 个 forbidden exact 重复；
- 增加两个敌对变异回归测试。

全库跨 hand 的常用 forbidden 允许复用；本修复没有扩大为 288 项全局唯一，也没有
重排卡片、主题、难度或 schedule。
