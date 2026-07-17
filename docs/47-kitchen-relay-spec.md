# A 级「双人小馆」合作流水线规格

## 1. Brainstorm 结论

本批实现原创创意池 C17“餐厅流水线”：两位玩家共用一台设备，传菜员从三条滑槽中选对订单下一样食材并发出，装盘员在飞行期间把盘子移到同一条滑槽接稳。四张订单全部完成前若累计洒落三次，则本轮失败。

| 方案 | 合作价值 | 风险与成本 | 本批决定 |
| --- | --- | --- | --- |
| 一人读菜谱，另一人单独点击食材 | 需要口头沟通 | 读单者没有真实输入，容易沦为旁观 | 不采用 |
| 两人同时按键确认同一食材 | 双方都有动作 | 只考同步，和已有“同心解锁”重复 | 不采用 |
| 一人选食材，一人移动盘子接取 | 信息选择与空间执行分离，双方不可替代 | 需要稳定飞行 token 和触控布局 | 采用 |
| 自动连续出餐倒计时 | 节奏紧张 | 容易让第一次游玩来不及理解 | 不采用全局计时；只有单次 760ms 传送窗口 |
| 错一次重置整张订单 | 惩罚明显 | 前面合作成果被抹掉，挫败过强 | 不采用；只累计一次洒落，订单进度保留 |
| 个体分数与 MVP | 有竞争感 | 破坏共同目标且容易评价谁拖后腿 | 不采用；只显示共享订单与洒落数 |

作品名为「双人小馆」，目录 ID 为 `kitchen-relay`，主分类为双人合作，启动等级 A。它补齐现有 A 级合作样板没有的“同步传递窗口 + 两个角色各自掌握不同状态变量”模型，不新增第三方运行依赖。

## 2. 受众、唯一任务与语气

- **受众**：坐在同一台电脑或平板前，愿意同时操作并互相报滑槽的情侣；
- **唯一任务**：传菜员选中正确食材并发出，装盘员在到达前把盘子移到相同滑槽；
- **语气**：像一家忙而不乱的小馆，共同庆祝接稳和出餐，不评价谁失误；
- **首局理解目标**：进入后 20 秒内知道“左边选对，右边接稳，洒三次前完成四单”。

## 3. 严格最小范围

只实现：

- 传菜员与装盘员两个固定角色；
- 固定四张订单，每张三个有顺序的食材；
- 六种食材：番茄、芝士、面包、生菜、蘑菇、煎蛋；
- 三条共享滑槽、传菜员选择位置、装盘员盘子位置；
- 传菜、飞行、接取、正确/错误/漏接、订单完成、成功/失败与重开；
- 键盘与触控按钮；
- 生成式小馆传菜口与食材图集，代码原生 HUD 和控制面。

明确不做昵称、难度、全局倒计时、做菜动画、切菜、火候、顾客队列、菜谱编辑器、排行榜、历史、持久化、音效、震动、联网房间、双设备同步或商业餐饮品牌。

## 4. 订单与服务计划

### 4.1 食材字典

逻辑层只保存稳定 ID：

```text
tomato, cheese, bread, lettuce, mushroom, egg
```

显示层映射中文名称与 `ingredient-sheet.png` 的 3×2 sprite 坐标。图集只承载食材插画，不承载按钮、订单或状态文字。

### 4.2 菜谱库

首版内置六张三步菜谱；每轮无偏抽取四张且不重复：

| ID | 名称 | 顺序 |
| --- | --- | --- |
| `sunrise-toast` | 朝阳吐司 | 面包 → 煎蛋 → 番茄 |
| `green-sandwich` | 青青三明治 | 面包 → 生菜 → 芝士 |
| `mushroom-melt` | 蘑菇芝士盘 | 蘑菇 → 芝士 → 煎蛋 |
| `garden-plate` | 花园拼盘 | 番茄 → 生菜 → 蘑菇 |
| `cheese-toast` | 芝士烤吐司 | 面包 → 芝士 → 番茄 |
| `brunch-stack` | 早午餐叠盘 | 生菜 → 煎蛋 → 面包 |

每张菜谱的每一步预生成三条滑槽选项：必须恰好包含当前正确食材一次，再加入两个互不重复的错误食材，并无偏洗牌。整轮 `servicePlan` 在开始前一次生成、校验和深冻结，游玩中不再临时抽题。

### 4.3 安全随机

浏览器只用 `crypto.getRandomValues` 和拒绝采样生成 `[0, maxExclusive)` 无偏索引。安全随机不可用时显示可恢复错误，不退化到 `Math.random`。纯逻辑注入 `randomIndex(maxExclusive)`，使订单、选项和测试轨迹可完全重放。

## 5. 双角色输入

### 5.1 传菜员

- `A / D`：在三条滑槽之间循环选择；
- `W`：从当前滑槽发出对应食材；
- 触控：左、传菜、右三个按钮；
- flight 阶段选择与发出锁定，避免第二件食材覆盖在途状态。

### 5.2 装盘员

- `← / →`：把盘子在 0–2 号滑槽之间移动，边界钳制而不循环；
- 触控：左、右两个按钮；
- service 和 flight 阶段都可移动，因此可以在食材出发后补位；
- `event.repeat` 忽略，每个物理按键只移动一步。

当前选择滑槽、盘子滑槽和飞行滑槽必须同时以几何位置、描边/灯号和文本状态表达，不只依赖颜色。

## 6. 传送与结算

`dispatchIngredient` 创建只读 flight：

```text
token, ingredientId, lane, orderIndex, stepIndex
```

浏览器用 760ms CSS 位移和同长度计时器表现传送；`prefers-reduced-motion` 下缩短到 120ms。动画只消费 flight，不自行改比分。

到达时调用 `resolveDelivery(state, token)`：

1. token 不是当前 flight：保持原引用；
2. 盘子不在 flight lane：记一次 `missed` 洒落；
3. 盘子接到但食材不是订单下一样：记一次 `wrong` 洒落；
4. 同 lane 且食材正确：填入当前订单槽，洒落不变；
5. 正确填满第三槽：订单完成数加一并进入 `order-clear`；
6. 任一洒落使累计达到 3：立即进入 `failed`，订单进度保留供结果说明；
7. 第四张订单完成：进入 `success`。

错误或漏接不会清空已经正确装盘的槽；下一次仍需要同一个正确食材。每个 flight token 只允许结算一次。

## 7. 状态机

```text
intro
  └─ START_SERVICE(plan) → service

service
  ├─ MOVE_DISPATCHER(delta) → service
  ├─ MOVE_PLATE(delta) → service
  └─ DISPATCH → flight

flight
  ├─ MOVE_PLATE(delta) → flight
  └─ RESOLVE(token)
       ├─ correct, order unfinished → service(next step)
       ├─ correct, order finished → order-clear / success
       ├─ spill < 3 → service(same step)
       └─ spill = 3 → failed

order-clear
  └─ NEXT_ORDER → service

success / failed
  └─ RESTART → intro
```

权威状态至少包含：

```text
phase, plan, orderIndex, stepIndex, completedOrders, spills,
dispatcherLane, plateLane, flight, lastEvent, nextToken
```

约束：

- 当前正确食材与三条选项只从 `plan + orderIndex + stepIndex` 派生；
- flight 只由 service 创建，重复发出保持原引用；
- 只有当前 token 能结算；过期计时器、重复回调和错误阶段保持原引用；
- order-clear 只能进入下一张订单；最后一单不经过额外 `NEXT_ORDER`；
- 全部状态、计划、订单、阶段选项、flight 与事件递归冻结；
- 畸形输入安全回到初始状态，不修改调用方计划。

## 8. 纯逻辑接口与测试

`logic.js` 使用经典脚本 factory，支持 `file://` 与 Node ESM 测试：

```text
createInitialState()
mapUint32ToIndex(value, maxExclusive)
createServicePlan(randomIndex)
isValidServicePlan(plan)
startService(state, plan)
moveDispatcher(state, delta)
movePlate(state, delta)
dispatchIngredient(state)
resolveDelivery(state, token)
nextOrder(state)
restartService(state)
getCurrentOrder(state)
getStageOptions(state)
```

至少覆盖：

- 四张唯一订单、每单三个合法食材、每阶段三项唯一且恰含正确项；
- 无偏索引接受/拒绝边界、非法随机返回值和不可变计划；
- 传菜员循环、装盘员钳制、错误阶段和 `event.repeat` 编排边界；
- flight 锁定、递增 token、在途移盘、过期/重复 token；
- 正确接取、错误接取、漏接、进度保留与三次洒落失败；
- 每单第三样唯一完成、四单成功、下一单 Gate；
- 重开与畸形状态安全。

## 9. 浏览器编排与可访问性

- intro 主按钮为“开门营业”；随机计划先于任何传菜动画生成；
- 传菜员的三张食材按钮/选项都有名称、当前选择与对应滑槽；
- service 聚焦“传菜”按钮，flight 聚焦装盘员当前方向的可用按钮，结果聚焦唯一主动作；
- `aria-live` 只播报发出、接稳、洒落、完成订单和最终结果，不重复整页 HUD；
- 触控按钮最小 52×52px；桌面两组控制可同时操作，移动端按传菜员 → 装盘员顺序堆叠；
- 页面失焦或切到后台不自动判定失败；当前 flight 的计时器暂停不是首版范围，因此 `visibilitychange` 时立即以当前盘位结算，避免后台回来出现旧动画；
- 动画不改变规则，减少动态模式仍能完成完整流程。

## 10. 本地与数据边界

- 不使用 fetch、XHR、WebSocket、CDN、远程字体、localStorage、sessionStorage、IndexedDB、Cache API、Service Worker、账号、统计或遥测；
- 订单、滑槽、盘子、洒落与结果只在当前页面内存中，刷新即清空；
- 不读取照片、文件、麦克风、摄像头、剪贴板、位置或传感器；
- 所有策略信息公开，没有隐藏答案或私人内容。

## 11. 视觉设计系统

方向是 **1970 年代复古珐琅小馆 + 机械传菜口**：磨损番茄红外框、薄荷绿台面、奶油黄信号灯、深墨蓝阴影、暖白订单纸和丝网印刷食材。

概念稿：

- [1504×1046 桌面 service](assets/kitchen-relay/concept-desktop.png)
- [852×1847 移动 service](assets/kitchen-relay/concept-mobile.png)

### 11.1 固定令牌

| 角色 | 值 |
| --- | --- |
| 暖白纸 | `#f2e4c4` |
| 番茄红 | `#a92d1f` |
| 薄荷绿 | `#3f755b` |
| 奶油黄 | `#e3b63f` |
| 深墨蓝 | `#0a2d48` |
| 暗厨房 | `#18231f` |
| 硬阴影 | `rgba(10, 45, 72, .24)` |

不使用 CSS 渐变。中央传菜口来自本地 `kitchen-pass.png`，食材来自 `ingredient-sheet.png`；运行文字、灯号、盘子、滑槽编号、飞行轨迹与控制面均由 HTML/CSS 原生实现。

### 11.2 布局

- 1504×1046：顶栏；左上大标题，右上订单纸；中央三条传菜滑槽；底部左为传菜员、中间为共享进度、右为装盘员；全部主操作落在首屏；
- 中央背景只作环境，三条透明交互 lane 与 code-native 食材卡、盘子、信号灯覆盖其上；
- 玩家控制面是两个开放分区，不扩展成统计 dashboard 或通用卡片网格；
- 移动端顺序：顶栏 → 标题 → 订单 → 传菜口 → 两组控制 → 共享进度 → 隐私，自然纵向滚动且无横向溢出；
- 所有按钮显式定义字体、边框、硬阴影、hover、active、focus-visible 与 disabled。

## 12. 首屏文案锁

service 首屏只允许：

- `← Two of Us`
- `第 1 / 4 单`
- `双人小馆`
- `一个选对食材，一个接稳盘子。`
- `今日订单`
- 当前菜名、三样食材与 `下一样：…`
- `传菜员`
- `A / D 选食材 · W 传菜`
- `装盘员`
- `← / → 移动盘子`
- `失误 0 / 3`
- `一起出餐 0 / 4`
- `本地运行 · 不联网 · 不保存`

intro 额外允许 `四张订单，洒落三次前一起出完。` 与 `开门营业`；传送和结果阶段允许事件、订单完成、成功/失败与 `下一单` / `重新开门`。不添加 eyebrow、badge、玩法卡、个体分数或第二 CTA。

## 13. 文件、集成与来源

```text
experiences/co-op/kitchen-relay/
├── index.html
├── styles.css
├── logic.js
├── logic.test.js
├── copy.js
├── app.js
├── README.md
└── assets/
    ├── kitchen-pass.png
    ├── ingredient-sheet.png
    └── ATTRIBUTION.md
```

同时更新：

- `experiences/catalog.json` 与根门户内置 catalog；
- `experiences/co-op/README.md`、根 `README.md`、`docs/README.md`；
- `shared/runtime/catalog.test.js` 的 A 级直开与本地边界 Gate。

## 14. 借鉴与来源声明

创意来自本仓库原创创意池 C17“餐厅流水线”。角色分工、队列传递、接取窗口和顺序菜谱是通用合作游戏/餐厅流程机制；本批运行代码、状态机、订单生成、视觉布局、文案与测试均由本仓库原创，没有参考、复制、改写或引入特定开源项目。

桌面/移动概念、空传菜口背景与六食材图集由 OpenAI ImageGen 于 2026-07-17 生成。正式引入任何开源项目时，必须在作品 README 和资产声明中补充固定 URL、commit、许可证、实际借鉴内容与未复制边界。
