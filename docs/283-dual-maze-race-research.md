# 双屏迷宫赛：机制增量、公平性与本地可行性调研

> 候选：创意池 V16「双屏迷宫赛」
> 调研日期：2026-07-25
> 结论：**Conditional Go**
> 推荐产品 ID：`dual-maze-race`
> 推荐中文名：**同路，谁先到**
> 推荐分类：**双人对抗**
> 推荐等级：**A 级，单设备同屏，直接双击 HTML 可玩**

## 1. 执行结论

这个候选可以做，但原始描述中的“两张同种子迷宫带不同陷阱”不适合作为公平的
首版规则。

建议收敛为：

- 两块完全公开、相同朝向、相同尺寸的独立迷宫盘；
- 每一局双方使用**同一个只读迷宫对象**，没有不同陷阱、道具或动态改图；
- 两个人同时逐格移动，撞墙只会浪费当前逻辑 tick；
- 输入按固定 `1 / 30s` 逻辑 tick 成批结算，而不是按 DOM 事件先后决定；
- 同一 tick 抵达终点时本小局平局；
- 两个 seed 各比赛两次，第二次交换左右盘、WASD 与方向键；
- 四局后比较积分，允许整场平局；
- 页面失焦、隐藏或长帧时安全暂停，不补算后台时间；
- 原生方向按钮提供触屏路径，键盘开始前提供双键区输入检查；
- 全部规则、生成器、文案、DOM、CSS 和测试独立实现，不引入第三方运行依赖。

这种版本新增的是“**同一确定性问题上的实时执行竞速 + 成对换席公平赛制**”，而不
是再做一款合作开门、雾中口述或留痕碰撞迷宫。

## 2. 为什么只是 Conditional Go

纯前端生成一个可解迷宫并不困难。真正未被当前仓库证明的，是以下四件事能否同时
成立：

1. 两位玩家的输入在同一逻辑 tick 内原子结算；
2. 同一地图、左右盘、按键区域和赛程对双方完全对称；
3. 常见键盘矩阵漏报与移动端多点触控不会被页面错误包装成“玩家失误”；
4. 两块 `9 × 9` 迷宫在 `390 × 844` 和 `320 × 700` 仍能看清并操作。

因此 Go 的条件是：

- 精确生成算法和两个冻结 seed 的指标由生产同源测试证明；
- 交换事件顺序、RAF 分组和玩家编号后，规则结果保持一致；
- 真实键盘完成联合输入检查，真实触屏完成双 Pointer / 双按钮路径；
- 桌面和两档移动视口完成四局；
- `file://` 静态合同、localhost 浏览器合同、无网络与无存储检查全部通过；
- 若任一输入平台无法提供可信的双人同时操作，作品不得标记 installed。

如果只能实现“两个看起来一样的迷宫”，却不能证明上述公平与输入 Gate，应判
**No-Go**，而不是用排行榜文案掩盖偏差。

## 3. 当前仓库事实

基线 `bbe8c77` 的 catalog 有 58 个项目，全部 `installed: true`：

| 分类 / 等级 | 数量 |
| --- | ---: |
| surprise | 17 |
| co-op | 24 |
| versus | 17 |
| A / B / C / D | 50 / 1 / 6 / 1 |

本候选来自 [`40-idea-backlog.md`](./40-idea-backlog.md) 的 V16。编号只作为创意池
历史索引；生产目录、测试和 catalog 应使用稳定 ID `dual-maze-race`。

## 4. 机制重复审计

### 4.1 最接近的已安装项目

| 项目 | 相似点 | 已有核心 | 新候选必须保持的差异 |
| --- | --- | --- | --- |
| `twin-light-maze` | 双人、网格、WASD + 方向键、同屏 | 两人处于同一地图，靠压力板与门互相依赖，共同到各自出口 | 两块独立同构盘、双方目标相反、没有机关依赖、以成对竞速结算 |
| `fog-navigation` | 迷宫、局部移动、BFS 可解证明 | 一人限时看全图，另一人只看局部雾窗，靠口述合作 | 全图始终公开且双方信息相同，不做遮盖、记忆或口述信息差 |
| `light-trail-hunt` | 同机实时、固定 tick、双键区、触屏 | 玩家自动前进并留下永久轨迹，双方会撞墙、撞线或相撞 | 玩家主动逐格移动；棋盘不会被轨迹改写；两盘物理隔离，不发生玩家碰撞 |
| `orbit-star-race` | 同机同时操作、共享竞速目标、固定步 | 自动绕行，只改变速度层级，竞争动态星流 | 固定网格路线、四向选择、无自动运动、无动态目标 |
| `paper-soccer` | 图上移动、边与可达性 | 轮流画不可复用边，借旧点连续行动，进球或困死 | 实时独立双盘；不画边、不改变图、不借力、不封死 |
| `constellation-relay` | 图遍历、可解前缀 | 轮流覆盖 Euler 边并防止无解前缀 | 不覆盖边、不合作交接；每位玩家只执行自己的相同最短路问题 |

另审计了尚处研究阶段的 `honeycomb-passage`：它的核心是轮流移动或封蜡，并在
每次封蜡前用 BFS 保证双方仍有路线。`dual-maze-race` 不允许玩家修改图，因此没有
路径保全决策，也不会与其“动态改图”核心重叠。

### 4.2 低差异版本

以下版本不值得进入生产：

- 在 `twin-light-maze` 上删掉压力板，只比较谁先到出口；
- 在 `fog-navigation` 上并排放两个局部雾窗；
- 在 `light-trail-hunt` 上把永久轨迹换成固定墙；
- 只做一局 WASD 对方向键，不交换席位；
- 两盘使用不同陷阱、不同随机数流或不同视觉尺度；
- 胜负直接比较两个 `keydown.timeStamp`；
- 让玩家在同一盘内互相阻挡或碰撞；
- 把开发期 BFS 最短路写进 DOM、ARIA 或 CSS 属性。

### 4.3 足够独特的最小机制

第一版必须同时保留：

1. **同题双盘**：双方读取同一个冻结迷宫；
2. **实时独立执行**：每位玩家只移动自己的位置；
3. **tick 原子结算**：同 tick 完成即平局；
4. **成对换席**：同 seed 立即复赛并交换控制区；
5. **双 seed 四局**：每人对两张地图都使用过两种键区；
6. **公开信息**：没有正常游玩中的秘密答案或窥屏优势。

若删去成对换席，它只是一个容易受硬件和座位影响的速度小游戏；若删去同题双盘，
它又无法证明路线难度相等。

## 5. 推荐赛制

### 5.1 四局日程

| 局 | Seed | 左盘 / WASD | 右盘 / 方向键 |
| ---: | --- | --- | --- |
| 1 | `0x434f5550` (`COUP`) | 玩家 1 | 玩家 2 |
| 2 | `0x434f5550` (`COUP`) | 玩家 2 | 玩家 1 |
| 3 | `0x50414952` (`PAIR`) | 玩家 1 | 玩家 2 |
| 4 | `0x50414952` (`PAIR`) | 玩家 2 | 玩家 1 |

同一个 seed 连续比赛两次。第二局双方已经看过路线，但获得的信息完全相同；交换
席位后，每个人都在同一地图上使用过 WASD 和方向键。

### 5.2 计分

- 本局先到终点：1 分；
- 同一逻辑 tick 到达：双方各 0.5 分；
- 四局总分较高者获胜；
- 总分相同：整场平局；
- 不使用最少撞墙、最快单局、玩家编号或第一局胜者作为隐藏 tie-break。

页面可以显示每局 tick 时间与撞墙数作为复盘信息，但它们不改变积分。

### 5.3 为什么不使用不同陷阱

“不同陷阱”会立即引入无法等价的问题：

- 两种陷阱的认知与动作成本难以证明相同；
- 随机刷新会把运气混入竞速；
- 同屏下观察对方陷阱可能产生额外信息；
- 视觉和碰撞边界会扩大测试面。

首版以路径执行为唯一竞技变量。未来如果要加入陷阱，必须作为独立候选重新做配平
实验，不能偷偷叠加到本规格。

## 6. 确定性地图

### 6.1 逻辑网格

- 每张地图固定 `9 × 9` 个逻辑 cell；
- 起点固定 `{ row: 4, col: 0 }`，终点固定 `{ row: 4, col: 8 }`，即左中到右中；
- 两盘使用相同朝向，不镜像、不旋转；
- 墙由每个 cell 的四方向 passage bitmask 表达；
- CSS 像素、SVG path、DPR 与 viewport 不参与可达性。

### 6.2 生成算法

建议使用明确写入规格的迭代式随机 DFS：

1. 从起点开始，标记已访问并入栈；
2. 当前格按 `up, right, down, left` 顺序收集未访问邻居；
3. 用非零 32 位 seed 驱动的 `xorshift32` 选一个候选；
4. 同时打开当前格与候选格之间的双向 passage；
5. 候选格标记已访问并入栈；
6. 无未访问邻居时出栈；
7. 直到 81 个格全部访问。

`xorshift32` 的状态更新冻结为：

```text
x ^= x << 13
x ^= x >>> 17
x ^= x << 5
x = x >>> 0
```

它只用于可复现的关卡排列，不声称密码学安全，也不用于公平抽签。候选索引用
`nextUint32() % candidates.length`；任何“改进随机质量”的实现都会改变冻结地图，
必须先更新 seed 指标和测试。

这套生成会打开恰好 80 条无向 passage：每个新格只由一条首次访问边接入，所以结果
是覆盖 81 个格的生成树。起终点必然连通，且两点之间只有一条简单路径。

### 6.3 初步可执行模型

调研阶段用上述精确步骤在 Node 中运行了不落盘的独立模型，得到：

| Seed | 最短 / 唯一路径 | 转弯数 | 死胡同数 |
| --- | ---: | ---: | ---: |
| `0x434f5550` | 28 步 | 18 | 10 |
| `0x50414952` | 30 步 | 19 | 10 |

这些数字只是进入规格的候选证据。实现时必须由生产 `createMaze()` 和生产同源 BFS
重新证明；若任何指标不同，停止集成并查明算法漂移。

### 6.4 校验 Gate

每张地图必须证明：

- 81 个格全部唯一、全部可达；
- passage 双向对称且不越界；
- 无向边恰好 80 条；
- BFS 路径连续、起终点正确；
- DFS 生成树无环；
- 两盘引用同一个冻结 maze，不能分别生成后只比较截图；
- 返回的 passage、路径和分析 DTO 与调用方断开可变引用；
- gold path 只用于测试，不进入生产 public view。

## 7. 固定 tick、碰墙与计时

### 7.1 权威时间

规则频率冻结为 `30Hz`。浏览器事件只把方向加入各自最多两项的 FIFO；每个逻辑
tick 最多为每位玩家消费一项：

```text
读取旧位置与两条队列
→ 各取一个方向（没有则原地）
→ 分别计算目标格
→ 墙 / 越界：原地，bump + 1
→ passage 合法：移动一格
→ 同时检查两人是否到达终点
→ 原子提交本 tick
```

两块盘彼此隔离，所以不需要角色碰撞、同格或换位裁决。公平边界是“同 tick 完成”
而不是“哪个 DOM 事件先到”。

### 7.2 计时

- 每局有 3 秒固定 tick 倒数；
- 倒数阶段不接收移动；
- 开跑时清空两条输入队列；
- `elapsedTicks` 从 0 开始，每个 racing tick 加一；
- 页面显示时间由 `elapsedTicks / 30` 派生；
- 没有到期失败或最长用时，慢速玩家始终可以完成；
- 胜负只比较抵达 tick，不比较 `Date.now()` 或像素动画时间。

App 可以用 `performance.now()` 和 `requestAnimationFrame()` 形成 accumulator，但它们
只派发整数 tick。单帧间隔超过冻结阈值、页面 hidden、window blur 或 `pagehide`
都进入 paused，清空 accumulator 与输入队列；返回后必须显式继续，不补跑后台 tick。

### 7.3 降动效

`prefers-reduced-motion: reduce` 下：

- 取消棋子平移、墙体发光、倒数缩放和胜利脉冲；
- 位置仍在同一 tick 离散更新；
- 倒数长度、队列、计时、积分和赢家不变；
- 不能用 CSS transition / animation end 推进任何 phase。

## 8. 键盘与触屏

### 8.1 键盘

- 左席：`KeyW / KeyA / KeyS / KeyD`；
- 右席：`ArrowUp / ArrowLeft / ArrowDown / ArrowRight`；
- 使用 `KeyboardEvent.code`，不依赖输入法产生的字符；
- `event.repeat`、组合键和可编辑目标中的按键不入队；
- 只在命中游戏键且阶段允许时阻止方向键滚动；
- 每次非 repeat `keydown` 最多加入一个离散方向，不使用长按速度。

微软对 keyboard ghosting 的官方说明指出，硬件矩阵、软件或通信协议都可能漏报
某些同时按键组合。JavaScript 不能补回浏览器从未收到的事件。因此：

- 比赛前必须有联合输入检查；
- 两席分别确认四个方向；
- 再要求双方在同一个短窗口各按一次公开测试键；
- 未同时检测到时显示“此键盘可能漏键”，不能静默通过；
- 页面明确建议改用两组触控按钮；
- README 不承诺所有物理键盘都能识别任意组合。

离散 tap 能减少长按组合，但不能消除硬件限制。

### 8.2 触屏与鼠标

- 每席有四个稳定存在的原生 `<button>`；
- 所有 button 至少 `52 × 52 CSS px`；
- 每次原生 activation 只入队一次，不做长按连发或 swipe；
- 两组控制区声明合适的 `touch-action`，避免页面平移吞掉对局输入；
- 两位玩家的 activation 即使按事件顺序到达，也会在各自队列中由同一 tick 结算；
- 真实移动设备必须验证两个并发 pointer / tap 都被接收；
- `pointercancel`、失焦、隐藏和暂停必须清除仅属于视图的按下态。

Pointer Events 标准明确允许用户代理在设备不支持更多并发 pointer 时抑制流。因此
“代码监听了 pointer”不是验收证据，必须实机验证。

## 9. 同屏信息、无障碍与响应式

### 9.1 信息边界

本作没有私人地图：

- 两盘的墙、起点、终点和朝向完全相同；
- 双方位置、积分、倒数和当前席位都公开；
- 看对方屏幕不会获得自己屏幕没有的信息；
- public view 不含 gold path、生成栈、PRNG 中间状态或未来输入；
- 源码中的 seed 和地图算法不是秘密，也不声称防作弊。

这与 `fog-navigation` 的阶段隐私有意相反。首版不使用 hidden DOM、CSS 透明度或
模糊遮罩制造假的秘密。

### 9.2 无障碍

- 所有开始、继续、下一局与重赛动作使用原生 button；
- 两组方向按钮可用 Tab + Enter / Space 操作；
- Board 使用简短可访问名与非逐格刷新的位置 / 开口摘要；
- 每次移动不抢焦点、不逐 tick 刷 live region；
- 撞墙、暂停、换席、小局结果和整场结果使用 `role="status"` 或等价语义；
- 玩家使用名称、左右席、形状与纹理冗余，不只靠颜色；
- `:focus-visible` 在棋盘和控制区都清楚；
- 200% zoom、forced-colors、图片阻断下仍能看到墙、当前位置和方向控制；
- 竞速没有“超时失败”，但速度仍是对抗本质；README 不宣称屏幕阅读器和视觉
  实时竞速具有完全相同的竞技体验。

### 9.3 响应式 Gate

| 视口 | 最低 Gate |
| --- | --- |
| `1440 × 900` | 两盘、比分、倒数和两组控制同屏；左右盘逻辑尺寸一致 |
| `1280 × 800` | 无横向滚动；两盘不被结果层遮挡；主动作首屏可达 |
| `390 × 844` | 两盘仍同时可见；每盘不低于约 166px；8 个按钮至少 52px |
| `320 × 700` | 两盘不低于约 136px；无横向溢出；允许必要纵滚但控制可达 |

小屏若无法同时看清两盘和两组控制，应停止该视口验收，不能通过隐藏对方棋盘、
改成轮流模式或缩小按钮来“达标”。

## 10. A / B / C / D 与依赖

| 等级 | 判断 |
| --- | --- |
| A | **采用**；经典脚本、DOM/SVG/CSS、相对路径，作品目录可独立复制直开 |
| B | 不需要；没有 module、fetch、WASM 或本地 HTTP 强依赖 |
| C | 不需要；核心是同一物理设备同时操作，不做局域网房间 |
| D | 不适用；没有模型、语音、传感器、3D 引擎或大型素材 |

运行依赖为 0。开发期只使用仓库已有 Node 测试与 repository verify，不新增根依赖或
lockfile 变更。

作品不得使用：

- `fetch`、XHR、WebSocket、WebRTC 或远程 URL；
- localStorage、sessionStorage、IndexedDB、Cookie 或 Cache API；
- Worker、Service Worker、模块脚本或动态 import；
- 麦克风、摄像头、定位、振动、音频或文件读取；
- 远程字体、第三方图片、统计或账号。

因此 A 级 `file://` 合同成立；受控 Chrome 若拒绝直接导航到 `file://`，必须诚实
记录工具限制，并以静态路径闭合 + localhost 真实浏览器实玩补充证据，不能把两者
混写成“已在 file URL 自动实玩”。

## 11. 一手资料与借鉴边界

### 11.1 算法与浏览器标准

| 来源 | 本轮用于 | 未复制 |
| --- | --- | --- |
| Robert Tarjan, [Depth-First Search and Linear Graph Algorithms](https://doi.org/10.1137/0201010), SIAM J. Comput. 1(2), 1972 | DFS / backtracking 与生成树的算法背景 | 论文文字、图、证明和任何实现 |
| George Marsaglia, [Xorshift RNGs](https://doi.org/10.18637/jss.v008.i14), JSS 8(14), 2003 | 非零 32 位可复现状态递推；文章页标注 article 为 CC BY、software 为 GPL v2/v3 或兼容许可 | 论文代码、软件包、测试与文字；生产只按规格独立写有限整数递推 |
| E. F. Moore, [*The Shortest Path Through a Maze*](https://cir.nii.ac.jp/crid/1570854175170619520), 1959, Harvard University Press, pp. 285–292 | 无权网格最短路径的历史来源与 BFS 语义校准 | 论文文字、图和实现 |
| W3C [UI Events](https://www.w3.org/TR/uievents/) 与 [KeyboardEvent code values](https://www.w3.org/TR/uievents-code/) | `KeyboardEvent.code`、`repeat` 与键盘事件边界 | 规范示例代码与文字 |
| W3C [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) | 多 pointer、`pointercancel`、`touch-action` 与设备上限 | 规范示例代码与文字 |
| W3C [High Resolution Time](https://www.w3.org/TR/hr-time-3/) | `performance.now()` 的单调时钟边界 | 规范示例代码与文字 |
| WHATWG [Page Visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) 与 [Animation Frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames) | hidden 暂停和 RAF 只做驱动 | 规范示例代码与文字 |
| W3C [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion) | 降动效偏好 | 规范示例代码与文字 |
| W3C WCAG 2.2： [Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)、[Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)、[Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)、[Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages) | 键盘等价、目标尺寸、焦点与状态消息验收基线 | 不宣称自动达到完整 WCAG 认证 |
| Microsoft Applied Sciences, [Keyboard Ghosting and the SideWinder X4](https://www.microsoft.com/applied-sciences/projects/anti-ghosting) | 同机多键可能受硬件、软件与协议限制 | 产品、演示与实现 |

### 11.2 开源项目结论

本轮没有搜索、克隆或阅读外部开源迷宫项目的源码，也没有选择第三方地图、关卡、
算法实现、UI、素材或依赖。现有仓库项目只用于内部机制重复审计。

建议生产 `ATTRIBUTION.md` 明确：

> “同路，谁先到”的规则组合、确定性迷宫生成器、固定 seed、赛程、状态机、测试、
> DOM、CSS、文案与视觉均为本仓库独立实现。研究阶段只参考了上列论文、浏览器
> 标准、无障碍标准与硬件说明；没有复制外部开源项目的代码、地图、参数、测试、
> 界面或素材。

若实施阶段实际参考任何开源仓库，必须在写代码前补充：

- 固定仓库 URL 与 commit / tag；
- LICENSE 固定链接与许可证名称；
- 版权人；
- 实际借鉴内容；
- 明确未复制范围；
- 若引入代码或素材，保留许可证正文、版权与 notice。

不能沿用本文件的“未参考外部开源实现”结论。

## 12. 风险与决策

| 风险 | 影响 | 进入实现前的 Gate |
| --- | --- | --- |
| 与 `twin-light-maze` 重复 | 新项目只是改分类 | 保留独立双盘、无机关、成对换席与竞速结算 |
| 一局制偏向某键区 | 胜负不可解释 | 每个 seed 原图复赛一次并交换席位 |
| 两盘生成漂移 | 路线难度不等 | 一次生成、同一冻结对象、引用与 hash 测试 |
| DOM 事件先后决定赢家 | 同时到达被错误拆开 | 每 tick 同时消费两队列，原子完成裁决 |
| 键盘 ghosting | 漏键被当作玩家失误 | 赛前联合输入检查、离散 tap、触屏替代和 README 限制 |
| 多点触控被浏览器抑制 | 手机无法真实双人 | 真机双 pointer / 双 activation Gate |
| rAF / 后台节流改变计时 | 返回页面跳局或偏差 | fixed tick、hidden/blur/stalled 暂停、不补 tick |
| 小屏迷宫不可读 | 触屏名义可用、实际不可玩 | 390/320 原尺寸实玩；不靠缩按钮或隐藏棋盘通过 |
| gold path 泄露 | 玩法退化成照答案走 | BFS 结果只在测试；public view/DOM/ARIA 均不含路径 |
| 视觉动效成为规则 | reduced motion 改赢家 | 动画纯投影，state hash 与普通模式相同 |

## 13. 最终调研判断

**Conditional Go**。

推荐 ID `dual-maze-race`，标题「同路，谁先到」，主分类 `versus`，A 级单设备同屏。
只有当确定性地图、成对换席、公平 tick、输入兼容和移动视口五组 Gate 全部通过时，
才转为 Go 并进入 installed。

下一阶段应先冻结玩法方向与赛程，再冻结生产 API、精确 seed 指标和测试矩阵。本
调研没有创建生产目录、UI、catalog 条目、bug 或 learn。
