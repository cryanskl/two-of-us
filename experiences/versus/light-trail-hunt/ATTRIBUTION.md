# 光轨围猎：研究来源与借鉴声明

## 原创范围

本作品只研究经典 light-cycle / trail-survival 的抽象机制与公开工程取舍。以下内容均为本项目独立完成：

- 基于不可变输入日志的比赛状态机；
- 双方在同一 tick 内的原子碰撞结算；
- 六阶段 DOM、Canvas 渲染、键盘与多 Pointer 输入；
- 中文文案、午夜制图桌视觉和测试；
- `assets/board-texture.webp` 与 `assets/favicon.svg` 本地资产。

没有从下列参考项目复制代码、CSS、图片、音频、字体、模型、测试或依赖。参考项目作者未参与本作品，也未认可或背书本作品。

## 研究来源

### JDStraughan/html5-lightcycles

- 固定提交：[`b19dc25bb78f9ac7299f83193774978089ff0cc2`](https://github.com/JDStraughan/html5-lightcycles/tree/b19dc25bb78f9ac7299f83193774978089ff0cc2)
- 作者与版权：Jason D. Straughan，Copyright 2013
- 许可证：固定提交的 [README 内含 MIT License 全文](https://github.com/JDStraughan/html5-lightcycles/blob/b19dc25bb78f9ac7299f83193774978089ff0cc2/README.md)
- 研究内容：轻量 Canvas、轨迹占用和本地直开边界
- 明确未使用：代码、AI、计时器实现、样式与任何资源

### thatplatypus/LightCycle

- 固定提交：[`1d35ea0306766bbc5f4a52244ef820db431776fc`](https://github.com/thatplatypus/LightCycle/tree/1d35ea0306766bbc5f4a52244ef820db431776fc)
- 作者与版权：thatplatypus，Copyright 2025
- 许可证：[MIT License](https://github.com/thatplatypus/LightCycle/blob/1d35ea0306766bbc5f4a52244ef820db431776fc/LICENSE)
- 额外资产边界：该项目 [README 的音频清单](https://github.com/thatplatypus/LightCycle/blob/1d35ea0306766bbc5f4a52244ef820db431776fc/README.md#credits) 另含 CC BY-NC 4.0、CC BY 3.0 与 CC0 内容
- 研究内容：本地多人、暂停和触摸输入风险
- 明确未使用：SvelteKit、PixiJS、代码、音乐、音效、字体与所有其他资源

### dpren/WebGL-Tron

- 固定提交：[`7d4faa2cfa7152186924484d5bd191778babdff0`](https://github.com/dpren/WebGL-Tron/tree/7d4faa2cfa7152186924484d5bd191778babdff0)
- 作者与版权：dpren，Copyright 2015
- 许可证：[MIT License](https://github.com/dpren/WebGL-Tron/blob/7d4faa2cfa7152186924484d5bd191778babdff0/LICENSE)
- 研究内容：轨迹逐渐封锁空间的节奏
- 明确未使用：代码、Three.js、Ramda、dat.gui、字体、模型、图片、声音、影视名称与视觉资产

### patorjk/JavaScript-Snake

- 固定提交：[`68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05`](https://github.com/patorjk/JavaScript-Snake/tree/68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05)
- 作者与版权：Patrick Gillespie
- 许可证：[MIT License](https://github.com/patorjk/JavaScript-Snake/blob/68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05/LICENSE)
- 研究内容：离散网格、持续前进和占用格
- 明确未使用：代码、CSS、图片资源与 Parcel 开发依赖

## 本地资产

- `assets/board-texture.webp`：2026-07-18 为本项目生成的原创棋盘纸张纹理；不含文字、商标或第三方素材，只承担视觉背景。
- `assets/favicon.svg`：2026-07-18 为本作品手工绘制的原创矢量图标，只使用基础路径与几何形状。

上述研究来源不构成本作品的运行依赖；断网后所有功能保持可用。

