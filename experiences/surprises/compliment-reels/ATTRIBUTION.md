# Compliment Reels 借鉴与许可证声明

本目录包含可直接打开的生产 UI 与独立规则核心，零第三方运行依赖。实现没有复制、
翻译、改写、链接或打包下列项目的源码、API、随机算法、缓动公式、默认参数、
测试、DOM、CSS、文案、Logo、截图、字体、图案、音频或其他素材。生产页面的
机身、纸卷、把手、星形和 favicon 均为本仓库 code-native HTML/CSS/SVG。

## 固定研究来源

### Slot Machine Generator

- 仓库：[`nuxy/slot-machine-gen`](https://github.com/nuxy/slot-machine-gen)
- 固定 commit：[`56c9017e839583dcb8fcb5cc88b08b30ed63f66a`](https://github.com/nuxy/slot-machine-gen/commit/56c9017e839583dcb8fcb5cc88b08b30ed63f66a)
- 许可证：[MIT LICENSE](https://github.com/nuxy/slot-machine-gen/blob/56c9017e839583dcb8fcb5cc88b08b30ed63f66a/LICENSE)
- 版权：`Copyright (c) 2020-2025 Marc S. Brooks (https://mbrooks.info)`
- 仅研究：独立 reel、结果预选、错峰停止和全部停止后统一返回的职责分层。
- 未采用：其源码/API、3D 圆柱参数、权重、偏置、赔率、payline、示例图片和音频。

### seedrandom

- 仓库：[`davidbau/seedrandom`](https://github.com/davidbau/seedrandom)
- 固定 commit：[`4460ad325a0a15273a211e509f03ae0beb99511a`](https://github.com/davidbau/seedrandom/commit/4460ad325a0a15273a211e509f03ae0beb99511a)
- 许可证：仓库没有独立 LICENSE；MIT 全文位于
  [README 的 LICENSE 章节](https://github.com/davidbau/seedrandom/blob/4460ad325a0a15273a211e509f03ae0beb99511a/README.md)
- 版权：`Copyright 2019 David Bau.`
- 仅研究：随机源局部封装、测试结果可固定重现的抽象边界。
- 未采用：ARC4/Alea/xor PRNG、熵收集、状态序列化、测试向量和全局
  `Math.random` 修改。

### Tween.js

- 仓库：[`tweenjs/tween.js`](https://github.com/tweenjs/tween.js)
- 固定 commit：[`20079e65f77bb2b8e52cc9d7dbed044b86e537d3`](https://github.com/tweenjs/tween.js/commit/20079e65f77bb2b8e52cc9d7dbed044b86e537d3)
- 许可证：[MIT LICENSE](https://github.com/tweenjs/tween.js/blob/20079e65f77bb2b8e52cc9d7dbed044b86e537d3/LICENSE)
- 版权：`Copyright (c) 2010-2012 Tween.js authors.`；`Easing equations
  Copyright (c) 2001 Robert Penner http://robertpenner.com/easing/`
- 仅研究：起终点、持续时间、错峰停止、完成回调与规则分层。
- 未采用：Tween/Group/Easing 源码/API、Penner 缓动公式、参数、示例和测试。

### canvas-confetti

- 仓库：[`catdad/canvas-confetti`](https://github.com/catdad/canvas-confetti)
- 固定 commit：[`20eebad51dde793070c373d594099a7ed8d96e22`](https://github.com/catdad/canvas-confetti/commit/20eebad51dde793070c373d594099a7ed8d96e22)
- 许可证：[ISC LICENSE](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE)
- 版权：`Copyright (c) 2020, Kiril Vatev`
- 仅研究：庆祝表现与规则结果分离、动画清理和 reduced-motion 原则。
- 未采用：粒子物理、worker、Canvas、位图缓存、Promise 协调、默认参数和配色。

## 排除项

`josex2r/jQuery-SlotMachine` 的根 LICENSE 和 `package.json` 表明
GPL-3.0-only，而 README 声称 MIT；因许可证元数据冲突，本作完全排除其代码、
API、CSS、素材和 trade dress。无仓库级许可证的 Gist、来源不明图片/音效、
商业赌场机台、品牌 Logo、BAR、数字 7、铃铛、樱桃、金币与赌场特色表达也全部
排除。

许可证载体 SHA-256、2026-07-24 来源状态和 W3C 标准校准记录见
`docs/230-compliment-reels-source-refresh.md`。
