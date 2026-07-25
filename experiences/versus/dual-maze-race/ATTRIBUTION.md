# 借鉴与来源声明

## 独立实现声明

“同路，谁先到”的确定性迷宫生成器、两个固定 seed、完整 fingerprint、BFS 校验、
四局换席赛程、固定 tick 状态机、积分、暂停语义、配置合同、测试、HTML、CSS、
DOM 投影、输入接线、响应式布局、图标和可见文案均由本仓库独立设计并编写。

本轮没有搜索、克隆或阅读外部开源迷宫项目的源码，也没有复制第三方地图、参数、
测试、界面、文案或素材。本目录没有第三方运行时依赖、第三方代码或第三方资产，
因此没有需要随作品再分发的第三方许可证正文、版权声明或 notice。

## 视觉概念与生产资产

生产视觉方向参考了本仓库通过 OpenAI ImageGen 生成并经用户确认的两张 docs-only
概念图：

- `docs/assets/dual-maze-race/desktop-active-race-concept.png`；
- `docs/assets/dual-maze-race/mobile-active-race-concept.png`。

概念图只用于确认暖纸白共享地图桌、深墨迷宫、钴蓝圆形、朱砂菱形、常青绿终点、
单一比赛信息轨、等大双盘和双方向控制的层级。运行页面不加载、裁切、描摹或分发这
两张 PNG；真实迷宫、墙、起终点、玩家标记、方向图标和拓扑纹理由 core public view
与 code-native DOM / SVG / CSS 独立生成。

生成过程没有输入外部开源游戏、商标、第三方地图或用户私人素材。生成工具没有暴露
可固定的模型 seed 或内部参数，项目不会虚构这些字段。

## 算法资料

### Depth-first search

- Robert Tarjan, “Depth-First Search and Linear Graph Algorithms”,
  *SIAM Journal on Computing* 1(2), 1972：
  <https://doi.org/10.1137/0201010>
- 用于：校准深度优先遍历、回溯和生成树的理论边界。
- 未复制：论文文字、图、证明、伪代码或任何实现。

本项目的迭代 DFS、邻居顺序、passage bitmask、冻结 seed、fingerprint 和测试均按本作
规格独立编写。

### Xorshift

- George Marsaglia, “Xorshift RNGs”, *Journal of Statistical Software*
  8(14), 2003：<https://doi.org/10.18637/jss.v008.i14>
- 用于：校准非零 32 位 xorshift 状态递推的算法来源。
- 未复制：论文文字、图、软件包、示例代码或测试。

JSS 文章页面区分文章许可与随文软件许可；本项目没有引入、修改或链接随文软件，
只按项目规格独立写出有限的 32 位整数递推。该递推只用于可复现地图，不用于密码学
安全或公平抽签声明。

### Breadth-first search

- E. F. Moore, [“The Shortest Path Through a Maze”](https://cir.nii.ac.jp/crid/1570854175170619520),
  in *Proceedings of an International Symposium on the Theory of Switching*,
  Harvard University Press, 1959, pp. 285–292.
- 用于：校准无权迷宫最短路径的 BFS 语义。
- 未复制：论文文字、图、证明或实现。

BFS 只用于生产同源校验和测试。最短路径不会进入公共 view，也不会作为玩家提示。

## 浏览器、无障碍与硬件资料

以下资料影响生产规格、浏览器适配与验收 Gate，但不是玩家运行时依赖：

| 来源 | 用于 | 未复制与当前边界 |
| --- | --- | --- |
| W3C [UI Events](https://www.w3.org/TR/uievents/) | 键盘事件、`repeat` 与事件顺序边界 | 未复制规范文字或示例代码；`app.js` 只把事件适配为核心 action |
| W3C [KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/) | 冻结 WASD 与方向键的物理 code | 未复制规范文字或表格；生产 app 已实现两席 code 映射 |
| W3C [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) | 双 pointer、cancel 与触控边界 | 未复制示例代码；八个生产按钮已覆盖独立 pointer 生命周期 |
| W3C [High Resolution Time](https://www.w3.org/TR/hr-time-3/) | 单调时钟只驱动整数 tick | 未复制算法；`performance.now()` 只由 app 的 fixed-step 调度器读取 |
| WHATWG [Page Visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) | hidden 时暂停 | 未复制规范文字或代码；生产 app 已接入公平暂停入口 |
| WHATWG [Animation Frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames) | RAF 只作 fixed-step 驱动 | 未复制算法；核心胜负不依赖 RAF 分组，长帧会安全暂停 |
| W3C [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion) | 降动效不能改变规则 | 未复制样式；生产 CSS 只取消过渡，不改变 tick 或赢家 |
| WCAG 2.2 [Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) | 键盘等价 Gate | 不宣称当前通过完整 WCAG 验收 |
| WCAG 2.2 [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | 触控目标 Gate | 八个方向按钮在生产 CSS 中至少为 52 × 52 CSS px |
| WCAG 2.2 [Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) | 焦点可见性 Gate | 生产 DOM 使用原生控件并提供明确的 `:focus-visible` 焦点管理 |
| WCAG 2.2 [Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages) | 倒数与结果播报 Gate | 生产页面通过 polite live region 播报低频阶段变化 |
| Microsoft Applied Sciences [Keyboard Ghosting](https://www.microsoft.com/applied-sciences/projects/anti-ghosting) | 说明同机多键可能被硬件、软件或协议漏报 | 未复制产品、图、演示或实现；因此保留联合输入检查和触控替代 Gate |

上述 15 个论文、书目、标准与硬件页面于 2026-07-25 重新访问。它们是动态网页或
出版物记录，不是被引入的版本化源码。当前没有第三方开源实现、代码或素材，因此
没有可合理固定的外部 commit/tag，也没有需要随本作再分发的第三方软件许可证正文。

## 当前实现边界

- `logic.js` 不读取 DOM、浏览器时间、键盘、Pointer 或网络事件；
- `TICK`、`QUEUE_MOVE`、`PAUSE` 只是纯数据 action；
- 生产 UI 已完成真实双触控、键盘、RAF、hidden/blur、六个视口、降动效、
  forced-colors 与 no-JS 验收；A 级直开由经典相对脚本和递归本地资源闭包锁定；
- 物理键盘 ghosting 与设备并发触点能力仍取决于具体硬件，赛前联合检查不会把它们
  伪装成所有设备的能力保证；
- 两块 Board 的当前视图共享同一个公开 maze DTO，再分别做 code-native 投影；
- 运行时不使用 npm 依赖、网络、存储、账号或设备权限。

## 后续变更规则

如果后续实际参考任何开源实现，必须在写代码前补充：

- 固定仓库 URL 与 commit 或 tag；
- LICENSE 固定链接、许可证名称和版权人；
- 实际借鉴内容与明确未复制范围；
- 若引入代码或资产，保留许可证正文、版权与 notice。

来源无法固定、许可证不清或权利不明时不得复制。
