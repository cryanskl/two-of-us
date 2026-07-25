# 借鉴与来源声明

## 独立实现声明

本作的二维校准玩法、2520 整数圈模型、状态机、默认内容、Canvas 图案、DOM、
CSS 与测试由本仓库独立设计和编写。开发前置阶段、纯逻辑与生产 UI 实施都没有
参考、复制、修改、链接或打包任何第三方万花筒项目、源码、纹样、图片、字体、
图标、文案或视觉作品。两张视觉概念 PNG 只留在 `docs/` 作设计对照，不进入
运行目录，也不作为图案像素或规则来源。

本目录当前不包含第三方运行时依赖、第三方代码或第三方资产，因此没有需要随
作品再分发的第三方许可证正文、版权声明或 notice。

## 仅用于平台边界校准的一手文档

- [WHATWG HTML Standard：Canvas](https://html.spec.whatwg.org/multipage/canvas.html)
  用于确认 Canvas 2D 与 fallback 的平台边界。
- [WHATWG HTML Standard：Range state](https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range))
  用于确认未来原生离散 range 的数值合同。
- [W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)
  （W3C Recommendation，2026-06-30）用于确认触控与 Pointer 的输入边界；
  首版不实现自绘 Pointer 旋钮。
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 及 WAI 的 Keyboard、Status
  Messages、Target Size、Animation from Interactions、Three Flashes
  说明文档，用于校准键盘、状态消息、目标尺寸、动效和闪烁要求。
- [Media Queries Level 5：prefers-reduced-motion](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)
  （W3C Working Draft，2026-02-19）用于确认未来降动效的平台语义。

这些标准文档不是运行依赖、视觉来源或可复制的图案素材；本实现没有复制其中的
文本、示例代码或资产，也不再分发标准正文。W3C 文档保留其原始版权与
[W3C Software and Document License](https://www.w3.org/copyright/software-license/)
规则；这里只提供一手来源链接和独立实现的用途说明。

## 后续变更规则

如果后续生产阶段参考任何开源实现，必须先暂停实现并回到 research：固定
commit 或 tag URL，核对 LICENSE、版权人和资源单独许可证，写清实际借鉴内容与
未复制范围；若引入代码或资产，还要保留许可证要求的正文、版权和 notice。
