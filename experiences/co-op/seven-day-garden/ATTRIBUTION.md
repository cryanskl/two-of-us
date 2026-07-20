# 把七天，养成一朵花：来源与归属

核验日期：2026-07-21。下列开源项目只用于开发前的机制研究，不是本作品的运行依赖。

## 固定研究来源

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [TransmediaLab/SmartFarm](https://github.com/TransmediaLab/SmartFarm/tree/bea42244c39298f0ba451265700836d0eac5064e) | commit `bea42244c39298f0ba451265700836d0eac5064e`；Apache-2.0；Copyright 2015 Department of Computing and Information Sciences, Kansas State University；源码作者标注 Nathan H. Bean | 离散日推进、显式 step/reset 与生长状态更新 | Elixir、服务端、Blockly、地图、天气、WebSocket、SVG 路径、源码、参数、界面和第三方组件 |
| [boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io/tree/55200a6aead258d94601093572b6fafde44058b1) | commit `55200a6aead258d94601093572b6fafde44058b1`；MIT；Copyright (c) 2017 The boardgame.io Authors | 每席有限行动、显式阶段、轮次顺序与终止条件 | 引擎、联网层、调试器、API、示例代码、UI、测试和素材 |
| [trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms/tree/0f52fbaced5d33041a5a834f72f880a9262bcb82) | commit `0f52fbaced5d33041a5a834f72f880a9262bcb82`；MIT；Copyright (c) 2018 Oleksii Trekhleb | 有限状态遍历、seen/记忆化与系统枚举 | 算法库、队列/图结构实现、组合函数、测试、参数和文档素材 |
| [w3labkr/js-growing-tree](https://github.com/w3labkr/js-growing-tree/tree/11cf7e8759ad8c46418c26057182225d10260795) | commit `11cf7e8759ad8c46418c26057182225d10260795`；MIT；Copyright (c) 2025 W3LabKr | 完整植物结构与当前生长层分离，动画只表现已确定状态 | `tree.js`、LCG、分支坐标、Canvas 实现、截图、配色、演示 UI 和素材 |

即使上述许可证允许一定范围的复制，本作品仍选择零复制。运行目录没有打包这些项目的源码、许可证代码、文档或素材；若未来实际使用任何受保护表达，必须先保留对应许可证与版权声明，明确文件级边界，并撤销这里的“零复制”结论。

## 明确排除的调研候选

- `spetterman66/plant-watering-game` 依赖真实时间、`localStorage`、随机花朵、音频与持续衰减，只用于确认长期浇水不适合本作；
- `kai9987kai/plant-ecosystem-sim` 在固定提交下无法取得可靠 LICENSE 原文，不作为可引入来源；
- `jeremyckahn/farmhand` 主体 GPL-2.0，媒体另有 CC BY-NC-SA 边界，本作未采用；
- `viskakov/Farm` 的 Unity 模型、纹理和包边界不够清晰，本作未采用；
- `Gmast2662/grow-your-garden` 的账号、云存档、聊天、广告式成长循环和素材均超出本作范围，本作未采用。

## 浏览器标准

作品直接使用标准 HTML、CSS、Pointer Events、`KeyboardEvent.code`、原生 button/list/status、reduced-motion、forced-colors 与 WCAG 2.2 语义。这是直接调用浏览器标准接口；没有复制规范示例、图表、IDL、测试或原文段落。

## OpenAI ImageGen 资产

以下三张运行时 PNG 均于 2026-07-21 使用 OpenAI 内置 ImageGen 与本项目原创纯文字提示生成，第三方参考图片为“无”：

- [`assets/garden-table-background.png`](./assets/garden-table-background.png)：1586×992，SHA-256 `382cfbce3a0618a3de25ae3197cbb9b4462dffaa9273672bb725d87c02eee0c7`；清晨窗边空花桌背景；
- [`assets/plant-states.png`](./assets/plant-states.png)：1774×887 RGBA，SHA-256 `75409d8bb8d9b9f2a07409e6f228ce6fec324e6d913c77a215c4309f2a9c2316`；八阶段同盆植物图集，由洋红底源稿本地去底；
- [`assets/completion-keepsake.png`](./assets/completion-keepsake.png)：1568×1003，SHA-256 `3a0f2aa921936bcb08cd95b1e7430c568bd457382b0d133004123484ca35b146`；七片叶印的完成手账背景。

源稿、概念图、生成输入、去底参数与逐项核验见 [`docs/163-seven-day-garden-design.md`](../../../docs/163-seven-day-garden-design.md)。运行时背景和图集不保存规则；花签、库存、卡牌、席位、植物阶段文字、结果与完成日志均由独立实现的 DOM/CSS 与规则层提供。[`assets/favicon.svg`](./assets/favicon.svg) 是本项目独立绘制的原创盆栽图形。

## 独立实现与零复制声明

「把七天，养成一朵花」的情侣语义、七日花签、双篮精确覆盖、逐日交换先手、失败归还、后缀可解性 Gate、纯 reducer、中文文案、HTML、CSS、JavaScript、SVG 与生成式视觉资产均由本仓库独立完成。

四个固定项目只用于研究离散日推进、每席有限行动、有限状态可解性验证和生长状态与动画分离的一般问题。本作品未复制、改写、翻译、移植、打包或依赖其源码、算法实现、测试、参数、数据、页面、DOM、CSS、图片、图标、字体、音频、构建产物或文案。
