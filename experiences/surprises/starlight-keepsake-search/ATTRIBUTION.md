# 「把夜晚照成我们」借鉴与素材声明

## 独立原创实现

本作品的连续停留发现机制、五目标地图、整数状态机、输入接管、完成规则、页面、文案、测试、Canvas 投影与视觉系统均为本仓库独立原创实现。

运行时不包含第三方 JavaScript/CSS 包，不加载 CDN、远程字体、分析服务或其他网络内容。以下工程和平台规范只用于研究公开技术能力与依赖上限，不是运行依赖，也不是本项目代码或素材的来源。

## 开源工程研究参考

- [PixiJS](https://github.com/pixijs/pixijs/tree/2c5818b0e75b835ba5980844136b10cbdc3982a9)，tag `v8.18.0`，commit `2c5818b0e75b835ba5980844136b10cbdc3982a9`，MIT License，Copyright 2013–2023 Mathew Groves、Chad Engler。仅研究 WebGL/WebGPU/Canvas 2D 渲染、mask、blend mode 与多输入能力上限。
- [PixiJS Filters](https://github.com/pixijs/filters/tree/e9d1ca987864f121680bb0d7e9612c05b37748de)，tag `v6.1.5`，commit `e9d1ca987864f121680bb0d7e9612c05b37748de`，MIT License，Copyright 2013–2025 Mathew Groves、Chad Engler。仅研究 lightmap、glow、blur 与滤镜链的依赖上限。
- [Konva](https://github.com/konvajs/konva/tree/ae5bbf7181d0201466045afbbab2297c8ffa7b90)，tag `v10.3.0`，commit `ae5bbf7181d0201466045afbbab2297c8ffa7b90`，MIT License；KineticJS Copyright 2011–2013 Eric Rowell，Konva Copyright 2014–present Anton Lavrenov。仅研究 Canvas 分层、独立 shape、事件与缓存对象模型的能力上限。
- [Phaser](https://github.com/phaserjs/phaser/tree/7304c64effaa4a1be5b8bf02ab13143a76108a19)，tag `v4.1.0`，commit `7304c64effaa4a1be5b8bf02ab13143a76108a19`，MIT License，Copyright 2026 Richard Davey、Phaser Studio Inc.。仅研究 2D lights、场景、input、ticker 与完整游戏框架的依赖上限。

本作品没有复制、改写、翻译、移植、打包或依赖上述工程的 renderer、scene graph、API、shader、滤镜、参数、源码、测试、模板、demo、文档示例、图片、字体、图标、音效、bunny 素材或构建产物。

## 平台规范研究参考

- [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)，commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`：仅研究 `pointerId`、capture、cancel 与多输入生命周期。
- [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)，commit `56674fb3ac40279141a202e5d19b84f30d99854d`：仅研究 Canvas 2D compositing、gradient 与 animation frame。
- [Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)，commit `8ca533c744e655b8340b5713d1bd5ea97b202b13`：仅研究页面隐藏时冻结输入与累计时间。
- [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)，commit `07123b871c103268375880980fd715b2b26b2ff0`：仅研究键盘等价入口、焦点、状态播报和目标尺寸。
- [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)，commit `c7573530343759ace8e46438a1fa2c44515b5554`：仅研究 `prefers-reduced-motion` 与 forced colors。

没有复制规范文字、IDL、示例代码或规范站点视觉。相关规范各自适用其发布方的软件/文档许可；本项目不把这些参考描述为代码来源。

## ImageGen 素材与输入链

- `assets/keepsake-night.jpg`：由 OpenAI 内置 ImageGen 于 2026-07-19 为本项目生成，最终原生尺寸 1586×992。
- 首张桌面 searching 概念没有图像输入；移动 focusing、桌面 complete 和首张生产背景只引用同批桌面概念，以保持本项目内部一致。
- 最终生产重排只引用同批首张生产背景；没有输入第三方仓库截图、商业产品界面、受保护角色、商标、外部照片或外部素材。
- 接受的 PNG 使用 macOS 自带 `sips` 以 JPEG quality 88 转为 `assets/keepsake-night.jpg`，未安装图像处理依赖。
- `design/starlight-keepsake-search/` 下三张概念图只用于设计验收，不随体验加载；运行时只加载 `assets/keepsake-night.jpg`。
- `assets/favicon.svg` 是本项目独立绘制的简单矢量图标。

图片只提供旧木桌、空白车票、双杯、即时照片、钥匙与窗边星光的视觉背景。目标坐标、命中、连续停留、发现顺序、进度和秘密文案均由代码/DOM 定义，不读取图片像素。

## 明确排除的无许可证或权利不清来源

- [CodeMyUI “Reveal Hidden Text” Gist](https://gist.github.com/CodeMyUI/7437e28015756952119afa96a979152c)：页面没有清晰独立许可证；没有使用其实验源码、文字、动画、参数或页面结构。
- [jaredstanley/globalCompositeOperation Gist](https://gist.github.com/jaredstanley/260b5ac5690b6280138212808aa93549)：未见独立许可证；直接以 WHATWG 标准为能力真源，没有复制该 Gist 的 API 列表或代码。
- Reddit、CodePen 与博客中的 “flashlight effect” 示例常缺少代码或图片许可证，或依赖远程资源；没有使用其实现、参数、页面或素材。
- 商业找物、密室与手电游戏只证明空间搜索是成熟品类；没有复制其关卡、物件、热区、品牌、音效、界面、提示、计分或美术。

公开可见、能运行或带教程说明不等于获准复制。即使某段代码使用宽松许可证，也不能推定其中背景照片、图标、字体、音频、关卡与文案适用相同授权。

## 零复制与未来变更

本作品只采用公开、抽象的 Canvas 分层、柔光、Pointer 生命周期、固定 tick 和无障碍等价入口思想；实现没有复制第三方源码、API 形状、算法实现、shader、参数、测试、demo、模板、素材、字体、页面结构、文案或构建产物。

如果未来实质复制或改编任何第三方代码或素材，必须在独立变更中保存对应许可证与版权文本，并重新执行离线、隐私、性能、阶段秘密和浏览器验收，不能继续沿用本声明中的“仅研究、零复制”结论。
