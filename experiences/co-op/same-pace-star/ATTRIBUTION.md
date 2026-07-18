# 借鉴与来源声明

核验日期：2026-07-18。

## 机制、工程与权利边界参考

| 来源 | 固定版本、许可证与权利主体 | 本作仅研究 | 未复制、改写或引入 |
| --- | --- | --- | --- |
| [hmillerbakewell/breathing-exercises](https://github.com/hmillerbakewell/breathing-exercises/tree/6ae2b07cead1c953ccbdcabba7a245dc6294950f) | commit `6ae2b07cead1c953ccbdcabba7a245dc6294950f`；MIT；Copyright 2022 Hector Miller-Bakewell | 分阶段数据、视觉阶段进度 | HTML/JavaScript、SVG 路径、调色板、4/6 秒处方、页面文案、打包 SVG.js 与 sourcemap |
| [kosciukus/breathe](https://github.com/kosciukus/breathe/tree/debd32208441f7ba68d34badf0aa5ab73cb66cf3) | commit `debd32208441f7ba68d34badf0aa5ab73cb66cf3`；MIT；Copyright 2026 kosciukus | 阶段提示分离、本地离线生命周期 | Flutter、watch、wear 与平台代码，音频提示、预设、图标、界面 |
| [mmazzarolo/breathly-app](https://github.com/mmazzarolo/breathly-app/tree/740527679c95a6b77b8d9157c8945a060d2dcdb2) | commit `740527679c95a6b77b8d9157c8945a060d2dcdb2`；MPL-2.0；Matteo Mazzarolo 与 contributors | 文件级 copyleft 边界、会话状态与视觉提示分离 | 全部代码、音频、General Sans/Lora 字体、星空素材、呼吸预设、文案、UI |
| [anxkhn/zen-clock-workshop](https://github.com/anxkhn/zen-clock-workshop/tree/f4ba61f5ea964405532fe97c4ea9a6313f150444) | commit `f4ba61f5ea964405532fe97c4ea9a6313f150444`；MIT；Copyright 2026 Zen Clock Contributors | 仅作反例：README 明示含故意植入 bug 与未完成功能 | 全部源码、主题、localStorage 结构、健康功能、图标、素材、界面 |
| [BreatheWithMe, CHI EA 2023](https://doi.org/10.1145/3544549.3585589) | 出版方版权；[TU Delft 记录](https://resolver.tudelft.nl/uuid:b27dd57a-69cb-4bf8-adee-bde1fe254b67) 未提供可复用许可 | 双通道共同呈现的抽象研究问题；研究结果不证明生理同步 | 论文正文、图表、设备、实验流程、截图、数据与措辞 |
| [WHATWG HTML](https://github.com/whatwg/html/tree/9377fd656f519b60524b92f09bcc9e6d937b2017) | commit `9377fd656f519b60524b92f09bcc9e6d937b2017`；规范 CC BY 4.0，代码片段 BSD-3-Clause；WHATWG contributors | animation frame 时间戳、按经过时间推进和可见性生命周期 | 规范文字、代码片段、示例与站点视觉 |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License；W3C contributors | 独立 pointerId、Pointer capture、cancel、lost capture 与键盘等价入口 | 规范文字、WebIDL、代码片段、示例、图表 |
| [WCAG 2.2](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | commit `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License；W3C contributors | 降动效、非颜色提示、状态语义与可辨焦点 | 规范文字、示例、图表和站点视觉 |

无正式许可证的 `nfreear/breath` 与 `Zen-Focus/Zen-Focus-Web` 在调研阶段即被排除，不是可复制来源，也没有内容进入本作品。

## 健康边界

本作品是节奏合作游戏，不是呼吸训练、健康评估或治疗工具。光圈只提示四个离散动作，不要求深呼吸、延长呼气、憋气或按固定秒数改变真实呼吸；完成结果也不用于推断感情、压力、焦虑、睡眠、神经系统、心率、血氧、生理呼吸或两人的身体同步。

措辞边界还查阅了 [NCCIH Relaxation Techniques](https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know) 与 [NHS breathing exercises](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/)；只据此避免健康效果承诺并提示不适时停止，没有复制其正文、练习步骤、处方节奏或页面视觉。

## OpenAI ImageGen 资产

四次调用均使用 OpenAI 内置 ImageGen，没有输入第三方图片，也没有将上述开源项目、论文或规范的截图、素材、界面作为视觉输入。

- 生成方式：OpenAI 内置 ImageGen，`ui-mockup` / `stylized-concept`；
- 生成日期：2026-07-18；
- 第三方输入：无；
- 运行资产：[`assets/quiet-sky.webp`](./assets/quiet-sky.webp)；
- 内部视觉规格：仓库 [`design/same-pace-star/`](../../../design/same-pace-star/) 下的桌面进行、移动进行与桌面完成概念；运行页面不加载这些概念图。

### 桌面进行态提示词

```text
Use case: ui-mockup. Asset type: desktop web game visual concept, 3:2 landscape.
Polished shippable playing state for a tender local two-player rhythm cooperation game.
Full-screen quiet indigo tactile paper night; top header; centered six-star progress;
large moon-white two-outline halo; four discrete beat cells; two very large symmetric
lower control pads. Crafted paper, frosted enamel, warm brass; code-buildable.
Deep #11152b/#252a50, #f4ecd8, #e1ae62, muted blue-violet and apricot.
No legible text, letters, numbers, people, hands, logos or watermark. Avoid medical
breathing app, meditation timer, ECG, arcade/neon HUD, glass dashboard and card grid.
```

### 移动进行态提示词

```text
Use case: ui-mockup. Asset type: mobile web game visual concept, tall portrait about
390x844. Same tender local two-player game: compact header, six-star progress, large
interlocking double halo, four beat cells, then two equally large left/right pads
arranged horizontally at the bottom. Full core flow visible, practical large targets.
Indigo tactile paper, moon ivory, warm brass, muted blue-violet and apricot.
No legible text, people, hands, phone frame, logos or watermark. Avoid medical/meditation,
ECG, neon rhythm game, glassmorphism and card grids. Pads must stay side by side.
```

### 桌面完成态提示词

```text
Use case: ui-mockup. Asset type: desktop completion concept, 3:2 landscape.
Six fully lit outlined stars in a calm shallow arc, one resting shared warm ring,
an elegant blank paper area for code-rendered final message, and two restrained actions.
Crafted indigo paper, matte enamel, thin brass, quiet satisfaction, no celebration blast.
No legible text, people, hands, confetti, logos or watermark. Avoid wellness/medical UI,
meditation app, heart monitor, neon arcade, trophy screen, glass panels and card grids.
```

### 生产背景提示词

```text
Use case: stylized-concept. Full-bleed responsive website background. Deep ink-indigo
handmade paper with subtle fiber grain, moon-ivory haze near center, sparse warm gold
pinprick stars toward outer edges, faint two-part circular traces almost disappearing.
Wide crop-safe composition with low-detail center, intimate and still. #11152b/#252a50,
#f4ecd8 and #e1ae62. No text, UI, people, hands, hearts, logos or watermark; no medical
symbols, ECG, galaxies, planets, nebulae, neon, glassmorphism or central starburst.
```

运行背景只提供夜空材质、中央月白薄雾、边缘星点与几乎隐去的圆轨，不包含文字、UI、人物、图标或第三方素材。页面的六星、双环、节拍格、左右 pad、方向差异、焦点和全部文字均由原生 HTML/CSS/JavaScript 生成。

## 完整零复制与原创声明

接光四拍、六颗星左右轮换计划、50ms 整数时间线、物理 inputId、release Gate、不可变状态机、经典脚本接线、阶段 DOM、响应式视觉系统、中文文案、无障碍策略与测试均为本仓库独立创作。

本作品没有复制、翻译、改写、打包或依赖上述项目、论文与规范的源代码、算法表达、数据结构、处方节奏、音频、字体、图标、SVG、截图、图表、设备、实验流程、实验数据、页面文案、界面结构或视觉素材。
