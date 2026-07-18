# 「在雾上，写给你」借鉴与素材声明

## 原创实现

本作品的双阶段玩法、状态机、锚点完成规则、页面结构、文案组织、Canvas 绘制、视觉样式、响应式布局、测试与交互适配均为本仓库独立原创实现。

运行时不包含第三方 JavaScript/CSS 包，不从 CDN、字体站、分析服务或其他网络地址加载内容。以下开源项目和平台规范只用于研究公开技术思想与能力边界，不是运行依赖。

## 开源项目研究参考

- [Signature Pad](https://github.com/szimek/signature_pad/tree/b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb)，tag `v5.1.3`，commit `b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb`，MIT License，Copyright 2018 Szymon Nowak。仅研究 Canvas 手写、桌面/移动输入、DPR、resize 后重绘和点组边界。
- [perfect-freehand](https://github.com/steveruizok/perfect-freehand/tree/f56f097e0e211fffa1601b93883e4d9f9dccf122)，tag `v1.2.3`，commit `f56f097e0e211fffa1601b93883e4d9f9dccf122`，MIT License，Copyright 2021 Stephen Ruiz Ltd。仅研究输入点、压力与可渲染笔迹轮廓的技术边界。
- [Fabric.js](https://github.com/fabricjs/fabric.js/tree/723838fcbb9feaa87c8840082640de2ed82383da)，commit `723838fcbb9feaa87c8840082640de2ed82383da`，MIT License，Copyright 2008–2015 Printio、2016–present Fabric.js contributors。仅用于确认完整 Canvas 对象模型、笔刷、导入导出能力的依赖上限。
- [Paper.js](https://github.com/paperjs/paper.js/tree/c1d88390d2c86901db152827fe778c3e39cfb073)，tag `v0.12.18`，commit `c1d88390d2c86901db152827fe778c3e39cfb073`，MIT License，Copyright 2011–2020 Jürg Lehni & Jonathan Puckey。仅用于确认路径、向量图形和 scene graph 的依赖上限。

本作品没有复制或移植上述项目的源码、类、函数、API、算法实现、参数、测试、示例、图片、GIF、字体、页面结构、文案或构建产物，也没有把其许可证扩展解释为对仓库内素材的授权。

## 平台规范研究参考

- [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)，commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`：仅研究 `pointerId`、pointer capture、coalesced events 与取消语义。
- [W3C UI Events code](https://github.com/w3c/uievents-code/tree/b201684d1de0af90bc403814bbdee6aa96647130)，commit `b201684d1de0af90bc403814bbdee6aa96647130`：仅研究物理键标识和键盘事件边界。
- [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)，commit `56674fb3ac40279141a202e5d19b84f30d99854d`：仅研究 Canvas 与 `requestAnimationFrame` 平台行为。
- [Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)，commit `8ca533c744e655b8340b5713d1bd5ea97b202b13`：仅研究页面隐藏时的生命周期处理。
- [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)，commit `07123b871c103268375880980fd715b2b26b2ff0`：仅研究键盘等价入口、焦点、状态播报和目标尺寸。
- [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)，commit `c7573530343759ace8e46438a1fa2c44515b5554`：仅研究 `prefers-reduced-motion` 与 forced colors。

没有复制规范文字、IDL、示例代码或规范站点视觉。相关规范各自适用其发布方的软件/文档许可；本项目不把这些参考描述为代码来源。

## ImageGen 素材

- `assets/window-evening.jpg`：由 OpenAI ImageGen 于 2026-07-19 为本项目生成。
- 生成时没有输入第三方图片、截图、商标或受保护角色；完整生成提示词和筛选过程记录在 `docs/114-fog-window-letter-design.md`。
- 运行时只使用这张本地窗外夜景底图；`design/fog-window-letter/` 下三张概念图仅用于设计验收，不随体验加载。
- `assets/favicon.svg` 为本项目独立绘制的简单矢量图标。

## 明确排除的无许可证项目

- [sebnozzi/minimicro-foggywindow](https://github.com/sebnozzi/minimicro-foggywindow/tree/1821f892ec828c57ef28a95d4fd18190bc198d60)，commit `1821f892ec828c57ef28a95d4fd18190bc198d60`：固定版本没有许可证。没有使用其 Mini Micro 源码、遮罩实现、图片、文案、参数或页面。
- [negi141/pittura-demo](https://github.com/negi141/pittura-demo/tree/a9227e689eb1b1060f2f7b6b4a19b579b1e942d1)，commit `a9227e689eb1b1060f2f7b6b4a19b579b1e942d1`：固定版本没有许可证。没有使用其 Three.js 代码、图片、GIF、页面或文案。

公开可见的仓库不等于获准复制；上述无许可证项目只帮助确认“雾面与清晰层”这一抽象题材已经存在，不构成本作品的代码或素材来源。

## 与刮刮卡实现的区别

本作品不按擦除面积、Canvas alpha 像素或图像相似度判定完成。唯一权威规则是：先从用户原创笔迹生成确定性锚点，再检查第二次路径命中的锚点数量；达到五分之四才完成。Canvas 遮罩只呈现状态，不拥有业务真相。

如果未来实质引入任何第三方代码或素材，必须在独立变更中保存对应许可证与版权声明，并重新执行离线、隐私、浏览器和权利验收。
