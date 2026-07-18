# 慢一点，也和你一起

两个人共用一台设备，轮流把一圈星光分成四拍交给彼此：领拍按住、对方接住、领拍松开、对方松开。六颗星由左右双方各领拍三次；没有分数、赢家、失败次数或健康评估。

## 启动与操作

双击 [`index.html`](./index.html) 即可。作品使用经典脚本和相对路径，不需要安装依赖、启动服务、账号或网络。

- 左边使用键盘 `A` 或左侧圆形按钮；
- 右边使用键盘 `L` 或右侧圆形按钮；
- 手机和平板可用两个独立触点分别操作两席；
- 每一拍先等“现在”再按住或松开；
- Escape、窗口失焦或页面隐藏会清空输入并暂停，继续后从当前星重新开始。

光圈只是节拍提示，不需要配合真实呼吸。不用憋气或刻意调整呼吸；如果感到不适，请停下来。本作品是节奏合作游戏，不是呼吸训练、健康评估或治疗工具，也不声称真实呼吸或生理同步。

## 个性化与隐私

打开 [`config.js`](./config.js) 可以修改双方称呼、开场和完成赠予文案。`composeSamePaceMessage(view)` 是一个有完整默认结果的学习 TODO，不修改也能完整游玩。

页面不录音、不联网、不保存，不使用麦克风、相机、定位、浏览器存储、音频文件、第三方字体、CDN 或远程资源。刷新页面即回到开场。

## 借鉴与来源声明

核验日期：2026-07-18。以下来源只用于研究抽象机制和权利边界，不是运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 只研究的抽象机制 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [hmillerbakewell/breathing-exercises](https://github.com/hmillerbakewell/breathing-exercises/tree/6ae2b07cead1c953ccbdcabba7a245dc6294950f) | `6ae2b07cead1c953ccbdcabba7a245dc6294950f`；MIT；Copyright 2022 Hector Miller-Bakewell | 分阶段数据与可视化阶段进度 | HTML/JS、SVG 路径、调色板、4/6 秒处方、文案、打包 SVG.js |
| [kosciukus/breathe](https://github.com/kosciukus/breathe/tree/debd32208441f7ba68d34badf0aa5ab73cb66cf3) | `debd32208441f7ba68d34badf0aa5ab73cb66cf3`；MIT；Copyright 2026 kosciukus | 阶段提示分离与本地离线生命周期 | Flutter/平台代码、音频、预设、图标、界面 |
| [mmazzarolo/breathly-app](https://github.com/mmazzarolo/breathly-app/tree/740527679c95a6b77b8d9157c8945a060d2dcdb2) | `740527679c95a6b77b8d9157c8945a060d2dcdb2`；MPL-2.0；Matteo Mazzarolo 与 contributors | 文件级 copyleft 边界、会话状态与视觉提示分离 | 全部代码、音频、General Sans/Lora 字体、星空素材、预设、文案、UI |
| [anxkhn/zen-clock-workshop](https://github.com/anxkhn/zen-clock-workshop/tree/f4ba61f5ea964405532fe97c4ea9a6313f150444) | `f4ba61f5ea964405532fe97c4ea9a6313f150444`；MIT；Copyright 2026 Zen Clock Contributors | 仅作含故意 bug 与未完成功能的反例 | 全部源码、主题、存储结构、健康功能、素材 |
| [BreatheWithMe, CHI EA 2023](https://doi.org/10.1145/3544549.3585589) | 出版方版权；[TU Delft 记录](https://resolver.tudelft.nl/uuid:b27dd57a-69cb-4bf8-adee-bde1fe254b67) 未提供可复用许可 | 双通道共同呈现的抽象研究问题；结果不证明生理同步 | 正文、图表、设备、实验流程、截图、措辞 |
| [WHATWG HTML](https://github.com/whatwg/html/tree/9377fd656f519b60524b92f09bcc9e6d937b2017) | `9377fd656f519b60524b92f09bcc9e6d937b2017`；规范 CC BY 4.0，代码片段 BSD-3-Clause | animation frame 时间戳和可见性生命周期 | 规范文字、代码片段、示例 |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License | Pointer ID、capture、cancel、键盘等价入口 | 规范文字、IDL、代码片段、图表 |
| [WCAG 2.2](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License | 降动效、非颜色提示、状态语义 | 规范文字、示例、图表、站点视觉 |

无正式许可证的 `nfreear/breath` 与 `Zen-Focus/Zen-Focus-Web` 被排除，不作为可复制来源。

本作品没有复制、改写、翻译、打包或依赖上述项目与论文的代码、数据结构、处方节奏、音频、字体、图标、SVG、截图、图表、设备、实验流程、文案或 UI。接光四拍、六星计划、状态机、HTML、CSS、JavaScript、中文文案和测试均为本仓库独立创作。

## OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen，`ui-mockup` / `stylized-concept`；
- 生成日期：2026-07-18；
- 第三方输入：无；
- 运行资产：[`assets/quiet-sky.webp`](./assets/quiet-sky.webp)；
- 内部概念：[`design/same-pace-star/`](../../../design/same-pace-star/) 的桌面进行、移动进行和桌面完成概念，不由运行页面加载。

最终生产背景提示词：

```text
Use case: stylized-concept. Full-bleed responsive website background. Deep ink-indigo
handmade paper with subtle fiber grain, moon-ivory haze near center, sparse warm gold
pinprick stars toward outer edges, faint two-part circular traces almost disappearing.
Wide crop-safe composition with low-detail center, intimate and still. #11152b/#252a50,
#f4ecd8 and #e1ae62. No text, UI, people, hands, hearts, logos or watermark; no medical
symbols, ECG, galaxies, planets, nebulae, neon, glassmorphism or central starburst.
```

背景只提供无字夜空与纸纹；全部星星、光圈、四拍、pad、状态与文字均由原生 HTML/CSS/JavaScript 生成。完整逐项边界与三个概念提示词见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。
