# A 级「这一格归谁」实现规格

> 规格日期：2026-07-18；上游调研见 [`69-dots-and-boxes-research.md`](./69-dots-and-boxes-research.md)。本规格冻结首版产品、状态、DOM、视觉、来源与验收边界。

## 1. 产品边界

| 项目 | 冻结结论 |
| --- | --- |
| 作品名 | 这一格归谁 |
| 目录 ID | `dots-and-boxes` |
| 主分类 | `versus` 双人对抗 |
| 启动等级 | A，直接双击本目录 `index.html` |
| 人数 / 设备 | 2 人 / 单设备轮流 |
| 棋盘 | 固定 4×4 方格、5×5 点、40 条边 |
| 胜负 | 16 格全部归属后，高分者胜；允许 8–8 平局 |
| 公网 / 存储 | 无网络、无 Cookie、无本地存储；刷新清空 |
| 首版不做 | AI、联网、尺寸选择、撤销、计时、长期战绩、音频、震动、粒子庆祝 |

作品目录：

```text
experiences/versus/dots-and-boxes/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
└── assets/
    ├── paper-texture.png
    └── ATTRIBUTION.md
```

运行时不引用 `shared/`、其他作品目录、远程地址或 Module；完整目录单独复制后仍能 `file://` 运行。

## 2. 配置合同

`config.js` 暴露递归冻结的经典全局：

```js
globalThis.DOTS_AND_BOXES_CONFIG = {
  playerNames: ["朱方", "蓝方"],
  composeResult({ winnerIndex, playerNames, scores }) {
    return null;
  },
};
```

### 2.1 配置清洗

- 只接受精确键 `playerNames / composeResult`；
- `playerNames` 必须恰有两个不同字符串，各自去首尾空白后 1–8 个 Unicode 字符；
- `composeResult` 必须是函数；
- 任一基础字段不合法时整份回退默认配置；
- 配置、上下文、返回值和状态都复制后递归冻结，不共享调用方数组或对象；
- `composeResult` 只在终局求值，收到冻结上下文；合法返回为 `{ title, body }`，标题 1–24 字、正文 1–60 字；
- 返回 `null`、抛错、额外字段或非法文本时使用内置中性文案。

默认终局文案：

- 胜局：`{获胜方}赢下这一页` / `最后一格也有归属了。`；
- 平局：`这一页平分秋色` / `最后一格落下，谁也没有少一分。`。

`composeResult` 是准备者可写的 5–10 行私人语气入口，只能改变结果措辞，不能改变分数、胜负、回合或棋盘。

## 3. 规范 ID

### 3.1 边

```text
H:r:c  r=0..4, c=0..3
V:r:c  r=0..3, c=0..4
```

- `H` 从 `(r,c)` 水平连到 `(r,c+1)`；
- `V` 从 `(r,c)` 垂直连到 `(r+1,c)`；
- 格式、整数、范围任一不合法即非法边；
- `getAllEdgeIds()` 固定按视觉行优先顺序返回 40 个唯一 ID，供 DOM、焦点与测试共用。

### 3.2 方格

```text
B:r:c  r=0..3, c=0..3
```

方格 `B:r:c` 的四边固定为：

```text
H:r:c
H:r+1:c
V:r:c
V:r:c+1
```

`getAdjacentBoxIds(edgeId)` 只返回合法且真正邻接该边的 1–2 个方格 ID；返回顺序固定为上/下或左/右。

## 4. 状态合同

公开状态精确包含：

```text
phase             intro | playing | finished
starter           0 | 1
currentPlayer     0 | 1
playerNames       [string, string]
moves             [{ edgeId, player }]
boxes             [{ id, owner }]
scores            [integer, integer]
moveNumber        non-negative integer
lastMove          null | { edgeId, player, capturedBoxIds, kind }
revision           non-negative integer
```

约束：

- `moves` 是按实际时间顺序保存的唯一落边历史；每项只含规范 `edgeId` 与当手 `player`，edgeId 不得重复；
- 公开 state 不保存 `Set` / `Map`；内部计算时可以从冻结 moves 临时构造集合；
- `boxes` 固定 16 项，按 `B:0:0 ... B:3:3` 排序；owner 为 `null / 0 / 1`；
- 分数必须恰等于双方 owner 方格数，分数和等于已占格数；
- `moveNumber === moves.length`，范围为 0–40；
- 每项 `player` 必须等于重放到该手之前的当前玩家；
- `currentPlayer` 在 finished 仍保留完成最后一步的玩家；
- `lastMove` 的 edge、player、捕获格与当前状态相符；
- `replayMoves(starter, moves)` 必须从空盘完整重放，并与 state 的 `boxes / scores / currentPlayer / lastMove / phase` 逐项一致；局部字段看似合理但重放不一致的状态仍属畸形；
- 任意嵌套对象递归冻结；
- 公开动作收到畸形状态时回到默认安全初态，不抛异常。

### 4.1 初态

```text
phase = intro
starter = 0
currentPlayer = 0
moves = []
boxes = 16 个 owner:null
scores = [0,0]
moveNumber = 0
lastMove = null
```

### 4.2 `start(state)`

- 只在 intro 生效，进入 playing；
- 不预落边、不改变首发者；
- 其他合法阶段返回原引用。

### 4.3 `claimEdge(state, edgeId)`

- 只在 playing 且 edgeId 合法、未使用时生效；
- 按时间追加 `{ edgeId, player: currentPlayer }`，moveNumber 加一；
- 只检查邻接方格；本步新闭合的 0–2 格归当前玩家；
- 捕获 0 格：`kind = "switch"`，换到另一玩家；
- 捕获 1 格：`kind = "capture-one"`，加 1 分，当前玩家继续；
- 捕获 2 格：`kind = "capture-two"`，加 2 分，当前玩家继续；
- 16 格全部归属：phase 立即变 finished，`kind = "finished"`；
- 重复、越界、错误阶段或非字符串 edgeId 返回原引用。

一步同时闭合两格时：moveNumber 只加一，moves 只追加一项，两个方格归同一玩家，分数加二，回合不切换。

### 4.4 `restart(state)`

- 只在 finished 生效；
- `starter = 1 - previousStarter`，`currentPlayer = starter`；
- 返回新的 intro，清空边、格、分数、步数与上一手；
- playerNames 保留；revision 单调增加；
- 其他合法阶段返回原引用。

### 4.5 `getViewModel(state)`

只返回 UI 所需派生值；其中 `edges` 是从 moves 派生并按 `getAllEdgeIds()` 排序的冻结占边投影，不在 state 维护第二份真值：

```text
phase, starter, currentPlayer, currentPlayerName
playerNames, scores, moveNumber
remainingBoxes, remainingEdges
edges, boxes, lastMove
result: null | { winnerIndex, isTie }
controlsDisabled
```

`result` 只在 finished 出现；不重复携带配置函数。

### 4.6 `resolveResultCopy(state, config)`

- 非 finished 返回 null；
- finished 时根据权威分数派生 winnerIndex 或平局；
- 调用已清洗的 `composeResult`，只接收冻结上下文；
- 不接受 formatter 改写玩家、分数或赢家；
- 返回冻结 `{ title, body }`。

## 5. 纯逻辑 API

经典全局 `globalThis.DOTS_AND_BOXES_LOGIC` 至少导出：

```text
BOARD_SIZE, DOT_COUNT, TOTAL_BOXES, TOTAL_EDGES, PHASES
DEFAULT_CONFIG
deepFreeze, sanitizeConfig
makeEdgeId, parseEdgeId, getAllEdgeIds
makeBoxId, parseBoxId, getAllBoxIds
getBoxEdgeIds, getAdjacentBoxIds, isBoxClosed
replayMoves
createInitialState, isDotsAndBoxesState
start, claimEdge, restart
getViewModel, resolveResultCopy
```

模块本身、常量、默认配置和所有返回对象递归冻结。

## 6. DOM 与输入合同

### 6.1 阶段结构

```text
body[data-stage="intro|playing|finished"]
└── main
    ├── header：标题、规则句
    ├── section.scoreboard：双方名称与分数
    ├── section.status：当前回合 / 剩余格 / 上一步反馈
    ├── section.board-stage
    │   └── div#board：9×9 交错轨道
    └── section.action-stage：开始或终局结果 / 重开
```

终局结果只在 finished 创建；restart 后移除。玩法没有私人秘密，但阶段 DOM 仍避免隐藏旧结果残留。

### 6.2 棋盘

`#board` 使用 9×9 CSS Grid：

- 偶数行 + 偶数列：25 个视觉点，`aria-hidden`；
- 偶数行 + 奇数列：20 个水平边按钮；
- 奇数行 + 偶数列：20 个垂直边按钮；
- 奇数行 + 奇数列：16 个方格归属层。

每条可用边是原生 `<button type="button">`：

- DOM 顺序与 `getAllEdgeIds()` 一致；
- `data-edge-id` 只存公开规范 ID；
- 中文可访问名称描述方向、点坐标与当前落边玩家；
- 未用边可操作，已用边 disabled；
- 可见线宽 4–6px，但命中区域至少 44×44px；
- 鼠标、触摸和键盘 Enter/Space 走同一 `claimEdge`；
- 落边后焦点移动到 DOM 顺序的下一条可用边；终局焦点落到结果标题；
- intro 开始后焦点落到第一条可用边；restart 后焦点落到“开始落笔”。
- “下一条”严格指规范边顺序中当前边之后的第一条空边，末尾环回；使用 `focus({ preventScroll: true })`，不设置正数 tabindex。

不伪造 ARIA grid、slider 或 canvas。Tab 可遍历所有可用边；点与已占边不进入 Tab 顺序。

### 6.3 反馈

允许文案：

- 普通换手：`这一笔没有围成格，轮到{下一方}。`；
- 单格：`{当前方}圈住一格，继续落笔。`；
- 双格：`一笔圈住两格，{当前方}继续。`；
- 终局：`最后一格已经有归属。`；
- intro：`轮流连起相邻的点。圈住一格，它就归你，而且还能再走一步。`。

状态变化通过一个 `aria-live="polite"` 节点播报；不重复播报完整计分板。

## 7. 视觉规格

视觉方向：精装方格纸上的两色墨水对局。

### 7.1 设计令牌

| 角色 | 值 |
| --- | --- |
| 桌面背景 | `#3c3631` 深褐炭 |
| 纸张 | `#f4eddd` 暖象牙 |
| 石墨文字 / 点 | `#282824` |
| 辅助文字 | `#6d665d` |
| 朱方 | `#b43a28` |
| 蓝方 | `#24569a` |
| 纸张细线 | `#cfd3cf` 低对比 |
| 焦点 | `#111111` 2px 外描边 + 暖白间隔 |
| 控件圆角 | 0–4px，保持纸笔工具感，不做圆角卡片系统 |
| 动画 | 落边 140ms；占格 220ms；reduced motion 立即完成 |

字体：标题与结果使用宋体/衬线回退；正文、状态、按钮使用系统中文无衬线；分数使用 Georgia/衬线数字。所有控件显式定义字号、字重和行高。

### 7.2 桌面 1504×1046

- 一张占视口约 94% 的暖白纸面，外露深褐桌面；
- 36/64 双列；左侧标题、规则、分数、状态；右侧单一大棋盘；
- 棋盘不包第二层卡片，直接落在纸面；
- 第一视口完整看到标题、分数、棋盘与主动作；无横纵滚动。

### 7.3 手机 390×844 与 320px

- 单列：标题 → 短规则 → 双方分数 → 棋盘 → 状态 → 动作；
- 390px 棋盘目标宽 350–366px，完整 5×5 点阵不裁切；
- 320px 允许页面自然纵向滚动，但不得横向溢出；
- 边按钮命中区仍至少 44px，不以缩小到不可点换取首屏完整；
- 分数横向并列，终局结果不覆盖棋盘。

### 7.4 运行资产

- `docs/assets/dots-and-boxes/concept-desktop-playing.png`：桌面进行态概念；
- `docs/assets/dots-and-boxes/concept-mobile-playing.png`：手机进行态概念；
- `docs/assets/dots-and-boxes/concept-desktop-finished.png`：桌面终局概念；
- `experiences/versus/dots-and-boxes/assets/paper-texture.png`：无字、无折痕的暖白方格纸纹理；
- 图片失败时退回纯色纸面与 CSS 细格，玩法、文字与命中区不依赖图片。

概念图中的棋局只用于布局。运行时边、分数、归属和剩余格必须完全来自权威状态，不复制任何生成图的局面错误。

## 8. 借鉴与来源合同

README 与 `assets/ATTRIBUTION.md` 必须固定并区分：

- AAAI 论文：只确认传统规则和规模术语，不使用算法、图表或数据；
- `Upside-Down-Collective/dots-game@c9fdec7`：根许可证 MIT，但 server manifest 另标 ISC 且 Web 端依赖各自许可证；只作多人架构对照，零代码/依赖/素材引入；
- `jessefischer/dots-and-boxes@4e3382a`：MIT，实际审阅用于识别重复边风险，零代码/CSS/组件引入；
- `wannesm/dotsandboxes@70ba3a9`：未识别许可证，只作发现线索；
- ImageGen：列出三张概念和一张运行纹理、生成日期、提示词摘要、用途和回退；
- 本作状态机、规范边模型、中文文案、DOM、CSS 和测试为原创。

## 9. 自动测试 Gate

纯逻辑至少覆盖：

1. 常量、40 边、16 格、ID 顺序与递归冻结；
2. 配置白名单、名字清洗、整份回退、formatter 合法/异常回退；
3. 每格四边与每边邻格，四角/边界/内部抽样；
4. intro → playing，错误阶段幂等；
5. 普通落边换手；
6. 单格闭合加分并继续；
7. 一条内部边同时闭合两格，加二分并继续；
8. 重复边、越界、斜边、未知 ID 同引用；
9. 完整合法时间序列重放，拒绝错误 move.player、伪造 box owner、分数、currentPlayer、lastMove 与 phase；
10. 先全部水平边、再全部垂直边的 40 手确定轨迹终局为 8–8 平局；
11. 8–8 平局与胜者派生；
12. restart 清盘、首发轮换、名字保留；
13. 额外字段、伪造分数、重复边、矛盾 owner、敌意对象安全回初态；
14. view model 与 result copy 冻结且不共享引用。

目录边界测试至少断言：

- 无 Module、远程 URL、网络、存储、Cookie、随机、音频、媒体或共享路径；
- HTML/CSS/JS 不使用生成截图作为界面；只引用 `paper-texture.png`；
- app 不用 `innerHTML` 写动态内容；
- 40 条边全部由 `getAllEdgeIds()` 生成；
- README 和 ATTRIBUTION 都有“借鉴与来源声明”；
- catalog 与门户静态回退包含安装完成的 A 级入口。

## 10. 浏览器验收 Gate

### 10.1 功能轨迹

1. `file://` 直接打开，开场分数 0–0、16 格、棋盘不可落边；
2. 开始后第一条边获得焦点；
3. 普通边严格换手，重复点击不可操作；
4. 构造单格闭合，得分方继续；
5. 构造双格闭合，一步加两分且继续；
6. 完成 40 边进入终局，结果 DOM 恰一份；
7. 终局边全部禁用，结果标题聚焦；
8. “再来一页”回 intro、清盘、轮换首发；
9. 纸张图片缺失时 CSS 回退可玩；
10. 控制台 0 error；运行时 Network 0 外部请求。

### 10.2 响应式与视觉

- 1504×1046：横纵无滚动，完整棋盘与终局动作在首屏；
- 390×844：无横向溢出，棋盘不裁切，边命中区 ≥44px；
- 320×700：无横向溢出，允许自然纵滚，所有边和动作可达；
- 320 与 390px 对全部 40 个按钮中心执行 `elementFromPoint`，必须命中自身 `[data-edge-id]`；另真实点击边界/内部的横边与竖边各一条；
- reduced motion：规则一致、无必须等待的动画；
- 概念与最新截图在同一 QA 中以原始尺寸 `view_image` 对照；
- fidelity ledger 至少记录布局、文案、字体、色彩、纸张、棋盘几何、状态与手机密度八项；
- 上折叠文案只允许标题、规则、双方分数、当前回合、剩余格和阶段动作，不添加徽章、英文、假指标或第二套说明卡。

## 11. 提交边界

1. 调研独立提交；
2. 规格独立提交；
3. 视觉概念、运行纹理和设计提取独立提交；
4. 纯逻辑与测试独立提交；
5. UI、catalog、README 与边界测试独立提交；
6. 每个浏览器发现的 Bug 按根因形成独立修复提交；
7. 验证报告与 `learn/` 沉淀独立提交。
