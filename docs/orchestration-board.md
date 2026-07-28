# Two of Us 多 Session 调度看板

> 本文件是动态状态，不是永久规则。永久规则见 [`orchestration-runbook.md`](./orchestration-runbook.md)。
>
> 仅总控修改本文件；每次启动、恢复、集成或调度后都要用仓库事实刷新。

## 当前快照

| 字段 | 当前值 |
| --- | --- |
| 快照日期 | 2026-07-26（Asia/Kuala_Lumpur） |
| 当前分支 | `main` |
| 当前 HEAD | `cce13ce`（Dual Maze Race 主线集成与终验文档后） |
| 目标 installed | 75 |
| 当前 catalog 总数 | 75 |
| 当前 installed | 75 |
| 距离目标 | 0 |
| A / B / C / D | 67 / 1 / 6 / 1 |
| surprise / co-op / versus | 24 / 27 / 24 |
| 本次 repository verify | 通过：75 个入口、67 个 A、8 个非 A |
| 本次是否重跑全仓测试 | 是：`2469 / 2469` 通过 |
| 工作树提示 | 用户已授权整个仓库的视觉概念直接执行；`dual-maze-race` 已作为第 75 个入口正式上架并完成主线 Chrome 进出闭环，当前目标已闭合。`love-tree` 保留现状，不作为 75 项交付阻塞 |
| 平台真实并发 | 1 个总控；三个执行 Session 均已完成并集成，没有待审项目 |

快照数字来自 `experiences/catalog.json`；下次总控恢复时必须重新计算。聊天记录、旧 verification 文档和本表都不能替代实时 catalog 与测试结果。

## 执行槽位

| 槽位 | 状态 | 项目 | worktree | 分支 | 基线 SHA | 最近进展 |
| --- | --- | --- | --- | --- | --- | --- |
| Worker 1 | 已集成 | `ricochet-tank-duel` 生产 UI | `{worktree-base}/ricochet-tank-duel-production-ui` | `codex/exp-ricochet-tank-duel-production-ui` | `d6b783d` | 56 项定向、独立 Chrome、四项浏览器问题与主门户进出闭环通过；已上架为第 73 个入口 |
| Worker 2 | 已集成 | `photo-slider-race` 生产 UI | `{worktree-base}/photo-slider-race-production-ui` | `codex/exp-photo-slider-race-production-ui` | `df4d0cc` | 41 项定向、本地照片 Blob 生命周期、真实触控、辅助模式和主门户进出闭环通过；已上架为第 74 个入口 |
| Worker 3 | 已集成 | `dual-maze-race` 生产 UI | `{worktree-base}/dual-maze-race-production-ui` | `codex/exp-dual-maze-race-production-ui` | `df4d0cc` | 32 项定向、四局换席、公平暂停、六视口、主门户进出闭环通过；已上架为第 75 个入口 |
| Worker 4 | 已完成 | — | — | — | — | 目标已达成，无需滚动补位 |

若平台实际并发上限不足 4，保留槽位定义，但只使用真实可用的 Session，不虚报运行状态。

## Ready for Review

- 无。三个生产 UI 项目均已完成总控复验并集成。

## 建议首轮候选

以下项目已有完整前置研究、规格与核心；用户已统一授权视觉自治，因此本轮直接进入生产 UI：

| 优先级 | 项目 ID | 分类 | 预计等级 | 已有前置材料 | 派发前检查 |
| --- | --- | --- | --- | --- | --- |
| P0 | `wish-fireworks` | surprise | A | research、spec、design、plan、source refresh | 已上架并完成 35 项定向、全仓 2316 项与浏览器矩阵 |
| P0 | `snow-globe-message` | surprise | A | research、spec、design、plan、source refresh | 已上架并完成 22 项定向、全仓 2340 项与浏览器矩阵 |
| P0 | `flower-language-bouquet` | surprise | A | research、spec、design、plan、source refresh | 已上架并完成 47 项定向、全仓 2326 项与浏览器矩阵 |
| P0 | `candle-wishes` | surprise | A | research、spec、design、plan | 已上架并完成 28 项定向、全仓 2347 项与独立浏览器终验 |

## 后续候选队列

队列只表示“值得复核”，不表示已经获准复制、已完成规格或必然进入 75：

1. `penguin-flag-duel`
2. `memory-merge-board`
3. `seven-piece-duet`
4. `our-place-guess`

总控也可以从 [`251-local-first-second-pass-candidate-refresh.md`](./251-local-first-second-pass-candidate-refresh.md) 选择更合适的合法候选，但必须先检查与现有 60 项的机制重复，并更新本队列。

## 文档编号预留

当前已使用或预留到 `392`；下列编号区间已互斥预留：

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
| `compliment-reels` | `348` | Worker 1 | 字素 fallback 缺口修复与现有核心再验收已集成；生产 UI 仍等待 `198` 用户确认 |
| `capsule-docking` | `349` | Worker 3 | hostile Proxy 缺口修复、bug/learn 与现有核心再验收已集成；生产 UI 仍等待视觉方向选择 |
| `kaleidoscope-names` | `350` | Worker 2 | frozen content 规范化与标准来源漂移修复、现有核心再验收已集成；生产 UI 仍等待 `314` 用户确认 |
| `word-detour-duel` | `351` | Worker 4 | 公开投影、终局日志、内容/来源缺口修复与现有核心再验收已集成；生产 UI 仍等待 `316` 用户确认 |
| `four-symbol-film-duel` | `352` | Worker 1 | 配置与 winner getter 缺口修复、现有核心再验收已集成；生产 UI 仍等待 `318` 用户确认 |
| `vinyl-secret` | `353` | Worker 3 | 撤销 Proxy 与来源覆盖缺口修复、现有核心再验收已集成；生产 UI 仍等待 `320` 用户确认 |
| `twin-orbit` | `354` | Worker 2 | 完成态、重试、可达角度、隐私和标准来源缺口修复与核心再验收已集成；生产 UI 仍等待 `310` 用户确认 |
| `photo-slider-race` | `355` | Worker 3 | 两阶段来源状态、敌对 action 缺口修复与核心再验收已集成；生产 UI 仍等待 `295` 用户确认 |
| `dual-maze-race` | `356` | Worker 4 | 连通性、Proxy/hostile passage 与来源覆盖修复、核心再验收已集成；生产 UI 仍等待 `297` 用户确认 |
| `penguin-flag-duel` | `357` | Worker 1 | 现有核心再验收进行中；生产 UI 仍等待 `303` 用户确认 |
| `ricochet-tank-duel` | `358` | Worker 2 | 现有核心再验收进行中；生产 UI 仍等待 `312` 用户确认 |
| `shadow-sword-duel` | `359` | Worker 3 | 无新核心缺口，现有核心再验收已集成；生产 UI 仍等待 `222` 用户确认 |
| `honeycomb-passage` | `360` | Worker 3 | 现有核心再验收进行中；生产 UI 仍等待 `226` 用户确认 |
| `emoji-movie-duel` | `361` | Worker 4 | glyph、action 快照、答案位置、来源与核心再验收已集成；生产 UI 仍等待后续视觉提案确认 |
| 全仓依赖、runtime 与 launcher 合同审计 | `362` | Worker 2 | 已集成；确认 58/58 HTTP 入口、8/8 非 A 启动器与根依赖锁定，并记录跨 checkout 运行时复用和固定依赖链接漂移 |
| 全仓借鉴声明、固定来源与许可证盘点 | `363` | Worker 1 | 已集成；逐项覆盖 58 installed 与 21 候选，区分中/高缺口和公开分发阻断，并给出共享依赖与结构化 Gate 修复顺序 |
| 58 个 installed 的真实浏览器首载与统一入口矩阵 | `364` | Worker 3 | 已集成；真实 Chrome 验证 58/58 localhost 首载、8/8 launcher、A/B/C/D 深路径代表、移动视口与端口释放 |
| 待确认视觉提案总清单与批量确认路径 | `365` | Worker 4 | 已集成；覆盖 21/21 阻塞项与 122 个可点击本地证据链接，提供批量确认、单项修改和逐项目精确确认模板 |
| `love-tree` clean-room 重构前置 | `366–368` | Worker 2 | 已集成；brainstorm、spec、plan、完整概念稿和文档清理均独立提交，生产 UI 等待用户确认 |
| `capsule-docking` 视觉候选补证 | `369` | Worker 4 | 已集成；desktop/mobile active 概念、生成台账、code-native 偏差和明确确认语句齐备，生产 UI 等待用户确认 |
| 共享依赖固定归因修复 | `370` | Worker 1 | 已集成；三个真实根依赖的固定源码/许可证/版权/消费者边界与防漂移测试通过 |
| 共享 runtime 内容身份修复 | `371–372` | Worker 3 | 已集成；deterministic content identity、live witness、双根进程复用矩阵、bug/learn 与最终验证全部通过 |
| `love-tree` 视觉自治与生产实现 | `373–375` | 总控 / Worker 2 | `373` 授权决策已集成；`374` 设计系统、`375` 验证边界已在分支完成，等待可访问 `file://` 的 Chrome Gate 后再集成 |
| 首轮四个视觉自治生产 UI | `376–379` | Worker 1–4 | `wish-fireworks`、`snow-globe-message`、`flower-language-bouquet`、`candle-wishes` 各自独占一个最终验证编号 |
| `compliment-reels` 生产 UI | `380` | Worker 4 | Candle 释放实现槽位后滚动补位；独占最终验证编号 |
| `shadow-duet` 生产 UI | `381` | Worker 3 | 花语花束正式上架后滚动补位；独占最终验证编号 |
| `shadow-sword-duel` 生产 UI | `382` | Worker 4 | 夸夸老虎机正式上架后滚动补位；独占最终验证编号 |
| `honeycomb-passage` 生产 UI | `383` | Worker 1 | Candle 正式上架后滚动补位；独占最终验证编号 |
| `capsule-docking` 生产 UI | `384` | Worker 2 | Snow Globe 正式上架后滚动补位；独占最终验证编号 |
| `vinyl-secret` 生产 UI | `385` | Worker 4 | Shadow Sword 正式上架后滚动补位；独占最终验证编号 |
| `twin-orbit` 生产 UI | `386` | Worker 1 | Honeycomb Passage 正式上架后滚动补位；独占最终验证编号 |
| `kaleidoscope-names` 生产 UI | `387` | Worker 3 | Shadow Duet 正式上架后滚动补位；独占最终验证编号 |
| `four-symbol-film-duel` 生产 UI | `388` | Worker 2 | Capsule Docking 正式上架后滚动补位；独占最终验证编号 |
| `word-detour-duel` 生产 UI | `389` | Worker 4 | Vinyl Secret 正式上架后滚动补位；独占最终验证编号 |
| `ricochet-tank-duel` 生产 UI | `390` | Worker 1 | Twin Orbit 正式上架后滚动补位；独占最终验证编号 |
| `photo-slider-race` 生产 UI | `391` | Worker 2 | Word Detour 正式上架后滚动补位；独占最终验证编号 |
| `dual-maze-race` 生产 UI | `392` | Worker 3 | Four Symbol Film Duel 正式上架后滚动补位；独占最终验证编号 |

执行 Session 不得自行抢占未在本表登记的编号。

## Blocked

当前没有仅因视觉确认而阻塞的项目。用户已授权本仓库视觉概念直接执行；
候选仍须分别通过玩法、隐私、许可证、测试、浏览器和启动合同 Gate 才能上架。
`love-tree` clean-room 另因当前工具无法验证真实 `file://` 启动而保持待定，不受视觉授权影响。

## 最近集成

| 项目 | 项目 commits | 总控集成 commit | Gate | 备注 |
| --- | --- | --- | --- | --- |
| `dual-maze-race` 生产 UI 与上架 | `40b1025`…`121ff5a`，缺口修复 `81b9d5c`…`bc483f0` | `e600c76`、`cce13ce` | 定向 `32 / 32`；组合定向 `229 / 229`；全仓 `2469 / 2469`；verify；四局换席/输入检查/公平暂停/六视口/辅助模式/主门户 | 安装入口增至 75；八方向检查、实体键盘风险诚实降级、长帧公平暂停、归因阶段真值和主门户返回路径闭环；零开源游戏代码/资产复制 |
| `photo-slider-race` 生产 UI 与上架 | `1031e50`…`d748b1d` | `0ab0eb6`…`498edfc` | 定向 `41 / 41`；组合定向 `236 / 236`；全仓 `2462 / 2462`；verify；完整对局/本地照片/真实触控/六视口/辅助模式/主门户 | 安装入口增至 74；两张本地图片的 Blob 原子切换与释放、100ms 并列窗、左右同局公平、归因标题合同和主门户进出闭环通过；零开源滑块代码/素材复制 |
| `ricochet-tank-duel` 生产 UI 与上架 | `f974809`…`5b0a813` | `05b64bc`…`be66904` | 定向 `56 / 56`；组合定向 `249 / 249`；全仓 `2452 / 2452`；verify；双键盘/双触控/六视口/暂停/降级/主门户 | 安装入口增至 73；混合输入、移动 HUD、40px 目标、noJS 假控件和缺少返回入口均经红测闭环；九项固定来源与零开源游戏/资产复制边界齐全 |
| `word-detour-duel` 生产 UI 与上架 | `8c359e8`…`fe1ea55` | `057141f`、`df4d0cc` | 定向 `27 / 27`；全仓 `2441 / 2441`；verify；四回合/计时与不计时/六视口/秘密 DOM/生命周期/输入与降级 | 安装入口增至 72；门户真实点击和返回、公开投影、计时增量渲染、blur/hidden/pagehide 卸密均通过；13 项一手来源、商业表达边界和零开源复制声明齐全 |
| `four-symbol-film-duel` 生产 UI 与上架 | `4ac0f23`…`704bc62` | `e446eca`、`e734cc5`、`97913e2`、`df08ef6` | 定向 `38 / 38`；全仓 `2431 / 2431`；verify；完整八题/六视口/秘密 DOM/键盘触控/降级 | 安装入口增至 71；借鉴标题合同与 390px 首屏主操作经独立修复闭环，原创虚构题卡、Unicode 字形和零开源复制边界齐全 |
| `kaleidoscope-names` 生产 UI 与上架 | `615ebb5`…`697f220` | `580dd84` | 定向 `35 / 35`；verify；六视口/秘密延迟 DOM/键盘触控/Canvas 失败与降级 | 安装入口增至 70；深紫光学校准台按确认概念落地，标题焦点、组合摘要和 Canvas 降级经浏览器修复闭环，零第三方运行依赖 |
| 根门户本地 favicon | — | `3f020f0` | 静态 `2 / 2`；组合定向 `187 / 187`；Chrome favicon 200、`/favicon.ico` 0 请求、console/network/runtime 0 异常 | 手写被动 SVG，不含脚本、外链或第三方素材；独立 bug 记录与回归测试闭环，不改变 installed |
| `twin-orbit` 生产 UI 与上架 | `97f4373`…`202c408` | `3f020f0`、`d6b783d` | 定向 `47 / 47`；共享接入 `232 / 232`；全仓 `2409 / 2409`；verify；五关/六视口/键盘/触控/暂停清理/降级 | 安装入口增至 69；双星同 tick 穿门、确定性 golden replay、无 JS 诚实回退与三项浏览器问题闭环，固定来源和零开源复制边界齐全 |
| `vinyl-secret` 生产 UI 与上架 | `7d26cac`…`d577cd3` | `9464911`…`b6028e4`、`bda0d45` | 定向 `46 / 46`；共享接入 `229 / 229`；全仓 `2397 / 2397`；verify；三轨/六视口/键盘/真实触控/可选音频/秘密 DOM/降级 | 安装入口增至 68；默认无音频即可完成，WAV 成功与缺失 MP3 软失败均通过；一手资料、音乐/录音权和零开源复制边界齐全 |
| `capsule-docking` 生产 UI 与上架 | `e5c4cd4`…`efd5980` | `d262ceb`…`ec2af4e`、`69a3b28` | 定向 `29 / 29`；共享接入 `210 / 210`；全仓 `2387 / 2387`；verify；三航段/六视口/键盘/真实触控/暂停清理/降级 | 安装入口增至 67；标题窄屏换行和复用 pointerId 的 lostcapture 竞态经红测闭环，五项固定来源与零复制边界齐全 |
| `shadow-duet` 生产 UI 与上架 | `d4defed`…`deb8e90` | `a8b55cc`…`2f51282`、`69c8e74` | 定向 `38 / 38`；共享接入 `217 / 217`；全仓 `2378 / 2378`；verify；六幕/六视口/键盘/双触控/隐私/降级 | 安装入口增至 66；终局首屏、forced-colors 人影与未冻结文案均经红测闭环，四项固定来源和零复制/零链接边界齐全 |
| `honeycomb-passage` 生产 UI 与上架 | `77888e7`…`deacec9` | `30b241f`…`1035be1`、`6b4cfe3` | 定向 `33 / 33`；共享接入 `210 / 210`；全仓 `2366 / 2366`；verify；完整 17 手/最后路线拒绝/六视口/键盘/真实触摸/降级 | 安装入口增至 65；标题命中层与动作轨溢出经浏览器回归闭环，固定来源、许可证、版权与零复制边界齐全 |
| `shadow-sword-duel` 生产 UI 与上架 | `d8c0714`…`e177f30` | `abf915b`…`720d46c`、`9e9e117` | 定向 `36 / 36`；共享接入 `211 / 211`；全仓 `2356 / 2356`；verify；九回合/双 KO/六视口/键盘/真实触摸/隐私/降级 | 安装入口增至 64；四种第一手 DOM 不可区分，隐式 favicon 404 经红测闭环，四项固定来源和零复制边界齐全 |
| `candle-wishes` 生产 UI 与上架 | `7cae4fd`…`7b65f01` | `68b92dc`…`5f3be1f`、`f729deb` | 定向 `28 / 28`；共享接入 `201 / 201`；全仓 `2347 / 2347`；verify；独立六档视口/键盘/触屏/降级 | 安装入口增至 63；无 JavaScript 惰性控件经红测闭环，三项固定来源、许可证、版权、借鉴和未复制边界齐全 |
| `snow-globe-message` 生产 UI 与上架 | `61ef09c`…`7ff79ef` | `8a45b97`…`382bcf1`、`0be1be0` | 定向 `22 / 22`；共享接入 `193 / 193`；全仓 `2340 / 2340`；verify；六档视口/键盘/真实触摸拖拽/reduced-motion | 安装入口增至 62；四阵风、确定性雪花、完整结果树与固定来源/零复制边界齐全 |
| `compliment-reels` 生产 UI 与上架 | `6201130`…`2550c05` | `fed8378`…`b08e350`、`2bf3c80` | 定向 `29 / 29`；共享接入 `198 / 198`；全仓 `2333 / 2333`；verify；六档视口/键盘/触屏/降级 | 安装入口增至 61；三项 UI bug 均红测后修复，4 个固定来源和 GPL/MIT 冲突排除边界齐全 |
| `flower-language-bouquet` 生产 UI 与上架 | `1843512`、`0abfc70`、`000b179`、`923f8ef` | `1a12cfd`、`7967173`、`3741d9e`、`0cb2e93`、`aec935f` | 定向 `47 / 47`；共享接入 `214 / 214`；全仓 `2326 / 2326`；verify；桌面/移动端/键盘/触屏/撤回/失败恢复 | 安装入口增至 60；完成态才准备本地 SVG，未虚报浏览器下载落盘；11 个固定来源与零复制边界齐全 |
| `wish-fireworks` 生产 UI 与上架 | `781749d`…`ee96ef2` | `f59e1fa`…`d690f24`、`81a2aa7` | 定向 `35 / 35`；共享接入 `200 / 200`；全仓 `2316 / 2316`；verify；六档视口/键盘/触屏/降级 | 安装入口增至 59；三束确定性烟火、无 Canvas/无 JS 回退、5 个固定来源与零复制边界齐全 |
| 共享 runtime 内容身份修复 | `f292cf7`、`42864c7`、`197b3d2`、`352f6ca`、`1eae300` | `add5077`、`15343e7`、`c171851`、`1c20cb8`、`7da4ed5` | 红测；定向 `23 / 23`；双真实复制根复用/拒绝/存活/端口释放；全仓 `2310 / 2310`；verify | 服务身份、协议版本和当前内容身份三层复用；运行中内容漂移由 live witness 返回不可复用但不杀旧进程；无 UI、catalog 或依赖变更 |
| `love-tree` clean-room 前置与视觉概念 | `2fbb307`、`e0085fe`、`eea299a`、`0ece012`、`ba9e6c9` | `cccfb5a`、`826fd07`、`122e61b`、`e90211c`、`683c886` | 四张原图尺寸/SHA-256；range diff-check；全仓 `2304 / 2304`；verify | 仅继承可观察体验目标，不读取或复制旧源码、参数、样式、音乐、文案或源包；生产 UI 等待用户确认，不计新增 installed |
| `capsule-docking` 视觉候选补证 | `13b14ac`、`06d93d6` | `155b237`、`6681311` | desktop/mobile 原图尺寸/SHA-256；range diff-check；全仓 `2304 / 2304`；verify | “纸质近地轨道训练台”统一方向；概念几何不是 core 真值；生产 UI 等待用户确认，不计 installed |
| 共享依赖固定归因修复 | `61ada43`、`a21d05b`、`71a5451`、`a5bd32d` | `157860e`、`c5be925`、`664e949`、`4457e2d` | 红测；定向 `70 / 70`；固定链接 `6 / 6`；本地链接 `2347 / 2347`；全仓 `2304 / 2304`；verify | Socket.IO、node-qrcode、Pannellum 固定到不可漂移 commit 与同 revision 许可证，覆盖真实消费者和分发边界；无 UI、catalog 或依赖版本变更 |
| 58 个 installed 的真实浏览器首载与统一入口矩阵 | `2127d9d`、`e26219a`、`206f0f0`、`a44f81e`、`2c1eac3` | `3d63956`、`c675690`、`46b1263`、`eccab40`、`bf2eb56` | 58/58 localhost full-load；8/8 launcher；A/C 深路径；B/D 能力前置；390×844 A/B/C/D；全仓 `2301 / 2301`；verify | 0 console warning/error、0 HTTP 失败、0意外公网请求；A `file://` 由静态合同补证，照片和麦克风权限边界未绕过；无生产修改，不计 installed |
| 全仓借鉴声明、固定来源与许可证盘点 | `58d862b`、`6ded147`、`4486203`、`eee85bf`、`a032c8a`、`75b4489`、`c175540` | `c3a24cd`、`4a79033`、`ef02b94`、`2c5752f`、`a71b3ba`、`3fe25d0`、`0507e98` | 58 installed + 21 候选；78/78 定向；2190/2190 本地链接；全仓 `2301 / 2301`；verify | `love-tree` 为当前唯一公开分发阻断并进入 clean-room；Four Symbol 当前 main 已通过；记录标题式 Gate 假阳性和四清单连接方法；无生产修改，不计 installed |
| 待确认视觉提案总清单 | `5839d05` | `0f95f8c` | 21/21 Blocked 项；122/122 本地证据链接存在；diff-check；verify | 提供 20 项可看图批量确认模板与逐项修改语句；`capsule-docking` 因零预览保持不可批准；不修改或批准生产 UI，不计 installed |
| 全仓依赖、runtime 与 launcher 合同审计 | `1adc0b7`、`283dfde`、`3eeedbe`、`07a238a` | `08329e0`、`edf2b56`、`a97c978`、`f51c884` | 58/58 HTTP 入口；8/8 非 A 启动器；`npm ci` 0 vulnerability；全仓 `2301 / 2301`；verify；range diff-check | 根依赖与 launcher 统一性通过；确认跨 checkout 运行时可误复用及固定依赖链接漂移，分别记录两份 bug 和一份内容身份 learn；无生产实现或 UI，不计 installed |
| `emoji-movie-duel` 内容/动作/来源修复与核心再验收 | `5a95187`、`d2f32a4`、`296011d`、`3ca4287`、`d154b87`、`fb3ecad`、`57a2f2a`、`665395e`、`226693f`、`620410b`、`14e1213`、`eef8004`、`f7a96f2`、`066e96d` | `446e9cd`、`2c0d5e7`、`4b7e6e5`、`91e7cfe`、`972fbf4`、`324bd2a`、`a35d281`、`7364f93`、`3ec3615`、`25a1d84`、`4b5ab75`、`68b2d04`、`8ccc078`、`df02219` | 定向 `30 / 30`；组合后全仓 `2301 / 2301`；verify；range diff-check | token 只接受单个 pictographic glyph，action 采用单 descriptor 快照；32 题答案位置从 `11/12/8/1` 平衡到 `8/8/8/8`，每包每席覆盖四位置；13/13 一手来源和零第三方题库/素材复制边界已锁定；无 UI，不计 installed |
| `honeycomb-passage` state/replay 修复与核心再验收 | `d916743`、`90342a4`、`e29d430`、`6f069c4`、`153dd3a`、`e57ac89`、`04b33c1`、`2436203`、`3af5839`、`7898f81` | `6862f22`、`b662b1a`、`7cac6a3`、`28a57cc`、`56390b4`、`18e2e16`、`10f8dc4`、`1fc6440`、`11508e2`、`a38c90d` | 定向 `25 / 25`；独立 BFS `14352 / 14352`；组合后全仓 `2298 / 2298`；verify；range diff-check | 权威 state 现在要求 own-data graph 递归冻结；replay 派生快照按 ply/封蜡核算每席行动预算，并证明恰好 moveBudget 步可达；两份 bug、两份 learn 与固定来源/零复制边界已闭环；生产 UI 仍等待用户确认，不计 installed |
| `penguin-flag-duel` 敌对边界修复与核心再验收 | `2af6c15`、`17d8e84`、`3014654`、`b017863`、`c0c83d3`、`2c106cd`、`59fe3e8`、`bec8ccd`、`005272e`、`293e25d`、`6aacd73`、`f2fed7d`、`f506679`、`f2e6f4f`、`549c559`、`c3694e4`、`2988435` | `220fe2d`、`e473334`、`a0a59a4`、`8d91138`、`f93ba72`、`f12da5f`、`3f428e0`、`6bc1042`、`83eefa3`、`a80c3d6`、`c564814`、`be062d1`、`7dd05c0`、`c504301`、`dcdea42`、`ea060f3`、`5e76c23` | 定向 `28 / 28`；组合后全仓 `2296 / 2296`；verify；range diff-check | 嵌套数组改为 descriptor 快照，合法浏览器默认配置不再被初始化顺序吞掉，revision/剩余时间/Proxy type-replay/速度向量边界均已关闭；Box2D v3.1.0 固定 MIT 来源与零复制边界复核；生产 UI 仍等待用户确认，不计 installed |
| `ricochet-tank-duel` 镜像/状态修复与核心再验收 | `6b4c3c4`、`66e3575`、`86a113d`、`5077976`、`7b56433`、`bf47e10`、`204d5e6`、`8c89ebf`、`1956af4`、`bdc1ab0` | `0d95692`、`0f39724`、`de3b627`、`cdb9036`、`ba972eb`、`3ee2a49`、`729e430`、`54a84a3`、`5268463`、`260c0bf` | 定向 `47 / 47`；组合后全仓 `2291 / 2291`；verify；range diff-check | 同 tick 发射改为奇偶席位 ID 对，畸形 STEP 先关闭非法 state，持久状态拒绝弹体与对手重叠；三份 bug、一份 learn 与零开源游戏/引擎复制边界已锁定；生产 UI 仍等待用户确认，不计 installed |
| `dual-maze-race` 图验证/敌对输入/来源修复与核心再验收 | `af7b1f7`、`36dc62d`、`8ee1615` | `e01ca83`、`f93723d`、`9c81ea0` | 定向 `27 / 27`；组合后全仓 `2288 / 2288`；verify；range diff-check | 全图连通性与 `E=V-1` 共同证明树；descriptor 快照后不再回读原 Proxy，passage 先做整数门禁；15/15 来源和零复制边界已锁定；生产 UI 仍等待用户确认，不计 installed |
| `shadow-sword-duel` 无缺口核心再验收 | `541dd63` | `9d52b5c` | 定向 `29 / 29`；全仓 `2284 / 2284`；verify；range diff-check | 5,184 组独立 oracle、席位镜像、原子双攻/双 KO、严格历史 replay、隐私与 hostile 边界通过；固定 commit/许可证和零复制声明完整；仅文档，不计 installed |
| `photo-slider-race` 来源状态/敌对 action 修复与核心再验收 | `7f65ab7`、`10456a5`、`c3d8d76` | `1cbcc43`、`6a55c2e`、`b9bddfe` | 定向 `33 / 33`；组合后全仓 `2284 / 2284`；verify；range diff-check | loading 保留 active 来源、ready 才提交新来源、error 保留旧图可开局；属性键转换前收窄 action type；无开源滑块实现复制；生产 UI 仍等待用户确认，不计 installed |
| `twin-orbit` 状态/隐私/来源修复与核心再验收 | `0391be3`、`27fd447`、`1b91d0f`、`6a3c668`、`3c40672`、`2aea523` | `1035f91`、`3c55933`、`0fe5c68`、`c8e19a6`、`969cc07`、`9c9170a` | 定向 `39 / 39`；组合后全仓 `2282 / 2282`；verify；range diff-check | 完成态保留最终双穿门证据，retry reason 与快照绑定，角度满足 tick 可达范围；intro/complete 隐藏目标细节，W3C/WHATWG 状态与许可证已固定；生产 UI 仍等待用户确认，不计 installed |
| `four-symbol-film-duel` getter 修复与核心再验收 | `8af4639`、`f8b7518`、`bf25848`、`baf27db`、`542d544`、`a935b6d`、`9683b71`、`67c4639` | `d5f6b5e`、`9c283a6`、`cb9ebd4`、`a585384`、`8341b07`、`e197435`、`792d8d8`、`ddc3bde` | 定向 `27 / 27`；组合后全仓 `2279 / 2279`；verify；range diff-check | 配置 metadata 与 winner 分数统一使用 descriptor 快照，避免普通 getter/Proxy 执行；Unicode、题包、盲交接与零开源复制边界复核通过；生产 UI 仍等待用户确认，不计 installed |
| `word-detour-duel` 公开边界/内容来源修复与核心再验收 | `2e7b549`、`010f0c0`、`7836ef1` | `d36a259`、`db69c6b`、`6560ede` | 定向 `19 / 19`；组合后全仓 `2277 / 2277`；verify；range diff-check | 修复完成态 `7 / 6`、中性交接卡序、伪造终局日志与两处题卡冲突；13 项一手来源、72 行双角色内容证据和零复制声明已补齐；生产 UI 仍等待用户确认，不计 installed |
| `vinyl-secret` Proxy/来源修复与核心再验收 | `9d84e95`、`5aa910e`、`44fd098` | `8b1a712`、`09fdf81`、`f186744` | 定向 `38 / 38`；组合后全仓 `2274 / 2274`；verify；range diff-check | 撤销后的数组 Proxy 从首次品牌检查起 fail closed；补齐 WCAG、WebKit 与 Chrome 一手边界，仍明确无第三方开源实现复制；生产 UI 仍等待用户确认，不计 installed |
| `kaleidoscope-names` 配置/来源修复与核心再验收 | `1de4a89`、`35d024a`、`e539ca3` | `1de4a89`、`35d024a`、`e539ca3` | 定向 `25 / 25`；组合后全仓 `2273 / 2273`；verify；range diff-check | frozen 外部内容也重建规范化快照；Pointer Events 3 与 Media Queries 5 固定一手版本重新校准；生产 UI 仍等待用户确认，不计 installed |
| `compliment-reels` 字素 fallback 修复与核心再验收 | `b13fab9`、`cb2ebcb`、`1f48e12`、`15e0ded`、`e9c7ee5`、`f70596e` | `0ec93e7`、`a647c2f`、`24b92fb`、`73e26c4`、`e141768`、`192edb7` | 定向 `24 / 24`；组合后全仓 `2272 / 2272`；verify；range diff-check | 无 `Intl.Segmenter` 时的字素边界已有红测、零依赖 fallback、非 emoji ZWJ 加固与 bug 闭环；生产 UI 仍等待用户确认，不计 installed |
| `capsule-docking` hostile 输入修复与核心再验收 | `782cc6c`、`092a98c` | `ded6cf9`、`b039503` | 定向 `22 / 22`；组合后全仓 `2272 / 2272`；verify；range diff-check | 函数型 Proxy callback 用内部 wrapper 隔离，对象型 control 查表前收窄；bug 与可复用 learn 已记录；无 UI，不计 installed |
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
