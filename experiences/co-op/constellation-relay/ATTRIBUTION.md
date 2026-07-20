# 借鉴与来源声明

## 独立实现边界

“把星光，一笔一笔交给你”的规则、9 个虚构点位、10 根目标边、四条完整路径、整数几何、后缀求解、状态机、配置、测试、HTML、CSS、SVG 表现层、键盘与 Pointer 适配、中文文案和界面均由本仓库独立实现。

运行时不包含第三方代码、算法实现、测试、数据集、天文坐标、星座名称、DOM、样式、图片、音频、字体、文案、依赖包或许可证副本。以下固定来源只用于研究抽象机制；没有文件被复制、改写、打包或在运行时加载。

## 固定研究来源

| 项目 | 固定版本、许可证与版权 | 仅研究的抽象点 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [remarkablegames/cross-link](https://github.com/remarkablegames/cross-link/tree/97e2d01b2b27371c4f09763563be358c15197faf) | tag `v1.0.0` / commit `97e2d01b2b27371c4f09763563be358c15197faf`；MIT；Copyright © 2026 Menglin “Mark” Xu | 星点点击、连线次序影响后续、星座作为点线谜题叙事 | 源码、Kaplay/Vite 架构、关卡、点位、UI、动画、音频、素材与“交叉消除”规则；其玩法鼓励交叉，本作恰好相反 |
| [mikolalysenko/robust-segment-intersect](https://github.com/mikolalysenko/robust-segment-intersect/tree/cbf20e2abbb22bda5b7919823f58c856ab6ac403) | commit `cbf20e2abbb22bda5b7919823f58c856ab6ac403`；MIT；Copyright © 2013 Mikola Lysenko | 封闭线段相交、端点与共线边界需要显式测试 | `segseg.js`、`robust-orientation` 依赖、控制流、测试数据和包结构 |
| [paperjs/paper.js](https://github.com/paperjs/paper.js/tree/92775f5279c05fb7f0a743e9e7fa02cd40ec1e70) | commit `92775f5279c05fb7f0a743e9e7fa02cd40ec1e70`；MIT；Copyright © 2011–2020 Jürg Lehni & Jonathan Puckey | 输入、几何规则和渲染层分离；相交结果结构化表达 | PaperScript、Curve/PathItem 算法、API、Canvas/SVG 抽象、示例、测试和视觉 |
| [networkx/networkx](https://github.com/networkx/networkx/tree/e6dda2927abffecb7f5328b0905331bb158c6cfb) | commit `e6dda2927abffecb7f5328b0905331bb158c6cfb`；BSD-3-Clause；Copyright © 2004–2026 NetworkX Developers；许可证列出 Aric Hagberg、Dan Schult、Pieter Swart | Euler 路径“每条边恰好一次”、连通与奇度点检查 | Python 实现、图容器、装饰器、迭代器、测试和文档表述 |
| [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial/tree/7e720a3de062059d4c5400a379146a601d9010e0) | commit `7e720a3de062059d4c5400a379146a601d9010e0`；BSD-3-Clause；Copyright © 2015 Olaf Frohn | 星点、连线拓扑、标签与样式分别作为数据层 | 天文坐标、真实星座数据、名称、边界、投影、D3 实现、样式与全部 `data/` |

许可证和版权信息由 [`../../../docs/166-constellation-relay-research.md`](../../../docs/166-constellation-relay-research.md) 中的固定版本核验记录提供。若未来实际复用任何来源代码，必须先停止当前“零复制”路径，记录文件级范围并按许可证保留版权与许可文本。

## 明确排除：Vanta.js

[Vanta.js](https://github.com/tengbao/vanta) 虽采用 MIT 许可证，但依赖 WebGL/Three.js 或 p5.js；随机动态背景和额外效果来源不符合本作品确定性的 A 级轻 HTML 边界。本作不复制或引入其 NET 效果、着色器、粒子布局、参数、画廊视觉、源码或依赖。

## OpenAI ImageGen 资产

两张生产图片均由 OpenAI 内置 ImageGen 于 2026-07-21 根据纯文字提示生成，没有输入第三方参考图、开源截图、商业素材、字体、角色或照片。

| 本地文件 | 尺寸 | SHA-256 | 用途与生成边界 |
| --- | ---: | --- | --- |
| [`assets/observatory-console-background.png`](./assets/observatory-console-background.png) | 1586×992 RGB PNG | `077022eef9197b4ea1aa6fed89775b6aa3cb16c1943f7f83859095953a95da63` | 哑光暗梅/石墨观测台材质；中央 75% 安静，不含运行时星点、线路、插孔、文字、UI 或答案 |
| [`assets/completion-keepsake.png`](./assets/completion-keepsake.png) | 1448×1086 RGB PNG | `55802680a4ab40a33e2ce52e6dba730e8c89e5e43b2d8998d30a8a189ffbb64b` | 严格 9 点 10 线双翼星鸢终局氛围图；只作完成纪念，不是规则真相 |

运行 UI 不从概念图裁切。9 个按钮、10 根目标线、已接线路、席位、进度、错误、日志、焦点和答案全部由 HTML/CSS/SVG 根据权威状态表达。图片加载失败时，页面回退到纯色面板，完整玩法仍可继续。

概念、源稿、运行时副本、尺寸、哈希和生成提示摘要详见 [`../../../docs/168-constellation-relay-design.md`](../../../docs/168-constellation-relay-design.md) 与 [`assets/README.md`](./assets/README.md)。
