# 稳稳地，和你一起向前

两个人共用一台设备，各自托住天平的一端。只有共同支撑足够、滚珠居中、速度放缓、横梁安全时，小车才会穿过“向右接住、换边接回、一起回正”三段固定坡路。

## 启动

直接双击 [`index.html`](./index.html) 即可。本作品是 A 级经典脚本页面，支持 `file://` 直开，不需要安装依赖、启动服务器、账号或网络。

## 操作

- 左边按住 `A`，或按住左侧“左边托住”按钮；
- 右边按住 `L`，或按住右侧“右边托住”按钮；
- 松开后对应一端会平缓回落；
- 滚珠掉落后，两边都松开，便可从最近的检查灯继续；
- Escape、窗口失焦、页面隐藏或长帧会清空输入并暂停，不补算后台时间。

键盘、触控和 Pointer 使用同一套规则。两个触点可以分别占据左右席；`pointerup`、`pointercancel`、`lostpointercapture` 与 document 级释放都按精确 `pointerId` 清理。

## 个性化、隐私与本地边界

打开 [`config.js`](./config.js) 可以修改双方称呼、开场与完成赠语。`composeSteadyMessage(view)` 保留了一个有安全默认结果的学习 TODO；不修改也能完整游玩。

作品不录音、不联网、不保存，不使用浏览器存储、传感器、相机、麦克风、定位、音频、外部字体、CDN、统计或遥测。背景缺失时，原生 SVG 路线、检查灯、平衡车、滚珠、中央区和文字仍保留完整规则。

## 借鉴与来源声明

核验日期：2026-07-18。以下来源只用于研究通用机制和技术取舍，不是运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [makenowjust-sandbox/20210411-seesaw](https://github.com/makenowjust-sandbox/20210411-seesaw/tree/70790b1c0cc57aabddd93f58ad456e473db44d2e) | `70790b1c0cc57aabddd93f58ad456e473db44d2e`；MIT；Copyright 2021 TSUYUSATO “MakeNowJust” Kitsune | 中心支点、横梁、滚珠、摩擦、落地失败与重置 | TypeScript、常量、随机计分、localStorage、GIF、视觉 |
| [balance-ball-game](https://github.com/ekids9702122935/balance-ball-game/tree/8cc21a213394f0e701ca0643af3fef32562f5d91) | `8cc21a213394f0e701ca0643af3fef32562f5d91`；MIT；许可证仅标注 Copyright 2025，未列姓名 | 倾角影响滚珠、中央区门控进度 | 源码、公式、参数、gamepad、分数、难度、粒子、磁吸、边缘辅助 |
| [Matter.js](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da) | `8a67787735585f02c4b46eabf7b9fcc1c7c321da`；MIT；Liam Brummitt and contributors | 转轴约束、圆体和横梁技术对照 | 引擎、示例、分发文件、参数、图标、文档文字 |
| [Planck.js](https://github.com/piqnt/planck.js/tree/93dd64df0fd2e5388551b159bebc6306e7af580a) | `93dd64df0fd2e5388551b159bebc6306e7af580a`；MIT；Erin Catto、Ali Shakiba | 固定步、fixture、边界、接触事件备选路径 | 引擎、示例、分发文件、Box2D/Planck 实现 |
| [Box2D](https://github.com/erincatto/box2d/tree/56edae79f2949d86142b03450d5d60f63bcf5a6f) | `56edae79f2949d86142b03450d5d60f63bcf5a6f`；MIT；Copyright 2022 Erin Catto | 固定时间步和约束求解技术对照 | C/C++、示例、图表、文档文字、运行时 |
| [Unity ML-Agents](https://github.com/Unity-Technologies/ml-agents/tree/5f2aae68223624559096479695a8d7a94296bfec) | `5f2aae68223624559096479695a8d7a94296bfec`；Apache-2.0；Copyright 2017 Unity Technologies | Balance Ball 的观察、动作、持续平衡目标 | Unity/ML/3D 代码、模型、场景、资源、文案、视觉 |
| [pemmyz/js_robotballgame_redux](https://github.com/pemmyz/js_robotballgame_redux/tree/3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5) | `3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5`；MIT；Copyright 2025 pemmyz | 两套键盘/触控输入共同作用于公开物理对象 | CDN Planck、机器人、AI、冲刺、分数、2.5D 视觉、截图 |
| [imshota1009/Nyan-Cororin](https://github.com/imshota1009/Nyan-Cororin/tree/fb9054368526d30929870aae7338b3b956235e7a) | `fb9054368526d30929870aae7338b3b956235e7a`；MIT；Copyright 2026 shota | 倾斜到加速度、阻尼、速度上限、键盘降级 | Three.js/Cannon.js CDN、传感器、角色、关卡、BGM、文案、造型 |
| [chriz-3656/tiltmaze](https://github.com/chriz-3656/tiltmaze/tree/3c959deb5743fea22e9654c69c697e4cf4dc5334) | `3c959deb5743fea22e9654c69c697e4cf4dc5334`；MIT；Copyright 2026 MISTER CHRIS | Canvas 加速度、阻尼、目标判定 | 六关迷宫、图标、音频、UI、排行榜、API |
| [neizod/marbles](https://github.com/neizod/marbles/tree/bb8542028d1665775e46262a86d19ff5baab038a) | `bb8542028d1665775e46262a86d19ff5baab038a`；MIT；Copyright 2017 Nattawut Phetmak | 左右独立输入共同改变一个公开状态 | 源码、棋面、规则、GIF、界面 |

工程行为还参考固定版本的 [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)、[WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)、[W3C Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13) 与 [WCAG 2.2](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)，只研究 Pointer 生命周期、动画帧、隐藏页面、非颜色提示和降动效；未复制规范文字、IDL、示例、图表或站点视觉。完整权利与排除项见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。

本作品没有复制、改写、翻译、打包或依赖上述来源的源代码、公式、参数、关卡、素材、图标、字体、音频、截图、页面结构或文案。三段坡势、整数动力学、检查点、终点保持、HTML、CSS、JavaScript、原生 SVG、中文文案和测试均为本仓库独立创作。

## OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen；概念使用 `ui-mockup`，生产背景使用 `stylized-concept`；
- 生成日期：2026-07-18；
- 第三方图像输入：无；
- 运行资产：[`assets/balance-journey.webp`](./assets/balance-journey.webp)；
- 内部概念：[`design/steady-together/`](../../../design/steady-together/) 下的桌面进行、移动进行、桌面完成视觉规格，不由运行页面加载。

背景无字、无 UI、无横梁和滚珠，只提供暖象牙纸景、山路和两盏环境灯。所有规则对象、状态、焦点和文字均由本地 HTML/CSS/JavaScript/SVG 生成。
