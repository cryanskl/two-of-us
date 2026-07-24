# “把愿望，放到夜空里”借鉴与来源声明

“把愿望，放到夜空里”是本仓库独立设计和实现的本地惊喜体验。当前生产逻辑不
安装、链接、打包或复制任何第三方运行时、源码、测试、字体、图片、音频或素材。

## 固定调研来源

| 来源 | 固定版本与许可证 | 本作仅借鉴 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [Fireworks.js](https://github.com/crashmax-dev/fireworks-js/tree/8f01eeaef422c1f0880e94ce99040025a1b74d7e) | commit `8f01eeaef422c1f0880e94ce99040025a1b74d7e`；MIT；Copyright (c) 2021-2023 Vitalij Ryndin；`LICENSE` SHA-256 `90ee54acbb98a0f58ef428b972bc5641877b6c56315bd6983396a5682db5d937` | 把上升、爆炸、控制器生命周期与清理拆成表现职责 | 源码、API、随机范围、gravity/friction 公式、参数、默认配置、框架封装、flickering、sound、视觉和素材 |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License；仓库贡献者授权、Pointer Events Working Group 维护；`LICENSE.md` SHA-256 `232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b` | `pointerdown/up/cancel`、capture 与 lost capture 的生命周期边界 | 规范措辞、算法、示例、测试、图片，以及 pressure、tilt、persistentDeviceId、raw/coalesced/predicted events |
| [canvas-text-particle](https://github.com/dango0812/canvas-text-particle/tree/9ee144a548aad85275318b30891c71dcf6e10f7b) | commit `9ee144a548aad85275318b30891c71dcf6e10f7b`；ISC；Copyright (c) 2026, dango0812；`LICENSE` SHA-256 `2a9fec8f93f07847a22029d5c423e33e0839da09d516664e5f0608346c03a122` | 稳定粒子 ID 朝静态目标点归位的职责分层 | 源码、API、离屏文字 Canvas、字体采样、alpha 阈值、排斥/回归公式、默认字体、参数和演示 |
| [canvas-confetti](https://github.com/catdad/canvas-confetti/tree/20eebad51dde793070c373d594099a7ed8d96e22) | commit `20eebad51dde793070c373d594099a7ed8d96e22`；ISC；Copyright (c) 2020, Kiril Vatev；`LICENSE` SHA-256 `fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a` | 减少动态时跳过混乱表现但完成相同逻辑结果，以及集中清理表现资源 | Promise/Worker 协调、粒子物理、位图缓存、形状、颜色、参数、Canvas 源码、emoji/path 示例和素材 |
| [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | commit `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License；仓库贡献者授权；`LICENSE.md` SHA-256 `7a3ad7d36b8855bc301276279769da4aff648ea5d7b92f3f023c0823ee948764` | 键盘、闪烁阈值、交互动效和 Pointer Cancellation 的设计边界 | 规范正文、算法、示例、测试工具、图片和“已获 WCAG 认证”之类声明 |

## 独立实现边界

本作的三份 9×9 点阵、active count、静态 target、整数表现帧、蓄力量化、状态机、
revision/token、公开投影、隐私 Gate、测试、中文文案与后续 UI 均在本仓库独立
设计和实现。Fireworks.js、canvas-text-particle 与 canvas-confetti 不属于依赖、
script、vendor 或构建产物。

完全排除无许可证烟花仓库、CodePen/Gist 片段、来源不明的 GIF/图片/音效/字体、
频闪实现，以及只有构建产物而无法对应源码和许可证的下载包。

## 生成资产

生成资产：无。

仓库中的 ImageGen 概念仅用于 `docs/` 设计评审，不是当前生产运行时素材，也没有
从概念图裁切、复制或加载像素。若未来加入生成资产，必须记录 prompt、日期、尺寸、
格式、SHA-256 和“第三方输入：无”；若引入任何第三方代码或素材，则重新进行
文件级许可审计并随分发保留适用许可证、版权通知与修改说明。
