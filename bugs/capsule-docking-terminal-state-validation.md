# capsule-docking 终局状态被错误回退到初态

- 日期：2026-07-25
- 影响范围：第三段完成后的 `mission-result → complete`
- 状态：已修复

## 复现与影响

三条冻结金路径均成功后派发 `NEXT_LEG` 可得到 `mission-result`，但随后派发
`FINISH` 会返回全新 `intro`，公开视图也错误显示 Gate 可见。

## 根因

state validator 对完成记录前缀的上限只为 `docked` 增加一项。合法终局使用
`legIndex=2` 和三条完成记录，却被旧条件按“最多两条”拒绝；`reduce()` 按安全
合同把非法 state 回退成初态。

## 修复

完成记录上限现在按 phase 精确计算：

- `intro / leg-intro / approaching / failed`：记录数不得超过当前 `legIndex`；
- `docked / mission-result / complete`：记录数不得超过 `legIndex + 1`。

它允许合法三段终局，同时仍拒绝进行中阶段提前注入未来记录。

## 回归

项目测试完整重放三段，依次断言 `docked → mission-result → complete → intro`，
并核对终局 Gate 隐藏、三段共同 summary 和 revision 连续递增。
