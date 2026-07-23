# “等雪停下”ImageGen 生成台账

## 1. 适用范围

本文件记录 `docs/assets/snow-globe-message/` 中十张最终视觉候选。它们只用于
视觉确认和后续 fidelity 对比，不由生产体验加载。

- 工具：OpenAI 内置 `image_gen`；
- 具体模型/版本：工具结果未暴露，记为“未暴露”，不猜测；
- 生成日期：2026-07-23；
- 第三方图片、截图、照片、字体、Logo、角色或品牌输入：无；
- 引用图片：仅引用本轮先前生成的雪球概念，以保持玻璃、底座和排版一致；
- 后处理：未裁切、重采样、压缩、修图或去背景；从 Codex
  generated-images 目录逐字节复制；
- 运行时状态：全部为 docs-only；
- 淘汰稿：不复制到仓库，不进入接受候选。

无第三方图片输入只描述本轮输入链，不构成唯一性、排他权、不侵权或事实准确
保证。若未来把任何生成图或裁切物放入运行时，必须重新做逐文件资产与降级
审计。

## 2. 最终文件、尺寸、引用链与 SHA-256

| # | 文件 | 原生尺寸 | 引用链 | SHA-256 |
| ---: | --- | ---: | --- | --- |
| G1 | `desktop-gathering-concept.png` | 1503×1046 | 文字首稿 → 删除锁图标、固定 2×2 阅读顺序 | `ba85f36583d1b1cce559abffb4827a804c57e2ff53b27bb4bf71d421557c4ff3` |
| G2 | `desktop-armed-concept.png` | 1586×992 | G1 → armed | `381008f0ac652d853851861363c453abbcff567c9d7de15d4feeabf2c9893a16` |
| G3 | `desktop-settling-concept.png` | 1586×992 | G1 → settling | `86c6b8100881475a935869ce96f08752ea6bf1ab922d883cc6d3d37f436484a8` |
| G4 | `desktop-complete-concept.png` | 1503×1046 | G1 → complete → 尝试约束 9×11/63 点 | `27db3c78fce39edb3241d6a95eff223d02a7a9db090b0a66df0a47f4d4f163a6` |
| G5 | `mobile-gathering-concept.png` | 852×1846 | G1 → 390px gathering | `785043c5e38f06d22a9e2d6f99668244a55c0abbf59d15db60e30adaa6ee6d3e` |
| G6 | `mobile-complete-concept.png` | 852×1846 | G5 → 390px complete → 尝试约束 9×11/63 点 | `9584782a4100e1bf88da9617077fabaaa887f6a9edcb48e31ab8d7e71698b770` |
| G7 | `landscape-complete-concept.png` | 1852×849 | G1 → 844×390 complete → 删除 status 前误生勾选 → 尝试约束 9×11/63 点 | `35ac21865833eebfdf9645ea641a580e18f7d3f39d69a6d44d00db22d719a450` |
| G8 | `narrow-preparation-failure-concept.png` | 941×1671 | G5 → 320px preparation failure | `0e105ccf26c5f711b81ae76d7901ef8b8fee54d724de8888d6a0dc8d0160a981` |
| G9 | `accessibility-comparison-concept.png` | 1586×992 | G4 → 三栏 → 尝试约束 9×11 → 补回四方向组 | `772ca89afb1d5ff1e763aa3a6fd911abddfab558ee20eb7e5a6bedc1cc75a023` |
| G10 | `narrow-no-javascript-concept.png` | 941×1672 | G8 → 320px no JavaScript | `09833be22061d04c4243a4a1e2fb8f7e039ffd6733aac521a9c5539090ce6f51` |

工具不保证请求像素与输出位图一一对应，因此表内只记录真实尺寸。G5–G10
锁定的是逻辑 CSS 视口的重排意图；真实 390×844、320×568、844×390 与
1280×800 仍须在浏览器中用 computed geometry 验收。

**离散精度边界：** prompt 虽要求 G4/G6/G7/G9 使用冻结的 9×11/63 点矩阵，
但原生尺寸目检确认最终位图仍会把点阵风格化。它们只证明心形构图意图，不是
坐标、行列或点数证据。生产必须从 `logic.js` 的只读 target 确定性绘制，并由
哈希/点数测试、CSS grid 审计和浏览器截图证明。复现与处置见
[bug 记录](../../../bugs/2026-07-23-imagegen-discrete-grid-fidelity-gap.md)。

## 3. 完整有效 prompt set

每张最终候选使用“共同指令 + 状态增量”；局部修订只改变列明项目，其余共同
指令继续生效。

### 3.1 共同指令

```text
Create one complete, implementation-ready page concept for a local-first Chinese
couples surprise titled “等雪停下”. The central object is a private bedside glass
snow globe: thick cool-blue glass, neutral cream snow, a low matte dark-berry base,
restrained warm-gold engraved lines, a deep ink-blue winter-night desk and quiet
light. Intimate, calm, ceremonial, sophisticated, 7/10 creativity, low-to-medium
density. Use open editorial typography, not a navigation bar or giant wrapper.

All Chinese copy, status, controls and result text remain code-native in production.
Use one consistent native-looking direction-button family with real borders and
implementable focus/pressed/disabled states. The production page will recreate the
design with HTML/CSS/Canvas and will not load this bitmap.

Do not add navigation, logo, card grid, dashboard, badges, pills, modal, toast,
Christmas tree, gifts, characters, cartoon, branded collectible globe, commercial
greeting-card trade dress, neon, strong glow, bokeh, emoji, fake metrics, timer,
score, probability, shaking-phone prompt, sharing, extra controls, device frame or
unrequested annotation.
```

### 3.2 G1 desktop gathering

```text
1504×1046 desktop. H1 and frozen supporting sentence. Neutral globe, no heart.
2×2 controls in reading order 上, 右, 下, 左; 上 and 左 show “✓ 已收好”.
Status “已收好 2 / 4 阵风；还差：右、下”. No main action and no private result.
Plain privacy sentence only, without lock/security icon.
```

Final correction: remove a generated lock icon and replace cross-shaped control
placement with the exact 2×2 reading order.

### 3.3 G2 desktop armed

```text
1280×800 desktop. Four controls all show “✓ 已收好”. Globe remains neutral.
Status “四阵风都在了。准备好，就让雪落下。” Persistent action “让雪落下”.
No automatic burst, target or private result.
```

### 3.4 G3 desktop settling

```text
1280×800 desktop. Four controls collected. Status “雪正在慢慢找到位置。”
Same persistent action disabled in place as “正在落下…”. Show a crisp mid-transition
from scatter toward the 9×11 target, without private text, spinner, percentage,
countdown, progress bar, motion blur, physics HUD or debug line.
```

### 3.5 G4 desktop complete

```text
1504×1046 desktop. Exact discrete 9×11 heart. Status “雪已经停下，留言在这里。”
Open five-line result flow in exact order, then “再看一次” and plain privacy copy.
The letter must not cover the globe, controls or action.
```

The correction prompt requested exactly 63 active dots using:

```text
.###...###.
#####.#####
###########
###########
.#########.
..#######..
...#####...
....###....
.....#.....
```

The resulting bitmap remains an illustrative heart rather than a countable grid;
the matrix above and production tests, not the PNG, are authoritative.

### 3.6 G5 mobile gathering

```text
390×844 single column. Globe 280–320 CSS px. 2×2 controls in reading order; only
右 is collected. Status “已收好 1 / 4 阵风；还差：上、下、左”. No action or result.
Vertical scroll allowed, zero horizontal overflow.
```

### 3.7 G6 mobile complete

```text
390×844 tall complete flow. Exact heart, four collected controls, exact status,
five result nodes, “再看一次” and plain privacy copy. Natural line wrap and vertical
scroll; signature/action must remain reachable. No overlay or device frame.
```

The final correction again requested the G4 matrix. The bitmap remains suitable
for mobile composition review only, not point-count verification.

### 3.8 G7 landscape complete

```text
844×390 two-column reflow. Globe about 210 CSS px on the left; result and action on
the right. Exact complete copy, four collected controls, no horizontal scroll.
```

Final corrections remove an accidentally generated checkmark before the status,
then request the G4 matrix again. The bitmap remains suitable for landscape
composition review only, not point-count verification.

### 3.9 G8 narrow preparation failure

```text
320×568. Neutral globe, no direction group and no result. Single status
“暂时没准备好，请重新准备。” and persistent action “重新准备”. Calm recoverable
presentation, no alert card, error code, exception, path or technical language.
```

### 3.10 G9 accessibility comparison

```text
1280×800 concept sheet with exactly three external labels: reduced-motion,
forced-colors and 无 Canvas. Each panel preserves complete content, four collected
controls, replay and privacy. Reduced motion is static; forced colors uses real
system-like borders; no Canvas uses a 9×11 CSS grid.
```

Corrections: remove the first numbered grid and extra technical label; request the
same 9×11/63-dot matrix in all panels; restore the accidentally omitted four
collected direction controls in every panel. The resulting three hearts remain
illustrative and are not accepted as grid evidence.

### 3.11 G10 no JavaScript

```text
320×568. Show only H1, frozen supporting sentence, one neutral static globe,
“请开启 JavaScript 后再收集四阵风” and the plain privacy sentence. No directions,
progress, action, heart, result, install advice, refresh advice, download or link.
```

## 4. 淘汰与审阅记录

- G1 v1：隐私说明旁出现锁图标，方向组为十字摆放；淘汰。
- G4 的多轮点阵修订仍不可逐点核对；仅保留最终稿的桌面构图。
- G6 的多轮点阵修订仍不可逐点核对；仅保留最终稿的移动构图。
- G7 v1：主状态前误生一个勾选前缀；淘汰。
- G7 的后续点阵修订仍不可逐点核对；仅保留最终稿的横屏构图。
- G9 v1：无 Canvas 面板把网格画成 11×9，并增加技术说明；淘汰。
- G9 v2：网格修正后误删四方向控件；淘汰。
- G9 最终稿恢复三栏和四方向组，但点阵仍只作降级构图示意。
- 最终候选仍可能有中文字形、标点空隙或位图断行偏差；生产逐字使用规格中的
  frozen strings，不从图片 OCR。

## 5. 运行时排除

- 十张 PNG 不复制到 `experiences/`；
- 生产不读取、fetch、preload 或把它们作为 CSS background；
- 玻璃、底座、按钮、短笺与点阵由 HTML/CSS/Canvas 基本图形重建；
- 若未来需要无字材质，必须单独生成、记录 prompt/尺寸/SHA/用途/降级，并在
  README 与 ATTRIBUTION 重新声明，不能沿用本文件的 docs-only 结论。
