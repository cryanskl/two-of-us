# Bug：成功关卡暂停后 public view 静默回到 intro

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 非视觉核心
- 发现版本 / commit：未提交的领域逻辑阶段

## 环境

- 操作系统：macOS
- Node.js：当前仓库锁定环境
- 启动等级与入口：目标 A 级；当前无生产入口

## 复现步骤

1. 构造第 1 关 tick 59 的合法状态：左星外轨 178，右星内轨 467。
2. 推进一个 tick，确认进入 `gate-success`。
3. dispatch `SUSPEND { reason: "hidden" }`。
4. 对返回 state 调用 `getPublicView()`。

## 预期结果

成功结果保持 `gate-success`；实时 held 被清空，input epoch 递增，已经确认的
目标 lane、crossing tick 和 completed gate 不回滚。

## 实际结果

初版 SUSPEND 同时把两席 lane 强制改成 outer。右星原本以内轨命中，修改后的
state 不再满足 gate-success 的目标 lane invariant。`getPublicView()` 将其视为
畸形外部 state 并安全回退 canonical intro，造成已确认结果视觉丢失。

## 根因

把两个不同概念错误合并：

- `held`：仍然活跃的实时输入，暂停时必须清空；
- `lane`：本次终态事件的权威半径投影，成功后必须保留。

进行态要求 `lane === (held ? inner : outer)`；成功/完成终态则允许清 held 后继续
保留命中 lane。

## 解决方案

- SUSPEND 在 `gate-success` / `complete` 只清 held，不改 lane/crossing；
- state validator 仅在 intro、gate-intro、playing、gate-retry 强制 lane/held
  一致；
- 新增成功后 hidden 回归，验证 state、public view、epoch 和 completed prefix。

## 回归验证

- [x] 项目测试通过
- [x] `node --check` 通过
- [x] `git diff --check` 通过
- [x] `npm run verify` 通过

## 相关提交

- 本领域逻辑提交
