# “稳稳地，和你一起向前”视觉设计

> 视觉状态：桌面进行态、移动进行态、桌面完成态与无字生产背景已经由内置 ImageGen 生成并逐张审查。本文件是前端实现的视觉契约；玩法、公式和状态以 [`102-steady-together-spec.md`](./102-steady-together-spec.md) 为准。

## 1. 已接受概念与生产资产

| 用途 | 路径 | 原生尺寸 | 实现角色 |
| --- | --- | --- | --- |
| 桌面进行态 | [`../design/steady-together/concept-desktop-playing.png`](../design/steady-together/concept-desktop-playing.png) | 1504×1046 | 桌面首屏、路线、舞台、状态和双 pad 的主视觉规格 |
| 移动进行态 | [`../design/steady-together/concept-mobile-playing.png`](../design/steady-together/concept-mobile-playing.png) | 853×1844，按 390×844 比例设计 | 移动重排、触控尺寸和首屏密度规格 |
| 桌面完成态 | [`../design/steady-together/concept-desktop-complete.png`](../design/steady-together/concept-desktop-complete.png) | 1503×1046 | 终点、赠语与完成动作规格 |
| 无字背景 | [`../experiences/co-op/steady-together/assets/balance-journey.webp`](../experiences/co-op/steady-together/assets/balance-journey.webp) | 1536×1024 | 可裁切的纸景环境层，不承担碰撞、进度或文字 |

生成方式：内置 ImageGen。三个界面概念使用 `ui-mockup`，生产背景使用 `stylized-concept`；未使用 CLI/API fallback。源 PNG 保留在 Codex 生成目录，本仓库保存接受稿与 WebP 生产版本。

## 2. 唯一视觉命题

这是一件“两人共同托住的瓷器仪表”，置于温暖的纸上山路，而不是一个物理引擎 demo。横梁和滚珠是唯一焦点；路线、检查灯和晨光只回答“我们走到哪里”，大按钮只回答“我现在是否托住”。

三个状态共享同一世界：

- 进行态：纸景克制，横梁轻微偏转，珍珠滚珠偏离中央；
- 移动态：同一构图纵向压缩，路线和舞台上下串联，双 pad 固定在底部；
- 完成态：横梁水平、滚珠居中、两盏灯和终点同时明确，背景晨光变暖但不放烟花；
- intro/ready/paused：使用同一开放画面和小型印章式控制，不新增毛玻璃卡片或完整屏幕皮肤。

## 3. 设计令牌

```css
:root {
  --paper: #f3ead7;
  --paper-light: #fbf5e8;
  --ink: #2f2b23;
  --ink-muted: #716958;
  --line: #aa9877;
  --porcelain: #f7f2e8;
  --porcelain-blue: #315f72;
  --brass: #9a6a2e;
  --brass-light: #d3ad68;
  --rose: #b96563;
  --rose-deep: #7d4142;
  --teal: #15525a;
  --teal-deep: #0d373d;
  --safe: #6b7f57;
  --danger: #8c4b45;
  --shadow: rgb(62 45 24 / 18%);
}
```

- 背景锁定为暖象牙纸，不是纯白；不得擅自改为冷灰、深色或玻璃渐变；
- 页面只允许轻微纸张明暗和边缘融合，不在背景图上覆盖统一色洗；
- 黄铜用于结构、路线和检查点，不把所有文字改成金色；
- rose/teal 只定义左右席，不定义成功/失败；状态还必须有轮廓、文字和位置；
- 大 pad 圆角约 12–16px，普通按钮 8–12px；不使用胶囊或巨型圆角卡片；
- 阴影低模糊、短距离、偏暖，表现纸片/金属离纸面一层，不做发光。

## 4. 排版系统

- 展示标题：`"Songti SC", "STSong", "Noto Serif CJK SC", Georgia, serif`；桌面约 `clamp(42px, 5vw, 74px)`，移动 36–48px，字重 600，行高 1.08；
- 正文和状态：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`；正文 16–20px，状态 18–24px；
- 控件：同一无衬线 UI 栈，desktop pad 30–42px/700，mobile pad 22–32px/700，键帽使用等宽 fallback；
- 路线标签：14–18px/600，移动端仍不得小于 13px；赠语使用 24–38px 衬线；
- 不引入外部字体；fallback 变化不能造成按钮溢出。

## 5. 允许的可见文案

概念接受后，首屏不再随意增加眉题、标签、徽章或解释。

### 5.1 Intro

- `稳稳地，和你一起向前`
- 配置后的 intro
- `左边用 A，右边用 L，也可以按住下面两个按钮。`
- `开始前进`
- `不用分谁做错了，掉下来就一起从最近的灯再走。`

### 5.2 Playing

- 标题：`稳稳地，和你一起向前`
- 短说明：`把滚珠接回中央，我们才会一起向前`
- 路线：`向右接住` / `换边接回` / `一起回正`
- 左 pad：`左边托住` + `A`
- 右 pad：`右边托住` + `L`
- 控制：`暂停`
- 状态只从规格 view 映射：支撑、居中、低速、倾角、warmup、前进、检查点、掉落、终点保持。

### 5.3 Ready / Paused / Complete

- `先把两边都松开` / `从最近的灯继续` / `暂停在这里` / `继续前进` / `重新开始`
- 配置后的 finalTitle/finalMessage/signature
- `再走一次` / `回到作品集`

## 6. 桌面进行态结构

1504×1046 概念采用单一开放舞台，不套外层卡片：

1. 顶部约 15%：标题、短说明，暂停靠右但不成为导航栏；
2. 约 15–25%：横向三段路线轨，两个黄铜灯是检查点，终点使用双环；
3. 约 25–72%：纸景 + 大型平衡车舞台，横梁约占可用宽度 70–82%；
4. 约 70–78%：短状态与四项稳定条件的离散刻度；
5. 底部约 22–25%：两个并排大 pad，间距 8–16px，均填满剩余宽度。

不增加侧栏、计分器、生命、独立教程卡、统计行或多个 HUD 面板。intro 的长说明在开始后隐藏，playing 只留下动作所需信息。

## 7. 移动进行态结构

390×844 目标不是缩小桌面，而是保持优先级：

1. 顶部标题最多两行，暂停位于右上安全区；
2. 三段路线压缩为一条可读轨道，标签可短但不可消失；
3. 纸景纵向延展，平衡车占中部主要宽度；背景裁切时远景灯可消失，因为原生路线 HUD 仍保留；
4. 状态只占一到两行，不显示每 tick 数值；
5. 两个 pad 在正常文档流底部并排，每个约半宽、至少 120px 高；320×700 可进一步收紧标题/纸景，但不缩小 pad；
6. 页面不横向滚动；safe-area inset 加在控制区外侧，不侵占有效按压面积。

## 8. 组件和图标清单

| 组件 | 视觉规格 | 状态 |
| --- | --- | --- |
| Route rail | 1–2px 黄铜主线，rose/teal 分段，端点双环 | 当前段加粗/短刻痕；检查点形状点亮 |
| Checkpoint | 原生 SVG 小灯或菱形灯座 | 未到、已到、当前；forced-colors 用填充/双边框 |
| Balance cart | 原生 SVG 瓷白托盘、青花角纹、黄铜底座/横梁 | transform 只来自 view tilt；无 CSS 自主摆动 |
| Ball | 原生 SVG 径向渐变珍珠 + 强轮廓 | 位置来自 view；forced-colors 退为实心圆和描边 |
| Target zone | 椭圆双线 + 中心刻度 | centered 时增加内圈/文字，不只变色 |
| Seat pad | 大型压印按钮，rose/teal 两变体，键帽内嵌 | default/hover/focus/active/disabled；active 有内压和方向三角 |
| Pause | 圆形双竖线 SVG + 可见文字 | 48px 目标、focus ring、无纯字符图标 |
| Stability rail | 四个刻点与状态文字 | 不逐 tick 跳动；终点保持可用线性填充 |
| Primary action | rose 压印矩形 | 完成态唯一主动作 |
| Secondary action | 墨色文字 + 下划线/箭头 SVG | 不伪装为 badge 或 pill |

所有图标使用原生 SVG、`viewBox`、一致 1.5–2px 描边、round cap/join 和 `currentColor`。不得用字体字形代替关键控制图标。

## 9. 生产背景处理

- `balance-journey.webp` 为绝对定位环境层，`background-size: cover`，不参与布局；
- desktop 默认 `background-position: center 42%`，mobile 可偏 `center top`；以截图校准，不添加概念中不存在的统一 tint；
- 页面上方以同色纸背景延续；可使用背景同色 edge fade，但不能覆盖整图；
- 背景内两盏灯只是叙事，真正检查点仍由原生 route rail 表达；
- 图片失败时回退 `--paper` + 轻量 CSS 纸纹/明暗，规则、对比和可完成性不变；
- reduced-motion 下背景完全静止；首版默认也不做视差。

## 10. 动效与无障碍

- 横梁/滚珠每帧投影当前 view；可用 80–120ms 视觉插值，但规则不读取插值；
- pad active 使用 80ms 内压；检查点只做一次 300ms 亮度/描边变化；
- 掉落不晃屏、不闪烁、不指出席位；complete 只让晨光、双灯和文案温和出现；
- reduced-motion 取消位移过渡、缩放、漂移与淡入，只保留即时位置、边框和文字；
- SVG `aria-hidden="true"`；同一 view 用 DOM statusText、坡向、检查点和四项条件表达；
- forced-colors 隐藏纹理/渐变，改用系统色、实心圆和 2px 轮廓；
- focus ring 至少 3px 且不被裁切；live region 不随滚珠逐 tick 刷新。

## 11. 概念到实现的刻意偏离

| 概念表现 | 实现决定 | 理由 |
| --- | --- | --- |
| 瓷盘、横梁和滚珠具有细腻栅格质感 | 用生产级原生 SVG 重建轮廓、黄铜层次、青花角纹和珍珠渐变 | 需要跟随 reducer 连续变换，并适配 forced-colors/缩放；不是几何占位符 |
| 背景含远景路线与灯 | 背景保留环境路线，另叠原生 route rail | 背景裁切不能改变检查点信息 |
| 状态刻度偏装饰 | 增加四项可见文字/形状状态 | 必须解释为何没有前进并提供非颜色路径 |
| 移动概念原图为 853×1844 | 浏览器验收使用 390×844 与 320×700 | 用真实 CSS viewport 验证 |
| 完成态展示固定赠语 | config 可安全替换三段结尾文案 | 保留可赠予性，排版不变 |

## 12. Fidelity ledger Gate

最终验收必须在同一轮分别 `view_image` 概念与最新截图，并至少核对：

1. 标题/首屏文案与允许清单；
2. route rail、双检查灯和三段标签层级；
3. 平衡车是否仍为唯一焦点，背景有没有抢中央；
4. porcelain/brass/rose/teal/ink 色彩关系与纸张色温；
5. pad 尺寸、刻纹、键帽、焦点和 active；
6. 桌面开放舞台是否被误做成卡片；
7. 移动首屏是否保留完整规则和大触控区；
8. 完成态是否水平归位、双灯点亮、开放承载赠语；
9. 背景裁切与代码 SVG 是否自然融合；
10. reduced-motion、forced-colors、背景缺失是否保持同规则信息。

有明确设计评审意见的偏差必须先修复；临时 QA 截图与未采用生成稿在交付前清理。

## 13. ImageGen 与借鉴声明

概念和生产背景由 OpenAI 内置 ImageGen 根据 C06 独立玩法规格生成，提示词为本作品原创。生成过程未提供第三方项目截图、资产、源码、UI 或品牌参考；唯一图像参考是本任务先前生成并接受的同系列概念，用于保持内部一致性。

页面不复制调研项目的代码、参数、视觉、关卡、素材、图标、字体、音频、截图、结构或文案。生成背景无字、无 UI、无横梁和滚珠；所有规则对象、控件和文字由本仓库独立实现。
