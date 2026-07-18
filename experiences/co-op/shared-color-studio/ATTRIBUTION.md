# 借鉴与来源声明

「把颜色调到一起」的运行时 HTML、CSS、JavaScript、配置、状态机、测试、中文文案、离散坐标与视觉均为本仓库独立实现。下列材料只用于研究抽象机制、可访问性和许可证边界；没有复制、修改、链接或引入它们的代码、算法、CSS、依赖、题面、图像、字体或文案。

## 研究过的开源项目

### Colorfle

- 项目：[`horushe93/colorfle`](https://github.com/horushe93/colorfle/tree/9f7b45e530489bf2459f68356b79b357ee49e54c)
- 固定提交：`9f7b45e530489bf2459f68356b79b357ee49e54c`
- 许可证：[CC BY-NC 4.0](https://github.com/horushe93/colorfle/blob/9f7b45e530489bf2459f68356b79b357ee49e54c/LICENSE.md)
- 研究用途：比较“目标色—操作—反馈”的抽象回路。
- 未采用：代码、算法、界面、配比、题面、文案与素材。其 README、许可证与包元数据存在非商业、proprietary、ISC 等不一致表达，因此尤其不作为代码来源。

### RGB Color Matching Game

- 项目：[`jsskrh/color-matching-game`](https://github.com/jsskrh/color-matching-game/tree/ad9bcebc86a8fe6388686858601a04f4a88b08ed)
- 固定提交：`ad9bcebc86a8fe6388686858601a04f4a88b08ed`
- 许可证：[MIT](https://github.com/jsskrh/color-matching-game/blob/ad9bcebc86a8fe6388686858601a04f4a88b08ed/LICENSE)，作者 Jesse Akorah。
- 研究用途：比较明确目标值、文字反馈与纯静态直开边界。
- 未采用：DOM、CSS、随机题目、颜色数据与代码。

### Coloris

- 项目：[`melloware/Coloris`](https://github.com/melloware/Coloris/tree/c677d8cd2123bc1e24099bb81468934d5a05172f)
- 固定提交：`c677d8cd2123bc1e24099bb81468934d5a05172f`
- 许可证：[MIT](https://github.com/melloware/Coloris/blob/c677d8cd2123bc1e24099bb81468934d5a05172f/LICENSE)，Copyright © 2021 Mohammed Bassit。
- 研究用途：比较原生颜色控件的键盘、格式与可访问性边界。
- 未采用：库、源码、CSS、主题与依赖；完整取色器也会破坏本作的双人分工。

### ColorPredictionGame

- 项目：[`kartikchorasiya/ColorPredictionGame`](https://github.com/kartikchorasiya/ColorPredictionGame/tree/eb34ac1dc7dc27fdb9d3bf529e988bf6fcac4deb)
- 固定提交：`eb34ac1dc7dc27fdb9d3bf529e988bf6fcac4deb`
- 许可证：该固定提交根目录没有 `LICENSE` 或 README 授权。
- 研究用途：比较单 HTML 色彩识别体验的本地直开形式。
- 未采用：全部源码、布局、命名、颜色和交互。无许可证不等于可以自由复制。

## 标准依据

- [W3C CSS Color 4](https://www.w3.org/TR/css-color-4/)：用于确认 Oklab/OkLCh 术语与 HSL 的感知局限；未复制规范示例代码，也不声称专业校色或 ΔE 测量。
- [WCAG 2.2：Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)：用于确保颜色不是唯一的信息通道。
- [WCAG 2.2：Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：用于阶段状态的 live region 设计。
- [WCAG 2.2：Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：用于确定触摸目标下限。
- [W3C Pointer Events](https://www.w3.org/TR/pointerevents/)：用于 Pointer 生命周期与 `touch-action` 边界。

这些规范仅作为标准依据；任何规范示例代码都没有进入运行时。

## 原创资产

- `assets/pigment-table.webp`：2026-07-18 使用内置 ImageGen 生成的无字、无 UI 深墨纸上调色桌背景；没有输入、临摹或编辑第三方项目截图与素材。
- `assets/favicon.svg`：本仓库原创矢量图标，表示两滴颜料汇入同一张色笺。
- 背景加载失败时，页面使用纯 CSS 深墨底色与低对比纹理；核心玩法不依赖图像。
