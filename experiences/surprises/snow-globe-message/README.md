# 等雪停下

一个本地优先的情侣惊喜：依次收集上、右、下、左四阵风，再亲手让雪落下。雪停后，
雪球中的雪花会拼成确定的图案，并展开只在最后阶段出现的留言。

## 直接使用

双击 `index.html` 即可。页面使用经典脚本和相对路径，不需要安装、构建、账号、
联网、权限或本地服务器，且没有远程字体、图片、音频与 CDN 请求。

四个方向按钮与在雪球上拖动完全等价。按钮覆盖键盘、触摸和不便拖动的使用场景；
减少动态效果开启时会跳过落雪动画，但仍抵达同一留言结果。

## 自定义

只需编辑 `config.js`：

- `recipient`：收信人；
- `sender`：署名；
- `patternRows`：9 行、每行 11 个 `.` / `#` 字符的图案；
- `patternLabel`：图案的可见说明；
- `finalTitle`：最终标题；
- `finalNote`：最终留言。

配置不合法时会整份安全回到默认内容。配置文件本身是本地磁盘上的明文；页面不会把
内容写入浏览器存储，也不会上传、分析或请求传感器权限。

## 实现边界

生产页面由本仓库独立编写，使用原生 HTML、CSS、Canvas 和 JavaScript，保持
零第三方运行时依赖。9×11 点阵、四方向有限状态机、Pointer 阈值、确定性雪花位置、
token 化完成流程、焦点与清理逻辑均为本项目自己的实现。调研阶段的 ImageGen 概念
PNG 只用于视觉对照，生产页面不加载、描摹、OCR 或采样这些图片。

## 借鉴与来源声明

以下来源只用于抽象设计原则。项目没有复制它们的源代码、配置、默认参数、示例、
素材、公式或构建依赖；完整载体哈希与排除项见 `assets/ATTRIBUTION.md`。

### tsParticles

- 来源：<https://github.com/tsparticles/tsparticles>
- 固定 revision：`627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59`
- 许可证：MIT
- 版权所有：Copyright (c) 2020 Matteo Bruni
- 借鉴：把粒子当作可统一停止和清理的表现层状态。
- 未复制：preset、API、配置结构、默认值、插件、示例、素材和代码。

### canvas-text-particle

- 来源：<https://github.com/dango0812/canvas-text-particle>
- 固定 revision：`9ee144a548aad85275318b30891c71dcf6e10f7b`
- 许可证：ISC
- 版权所有：Copyright (c) 2026, dango0812
- 借鉴：稳定粒子 ID 到确定目标点的抽象映射。
- 未复制：离屏文字 Canvas、字体或像素采样、阈值、缓动、排斥公式、配置和代码。

### canvas-confetti

- 来源：<https://github.com/catdad/canvas-confetti>
- 固定 revision：`20eebad51dde793070c373d594099a7ed8d96e22`
- 许可证：ISC
- 版权所有：Copyright (c) 2020, Kiril Vatev
- 借鉴：减少动态效果时跳过表现但进入同一结果，以及统一清理动画资源。
- 未复制：物理、Worker、Promise 协调、参数、形状、颜色、Canvas 实现和代码。

### W3C Device Orientation and Motion

- 来源：<https://github.com/w3c/deviceorientation>
- 固定 revision：`70d42d5484db7fd1646e48cc17caa5ff1c9d92cb`
- 许可证：W3C Software and Document License 2023
- 版权所有：Copyright © 2023 World Wide Web Consortium
- 借鉴：核对权限与隐私边界，据此明确排除设备方向和动作传感器。
- 未复制：规范示例、措辞与代码。

`alexgibson/shake.js` 固定 revision
`d232eee7a5f31e9fd37aa79aa83f1f206035ccc9` 因仓库归档且许可证载体存在歧义，
按 `NOASSERTION` 排除；本项目没有复制、依赖或正式借鉴它。
