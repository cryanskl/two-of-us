# A 级“在雾上，写给你”可执行规格

- 日期：2026-07-19
- 状态：冻结，可进入计划与视觉阶段
- 工作 ID：`fog-window-letter`
- 目录：`experiences/surprises/fog-window-letter/`
- 调研依据：[111-fog-window-letter-research.md](./111-fog-window-letter-research.md)
- 启动等级：A，经典脚本、相对资源、`file://` 直开

## 1. 产品合同

接收者先在雾窗上自由写下一个字、符号或小画，再沿自己的原笔迹走第二遍；被重新经过的露珠锚点逐段擦亮窗景，命中 80% 后整窗清晰并出现准备者留下的信。

本作与“爱的刮刮卡”的规则边界必须保持：

| 维度 | 爱的刮刮卡 | 在雾上，写给你 |
| --- | --- | --- |
| 目标来源 | 准备好的固定覆盖层 | 接收者第一遍留下的自由笔迹 |
| 完成度 | Canvas 透明像素面积 | 原笔迹 unique anchor 命中数 |
| 手势语义 | 任意位置擦除 | 第二遍重新走过自己的路径 |
| 权威数据 | 归一化擦除线段 + 采样比例 | 有界整数笔迹 + 锚点命中集合 |
| 可绕过方式 | 大面积涂抹本来就是玩法 | 涂抹原笔迹之外不得推进 |

透明像素比例、图片 alpha、DPR、CSS 面积和笔刷宽度不得进入本作 reducer 或完成判定。

## 2. 冻结文案

### 2.1 默认配置

```text
标题：在雾上，写给你
副题：先写下一点什么，再沿着它，把窗外慢慢擦亮。
开场：不用写得好看。一个字、一颗星，或者只有我们懂的符号，都可以。
开始：开始写
写好了：就写到这里
重写：清空重写
直接打开：不方便手写，直接打开
描摹说明：沿刚才的笔迹再走一遍，露珠亮起的地方，就是你已经找回的路。
暂停：先停一下
继续：继续写给你
完成标题：窗外亮了
默认完成正文：你刚才写下的每一笔，都让窗外更亮了一点。想说的话没有被风吹走，它一直在这里等你。
落款：留给愿意再走一遍的你
重开：再写一次
```

不得新增分数、计时、排行榜、识别结果、相似度、美观评价、失败次数、分享、上传、导出或“写错了”等措辞。

### 2.2 Gate 反馈

| 条件 | 文案 |
| --- | --- |
| 点数不足 | `再多写几笔，让雾记住你的手势。` |
| 总长度不足 | `让这一笔再走远一点。` |
| 横向展开不足 | `也向左或向右写一点。` |
| 纵向展开不足 | `也向上或向下写一点。` |
| 达到上限 | `雾已经记满了这些笔迹，可以沿它再走一遍。` |
| tracing | `已经重新走过 {hitCount} / {anchorCount} 个露珠点。` |
| cancel | `这一笔停在这里，已经写下的部分还在。` |

反馈只能解释规则缺口，不能评价用户画的内容。

## 3. 文件合同

```text
experiences/surprises/fog-window-letter/
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
    └── window-evening.jpg
```

- `index.html` 按 `config.js → logic.js → app.js` 加载经典脚本，不使用 module；
- `config.js` 与 `logic.js` 使用 UMD 风格，浏览器挂全局、Node 测试可 `require()`；
- 作品目录可独立复制；不得引用 `shared/`、根目录运行时、CDN 或远程字体；
- `window-evening.jpg` 是可选生产背景；缺失时 CSS 色面、窗框、雾 Canvas、状态与信件仍完整；
- favicon 为本地原创 SVG，不含外部引用；
- README 与 ATTRIBUTION 必须各自包含可机器发现的 `## 借鉴与来源声明` 或完整声明标题。

## 4. 常量合同

```js
WINDOW_WIDTH = 1000
WINDOW_HEIGHT = 620

MIN_POINT_GAP = 12
MIN_POINT_COUNT = 12
MIN_DRAW_LENGTH = 720
MIN_BOUNDS_WIDTH = 220
MIN_BOUNDS_HEIGHT = 140

MAX_STROKES = 8
MAX_POINTS_PER_STROKE = 160
MAX_TOTAL_POINTS = 480

ANCHOR_SPACING = 32
MAX_ANCHORS = 160
TRACE_RADIUS = 46
TRACE_REQUIRED_NUMERATOR = 4
TRACE_REQUIRED_DENOMINATOR = 5

MAX_FRAME_GAP_MS = 250
```

所有常量与默认配置递归冻结并导出。规格或测试不得在运行时覆盖常量。

### 4.1 形状摘要

第一遍完成后按 bounding box 分类：

```text
wide      if width * 4 >= height * 5
tall      if height * 4 >= width * 5
balanced  otherwise
none      仅 direct 且进入完成前未通过完整笔迹 Gate
```

只把这个枚举和笔画数量提供给个性化策略，不提供原始点。direct 时即使已有短线、窄线或其他未通过 Gate 的点，`drawingShape` 仍固定为 `none`；只有完成前已通过完整 Gate 才返回 wide/tall/balanced。

## 5. 整数几何

### 5.1 点与距离

公开点固定为：

```js
{ x: integer 0..1000, y: integer 0..620 }
```

近似距离：

```text
dx = abs(x2 - x1)
dy = abs(y2 - y1)
distance = max(dx, dy) + floor(min(dx, dy) / 2)
```

- 第一笔首点总是接纳；
- 后续点与该笔最后接纳点距离 `< 12` 时引用幂等；
- 距离 `>= 12` 才接纳并累加整数 `drawLength`；
- 任何非整数、越界点、额外字段或非有限值都抛 `TypeError`，不静默 clamp；
- app 负责把 Pointer CSS 坐标 clamp 后映射到统一窗格。

### 5.2 有效笔迹 Gate

只有当前没有 active pointer，且至少一笔已结束时才评估：

```text
pointCount >= 12
drawLength >= 720
bounds.width >= 220
bounds.height >= 140
```

四项全满足后 phase 从 `writing` 进入 `ready`。用户在 ready 继续落笔时暂时回到 writing，结束该笔后重新评估；由于指标单调，合法笔迹不会因追加而失效。

`BEGIN_STROKE` 立即在 `strokes` 末尾创建一项并保存首点，active write 始终指向这最后一项；进行中该项的 `endReason = null`。因此 resize 时也能从权威状态重绘当前笔，不另存第二份点数组。只有起点的一笔在结束时保留，因为它参与点数但不会单独满足长度和范围 Gate；未成功 BEGIN 的空会话不进入 strokes，清空会移除全部笔迹。

### 5.3 硬上限

- 第 8 笔开始后不再允许第 9 笔；
- 单笔接纳第 160 点后自动结束当前会话，但只封住这一笔；只要未达到 8 笔或总计 480 点，仍可开始下一笔；
- 总计接纳第 480 点后自动结束当前会话；
- 自动结束使用 `endReason = "limit"`，随后正常评估 ready；
- 达到任一上限后，如果笔迹仍不合法，“直接打开”仍可用；不能要求无限继续写；
- reducer 状态、view 与 action 大小均保持有界。

## 6. Anchor 生成与命中

### 6.1 生成

`CONFIRM_DRAWING` 只能从 ready 发生。它按 stroke 顺序处理，每笔都把累计距离重新从 0 开始：

1. 保留每笔首点；
2. 使用整数近似距离计算段长；
3. 目标距离固定为该笔的 `0, 32, 64, ...`；目标落入某段时，以“目标距离减去该段前累计距离”为分子、该段整数近似长度为分母做整数线性插值；
4. 保留每笔末点；
5. 相邻同坐标候选去重；
6. 每个 anchor ID 固定为 `{strokeIndex}:{sequenceIndex}`。

整数插值使用对称四舍五入：

```text
interpolate(a, b, numerator, denominator)
  = a + roundHalfAwayFromZero((b - a) * numerator / denominator)
```

若候选 anchor 超过 160：先把每笔去重后的首尾标为 mandatory（单点笔只有一项），它们最多 16 项且必须全部保留；从完整候选中移除 mandatory，得到保持原序的 `remaining[]`，`slots = 160 - mandatory.length`。`slots > 1` 时令 `i = 0..slots-1`，选择索引 `floor(i * (remaining.length - 1) / (slots - 1))`；`slots === 1` 时固定选择索引 `floor((remaining.length - 1) / 2)`，即偶数项选择左中位。最后与 mandatory 合并并恢复全局原始顺序，再按每笔最终顺序生成 `{strokeIndex}:{sequenceIndex}` ID。生成结果递归冻结，不能由渲染层修改。

有效笔迹应至少生成 18 个 anchor；若实现违反此不变量，`CONFIRM_DRAWING` 抛内部合同错误，测试必须覆盖。

### 6.2 第二遍命中

tracing 使用同一 Pointer 会话模型，但不保存完整第二遍轨迹。状态只保存 active trace 的上一点和已命中 anchor ID 集合。

- `BEGIN_TRACE` 用半径 46 的闭圆命中起点附近 anchor；
- `ADD_TRACE_POINT` 用“anchor 到上一点—当前点线段的最短距离”命中；
- 设线段向量 `v=b-a`、anchor 向量 `w=p-a`、`vv=v·v`、投影分子 `t=w·v`：`vv=0` 或 `t<=0` 比较 `|p-a|²`，`t>=vv` 比较 `|p-b|²`，否则比较 `cross(v,w)² <= TRACE_RADIUS² * vv`；全部使用安全整数，不开方、不除法、不调用 Canvas hit test、不读取 alpha、不引入 epsilon；
- 同一 anchor 只计一次，命中 ID 按原始 anchor 顺序排序；
- 从原笔迹之外横扫整窗，只有经过半径内的真实 anchor 才推进；
- traceStrokeCount 在每次合法 BEGIN_TRACE 时加一；
- 达到 `ceil(anchorCount * 4 / 5)` 的同一个 action 立即进入 complete，清 active pointer，并设置 `completionReason = "traced"`。

### 6.3 渲染投影

Canvas 允许从命中 anchor 派生清晰圆点，并连接同一 stroke 中相邻且都已命中的 anchors。它只是视觉投影：

- 不把 Canvas 像素写回 reducer；
- resize 后由 strokes/anchors/hit IDs 完整重绘；
- reduced motion 只影响雾淡出和水滴动画；
- 完成后可停止 Canvas 动画并显示完整清晰场景。

## 7. 状态合同

### 7.1 Phase

```text
intro
writing
ready
tracing
paused
complete
```

`paused` 必须保存 `resumePhase ∈ {writing, ready, tracing}`；其他 phase 的 resumePhase 为 null。

### 7.2 权威状态

```js
{
  version: 1,
  phase,
  resumePhase,
  strokes: [
    {
      id: integer,
      points: [{ x, y }],
      endReason: null | "up" | "cancel" | "lost-capture" | "limit" | "pause" | "direct"
    }
  ],
  active: null | {
    mode: "write" | "trace",
    pointerId: integer,
    generation: positive integer,
    strokeId: integer | null,
    lastPoint: { x, y }
  },
  nextStrokeId: integer,
  lastGeneration: integer,
  drawLength: integer,
  bounds: null | { minX, minY, maxX, maxY, width, height },
  anchors: [{ id, strokeIndex, sequenceIndex, x, y }],
  hitAnchorIds: [string],
  traceStrokeCount: integer,
  completionReason: null | "traced" | "direct",
  announcementSerial: integer,
  lastNotice: null | "cancel" | "limit" | "cleared" | "paused" | "resumed"
}
```

`lastGeneration` 初值为 0，必须是非负安全整数；BEGIN action 的 generation 必须精确等于 `lastGeneration + 1`，只有成功 BEGIN 才更新它。app 不维护独立真源，而是从当前 state/view 派生下一 generation。

active write 时必须恰有最后一项 stroke 的 `id === active.strokeId`、`endReason === null`，且 `active.lastPoint` 深等于该笔最后一点；其他 stroke 必须已经闭合。active trace 的 `strokeId` 必须为 null，也不向 strokes 追加点。无 active 时不得存在 `endReason === null`。

phase 矩阵冻结为：

| phase | strokes / active | anchors / hits | 其他不变量 |
| --- | --- | --- | --- |
| intro | 空 / null | 均空 | `nextStrokeId=0`、`lastGeneration=0`、resume/completion 均 null |
| writing | 允许 active write；否则全部闭合 | 均空 | 完整 Gate 未通过，或 active 尚未结束 |
| ready | 全部闭合 / null | 均空 | 完整 Gate 必须通过 |
| tracing | 全部闭合；active 只能 trace | anchors 必须深等于由 strokes 重算的结果；hits 为存在于 anchors 的有序唯一子集 | 完整 Gate 必须通过 |
| paused | 全部闭合 / null | 按 resumePhase 遵循 writing/ready/tracing 对应规则 | resumePhase 唯一非空，completion null |
| complete/traced | 全部闭合 / null | anchors 深等于重算结果；hits 达到阈值 | resume null，completion=traced |
| complete/direct | 全部闭合 / null | 若非空，anchors 必须深等于重算结果，hits 仍是合法有序子集 | resume null，completion=direct；可保留进入前的笔迹/anchor 进度 |

`nextStrokeId` 必须为 0（无 strokes）或现有最大 stroke ID + 1；stroke ID 从 0 连续递增。hit ID 必须存在于 anchors，并严格按 anchors 原始顺序排列，不能按字符串字典序排列。drawLength、bounds、点数、Gate 与 anchors 都必须能从 strokes 重算一致；外部状态不能伪造汇总或 anchor。

状态必须 JSON 可往返、递归冻结、只含白名单字段。`assertState` 拒绝：多余字段、重复 stroke/anchor/hit ID、非排序 hit IDs、悬空 hit、伪造 anchors、越界点、错误汇总、phase 与 active 不一致、错误 active.lastPoint、进行中 stroke 不在末尾、无 active 却有未闭合 stroke、非法 resumePhase、complete 缺 completionReason，以及任何不安全整数。

## 8. Public actions

每个 action 只允许下列精确字段，多余字段抛 `TypeError`：

```text
START
BEGIN_STROKE { pointerId, generation, x, y }
ADD_STROKE_POINT { pointerId, generation, x, y }
END_STROKE { pointerId, generation, reason }
CLEAR_DRAWING
CONFIRM_DRAWING
BEGIN_TRACE { pointerId, generation, x, y }
ADD_TRACE_POINT { pointerId, generation, x, y }
END_TRACE { pointerId, generation, reason }
DIRECT_REVEAL
PAUSE { reason }
RESUME
RESTART
```

所有 pointerId 必须是非负安全整数，generation 必须是正安全整数，x/y 必须是对应窗格范围内的安全整数。字段类型、范围或 action shape 非法时抛 `TypeError`；结构合法但 generation 不是下一代、pointerId/generation 与 active 不匹配或 phase 不允许时引用幂等。

### 8.1 动作规则

- `START`：intro → writing；其他 phase 引用幂等；
- `BEGIN_STROKE`：writing/ready、无 active、未达到 8 笔和 480 总点、`generation === lastGeneration + 1` 时创建 stroke 与 write 会话并更新 lastGeneration；单笔 160 上限不阻止新笔；若来自 ready，先进入 writing；
- `BEGIN_TRACE`：tracing、无 active、`generation === lastGeneration + 1` 时创建 trace 会话并更新 lastGeneration；
- ADD/END：必须精确匹配 pointerId + generation + mode；旧事件引用幂等；
- END_STROKE reason 只允许 `up/cancel/lost-capture`；`limit/pause/direct` 只由 reducer 内部生成；
- END_TRACE 不保存轨迹，reason 同上；
- `CLEAR_DRAWING`：writing/ready 且无 active 时清 strokes/anchors/hits/bounds/length/trace 计数/completion，重置 `nextStrokeId=0`，保留 `lastGeneration` 以拒绝迟到事件，`announcementSerial + 1`、`lastNotice="cleared"`，其他字段与 START 后 writing 深相等；
- `CONFIRM_DRAWING`：ready 且无 active 时生成 anchors 并进入 tracing；
- `DIRECT_REVEAL`：intro/writing/ready/tracing/paused → complete；active write 先以内部 `endReason="direct"` 闭合并重算 Gate，active trace 只丢弃 lastPoint；随后清 active/resumePhase、保留当时合法 strokes/anchors/hits、设置 direct；进入完成前未通过完整 Gate 时策略摘要的 drawingShape 固定为 none；
- `PAUSE`：writing/ready/tracing → paused；active write 以内部 `endReason = "pause"` 闭合并保留已接纳点，随后重新评估 Gate，把 `resumePhase` 设为 writing 或 ready；active trace 只丢弃 lastPoint，`resumePhase = tracing`，不增加命中；无 active 时 resumePhase 保留暂停前 phase；
- pause reason 只允许 `manual/escape/blur/hidden/long-frame`；
- `RESUME`：paused → resumePhase；
- `RESTART`：任意 phase → 与首次加载深相等的 intro，包括 `lastGeneration=0`；app 在下一次 BEGIN 时从 state 重新派生 generation 1；
- complete 除 RESTART 外所有合法 action 引用幂等。

`pointercancel`/`lostpointercapture` 只结束当前会话，不自动暂停。blur、hidden、Escape 和超过 250ms 的 rAF 长帧由 app 派发 PAUSE；PAUSE 必须能在 active stroke 中安全工作。

## 9. View model

`getFogWindowView(state, safeConfig)` 返回递归冻结、无原始配置对象引用的公开投影：

```js
{
  phase,
  resumePhase,
  canStart,
  canDraw,
  canConfirm,
  canTrace,
  canClear,
  canDirectReveal,
  canResume,
  canRestart,
  nextGeneration,
  drawing: {
    strokeCount,
    pointCount,
    length,
    bounds,
    shape,
    gate: { points, length, width, height, ready },
    strokes
  },
  tracing: {
    anchorCount,
    hitCount,
    requiredCount,
    ratioPermille,
    traceStrokeCount,
    anchors,
    hitAnchorIds
  },
  active: { mode, pointerId, generation } | null,
  notice,
  text: {
    title,
    subtitle,
    instruction,
    status,
    completionTitle,
    completionMessage,
    signature
  }
}
```

`nextGeneration === state.lastGeneration + 1`，只供 app 创建下一次 BEGIN action；它不得进入个性化策略摘要或可见文案。

原始 point/anchor 用于本地 Canvas 重绘，可以出现在 view；它们不能进入个性化策略摘要，也不保存或上传。

## 10. 安全配置与学习 TODO

`config.js` 提供冻结默认值与：

```js
function composeFogWindowLetter(view) {
  // TODO（欢迎准备者写 5–10 行）：
  // 只根据 strokeCount、drawingShape、completionReason 组合私人完成句。
  // 不修改 view，不读取原始笔迹；保持一个完整默认返回值。
}
```

传入策略的 view 精确为：

```js
{
  strokeCount: integer 0..8,
  drawingShape: "wide" | "tall" | "balanced" | "none",
  completionReason: "traced" | "direct",
  hitCount: integer,
  anchorCount: integer,
  defaultMessage: string
}
```

它递归冻结。策略抛错、修改上下文、返回非字符串/空白/超过 240 Unicode code points 时，安全回退 `defaultMessage`。策略不得得到 points、pointerId、generation 或 DOM。

配置清洗：

| 字段 | 上限（Unicode code points） |
| --- | --- |
| title | 40 |
| subtitle | 100 |
| intro | 180 |
| completionTitle | 40 |
| defaultMessage | 240 |
| signature | 80 |
| 任一按钮 | 32 |

所有值 trim；非字符串、空白或超出后截断为空的值逐字段回退。页面只以 `textContent` 或节点创建显示配置，禁止 `innerHTML`。

这个 TODO 是准备者可选的私人创作点，不是启动依赖。不修改时作品必须完整可玩。

## 11. DOM、Canvas 与秘密

### 11.1 初始 HTML

允许常驻：标题、副题、阶段标题、说明、雾窗容器、Canvas、状态、主动作、清空、直接打开、暂停和返回作品集。禁止常驻：完成正文、落款、重开完成卡。

### 11.2 阶段拥有 DOM

- intro/writing/ready/tracing/paused 都不得创建完成正文节点；
- complete 才用 `createElement` + `textContent` 创建完成标题、正文、落款与重开；
- RESTART 必须移除 complete 专属 DOM，而不是只隐藏；
- 完成内容虽然存在于本地 `config.js` 源码，但不提前进入页面可访问树；README 必须诚实说明源码级秘密边界。

### 11.3 Canvas 分层

推荐一个可访问容器内使用两张视觉 Canvas：

- `fog-canvas`：雾、露珠和第一遍深色指痕；
- `clear-canvas`：命中锚点派生的清晰路径与完成过渡。

两张 Canvas 都 `aria-hidden="true"`；外层交互面是带可访问名称、阶段说明和 Pointer 监听的单一元素。规则与信件文字必须由 DOM 表达。

Canvas context 获取失败时：隐藏交互面，显示说明并保留“直接打开”。不得抛错、空白页或把信件永久锁住。

## 12. App 输入合同

- 页面只使用 `PointerEvent`，不并行注册 touch/mouse 造成重复轨迹；
- 不筛掉 pressure=0、isPrimary=false 或 pointerType；首版不把 pressure 写入规则；
- 每次成功 BEGIN 的 generation 单调增加，即使浏览器复用 pointerId；
- `setPointerCapture` 失败时 document pointerup/cancel 仍可精确结束；
- `getCoalescedEvents()` 若存在，按时间顺序映射并派发，主事件坐标去重；不存在时只派发主事件；
- pointermove 只在 active 会话消费并 preventDefault；hover 不写状态；
- pointerup/cancel/lost capture 汇聚到一个幂等结束器；
- lostpointercapture 迟到且同 pointer 已被新 generation 占用时不能结束新会话；
- resize 用 `ResizeObserver` 或 window resize 重设 DPR 位图并从 view 全量重绘；不得派发规则 action；
- rAF 只驱动非权威雾动画；gap >250ms 派发 long-frame PAUSE 并清动画时间基线；
- beforeunload/pagehide 不保存任何状态，只释放监听与动画引用。

## 13. 焦点、播报与可访问性

| 转换 | 焦点目标 |
| --- | --- |
| 首次加载 | H1，不自动抢焦点 |
| START | 雾窗交互面 |
| writing → ready | “就写到这里” |
| CONFIRM | 雾窗交互面 |
| PAUSE | paused 标题 |
| RESUME | 雾窗交互面或 confirm 主动作，依 resumePhase |
| complete | 完成标题，`tabindex=-1` |
| RESTART | 开始按钮 |

- 状态容器 `aria-live="polite"`，只在 phase、Gate 缺口、每跨 10% tracing、取消、上限和完成时更新；
- 不逐点播报，不把坐标或 pressure 读出；
- 雾窗交互面至少 280×280px；按钮至少 48px 高；焦点环 3px + 3px offset；
- 颜色之外用线型、露珠实/空心、文字计数和阶段标题表达状态；
- “直接打开”始终是可见真实按钮，不藏在无障碍专用菜单里。

## 14. 响应式与视觉约束

- 目标视口：1280×800、390×844、320×700；不得横向滚动；
- 首屏必须看见：标题、当前阶段说明、完整雾窗、状态和至少一个当前主动作；
- 桌面雾窗目标约 760×470；移动端宽度铺满、保持 1000:620 比例；
- 320×700 可压缩装饰和留白，但雾窗交互面不得低于 280px，主动作不得低于 48px；
- 信件 complete 可纵向滚动，但完成标题、正文首段和重开入口应在 390×844 首屏；
- 不把照片、信件、控件或可读文字烘焙进背景；
- 视觉阶段必须生成桌面 writing、移动 tracing、桌面 complete 三张完整概念及一张无字窗外生产场景；
- 最终必须用 `view_image` 同轮比较已接受概念和最新浏览器截图，至少记录五项 fidelity 对照。

## 15. 测试矩阵

### 15.1 常量与配置

- 常量、默认配置、API 与状态递归冻结；
- Unicode 截断、trim、逐字段回退、策略异常/修改/非法返回；
- 策略只收到冻结摘要，不含 points/pointerId/generation。

### 15.2 点、长度与 bounds

- 水平、竖直、对角和反向整数距离；
- gap 11 拒绝、12 接纳；同点引用幂等；
- bounds 首点、四方向扩展、宽高精确；
- 点数 11/12、长度 719/720、宽 219/220、高 139/140；
- 单点、窄横线、窄竖线、合法 wide/tall/balanced；
- 第 8/9 笔、第 160/161 单笔点、第 480/481 总点。

### 15.3 Anchor

- 每笔首尾保留、32 间距、重复坐标去重；
- 正负插值半值对称；
- 多笔顺序和 ID 稳定；
- 有效 Gate 固定至少产生 18 anchors，低于时内部合同错误；
- 候选恰好 160 不抽样，161 开始抽样；
- mandatory 从 remaining 移除、每笔首尾合并后仍不丢；
- `slots=1` 且 remaining 为偶数时固定选择左中位；
- 保存一个超过 160 候选的精确 golden anchors/IDs；
- 相同 strokes 深相等 anchors，action 不被修改。

### 15.4 Trace

- BEGIN 圆命中中心、半径 46 闭边界、47 不命中；
- segment 命中跨过但无事件落点的 anchor；
- 线段 `vv=0`、`t=0`、`t=vv`、投影在线段前/后和内部投影分别命中正确；
- 内部垂距 46 命中、47 不命中，正负 cross 严格对称；
- 窗格最大坐标组合的平方乘积仍为安全整数并判定正确；
- 重复经过同 anchor 只计一次；
- 跨多个 anchor 同 action 按原序加入；
- 原笔迹外整窗涂抹不推进；
- `ceil(anchors*4/5)-1` 不完成，达到精确阈值立即 traced complete；
- BEGIN_TRACE 首点若达到阈值，在同一 action 立即完成；
- direct complete 与 traced complete 的内容完整、reason 不同。

### 15.5 状态与生命周期

- 精确 action shape、非法字段与不安全整数；
- 成功会话结束后复用 generation 被拒绝；下一 generation、迟到旧 ADD/END 与 JSON 往返后的继续输入正确；
- 旧 pointerId/generation、第二 pointer、迟到 end 引用幂等；
- cancel/lost capture 保留写下点但不伪造终点；
- active write 时 pause 安全结束，active trace pause 不增加命中；
- active write/trace 中 DIRECT 正确闭合或丢弃 lastPoint；paused DIRECT 清 resumePhase；
- blur/hidden/escape/long-frame 恢复正确 phase；
- START/PAUSE/RESUME 在错误 phase 引用幂等；
- CLEAR 精确重置内容、ID 与摘要，保留 lastGeneration，并递增 announcementSerial；
- 单笔 limit 后仍可开下一笔；总量/笔数 limit 后迟到 ADD/END 不改变状态；
- complete 锁定，RESTART 与首次 intro 深相等；
- JSON 往返后可继续确定性推进；畸形外部状态全部拒绝。
- 伪造 anchors、悬空 hit、错误 active.lastPoint、无 active 的 `endReason=null`、错误 phase 矩阵和 lastGeneration 全部拒绝。

### 15.6 静态与浏览器

- 三个生产脚本语法通过；
- HTML 无 module/远程 URL，源码无 fetch/storage/media/clipboard/FileReader/innerHTML/eval；
- DPR 1/2/3 与 resize 后状态摘要不变、画面重绘；
- Canvas context 失败仍可直接打开；
- 1280×800、390×844、320×700 无横向溢出；
- mouse/touch/pen、coalesced 有/无、capture 失败、cancel、lost capture、第二指、暂停、直接打开、完成、重开真实实玩；
- reduced motion、forced colors、背景缺失和 favicon 无控制台错误；
- complete 前 DOM 搜索不到正文，complete 后正文可读且焦点正确。

## 16. 借鉴与零复制合同

README 与 ATTRIBUTION 必须逐项固定：

- Signature Pad `b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb`，MIT；
- perfect-freehand `f56f097e0e211fffa1601b93883e4d9f9dccf122`，MIT；
- Fabric.js `723838fcbb9feaa87c8840082640de2ed82383da`，MIT；
- Paper.js `c1d88390d2c86901db152827fe778c3e39cfb073`，MIT；
- Pointer Events、UI Events code、WHATWG HTML、Page Visibility、WCAG 与 CSSWG 的固定 commit；
- `sebnozzi/minimicro-foggywindow@1821f892...` 与 `negi141/pittura-demo@a9227e68...` 无许可证，明确排除；
- OpenAI 内置 ImageGen 的生成日期、用途、完整提示词位置、第三方图片/源码输入为无；
- 本作完整原创与零复制声明。

不得复制或改写上述来源的源码、API、算法实现、参数、测试、demo、图片、GIF、字体、文案、页面结构或视觉。内部“爱的刮刮卡”只作为差异对照，不复制其 55% 面积 Gate、逻辑、DOM、样式或 Canvas 实现。

## 17. 分片与提交 Gate

1. 本规格与索引；
2. 分步实施计划；
3. 三张视觉概念、生产场景和设计说明；
4. `config.js + logic.js + logic.test.js`；
5. HTML/CSS/app/README/ATTRIBUTION/assets；
6. 目录、门户、backlog、目录测试与总览；
7. bugs/learn；
8. 浏览器与全仓验收记录。

每片完成后：检查当前分支和 worktree，只暂存该片文件，运行与风险匹配的语法/逻辑/全仓/统一验收，并独立提交。任何前片修复必须单独提交或在后片开始前明确归属，不能隐藏在无关提交中。

## 18. 规格放行

**放行进入计划与视觉阶段。** 规格已经冻结双遍同轨迹的产品差异、整数窗格、笔迹 Gate、anchor 生成与命中、资源上限、Pointer generation、生命周期、等价入口、阶段 DOM、配置 TODO、响应式、来源和提交边界。

实现不能把 anchor Gate 简化成透明面积，不能为省事引入绘图库，不能提前把信件放入 DOM，也不能以可访问入口为由取消核心手写路径。
