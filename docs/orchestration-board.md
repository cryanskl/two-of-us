# Two of Us 多 Session 调度看板

> 本文件是动态状态，不是永久规则。永久规则见 [`orchestration-runbook.md`](./orchestration-runbook.md)。
>
> 仅总控修改本文件；每次启动、恢复、集成或调度后都要用仓库事实刷新。

## 当前快照

| 字段 | 当前值 |
| --- | --- |
| 快照日期 | 2026-07-25（Asia/Kuala_Lumpur） |
| 当前分支 | `main` |
| 当前 HEAD | `f38f463` |
| 目标 installed | 75 |
| 当前 catalog 总数 | 58 |
| 当前 installed | 58 |
| 距离目标 | 17 |
| A / B / C / D | 50 / 1 / 6 / 1 |
| surprise / co-op / versus | 17 / 24 / 17 |
| 本次 repository verify | 通过：58 个入口、50 个 A、8 个非 A |
| 本次是否重跑全仓测试 | 是：`2051 / 2051` 通过 |
| 工作树提示 | 照片滑块、双迷宫 core 与企鹅逻辑基础已集成；三个滚动槽位继续从各自已验收 main 基线运行并统一使用根 lockfile |
| 平台真实并发 | 1 个总控 + 3 个执行 Session；第 4 个执行槽位当前不可用 |

快照数字来自 `experiences/catalog.json`；下次总控恢复时必须重新计算。聊天记录、旧 verification 文档和本表都不能替代实时 catalog 与测试结果。

## 执行槽位

| 槽位 | 状态 | 项目 | worktree | 分支 | 基线 SHA | 最近进展 |
| --- | --- | --- | --- | --- | --- | --- |
| Worker 1 | 已分配 | `penguin-flag-duel` core | `/Users/zenith/Desktop/two-of-us-worktrees/penguin-flag-duel-core` | `codex/exp-penguin-flag-duel-core` | `10349e6` | 配置与归属基础已集成；继续修正夹墙重叠边界并实现夺旗闭环与确定性重放 |
| Worker 2 | 已分配 | `twin-orbit` 前置 | `/Users/zenith/Desktop/two-of-us-worktrees/twin-orbit` | `codex/exp-twin-orbit` | `5900cbe` | research、brainstorm、spec、plan；先证明双人相位协作相对现有轨道项目的机制增量 |
| Worker 3 | 已分配 | `ricochet-tank-duel` 前置 | `/Users/zenith/Desktop/two-of-us-worktrees/ricochet-tank-duel` | `codex/exp-ricochet-tank-duel` | `224eaf3` | research、brainstorm、spec、plan；先证明反弹碰撞相对现有对抗项目的机制增量 |
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
| `four-symbol-film-duel` | `280–282` | 第四轮 Worker 1 / 总控 | `280` 内容审计；`281` 视觉提案、`282` 最终验证保留 |
| `dual-maze-race` | `283–286` | 第四轮 Worker 2 | 四阶段前置文档已集成 |
| `photo-slider-race` | `287–290` | 第四轮 Worker 3 | 四阶段前置文档已集成 |
| `penguin-flag-duel` | `291–294` | 滚动补位 Worker 1 | 四阶段前置文档已集成 |
| `photo-slider-race` | `295–296` | 总控 | 视觉提案与最终验证保留 |
| `dual-maze-race` | `297–298` | 总控 | 视觉提案与最终验证保留 |
| `ricochet-tank-duel` | `299–302` | 滚动补位 Worker 3 | 已分配 |
| `penguin-flag-duel` | `303–304` | 总控 | 视觉提案与最终验证保留 |
| `twin-orbit` | `305–308` | 滚动补位 Worker 2 | 已分配 |

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
| `penguin-flag-duel` 逻辑基础 | `6bd7988` | `f38f463` | `node --check`、冻结配置探针、verify 与全仓 `2051 / 2051` 通过 | 配置合同与 Box2D 概念借鉴边界已冻结；无 UI，不计 installed |
| `dual-maze-race` core | `36b7f79`、`4fc259b`、`5d01d13`、`6f0390a` | `cbe8b2b`、`cb5b174`、`09de214`、`8af7fd1`、`5900cbe` | 定向 `23 / 23`；全仓 `2051 / 2051`；坐标转置文档已修正 | 无 UI；键盘、触屏、响应式与 `file://` 未验收，不计 installed |
| `penguin-flag-duel` 前置 | `02f03e1`、`fe26dca`、`e87ff2a`、`3ceb27b` | `e591647`、`821738f`、`3d17125`、`10349e6` | verify 通过；Box2D 固定来源与夺旗闭环边界复核 | Conditional Go；无入口，不计 installed |
| `photo-slider-race` core | `1903397`、`1420e9b`、`6e74078` | `a5a30b5`、`5bb48b2`、`224eaf3` | 定向 `31 / 31`；全仓 `2028 / 2028` | 无 UI；图片解码与 `file://` 未验收，不计 installed |
| `dual-maze-race` 前置 | `f3cf9d6`、`9591933`、`d9f9453`、`455fdf6` | `7247bdd`、`3789839`、`e4e4817`、`4c3c017` | verify 通过；同源迷宫、fixed tick 与换席公平路线成立 | Conditional Go；无入口，不计 installed |
| `photo-slider-race` 前置 | `73e9501`、`0b73c6b`、`63b4b3c`、`ca55123` | `659fbbb`、`b13ca6f`、`8de88db`、`f2876d6` | verify 通过；A 级、本地图片隐私与生命周期路线成立 | 无入口，不计 installed |
| `four-symbol-film-duel` content/core | `45c3303`、`d5a28e2`、`b968529` | `f1501e7`、`f3242d5`、`7b1f390` | 定向 `25 / 25`；全仓 `1997 / 1997` | 无 UI；跨平台字形与盲测未完成，不计 installed |
| `four-symbol-film-duel` 前置 | `bfa5b09`、`0360bdb`、`8606b44`、`a30314e`、`c892d60` | `b140f6b`、`fcc5dd5`、`ccb2f95`、`cb69ed9`、`bbe8c77` | verify 通过；影视表达、Unicode 字符与厂商字形边界复核 | Conditional Go；无入口，不计 installed |
| `word-detour-duel` content/core | `ebdfcb5`、`95209a2`、`54ea6ce` | `0084134`、`4fcafe3`、`10d14fe` | 定向 `16 / 16`；两新内核叠加全仓 `1972 / 1972` | 无 UI，不计 installed |
| `vinyl-secret` core | `b3ab2e4`、`2047303`、`5f1bb51`、`4f1a5ef` | `687d2d9`、`bd1844a`、`241dcdd`、`9a03de5` | 定向 `37 / 37`；单独集成全仓 `1956 / 1956` | 无 UI，不计 installed |
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
