# 雾里，跟着你走：来源与归属

核验日期：2026-07-20。下列开源项目只用于开发前研究，不是本作品的运行依赖。

## 固定研究来源

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [rot.js v2.2.1](https://github.com/ondras/rot.js/tree/46782e248c2db9d379a5e4f13bb8323f18dff04b) | annotated tag object `55f487ca0384c9a10d19a705504c83def21654a1`，解引用 commit `46782e248c2db9d379a5e4f13bb8323f18dff04b`；BSD-3-Clause；Copyright 2012-now Ondrej Zara | 网格地图、路径和 field-of-view 应被拆分成独立抽象 | FOV、地图与寻路源码、API、算法实现、测试、示例、参数、文档、图标、字体和构建产物 |
| [TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) | commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`；MIT；Copyright 2026 tridpt | `mazecoop.js` 展示双人合作迷宫需要明确分工与共同目标 | 六张地图、双出口、压力板、拉杆、门、移动/渲染源码、DOM、CSS、存储、网络、音效、emoji、文案与素材 |
| [Amazeing v1.4.1](https://github.com/Ijee/Amazeing/tree/10daea21682eb3a868a03043452c8254178b8504) | tag 与 commit 均为 `10daea21682eb3a868a03043452c8254178b8504`；MIT；Copyright 2021 Thorsten Schulz | 生成与遍历算法应分层，并用自动化流程验收常见路径；可用路径证明验证固定地图 | Angular 应用、BFS 与 21+ 算法实现、数据结构、测试、文章、UI、图标、截图、资产、PWA 和构建配置 |

即便上述许可证允许一定范围的复制，本作品仍选择零复制。运行目录没有打包这些项目的许可证代码、文档或素材；若以后实际使用任何实质代码、文字、参数或资产，必须先保留对应许可证、版权声明和文件级边界，并撤销这里的“零复制”结论。

## 明确排除的来源

[wblachut/fog-of-war commit `1e2c17c`](https://github.com/wblachut/fog-of-war/tree/1e2c17c332307b0f112895114b9dadc0db2b948f) 仅作为技术选型反例：核验时未找到许可证，README 明示视觉使用 Heroes of Might & Magic III 主题及第三方游戏资产，并依赖 React、Vite、Konva 等。公开可见不等于获得复制授权；本作品没有复制或使用其源码、素材、页面结构、样式、文案、Canvas 像素揭雾、依赖或商业游戏主题，只保留“双 Canvas 像素揭雾会增加依赖与测试复杂度”这一抽象结论。

## 浏览器标准

作品直接使用标准的 `requestAnimationFrame`、`KeyboardEvent.key/code`、Page Visibility、原生 button/progress、reduced-motion 与 forced-colors。开发依据包括 [WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)、[W3C UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/)、[WCAG 2.2](https://www.w3.org/TR/WCAG22/)、[Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) 和 [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/)。这是直接调用浏览器标准接口；没有复制规范示例、图表、IDL、测试或原文段落。

## OpenAI ImageGen 资产

- [`docs/assets/fog-navigation/fog-table-background-source.png`](../../../docs/assets/fog-navigation/fog-table-background-source.png)：2026-07-20 使用 OpenAI 内置 ImageGen 按本项目原创文字提示生成的无字生产背景源稿，1672 × 941 PNG；输入第三方图片为“无”。
- [`assets/fog-table-background.png`](./assets/fog-table-background.png)：上述源稿的逐字节运行副本；没有裁切、转码、合成第三方照片、标识或素材。
- [`docs/assets/fog-navigation/desktop-briefing-concept.png`](../../../docs/assets/fog-navigation/desktop-briefing-concept.png)、[`mobile-driving-concept.png`](../../../docs/assets/fog-navigation/mobile-driving-concept.png) 与 [`desktop-complete-concept.png`](../../../docs/assets/fog-navigation/desktop-complete-concept.png)：同日由纯文字提示生成的三态概念，只用于视觉验收，不进入运行页面；概念中的错误文字、地图、地标与虚构成绩没有被复制。
- [`assets/favicon.svg`](./assets/favicon.svg)：本项目代码原生绘制的提灯与雾线 SVG，不是 ImageGen 或第三方图标。

背景只提供深夜木桌、边缘松枝与提灯氛围，不保存完整地图、陷阱、安全路线、地标、成绩、规则文案或控制。所有游戏信息都由本地经典脚本与 DOM/CSS 生成。

## 独立实现与零复制声明

「雾里，跟着你走」的情侣语义、限时看图与热座交接机制、四张 13×9 地图、危险与地标、角色顺序、规则模型、BFS 与局部投影实现、合作必要性证明、状态机、测试、中文文案、HTML、CSS、JavaScript、SVG 和生成视觉资产均由本仓库独立完成。

rot.js、TwoPlayerGames 和 Amazeing 只用于研究网格/视野分层、双人合作分工与路径验证的一般问题。本作品未复制、改写、翻译、移植、打包或依赖其源码、API、算法实现、关卡、地图、参数、测试、页面、DOM、CSS、文章、图片、图标、音频、字体、构建产物或文案；fog-of-war 被明确排除，未使用其中任何实现或资产。
