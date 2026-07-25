# Memory Merge Board research

- 日期：2026-07-25
- 候选 ID：`memory-merge-board`
- 暂定中文名：把小事，合成我们的故事
- 暂定分类：`co-op`
- 暂定等级：A
- 启动合同：直接打开 `index.html`，`file://` 下完整可玩
- 研究结论：**Conditional Go**

## 1. 结论先行

这个候选只有在下列四点同时成立时才值得实现：

1. 一方选择整盘滑动方向，另一方从公开的两张线索中选择一张并放入来向边缘；每个有效回合后交换角色。
2. 棋盘使用非数字的“回忆主题 + 成长阶段”，不设分数、最高分、随机出生或 2048 目标。
3. 最高阶段的线索会离开棋盘、进入共同相册，并触发一段可跳过且不记录答案的口头分享。
4. 第一版固定题库、固定初始局面与固定候选队列必须经过可解性搜索，不把随机性当作内容。

若实现退化为“数字换成图标、随机生成方块、一路合到最大值”，则与参考项目的结构差异不足，应判定 **No-Go**。

当前更准确的产品定义不是“情侣版 2048”，而是：

> 两个人在同一设备上轮流整理共同相册：整理者推动整页线索，补页者决定下一张线索从哪里进入；相同主题与阶段相遇后成长，完成的章节被收进共同相册。

## 2. 本轮研究范围

### 2.1 仓库基线

本轮完整读取并按其合同工作：

- `AGENTS.md`
- `docs/orchestration-runbook.md`
- `docs/orchestration-board.md`
- `docs/251-local-first-second-pass-candidate-refresh.md`
- `experiences/catalog.json`

基线 catalog 共 58 个已安装体验：

- `surprise`：17
- `co-op`：24
- `versus`：17
- A 级：50
- B 级：1
- C 级：6
- D 级：1

### 2.2 重点读取的现有项目

为判断机制重叠，额外完整读取了这些现有项目的 README 或归因文档：

- `photo-swap-puzzle`
- `future-cookie-notes`
- `rhythm-relay`
- `closer-cards`
- `seven-day-garden`
- `constellation-relay`
- `memory-bid`
- `photo-slider-race`

其中 `photo-slider-race` 是最接近的空间滑动候选：它让双方同时完成各自独立的 3×3 滑块拼图，以完成时间进行对抗。本候选必须保持“同一共享棋盘、整盘压缩合并、滑动与补页两个互补角色、非竞速”的边界。

## 3. 固定开源参考核验

### 3.1 上游事实

唯一作为核心机制参考的开源仓库固定为：

- 仓库：[gabrielecirulli/2048](https://github.com/gabrielecirulli/2048)
- 固定 commit：[478b6ec346e3787f589e4af751378d06ded4cbbc](https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc)
- commit 页面：[Update README.md](https://github.com/gabrielecirulli/2048/commit/478b6ec346e3787f589e4af751378d06ded4cbbc)
- 固定 README：[README.md](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/README.md)
- 固定许可证：[LICENSE.txt](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/LICENSE.txt)
- 许可证：MIT License
- 版权人：Copyright (c) 2014 Gabriele Cirulli
- `LICENSE.txt` SHA-256：`57e12c39a6ad9d98b2e451065bfdfbd15fc9e0c2ed3bf4dc1d09acab41ff02fc`

GitHub 的固定 commit 元数据显示：

- commit 完整 SHA 与以上固定值一致；
- 作者为 Gabriele Cirulli；
- 作者日期为 2024-10-24；
- commit 只更新 README，但固定树可用于稳定审查该版本的实现与许可证。

固定 README 还披露了它与 1024、Saming 的 2048、Threes 的历史关系。这个历史说明进一步要求本项目只学习抽象规则，不继承名称、传播外观或内容资产。

### 3.2 实际借鉴

只借鉴以下抽象游戏规则：

1. 一次输入让棋盘中的所有元素沿一个正交方向尽可能移动。
2. 相邻且满足相同条件的元素在本次移动中可以合并。
3. 同一个新生成元素在同一次移动中不能再次合并。
4. 没有改变棋盘的方向输入不应生成新内容，也不应消耗回合。
5. 当没有合法移动时，系统需要给出明确的结束状态。

实现阶段可以借鉴“将整盘变换写成纯函数并测试不变量”这一工程思想，但不得抄写上游函数、对象结构、变量名或控制流程。

### 3.3 明确不复制

以下内容全部排除：

- 不复制任何 JavaScript、HTML、CSS 或测试代码。
- 不使用 `2048` 名称、数字目标或数字方块。
- 不使用 2/4 随机生成概率。
- 不使用 Score、Best、继续挑战或单人最高分结构。
- 不使用上游 4×4 视觉布局、500px 固定棋盘、奶油/棕色色板、数字字号层级或 Clear Sans 观感。
- 不使用上游图标、截图、字体、文案或其他资产。
- 不沿用上游本地最高分、游戏状态持久化方案。
- 不以逐函数翻译、改名或换皮的方式实现。

最终项目必须新增独立 `ATTRIBUTION.md`，同时在 README 中提供简明借鉴声明，并固定到上述 commit。

## 4. 上游机制观察

固定版本的 `js/game_manager.js` 展示了以下可验证行为：

- 支持四个正交方向；
- 移动时按远端到近端的次序遍历；
- 只有相同值才合并；
- 通过“本轮已合并”状态避免连锁二次合并；
- 只有棋盘实际改变后才加入新元素；
- 新元素为随机的 2 或 4；
- 达到 2048 为胜利条件；
- 无空位且无相邻可合并元素时结束；
- 状态可经本地存储管理器持久化。

固定版本 `style/main.css` 的视觉识别包括方形 4×4 格、粗大数字、Score/Best 卡片、奶油背景与棕色棋盘。它们属于本候选的禁止复制边界。

## 5. 候选机制收缩

### 5.1 共享状态

第一版建议采用独立设计的 4 列 × 3 行“回忆书架”，不是数字棋盘。

每张线索由两个维度决定：

- 主题：地点、味道、声音、照顾，共四类。
- 阶段：碎片、片段、故事、章节，共四级。

只有“主题相同且阶段相同”的两张线索可以合成下一阶段。新生成的线索在同一次整盘滑动中不得再次合成。

当“章节”首次形成时，它不继续留在棋盘中，而是进入共同相册。相册收齐三个不同主题的章节即完成挑战。

### 5.2 双方职责

每个有效回合包含两个不可互换的动作：

1. **整理者**：选择上、下、左、右，让整页线索移动与合成。
2. **补页者**：从公开的两张下一线索中选一张，再从来向边缘的空位选择落点。

随后双方交换角色。无效滑动：

- 不生成新线索；
- 不交换角色；
- 不减少候选队列；
- 只给出可感知的原因提示。

这使合作不只是“轮流按方向键”，而是每个完整回合都要求两人分别控制压缩方向与未来供给。

### 5.3 分享阶段

当新的章节进入相册时，界面展示一条原创、泛化的口头提示，例如：

- 地点：“你们会把哪一次一起出发收进这里？”
- 味道：“哪一种味道会让你立刻想到对方？”

页面只提供：

- “说好了，继续”
- “这题先留白”

二者都能继续游戏；选择留白不会扣分、减少资源或改变结局。第一版不提供文本框、麦克风或答案存储。

### 5.4 有限且可验证的内容

第一版应使用：

- 3 个固定关卡；
- 每关固定初始棋盘；
- 固定、公开的线索队列；
- 每次显示两张可选线索；
- 固定胜利目标；
- 可穷举或搜索验证的解法；
- 失败后原样重开，不重随机种子。

正式实现前必须用状态搜索证明至少存在一条解，并在测试中固定一条黄金路径。若无法在合理状态空间内证明，候选仍停留在 Conditional Go。

## 6. 与现有 58 项逐项去重

### 6.1 Surprise

| 现有 ID | 现有核心 | 本候选的决定性差异 |
|---|---|---|
| `love-tree` | 点击爱心让树生长并显示信件 | 本候选是双方策略合成，没有预设单向揭晓 |
| `memory-letter` | 依次打开回忆与日期邀请 | 本候选的章节由棋盘决策产生，非顺序阅读 |
| `scratch-surprise` | 刮开覆盖层揭示礼物 | 无刮擦与单次揭晓；核心是持续的双角色回合 |
| `date-wheel` | 转盘随机决定约会 | 不随机抽取结果，使用固定可解队列 |
| `panorama-memory` | 拖动浏览本地全景照片 | 不读取照片，不做全景探索 |
| `photo-swap-puzzle` | 任意交换两块恢复 3×3 图片 | 不重建图片；整盘单向移动且只合并同类同级线索 |
| `future-ticket` | 隐藏选择后揭示约会票 | 双方选择始终公开，没有预设惊喜票面 |
| `instant-photo` | 摇晃显影照片和文字 | 无设备摇晃、图片与显影揭晓 |
| `nested-gift` | 多步骤拆开嵌套礼盒 | 没有线性拆包流程，状态由双方策略分叉 |
| `paper-plane-mail` | 设角度力度发射后读信 | 无抛射物理与信件终点 |
| `star-code-unlock` | 用私人线索解锁内容 | 使用通用主题，不要求预录私人答案 |
| `hand-crank-music-box` | 手摇播放旋律 | 不处理音频或连续旋钮输入 |
| `moon-phase-secret` | 调三个轴对准日期月相 | 多回合离散棋盘，不是参数校准谜题 |
| `fog-window-letter` | 擦雾看见字迹 | 不依赖轨迹擦除或隐藏文字 |
| `starlight-keepsake-search` | 移动灯光寻找纪念物 | 不做空间搜寻；线索始终公开 |
| `future-cookie-notes` | 打开三段文字再组装邀请 | 章节由合并产生，顺序和落点参与策略 |
| `origami-heart` | 完成五次折叠显示留言 | 不采用固定步骤手势或最终单向留言 |

### 6.2 Co-op

| 现有 ID | 现有核心 | 本候选的决定性差异 |
|---|---|---|
| `hot-seat-pictionary` | 轮流看隐藏词、画画与猜词 | 全部信息公开，无绘画、隐藏词与猜答案 |
| `twin-light-maze` | 双人同时控制光点过迷宫 | 热座回合制，不是同步移动迷宫 |
| `tethered-heart` | 双方控制张力保持连接 | 无连续物理与张力状态 |
| `lighthouse-passage` | 一人照明、一人驾驶 | 双方轮换职责；没有隐藏可见区域或航行 |
| `rhythm-relay` | 复现并追加节奏序列 | 不考短时序列记忆，棋盘状态持续可见 |
| `telegraph-codebook` | 记忆码本后编码解码 | 不隐藏规则、不考编码记忆 |
| `kitchen-relay` | 分工选材料与摆盘 | 线索选择只是供给，主要状态变换是整盘合并 |
| `closer-cards` | 轮流回答关系话题 | 分享只在章节里短暂触发，主要玩法是共同解谜 |
| `shared-color-studio` | 分别调色直到匹配目标 | 无连续参数拟合与目标色 |
| `signal-repair-manual` | 非对称信息的口头指路 | 双方看到同一棋盘与候选，不依赖隐藏手册 |
| `four-hands-harmony` | 同时按住多个目标 | 回合制单动作，不要求多人触控 |
| `same-pace-star` | 跟随对方节奏 | 不测时间复现与节奏相似度 |
| `steady-together` | 共同平衡小球 | 无传感或连续平衡物理 |
| `moving-home-together` | 一起搬沙发穿过空间 | 不做刚体碰撞和路线导航 |
| `moon-base-power` | 分配资源并连接供能路径 | 无网络连线与资源流；核心是同类合成 |
| `fog-navigation` | 导航者看地图、驾驶者看局部 | 无信息不对称与坐标导航 |
| `cloud-recipe` | 双方掌握不同区间配方 | 不拆分秘密条件，候选队列完全公开 |
| `together-zipper` | 同步拉动完成拉链 | 不考同步速度或双指拖拽 |
| `seven-day-garden` | 轮流打公开卡、规划七日资源 | 本候选每回合包含滑动者与补页者两个动作，且用空间合并而非资源卡效果 |
| `constellation-relay` | 轮流添加图边且保持前缀合法 | 不构建图，不以边约束为合法性核心 |
| `i-heard-you` | 本地语音模型处理双方陈述 | 不调用麦克风或模型，不记录答案 |
| `together-lock` | 局域网同时按住解锁 | 同设备、离线，无同步网络门槛 |
| `lan-pictionary` | 局域网画画猜词 | 不联网、不绘图、不猜词 |
| `compatibility-quiz` | 局域网密封答案后比对 | 无密封回答、匹配率或答案收集 |

### 6.3 Versus

| 现有 ID | 现有核心 | 本候选的决定性差异 |
|---|---|---|
| `lan-connect-four` | 局域网四子棋 | 同设备合作，没有落子成线与胜负双方 |
| `sealed-rps` | 同时密封出拳再揭晓 | 决策公开且合作，无猜拳结算 |
| `balloon-dare` | 轮流承担爆破风险 | 没有随机风险、惩罚或挑战指派 |
| `number-target` | 选数字和运算符逼近目标 | 不做算术或数值目标 |
| `paper-soccer` | 轮流画线推进球 | 不构建路径，也没有攻守球门 |
| `echo-arena` | 复现并追加序列对抗 | 不淘汰对方，不考隐藏序列记忆 |
| `dots-and-boxes` | 轮流画边占领方格 | 无领地、得分或封箱规则 |
| `light-trail-hunt` | 实时移动光迹争夺 | 非实时、无碰撞追逐 |
| `orbit-star-race` | 双方竞速完成目标 | 没有个人赛道、计时或排名 |
| `secret-recipe-code` | 热座猜隐藏配方 | 无秘密代码与对手反馈 |
| `memory-bid` | 竞价自己能记住的序列长度 | 不竞价、不要求复述隐藏序列 |
| `garden-resource-duel` | 密封投入资源后比较 | 所有资源公开且共同决策 |
| `heart-catapult` | 密封角度力度后弹射 | 无物理模拟与隐蔽参数 |
| `soft-sumo` | 实时碰撞把对方推出场 | 无玩家化身、碰撞和淘汰 |
| `reaction-duel` | 比较反应速度 | 无时间优势 |
| `ribbon-tug` | 双方实时拉扯 | 无连续对抗输入 |
| `heart-sprint` | 局域网点击竞速 | 单设备合作，无联网或点击速度比较 |

结论：58 项中最接近的是 `photo-swap-puzzle`、`rhythm-relay`、`closer-cards`、`seven-day-garden` 和 `memory-bid`；本候选必须同时保留“整盘合并、双角色完整回合、章节移出棋盘、口头但不记录”四个区别，才能保持独立性。

## 7. 与当前候选逐项去重

| 当前候选 | 核心机制 | 本候选的决定性差异 |
|---|---|---|
| `photo-slider-race` | 双方各自完成同构 3×3 滑块拼图并竞速 | 单一共享 4×3 状态；整盘压缩合并；合作且不计时 |
| `shadow-duet` | 两人同时维持目标姿势 | 热座回合制，无姿态或持续按压 |
| `capsule-docking` | 分别控制旋转与推进的刚体 | 不做物理；职责在每个回合后交换 |
| `compliment-reels` | 预提交三列选择后组合夸奖 | 无预设组合揭晓；棋盘状态持续演化 |
| `snow-globe-message` | 收集方向动作后沉降出图案 | 不按固定轨迹揭晓消息 |
| `wish-fireworks` | 发射点阵字符烟花 | 无点阵、弹道或逐字展示 |
| `flower-language-bouquet` | 选择三朵花组成花束文案 | 不是一次性排列组合，存在空间合并与可失败关卡 |
| `candle-wishes` | 根据线索匹配蜡烛再揭示 | 不做线索答案匹配或最终惊喜 |
| `shadow-sword-duel` | 双方密封动作后同时结算 | 决策公开、合作、顺序执行 |
| `honeycomb-passage` | 走子或封格且保持双方路径 | 不封路、不含对手棋子与图搜索胜负 |
| `kaleidoscope-names` | 调整二维参数至目标后显名 | 多回合离散策略，不是校准 |
| `word-detour-duel` | 避开禁词描述目标词 | 无语言答案判断与禁词 |
| `vinyl-secret` | 沿唱片沟槽寻找信号 | 不做连续寻迹或隐藏内容 |
| `four-symbol-film-duel` | 用四个符号表达并猜片名 | 无题库猜测和对抗计分 |
| `dual-maze-race` | 同一迷宫上的同步竞速 | 共享目标、热座角色、无计时移动 |
| `penguin-flag-duel` | 带惯性夺旗并返回 | 无惯性、旗帜和对抗地图 |
| `ricochet-tank-duel` | 实时移动、发射与反弹命中 | 无实时战斗、投射物或生命值 |
| `twin-orbit` | 控制两颗星以同 tick 穿门 | 不要求同步时机或连续轨道控制 |

## 8. 本地 A 级可行性

### 8.1 依赖合同

第一版应保持零运行时依赖：

- 纯 HTML、CSS、JavaScript；
- 所有字体使用系统字体栈；
- 所有图形用 CSS 与内联 SVG；
- 不使用 CDN、远程图片、分析脚本或在线字体；
- 不需要构建步骤；
- 双击 `index.html` 即可运行；
- 自动化测试可复用仓库统一的 Node 测试环境，但运行游戏本身不依赖 Node。

### 8.2 `file://` 合同

禁止依赖以下能力：

- `fetch()` 读取本地 JSON；
- ES module 跨文件加载；
- Service Worker；
- WebSocket 或局域网服务；
- 浏览器权限弹窗；
- 相机、麦克风、定位或剪贴板写入；
- 第三方网络请求。

项目入口应只通过普通 `<script src>` 和 `<link rel>` 引用同目录相对资源；浏览器测试必须直接打开绝对路径对应的 `file://` URL。

### 8.3 隐私合同

第一版：

- 不要求输入姓名、日期、照片或具体回忆；
- 不监听或录制双方的口头分享；
- 不写入 `localStorage`、IndexedDB、Cookie 或文件；
- 不发送网络请求；
- 刷新页面即清除局面；
- 分享题允许中性跳过，跳过不受惩罚。

因此页面不是私人信息保险箱，也不会留下另一方无意中可见的回答历史。

## 9. Web 与无障碍依据

机制设计参考以下一手或官方资料：

- [MDN KeyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)：使用标准 `ArrowUp`、`ArrowDown`、`ArrowLeft`、`ArrowRight` 值；避免在表单控件中劫持按键；忽略长按重复输入。
- [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)：统一处理鼠标、触控笔与触摸输入，但不得把滑动设为唯一通路。
- [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)：只在棋盘手势区域声明必要的触摸行为，不在页面全局禁用缩放。
- [WCAG 2.2 Understanding 2.5.1 Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)：所有滑动必须有四个单击方向按钮作为等价替代。
- [WCAG 2.2 Understanding 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)：不要求用户必须完成精确拖动。
- [WCAG 2.2 Understanding 2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：交互目标至少满足 24 CSS px；本项目提高到最小 44×44 CSS px。
- [WCAG 2.1 Understanding 1.4.10 Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)：在 320 CSS px 宽度和 400% 缩放条件下不出现双向滚动。
- [WCAG 2.2 Understanding 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)：遵循 `prefers-reduced-motion`，允许关闭滑动与合成动画。
- [WCAG 2.2 Understanding 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：合成、无效方向、角色交换和完成状态通过 `role="status"` / `aria-live="polite"` 通知，不抢焦点。
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)：页面隐藏时取消未完成的指针手势并停止纯装饰动画，不改动棋盘状态。
- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)：作为最终浏览器验收的规范入口。

## 10. 主要风险

| 风险 | 后果 | 前置控制 |
|---|---|---|
| 只是 2048 换皮 | 候选失去独立价值，也增加外观与代码模仿风险 | 强制双角色回合、固定队列、章节出板、无数字无分数 |
| 补页动作没有策略 | 第二位玩家沦为机械点击 | 每步提供两张公开候选与多个合法边缘落点；搜索验证存在有意义分叉 |
| 规则复杂，口头解释过长 | 点开后不能立即玩 | 首关分步只教“滑一下 → 选一张 → 放边缘”，后续再引入章节 |
| 队列导致无解 | 玩家被固定内容困住 | 对每关做完整状态搜索和黄金路径测试 |
| 分享题给人压力 | 破坏亲密体验 | 仅在章节完成时出现；中性留白与继续完全等价 |
| 动画期间重复输入 | 状态重复移动或角色错位 | 逻辑状态先原子提交，动画锁只负责呈现；重复键和多指输入被忽略 |
| 320px 屏幕过密 | 方格与落点难操作 | 采用 4×3 而非 5 列；操作按钮与落点至少 44px |
| 颜色表达主题 | 色觉用户无法分辨 | 每种主题同时使用文字、符号与轮廓纹理 |
| 口头内容被误以为记录 | 隐私信任下降 | 开场明确“只说给身边的人，页面不会记录”，且没有输入控件 |

## 11. Go / No-Go Gate

### Conditional Go 的解除条件

进入生产代码前，spec 与 plan 必须明确：

- 完整状态模型与一次合并规则；
- 双角色的焦点、键盘与触摸流；
- 固定关卡、队列格式和胜负条件；
- 状态搜索器与至少一条黄金路径；
- 零网络、零存储、零权限自动检查；
- 直接 `file://` 的 Chromium 浏览器 Gate；
- 归因文档的固定 commit、许可证、版权人、借鉴内容与未复制边界；
- 与 `photo-slider-race`、`seven-day-garden`、`closer-cards` 的针对性差异测试或人工验收。

### 直接 No-Go 条件

出现任一项即停止该方向：

- 使用数字方块、Score/Best 或 2048 目标；
- 复制上游代码、CSS、布局、配色或资产；
- 自动随机生成线索；
- 第二位玩家没有独立且有后果的决策；
- 需要 HTTP 服务、CDN 或在线 API 才能完成；
- 关卡没有可验证解；
- 必须输入、上传或保存私人回忆；
- 滑动没有按钮等价操作。

## 12. 研究结论

**Conditional Go。**

它可以成为仓库中少见的“共享状态、角色轮换、确定性空间合成、轻口头交流”项目，但独立性来自组合合同，而不是来自换主题：

- 整理者决定整盘运动；
- 补页者决定未来供给；
- 双方每回合换位；
- 完成章节会离开棋盘；
- 分享只发生在成果节点，且不记录、可留白；
- 固定关卡由搜索证明可解。

后续 brainstorm 必须继续比较至少三个方向，并把“保持双角色强度”作为选型第一标准。
