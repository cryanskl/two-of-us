# “太空舱对接”固定来源维护复核

- 复核日期：2026-07-24
- 对应调研：[176-capsule-docking-research.md](./176-capsule-docking-research.md)
- 对应规格：[177-capsule-docking-spec.md](./177-capsule-docking-spec.md)
- 复核范围：4 个固定代码仓库、NASA NTRS 原始论文，以及输入、页面可见性与
  无障碍标准
- 本轮行为：只读取一手仓库、许可证、NASA 与标准页面；未复制、翻译、改写或
  引入第三方源码、测试、图片、图表、字体、音频、参数或其他素材

## 1. 结论

`capsule-docking` 的四个固定代码仓库在 2026-07-24 仍公开、未归档、未禁用；
默认分支 HEAD 仍逐项精确等于调研固定的 commit，当前许可证文件与固定版本的
SHA-256 也没有漂移。

因此，Gymnasium、p2.js、SAT.js 与 Phaser 继续只作为抽象机制研究来源，不是
运行依赖。作品仍应以原生 HTML/CSS/JS 独立实现，保持 A 级 `file://` 直开，
也不需要因为本次维护新增依赖。

标准复核发现三处需要校准：

1. NASA 原文分别列出近距/对接中的目标相对位置与相对速度，以及对接中的目标
   相对姿态与相对姿态率；原调研的“最终接近同时控制接口”措辞比原文更强；
2. W3C Page Visibility Level 2 已于 2022-06-23 成为 Discontinued Draft，
   页面明确要求后续技术工作改看 WHATWG HTML Living Standard；
3. WCAG 2.2 的 AA 级 SC 2.5.8 最低目标尺寸是 24×24 CSS px 并带例外；
   本项目的控制键至少 44×44px、主动作至少 48px 是主动提高的体验门槛，
   不是对 WCAG AA 数值要求的转述。

这些校准不改变玩法或实现 Gate，只修正证据状态和声明边界。

## 2. 代码仓库可重放核验

| 来源 | 默认分支 | 2026-07-24 HEAD | 公开状态 | GitHub SPDX | 固定/当前许可证 SHA-256 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| [Farama Gymnasium](https://github.com/Farama-Foundation/Gymnasium) | `main` | `20b453de30ef725a538e235fcdec909f30c95783` | 未归档、未禁用 | `MIT` | `7dacaa9772e856aee6943b32ef663d3634d91d72ec7bbc74d136943673f91e18` | HEAD 与固定 commit 相同；MIT 文本未漂移 |
| [schteppe/p2.js](https://github.com/schteppe/p2.js) | `master` | `2beb2750f42d29014e289cb803b7269d5b0edaad` | 未归档、未禁用 | `NOASSERTION` | `bf18c22aac924767ac66ef68e453f4e78f39d0e054442bc6925b09a1fcdb61b2` | HEAD 与固定 commit 相同；根 LICENSE 明确为 MIT |
| [jriecken/sat-js](https://github.com/jriecken/sat-js) | `master` | `20e612681d1f9eabc9ea34dc98c4d27f985ffec6` | 未归档、未禁用 | `MIT` | `de2ab62cb212dfbfe403a2f7e8b7de9b7e74e33d12bdbe8854bf324ab00fd2a2` | HEAD 与固定 commit 相同；MIT 文本未漂移 |
| [phaserjs/phaser](https://github.com/phaserjs/phaser) | `master` | `41be1e462bc600064e498cba370bfa8c5c055a22` | 未归档、未禁用 | `MIT` | `c3a9ba7e38d4ef33dccf5fdd1046655c63df06714f84776118fe406f43db5cf2` | HEAD 与固定 commit 相同；MIT 文本未漂移 |

`p2.js` 的 GitHub SPDX 自动识别为 `NOASSERTION`，但固定 commit 的根
`LICENSE` 明确写有 MIT License。许可证结论以一手文件为准，不用平台自动识别
替代法律文本。

表中的 SHA-256 同时对固定 commit 与当前 HEAD 的原始许可证内容计算；两份内容
逐项相同。可重放命令形状如下：

```bash
curl -fsSL "https://api.github.com/repos/<owner>/<repo>"
git ls-remote "https://github.com/<owner>/<repo>.git" "refs/heads/<branch>"
curl -fsSL \
  "https://raw.githubusercontent.com/<owner>/<repo>/<commit>/<license>" \
  | shasum -a 256
```

## 3. 许可证、版权与借鉴边界

### 3.1 Farama Gymnasium

- 固定许可证：
  [MIT](https://github.com/Farama-Foundation/Gymnasium/blob/20b453de30ef725a538e235fcdec909f30c95783/LICENSE)。
- 版权主体仍为 `Copyright (c) 2016 OpenAI` 与
  `Copyright (c) 2022 Farama Foundation`。
- 本作继续只借鉴把位置、线速度、角度、角速度等状态类别分开的抽象。
- 不复制或引入 Python、Box2D、Pygame、Lunar Lander 源码、API、力学公式、
  发动机参数、动作/观察空间、奖励、终止条件、测试、飞船、地形或粒子。

### 3.2 schteppe/p2.js

- 固定许可证：
  [MIT](https://github.com/schteppe/p2.js/blob/2beb2750f42d29014e289cb803b7269d5b0edaad/LICENSE)。
- 版权主体仍为 `Copyright (c) 2016 p2.js authors`。
- 本作继续只借鉴固定 dt、accumulator、最大子步与规则/渲染分离的职责。
- 不复制或引入 `World.step/internalStep`、对象结构、求解器、碰撞管线、插值、
  构建、测试或示例。

### 3.3 jriecken/sat-js

- 固定许可证：
  [MIT](https://github.com/jriecken/sat-js/blob/20e612681d1f9eabc9ea34dc98c4d27f985ffec6/LICENSE)。
- 根许可证版权行仍为
  `Copyright (C) 2012 - 2015 by Jim Riecken`。
- 本作继续只借鉴粗排除、精确碰撞与安全对接判定分层的抽象。
- 不复制或引入 Vector、SAT、Response、ObjectPool、分离轴实现、优化、测试、
  示例或文档措辞。源码头与根许可证的年份差异仍保持原样记录，不自行合并。

### 3.4 phaserjs/phaser

- 固定许可证：
  [MIT](https://github.com/phaserjs/phaser/blob/41be1e462bc600064e498cba370bfa8c5c055a22/LICENSE.md)。
- 版权主体仍为
  `Copyright (c) 2026 Richard Davey, Phaser Studio Inc.`。
- 本作继续只借鉴按下/抬起、repeat 过滤、失焦复位与监听器清理的生命周期职责。
- 不复制或引入 KeyboardPlugin、Key、KeyMap、插件体系、EventEmitter、事件名、
  类型、测试、品牌或演示素材。

## 4. NASA 状态类别证据

一手来源是 NASA NTRS 的
[Orion Rendezvous, Proximity Operations, and Docking Design and Analysis](https://ntrs.nasa.gov/citations/20070025134)
及其[官方 PDF](https://ntrs.nasa.gov/api/citations/20070025134/downloads/20070025134.pdf?attachment=true)。
论文表 1 分别写明：

- `CV0116`：近距与对接操作中的目标飞行器相对位置、相对速度；
- `CV0117`：对接操作中的目标飞行器相对姿态、相对姿态率。

本作只借这四类公开状态量形成易读的游戏 Gate。它不复制论文、表格、图形、
参数、导航/控制算法或安全结论，也不把归一化辅助物理描述为真实航天训练。
由于这里只提炼事实类别，没有引入 NASA 文件或素材，不把 NASA 文档视为本作
代码、资产或运行依赖。

## 5. 浏览器标准状态

| 来源 | 2026-07-24 状态 | 对本作的作用 |
| --- | --- | --- |
| [UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/) | W3C Recommendation，2025-04-22 | 用 `code` 识别物理键位，不依赖字符布局 |
| [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) | W3C Recommendation，2026-06-30 | 校准 pointer capture、cancel 与 lost capture 生命周期 |
| [Page Visibility Level 2](https://www.w3.org/TR/page-visibility-2/) | W3C Discontinued Draft，2022-06-23 | 只保留为历史来源，不再作为现行规范 |
| [WHATWG HTML Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) | Living Standard；本次读取页标注 2026-07-20 更新 | 作为 `visibilityState` 与 `visibilitychange` 的现行规范来源 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C Recommendation，2024-12-12 | 校准键盘、焦点、回流、文本缩放和目标尺寸基线 |

Pointer Events 与 HTML/WCAG 只校准实现边界，不是代码来源。本作不复制规范
算法、正文、示例、测试或图片，也不把项目验收结果宣称为标准合规认证。

目标尺寸需要分层表达：

- WCAG 2.2 SC 2.5.8 的 AA 基线是 24×24 CSS px，并有 spacing、equivalent、
  inline、user-agent control 与 essential 等例外；
- WCAG 2.2 SC 2.5.5 的 44×44 CSS px 是 AAA 增强项；
- 本作四个玩法键至少 44×44px、主动作至少 48px，是不依赖例外的项目自定
  体验 Gate，规格数值保持不变。

## 6. 对实现与声明的影响

生产实现继续遵守：

1. 不新增 Gymnasium、p2.js、SAT.js、Phaser 或航天仿真运行依赖；
2. 双席权限、定点整数物理、三航段、碰撞、六项 Gate、状态机、代码、界面、
   文案和生成资产保持独立设计与实现；
3. 不复制第三方源码、API、公式、常量、默认配置、动作/观察空间、奖励、测试、
   DOM、CSS、配色、字体、图片、音频、品牌或演示素材；
4. NASA 只支持四类状态量的事实背景，不支持真实参数、性能或安全主张；
5. Page Visibility 的现行引用改为 WHATWG HTML；W3C Level 2 仅作历史说明；
6. 44/48px 明确标为项目自定体验门槛，不冒充 WCAG AA 原文；
7. 若未来实际复制或修改第三方内容，立即停止“独立重写”结论，重新做文件级
   许可审计，并随分发保留适用许可证、版权通知、修改说明与素材来源。

## 7. 下一次复核触发条件

出现以下任一情况时立即重做来源复核：

- 需要引入任何参考库、代码片段、测试、公式、NASA 图表或其他第三方素材；
- 固定仓库被归档、转移、删除，或许可证文件、版权主体发生变化；
- 浏览器输入、页面可见性或无障碍实现扩大到当前冻结子集以外；
- 视觉概念开始接近 NASA、SpaceX、ISS、任务徽章、国旗或真实接口造型；
- A 级边界改变，需要模块、服务、网络、权限或外部资产。
