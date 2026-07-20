# “把两边，拉成我们”视觉设计与资产冻结

- 日期：2026-07-21
- 状态：已冻结，待实现
- 对应调研：[`156-together-zipper-research.md`](./156-together-zipper-research.md)
- 对应规格：[`157-together-zipper-spec.md`](./157-together-zipper-spec.md)
- 视觉方法：OpenAI 内置 ImageGen 纯文字生成三态概念、生产背景、拉链位置章与完成插画

## 1. 冻结结论

视觉方向是 **午夜里的双人裁缝桌**：深靛蓝与暗酒红织物分别代表左右席，暖黄铜承担共同拉链与时间刻度，奶油纸笺承载规则与结果。整体像两个人在夜里一起完成一件小手作，亲密、克制、有真实触感，但不做婚礼请柬、儿童手工课、街机音游、赛博控制台或奢侈品广告。

核心布局是一条居中的纵向拉链：15 颗齿由 DOM 严格生成，当前齿旁只有一条公共时间轨和一段亮起的同步窗。左、右控制并列且等权，不给任何一边更大的视觉权威。完成时，两块布完全合拢，一枚双色针脚汇成单线的布章成为纪念物。

生成图片只承担氛围与材质。所有规则信息——15 齿、当前齿、公共时间轨、同步窗、两席输入、attempt、失败原因、段落摘要与结语——必须由真实 DOM/CSS 与 reducer view 表达。

## 2. ImageGen 概念与生产源稿

### 2.1 文件台账

| 文件 | 尺寸 | SHA-256 | 用途 |
| --- | ---: | --- | --- |
| [`assets/together-zipper/together-zipper-concept.png`](./assets/together-zipper/together-zipper-concept.png) | 1536×1024 | `18b90a765e6124eb4e0494afb5e032779793d1755e3b05c3727ae50756cf8f2e` | 桌面进行、移动进行、桌面完成三态概念；不进入运行时 |
| [`assets/together-zipper/tailor-table-background-source.png`](./assets/together-zipper/tailor-table-background-source.png) | 1672×941 | `f35353786be7d5fadc0506fa6e1fc479eeba1c579f4f20c36caf016f8c1fa9d6` | 生产背景源稿 |
| [`assets/together-zipper/brass-zipper-pull-source.png`](./assets/together-zipper/brass-zipper-pull-source.png) | 1254×1254 | `958d148ca8613db1455cbb8c9f5cd606359ad75ebd443adc7411cbcf23e6b9a5` | 当前拉链位置的材质章源稿，深靛实底、无 alpha |
| [`assets/together-zipper/completed-keepsake-source.png`](./assets/together-zipper/completed-keepsake-source.png) | 1536×1024 | `641ece5a37d7a6387ea76a0d0d735c96043592444b7b67f0eed53bd211fec02a` | complete 合拢织物与纪念布章源稿 |

四张图已用 `view_image(detail="original")` 查看。生产实现按下表逐字节复制，不裁切、不重编码、不经脚本改图：

| 源稿 | 运行时目标 |
| --- | --- |
| `tailor-table-background-source.png` | `experiences/co-op/together-zipper/assets/tailor-table-background.png` |
| `brass-zipper-pull-source.png` | `experiences/co-op/together-zipper/assets/brass-zipper-pull.png` |
| `completed-keepsake-source.png` | `experiences/co-op/together-zipper/assets/completed-keepsake.png` |

### 2.2 生成输入声明

- 工具：OpenAI 内置 ImageGen；
- 日期：2026-07-21；
- 输入：纯文字 prompt；
- 第三方参考图片：无；
- 开源项目截图、代码截图、商业游戏素材与角色：无；
- 概念提示限定桌面进行、移动进行、桌面完成三态，以及成年伴侣、午夜裁缝桌、纵向拉链与双席等权；
- 背景提示明确中央留白，不含拉链、UI、文字、人物或答案；
- 拉链章提示明确单物件、深靛皮革实底、无透明棋盘，不把图片伪装成 alpha 素材；
- 完成图提示明确一条闭合拉链、一个布章、无人物、无文字、无奖杯；
- `baoyu-image-gen` 技能因当前环境没有其可用配置扩展而无法直接调用；遵循其 Codex fallback，使用原生 ImageGen，没有安装密钥、修改用户配置或调用外部图片服务。

## 3. 概念审校与必须舍弃的偏差

接受概念图中的：

- 桌面“主舞台 + 左右控制”与移动“舞台在上 + 双控制并排”的层级；
- 中央纵向黄铜拉链与左右靛蓝/酒红织物；
- 左右席面积、按钮和亮度等权；
- 深色舞台、奶油纸笺、黄铜器件和边缘裁缝工具的材质组合；
- complete 将织物完全合拢并以一枚布章收束；
- 规则区大、装饰区小，主动作位于视线下半部。

实现必须舍弃：

1. 概念板的显示器/手机外壳；生产页面是真实响应式 DOM，不画假浏览器或设备框；
2. 概念里的齿数不是严格 15；生产必须恰好生成 15 个齿，按 4/5/6 分段；
3. 概念把蓝、粉两条竖轨画成两份独立时间线；生产只用一条公共黄铜时间轨，左右状态另有文字和小灯；
4. 概念的两块控制只有拉链图标；真实按钮必须显示姓名、左/右、`F/J` 和“拉这一边”；
5. 概念顶部横轨容易被理解为进度滑块；生产顶部只显示静态 15 齿进度，不可拖动；
6. 概念桌面进行态的拉链头和当前齿关系不严格；真实位置只来自 `completedTotal` 与当前 tooth；
7. 概念没有失败原因、attempt 和同步窗文字；真实页面必须以可读文本补齐；
8. 概念 complete 的刺绣手势被生产图替换为抽象双色针脚，避免人物与具象手部；
9. 生产拉链章是明确的皮革方片，不做 CSS 抠图或伪透明；它是位置装饰，不是按钮；
10. 背景中的灯、线轴、针碟和纸样不得获得焦点或暗示功能；窄屏可自然裁掉。

## 4. 设计令牌

```css
:root {
  --night-975: #0e1118;
  --night-950: #151923;
  --night-900: #1d2230;
  --indigo-850: #17263d;
  --indigo-700: #29466e;
  --indigo-400: #6f91bd;
  --wine-850: #471f2b;
  --wine-700: #6f3041;
  --wine-400: #b26778;
  --paper-50: #fff8e8;
  --paper-100: #f5ead2;
  --paper-300: #d9c49d;
  --ink-950: #251d17;
  --ink-750: #55483a;
  --brass-750: #76511f;
  --brass-550: #ad7c35;
  --brass-350: #d4ad67;
  --success: #8fb69b;
  --danger: #d39a8c;
  --focus: #ffe19a;
  --shadow-panel: 0 22px 60px rgb(0 0 0 / 32%);
  --shadow-brass: 0 6px 18px rgb(9 7 4 / 45%);
  --radius-small: 10px;
  --radius-medium: 18px;
  --radius-large: 28px;
  --content-max: 1180px;
}
```

### 4.1 字体

- 标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- tick 与键位：`ui-monospace`, `SFMono-Regular`, monospace；
- 不加载远程字体；
- 正文最小 16px，辅助文字最小 13px，按钮最小 16px；
- 标题不使用全大写、渐变字、描边字或占满屏幕的超大字号。

### 4.2 席位与状态语义

| 语义 | 颜色 | 非颜色信息 |
| --- | --- | --- |
| 左席 | 靛蓝 | `左边`、`F`、双线缝边 |
| 右席 | 酒红 | `右边`、`J`、点线缝边 |
| 同步窗 | 黄铜亮色 | 两端括号 + “可以拉了” |
| 已拉 | 亮奶油 | 实心圆点 + “已经拉住” |
| 等待 | 暗纸色 | 空心圆点 + “等这一边” |
| 卡住 | 暖陶红 | 断线符号 + 完整原因文字 |
| 合齿 | 苔绿 | 闭合齿形 + “这一齿，合上了” |

forced-colors 下颜色与纹样可被系统色覆盖，但左右文本、键位、实心/空心、边框样式和结果文案仍存在。

## 5. 页面骨架

```text
body.together-zipper
└── main.app-shell
    ├── header.app-header
    │   ├── brand（针脚小标、标题、副标题）
    │   └── progress（段落 n/3、链齿 n/15）
    ├── section#stage.stage-shell（phase-owned DOM）
    ├── section#controls（仅 playing）
    ├── nav.utility-links（返回目录）
    └── p#live-status.sr-only[aria-live="polite"]
```

- body 使用生产背景 + `--night-950` 回退；
- app-shell 宽 `min(1180px, calc(100% - 32px))`；
- 主卡使用近黑靛蓝不透明底，避免背景纹理穿过文字与时间轨；
- 奶油纸笺用于 intro、段落说明与完成摘要，不让整个页面变成浅色请柬；
- 每个 phase 由 app 真实重建 stage；隐藏阶段使用 `hidden` 离开可访问树。

## 6. intro 与 section-intro

### intro

- 桌面两栏：左为题名、规则和主动作；右为静态“两块布尚未合拢”示意；
- 两张席位牌并排：左席靛蓝缝边 + `F`，右席酒红点线 + `J`；
- 规则只说“光点进入亮窗后，两边各拉一次”和“相隔太远会重试这一齿”；
- 主按钮“拿好两边”，高至少 54px；
- 不运行 RAF，不显示未来目标 tick 数字。

### section-intro

- 中央奶油纸笺最大宽 720px；
- 上方显示 `第 n / 3 段`，下方显示段名、note、齿数和相对窗口描述；
- 相对描述只说“宽一些 / 再近一点 / 靠近同一拍”，不显示调试参数；
- 已完成段以小针脚印章列在页脚；
- 主按钮“开始这一段”。

## 7. playing 主舞台

### 7.1 桌面布局

```text
┌ 第 n 段 / 第 n 齿 / 第 n 次尝试 ───────────────┐
│  left fabric      brass zipper       right fabric │
│  ○ ○ ○ ○      [15 tooth rail]       ○ ○ ○ ○     │
│                    [pull badge]                    │
│       ├────────[ 同步窗 ]────────┤                │
│       等左边        ◆         等右边              │
└───────────────────────────────────────────────────┘
┌ 左席 F · 拉这一边 ┐  ┌ 右席 J · 拉这一边 ┐
```

- 舞台桌面高 `clamp(420px, 56vh, 580px)`，内部是左右织物与中央轨道的三列结构；
- 15 齿纵向排列，段落边界用较大 gap 与 4/5/6 小标分隔；
- 已完成齿闭合、当前齿有黄铜框、未来齿保持分开；不能只靠亮度区分；
- `brass-zipper-pull.png` 作为 52–64px 方形材质章贴在当前进度旁，`alt=""`，真实状态由相邻文本表达；
- 时间轨横向放在当前齿下方，公共光点由 `progressPermille` 定位；同步窗宽度由 start/end 比例计算；
- 时间轨的末端只作表现边界，app 不从像素反算 tick；
- 当前状态事实文本固定为“窗口还没亮 / 可以拉了 / 左边已拉 / 右边已拉”。

### 7.2 双席控制

桌面与移动都保持两列等宽：

```text
左边 · {name}              右边 · {name}
[ F  拉这一边 ]            [ J  拉这一边 ]
○ 等这一边                 ● 已经拉住
```

- 原生 button；桌面高至少 60px，390px 高至少 64px，320px 高至少 58px；
- 左席使用靛蓝实底与双线边，右席使用酒红实底与点线边；
- 已拉席按钮 disabled，并保留“已经拉住”文字；另一席仍可操作；
- `pointerdown` 与键盘统一到 reducer，不实现拖动、长按或连发；
- hover 仅 `(hover:hover)`；active 下压 1px；`:focus-visible` 使用 3px 奶油/深色双环。

## 8. tooth-result、jammed 与 section-result

### tooth-result

- 当前齿两边闭合并闪过一次短黄铜线；
- 标题“这一齿，合上了”；
- 12 tick 反馈用细针脚线推进，不画分数或 `Perfect`；
- 拉动按钮离开可访问树，不能趁反馈输入下一齿；
- reduced motion 下不闪光，只立即切换闭合样式。

### jammed

- 当前齿仍分开，中央出现小断线符号；
- 按六种 reason 显示完整冻结文案；
- 有输入的一席显示实心状态，没有输入的一席显示空心状态；
- 12 tick 后自动重试，文字写“这颗齿会自己回到起点”；
- 不抖屏、不闪烁、不把某个名字染红、不播放惩罚音。

### section-result

- 奶油纸笺显示段名、完成齿数、共同尝试与卡住次数；
- 只用合计句“我们用 n 次把这一段拉好”，不拆分个人数据；
- 前两段按钮“看看下一段”；第三段按钮“收好这条拉链”；
- 已完成 15 齿缩成一条安静的针脚进度，不重复动画。

## 9. complete

- 桌面两栏：左 `minmax(0,1.15fr)` 为完成插画，右 `minmax(320px,.85fr)` 为奶油总结纸笺；
- `completed-keepsake.png` 完整显示、`object-fit: contain`，奶油背景与纸笺相接；
- 右栏按起针·并肩、穿雨·同拍、收尾·归心列三行 attempts/jams；
- 汇总显示 `15 颗齿都合上 · 一共尝试 {n} 次`，不按次数评级；
- composeCompletionNote 只用 `textContent`；
- 主按钮“再拉一次”，次链接“返回体验目录”；
- 不加奖杯、星级、排行榜、礼花、粒子爆炸或自动音频。

## 10. 动效与生命周期

- playing 光点只根据 rule tick 更新 `translateX`，不使用 CSS transition 插值追赶；
- 拉链齿闭合允许 120ms scale/translate，拉链章允许 140ms ease-out 移动；
- tooth-result 黄铜线 180ms 淡入一次；jammed 断线符号 160ms 淡入一次；
- complete 插画 240ms 淡入上移，不逐元素长延迟；
- hidden/blur 停 RAF 并重置 timestamp；恢复不播放错过的动效；
- reduced motion 关闭光点尾迹、齿过渡、闪光、淡入和布料呼吸，不改变 tick、窗口、反馈或结果。

## 11. 响应式冻结

| 视口 | 布局与 Gate |
| --- | --- |
| 1728×906 | playing 舞台 + 双席控制首屏完整；complete 两栏，无横向/纵向意外溢出 |
| 1280×800 | header/间距压缩；舞台最低 390px，控制仍在首屏 |
| 390×844 | 单列；舞台 390–430px；双席按钮并排；complete 插画在上、摘要在下 |
| 320×568 | 无横向溢出；舞台最小 330px；按钮 ≥58px；允许必要纵向滚动 |

断点：

- `@media (max-width: 860px)`：intro、complete 双栏转单列；
- `@media (max-width: 560px)`：shell 外边距 10px，纸卡 padding 14px，header 纵排；
- `@media (max-height: 820px) and (min-width: 861px)`：stage 降至 390–460px，收紧 header 与控制 gap；
- 手机把 15 齿轨压窄但不减齿；时间轨放到链齿下方，不与齿并排争宽；
- 不用 JS 决定布局，不让 viewport 改变规则 state；背景移动端 `background-position:center top`，边缘物件可自然裁掉。

## 12. 可访问、坏图与强制颜色

### 12.1 forced-colors

- body 移除生产背景，使用 Canvas；
- 主舞台/纸笺使用 Canvas，文字用 CanvasText，按钮使用 ButtonFace/ButtonText；
- 当前齿用 Highlight 轮廓，同步窗用两端括号和“可以拉了”；
- 已完成齿显示 `✓` 隐藏文本，未来齿显示“未完成”；
- 左右席继续依靠文字、键位和不同边框样式；focus outline 使用 Highlight。

### 12.2 坏图降级

| 图片失败 | 必须保留 |
| --- | --- |
| 背景 | `--night-950` 实色、全部主卡和文字 |
| 拉链章 | CSS 黄铜圆角方片 + `当前链齿` 屏幕阅读文本 |
| 完成图 | CSS 左靛右酒红织物块 + 中央黄铜线，三段摘要与结语完整 |

图片不保存规则，不做关键按钮，不参与焦点顺序。所有 `<img>` 有固定宽高/aspect-ratio，避免加载失败造成布局跳动；纯装饰拉链章使用空 alt，完成图 alt 为“靛蓝和酒红布面被同一条拉链合好，双色针脚汇成一条线”。

## 13. Fidelity ledger

| 对照点 | 概念意图 | 生产冻结 | 验收方法 |
| --- | --- | --- | --- |
| 构图 | 中央拉链，左右控制等权 | 三列舞台 + 两列原生 button | 1728、390 截图目视 |
| 色彩 | 靛蓝/酒红双席，黄铜公共核心 | 固定 token，不用蓝粉霓虹双轨 | 取样 + forced-colors |
| 材质 | 午夜裁缝桌、织物、皮革、黄铜 | 三张原创资产 + CSS 缝边 | `view_image` + 坏图 Gate |
| 主物件 | 纵向拉链与位置章 | 15 DOM 齿 + 图片材质章 | DOM 数量与截图 |
| 信息层级 | 舞台最大，控制次之，装饰最弱 | 不透明主卡，背景中央低对比 | 桌面首屏检查 |
| 移动重排 | 舞台上、双席控制下 | 控制仍两列，不串成先后顺序 | 390/320 实测 |
| 完成仪式 | 两块布合拢 + 纪念章 | 完成插画 + 真实三段摘要 | complete 截图 |
| 有意偏差 | 概念双轨、假设备框、示意齿数 | 单公共轨、真实页面、严格 15 齿 | DOM/文案审计 |

最终验收必须再次以 `view_image(detail="original")` 查看概念图和最新生产截图；若生产偏离，修复实现或在验证文档解释有意差异，不能只写“接近”。

## 14. 实现边界

- 运行时只复制三张接受资产，概念图不进入体验目录；
- HTML 不写内联事件或内联脚本，脚本顺序为 config → logic → app；
- CSS 不从图片反推状态，不用 Canvas/WebGL/滤镜制造规则信息；
- 不新增图标库、字体、动画库、音频库或包依赖；
- 不把生产图压成 base64，不新增外链；
- README 写明图片为本轮原创纯文字 ImageGen 生成，ATTRIBUTION 将生成资产与开源机制研究分开；
- 实现后用 `cmp` 证明运行图片与源稿逐字节一致，并记录 SHA-256；
- 视觉提交只含本设计文档、四张文档资产与两处索引，逻辑和前端另行提交。

## 15. 视觉冻结结论

桌面进行、移动进行、桌面完成的概念关系与三张生产资产已经生成、原尺寸审阅并冻结。后续实现可以在响应式间距、精确字号和 CSS 齿形上做工程微调，但不得改变双席等权、单一公共时间轨、严格 15 齿、无个人评分、无音频、坏图可玩和完成纪念物这七条视觉契约。
