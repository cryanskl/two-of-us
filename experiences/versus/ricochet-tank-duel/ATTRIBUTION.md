# 来源、权利状态与独立实现声明

## 结论

- 外部开源游戏直接借鉴：**0 个**。
- 外部软件库、物理引擎或碰撞库：**0 个**。
- 玩家运行时第三方依赖：**0 个**。
- 第三方代码、伪代码、地图、数值、测试、图片、字体、图标、音频、品牌或 UI
  布局复制：**0 项**。

核心、输入、渲染、页面、镜像地图、数值和测试均按本仓库 `docs/299–302` 与
`docs/312` 独立编写。以下资料只用于理解抽象工程边界，不构成链接、打包或运行时
依赖。

## 固定资料清单

访问日期均为 2026-07-26。

| 固定来源 | 版本 / URL | 许可证或权利状态 | 具体借鉴点 | 明确未复制范围 |
| --- | --- | --- | --- | --- |
| Tang, Kim, Manocha, *Controlled Conservative Advancement for Continuous Collision Detection of Polygonal Models* | ICRA 2009；<https://gamma-web.iacs.umd.edu/papers/documents/articles/2009/tang09.pdf> | 学术论文，版权由作者 / 出版方保留；不是项目软件许可证 | 连续运动区间应求最早接触，不能只查离散终点 | 未复制源码、伪代码、公式推导、模型、图表、数据或参数 |
| Jeff Linahan, *Improving the Numerical Robustness of Sphere Swept Collision Detection* | arXiv:1211.0059v1；<https://arxiv.org/abs/1211.0059v1> | arXiv 论文，版权由作者保留；不是项目软件许可证 | 扫掠圆碰撞要明确处理数值边界、初始重叠和重复接触 | 未复制源码、伪代码、示例、图表、测试或参数 |
| Joachim Breitner, Chris Smith, *Lock-step simulation is child's play* | arXiv:1705.09704v1；<https://arxiv.org/abs/1705.09704v1> | arXiv 论文，版权由作者保留；不是项目软件许可证 | 相同初态与输入日志应得到相同演化 | 未复制语言实现、证明、源码、示例或测试 |
| W3C, *High Resolution Time Level 3* | <https://www.w3.org/TR/hr-time-3/> | W3C Software and Document License | `performance.now()` 只作为单调调度时钟，不进入逻辑状态 | 未复制规范文本、示例代码或测试套件 |
| WHATWG, *HTML — Animation frames* | <https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames> | WHATWG HTML 许可声明：CC BY 4.0 文档许可 | 用 `requestAnimationFrame` 驱动固定步累加器 | 未复制规范文本、示例代码或 Web Platform Tests |
| WHATWG, *HTML — Page visibility* | <https://html.spec.whatwg.org/multipage/interaction.html#page-visibility> | WHATWG HTML 许可声明：CC BY 4.0 文档许可 | 页面隐藏时不追赶后台时间，并清空持续输入 | 未复制规范文本、算法、示例代码或测试 |
| W3C, *Pointer Events Level 3* | <https://www.w3.org/TR/pointerevents3/> | W3C Software and Document License | `pointerId`、pointer capture、cancel 与 lost capture 的释放边界 | 未复制规范文本、polyfill、示例代码或测试套件 |
| W3C, *Media Queries Level 5 — prefers-reduced-motion* | <https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion> | W3C Software and Document License | 减少装饰运动，不改变玩法必需运动或逻辑哈希 | 未复制规范文本、样式片段或测试套件 |
| W3C, *Web Content Accessibility Guidelines 2.2* | <https://www.w3.org/TR/WCAG22/> | W3C Software and Document License | 目标尺寸、焦点可见、非颜色单一编码与暂停能力 | 未复制规范正文、示例、技术文档或测试规则 |

上表中的“借鉴”是对公开原理与标准合同的独立实现，不代表论文或标准的许可被传递
到本项目代码。项目没有从这些来源复制受保护表达。

## 内部视觉概念

视觉方向来自仓库内 `docs/312-ricochet-tank-duel-design-proposal.md`：

- 深靛哑光折射台；
- 珊瑚 / 湖蓝双席；
- 棱镜墙、抽象折光车、开放赛场、双状态轨和对称控制带；
- 静态裂光反馈与克制的必要运动。

两张概念图由 Codex 内置 OpenAI ImageGen 从文字 prompt 生成，没有输入第三方图片、
开源项目截图或商业游戏界面。它们只作为设计证据保存在 `docs/assets/`：

- 未被页面、CSS、Canvas 或 favicon 引用；
- 未裁切、描摹、OCR 或作为背景进入运行时；
- 生产标题、比分、控件和状态都是 HTML 文本；
- 墙、车辆、光点与方向楔由 Canvas 2D 原语按冻结常量绘制；
- favicon 是本项目独立手写 SVG。

## 后续登记规则

如后续实际参考任何开源软件或采用第三方资产，必须在对应实现提交中先补齐：

- 固定仓库 URL；
- 固定 commit / tag；
- 软件许可证与版权人；
- 实际借鉴内容；
- 明确未复制内容；
- 必要的源码保留声明和许可证副本。
