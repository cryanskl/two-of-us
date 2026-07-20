# A 级“把星光，一笔一笔交给你”定向调研

调研日期：2026-07-21

对应创意：`C18 星座接线员`

建议目录：`experiences/co-op/constellation-relay/`

建议等级：A（单设备轮流、`file://` 直开、无第三方运行依赖）

## 1. 调研结论

C18 适合实现成一张公开的观测站接线图：两个人守着同一个当前线头，严格轮流把它接到下一颗星；每根目标线只能使用一次，不能穿过已接线，最后必须恰好用完双翼星鸢的 10 根线，并停在指定终点。

正式方向采用 **固定起终点的双人 Euler 接线**：

- 9 颗原创虚构星、10 根目标线、一个固定起点和一个固定终点；
- 两席每次只点击一个目标星，线段起点永远是当前线头，不依赖拖拽精度；
- A 接第 1/3/5/7/9 根，B 接第 2/4/6/8/10 根，双方各完成 5 根；
- 已接目标边不能重复，新线不能与已接线产生非法内部相交或共线重叠；
- 目标图有且只有 4 条完整接线顺序；虽然属于目标轮廓、但会让剩余边无解的选择，在提交前返回 `future-stranded`；
- 失败不移动线头、不换席、不写入完成前缀，重试当前接头；
- 完成页只记录“我们把同一束星光交了十次”，不排名、不比较个人失误。

它补上仓库尚缺的“公开图上的 Euler 边覆盖 + 几何相交 + 双席交替”样板，与纸上球局的图上对抗、线框占地的闭格计分和星码解锁的静态图案解锁都有明确差异。

## 2. 候选比较

本轮同时审计 C18、C19 与 C20：

| 候选 | A 级可行性 | 机制增量 | 主要风险 | 本轮结论 |
| --- | --- | --- | --- | --- |
| C18 星座接线员 | 很高 | Euler 边覆盖、当前线头、整数几何相交、可解前缀、轮流构造 | 任意连点会失去胜利边界；星空视觉容易撞车 | **采用**，冻结为双翼星鸢接线板 |
| C19 影子双人舞 | 高 | 双席姿势组合与节拍点 | 与四手和声、慢一点和拉链的同步时间窗相邻；剪影资产量较大 | 后续候选 |
| C20 太空舱对接 | 高 | 一席旋转、一席推进的连续协作 | 与轨道、纸飞机、搬家和平衡运输的物理控制相邻；帧率与碰撞 Gate 更重 | 后续候选 |

## 3. Brainstorm：四个方向与取舍

### 方向 A：自由连任意两颗星

两人随意画线，只要不相交就继续。它缺少可判定的目标：简单点集通常存在大量非交叉路径，最终轮廓也无法从规则中证明。

**结论：不采用。** 自由创作可以作为未来增强，不承担本作胜利条件。

### 方向 B：照着编号连点

星点直接写 1–10，两人轮流点下一个编号。它能稳定完成，但规划被编号替代，不相交也成为没有决策价值的装饰规则。

**结论：不采用。** 页面公开目标轮廓，不公开边顺序。

### 方向 C：访问每颗星一次的 Hamiltonian 路径

固定起终点，在候选边图中访问每颗星一次。它能产生路线题，但原始创意强调“线段共同拼出轮廓”，而不是“星点都到访”；目标边难以成为完成纪念物。

**结论：不采用。** 保留其有限状态搜索思路，不采用顶点覆盖目标。

### 方向 D：每根目标线恰用一次的 Euler 接线

目标图是一只双翼星鸢：尾线、左右两个四边翼环和中间桥。玩家从尾线轴出发，一笔接完全部目标边并在东侧枢纽收尾；西翼、东翼各可顺时针或逆时针。

**结论：采用，进入规格冻结。**

## 4. 冻结点集与目标轮廓

规则坐标全部使用 `viewBox="0 0 1000 1000"` 内的安全整数，CSS 像素与设备比例不参与裁决。

| 点 ID | x | y | 作用 |
| --- | ---: | ---: | --- |
| `spool` | 350 | 900 | 固定起点 / 尾线轴 |
| `west-hub` | 350 | 520 | 西翼枢纽 |
| `west-top` | 220 | 330 | 西翼上点 |
| `west-tip` | 70 | 520 | 西翼尖端 |
| `west-bottom` | 220 | 710 | 西翼下点 |
| `east-hub` | 650 | 520 | 东翼枢纽 / 固定终点 |
| `east-top` | 780 | 330 | 东翼上点 |
| `east-tip` | 930 | 520 | 东翼尖端 |
| `east-bottom` | 780 | 710 | 东翼下点 |

十根无向目标边：

1. `spool ↔ west-hub`；
2. `west-hub ↔ west-top`；
3. `west-top ↔ west-tip`；
4. `west-tip ↔ west-bottom`；
5. `west-bottom ↔ west-hub`；
6. `west-hub ↔ east-hub`；
7. `east-hub ↔ east-top`；
8. `east-top ↔ east-tip`；
9. `east-tip ↔ east-bottom`；
10. `east-bottom ↔ east-hub`。

目标卡公开点位、完整轮廓、起点和终点，但不显示接线顺序。生产棋盘只持续显示星点、当前线头与已经接好的线；聚焦某颗星时可显示一根不提交状态的 ghost 线。

## 5. 四条完整路线与合作必要性

点度数依次为 `[1, 4, 2, 2, 2, 3, 2, 2, 2]`。只有 `spool` 与 `east-hub` 是奇度点，因此完整 Euler 路径必须从前者开始、在后者结束。

- 尾线是强制第一根；
- 中间桥是割边，必须完成西翼后才能通过；
- 西翼有顺/逆两个方向；
- 东翼有顺/逆两个方向；
- 所以完整路线严格为 `2 × 2 = 4` 条。

前缀解数的关键断点：

| 前缀 | 后缀解数 |
| --- | ---: |
| 初态 | 4 |
| 接好尾线 | 4 |
| 接好尾线后立刻过桥 | 0 |
| 进入西翼任一方向 | 2 |
| 完成西翼 | 2 |
| 通过桥 | 2 |
| 进入东翼任一方向 | 1 |
| 全部完成 | 1 |

合作必要性由规则而非身份监控证明：第 `i` 根线的席位严格由完成前缀长度派生；任一 action 最多追加一根线；完成态必须恰有 10 条连续记录，因此 A、B 各有且只有 5 条。现实中是否由两个人操作仍属于同机信任边界，README 必须如实说明。

## 6. 相交与失败边界

几何采用整数叉积，不用 SVG 像素命中或浮点 epsilon。

允许：

- 相邻线共享当前星点；
- 两线在共同端点相遇，但内部没有重叠；
- 同一直线向相反方向从共同端点离开，且内部不重叠。

拒绝：

- 两条线在各自内部正常穿越；
- 新线穿过已有线端点，但该点不是新线端点；
- 共线正长度重叠；
- 新线包含已有线内部，或被已有线包含。

从 `spool → west-hub → west-top → west-tip` 后尝试 `west-tip → east-top`，会穿过 `west-hub → west-top`，必须优先返回 `wire-crossed`。接好尾线后立刻 `west-hub → east-hub` 属于目标边但使后缀无解，返回 `future-stranded`。其他非目标且不穿线的连接返回 `off-outline`；已经使用的无向目标边返回 `edge-used`。

所有失败均保持相同当前线头、席位和已完成前缀；`RETRY_EDGE` 才增加当前尝试编号。错误尝试不立即泄露正确下一颗星或四条完整路线。

## 7. 状态机与实现草案

建议七阶段：

1. `intro`：规则、目标卡与两席分工；
2. `handoff`：公开棋盘保留，当前席确认接手；
3. `choosing`：当前席从当前线头选择目标星；
4. `edge-result`：成功线已原子提交，主动交给下一席；
5. `jammed`：显示 `wire-crossed / off-outline / edge-used / future-stranded`，重试同一席；
6. `constellation-result`：第十根已提交，显示完整双翼星鸢；
7. `complete`：共同接线记录、5/5 席位摘要与配置结语。

候选动作：`START`、`TAKE_OVER { seat }`、`CONNECT { seat, fromId, toId }`、`RETRY_EDGE`、`NEXT_TURN`、`FINISH`、`RESTART`。

规则层建议导出：`countCompletions(cursorId, usedEdgeIds)`、`classifySegmentIntersection(...)`、`evaluateConnection(...)`、`createInitialState()`、`reduce()`、`getPublicView()`。页面不得复制目标边、相交判定、当前席或后缀求解。

## 8. 本地实现与输入边界

- 经典脚本 `logic.js → config.js → app.js`，CommonJS/浏览器双出口；
- 纯 HTML、CSS、SVG 与原生 button，不引入 Canvas/Paper.js/D3 或第三方包；
- SVG 只承担已接线、ghost 线和背景标记；9 颗星用稳定存在的绝对定位 HTML button，命中盒至少 44×44px；
- click/tap 是权威输入；当前起点固定，因此不强制拖拽，也不需要 pointer capture；
- 键盘采用棋盘内 roving tabindex：方向键按几何邻近星移动焦点，Enter/Space 接线，Escape 清预览；
- 全局键盘入口先拒绝 repeat、Ctrl/Meta/Alt 和 editable target，再决定是否 `preventDefault()`；
- 不读取 `Date`、随机数、网络、存储、音频或动画帧；
- 图片失败时仍保留纯色接线板、星点按钮、目标轮廓和完整玩法；
- 双击 `index.html` 可完整游玩，属于 A 级。

## 9. 开源项目审计与借鉴声明

本轮只研究固定版本中的抽象机制，没有复制源码、算法实现、测试、数据、坐标、星座名称、DOM、样式、图片、音频、字体或文案。正式实现保持零第三方运行依赖；若未来实际复用任何代码，必须按对应许可证保留版权与许可原文，并撤销“零复制”结论。

| 项目 | 固定版本与许可证 | 仅研究的抽象点 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [remarkablegames/cross-link](https://github.com/remarkablegames/cross-link/tree/97e2d01b2b27371c4f09763563be358c15197faf) | tag `v1.0.0` / commit `97e2d01b2b27371c4f09763563be358c15197faf`；MIT；Copyright (c) 2026 Menglin “Mark” Xu | 星点点击、连线次序影响后续、星座作为点线谜题叙事 | 源码、Kaplay/Vite 架构、关卡、点位、UI、动画、音频、素材与“交叉消除”规则；其玩法鼓励交叉，本作恰好相反 |
| [mikolalysenko/robust-segment-intersect](https://github.com/mikolalysenko/robust-segment-intersect/tree/cbf20e2abbb22bda5b7919823f58c856ab6ac403) | commit `cbf20e2abbb22bda5b7919823f58c856ab6ac403`；MIT；Copyright (c) 2013 Mikola Lysenko | 封闭线段相交、端点与共线边界需要显式测试 | `segseg.js`、`robust-orientation` 依赖、控制流、测试数据和包结构 |
| [paperjs/paper.js](https://github.com/paperjs/paper.js/tree/92775f5279c05fb7f0a743e9e7fa02cd40ec1e70) | commit `92775f5279c05fb7f0a743e9e7fa02cd40ec1e70`；MIT；Copyright (c) 2011–2020 Jürg Lehni & Jonathan Puckey | 输入、几何规则和渲染层分离；相交结果结构化表达 | PaperScript、Curve/PathItem 算法、API、Canvas/SVG 抽象、示例、测试和视觉 |
| [networkx/networkx](https://github.com/networkx/networkx/tree/e6dda2927abffecb7f5328b0905331bb158c6cfb) | commit `e6dda2927abffecb7f5328b0905331bb158c6cfb`；BSD-3-Clause；Copyright (c) 2004–2026 NetworkX Developers；许可证列出 Aric Hagberg、Dan Schult、Pieter Swart | Euler 路径的“每条边恰好一次”、连通与奇度点检查 | Python 实现、图容器、装饰器、迭代器、测试和文档表述 |
| [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial/tree/7e720a3de062059d4c5400a379146a601d9010e0) | commit `7e720a3de062059d4c5400a379146a601d9010e0`；BSD-3-Clause；Copyright (c) 2015 Olaf Frohn | 星点、连线拓扑、标签与样式分别作为数据层 | 天文坐标、真实星座数据、名称、边界、投影、D3 实现、样式与全部 `data/` |

另排除 Vanta.js：虽为 MIT，但依赖 WebGL/Three.js 或 p5.js，随机动态背景与额外效果来源不适合确定性的 A 级轻 HTML；本作不复制其 NET 效果、着色器、粒子布局、参数或画廊视觉。

### 本作借鉴声明建议文本

> 本作的规则、代码、关卡、点位、连线、界面、文案与生成式视觉资产均为独立实现。开发前曾研究 Cross-Link 的星点连接与次序规划、robust-segment-intersect 的相交边界、Paper.js 的输入/几何/渲染分层、NetworkX 的 Euler 路径定义，以及 d3-celestial 的星点数据分层；未复制这些项目的源码、算法实现、测试、数据集、天文坐标、素材或界面。固定版本、许可证、版权主体与排除范围见 `docs/166-constellation-relay-research.md`。

## 10. 浏览器标准与可访问性

- 鼠标、触控笔和触屏统一依据 W3C [Pointer Events Level 3](https://www.w3.org/TR/2026/REC-pointerevents3-20260630/)；主操作只需离散 click/tap；
- 点线图使用 SVG 2 的 `line/polyline` 作为纯表现层，真实交互目标使用 HTML button；
- 键盘物理方向和 Enter/Space 语义以 W3C UI Events / HTML 原生 button 行为为基础；
- 语义、焦点、颜色之外的信息、触控目标和降动效以 [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 为验收基线；
- live region 只播有效接线、失败原因、换席和完成，不逐次播报 hover/ghost；
- 另提供有序线段日志，使屏幕阅读器不需要从 SVG 图像推断接线路径。

## 11. 视觉方向与布局 Gate

视觉采用“观测站夜班接线板”，而不是另一张占星海报：

- 哑光暗梅与石墨面板、瓷白插孔、安全橙与薄荷绿导线；
- 窄体无衬线和等宽小标注，禁用仓库已饱和的黄铜同心圆、大宋体、墨蓝星盘；
- 棋盘是唯一主视觉，顶部只保留两席轮值、`已接 x/10` 和简短规则；
- 两席使用颜色 + 端帽/线型双编码；完成后转为瓷白共同轮廓，同时保留每段小席位记号；
- ImageGen 只生成观测站接线台背景、双翼星鸢完成纪念图和必要材质，不把星点、规则、轮值、按钮或答案烘焙进图片。

响应式 Gate：

| 视口 | Gate |
| --- | --- |
| 1504×1046 | 无横纵滚动；完整棋盘、轮值、说明和主动作同屏；棋盘 620–760px |
| 1280×800 | 无横向滚动；棋盘不小于 520px，标题、轮值、完整棋盘和当前动作同屏 |
| 390×844 | 内容宽约 366px；棋盘 350–366px 完整不裁切；星命中盒至少 44px；主动作至少 48px |
| 320×568 | 内容宽 300–304px；棋盘不低于 296px；零横向溢出，允许必要纵滚；星命中盒仍至少 44px |

所有视口还要检查 200% zoom、reduced-motion、forced-colors、图片阻断与每颗星中心的 `elementFromPoint` 命中归属。

## 12. 风险与进入规格的 Gate

| 风险 | 规格前冻结处理 |
| --- | --- |
| 接桥过早导致最后才发现死局 | evaluator 在提交前运行后缀计数，返回 `future-stranded` |
| 相交语义由视觉像素决定 | 固定整数叉积；共享端点、端点穿越、共线重叠分别测试 |
| 目标边公开后玩法太轻 | 不显示边顺序；保留西翼/东翼两个方向选择和过桥时机规划，不增加随机或倒计时 |
| 星点按钮在 320px 互相覆盖 | 星点使用稳定 44px HTML button；关卡固定坐标进入最小中心距与 `elementFromPoint` Gate |
| SVG 伪按钮读屏与焦点不稳 | SVG 只画线；HTML button 承担交互、焦点和 aria-label |
| 星空视觉撞车 | 采用维修接线板的暗梅/石墨/瓷白/安全橙/薄荷体系，不复用星码解锁构图 |
| 一个人操作两席 | 明示同机信任边界；规则只证明两席权限和 5/5 贡献，不做身份识别 |
| 开源星图数据权利复杂 | 使用原创虚构点位与名称，排除 d3-celestial 的全部真实天文数据 |

## 13. 推荐进入下一阶段

下一步冻结题名“把星光，一笔一笔交给你”、目录 `constellation-relay`、9 点/10 边双翼星鸢、4 条完整路线、七阶段 reducer、整数相交分类、`edge-used / wire-crossed / off-outline / future-stranded`、公开 view、10 段日志、5/5 完成摘要与验收矩阵。之后生成桌面接线态、移动交接态、桌面完成态概念，以及原创生产背景和完成纪念资产。调研阶段不引入任何依赖。
