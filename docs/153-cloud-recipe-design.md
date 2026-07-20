# “这一场雨，我们一起接”视觉设计与资产冻结

- 日期：2026-07-21
- 状态：已冻结，待实现
- 对应调研：[`151-cloud-recipe-research.md`](./151-cloud-recipe-research.md)
- 对应规格：[`152-cloud-recipe-spec.md`](./152-cloud-recipe-spec.md)
- 视觉方法：OpenAI 内置 ImageGen 纯文字生成三态概念、生产背景与完成插画；云带对首次生成稿做一次 ImageGen 修正

## 1. 冻结结论

视觉方向是 **天空里的天气调饮台**：浅粉蓝天空是一整张安静工作面，象牙纸艺云带承担接取主体，黄铜与莓红把手分别标记左右权限，蓝/金/玫瑰三色配方滴从七条细雨道落下，完成时三只玻璃瓶装住晨光、晚霞和星夜。

它面向成年伴侣，浪漫但克制；不是儿童接物小游戏、街机计分板、赌场机台、现实气象仪表、赛博控制台或拟真暴雨。

生成图片只承担气氛与材质。所有规则信息——七道、目标/灰滴、左右边界、进度、尝试、按钮、文案和完成摘要——必须由真实 DOM/CSS 与 reducer view 表达。

## 2. ImageGen 概念与生产源稿

### 2.1 文件台账

| 文件 | 尺寸 | SHA-256 | 用途 |
| --- | ---: | --- | --- |
| [`assets/cloud-recipe/cloud-recipe-concept.png`](./assets/cloud-recipe/cloud-recipe-concept.png) | 1536×1024 | `4ef5ae421850dca9a55aeb43a860a957d64774a1dd5544ec296400bad385b849` | 桌面进行、移动进行、桌面完成三态构图概念；不进入运行时 |
| [`assets/cloud-recipe/weather-kitchen-background-source.png`](./assets/cloud-recipe/weather-kitchen-background-source.png) | 1672×941 | `7e7c2e17c3df7f717e99381c9dcfc978ae0e0b8e60a95e84d6db1884ada629cc` | 生产背景源稿 |
| [`assets/cloud-recipe/cloud-ribbon-source.png`](./assets/cloud-recipe/cloud-ribbon-source.png) | 1983×793 | `544ab0fb696212aaaca571e7b0af175b473585e1b774e3926136c6c6d6982be9` | 生产云带源稿，浅蓝实底，无 alpha |
| [`assets/cloud-recipe/weather-bottles-source.png`](./assets/cloud-recipe/weather-bottles-source.png) | 2168×725 | `8ab36af24644d4bd0b815cb1e1c60890b3507a7be121ac9b22e9c3d129488c45` | 配方完成与 complete 的三瓶插画源稿 |

四张图已用 `view_image(detail="original")` 查看。生产实现按下表逐字节复制，不裁切、不重编码、不经脚本改图：

| 源稿 | 运行时目标 |
| --- | --- |
| `weather-kitchen-background-source.png` | `experiences/co-op/cloud-recipe/assets/weather-kitchen-background.png` |
| `cloud-ribbon-source.png` | `experiences/co-op/cloud-recipe/assets/cloud-ribbon.png` |
| `weather-bottles-source.png` | `experiences/co-op/cloud-recipe/assets/weather-ingredients.png` |

### 2.2 生成输入声明

- 工具：OpenAI 内置 ImageGen；
- 日期：2026-07-21；
- 输入：纯文字 prompt；
- 第三方参考图片：无；
- 开源项目截图、代码截图、商业游戏素材与角色：无；
- 概念提示限定三态、成年伴侣、天气调饮台、七雨道、双权限把手与三瓶完成；
- 背景提示明确只生成气氛，不含 UI、雨滴、雨道、文字和角色；
- 云带修正只引用本轮首次原创云带生成稿，未引用外部图片；
- 三瓶提示明确“恰好三瓶”，禁止标签、额外瓶子、文字和 UI。

## 3. 概念审校与必须舍弃的偏差

接受概念图中的：

- 大舞台 + 双席控制的桌面层级；
- 七条竖向导线般的雨道；
- 象牙云带、黄铜方格左把手、莓红圆点右把手；
- 蓝/莓两个控制区域的视觉分权；
- 纸艺天空、黄铜、玻璃瓶与植物的材质组合；
- complete 的三瓶 + 共同纸笺构图；
- 移动端舞台在上、双席控制在下的单列关系。

实现必须舍弃：

1. 概念板的英文栏目标题；所有真实文字来自冻结中文 DOM；
2. 桌面进行态同时出现八颗彩滴和两颗灰滴；真实当前波只能有两颗彩滴与 0–2 颗邻接灰滴；
3. 概念中的雨滴 lane、颜色顺序与冻结九波不一致；真实位置只来自 public view；
4. 移动概念将控制画成连续滑轨；真实输入是左右各两个离散 button；
5. 概念控制面板里的瓶子、方格符号和装饰表盘可能被误读为功能；真实控制区只放名字、权限、按键和两按钮；
6. 概念云带长度固定；真实云带宽度由 reducer 的闭区间计算；
7. 概念 complete 的空白纸张只是构图；真实页面必须显示三份配方摘要、总尝试和安全结语；
8. 概念里生成的瓶内细节不代表配方颜色判定；它只在完成后作为庆祝插画；
9. 生产背景角落的抽象黄铜仪器只作不可交互装饰，不显示刻度含义，不获得焦点；
10. 不使用首次云带稿：它把透明棋盘画进无 alpha PNG；只使用修正后的浅蓝实底版本。

## 4. 设计令牌

```css
:root {
  --sky-50: #f1f8fb;
  --sky-100: #dceef6;
  --sky-200: #c9e4f1;
  --sky-500: #72a9c2;
  --ink-950: #152b3a;
  --ink-800: #274657;
  --ink-650: #496979;
  --paper-50: #fffaf0;
  --paper-100: #f6edda;
  --paper-300: #ddccb1;
  --brass-700: #8b632b;
  --brass-500: #bd8c42;
  --brass-300: #ddb978;
  --berry-700: #8d3f55;
  --berry-500: #bb6479;
  --berry-200: #edbdc7;
  --blue-drop: #2d70b7;
  --gold-drop: #d4962f;
  --rose-drop: #c55e78;
  --grey-drop: #69747b;
  --danger-700: #713d47;
  --success-700: #2f6a62;
  --focus: #163f8f;
  --shadow-paper: 0 18px 45px rgb(52 76 88 / 18%);
  --shadow-float: 0 12px 26px rgb(36 62 76 / 22%);
  --radius-small: 10px;
  --radius-medium: 18px;
  --radius-large: 28px;
  --content-max: 1240px;
}
```

### 4.1 字体

- 标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 数字与雨道辅助：`ui-monospace`, `SFMono-Regular`, monospace；
- 不加载远程字体；
- 正文最小 16px，辅助信息最小 13px，按钮最小 15px；
- 标题不用全大写、渐变文字或超大英雄字号。

### 4.2 纹样语义

| 元素 | 颜色 | 纹样/符号 |
| --- | --- | --- |
| 左席/左把手 | 黄铜 | 方格交叉纹 + `L/左边` 屏幕阅读文本 |
| 右席/右把手 | 莓红 | 圆点纹 + `R/右边` 屏幕阅读文本 |
| 晴蓝露 | 蓝 | 白色波纹 |
| 日光蜜 | 金 | 蜂巢六边纹 |
| 晚霞汁 | 玫瑰 | 花脉放射纹 |
| 灰滴 | 石墨灰 | 45° 斜纹 + “灰滴”隐藏文本 |

forced-colors 下纹样可被系统色覆盖，但 `目标/灰滴`、`左边/右边` 文本和不同边框样式仍存在。

## 5. 页面骨架

```text
body.cloud-recipe
└── main.app-shell
    ├── header.app-header
    │   ├── brand（小瓶符号、标题、副标题）
    │   └── progress（配方 n/3、原料 n/3）
    ├── section#stage.stage-shell（phase-owned DOM）
    ├── section#controls（仅 falling）
    ├── nav.utility-links（返回目录；结果阶段可见）
    └── p#live-status.sr-only[aria-live="polite"]
```

- body 使用生产背景 + `--sky-100` 回退；
- app-shell 宽 `min(1240px, calc(100% - 32px))`；
- 主卡使用半透明纸白，但落雨舞台内部必须有至少 `0.88` 不透明浅蓝衬底；
- header 桌面 68–84px，不设置全局导航、侧栏、设置、声音或教程抽屉；
- 每个 phase 由 app 真实重建 stage，不保留不可见活动舞台。

## 6. intro 与 recipe-intro

### intro

- 桌面两栏：左边标题/规则/主动作，右边一条静态中性云带示意；
- 两张席位牌并排：左席黄铜边、`A/D`；右席莓红边、`←/→`；
- 规则只讲“接齐两颗彩滴、不要接灰滴”和“两人各管一边”；
- 主按钮“开始接雨”高至少 52px；
- 不挂载真实 drops，也不显示未来目标区间。

### recipe-intro

- 中央纸笺最大宽 720px；
- 上方显示 `第 n / 3 瓶`，标题和 note；
- 三枚 ingredient chip 按真实顺序排列，每枚含纹样与中文名；
- 已完成瓶只以小圆章列在页脚，不显示后续配方；
- 主按钮“接住第一味/继续调下一瓶”；
- 不把三瓶生产图用于未完成配方，以免提前展示完成仪式。

## 7. falling 主舞台

### 7.1 桌面布局

```text
┌ progress / 当前原料 / 尝试 ───────────────────┐
│                                               │
│  0     1     2     3     4     5     6        │
│  │     │     │     │     │     │     │        │
│  │  target   │ grey│ target    │     │        │
│  │     ↓     │  ↓  │   ↓       │     │        │
│       [gold handle===cloud===berry handle]     │
│                                               │
└───────────────────────────────────────────────┘
┌ left seat controls ─┐  ┌ right seat controls ┐
```

- stage 宽占主卡，桌面高 `clamp(430px, 57vh, 610px)`；
- 七道是 `display:grid; grid-template-columns: repeat(7,minmax(0,1fr))`；
- 雨道用 1px 虚线 + 底部小号 `1–7` 可见文本；内部 lane 仍是 0–6；
- drops 在各自 grid column 中绝对定位，`top` 由 `progressPermille` 映射；
- 一波最多四颗滴，z-index 高于雨道、低于结果浮层；
- drop 视觉 42–56px，触摸不直接操作 drop；
- 当前 ingredient 标签始终显示纹样样本与中文名；
- 进度用细横线和“还有约 n 秒”的辅助文案，不用急迫倒计时钟。

### 7.2 云朵闭区间

云朵容器使用同一七列坐标系：

```text
left: leftLane / 7 * 100%
width: (rightLane - leftLane + 1) / 7 * 100%
```

- 上式只是 CSS 定位，值来自 public view，app 不重算合法性；
- `cloud-ribbon.png` 以 `background-size: 100% 100%` 放入容器，并有 CSS 象牙渐变回退；
- 因源稿无 alpha，容器背景色固定 `#cfe8f5`，与舞台浅蓝融合；
- 左把手中心对准 leftLane 列中心，右把手中心对准 rightLane 列中心；
- 把手 48–58px，图案和边框不随云带拉伸；
- 云下方有一句事实文本：`当前接雨范围：第 {l+1} 到第 {r+1} 道`；
- 不绘制真实物理绳、惯性、弯曲或旋转。

### 7.3 双席控制

桌面控制区两列；移动控制区仍两列，不合并：

```text
左席 {name}             右席 {name}
[ A 向左 ][ D 向右 ]    [ ← 向左 ][ → 向右 ]
只移动云朵左边          只移动云朵右边
```

- 原生 button；桌面高至少 52px，390px 高至少 56px，320px 高至少 52px；
- 左席按钮纸白/黄铜，右席按钮纸白/莓红；
- disabled 只用于真实边界 no-op，不把当前正确方向标为 disabled；
- hover 仅 `(hover:hover)`；active 下压 1px；
- `:focus-visible` 3px 双层高对比 outline；
- 不用滑块、拖拽、长按连发或手势。

## 8. retry、wave-result 与 recipe-result

### retry

- 保留一张静止的七道结果小图，但不保留 falling RAF；
- caught 目标加实线圈，missed 目标加虚线空位，caught 灰滴加斜纹警示圈；
- 标题按 status 使用冻结文案；
- 详情只说 `左边/右边漏接` 或 `第 n 道接到灰滴`，不直接泄露完整答案区间；
- 主按钮“再接一次”，显示 `第 {attempt+1} 次`；
- 不抖屏、不闪红、不扣生命。

### wave-result

- 一枚 ingredient seal 从当前滴纹样变成纸章；
- 文案“这一味，刚刚好”；
- 显示本瓶 1/3 或 2/3，不出现得分；
- 主按钮“接下一味”。

### recipe-result

- 第 1/2 瓶只用 CSS/DOM 瓶形 + 当前配方三色层，避免提前展示三瓶完成图；
- 标题“这瓶天气，被我们接住了”；
- 显示该瓶三波总尝试；
- 第 1/2 瓶按钮“调下一瓶”；第 3 瓶按钮“看看我们的三场雨”；
- 第 3 瓶仍不提前挂载 complete 三瓶图，点击后切阶段。

## 9. complete

- 桌面两栏：左 `minmax(0,1.25fr)` 为三瓶插画，右 `minmax(300px,.75fr)` 为结语纸笺；
- 三瓶图使用 `weather-ingredients.png`，完整显示、`object-fit: contain`，背景与纸笺色接近；
- 右栏按晨光露、晚霞糖露、星夜汽水列出三行，数据为每瓶真实 totalAttempts；
- 汇总显示 `九味都接住 · 一共尝试 {n} 次`，不按次数评级；
- composeCompletionNote 只用 `textContent`；
- 主按钮“再调一次”，次链接“返回体验目录”；
- 不加奖杯、星级、排行榜、礼花或自动音频。

## 10. 动效与生命周期

- falling：drop 只根据 tick 改 `translateY`，CSS transition 禁用，避免表现插值滞后于 reducer；
- 云带每次边界动作允许 140ms `left/width` ease-out，但 `prefers-reduced-motion` 下即时跳转；
- intro 云层装饰可 14 秒漂浮，位移不超过 6px；
- success seal 180ms 缩放，retry 标记 160ms 淡入；
- complete 瓶子 240ms 自下而上出现，不逐瓶延迟超过 80ms；
- hidden/blur 停 RAF 并重置 timestamp；重新聚焦不播放错过的动效；
- reduced motion 关闭漂浮、缩放、淡入和云带过渡，不改变 tick、结果和阶段。

## 11. 响应式冻结

| 视口 | 布局与 Gate |
| --- | --- |
| 1440×1000 | falling 舞台 + 双席控制首屏完整；complete 两栏且无横向滚动 |
| 1280×800 | header/间距压缩；舞台最低 400px，控制仍首屏 |
| 390×844 | 单列；舞台 390–430px；控制两列，四按钮全部首屏；complete 插画在上 |
| 320×568 | 无横向溢出；舞台最小 330px；按钮 ≥52px；允许纵向滚动但打开可见云带与第一排控制 |

断点：

- `@media (max-width: 860px)`：intro、complete 双栏转单列；
- `@media (max-width: 560px)`：shell 外边距 10px，纸卡 padding 14px，header 纵排；
- `@media (max-height: 820px) and (min-width: 861px)`：stage 降至 400–470px，收紧标题与控制 gap；
- 不用 JS 决定布局，不让 viewport 改变 lane 或规则 state；
- 背景移动端 `background-position:center top`，底角装饰可自然裁掉。

## 12. 可访问与降级

### 12.1 forced-colors

- body 移除生产背景，使用 Canvas；
- stage 用 Canvas，文本用 CanvasText，雨道和 drop 使用 ButtonText 边框；
- target 额外显示 `◆`，grey 显示 `///`，left handle 显示 `L`，right 显示 `R`；
- focus outline 使用 Highlight；
- `forced-color-adjust:none` 只限极小纹样样本，按钮尊重系统颜色。

### 12.2 图片失败

- 背景失败：body 使用 `--sky-100` + CSS 径向/线性渐变；
- 云带失败：`.cloud-catcher` 以多个 radial-gradient + paper 色画连续云带；
- 三瓶失败：complete 用三个语义 DOM `.bottle`，以三种 CSS 渐变填充；
- 不用 JS 探测图片失败，不显示错误弹窗；
- 三种失败都不改变 state、按钮、文本或完成条件。

## 13. 允许文案

除 152 号规格的冻结短文案、配方 metadata、配置名字与结语外，UI 只允许：

```text
第 {n} / 3 瓶
第 {n} / 3 味
第 {n} 次
开始接雨
接住第一味
继续调下一瓶
左席 {name}
右席 {name}
只移动云朵左边
只移动云朵右边
当前接雨范围：第 {l} 到第 {r} 道
还有约 {seconds} 秒
左边漏接 / 右边漏接 / 两边都漏接
第 {lane} 道接到灰滴
再接一次
接下一味
调下一瓶
看看我们的三场雨
九味都接住 · 一共尝试 {n} 次
再调一次
返回体验目录
```

不出现“失败、输、低分、太慢、完美、评级、最佳玩家”等竞争或羞辱措辞。

## 14. 资产实现与 Fidelity ledger

前端完成后逐项核对：

| 概念关系 | 生产实现证据 | 不允许的偷换 |
| --- | --- | --- |
| 大面积浅蓝天气工坊 | 原样背景 + 高不透明舞台衬底 | 用纯白 SaaS dashboard 替代 |
| 象牙长云 + 两种把手 | 原样云带源稿 + CSS 独立把手 | 把手烘焙进图或用同色同形 |
| 七道纵向层级 | 精确 CSS Grid 7 列 | 图片里假画雨道 |
| 三色滴 + 灰滴 | DOM 水滴、纹样和文本 | 只靠颜色或 emoji |
| 蓝/莓双席分权 | 两个控制 panel + 四原生按钮 | 连续滑杆或单一共享控制 |
| 三瓶完成仪式 | 原样三瓶插画 + 真实 DOM 摘要 | 图片里写死配方名/次数 |
| 移动舞台上、控制下 | 390/320 截图 | 控制盖住雨滴或横向滚动 |

最终验收必须用 `view_image(detail="original")` 查看至少一张真实桌面完成态或进行态截图，并与概念图逐项记录差异。只追求信息层级和材质忠实，不追求复制概念中的错误规则画面。
