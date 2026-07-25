# Snow Globe Message 借鉴与授权声明

## 本项目的实现边界

`snow-globe-message` 的生产实现为本仓库独立编写的本地 JavaScript 状态机。当前仅借鉴下列项目或标准中的抽象设计原则，没有复制其源代码、配置、默认参数、示例、素材或构建依赖。

运行时不加载网络资源，不使用设备方向、加速度或其他传感器，不依赖第三方库。九行十一列、共 63 个点的图案数据由本项目独立定义，没有从参考截图或生成图片中采样、描摹或转换。

## 正式参考来源

### tsParticles

- 仓库：https://github.com/tsparticles/tsparticles
- 固定版本：`627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59`
- 许可证：MIT
- 版权所有：Copyright (c) 2020 Matteo Bruni
- `LICENSE` SHA-256：`c5c18dbc27f490f2ef90e0b574b8c40f534e495d2cb8a6f1c4bb1183a9c381a4`
- 借鉴范围：将粒子视为表现层状态，并为动画统一设计停止与清理入口。
- 未使用：雪花预设、API、配置结构、默认值、插件、示例及依赖。

### canvas-text-particle

- 仓库：https://github.com/dango0812/canvas-text-particle
- 固定版本：`9ee144a548aad85275318b30891c71dcf6e10f7b`
- 许可证：ISC
- 版权所有：Copyright (c) 2026, dango0812
- `LICENSE` SHA-256：`2a9fec8f93f07847a22029d5c423e33e0839da09d516664e5f0608346c03a122`
- 借鉴范围：为展示粒子分配稳定 ID，并映射到确定的目标点。
- 未使用：离屏文字 Canvas、字体采样、点位公式、源代码、样式、素材及构建配置。

### canvas-confetti

- 仓库：https://github.com/catdad/canvas-confetti
- 固定版本：`20eebad51dde793070c373d594099a7ed8d96e22`
- 许可证：ISC
- 版权所有：Copyright (c) 2020, Kiril Vatev
- `LICENSE` SHA-256：`fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a`
- 借鉴范围：在“减少动态效果”模式下保持相同的逻辑结果，并确保动画资源可清理。
- 未使用：物理算法、Worker、Promise 封装、参数、形状、颜色、源代码、示例及素材。

### W3C Device Orientation and Motion

- 规范仓库：https://github.com/w3c/deviceorientation
- 固定版本：`70d42d5484db7fd1646e48cc17caa5ff1c9d92cb`
- 许可证：W3C Software and Document License 2023
- 版权所有：Copyright © 2023 World Wide Web Consortium
- `LICENSE.md` SHA-256：`cd28c5af6bf84d8612db3094498d59f66e59468dc645b9e8e70e9d1b377bdf3a`
- 借鉴范围：核对传感器权限和隐私边界，并据此决定完全不使用传感器。
- 未使用：规范示例、文字和代码。

## 标准参考

交互设计同时参考 Pointer Events Level 3 与 WCAG 关于拖动操作、动态效果、减少动态效果和页面回流的要求。这些标准只用于可访问性与输入方式决策，不构成代码或资产来源。

## 明确排除的候选来源

### shake.js

- 仓库：https://github.com/alexgibson/shake.js
- 固定版本：`d232eee7a5f31e9fd37aa79aa83f1f206035ccc9`
- 状态：仓库已归档；`package.json` 标注 MIT，但许可证文本包含 “except as noted below”，授权边界存在歧义，因此按 `NOASSERTION` 处理。
- `package.json` SHA-256：`716ded66505cda8bbcadc92cd3ce658268dd6269ba11af088ce62f045c3bf188`
- `LICENSE` SHA-256：`884110c34b4a2bec6ecb71bf18983a6d5860bfd4c904c14446ec6308764ffb4b`
- 处理方式：没有复制、改写或正式借鉴其代码、API、阈值、示例和文档。

NextParticle 等商业项目、无明确许可证的 CodePen/Gist、远程雪景图片、字体、音频、CDN 资源、emoji 导出素材、品牌雪景球与商业外观均不作为来源，也不得进入生产实现。

## 生成资产

无。

调研阶段产生的十张 ImageGen 概念 PNG 仅供文档讨论，不属于运行时资产，也不是九乘十一图案或点位数据的来源。未来若引入生成资产，应在本文件追加用途、生成方式、文件路径和人工修改说明。
