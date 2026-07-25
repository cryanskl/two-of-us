# 这一弹，拐弯见你：结果字段与弹体可泄入矛盾 phase

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`ricochet-tank-duel`
- 发现版本 / commit：`27a2d91`

## 环境

- 操作系统：macOS
- 运行时：Node.js 22，纯 CommonJS 核心测试
- 启动等级与入口：A；问题位于共享于浏览器与 Node 的 `js/simulation.js`

## 复现步骤

1. 创建一个合法 `playing` 状态 clone。
2. 单独把 `pendingMatchResult` 或 `matchResult` 改为合法枚举值。
3. 或把带弹体的状态改为 `round-result` / `match-result` 并补齐局部字段。
4. 调用 `validateState(raw)`。

## 预期结果

结果字段和弹体集合必须与 phase 联合一致：

- `pendingMatchResult` 只能存在于 `round-result`；
- `matchResult` 只能存在于 `match-result`；
- `round-result` 必须有 `lastRoundResult` 且已经清空弹体；
- `match-result` 必须有 `matchResult` 且已经清空弹体；
- `paused -> countdown` 仍允许保留在途弹体。

## 实际结果

validator 只检查 phase、结果枚举和倒计时字段各自是否合法，没有检查它们的组合。
因此可接受“playing 已有待结算结果”“round-result 没有回合结果”或“终局仍有弹体”
等无法由 reducer 正常生成的矛盾状态。

## 根因

`validatePhaseFields` 实现了局部值域校验，却漏掉状态机的跨字段不变量。后续 reducer
会根据 phase 选择不同分支，这类伪造状态可能让结果提前生效、遗留弹体或产生无法
重放的状态。

## 解决方案

- 将 pending/result 的非空条件与唯一合法 phase 绑定；
- 要求 `round-result` 的 `lastRoundResult` 非空且 bullets 为空；
- 要求 `match-result` 的 `matchResult` 非空且 bullets 为空；
- 不对 `paused` 和 `countdown` 添加清弹约束，保留暂停恢复合同；
- 增加每种矛盾组合的 validator 回归。

## 回归验证

- [x] pending/result 泄入错误 phase 被拒绝
- [x] 缺失 `lastRoundResult` 的 `round-result` 被拒绝
- [x] 带弹体的 `round-result` / `match-result` 被拒绝
- [x] 合法回合结果和终局状态继续通过
- [x] 暂停恢复保留弹体测试继续通过
- [x] 定向测试、全仓测试与仓库验收通过

## 相关提交

- 本修复提交
