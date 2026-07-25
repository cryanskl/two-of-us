# Two of Us 多 Session 调度看板

> 本文件是动态状态，不是永久规则。永久规则见 [`orchestration-runbook.md`](./orchestration-runbook.md)。
>
> 仅总控修改本文件；每次启动、恢复、集成或调度后都要用仓库事实刷新。

## 当前快照

| 字段 | 当前值 |
| --- | --- |
| 快照日期 | 2026-07-25（Asia/Kuala_Lumpur） |
| 当前分支 | `main` |
| 当前 HEAD | `a951e52` |
| 目标 installed | 75 |
| 当前 catalog 总数 | 58 |
| 当前 installed | 58 |
| 距离目标 | 17 |
| A / B / C / D | 50 / 1 / 6 / 1 |
| surprise / co-op / versus | 17 / 24 / 17 |
| 本次 repository verify | 通过：58 个入口、50 个 A、8 个非 A |
| 本次是否重跑全仓测试 | 是：`1919 / 1919` 通过 |
| 工作树提示 | 第二轮 3 项已独立集成；第三轮 3 个独立工作树已从 `a951e52` 建立并按根 lockfile 安装依赖 |
| 平台真实并发 | 1 个总控 + 3 个执行 Session；第 4 个执行槽位当前不可用 |

快照数字来自 `experiences/catalog.json`；下次总控恢复时必须重新计算。聊天记录、旧 verification 文档和本表都不能替代实时 catalog 与测试结果。

## 执行槽位

| 槽位 | 状态 | 项目 | worktree | 分支 | 基线 SHA | 最近进展 |
| --- | --- | --- | --- | --- | --- | --- |
| Worker 1 | 已分配 | `vinyl-secret` core | `/Users/zenith/Desktop/two-of-us-worktrees/vinyl-secret-core` | `codex/exp-vinyl-secret-core` | `a951e52` | 实现 12 圈、三条有序秘密轨道、四级文字信号和公开 view；不创建 UI |
| Worker 2 | 已分配 | `word-detour-duel` content/core | `/Users/zenith/Desktop/two-of-us-worktrees/word-detour-duel` | `codex/exp-word-detour-duel` | `a951e52` | 先完成 72 张原创卡审计，再实现纯逻辑状态机；两阶段独立提交 |
| Worker 3 | 已分配 | `emoji-movie-duel` 前置 | `/Users/zenith/Desktop/two-of-us-worktrees/emoji-movie-duel` | `codex/exp-emoji-movie-duel` | `a951e52` | research、brainstorm、spec、plan；先审计影视表达、emoji 字形与题库权利边界 |
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
| `compliment-reels` | `254–255` | 首轮 Worker 1 | plan/core 已集成；`255` 保留后续验证 |
| `capsule-docking` | `256–258` | 首轮 Worker 2 / 总控 | plan/core 已集成；`258` 保留视觉提案 |
| `kaleidoscope-names` | `259–262` | 首轮 Worker 3 | 四阶段前置文档已集成 |
| `taboo-description-duel` / `word-detour-duel` | `263–266` | 第二轮 Worker 2 | 四阶段前置文档已集成 |
| `vinyl-secret` | `267–270` | 第二轮 Worker 3 | 四阶段前置文档已集成 |
| `emoji-movie-duel` | `271–274` | 第三轮 Worker 3 | 已分配 |
| `word-detour-duel` | `275–277` | 第三轮 Worker 2 / 总控 | `275` 内容审计；`276` 视觉提案、`277` 最终验证保留 |
| `vinyl-secret` | `278–279` | 总控 | 视觉提案与最终验证保留 |

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
| `compliment-reels` | 生产 UI 尚未获确认 | `docs/198-compliment-reels-design-proposal.md` | 用户 | 确认整体方向、320px 标签与终局标题后再派发 UI |
| `capsule-docking` | 生产 UI 等待视觉方向选择 | `docs/208-capsule-docking-imagegen-brief.md` | 用户 | 从总控生成的三个视觉方向中选择或提出修改 |

## 最近集成

| 项目 | 项目 commits | 总控集成 commit | Gate | 备注 |
| --- | --- | --- | --- | --- |
| `word-detour-duel` 前置 | `17b9461`、`c3b2e15`、`aa93f35`、`dfac705`、`877b410`、`fc63e54` | `b056a92`、`3096fd9`、`b0bfcbe`、`e0b0a54`、`ab41704`、`a951e52` | verify 通过；商标、题库与 Page Visibility 一手来源复核 | 无入口，不计 installed |
| `vinyl-secret` 前置 | `d752347`、`f6b53c0`、`b6570a4`、`856a11e` | `b6fa451`、`633bae0`、`48e04ba`、`4bb18a0` | verify 通过；默认无音频 A 级路线成立 | 无入口，不计 installed |
| `kaleidoscope-names` core | `9c46491`、`31d6d35` | `7abf729`、`76f50e9` | 定向 `24 / 24`；全仓 `1919 / 1919` | 无 UI，不计 installed |
| `capsule-docking` core | `5f2c7ef`、`cb4395a` | `11cbf83`、`4172fc9` | 定向 `21 / 21`；全仓 `1895 / 1895` | 无 UI，不计 installed |
| `kaleidoscope-names` 前置 | `5604e12`、`7e547a4`、`5785ed0`、`2293b59` | `a433193`、`973b2b3`、`1e41f73`、`22c1b80` | verify 通过；A 级可行性成立 | 无入口，不计 installed |
| `compliment-reels` core | `c9cf9bf`、`dc271fb` | `8dce492`、`b08be37` | 定向 `23 / 23`；全仓 `1895 / 1895` | 无 UI，不计 installed |
| shared static worktree test | — | `8f63e08` | 主工作树与全仓回归通过 | 移除 checkout 目录名硬编码 |
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
