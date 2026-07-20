# 这一场雨，我们一起接：来源与归属

核验日期：2026-07-21。下列开源项目只用于开发前机制研究，不是本作品的运行依赖。

## 固定研究来源

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [Kartik0211/Catching-the-objects](https://github.com/Kartik0211/Catching-the-objects/tree/65e8fa086d40233295615a2bf1d8aa255dc0eb84) | commit `65e8fa086d40233295615a2bf1d8aa255dc0eb84`；MIT；Copyright (c) 2024 Kartik0211 | 落物、接取区与矩形相交的基本流程 | 随机生成、计分、鼠标篮子、源码、DOM、CSS、界面和素材 |
| [ankitwarbhe/Basketcatcher](https://github.com/ankitwarbhe/Basketcatcher/tree/67b56217bce938baafa2c133a221c4a715e13cd5) | commit `67b56217bce938baafa2c133a221c4a715e13cd5`；MIT；Copyright (c) 2024 Ankit Warbhe | 正向落物与负向落物的区分 | 随机、Canvas、图片、音频、localStorage、难度、排行榜、源码和素材 |
| [pemmyz/js_thrustvector](https://github.com/pemmyz/js_thrustvector/tree/0b5300749c310f52e793493d50f0e4734db888b2) | commit `0b5300749c310f52e793493d50f0e4734db888b2`；MIT；Copyright (c) 2025 pemmyz | 两名玩家以不同输入角色共同作用于一个对象，以及双人合作 Gate | 飞船、炸弹、绳索、洞穴、物理、程序生成、雾、地图、手柄、Canvas、源码、界面和素材 |

即便上述 MIT 许可证允许一定范围的复制，本作品仍选择零复制。运行目录没有打包这些项目的源码、许可证代码、文档或素材；若未来实际使用任何受保护表达，必须先保留对应许可证与版权声明，明确文件级边界，并撤销这里的“零复制”结论。

## 浏览器标准

作品直接使用标准的 `requestAnimationFrame`、`KeyboardEvent.code`、Page Visibility、原生 button/progress、reduced-motion 与 forced-colors。开发依据包括 [WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)、[W3C UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/)、[WCAG 2.2](https://www.w3.org/TR/WCAG22/)、[Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/) 和 [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/)。这是直接调用浏览器标准接口；没有复制规范示例、图表、IDL、测试或原文段落。

## OpenAI ImageGen 资产

- [`docs/assets/cloud-recipe/weather-kitchen-background-source.png`](../../../docs/assets/cloud-recipe/weather-kitchen-background-source.png) → [`assets/weather-kitchen-background.png`](./assets/weather-kitchen-background.png)：1672×941，SHA-256 `7e7c2e17c3df7f717e99381c9dcfc978ae0e0b8e60a95e84d6db1884ada629cc`；
- [`docs/assets/cloud-recipe/cloud-ribbon-source.png`](../../../docs/assets/cloud-recipe/cloud-ribbon-source.png) → [`assets/cloud-ribbon.png`](./assets/cloud-ribbon.png)：1983×793，SHA-256 `544ab0fb696212aaaca571e7b0af175b473585e1b774e3926136c6c6d6982be9`；
- [`docs/assets/cloud-recipe/weather-bottles-source.png`](../../../docs/assets/cloud-recipe/weather-bottles-source.png) → [`assets/weather-ingredients.png`](./assets/weather-ingredients.png)：2168×725，SHA-256 `8ab36af24644d4bd0b815cb1e1c60890b3507a7be121ac9b22e9c3d129488c45`。

三张源稿均于 2026-07-21 使用 OpenAI 内置 ImageGen 与本项目原创纯文字提示生成，输入第三方图片为“无”。运行时文件是源稿逐字节副本，没有裁切、转码或合成第三方内容。背景与材质不保存规则；七雨道、水滴、把手、配方状态、控制和完成摘要均由独立实现的 DOM/CSS 与规则层提供。[`assets/favicon.svg`](./assets/favicon.svg) 是本项目独立绘制的原创云朵配方瓶图形。

## 独立实现与零复制声明

「这一场雨，我们一起接」的情侣语义、七道唯一合作区间、三份九波固定配方、邻接灰滴、双席权限、状态机、测试、中文文案、HTML、CSS、JavaScript、SVG 与生成式视觉资产均由本仓库独立完成。

三个固定项目只用于研究落物接取、正负目标区分与不同角色共同作用于一个对象的一般问题。本作品未复制、改写、翻译、移植、打包或依赖其源码、算法实现、关卡、参数、测试、页面、DOM、CSS、图片、图标、音频、字体、构建产物或文案。
