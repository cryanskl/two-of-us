# “蜜径相逢”借鉴与来源声明

“蜜径相逢”是为本仓库独立设计和实现的本地双人六角格竞速游戏。本文件先锁定
批次一的调研边界；当前目录没有引入任何第三方运行时依赖、源码或素材。

## 调研来源

| 来源 | 固定版本与许可证 | 本作借鉴 | 明确未借鉴 |
| --- | --- | --- | --- |
| Amit Patel, [Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/) 与 [Implementation of Hex Grids](https://www.redblobgames.com/grids/hexagons/implementation.html) | 网页标注 2013–2026；作者说明配套代码采用 MIT 或 Apache-2.0，具体网页内容 © Red Blob Games | 仅核对轴坐标、六邻接和把蜂巢视为图的公开教学概念 | 未复制网页文字、公式排版、交互图、示例代码、视觉样式或资源 |
| [flauwekeul/honeycomb](https://github.com/flauwekeul/honeycomb/tree/6353276ef8197fbdba60d0c964f7bd4f2169064c) | commit `6353276ef8197fbdba60d0c964f7bd4f2169064c`；MIT；Copyright © 2017 Abbe Keultjes | 仅核对坐标、网格和渲染职责可以分离的工程边界 | 未安装依赖，未复制其 API、源码、类型、测试或示例 |
| [tridpt/TwoPlayerGames 的 Hex](https://github.com/tridpt/TwoPlayerGames/blob/c96b802232d87d58408ed653dcbe43c0a68611f6/js/games/hex.js) | commit `c96b802232d87d58408ed653dcbe43c0a68611f6`；MIT；Copyright © 2026 tridpt | 仅作为反例确认“双方落子连接对边”是不同作品方向 | 未复制连边规则、邻接常量、寻路实现、DOM、CSS、文案或资源 |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C Recommendation，2024-12-12；W3C Document License 2023 | 为后续键盘、焦点、状态消息和目标尺寸验收提供标准基线 | 未复制规范示例代码或视觉样式 |

## 独立实现边界

本批次的坐标正规化、棋盘生成、邻接、BFS、配置清洗、输入防御、测试和文案均在
本仓库独立编写。调研阶段阅读了 TwoPlayerGames 的 Hex 实现以核对机制差异，但
没有从上述项目提取、复制、改写或打包生产源码、测试、CSS、图片、字体、音频或
品牌元素。

当前计划继续保持“零代码、零素材复制”。如果后续实际引入任何 MIT、Apache-2.0
或其他许可内容，必须在合并前更新本文件，列出准确文件、版权声明、许可证和改动
范围；不能沿用当前的零复制结论。
