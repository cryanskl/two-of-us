# “软软相扑”借鉴与来源声明

## 独立原创实现

本作品的软垫主题、三键控制、固定三轮、逻辑缩圈、同 tick 原子出界、整数物理、状态机、测试、中文文案、HTML/CSS/JS 界面和生产素材均由本仓库独立原创。运行时不包含第三方代码或包，不加载 CDN、远程字体、分析、网络、存储或音频。

## 开源工程研究参考

- [SteelCantSpeak/robot_sumo](https://github.com/SteelCantSpeak/robot_sumo/tree/b10f099c613501bf11bf0d4c9e7ca238ac8e0e58)，commit `b10f099c613501bf11bf0d4c9e7ca238ac8e0e58`，MIT License，Copyright (c) 2024 Steelcantspeak。只研究方块刚体互推、平台坠落淘汰、固定 `1/60` 世界步长与视觉/物理分层；没有复制或引入其 Three.js、cannon-es、Socket.IO、CDN、服务器、控制器、页面、随机方块、占位内容或素材。
- [Matter.js 0.20.0](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da)，tag `0.20.0`，commit `8a67787735585f02c4b46eabf7b9fcc1c7c321da`，MIT License，Copyright (c) Liam Brummitt and contributors。只研究 accumulator 固定步进、检测/位置纠正/速度冲量分阶段与追帧上限；没有引入 Engine、Runner、Resolver、Bodies、API、源码、测试、示例、渲染器、文档文字或 npm 包。
- [Box2D-Lite](https://github.com/erincatto/box2d-lite/tree/227b71b6974ea57ab7e96d40f6374287bd6a0e77)，commit `227b71b6974ea57ab7e96d40f6374287bd6a0e77`，MIT License，Copyright (c) 2019 Erin Catto。只研究等质量法向冲量、恢复系数、穿透纠正与纯物理内核的教学边界；没有移植其 C++ 引擎、求解器、接触结构、变量、公式实现、示例、测试或构建。

上述项目即使允许复制，本作品仍采用零复制：没有复制、改写、翻译、移植、打包或依赖其源码、API 形状、测试、参数、页面、文案、素材或构建产物。

## 平台规范

- [W3C Pointer Events Level 3 Recommendation](https://www.w3.org/TR/2026/REC-pointerevents3-20260630/)：只用于 `pointerId`、pointer capture、`pointercancel`、`lostpointercapture` 与 `touch-action` 行为。
- [UI Events KeyboardEvent code Values](https://www.w3.org/TR/2025/REC-uievents-code-20250422/)：只用于物理键位 `KeyboardEvent.code`。
- [WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)：只用于确认 rAF 是渲染调度边界，不是权威物理时钟。
- [Media Queries Level 5](https://www.w3.org/TR/2026/WD-mediaqueries-5-20260219/)：只用于 `prefers-reduced-motion`。
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 与 [CSS Color Adjustment](https://www.w3.org/TR/css-color-adjust-1/)：只用于键盘、目标尺寸、状态播报、非颜色信息、焦点与 forced colors。

没有复制这些规范的文字、IDL、图表、示例、测试或站点视觉。

## ImageGen 概念与生产素材

三张界面概念、背景与棋子图集由 OpenAI 内置 ImageGen 于 2026-07-19 根据本项目的纯文本原创提示生成；没有输入第三方仓库截图、商业游戏界面、品牌、人物、外部照片或外部素材。

- `docs/assets/soft-sumo/desktop-playing-concept.webp`：1586×992，完整桌面进行态。采纳中央圆场、紧凑比分、左右同权控制与暖冷双席；拒绝“红方/青方”、额外得分说明、仿古书名、过密黄铜装饰和生成式文字。
- `docs/assets/soft-sumo/mobile-playing-concept.webp`：853×1844，移动层级参考。采纳标题/比分/场地/规则/两席控制顺序；拒绝超长首屏、过厚皮革面板与假蓄力条。
- `docs/assets/soft-sumo/desktop-result-concept.webp`：1586×992，桌面赛果态。采纳保留场地余韵、单一赛果纸片与唯一重开动作；拒绝错误按钮文字、生成式本地说明和花结。
- `assets/arena-background.webp`：1586×992，RGB WebP；无棋子、比分、文案、按钮或交互热区。SHA-256：`856cc458ff3443eb670e96a4b00716f52a637a372178d85bddf6aa6c04738c84`。
- `docs/assets/soft-sumo/token-atlas-chroma-source.png`：1536×1024，2 行×3 列纯 `#ff00ff` 色键源；第一行莓果、第二行海盐，列为 idle / charging / dashing。
- `assets/token-atlas.webp`：1536×1024，RGBA 无损 WebP。SHA-256：`1aa14965772288480389c4e512d0218c6da590410de2b5e8eaa938d28792221c`。
- `assets/favicon.svg`：本仓库独立绘制的双软垫轮廓，无第三方图形输入。

去背使用工作区统一脚本：

```sh
/Users/zenith/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input docs/assets/soft-sumo/token-atlas-chroma-source.png \
  --out experiences/versus/soft-sumo/assets/token-atlas.png \
  --key-color '#ff00ff' --soft-matte \
  --transparent-threshold 36 --opaque-threshold 105 \
  --edge-feather 0.6 --edge-contract 0 --spill-cleanup
```

透明 PNG 再无损转为 WebP；审计统计为 1,055,641 个完全透明像素、28,308 个部分透明边缘像素，原尺寸检查未见洋红底残留或明显缝线侵蚀。图集包含与 DOM 同步旋转的方向缺口，但方向另有 CSS 箭头与可见控制文字，图片不作为身份、方向、蓄力、比分、胜负或碰撞热区的唯一载体。

## 明确排除的无许可证案例

[AlexSalamanca/SumoBall](https://github.com/AlexSalamanca/SumoBall/tree/f5c7144dcc537df23396cce4d8b1797a825632d9) 固定 commit `f5c7144dcc537df23396cce4d8b1797a825632d9`。该仓库没有 `LICENSE`、`COPYING` 或源码许可头，并包含来源未说明的 `Fonts/Sketch3D.otf` 与 `Sounds/bounce.wav`；本作品没有复制其 JavaScript、HTML、CSS、字体、音频、数值、数组删除方式、旧 `keyCode` 输入、随机初速度或视觉。商业相扑游戏、应用商店截图、CodePen 与 itch.io 页面也不是实现来源。

## 未来变更

若未来实质复制或改编任何第三方代码或素材，必须在独立变更中附完整许可证与版权文本、修订本声明，并重新执行离线、输入、公平性、性能和浏览器验收；不能继续沿用当前“零代码/资产复制”结论。
