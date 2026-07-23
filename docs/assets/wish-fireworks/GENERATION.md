# “把愿望，放到夜空里”ImageGen 生成台账

## 1. 适用范围

本文件记录 `docs/assets/wish-fireworks/` 中 15 张最终视觉候选。它们只用于用户
确认、生产设计提取和后续 fidelity 对比，不由
`experiences/surprises/wish-fireworks/` 加载。

- 工具：OpenAI 内置 `image_gen`；
- 具体模型/版本：工具结果未暴露，记为“未暴露”，不猜测；
- 生成日期：2026-07-24；
- 第三方图片、截图、照片、字体、Logo、角色或品牌输入：无；
- 引用图片：后续状态只引用本轮先前生成的视觉候选，以保持夜空、屋顶、发射台
  和短笺材质一致；
- 后处理：没有裁切、重采样、压缩、修图或去背景；从 Codex
  generated-images 目录逐字节复制；
- 运行时状态：全部为 docs-only；
- 淘汰稿：不复制到仓库，不进入接受候选。

“无第三方图片输入”只描述本轮输入链，不构成唯一性、排他权、不侵权或事实准确
保证。生成图中的中文字形、点阵位置、标点间距和布局顺序也不是生产真值。

## 2. 最终文件、尺寸、字节与 SHA-256

| ID | 文件 | 原生尺寸 | 字节 | 输入引用 | SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| W1 | `w01-desktop-intro.png` | 1503×1046 | 1,785,805 | 无 | `a877e0e15ad0b11f0edb6b4c99621225fa1fe13af91e1c4ebe8f81f55bd09aee` |
| W2 | `w02-desktop-ready0.png` | 1586×992 | 1,835,202 | 同批视觉锚点 | `d9f882608254959cd021c2f2944338c5f4de4dccc2bb9a8aa9a2bcd287d33871` |
| W3 | `w03-desktop-holding.png` | 1586×992 | 1,779,832 | 同批视觉锚点 | `18cd35efa8a1bc7abdfdb1ac55d3422579b297e1d8212c516a1e802092864853` |
| W4 | `w04-desktop-bursting1.png` | 1586×992 | 1,886,127 | 同批视觉锚点 | `e0ee9f96b9b224370f8e51f55d194ce3b9e94c629100b3207d04b9161f614b54` |
| W5 | `w05-desktop-ready2.png` | 1503×1046 | 1,878,135 | 同批视觉锚点 | `f3dc75b9ec58c3cb1062432490ba631ba1b8f9aa22fc93dd910f776dcfda611d` |
| W6 | `w06-desktop-complete.png` | 1504×1046 | 1,975,633 | 同批视觉锚点 | `1fae20e15665f22df4acf2a8ec045313de5ed01b943f53c650bb52e38ce51423` |
| W7 | `w07-mobile-ready1.png` | 853×1844 | 1,760,260 | 同批视觉锚点 | `ab70d9e609b63a287c281aaa83995a09f1fe69d8f2bbbbaa46f6a43d2212805e` |
| W8 | `w08-mobile-complete.png` | 853×1844 | 2,177,984 | 同批视觉锚点 | `49bcd3d05bcce45ec8d5b74b81da4c58e52536ee87ac9a4ecd2a303ac268e69b` |
| W9 | `w09-landscape-complete.png` | 1844×853 | 1,853,737 | 同批视觉锚点 | `e91dca0d8ec58177894c99c1e949f26fbaa1bd385cf299ab32fb65315f64ffee` |
| W10 | `w10-landscape-ready2.png` | 1844×853 | 1,701,204 | 同批视觉锚点 | `0d34392354b8003e4425688bea5efab56ead45aae0abb66dd292ecd054be0554` |
| W11 | `w11-narrow-failure.png` | 941×1672 | 1,763,327 | 同批视觉锚点 | `baba075547b3f20eaa764b3e564b1a5713c0c91196f3934c8ac731b66bad1cf4` |
| W12 | `w12-narrow-no-js.png` | 941×1672 | 1,776,231 | 同批视觉锚点 | `1fba0a767004da2326764c8b33c3e10fc65b1dbad47669897881c0ff23098093` |
| W13 | `w13-reduced-motion-ready1.png` | 1586×992 | 1,824,212 | 同批视觉锚点 | `c2e0b12bfd91abc9ea42f651c5b4d0aedc63fd94d89beda893a3e5ea4e12a850` |
| W14 | `w14-forced-colors-complete.png` | 1586×992 | 891,644 | 同批视觉锚点 | `2a1913cd976320be475658d9a80bebd2ff12145c21a4862f49a41489692891af` |
| W15 | `w15-no-canvas-complete.png` | 1586×992 | 2,007,308 | 同批视觉锚点 | `f4c493e4cf8543a6215374cc5262859bc4e75a207de35d8c0bedb992209315a7` |

工具不保证请求像素与输出位图一一对应，因此表内记录真实输出尺寸。390×844、
320×568、844×390、1280×800 和 1504×1046 是生产 CSS 视口目标，仍须由
浏览器 computed geometry 验收。

## 3. 完整有效 prompt set

每张最终候选使用“共同指令 + 对应状态增量”。视觉引用只提供材质连续性，不能
从引用图推断 phase、文案、控件基数、点阵或阶段隐私。

### 3.1 共同指令

```text
Create one complete implementation-ready page concept for a local-first Chinese
couples surprise titled “今晚，点三束光”. Visual direction: a quiet midnight
rooftop letter written into the sky; near-black indigo, restrained rooftop edge,
warm ivory and soft-gold firework dots, deep plum and oxidized copper controls,
and an open warm-paper letter only after completion. Intimate, restrained and
anticipatory, 7/10 creative, low-to-medium density. The night sky is the only
dominant stage.

Production will keep all copy, status, native select, buttons, focus, revealed
glyph labels and result as code-native HTML. Canvas or CSS grid only renders
decorative dots. Reveal exactly the completed prefix of 我 / 爱 / 你; future
glyphs, labels, placeholders and private result must be absent. Keep one native
five-option select and both “按住蓄光” and “直接点燃” controls whenever the
state allows launching.

Do not add navigation, logo, eyebrow, badge, pill, card grid, dashboard, HUD,
carousel, pagination dots, timer, score, probability, perfect zone, target sight,
casino or wedding styling, people, emoji, branded fireworks, automatic loops,
full-screen flash, shake, confetti, share, save, download or unrequested copy.
The production page will recreate the accepted direction with HTML/CSS; it will
not load this bitmap.
```

### 3.2 W1–W6 desktop

```text
W1 / intro / 1504×1046: H1, fixed explanation, neutral empty sky, status
“还没点亮第一束。”, only “开始点光”, privacy sentence. No glyphs, slots,
launch controls or result.

W2 / ready0 / 1280×800: status “准备点燃第 1 / 3 束。”, empty revealed rail,
native select selected 中, both launch buttons, guarantee and privacy. No glyph,
target, placeholder or result.

W3 / holding / 1280×800: same public state as W2; pressed “按住蓄光” with one
non-flashing fill, “直接点燃” still present, a low warm charge only. No glyph
target, percentage, timer or success zone.

W4 / bursting1 / 1280×800: revealed rail contains only 我. Status
“第 2 / 3 束正在升空。”. The second burst may visibly use this exact 9×9 dot
pattern, but do not label it 爱 and do not add it to the rail:
..#####..
...#.#...
.#######.
.#.....#.
..#####..
....#....
...###...
..#...#..
.#.....#.
Keep the select and both launch buttons visible but unavailable with real text
and borders. No third slot, future glyph or private result.

W5 / ready2 / 1504×1046: revealed rail contains only 我 and 爱. Status
“前两束已经留下；准备第 3 / 3 束。”. Native select selected 较高, both launch
buttons and guarantee. No third placeholder, 你 outline or private result.

W6 / complete / 1504×1046: three discrete dot glyphs and revealed labels 我 / 爱 /
你; status “三束光都留在夜空里。”. Hide all launch controls. Open result with
exactly five nodes: “烟火写出的三个字”; “给 你”; “这三束光，都想送给你”;
“愿望写完了，但我还想和你一起看很多很多次夜空。”; “——我”. Focus the result
title and show only “再看一次” plus privacy. No extra plant, control, pagination,
share or celebration.
```

### 3.3 W7–W10 responsive

```text
W7 / 390×844 ready1: single-column flow, only revealed 我, exact ready1 status,
native select and both launch buttons at least 56 CSS px intent, guarantee and
privacy reachable by normal scroll. No sticky bar or future content.

W8 / 390×844 complete: single-column complete flow with all three glyphs, status,
the exact five-node result, replay and privacy. No overlay, drawer or horizontal
overflow.

W9 / 844×390 complete: stage and three glyphs left, result and replay right;
preserve semantic sequence, all five result nodes and privacy; allow vertical
scroll, no pagination dots or horizontal scroll.

W10 / 844×390 ready2: night stage left, controls right, only 我 and 爱; exact
ready2 status, native select selected 较高, both large launch buttons, guarantee
and privacy. No 你 or result.
```

### 3.4 W11–W15 degradation

```text
W11 / 320×568 preparation failure: H1, full fixed explanation, neutral sky,
“暂时没准备好，请重新准备。”, only “重新准备” and privacy. No glyphs, controls,
error details, toast or alert card.

W12 / 320×568 no JavaScript: only H1, fixed explanation, neutral static sky,
“请开启 JavaScript 后再点燃三束光” and privacy. No status count, glyph, control,
action or result.

W13 / 1280×800 reduced-motion ready1: stable post-first-burst ready1, only 我,
full controls, no holding fill, trajectory, fade, drift, scale, flashing or mode
label.

W14 / 1280×800 forced-colors complete: system-like background/text/button colors,
real borders/outlines, visible focus, CSS dot grid, full three labels and exact
five-node result. No gradients, texture, glow, mode switch or technical label.

W15 / 1280×800 no-Canvas complete: normal visual system, CSS 9×9 dot grids,
full three labels, status, exact five-node result, replay and privacy. No broken
canvas, technical message or mode switch.
```

## 4. 淘汰与偏差记录

| 状态 | 淘汰原因 | 处置 |
| --- | --- | --- |
| W4 首稿 `call_AfL4Ip6Kkc2nIpH3jf3oAX6s.png` | 把“我”放进卡槽，并把当前成字画成统一满方格；违背开放前缀和离散点阵 | 淘汰；重申仅公开 `我`、禁用槽位，并提供 9×9 行 |
| W6 首稿 `call_VvmLmF3AQyDSFrQlXjsn40fK.png` | 焦点落在图案说明而非 `finalTitle`，完成态泄漏发射保证，另加植物枝条 | 淘汰；锁定五节点、唯一焦点和 complete 控件集合 |
| W9 首稿 `call_0hhODZeEpV6IscNNC26TpFfb.png` | 添加三个轮播/分页点 | 淘汰；定向删除分页语汇并重申开放阅读流 |
| W11 首稿 `call_3a8A4QgYpxC0iKoCdoffLNEs.png` | 固定说明遗漏“按住蓄光，” | 淘汰；按冻结字符串补全 |
| 全部 | 可能有中文近似字形、点阵偏差、标点间距和请求尺寸偏差 | 不 OCR、不取像素作规则；生产逐字使用规格和离散矩阵 |

4 张淘汰稿均留在工具生成目录，不复制到仓库。最终 15 张均已用
`view_image(detail="original")` 逐张核验。

## 5. 来源与借鉴声明

- 本轮只输入原创文字 brief 和本轮先前生成的候选，没有输入第三方图片；
- [Fireworks.js](https://github.com/crashmax-dev/fireworks-js) 的 MIT 实现只提供
  粒子生命周期与有限动画的抽象参考；
- [canvas-text-particle](https://github.com/tangren1998/canvas-text-particle) 与
  [canvas-confetti](https://github.com/catdad/canvas-confetti) 的 ISC 实现只提供
  点阵表现和 reduced-motion 边界参考；
- W3C Pointer Events 与 WCAG 资料只提供输入取消、目标尺寸、闪光和系统偏好
  边界；
- 固定 commit、许可证哈希、版权主体、实际借鉴和未复制范围见
  [183](../../183-wish-fireworks-research.md)、
  [184](../../184-wish-fireworks-spec.md) 与
  [227](../../227-wish-fireworks-source-refresh.md)；
- 没有复制这些项目的代码、截图、品牌、Logo、字体、图标、角色或 trade dress；
- 上述项目都不是本轮图片输入，也不是当前运行依赖；
- 概念称为“本轮生成候选”，不声称排他原创或保证不与其他输出相似。

## 6. 运行时排除

- 15 张 PNG 不复制到 experience 目录；
- 生产不读取、fetch、preload、link 或用它们作 CSS background；
- H1、状态、select、按钮、revealed rail、结果与隐私说明全部是 HTML；
- Canvas 只画装饰点与轨迹；无 Canvas 时由 CSS 9×9 grid 提供正式降级；
- 生产资产如获准生成，必须建立新的 prompt、来源、哈希和失败降级台账；
- 图片全部失败时，文字、CSS 夜空和点阵仍须完成当前阶段。
