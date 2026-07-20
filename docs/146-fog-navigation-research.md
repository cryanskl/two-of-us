# A 级“雾里，跟着你走”定向调研

- 日期：2026-07-20
- 创意来源：创意池 C09“迷雾领航”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`fog-navigation`
- 冻结标题：`雾里，跟着你走`
- 结论：进入规格；采用“领航员限时看完整安全图 → 遮盖交接 → 驾驶员只看局部雾窗并听口述移动”的原创热座合作玩法

> ID 注记：本文件的 C09 指 [`40-idea-backlog.md`](./40-idea-backlog.md) 中的创意池编号。[`60-local-first-second-pass-research.md`](./60-local-first-second-pass-research.md) 也有一套独立的来源编号，其中 C09 是 `js_thrustvector`，两者没有继承关系。

## 1. 为什么选择它作为下一款

候选审计比较了 C09“迷雾领航”、S09“夸夸老虎机”和 V08“爱心投石器”。

| 候选 | A 级可行性 | 相对已有作品的机制增量 | 主要风险 | 本轮结论 |
| --- | --- | --- | --- | --- |
| C09 迷雾领航 | 很高 | 限时私有空间信息、局部观察、口述导航、热座换角 | 同屏泄密、退化成普通迷宫、与“为你引航”重叠 | **本轮采用** |
| S09 夸夸老虎机 | 很高 | 三列语义组合与有限次惊喜合成 | 与约会转盘、未来签等随机揭晓相邻 | 后续优先候选 |
| V08 爱心投石器 | 高 | 对称回合、反弹和等机会 volley | 与纸飞机投递的角度/力度弹道相邻 | 后续候选 |

仓库已有“为你引航”的实时同屏灯塔/小船，以及“把信号接回来”的面对面规则/星路推理，但还没有作品把**完整空间信息临时交给一人，并在交接后从公开页面彻底移除**。这款作品新增四个可复用能力：

1. 阶段所有权：完整地图只在 `briefing` 阶段存在；
2. 局部观察：驾驶员只收到以当前位置为中心的固定小窗；
3. 口述合作：安全方向、地标和陷阱只能由领航员转述；
4. 对称换角：四轮中每人各领航两次、驾驶两次。

## 2. Brainstorm：三种产品方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 持续分屏：左边完整图、右边局部图 | 双方同时操作、随时核对 | 拒绝；同一块屏幕没有可信的信息边界，驾驶员余光即可读全图 |
| 热座：限时完整图 → 遮盖交接 → 局部驾驶 | 一人记路线并口述，另一人按局部地标移动 | **采用**；A 级直开且合作信息差最清晰 |
| 双设备：领航端持续全图、驾驶端持续局部图 | 两台手机实时协作 | 作为未来 C 级增强；首版不增加房间协议与设备准备成本 |

首版不加入随机迷宫、计时驾驶、排行榜、生命值、联网房间、语音识别、GPS、陀螺仪、存档、地图编辑器、AI 提示或商业游戏素材。最小实现只做四张固定原创地图与一条闭合体验链。

## 3. 与已有作品的边界

### 3.1 不重复“为你引航”

“为你引航”是持续同屏的实时物理合作：灯塔玩家不断显露暗礁并给港口通航许可，船手驾驶有惯性的船。新作必须保持以下差异：

- 网格离散移动，不做船舶惯性、扇形光束或港口靠泊；
- 完整地图只在短暂 briefing 出现，驾驶阶段不保留；
- 领航员在驾驶阶段没有页面控制，价值来自记忆与口述；
- 驾驶员面对局部路口和雾中地标，不是连续避障。

### 3.2 不重复“把信号接回来”

“把信号接回来”让双方分别读取星路和规则并选择唯一分支。新作不使用条件优先级、候选卡或倒计时推理，改为：

- 领航员看到完整空间拓扑、起终点、地标与危险；
- 驾驶员看到真实当前位置附近的地形，但看不到远处拓扑和危险标记；
- 答案是一串可执行移动，不是一次选择题；
- 错误进入雾陷阱后温和回到 briefing，再次沟通即可。

## 4. 冻结体验闭环

```text
intro：介绍“看图的人不碰方向，走路的人不看全图”
→ briefing：领航员独自看完整安全图 7 秒
→ cover：完整图从 DOM 移除，显示中性遮盖页并交接设备
→ driving：驾驶员只看 5×5 局部雾窗，领航员口述方向
→ round-result：到达灯塔，显示本轮共同路径摘要
→ swap：交换角色进入下一张地图
→ complete：四轮完成，显示两人各领航/驾驶两次的共同结语
```

默认文案方向：

```text
雾里，跟着你走
你记住整条路，我只看见脚边。
说慢一点，我会一步一步跟上。
走错了也没关系，我们再看一次。
四段雾路，都有人记得回家的方向。
```

## 5. 私有信息与 DOM 边界

本作是单设备热座，不声称抵抗开发者工具或蓄意窥屏；它提供的是正常游玩时的阶段隐私。

必须满足：

- `briefing` 只渲染领航员视图，不渲染驾驶按钮；
- 进入 `cover` 前使用 `replaceChildren()` 移除完整地图节点；
- 完整地图不得藏在 `hidden`、`display:none`、`aria-hidden`、`data-*`、CSS 自定义属性或可读替代文本中；
- `driving` 的公开 view 只含局部格、当前位置、公开地标和已走步数；
- 陷阱类型、远处墙体、安全路线和完整地图不进入驾驶 DOM；
- 页面生命周期进入 hidden/blur 时，briefing 自动转入遮盖，不延长或后台补算看图时间；
- 轮次完成或重开时清空上一轮私有 view 和 live region。

关卡数据仍会存在经典脚本内，所以熟悉源码的人可以查看；README 要诚实说明该边界。首版目标是情侣面对面正常交接，不是防作弊竞赛或安全容器。

## 6. 最小规则模型

### 6.1 固定地图

四轮使用四张人工设计的矩形网格，建议由 `#` 墙、`.` 安全地、`S` 起点、`G` 终点、公开地标与隐藏陷阱组成。每张地图包含：

```js
{
  id,
  title,
  navigatorSeat,
  rows,
  landmarks: [{ id, cell, label, symbol }],
  hazards: [{ id, cell, clue }],
  localRadius: 2,
  briefingSeconds: 7
}
```

地图、地标、陷阱和配置必须递归冻结。首版不使用 `Math.random()`；每次重玩保持同一轮序，以便复现、测试和两人复盘。

### 6.2 驾驶动作

- 每次只接受 `up/down/left/right` 一格移动；
- 墙和边界不移动，只给中性“前面走不通”反馈；
- 进入安全格更新当前位置与路径；
- 进入隐藏陷阱立刻进入 `retry`，不显示责备、扣分或失败排名；
- 到达终点原子进入 `round-result`；
- 驾驶阶段没有倒计时，让口述和确认保持从容。

### 6.3 局部视野

驾驶员看到以当前位置为中心的固定 `5×5` 窗口：

- 窗口外一律是雾，不随已探索历史永久揭开；
- 窗口内显示墙、可走地、当前位置和公开地标；
- 陷阱格在驾驶 view 中伪装成普通可走地；
- 终点只在进入局部窗口后可见；
- 视野由规则层 `getDriverView(state)` 派生，渲染层不能自行读取关卡原图。

这种“固定局部窗”比逐步清除全局迷雾更适合首版：不会在后半程积累出完整地图，也不需要 Canvas 像素擦除或探索存档。

## 7. 合作必要性与可解证明

每张地图必须自动验证：

1. 从 `S` 到 `G` 至少存在一条不经过 hazard 的安全路径；
2. BFS 得到的最短安全路径长度在冻结范围内，避免过短或拖沓；
3. 至少一个关键路口的两个候选分支在驾驶员首次看见时拥有相同局部 `5×5` 投影；
4. 其中一个分支后续进入陷阱或死路，另一个通向安全路线；
5. 因此只依据当前局部 view 的确定性驾驶策略，无法在该关键点区分安全分支；
6. 每轮有至少两个可口述地标，领航员可以用“花后左转”而不必背坐标；
7. 四轮角色计划固定为 A 领航、B 领航、A 领航、B 领航，让每人各承担两次完整信息责任。

“合作必要性”是产品与测试 Gate，不意味着禁止玩家记住重玩过的固定地图。首次游玩的信息差成立即可；重玩更像共同复盘。

## 8. 建议状态机与纯逻辑 API

```text
intro
  └─ START → briefing
briefing
  ├─ TICK until 0 → cover
  └─ HIDE / BLUR → cover
cover
  └─ DRIVER_READY → driving
driving
  ├─ MOVE(wall) → driving
  ├─ MOVE(safe) → driving
  ├─ MOVE(hazard) → retry
  └─ MOVE(goal) → round-result
retry
  └─ REVIEW → briefing（同一轮、重新计时）
round-result
  ├─ NEXT → briefing（下一轮交换角色）
  └─ after round 4 → complete
complete
  └─ RESTART → intro
```

建议权威状态：

```js
{
  phase,
  roundIndex,
  navigatorSeat,
  driverSeat,
  briefingTicks,
  position,
  path,
  attempt,
  bumpCount,
  completedRounds,
  revision
}
```

公开逻辑 API 至少包括：

- `validateLevel(level)`、`findSafePath(level)`；
- `createInitialState(config?)`、`start(state)`；
- `tickBriefing(state)`、`cover(state, reason)`、`driverReady(state)`；
- `move(state, direction)`、`review(state)`、`nextRound(state)`、`restart(state)`；
- `getNavigatorView(state)`、`getPublicView(state)`、`getDriverView(state)`；
- `analyzeCooperationGate(level)`。

合法状态上的非法动作返回同一引用；畸形状态通过公开动作安全回到初始态。状态、view、summary 和关卡必须与调用方断开引用并递归冻结。

## 9. A 级本地运行与依赖结论

建议作品结构：

```text
experiences/co-op/fog-navigation/
├── index.html
├── styles.css
├── config.js
├── levels.js
├── logic.js
├── logic.test.js
├── app.js
├── assets/
├── README.md
└── ATTRIBUTION.md
```

所有脚本按序使用经典 `<script>`；不用 ES module、npm 运行依赖、`fetch`、XHR、WebSocket、Worker、Service Worker、浏览器存储、远程字体、CDN、账户或服务端。局部视野可以用语义 DOM 网格实现，背景资产失败后仍可依靠 CSS、文字和原生按钮完成四轮。

因此本作不需要新增或统一第三方运行依赖，也不改变现有安装器。作品目录单独复制后仍可直接双击 `index.html`。

## 10. 固定开源调研与借鉴声明

核验日期：2026-07-20。下列来源只用于理解一般机制、算法边界和测试方法，不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [rot.js v2.2.1](https://github.com/ondras/rot.js/tree/46782e248c2db9d379a5e4f13bb8323f18dff04b) | annotated tag object `55f487ca0384c9a10d19a705504c83def21654a1`，解引用 commit `46782e248c2db9d379a5e4f13bb8323f18dff04b`；BSD-3-Clause；Copyright 2012-now Ondrej Zara | 网格地图、路径和 field-of-view 应被分成独立抽象 | FOV、地图和寻路源码，API、算法实现、测试、示例、参数、文档、图标、字体与构建产物 |
| [TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) | commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`；MIT；Copyright 2026 tridpt | `mazecoop.js` 展示双人合作迷宫需要明确分工与共同目标 | 六张地图、双出口、压力板、拉杆、门、移动/渲染源码、DOM/CSS、存储、网络、音效、emoji、文案与素材 |
| [Amazeing v1.4.1](https://github.com/Ijee/Amazeing/tree/10daea21682eb3a868a03043452c8254178b8504) | tag 与 commit 均为 `10daea21682eb3a868a03043452c8254178b8504`；MIT；Copyright 2021 Thorsten Schulz | 生成与遍历算法应分层，并用 Playwright 覆盖常见流程；BFS 可用前驱链证明路径 | Angular 应用、BFS 与 21+ 算法实现、数据结构、测试、文章、UI、图标、截图、资产、PWA 和构建配置 |

借鉴声明：本作只借鉴“网格、局部观察、路径证明、双人合作需要角色差异”这些抽象问题。地图、陷阱、地标、规则模型、状态机、算法实现、测试、DOM、CSS、文案和视觉资产全部在本仓库重新设计；不会复制上游代码或素材。即便许可证允许复制，首版仍执行零复制策略。

若实现阶段实际引入任何实质代码、参数、地图、文章段落或素材，必须先修改本调研与作品 `ATTRIBUTION.md`，加入许可证正文和文件级边界，再重新验收；不能沿用本节的“零复制”结论。

## 11. 明确排除的来源

| 来源 | 排除原因 | 可以保留的结论 |
| --- | --- | --- |
| [wblachut/fog-of-war `1e2c17c`](https://github.com/wblachut/fog-of-war/tree/1e2c17c332307b0f112895114b9dadc0db2b948f) | 仓库未找到许可证；README 明示视觉使用 Heroes of Might & Magic III 主题及第三方游戏资产；运行依赖 React、Vite、Konva 等 | 仅把“双 Canvas 像素揭雾会增加依赖和测试复杂度”作为反例，不复制任何源码、素材、样式、页面结构或文案 |

“公开可见”不等于“允许复制”。GitHub 关于[为仓库添加许可证](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository)的说明也将许可证作为明确授予使用、修改与分发权限的载体；本项目对无许可证来源执行不复制策略。

## 12. 视觉与无障碍方向

- 视觉语义是“夜雾中的手绘折叠地图”，不是军事雷达、商业 Roguelike 或奇幻战争地图；
- briefing 使用暖色纸图、铅笔路线、柔和地标章和清晰安全/危险图例；
- cover 使用一张不可透视的折叠布封面，只显示交接对象和“我准备好了”；
- driving 使用深蓝雾窗与高对比路径格，局部地图不得靠透明度泄露远处轮廓；
- 当前位置、墙、地标、终点同时使用形状、符号和文字，不只靠颜色；
- 方向控制使用原生按钮，触控目标至少 48×48px，并支持方向键；
- live region 只播报撞墙、到达地标、进入陷阱、换角与完成，不逐格朗读整张局部图；
- `prefers-reduced-motion` 关闭雾漂移和交接转场，但不改变 7 秒 briefing、地图、动作或结果；
- forced-colors、200% 文本、禁背景图下仍可辨认 5×5 网格和所有主动作；
- 1280×800 开场和驾驶主动作首屏可见；390×844 与 320×700 不横向溢出。

视觉实现前必须先生成并查看桌面 briefing、移动 driving 和桌面 complete 三个完整概念，冻结组件、令牌、生产资产和 fidelity ledger，再写前端代码。

## 13. 准备者可参与的业务策略

`config.js` 后续只预留两处温和个性化：双方显示名，以及 `composeCompletionNote(summary)`。完成策略只收到冻结的四轮摘要，返回一段共同结语；空白、非字符串、超长、抛错或修改 summary 时安全回退。

准备者可以在 5–10 行里写成两个人熟悉的方向感玩笑，但该函数不能改变地图、角色顺序、briefing 时间、陷阱、完成条件或隐私阶段。默认配置无需修改即可完整游玩。

## 14. 必须通过的 Gate

### 逻辑

1. 四张地图 schema、字符、尺寸、ID、起终点、地标和陷阱完整合法并递归冻结；
2. BFS 证明每张地图至少有一条安全路径，最短路径长度符合关卡范围；
3. 关键分叉局部投影相同而后果不同，合作必要性分析对四关均通过；
4. 墙、边界、安全格、陷阱和终点五种移动结果分别正确；
5. briefing 恰在目标 tick 后进入 cover，hidden/blur 立即遮盖且不后台补时；
6. cover 和 driving 的 public view 不含完整行、远处墙、危险位置或安全路径；
7. 四轮角色对称，重试不偷换角色，重开清除路径、尝试与旧摘要；
8. 合法状态非法动作保持同一引用，畸形输入安全回退且不抛异常；
9. 30/60/120/144Hz 调度、viewport 和 reduced-motion 不改变相同动作序列的 state hash。

### 静态与隐私

1. 双击 `index.html` 可玩，按序经典脚本，无 module 和远程 URL；
2. 不调用网络、存储、随机、共享运行时或硬件权限；
3. 完整地图只在 briefing DOM 存在，交接时真实移除；
4. 驾驶 DOM、属性、替代文本与 live region 不泄露危险格或远处拓扑；
5. README 和 ATTRIBUTION 独立列出三份固定来源、许可证、权利主体、零复制声明与排除来源；
6. 背景失败、forced-colors、reduced-motion 和键盘-only 仍能完成四轮。

### 浏览器

1. 完成一轮纯键盘、一轮纯点击和两轮混合输入；
2. 实测 7 秒自动遮盖、手动交接、撞墙、陷阱重看、角色交换和四轮完成；
3. 用 DOM 快照确认 cover/driving 不存在完整地图或危险坐标；
4. 1440×900、1280×800、390×844、320×700 无横向溢出，主动作可达；
5. 最新概念与最终截图都用原尺寸查看并记录 fidelity 差异；
6. 控制台 0 error，资源全部来自作品目录。

## 15. 下一步

进入规格阶段，冻结四张地图、字符 schema、局部投影等价判定、状态 API、briefing tick、配置策略、错误文案和完整验收向量；随后再生成视觉概念与实施计划。调研完成不代表允许直接编码，规格中的地图证明与阶段隐私必须先通过审查。
