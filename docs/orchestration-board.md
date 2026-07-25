# Two of Us 多 Session 调度看板

> 本文件是动态状态，不是永久规则。永久规则见 [`orchestration-runbook.md`](./orchestration-runbook.md)。
>
> 仅总控修改本文件；每次启动、恢复、集成或调度后都要用仓库事实刷新。

## 当前快照

| 字段 | 当前值 |
| --- | --- |
| 快照日期 | 2026-07-25（Asia/Kuala_Lumpur） |
| 当前分支 | `main` |
| 当前 HEAD | `a6ca6891e5f2` |
| 目标 installed | 75 |
| 当前 catalog 总数 | 58 |
| 当前 installed | 58 |
| 距离目标 | 17 |
| A / B / C / D | 50 / 1 / 6 / 1 |
| surprise / co-op / versus | 17 / 24 / 17 |
| 本次 repository verify | 通过：58 个入口、50 个 A、8 个非 A |
| 本次是否重跑全仓测试 | 否；派发前已重跑 repository verify |
| 工作树提示 | 主工作树仅有用户原有未跟踪文件 `docs/goal.md`；3 个执行工作树均固定于 `a6ca689` |
| 平台真实并发 | 1 个总控 + 3 个执行 Session；第 4 个执行槽位当前不可用 |

快照数字来自 `experiences/catalog.json`；下次总控恢复时必须重新计算。聊天记录、旧 verification 文档和本表都不能替代实时 catalog 与测试结果。

## 执行槽位

| 槽位 | 状态 | 项目 | worktree | 分支 | 基线 SHA | 最近进展 |
| --- | --- | --- | --- | --- | --- | --- |
| Worker 1 | 已分配 | `compliment-reels` | `/Users/zenith/Desktop/two-of-us-worktrees/compliment-reels` | `codex/exp-compliment-reels` | `a6ca689` | 仅实施 plan 与非视觉 core，不越过待确认的 UI Gate |
| Worker 2 | 已分配 | `capsule-docking` | `/Users/zenith/Desktop/two-of-us-worktrees/capsule-docking` | `codex/exp-capsule-docking` | `a6ca689` | 仅实施 plan 与非视觉 core，不越过待确认的 UI Gate |
| Worker 3 | 已分配 | `kaleidoscope-names` | `/Users/zenith/Desktop/two-of-us-worktrees/kaleidoscope-names` | `codex/exp-kaleidoscope-names` | `a6ca689` | 完成 research、brainstorm、spec、plan，先做可行性与来源边界 |
| Worker 4 | 不可用 | — | — | — | — | 平台并发上限为 4 个总会话，已包含总控，不虚报执行 Session |

若平台实际并发上限不足 4，保留槽位定义，但只使用真实可用的 Session，不虚报运行状态。

## Ready for Review

当前为空。

| 项目 | 分支 | commits | 测试 | 浏览器 | 许可证 | 总控结论 |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — |

## 建议首轮候选

以下项目已有较完整的前置研究或规格，但其现有设计文档明确要求用户确认后才能生产 UI，因此保留为待确认候选：

| 优先级 | 项目 ID | 分类 | 预计等级 | 已有前置材料 | 派发前检查 |
| --- | --- | --- | --- | --- | --- |
| P0 | `wish-fireworks` | surprise | A | research、spec、design、plan、source refresh | 确认素材、闪烁 Gate 和降动效 |
| P0 | `snow-globe-message` | surprise | A | research、spec、design、plan、source refresh | 确认粒子性能、触屏与文字回退 |
| P0 | `flower-language-bouquet` | surprise | A | research、spec、design、plan、source refresh | 确认导出与本地图片隐私 |
| P0 | `candle-wishes` | surprise | A | research、spec、design、plan | 确认输入顺序、火焰降级和来源声明 |

## 后续候选队列

队列只表示“值得复核”，不表示已经获准复制、已完成规格或必然进入 75：

1. `compliment-reels`
2. `shadow-duet`
3. `shadow-sword-duel`
4. `honeycomb-passage`
5. `capsule-docking`
6. `vinyl-secret`
7. `twin-orbit`
8. `kaleidoscope-names`
9. `emoji-movie-duel`
10. `taboo-description-duel`
11. `ricochet-tank-duel`
12. `photo-slider-race`
13. `dual-maze-race`
14. `penguin-flag-duel`

总控也可以从 [`251-local-first-second-pass-candidate-refresh.md`](./251-local-first-second-pass-candidate-refresh.md) 选择更合适的合法候选，但必须先检查与现有 58 项的机制重复，并更新本队列。

## 文档编号预留

派发前重新扫描确认最大编号是 `253`；下列编号区间已互斥预留：

| 项目 | 预留编号 | 所有者 | 状态 |
| --- | --- | --- | --- |
| `compliment-reels` | `254–255` | Worker 1 | 已分配 |
| `capsule-docking` | `256–258` | Worker 2 | 已分配 |
| `kaleidoscope-names` | `259–262` | Worker 3 | 已分配 |

执行 Session 不得自行抢占未在本表登记的编号。

## Blocked

| 项目 | 阻塞原因 | 已有证据 | 需要谁决定 | 下一步 |
| --- | --- | --- | --- | --- |
| `wish-fireworks` | 生产 UI 尚未获确认 | `docs/229-wish-fireworks-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |
| `snow-globe-message` | 生产 UI 尚未获确认 | `docs/210-snow-globe-message-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |
| `flower-language-bouquet` | 生产 UI 尚未获确认 | `docs/187-flower-language-bouquet-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |
| `candle-wishes` | 生产 UI 尚未获确认 | `docs/217-candle-wishes-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |
| `shadow-duet` | 生产 UI 尚未获确认 | `docs/205-shadow-duet-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |
| `shadow-sword-duel` | 生产 UI 尚未获确认 | `docs/222-shadow-sword-duel-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |
| `honeycomb-passage` | 生产 UI 尚未获确认 | `docs/226-honeycomb-passage-design-proposal.md` | 用户 | 确认或修改视觉方案后再派发 UI |

## 最近集成

| 项目 | 项目 commits | 总控集成 commit | Gate | 备注 |
| --- | --- | --- | --- | --- |
| `heart-catapult` | 见 Git 历史 | `8cd34eb` 为当前文档验证提交 | 已在既有文档中记录 | 本看板未重跑其测试 |

## 每次更新清单

- [ ] 重算 catalog 总数、installed、A/B/C/D 和三分类数量
- [ ] 核对 `git worktree list`、活动分支和真实 Session
- [ ] 更新四个执行槽位
- [ ] 更新 Ready for Review 与 Blocked
- [ ] 为新项目预留唯一文档编号
- [ ] 记录已集成 commits 和 Gate 证据
- [ ] 集成后立即补发空闲槽位
- [ ] 只在全仓测试、verify 和门户验证后增加 installed
