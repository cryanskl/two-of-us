# 借鉴与来源声明

核验日期：2026-07-19。

## 机制与工程边界参考

| 来源 | 固定版本、许可证与权利主体 | 本作仅研究 | 未复制、翻写或引入 |
| --- | --- | --- | --- |
| [SAT.js](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6) | tag `0.9.0`，commit `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`；MIT；Copyright 2012–2015 Jim Riecken | 凸多边形、AABB 和分离轴投影的技术对照 | `Vector/Polygon/Response` API、源码、函数、最短重叠响应、示例和测试 |
| [Box2D](https://github.com/erincatto/box2d/tree/8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3) | tag `v3.1.1`，commit `8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3`；MIT；Copyright 2022 Erin Catto | 凸形状、固定步、连续碰撞和完整刚体引擎边界 | C/C++、接触流形、裁剪、求解器、samples、图表与参数 |
| [dyn4j](https://github.com/dyn4j/dyn4j/tree/058bf6d982a0fb89b54050f929f6ea9dae53b714) | tag `6.0.0`，commit `058bf6d982a0fb89b54050f929f6ea9dae53b714`；BSD-3-Clause；Copyright 2010–2026 William Bittle | Transform、本地/世界坐标、凸形状与静态物体的工程对照 | Java 源码、类/API、算法实现、测试和示例；不以作者或贡献者名义背书 |
| [p2.js](https://github.com/schteppe/p2.js/tree/d83c483f912362fd6e57c74b0634ea3f1f3e0c82) | tag `v0.7.1`，commit `d83c483f912362fd6e57c74b0634ea3f1f3e0c82`；MIT；Copyright 2015 p2.js authors | 固定 time step、Box/Convex 碰撞和渲染插值分层 | 引擎、World/Body API、Float32 状态、demos、示例和分发文件 |
| [js_thrustvector](https://github.com/pemmyz/js_thrustvector/tree/4d140761ba1af8f4448bc6bd4785b63fc8928c5c) | commit `4d140761ba1af8f4448bc6bd4785b63fc8928c5c`；MIT；Copyright 2025 pemmyz | 两位玩家共同影响一个载荷的抽象合作问题 | 飞船、炸弹、夹取、洞穴、路径、参数、源码、截图、音频与视觉 |
| [TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) | commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`；MIT；Copyright 2026 tridpt | 同机双控制组、纯客户端游戏注册和确定性测试思路 | 76 个游戏、共享壳、服务端、账号、音频、素材、样式、规则与源码 |

上述项目均不是运行依赖。即使许可证允许复制，本作品也选择零复制，以保持实现来源、视觉身份和许可证义务清晰。

## Web 平台与无障碍规范

| 规范 | 固定版本与权利 | 本作仅研究 | 未复制 |
| --- | --- | --- | --- |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | commit `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License；W3C contributors | pointerId、capture、cancel、lost capture 与多指入口 | 规范文字、WebIDL、示例、图表和站点视觉 |
| [W3C UI Events code](https://github.com/w3c/uievents-code/tree/b201684d1de0af90bc403814bbdee6aa96647130) | commit `b201684d1de0af90bc403814bbdee6aa96647130`；W3C Software and Document License；W3C contributors | 物理键位、keydown repeat 和精确 keyup | 规范文字、键值表、WebIDL、示例和站点视觉 |
| [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d) | commit `56674fb3ac40279141a202e5d19b84f30d99854d`；规范 CC BY 4.0、代码片段 BSD-3-Clause；WHATWG contributors | animation frame 时间戳和页面生命周期 | 规范文字、代码片段、示例和站点视觉 |
| [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | commit `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License；W3C contributors | 目标尺寸、Pointer 取消、非颜色提示和状态语义 | 规范文字、示例、图表和站点视觉 |
| [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554) | commit `c7573530343759ace8e46438a1fa2c44515b5554`；W3C Software and Document License；CSS Working Group contributors | `prefers-reduced-motion` 与 forced colors | 规范文字、WebIDL、示例和站点视觉 |

两个方向盘采用至少 120×120px 操作面，暂停等辅助入口采用至少 48×48px。这是仓库内部可用性标准，不冒充 WCAG 强制值。

## 明确排除与误匹配

- `evanw/rapt@88573a51e4e4f96b0369b3748552ec71354aa813`：双人 HTML5 物理平台游戏，但固定仓库无许可证；不复制 JavaScript、碰撞、关卡、敌人、编辑器、图形或文本。
- `ethanuser/Cooperate@a0031c6c097c7d84ddbe96af1ae6d17e9fbec127`：无许可证，README 还说明背景音乐来自商业游戏；代码、MP3、视觉、关卡与规则均不可复制。
- `Touff-97/combat_couch_racing@90b0c6471716e08566f03395aeef679cccce8c9d`：MIT 明确，但 “couch co-op” 表示本地多人赛车，不是协作搬家具；题材和机制不匹配，不进入复用链。
- HELLCOUCH：以实体沙发作为 Arduino/Unity 控制器，不是浏览器搬运玩法，没有作为本作代码或素材来源。
- 《Moving Out》《Heave Ho》《Get Packed》：商业作品只说明合作搬运是常见题材；不使用名称、人物、家具造型、关卡、UI、截图、音效、音乐或品牌表达。

公开源码不等于获准复制；代码许可证也不能自动覆盖字体、音乐、贴图、截图和品牌。权利不清的资产一律不进入本作。

## OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen；界面概念使用 `ui-mockup`，运行背景使用 `stylized-concept`；
- 生成日期：2026-07-19；
- 第三方图片、商业游戏截图、开源项目截图、源码或 UI 输入：无；
- 运行资产：[`assets/moving-day-paper.jpg`](./assets/moving-day-paper.jpg)，由内置 ImageGen PNG 在本机使用既有 ffmpeg 转为 JPEG；
- 内部视觉规格：[`design/moving-home-together/`](../../../design/moving-home-together/) 下的桌面进行、移动进行和桌面完成概念，运行页面不加载这些图片。

生产背景只包含无字、低细节的亚麻象牙纸和边角纸片；没有文字、标志、水印、沙发、家具、地图、墙、路线、地毯、控件、人物或品牌。全部规则对象、界面文字和交互由本地 HTML/CSS/JavaScript/SVG 生成。

## 完整原创与零复制声明

“一起，把家搬进来”的双端八向合成、整数状态、离散角度表、固定微步、六矩形 S 形地图、完整地毯 Gate、12 tick 松手保持、Pointer generation、经典脚本接线、原生 SVG、响应式纸艺界面、中文文案和测试均为本仓库独立原创实现。

本作品没有复制、翻译、改写、打包或依赖上述项目、排除项目及平台规范的源代码、API、算法实现、测试、参数、关卡、素材、图标、字体、音频、截图、图表、页面结构、文案或视觉。未引入 SAT.js、Box2D、dyn4j、p2.js 或任何其他物理/游戏运行库。

如果未来发现或决定引入任何实质代码或素材，必须先暂停发布，保存对应许可证和权利声明，记录固定版本、复制范围与修改说明，再重新执行权利、离线和浏览器验收。
