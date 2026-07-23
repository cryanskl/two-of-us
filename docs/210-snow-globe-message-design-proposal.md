# “等雪停下”视觉概念提案

- 日期：2026-07-23
- 状态：**待用户确认，未获准进入生产 UI**
- 对应调研：[181](./181-snow-globe-message-research.md)
- 可执行规格：[182](./182-snow-globe-message-spec.md)
- 实现前脑暴：[199](./199-snow-globe-message-brainstorm.md)
- 视觉简报：[200](./200-snow-globe-message-imagegen-brief.md)
- 实施计划：[209](./209-snow-globe-message-plan.md)
- 生成台账：[GENERATION.md](./assets/snow-globe-message/GENERATION.md)

## 1. 提案结论

建议采用“冬夜床头的一只私人玻璃雪球”：冷蓝厚壁玻璃与奶油雪点是唯一主
形体，低矮深莓底座承担重量，暖金只做刻线和控件边界。页面像一封安静的夜间
短笺，不做圣诞商品、商业贺卡、儿童卡通或粒子技术演示。

这套方向同时覆盖 gathering、armed、settling、complete、准备失败、移动端、
横屏、reduced-motion、forced-colors、无 Canvas 和无 JavaScript。十张 PNG
只作为构图与材料证据，生产必须用 code-native HTML/CSS/Canvas 重建。

## 2. 十态候选

| 状态 | 文件 | 原生尺寸 | 主要验收角色 |
| --- | --- | ---: | --- |
| G1 desktop gathering | [desktop-gathering](./assets/snow-globe-message/desktop-gathering-concept.png) | 1503×1046 | 公开首屏、两阵风、无结果 |
| G2 desktop armed | [desktop-armed](./assets/snow-globe-message/desktop-armed-concept.png) | 1586×992 | 四风齐、主动落雪 Gate |
| G3 desktop settling | [desktop-settling](./assets/snow-globe-message/desktop-settling-concept.png) | 1586×992 | token 期间、disabled 原位 |
| G4 desktop complete | [desktop-complete](./assets/snow-globe-message/desktop-complete-concept.png) | 1503×1046 | 心形构图、五节点短笺 |
| G5 390 gathering | [mobile-gathering](./assets/snow-globe-message/mobile-gathering-concept.png) | 852×1846 | 单列、2×2 控件、纵滚 |
| G6 390 complete | [mobile-complete](./assets/snow-globe-message/mobile-complete-concept.png) | 852×1846 | 完整结果流与重播 |
| G7 844×390 complete | [landscape-complete](./assets/snow-globe-message/landscape-complete-concept.png) | 1852×849 | 横屏双栏、结果可达 |
| G8 320 failure | [narrow-failure](./assets/snow-globe-message/narrow-preparation-failure-concept.png) | 941×1671 | 克制失败与唯一重试 |
| G9 accessibility | [accessibility comparison](./assets/snow-globe-message/accessibility-comparison-concept.png) | 1586×992 | reduced/forced/无 Canvas |
| G10 320 no JS | [narrow no-JS](./assets/snow-globe-message/narrow-no-javascript-concept.png) | 941×1672 | 五项安全静态内容 |

最终候选均按原生尺寸审阅。位图尺寸不等于 CSS viewport；响应式结果只能由
浏览器实测证明。

G4/G6/G7/G9 中的心形只接受为构图意图，不接受为 9×11/63 的坐标证据。
ImageGen 多轮修订仍会风格化离散点阵；生产必须读取冻结 target 确定性绘制，
并由测试与浏览器截图证明。详见
[bug 记录](../bugs/2026-07-23-imagegen-discrete-grid-fidelity-gap.md)。

## 3. 视觉与文案边界

- 固定公开标题始终是“等雪停下”，默认 `finalTitle` 只在 complete 出现；
- gathering/armed 只有中性 72 雪点，不得提前出现心形或私信；
- settling 可显示点向 target 归位，但不显示 patternLabel 或五个私密字段；
- complete 才创建图案说明、称呼、标题、私信、署名；
- 图片中的字形/空格/断行不是生产文字来源，生产只使用 182 的 frozen strings；
- 隐私说明保持纯文本，不加锁、盾牌、认证章或“已加密”等过度承诺；
- 方向组始终按上、右、下、左的 DOM 顺序，视觉在窄屏为 2×2。

## 4. 待接受的设计令牌

```css
:root {
  --night-950: #07111f;
  --night-875: #0c1a2c;
  --glass-300: #8fb7d8;
  --glass-line: #b9d5eb;
  --snow-50: #fff7e8;
  --snow-150: #eadfce;
  --berry-950: #2a1019;
  --berry-800: #4a1a2a;
  --gold-350: #e7c487;
  --gold-550: #b98a43;
  --paper-50: #fff5df;
  --ink-light: #f5ead7;
  --focus: #fff1c5;
  --border-control: #d9b879;
  --shadow-globe: 0 28px 72px rgb(0 0 0 / 42%);
  --radius-control: 12px;
  --content-max: 1504px;
}
```

- 题名/结果标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文/控件：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 不加载远程字体；
- 正文不小于 16px，辅助文字不小于 13px；
- 控件真实命中区 ≥48px，焦点使用至少 3px outline；
- glass highlight、桌面光域与纸面纹理优先用 CSS，不为“使用生成图”增加依赖。

## 5. 页面骨架

```text
main.snow-globe-message
├── header.page-heading > h1
├── p.instructions
├── section.globe-stage
│   ├── canvas[aria-hidden]
│   └── div.css-grid-fallback[aria-hidden]
├── fieldset.direction-controls
│   └── button × 4
├── p.progress-status
├── section#final-message.result-letter（complete 才创建）
│   ├── p#pattern-label
│   ├── p.recipient-line
│   ├── h2#final-title
│   ├── p.final-note
│   └── p.signature
├── button.primary-action
├── p.privacy-note
└── p.live-region[role=status]
```

CSS 可在桌面把雪球与控制并排、横屏把结果放到右栏，但不得改变 DOM 阅读顺序。
结果不是 overlay、modal 或五张卡，准备失败也不创建警报卡。

## 6. 状态实现提案

### gathering / armed

- 固定 72 枚中性表现雪点，与 active target 数无关；
- 按钮用真实 `aria-pressed`、边框和“✓ 已收好”冗余表达；
- armed 仍不画 target，必须由“让雪落下”主动进入 settling。

### settling

- 900ms 内从中性散点向 frozen targets 插值；
- 同一主按钮原位显示“正在落下…”，不增加 spinner/progress；
- reduced-motion、Canvas error、hidden/blur/timeout 只改变完成来源，不改变结果。

### complete

- Canvas/CSS grid 使用生产 `visibleTargets`，不从概念图描点；
- 五节点短笺保持开放排版，标题是唯一程序化焦点；
- “再看一次”位于短笺之后，下一次 Tab 可自然到达。

### preparation failure / no JavaScript

- failure 只保留固定公开内容、重试提示与唯一按钮；
- no-JS 只保留规格冻结的五项静态内容，不伪造方向、进度、心形或结果。

## 7. 响应式 Gate

| 逻辑视口 | 设计要求 |
| --- | --- |
| 1504×1046 | 开放页头、雪球、方向组和主动作同屏；无横纵滚 |
| 1280×800 | 雪球与控制并排，关键动作同屏，零横溢 |
| 768×1024 | 雪球居中，2×2 方向组，结果自然下接 |
| 390×844 | 雪球 280–320px，2×2 控件 ≥48px，允许纵滚 |
| 320×568 | 雪球 240–264px，内容约 288–304px，零横溢 |
| 844×390 | 雪球约 210px，结果/动作在右栏可达 |

还必须实测 200% 文本、约 320 CSS px 的 400% zoom、safe-area、最大合法
文案、16/72 active、图片/Canvas 阻断、reduced-motion 与 forced-colors。

## 8. 动效、降级与资产决定

- 只允许一次 settling 位移和很轻的玻璃反光变化，无循环雪暴或常驻 RAF；
- reduced-motion 直接静态落定，规则 token 不变；
- forced-colors 隐藏材质，保留系统色、真实边框、方向字、勾选与结果文字；
- Canvas null/throw 使用同一 9×11 CSS grid；
- 当前建议零生产位图：十张概念 PNG 全部 docs-only；
- 若实现后确需材质，只能另开无字资产 Gate，并记录 prompt、尺寸、SHA、用途与
  失败降级。

## 9. 借鉴与来源声明

- 视觉生成未输入第三方图片、开源截图、商业素材、照片、字体、Logo 或品牌；
- 未复制调研项目的源码、API、参数、预设、物理、素材、trade dress 或测试；
- 本作生产规则、9×11 pattern、中文文案、UI 与基本图形独立实现；
- tsParticles、canvas-text-particle、canvas-confetti 和 W3C 文档的固定
  commit/许可证/仅借鉴范围，以及 shake.js 排除项，仍以 182/209 为冻结合同；
- 作品 README 与 ATTRIBUTION 必须各自完整复述，不能只链接本提案；
- ImageGen 文件的尺寸、SHA、引用链和 docs-only 状态见 GENERATION。

## 10. Fidelity ledger

| 概念锚点 | 生产要求 | 后续证据 |
| --- | --- | --- |
| 一个雪球是唯一主形体 | 无 dashboard/card 外壳 | desktop/mobile 截图 |
| 厚壁冷蓝玻璃 + 深莓底座 | CSS 基本几何可降级 | 截图、图片阻断 |
| 方向组同一组件族 | 上右下左稳定、pressed/disabled 冗余 | DOM、键盘、computed rect |
| 中性 72 雪点 | active 数不泄漏 | Canvas fixture、阶段扫描 |
| 9×11/63 点心形 | 只读生产 target，不描图 | hash 测试、complete 截图 |
| 结果是开放短笺 | 精确五节点，不用 cards/modal | DOM 审计、a11y snapshot |
| 主按钮持续复用 | armed/settling/complete/failure 同节点 | 节点身份、焦点测试 |
| 320px 可纵滚 | 零横溢、签名/按钮可达 | 320 截图、scrollWidth |
| forced-colors 完整 | 真实 border/outline 与文字 | media emulation 截图 |
| 无 Canvas 同结果 | CSS grid + 可见 patternLabel | error fixture、截图 |
| no-JS 不伪造解锁 | 只出现五项公开静态内容 | 禁用 JS 截图 |
| 位图不进入运行时 | 零概念 PNG 请求 | network/resource audit |

## 11. 用户确认 Gate

生产 UI 开始前，需要明确确认：

1. 是否接受“冬夜床头的私人玻璃雪球”作为整体视觉方向；
2. 是否接受深墨蓝 / 深莓 / 奶油雪 / 少量暖金的材料系统；
3. 是否接受 complete 的开放短笺、而不是弹窗或翻卡。

确认后才把本文件状态改为“已接受/已冻结”，再实现
`index.html/app.js/styles.css`。未回复或只讨论细节不视为默认接受。
