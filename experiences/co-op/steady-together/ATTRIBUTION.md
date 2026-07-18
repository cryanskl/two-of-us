# 借鉴与来源声明

核验日期：2026-07-18。

## 机制与技术取舍参考

| 来源 | 固定版本、许可证与权利主体 | 本作仅研究 | 未复制、翻写或引入 |
| --- | --- | --- | --- |
| [makenowjust-sandbox/20210411-seesaw](https://github.com/makenowjust-sandbox/20210411-seesaw/tree/70790b1c0cc57aabddd93f58ad456e473db44d2e) | commit `70790b1c0cc57aabddd93f58ad456e473db44d2e`；MIT；Copyright 2021 TSUYUSATO “MakeNowJust” Kitsune | 中心支点、横梁、滚珠、摩擦、落地失败与重置 | TypeScript 源码、公式、常量、随机计分、localStorage、GIF、视觉 |
| [cryanskl 调研候选 balance-ball-game](https://github.com/ekids9702122935/balance-ball-game/tree/8cc21a213394f0e701ca0643af3fef32562f5d91) | commit `8cc21a213394f0e701ca0643af3fef32562f5d91`；MIT；许可证仅标注 Copyright 2025，未列姓名 | 倾角影响滚珠、中央区域门控进度 | 源码、公式、参数、gamepad、分数、难度、粒子、磁吸、边缘辅助 |
| [Matter.js](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da) | commit `8a67787735585f02c4b46eabf7b9fcc1c7c321da`，稳定版 0.20.0 对应 commit；MIT；Liam Brummitt and contributors | 转轴约束、圆体和横梁技术对照 | 引擎、示例、分发文件、参数、图标、文档文字 |
| [Planck.js](https://github.com/piqnt/planck.js/tree/93dd64df0fd2e5388551b159bebc6306e7af580a) | commit `93dd64df0fd2e5388551b159bebc6306e7af580a`；MIT；Erin Catto、Ali Shakiba | 固定步、fixture、边界、接触事件备选路径 | 引擎、示例、分发文件和 Box2D/Planck 实现 |
| [Box2D](https://github.com/erincatto/box2d/tree/56edae79f2949d86142b03450d5d60f63bcf5a6f) | commit `56edae79f2949d86142b03450d5d60f63bcf5a6f`；MIT；Copyright 2022 Erin Catto | 固定时间步和约束求解技术对照 | C/C++ 源码、示例、图表、文档文字、运行时 |
| [Unity ML-Agents](https://github.com/Unity-Technologies/ml-agents/tree/5f2aae68223624559096479695a8d7a94296bfec) | commit `5f2aae68223624559096479695a8d7a94296bfec`；Apache-2.0；Copyright 2017 Unity Technologies | Balance Ball 任务的观察、动作与持续平衡目标 | Unity/ML/3D 代码、模型、场景、资源、文案、视觉 |
| [pemmyz/js_robotballgame_redux](https://github.com/pemmyz/js_robotballgame_redux/tree/3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5) | commit `3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5`；MIT；Copyright 2025 pemmyz | 两套键盘/触控输入共同作用于公开物理对象 | CDN Planck、机器人造型、AI、冲刺、分数、2.5D 视觉、截图 |
| [imshota1009/Nyan-Cororin](https://github.com/imshota1009/Nyan-Cororin/tree/fb9054368526d30929870aae7338b3b956235e7a) | commit `fb9054368526d30929870aae7338b3b956235e7a`；MIT；Copyright 2026 shota | 倾斜到加速度、阻尼、速度上限、键盘降级 | Three.js/Cannon.js CDN、传感器、角色、关卡、BGM、文案、造型 |
| [chriz-3656/tiltmaze](https://github.com/chriz-3656/tiltmaze/tree/3c959deb5743fea22e9654c69c697e4cf4dc5334) | commit `3c959deb5743fea22e9654c69c697e4cf4dc5334`；MIT；Copyright 2026 MISTER CHRIS | Canvas 加速度、阻尼和目标判定 | 六个关卡、迷宫、图标、音频、UI、排行榜、API |
| [neizod/marbles](https://github.com/neizod/marbles/tree/bb8542028d1665775e46262a86d19ff5baab038a) | commit `bb8542028d1665775e46262a86d19ff5baab038a`；MIT；Copyright 2017 Nattawut Phetmak | 左右独立输入共同改变一个公开状态 | 完整源码、棋面、规则、GIF、界面 |

上述项目均不是运行依赖。即使许可证允许复制，本作品也选择零复制，以保持实现来源、视觉身份和许可证义务清晰。

## Web 平台与无障碍规范

| 规范 | 固定版本与权利 | 本作仅研究 | 未复制 |
| --- | --- | --- | --- |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License；W3C contributors | pointerId、capture、cancel、lost capture 与键盘入口 | 规范文字、WebIDL、示例、图表、站点视觉 |
| [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d) | commit `56674fb3ac40279141a202e5d19b84f30d99854d`；规范 CC BY 4.0、代码片段 BSD-3-Clause；WHATWG contributors | animation frame 时间戳和页面生命周期 | 规范文字、代码片段、示例、站点视觉 |
| [W3C Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13) | commit `8ca533c744e655b8340b5713d1bd5ea97b202b13`；W3C Software and Document License；W3C contributors | 隐藏页面生命周期 | 规范文字、WebIDL、示例、图表 |
| [WCAG 2.2](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | commit `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License；W3C contributors | 目标尺寸、非颜色提示、状态语义与降动效 | 规范文字、示例、图表、站点视觉 |

## 明确排除的项目

- `satnamsingh2007/seesaw-game@3839f95759d141fc39142429c97f85fe6f1eb246`：无正式 LICENSE，且混入 Matter.js、p5.js 与 PNG；不复制代码或素材。
- `HalimRaimjanov/Ball-game-JS@9f0ed163a45eb2dc3ceb6eaa88e38bbaa7c03cda`：无正式 LICENSE；HTML、JavaScript、CSS 与背景均不可复制。
- `DipeshR23/tilt-balance-game@fb861aa2e02182b43e47947fb8248578db402d65`：无正式 LICENSE；不复制源码、PWA 或素材。
- `Mai-Anshhh/BalanceBall@10591353bd5f2cd9d48ab84f75bfa0c6fffaa784`：MIT 权利人写作 Bartosz Budnik，与仓库所有者不一致，且含大量二进制、音频和 Godot 构建；不进入复用链。
- `bobbyali/algebra_seesaw@e1e888f83e8c9596e0bdb081f63efb32a5cd4642`：MIT 明确，但属于代数配重教学，主题不匹配；没有内容进入本作。

无许可证项目只用于确认“跷跷板影响滚珠”是常见抽象机制，没有对其源码、样式、常量、资源或页面结构进行阅读式翻写。

## OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen；界面概念使用 `ui-mockup`，运行背景使用 `stylized-concept`；
- 生成日期：2026-07-18；
- 第三方图片、开源项目截图、源码或 UI 输入：无；
- 运行资产：[`assets/balance-journey.webp`](./assets/balance-journey.webp)；
- 内部视觉规格：[`design/steady-together/`](../../../design/steady-together/) 下的桌面进行、移动进行和桌面完成概念，运行页面不加载这些图片；
- 源 PNG：按内置 ImageGen 工具约定保留在 Codex 生成目录，仓库只保存接受稿和 WebP 生产版本。

生产背景只包含暖象牙纸景、山路、山水和两盏环境灯；无文字、无 UI、无横梁、无滚珠、无品牌、无水印。路线 HUD、真正检查灯、平衡车、中央区、操作 pad、状态和全部文字由本地 HTML/CSS/JavaScript/SVG 生成。

## 完整零复制与原创声明

“稳稳地，和你一起向前”的三段坡势组合、定标整数状态机、对称舍入、升力/倾角/滚珠更新顺序、复合稳定 Gate、检查点回退、终点保持、经典脚本接线、原生 SVG 投影、响应式布局、中文文案与测试均为本仓库独立创作。

本作品没有复制、翻译、改写、打包或依赖上述项目和规范的源代码、公式、参数、关卡、素材、图标、字体、音频、截图、图表、页面结构、文案或视觉。未引入 Matter.js、Planck.js、Box2D、Three.js、Cannon.js、Unity、Godot 或任何其他物理/游戏运行库。
