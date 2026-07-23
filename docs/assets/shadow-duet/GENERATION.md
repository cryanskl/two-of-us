# “把影子，跳成我们”ImageGen 生成台账

## 1. 适用范围

本文件记录 `docs/assets/shadow-duet/` 中 16 张最终视觉候选。它们只用于用户确认、
生产设计提取和后续 fidelity 对比，不由 `experiences/co-op/shadow-duet/` 加载。

- 工具：OpenAI 内置 `image_gen`；
- 具体模型/版本：工具结果未暴露，记为“未暴露”，不猜测；
- 生成日期：2026-07-24；
- 第三方图片、截图、照片、字体、Logo、角色或品牌输入：无；
- 引用图片：S2–S16 只引用本轮先前生成的 S1 或其状态变体，以保持纸幕、幕边、
  字体性格和按钮材质一致；
- 后处理：没有裁切、重采样、压缩、修图或去背景；从 Codex
  generated-images 目录逐字节复制；
- 运行时状态：全部为 docs-only；
- 淘汰稿：不复制到仓库，不进入接受候选。

“无第三方图片输入”只描述本轮输入链，不构成唯一性、排他权、不侵权或事实准确
保证。生成图中的中文字形、标点间距和布局顺序也不是生产真值。

## 2. 最终文件、尺寸、字节与 SHA-256

| ID | 文件 | 原生尺寸 | 字节 | 输入引用 | SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| S1 | `s01-desktop-intro.png` | 1504×1046 | 2,469,323 | 无 | `67e07971c73c26116f13f14d94b9f81b0e0eb248afb81778fd01ff84174dc3fd` |
| S2 | `s02-desktop-scene-intro.png` | 1504×1046 | 2,325,224 | S1 | `b4a01086f9444cfc7505a137cca527dfa7be69fca461125861879c8ab22cb672` |
| S3 | `s03-desktop-dancing-ready.png` | 1586×992 | 2,347,546 | S1/S2 | `0ff4e2596f06ee27931a3ee1ef02500f143443e5b8931b0bf7eb67db83491d71` |
| S4 | `s04-desktop-dancing-window.png` | 1586×992 | 2,360,372 | S3 | `8e79971cd9af91310d561bd910b161494a21d083c2b4bffe1a556be5da56ff93` |
| S5 | `s05-desktop-pose-result.png` | 1586×992 | 2,470,765 | S4 | `9e885f13700693f5f3bac4a1c82a294677803819e280380d94d53f081872f829` |
| S6 | `s06-desktop-missed.png` | 1586×992 | 2,265,956 | S4 | `464a1c38fef80d346bfdf7f57610cf0f4fca94b382e84f6b1145c8bb12e61c73` |
| S7 | `s07-desktop-act-result.png` | 1503×1046 | 2,416,421 | S5 | `a72e76847605da4cfc2411ea65ce69ebf280bc1803afa7c166dc9d784cc0a9d2` |
| S8 | `s08-desktop-complete.png` | 1503×1046 | 2,395,379 | S7 | `a9c32b35a3adfb77f7419d95bd1dd5390067ab7c300a5b47480b84f365b800f9` |
| S9 | `s09-mobile-dancing-window.png` | 852×1846 | 2,339,156 | S4 | `b23156427245471c772c94e700c4707bd76f6b02ca76616c2c6c5950ad0e3c70` |
| S10 | `s10-mobile-complete.png` | 852×1846 | 2,336,006 | S8 | `cf1faffc0a4afd2214f601eab4a84933b42960409815a4aa9a7ad604fee18220` |
| S11 | `s11-narrow-missed.png` | 941×1672 | 2,451,287 | S6/S9 | `51a94792e44686ad55b2319df6add545731b7f3b1c1bf9f63a3cd3ef53390feb` |
| S12 | `s12-narrow-no-js.png` | 941×1672 | 2,383,056 | S1/S11 | `eab8f39cce716badbcfb7c77f99d61c775d0ba8eac803ad33005e13b4fe5bc6f` |
| S13 | `s13-landscape-dancing-window.png` | 1844×853 | 2,367,067 | S4 | `b06116242d57e25858da9aa3b61700a003b4f20e46d47df516a939e5d7e55495` |
| S14 | `s14-reduced-motion-dancing-window.png` | 1586×992 | 2,608,629 | S4 | `2420b77fdd504e92c0ca8d74924ee1b3d5ef5ba8b0fc2137db504cc3b2023543` |
| S15 | `s15-forced-colors-dancing-window.png` | 1586×992 | 837,011 | S4 | `c46e52160239c38796f3b623553a2e7d5acf9157f9012d47b3beef7648102028` |
| S16 | `s16-image-blocked-dancing-window.png` | 1586×992 | 1,911,142 | S4 | `49d2ed7f6622b4f6d4b1af04e3bc4c1d16911e4f5b426283cca2208ef55a7623` |

工具不保证请求像素与输出位图一一对应，因此表内记录真实输出尺寸。390×844、
320×568、844×390 和 1280×800 是生产 CSS 视口目标，仍须由浏览器 computed
geometry 验收。

## 3. 完整有效 prompt set

每张最终候选使用“共同指令 + 对应状态增量”。后续图可以引用 S1 的视觉语言，
但不能从引用图推断 phase、文案、控件数量或记录顺序。

### 3.1 共同指令

```text
Create one complete, implementation-ready page concept for a local-first Chinese
same-device couples co-op titled “把影子，跳成我们”. Visual direction: a midnight
backlit paper-screen theatre, near-black indigo room and heavy curtains, warm amber
fibrous paper, two abstract ink-black silhouettes in strict left/right zones, dark
wood and restrained aged brass. Intimate, playful rehearsal ritual, 7/10 creative,
low-to-medium density. The paper stage is the only dominant shape.

All Chinese copy, phase text, targets, current poses, stable count, records, native
buttons and focus/pressed/disabled states remain code-native in production. Left
seat has exactly W/A/S/D mapped to 举高/展开/低身/向内; right seat has exactly
↑/→/↓/← with the same pose order. Use a static six-stop horizontal beat rail, never
a falling-note lane, score or timer. The production page will recreate the accepted
direction with HTML/CSS and separate audited assets; it will not load this bitmap.

Do not add navigation, logo, hero badge, pill, dashboard, HUD, card grid, modal,
toast, camera, real person, face, fitness UI, music/BPM, notes, score, combo,
perfect, accuracy, winner, trophy, confetti, emoji, sharing, save/download,
extra controls, flashing, shake, branded game trade dress or unrequested copy.
```

### 3.2 S1 desktop intro

```text
1504×1046 desktop intro. Show H1, fixed explanation, neutral standing silhouettes,
two disabled four-button seat groups and the only action “拉开幕布”. No first-scene
target, attempt, stable count, records or completion note.
```

### 3.3 S2 desktop scene-intro

```text
1504×1046 desktop scene-intro. Publicly show scene 1 “开幕·展翼”, target left 展开 /
right 展开, 已定格 0 / 6, 第 1 次尝试 and current poses 还没有姿势. All eight buttons
disabled. Only action “开始这一幕”. Do not start a timer or hide the answer.
```

### 3.4 S3 desktop dancing ready

```text
1280×800 desktop dancing preparation. Exact state copy “先试动作。拍灯亮起时，把正确
姿势留住六小拍。” Target remains public. Current left 展开, right 向内; press A and
← only. Stable 0 / 6. No primary action or future record.
```

### 3.5 S4 desktop dancing window

```text
1280×800 desktop dancing freeze window. Exact state copy “定格窗亮了——一起把姿势
留住。” Both current poses 展开; press A and →. Static lit beat rail, 稳定 3 / 6,
已定格 0 / 6, 第 1 次尝试. No score, countdown, personal judgment or action.
```

### 3.6 S5 desktop pose-result

```text
1280×800 desktop pose-result. “这一幕接住了。” Add exactly one record:
第 1 幕 · 开幕·展翼 · 共同完成 · 第 1 次尝试. Both silhouettes remain independently
wide/展开 as a static contact impression; all eight buttons disabled and unpressed,
current poses reset. Only action “下一幕”. Never reveal scene 2.
```

### 3.7 S6 desktop missed

```text
1280×800 desktop missed. “影子还没在同一拍站稳，再排这一幕。” Window ended with
left 展开, right 向内; target remains both 展开. Neutral tone, no blame or personal
error count. All buttons disabled/unpressed. Only action “再排这一幕”.
```

### 3.8 S7 desktop act-result

```text
1504×1046 desktop act-result. “六道影子，刚好跳成一支舞。” Show exactly six ordered
records: scenes 1,3,4,5,6 are first attempt; scene 2 屋檐·相接 is second attempt.
Every row contains scene title, 共同完成 and attempt. Summary: 六幕共同完成 /
一共尝试 7 次 / 重排 1 次. Only action “让幕布落下”. No private note.
```

### 3.9 S8 desktop complete

```text
1504×1046 desktop complete. “幕布落下，合照留在这里。” Preserve the exact six
records and shared summary, then show “你和TA，六次定格以后，影子也记住了我们。”
Only action “再跳一次”. No sharing, download, camera or ranking.
```

### 3.10 S9 mobile dancing window

```text
390×844 mobile flow of S4. Full uncropped stage, target and 稳定 3 / 6, then exactly
four left buttons and four right buttons, each with pose name and key. A and → are
pressed. At least 44 CSS px intent, vertical scroll allowed, no fixed bar or
horizontal overflow.
```

### 3.11 S10 mobile complete

```text
390×844 mobile flow of S8. Full stage, exactly six ordered single-column records,
each with title / 共同完成 / attempt; shared summary 7 attempts and 1 retry; default
note; one “再跳一次” action. Records, summary and note all precede the action.
Natural vertical scroll, no overlay, invented heading or personal statistic.
```

生成图把共同摘要放在六条记录之前。该顺序不采纳；生产必须执行 172/204 的
`phase → stage → records → summary → note → action` DOM 顺序。

### 3.12 S11 narrow missed

```text
320×568 narrow S6. Full stage, neutral mismatch explanation, exactly one left
four-button group and one right four-button group, then “再排这一幕”. Buttons keep
Chinese pose labels and 44 CSS px intent; action 48 CSS px; scroll allowed and no
horizontal overflow.
```

### 3.13 S12 narrow no JavaScript

```text
320×568 no-JavaScript. Only H1, fixed explanation, neutral non-target silhouettes,
“请开启 JavaScript 后再一起排这支影子舞” and the local privacy sentence. No phase,
target, count, controls, records, note or action.
```

### 3.14 S13 landscape dancing window

```text
844×390 landscape S4. Stage about 360–420 CSS px on the left; public target/status
and two exact four-button groups on the right. A and → pressed, 稳定 3 / 6. Keep
44 CSS px touch intent, allow necessary vertical scroll, never horizontal scroll.
```

### 3.15 S14 reduced-motion dancing window

```text
1280×800 reduced-motion S4 as a standalone production state, not a comparison
panel. Express stage, static lit rail, pressed buttons and 稳定 3 / 6 with text and
real borders. No drift, sweep, fade, scale, flashing, mode switch or technical label.
```

### 3.16 S15 forced-colors dancing window

```text
1280×800 forced-colors S4 as a standalone state. System-like black/white canvas,
real borders/outlines, Highlight focus/pressed indicator, solid/dashed structural
differences. Preserve target, current poses, 稳定 3 / 6 and all eight buttons.
No mode switch, texture, shadow or forced color preservation.
```

### 3.17 S16 image-blocked dancing window

```text
1280×800 image-blocked S4. Assume background and pose atlas failed. Use original
CSS outline silhouettes, left/right labels, pose text and real pressed buttons to
preserve complete play. No broken-image icon, alt leak, error card, download advice
or technical label.
```

## 4. 淘汰与偏差记录

| 状态 | 淘汰/限制 | 处置 |
| --- | --- | --- |
| S5 首稿 | 把“左右均展开”画成触手/弓步 | 淘汰；重申两人独立 wide/展开 |
| S10 首稿 | 发明标题，逐条遗漏“共同完成” | 淘汰；逐字段重申六条记录 |
| S10 第二稿 | 仍遗漏逐条“共同完成”并重组结构 | 淘汰；再次按每条三字段约束 |
| S10 最终 | 字段正确，但摘要视觉顺序早于 records | 图仅保留移动层级参考；生产严格使用规格 DOM 顺序 |
| S11 首稿 | 每席复制两套键位，共八键/席 | 淘汰；改成每席恰好四键 |
| 全部 | 可能有中文近似字形、标点间距与请求尺寸偏差 | 不 OCR；生产逐字使用冻结文案和真实 CSS 视口 |

## 5. 来源与借鉴声明

- 本轮只输入原创文字 brief 和本轮先前生成的概念，没有输入第三方图片；
- Bemuse、osu!、PixiJS、MediaPipe 仅是 171/172 调研中的时间线、职责分层和依赖
  排除参考，不是图像输入或运行依赖；
- 没有复制上述项目的代码、截图、角色、谱面、图标、字体、品牌或 trade dress；
- 概念称为“本轮生成候选”，不声称排他原创或保证不与其他输出相似；
- 若将来生成 `paper-stage-bg.webp` 或 `shadow-duet-poses.png`，必须建立新的生产
  资产台账、许可/来源声明、哈希、格式和失败降级，不能沿用本 docs-only 结论。

## 6. 运行时排除

- 16 张 PNG 不复制到 experience 目录；
- 生产不读取、fetch、preload、link 或用它们作 CSS background；
- H1、目标、姿势、稳定数、按钮、记录、summary、结语和主动作全部是 HTML；
- 生产资产若获准生成，必须从空白资产 prompt 独立生成，不能从完整截图裁切；
- 图片全部失败时，CSS 轮廓和文字仍能完成当前幕。
