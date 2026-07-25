# “这一圈，和你同时到”借鉴与许可证声明

## 当前阶段

本目录包含可编辑配置、纯领域逻辑、固定 fixture、独立求解器、生产 HTML /
CSS / JavaScript、静态合同和项目测试。它以经典相对脚本和原生 DOM / SVG
运行，可直接双击 `index.html`；没有位图、字体、音频、vendor 或第三方运行
依赖。唯一独立运行图形文件 `favicon.svg` 是本项目手写的双环、六角星和菱形
几何，不含文字、logo 或第三方输入。本阶段没有修改 catalog、门户或分类索引。

公开作品名冻结为“这一圈，和你同时到”。`twin-orbit` 只作仓库内部工作 ID，
不作为公开英文产品名。

## 内部机制参考

本项目只参考了仓库内部
[`orbit-star-race`](../../versus/orbit-star-race/README.md) 的一个高层抽象：

> 离散半径状态可以选择不同角速度。

这是机制边界参考，不是代码复用。本目录没有复制、修改、翻译、链接或打包
`orbit-star-race` 的源码、常量、连续角速度、三轨结构、反向运动、随机星流、
比分/加赛、测试、界面、文案、图片或其他资产。

`twin-orbit` 独立定义同向双星、外轨每 tick 前进 2 格、内轨每 tick 前进 3 格、
五组固定双门、共同开门窗口、同 tick 原子裁决、暂停 epoch、配置合同、fixture
与测试。

## 外部来源与依赖

当前实现：

- 外部开源项目直接借鉴：0；
- 第三方运行依赖：0；
- 第三方开发依赖：0 个项目级新增；
- 第三方代码、算法、测试、素材、字体、音频、图标或资产：0；
- 网络、服务、storage、权限、Canvas 和真实时钟规则依赖：0；
- 生产视觉：原生 HTML / CSS / SVG，无第三方运行资产。

W3C、WHATWG 与 WAI 文档只用于前置规格中的键盘、Pointer、页面可见性、动画帧
和无障碍边界，不是本核心的运行依赖、代码来源或素材来源。固定依据为：

- [UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/)
  （W3C Recommendation，2025-04-22）；
- [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)
  （W3C Recommendation，2026-06-30）；
- [WHATWG HTML Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)
  与 [Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)
  （Living Standard）；
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
  （W3C Recommendation，2024-12-12）。

W3C 页面保留 World Wide Web Consortium 的原始版权及各页链接的
[Software and Document License](https://www.w3.org/copyright/software-license/)
或 [Document License](https://www.w3.org/copyright/document-license/)；
WHATWG Living Standards 保留 WHATWG 及其 Steering Group 成员版权，并按
[WHATWG IPR Policy](https://whatwg.org/ipr-policy) 的 CC BY 4.0 条款发布。

本目录没有复制或改写这些标准的正文、Web IDL、示例代码、表格、图表、测试或
站点视觉，也不再分发标准正文；这里只保留一手链接、状态和独立实现用途。

## 视觉概念与生产资产

`docs/assets/twin-orbit-desktop-playing-concept.png` 和
`docs/assets/twin-orbit-mobile-playing-concept.png` 是 2026-07-25 使用 Codex
内置图像生成工具创建的 docs-only 概念图。桌面概念无图片输入；移动概念只以
本次内部生成的桌面概念维持组件语言；第三方图片输入为 0。

生产页面没有引用、复制、裁切或描摹这两张 PNG。页面标题、双环、离散刻度、
星标、门位、共同窗口、控件、焦点和状态均由本项目代码原生生成。概念图不是
运行依赖、规则真值或可交互图层。

直接外部开源视觉参考为 0；没有引入第三方图片、字体、图标、音频、纹理、logo
或品牌视觉。

完整来源、名称和证据边界见
[`docs/307-twin-orbit-attribution-dependency-audit.md`](../../../docs/307-twin-orbit-attribution-dependency-audit.md)。

若后续实际打开、复制、修改、引入或分发任何第三方代码或资产，必须先暂停实现，
固定来源版本、许可证、版权人、实际借鉴和再分发义务，再更新本声明。
