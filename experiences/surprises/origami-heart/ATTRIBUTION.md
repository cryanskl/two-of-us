# “沿着折痕，折到你心里”借鉴声明

## 原创与生产边界

本作品的五道网页折痕、归一化手势、严格前缀状态机、主动翻面、阶段隐私、中文文案、HTML 结构、CSS 纸张、代码原生心形、测试与响应式实现均为本仓库独立原创。

生产实现没有复制、改写、翻译、链接、打包、vendoring 或依赖下列项目的源码、CoffeeScript、CSS、API、数学、常量、示例、测试、SVG、图片、GIF、字体、图标、文案、页面结构或构建产物。运行时为零第三方代码、零第三方素材、零远程资源。

## 固定开源研究来源

### joumorisu/CSS-Origami

- 固定版本：[commit `2b25ed2f7e7162eb3234fda1093617f4f7134c03`](https://github.com/joumorisu/CSS-Origami/tree/2b25ed2f7e7162eb3234fda1093617f4f7134c03)
- 许可证：[MIT LICENSE](https://github.com/joumorisu/CSS-Origami/blob/2b25ed2f7e7162eb3234fda1093617f4f7134c03/LICENSE)
- 许可证 SHA-256：`a4dcc29992c5879066e457d3bb2540a194d5334620b1882450c332fdb9602f42`
- 权利主体：Copyright (c) 2017 Joseph
- 只研究：多个 DOM 平面、`transform-origin` 与遮挡次序能够表达折叠感；2D 内容与折叠表现可以分层；没有动画时仍应存在可读稳态。

### dmotz/oriDomi

- 固定版本：[commit `f90830504d6843dfdf5b72d873c01cd716538485`](https://github.com/dmotz/oriDomi/tree/f90830504d6843dfdf5b72d873c01cd716538485)
- 许可证：[MIT LICENSE](https://github.com/dmotz/oriDomi/blob/f90830504d6843dfdf5b72d873c01cd716538485/LICENSE)
- 许可证 SHA-256：`8588b3379ce3245f3753bd31e463bd334b9b7301a3e796450ac723ca42093e5e`
- 权利主体：Copyright (c) 2014 Dan Motzenbecker
- 只研究：折叠表现需要清晰的初始化、更新、重置与销毁边界；表现 API 不应成为业务状态。

## 明确排除

- [`rabbit-ear/rabbit-ear`](https://github.com/rabbit-ear/rabbit-ear)：GPL-3.0；本作不需要真实折纸几何、FOLD 数据或 Canvas 引擎，不复制、不依赖。
- [`raphamorim/origami.js`](https://github.com/raphamorim/origami.js)：GPL-3.0；不复制、不依赖。
- `mangaslave/HeartOrigami`：未发现清晰仓库级许可证，不作为可复制来源。
- `hannahapuan/shetech-origami-heart`：建立在 GPL 折纸库之上，不进入生产实现。

CodePen、短视频、博客图解、商业折纸书与品牌贺卡只用于发现候选，没有复制步骤图、折线图、照片、文案、版式或 trade dress。本作的五步网页仪式不声称对应某个传统折纸模型。

## Web 平台规范

以下规范只用于确认浏览器能力和降级边界；没有复制其规范文字、IDL、示例或站点视觉：

- [CSS Transforms Level 1](https://www.w3.org/TR/css-transforms-1/)：二维 transform 与 `transform-origin`。
- [CSS Transforms Level 2](https://www.w3.org/TR/css-transforms-2/)：可选 3D transform、perspective、`transform-style` 与 `backface-visibility`。
- [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)：统一 Pointer、capture、`pointercancel` 与 `lostpointercapture`。
- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)：`prefers-reduced-motion`。
- [CSS Color Adjustment Level 1](https://www.w3.org/TR/css-color-adjust-1/)：`forced-colors`。
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：键盘等价、拖动替代、回流、目标尺寸、焦点与状态消息。

## 视觉资产

没有使用 ImageGen、第三方图片、系统 emoji、图标库、远程字体、音频、视频或 3D 模型。

- 页面纸张、折痕、纸纹、箭头与完成心形均由 HTML/CSS 基本形生成。
- `assets/favicon.svg` 是本仓库为本作绘制的基本几何 SVG，没有第三方输入。
- 所有运行文字均为真实 DOM 文本，不烘焙进任何图片或图标。

如果未来实质引入任何第三方代码、素材或传统折纸图解，必须另立变更，固定来源版本，并保留许可证、版权声明和改动说明。
