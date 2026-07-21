# “每一格，都是喜欢你的理由”ImageGen 生成台账

## 1. 适用范围

本文件记录 `docs/assets/compliment-reels/` 中八张最终设计候选。它们只用于视觉确认和后续 fidelity 对比，不由 `experiences/surprises/compliment-reels/` 运行时加载。

- 工具：OpenAI 内置 `image_gen`；
- 具体模型/版本：工具调用结果未暴露，故记为“未暴露”，不猜测；
- 生成日期：2026-07-21；
- 第三方图片输入：无；
- 开源截图、商业素材、照片、字体、Logo、角色与品牌输入：无；
- 引用图片：只引用本轮先前生成的夸夸印刷机概念，用于保持机身与材料一致；
- 后处理：未裁切、重采样、压缩、修图或去背景；从 Codex generated-images 目录逐字节复制到仓库；
- 淘汰稿：仅用于同轮局部修正，不复制进仓库，也不进入接受候选。

## 2. 权利与来源边界

这些文件称为“本轮生成概念”，不称为排他原创作品。依据 [OpenAI Terms of Use](https://openai.com/en-GB/policies/row-terms-of-use/)，在用户与 OpenAI 之间且适用法律允许范围内，OpenAI 将其对 Output 的权利转让给用户；同一条款也说明输出可能不唯一，其他用户可能得到相似输出。

[OpenAI 的 C2PA 说明](https://help.openai.com/en/articles/8912793-c2pa-in-images) 说明生成凭证用于识别来源；它不证明图片准确、未编辑、依法拥有或处于正确语境。无第三方图片输入只描述本轮输入链，不构成唯一性、不侵权或排他权保证。

## 3. 文件、尺寸、引用链与 SHA-256

| # | 文件 | 尺寸 | 生成引用链 | SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `desktop-ready-concept.png` | 1503×1047 | 纯文字生成 → 删除误生铭牌字 → 单入口/对比度修订 | `59fe579fba3c1d0bea9fafb8cf8086a9d1cfd7eeedb2703511e4ec2da8ee91fb` |
| 2 | `desktop-spinning-concept.png` | 1586×992 | #1 → spinning → 单入口/对比度/删除伪进度修订 | `6ac1b957900d5ad024e15c3c62425e4dcf0e03dca0fe06480d21689ce08ac311` |
| 3 | `desktop-result-concept.png` | 1503×1047 | #1 → result → 修正历史顺序 → 单入口/对比度修订 | `bcaaca00da6b4b2bd026b7ff83fce23299975f32e1448e56bcceb2256f64ab3c` |
| 4 | `desktop-jackpot-concept.png` | 1504×1046 | #1 → jackpot → 删除误生标题/数字并补 signature → 单入口/对比度修订 | `b00bd6aa0f873036a784f55d17518e64f264b48c8e034b7540c78169755bbc4f` |
| 5 | `mobile-result-concept.png` | 852×1846 | #1 → 390px result → 把最大文本移入纸卷 → 单入口/对比度修订 | `4c327c5dc1bfe4d287ae5fd08bf0b971405bd0f0aba5446877cd52e9938901a0` |
| 6 | `narrow-result-concept.png` | 941×1672 | #1 → 320px result → 补历史纸条 → 单入口/对比度修订 | `786c9e5acf7f1f5ed9fcc17be9047a392bce641f5bbb73872da0da6b557dc090` |
| 7 | `tablet-result-concept.png` | 1086×1448 | #1 → 768px result → 把最大文本移入纸卷 → 单入口/对比度修订 | `c5b78a1d0844add506ef64f238009a3b4db1aa59cf9e2748eabc9223459e6ac9` |
| 8 | `narrow-failure-concept.png` | 941×1671 | #1 → 320px failure → 单入口/对比度 → 焦点归属修订 | `345541cf930d3083e038d691a3a0687878ccb2bdf16a5b2da3c665c951ad0645` |

工具未保证精确输出请求尺寸，因此表内记录真实文件尺寸。C5–C8 的逻辑 CSS 视口分别仍为 390×844、320×568、768×1024、320×568；位图不作为像素验收基准。

## 4. 可复现 prompt set

下面记录最终候选的完整有效指令集合。每张图都使用“共同指令 + 对应状态增量”；局部修订只改列明项目，其余要求保持不变。

### 4.1 共同指令

```text
Design one complete, implementation-ready screenshot for a local HTML/CSS/JavaScript Chinese couples surprise titled “每一格，都是喜欢你的理由”. The central object is a refined small tabletop letterpress compliment printing machine, not a casino slot machine: matte deep-plum body (#5B1837 / #351022), three cream paper reels (#FFF3D6), coral physical handle (#EF776B), navy code-native text (#17243C), restrained aged-brass edges (#B48A4A), on a pale pink terracotta paper background (#F3DFDA). Intimate, sincere, handcrafted, restrained, low-to-medium density, one strong physical form and an open page.

Keep title, guarantee, labels, sentence segments, result, history, private note and button as readable UI text. Do not add an eyebrow, kicker, badge, pill, navigation, cards/grid, metrics, share, settings, extra actions or invented headings. No BAR, 7, bells, cherries, coins, chips, cash, odds, payline, casino brand, neon, strong glow, bokeh, confetti, fireworks or prize imagery. No phone/device frame. The real production UI will keep all text code-native and will not use this bitmap at runtime; this image is only a layout, material, hierarchy and responsive reference.

Use the exact frozen Chinese copy for the requested state from docs/197-compliment-reels-imagegen-brief.md section 4. If raster text becomes imperfect, do not invent replacement copy. Preserve accessible visual cues: obvious native-button hit area, visible focus treatment where requested, legible disabled state, and layouts compatible with reduced motion and forced colors.

Final cross-state accessibility edit: remove the separate long side crank and detached coral grip from every state. Keep exactly one coral rectangular control connected to the machine by at most a very short brass stub, so it is the only handle-button. Use dark navy #17243C button text; when focus is shown, put a dark navy 3px outline around the button only. Preserve all other layout and text. For spinning, also remove the three pagination/progress dots and dashed lines without replacement.
```

### 4.2 #1 desktop ready

```text
Landscape desktop, requested 1504×1046. Show the title and finite guarantee, one large machine, the three labels in moment → shine → echo order, three blank cream reels containing only non-semantic short embossed marks, stage copy “第一句，等你来拉。” and a coral primary handle/button “拉一下，夸夸你” with a visible focus ring. Result, history and private letter are absent rather than empty cards. Keep the brass nameplate blank. No future answer text and no scrolling composition.
```

Final targeted edit: remove all accidentally generated letters from the brass nameplate while preserving the entire composition.

### 4.3 #2 desktop spinning

```text
Landscape desktop, requested 1280×800. Preserve the same machine. Show the title and guarantee, three blank paper reels with staggered vertical motion marks but no readable future answer, the previous already-public full sentence on the output paper, stage copy “正在把三段心意排在一起。” and the same action disabled in place as “正在组合…”. Keep the reel frame at least visually dominant and do not move focus or add a spinner icon.
```

### 4.4 #3 desktop result

```text
Landscape desktop, requested 1504×1046. Show the normal result state. The three reels contain, in order, “你发现我情绪变化的时候” / “会把真诚留在每一个细节里” / “让我更喜欢和你并肩的日子”. Print their complete composed sentence on one continuous full-width paper sheet. Below it show an open two-line history list in chronological order: first “你照顾身边人的时候，总能显出你细腻的用心，让我总想再靠近你一点点。”, then the current sentence. Show stage copy “这一句已经印好了。” and the same coral action “再拉一句”. Do not show jackpot or private-note content and do not invent a history heading.
```

Final targeted edit: reverse the accidentally swapped history lines so prior result is first and current result second; preserve all other geometry.

### 4.5 #4 desktop jackpot

```text
Landscape desktop, requested 1504×1046. Show the quiet jackpot state in two connected regions: machine and output on the left, chronological three-line open history plus private letter on the right. The reels contain signature segments “你愿意慢下来陪我的时候” / “会让安心变成很具体的事” / “让我觉得身边有你真好”; the output paper contains the exact composed sentence. History uses the three frozen jackpotSpin=3 fixture sentences in order. The private note reads “你，这些不是碰巧，是我真的一直这样看见你。——我”. Show stage copy “特别同频到了，这些都是真心话。”, structural title “特别同频”, one static embossed star, restrained double-line border, and action “再夸一局”. No popup, celebration particles, prize number or invented section heading.
```

Final targeted edit: remove accidentally generated headings/numbers and place the signature segments inside the three reels while preserving the quiet letterpress composition.

### 4.6 #5 mobile result

```text
Single tall mobile page representing a 390×844 CSS viewport. Show title → guarantee → three side-by-side reels → full result → one history line → handle/button. Put the labels above the reels and put the QA-only maximum-length moment, shine and echo strings inside the three reel windows, with natural wrapping and no horizontal overflow. Print the exact 61-grapheme composed sentence on one full-width paper and repeat it once in the open history strip. Keep the action at least 48 CSS px high and labeled “再拉一句”. Do not use a device shell, floating navigation or hidden future/jackpot text.
```

Final targeted edit: move the maximum-length segment strings from the output area into their actual three reel windows; keep labels outside the reels.

### 4.7 #6 narrow result

```text
Single tall page representing a 320×568 CSS viewport. Preserve the same material system but reflow the three reels vertically in moment → shine → echo order. Use the QA-only maximum-length strings inside the three paper windows. Beside them show the proposed labels “第一段 · 我看见的你”, “第二段 · 发亮的样子”, “第三段 · 留给我的感觉”. Keep title, guarantee, full 61-grapheme output sentence, stage copy “这一句已经印好了。”, one open history copy of the sentence, and the action “再拉一句”. Vertical scrolling is allowed; horizontal overflow, clipped text and compressed tiny type are forbidden.
```

Final targeted edit: preserve the generated narrow composition and insert exactly one compact open cream-paper history strip beneath the stage text and above the primary button; no heading, badge, number, icon or extra control.

### 4.8 #7 tablet result

```text
Single portrait page representing a 768×1024 CSS viewport. Keep three reels side by side. Put labels above and the QA-only maximum-length moment, shine and echo strings inside their matching paper windows. Below, print the exact 61-grapheme sentence on one full-width paper, then stage copy and one open history line, then a coral action at least 48×48 CSS px. Preserve a clear relationship among machine, result and handle with zero horizontal overflow; do not turn history into cards.
```

Final targeted edit: move the maximum-length strings into the three reel windows and leave the three labels above them; preserve all other hierarchy.

### 4.9 #8 narrow preparation failure

```text
Single tall page representing a 320×568 CSS viewport. Show title and finite guarantee, then three vertically stacked blank cream reels in moment → shine → echo order with only non-semantic paper marks, then stage copy “正在把这一轮排好。”, diagnosis “暂时没排好，请重试准备” and the single coral action “重试准备”. Vertical scrolling is allowed; no future sentence, history, private note, error icon, technical code, network hint, help link or second action. No horizontal overflow.
```

## 5. 迭代与舍弃记录

- C1 首稿误在黄铜铭牌生成文字：删除；铭牌必须永久无字。
- C3 首稿把当前句放在既有历史之前：删除；历史按 reducer 时间顺序显示。
- C4 首稿生成额外标题/编号并让三纸卷留空：删除；终稿只保留冻结文字并把 signature 放入纸卷。
- C5/C7 首稿只把列标签放进纸卷、把真正段落放在输出区：删除；终稿把长段落放回真实容器。
- C6 首稿缺少历史纸条：删除；终稿补一条开放式历史而不新增标题。
- 八张候选的可访问性复核发现“独立长摇杆 + 矩形按钮”形成双入口暗示，且白字/珊瑚与白色焦点/浅粉对比不足：全部重做为单一短轴按钮、墨蓝文字和墨蓝焦点；spinning 同时删除未授权进度圆点。
- C8 第一次对比度修订把焦点环误放到整个诊断容器：删除；终稿只让真实重试按钮拥有焦点边界。
- 生成图仍有中文字体转写、标点空隙或近似字形；这些不是新增文案，也不是生产实现输入。生产逐字使用冻结字符串。

## 6. 运行时排除

- 八张 PNG 不复制到 experience 目录；
- 生产不读取、fetch、preload 或使用这些文件作为 CSS background；
- 机身、纸卷、把手、纸纹、星形和黄铜边全部由 HTML/CSS 构造；
- 若未来决定使用任何生成图或其裁切物，必须新建运行时资产审计并更新作品 README、`assets/ATTRIBUTION.md`、格式/尺寸/SHA、用途与降级策略，不能沿用本台账的 docs-only 结论。
