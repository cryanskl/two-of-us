# A 级“把夜晚照成我们”可执行规格

- 日期：2026-07-19
- 状态：冻结，可进入计划与视觉阶段
- 工作 ID：`starlight-keepsake-search`
- 目录：`experiences/surprises/starlight-keepsake-search/`
- 调研依据：[116-starlight-keepsake-search-research.md](./116-starlight-keepsake-search-research.md)
- 启动等级：A，经典脚本、相对资源、`file://` 直开

## 1. 产品合同

接收者提起一束小灯，在昏暗的房间里自由移动；光心连续停在某件小物上 700ms，才会把它永久记住并显示一句短句。五件都被找到后，整幅夜景亮起并出现准备者留下的完整信。

| 相近作品 | 权威规则 | 本作边界 |
| --- | --- | --- |
| 星码解锁 | 根据提示选中正确星星 | 没有正确答案或顺序；任意顺序发现五个固定空间目标 |
| 为你引航 | 双角色光束、运动、碰撞与靠港 | 单人探索；光心停留本身就是输入，不控制另一实体 |
| 在雾上，写给你 | 第一遍笔迹生成第二遍锚点 | 目标由冻结地图定义；不记录、比较或描回轨迹 |
| 爱的刮刮卡 | 遮罩透明像素面积 | 不读取像素或透明度；扫过、涂满和大光圈都不能推进 |

完成只由 `foundIds.length === 5` 决定；背景、Canvas、CSS、DPR、光圈视觉半径、动画和图片加载不得进入 reducer。

## 2. 冻结文案与默认纪念物

### 2.1 默认文本

```text
标题：把夜晚照成我们
副题：有些小事藏在暗处，等你慢一点，把光停在它们身上。
开场：提起这盏灯，找找房间里留下的五点微光。看见以后别急着走，停一会儿，它才会记住你。
开始：提起灯
直接打开：不方便寻找，直接点亮
搜索说明：拖动或移动光心，在微微发亮的地方停一下。方向键也可以移动，Home 回到中央。
暂停：先把灯放下
继续：再提起灯
发现标题：已经亮起
完成标题：原来，光一直在这里
默认完成正文：你找到的不是散落的东西，是我们把普通日子过成故事的证据。以后天再黑一点，也没关系，我们已经知道怎样把彼此照亮。
落款：留给愿意慢一点看见我的你
重开：再照一次
```

不得新增倒计时、分数、最佳路线、点击次数、提示消耗、失败、排名、分享、保存、截图或“找错了”措辞。

### 2.2 五件冻结目标

逻辑地图只保存 ID 与整数几何；下面的 label/note 来自默认配置：

| ID | 中心 / 半径 | label | note |
| --- | --- | --- | --- |
| `k1` | `(180,100) / 64` | 那张车票 | 原来期待一件事，也可以从和你一起出发开始。 |
| `k2` | `(800,105) / 82` | 两只杯子 | 平常的清晨，因为多了一只杯子，就有了名字。 |
| `k3` | `(295,455) / 70` | 没拍完的照片 | 有些瞬间不够端正，却刚好是我们。 |
| `k4` | `(685,455) / 70` | 放在一起的钥匙 | 从某一天起，回来不再只是回到一个地方。 |
| `k5` | `(948,360) / 52` | 窗边那颗星 | 最晚亮起的那颗，也一直没有错过我们。 |

label 最多 24 Unicode code points，note 最多 100；配置缺项、重复 ID、额外 ID、空白、非字符串、getter 抛错或超长时按字段回退。配置不得改坐标、半径、数量和规则顺序。

## 3. 文件合同

```text
experiences/surprises/starlight-keepsake-search/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
├── ATTRIBUTION.md
└── assets/
    ├── favicon.svg
    └── keepsake-night.jpg
```

- `index.html` 按 `config.js → logic.js → app.js` 加载经典脚本，不使用 module；
- `config.js` 与 `logic.js` 采用 UMD 风格，浏览器挂全局，Node 测试可 `require()`；
- 作品目录可独立复制，不引用 `shared/`、根运行时、CDN、远程字体或外部 URL；
- 背景是可选生产资产；加载失败时 CSS 夜色、规则目标、文本进度、直接点亮和完成信仍完整；
- README 与 ATTRIBUTION 必须包含可机器发现的借鉴/来源标题、固定版本、权利主体、ImageGen 声明和零复制边界。

## 4. 常量与地图合同

```js
WORLD_WIDTH = 1000
WORLD_HEIGHT = 620
LIGHT_START_X = 500
LIGHT_START_Y = 310
TARGET_COUNT = 5
CAPTURE_RADIUS = 58

TICK_MS = 50
FOCUS_TICKS = 14
KEYBOARD_STEP = 18
MAX_TICKS_PER_ACTION = 5
MAX_FRAME_GAP_MS = 250

TARGETS = [
  { id: "k1", x: 180, y: 100, radius: 64 },
  { id: "k2", x: 800, y: 105, radius: 82 },
  { id: "k3", x: 295, y: 455, radius: 70 },
  { id: "k4", x: 685, y: 455, radius: 70 },
  { id: "k5", x: 948, y: 360, radius: 52 },
]
```

全部常量、地图、默认配置与导出 API 递归冻结。地图校验必须拒绝：数量不是 5、重复/非法 ID、额外字段、非安全整数、越界捕获圈、包含起始光心、两个闭圆相交或相切。闭圆不重叠条件固定为：任意两中心平方距离 `> (r1 + r2)²`。

光圈可视外半径、羽化、噪点和星尘不属于规则常量；CSS/Canvas 可以按概念稿呈现更大的柔光，但命中始终只使用目标捕获圆。

## 5. 整数几何与停留顺序

公开坐标固定为：

```js
{ x: safe integer 0..1000, y: safe integer 0..620 }
```

app 负责把 CSS Pointer 坐标 clamp 后按当前 rect 映射到世界整数；reducer 对非法、非整数或越界输入抛 `TypeError`，不静默 clamp。

唯一目标选择：

```text
inside(target) iff
  (light.x - target.x)^2 + (light.y - target.y)^2 <= target.radius^2
```

地图保证捕获圈不重叠，因此同一光心最多命中一个目标；已经位于 `foundIds` 的目标视为不可聚焦。

每个逻辑 tick 的精确优先级：

1. 若 `controlMode === keyboard`，先按当前 heldKeys 计算 `dx/dy ∈ {-18,0,18}`，逐轴 clamp 后移动光心；相反方向互相抵消，斜向每轴都走 18；
2. 由移动后的光心重新选择唯一、未发现目标；
3. 与原 `focusTargetId` 不同：把新 ID 写入并令 `focusTicks = 0`，本 tick 不累计；无目标则两项都清零；
4. 与原目标相同：`focusTicks + 1`；
5. 精确达到 14 时，把 ID 追加到 `foundIds`，清 focus，增加一次播报；
6. 若追加后数量为 5，同一 tick 进入 complete/search，不等待下一帧或动画。

因此首次进入目标的定位 tick 不计时；还需连续 14 个后续 tick，共至少 700ms。第 13 tick 不发现，第 14 tick 发现。`TICK {ticks}` 按 1..ticks 逐 tick 消费；一个 `{ticks:5}` 与五个 `{ticks:1}` 深相等。

Pointer 的 BEGIN/MOVE 在 action 当下重新选择目标并将新目标的 tick 置 0，但不自行累计；连续时间只由 TICK 推进。

## 6. 状态合同

### 6.1 Phase

```text
intro
searching
paused
complete
```

`paused.resumePhase` 只允许 `searching`；其他 phase 的 resumePhase 必须为 null。

### 6.2 权威状态

```js
{
  version: 1,
  phase,
  resumePhase,
  light: { x, y },
  controlMode: null | "pointer" | "keyboard",
  activePointer: null | {
    pointerId: non-negative safe integer,
    generation: positive safe integer,
    pointerType: "mouse" | "touch" | "pen"
  },
  lastGeneration: non-negative safe integer,
  heldKeys: [], // ArrowUp / ArrowDown / ArrowLeft / ArrowRight，按固定顺序唯一排列
  focusTargetId: null | target ID,
  focusTicks: integer 0..13,
  foundIds: [], // 唯一 opaque target ID，按真实发现顺序
  completionReason: null | "search" | "direct",
  announcementSerial: non-negative safe integer,
  lastNotice: null | "started" | "focus-entered" | "focus-reset" |
    "found" | "paused" | "resumed"
}
```

状态必须 JSON 可往返、递归冻结、只含白名单字段。`assertState` 重新校验几何、目标、phase 和所有派生不变量，拒绝多余字段、非法枚举、不安全整数、错误 key 顺序、重复 found ID、悬空 focus、伪造 focus tick、错误 active/control 组合、complete 数量不足、searching 已找齐五件、direct 非固定 found 顺序、非法 resume 和错误 completionReason。

phase 矩阵：

| phase | 输入 | focus/found | 完成字段 |
| --- | --- | --- | --- |
| intro | mode/active/key 均空，light 为起点，generation 0 | focus 空，found 空 | resume/reason 空 |
| searching | pointer 模式必须有 active 且 keys 空；keyboard 模式 active 空；null 模式两者都空 | found 0..4；mode null 时 focus 必须空；focus 只能指向未发现且当前命中的目标 | resume/reason 空 |
| paused | mode/active/key/focus 均空 | 保留 light 与 found 0..4 | resume=searching，reason 空 |
| complete/search | mode/active/key/focus 均空 | found 恰好五个，顺序任意唯一 | resume 空，reason=search |
| complete/direct | mode/active/key/focus 均空 | 保留 direct 前真实 found 0..4 项及顺序 | resume 空，reason=direct |

`lastGeneration` 在暂停、direct 和正常 pointer 结束后保留；只有 RESTART 回到 0。BEGIN 的 generation 必须精确等于 `lastGeneration + 1`，只有成功 BEGIN 才消费。

## 7. Public actions

每个 action 只允许下列精确字段；缺字段、多字段、非法枚举或越界值抛 `TypeError`：

```text
START
BEGIN_POINTER { pointerId, generation, pointerType, x, y }
MOVE_POINTER { pointerId, generation, x, y }
END_POINTER { pointerId, generation, reason }
ACTIVATE_KEYBOARD
SET_KEY { code, pressed }
CENTER_LIGHT
TICK { ticks }
DIRECT_REVEAL
PAUSE { reason }
RESUME
RESTART
```

- `START`：intro → searching，light 仍在中心，mode null，`lastNotice=started`；
- `BEGIN_POINTER`：searching、无 active、generation 精确下一代时生效；清 heldKeys，mode=pointer，写 active，移动光心并解析 focus；其他合法但过期/错 phase action 引用幂等；
- `MOVE_POINTER`：必须精确匹配 pointerId + generation；移动并解析 focus，同目标保留 ticks，换目标或移出清零；
- `END_POINTER`：reason 只允许 `up/cancel/lost-capture/leave`；匹配时清 active/mode/focus，保留 light/found/generation；旧事件引用幂等；
- `ACTIVATE_KEYBOARD`：searching 时清 active pointer、heldKeys 与 focus，mode=keyboard；若本来已是无按键 keyboard 且无 focus，则引用幂等；保留 lastGeneration，使旧 Pointer 事件失效；
- `SET_KEY`：code 只允许四个 Arrow code，pressed 必须 boolean；searching 时自动由键盘接管并清 active pointer/focus，再按固定 `Up,Down,Left,Right` 顺序增删唯一 key；同模式下重复 keydown/keyup 引用幂等；
- `CENTER_LIGHT`：searching 时由键盘接管、清 active pointer/heldKeys/focus，把 light 设回 `(500,310)`；Home 只在舞台拥有焦点时映射此 action；
- `TICK`：ticks 必须是 1..5 安全整数；只在 searching 且 mode 非 null 时逐 tick 推进；intro/paused/complete 或 mode null 引用幂等；
- `PAUSE`：reason 只允许 `manual/escape/blur/hidden/long-frame`；searching → paused，清 mode/active/keys/focus，保留 light/found/generation；
- `RESUME`：paused → searching，输入仍为空，不自动续算 focus；
- `DIRECT_REVEAL`：intro/searching/paused → complete/direct，保留当时真实 foundIds 0..4 项及顺序，清输入/focus/resume；complete view 负责等价揭示全部五件，不伪造发现状态；
- `RESTART`：仅 complete → 与首次加载深相等的 intro；其他 phase 引用幂等；
- complete 除 RESTART 外的所有结构合法 action 引用幂等。

Pointer app 合同：鼠标在 `pointerenter` 建立会话、`pointerleave` 结束；触摸/笔在 `pointerdown` 建立并 capture、`pointerup/cancel/lostpointercapture` 结束。第二 pointer 不抢占，不消费 generation。`blur`、hidden、Escape 和 rAF delta `> 250ms` 派发 PAUSE；长帧不补算。

### 7.1 浏览器时间累加器合同

app 可以用 rAF accumulator 把经过时间换算成 50ms tick，但必须遵守：

- `focusTargetId` 从 null/A 变为另一个值时清 accumulator 与时间基线，目标进入前残留的 1..49ms 不能带入新目标；
- 同一目标捕获圈内的普通 MOVE 不清 accumulator，否则持续移动的手永远无法蓄满；
- END/leave、PAUSE、发现、complete、DIRECT_REVEAL 与 RESTART 都清 accumulator；
- delta `=== 250ms` 最多派发 `{ticks:5}`，delta `> 250ms` 不派 TICK，只派发 `PAUSE {reason:"long-frame"}`；
- 一次 rAF 中若既消费浏览器事件又派发 TICK，必须保留真实事件顺序；只承诺相同 action 日志或相同 tick 分片深相等，不宣称 SET/TICK 交换顺序等价。

否则目标进入前残留 49ms 会让冻结的 700ms 停留实际缩短到约 651ms，这属于可复现规则 bug。

## 8. 配置与个性化策略

`config.js` 暴露递归冻结的完整默认配置和：

```js
function composeStarlightLetter(view) {
  // TODO（准备者可选，5–10 行）：按最后找到的小物或发现顺序，返回纯文本结尾。
  return view.defaultMessage;
}
```

策略只在 complete view 计算，输入为精确冻结摘要：

```js
{
  foundCount: integer 0..5,
  foundLabels: [string, ...],
  lastFoundLabel: null | string,
  completionReason: "search" | "direct",
  defaultMessage: string
}
```

不得提供目标坐标、note、Pointer、generation、heldKeys、focusTicks、原始 config 或 state 引用。策略返回 trim 后 1..280 code points 的字符串才采用；空白、非字符串、超长、抛错或修改冻结摘要全部安全回退。

动态文字一律 `textContent`；不得把 label/note/message/signature 解释为 HTML、URL、CSS 或选择器。

## 9. View model 与阶段 DOM

`getStarlightView(state, safeConfig)` 返回递归冻结且不共享 state/config 引用的投影：

```js
{
  phase,
  canStart,
  canSearch,
  canDirectReveal,
  canPause,
  canResume,
  canRestart,
  nextGeneration,
  light: { x, y, engaged, controlMode },
  focus: { targetId, ticks, requiredTicks, permille },
  discovery: {
    count,
    total,
    foundIds,
    foundItems: [{ id, label, note }],
    revealedItems: [{ id, label, note }],
    targets: [{ id, x, y, radius, found }]
  },
  activePointer: null | { pointerId, generation, pointerType },
  notice,
  text: {
    title,
    subtitle,
    intro,
    instruction,
    status,
    completionTitle,
    completionMessage,
    signature
  }
}
```

- searching 时 `targets` 只包含 opaque ID 与规则几何供 Canvas 绘制，未发现目标的 label/note 不得出现在 view；`foundItems` 只含真实已发现项，`revealedItems` 为空；
- complete/search 的 foundItems 与 revealedItems 都含五项；complete/direct 的 foundItems 保留真实部分，revealedItems 才按固定地图顺序含全部五项并供 DOM 等价揭示；
- intro DOM 不含纪念物 label/note、完成标题、正文、落款或重开按钮；
- 每次发现才创建该纪念物的 `<li>`，重开删除全部；complete 才创建信件区，重开删除；
- 不得把秘密预放在 `hidden`、`template.content`、`aria-hidden`、透明、屏外或 `display:none` 节点中；这些仍属于可检查 DOM；
- 阶段变化聚焦：START 后舞台；发现不抢焦点；PAUSE 后暂停标题；RESUME 后舞台；complete 后完成标题；RESTART 后开始按钮；
- stable `aria-live` 始终存在，只播报阶段、focus entered/reset、单件发现和完成，不能按 tick 或坐标刷屏。

## 10. Canvas 与视觉投影

生产背景完整绘制房间和五件小物，但不包含 UI 文字、按钮、进度或信件正文。Canvas/DOM 层按 view 绘制：

1. 背景或 CSS 夜色；
2. 全局暗幕；
3. 以光心为中心的柔和 radial gradient 临时显露；
4. 已发现目标的永久暖色轮廓、编号与微光；
5. 当前 focus 的非颜色闭环与整数进度弧；
6. complete 时移除暗幕并显示完整场景。

允许 Canvas 2D `save/restore/clip/globalCompositeOperation/createRadialGradient`，但不读取回像素。DPR resize 后从 view 全量重绘。Canvas 绘制异常不得派发业务 action。

forced colors 下不依赖 Canvas 渐变：舞台叠加 DOM/SVG 系统色光心框、目标编号和已发现列表；reduced motion 下停用星尘、呼吸、光圈追随补间和完成淡亮，光心位置即时更新。

## 11. Golden replay

固定生产动作日志只使用公开 action：

```text
START
BEGIN_POINTER at k1, generation 1
TICK 5 + TICK 5 + TICK 4
MOVE_POINTER to k2
TICK 5 + TICK 5 + TICK 4
MOVE_POINTER to k3
TICK 5 + TICK 5 + TICK 4
MOVE_POINTER to k4
TICK 5 + TICK 5 + TICK 4
MOVE_POINTER to k5
TICK 5 + TICK 5 + TICK 4
```

共 21 条 action，结果必须固定为：

```text
phase: complete
completionReason: search
foundIds: [k1, k2, k3, k4, k5]
lastGeneration: 1
focusTargetId: null
focusTicks: 0
controlMode / activePointer / heldKeys: null / null / []
```

日志不得使用内部发现、直接写状态、跳 tick、关闭 Gate 或测试专用 action。同一日志深克隆重放深相等；每一步都是合法、冻结、可 JSON 往返状态。

## 12. 测试合同

### 12.1 纯逻辑

- 常量、默认配置、地图和 API 递归冻结；地图五目标、起点、越界、相切/重叠精确边界；
- config 每字段 trim/Unicode 截断/回退，五 ID 映射，getter 抛错，compose 输入/输出/修改/超长/异常；
- 初态精确、action exact shape、非法枚举/坐标/tick/key/pointerType/reason；
- BEGIN/MOVE/END pointer generation、第二指、旧事件、mouse/touch/pen 与四种结束原因；
- keyboard 自动激活、四键固定顺序、repeat 幂等、相反方向抵消、对角、边界 clamp、Home；
- 捕获圆中心、闭边界、外一单位、已发现忽略、地图唯一命中；
- 初次进入不计 tick，13/14 边界，5+5+4 分片，换目标/移出/结束/暂停清零；
- 发现单调、重复目标不增加、任意发现顺序、第五件同 tick 完成；
- pause/resume/direct 保留真实 found/restart、长帧 app 合同、complete 幂等；
- forged state：多字段、错误 phase/input/focus/found/key 顺序、伪造 complete/direct、非法 generation/announcement；
- view 不泄露未发现 label/note，opaque ID 不表达物件类别；direct 只在 revealedItems 揭示全部；DOM flags、焦点能力、文案与对象隔离；
- 21 action golden replay、1/5 tick 分片深相等、生产 action 可达与重复重放。

`assertState` 只证明一个快照内部自洽，不证明其历史来源可信。自由探索允许任意合法发现顺序，所以另一个结构完全合法的 `foundIds` 排列不能仅凭当前快照判定为伪造；本作不开放不可信持久化恢复入口，也不把一致性校验描述成防篡改或加密。

### 12.2 目录与静态 Gate

- catalog 精确登记 ID/title/category/level/entry/dependencies/network/attribution；
- `file://` 经典脚本，无 module、远程 URL、fetch/XHR/WebSocket/Worker、存储、剪贴板、分享、下载、媒体、传感器、随机数或 shared 运行时；
- 初始 HTML 不含五个 label/note、完成正文、落款或重开文字；
- Canvas/背景失败、reduced motion、forced colors、48px 操作、`touch-action:none` 仅限舞台、可聚焦舞台与 stable live region；
- README 与 ATTRIBUTION 固定四个 MIT 工程、五份平台规范、两个无许可证 Gist、ImageGen 来源与完整零复制边界。

### 12.3 Browser/IAB

- 1280×800、390×844、320×700：无横向溢出，标题、舞台、进度、主操作和“本地 · 不保存”在首屏可理解；
- 鼠标 enter/move/leave、触屏 down/move/up/cancel/lost capture、方向键/Home、第二 pointer、旧 generation；
- 每件停留、移出归零、任意顺序、五件完成、direct、pause/resume/restart 与焦点迁移；
- 完成前/发现前 DOM 不泄露，发现/完成/重开节点创建删除准确；
- 背景 404 与 Canvas context 失败时直接点亮仍完整；
- reduced motion 与 forced colors 动态检查；console 无 error/warning，Network 只有本地资源；
- ImageGen 概念和最新实现截图同轮 `view_image`，原生概念尺寸尽可能截图，至少五项 fidelity ledger 与首屏可见文案 diff。

## 13. 借鉴与权利合同

README/ATTRIBUTION 必须固定：

- PixiJS v8.18.0 `2c5818b0e75b835ba5980844136b10cbdc3982a9`，MIT；
- PixiJS Filters v6.1.5 `e9d1ca987864f121680bb0d7e9612c05b37748de`，MIT；
- Konva v10.3.0 `ae5bbf7181d0201466045afbbab2297c8ffa7b90`，MIT；
- Phaser v4.1.0 `7304c64effaa4a1be5b8bf02ab13143a76108a19`，MIT；
- Pointer Events、WHATWG HTML、Page Visibility、WCAG、CSSWG 固定 commit 与用途；
- 两个无许可证 Gist 和各类无清晰权利的 spotlight 示例为明确排除；
- 概念稿和生产背景的 ImageGen 日期、无第三方输入、最终路径与用途；
- 独立原创玩法/地图/状态/代码/文案/测试/视觉，以及未复制源码、API、shader、参数、demo、素材、字体或构建产物。

若未来实质复制或改编第三方代码，必须另立提交保存许可证和版权文本，不得沿用“仅研究、零复制”声明。

## 14. DoD

进入目录前必须同时满足：

1. 逻辑、配置、测试和 21 action golden replay 全绿；
2. 完整前端从真实 START 经五次连续停留到 complete，也能 direct；
3. A 级静态 Gate、三档响应式、键盘/Pointer、生命周期、DOM 秘密与资源降级通过；
4. 设计稿、生产资产、实现截图完成同轮 fidelity 对照且无可修复漂移；
5. README/ATTRIBUTION、bugs/learn、目录索引与根内置 fallback 同步；
6. 每部分 build/test、浏览器验证、独立提交，worktree 最终干净。

本规格冻结后，任何规则阈值、目标坐标、默认文案、phase/action/state 字段或秘密边界变化都必须先更新规格与测试，再改实现。
