# 借鉴与素材声明

调研快照日期：2026-07-18。

“星码解锁”为本仓库原创实现。体验未复制第三方代码、关卡、答案、星表、星座线、图形、图片、音频、字体或其他素材，也未引入第三方运行时依赖。

## 机制调研

| 项目 | 固定版本与许可证 | 核验范围 | 本作处理 |
| --- | --- | --- | --- |
| [`tympanix/pattern-lock-js`](https://github.com/tympanix/pattern-lock-js/tree/95d40ac58f56beb11b96d403c10c9349d8372c4d) | `95d40ac58f56beb11b96d403c10c9349d8372c4d`，MIT | README、仓库结构与 LICENSE | 只用于评估 SVG 拖动图案锁；本作最终不采用该机制，不复制实现或视觉。 |
| [`jamesgary/constellations`](https://github.com/jamesgary/constellations/tree/615ba564fa28626d84866583ccc95d5a06ee013a) | `615ba564fa28626d84866583ccc95d5a06ee013a`；根 LICENSE 为 MIT，`package.json` 标记 ISC | 仓库元数据、README、许可证与构建声明 | 只用于理解点/边谜题的公开机制；不复制 Elm/JS/CSS、关卡或图片。 |
| [`ofrohn/d3-celestial`](https://github.com/ofrohn/d3-celestial/tree/7e720a3de062059d4c5400a379146a601d9010e0) | `7e720a3de062059d4c5400a379146a601d9010e0`，BSD-3-Clause | README、LICENSE、本地数据加载和数据来源说明 | 因真实天图需要第三方库、JSON 数据与非 A 级加载条件而拒绝引入；不复制代码、星表、星座线或素材。 |

浏览器答案规范化与表单行为依据以下 Web 平台文档独立实现，没有复制示例代码：

- [MDN `String.prototype.normalize()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)；
- [MDN `<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input)；
- [MDN `autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)。

## 生成资产

- `observatory-desk.png`：为本作品生成的 1536×1024 天文台桌面背景；经人工检查为无文字、无 UI、无人物的边缘装饰资产；
- `docs/assets/star-code-unlock/concept-desktop.png`：1503×1046 桌面回答态概念；
- `docs/assets/star-code-unlock/concept-mobile.png`：853×1844 移动回答态概念。

概念图仅作为布局、材质、色彩和密度规格。生产页面不会把概念图当作 UI 背景；星盘、星点、刻度、票据、输入、按钮、封条和文字均由本仓库代码生成。

## 独立实现说明

除上表明确记录的机制调研与 Web 平台资料外，本作品的产品结构、私人线索状态机、答案匹配、帮助校准、阶段 DOM、SVG 星盘、CSS、文案和测试均在本仓库内独立设计与实现。
