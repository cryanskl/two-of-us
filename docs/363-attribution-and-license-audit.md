# 全仓借鉴声明与许可证审计

> 审计日期：2026-07-25  
> 严格基线：`5e76c23d01f9f2d1ee807addf210284e27309d73`  
> 范围：`experiences/catalog.json` 的 58 个 installed 入口，以及尚未进入 catalog
> 的当前非视觉候选。本文只盘点和提出修复顺序，不修改作品、声明、依赖或运行时。

## 1. 审计口径

本审计按
[`docs/orchestration-runbook.md`](./orchestration-runbook.md) 和
[`docs/05-reference-and-attribution-spec.md`](./05-reference-and-attribution-spec.md)
执行。对每个项目分别核对：

1. 上游仓库与不可漂移的 commit/tag URL；
2. 许可证名称、固定许可证文件 URL、版权或权利主体；
3. 实际借鉴、复制或直接调用的内容；
4. 明确没有复制、打包或再分发的内容；
5. 代码、依赖、图片、字体、音频、地图、关卡与题库分别归因；
6. 声明与生产目录、`package-lock.json`、能力包、生成资产台账是否一致。

状态含义：

- **通过**：原创/内部实现边界清楚，或外部来源已同时固定版本、许可证载体、
  权利主体、借鉴内容和未复制范围；实际依赖/资产另有完整且可达的委托声明也可通过。
- **中缺口**：不影响当前运行，但固定 URL、许可证 URL、版权人、研究来源覆盖或
  生成资产台账不完整。
- **高缺口**：实际运行依赖的入口级声明不完整，或声明中的“固定”链接失效。
- **阻断**：实际迁移/分发的代码或媒体没有闭合授权链。按 Runbook 不能视为可自由
  再分发的已完成项目。

许可证只覆盖其明确授权的对象。软件 MIT 不自动覆盖图片、字体、录音、地图或题库；
“公开仓库”“只在本地用”“没有收费”也不等于获得复制与再分发授权。

## 2. Installed 总览

- catalog 中 installed 入口：**58**（surprise 17、co-op 24、versus 17）。
- 等级：A 50、B 1、C 6、D 1；58/58 均有 README。
- 38/58 在入口目录内另有 `ATTRIBUTION.md`，其余 20 个在 README 声明。Runbook
  允许后者，因此“没有独立 ATTRIBUTION”本身不是失败。
- 43 个入口提到 GitHub 上游；其中 11 个完全没有固定源码 URL，
  `compatibility-quiz` 仅固定部分来源。
- 只有 13/43 个入口文档含显式固定的 `LICENSE`/`COPYING` URL。大量较新的声明
  已固定 commit、许可证名、版权人和零复制边界，但仍缺固定许可证文件链接。
- 实际引入第三方代码、依赖或模型的入口共 9 个：
  `love-tree`、`panorama-memory`、`i-heard-you`、`together-lock`、
  `lan-pictionary`、`compatibility-quiz`、`lan-connect-four`、`sealed-rps`、
  `heart-sprint`。
- 40 个入口含运行图片或 SVG；58 个入口均未打包字体文件；唯一运行录音是
  `love-tree/renxi.mp3`。

### 2.1 Surprise（17）

| # | 入口 | 来源固定与许可 | 实际借鉴/使用；未复制边界 | 分类型核对 | 状态 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `love-tree` | `cryanskl/html_lovetree` 仅浮动首页；无统一许可证、固定许可证 URL 或版权人；旧 jQuery/Jscex 链不完整 | 实际迁移上游代码、文案结构和素材组合；不是零复制 | 代码、图片组合、商业录音 `renxi.mp3`；无字体 | **阻断** |
| 2 | `memory-letter` | 无外部开源上游 | 传统拆信意象；代码、文案、视觉独立实现 | 原创代码；无第三方媒体 | 通过 |
| 3 | `scratch-surprise` | 两个 MIT 仓库均为浮动首页；缺固定版本、许可证 URL、版权人 | 只研究 Canvas 擦除；未复制源码、API、样式、文案和素材 | 机制；无第三方媒体 | 中缺口 |
| 4 | `date-wheel` | 两个 MIT 仓库均为浮动首页；缺固定版本、许可证 URL、版权人 | 只研究浏览器转盘；未复制包、源码、API、样式和素材 | 机制；无第三方媒体 | 中缺口 |
| 5 | `panorama-memory` | Pannellum 2.5.7 由 lockfile 固定，入口仍链接浮动仓库；缺固定 `COPYING` URL | 实际加载 Pannellum JS/CSS；未复制示例全景、示例配置或视觉 | 第三方代码依赖、用户自备照片；包内有 `COPYING` | **高缺口** |
| 6 | `photo-swap-puzzle` | headbreaker 3.0.0 与另一仓库均为浮动首页；缺固定源码/许可 URL 和版权人 | 只比较拼片、拖拽和翻牌机制；未引入 Konva、bundle、代码、布局和专辑图片 | 机制、用户自备照片 | 中缺口 |
| 7 | `future-ticket` | 无开源上游 | 代码原创；图像由 OpenAI ImageGen 生成，台账存在 | 原创代码、生成图片 | 通过 |
| 8 | `instant-photo` | 无开源上游 | 通用即时相纸机制；相机与默认照片为生成内容 | 原创代码、生成图片、用户替换照片 | 通过 |
| 9 | `nested-gift` | 无开源上游 | 创意池原创；运行图集为生成内容 | 原创代码、生成图片 | 通过 |
| 10 | `paper-plane-mail` | 两个仓库写了 commit 哈希但仓库链接仍浮动；MPL-2.0/无源码许可与 CC BY 4.0 模型边界有记录，缺固定 URL/版权人 | 只核验许可生态和题材变体；零代码、零模型、零上游素材 | 机制、生成图片；系统字体、无音频 | 中缺口 |
| 11 | `star-code-unlock` | 三项来源已固定；许可证名有 MIT/ISC 元数据冲突记录，但缺固定许可证 URL 与版权人 | 只研究图案锁、点边谜题和真实天图依赖边界；未复制代码、星表、关卡和素材 | 原创题目/答案、生成背景；生成工具与日期未落入口台账 | 中缺口 |
| 12 | `hand-crank-music-box` | 一手机构史料，不是代码上游 | 只研究机械关系；未下载馆藏图，未复制歌曲或代码 | 原创代码、生成图片、Web Audio 合成音 | 通过 |
| 13 | `moon-phase-secret` | SunCalc 固定 commit，BSD 名称已写；缺固定许可证 URL 与版权人 | 只用于证明无需完整天文库；未复制 SunCalc 或 NASA 图片 | 机制、天文事实、生成月面 | 中缺口 |
| 14 | `fog-window-letter` | 四项 MIT 来源 commit、版权和哈希齐；缺固定许可证 URL | 只研究 Canvas 手写、DPR、点组和对象边界；零源码/API/算法复制 | 机制、生成背景 | 中缺口 |
| 15 | `starlight-keepsake-search` | PixiJS/Konva/Phaser 等均固定且版权齐；缺固定许可证 URL | 只研究渲染、mask、滤镜和输入边界；未复制 renderer、shader、API、素材 | 机制、原创地图、生成背景 | 中缺口 |
| 16 | `future-cookie-notes` | 两项 MIT 固定许可证 URL 和版权齐；MIT/ISC 冲突项已排除 | 只研究单动作信息层级；未复制代码、签语、图片、字体或布局 | 机制、生成背景/图集 | 通过 |
| 17 | `origami-heart` | 两个 MIT 上游固定 commit、许可证 URL、哈希和版权齐 | 只研究 DOM/CSS 折面与生命周期；未复制代码、数学、API、SVG 和素材 | 机制、原创 SVG | 通过 |

### 2.2 Co-op（24）

| # | 入口 | 来源固定与许可 | 实际借鉴/使用；未复制边界 | 分类型核对 | 状态 |
| ---: | --- | --- | --- | --- | --- |
| 18 | `hot-seat-pictionary` | 无已列明开源上游，但 README 写有不可复核的“调研候选” | 传统玩法，代码和示例题库原创；未复制题库、视觉和素材 | 原创代码、原创题库 | 中缺口 |
| 19 | `twin-light-maze` | TwoPlayerGames 固定 commit、MIT URL、版权齐 | 借鉴双角色、压力板、双出口；未复制源码、地图字符串、常量和素材 | 机制、原创四张地图、生成图集 | 通过 |
| 20 | `tethered-heart` | 两项 MIT 上游固定并有许可证 URL；Matter.js 权利主体未在入口内写全 | 借鉴共同影响载荷与距离约束；未复制源码、公式、参数、角色或地图 | 机制、原创三幕地图、生成资产 | 中缺口 |
| 21 | `lighthouse-passage` | 标准与五个项目均固定；许可 URL、版权主体齐 | 研究 API、物理、视野、公开投影；未复制算法、音乐和 Kenney 素材 | 机制、原创三幕、生成资产 | 通过 |
| 22 | `rhythm-relay` | 无特定开源上游 | 规则原创；未复制代码、视觉、音效、题库和素材 | 原创代码、合成音；概念图仅 docs | 通过 |
| 23 | `telegraph-codebook` | 无开源上游 | 自定义六码本与实现原创；未复制摩斯题库、录音或字体 | 原创代码、题库、合成音 | 通过 |
| 24 | `kitchen-relay` | 无开源上游 | 通用餐厅协作流程；未参考特定项目/品牌 | 原创代码、生成背景/图集 | 通过 |
| 25 | `closer-cards` | 两个 CoupleCards 固定 commit、MIT URL、版权齐 | 只研究本地抽取提示与产品边界；零代码、零题目复制 | 机制、原创 24 张中文题卡、生成背景 | 通过 |
| 26 | `shared-color-studio` | 四项来源固定；MIT/CC BY-NC/无许可证差异均明确，冲突项排除 | 研究颜色反馈和静态直开；未复制算法、题面、CSS 和素材 | 机制、生成背景 | 通过 |
| 27 | `signal-repair-manual` | MIT 与受限 ModKit 来源均固定，许可证 URL/版权齐 | 只研究互补信息分工；未复制炸弹规则、手册、字体、图片或音频 | 原创代码、原创十二张题卡、生成背景 | 通过 |
| 28 | `four-hands-harmony` | Tone.js、MDN、ptcollab、pianco 固定，版权齐；缺固定许可证 URL | 研究音频时间线、声部分工与事件模型；未复制旋律、采样、SoundFont/MIDI/字体 | 机制、生成背景、内部合成音 | 中缺口 |
| 29 | `same-pace-star` | 四项软件与规范固定，许可名/版权齐；缺固定许可证 URL | 研究阶段提示和生命周期；未复制处方节奏、音频、字体、健康数据 | 机制、生成背景 | 中缺口 |
| 30 | `steady-together` | 十项物理/平衡来源固定，许可名/版权基本齐；缺固定许可证 URL | 研究支点、固定步、共同控制；未引入引擎实现、数据或素材 | 机制、生成背景 | 中缺口 |
| 31 | `moving-home-together` | 六项来源固定，许可名/版权齐；缺固定许可证 URL | 研究凸碰撞、固定步与双人载荷；未复制算法、API、关卡和参数 | 机制、原创 S 形地图、生成背景 | 中缺口 |
| 32 | `moon-base-power` | 三项来源固定，MIT/MPL-2.0 与版权齐；缺固定许可证 URL | 研究网络连接、拓扑动作和容量；未复制代码、数据集、地图和音效 | 机制、生成背景 | 中缺口 |
| 33 | `fog-navigation` | 三项使用来源固定，另有固定排除项；缺固定许可证 URL | 研究网格、视野和合作分工；未复制算法、地图、参数和素材 | 机制、原创四张地图、生成背景 | 中缺口 |
| 34 | `cloud-recipe` | 三个落物/双人来源固定，MIT 与版权齐；缺固定许可证 URL | 研究接取区和共同作用对象；未复制随机、物理、地图和素材 | 机制、生成三张资产 | 中缺口 |
| 35 | `together-zipper` | 三项使用来源固定，webosu 固定排除；缺固定许可证 URL | 研究事件表、键盘生命周期和路径进度；未复制谱面、媒体、字体或 SVG | 机制、生成三张资产 | 中缺口 |
| 36 | `seven-day-garden` | 四项来源固定，Apache/MIT 与版权齐；缺固定许可证 URL | 研究离散日、有限行动和状态遍历；未复制地图、算法库、参数和素材 | 机制、原创数据、生成资产 | 中缺口 |
| 37 | `constellation-relay` | 五项来源固定，MIT/BSD 与版权齐；缺固定许可证 URL | 研究点线谜题、相交、Euler 路径和数据层；未复制算法、天文数据和素材 | 机制、原创 9 点 10 边图、生成资产 | 中缺口 |
| 38 | `i-heard-you` | 入口委托 `speech-whisper-base`；能力包固定 whisper.cpp、模型、Emscripten revision，保存许可证正文、哈希与构建记录 | 实际使用 WASM 引擎、模型和 tokenizer；未复制官方示例 DOM/CSS/视觉 | 第三方代码、模型、麦克风输入；入口本身不保存录音 | 通过（委托声明） |
| 39 | `together-lock` | Socket.IO 4.8.1 版本固定但仓库 URL 浮动；缺许可证 URL/版权人 | 实际调用共享房间 API；未复制示例、文档或视觉 | 第三方代码依赖 | **高缺口** |
| 40 | `lan-pictionary` | Socket.IO、Whitebophir、Excalidraw Room 全部浮动；缺固定许可 URL/版权人 | Socket.IO 实际依赖；其余只研究房间架构；未复制白板实现 | 第三方代码依赖、原创题库和笔迹协议 | **高缺口** |
| 41 | `compatibility-quiz` | CoupleCards 固定，其余四个研究源及 Socket.IO 浮动；混合许可只部分闭合 | Socket.IO 实际依赖；其余研究问答和主机架构；未复制代码、题目和视觉 | 第三方代码依赖、原创题库 | **高缺口** |

### 2.3 Versus（17）

| # | 入口 | 来源固定与许可 | 实际借鉴/使用；未复制边界 | 分类型核对 | 状态 |
| ---: | --- | --- | --- | --- | --- |
| 42 | `lan-connect-four` | 两个研究源与 Socket.IO 全部浮动；MIT URL/版权人缺 | Socket.IO 实际依赖；其余研究棋盘和 LAN 架构；未复制服务器、数据库、代码和素材 | 第三方代码依赖 | **高缺口** |
| 43 | `sealed-rps` | boardgame.io 与 Socket.IO 浮动；MIT URL/版权人缺 | Socket.IO 实际依赖；研究隐藏视图与裁判；未复制 reducer、服务器、UI 和素材 | 第三方代码依赖 | **高缺口** |
| 44 | `balloon-dare` | 无开源上游 | push-your-luck 规则原创；未复制代码、题库、音效和视觉 | 原创代码、生成资产 | 通过 |
| 45 | `number-target` | 无开源上游 | 数字凑靶规则和题面生成原创 | 原创代码、题面、生成资产 | 通过 |
| 46 | `paper-soccer` | 两个仓库写了 commit 哈希但链接浮动；MIT URL/版权人缺 | 只核验许可生态和传统规则；零代码、零素材 | 机制、生成背景；系统字体、无音频 | 中缺口 |
| 47 | `echo-arena` | 两个 Simon 项目固定，Apache/MIT 名称齐；缺固定许可 URL/版权人 | 只核验序列记忆机制；未使用商业名称、外观、声音或代码 | 机制、生成背景、合成音 | 中缺口 |
| 48 | `dots-and-boxes` | 两个 MIT 项目固定且许可 URL/版权齐；无许可证项目固定并排除 | 研究联网架构与重复边风险；未复制 React/Socket 代码、CSS 和素材 | 机制、生成纹理 | 通过 |
| 49 | `light-trail-hunt` | 四项来源固定，MIT URL/版权齐；另识别音频 CC 许可 | 研究网格、持续移动和输入风险；未复制代码、音频、字体或模型 | 本地纹理/SVG 的生成工具、日期和输入链未记录 | 中缺口 |
| 50 | `orbit-star-race` | 四项来源固定；许可名齐，部分版权齐；缺固定许可证 URL | 研究轨道教育、重力和双人输入风险；零代码、音乐、字体、关卡复制 | 机制、科学事实、生成星图/图集 | 中缺口 |
| 51 | `secret-recipe-code` | 五个来源固定，MIT/版权齐；缺固定许可证 URL | 研究历史行、重复元素反馈和移动交互；未复制规则原文、代码和素材 | 机制、生成背景 | 中缺口 |
| 52 | `memory-bid` | 四个来源固定，MIT/版权齐；缺固定许可证 URL | 研究序列推进、键盘路径和结构化报价；未复制声音、颜色、题材和规则文字 | 机制、生成背景/图集 | 中缺口 |
| 53 | `garden-resource-duel` | 两项来源固定，MIT/版权/许可证哈希齐；缺固定许可证 URL | 研究热座秘密选牌、纯状态迁移和公开投影；未复制牌面、API、页面和素材 | 机制；无第三方资产 | 中缺口 |
| 54 | `heart-catapult` | 五项来源固定，MIT/版权/许可证哈希齐；缺固定许可证 URL | 研究投射阶段、反弹预算和碰撞分层；未复制物理实现、地图和素材 | 机制、原创 SVG | 中缺口 |
| 55 | `soft-sumo` | 三项 MIT 来源固定且版权齐；缺固定许可证 URL；无许可证项目已排除 | 研究互推、固定步、冲量和纠偏；未复制引擎、公式实现和素材 | 机制、生成背景/图集 | 中缺口 |
| 56 | `reaction-duel` | 无开源上游 | 传统反应测试，代码原创；未复制视觉、音效和素材 | 原创代码 | 通过 |
| 57 | `ribbon-tug` | TwoPlayerGames 固定 commit、MIT URL、版权齐 | 借鉴反复输入拉动共享标记；未复制脚本、Canvas、常量、音效和素材 | 机制；无第三方媒体 | 通过 |
| 58 | `heart-sprint` | Hackbox、PocketWebGames 固定；Socket.IO 声称固定为 `tree/4.8.1`，该 URL 与 `blob/4.8.1/LICENSE` 现场不可解析 | 前两项研究控制器/主机架构；Socket.IO 是实际依赖；未复制源码、协议和素材 | 第三方代码依赖；概念图仅 docs | **高缺口** |

## 3. Installed 的代码、资产与内容交叉结论

### 3.1 实际依赖的上游固定证据

2026-07-25 使用上游 Git 仓库、npm 官方 registry 与固定 raw 文件复核：

| 依赖 | lockfile 版本 | 官方包元数据/固定提交 | 固定许可证与版权 | 当前声明问题 |
| --- | --- | --- | --- | --- |
| Socket.IO | 4.8.1 | npm `gitHead` 与上游 tag `socket.io@4.8.1` 均指向 [`91e1c8b…`](https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367) | [MIT LICENSE](https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/LICENSE)，Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors | `shared/runtime/README.md` 及多数入口仍链接浮动首页；`heart-sprint` 使用不存在的 `4.8.1` 路径，而不是 `socket.io@4.8.1` 或 commit |
| node-qrcode | 1.5.4 | npm `gitHead` 与上游 `v1.5.4` 指向 [`3848ed2…`](https://github.com/soldair/node-qrcode/tree/3848ed2c17de5bcdead487417dbf14c5dd017f8d) | 固定文件名为小写 [`license`](https://github.com/soldair/node-qrcode/blob/3848ed2c17de5bcdead487417dbf14c5dd017f8d/license)，MIT，Copyright (c) 2012 Ryan Day | 共享声明只给版本、浮动仓库和许可证名 |
| Pannellum | 2.5.7 | 上游 tag `2.5.7` 指向 [`a5e2f25…`](https://github.com/mpetroff/pannellum/tree/a5e2f25d960270b6cdd6136d2c18c21f745bba0e) | [MIT COPYING](https://github.com/mpetroff/pannellum/blob/a5e2f25d960270b6cdd6136d2c18c21f745bba0e/COPYING)，Copyright (c) 2011-2026 Matthew Petroff | `panorama-memory` 使用真实依赖但只给浮动仓库 URL；包内许可证存在 |

以上三项已由 `package-lock.json` 固定安装包版本；lockfile 固定不替代面向人的
仓库/许可证/版权声明，也不替代分发包中保留许可证正文。

### 3.2 媒体、字体、地图与题库

- **录音**：只有 `love-tree/renxi.mp3`。README 已承认其为商业录音、授权未确认；
  本地播放不能消除复制或把仓库交给对象时的再分发问题。
- **字体**：没有入口打包字体文件。涉及 Bravura、厂商 Emoji 或上游字体的项目均
  声明未复制，实际使用系统字体 fallback。
- **合成音**：`hand-crank-music-box`、`rhythm-relay`、`telegraph-codebook`、
  `four-hands-harmony`、`echo-arena` 使用本仓代码或 Web Audio 合成，不分发第三方录音。
- **地图/关卡**：`twin-light-maze`、`tethered-heart`、`lighthouse-passage`、
  `starlight-keepsake-search`、`moving-home-together`、`fog-navigation`、
  `constellation-relay` 均声明地图/图为原创；未发现运行目录中另带第三方地图包。
- **题库/内容**：`hot-seat-pictionary`、`closer-cards`、`signal-repair-manual`、
  `star-code-unlock`、`compatibility-quiz`、`telegraph-codebook` 均声明题库、
  线索或码本原创，未发现从所列研究项目复制题库的证据。
- **生成资产**：大多数运行图片已有 `assets/ATTRIBUTION.md` 或生成台账；
  `star-code-unlock` 和 `light-trail-hunt` 的生产生成资产仍缺工具、日期或输入链字段。

