# 视觉阻塞项审批摘要

- 基线：`df022190817806d2f9e4d385c9b3bc1526e8a666`
- 范围：汇总 `docs/orchestration-board.md` 原有的 21 个视觉 Blocked 项，并单列本轮新增的 `love-tree` clean-room 方向。
- 作用：帮助用户查看既有方向与证据，并明确批准、修改或继续阻塞。
- 边界：本文不批准任何项目，不生成图片，不授权生产 UI，也不把概念图当作运行时资产、规则真值或可访问性证据。

## 如何回复

只有用户发出明确回复才算批准。沉默、只讨论细节、批准其他项目或回复“继续”都不构成批准。

### 批量确认模板

以下模板覆盖原有 21 项，`capsule-docking` 已补齐可审阅图片；**不包含本轮新增的 `love-tree`**：

```text
我确认以下 21 项按 docs/365 所列现有视觉方向进入生产 UI：
wish-fireworks、snow-globe-message、flower-language-bouquet、candle-wishes、
shadow-duet、shadow-sword-duel、honeycomb-passage、compliment-reels、
capsule-docking、
photo-slider-race、dual-maze-race、penguin-flag-duel、twin-orbit、
ricochet-tank-duel、kaleidoscope-names、word-detour-duel、
four-symbol-film-duel、vinyl-secret、memory-merge-board、
seven-piece-duet、our-place-guess。
我确认的是提案中的设计原则、active/final 候选和明确偏差，不确认生成图中的错字、
错误几何、未来状态、隐私泄漏或其他生成幻觉；生产仍须 code-native 重建并通过测试与浏览器 Gate。
love-tree 保持未确认，按新增审批项单独回复。
```

### 单项修改模板

```text
修改 <project-id>：
- 保留：
- 改为：
- 不接受：
- 需要补看的状态或预览：
未列出的项目保持未确认。
```

## 逐项摘要

### 1. `wish-fireworks`

- 用途：单人给对方放三束必定成功的字形烟火，第三束后展开私人短笺。
- 现有方向：深靛午夜屋顶、暖金离散点阵、深梅红发射台、暖纸短笺；开放前缀轨而非预画三格答案槽。
- 关键边界：未落定字符和完整短笺不得提前进入 DOM；控件、文字与 9×9 点阵必须 code-native；焦点、pressed、disabled、forced-colors、无 Canvas 与 reduced-motion 均不能只靠颜色、glow 或动画；概念字形、点阵和断点不是规则真值。
- 证据：[视觉提案](./229-wish-fireworks-design-proposal.md) · [ImageGen 简报](./202-wish-fireworks-imagegen-brief.md) · [生成台账](./assets/wish-fireworks/GENERATION.md)
- 当前预览：[W01](./assets/wish-fireworks/w01-desktop-intro.png) · [W02](./assets/wish-fireworks/w02-desktop-ready0.png) · [W03](./assets/wish-fireworks/w03-desktop-holding.png) · [W04](./assets/wish-fireworks/w04-desktop-bursting1.png) · [W05](./assets/wish-fireworks/w05-desktop-ready2.png) · [W06](./assets/wish-fireworks/w06-desktop-complete.png) · [W07](./assets/wish-fireworks/w07-mobile-ready1.png) · [W08](./assets/wish-fireworks/w08-mobile-complete.png) · [W09](./assets/wish-fireworks/w09-landscape-complete.png) · [W10](./assets/wish-fireworks/w10-landscape-ready2.png) · [W11](./assets/wish-fireworks/w11-narrow-failure.png) · [W12](./assets/wish-fireworks/w12-narrow-no-js.png) · [W13](./assets/wish-fireworks/w13-reduced-motion-ready1.png) · [W14](./assets/wish-fireworks/w14-forced-colors-complete.png) · [W15](./assets/wish-fireworks/w15-no-canvas-complete.png)
- 可直接回复：`确认 wish-fireworks：按“深靛午夜屋顶 + 暖金点阵 + 深梅红发射台 + 暖纸短笺”现有提案进入生产 UI。`

### 2. `snow-globe-message`

- 用途：单人收集四阵风，让中性雪点落成图案后显示给对方的五节点短笺。
- 现有方向：冬夜床头的私人玻璃雪球；冷蓝厚壁玻璃、奶油雪点、深莓底座与少量暖金。
- 关键边界：gathering/armed 不得泄漏图案或私信，complete 才创建五个私人节点；9×11/63 点目标来自规格而非描图；方向按钮、焦点、forced-colors、CSS grid 降级和 reduced-motion 都需真实实现；不暗示加密。
- 证据：[视觉提案](./210-snow-globe-message-design-proposal.md) · [ImageGen 简报](./200-snow-globe-message-imagegen-brief.md) · [生成台账](./assets/snow-globe-message/GENERATION.md)
- 当前预览：[desktop gathering](./assets/snow-globe-message/desktop-gathering-concept.png) · [desktop armed](./assets/snow-globe-message/desktop-armed-concept.png) · [desktop settling](./assets/snow-globe-message/desktop-settling-concept.png) · [desktop complete](./assets/snow-globe-message/desktop-complete-concept.png) · [mobile gathering](./assets/snow-globe-message/mobile-gathering-concept.png) · [mobile complete](./assets/snow-globe-message/mobile-complete-concept.png) · [landscape complete](./assets/snow-globe-message/landscape-complete-concept.png) · [narrow failure](./assets/snow-globe-message/narrow-preparation-failure-concept.png) · [accessibility](./assets/snow-globe-message/accessibility-comparison-concept.png) · [no JavaScript](./assets/snow-globe-message/narrow-no-javascript-concept.png)
- 可直接回复：`确认 snow-globe-message：按“冬夜床头的私人玻璃雪球”现有提案进入生产 UI。`

### 3. `flower-language-bouquet`

- 用途：依次挑三枝花，组合花语与私人留言，并可由用户主动准备 SVG 保存文件。
- 现有方向：线描标本室里的私人花束台；手工纸、墨绿装订、深酒红动作、旧黄铜夹具和少量 SVG primitive 花束。
- 关键边界：intro 不创建花池或私人字段，complete 才创建私人纸笺与保存区；保存只能说“交给浏览器处理”，不能承诺落盘；按钮、三席、花名花语与焦点必须是 code-native；只批准 v2，v1 写实稿和移动 draft 已淘汰。
- 证据：[视觉提案](./187-flower-language-bouquet-design-proposal.md) · [生成台账](./assets/flower-language-bouquet/GENERATION.md)
- 当前预览：[desktop intro v2](./assets/flower-language-bouquet/desktop-intro-v2-concept.png) · [desktop arranging v2](./assets/flower-language-bouquet/desktop-arranging-v2-concept.png) · [mobile preview v2](./assets/flower-language-bouquet/mobile-preview-v2-concept.png) · [desktop complete v2](./assets/flower-language-bouquet/desktop-complete-v2-concept.png) · [mobile export error v2](./assets/flower-language-bouquet/mobile-export-error-v2-concept.png)
- 可直接回复：`确认 flower-language-bouquet：接受“线描标本室里的私人花束台”v2、既定 v1 舍弃项、触控尺寸与保存状态边界，进入生产 UI。`

### 4. `candle-wishes`

- 用途：按线索依次点亮五支蜡烛，逐句揭晓愿望，最后收下一封信。
- 现有方向：安静餐桌上的纸艺小蛋糕；暖灰纸面、深莓蛋糕、奶油糖霜、低饱和彩色蜡烛与细金边。
- 关键边界：未揭晓愿望不创建占位，complete 前最终信不存在；五支蜡烛是原生按钮并有文字状态；火焰不承担唯一语义，forced-colors/reduced-motion 保持完整；拒绝编号、信封、锁图标、日期、保存提示和概念 PNG 运行依赖。
- 证据：[视觉提案](./217-candle-wishes-design-proposal.md) · [生成台账](./assets/candle-wishes/GENERATION.md)
- 当前预览：[desktop lighting](./assets/candle-wishes/concept-lighting-desktop.png) · [mobile complete](./assets/candle-wishes/concept-complete-mobile.png)
- 可直接回复：`确认 candle-wishes：按“暖灰纸面 + 深莓纸艺蛋糕 + 开放愿望区与最终信”现有提案进入生产 UI。`

### 5. `shadow-duet`

- 用途：两人同机按住各自姿势键，在六幕中共同完成定格，不比较个人表现。
- 现有方向：午夜背光纸幕小剧场；深靛房间、琥珀纸幕、左右深墨剪影、六拍灯和纸片双席。
- 关键边界：不用摄像头、人脸或写实身体；记录与结语按 phase 延迟创建，不把个人贡献变成分数；八键状态、焦点和成功须有文字/边框冗余；概念剪影、中文与布局不是状态真值，图片失败时 CSS 轮廓仍可玩。
- 证据：[视觉提案](./205-shadow-duet-design-proposal.md) · [ImageGen 简报](./204-shadow-duet-imagegen-brief.md) · [生成台账](./assets/shadow-duet/GENERATION.md)
- 当前预览：[S01](./assets/shadow-duet/s01-desktop-intro.png) · [S02](./assets/shadow-duet/s02-desktop-scene-intro.png) · [S03](./assets/shadow-duet/s03-desktop-dancing-ready.png) · [S04](./assets/shadow-duet/s04-desktop-dancing-window.png) · [S05](./assets/shadow-duet/s05-desktop-pose-result.png) · [S06](./assets/shadow-duet/s06-desktop-missed.png) · [S07](./assets/shadow-duet/s07-desktop-act-result.png) · [S08](./assets/shadow-duet/s08-desktop-complete.png) · [S09](./assets/shadow-duet/s09-mobile-dancing-window.png) · [S10](./assets/shadow-duet/s10-mobile-complete.png) · [S11](./assets/shadow-duet/s11-narrow-missed.png) · [S12](./assets/shadow-duet/s12-narrow-no-js.png) · [S13](./assets/shadow-duet/s13-landscape-dancing-window.png) · [S14](./assets/shadow-duet/s14-reduced-motion-dancing-window.png) · [S15](./assets/shadow-duet/s15-forced-colors-dancing-window.png) · [S16](./assets/shadow-duet/s16-image-blocked-dancing-window.png)
- 可直接回复：`确认 shadow-duet：按“深靛午夜房间 + 琥珀背光纸幕 + 两道深墨剪影”现有提案进入生产 UI。`

### 6. `shadow-sword-duel`

- 用途：同机热座秘密选招，以攻、防、闪、蓄进行最多九回合的资源对决。
- 现有方向：午夜纸影决斗台；深靛纤维纸、暖象牙文字、左朱砂/右淡青席位、两侧资源 rail 与中轴唯一任务。
- 关键边界：已封动作必须从对手视图和 DOM 消失；ready 只显示不编码动作的中性纸折，不暗示加密；动作规则文字以规格为真，拒绝生成图中的护甲、跳过下回合等错误；焦点与席位不只靠 glow/颜色。
- 证据：[视觉提案](./222-shadow-sword-duel-design-proposal.md) · [生成台账](./assets/shadow-sword-duel/GENERATION.md)
- 当前预览：[desktop choosing](./assets/shadow-sword-duel/concept-choosing-desktop.png) · [mobile ready](./assets/shadow-sword-duel/concept-ready-mobile.png) · [desktop result](./assets/shadow-sword-duel/concept-result-desktop.png)
- 可直接回复：`确认 shadow-sword-duel：按“深靛纸影 + 暖象牙 + 左朱砂/右淡青 + 中性纸折”现有提案进入生产 UI。`

### 7. `honeycomb-passage`

- 用途：两人轮流在 37 格蜂巢上移动或封一格，先到对边且不能彻底堵死任何一方。
- 现有方向：反复拿出来玩的纸雕蜂巢棋盘；暖象牙手工纸、琥珀格、蜜黄/暮紫异形棋子与酒红封蜡。
- 关键边界：37 格、合法移动、封蜡与路线只来自逻辑，不能照抄概念图；两棋子需刻纹/文字冗余，focus 与模式高亮分离；移动端、forced-colors 与 reduced-motion 保持可操作；生成稿的错格、任意路线、快捷键和额外动作全部排除。
- 证据：[视觉提案](./226-honeycomb-passage-design-proposal.md) · [生成台账](./assets/honeycomb-passage/GENERATION.md)
- 当前预览：[desktop intro](./assets/honeycomb-passage/concept-intro-desktop.png) · [desktop playing](./assets/honeycomb-passage/concept-playing-desktop.png) · [mobile playing](./assets/honeycomb-passage/concept-playing-mobile.png) · [desktop result](./assets/honeycomb-passage/concept-result-desktop.png)
- 可直接回复：`确认 honeycomb-passage：按“暖象牙纸雕蜂巢棋盘 + 蜜黄/暮紫棋子 + 酒红封蜡”现有提案进入生产 UI。`

### 8. `compliment-reels`

- 用途：单人拉动三段夸夸纸卷组合句子，三次特别同频后展开私人结语。
- 现有方向：安静书桌上的私人夸夸印刷机；浅粉陶土纸面、深梅红机身、奶油纸卷、珊瑚实体把手与少量旧黄铜。
- 关键边界：spinning 不泄漏未来 stop，私人结语只在终局出现；三段、把手、焦点、错误和 live region 都 code-native；拒绝赌场符号、分数、付费暗示和庆祝粒子；需一并确认 320px 三条连接标签与终局标题“特别同频”。
- 证据：[视觉提案](./198-compliment-reels-design-proposal.md) · [ImageGen 简报](./197-compliment-reels-imagegen-brief.md) · [生成台账](./assets/compliment-reels/GENERATION.md)
- 当前预览：[desktop ready](./assets/compliment-reels/desktop-ready-concept.png) · [desktop spinning](./assets/compliment-reels/desktop-spinning-concept.png) · [desktop result](./assets/compliment-reels/desktop-result-concept.png) · [desktop jackpot](./assets/compliment-reels/desktop-jackpot-concept.png) · [mobile result](./assets/compliment-reels/mobile-result-concept.png) · [narrow result](./assets/compliment-reels/narrow-result-concept.png) · [tablet result](./assets/compliment-reels/tablet-result-concept.png) · [narrow failure](./assets/compliment-reels/narrow-failure-concept.png)
- 可直接回复：`确认 compliment-reels：接受“深梅红桌面夸夸印刷机”、320px 三条连接标签和终局标题“特别同频”，进入生产 UI。`

### 9. `capsule-docking`

- 用途：两人分别控制姿态与推进，共同让一艘舱体满足六项安全条件并稳定 30 tick。
- 现有方向：已补齐一个“纸质近地轨道训练台”统一方向：深炭蓝观察窗、暖灰纸模舱体、珊瑚姿态席、青绿推进席、四项遥测与六条 Gate。
- 关键边界：只显示一艘共享舱体，不显示个人失误、分数、燃料、倒计时或真实航天建议；规则几何、遥测、Gate、文字、焦点和无障碍必须 code-native；禁止真实航天机构品牌、真实接口、金路径、下一按键和生成式错误几何。
- 证据：[ImageGen 简报](./208-capsule-docking-imagegen-brief.md) · [视觉提案](./369-capsule-docking-design-proposal.md) · [生成台账](./assets/capsule-docking/GENERATION.md)
- 当前预览：[desktop active](./assets/capsule-docking/d05-desktop-approaching-partial.png) · [mobile active](./assets/capsule-docking/d12-mobile-390-approaching.png)
- 可直接回复：`确认 capsule-docking：接受“纸质近地轨道训练台”统一方向，以 desktop active 与 mobile active 两张当前概念为视觉锚点；生产 UI 按 369 的 code-native、隐私、规则、无障碍和生成幻觉边界实现。`

### 10. `photo-slider-race`

- 用途：两人用同一张本地照片各自完成 3×3 滑块拼图，比用时和步数。
- 现有方向：午夜双星拼图台；深夜蓝背景、暖金/珊瑚双席、两块等大棋盘、中央窄 HUD 与单一底部操作轨。
- 关键边界：照片只在本页处理、不上传、不保存，并提示用户只选有权使用的图片；不显示文件名、路径、EXIF/GPS、Blob URL；键盘、触控、焦点、44px 目标与 reduced-motion 需真实验证；默认图、数字和棋盘不能从概念图复刻。
- 证据：[视觉提案](./295-photo-slider-race-design-proposal.md)
- 当前预览：[desktop active race](./assets/photo-slider-race/desktop-active-race-concept.png) · [mobile active race](./assets/photo-slider-race/mobile-active-race-concept.png)
- 可直接回复：`确认 photo-slider-race：按“午夜双星拼图台 + 深夜蓝 + 暖金/珊瑚双棋盘”现有提案及其已知偏差进入生产 UI。`

### 11. `dual-maze-race`

- 用途：两人在同一确定迷宫的双棋盘上同时竞速，四局换席并累计结果。
- 现有方向：共享地图桌；暖纸白、深墨迷宫、钴蓝圆点/点纹、朱砂菱形/斜纹、常青绿终点与单一比赛信息轨。
- 关键边界：迷宫 passage、席位、bump、计时和比分只来自 core；两盘必须等大同朝向，玩家身份不只靠颜色；八个原生按钮、焦点、reduced-motion 和 forced-colors 要真实验证；生成图的 9×9 外观、固定席位、共享 bump 和像素尺寸均不是产品真值。
- 证据：[视觉提案](./297-dual-maze-race-design-proposal.md)
- 当前预览：[desktop active race](./assets/dual-maze-race/desktop-active-race-concept.png) · [mobile active race](./assets/dual-maze-race/mobile-active-race-concept.png)
- 可直接回复：`确认 dual-maze-race：按“暖纸白共享地图桌 + 钴蓝圆点/朱砂菱形”现有提案及 code-native 偏差进入生产 UI。`

### 12. `penguin-flag-duel`

- 用途：两只企鹅在镜像冰场抢中立旗、碰撞掉旗并带回己方基地，先到三分。
- 现有方向：极夜冰场转播台；极夜蓝外围、浅青冰场、开放 HUD、点阵/条纹基地、暖黄旗与原创几何企鹅。
- 关键边界：零网络、零存储、零权限；企鹅、基地、围巾尾形和文字提供非颜色冗余；两席并发触控、焦点、forced-colors 与 reduced-motion 需真实验证；位置、旗、比分、时间、冰岛和 1024:640 几何只来自 reducer/spec，不照抄生成图。
- 证据：[视觉提案](./303-penguin-flag-duel-design-proposal.md)
- 当前预览：[desktop active match](./assets/penguin-flag-duel/desktop-active-match-concept.png) · [mobile active match](./assets/penguin-flag-duel/mobile-active-match-concept.png)
- 可直接回复：`确认 penguin-flag-duel：按“极夜冰场转播台 + 点阵/条纹基地 + 原创几何企鹅”现有提案进入生产 UI。`

### 13. `twin-orbit`

- 用途：两人分别控制内外离散轨道标记，在五关中共同进入窗口。
- 现有方向：午夜双环刻度盘；深色双环、琥珀星与雾蓝菱形、门位和共同窗口。
- 关键边界：720 离散位置、门位、窗口和状态必须由规则投影；双标记以形状、文字和位置冗余，不只靠颜色；键盘、触控、屏幕阅读器、reduced-motion、forced-colors、无 JS/资产失败均需保留；概念中的刻度数量、位置、文字和像素几何不是产品真值。
- 证据：[视觉提案](./310-twin-orbit-design-proposal.md)
- 当前预览：[desktop playing](./assets/twin-orbit-desktop-playing-concept.png) · [mobile playing](./assets/twin-orbit-mobile-playing-concept.png)
- 可直接回复：`确认 twin-orbit：按“午夜双环刻度盘 + 琥珀星/雾蓝菱形”现有提案进入生产 UI。`

### 14. `ricochet-tank-duel`

- 用途：两人同时移动与发射，让多枚弹体在墙面折射并原子结算同刻命中。
- 现有方向：夜色折光桌游；深靛棱镜折射台、珊瑚/湖蓝双席、清晰墙体与在途光点。
- 关键边界：实时移动、双方同刻输入、多弹、最多三次反射和同刻原子命中都要可读；暂停、失焦、长帧、焦点、200%/400%、forced-colors 与 reduced-motion 不能改变规则；坦克、墙、弹道、分数和命中都 code-native，概念中的错误数量、轨迹和 HUD 不可信。
- 证据：[视觉提案](./312-ricochet-tank-duel-design-proposal.md)
- 当前预览：[desktop playing](./assets/ricochet-tank-duel-desktop-concept.png) · [mobile playing](./assets/ricochet-tank-duel-mobile-concept.png)
- 可直接回复：`确认 ricochet-tank-duel：按“深靛棱镜折射台 + 珊瑚/湖蓝双席”现有提案进入生产 UI。`

### 15. `kaleidoscope-names`

- 用途：两人异步输入名字并分别调校图案，最终把两个结果折成同一束光。
- 现有方向：深紫光学调校台；代码原生万花筒、对等双席、桌面 tuning 与移动 complete。
- 关键边界：名字与一席结果按 phase 创建和销毁，hidden CSS 不算隐私；输入、控件、pattern、焦点和 complete marks 必须 code-native；键盘、触控、reduced-motion、forced-colors、Canvas 失败和 no-JS 要有完整路径；生成图的文字、图案、控制值和阶段元素不是状态 Oracle。
- 证据：[视觉提案](./314-kaleidoscope-names-design-proposal.md)
- 当前预览：[desktop tuning](./assets/kaleidoscope-names-desktop-tuning-concept.png) · [mobile complete](./assets/kaleidoscope-names-mobile-complete-concept.png)
- 可直接回复：`确认 kaleidoscope-names：按“深紫光学调校台 + 异步单人揭晓”现有提案进入生产 UI。`

### 16. `word-detour-duel`

- 用途：同机热座猜词，一人看到目标与四条禁词后描述，另一人猜，随后换席计分。
- 现有方向：纸面路线改道指挥台；中央目标与四条封路、共享比赛轨和不透明交接。
- 关键边界：handoff/card-ready/describing 两道秘密边界必须真实卸载秘密 DOM；遮挡不能用 blur 假装隐私；输入、焦点、触控、屏幕阅读器、forced-colors 和 no-JS 都需保留；只采用方向 A，淘汰“电台绕词”和“纸条接力”，生成词语、分数和阶段均非真值。
- 证据：[视觉提案](./316-word-detour-duel-design-proposal.md)
- 当前预览：[desktop describing](./assets/word-detour-duel-desktop-describing-concept.png) · [mobile describing](./assets/word-detour-duel-mobile-describing-concept.png)
- 可直接回复：`确认 word-detour-duel：按“纸面路线改道指挥台 + 中央目标与四条封路”现有提案进入生产 UI。`

### 17. `four-symbol-film-duel`

- 用途：双方轮流根据四个抽象符号猜电影，在热座交接、确认、结果和汇总阶段对抗。
- 现有方向：独立影院票根台；复古影院色彩、四个 code-native 符号、桌面猜题与移动交接遮挡。
- 关键边界：handoff 是完全不透明的隐私边界，下一位确认前不渲染下一题；符号同时提供可见文字等价，焦点、reduced-motion、forced-colors 和无 JS 语义完整；不复制电影海报、剧照、商标或角色；生成图中的片名、票号、符号细节和状态不是产品数据。
- 证据：[视觉提案](./318-four-symbol-film-duel-design-proposal.md)
- 当前预览：[desktop question](./assets/four-symbol-film-duel-desktop-question-concept.png) · [mobile handoff](./assets/four-symbol-film-duel-mobile-handoff-concept.png)
- 可直接回复：`确认 four-symbol-film-duel：按“复古独立影院票根台 + 猜题/交接遮挡”现有提案进入生产 UI。`

### 18. `vinyl-secret`

- 用途：单人异步寻轨，把秘密逐圈显现；默认无音频，可选使用用户自备音频但不是播放器。
- 现有方向：私人压片工作台；唱片、唱臂、寻轨控制、信号与完成封套构成单一开放工作台。
- 关键边界：秘密内容按 seeking/playing/result/complete 阶段创建和销毁；默认不请求音频权限、不打包音乐，用户音频只在本地当前页处理；键盘、触控、焦点、reduced-motion、forced-colors、无 Canvas/CSS/JS 与音频失败均需诚实降级；生成沟槽、文本、时间与控制状态不是规则真值。
- 证据：[视觉提案](./320-vinyl-secret-design-proposal.md)
- 当前预览：[desktop seeking](./assets/vinyl-secret-desktop-seeking-concept.png) · [mobile complete](./assets/vinyl-secret-mobile-complete-concept.png)
- 可直接回复：`确认 vinyl-secret：按“私人压片工作台 + 默认无音频 + 异步单人寻轨”现有提案进入生产 UI。`

### 19. `memory-merge-board`

- 用途：两人围绕共同主题轮流挑选和放置记忆卡，合成共享的 3×4 剪贴簿。
- 现有方向：冷雾蓝共同剪贴簿；共享 3×4 拼板、纸片候选、方向控制与严格 phase 互斥。
- 关键边界：当前阶段只存在当前角色可见候选，选择、放置、分享阶段彼此互斥；本地不录音、不保存、不上传；键盘、触控、焦点、400% zoom 与 reduced-motion 需保持；只批准 desktop v2 和 mobile active，v1 已 superseded，生成线索、图片文字和 phase 混合均不批准。
- 证据：[视觉提案](./335-memory-merge-board-design-proposal.md)
- 当前预览：[desktop choose v2](./assets/memory-merge-board/desktop-choose-concept-v2.png) · [mobile place](./assets/memory-merge-board/mobile-place-concept.png)
- 可直接回复：`确认 memory-merge-board：按“冷雾蓝共同剪贴簿 + 共享 3×4 拼板 + phase 互斥”现有提案进入生产 UI。`

### 20. `seven-piece-duet`

- 用途：两人分别操作固定片组，共同把七块整数几何片拼进同一公开轮廓，四局换组。
- 现有方向：深墨纸面拼形台；A4/B3 纹理片组、共享轮廓、开放操作区与克制纸面反馈。
- 关键边界：七片几何、片组归属、轮廓与碰撞只来自 core；席位由形状、纹理、文字和位置共同表达；Pointer、键盘、焦点、reduced-motion、forced-colors 与窄屏均需可操作；生成图的片数、轮廓、拼合位置、状态文字和反馈不是规则真值。
- 证据：[视觉提案](./338-seven-piece-duet-design-proposal.md)
- 当前预览：[desktop playing](./assets/seven-piece-duet/desktop-playing-concept.png) · [mobile playing](./assets/seven-piece-duet/mobile-playing-390-concept.png)
- 可直接回复：`确认 seven-piece-duet：按“深墨纸面拼形台 + A4/B3 纹理片组 + 共享轮廓”现有提案进入生产 UI。`

### 21. `our-place-guess`

- 用途：两人加入同一房间后各自在地图上秘密猜地点，揭晓时比较双方点位与真实地点。
- 现有方向：夜行纸图；单一等距圆柱地图、guessing 只显示自己的圆点、revealed 显示三种形状 pin。
- 关键边界：房间口令、私人题包和对方 sealed point 不得泄漏；guessing 只能看到自己的点，revealed 才出现双方与答案；键盘、Pointer、reduced-motion、forced-colors 和 200% zoom 均需保持；真实地理、公里数、投影、pin 与 copy 来自 reducer/data，概念中的地名、位置、星标、指南针和弯曲地图均不可采用。
- 证据：[视觉提案](./341-our-place-guess-design-proposal.md)
- 当前预览：[desktop guessing](./assets/our-place-guess/desktop-guessing-concept.png) · [desktop revealed](./assets/our-place-guess/desktop-revealed-concept.png) · [mobile guessing](./assets/our-place-guess/mobile-guessing-concept.png) · [mobile revealed](./assets/our-place-guess/mobile-revealed-concept.png)
- 可直接回复：`确认 our-place-guess：按“夜行纸图 + guessing 仅自己的圆点 + revealed 三形 pin”现有提案进入生产 UI。`

## 已授权直接执行：`love-tree`

- 用途：单人触发一棵树从根部生长、形成自然但可读为心形的花冠，最后从树根展开给对方的信与共同时间。
- 现有方向：暮蓝纸雕花园；珊瑚心形种子、暖金枝干、低饱和粉色花冠和从树根展开的暖纸信笺。
- 关键边界：这是 clean-room 重构方向，只继承“点击、生长、花冠、情书、共同时间”的可观察体验目标；不读取、复制或改写旧源码、动画参数、CSS、商业歌曲、文案、压缩包或具体花冠图形。生产实现必须原创、code-native，并在验收通过后以独立提交退出旧依赖链。
- 证据：[brainstorm](./366-love-tree-clean-room-brainstorm.md) · [规格](./367-love-tree-clean-room-spec.md) · [计划](./368-love-tree-clean-room-plan.md) · [概念与生成边界](./assets/love-tree-clean-room/README.md)
- 当前预览：[desktop idle](./assets/love-tree-clean-room/concept-01-desktop-idle.png) · [desktop growing](./assets/love-tree-clean-room/concept-03-desktop-growing.png) · [desktop reveal](./assets/love-tree-clean-room/concept-02-desktop-reveal.png) · [mobile reveal](./assets/love-tree-clean-room/concept-04-mobile-reveal.png)
- 授权状态：用户已明确取消本项目的视觉确认门；总控可以按 [373 决策](./373-love-tree-visual-autonomy-decision.md) 直接实现，其他项目的确认状态不变。

## 审批结果解释

- “确认”只打开该项目的生产 UI 实现 Gate，不代表项目已经 installed。
- 生产实现仍须保留对应规格、隐私边界、借鉴声明、code-native 重建、测试、真实浏览器与 fidelity 验收。
- 若确认语中只列一部分项目，未列项目继续保持 Blocked。
- `capsule-docking` 在补齐候选和台账前继续保持 Blocked；不能用本文中的文字方向代替看图确认。
