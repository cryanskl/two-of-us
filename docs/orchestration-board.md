# Two of Us 多 Session 调度看板

> 本文件是动态状态，不是永久规则。永久规则见 [`orchestration-runbook.md`](./orchestration-runbook.md)。
>
> 仅总控修改本文件；每次启动、恢复、集成或调度后都要用仓库事实刷新。

## 当前快照

| 字段 | 当前值 |
| --- | --- |
| 快照日期 | 2026-07-25（Asia/Kuala_Lumpur） |
| 当前分支 | `main` |
| 当前 HEAD | `ba7c0ce` |
| 目标 installed | 75 |
| 当前 catalog 总数 | 58 |
| 当前 installed | 58 |
| 距离目标 | 17 |
| A / B / C / D | 50 / 1 / 6 / 1 |
| surprise / co-op / versus | 17 / 24 / 17 |
| 本次 repository verify | 通过：58 个入口、50 个 A、8 个非 A |
| 本次是否重跑全仓测试 | 是：`2270 / 2270` 通过 |
| 工作树提示 | `candle-wishes`、`snow-globe-message` 核心复验与 `our-place-guess` 视觉提案均已集成；四个滚动槽位继续既有核心审计 |
| 平台真实并发 | 1 个总控 + 4 个执行 Session |

快照数字来自 `experiences/catalog.json`；下次总控恢复时必须重新计算。聊天记录、旧 verification 文档和本表都不能替代实时 catalog 与测试结果。

## 执行槽位

| 槽位 | 状态 | 项目 | worktree | 分支 | 基线 SHA | 最近进展 |
| --- | --- | --- | --- | --- | --- | --- |
| Worker 1 | 已分配 | `compliment-reels` 现有核心再验收 | `/Users/zenith/Desktop/two-of-us-worktrees/compliment-reels-core-audit` | `codex/exp-compliment-reels-core-audit` | `44b5edc` | 烟花来源漂移修复与核心复验已集成并释放槽位；现复核赞美转轮内容、reducer、隐私、确定性与固定来源，不写生产 UI |
| Worker 2 | 已分配 | `kaleidoscope-names` 现有核心再验收 | `/Users/zenith/Desktop/two-of-us-worktrees/kaleidoscope-names-core-audit` | `codex/exp-kaleidoscope-names-core-audit` | `9ed8cc4` | 雪景球核心复验已集成并释放槽位；现已复现 frozen content 信任边界缺口，按红测、修复和 bug 记录推进 |
| Worker 3 | 已分配 | `capsule-docking` 现有核心再验收 | `/Users/zenith/Desktop/two-of-us-worktrees/capsule-docking-core-audit` | `codex/exp-capsule-docking-core-audit` | `2d442c0` | 烛愿核心复验已集成并释放槽位；现已复现 hostile composer/control 缺口，按修复、bug、learn 和复验推进 |
| Worker 4 | 已分配 | `word-detour-duel` 现有核心再验收 | `/Users/zenith/Desktop/two-of-us-worktrees/word-detour-duel-core-audit` | `codex/exp-word-detour-duel-core-audit` | `ba7c0ce` | 地点竞猜视觉提案已集成并释放槽位；现复核词语内容、交接遮挡、确定性、来源和机制去重，不写生产 UI |

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

当前已使用或预留到 `351`；下列编号区间已互斥预留：

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
| `photo-slider-race` | `295–296` | 总控 | `295` 视觉提案已集成；`296` 最终验证保留 |
| `dual-maze-race` | `297–298` | Worker 3 / 总控 | `297` 视觉提案已集成；`298` 最终验证保留 |
| `ricochet-tank-duel` | `299–302` | 滚动补位 Worker 1 | 四阶段前置已集成；core 进行中 |
| `penguin-flag-duel` | `303–304` | Worker 3 / 总控 | `303` 视觉提案已集成并等待用户确认；`304` 最终验证保留 |
| `twin-orbit` | `305–308` | 滚动补位 Worker 2 | 四阶段前置与两次来源校正已集成；core 进行中 |
| `twin-orbit` | `309–311` | Worker 2 / 总控 | `309` 核心验收、`310` 视觉提案已集成并等待用户确认；`311` 最终验证保留 |
| `ricochet-tank-duel` | `312–313` | Worker 1 / 总控 | `312` 视觉提案已集成并等待用户确认；`313` 最终验证保留 |
| `kaleidoscope-names` | `314–315` | Worker 3 / 总控 | `314` 视觉提案已集成并等待用户确认，`315` 最终验证保留 |
| `word-detour-duel` | `316–317` | Worker 2 / 总控 | `316` 视觉提案已集成并等待用户确认，`317` 最终验证保留 |
| `four-symbol-film-duel` | `318–319` | Worker 1 / 总控 | `318` 视觉提案已集成并等待用户确认，`319` 最终验证保留 |
| `vinyl-secret` | `320–321` | Worker 3 / 总控 | `320` 视觉提案已集成并等待用户确认，`321` 最终验证保留 |
| `memory-merge-board` | `322–325` | Worker 1 | research、brainstorm、spec、plan 四阶段均已集成 |
| `seven-piece-duet` | `326–329` | Worker 2 | research、brainstorm、spec、plan 四阶段及边界修订均已集成 |
| `our-place-guess` | `330–333` | Worker 3 | research、brainstorm、spec、plan 四阶段及隐私/顺序修订均已集成 |
| `memory-merge-board` | `334–336` | Worker 1 / Worker 4 / 总控 | `334` 核心验证、`335` 视觉提案已集成并等待用户确认；`336` 最终验证保留 |
| `seven-piece-duet` | `337–339` | Worker 2 / Worker 1 / 总控 | `337` 核心验证、`338` 视觉提案已集成并等待用户确认；`339` 最终验证保留 |
| `our-place-guess` | `340–342` | Worker 3 / Worker 4 / 总控 | `340` 核心验证、`341` 视觉提案已集成并等待用户确认；`342` 最终验证保留 |
| `shadow-duet` | `343` | Worker 3 | 现有核心再验收已集成；生产 UI 仍等待 `205` 用户确认 |
| `wish-fireworks` | `344` | Worker 1 | 现有核心再验收与一处来源漂移修复已集成；生产 UI 仍等待 `229` 用户确认 |
| `snow-globe-message` | `345` | Worker 2 | 现有核心再验收已集成；生产 UI 仍等待 `210` 用户确认 |
| `flower-language-bouquet` | `346` | Worker 3 | 现有核心再验收已集成；生产 UI 仍等待 `187` 用户确认 |
| `candle-wishes` | `347` | Worker 3 | 现有核心再验收已集成；生产 UI 仍等待 `217` 用户确认 |
| `compliment-reels` | `348` | Worker 1 | 现有核心再验收进行中；生产 UI 仍等待 `198` 用户确认 |
| `capsule-docking` | `349` | Worker 3 | 现有核心再验收进行中；生产 UI 仍等待视觉方向选择 |
| `kaleidoscope-names` | `350` | Worker 2 | 现有核心再验收进行中；生产 UI 仍等待 `314` 用户确认 |
| `word-detour-duel` | `351` | Worker 4 | 现有核心再验收进行中；生产 UI 仍等待 `316` 用户确认 |

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
| `photo-slider-race` | 生产 UI 等待视觉方向确认 | `docs/295-photo-slider-race-design-proposal.md` | 用户 | 确认深夜蓝、暖金/珊瑚双棋盘方向或提出修改 |
| `dual-maze-race` | 生产 UI 等待视觉方向确认 | `docs/297-dual-maze-race-design-proposal.md` | 用户 | 确认纸白共享迷宫桌、钴蓝圆点/朱砂菱形方向或提出修改 |
| `penguin-flag-duel` | 生产 UI 等待视觉方向确认 | `docs/303-penguin-flag-duel-design-proposal.md` | 用户 | 确认极夜冰场、点阵/条纹基地与原创几何企鹅方向或提出修改 |
| `twin-orbit` | 生产 UI 等待视觉方向确认 | `docs/310-twin-orbit-design-proposal.md` | 用户 | 确认午夜双环刻度盘、琥珀星/雾蓝菱形方向或提出修改 |
| `ricochet-tank-duel` | 生产 UI 等待视觉方向确认 | `docs/312-ricochet-tank-duel-design-proposal.md` | 用户 | 确认深靛棱镜折射台、珊瑚/湖蓝双席方向或提出修改 |
| `kaleidoscope-names` | 生产 UI 等待视觉方向确认 | `docs/314-kaleidoscope-names-design-proposal.md` | 用户 | 确认深紫光学调校台、单人异步揭晓方向或提出修改 |
| `word-detour-duel` | 生产 UI 等待视觉方向确认 | `docs/316-word-detour-duel-design-proposal.md` | 用户 | 确认纸面路线改道指挥台、中央目标与四条封路方向或提出修改 |
| `four-symbol-film-duel` | 生产 UI 等待视觉方向确认 | `docs/318-four-symbol-film-duel-design-proposal.md` | 用户 | 确认复古影院票根台、猜题与交接遮挡方向或提出修改 |
| `vinyl-secret` | 生产 UI 等待视觉方向确认 | `docs/320-vinyl-secret-design-proposal.md` | 用户 | 确认私人压片工作台、默认无音频和异步单人寻轨方向或提出修改 |
| `memory-merge-board` | 生产 UI 等待视觉方向确认 | `docs/335-memory-merge-board-design-proposal.md` | 用户 | 确认冷雾蓝共同剪贴簿、共享 3×4 拼板与 phase 互斥方向或提出修改 |
| `seven-piece-duet` | 生产 UI 等待视觉方向确认 | `docs/338-seven-piece-duet-design-proposal.md` | 用户 | 确认深墨纸面拼形台、A4/B3 纹理片组与共享轮廓方向或提出修改 |
| `our-place-guess` | 生产 UI 等待视觉方向确认 | `docs/341-our-place-guess-design-proposal.md` | 用户 | 确认夜行纸图、guessing 仅自己圆点与 revealed 三形 pin 方向或提出修改 |

## 最近集成

| 项目 | 项目 commits | 总控集成 commit | Gate | 备注 |
| --- | --- | --- | --- | --- |
| `our-place-guess` 视觉提案 | `d01f767` | `ba7c0ce` | 四张 active 原图与 SHA-256；定向 `36 / 36`；Natural Earth 派生 check；verify | 夜行纸图；guessing 只有自己圆点，revealed 才显示对方/目标/距离；生成地理和示例数值均列幻觉，等待用户确认，不计 installed |
| `snow-globe-message` 现有核心再验收 | `e34bb2d` | `9ed8cc4` | 定向 `17 / 17`；固定来源与 10 张概念图 hash/尺寸；verify；当前主仓全仓 `2270 / 2270` | 上游 HEAD 漂移不影响固定 commit 与许可证；无新核心缺口；生产 UI 与浏览器 Gate 仍等待用户确认，不计 installed |
| `candle-wishes` 现有核心再验收 | `993eb0a` | `2d442c0` | 定向 `23 / 23`；三项固定来源、两张概念图 hash/尺寸/隐私；verify；当前主仓全仓 `2270 / 2270` | 五实体、路线/展示分离、愿望前缀与错误 no-op 核心复核通过；生产 UI 与浏览器 Gate 仍等待用户确认，不计 installed |
| `wish-fireworks` 来源修复与核心再验收 | `48521d8`、`43fd632`、`a7cfd3f`、`9a7f3b4`、`12c3887` | `989914e`、`56417d2`、`b2173f1`、`110bc10`、`44b5edc` | 定向 `31 / 31`；五项固定来源与许可证 hash；全仓 `2270 / 2270`；verify；range diff-check | 真实 docs-only 同名仓库 URL 漂移已由红测、最小修复和 bug 记录闭环；格式复核误报另以独立提交修正；生产 UI 与浏览器 Gate 仍等待用户确认，不计 installed |
| `flower-language-bouquet` 现有核心再验收 | `3d663ca` | `25aa56f` | 定向 `39 / 39`；11 项固定来源、10 张概念图 hash/尺寸/隐私；全仓 `2270 / 2270`；verify | 历史配置、120 排列、阶段隐私与导出数据模型复核通过，无新核心缺口；真实 SVG/Blob、移动保存与生产 UI 仍等待用户确认，不计 installed |
| `shadow-duet` 现有核心再验收 | `562e892` | `1ce7c6a` | 定向 `28 / 28`；固定来源与 16 张概念资产 hash/尺寸；verify；当前主仓全仓 `2269 / 2269` | 历史核心 `ee7df10` 与归因 `9cca69e` 复核通过，无新缺口、无重复改写；生产 UI 与浏览器 Gate 仍等待用户确认，不计 installed |
| `seven-piece-duet` 视觉提案 | `71b6e33` | `5d99563` | active 原图与 SHA-256；定向核心 `34 / 34`；全仓 `2269 / 2269`；verify | 深墨纸面拼形台；桌面与移动均恰好 A4/B3 七片、单共享轮廓、无计时分数；等待用户确认，不计 installed |
| `seven-piece-duet` 完整非视觉核心 | `f3db4b5`、`4ab916e`、`1d6f508`、`34a81ce`、`6d3a758`、`3555fd9`、`6444176` | `f2c7c8d`、`8ac9f5a`、`67efac8`、`9d672fd`、`4e7e6fc`、`f6d7627`、`dbc3111` | 定向 `34 / 34`；生成器固定 SHA；全仓 `2269 / 2269`；verify | 四个原创目标、deterministic exact-cover、`echo` no-flip UNSAT、双席 reducer、单调 revision 与四局严格 replay；真实证明缺口已记 bugs；无 UI，不计 installed |
| `our-place-guess` 核心验收 | `bf4a386` | `a4eea1e` | 项目核心 `41 / 41`、共享联测 `22 / 22`、Natural Earth 双 SHA、全仓 `2269 / 2269`、verify | 非视觉核心 Conditional Go；固定 Posio/Natural Earth 借鉴边界，未改共享 runtime/依赖，仍等待视觉、UI、双浏览器与接入，不计 installed |
| `our-place-guess` 房间协议 | `454997b` | `d87a8c6` | 项目与共享 runtime 联测 `51 / 51`；全仓 `2252 / 2252`；verify | 复用现有两人席位与 sealed-round；host 身份、密封坐标、四版本有界乱序队列、ack/result 单调和成员变化清局；未改共享 runtime 或依赖；无 UI，不计 installed |
| `memory-merge-board` 视觉提案 | `bd5084e` | `b07668b` | 定向 `40 / 40`；active 原图与 SHA-256；全仓 `2252 / 2252`；verify | 冷雾蓝共同剪贴簿；桌面 choose 仅两候选可操作，移动 place 仅右侧空位可操作；v1 标记 superseded，等待用户确认，不计 installed |
| `our-place-guess` 密封规则 | `9772f83` | `d50b0b6` | 项目定向 `29 / 29`；全仓 `2252 / 2252`；verify | Haversine/反经线、50/200/800 km 档位、四轮状态机、较远者共同评分、私人目标只在揭晓后公开与访客重算；无 UI，不计 installed |
| `our-place-guess` 地图数学 | `98a6f16`、`6432af9` | `a333214`、`e9c4fa0` | 定向 `9 / 9`；全仓 `2235 / 2235`；verify | 等距圆柱投影、1/2/4/8 倍缩放、跨日期线安全边界与本地陆地命中；无效/同值缩放和无效/零平移统一返回隔离深冻结快照，修复调用方可变对象别名；无 UI，不计 installed |
| `seven-piece-duet` 精确几何 | `ac38212`、`a96ccc9`、`04ae783` | `3adf4d8`、`8e2f4cd`、`65e38de` | 定向 `17 / 17`；全仓 `2226 / 2226`；verify | 整数原子三角形、D4 指纹、七个原创模板、仅平行四边形翻面与错误分类；无目标/reducer/UI，不计 installed |
| `our-place-guess` 私人题包 | `441d31f` | `0c3ff32` | 定向 `10 / 10`；全仓 `2226 / 2226`；verify | 4–24 张、64 KiB、严格纯文本、文件序前四张、虚构示例和隔离冻结副本；不保留文件名/路径；无 UI，不计 installed |
| `memory-merge-board` 核心验收 | `d8ac7a6` | `f8e3302` | `40 / 40`、全仓 `2199 / 2199`、verify、diff-check、范围与归因复核 | Core Go；完整项目仍等待用户确认视觉、生产 UI、`file://`/输入/响应式/无障碍/双人试玩与最终接入，不计 installed |
| `memory-merge-board` 可解关卡与求解证明 | `7bbdfa7`、`6b0d3b0`、`5ddc227` | `7e41335`、`3c6c857`、`9c93192` | 定向 `40 / 40`；全仓 `2199 / 2199`；verify | 三个固定关卡由独立确定性搜索和真实 reducer 双重证明；catalog 路径真实 bug 已记录；无 UI，不计 installed |
| `our-place-guess` 离线地图 | `0b7e35d` | `7a9d106` | 定向 `5 / 5`、派生 `--check`、输入/输出双 SHA、全仓 `2199 / 2199`、verify | Natural Earth v5.1.2 public-domain land 固定派生；运行时只读 123,906 字节本地资产；无 UI，不计 installed |
| `seven-piece-duet` 核心脚手架 | `89b6108` | `3426c57` | diff-check、归因边界与 verify | README、双 MIT/W3C 借鉴声明、零依赖 CommonJS 边界；无实现/UI，不计 installed |
| `our-place-guess` 前置 | `96cb023`、`eedebef`、`e872d59`、`f2a6d14`、`ee76c28`、`da831fe`、`5bf1be2`、`b0e0451`、`ad07ad0` | `a6fe37f`、`0ac9fee`、`4bb3d4b`、`6dc8464`、`05f9dbd`、`ff540a7`、`ea7a9ed`、`deefdc3`、`9be3915` | Posio/Natural Earth 固定来源；全仓 `2177 / 2177`；verify | C 级 Conditional Go；私人题包仅房主内存，固定前四张，复用现有 Socket.IO 且不改共享 runtime；无入口，不计 installed |
| `memory-merge-board` 规则核心 | `5653a49`、`4c2a577`、`a5fca5a`、`06aae0a` | `a20f4b6`、`155e5a9`、`216925f`、`41148eb` | 定向 `23 / 23`；全仓 `2177 / 2177`；verify | 整盘滑动、合并、角色交换、章节分享与 blocked 终局；真实错误 fixture 已记录于 `bugs/`；无 UI，不计 installed |
| `seven-piece-duet` 前置 | `2fc7801`、`ab80149`、`80742de`、`d790385`、`13cee17`、`831f7db`、`5c56ac2`、`4e3a838`、`8863611` | `03b67f3`、`ecf5390`、`aef1e87`、`835d4b1`、`cd60a84`、`43e887b`、`8fb022e`、`d2e8a94`、`5917f23` | 固定两项 MIT 来源；整数原子三角形、D4 指纹与四个原创目标合同复核；verify | Conditional Go；双席独占片组、共享无计时目标，不复制坐标、谜题、解法、UI 或资产；无入口，不计 installed |
| `memory-merge-board` 前置 | `d74e11a`、`9533251`、`e7b8608`、`bce40d5` | `74a04a2`、`16ba0d1`、`8a92ad3`、`40fd69a` | 固定 2048 commit/MIT/版权人；逐项去重；verify | Conditional Go；只借鉴抽象整盘滑动与合并规则，不复制源码、名称、数字皮肤、布局或资产 |
| `vinyl-secret` 视觉提案 | `093f6c0` | `0f778fe` | 定向 `37 / 37`；原图检查、SHA-256、range diff-check、verify | 私人压片工作台；默认无音频、秘密字段按 phase 不存在、运行界面 code-native，等待用户确认，不计 installed |
| `word-detour-duel` 视觉提案 | `947f40a` | `d5e780c` | 定向 `16 / 16`；原图检查、SHA-256、range diff-check、verify | 纸面路线改道指挥台；秘密子树卸载与交接遮挡合同已冻结，等待用户确认，不计 installed |
| `four-symbol-film-duel` 视觉提案 | `a8d6592` | `c032f31` | 定向 `25 / 25`；原图检查、SHA-256、range diff-check、verify | 复古影院票根台；厂商 Emoji 仅作概念，生产使用代码原生 Unicode 与中文等价标签，等待用户确认，不计 installed |
| `kaleidoscope-names` 视觉提案 | `5312a5c` | `ab8665d` | 定向 `24 / 24`；原图检查、SHA-256、range diff-check、verify | 调校/完成双 phase；已修正为准备者离线配置、体验者单人揭晓，等待用户确认，不计 installed |
| `ricochet-tank-duel` 视觉提案 | `576c244` | `75e4a5b` | 定向 `44 / 44`；原图检查、SHA-256、range diff-check、verify | 棱镜折射台与双席控制语言；漏键/错误墙体已列生成幻觉，等待用户确认，不计 installed |
| `twin-orbit` 视觉提案 | `5a0217f` | `9b4ad63` | 定向 `36 / 36`；原图检查、SHA-256、range diff-check、verify | 午夜双环刻度盘；示例角度/tick 已列生成幻觉，等待用户确认，不计 installed |
| `penguin-flag-duel` 视觉提案 | `9fc0691` | `c277db9` | 定向 `23 / 23`；原图检查、SHA-256、range diff-check、verify | 极夜冰场；移动冰场比例偏高已列生成幻觉，等待用户确认，不计 installed |
| `ricochet-tank-duel` 确定性模拟与状态加固 | `7379e7b`、`a6bf273`、`27a2d91`、`a68e54d`、`1c75d02` | `1f21931`、`03facd4`、`275bd64`、`d3c021d`、`5c3b645` | 定向 `44 / 44`；全仓 `2154 / 2154`；range diff-check、verify | 实时移动、同刻输入、多弹、连续折射、原子命中与可达状态合同；无 UI，不计 installed |
| `twin-orbit` 非视觉核心 | `1139704`、`2242f21`、`8f2febb`、`7a60291`、`2097f51`、`009e209` | `7393e6c`、`a437050`、`f1db7b0`、`b730d76`、`96aaf36`、`fe8ac90` | 定向 `36 / 36`；全仓集成后 `2123 / 2123`；verify | 五关 fixture、独立 solver、静态边界与三次核心修复；无 UI，不计 installed |
| `dual-maze-race` 视觉提案 | `a148384` | `19d3ff1` | 原图检查、SHA-256、`git diff --check`、verify | 纸白共享地图桌与钴蓝/朱砂双席语言；等待用户确认，不计 installed |
| `twin-orbit` core foundation | `5d4c143` | `9e7db88` | `node --check`、range diff-check、verify | 可编辑配置、CommonJS 与归因边界；无逻辑/UI，不计 installed |
| `ricochet-tank-duel` 确定性几何 | `984432a`、`66e2042`、`0187bfe`、`561fcf4`、`00736b1`、`60e2998` | `77c211c`、`5180143`、`81693df`、`7433791`、`10a789f`、`2022a69` | 定向 `13 / 13`；全仓 `2087 / 2087`；range diff-check、verify | 有理墙 TOI、代数圆 TOI 与精确排序；无 simulation/UI，不计 installed |
| `photo-slider-race` 视觉提案 | `b3e8b96` | `22d7b09` | 原图检查、SHA-256、`git diff --check`、verify | 仅概念与 code-native 设计合同；等待用户确认，不计 installed |
| `twin-orbit` 前置与来源校正 | `cac38fc`、`92f7a85`、`1f08050`、`9b2d43d`、`87b82a4`、`6a4782e` | `3f2c257`、`64dd66c`、`b24a401`、`48233bc`、`2e50821`、`0d99757` | verify；全仓 `2074 / 2074`；Apple 当前官方条目与 Playgama hidden 状态复核 | Conditional Go；无入口，不计 installed |
| `ricochet-tank-duel` 前置 | `acccb9d`、`7b75266`、`41d5bf9`、`32cc77a`、`c636edc`、`35516a7` | `732b0a2`、`4ca09b3`、`482e072`、`b4bd13b`、`60e0e78`、`0f7a9ba` | verify 与来源复核 | Conditional Go；无入口，不计 installed |
| `penguin-flag-duel` 完整非视觉核心 | `4ea7dee`、`62de5c6` | `861ce7f`、`e556d3d` | 定向 `23 / 23`；全仓 `2074 / 2074`；verify | 60Hz 冰面物理、夺旗闭环与重放完成；无 UI，不计 installed |
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
