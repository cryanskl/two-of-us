# A 级「把月亮拨回那一天」实现规格

> 规格日期：2026-07-18；上游调研见 [`66-moon-phase-secret-research.md`](./66-moon-phase-secret-research.md)。

## 1. 产品定义

一个人先在本地配置一段共同记忆；接收者打开页面，根据三条私人线索，把月份、日期和月相校准到同一天。三项同时对齐后，中央月面才完全点亮并创建最终留言。

第一版回答创意池五个问题：

1. 主分类唯一：单人准备、另一人接收的惊喜；
2. A 级：完整作品目录自身无共享脚本、服务或公网依赖；
3. 30 秒内理解：读三条线索，调三个刻度，按“核对这一天”；
4. 去掉声音和私人图片仍成立：首版本来就无音频/私人图片；
5. 只有一个入口、一个校准机制、一个完成页。

不加入账户、云日历、自动联网星历、收藏、长期统计、倒计时或分享按钮。

## 2. 文件与启动边界

```text
experiences/surprises/moon-phase-secret/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── logic.test.js
├── README.md
└── assets/
    ├── ATTRIBUTION.md
    └── moon-surface.png
```

脚本使用经典 IIFE，顺序为 `config.js → logic.js → app.js`，保证 `file://` 可直接执行。目录不引用 `shared/`、CDN、远程字体、模块脚本、fetch、存储、媒体权限或 Service Worker；缺图时使用 CSS 月面回退。

## 3. 可编辑配置

全局配置只允许以下精确字段：

```js
globalThis.MOON_PHASE_SECRET_CONFIG = Object.freeze({
  targetDate: "2024-05-20",
  recipientName: "给你",
  finalTitle: "原来月亮也记得",
  finalMessage: "那一天之后，普通的日子也开始有了坐标。",
  composeClues(context) {
    return null;
  },
});
```

约束：

- `targetDate`：严格 `YYYY-MM-DD`，年份 1900–2099，必须是真实公历日期；
- `recipientName`：去首尾空白后 1–20 字；
- `finalTitle`：1–32 字；
- `finalMessage`：1–180 字；
- `composeClues(context)`：收到递归冻结的 `{ targetDate, targetPhaseIndex, targetPhaseName, defaultClues }`，可返回恰好三条、每条 1–36 字且互不重复的线索；
- 返回 `null` 使用原创默认线索；抛错、修改上下文、非法返回或额外配置字段触发整份安全回退；
- sanitize 结果、状态、线索和所有嵌套对象递归冻结，不与调用方共享引用。

`composeClues` 是准备者可贡献的 5–10 行业务逻辑：可以按共同经历选择“季节 / 场景 / 一句只有彼此懂的话”，但不应直接返回日期数字。

## 4. 八相算法

常量：

```text
SYNODIC_MONTH_DAYS = 29.53059
REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 15)
PHASE_COUNT = 8
```

严格解析日期后，用 `Date.UTC(year, month - 1, day, 12)` 取得 UTC 正午。相位索引：

```text
deltaDays = (utcNoon - referenceNewMoon) / 86400000
cycle = positiveModulo(deltaDays, 29.53059) / 29.53059
phaseIndex = round(cycle × 8) mod 8
```

索引与中文名固定：

| 索引 | 名称 |
| --- | --- |
| 0 | 新月 |
| 1 | 娥眉月 |
| 2 | 上弦月 |
| 3 | 盈凸月 |
| 4 | 满月 |
| 5 | 亏凸月 |
| 6 | 下弦月 |
| 7 | 残月 |

该函数只作为纪念日谜题的稳定近似；代码和 README 禁止出现“精确星历”“实时观测”等表述。

## 5. 权威状态

```text
phase: intro | calibrating | unlocked
year: 配置年份，只读
selectedMonth: 1..12
selectedDay: 1..daysInMonth(year, selectedMonth)
selectedPhaseIndex: 0..7
target: { year, month, day, phaseIndex }
clues: 三条冻结线索
feedback: null | { monthAligned, dayAligned, phaseAligned }
attempts: 非负整数
revision: 单调递增整数
recipientName / finalTitle / finalMessage: 私密完成内容
```

初态固定为 1 月 1 日、新月、无反馈；不根据目标选择“很接近”的起点，避免旁路泄露。

公开 reducer：

- `createInitialState(config)`；
- `start(state)`；
- `adjustMonth(state, delta)`：有限整数步、环绕 1–12，随后按新月份天数钳制日期；
- `adjustDay(state, delta)`：在当前月合法日期内环绕；
- `adjustMoonPhase(state, delta)`：环绕 0–7；
- `checkAlignment(state)`：只在 calibrating 生效，增加 attempts，生成三项反馈；全部为真时唯一进入 unlocked；
- `restart(state)`：只在 unlocked 生效，清空校准、反馈和 attempts，但保留准备者配置；
- `getViewModel(state)`：返回冻结的公开投影，不包含最终留言（unlocked 除外）或目标数字。

合法状态收到零步或非法阶段动作时保持同一引用；畸形/额外字段状态经公开动作安全回到默认初态。

## 6. 角度量化与输入

纯逻辑提供：

- `normalizeAngularDelta(previous, next)`：返回 `[-π, π]` 有限差；
- `stepsFromAngularTravel(carry, delta, stepAngle)`：累加拖拽余量并返回 `{ steps, carry }`；
- 月份步角 `2π / 12`，月相步角 `2π / 8`；
- 单个 Pointer 样本绝对差超过 `π / 2` 时丢弃，防止坐标瞬移；
- Pointer 正向/反向都能调整；规则允许来回校准，不是单调进度游戏。

DOM 适配：

- 月份环与月相环各自使用 pointer capture；
- 一个控件只接收一个 primary pointer；
- 失焦、隐藏、`pointercancel`、`lostpointercapture` 清理会话和 carry；
- `ArrowLeft` / `ArrowRight` 逐档，`Home` 回第一档；
- 日历日使用 48px 的 ± 按钮；
- 所有 Pointer 结果调用与键盘相同的 adjust reducer。

## 7. 阶段、反馈与 DOM 隐私

### intro

- 显示标题、短引导、封闭月面和“开始校准”；
- 不显示线索、目标日期、最终称呼/标题/正文；
- 月份、日期和月相控件 disabled。

### calibrating

- 显示三条线索、固定年份、当前月份/日期、当前八相名；
- “核对这一天”后显示三项中性反馈：“月序已对齐 / 还没对齐”等；
- 调整任一刻度后清空旧反馈，避免旧结果覆盖新校准；
- 无失败分、倒计时、尝试上限或关系评价。

### unlocked

- 中央月面全亮，校准控件 disabled；
- 此时才创建 `.final-message`，包含称呼、标题、正文；
- 主动作变为“再找一次”；重开销毁留言节点并回到 intro。

静态 HTML、CSS、catalog 和 `app.js` 不包含最终默认正文代表句；完成内容只在 `config.js`，且在 unlocked 前不投影到 DOM、aria-label、data 属性或 CSS 自定义属性。

## 8. 视觉规格

视觉方向：**午夜天文台的银蓝校准仪**。与手摇音乐盒的胡桃木/黄铜区分，采用冷色金属、深蓝纸面与珍珠月光。

### 桌面 1504×1046

- 左侧约 34%：标题“把月亮拨回那一天”、一句引导、三条线索位与主动作；
- 右侧约 66%：唯一大型圆形校准仪；中央为月面，外环 12 月刻度，内环 8 相，右下为日期机械计数器；
- 不使用卡片网格、顶部导航、eyebrow、badge、统计数字或虚构系统 chrome；
- 返回按钮固定左上，但不与标题争夺层级。

### 手机 390×844

- 顺序：返回 → 标题/引导 → 圆形校准仪 → 年/月/日/月相读数 → 三条线索 → 主动作/反馈；
- 可自然短滚动，但首屏必须看到完整月面和至少一个可执行动作；
- 320px 无横向滚动，所有操作目标至少 48px。

### 设计令牌

```text
background: #0b1220
surface: #151f30
moon: #e7e3dc
moon-shadow: #68768b
silver: #aeb9c8
cobalt: #4169a8
vermilion: #c86659
text: #f0ede5
muted: #9ca8b8
border: rgba(174, 185, 200, .34)
radii: 4 / 12 / 999px
motion: 180ms control / 620ms reveal
```

UI 文本和控件保持代码原生；ImageGen 只提供概念图与无字月面纹理。图片失败时，用 CSS 径向阴影和三处陨石坑回退；若概念使用图像中的文字，运行版仍以规格中的代码原生文本为准。

## 9. 可访问性与 reduced motion

- 原生 link/button、H1/H2、线索 list、校准读数和 live region；
- 月份/月相圆环保持 button 语义，动态 aria-label 读出当前值和快捷键，不混入 slider 的 `aria-value*`；
- 状态不能只靠颜色：反馈同时使用文字、图形与 `aria-live`；
- intro 后焦点进入月份环；check 后焦点保留在核对动作，成功后进入最终标题；
- reduced motion 将所有旋转/揭晓过渡压到 `.01ms`，状态与 DOM Gate 不等待动画；
- CSS 月相仍需在高对比/缺图时保留名称文本。

## 10. 自动测试与仓库 Gate

定向逻辑测试至少覆盖：

1. 日期严格解析、闰年和当月天数；
2. UTC 正午在不同时区环境结果一致；
3. NASA 2000-01-06/14/21/28 抽样落到新月/上弦/满月/下弦；
4. 正负环绕、月份变更钳制日期、零步同引用；
5. 角度跨 `±π`、余量累计、反向步进和瞬移拒绝；
6. 配置白名单、整份回退、冻结 context 与三线索策略；
7. intro → calibrating → feedback → unlocked → restart；
8. 错误校准只给布尔反馈、不泄露目标；
9. 第一次正确核对唯一创建成功状态，终局幂等；
10. 畸形状态与额外字段安全回退。

目录 Gate：

- catalog 注册 A 级、installed、`publicNetworkRequired: false`；
- HTML 不含远程 URL、模块脚本、存储/网络/媒体 API；
- 作品目录不依赖 `shared/`，可单目录复制完整游玩；
- 最终配置文案不预埋在 HTML/app/catalog；
- README 与 `assets/ATTRIBUTION.md` 写明 NASA/USNO 事实来源、SunCalc 零复制对照和 ImageGen 资产；
- `npm test`、`npm run verify`、`git diff --check` 全部通过。

## 11. 浏览器验收

- 真实 `file://` 完整错误校准、部分对齐、三项成功、重开；
- 鼠标/触屏圆周拖动与 ArrowLeft/ArrowRight/Home；
- 月份从 1 反向到 12、2 月钳制日期、闰年 29 日；
- 完成前 `.final-message = 0`，完成后恰为 1，重开归零；
- 缺图回退、离线、reduced motion、页面隐藏时 pointer 清理；
- 1504×1046 原生概念尺寸、390×844、320×760；
- 正常路径 0 error / 0 warning，仅本地资源请求；
- 同一 QA 用 `view_image` 比较概念与最新运行截图，保真账本不少于五项。

## 12. 完成定义

- 完整作品目录可独立复制，双击 `index.html` 完整游玩；
- 三项校准、反馈、最终 DOM Gate、重开和配置个性化全部可用；
- 天文近似与非专业用途边界在 UI/README/测试一致；
- 视觉概念、运行资产、借鉴声明、自动测试、浏览器证据、bug/learn 记录齐全；
- 调研、规格/概念、实现、修复/验收分别独立提交。
