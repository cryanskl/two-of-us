# Shadow Duet 借鉴、授权与生成资产声明

## 独立实现边界

`shadow-duet` 的四姿势词汇、六幕姿势对、30Hz 整数 tick、状态机、持有栈、公开视图、中文文案与测试均由本仓库独立设计。

开发前只研究了 Bemuse 与 osu! 的公开时间线/判定分层、PixiJS 的 ticker/场景/交互职责分离，并用 MediaPipe 确认摄像头姿态识别的依赖与隐私边界。没有复制、翻译、改写、链接或打包这些项目的源码、算法表达、判定参数、谱面、模型、WASM、素材、资源、品牌、界面或测试。

四个项目都不是运行依赖；生产逻辑不联网、不保存、不录音录像，不读取相机、麦克风、定位、陀螺仪、账号或浏览器存储。

## 固定开源来源

### Bemuse

- 仓库：https://github.com/bemusic/bemuse
- 固定版本：`5688164b1904c0cc129b832c91160704b96b3cf3`
- 根 `LICENSE`：GNU AGPL Version 3；SHA-256 `06b332e1fa559c005a0fc8099741d88beb63d2433548c23931d2c396ca41aa72`
- 根 `README.md`：主项目标注 AGPLv3，子项目可有各自许可；SHA-256 `23dc204d5f06b640dde7fe82ffac648c1c09485b6f4a17250f8a311544bc84ac`
- `bemuse/package.json`：author 为 Thai Pangsakulyanont，历史 metadata 写 `AGPL-1.0`；SHA-256 `65a9c6d2af53797cd389ac4ec9838f8409a15e85b658912d63f07c1d0cd7323a`
- 仅研究：键盘节奏游戏如何分离输入、公开时间线与 early/late 反馈。
- 未使用：全部源码、BMS 谱面、判定参数、分数、排行、party mode、UI、图片、视频、音频、名称与品牌。

根许可证、README 与目录级 metadata 的版本号不一致。本项目不替上游解释该冲突，也不擅自改写为 `AGPL-3.0-only` 或 `AGPL-3.0-or-later`。如果未来需要引入任何 Bemuse 文件，必须停止实施并重新确认适用许可证；当前零复制、零链接边界不能作为复用授权。

### osu!

- 仓库：https://github.com/ppy/osu
- 固定版本：`b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d`
- `LICENCE`：MIT；Copyright (c) 2025 ppy Pty Ltd；SHA-256 `2e73c7c4295cc3da18697ac982f64a4ec449e0781e8f4c59318216e13998864a`
- `README.md`：代码/framework 为 MIT，`osu!` / `ppy` 品牌受商标法保护，游戏资源另有许可证；SHA-256 `fb95dc87d17380e49a50d26d06e648e5bbb861bbd64da662b19e07a6fce50847`
- 仅研究：规则时间与视觉表现分层，以及输入序列可重放。
- 未使用：C# 源码、framework、ruleset、判定数值、谱面、测试、UI、声音、资源、Logo、名称、品牌与商业外观。

MIT 只覆盖固定仓库中相应代码载体，不覆盖品牌和另行授权的游戏资源。

### PixiJS

- 仓库：https://github.com/pixijs/pixijs
- 固定版本：`1d90a20c62433ba68dff78466e06ee372a5a5232`
- 许可证：MIT
- 版权所有：Copyright (c) 2013–2023 Mathew Groves, Chad Engler
- `LICENSE` SHA-256：`5ce7447bc57f7349ffc48338782fbcabe613696e00712b20d66bc58e780f9473`
- 仅研究：ticker、场景状态、纹理表现与命中测试应分属不同责任层。
- 未使用：引擎、Renderer/Ticker/EventSystem API、源码、测试、示例、精灵、滤镜与构建配置；本项目使用原生 DOM/CSS。

### MediaPipe

- 仓库：https://github.com/google-ai-edge/mediapipe
- 固定版本：`0ad5a71bcdff3d756dc5b07f93765aaeb4152538`
- 许可证：Apache License 2.0
- `LICENSE` SHA-256：`8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8`
- 仅研究：真人姿态识别需要图像/视频输入、模型、时间戳和推理生命周期，因此本项目明确排除摄像头方案。
- 未使用：全部源码、模型、WASM、landmark 数据、API、demo、相机流程与视觉。

## Web 标准参考

W3C KeyboardEvent code values 用于物理键位置；Pointer Events Level 3 用于鼠标、触控笔、触摸与 capture/cancel；WHATWG HTML Page visibility 用于当前后台可见性合同；WCAG 2.2 用于目标尺寸、pointer cancellation、reflow、非颜色信息与状态语义校准。

这些标准只用于产品合同，不是代码或素材来源。后台恢复后不追赶丢失 tick 是本项目自己的规则选择。项目采用的 `≥44×44 CSS px` 是比 WCAG 2.2 AA 最低目标更严格的项目 Gate，不代表完整 WCAG 认证。

## ImageGen 设计过程资产

完整 prompt、处理链、有限权利说明和淘汰记录见 [`docs/assets/shadow-duet/GENERATION.md`](../../../docs/assets/shadow-duet/GENERATION.md)。

- 工具：OpenAI 内置 `image_gen`
- 具体模型/版本：工具结果未暴露，不猜测
- 生成日期：2026-07-24
- 第三方图片、截图、照片、字体、Logo、角色与品牌输入：无
- 引用链：S2–S16 只引用本轮先前生成的 S1 或状态变体
- 后处理：没有裁切、重采样、压缩、修图或去背景；从生成目录逐字节复制
- 运行状态：全部为 docs-only，视觉方向仍等待用户确认

| ID | 文档文件 | 尺寸 | 字节 | 输入引用 | SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| S1 | `s01-desktop-intro.png` | 1504×1046 | 2,469,323 | 无 | `67e07971c73c26116f13f14d94b9f81b0e0eb248afb81778fd01ff84174dc3fd` |
| S2 | `s02-desktop-scene-intro.png` | 1504×1046 | 2,325,224 | S1 | `b4a01086f9444cfc7505a137cca527dfa7be69fca461125861879c8ab22cb672` |
| S3 | `s03-desktop-dancing-ready.png` | 1586×992 | 2,347,546 | S1/S2 | `0ff4e2596f06ee27931a3ee1ef02500f143443e5b8931b0bf7eb67db83491d71` |
| S4 | `s04-desktop-dancing-window.png` | 1586×992 | 2,360,372 | S3 | `8e79971cd9af91310d561bd910b161494a21d083c2b4bffe1a556be5da56ff93` |
| S5 | `s05-desktop-pose-result.png` | 1586×992 | 2,470,765 | S4 | `9e885f13700693f5f3bac4a1c82a294677803819e280380d94d53f081872f829` |
| S6 | `s06-desktop-missed.png` | 1586×992 | 2,265,956 | S4 | `464a1c38fef80d346bfdf7f57610cf0f4fca94b382e84f6b1145c8bb12e61c73` |
| S7 | `s07-desktop-act-result.png` | 1503×1046 | 2,416,421 | S5 | `a72e76847605da4cfc2411ea65ce69ebf280bc1803afa7c166dc9d784cc0a9d2` |
| S8 | `s08-desktop-complete.png` | 1503×1046 | 2,395,379 | S7 | `a9c32b35a3adfb77f7419d95bd1dd5390067ab7c300a5b47480b84f365b800f9` |
| S9 | `s09-mobile-dancing-window.png` | 852×1846 | 2,339,156 | S4 | `b23156427245471c772c94e700c4707bd76f6b02ca76616c2c6c5950ad0e3c70` |
| S10 | `s10-mobile-complete.png` | 852×1846 | 2,336,006 | S8 | `cf1faffc0a4afd2214f601eab4a84933b42960409815a4aa9a7ad604fee18220` |
| S11 | `s11-narrow-missed.png` | 941×1672 | 2,451,287 | S6/S9 | `51a94792e44686ad55b2319df6add545731b7f3b1c1bf9f63a3cd3ef53390feb` |
| S12 | `s12-narrow-no-js.png` | 941×1672 | 2,383,056 | S1/S11 | `eab8f39cce716badbcfb7c77f99d61c775d0ba8eac803ad33005e13b4fe5bc6f` |
| S13 | `s13-landscape-dancing-window.png` | 1844×853 | 2,367,067 | S4 | `b06116242d57e25858da9aa3b61700a003b4f20e46d47df516a939e5d7e55495` |
| S14 | `s14-reduced-motion-dancing-window.png` | 1586×992 | 2,608,629 | S4 | `2420b77fdd504e92c0ca8d74924ee1b3d5ef5ba8b0fc2137db504cc3b2023543` |
| S15 | `s15-forced-colors-dancing-window.png` | 1586×992 | 837,011 | S4 | `c46e52160239c38796f3b623553a2e7d5acf9157f9012d47b3beef7648102028` |
| S16 | `s16-image-blocked-dancing-window.png` | 1586×992 | 1,911,142 | S4 | `49d2ed7f6622b4f6d4b1af04e3bc4c1d16911e4f5b426283cca2208ef55a7623` |

这 16 张 PNG 不复制到 experience 目录；生产不读取、fetch、preload、link 或将其作为 CSS background。H1、目标、姿势、稳定数、按钮、记录、摘要、结语与动作都必须是原生 HTML。

若未来生成 `paper-stage-bg.webp` 或 `shadow-duet-poses.png`，必须从空白资产 prompt 独立生成，建立新的生产资产台账、许可/来源声明、哈希、格式和失败降级；不能从完整概念截图裁切，也不能沿用 docs-only 结论。
