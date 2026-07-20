# A 级“把星光，一笔一笔交给你”可执行规格

规格日期：2026-07-21

对应调研：`docs/166-constellation-relay-research.md`

目标目录：`experiences/co-op/constellation-relay/`

## 1. 完成定义

本作是一份双击 `index.html` 即可完成的同机双人合作接线题。两席从固定线轴开始，严格轮流追加一根线；一局必须恰好使用公开双翼星鸢的 10 根无向边，并停在固定终点。

实现只有同时满足以下条件才算完成：

- 9 个点、10 根目标边、起终点、四条完整 Euler 路径与调研冻结值一致；
- 每席恰好提交 5 根线，失败不换席、不移动线头、不污染完成前缀；
- 已用边、非法相交、轮廓外连接和无解前缀按固定优先级返回稳定原因；
- 纯规则层可在浏览器经典脚本与 CommonJS 中使用，页面不复制规则；
- `file://` 下无网络、服务端、构建、存储、随机、时钟或运行时第三方依赖；
- 鼠标、触控、键盘、屏幕阅读器与四档响应式 Gate 均通过；
- 借鉴声明、测试、错误记录、学习记录、目录入口和验证证据齐全。

## 2. 文件边界

| 文件 | 唯一职责 |
| --- | --- |
| `index.html` | 稳定语义结构、首屏文案、资源与经典脚本顺序 |
| `style.css` | 接线板视觉、四档布局、焦点、降动效和高对比适配 |
| `logic.js` | 冻结关卡、整数几何、后缀求解、状态机、公开视图 |
| `config.js` | 两席显示名与完成结语；整份非法时原子回退 |
| `app.js` | DOM 渲染、动作派发、roving tabindex、ARIA 与 ghost 线 |
| `README.md` | 本地打开、玩法、信任边界、定制、借鉴声明、测试 |
| `assets/*` | 生成式背景与完成纪念图；失败时不影响完整游玩 |

加载顺序必须是 `logic.js → config.js → app.js`。禁止 ES module、`fetch()`、Worker、CDN、运行时字体与远程媒体。

## 3. 冻结关卡契约

### 3.1 点

`POINTS` 必须按下列顺序递归冻结：

```js
[
  { id: "spool",       x: 350, y: 900, role: "start" },
  { id: "west-hub",    x: 350, y: 520, role: "node" },
  { id: "west-top",    x: 220, y: 330, role: "node" },
  { id: "west-tip",    x:  70, y: 520, role: "node" },
  { id: "west-bottom", x: 220, y: 710, role: "node" },
  { id: "east-hub",    x: 650, y: 520, role: "end" },
  { id: "east-top",    x: 780, y: 330, role: "node" },
  { id: "east-tip",    x: 930, y: 520, role: "node" },
  { id: "east-bottom", x: 780, y: 710, role: "node" }
]
```

坐标只在 `0..1000` 的规则坐标系中裁决；CSS 尺寸、SVG 像素、缩放与设备像素比不得进入逻辑层。

### 3.2 边

`TARGET_EDGES` 必须按下列顺序递归冻结。ID 也是位掩码的稳定位序：

```js
[
  { id: "tail",         a: "spool",       b: "west-hub" },
  { id: "west-upper",   a: "west-hub",    b: "west-top" },
  { id: "west-tip-up",  a: "west-top",    b: "west-tip" },
  { id: "west-tip-low", a: "west-tip",    b: "west-bottom" },
  { id: "west-lower",   a: "west-bottom", b: "west-hub" },
  { id: "bridge",       a: "west-hub",    b: "east-hub" },
  { id: "east-upper",   a: "east-hub",    b: "east-top" },
  { id: "east-tip-up",  a: "east-top",    b: "east-tip" },
  { id: "east-tip-low", a: "east-tip",    b: "east-bottom" },
  { id: "east-lower",   a: "east-bottom", b: "east-hub" }
]
```

边是无向边；`a/b` 只用于稳定序列化。完整图必须连通，度数按点序为 `[1,4,2,2,2,3,2,2,2]`，仅 `spool` 和 `east-hub` 为奇度点。

### 3.3 加载时自检

模块初始化必须验证：

- 点与边对象只有规定字段、普通原型、唯一非空 ID 和安全整数坐标；
- 每条边连接两个不同的已知点，不存在重复无向边；
- 图连通、度数与奇度点完全匹配；
- 不共享端点的目标边之间没有非法相交；
- `countCompletions("spool", []) === 4`；
- 恰有 10 根边且终点是 `east-hub`。

自检失败应在开发时抛出稳定错误，不得静默带病启动。

## 4. 纯规则 API

浏览器暴露冻结的 `window.ConstellationRelayLogic`，CommonJS 暴露同一对象：

```js
{
  POINTS, TARGET_EDGES, START_POINT_ID, END_POINT_ID, SEATS, RESULT_CODES,
  classifySegmentIntersection, countCompletions, evaluateConnection,
  createInitialState, reduce, getPublicView
}
```

所有返回数组和对象递归冻结；不得返回内部缓存、可变引用、函数、DOM 节点、Promise 或带污染原型的对象。非法输入不抛异常：公开查询返回 `null` 或稳定 `invalid`；非法状态传入 `reduce()` 时回到全新合法初态。

## 5. 整数几何契约

### 5.1 输入与叉积

`classifySegmentIntersection(a, b, c, d)` 接受四个 `{x, y}` 普通点对象。坐标必须是安全整数，端点对不得退化。非法输入返回 `invalid`。

```js
orient(p, q, r) = (q.x - p.x) * (r.y - p.y)
                - (q.y - p.y) * (r.x - p.x)
```

固定坐标范围保证结果仍为安全整数，不使用 epsilon、SVG API 或浮点近似。

### 5.2 完备分类

| 返回值 | 定义 | 新线是否允许 |
| --- | --- | --- |
| `none` | 闭线段无交集 | 是 |
| `shared-endpoint` | 交集仅为两线共同端点 | 是 |
| `proper-cross` | 交点位于两条线各自内部 | 否 |
| `t-junction` | 一条线端点落在另一条线内部 | 否 |
| `collinear-overlap` | 共线交集具有正长度 | 否 |
| `invalid` | 参数、退化线段或整数边界非法 | 否 |

判定顺序必须是：输入合法性 → 四点共线投影区间 → proper cross → 端点在线段上 → none。共线时，投影交集为单点且该点恰为双方端点才是 `shared-endpoint`；其余正长度交集均为 `collinear-overlap`。

测试不得只拿生产函数互证；必须有独立枚举 oracle 覆盖 36 条点对线段与 630 个无序线段对。

## 6. 后缀求解器

`countCompletions(cursorId, usedEdgeIds)`：

- `cursorId` 必须是已知点；`usedEdgeIds` 必须是唯一已知边 ID 的普通数组；
- 非法输入返回 `null`；合法输入返回非负安全整数；
- 每次只沿连接当前点且未使用的目标边递归；
- 10 根边全用时，只有当前点为 `east-hub` 才返回 `1`；
- 内部可使用 `(cursorIndex, mask)` memo，但缓存不得公开。

必须固定验证：初态 `4`；尾线后 `4`；尾线后立即桥接 `0`；进入西翼任一方向 `2`；完成西翼 `2`；通过桥 `2`；进入东翼任一方向 `1`；完整合法前缀 `1`。并枚举 9,216 个 `(cursor, mask)` 状态与独立 DFS oracle 对照。

## 7. 连接裁决

`evaluateConnection({ cursorId, usedEdgeIds, fromId, toId })` 返回冻结的 `{ status, edgeId }`；失败时 `edgeId: null`，成功时 `status: "accepted"`。固定优先级：

1. `invalid`：schema 不精确、非普通对象、未知点、`fromId !== cursorId`、同点连接；
2. `edge-used`：提议恰为已经使用的无向目标边；
3. `wire-crossed`：提议线与已提交线产生 proper cross、T 接或共线重叠；
4. `off-outline`：提议不是未使用目标边；
5. `future-stranded`：临时加入目标边后，后缀解数为 `0`；
6. `accepted`。

先判相交、后判轮廓是有意约定：调研中的 `west-tip → east-top` 必须返回 `wire-crossed`，不可被较泛的 `off-outline` 吞掉。裁决不得返回合法下一点、完整路线或后缀解数。

## 8. 权威状态

合法状态只有精确字段：

```js
{ phase, cursorId, completedMoves, attempt, lastResult, revision }
```

每项完成记录只有：

```js
{ edgeId, fromId, toId, seat, attempts }
```

全局不变量：

- `cursorId` 等于完成前缀最后的 `toId`，空前缀时为 `spool`；
- 记录首尾连续、边唯一、方向合法，且 `seat === SEATS[index % 2]`；
- 每个历史前缀都可由 `evaluateConnection()` 接受且仍有后缀解；
- `attempts` 与当前 `attempt` 均为 `1..Number.MAX_SAFE_INTEGER`；
- revision 为安全整数；每次有效动作加一，非法动作保持原对象与 revision；
- `lastResult` 只在 `jammed` 和 `edge-result` 存在，其他阶段为 `null`；
- 完成前缀最多 10 项，10 项时当前点必须是 `east-hub`。

初态固定：

```js
{
  phase: "intro", cursorId: "spool", completedMoves: [],
  attempt: 1, lastResult: null, revision: 0
}
```

## 9. 动作闭包与阶段

动作必须是普通对象、精确字段、无多余 key：

| 当前阶段 | 动作 | 前置 | 成功后 |
| --- | --- | --- | --- |
| `intro` | `{type:"START"}` | 无 | `handoff` |
| `handoff` | `{type:"TAKE_OVER", seat}` | seat 为派生当前席 | `choosing` |
| `choosing` | `{type:"CONNECT", seat, fromId, toId}` | seat/当前点匹配 | 接受未满：追加并进 `edge-result`；第 10 根：`constellation-result`；失败：`jammed` |
| `jammed` | `{type:"RETRY_EDGE"}` | attempt 未到上限 | attempt + 1，清结果，回 `choosing` |
| `edge-result` | `{type:"NEXT_TURN"}` | 前缀 1..9 | attempt 归 1，清结果，进 `handoff` |
| `constellation-result` | `{type:"FINISH"}` | 恰 10 根且在终点 | `complete` |
| `complete` | `{type:"RESTART"}` | 无 | 全新初态，revision 为旧值 + 1 |

`CONNECT` 失败不改变线头、前缀、seat 或 attempt，只写失败结果；成功记录的 `attempts` 使用提交前的 attempt。revision 或 attempt 再加一会越过安全整数时动作无效。其他阶段、错误 seat、错误字段、原型污染、数组动作或未知动作全部无效。

## 10. 公开视图与防泄漏

`getPublicView(state)` 返回页面唯一可依赖的冻结视图：

```js
{
  phase, points, targetEdges, cursorId, completedMoves,
  completedCount, remainingCount, currentSeat, attempt,
  lastResult, isComplete, seatCounts, revision
}
```

目标轮廓是公开题面，所以 `targetEdges` 可见；禁止公开四条路径、后缀解数、合法下一点、memo 或未来席位。`seatCounts` 从记录派生，完成态严格为 `{a:5,b:5}`。

## 11. 配置边界

```js
window.CONSTELLATION_RELAY_CONFIG = {
  seats: { a: "你", b: "TA" },
  completionNote: "这十次交接，刚好把同一束星光送到了彼此手里。"
};
```

- seat 名 Unicode 去首尾空白后为 1–12 个字素，二者不得相同；
- completionNote 去空白后为 1–80 个字素；
- 任一字段、原型或类型非法时整份原子回退，不部分采用；
- 页面只消费归一化后的冻结配置；
- 不允许配置覆盖点、边、规则、完成条件、颜色、安全文案或脚本。

## 12. 页面、文案与 DOM 合约

页面至少有一个 `main`、作品名与短规则、双席轮值、`已接 x/10`、当前尝试、具名接线棋盘、纯表现 SVG 线层、9 个始终存在的 HTML button 星点、`aria-live="polite"`、有序接线日志，以及每阶段唯一主动作。

| 场景 | 固定文案 |
| --- | --- |
| intro | `同一个线头，轮流接完十根星线。不能重复，不能穿线，也别把下一步困住。` |
| handoff | `请把观测台交给 {seatName}` |
| choosing | `{seatName}，从亮着的线头接向下一颗星。` |
| edge-result | `接通。现在把线头交给下一位。` |
| edge-used | `这根星线已经接过了。` |
| wire-crossed | `线束会相撞，换一颗星试试。` |
| off-outline | `这不在星鸢的接线图上。` |
| future-stranded | `这样会留下接不完的线，换一条路。` |
| constellation-result | `十根星线全部接通。` |
| complete | `我们把同一束星光交了十次。` |

错误不得指出正确目标。颜色之外还要用端帽、线型、小席位标记或文字区分两席。

SVG 使用 `viewBox="0 0 1000 1000"`：低对比目标轮廓、已完成线与 ghost 线不接收 pointer event；已完成线带 `data-edge-id` 和 `data-seat`；ghost 不进状态与 live region。当前点、起终点的语义由 HTML button 同步表达；图片或 SVG 装饰失败时，按钮与文字仍可操作。

## 13. 输入与焦点

- click/tap 目标星是唯一提交手势，当前星自身不可提交；不要求 drag、长按、双击或 hover；
- 星 button 命中盒最小 `44×44px`，主动作最小高度 `48px`；
- 棋盘任一时刻恰有一个星 button 为 `tabindex="0"`；
- choosing 时焦点落在当前线头；有效提交后随新线头；失败不移动；终局移到结果标题；
- 方向键从当前点选择该半平面内夹角最小、再距离最短、再点序最早的星；
- Enter/Space 在 choosing 提交聚焦星；Escape 清 ghost 并回到当前线头，不改状态；
- 全局监听先排除 repeat、Ctrl/Meta/Alt 和 editable target，再决定是否 `preventDefault()`；
- 不注册会抢占页面滚动的全局 `W/S/P` 快捷键。

## 14. 可访问性

- 每颗星有稳定中文名称，并说明起点、终点、当前线头与已接状态；
- 日志按顺序读出“第 n 根、席位、起点、终点、尝试次数”；
- live region 只播动作结果、失败、换席和完成，不播 hover；
- `:focus-visible` 高对比且不被裁切；
- reduced-motion 下移除生长、闪烁和位移动画；
- forced-colors 下使用系统色、边框和文字保持状态；
- 200% zoom 可完成整局，DOM 与视觉顺序一致；
- SVG 不承担唯一语义，颜色不承担唯一状态。

## 15. 视觉与响应式 Gate

视觉冻结为“观测站夜班接线板”：暗梅/石墨哑光面板、瓷白插孔、安全橙与薄荷线、窄体无衬线/等宽标记。不得退回墨蓝星盘、黄铜同心圆、大衬线标题或纯卡片仪表盘。

| 视口 | 必须通过 |
| --- | --- |
| 1504×1046 | 无横纵滚动；标题、轮值、620–760px 棋盘、规则和主动作同屏 |
| 1280×800 | 无横向滚动；棋盘 ≥520px；标题、轮值、完整棋盘和当前动作同屏 |
| 390×844 | 内容约 366px；棋盘 350–366px 不裁切；触点 ≥44px；主动作 ≥48px |
| 320×568 | 内容 300–304px；棋盘 ≥296px；零横向溢出；允许纵滚；触点仍 ≥44px |

每档还验证：星点中心 `elementFromPoint()` 命中对应 button、文本无截断、焦点环可见、图片阻断仍完整、reduced-motion 和 forced-colors 不丢信息。

## 16. 测试矩阵

逻辑测试：

- 固定常量、递归冻结、浏览器/CommonJS 同构；
- 图自检、度数、连通、奇点、四条且仅四条完整路线；
- 36 条线与 630 线对的独立几何 oracle；
- 9,216 个 `(cursor, mask)` 与独立 DFS oracle；
- 六种裁决状态与固定优先级，包括 crossing 与 premature bridge；
- 七阶段全流、失败/重试、5/5 席位、完成/重开；
- 动作 schema、原型污染、畸形 state、未知 ID、重复边、安全整数上界；
- JSON action log 重放到完全相同的完成态；
- 公开视图无路线/解数/合法下一点泄漏且无共享引用；
- 生产逻辑无网络、存储、随机、时钟、DOM、音频与 runtime hook。

浏览器验收：

- `file://` 从 intro 完成一条 10 边金路径并重开；
- 四种失败逐一出现且不推进，重试后可完成；
- mouse、touch/click、纯键盘分别完成；
- roving tabindex、焦点归位、live region、日志和主动作唯一；
- 四档视口、200% zoom、图片阻断、reduced-motion、forced-colors；
- 控制台零错误、零失败请求、零横向溢出；
- `npm test` 与 `npm run verify` 全绿。

建议金路径：

```text
spool → west-hub → west-top → west-tip → west-bottom
→ west-hub → east-hub → east-top → east-tip → east-bottom → east-hub
```

## 17. 借鉴声明与许可证 Gate

生产 README 必须链接调研文档并保留以下含义：

> 本作的规则、代码、关卡、点位、连线、界面、文案与生成式视觉资产均为独立实现。开发前曾研究 Cross-Link 的星点连接与次序规划、robust-segment-intersect 的相交边界、Paper.js 的输入/几何/渲染分层、NetworkX 的 Euler 路径定义，以及 d3-celestial 的星点数据分层；未复制这些项目的源码、算法实现、测试、数据集、天文坐标、素材或界面。固定版本、许可证、版权主体与排除范围见调研文档。

运行时保持零第三方依赖，因此不新增 vendor 文件或第三方许可证副本。若实际复制任何参考实现，必须停止“独立实现”路径，记录复制范围、保留许可证与版权，再重新审计。

## 18. 非目标

本轮明确不做：在线房间、双设备同步、排行榜、账号、存档、遥测、自由画线、关卡编辑器、随机星图、计时、分数、个人失误比较、Canvas/WebGL、物理绳索、音效、语音、拖拽、震动、配置谜题、正确下一步提示、路线列表，以及把星点、按钮、轮值、规则或答案烘焙进图片。

这些只能在本规格全部通过后作为独立提案，不得偷偷进入最小实现。
