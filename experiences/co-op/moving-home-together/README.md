# 一起，把家搬进来

两个人共用一台设备，各自握住沙发的一端，把它穿过 S 形门厅，最后一起松手放进客厅地毯。双方都给出方向时沙发才会动：同向主要平移，错开方向可以转弯。

## 启动

直接双击 [`index.html`](./index.html) 即可。本作品是 A 级经典脚本页面，支持 `file://` 直开，不需要安装依赖、启动服务器、账号或网络。

## 操作

- 左端使用 `W`、`A`、`S`、`D`，右端使用方向键；每侧可以同时按两个键给出斜向意图；
- 触屏或 Pointer 可以分别拖动左右两个圆盘，两根手指可以同时控制；
- 指针进入圆盘中心 18% 死区时，该端会松手，但 Pointer 会话仍保留，继续拖出中心即可恢复方向；
- 只有两侧都给方向时才会移动。碰墙后停在上一处安全位置，不回弹、不扣分、不归因任何一方；
- 沙发四角全部进入目标、方向接近水平并且双方松手保持 12 tick，才算把家放稳；
- Escape、窗口失焦、页面隐藏或超过 250ms 的长帧会清空输入并暂停，不补算后台时间。

## 个性化

打开 [`config.js`](./config.js) 可以修改双方称呼、开场说明、完成文案和落款。`composeMovingHomeMessage(view)` 保留了一个有完整默认结果的学习 TODO；不修改也能完整游玩。

## 本地、隐私与降级边界

作品不联网、不保存、不录音、不播放音频，不使用浏览器存储、传感器、相机、麦克风、定位、外部字体、CDN、统计或遥测。背景图只是可选纸张纹理；即使缺失，六个墙体、S 形路线、目标地毯、沙发、控制盘、方向和状态文字仍由本地 HTML/CSS/JavaScript/SVG 完整呈现。

## 借鉴与来源声明

核验日期：2026-07-19。以下固定版本只用于研究通用机制和工程边界，均不是运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [SAT.js](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6) | tag `0.9.0`，commit `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`；MIT；Copyright 2012–2015 Jim Riecken | 凸多边形、AABB 与分离轴投影 | API、源码、函数、响应结构、示例和测试 |
| [Box2D](https://github.com/erincatto/box2d/tree/8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3) | tag `v3.1.1`，commit `8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3`；MIT；Copyright 2022 Erin Catto | 凸形状、固定步和完整刚体引擎边界 | C/C++、接触流形、裁剪、求解器、samples、图表和参数 |
| [dyn4j](https://github.com/dyn4j/dyn4j/tree/058bf6d982a0fb89b54050f929f6ea9dae53b714) | tag `6.0.0`，commit `058bf6d982a0fb89b54050f929f6ea9dae53b714`；BSD-3-Clause；Copyright 2010–2026 William Bittle | Transform、本地/世界坐标和静态物体 | Java 源码、类/API、算法实现、测试和示例 |
| [p2.js](https://github.com/schteppe/p2.js/tree/d83c483f912362fd6e57c74b0634ea3f1f3e0c82) | tag `v0.7.1`，commit `d83c483f912362fd6e57c74b0634ea3f1f3e0c82`；MIT；Copyright 2015 p2.js authors | 固定 time step 和渲染/状态分层 | 引擎、API、Float32 状态、demos、示例和分发文件 |
| [js_thrustvector](https://github.com/pemmyz/js_thrustvector/tree/4d140761ba1af8f4448bc6bd4785b63fc8928c5c) | commit `4d140761ba1af8f4448bc6bd4785b63fc8928c5c`；MIT；Copyright 2025 pemmyz | 两位玩家共同影响一个载荷的产品问题 | 飞船、炸弹、夹取、洞穴、路径、参数、源码、截图、音频和视觉 |
| [TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) | commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`；MIT；Copyright 2026 tridpt | 同机双控制组和纯客户端游戏边界 | 游戏、共享壳、服务端、账号、音频、素材、样式、规则和源码 |

平台行为另参考固定版本的 [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)、[W3C UI Events code](https://github.com/w3c/uievents-code/tree/b201684d1de0af90bc403814bbdee6aa96647130)、[WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)、[W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) 与 [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)，只研究 Pointer 生命周期、物理键位、动画帧、目标尺寸、降动效和 forced colors；未复制规范文字、IDL、示例、图表或站点视觉。完整权利、排除项和零复制范围见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。

本作品的玩法、地图、界面、代码、文案和素材均为本仓库独立原创。没有复制、翻译、改写、打包或依赖上述来源及排除项目的源码、API、算法实现、测试、参数、关卡、图形、字体、音频、截图、页面结构、文案或视觉；也不使用商业搬家游戏的名称、角色、家具造型、关卡和品牌表达。

## OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen；三个完整界面概念使用 `ui-mockup`，生产背景使用 `stylized-concept`；
- 生成日期：2026-07-19；
- 第三方图片、商业游戏截图或开源项目资产输入：无；
- 运行资产：[`assets/moving-day-paper.jpg`](./assets/moving-day-paper.jpg)；
- 内部概念：[`design/moving-home-together/`](../../../design/moving-home-together/) 下的桌面进行、移动进行和桌面完成稿，不由运行页面加载。

生产背景只有无字、低细节的亚麻纸纹和边角纸片。地图、目标、沙发、控制盘、文字、焦点与状态全部由本地代码生成。
